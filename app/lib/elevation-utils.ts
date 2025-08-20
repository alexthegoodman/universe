import type { Animal, AnimalPosition } from "../types/animal";
import type { TerrainGenerator } from "./terrain-generator";

export interface ElevationConfig {
  uphillMultiplier: number;
  downhillMultiplier: number;
  baseHeightOffset: number;
}

export const DEFAULT_ELEVATION_CONFIG: ElevationConfig = {
  uphillMultiplier: 0.1, // 10% more energy per unit elevation gained
  downhillMultiplier: 0.05, // 5% more energy per unit elevation lost  
  baseHeightOffset: 1 // Place entities 1 unit above terrain
};

export class ElevationUtils {
  constructor(
    private terrainGenerator?: TerrainGenerator,
    private config: ElevationConfig = DEFAULT_ELEVATION_CONFIG
  ) {}

  /**
   * Calculate elevation-adjusted energy cost for movement
   */
  calculateElevationEnergyCost(
    fromX: number,
    fromZ: number,
    toX: number,
    toZ: number,
    baseEnergyCost: number
  ): number {
    if (!this.terrainGenerator) {
      return baseEnergyCost;
    }

    const currentElevation = this.terrainGenerator.getHeightAt(fromX, fromZ);
    const targetElevation = this.terrainGenerator.getHeightAt(toX, toZ);
    const elevationDiff = Math.abs(targetElevation - currentElevation);
    
    // Climbing costs more energy than descending
    const elevationCostMultiplier = targetElevation > currentElevation ? 
      1 + (elevationDiff * this.config.uphillMultiplier) : 
      1 + (elevationDiff * this.config.downhillMultiplier);

    return baseEnergyCost * elevationCostMultiplier;
  }

  /**
   * Calculate horizontal distance between two points
   */
  calculateHorizontalDistance(
    fromX: number,
    fromZ: number,
    toX: number,
    toZ: number
  ): number {
    return Math.sqrt(
      Math.pow(toX - fromX, 2) + Math.pow(toZ - fromZ, 2)
    );
  }

  /**
   * Get terrain height at coordinates, with fallback
   */
  getTerrainHeight(x: number, z: number): number {
    return this.terrainGenerator?.getHeightAt(x, z) || 0;
  }

  /**
   * Create a new position with proper terrain elevation
   */
  createElevatedPosition(
    currentPosition: AnimalPosition,
    targetX: number,
    targetZ: number
  ): AnimalPosition {
    const terrainHeight = this.getTerrainHeight(targetX, targetZ);
    
    return {
      x: targetX,
      y: terrainHeight + this.config.baseHeightOffset,
      z: targetZ,
      rotation: Math.atan2(
        targetZ - currentPosition.z,
        targetX - currentPosition.x
      ),
    };
  }

  /**
   * Calculate energy cost for movement considering both distance and elevation
   */
  calculateMovementEnergyCost(
    animal: Animal,
    targetX: number,
    targetZ: number,
    baseEnergyPerDistance: number
  ): number {
    const horizontalDistance = this.calculateHorizontalDistance(
      animal.position.x,
      animal.position.z,
      targetX,
      targetZ
    );
    
    const baseEnergyCost = baseEnergyPerDistance * (horizontalDistance / 10) * animal.dna.size;
    
    return this.calculateElevationEnergyCost(
      animal.position.x,
      animal.position.z,
      targetX,
      targetZ,
      baseEnergyCost
    );
  }

  /**
   * Check if target position is within world bounds
   */
  isWithinWorldBounds(
    targetX: number,
    targetZ: number,
    worldBounds: { width: number; depth: number }
  ): boolean {
    const halfWidth = worldBounds.width / 2;
    const halfDepth = worldBounds.depth / 2;
    
    return !(
      targetX < -halfWidth ||
      targetX > halfWidth ||
      targetZ < -halfDepth ||
      targetZ > halfDepth
    );
  }

  /**
   * Update animal position with terrain elevation
   */
  updateAnimalPosition(animal: Animal, targetX: number, targetZ: number): void {
    const newPosition = this.createElevatedPosition(animal.position, targetX, targetZ);
    animal.position = newPosition;
  }
}