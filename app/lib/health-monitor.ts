import type { Animal } from '../types/animal';
import { AnimalLifecycle } from './animal-lifecycle';
import { AnimalAI } from './animal-ai';
import { MCPActionSystem } from './mcp-actions';

export interface HealthAlert {
  animalId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: number;
  suggestedActions: string[];
}

export interface HealthReport {
  animal: Animal;
  alerts: HealthAlert[];
  nextActionRecommendation: string;
  overallStatus: 'healthy' | 'warning' | 'critical' | 'dying';
}

export class HealthMonitor {
  private animals: Map<string, Animal> = new Map();
  private aiInstances: Map<string, AnimalAI> = new Map();
  private actionSystem: MCPActionSystem;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private decisionStagger: Map<string, number> = new Map();
  private readonly HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
  private readonly DECISION_STAGGER_RANGE = 15000; // 15 second range for staggering
  
  constructor() {
    this.actionSystem = new MCPActionSystem();
  }
  
  addAnimal(animal: Animal): void {
    this.animals.set(animal.id, animal);
    this.aiInstances.set(animal.id, new AnimalAI(animal.id));
    
    // Assign random stagger offset for this animal (0-15 seconds)
    const staggerOffset = Math.random() * this.DECISION_STAGGER_RANGE;
    this.decisionStagger.set(animal.id, staggerOffset);
    
    // Start monitoring if this is the first animal
    if (this.animals.size === 1) {
      this.startMonitoring();
    }
  }
  
  removeAnimal(animalId: string): void {
    this.animals.delete(animalId);
    this.aiInstances.delete(animalId);
    this.decisionStagger.delete(animalId);
    
    // Stop monitoring if no animals left
    if (this.animals.size === 0) {
      this.stopMonitoring();
    }
  }
  
  getAnimal(animalId: string): Animal | undefined {
    return this.animals.get(animalId);
  }
  
  getAllAnimals(): Animal[] {
    return Array.from(this.animals.values());
  }
  
  startMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks();
    }, this.HEALTH_CHECK_INTERVAL);
    
    console.log('Health monitoring started - checking every 30 seconds');
  }
  
  stopMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    console.log('Health monitoring stopped');
  }
  
  private async performHealthChecks(): Promise<void> {
    const reports: HealthReport[] = [];
    const currentTime = Date.now();
    
    for (const [animalId, animal] of this.animals) {
      try {
        const report = await this.checkAnimalHealth(animal);
        reports.push(report);
        
        // Update the animal in our storage
        this.animals.set(animalId, report.animal);
        
        // Log critical alerts
        const criticalAlerts = report.alerts.filter(alert => alert.severity === 'critical');
        if (criticalAlerts.length > 0) {
          console.warn(`🚨 Critical health alerts for ${animal.name}:`, criticalAlerts);
        }
        
        // Staggered AI decision making - each animal gets a different delay
        const staggerOffset = this.decisionStagger.get(animalId) || 0;
        
        // Always make decisions, but with staggered delays
        if (report.overallStatus === 'critical' || report.overallStatus === 'dying') {
          // Critical health - minimal delay
          setTimeout(() => this.handleCriticalHealth(animal), staggerOffset * 0.1);
        } else if (report.overallStatus === 'warning') {
          // Warning - moderate delay
          setTimeout(() => this.handleHealthWarning(animal), staggerOffset * 0.3);
        } else {
          // Healthy - full stagger delay for recreational decisions
          setTimeout(() => this.handleHealthyAnimal(animal), staggerOffset);
        }
        
      } catch (error) {
        console.error(`Error checking health for animal ${animalId}:`, error);
      }
    }
    
    // Emit health reports for UI updates (if needed)
    this.emitHealthReports(reports);
  }
  
  private async checkAnimalHealth(animal: Animal): Promise<HealthReport> {
    // Update age
    const updatedAnimal = AnimalLifecycle.updateAge(animal);
    
    // Degrade stats naturally
    const degradedStats = AnimalLifecycle.degradeStats(updatedAnimal);
    const animalWithDegradedStats = {
      ...updatedAnimal,
      stats: degradedStats,
      lastHealthCheck: Date.now()
    };
    
    // Check for health issues
    const { isHealthy, criticalStats } = AnimalLifecycle.checkHealth(animalWithDegradedStats);
    const alerts: HealthAlert[] = [];
    
    // Generate alerts based on stats
    if (animalWithDegradedStats.stats.health < 10) {
      alerts.push({
        animalId: animal.id,
        severity: 'critical',
        message: `${animal.name} is critically ill and may die soon!`,
        timestamp: Date.now(),
        suggestedActions: ['find medicine', 'rest', 'seek shelter']
      });
    } else if (animalWithDegradedStats.stats.health < 30) {
      alerts.push({
        animalId: animal.id,
        severity: 'high',
        message: `${animal.name} is in poor health`,
        timestamp: Date.now(),
        suggestedActions: ['rest', 'find food', 'avoid strenuous activity']
      });
    }
    
    if (animalWithDegradedStats.stats.hunger > 90) {
      alerts.push({
        animalId: animal.id,
        severity: 'critical',
        message: `${animal.name} is starving!`,
        timestamp: Date.now(),
        suggestedActions: ['find food immediately', 'hunt', 'forage']
      });
    } else if (animalWithDegradedStats.stats.hunger > 70) {
      alerts.push({
        animalId: animal.id,
        severity: 'high',
        message: `${animal.name} is very hungry`,
        timestamp: Date.now(),
        suggestedActions: ['find food', 'eat']
      });
    }
    
    if (animalWithDegradedStats.stats.thirst > 90) {
      alerts.push({
        animalId: animal.id,
        severity: 'critical',
        message: `${animal.name} is severely dehydrated!`,
        timestamp: Date.now(),
        suggestedActions: ['find water immediately', 'drink']
      });
    } else if (animalWithDegradedStats.stats.thirst > 70) {
      alerts.push({
        animalId: animal.id,
        severity: 'high',
        message: `${animal.name} is very thirsty`,
        timestamp: Date.now(),
        suggestedActions: ['find water', 'drink']
      });
    }
    
    if (animalWithDegradedStats.stats.energy < 10) {
      alerts.push({
        animalId: animal.id,
        severity: 'high',
        message: `${animal.name} is exhausted`,
        timestamp: Date.now(),
        suggestedActions: ['sleep', 'rest', 'find safe place']
      });
    }
    
    if (animalWithDegradedStats.stats.happiness < 20) {
      alerts.push({
        animalId: animal.id,
        severity: 'medium',
        message: `${animal.name} is very unhappy`,
        timestamp: Date.now(),
        suggestedActions: ['play', 'socialize', 'explore']
      });
    }
    
    // Check if animal died of old age
    if (!animalWithDegradedStats.isAlive) {
      alerts.push({
        animalId: animal.id,
        severity: 'critical',
        message: `${animal.name} has reached the end of their natural lifespan`,
        timestamp: Date.now(),
        suggestedActions: ['memorial', 'offspring care']
      });
    }
    
    // Determine overall status
    let overallStatus: HealthReport['overallStatus'] = 'healthy';
    
    if (!animalWithDegradedStats.isAlive) {
      overallStatus = 'dying';
    } else if (alerts.some(alert => alert.severity === 'critical')) {
      overallStatus = 'critical';
    } else if (alerts.some(alert => alert.severity === 'high')) {
      overallStatus = 'warning';
    }
    
    // Get AI recommendation for next action
    const survivalPriority = AnimalLifecycle.calculateSurvivalPriority(animalWithDegradedStats);
    let nextActionRecommendation = 'idle';
    
    if (survivalPriority > 50) {
      // Critical survival needs
      if (animalWithDegradedStats.stats.health < 30) nextActionRecommendation = 'sleeping';
      else if (animalWithDegradedStats.stats.thirst > 70) nextActionRecommendation = 'drinking';
      else if (animalWithDegradedStats.stats.hunger > 70) nextActionRecommendation = 'eating';
      else if (animalWithDegradedStats.stats.energy < 30) nextActionRecommendation = 'sleeping';
    } else {
      // Recreational activities
      const lifeStage = AnimalLifecycle.getLifeStage(animalWithDegradedStats);
      if (lifeStage === 'baby' || lifeStage === 'young') {
        nextActionRecommendation = 'playing';
      } else if (animalWithDegradedStats.dna.curiosity > 70) {
        nextActionRecommendation = 'exploring';
      } else if (animalWithDegradedStats.dna.social > 70) {
        nextActionRecommendation = 'socializing';
      } else {
        nextActionRecommendation = 'idle';
      }
    }
    
    return {
      animal: animalWithDegradedStats,
      alerts,
      nextActionRecommendation,
      overallStatus
    };
  }
  
  private async handleCriticalHealth(animal: Animal): Promise<void> {
    console.log(`🚨 ${animal.name} needs immediate attention!`);
    
    // Force survival actions
    if (animal.stats.thirst > 80) {
      await this.executeAnimalAction(animal, 'drinking');
    } else if (animal.stats.hunger > 80) {
      await this.executeAnimalAction(animal, 'eating');
    } else if (animal.stats.health < 20 || animal.stats.energy < 20) {
      await this.executeAnimalAction(animal, 'sleeping');
    }
  }
  
  private async handleHealthWarning(animal: Animal): Promise<void> {
    console.log(`⚠️ ${animal.name} has health concerns`);
    
    // Use AI to decide on appropriate action
    const ai = this.aiInstances.get(animal.id);
    if (ai) {
      const worldState = this.getWorldState();
      const action = await ai.decideAction(animal, worldState);
      await this.executeAnimalAction(animal, action);
    }
  }
  
  private async handleHealthyAnimal(animal: Animal): Promise<void> {
    console.log(`🤔 ${animal.name} is deciding what to do...`);
    // For healthy animals, use AI to decide on fun activities
    const ai = this.aiInstances.get(animal.id);
    if (ai) {
      const worldState = this.getWorldState();
      try {
        const action = await ai.decideAction(animal, worldState);
        console.log(`🎯 ${animal.name} decided to: ${action}`);
        await this.executeAnimalAction(animal, action);
      } catch (error) {
        console.error(`Error getting AI decision for ${animal.name}:`, error);
      }
    }
  }
  
  private async executeAnimalAction(animal: Animal, action: any): Promise<void> {
    try {
      // Generate random parameters for certain actions
      let params: any = {
        worldState: this.getWorldState() // Always include world state
      };
      
      if (action === 'moving') {
        // Generate a random nearby target for movement
        const range = 6;
        params = {
          ...params,
          targetX: animal.position.x + (Math.random() - 0.5) * range,
          targetZ: animal.position.z + (Math.random() - 0.5) * range,
          speed: 1
        };
      }
      
      const result = await this.actionSystem.executeAction(animal, action, params);
      
      if (result.success && result.statChanges) {
        // Apply stat changes
        const updatedAnimal = {
          ...animal,
          stats: {
            ...animal.stats,
            ...result.statChanges
          },
          currentAction: action
        };
        
        // Apply position changes if any
        if (result.newPosition) {
          updatedAnimal.position = result.newPosition;
        }
        
        this.animals.set(animal.id, updatedAnimal);
        console.log(`✅ ${result.message}`);
      } else {
        console.log(`❌ ${result.message}`);
      }
    } catch (error) {
      console.error(`Error executing action ${action} for ${animal.name}:`, error);
    }
  }
  
  private getWorldState(): any {
    // Enhanced world state with actual animal and resource data
    const animals = Array.from(this.animals.values()).map(animal => ({
      id: animal.id,
      name: animal.name,
      position: animal.position,
      currentAction: animal.currentAction,
      age: animal.age,
      stats: animal.stats
    }));
    
    // Mock resources for now - would be provided by game manager in full implementation
    const resources = [
      { id: 'food_1', type: 'food', position: { x: 10, y: 0, z: 5 }, quantity: 100 },
      { id: 'food_2', type: 'food', position: { x: -8, y: 0, z: 12 }, quantity: 75 },
      { id: 'water_1', type: 'water', position: { x: 5, y: 0, z: -10 }, quantity: 200 },
      { id: 'water_2', type: 'water', position: { x: -15, y: 0, z: -5 }, quantity: 150 },
      { id: 'shelter_1', type: 'shelter', position: { x: 0, y: 0, z: 15 }, quantity: 1 },
      { id: 'shelter_2', type: 'shelter', position: { x: 20, y: 0, z: -8 }, quantity: 1 }
    ];
    
    return {
      animals,
      resources,
      totalAnimals: this.animals.size,
      timeOfDay: 'day',
      weather: 'clear',
      threats: []
    };
  }
  
  private emitHealthReports(reports: HealthReport[]): void {
    // This could emit to WebSocket clients, store in database, etc.
    console.log(`📊 Health check completed for ${reports.length} animals`);
    
    const criticalAnimals = reports.filter(r => r.overallStatus === 'critical' || r.overallStatus === 'dying');
    if (criticalAnimals.length > 0) {
      console.warn(`🚨 ${criticalAnimals.length} animals need immediate attention!`);
    }
  }
  
  getHealthReport(animalId: string): HealthReport | null {
    const animal = this.animals.get(animalId);
    if (!animal) return null;
    
    // Return cached health report or generate new one
    return this.checkAnimalHealth(animal) as any; // This would normally be cached
  }
  
  getAllHealthReports(): Promise<HealthReport[]> {
    return Promise.all(
      Array.from(this.animals.values()).map(animal => this.checkAnimalHealth(animal))
    );
  }
}