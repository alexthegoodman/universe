import type {
  Building,
  BuildingAction,
  BuildingActionResult,
  BuildingDimensions,
  BuildingMaterial,
  BuildingStats,
} from "../types/building";
import { BUILDING_ACTIONS } from "../types/building";
import type { Animal, InventoryItem } from "../types/animal";
import { RESOURCE_WEIGHTS } from "../types/weights";

export class BuildingSystem {
  private buildings: Map<string, Building> = new Map();
  private buildingActions: Record<string, BuildingAction>;

  constructor() {
    this.buildingActions = BUILDING_ACTIONS;
  }

  // Create a new building
  createBuilding(
    animal: Animal,
    position: { x: number; y: number; z: number },
    name: string = "Animal Shelter"
  ): BuildingActionResult {
    const action = this.buildingActions.create_building;

    // Check if animal has required materials
    const materialCheck = this.checkMaterials(animal, action.requiredMaterials);
    if (!materialCheck.success) {
      return {
        success: false,
        message: materialCheck.message!,
        duration: 2000,
      };
    }

    // Create the building
    const building: Building = {
      id: `building_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      position,
      dimensions: {
        width: action.effects.dimensionChanges?.width || 3,
        height: action.effects.dimensionChanges?.height || 2,
        depth: action.effects.dimensionChanges?.depth || 3,
      },
      materials: { ...action.requiredMaterials },
      stats: {
        durability: action.effects.statChanges?.durability || 60,
        beauty: action.effects.statChanges?.beauty || 30,
        capacity: action.effects.capacityChange || 2,
        comfort: action.effects.statChanges?.comfort || 50,
      },
      isComplete: true,
      createdAt: Date.now(),
      lastModifiedAt: Date.now(),
      createdBy: animal.id,
      currentOccupants: [],
      maxOccupants: action.effects.capacityChange || 2,
    };

    this.buildings.set(building.id, building);

    return {
      success: true,
      message: `${animal.name} successfully built ${name}!`,
      materialConsumed: action.requiredMaterials,
      buildingChanges: {
        dimensions: building.dimensions,
        stats: building.stats,
        capacity: building.maxOccupants,
      },
      duration: 15000, // 15 seconds to build
    };
  }

  // Modify an existing building
  modifyBuilding(
    animal: Animal,
    buildingId: string,
    actionType: string
  ): BuildingActionResult {
    const building = this.buildings.get(buildingId);
    if (!building) {
      return {
        success: false,
        message: `${animal.name} couldn't find the building to modify`,
        duration: 1000,
      };
    }

    const action = this.buildingActions[actionType];
    if (!action) {
      return {
        success: false,
        message: `${animal.name} doesn't know how to perform that building action`,
        duration: 1000,
      };
    }

    // Check distance to building
    const distance = Math.sqrt(
      Math.pow(building.position.x - animal.position.x, 2) +
        Math.pow(building.position.z - animal.position.z, 2)
    );

    if (distance > 5) {
      // Must be within 5 units
      return {
        success: false,
        message: `${animal.name} is too far from the building to modify it`,
        duration: 1000,
      };
    }

    // Check materials
    const materialCheck = this.checkMaterials(animal, action.requiredMaterials);
    if (!materialCheck.success) {
      return {
        success: false,
        message: materialCheck.message!,
        duration: 2000,
      };
    }

    // Apply modifications
    const changes: any = {};

    if (action.effects.dimensionChanges) {
      Object.keys(action.effects.dimensionChanges).forEach((key) => {
        const change =
          action.effects.dimensionChanges![key as keyof BuildingDimensions];
        if (change) {
          building.dimensions[key as keyof BuildingDimensions] += change;
          changes.dimensions = changes.dimensions || {};
          changes.dimensions[key] =
            building.dimensions[key as keyof BuildingDimensions];
        }
      });
    }

    if (action.effects.statChanges) {
      Object.keys(action.effects.statChanges).forEach((key) => {
        const change = action.effects.statChanges![key as keyof BuildingStats];
        if (change) {
          building.stats[key as keyof BuildingStats] = Math.max(
            0,
            Math.min(100, building.stats[key as keyof BuildingStats] + change)
          );
          changes.stats = changes.stats || {};
          changes.stats[key] = building.stats[key as keyof BuildingStats];
        }
      });
    }

    if (action.effects.capacityChange) {
      building.maxOccupants += action.effects.capacityChange;
      building.stats.capacity = building.maxOccupants;
      changes.capacity = building.maxOccupants;
    }

    // Update building materials used
    building.materials.stone += action.requiredMaterials.stone;
    building.materials.wood += action.requiredMaterials.wood;
    building.lastModifiedAt = Date.now();

    return {
      success: true,
      message: `${animal.name} successfully improved the building with "${action.name}"!`,
      materialConsumed: action.requiredMaterials,
      buildingChanges: changes,
      duration:
        8000 +
        action.requiredMaterials.stone * 1000 +
        action.requiredMaterials.wood * 500,
    };
  }

  // Check if animal has required materials
  private checkMaterials(
    animal: Animal,
    required: BuildingMaterial
  ): { success: boolean; message?: string } {
    const inventory = animal.inventory.items;

    const stoneItems = inventory.filter((item) => item.type === "stone");
    const woodItems = inventory.filter((item) => item.type === "wood");

    const totalStone = stoneItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalWood = woodItems.reduce((sum, item) => sum + item.quantity, 0);

    if (totalStone < required.stone) {
      return {
        success: false,
        message: `${animal.name} needs ${required.stone} stone but only has ${totalStone}`,
      };
    }

    if (totalWood < required.wood) {
      return {
        success: false,
        message: `${animal.name} needs ${required.wood} wood but only has ${totalWood}`,
      };
    }

    return { success: true };
  }

  // Consume materials from animal's inventory
  consumeMaterials(animal: Animal, materials: BuildingMaterial): boolean {
    const inventory = animal.inventory.items;

    // Consume stone
    let stoneNeeded = materials.stone;
    for (let i = inventory.length - 1; i >= 0 && stoneNeeded > 0; i--) {
      const item = inventory[i];
      if (item.type === "stone") {
        const consumed = Math.min(item.quantity, stoneNeeded);
        item.quantity -= consumed;
        stoneNeeded -= consumed;

        // Update weight
        animal.inventory.currentWeight -= consumed * RESOURCE_WEIGHTS.stone; // Stone weighs 3 units each

        if (item.quantity <= 0) {
          inventory.splice(i, 1);
        }
      }
    }

    // Consume wood
    let woodNeeded = materials.wood;
    for (let i = inventory.length - 1; i >= 0 && woodNeeded > 0; i--) {
      const item = inventory[i];
      if (item.type === "wood") {
        const consumed = Math.min(item.quantity, woodNeeded);
        item.quantity -= consumed;
        woodNeeded -= consumed;

        // Update weight
        animal.inventory.currentWeight -= consumed * RESOURCE_WEIGHTS.wood; // Wood weighs 2 units each

        if (item.quantity <= 0) {
          inventory.splice(i, 1);
        }
      }
    }

    return stoneNeeded === 0 && woodNeeded === 0;
  }

  // Get all buildings
  getAllBuildings(): Building[] {
    return Array.from(this.buildings.values());
  }

  // Get buildings near a position
  getBuildingsNear(
    position: { x: number; z: number },
    radius: number = 20
  ): Building[] {
    return this.getAllBuildings().filter((building) => {
      const distance = Math.sqrt(
        Math.pow(building.position.x - position.x, 2) +
          Math.pow(building.position.z - position.z, 2)
      );
      return distance <= radius;
    });
  }

  // Get building by ID
  getBuilding(buildingId: string): Building | undefined {
    return this.buildings.get(buildingId);
  }

  // Enter a building (for shelter/rest)
  enterBuilding(animal: Animal, buildingId: string): boolean {
    const building = this.buildings.get(buildingId);
    if (!building) return false;

    if (building.currentOccupants.length >= building.maxOccupants) {
      return false; // Building is full
    }

    if (building.currentOccupants.includes(animal.id)) {
      return true; // Already inside
    }

    building.currentOccupants.push(animal.id);
    return true;
  }

  // Leave a building
  leaveBuilding(animal: Animal, buildingId: string): boolean {
    const building = this.buildings.get(buildingId);
    if (!building) return false;

    const index = building.currentOccupants.indexOf(animal.id);
    if (index >= 0) {
      building.currentOccupants.splice(index, 1);
      return true;
    }

    return false;
  }

  // Get available building actions for an animal
  getAvailableActions(animal: Animal, buildingId?: string): BuildingAction[] {
    const actions: BuildingAction[] = [];

    // Always available: create new building
    const createAction = this.buildingActions.create_building;
    const canCreate = this.checkMaterials(
      animal,
      createAction.requiredMaterials
    );
    if (canCreate.success) {
      actions.push(createAction);
    }

    // Building modification actions (only if near a building)
    if (buildingId) {
      const building = this.getBuilding(buildingId);
      if (building) {
        const distance = Math.sqrt(
          Math.pow(building.position.x - animal.position.x, 2) +
            Math.pow(building.position.z - animal.position.z, 2)
        );

        if (distance <= 5) {
          Object.values(this.buildingActions).forEach((action) => {
            if (action.type !== "create_building") {
              const canPerform = this.checkMaterials(
                animal,
                action.requiredMaterials
              );
              if (canPerform.success) {
                actions.push(action);
              }
            }
          });
        }
      }
    }

    return actions;
  }

  // Calculate building bonus for an animal (when inside)
  getBuildingBonus(animal: Animal): {
    comfort: number;
    happiness: number;
    safety: number;
  } {
    const bonus = { comfort: 1, happiness: 0, safety: 1 };

    // Find building the animal is in
    for (const building of this.buildings.values()) {
      if (building.currentOccupants.includes(animal.id)) {
        bonus.comfort = Math.min(2, 1 + building.stats.comfort / 100);
        bonus.happiness = building.stats.beauty / 5; // Beauty adds happiness
        bonus.safety = Math.min(2, 1 + building.stats.durability / 100);
        break;
      }
    }

    return bonus;
  }
}

// Export singleton instance
export const buildingSystem = new BuildingSystem();
