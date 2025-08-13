export interface AnimalDNA {
  id: string;
  intelligence: number; // 0-100
  agility: number; // 0-100
  strength: number; // 0-100
  social: number; // 0-100
  curiosity: number; // 0-100
  resilience: number; // 0-100
  
  // Physical traits
  size: number; // 0.5-2.0 multiplier
  color: {
    primary: string;
    secondary: string;
  };
  
  // Behavioral traits
  personality: {
    aggressive: number; // 0-100
    playful: number; // 0-100
    cautious: number; // 0-100
    nurturing: number; // 0-100
  };
  
  // Parent lineage for breeding
  parentIds?: [string, string];
  generation: number;
}

export interface AnimalStats {
  health: number; // 0-100
  hunger: number; // 0-100
  energy: number; // 0-100
  happiness: number; // 0-100
  thirst: number; // 0-100
}

export interface AnimalPosition {
  x: number;
  y: number;
  z: number;
  rotation: number;
}

export interface Animal {
  id: string;
  name: string;
  dna: AnimalDNA;
  stats: AnimalStats;
  position: AnimalPosition;
  
  // Lifecycle
  birthTime: number; // timestamp
  lifespan: number; // milliseconds (1-24 hours)
  age: number; // 0-1 (percentage of lifespan)
  
  // State
  currentAction: string;
  lastHealthCheck: number;
  isAlive: boolean;
  
  // AI Chain reference
  chainId?: string;
}

export type AnimalAction = 
  | 'idle'
  | 'moving'
  | 'eating'
  | 'drinking'
  | 'sleeping'
  | 'playing'
  | 'exploring'
  | 'socializing'
  | 'working'
  | 'mating';

export interface ActionResult {
  success: boolean;
  message: string;
  statChanges?: Partial<AnimalStats>;
  newPosition?: AnimalPosition;
  duration?: number; // milliseconds
}