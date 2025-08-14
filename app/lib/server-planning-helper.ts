import type { Animal } from "../types/animal";

/**
 * Server-side planning helper
 * Provides basic planning context without storing plans (client-side responsibility)
 */
export class ServerPlanningHelper {
  /**
   * Check if animal can sleep (must be in building)
   */
  canSleep(animal: Animal, worldState: any): { canSleep: boolean; reason: string } {
    // Check if animal is in any building
    const nearbyBuildings = worldState.nearbyBuildings || [];
    const isInBuilding = nearbyBuildings.some((building: any) => {
      const distance = Math.sqrt(
        Math.pow(building.position.x - animal.position.x, 2) +
        Math.pow(building.position.z - animal.position.z, 2)
      );
      return distance <= 5; // Within building range
    });

    if (!isInBuilding) {
      return {
        canSleep: false,
        reason: "CRITICAL: Cannot sleep outdoors! Must be inside a building to sleep safely. Sleeping provides massive energy restoration (40+ points) but requires shelter first."
      };
    }

    return {
      canSleep: true,
      reason: "Safe to sleep in building - will restore 40+ energy points"
    };
  }

  /**
   * Analyze current situation for planning prompts
   */
  getPlanningContext(animal: Animal, worldState: any) {
    const urgentNeeds: string[] = [];
    
    // Analyze critical needs
    if (animal.stats.energy < 30) urgentNeeds.push("energy");
    if (animal.stats.hunger > 70) urgentNeeds.push("food");
    if (animal.stats.thirst > 70) urgentNeeds.push("water");
    if (animal.stats.health < 40) urgentNeeds.push("health");

    // Check for shelter need (if energy is low but can't sleep)
    const sleepCheck = this.canSleep(animal, worldState);
    if (animal.stats.energy < 50 && !sleepCheck.canSleep) {
      urgentNeeds.push("shelter");
    }

    // Count available resources in inventory
    const availableResources = {
      stone: animal.inventory.items.find(item => item.type === "stone")?.quantity || 0,
      wood: animal.inventory.items.find(item => item.type === "wood")?.quantity || 0,
      food: animal.inventory.items.find(item => item.type === "food")?.quantity || 0,
      water: animal.inventory.items.find(item => item.type === "water")?.quantity || 0,
    };

    return {
      urgentNeeds,
      availableResources,
      nearbyBuildings: worldState.nearbyBuildings || [],
      socialOpportunities: (worldState.nearbyAnimals || []).map((a: any) => a.name),
    };
  }

  /**
   * Determine if animal should create a new plan based on context
   */
  shouldCreateNewPlan(animal: Animal, worldState: any, existingPlan?: any): boolean {
    // Always create plan if none exists
    if (!existingPlan) return true;

    // Create new plan if urgent needs have changed dramatically
    const context = this.getPlanningContext(animal, worldState);
    if (context.urgentNeeds.length > 2) return true;

    // Create plan if existing one is old (passed via client context)
    return false;
  }
}

export const serverPlanningHelper = new ServerPlanningHelper();