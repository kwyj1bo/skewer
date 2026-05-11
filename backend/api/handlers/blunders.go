package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"skewer-backend/internal/lichess"
)

type PhaseStats struct {
	Phase        string `json:"phase"`
	Inaccuracies int    `json:"inaccuracies"`
	Mistakes     int    `json:"mistakes"`
	Blunders     int    `json:"blunders"`
}

type ErrorEvent struct {
	GameID     string  `json:"gameId"`
	MoveNumber int     `json:"moveNumber"`
	Phase      string  `json:"phase"`
	Type       string  `json:"type"`
	Comment    string  `json:"comment"`
	EvalDrop   float64 `json:"evalDrop"`
}

type BlundersResponse struct {
	GamesAnalyzed int          `json:"gamesAnalyzed"`
	TotalGames    int          `json:"totalGames"`
	Inaccuracies  int          `json:"inaccuracies"`
	Mistakes      int          `json:"mistakes"`
	Blunders      int          `json:"blunders"`
	ByPhase       []PhaseStats `json:"byPhase"`
	AvgAccuracy   *float64     `json:"avgAccuracy"`
	Errors        []ErrorEvent `json:"errors"`
}

func BlundersHandler(w http.ResponseWriter, r *http.Request) {
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

	phases := [3]PhaseStats{
		{Phase: "Opening"},
		{Phase: "Middlegame"},
		{Phase: "Endgame"},
	}

	totalInaccuracies, totalMistakes, totalBlunders := 0, 0, 0
	gamesAnalyzed := 0
	accSum, accCount := 0, 0
	var errors []ErrorEvent

	for _, g := range games {
		if len(g.Analysis) == 0 {
			continue
		}
		gamesAnalyzed++

		var playerColor string
		if strings.EqualFold(g.Players.White.User.Name, username) {
			playerColor = "white"
		} else {
			playerColor = "black"
		}

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
			var phaseIdx int
			var phaseName string
			if ply <= 20 {
				phaseIdx, phaseName = 0, "Opening"
			} else if ply <= 60 {
				phaseIdx, phaseName = 1, "Middlegame"
			} else {
				phaseIdx, phaseName = 2, "Endgame"
			}

			moveNumber := i/2 + 1

			switch move.Judgment.Name {
			case "Inaccuracy":
				totalInaccuracies++
				phases[phaseIdx].Inaccuracies++
			case "Mistake":
				totalMistakes++
				phases[phaseIdx].Mistakes++
			case "Blunder":
				totalBlunders++
				phases[phaseIdx].Blunders++
			}

			errors = append(errors, ErrorEvent{
				GameID:     g.ID,
				MoveNumber: moveNumber,
				Phase:      phaseName,
				Type:       move.Judgment.Name,
				Comment:    move.Judgment.Comment,
			})
		}
	}

	resp := BlundersResponse{
		GamesAnalyzed: gamesAnalyzed,
		TotalGames:    len(games),
		Inaccuracies:  totalInaccuracies,
		Mistakes:      totalMistakes,
		Blunders:      totalBlunders,
		ByPhase:       phases[:],
		Errors:        errors,
	}
	if accCount > 0 {
		avg := float64(accSum) / float64(accCount)
		resp.AvgAccuracy = &avg
	}

	json.NewEncoder(w).Encode(resp)
}
