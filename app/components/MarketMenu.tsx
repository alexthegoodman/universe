"use client";

import { useState } from "react";
import type { GameManager } from "../lib/game-manager";
import { BUILDING_ACTIONS, type BuildingType } from "../types/building";
import type { Nation } from "../types/nation";

interface MarketMenuProps {
  gameManager: GameManager | null;
  onStartBuildingPlacement: (buildingType: BuildingType, cost: number) => void;
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
    id: "residential",
    label: "Residential",
    buildings: [
      {
        type: "home",
        name: "Home",
        description: "Personal residence for animals",
        cost: 500,
        requiredQuantity:
          BUILDING_ACTIONS.create_home.requiredMaterials.requiredQuantity,
      },
      {
        type: "apartment_complex",
        name: "Apartment Complex",
        description: "Multi-unit residential complex",
        cost: 1000,
        requiredQuantity:
          BUILDING_ACTIONS.create_apartment_complex.requiredMaterials
            .requiredQuantity,
      },
    ],
  },
  {
    id: "industrial",
    label: "Industrial",
    buildings: [
      {
        type: "factory",
        name: "Factory",
        description: "Mass production facility",
        cost: 1250,
        requiredQuantity:
          BUILDING_ACTIONS.create_factory.requiredMaterials.requiredQuantity,
      },
      {
        type: "forge",
        name: "Forge",
        description: "Metalworking and tool creation",
        cost: 1225,
        requiredQuantity:
          BUILDING_ACTIONS.create_forge.requiredMaterials.requiredQuantity,
      },
      {
        type: "mill",
        name: "Mill",
        description: "Processing grains and materials",
        cost: 1200,
        requiredQuantity:
          BUILDING_ACTIONS.create_mill.requiredMaterials.requiredQuantity,
      },
      {
        type: "electronics_fab",
        name: "Electronics Fab",
        description: "Advanced electronic manufacturing",
        cost: 1400,
        requiredQuantity:
          BUILDING_ACTIONS.create_electronics_fab.requiredMaterials
            .requiredQuantity,
      },
      {
        type: "mine",
        name: "Mine",
        description: "Extract valuable resources",
        cost: 1275,
        requiredQuantity:
          BUILDING_ACTIONS.create_mine.requiredMaterials.requiredQuantity,
      },
    ],
  },
  {
    id: "commercial",
    label: "Commercial",
    buildings: [
      {
        type: "trading_post",
        name: "Trading Post",
        description: "Commerce hub for resource exchange",
        cost: 800,
        requiredQuantity:
          BUILDING_ACTIONS.create_trading_post.requiredMaterials
            .requiredQuantity,
      },
      {
        type: "brewery",
        name: "Brewery",
        description: "Beverage production and social hub",
        cost: 675,
        requiredQuantity:
          BUILDING_ACTIONS.create_brewery.requiredMaterials.requiredQuantity,
      },
      {
        type: "bank",
        name: "Bank",
        description: "Secure storage for currency",
        cost: 950,
        requiredQuantity:
          BUILDING_ACTIONS.create_bank.requiredMaterials.requiredQuantity,
      },
    ],
  },
  {
    id: "civic",
    label: "Civic",
    buildings: [
      {
        type: "hospital",
        name: "Hospital",
        description: "Medical facility for healing",
        cost: 1300,
        requiredQuantity:
          BUILDING_ACTIONS.create_hospital.requiredMaterials.requiredQuantity,
      },
      {
        type: "library",
        name: "Library",
        description: "Knowledge storage and learning",
        cost: 750,
        requiredQuantity:
          BUILDING_ACTIONS.create_library.requiredMaterials.requiredQuantity,
      },
      {
        type: "lab",
        name: "Laboratory",
        description: "Scientific research facility",
        cost: 925,
        requiredQuantity:
          BUILDING_ACTIONS.create_lab.requiredMaterials.requiredQuantity,
      },
    ],
  },
  {
    id: "cultural",
    label: "Cultural",
    buildings: [
      {
        type: "stadium",
        name: "Stadium",
        description: "Sports and entertainment events",
        cost: 1600,
        requiredQuantity:
          BUILDING_ACTIONS.create_stadium.requiredMaterials.requiredQuantity,
      },
      {
        type: "temple",
        name: "Temple",
        description: "Sacred place for worship",
        cost: 450,
        requiredQuantity:
          BUILDING_ACTIONS.create_temple.requiredMaterials.requiredQuantity,
      },
    ],
  },
  {
    id: "agriculture",
    label: "Agriculture",
    buildings: [
      {
        type: "greenhouse",
        name: "Greenhouse",
        description: "Controlled plant cultivation",
        cost: 400,
        requiredQuantity:
          BUILDING_ACTIONS.create_greenhouse.requiredMaterials.requiredQuantity,
      },
    ],
  },
  {
    id: "military",
    label: "Military",
    buildings: [
      {
        type: "settlement",
        name: "Settlement",
        description: "Establishes territory and provides protection",
        cost: 1500,
        requiredQuantity:
          BUILDING_ACTIONS.create_settlement.requiredMaterials.requiredQuantity,
      },
      {
        type: "armory",
        name: "Armory",
        description: "Weapon storage and training",
        cost: 775,
        requiredQuantity:
          BUILDING_ACTIONS.create_armory.requiredMaterials.requiredQuantity,
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

    console.log(`Starting placement for ${buildingType} (costs ${cost} coins)`);

    // Start building placement mode with cost information
    onStartBuildingPlacement(buildingType, cost);
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
                {building.type === "apartment_complex" && (
                  <>
                    <div>Capacity: 16</div>
                    <div>Comfort: 65</div>
                  </>
                )}
                {building.type === "factory" && (
                  <>
                    <div>Capacity: 12</div>
                    <div>Production: High</div>
                  </>
                )}
                {building.type === "forge" && (
                  <>
                    <div>Capacity: 4</div>
                    <div>Metalwork: Yes</div>
                  </>
                )}
                {building.type === "mill" && (
                  <>
                    <div>Capacity: 6</div>
                    <div>Processing: Yes</div>
                  </>
                )}
                {building.type === "brewery" && (
                  <>
                    <div>Capacity: 10</div>
                    <div>Social: Yes</div>
                  </>
                )}
                {building.type === "electronics_fab" && (
                  <>
                    <div>Capacity: 8</div>
                    <div>Tech: Advanced</div>
                  </>
                )}
                {building.type === "mine" && (
                  <>
                    <div>Capacity: 6</div>
                    <div>Mining: Yes</div>
                  </>
                )}
                {building.type === "trading_post" && (
                  <>
                    <div>Commerce: Yes</div>
                    <div>Capacity: 8</div>
                  </>
                )}
                {building.type === "bank" && (
                  <>
                    <div>Capacity: 8</div>
                    <div>Security: High</div>
                  </>
                )}
                {building.type === "hospital" && (
                  <>
                    <div>Healing: Yes</div>
                    <div>Capacity: 6</div>
                  </>
                )}
                {building.type === "library" && (
                  <>
                    <div>Capacity: 12</div>
                    <div>Learning: Yes</div>
                  </>
                )}
                {building.type === "lab" && (
                  <>
                    <div>Capacity: 6</div>
                    <div>Research: Yes</div>
                  </>
                )}
                {building.type === "stadium" && (
                  <>
                    <div>Capacity: 50</div>
                    <div>Events: Yes</div>
                  </>
                )}
                {building.type === "temple" && (
                  <>
                    <div>Capacity: 20</div>
                    <div>Spiritual: Yes</div>
                  </>
                )}
                {building.type === "greenhouse" && (
                  <>
                    <div>Capacity: 8</div>
                    <div>Growing: Yes</div>
                  </>
                )}
                {building.type === "settlement" && (
                  <>
                    <div>Territory: Yes</div>
                    <div>Defense: High</div>
                  </>
                )}
                {building.type === "armory" && (
                  <>
                    <div>Capacity: 10</div>
                    <div>Training: Yes</div>
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
