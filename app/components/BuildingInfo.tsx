"use client";

import type { Building } from "../types/building";
import { BUILDING_ACTIONS } from "../types/building";
import { buildingSystem } from "../lib/building-system";
import { CurrencySystem } from "../lib/currency-system";
import { nationSystem } from "../lib/nation-system";
import { useState } from "react";

interface BuildingInfoProps {
  building: Building | null;
  onClose: () => void;
  onUpgrade?: (buildingId: string, amount: number) => void;
}

export default function BuildingInfo({
  building,
  onClose,
  onUpgrade,
}: BuildingInfoProps) {
  if (!building) return null;

  const [upgradeAmount, setUpgradeAmount] = useState<number>(100);

  const formatTime = (milliseconds: number) => {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;

    if (days > 0) {
      return `${days}d ${remainingHours}h ${minutes}m`;
    }
    return `${hours}h ${minutes}m`;
  };

  const getAge = () => {
    return Date.now() - building.createdAt;
  };

  const getOwnerNation = () => {
    if (!building.nationId) return null;
    return nationSystem.getNation(building.nationId);
  };

  const nation = getOwnerNation();
  const nationStats = nation ? nationSystem.getNationStats(nation.id) : null;
  const nationTreasury = nationStats ? nationStats.treasury : 0;
  const canAffordUpgrade = nationTreasury
    ? nationTreasury >= upgradeAmount
    : false;

  const handleUpgrade = () => {
    if (onUpgrade && canAffordUpgrade) {
      onUpgrade(building.id, upgradeAmount);
    }
  };

  const upgradeAction = BUILDING_ACTIONS.purchase_upgrade;
  const area =
    building.dimensions.width *
    building.dimensions.height *
    building.dimensions.depth;

  return (
    <div className="max-h-[500px] overflow-y-scroll fixed top-4 right-4 bg-white/90 backdrop-blur-sm p-6 rounded-lg shadow-lg max-w-sm z-40">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-bold">{building.name}</h3>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 text-xl"
        >
          ×
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <span className="font-semibold">Type:</span>{" "}
          {building.type
            .replace(/_/g, " ")
            .replace(/\b\w/g, (l) => l.toUpperCase())}
        </div>

        <div>
          <span className="font-semibold">Age:</span> {formatTime(getAge())}
        </div>

        {nation && (
          <div>
            <span className="font-semibold">Owner Nation:</span> {nation.name}
            <div className="text-sm text-gray-600">
              Treasury: ✨{CurrencySystem.formatCurrency(nationTreasury)}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <div className="font-semibold mb-1">Dimensions</div>
            <div>Width: {building.dimensions.width}</div>
            <div>Height: {building.dimensions.height}</div>
            <div>Depth: {building.dimensions.depth}</div>
            <div className="text-gray-600">Area: {area}</div>
          </div>

          <div>
            <div className="font-semibold mb-1">Stats</div>
            <div>Durability: {building.stats.durability}/100</div>
            <div>Beauty: {building.stats.beauty}/100</div>
            <div>Comfort: {building.stats.comfort}/100</div>
            <div>Capacity: {building.stats.capacity}</div>
          </div>
        </div>

        <div>
          <div className="font-semibold mb-1">Occupancy</div>
          <div className="text-sm">
            Current: {building.currentOccupants.length}/{building.maxOccupants}
            {building.currentOccupants.length > 0 && (
              <div className="text-xs text-gray-500 mt-1">
                Occupants: {building.currentOccupants.join(", ")}
              </div>
            )}
          </div>
        </div>

        {building.features && building.features.length > 0 && (
          <div>
            <div className="font-semibold mb-1">Features</div>
            <div className="text-sm">
              {building.features.map((feature) => (
                <span
                  key={feature}
                  className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mr-1 mb-1"
                >
                  {feature}
                </span>
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="font-semibold mb-1">Materials Used</div>
          <div className="text-sm max-h-24 overflow-y-auto">
            {Object.keys(building.materials).length === 0 ? (
              <div className="text-gray-500 italic">No materials recorded</div>
            ) : (
              <div className="space-y-1">
                {Object.entries(building.materials).map(
                  ([material, quantity]) => (
                    <div
                      key={material}
                      className="flex justify-between items-center p-1 bg-gray-100 rounded text-xs"
                    >
                      <span className="capitalize">
                        {material.replace(/_/g, " ")}
                      </span>
                      <span className="text-gray-600">×{quantity}</span>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </div>

        {/* Upgrade Section */}
        {nation && (
          <div className="border-t pt-3">
            <div className="font-semibold mb-2">Purchase Upgrades</div>
            <div className="text-sm text-gray-600 mb-3">
              {upgradeAction.description}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Amount:</label>
                <input
                  type="number"
                  min="100"
                  step="50"
                  value={upgradeAmount}
                  onChange={(e) =>
                    setUpgradeAmount(
                      Math.max(100, parseInt(e.target.value) || 100)
                    )
                  }
                  className="flex-1 px-2 py-1 text-sm border rounded"
                />
              </div>

              <div className="text-xs text-gray-600">
                <div>Base cost: ✨{CurrencySystem.formatCurrency(100)}</div>
                <div>
                  Every ✨{CurrencySystem.formatCurrency(250)} = 1x effect
                  multiplier
                </div>
                <div>Current multiplier: {Math.ceil(upgradeAmount / 250)}x</div>
              </div>

              <div className="text-xs bg-blue-50 p-2 rounded">
                <div className="font-semibold mb-1">
                  Upgrade Effects (per multiplier):
                </div>
                <div>• Size: +1 width, +1 height, +1 depth</div>
                <div>• Beauty: +10</div>
                <div>• Comfort: +5</div>
                <div>• Durability: +5</div>
                <div>• Capacity: +1</div>
              </div>

              <button
                onClick={handleUpgrade}
                disabled={!canAffordUpgrade || !onUpgrade}
                className={`w-full py-2 px-4 rounded text-sm font-medium ${
                  canAffordUpgrade && onUpgrade
                    ? "bg-green-500 text-white hover:bg-green-600"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
              >
                {canAffordUpgrade
                  ? `Purchase Upgrade (✨${CurrencySystem.formatCurrency(
                      upgradeAmount
                    )})`
                  : `Insufficient Funds (need ✨${CurrencySystem.formatCurrency(
                      upgradeAmount
                    )})`}
              </button>
            </div>
          </div>
        )}

        <div className="text-xs text-gray-500 border-t pt-2">
          <div>Created: {new Date(building.createdAt).toLocaleString()}</div>
          <div>
            Last Modified: {new Date(building.lastModifiedAt).toLocaleString()}
          </div>
          <div>Building ID: {building.id}</div>
        </div>
      </div>
    </div>
  );
}
