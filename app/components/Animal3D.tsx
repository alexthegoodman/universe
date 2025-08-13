'use client'

import { useRef, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Animal } from '../types/animal'
import * as THREE from 'three'

interface Animal3DProps {
  animal: Animal
  onClick?: (animal: Animal) => void
}

export default function Animal3D({ animal, onClick }: Animal3DProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const groupRef = useRef<THREE.Group>(null)
  const [hovered, setHovered] = useState(false)
  const [actionStartTime, setActionStartTime] = useState<number>(0)
  const [targetPosition, setTargetPosition] = useState<THREE.Vector3 | null>(null)
  const [currentPosition, setCurrentPosition] = useState(new THREE.Vector3(animal.position.x, 0, animal.position.z))
  const [previousPosition, setPreviousPosition] = useState(new THREE.Vector3(animal.position.x, 0, animal.position.z))
  
  // Update target position when animal's logical position changes
  useEffect(() => {
    const newLogicalPosition = new THREE.Vector3(animal.position.x, 0, animal.position.z)
    
    // Check if the animal has actually moved to a different position
    const distance = newLogicalPosition.distanceTo(previousPosition)
    
    if (distance > 0.1) { // Only animate if there's meaningful movement
      if (animal.currentAction === 'exploring' || animal.currentAction === 'moving') {
        setTargetPosition(newLogicalPosition.clone())
        setPreviousPosition(newLogicalPosition.clone())
      } else {
        // For non-movement actions, snap to position immediately
        setCurrentPosition(newLogicalPosition.clone())
        setPreviousPosition(newLogicalPosition.clone())
        setTargetPosition(null)
      }
    } else if (animal.currentAction !== 'exploring' && animal.currentAction !== 'moving') {
      // Not moving and no position change - clear target
      setTargetPosition(null)
    }
    
    setActionStartTime(Date.now())
  }, [animal.currentAction, animal.position.x, animal.position.z])
  
  // Animation frame with action-specific behaviors
  useFrame((state) => {
    if (!meshRef.current || !groupRef.current) return
    
    const elapsed = (Date.now() - actionStartTime) / 1000
    const baseScale = animal.dna.size * getLifeStageSize()
    
    // Move towards target position if exploring/moving
    if (targetPosition && (animal.currentAction === 'exploring' || animal.currentAction === 'moving')) {
      const speed = (animal.dna.agility / 100) * 0.8 + 0.2 // Speed between 0.2 and 1.0
      const distance = currentPosition.distanceTo(targetPosition)
      
      if (distance > 0.1) {
        // Smooth movement towards target
        currentPosition.lerp(targetPosition, speed * 0.03)
        
        // Look at movement direction
        const direction = new THREE.Vector3().subVectors(targetPosition, currentPosition).normalize()
        if (direction.length() > 0) {
          groupRef.current.lookAt(currentPosition.x + direction.x, 0, currentPosition.z + direction.z)
        }
        
        // Subtle walking animation - reduced vertical movement
        const walkIntensity = animal.currentAction === 'exploring' ? 0.08 : 0.05
        meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 6) * walkIntensity + 0.3
        
        // Slight scale variation while walking
        const walkScale = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.03
        meshRef.current.scale.setScalar(walkScale * baseScale)
      } else {
        // Reached target - switch to idle animation
        setTargetPosition(null)
        meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 1.5) * 0.1
      }
    } else {
      // Action-specific animations
      switch (animal.currentAction) {
        case 'sleeping':
          // Slow, deep breathing
          const sleepScale = 1 + Math.sin(state.clock.elapsedTime * 0.8) * 0.15
          meshRef.current.scale.setScalar(sleepScale * baseScale)
          meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.05
          break
          
        case 'eating':
          // Quick bobbing motion
          const eatBob = Math.sin(state.clock.elapsedTime * 6) * 0.3
          meshRef.current.position.y = Math.max(0, eatBob) + 0.2
          meshRef.current.scale.setScalar(baseScale)
          break
          
        case 'drinking':
          // Gentle downward motion
          const drinkMotion = Math.sin(state.clock.elapsedTime * 3) * 0.2
          meshRef.current.position.y = -Math.abs(drinkMotion) + 0.1
          break
          
        case 'playing':
          // Bouncy, energetic movement
          const playBounce = Math.abs(Math.sin(state.clock.elapsedTime * 5)) * 0.8
          meshRef.current.position.y = playBounce
          const playScale = 1 + Math.sin(state.clock.elapsedTime * 6) * 0.12
          meshRef.current.scale.setScalar(playScale * baseScale)
          break
          
        case 'working':
          // Steady, rhythmic motion
          const workMotion = Math.sin(state.clock.elapsedTime * 2) * 0.1
          meshRef.current.position.y = workMotion + 0.3
          meshRef.current.scale.setScalar(baseScale * 1.1)
          break
          
        case 'socializing':
          // Swaying motion
          const socialSway = Math.sin(state.clock.elapsedTime * 1.5) * 0.3
          meshRef.current.rotation.z = socialSway * 0.2
          meshRef.current.position.y = Math.abs(Math.sin(state.clock.elapsedTime * 2)) * 0.2
          break
          
        case 'mating':
          // Heart-like pulsing
          const mateScale = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.2
          meshRef.current.scale.setScalar(mateScale * baseScale)
          meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 3) * 0.3
          break
          
        default: // idle
          // Gentle breathing
          const idleScale = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.05
          meshRef.current.scale.setScalar(idleScale * baseScale)
          meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 1.5) * 0.1
      }
    }
    
    // Update group position
    if (groupRef.current) {
      groupRef.current.position.copy(currentPosition)
    }
  })
  
  // Health-based color intensity
  const getHealthColor = () => {
    const health = animal.stats.health / 100
    if (health > 0.7) return '#4ade80' // Green
    if (health > 0.4) return '#fbbf24' // Yellow
    if (health > 0.2) return '#fb923c' // Orange
    return '#ef4444' // Red
  }
  
  const getLifeStageSize = () => {
    if (animal.age < 0.15) return 0.6 // Baby
    if (animal.age < 0.35) return 0.8 // Young
    if (animal.age < 0.75) return 1.0 // Adult
    return 0.9 // Elder
  }
  
  return (
    <group 
      ref={groupRef}
      onClick={() => onClick?.(animal)}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <mesh ref={meshRef}>
        {/* Body */}
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial 
          color={hovered ? getHealthColor() : animal.dna.color.primary}
          emissive={hovered ? '#333' : '#000'}
          roughness={0.7}
          metalness={0.1}
          opacity={animal.currentAction === 'sleeping' ? 0.8 : 1}
          transparent={animal.currentAction === 'sleeping'}
        />
        
        {/* Eyes */}
        <mesh position={[0.5, 0.3, 0.5]}>
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshStandardMaterial 
            color={animal.currentAction === 'sleeping' ? '#666' : '#000'} 
          />
        </mesh>
        <mesh position={[-0.5, 0.3, 0.5]}>
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshStandardMaterial 
            color={animal.currentAction === 'sleeping' ? '#666' : '#000'} 
          />
        </mesh>
        
        {/* Secondary color markings */}
        <mesh position={[0, 0.8, 0]} scale={[0.8, 0.3, 0.8]}>
          <sphereGeometry args={[1, 12, 12]} />
          <meshStandardMaterial 
            color={animal.dna.color.secondary}
            transparent
            opacity={animal.currentAction === 'sleeping' ? 0.5 : 0.7}
          />
        </mesh>
        
        {/* Action-specific visual elements */}
        {animal.currentAction === 'eating' && (
          <mesh position={[0, -0.8, 0.8]}>
            <sphereGeometry args={[0.3, 8, 8]} />
            <meshStandardMaterial color="#10b981" />
          </mesh>
        )}
        
        {animal.currentAction === 'drinking' && (
          <mesh position={[0, -0.5, 0.8]}>
            <cylinderGeometry args={[0.1, 0.1, 0.6]} />
            <meshStandardMaterial color="#3b82f6" transparent opacity={0.6} />
          </mesh>
        )}
        
        {animal.currentAction === 'mating' && (
          <>
            <mesh position={[0.5, 1.5, 0]}>
              <sphereGeometry args={[0.15, 8, 8]} />
              <meshBasicMaterial color="#ec4899" />
            </mesh>
            <mesh position={[-0.5, 1.8, 0]}>
              <sphereGeometry args={[0.12, 8, 8]} />
              <meshBasicMaterial color="#ec4899" />
            </mesh>
          </>
        )}
      </mesh>
      
      {/* Status indicator (floating above) */}
      {animal.currentAction !== 'idle' && (
        <mesh position={[0, 2.5, 0]}>
          <sphereGeometry args={[0.2, 8, 8]} />
          <meshBasicMaterial 
            color={
              animal.currentAction === 'sleeping' ? '#8b5cf6' :
              animal.currentAction === 'eating' ? '#10b981' :
              animal.currentAction === 'drinking' ? '#3b82f6' :
              animal.currentAction === 'playing' ? '#f59e0b' :
              animal.currentAction === 'exploring' ? '#06b6d4' :
              animal.currentAction === 'socializing' ? '#8b5cf6' :
              animal.currentAction === 'working' ? '#f97316' :
              animal.currentAction === 'mating' ? '#ec4899' :
              '#6b7280'
            }
          />
        </mesh>
      )}
      
      {/* Movement trail when exploring */}
      {animal.currentAction === 'exploring' && (
        <mesh position={[0, 0.1, 0]}>
          <ringGeometry args={[1, 1.2, 8]} />
          <meshBasicMaterial color="#06b6d4" transparent opacity={0.3} />
        </mesh>
      )}
      
      {/* Health indicator */}
      {(hovered || animal.stats.health < 30) && (
        <mesh position={[0, 3.2, 0]}>
          <boxGeometry args={[1, 0.1, 0.1]} />
          <meshBasicMaterial color={getHealthColor()} />
        </mesh>
      )}
    </group>
  )
}