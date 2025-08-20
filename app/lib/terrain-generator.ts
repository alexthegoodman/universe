// import { makeNoise2D } from "open-simplex-noise";

export interface TerrainConfig {
  width: number;
  depth: number;
  height: number;
  resolution: number;
  seed: number;
  octaves: number;
  persistence: number;
  lacunarity: number;
}

export interface BiomeData {
  type:
    | "water"
    | "beach"
    | "plains"
    | "forest"
    | "hills"
    | "mountains"
    | "peaks";
  elevation: number;
  moisture: number;
  color: [number, number, number];
}

export class TerrainGenerator {
  private config: TerrainConfig;
  private heightMap: Float32Array;
  private moistureMap: Float32Array;
  private biomeMap: BiomeData[];

  constructor(config: TerrainConfig) {
    this.config = config;
    this.heightMap = new Float32Array(config.resolution * config.resolution);
    this.moistureMap = new Float32Array(config.resolution * config.resolution);
    this.biomeMap = [];
    this.generateTerrain();
  }

  private noise(x: number, y: number, seed: number): number {
    let n = Math.sin(x * 12.9898 + y * 78.233 + seed * 37.719) * 43758.5453;
    return (n - Math.floor(n)) * 2 - 1;
  }

  // NOTE: still produces green strip, just much slower
  // private noise(x: number, y: number, seed: number): number {
  //   const maker = makeNoise2D(seed);
  //   return maker(x, y);
  // }

  private smoothNoise(x: number, y: number, seed: number): number {
    const corners =
      (this.noise(x - 1, y - 1, seed) +
        this.noise(x + 1, y - 1, seed) +
        this.noise(x - 1, y + 1, seed) +
        this.noise(x + 1, y + 1, seed)) /
      16;
    const sides =
      (this.noise(x - 1, y, seed) +
        this.noise(x + 1, y, seed) +
        this.noise(x, y - 1, seed) +
        this.noise(x, y + 1, seed)) /
      8;
    const center = this.noise(x, y, seed) / 4;
    return corners + sides + center;
  }

  private interpolate(a: number, b: number, t: number): number {
    const ft = t * Math.PI;
    const f = (1 - Math.cos(ft)) * 0.5;
    return a * (1 - f) + b * f;
  }

  private interpolatedNoise(x: number, y: number, seed: number): number {
    const intX = Math.floor(x);
    const intY = Math.floor(y);
    const fracX = x - intX;
    const fracY = y - intY;

    const v1 = this.smoothNoise(intX, intY, seed);
    const v2 = this.smoothNoise(intX + 1, intY, seed);
    const v3 = this.smoothNoise(intX, intY + 1, seed);
    const v4 = this.smoothNoise(intX + 1, intY + 1, seed);

    const i1 = this.interpolate(v1, v2, fracX);
    const i2 = this.interpolate(v3, v4, fracX);

    return this.interpolate(i1, i2, fracY);
  }

  private perlinNoise(x: number, y: number): number {
    let total = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxValue = 0;

    for (let i = 0; i < this.config.octaves; i++) {
      total +=
        this.interpolatedNoise(x * frequency, y * frequency, this.config.seed) *
        amplitude;
      maxValue += amplitude;
      amplitude *= this.config.persistence;
      frequency *= this.config.lacunarity;
    }

    // CHANGE THIS:
    // return (total / maxValue + 1) / 2; // Outputs [0, 1]

    // TO THIS:
    return total / maxValue; // Outputs [-1, 1]
  }

  private generateTerrain(): void {
    const { resolution, width, depth, height } = this.config;

    for (let x = 0; x < resolution; x++) {
      for (let z = 0; z < resolution; z++) {
        const worldX = (x / resolution - 0.5) * width;
        const worldZ = (z / resolution - 0.5) * depth;

        const heightOffset = 0.1;
        const heightValue =
          this.perlinNoise(worldX * 0.01, worldZ * 0.01) + heightOffset;
        const moistureValue = this.perlinNoise(
          worldX * 0.02 + 1000,
          worldZ * 0.02 + 1000
        );

        const index = x + z * resolution;

        this.heightMap[index] = heightValue * height;
        this.moistureMap[index] = moistureValue;

        this.biomeMap[index] = this.determineBiome(heightValue, moistureValue);
      }
    }
  }

  private determineBiome(elevation: number, moisture: number): BiomeData {
    // console.info("elevation", elevation, moisture);
    if (elevation < -0.1) {
      return {
        type: "water",
        elevation,
        moisture,
        color: [0.2, 0.4, 0.8],
      };
    } else if (elevation < -0) {
      return {
        type: "beach",
        elevation,
        moisture,
        color: [0.9, 0.8, 0.6],
      };
    } else if (elevation < 0.1) {
      if (moisture < 0.3) {
        return {
          type: "plains",
          elevation,
          moisture,
          color: [0.7, 0.6, 0.3],
        };
      } else {
        return {
          type: "plains",
          elevation,
          moisture,
          color: [0.4, 0.6, 0.2],
        };
      }
    } else if (elevation < 0.3) {
      if (moisture < 0.4) {
        return {
          type: "hills",
          elevation,
          moisture,
          color: [0.6, 0.5, 0.3],
        };
      } else {
        return {
          type: "forest",
          elevation,
          moisture,
          color: [0.2, 0.5, 0.2],
        };
      }
    } else if (elevation < 0.5) {
      return {
        type: "mountains",
        elevation,
        moisture,
        color: [0.5, 0.4, 0.3],
      };
    } else {
      return {
        type: "peaks",
        elevation,
        moisture,
        color: [0.9, 0.9, 0.9],
      };
    }
  }

  public getHeightAt(worldX: number, worldZ: number): number {
    const { resolution, width, depth } = this.config;
    const x = (worldX / width + 0.5) * resolution;
    const z = (worldZ / depth + 0.5) * resolution;

    const x1 = Math.floor(x);
    const z1 = Math.floor(z);
    const x2 = Math.min(x1 + 1, resolution - 1);
    const z2 = Math.min(z1 + 1, resolution - 1);

    if (x1 < 0 || z1 < 0 || x1 >= resolution || z1 >= resolution) {
      return 0;
    }

    const fx = x - x1;
    const fz = z - z1;

    const h1 = this.heightMap[x1 + z1 * resolution];
    const h2 = this.heightMap[x2 + z1 * resolution];
    const h3 = this.heightMap[x1 + z2 * resolution];
    const h4 = this.heightMap[x2 + z2 * resolution];

    const i1 = h1 * (1 - fx) + h2 * fx;
    const i2 = h3 * (1 - fx) + h4 * fx;

    return i1 * (1 - fz) + i2 * fz;
  }

  public getBiomeAt(worldX: number, worldZ: number): BiomeData {
    const { resolution, width, depth } = this.config;
    const x = Math.floor((worldX / width + 0.5) * resolution);
    const z = Math.floor((worldZ / depth + 0.5) * resolution);

    // if (x < 0 || z < 0 || x >= resolution || z >= resolution) {
    //   return {
    //     type: "water",
    //     elevation: 0,
    //     moisture: 0,
    //     color: [0.2, 0.4, 0.8],
    //   };
    // }

    return this.biomeMap[x + z * resolution];
  }

  public getBiomeAtGrid(gridX: number, gridZ: number): BiomeData {
    const { resolution, width, depth } = this.config;

    return this.biomeMap[gridX + gridZ * resolution];
  }

  public getHeightMap(): Float32Array {
    return this.heightMap;
  }

  public getBiomeMap(): BiomeData[] {
    return this.biomeMap;
  }

  public getMoistureMap(): Float32Array {
    return this.moistureMap;
  }

  public getConfig(): TerrainConfig {
    return this.config;
  }
}

export const defaultTerrainConfig: TerrainConfig = {
  width: 200,
  depth: 200,
  height: 100,
  resolution: 16,
  seed: Math.random() * 1000,
  octaves: 6,
  persistence: 0.5,
  lacunarity: 2.0,
};
