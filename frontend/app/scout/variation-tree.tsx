"use client";

import { useEffect, useState } from "react";

type VariationMove = {
  move: string;
  eval: number;
  mate?: number;
  nextFen: string;
};

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
const MAX_DEPTH = 4;

function evalLabel(ev: number, mate?: number | null): string {
  if (mate != null) return `#${mate}`;
  return (ev >= 0 ? "+" : "") + ev.toFixed(1);
}

function evalColor(ev: number, mate?: number | null): string {
  if (mate != null) return mate > 0 ? "text-[#1ce0ad]" : "text-[#f2a6a0]";
  if (ev > 0.3) return "text-[#1ce0ad]";
  if (ev < -0.3) return "text-[#f2a6a0]";
  return "text-[#88a4a6]";
}

function formatMove(uci: string): string {
  if (uci.length < 4) return uci;
  const promo = uci.length > 4 ? uci.slice(4).toUpperCase() : "";
  return `${uci.slice(0, 2)}–${uci.slice(2, 4)}${promo}`;
}

function TreeNode({
  move,
  eval: ev,
  mate,
  nextFen,
  depth,
}: VariationMove & { depth: number }) {
  const [children, setChildren] = useState<VariationMove[] | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    if (depth >= MAX_DEPTH) return;
    if (expanded) {
      setExpanded(false);
      return;
    }
    if (!children) {
      setLoading(true);
      try {
        const res = await fetch(
          `${BASE_URL}/explore?fen=${encodeURIComponent(nextFen)}&lines=3&depth=10`
        );
        const data = await res.json();
        setChildren(data.moves ?? []);
      } catch {
        setChildren([]);
      }
      setLoading(false);
    }
    setExpanded(true);
  };

  return (
    <div>
      <button
        onClick={toggle}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-[#1e3436]"
      >
        <span className="font-mono text-[13px] font-bold text-[#e6f0f0]">
          {formatMove(move)}
        </span>
        <span className={`text-[12px] font-bold tabular-nums ${evalColor(ev, mate)}`}>
          {evalLabel(ev, mate)}
        </span>
        {depth < MAX_DEPTH && (
          <span className="ml-auto text-[11px] text-[#4f6e71]">
            {loading ? "…" : expanded ? "▾" : "▸"}
          </span>
        )}
      </button>
      {expanded && children && children.length > 0 && (
        <div className="ml-4 border-l border-[#2b4548] pl-2">
          {children.map((c, i) => (
            <TreeNode key={i} {...c} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function VariationTree({ fen }: { fen: string }) {
  const [moves, setMoves] = useState<VariationMove[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMoves(null);
    setLoading(true);
    fetch(`${BASE_URL}/explore?fen=${encodeURIComponent(fen)}&lines=3&depth=12`)
      .then((r) => r.json())
      .then((d) => {
        setMoves(d.moves ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [fen]);

  if (loading) {
    return (
      <p className="px-3 py-2 text-[12px] font-bold text-[#4f6e71]">
        Loading variations…
      </p>
    );
  }
  if (!moves || moves.length === 0) {
    return (
      <p className="px-3 py-2 text-[12px] font-bold text-[#4f6e71]">
        No variations found.
      </p>
    );
  }

  return (
    <div className="mt-2 rounded-xl border border-[#2b4548] bg-[#0f1f21] px-2 py-1">
      {moves.map((m, i) => (
        <TreeNode key={i} {...m} depth={0} />
      ))}
    </div>
  );
}
