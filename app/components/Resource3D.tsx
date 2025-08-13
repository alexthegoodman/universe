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

  // Resource visual properties based on type
  const getResourceAppearance = () => {
    switch (resource.type) {
      case 'food':
        return {
          color: '#4ade80', // Green
          size: 0.4,
          shape: 'sphere'
        };
      case 'water':
        return {
          color: '#3b82f6', // Blue
          size: 0.6,
          shape: 'cylinder'
        };
      case 'berries':
        return {
          color: '#dc2626', // Red
          size: 0.3,
          shape: 'sphere'
        };
      case 'wood':
        return {
          color: '#92400e', // Brown
          size: 0.8,
          shape: 'box'
        };
      case 'stone':
        return {
          color: '#64748b', // Gray
          size: 0.5,
          shape: 'box'
        };
      case 'shelter':
        return {
          color: '#fbbf24', // Yellow
          size: 1.0,
          shape: 'box'
        };
      default:
        return {
          color: '#6b7280',
          size: 0.5,
          shape: 'sphere'
        };
    }
  };

  const appearance = getResourceAppearance();
  const opacity = resource.quantity > 0 ? 0.8 : 0.3;
  const scale = hovered ? 1.1 : 1.0;

  // Get geometry based on shape
  const getGeometry = () => {
    switch (appearance.shape) {
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
          metalness={resource.type === 'stone' ? 0.6 : 0.1}
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
    </group>
  );
}