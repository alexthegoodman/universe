#!/usr/bin/env tsx

import { config } from "dotenv";
import Replicate from "replicate";
import fetch from "node-fetch";
import fs from "fs/promises";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// Load environment variables
config();

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

if (!REPLICATE_API_TOKEN) {
  console.error(
    "Error: REPLICATE_API_TOKEN not found in environment variables"
  );
  process.exit(1);
}

const replicate = new Replicate({
  auth: REPLICATE_API_TOKEN,
});

async function downloadFile(url: string, filepath: string): Promise<void> {
  console.log(`Downloading ${url} to ${filepath}`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.status}`);
  }

  const buffer = await response.arrayBuffer();
  await fs.writeFile(filepath, Buffer.from(buffer));
  console.log(`File saved to ${filepath}`);
}

async function saveReadableStream(
  stream: ReadableStream,
  filepath: string
): Promise<void> {
  console.log(`Saving stream to ${filepath}`);

  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    // Combine all chunks into a single buffer
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const buffer = new Uint8Array(totalLength);
    let offset = 0;

    for (const chunk of chunks) {
      buffer.set(chunk, offset);
      offset += chunk.length;
    }

    await fs.writeFile(filepath, buffer);
    console.log(`Stream saved to ${filepath}`);
  } finally {
    reader.releaseLock();
  }
}

async function optimizeMesh(
  inputPath: string,
  outputPath: string
): Promise<void> {
  console.log(
    `🔧 Optimizing mesh with gltfpack: ${inputPath} -> ${outputPath}`
  );

  try {
    // Use gltfpack with aggressive optimization settings
    // -cc: compress colors and normals
    // -tc: compress textures with high quality
    // -si 0.1: simplify geometry to 10% of original vertex count
    // -slb 1: enable simplification lockdown borders
    // -noq: disable quantization warnings
    // -v: verbose output
    const { stdout, stderr } = await execAsync(
      `gltfpack -i "${inputPath}" -o "${outputPath}" -cc -si 0.1 -slb -noq -v`
    );

    if (stdout) {
      console.log(`gltfpack output: ${stdout}`);
    }
    if (stderr) {
      console.warn(`gltfpack warnings: ${stderr}`);
    }

    console.log(`✅ Mesh optimization completed: ${outputPath}`);
  } catch (error) {
    console.error(`❌ Mesh optimization failed:`, error);
    // If optimization fails, copy the original file
    await fs.copyFile(inputPath, outputPath);
    console.log(`📋 Using original file instead: ${outputPath}`);
  }
}

async function generateImage(prompt: string): Promise<string> {
  console.log("🎨 Generating image with Imagen 4 Fast...");

  const input = {
    prompt: prompt,
    aspect_ratio: "1:1",
    output_format: "jpg",
    safety_filter_level: "block_only_high",
  };

  const output = (await replicate.run("google/imagen-4-fast", {
    input,
  })) as any;

  // Extract URL from output
  const imageUrl =
    typeof output === "string" ? output : output.url?.() || output[0];
  console.log(`Generated image: ${imageUrl}`);

  return imageUrl;
}

async function removeBackground(imageUrl: string): Promise<string> {
  console.log("✂️ Removing background...");

  const output = (await replicate.run(
    "851-labs/background-remover:a029dff38972b5fda4ec5d75d7d1cd25aeff621d2cf4946a41055d7db66b80bc",
    {
      input: {
        image: imageUrl,
        format: "png",
        reverse: false,
        threshold: 0,
        background_type: "rgba",
      },
    }
  )) as any;

  const cleanImageUrl =
    typeof output === "string" ? output : output.url?.() || output[0];
  console.log(`Background removed: ${cleanImageUrl}`);

  return cleanImageUrl;
}

async function generate3DModel(imageUrl: string): Promise<any> {
  console.log("🎯 Generating 3D model with Trellis...");

  const output = (await replicate.run(
    "firtoz/trellis:e8f6c45206993f297372f5436b90350817bd9b4a0d52d2a76df50c1c8afa2b3c",
    {
      input: {
        seed: 0,
        images: [imageUrl],
        texture_size: 512,
        mesh_simplify: 0.98,
        generate_color: true,
        generate_model: true,
        randomize_seed: true,
        generate_normal: false,
        save_gaussian_ply: true,
        ss_sampling_steps: 38,
        slat_sampling_steps: 12,
        return_no_background: true,
        ss_guidance_strength: 7.5,
        slat_guidance_strength: 3,
      },
    }
  )) as any;

  console.log("Trellis output received");
  return output;
}

// Strategic model list - reusable models across similar resources
const MODEL_PROMPTS = [
  // Generic shapes that can be reused across multiple resource types
  {
    name: "generic_rock",
    prompt:
      "simple smooth gray rock, mineral stone, clean background, 3D model style",
    reusableFor: [
      "granite",
      "limestone",
      "sandstone",
      "slate",
      "iron_ore",
      "copper_ore",
      "tin_ore",
    ],
  },
  {
    name: "crystal_gem",
    prompt:
      "faceted crystal gem, transparent and shiny, clean background, 3D model style",
    reusableFor: ["quartz_crystal", "amethyst", "ruby", "emerald", "diamond"],
  },
  {
    name: "wood_log",
    prompt:
      "natural wood log, brown bark texture, clean background, 3D model style",
    reusableFor: ["oak_wood", "pine_wood", "birch_wood", "cedar_wood"],
  },
  {
    name: "small_berry",
    prompt:
      "cluster of small round berries, fresh and colorful, clean background, 3D model style",
    reusableFor: ["blueberries", "blackberries", "raspberries", "elderberries"],
  },
  {
    name: "tree_fruit",
    prompt:
      "round tree fruit, smooth skin, natural colors, clean background, 3D model style",
    reusableFor: ["apples", "pears", "cherries", "plums"],
  },
  {
    name: "nut_seed",
    prompt:
      "natural nut or seed, brown shell, organic shape, clean background, 3D model style",
    reusableFor: ["acorns", "walnuts", "hazelnuts", "chestnuts", "pine_nuts"],
  },
  {
    name: "leafy_herb",
    prompt:
      "green leafy herb plant, fresh leaves, natural growth, clean background, 3D model style",
    reusableFor: [
      "chamomile",
      "lavender",
      "mint",
      "sage",
      "rosemary",
      "thyme",
      "oregano",
      "basil",
    ],
  },
  {
    name: "spice_powder",
    prompt:
      "pile of ground spice powder, earthy colors, fine texture, clean background, 3D model style",
    reusableFor: [
      "black_pepper",
      "white_pepper",
      "paprika",
      "cayenne",
      "chili",
      "cinnamon",
      "nutmeg",
    ],
  },
  {
    name: "grain_seeds",
    prompt:
      "pile of small grain seeds, golden brown color, natural texture, clean background, 3D model style",
    reusableFor: ["wild_rice", "barley", "wheat", "oats", "millet"],
  },
  {
    name: "root_vegetable",
    prompt:
      "natural root vegetable, earth tones, organic shape, clean background, 3D model style",
    reusableFor: ["wild_carrots", "wild_onions", "turnips", "radishes"],
  },
  {
    name: "fiber_material",
    prompt:
      "bundle of natural fiber strands, soft texture, neutral colors, clean background, 3D model style",
    reusableFor: ["cotton", "wool", "silk", "hemp", "flax"],
  },
  {
    name: "precious_metal",
    prompt:
      "chunk of precious metal ore, metallic sheen, reflective surface, clean background, 3D model style",
    reusableFor: ["gold_ore", "silver_ore"],
  },
  {
    name: "mystical_element",
    prompt:
      "magical glowing element, ethereal appearance, supernatural aura, clean background, 3D model style",
    reusableFor: [
      "meteorite_fragment",
      "lightning_glass",
      "moonstone",
      "dragon_scale",
      "phoenix_feather",
    ],
  },
  {
    name: "organic_substance",
    prompt:
      "natural organic substance, amber or golden color, translucent, clean background, 3D model style",
    reusableFor: ["honeycomb", "beeswax", "resin", "sap", "amber"],
  },
  {
    name: "animal_product",
    prompt:
      "natural animal product, leather texture, brown tones, clean background, 3D model style",
    reusableFor: ["animal_hide", "leather", "fur", "feathers", "bone"],
  },
];

async function runModelGeneration() {
  console.log(
    `🚀 Starting batch 3D model generation for ${MODEL_PROMPTS.length} models`
  );

  for (const modelConfig of MODEL_PROMPTS) {
    await generateModelForConfig(modelConfig);
  }

  console.log(`✅ Batch generation completed!`);
}

async function generateModelForConfig(modelConfig: {
  name: string;
  prompt: string;
  reusableFor: string[];
}) {
  console.log(`\n🎯 Generating model: ${modelConfig.name}`);
  console.log(`📝 Prompt: ${modelConfig.prompt}`);
  console.log(`♻️  Reusable for: ${modelConfig.reusableFor.join(", ")}`);

  const timestamp = Date.now();
  const outputDir = path.join(
    process.cwd(),
    "output",
    "models",
    modelConfig.name
  );

  // Create output directory
  await fs.mkdir(outputDir, { recursive: true });

  try {
    // Step 1: Generate image
    const originalImageUrl = await generateImage(modelConfig.prompt);
    const originalImagePath = path.join(outputDir, "1_original_image.jpg");
    await downloadFile(originalImageUrl, originalImagePath);

    // Step 2: Remove background
    const cleanImageUrl = await removeBackground(originalImageUrl);
    const cleanImagePath = path.join(outputDir, "2_clean_image.png");
    await downloadFile(cleanImageUrl, cleanImagePath);

    // Step 3: Generate 3D model with Trellis
    const trellisOutput = await generate3DModel(cleanImageUrl);

    // Step 4: Save and optimize the model
    if (trellisOutput.model_file) {
      const originalModelPath = path.join(outputDir, "3_original_model.glb");
      const optimizedModelPath = path.join(
        outputDir,
        `${modelConfig.name}_optimized.glb`
      );

      await saveReadableStream(trellisOutput.model_file, originalModelPath);
      await optimizeMesh(originalModelPath, optimizedModelPath);
    }

    console.log(`✅ Model generation completed: ${modelConfig.name}`);
    console.log(`📁 Output directory: ${outputDir}`);
    console.log(`📋 Files generated:`);
    console.log(`   - Original image: 1_original_image.jpg`);
    console.log(`   - Clean image: 2_clean_image.png`);
    console.log(`   - Original model: 3_original_model.glb`);
    console.log(`   - Optimized model: ${modelConfig.name}_optimized.glb`);
  } catch (error) {
    console.error(`❌ Model generation failed for ${modelConfig.name}:`, error);
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log("🤖 No arguments provided. Running batch model generation...");
    await runModelGeneration();
    return;
  }

  const prompt = args.join(" ");
  const timestamp = Date.now();
  const promptSanitized = prompt
    .replace(/[^a-zA-Z0-9_ ]/g, "_") // Replace non-alphanumeric characters with underscores
    .replace(/\s+/g, "_") // Replace spaces with underscores
    .toLowerCase();
  const outputDir = path.join(
    process.cwd(),
    "output",
    "single_models",
    promptSanitized
  );

  // Create output directory
  await fs.mkdir(outputDir, { recursive: true });

  try {
    console.log(`🚀 Starting 3D pipeline for prompt: "${prompt}"`);
    console.log(`📁 Output directory: ${outputDir}`);
    console.log();

    // Step 1: Generate image
    const originalImageUrl = await generateImage(prompt);
    const originalImagePath = path.join(outputDir, "1_original_image.jpg");
    await downloadFile(originalImageUrl, originalImagePath);

    // Step 2: Remove background
    const cleanImageUrl = await removeBackground(originalImageUrl);
    const cleanImagePath = path.join(outputDir, "2_clean_image.png");
    await downloadFile(cleanImageUrl, cleanImagePath);

    // Step 3: Generate 3D model with Trellis
    const trellisOutput = await generate3DModel(cleanImageUrl);

    // Save and optimize the Trellis model
    if (trellisOutput.model_file) {
      const originalModelPath = path.join(
        outputDir,
        `${promptSanitized}_original.glb`
      );
      const optimizedModelPath = path.join(
        outputDir,
        `${promptSanitized}_optimized.glb`
      );

      await saveReadableStream(trellisOutput.model_file, originalModelPath);
      await optimizeMesh(originalModelPath, optimizedModelPath);
    }

    // if (trellisOutput.gaussian_ply) {
    //   const plyPath = path.join(outputDir, "3_gaussian.ply");
    //   await saveReadableStream(trellisOutput.gaussian_ply, plyPath);
    // }

    // if (trellisOutput.color_video) {
    //   const colorVideoPath = path.join(outputDir, "3_color_video.mp4");
    //   await saveReadableStream(trellisOutput.color_video, colorVideoPath);
    // }

    // if (
    //   trellisOutput.no_background_images &&
    //   trellisOutput.no_background_images.length > 0
    // ) {
    //   for (let i = 0; i < trellisOutput.no_background_images.length; i++) {
    //     const imagePath = path.join(outputDir, `3_no_bg_${i}.png`);
    //     await saveReadableStream(
    //       trellisOutput.no_background_images[i],
    //       imagePath
    //     );
    //   }
    // }

    console.log();
    console.log("✅ Pipeline completed successfully!");
    console.log("📋 Summary:");
    console.log(`   Prompt: "${prompt}"`);
    console.log(`   Output folder: ${outputDir}`);
    console.log(`   Files generated:`);
    console.log(`     - Original image: 1_original_image.jpg`);
    console.log(`     - Clean image: 2_clean_image.png`);
    if (trellisOutput.model_file) {
      console.log(`     - Original model: ${promptSanitized}_original.glb`);
      console.log(`     - Optimized model: ${promptSanitized}_optimized.glb`);
    }
    // if (trellisOutput.gaussian_ply)
    //   console.log(`     - Gaussian splat: 3_gaussian.ply`);
    // if (trellisOutput.color_video)
    //   console.log(`     - Color video: 3_color_video.mp4`);
    // if (trellisOutput.no_background_images)
    //   console.log(`     - No-bg images: 3_no_bg_*.png`);
    console.log();
  } catch (error) {
    console.error("❌ Pipeline failed:", error);

    if (error instanceof Error) {
      console.error("Error details:", error.message);
      if (error.stack) {
        console.error("Stack trace:", error.stack);
      }
    }

    process.exit(1);
  }
}

// Run the pipeline
main().catch(console.error);
