package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/notnil/chess"

	"skewer-backend/internal/engine"
)

type ExploreMove struct {
	Move       string  `json:"move"`
	Evaluation float64 `json:"eval"`
	Mate       *int    `json:"mate,omitempty"`
	NextFEN    string  `json:"nextFen"`
}

func ExploreHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")

	fenStr := r.URL.Query().Get("fen")
	if fenStr == "" {
		http.Error(w, "fen required", http.StatusBadRequest)
		return
	}

	depth, _ := strconv.Atoi(r.URL.Query().Get("depth"))
	if depth <= 0 {
		depth = 12
	}
	lines, _ := strconv.Atoi(r.URL.Query().Get("lines"))
	if lines <= 0 {
		lines = 3
	}

	results, err := engine.EvalMultiPV(fenStr, depth, lines)
	if err != nil {
		http.Error(w, "engine error", http.StatusInternalServerError)
		return
	}

	fenOpt, err := chess.FEN(fenStr)
	if err != nil {
		http.Error(w, "invalid fen", http.StatusBadRequest)
		return
	}

	var moves []ExploreMove
	for _, res := range results {
		g := chess.NewGame(fenOpt, chess.UseNotation(chess.UCINotation{}))
		if err := g.MoveStr(res.Move); err != nil {
			continue
		}
		moves = append(moves, ExploreMove{
			Move:       res.Move,
			Evaluation: res.Evaluation,
			Mate:       res.Mate,
			NextFEN:    g.Position().String(),
		})
	}

	json.NewEncoder(w).Encode(map[string]any{"moves": moves})
}
