"use client";

import { useRef, useState, Suspense } from "react";
import { useFrame } from "@react-three/fiber";
import { Mesh } from "three";
import { useGLTF } from "@react-three/drei";
import type { WorldResource, ResourceType } from "../lib/game-manager";

interface Resource3DProps {
  resource: WorldResource;
  onClick?: (resource: WorldResource) => void;
}

// Model mapping based on the generate-model-pipeline.ts reusableFor arrays
const RESOURCE_MODEL_MAP: Record<ResourceType, string> = {
  // Minerals & Stones -> generic_rock
  granite: "generic_rock_optimized.glb",
  limestone: "generic_rock_optimized.glb",
  sandstone: "generic_rock_optimized.glb",
  slate: "generic_rock_optimized.glb",
  marble: "generic_rock_optimized.glb",
  obsidian: "generic_rock_optimized.glb",
  iron_ore: "generic_rock_optimized.glb",
  copper_ore: "generic_rock_optimized.glb",
  tin_ore: "generic_rock_optimized.glb",
  coal: "generic_rock_optimized.glb",
  salt: "generic_rock_optimized.glb",

  // Precious metals -> precious_metal
  gold_ore: "precious_metal_optimized.glb",
  silver_ore: "precious_metal_optimized.glb",

  // Crystals & Gems -> crystal_gem
  quartz_crystal: "crystal_gem_optimized.glb",
  amethyst: "crystal_gem_optimized.glb",
  ruby: "crystal_gem_optimized.glb",
  emerald: "crystal_gem_optimized.glb",
  diamond: "crystal_gem_optimized.glb",

  // Wood types -> wood_log
  oak_wood: "wood_log_optimized.glb",
  pine_wood: "wood_log_optimized.glb",
  birch_wood: "wood_log_optimized.glb",
  cedar_wood: "wood_log_optimized.glb",
  bamboo: "wood_log_optimized.glb",

  // Fibers -> fiber_material
  cotton: "fiber_material_optimized.glb",
  wool: "fiber_material_optimized.glb",
  silk: "fiber_material_optimized.glb",
  hemp: "fiber_material_optimized.glb",
  flax: "fiber_material_optimized.glb",

  // Animal products -> animal_product
  animal_hide: "animal_product_optimized.glb",
  leather: "animal_product_optimized.glb",
  fur: "animal_product_optimized.glb",
  feathers: "animal_product_optimized.glb",
  bone: "animal_product_optimized.glb",

  // Organic substances -> organic_substance
  honeycomb: "organic_substance_optimized.glb",
  beeswax: "organic_substance_optimized.glb",
  resin: "organic_substance_optimized.glb",
  sap: "organic_substance_optimized.glb",
  amber: "organic_substance_optimized.glb",
  moss: "organic_substance_optimized.glb",

  // Berries -> small_berry
  blueberries: "small_berry_optimized.glb",
  strawberries: "small_berry_optimized.glb",
  blackberries: "small_berry_optimized.glb",
  raspberries: "small_berry_optimized.glb",
  elderberries: "small_berry_optimized.glb",

  // Tree fruits -> tree_fruit
  apples: "tree_fruit_optimized.glb",
  pears: "tree_fruit_optimized.glb",
  cherries: "tree_fruit_optimized.glb",
  plums: "tree_fruit_optimized.glb",
  grapes: "tree_fruit_optimized.glb",

  // Nuts & seeds -> nut_seed
  acorns: "nut_seed_optimized.glb",
  walnuts: "nut_seed_optimized.glb",
  hazelnuts: "nut_seed_optimized.glb",
  chestnuts: "nut_seed_optimized.glb",
  pine_nuts: "nut_seed_optimized.glb",

  // Root vegetables -> root_vegetable
  wild_carrots: "root_vegetable_optimized.glb",
  wild_onions: "root_vegetable_optimized.glb",
  turnips: "root_vegetable_optimized.glb",
  radishes: "root_vegetable_optimized.glb",
  mushrooms: "root_vegetable_optimized.glb",

  // Grains -> grain_seeds
  wild_rice: "grain_seeds_optimized.glb",
  barley: "grain_seeds_optimized.glb",
  wheat: "grain_seeds_optimized.glb",
  oats: "grain_seeds_optimized.glb",
  millet: "grain_seeds_optimized.glb",

  // Medicinal herbs -> leafy_herb
  aloe_vera: "leafy_herb_optimized.glb",
  chamomile: "leafy_herb_optimized.glb",
  echinacea: "leafy_herb_optimized.glb",
  ginseng: "leafy_herb_optimized.glb",
  willow_bark: "leafy_herb_optimized.glb",
  ginkgo: "leafy_herb_optimized.glb",
  guarana: "leafy_herb_optimized.glb",
  green_tea: "leafy_herb_optimized.glb",
  yerba_mate: "leafy_herb_optimized.glb",
  gotu_kola: "leafy_herb_optimized.glb",
  lavender: "leafy_herb_optimized.glb",
  valerian: "leafy_herb_optimized.glb",
  passionflower: "leafy_herb_optimized.glb",
  lemon_balm: "leafy_herb_optimized.glb",
  sage: "leafy_herb_optimized.glb",
  elderflower: "leafy_herb_optimized.glb",
  astragalus: "leafy_herb_optimized.glb",
  cats_claw: "leafy_herb_optimized.glb",
  turmeric: "leafy_herb_optimized.glb",
  garlic: "leafy_herb_optimized.glb",

  // Spices -> spice_powder
  black_pepper: "spice_powder_optimized.glb",
  mint: "spice_powder_optimized.glb",
  rosemary: "spice_powder_optimized.glb",
  thyme: "spice_powder_optimized.glb",
  oregano: "spice_powder_optimized.glb",
  basil: "spice_powder_optimized.glb",
  paprika: "spice_powder_optimized.glb",
  chili: "spice_powder_optimized.glb",
  white_pepper: "spice_powder_optimized.glb",
  cayenne: "spice_powder_optimized.glb",
  cinnamon: "spice_powder_optimized.glb",
  nutmeg: "spice_powder_optimized.glb",
  allspice: "spice_powder_optimized.glb",
  cloves: "spice_powder_optimized.glb",
  cardamom: "spice_powder_optimized.glb",

  // Rare elements -> mystical_element
  meteorite_fragment: "mystical_element_optimized.glb",
  lightning_glass: "mystical_element_optimized.glb",
  volcanic_ash: "mystical_element_optimized.glb",
  glacier_ice: "mystical_element_optimized.glb",
  coral: "mystical_element_optimized.glb",
  pearl: "mystical_element_optimized.glb",
  jade: "mystical_element_optimized.glb",
  moonstone: "mystical_element_optimized.glb",
  ancient_fossil: "mystical_element_optimized.glb",
  dragon_scale: "mystical_element_optimized.glb",
  phoenix_feather: "mystical_element_optimized.glb",
};

// Fallback model for any unmapped resources
const FALLBACK_MODEL = "generic_rock_optimized.glb";

// Component to load and display a 3D model
function Model3D({
  modelPath,
  scale = 1,
  position = [0, 0, 0],
  resource,
}: {
  modelPath: string;
  scale?: number;
  position?: [number, number, number];
  resource: WorldResource;
}) {
  const gltf = useGLTF(`/models/${modelPath}`);
  const meshRef = useRef<Mesh>(null);

  // // Apply material modifications based on resource properties
  // const modifyMaterial = () => {
  //   if (!gltf.scene) return;

  //   gltf.scene.traverse((child: any) => {
  //     if (child.isMesh && child.material) {
  //       // Adjust material based on resource rarity and quality
  //       const rarityIntensity = {
  //         common: 0.8,
  //         uncommon: 0.9,
  //         rare: 1.0,
  //         epic: 1.1,
  //         legendary: 1.2,
  //       }[resource.rarity];

  //       // Enhance materials for higher rarity
  //       if (resource.rarity === "legendary" || resource.rarity === "epic") {
  //         child.material.emissive.setHex(0x222244);
  //         child.material.emissiveIntensity = 0.1 * rarityIntensity;
  //       }

  //       // Apply quality-based transparency
  //       const opacity =
  //         resource.quantity > 0 ? 0.85 + (resource.quality / 100) * 0.15 : 0.3;
  //       child.material.transparent = true;
  //       child.material.opacity = opacity;

  //       // Special effects for magical resources
  //       if (resource.traits?.magical && resource.traits.magical > 70) {
  //         child.material.emissive.setHex(0x8b5cf6);
  //         child.material.emissiveIntensity = 0.2;
  //       }
  //     }
  //   });
  // };

  // modifyMaterial();

  return (
    <primitive
      ref={meshRef}
      object={gltf.scene.clone()}
      scale={[scale, scale, scale]}
      position={position}
    />
  );
}

export function Resource3D({ resource, onClick }: Resource3DProps) {
  const [hovered, setHovered] = useState(false);

  // Get the appropriate model for this resource type
  const modelPath = RESOURCE_MODEL_MAP[resource.type] || FALLBACK_MODEL;

  // Calculate scale based on rarity and category
  const getModelScale = () => {
    const rarityMultiplier = {
      common: 0.8,
      uncommon: 0.9,
      rare: 1.0,
      epic: 1.1,
      legendary: 1.2,
    }[resource.rarity];

    const categoryBase = (() => {
      switch (resource.category) {
        case "minerals_stones":
          return 1.7;
        case "organic_materials":
          return 1.8;
        case "edible_plants":
          return 2.8;
        case "medicinal_herbs":
          return 2.6;
        case "spices_seasonings":
          return 1.5;
        case "rare_elements":
          return 1.5;
        default:
          return 1.5;
      }
    })();

    const hoverMultiplier = hovered ? 1.1 : 1.0;
    return categoryBase * rarityMultiplier * hoverMultiplier;
  };

  const modelScale = getModelScale();
  const modelHeight = modelScale; // Approximate height for positioning indicators

  return (
    <group
      position={[resource.position.x, resource.position.y, resource.position.z]}
      onClick={() => onClick?.(resource)}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {/* Main 3D Model */}
      <Suspense
        fallback={
          <mesh>
            <sphereGeometry args={[0.3, 8, 6]} />
            <meshStandardMaterial color="#6b7280" transparent opacity={0.5} />
          </mesh>
        }
      >
        <Model3D modelPath={modelPath} scale={modelScale} resource={resource} />
      </Suspense>

      {/* Resource quantity indicator */}
      {resource.quantity > 0 && (
        <mesh position={[0, modelHeight + 0.3, 0]}>
          <sphereGeometry args={[0.1, 8, 6]} />
          <meshStandardMaterial color="#ffffff" transparent opacity={0.9} />
        </mesh>
      )}

      {/* Harvestable indicator */}
      {resource.harvestable && resource.quantity > 0 && (
        <mesh
          position={[0, modelHeight + 0.1, 0]}
          rotation={[0, 0, Math.PI / 4]}
        >
          <boxGeometry args={[0.2, 0.02, 0.02]} />
          <meshStandardMaterial color="#fbbf24" />
        </mesh>
      )}

      {/* Special trait indicators */}
      {resource.traits?.magical && resource.traits.magical > 70 && (
        <pointLight
          position={[0, 0, 0]}
          color="#a855f7"
          intensity={0.3}
          distance={3}
        />
      )}

      {resource.traits?.beautiful && resource.traits.beautiful > 80 && (
        <mesh position={[0, modelHeight + 0.4, 0]}>
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
        <mesh
          position={[0, modelHeight + 0.2, 0]}
          rotation={[0, 0, Math.PI / 4]}
        >
          <boxGeometry args={[0.15, 0.02, 0.02]} />
          <meshStandardMaterial
            color="#8b5a3c"
            emissive="#8b5a3c"
            emissiveIntensity={0.2}
          />
        </mesh>
      )}
    </group>
  );
}
