'use client'

import type { Animal } from '../types/animal'

interface AnimalInfoProps {
  animal: Animal | null
  onClose: () => void
}

export default function AnimalInfo({ animal, onClose }: AnimalInfoProps) {
  if (!animal) return null
  
  const getLifeStage = () => {
    if (animal.age < 0.15) return 'Baby'
    if (animal.age < 0.35) return 'Young'
    if (animal.age < 0.75) return 'Adult'
    return 'Elder'
  }
  
  const formatTime = (milliseconds: number) => {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60))
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${minutes}m`
  }
  
  const getTimeRemaining = () => {
    const elapsed = Date.now() - animal.birthTime
    const remaining = animal.lifespan - elapsed
    return Math.max(0, remaining)
  }
  
  return (
    <div className="fixed top-4 right-4 bg-white/90 backdrop-blur-sm p-6 rounded-lg shadow-lg max-w-sm">
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
          <span className="font-semibold">Life Stage:</span> {getLifeStage()} ({Math.round(animal.age * 100)}%)
        </div>
        
        <div>
          <span className="font-semibold">Generation:</span> {animal.dna.generation}
        </div>
        
        <div>
          <span className="font-semibold">Current Action:</span> {animal.currentAction}
        </div>
        
        <div>
          <span className="font-semibold">Time Remaining:</span> {formatTime(getTimeRemaining())}
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <div className="font-semibold mb-1">Stats</div>
            <div>Health: {animal.stats.health.toFixed(0)}/100</div>
            <div>Hunger: {animal.stats.hunger.toFixed(0)}/100</div>
            <div>Thirst: {animal.stats.thirst.toFixed(0)}/100</div>
            <div>Energy: {animal.stats.energy.toFixed(0)}/100</div>
            <div>Happiness: {animal.stats.happiness.toFixed(0)}/100</div>
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
        
        {animal.dna.parentIds && (
          <div>
            <span className="font-semibold">Parents:</span> {animal.dna.parentIds.join(', ')}
          </div>
        )}
      </div>
    </div>
  )
}