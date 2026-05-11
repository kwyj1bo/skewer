package main

import (
	"fmt"
	"log"
	"net/http"

	"skewer-backend/api/handlers"
	"skewer-backend/internal/engine"
)

func main() {
	if err := engine.Init(4); err != nil {
		log.Fatalf("Stockfish init failed: %v", err)
	}
	fmt.Println("Stockfish engine ready (4 workers)")

	http.HandleFunc("/ping", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintln(w, "pong")
	})

	http.HandleFunc("/scout", handlers.ScoutHandler)
	http.HandleFunc("/blunders", handlers.BlundersHandler)
	http.HandleFunc("/blunders/stream", handlers.BlundersStreamHandler)
	http.HandleFunc("/tips", handlers.TipsHandler)

	fmt.Println("Skewer backend running on :8080")
	http.ListenAndServe(":8080", nil)
}