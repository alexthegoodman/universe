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

export type BuildingType = "home" | "trading_post" | "hospital" | "factory" | "settlement";

export interface Building {
  id: string;
  name: string;
  type: BuildingType;
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

  // Building features
  features: string[]; // Array of feature types: "workshop", "garden", etc.

  // Nation-specific properties
  nationId?: string; // ID of the nation that owns this building
  territoryRadius?: number; // For settlements, defines territory sphere radius
}

export interface BuildingAction {
  type:
    | "make_wider"
    | "make_taller"
    | "make_beautiful"
    | "add_room"
    | "add_workshop"
    | "add_garden"
    // | "create_building"
    | "create_home"
    | "create_trading_post"
    | "create_hospital"
    | "create_factory"
    | "create_settlement"
    | "purchase_upgrade";
  name: string;
  description: string;
  requiredMaterials: BuildingMaterial;
  skillRequirements?: string[]; // Array of "skillName: level" requirements
  effects: {
    dimensionChanges?: Partial<BuildingDimensions>;
    statChanges?: Partial<BuildingStats>;
    capacityChange?: number;
  };
  currencyCost?: number; // For purchase_upgrade action
  buildingType?: BuildingType; // For create_* actions
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
  // create_building: {
  //   type: "create_building",
  //   name: "Create Building",
  //   description: "Build a basic shelter structure",
  //   requiredMaterials: {
  //     requiredQuantity: 4,
  //     suitableTraits: ["durable"],
  //     minTraitScore: 50,
  //   },
  //   // skillRequirements: ["stoneKnapping: 1"], // lets make this available to all animals
  //   effects: {
  //     dimensionChanges: { width: 3, height: 2, depth: 3 },
  //     statChanges: { durability: 60, beauty: 30, comfort: 50 },
  //     capacityChange: 2,
  //   },
  //   buildingType: "generic",
  // },
  create_home: {
    type: "create_home",
    name: "Create Home",
    description: "Build a personal home where you can live and rest",
    requiredMaterials: {
      requiredQuantity: 4,
      suitableTraits: ["durable"],
      minTraitScore: 50,
    },
    effects: {
      dimensionChanges: { width: 4, height: 3, depth: 4 },
      statChanges: { durability: 70, beauty: 40, comfort: 70 },
      capacityChange: 1,
    },
    buildingType: "home",
  },
  create_trading_post: {
    type: "create_trading_post",
    name: "Create Trading Post",
    description: "Build a trading post for commerce and resource exchange",
    requiredMaterials: {
      requiredQuantity: 8,
      suitableTraits: ["durable"],
      minTraitScore: 50,
    },
    // skillRequirements: ["masonry: 2"],
    effects: {
      dimensionChanges: { width: 6, height: 4, depth: 6 },
      statChanges: { durability: 80, beauty: 50, comfort: 40 },
      capacityChange: 8,
    },
    buildingType: "trading_post",
  },
  create_hospital: {
    type: "create_hospital",
    name: "Create Hospital",
    description: "Build a hospital for healing and medical care",
    requiredMaterials: {
      requiredQuantity: 8,
      suitableTraits: ["durable"],
      minTraitScore: 50,
    },
    // skillRequirements: ["masonry: 2"],
    effects: {
      dimensionChanges: { width: 5, height: 3, depth: 5 },
      statChanges: { durability: 85, beauty: 60, comfort: 80 },
      capacityChange: 6,
    },
    buildingType: "hospital",
  },
  create_factory: {
    type: "create_factory",
    name: "Create Factory",
    description: "Build a factory for mass production and manufacturing",
    requiredMaterials: {
      requiredQuantity: 8,
      suitableTraits: ["durable"],
      minTraitScore: 50,
    },
    // skillRequirements: ["toolmaking: 3"],
    effects: {
      dimensionChanges: { width: 8, height: 5, depth: 8 },
      statChanges: { durability: 90, beauty: 20, comfort: 30 },
      capacityChange: 12,
    },
    buildingType: "factory",
  },
  create_settlement: {
    type: "create_settlement",
    name: "Create Settlement",
    description: "Establish a settlement that defines your nation's territory",
    requiredMaterials: {
      requiredQuantity: 12,
      suitableTraits: ["durable"],
      minTraitScore: 60,
    },
    effects: {
      dimensionChanges: { width: 6, height: 4, depth: 6 },
      statChanges: { durability: 95, beauty: 70, comfort: 60 },
      capacityChange: 4,
    },
    buildingType: "settlement",
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
    // skillRequirements: ["masonry: 1"],
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
    // skillRequirements: ["masonry: 1"],
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
    skillRequirements: ["masonry: 1"],
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
    // skillRequirements: ["masonry: 1"],
    effects: {
      dimensionChanges: { depth: 2, width: 1 },
      statChanges: { durability: -3 },
      capacityChange: 2,
    },
  },
  add_workshop: {
    type: "add_workshop",
    name: "Add Workshop",
    description: "Build a dedicated workspace for crafting and tool creation",
    requiredMaterials: {
      requiredQuantity: 3,
      suitableTraits: ["durable"],
      minTraitScore: 60,
    },
    // skillRequirements: ["toolmaking: 1"],
    effects: {
      dimensionChanges: { width: 2, depth: 1 },
      statChanges: { durability: -5, comfort: 5 },
      capacityChange: 1,
    },
  },
  add_garden: {
    type: "add_garden",
    name: "Add Garden",
    description:
      "Create a peaceful outdoor space for growing plants and relaxation",
    requiredMaterials: {
      requiredQuantity: 2,
      suitableTraits: ["nutritious"],
      minTraitScore: 40,
    },
    effects: {
      dimensionChanges: { width: 1, depth: 2 },
      statChanges: { beauty: 20, comfort: 10 },
    },
  },
  purchase_upgrade: {
    type: "purchase_upgrade",
    name: "Purchase Upgrade",
    description:
      "Spend currency to instantly upgrade building size and appearance",
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
