"use client";

import { useEffect, useState } from "react";
import type { Animal } from "../types/animal";
import { CurrencySystem } from "../lib/currency-system";

interface LeaderboardEntry {
  animal: Animal;
  wealth: number;
  rank: number;
}

interface CurrencyLeaderboardProps {
  animals: Animal[];
  maxEntries?: number;
  showTitle?: boolean;
  compact?: boolean;
  className?: string;
}

export default function CurrencyLeaderboard({
  animals,
  maxEntries = 10,
  showTitle = true,
  compact = false,
  className = "",
}: CurrencyLeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    const entries = CurrencySystem.getLeaderboard(animals).slice(0, maxEntries);
    setLeaderboard(entries);
  }, [animals, maxEntries]);

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "text-yellow-400"; // Gold
      case 2:
        return "text-gray-300"; // Silver
      case 3:
        return "text-amber-600"; // Bronze
      default:
        return "text-gray-600";
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return "👑";
      case 2:
        return "🥈";
      case 3:
        return "🥉";
      default:
        return `#${rank}`;
    }
  };

  if (leaderboard.length === 0) {
    return null;
  }

  return (
    <div className={`bg-gray-800 rounded-lg p-4 ${className}`}>
      {showTitle && (
        <h3 className="text-lg font-bold text-white mb-3 flex items-center">
          💰 Wealth Leaderboard
        </h3>
      )}
      
      <div className="space-y-2">
        {leaderboard.map((entry) => (
          <div
            key={entry.animal.id}
            className={`flex items-center justify-between p-2 rounded-md ${
              entry.rank <= 3 ? "bg-gray-700" : "bg-gray-750"
            } ${compact ? "py-1" : "py-2"}`}
          >
            <div className="flex items-center space-x-3">
              <span
                className={`font-bold ${getRankColor(
                  entry.rank
                )} ${compact ? "text-sm" : "text-base"}`}
              >
                {getRankIcon(entry.rank)}
              </span>
              
              <div className="flex items-center space-x-2">
                <span
                  className="w-3 h-3 rounded-full border-2"
                  style={{
                    backgroundColor: entry.animal.dna.color.primary,
                    borderColor: entry.animal.dna.color.secondary,
                  }}
                />
                <span
                  className={`text-white font-medium ${
                    compact ? "text-sm" : "text-base"
                  }`}
                >
                  {entry.animal.name}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span
                className={`text-green-400 font-bold ${
                  compact ? "text-sm" : "text-base"
                }`}
              >
                ✨{CurrencySystem.formatCurrency(entry.wealth)}
              </span>
              
              {!compact && (
                <div className="text-xs text-gray-400">
                  {entry.animal.inventory.items.length} items
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {!compact && leaderboard.length === 0 && (
        <div className="text-gray-400 text-center py-4">
          No animals with wealth yet
        </div>
      )}
    </div>
  );
}

// Compact version for quick display
export function CompactLeaderboard({
  animals,
  maxEntries = 5,
  className = "",
}: {
  animals: Animal[];
  maxEntries?: number;
  className?: string;
}) {
  return (
    <CurrencyLeaderboard
      animals={animals}
      maxEntries={maxEntries}
      showTitle={false}
      compact={true}
      className={className}
    />
  );
}

// Top 3 podium style display
export function LeaderboardPodium({
  animals,
  className = "",
}: {
  animals: Animal[];
  className?: string;
}) {
  const [top3, setTop3] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    const entries = CurrencySystem.getLeaderboard(animals).slice(0, 3);
    setTop3(entries);
  }, [animals]);

  if (top3.length === 0) {
    return null;
  }

  return (
    <div className={`bg-gray-800 rounded-lg p-4 ${className}`}>
      <h3 className="text-lg font-bold text-white mb-4 text-center">
        🏆 Top Wealthy Animals
      </h3>
      
      <div className="flex items-end justify-center space-x-4">
        {/* Second place */}
        {top3[1] && (
          <div className="text-center">
            <div className="bg-gray-600 rounded-lg p-3 mb-2 h-16 flex items-end">
              <div className="text-center w-full">
                <div className="text-2xl">🥈</div>
                <div className="text-white font-bold text-sm">
                  {top3[1].animal.name}
                </div>
                <div className="text-green-400 text-xs">
                  ✨{CurrencySystem.formatCurrency(top3[1].wealth)}
                </div>
              </div>
            </div>
            <div className="text-gray-400 text-xs">#2</div>
          </div>
        )}

        {/* First place */}
        {top3[0] && (
          <div className="text-center">
            <div className="bg-yellow-600 rounded-lg p-3 mb-2 h-20 flex items-end">
              <div className="text-center w-full">
                <div className="text-3xl">👑</div>
                <div className="text-white font-bold">
                  {top3[0].animal.name}
                </div>
                <div className="text-green-400 text-sm">
                  ✨{CurrencySystem.formatCurrency(top3[0].wealth)}
                </div>
              </div>
            </div>
            <div className="text-yellow-400 font-bold">#1</div>
          </div>
        )}

        {/* Third place */}
        {top3[2] && (
          <div className="text-center">
            <div className="bg-amber-700 rounded-lg p-3 mb-2 h-12 flex items-end">
              <div className="text-center w-full">
                <div className="text-xl">🥉</div>
                <div className="text-white font-bold text-sm">
                  {top3[2].animal.name}
                </div>
                <div className="text-green-400 text-xs">
                  ✨{CurrencySystem.formatCurrency(top3[2].wealth)}
                </div>
              </div>
            </div>
            <div className="text-amber-600 text-xs">#3</div>
          </div>
        )}
      </div>
    </div>
  );
}