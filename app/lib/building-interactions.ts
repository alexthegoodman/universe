import type { Animal, InventoryItem } from "../types/animal";
import type { Building, BuildingType } from "../types/building";

export interface BuildingInteractionOption {
  key: string; // "option_1", "option_2", etc.
  label: string; // "Trade Goods with Merchant"
  description: string; // Brief explanation of what this action does
  requirements?: string[]; // ["has_materials", "sufficient_energy"]
  cooldown?: number; // Hours until can use again per animal
  energyCost?: number; // Energy required to perform this action
}

export interface BuildingInteractionResult {
  success: boolean;
  message: string;
  statChanges?: {
    energy?: number;
    health?: number;
    happiness?: number;
    hunger?: number;
    thirst?: number;
  };
  consumedItem?: InventoryItem;
  receivedItem?: InventoryItem;
  duration: number;
  cooldownSet?: number; // Timestamp when this action can be used again
}

export interface TradingPostInventory {
  stone: number;
  wood: number;
  berries: number;
  water: number;
  tools: InventoryItem[];
}

// Cooldown tracking per animal per building type per option
const cooldowns: Map<string, Map<string, Map<string, number>>> = new Map();

function getCooldownKey(
  animalId: string,
  buildingType: BuildingType,
  optionKey: string
): number {
  if (!cooldowns.has(animalId)) return 0;
  const animalCooldowns = cooldowns.get(animalId)!;
  if (!animalCooldowns.has(buildingType)) return 0;
  const buildingCooldowns = animalCooldowns.get(buildingType)!;
  return buildingCooldowns.get(optionKey) || 0;
}

function setCooldown(
  animalId: string,
  buildingType: BuildingType,
  optionKey: string,
  timestamp: number
): void {
  if (!cooldowns.has(animalId)) {
    cooldowns.set(animalId, new Map());
  }
  const animalCooldowns = cooldowns.get(animalId)!;
  if (!animalCooldowns.has(buildingType)) {
    animalCooldowns.set(buildingType, new Map());
  }
  const buildingCooldowns = animalCooldowns.get(buildingType)!;
  buildingCooldowns.set(optionKey, timestamp);
}

function isOnCooldown(
  animalId: string,
  buildingType: BuildingType,
  optionKey: string
): boolean {
  const cooldownEnd = getCooldownKey(animalId, buildingType, optionKey);
  return Date.now() < cooldownEnd;
}

// Default trading post inventory
let tradingPostInventory: TradingPostInventory = {
  stone: 50,
  wood: 40,
  berries: 30,
  water: 60,
  tools: [
    {
      id: "trading_tool_hammer_1",
      type: "tool",
      name: "Basic Hammer",
      quantity: 1,
      quality: 65,
      harvestedAt: Date.now(),
      traits: { sharp: 40, durable: 70 },
    },
    {
      id: "trading_tool_knife_1",
      type: "tool",
      name: "Stone Knife",
      quantity: 1,
      quality: 55,
      harvestedAt: Date.now(),
      traits: { sharp: 80, durable: 45 },
    },
  ],
};

// DRY building interaction option definitions
const BUILDING_INTERACTION_OPTIONS: Record<
  BuildingType,
  BuildingInteractionOption[]
> = {
  home: [
    {
      key: "option_1",
      label: "Rest and Recover",
      description: "Deep restoration beyond basic sleep, with skill reflection",
      requirements: [],
      cooldown: 0, // Once per day
      energyCost: 0,
    },
    {
      key: "option_2",
      label: "Organize Belongings",
      description: "Sort inventory and potentially find forgotten items",
      requirements: [],
      cooldown: 1,
      energyCost: 5,
    },
    {
      key: "option_3",
      label: "Practice Skills",
      description: "Safe environment skill training and experimentation",
      requirements: ["sufficient_energy"],
      cooldown: 1,
      energyCost: 8,
    },
    {
      key: "option_4",
      label: "Plan Future Goals",
      description: "Strategic thinking session for wisdom and planning bonus",
      requirements: ["sufficient_energy"],
      cooldown: 1,
      energyCost: 10,
    },
  ],

  trading_post: [
    {
      key: "option_1",
      label: "Trade Goods with Merchant",
      description: "Exchange items with the trading post's inventory",
      requirements: ["has_tradeable_items"],
      cooldown: 0, // No cooldown for trading
      energyCost: 3,
    },
    {
      key: "option_2",
      label: "Browse Available Wares",
      description: "See what's available without making purchases",
      requirements: [],
      cooldown: 0,
      energyCost: 1,
    },
    {
      key: "option_3",
      label: "Market Research",
      description: "Learn about pricing trends and item demand",
      requirements: [],
      cooldown: 1,
      energyCost: 5,
    },
    {
      key: "option_4",
      label: "Network with Traders",
      description: "Build relationships and gather trade rumors",
      requirements: [],
      cooldown: 1,
      energyCost: 4,
    },
    {
      key: "option_5",
      label: "Post Trade Request",
      description: "Advertise what you want to buy or sell",
      requirements: [],
      cooldown: 1,
      energyCost: 2,
    },
  ],

  hospital: [
    {
      key: "option_1",
      label: "Receive Medical Treatment",
      description: "Direct healing for injuries and illnesses",
      requirements: [],
      cooldown: 0, // No cooldown for emergency healing
      energyCost: 0,
    },
    {
      key: "option_2",
      label: "Routine Health Checkup",
      description: "Preventive care and health status assessment",
      requirements: [],
      cooldown: 1,
      energyCost: 2,
    },
    {
      key: "option_3",
      label: "Study Medical Texts",
      description: "Learn basic healing knowledge and techniques",
      requirements: ["sufficient_energy"],
      cooldown: 1,
      energyCost: 8,
    },
    {
      key: "option_4",
      label: "Volunteer as Assistant",
      description: "Help other patients and gain medical experience",
      requirements: ["sufficient_energy"],
      cooldown: 1,
      energyCost: 10,
    },
    {
      key: "option_5",
      label: "Donate Medical Supplies",
      description: "Contribute healing items for community reputation",
      requirements: ["has_medical_items"],
      cooldown: 1,
      energyCost: 2,
    },
  ],

  factory: [
    {
      key: "option_1",
      label: "Operate Machinery",
      description: "Direct production work in exchange for wages",
      requirements: ["sufficient_energy"],
      cooldown: 0,
      energyCost: 15,
    },
    {
      key: "option_2",
      label: "Optimize Production Line",
      description: "Improve factory efficiency and gain engineering experience",
      requirements: ["sufficient_energy"],
      cooldown: 1,
      energyCost: 12,
    },
    {
      key: "option_3",
      label: "Study Manufacturing Process",
      description: "Learn crafting techniques and production methods",
      requirements: ["sufficient_energy"],
      cooldown: 1,
      energyCost: 8,
    },
    {
      key: "option_4",
      label: "Inspect Quality Control",
      description: "Ensure products meet standards and prevent defects",
      requirements: ["sufficient_energy"],
      cooldown: 1,
      energyCost: 6,
    },
    {
      key: "option_5",
      label: "Negotiate Work Contract",
      description: "Arrange ongoing employment and payment terms",
      requirements: [],
      cooldown: 1,
      energyCost: 5,
    },
  ],

  settlement: [
    {
      key: "option_1",
      label: "Attend Community Meeting",
      description: "Participate in local governance and decision making",
      requirements: [],
      cooldown: 1,
      energyCost: 4,
    },
    {
      key: "option_2",
      label: "Contribute to Construction",
      description: "Help build settlement infrastructure and improvements",
      requirements: ["sufficient_energy", "has_materials"],
      cooldown: 0,
      energyCost: 12,
    },
    {
      key: "option_3",
      label: "Study Territorial Maps",
      description:
        "Learn about expansion opportunities and territory management",
      requirements: ["sufficient_energy"],
      cooldown: 1,
      energyCost: 6,
    },
    // {
    //   key: "option_4",
    //   label: "Register as Citizen",
    //   description: "Gain official settlement membership and benefits",
    //   requirements: [],
    //   cooldown: 999999, // Once only
    //   energyCost: 2
    // },
    {
      key: "option_4",
      label: "Patrol Territory Borders",
      description: "Security work to protect the settlement boundaries",
      requirements: ["sufficient_energy"],
      cooldown: 1,
      energyCost: 10,
    },
  ],
};

export function getBuildingInteractionOptions(
  building: Building,
  animal: Animal
): BuildingInteractionOption[] {
  const baseOptions = BUILDING_INTERACTION_OPTIONS[building.type] || [];

  return baseOptions.filter((option) => {
    // Filter out options on cooldown
    if (isOnCooldown(animal.id, building.type, option.key)) {
      return false;
    }

    // Check energy requirements
    if (option.energyCost && animal.stats.energy < option.energyCost) {
      return false;
    }

    // Check specific requirements
    if (option.requirements) {
      for (const req of option.requirements) {
        if (!checkRequirement(req, animal, building)) {
          return false;
        }
      }
    }

    return true;
  });
}

function checkRequirement(
  requirement: string,
  animal: Animal,
  building: Building
): boolean {
  switch (requirement) {
    case "sufficient_energy":
      return animal.stats.energy >= 10;

    case "has_tradeable_items":
      return animal.inventory.items.some(
        (item) =>
          item.quantity > 0 &&
          (item.type === "material" ||
            item.type === "food" ||
            item.type === "tool")
      );

    case "has_materials":
      return animal.inventory.items.some(
        (item) => item.quantity > 0 && item.type === "material"
      );

    case "has_medical_items":
      return animal.inventory.items.some(
        (item) =>
          item.quantity > 0 &&
          (item.type === "medicinal" ||
            (item.traits && item.traits.healing && item.traits.healing > 50))
      );

    default:
      return true;
  }
}

export async function executeInteraction(
  animal: Animal,
  building: Building,
  optionKey: string
): Promise<BuildingInteractionResult> {
  const options = BUILDING_INTERACTION_OPTIONS[building.type];
  const option = options?.find((opt) => opt.key === optionKey);

  if (!option) {
    return {
      success: false,
      message: `${animal.name} couldn't find that interaction option`,
      duration: 1000,
    };
  }

  // Check cooldown
  if (isOnCooldown(animal.id, building.type, optionKey)) {
    return {
      success: false,
      message: `${animal.name} must wait before using this option again`,
      duration: 1000,
    };
  }

  // Execute the specific interaction
  const result = await executeSpecificInteraction(animal, building, option);

  // Set cooldown if successful
  if (result.success && option.cooldown && option.cooldown > 0) {
    const cooldownEnd = Date.now() + option.cooldown * 60 * 60 * 1000; // Convert hours to ms
    setCooldown(animal.id, building.type, optionKey, cooldownEnd);
    result.cooldownSet = cooldownEnd;
  }

  return result;
}

async function executeSpecificInteraction(
  animal: Animal,
  building: Building,
  option: BuildingInteractionOption
): Promise<BuildingInteractionResult> {
  // Route to specific handlers based on building type and option
  const handlerKey = `${building.type}_${option.key}`;

  switch (handlerKey) {
    // Home interactions
    case "home_option_1":
      return executeRestAndRecover(animal, building);
    case "home_option_2":
      return executeOrganizeBelongings(animal, building);
    case "home_option_3":
      return executePracticeSkills(animal, building);
    case "home_option_4":
      return executePlanFutureGoals(animal, building);

    // Trading Post interactions
    case "trading_post_option_1":
      return executeTradeGoods(animal, building);
    case "trading_post_option_2":
      return executeBrowseWares(animal, building);
    case "trading_post_option_3":
      return executeMarketResearch(animal, building);
    case "trading_post_option_4":
      return executeNetworkWithTraders(animal, building);
    case "trading_post_option_5":
      return executePostTradeRequest(animal, building);

    // Hospital interactions
    case "hospital_option_1":
      return executeMedicalTreatment(animal, building);
    case "hospital_option_2":
      return executeHealthCheckup(animal, building);
    case "hospital_option_3":
      return executeStudyMedicalTexts(animal, building);
    case "hospital_option_4":
      return executeVolunteerAssistant(animal, building);
    case "hospital_option_5":
      return executeDonateMedicalSupplies(animal, building);

    // Factory interactions
    case "factory_option_1":
      return executeOperateMachinery(animal, building);
    case "factory_option_2":
      return executeOptimizeProduction(animal, building);
    case "factory_option_3":
      return executeStudyManufacturing(animal, building);
    case "factory_option_4":
      return executeInspectQualityControl(animal, building);
    case "factory_option_5":
      return executeNegotiateWorkContract(animal, building);

    // Settlement interactions
    case "settlement_option_1":
      return executeAttendCommunityMeeting(animal, building);
    case "settlement_option_2":
      return executeContributeToConstruction(animal, building);
    case "settlement_option_3":
      return executeStudyTerritorialMaps(animal, building);
    case "settlement_option_4":
      return executeRegisterAsCitizen(animal, building);
    case "settlement_option_5":
      return executePatrolTerritoryBorders(animal, building);

    default:
      return {
        success: false,
        message: `${animal.name} doesn't know how to perform that interaction`,
        duration: 1000,
      };
  }
}

// Trading Post utility functions
export function getTradingPostInventory(): TradingPostInventory {
  return { ...tradingPostInventory }; // Return a copy
}

export function updateTradingPostInventory(
  updates: Partial<TradingPostInventory>
): void {
  Object.assign(tradingPostInventory, updates);
}

export function canTradeItem(
  item: InventoryItem,
  forItem: keyof TradingPostInventory
): boolean {
  if (item.quantity <= 0) return false;

  // Simple trading rules - can trade materials for materials, food for food, etc.
  if (forItem === "stone" || forItem === "wood") {
    return item.type === "material";
  }
  if (forItem === "berries") {
    return item.type === "food" || item.type === "material";
  }
  if (forItem === "water") {
    return item.type === "material" || item.type === "food";
  }

  return false;
}

// Individual interaction implementations will be added below...
// These are placeholder implementations that can be expanded

async function executeRestAndRecover(
  animal: Animal,
  building: Building
): Promise<BuildingInteractionResult> {
  const energyGain = 25;
  const happinessGain = 10;

  return {
    success: true,
    message: `${animal.name} spent quality time at home, fully recovering and reflecting on their skills`,
    statChanges: {
      energy: Math.min(100, animal.stats.energy + energyGain),
      happiness: Math.min(100, animal.stats.happiness + happinessGain),
    },
    duration: 8000,
  };
}

async function executeOrganizeBelongings(
  animal: Animal,
  building: Building
): Promise<BuildingInteractionResult> {
  // 20% chance to "find" a small item
  let foundItem: InventoryItem | undefined;

  if (Math.random() < 0.2) {
    foundItem = {
      id: `found_item_${Date.now()}`,
      type: "material",
      name: "forgotten trinket",
      quantity: 1,
      quality: 30 + Math.random() * 40,
      harvestedAt: Date.now(),
    };
  }

  return {
    success: true,
    message: `${animal.name} organized their belongings and feels more focused${
      foundItem ? ` and found a ${foundItem.name}!` : ""
    }`,
    statChanges: {
      energy: Math.max(0, animal.stats.energy - 5),
      happiness: Math.min(100, animal.stats.happiness + 5),
    },
    receivedItem: foundItem,
    duration: 6000,
  };
}

async function executePracticeSkills(
  animal: Animal,
  building: Building
): Promise<BuildingInteractionResult> {
  return {
    success: true,
    message: `${animal.name} practiced their skills in the safety of their home, gaining valuable experience`,
    statChanges: {
      energy: Math.max(0, animal.stats.energy - 8),
      happiness: Math.min(100, animal.stats.happiness + 8),
    },
    duration: 10000,
  };
}

async function executePlanFutureGoals(
  animal: Animal,
  building: Building
): Promise<BuildingInteractionResult> {
  return {
    success: true,
    message: `${animal.name} spent time planning and strategizing, gaining clarity and wisdom`,
    statChanges: {
      energy: Math.max(0, animal.stats.energy - 10),
      happiness: Math.min(100, animal.stats.happiness + 12),
    },
    duration: 12000,
  };
}

// Trading Post interactions
async function executeTradeGoods(
  animal: Animal,
  building: Building
): Promise<BuildingInteractionResult> {
  // Find a tradeable item in animal's inventory
  const tradeableItem = animal.inventory.items.find(
    (item) =>
      item.quantity > 0 && (item.type === "material" || item.type === "food")
  );

  if (!tradeableItem) {
    return {
      success: false,
      message: `${animal.name} has nothing to trade at the moment`,
      duration: 2000,
    };
  }

  // Simple trade: give 1 of their item, get 1-2 of a basic resource
  let receivedItem: InventoryItem;

  if (tradeableItem.type === "material") {
    // Trade material for food
    receivedItem = {
      id: `traded_berries_${Date.now()}`,
      type: "food",
      name: "berries",
      quantity: 1 + Math.floor(Math.random() * 2),
      quality: 60,
      harvestedAt: Date.now(),
    };
    tradingPostInventory.berries -= receivedItem.quantity;
  } else {
    // Trade food for material
    receivedItem = {
      id: `traded_stone_${Date.now()}`,
      type: "material",
      name: "stone",
      quantity: 1,
      quality: 55,
      harvestedAt: Date.now(),
    };
    tradingPostInventory.stone -= 1;
  }

  return {
    success: true,
    message: `${animal.name} traded ${tradeableItem.name} for ${receivedItem.quantity} ${receivedItem.name}`,
    statChanges: {
      energy: Math.max(0, animal.stats.energy - 3),
      happiness: Math.min(100, animal.stats.happiness + 3),
    },
    consumedItem: {
      ...tradeableItem,
      quantity: 1,
    },
    receivedItem,
    duration: 5000,
  };
}

async function executeBrowseWares(
  animal: Animal,
  building: Building
): Promise<BuildingInteractionResult> {
  const inventory = getTradingPostInventory();
  const itemList = [
    `${inventory.stone} stone`,
    `${inventory.wood} wood`,
    `${inventory.berries} berries`,
    `${inventory.water} water`,
    ...inventory.tools.map((tool) => tool.name),
  ].join(", ");

  return {
    success: true,
    message: `${animal.name} browsed the available wares: ${itemList}`,
    statChanges: {
      energy: Math.max(0, animal.stats.energy - 1),
      happiness: Math.min(100, animal.stats.happiness + 2),
    },
    duration: 3000,
  };
}

async function executeMarketResearch(
  animal: Animal,
  building: Building
): Promise<BuildingInteractionResult> {
  const insights = [
    "Stone is always in demand for building",
    "Quality food items trade for premium prices",
    "Tools with good traits are highly valued",
    "Water becomes more valuable during dry periods",
  ];

  const randomInsight = insights[Math.floor(Math.random() * insights.length)];

  return {
    success: true,
    message: `${animal.name} learned about market trends: "${randomInsight}"`,
    statChanges: {
      energy: Math.max(0, animal.stats.energy - 5),
      happiness: Math.min(100, animal.stats.happiness + 6),
    },
    duration: 7000,
  };
}

async function executeNetworkWithTraders(
  animal: Animal,
  building: Building
): Promise<BuildingInteractionResult> {
  return {
    success: true,
    message: `${animal.name} networked with other traders and built valuable relationships`,
    statChanges: {
      energy: Math.max(0, animal.stats.energy - 4),
      happiness: Math.min(100, animal.stats.happiness + 8),
    },
    duration: 8000,
  };
}

async function executePostTradeRequest(
  animal: Animal,
  building: Building
): Promise<BuildingInteractionResult> {
  return {
    success: true,
    message: `${animal.name} posted a trade request and feels optimistic about future deals`,
    statChanges: {
      energy: Math.max(0, animal.stats.energy - 2),
      happiness: Math.min(100, animal.stats.happiness + 4),
    },
    duration: 4000,
  };
}

// Hospital interactions
async function executeMedicalTreatment(
  animal: Animal,
  building: Building
): Promise<BuildingInteractionResult> {
  const healthGain = Math.min(30, 100 - animal.stats.health);

  return {
    success: true,
    message: `${animal.name} received medical treatment and feels much better`,
    statChanges: {
      health: Math.min(100, animal.stats.health + healthGain),
      happiness: Math.min(100, animal.stats.happiness + 5),
    },
    duration: 8000,
  };
}

async function executeHealthCheckup(
  animal: Animal,
  building: Building
): Promise<BuildingInteractionResult> {
  return {
    success: true,
    message: `${animal.name} received a thorough health checkup and preventive care advice`,
    statChanges: {
      health: Math.min(100, animal.stats.health + 8),
      happiness: Math.min(100, animal.stats.happiness + 4),
      energy: Math.max(0, animal.stats.energy - 2),
    },
    duration: 6000,
  };
}

async function executeStudyMedicalTexts(
  animal: Animal,
  building: Building
): Promise<BuildingInteractionResult> {
  return {
    success: true,
    message: `${animal.name} studied medical texts and gained knowledge about healing`,
    statChanges: {
      energy: Math.max(0, animal.stats.energy - 8),
      happiness: Math.min(100, animal.stats.happiness + 10),
    },
    duration: 12000,
  };
}

async function executeVolunteerAssistant(
  animal: Animal,
  building: Building
): Promise<BuildingInteractionResult> {
  return {
    success: true,
    message: `${animal.name} helped other patients and gained valuable medical experience`,
    statChanges: {
      energy: Math.max(0, animal.stats.energy - 10),
      happiness: Math.min(100, animal.stats.happiness + 15),
    },
    duration: 15000,
  };
}

async function executeDonateMedicalSupplies(
  animal: Animal,
  building: Building
): Promise<BuildingInteractionResult> {
  const medicalItem = animal.inventory.items.find(
    (item) =>
      item.type === "medicinal" ||
      (item.traits && item.traits.healing && item.traits.healing > 50)
  );

  if (!medicalItem) {
    return {
      success: false,
      message: `${animal.name} doesn't have any medical supplies to donate`,
      duration: 2000,
    };
  }

  return {
    success: true,
    message: `${animal.name} donated ${medicalItem.name} and gained community respect`,
    statChanges: {
      energy: Math.max(0, animal.stats.energy - 2),
      happiness: Math.min(100, animal.stats.happiness + 12),
    },
    consumedItem: {
      ...medicalItem,
      quantity: 1,
    },
    duration: 5000,
  };
}

// Factory interactions (simplified implementations)
async function executeOperateMachinery(
  animal: Animal,
  building: Building
): Promise<BuildingInteractionResult> {
  // Simple reward for operating machinery
  const rewardItem: InventoryItem = {
    id: `factory_product_${Date.now()}`,
    type: "material",
    name: "manufactured goods",
    quantity: 1,
    quality: 70,
    harvestedAt: Date.now(),
  };

  return {
    success: true,
    message: `${animal.name} operated factory machinery and produced goods`,
    statChanges: {
      energy: Math.max(0, animal.stats.energy - 15),
      happiness: Math.min(100, animal.stats.happiness + 8),
    },
    receivedItem: rewardItem,
    duration: 18000,
  };
}

async function executeOptimizeProduction(
  animal: Animal,
  building: Building
): Promise<BuildingInteractionResult> {
  return {
    success: true,
    message: `${animal.name} optimized the production line and gained engineering experience`,
    statChanges: {
      energy: Math.max(0, animal.stats.energy - 12),
      happiness: Math.min(100, animal.stats.happiness + 10),
    },
    duration: 15000,
  };
}

async function executeStudyManufacturing(
  animal: Animal,
  building: Building
): Promise<BuildingInteractionResult> {
  return {
    success: true,
    message: `${animal.name} studied manufacturing processes and learned new techniques`,
    statChanges: {
      energy: Math.max(0, animal.stats.energy - 8),
      happiness: Math.min(100, animal.stats.happiness + 8),
    },
    duration: 10000,
  };
}

async function executeInspectQualityControl(
  animal: Animal,
  building: Building
): Promise<BuildingInteractionResult> {
  return {
    success: true,
    message: `${animal.name} inspected products and ensured quality standards`,
    statChanges: {
      energy: Math.max(0, animal.stats.energy - 6),
      happiness: Math.min(100, animal.stats.happiness + 6),
    },
    duration: 8000,
  };
}

async function executeNegotiateWorkContract(
  animal: Animal,
  building: Building
): Promise<BuildingInteractionResult> {
  return {
    success: true,
    message: `${animal.name} negotiated a work contract and secured ongoing employment`,
    statChanges: {
      energy: Math.max(0, animal.stats.energy - 5),
      happiness: Math.min(100, animal.stats.happiness + 15),
    },
    duration: 12000,
  };
}

// Settlement interactions
async function executeAttendCommunityMeeting(
  animal: Animal,
  building: Building
): Promise<BuildingInteractionResult> {
  return {
    success: true,
    message: `${animal.name} participated in community governance and voiced their opinions`,
    statChanges: {
      energy: Math.max(0, animal.stats.energy - 4),
      happiness: Math.min(100, animal.stats.happiness + 10),
    },
    duration: 10000,
  };
}

async function executeContributeToConstruction(
  animal: Animal,
  building: Building
): Promise<BuildingInteractionResult> {
  const materialItem = animal.inventory.items.find(
    (item) => item.type === "material" && item.quantity > 0
  );

  if (!materialItem) {
    return {
      success: false,
      message: `${animal.name} doesn't have materials to contribute to construction`,
      duration: 2000,
    };
  }

  return {
    success: true,
    message: `${animal.name} contributed ${materialItem.name} to settlement construction`,
    statChanges: {
      energy: Math.max(0, animal.stats.energy - 12),
      happiness: Math.min(100, animal.stats.happiness + 12),
    },
    consumedItem: {
      ...materialItem,
      quantity: 1,
    },
    duration: 15000,
  };
}

async function executeStudyTerritorialMaps(
  animal: Animal,
  building: Building
): Promise<BuildingInteractionResult> {
  return {
    success: true,
    message: `${animal.name} studied territorial maps and learned about expansion opportunities`,
    statChanges: {
      energy: Math.max(0, animal.stats.energy - 6),
      happiness: Math.min(100, animal.stats.happiness + 8),
    },
    duration: 8000,
  };
}

async function executeRegisterAsCitizen(
  animal: Animal,
  building: Building
): Promise<BuildingInteractionResult> {
  return {
    success: true,
    message: `${animal.name} officially registered as a citizen and gained settlement benefits`,
    statChanges: {
      energy: Math.max(0, animal.stats.energy - 2),
      happiness: Math.min(100, animal.stats.happiness + 20),
    },
    duration: 6000,
  };
}

async function executePatrolTerritoryBorders(
  animal: Animal,
  building: Building
): Promise<BuildingInteractionResult> {
  return {
    success: true,
    message: `${animal.name} patrolled the territory borders and protected the settlement`,
    statChanges: {
      energy: Math.max(0, animal.stats.energy - 10),
      happiness: Math.min(100, animal.stats.happiness + 8),
    },
    duration: 12000,
  };
}
