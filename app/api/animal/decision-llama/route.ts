import { NextRequest, NextResponse } from "next/server";
import { serverPlanningHelper } from "../../../lib/server-planning-helper";

// JSON Schema for the plan generation tool
const PLAN_SCHEMA = {
  type: "object",
  properties: {
    plan: {
      type: "object",
      properties: {
        steps: {
          type: "array",
          minItems: 3,
          maxItems: 10,
          items: {
            type: "object",
            properties: {
              action: {
                type: "string",
                enum: [
                  "idle",
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
                ],
                description: "The action to take in this step",
              },
              priority: {
                type: "number",
                minimum: 1,
                maximum: 10,
                description: "Priority of this step (10 = highest)",
              },
              turnOffset: {
                type: "number",
                minimum: 0,
                maximum: 10,
                description:
                  "When to execute (0 = immediate, 1 = next turn, etc)",
              },
              reason: {
                type: "string",
                description: "Why this step is important",
              },
              parameters: {
                type: "object",
                properties: {
                  resourceId: {
                    type: "string",
                    description: "ID of resource to interact with",
                  },
                  targetX: {
                    type: "number",
                    description: "X coordinate for exploration",
                  },
                  targetZ: {
                    type: "number",
                    description: "Z coordinate for exploration",
                  },
                  action: {
                    type: "string",
                    enum: [
                      "create_building",
                      "make_wider",
                      "make_taller",
                      "make_beautiful",
                      "add_room",
                    ],
                    description: "Specific building action",
                  },
                  buildingId: {
                    type: "string",
                    description: "ID of building to modify",
                  },
                  buildingName: {
                    type: "string",
                    description: "Name for new building",
                  },
                  itemType: {
                    type: "string",
                    description: "Type of item to consume",
                  },
                },
                description: "Action-specific parameters",
              },
            },
            required: ["action", "priority", "turnOffset", "reason"],
          },
        },
        planType: {
          type: "string",
          enum: ["survival", "building", "exploration", "social", "mixed"],
          description: "Overall type/theme of the plan",
        },
        confidence: {
          type: "number",
          minimum: 0.1,
          maximum: 1.0,
          description: "Confidence that this plan will succeed",
        },
      },
      required: ["steps", "planType", "confidence"],
    },
    reasoning: {
      type: "string",
      description: "Overall reasoning for why this plan was created",
    },
  },
  required: ["plan", "reasoning"],
};

async function callLlamaServer(prompt: string) {
  const LLAMA_SERVER_URL =
    process.env.LLAMA_SERVER_URL || "http://localhost:8080";

  // Prepare the tool definition
  const tools = [
    {
      type: "function",
      function: {
        name: "create_plan",
        description:
          "Create a strategic multi-step plan for the virtual animal",
        parameters: PLAN_SCHEMA,
      },
    },
  ];

  // Construct the messages array
  const messages = [
    { role: "system", content: "/no_think" },
    {
      role: "system",
      content:
        "You are an intelligent virtual animal AI that creates strategic multi-step plans. You must use the create_plan tool to respond with a sequence of actions.",
    },
    {
      role: "user",
      content: prompt,
    },
  ];

  try {
    const response = await fetch(`${LLAMA_SERVER_URL}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "SmolLM3",
        messages: messages,
        tools: tools,
        tool_choice: "auto",
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      throw new Error(`Llama server responded with ${response.status}`);
    }

    const data = await response.json();

    // Extract tool call from response
    if (data.choices?.[0]?.message?.tool_calls?.[0]) {
      const toolCall = data.choices[0].message.tool_calls[0];
      if (toolCall.function?.arguments) {
        // Parse the JSON from the tool call
        return JSON.parse(toolCall.function.arguments);
      }
    }

    throw new Error("No valid tool call in response");
  } catch (error) {
    console.error("Error calling Llama server:", error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { animal, worldState } = body;

    console.log(
      `🧠 AI planning request for ${animal?.name || "unknown animal"}`
    );

    if (!animal || !worldState) {
      return NextResponse.json(
        { error: "Missing required fields: animal, worldState" },
        { status: 400 }
      );
    }

    // Check if we need a new plan
    const { existingPlan, needsNewPlan } = body;
    const shouldCreateNewPlan =
      needsNewPlan ||
      serverPlanningHelper.shouldCreateNewPlan(
        animal,
        worldState,
        existingPlan
      );

    // If we don't need a new plan, return the current action from existing plan
    if (!shouldCreateNewPlan && existingPlan) {
      const currentStep =
        existingPlan.steps[existingPlan.currentStepIndex || 0];
      if (currentStep) {
        return NextResponse.json({
          action: currentStep.action,
          reasoning: currentStep.reason,
          ...currentStep.parameters,
          usingExistingPlan: true,
        });
      }
    }

    const planningContext = serverPlanningHelper.getPlanningContext(
      animal,
      worldState
    );
    const sleepCheck = serverPlanningHelper.canSleep(animal, worldState);

    // Check if Llama server is configured
    if (!process.env.LLAMA_SERVER_URL) {
      // Return a fallback single action when no server is available
      const fallbackAction = getFallbackAction(animal);
      return NextResponse.json({
        action: fallbackAction,
        reasoning: "Fallback action due to missing AI server",
      });
    }

    // Format inventory for the prompt
    const inventoryDescription =
      animal.inventory.items.length === 0
        ? "Empty inventory (0 items)"
        : `${animal.inventory.items.length} items (${
            animal.inventory.currentWeight
          }/${animal.inventory.maxCapacity} weight):
${animal.inventory.items
  .map(
    (item: any) =>
      `- ${item.name} (type: ${item.type}) x${item.quantity} (quality: ${item.quality})`
  )
  .join("\n")}`;

    // Construct the prompt for plan generation
    const prompt = `
You are an intelligent virtual animal named ${
      animal.name
    } planning your next actions.

CURRENT STATE:
DNA Traits:
- Intelligence: ${animal.dna.intelligence}/100
- Agility: ${animal.dna.agility}/100  
- Strength: ${animal.dna.strength}/100
- Social: ${animal.dna.social}/100
- Curiosity: ${animal.dna.curiosity}/100
- Resilience: ${animal.dna.resilience}/100

Personality:
- Aggressive: ${animal.dna.personality.aggressive}/100
- Playful: ${animal.dna.personality.playful}/100
- Cautious: ${animal.dna.personality.cautious}/100
- Nurturing: ${animal.dna.personality.nurturing}/100

Vital Stats:
- Health: ${animal.stats.health}/100
- Hunger: ${animal.stats.hunger}/100
- Energy: ${animal.stats.energy}/100
- Happiness: ${animal.stats.happiness}/100
- Thirst: ${animal.stats.thirst}/100

Age: ${Math.round(animal.age * 100)}% of lifespan
Position: x:${animal.position.x.toFixed(1)} z:${animal.position.z.toFixed(1)}

Inventory:
${inventoryDescription}

WORLD STATE:
${JSON.stringify(worldState, null, 2)}

CONTEXT:
- Planning Context: ${JSON.stringify(planningContext, null, 2)}
- Sleep Constraint: ${sleepCheck.reason}
- Sight Radius: ${worldState.sightRadius} units
- Harvest Radius: ${worldState.harvestRadius} units

CRITICAL SURVIVAL RULES:
1. You can only eat if you have food items in inventory (berries, food)
2. You can only drink if you have water in inventory
3. You can only harvest resources marked as "canHarvestNow: true"
4. Sleeping requires shelter if energy < 30
5. Building requires stone and wood (2 of each for most actions)
6. Resources marked "tooFarToHarvest" require moving closer first

PLAN CREATION GUIDELINES:
Create a strategic 3-7 step plan considering:
- Critical needs first (thirst>70, hunger>70, energy<30, health<30)
- Resource gathering sequences (move to resource → harvest → use/store)
- Building projects when materials available
- Exploration when resources are scarce
- Social activities when survival needs are met

Example plan sequences:
- "move to water → harvest water → drink → explore for food"
- "harvest stone → harvest wood → create building → sleep in shelter"
- "eat berries → explore new area → harvest resources → return to base"

For each step, consider:
- turnOffset: 0=immediate, 1=next turn, 2=turn after, etc.
- priority: 1-10 where 10 is most critical
- parameters: Include specific IDs, coordinates, or action details

Remember: You're creating a COMPLETE PLAN, not a single action. Think strategically about the sequence of actions needed to achieve your goals.

Use the create_plan tool to generate your multi-step plan.`;

    // Call Llama server for plan generation
    const llmResponse = await callLlamaServer(prompt);

    if (
      !llmResponse.plan ||
      !llmResponse.plan.steps ||
      llmResponse.plan.steps.length === 0
    ) {
      throw new Error("Invalid plan structure received from LLM");
    }

    // Validate all actions in the plan
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

    // Clean and validate plan steps
    const validatedSteps = llmResponse.plan.steps.map(
      (step: any, index: number) => ({
        id: `step_${Date.now()}_${index}`,
        action: validActions.includes(step.action) ? step.action : "idle",
        parameters: step.parameters || {},
        priority: step.priority || 5,
        turnOffset: step.turnOffset || index,
        expectedBenefit: 10,
        reason: step.reason || "No reason provided",
      })
    );

    // Create the plan object for storage
    const newPlan = {
      animalId: animal.id,
      steps: validatedSteps,
      createdAt: Date.now(),
      lastUpdated: Date.now(),
      planHorizon: validatedSteps.length,
      currentStepIndex: 0,
      confidence: llmResponse.plan.confidence || 0.7,
      planType: llmResponse.plan.planType || "mixed",
    };

    console.log(
      `📋 Generated new plan for ${animal.name} with ${newPlan.steps.length} steps of type ${newPlan.planType}`
    );

    // Get the first action from the plan to execute immediately
    const firstStep = validatedSteps[0];

    // Return the first action to execute along with the complete plan
    return NextResponse.json({
      action: firstStep.action,
      reasoning: firstStep.reason,
      ...firstStep.parameters,
      newPlan: newPlan,
    });
  } catch (error) {
    console.error("Error in animal planning API:", error);

    // Return fallback action on error
    const body = await request.json().catch(() => ({}));
    const fallbackAction = getFallbackAction(body.animal);

    return NextResponse.json({
      action: fallbackAction,
      reasoning: "AI planning failed, using fallback",
      error: "Planning failed",
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
    return hasWater ? "drinking" : "exploring";
  }

  if (animal.stats?.hunger > 70) {
    const hasFood = animal.inventory?.items?.some(
      (item: any) =>
        (item.type === "food" || item.type === "berries") && item.quantity > 0
    );
    return hasFood ? "eating" : "exploring";
  }

  if (animal.stats?.energy < 30) return "sleeping";
  if (animal.stats?.happiness < 30) return "playing";

  // Check if animal has building materials
  const hasStone = animal.inventory?.items?.some(
    (item: any) => item.type === "stone" && item.quantity >= 2
  );
  const hasWood = animal.inventory?.items?.some(
    (item: any) => item.type === "wood" && item.quantity >= 2
  );
  if (hasStone && hasWood) return "building";

  // Based on personality
  if (animal.dna?.personality?.playful > 70) return "playing";
  if (animal.dna?.curiosity > 70) return "exploring";
  if (animal.dna?.social > 70) return "socializing";

  return "idle";
}
