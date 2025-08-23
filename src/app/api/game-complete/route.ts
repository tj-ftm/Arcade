import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

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
}

export async function POST(req: NextRequest) {
  if (!MINTER_PRIVATE_KEY || !TOKEN_CONTRACT_ADDRESS || !RPC_URL) {
    return NextResponse.json({ error: 'Server configuration missing (private key, contract address, or RPC URL)' }, { status: 500 });
  }

  try {
    const gameData: GameCompleteRequest = await req.json();
    
    // Validate required fields
    if (!gameData.playerAddress || !gameData.gameType || typeof gameData.score !== 'number' || typeof gameData.won !== 'boolean') {
      return NextResponse.json({ error: 'Missing required game data: playerAddress, gameType, score, won' }, { status: 400 });
    }

    // Validate player address
    if (!ethers.isAddress(gameData.playerAddress)) {
      return NextResponse.json({ error: 'Invalid player address' }, { status: 400 });
    }

    // Initialize provider and signer
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(MINTER_PRIVATE_KEY, provider);
    const tokenContract = new ethers.Contract(TOKEN_CONTRACT_ADDRESS, TOKEN_CONTRACT_ABI, signer);

    // Create detailed game log
    const gameLog = {
      timestamp: gameData.timestamp || new Date().toISOString(),
      gameId: gameData.gameId || `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      player: gameData.playerAddress,
      gameType: gameData.gameType,
      score: gameData.score,
      duration: gameData.duration || 0,
      won: gameData.won,
      result: gameData.won ? 'VICTORY' : 'DEFEAT',
      rewardGiven: gameData.won,
      contractAddress: TOKEN_CONTRACT_ADDRESS,
      network: 'Sonic'
    };

    console.log('Processing game completion:', gameLog);

    // Get existing logs to append new log
    let existingLogs = [];
    try {
      const currentURI = await tokenContract.contractURI();
      if (currentURI && currentURI.trim() !== '') {
        // Try to parse existing logs as JSON
        try {
          const parsed = JSON.parse(currentURI);
          if (Array.isArray(parsed.gameLogs)) {
            existingLogs = parsed.gameLogs;
          }
        } catch {
          // If not JSON, treat as legacy single log
          existingLogs = [{ legacyLog: currentURI, timestamp: new Date().toISOString() }];
        }
      }
    } catch (error) {
      console.log('No existing logs found, starting fresh');
    }

    // Add new log to existing logs
    existingLogs.push(gameLog);

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

    // Store game log on contract
    console.log('Storing game log on contract...');
    const logTx = await tokenContract.setContractURI(logString);
    await logTx.wait();
    console.log('Game log stored successfully. Transaction:', logTx.hash);

    let mintTxHash = null;
    
    // If player won, mint 1 ARC token
    if (gameData.won) {
      console.log(`Player won! Minting 1 ARC token to ${gameData.playerAddress}`);
      const amountToMint = ethers.parseUnits('1', 18); // 1 ARC token with 18 decimals
      
      const mintTx = await tokenContract.mintTo(gameData.playerAddress, amountToMint);
      await mintTx.wait();
      mintTxHash = mintTx.hash;
      console.log('Token minted successfully. Transaction:', mintTxHash);
    }

    // Return success response
    const response = {
      success: true,
      message: `Game completed and logged successfully${gameData.won ? '. 1 ARC token minted as reward!' : ''}`,
      gameLog: gameLog,
      transactions: {
        logTransaction: logTx.hash,
        mintTransaction: mintTxHash
      },
      reward: gameData.won ? '1 ARC' : 'None'
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Game completion processing error:', error);
    return NextResponse.json({ 
      error: 'Failed to process game completion', 
      details: error.message 
    }, { status: 500 });
  }
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