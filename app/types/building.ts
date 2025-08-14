export interface BuildingMaterial {
  stone: number;
  wood: number;
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
  materials: BuildingMaterial;
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
    | "create_building";
  name: string;
  description: string;
  requiredMaterials: BuildingMaterial;
  effects: {
    dimensionChanges?: Partial<BuildingDimensions>;
    statChanges?: Partial<BuildingStats>;
    capacityChange?: number;
  };
}

export interface BuildingActionResult {
  success: boolean;
  message: string;
  materialConsumed?: BuildingMaterial;
  buildingChanges?: {
    dimensions?: Partial<BuildingDimensions>;
    stats?: Partial<BuildingStats>;
    capacity?: number;
  };
  duration: number;
}

export const BUILDING_ACTIONS: Record<string, BuildingAction> = {
  create_building: {
    type: "create_building",
    name: "Create Building",
    description: "Build a basic shelter structure",
    requiredMaterials: { stone: 2, wood: 2 },
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
    requiredMaterials: { stone: 2, wood: 2 },
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
    requiredMaterials: { stone: 2, wood: 2 },
    effects: {
      dimensionChanges: { height: 1 },
      statChanges: { comfort: 10, beauty: 5 },
    },
  },
  make_beautiful: {
    type: "make_beautiful",
    name: "Make Beautiful",
    description: "Add decorative elements to improve aesthetics",
    requiredMaterials: { stone: 1, wood: 1 },
    effects: {
      statChanges: { beauty: 15, comfort: 5 },
    },
  },
  add_room: {
    type: "add_room",
    name: "Add Room",
    description: "Construct an additional room for more space",
    requiredMaterials: { stone: 2, wood: 2 },
    effects: {
      dimensionChanges: { depth: 2, width: 1 },
      statChanges: { durability: -3 },
      capacityChange: 2,
    },
  },
};
