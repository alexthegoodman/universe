import type { Animal, InventoryItem } from "../types/animal";
import type { Building } from "../types/building";
import { AnimalLifecycle } from "./animal-lifecycle";
import { HealthMonitor } from "./health-monitor";
import { DNASystem } from "./dna-system";
import { BreedingSystem } from "./breeding-system";
import { animalStateManager } from "./animal-state-manager";
import { buildingSystem } from "./building-system";
import { clientPlanningManager } from "./client-planning-manager";
import { RESOURCE_COUNTS, RESOURCE_WEIGHTS } from "../types/weights";

export interface GameConfig {
  maxAnimals: number;
  startingAnimals: number;
  worldSize: { width: number; height: number; depth: number };
  enableWebSocket: boolean;
  webSocketPort: number;
}

export type ResourceCategory = 
  | "minerals_stones"
  | "organic_materials" 
  | "edible_plants"
  | "medicinal_herbs"
  | "spices_seasonings"
  | "rare_elements";

// Universal trait system - each trait scored 0-100
export type ResourceTrait = 
  // Sensory & Aesthetic (0-100)
  | "beautiful"     // Visual appeal, decoration value
  | "fragrant"      // Pleasant smell/aroma
  | "sweet"         // Sweet taste/quality
  | "bitter"        // Bitter taste/quality
  | "sour"          // Sour/acidic quality
  | "warm"          // Warming effect/comfort
  | "calming"       // Soothing, stress-reducing
  | "refreshing"    // Cooling, invigorating
  
  // Functional & Practical (0-100)
  | "healing"       // Medicinal/restorative properties
  | "energizing"    // Energy-boosting effects
  | "durable"       // Long-lasting, sturdy
  | "nutritious"    // Food value, sustenance
  | "toxic"         // Harmful/dangerous level
  | "waterproof"    // Water resistance
  | "flammable"     // Fire risk/fuel potential
  | "conductive"    // Electrical/heat conduction
  | "insulating"    // Protection from elements
  
  // Social & Cultural (0-100)  
  | "valuable"      // Economic/trade worth
  | "sacred"        // Spiritual/religious significance
  | "exotic"        // Rarity/foreign appeal
  | "magical"       // Mystical properties
  | "ancient"       // Historical significance
  
  // Processing & Craft (0-100)
  | "malleable"     // Shapeable, workable
  | "sharp"         // Cutting ability/danger
  | "absorbent"     // Liquid absorption
  | "preservative"; // Prevents decay/spoilage

export type ResourceTraits = Partial<Record<ResourceTrait, number>>;

export type ResourceType =
  // Minerals & Stones (18)
  | "granite" | "limestone" | "sandstone" | "slate" | "marble" | "obsidian"
  | "iron_ore" | "copper_ore" | "gold_ore" | "silver_ore" | "tin_ore"
  | "quartz_crystal" | "amethyst" | "ruby" | "emerald" | "diamond" | "coal" | "salt"
  
  // Organic Materials (20)
  | "oak_wood" | "pine_wood" | "birch_wood" | "cedar_wood" | "bamboo"
  | "cotton" | "wool" | "silk" | "hemp" | "flax"
  | "animal_hide" | "leather" | "fur" | "feathers" | "bone"
  | "honeycomb" | "beeswax" | "resin" | "sap" | "moss"
  
  // Edible Plants (25)
  | "blueberries" | "strawberries" | "blackberries" | "raspberries" | "elderberries"
  | "apples" | "pears" | "cherries" | "plums" | "grapes"
  | "acorns" | "walnuts" | "hazelnuts" | "chestnuts" | "pine_nuts"
  | "wild_carrots" | "wild_onions" | "mushrooms" | "turnips" | "radishes"
  | "wild_rice" | "barley" | "wheat" | "oats" | "millet"
  
  // Medicinal Herbs (20)
  | "aloe_vera" | "chamomile" | "echinacea" | "ginseng" | "willow_bark"
  | "ginkgo" | "guarana" | "green_tea" | "yerba_mate" | "gotu_kola"
  | "lavender" | "valerian" | "passionflower" | "lemon_balm" | "sage"
  | "elderflower" | "astragalus" | "cats_claw" | "turmeric" | "garlic"
  
  // Spices & Seasonings (15)
  | "cinnamon" | "nutmeg" | "cloves" | "cardamom" | "allspice"
  | "black_pepper" | "white_pepper" | "paprika" | "cayenne" | "chili"
  | "mint" | "rosemary" | "thyme" | "oregano" | "basil"
  
  // Rare Elements (12)
  | "meteorite_fragment" | "lightning_glass" | "volcanic_ash" | "glacier_ice"
  | "amber" | "coral" | "pearl" | "jade" | "moonstone"
  | "ancient_fossil" | "dragon_scale" | "phoenix_feather";

export interface WorldResource {
  id: string;
  type: ResourceType;
  category: ResourceCategory;
  position: { x: number; y: number; z: number };
  quantity: number;
  harvestable: boolean;
  regeneratesOverTime: boolean;
  quality: number; // 0-100
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  traits: ResourceTraits; // Scored traits 0-100
}

export interface WorldState {
  animals: Animal[];
  resources: WorldResource[];
  buildings: Building[];
  environment: {
    temperature: number;
    humidity: number;
    timeOfDay: "dawn" | "day" | "dusk" | "night";
    weather: "clear" | "cloudy" | "rainy" | "stormy";
  };
  events: Array<{
    id: string;
    type: string;
    message: string;
    timestamp: number;
    animalId?: string;
  }>;
}

// Resource scored trait definitions by type (0-100 for each trait)
const RESOURCE_TRAIT_MAP: Record<ResourceType, ResourceTraits> = {
  // Minerals & Stones
  "granite": { durable: 90, waterproof: 70 },
  "limestone": { durable: 75, absorbent: 80 },
  "sandstone": { durable: 60, absorbent: 85 },
  "slate": { durable: 85, waterproof: 90, sharp: 30 },
  "marble": { beautiful: 85, durable: 80, valuable: 60 },
  "obsidian": { sharp: 95, beautiful: 70, durable: 50 },
  "iron_ore": { durable: 85, conductive: 70, malleable: 65 },
  "copper_ore": { malleable: 80, conductive: 90, beautiful: 50 },
  "gold_ore": { valuable: 95, beautiful: 85, malleable: 90, conductive: 80 },
  "silver_ore": { valuable: 80, beautiful: 75, malleable: 85, conductive: 85 },
  "tin_ore": { malleable: 75, conductive: 60 },
  "quartz_crystal": { beautiful: 80, magical: 40, sharp: 60 },
  "amethyst": { beautiful: 90, magical: 60, valuable: 70 },
  "ruby": { beautiful: 95, valuable: 90, magical: 30 },
  "emerald": { beautiful: 95, valuable: 95, magical: 35 },
  "diamond": { beautiful: 100, valuable: 100, durable: 100, sharp: 85 },
  "coal": { flammable: 95, energizing: 70 },
  "salt": { preservative: 85, valuable: 20 },

  // Organic Materials - Woods
  "oak_wood": { durable: 85, flammable: 60 },
  "pine_wood": { fragrant: 70, flammable: 80, durable: 50 },
  "birch_wood": { beautiful: 60, malleable: 70, flammable: 70 },
  "cedar_wood": { fragrant: 85, durable: 75, insulating: 60 },
  "bamboo": { malleable: 80, durable: 60, beautiful: 50 },

  // Organic Materials - Textiles & Animal Products
  "cotton": { absorbent: 85, insulating: 40 },
  "wool": { insulating: 90, warm: 85, absorbent: 70 },
  "silk": { beautiful: 80, valuable: 70, malleable: 60 },
  "hemp": { durable: 80, malleable: 65 },
  "flax": { absorbent: 80, malleable: 70 },
  "animal_hide": { durable: 75, waterproof: 60, insulating: 50 },
  "leather": { durable: 85, waterproof: 80, beautiful: 40 },
  "fur": { insulating: 95, warm: 90, beautiful: 60 },
  "feathers": { insulating: 85, waterproof: 60 },
  "bone": { durable: 70, sharp: 40 },

  // Organic Materials - Natural Substances  
  "honeycomb": { sweet: 90, nutritious: 70, preservative: 40 },
  "beeswax": { waterproof: 85, malleable: 75, fragrant: 50, preservative: 60 },
  "resin": { waterproof: 90, fragrant: 60, preservative: 80 },
  "sap": { sweet: 60, nutritious: 40 },
  "moss": { absorbent: 90, insulating: 30 },

  // Edible Plants - Berries
  "blueberries": { sweet: 80, nutritious: 85, beautiful: 50, refreshing: 70 },
  "strawberries": { sweet: 85, nutritious: 75, fragrant: 70, beautiful: 70 },
  "blackberries": { sweet: 75, nutritious: 80, beautiful: 50 },
  "raspberries": { sweet: 80, nutritious: 75, fragrant: 65, beautiful: 60 },
  "elderberries": { bitter: 70, healing: 60, nutritious: 70 },

  // Edible Plants - Fruits
  "apples": { sweet: 70, nutritious: 80, refreshing: 60 },
  "pears": { sweet: 75, nutritious: 70, refreshing: 65 },
  "cherries": { sweet: 85, nutritious: 65, beautiful: 70 },
  "plums": { sweet: 80, nutritious: 70 },
  "grapes": { sweet: 85, nutritious: 70, beautiful: 60 },

  // Edible Plants - Nuts
  "acorns": { nutritious: 75, bitter: 50 },
  "walnuts": { nutritious: 90, energizing: 80 },
  "hazelnuts": { nutritious: 85, sweet: 60 },
  "chestnuts": { nutritious: 80, sweet: 70, warm: 40 },
  "pine_nuts": { nutritious: 85, energizing: 75, valuable: 60 },

  // Edible Plants - Vegetables
  "wild_carrots": { nutritious: 80, sweet: 40 },
  "wild_onions": { nutritious: 60, healing: 30 },
  "mushrooms": { nutritious: 70 },
  "turnips": { nutritious: 65, bitter: 40 },
  "radishes": { nutritious: 50, bitter: 60 },

  // Edible Plants - Grains
  "wild_rice": { nutritious: 85, energizing: 70 },
  "barley": { nutritious: 80, energizing: 75 },
  "wheat": { nutritious: 85, energizing: 80 },
  "oats": { nutritious: 80, energizing: 75, warm: 30 },
  "millet": { nutritious: 75, energizing: 70 },

  // Medicinal Herbs - Healing
  "aloe_vera": { healing: 85, calming: 60, refreshing: 70 },
  "chamomile": { healing: 70, calming: 90, fragrant: 75 },
  "echinacea": { healing: 80, bitter: 60 },
  "ginseng": { energizing: 90, healing: 75, valuable: 80, ancient: 85 },
  "willow_bark": { healing: 80, bitter: 70 },

  // Medicinal Herbs - Energy & Stimulant
  "ginkgo": { energizing: 70, ancient: 90 },
  "guarana": { energizing: 95, exotic: 70 },
  "green_tea": { energizing: 60, refreshing: 80, fragrant: 50 },
  "yerba_mate": { energizing: 85, bitter: 50, exotic: 60 },
  "gotu_kola": { energizing: 65, healing: 50 },

  // Medicinal Herbs - Calming
  "lavender": { calming: 95, fragrant: 90, beautiful: 75 },
  "valerian": { calming: 85, healing: 40 },
  "passionflower": { calming: 80, beautiful: 70 },
  "lemon_balm": { calming: 75, fragrant: 70, refreshing: 60 },
  "sage": { fragrant: 70, healing: 40, sacred: 60 },

  // Medicinal Herbs - Immune & Health
  "elderflower": { healing: 60, fragrant: 80, beautiful: 60 },
  "astragalus": { healing: 75, energizing: 50 },
  "cats_claw": { healing: 70, exotic: 80 },
  "turmeric": { healing: 80, warm: 70, bitter: 40 },
  "garlic": { healing: 60 },

  // Spices & Seasonings - Common
  "black_pepper": { warm: 80, preservative: 40 },
  "mint": { refreshing: 90, fragrant: 80, calming: 30 },
  "rosemary": { fragrant: 85, preservative: 70 },
  "thyme": { fragrant: 75, healing: 30, preservative: 60 },
  "oregano": { fragrant: 70, preservative: 50 },
  "basil": { fragrant: 90, sweet: 40 },
  "paprika": { beautiful: 60, warm: 50 },
  "chili": { warm: 95, energizing: 40 },

  // Spices & Seasonings - Uncommon
  "white_pepper": { warm: 85 },
  "cayenne": { warm: 100, energizing: 50 },
  "cinnamon": { sweet: 70, warm: 85, fragrant: 80 },
  "nutmeg": { warm: 75, fragrant: 70, sweet: 40 },
  "allspice": { warm: 80, fragrant: 75, sweet: 50 },

  // Spices & Seasonings - Rare
  "cloves": { fragrant: 90, warm: 80, healing: 40, valuable: 50 },
  "cardamom": { fragrant: 95, sweet: 60, valuable: 70, exotic: 80 },

  // Rare Elements - Epic
  "meteorite_fragment": { ancient: 100, magical: 80, valuable: 85, exotic: 95 },
  "lightning_glass": { sharp: 80, magical: 90, beautiful: 85, valuable: 75 },
  "volcanic_ash": { ancient: 60, magical: 40, valuable: 30 },
  "glacier_ice": { ancient: 80, refreshing: 100, valuable: 40 },
  "amber": { ancient: 95, beautiful: 80, preservative: 90, valuable: 75 },
  "coral": { beautiful: 85, ancient: 70, valuable: 60, exotic: 70 },
  "pearl": { beautiful: 95, valuable: 90, sacred: 40 },
  "jade": { beautiful: 85, sacred: 80, valuable: 75, magical: 50 },

  // Rare Elements - Legendary
  "moonstone": { magical: 95, beautiful: 90, sacred: 85, valuable: 85 },
  "ancient_fossil": { ancient: 100, valuable: 80, sacred: 70 },
  "dragon_scale": { durable: 100, magical: 100, beautiful: 95, valuable: 100, ancient: 90 },
  "phoenix_feather": { magical: 100, healing: 90, beautiful: 95, sacred: 95, ancient: 85 }
};

export class GameManager {
  private config: GameConfig;
  private healthMonitor: HealthMonitor;
  private breedingSystem: BreedingSystem;
  private worldState: WorldState;
  private websocketServer: any;
  private gameRunning: boolean = false;

  private getItemWeight(item: any): number {
    const baseWeight = item.type === "material" ? 0.5 : 
                      item.type === "rare" ? 0.3 :
                      item.type === "medicinal" ? 0.1 :
                      item.type === "spice" ? 0.05 : 0.2;
    
    const rarityMultiplier = item.rarity === "legendary" ? 1.5 :
                            item.rarity === "epic" ? 1.3 :
                            item.rarity === "rare" ? 1.2 :
                            item.rarity === "uncommon" ? 1.1 : 1.0;
    
    return item.quantity * baseWeight * rarityMultiplier;
  }

  constructor(config: Partial<GameConfig> = {}) {
    this.config = {
      maxAnimals: 50,
      startingAnimals: 3,
      worldSize: { width: 100, height: 10, depth: 100 },
      enableWebSocket: true,
      webSocketPort: 8080,
      ...config,
    };

    this.healthMonitor = new HealthMonitor();
    this.healthMonitor.setGameManagerReference(this);
    this.breedingSystem = new BreedingSystem();
    this.worldState = this.initializeWorld();

    // Subscribe to animal state updates to keep world state in sync
    animalStateManager.subscribe("game-manager", (update) => {
      this.handleAnimalStateUpdate(update);
    });

    if (this.config.enableWebSocket) {
      this.setupWebSocketServer();
    }
  }

  private initializeWorld(): WorldState {
    return {
      animals: [],
      resources: this.generateInitialResources(),
      buildings: [],
      environment: {
        temperature: 72,
        humidity: 0.6,
        timeOfDay: "day",
        weather: "clear",
      },
      events: [],
    };
  }

  private generateInitialResources(): WorldResource[] {
    const resources: WorldResource[] = [];
    const { width, depth } = this.config.worldSize;
    const existingPositions: Array<{ x: number; z: number }> = [];
    const minDistance = 15;

    const getValidPosition = (): { x: number; y: number; z: number } => {
      let attempts = 0;
      let position: { x: number; z: number };

      do {
        position = {
          x: (Math.random() - 0.5) * width * 0.8,
          z: (Math.random() - 0.5) * depth * 0.8,
        };
        attempts++;
      } while (
        attempts < 50 &&
        existingPositions.some(
          (existing) =>
            Math.sqrt(
              Math.pow(existing.x - position.x, 2) +
                Math.pow(existing.z - position.z, 2)
            ) < minDistance
        )
      );

      existingPositions.push(position);
      return { x: position.x, y: 0, z: position.z };
    };

    const createResource = (
      id: string,
      type: ResourceType,
      category: ResourceCategory,
      rarity: "common" | "uncommon" | "rare" | "epic" | "legendary",
      baseQuantity: number,
      regenerates: boolean
    ): WorldResource => ({
      id,
      type,
      category,
      position: getValidPosition(),
      quantity: baseQuantity + Math.random() * baseQuantity * 0.5,
      harvestable: true,
      regeneratesOverTime: regenerates,
      quality: 40 + Math.random() * 60,
      rarity,
      traits: RESOURCE_TRAIT_MAP[type] || {}
    });

    // MINERALS & STONES (Common: 8, Uncommon: 6, Rare: 4)
    const commonStones: ResourceType[] = ["granite", "limestone", "sandstone", "slate", "coal", "salt", "iron_ore", "copper_ore"];
    const uncommonStones: ResourceType[] = ["marble", "obsidian", "tin_ore", "quartz_crystal", "gold_ore", "silver_ore"];
    const rareStones: ResourceType[] = ["amethyst", "ruby", "emerald", "diamond"];

    commonStones.forEach((stone, i) => {
      for (let j = 0; j < 3; j++) {
        resources.push(createResource(`${stone}_${i}_${j}`, stone, "minerals_stones", "common", 8, false));
      }
    });

    uncommonStones.forEach((stone, i) => {
      for (let j = 0; j < 2; j++) {
        resources.push(createResource(`${stone}_${i}_${j}`, stone, "minerals_stones", "uncommon", 5, false));
      }
    });

    rareStones.forEach((stone, i) => {
      resources.push(createResource(`${stone}_${i}`, stone, "minerals_stones", "rare", 3, false));
    });

    // ORGANIC MATERIALS (Common: 10, Uncommon: 8, Rare: 2)
    const commonOrganics: ResourceType[] = ["oak_wood", "pine_wood", "birch_wood", "cotton", "wool", "animal_hide", "bone", "moss", "sap", "resin"];
    const uncommonOrganics: ResourceType[] = ["cedar_wood", "bamboo", "silk", "hemp", "flax", "leather", "fur", "feathers"];
    const rareOrganics: ResourceType[] = ["honeycomb", "beeswax"];

    commonOrganics.forEach((organic, i) => {
      for (let j = 0; j < 2; j++) {
        resources.push(createResource(`${organic}_${i}_${j}`, organic, "organic_materials", "common", 6, organic.includes("wood") || organic === "moss"));
      }
    });

    uncommonOrganics.forEach((organic, i) => {
      resources.push(createResource(`${organic}_${i}`, organic, "organic_materials", "uncommon", 4, false));
    });

    rareOrganics.forEach((organic, i) => {
      resources.push(createResource(`${organic}_${i}`, organic, "organic_materials", "rare", 2, true));
    });

    // EDIBLE PLANTS (Common: 15, Uncommon: 8, Rare: 2)
    const commonEdibles: ResourceType[] = ["blueberries", "strawberries", "blackberries", "apples", "pears", "acorns", "wild_carrots", "wild_onions", "mushrooms", "turnips", "radishes", "wild_rice", "barley", "wheat", "oats"];
    const uncommonEdibles: ResourceType[] = ["raspberries", "elderberries", "cherries", "plums", "grapes", "walnuts", "hazelnuts", "millet"];
    const rareEdibles: ResourceType[] = ["chestnuts", "pine_nuts"];

    commonEdibles.forEach((edible, i) => {
      for (let j = 0; j < 2; j++) {
        resources.push(createResource(`${edible}_${i}_${j}`, edible, "edible_plants", "common", 4, true));
      }
    });

    uncommonEdibles.forEach((edible, i) => {
      resources.push(createResource(`${edible}_${i}`, edible, "edible_plants", "uncommon", 3, true));
    });

    rareEdibles.forEach((edible, i) => {
      resources.push(createResource(`${edible}_${i}`, edible, "edible_plants", "rare", 2, false));
    });

    // MEDICINAL HERBS (Common: 8, Uncommon: 8, Rare: 4)
    const commonHerbs: ResourceType[] = ["chamomile", "lavender", "mint", "sage", "garlic", "green_tea", "lemon_balm", "elderflower"];
    const uncommonHerbs: ResourceType[] = ["aloe_vera", "echinacea", "valerian", "passionflower", "ginkgo", "guarana", "yerba_mate", "astragalus"];
    const rareHerbs: ResourceType[] = ["ginseng", "willow_bark", "gotu_kola", "cats_claw", "turmeric"];

    commonHerbs.forEach((herb, i) => {
      resources.push(createResource(`${herb}_${i}`, herb, "medicinal_herbs", "common", 3, true));
    });

    uncommonHerbs.forEach((herb, i) => {
      resources.push(createResource(`${herb}_${i}`, herb, "medicinal_herbs", "uncommon", 2, true));
    });

    rareHerbs.forEach((herb, i) => {
      resources.push(createResource(`${herb}_${i}`, herb, "medicinal_herbs", "rare", 1, false));
    });

    // SPICES & SEASONINGS (Common: 8, Uncommon: 5, Rare: 2)
    const commonSpices: ResourceType[] = ["black_pepper", "mint", "rosemary", "thyme", "oregano", "basil", "paprika", "chili"];
    const uncommonSpices: ResourceType[] = ["white_pepper", "cayenne", "cinnamon", "nutmeg", "allspice"];
    const rareSpices: ResourceType[] = ["cloves", "cardamom"];

    commonSpices.forEach((spice, i) => {
      resources.push(createResource(`${spice}_${i}`, spice, "spices_seasonings", "common", 2, true));
    });

    uncommonSpices.forEach((spice, i) => {
      resources.push(createResource(`${spice}_${i}`, spice, "spices_seasonings", "uncommon", 1, false));
    });

    rareSpices.forEach((spice, i) => {
      resources.push(createResource(`${spice}_${i}`, spice, "spices_seasonings", "rare", 1, false));
    });

    // RARE ELEMENTS (Epic: 8, Legendary: 4)
    const epicElements: ResourceType[] = ["meteorite_fragment", "lightning_glass", "volcanic_ash", "glacier_ice", "amber", "coral", "pearl", "jade"];
    const legendaryElements: ResourceType[] = ["moonstone", "ancient_fossil", "dragon_scale", "phoenix_feather"];

    epicElements.forEach((element, i) => {
      if (Math.random() < 0.3) { // 30% chance to spawn
        resources.push(createResource(`${element}_${i}`, element, "rare_elements", "epic", 1, false));
      }
    });

    legendaryElements.forEach((element, i) => {
      if (Math.random() < 0.1) { // 10% chance to spawn
        resources.push(createResource(`${element}_${i}`, element, "rare_elements", "legendary", 1, false));
      }
    });

    // Generate shelter locations
    // for (let i = 0; i < 4; i++) {
    //   resources.push({
    //     id: `shelter_${i}`,
    //     type: "shelter" as const,
    //     position: getValidPosition(),
    //     quantity: 1,
    //     harvestable: false,
    //     regeneratesOverTime: false,
    //     quality: 70 + Math.random() * 30,
    //   });
    // }

    return resources;
  }

  private handleAnimalStateUpdate(update: any): void {
    const animalIndex = this.worldState.animals.findIndex(
      (a) => a.id === update.animalId
    );

    if (update.type === "full") {
      if (animalIndex >= 0 && Object.keys(update.data).length === 0) {
        // Animal removed
        this.worldState.animals.splice(animalIndex, 1);
      } else if (animalIndex >= 0) {
        // Animal updated
        this.worldState.animals[animalIndex] = { ...(update.data as Animal) };
      } else if (Object.keys(update.data).length > 0) {
        // New animal added
        this.worldState.animals.push(update.data as Animal);
      }
    } else if (animalIndex >= 0) {
      // Partial update
      this.worldState.animals[animalIndex] = {
        ...this.worldState.animals[animalIndex],
        ...update.data,
      };
    }

    // Broadcast position updates to WebSocket clients
    if (
      this.websocketServer &&
      (update.type === "position" || update.type === "action")
    ) {
      const animal = animalStateManager.getAnimal(update.animalId);
      if (animal) {
        this.websocketServer.updateAnimal(animal);
      }
    }
  }

  private setupWebSocketServer() {
    try {
      // Dynamic import for server-side WebSocket
      const GameWebSocketServer = require("../../server.js");
      this.websocketServer = new GameWebSocketServer(this.config.webSocketPort);
      this.websocketServer.start();

      console.log(
        `🌐 WebSocket server started on port ${this.config.webSocketPort}`
      );
    } catch (error) {
      console.warn("Could not start WebSocket server:", error);
    }
  }

  async startGame(): Promise<void> {
    if (this.gameRunning) {
      console.log("Game is already running");
      return;
    }

    console.log("🌌 Starting Universe game...");
    this.gameRunning = true;

    // Create initial animals
    for (let i = 0; i < this.config.startingAnimals; i++) {
      await this.spawnRandomAnimal();
    }

    // Start health monitoring
    this.healthMonitor.startMonitoring();

    // Start world simulation loops
    this.startEnvironmentUpdates();
    this.startResourceRegeneration();
    this.startBreedingCycles();

    console.log(
      `🎮 Universe game started with ${this.config.startingAnimals} animals!`
    );
    this.addEvent("system", "Universe game started!");
  }

  stopGame(): void {
    console.log("🛑 Stopping Universe game...");
    this.gameRunning = false;

    this.healthMonitor.stopMonitoring();

    if (this.websocketServer) {
      this.websocketServer.stop();
    }

    this.addEvent("system", "Universe game stopped");
  }

  async spawnRandomAnimal(): Promise<Animal | null> {
    if (animalStateManager.getAllAnimals().length >= this.config.maxAnimals) {
      console.log("Maximum animal capacity reached");
      return null;
    }

    const name = AnimalLifecycle.generateRandomName();
    const position = this.getRandomSafePosition();

    const animal = AnimalLifecycle.createAnimal(name, position);

    // Register with health monitor (which will add to state manager)
    this.healthMonitor.addAnimal(animal);

    // Broadcast to clients
    if (this.websocketServer) {
      this.websocketServer.updateAnimal(animal);
    }

    this.addEvent("birth", `${name} was born!`, animal.id);
    console.log(
      `🐾 ${name} spawned at position (${position.x.toFixed(
        1
      )}, ${position.z.toFixed(1)})`
    );

    return animal;
  }

  async spawnOffspring(
    parent1: Animal,
    parent2: Animal
  ): Promise<Animal | null> {
    if (this.worldState.animals.length >= this.config.maxAnimals) {
      return null;
    }

    const name = AnimalLifecycle.generateRandomName();
    const position = {
      x:
        (parent1.position.x + parent2.position.x) / 2 +
        (Math.random() - 0.5) * 5,
      y: 0,
      z:
        (parent1.position.z + parent2.position.z) / 2 +
        (Math.random() - 0.5) * 5,
      rotation: 0,
    };

    const animal = AnimalLifecycle.createAnimal(name, position, [
      parent1.dna,
      parent2.dna,
    ]);

    this.worldState.animals.push(animal);
    this.healthMonitor.addAnimal(animal);

    if (this.websocketServer) {
      this.websocketServer.updateAnimal(animal);
    }

    this.addEvent(
      "birth",
      `${name} was born to ${parent1.name} and ${parent2.name}!`,
      animal.id
    );
    console.log(`👶 ${name} born from ${parent1.name} and ${parent2.name}!`);

    return animal;
  }

  removeAnimal(animalId: string): void {
    const animalIndex = this.worldState.animals.findIndex(
      (a) => a.id === animalId
    );
    if (animalIndex === -1) return;

    const animal = this.worldState.animals[animalIndex];
    this.worldState.animals.splice(animalIndex, 1);

    this.healthMonitor.removeAnimal(animalId);

    if (this.websocketServer) {
      this.websocketServer.broadcastToClients({
        type: "animalRemoved",
        data: { animalId, animal },
      });
    }

    this.addEvent("death", `${animal.name} has passed away`, animalId);
    console.log(`💀 ${animal.name} has been removed from the world`);
  }

  private getRandomSafePosition() {
    const { width, depth } = this.config.worldSize;
    return {
      x: (Math.random() - 0.5) * width * 0.8,
      y: 0,
      z: (Math.random() - 0.5) * depth * 0.8,
      rotation: Math.random() * Math.PI * 2,
    };
  }

  private startEnvironmentUpdates(): void {
    // Update environment every 5 minutes
    setInterval(() => {
      if (!this.gameRunning) return;

      this.updateEnvironment();
    }, 5 * 60 * 1000);
  }

  private startResourceRegeneration(): void {
    // Regenerate resources every 2 minutes
    setInterval(() => {
      if (!this.gameRunning) return;

      this.regenerateResources();
    }, 2 * 60 * 1000);
  }

  private startBreedingCycles(): void {
    // Check for breeding opportunities every 3 minutes
    setInterval(() => {
      if (!this.gameRunning) return;

      this.performBreedingCycle();
    }, 3 * 60 * 1000);
  }

  private updateEnvironment(): void {
    const env = this.worldState.environment;

    // Simple time progression
    const timeProgression = ["dawn", "day", "dusk", "night"] as const;
    const currentIndex = timeProgression.indexOf(env.timeOfDay);
    env.timeOfDay =
      timeProgression[(currentIndex + 1) % timeProgression.length];

    // Random weather changes
    if (Math.random() < 0.3) {
      const weathers = ["clear", "cloudy", "rainy", "stormy"] as const;
      env.weather = weathers[Math.floor(Math.random() * weathers.length)];
    }

    // Temperature and humidity variations
    env.temperature += (Math.random() - 0.5) * 10;
    env.temperature = Math.max(32, Math.min(100, env.temperature));

    env.humidity += (Math.random() - 0.5) * 0.2;
    env.humidity = Math.max(0.1, Math.min(1.0, env.humidity));

    this.addEvent(
      "environment",
      `Time changed to ${env.timeOfDay}, weather is ${env.weather}`
    );

    if (this.websocketServer) {
      this.websocketServer.broadcastToClients({
        type: "environmentUpdate",
        data: env,
      });
    }
  }

  private regenerateResources(): void {
    this.worldState.resources.forEach((resource) => {
      if (resource.regeneratesOverTime) {
        const maxQuantity = resource.rarity === "legendary" ? 3 : 
                           resource.rarity === "epic" ? 5 :
                           resource.rarity === "rare" ? 8 : 
                           resource.rarity === "uncommon" ? 12 : 15;
        
        if (resource.quantity < maxQuantity * 0.7) {
          const regenAmount = Math.random() * (maxQuantity * 0.3);
          resource.quantity = Math.min(maxQuantity, resource.quantity + regenAmount);
        }
      }
    });

    if (this.websocketServer) {
      this.websocketServer.broadcastToClients({
        type: "resourcesUpdated",
        data: this.worldState.resources,
      });
    }
  }

  harvestResource(
    resourceId: string,
    amount: number = 1
  ): { success: boolean; item?: any } {
    const resource = this.worldState.resources.find((r) => r.id === resourceId);
    if (!resource || !resource.harvestable || resource.quantity < amount) {
      return { success: false };
    }

    resource.quantity -= amount;

    const getItemType = (category: ResourceCategory): InventoryItem["type"] => {
      switch (category) {
        case "edible_plants": return "food";
        case "medicinal_herbs": return "medicinal";
        case "spices_seasonings": return "spice";
        case "rare_elements": return "rare";
        case "minerals_stones":
        case "organic_materials":
        default: return "material";
      }
    };

    const harvestedItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: getItemType(resource.category),
      name: resource.type.replace(/_/g, ' '),
      quantity: amount,
      quality: resource.quality,
      harvestedAt: Date.now(),
      rarity: resource.rarity,
      traits: resource.traits,
    };

    return { success: true, item: harvestedItem };
  }

  addItemToAnimalInventory(animalId: string, item: any): boolean {
    const animal = this.healthMonitor.getAnimal(animalId);
    if (!animal) return false;

    const itemWeight = this.getItemWeight(item);

    if (
      animal.inventory.currentWeight + itemWeight >
      animal.inventory.maxCapacity
    ) {
      return false;
    }

    // Check if we can stack with existing item (same type, name, quality, and traits)
    const existingItem = animal.inventory.items.find(
      (i) =>
        i.type === item.type &&
        i.name === item.name &&
        i.quality === item.quality &&
        JSON.stringify(i.traits || {}) === JSON.stringify(item.traits || {})
    );

    if (existingItem) {
      existingItem.quantity += item.quantity;
    } else {
      animal.inventory.items.push(item);
    }

    animal.inventory.currentWeight += itemWeight;
    return true;
  }

  consumeItemFromInventory(
    animalId: string,
    itemType: string,
    amount: number = 1
  ): boolean {
    const animal = this.healthMonitor.getAnimal(animalId);
    if (!animal) return false;

    const item = animal.inventory.items.find(
      (i) => i.type === itemType && i.quantity >= amount
    );
    if (!item) return false;

    const consumeItem = { ...item, quantity: amount };
    const itemWeight = this.getItemWeight(consumeItem);

    item.quantity -= amount;
    animal.inventory.currentWeight -= itemWeight;

    if (item.quantity <= 0) {
      const index = animal.inventory.items.indexOf(item);
      animal.inventory.items.splice(index, 1);
    }

    return true;
  }

  private addEvent(type: string, message: string, animalId?: string): void {
    const event = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      message,
      timestamp: Date.now(),
      animalId,
    };

    this.worldState.events.unshift(event);

    // Keep only last 100 events
    if (this.worldState.events.length > 100) {
      this.worldState.events = this.worldState.events.slice(0, 100);
    }

    if (this.websocketServer) {
      this.websocketServer.broadcastToClients({
        type: "newEvent",
        data: event,
      });
    }
  }

  getWorldState(): WorldState {
    // Sync buildings from building system
    this.worldState.buildings = buildingSystem.getAllBuildings();
    return { ...this.worldState };
  }

  getAnimal(animalId: string): Animal | undefined {
    // Get the most up-to-date animal from the health monitor
    return this.healthMonitor.getAnimal(animalId);
  }

  getAllAnimals(): Animal[] {
    // Get the most up-to-date animals from the health monitor
    return this.healthMonitor.getAllAnimals();
  }

  getAnimalsByPosition(x: number, z: number, radius: number = 10): Animal[] {
    // Use up-to-date animals from health monitor
    return this.healthMonitor.getAllAnimals().filter((animal) => {
      const distance = Math.sqrt(
        Math.pow(animal.position.x - x, 2) + Math.pow(animal.position.z - z, 2)
      );
      return distance <= radius;
    });
  }

  findNearestResource(
    position: { x: number; z: number },
    resourceType: string
  ) {
    let nearest = null;
    let minDistance = Infinity;

    for (const resource of this.worldState.resources) {
      if (resource.type === resourceType && resource.quantity > 0) {
        const distance = Math.sqrt(
          Math.pow(resource.position.x - position.x, 2) +
            Math.pow(resource.position.z - position.z, 2)
        );

        if (distance < minDistance) {
          minDistance = distance;
          nearest = resource;
        }
      }
    }

    return nearest;
  }

  consumeResource(resourceId: string, amount: number = 1): boolean {
    const resource = this.worldState.resources.find((r) => r.id === resourceId);
    if (!resource || resource.quantity < amount) {
      return false;
    }

    resource.quantity -= amount;
    return true;
  }

  private performBreedingCycle(): void {
    const breedingResults = this.breedingSystem.autoBreeding(
      this.worldState.animals
    );

    for (const result of breedingResults) {
      if (result.success && result.offspring) {
        // Add offspring to world
        this.worldState.animals.push(result.offspring);
        this.healthMonitor.addAnimal(result.offspring);

        if (this.websocketServer) {
          this.websocketServer.updateAnimal(result.offspring);
        }

        console.log(`🐣 ${result.message}`);
      }

      this.addEvent("breeding", result.message);
    }

    if (breedingResults.length > 0) {
      console.log(
        `💕 Breeding cycle completed: ${
          breedingResults.filter((r) => r.success).length
        } successful births`
      );
    }
  }

  getBreedingSystem(): BreedingSystem {
    return this.breedingSystem;
  }

  getPlanningManager() {
    return clientPlanningManager;
  }
}
