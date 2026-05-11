import Link from "next/link";
import { Nunito } from "next/font/google";
import FilterControls from "./filter-controls";
import BlundersStream from "./blunders-client";

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


type TargetOpening = {
  name: string;
  lossRate: number;
  winRate: number;
  drawRate: number;
  games: number;
};

type TipsData = {
  targetOpenings: TargetOpening[];
  avoidOpenings: TargetOpening[];
  allOpenings: TargetOpening[];
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
  let tipsData: TipsData | null = null;

  try {
    if (activeTab === "openings") {
      const res = await fetch(
        `http://localhost:8080/scout?username=${username}&games=${games}&gameType=${gameType}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      openingsData = data.openings ?? [];
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
            <BlundersStream username={username} games={games} gameType={gameType} />
          )}

          {activeTab === "tips" && (
            <div className="mt-8">
              {!tipsData ? (
                <p className="text-[15px] font-bold text-[#8ba3a5]">
                  Could not load tips — make sure the backend is running.
                </p>
              ) : (
                <>
                  <p className="mb-4 text-[14px] font-extrabold uppercase tracking-[0.08em] text-[#88a4a6]">
                    Openings to play against them
                  </p>
                  {(() => {
                    const toShow =
                      tipsData.targetOpenings.length > 0
                        ? tipsData.targetOpenings
                        : tipsData.allOpenings.slice(0, 5);
                    if (toShow.length === 0) {
                      return (
                        <p className="mb-8 text-[14px] font-bold text-[#5a7275]">
                          Scout more games to surface opening patterns.
                        </p>
                      );
                    }
                    return (
                      <div className="mb-8 overflow-hidden rounded-2xl border border-[#2b4548]">
                        <div className="grid grid-cols-[1.6fr_1fr_1fr_1fr] border-b border-[#2b4548] px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.07em] text-[#8ba3a5]">
                          <span>Opening</span>
                          <span className="text-[#f2a6a0]">Loss %</span>
                          <span>Draw %</span>
                          <span className="text-[#97d8c5]">Win %</span>
                        </div>
                        {toShow.map((op) => (
                          <div
                            key={op.name}
                            className="border-b border-[#203638] bg-[#162b2e] px-4 py-3 last:border-b-0"
                          >
                            <div className="grid grid-cols-[1.6fr_1fr_1fr_1fr] items-center">
                              <span className="text-[14px] font-bold text-[#e5efef]">{op.name}</span>
                              <span className="text-[14px] font-extrabold text-[#f2a6a0]">
                                {op.lossRate.toFixed(0)}%
                              </span>
                              <span className="text-[14px] font-bold text-[#b8c9ca]">
                                {(op.drawRate ?? 0).toFixed(0)}%
                              </span>
                              <span className="text-[14px] font-bold text-[#97d8c5]">
                                {op.winRate.toFixed(0)}%
                              </span>
                            </div>
                            <div className="mt-2 flex h-1 w-full overflow-hidden rounded-full">
                              <div className="bg-[#f2a6a0]" style={{ width: `${op.lossRate}%` }} />
                              <div className="bg-[#4a6568]" style={{ width: `${op.drawRate ?? 0}%` }} />
                              <div className="bg-[#97d8c5]" style={{ width: `${op.winRate}%` }} />
                            </div>
                            <p className="mt-1 text-[11px] font-bold text-[#4f6e71]">
                              {op.games} game{op.games !== 1 ? "s" : ""}
                            </p>
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  {tipsData.avoidOpenings.length > 0 && (
                    <>
                      <p className="mb-4 text-[14px] font-extrabold uppercase tracking-[0.08em] text-[#88a4a6]">
                        Openings to avoid — they dominate here
                      </p>
                      <div className="mb-8 overflow-hidden rounded-2xl border border-[#2b4548]">
                        {tipsData.avoidOpenings.map((op) => (
                          <div
                            key={op.name}
                            className="border-b border-[#203638] bg-[#162b2e] px-5 py-3 last:border-b-0"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-[14px] font-bold text-[#e5efef]">{op.name}</span>
                              <span className="text-[12px] font-extrabold text-[#97d8c5]">
                                {op.winRate.toFixed(0)}% win rate
                              </span>
                            </div>
                            <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-[#1e3436]">
                              <div
                                className="h-full rounded-full bg-[#97d8c5]"
                                style={{ width: `${op.winRate}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  <p className="mb-4 text-[14px] font-extrabold uppercase tracking-[0.08em] text-[#88a4a6]">
                    How to exploit their weaknesses
                  </p>
                  <div className="grid gap-3">
                    {(() => {
                      const phases = tipsData.blundersByPhase ?? [];
                      const hasAny = phases.some(
                        (p) => p.blunders + p.mistakes + p.inaccuracies > 0
                      );
                      if (!hasAny) {
                        return (
                          <article className="rounded-2xl border border-[#2b4548] bg-[#162b2e] px-5 py-4">
                            <p className="text-[14px] font-bold text-[#5a7275]">
                              Steer into the {tipsData.weakestPhase} — engine analysis needed for detailed
                              breakdown. Scout with more games or wait for Lichess analysis to populate.
                            </p>
                          </article>
                        );
                      }
                      const p = phases.find((x) => x.phase === tipsData!.weakestPhase);
                      if (!p) return null;
                      const total = p.blunders + p.mistakes + p.inaccuracies;
                      return (
                        <article className="rounded-2xl border border-[#2b4548] bg-[#162b2e] px-5 py-4">
                          <h2 className="text-[17px] font-extrabold tracking-[-0.02em] text-[#e6f0f0]">
                            Push them into the {tipsData.weakestPhase}
                          </h2>
                          <p className="mt-2 text-[14px] font-bold leading-relaxed text-[#9fb4b6]">
                            {`${p.blunders} blunder${p.blunders !== 1 ? "s" : ""}, ${p.mistakes} mistake${p.mistakes !== 1 ? "s" : ""}, and ${p.inaccuracies} inaccurac${p.inaccuracies !== 1 ? "ies" : "y"} in the ${tipsData.weakestPhase} (${total} total). Steer the game here.`}
                          </p>
                        </article>
                      );
                    })()}

                    {tipsData.avgAccuracy != null && (
                      <article className="rounded-2xl border border-[#2b4548] bg-[#162b2e] px-5 py-4">
                        <h2 className="text-[17px] font-extrabold tracking-[-0.02em] text-[#e6f0f0]">
                          Their average accuracy: {tipsData.avgAccuracy.toFixed(1)}%
                        </h2>
                        <p className="mt-2 text-[14px] font-bold leading-relaxed text-[#9fb4b6]">
                          {tipsData.avgAccuracy < 80
                            ? "They make frequent errors under pressure. Keep positions complex and wait for mistakes."
                            : tipsData.avgAccuracy < 90
                            ? "Reasonably accurate but not immune to errors. Look for tactical shots and complications."
                            : "High accuracy player. Aim for imbalanced, sharp positions to generate winning chances."}
                        </p>
                      </article>
                    )}
                  </div>

                  {tipsData.gamesAnalyzed > 0 && (
                    <p className="mt-5 text-[13px] font-bold text-[#5a7275]">
                      Engine analysis from {tipsData.gamesAnalyzed} of {tipsData.totalGames} games.
                    </p>
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
