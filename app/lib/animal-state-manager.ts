import type { Animal, ActionResult } from '../types/animal';

export interface AnimalUpdate {
  animalId: string;
  type: 'stats' | 'position' | 'action' | 'inventory' | 'full';
  data: Partial<Animal>;
  source: string; // Track which system made the update
  timestamp: number;
}

export class AnimalStateManager {
  private animals: Map<string, Animal> = new Map();
  private subscribers: Map<string, (update: AnimalUpdate) => void> = new Map();
  private updateQueue: AnimalUpdate[] = [];
  private processingUpdates = false;

  // Subscribe to animal state changes
  subscribe(id: string, callback: (update: AnimalUpdate) => void): void {
    this.subscribers.set(id, callback);
  }

  unsubscribe(id: string): void {
    this.subscribers.delete(id);
  }

  // Add or update an animal in the state
  setAnimal(animal: Animal): void {
    this.animals.set(animal.id, { ...animal });
    this.notifySubscribers({
      animalId: animal.id,
      type: 'full',
      data: animal,
      source: 'state-manager',
      timestamp: Date.now()
    });
  }

  // Get current animal state
  getAnimal(animalId: string): Animal | undefined {
    return this.animals.get(animalId);
  }

  // Get all animals
  getAllAnimals(): Animal[] {
    return Array.from(this.animals.values());
  }

  // Remove animal from state
  removeAnimal(animalId: string): void {
    this.animals.delete(animalId);
    this.notifySubscribers({
      animalId,
      type: 'full',
      data: {},
      source: 'state-manager',
      timestamp: Date.now()
    });
  }

  // Update animal stats (from health degradation)
  updateStats(animalId: string, stats: Partial<Animal['stats']>, source: string = 'unknown'): boolean {
    const animal = this.animals.get(animalId);
    if (!animal) return false;

    const updatedAnimal = {
      ...animal,
      stats: { ...animal.stats, ...stats },
      lastHealthCheck: Date.now()
    };

    this.animals.set(animalId, updatedAnimal);
    this.queueUpdate({
      animalId,
      type: 'stats',
      data: { stats: updatedAnimal.stats },
      source,
      timestamp: Date.now()
    });

    return true;
  }

  // Update animal position (from movement/exploration)
  updatePosition(animalId: string, position: Animal['position'], source: string = 'unknown'): boolean {
    const animal = this.animals.get(animalId);
    if (!animal) return false;

    const updatedAnimal = {
      ...animal,
      position: { ...position }
    };

    this.animals.set(animalId, updatedAnimal);
    this.queueUpdate({
      animalId,
      type: 'position',
      data: { position: updatedAnimal.position },
      source,
      timestamp: Date.now()
    });

    return true;
  }

  // Update animal action and related changes
  updateFromActionResult(animalId: string, actionResult: ActionResult, newAction: string, source: string = 'action-system'): boolean {
    const animal = this.animals.get(animalId);
    if (!animal) return false;

    const updates: Partial<Animal> = {
      currentAction: newAction
    };

    // Apply stat changes if present
    if (actionResult.statChanges) {
      updates.stats = { ...animal.stats, ...actionResult.statChanges };
    }

    // Apply position changes if present
    if (actionResult.newPosition) {
      updates.position = { ...actionResult.newPosition };
    }

    const updatedAnimal = {
      ...animal,
      ...updates
    };

    this.animals.set(animalId, updatedAnimal);
    this.queueUpdate({
      animalId,
      type: 'action',
      data: updates,
      source,
      timestamp: Date.now()
    });

    return true;
  }

  // Update animal inventory
  updateInventory(animalId: string, inventory: Animal['inventory'], source: string = 'unknown'): boolean {
    const animal = this.animals.get(animalId);
    if (!animal) return false;

    const updatedAnimal = {
      ...animal,
      inventory: { ...inventory }
    };

    this.animals.set(animalId, updatedAnimal);
    this.queueUpdate({
      animalId,
      type: 'inventory',
      data: { inventory: updatedAnimal.inventory },
      source,
      timestamp: Date.now()
    });

    return true;
  }

  // Update animal age
  updateAge(animalId: string, age: number, isAlive: boolean): boolean {
    const animal = this.animals.get(animalId);
    if (!animal) return false;

    const updatedAnimal = {
      ...animal,
      age,
      isAlive
    };

    this.animals.set(animalId, updatedAnimal);
    this.queueUpdate({
      animalId,
      type: 'full',
      data: { age, isAlive },
      source: 'lifecycle',
      timestamp: Date.now()
    });

    return true;
  }

  // Queue update for batched processing
  private queueUpdate(update: AnimalUpdate): void {
    this.updateQueue.push(update);
    
    if (!this.processingUpdates) {
      // Process updates on next tick to batch them
      setTimeout(() => this.processUpdateQueue(), 0);
    }
  }

  // Process queued updates
  private processUpdateQueue(): void {
    if (this.updateQueue.length === 0) return;

    this.processingUpdates = true;
    const updates = [...this.updateQueue];
    this.updateQueue = [];

    // Group updates by animal for more efficient processing
    const updatesByAnimal = new Map<string, AnimalUpdate[]>();
    for (const update of updates) {
      if (!updatesByAnimal.has(update.animalId)) {
        updatesByAnimal.set(update.animalId, []);
      }
      updatesByAnimal.get(update.animalId)!.push(update);
    }

    // Notify subscribers for each animal's updates
    for (const [animalId, animalUpdates] of updatesByAnimal) {
      for (const update of animalUpdates) {
        this.notifySubscribers(update);
      }
    }

    this.processingUpdates = false;

    // Process any new updates that came in while we were processing
    if (this.updateQueue.length > 0) {
      setTimeout(() => this.processUpdateQueue(), 0);
    }
  }

  // Notify all subscribers of updates
  private notifySubscribers(update: AnimalUpdate): void {
    for (const callback of this.subscribers.values()) {
      try {
        callback(update);
      } catch (error) {
        console.error('Error notifying subscriber:', error);
      }
    }
  }

  // Get state statistics for debugging
  getStateStats(): { animalCount: number; subscriberCount: number; queueSize: number } {
    return {
      animalCount: this.animals.size,
      subscriberCount: this.subscribers.size,
      queueSize: this.updateQueue.length
    };
  }
}

// Create global singleton instance
export const animalStateManager = new AnimalStateManager();