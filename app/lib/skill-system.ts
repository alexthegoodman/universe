import {
  Animal,
  SkillDefinition,
  AdvancedPath,
  SkillXPGain,
  SkillRequirement,
} from "@/app/types/animal";

import skillTreeData from "@/skill-tree-system.json";

export class SkillSystem {
  private skillTrees: Record<string, Record<string, SkillDefinition>> = {};
  private readonly XP_PER_LEVEL = 100; // Base XP needed per level
  private readonly XP_SCALING_FACTOR = 1.1; // XP requirement increases by 10% per level

  constructor() {
    this.initializeSkillTrees();
  }

  private async initializeSkillTrees() {
    try {
      // const response = await fetch('/skill-tree-system.json');
      // const skillTreeData = await response.json();
      this.processSkillTreeData(skillTreeData);
    } catch (error) {
      console.error("Failed to load skill tree data:", error);
    }
  }

  private processSkillTreeData(data: any) {
    const { skillTrees } = data;

    for (const [categoryName, category] of Object.entries(skillTrees) as [
      string,
      any
    ][]) {
      this.skillTrees[categoryName] = {};

      for (const [skillKey, skillData] of Object.entries(category.skills) as [
        string,
        any
      ][]) {
        this.skillTrees[categoryName][skillKey] = {
          name: skillData.name,
          maxLevel: skillData.maxLevel,
          description: skillData.description,
          prerequisites: skillData.prerequisites,
          advancedPaths: skillData.advancedPaths,
          category: categoryName,
        };
      }
    }
  }

  // Initialize skills for a new animal
  initializeAnimalSkills(animal: Animal): Animal {
    const updatedAnimal = { ...animal };

    if (!updatedAnimal.skills) {
      updatedAnimal.skills = {};
    }
    if (!updatedAnimal.experience) {
      updatedAnimal.experience = {};
    }
    if (!updatedAnimal.unlockedAdvancedPaths) {
      updatedAnimal.unlockedAdvancedPaths = [];
    }
    if (!updatedAnimal.skillPreferences) {
      updatedAnimal.skillPreferences = [];
    }

    return updatedAnimal;
  }

  // Calculate XP required for a specific level
  calculateXPForLevel(level: number): number {
    if (level === 0) return 0;
    let totalXP = 0;
    for (let i = 1; i <= level; i++) {
      totalXP += this.XP_PER_LEVEL * Math.pow(this.XP_SCALING_FACTOR, i - 1);
    }
    return Math.floor(totalXP);
  }

  // Get current skill level from XP
  getSkillLevelFromXP(xp: number): number {
    let level = 0;
    let currentXP = 0;

    while (currentXP <= xp && level < 100) {
      level++;
      const levelXP =
        this.XP_PER_LEVEL * Math.pow(this.XP_SCALING_FACTOR, level - 1);
      currentXP += levelXP;
    }

    return Math.max(0, level - 1);
  }

  // Add XP to a skill and return any level ups
  addSkillXP(
    animal: Animal,
    skillName: string,
    xp: number
  ): {
    leveledUp: boolean;
    newLevel: number;
    oldLevel: number;
    unlockedAdvancedPaths: string[];
  } {
    const updatedAnimal = this.initializeAnimalSkills(animal);

    if (!updatedAnimal.experience[skillName]) {
      updatedAnimal.experience[skillName] = 0;
    }
    if (!updatedAnimal.skills[skillName]) {
      updatedAnimal.skills[skillName] = 0;
    }

    const oldLevel = updatedAnimal.skills[skillName];
    updatedAnimal.experience[skillName] += xp;
    const newLevel = Math.min(
      100,
      this.getSkillLevelFromXP(updatedAnimal.experience[skillName])
    );
    updatedAnimal.skills[skillName] = newLevel;

    const leveledUp = newLevel > oldLevel;
    const unlockedAdvancedPaths: string[] = [];

    // Check for newly unlocked advanced paths
    if (leveledUp && newLevel === 100) {
      const newPaths = this.checkAdvancedPathUnlocks(updatedAnimal, skillName);
      unlockedAdvancedPaths.push(...newPaths);
      updatedAnimal.unlockedAdvancedPaths.push(...newPaths);
    }

    // Update the original animal object
    Object.assign(animal, updatedAnimal);

    return { leveledUp, newLevel, oldLevel, unlockedAdvancedPaths };
  }

  // Check which advanced paths can be unlocked for a skill
  private checkAdvancedPathUnlocks(
    animal: Animal,
    skillName: string
  ): string[] {
    const newPaths: string[] = [];

    for (const [categoryName, skills] of Object.entries(this.skillTrees)) {
      for (const [skillKey, skillDef] of Object.entries(skills)) {
        if (skillKey === skillName && skillDef.advancedPaths) {
          for (const path of skillDef.advancedPaths) {
            if (!animal.unlockedAdvancedPaths.includes(path.name)) {
              const requirements = this.checkSkillRequirements(
                animal,
                path.requirements
              );
              if (requirements.every((req) => req.met)) {
                newPaths.push(path.name);
              }
            }
          }
        }
      }
    }

    return newPaths;
  }

  // Check if skill requirements are met
  checkSkillRequirements(
    animal: Animal,
    requirements: string[]
  ): SkillRequirement[] {
    return requirements.map((req) => {
      const [skillName, levelStr] = req.split(": ");
      const requiredLevel = parseInt(levelStr);
      const currentLevel = animal.skills?.[skillName] || 0;

      return {
        skillName,
        requiredLevel,
        currentLevel,
        met: currentLevel >= requiredLevel,
      };
    });
  }

  // Check if animal can perform an action based on skill requirements
  canPerformAction(animal: Animal, actionRequirements: string[]): boolean {
    if (!actionRequirements || actionRequirements.length === 0) return true;

    const requirements = this.checkSkillRequirements(
      animal,
      actionRequirements
    );
    return requirements.every((req) => req.met);
  }

  // Calculate efficiency bonus for an action based on skill level
  calculateSkillEfficiency(animal: Animal, skillName: string): number {
    const skillLevel = animal.skills?.[skillName] || 0;
    // Base efficiency is 1.0, with 1% improvement per skill level
    return 1.0 + skillLevel * 0.01;
  }

  // Get all skills an animal can currently learn (prerequisites met)
  getAvailableSkills(animal: Animal): SkillDefinition[] {
    const available: SkillDefinition[] = [];

    for (const [categoryName, skills] of Object.entries(this.skillTrees)) {
      for (const [skillKey, skillDef] of Object.entries(skills)) {
        const currentLevel = animal.skills?.[skillKey] || 0;

        // Skip if already maxed
        if (currentLevel >= skillDef.maxLevel) continue;

        // Check prerequisites
        if (skillDef.prerequisites) {
          const requirements = this.checkSkillRequirements(
            animal,
            skillDef.prerequisites
          );
          if (requirements.every((req) => req.met)) {
            available.push(skillDef);
          }
        } else {
          // No prerequisites required
          available.push(skillDef);
        }
      }
    }

    return available;
  }

  // Get skill definition by name
  getSkillDefinition(skillName: string): SkillDefinition | null {
    for (const [categoryName, skills] of Object.entries(this.skillTrees)) {
      for (const [skillKey, skillDef] of Object.entries(skills)) {
        if (skillKey === skillName || skillDef.name === skillName) {
          return skillDef;
        }
      }
    }
    return null;
  }

  // Generate XP for different action types
  generateActionXP(
    actionType: string,
    resourceType?: string,
    quality?: number
  ): SkillXPGain[] {
    const xpGains: SkillXPGain[] = [];
    const baseXP = 35; // higher base XP makes level up easier
    const qualityMultiplier = quality ? 1 + quality / 100 : 1;

    switch (actionType) {
      case "harvesting":
        if (
          resourceType?.includes("stone") ||
          resourceType?.includes("mineral")
        ) {
          xpGains.push({
            skillName: "mining",
            xpGained: baseXP * qualityMultiplier,
            actionType,
          });
        } else if (
          resourceType?.includes("plant") ||
          resourceType?.includes("berry")
        ) {
          xpGains.push({
            skillName: "foraging",
            xpGained: baseXP * qualityMultiplier,
            actionType,
          });
        } else if (
          resourceType?.includes("fish") ||
          resourceType?.includes("water")
        ) {
          xpGains.push({
            skillName: "fishing",
            xpGained: baseXP * qualityMultiplier,
            actionType,
          });
        }
        break;

      case "crafting":
        xpGains.push({
          skillName: "stoneKnapping",
          xpGained: baseXP * qualityMultiplier,
          actionType,
        });
        break;

      case "building":
        xpGains.push({
          skillName: "masonry",
          xpGained: baseXP * qualityMultiplier,
          actionType,
        });
        break;

      case "combat":
        xpGains.push({
          skillName: "combatTactics",
          xpGained: baseXP * qualityMultiplier,
          actionType,
        });
        break;

      case "exploring":
        xpGains.push({
          skillName: "navigation",
          xpGained: baseXP * 0.5,
          actionType,
        });
        break;

      case "socializing":
        xpGains.push({
          skillName: "charismaticLeader",
          xpGained: baseXP * 0.7,
          actionType,
        });
        break;
    }

    return xpGains;
  }

  // Get skill tree summary for an animal
  getSkillTreeSummary(animal: Animal) {
    const summary = {
      totalLevels: 0,
      maxedSkills: 0,
      advancedPathsUnlocked: animal.unlockedAdvancedPaths?.length || 0,
      skillsByCategory: {} as Record<
        string,
        Array<{ name: string; level: number; maxLevel: number }>
      >,
    };

    for (const [categoryName, skills] of Object.entries(this.skillTrees)) {
      summary.skillsByCategory[categoryName] = [];

      for (const [skillKey, skillDef] of Object.entries(skills)) {
        const level = animal.skills?.[skillKey] || 0;
        summary.totalLevels += level;

        if (level >= skillDef.maxLevel) {
          summary.maxedSkills++;
        }

        summary.skillsByCategory[categoryName].push({
          name: skillDef.name,
          level,
          maxLevel: skillDef.maxLevel,
        });
      }
    }

    return summary;
  }
}

// Singleton instance
export const skillSystem = new SkillSystem();
