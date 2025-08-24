"use client";

import type { Nation } from "../types/nation";
import { buildingSystem } from "../lib/building-system";

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

  // Calculate additional statistics
  const allBuildings = buildingSystem.getAllBuildings();
  const totalBuildings = allBuildings.length;
  const totalCapacity = allBuildings.reduce((sum, building) => sum + building.maxOccupants, 0);
  const totalPopulation = nations.reduce((sum, nation) => sum + nation.citizenIds.length, 0);

  return (
    <div className="bg-white/90 backdrop-blur-sm p-3 rounded-lg shadow-lg w-64">
      <h3 className="font-semibold text-sm mb-2">Nation Overview</h3>

      {/* Stats Summary */}
      <div className="text-xs mb-2 pb-2 border-b space-y-1">
        <div className="flex justify-between">
          <span className="text-gray-600">Treasury:</span>
          <span className="text-green-600 font-bold">
            {formatCurrency(totalTreasury)}💰
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Buildings:</span>
          <span className="font-medium">{totalBuildings}🏠</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Capacity:</span>
          <span className="font-medium">{totalCapacity}👥</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Population:</span>
          <span className="font-medium">{totalPopulation}🐾</span>
        </div>
      </div>

      {/* Individual Nations */}
      <div className="space-y-1">
        {nations
          .sort((a, b) => b.treasury - a.treasury) // Sort by treasury amount, descending
          .map((nation, index) => {
            // Calculate nation-specific stats
            const nationBuildings = allBuildings.filter(b => b.nationId === nation.id);
            const nationBuildingCount = nationBuildings.length;
            const nationCapacity = nationBuildings.reduce((sum, b) => sum + b.maxOccupants, 0);
            const nationPopulation = nation.citizenIds.length;
            
            return (
              <div
                key={nation.id}
                className="text-xs"
              >
                {/* Nation header with treasury */}
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-1">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: nation.color.primary }}
                    />
                    <span className="truncate font-medium">{nation.name}</span>
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
                
                {/* Nation stats */}
                <div className="flex justify-between text-gray-600 ml-3">
                  <span>🏠{nationBuildingCount}</span>
                  <span>👥{nationCapacity}</span>
                  <span>🐾{nationPopulation}</span>
                </div>
              </div>
            );
          })}
      </div>

      {/* Legend */}
      <div className="text-xs text-gray-500 mt-2 pt-2 border-t">
        <div>👑 = Richest • (%) = Tax Rate</div>
        <div>🏠 = Buildings • 👥 = Capacity • 🐾 = Population</div>
      </div>
    </div>
  );
}
