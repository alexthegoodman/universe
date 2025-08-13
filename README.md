# 🌌 Universe - LLM-Powered Virtual Life Simulation

Universe is a groundbreaking Three.js game where you breed and nurture highly intelligent virtual animals powered by Large Language Models (LLMs). Each animal possesses unique DNA, personality traits, and AI-driven behavior, creating an ever-evolving ecosystem of digital life.

![Universe Game Banner](https://via.placeholder.com/800x400/4a90e2/ffffff?text=Universe+Game)

## ✨ Key Features

### 🧬 Genetic System

- **Virtual DNA**: Each animal has 6 core traits (Intelligence, Agility, Strength, Social, Curiosity, Resilience)
- **Personality Matrix**: 4 personality dimensions (Aggressive, Playful, Cautious, Nurturing)
- **Physical Traits**: Size, colors, and visual characteristics that pass to offspring
- **Inheritance & Mutation**: Realistic breeding with trait combination and random mutations
- **Multi-generational Evolution**: Track lineages across generations

### 🤖 AI-Powered Behavior

- **LangChain Integration**: Each animal has its own AI chain for decision-making
- **OpenAI GPT Models**: Animals use GPT-4o-mini for intelligent behavior
- **Contextual Decision Making**: Animals consider their stats, environment, and personality
- **Autonomous Actions**: Animals decide when to eat, sleep, play, work, explore, and socialize
- **Staggered Decision-Making**: AI decisions are spread out over time to prevent API overload
- **Fallback Intelligence**: Rule-based behavior when AI is unavailable

### 🎮 Advanced Game Mechanics

- **Real-time Health Monitoring**: 30-second health checks with stat degradation
- **Dynamic Lifespan**: Animals live 1-24 hours with aging effects
- **MXP Action System**: Model Context Protocol for structured animal behaviors
- **Resource Management**: Food, water, shelter, and materials spawn throughout the world
- **Environmental Simulation**: Day/night cycles, weather, temperature, and humidity

### 💕 Breeding & Evolution

- **Compatibility Matching**: DNA-based compatibility scoring for optimal breeding
- **Breeding Cooldowns**: Realistic breeding cycles and recovery periods
- **Inbreeding Prevention**: Genetic relationship tracking to maintain healthy populations
- **Auto-breeding**: Animals autonomously seek mates based on personality and conditions
- **Offspring Care**: Parents' stats affect breeding success and offspring quality

### 🌍 3D World & UI

- **Three.js Rendering**: Beautiful 3D world with dynamic lighting and environments
- **Interactive Animals**: Click animals to view detailed stats, DNA, and family trees
- **Real-time Stats**: Live monitoring of health, hunger, energy, happiness, and thirst
- **Visual DNA**: Color-coded genetics and trait visualization
- **Action Animations**: Each action has unique visual animations (sleeping, eating, exploring, etc.)
- **Movement System**: Animals physically move around the world when exploring or changing locations
- **World Crafting**: Expandable system for players to modify the environment

### 🔗 Multiplayer Ready

- **WebSocket Server**: Real-time game state synchronization (not enabled by default)
- **Event Broadcasting**: Share animal births, deaths, and major events
- **Scalable Architecture**: Built to support multiple concurrent players

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- NPM or Yarn
- OpenAI API Key (for animal AI behavior)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-username/universe.git
   cd universe
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   # Copy the example environment file
   cp .env.example .env.local

   # Edit .env.local and add your OpenAI API key
   # OPENAI_API_KEY=sk-your-actual-api-key-here
   ```

   **Security Note**: The API key is stored server-side only and never exposed to the client. If no API key is provided, animals will use rule-based fallback behavior instead of AI.

4. **Start the game**

   ```bash
   npm run dev
   npm run server # or dev:server
   ```

5. **Open your browser**
   - Navigate to [http://localhost:3000](http://localhost:3000)
   - Click "Start Universe" to begin the simulation

## 🎯 How to Play

1. **Start Your Universe**: Click the "Start Universe" button to spawn your first generation of animals
2. **Observe Behavior**: Watch as animals autonomously decide their actions based on their AI and needs
3. **Monitor Health**: Keep an eye on animal stats - they'll eat, drink, and sleep as needed
4. **Interact**: Click on any animal to see detailed information about their DNA, stats, and family tree
5. **Breed & Evolve**: Animals will automatically breed when conditions are right, creating offspring with inherited traits
6. **Expand**: Use the "Spawn Animal" button to add more diversity to your population
7. **Watch Evolution**: Over time, you'll see genetic traits evolve and change across generations

## 🏗️ Architecture

### Core Systems

```
universe/
├── app/
│   ├── components/         # React Three.js components
│   │   ├── Game.tsx       # Main game component
│   │   ├── Animal3D.tsx   # 3D animal representation
│   │   └── AnimalInfo.tsx # Animal details UI
│   ├── lib/               # Core game systems
│   │   ├── game-manager.ts      # Central game coordinator
│   │   ├── animal-ai.ts         # LangChain AI integration
│   │   ├── dna-system.ts        # Genetics and inheritance
│   │   ├── animal-lifecycle.ts  # Birth, aging, death
│   │   ├── health-monitor.ts    # Health tracking system
│   │   ├── mxp-actions.ts       # Action execution system
│   │   └── breeding-system.ts   # Breeding mechanics
│   └── types/
│       └── animal.ts      # TypeScript definitions
├── server.js              # WebSocket server
└── package.json
```

### Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **3D Graphics**: Three.js, React Three Fiber, React Three Drei
- **AI**: LangChain, OpenAI GPT-4o-mini
- **Styling**: TailwindCSS
- **Real-time**: WebSockets (ws)
- **State Management**: React Hooks + Custom Game Manager

## 🧬 Animal DNA System

Each animal's DNA contains:

```typescript
interface AnimalDNA {
  // Core Traits (0-100)
  intelligence: number; // Affects learning and decision quality
  agility: number; // Affects movement speed and energy efficiency
  strength: number; // Affects work capacity and health
  social: number; // Affects breeding desire and group behavior
  curiosity: number; // Affects exploration and discovery
  resilience: number; // Affects health degradation and recovery

  // Physical Traits
  size: number; // 0.5-2.0 size multiplier
  color: {
    primary: string;
    secondary: string;
  };

  // Personality (0-100)
  personality: {
    aggressive: number;
    playful: number;
    cautious: number;
    nurturing: number;
  };

  // Lineage
  parentIds?: [string, string];
  generation: number;
}
```

## 🤖 AI Behavior System

Animals use GPT-4o-mini to make decisions based on:

- **Current Stats**: Health, hunger, thirst, energy, happiness
- **DNA Traits**: Intelligence, personality, physical capabilities
- **World State**: Available resources, other animals, environment
- **Life Stage**: Baby, young, adult, or elder
- **Survival Needs**: Critical stats trigger survival behaviors

### Example AI Decision Process:

```
Animal "Luna" (Intelligence: 85, Curiosity: 92, Health: 45)
Current State: Hungry (75/100), Low Energy (25/100)
AI Decision: "eating" - Health is concerning, need to prioritize nutrition
Action Result: Found food, gained 20 hunger reduction, 10 energy boost
```

## 🔧 Configuration

### Game Settings

```typescript
const gameConfig = {
  maxAnimals: 50, // Population cap
  startingAnimals: 3, // Initial spawn count
  worldSize: {
    // 3D world dimensions
    width: 100,
    height: 10,
    depth: 100,
  },
  enableWebSocket: true, // Multiplayer support
  webSocketPort: 8080, // Server port
};
```

**API Key Configuration**: The OpenAI API key is securely stored in `.env.local` on the server side and accessed through the `/api/animal/decision` endpoint.

### Health Monitoring

- **Check Interval**: Every 30 seconds
- **Stat Degradation**: Hunger, thirst, and energy decrease over time
- **Age Effects**: Older animals degrade faster
- **Critical Thresholds**: Auto-survival actions when stats are critical

### Breeding Parameters

- **Breeding Age**: 25% to 85% of lifespan
- **Cooldown**: 30 minutes between breeding attempts
- **Health Requirements**: Minimum 60 health, 40 energy, 50 happiness
- **Compatibility**: DNA similarity affects breeding success

## 🔒 Security Features

- **Secure API Key Storage**: OpenAI API keys are stored server-side only in environment variables
- **API Route Protection**: All AI decisions go through secure Next.js API routes
- **Fallback Behavior**: Game continues to work without API keys using rule-based animal behavior
- **No Client-Side Secrets**: Zero exposure of sensitive credentials to the browser

## 🌟 Advanced Features

### MXP (Model Context Protocol) Actions

Each animal action is structured through MXP for consistency:

```typescript
// Example: Moving action
{
  name: "move",
  parameters: {
    targetX: 10,
    targetZ: 15,
    speed: 1.2
  }
}
```

### Real-time Events

The game broadcasts events like:

- Animal births and deaths
- Breeding attempts
- Health alerts
- Environmental changes
- Resource discoveries

### WebSocket API

```javascript
// Connect to game server
const ws = new WebSocket("ws://localhost:8080");

// Listen for animal updates
ws.on("message", (data) => {
  const event = JSON.parse(data);
  if (event.type === "animalUpdated") {
    // Handle animal state change
  }
});
```

## 🎨 Customization

### Adding New Animal Traits

1. Extend the `AnimalDNA` interface in `types/animal.ts`
2. Update the DNA generation in `dna-system.ts`
3. Modify the AI prompt template in `animal-ai.ts`
4. Add trait effects to relevant action systems

### Creating New Actions

1. Add action type to `AnimalAction` union in `types/animal.ts`
2. Implement action logic in `mxp-actions.ts`
3. Update AI decision-making in `animal-ai.ts`
4. Add visual feedback in `Animal3D.tsx`

### Custom Environments

1. Extend `WorldState` interface
2. Add environment effects to `game-manager.ts`
3. Implement environmental AI considerations
4. Update 3D world rendering

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Follow the coding standards**: TypeScript, ESLint, Prettier
4. **Test your changes**: `npm run build && npm run lint`
5. **Submit a pull request**

### Development Guidelines

- Use TypeScript for all new code
- Follow existing naming conventions
- Add JSDoc comments for public APIs
- Test AI behavior with different animal personalities
- Ensure WebSocket compatibility

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **OpenAI** for GPT models that power animal intelligence
- **LangChain** for the AI framework
- **Three.js** community for 3D web graphics
- **React Three Fiber** for React integration
- **Next.js** team for the amazing framework

## 🔮 Future Roadmap

- [ ] **Advanced Genetics**: More complex inheritance patterns, rare traits
- [ ] **Ecosystem Dynamics**: Predator-prey relationships, food chains
- [ ] **Player Tools**: Genetic engineering, selective breeding interface
- [ ] **Multiplayer Mode**: Shared universes, trading animals
- [ ] **Mobile Support**: Touch controls, responsive design
- [ ] **AI Upgrades**: Integration with newer language models
- [ ] **Modding Support**: Plugin system for custom behaviors
- [ ] **Analytics Dashboard**: Population genetics tracking, evolution metrics

---

🌌 **Welcome to Universe - where artificial life meets artificial intelligence!** 🌌

Start your journey today and watch as your digital creatures evolve, learn, and thrive in their virtual world.
