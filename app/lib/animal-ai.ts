import type { Animal, AnimalAction, ActionResult } from "../types/animal";

export class AnimalAI {
  private animalId: string;

  constructor(animalId: string) {
    this.animalId = animalId;
  }

  async decideAction(animal: Animal, worldState: any): Promise<AnimalAction> {
    try {
      console.log(`📡 Making API call for ${animal.name}...`);
      // Call our secure API route instead of direct OpenAI
      const response = await fetch("/api/animal/decision", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          animal,
          worldState,
        }),
      });

      if (!response.ok) {
        throw new Error(`API call failed: ${response.status}`);
      }

      const result = await response.json();

      if (result.error) {
        console.warn(`AI decision warning for ${animal.name}: ${result.error}`);
      }

      const action = result.action as AnimalAction;

      // Validate the action
      const validActions: AnimalAction[] = [
        "idle",
        "moving",
        "eating",
        "drinking",
        "sleeping",
        "playing",
        "exploring",
        "socializing",
        "working",
        "mating",
      ];

      if (validActions.includes(action)) {
        return action;
      }

      const fallback = this.getFallbackAction(animal);

      console.warn(
        "Using fallback action due to invalid AI response:",
        action,
        fallback
      );

      return fallback;
    } catch (error) {
      console.error(
        `Error getting AI decision for animal ${animal.id}:`,
        error
      );
      return this.getFallbackAction(animal);
    }
  }

  private getFallbackAction(animal: Animal): AnimalAction {
    // Simple rule-based fallback when API is unavailable
    if (animal.stats.health < 30) return "sleeping";
    
    // Check inventory before deciding to eat/drink
    if (animal.stats.thirst > 70) {
      const hasWater = animal.inventory.items.some(item => item.type === "water" && item.quantity > 0);
      if (hasWater) {
        return "drinking";
      } else {
        // Need to find water - either harvest nearby or explore
        return "exploring"; // Let the health monitor handle finding water sources
      }
    }
    
    if (animal.stats.hunger > 70) {
      const hasFood = animal.inventory.items.some(item => 
        (item.type === "food" || item.type === "berries") && item.quantity > 0
      );
      if (hasFood) {
        return "eating";
      } else {
        // Need to find food - either harvest nearby or explore
        return "exploring"; // Let the health monitor handle finding food sources
      }
    }
    
    if (animal.stats.energy < 30) return "sleeping";
    if (animal.stats.happiness < 30) return "playing";

    // Based on personality
    if (animal.dna.personality.playful > 70) return "playing";
    if (animal.dna.curiosity > 70) return "exploring";
    if (animal.dna.social > 70) return "socializing";

    return "idle";
  }

  async executeAction(
    animal: Animal,
    action: AnimalAction
  ): Promise<ActionResult> {
    // This will be enhanced with MCP integration
    // For now, basic stat changes based on actions

    const statChanges: Partial<typeof animal.stats> = {};
    let message = `${animal.name} is ${action}`;
    let duration = 5000; // 5 seconds default

    switch (action) {
      case "eating":
        statChanges.hunger = Math.max(0, animal.stats.hunger - 20);
        statChanges.health = Math.min(100, animal.stats.health + 5);
        statChanges.energy = Math.min(100, animal.stats.energy + 10);
        message = `${animal.name} found some food and ate heartily`;
        duration = 8000;
        break;

      case "drinking":
        statChanges.thirst = Math.max(0, animal.stats.thirst - 25);
        statChanges.health = Math.min(100, animal.stats.health + 3);
        message = `${animal.name} quenched their thirst`;
        duration = 3000;
        break;

      case "sleeping":
        statChanges.energy = Math.min(100, animal.stats.energy + 30);
        statChanges.health = Math.min(100, animal.stats.health + 10);
        message = `${animal.name} is taking a peaceful nap`;
        duration = 15000;
        break;

      case "playing":
        statChanges.happiness = Math.min(100, animal.stats.happiness + 15);
        statChanges.energy = Math.max(0, animal.stats.energy - 10);
        message = `${animal.name} is having fun playing`;
        duration = 10000;
        break;

      case "exploring":
        statChanges.happiness = Math.min(100, animal.stats.happiness + 10);
        statChanges.energy = Math.max(0, animal.stats.energy - 15);
        message = `${animal.name} is exploring their surroundings`;
        duration = 12000;
        break;

      case "socializing":
        statChanges.happiness = Math.min(100, animal.stats.happiness + 20);
        message = `${animal.name} is enjoying social interaction`;
        duration = 8000;
        break;

      case "working":
        statChanges.energy = Math.max(0, animal.stats.energy - 20);
        statChanges.happiness = Math.min(100, animal.stats.happiness + 5);
        message = `${animal.name} is working diligently`;
        duration = 20000;
        break;

      case "moving":
        statChanges.energy = Math.max(0, animal.stats.energy - 5);
        message = `${animal.name} is moving around`;
        duration = 6000;
        break;

      default:
        statChanges.energy = Math.min(100, animal.stats.energy + 2);
        message = `${animal.name} is resting idly`;
        duration = 5000;
    }

    return {
      success: true,
      message,
      statChanges,
      duration,
    };
  }
}
