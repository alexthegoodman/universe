"use client";

import { useRef, useMemo } from "react";
import * as THREE from "three";
import {
  TerrainGenerator,
  defaultTerrainConfig,
} from "../lib/terrain-generator";
import { GameManager } from "../lib/game-manager";

interface TerrainMeshProps {
  // terrainGenerator: TerrainGenerator;
  gameManager: GameManager;
  onClick?: (position: THREE.Vector3) => void;
}

export function TerrainMesh({ gameManager, onClick }: TerrainMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  const { geometry, material } = useMemo(() => {
    const terrainGenerator = gameManager.terrainGenerator;
    const config = terrainGenerator.getConfig();
    const heightMap = terrainGenerator.getHeightMap();
    const biomeMap = terrainGenerator.getBiomeMap();

    console.log("Terrain config:", config);
    console.log("HeightMap length:", heightMap.length);
    console.log("HeightMap sample:", Array.from(heightMap.slice(0, 10)));
    console.log(
      "HeightMap range:",
      Math.min(...heightMap),
      "to",
      Math.max(...heightMap)
    );

    // Use full resolution to match heightmap data
    const segments = config.resolution - 1; // Match generator resolution

    // Create plane geometry with full resolution
    const geometry = new THREE.PlaneGeometry(
      config.width,
      config.depth,
      segments,
      segments
    );

    const vertices = geometry.attributes.position.array as Float32Array;
    const colors = new Float32Array(vertices.length);

    console.log("Vertices count:", vertices.length / 3);
    console.log("Grid size:", segments + 1, "x", segments + 1);

    // Apply heightmap to vertices with correct PlaneGeometry vertex ordering
    for (let i = 0; i < vertices.length; i += 3) {
      const vertexIndex = i / 3;

      // PlaneGeometry vertices are ordered differently than our heightmap
      // PlaneGeometry: starts bottom-left, goes right then up
      // Our heightmap: x (left-right), z (front-back)
      const gridWidth = segments + 1;
      const gridY = Math.floor(vertexIndex / gridWidth); // This is actually Z in world space
      const gridX = vertexIndex % gridWidth;

      // Clamp to valid heightmap bounds
      const hmX = Math.min(gridX, config.resolution - 1);
      const hmZ = Math.min(gridY, config.resolution - 1);
      const heightIndex = hmX + hmZ * config.resolution;

      if (heightIndex >= 0 && heightIndex < heightMap.length) {
        const height = heightMap[heightIndex];
        // vertices[i + 1] = height; // Y coordinate
        vertices[i + 2] = height; // Y coordinate

        // Get biome color using getBiomeAtGrid
        const biome = terrainGenerator.getBiomeAtGrid(hmX, hmZ);
        colors[i] = biome.color[0];
        colors[i + 1] = biome.color[1];
        colors[i + 2] = biome.color[2];
      } else {
        // Fallback color
        colors[i] = 1.0;
        colors[i + 1] = 0.0;
        colors[i + 2] = 0.0;
      }
    }

    // Update geometry
    geometry.attributes.position.needsUpdate = true;
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();

    const material = new THREE.MeshLambertMaterial({
      vertexColors: true,
      wireframe: false,
      side: THREE.DoubleSide,
    });

    return { geometry, material };
  }, [gameManager]);

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      // rotation={[0, 0, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0, 0]}
      receiveShadow
      onClick={
        onClick
          ? (event) => {
              event.stopPropagation();
              const position = new THREE.Vector3(
                event.point.x,
                event.point.y,
                event.point.z
              );
              onClick(position);
            }
          : undefined
      }
    />
  );
}

export function useTerrainGenerator() {
  return useMemo(() => {
    return new TerrainGenerator(defaultTerrainConfig);
  }, []);
}
