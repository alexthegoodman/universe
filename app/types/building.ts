export interface BuildingMaterial {
  requiredQuantity: number;
  suitableTraits: string[]; // Traits that make a resource suitable for building
  minTraitScore?: number; // Minimum score required for each trait (default: 50)
}

export interface BuildingMaterialsUsed {
  [resourceName: string]: number; // Resource name -> quantity used
}

export interface BuildingDimensions {
  width: number;
  height: number;
  depth: number;
}

export interface BuildingStats {
  durability: number; // 0-100, affects lifespan
  beauty: number; // 0-100, affects happiness bonus
  capacity: number; // how many animals can fit
  comfort: number; // 0-100, affects rest quality
}

export interface Building {
  id: string;
  name: string;
  position: { x: number; y: number; z: number };
  dimensions: BuildingDimensions;
  materials: BuildingMaterialsUsed;
  stats: BuildingStats;

  // Building state
  isComplete: boolean;
  createdAt: number;
  lastModifiedAt: number;
  createdBy: string; // animal ID

  // Occupancy
  currentOccupants: string[]; // animal IDs
  maxOccupants: number;
}

export interface BuildingAction {
  type:
    | "make_wider"
    | "make_taller"
    | "make_beautiful"
    | "add_room"
    | "create_building"
    | "purchase_upgrade";
  name: string;
  description: string;
  requiredMaterials: BuildingMaterial;
  effects: {
    dimensionChanges?: Partial<BuildingDimensions>;
    statChanges?: Partial<BuildingStats>;
    capacityChange?: number;
  };
  currencyCost?: number; // For purchase_upgrade action
}

export interface BuildingActionResult {
  success: boolean;
  message: string;
  materialConsumed?: BuildingMaterialsUsed;
  buildingChanges?: {
    dimensions?: Partial<BuildingDimensions>;
    stats?: Partial<BuildingStats>;
    capacity?: number;
  };
  duration: number;
  areaBonus?: number; // Happiness bonus for larger house area
}

export const BUILDING_ACTIONS: Record<string, BuildingAction> = {
  create_building: {
    type: "create_building",
    name: "Create Building",
    description: "Build a basic shelter structure",
    requiredMaterials: {
      requiredQuantity: 4,
      suitableTraits: ["durable"],
      minTraitScore: 50,
    },
    effects: {
      dimensionChanges: { width: 3, height: 2, depth: 3 },
      statChanges: { durability: 60, beauty: 30, comfort: 50 },
      capacityChange: 2,
    },
  },
  make_wider: {
    type: "make_wider",
    name: "Make Wider",
    description: "Expand the building's width to accommodate more animals",
    requiredMaterials: {
      requiredQuantity: 2,
      suitableTraits: ["durable"],
      minTraitScore: 50,
    },
    effects: {
      dimensionChanges: { width: 2 },
      statChanges: { durability: -5 },
      capacityChange: 1,
    },
  },
  make_taller: {
    type: "make_taller",
    name: "Make Taller",
    description: "Increase the building's height for better comfort",
    requiredMaterials: {
      requiredQuantity: 2,
      suitableTraits: ["durable"],
      minTraitScore: 50,
    },
    effects: {
      dimensionChanges: { height: 1 },
      statChanges: { comfort: 10, beauty: 5 },
    },
  },
  make_beautiful: {
    type: "make_beautiful",
    name: "Make Beautiful",
    description: "Add decorative elements to improve aesthetics",
    requiredMaterials: {
      requiredQuantity: 2,
      suitableTraits: ["beautiful"],
      minTraitScore: 60,
    },
    effects: {
      statChanges: { beauty: 15, comfort: 5 },
    },
  },
  add_room: {
    type: "add_room",
    name: "Add Room",
    description: "Construct an additional room for more space",
    requiredMaterials: {
      requiredQuantity: 2,
      suitableTraits: ["durable"],
      minTraitScore: 50,
    },
    effects: {
      dimensionChanges: { depth: 2, width: 1 },
      statChanges: { durability: -3 },
      capacityChange: 2,
    },
  },
  purchase_upgrade: {
    type: "purchase_upgrade",
    name: "Purchase Upgrade",
    description: "Spend currency to instantly upgrade building size and appearance",
    requiredMaterials: {
      requiredQuantity: 0,
      suitableTraits: [],
    },
    effects: {
      dimensionChanges: { width: 1, height: 1, depth: 1 },
      statChanges: { beauty: 10, comfort: 5, durability: 5 },
      capacityChange: 1,
    },
    currencyCost: 100, // Base cost, will be scaled by amount spent
  },
};
