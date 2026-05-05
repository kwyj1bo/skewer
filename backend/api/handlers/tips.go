package handlers

import (
	"encoding/json"
	"net/http"
	"sort"
	"strconv"
	"strings"

	"skewer-backend/internal/lichess"
)

type TargetOpening struct {
	Name     string  `json:"name"`
	LossRate float64 `json:"lossRate"`
	WinRate  float64 `json:"winRate"`
	Games    int     `json:"games"`
}

type TipsResponse struct {
	TargetOpenings  []TargetOpening `json:"targetOpenings"`  // openings where they lose most — steer here
	AvoidOpenings   []TargetOpening `json:"avoidOpenings"`   // openings where they dominate — avoid these
	WeakestPhase    string          `json:"weakestPhase"`    // phase with most blunders+mistakes
	BlundersByPhase []PhaseStats    `json:"blundersByPhase"` // full phase breakdown
	AvgAccuracy     *float64        `json:"avgAccuracy"`
	GamesAnalyzed   int             `json:"gamesAnalyzed"` // games that had engine analysis
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

	// --- Opening stats ---
	type openingStats struct {
		wins, draws, losses, total int
	}
	opStats := map[string]*openingStats{}

	// --- Blunder phase stats ---
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

		// Opening aggregation
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

		// Blunder phase analysis (only games with engine analysis)
		if len(g.Analysis) == 0 {
			continue
		}
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
			var phaseIdx int
			if ply <= 20 {
				phaseIdx = 0
			} else if ply <= 60 {
				phaseIdx = 1
			} else {
				phaseIdx = 2
			}
			switch move.Judgment.Name {
			case "Inaccuracy":
				phases[phaseIdx].Inaccuracies++
			case "Mistake":
				phases[phaseIdx].Mistakes++
			case "Blunder":
				phases[phaseIdx].Blunders++
			}
		}
	}

	// --- Derive target / avoid opening lists ---
	const minGames = 2
	var targets, avoids []TargetOpening

	for name, s := range opStats {
		if s.total < minGames {
			continue
		}
		lossRate := float64(s.losses) / float64(s.total) * 100
		winRate := float64(s.wins) / float64(s.total) * 100
		entry := TargetOpening{Name: name, LossRate: lossRate, WinRate: winRate, Games: s.total}

		if lossRate >= 50 {
			targets = append(targets, entry)
		}
		if winRate >= 60 {
			avoids = append(avoids, entry)
		}
	}

	sort.Slice(targets, func(i, j int) bool { return targets[i].LossRate > targets[j].LossRate })
	if len(targets) > 3 {
		targets = targets[:3]
	}
	sort.Slice(avoids, func(i, j int) bool { return avoids[i].WinRate > avoids[j].WinRate })
	if len(avoids) > 3 {
		avoids = avoids[:3]
	}

	// --- Find weakest phase (most blunders + mistakes) ---
	weakestPhase := "Middlegame"
	maxErrors := -1
	for _, p := range phases {
		total := p.Blunders + p.Mistakes
		if total > maxErrors {
			maxErrors = total
			weakestPhase = p.Phase
		}
	}

	resp := TipsResponse{
		TargetOpenings:  targets,
		AvoidOpenings:   avoids,
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
