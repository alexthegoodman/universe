'use client'

import { useRef } from 'react'
import type { Building } from '../types/building'
import * as THREE from 'three'

interface Building3DProps {
  building: Building
  onClick?: (building: Building) => void
}

export default function Building3D({ building, onClick }: Building3DProps) {
  const meshRef = useRef<THREE.Mesh>(null)

  // Color based on building materials and stats
  const getColor = () => {
    const { stone, wood } = building.materials
    const stoneRatio = stone / (stone + wood)
    
    // More stone = more gray, more wood = more brown
    const baseR = 0.4 + stoneRatio * 0.3 + (building.stats.beauty / 100) * 0.2
    const baseG = 0.3 + (wood / (stone + wood)) * 0.4 + (building.stats.beauty / 100) * 0.15
    const baseB = 0.2 + (building.stats.beauty / 100) * 0.3
    
    return new THREE.Color(baseR, baseG, baseB)
  }

  // Calculate opacity based on durability
  const opacity = Math.max(0.7, building.stats.durability / 100)

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
        <boxGeometry args={[
          building.dimensions.width,
          building.dimensions.height,
          building.dimensions.depth
        ]} />
        <meshLambertMaterial
          color={getColor()}
          transparent
          opacity={opacity}
        />
      </mesh>

      {/* Roof */}
      <mesh position={[0, building.dimensions.height + 0.3, 0]}>
        <coneGeometry args={[
          Math.max(building.dimensions.width, building.dimensions.depth) * 0.7,
          0.8,
          4
        ]} />
        <meshLambertMaterial color={new THREE.Color(0.6, 0.3, 0.2)} />
      </mesh>

      {/* Door */}
      <mesh position={[
        building.dimensions.width / 2 - 0.1,
        building.dimensions.height * 0.3,
        0
      ]}>
        <boxGeometry args={[0.2, building.dimensions.height * 0.6, 0.8]} />
        <meshLambertMaterial color={new THREE.Color(0.4, 0.2, 0.1)} />
      </mesh>

      {/* Windows (if building is beautiful enough) */}
      {building.stats.beauty > 40 && (
        <>
          <mesh position={[
            building.dimensions.width / 2 - 0.05,
            building.dimensions.height * 0.7,
            building.dimensions.depth * 0.3
          ]}>
            <boxGeometry args={[0.1, 0.6, 0.6]} />
            <meshLambertMaterial
              color={new THREE.Color(0.7, 0.9, 1.0)}
              transparent
              opacity={0.6}
            />
          </mesh>
          <mesh position={[
            building.dimensions.width / 2 - 0.05,
            building.dimensions.height * 0.7,
            -building.dimensions.depth * 0.3
          ]}>
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
          <sphereGeometry args={[
            Math.max(building.dimensions.width, building.dimensions.depth) * 0.6,
            8,
            6
          ]} />
          <meshBasicMaterial
            color={new THREE.Color(1.0, 0.8, 0.3)}
            transparent
            opacity={0.2}
          />
        </mesh>
      )}
      
      {/* Capacity indicator - small spheres for max occupants */}
      {Array.from({ length: building.maxOccupants }, (_, i) => (
        <mesh key={i} position={[
          (i - building.maxOccupants / 2 + 0.5) * 0.8,
          -0.3,
          building.dimensions.depth / 2 + 0.5
        ]}>
          <sphereGeometry args={[0.15]} />
          <meshBasicMaterial
            color={i < building.currentOccupants.length
              ? new THREE.Color(0.2, 0.8, 0.2)  // Green for occupied
              : new THREE.Color(0.5, 0.5, 0.5)  // Gray for empty
            }
          />
        </mesh>
      ))}
    </group>
  )
}