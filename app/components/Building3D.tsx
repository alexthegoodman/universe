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
    <group
      position={[building.position.x, building.position.y, building.position.z]}
    >
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
          side={THREE.DoubleSide}
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

      {/* Workshop - tools and workbench */}
      {building.features?.includes("workshop") && (
        <group position={[-building.dimensions.width / 2 + 0.5, 0, 0]}>
          {/* Workbench */}
          <mesh position={[0, building.dimensions.height * 0.25, 0]}>
            <boxGeometry args={[1, 0.5, 0.8]} />
            <meshLambertMaterial color={new THREE.Color(0.4, 0.3, 0.2)} />
          </mesh>
          {/* Anvil */}
          <mesh position={[0, building.dimensions.height * 0.35, 0]}>
            <boxGeometry args={[0.4, 0.2, 0.3]} />
            <meshLambertMaterial color={new THREE.Color(0.3, 0.3, 0.3)} />
          </mesh>
          {/* Tool rack */}
          <mesh position={[0, building.dimensions.height * 0.6, -0.4]}>
            <boxGeometry args={[0.8, 0.1, 0.1]} />
            <meshLambertMaterial color={getPartColor(3)} />
          </mesh>
        </group>
      )}

      {/* Garden - plants and greenery */}
      {building.features?.includes("garden") && (
        <group position={[0, 0, building.dimensions.depth / 2 + 1]}>
          {/* Garden bed */}
          <mesh position={[0, 0.1, 0]}>
            <boxGeometry args={[building.dimensions.width * 0.8, 0.2, 1.5]} />
            <meshLambertMaterial color={new THREE.Color(0.3, 0.2, 0.1)} />
          </mesh>
          {/* Plants */}
          {Array.from({ length: 6 }, (_, i) => (
            <mesh key={i} position={[(i - 2.5) * 0.5, 0.3, Math.sin(i) * 0.3]}>
              <coneGeometry args={[0.15, 0.4, 6]} />
              <meshLambertMaterial color={new THREE.Color(0.2, 0.6, 0.2)} />
            </mesh>
          ))}
          {/* Flowers */}
          {Array.from({ length: 4 }, (_, i) => (
            <mesh key={i} position={[(i - 1.5) * 0.7, 0.35, 0.5]}>
              <sphereGeometry args={[0.08, 6, 4]} />
              <meshLambertMaterial color={new THREE.Color(0.8, 0.3, 0.6)} />
            </mesh>
          ))}
        </group>
      )}

      {/* Building Type-Specific Features */}

      {/* Home - Welcome Mat and Cozy Elements */}
      {building.type === "home" && (
        <>
          {/* Welcome mat */}
          <mesh position={[building.dimensions.width / 2 + 0.3, 0.05, 0]}>
            <boxGeometry args={[0.6, 0.1, 1.2]} />
            <meshLambertMaterial color={new THREE.Color(0.6, 0.3, 0.1)} />
          </mesh>
          {/* Chimney */}
          <mesh
            position={[
              building.dimensions.width * 0.3,
              building.dimensions.height + 0.8,
              building.dimensions.depth * 0.3,
            ]}
          >
            <boxGeometry args={[0.4, 1.2, 0.4]} />
            <meshLambertMaterial color={new THREE.Color(0.4, 0.2, 0.1)} />
          </mesh>
          {/* Home marker - small heart above */}
          <mesh position={[0, building.dimensions.height + 1.5, 0]}>
            <sphereGeometry args={[0.2, 8, 6]} />
            <meshBasicMaterial color={new THREE.Color(1.0, 0.2, 0.2)} />
          </mesh>
        </>
      )}

      {/* Trading Post - Market Stall and Signs */}
      {building.type === "trading_post" && (
        <>
          {/* Market stalls outside */}
          {Array.from({ length: 3 }, (_, i) => (
            <group
              key={i}
              position={[(i - 1) * 2, 0, building.dimensions.depth / 2 + 1.5]}
            >
              {/* Stall roof */}
              <mesh position={[0, 1.5, 0]}>
                <boxGeometry args={[1.5, 0.1, 1.2]} />
                <meshLambertMaterial color={new THREE.Color(0.8, 0.6, 0.2)} />
              </mesh>
              {/* Stall posts */}
              <mesh position={[-0.6, 0.75, -0.4]}>
                <boxGeometry args={[0.1, 1.5, 0.1]} />
                <meshLambertMaterial color={new THREE.Color(0.4, 0.3, 0.2)} />
              </mesh>
              <mesh position={[0.6, 0.75, -0.4]}>
                <boxGeometry args={[0.1, 1.5, 0.1]} />
                <meshLambertMaterial color={new THREE.Color(0.4, 0.3, 0.2)} />
              </mesh>
            </group>
          ))}
          {/* Trade symbol - $ sign above building */}
          <mesh position={[0, building.dimensions.height + 1.8, 0]}>
            <boxGeometry args={[0.4, 1.0, 0.1]} />
            <meshBasicMaterial color={new THREE.Color(0.9, 0.8, 0.2)} />
          </mesh>
        </>
      )}

      {/* Hospital - Medical Cross and Clean Appearance */}
      {building.type === "hospital" && (
        <>
          {/* Red cross on front */}
          <mesh
            position={[
              building.dimensions.width / 2 - 0.05,
              building.dimensions.height * 0.7,
              0,
            ]}
          >
            <boxGeometry args={[0.1, 0.8, 0.2]} />
            <meshBasicMaterial color={new THREE.Color(1.0, 0.2, 0.2)} />
          </mesh>
          <mesh
            position={[
              building.dimensions.width / 2 - 0.05,
              building.dimensions.height * 0.7,
              0,
            ]}
          >
            <boxGeometry args={[0.1, 0.2, 0.8]} />
            <meshBasicMaterial color={new THREE.Color(1.0, 0.2, 0.2)} />
          </mesh>
          {/* Clean white exterior accent */}
          <mesh position={[0, building.dimensions.height / 2, 0]}>
            <boxGeometry
              args={[
                building.dimensions.width * 1.05,
                building.dimensions.height * 1.05,
                building.dimensions.depth * 1.05,
              ]}
            />
            <meshLambertMaterial
              color={new THREE.Color(0.95, 0.95, 0.95)}
              transparent
              opacity={0.3}
            />
          </mesh>
          {/* Emergency beacon light */}
          <mesh position={[0, building.dimensions.height + 1.2, 0]}>
            <cylinderGeometry args={[0.3, 0.3, 0.2, 8]} />
            <meshBasicMaterial color={new THREE.Color(0.2, 0.8, 1.0)} />
          </mesh>
        </>
      )}

      {/* Factory - Smokestacks and Industrial Elements */}
      {building.type === "factory" && (
        <>
          {/* Smokestacks */}
          {Array.from({ length: 2 }, (_, i) => (
            <mesh
              key={i}
              position={[
                (i - 0.5) * building.dimensions.width * 0.4,
                building.dimensions.height + 1.5,
                building.dimensions.depth * 0.3,
              ]}
            >
              <cylinderGeometry args={[0.3, 0.4, 3, 8]} />
              <meshLambertMaterial color={new THREE.Color(0.3, 0.3, 0.3)} />
            </mesh>
          ))}
          {/* Smoke particles */}
          {Array.from({ length: 4 }, (_, i) => (
            <mesh
              key={i}
              position={[
                0,
                building.dimensions.height + 3 + i * 0.3,
                building.dimensions.depth * 0.3,
              ]}
            >
              <sphereGeometry args={[0.15 + i * 0.05, 6, 4]} />
              <meshBasicMaterial
                color={new THREE.Color(0.6, 0.6, 0.6)}
                transparent
                opacity={0.4 - i * 0.08}
              />
            </mesh>
          ))}
          {/* Industrial pipes */}
          <mesh
            position={[
              building.dimensions.width / 2,
              building.dimensions.height * 0.8,
              -building.dimensions.depth / 2,
            ]}
          >
            <cylinderGeometry args={[0.1, 0.1, building.dimensions.width, 8]} />
            <meshLambertMaterial color={new THREE.Color(0.5, 0.5, 0.6)} />
          </mesh>
          {/* Gear symbol */}
          <mesh position={[0, building.dimensions.height + 1.0, 0]}>
            <cylinderGeometry args={[0.4, 0.4, 0.1, 8]} />
            <meshBasicMaterial color={new THREE.Color(0.6, 0.4, 0.2)} />
          </mesh>
        </>
      )}

      {/* Generic buildings get a simple flag */}
      {/* {building.type === "generic" && (
        <mesh position={[0, building.dimensions.height + 1.0, 0]}>
          <boxGeometry args={[0.6, 0.4, 0.1]} />
          <meshBasicMaterial color={new THREE.Color(0.5, 0.7, 0.9)} />
        </mesh>
      )} */}

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
