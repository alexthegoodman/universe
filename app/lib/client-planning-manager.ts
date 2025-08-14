import type { Animal } from "../types/animal";

export interface PlanStep {
  id: string;
  action: string;
  parameters?: any;
  targetPosition?: { x: number; y: number; z: number; rotation: number };
  priority: number; // 1-10, higher = more important
  turnOffset: number; // How many turns in the future (0 = this turn)
  expectedBenefit: number; // Estimated benefit score
  requirements?: {
    energy?: number;
    materials?: { stone?: number; wood?: number };
    nearBuilding?: boolean;
    inBuilding?: boolean;
  };
  reason: string; // Why this step is planned
  estimatedDuration?: number; // Expected duration in ms
  startedAt?: number; // Timestamp when step began execution
  completedAt?: number; // Timestamp when step finished
}

export interface AnimalPlan {
  animalId: string;
  steps: PlanStep[];
  createdAt: number;
  lastUpdated: number;
  planHorizon: number; // How many turns ahead to plan (3-10)
  currentStepIndex: number;
  confidence: number; // 0-1, how confident the AI is in this plan
  planType: "survival" | "building" | "exploration" | "social" | "mixed";
}

/**
 * Client-side plan management system
 * Handles plan storage, step tracking, and plan visualization for the UI
 */
export class ClientPlanningManager {
  private plans: Map<string, AnimalPlan> = new Map();
  private planningHistory: Map<string, AnimalPlan[]> = new Map();
  private subscribers: Map<string, (plan: AnimalPlan | null) => void> =
    new Map();

  constructor() {
    // Initialize client-side planning manager
  }

  /**
   * Store a plan received from the server/LLM
   */
  storePlan(plan: AnimalPlan): void {
    const existing = this.plans.get(plan.animalId);
    this.plans.set(plan.animalId, plan);

    // Store in history
    if (!this.planningHistory.has(plan.animalId)) {
      this.planningHistory.set(plan.animalId, []);
    }
    const history = this.planningHistory.get(plan.animalId)!;
    history.push({ ...plan }); // Store a copy

    // Keep only last 5 plans in memory
    if (history.length > 5) {
      history.shift();
    }

    // Notify subscribers
    this.notifySubscribers(plan.animalId, plan);

    console.log(
      `📋 Client stored plan for ${plan.animalId}: ${plan.steps.length} steps (${plan.planType})`
    );
  }

  /**
   * Get current plan for an animal
   */
  getPlan(animalId: string): AnimalPlan | null {
    return this.plans.get(animalId) || null;
  }

  /**
   * Get all plans (for debugging/UI)
   */
  getAllPlans(): AnimalPlan[] {
    return Array.from(this.plans.values());
  }

  /**
   * Get current step that should be executed (considering timing)
   */
  getCurrentStep(animalId: string): PlanStep | null {
    const plan = this.plans.get(animalId);
    if (!plan || plan.currentStepIndex >= plan.steps.length) {
      return null;
    }

    const currentStep = plan.steps[plan.currentStepIndex];

    // Only return step if it's for the current turn
    if (currentStep.turnOffset === 0) {
      return currentStep;
    }

    return null;
  }

  /**
   * Check if animal is currently executing a plan step
   */
  isExecutingStep(animalId: string): boolean {
    const plan = this.plans.get(animalId);
    if (!plan || plan.currentStepIndex >= plan.steps.length) {
      return false;
    }

    const currentStep = plan.steps[plan.currentStepIndex];

    // Check if step is currently being executed
    if (currentStep.startedAt && !currentStep.completedAt) {
      return true;
    }

    return false;
  }

  /**
   * Check if enough time has passed since last step completion for next decision
   */
  canMakeNewDecision(animalId: string): boolean {
    const plan = this.plans.get(animalId);
    if (!plan) return true; // No plan, can make decision

    // If plan is complete, can make new decision
    if (plan.currentStepIndex >= plan.steps.length) {
      return true;
    }

    // If currently executing a step, cannot make new decision
    if (this.isExecutingStep(animalId)) {
      return false;
    }

    // Check if enough time has passed since last step completion
    const lastCompletedIndex = plan.currentStepIndex - 1;
    if (lastCompletedIndex >= 0) {
      const lastStep = plan.steps[lastCompletedIndex];
      if (lastStep.completedAt) {
        const timeSinceCompletion = Date.now() - lastStep.completedAt;
        const MIN_DELAY_BETWEEN_STEPS = 1000; // 3 seconds between plan steps

        if (timeSinceCompletion < MIN_DELAY_BETWEEN_STEPS) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Mark a step as started
   */
  startStep(animalId: string, stepId: string): void {
    const plan = this.plans.get(animalId);
    if (!plan) return;

    const step = plan.steps.find((s) => s.id === stepId);
    if (step) {
      step.startedAt = Date.now();
      this.notifySubscribers(animalId, plan);
    }
  }

  /**
   * Get upcoming steps (for UI display)
   */
  getUpcomingSteps(animalId: string, count: number = 3): PlanStep[] {
    const plan = this.plans.get(animalId);
    if (!plan) return [];

    return plan.steps
      .slice(plan.currentStepIndex + 1, plan.currentStepIndex + 1 + count)
      .filter((step) => step.turnOffset <= 5); // Only show near-term steps
  }

  /**
   * Mark current step as completed and advance plan
   */
  completeCurrentStep(animalId: string, success: boolean): void {
    const plan = this.plans.get(animalId);
    if (!plan) return;

    // Mark step as completed
    const currentStep = plan.steps[plan.currentStepIndex];
    if (currentStep) {
      // Mark completion time
      currentStep.completedAt = Date.now();

      // Adjust confidence based on success
      plan.confidence *= success ? 1.05 : 0.95;
      plan.confidence = Math.max(0.1, Math.min(1.0, plan.confidence));

      console.log(
        `📋 Step completed for ${animalId}: ${currentStep.action} (${
          success ? "success" : "failed"
        })`
      );
    }

    // Advance to next step
    plan.currentStepIndex++;

    // Decrement turnOffset for all remaining steps
    for (let i = plan.currentStepIndex; i < plan.steps.length; i++) {
      plan.steps[i].turnOffset = Math.max(0, plan.steps[i].turnOffset - 1);
    }

    plan.lastUpdated = Date.now();
    this.plans.set(animalId, plan);

    // Notify subscribers of plan update
    this.notifySubscribers(animalId, plan);
  }

  /**
   * Get planning insights for display
   */
  getPlanningInsights(animalId: string): string {
    const plan = this.plans.get(animalId);
    if (!plan) {
      return "No current plan";
    }

    const currentStep = this.getCurrentStep(animalId);
    const upcomingSteps = this.getUpcomingSteps(animalId, 2);

    let insight = `Plan: ${plan.planType} (${Math.round(
      plan.confidence * 100
    )}% confidence)`;

    if (currentStep) {
      insight += `\nCurrent: ${currentStep.action} - ${currentStep.reason}`;
    }

    if (upcomingSteps.length > 0) {
      insight += `\nNext: ${upcomingSteps.map((s) => s.action).join(", ")}`;
    }

    return insight;
  }

  /**
   * Clear plan (when animal dies or plan becomes invalid)
   */
  clearPlan(animalId: string): void {
    this.plans.delete(animalId);
    this.notifySubscribers(animalId, null);
  }

  /**
   * Subscribe to plan updates for a specific animal
   */
  subscribe(
    animalId: string,
    callback: (plan: AnimalPlan | null) => void
  ): void {
    this.subscribers.set(`${animalId}`, callback);
  }

  /**
   * Unsubscribe from plan updates
   */
  unsubscribe(animalId: string): void {
    this.subscribers.delete(`${animalId}`);
  }

  /**
   * Get plan statistics for UI/debugging
   */
  getPlanStats(): {
    totalPlans: number;
    activePlans: number;
    planTypes: Record<string, number>;
    avgConfidence: number;
  } {
    const plans = Array.from(this.plans.values());
    const activePlans = plans.filter(
      (p) => p.currentStepIndex < p.steps.length
    );

    const planTypes: Record<string, number> = {};
    plans.forEach((plan) => {
      planTypes[plan.planType] = (planTypes[plan.planType] || 0) + 1;
    });

    const avgConfidence =
      plans.length > 0
        ? plans.reduce((sum, p) => sum + p.confidence, 0) / plans.length
        : 0;

    return {
      totalPlans: plans.length,
      activePlans: activePlans.length,
      planTypes,
      avgConfidence,
    };
  }

  /**
   * Check if an animal needs a new plan (helper for AI decisions)
   */
  needsNewPlan(animalId: string): boolean {
    const plan = this.plans.get(animalId);
    if (!plan) return true;

    // Plan is complete
    if (plan.currentStepIndex >= plan.steps.length) {
      console.log(`📋 Plan completed for ${animalId}, needs new plan`);
      return true;
    }

    // Plan confidence is too low
    if (plan.confidence < 0.3) {
      console.log(
        `📋 Plan confidence too low for ${animalId} (${Math.round(
          plan.confidence * 100
        )}%), needs new plan`
      );
      return true;
    }

    // Plan is too old (more than 10 minutes)
    const ageMs = Date.now() - plan.createdAt;
    if (ageMs > 10 * 60 * 1000) {
      console.log(
        `📋 Plan too old for ${animalId} (${Math.round(
          ageMs / 60000
        )} minutes), needs new plan`
      );
      return true;
    }

    return false;
  }

  /**
   * Get plan execution status for display
   */
  getPlanExecutionStatus(animalId: string): string {
    const plan = this.plans.get(animalId);
    if (!plan) return "No plan";

    if (plan.currentStepIndex >= plan.steps.length) {
      return "Plan completed";
    }

    const currentStep = plan.steps[plan.currentStepIndex];
    if (this.isExecutingStep(animalId)) {
      return `Executing: ${currentStep.action}`;
    }

    if (!this.canMakeNewDecision(animalId)) {
      return "Waiting between steps";
    }

    return `Ready for: ${currentStep.action}`;
  }

  private notifySubscribers(animalId: string, plan: AnimalPlan | null): void {
    const callback = this.subscribers.get(`${animalId}`);
    if (callback) {
      callback(plan);
    }
  }
}

// Export singleton instance for client-side use
export const clientPlanningManager = new ClientPlanningManager();
