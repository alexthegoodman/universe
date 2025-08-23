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
    {
      key: "option_4",
      label: "Patrol Territory Borders",
      description: "Security work to protect the settlement boundaries",
      requirements: ["sufficient_energy"],
      cooldown: 1,
      energyCost: 10,
    },
  ],

  apartment_complex: [
    {
      key: "option_1",
      label: "Socialize with Neighbors",
      description: "Build community relationships with other residents",
      requirements: [],
      cooldown: 1,
      energyCost: 3,
    },
    {
      key: "option_2",
      label: "Organize Community Event",
      description: "Plan activities to bring residents together",
      requirements: ["sufficient_energy"],
      cooldown: 1,
      energyCost: 8,
    },
    {
      key: "option_3",
      label: "Maintain Common Areas",
      description: "Help keep shared spaces clean and functional",
      requirements: ["sufficient_energy"],
      cooldown: 1,
      energyCost: 6,
    },
  ],

  forge: [
    {
      key: "option_1",
      label: "Craft Metal Tools",
      description: "Create durable tools and weapons from raw materials",
      requirements: ["sufficient_energy", "has_materials"],
      cooldown: 0,
      energyCost: 12,
    },
    {
      key: "option_2",
      label: "Study Metallurgy",
      description: "Learn advanced metalworking techniques",
      requirements: ["sufficient_energy"],
      cooldown: 1,
      energyCost: 8,
    },
    {
      key: "option_3",
      label: "Maintain Equipment",
      description: "Keep forge tools and furnace in working condition",
      requirements: ["sufficient_energy"],
      cooldown: 1,
      energyCost: 6,
    },
  ],

  mill: [
    {
      key: "option_1",
      label: "Process Materials",
      description: "Grind grains and refine raw materials",
      requirements: ["sufficient_energy", "has_materials"],
      cooldown: 0,
      energyCost: 10,
    },
    {
      key: "option_2",
      label: "Maintain Mill Wheel",
      description: "Keep the water wheel and grinding stones functional",
      requirements: ["sufficient_energy"],
      cooldown: 1,
      energyCost: 8,
    },
    {
      key: "option_3",
      label: "Study Processing Techniques",
      description: "Learn efficient material processing methods",
      requirements: ["sufficient_energy"],
      cooldown: 1,
      energyCost: 6,
    },
  ],

  brewery: [
    {
      key: "option_1",
      label: "Brew Beverages",
      description: "Create fermented drinks for the community",
      requirements: ["sufficient_energy", "has_materials"],
      cooldown: 0,
      energyCost: 8,
    },
    {
      key: "option_2",
      label: "Host Social Gathering",
      description: "Bring the community together for drinks and conversation",
      requirements: ["sufficient_energy"],
      cooldown: 1,
      energyCost: 5,
    },
    {
      key: "option_3",
      label: "Taste Test Batches",
      description: "Sample brews and perfect recipes",
      requirements: [],
      cooldown: 1,
      energyCost: 2,
    },
  ],

  electronics_fab: [
    {
      key: "option_1",
      label: "Manufacture Components",
      description: "Produce advanced electronic parts and circuits",
      requirements: ["sufficient_energy", "has_materials"],
      cooldown: 0,
      energyCost: 15,
    },
    {
      key: "option_2",
      label: "Research New Technology",
      description: "Develop cutting-edge electronic innovations",
      requirements: ["sufficient_energy"],
      cooldown: 1,
      energyCost: 12,
    },
    {
      key: "option_3",
      label: "Quality Control Testing",
      description: "Ensure components meet technical specifications",
      requirements: ["sufficient_energy"],
      cooldown: 1,
      energyCost: 8,
    },
  ],

  mine: [
    {
      key: "option_1",
      label: "Extract Resources",
      description: "Mine valuable materials from underground deposits",
      requirements: ["sufficient_energy"],
      cooldown: 0,
      energyCost: 15,
    },
    {
      key: "option_2",
      label: "Survey New Veins",
      description: "Search for additional mineral deposits to exploit",
      requirements: ["sufficient_energy"],
      cooldown: 1,
      energyCost: 10,
    },
    {
      key: "option_3",
      label: "Maintain Mine Safety",
      description: "Check supports and ensure safe working conditions",
      requirements: ["sufficient_energy"],
      cooldown: 1,
      energyCost: 8,
    },
  ],

  bank: [
    {
      key: "option_1",
      label: "Deposit Valuables",
      description: "Store currency and precious items securely",
      requirements: [],
      cooldown: 0,
      energyCost: 2,
    },
    {
      key: "option_2",
      label: "Apply for Loan",
      description: "Request funding for projects and investments",
      requirements: [],
      cooldown: 1,
      energyCost: 5,
    },
    {
      key: "option_3",
      label: "Review Investments",
      description: "Check on financial portfolio and market trends",
      requirements: ["sufficient_energy"],
      cooldown: 1,
      energyCost: 4,
    },
  ],

  stadium: [
    {
      key: "option_1",
      label: "Participate in Sports",
      description: "Compete in athletic events and games",
      requirements: ["sufficient_energy"],
      cooldown: 1,
      energyCost: 12,
    },
    {
      key: "option_2",
      label: "Watch Entertainment",
      description: "Enjoy performances and sporting events as spectator",
      requirements: [],
      cooldown: 0,
      energyCost: 3,
    },
    {
      key: "option_3",
      label: "Organize Event",
      description: "Plan and coordinate large community gatherings",
      requirements: ["sufficient_energy"],
      cooldown: 1,
      energyCost: 10,
    },
  ],

  library: [
    {
      key: "option_1",
      label: "Study Knowledge",
      description: "Research topics and expand intellectual understanding",
      requirements: ["sufficient_energy"],
      cooldown: 0,
      energyCost: 6,
    },
    {
      key: "option_2",
      label: "Share Information",
      description: "Teach others and contribute to collective knowledge",
      requirements: ["sufficient_energy"],
      cooldown: 1,
      energyCost: 8,
    },
    {
      key: "option_3",
      label: "Preserve Books",
      description: "Help maintain and organize the knowledge collection",
      requirements: ["sufficient_energy"],
      cooldown: 1,
      energyCost: 5,
    },
  ],

  temple: [
    {
      key: "option_1",
      label: "Pray and Meditate",
      description: "Engage in spiritual reflection and inner peace",
      requirements: [],
      cooldown: 0,
      energyCost: 0,
    },
    {
      key: "option_2",
      label: "Lead Ceremony",
      description: "Guide community worship and spiritual practices",
      requirements: ["sufficient_energy"],
      cooldown: 1,
      energyCost: 8,
    },
    {
      key: "option_3",
      label: "Seek Guidance",
      description: "Receive wisdom and direction for life decisions",
      requirements: [],
      cooldown: 1,
      energyCost: 4,
    },
  ],

  lab: [
    {
      key: "option_1",
      label: "Conduct Experiments",
      description: "Perform scientific research and testing",
      requirements: ["sufficient_energy", "has_materials"],
      cooldown: 0,
      energyCost: 10,
    },
    {
      key: "option_2",
      label: "Analyze Samples",
      description: "Study specimens and materials under controlled conditions",
      requirements: ["sufficient_energy"],
      cooldown: 1,
      energyCost: 8,
    },
    {
      key: "option_3",
      label: "Document Findings",
      description: "Record research results and share discoveries",
      requirements: ["sufficient_energy"],
      cooldown: 1,
      energyCost: 6,
    },
  ],

  greenhouse: [
    {
      key: "option_1",
      label: "Tend Plants",
      description: "Care for crops and maintain optimal growing conditions",
      requirements: ["sufficient_energy"],
      cooldown: 0,
      energyCost: 6,
    },
    {
      key: "option_2",
      label: "Harvest Produce",
      description: "Collect mature crops and fresh vegetables",
      requirements: ["sufficient_energy"],
      cooldown: 1,
      energyCost: 4,
    },
    {
      key: "option_3",
      label: "Plant New Seeds",
      description: "Start new crops and expand agricultural production",
      requirements: ["sufficient_energy", "has_materials"],
      cooldown: 1,
      energyCost: 8,
    },
  ],

  armory: [
    {
      key: "option_1",
      label: "Combat Training",
      description: "Practice fighting skills and military techniques",
      requirements: ["sufficient_energy"],
      cooldown: 0,
      energyCost: 12,
    },
    {
      key: "option_2",
      label: "Maintain Weapons",
      description: "Keep military equipment in combat-ready condition",
      requirements: ["sufficient_energy"],
      cooldown: 1,
      energyCost: 6,
    },
    {
      key: "option_3",
      label: "Strategic Planning",
      description: "Study tactics and plan defensive strategies",
      requirements: ["sufficient_energy"],
      cooldown: 1,
      energyCost: 8,
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
      return executePatrolTerritoryBorders(animal, building);

    // Apartment Complex interactions
    case "apartment_complex_option_1":
      return executeSocializeWithNeighbors(animal, building);
    case "apartment_complex_option_2":
      return executeOrganizeCommunityEvent(animal, building);
    case "apartment_complex_option_3":
      return executeMaintainCommonAreas(animal, building);

    // Forge interactions
    case "forge_option_1":
      return executeCraftMetalTools(animal, building);
    case "forge_option_2":
      return executeStudyMetallurgy(animal, building);
    case "forge_option_3":
      return executeMaintainForgeEquipment(animal, building);

    // Mill interactions
    case "mill_option_1":
      return executeProcessMaterials(animal, building);
    case "mill_option_2":
      return executeMaintainMillWheel(animal, building);
    case "mill_option_3":
      return executeStudyProcessingTechniques(animal, building);

    // Brewery interactions
    case "brewery_option_1":
      return executeBrewBeverages(animal, building);
    case "brewery_option_2":
      return executeHostSocialGathering(animal, building);
    case "brewery_option_3":
      return executeTasteTestBatches(animal, building);

    // Electronics Fab interactions
    case "electronics_fab_option_1":
      return executeManufactureComponents(animal, building);
    case "electronics_fab_option_2":
      return executeResearchNewTechnology(animal, building);
    case "electronics_fab_option_3":
      return executeQualityControlTesting(animal, building);

    // Mine interactions
    case "mine_option_1":
      return executeExtractResources(animal, building);
    case "mine_option_2":
      return executeSurveyNewVeins(animal, building);
    case "mine_option_3":
      return executeMaintainMineSafety(animal, building);

    // Bank interactions
    case "bank_option_1":
      return executeDepositValuables(animal, building);
    case "bank_option_2":
      return executeApplyForLoan(animal, building);
    case "bank_option_3":
      return executeReviewInvestments(animal, building);

    // Stadium interactions
    case "stadium_option_1":
      return executeParticipateInSports(animal, building);
    case "stadium_option_2":
      return executeWatchEntertainment(animal, building);
    case "stadium_option_3":
      return executeOrganizeEvent(animal, building);

    // Library interactions
    case "library_option_1":
      return executeStudyKnowledge(animal, building);
    case "library_option_2":
      return executeShareInformation(animal, building);
    case "library_option_3":
      return executePreserveBooks(animal, building);

    // Temple interactions
    case "temple_option_1":
      return executePrayAndMeditate(animal, building);
    case "temple_option_2":
      return executeLeadCeremony(animal, building);
    case "temple_option_3":
      return executeSeekGuidance(animal, building);

    // Lab interactions
    case "lab_option_1":
      return executeConductExperiments(animal, building);
    case "lab_option_2":
      return executeAnalyzeSamples(animal, building);
    case "lab_option_3":
      return executeDocumentFindings(animal, building);

    // Greenhouse interactions
    case "greenhouse_option_1":
      return executeTendPlants(animal, building);
    case "greenhouse_option_2":
      return executeHarvestProduce(animal, building);
    case "greenhouse_option_3":
      return executePlantNewSeeds(animal, building);

    // Armory interactions
    case "armory_option_1":
      return executeCombatTraining(animal, building);
    case "armory_option_2":
      return executeMaintainWeapons(animal, building);
    case "armory_option_3":
      return executeStrategicPlanning(animal, building);

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

// Apartment Complex interactions
async function executeSocializeWithNeighbors(
  animal: Animal,
  building: Building
): Promise<BuildingInteractionResult> {
  return {
    success: true,
    message: `${animal.name} had a pleasant conversation with neighbors and strengthened community bonds`,
    statChanges: {
      energy: Math.max(0, animal.stats.energy - 3),
      happiness: Math.min(100, animal.stats.happiness + 12),
    },
    duration: 6000,
  };
}

async function executeOrganizeCommunityEvent(
  animal: Animal,
  building: Building
): Promise<BuildingInteractionResult> {
  return {
    success: true,
    message: `${animal.name} organized a community event that brought all residents together`,
    statChanges: {
      energy: Math.max(0, animal.stats.energy - 8),
      happiness: Math.min(100, animal.stats.happiness + 15),
    },
    duration: 10000,
  };
}

async function executeMaintainCommonAreas(
  animal: Animal,
  building: Building
): Promise<BuildingInteractionResult> {
  return {
    success: true,
    message: `${animal.name} helped maintain the common areas, making the building more pleasant for everyone`,
    statChanges: {
      energy: Math.max(0, animal.stats.energy - 6),
      happiness: Math.min(100, animal.stats.happiness + 8),
    },
    duration: 8000,
  };
}

// Forge interactions
async function executeCraftMetalTools(
  animal: Animal,
  building: Building
): Promise<BuildingInteractionResult> {
  const materialItem = animal.inventory.items.find(
    (item) => item.type === "material" && item.quantity > 0
  );

  if (!materialItem) {
    return {
      success: false,
      message: `${animal.name} doesn't have materials for forging`,
      duration: 2000,
    };
  }

  const craftedTool: InventoryItem = {
    id: `forged_tool_${Date.now()}`,
    type: "tool",
    name: "forged tool",
    quantity: 1,
    quality: 75 + Math.random() * 20,
    harvestedAt: Date.now(),
    traits: { durable: 80, sharp: 70 },
  };

  return {
    success: true,
    message: `${animal.name} forged a high-quality ${craftedTool.name} from raw materials`,
    statChanges: {
      energy: Math.max(0, animal.stats.energy - 12),
      happiness: Math.min(100, animal.stats.happiness + 10),
    },
    consumedItem: { ...materialItem, quantity: 1 },
    receivedItem: craftedTool,
    duration: 15000,
  };
}

async function executeStudyMetallurgy(
  animal: Animal,
  building: Building
): Promise<BuildingInteractionResult> {
  return {
    success: true,
    message: `${animal.name} studied advanced metallurgy techniques and gained valuable crafting knowledge`,
    statChanges: {
      energy: Math.max(0, animal.stats.energy - 8),
      happiness: Math.min(100, animal.stats.happiness + 12),
    },
    duration: 10000,
  };
}

async function executeMaintainForgeEquipment(
  animal: Animal,
  building: Building
): Promise<BuildingInteractionResult> {
  return {
    success: true,
    message: `${animal.name} maintained the forge equipment, ensuring optimal performance`,
    statChanges: {
      energy: Math.max(0, animal.stats.energy - 6),
      happiness: Math.min(100, animal.stats.happiness + 6),
    },
    duration: 8000,
  };
}

// Mill interactions
async function executeProcessMaterials(
  animal: Animal,
  building: Building
): Promise<BuildingInteractionResult> {
  const materialItem = animal.inventory.items.find(
    (item) => item.type === "material" && item.quantity > 0
  );

  if (!materialItem) {
    return {
      success: false,
      message: `${animal.name} doesn't have materials to process`,
      duration: 2000,
    };
  }

  const processedItem: InventoryItem = {
    id: `processed_${Date.now()}`,
    type: "material",
    name: "processed material",
    quantity: 2,
    quality: Math.min(95, materialItem.quality + 15),
    harvestedAt: Date.now(),
  };

  return {
    success: true,
    message: `${animal.name} processed raw materials into refined goods`,
    statChanges: {
      energy: Math.max(0, animal.stats.energy - 10),
      happiness: Math.min(100, animal.stats.happiness + 8),
    },
    consumedItem: { ...materialItem, quantity: 1 },
    receivedItem: processedItem,
    duration: 12000,
  };
}

async function executeMaintainMillWheel(
  animal: Animal,
  building: Building
): Promise<BuildingInteractionResult> {
  return {
    success: true,
    message: `${animal.name} maintained the mill wheel and grinding mechanisms`,
    statChanges: {
      energy: Math.max(0, animal.stats.energy - 8),
      happiness: Math.min(100, animal.stats.happiness + 6),
    },
    duration: 10000,
  };
}

async function executeStudyProcessingTechniques(
  animal: Animal,
  building: Building
): Promise<BuildingInteractionResult> {
  return {
    success: true,
    message: `${animal.name} learned efficient processing techniques and improved their skills`,
    statChanges: {
      energy: Math.max(0, animal.stats.energy - 6),
      happiness: Math.min(100, animal.stats.happiness + 10),
    },
    duration: 8000,
  };
}

// Brewery interactions
async function executeBrewBeverages(
  animal: Animal,
  building: Building
): Promise<BuildingInteractionResult> {
  const materialItem = animal.inventory.items.find(
    (item) => item.type === "material" || item.type === "food" && item.quantity > 0
  );

  if (!materialItem) {
    return {
      success: false,
      message: `${animal.name} doesn't have ingredients for brewing`,
      duration: 2000,
    };
  }

  const beverage: InventoryItem = {
    id: `brewed_drink_${Date.now()}`,
    type: "food",
    name: "fermented beverage",
    quantity: 3,
    quality: 60 + Math.random() * 30,
    harvestedAt: Date.now(),
    traits: { refreshing: 80 },
  };

  return {
    success: true,
    message: `${animal.name} brewed delicious beverages for the community`,
    statChanges: {
      energy: Math.max(0, animal.stats.energy - 8),
      happiness: Math.min(100, animal.stats.happiness + 12),
    },
    consumedItem: { ...materialItem, quantity: 1 },
    receivedItem: beverage,
    duration: 12000,
  };
}

async function executeHostSocialGathering(
  animal: Animal,
  building: Building
): Promise<BuildingInteractionResult> {
  return {
    success: true,
    message: `${animal.name} hosted a wonderful social gathering that brought the community together`,
    statChanges: {
      energy: Math.max(0, animal.stats.energy - 5),
      happiness: Math.min(100, animal.stats.happiness + 15),
    },
    duration: 10000,
  };
}

async function executeTasteTestBatches(
  animal: Animal,
  building: Building
): Promise<BuildingInteractionResult> {
  return {
    success: true,
    message: `${animal.name} taste-tested various brews and perfected their recipes`,
    statChanges: {
      energy: Math.max(0, animal.stats.energy - 2),
      happiness: Math.min(100, animal.stats.happiness + 8),
      hunger: Math.min(100, animal.stats.hunger + 5),
    },
    duration: 5000,
  };
}

// Other new building interaction implementations would continue here...
// For brevity, I'll implement a few key ones and leave placeholders for others

async function executeExtractResources(
  animal: Animal,
  building: Building
): Promise<BuildingInteractionResult> {
  const minedResource: InventoryItem = {
    id: `mined_resource_${Date.now()}`,
    type: "material",
    name: "raw ore",
    quantity: 1 + Math.floor(Math.random() * 3),
    quality: 50 + Math.random() * 40,
    harvestedAt: Date.now(),
    traits: { durable: 75 },
  };

  return {
    success: true,
    message: `${animal.name} extracted valuable resources from the mine`,
    statChanges: {
      energy: Math.max(0, animal.stats.energy - 15),
      happiness: Math.min(100, animal.stats.happiness + 8),
    },
    receivedItem: minedResource,
    duration: 18000,
  };
}

async function executeParticipateInSports(
  animal: Animal,
  building: Building
): Promise<BuildingInteractionResult> {
  return {
    success: true,
    message: `${animal.name} participated in athletic events and had a great workout`,
    statChanges: {
      energy: Math.max(0, animal.stats.energy - 12),
      happiness: Math.min(100, animal.stats.happiness + 15),
      health: Math.min(100, animal.stats.health + 8),
    },
    duration: 15000,
  };
}

async function executeStudyKnowledge(
  animal: Animal,
  building: Building
): Promise<BuildingInteractionResult> {
  return {
    success: true,
    message: `${animal.name} gained valuable knowledge and expanded their understanding`,
    statChanges: {
      energy: Math.max(0, animal.stats.energy - 6),
      happiness: Math.min(100, animal.stats.happiness + 12),
    },
    duration: 10000,
  };
}

async function executePrayAndMeditate(
  animal: Animal,
  building: Building
): Promise<BuildingInteractionResult> {
  return {
    success: true,
    message: `${animal.name} found inner peace through prayer and meditation`,
    statChanges: {
      happiness: Math.min(100, animal.stats.happiness + 15),
      health: Math.min(100, animal.stats.health + 5),
    },
    duration: 8000,
  };
}

async function executeTendPlants(
  animal: Animal,
  building: Building
): Promise<BuildingInteractionResult> {
  return {
    success: true,
    message: `${animal.name} tended to the plants and maintained optimal growing conditions`,
    statChanges: {
      energy: Math.max(0, animal.stats.energy - 6),
      happiness: Math.min(100, animal.stats.happiness + 10),
    },
    duration: 8000,
  };
}

async function executeCombatTraining(
  animal: Animal,
  building: Building
): Promise<BuildingInteractionResult> {
  return {
    success: true,
    message: `${animal.name} trained their combat skills and improved their fighting abilities`,
    statChanges: {
      energy: Math.max(0, animal.stats.energy - 12),
      happiness: Math.min(100, animal.stats.happiness + 8),
      health: Math.min(100, animal.stats.health + 6),
    },
    duration: 15000,
  };
}

// Placeholder implementations for remaining interactions
async function executeManufactureComponents(animal: Animal, building: Building): Promise<BuildingInteractionResult> {
  const materialItem = animal.inventory.items.find(item => item.type === "material" && item.quantity > 0);
  if (!materialItem) {
    return { success: false, message: `${animal.name} needs materials for manufacturing`, duration: 2000 };
  }
  
  const component: InventoryItem = {
    id: `electronic_component_${Date.now()}`,
    type: "tool",
    name: "electronic component",
    quantity: 1,
    quality: 85 + Math.random() * 15,
    harvestedAt: Date.now(),
  };

  return {
    success: true,
    message: `${animal.name} manufactured advanced electronic components`,
    statChanges: { energy: Math.max(0, animal.stats.energy - 15), happiness: Math.min(100, animal.stats.happiness + 10) },
    consumedItem: { ...materialItem, quantity: 1 },
    receivedItem: component,
    duration: 18000,
  };
}

async function executeSurveyNewVeins(animal: Animal, building: Building): Promise<BuildingInteractionResult> {
  return {
    success: true,
    message: `${animal.name} surveyed the area and discovered promising new mineral deposits`,
    statChanges: { energy: Math.max(0, animal.stats.energy - 10), happiness: Math.min(100, animal.stats.happiness + 12) },
    duration: 12000,
  };
}

async function executeMaintainMineSafety(animal: Animal, building: Building): Promise<BuildingInteractionResult> {
  return {
    success: true,
    message: `${animal.name} checked mine safety systems and ensured secure working conditions`,
    statChanges: { energy: Math.max(0, animal.stats.energy - 8), happiness: Math.min(100, animal.stats.happiness + 8) },
    duration: 10000,
  };
}

async function executeDepositValuables(animal: Animal, building: Building): Promise<BuildingInteractionResult> {
  return {
    success: true,
    message: `${animal.name} safely deposited their valuables in the bank's secure vault`,
    statChanges: { energy: Math.max(0, animal.stats.energy - 2), happiness: Math.min(100, animal.stats.happiness + 6) },
    duration: 5000,
  };
}

async function executeApplyForLoan(animal: Animal, building: Building): Promise<BuildingInteractionResult> {
  return {
    success: true,
    message: `${animal.name} applied for a loan and received financial assistance`,
    statChanges: { energy: Math.max(0, animal.stats.energy - 5), happiness: Math.min(100, animal.stats.happiness + 10) },
    duration: 8000,
  };
}

async function executeReviewInvestments(animal: Animal, building: Building): Promise<BuildingInteractionResult> {
  return {
    success: true,
    message: `${animal.name} reviewed their investment portfolio and financial standing`,
    statChanges: { energy: Math.max(0, animal.stats.energy - 4), happiness: Math.min(100, animal.stats.happiness + 8) },
    duration: 6000,
  };
}

async function executeWatchEntertainment(animal: Animal, building: Building): Promise<BuildingInteractionResult> {
  return {
    success: true,
    message: `${animal.name} enjoyed exciting entertainment and felt refreshed`,
    statChanges: { energy: Math.max(0, animal.stats.energy - 3), happiness: Math.min(100, animal.stats.happiness + 12) },
    duration: 8000,
  };
}

async function executeOrganizeEvent(animal: Animal, building: Building): Promise<BuildingInteractionResult> {
  return {
    success: true,
    message: `${animal.name} organized a spectacular event that delighted the entire community`,
    statChanges: { energy: Math.max(0, animal.stats.energy - 10), happiness: Math.min(100, animal.stats.happiness + 18) },
    duration: 15000,
  };
}

async function executeShareInformation(animal: Animal, building: Building): Promise<BuildingInteractionResult> {
  return {
    success: true,
    message: `${animal.name} shared their knowledge and taught others valuable information`,
    statChanges: { energy: Math.max(0, animal.stats.energy - 8), happiness: Math.min(100, animal.stats.happiness + 15) },
    duration: 12000,
  };
}

async function executePreserveBooks(animal: Animal, building: Building): Promise<BuildingInteractionResult> {
  return {
    success: true,
    message: `${animal.name} helped preserve valuable books and knowledge for future generations`,
    statChanges: { energy: Math.max(0, animal.stats.energy - 5), happiness: Math.min(100, animal.stats.happiness + 10) },
    duration: 8000,
  };
}

async function executeLeadCeremony(animal: Animal, building: Building): Promise<BuildingInteractionResult> {
  return {
    success: true,
    message: `${animal.name} led a meaningful ceremony that brought spiritual comfort to the community`,
    statChanges: { energy: Math.max(0, animal.stats.energy - 8), happiness: Math.min(100, animal.stats.happiness + 20) },
    duration: 12000,
  };
}

async function executeSeekGuidance(animal: Animal, building: Building): Promise<BuildingInteractionResult> {
  return {
    success: true,
    message: `${animal.name} sought spiritual guidance and found clarity for their path forward`,
    statChanges: { energy: Math.max(0, animal.stats.energy - 4), happiness: Math.min(100, animal.stats.happiness + 12) },
    duration: 8000,
  };
}

async function executeConductExperiments(animal: Animal, building: Building): Promise<BuildingInteractionResult> {
  const materialItem = animal.inventory.items.find(item => item.type === "material" && item.quantity > 0);
  if (!materialItem) {
    return { success: false, message: `${animal.name} needs materials for experiments`, duration: 2000 };
  }

  return {
    success: true,
    message: `${animal.name} conducted scientific experiments and made breakthrough discoveries`,
    statChanges: { energy: Math.max(0, animal.stats.energy - 10), happiness: Math.min(100, animal.stats.happiness + 15) },
    consumedItem: { ...materialItem, quantity: 1 },
    duration: 15000,
  };
}

async function executeAnalyzeSamples(animal: Animal, building: Building): Promise<BuildingInteractionResult> {
  return {
    success: true,
    message: `${animal.name} analyzed samples and gained valuable scientific insights`,
    statChanges: { energy: Math.max(0, animal.stats.energy - 8), happiness: Math.min(100, animal.stats.happiness + 12) },
    duration: 10000,
  };
}

async function executeDocumentFindings(animal: Animal, building: Building): Promise<BuildingInteractionResult> {
  return {
    success: true,
    message: `${animal.name} documented their research findings for the scientific community`,
    statChanges: { energy: Math.max(0, animal.stats.energy - 6), happiness: Math.min(100, animal.stats.happiness + 10) },
    duration: 8000,
  };
}

async function executeHarvestProduce(animal: Animal, building: Building): Promise<BuildingInteractionResult> {
  const produce: InventoryItem = {
    id: `fresh_produce_${Date.now()}`,
    type: "food",
    name: "fresh vegetables",
    quantity: 2 + Math.floor(Math.random() * 3),
    quality: 70 + Math.random() * 25,
    harvestedAt: Date.now(),
    traits: { nutritious: 85 },
  };

  return {
    success: true,
    message: `${animal.name} harvested fresh produce from the greenhouse`,
    statChanges: { energy: Math.max(0, animal.stats.energy - 4), happiness: Math.min(100, animal.stats.happiness + 10) },
    receivedItem: produce,
    duration: 8000,
  };
}

async function executePlantNewSeeds(animal: Animal, building: Building): Promise<BuildingInteractionResult> {
  const materialItem = animal.inventory.items.find(item => item.type === "material" && item.quantity > 0);
  if (!materialItem) {
    return { success: false, message: `${animal.name} needs seeds or materials for planting`, duration: 2000 };
  }

  return {
    success: true,
    message: `${animal.name} planted new seeds to expand agricultural production`,
    statChanges: { energy: Math.max(0, animal.stats.energy - 8), happiness: Math.min(100, animal.stats.happiness + 12) },
    consumedItem: { ...materialItem, quantity: 1 },
    duration: 10000,
  };
}

async function executeMaintainWeapons(animal: Animal, building: Building): Promise<BuildingInteractionResult> {
  return {
    success: true,
    message: `${animal.name} maintained weapons and equipment in peak condition`,
    statChanges: { energy: Math.max(0, animal.stats.energy - 6), happiness: Math.min(100, animal.stats.happiness + 6) },
    duration: 8000,
  };
}

async function executeStrategicPlanning(animal: Animal, building: Building): Promise<BuildingInteractionResult> {
  return {
    success: true,
    message: `${animal.name} developed strategic plans and improved tactical knowledge`,
    statChanges: { energy: Math.max(0, animal.stats.energy - 8), happiness: Math.min(100, animal.stats.happiness + 10) },
    duration: 10000,
  };
}

async function executeResearchNewTechnology(animal: Animal, building: Building): Promise<BuildingInteractionResult> {
  return {
    success: true,
    message: `${animal.name} researched cutting-edge technology and made innovative breakthroughs`,
    statChanges: { energy: Math.max(0, animal.stats.energy - 12), happiness: Math.min(100, animal.stats.happiness + 15) },
    duration: 15000,
  };
}

async function executeQualityControlTesting(animal: Animal, building: Building): Promise<BuildingInteractionResult> {
  return {
    success: true,
    message: `${animal.name} performed quality control testing and ensured product excellence`,
    statChanges: { energy: Math.max(0, animal.stats.energy - 8), happiness: Math.min(100, animal.stats.happiness + 8) },
    duration: 10000,
  };
}
