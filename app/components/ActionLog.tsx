"use client";

import { useState, useEffect } from "react";
import type { Animal, ActionResult, AnimalStats } from "../types/animal";

export interface ActionLogEntry {
  id: string;
  timestamp: number;
  animalId: string;
  animalName: string;
  action: string;
  result: ActionResult;
  reasoning?: string;
  healthImplications?: string;
  statsBefore?: AnimalStats;
  statsAfter?: AnimalStats;
}

interface ActionLogProps {
  entries: ActionLogEntry[];
}

function getHealthImplication(
  action: string,
  statsBefore?: AnimalStats,
  statsAfter?: AnimalStats,
  result?: ActionResult
): string {
  if (!statsBefore || !statsAfter) return "No health data available";

  const healthChange = statsAfter.health - statsBefore.health;
  const energyChange = statsAfter.energy - statsBefore.energy;
  const hungerChange = statsAfter.hunger - statsBefore.hunger;
  const thirstChange = statsAfter.thirst - statsBefore.thirst;
  const happinessChange = statsAfter.happiness - statsBefore.happiness;

  const implications = [];

  if (healthChange > 0) implications.push(`+${healthChange} health (improved wellbeing)`);
  else if (healthChange < 0) implications.push(`${healthChange} health (concerning decline)`);

  if (energyChange > 0) implications.push(`+${energyChange} energy (more vitality)`);
  else if (energyChange < 0) implications.push(`${energyChange} energy (fatigue setting in)`);

  if (hungerChange < 0) implications.push(`${Math.abs(hungerChange)} less hunger (nutritional needs met)`);
  else if (hungerChange > 0) implications.push(`+${hungerChange} hunger (growing nutritional deficit)`);

  if (thirstChange < 0) implications.push(`${Math.abs(thirstChange)} less thirst (hydration improved)`);
  else if (thirstChange > 0) implications.push(`+${thirstChange} thirst (dehydration risk)`);

  if (happinessChange > 0) implications.push(`+${happinessChange} happiness (mental wellbeing boost)`);
  else if (happinessChange < 0) implications.push(`${happinessChange} happiness (emotional distress)`);

  if (implications.length === 0) {
    return "No significant health impact";
  }

  return implications.join(", ");
}

function getActionReasoning(action: string, result: ActionResult): string {
  if (!result.success) {
    return `Failed to ${action}: ${result.message}`;
  }

  switch (action) {
    case "eating":
      return result.consumedItem 
        ? `Consumed ${result.consumedItem.name} to address hunger and restore energy`
        : "Attempted to eat but had no food available";
    
    case "drinking":
      return result.consumedItem
        ? `Drank ${result.consumedItem.name} to quench thirst and maintain hydration`
        : "Attempted to drink but had no water available";
    
    case "sleeping":
      return "Rested to recover energy and restore health through natural recuperation";
    
    case "harvesting":
      return result.harvestedItem
        ? `Harvested ${result.harvestedItem.quantity} ${result.harvestedItem.name} to build inventory for future survival needs`
        : "Attempted to harvest resources but was unsuccessful";
    
    case "exploring":
      return "Ventured into unknown territory to discover resources and expand territorial knowledge";
    
    case "playing":
      return "Engaged in playful behavior to boost mental wellbeing and social bonds";
    
    case "socializing":
      return "Interacted with other animals to strengthen social connections and community";
    
    case "working":
      return "Performed productive activities to contribute to survival and gain satisfaction";
    
    case "moving":
      return "Changed location to access better resources or avoid threats";
    
    case "idle":
      return "Conserved energy while observing surroundings and recovering";
    
    default:
      return `Performed ${action} based on current needs and environmental conditions`;
  }
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

function getActionColor(action: string, success: boolean): string {
  if (!success) return "text-red-600";
  
  switch (action) {
    case "eating":
    case "drinking":
      return "text-green-600";
    case "sleeping":
      return "text-blue-600";
    case "harvesting":
      return "text-yellow-600";
    case "exploring":
      return "text-purple-600";
    case "playing":
    case "socializing":
      return "text-pink-600";
    case "working":
      return "text-orange-600";
    default:
      return "text-gray-600";
  }
}

export default function ActionLog({ entries }: ActionLogProps) {
  const [filter, setFilter] = useState<string>("all");

  const filteredEntries = entries.filter(entry => {
    const matchesFilter = filter === "all" || 
      entry.action === filter || 
      (filter === "success" && entry.result.success) ||
      (filter === "failed" && !entry.result.success);

    return matchesFilter;
  }).slice(0, 10); // Show only the 10 most recent entries

  return (
    <div className="fixed bottom-4 right-4 w-80 h-96 bg-white/95 backdrop-blur-sm border border-gray-300 rounded-lg shadow-lg flex flex-col z-40">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-gray-50 rounded-t-lg">
        <h3 className="font-semibold text-gray-900">Recent Actions</h3>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="text-xs px-2 py-1 border rounded"
        >
          <option value="all">All</option>
          <option value="success">Success</option>
          <option value="failed">Failed</option>
          <option value="eating">Eating</option>
          <option value="drinking">Drinking</option>
          <option value="sleeping">Sleeping</option>
          <option value="harvesting">Harvesting</option>
          <option value="exploring">Exploring</option>
        </select>
      </div>

      {/* Log entries */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {filteredEntries.length === 0 ? (
          <div className="text-center text-gray-500 py-4 text-sm">
            No recent actions
          </div>
        ) : (
          filteredEntries.map((entry) => {
            const reasoning = entry.reasoning || getActionReasoning(entry.action, entry.result);
            const healthImplications = entry.healthImplications || 
              getHealthImplication(entry.action, entry.statsBefore, entry.statsAfter, entry.result);

            return (
              <div
                key={entry.id}
                className={`border rounded p-2 text-xs ${
                  entry.result.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
                }`}
              >
                {/* Header row */}
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1">
                    <span className="font-medium text-gray-900">{entry.animalName}</span>
                    <span
                      className={`px-1 py-0.5 rounded text-xs ${getActionColor(
                        entry.action,
                        entry.result.success
                      )} bg-white`}
                    >
                      {entry.action}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(entry.timestamp).toLocaleTimeString().slice(0, 5)}
                  </span>
                </div>

                {/* Message */}
                <div className="text-xs text-gray-700 mb-1 truncate" title={entry.result.message}>
                  {entry.result.message}
                </div>

                {/* Health implications - condensed */}
                <div className="text-xs text-gray-600 truncate" title={healthImplications}>
                  {healthImplications}
                </div>

                {/* Condensed stats if available */}
                {entry.statsBefore && entry.statsAfter && (
                  <div className="flex gap-1 mt-1 text-xs">
                    {(['health', 'energy', 'hunger', 'thirst', 'happiness'] as const).map((stat) => {
                      const before = entry.statsBefore![stat];
                      const after = entry.statsAfter![stat];
                      const change = after - before;
                      if (change === 0) return null;
                      return (
                        <span 
                          key={stat} 
                          className={`px-1 rounded ${change > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                          title={`${stat}: ${before.toFixed(0)} → ${after.toFixed(0)}`}
                        >
                          {stat.charAt(0).toUpperCase()}{change > 0 ? "+" : ""}{change.toFixed(0)}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t bg-gray-50 text-xs text-gray-600 rounded-b-lg">
        {filteredEntries.length} of {entries.length} actions
      </div>
    </div>
  );
}