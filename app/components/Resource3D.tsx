'use client';

import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh } from 'three';
import type { WorldResource } from '../lib/game-manager';

interface Resource3DProps {
  resource: WorldResource;
  onClick?: (resource: WorldResource) => void;
}

export function Resource3D({ resource, onClick }: Resource3DProps) {
  const meshRef = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);

  // Gentle floating animation for resources
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = resource.position.y + Math.sin(state.clock.elapsedTime * 2) * 0.1;
    }
  });

  // Resource visual properties based on category and rarity
  const getResourceAppearance = () => {
    const rarityColors = {
      common: 0.8,
      uncommon: 0.9,
      rare: 1.0,
      epic: 1.1,
      legendary: 1.2
    };

    const categoryBase = (() => {
      switch (resource.category) {
        case 'minerals_stones':
          return {
            color: '#64748b', // Gray base
            size: 0.6,
            shape: 'box' as const,
            metalness: 0.7
          };
        case 'organic_materials':
          return {
            color: '#92400e', // Brown base
            size: 0.7,
            shape: 'box' as const,
            metalness: 0.1
          };
        case 'edible_plants':
          return {
            color: '#16a34a', // Green base
            size: 0.4,
            shape: 'sphere' as const,
            metalness: 0.0
          };
        case 'medicinal_herbs':
          return {
            color: '#7c3aed', // Purple base
            size: 0.3,
            shape: 'sphere' as const,
            metalness: 0.0
          };
        case 'spices_seasonings':
          return {
            color: '#ea580c', // Orange base
            size: 0.25,
            shape: 'sphere' as const,
            metalness: 0.0
          };
        case 'rare_elements':
          return {
            color: '#fbbf24', // Gold base
            size: 0.5,
            shape: 'sphere' as const,
            metalness: 0.9
          };
        default:
          return {
            color: '#6b7280',
            size: 0.5,
            shape: 'sphere' as const,
            metalness: 0.1
          };
      }
    })();

    // Adjust color intensity based on rarity
    const intensity = rarityColors[resource.rarity];
    
    return {
      ...categoryBase,
      size: categoryBase.size * intensity,
      metalness: categoryBase.metalness * (resource.rarity === 'legendary' ? 1.2 : 1.0)
    };
  };

  const appearance = getResourceAppearance();
  const opacity = resource.quantity > 0 ? 0.8 : 0.3;
  const scale = hovered ? 1.1 : 1.0;

  // Get geometry based on shape
  const getGeometry = () => {
    switch (appearance.shape as 'sphere' | 'box' | 'cylinder') {
      case 'cylinder':
        return <cylinderGeometry args={[appearance.size * 0.5, appearance.size * 0.5, appearance.size * 0.8, 8]} />;
      case 'box':
        return <boxGeometry args={[appearance.size, appearance.size * 0.6, appearance.size]} />;
      case 'sphere':
      default:
        return <sphereGeometry args={[appearance.size, 12, 8]} />;
    }
  };

  return (
    <group
      position={[resource.position.x, resource.position.y, resource.position.z]}
      onClick={() => onClick?.(resource)}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <mesh
        ref={meshRef}
        scale={[scale, scale, scale]}
      >
        {getGeometry()}
        <meshStandardMaterial
          color={appearance.color}
          transparent
          opacity={opacity}
          roughness={0.3}
          metalness={appearance.metalness}
        />
      </mesh>

      {/* Resource quantity indicator */}
      {resource.quantity > 0 && (
        <mesh position={[0, appearance.size + 0.3, 0]}>
          <sphereGeometry args={[0.1, 8, 6]} />
          <meshStandardMaterial
            color="#ffffff"
            transparent
            opacity={0.9}
          />
        </mesh>
      )}

      {/* Harvestable indicator */}
      {resource.harvestable && resource.quantity > 0 && (
        <mesh position={[0, appearance.size + 0.1, 0]} rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[0.2, 0.02, 0.02]} />
          <meshStandardMaterial color="#fbbf24" />
        </mesh>
      )}

      {/* Special trait indicators */}
      {resource.traits?.magical && resource.traits.magical > 70 && (
        <pointLight position={[0, 0, 0]} color="#a855f7" intensity={0.3} distance={3} />
      )}
      
      {resource.traits?.beautiful && resource.traits.beautiful > 80 && (
        <mesh position={[0, appearance.size + 0.4, 0]}>
          <sphereGeometry args={[0.05, 8, 6]} />
          <meshStandardMaterial
            color="#fbbf24"
            transparent
            opacity={0.7}
            emissive="#fbbf24"
            emissiveIntensity={0.2}
          />
        </mesh>
      )}
      
      {resource.traits?.ancient && resource.traits.ancient > 85 && (
        <mesh position={[0, appearance.size + 0.2, 0]} rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[0.15, 0.02, 0.02]} />
          <meshStandardMaterial color="#8b5a3c" emissive="#8b5a3c" emissiveIntensity={0.2} />
        </mesh>
      )}
    </group>
  );
}