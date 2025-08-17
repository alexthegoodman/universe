"use client";

import { useState } from "react";
import type { SpecialMemory } from "../types/animal";
import { animalStateManager } from "../lib/animal-state-manager";

interface SpecialAnnouncementPanelProps {
  isVisible: boolean;
  onClose: () => void;
  totalAnimals: number;
}

export default function SpecialAnnouncementPanel({ 
  isVisible, 
  onClose, 
  totalAnimals 
}: SpecialAnnouncementPanelProps) {
  const [memoryText, setMemoryText] = useState("");
  const [isAnnouncing, setIsAnnouncing] = useState(false);
  const [lastAnnouncementResult, setLastAnnouncementResult] = useState<{
    success: boolean;
    count: number;
  } | null>(null);

  if (!isVisible) return null;

  const announceSpecialMemory = async () => {
    if (!memoryText.trim()) return;
    
    setIsAnnouncing(true);
    setLastAnnouncementResult(null);

    try {
      const newMemory: SpecialMemory = {
        id: `global-memory-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        content: memoryText.trim(),
        createdAt: Date.now()
      };

      const allAnimals = animalStateManager.getAllAnimals();
      let successCount = 0;

      for (const animal of allAnimals) {
        const currentMemories = animal.specialMemories || [];
        const updatedMemories = [...currentMemories, newMemory];
        
        const success = animalStateManager.updateSpecialMemories(
          animal.id, 
          updatedMemories, 
          'global-announcement'
        );
        
        if (success) successCount++;
      }

      setLastAnnouncementResult({
        success: successCount > 0,
        count: successCount
      });

      if (successCount > 0) {
        setMemoryText("");
      }
    } catch (error) {
      console.error('Failed to announce special memory:', error);
      setLastAnnouncementResult({
        success: false,
        count: 0
      });
    } finally {
      setIsAnnouncing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey && !isAnnouncing) {
      announceSpecialMemory();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-purple-700">Special Announcement</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ×
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">
            This will add a Special Memory to all {totalAnimals} animals in the simulation.
          </p>
          <p className="text-xs text-gray-500">
            These memories will influence their AI decision-making and behavior.
          </p>
        </div>

        <div className="mb-4">
          <textarea
            value={memoryText}
            onChange={(e) => setMemoryText(e.target.value)}
            placeholder="Enter a special memory, divine message, or universal experience to share with all animals..."
            className="w-full p-3 border rounded-lg resize-none h-24 text-sm"
            onKeyDown={handleKeyDown}
            disabled={isAnnouncing}
          />
        </div>

        {lastAnnouncementResult && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${
            lastAnnouncementResult.success 
              ? 'bg-green-100 text-green-800 border border-green-200' 
              : 'bg-red-100 text-red-800 border border-red-200'
          }`}>
            {lastAnnouncementResult.success 
              ? `✓ Successfully added memory to ${lastAnnouncementResult.count} animal${lastAnnouncementResult.count === 1 ? '' : 's'}`
              : '✗ Failed to add memory to animals'
            }
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={announceSpecialMemory}
            disabled={!memoryText.trim() || isAnnouncing}
            className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            {isAnnouncing ? 'Announcing...' : 'Announce to All Animals'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm"
          >
            Cancel
          </button>
        </div>

        <div className="mt-3 text-xs text-gray-500">
          Press Ctrl+Enter to announce • Esc to close
        </div>
      </div>
    </div>
  );
}