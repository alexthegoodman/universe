import type { Animal, AnimalAction, ActionResult } from "../types/animal";
import { clientPlanningManager } from "./client-planning-manager";

export class AnimalAI {
  private animalId: string;

  constructor(animalId: string) {
    this.animalId = animalId;
  }

  async decideAction(
    animal: Animal,
    worldState: any
  ): Promise<{
    newPlan?: any; // Only returns plans now, not individual actions
    reasoning?: string;
  }> {
    try {
      console.log(`📡 Making API call for ${animal.name}...`);
      
      // Get planning context from client-side manager
      const existingPlan = clientPlanningManager.getPlan(animal.id);
      const needsNewPlan = clientPlanningManager.needsNewPlan(animal.id);
      
      // Call our secure API route instead of direct OpenAI
      const response = await fetch("/api/animal/decision", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          animal,
          worldState,
          existingPlan,
          needsNewPlan,
        }),
      });

      if (!response.ok) {
        throw new Error(`API call failed: ${response.status}`);
      }

      const result = await response.json();

      if (result.error) {
        console.warn(`AI decision warning for ${animal.name}: ${result.error}`);
      }

      // Store new plan if provided and return it
      if (result.newPlan) {
        clientPlanningManager.storePlan(result.newPlan);
        return {
          newPlan: result.newPlan,
          reasoning: result.reasoning || "Plan created by AI"
        };
      }

      // If no plan was created, this indicates a problem
      console.warn(`⚠️ AI did not create a plan for ${animal.name}`);
      
      // Return fallback plan
      const fallbackPlan = this.createFallbackPlan(animal);
      clientPlanningManager.storePlan(fallbackPlan);
      
      return {
        newPlan: fallbackPlan,
        reasoning: "Fallback plan due to AI failure"
      };
    } catch (error) {
      console.error(
        `Error getting AI decision for animal ${animal.id}:`,
        error
      );
      
      // Create fallback plan on error
      const fallbackPlan = this.createFallbackPlan(animal);
      clientPlanningManager.storePlan(fallbackPlan);
      
      return {
        newPlan: fallbackPlan,
        reasoning: "Fallback plan due to API error"
      };
    }
  }

  private createFallbackPlan(animal: Animal): any {
    const urgentActions = [];
    let planType = "survival";

    // Determine urgent needs
    if (animal.stats.thirst > 70) {
      const hasWater = animal.inventory.items.some(
        (item) => item.type === "water" && item.quantity > 0
      );
      if (hasWater) {
        urgentActions.push({
          id: `step_${Date.now()}_0`,
          action: "drinking",
          priority: 10,
          turnOffset: 0,
          expectedBenefit: 25,
          reason: "Urgent: quench thirst"
        });
      } else {
        urgentActions.push({
          id: `step_${Date.now()}_0`,
          action: "exploring",
          priority: 9,
          turnOffset: 0,
          expectedBenefit: 20,
          reason: "Find water source"
        });
      }
    }

    if (animal.stats.hunger > 70) {
      const hasFood = animal.inventory.items.some(
        (item) => (item.type === "food" || item.type === "berries") && item.quantity > 0
      );
      if (hasFood) {
        urgentActions.push({
          id: `step_${Date.now()}_${urgentActions.length}`,
          action: "eating",
          priority: 10,
          turnOffset: urgentActions.length,
          expectedBenefit: 25,
          reason: "Urgent: eat food"
        });
      } else {
        urgentActions.push({
          id: `step_${Date.now()}_${urgentActions.length}`,
          action: "exploring",
          priority: 9,
          turnOffset: urgentActions.length,
          expectedBenefit: 20,
          reason: "Find food source"
        });
      }
    }

    if (animal.stats.energy < 30) {
      // Check if has materials for building
      const hasStone = animal.inventory.items.some(item => item.type === "stone" && item.quantity >= 2);
      const hasWood = animal.inventory.items.some(item => item.type === "wood" && item.quantity >= 2);
      
      if (hasStone && hasWood) {
        urgentActions.push({
          id: `step_${Date.now()}_${urgentActions.length}`,
          action: "building",
          parameters: { action: "create_building", buildingName: "Emergency Shelter" },
          priority: 10,
          turnOffset: urgentActions.length,
          expectedBenefit: 40,
          reason: "Build shelter to enable sleeping"
        });
        planType = "building";
      } else {
        urgentActions.push({
          id: `step_${Date.now()}_${urgentActions.length}`,
          action: "exploring",
          priority: 8,
          turnOffset: urgentActions.length,
          expectedBenefit: 15,
          reason: "Find materials for shelter"
        });
      }
    }

    // If no urgent actions, add exploration
    if (urgentActions.length === 0) {
      urgentActions.push({
        id: `step_${Date.now()}_0`,
        action: "exploring",
        priority: 5,
        turnOffset: 0,
        expectedBenefit: 10,
        reason: "General exploration"
      });
      planType = "exploration";
    }

    return {
      animalId: animal.id,
      steps: urgentActions,
      createdAt: Date.now(),
      lastUpdated: Date.now(),
      planHorizon: urgentActions.length,
      currentStepIndex: 0,
      confidence: 0.6, // Lower confidence for fallback
      planType
    };
  }


}
