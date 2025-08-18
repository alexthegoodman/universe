import { Animal } from "../types/animal";
import { AnimalPlan } from "./client-planning-manager";
import { animalStateManager } from "./animal-state-manager";
import { AnimalAI } from "./animal-ai";
import { clientPlanningManager } from "./client-planning-manager";
import { HealthMonitor } from "./health-monitor";
import { GameManager } from "./game-manager";

interface QueueEntry {
  animalId: string;
  priority: number; // 1-10, higher = more urgent
  queuedAt: number;
  lastDecisionAt?: number;
  retryCount: number;
}

export class GlobalPlanQueue {
  private queue: QueueEntry[] = [];
  private processing = false;
  private planExecutionInterval: NodeJS.Timeout | null = null;
  private healthMonitor: HealthMonitor | null = null;
  private gameManager: GameManager | null = null;
  private activeDecisionCalls: Set<string> = new Set(); // Track animals with in-flight decision API calls

  private readonly MAX_CONCURRENT_DECISIONS = 3; // Maximum concurrent decision tasks
  private readonly DECISION_PROCESSING_DELAY = 500; // 500ms between decisions
  private readonly PLAN_EXECUTION_INTERVAL = 2000; // 2s for plan step execution
  private readonly MAX_RETRIES = 3;
  private readonly MIN_DECISION_COOLDOWN = 5000; // 5s minimum between decisions per animal

  constructor(gameManager: GameManager, healthMonitor?: HealthMonitor) {
    this.gameManager = gameManager;
    this.healthMonitor = healthMonitor || null;
    this.startPlanExecution();
  }

  setHealthMonitor(healthMonitor: HealthMonitor): void {
    this.healthMonitor = healthMonitor;
  }

  isDecisionCallActive(animalId: string): boolean {
    return this.activeDecisionCalls.has(animalId);
  }

  addAnimal(animalId: string, priority: number = 5): void {
    // Don't queue animals that have active decision calls
    if (this.activeDecisionCalls.has(animalId)) {
      return;
    }

    const existingIndex = this.queue.findIndex(
      (entry) => entry.animalId === animalId
    );

    if (existingIndex !== -1) {
      this.queue[existingIndex].priority = Math.max(
        this.queue[existingIndex].priority,
        priority
      );
      this.sortQueue();
      return;
    }

    const entry: QueueEntry = {
      animalId,
      priority,
      queuedAt: Date.now(),
      retryCount: 0,
    };

    this.queue.push(entry);
    this.sortQueue();

    if (!this.processing) {
      this.startProcessing();
    }
  }

  removeAnimal(animalId: string): void {
    this.queue = this.queue.filter((entry) => entry.animalId !== animalId);
    this.activeDecisionCalls.delete(animalId); // Clean up any active decision calls
  }

  addAllAnimals(): void {
    const animals = animalStateManager.getAllAnimals();
    animals.forEach((animal) => {
      const priority = this.calculatePriority(animal);
      this.addAnimal(animal.id, priority);
    });
  }

  private calculatePriority(animal: Animal): number {
    let priority = 5; // Base priority

    // Health-based priority
    if (animal.stats.health < 30) priority += 3; // Critical health
    else if (animal.stats.health < 60) priority += 1; // Low health

    // Hunger-based priority
    if (animal.stats.hunger < 20) priority += 2; // Very hungry
    else if (animal.stats.hunger < 40) priority += 1; // Hungry

    // Energy-based priority
    if (animal.stats.energy < 20) priority += 1; // Low energy

    // Plan status priority
    if (clientPlanningManager.needsNewPlan(animal.id)) {
      priority += 2; // Needs new plan
    }

    return Math.min(priority, 10); // Cap at 10
  }

  private sortQueue(): void {
    this.queue.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority; // Higher priority first
      }
      return a.queuedAt - b.queuedAt; // FIFO for same priority
    });
  }

  private async startProcessing(): Promise<void> {
    if (this.processing) return;

    this.processing = true;
    console.log("🎯 Starting Global Plan Queue processing with up to 3 concurrent tasks");

    const processingTasks = new Map<string, Promise<void>>();

    while (this.queue.length > 0 || processingTasks.size > 0) {
      // Start new concurrent tasks up to the limit
      while (
        this.queue.length > 0 && 
        processingTasks.size < this.MAX_CONCURRENT_DECISIONS
      ) {
        const entry = this.queue.shift()!;
        console.log(`🚀 Starting concurrent decision task for animal ${entry.animalId} (${processingTasks.size + 1}/${this.MAX_CONCURRENT_DECISIONS})`);
        
        const promise = this.processAnimalDecisionConcurrent(entry)
          .finally(() => {
            processingTasks.delete(entry.animalId);
          });
        
        processingTasks.set(entry.animalId, promise);
      }

      // Wait for at least one task to complete if we have any running
      if (processingTasks.size > 0) {
        await Promise.race(processingTasks.values());
      }

      // Small delay to prevent tight loop
      await this.delay(this.DECISION_PROCESSING_DELAY);
    }

    this.processing = false;
    console.log("✅ Global Plan Queue processing complete");
  }

  private async processAnimalDecisionConcurrent(entry: QueueEntry): Promise<void> {
    try {
      const success = await this.processAnimalDecision(entry);

      if (!success && entry.retryCount < this.MAX_RETRIES) {
        entry.retryCount++;
        entry.queuedAt = Date.now() + entry.retryCount * 1000; // Increasing delay
        this.queue.push(entry);
        this.sortQueue();
      }
    } catch (error) {
      console.error(`❌ Error processing animal ${entry.animalId}:`, error);
    }
  }

  private async processAnimalDecision(entry: QueueEntry): Promise<boolean> {
    const animal = animalStateManager.getAnimal(entry.animalId);
    if (!animal) {
      console.warn(
        `⚠️ Animal ${entry.animalId} not found, removing from queue`
      );
      return true; // Remove from queue
    }

    // Check cooldown
    if (
      entry.lastDecisionAt &&
      Date.now() - entry.lastDecisionAt < this.MIN_DECISION_COOLDOWN
    ) {
      return false; // Retry later
    }

    // Check if animal needs a new plan
    if (!clientPlanningManager.needsNewPlan(entry.animalId)) {
      // Animal doesn't need a new plan right now, remove from queue
      return true;
    }

    console.log(
      `🧠 Processing decision for animal ${animal.id} (priority: ${entry.priority})`
    );

    try {
      // Mark decision call as active (in-flight)
      this.activeDecisionCalls.add(animal.id);

      // Create AI instance and call decision system
      const ai = new AnimalAI(animal.id, this.gameManager || undefined);
      const decision = await ai.decideAction(
        animal,
        // this.gameManager?.getWorldState()
        this.healthMonitor?.getWorldStateForAnimal(animal)
      );

      // Decision call completed, remove from active calls
      this.activeDecisionCalls.delete(animal.id);

      if (decision && decision.newPlan) {
        entry.lastDecisionAt = Date.now();
        console.log(`✅ Decision completed for ${animal.id}, plan created`);

        // Animal now has a new plan, remove from decision queue
        // Plan execution happens separately in executePlanSteps()
        return true;
      }

      // AI decision failed to create a plan - this is expected in a pure LLM simulation
      console.warn(
        `🤖 AI decision failed for ${animal.id}: ${
          decision?.reasoning || "No plan created"
        }`
      );
      return false; // Retry later
    } catch (error) {
      // Decision call failed, remove from active calls
      this.activeDecisionCalls.delete(animal.id);
      console.error(`❌ Decision failed for animal ${entry.animalId}:`, error);
      return false;
    }
  }

  // Re-queuing is now handled automatically in executePlanSteps() when plans complete

  private startPlanExecution(): void {
    this.planExecutionInterval = setInterval(() => {
      this.executePlanSteps();
    }, this.PLAN_EXECUTION_INTERVAL);
  }

  private executePlanSteps(): void {
    const animals = animalStateManager.getAllAnimals();

    animals.forEach((animal) => {
      // Don't execute plans for animals with active decision calls
      if (this.activeDecisionCalls.has(animal.id)) {
        return;
      }

      const currentPlan = clientPlanningManager.getPlan(animal.id);

      if (currentPlan && !clientPlanningManager.isExecutingStep(animal.id)) {
        const nextStep = clientPlanningManager.getCurrentStep(animal.id);

        if (nextStep) {
          console.log(
            `⚡ Executing plan step for ${animal.id}: ${nextStep.action}`
          );
          // Execute step asynchronously - don't wait for completion
          this.executePlanStep(animal, nextStep).catch((error) => {
            console.error(
              `❌ Plan step execution failed for ${animal.id}:`,
              error
            );
          });
        }
      }

      // Check if animal needs a new plan and isn't already in queue or having decision made
      if (
        clientPlanningManager.needsNewPlan(animal.id) &&
        !this.activeDecisionCalls.has(animal.id)
      ) {
        const isInQueue = this.queue.some(
          (entry) => entry.animalId === animal.id
        );
        if (!isInQueue) {
          // Plan complete, re-queue for new decision
          const priority = this.calculatePriority(animal);
          console.log(
            `🔄 Plan completed for ${animal.id}, re-queueing for new decision (priority: ${priority})`
          );
          this.addAnimal(animal.id, priority);
        }
      }
    });
  }

  private async executePlanStep(animal: Animal, step: any): Promise<void> {
    try {
      // Delegate to health monitor's existing plan step execution
      if (!this.healthMonitor) {
        throw new Error("Health monitor not available");
      }
      await this.healthMonitor.executePlanStep(animal, step);
    } catch (error) {
      console.error(`❌ Plan step execution failed for ${animal.id}:`, error);
      clientPlanningManager.completeCurrentStep(animal.id, false);
    }
  }

  private async executeAnimalAction(
    animal: Animal,
    action: string,
    parameters?: any
  ): Promise<void> {
    // Delegate to health monitor's existing action execution system
    // This ensures compatibility with the existing MXP action system
    if (!this.healthMonitor) {
      throw new Error("Health monitor not available");
    }

    try {
      await this.healthMonitor.executeAnimalAction(animal, action, parameters);
    } catch (error) {
      console.error(
        `❌ Failed to execute action ${action} for animal ${animal.id}:`,
        error
      );
      throw error;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getQueueStatus(): {
    length: number;
    processing: boolean;
    entries: QueueEntry[];
    activeDecisions: number;
    maxConcurrent: number;
  } {
    return {
      length: this.queue.length,
      processing: this.processing,
      entries: [...this.queue],
      activeDecisions: this.activeDecisionCalls.size,
      maxConcurrent: this.MAX_CONCURRENT_DECISIONS,
    };
  }

  stop(): void {
    this.processing = false;
    if (this.planExecutionInterval) {
      clearInterval(this.planExecutionInterval);
      this.planExecutionInterval = null;
    }
  }

  restart(): void {
    this.stop();
    this.startPlanExecution();
    if (this.queue.length > 0 && !this.processing) {
      this.startProcessing();
    }
  }
}

// Global instance will be initialized by GameManager
export let globalPlanQueue: GlobalPlanQueue;

export function setGlobalPlanQueue(instance: GlobalPlanQueue): void {
  globalPlanQueue = instance;
}
