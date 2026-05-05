package main

import (
	"fmt"
	"net/http"

	"skewer-backend/api/handlers"
)

func main() {
	http.HandleFunc("/ping", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintln(w, "pong")
	})

	http.HandleFunc("/scout", handlers.ScoutHandler)

	fmt.Println("Skewer backend running on :8080")
	http.ListenAndServe(":8080", nil)
}