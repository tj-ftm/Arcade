import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';

interface MintLog {
  id: string;
  timestamp: string;
  playerAddress: string;
  gameType: string;
  gameId?: string;
  amount: number; // Amount in wei
  amountFormatted: string; // Amount in ARC tokens (formatted)
  txHash: string;
  blockNumber?: number;
  verified: boolean;
  createdAt: string;
}

interface MintDatabase {
  version: string;
  lastUpdated: string;
  totalMints: number;
  totalAmountMinted: string; // Total amount in ARC tokens
  mints: MintLog[];
}

const MINT_DB_FILE_PATH = path.join(process.cwd(), 'data', 'mint-logs.json');

/**
 * Ensures the data directory exists
 */
function ensureDataDirectory() {
  const dataDir = path.dirname(MINT_DB_FILE_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

/**
 * Generates a unique ID for mint log
 */
function generateMintId(playerAddress: string, timestamp: string, txHash: string): string {
  const dataString = `${playerAddress.toLowerCase()}-${timestamp}-${txHash}`;
  return createHash('sha256').update(dataString).digest('hex').substring(0, 16);
}

/**
 * Loads the mint database from file
 */
function loadMintDatabase(): MintDatabase {
  ensureDataDirectory();
  
  if (!fs.existsSync(MINT_DB_FILE_PATH)) {
    const initialDb: MintDatabase = {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      totalMints: 0,
      totalAmountMinted: '0',
      mints: []
    };
    saveMintDatabase(initialDb);
    return initialDb;
  }

  try {
    const data = fs.readFileSync(MINT_DB_FILE_PATH, 'utf8');
    const db = JSON.parse(data) as MintDatabase;
    
    // Ensure all required fields exist
    if (!db.version) db.version = '1.0.0';
    if (!db.totalAmountMinted) db.totalAmountMinted = '0';
    if (!db.mints) db.mints = [];
    
    return db;
  } catch (error) {
    console.error('Error loading mint database:', error);
    // Return fresh database if corrupted
    return {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      totalMints: 0,
      totalAmountMinted: '0',
      mints: []
    };
  }
}

/**
 * Saves the mint database to file
 */
function saveMintDatabase(db: MintDatabase): void {
  try {
    ensureDataDirectory();
    db.lastUpdated = new Date().toISOString();
    fs.writeFileSync(MINT_DB_FILE_PATH, JSON.stringify(db, null, 2));
  } catch (error) {
    console.error('Error saving mint database:', error);
    throw new Error('Failed to save mint database');
  }
}

/**
 * Stores a new mint log
 */
export function storeMintLog(mintData: {
  timestamp: string;
  playerAddress: string;
  gameType: string;
  gameId?: string;
  amount: number; // Amount in wei
  amountFormatted: string; // Amount in ARC tokens
  txHash: string;
  blockNumber?: number;
}): MintLog {
  const db = loadMintDatabase();
  
  const mintLog: MintLog = {
    id: generateMintId(mintData.playerAddress, mintData.timestamp, mintData.txHash),
    timestamp: mintData.timestamp,
    playerAddress: mintData.playerAddress.toLowerCase(),
    gameType: mintData.gameType,
    gameId: mintData.gameId,
    amount: mintData.amount,
    amountFormatted: mintData.amountFormatted,
    txHash: mintData.txHash,
    blockNumber: mintData.blockNumber,
    verified: false, // Will be verified later
    createdAt: new Date().toISOString()
  };
  
  // Check if mint already exists
  const existingMint = db.mints.find(m => m.txHash === mintData.txHash);
  if (existingMint) {
    console.log('Mint already exists:', existingMint.id);
    return existingMint;
  }
  
  db.mints.push(mintLog);
  db.totalMints = db.mints.length;
  
  // Update total amount minted
  const currentTotal = parseFloat(db.totalAmountMinted || '0');
  const newAmount = parseFloat(mintData.amountFormatted);
  db.totalAmountMinted = (currentTotal + newAmount).toString();
  
  saveMintDatabase(db);
  
  console.log('Stored mint log:', mintLog.id);
  return mintLog;
}

/**
 * Gets a specific mint log by ID
 */
export function getMintLog(id: string): MintLog | null {
  const db = loadMintDatabase();
  return db.mints.find(mint => mint.id === id) || null;
}

/**
 * Gets all mint logs for a specific player
 */
export function getMintLogsByPlayer(playerAddress: string): MintLog[] {
  const db = loadMintDatabase();
  return db.mints.filter(mint => mint.playerAddress === playerAddress.toLowerCase());
}

/**
 * Gets all mint logs for a specific game type
 */
export function getMintLogsByGameType(gameType: string): MintLog[] {
  const db = loadMintDatabase();
  return db.mints.filter(mint => mint.gameType === gameType);
}

/**
 * Gets all mint logs
 */
export function getAllMintLogs(): MintLog[] {
  const db = loadMintDatabase();
  return db.mints.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

/**
 * Updates mint verification status
 */
export function updateMintVerification(id: string, verified: boolean, blockNumber?: number): void {
  const db = loadMintDatabase();
  const mintIndex = db.mints.findIndex(mint => mint.id === id);
  
  if (mintIndex === -1) {
    throw new Error(`Mint log not found: ${id}`);
  }
  
  db.mints[mintIndex].verified = verified;
  if (blockNumber) {
    db.mints[mintIndex].blockNumber = blockNumber;
  }
  
  saveMintDatabase(db);
  console.log(`Updated mint verification: ${id} -> ${verified}`);
}

/**
 * Gets mint statistics
 */
export function getMintStats(): {
  totalMints: number;
  totalAmountMinted: string;
  mintsByGameType: Record<string, { count: number; amount: string }>;
  mintsByPlayer: Record<string, { count: number; amount: string }>;
  verifiedMints: number;
} {
  const db = loadMintDatabase();
  
  const mintsByGameType: Record<string, { count: number; amount: string }> = {};
  const mintsByPlayer: Record<string, { count: number; amount: string }> = {};
  let verifiedMints = 0;
  
  db.mints.forEach(mint => {
    // Count by game type
    if (!mintsByGameType[mint.gameType]) {
      mintsByGameType[mint.gameType] = { count: 0, amount: '0' };
    }
    mintsByGameType[mint.gameType].count++;
    const currentGameAmount = parseFloat(mintsByGameType[mint.gameType].amount);
    const mintAmount = parseFloat(mint.amountFormatted);
    mintsByGameType[mint.gameType].amount = (currentGameAmount + mintAmount).toString();
    
    // Count by player
    if (!mintsByPlayer[mint.playerAddress]) {
      mintsByPlayer[mint.playerAddress] = { count: 0, amount: '0' };
    }
    mintsByPlayer[mint.playerAddress].count++;
    const currentPlayerAmount = parseFloat(mintsByPlayer[mint.playerAddress].amount);
    mintsByPlayer[mint.playerAddress].amount = (currentPlayerAmount + mintAmount).toString();
    
    // Count verified mints
    if (mint.verified) {
      verifiedMints++;
    }
  });
  
  return {
    totalMints: db.totalMints,
    totalAmountMinted: db.totalAmountMinted,
    mintsByGameType,
    mintsByPlayer,
    verifiedMints
  };
}

/**
 * Checks if a mint with the given transaction hash exists
 */
export function mintTxHashExists(txHash: string): boolean {
  const db = loadMintDatabase();
  return db.mints.some(mint => mint.txHash === txHash);
}

export type { MintLog, MintDatabase };