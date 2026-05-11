package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"unicode"

	"github.com/notnil/chess"

	"skewer-backend/internal/engine"
	"skewer-backend/internal/lichess"
)

func sseEvent(w http.ResponseWriter, event string, data any) {
	b, _ := json.Marshal(data)
	fmt.Fprintf(w, "event: %s\ndata: %s\n\n", event, b)
	if f, ok := w.(http.Flusher); ok {
		f.Flush()
	}
}

type ErrorPattern struct {
	Name        string `json:"name"`
	Count       int    `json:"count"`
	Description string `json:"description"`
}

func BlundersStreamHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	username := r.URL.Query().Get("username")
	gameType := r.URL.Query().Get("gameType")
	gamesStr := r.URL.Query().Get("games")

	if username == "" {
		sseEvent(w, "error", map[string]string{"message": "username required"})
		return
	}

	max, err := strconv.Atoi(gamesStr)
	if err != nil || max <= 0 {
		max = 10
	}

	games, err := lichess.FetchGames(username, max, gameType)
	if err != nil {
		sseEvent(w, "error", map[string]string{"message": "failed to fetch games"})
		return
	}

	totalBlunders, totalMistakes, totalInaccuracies := 0, 0, 0
	var allErrors []ErrorEvent

	errorsPerGame := map[string]int{}

	for i, g := range games {
		sseEvent(w, "progress", map[string]any{
			"gameNumber": i + 1,
			"totalGames": len(games),
			"gameId":     g.ID,
		})

		var playerColor string
		if strings.EqualFold(g.Players.White.User.Name, username) {
			playerColor = "white"
		} else {
			playerColor = "black"
		}

		if len(g.Analysis) > 0 {
			for j, move := range g.Analysis {
				if move.Judgment == nil {
					continue
				}
				isWhiteMove := j%2 == 0
				isPlayerMove := (isWhiteMove && playerColor == "white") ||
					(!isWhiteMove && playerColor == "black")
				if !isPlayerMove {
					continue
				}

				ply := j + 1
				phase := plyToPhase(ply)
				moveNum := j/2 + 1

				drop := estimateDrop(g.Analysis, j, playerColor)

				switch move.Judgment.Name {
				case "Blunder":
					totalBlunders++
				case "Mistake":
					totalMistakes++
				case "Inaccuracy":
					totalInaccuracies++
				}
				errorsPerGame[g.ID]++

				ev := ErrorEvent{
					GameID:     g.ID,
					MoveNumber: moveNum,
					Phase:      phase,
					Type:       move.Judgment.Name,
					Comment:    move.Judgment.Comment,
					EvalDrop:   drop,
				}
				allErrors = append(allErrors, ev)
				sseEvent(w, "error_event", ev)
			}
			sseEvent(w, "game_done", map[string]any{"gameId": g.ID, "source": "lichess"})
			continue
		}

		if g.Moves == "" {
			sseEvent(w, "game_done", map[string]any{"gameId": g.ID, "source": "skipped"})
			continue
		}

		sanMoves := strings.Fields(g.Moves)
		chessGame := chess.NewGame(chess.UseNotation(chess.AlgebraicNotation{}))

		type posEval struct {
			eval float64
			best string
		}
		evals := make([]posEval, 0, len(sanMoves)+1)

		if res, err := engine.EvalFEN(chessGame.Position().String(), 10); err == nil {
			evals = append(evals, posEval{eval: res.Evaluation, best: res.BestMove})
		} else {
			evals = append(evals, posEval{})
		}

		for _, san := range sanMoves {
			if err := chessGame.MoveStr(san); err != nil {
				break
			}
			if res, err := engine.EvalFEN(chessGame.Position().String(), 10); err == nil {
				evals = append(evals, posEval{eval: res.Evaluation, best: res.BestMove})
			} else {
				evals = append(evals, posEval{})
			}
		}

		for idx := 0; idx < len(sanMoves) && idx+1 < len(evals); idx++ {
			isWhiteMove := idx%2 == 0
			isPlayerMove := (isWhiteMove && playerColor == "white") ||
				(!isWhiteMove && playerColor == "black")
			if !isPlayerMove {
				continue
			}

			drop := engine.EvalDrop(playerColor, evals[idx].eval, evals[idx+1].eval)

			var errType string
			switch {
			case drop >= 2.0:
				errType = "Blunder"
				totalBlunders++
			case drop >= 1.0:
				errType = "Mistake"
				totalMistakes++
			case drop >= 0.5:
				errType = "Inaccuracy"
				totalInaccuracies++
			default:
				continue
			}
			errorsPerGame[g.ID]++

			ply := idx + 1
			comment := fmt.Sprintf("%s. Best was %s (%.1f pawns lost).", errType, evals[idx].best, drop)

			ev := ErrorEvent{
				GameID:     g.ID,
				MoveNumber: idx/2 + 1,
				Phase:      plyToPhase(ply),
				Type:       errType,
				Comment:    comment,
				EvalDrop:   drop,
			}
			allErrors = append(allErrors, ev)
			sseEvent(w, "error_event", ev)
		}
		sseEvent(w, "game_done", map[string]any{"gameId": g.ID, "source": "stockfish"})
	}

	patterns := analysePatterns(allErrors, errorsPerGame)

	sseEvent(w, "summary", map[string]any{
		"blunders":     totalBlunders,
		"mistakes":     totalMistakes,
		"inaccuracies": totalInaccuracies,
		"totalGames":   len(games),
		"patterns":     patterns,
	})
	sseEvent(w, "done", map[string]any{})
}

func analysePatterns(errors []ErrorEvent, errorsPerGame map[string]int) []ErrorPattern {
	if len(errors) == 0 {
		return nil
	}

	phaseCount := map[string]int{}
	criticalDrops := 0
	multiErrorGames := 0
	pieceHung := map[string]int{}
	earlyBlunders := 0

	for _, e := range errors {
		phaseCount[e.Phase]++
		if e.EvalDrop >= 3.0 {
			criticalDrops++
		}
		if e.MoveNumber < 15 && e.Type == "Blunder" {
			earlyBlunders++
		}
		// Lichess comment: "Blunder. Nxd5 was best." → piece letter N
		// Stockfish comment: "Blunder. Best was d5e6 (2.1 pawns lost)." → no piece letter
		piece := extractPieceFromComment(e.Comment)
		if piece != "" {
			pieceHung[piece]++
		}
	}
	for _, cnt := range errorsPerGame {
		if cnt >= 3 {
			multiErrorGames++
		}
	}

	var patterns []ErrorPattern

	worstPhase, worstCount := "", 0
	for ph, cnt := range phaseCount {
		if cnt > worstCount {
			worstCount = cnt
			worstPhase = ph
		}
	}
	if worstPhase != "" {
		patterns = append(patterns, ErrorPattern{
			Name:        worstPhase + " weakness",
			Count:       worstCount,
			Description: fmt.Sprintf("Made %d errors in the %s — more than any other phase.", worstCount, strings.ToLower(worstPhase)),
		})
	}

	if criticalDrops > 0 {
		patterns = append(patterns, ErrorPattern{
			Name:        "Hung material",
			Count:       criticalDrops,
			Description: fmt.Sprintf("Lost a full piece or more (%d times). These positions likely involve a tactic they missed or a piece left undefended.", criticalDrops),
		})
	}

	if earlyBlunders > 0 {
		patterns = append(patterns, ErrorPattern{
			Name:        "Early-game collapses",
			Count:       earlyBlunders,
			Description: fmt.Sprintf("Blundered before move 15 in %d instance(s). Opening preparation and piece safety are key areas to target.", earlyBlunders),
		})
	}

	if multiErrorGames > 0 {
		patterns = append(patterns, ErrorPattern{
			Name:        "Multi-error games",
			Count:       multiErrorGames,
			Description: fmt.Sprintf("Made 3+ errors in a single game on %d occasion(s). They tend to spiral once behind — keep the pressure on.", multiErrorGames),
		})
	}

	for piece, cnt := range pieceHung {
		if cnt >= 2 {
			fullName := pieceFullName(piece)
			patterns = append(patterns, ErrorPattern{
				Name:        "Missed " + fullName + " moves",
				Count:       cnt,
				Description: fmt.Sprintf("The best response involved a %s move %d times. Watch for %s tactics and forks.", fullName, cnt, strings.ToLower(fullName)),
			})
		}
	}

	for i := 0; i < len(patterns)-1; i++ {
		for j := i + 1; j < len(patterns); j++ {
			if patterns[j].Count > patterns[i].Count {
				patterns[i], patterns[j] = patterns[j], patterns[i]
			}
		}
	}

	return patterns
}

func extractPieceFromComment(comment string) string {
	idx := strings.Index(comment, " was best")
	if idx < 0 {
		return ""
	}
	token := ""
	for i := idx - 1; i >= 0; i-- {
		c := rune(comment[i])
		if c == ' ' || c == '.' {
			break
		}
		token = string(c) + token
	}
	if len(token) == 0 {
		return ""
	}
	first := rune(token[0])
	if unicode.IsUpper(first) && first != 'O' { // O = castling
		return string(first)
	}
	return ""
}

func pieceFullName(p string) string {
	switch p {
	case "N":
		return "Knight"
	case "B":
		return "Bishop"
	case "R":
		return "Rook"
	case "Q":
		return "Queen"
	case "K":
		return "King"
	}
	return p
}

func estimateDrop(analysis []lichess.MoveAnalysis, idx int, playerColor string) float64 {
	if idx == 0 || analysis[idx].Eval == nil || analysis[idx-1].Eval == nil {
		return 0
	}
	before := float64(*analysis[idx-1].Eval) / 100.0
	after := float64(*analysis[idx].Eval) / 100.0
	return engine.EvalDrop(playerColor, before, after)
}

func plyToPhase(ply int) string {
	if ply <= 20 {
		return "Opening"
	} else if ply <= 60 {
		return "Middlegame"
	}
	return "Endgame"
}
