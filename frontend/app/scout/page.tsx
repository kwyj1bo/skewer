import Link from "next/link";
import { Nunito } from "next/font/google";
import FilterControls from "./filter-controls";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["700", "800"],
});

type ScoutPageProps = {
  searchParams: Promise<{
    platform?: string;
    username?: string;
    tab?: string;
    games?: string;
    gameType?: string;
  }>;
};

type GameType = "all" | "rapid" | "blitz" | "bullet";

type OpeningRow = {
  opening: string;
  lossRate: number;
  drawRate: number;
  winRate: number;
  games: number;
};

type PhaseStats = {
  phase: string;
  inaccuracies: number;
  mistakes: number;
  blunders: number;
};

type ErrorEvent = {
  gameId: string;
  moveNumber: number;
  phase: string;
  type: string;
  comment: string;
};

type BlundersData = {
  gamesAnalyzed: number;
  totalGames: number;
  inaccuracies: number;
  mistakes: number;
  blunders: number;
  byPhase: PhaseStats[];
  avgAccuracy?: number | null;
  errors: ErrorEvent[];
};

type TargetOpening = {
  name: string;
  lossRate: number;
  winRate: number;
  games: number;
};

type TipsData = {
  targetOpenings: TargetOpening[];
  avoidOpenings: TargetOpening[];
  weakestPhase: string;
  blundersByPhase: PhaseStats[];
  avgAccuracy?: number | null;
  gamesAnalyzed: number;
  totalGames: number;
};

function buildTabHref(
  tab: "openings" | "blunders" | "tips",
  platform: "chess.com" | "lichess",
  username: string,
  games: 10 | 100 | 1000,
  gameType: GameType
) {
  const query = new URLSearchParams({
    tab,
    platform,
    username,
    games: String(games),
    gameType,
  });

  return `/scout?${query.toString()}`;
}

function getActiveTab(tabParam?: string): "openings" | "blunders" | "tips" {
  if (tabParam === "blunders" || tabParam === "tips") {
    return tabParam;
  }

  return "openings";
}

export default async function ScoutPage({ searchParams }: ScoutPageProps) {
  const params = await searchParams;

  const platform =
    params.platform === "lichess" || params.platform === "chess.com"
      ? params.platform
      : "chess.com";

  const username = params.username?.trim() || "Unknown player";
  const activeTab = getActiveTab(params.tab);
  const games: 10 | 100 | 1000 =
    params.games === "100" ? 100 : params.games === "1000" ? 1000 : 10;
  const gameType: GameType =
    params.gameType === "rapid" || params.gameType === "blitz" || params.gameType === "bullet"
      ? params.gameType
      : "all";

  let openingsData: OpeningRow[] = [];
  let blundersData: BlundersData | null = null;
  let tipsData: TipsData | null = null;

  try {
    if (activeTab === "openings") {
      const res = await fetch(
        `http://localhost:8080/scout?username=${username}&games=${games}&gameType=${gameType}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      openingsData = data.openings ?? [];
    } else if (activeTab === "blunders") {
      const res = await fetch(
        `http://localhost:8080/blunders?username=${username}&games=${games}&gameType=${gameType}`,
        { cache: "no-store" }
      );
      blundersData = await res.json();
    } else if (activeTab === "tips") {
      const res = await fetch(
        `http://localhost:8080/tips?username=${username}&games=${games}&gameType=${gameType}`,
        { cache: "no-store" }
      );
      tipsData = await res.json();
    }
  } catch (e) {
    console.error("Failed to fetch from backend:", e);
  }

  const sortedOpenings = [...openingsData].sort((a, b) => b.games - a.games);

  return (
    <main
      className={`${nunito.className} page-rise-in relative min-h-screen overflow-hidden bg-[#182527]`}
    >
      <div className="mx-auto flex min-h-screen w-full max-w-[1250px] flex-col px-7 pb-12 pt-12 md:px-16 md:pt-14">
        <div className="mb-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="h-8 w-[3px] rounded-full bg-[#1ce0ad]" aria-hidden />
            <span className="text-[34px] font-extrabold leading-none tracking-[-0.03em] text-[#f3f5f5]">
              skewer.
            </span>
          </div>

          <Link
            href="/dashboard"
            className="inline-flex h-10 items-center justify-center rounded-full border border-[#2b4548] px-5 text-[15px] font-bold tracking-[-0.01em] text-[#b6c6c7] transition-colors duration-200 hover:border-[#3e6367] hover:text-[#e5eded]"
          >
            Back
          </Link>
        </div>

        <section className="mx-auto mt-6 w-full max-w-[980px] rounded-3xl border border-[#234145] bg-[#102022]/85 p-6 shadow-[0_30px_80px_-40px_rgba(7,39,46,0.95)] md:p-8">
          <p className="text-[14px] font-extrabold uppercase tracking-[0.08em] text-[#88a4a6]">
            Scouting Target
          </p>

          <h1 className="mt-3 text-[40px] font-extrabold leading-[1.05] tracking-[-0.03em] text-[#f4f6f6] md:text-[52px]">
            {username}
          </h1>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <p className="text-[18px] font-bold tracking-[-0.01em] text-[#a8bbbd]">
              Platform: <span className="text-[#dffaf2]">{platform}</span>
            </p>

            <FilterControls
              platform={platform}
              username={username}
              activeTab={activeTab}
              games={games}
              gameType={gameType}
            />
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={buildTabHref("openings", platform, username, games, gameType)}
              className={`inline-flex h-11 items-center justify-center rounded-full px-6 text-[17px] font-extrabold tracking-[-0.02em] transition-colors duration-200 ${activeTab === "openings"
                  ? "bg-[#1dd5a0] text-[#07272e]"
                  : "border border-[#2b4548] text-[#b6c6c7] hover:border-[#3e6367] hover:text-[#e5eded]"
                }`}
            >
              Openings
            </Link>

            <Link
              href={buildTabHref("blunders", platform, username, games, gameType)}
              className={`inline-flex h-11 items-center justify-center rounded-full px-6 text-[17px] font-extrabold tracking-[-0.02em] transition-colors duration-200 ${activeTab === "blunders"
                  ? "bg-[#1dd5a0] text-[#07272e]"
                  : "border border-[#2b4548] text-[#b6c6c7] hover:border-[#3e6367] hover:text-[#e5eded]"
                }`}
            >
              Blunders
            </Link>

            <Link
              href={buildTabHref("tips", platform, username, games, gameType)}
              className={`inline-flex h-11 items-center justify-center rounded-full px-6 text-[17px] font-extrabold tracking-[-0.02em] transition-colors duration-200 ${activeTab === "tips"
                  ? "bg-[#1dd5a0] text-[#07272e]"
                  : "border border-[#2b4548] text-[#b6c6c7] hover:border-[#3e6367] hover:text-[#e5eded]"
                }`}
            >
              Tips
            </Link>
          </div>

          {activeTab === "openings" && (
            <div className="mt-8 overflow-hidden rounded-2xl border border-[#2b4548] bg-[#162b2e]">
              <div className="grid grid-cols-[1.4fr_repeat(4,minmax(0,1fr))] gap-3 border-b border-[#2b4548] px-4 py-3 text-[12px] font-extrabold uppercase tracking-[0.08em] text-[#8ba3a5] md:px-5">
                <span>Opening</span>
                <span>Loss %</span>
                <span>Draw %</span>
                <span>Win %</span>
                <span>Games</span>
              </div>

              <div>
                {sortedOpenings.length === 0 ? (
                  <p className="px-5 py-6 text-[15px] font-bold text-[#8ba3a5]">
                    No openings data found for this player.
                  </p>
                ) : (
                  sortedOpenings.map((row) => (
                    <div
                      key={row.opening}
                      className="grid grid-cols-[1.4fr_repeat(4,minmax(0,1fr))] gap-3 border-b border-[#203638] px-4 py-4 text-[14px] font-bold tracking-[-0.01em] text-[#b8c9ca] last:border-b-0 md:px-5"
                    >
                      <span className="text-[#e5efef]">{row.opening}</span>
                      <span className="text-[#f2a6a0]">{row.lossRate.toFixed(0)}%</span>
                      <span>{row.drawRate.toFixed(0)}%</span>
                      <span className="text-[#97d8c5]">{row.winRate.toFixed(0)}%</span>
                      <span>{row.games}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === "blunders" && (
            <div className="mt-8">
              {!blundersData || blundersData.gamesAnalyzed === 0 ? (
                <p className="px-1 text-[15px] font-bold text-[#8ba3a5]">
                  No engine analysis found for this player&apos;s recent games. Lichess computer
                  analysis must exist on the games to detect errors.
                </p>
              ) : (
                <>
                  {/* Summary bar */}
                  <div className="mb-6 flex flex-wrap gap-3">
                    <div className="flex-1 min-w-[120px] rounded-2xl border border-[#2b4548] bg-[#162b2e] px-5 py-4 text-center">
                      <p className="text-[32px] font-extrabold tracking-[-0.03em] text-[#f2a6a0]">{blundersData.blunders}</p>
                      <p className="mt-1 text-[12px] font-extrabold uppercase tracking-[0.07em] text-[#88a4a6]">Blunders</p>
                    </div>
                    <div className="flex-1 min-w-[120px] rounded-2xl border border-[#2b4548] bg-[#162b2e] px-5 py-4 text-center">
                      <p className="text-[32px] font-extrabold tracking-[-0.03em] text-[#f0c87a]">{blundersData.mistakes}</p>
                      <p className="mt-1 text-[12px] font-extrabold uppercase tracking-[0.07em] text-[#88a4a6]">Mistakes</p>
                    </div>
                    <div className="flex-1 min-w-[120px] rounded-2xl border border-[#2b4548] bg-[#162b2e] px-5 py-4 text-center">
                      <p className="text-[32px] font-extrabold tracking-[-0.03em] text-[#b8c9ca]">{blundersData.inaccuracies}</p>
                      <p className="mt-1 text-[12px] font-extrabold uppercase tracking-[0.07em] text-[#88a4a6]">Inaccuracies</p>
                    </div>
                    {blundersData.avgAccuracy != null && (
                      <div className="flex-1 min-w-[120px] rounded-2xl border border-[#2b4548] bg-[#162b2e] px-5 py-4 text-center">
                        <p className="text-[32px] font-extrabold tracking-[-0.03em] text-[#1ce0ad]">{blundersData.avgAccuracy.toFixed(1)}%</p>
                        <p className="mt-1 text-[12px] font-extrabold uppercase tracking-[0.07em] text-[#88a4a6]">Avg Accuracy</p>
                      </div>
                    )}
                  </div>

                  {/* Phase breakdown */}
                  <div className="grid gap-4">
                    {blundersData.byPhase.map((phase) => (
                      <article
                        key={phase.phase}
                        className="rounded-2xl border border-[#2b4548] bg-[#162b2e] px-5 py-4"
                      >
                        <h2 className="text-[20px] font-extrabold tracking-[-0.02em] text-[#e6f0f0]">
                          {phase.phase}
                        </h2>
                        <div className="mt-3 flex flex-wrap gap-4">
                          <p className="text-[14px] font-bold text-[#9fb4b6]">
                            Blunders:{" "}
                            <span className="text-[#f2a6a0] font-extrabold">{phase.blunders}</span>
                          </p>
                          <p className="text-[14px] font-bold text-[#9fb4b6]">
                            Mistakes:{" "}
                            <span className="text-[#f0c87a] font-extrabold">{phase.mistakes}</span>
                          </p>
                          <p className="text-[14px] font-bold text-[#9fb4b6]">
                            Inaccuracies:{" "}
                            <span className="text-[#b8c9ca] font-extrabold">{phase.inaccuracies}</span>
                          </p>
                        </div>
                      </article>
                    ))}
                  </div>

                  {/* Individual error list */}
                  {blundersData.errors && blundersData.errors.length > 0 && (
                    <div className="mt-8">
                      <p className="mb-4 text-[14px] font-extrabold uppercase tracking-[0.08em] text-[#88a4a6]">
                        Error Log
                      </p>
                      <div className="overflow-hidden rounded-2xl border border-[#2b4548]">
                        {blundersData.errors
                          .slice()
                          .sort((a, b) => {
                            const order: Record<string, number> = { Blunder: 0, Mistake: 1, Inaccuracy: 2 };
                            return (order[a.type] ?? 3) - (order[b.type] ?? 3);
                          })
                          .map((err, idx) => {
                            const badgeColor =
                              err.type === "Blunder"
                                ? "text-[#f2a6a0] border-[#5a2e2e]"
                                : err.type === "Mistake"
                                ? "text-[#f0c87a] border-[#5a4a1a]"
                                : "text-[#b8c9ca] border-[#2b4548]";
                            return (
                              <div
                                key={idx}
                                className="flex flex-col gap-2 border-b border-[#203638] bg-[#162b2e] px-5 py-4 last:border-b-0 sm:flex-row sm:items-start sm:justify-between"
                              >
                                <div className="flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span
                                      className={`inline-flex h-6 items-center rounded-full border px-2.5 text-[11px] font-extrabold uppercase tracking-[0.07em] ${badgeColor}`}
                                    >
                                      {err.type}
                                    </span>
                                    <span className="text-[13px] font-extrabold text-[#4f6e71]">
                                      Move {err.moveNumber} · {err.phase}
                                    </span>
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
                            );
                          })}
                      </div>
                    </div>
                  )}

                  <p className="mt-5 text-[13px] font-bold text-[#5a7275]">
                    Based on {blundersData.gamesAnalyzed} of {blundersData.totalGames} games with engine analysis.
                  </p>
                </>
              )}
            </div>
          )}

          {activeTab === "tips" && (
            <div className="mt-8">
              {!tipsData ? (
                <p className="text-[15px] font-bold text-[#8ba3a5]">Loading tips…</p>
              ) : (
                <>
                  {/* Openings to play */}
                  <p className="mb-4 text-[14px] font-extrabold uppercase tracking-[0.08em] text-[#88a4a6]">
                    Openings to play against them
                  </p>
                  {tipsData.targetOpenings.length === 0 ? (
                    <p className="mb-8 text-[14px] font-bold text-[#5a7275]">
                      Not enough data yet — scout more games to surface weak openings.
                    </p>
                  ) : (
                    <div className="mb-8 grid gap-3">
                      {tipsData.targetOpenings.map((op) => (
                        <article
                          key={op.name}
                          className="rounded-2xl border border-[#2b4548] bg-[#162b2e] px-5 py-4"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <h2 className="text-[17px] font-extrabold tracking-[-0.02em] text-[#e6f0f0]">
                              {op.name}
                            </h2>
                            <span className="inline-flex h-7 items-center rounded-full border border-[#5a2e2e] px-3 text-[12px] font-extrabold uppercase tracking-[0.06em] text-[#f2a6a0]">
                              They lose {op.lossRate.toFixed(0)}% here
                            </span>
                          </div>
                          {/* loss rate bar */}
                          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[#1e3436]">
                            <div
                              className="h-full rounded-full bg-[#f2a6a0]"
                              style={{ width: `${op.lossRate}%` }}
                            />
                          </div>
                          <p className="mt-2 text-[13px] font-bold text-[#5a7275]">
                            {op.games} game{op.games !== 1 ? "s" : ""} sampled
                          </p>
                        </article>
                      ))}
                    </div>
                  )}

                  {/* Openings to avoid */}
                  {tipsData.avoidOpenings.length > 0 && (
                    <>
                      <p className="mb-4 text-[14px] font-extrabold uppercase tracking-[0.08em] text-[#88a4a6]">
                        Openings to avoid — they dominate here
                      </p>
                      <div className="mb-8 grid gap-3">
                        {tipsData.avoidOpenings.map((op) => (
                          <article
                            key={op.name}
                            className="rounded-2xl border border-[#2b4548] bg-[#162b2e] px-5 py-4"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <h2 className="text-[17px] font-extrabold tracking-[-0.02em] text-[#e6f0f0]">
                                {op.name}
                              </h2>
                              <span className="inline-flex h-7 items-center rounded-full border border-[#1a4a35] px-3 text-[12px] font-extrabold uppercase tracking-[0.06em] text-[#97d8c5]">
                                They win {op.winRate.toFixed(0)}% here
                              </span>
                            </div>
                            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[#1e3436]">
                              <div
                                className="h-full rounded-full bg-[#97d8c5]"
                                style={{ width: `${op.winRate}%` }}
                              />
                            </div>
                            <p className="mt-2 text-[13px] font-bold text-[#5a7275]">
                              {op.games} game{op.games !== 1 ? "s" : ""} sampled
                            </p>
                          </article>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Exploit their weaknesses */}
                  {tipsData.gamesAnalyzed > 0 && (
                    <>
                      <p className="mb-4 text-[14px] font-extrabold uppercase tracking-[0.08em] text-[#88a4a6]">
                        How to exploit their weaknesses
                      </p>
                      <div className="grid gap-3">
                        <article className="rounded-2xl border border-[#2b4548] bg-[#162b2e] px-5 py-4">
                          <h2 className="text-[17px] font-extrabold tracking-[-0.02em] text-[#e6f0f0]">
                            Push them into the {tipsData.weakestPhase}
                          </h2>
                          <p className="mt-2 text-[14px] font-bold leading-relaxed text-[#9fb4b6]">
                            {(() => {
                              const p = tipsData.blundersByPhase.find(
                                (x) => x.phase === tipsData!.weakestPhase
                              );
                              if (!p) return null;
                              const total = p.blunders + p.mistakes + p.inaccuracies;
                              return `They made ${p.blunders} blunder${p.blunders !== 1 ? "s" : ""}, ${
                                p.mistakes
                              } mistake${p.mistakes !== 1 ? "s" : ""}, and ${p.inaccuracies} inaccurac${
                                p.inaccuracies !== 1 ? "ies" : "y"
                              } in the ${tipsData!.weakestPhase} across analyzed games (${total} total errors). Steer the game here.`;
                            })()}
                          </p>
                        </article>

                        {tipsData.avgAccuracy != null && (
                          <article className="rounded-2xl border border-[#2b4548] bg-[#162b2e] px-5 py-4">
                            <h2 className="text-[17px] font-extrabold tracking-[-0.02em] text-[#e6f0f0]">
                              Stay patient — their accuracy is {tipsData.avgAccuracy.toFixed(1)}%
                            </h2>
                            <p className="mt-2 text-[14px] font-bold leading-relaxed text-[#9fb4b6]">
                              {tipsData.avgAccuracy < 80
                                ? "They make frequent errors under pressure. Keep the position complex and wait for mistakes."
                                : tipsData.avgAccuracy < 90
                                ? "They play reasonably accurately but are not immune to errors. Look for tactical shots and complications."
                                : "They play with high accuracy. Avoid simplifications that lead to drawish positions and aim for imbalanced play."}
                            </p>
                          </article>
                        )}
                      </div>
                      <p className="mt-5 text-[13px] font-bold text-[#5a7275]">
                        Based on {tipsData.gamesAnalyzed} of {tipsData.totalGames} games with engine analysis.
                      </p>
                    </>
                  )}
                </>
              )}
            </div>
          )}

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="inline-flex h-11 items-center justify-center rounded-full bg-[#1dd5a0] px-7 text-[18px] font-extrabold tracking-[-0.02em] text-[#07272e] transition-colors duration-200 hover:bg-[#17c592]"
            >
              Scout Another Opponent
            </Link>

            <Link
              href="/"
              className="inline-flex h-11 items-center justify-center rounded-full border border-[#2b4548] px-7 text-[18px] font-extrabold tracking-[-0.02em] text-[#c7d5d7] transition-colors duration-200 hover:border-[#3e6367] hover:text-[#e5eded]"
            >
              Home
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}