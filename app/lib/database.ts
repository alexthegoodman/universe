import Dexie, { Table } from 'dexie';
import type { Animal } from '../types/animal';
import type { Building } from '../types/building';
import type { Nation } from '../types/nation';
import type { WorldResource, Bandit } from './game-manager';
import type { GameEvent } from '../components/EventsPanel';
import type { TerritoryInfo } from '../types/nation';
import type { InventoryItem } from '../types/animal';
import type { ExplorationMemory } from '../types/exploration';

// Game save metadata interface
export interface GameSave {
  id?: number;
  name: string;
  createdAt: number;
  lastModifiedAt: number;
  version: string;
  gameTime: number;
  playerNationId?: string;
  isQuickSave?: boolean;
  screenshot?: string; // Base64 encoded screenshot
}

// Game state interface for complete world data
export interface SavedGameState {
  id?: number;
  saveId: number; // Foreign key to GameSave
  worldConfig: {
    width: number;
    height: number;
    depth: number;
  };
  environment: {
    temperature: number;
    humidity: number;
    timeOfDay: "dawn" | "day" | "dusk" | "night";
    weather: "clear" | "cloudy" | "rainy" | "stormy";
  };
  gameTime: number;
  version: number;
}

// Simplified interfaces for database storage (flattened from complex nested structures)
export interface SavedAnimal {
  id: string;
  saveId: number;
  name: string;
  dna: string; // JSON serialized AnimalDNA
  stats: string; // JSON serialized AnimalStats
  position: string; // JSON serialized position {x, y, z}
  inventory: string; // JSON serialized Inventory
  birthTime: number;
  lifespan: number;
  age: number;
  currentAction: string;
  lastHealthCheck: number;
  isAlive: boolean;
  deathCounters: string; // JSON serialized
  chainId?: string;
  specialMemories?: string; // JSON serialized SpecialMemory[]
  skills: string; // JSON serialized Record<string, number>
  experience: string; // JSON serialized Record<string, number>
  unlockedAdvancedPaths: string; // JSON serialized string[]
  skillPreferences: string; // JSON serialized string[]
  homeId?: string;
  nationId?: string;
}

export interface SavedBuilding {
  id: string;
  saveId: number;
  name: string;
  type: string;
  position: string; // JSON serialized {x, y, z}
  dimensions: string; // JSON serialized BuildingDimensions
  materials: string; // JSON serialized BuildingMaterialsUsed
  stats: string; // JSON serialized BuildingStats
  isComplete: boolean;
  createdAt: number;
  lastModifiedAt: number;
  createdBy: string;
  currentOccupants: string; // JSON serialized string[]
  maxOccupants: number;
  features: string; // JSON serialized string[]
  nationId?: string;
  territoryRadius?: number;
}

export interface SavedResource {
  id: string;
  saveId: number;
  type: string;
  category: string;
  position: string; // JSON serialized {x, y, z}
  quantity: number;
  harvestable: boolean;
  regeneratesOverTime: boolean;
  quality: number;
  rarity: string;
  traits: string; // JSON serialized ResourceTraits
}

export interface SavedNation {
  id: string;
  saveId: number;
  name: string;
  color: string; // JSON serialized {primary, secondary}
  leaderId?: string;
  foundingDate: number;
  settlements: string; // JSON serialized string[]
  territoryCenter?: string; // JSON serialized {x, y, z}
  citizenIds: string; // JSON serialized string[]
  maxCitizens: number;
  treasury: number;
  taxRate: number;
  lastTaxCollection: number;
  policies: string; // JSON serialized policies object
  relationships: string; // JSON serialized Record<string, NationRelationship>
  stats: string; // JSON serialized nation stats
}

export interface SavedBandit {
  id: string;
  saveId: number;
  name: string;
  position: string; // JSON serialized {x, y, z}
  health: number;
  strength: number;
  agility: number;
  aggression: number;
  lastAttackTime: number;
  attackCooldown: number;
  lootInventory: string; // JSON serialized InventoryItem[]
  isAlive: boolean;
}

export interface SavedTerritory {
  id: string;
  saveId: number;
  nationId: string;
  settlementId: string;
  center: string; // JSON serialized {x, y, z}
  radius: number;
  color: string;
  opacity: number;
}

export interface SavedGameEvent {
  id: string;
  saveId: number;
  type: string;
  message: string;
  timestamp: number;
  animalId?: string;
}

// Database class
export class UniverseDatabase extends Dexie {
  // Tables
  gameSaves!: Table<GameSave>;
  gameStates!: Table<SavedGameState>;
  animals!: Table<SavedAnimal>;
  buildings!: Table<SavedBuilding>;
  resources!: Table<SavedResource>;
  nations!: Table<SavedNation>;
  bandits!: Table<SavedBandit>;
  territories!: Table<SavedTerritory>;
  gameEvents!: Table<SavedGameEvent>;

  constructor() {
    super('UniverseGameDB');

    this.version(1).stores({
      // Core save metadata
      gameSaves: '++id, name, createdAt, lastModifiedAt, isQuickSave',
      gameStates: '++id, saveId, gameTime',
      
      // Game entities - all indexed by saveId for efficient loading
      animals: 'id, saveId, nationId, homeId, birthTime, isAlive',
      buildings: '++id, saveId, type, nationId, createdBy, createdAt',
      resources: '++id, saveId, type, category, rarity, harvestable',
      nations: 'id, saveId, leaderId, foundingDate',
      bandits: 'id, saveId, isAlive, lastAttackTime',
      territories: '++id, saveId, nationId, settlementId',
      gameEvents: '++id, saveId, type, timestamp, animalId'
    });
  }

  // Helper methods for serialization
  private serialize(obj: any): string {
    return JSON.stringify(obj);
  }

  private deserialize<T>(json: string): T {
    return JSON.parse(json);
  }

  // Convert game entities to database format
  private animalToSaved(animal: Animal, saveId: number): SavedAnimal {
    return {
      ...animal,
      saveId,
      dna: this.serialize(animal.dna),
      stats: this.serialize(animal.stats),
      position: this.serialize(animal.position),
      inventory: this.serialize(animal.inventory),
      deathCounters: this.serialize(animal.deathCounters),
      specialMemories: animal.specialMemories ? this.serialize(animal.specialMemories) : undefined,
      skills: this.serialize(animal.skills),
      experience: this.serialize(animal.experience),
      unlockedAdvancedPaths: this.serialize(animal.unlockedAdvancedPaths),
      skillPreferences: this.serialize(animal.skillPreferences),
    };
  }

  private buildingToSaved(building: Building, saveId: number): SavedBuilding {
    return {
      ...building,
      saveId,
      position: this.serialize(building.position),
      dimensions: this.serialize(building.dimensions),
      materials: this.serialize(building.materials),
      stats: this.serialize(building.stats),
      currentOccupants: this.serialize(building.currentOccupants),
      features: this.serialize(building.features),
    };
  }

  private resourceToSaved(resource: WorldResource, saveId: number): SavedResource {
    return {
      ...resource,
      saveId,
      position: this.serialize(resource.position),
      traits: this.serialize(resource.traits),
    };
  }

  private nationToSaved(nation: Nation, saveId: number): SavedNation {
    return {
      ...nation,
      saveId,
      color: this.serialize(nation.color),
      settlements: this.serialize(nation.settlements),
      territoryCenter: nation.territoryCenter ? this.serialize(nation.territoryCenter) : undefined,
      citizenIds: this.serialize(nation.citizenIds),
      policies: this.serialize(nation.policies),
      relationships: this.serialize(nation.relationships),
      stats: this.serialize(nation.stats),
    };
  }

  private banditToSaved(bandit: Bandit, saveId: number): SavedBandit {
    return {
      ...bandit,
      saveId,
      position: this.serialize(bandit.position),
      lootInventory: this.serialize(bandit.lootInventory),
    };
  }

  private territoryToSaved(territory: TerritoryInfo, saveId: number): SavedTerritory {
    return {
      id: `${territory.nationId}-${territory.settlementId}`,
      saveId,
      nationId: territory.nationId,
      settlementId: territory.settlementId,
      center: this.serialize(territory.center),
      radius: territory.radius,
      color: territory.color,
      opacity: territory.opacity,
    };
  }

  private eventToSaved(event: GameEvent, saveId: number): SavedGameEvent {
    return {
      ...event,
      saveId,
    };
  }

  // Convert database format back to game entities
  private savedToAnimal(saved: SavedAnimal): Animal {
    return {
      id: saved.id,
      name: saved.name,
      dna: this.deserialize(saved.dna),
      stats: this.deserialize(saved.stats),
      position: this.deserialize(saved.position),
      inventory: this.deserialize(saved.inventory),
      birthTime: saved.birthTime,
      lifespan: saved.lifespan,
      age: saved.age,
      currentAction: saved.currentAction,
      lastHealthCheck: saved.lastHealthCheck,
      isAlive: saved.isAlive,
      deathCounters: this.deserialize(saved.deathCounters),
      chainId: saved.chainId,
      specialMemories: saved.specialMemories ? this.deserialize(saved.specialMemories) : undefined,
      skills: this.deserialize(saved.skills),
      experience: this.deserialize(saved.experience),
      unlockedAdvancedPaths: this.deserialize(saved.unlockedAdvancedPaths),
      skillPreferences: this.deserialize(saved.skillPreferences),
      homeId: saved.homeId,
      nationId: saved.nationId,
    };
  }

  private savedToBuilding(saved: SavedBuilding): Building {
    return {
      id: saved.id,
      name: saved.name,
      type: saved.type as any,
      position: this.deserialize(saved.position),
      dimensions: this.deserialize(saved.dimensions),
      materials: this.deserialize(saved.materials),
      stats: this.deserialize(saved.stats),
      isComplete: saved.isComplete,
      createdAt: saved.createdAt,
      lastModifiedAt: saved.lastModifiedAt,
      createdBy: saved.createdBy,
      currentOccupants: this.deserialize(saved.currentOccupants),
      maxOccupants: saved.maxOccupants,
      features: this.deserialize(saved.features),
      nationId: saved.nationId,
      territoryRadius: saved.territoryRadius,
    };
  }

  private savedToResource(saved: SavedResource): WorldResource {
    return {
      id: saved.id,
      type: saved.type as any,
      category: saved.category as any,
      position: this.deserialize(saved.position),
      quantity: saved.quantity,
      harvestable: saved.harvestable,
      regeneratesOverTime: saved.regeneratesOverTime,
      quality: saved.quality,
      rarity: saved.rarity as any,
      traits: this.deserialize(saved.traits),
    };
  }

  private savedToNation(saved: SavedNation): Nation {
    return {
      id: saved.id,
      name: saved.name,
      color: this.deserialize(saved.color),
      leaderId: saved.leaderId,
      foundingDate: saved.foundingDate,
      settlements: this.deserialize(saved.settlements),
      territoryCenter: saved.territoryCenter ? this.deserialize(saved.territoryCenter) : undefined,
      citizenIds: this.deserialize(saved.citizenIds),
      maxCitizens: saved.maxCitizens,
      treasury: saved.treasury,
      taxRate: saved.taxRate,
      lastTaxCollection: saved.lastTaxCollection,
      policies: this.deserialize(saved.policies),
      relationships: this.deserialize(saved.relationships),
      stats: this.deserialize(saved.stats),
    };
  }

  private savedToBandit(saved: SavedBandit): Bandit {
    return {
      id: saved.id,
      name: saved.name,
      position: this.deserialize(saved.position),
      health: saved.health,
      strength: saved.strength,
      agility: saved.agility,
      aggression: saved.aggression,
      lastAttackTime: saved.lastAttackTime,
      attackCooldown: saved.attackCooldown,
      lootInventory: this.deserialize(saved.lootInventory),
      isAlive: saved.isAlive,
    };
  }

  private savedToTerritory(saved: SavedTerritory): TerritoryInfo {
    return {
      nationId: saved.nationId,
      settlementId: saved.settlementId,
      center: this.deserialize(saved.center),
      radius: saved.radius,
      color: saved.color,
      opacity: saved.opacity,
    };
  }

  private savedToEvent(saved: SavedGameEvent): GameEvent {
    return {
      id: saved.id,
      type: saved.type,
      message: saved.message,
      timestamp: saved.timestamp,
      animalId: saved.animalId,
    };
  }

  // Main save/load methods
  async saveGame(
    name: string,
    gameState: {
      animals: Animal[];
      buildings: Building[];
      resources: WorldResource[];
      nations: Nation[];
      bandits: Bandit[];
      territories: TerritoryInfo[];
      events: GameEvent[];
      environment: any;
      worldConfig: any;
      gameTime: number;
      version: number;
    },
    playerNationId?: string,
    isQuickSave = false,
    screenshot?: string
  ): Promise<number> {
    const now = Date.now();
    
    // Create the save record
    const saveId = await this.gameSaves.add({
      name,
      createdAt: now,
      lastModifiedAt: now,
      version: '1.0.0',
      gameTime: gameState.gameTime,
      playerNationId,
      isQuickSave,
      screenshot,
    });

    // Save the game state
    await this.gameStates.add({
      saveId,
      worldConfig: gameState.worldConfig,
      environment: gameState.environment,
      gameTime: gameState.gameTime,
      version: gameState.version,
    });

    // Save all entities in parallel
    await Promise.all([
      this.animals.bulkAdd(gameState.animals.map(animal => this.animalToSaved(animal, saveId))),
      this.buildings.bulkAdd(gameState.buildings.map(building => this.buildingToSaved(building, saveId))),
      this.resources.bulkAdd(gameState.resources.map(resource => this.resourceToSaved(resource, saveId))),
      this.nations.bulkAdd(gameState.nations.map(nation => this.nationToSaved(nation, saveId))),
      this.bandits.bulkAdd(gameState.bandits.map(bandit => this.banditToSaved(bandit, saveId))),
      this.territories.bulkAdd(gameState.territories.map(territory => this.territoryToSaved(territory, saveId))),
      this.gameEvents.bulkAdd(gameState.events.map(event => this.eventToSaved(event, saveId))),
    ]);

    return saveId;
  }

  async loadGame(saveId: number): Promise<{
    animals: Animal[];
    buildings: Building[];
    resources: WorldResource[];
    nations: Nation[];
    bandits: Bandit[];
    territories: TerritoryInfo[];
    events: GameEvent[];
    environment: any;
    worldConfig: any;
    gameTime: number;
    version: number;
    playerNationId?: string;
  } | null> {
    const gameSave = await this.gameSaves.get(saveId);
    if (!gameSave) return null;

    const gameState = await this.gameStates.where('saveId').equals(saveId).first();
    if (!gameState) return null;

    // Load all entities in parallel
    const [animals, buildings, resources, nations, bandits, territories, events] = await Promise.all([
      this.animals.where('saveId').equals(saveId).toArray(),
      this.buildings.where('saveId').equals(saveId).toArray(),
      this.resources.where('saveId').equals(saveId).toArray(),
      this.nations.where('saveId').equals(saveId).toArray(),
      this.bandits.where('saveId').equals(saveId).toArray(),
      this.territories.where('saveId').equals(saveId).toArray(),
      this.gameEvents.where('saveId').equals(saveId).toArray(),
    ]);

    return {
      animals: animals.map(this.savedToAnimal.bind(this)),
      buildings: buildings.map(this.savedToBuilding.bind(this)),
      resources: resources.map(this.savedToResource.bind(this)),
      nations: nations.map(this.savedToNation.bind(this)),
      bandits: bandits.map(this.savedToBandit.bind(this)),
      territories: territories.map(this.savedToTerritory.bind(this)),
      events: events.map(this.savedToEvent.bind(this)),
      environment: gameState.environment,
      worldConfig: gameState.worldConfig,
      gameTime: gameState.gameTime,
      version: gameState.version,
      playerNationId: gameSave.playerNationId,
    };
  }

  async getAllSaves(): Promise<GameSave[]> {
    return this.gameSaves.orderBy('lastModifiedAt').reverse().toArray();
  }

  async deleteSave(saveId: number): Promise<void> {
    // Delete all associated data
    await Promise.all([
      this.gameSaves.delete(saveId),
      this.gameStates.where('saveId').equals(saveId).delete(),
      this.animals.where('saveId').equals(saveId).delete(),
      this.buildings.where('saveId').equals(saveId).delete(),
      this.resources.where('saveId').equals(saveId).delete(),
      this.nations.where('saveId').equals(saveId).delete(),
      this.bandits.where('saveId').equals(saveId).delete(),
      this.territories.where('saveId').equals(saveId).delete(),
      this.gameEvents.where('saveId').equals(saveId).delete(),
    ]);
  }

  async quickSave(gameState: any, playerNationId?: string, screenshot?: string): Promise<number> {
    // Delete existing quick save if it exists
    const existingQuickSave = await this.gameSaves.where('isQuickSave').equals(1).first();
    if (existingQuickSave) {
      await this.deleteSave(existingQuickSave.id!);
    }

    return this.saveGame('Quick Save', gameState, playerNationId, true, screenshot);
  }

  async getQuickSave(): Promise<GameSave | undefined> {
    return this.gameSaves.where('isQuickSave').equals(1).first();
  }
}

// Export singleton instance
export const db = new UniverseDatabase();