package handlers

import (
	"encoding/json"
	"net/http"
	"sort"
	"strconv"
	"strings"

	"github.com/notnil/chess"

	"skewer-backend/internal/engine"
	"skewer-backend/internal/lichess"
)

type TargetOpening struct {
	Name     string  `json:"name"`
	LossRate float64 `json:"lossRate"`
	WinRate  float64 `json:"winRate"`
	DrawRate float64 `json:"drawRate"`
	Games    int     `json:"games"`
}

type TipsResponse struct {
	TargetOpenings  []TargetOpening `json:"targetOpenings"`
	AvoidOpenings   []TargetOpening `json:"avoidOpenings"`
	AllOpenings     []TargetOpening `json:"allOpenings"`
	WeakestPhase    string          `json:"weakestPhase"`
	BlundersByPhase []PhaseStats    `json:"blundersByPhase"`
	AvgAccuracy     *float64        `json:"avgAccuracy"`
	GamesAnalyzed   int             `json:"gamesAnalyzed"`
	TotalGames      int             `json:"totalGames"`
}

func TipsHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")

	username := r.URL.Query().Get("username")
	gameType := r.URL.Query().Get("gameType")
	gamesStr := r.URL.Query().Get("games")

	if username == "" {
		http.Error(w, "username is required", http.StatusBadRequest)
		return
	}

	max, err := strconv.Atoi(gamesStr)
	if err != nil || max <= 0 {
		max = 10
	}

	games, err := lichess.FetchGames(username, max, gameType)
	if err != nil {
		http.Error(w, "failed to fetch games", http.StatusInternalServerError)
		return
	}

	type openingStats struct {
		wins, draws, losses, total int
	}
	opStats := map[string]*openingStats{}

	phases := [3]PhaseStats{
		{Phase: "Opening"},
		{Phase: "Middlegame"},
		{Phase: "Endgame"},
	}
	gamesAnalyzed := 0
	accSum, accCount := 0, 0

	for _, g := range games {
		name := g.Opening.Name

		var playerColor string
		if strings.EqualFold(g.Players.White.User.Name, username) {
			playerColor = "white"
		} else {
			playerColor = "black"
		}

		if name != "" {
			if _, ok := opStats[name]; !ok {
				opStats[name] = &openingStats{}
			}
			opStats[name].total++
			if g.Winner == "" {
				opStats[name].draws++
			} else if g.Winner == playerColor {
				opStats[name].wins++
			} else {
				opStats[name].losses++
			}
		}

		if len(g.Analysis) > 0 {
			gamesAnalyzed++
			if playerColor == "white" && g.Players.White.Accuracy != nil {
				accSum += *g.Players.White.Accuracy
				accCount++
			} else if playerColor == "black" && g.Players.Black.Accuracy != nil {
				accSum += *g.Players.Black.Accuracy
				accCount++
			}
			for i, move := range g.Analysis {
				if move.Judgment == nil {
					continue
				}
				isWhiteMove := i%2 == 0
				isPlayerMove := (isWhiteMove && playerColor == "white") ||
					(!isWhiteMove && playerColor == "black")
				if !isPlayerMove {
					continue
				}
				ply := i + 1
				idx := phaseIdx(ply)
				switch move.Judgment.Name {
				case "Inaccuracy":
					phases[idx].Inaccuracies++
				case "Mistake":
					phases[idx].Mistakes++
				case "Blunder":
					phases[idx].Blunders++
				}
			}
			continue
		}

		if g.Moves == "" || engine.EvalFENAvailable() == false {
			continue
		}
		gamesAnalyzed++
		sanMoves := strings.Fields(g.Moves)
		chessGame := chess.NewGame(chess.UseNotation(chess.AlgebraicNotation{}))

		evals := make([]float64, 0, len(sanMoves)+1)
		if res, err := engine.EvalFEN(chessGame.Position().String(), 8); err == nil {
			evals = append(evals, res.Evaluation)
		} else {
			evals = append(evals, 0)
		}
		for _, san := range sanMoves {
			if err := chessGame.MoveStr(san); err != nil {
				break
			}
			if res, err := engine.EvalFEN(chessGame.Position().String(), 8); err == nil {
				evals = append(evals, res.Evaluation)
			} else {
				evals = append(evals, evals[len(evals)-1])
			}
		}

		for idx := 0; idx < len(sanMoves) && idx+1 < len(evals); idx++ {
			isWhiteMove := idx%2 == 0
			isPlayerMove := (isWhiteMove && playerColor == "white") ||
				(!isWhiteMove && playerColor == "black")
			if !isPlayerMove {
				continue
			}
			drop := engine.EvalDrop(playerColor, evals[idx], evals[idx+1])
			ply := idx + 1
			phIdx := phaseIdx(ply)
			switch {
			case drop >= 2.0:
				phases[phIdx].Blunders++
			case drop >= 1.0:
				phases[phIdx].Mistakes++
			case drop >= 0.5:
				phases[phIdx].Inaccuracies++
			}
		}
	}

	var targets, avoids, all []TargetOpening
	for name, s := range opStats {
		lossRate := float64(s.losses) / float64(s.total) * 100
		winRate := float64(s.wins) / float64(s.total) * 100
		drawRate := float64(s.draws) / float64(s.total) * 100
		entry := TargetOpening{Name: name, LossRate: lossRate, WinRate: winRate, DrawRate: drawRate, Games: s.total}
		all = append(all, entry)
		if lossRate >= 40 {
			targets = append(targets, entry)
		}
		if winRate >= 50 {
			avoids = append(avoids, entry)
		}
	}

	sort.Slice(targets, func(i, j int) bool { return targets[i].LossRate > targets[j].LossRate })
	if len(targets) > 4 {
		targets = targets[:4]
	}
	sort.Slice(avoids, func(i, j int) bool { return avoids[i].WinRate > avoids[j].WinRate })
	if len(avoids) > 4 {
		avoids = avoids[:4]
	}
	sort.Slice(all, func(i, j int) bool { return all[i].LossRate > all[j].LossRate })

	weakestPhase := "Middlegame"
	maxErrors := -1
	for _, p := range phases {
		if t := p.Blunders + p.Mistakes; t > maxErrors {
			maxErrors = t
			weakestPhase = p.Phase
		}
	}

	resp := TipsResponse{
		TargetOpenings:  targets,
		AvoidOpenings:   avoids,
		AllOpenings:     all,
		WeakestPhase:    weakestPhase,
		BlundersByPhase: phases[:],
		GamesAnalyzed:   gamesAnalyzed,
		TotalGames:      len(games),
	}
	if accCount > 0 {
		avg := float64(accSum) / float64(accCount)
		resp.AvgAccuracy = &avg
	}
	json.NewEncoder(w).Encode(resp)
}

func phaseIdx(ply int) int {
	if ply <= 20 {
		return 0
	} else if ply <= 60 {
		return 1
	}
	return 2
}
