import type { Animal, InventoryItem, CraftingIngredient } from "../types/animal";
import type { ResourceType, ResourceTraits } from "./game-manager";

export interface CurrencyValues {
  basePrices: Record<ResourceType, number>;
  rarityMultipliers: Record<string, number>;
  qualityMultipliers: (quality: number) => number;
  traitBonuses: Record<string, number>;
}

// Base currency values for each resource type
const BASE_CURRENCY_VALUES: Record<ResourceType, number> = {
  // Minerals & Stones (10-100 base value)
  granite: 15,
  limestone: 12,
  sandstone: 10,
  slate: 18,
  marble: 45,
  obsidian: 35,
  iron_ore: 25,
  copper_ore: 20,
  gold_ore: 80,
  silver_ore: 60,
  tin_ore: 15,
  quartz_crystal: 30,
  amethyst: 120,
  ruby: 200,
  emerald: 220,
  diamond: 500,
  coal: 8,
  salt: 5,

  // Organic Materials - Woods (8-25 base value)
  oak_wood: 12,
  pine_wood: 8,
  birch_wood: 10,
  cedar_wood: 15,
  bamboo: 10,

  // Organic Materials - Textiles & Animal Products (10-60 base value)
  cotton: 12,
  wool: 18,
  silk: 45,
  hemp: 10,
  flax: 8,
  animal_hide: 15,
  leather: 25,
  fur: 35,
  feathers: 12,
  bone: 8,

  // Organic Materials - Natural Substances (5-40 base value)
  honeycomb: 25,
  beeswax: 20,
  resin: 15,
  sap: 5,
  moss: 3,

  // Edible Plants - Berries (3-8 base value)
  blueberries: 6,
  strawberries: 7,
  blackberries: 5,
  raspberries: 7,
  elderberries: 8,

  // Edible Plants - Fruits (4-12 base value)
  apples: 5,
  pears: 5,
  cherries: 8,
  plums: 6,
  grapes: 7,

  // Edible Plants - Nuts (8-25 base value)
  acorns: 4,
  walnuts: 15,
  hazelnuts: 12,
  chestnuts: 10,
  pine_nuts: 20,

  // Edible Plants - Vegetables (2-6 base value)
  wild_carrots: 3,
  wild_onions: 4,
  mushrooms: 8,
  turnips: 2,
  radishes: 2,

  // Edible Plants - Grains (5-12 base value)
  wild_rice: 8,
  barley: 6,
  wheat: 7,
  oats: 6,
  millet: 5,

  // Medicinal Herbs - Healing (15-80 base value)
  aloe_vera: 20,
  chamomile: 15,
  echinacea: 25,
  ginseng: 80,
  willow_bark: 18,

  // Medicinal Herbs - Energy & Stimulant (12-50 base value)
  ginkgo: 35,
  guarana: 40,
  green_tea: 12,
  yerba_mate: 25,
  gotu_kola: 30,

  // Medicinal Herbs - Calming (10-35 base value)
  lavender: 25,
  valerian: 20,
  passionflower: 18,
  lemon_balm: 15,
  sage: 12,

  // Medicinal Herbs - Immune & Health (15-40 base value)
  elderflower: 15,
  astragalus: 30,
  cats_claw: 35,
  turmeric: 25,
  garlic: 8,

  // Spices & Seasonings - Common (5-15 base value)
  black_pepper: 12,
  mint: 8,
  rosemary: 10,
  thyme: 9,
  oregano: 8,
  basil: 10,
  paprika: 12,
  chili: 10,

  // Spices & Seasonings - Uncommon (12-25 base value)
  white_pepper: 15,
  cayenne: 14,
  cinnamon: 20,
  nutmeg: 22,
  allspice: 18,

  // Spices & Seasonings - Rare (30-60 base value)
  cloves: 35,
  cardamom: 50,

  // Rare Elements - Epic (100-300 base value)
  meteorite_fragment: 250,
  lightning_glass: 200,
  volcanic_ash: 100,
  glacier_ice: 150,
  amber: 180,
  coral: 160,
  pearl: 220,
  jade: 200,

  // Rare Elements - Legendary (400-1000 base value)
  moonstone: 600,
  ancient_fossil: 500,
  dragon_scale: 1000,
  phoenix_feather: 800,
};

// Rarity multipliers for final currency value
const RARITY_MULTIPLIERS = {
  common: 1.0,
  uncommon: 1.5,
  rare: 2.5,
  epic: 4.0,
  legendary: 8.0,
};

// Quality affects value (0-100 quality maps to 0.5x - 2.0x multiplier)
const getQualityMultiplier = (quality: number): number => {
  return 0.5 + (quality / 100) * 1.5;
};

// Trait bonuses add percentage to base value
const TRAIT_BONUSES = {
  beautiful: 0.3,
  valuable: 0.5,
  ancient: 0.4,
  sacred: 0.3,
  magical: 0.6,
  exotic: 0.25,
  rare: 0.2,
  durable: 0.15,
  healing: 0.2,
  energizing: 0.15,
  nutritious: 0.1,
  fragrant: 0.1,
  sweet: 0.05,
  sharp: 0.1,
  malleable: 0.1,
  preservative: 0.1,
};

export class CurrencySystem {
  /**
   * Calculate the currency value of a single inventory item
   */
  static calculateItemValue(item: InventoryItem): number {
    let baseValue: number;

    // For crafted items, calculate value based on ingredients
    if (this.isCraftedItem(item) && item.craftingIngredients) {
      baseValue = this.calculateCraftedItemBaseValue(item.craftingIngredients);
    } else {
      // Get base value for the resource type
      const baseName = item.name.replace(/\s+/g, "_").toLowerCase() as ResourceType;
      baseValue = BASE_CURRENCY_VALUES[baseName] || 10; // Default to 10 if not found
    }

    // Apply rarity multiplier
    const rarityMultiplier = RARITY_MULTIPLIERS[item.rarity || "common"];
    baseValue *= rarityMultiplier;

    // Apply quality multiplier
    const qualityMultiplier = getQualityMultiplier(item.quality);
    baseValue *= qualityMultiplier;

    // Apply trait bonuses
    let traitBonus = 1.0;
    if (item.traits) {
      Object.entries(item.traits).forEach(([trait, value]) => {
        const bonusPercentage = TRAIT_BONUSES[trait as keyof typeof TRAIT_BONUSES] || 0;
        // Trait value (0-100) affects how much of the bonus applies
        traitBonus += bonusPercentage * (value / 100);
      });
    }
    baseValue *= traitBonus;

    // Crafted items get significant bonus (they're more valuable than raw materials)
    if (this.isCraftedItem(item)) {
      baseValue *= 1.8; // 80% bonus for crafted items (making ring worth ~1.8x emerald)
    }

    return Math.round(baseValue * item.quantity);
  }

  /**
   * Calculate total currency value of an animal's inventory
   */
  static calculateAnimalWealth(animal: Animal): number {
    return animal.inventory.items.reduce((total, item) => {
      return total + this.calculateItemValue(item);
    }, 0);
  }

  /**
   * Get currency leaderboard of all animals
   */
  static getLeaderboard(animals: Animal[]): Array<{
    animal: Animal;
    wealth: number;
    rank: number;
  }> {
    const wealthData = animals
      .filter(animal => animal.isAlive)
      .map(animal => ({
        animal,
        wealth: this.calculateAnimalWealth(animal),
        rank: 0 // Will be set below
      }))
      .sort((a, b) => b.wealth - a.wealth);

    // Assign ranks
    wealthData.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    return wealthData;
  }

  /**
   * Get top N animals by wealth
   */
  static getTopAnimals(animals: Animal[], count: number = 5): Array<{
    animal: Animal;
    wealth: number;
    rank: number;
  }> {
    return this.getLeaderboard(animals).slice(0, count);
  }

  /**
   * Find an animal's position in the leaderboard
   */
  static getAnimalRank(targetAnimal: Animal, animals: Animal[]): {
    rank: number;
    wealth: number;
    totalAnimals: number;
  } {
    const leaderboard = this.getLeaderboard(animals);
    const entry = leaderboard.find(e => e.animal.id === targetAnimal.id);
    
    return {
      rank: entry?.rank || leaderboard.length + 1,
      wealth: entry?.wealth || 0,
      totalAnimals: leaderboard.length,
    };
  }

  /**
   * Check if an item is crafted (has a dynamic ID not in base values)
   */
  static isCraftedItem(item: InventoryItem): boolean {
    const baseName = item.name.replace(/\s+/g, "_").toLowerCase() as ResourceType;
    return !BASE_CURRENCY_VALUES[baseName] && item.id.includes("_");
  }

  /**
   * Calculate base value for crafted items based on ingredients
   */
  static calculateCraftedItemBaseValue(ingredients: CraftingIngredient[]): number {
    // Sum up the base values of all ingredients
    const totalIngredientValue = ingredients.reduce((sum, ingredient) => {
      const baseName = ingredient.name.replace(/\s+/g, "_").toLowerCase() as ResourceType;
      const baseValue = BASE_CURRENCY_VALUES[baseName] || 10;
      return sum + (baseValue * ingredient.quantity);
    }, 0);

    // Return the total value of ingredients as the base (before multipliers)
    return totalIngredientValue;
  }

  /**
   * Format currency for display
   */
  static formatCurrency(amount: number): string {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}K`;
    } else {
      return amount.toString();
    }
  }

  /**
   * Get value breakdown for an item (for debugging/display)
   */
  static getItemValueBreakdown(item: InventoryItem): {
    baseName: string;
    baseValue: number;
    rarityMultiplier: number;
    qualityMultiplier: number;
    traitBonus: number;
    craftingBonus: number;
    totalValue: number;
  } {
    const baseName = item.name.replace(/\s+/g, "_").toLowerCase();
    const baseValue = BASE_CURRENCY_VALUES[baseName as ResourceType] || 10;
    const rarityMultiplier = RARITY_MULTIPLIERS[item.rarity || "common"];
    const qualityMultiplier = getQualityMultiplier(item.quality);
    
    let traitBonus = 1.0;
    if (item.traits) {
      Object.entries(item.traits).forEach(([trait, value]) => {
        const bonusPercentage = TRAIT_BONUSES[trait as keyof typeof TRAIT_BONUSES] || 0;
        traitBonus += bonusPercentage * (value / 100);
      });
    }

    const craftingBonus = item.id.startsWith("crafted_") ? 2.5 : 1.0;
    const totalValue = Math.round(baseValue * rarityMultiplier * qualityMultiplier * traitBonus * craftingBonus * item.quantity);

    return {
      baseName,
      baseValue,
      rarityMultiplier,
      qualityMultiplier,
      traitBonus,
      craftingBonus,
      totalValue,
    };
  }
}