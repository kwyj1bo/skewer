// Package engine wraps a local Stockfish process via the UCI protocol.
// A pool of workers is initialised once at startup; callers simply call EvalFEN.
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

// EvalResult holds the result of one position evaluation.
type EvalResult struct {
	Evaluation float64 // pawns, from white's perspective
	Mate       *int    // non-nil when forced mate is detected
	BestMove   string  // UCI notation, e.g. "g1f3"
}

// EvalDrop returns how many pawns the player lost on a given move.
// beforeEval / afterEval are always from white's perspective.
func EvalDrop(playerColor string, beforeEval, afterEval float64) float64 {
	if playerColor == "white" {
		return beforeEval - afterEval
	}
	return afterEval - beforeEval // positive when eval rose for white = bad for black
}

// worker owns a single long-lived Stockfish subprocess.
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

	// Handshake
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

// pool distributes eval requests across multiple workers.
type pool struct {
	ch chan *worker
}

var globalPool *pool
var initOnce sync.Once
var initErr error

// Init initialises the worker pool. Called once at server startup.
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
				// Try direct path even if not in PATH
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

// EvalFEN evaluates the given FEN at the given depth using a pooled worker.
func EvalFEN(fen string, depth int) (*EvalResult, error) {
	if globalPool == nil {
		return nil, fmt.Errorf("engine pool not initialised")
	}
	w := <-globalPool.ch
	defer func() { globalPool.ch <- w }()
	return w.eval(fen, depth)
}
