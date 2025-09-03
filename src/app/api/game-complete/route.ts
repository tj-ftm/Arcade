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
import { 
  storeMintLog, 
  getMintStats,
  getAllMintLogs 
} from '@/lib/mint-database';

// Environment variables
const MINTER_PRIVATE_KEY = process.env.MINTER_PRIVATE_KEY;
const TOKEN_CONTRACT_ADDRESS = process.env.TOKEN_CONTRACT_ADDRESS;
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL;

// Multi-chain configuration
const CHAIN_CONFIGS = {
  sonic: {
    rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc.soniclabs.com',
    tokenAddress: process.env.TOKEN_CONTRACT_ADDRESS || '0xAD75eAb973D5AbB77DAdc0Ec3047008dF3aa094d',
    explorerUrl: 'https://sonicscan.org'
  },
  base: {
    rpcUrl: 'https://mainnet.base.org',
    tokenAddress: '0xAD75eAb973D5AbB77DAdc0Ec3047008dF3aa094d',
    explorerUrl: 'https://base.blockscout.com'
  }
};

type SupportedChain = 'sonic' | 'base';

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
  chain?: SupportedChain; // Current blockchain network
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
    
    // Proceed to verification and minting
    return await handleGameVerification(gameData);
    
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
    message: 'Game log stored successfully.',
    storedGameId: storedLog.id,
    gameData: storedLog
  });
}

/**
 * Handles verifying stored game log against blockchain and minting tokens (Step 2)
 */
async function handleGameVerification(gameData: GameCompleteRequest) {
  const storedLog = gameData;
  
  // Determine which chain to use (default to sonic for backward compatibility)
  const currentChain: SupportedChain = storedLog.chain || 'sonic';
  const chainConfig = CHAIN_CONFIGS[currentChain];
  
  console.log(`Using ${currentChain} chain configuration:`, {
    rpcUrl: chainConfig.rpcUrl,
    tokenAddress: chainConfig.tokenAddress
  });

  // Initialize provider and signer
  let provider, signer, tokenContract;
  try {
    console.log(`Initializing ${currentChain} blockchain connection...`);
    provider = new ethers.JsonRpcProvider(chainConfig.rpcUrl);
    signer = new ethers.Wallet(MINTER_PRIVATE_KEY, provider);
    tokenContract = new ethers.Contract(chainConfig.tokenAddress, TOKEN_CONTRACT_ABI, signer);
    
    // Test connection
    const network = await provider.getNetwork();
    console.log(`${currentChain} blockchain connection successful. Network:`, network.name, 'Chain ID:', network.chainId.toString());
  } catch (error: any) {
    console.error(`Failed to initialize ${currentChain} blockchain connection:`, error);
    return NextResponse.json({ 
      error: `${currentChain} blockchain connection failed`, 
      details: error.message,
      rpcUrl: chainConfig.rpcUrl,
      chain: currentChain
    }, { status: 500 });
  }

  // Calculate tokens to mint based on game type and score
  let tokensToMint = 0;
  console.log(`Game Type: ${storedLog.gameType}, Score: ${storedLog.score}, Won: ${storedLog.won}`);
  
  if (storedLog.gameType === 'snake') {
    tokensToMint = Math.floor(storedLog.score / 10);
    console.log(`Snake game - Calculated tokensToMint: ${tokensToMint}`);
  } else if (storedLog.gameType === 'snake-bonus') {
    tokensToMint = Math.floor(storedLog.score / 10) * 2; // 2x bonus
    console.log(`Snake bonus game - Calculated tokensToMint: ${tokensToMint}`);
  } else if (storedLog.gameType === 'uno' && storedLog.won) {
    tokensToMint = 50;
    console.log(`Uno game (won) - Calculated tokensToMint: ${tokensToMint}`);
  } else if (storedLog.gameType === 'uno-bonus' && storedLog.won) {
    tokensToMint = 100; // 2x bonus
    console.log(`Uno bonus game (won) - Calculated tokensToMint: ${tokensToMint}`);
  } else if (storedLog.gameType === 'chess' && storedLog.won) {
    tokensToMint = 100;
    console.log(`Chess game (won) - Calculated tokensToMint: ${tokensToMint}`);
  } else if (storedLog.gameType === 'chess-bonus' && storedLog.won) {
    tokensToMint = 200; // 2x bonus
    console.log(`Chess bonus game (won) - Calculated tokensToMint: ${tokensToMint}`);
  } else if (storedLog.won) {
    tokensToMint = 1;
    console.log(`Other game (won) - Calculated tokensToMint: ${tokensToMint}`);
  } else {
    tokensToMint = 0;
    console.log(`Game lost or no reward - Calculated tokensToMint: ${tokensToMint}`);
  }

  let mintTxHash = null;

  let rewardMessage = tokensToMint > 0 ? `${tokensToMint} ARC` : 'None';
  
  // Mint tokens if any are earned
  if (tokensToMint > 0) {
    try {
      console.log(`Minting ${tokensToMint} ARC token(s) to ${storedLog.playerAddress}`);
      const amountToMint = ethers.parseUnits(tokensToMint.toString(), 18);
      
      const mintTx = await tokenContract.mintTo(storedLog.playerAddress, amountToMint);
      const receipt = await mintTx.wait();
      mintTxHash = mintTx.hash;
      console.log('Token(s) minted successfully. Transaction:', mintTxHash);
      
      // Log the mint to the mint database
      try {
        const mintLog = storeMintLog({
          timestamp: storedLog.timestamp || new Date().toISOString(),
          playerAddress: storedLog.playerAddress,
          gameType: storedLog.gameType,
          gameId: storedLog.gameId,
          amount: amountToMint.toString(), // Amount in wei
          amountFormatted: tokensToMint.toString(), // Amount in ARC tokens
          txHash: mintTxHash,
          blockNumber: receipt?.blockNumber,
          chain: currentChain // Add chain information
        });
        console.log(`Mint logged successfully on ${currentChain} chain:`, mintLog.id);
      } catch (mintLogError: any) {
        console.error('Failed to log mint:', mintLogError);
        // Don't fail the entire operation if mint logging fails
      }
    } catch (error: any) {
      console.error('Failed to mint tokens:', error);
      // Continue execution even if minting fails, but log the error
      console.log('Game log was stored successfully, but token minting failed');
    }
  }



  // Return success response
  const response = {
    success: true,
    message: `Game completed and tokens minted${tokensToMint > 0 ? `. ${tokensToMint} ARC token(s) minted as reward on ${currentChain} chain!` : ''}`,
    mintTransaction: mintTxHash,
    reward: rewardMessage,
    tokensEarned: tokensToMint,
    chain: currentChain,
    explorerUrl: chainConfig.explorerUrl,
    transactionUrl: mintTxHash ? `${chainConfig.explorerUrl}/tx/${mintTxHash}` : null
  };

  return NextResponse.json(response);
}

// GET endpoint to retrieve game logs
export async function GET(req: NextRequest) {
  if (!TOKEN_CONTRACT_ADDRESS || !RPC_URL) {
    return NextResponse.json({ error: 'Server configuration missing' }, { status: 500 });
  }

  try {
    const allLogs = getAllGameLogs();
    const gameStats = getGameStats();
    const allMints = getAllMintLogs();
    const mintStats = getMintStats();
    
    return NextResponse.json({
      gameLogs: allLogs,
      totalGames: allLogs.length,
      gameStats: gameStats,
      mintLogs: allMints,
      mintStats: mintStats,
      message: 'Game logs and mint data retrieved successfully'
    });

  } catch (error: any) {
    console.error('Error reading game logs and mint data:', error);
    return NextResponse.json({ 
      error: 'Failed to read game logs and mint data', 
      details: error.message 
    }, { status: 500 });
  }
}