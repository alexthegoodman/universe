import type {
  Animal,
  SightBasedWorldState,
  NearbyResource,
  NearbyAnimal,
  NearbyBuilding,
  ResourceSummary,
} from "../types/animal";
import { AnimalLifecycle } from "./animal-lifecycle";
import { AnimalAI } from "./animal-ai";
import { MXPActionSystem } from "./mxp-actions";
import { animalStateManager } from "./animal-state-manager";
import { explorationSystem, ExplorationSystem } from "./exploration-system";
import { actionLogger } from "./action-logger";
import { buildingSystem } from "./building-system";
import { clientPlanningManager, type PlanStep } from "./client-planning-manager";

export const HARVEST_RADIUS = 4; // Animals can harvest within this radius

export interface HealthAlert {
  animalId: string;
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  timestamp: number;
  suggestedActions: string[];
}

export interface HealthReport {
  animal: Animal;
  alerts: HealthAlert[];
  nextActionRecommendation: string;
  overallStatus: "healthy" | "warning" | "critical" | "dying";
}

export class HealthMonitor {
  private aiInstances: Map<string, AnimalAI> = new Map();
  private actionSystem: MXPActionSystem;
  private explorationSystem: ExplorationSystem;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private decisionStagger: Map<string, number> = new Map();
  private gameManagerRef: any = null; // Weak reference to avoid circular dependency
  // private readonly HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
  // private readonly DECISION_STAGGER_RANGE = 15000; // 15 second range for staggering
  private readonly HEALTH_CHECK_INTERVAL = 15000; // 10 seconds for testing
  private readonly DECISION_STAGGER_RANGE = 7500; // 5 seconds for testing

  constructor() {
    this.actionSystem = new MXPActionSystem();
    this.explorationSystem = explorationSystem;
  }

  setGameManagerReference(gameManager: any): void {
    this.gameManagerRef = gameManager;
  }

  addAnimal(animal: Animal): void {
    // Add to centralized state manager
    animalStateManager.setAnimal(animal);
    this.aiInstances.set(animal.id, new AnimalAI(animal.id));

    // Assign random stagger offset for this animal (0-15 seconds)
    const staggerOffset = Math.random() * this.DECISION_STAGGER_RANGE;
    this.decisionStagger.set(animal.id, staggerOffset);

    // Start monitoring if this is the first animal
    if (animalStateManager.getAllAnimals().length === 1) {
      this.startMonitoring();
    }
  }

  removeAnimal(animalId: string): void {
    // Remove from centralized state manager
    animalStateManager.removeAnimal(animalId);
    this.aiInstances.delete(animalId);
    this.decisionStagger.delete(animalId);

    // Stop monitoring if no animals left
    if (animalStateManager.getAllAnimals().length === 0) {
      this.stopMonitoring();
    }
  }

  getAnimal(animalId: string): Animal | undefined {
    return animalStateManager.getAnimal(animalId);
  }

  getAllAnimals(): Animal[] {
    return animalStateManager.getAllAnimals();
  }

  startMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks();
    }, this.HEALTH_CHECK_INTERVAL);

    console.log("Health monitoring started - checking every 30 seconds");
  }

  stopMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    console.log("Health monitoring stopped");
  }

  private async performHealthChecks(): Promise<void> {
    const reports: HealthReport[] = [];
    const currentTime = Date.now();
    const animals = animalStateManager.getAllAnimals();

    for (const animal of animals) {
      try {
        const report = await this.checkAnimalHealth(animal);
        reports.push(report);

        // Update the animal in centralized state manager
        animalStateManager.setAnimal(report.animal);

        // Log critical alerts
        const criticalAlerts = report.alerts.filter(
          (alert) => alert.severity === "critical"
        );
        if (criticalAlerts.length > 0) {
          console.warn(
            `🚨 Critical health alerts for ${animal.name}:`,
            criticalAlerts
          );
        }

        // Staggered AI decision making - each animal gets a different delay
        const staggerOffset = this.decisionStagger.get(animal.id) || 0;

        // Always use AI for decision making, but adjust delay based on health status
        let delayMultiplier = 1.0; // Default delay for healthy animals
        if (
          report.overallStatus === "critical" ||
          report.overallStatus === "dying"
        ) {
          delayMultiplier = 0.1; // Minimal delay for critical health
        } else if (report.overallStatus === "warning") {
          delayMultiplier = 0.3; // Moderate delay for warnings
        }

        setTimeout(
          () => this.handleAnimalDecision(animal, report.overallStatus),
          staggerOffset * delayMultiplier
        );
      } catch (error) {
        console.error(`Error checking health for animal ${animal.id}:`, error);
      }
    }

    // Emit health reports for UI updates (if needed)
    this.emitHealthReports(reports);
  }

  private async checkAnimalHealth(animal: Animal): Promise<HealthReport> {
    // Get the most current animal state (in case position was updated)
    const currentAnimal = animalStateManager.getAnimal(animal.id) || animal;

    // Update age
    const updatedAnimal = AnimalLifecycle.updateAge(currentAnimal);

    // Degrade stats naturally
    const degradedStats = AnimalLifecycle.degradeStats(updatedAnimal);
    const animalWithDegradedStats = {
      ...updatedAnimal,
      stats: degradedStats,
      lastHealthCheck: Date.now(),
    };

    // Update age and stats in state manager
    animalStateManager.updateAge(
      animal.id,
      updatedAnimal.age,
      updatedAnimal.isAlive
    );
    animalStateManager.updateStats(animal.id, degradedStats, "health-monitor");

    // Check for health issues
    const { isHealthy, criticalStats } = AnimalLifecycle.checkHealth(
      animalWithDegradedStats
    );
    const alerts: HealthAlert[] = [];

    // Generate alerts based on stats
    if (animalWithDegradedStats.stats.health < 10) {
      alerts.push({
        animalId: animal.id,
        severity: "critical",
        message: `${animal.name} is critically ill and may die soon!`,
        timestamp: Date.now(),
        suggestedActions: ["find medicine", "rest", "seek shelter"],
      });
    } else if (animalWithDegradedStats.stats.health < 30) {
      alerts.push({
        animalId: animal.id,
        severity: "high",
        message: `${animal.name} is in poor health`,
        timestamp: Date.now(),
        suggestedActions: ["rest", "find food", "avoid strenuous activity"],
      });
    }

    if (animalWithDegradedStats.stats.hunger > 90) {
      alerts.push({
        animalId: animal.id,
        severity: "critical",
        message: `${animal.name} is starving!`,
        timestamp: Date.now(),
        suggestedActions: ["find food immediately", "hunt", "forage"],
      });
    } else if (animalWithDegradedStats.stats.hunger > 70) {
      alerts.push({
        animalId: animal.id,
        severity: "high",
        message: `${animal.name} is very hungry`,
        timestamp: Date.now(),
        suggestedActions: ["find food", "eat"],
      });
    }

    if (animalWithDegradedStats.stats.thirst > 90) {
      alerts.push({
        animalId: animal.id,
        severity: "critical",
        message: `${animal.name} is severely dehydrated!`,
        timestamp: Date.now(),
        suggestedActions: ["find water immediately", "drink"],
      });
    } else if (animalWithDegradedStats.stats.thirst > 70) {
      alerts.push({
        animalId: animal.id,
        severity: "high",
        message: `${animal.name} is very thirsty`,
        timestamp: Date.now(),
        suggestedActions: ["find water", "drink"],
      });
    }

    if (animalWithDegradedStats.stats.energy < 10) {
      alerts.push({
        animalId: animal.id,
        severity: "high",
        message: `${animal.name} is exhausted`,
        timestamp: Date.now(),
        suggestedActions: ["sleep", "rest", "find safe place"],
      });
    }

    if (animalWithDegradedStats.stats.happiness < 20) {
      alerts.push({
        animalId: animal.id,
        severity: "medium",
        message: `${animal.name} is very unhappy`,
        timestamp: Date.now(),
        suggestedActions: ["play", "socialize", "explore"],
      });
    }

    // Check if animal died of old age
    if (!animalWithDegradedStats.isAlive) {
      alerts.push({
        animalId: animal.id,
        severity: "critical",
        message: `${animal.name} has reached the end of their natural lifespan`,
        timestamp: Date.now(),
        suggestedActions: ["memorial", "offspring care"],
      });
    }

    // Determine overall status
    let overallStatus: HealthReport["overallStatus"] = "healthy";

    if (!animalWithDegradedStats.isAlive) {
      overallStatus = "dying";
    } else if (alerts.some((alert) => alert.severity === "critical")) {
      overallStatus = "critical";
    } else if (alerts.some((alert) => alert.severity === "high")) {
      overallStatus = "warning";
    }

    // Get AI recommendation for next action
    const survivalPriority = AnimalLifecycle.calculateSurvivalPriority(
      animalWithDegradedStats
    );
    let nextActionRecommendation = "idle";

    if (survivalPriority > 50) {
      // Critical survival needs
      if (animalWithDegradedStats.stats.health < 30)
        nextActionRecommendation = "sleeping";
      else if (animalWithDegradedStats.stats.thirst > 70)
        nextActionRecommendation = "drinking";
      else if (animalWithDegradedStats.stats.hunger > 70)
        nextActionRecommendation = "eating";
      else if (animalWithDegradedStats.stats.energy < 30)
        nextActionRecommendation = "sleeping";
    } else {
      // Recreational activities
      const lifeStage = AnimalLifecycle.getLifeStage(animalWithDegradedStats);
      if (lifeStage === "baby" || lifeStage === "young") {
        nextActionRecommendation = "playing";
      } else if (animalWithDegradedStats.dna.curiosity > 70) {
        nextActionRecommendation = "exploring";
      } else if (animalWithDegradedStats.dna.social > 70) {
        nextActionRecommendation = "socializing";
      } else {
        nextActionRecommendation = "idle";
      }
    }

    return {
      animal: animalWithDegradedStats,
      alerts,
      nextActionRecommendation,
      overallStatus,
    };
  }

  private async handleAnimalDecision(
    animal: Animal,
    healthStatus: "healthy" | "warning" | "critical" | "dying"
  ): Promise<void> {
    // Check if animal can make a new decision (respecting plan timing)
    if (!clientPlanningManager.canMakeNewDecision(animal.id)) {
      const plan = clientPlanningManager.getPlan(animal.id);
      if (clientPlanningManager.isExecutingStep(animal.id)) {
        console.log(`⏳ ${animal.name} is still executing plan step, skipping decision`);
      } else {
        console.log(`⏱️ ${animal.name} waiting for plan step delay (${plan?.planType || 'unknown'} plan)`);
      }
      return;
    }

    // First priority: Execute current plan step if available
    const currentStep = clientPlanningManager.getCurrentStep(animal.id);
    if (currentStep) {
      await this.executePlanStep(animal, currentStep);
      return;
    }

    // Second priority: Create new plan if needed
    const needsNewPlan = clientPlanningManager.needsNewPlan(animal.id);
    if (needsNewPlan) {
      console.log(`📋 ${animal.name} needs a new plan (${healthStatus})`);
      await this.createNewPlan(animal, healthStatus);
      
      // After creating plan, try to execute first step
      const firstStep = clientPlanningManager.getCurrentStep(animal.id);
      if (firstStep) {
        await this.executePlanStep(animal, firstStep);
      }
      return;
    }

    // Fallback: No plan and no immediate step - should not happen
    console.warn(`⚠️ ${animal.name} has no plan step to execute and doesn't need new plan`);
  }

  private async executePlanStep(animal: Animal, step: PlanStep): Promise<void> {
    console.log(`📋 Executing plan step: ${step.action} - ${step.reason}`);
    
    // Mark step as started
    clientPlanningManager.startStep(animal.id, step.id);

    // Build action parameters from step
    const actionParams: any = {
      ...step.parameters,
    };

    // Execute the step action
    await this.executeAnimalAction(animal, step.action as any, actionParams);
  }

  private async createNewPlan(
    animal: Animal, 
    healthStatus: "healthy" | "warning" | "critical" | "dying"
  ): Promise<void> {
    const statusEmoji = {
      healthy: "🤔",
      warning: "⚠️", 
      critical: "🚨",
      dying: "💀",
    };

    console.log(`${statusEmoji[healthStatus]} ${animal.name} is creating a new plan... (${healthStatus})`);

    const ai = this.aiInstances.get(animal.id);
    if (!ai) {
      console.error(`No AI instance found for ${animal.name}`);
      return;
    }

    try {
      const worldState = this.getWorldStateForAnimal(animal);
      // AI will only be called for plan creation now, not individual actions
      const result = await ai.decideAction(animal, worldState);
      
      if (result.newPlan) {
        console.log(`📋 Created new plan for ${animal.name}: ${result.newPlan.steps.length} steps (${result.newPlan.planType})`);
      } else {
        console.warn(`⚠️ AI did not create a plan for ${animal.name}, using fallback`);
        // Could implement emergency fallback plan here
      }
    } catch (error) {
      console.error(`Error creating plan for ${animal.name}:`, error);
    }
  }

  private findNearestResource(
    position: any,
    resourceType: string,
    resources: any[]
  ): any {
    let nearest = null;
    let minDistance = Infinity;

    for (const resource of resources) {
      if (resource.type === resourceType && resource.quantity > 0) {
        const distance = this.getDistance(position, resource.position);
        if (distance < minDistance) {
          minDistance = distance;
          nearest = resource;
        }
      }
    }

    return nearest;
  }

  private getDistance(pos1: any, pos2: any): number {
    return Math.sqrt(
      Math.pow(pos1.x - pos2.x, 2) + Math.pow(pos1.z - pos2.z, 2)
    );
  }

  private async executeAnimalAction(
    animal: Animal,
    action: any,
    customParams?: any
  ): Promise<void> {
    try {
      // Capture stats before action for logging
      const statsBefore = { ...animal.stats };

      // Generate random parameters for certain actions
      let params: any = {
        worldState: this.getWorldStateForAnimal(animal), // Always include world state
      };

      // Merge custom parameters if provided
      if (customParams) {
        params = { ...params, ...customParams };
      }

      if (action === "moving" && !params.targetX && !params.targetZ) {
        // Generate a random nearby target for movement only if no specific target provided
        const range = 6;
        params = {
          ...params,
          targetX: animal.position.x + (Math.random() - 0.5) * range,
          targetZ: animal.position.z + (Math.random() - 0.5) * range,
          speed: 1,
        };
      }

      const result = await this.actionSystem.executeAction(
        animal,
        action,
        params
      );

      if (result.success) {
        // Handle consumed items if any
        if (result.consumedItem && this.gameManagerRef) {
          this.gameManagerRef.consumeItemFromInventory(
            animal.id,
            result.consumedItem.type,
            result.consumedItem.quantity || 1
          );
        }

        // Handle harvested items if any
        if (result.harvestedItem && result.resourceId && this.gameManagerRef) {
          // First harvest the resource from the world
          const harvestResult = this.gameManagerRef.harvestResource(
            result.resourceId,
            result.harvestedItem.quantity
          );

          if (harvestResult.success && harvestResult.item) {
            // Add the harvested item to the animal's inventory
            const added = this.gameManagerRef.addItemToAnimalInventory(
              animal.id,
              harvestResult.item
            );

            if (!added) {
              console.warn(
                `⚠️ ${animal.name} couldn't carry the harvested items - inventory full`
              );
            }
          }
        }

        // Use centralized state manager to apply updates
        animalStateManager.updateFromActionResult(
          animal.id,
          result,
          action,
          "health-monitor"
        );
        console.log(`✅ ${result.message}`);
      } else {
        // Still update the current action even if the action failed
        const currentAnimal = animalStateManager.getAnimal(animal.id);
        if (currentAnimal) {
          animalStateManager.setAnimal({
            ...currentAnimal,
            currentAction: "idle",
          });
        }
        console.log(`❌ ${result.message}`);
      }

      // Get stats after action for logging
      const updatedAnimal = animalStateManager.getAnimal(animal.id) || animal;
      const statsAfter = { ...updatedAnimal.stats };

      // Log the action with before/after stats
      actionLogger.logAction(animal, action, result, statsBefore, statsAfter);

      // Update planning system - mark current step as completed
      clientPlanningManager.completeCurrentStep(animal.id, result.success);
    } catch (error) {
      console.error(
        `Error executing action ${action} for ${animal.name}:`,
        error
      );
      
      // Mark planning step as failed
      clientPlanningManager.completeCurrentStep(animal.id, false);
    }
  }

  private getWorldStateForAnimal(animal: Animal): SightBasedWorldState {
    const SIGHT_RADIUS = this.explorationSystem.getSightRadius(animal);

    // Get nearby animals (within sight)
    const nearbyAnimalsWithDistance = animalStateManager
      .getAllAnimals()
      .filter((otherAnimal) => otherAnimal.id !== animal.id)
      .map((otherAnimal) => {
        const distance = this.getDistance(
          animal.position,
          otherAnimal.position
        );
        return {
          distance,
          animal: otherAnimal,
        };
      })
      .filter((entry) => entry.distance <= SIGHT_RADIUS)
      .sort((a, b) => a.distance - b.distance);

    const nearbyAnimals: NearbyAnimal[] = nearbyAnimalsWithDistance.map(
      (entry) => ({
        id: entry.animal.id,
        name: entry.animal.name,
        position: entry.animal.position,
        currentAction: entry.animal.currentAction,
        age: entry.animal.age,
        distance: Math.round(entry.distance * 10) / 10,
      })
    );

    // Get environment info
    let environment = { timeOfDay: "day", weather: "clear", temperature: 72 };
    let allResources: any[] = [];

    if (this.gameManagerRef) {
      const worldState = this.gameManagerRef.getWorldState();
      allResources = worldState.resources;
      environment = worldState.environment;
    }

    // Calculate nearby resources with distances and actionable information
    const nearbyResources: NearbyResource[] = allResources
      .map((resource: any) => {
        const distance = this.getDistance(animal.position, resource.position);
        return {
          id: resource.id,
          type: resource.type,
          position: resource.position,
          distance: Math.round(distance * 10) / 10, // Round to 1 decimal
          quantity: resource.quantity,
          quality: resource.quality,
          harvestable: resource.harvestable,
          canHarvestNow:
            resource.harvestable &&
            distance <= HARVEST_RADIUS &&
            resource.quantity > 0,
          tooFarToHarvest: resource.harvestable && distance > HARVEST_RADIUS,
          direction: this.getDirection(animal.position, resource.position) as
            | "north"
            | "south"
            | "east"
            | "west",
        };
      })
      .filter(
        (resource) => resource.distance <= SIGHT_RADIUS && resource.quantity > 0
      )
      .sort((a, b) => a.distance - b.distance);

    // Calculate nearby buildings with distances and actionable information
    const allBuildings = buildingSystem.getAllBuildings();
    const nearbyBuildings: NearbyBuilding[] = allBuildings
      .map((building) => {
        const distance = this.getDistance(animal.position, building.position);
        const availableActions = buildingSystem.getAvailableActions(
          animal,
          building.id
        );
        return {
          id: building.id,
          name: building.name,
          position: {
            x: building.position.x,
            y: building.position.y,
            z: building.position.z,
            rotation: 0,
          },
          distance: Math.round(distance * 10) / 10,
          dimensions: building.dimensions,
          stats: building.stats,
          currentOccupants: building.currentOccupants.length,
          maxOccupants: building.maxOccupants,
          canEnter:
            building.currentOccupants.length < building.maxOccupants &&
            distance <= 5,
          availableActions: availableActions.map((action) => action.type),
        };
      })
      .filter((building) => building.distance <= SIGHT_RADIUS)
      .sort((a, b) => a.distance - b.distance);

    const resourceSummary: ResourceSummary = {
      foodSources: nearbyResources.filter(
        (r) => r.type === "food" || r.type === "berries"
      ).length,
      waterSources: nearbyResources.filter((r) => r.type === "water").length,
      canHarvestNow: nearbyResources.filter((r) => r.canHarvestNow),
      needToMoveCloserTo: nearbyResources.filter((r) => r.tooFarToHarvest),
    };

    // Get relevant memories for the animal
    const memories = this.explorationSystem.getRelevantMemories(
      animal.id,
      animal.position,
      SIGHT_RADIUS
    );

    console.info("memories", this.explorationSystem.memories);

    if (memories.length > 0) {
      console.log(
        `🧠 ${animal.name} has ${memories.length} relevant memories nearby`
      );
    } else {
      console.log(`🧠 ${animal.name} has no relevant memories nearby`);
    }

    // Separate failure memories for easier AI processing
    const failureMemories = memories.filter(
      (m) => m.discoveryType === "failure"
    );
    const discoveryMemories = memories.filter(
      (m) => m.discoveryType !== "failure"
    );

    return {
      myPosition: animal.position,
      sightRadius: SIGHT_RADIUS,
      harvestRadius: HARVEST_RADIUS,
      nearbyAnimals,
      nearbyResources,
      nearbyBuildings,
      environment,
      resourceSummary,
      memories: {
        recentFailures: failureMemories.map((m) => ({
          action: m.description.split(":")[0].replace("Failed to ", ""),
          reason: m.description.split(": ")[1] || m.description,
          position: m.position,
          timestamp: m.timestamp,
          reliability: m.reliability,
        })),
        discoveries: discoveryMemories.map((m) => ({
          type: m.discoveryType,
          description: m.description,
          position: m.position,
          timestamp: m.timestamp,
          reliability: m.reliability,
        })),
      },
    };
  }

  private getDirection(
    from: any,
    to: any
  ): "north" | "south" | "east" | "west" {
    const dx = to.x - from.x;
    const dz = to.z - from.z;

    if (Math.abs(dx) > Math.abs(dz)) {
      return dx > 0 ? "east" : "west";
    } else {
      return dz > 0 ? "south" : "north";
    }
  }

  private emitHealthReports(reports: HealthReport[]): void {
    // This could emit to WebSocket clients, store in database, etc.
    console.log(`📊 Health check completed for ${reports.length} animals`);

    const criticalAnimals = reports.filter(
      (r) => r.overallStatus === "critical" || r.overallStatus === "dying"
    );
    if (criticalAnimals.length > 0) {
      console.warn(
        `🚨 ${criticalAnimals.length} animals need immediate attention!`
      );
    }
  }

  getHealthReport(animalId: string): HealthReport | null {
    const animal = animalStateManager
      .getAllAnimals()
      .find((a) => a.id === animalId);
    if (!animal) return null;

    // Return cached health report or generate new one
    return this.checkAnimalHealth(animal) as any; // This would normally be cached
  }

  getAllHealthReports(): Promise<HealthReport[]> {
    return Promise.all(
      Array.from(animalStateManager.getAllAnimals().values()).map((animal) =>
        this.checkAnimalHealth(animal)
      )
    );
  }
}
