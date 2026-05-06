package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"skewer-backend/api/handlers"
	"skewer-backend/internal/engine"
)
func enableCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "https://skewer-one.vercel.app")
		
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func main() {
	if err := engine.Init(4); err != nil {
		log.Fatalf("Stockfish init failed: %v", err)
	}
	fmt.Println("Stockfish engine ready (4 workers)")

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	mux := http.NewServeMux()

	mux.HandleFunc("/ping", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintln(w, "pong")
	})

	mux.HandleFunc("/scout", handlers.ScoutHandler)
	mux.HandleFunc("/blunders", handlers.BlundersHandler)
	mux.HandleFunc("/blunders/stream", handlers.BlundersStreamHandler)
	mux.HandleFunc("/tips", handlers.TipsHandler)

	fmt.Printf("Skewer backend running on :%s\n", port)
	
	err := http.ListenAndServe(":"+port, enableCORS(mux))
	if err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
