package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/notnil/chess"

	"skewer-backend/internal/engine"
	"skewer-backend/internal/lichess"
)

// SSE event helpers
func sseEvent(w http.ResponseWriter, event string, data any) {
	b, _ := json.Marshal(data)
	fmt.Fprintf(w, "event: %s\ndata: %s\n\n", event, b)
	if f, ok := w.(http.Flusher); ok {
		f.Flush()
	}
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

	for i, g := range games {
		// Tell the client which game we're starting
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

		// --- Path A: game already has Lichess engine analysis ---
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

				switch move.Judgment.Name {
				case "Blunder":
					totalBlunders++
				case "Mistake":
					totalMistakes++
				case "Inaccuracy":
					totalInaccuracies++
				}

				sseEvent(w, "error_event", ErrorEvent{
					GameID:     g.ID,
					MoveNumber: moveNum,
					Phase:      phase,
					Type:       move.Judgment.Name,
					Comment:    move.Judgment.Comment,
				})
			}

			sseEvent(w, "game_done", map[string]any{
				"gameId": g.ID,
				"source": "lichess",
			})
			continue
		}

		// --- Path B: no pre-computed analysis — use Stockfish ---
		if g.Moves == "" {
			sseEvent(w, "game_done", map[string]any{"gameId": g.ID, "source": "skipped"})
			continue
		}

		sanMoves := strings.Fields(g.Moves)
		chessGame := chess.NewGame(chess.UseNotation(chess.AlgebraicNotation{}))

		// Collect one eval per position (N+1 evals for N moves)
		type posEval struct {
			eval float64
			mate *int
			best string
		}
		evals := make([]posEval, 0, len(sanMoves)+1)

		// Evaluate starting position
		if res, err := engine.EvalFEN(chessGame.Position().String(), 10); err == nil {
			evals = append(evals, posEval{eval: res.Evaluation, mate: res.Mate, best: res.BestMove})
		} else {
			evals = append(evals, posEval{})
		}

		for _, san := range sanMoves {
			if err := chessGame.MoveStr(san); err != nil {
				break // illegal move or parse error — stop here
			}
			if res, err := engine.EvalFEN(chessGame.Position().String(), 10); err == nil {
				evals = append(evals, posEval{eval: res.Evaluation, mate: res.Mate, best: res.BestMove})
			} else {
				evals = append(evals, posEval{})
			}
		}

		// Compare consecutive evals to detect player errors
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

			ply := idx + 1
			comment := fmt.Sprintf("%s. Best was %s (%.1f pawns lost).", errType, evals[idx].best, drop)

			sseEvent(w, "error_event", ErrorEvent{
				GameID:     g.ID,
				MoveNumber: idx/2 + 1,
				Phase:      plyToPhase(ply),
				Type:       errType,
				Comment:    comment,
			})
		}

		sseEvent(w, "game_done", map[string]any{"gameId": g.ID, "source": "stockfish"})
	}

	// Final summary
	sseEvent(w, "summary", map[string]any{
		"blunders":     totalBlunders,
		"mistakes":     totalMistakes,
		"inaccuracies": totalInaccuracies,
		"totalGames":   len(games),
	})
	sseEvent(w, "done", map[string]any{})
}

func plyToPhase(ply int) string {
	if ply <= 20 {
		return "Opening"
	} else if ply <= 60 {
		return "Middlegame"
	}
	return "Endgame"
}
