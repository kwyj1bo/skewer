"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type GameType = "all" | "rapid" | "blitz" | "bullet";

type FilterControlsProps = {
  platform: "chess.com" | "lichess";
  username: string;
  activeTab: "openings" | "blunders" | "tips";
  games: 10 | 100 | 1000;
  gameType: GameType;
};

function buildScoutHref(
  platform: "chess.com" | "lichess",
  username: string,
  activeTab: "openings" | "blunders" | "tips",
  games: 10 | 100 | 1000,
  gameType: GameType
) {
  const query = new URLSearchParams({
    platform,
    username,
    tab: activeTab,
    games: String(games),
    gameType,
  });

  return `/scout?${query.toString()}`;
}

export default function FilterControls({
  platform,
  username,
  activeTab,
  games,
  gameType,
}: FilterControlsProps) {
  const router = useRouter();
  const [selectedGames, setSelectedGames] = useState<10 | 100 | 1000>(games);
  const [selectedGameType, setSelectedGameType] = useState<GameType>(gameType);

  const applyFilters = (nextGames: 10 | 100 | 1000, nextGameType: GameType) => {
    router.push(buildScoutHref(platform, username, activeTab, nextGames, nextGameType));
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label
        htmlFor="games"
        className="text-[13px] font-extrabold uppercase tracking-[0.07em] text-[#8ba3a5]"
      >
        Past games
      </label>

      <div className="relative">
        <select
          id="games"
          name="games"
          value={String(selectedGames)}
          onChange={(event) => {
            const nextGames =
              event.target.value === "100" ? 100 : event.target.value === "1000" ? 1000 : 10;
            setSelectedGames(nextGames);
            applyFilters(nextGames, selectedGameType);
          }}
          className="h-9 appearance-none rounded-full border border-[#2b4548] bg-[#162b2e] pl-4 pr-10 text-[14px] font-extrabold tracking-[0.01em] text-[#dffaf2] outline-none transition-colors duration-200 focus:border-[#1ce0ad]"
        >
          <option value="10">10</option>
          <option value="100">100</option>
          <option value="1000">1000</option>
        </select>
        <span
          aria-hidden
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-[#8ba3a5]"
        >
          v
        </span>
      </div>

      <label
        htmlFor="gameType"
        className="text-[13px] font-extrabold uppercase tracking-[0.07em] text-[#8ba3a5]"
      >
        Game type
      </label>

      <div className="relative">
        <select
          id="gameType"
          name="gameType"
          value={selectedGameType}
          onChange={(event) => {
            const nextGameType = event.target.value as GameType;
            setSelectedGameType(nextGameType);
            applyFilters(selectedGames, nextGameType);
          }}
          className="h-9 appearance-none rounded-full border border-[#2b4548] bg-[#162b2e] pl-4 pr-10 text-[14px] font-extrabold tracking-[0.01em] text-[#dffaf2] outline-none transition-colors duration-200 focus:border-[#1ce0ad]"
        >
          <option value="all">All</option>
          <option value="rapid">Rapid</option>
          <option value="blitz">Blitz</option>
          <option value="bullet">Bullet</option>
        </select>
        <span
          aria-hidden
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-[#8ba3a5]"
        >
          v
        </span>
      </div>
    </div>
  );
}
