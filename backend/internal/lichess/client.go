package lichess

import (
	"bufio"
	"encoding/json"
	"fmt"
	"net/http"
)

type Player struct {
	User struct {
		Name string `json:"name"`
	} `json:"user"`
	Accuracy int `json:"accuracy"`
}

type Game struct {
	ID     string `json:"id"`
	Speed  string `json:"speed"`
	Winner string `json:"winner"`
	Opening struct {
		Name string `json:"name"`
		ECO  string `json:"eco"`
	} `json:"opening"`
	Players struct {
		White Player `json:"white"`
		Black Player `json:"black"`
	} `json:"players"`
}

func FetchGames(username string, max int, gameType string) ([]Game, error) {
	url := fmt.Sprintf("https://lichess.org/api/games/user/%s?max=%d&opening=true&accuracy=true&rated=true", username, max)

	if gameType != "all" {
		url += "&perfType=" + gameType
	}

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/x-ndjson")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var games []Game
	scanner := bufio.NewScanner(resp.Body)
	for scanner.Scan() {
		line := scanner.Text()
		if line == "" {
			continue
		}
		var g Game
		if err := json.Unmarshal([]byte(line), &g); err != nil {
			continue
		}
		games = append(games, g)
	}

	return games, nil
}