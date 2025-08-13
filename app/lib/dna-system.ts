import { v4 as uuidv4 } from 'uuid';
import type { AnimalDNA, Animal, AnimalStats, AnimalPosition } from '../types/animal';

export class DNASystem {
  
  static generateRandomDNA(generation: number = 0): AnimalDNA {
    const randomTrait = () => Math.floor(Math.random() * 100) + 1;
    const randomColor = () => `#${Math.floor(Math.random()*16777215).toString(16)}`;
    
    return {
      id: uuidv4(),
      intelligence: randomTrait(),
      agility: randomTrait(),
      strength: randomTrait(),
      social: randomTrait(),
      curiosity: randomTrait(),
      resilience: randomTrait(),
      
      size: 0.5 + Math.random() * 1.5, // 0.5 - 2.0
      color: {
        primary: randomColor(),
        secondary: randomColor(),
      },
      
      personality: {
        aggressive: randomTrait(),
        playful: randomTrait(),
        cautious: randomTrait(),
        nurturing: randomTrait(),
      },
      
      generation
    };
  }
  
  static breedDNA(parent1: AnimalDNA, parent2: AnimalDNA): AnimalDNA {
    const inheritTrait = (trait1: number, trait2: number): number => {
      // Weighted average with slight random mutation
      const average = (trait1 + trait2) / 2;
      const mutation = (Math.random() - 0.5) * 20; // ±10 mutation
      return Math.max(1, Math.min(100, Math.round(average + mutation)));
    };
    
    const inheritColor = (color1: string, color2: string): string => {
      // Simple color blending with chance for random mutation
      if (Math.random() < 0.1) { // 10% chance for random color mutation
        return `#${Math.floor(Math.random()*16777215).toString(16)}`;
      }
      
      // Blend parent colors
      const hex1 = parseInt(color1.slice(1), 16);
      const hex2 = parseInt(color2.slice(1), 16);
      
      const r1 = (hex1 >> 16) & 255;
      const g1 = (hex1 >> 8) & 255;
      const b1 = hex1 & 255;
      
      const r2 = (hex2 >> 16) & 255;
      const g2 = (hex2 >> 8) & 255;
      const b2 = hex2 & 255;
      
      const r = Math.round((r1 + r2) / 2);
      const g = Math.round((g1 + g2) / 2);
      const b = Math.round((b1 + b2) / 2);
      
      return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
    };
    
    const inheritSize = (size1: number, size2: number): number => {
      const average = (size1 + size2) / 2;
      const mutation = (Math.random() - 0.5) * 0.4; // ±0.2 mutation
      return Math.max(0.5, Math.min(2.0, average + mutation));
    };
    
    return {
      id: uuidv4(),
      intelligence: inheritTrait(parent1.intelligence, parent2.intelligence),
      agility: inheritTrait(parent1.agility, parent2.agility),
      strength: inheritTrait(parent1.strength, parent2.strength),
      social: inheritTrait(parent1.social, parent2.social),
      curiosity: inheritTrait(parent1.curiosity, parent2.curiosity),
      resilience: inheritTrait(parent1.resilience, parent2.resilience),
      
      size: inheritSize(parent1.size, parent2.size),
      color: {
        primary: inheritColor(parent1.color.primary, parent2.color.primary),
        secondary: inheritColor(parent1.color.secondary, parent2.color.secondary),
      },
      
      personality: {
        aggressive: inheritTrait(parent1.personality.aggressive, parent2.personality.aggressive),
        playful: inheritTrait(parent1.personality.playful, parent2.personality.playful),
        cautious: inheritTrait(parent1.personality.cautious, parent2.personality.cautious),
        nurturing: inheritTrait(parent1.personality.nurturing, parent2.personality.nurturing),
      },
      
      parentIds: [parent1.id, parent2.id],
      generation: Math.max(parent1.generation, parent2.generation) + 1,
    };
  }
  
  static calculateCompatibility(dna1: AnimalDNA, dna2: AnimalDNA): number {
    // Calculate breeding compatibility based on trait differences
    const traitDiff = (
      Math.abs(dna1.intelligence - dna2.intelligence) +
      Math.abs(dna1.agility - dna2.agility) +
      Math.abs(dna1.strength - dna2.strength) +
      Math.abs(dna1.social - dna2.social) +
      Math.abs(dna1.curiosity - dna2.curiosity) +
      Math.abs(dna1.resilience - dna2.resilience)
    ) / 6;
    
    const personalityDiff = (
      Math.abs(dna1.personality.aggressive - dna2.personality.aggressive) +
      Math.abs(dna1.personality.playful - dna2.personality.playful) +
      Math.abs(dna1.personality.cautious - dna2.personality.cautious) +
      Math.abs(dna1.personality.nurturing - dna2.personality.nurturing)
    ) / 4;
    
    const sizeDiff = Math.abs(dna1.size - dna2.size) * 50; // Scale to 0-100
    
    // Lower differences mean higher compatibility
    const compatibility = 100 - ((traitDiff + personalityDiff + sizeDiff) / 3);
    return Math.max(0, Math.min(100, compatibility));
  }
  
  static getDNAStrength(dna: AnimalDNA): number {
    // Calculate overall "fitness" of DNA
    const traitAverage = (
      dna.intelligence + dna.agility + dna.strength + 
      dna.social + dna.curiosity + dna.resilience
    ) / 6;
    
    const personalityBalance = 100 - Math.abs(50 - (
      dna.personality.aggressive + dna.personality.playful +
      dna.personality.cautious + dna.personality.nurturing
    ) / 4);
    
    const sizeBonus = dna.size > 1.5 ? 10 : (dna.size < 0.7 ? -10 : 0);
    
    return Math.max(0, Math.min(100, traitAverage + personalityBalance * 0.3 + sizeBonus));
  }
}