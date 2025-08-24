import { Micro_5 } from "next/font/google";
import type {
  Animal,
  AnimalAction,
  ActionResult,
  AnimalPosition,
  NearbyResource,
  CraftingResult,
  CraftingIngredient,
  InventoryItem,
} from "../types/animal";
import type { Bandit } from "./game-manager";
import { explorationSystem, ExplorationSystem } from "./exploration-system";
import { HARVEST_RADIUS } from "./health-monitor";
import { buildingSystem } from "./building-system";
import { RESOURCE_WEIGHTS } from "../types/weights";
import { BreedingSystem } from "./breeding-system";
import { skillSystem } from "./skill-system";
import type { TerrainGenerator } from "./terrain-generator";
import { ElevationUtils } from "./elevation-utils";
import { executeInteraction } from "./building-interactions";

export interface MXPAction {
  name: string;
  description: string;
  parameters: Record<string, any>;
}

export interface MXPActionConfig {
  move: {
    maxDistance: number;
    energyCost: number;
  };
  eat: {
    nutritionGain: number;
    hungerReduction: number;
    energyGain: number;
  };
  drink: {
    thirstReduction: number;
    healthGain: number;
    energyGain: number;
    happinessGain: number;
  };
  sleep: {
    energyGain: number;
    healthGain: number;
    duration: number;
  };
  work: {
    energyCost: number;
    happinessGain: number;
    productionRate: number;
  };
  play: {
    happinessGain: number;
    energyCost: number;
    socialBonus: number;
  };
}

export class MXPActionSystem {
  private config: MXPActionConfig;
  private explorationSystem: ExplorationSystem;
  private breedingSystem?: BreedingSystem;
  private getAllAnimals?: () => Animal[];
  private terrainGenerator?: TerrainGenerator;
  private elevationUtils: ElevationUtils;

  // World bounds for movement and exploration
  worldBounds = { width: 200, depth: 200, height: 30 }; // Default, can be set externally

  constructor(breedingSystem?: BreedingSystem, getAllAnimals?: () => Animal[]) {
    this.breedingSystem = breedingSystem;
    this.getAllAnimals = getAllAnimals;
    this.config = {
      move: {
        maxDistance: 10,
        energyCost: 5,
      },
      eat: {
        nutritionGain: 25,
        hungerReduction: 20,
        energyGain: 20,
      },
      drink: {
        thirstReduction: 25,
        healthGain: 5,
        energyGain: 5,
        happinessGain: 2,
      },
      sleep: {
        energyGain: 40,
        healthGain: 15,
        // duration: 10000, // 10 seconds
        duration: 1000, // 1 second for testing
      },
      work: {
        energyCost: 8,
        happinessGain: 10,
        productionRate: 1,
      },
      play: {
        happinessGain: 20,
        energyCost: 6,
        socialBonus: 10,
      },
    };

    this.explorationSystem = explorationSystem;
    this.elevationUtils = new ElevationUtils();
  }

  setTerrainGenerator(terrainGenerator: TerrainGenerator) {
    this.terrainGenerator = terrainGenerator;
    this.elevationUtils = new ElevationUtils(terrainGenerator);
  }

  // Helper method to apply skill effects to action results
  private applySkillEffects(
    animal: Animal,
    actionType: string,
    result: ActionResult,
    resourceType?: string,
    quality?: number
  ): ActionResult {
    // Initialize skills if not present
    const updatedAnimal = skillSystem.initializeAnimalSkills(animal);

    // Generate XP for this action
    const skillXPGains = skillSystem.generateActionXP(
      actionType,
      resourceType,
      quality
    );

    let skillXP: Record<string, number> = {};
    let skillLevelUps: string[] = [];
    let unlockedAdvancedPaths: string[] = [];

    // Apply XP gains and check for level ups
    for (const xpGain of skillXPGains) {
      const levelUpResult = skillSystem.addSkillXP(
        updatedAnimal,
        xpGain.skillName,
        xpGain.xpGained
      );

      skillXP[xpGain.skillName] = xpGain.xpGained;

      if (levelUpResult.leveledUp) {
        skillLevelUps.push(
          `${xpGain.skillName} (${levelUpResult.oldLevel} → ${levelUpResult.newLevel})`
        );
      }

      if (levelUpResult.unlockedAdvancedPaths.length > 0) {
        unlockedAdvancedPaths.push(...levelUpResult.unlockedAdvancedPaths);
      }
    }

    // Update the result with skill information
    return {
      ...result,
      skillXP,
      skillLevelUps,
      unlockedAdvancedPaths,
    };
  }

  async executeAction(
    animal: Animal,
    action: AnimalAction,
    parameters: any = {}
  ): Promise<ActionResult> {
    try {
      switch (action) {
        case "moving":
          return await this.executeMove(animal, parameters);
        case "eating":
          return await this.executeEat(animal, parameters);
        case "drinking":
          return await this.executeDrink(animal, parameters);
        case "sleeping":
          return await this.executeSleep(animal, parameters);
        case "playing":
          return await this.executePlay(animal, parameters);
        case "working":
          return await this.executeWork(animal, parameters);
        case "exploring":
          return await this.executeExplore(animal, parameters);
        case "socializing":
          return await this.executeSocialize(animal, parameters);
        case "mating":
          return await this.executeMate(animal, parameters);
        case "harvesting":
          return await this.executeHarvest(animal, parameters);
        case "building":
          return await this.executeBuilding(animal, parameters);
        case "ideation":
          return await this.executeIdeation(animal, parameters);
        case "crafting":
          return await this.executeCrafting(animal, parameters);
        case "combat":
          return await this.executeCombat(animal, parameters);
        case "go_home":
          return await this.executeGoHome(animal, parameters);
        case "visit_trading_post":
          return await this.executeVisitTradingPost(animal, parameters);
        case "visit_hospital":
          return await this.executeVisitHospital(animal, parameters);
        case "interact":
          return await this.executeInteract(animal, parameters);
        default:
          return await this.executeIdle(animal, parameters);
      }
    } catch (error) {
      console.error(
        `Error executing action ${action} for animal ${animal.id}:`,
        error
      );
      return {
        success: false,
        message: `Failed to execute ${action}: ${error}`,
        duration: 1000,
      };
    }
  }

  private async executeMove(
    animal: Animal,
    params: any
  ): Promise<ActionResult> {
    const { targetX = 0, targetZ = 0, speed = 1 } = params;

    // World bounds check - prevent movement outside map bounds
    // const worldBounds = { width: 200, depth: 200 }; // Match game-manager.ts config
    const worldBounds = this.worldBounds;

    if (
      !this.elevationUtils.isWithinWorldBounds(targetX, targetZ, worldBounds)
    ) {
      return {
        success: false,
        message: `${animal.name} cannot venture beyond the known world boundaries`,
        duration: 1000,
      };
    }

    // Calculate movement based on agility
    const agilityMultiplier = animal.dna.agility / 100;
    const actualSpeed = speed * agilityMultiplier;

    // Calculate energy cost using elevation utilities
    const energyCost = Math.min(
      6,
      Math.min(
        this.elevationUtils.calculateMovementEnergyCost(
          animal,
          targetX,
          targetZ,
          this.config.move.energyCost
        ),
        animal.stats.energy
      )
    );

    if (animal.stats.energy < energyCost) {
      return {
        success: false,
        message: `${animal.name} is too tired to move that far`,
        duration: 1000,
      };
    }

    // Calculate new position with terrain elevation using utilities
    const newPosition = this.elevationUtils.createElevatedPosition(
      animal.position,
      targetX,
      targetZ
    );

    // Calculate horizontal distance for duration
    const distance = this.elevationUtils.calculateHorizontalDistance(
      animal.position.x,
      animal.position.z,
      targetX,
      targetZ
    );

    return {
      success: true,
      message: `${animal.name} moved to new location`,
      statChanges: {
        energy: Math.max(0, animal.stats.energy - energyCost),
      },
      newPosition,
      duration: Math.max(2000, (distance * 1000) / actualSpeed),
    };
  }

  private async executeEat(animal: Animal, params: any): Promise<ActionResult> {
    const { resourceId, itemType, foodType = "unknown", quality = 1 } = params;

    let foodItem;

    // Try to find specific item by resourceId first
    if (resourceId) {
      foodItem = animal.inventory.items.find(
        (item) => item.id === resourceId && item.quantity > 0
      );
    }

    // Fallback to finding by type if no specific ID provided
    if (!foodItem && itemType) {
      foodItem = animal.inventory.items.find(
        (item) => item.type === itemType && item.quantity > 0
      );
    }

    // Final fallback to any food item
    if (!foodItem) {
      foodItem = animal.inventory.items.find(
        (item) => item.type === "food" && item.quantity > 0
      );
    }

    if (!foodItem) {
      return {
        success: false,
        message: `${animal.name} has no food in their inventory to eat`,
        duration: 1000,
      };
    }

    const actualQuality = foodItem.quality / 100;
    let hungerReduction = this.config.eat.hungerReduction * actualQuality;
    let energyGain = this.config.eat.energyGain * actualQuality;
    let healthGain = actualQuality > 1 ? 5 : 2;
    let happinessGain = 5;

    // Apply trait bonuses if the item has traits
    if (foodItem.traits) {
      // Nutritious trait increases hunger reduction
      if (foodItem.traits.nutritious) {
        hungerReduction += (foodItem.traits.nutritious / 100) * 10;
      }

      // Energizing trait increases energy gain
      if (foodItem.traits.energizing) {
        energyGain += (foodItem.traits.energizing / 100) * 15;
      }

      // Healing trait increases health gain
      if (foodItem.traits.healing) {
        healthGain += (foodItem.traits.healing / 100) * 8;
      }

      // Sweet trait increases happiness
      if (foodItem.traits.sweet) {
        happinessGain += (foodItem.traits.sweet / 100) * 8;
      }

      // Beautiful trait increases happiness
      if (foodItem.traits.beautiful) {
        happinessGain += (foodItem.traits.beautiful / 100) * 5;
      }

      // Calming trait provides extra happiness and slight energy
      if (foodItem.traits.calming) {
        happinessGain += (foodItem.traits.calming / 100) * 6;
        energyGain += (foodItem.traits.calming / 100) * 3;
      }

      // Bitter trait reduces happiness but might increase health
      if (foodItem.traits.bitter) {
        happinessGain -= (foodItem.traits.bitter / 100) * 4;
        healthGain += (foodItem.traits.bitter / 100) * 3; // bitter herbs often medicinal
      }
    }

    const traitBonuses = foodItem.traits
      ? ` (${Object.entries(foodItem.traits)
          .filter(([_, value]) => value > 50)
          .map(([trait]) => trait)
          .join(", ")})`
      : "";

    return {
      success: true,
      message: `${animal.name} enjoyed eating ${foodItem.name} from their inventory${traitBonuses}`,
      statChanges: {
        hunger: Math.max(0, animal.stats.hunger - hungerReduction),
        energy: Math.min(100, animal.stats.energy + energyGain),
        health: Math.min(100, animal.stats.health + healthGain),
        happiness: Math.min(100, animal.stats.happiness + happinessGain),
      },
      consumedItem: {
        id: foodItem.id,
        type: foodItem.type,
        name: foodItem.name,
        quantity: 1,
        quality: foodItem.quality,
        harvestedAt: foodItem.harvestedAt,
        traits: foodItem.traits,
      },
      duration: 5000 + actualQuality * 2000,
    };
  }

  private async executeDrink(
    animal: Animal,
    params: any
  ): Promise<ActionResult> {
    const { waterQuality = 1 } = params;

    // Only allow drinking from inventory
    const waterItem = animal.inventory.items.find(
      (item) => item.type === "water" && item.quantity > 0
    );

    if (!waterItem) {
      return {
        success: false,
        message: `${animal.name} has no water in their inventory to drink`,
        duration: 1000,
      };
    }

    const actualQuality = waterItem.quality / 100;
    const thirstReduction = this.config.drink.thirstReduction * actualQuality;
    const healthGain = this.config.drink.healthGain * actualQuality;
    const energyGain = this.config.drink.energyGain * actualQuality;
    const happinessGain = this.config.drink.happinessGain * actualQuality;

    return {
      success: true,
      message: `${animal.name} quenched their thirst with stored water`,
      statChanges: {
        thirst: Math.max(0, animal.stats.thirst - thirstReduction),
        health: Math.min(100, animal.stats.health + healthGain),
        // energy and happiness are not affected by drinking by not as much as eating
        energy: Math.min(100, animal.stats.energy + energyGain),
        happiness: Math.min(100, animal.stats.happiness + happinessGain),
      },
      consumedItem: {
        id: waterItem.id,
        type: waterItem.type,
        name: waterItem.name,
        quantity: 1,
        quality: waterItem.quality,
        harvestedAt: waterItem.harvestedAt,
      },
      duration: 3000,
    };
  }

  private async executeSleep(
    animal: Animal,
    params: any
  ): Promise<ActionResult> {
    let { comfort = 1, safety = 1 } = params;

    // REQUIRE buildings for sleeping - animals can only sleep safely indoors
    const buildingBonus = buildingSystem.getBuildingBonus(animal);

    // Check if animal is actually in a building (not just nearby)
    if (buildingBonus.comfort <= 1) {
      return {
        success: false,
        message: `${animal.name} cannot sleep outdoors - it's too dangerous! Must find or build shelter first.`,
        duration: 2000,
      };
    }

    comfort *= buildingBonus.comfort;
    safety *= buildingBonus.safety;

    // Significantly increased energy gain to make sleeping very rewarding
    const energyGain = this.config.sleep.energyGain * comfort * 1.5; // 50% bonus
    const healthGain = this.config.sleep.healthGain * safety;
    const duration = this.config.sleep.duration * (2 - comfort); // Less comfortable = longer sleep needed

    return {
      success: true,
      message: `${animal.name} is sleeping peacefully and safely in their shelter`,
      statChanges: {
        energy: Math.min(100, animal.stats.energy + energyGain),
        health: Math.min(100, animal.stats.health + healthGain),
        happiness: Math.min(
          100,
          animal.stats.happiness + comfort * 5 + buildingBonus.happiness
        ),
      },
      duration,
    };
  }

  private async executePlay(
    animal: Animal,
    params: any
  ): Promise<ActionResult> {
    const { playmates = [], toyQuality = 1 } = params;

    const socialMultiplier = playmates.length > 0 ? 1.5 : 1;

    console.info("Execute play with animal", animal);

    const personalityMultiplier = animal.dna.personality.playful / 100;

    const happinessGain =
      this.config.play.happinessGain *
      socialMultiplier *
      personalityMultiplier *
      toyQuality;
    const energyCost = this.config.play.energyCost / personalityMultiplier;

    return {
      success: true,
      message: `${animal.name} had a wonderful time playing${
        playmates.length > 0 ? " with friends" : ""
      }`,
      statChanges: {
        happiness: Math.min(100, animal.stats.happiness + happinessGain),
        energy: Math.max(0, animal.stats.energy - energyCost),
      },
      duration: 8000 + playmates.length * 2000,
    };
  }

  private async executeWork(
    animal: Animal,
    params: any
  ): Promise<ActionResult> {
    const { task = "general", difficulty = 1 } = params;

    const intelligenceMultiplier = animal.dna.intelligence / 100;
    const strengthMultiplier = animal.dna.strength / 100;

    const effectiveness = (intelligenceMultiplier + strengthMultiplier) / 2;
    const energyCost =
      (this.config.work.energyCost * difficulty) / effectiveness;

    if (animal.stats.energy < energyCost) {
      return {
        success: false,
        message: `${animal.name} is too tired to work effectively`,
        duration: 2000,
      };
    }

    return {
      success: true,
      message: `${animal.name} completed work on ${task}`,
      statChanges: {
        energy: Math.max(0, animal.stats.energy - energyCost),
        happiness: Math.min(
          100,
          animal.stats.happiness +
            this.config.work.happinessGain * effectiveness
        ),
      },
      duration: 15000 * difficulty,
    };
  }

  private async executeExplore(
    animal: Animal,
    params: any
  ): Promise<ActionResult> {
    const { worldState, explorationTarget } = params;

    const curiosityMultiplier = animal.dna.curiosity / 100;
    const agilityMultiplier = animal.dna.agility / 100;

    let newPosition;
    let goalReason = "Exploring based on curiosity";

    if (explorationTarget) {
      // Use AI-provided exploration target with elevation
      newPosition = this.elevationUtils.createElevatedPosition(
        animal.position,
        explorationTarget.x,
        explorationTarget.z
      );
      goalReason = "Exploring towards AI-chosen destination";
    } else {
      // Fallback to exploration system for intelligent exploration
      const explorationGoal = this.explorationSystem.determineExplorationGoal(
        animal,
        worldState || {}
      );
      newPosition = this.explorationSystem.generateExplorationPosition(
        animal,
        explorationGoal,
        this.terrainGenerator
      );
      goalReason = explorationGoal.reason;
    }

    // World bounds check - prevent exploration outside map bounds
    // const worldBounds = { width: 200, depth: 200 }; // Match game-manager.ts config
    const worldBounds = this.worldBounds;

    console.info(
      "Exploring new position",
      animal.name,
      newPosition,
      worldBounds
    );

    if (
      !this.elevationUtils.isWithinWorldBounds(
        newPosition.x,
        newPosition.z,
        worldBounds
      )
    ) {
      return {
        success: false,
        message: `${animal.name} senses the edge of the known world and turns back`,
        duration: 2000,
      };
    }

    // Calculate energy cost using elevation utilities
    const baseEnergyCost = Math.max(2, Math.min(4, animal.stats.energy * 0.1)); // Low-cost exploration
    const energyCost = this.elevationUtils.calculateElevationEnergyCost(
      animal.position.x,
      animal.position.z,
      newPosition.x,
      newPosition.z,
      baseEnergyCost
    );
    const happiness = 10 * curiosityMultiplier + (explorationTarget ? 5 : 3); // AI-driven exploration gives more happiness

    // Check for discoveries based on world state and exploration goal
    let discoveryMessage = "";
    if (
      worldState.nearbyResources?.length > 0 ||
      Math.random() < curiosityMultiplier * 0.4
    ) {
      const discoveries = [];

      if (worldState.nearbyResources?.length > 0) {
        const resource = worldState.nearbyResources[0];
        discoveries.push(`spotted ${resource.type}`);

        // Store in memory
        this.explorationSystem.addMemory(animal.id, {
          position: {
            x: resource.position?.x || 0,
            // y: 0,
            y: resource.position?.y || 0,
            z: resource.position?.z || 0,
          },
          discoveryType: resource.type as any,
          description: `Found ${resource.type} while exploring`,
          reliability: 0.8,
        });
      }

      if (worldState.nearbyAnimals?.length > 0) {
        const otherAnimal = worldState.nearbyAnimals[0];
        discoveries.push(`noticed ${otherAnimal.name}`);
      }

      // Random discoveries
      // if (Math.random() < 0.2) {
      //   const randomDiscoveries = [
      //     "interesting scent trail",
      //     "good hiding spot",
      //     "comfortable resting area",
      //     "unusual tracks",
      //     "sheltered area",
      //   ];
      //   const discovery =
      //     randomDiscoveries[
      //       Math.floor(Math.random() * randomDiscoveries.length)
      //     ];
      //   discoveries.push(discovery);

      //   this.explorationSystem.addMemory(animal.id, {
      //     position: { x: newPosition.x, y: newPosition.y, z: newPosition.z },
      //     discoveryType: "interesting",
      //     description: `Found ${discovery}`,
      //     reliability: 0.6,
      //   });
      // }

      if (discoveries.length > 0) {
        discoveryMessage = ` and ${discoveries.join(" and ")}`;
      }
    }

    // Get relevant memories for the message
    const memories = this.explorationSystem.getRelevantMemories(
      animal.id,
      animal.position,
      10
    );
    const memoryContext =
      memories.length > 0
        ? ` (remembering ${memories.length} nearby locations)`
        : "";

    // Calculate distance for duration
    const distance = this.elevationUtils.calculateHorizontalDistance(
      animal.position.x,
      animal.position.z,
      newPosition.x,
      newPosition.z
    );

    const baseResult = {
      success: true,
      message: `${animal.name} ${goalReason}${discoveryMessage}${memoryContext}`,
      statChanges: {
        happiness: Math.min(100, animal.stats.happiness + happiness),
        energy: Math.max(0, animal.stats.energy - energyCost),
      },
      newPosition,
      duration: 8000 + distance * 500, // Duration based on distance traveled
    };

    return this.applySkillEffects(animal, "exploring", baseResult);
  }

  private tryAutoBreedFromSocializing(
    animal: Animal,
    companions: string[]
  ): {
    success: boolean;
    message: string;
    happiness: number;
    offspring?: Animal;
  } {
    if (
      !this.breedingSystem ||
      !this.getAllAnimals ||
      companions.length === 0
    ) {
      console.warn(
        "Breeding system or getAllAnimals not available for auto-breeding"
      );
      return { success: false, message: "", happiness: 0 };
    }

    // Check if this animal can breed
    if (!this.breedingSystem.canBreed(animal).canBreed) {
      console.warn(
        `${animal.name} cannot breed at this time due to age or health`
      );
      return { success: false, message: "", happiness: 0 };
    }

    // Get all animals to find companions
    const allAnimals = this.getAllAnimals();
    const companionAnimals = allAnimals.filter((a) =>
      companions.includes(a.id)
    );

    console.info("Companion animals for breeding", companionAnimals);

    // Try to find a compatible mate from companions
    for (const companion of companionAnimals) {
      let breedInfo = this.breedingSystem.canBreed(companion);

      console.info(
        "Checking breeding compatibility with companion",
        companion.name,
        breedInfo
      );

      if (breedInfo.canBreed) {
        const breedingResult = this.breedingSystem.attemptBreeding(
          animal,
          companion
        );

        console.info("Breeding attempt result", breedingResult);

        if (breedingResult.success) {
          return {
            success: true,
            message: " The social interaction led to romance and breeding!",
            happiness: 15,
            offspring: breedingResult.offspring,
          };
        }
      }
    }

    console.warn(
      `${animal.name} had social interaction but no successful breeding`
    );

    // If no successful breeding but animals were interested
    return {
      success: false,
      message: " The social interaction sparked romantic interest!",
      happiness: 5,
    };
  }

  private async executeSocialize(
    animal: Animal,
    params: any
  ): Promise<ActionResult> {
    const { companions = [] } = params;
    const socialMultiplier = animal.dna.social / 100;

    const happinessGain = 25 * socialMultiplier * (1 + companions.length * 0.2);

    let breedingMessage = "";
    let additionalHappiness = 0;
    let offspring = undefined;

    // 25% chance of auto-breeding when socializing with companions
    let chance = Math.random();
    console.info("Socializing chance", chance, companions.length);
    if (companions.length > 0 && chance < 0.75) {
      const breedingResult = this.tryAutoBreedFromSocializing(
        animal,
        companions
      );
      breedingMessage = breedingResult.message;
      additionalHappiness = breedingResult.happiness;
      offspring = breedingResult.offspring;
    }

    const baseResult = {
      success: true,
      message: `${animal.name} enjoyed socializing${
        companions.length > 0 ? ` with ${companions.length} companions` : ""
      }${breedingMessage}`,
      statChanges: {
        happiness: Math.min(
          100,
          animal.stats.happiness + happinessGain + additionalHappiness
        ),
        energy: Math.max(0, animal.stats.energy - 2),
      },
      duration: 6000 + companions.length * 2000,
      offspring: offspring,
    };

    return this.applySkillEffects(animal, "socializing", baseResult);
  }

  private async executeMate(
    animal: Animal,
    params: any
  ): Promise<ActionResult> {
    const { partner } = params;

    if (!partner) {
      return {
        success: false,
        message: `${animal.name} couldn't find a suitable mate`,
        duration: 2000,
      };
    }

    // This would integrate with breeding system
    return {
      success: true,
      message: `${animal.name} is engaging in mating behavior`,
      statChanges: {
        happiness: Math.min(100, animal.stats.happiness + 30),
        energy: Math.max(0, animal.stats.energy - 30),
      },
      duration: 12000,
    };
  }

  private async executeHarvest(
    animal: Animal,
    params: any
  ): Promise<ActionResult> {
    const { resourceId, worldState } = params;

    // Check if animal has recently failed to harvest at this location
    // not needed now, it will know when it wants to
    // if (
    //   this.explorationSystem.hasRecentFailure(
    //     animal.id,
    //     animal.position,
    //     "harvest"
    //   )
    // ) {
    //   return {
    //     success: false,
    //     message: `${animal.name} remembers failing to harvest here recently and decided not to try again`,
    //     duration: 1000,
    //   };
    // }

    if (!resourceId || !worldState) {
      console.warn("harvest attempt", params);
      return {
        success: false,
        message: `${animal.name} couldn't find anything to harvest`,
        duration: 2000,
      };
    }

    // Find the resource
    // check nearbyResources because this worldState is for per animal
    const resource: NearbyResource = worldState.nearbyResources?.find(
      (r: NearbyResource) => r.id === resourceId
    );
    if (!resource || !resource.harvestable || resource.quantity <= 0) {
      console.warn(
        "harvest attempt failed",
        resourceId,
        worldState.nearbyResources
      );
      return {
        success: false,
        message: `${
          animal.name
        } couldn't harvest this resource (quantity left: ${
          resource ? resource.quantity : "N/A"
        })`,
        duration: 2000,
      };
    }

    // Check if animal is close enough to the resource
    const distance = Math.sqrt(
      Math.pow(resource.position.x - animal.position.x, 2) +
        Math.pow(resource.position.z - animal.position.z, 2)
    );

    if (distance > HARVEST_RADIUS) {
      return {
        success: false,
        message: `${animal.name} is too far from the resource to harvest it`,
        duration: 1000,
      };
    }

    // Calculate success based on animal traits and skills
    const strengthMultiplier = animal.dna.strength / 100;
    const intelligenceMultiplier = animal.dna.intelligence / 100;

    // Apply skill-based efficiency bonuses
    let skillEfficiency = 1.0;
    if (resource.type === "stone" || resource.type.includes("mineral")) {
      skillEfficiency = skillSystem.calculateSkillEfficiency(animal, "mining");
    } else if (
      resource.type.includes("plant") ||
      resource.type.includes("berry")
    ) {
      skillEfficiency = skillSystem.calculateSkillEfficiency(
        animal,
        "foraging"
      );
    } else if (
      resource.type.includes("fish") ||
      resource.type.includes("water")
    ) {
      skillEfficiency = skillSystem.calculateSkillEfficiency(animal, "fishing");
    }

    const effectiveness =
      ((strengthMultiplier + intelligenceMultiplier) / 2) * skillEfficiency;

    let energyCost = 3 + (resource.type === "stone" ? 1 : 0); // Stone is harder to harvest

    if (resource.type === "water") {
      energyCost = 0; // Water harvesting is easy, in fact, a desparate animal can do it
    }

    if (animal.stats.energy < energyCost) {
      return {
        success: false,
        message: `${animal.name} is too tired to harvest`,
        duration: 1000,
      };
    }

    // Calculate harvest amount
    let baseAmount = Math.floor(2 + effectiveness * 2);

    // harvest extra if food type
    if (resource.category === "edible_plants") {
      baseAmount += 4;
    }

    const harvestAmount = Math.min(baseAmount, resource.quantity);

    // Check inventory capacity
    const currentWeight = animal.inventory.currentWeight;
    const itemWeight =
      harvestAmount *
      (resource.type === "stone"
        ? RESOURCE_WEIGHTS.stone
        : resource.type === "wood"
        ? RESOURCE_WEIGHTS.wood
        : 0.2);

    if (currentWeight + itemWeight > animal.inventory.maxCapacity) {
      return {
        success: false,
        message: `${animal.name}'s inventory is too full to carry more`,
        duration: 1000,
      };
    }

    const baseResult = {
      success: true,
      message: `${animal.name} harvested ${harvestAmount} ${
        resource.type
      } with ${Math.round(effectiveness * 100)}% efficiency`,
      statChanges: {
        energy: Math.max(0, animal.stats.energy - energyCost),
        happiness: Math.min(100, animal.stats.happiness + 5),
      },
      harvestedItem: {
        id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: resource.type === "berries" ? "food" : (resource.type as any),
        name: resource.type,
        quantity: harvestAmount,
        quality: resource.quality,
        harvestedAt: Date.now(),
      },
      resourceId: resourceId,
      duration: 3000 + harvestAmount * 1000,
    };

    return this.applySkillEffects(
      animal,
      "harvesting",
      baseResult,
      resource.type,
      resource.quality
    );
  }

  private async executeBuilding(
    animal: Animal,
    params: any
  ): Promise<ActionResult> {
    const {
      action = "create_home",
      buildingId,
      position,
      buildingName,
      amount,
    } = params;

    let result;

    if (
      // action === "create_building" ||
      action === "create_home" ||
      action === "create_trading_post" ||
      action === "create_hospital" ||
      action === "create_factory"
    ) {
      // Create a new building
      const flatPosition = position || {
        x: animal.position.x + (Math.random() - 0.5) * 10,
        y: 0,
        z: animal.position.z + (Math.random() - 0.5) * 10,
      };

      // Create new position at home with elevation
      const buildPosition = this.elevationUtils.createElevatedPosition(
        animal.position,
        flatPosition.x,
        flatPosition.z
      );

      // Determine building type from action
      let buildingType: string = "home";
      if (action === "create_home") buildingType = "home";
      else if (action === "create_trading_post") buildingType = "trading_post";
      else if (action === "create_hospital") buildingType = "hospital";
      else if (action === "create_factory") buildingType = "factory";

      result = buildingSystem.createBuilding(
        animal,
        buildPosition,
        buildingName,
        buildingType as any
      );

      if (!result.success) {
        this.explorationSystem.addFailureMemory(
          animal.id,
          animal.position,
          "building",
          result.message || "failed to build"
        );
      }

      // Materials are now consumed automatically by the building system
    } else {
      // Modify existing building
      if (!buildingId) {
        return {
          success: false,
          message: `${animal.name} needs to specify which building to modify`,
          duration: 1000,
        };
      }

      result = buildingSystem.modifyBuilding(
        animal,
        buildingId,
        action,
        amount
      );

      // Materials are now consumed automatically by the building system
    }

    // Convert building result to action result format
    const baseHappiness = result.success ? 15 : 0;
    const areaBonus = result.areaBonus || 0;
    const totalHappinessBonus = baseHappiness + areaBonus;

    const baseResult: ActionResult = {
      success: result.success,
      message:
        result.success && areaBonus > 0
          ? `${result.message} The larger house provides +${areaBonus} extra happiness!`
          : result.message,
      duration: result.duration,
      statChanges: {
        happiness: result.success
          ? Math.min(100, animal.stats.happiness + totalHappinessBonus)
          : animal.stats.happiness,
        energy: Math.max(0, animal.stats.energy - 8), // Building is tiring work
      },
    };

    return result.success
      ? this.applySkillEffects(animal, "building", baseResult)
      : baseResult;
  }

  private async executeIdeation(
    animal: Animal,
    params: any
  ): Promise<ActionResult> {
    const { idea } = params;

    if (!idea) {
      return {
        success: false,
        message: `${animal.name} tried to have an idea but couldn't focus`,
        duration: 2000,
      };
    }

    const intelligenceMultiplier = animal.dna.intelligence / 100;
    const curiosityMultiplier = animal.dna.curiosity / 100;
    const creativityBonus = (intelligenceMultiplier + curiosityMultiplier) / 2;

    // Store the idea as an exploration memory
    this.explorationSystem.addMemory(animal.id, {
      position: {
        x: animal.position.x,
        y: animal.position.y,
        z: animal.position.z,
      },
      discoveryType: "ideation",
      description: idea,
      reliability: 0.9 + creativityBonus * 0.1, // High reliability, boosted by creativity
    });

    const energyCost = Math.max(2, 5 - creativityBonus * 2);
    const happinessGain = Math.min(15, 8 + creativityBonus * 10);

    return {
      success: true,
      message: `${animal.name} had a creative vision: "${idea}"`,
      statChanges: {
        energy: Math.max(0, animal.stats.energy - energyCost),
        happiness: Math.min(100, animal.stats.happiness + happinessGain),
      },
      duration: 6000 + creativityBonus * 2000,
    };
  }

  private async executeCrafting(
    animal: Animal,
    params: any
  ): Promise<ActionResult> {
    const { ingredients, craftingGoal, craftingMethod } = params;

    if (
      !ingredients ||
      !Array.isArray(ingredients) ||
      ingredients.length === 0
    ) {
      return {
        success: false,
        message: `${animal.name} needs to specify ingredients for crafting`,
        duration: 1000,
      };
    }

    if (!craftingGoal) {
      return {
        success: false,
        message: `${animal.name} needs to specify what they want to craft`,
        duration: 1000,
      };
    }

    // Find and validate ingredients in inventory
    const usedIngredients: CraftingIngredient[] = [];
    const usedItems: InventoryItem[] = [];

    for (const ingredientId of ingredients) {
      // const item = animal.inventory.items.find(i => i.id === ingredientId);
      // Find item by ID prefix (e.g., "item" from "item_12345", to help with exact matches)
      const item = animal.inventory.items.find((i) =>
        i.id.includes(ingredientId.split("_")[0])
      );
      if (!item) {
        return {
          success: false,
          message: `${animal.name} doesn't have ingredient ${ingredientId} in their inventory`,
          duration: 1000,
        };
      }

      if (item.quantity <= 0) {
        return {
          success: false,
          message: `${animal.name} doesn't have enough ${item.name} (need at least 1)`,
          duration: 1000,
        };
      }

      usedIngredients.push({
        itemId: item.id,
        name: item.name,
        quantity: 1, // Always use 1 unit for now
        traits: item.traits,
      });

      usedItems.push(item);
    }

    // Calculate energy cost based on complexity
    const energyCost = Math.max(5, usedIngredients.length * 3);

    if (animal.stats.energy < energyCost) {
      return {
        success: false,
        message: `${animal.name} is too tired to craft (needs ${energyCost} energy)`,
        duration: 1000,
      };
    }

    // Create the new crafted item
    const craftedItem = this.generateCraftedItem(
      usedIngredients,
      craftingGoal,
      craftingMethod,
      animal
    );

    // Calculate stat bonuses based on intelligence and creativity
    const intelligenceMultiplier = animal.dna.intelligence / 100;
    const curiosityMultiplier = animal.dna.curiosity / 100;
    const craftingSkillBonus =
      (intelligenceMultiplier + curiosityMultiplier) / 2;

    const happinessGain = Math.min(20, 10 + craftingSkillBonus * 15);
    const duration = 8000 + usedIngredients.length * 2000;

    const craftingResult: CraftingResult = {
      usedIngredients,
      createdItem: craftedItem,
      craftingMethod: craftingMethod || "combined ingredients creatively",
      skillUsed:
        intelligenceMultiplier > curiosityMultiplier
          ? "intelligence"
          : "curiosity",
    };

    const baseResult = {
      success: true,
      message: `${animal.name} successfully crafted ${
        craftedItem.name
      } using ${usedIngredients.map((i) => i.name).join(", ")}`,
      statChanges: {
        energy: Math.max(0, animal.stats.energy - energyCost),
        happiness: Math.min(100, animal.stats.happiness + happinessGain),
      },
      craftingResult,
      duration,
    };

    return this.applySkillEffects(
      animal,
      "crafting",
      baseResult,
      "crafted_item",
      craftedItem.quality
    );
  }

  private generateCraftedItem(
    ingredients: CraftingIngredient[],
    goal: string,
    method: string | undefined,
    animal: Animal
  ): InventoryItem {
    // Calculate average quality from ingredients
    const totalQuality = ingredients.reduce((sum, ing) => {
      const item = animal.inventory.items.find((i) => i.id === ing.itemId);
      return sum + (item?.quality || 50);
    }, 0);
    const avgQuality = Math.round(totalQuality / ingredients.length);

    // Combine traits from all ingredients
    const combinedTraits: Record<string, number> = {};
    ingredients.forEach((ing) => {
      if (ing.traits) {
        Object.entries(ing.traits).forEach(([trait, value]) => {
          if (!combinedTraits[trait]) {
            combinedTraits[trait] = 0;
          }
          combinedTraits[trait] = Math.max(combinedTraits[trait], value);
        });
      }
    });

    // Add crafting bonus to traits based on animal's skills
    const skillBonus = Math.round(
      ((animal.dna.intelligence + animal.dna.curiosity) / 200) * 20
    );
    Object.keys(combinedTraits).forEach((trait) => {
      combinedTraits[trait] = Math.min(
        100,
        Math.round(combinedTraits[trait] + skillBonus)
      );
    });

    // Determine item type and rarity based on ingredients and goal
    let itemType: InventoryItem["type"] = "material";
    let rarity: InventoryItem["rarity"] = "common";

    if (
      goal.toLowerCase().includes("food") ||
      goal.toLowerCase().includes("potion") ||
      goal.toLowerCase().includes("meal")
    ) {
      itemType = "food";
    } else if (
      goal.toLowerCase().includes("tool") ||
      goal.toLowerCase().includes("weapon")
    ) {
      itemType = "tool";
    } else if (
      goal.toLowerCase().includes("medicine") ||
      goal.toLowerCase().includes("healing")
    ) {
      itemType = "medicinal";
    } else if (
      goal.toLowerCase().includes("spice") ||
      goal.toLowerCase().includes("seasoning")
    ) {
      itemType = "spice";
    } else if (
      ingredients.some(
        (ing) =>
          ing.name.includes("diamond") ||
          ing.name.includes("ruby") ||
          ing.name.includes("emerald")
      )
    ) {
      itemType = "rare";
      rarity = "legendary";
    }

    // Adjust rarity based on quality and number of ingredients
    if (avgQuality > 80 && ingredients.length >= 3) {
      rarity = "epic";
    } else if (avgQuality > 60 && ingredients.length >= 2) {
      rarity = "rare";
    } else if (avgQuality > 40) {
      rarity = "uncommon";
    }

    // Generate a creative name based on goal and ingredients
    const craftedName = goal.includes(" ") ? goal : `crafted ${goal}`;
    const baseId = craftedName.toLowerCase().replace(/\s+/g, "_");

    return {
      id: `${baseId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: itemType,
      name: craftedName,
      quantity: 1,
      quality: Math.min(100, Math.round(avgQuality + skillBonus)),
      harvestedAt: Date.now(),
      rarity,
      traits:
        Object.keys(combinedTraits).length > 0 ? combinedTraits : undefined,
      craftingIngredients: ingredients, // Store what went into making this item
    };
  }

  private async executeCombat(
    animal: Animal,
    params: any
  ): Promise<ActionResult> {
    const { targetId, weaponId } = params;

    // Get bandit manager from global context (we'll need to implement this)
    const gameManager = (global as any).gameManager;
    if (!gameManager) {
      return {
        success: false,
        message: `${animal.name} cannot find combat systems`,
        duration: 1000,
      };
    }

    // Find the target bandit
    const worldState = gameManager.getWorldState();
    // const targetBandit = worldState.bandits.find(
    //   (b: Bandit) => b.id === targetId
    // );
    // bandit IDs are prefixed with name_here, so broad matching works as expected
    const targetBandit = worldState.bandits.find((b: Bandit) =>
      b.id.includes(targetId.split("_")[0])
    );

    if (!targetBandit || !targetBandit.isAlive) {
      return {
        success: false,
        message: `${animal.name} cannot find the target to attack`,
        duration: 1000,
      };
    }

    // Check if bandit is within attack range (HARVEST_RADIUS)
    const distance = Math.sqrt(
      Math.pow(targetBandit.position.x - animal.position.x, 2) +
        Math.pow(targetBandit.position.z - animal.position.z, 2)
    );

    if (distance > HARVEST_RADIUS) {
      return {
        success: false,
        message: `${animal.name} is too far away to attack ${targetBandit.name}`,
        duration: 1000,
      };
    }

    // Calculate animal's damage
    let animalDamage = animal.dna.strength * 0.3; // Base damage from strength (0-30)

    // Check for weapon (item with damage/sharp trait)
    let weaponUsed = null;
    if (weaponId) {
      // const weapon = animal.inventory.items.find(item => item.id === weaponId);
      const weapon = animal.inventory.items.find((i) =>
        i.id.includes(weaponId.split("_")[0])
      );
      if (weapon && weapon.traits) {
        const sharpTrait = weapon.traits.sharp || 0;
        const durableTrait = weapon.traits.durable || 0;
        animalDamage += sharpTrait * 0.5 + durableTrait * 0.2; // Weapon bonus
        weaponUsed = weapon;
      }
    }

    // Add some randomness
    animalDamage = animalDamage * (0.8 + Math.random() * 0.4); // 80-120% of calculated damage

    // Calculate bandit's counter-attack damage
    const banditDamage =
      targetBandit.strength * 0.4 * (0.8 + Math.random() * 0.4);

    // Apply damage to bandit
    targetBandit.health = Math.max(0, targetBandit.health - animalDamage);

    // Apply counter-attack damage to animal
    const animalHealthLoss = Math.min(animal.stats.health, banditDamage);

    let resultMessage = `${animal.name} attacks ${targetBandit.name}`;
    if (weaponUsed) {
      resultMessage += ` with ${weaponUsed.name}`;
    }
    resultMessage += ` for ${Math.round(animalDamage)} damage!`;

    const statChanges: any = {
      health: Math.max(0, animal.stats.health - animalHealthLoss),
      energy: Math.max(0, animal.stats.energy - 15), // Combat is exhausting
    };

    if (banditDamage > 0) {
      resultMessage += ` ${targetBandit.name} counter-attacks for ${Math.round(
        animalHealthLoss
      )} damage!`;
    }

    // Check if bandit is defeated
    if (targetBandit.health <= 0) {
      targetBandit.isAlive = false;
      resultMessage += ` ${targetBandit.name} has been defeated!`;

      // Award loot from bandit
      const lootItems = [...targetBandit.lootInventory];
      lootItems.forEach((item) => {
        if (gameManager.addItemToAnimalInventory(animal.id, item)) {
          resultMessage += ` Found ${item.name}!`;
        }
      });

      // Add some happiness for victory
      statChanges.happiness = Math.min(100, animal.stats.happiness + 10);
    } else {
      resultMessage += ` ${targetBandit.name} has ${Math.round(
        targetBandit.health
      )} health remaining.`;
    }

    const baseResult = {
      success: true,
      message: resultMessage,
      statChanges,
      duration: 3000, // Combat takes time
    };

    return this.applySkillEffects(animal, "combat", baseResult);
  }

  private async executeGoHome(
    animal: Animal,
    params: any
  ): Promise<ActionResult> {
    // Check if animal has a home
    const home = buildingSystem.getAnimalHome(animal.id);
    if (!home) {
      return {
        success: false,
        message: `${animal.name} doesn't have a home yet. Build a home first!`,
        duration: 1000,
      };
    }

    // Calculate energy cost using elevation utilities (reduced cost for going home)
    const baseEnergyCost =
      this.elevationUtils.calculateHorizontalDistance(
        animal.position.x,
        animal.position.z,
        home.position.x,
        home.position.z
      ) * 0.5;

    const energyCost = Math.min(
      6,
      this.elevationUtils.calculateElevationEnergyCost(
        animal.position.x,
        animal.position.z,
        home.position.x,
        home.position.z,
        baseEnergyCost
      )
    );

    if (animal.stats.energy < energyCost) {
      return {
        success: false,
        message: `${animal.name} is too tired to travel home`,
        duration: 1000,
      };
    }

    // Create new position at home with elevation
    const newPosition = this.elevationUtils.createElevatedPosition(
      animal.position,
      home.position.x,
      home.position.z
    );

    // Calculate distance for duration
    const distance = this.elevationUtils.calculateHorizontalDistance(
      animal.position.x,
      animal.position.z,
      home.position.x,
      home.position.z
    );

    return {
      success: true,
      message: `${animal.name} traveled home and feels safe and comfortable`,
      statChanges: {
        energy: Math.max(0, animal.stats.energy - energyCost),
        happiness: Math.min(100, animal.stats.happiness + 8), // Home gives happiness
      },
      newPosition,
      duration: Math.max(2000, distance * 200), // Fast travel home
    };
  }

  private async executeVisitTradingPost(
    animal: Animal,
    params: any
  ): Promise<ActionResult> {
    // Check if trading post exists
    const tradingPost = buildingSystem.getTradingPost();
    if (!tradingPost) {
      return {
        success: false,
        message: `${animal.name} cannot find a trading post. One must be built first!`,
        duration: 1000,
      };
    }

    // Calculate energy cost using elevation utilities
    const baseEnergyCost =
      this.elevationUtils.calculateHorizontalDistance(
        animal.position.x,
        animal.position.z,
        tradingPost.position.x,
        tradingPost.position.z
      ) * 0.8;

    const energyCost = Math.min(
      6,
      this.elevationUtils.calculateElevationEnergyCost(
        animal.position.x,
        animal.position.z,
        tradingPost.position.x,
        tradingPost.position.z,
        baseEnergyCost
      )
    );

    if (animal.stats.energy < energyCost) {
      return {
        success: false,
        message: `${animal.name} is too tired to travel to the trading post`,
        duration: 1000,
      };
    }

    // Create new position at trading post with elevation
    const newPosition = this.elevationUtils.createElevatedPosition(
      animal.position,
      tradingPost.position.x,
      tradingPost.position.z
    );

    // Calculate distance for duration
    const distance = this.elevationUtils.calculateHorizontalDistance(
      animal.position.x,
      animal.position.z,
      tradingPost.position.x,
      tradingPost.position.z
    );

    return {
      success: true,
      message: `${animal.name} visited the trading post and feels inspired by commerce`,
      statChanges: {
        energy: Math.max(0, animal.stats.energy - energyCost),
        happiness: Math.min(100, animal.stats.happiness + 5),
      },
      newPosition,
      duration: Math.max(3000, distance * 300),
    };
  }

  private async executeVisitHospital(
    animal: Animal,
    params: any
  ): Promise<ActionResult> {
    // Check if hospital exists
    const hospital = buildingSystem.getHospital();
    if (!hospital) {
      return {
        success: false,
        message: `${animal.name} cannot find a hospital. One must be built first!`,
        duration: 1000,
      };
    }

    // Calculate energy cost using elevation utilities
    const baseEnergyCost =
      this.elevationUtils.calculateHorizontalDistance(
        animal.position.x,
        animal.position.z,
        hospital.position.x,
        hospital.position.z
      ) * 0.8;

    const energyCost = Math.min(
      6,
      this.elevationUtils.calculateElevationEnergyCost(
        animal.position.x,
        animal.position.z,
        hospital.position.x,
        hospital.position.z,
        baseEnergyCost
      )
    );

    if (animal.stats.energy < energyCost) {
      return {
        success: false,
        message: `${animal.name} is too tired to travel to the hospital`,
        duration: 1000,
      };
    }

    // Create new position at hospital with elevation
    const newPosition = this.elevationUtils.createElevatedPosition(
      animal.position,
      hospital.position.x,
      hospital.position.z
    );

    // Calculate distance for duration
    const distance = this.elevationUtils.calculateHorizontalDistance(
      animal.position.x,
      animal.position.z,
      hospital.position.x,
      hospital.position.z
    );

    // Hospital visit provides healing
    const healingBonus = 15;

    return {
      success: true,
      message: `${animal.name} visited the hospital and received medical care`,
      statChanges: {
        energy: Math.max(0, animal.stats.energy - energyCost),
        health: Math.min(100, animal.stats.health + healingBonus),
        happiness: Math.min(100, animal.stats.happiness + 3),
      },
      newPosition,
      duration: Math.max(4000, distance * 300),
    };
  }

  private async executeIdle(
    animal: Animal,
    params: any
  ): Promise<ActionResult> {
    return {
      success: true,
      message: `${animal.name} is resting and observing their surroundings`,
      statChanges: {
        energy: Math.min(100, animal.stats.energy + 3),
        happiness: Math.min(100, animal.stats.happiness + 1),
      },
      duration: 5000,
    };
  }

  private async executeInteract(
    animal: Animal,
    params: any
  ): Promise<ActionResult> {
    const { buildingId, option } = params;

    if (!buildingId || !option) {
      return {
        success: false,
        message: `${animal.name} needs to specify a building and interaction option`,
        duration: 1000,
      };
    }

    // Get the building
    const building = buildingSystem.getBuilding(buildingId);
    if (!building) {
      return {
        success: false,
        message: `${animal.name} cannot find that building`,
        duration: 1000,
      };
    }

    // Check distance
    const distance = Math.sqrt(
      Math.pow(building.position.x - animal.position.x, 2) +
        Math.pow(building.position.z - animal.position.z, 2)
    );

    if (distance > 5) {
      return {
        success: false,
        message: `${animal.name} is too far from the building to interact`,
        duration: 1000,
      };
    }

    // Execute the interaction using building interactions system
    try {
      // const { executeInteraction } = require("./building-interactions");
      const result = await executeInteraction(animal, building, option);

      // Convert building interaction result to action result format
      const actionResult: ActionResult = {
        success: result.success,
        message: result.message,
        statChanges: result.statChanges,
        duration: result.duration,
      };

      // Add consumed/received items if present
      if (result.consumedItem) {
        actionResult.consumedItem = result.consumedItem;
      }
      if (result.receivedItem) {
        actionResult.harvestedItem = result.receivedItem; // Reuse harvestedItem field for consistency
      }

      return actionResult;
    } catch (error) {
      console.error("Error executing building interaction:", error);
      return {
        success: false,
        message: `${animal.name} encountered an error during interaction`,
        duration: 1000,
      };
    }
  }
}
