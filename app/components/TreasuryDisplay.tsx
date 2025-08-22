"use client";

import type { Nation } from "../types/nation";

interface TreasuryDisplayProps {
  nations: Nation[];
}

export default function TreasuryDisplay({ nations }: TreasuryDisplayProps) {
  if (nations.length === 0) {
    return null;
  }

  const formatCurrency = (amount: number) => {
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}k`;
    }
    return Math.floor(amount).toString();
  };

  const totalTreasury = nations.reduce(
    (sum, nation) => sum + nation.treasury,
    0
  );

  return (
    <div className="bg-white/90 backdrop-blur-sm p-3 rounded-lg shadow-lg w-64">
      <h3 className="font-semibold text-sm mb-2">Nation Treasuries</h3>

      {/* Total */}
      <div className="text-xs mb-2 pb-2 border-b">
        <span className="font-medium">Total Across All Nations: </span>
        <span className="text-green-600 font-bold">
          {formatCurrency(totalTreasury)}💰
        </span>
      </div>

      {/* Individual Nations */}
      <div className="space-y-1">
        {nations
          .sort((a, b) => b.treasury - a.treasury) // Sort by treasury amount, descending
          .map((nation, index) => (
            <div
              key={nation.id}
              className="flex justify-between items-center text-xs"
            >
              <div className="flex items-center gap-1">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: nation.color.primary }}
                />
                <span className="truncate">{nation.name}</span>
                {index === 0 && nation.treasury > 0 && (
                  <span className="text-yellow-500">👑</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <span className="font-mono text-green-600">
                  {formatCurrency(nation.treasury)}💰
                </span>
                <span className="text-gray-500">({nation.taxRate}%)</span>
              </div>
            </div>
          ))}
      </div>

      {/* Legend */}
      <div className="text-xs text-gray-500 mt-2 pt-2 border-t">
        <div>👑 = Richest Nation</div>
        <div>(%) = Tax Rate</div>
      </div>
    </div>
  );
}
