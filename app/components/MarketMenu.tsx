"use client";

import { useState } from "react";
import type { GameManager } from "../lib/game-manager";
import { BUILDING_ACTIONS, type BuildingType } from "../types/building";
import type { Nation } from "../types/nation";

interface MarketMenuProps {
  gameManager: GameManager | null;
  onStartBuildingPlacement: (buildingType: BuildingType) => void;
  playerNationId: string | null;
  nations: Nation[];
}

interface BuildingCategory {
  id: string;
  label: string;
  buildings: {
    type: BuildingType;
    name: string;
    description: string;
    cost: number;
    requiredQuantity: number;
  }[];
}

const BUILDING_CATEGORIES: BuildingCategory[] = [
  {
    id: "farm",
    label: "Farm",
    buildings: [
      {
        type: "home",
        name: "Home",
        description: "Personal residence for animals",
        cost: 200,
        requiredQuantity:
          BUILDING_ACTIONS.create_home.requiredMaterials.requiredQuantity,
      },
    ],
  },
  {
    id: "manufacturing",
    label: "Manufacturing",
    buildings: [
      {
        type: "factory",
        name: "Factory",
        description: "Mass production facility",
        cost: 500,
        requiredQuantity:
          BUILDING_ACTIONS.create_factory.requiredMaterials.requiredQuantity,
      },
    ],
  },
  {
    id: "defense",
    label: "Defense",
    buildings: [
      {
        type: "settlement",
        name: "Settlement",
        description: "Establishes territory and provides protection",
        cost: 800,
        requiredQuantity:
          BUILDING_ACTIONS.create_settlement.requiredMaterials.requiredQuantity,
      },
    ],
  },
  {
    id: "offense",
    label: "Offense",
    buildings: [
      {
        type: "trading_post",
        name: "Trading Post",
        description: "Commerce hub for resource exchange",
        cost: 400,
        requiredQuantity:
          BUILDING_ACTIONS.create_trading_post.requiredMaterials
            .requiredQuantity,
      },
      {
        type: "hospital",
        name: "Hospital",
        description: "Medical facility for healing",
        cost: 600,
        requiredQuantity:
          BUILDING_ACTIONS.create_hospital.requiredMaterials.requiredQuantity,
      },
    ],
  },
];

export default function MarketMenu({
  gameManager,
  onStartBuildingPlacement,
  playerNationId,
  nations,
}: MarketMenuProps) {
  const [selectedCategory, setSelectedCategory] = useState(
    BUILDING_CATEGORIES[0].id
  );
  const currentCategory = BUILDING_CATEGORIES.find(
    (cat) => cat.id === selectedCategory
  );
  const playerNation = playerNationId
    ? nations.find((n) => n.id === playerNationId)
    : null;

  const handleBuildingPurchase = (buildingType: BuildingType, cost: number) => {
    if (!playerNationId) {
      alert("Please select a nation first!");
      return;
    }

    const playerNation = nations.find((n) => n.id === playerNationId);
    if (!playerNation) {
      alert("Nation not found!");
      return;
    }

    if (playerNation.treasury < cost) {
      alert(
        `Insufficient funds! Need ${cost} coins, but only have ${Math.floor(
          playerNation.treasury
        )} coins.`
      );
      return;
    }

    // TODO: Deduct cost from treasury when building is actually placed
    console.log(`Starting placement for ${buildingType} (costs ${cost} coins)`);

    // Start building placement mode
    onStartBuildingPlacement(buildingType);
  };

  return (
    <div className="w-full max-w-4xl">
      {/* Treasury Display */}
      {playerNation && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-green-800">
              {playerNation.name} Treasury
            </div>
            <div className="text-lg font-bold text-green-600">
              {Math.floor(playerNation.treasury)} 🪙
            </div>
          </div>
        </div>
      )}

      {/* Category Tabs */}
      <div className="mb-4">
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          {BUILDING_CATEGORIES.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedCategory === category.id
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-800 hover:bg-white/50"
              }`}
            >
              {category.label}
            </button>
          ))}
        </div>
      </div>

      {/* Building Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
        {currentCategory?.buildings.map((building) => (
          <div
            key={building.type}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-lg font-semibold text-gray-800">
                {building.name}
              </h3>
              <span className="text-sm text-gray-500">
                {building.requiredQuantity} materials
              </span>
            </div>

            <p className="text-gray-600 text-sm mb-4 line-clamp-2">
              {building.description}
            </p>

            <div className="flex justify-between items-center">
              <span className="text-xl font-bold text-green-600">
                {building.cost} 🪙
              </span>
              <button
                onClick={() =>
                  handleBuildingPurchase(building.type, building.cost)
                }
                disabled={
                  !playerNation || playerNation.treasury < building.cost
                }
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  !playerNation || playerNation.treasury < building.cost
                    ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                {!playerNation
                  ? "Select Nation"
                  : playerNation.treasury < building.cost
                  ? "Insufficient Funds"
                  : "Purchase"}
              </button>
            </div>

            {/* Building Stats Preview */}
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                {building.type === "home" && (
                  <>
                    <div>Capacity: 1</div>
                    <div>Comfort: 70</div>
                  </>
                )}
                {building.type === "factory" && (
                  <>
                    <div>Capacity: 12</div>
                    <div>Production: High</div>
                  </>
                )}
                {building.type === "settlement" && (
                  <>
                    <div>Territory: Yes</div>
                    <div>Defense: High</div>
                  </>
                )}
                {building.type === "trading_post" && (
                  <>
                    <div>Commerce: Yes</div>
                    <div>Capacity: 8</div>
                  </>
                )}
                {building.type === "hospital" && (
                  <>
                    <div>Healing: Yes</div>
                    <div>Capacity: 6</div>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
