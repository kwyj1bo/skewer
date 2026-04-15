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

type BlunderRow = {
  pattern: string;
  detail: string;
  frequency: number;
  scoreSwing: number;
};

type TipRow = {
  title: string;
  plan: string;
  bestAgainst: string;
};

const openingsData: OpeningRow[] = [
  { opening: "Sicilian Defense", lossRate: 48, drawRate: 22, winRate: 30, games: 24 },
  { opening: "French Defense", lossRate: 44, drawRate: 27, winRate: 29, games: 17 },
  { opening: "Caro-Kann Defense", lossRate: 44, drawRate: 24, winRate: 32, games: 16 },
  { opening: "Ruy Lopez", lossRate: 37, drawRate: 29, winRate: 34, games: 14 },
  { opening: "Queen's Gambit Declined", lossRate: 32, drawRate: 31, winRate: 37, games: 11 },
];

const blundersData: BlunderRow[] = [
  {
    pattern: "Bishop gets boxed in",
    detail: "Locks dark-square bishop behind pawns after ...e6 and ...d5 without a freeing break.",
    frequency: 19,
    scoreSwing: 1.8,
  },
  {
    pattern: "Early knight flank jump",
    detail: "Plays ...Nh5 ideas too soon, dropping central control and tactical defense.",
    frequency: 14,
    scoreSwing: 1.4,
  },
  {
    pattern: "Same inaccuracy: premature pawn push",
    detail: "Repeats ...g5 expansion before king safety is secured.",
    frequency: 12,
    scoreSwing: 1.2,
  },
  {
    pattern: "Missed recapture sequence",
    detail: "Chooses quiet recapture instead of tactical recapture in open center positions.",
    frequency: 9,
    scoreSwing: 1.0,
  },
];

const tipsData: TipRow[] = [
  {
    title: "Keep pressure on trapped bishop setups",
    plan: "Fix pawns on dark squares, then open files before they can reroute the bishop.",
    bestAgainst: "Bishop gets boxed in",
  },
  {
    title: "Punish early wing knight jumps",
    plan: "Claim central space and prepare tactical shots on weak kingside squares.",
    bestAgainst: "Early knight flank jump",
  },
  {
    title: "Invite overextension, then break center",
    plan: "If they push flank pawns early, strike with central pawn breaks immediately.",
    bestAgainst: "Premature pawn push",
  },
];

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
  const sortedOpenings = [...openingsData].sort((a, b) => {
    if (b.lossRate !== a.lossRate) {
      return b.lossRate - a.lossRate;
    }

    if (b.drawRate !== a.drawRate) {
      return b.drawRate - a.drawRate;
    }

    return b.winRate - a.winRate;
  });

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
              className={`inline-flex h-11 items-center justify-center rounded-full px-6 text-[17px] font-extrabold tracking-[-0.02em] transition-colors duration-200 ${
                activeTab === "openings"
                  ? "bg-[#1dd5a0] text-[#07272e]"
                  : "border border-[#2b4548] text-[#b6c6c7] hover:border-[#3e6367] hover:text-[#e5eded]"
              }`}
            >
              Openings
            </Link>

            <Link
              href={buildTabHref("blunders", platform, username, games, gameType)}
              className={`inline-flex h-11 items-center justify-center rounded-full px-6 text-[17px] font-extrabold tracking-[-0.02em] transition-colors duration-200 ${
                activeTab === "blunders"
                  ? "bg-[#1dd5a0] text-[#07272e]"
                  : "border border-[#2b4548] text-[#b6c6c7] hover:border-[#3e6367] hover:text-[#e5eded]"
              }`}
            >
              Blunders
            </Link>

            <Link
              href={buildTabHref("tips", platform, username, games, gameType)}
              className={`inline-flex h-11 items-center justify-center rounded-full px-6 text-[17px] font-extrabold tracking-[-0.02em] transition-colors duration-200 ${
                activeTab === "tips"
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
                {sortedOpenings.map((row) => (
                  <div
                    key={row.opening}
                    className="grid grid-cols-[1.4fr_repeat(4,minmax(0,1fr))] gap-3 border-b border-[#203638] px-4 py-4 text-[14px] font-bold tracking-[-0.01em] text-[#b8c9ca] last:border-b-0 md:px-5"
                  >
                    <span className="text-[#e5efef]">{row.opening}</span>
                    <span className="text-[#f2a6a0]">{row.lossRate}%</span>
                    <span>{row.drawRate}%</span>
                    <span className="text-[#97d8c5]">{row.winRate}%</span>
                    <span>{row.games}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "blunders" && (
            <div className="mt-8 grid gap-4">
              {blundersData.map((row) => (
                <article
                  key={row.pattern}
                  className="rounded-2xl border border-[#2b4548] bg-[#162b2e] px-5 py-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h2 className="text-[20px] font-extrabold tracking-[-0.02em] text-[#e6f0f0]">
                      {row.pattern}
                    </h2>
                    <span className="inline-flex h-8 items-center rounded-full border border-[#34565a] px-3 text-[12px] font-extrabold uppercase tracking-[0.07em] text-[#9db6b8]">
                      {row.frequency} occurrences
                    </span>
                  </div>

                  <p className="mt-2 text-[15px] font-bold leading-relaxed tracking-[-0.01em] text-[#9fb4b6]">
                    {row.detail}
                  </p>

                  <p className="mt-3 text-[14px] font-extrabold uppercase tracking-[0.07em] text-[#88a4a6]">
                    Avg. eval swing: <span className="text-[#dffaf2]">-{row.scoreSwing.toFixed(1)}</span>
                  </p>
                </article>
              ))}
            </div>
          )}

          {activeTab === "tips" && (
            <div className="mt-8 grid gap-4">
              {tipsData.map((row) => (
                <article
                  key={row.title}
                  className="rounded-2xl border border-[#2b4548] bg-[#162b2e] px-5 py-4"
                >
                  <h2 className="text-[20px] font-extrabold tracking-[-0.02em] text-[#e6f0f0]">
                    {row.title}
                  </h2>

                  <p className="mt-2 text-[15px] font-bold leading-relaxed tracking-[-0.01em] text-[#9fb4b6]">
                    {row.plan}
                  </p>

                  <p className="mt-3 text-[14px] font-extrabold uppercase tracking-[0.07em] text-[#88a4a6]">
                    Best against: <span className="text-[#dffaf2]">{row.bestAgainst}</span>
                  </p>
                </article>
              ))}
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
