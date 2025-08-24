"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid, Environment } from "@react-three/drei";
import { Suspense, useEffect, useState, useCallback } from "react";
import { useDevEffectOnce } from "../hooks/useDevOnce";
import { GameManager } from "../lib/game-manager";
import { nationSystem } from "../lib/nation-system";
import type { Animal } from "../types/animal";
import type { Building } from "../types/building";
import type { WorldResource, Bandit } from "../lib/game-manager";
import Animal3D from "./Animal3D";
import Bandit3D from "./Bandit3D";
import AnimalInfo from "./AnimalInfo";
import AnimalControlPanel from "./AnimalControlPanel";
import { Resource3D } from "./Resource3D";
import Building3D from "./Building3D";
import BuildingInfo from "./BuildingInfo";
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
import MarketMenu from "./MarketMenu";
import GhostBuilding from "./GhostBuilding";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useRef, useState as useReactState } from "react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { TerrainMesh, useTerrainGenerator } from "./TerrainMesh";
import Territory3D from "./Territory3D";
import type { Nation, TerritoryInfo } from "../types/nation";
import type { BuildingType } from "../types/building";
import { buildingSystem } from "../lib/building-system";
import SaveLoadMenu from "./SaveLoadMenu";

interface SceneProps {
  gameManager: GameManager;
  animals: Animal[];
  nations: Nation[];
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
  buildingPlacementMode: {
    isActive: boolean;
    buildingType: BuildingType | null;
    isValidPlacement: boolean;
  };
  onGhostPositionChange: (position: THREE.Vector3) => void;
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
  gameManager,
  animals,
  nations,
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
  buildingPlacementMode,
  onGhostPositionChange,
}: SceneProps) {
  const terrainGenerator = useTerrainGenerator();

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={1} castShadow />

      {/* Terrain */}
      <TerrainMesh
        // terrainGenerator={terrainGenerator}
        gameManager={gameManager}
        onClick={onGroundClick}
      />

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
          nations={nations}
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

      {/* Ghost Building Preview */}
      {buildingPlacementMode.isActive && buildingPlacementMode.buildingType && (
        <GhostBuilding
          buildingType={buildingPlacementMode.buildingType}
          isValidPlacement={buildingPlacementMode.isValidPlacement}
          onPositionChange={onGhostPositionChange}
        />
      )}
    </>
  );
}

export default function Game() {
  const gameManagerRef = useRef<GameManager | null>(null);
  const [gameManagerLoaded, setGameManagerLoaded] = useState(false);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [resources, setResources] = useState<WorldResource[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [bandits, setBandits] = useState<Bandit[]>([]);
  const [nations, setNations] = useState<Nation[]>([]);
  const [territories, setTerritories] = useState<TerritoryInfo[]>([]);
  const [selectedAnimals, setSelectedAnimals] = useState<Animal[]>([]);
  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(
    null
  );
  const [gameStarted, setGameStarted] = useState(false);
  const [version, setVersion] = useState(0);
  const [actionLogs, setActionLogs] = useState<ActionLogEntry[]>([]);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [showAnnouncementPanel, setShowAnnouncementPanel] = useState(false);
  const [playerNationId, setPlayerNationId] = useState<string | null>(null);
  const [showNationSelection, setShowNationSelection] = useState(false);
  const [showSaveLoadMenu, setShowSaveLoadMenu] = useState(false);
  const [buildingPlacementMode, setBuildingPlacementMode] = useState<{
    isActive: boolean;
    buildingType: BuildingType | null;
    buildingCost: number | null;
    ghostPosition: THREE.Vector3 | null;
    isValidPlacement: boolean;
  }>({
    isActive: false,
    buildingType: null,
    buildingCost: null,
    ghostPosition: null,
    isValidPlacement: true,
  });
  const controlsRef = useRef<OrbitControlsImpl>(null);

  const startBuildingPlacement = useCallback(
    (buildingType: BuildingType, cost: number) => {
      setBuildingPlacementMode({
        isActive: true,
        buildingType,
        buildingCost: cost,
        ghostPosition: null,
        isValidPlacement: true,
      });
      // Clear animal selection when entering building mode
      setSelectedAnimals([]);
      setSelectedAnimal(null);
      setSelectedBuilding(null);
    },
    []
  );

  const cancelBuildingPlacement = useCallback(() => {
    setBuildingPlacementMode({
      isActive: false,
      buildingType: null,
      buildingCost: null,
      ghostPosition: null,
      isValidPlacement: true,
    });
  }, []);

  useDevEffectOnce(() => {
    console.log("Initializing GameManager...");

    const manager = new GameManager({
      // startingAnimals: 36, // 6 nations × 6 animals each
      startingAnimals: 32, // 4 nations × 8 animals each
      maxAnimals: 100, // Increased to accommodate all nations
      enableWebSocket: false, // Disable for now to avoid server dependency
      worldSize: {
        width: 300,
        height: 30,
        depth: 300,
      },
    });

    gameManagerRef.current = manager;

    setGameManagerLoaded(true);

    // Subscribe to action logs
    const unsubscribe = actionLogger.subscribe((logs) => {
      setActionLogs(logs);
    });

    // Handle keyboard shortcuts
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && buildingPlacementMode.isActive) {
        cancelBuildingPlacement();
        return;
      }

      // Quick save/load shortcuts
      if (event.ctrlKey || event.metaKey) {
        // Ctrl on Windows/Linux, Cmd on Mac
        switch (event.key.toLowerCase()) {
          case "s":
            event.preventDefault();
            if (gameManagerRef.current && gameStarted) {
              // Quick save
              import("../lib/save-manager").then(({ SaveManager }) => {
                const saveManager = new SaveManager(gameManagerRef.current!);
                saveManager
                  .quickSave(playerNationId || undefined)
                  .then((result) => {
                    console.log(
                      result.success ? "Quick saved!" : result.message
                    );
                  });
              });
            }
            break;
          case "l":
            event.preventDefault();
            if (gameStarted) {
              // Quick load
              import("../lib/save-manager").then(({ SaveManager }) => {
                if (!gameManagerRef.current) return;
                const saveManager = new SaveManager(gameManagerRef.current);
                saveManager.loadQuickSave().then((result) => {
                  if (result.success && result.gameManager) {
                    gameManagerRef.current = result.gameManager;
                    handleGameLoaded(result.gameManager);
                    console.log("Quick loaded!");
                  } else {
                    console.log(result.message);
                  }
                });
              });
            }
            break;
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      // if (manager) {
      //   manager.stopGame();
      // }
      unsubscribe();
      document.removeEventListener("keydown", handleKeyDown);
    };
  });

  // Load stored player nation on game start
  useEffect(() => {
    if (gameStarted && nations.length > 0) {
      const storedNationId = localStorage.getItem("universePlayerNation");
      if (storedNationId && nations.find((n) => n.id === storedNationId)) {
        setPlayerNationId(storedNationId);
        // Notify GameManager about player nation selection
        if (gameManagerRef.current) {
          gameManagerRef.current.setPlayerNation(storedNationId);
        }
      } else if (!playerNationId) {
        setShowNationSelection(true);
      }
    }
  }, [gameStarted, nations, playerNationId]);

  const startGame = useCallback(async () => {
    if (gameManagerRef.current && !gameStarted) {
      await gameManagerRef.current.startGame();
      setGameStarted(true);
      // Don't immediately show nation selection - let the useEffect handle it

      // Update animals and resources periodically
      const interval = setInterval(() => {
        if (!gameManagerRef.current) return;

        const currentAnimals = gameManagerRef.current.getAllAnimals();
        const worldState = gameManagerRef.current.getWorldState();

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

        // Update selected building if it still exists
        if (selectedBuilding) {
          const updated = worldState.buildings.find(
            (b) => b.id === selectedBuilding.id
          );
          if (updated) {
            setSelectedBuilding(updated);
          } else {
            setSelectedBuilding(null);
          }
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [gameStarted, selectedAnimal]);

  const centerOnAnimal = useCallback((animal: Animal) => {
    if (controlsRef.current) {
      controlsRef.current.target.set(animal.position.x, 0, animal.position.z);
      controlsRef.current.update();
    }
  }, []);

  const handleAnimalClick = useCallback(
    (animal: Animal, ctrlKey = false) => {
      // Only allow selection/control of animals from player's nation
      if (playerNationId && animal.nationId !== playerNationId) {
        return; // Ignore clicks on other nations' animals
      }

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
    },
    [playerNationId]
  );

  const handleAnimalClickAndCenter = useCallback(
    (animal: Animal, ctrlKey = false) => {
      handleAnimalClick(animal, ctrlKey);
      centerOnAnimal(animal);
    },
    [handleAnimalClick, centerOnAnimal]
  );

  const handleGroundClick = useCallback(
    async (position: THREE.Vector3) => {
      // Handle building placement
      if (
        buildingPlacementMode.isActive &&
        buildingPlacementMode.buildingType &&
        gameManagerRef.current
      ) {
        if (buildingPlacementMode.isValidPlacement) {
          // Find a player animal to create the building
          const playerAnimals = animals.filter(
            (animal) => animal.nationId === playerNationId && animal.isAlive
          );

          if (playerAnimals.length > 0) {
            // const builderAnimal = playerAnimals[0]; // Use first available animal
            // randomly pick an animal to be the builder
            const builderAnimal =
              playerAnimals[Math.floor(Math.random() * playerAnimals.length)];

            try {
              const result = buildingSystem.createBuilding(
                builderAnimal,
                { x: position.x, y: position.y, z: position.z },
                `${buildingPlacementMode.buildingType} Building`,
                buildingPlacementMode.buildingType,
                false // usesMaterials
              );

              if (result.success) {
                // Deduct cost from nation treasury
                if (buildingPlacementMode.buildingCost && playerNationId) {
                  const treasuryResult = nationSystem.deductFromTreasury(
                    playerNationId,
                    buildingPlacementMode.buildingCost
                  );

                  if (treasuryResult.success) {
                    console.log(
                      `Successfully deducted ${buildingPlacementMode.buildingCost} coins from treasury. ${treasuryResult.message}`
                    );
                  } else {
                    console.warn(
                      "Treasury deduction failed:",
                      treasuryResult.message
                    );
                  }
                }

                // Focus camera on new building
                if (controlsRef.current) {
                  controlsRef.current.target.set(position.x, 0, position.z);
                  controlsRef.current.update();
                }
                console.log(
                  `Successfully placed ${buildingPlacementMode.buildingType}`
                );
              } else {
                console.warn("Failed to place building:", result.message);
                alert(
                  `Failed to place building: ${
                    result.message || "Unknown error"
                  }`
                );
              }
            } catch (error) {
              console.error("Error placing building:", error);
            }
          }

          // Exit placement mode
          setBuildingPlacementMode({
            isActive: false,
            buildingType: null,
            buildingCost: null,
            ghostPosition: null,
            isValidPlacement: true,
          });
        }
        return; // Don't do animal movement when in placement mode
      }

      // Handle animal movement (original logic)
      if (selectedAnimals.length > 0 && gameManagerRef.current) {
        // Move selected animals to clicked position using proper movement actions
        for (const [index, animal] of selectedAnimals.entries()) {
          const offset = index * 2; // Spread animals out
          const targetX = position.x + Math.cos(index) * offset;
          const targetZ = position.z + Math.sin(index) * offset;

          // Use proper movement action for energy cost and memory tracking
          // TODO: use executeAnimalAction from healthMonitor
          await gameManagerRef.current.executeAnimalAction(animal.id, {
            action: "moving",
            targetX,
            targetZ,
            speed: 1,
          });
        }
      }
    },
    [
      selectedAnimals,
      gameManagerRef.current,
      buildingPlacementMode,
      animals,
      playerNationId,
    ]
  );

  const closeAnimalInfo = useCallback(() => {
    setSelectedAnimal(null);
    setSelectedAnimals([]);
  }, []);

  const handleGhostPositionChange = useCallback(
    (position: THREE.Vector3) => {
      if (!gameManagerRef.current || !buildingPlacementMode.buildingType)
        return;

      // Check placement validity using building system proximity check
      let isValid = true;
      try {
        const proximityCheck = buildingSystem.checkBuildingProximity?.(
          { x: position.x, y: position.y, z: position.z },
          8 // minimum distance
        );
        isValid = proximityCheck?.canBuild ?? true;
      } catch (error) {
        // If proximity check method doesn't exist, default to valid
        isValid = true;
      }

      setBuildingPlacementMode((prev) => ({
        ...prev,
        ghostPosition: position,
        isValidPlacement: isValid,
      }));
    },
    [buildingPlacementMode.buildingType]
  );

  const handleBuildingClick = useCallback((building: Building) => {
    setSelectedBuilding(building);
    console.log("Building clicked:", building.name, building);
  }, []);

  const closeBuildingInfo = useCallback(() => {
    setSelectedBuilding(null);
  }, []);

  const handleBuildingUpgrade = useCallback(
    (buildingId: string, amount: number) => {
      if (gameManagerRef.current && selectedBuilding) {
        // Find the building's owner
        const building = buildings.find((b) => b.id === buildingId);
        if (!building || !building.nationId) {
          console.error("Building not found or has no nation owner");
          return;
        }

        // Get nation treasury
        const nationStats = nationSystem.getNationStats(building.nationId);
        const nationTreasury = nationStats ? nationStats.treasury : 0;
        if (nationTreasury < amount) {
          console.error("Nation doesn't have enough funds for upgrade");
          return;
        }

        // Find a random animal from the nation to perform the upgrade
        const nationAnimals = animals.filter(
          (a) => a.nationId === building.nationId
        );
        if (nationAnimals.length === 0) {
          console.error(
            "No animals available from the owning nation to perform upgrade"
          );
          return;
        }

        const randomAnimal =
          nationAnimals[Math.floor(Math.random() * nationAnimals.length)];

        // Perform the upgrade
        const result = buildingSystem.modifyBuilding(
          randomAnimal,
          buildingId,
          "purchase_upgrade",
          amount
        );

        if (result.success) {
          console.log(`Building upgrade successful: ${result.message}`);
          // Update the selected building with the modified one
          const updatedBuilding = buildingSystem.getBuilding(buildingId);
          if (updatedBuilding) {
            setSelectedBuilding(updatedBuilding);
          }
        } else {
          console.error(`Building upgrade failed: ${result.message}`);
        }
      }
    },
    [gameManagerRef, selectedBuilding, buildings, animals]
  );

  const handleBanditClick = useCallback((bandit: Bandit) => {
    console.log("Bandit clicked:", bandit.name, bandit);
  }, []);

  const spawnNewAnimal = useCallback(async () => {
    if (gameManagerRef.current) {
      await gameManagerRef.current.spawnRandomAnimal();
    }
  }, []);

  const handleSetTaxRate = useCallback((nationId: string, rate: number) => {
    if (gameManagerRef.current) {
      const success = gameManagerRef.current.setNationTaxRate(nationId, rate);
      if (success) {
        console.log(
          `Successfully set tax rate for nation ${nationId} to ${rate}%`
        );
      } else {
        console.error(`Failed to set tax rate for nation ${nationId}`);
      }
    }
  }, []);

  const handleNationSelection = useCallback((nationId: string) => {
    setPlayerNationId(nationId);
    setShowNationSelection(false);
    // Store in localStorage for persistence
    localStorage.setItem("universePlayerNation", nationId);
    // Notify GameManager about player nation selection
    if (gameManagerRef.current) {
      gameManagerRef.current.setPlayerNation(nationId);
    }
  }, []);

  const handleGameLoaded = useCallback(
    async (loadedGameManager: GameManager) => {
      // Replace current game manager with loaded one
      if (gameManagerRef.current) {
        gameManagerRef.current.stopGame();
      }

      gameManagerRef.current = loadedGameManager;

      // Start the loaded game
      await loadedGameManager.startGame();
      setGameStarted(true);

      // Update state from loaded game
      const currentAnimals = loadedGameManager.getAllAnimals();
      const worldState = loadedGameManager.getWorldState();

      setAnimals([...currentAnimals]);
      setResources([...worldState.resources]);
      setBuildings([...worldState.buildings]);
      setBandits([...worldState.bandits.filter((b) => b.isAlive)]);
      setNations([...worldState.nations]);
      setTerritories([...worldState.territories]);
      setEvents([...worldState.events]);
      setVersion((v) => v + 1);

      // Clear any selections since animals may have changed
      setSelectedAnimals([]);
      setSelectedAnimal(null);

      console.log("Game loaded successfully:", {
        animals: currentAnimals.length,
        nations: worldState.nations.length,
      });
    },
    []
  );

  let threeScene = null;
  if (gameManagerLoaded && gameManagerRef.current) {
    threeScene = (
      <Scene
        gameManager={gameManagerRef.current}
        animals={animals}
        nations={nations}
        resources={resources}
        buildings={buildings}
        bandits={bandits}
        territories={territories}
        selectedAnimals={selectedAnimals}
        onAnimalClick={handleAnimalClick}
        onGroundClick={handleGroundClick}
        onBuildingClick={handleBuildingClick}
        onBanditClick={handleBanditClick}
        buildingPlacementMode={buildingPlacementMode}
        onGhostPositionChange={handleGhostPositionChange}
      />
    );
  }

  return (
    <div className="w-full h-screen relative">
      <Canvas camera={{ position: [50, 35, 50], fov: 60 }}>
        <Suspense fallback={null}>
          {threeScene}
          <OrbitControls
            ref={controlsRef}
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            maxPolarAngle={Math.PI / 2}
            minDistance={10}
            maxDistance={325}
            enableDamping={true}
            dampingFactor={0.1}
            rotateSpeed={0.4}
            target={[0, 10, 0]}
            zoomSpeed={0.3} // Adjust for desired zoom sensitivity
            panSpeed={0.4} // Adjust for desired pan sensitivity
          />
        </Suspense>
      </Canvas>

      {/* UI Controls */}
      <div className="absolute top-4 left-4 space-y-2">
        {!gameStarted ? (
          <div className="bg-white/90 backdrop-blur-sm p-4 rounded-lg space-y-3">
            {/* <h2 className="font-bold text-lg text-center">Universe Strategy Game</h2> */}
            <div className="flex flex-col space-y-2">
              <button
                onClick={startGame}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium"
              >
                Start New Universe
              </button>
              <button
                onClick={() => setShowSaveLoadMenu(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
              >
                Load Universe
              </button>
            </div>
          </div>
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
                {playerNationId && (
                  <div className="border-t pt-2 mt-2">
                    <div className="font-medium text-sm text-green-600">
                      Your Nation:
                    </div>
                    {nations.find((n) => n.id === playerNationId) && (
                      <div
                        className="text-sm font-semibold"
                        style={{
                          color: nations.find((n) => n.id === playerNationId)!
                            .color.primary,
                        }}
                      >
                        {nations.find((n) => n.id === playerNationId)!.name}
                      </div>
                    )}
                  </div>
                )}
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
              onClick={() => setShowSaveLoadMenu(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm"
            >
              Save Game
            </button>
            <button
              onClick={() => setShowAnnouncementPanel(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg text-sm"
            >
              Command Your Nation
            </button>
          </>
        )}
      </div>

      {/* Animal Info Panel */}
      <AnimalInfo animal={selectedAnimal} onClose={closeAnimalInfo} />

      {/* Building Info Panel */}
      <BuildingInfo
        building={selectedBuilding}
        onClose={closeBuildingInfo}
        onUpgrade={handleBuildingUpgrade}
      />

      {/* Animal Control Panel */}
      <AnimalControlPanel
        selectedAnimals={selectedAnimals}
        gameManager={gameManagerRef.current}
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
                  playerNationId={playerNationId}
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
                  playerNationId={playerNationId}
                  maxEntries={10}
                  onAnimalClick={handleAnimalClickAndCenter}
                />
              ),
            },
            {
              id: "market",
              label: "Market",
              content: (
                <MarketMenu
                  gameManager={gameManagerRef.current}
                  onStartBuildingPlacement={startBuildingPlacement}
                  playerNationId={playerNationId}
                  nations={nations}
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
        playerNationId={playerNationId}
      />

      {/* Nation Selection Modal */}
      {showNationSelection && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold mb-4 text-center">
              Choose Your Nation
            </h2>
            <p className="text-gray-600 mb-6 text-center">
              Select a nation to rule. You can only control animals from your
              chosen nation.
            </p>
            <div className="grid grid-cols-1 gap-3">
              {nations.map((nation) => (
                <button
                  key={nation.id}
                  onClick={() => handleNationSelection(nation.id)}
                  className="p-4 rounded-lg border-2 hover:border-opacity-100 transition-all"
                  style={{
                    borderColor: nation.color.primary,
                    backgroundColor: `${nation.color.primary}20`,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div
                        className="font-semibold"
                        style={{ color: nation.color.primary }}
                      >
                        {nation.name}
                      </div>
                      <div className="text-sm text-gray-600">
                        {nation.citizenIds.length} citizens •{" "}
                        {Math.floor(nation.treasury)}💰
                      </div>
                    </div>
                    <div
                      className="w-6 h-6 rounded-full"
                      style={{ backgroundColor: nation.color.primary }}
                    />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Save/Load Menu */}
      <SaveLoadMenu
        gameManager={gameManagerRef.current}
        playerNationId={playerNationId || undefined}
        onGameLoaded={handleGameLoaded}
        onClose={() => setShowSaveLoadMenu(false)}
        isVisible={showSaveLoadMenu}
        defaultTab={gameStarted ? "save" : "load"}
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
