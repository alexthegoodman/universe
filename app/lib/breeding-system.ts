import type { Animal } from '../types/animal';
import { DNASystem } from './dna-system';
import { AnimalLifecycle } from './animal-lifecycle';

export interface BreedingPair {
  parent1: Animal;
  parent2: Animal;
  compatibility: number;
  estimatedOffspring: number;
}

export interface BreedingAttempt {
  success: boolean;
  offspring?: Animal;
  message: string;
  cooldownTime: number; // milliseconds until next breeding attempt
}

export class BreedingSystem {
  private breedingCooldowns: Map<string, number> = new Map();
  private readonly BREEDING_COOLDOWN = 30 * 60 * 1000; // 30 minutes
  private readonly MIN_AGE_FOR_BREEDING = 0.25; // 25% of lifespan
  private readonly MAX_AGE_FOR_BREEDING = 0.85; // 85% of lifespan
  private readonly MIN_HEALTH_FOR_BREEDING = 60;
  private readonly MIN_ENERGY_FOR_BREEDING = 40;
  private readonly MIN_HAPPINESS_FOR_BREEDING = 50;
  
  canBreed(animal: Animal): { canBreed: boolean; reason?: string } {
    // Check if animal is alive
    if (!animal.isAlive) {
      return { canBreed: false, reason: 'Animal is not alive' };
    }
    
    // Check age range
    if (animal.age < this.MIN_AGE_FOR_BREEDING) {
      return { canBreed: false, reason: 'Too young to breed' };
    }
    
    if (animal.age > this.MAX_AGE_FOR_BREEDING) {
      return { canBreed: false, reason: 'Too old to breed' };
    }
    
    // Check health requirements
    if (animal.stats.health < this.MIN_HEALTH_FOR_BREEDING) {
      return { canBreed: false, reason: 'Health too low for breeding' };
    }
    
    if (animal.stats.energy < this.MIN_ENERGY_FOR_BREEDING) {
      return { canBreed: false, reason: 'Energy too low for breeding' };
    }
    
    if (animal.stats.happiness < this.MIN_HAPPINESS_FOR_BREEDING) {
      return { canBreed: false, reason: 'Happiness too low for breeding' };
    }
    
    // Check breeding cooldown
    const lastBreeding = this.breedingCooldowns.get(animal.id);
    if (lastBreeding && Date.now() - lastBreeding < this.BREEDING_COOLDOWN) {
      const remainingTime = this.BREEDING_COOLDOWN - (Date.now() - lastBreeding);
      return { 
        canBreed: false, 
        reason: `Breeding cooldown: ${Math.ceil(remainingTime / (1000 * 60))} minutes remaining` 
      };
    }
    
    return { canBreed: true };
  }
  
  findCompatibleMates(animal: Animal, availableAnimals: Animal[]): BreedingPair[] {
    const potentialMates = availableAnimals.filter(mate => {
      // Don't mate with self
      if (mate.id === animal.id) return false;
      
      // Check if mate can breed
      const mateCanBreed = this.canBreed(mate);
      if (!mateCanBreed.canBreed) return false;
      
      // Avoid inbreeding (check if they share parents)
      if (this.areRelated(animal, mate)) return false;
      
      return true;
    });
    
    // Calculate compatibility and sort by best matches
    const breedingPairs: BreedingPair[] = potentialMates.map(mate => {
      const compatibility = DNASystem.calculateCompatibility(animal.dna, mate.dna);
      const estimatedOffspring = this.calculateOffspringProbability(animal, mate);
      
      return {
        parent1: animal,
        parent2: mate,
        compatibility,
        estimatedOffspring
      };
    });
    
    // Sort by compatibility (higher is better)
    return breedingPairs.sort((a, b) => b.compatibility - a.compatibility);
  }
  
  private areRelated(animal1: Animal, animal2: Animal): boolean {
    // Check if they share parents
    if (animal1.dna.parentIds && animal2.dna.parentIds) {
      const parent1Ids = new Set(animal1.dna.parentIds);
      const parent2Ids = new Set(animal2.dna.parentIds);
      
      // Check if they share any parent
      for (const parentId of parent1Ids) {
        if (parent2Ids.has(parentId)) return true;
      }
    }
    
    // Check if one is the parent of the other
    if (animal1.dna.parentIds?.includes(animal2.dna.id) || 
        animal2.dna.parentIds?.includes(animal1.dna.id)) {
      return true;
    }
    
    return false;
  }
  
  private calculateOffspringProbability(parent1: Animal, parent2: Animal): number {
    // Base probability
    let probability = 0.7;
    
    // Health influences probability
    const avgHealth = (parent1.stats.health + parent2.stats.health) / 2;
    probability *= (avgHealth / 100);
    
    // Age influences probability (peak fertility in middle age)
    const avgAge = (parent1.age + parent2.age) / 2;
    const ageFactor = 1 - Math.abs(0.5 - avgAge) * 2; // Peak at 50% of lifespan
    probability *= ageFactor;
    
    // DNA strength influences probability
    const parent1Strength = DNASystem.getDNAStrength(parent1.dna);
    const parent2Strength = DNASystem.getDNAStrength(parent2.dna);
    const avgStrength = (parent1Strength + parent2Strength) / 2;
    probability *= (avgStrength / 100);
    
    // Compatibility influences probability
    const compatibility = DNASystem.calculateCompatibility(parent1.dna, parent2.dna);
    probability *= (compatibility / 100);
    
    return Math.max(0, Math.min(1, probability));
  }
  
  attemptBreeding(parent1: Animal, parent2: Animal): BreedingAttempt {
    // Check if both animals can breed
    const parent1CanBreed = this.canBreed(parent1);
    if (!parent1CanBreed.canBreed) {
      return {
        success: false,
        message: `${parent1.name} cannot breed: ${parent1CanBreed.reason}`,
        cooldownTime: 0
      };
    }
    
    const parent2CanBreed = this.canBreed(parent2);
    if (!parent2CanBreed.canBreed) {
      return {
        success: false,
        message: `${parent2.name} cannot breed: ${parent2CanBreed.reason}`,
        cooldownTime: 0
      };
    }
    
    // Check if they're related
    if (this.areRelated(parent1, parent2)) {
      return {
        success: false,
        message: `${parent1.name} and ${parent2.name} are too closely related`,
        cooldownTime: 0
      };
    }
    
    // Calculate breeding success probability
    const probability = this.calculateOffspringProbability(parent1, parent2);
    const success = Math.random() < probability;
    
    if (!success) {
      // Set breeding cooldown even for failed attempts
      this.breedingCooldowns.set(parent1.id, Date.now());
      this.breedingCooldowns.set(parent2.id, Date.now());
      
      return {
        success: false,
        message: `${parent1.name} and ${parent2.name} attempted to breed but were unsuccessful`,
        cooldownTime: this.BREEDING_COOLDOWN
      };
    }
    
    // Create offspring
    const offspringName = AnimalLifecycle.generateRandomName();
    const position = {
      x: (parent1.position.x + parent2.position.x) / 2 + (Math.random() - 0.5) * 5,
      y: 0,
      z: (parent1.position.z + parent2.position.z) / 2 + (Math.random() - 0.5) * 5,
      rotation: Math.random() * Math.PI * 2
    };
    
    const offspring = AnimalLifecycle.createAnimal(offspringName, position, [parent1.dna, parent2.dna]);
    
    // Apply breeding energy cost to parents
    const energyCost = 25;
    parent1.stats.energy = Math.max(0, parent1.stats.energy - energyCost);
    parent2.stats.energy = Math.max(0, parent2.stats.energy - energyCost);
    
    // Boost happiness for successful breeding
    parent1.stats.happiness = Math.min(100, parent1.stats.happiness + 20);
    parent2.stats.happiness = Math.min(100, parent2.stats.happiness + 20);
    
    // Set breeding cooldown
    this.breedingCooldowns.set(parent1.id, Date.now());
    this.breedingCooldowns.set(parent2.id, Date.now());
    
    return {
      success: true,
      offspring,
      message: `${parent1.name} and ${parent2.name} successfully bred! ${offspringName} was born.`,
      cooldownTime: this.BREEDING_COOLDOWN
    };
  }
  
  autoBreeding(animals: Animal[]): BreedingAttempt[] {
    const results: BreedingAttempt[] = [];
    const availableForBreeding = animals.filter(animal => this.canBreed(animal).canBreed);
    
    // Find animals that want to breed (based on personality and conditions)
    const interestedInBreeding = availableForBreeding.filter(animal => {
      // Higher nurturing personality = more likely to want to breed
      const breedingDesire = animal.dna.personality.nurturing / 100;
      
      // Adult animals are more likely to breed
      const ageBonus = animal.age > 0.3 && animal.age < 0.7 ? 0.3 : 0;
      
      // High happiness increases breeding desire
      const happinessBonus = animal.stats.happiness > 70 ? 0.2 : 0;
      
      const totalDesire = breedingDesire + ageBonus + happinessBonus;
      
      return Math.random() < totalDesire * 0.3; // 30% base chance modified by factors
    });
    
    // Try to pair up interested animals
    const paired = new Set<string>();
    
    for (const animal of interestedInBreeding) {
      if (paired.has(animal.id)) continue;
      
      const compatibleMates = this.findCompatibleMates(animal, interestedInBreeding)
        .filter(pair => !paired.has(pair.parent2.id));
      
      if (compatibleMates.length > 0) {
        const bestMate = compatibleMates[0]; // Already sorted by compatibility
        
        // Only proceed if compatibility is reasonable
        if (bestMate.compatibility > 30) {
          const result = this.attemptBreeding(animal, bestMate.parent2);
          results.push(result);
          
          paired.add(animal.id);
          paired.add(bestMate.parent2.id);
        }
      }
    }
    
    return results;
  }
  
  getBreedingCooldown(animalId: string): number {
    const lastBreeding = this.breedingCooldowns.get(animalId);
    if (!lastBreeding) return 0;
    
    const elapsed = Date.now() - lastBreeding;
    return Math.max(0, this.BREEDING_COOLDOWN - elapsed);
  }
  
  clearBreedingCooldown(animalId: string): void {
    this.breedingCooldowns.delete(animalId);
  }
  
  getBreedingStatistics(animals: Animal[]) {
    const canBreed = animals.filter(a => this.canBreed(a).canBreed).length;
    const onCooldown = animals.filter(a => this.getBreedingCooldown(a.id) > 0).length;
    const tooYoung = animals.filter(a => a.age < this.MIN_AGE_FOR_BREEDING).length;
    const tooOld = animals.filter(a => a.age > this.MAX_AGE_FOR_BREEDING).length;
    const unhealthy = animals.filter(a => 
      a.stats.health < this.MIN_HEALTH_FOR_BREEDING ||
      a.stats.energy < this.MIN_ENERGY_FOR_BREEDING ||
      a.stats.happiness < this.MIN_HAPPINESS_FOR_BREEDING
    ).length;
    
    return {
      total: animals.length,
      canBreed,
      onCooldown,
      tooYoung,
      tooOld,
      unhealthy
    };
  }
}