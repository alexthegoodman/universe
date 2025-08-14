import { v4 as uuidv4 } from "uuid";
import type {
  Animal,
  AnimalStats,
  AnimalPosition,
  Inventory,
} from "../types/animal";
import { DNASystem } from "./dna-system";

export class AnimalLifecycle {
  static createAnimal(
    name: string,
    position: AnimalPosition = { x: 0, y: 0, z: 0, rotation: 0 },
    parentDNA?: [any, any]
  ): Animal {
    const now = Date.now();
    const lifespan = this.generateLifespan();

    const dna = parentDNA
      ? DNASystem.breedDNA(parentDNA[0], parentDNA[1])
      : DNASystem.generateRandomDNA();

    return {
      id: uuidv4(),
      name,
      dna,
      stats: this.generateInitialStats(dna),
      position,
      inventory: this.generateInitialInventory(dna),
      birthTime: now,
      lifespan,
      age: 0,
      currentAction: "idle",
      lastHealthCheck: now,
      isAlive: true,
    };
  }

  static generateLifespan(): number {
    // Random lifespan between 1-24 hours (in milliseconds)
    const minHours = 1;
    // const maxHours = 24; // Max 24 hours
    const maxHours = 2; // Max 2 hours for testing
    const hours = minHours + Math.random() * (maxHours - minHours);
    return hours * 60 * 60 * 1000;
  }

  static generateInitialStats(dna: any): AnimalStats {
    // Base stats influenced by DNA traits
    const base = 50;
    const variation = 20;

    return {
      health: Math.max(
        20,
        Math.min(
          100,
          base + (dna.resilience - 50) * 0.3 + (Math.random() - 0.5) * variation
        )
      ),
      hunger: Math.max(0, Math.min(80, 30 + Math.random() * 20)), // Start somewhat hungry
      energy: Math.max(
        20,
        Math.min(
          100,
          base + (dna.strength - 50) * 0.2 + (Math.random() - 0.5) * variation
        )
      ),
      happiness: Math.max(
        20,
        Math.min(
          100,
          base + (dna.social - 50) * 0.3 + (Math.random() - 0.5) * variation
        )
      ),
      thirst: Math.max(0, Math.min(80, 20 + Math.random() * 20)), // Start somewhat thirsty
    };
  }

  static generateInitialInventory(dna: any): Inventory {
    // Inventory capacity based on strength (bigger/stronger animals can carry more)
    const baseCapacity = 20;
    const strengthMultiplier = dna.strength / 100;
    const sizeMultiplier = dna.size;
    const maxCapacity = Math.floor(
      baseCapacity * strengthMultiplier * sizeMultiplier
    );

    return {
      items: [], // Start with empty inventory
      maxCapacity: Math.max(5, maxCapacity), // Minimum capacity of 5
      currentWeight: 0,
    };
  }

  static updateAge(animal: Animal): Animal {
    const now = Date.now();
    const elapsed = now - animal.birthTime;
    const newAge = Math.min(1, elapsed / animal.lifespan);

    return {
      ...animal,
      age: newAge,
      isAlive: newAge < 1,
    };
  }

  static degradeStats(animal: Animal): AnimalStats {
    // Natural stat degradation over time
    const timeSinceLastCheck = Date.now() - animal.lastHealthCheck;
    const minutesElapsed = timeSinceLastCheck / (1000 * 60);

    // Degradation rates per minute
    const degradationRates = {
      hunger: 1.5,
      thirst: 2.0,
      energy: 0.8,
      happiness: 0.5,
      health: 0.1,
    };

    // Age affects degradation (older animals degrade faster)
    const ageMultiplier = 1 + animal.age * 0.5;

    // DNA resilience affects degradation
    const resilienceMultiplier = 1 - (animal.dna.resilience / 100) * 0.3;

    const totalMultiplier = ageMultiplier * resilienceMultiplier;

    return {
      health: Math.max(
        0,
        animal.stats.health -
          degradationRates.health * minutesElapsed * totalMultiplier
      ),
      hunger: Math.min(
        100,
        animal.stats.hunger +
          degradationRates.hunger * minutesElapsed * totalMultiplier
      ),
      energy: Math.max(
        0,
        animal.stats.energy -
          degradationRates.energy * minutesElapsed * totalMultiplier
      ),
      happiness: Math.max(
        0,
        animal.stats.happiness -
          degradationRates.happiness * minutesElapsed * totalMultiplier
      ),
      thirst: Math.min(
        100,
        animal.stats.thirst +
          degradationRates.thirst * minutesElapsed * totalMultiplier
      ),
    };
  }

  static checkHealth(animal: Animal): {
    isHealthy: boolean;
    criticalStats: string[];
  } {
    const critical = [];

    if (animal.stats.health < 20) critical.push("health");
    if (animal.stats.hunger > 80) critical.push("hunger");
    if (animal.stats.thirst > 80) critical.push("thirst");
    if (animal.stats.energy < 20) critical.push("energy");

    return {
      isHealthy: critical.length === 0,
      criticalStats: critical,
    };
  }

  static calculateSurvivalPriority(animal: Animal): number {
    // Higher number = more urgent survival needs
    const healthWeight =
      animal.stats.health < 30 ? (30 - animal.stats.health) * 2 : 0;
    const hungerWeight =
      animal.stats.hunger > 70 ? (animal.stats.hunger - 70) * 1.5 : 0;
    const thirstWeight =
      animal.stats.thirst > 70 ? (animal.stats.thirst - 70) * 2 : 0;
    const energyWeight =
      animal.stats.energy < 30 ? (30 - animal.stats.energy) * 1 : 0;

    return healthWeight + hungerWeight + thirstWeight + energyWeight;
  }

  static getLifeStage(animal: Animal): "baby" | "young" | "adult" | "elder" {
    if (animal.age < 0.15) return "baby";
    if (animal.age < 0.35) return "young";
    if (animal.age < 0.75) return "adult";
    return "elder";
  }

  static generateRandomName(): string {
    const prefixes = [
      "Zara",
      "Kiko",
      "Luna",
      "Max",
      "Pip",
      "Sage",
      "Echo",
      "Nova",
      "Rex",
      "Mira",
      "Zuri",
      "Finn",
      "Skye",
      "Orion",
      "Ivy",
      "Atlas",
    ];

    const suffixes = [
      "paw",
      "tail",
      "whisker",
      "heart",
      "wing",
      "star",
      "moon",
      "sun",
      "storm",
      "flame",
      "wave",
      "leaf",
      "stone",
      "frost",
      "ember",
      "spark",
    ];

    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];

    if (Math.random() < 0.3) {
      const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
      return `${prefix}${suffix}`;
    }

    return prefix;
  }
}
