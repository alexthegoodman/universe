import type { Animal } from '../types/animal';
import { AnimalLifecycle } from './animal-lifecycle';
import { HealthMonitor } from './health-monitor';
import { DNASystem } from './dna-system';
import { BreedingSystem } from './breeding-system';

export interface GameConfig {
  maxAnimals: number;
  startingAnimals: number;
  worldSize: { width: number; height: number; depth: number };
  enableWebSocket: boolean;
  webSocketPort: number;
}

export interface WorldResource {
  id: string;
  type: 'food' | 'water' | 'shelter' | 'material' | 'berries' | 'wood' | 'stone';
  position: { x: number; y: number; z: number };
  quantity: number;
  harvestable: boolean;
  regeneratesOverTime: boolean;
  quality: number; // 0-100
}

export interface WorldState {
  animals: Animal[];
  resources: WorldResource[];
  environment: {
    temperature: number;
    humidity: number;
    timeOfDay: 'dawn' | 'day' | 'dusk' | 'night';
    weather: 'clear' | 'cloudy' | 'rainy' | 'stormy';
  };
  events: Array<{
    id: string;
    type: string;
    message: string;
    timestamp: number;
    animalId?: string;
  }>;
}

export class GameManager {
  private config: GameConfig;
  private healthMonitor: HealthMonitor;
  private breedingSystem: BreedingSystem;
  private worldState: WorldState;
  private websocketServer: any;
  private gameRunning: boolean = false;
  
  constructor(config: Partial<GameConfig> = {}) {
    this.config = {
      maxAnimals: 50,
      startingAnimals: 3,
      worldSize: { width: 100, height: 10, depth: 100 },
      enableWebSocket: true,
      webSocketPort: 8080,
      ...config
    };
    
    this.healthMonitor = new HealthMonitor();
    this.breedingSystem = new BreedingSystem();
    this.worldState = this.initializeWorld();
    
    if (this.config.enableWebSocket) {
      this.setupWebSocketServer();
    }
  }
  
  private initializeWorld(): WorldState {
    return {
      animals: [],
      resources: this.generateInitialResources(),
      environment: {
        temperature: 72,
        humidity: 0.6,
        timeOfDay: 'day',
        weather: 'clear'
      },
      events: []
    };
  }
  
  private generateInitialResources(): WorldResource[] {
    const resources: WorldResource[] = [];
    const { width, depth } = this.config.worldSize;
    
    // Generate food sources (non-harvestable, direct consumption)
    for (let i = 0; i < 20; i++) {
      resources.push({
        id: `food_${i}`,
        type: 'food' as const,
        position: {
          x: (Math.random() - 0.5) * width,
          y: 0,
          z: (Math.random() - 0.5) * depth
        },
        quantity: 50 + Math.random() * 100,
        harvestable: false,
        regeneratesOverTime: true,
        quality: 40 + Math.random() * 40
      });
    }
    
    // Generate water sources (non-harvestable, direct consumption)
    for (let i = 0; i < 10; i++) {
      resources.push({
        id: `water_${i}`,
        type: 'water' as const,
        position: {
          x: (Math.random() - 0.5) * width,
          y: 0,
          z: (Math.random() - 0.5) * depth
        },
        quantity: 200 + Math.random() * 300,
        harvestable: false,
        regeneratesOverTime: true,
        quality: 60 + Math.random() * 40
      });
    }
    
    // Generate berry bushes (harvestable food)
    for (let i = 0; i < 15; i++) {
      resources.push({
        id: `berries_${i}`,
        type: 'berries' as const,
        position: {
          x: (Math.random() - 0.5) * width,
          y: 0,
          z: (Math.random() - 0.5) * depth
        },
        quantity: 10 + Math.random() * 30,
        harvestable: true,
        regeneratesOverTime: true,
        quality: 50 + Math.random() * 50
      });
    }
    
    // Generate wood sources (harvestable material)
    for (let i = 0; i < 12; i++) {
      resources.push({
        id: `wood_${i}`,
        type: 'wood' as const,
        position: {
          x: (Math.random() - 0.5) * width,
          y: 0,
          z: (Math.random() - 0.5) * depth
        },
        quantity: 20 + Math.random() * 50,
        harvestable: true,
        regeneratesOverTime: false,
        quality: 30 + Math.random() * 70
      });
    }
    
    // Generate stone sources (harvestable material)
    for (let i = 0; i < 8; i++) {
      resources.push({
        id: `stone_${i}`,
        type: 'stone' as const,
        position: {
          x: (Math.random() - 0.5) * width,
          y: 0,
          z: (Math.random() - 0.5) * depth
        },
        quantity: 30 + Math.random() * 70,
        harvestable: true,
        regeneratesOverTime: false,
        quality: 40 + Math.random() * 60
      });
    }
    
    // Generate shelter locations
    for (let i = 0; i < 8; i++) {
      resources.push({
        id: `shelter_${i}`,
        type: 'shelter' as const,
        position: {
          x: (Math.random() - 0.5) * width,
          y: 0,
          z: (Math.random() - 0.5) * depth
        },
        quantity: 1,
        harvestable: false,
        regeneratesOverTime: false,
        quality: 70 + Math.random() * 30
      });
    }
    
    return resources;
  }
  
  private setupWebSocketServer() {
    try {
      // Dynamic import for server-side WebSocket
      const GameWebSocketServer = require('../../server.js');
      this.websocketServer = new GameWebSocketServer(this.config.webSocketPort);
      this.websocketServer.start();
      
      console.log(`🌐 WebSocket server started on port ${this.config.webSocketPort}`);
    } catch (error) {
      console.warn('Could not start WebSocket server:', error);
    }
  }
  
  async startGame(): Promise<void> {
    if (this.gameRunning) {
      console.log('Game is already running');
      return;
    }
    
    console.log('🌌 Starting Universe game...');
    this.gameRunning = true;
    
    // Create initial animals
    for (let i = 0; i < this.config.startingAnimals; i++) {
      await this.spawnRandomAnimal();
    }
    
    // Start health monitoring
    this.healthMonitor.startMonitoring();
    
    // Start world simulation loops
    this.startEnvironmentUpdates();
    this.startResourceRegeneration();
    this.startBreedingCycles();
    
    console.log(`🎮 Universe game started with ${this.config.startingAnimals} animals!`);
    this.addEvent('system', 'Universe game started!');
  }
  
  stopGame(): void {
    console.log('🛑 Stopping Universe game...');
    this.gameRunning = false;
    
    this.healthMonitor.stopMonitoring();
    
    if (this.websocketServer) {
      this.websocketServer.stop();
    }
    
    this.addEvent('system', 'Universe game stopped');
  }
  
  async spawnRandomAnimal(): Promise<Animal | null> {
    if (this.worldState.animals.length >= this.config.maxAnimals) {
      console.log('Maximum animal capacity reached');
      return null;
    }
    
    const name = AnimalLifecycle.generateRandomName();
    const position = this.getRandomSafePosition();
    
    const animal = AnimalLifecycle.createAnimal(name, position);
    
    // Add to world state
    this.worldState.animals.push(animal);
    
    // Register with health monitor
    this.healthMonitor.addAnimal(animal);
    
    // Broadcast to clients
    if (this.websocketServer) {
      this.websocketServer.updateAnimal(animal);
    }
    
    this.addEvent('birth', `${name} was born!`, animal.id);
    console.log(`🐾 ${name} spawned at position (${position.x.toFixed(1)}, ${position.z.toFixed(1)})`);
    
    return animal;
  }
  
  async spawnOffspring(parent1: Animal, parent2: Animal): Promise<Animal | null> {
    if (this.worldState.animals.length >= this.config.maxAnimals) {
      return null;
    }
    
    const name = AnimalLifecycle.generateRandomName();
    const position = {
      x: (parent1.position.x + parent2.position.x) / 2 + (Math.random() - 0.5) * 5,
      y: 0,
      z: (parent1.position.z + parent2.position.z) / 2 + (Math.random() - 0.5) * 5,
      rotation: 0
    };
    
    const animal = AnimalLifecycle.createAnimal(name, position, [parent1.dna, parent2.dna]);
    
    this.worldState.animals.push(animal);
    this.healthMonitor.addAnimal(animal);
    
    if (this.websocketServer) {
      this.websocketServer.updateAnimal(animal);
    }
    
    this.addEvent('birth', `${name} was born to ${parent1.name} and ${parent2.name}!`, animal.id);
    console.log(`👶 ${name} born from ${parent1.name} and ${parent2.name}!`);
    
    return animal;
  }
  
  removeAnimal(animalId: string): void {
    const animalIndex = this.worldState.animals.findIndex(a => a.id === animalId);
    if (animalIndex === -1) return;
    
    const animal = this.worldState.animals[animalIndex];
    this.worldState.animals.splice(animalIndex, 1);
    
    this.healthMonitor.removeAnimal(animalId);
    
    if (this.websocketServer) {
      this.websocketServer.broadcastToClients({
        type: 'animalRemoved',
        data: { animalId, animal }
      });
    }
    
    this.addEvent('death', `${animal.name} has passed away`, animalId);
    console.log(`💀 ${animal.name} has been removed from the world`);
  }
  
  private getRandomSafePosition() {
    const { width, depth } = this.config.worldSize;
    return {
      x: (Math.random() - 0.5) * width * 0.8,
      y: 0,
      z: (Math.random() - 0.5) * depth * 0.8,
      rotation: Math.random() * Math.PI * 2
    };
  }
  
  private startEnvironmentUpdates(): void {
    // Update environment every 5 minutes
    setInterval(() => {
      if (!this.gameRunning) return;
      
      this.updateEnvironment();
    }, 5 * 60 * 1000);
  }
  
  private startResourceRegeneration(): void {
    // Regenerate resources every 2 minutes
    setInterval(() => {
      if (!this.gameRunning) return;
      
      this.regenerateResources();
    }, 2 * 60 * 1000);
  }
  
  private startBreedingCycles(): void {
    // Check for breeding opportunities every 3 minutes
    setInterval(() => {
      if (!this.gameRunning) return;
      
      this.performBreedingCycle();
    }, 3 * 60 * 1000);
  }
  
  private updateEnvironment(): void {
    const env = this.worldState.environment;
    
    // Simple time progression
    const timeProgression = ['dawn', 'day', 'dusk', 'night'] as const;
    const currentIndex = timeProgression.indexOf(env.timeOfDay);
    env.timeOfDay = timeProgression[(currentIndex + 1) % timeProgression.length];
    
    // Random weather changes
    if (Math.random() < 0.3) {
      const weathers = ['clear', 'cloudy', 'rainy', 'stormy'] as const;
      env.weather = weathers[Math.floor(Math.random() * weathers.length)];
    }
    
    // Temperature and humidity variations
    env.temperature += (Math.random() - 0.5) * 10;
    env.temperature = Math.max(32, Math.min(100, env.temperature));
    
    env.humidity += (Math.random() - 0.5) * 0.2;
    env.humidity = Math.max(0.1, Math.min(1.0, env.humidity));
    
    this.addEvent('environment', `Time changed to ${env.timeOfDay}, weather is ${env.weather}`);
    
    if (this.websocketServer) {
      this.websocketServer.broadcastToClients({
        type: 'environmentUpdate',
        data: env
      });
    }
  }
  
  private regenerateResources(): void {
    this.worldState.resources.forEach(resource => {
      if (resource.regeneratesOverTime) {
        if (resource.type === 'food' && resource.quantity < 20) {
          resource.quantity += Math.random() * 30;
        } else if (resource.type === 'water' && resource.quantity < 50) {
          resource.quantity += Math.random() * 100;
        } else if (resource.type === 'berries' && resource.quantity < 5) {
          resource.quantity += Math.random() * 15;
        }
      }
    });
    
    if (this.websocketServer) {
      this.websocketServer.broadcastToClients({
        type: 'resourcesUpdated',
        data: this.worldState.resources
      });
    }
  }

  harvestResource(resourceId: string, amount: number = 1): { success: boolean; item?: any } {
    const resource = this.worldState.resources.find(r => r.id === resourceId);
    if (!resource || !resource.harvestable || resource.quantity < amount) {
      return { success: false };
    }
    
    resource.quantity -= amount;
    
    const harvestedItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: resource.type === 'berries' ? 'food' : resource.type,
      name: resource.type,
      quantity: amount,
      quality: resource.quality,
      harvestedAt: Date.now()
    };
    
    return { success: true, item: harvestedItem };
  }

  addItemToAnimalInventory(animalId: string, item: any): boolean {
    const animal = this.healthMonitor.getAnimal(animalId);
    if (!animal) return false;

    const itemWeight = item.quantity * (item.type === 'stone' ? 3 : item.type === 'wood' ? 2 : 1);
    
    if (animal.inventory.currentWeight + itemWeight > animal.inventory.maxCapacity) {
      return false;
    }

    // Check if we can stack with existing item
    const existingItem = animal.inventory.items.find(i => 
      i.type === item.type && i.name === item.name && i.quality === item.quality
    );

    if (existingItem) {
      existingItem.quantity += item.quantity;
    } else {
      animal.inventory.items.push(item);
    }

    animal.inventory.currentWeight += itemWeight;
    return true;
  }

  consumeItemFromInventory(animalId: string, itemType: string, amount: number = 1): boolean {
    const animal = this.healthMonitor.getAnimal(animalId);
    if (!animal) return false;

    const item = animal.inventory.items.find(i => i.type === itemType && i.quantity >= amount);
    if (!item) return false;

    const itemWeight = amount * (item.type === 'stone' ? 3 : item.type === 'wood' ? 2 : 1);
    
    item.quantity -= amount;
    animal.inventory.currentWeight -= itemWeight;

    if (item.quantity <= 0) {
      const index = animal.inventory.items.indexOf(item);
      animal.inventory.items.splice(index, 1);
    }

    return true;
  }
  
  private addEvent(type: string, message: string, animalId?: string): void {
    const event = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      message,
      timestamp: Date.now(),
      animalId
    };
    
    this.worldState.events.unshift(event);
    
    // Keep only last 100 events
    if (this.worldState.events.length > 100) {
      this.worldState.events = this.worldState.events.slice(0, 100);
    }
    
    if (this.websocketServer) {
      this.websocketServer.broadcastToClients({
        type: 'newEvent',
        data: event
      });
    }
  }
  
  getWorldState(): WorldState {
    return { ...this.worldState };
  }
  
  getAnimal(animalId: string): Animal | undefined {
    // Get the most up-to-date animal from the health monitor
    return this.healthMonitor.getAnimal(animalId);
  }
  
  getAllAnimals(): Animal[] {
    // Get the most up-to-date animals from the health monitor
    return this.healthMonitor.getAllAnimals();
  }
  
  getAnimalsByPosition(x: number, z: number, radius: number = 10): Animal[] {
    // Use up-to-date animals from health monitor
    return this.healthMonitor.getAllAnimals().filter(animal => {
      const distance = Math.sqrt(
        Math.pow(animal.position.x - x, 2) + 
        Math.pow(animal.position.z - z, 2)
      );
      return distance <= radius;
    });
  }
  
  findNearestResource(position: { x: number; z: number }, resourceType: string) {
    let nearest = null;
    let minDistance = Infinity;
    
    for (const resource of this.worldState.resources) {
      if (resource.type === resourceType && resource.quantity > 0) {
        const distance = Math.sqrt(
          Math.pow(resource.position.x - position.x, 2) + 
          Math.pow(resource.position.z - position.z, 2)
        );
        
        if (distance < minDistance) {
          minDistance = distance;
          nearest = resource;
        }
      }
    }
    
    return nearest;
  }
  
  consumeResource(resourceId: string, amount: number = 1): boolean {
    const resource = this.worldState.resources.find(r => r.id === resourceId);
    if (!resource || resource.quantity < amount) {
      return false;
    }
    
    resource.quantity -= amount;
    return true;
  }
  
  private performBreedingCycle(): void {
    const breedingResults = this.breedingSystem.autoBreeding(this.worldState.animals);
    
    for (const result of breedingResults) {
      if (result.success && result.offspring) {
        // Add offspring to world
        this.worldState.animals.push(result.offspring);
        this.healthMonitor.addAnimal(result.offspring);
        
        if (this.websocketServer) {
          this.websocketServer.updateAnimal(result.offspring);
        }
        
        console.log(`🐣 ${result.message}`);
      }
      
      this.addEvent('breeding', result.message);
    }
    
    if (breedingResults.length > 0) {
      console.log(`💕 Breeding cycle completed: ${breedingResults.filter(r => r.success).length} successful births`);
    }
  }
  
  getBreedingSystem(): BreedingSystem {
    return this.breedingSystem;
  }
}