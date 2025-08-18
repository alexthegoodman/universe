"use client";

import { useRef } from "react";
import type { Building } from "../types/building";
import * as THREE from "three";

interface Building3DProps {
  building: Building;
  onClick?: (building: Building) => void;
}

export default function Building3D({ building, onClick }: Building3DProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Get color for specific material type
  const getColorForMaterial = (materialName: string): THREE.Color => {
    // Metal ores - metallic colors
    if (materialName.includes("iron")) return new THREE.Color(0.4, 0.4, 0.5);
    if (materialName.includes("copper")) return new THREE.Color(0.7, 0.4, 0.2);
    if (materialName.includes("gold")) return new THREE.Color(0.8, 0.7, 0.3);
    if (materialName.includes("silver")) return new THREE.Color(0.7, 0.7, 0.8);
    if (materialName.includes("tin")) return new THREE.Color(0.6, 0.6, 0.7);

    // Precious stones - jewel tones
    if (materialName.includes("diamond")) return new THREE.Color(0.9, 0.9, 1.0);
    if (materialName.includes("emerald")) return new THREE.Color(0.2, 0.7, 0.3);
    if (materialName.includes("ruby")) return new THREE.Color(0.8, 0.2, 0.3);
    if (materialName.includes("amethyst"))
      return new THREE.Color(0.6, 0.3, 0.8);
    if (materialName.includes("quartz")) return new THREE.Color(0.8, 0.8, 0.9);

    // Stone types - earth tones
    if (materialName.includes("granite")) return new THREE.Color(0.5, 0.5, 0.6);
    if (materialName.includes("limestone"))
      return new THREE.Color(0.8, 0.8, 0.7);
    if (materialName.includes("marble")) return new THREE.Color(0.9, 0.9, 0.9);
    if (materialName.includes("slate")) return new THREE.Color(0.3, 0.3, 0.4);
    if (materialName.includes("sandstone"))
      return new THREE.Color(0.8, 0.7, 0.5);
    if (materialName.includes("obsidian"))
      return new THREE.Color(0.1, 0.1, 0.2);
    if (materialName.includes("stone")) return new THREE.Color(0.5, 0.5, 0.5);

    // Wood types - brown tones
    if (materialName.includes("oak")) return new THREE.Color(0.5, 0.3, 0.2);
    if (materialName.includes("pine")) return new THREE.Color(0.6, 0.4, 0.2);
    if (materialName.includes("cedar")) return new THREE.Color(0.7, 0.4, 0.3);
    if (materialName.includes("birch")) return new THREE.Color(0.8, 0.7, 0.5);
    if (materialName.includes("bamboo")) return new THREE.Color(0.6, 0.7, 0.3);
    if (materialName.includes("wood")) return new THREE.Color(0.4, 0.3, 0.2);

    // Organic materials
    if (materialName.includes("leather")) return new THREE.Color(0.4, 0.2, 0.1);
    if (materialName.includes("bone")) return new THREE.Color(0.9, 0.9, 0.8);
    if (materialName.includes("resin")) return new THREE.Color(0.7, 0.5, 0.2);
    if (materialName.includes("scale")) return new THREE.Color(0.3, 0.5, 0.3);

    // Default fallback
    return new THREE.Color(0.5, 0.4, 0.3);
  };

  // Get materials sorted by quantity (most abundant first)
  const getSortedMaterials = () => {
    return Object.entries(building.materials)
      .filter(([_, quantity]) => quantity > 0)
      .sort(([_, a], [__, b]) => b - a);
  };

  // Get color for specific building part based on material priority
  const getPartColor = (partIndex: number) => {
    const materials = getSortedMaterials();
    if (materials.length === 0) return new THREE.Color(0.5, 0.5, 0.5);

    // Use modulo to cycle through available materials
    const materialIndex = partIndex % materials.length;
    return getColorForMaterial(materials[materialIndex][0]);
  };

  // Calculate opacity based on durability
  // const opacity = Math.max(0.7, building.stats.durability / 100)
  const opacity = 0.7;

  return (
    <group position={[building.position.x, 0, building.position.z]}>
      {/* Main building structure */}
      <mesh
        ref={meshRef}
        position={[0, building.dimensions.height / 2, 0]}
        onClick={() => onClick?.(building)}
        castShadow
        receiveShadow
      >
        <boxGeometry
          args={[
            building.dimensions.width,
            building.dimensions.height,
            building.dimensions.depth,
          ]}
        />
        <meshLambertMaterial
          color={getPartColor(0)}
          transparent
          opacity={opacity}
        />
      </mesh>

      {/* Roof */}
      <mesh position={[0, building.dimensions.height + 0.3, 0]}>
        <coneGeometry
          args={[
            Math.max(building.dimensions.width, building.dimensions.depth) *
              0.7,
            0.8,
            4,
          ]}
        />
        <meshLambertMaterial color={getPartColor(1)} />
      </mesh>

      {/* Door */}
      <mesh
        position={[
          building.dimensions.width / 2 - 0.1,
          building.dimensions.height * 0.3,
          0,
        ]}
      >
        <boxGeometry args={[0.2, building.dimensions.height * 0.6, 0.8]} />
        <meshLambertMaterial color={getPartColor(2)} />
      </mesh>

      {/* Windows (if building is beautiful enough) */}
      {building.stats.beauty > 40 && (
        <>
          <mesh
            position={[
              building.dimensions.width / 2 - 0.05,
              building.dimensions.height * 0.7,
              building.dimensions.depth * 0.3,
            ]}
          >
            <boxGeometry args={[0.1, 0.6, 0.6]} />
            <meshLambertMaterial
              color={new THREE.Color(0.7, 0.9, 1.0)}
              transparent
              opacity={0.6}
            />
          </mesh>
          <mesh
            position={[
              building.dimensions.width / 2 - 0.05,
              building.dimensions.height * 0.7,
              -building.dimensions.depth * 0.3,
            ]}
          >
            <boxGeometry args={[0.1, 0.6, 0.6]} />
            <meshLambertMaterial
              color={new THREE.Color(0.7, 0.9, 1.0)}
              transparent
              opacity={0.6}
            />
          </mesh>
        </>
      )}

      {/* Building info label */}
      <mesh position={[0, building.dimensions.height + 1.5, 0]}>
        <planeGeometry args={[3, 0.8]} />
        <meshBasicMaterial
          color={new THREE.Color(0, 0, 0)}
          transparent
          opacity={0.7}
        />
      </mesh>

      {/* Occupancy indicator (glowing effect if occupied) */}
      {building.currentOccupants.length > 0 && (
        <mesh position={[0, building.dimensions.height / 2, 0]}>
          <sphereGeometry
            args={[
              Math.max(building.dimensions.width, building.dimensions.depth) *
                0.6,
              8,
              6,
            ]}
          />
          <meshBasicMaterial
            color={new THREE.Color(1.0, 0.8, 0.3)}
            transparent
            opacity={0.2}
          />
        </mesh>
      )}

      {/* Capacity indicator - small spheres for max occupants */}
      {Array.from({ length: building.maxOccupants }, (_, i) => (
        <mesh
          key={i}
          position={[
            (i - building.maxOccupants / 2 + 0.5) * 0.8,
            -0.3,
            building.dimensions.depth / 2 + 0.5,
          ]}
        >
          <sphereGeometry args={[0.15]} />
          <meshBasicMaterial
            color={
              i < building.currentOccupants.length
                ? new THREE.Color(0.2, 0.8, 0.2) // Green for occupied
                : new THREE.Color(0.5, 0.5, 0.5) // Gray for empty
            }
          />
        </mesh>
      ))}
    </group>
  );
}
