import { NextRequest, NextResponse } from "next/server";
import { serverPlanningHelper } from "../../../lib/server-planning-helper";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env["OPENAI_API_KEY"], // This is the default and can be omitted
});

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

    const sleepCheck = serverPlanningHelper.canSleep(animal, worldState);

    // Check for API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      // No fallback - pure LLM simulation requires API access
      return NextResponse.json(
        {
          error: "AI service unavailable - no API key configured",
        },
        { status: 503 }
      );
    }

    let systemPrompt = `
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

Most Important Commands (prioritize these in all of your plans):
{specialMemories}
`;

    let userPrompt = `
Current Inventory:
{inventory}

World State:
{worldState}

Based on your traits, current needs, and the world around you, what PLAN should you create for the next 3-7 turns?

You MUST create strategic multi-step plans, NOT individual actions. Think about sequences like:
- "gather materials → build shelter → sleep to restore energy"
- "find water → drink → explore for food → eat"
- "harvest granite → harvest oak_wood → create building → improve building"
- "harvest marble → harvest diamond → make building beautiful"

Consider your recent failures and avoid repeating mistakes. Plan around your constraints:
- Full inventory means you need to consume items before harvesting more
- Low energy requires shelter building before you can sleep
- Critical needs (thirst/hunger) should be prioritized in your plan

Throughout your life, if you socialize with someone else, consider breeding with them also. There are many benefits to breeding.

Be wise. For example, if you are in need of one or more resources, then you will want to travel nearby each resource before harvesting each resource.

Available plan actions: idle, moving, eating, drinking, sleeping, playing, exploring, socializing, working, mating, harvesting, building, ideation

IMPORTANT SURVIVAL RULES:
- You can only eat/drink if you have food/water items in your inventory  
- You can see resources within {sightRadius} units of your position
- You can harvest resources when within {harvestRadius} units
- Check nearbyResources for what you can see around you
- Look for resources marked as "canHarvestNow: true" to harvest immediately
- Resources marked as "tooFarToHarvest: true" need you to move closer first
- Only choose "eating" if you have food items in inventory (specify which item by ID or type)
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
3. RESOURCE GATHERING PLANS: Plan sequences to collect materials (some are durable including granite, oak_wood, etc., some are beautiful including marble, diamond, etc., and some are consumable including berries, water, etc.)
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

Check your memories.ideations to see your past creative thoughts and dreams.
- These are your personal visions and ideas about your world and life
- You can build upon previous ideas or create entirely new ones
- Ideation helps you think about future goals and possibilities
- Use ideation when you have some energy and want to be creative or contemplative

IDEATION ACTION:
Use the "ideation" action to have creative thoughts about your world and life.
- This action stores your ideas as memories that influence future decisions
- Be creative! Think about dreams, goals, inventions, or philosophical thoughts
- Ideas should reflect your personality and current situation
- Examples: "I dream of building a magnificent crystal palace" or "What if I could teach all animals to live in harmony?"

PLANNING SYSTEM:
- You should think 3-10 turns ahead and create strategic plans
- Consider the consequences of your current action choice
- Balance immediate needs with longer-term goals like shelter, safety, and comfort
- Plan building projects when you have or can gather sufficient materials
- Remember that sleeping gives huge benefits but requires shelter - plan accordingly!

BUILDING SYSTEM:
- Buildings provide shelter, comfort, and happiness bonuses when you rest inside them
- Check nearbyBuildings to see structures you can interact with or enter
- You can create new buildings or modify existing ones if you have suitable materials
- Building accepts ANY material with appropriate traits - not just stone and wood!
- Available building actions:
  • "create_building" - Build new shelter (needs 4 durable materials, trait score ≥50)
  • "make_wider" - Expand building width (needs 2 durable materials, trait score ≥50)  
  • "make_taller" - Increase building height (needs 2 durable materials, trait score ≥50)
  • "make_beautiful" - Add decorative elements (needs 2 beautiful materials, trait score ≥60)
  • "add_room" - Construct additional space (needs 2 durable materials, trait score ≥50)
- DURABLE materials include: granite, limestone, marble, oak_wood, cedar_wood, iron_ore, etc.
- BEAUTIFUL materials include: marble, diamond, ruby, emerald, amethyst, silk, etc.
- Consider building when you have collected enough suitable materials and want long-term shelter
- Buildings help during sleep and provide protection from the elements
- They increase your happiness metrics when you rest inside them
- The larger and more complex the building, the more happiness it provides

ALWAYS INCLUDE A JSON PLAN when creating new plans. Use this format and always return as JSON:
{{
  "plan": {{
    "steps": [
      {{
        "action": "harvesting",
        "priority": 9,
        "turnOffset": 0,
        "reason": "Need granite for building",
        "parameters": {{
          "resourceId": "granite_123"
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
- Make sure to use accurate resource IDs and parameters for actions

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
  "reason": "Search for durable materials like granite and oak_wood",
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
Make Wider...
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
Make Taller...
{{
  "action": "building",
  "priority": 8,
  "turnOffset": 3,
  "reason": "Increase shelter height for better protection",
  "parameters": {{
    "action": "make_taller",
    "buildingId": "building_123"
  }}
}}
Make Beautiful...
{{
  "action": "building",
  "priority": 8,
  "turnOffset": 3,
  "reason": "Add decorative elements to improve happiness",
  "parameters": {{
    "action": "make_beautiful",
    "buildingId": "building_123"
  }}
}}

For eating steps, include resourceId or itemType in parameters:
{{
  "action": "eating",
  "priority": 9,
  "turnOffset": 0,
  "reason": "Satisfy hunger with berries",
  "parameters": {{
    "resourceId": "item_12345"
  }}
}}

For survival steps (drinking/sleeping), no special parameters needed:
{{
  "action": "sleeping",
  "priority": 10,
  "turnOffset": 4,
  "reason": "Restore energy in safe shelter"
}}

For ideation steps, include your creative idea in parameters:
{{
  "action": "ideation",
  "priority": 4,
  "turnOffset": 3,
  "reason": "Dream about future possibilities while resting",
  "parameters": {{
    "idea": "I imagine creating a beautiful garden where all creatures can gather peacefully"
  }}
}}

Consider:
- Plan sequences that solve problems efficiently
- Account for action duration and delays between steps  
- Build contingencies for potential failures
- Balance immediate needs with long-term goals
- Create plans that work toward shelter construction when possible
`;

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

    // Format special memories for the prompt
    const specialMemoriesDescription =
      !animal.specialMemories || animal.specialMemories.length === 0
        ? "No special commands yet."
        : `
${animal.specialMemories
  .map(
    (memory: any) =>
      `- ${memory.content} (noted on ${new Date(
        memory.createdAt
      ).toLocaleDateString()})`
  )
  .join("\n")}
`;

    // Format the user prompt with variables
    systemPrompt = systemPrompt
      .replace("{name}", animal.name)
      .replace("{timestamp}", Date.now().toString())
      .replace("{intelligence}", animal.dna.intelligence.toString())
      .replace("{agility}", animal.dna.agility.toString())
      .replace("{strength}", animal.dna.strength.toString())
      .replace("{social}", animal.dna.social.toString())
      .replace("{curiosity}", animal.dna.curiosity.toString())
      .replace("{resilience}", animal.dna.resilience.toString())
      .replace("{aggressive}", animal.dna.personality.aggressive.toString())
      .replace("{playful}", animal.dna.personality.playful.toString())
      .replace("{cautious}", animal.dna.personality.cautious.toString())
      .replace("{nurturing}", animal.dna.personality.nurturing.toString())
      .replace("{health}", animal.stats.health.toString())
      .replace("{hunger}", animal.stats.hunger.toString())
      .replace("{energy}", animal.stats.energy.toString())
      .replace("{happiness}", animal.stats.happiness.toString())
      .replace("{thirst}", animal.stats.thirst.toString())
      .replace("{age}", Math.round(animal.age * 100).toString())
      .replace("{currentAction}", animal.currentAction)
      .replace("{inventory}", inventoryDescription)
      .replace("{specialMemories}", specialMemoriesDescription)
      .replace("{sightRadius}", worldState.sightRadius.toString())
      .replace("{harvestRadius}", worldState.harvestRadius.toString())
      .replace(
        "{currentPosition}",
        `x:${animal.position.x.toFixed(1)} z:${animal.position.z.toFixed(1)}`
      )
      .replace("{worldState}", JSON.stringify(worldState, null, 2))
      .replace("{sleepConstraint}", sleepCheck.reason);

    userPrompt = userPrompt
      .replace("{inventory}", inventoryDescription)
      .replace("{specialMemories}", specialMemoriesDescription)
      .replace("{worldState}", JSON.stringify(worldState, null, 2))
      .replace("{sightRadius}", worldState.sightRadius.toString())
      .replace("{harvestRadius}", worldState.harvestRadius.toString())
      .replace(
        "{currentPosition}",
        `x:${animal.position.x.toFixed(1)} z:${animal.position.z.toFixed(1)}`
      )
      .replace("{sleepConstraint}", sleepCheck.reason);

    // Call OpenAI API directly
    // const response = await fetch("https://api.openai.com/v1/chat/completions", {
    //   method: "POST",
    //   headers: {
    //     "Content-Type": "application/json",
    //     Authorization: `Bearer ${apiKey}`,
    //   },
    //   body: JSON.stringify({
    //     model: "gpt-5-nano",
    //     messages: [
    //       {
    //         role: "system",
    //         content: systemPrompt,
    //       },
    //       {
    //         role: "user",
    //         content: userPrompt,
    //       },
    //     ],
    //     response_format: { type: "json_object" },
    //     temperature: 0.7,
    //     max_tokens: 4000,
    //   }),
    // });

    const response = await openai.chat.completions.create({
      model: "gpt-5-nano",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
      response_format: { type: "json_object" },
      // temperature: 0.7,
      // max_completion_tokens: 6000,
    });

    // if (!response.ok) {
    //   throw new Error(`OpenAI API error: ${response.status}`);
    // }

    // const responseData = await response.json();
    const responseData = response;

    const responseText = responseData.choices[0].message.content;

    if (!responseText) {
      throw new Error("Empty response from AI");
    }

    // Log the full AI response
    // console.log(`🤖 AI Response for ${animal.name}:`, responseText);

    // Parse JSON response
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(responseText);
    } catch (error) {
      console.error("Failed to parse AI JSON response:", responseText);
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
        "ideation",
        "idle",
      ];
      const action =
        validActions.find((action) =>
          responseText.toLowerCase().includes(action)
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
      "ideation",
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

    if (finalAction === "eating" && parsedResponse.resourceId) {
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

    if (finalAction === "ideation" && parsedResponse.idea) {
      result.idea = parsedResponse.idea;
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

    // No fallback - pure LLM simulation
    return NextResponse.json(
      {
        error: `AI decision failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      },
      { status: 500 }
    );
  }
}

// getFallbackAction function removed - this is now a pure LLM simulation
