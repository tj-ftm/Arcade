import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

// Load environment variables
const MINTER_PRIVATE_KEY = process.env.MINTER_PRIVATE_KEY;
const TOKEN_CONTRACT_ADDRESS = process.env.TOKEN_CONTRACT_ADDRESS;
const RPC_URL = process.env.RPC_URL;

// Contract ABI for mintTo function
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

async function mintArcToken(recipientAddress) {
  try {
    console.log('Starting ARC token minting process...');
    
    // Initialize provider and wallet
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const minterWallet = new ethers.Wallet(MINTER_PRIVATE_KEY, provider);
    const minterAddress = minterWallet.address;
    
    console.log(`Minter address: ${minterAddress}`);
    console.log(`Recipient address: ${recipientAddress}`);
    
    // Initialize contract
    const tokenContract = new ethers.Contract(TOKEN_CONTRACT_ADDRESS, TOKEN_CONTRACT_ABI, minterWallet);
    
    // Prepare mint parameters
    const amountToMint = ethers.parseUnits('1', 18); // 1 ARC token with 18 decimals
    
    console.log(`Minting ${ethers.formatUnits(amountToMint, 18)} ARC tokens to ${recipientAddress}`);
    
    // Execute the mint transaction using the simple mintTo function
    console.log('Executing mint transaction...');
    const tx = await tokenContract.mintTo(recipientAddress, amountToMint);
    console.log('Transaction sent:', tx.hash);
    
    // Wait for confirmation
    console.log('Waiting for transaction confirmation...');
    const receipt = await tx.wait();
    console.log('Transaction confirmed!');
    console.log('Transaction receipt:', receipt);
    
    console.log(`Successfully minted 1 ARC token to ${recipientAddress}`);
    console.log(`Transaction hash: ${tx.hash}`);
    
  } catch (error) {
    console.error('Error minting ARC token:', error);
    throw error;
  }
}

// Get recipient address from command line arguments or derive from minter wallet
let recipientAddress = process.argv[2];

if (!recipientAddress) {
  // If no address provided, use the minter's address as recipient
  const tempWallet = new ethers.Wallet(MINTER_PRIVATE_KEY);
  recipientAddress = tempWallet.address;
  console.log('No recipient address provided, using minter address as recipient');
}

// Validate recipient address
if (!ethers.isAddress(recipientAddress)) {
  console.error('Invalid recipient address provided:', recipientAddress);
  process.exit(1);
}

// Run the minting process
mintArcToken(recipientAddress)
  .then(() => {
    console.log('Minting completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Minting failed:', error.message);
    process.exit(1);
  });