const WebSocket = require('ws');
const http = require('http');

class GameWebSocketServer {
  constructor(port = 8080) {
    this.port = port;
    this.clients = new Set();
    this.gameState = {
      animals: new Map(),
      world: {
        resources: [],
        environment: {
          temperature: 72,
          humidity: 0.6,
          timeOfDay: 'day'
        }
      }
    };
    
    this.server = http.createServer();
    this.wss = new WebSocket.Server({ server: this.server });
    
    this.setupWebSocketHandlers();
  }
  
  setupWebSocketHandlers() {
    this.wss.on('connection', (ws) => {
      console.log('New client connected');
      this.clients.add(ws);
      
      // Send initial game state
      this.sendToClient(ws, {
        type: 'gameState',
        data: this.serializeGameState()
      });
      
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          this.handleClientMessage(ws, data);
        } catch (error) {
          console.error('Error parsing client message:', error);
        }
      });
      
      ws.on('close', () => {
        console.log('Client disconnected');
        this.clients.delete(ws);
      });
      
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.clients.delete(ws);
      });
    });
  }
  
  handleClientMessage(ws, data) {
    switch (data.type) {
      case 'spawnAnimal':
        this.handleSpawnAnimal(data.payload);
        break;
      case 'removeAnimal':
        this.handleRemoveAnimal(data.payload);
        break;
      case 'updateWorld':
        this.handleUpdateWorld(data.payload);
        break;
      case 'getAnimalDetails':
        this.handleGetAnimalDetails(ws, data.payload);
        break;
      default:
        console.log('Unknown message type:', data.type);
    }
  }
  
  handleSpawnAnimal(payload) {
    const { animal } = payload;
    this.gameState.animals.set(animal.id, animal);
    
    this.broadcastToClients({
      type: 'animalSpawned',
      data: animal
    });
  }
  
  handleRemoveAnimal(payload) {
    const { animalId } = payload;
    const animal = this.gameState.animals.get(animalId);
    
    if (animal) {
      this.gameState.animals.delete(animalId);
      
      this.broadcastToClients({
        type: 'animalRemoved',
        data: { animalId, animal }
      });
    }
  }
  
  handleUpdateWorld(payload) {
    const { updates } = payload;
    
    // Update world state
    Object.assign(this.gameState.world, updates);
    
    this.broadcastToClients({
      type: 'worldUpdated',
      data: updates
    });
  }
  
  handleGetAnimalDetails(ws, payload) {
    const { animalId } = payload;
    const animal = this.gameState.animals.get(animalId);
    
    this.sendToClient(ws, {
      type: 'animalDetails',
      data: animal || null
    });
  }
  
  updateAnimal(animal) {
    this.gameState.animals.set(animal.id, animal);
    
    this.broadcastToClients({
      type: 'animalUpdated',
      data: animal
    });
  }
  
  updateAnimalPosition(animalId, position) {
    const animal = this.gameState.animals.get(animalId);
    if (animal) {
      animal.position = position;
      this.gameState.animals.set(animalId, animal);
      
      this.broadcastToClients({
        type: 'animalMoved',
        data: { animalId, position }
      });
    }
  }
  
  broadcastHealthUpdate(healthReport) {
    this.broadcastToClients({
      type: 'healthUpdate',
      data: healthReport
    });
  }
  
  broadcastAnimalAction(animalId, action, result) {
    this.broadcastToClients({
      type: 'animalAction',
      data: {
        animalId,
        action,
        result,
        timestamp: Date.now()
      }
    });
  }
  
  sendToClient(ws, message) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }
  
  broadcastToClients(message) {
    const messageStr = JSON.stringify(message);
    
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  }
  
  serializeGameState() {
    return {
      animals: Array.from(this.gameState.animals.values()),
      world: this.gameState.world,
      timestamp: Date.now()
    };
  }
  
  start() {
    this.server.listen(this.port, () => {
      console.log(`🚀 Universe WebSocket server running on port ${this.port}`);
    });
  }
  
  stop() {
    this.wss.close();
    this.server.close();
  }
}

// Create and start the server if this file is run directly
if (require.main === module) {
  const server = new GameWebSocketServer(8080);
  server.start();
}

module.exports = GameWebSocketServer;