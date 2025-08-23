import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

// This is a placeholder for your actual minter private key.
// In a production environment, this should be loaded securely from environment variables
// or a dedicated key management service, NOT hardcoded.
const MINTER_PRIVATE_KEY = process.env.MINTER_PRIVATE_KEY;

// This is a placeholder for your token contract address and ABI.
// Replace with your actual contract details.
const TOKEN_CONTRACT_ADDRESS = process.env.TOKEN_CONTRACT_ADDRESS;
const TOKEN_CONTRACT_ABI = [
  // Add your token contract's ABI here, specifically the 'mint' function
  "function mint(address to, uint256 amount)"
];

// This is a placeholder for your blockchain RPC URL.
// Replace with your actual Sonic Network RPC URL.
const RPC_URL = process.env.RPC_URL;

export async function POST(req: NextRequest) {
  if (!MINTER_PRIVATE_KEY || !TOKEN_CONTRACT_ADDRESS || !RPC_URL) {
    return NextResponse.json({ error: 'Server configuration missing (private key, contract address, or RPC URL)' }, { status: 500 });
  }

  try {
    const { playerAddress, amount, gameId, score, signature } = await req.json();

    // TODO: Implement robust server-side validation here to prevent cheating.
    // This might involve:
    // 1. Verifying the 'signature' against a known secret or a message signed by the game client.
    // 2. Replaying game moves on the server to verify the 'score' and 'gameId' legitimacy.
    // 3. Checking if the 'gameId' has already been processed to prevent double-minting.
    // 4. Rate limiting requests from a single playerAddress.
    // For now, we'll just add a basic check.
    // These parameters are optional for the simple "Mint 1 ARC" button.
    // if (!gameId || !score || !signature) {
    //   return NextResponse.json({ error: 'Missing validation parameters' }, { status: 400 });
    // }

    if (!playerAddress || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'Invalid request parameters' }, { status: 400 });
    }

    // Initialize provider and signer
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(MINTER_PRIVATE_KEY, provider);

    // Initialize token contract
    const tokenContract = new ethers.Contract(TOKEN_CONTRACT_ADDRESS, TOKEN_CONTRACT_ABI, signer);

    // Mint tokens
    const tx = await tokenContract.mint(playerAddress, ethers.parseUnits(amount.toString(), 18)); // Assuming 18 decimals
    await tx.wait();

    return NextResponse.json({ message: `Successfully minted ${amount} tokens to ${playerAddress}`, transactionHash: tx.hash });
  } catch (error: any) {
    console.error('Minting error:', error);
    return NextResponse.json({ error: 'Failed to mint tokens', details: error.message }, { status: 500 });
  }
}