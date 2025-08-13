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

export interface InventoryItem {
  id: string;
  type: "food" | "water" | "material" | "tool" | "stone" | "wood" | "berries";
  name: string;
  quantity: number;
  quality: number; // 0-100
  harvestedAt: number; // timestamp
}

export interface Inventory {
  items: InventoryItem[];
  maxCapacity: number;
  currentWeight: number;
}

export interface Animal {
  id: string;
  name: string;
  dna: AnimalDNA;
  stats: AnimalStats;
  position: AnimalPosition;
  inventory: Inventory;

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
  | "idle"
  | "moving"
  | "eating"
  | "drinking"
  | "sleeping"
  | "playing"
  | "exploring"
  | "socializing"
  | "working"
  | "mating"
  | "harvesting";

export interface ActionResult {
  success: boolean;
  message: string;
  statChanges?: Partial<AnimalStats>;
  newPosition?: AnimalPosition;
  duration?: number; // milliseconds
  consumedItem?: InventoryItem; // Item that was consumed during eating/drinking actions
  harvestedItem?: InventoryItem; // Item that was harvested during harvesting actions
  resourceId?: string; // ID of the resource that was harvested from
}

// Sight-based system interfaces
export interface NearbyResource {
  id: string;
  type: string;
  position: AnimalPosition;
  distance: number; // Rounded to 1 decimal place
  quantity: number;
  quality: number;
  harvestable: boolean;
  canHarvestNow: boolean; // Within harvest radius and available
  tooFarToHarvest: boolean; // Visible but too far to harvest
  direction: "north" | "south" | "east" | "west";
}

export interface NearbyAnimal {
  id: string;
  name: string;
  position: AnimalPosition;
  currentAction: string;
  age: number;
  distance: number; // Rounded to 1 decimal place
}

export interface ResourceSummary {
  foodSources: number; // Count of nearby food sources
  waterSources: number; // Count of nearby water sources
  canHarvestNow: NearbyResource[]; // Resources ready to harvest
  needToMoveCloserTo: NearbyResource[]; // Resources visible but too far
}

export interface SightBasedWorldState {
  myPosition: AnimalPosition;
  sightRadius: number;
  harvestRadius: number;
  nearbyAnimals: NearbyAnimal[];
  nearbyResources: NearbyResource[];
  environment: {
    timeOfDay: string;
    weather: string;
    temperature: number;
  };
  resourceSummary: ResourceSummary;
  memories: {
    recentFailures: Array<{
      action: string;
      reason: string;
      position: { x: number; y: number; z: number };
      timestamp: number;
      reliability: number;
    }>;
    discoveries: Array<{
      type: string;
      description: string;
      position: { x: number; y: number; z: number };
      timestamp: number;
      reliability: number;
    }>;
  };
}
