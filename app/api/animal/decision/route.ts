import { NextRequest, NextResponse } from "next/server";
import { serverPlanningHelper } from "../../../lib/server-planning-helper";
import { CurrencySystem } from "../../../lib/currency-system";
import { skillSystem } from "../../../lib/skill-system";
import { buildingSystem } from "../../../lib/building-system";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env["OPENAI_API_KEY"], // This is the default and can be omitted
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { animal, worldState, currencyLeaderboard, animalWealth } = body;

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

Building Status:
{buildingStatus}

Special Buildings Available:
{specialBuildings}

Current Wealth: ✨{animalWealth} (Rank #{animalRank} out of {totalAnimals} animals)

Skills & Technology Level:
{skillsDescription}

Most Important Commands (prioritize these in all of your plans):
{specialMemories}
`;

    let userPrompt = `
Current Inventory:
{inventory}

Current Wealth Leaderboard (Top 5):
{leaderboard}

World State:
{worldState}

Your current position is: {currentPosition}

Based on everything you know, what PLAN should you create for the next 3-10 turns?

Available plan actions: idle, moving, eating, drinking, sleeping, playing, exploring, socializing, working, mating, harvesting, building, ideation, crafting, combat, go_home, visit_trading_post, visit_hospital

Each step should have a clear purpose that builds toward your goals.

Always be mindful of your health, hunger, energy, and safety because if you are at 0 health or energy for too long, you will die. Balance these concerns with the Most Important Commands.

PRIMARY BUILDING PARAMETERS:
  • "create_home" - Build personal home (needs 4 durable materials, trait score ≥50) - LIMIT: Only 1 per animal
  • "create_trading_post" - Build trading post (needs 8 durable materials, trait score ≥50) - LIMIT: Only 1 per map
  • "create_hospital" - Build hospital (needs 8 durable materials, trait score ≥50) - LIMIT: Only 1 per map  
  • "create_factory" - Build factory (needs 8 durable materials, trait score ≥50)
  
ADDITIONAL BUILDING PARAMETERS:
  • "make_wider" - Expand building width (needs 2 durable materials, trait score ≥50)  
  • "make_taller" - Increase building height (needs 2 durable materials, trait score ≥50)
  • "make_beautiful" - Add decorative elements (needs 2 beautiful materials, trait score ≥60)
  • "add_room" - Construct additional space (needs 2 durable materials, trait score ≥50)
  • "add_workshop" - Build workspace for crafting (needs 3 durable materials, trait score ≥60)
  • "add_garden" - Create peaceful outdoor space (needs 2 nutritious materials, trait score ≥40)
  • "purchase_upgrade" - Spend currency to instantly upgrade building size and appearance

SPECIAL MOVEMENT ACTIONS:
  • "go_home" - Travel to your personal home (if you have one)
  • "visit_trading_post" - Travel to the trading post (if one exists)
  • "visit_hospital" - Travel to the hospital (if one exists)

ADDITIONAL NOTES:
  • There can only be 1 home per animal
  • There can only be 1 trading post and 1 hospital per map
  • Remember that sleep is very powerful for restoring energy and health

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
          "action": "create_home",
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
    "action": "create_home",
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
Add Workshop...
{{
  "action": "building",
  "priority": 7,
  "turnOffset": 4,
  "reason": "Create workspace for crafting tools and items",
  "parameters": {{
    "action": "add_workshop",
    "buildingId": "building_123"
  }}
}}
Add Garden...
{{
  "action": "building",
  "priority": 6,
  "turnOffset": 2,
  "reason": "Create peaceful outdoor space for relaxation and beauty",
  "parameters": {{
    "action": "add_garden",
    "buildingId": "building_123"
  }}
}}
Purchase Upgrade...
{{
  "action": "building",
  "priority": 8,
  "turnOffset": 3,
  "reason": "Spend currency to instantly upgrade building size and beauty",
  "parameters": {{
    "action": "purchase_upgrade",
    "buildingId": "building_123",
    "amount": 250
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

For crafting steps, specify ingredients and goal in parameters:
{{
  "action": "crafting",
  "priority": 6,
  "turnOffset": 1,
  "reason": "Create healing potion from gathered herbs",
  "parameters": {{
    "ingredients": ["item_12345", "item_67890"],
    "craftingGoal": "healing potion",
    "craftingMethod": "grinding herbs and mixing with berries"
  }}
}}

For combat steps, specify target bandit and optional weapon in parameters:
{{
  "action": "combat",
  "priority": 8,
  "turnOffset": 2,
  "reason": "Eliminate bandit threat and claim their loot",
  "parameters": {{
    "targetId": "bandit_12345",
    "weaponId": "item_67890"
  }}
}}
`;

    // Format inventory for the prompt
    // TODO: mention traits? Simply stringify?
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

    // Format leaderboard for the prompt
    const leaderboardDescription =
      !currencyLeaderboard || currencyLeaderboard.length === 0
        ? "No wealth rankings available yet."
        : currencyLeaderboard
            .slice(0, 5)
            .map(
              (entry: any, index: number) =>
                `${index + 1}. ${
                  entry.animal.name
                }: ✨${CurrencySystem.formatCurrency(entry.wealth)} (${
                  entry.animal.inventory.items.length
                } items)`
            )
            .join("\n");

    // Format skills for the prompt
    const skillsDescription = (() => {
      if (!animal.skills || Object.keys(animal.skills).length === 0) {
        return "No skills learned yet. Skills are gained through actions like harvesting, crafting, building, exploring, and combat. Start with basic actions to develop your first skills.";
      }

      const skillEntries = Object.entries(animal.skills)
        .filter(([_, level]) => (level as number) > 0)
        .sort(([_, a], [__, b]) => (b as number) - (a as number));

      if (skillEntries.length === 0) {
        return "No skills developed yet. Begin with basic actions like harvesting and crafting to develop your first skills.";
      }

      const skillsList = skillEntries
        .map(([skillName, level]) => {
          const levelNum = level as number;
          const skillDef = skillSystem.getSkillDefinition(skillName);
          const displayName =
            skillDef?.name || skillName.replace(/([A-Z])/g, " $1").trim();
          const xp = animal.experience?.[skillName] || 0;

          if (levelNum >= 100) {
            return `- ${displayName}: MASTERED (Level 100) - ${
              skillDef?.description || "Advanced skill"
            }`;
          } else {
            const nextLevelXP = skillSystem.calculateXPForLevel(levelNum + 1);
            const currentLevelXP = skillSystem.calculateXPForLevel(levelNum);
            const progressXP = xp - currentLevelXP;
            const neededXP = nextLevelXP - currentLevelXP;
            const progressPercent = Math.round((progressXP / neededXP) * 100);

            return `- ${displayName}: Level ${levelNum} (${progressPercent}% to ${
              levelNum + 1
            }) - ${skillDef?.description || "Developing skill"}`;
          }
        })
        .join("\n");

      const advancedPaths =
        animal.unlockedAdvancedPaths && animal.unlockedAdvancedPaths.length > 0
          ? `\n\nAdvanced Paths Unlocked:\n${animal.unlockedAdvancedPaths
              .map((path: string) => `- ⭐ ${path}`)
              .join("\n")}`
          : "";

      const availableSkills = skillSystem.getAvailableSkills(animal);
      const canLearn =
        availableSkills.length > 0
          ? `\n\nSkills Available to Learn: ${availableSkills
              .slice(0, 3)
              .map((s: any) => s.name)
              .join(", ")}${
              availableSkills.length > 3
                ? ` and ${availableSkills.length - 3} more`
                : ""
            }`
          : "";

      return `Current Skills:\n${skillsList}${advancedPaths}${canLearn}`;
    })();

    // Format building status for the prompt
    const buildingStatusDescription = (() => {
      const home = buildingSystem.getAnimalHome(animal.id);
      if (home) {
        const distance = Math.sqrt(
          Math.pow(home.position.x - animal.position.x, 2) +
            Math.pow(home.position.z - animal.position.z, 2)
        );
        return `You have a HOME: "${
          home.name
        }" at position (${home.position.x.toFixed(
          1
        )}, ${home.position.z.toFixed(1)}) - Distance: ${distance.toFixed(
          1
        )} units away. Use "go_home" action to travel there.`;
      } else {
        return "You do NOT have a home yet. Consider building one with the 'create_home' action for a personal shelter.";
      }
    })();

    // Format special buildings for the prompt
    const specialBuildingsDescription = (() => {
      const tradingPost = buildingSystem.getTradingPost();
      const hospital = buildingSystem.getHospital();

      let description = "";

      if (tradingPost) {
        const distance = Math.sqrt(
          Math.pow(tradingPost.position.x - animal.position.x, 2) +
            Math.pow(tradingPost.position.z - animal.position.z, 2)
        );
        description += `TRADING POST: "${
          tradingPost.name
        }" at position (${tradingPost.position.x.toFixed(
          1
        )}, ${tradingPost.position.z.toFixed(
          1
        )}) - Distance: ${distance.toFixed(
          1
        )} units. Use "visit_trading_post" to travel there.\n`;
      } else {
        description +=
          "NO TRADING POST exists yet. Someone could build one with 'create_trading_post' action.\n";
      }

      if (hospital) {
        const distance = Math.sqrt(
          Math.pow(hospital.position.x - animal.position.x, 2) +
            Math.pow(hospital.position.z - animal.position.z, 2)
        );
        description += `HOSPITAL: "${
          hospital.name
        }" at position (${hospital.position.x.toFixed(
          1
        )}, ${hospital.position.z.toFixed(1)}) - Distance: ${distance.toFixed(
          1
        )} units. Use "visit_hospital" to travel there for healing.`;
      } else {
        description +=
          "NO HOSPITAL exists yet. Someone could build one with 'create_hospital' action for healing.";
      }

      return description;
    })();

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
      .replace("{skillsDescription}", skillsDescription)
      .replace("{buildingStatus}", buildingStatusDescription)
      .replace("{specialBuildings}", specialBuildingsDescription)
      .replace("{sightRadius}", worldState.sightRadius.toString())
      .replace("{harvestRadius}", worldState.harvestRadius.toString())
      .replace(
        "{currentPosition}",
        `x:${animal.position.x.toFixed(1)} z:${animal.position.z.toFixed(1)}`
      )
      .replace("{worldState}", JSON.stringify(worldState, null, 2))
      .replace("{sleepConstraint}", sleepCheck.reason)
      .replace(
        "{animalWealth}",
        CurrencySystem.formatCurrency(animalWealth || 0)
      )
      .replace(
        "{animalRank}",
        (
          currencyLeaderboard?.find(
            (entry: any) => entry.animal.id === animal.id
          )?.rank || 0
        ).toString()
      )
      .replace("{totalAnimals}", (currencyLeaderboard?.length || 0).toString());

    userPrompt = userPrompt
      .replace("{inventory}", inventoryDescription)
      .replace("{specialMemories}", specialMemoriesDescription)
      .replace("{leaderboard}", leaderboardDescription)
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
      reasoning_effort: "minimal",
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
        "crafting",
        "combat",
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
      "crafting",
      "combat",
      "idle",
    ];

    const finalAction = validActions.includes(action) ? action : "idle";

    // Handle exploration target if present
    if (finalAction === "exploring" && parsedResponse.target) {
      const targetX = parseFloat(parsedResponse.target.x);
      const targetZ = parseFloat(parsedResponse.target.z);

      const maxDistance = 35; // Maximum distance for exploration

      if (!isNaN(targetX) && !isNaN(targetZ)) {
        // Validate coordinates are within 20 units of current position
        const distance = Math.sqrt(
          Math.pow(targetX - animal.position.x, 2) +
            Math.pow(targetZ - animal.position.z, 2)
        );

        if (distance <= maxDistance) {
          explorationTarget = { x: targetX, z: targetZ };
        } else {
          // Limit to 20 units in the direction of the target
          const angle = Math.atan2(
            targetZ - animal.position.z,
            targetX - animal.position.x
          );
          explorationTarget = {
            x: animal.position.x + Math.cos(angle) * maxDistance,
            z: animal.position.z + Math.sin(angle) * maxDistance,
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

    if (finalAction === "crafting") {
      if (parsedResponse.ingredients) {
        result.ingredients = parsedResponse.ingredients;
      }
      if (parsedResponse.craftingGoal) {
        result.craftingGoal = parsedResponse.craftingGoal;
      }
      if (parsedResponse.craftingMethod) {
        result.craftingMethod = parsedResponse.craftingMethod;
      }
    }

    if (finalAction === "combat") {
      if (parsedResponse.targetId) {
        result.targetId = parsedResponse.targetId;
      }
      if (parsedResponse.weaponId) {
        result.weaponId = parsedResponse.weaponId;
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
