export interface Nation {
  id: string;
  name: string;
  color: {
    primary: string;
    secondary: string;
  };
  
  // Leadership and government
  leaderId?: string; // ID of the animal that leads this nation (optional)
  foundingDate: number; // timestamp when nation was established
  
  // Territory and settlements
  settlements: string[]; // IDs of settlement buildings belonging to this nation
  territoryCenter?: { x: number; y: number; z: number }; // Center point of nation's territory
  
  // Population
  citizenIds: string[]; // IDs of animals belonging to this nation
  maxCitizens: number; // Maximum number of citizens this nation can support
  
  // Economy and taxation
  treasury: number; // Nation's accumulated wealth
  taxRate: number; // Percentage of citizen wealth collected as tax (0-100)
  lastTaxCollection: number; // timestamp of last tax collection
  
  // Policies and preferences
  policies: {
    expansion: number; // 0-100, desire to expand territory
    diplomacy: number; // 0-100, friendliness to other nations
    militarism: number; // 0-100, focus on combat and defense
    commerce: number; // 0-100, focus on trade and economy
  };
  
  // Relationships with other nations
  relationships: Record<string, NationRelationship>;
  
  // Statistics
  stats: {
    totalWealthGenerated: number;
    totalTaxesCollected: number;
    settlementsBuilt: number;
    averageCitizenWealth: number;
  };
}

export interface NationRelationship {
  nationId: string;
  reputation: number; // -100 to 100, how this nation views the other
  tradeAgreements: TradeAgreement[];
  lastInteraction: number; // timestamp
  relationshipType: "allied" | "neutral" | "hostile" | "at_war";
}

export interface TradeAgreement {
  id: string;
  type: "resource_exchange" | "tax_treaty" | "mutual_defense";
  terms: string; // Description of the agreement
  startDate: number;
  endDate?: number; // undefined for permanent agreements
  isActive: boolean;
}


export interface TaxationEvent {
  id: string;
  nationId: string;
  timestamp: number;
  citizenId: string;
  citizenName: string;
  wealthBefore: number;
  taxAmount: number;
  taxRate: number;
  success: boolean;
  reason?: string; // If taxation failed
}

export interface TerritoryInfo {
  nationId: string;
  settlementId: string;
  center: { x: number; y: number; z: number };
  radius: number;
  color: string;
  opacity: number;
}

// Nation colors - 6 distinct colors for the 6 nations
export const NATION_COLORS = [
  { primary: "#FF6B6B", secondary: "#FF8E53" }, // Red-Orange
  { primary: "#4ECDC4", secondary: "#45B7B8" }, // Teal
  { primary: "#45B7D1", secondary: "#6C5CE7" }, // Blue-Purple
  { primary: "#FFA726", secondary: "#FFD54F" }, // Orange-Yellow
  { primary: "#66BB6A", secondary: "#81C784" }, // Green
  { primary: "#AB47BC", secondary: "#CE93D8" }, // Purple-Pink
];

export const NATION_NAMES = [
  "Aetherian Federation",
  "Crystalline Republic", 
  "Verdant Alliance",
  "Solar Empire",
  "Mystic Confederation",
  "Ironhold Dominion"
];