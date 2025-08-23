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
  // Log environment variable status for debugging
  console.log('Environment check:', {
    hasPrivateKey: !!MINTER_PRIVATE_KEY,
    hasContractAddress: !!TOKEN_CONTRACT_ADDRESS,
    hasRpcUrl: !!RPC_URL,
    privateKeyLength: MINTER_PRIVATE_KEY?.length || 0,
    contractAddress: TOKEN_CONTRACT_ADDRESS || 'undefined',
    rpcUrl: RPC_URL || 'undefined'
  });
  
  if (!MINTER_PRIVATE_KEY || !TOKEN_CONTRACT_ADDRESS || !RPC_URL) {
    const missingVars = [];
    if (!MINTER_PRIVATE_KEY) missingVars.push('MINTER_PRIVATE_KEY');
    if (!TOKEN_CONTRACT_ADDRESS) missingVars.push('TOKEN_CONTRACT_ADDRESS');
    if (!RPC_URL) missingVars.push('RPC_URL');
    
    console.error('Missing environment variables:', missingVars);
    return NextResponse.json({ 
      error: 'Server configuration missing', 
      missingVariables: missingVars,
      details: 'Required environment variables are not set'
    }, { status: 500 });
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
  console.log('handleGameStorage: Received gameData:', gameData);
  if (!gameData.playerAddress || !gameData.gameType || typeof gameData.score !== 'number' || typeof gameData.won !== 'boolean') {
    console.error('handleGameStorage: Missing required game data fields.');
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
  let storedLog;
  try {
    storedLog = storeGameLog({
      timestamp: gameData.timestamp || new Date().toISOString(),
      gameId,
      player: gameData.playerAddress,
      gameType: gameData.gameType,
      score: gameData.score,
      duration: gameData.duration || 0,
      won: gameData.won,
      result: gameData.won ? 'VICTORY' : 'DEFEAT'
    });
    console.log('handleGameStorage: Game log stored successfully:', storedLog);
  } catch (storageError: any) {
    console.error('handleGameStorage: Error storing game log:', storageError);
    return NextResponse.json({ error: 'Failed to store game log', details: storageError.message }, { status: 500 });
  }

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
  let provider, signer, tokenContract;
  try {
    console.log('Initializing blockchain connection...');
    provider = new ethers.JsonRpcProvider(RPC_URL);
    signer = new ethers.Wallet(MINTER_PRIVATE_KEY, provider);
    tokenContract = new ethers.Contract(TOKEN_CONTRACT_ADDRESS, TOKEN_CONTRACT_ABI, signer);
    
    // Test connection
    await provider.getNetwork();
    console.log('Blockchain connection successful');
  } catch (error: any) {
    console.error('Failed to initialize blockchain connection:', error);
    return NextResponse.json({ 
      error: 'Blockchain connection failed', 
      details: error.message,
      rpcUrl: RPC_URL
    }, { status: 500 });
  }

  // Calculate tokens to mint based on game type and score
  let tokensToMint = 0;
  console.log(`Game Type: ${storedLog.gameType}, Score: ${storedLog.score}, Won: ${storedLog.won}`);
  if (storedLog.gameType === 'snake') {
    // For Snake: 1 ARC per 10 points
    tokensToMint = Math.floor(storedLog.score / 10);
    console.log(`Snake game - Calculated tokensToMint: ${tokensToMint}`);
  } else {
    // For other games: 1 ARC if won
    if (storedLog.won) {
      tokensToMint = 1;
      console.log(`Other game (won) - Calculated tokensToMint: ${tokensToMint}`);
    } else {
      console.log(`Other game (lost) - Calculated tokensToMint: ${tokensToMint}`);
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
  let logTx, mintTxHash = null;
  let rewardMessage = tokensToMint > 0 ? `${tokensToMint} ARC` : 'None';
  
  try {
    console.log('Storing verified game log on contract...');
    logTx = await tokenContract.setContractURI(logString);
    await logTx.wait();
    console.log('Verified game log stored successfully. Transaction:', logTx.hash);
  } catch (error: any) {
    console.error('Failed to store game log on contract:', error);
    return NextResponse.json({ 
      error: 'Failed to store game log on blockchain', 
      details: error.message
    }, { status: 500 });
  }
  
  // Mint tokens if any are earned
  if (tokensToMint > 0) {
    try {
      console.log(`Minting ${tokensToMint} ARC token(s) to ${storedLog.player}`);
      const amountToMint = ethers.parseUnits(tokensToMint.toString(), 18);
      
      const mintTx = await tokenContract.mintTo(storedLog.player, amountToMint);
      await mintTx.wait();
      mintTxHash = mintTx.hash;
      console.log('Token(s) minted successfully. Transaction:', mintTxHash);
    } catch (error: any) {
      console.error('Failed to mint tokens:', error);
      // Continue execution even if minting fails, but log the error
      console.log('Game log was stored successfully, but token minting failed');
    }
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