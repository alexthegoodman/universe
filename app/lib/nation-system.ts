import type { Nation, TaxationEvent, TerritoryInfo } from "../types/nation";
import type { Animal } from "../types/animal";
import type { Building } from "../types/building";
import { v4 as uuidv4 } from "uuid";
// Note: buildingSystem import removed to avoid circular dependency
import { TerrainGenerator } from "./terrain-generator";
import { BuildingSystem } from "./building-system";

export class NationSystem {
  private nations: Map<string, Nation> = new Map();
  private taxationHistory: TaxationEvent[] = [];
  private territories: TerritoryInfo[] = [];
  private terrainGenerator: TerrainGenerator | null = null;
  private pendingSettlements: Building[] = [];

  constructor() {
    // Initialize 6 default nations
    // this.initializeDefaultNations(); // run after initializing map
  }

  // Set the terrain generator for proper elevation positioning
  setTerrainGenerator(terrainGenerator: TerrainGenerator): void {
    this.terrainGenerator = terrainGenerator;
  }

  // Register pending settlements with the building system (called after both systems are initialized)
  registerPendingSettlements(buildingSystem: BuildingSystem): void {
    for (const settlement of this.pendingSettlements) {
      buildingSystem.buildings.set(settlement.id, settlement);
    }
    this.pendingSettlements = []; // Clear pending list
    console.log(
      "🏛️ Registered all pending nation settlements with building system"
    );
  }

  initializeDefaultNations(): void {
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
        maxCitizens: 100, // Start with capacity for 12 citizens, can grow with settlements
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
    // Get shuffled predetermined positions for all nations
    const positions = this.getShuffledSpawnPositions();
    const nations = Array.from(this.nations.values());

    for (let i = 0; i < nations.length; i++) {
      const nation = nations[i];
      const position = positions[i] || this.getRandomSettlementPosition(); // Fallback to random if not enough positions

      // Create a settlement building for this nation
      const settlementName = `${nation.name} Capital`;

      console.info("Spawning settlement: ", settlementName, position);

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
        maxOccupants: 12,
        features: ["capital"],
        nationId: nation.id,
        territoryRadius: 35,
      };

      // Store settlement for later registration with building system
      this.pendingSettlements.push(settlement);

      // Create settlement in nation system
      this.createSettlement(nation.id, settlement, 35);

      console.log(
        `🏛️ Created initial settlement "${settlementName}" for ${
          nation.name
        } at (${position.x.toFixed(1)}, ${position.z.toFixed(1)})`
      );
    }
  }

  private getShuffledSpawnPositions(): { x: number; y: number; z: number }[] {
    const worldSize = 160; // Use 80% of 200x200 world size for settlement placement

    // Define predetermined spawn positions (not in a perfect grid)
    // made for 200x200
    // const basePositions = [
    //   { x: -60, z: -45 },  // Northwest
    //   { x: 40, z: -50 },   // Northeast
    //   { x: -30, z: 10 },   // West-center
    //   { x: 55, z: 25 },    // East-center
    //   { x: -45, z: 55 },   // Southwest
    //   { x: 20, z: 60 },    // Southeast
    //   { x: 0, z: -70 },    // North-center (extra position)
    //   { x: -70, z: 0 },    // Far west (extra position)
    // ];

    // for 300x300, each position has 35 unit radius
    const basePositions = [
      { x: -90, z: -70 }, // Northwest
      { x: 60, z: -75 }, // Northeast
      { x: -45, z: 15 }, // West-center
      { x: 80, z: 35 }, // East-center
      { x: -70, z: 80 }, // Southwest
      { x: 30, z: 90 }, // Southeast
      { x: 0, z: -100 }, // North-center (extra position)
      { x: -100, z: 0 }, // Far west (extra position)
    ];

    // Shuffle the positions using Fisher-Yates algorithm
    const shuffledPositions = [...basePositions];
    for (let i = shuffledPositions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledPositions[i], shuffledPositions[j]] = [
        shuffledPositions[j],
        shuffledPositions[i],
      ];
    }

    // Convert 2D positions to 3D with proper terrain height
    return shuffledPositions.map((pos) => {
      // Get terrain height at this position, with a reasonable fallback
      let terrainHeight = 2; // Default ground level
      if (this.terrainGenerator) {
        terrainHeight = this.terrainGenerator.getHeightAt(pos.x, pos.z);
      } else {
        console.warn(
          `⚠️ Terrain generator not available, using default height for settlement at (${pos.x}, ${pos.z})`
        );
      }

      return {
        x: pos.x,
        y: terrainHeight + 1, // Place settlement 1 unit above terrain
        z: pos.z,
      };
    });
  }

  private getRandomSettlementPosition(): { x: number; y: number; z: number } {
    const maxAttempts = 100;
    const minDistance = 80; // Minimum distance between settlements (2x radius + buffer)
    const worldSize = 160; // Use 80% of 200x200 world size for settlement placement

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Generate random position across the map
      const x = (Math.random() - 0.5) * worldSize;
      const z = (Math.random() - 0.5) * worldSize;

      const terrainHeight = this.terrainGenerator?.getHeightAt(x, z) || 2;
      const position = { x, y: terrainHeight + 1, z };

      // Check if this position is far enough from existing settlements
      let validPosition = true;
      for (const territory of this.territories) {
        const distance = Math.sqrt(
          Math.pow(x - territory.center.x, 2) +
            Math.pow(z - territory.center.z, 2)
        );

        if (distance < minDistance) {
          validPosition = false;
          break;
        }
      }

      if (validPosition) {
        return position;
      }
    }

    // Fallback: if no valid position found after maxAttempts, use a random position
    console.warn(
      "Could not find non-overlapping settlement position, using random fallback"
    );
    const fallbackX = (Math.random() - 0.5) * worldSize;
    const fallbackZ = (Math.random() - 0.5) * worldSize;
    const fallbackHeight =
      this.terrainGenerator?.getHeightAt(fallbackX, fallbackZ) || 2;
    return {
      x: fallbackX,
      y: fallbackHeight + 1,
      z: fallbackZ,
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
    const radius = territory?.radius || 35;

    // Generate random position within territory radius
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * (radius - 5); // Keep 5 units away from edge

    const newX = nation.territoryCenter.x + Math.cos(angle) * distance;
    const newZ = nation.territoryCenter.z + Math.sin(angle) * distance;
    const terrainHeight =
      this.terrainGenerator?.getHeightAt(newX, newZ) ||
      nation.territoryCenter.y;

    animal.position = {
      x: newX,
      y: terrainHeight + 1,
      z: newZ,
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
    radius: number = 35
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

  collectTaxFromAnimal(animal: Animal, taxAmount: number): void {
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

  // Load nations from saved data (for loading saved games)
  loadNations(nations: Nation[]): void {
    // Clear existing nations
    this.nations.clear();
    
    // Populate with loaded nations
    nations.forEach(nation => {
      this.nations.set(nation.id, nation);
    });
  }

  // Load territories from saved data (for loading saved games)
  loadTerritories(territories: TerritoryInfo[]): void {
    // Replace territories array with loaded data
    this.territories = [...territories];
  }

  // Tax only harvested items (for harvest-based taxation)
  collectHarvestTax(
    nationId: string,
    animal: Animal,
    harvestedItem: any
  ): void {
    const nation = this.nations.get(nationId);
    if (!nation) return;

    // Calculate tax on the harvested item only
    const itemValue = this.getItemValue(
      harvestedItem.type,
      harvestedItem.rarity || "common"
    );
    const harvestValue =
      itemValue * harvestedItem.quantity * (harvestedItem.quality / 100);
    const taxAmount = harvestValue * (nation.taxRate / 100);

    // Find the harvested item in inventory and tax it
    const inventoryItem = animal.inventory.items.find(
      (item) => item.id === harvestedItem.id
    );
    if (inventoryItem && taxAmount > 0) {
      const quantityToTax = Math.min(
        inventoryItem.quantity,
        Math.ceil(taxAmount / itemValue)
      );

      if (quantityToTax > 0) {
        // Remove taxed quantity from inventory
        inventoryItem.quantity -= quantityToTax;
        if (inventoryItem.quantity <= 0) {
          const itemIndex = animal.inventory.items.indexOf(inventoryItem);
          animal.inventory.items.splice(itemIndex, 1);
        }

        // Add to nation treasury
        const actualTaxValue = quantityToTax * itemValue;
        nation.treasury += actualTaxValue;
        nation.stats.totalTaxesCollected += actualTaxValue;
        nation.lastTaxCollection = Date.now();

        // Record taxation event
        this.taxationHistory.push({
          id: `harvest_tax_${Date.now()}_${Math.random()
            .toString(36)
            .substr(2, 9)}`,
          nationId,
          timestamp: Date.now(),
          citizenId: animal.id,
          citizenName: animal.name,
          wealthBefore: this.calculateAnimalWealth(animal) + actualTaxValue, // Wealth before tax was taken
          taxAmount: actualTaxValue,
          taxRate: nation.taxRate,
          success: true,
        });

        console.log(
          `💰 ${nation.name} collected ${actualTaxValue.toFixed(
            1
          )} wealth as harvest tax from ${animal.name}`
        );
      }
    }
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

  // Check if an animal can build at a position (must be in their own nation's territory only)
  canAnimalBuildAt(
    animalId: string,
    position: { x: number; z: number }
  ): { canBuild: boolean; reason?: string } {
    const territoryCheck = this.isPositionInTerritory(position);

    if (!territoryCheck.inTerritory) {
      // Neutral territory - building not allowed
      return {
        canBuild: false,
        reason: "Buildings can only be constructed within nation territories",
      };
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
      // Animal doesn't belong to any nation - cannot build anywhere
      return {
        canBuild: false,
        reason: "Animal must belong to a nation to construct buildings",
      };
    }

    if (animalNationId === territoryCheck.nationId) {
      // Animal is in their own nation's territory
      return { canBuild: true };
    } else {
      // Animal is in another nation's territory
      const otherNation = this.nations.get(territoryCheck.nationId!);
      return {
        canBuild: false,
        reason: `Cannot build in ${otherNation?.name || "foreign"} territory`,
      };
    }
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
