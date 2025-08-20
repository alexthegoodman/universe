"use client";

import { useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import type { Bandit } from "../lib/game-manager";
import * as THREE from "three";

interface Bandit3DProps {
  bandit: Bandit;
  onClick?: (bandit: Bandit) => void;
}

export default function Bandit3D({ bandit, onClick }: Bandit3DProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const eyeLeftRef = useRef<THREE.Mesh>(null);
  const eyeRightRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [aggroTime, setAggroTime] = useState<number>(0);

  // Update aggro state when bandit becomes aggressive
  useEffect(() => {
    setAggroTime(Date.now());
  }, [bandit.lastAttackTime]);

  // Animation frame with menacing behaviors
  useFrame((state) => {
    if (!meshRef.current || !groupRef.current) return;

    const elapsed = (Date.now() - aggroTime) / 1000;
    const baseScale = getBanditSize();

    // Aggressive stance - menacing idle animation
    const aggressionIntensity = bandit.aggression / 100;

    // Base breathing with aggression influence
    const breathingRate = 1.5 + aggressionIntensity * 2; // More aggressive = faster breathing
    const breathingScale =
      1 +
      Math.sin(state.clock.elapsedTime * breathingRate) *
        (0.08 + aggressionIntensity * 0.1);
    meshRef.current.scale.setScalar(breathingScale * baseScale);

    // Menacing sway/prowl motion
    const prowlMotion =
      Math.sin(state.clock.elapsedTime * 0.8) * 0.15 * aggressionIntensity;
    meshRef.current.position.y = Math.abs(prowlMotion) + 0.2;

    // Subtle rotation indicating restlessness
    const restlessRotation =
      Math.sin(state.clock.elapsedTime * 0.5) * 0.3 * aggressionIntensity;
    groupRef.current.rotation.y = restlessRotation;

    // Eye glow intensity based on aggression and recent attacks
    const timeSinceAttack = (Date.now() - bandit.lastAttackTime) / 1000;
    const recentAttack = timeSinceAttack < 10; // Recent attack in last 10 seconds
    const glowIntensity = recentAttack ? 1.0 : aggressionIntensity;

    // Pulsing red glow for eyes
    const eyeGlow =
      0.5 + Math.sin(state.clock.elapsedTime * 4) * 0.5 * glowIntensity;
    if (eyeLeftRef.current && eyeRightRef.current) {
      const eyeMaterial = eyeLeftRef.current
        .material as THREE.MeshStandardMaterial;
      const eyeMaterial2 = eyeRightRef.current
        .material as THREE.MeshStandardMaterial;
      eyeMaterial.emissive.setRGB(eyeGlow * 0.8, 0, 0);
      eyeMaterial2.emissive.setRGB(eyeGlow * 0.8, 0, 0);
    }

    // Health-based behavior - wounded bandits are more erratic
    if (bandit.health < 30) {
      const woundedShake = Math.sin(state.clock.elapsedTime * 8) * 0.05;
      meshRef.current.position.x = woundedShake;
      meshRef.current.position.z = woundedShake;
    }
  });

  // Health-based color intensity
  const getHealthColor = () => {
    const health = bandit.health / 100;
    if (health > 0.7) return "#dc2626"; // Dark red (healthy)
    if (health > 0.4) return "#b91c1c"; // Darker red
    if (health > 0.2) return "#991b1b"; // Very dark red
    return "#7f1d1d"; // Almost black red (dying)
  };

  const getBanditSize = () => {
    // Size based on strength - stronger bandits are bigger
    const strengthMultiplier = 0.8 + (bandit.strength / 100) * 0.6; // 0.8 to 1.4
    return strengthMultiplier;
  };

  // Determine threat level for visual effects
  const getThreatLevel = () => {
    const canAttack =
      Date.now() - bandit.lastAttackTime > bandit.attackCooldown;
    if (!bandit.isAlive) return "dead";
    if (bandit.health < 20) return "wounded";
    if (bandit.aggression > 80 && canAttack) return "enraged";
    if (bandit.aggression > 50) return "aggressive";
    return "hostile";
  };

  const threatLevel = getThreatLevel();

  return (
    <group
      ref={groupRef}
      position={[bandit.position.x, bandit.position.y, bandit.position.z]}
      onClick={() => onClick?.(bandit)}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <mesh ref={meshRef}>
        {/* Body - darker, more angular */}
        <sphereGeometry args={[1, 12, 12]} />
        <meshStandardMaterial
          color={hovered ? getHealthColor() : "#dc2626"} // Red primary
          emissive={threatLevel === "enraged" ? "#330000" : "#111111"}
          roughness={0.9} // Rougher than animals
          metalness={0.3} // Slightly metallic
          opacity={bandit.isAlive ? 1 : 0.3}
          transparent={!bandit.isAlive}
        />

        {/* Glowing red eyes */}
        <mesh ref={eyeLeftRef} position={[0.4, 0.3, 0.6]}>
          <sphereGeometry args={[0.12, 8, 8]} />
          <meshStandardMaterial
            color="#ff0000"
            emissive="#660000"
            emissiveIntensity={bandit.aggression / 100}
          />
        </mesh>
        <mesh ref={eyeRightRef} position={[-0.4, 0.3, 0.6]}>
          <sphereGeometry args={[0.12, 8, 8]} />
          <meshStandardMaterial
            color="#ff0000"
            emissive="#660000"
            emissiveIntensity={bandit.aggression / 100}
          />
        </mesh>

        {/* Dark grey markings - scars/war paint */}
        <mesh position={[0, 0.7, 0]} scale={[0.9, 0.4, 0.9]}>
          <sphereGeometry args={[1, 10, 10]} />
          <meshStandardMaterial
            color="#374151" // Dark grey
            transparent
            opacity={0.8}
          />
        </mesh>

        {/* Additional scar markings */}
        <mesh
          position={[0.3, 0.2, 0.7]}
          rotation={[0, 0, Math.PI / 4]}
          scale={[0.1, 0.6, 0.1]}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#1f2937" />
        </mesh>
        <mesh
          position={[-0.2, 0.1, 0.7]}
          rotation={[0, 0, -Math.PI / 6]}
          scale={[0.08, 0.4, 0.1]}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#1f2937" />
        </mesh>

        {/* Threat-level specific effects */}
        {threatLevel === "enraged" && (
          <>
            {/* Red aura when enraged */}
            <mesh position={[0, 0, 0]} scale={[1.3, 1.3, 1.3]}>
              <sphereGeometry args={[1, 16, 16]} />
              <meshBasicMaterial
                color="#ff0000"
                transparent
                opacity={0.2}
                side={THREE.BackSide}
              />
            </mesh>
            {/* Sparks/energy around body */}
            <mesh position={[0.8, 0.5, 0]}>
              <sphereGeometry args={[0.05, 6, 6]} />
              <meshBasicMaterial color="#ffff00" />
            </mesh>
            <mesh position={[-0.6, 0.8, 0.3]}>
              <sphereGeometry args={[0.04, 6, 6]} />
              <meshBasicMaterial color="#ff4444" />
            </mesh>
          </>
        )}

        {/* Weapon/claw indicators for high strength */}
        {bandit.strength > 70 && (
          <>
            <mesh position={[0.7, -0.3, 0.4]} rotation={[0, 0, Math.PI / 4]}>
              <boxGeometry args={[0.05, 0.4, 0.05]} />
              <meshStandardMaterial color="#666666" metalness={0.8} />
            </mesh>
            <mesh position={[-0.7, -0.3, 0.4]} rotation={[0, 0, -Math.PI / 4]}>
              <boxGeometry args={[0.05, 0.4, 0.05]} />
              <meshStandardMaterial color="#666666" metalness={0.8} />
            </mesh>
          </>
        )}
      </mesh>

      {/* Threat indicator floating above */}
      <mesh position={[0, 2.5, 0]}>
        <sphereGeometry args={[0.15, 8, 8]} />
        <meshBasicMaterial
          color={
            threatLevel === "enraged"
              ? "#ff0000"
              : threatLevel === "aggressive"
              ? "#dc2626"
              : threatLevel === "wounded"
              ? "#7f1d1d"
              : threatLevel === "dead"
              ? "#374151"
              : "#991b1b"
          }
        />
      </mesh>

      {/* Aggression level indicator */}
      {bandit.aggression > 50 && (
        <mesh position={[0, 2.8, 0]}>
          <ringGeometry args={[0.3, 0.35, 8]} />
          <meshBasicMaterial
            color="#ff0000"
            transparent
            opacity={bandit.aggression / 100}
          />
        </mesh>
      )}

      {/* Health bar */}
      {(hovered || bandit.health < 50) && (
        <>
          {/* Background bar */}
          <mesh position={[0, 3.2, 0]}>
            <boxGeometry args={[1, 0.08, 0.08]} />
            <meshBasicMaterial color="#333333" />
          </mesh>
          {/* Health bar */}
          <mesh position={[-0.5 + (bandit.health / 100) * 0.5, 3.2, 0.01]}>
            <boxGeometry args={[bandit.health / 100, 0.1, 0.1]} />
            <meshBasicMaterial color={getHealthColor()} />
          </mesh>
        </>
      )}

      {/* Attack cooldown indicator */}
      {Date.now() - bandit.lastAttackTime < bandit.attackCooldown && (
        <mesh position={[0, 1.8, 0]}>
          <ringGeometry args={[0.8, 0.9, 12]} />
          <meshBasicMaterial color="#ffaa00" transparent opacity={0.5} />
        </mesh>
      )}

      {/* Dead state visual */}
      {!bandit.isAlive && (
        <mesh position={[0, 0.1, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.2, 1.4, 16]} />
          <meshBasicMaterial color="#660000" transparent opacity={0.6} />
        </mesh>
      )}
    </group>
  );
}
