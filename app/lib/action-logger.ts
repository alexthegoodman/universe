import type { Animal, ActionResult, AnimalStats } from "../types/animal";
import type { ActionLogEntry } from "../components/ActionLog";

export class ActionLogger {
  private logs: ActionLogEntry[] = [];
  private maxEntries: number = 500;
  private subscribers: ((entries: ActionLogEntry[]) => void)[] = [];

  logAction(
    animal: Animal,
    action: string,
    result: ActionResult,
    statsBefore?: AnimalStats,
    statsAfter?: AnimalStats,
    reasoning?: string
  ): void {
    const entry: ActionLogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      animalId: animal.id,
      animalName: animal.name,
      action,
      result,
      reasoning,
      statsBefore,
      statsAfter,
    };

    this.logs.unshift(entry);

    // Keep only the most recent entries
    if (this.logs.length > this.maxEntries) {
      this.logs = this.logs.slice(0, this.maxEntries);
    }

    // Notify subscribers
    this.notifySubscribers();
  }

  getLogs(): ActionLogEntry[] {
    return [...this.logs];
  }

  getLogsForAnimal(animalId: string): ActionLogEntry[] {
    return this.logs.filter(log => log.animalId === animalId);
  }

  subscribe(callback: (entries: ActionLogEntry[]) => void): () => void {
    this.subscribers.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.subscribers.indexOf(callback);
      if (index > -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }

  private notifySubscribers(): void {
    this.subscribers.forEach(callback => {
      try {
        callback([...this.logs]);
      } catch (error) {
        console.error('Error notifying action log subscriber:', error);
      }
    });
  }

  clearLogs(): void {
    this.logs = [];
    this.notifySubscribers();
  }

  getRecentLogs(count: number = 50): ActionLogEntry[] {
    return this.logs.slice(0, count);
  }
}

// Export singleton instance
export const actionLogger = new ActionLogger();