import type { Animal, AnimalPosition } from '../types/animal';
import type { ExplorationMemory, SightData, ExplorationGoal } from '../types/exploration';
import { v4 as uuidv4 } from 'uuid';

export class ExplorationSystem {
  private memories: Map<string, ExplorationMemory[]> = new Map();
  private explorationGoals: Map<string, ExplorationGoal[]> = new Map();
  
  // Calculate sight radius based on animal traits
  getSightRadius(animal: Animal): number {
    const baseRadius = 5;
    const intelligenceBonus = (animal.dna.intelligence / 100) * 3;
    const curiosityBonus = (animal.dna.curiosity / 100) * 2;
    const ageBonus = animal.age < 0.3 ? 1 : (animal.age > 0.7 ? -1 : 0); // Young animals see farther
    
    return Math.max(3, baseRadius + intelligenceBonus + curiosityBonus + ageBonus);
  }
  
  // Scan the environment within sight radius
  scanEnvironment(animal: Animal, worldState: any): SightData {
    const sightRadius = this.getSightRadius(animal);
    const animalPos = animal.position;
    
    // Find visible resources
    const visibleResources = (worldState.resources || [])
      .map((resource: any) => ({
        ...resource,
        distance: this.calculateDistance(animalPos, resource.position)
      }))
      .filter((resource: any) => resource.distance <= sightRadius)
      .sort((a: any, b: any) => a.distance - b.distance);
    
    // Find visible animals
    const visibleAnimals = (worldState.animals || [])
      .filter((other: any) => other.id !== animal.id)
      .map((other: any) => ({
        id: other.id,
        name: other.name,
        position: other.position,
        distance: this.calculateDistance(animalPos, other.position),
        relationship: this.determineRelationship(animal, other)
      }))
      .filter((other: any) => other.distance <= sightRadius)
      .sort((a: any, b: any) => a.distance - b.distance);
    
    // Generate terrain features (simplified)
    const terrainFeatures = this.generateTerrainFeatures(animalPos, sightRadius);
    
    return {
      visibleResources,
      visibleAnimals,
      terrainFeatures
    };
  }
  
  // Determine exploration goal based on animal state and memories
  determineExplorationGoal(animal: Animal, sightData: SightData): ExplorationGoal {
    const animalMemories = this.memories.get(animal.id) || [];
    const currentGoals = this.explorationGoals.get(animal.id) || [];
    
    // Priority 1: Survival needs
    if (animal.stats.hunger > 70) {
      const knownFood = animalMemories.find(m => 
        m.discoveryType === 'food' && 
        m.reliability > 0.5 &&
        Date.now() - m.lastVisited < 30 * 60 * 1000 // Food memory expires after 30 minutes
      );
      
      if (knownFood) {
        return {
          type: 'targeted',
          targetPosition: knownFood.position,
          reason: 'Returning to known food source',
          priority: 9
        };
      }
      
      // Look for visible food
      const visibleFood = sightData.visibleResources.find(r => r.type === 'food');
      if (visibleFood) {
        return {
          type: 'targeted',
          targetPosition: visibleFood.position,
          reason: 'Moving towards visible food',
          priority: 8
        };
      }
    }
    
    if (animal.stats.thirst > 70) {
      const knownWater = animalMemories.find(m => 
        m.discoveryType === 'water' && 
        m.reliability > 0.5
      );
      
      if (knownWater) {
        return {
          type: 'targeted',
          targetPosition: knownWater.position,
          reason: 'Returning to known water source',
          priority: 9
        };
      }
      
      const visibleWater = sightData.visibleResources.find(r => r.type === 'water');
      if (visibleWater) {
        return {
          type: 'targeted',
          targetPosition: visibleWater.position,
          reason: 'Moving towards visible water',
          priority: 8
        };
      }
    }
    
    // Priority 2: Social behavior
    if (animal.dna.social > 70 && animal.stats.happiness < 50) {
      const friendlyAnimal = sightData.visibleAnimals.find(a => a.relationship === 'friendly');
      if (friendlyAnimal) {
        return {
          type: 'targeted',
          targetPosition: friendlyAnimal.position,
          reason: 'Approaching friendly animal for social interaction',
          priority: 6
        };
      }
    }
    
    // Priority 3: Curiosity-driven exploration
    if (animal.dna.curiosity > 60) {
      // Look for unexplored areas
      const exploredPositions = animalMemories.map(m => m.position);
      const currentPos = animal.position;
      
      // Find direction with least exploration
      const directions = [
        { x: 1, z: 0, name: 'east' },
        { x: -1, z: 0, name: 'west' },
        { x: 0, z: 1, name: 'north' },
        { x: 0, z: -1, name: 'south' },
        { x: 0.7, z: 0.7, name: 'northeast' },
        { x: -0.7, z: 0.7, name: 'northwest' },
        { x: 0.7, z: -0.7, name: 'southeast' },
        { x: -0.7, z: -0.7, name: 'southwest' }
      ];
      
      let bestDirection = directions[0];
      let maxDistance = 0;
      
      for (const dir of directions) {
        const testPos = {
          x: currentPos.x + dir.x * 10,
          y: currentPos.y,
          z: currentPos.z + dir.z * 10
        };
        
        const minDistanceToExplored = exploredPositions.length > 0 
          ? Math.min(...exploredPositions.map(p => this.calculateDistance(testPos, p)))
          : Infinity;
          
        if (minDistanceToExplored > maxDistance) {
          maxDistance = minDistanceToExplored;
          bestDirection = dir;
        }
      }
      
      const explorationRange = this.getExplorationRange(animal);
      const targetPos = {
        x: currentPos.x + bestDirection.x * explorationRange,
        y: currentPos.y,
        z: currentPos.z + bestDirection.z * explorationRange
      };
      
      return {
        type: 'targeted',
        targetPosition: targetPos,
        reason: `Exploring ${bestDirection.name} towards unexplored territory`,
        priority: 5
      };
    }
    
    // Default: Random exploration
    return this.generateRandomExplorationGoal(animal);
  }
  
  // Generate a smart exploration position
  generateExplorationPosition(animal: Animal, goal: ExplorationGoal): AnimalPosition {
    if (goal.type === 'targeted' && goal.targetPosition) {
      // Move towards target, but not exactly to it
      const distance = this.calculateDistance(animal.position, goal.targetPosition);
      const moveDistance = Math.min(distance, this.getExplorationRange(animal));
      
      const direction = {
        x: (goal.targetPosition.x - animal.position.x) / distance,
        z: (goal.targetPosition.z - animal.position.z) / distance
      };
      
      return {
        x: animal.position.x + direction.x * moveDistance,
        y: animal.position.y,
        z: animal.position.z + direction.z * moveDistance,
        rotation: Math.atan2(direction.z, direction.x)
      };
    }
    
    // Random exploration with some intelligence
    const range = this.getExplorationRange(animal);
    const angle = Math.random() * Math.PI * 2;
    
    return {
      x: animal.position.x + Math.cos(angle) * range * Math.random(),
      y: animal.position.y,
      z: animal.position.z + Math.sin(angle) * range * Math.random(),
      rotation: angle
    };
  }
  
  // Store a discovery in memory
  addMemory(animalId: string, discovery: Omit<ExplorationMemory, 'id' | 'animalId' | 'timestamp' | 'lastVisited'>): void {
    const memories = this.memories.get(animalId) || [];
    
    // Check if we already have a similar memory nearby
    const existingMemory = memories.find(m => 
      m.discoveryType === discovery.discoveryType &&
      this.calculateDistance(m.position, discovery.position) < 3
    );
    
    if (existingMemory) {
      // Update existing memory
      existingMemory.reliability = Math.min(1, existingMemory.reliability + 0.1);
      existingMemory.description = discovery.description;
      existingMemory.lastVisited = Date.now();
    } else {
      // Add new memory
      const memory: ExplorationMemory = {
        id: uuidv4(),
        animalId,
        timestamp: Date.now(),
        lastVisited: Date.now(),
        ...discovery
      };
      
      memories.push(memory);
      
      // Limit memory to prevent overflow
      if (memories.length > 50) {
        memories.sort((a, b) => b.lastVisited - a.lastVisited);
        memories.splice(30); // Keep only the 30 most recent
      }
      
      this.memories.set(animalId, memories);
    }
  }
  
  // Get relevant memories for AI decision making
  getRelevantMemories(animalId: string, currentPosition: AnimalPosition, maxDistance: number = 15): ExplorationMemory[] {
    const allMemories = this.memories.get(animalId) || [];
    
    return allMemories
      .filter(memory => this.calculateDistance(memory.position, currentPosition) <= maxDistance)
      .filter(memory => memory.reliability > 0.3) // Only reasonably reliable memories
      .sort((a, b) => {
        const distanceA = this.calculateDistance(a.position, currentPosition);
        const distanceB = this.calculateDistance(b.position, currentPosition);
        const recencyA = Date.now() - a.lastVisited;
        const recencyB = Date.now() - b.lastVisited;
        
        // Balance distance and recency
        return (distanceA + recencyA / 10000) - (distanceB + recencyB / 10000);
      })
      .slice(0, 10); // Limit to top 10 most relevant
  }
  
  // Helper methods
  private calculateDistance(pos1: { x: number; y: number; z: number }, pos2: { x: number; y: number; z: number }): number {
    return Math.sqrt(
      Math.pow(pos1.x - pos2.x, 2) +
      Math.pow(pos1.y - pos2.y, 2) +
      Math.pow(pos1.z - pos2.z, 2)
    );
  }
  
  private getExplorationRange(animal: Animal): number {
    const baseRange = 6;
    const agilityMultiplier = animal.dna.agility / 100;
    const curiosityMultiplier = animal.dna.curiosity / 100;
    const energyFactor = animal.stats.energy / 100;
    
    return baseRange * agilityMultiplier * (1 + curiosityMultiplier * 0.5) * energyFactor;
  }
  
  private determineRelationship(animal1: Animal, animal2: Animal): 'friendly' | 'neutral' | 'rival' {
    // Simple relationship logic - can be enhanced
    const personalityDiff = Math.abs(
      (animal1.dna.personality.aggressive - animal2.dna.personality.aggressive) +
      (animal1.dna.personality.social - animal2.dna.personality.social)
    ) / 2;
    
    if (personalityDiff < 20) return 'friendly';
    if (personalityDiff > 60) return 'rival';
    return 'neutral';
  }
  
  private generateTerrainFeatures(position: AnimalPosition, radius: number): any[] {
    // Simplified terrain generation - can be enhanced with actual world data
    return [
      {
        type: 'open' as const,
        position: { x: position.x + radius * 0.5, y: 0, z: position.z },
        description: 'Open grassland area'
      }
    ];
  }
  
  private generateRandomExplorationGoal(animal: Animal): ExplorationGoal {
    const range = this.getExplorationRange(animal);
    const angle = Math.random() * Math.PI * 2;
    
    return {
      type: 'random',
      targetPosition: {
        x: animal.position.x + Math.cos(angle) * range,
        y: animal.position.y,
        z: animal.position.z + Math.sin(angle) * range
      },
      reason: 'Random exploration to satisfy curiosity',
      priority: 3
    };
  }
  
  // Clean up old memories
  cleanupMemories(animalId: string): void {
    const memories = this.memories.get(animalId) || [];
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    
    // Remove very old memories or reduce their reliability
    const cleanedMemories = memories
      .map(memory => {
        if (memory.lastVisited < oneHourAgo) {
          memory.reliability = Math.max(0, memory.reliability - 0.2);
        }
        return memory;
      })
      .filter(memory => memory.reliability > 0.1);
    
    this.memories.set(animalId, cleanedMemories);
  }
}