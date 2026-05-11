package engine

import (
	"bufio"
	"fmt"
	"io"
	"os/exec"
	"strconv"
	"strings"
	"sync"
)

type EvalResult struct {
	Evaluation float64
	Mate       *int
	BestMove   string
}

func EvalDrop(playerColor string, beforeEval, afterEval float64) float64 {
	if playerColor == "white" {
		return beforeEval - afterEval
	}
	return afterEval - beforeEval
}

type worker struct {
	stdin  io.WriteCloser
	stdout *bufio.Scanner
	mu     sync.Mutex
}

func newWorker(path string) (*worker, error) {
	cmd := exec.Command(path)

	stdin, err := cmd.StdinPipe()
	if err != nil {
		return nil, err
	}
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return nil, err
	}
	if err := cmd.Start(); err != nil {
		return nil, err
	}

	w := &worker{
		stdin:  stdin,
		stdout: bufio.NewScanner(stdout),
	}

	fmt.Fprintln(w.stdin, "uci")
	for w.stdout.Scan() {
		if w.stdout.Text() == "uciok" {
			break
		}
	}
	fmt.Fprintln(w.stdin, "isready")
	for w.stdout.Scan() {
		if w.stdout.Text() == "readyok" {
			break
		}
	}
	return w, nil
}

func (w *worker) eval(fen string, depth int) (*EvalResult, error) {
	w.mu.Lock()
	defer w.mu.Unlock()

	fmt.Fprintf(w.stdin, "position fen %s\n", fen)
	fmt.Fprintf(w.stdin, "go depth %d\n", depth)

	var score float64
	var mate *int
	var bestmove string

	for w.stdout.Scan() {
		line := w.stdout.Text()

		if strings.HasPrefix(line, "info") && strings.Contains(line, "score") {
			parts := strings.Fields(line)
			for i, p := range parts {
				if p == "cp" && i+1 < len(parts) {
					if v, err := strconv.ParseFloat(parts[i+1], 64); err == nil {
						score = v / 100.0
					}
				} else if p == "mate" && i+1 < len(parts) {
					if v, err := strconv.Atoi(parts[i+1]); err == nil {
						mate = &v
						if v > 0 {
							score = 99.0
						} else {
							score = -99.0
						}
					}
				}
			}
		}

		if strings.HasPrefix(line, "bestmove") {
			parts := strings.Fields(line)
			if len(parts) >= 2 && parts[1] != "(none)" {
				bestmove = parts[1]
			}
			break
		}
	}

	return &EvalResult{Evaluation: score, Mate: mate, BestMove: bestmove}, nil
}

type pool struct {
	ch chan *worker
}

var globalPool *pool
var initOnce sync.Once
var initErr error

func Init(size int) error {
	initOnce.Do(func() {
		path, err := exec.LookPath("stockfish")
		if err != nil {
			// Fallback: common install locations when PATH hasn't refreshed
			candidates := []string{
				`C:\Users\prati\AppData\Local\Microsoft\WinGet\Packages\Stockfish.Stockfish_Microsoft.Winget.Source_8wekyb3d8bbwe\stockfish\stockfish-windows-x86-64-avx2.exe`,
				`C:\Program Files\stockfish\stockfish.exe`,
				`/usr/games/stockfish`,
				`/usr/local/bin/stockfish`,
			}
			for _, c := range candidates {
				if _, statErr := exec.LookPath(c); statErr == nil {
					path = c
					err = nil
					break
				}
				cmd := exec.Command(c, "quit")
				if runErr := cmd.Run(); runErr == nil {
					path = c
					err = nil
					break
				}
			}
		}
		if err != nil {
			initErr = fmt.Errorf("stockfish binary not found. Install it or add it to PATH: %w", err)
			return
		}

		p := &pool{ch: make(chan *worker, size)}
		for i := 0; i < size; i++ {
			w, err := newWorker(path)
			if err != nil {
				initErr = fmt.Errorf("failed to start stockfish worker %d: %w", i, err)
				return
			}
			p.ch <- w
		}
		globalPool = p
	})
	return initErr
}

func EvalFEN(fen string, depth int) (*EvalResult, error) {
	if globalPool == nil {
		return nil, fmt.Errorf("engine pool not initialised")
	}
	w := <-globalPool.ch
	defer func() { globalPool.ch <- w }()
	return w.eval(fen, depth)
}

func EvalFENAvailable() bool { return globalPool != nil }

type MultiPVResult struct {
	Move       string
	Evaluation float64
	Mate       *int
}

func (w *worker) evalMultiPV(fen string, depth, lines int) ([]MultiPVResult, error) {
	w.mu.Lock()
	defer w.mu.Unlock()

	fmt.Fprintf(w.stdin, "setoption name MultiPV value %d\n", lines)
	fmt.Fprintf(w.stdin, "position fen %s\n", fen)
	fmt.Fprintf(w.stdin, "go depth %d\n", depth)

	type pvInfo struct {
		eval float64
		mate *int
		move string
	}
	pvMap := map[int]pvInfo{}

	for w.stdout.Scan() {
		line := w.stdout.Text()
		if strings.HasPrefix(line, "info") && strings.Contains(line, "multipv") {
			parts := strings.Fields(line)
			var pvIdx int
			var score float64
			var mate *int
			var firstMove string
			for i, p := range parts {
				switch p {
				case "multipv":
					if i+1 < len(parts) {
						pvIdx, _ = strconv.Atoi(parts[i+1])
					}
				case "cp":
					if i+1 < len(parts) {
						if v, err := strconv.ParseFloat(parts[i+1], 64); err == nil {
							score = v / 100.0
						}
					}
				case "mate":
					if i+1 < len(parts) {
						if v, err := strconv.Atoi(parts[i+1]); err == nil {
							mate = &v
							if v > 0 {
								score = 99.0
							} else {
								score = -99.0
							}
						}
					}
				case "pv":
					if i+1 < len(parts) && firstMove == "" {
						firstMove = parts[i+1]
					}
				}
			}
			if pvIdx > 0 && firstMove != "" {
				pvMap[pvIdx] = pvInfo{eval: score, mate: mate, move: firstMove}
			}
		}
		if strings.HasPrefix(line, "bestmove") {
			break
		}
	}

	fmt.Fprintln(w.stdin, "setoption name MultiPV value 1")

	var results []MultiPVResult
	for i := 1; i <= lines; i++ {
		info, ok := pvMap[i]
		if !ok {
			break
		}
		results = append(results, MultiPVResult{Move: info.move, Evaluation: info.eval, Mate: info.mate})
	}
	return results, nil
}

func EvalMultiPV(fen string, depth, lines int) ([]MultiPVResult, error) {
	if globalPool == nil {
		return nil, fmt.Errorf("engine pool not initialised")
	}
	w := <-globalPool.ch
	defer func() { globalPool.ch <- w }()
	return w.evalMultiPV(fen, depth, lines)
}
