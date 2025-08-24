import type {
  Building,
  BuildingAction,
  BuildingActionResult,
  BuildingDimensions,
  BuildingMaterial,
  BuildingMaterialsUsed,
  BuildingStats,
  BuildingType,
} from "../types/building";
import { BUILDING_ACTIONS } from "../types/building";
import type { Animal, InventoryItem } from "../types/animal";
import { RESOURCE_WEIGHTS } from "../types/weights";
import type { ResourceType, ResourceTraits } from "./game-manager";
import { RESOURCE_TRAIT_MAP } from "./game-manager";
import { nationSystem } from "./nation-system";
import { CurrencySystem } from "./currency-system";
import { skillSystem } from "./skill-system";

export class BuildingSystem {
  buildings: Map<string, Building> = new Map();
  private buildingActions: Record<string, BuildingAction>;

  constructor() {
    this.buildingActions = BUILDING_ACTIONS;
  }

  // Check if an animal already has a home
  private hasHome(animalId: string): boolean {
    return Array.from(this.buildings.values()).some(
      (building) => building.type === "home" && building.createdBy === animalId
    );
  }

  // Check if a building type already exists (for global limits)
  private hasGlobalBuilding(buildingType: BuildingType): boolean {
    return Array.from(this.buildings.values()).some(
      (building) => building.type === buildingType
    );
  }

  // Get the animal's home building
  getAnimalHome(animalId: string): Building | undefined {
    return Array.from(this.buildings.values()).find(
      (building) => building.type === "home" && building.createdBy === animalId
    );
  }

  // Get buildings by type
  getBuildingsByType(buildingType: BuildingType): Building[] {
    return Array.from(this.buildings.values()).filter(
      (building) => building.type === buildingType
    );
  }

  // Get the global trading post
  getTradingPost(): Building | undefined {
    return Array.from(this.buildings.values()).find(
      (building) => building.type === "trading_post"
    );
  }

  // Get the global hospital
  getHospital(): Building | undefined {
    return Array.from(this.buildings.values()).find(
      (building) => building.type === "hospital"
    );
  }

  // Calculate total building area (used for size-based rewards)
  private calculateBuildingArea(dimensions: BuildingDimensions): number {
    return dimensions.width * dimensions.height * dimensions.depth;
  }

  // Calculate area-based happiness bonus for larger houses
  private calculateAreaBonus(area: number): number {
    // Base bonus starts at area 20 (starting house is 3*2*3 = 18)
    // +1 happiness per 2 additional area units, capped at +20
    const baseArea = 20;
    if (area <= baseArea) return 0;

    const extraArea = area - baseArea;
    return Math.min(20, Math.floor(extraArea / 2));
  }

  // Check if position is too close to existing buildings
  checkBuildingProximity(
    position: { x: number; y: number; z: number },
    minDistance: number = 8
  ): { canBuild: boolean; conflictingBuilding?: Building } {
    for (const building of this.buildings.values()) {
      const distance = Math.sqrt(
        Math.pow(position.x - building.position.x, 2) +
          Math.pow(position.z - building.position.z, 2)
      );

      if (distance < minDistance) {
        return {
          canBuild: false,
          conflictingBuilding: building,
        };
      }
    }

    return { canBuild: true };
  }

  // Check if animal meets skill requirements for a building action
  private checkSkillRequirements(
    animal: Animal,
    skillRequirements?: string[]
  ): { canBuild: boolean; message?: string } {
    if (!skillRequirements || skillRequirements.length === 0) {
      return { canBuild: true };
    }

    const unmetRequirements = skillSystem
      .checkSkillRequirements(animal, skillRequirements)
      .filter((req) => !req.met);

    if (unmetRequirements.length > 0) {
      const missingSkills = unmetRequirements
        .map(
          (req) => `${req.skillName}: ${req.currentLevel}/${req.requiredLevel}`
        )
        .join(", ");

      return {
        canBuild: false,
        message: `${animal.name} lacks the required skills. Missing: ${missingSkills}`,
      };
    }

    return { canBuild: true };
  }

  // Create a new building
  createBuilding(
    animal: Animal,
    position: { x: number; y: number; z: number },
    name: string = "Animal Shelter",
    buildingType: BuildingType = "home",
    usesMaterials: boolean = true
  ): BuildingActionResult {
    // Determine the action type based on buildingType
    let actionKey = "create_home";
    if (buildingType === "home") actionKey = "create_home";
    else if (buildingType === "trading_post") actionKey = "create_trading_post";
    else if (buildingType === "hospital") actionKey = "create_hospital";
    else if (buildingType === "factory") actionKey = "create_factory";
    else if (buildingType === "settlement") actionKey = "create_settlement";
    else if (buildingType === "apartment_complex") actionKey = "create_apartment_complex";
    else if (buildingType === "forge") actionKey = "create_forge";
    else if (buildingType === "mill") actionKey = "create_mill";
    else if (buildingType === "brewery") actionKey = "create_brewery";
    else if (buildingType === "electronics_fab") actionKey = "create_electronics_fab";
    else if (buildingType === "mine") actionKey = "create_mine";
    else if (buildingType === "bank") actionKey = "create_bank";
    else if (buildingType === "stadium") actionKey = "create_stadium";
    else if (buildingType === "library") actionKey = "create_library";
    else if (buildingType === "temple") actionKey = "create_temple";
    else if (buildingType === "lab") actionKey = "create_lab";
    else if (buildingType === "greenhouse") actionKey = "create_greenhouse";
    else if (buildingType === "armory") actionKey = "create_armory";

    const action = this.buildingActions[actionKey];
    if (!action) {
      return {
        success: false,
        message: `Unknown building type: ${buildingType}`,
        duration: 1000,
      };
    }

    // Check building type constraints
    if (buildingType === "home" && this.hasHome(animal.id)) {
      return {
        success: false,
        message: `${animal.name} already has a home. Each animal can only have one home.`,
        duration: 2000,
      };
    }

    if (
      (buildingType === "trading_post" || buildingType === "hospital") &&
      this.hasGlobalBuilding(buildingType)
    ) {
      return {
        success: false,
        message: `There can only be one ${buildingType.replace(
          "_",
          " "
        )} on the map.`,
        duration: 2000,
      };
    }

    // Check skill requirements first
    if (usesMaterials) {
      const skillCheck = this.checkSkillRequirements(
        animal,
        action.skillRequirements
      );
      if (!skillCheck.canBuild) {
        return {
          success: false,
          message: skillCheck.message!,
          duration: 2000,
        };
      }
    }

    // Check if animal has required materials
    if (usesMaterials) {
      const materialCheck = this.checkMaterials(
        animal,
        action.requiredMaterials
      );
      if (!materialCheck.success) {
        return {
          success: false,
          message: materialCheck.message!,
          duration: 2000,
        };
      }
    }

    // Check building proximity to prevent overlapping or too-close buildings
    const proximityCheck = this.checkBuildingProximity(position);
    if (!proximityCheck.canBuild) {
      const conflictingBuilding = proximityCheck.conflictingBuilding!;
      return {
        success: false,
        message: `Cannot build here - too close to existing ${conflictingBuilding.name} (${conflictingBuilding.id}). Buildings must be at least 8 units apart.`,
        duration: 2000,
      };
    }

    // Check territory restrictions - animals can only build in their own nation's territory
    const territoryCheck = nationSystem.canAnimalBuildAt(
      animal.id,
      {
        x: position.x,
        z: position.z,
      },
      buildingType
    );
    if (!territoryCheck.canBuild) {
      return {
        success: false,
        message: `${animal.name} cannot build here - ${territoryCheck.reason}`,
        duration: 2000,
      };
    }

    // Consume materials from animal's inventory
    let materialsUsed: BuildingMaterialsUsed = {};
    if (usesMaterials) {
      const consumeResult = this.consumeMaterials(
        animal,
        action.requiredMaterials
      );
      if (!consumeResult.success) {
        return {
          success: false,
          message: `${animal.name} failed to gather the required materials for building`,
          duration: 2000,
        };
      }

      materialsUsed = consumeResult.materialsUsed;
    }

    // Create the building
    const building: Building = {
      id: `building_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      type: buildingType,
      position,
      dimensions: {
        width: action.effects.dimensionChanges?.width || 3,
        height: action.effects.dimensionChanges?.height || 2,
        depth: action.effects.dimensionChanges?.depth || 3,
      },
      materials: materialsUsed,
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
      features: [],
    };

    this.buildings.set(building.id, building);

    // Update animal's home reference if this is a home
    if (buildingType === "home") {
      animal.homeId = building.id;
    }

    // Create settlement territory if this is a settlement
    if (buildingType === "settlement" && animal.nationId) {
      nationSystem.createSettlement(animal.nationId, building, 35);
    }

    // Calculate area bonus for the new building
    const currentArea = this.calculateBuildingArea(building.dimensions);
    const areaBonus = this.calculateAreaBonus(currentArea);

    return {
      success: true,
      message: `${animal.name} successfully built ${name}!`,
      materialConsumed: materialsUsed,
      buildingChanges: {
        dimensions: building.dimensions,
        stats: building.stats,
        capacity: building.maxOccupants,
      },
      duration: 15000, // 15 seconds to build
      areaBonus: areaBonus,
    };
  }

  // Modify an existing building
  modifyBuilding(
    animal: Animal,
    buildingId: string,
    actionType: string,
    amount?: number
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

    // Check skill requirements
    const skillCheck = this.checkSkillRequirements(
      animal,
      action.skillRequirements
    );
    if (!skillCheck.canBuild) {
      return {
        success: false,
        message: skillCheck.message!,
        duration: 2000,
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

    // Handle currency-based vs material-based actions
    let consumeResult: any = { success: true, materialsUsed: {} };

    if (actionType === "purchase_upgrade") {
      // Handle currency-based upgrade with variable amount
      const spendAmount = amount || 100;
      const currentWealth = CurrencySystem.calculateAnimalWealth(animal);

      if (currentWealth < spendAmount) {
        return {
          success: false,
          message: `${animal.name} needs ${spendAmount} currency but only has ${currentWealth}`,
          duration: 2000,
        };
      }

      // Consume materials from inventory equal to spend amount, starting with most valuable
      consumeResult = this.consumeMaterialsForCurrency(animal, spendAmount);
      if (!consumeResult.success) {
        return {
          success: false,
          message: `${animal.name} failed to gather resources worth ${spendAmount} currency`,
          duration: 2000,
        };
      }
    } else {
      // Handle material-based actions
      const materialCheck = this.checkMaterials(
        animal,
        action.requiredMaterials
      );
      if (!materialCheck.success) {
        return {
          success: false,
          message: materialCheck.message!,
          duration: 2000,
        };
      }

      // Consume materials from animal's inventory
      consumeResult = this.consumeMaterials(animal, action.requiredMaterials);
      if (!consumeResult.success) {
        return {
          success: false,
          message: `${animal.name} failed to gather the required materials for building modification`,
          duration: 2000,
        };
      }
    }

    // Apply modifications
    const changes: any = {};

    // Scale effects for purchase_upgrade based on amount spent
    const amountPerMultiple = 250;
    const effectMultiplier =
      actionType === "purchase_upgrade"
        ? Math.ceil((amount || 100) / amountPerMultiple)
        : 1;

    console.info(
      "Improving building with action:",
      actionType,
      action,
      effectMultiplier
    );

    if (action.effects.dimensionChanges) {
      Object.keys(action.effects.dimensionChanges).forEach((key) => {
        const change =
          action.effects.dimensionChanges![key as keyof BuildingDimensions];
        if (change) {
          const scaledChange = change * effectMultiplier;
          const dimensionKey = key as keyof BuildingDimensions;

          // Apply the change
          building.dimensions[dimensionKey] += scaledChange;

          // Apply limits: clamp width and depth to maximum of 10, but allow height to scale infinitely
          if (dimensionKey === "width" || dimensionKey === "depth") {
            building.dimensions[dimensionKey] = Math.min(
              10,
              building.dimensions[dimensionKey]
            );
          }

          changes.dimensions = changes.dimensions || {};
          changes.dimensions[key] = building.dimensions[dimensionKey];
        }
      });
    }

    if (action.effects.statChanges) {
      Object.keys(action.effects.statChanges).forEach((key) => {
        const change = action.effects.statChanges![key as keyof BuildingStats];
        if (change) {
          const scaledChange = change * effectMultiplier;
          building.stats[key as keyof BuildingStats] = Math.max(
            0,
            Math.min(
              100,
              building.stats[key as keyof BuildingStats] + scaledChange
            )
          );
          changes.stats = changes.stats || {};
          changes.stats[key] = building.stats[key as keyof BuildingStats];
        }
      });
    }

    if (action.effects.capacityChange) {
      const scaledCapacityChange =
        action.effects.capacityChange * effectMultiplier;
      building.maxOccupants += scaledCapacityChange;
      building.stats.capacity = building.maxOccupants;
      changes.capacity = building.maxOccupants;
    }

    // Add features for specific building actions
    if (!building.features) {
      building.features = [];
    }
    if (
      actionType === "add_workshop" &&
      !building.features.includes("workshop")
    ) {
      building.features.push("workshop");
    }
    if (actionType === "add_garden" && !building.features.includes("garden")) {
      building.features.push("garden");
    }

    // Update building materials used (add to existing materials) - only for material-based actions
    if (actionType !== "purchase_upgrade") {
      Object.keys(consumeResult.materialsUsed).forEach((resourceName) => {
        building.materials[resourceName] =
          (building.materials[resourceName] || 0) +
          consumeResult.materialsUsed[resourceName];
      });
    }
    building.lastModifiedAt = Date.now();

    // Calculate area bonus for larger houses
    const currentArea = this.calculateBuildingArea(building.dimensions);
    const areaBonus = this.calculateAreaBonus(currentArea);

    return {
      success: true,
      message: `${animal.name} successfully improved the building with "${
        action.name
      }"! ${amount ? `(Spent ${amount} currency)` : ""}`,
      materialConsumed: consumeResult.materialsUsed,
      buildingChanges: changes,
      duration: 8000 + action.requiredMaterials.requiredQuantity * 1000,
      areaBonus: areaBonus,
    };
  }

  // Check if animal has required materials
  private checkMaterials(
    animal: Animal,
    required: BuildingMaterial
  ): { success: boolean; message?: string } {
    const inventory = animal.inventory.items;
    const minScore = required.minTraitScore || 50;

    // Find items that have all required traits with sufficient scores
    const suitableItems = inventory.filter((item) => {
      // if (item.type !== "material") return false;

      // Get the resource traits for this item
      const resourceTraits = RESOURCE_TRAIT_MAP[item.name as ResourceType];
      if (!resourceTraits) return false;

      // Check if this resource has all required traits with sufficient scores
      return required.suitableTraits.every((trait) => {
        const score = resourceTraits[trait as keyof ResourceTraits];
        return score !== undefined && score >= minScore;
      });
    });

    const totalSuitableMaterials = suitableItems.reduce(
      (sum, item) => sum + item.quantity,
      0
    );

    if (totalSuitableMaterials < required.requiredQuantity) {
      const traitList = required.suitableTraits.join(", ");
      return {
        success: false,
        message: `${animal.name} needs ${required.requiredQuantity} materials with traits [${traitList}] (min score: ${minScore}) but only has ${totalSuitableMaterials}`,
      };
    }

    return { success: true };
  }

  // Consume materials from animal's inventory
  consumeMaterials(
    animal: Animal,
    materials: BuildingMaterial
  ): { success: boolean; materialsUsed: BuildingMaterialsUsed } {
    const inventory = animal.inventory.items;
    const minScore = materials.minTraitScore || 50;

    // Find items that have all required traits with sufficient scores
    const suitableItems = inventory.filter((item) => {
      if (item.type !== "material") return false;

      // Get the resource traits for this item
      const resourceTraits = RESOURCE_TRAIT_MAP[item.name as ResourceType];
      if (!resourceTraits) return false;

      // Check if this resource has all required traits with sufficient scores
      return materials.suitableTraits.every((trait) => {
        const score = resourceTraits[trait as keyof ResourceTraits];
        return score !== undefined && score >= minScore;
      });
    });

    // Consume materials and track what was used
    let materialsNeeded = materials.requiredQuantity;
    const materialsUsed: BuildingMaterialsUsed = {};

    for (let i = inventory.length - 1; i >= 0 && materialsNeeded > 0; i--) {
      const item = inventory[i];

      // Check if this item is suitable
      if (suitableItems.includes(item)) {
        const consumed = Math.min(item.quantity, materialsNeeded);
        item.quantity -= consumed;
        materialsNeeded -= consumed;

        // Track what was consumed
        materialsUsed[item.name] = (materialsUsed[item.name] || 0) + consumed;

        // Update weight using the appropriate resource weight
        const resourceWeight =
          RESOURCE_WEIGHTS[item.name as keyof typeof RESOURCE_WEIGHTS] || 1;
        animal.inventory.currentWeight -= consumed * resourceWeight;

        if (item.quantity <= 0) {
          inventory.splice(i, 1);
        }
      }
    }

    return {
      success: materialsNeeded === 0,
      materialsUsed: materialsUsed,
    };
  }

  // Consume materials from animal's inventory equal to currency amount, starting with most valuable
  consumeMaterialsForCurrency(
    animal: Animal,
    targetAmount: number
  ): {
    success: boolean;
    materialsUsed: BuildingMaterialsUsed;
    totalValue: number;
  } {
    const inventory = animal.inventory.items;
    const materialsUsed: BuildingMaterialsUsed = {};
    let totalValueConsumed = 0;

    // Create list of items with their values, sorted by value per unit (most valuable first)
    const itemsWithValues = inventory
      .filter((item) => item.type === "material" && item.quantity > 0)
      .map((item) => ({
        item,
        valuePerUnit: CurrencySystem.calculateItemValue({
          ...item,
          quantity: 1,
        }),
        totalValue: CurrencySystem.calculateItemValue(item),
      }))
      .sort((a, b) => b.valuePerUnit - a.valuePerUnit);

    // Consume items starting with most valuable until we reach target amount
    for (
      let i = inventory.length - 1;
      i >= 0 && totalValueConsumed < targetAmount;
      i--
    ) {
      const item = inventory[i];
      const itemValueData = itemsWithValues.find((ivd) => ivd.item === item);

      if (!itemValueData || item.quantity <= 0) continue;

      const remainingNeeded = targetAmount - totalValueConsumed;
      const valuePerUnit = itemValueData.valuePerUnit;

      // Calculate how much of this item we need
      const quantityNeeded = Math.min(
        item.quantity,
        Math.ceil(remainingNeeded / valuePerUnit)
      );

      if (quantityNeeded > 0) {
        const valueConsumed = quantityNeeded * valuePerUnit;

        // Update item quantity
        item.quantity -= quantityNeeded;
        totalValueConsumed += valueConsumed;

        // Track what was consumed
        materialsUsed[item.name] =
          (materialsUsed[item.name] || 0) + quantityNeeded;

        // Update weight using the appropriate resource weight
        const resourceWeight =
          RESOURCE_WEIGHTS[item.name as keyof typeof RESOURCE_WEIGHTS] || 1;
        animal.inventory.currentWeight -= quantityNeeded * resourceWeight;

        // Remove item if depleted
        if (item.quantity <= 0) {
          inventory.splice(i, 1);
        }
      }
    }

    return {
      success: totalValueConsumed >= targetAmount,
      materialsUsed,
      totalValue: totalValueConsumed,
    };
  }

  // Get all buildings
  getAllBuildings(): Building[] {
    return Array.from(this.buildings.values());
  }

  // Clear all buildings (for loading saved games)
  clearAllBuildings(): void {
    this.buildings.clear();
  }

  // Restore a building from saved data (for loading saved games)
  restoreBuilding(building: Building): void {
    // Simply add the building to the buildings map without validation
    // This is for loading saved data, not creating new buildings
    this.buildings.set(building.id, {
      ...building,
      lastModifiedAt: Date.now(), // Update to current time to indicate restoration
    });
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

    // Always available: create new home
    const createAction1 = this.buildingActions.create_home; // Default to home creation
    const canCreate1 = this.checkMaterials(
      animal,
      createAction1.requiredMaterials
    );
    if (canCreate1.success) {
      actions.push(createAction1);
    }

    // Always available: create new trading post
    const createAction2 = this.buildingActions.create_trading_post; // Default to home creation
    const canCreate2 = this.checkMaterials(
      animal,
      createAction2.requiredMaterials
    );
    if (canCreate2.success) {
      actions.push(createAction2);
    }

    // Always available: create new hospital
    const createAction3 = this.buildingActions.create_hospital; // Default to home creation
    const canCreate3 = this.checkMaterials(
      animal,
      createAction3.requiredMaterials
    );
    if (canCreate3.success) {
      actions.push(createAction3);
    }

    // Always available: create new factpry
    const createAction4 = this.buildingActions.create_factory; // Default to home creation
    const canCreate4 = this.checkMaterials(
      animal,
      createAction4.requiredMaterials
    );
    if (canCreate4.success) {
      actions.push(createAction4);
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
            if (
              action.type !== "create_home" &&
              action.type !== "create_trading_post" &&
              action.type !== "create_hospital" &&
              action.type !== "create_factory"
            ) {
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

    // Find building the animal is in (check by distance)
    for (const building of this.buildings.values()) {
      const distance = Math.sqrt(
        Math.pow(building.position.x - animal.position.x, 2) +
          Math.pow(building.position.z - animal.position.z, 2)
      );

      // If animal is within building radius, apply bonuses
      if (distance <= 5) {
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
