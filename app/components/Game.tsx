"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid, Environment } from "@react-three/drei";
import { Suspense, useEffect, useState, useCallback } from "react";
import { GameManager } from "../lib/game-manager";
import type { Animal } from "../types/animal";
import type { Building } from "../types/building";
import type { WorldResource, Bandit } from "../lib/game-manager";
import Animal3D from "./Animal3D";
import Bandit3D from "./Bandit3D";
import AnimalInfo from "./AnimalInfo";
import AnimalControlPanel from "./AnimalControlPanel";
import { Resource3D } from "./Resource3D";
import Building3D from "./Building3D";
import ActionLog, { type ActionLogEntry } from "./ActionLog";
import { actionLogger } from "../lib/action-logger";
import SpecialAnnouncementPanel from "./SpecialAnnouncementPanel";
import CurrencyLeaderboard, {
  CompactLeaderboard,
  LeaderboardPodium,
} from "./CurrencyLeaderboard";
import EventsPanel, { type GameEvent } from "./EventsPanel";
import NationPanel from "./NationPanel";
import TreasuryDisplay from "./TreasuryDisplay";
import TabInterface from "./TabInterface";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useRef, useState as useReactState } from "react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { TerrainMesh, useTerrainGenerator } from "./TerrainMesh";
import Territory3D from "./Territory3D";
import type { Nation, TerritoryInfo } from "../types/nation";

interface SceneProps {
  animals: Animal[];
  resources: WorldResource[];
  buildings: Building[];
  bandits: Bandit[];
  territories: TerritoryInfo[];
  selectedAnimals: Animal[];
  onAnimalClick: (animal: Animal, ctrlKey?: boolean) => void;
  onGroundClick: (position: THREE.Vector3) => void;
  onResourceClick?: (resource: WorldResource) => void;
  onBuildingClick?: (building: Building) => void;
  onBanditClick?: (bandit: Bandit) => void;
}

function GroundGlowRing({ selectedAnimals }: { selectedAnimals: Animal[] }) {
  const ringRef = useRef<THREE.Mesh>(null);
  const { camera, gl } = useThree();
  const [mousePosition, setMousePosition] = useReactState<THREE.Vector3>(
    new THREE.Vector3(0, 0, 0)
  );
  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2());

  // Track mouse movement
  useEffect(() => {
    if (selectedAnimals.length === 0) return;

    const handleMouseMove = (event: MouseEvent) => {
      const rect = gl.domElement.getBoundingClientRect();
      mouse.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.current.setFromCamera(mouse.current, camera);

      // Create a plane at y = -0.5 (ground level)
      const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0.5);
      const intersection = new THREE.Vector3();

      if (raycaster.current.ray.intersectPlane(groundPlane, intersection)) {
        setMousePosition(intersection);
      }
    };

    gl.domElement.addEventListener("mousemove", handleMouseMove);
    return () =>
      gl.domElement.removeEventListener("mousemove", handleMouseMove);
  }, [selectedAnimals.length, camera, gl]);

  useFrame((state) => {
    if (ringRef.current && selectedAnimals.length > 0) {
      // Gentle pulsing animation
      const pulse = 0.8 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
      ringRef.current.scale.setScalar(pulse);
      const material = ringRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = 0.2 + Math.sin(state.clock.elapsedTime * 3) * 0.1;

      // Follow mouse position
      ringRef.current.position.set(mousePosition.x, -0.45, mousePosition.z);
    }
  });

  if (selectedAnimals.length === 0) return null;

  return (
    <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[2, 3, 16]} />
      <meshBasicMaterial
        color="#4ade80"
        transparent
        opacity={0.3}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function Scene({
  animals,
  resources,
  buildings,
  bandits,
  territories,
  selectedAnimals,
  onAnimalClick,
  onGroundClick,
  onResourceClick,
  onBuildingClick,
  onBanditClick,
}: SceneProps) {
  const terrainGenerator = useTerrainGenerator();

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={1} castShadow />

      {/* Terrain */}
      <TerrainMesh terrainGenerator={terrainGenerator} />

      {/* Invisible clickable plane for ground interactions */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 15, 0]}
        onClick={(event) => {
          event.stopPropagation();
          const position = new THREE.Vector3(event.point.x, 0, event.point.z);
          onGroundClick(position);
        }}
      >
        <planeGeometry args={[200, 200]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Optional grid overlay */}
      <Grid
        args={[50, 50]}
        position={[0, 15.1, 0]}
        cellSize={4}
        cellThickness={0.5}
        cellColor="#6f6f6f"
        sectionSize={20}
        sectionThickness={1}
        sectionColor="#9d4b4b"
        fadeDistance={150}
        fadeStrength={1}
        followCamera
        infiniteGrid
      />

      {/* Environment */}
      <Environment preset="sunset" />

      {/* Ground glow ring for selected animals */}
      <GroundGlowRing selectedAnimals={selectedAnimals} />

      {/* Nation Territories */}
      {territories.map((territory) => (
        <Territory3D key={territory.settlementId} territory={territory} />
      ))}

      {/* Animals */}
      {animals.map((animal) => (
        <Animal3D
          key={animal.id}
          animal={animal}
          onClick={onAnimalClick}
          isSelected={selectedAnimals.some((a) => a.id === animal.id)}
        />
      ))}

      {/* World Resources */}
      {resources.map((resource) => (
        <Resource3D
          key={resource.id}
          resource={resource}
          onClick={onResourceClick}
        />
      ))}

      {/* Buildings */}
      {buildings.map((building) => (
        <Building3D
          key={building.id}
          building={building}
          onClick={onBuildingClick}
        />
      ))}

      {/* Bandits */}
      {bandits.map((bandit) => (
        <Bandit3D key={bandit.id} bandit={bandit} onClick={onBanditClick} />
      ))}
    </>
  );
}

export default function Game() {
  const [gameManager, setGameManager] = useState<GameManager | null>(null);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [resources, setResources] = useState<WorldResource[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [bandits, setBandits] = useState<Bandit[]>([]);
  const [nations, setNations] = useState<Nation[]>([]);
  const [territories, setTerritories] = useState<TerritoryInfo[]>([]);
  const [selectedAnimals, setSelectedAnimals] = useState<Animal[]>([]);
  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [version, setVersion] = useState(0);
  const [actionLogs, setActionLogs] = useState<ActionLogEntry[]>([]);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [showAnnouncementPanel, setShowAnnouncementPanel] = useState(false);
  const controlsRef = useRef<OrbitControlsImpl>(null);

  useEffect(() => {
    const manager = new GameManager({
      startingAnimals: 36, // 6 nations × 6 animals each
      maxAnimals: 100, // Increased to accommodate all nations
      enableWebSocket: false, // Disable for now to avoid server dependency
    });

    setGameManager(manager);

    // Subscribe to action logs
    const unsubscribe = actionLogger.subscribe((logs) => {
      setActionLogs(logs);
    });

    return () => {
      if (manager) {
        manager.stopGame();
      }
      unsubscribe();
    };
  }, []);

  const startGame = useCallback(async () => {
    if (gameManager && !gameStarted) {
      await gameManager.startGame();
      setGameStarted(true);

      // Update animals and resources periodically
      const interval = setInterval(() => {
        const currentAnimals = gameManager.getAllAnimals();
        const worldState = gameManager.getWorldState();

        console.info("Animal count:", currentAnimals.length);

        setAnimals([...currentAnimals]);
        setResources([...worldState.resources]);
        setBuildings([...worldState.buildings]);
        setBandits([...worldState.bandits.filter((b) => b.isAlive)]);
        setNations([...worldState.nations]);
        setTerritories([...worldState.territories]);
        setEvents([...worldState.events]);
        setVersion((v) => v + 1);

        // Update selected animals if they still exist
        if (selectedAnimals.length > 0) {
          const updatedSelected = selectedAnimals
            .map((selected) => currentAnimals.find((a) => a.id === selected.id))
            .filter(Boolean) as Animal[];
          setSelectedAnimals(updatedSelected);
        }

        // Update selected animal if it still exists
        if (selectedAnimal) {
          const updated = currentAnimals.find(
            (a) => a.id === selectedAnimal.id
          );
          if (updated) {
            setSelectedAnimal(updated);
          } else {
            setSelectedAnimal(null);
          }
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [gameManager, gameStarted, selectedAnimal]);

  const centerOnAnimal = useCallback((animal: Animal) => {
    if (controlsRef.current) {
      controlsRef.current.target.set(animal.position.x, 0, animal.position.z);
      controlsRef.current.update();
    }
  }, []);

  const handleAnimalClick = useCallback((animal: Animal, ctrlKey = false) => {
    if (ctrlKey) {
      // Multi-select mode
      setSelectedAnimals((prev) => {
        const isAlreadySelected = prev.some((a) => a.id === animal.id);
        if (isAlreadySelected) {
          // Deselect if already selected
          return prev.filter((a) => a.id !== animal.id);
        } else {
          // Add to selection
          return [...prev, animal];
        }
      });
    } else {
      // Single select mode
      setSelectedAnimals([animal]);
      setSelectedAnimal(animal);
    }
  }, []);

  const handleAnimalClickAndCenter = useCallback(
    (animal: Animal, ctrlKey = false) => {
      handleAnimalClick(animal, ctrlKey);
      centerOnAnimal(animal);
    },
    [handleAnimalClick, centerOnAnimal]
  );

  const handleGroundClick = useCallback(
    async (position: THREE.Vector3) => {
      if (selectedAnimals.length > 0 && gameManager) {
        // Move selected animals to clicked position using proper movement actions
        for (const [index, animal] of selectedAnimals.entries()) {
          const offset = index * 2; // Spread animals out
          const targetX = position.x + Math.cos(index) * offset;
          const targetZ = position.z + Math.sin(index) * offset;

          // Use proper movement action for energy cost and memory tracking
          // TODO: use executeAnimalAction from healthMonitor
          await gameManager.executeAnimalAction(animal.id, {
            action: "moving",
            targetX,
            targetZ,
            speed: 1,
          });
        }
      }
    },
    [selectedAnimals, gameManager]
  );

  const closeAnimalInfo = useCallback(() => {
    setSelectedAnimal(null);
    setSelectedAnimals([]);
  }, []);

  const handleBuildingClick = useCallback((building: Building) => {
    console.log("Building clicked:", building.name, building);
  }, []);

  const handleBanditClick = useCallback((bandit: Bandit) => {
    console.log("Bandit clicked:", bandit.name, bandit);
  }, []);

  const spawnNewAnimal = useCallback(async () => {
    if (gameManager) {
      await gameManager.spawnRandomAnimal();
    }
  }, [gameManager]);

  const handleSetTaxRate = useCallback(
    (nationId: string, rate: number) => {
      if (gameManager) {
        const success = gameManager.setNationTaxRate(nationId, rate);
        if (success) {
          console.log(
            `Successfully set tax rate for nation ${nationId} to ${rate}%`
          );
        } else {
          console.error(`Failed to set tax rate for nation ${nationId}`);
        }
      }
    },
    [gameManager]
  );

  return (
    <div className="w-full h-screen relative">
      <Canvas camera={{ position: [50, 35, 50], fov: 60 }}>
        <Suspense fallback={null}>
          <Scene
            animals={animals}
            resources={resources}
            buildings={buildings}
            bandits={bandits}
            territories={territories}
            selectedAnimals={selectedAnimals}
            onAnimalClick={handleAnimalClick}
            onGroundClick={handleGroundClick}
            onBuildingClick={handleBuildingClick}
            onBanditClick={handleBanditClick}
          />
          <OrbitControls
            ref={controlsRef}
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            maxPolarAngle={Math.PI / 2}
            minDistance={10}
            maxDistance={200}
            enableDamping={true}
            dampingFactor={0.1}
            rotateSpeed={0.5}
            target={[0, 10, 0]}
            zoomSpeed={0.35} // Adjust for desired zoom sensitivity
            panSpeed={0.5} // Adjust for desired pan sensitivity
          />
        </Suspense>
      </Canvas>

      {/* UI Controls */}
      <div className="absolute top-4 left-4 space-y-2">
        {!gameStarted ? (
          <button
            onClick={startGame}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
          >
            Start Universe
          </button>
        ) : (
          <>
            <div className="bg-white/90 backdrop-blur-sm p-3 rounded-lg">
              <div className="text-sm">
                {/* <div>
                  Time Elapsed (version):
                  {Math.floor(version / 60)}m {version % 60}s (v{version})
                </div> */}
                <div>Animals: {animals.length}</div>
                <div>Alive: {animals.filter((a) => a.isAlive).length}</div>
                <div>
                  Food Sources:{" "}
                  {
                    resources.filter((r) => r.category === "edible_plants")
                      .length
                  }
                </div>
                <div>
                  Materials:{" "}
                  {
                    resources.filter(
                      (r) =>
                        r.category === "minerals_stones" ||
                        r.category === "organic_materials"
                    ).length
                  }
                </div>
                <div>Buildings: {buildings.length}</div>
                <div>
                  Total Shelter Capacity:{" "}
                  {buildings.reduce((sum, b) => sum + b.maxOccupants, 0)}
                </div>
                <div>Bandits: {bandits.length}</div>
                <div>
                  Alive Bandits: {bandits.filter((b) => b.isAlive).length}
                </div>
                <div>Nations: {nations.length}</div>
                <div>Territories: {territories.length}</div>
                <div className="border-t pt-2 mt-2">
                  <div className="font-medium text-sm">Nation Treasuries:</div>
                  {nations.slice(0, 3).map((nation) => (
                    <div
                      key={nation.id}
                      className="text-xs"
                      style={{ color: nation.color.primary }}
                    >
                      {nation.name}: {Math.floor(nation.treasury)}💰
                    </div>
                  ))}
                  {nations.length > 3 && (
                    <div className="text-xs text-gray-500">
                      +{nations.length - 3} more nations...
                    </div>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={spawnNewAnimal}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm"
            >
              Spawn Animal
            </button>
            <button
              onClick={() => setShowAnnouncementPanel(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg text-sm"
            >
              Special Announcement
            </button>
          </>
        )}
      </div>

      {/* Animal Info Panel */}
      <AnimalInfo animal={selectedAnimal} onClose={closeAnimalInfo} />

      {/* Animal Control Panel */}
      <AnimalControlPanel
        selectedAnimals={selectedAnimals}
        gameManager={gameManager}
        onClearSelection={() => {
          setSelectedAnimals([]);
          setSelectedAnimal(null);
        }}
      />

      {/* Action Log */}
      <ActionLog entries={actionLogs} animals={animals} nations={nations} />

      {/* Events Panel */}
      <EventsPanel events={events} />

      {/* Tabbed Interface for Nation/Treasury/Leaderboard */}
      <div className="absolute top-4 right-4 w-96">
        <TabInterface
          tabs={[
            {
              id: "nations",
              label: "Nations",
              content: (
                <NationPanel
                  nations={nations}
                  animals={animals}
                  onSetTaxRate={handleSetTaxRate}
                />
              ),
            },
            {
              id: "treasury",
              label: "Treasury",
              content: <TreasuryDisplay nations={nations} />,
            },
            {
              id: "leaderboard",
              label: "Leaderboard",
              content: (
                <CurrencyLeaderboard
                  animals={animals}
                  maxEntries={10}
                  onAnimalClick={handleAnimalClickAndCenter}
                />
              ),
            },
          ]}
        />
      </div>

      {/* Special Announcement Panel */}
      <SpecialAnnouncementPanel
        isVisible={showAnnouncementPanel}
        onClose={() => setShowAnnouncementPanel(false)}
        totalAnimals={animals.filter((a) => a.isAlive).length}
      />

      {/* Instructions */}
      {/* <div className="absolute bottom-4 left-4 bg-black/70 text-white p-3 rounded-lg text-sm max-w-sm">
        <div className="font-semibold mb-1">Instructions:</div>
        <div>• Click an animal to see its details</div>
        <div>• Animals must harvest resources to survive</div>
        <div>• Animals need inventory items to eat/drink</div>
      </div> */}
    </div>
  );
}
