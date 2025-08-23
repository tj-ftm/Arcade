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
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "to",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "primarySaleRecipient",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "quantity",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "price",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "currency",
            "type": "address"
          },
          {
            "internalType": "uint128",
            "name": "validityStartTimestamp",
            "type": "uint128"
          },
          {
            "internalType": "uint128",
            "name": "validityEndTimestamp",
            "type": "uint128"
          },
          {
            "internalType": "bytes32",
            "name": "uid",
            "type": "bytes32"
          }
        ],
        "internalType": "struct ITokenERC20.MintRequest",
        "name": "_req",
        "type": "tuple"
      },
      {
        "internalType": "bytes",
        "name": "_signature",
        "type": "bytes"
      }
    ],
    "name": "mintWithSignature",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  }
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
    // Get the minter's wallet address
    const minterWallet = new ethers.Wallet(MINTER_PRIVATE_KEY!, provider);
    const minterAddress = minterWallet.address;

    // Construct the MintRequest object
    const mintRequest = {
      to: playerAddress,
      primarySaleRecipient: minterAddress, // Using minter as primary sale recipient
      quantity: ethers.parseUnits(amount.toString(), 18),
      price: 0, // Free minting
      currency: "0x0000000000000000000000000000000000000000", // ETH address (zero address)
      validityStartTimestamp: Math.floor(Date.now() / 1000),
      validityEndTimestamp: Math.floor(Date.now() / 1000) + 3600, // Valid for 1 hour
      uid: ethers.keccak256(ethers.toUtf8Bytes(`${playerAddress}-${Date.now()}`)) // Unique ID based on player and timestamp
    };

    // Generate signature for the mint request
    const domain = {
      name: "TokenERC20",
      version: "1",
      chainId: await provider.getNetwork().then(n => n.chainId),
      verifyingContract: TOKEN_CONTRACT_ADDRESS
    };

    const types = {
      MintRequest: [
        { name: "to", type: "address" },
        { name: "primarySaleRecipient", type: "address" },
        { name: "quantity", type: "uint256" },
        { name: "price", type: "uint256" },
        { name: "currency", type: "address" },
        { name: "validityStartTimestamp", type: "uint128" },
        { name: "validityEndTimestamp", type: "uint128" },
        { name: "uid", type: "bytes32" }
      ]
    };

    const signature = await minterWallet.signTypedData(domain, types, mintRequest);

    // Execute the mint transaction
    const tx = await tokenContract.mintWithSignature(mintRequest, signature);
    await tx.wait();

    return NextResponse.json({ message: `Successfully minted ${amount} tokens to ${playerAddress}`, transactionHash: tx.hash });
  } catch (error: any) {
    console.error('Minting error:', error);
    return NextResponse.json({ error: 'Failed to mint tokens', details: error.message }, { status: 500 });
  }
}