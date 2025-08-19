"use client";

import type { Animal, SpecialMemory } from "../types/animal";
import { animalStateManager } from "../lib/animal-state-manager";
import { CurrencySystem } from "../lib/currency-system";
import { skillSystem } from "../lib/skill-system";
import { useState } from "react";

interface AnimalInfoProps {
  animal: Animal | null;
  onClose: () => void;
}

interface StatWithControlsProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
}

function StatWithControls({ label, value, onChange }: StatWithControlsProps) {
  const [editMode, setEditMode] = useState(false);
  const [inputValue, setInputValue] = useState(value.toString());

  const handleSubmit = () => {
    const newValue = Math.max(0, Math.min(100, parseFloat(inputValue) || 0));
    onChange(newValue);
    setEditMode(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmit();
    } else if (e.key === "Escape") {
      setInputValue(value.toString());
      setEditMode(false);
    }
  };

  if (editMode) {
    return (
      <div className="flex items-center justify-between">
        <span>{label}:</span>
        <input
          type="number"
          min="0"
          max="100"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={handleSubmit}
          onKeyDown={handleKeyDown}
          className="w-16 px-1 py-0.5 text-xs border rounded"
          autoFocus
        />
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-between cursor-pointer hover:bg-gray-100 px-1 rounded"
      onClick={() => {
        setInputValue(value.toString());
        setEditMode(true);
      }}
    >
      <span>{label}:</span>
      <span>{value.toFixed(0)}/100</span>
    </div>
  );
}

export default function AnimalInfo({ animal, onClose }: AnimalInfoProps) {
  if (!animal) return null;

  const [newMemoryText, setNewMemoryText] = useState("");
  const [showAddMemory, setShowAddMemory] = useState(false);

  const updateStat = (statName: keyof Animal["stats"], value: number) => {
    const clampedValue = Math.max(0, Math.min(100, value));
    animalStateManager.updateStats(
      animal.id,
      { [statName]: clampedValue },
      "manual-adjustment"
    );
  };

  const addSpecialMemory = () => {
    if (!newMemoryText.trim()) return;

    const newMemory: SpecialMemory = {
      id: `memory-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content: newMemoryText.trim(),
      createdAt: Date.now(),
    };

    const currentMemories = animal.specialMemories || [];
    const updatedMemories = [...currentMemories, newMemory];

    animalStateManager.updateSpecialMemories(
      animal.id,
      updatedMemories,
      "player-add-memory"
    );
    setNewMemoryText("");
    setShowAddMemory(false);
  };

  const deleteSpecialMemory = (memoryId: string) => {
    const currentMemories = animal.specialMemories || [];
    const updatedMemories = currentMemories.filter(
      (memory) => memory.id !== memoryId
    );

    animalStateManager.updateSpecialMemories(
      animal.id,
      updatedMemories.length > 0 ? updatedMemories : undefined,
      "player-delete-memory"
    );
  };

  const getLifeStage = () => {
    if (animal.age < 0.15) return "Baby";
    if (animal.age < 0.35) return "Young";
    if (animal.age < 0.75) return "Adult";
    return "Elder";
  };

  const formatTime = (milliseconds: number) => {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const getTimeRemaining = () => {
    const elapsed = Date.now() - animal.birthTime;
    const remaining = animal.lifespan - elapsed;
    return Math.max(0, remaining);
  };

  return (
    <div className="max-h-[400px] overflow-y-scroll fixed top-4 right-4 bg-white/90 backdrop-blur-sm p-6 rounded-lg shadow-lg max-w-sm z-40">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-bold">{animal.name}</h3>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 text-xl"
        >
          ×
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <span className="font-semibold">Life Stage:</span> {getLifeStage()} (
          {Math.round(animal.age * 100)}%)
        </div>

        <div>
          <span className="font-semibold">Generation:</span>{" "}
          {animal.dna.generation}
        </div>

        <div>
          <span className="font-semibold">Wealth:</span> ✨
          {CurrencySystem.formatCurrency(
            CurrencySystem.calculateAnimalWealth(animal)
          )}
        </div>

        <div>
          <span className="font-semibold">Current Action:</span>{" "}
          {animal.currentAction}
        </div>

        <div>
          <span className="font-semibold">Time Remaining:</span>{" "}
          {formatTime(getTimeRemaining())}
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <div className="font-semibold mb-1">Stats</div>
            <StatWithControls
              label="Health"
              value={animal.stats.health}
              onChange={(value) => updateStat("health", value)}
            />
            <StatWithControls
              label="Hunger"
              value={animal.stats.hunger}
              onChange={(value) => updateStat("hunger", value)}
            />
            <StatWithControls
              label="Thirst"
              value={animal.stats.thirst}
              onChange={(value) => updateStat("thirst", value)}
            />
            <StatWithControls
              label="Energy"
              value={animal.stats.energy}
              onChange={(value) => updateStat("energy", value)}
            />
            <StatWithControls
              label="Happiness"
              value={animal.stats.happiness}
              onChange={(value) => updateStat("happiness", value)}
            />
          </div>

          <div>
            <div className="font-semibold mb-1">Traits</div>
            <div>Intelligence: {animal.dna.intelligence}</div>
            <div>Agility: {animal.dna.agility}</div>
            <div>Strength: {animal.dna.strength}</div>
            <div>Social: {animal.dna.social}</div>
            <div>Curiosity: {animal.dna.curiosity}</div>
            <div>Resilience: {animal.dna.resilience}</div>
          </div>
        </div>

        <div>
          <div className="font-semibold mb-1">Personality</div>
          <div className="text-sm grid grid-cols-2 gap-1">
            <div>Aggressive: {animal.dna.personality.aggressive}</div>
            <div>Playful: {animal.dna.personality.playful}</div>
            <div>Cautious: {animal.dna.personality.cautious}</div>
            <div>Nurturing: {animal.dna.personality.nurturing}</div>
          </div>
        </div>

        <div>
          <div className="font-semibold mb-1">Skills & Technology</div>
          {animal.skills && Object.keys(animal.skills).length > 0 ? (
            <div className="text-sm max-h-32 overflow-y-auto">
              <div className="space-y-1">
                {Object.entries(animal.skills)
                  .filter(([_, level]) => level > 0)
                  .sort(([_, a], [__, b]) => b - a)
                  .map(([skillName, level]) => {
                    const xp = animal.experience?.[skillName] || 0;
                    const nextLevelXP = skillSystem.calculateXPForLevel(level + 1);
                    const currentLevelXP = skillSystem.calculateXPForLevel(level);
                    const progressXP = xp - currentLevelXP;
                    const neededXP = nextLevelXP - currentLevelXP;
                    const progress = level >= 100 ? 100 : (progressXP / neededXP) * 100;
                    
                    return (
                      <div key={skillName} className="p-1 bg-blue-50 rounded text-xs">
                        <div className="flex justify-between items-center">
                          <span className="capitalize font-medium">{skillName.replace(/([A-Z])/g, ' $1').trim()}</span>
                          <span className="text-blue-600 font-bold">Lv.{level}</span>
                        </div>
                        {level < 100 && (
                          <div className="mt-1">
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div 
                                className="bg-blue-600 h-1.5 rounded-full transition-all duration-300" 
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {Math.round(progressXP)}/{Math.round(neededXP)} XP
                            </div>
                          </div>
                        )}
                        {level >= 100 && (
                          <div className="text-xs text-green-600 font-bold">MASTERED</div>
                        )}
                      </div>
                    );
                  })}
              </div>
              
              {animal.unlockedAdvancedPaths && animal.unlockedAdvancedPaths.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <div className="text-xs font-semibold text-purple-600 mb-1">Advanced Paths:</div>
                  <div className="space-y-1">
                    {animal.unlockedAdvancedPaths.map((pathName) => (
                      <div key={pathName} className="p-1 bg-purple-50 rounded text-xs text-purple-700 border border-purple-200">
                        ⭐ {pathName}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-600">
                Total Skills: {Object.keys(animal.skills).filter(skill => animal.skills[skill] > 0).length}
                {animal.unlockedAdvancedPaths && animal.unlockedAdvancedPaths.length > 0 && (
                  <span> • Advanced Paths: {animal.unlockedAdvancedPaths.length}</span>
                )}
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-500 italic">
              No skills learned yet. Skills are gained through actions like harvesting, crafting, and exploring.
            </div>
          )}
        </div>

        <div>
          <div className="font-semibold mb-1">Colors</div>
          <div className="flex gap-2">
            <div
              className="w-6 h-6 rounded border"
              style={{ backgroundColor: animal.dna.color.primary }}
              title="Primary"
            />
            <div
              className="w-6 h-6 rounded border"
              style={{ backgroundColor: animal.dna.color.secondary }}
              title="Secondary"
            />
          </div>
        </div>

        <div>
          <div className="font-semibold mb-1">
            Inventory ({animal.inventory.currentWeight}/
            {animal.inventory.maxCapacity})
          </div>
          <div className="text-sm max-h-24 overflow-y-auto">
            {animal.inventory.items.length === 0 ? (
              <div className="text-gray-500 italic">Empty</div>
            ) : (
              <div className="space-y-1">
                {animal.inventory.items.map((item, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center p-1 bg-gray-100 rounded text-xs"
                  >
                    <span className="capitalize">{item.name}</span>
                    <span className="text-gray-500 text-xs">
                      (ID: {item.id})
                    </span>
                    <div className="flex gap-2 text-gray-600">
                      <span>×{item.quantity}</span>
                      <span>Q{item.quality}</span>
                      <span className="text-green-600">
                        ✨
                        {CurrencySystem.formatCurrency(
                          CurrencySystem.calculateItemValue(item)
                        )}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold">Special Memories</span>
            <button
              onClick={() => setShowAddMemory(!showAddMemory)}
              className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
            >
              {showAddMemory ? "Cancel" : "Add"}
            </button>
          </div>

          {showAddMemory && (
            <div className="mb-2 p-2 bg-gray-50 rounded">
              <textarea
                value={newMemoryText}
                onChange={(e) => setNewMemoryText(e.target.value)}
                placeholder="Add a special memory, idea, or thought about this animal..."
                className="w-full text-xs p-2 border rounded resize-none"
                rows={2}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.ctrlKey) {
                    addSpecialMemory();
                  }
                }}
              />
              <div className="flex gap-2 mt-1">
                <button
                  onClick={addSpecialMemory}
                  disabled={!newMemoryText.trim()}
                  className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600 disabled:bg-gray-300"
                >
                  Save
                </button>
                <span className="text-xs text-gray-500 self-center">
                  Ctrl+Enter to save
                </span>
              </div>
            </div>
          )}

          <div className="text-sm max-h-32 overflow-y-auto">
            {!animal.specialMemories || animal.specialMemories.length === 0 ? (
              <div className="text-gray-500 italic text-xs">
                No special memories yet
              </div>
            ) : (
              <div className="space-y-2">
                {animal.specialMemories.map((memory) => (
                  <div
                    key={memory.id}
                    className="p-2 bg-yellow-50 rounded text-xs border-l-2 border-yellow-400"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-gray-500 text-xs">
                        {new Date(memory.createdAt).toLocaleDateString()}
                      </span>
                      <button
                        onClick={() => deleteSpecialMemory(memory.id)}
                        className="text-red-500 hover:text-red-700 text-xs"
                        title="Delete memory"
                      >
                        ×
                      </button>
                    </div>
                    <div className="text-gray-800">{memory.content}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {animal.dna.parentIds && (
          <div>
            <span className="font-semibold">Parents:</span>{" "}
            {animal.dna.parentIds.join(", ")}
          </div>
        )}
      </div>
    </div>
  );
}
