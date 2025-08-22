"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { TerritoryInfo } from "../types/nation";

interface Territory3DProps {
  territory: TerritoryInfo;
}

export default function Territory3D({ territory }: Territory3DProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      // Gentle pulsing animation
      const pulse = 0.95 + Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
      meshRef.current.scale.setScalar(pulse);
      
      // Subtle opacity animation
      const material = meshRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = territory.opacity + Math.sin(state.clock.elapsedTime * 0.3) * 0.05;
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={[territory.center.x, territory.center.y + 0.5, territory.center.z]}
    >
      <sphereGeometry args={[territory.radius, 32, 16]} />
      <meshBasicMaterial
        color={territory.color}
        transparent
        opacity={territory.opacity}
        wireframe={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}