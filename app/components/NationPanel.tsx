"use client";

import { useState } from "react";
import type { Nation } from "../types/nation";
import type { Animal } from "../types/animal";

interface NationPanelProps {
  nations: Nation[];
  animals: Animal[];
  onSetTaxRate?: (nationId: string, rate: number) => void;
  playerNationId?: string | null;
}

export default function NationPanel({
  nations,
  animals,
  onSetTaxRate,
  playerNationId,
}: NationPanelProps) {
  const [selectedNationId, setSelectedNationId] = useState<string | null>(null);
  const [newTaxRate, setNewTaxRate] = useState<number>(10);

  // const selectedNation = selectedNationId
  //   ? nations.find((n) => n.id === selectedNationId)
  //   : null;

  const selectedNation = nations.find((n) => n.id === playerNationId) || null;

  const getCitizensForNation = (nationId: string) => {
    return animals.filter((animal) => animal.nationId === nationId);
  };

  const formatCurrency = (amount: number) => {
    return amount.toFixed(0);
  };

  if (nations.length === 0) {
    return null;
  }

  return (
    <div className="bg-white/90 backdrop-blur-sm p-4 rounded-lg max-w-sm">
      <h3 className="font-semibold text-lg mb-3">Nations</h3>

      {/* Nation selector */}
      {/* <select
        value={selectedNationId || ""}
        onChange={(e) => setSelectedNationId(e.target.value || null)}
        className="w-full p-2 border rounded mb-3 text-sm"
      >
        <option value="">Select a Nation</option>
        {nations.map((nation) => (
          <option key={nation.id} value={nation.id}>
            {nation.name}
          </option>
        ))}
      </select>

      <div className="grid grid-cols-2 gap-2 text-xs mb-3">
        {nations.map((nation) => {
          const citizens = getCitizensForNation(nation.id);
          return (
            <div
              key={nation.id}
              className="p-2 rounded border cursor-pointer hover:bg-gray-100"
              style={{ borderColor: nation.color.primary }}
              onClick={() => setSelectedNationId(nation.id)}
            >
              <div className="font-semibold truncate">{nation.name}</div>
              <div>
                Citizens: {citizens.length}/{nation.maxCitizens}
              </div>
              <div>Treasury: {formatCurrency(nation.treasury)}</div>
              <div>Tax Rate: {nation.taxRate}%</div>
            </div>
          );
        })}
      </div> */}

      {/* Selected nation details */}
      {selectedNation && (
        <div className="border-t pt-3">
          <h4
            className="font-semibold mb-2"
            style={{ color: selectedNation.color.primary }}
          >
            {selectedNation.name}
          </h4>

          <div className="text-sm space-y-1 mb-3">
            <div>
              Citizens: {getCitizensForNation(selectedNation.id).length}/
              {selectedNation.maxCitizens}
            </div>
            <div>Treasury: {formatCurrency(selectedNation.treasury)}</div>
            <div>Settlements: {selectedNation.settlements.length}</div>
            <div>
              Total Taxes Collected:{" "}
              {formatCurrency(selectedNation.stats.totalTaxesCollected)}
            </div>
            <div>
              Avg Citizen Wealth:{" "}
              {formatCurrency(selectedNation.stats.averageCitizenWealth)}
            </div>
          </div>

          {/* Tax rate control */}
          {onSetTaxRate && (
            <div className="border-t pt-2">
              <label className="block text-sm font-medium mb-1">
                Tax Rate: {selectedNation.taxRate}%
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={newTaxRate}
                  onChange={(e) => setNewTaxRate(Number(e.target.value))}
                  className="flex-1 p-1 border rounded text-sm"
                />
                <button
                  onClick={() => {
                    onSetTaxRate(selectedNation.id, newTaxRate);
                    setNewTaxRate(selectedNation.taxRate);
                  }}
                  className="px-2 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                >
                  Set
                </button>
              </div>
            </div>
          )}

          {/* Citizens list */}
          <div className="border-t pt-2 mt-2">
            <h5 className="text-sm font-medium mb-1">Citizens:</h5>
            <div className="max-h-32 overflow-y-auto">
              {getCitizensForNation(selectedNation.id).map((citizen) => (
                <div
                  key={citizen.id}
                  className="text-xs py-1 px-2 hover:bg-gray-100 rounded"
                >
                  {citizen.name} ({citizen.isAlive ? "Alive" : "Dead"})
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
