import type { Nation } from "../types/nation";
import type { Animal } from "../types/animal";
import type { Building, BuildingType } from "../types/building";
import { nationSystem } from "./nation-system";
import { buildingSystem } from "./building-system";
import { CurrencySystem } from "./currency-system";
import { TerrainGenerator } from "./terrain-generator";

interface NationAIDecision {
  action: "idle" | "build" | "trade" | "military" | "diplomacy";
  details?: {
    buildingType?: BuildingType;
    targetNationId?: string;
    amount?: number;
    reason?: string;
  };
}

interface BuildingCosts {
  [key: string]: number;
}

// Building costs (halved from original prices)
const BUILDING_COSTS: BuildingCosts = {
  home: 100,
  apartment_complex: 325,
  factory: 250,
  forge: 225,
  mill: 200,
  electronics_fab: 400,
  mine: 275,
  trading_post: 200,
  brewery: 175,
  bank: 350,
  hospital: 300,
  library: 250,
  lab: 325,
  stadium: 600,
  temple: 450,
  greenhouse: 200,
  settlement: 400,
  armory: 375,
};

export class NationAI {
  private lastDecisionTime: Map<string, number> = new Map();
  private decisionCooldown: number = 60000; // 1 minute in milliseconds
  // private decisionCooldown: number = 300000; // 5 minutes cooldown to reduce frequency
  private terrainGenerator: TerrainGenerator | null = null;

  constructor() {}

  setTerrainGenerator(terrainGen: TerrainGenerator) {
    this.terrainGenerator = terrainGen;
  }

  // Main decision-making function for a nation
  makeDecision(
    nation: Nation,
    allAnimals: Animal[],
    allBuildings: Building[]
  ): NationAIDecision {
    const now = Date.now();
    const lastDecision = this.lastDecisionTime.get(nation.id) || 0;

    // Check cooldown - only make decisions every minute
    if (now - lastDecision < this.decisionCooldown) {
      return { action: "idle", details: { reason: "Cooling down" } };
    }

    this.lastDecisionTime.set(nation.id, now);

    // Get nation context
    const nationAnimals = allAnimals.filter(
      (animal) => animal.nationId === nation.id && animal.isAlive
    );
    const nationBuildings = allBuildings.filter(
      (building) => building.nationId === nation.id
    );
    const treasury = nation.treasury;

    // 70% chance to be idle (realistic nation behavior)
    if (Math.random() < 0.7) {
      return { action: "idle", details: { reason: "No action needed" } };
    }

    // Decision priorities based on nation policies and situation
    const decisions = [
      this.considerBuilding(nation, nationAnimals, nationBuildings, treasury),
      this.considerTrade(nation, allAnimals),
      this.considerMilitary(nation, allAnimals),
      this.considerDiplomacy(nation),
    ].filter((decision) => decision !== null) as NationAIDecision[];

    // Weight decisions by nation policies
    const weightedDecisions = decisions.map((decision) => ({
      decision,
      weight: this.calculateDecisionWeight(decision, nation),
    }));

    // Sort by weight and return the highest priority decision
    weightedDecisions.sort((a, b) => b.weight - a.weight);

    if (weightedDecisions.length > 0) {
      return weightedDecisions[0].decision;
    }

    return { action: "idle", details: { reason: "No viable actions" } };
  }

  // Consider building new structures
  private considerBuilding(
    nation: Nation,
    nationAnimals: Animal[],
    nationBuildings: Building[],
    treasury: number
  ): NationAIDecision | null {
    // Check if nation has enough funds for any building
    const affordableBuildings = Object.entries(BUILDING_COSTS).filter(
      ([_, cost]) => treasury >= cost
    );

    if (affordableBuildings.length === 0) {
      return null;
    }

    // Priority order based on nation needs
    const buildingPriorities = this.getBuildingPriorities(
      nation,
      nationAnimals,
      nationBuildings
    );

    for (const buildingType of buildingPriorities) {
      const cost = BUILDING_COSTS[buildingType];
      if (cost && treasury >= cost) {
        // Check if this building type is needed
        if (
          this.shouldBuildBuilding(buildingType, nationBuildings, nationAnimals)
        ) {
          return {
            action: "build",
            details: {
              buildingType: buildingType as BuildingType,
              amount: cost,
              reason: `Building ${buildingType} for nation development`,
            },
          };
        }
      }
    }

    return null;
  }

  // Determine building priorities based on nation characteristics
  private getBuildingPriorities(
    nation: Nation,
    nationAnimals: Animal[],
    nationBuildings: Building[]
  ): string[] {
    const priorities: string[] = [];

    // High commerce nations prioritize economic buildings
    if (nation.policies.commerce > 70) {
      priorities.push("trading_post", "bank", "brewery", "factory");
    }

    // High militarism nations prioritize military buildings
    if (nation.policies.militarism > 70) {
      priorities.push("armory", "settlement", "forge");
    }

    // High expansion nations prioritize settlements and infrastructure
    if (nation.policies.expansion > 70) {
      priorities.push("settlement", "mine", "factory", "apartment_complex");
    }

    // High diplomacy nations prioritize cultural and social buildings
    if (nation.policies.diplomacy > 70) {
      priorities.push("temple", "library", "stadium", "hospital");
    }

    // Basic needs (everyone needs these)
    priorities.push("home", "hospital", "greenhouse", "mill");

    // Advanced infrastructure
    priorities.push("lab", "electronics_fab");

    return priorities;
  }

  // Check if a building type is actually needed
  private shouldBuildBuilding(
    buildingType: string,
    nationBuildings: Building[],
    nationAnimals: Animal[]
  ): boolean {
    const existingCount = nationBuildings.filter(
      (b) => b.type === buildingType
    ).length;
    const citizenCount = nationAnimals.length;

    switch (buildingType) {
      case "home":
        // Build homes if less than 50% of citizens have homes
        const homelessCount = nationAnimals.filter((a) => !a.homeId).length;
        return homelessCount > citizenCount * 0.5;

      case "hospital":
        // One hospital per 10 citizens, max 2
        return existingCount < Math.min(2, Math.ceil(citizenCount / 10));

      case "trading_post":
        // Max 1 trading post per nation
        return existingCount === 0;

      case "settlement":
        // Build settlements for expansion (max 3 per nation)
        return existingCount < 3;

      case "factory":
      case "mine":
      case "forge":
        // Industrial buildings - one per 8 citizens
        return existingCount < Math.ceil(citizenCount / 8);

      default:
        // Other buildings - don't spam them
        return existingCount < 2;
    }
  }

  // Consider trade actions
  private considerTrade(
    nation: Nation,
    allAnimals: Animal[]
  ): NationAIDecision | null {
    // High commerce nations are more likely to engage in trade
    if (nation.policies.commerce < 50 || Math.random() > 0.3) {
      return null;
    }

    // Simple trade consideration - could be expanded
    return {
      action: "trade",
      details: {
        reason: "Considering trade opportunities",
      },
    };
  }

  // Consider military actions
  private considerMilitary(
    nation: Nation,
    allAnimals: Animal[]
  ): NationAIDecision | null {
    // High militarism nations are more likely to take military action
    if (nation.policies.militarism < 60 || Math.random() > 0.2) {
      return null;
    }

    return {
      action: "military",
      details: {
        reason: "Considering military expansion",
      },
    };
  }

  // Consider diplomatic actions
  private considerDiplomacy(nation: Nation): NationAIDecision | null {
    // High diplomacy nations are more likely to engage diplomatically
    if (nation.policies.diplomacy < 60 || Math.random() > 0.2) {
      return null;
    }

    return {
      action: "diplomacy",
      details: {
        reason: "Considering diplomatic relations",
      },
    };
  }

  // Calculate decision weight based on nation policies
  private calculateDecisionWeight(
    decision: NationAIDecision,
    nation: Nation
  ): number {
    let weight = 1;

    switch (decision.action) {
      case "build":
        // Building decisions get base weight
        weight = 5;
        break;

      case "trade":
        weight = nation.policies.commerce / 20; // 0-5 weight
        break;

      case "military":
        weight = nation.policies.militarism / 20; // 0-5 weight
        break;

      case "diplomacy":
        weight = nation.policies.diplomacy / 20; // 0-5 weight
        break;

      default:
        weight = 1;
    }

    return weight;
  }

  // Execute a nation's decision
  async executeDecision(
    decision: NationAIDecision,
    nation: Nation,
    allAnimals: Animal[]
  ): Promise<void> {
    console.log(
      `Nation ${nation.name} executing decision: ${decision.action}`,
      decision.details
    );

    switch (decision.action) {
      case "build":
        await this.executeBuildingDecision(decision, nation, allAnimals);
        break;

      case "trade":
        await this.executeTradeDecision(decision, nation);
        break;

      case "military":
        await this.executeMilitaryDecision(decision, nation);
        break;

      case "diplomacy":
        await this.executeDiplomacyDecision(decision, nation);
        break;

      case "idle":
        // Do nothing
        break;
    }
  }

  // Execute building decision
  private async executeBuildingDecision(
    decision: NationAIDecision,
    nation: Nation,
    allAnimals: Animal[]
  ): Promise<void> {
    if (!decision.details?.buildingType || !decision.details.amount) {
      return;
    }

    const buildingType = decision.details.buildingType;
    const cost = decision.details.amount;

    // Deduct from treasury
    const treasuryResult = nationSystem.deductFromTreasury(nation.id, cost);
    if (!treasuryResult.success) {
      console.warn(
        `Nation ${nation.name} failed to deduct treasury for building:`,
        treasuryResult.message
      );
      return;
    }

    // Find a suitable location within nation territory
    const buildingPosition = this.findBuildingLocation(nation);
    if (!buildingPosition) {
      // Refund treasury if we can't find a location
      nationSystem.addToTreasury(nation.id, cost);
      console.warn(
        `Nation ${nation.name} couldn't find suitable building location`
      );
      return;
    }

    // Get a nation animal to be the "builder"
    const nationAnimals = allAnimals.filter(
      (animal) => animal.nationId === nation.id && animal.isAlive
    );

    if (nationAnimals.length === 0) {
      // Refund treasury if no animals available
      nationSystem.addToTreasury(nation.id, cost);
      console.warn(`Nation ${nation.name} has no animals to build`);
      return;
    }

    const builderAnimal =
      nationAnimals[Math.floor(Math.random() * nationAnimals.length)];

    // Create the building
    const result = buildingSystem.createBuilding(
      builderAnimal,
      buildingPosition,
      `${nation.name}'s ${buildingType}`,
      buildingType,
      false // Don't use materials for AI nations
    );

    if (result.success) {
      console.log(
        `Nation ${nation.name} successfully built ${buildingType} for ${cost} coins`
      );

      // Set the building's nation ID
      const buildings = buildingSystem.getAllBuildings();
      const newBuilding = buildings[buildings.length - 1];
      if (newBuilding) {
        newBuilding.nationId = nation.id;
      }
    } else {
      // Refund treasury on failure
      nationSystem.addToTreasury(nation.id, cost);
      console.warn(
        `Nation ${nation.name} failed to build ${buildingType}:`,
        result.message
      );
    }
  }

  // Find a suitable building location within nation territory
  private findBuildingLocation(
    nation: Nation
  ): { x: number; y: number; z: number } | null {
    const maxAttempts = 10;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Try to build near existing settlements
      if (nation.settlements.length > 0) {
        const settlementId = nation.settlements[0]; // Use first settlement ID
        const settlementBuilding = buildingSystem.getBuilding(settlementId);

        if (settlementBuilding) {
          const angle = Math.random() * 2 * Math.PI;
          const distance = 15 + Math.random() * 20; // 15-35 units from settlement

          let x = settlementBuilding.position.x + Math.cos(angle) * distance;
          let z = settlementBuilding.position.z + Math.sin(angle) * distance;

          const terrainHeight = this.terrainGenerator?.getHeightAt?.(x, z) || 0;

          const position = {
            x,
            // y: 0,
            y: terrainHeight,
            z,
          };

          // Check if position is valid (not too close to other buildings)
          const proximityCheck = buildingSystem.checkBuildingProximity(
            position,
            8
          );
          if (proximityCheck.canBuild) {
            return position;
          }
        }
      }

      // If no settlements or settlement building not found, try territory center
      if (nation.territoryCenter) {
        const angle = Math.random() * 2 * Math.PI;
        const distance = 10 + Math.random() * 25; // 10-35 units from territory center

        let x = nation.territoryCenter.x + Math.cos(angle) * distance;
        let z = nation.territoryCenter.z + Math.sin(angle) * distance;

        const terrainHeight = this.terrainGenerator?.getHeightAt?.(x, z) || 0;

        const position = {
          x,
          // y: 0,
          y: terrainHeight,
          z,
        };

        // Check if position is valid (not too close to other buildings)
        const proximityCheck = buildingSystem.checkBuildingProximity(
          position,
          8
        );
        if (proximityCheck.canBuild) {
          return position;
        }
      }
    }

    // Fallback: random location (this might be outside territory, but better than nothing)
    return {
      x: (Math.random() - 0.5) * 280, // Stay within world bounds (-140 to 140)
      y: 0,
      z: (Math.random() - 0.5) * 280,
    };
  }

  // Execute trade decision (placeholder)
  private async executeTradeDecision(
    decision: NationAIDecision,
    nation: Nation
  ): Promise<void> {
    console.log(`Nation ${nation.name} is considering trade opportunities`);
    // TODO: Implement trade logic when trade system is expanded
  }

  // Execute military decision (placeholder)
  private async executeMilitaryDecision(
    decision: NationAIDecision,
    nation: Nation
  ): Promise<void> {
    console.log(`Nation ${nation.name} is considering military action`);
    // TODO: Implement military logic when war system is expanded
  }

  // Execute diplomacy decision (placeholder)
  private async executeDiplomacyDecision(
    decision: NationAIDecision,
    nation: Nation
  ): Promise<void> {
    console.log(`Nation ${nation.name} is engaging in diplomacy`);
    // TODO: Implement diplomacy logic when diplomatic system is expanded
  }

  // Process all nations' AI decisions
  async processAllNations(
    nations: Nation[],
    allAnimals: Animal[],
    allBuildings: Building[]
  ): Promise<void> {
    for (const nation of nations) {
      try {
        const decision = this.makeDecision(nation, allAnimals, allBuildings);
        await this.executeDecision(decision, nation, allAnimals);
      } catch (error) {
        console.error(`Error processing AI for nation ${nation.name}:`, error);
      }
    }
  }
}

// Export singleton instance
export const nationAI = new NationAI();
