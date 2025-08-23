import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { 
  storeGameLog, 
  getGameLog, 
  verifyGameLog, 
  updateGameLogVerification, 
  gameIdExists,
  getAllGameLogs,
  getGameStats 
} from '@/lib/game-database';

// Environment variables
const MINTER_PRIVATE_KEY = process.env.MINTER_PRIVATE_KEY;
const TOKEN_CONTRACT_ADDRESS = process.env.TOKEN_CONTRACT_ADDRESS;
const RPC_URL = process.env.RPC_URL;

// Contract ABI for both minting and logging
const TOKEN_CONTRACT_ABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "mintTo",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "_uri",
        "type": "string"
      }
    ],
    "name": "setContractURI",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "contractURI",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

interface GameCompleteRequest {
  playerAddress: string;
  gameType: string;
  score: number;
  duration: number; // in seconds
  won: boolean;
  timestamp?: string;
  gameId?: string;
  verificationMode?: 'store' | 'verify'; // New field for two-step verification
  storedGameId?: string; // For verification step
}

export async function POST(req: NextRequest) {
  if (!MINTER_PRIVATE_KEY || !TOKEN_CONTRACT_ADDRESS || !RPC_URL) {
    return NextResponse.json({ error: 'Server configuration missing (private key, contract address, or RPC URL)' }, { status: 500 });
  }

  try {
    const gameData: GameCompleteRequest = await req.json();
    
    // Handle different verification modes
    if (gameData.verificationMode === 'verify') {
      return await handleGameVerification(gameData);
    }
    
    // Default mode: store game log first
    return await handleGameStorage(gameData);
    
  } catch (error: any) {
    console.error('Game completion processing error:', error);
    return NextResponse.json({ 
      error: 'Failed to process game completion', 
      details: error.message 
    }, { status: 500 });
  }
}

/**
 * Handles storing the game log in the database (Step 1)
 */
async function handleGameStorage(gameData: GameCompleteRequest) {
  // Validate required fields
  if (!gameData.playerAddress || !gameData.gameType || typeof gameData.score !== 'number' || typeof gameData.won !== 'boolean') {
    return NextResponse.json({ error: 'Missing required game data: playerAddress, gameType, score, won' }, { status: 400 });
  }

  // Validate player address
  if (!ethers.isAddress(gameData.playerAddress)) {
    return NextResponse.json({ error: 'Invalid player address' }, { status: 400 });
  }

  const gameId = gameData.gameId || `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Check for duplicate game IDs
  if (gameIdExists(gameId)) {
    return NextResponse.json({ error: 'Game ID already exists' }, { status: 400 });
  }

  // Store game log in database
  const storedLog = storeGameLog({
    timestamp: gameData.timestamp || new Date().toISOString(),
    gameId,
    player: gameData.playerAddress,
    gameType: gameData.gameType,
    score: gameData.score,
    duration: gameData.duration || 0,
    won: gameData.won,
    result: gameData.won ? 'VICTORY' : 'DEFEAT'
  });

  return NextResponse.json({
    success: true,
    message: 'Game log stored successfully. Proceed to blockchain verification.',
    storedGameId: storedLog.id,
    gameData: storedLog,
    nextStep: 'verification'
  });
}

/**
 * Handles verifying stored game log against blockchain and minting tokens (Step 2)
 */
async function handleGameVerification(gameData: GameCompleteRequest) {
  if (!gameData.storedGameId) {
    return NextResponse.json({ error: 'Missing stored game ID for verification' }, { status: 400 });
  }

  // Get stored game log
  const storedLog = getGameLog(gameData.storedGameId);
  if (!storedLog) {
    return NextResponse.json({ error: 'Stored game log not found' }, { status: 404 });
  }

  // Validate that the verification data matches stored data
  const isDataValid = (
    storedLog.player.toLowerCase() === gameData.playerAddress.toLowerCase() &&
    storedLog.gameType === gameData.gameType &&
    storedLog.score === gameData.score &&
    storedLog.won === gameData.won
  );

  if (!isDataValid) {
    return NextResponse.json({ 
      error: 'Verification failed: submitted data does not match stored game log',
      storedData: {
        player: storedLog.player,
        gameType: storedLog.gameType,
        score: storedLog.score,
        won: storedLog.won
      },
      submittedData: {
        player: gameData.playerAddress,
        gameType: gameData.gameType,
        score: gameData.score,
        won: gameData.won
      }
    }, { status: 400 });
  }

  // Initialize provider and signer
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const signer = new ethers.Wallet(MINTER_PRIVATE_KEY, provider);
  const tokenContract = new ethers.Contract(TOKEN_CONTRACT_ADDRESS, TOKEN_CONTRACT_ABI, signer);

  // Calculate tokens to mint based on game type and score
  let tokensToMint = 0;
  if (storedLog.gameType === 'snake') {
    // For Snake: 1 ARC per 10 points
    tokensToMint = Math.floor(storedLog.score / 10);
  } else {
    // For other games: 1 ARC if won
    if (storedLog.won) {
      tokensToMint = 1;
    }
  }

  // Create blockchain log from stored data
  const blockchainLog = {
    timestamp: storedLog.timestamp,
    gameId: storedLog.gameId,
    player: storedLog.player,
    gameType: storedLog.gameType,
    score: storedLog.score,
    duration: storedLog.duration,
    won: storedLog.won,
    result: storedLog.result,
    rewardGiven: tokensToMint > 0,
    tokensEarned: tokensToMint,
    contractAddress: TOKEN_CONTRACT_ADDRESS,
    network: 'Sonic',
    verified: true,
    storedGameId: storedLog.id
  };

  console.log('Processing verified game completion:', blockchainLog);

  // Get existing logs to append new log
  let existingLogs = [];
  try {
    const currentURI = await tokenContract.contractURI();
    if (currentURI && currentURI.trim() !== '') {
      try {
        const parsed = JSON.parse(currentURI);
        if (Array.isArray(parsed.gameLogs)) {
          existingLogs = parsed.gameLogs;
        }
      } catch {
        existingLogs = [{ legacyLog: currentURI, timestamp: new Date().toISOString() }];
      }
    }
  } catch (error) {
    console.log('No existing logs found, starting fresh');
  }

  // Add verified log to existing logs
  existingLogs.push(blockchainLog);

  // Keep only last 50 logs to prevent excessive gas costs
  if (existingLogs.length > 50) {
    existingLogs = existingLogs.slice(-50);
  }

  // Create comprehensive log structure
  const logData = {
    version: '1.0',
    lastUpdated: new Date().toISOString(),
    totalGames: existingLogs.length,
    gameLogs: existingLogs
  };

  const logString = JSON.stringify(logData);

  // Store verified game log on contract
  console.log('Storing verified game log on contract...');
  const logTx = await tokenContract.setContractURI(logString);
  await logTx.wait();
  console.log('Verified game log stored successfully. Transaction:', logTx.hash);

  let mintTxHash = null;
  let rewardMessage = tokensToMint > 0 ? `${tokensToMint} ARC` : 'None';
  
  // Mint tokens if any are earned
  if (tokensToMint > 0) {
    console.log(`Minting ${tokensToMint} ARC token(s) to ${storedLog.player}`);
    const amountToMint = ethers.parseUnits(tokensToMint.toString(), 18);
    
    const mintTx = await tokenContract.mintTo(storedLog.player, amountToMint);
    await mintTx.wait();
    mintTxHash = mintTx.hash;
    console.log('Token(s) minted successfully. Transaction:', mintTxHash);
  }

  // Update stored log with verification status and transaction hashes
  updateGameLogVerification(storedLog.id, true, logTx.hash, mintTxHash || undefined);

  // Return success response
  const response = {
    success: true,
    message: `Game verified and logged successfully${tokensToMint > 0 ? `. ${tokensToMint} ARC token(s) minted as reward!` : ''}`,
    gameLog: blockchainLog,
    storedGameId: storedLog.id,
    transactions: {
      logTransaction: logTx.hash,
      mintTransaction: mintTxHash
    },
    reward: rewardMessage,
    tokensEarned: tokensToMint,
    verified: true
  };

  return NextResponse.json(response);
}

// GET endpoint to retrieve game logs
export async function GET(req: NextRequest) {
  if (!TOKEN_CONTRACT_ADDRESS || !RPC_URL) {
    return NextResponse.json({ error: 'Server configuration missing' }, { status: 500 });
  }

  try {
    // Initialize provider (read-only)
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const tokenContract = new ethers.Contract(TOKEN_CONTRACT_ADDRESS, TOKEN_CONTRACT_ABI, provider);

    // Read current logs
    const currentURI = await tokenContract.contractURI();
    
    if (!currentURI || currentURI.trim() === '') {
      return NextResponse.json({ 
        gameLogs: [], 
        totalGames: 0, 
        message: 'No game logs found' 
      });
    }

    try {
      const logData = JSON.parse(currentURI);
      return NextResponse.json(logData);
    } catch {
      // Legacy format - single string
      return NextResponse.json({
        version: 'legacy',
        rawData: currentURI,
        message: 'Legacy log format detected'
      });
    }

  } catch (error: any) {
    console.error('Error reading game logs:', error);
    return NextResponse.json({ 
      error: 'Failed to read game logs', 
      details: error.message 
    }, { status: 500 });
  }
}