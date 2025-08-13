import { NextRequest, NextResponse } from 'next/server';
import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { animal, worldState } = body;

    console.log(`🧠 AI decision request for ${animal?.name || 'unknown animal'}`);

    if (!animal || !worldState) {
      return NextResponse.json(
        { error: 'Missing required fields: animal, worldState' },
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
      model: 'gpt-4o-mini',
      temperature: 0.7,
      openAIApiKey: apiKey,
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

World State:
{worldState}

Based on your traits, current needs, and the world around you, what should you do next?

Available actions: idle, moving, eating, drinking, sleeping, playing, exploring, socializing, working, mating

Respond with just the action name. Consider:
- If health/hunger/thirst/energy are low, prioritize survival actions
- If stats are good, consider recreational activities based on personality
- Use your traits to influence decisions (curious animals explore more, social animals socialize more)
- Consider your age (young animals play more, older animals work more)
    `);

    const chain = prompt.pipe(llm).pipe(new StringOutputParser());

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
      worldState: JSON.stringify(worldState, null, 2)
    });

    const action = response.toLowerCase().trim();
    
    // Validate the action
    const validActions = [
      'idle', 'moving', 'eating', 'drinking', 'sleeping', 
      'playing', 'exploring', 'socializing', 'working', 'mating'
    ];
    
    const finalAction = validActions.includes(action) ? action : 'idle';
    
    return NextResponse.json({ action: finalAction });

  } catch (error) {
    console.error('Error in animal decision API:', error);
    
    // Return fallback decision on error
    const body = await request.json().catch(() => ({}));
    const fallbackAction = getFallbackAction(body.animal);
    
    return NextResponse.json({ 
      action: fallbackAction,
      error: 'AI decision failed, using fallback'
    });
  }
}

function getFallbackAction(animal: any) {
  if (!animal) return 'idle';
  
  // Simple rule-based fallback when AI is unavailable
  if (animal.stats?.health < 30) return 'sleeping';
  if (animal.stats?.thirst > 70) return 'drinking';
  if (animal.stats?.hunger > 70) return 'eating';
  if (animal.stats?.energy < 30) return 'sleeping';
  if (animal.stats?.happiness < 30) return 'playing';
  
  // Based on personality
  if (animal.dna?.personality?.playful > 70) return 'playing';
  if (animal.dna?.curiosity > 70) return 'exploring';
  if (animal.dna?.social > 70) return 'socializing';
  
  return 'idle';
}