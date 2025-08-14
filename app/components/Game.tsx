"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid, Environment } from "@react-three/drei";
import { Suspense, useEffect, useState, useCallback } from "react";
import { GameManager } from "../lib/game-manager";
import type { Animal } from "../types/animal";
import type { Building } from "../types/building";
import type { WorldResource } from "../lib/game-manager";
import Animal3D from "./Animal3D";
import AnimalInfo from "./AnimalInfo";
import { Resource3D } from "./Resource3D";
import Building3D from "./Building3D";
import ActionLog, { type ActionLogEntry } from "./ActionLog";
import { actionLogger } from "../lib/action-logger";

interface SceneProps {
  animals: Animal[];
  resources: WorldResource[];
  buildings: Building[];
  onAnimalClick: (animal: Animal) => void;
  onResourceClick?: (resource: WorldResource) => void;
  onBuildingClick?: (building: Building) => void;
}

function Scene({
  animals,
  resources,
  buildings,
  onAnimalClick,
  onResourceClick,
  onBuildingClick,
}: SceneProps) {
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={1} />

      {/* Ground */}
      <Grid
        args={[50, 50]}
        position={[0, -0.5, 0]}
        cellSize={2}
        cellThickness={0.5}
        cellColor="#6f6f6f"
        sectionSize={10}
        sectionThickness={1}
        sectionColor="#9d4b4b"
        fadeDistance={100}
        fadeStrength={1}
        followCamera
        infiniteGrid
      />

      {/* Environment */}
      <Environment preset="sunset" />

      {/* Animals */}
      {animals.map((animal) => (
        <Animal3D key={animal.id} animal={animal} onClick={onAnimalClick} />
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
    </>
  );
}

export default function Game() {
  const [gameManager, setGameManager] = useState<GameManager | null>(null);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [resources, setResources] = useState<WorldResource[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [version, setVersion] = useState(0);
  const [actionLogs, setActionLogs] = useState<ActionLogEntry[]>([]);

  useEffect(() => {
    const manager = new GameManager({
      startingAnimals: 10,
      maxAnimals: 20,
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

        setAnimals([...currentAnimals]);
        setResources([...worldState.resources]);
        setBuildings([...worldState.buildings]);
        setVersion((v) => v + 1);

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

  const handleAnimalClick = useCallback((animal: Animal) => {
    setSelectedAnimal(animal);
  }, []);

  const closeAnimalInfo = useCallback(() => {
    setSelectedAnimal(null);
  }, []);

  const handleBuildingClick = useCallback((building: Building) => {
    console.log('Building clicked:', building.name, building);
  }, []);

  const spawnNewAnimal = useCallback(async () => {
    if (gameManager) {
      await gameManager.spawnRandomAnimal();
    }
  }, [gameManager]);

  return (
    <div className="w-full h-screen relative">
      <Canvas camera={{ position: [15, 15, 15], fov: 50 }}>
        <Suspense fallback={null}>
          <Scene
            animals={animals}
            resources={resources}
            buildings={buildings}
            onAnimalClick={handleAnimalClick}
            onBuildingClick={handleBuildingClick}
          />
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            maxPolarAngle={Math.PI / 2}
            minDistance={5}
            maxDistance={100}
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
                <div>Animals: {animals.length}</div>
                <div>Alive: {animals.filter((a) => a.isAlive).length}</div>
                <div>
                  Food Sources:{" "}
                  {
                    resources.filter(
                      (r) => r.type === "food" || r.type === "berries"
                    ).length
                  }
                </div>
                <div>
                  Water Sources:{" "}
                  {resources.filter((r) => r.type === "water").length}
                </div>
                <div>
                  Buildings: {buildings.length}
                </div>
                <div>
                  Total Shelter Capacity:{" "}
                  {buildings.reduce((sum, b) => sum + b.maxOccupants, 0)}
                </div>
              </div>
            </div>
            <button
              onClick={spawnNewAnimal}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm"
            >
              Spawn Animal
            </button>
          </>
        )}
      </div>

      {/* Animal Info Panel */}
      <AnimalInfo animal={selectedAnimal} onClose={closeAnimalInfo} />

      {/* Action Log */}
      <ActionLog entries={actionLogs} />

      {/* Instructions */}
      <div className="absolute bottom-4 left-4 bg-black/70 text-white p-3 rounded-lg text-sm max-w-sm">
        <div className="font-semibold mb-1">Instructions:</div>
        <div>• Click an animal to see its details</div>
        <div>• Animals must harvest resources to survive</div>
        <div>• Animals need inventory items to eat/drink</div>
      </div>
    </div>
  );
}
