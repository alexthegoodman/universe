export interface ExplorationMemory {
  id: string;
  animalId: string;
  position: { x: number; y: number; z: number };
  discoveryType: 'food' | 'water' | 'shelter' | 'material' | 'danger' | 'interesting';
  description: string;
  timestamp: number;
  reliability: number; // 0-1, how confident the animal is about this memory
  lastVisited: number;
}

export interface SightData {
  visibleResources: Array<{
    id: string;
    type: string;
    position: { x: number; y: number; z: number };
    distance: number;
    quality: number;
  }>;
  visibleAnimals: Array<{
    id: string;
    name: string;
    position: { x: number; y: number; z: number };
    distance: number;
    relationship: 'friendly' | 'neutral' | 'rival';
  }>;
  terrainFeatures: Array<{
    type: 'open' | 'crowded' | 'elevated' | 'hidden';
    position: { x: number; y: number; z: number };
    description: string;
  }>;
}

export interface ExplorationGoal {
  type: 'random' | 'targeted' | 'return_home' | 'follow_scent' | 'avoid_area';
  targetPosition?: { x: number; y: number; z: number };
  reason: string;
  priority: number; // 0-10
}