import { NextRequest, NextResponse } from "next/server";
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { serverPlanningHelper } from "../../../lib/server-planning-helper";

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

    // Check if we need a new plan and get context
    const { existingPlan, needsNewPlan } = body; // Client passes this info
    const shouldCreateNewPlan =
      needsNewPlan ||
      serverPlanningHelper.shouldCreateNewPlan(
        animal,
        worldState,
        existingPlan
      );
    const planningContext = serverPlanningHelper.getPlanningContext(
      animal,
      worldState
    );
    const planningInsights = existingPlan
      ? `Current plan: ${existingPlan.planType} (${
          existingPlan.steps?.length || 0
        } steps)`
      : "No current plan";
    const sleepCheck = serverPlanningHelper.canSleep(animal, worldState);

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
        response_format: { type: "json_object" },
      },
    });

    const prompt = ChatPromptTemplate.fromTemplate(`
You are an intelligent virtual animal named {name} (and the timestamp is {timestamp}) with the following characteristics:

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

Based on your traits, current needs, and the world around you, what PLAN should you create for the next 3-7 turns?

You MUST create strategic multi-step plans, NOT individual actions. Think about sequences like:
- "gather materials → build shelter → sleep to restore energy"
- "find water → drink → explore for food → eat"
- "harvest stone → harvest wood → create building → improve building"

Consider your recent failures and avoid repeating mistakes. Plan around your constraints:
- Full inventory means you need to consume items before harvesting more
- Low energy requires shelter building before you can sleep
- Critical needs (thirst/hunger) should be prioritized in your plan

If you are close to the middle of your lifespan, consider breeding plans.

Be wise. For example, if you are in need of one or more resources, then you will want to travel nearby each resource before harvesting each resource.

Available plan actions: idle, moving, eating, drinking, sleeping, playing, exploring, socializing, working, mating, harvesting, building

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
- You feel good and satisfied about your stats if they are above 30/100 (this is when you begin to consider various actions)

CRITICAL SLEEPING CONSTRAINT:
{sleepConstraint}
- Sleep provides MASSIVE energy restoration (40+ energy points) but requires shelter
- If you need to sleep but lack shelter, prioritize building or finding buildings IMMEDIATELY
- Energy below 30 without shelter is a CRISIS requiring urgent building action

PLANNING PRIORITY:
1. SURVIVAL PLANS: Address critical needs (thirst>70, hunger>70, energy<30, health<30) 
2. BUILDING PLANS: If you have materials or can gather them, plan shelter construction
3. RESOURCE GATHERING PLANS: Plan sequences to collect stone, wood, food, water
4. EXPLORATION PLANS: Systematic exploration for resources and opportunities  
5. SOCIAL/RECREATION PLANS: When survival needs are met, plan social activities

PLAN STRUCTURE: Each step should have a clear purpose that builds toward your goals.

EXPLORATION GUIDANCE:
Your current position is: {currentPosition}
If you choose "exploring", specify where to go by providing coordinates within 20 units of your current position.
Consider moving towards areas you haven't explored, towards distant resources, or in directions that match your goals.

MEMORY & EXPERIENCE:
Check your memories.recentFailures before attempting actions that have recently failed.
- If you recently failed to harvest due to low energy, consider sleeping or eating first
- If you failed due to being too far, move closer before attempting again
- If you failed due to full inventory, consider eating/drinking items to make space
- Learn from your past failures and avoid repeating the same mistakes in the same locations

PLANNING SYSTEM:
{planningInsights}
{planGeneration}
- You should think 3-10 turns ahead and create strategic plans
- Consider the consequences of your current action choice
- Balance immediate needs with longer-term goals like shelter, safety, and comfort
- Plan building projects when you have or can gather sufficient materials
- Remember that sleeping gives huge benefits but requires shelter - plan accordingly!

BUILDING SYSTEM:
- Buildings provide shelter, comfort, and happiness bonuses when you rest inside them
- Check nearbyBuildings to see structures you can interact with or enter
- You can create new buildings or modify existing ones if you have materials
- Building requires stone and wood from your inventory
- Available building actions:
  • "create_building" - Build new shelter (needs 2 stone + 2 wood)
  • "make_wider" - Expand building width (needs 2 stone + 2 wood)  
  • "make_taller" - Increase building height (needs 2 stone + 2 wood)
  • "make_beautiful" - Add decorative elements (needs 1 stone + 1 wood)
  • "add_room" - Construct additional space (needs 2 stone + 2 wood)
- Consider building when you have collected enough materials and want long-term shelter
- Buildings help during sleep and provide protection from the elements

IMPORTANT: You must respond with valid JSON in this exact format:

{planGeneration}

ALWAYS INCLUDE A PLAN when creating new plans. Use this format:
{{
  "plan": {{
    "steps": [
      {{
        "action": "harvesting",
        "priority": 9,
        "turnOffset": 0,
        "reason": "Need stone for building",
        "parameters": {{
          "resourceId": "stone_123"
        }}
      }},
      {{
        "action": "building", 
        "priority": 10,
        "turnOffset": 1,
        "reason": "Create shelter for sleeping",
        "parameters": {{
          "action": "create_building",
          "buildingName": "Survival Shelter"
        }}
      }},
      {{
        "action": "sleeping",
        "priority": 10,
        "turnOffset": 2, 
        "reason": "Restore energy in safe shelter"
      }}
    ],
    "planType": "building",
    "confidence": 0.8
  }},
  "reasoning": "Low energy requires shelter construction to enable sleeping"
}}

Plan Step Guidelines:
- turnOffset: 0 = immediate action, 1 = next turn, 2 = turn after that, etc.
- priority: 1-10, with 10 being highest priority
- parameters: Action-specific details (resourceId for harvesting, building details, etc.)
- planType: "survival", "building", "exploration", "social", or "mixed"
- confidence: 0.1-1.0, how confident you are this plan will work

PLAN STEP EXAMPLES (these are individual steps within plans, not full responses):

For harvesting steps, include resourceId in parameters:
{{
  "action": "harvesting",
  "priority": 9,
  "turnOffset": 0,
  "reason": "Need water for survival",
  "parameters": {{
    "resourceId": "resource_12345"
  }}
}}

For exploration steps, include target coordinates in parameters:
{{
  "action": "exploring",
  "priority": 7,
  "turnOffset": 1,
  "reason": "Search for stone deposits",
  "parameters": {{
    "targetX": 15.5,
    "targetZ": 25.0
  }}
}}

For building steps, specify buildingAction in parameters:
{{
  "action": "building",
  "priority": 10,
  "turnOffset": 2,
  "reason": "Create shelter for sleeping",
  "parameters": {{
    "action": "create_building",
    "buildingName": "Survival Shelter"
  }}
}}

For building modifications, include buildingId:
{{
  "action": "building",
  "priority": 8,
  "turnOffset": 3,
  "reason": "Expand shelter capacity",
  "parameters": {{
    "action": "make_wider",
    "buildingId": "building_123"
  }}
}}

For survival steps (eating/drinking/sleeping), no special parameters needed:
{{
  "action": "sleeping",
  "priority": 10,
  "turnOffset": 4,
  "reason": "Restore energy in safe shelter"
}}

Consider:
- Plan sequences that solve problems efficiently
- Account for action duration and delays between steps  
- Build contingencies for potential failures
- Balance immediate needs with long-term goals
- Create plans that work toward shelter construction when possible
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

    const planGenerationText = shouldCreateNewPlan
      ? `PLAN GENERATION REQUIRED: You need to create a new 3-7 step plan. Include a "plan" field in your JSON response with specific steps, priorities, and reasons.
Context: ${JSON.stringify(planningContext, null, 2)}`
      : `FOLLOWING EXISTING PLAN: Continue executing your current plan. Current step: ${
          existingPlan?.steps?.[existingPlan?.currentStepIndex || 0]?.action ||
          "unknown"
        } - ${
          existingPlan?.steps?.[existingPlan?.currentStepIndex || 0]?.reason ||
          "no reason"
        }. Do NOT create a new plan field in your response.`;

    const promptVariables = {
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
      currentPosition: `x:${animal.position.x.toFixed(
        1
      )} z:${animal.position.z.toFixed(1)}`,
      worldState: JSON.stringify(worldState, null, 2),
      timestamp: Date.now(),
      planningInsights: planningInsights,
      planGeneration: planGenerationText,
      sleepConstraint: sleepCheck.reason,
    };

    // Log the full prompt with variables merged
    const formattedPrompt = await prompt.format(promptVariables);
    // console.log(`🔍 Full AI Prompt for ${animal.name}:`, formattedPrompt);

    const response = await chain.invoke(promptVariables);

    // Log the full AI response
    // console.log(`🤖 AI Response for ${animal.name}:`, response);

    // Parse JSON response
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(response);
    } catch (error) {
      console.error("Failed to parse AI JSON response:", response);
      // Fallback: try to extract action from response text
      const validActions = [
        "moving",
        "eating",
        "drinking",
        "sleeping",
        "playing",
        "exploring",
        "socializing",
        "working",
        "mating",
        "harvesting",
        "building",
        "idle",
      ];
      const action =
        validActions.find((action) =>
          response.toLowerCase().includes(action)
        ) || "idle";
      return NextResponse.json({ action });
    }

    const action = parsedResponse.action;
    let explorationTarget = null;

    // Validate action
    const validActions = [
      "moving",
      "eating",
      "drinking",
      "sleeping",
      "playing",
      "exploring",
      "socializing",
      "working",
      "mating",
      "harvesting",
      "building",
      "idle",
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
          const angle = Math.atan2(
            targetZ - animal.position.z,
            targetX - animal.position.x
          );
          explorationTarget = {
            x: animal.position.x + Math.cos(angle) * 20,
            z: animal.position.z + Math.sin(angle) * 20,
          };
        }
      }
    }

    const result: any = {
      action: finalAction,
      reasoning: parsedResponse.reasoning || "No reasoning provided",
    };

    if (finalAction === "exploring" && explorationTarget) {
      result.explorationTarget = explorationTarget;
    }

    if (finalAction === "harvesting" && parsedResponse.resourceId) {
      result.resourceId = parsedResponse.resourceId;
    }

    if (finalAction === "building") {
      if (parsedResponse.buildingAction) {
        result.buildingAction = parsedResponse.buildingAction;
      }
      if (parsedResponse.buildingId) {
        result.buildingId = parsedResponse.buildingId;
      }
      if (parsedResponse.buildingName) {
        result.buildingName = parsedResponse.buildingName;
      }
    }

    // Include plan in response for client-side storage
    if (parsedResponse.plan && shouldCreateNewPlan) {
      result.newPlan = {
        animalId: animal.id,
        steps: parsedResponse.plan.steps.map((step: any, index: number) => ({
          id: `step_${Date.now()}_${index}`,
          action: step.action,
          parameters: step.parameters || {},
          priority: step.priority || 5,
          turnOffset: step.turnOffset || index,
          expectedBenefit: step.expectedBenefit || 10,
          reason: step.reason || "No reason provided",
        })),
        createdAt: Date.now(),
        lastUpdated: Date.now(),
        planHorizon: parsedResponse.plan.steps.length,
        currentStepIndex: 0,
        confidence: parsedResponse.plan.confidence || 0.7,
        planType: parsedResponse.plan.planType || "mixed",
      };

      console.log(
        `📋 Generated new plan for ${animal.name} with ${result.newPlan.steps.length} steps`
      );
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

  // Check if animal has building materials and might want shelter
  const hasStone = animal.inventory?.items?.some(
    (item: any) => item.type === "stone" && item.quantity >= 5
  );
  const hasWood = animal.inventory?.items?.some(
    (item: any) => item.type === "wood" && item.quantity >= 10
  );
  if (hasStone && hasWood) return "building";

  // Based on personality
  if (animal.dna?.personality?.playful > 70) return "playing";
  if (animal.dna?.curiosity > 70) return "exploring";
  if (animal.dna?.social > 70) return "socializing";

  return "idle";
}
