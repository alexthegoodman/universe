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
          reasoning: result.reasoning || "Plan created by AI",
        };
      }

      // If no plan was created, the AI decision failed
      console.warn(`⚠️ AI did not create a plan for ${animal.name}`);
      return {
        reasoning: "AI decision failed - no plan created",
      };
    } catch (error) {
      console.error(
        `Error getting AI decision for animal ${animal.id}:`,
        error
      );

      return {
        reasoning: `AI decision failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  // Fallback plan creation removed - this is now a pure LLM simulation
  // Animals will only act based on AI decisions, no hardcoded behaviors
}
