package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"skewer-backend/internal/lichess"
)

type OpeningRow struct {
	Opening  string  `json:"opening"`
	WinRate  float64 `json:"winRate"`
	DrawRate float64 `json:"drawRate"`
	LossRate float64 `json:"lossRate"`
	Games    int     `json:"games"`
}

func ScoutHandler(w http.ResponseWriter, r *http.Request) {
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

	fmt.Println("games fetched:", len(games))

	type openingStats struct {
		wins, draws, losses, total int
	}
	stats := map[string]*openingStats{}

	for _, g := range games {
		name := g.Opening.Name
		if name == "" {
			continue
		}

		var playerColor string
		if strings.EqualFold(g.Players.White.User.Name, username) {
			playerColor = "white"
		} else {
			playerColor = "black"
		}

		if _, ok := stats[name]; !ok {
			stats[name] = &openingStats{}
		}
		stats[name].total++

		if g.Winner == "" {
			stats[name].draws++
		} else if g.Winner == playerColor {
			stats[name].wins++
		} else {
			stats[name].losses++
		}
	}

	var rows []OpeningRow
	for name, s := range stats {
		if s.total == 0 {
			continue
		}
		rows = append(rows, OpeningRow{
			Opening:  name,
			WinRate:  float64(s.wins) / float64(s.total) * 100,
			DrawRate: float64(s.draws) / float64(s.total) * 100,
			LossRate: float64(s.losses) / float64(s.total) * 100,
			Games:    s.total,
		})
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"openings": rows,
	})
}
