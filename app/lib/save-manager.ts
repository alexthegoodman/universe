import { db, type GameSave } from './database';
import { GameManager } from './game-manager';

export interface SaveGameOptions {
  name?: string;
  includeScreenshot?: boolean;
  playerNationId?: string;
}

export interface LoadGameResult {
  success: boolean;
  message: string;
  gameManager?: GameManager;
}

export class SaveManager {
  private gameManager: GameManager;

  constructor(gameManager: GameManager) {
    this.gameManager = gameManager;
  }

  /**
   * Save the current game state to the database
   */
  async saveGame(options: SaveGameOptions = {}): Promise<{ success: boolean; message: string; saveId?: number }> {
    try {
      if (!this.gameManager) {
        return { success: false, message: 'No active game to save' };
      }

      const worldState = this.gameManager.getWorldState();
      const gameTime = Date.now(); // Use current timestamp as game time
      
      // Generate save name if not provided
      const saveName = options.name || `Save ${new Date().toLocaleString()}`;
      
      // Optional: Capture screenshot (placeholder for now)
      let screenshot: string | undefined;
      if (options.includeScreenshot) {
        screenshot = await this.captureScreenshot();
      }

      // Prepare complete game state for saving
      const completeGameState = {
        animals: this.gameManager.getAllAnimals(),
        buildings: worldState.buildings,
        resources: worldState.resources,
        nations: worldState.nations,
        bandits: worldState.bandits,
        territories: worldState.territories,
        events: worldState.events,
        environment: worldState.environment,
        worldConfig: { width: 300, height: 30, depth: 300 }, // Default world config
        gameTime,
        version: 1,
      };

      const saveId = await db.saveGame(
        saveName,
        completeGameState,
        options.playerNationId,
        false, // not a quick save
        screenshot
      );

      return {
        success: true,
        message: `Game saved successfully as "${saveName}"`,
        saveId
      };
    } catch (error) {
      console.error('Failed to save game:', error);
      return {
        success: false,
        message: `Failed to save game: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Load a game from the database
   */
  async loadGame(saveId: number): Promise<LoadGameResult> {
    try {
      const savedData = await db.loadGame(saveId);
      
      if (!savedData) {
        return {
          success: false,
          message: 'Save file not found or corrupted'
        };
      }

      // Create new GameManager with loaded state
      const newGameManager = new GameManager({
        startingAnimals: 0, // We'll load existing animals
        maxAnimals: 200, // Reasonable default
        enableWebSocket: false,
        worldSize: savedData.worldConfig,
      });

      // Load the saved state into the game manager
      await newGameManager.loadFromSave(savedData);

      // Update last modified time
      await db.gameSaves.where('id').equals(saveId).modify({
        lastModifiedAt: Date.now()
      });

      return {
        success: true,
        message: 'Game loaded successfully',
        gameManager: newGameManager
      };
    } catch (error) {
      console.error('Failed to load game:', error);
      return {
        success: false,
        message: `Failed to load game: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Quick save the current game
   */
  async quickSave(playerNationId?: string): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.gameManager) {
        return { success: false, message: 'No active game to quick save' };
      }

      const worldState = this.gameManager.getWorldState();
      const gameTime = Date.now(); // Use current timestamp as game time
      
      // Optional: Capture screenshot for quick save
      const screenshot = await this.captureScreenshot();

      // Prepare complete game state for saving
      const completeGameState = {
        animals: this.gameManager.getAllAnimals(),
        buildings: worldState.buildings,
        resources: worldState.resources,
        nations: worldState.nations,
        bandits: worldState.bandits,
        territories: worldState.territories,
        events: worldState.events,
        environment: worldState.environment,
        worldConfig: { width: 300, height: 30, depth: 300 }, // Default world config
        gameTime,
        version: 1,
      };

      await db.quickSave(completeGameState, playerNationId, screenshot);

      return {
        success: true,
        message: 'Game quick saved successfully'
      };
    } catch (error) {
      console.error('Failed to quick save game:', error);
      return {
        success: false,
        message: `Failed to quick save: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Load the quick save if it exists
   */
  async loadQuickSave(): Promise<LoadGameResult> {
    try {
      const quickSave = await db.getQuickSave();
      
      if (!quickSave) {
        return {
          success: false,
          message: 'No quick save found'
        };
      }

      return this.loadGame(quickSave.id!);
    } catch (error) {
      console.error('Failed to load quick save:', error);
      return {
        success: false,
        message: `Failed to load quick save: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get all saved games
   */
  async getAllSaves(): Promise<GameSave[]> {
    try {
      return await db.getAllSaves();
    } catch (error) {
      console.error('Failed to get saves:', error);
      return [];
    }
  }

  /**
   * Delete a saved game
   */
  async deleteSave(saveId: number): Promise<{ success: boolean; message: string }> {
    try {
      await db.deleteSave(saveId);
      return {
        success: true,
        message: 'Save deleted successfully'
      };
    } catch (error) {
      console.error('Failed to delete save:', error);
      return {
        success: false,
        message: `Failed to delete save: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Check if a quick save exists
   */
  async hasQuickSave(): Promise<boolean> {
    try {
      const quickSave = await db.getQuickSave();
      return !!quickSave;
    } catch (error) {
      console.error('Failed to check for quick save:', error);
      return false;
    }
  }

  /**
   * Capture a screenshot of the current game state
   * This is a placeholder implementation - you may want to integrate with a screenshot library
   */
  private async captureScreenshot(): Promise<string | undefined> {
    try {
      // In a real implementation, you might use html2canvas or similar
      // For now, we'll just create a placeholder data URL
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 180;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // Create a simple gradient placeholder
        const gradient = ctx.createLinearGradient(0, 0, 320, 180);
        gradient.addColorStop(0, '#4F46E5');
        gradient.addColorStop(1, '#06B6D4');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 320, 180);
        
        // Add text
        ctx.fillStyle = 'white';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Universe Save', 160, 90);
        ctx.font = '12px Arial';
        ctx.fillText(new Date().toLocaleString(), 160, 110);
      }
      
      return canvas.toDataURL('image/jpeg', 0.8);
    } catch (error) {
      console.error('Failed to capture screenshot:', error);
      return undefined;
    }
  }

  /**
   * Get save statistics
   */
  async getSaveStats(): Promise<{
    totalSaves: number;
    totalQuickSaves: number;
    oldestSave?: GameSave;
    newestSave?: GameSave;
    totalStorageUsed: number; // Approximate
  }> {
    try {
      const saves = await this.getAllSaves();
      const quickSaves = saves.filter(save => save.isQuickSave);
      
      return {
        totalSaves: saves.length,
        totalQuickSaves: quickSaves.length,
        oldestSave: saves.length > 0 ? saves[saves.length - 1] : undefined,
        newestSave: saves.length > 0 ? saves[0] : undefined,
        totalStorageUsed: await this.estimateStorageSize(),
      };
    } catch (error) {
      console.error('Failed to get save stats:', error);
      return {
        totalSaves: 0,
        totalQuickSaves: 0,
        totalStorageUsed: 0,
      };
    }
  }

  /**
   * Estimate total storage used by saves (approximate)
   */
  private async estimateStorageSize(): Promise<number> {
    try {
      // This is a rough estimate - in practice you'd want to use browser storage APIs
      const saves = await this.getAllSaves();
      return saves.length * 1024 * 500; // Rough estimate: 500KB per save
    } catch (error) {
      return 0;
    }
  }

  /**
   * Export a save to JSON format (for backup/sharing)
   */
  async exportSave(saveId: number): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      const savedData = await db.loadGame(saveId);
      const saveMetadata = await db.gameSaves.get(saveId);
      
      if (!savedData || !saveMetadata) {
        return {
          success: false,
          message: 'Save file not found'
        };
      }

      const exportData = {
        metadata: saveMetadata,
        gameState: savedData,
        exportedAt: Date.now(),
        version: '1.0.0'
      };

      return {
        success: true,
        message: 'Save exported successfully',
        data: exportData
      };
    } catch (error) {
      console.error('Failed to export save:', error);
      return {
        success: false,
        message: `Failed to export save: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}