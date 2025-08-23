import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';

interface GameLog {
  id: string;
  timestamp: string;
  gameId: string;
  player: string;
  gameType: string;
  score: number;
  duration: number;
  won: boolean;
  result: string;
  hash: string; // Hash of the game data for verification
  verified: boolean;
  blockchainTxHash?: string;
  mintTxHash?: string;
  createdAt: string;
}

interface GameDatabase {
  version: string;
  lastUpdated: string;
  totalGames: number;
  games: GameLog[];
}

const DB_FILE_PATH = path.join(process.cwd(), 'data', 'game-logs.json');

/**
 * Ensures the data directory exists
 */
function ensureDataDirectory() {
  const dataDir = path.dirname(DB_FILE_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

/**
 * Generates a hash for game data to ensure integrity
 */
function generateGameHash(gameData: Omit<GameLog, 'id' | 'hash' | 'verified' | 'blockchainTxHash' | 'mintTxHash' | 'createdAt'>): string {
  const dataString = JSON.stringify({
    timestamp: gameData.timestamp,
    gameId: gameData.gameId,
    player: gameData.player.toLowerCase(),
    gameType: gameData.gameType,
    score: gameData.score,
    duration: gameData.duration,
    won: gameData.won,
    result: gameData.result
  });
  return createHash('sha256').update(dataString).digest('hex');
}

/**
 * Loads the game database from file
 */
function loadDatabase(): GameDatabase {
  ensureDataDirectory();
  
  if (!fs.existsSync(DB_FILE_PATH)) {
    const initialDb: GameDatabase = {
      version: '1.0',
      lastUpdated: new Date().toISOString(),
      totalGames: 0,
      games: []
    };
    saveDatabase(initialDb);
    return initialDb;
  }
  
  try {
    const data = fs.readFileSync(DB_FILE_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading database:', error);
    // Return empty database if file is corrupted
    return {
      version: '1.0',
      lastUpdated: new Date().toISOString(),
      totalGames: 0,
      games: []
    };
  }
}

/**
 * Saves the game database to file
 */
function saveDatabase(db: GameDatabase): void {
  ensureDataDirectory();
  
  try {
    db.lastUpdated = new Date().toISOString();
    db.totalGames = db.games.length;
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(db, null, 2));
  } catch (error) {
    console.error('Error saving database:', error);
    throw new Error('Failed to save game database');
  }
}

/**
 * Stores a new game log in the database
 */
export function storeGameLog(gameData: {
  timestamp: string;
  gameId: string;
  player: string;
  gameType: string;
  score: number;
  duration: number;
  won: boolean;
  result: string;
}): GameLog {
  const db = loadDatabase();
  
  const hash = generateGameHash(gameData);
  const id = `${gameData.gameType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const gameLog: GameLog = {
    id,
    ...gameData,
    hash,
    verified: false,
    createdAt: new Date().toISOString()
  };
  
  db.games.push(gameLog);
  
  // Keep only last 1000 games to prevent file from growing too large
  if (db.games.length > 1000) {
    db.games = db.games.slice(-1000);
  }
  
  saveDatabase(db);
  
  console.log(`Game log stored with ID: ${id}`);
  return gameLog;
}

/**
 * Retrieves a game log by ID
 */
export function getGameLog(id: string): GameLog | null {
  const db = loadDatabase();
  return db.games.find(game => game.id === id) || null;
}

/**
 * Retrieves game logs by player address
 */
export function getGameLogsByPlayer(playerAddress: string): GameLog[] {
  const db = loadDatabase();
  return db.games.filter(game => game.player.toLowerCase() === playerAddress.toLowerCase());
}

/**
 * Verifies a game log against blockchain data
 */
export function verifyGameLog(id: string, blockchainData: any): boolean {
  const gameLog = getGameLog(id);
  if (!gameLog) {
    console.error(`Game log not found: ${id}`);
    return false;
  }
  
  // Generate hash from blockchain data
  const blockchainHash = generateGameHash({
    timestamp: blockchainData.timestamp,
    gameId: blockchainData.gameId,
    player: blockchainData.player,
    gameType: blockchainData.gameType,
    score: blockchainData.score,
    duration: blockchainData.duration,
    won: blockchainData.won,
    result: blockchainData.result
  });
  
  const isValid = gameLog.hash === blockchainHash;
  
  if (isValid) {
    // Update verification status
    updateGameLogVerification(id, true, blockchainData.blockchainTxHash);
    console.log(`Game log verified successfully: ${id}`);
  } else {
    console.error(`Game log verification failed: ${id}`);
    console.error('Expected hash:', gameLog.hash);
    console.error('Blockchain hash:', blockchainHash);
  }
  
  return isValid;
}

/**
 * Updates the verification status of a game log
 */
export function updateGameLogVerification(id: string, verified: boolean, blockchainTxHash?: string, mintTxHash?: string): void {
  const db = loadDatabase();
  const gameIndex = db.games.findIndex(game => game.id === id);
  
  if (gameIndex === -1) {
    throw new Error(`Game log not found: ${id}`);
  }
  
  db.games[gameIndex].verified = verified;
  if (blockchainTxHash) {
    db.games[gameIndex].blockchainTxHash = blockchainTxHash;
  }
  if (mintTxHash) {
    db.games[gameIndex].mintTxHash = mintTxHash;
  }
  
  saveDatabase(db);
}

/**
 * Gets all game logs
 */
export function getAllGameLogs(): GameLog[] {
  const db = loadDatabase();
  return db.games;
}

/**
 * Gets game statistics
 */
export function getGameStats(): {
  totalGames: number;
  totalWins: number;
  totalVerified: number;
  gamesByType: Record<string, number>;
} {
  const db = loadDatabase();
  
  const stats = {
    totalGames: db.games.length,
    totalWins: db.games.filter(g => g.won).length,
    totalVerified: db.games.filter(g => g.verified).length,
    gamesByType: {} as Record<string, number>
  };
  
  db.games.forEach(game => {
    stats.gamesByType[game.gameType] = (stats.gamesByType[game.gameType] || 0) + 1;
  });
  
  return stats;
}

/**
 * Checks if a game ID already exists (prevents duplicate submissions)
 */
export function gameIdExists(gameId: string): boolean {
  const db = loadDatabase();
  return db.games.some(game => game.gameId === gameId);
}