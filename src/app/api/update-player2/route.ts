import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

// UNO Gamble Smart Contract ABI
const UNO_GAMBLE_ABI = [
  "constructor(address _arcToken)",
  "function createGame(bytes32 gameId, address player1, address player2, uint256 betAmount, string memory gameIdString) external payable",
  "function payBet(bytes32 gameId) external",
  "function verifyGameResult(bytes32 gameId, address winner, string memory resultData) external",
  "function completeGame(bytes32 gameId, address winner) external",
  "function getGame(bytes32 gameId) external view returns (address, address, uint256, uint256, address, bool, bool, uint256, string memory, bool)",
  "function hasPlayerPaid(bytes32 gameId, address player) external view returns (bool)",
  "function isGameReady(bytes32 gameId) external view returns (bool)",
  "event GameCreated(bytes32 indexed gameId, address indexed player1, address indexed player2, uint256 betAmount)",
  "event PlayerPaid(bytes32 indexed gameId, address indexed player, uint256 amount)",
  "event GameStarted(bytes32 indexed gameId)",
  "event GameCompleted(bytes32 indexed gameId, address indexed winner, uint256 payout)",
  "event GameResultVerified(bytes32 indexed gameId, address indexed winner, string resultData)"
];

export async function POST(request: NextRequest) {
  try {
    const { contractAddress, gameId, player2Address } = await request.json();
    
    if (!contractAddress || !gameId || !player2Address) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Initialize provider
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc.soniclabs.com/';
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    // Get game wallet private key from environment
    const gameWalletPrivateKey = process.env.MINTER_PRIVATE_KEY;
    if (!gameWalletPrivateKey) {
      return NextResponse.json(
        { error: 'Game wallet not configured - MINTER_PRIVATE_KEY missing' },
        { status: 500 }
      );
    }
    
    // Create game wallet signer
    const gameWallet = new ethers.Wallet(gameWalletPrivateKey, provider);
    
    // Connect to the existing contract
    const contract = new ethers.Contract(contractAddress, UNO_GAMBLE_ABI, gameWallet);
    
    console.log('🔄 [UPDATE PLAYER2 API] Checking game state...');
    
    const gameIdBytes = ethers.id(gameId);
    const gameInfo = await contract.getGame(gameIdBytes);
    
    const currentPlayer1 = gameInfo[0];
    const currentPlayer2 = gameInfo[1];
    const betAmount = gameInfo[2];
    const gameIdString = gameInfo[8];
    
    console.log('📊 [UPDATE PLAYER2 API] Current game state:', {
      player1: currentPlayer1,
      player2: currentPlayer2,
      betAmount: ethers.formatEther(betAmount),
      gameIdString
    });
    
    if (currentPlayer2 !== ethers.ZeroAddress) {
      return NextResponse.json({
        success: true,
        message: 'Player2 already set',
        player2: currentPlayer2
      });
    }
    
    // Since we can't update player2 directly, we need to create a new game
    // with the correct player2 address. This requires the game to be recreated.
    console.log('🔄 [UPDATE PLAYER2 API] Creating new game with player2...');
    
    // Create a new game ID for the updated game
    const newGameId = gameId + '-updated';
    const newGameIdBytes = ethers.id(newGameId);
    const gasFee = ethers.parseEther('0.05');
    
    const createGameTx = await contract.createGame(
      newGameIdBytes,
      currentPlayer1,
      player2Address,
      betAmount,
      newGameId,
      { value: gasFee }
    );
    
    console.log('📝 [UPDATE PLAYER2 API] New game creation transaction:', createGameTx.hash);
    await createGameTx.wait();
    
    return NextResponse.json({
      success: true,
      newGameId,
      txHash: createGameTx.hash,
      message: 'New game created with player2'
    });
    
  } catch (error: any) {
    console.error('❌ [UPDATE PLAYER2 API] Failed to update player2:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update player2' },
      { status: 500 }
    );
  }
}