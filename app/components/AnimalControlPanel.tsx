"use client";

import { useState, useCallback } from "react";
import type { Animal, AnimalAction } from "../types/animal";
import type { GameManager } from "../lib/game-manager";

interface AnimalControlPanelProps {
  selectedAnimals: Animal[];
  gameManager: GameManager | null;
  onClearSelection: () => void;
}

const AVAILABLE_ACTIONS: AnimalAction[] = [
  "idle",
  "exploring",
  "eating",
  "drinking",
  "sleeping",
  "playing",
  "socializing",
  "working",
  "harvesting",
  "building",
  "go_home",
  "visit_trading_post",
  "visit_hospital",
  "ideation",
  "crafting",
];

export default function AnimalControlPanel({
  selectedAnimals,
  gameManager,
  onClearSelection,
}: AnimalControlPanelProps) {
  const [selectedAction, setSelectedAction] = useState<AnimalAction>("idle");
  const [targetResourceId, setTargetResourceId] = useState("");
  const [targetBuildingId, setTargetBuildingId] = useState("");
  const [targetAnimalId, setTargetAnimalId] = useState("");

  const executeAction = useCallback(async () => {
    if (!gameManager || selectedAnimals.length === 0) return;

    for (const animal of selectedAnimals) {
      const actionParams: any = {
        action: selectedAction,
      };

      // Add target parameters based on action type
      if (
        ["harvesting", "eating", "drinking"].includes(selectedAction) &&
        targetResourceId
      ) {
        actionParams.targetResourceId = targetResourceId;
      }

      if (
        [
          "building",
          "go_home",
          "visit_trading_post",
          "visit_hospital",
        ].includes(selectedAction) &&
        targetBuildingId
      ) {
        actionParams.targetBuildingId = targetBuildingId;
      }

      if (selectedAction === "socializing" && targetAnimalId) {
        actionParams.targetAnimalId = targetAnimalId;
      }

      // Execute the action through the game manager
      // TODO: use executeAnimalAction from healthMonitor
      await gameManager.executeAnimalAction(animal.id, actionParams);
    }
  }, [
    gameManager,
    selectedAnimals,
    selectedAction,
    targetResourceId,
    targetBuildingId,
    targetAnimalId,
  ]);

  if (selectedAnimals.length === 0) {
    return null;
  }

  const worldState = gameManager?.getWorldState();
  const allAnimals = gameManager?.getAllAnimals() || [];

  return (
    <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm p-4 rounded-lg shadow-lg w-80">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-lg">
          Control Animals ({selectedAnimals.length})
        </h3>
        <button
          onClick={onClearSelection}
          className="text-red-600 hover:text-red-800 text-sm"
        >
          Clear Selection
        </button>
      </div>

      {/* Selected Animals List */}
      <div className="mb-4 max-h-32 overflow-y-auto">
        <div className="text-sm text-gray-600 mb-1">Selected:</div>
        {selectedAnimals.map((animal) => (
          <div
            key={animal.id}
            className="text-xs bg-gray-100 rounded px-2 py-1 mb-1"
          >
            {animal.name} - {animal.currentAction}
          </div>
        ))}
      </div>

      {/* Action Selection */}
      <div className="mb-3">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Action:
        </label>
        <select
          value={selectedAction}
          onChange={(e) => setSelectedAction(e.target.value as AnimalAction)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          {AVAILABLE_ACTIONS.map((action) => (
            <option key={action} value={action}>
              {action.charAt(0).toUpperCase() +
                action.slice(1).replace("_", " ")}
            </option>
          ))}
        </select>
      </div>

      {/* Target Resource Selection */}
      {["harvesting", "eating", "drinking"].includes(selectedAction) && (
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Target Resource:
          </label>
          <select
            value={targetResourceId}
            onChange={(e) => setTargetResourceId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="">Select resource...</option>
            {worldState?.resources.map((resource) => (
              <option key={resource.id} value={resource.id}>
                {resource.type} (Qty: {Math.floor(resource.quantity)})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Target Building Selection */}
      {["building", "go_home", "visit_trading_post", "visit_hospital"].includes(
        selectedAction
      ) && (
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Target Building:
          </label>
          <select
            value={targetBuildingId}
            onChange={(e) => setTargetBuildingId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="">Select building...</option>
            {worldState?.buildings.map((building) => (
              <option key={building.id} value={building.id}>
                {building.name} - {building.type}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Target Animal Selection */}
      {selectedAction === "socializing" && (
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Target Animal:
          </label>
          <select
            value={targetAnimalId}
            onChange={(e) => setTargetAnimalId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="">Select animal...</option>
            {allAnimals
              .filter(
                (animal) =>
                  !selectedAnimals.some((selected) => selected.id === animal.id)
              )
              .map((animal) => (
                <option key={animal.id} value={animal.id}>
                  {animal.name} - {animal.currentAction}
                </option>
              ))}
          </select>
        </div>
      )}

      {/* Execute Button */}
      <button
        onClick={executeAction}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md text-sm font-medium"
      >
        Execute Action
      </button>

      {/* Instructions */}
      <div className="mt-3 text-xs text-gray-500">
        • Click animals to select/deselect • Ctrl+Click for multi-select • Click
        ground to move selected animals
      </div>
    </div>
  );
}
