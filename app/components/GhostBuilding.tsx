"use client";

import { useRef, useState, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { BuildingType } from "../types/building";

interface GhostBuildingProps {
  buildingType: BuildingType;
  isValidPlacement: boolean;
  onPositionChange: (position: THREE.Vector3) => void;
}

export default function GhostBuilding({ 
  buildingType, 
  isValidPlacement,
  onPositionChange 
}: GhostBuildingProps) {
  const meshRef = useRef<THREE.Group>(null);
  const { camera, gl, scene } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2());
  const [position, setPosition] = useState(new THREE.Vector3(0, 0, 0));

  // Get building dimensions based on type
  const getDimensions = (type: BuildingType) => {
    switch (type) {
      case "home": return { width: 4, height: 3, depth: 4 };
      case "factory": return { width: 8, height: 5, depth: 8 };
      case "settlement": return { width: 6, height: 4, depth: 6 };
      case "trading_post": return { width: 6, height: 4, depth: 6 };
      case "hospital": return { width: 5, height: 3, depth: 5 };
      default: return { width: 4, height: 3, depth: 4 };
    }
  };

  const dimensions = getDimensions(buildingType);

  // Track mouse movement and update ghost building position
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const rect = gl.domElement.getBoundingClientRect();
      mouse.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.current.setFromCamera(mouse.current, camera);

      // Raycast against all objects in the scene to find terrain intersection
      const intersects = raycaster.current.intersectObjects(scene.children, true);
      
      // Find the terrain mesh (should be one of the first intersections)
      const terrainIntersection = intersects.find(intersect => {
        // The terrain mesh should have a specific name or be identifiable
        // For now, we'll use the first intersection as it's likely the terrain
        return intersect.object.type === 'Mesh' && intersect.point;
      });

      if (terrainIntersection) {
        const intersectionPoint = terrainIntersection.point;
        setPosition(intersectionPoint);
        onPositionChange(intersectionPoint);
      } else {
        // Fallback to ground plane if no terrain intersection found
        const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0.5);
        const intersection = new THREE.Vector3();
        if (raycaster.current.ray.intersectPlane(groundPlane, intersection)) {
          setPosition(intersection);
          onPositionChange(intersection);
        }
      }
    };

    gl.domElement.addEventListener('mousemove', handleMouseMove);
    return () => gl.domElement.removeEventListener('mousemove', handleMouseMove);
  }, [camera, gl.domElement, scene, onPositionChange]);

  // Update mesh position when position state changes
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.set(position.x, position.y, position.z);
    }
  });

  // Color based on placement validity
  const color = isValidPlacement ? '#00ff0040' : '#ff004040';
  const outlineColor = isValidPlacement ? '#00ff00' : '#ff0000';

  return (
    <group ref={meshRef}>
      {/* Main building structure */}
      <mesh position={[0, dimensions.height / 2, 0]}>
        <boxGeometry args={[dimensions.width, dimensions.height, dimensions.depth]} />
        <meshStandardMaterial 
          color={color}
          transparent 
          opacity={0.5} 
          wireframe={false}
        />
      </mesh>

      {/* Wireframe outline */}
      <mesh position={[0, dimensions.height / 2, 0]}>
        <boxGeometry args={[dimensions.width, dimensions.height, dimensions.depth]} />
        <meshBasicMaterial 
          color={outlineColor}
          wireframe 
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* Ground indicator circle */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
        <circleGeometry args={[Math.max(dimensions.width, dimensions.depth) / 2 + 1, 32]} />
        <meshBasicMaterial 
          color={outlineColor}
          transparent 
          opacity={0.3}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Type-specific decorations (simplified) */}
      {buildingType === "home" && (
        <mesh position={[0, dimensions.height + 0.5, 0]}>
          <coneGeometry args={[dimensions.width / 2, 1, 4]} />
          <meshStandardMaterial color={color} transparent opacity={0.5} />
        </mesh>
      )}

      {buildingType === "factory" && (
        <>
          <mesh position={[-dimensions.width / 4, dimensions.height + 1, 0]}>
            <cylinderGeometry args={[0.5, 0.5, 2]} />
            <meshStandardMaterial color={color} transparent opacity={0.5} />
          </mesh>
          <mesh position={[dimensions.width / 4, dimensions.height + 1, 0]}>
            <cylinderGeometry args={[0.5, 0.5, 2]} />
            <meshStandardMaterial color={color} transparent opacity={0.5} />
          </mesh>
        </>
      )}

      {buildingType === "hospital" && (
        <mesh position={[0, dimensions.height + 0.5, 0]}>
          <boxGeometry args={[0.5, 1, 0.1]} />
          <meshStandardMaterial color={outlineColor} transparent opacity={0.8} />
        </mesh>
      )}
    </group>
  );
}