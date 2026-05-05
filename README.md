Skewer is a full-stack chess analysis pipeline that fetches opponent match histories from Chess.com and Lichess to generate actionable insights, identify common blunders, and track opening success rates.

Opponent Profiling: Aggregates PGN data from Lichess and Chess.com APIs.

Automated Insights: Calculates win/loss ratios across different opening lines (e.g., Sicilian Defense, Italian Game).

Blunder Detection: Integrates with the Stockfish engine to identify common positional mistakes and opening traps.

Optimized Pipeline: Utilizes PGN metadata extraction and pre-calculated evaluations to minimize engine compute time.
