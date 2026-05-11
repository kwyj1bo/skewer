"use client";

import { useEffect, useRef, useState } from "react";

type ErrorEventItem = {
  gameId: string;
  moveNumber: number;
  phase: string;
  type: string;
  comment: string;
  evalDrop: number;
};

type ErrorPattern = {
  name: string;
  count: number;
  description: string;
};

type Summary = {
  blunders: number;
  mistakes: number;
  inaccuracies: number;
  totalGames: number;
  patterns: ErrorPattern[];
};

type Progress = {
  gameNumber: number;
  totalGames: number;
  gameId: string;
};

type Props = {
  username: string;
  games: number;
  gameType: string;
};

export default function BlundersStream({ username, games, gameType }: Props) {
  const [errors, setErrors] = useState<ErrorEventItem[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    esRef.current?.close();
    setErrors([]);
    setSummary(null);
    setProgress(null);
    setDone(false);
    setFailed(false);

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
    const url = `${baseUrl}/blunders/stream?username=${encodeURIComponent(username)}&games=${games}&gameType=${gameType}`;
    const es = new EventSource(url);
    esRef.current = es;

    es.addEventListener("progress", (e) => setProgress(JSON.parse(e.data)));

    es.addEventListener("error_event", (e) => {
      const ev: ErrorEventItem = JSON.parse(e.data);
      setErrors((prev) => [...prev, ev]);
    });

    es.addEventListener("summary", (e) => setSummary(JSON.parse(e.data)));

    es.addEventListener("done", () => {
      setDone(true);
      es.close();
    });

    es.onerror = () => {
      setFailed(true);
      es.close();
    };

    return () => es.close();
  }, [username, games, gameType]);

  const badgeColor = (type: string) =>
    type === "Blunder"
      ? "text-[#f2a6a0] border-[#5a2e2e]"
      : type === "Mistake"
      ? "text-[#f0c87a] border-[#5a4a1a]"
      : "text-[#b8c9ca] border-[#2b4548]";

  const sorted = [...errors].sort((a, b) => {
    const order: Record<string, number> = { Blunder: 0, Mistake: 1, Inaccuracy: 2 };
    return (order[a.type] ?? 3) - (order[b.type] ?? 3);
  });

  if (failed) {
    return (
      <p className="mt-8 text-[15px] font-bold text-[#8ba3a5]">
        Could not connect to the analysis server. Make sure the backend is running.
      </p>
    );
  }

  return (
    <div className="mt-8">
      {(summary || errors.length > 0) && (
        <div className="mb-6 flex flex-wrap gap-3">
          {(
            [
              { label: "Blunders", key: "blunders", color: "text-[#f2a6a0]" },
              { label: "Mistakes", key: "mistakes", color: "text-[#f0c87a]" },
              { label: "Inaccuracies", key: "inaccuracies", color: "text-[#b8c9ca]" },
            ] as const
          ).map(({ label, key, color }) => {
            const count = summary
              ? summary[key]
              : errors.filter((e) => e.type === label.replace(/s$/, "")).length;
            return (
              <div
                key={label}
                className="flex-1 min-w-[110px] rounded-2xl border border-[#2b4548] bg-[#162b2e] px-5 py-4 text-center"
              >
                <p className={`text-[32px] font-extrabold tracking-[-0.03em] ${color}`}>{count}</p>
                <p className="mt-1 text-[12px] font-extrabold uppercase tracking-[0.07em] text-[#88a4a6]">
                  {label}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {!done && progress && (
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[13px] font-extrabold uppercase tracking-[0.07em] text-[#88a4a6]">
              Analyzing game {progress.gameNumber} of {progress.totalGames}
            </p>
            <span className="text-[13px] font-bold text-[#4f6e71]">
              {Math.round((progress.gameNumber / progress.totalGames) * 100)}%
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#1e3436]">
            <div
              className="h-full rounded-full bg-[#1ce0ad] transition-all duration-500"
              style={{ width: `${(progress.gameNumber / progress.totalGames) * 100}%` }}
            />
          </div>
        </div>
      )}

      {!done && !progress && errors.length === 0 && (
        <p className="text-[15px] font-bold text-[#8ba3a5]">Connecting to analysis engine…</p>
      )}

      {done && summary?.patterns && summary.patterns.length > 0 && (
        <div className="mb-8">
          <p className="mb-4 text-[14px] font-extrabold uppercase tracking-[0.08em] text-[#88a4a6]">
            Pattern Report
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {summary.patterns.map((p) => (
              <article
                key={p.name}
                className="rounded-2xl border border-[#2b4548] bg-[#162b2e] px-5 py-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-[16px] font-extrabold tracking-[-0.02em] text-[#e6f0f0]">
                    {p.name}
                  </h2>
                  <span className="shrink-0 inline-flex h-7 min-w-[32px] items-center justify-center rounded-full border border-[#5a2e2e] px-2.5 text-[13px] font-extrabold text-[#f2a6a0]">
                    ×{p.count}
                  </span>
                </div>
                <p className="mt-2 text-[13px] font-bold leading-snug text-[#7a9ea1]">
                  {p.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      )}

      {sorted.length > 0 && (
        <div>
          <p className="mb-4 text-[14px] font-extrabold uppercase tracking-[0.08em] text-[#88a4a6]">
            Error Log{!done && <span className="ml-2 text-[#1ce0ad]">● live</span>}
          </p>
          <div className="overflow-hidden rounded-2xl border border-[#2b4548]">
            {sorted.map((err, idx) => (
              <div
                key={idx}
                className="flex flex-col gap-2 border-b border-[#203638] bg-[#162b2e] px-5 py-4 last:border-b-0 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex h-6 items-center rounded-full border px-2.5 text-[11px] font-extrabold uppercase tracking-[0.07em] ${badgeColor(err.type)}`}
                    >
                      {err.type}
                    </span>
                    <span className="text-[13px] font-extrabold text-[#4f6e71]">
                      Move {err.moveNumber} · {err.phase}
                    </span>
                    {err.evalDrop > 0 && (
                      <span className="text-[12px] font-bold text-[#5a7275]">
                        −{err.evalDrop.toFixed(1)} ♟
                      </span>
                    )}
                  </div>
                  {err.comment && (
                    <p className="mt-1.5 text-[14px] font-bold leading-snug tracking-[-0.01em] text-[#9fb4b6]">
                      {err.comment}
                    </p>
                  )}
                </div>
                <a
                  href={`https://lichess.org/${err.gameId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 self-start inline-flex h-8 items-center rounded-full border border-[#2b4548] px-3 text-[12px] font-extrabold tracking-[-0.01em] text-[#7a9ea1] transition-colors hover:border-[#3e6367] hover:text-[#c5d9da]"
                >
                  View game ↗
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {done && sorted.length === 0 && (
        <p className="text-[15px] font-bold text-[#8ba3a5]">No errors detected in analyzed games.</p>
      )}

      {done && summary && (
        <p className="mt-5 text-[13px] font-bold text-[#5a7275]">
          Analysis complete — {summary.totalGames} game{summary.totalGames !== 1 ? "s" : ""} processed.
        </p>
      )}
    </div>
  );
}
