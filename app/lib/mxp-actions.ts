import type {
  Animal,
  AnimalAction,
  ActionResult,
  AnimalPosition,
  NearbyResource,
} from "../types/animal";
import { ExplorationSystem } from "./exploration-system";
import { HARVEST_RADIUS } from "./health-monitor";

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

  constructor() {
    this.config = {
      move: {
        maxDistance: 10,
        energyCost: 5,
      },
      eat: {
        nutritionGain: 25,
        hungerReduction: 20,
        energyGain: 10,
      },
      drink: {
        thirstReduction: 25,
        healthGain: 5,
      },
      sleep: {
        energyGain: 40,
        healthGain: 15,
        duration: 10000, // 10 seconds
      },
      work: {
        energyCost: 25,
        happinessGain: 10,
        productionRate: 1,
      },
      play: {
        happinessGain: 20,
        energyCost: 15,
        socialBonus: 10,
      },
    };

    this.explorationSystem = new ExplorationSystem();
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

    // Calculate movement based on agility
    const agilityMultiplier = animal.dna.agility / 100;
    const actualSpeed = speed * agilityMultiplier;

    // Calculate energy cost based on distance and size
    const distance = Math.sqrt(
      Math.pow(targetX - animal.position.x, 2) +
        Math.pow(targetZ - animal.position.z, 2)
    );

    const energyCost = Math.min(
      this.config.move.energyCost * (distance / 10) * animal.dna.size,
      animal.stats.energy
    );

    if (animal.stats.energy < energyCost) {
      return {
        success: false,
        message: `${animal.name} is too tired to move that far`,
        duration: 1000,
      };
    }

    // Calculate new position (simplified for now)
    const newPosition: AnimalPosition = {
      x: targetX,
      y: animal.position.y,
      z: targetZ,
      rotation: Math.atan2(
        targetZ - animal.position.z,
        targetX - animal.position.x
      ),
    };

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
    const { foodType = "unknown", quality = 1 } = params;

    // Only allow eating from inventory
    const foodItem = animal.inventory.items.find(
      (item) => item.type === "food" && item.quantity > 0
    );

    if (!foodItem) {
      return {
        success: false,
        message: `${animal.name} has no food in their inventory to eat`,
        duration: 1000,
      };
    }

    const actualQuality = foodItem.quality / 100;
    const hungerReduction = this.config.eat.hungerReduction * actualQuality;
    const energyGain = this.config.eat.energyGain * actualQuality;
    const healthGain = actualQuality > 1 ? 5 : 2;

    return {
      success: true,
      message: `${animal.name} enjoyed eating ${foodItem.name} from their inventory`,
      statChanges: {
        hunger: Math.max(0, animal.stats.hunger - hungerReduction),
        energy: Math.min(100, animal.stats.energy + energyGain),
        health: Math.min(100, animal.stats.health + healthGain),
        happiness: Math.min(100, animal.stats.happiness + 5),
      },
      consumedItem: {
        id: foodItem.id,
        type: foodItem.type,
        name: foodItem.name,
        quantity: 1,
        quality: foodItem.quality,
        harvestedAt: foodItem.harvestedAt,
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

    return {
      success: true,
      message: `${animal.name} quenched their thirst with stored water`,
      statChanges: {
        thirst: Math.max(0, animal.stats.thirst - thirstReduction),
        health: Math.min(100, animal.stats.health + healthGain),
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
    const { comfort = 1, safety = 1 } = params;

    const energyGain = this.config.sleep.energyGain * comfort;
    const healthGain = this.config.sleep.healthGain * safety;
    const duration = this.config.sleep.duration * (2 - comfort); // Less comfortable = longer sleep needed

    return {
      success: true,
      message: `${animal.name} is sleeping peacefully`,
      statChanges: {
        energy: Math.min(100, animal.stats.energy + energyGain),
        health: Math.min(100, animal.stats.health + healthGain),
        happiness: Math.min(100, animal.stats.happiness + comfort * 5),
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
      // Use AI-provided exploration target
      newPosition = {
        x: explorationTarget.x,
        y: animal.position.y,
        z: explorationTarget.z,
        rotation: Math.atan2(
          explorationTarget.z - animal.position.z,
          explorationTarget.x - animal.position.x
        ),
      };
      goalReason = "Exploring towards AI-chosen destination";
    } else {
      // Fallback to exploration system for intelligent exploration
      const explorationGoal = this.explorationSystem.determineExplorationGoal(
        animal,
        worldState || {}
      );
      newPosition = this.explorationSystem.generateExplorationPosition(
        animal,
        explorationGoal
      );
      goalReason = explorationGoal.reason;
    }

    // Calculate energy cost and happiness gain
    const distance = Math.sqrt(
      Math.pow(newPosition.x - animal.position.x, 2) +
        Math.pow(newPosition.z - animal.position.z, 2)
    );
    const energyCost = Math.min(15 + distance * 2, animal.stats.energy * 0.3);
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
            y: 0,
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
      if (Math.random() < 0.2) {
        const randomDiscoveries = [
          "interesting scent trail",
          "good hiding spot",
          "comfortable resting area",
          "unusual tracks",
          "sheltered area",
        ];
        const discovery =
          randomDiscoveries[
            Math.floor(Math.random() * randomDiscoveries.length)
          ];
        discoveries.push(discovery);

        this.explorationSystem.addMemory(animal.id, {
          position: { x: newPosition.x, y: newPosition.y, z: newPosition.z },
          discoveryType: "interesting",
          description: `Found ${discovery}`,
          reliability: 0.6,
        });
      }

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

    return {
      success: true,
      message: `${animal.name} ${goalReason}${discoveryMessage}${memoryContext}`,
      statChanges: {
        happiness: Math.min(100, animal.stats.happiness + happiness),
        energy: Math.max(0, animal.stats.energy - energyCost),
      },
      newPosition,
      duration: 8000 + distance * 500, // Duration based on distance traveled
    };
  }

  private async executeSocialize(
    animal: Animal,
    params: any
  ): Promise<ActionResult> {
    const { companions = [] } = params;
    const socialMultiplier = animal.dna.social / 100;

    const happinessGain = 25 * socialMultiplier * (1 + companions.length * 0.2);

    return {
      success: true,
      message: `${animal.name} enjoyed socializing${
        companions.length > 0 ? ` with ${companions.length} companions` : ""
      }`,
      statChanges: {
        happiness: Math.min(100, animal.stats.happiness + happinessGain),
        energy: Math.max(0, animal.stats.energy - 5),
      },
      duration: 6000 + companions.length * 2000,
    };
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
        message: `${animal.name} couldn't harvest this resource`,
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

    // Calculate success based on animal traits
    const strengthMultiplier = animal.dna.strength / 100;
    const intelligenceMultiplier = animal.dna.intelligence / 100;
    const effectiveness = (strengthMultiplier + intelligenceMultiplier) / 2;

    const energyCost = 15 + (resource.type === "stone" ? 10 : 0); // Stone is harder to harvest

    if (animal.stats.energy < energyCost) {
      return {
        success: false,
        message: `${animal.name} is too tired to harvest`,
        duration: 1000,
      };
    }

    // Calculate harvest amount
    const baseAmount = Math.floor(1 + effectiveness * 2);
    const harvestAmount = Math.min(baseAmount, resource.quantity);

    // Check inventory capacity
    const currentWeight = animal.inventory.currentWeight;
    const itemWeight =
      harvestAmount *
      (resource.type === "stone" ? 3 : resource.type === "wood" ? 2 : 1);

    if (currentWeight + itemWeight > animal.inventory.maxCapacity) {
      return {
        success: false,
        message: `${animal.name}'s inventory is too full to carry more`,
        duration: 1000,
      };
    }

    return {
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
}
