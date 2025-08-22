import type { Nation, TaxationEvent, TerritoryInfo } from "../types/nation";
import type { Animal } from "../types/animal";
import type { Building } from "../types/building";
import { v4 as uuidv4 } from "uuid";
import { buildingSystem } from "./building-system";

export class NationSystem {
  private nations: Map<string, Nation> = new Map();
  private taxationHistory: TaxationEvent[] = [];
  private territories: TerritoryInfo[] = [];

  constructor() {
    // Initialize 6 default nations
    if (typeof window !== "undefined") {
      this.initializeDefaultNations();
    }
  }

  private initializeDefaultNations(): void {
    const nationNames = [
      "Aetherian Federation",
      "Crystalline Republic",
      "Verdant Alliance",
      "Solar Empire",
      "Mystic Confederation",
      "Ironhold Dominion",
    ];

    const nationColors = [
      { primary: "#FF6B6B", secondary: "#FF8E53" }, // Red-Orange
      { primary: "#4ECDC4", secondary: "#45B7B8" }, // Teal
      { primary: "#45B7D1", secondary: "#6C5CE7" }, // Blue-Purple
      { primary: "#FFA726", secondary: "#FFD54F" }, // Orange-Yellow
      { primary: "#66BB6A", secondary: "#81C784" }, // Green
      { primary: "#AB47BC", secondary: "#CE93D8" }, // Purple-Pink
    ];

    for (let i = 0; i < 6; i++) {
      const nationId = `nation_${i + 1}`;
      const nation: Nation = {
        id: nationId,
        name: nationNames[i],
        color: nationColors[i],
        foundingDate: Date.now(),
        settlements: [],
        citizenIds: [],
        maxCitizens: 12, // Start with capacity for 12 citizens, can grow with settlements
        treasury: 100, // Starting treasury
        taxRate: 10, // 10% default tax rate
        lastTaxCollection: Date.now(),
        policies: {
          expansion: 50 + Math.random() * 40, // 50-90
          diplomacy: 30 + Math.random() * 40, // 30-70
          militarism: 20 + Math.random() * 40, // 20-60
          commerce: 40 + Math.random() * 40, // 40-80
        },
        relationships: {},
        stats: {
          totalWealthGenerated: 0,
          totalTaxesCollected: 0,
          settlementsBuilt: 0,
          averageCitizenWealth: 0,
        },
      };

      this.nations.set(nationId, nation);

      // Initialize relationships with other nations
      for (let j = 0; j < 6; j++) {
        if (i !== j) {
          const otherNationId = `nation_${j + 1}`;
          nation.relationships[otherNationId] = {
            nationId: otherNationId,
            reputation: -20 + Math.random() * 40, // -20 to 20 starting reputation
            tradeAgreements: [],
            lastInteraction: Date.now(),
            relationshipType: "neutral",
          };
        }
      }
    }

    console.log("🏛️ Initialized 6 nations for the Universe game");

    // Create initial settlements for each nation
    this.spawnInitialSettlements();
  }

  private spawnInitialSettlements(): void {
    for (const nation of this.nations.values()) {
      // Generate a random position for the settlement
      const position = this.getRandomSettlementPosition();

      // Create a settlement building for this nation
      const settlementName = `${nation.name} Capital`;

      // Create the building directly
      const settlement: Building = {
        id: `settlement_${nation.id}_${Date.now()}`,
        name: settlementName,
        type: "settlement",
        position,
        dimensions: { width: 6, height: 4, depth: 6 },
        materials: { stone: 12 }, // Assume initial materials
        stats: { durability: 95, beauty: 70, comfort: 60, capacity: 4 },
        isComplete: true,
        createdAt: Date.now(),
        lastModifiedAt: Date.now(),
        createdBy: "nation_system", // System created
        currentOccupants: [],
        maxOccupants: 4,
        features: ["capital"],
        nationId: nation.id,
        territoryRadius: 25,
      };

      // Add building to building system
      buildingSystem["buildings"].set(settlement.id, settlement);

      // Create settlement in nation system
      this.createSettlement(nation.id, settlement, 25);

      console.log(
        `🏛️ Created initial settlement "${settlementName}" for ${
          nation.name
        } at (${position.x.toFixed(1)}, ${position.z.toFixed(1)})`
      );
    }
  }

  private getRandomSettlementPosition(): { x: number; y: number; z: number } {
    // Generate positions that are spread out across the map
    const angle = Math.random() * Math.PI * 2;
    const distance = 30 + Math.random() * 40; // 30-70 units from center

    return {
      x: Math.cos(angle) * distance,
      y: 2, // Place settlements slightly above ground
      z: Math.sin(angle) * distance,
    };
  }

  // Assign animals to nations when they spawn
  assignAnimalToNation(animal: Animal): string {
    // Find the nation with the fewest citizens
    let targetNation: Nation | null = null;
    let minCitizens = Infinity;

    for (const nation of this.nations.values()) {
      if (
        nation.citizenIds.length < nation.maxCitizens &&
        nation.citizenIds.length < minCitizens
      ) {
        minCitizens = nation.citizenIds.length;
        targetNation = nation;
      }
    }

    // If all nations are full, find one with space
    if (!targetNation) {
      for (const nation of this.nations.values()) {
        if (nation.citizenIds.length < nation.maxCitizens) {
          targetNation = nation;
          break;
        }
      }
    }

    // If still no nation found, expand capacity of first nation
    if (!targetNation) {
      targetNation = Array.from(this.nations.values())[0];
      targetNation.maxCitizens += 2;
    }

    // Assign animal to nation
    animal.nationId = targetNation.id;
    targetNation.citizenIds.push(animal.id);

    // Position animal within their nation's territory
    this.positionAnimalInTerritory(animal, targetNation);

    console.log(
      `🏛️ ${animal.name} joined ${targetNation.name} (${targetNation.citizenIds.length}/${targetNation.maxCitizens} citizens)`
    );

    return targetNation.id;
  }

  // Position an animal within their nation's territory
  private positionAnimalInTerritory(animal: Animal, nation: Nation): void {
    if (!nation.territoryCenter || nation.settlements.length === 0) {
      return; // No territory center established yet
    }

    // Find the territory radius for this nation's settlements
    const territory = this.territories.find((t) => t.nationId === nation.id);
    const radius = territory?.radius || 25;

    // Generate random position within territory radius
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * (radius - 5); // Keep 5 units away from edge

    animal.position = {
      x: nation.territoryCenter.x + Math.cos(angle) * distance,
      y: nation.territoryCenter.y,
      z: nation.territoryCenter.z + Math.sin(angle) * distance,
      rotation: animal.position.rotation || 0,
    };

    console.log(
      `🏛️ Positioned ${animal.name} within ${
        nation.name
      } territory at (${animal.position.x.toFixed(
        1
      )}, ${animal.position.z.toFixed(1)})`
    );
  }

  // Remove animal from nation when they die
  removeAnimalFromNation(animalId: string): void {
    for (const nation of this.nations.values()) {
      const index = nation.citizenIds.indexOf(animalId);
      if (index !== -1) {
        nation.citizenIds.splice(index, 1);
        console.log(`🏛️ Animal ${animalId} removed from ${nation.name}`);
        break;
      }
    }
  }

  // Create a settlement for a nation
  createSettlement(
    nationId: string,
    building: Building,
    radius: number = 25
  ): boolean {
    const nation = this.nations.get(nationId);
    if (!nation) return false;

    // Add settlement to nation
    nation.settlements.push(building.id);
    nation.stats.settlementsBuilt++;

    // Increase nation capacity based on settlement
    nation.maxCitizens += building.maxOccupants * 2;

    // Set building properties
    building.nationId = nationId;
    building.territoryRadius = radius;

    // Create territory info for visualization
    const territory: TerritoryInfo = {
      nationId,
      settlementId: building.id,
      center: building.position,
      radius,
      color: nation.color.primary,
      opacity: 0.15,
    };
    this.territories.push(territory);

    // Set territory center if this is the first settlement
    if (!nation.territoryCenter) {
      nation.territoryCenter = building.position;
    }

    console.log(
      `🏛️ ${nation.name} built settlement ${building.name} with ${radius} unit territory`
    );
    return true;
  }

  // Perform taxation on a nation
  collectTaxes(nationId: string, allAnimals: Animal[]): TaxationEvent[] {
    const nation = this.nations.get(nationId);
    if (!nation) return [];

    const events: TaxationEvent[] = [];
    let totalCollected = 0;

    // Get all citizens of this nation
    const citizens = allAnimals.filter(
      (animal) => animal.nationId === nationId
    );

    for (const citizen of citizens) {
      // Calculate citizen's wealth (using existing currency system logic)
      const wealth = this.calculateAnimalWealth(citizen);
      const taxAmount = Math.floor(wealth * (nation.taxRate / 100));

      if (taxAmount > 0) {
        const event: TaxationEvent = {
          id: uuidv4(),
          nationId,
          timestamp: Date.now(),
          citizenId: citizen.id,
          citizenName: citizen.name,
          wealthBefore: wealth,
          taxAmount,
          taxRate: nation.taxRate,
          success: true,
        };

        // Remove some items from citizen's inventory (representing tax collection)
        this.collectTaxFromAnimal(citizen, taxAmount);

        events.push(event);
        totalCollected += taxAmount;
      }
    }

    // Add collected taxes to nation treasury
    nation.treasury += totalCollected;
    nation.lastTaxCollection = Date.now();
    nation.stats.totalTaxesCollected += totalCollected;

    // Update average citizen wealth
    const totalCitizenWealth = citizens.reduce(
      (sum, c) => sum + this.calculateAnimalWealth(c),
      0
    );
    nation.stats.averageCitizenWealth =
      citizens.length > 0 ? totalCitizenWealth / citizens.length : 0;

    this.taxationHistory.push(...events);

    console.log(
      `💰 ${nation.name} collected ${totalCollected} in taxes from ${events.length} citizens`
    );
    return events;
  }

  private calculateAnimalWealth(animal: Animal): number {
    // Simplified wealth calculation - count valuable items
    return animal.inventory.items.reduce((wealth, item) => {
      const baseValue = this.getItemValue(item.type, item.rarity || "common");
      return wealth + baseValue * item.quantity * (item.quality / 100);
    }, 0);
  }

  private getItemValue(type: string, rarity: string): number {
    const baseValues = {
      food: 2,
      material: 5,
      tool: 10,
      medicinal: 8,
      spice: 12,
      rare: 25,
    };

    const rarityMultipliers = {
      common: 1,
      uncommon: 2,
      rare: 4,
      epic: 8,
      legendary: 16,
    };

    return (
      (baseValues[type as keyof typeof baseValues] || 1) *
      (rarityMultipliers[rarity as keyof typeof rarityMultipliers] || 1)
    );
  }

  private collectTaxFromAnimal(animal: Animal, taxAmount: number): void {
    // Remove items worth approximately the tax amount
    let remaining = taxAmount;
    const itemsToRemove: Array<{ index: number; quantity: number }> = [];

    for (let i = 0; i < animal.inventory.items.length && remaining > 0; i++) {
      const item = animal.inventory.items[i];
      const itemValue = this.getItemValue(item.type, item.rarity || "common");
      const quantityToTake = Math.min(
        item.quantity,
        Math.ceil(remaining / itemValue)
      );

      if (quantityToTake > 0) {
        itemsToRemove.push({ index: i, quantity: quantityToTake });
        remaining -= quantityToTake * itemValue;
      }
    }

    // Remove items from inventory (in reverse order to maintain indices)
    for (let i = itemsToRemove.length - 1; i >= 0; i--) {
      const { index, quantity } = itemsToRemove[i];
      const item = animal.inventory.items[index];

      item.quantity -= quantity;
      if (item.quantity <= 0) {
        animal.inventory.items.splice(index, 1);
      }
    }
  }

  // Update tax rate for a nation
  setTaxRate(nationId: string, newRate: number): boolean {
    const nation = this.nations.get(nationId);
    if (!nation) return false;

    nation.taxRate = Math.max(0, Math.min(100, newRate)); // Clamp between 0-100
    console.log(`💰 ${nation.name} tax rate set to ${nation.taxRate}%`);
    return true;
  }

  // Get all nations
  getAllNations(): Nation[] {
    return Array.from(this.nations.values());
  }

  // Get specific nation
  getNation(nationId: string): Nation | undefined {
    return this.nations.get(nationId);
  }

  // Get territories for rendering
  getTerritories(): TerritoryInfo[] {
    return [...this.territories];
  }

  // Get taxation history
  getTaxationHistory(nationId?: string): TaxationEvent[] {
    if (nationId) {
      return this.taxationHistory.filter(
        (event) => event.nationId === nationId
      );
    }
    return [...this.taxationHistory];
  }

  // Auto-collect taxes periodically
  performAutoTaxation(allAnimals: Animal[]): void {
    const currentTime = Date.now();
    const taxInterval = 5 * 60 * 1000; // 5 minutes

    for (const nation of this.nations.values()) {
      if (currentTime - nation.lastTaxCollection >= taxInterval) {
        this.collectTaxes(nation.id, allAnimals);
      }
    }
  }

  // Check if a position is within any nation's territory
  isPositionInTerritory(position: { x: number; z: number }): {
    inTerritory: boolean;
    nationId?: string;
    territoryInfo?: TerritoryInfo;
  } {
    for (const territory of this.territories) {
      const distance = Math.sqrt(
        Math.pow(position.x - territory.center.x, 2) +
          Math.pow(position.z - territory.center.z, 2)
      );

      if (distance <= territory.radius) {
        return {
          inTerritory: true,
          nationId: territory.nationId,
          territoryInfo: territory,
        };
      }
    }

    return { inTerritory: false };
  }

  // Check if an animal can harvest at a position (must be in their nation's territory or neutral)
  canAnimalHarvestAt(
    animalId: string,
    position: { x: number; z: number }
  ): { canHarvest: boolean; reason?: string } {
    const territoryCheck = this.isPositionInTerritory(position);

    if (!territoryCheck.inTerritory) {
      // Neutral territory - anyone can harvest
      return { canHarvest: true };
    }

    // Find which nation the animal belongs to
    let animalNationId: string | undefined;
    for (const nation of this.nations.values()) {
      if (nation.citizenIds.includes(animalId)) {
        animalNationId = nation.id;
        break;
      }
    }

    if (!animalNationId) {
      // Animal doesn't belong to any nation - cannot harvest in territories
      return {
        canHarvest: false,
        reason: "Animal must belong to a nation to harvest in territories",
      };
    }

    if (animalNationId === territoryCheck.nationId) {
      // Animal is in their own nation's territory
      return { canHarvest: true };
    } else {
      // Animal is in another nation's territory
      const otherNation = this.nations.get(territoryCheck.nationId!);
      return {
        canHarvest: false,
        reason: `Cannot harvest in ${otherNation?.name || "foreign"} territory`,
      };
    }
  }

  // Get nation statistics
  getNationStats(nationId: string): any {
    const nation = this.nations.get(nationId);
    if (!nation) return null;

    return {
      name: nation.name,
      citizens: nation.citizenIds.length,
      maxCitizens: nation.maxCitizens,
      settlements: nation.settlements.length,
      treasury: nation.treasury,
      taxRate: nation.taxRate,
      averageCitizenWealth: nation.stats.averageCitizenWealth,
      totalTaxesCollected: nation.stats.totalTaxesCollected,
    };
  }
}

// Export singleton instance
export const nationSystem = new NationSystem();
