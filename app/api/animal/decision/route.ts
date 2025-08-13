import { NextRequest, NextResponse } from "next/server";
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { animal, worldState } = body;

    console.log(
      `🧠 AI decision request for ${animal?.name || "unknown animal"}`
    );

    if (!animal || !worldState) {
      return NextResponse.json(
        { error: "Missing required fields: animal, worldState" },
        { status: 400 }
      );
    }

    // Check for API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      // Return a fallback decision when no API key is available
      const fallbackAction = getFallbackAction(animal);
      return NextResponse.json({ action: fallbackAction });
    }

    const llm = new ChatOpenAI({
      model: "gpt-4o-mini",
      temperature: 0.7,
      openAIApiKey: apiKey,
      modelKwargs: {
        response_format: { type: "json_object" }
      }
    });

    const prompt = ChatPromptTemplate.fromTemplate(`
You are an intelligent virtual animal named {name} with the following characteristics:

DNA Traits:
- Intelligence: {intelligence}/100
- Agility: {agility}/100  
- Strength: {strength}/100
- Social: {social}/100
- Curiosity: {curiosity}/100
- Resilience: {resilience}/100

Personality:
- Aggressive: {aggressive}/100
- Playful: {playful}/100
- Cautious: {cautious}/100
- Nurturing: {nurturing}/100

Current Stats:
- Health: {health}/100
- Hunger: {hunger}/100
- Energy: {energy}/100
- Happiness: {happiness}/100
- Thirst: {thirst}/100

Current Age: {age}% of lifespan
Current Action: {currentAction}

Current Inventory:
{inventory}

World State:
{worldState}

Based on your traits, current needs, and the world around you, what should you do next?

Available actions: idle, moving, eating, drinking, sleeping, playing, exploring, socializing, working, mating, harvesting

IMPORTANT SURVIVAL RULES:
- You can only eat/drink if you have food/water items in your inventory  
- You can see resources within {sightRadius} units of your position
- You can harvest resources when within {harvestRadius} units
- Check nearbyResources for what you can see around you
- Look for resources marked as "canHarvestNow: true" to harvest immediately
- Resources marked as "tooFarToHarvest: true" need you to move closer first
- Only choose "eating" if you have food/berries in inventory
- Only choose "drinking" if you have water in inventory
- Choose "harvesting" when you see canHarvestNow resources and need them (specify which resource by ID)
- Choose "exploring" to search for resources when you can't see any suitable ones
- Use resourceSummary to quickly understand what's available nearby

ACTION PRIORITY:
1. If hungry/thirsty with inventory items → eat/drink
2. If hungry/thirsty with canHarvestNow resources → harvest them
3. If hungry/thirsty but resources are too far → explore to get closer
4. If no suitable resources visible → explore to find new areas
5. If needs are met → recreational activities based on personality

EXPLORATION GUIDANCE:
Your current position is: {currentPosition}
If you choose "exploring", specify where to go by providing coordinates within 20 units of your current position.
Consider moving towards areas you haven't explored, towards distant resources, or in directions that match your goals.

IMPORTANT: You must respond with valid JSON in this exact format:
{{
  "action": "action_name",
  "target": {{
    "x": number,
    "z": number
  }},
  "reasoning": "brief explanation of choice"
}}

For non-exploration actions, omit the "target" field:
{{
  "action": "eating",
  "reasoning": "I'm hungry and have food in inventory"
}}

For harvesting actions, include the resourceId:
{{
  "action": "harvesting",
  "resourceId": "resource_12345",
  "reasoning": "I need water and there's a water source I can harvest now"
}}

For exploration actions, include target coordinates (must be within 20 units):
{{
  "action": "exploring", 
  "target": {{
    "x": 15.5,
    "z": 25.0
  }},
  "reasoning": "Moving towards unexplored area to the northeast"
}}

Valid actions: idle, moving, eating, drinking, sleeping, playing, exploring, socializing, working, mating, harvesting

Consider:
- Check your inventory first before choosing survival actions
- Use the distance and direction info to understand your surroundings  
- Prioritize closer resources when multiple options are available
- If health/energy are low, prioritize sleeping
- If stats are good, consider recreational activities based on personality
    `);

    const chain = prompt.pipe(llm).pipe(new StringOutputParser());

    // Format inventory for the prompt
    const inventoryDescription =
      animal.inventory.items.length === 0
        ? "Empty inventory (0 items)"
        : `${animal.inventory.items.length} items (${
            animal.inventory.currentWeight
          }/${animal.inventory.maxCapacity} weight):
${animal.inventory.items
  .map(
    (item: any) => `- ${item.name} x${item.quantity} (quality: ${item.quality})`
  )
  .join("\n")}`;

    const response = await chain.invoke({
      name: animal.name,
      intelligence: animal.dna.intelligence,
      agility: animal.dna.agility,
      strength: animal.dna.strength,
      social: animal.dna.social,
      curiosity: animal.dna.curiosity,
      resilience: animal.dna.resilience,
      aggressive: animal.dna.personality.aggressive,
      playful: animal.dna.personality.playful,
      cautious: animal.dna.personality.cautious,
      nurturing: animal.dna.personality.nurturing,
      health: animal.stats.health,
      hunger: animal.stats.hunger,
      energy: animal.stats.energy,
      happiness: animal.stats.happiness,
      thirst: animal.stats.thirst,
      age: Math.round(animal.age * 100),
      currentAction: animal.currentAction,
      inventory: inventoryDescription,
      sightRadius: worldState.sightRadius,
      harvestRadius: worldState.harvestRadius,
      currentPosition: `x:${animal.position.x.toFixed(1)} z:${animal.position.z.toFixed(1)}`,
      worldState: JSON.stringify(worldState, null, 2),
    });

    // Parse JSON response
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(response);
    } catch (error) {
      console.error("Failed to parse AI JSON response:", response);
      // Fallback: try to extract action from response text
      const validActions = [
        "moving", "eating", "drinking", "sleeping", "playing", 
        "exploring", "socializing", "working", "mating", "harvesting", "idle"
      ];
      const action = validActions.find(action => response.toLowerCase().includes(action)) || "idle";
      return NextResponse.json({ action });
    }

    const action = parsedResponse.action;
    let explorationTarget = null;

    // Validate action
    const validActions = [
      "moving", "eating", "drinking", "sleeping", "playing", 
      "exploring", "socializing", "working", "mating", "harvesting", "idle"
    ];

    const finalAction = validActions.includes(action) ? action : "idle";

    // Handle exploration target if present
    if (finalAction === "exploring" && parsedResponse.target) {
      const targetX = parseFloat(parsedResponse.target.x);
      const targetZ = parseFloat(parsedResponse.target.z);
      
      if (!isNaN(targetX) && !isNaN(targetZ)) {
        // Validate coordinates are within 20 units of current position
        const distance = Math.sqrt(
          Math.pow(targetX - animal.position.x, 2) + 
          Math.pow(targetZ - animal.position.z, 2)
        );
        
        if (distance <= 20) {
          explorationTarget = { x: targetX, z: targetZ };
        } else {
          // Limit to 20 units in the direction of the target
          const angle = Math.atan2(targetZ - animal.position.z, targetX - animal.position.x);
          explorationTarget = {
            x: animal.position.x + Math.cos(angle) * 20,
            z: animal.position.z + Math.sin(angle) * 20
          };
        }
      }
    }

    const result: any = { 
      action: finalAction,
      reasoning: parsedResponse.reasoning || "No reasoning provided"
    };
    
    if (finalAction === "exploring" && explorationTarget) {
      result.explorationTarget = explorationTarget;
    }
    
    if (finalAction === "harvesting" && parsedResponse.resourceId) {
      result.resourceId = parsedResponse.resourceId;
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in animal decision API:", error);

    // Return fallback decision on error
    const body = await request.json().catch(() => ({}));
    const fallbackAction = getFallbackAction(body.animal);

    return NextResponse.json({
      action: fallbackAction,
      error: "AI decision failed, using fallback",
    });
  }
}

function getFallbackAction(animal: any) {
  if (!animal) return "idle";

  // Simple rule-based fallback when AI is unavailable
  if (animal.stats?.health < 30) return "sleeping";

  // Check inventory before eating/drinking
  if (animal.stats?.thirst > 70) {
    const hasWater = animal.inventory?.items?.some(
      (item: any) => item.type === "water" && item.quantity > 0
    );
    if (hasWater) {
      return "drinking";
    } else {
      return "exploring"; // Need to find water sources
    }
  }

  if (animal.stats?.hunger > 70) {
    const hasFood = animal.inventory?.items?.some(
      (item: any) =>
        (item.type === "food" || item.type === "berries") && item.quantity > 0
    );
    if (hasFood) {
      return "eating";
    } else {
      return "exploring"; // Need to find food sources
    }
  }

  if (animal.stats?.energy < 30) return "sleeping";
  if (animal.stats?.happiness < 30) return "playing";

  // Based on personality
  if (animal.dna?.personality?.playful > 70) return "playing";
  if (animal.dna?.curiosity > 70) return "exploring";
  if (animal.dna?.social > 70) return "socializing";

  return "idle";
}
