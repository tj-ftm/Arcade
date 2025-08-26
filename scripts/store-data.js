import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

// Load environment variables
const MINTER_PRIVATE_KEY = process.env.MINTER_PRIVATE_KEY;
const TOKEN_CONTRACT_ADDRESS = process.env.TOKEN_CONTRACT_ADDRESS;
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || process.env.RPC_URL;

// Contract ABI for setContractURI and contractURI functions
const TOKEN_CONTRACT_ABI = [
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

async function storeDataOnContract(dataString) {
  try {
    console.log('Starting data storage process...');
    
    // Initialize provider and wallet
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const minterWallet = new ethers.Wallet(MINTER_PRIVATE_KEY, provider);
    const minterAddress = minterWallet.address;
    
    console.log(`Minter address: ${minterAddress}`);
    console.log(`Data to store: ${dataString}`);
    
    // Initialize contract
    const tokenContract = new ethers.Contract(TOKEN_CONTRACT_ADDRESS, TOKEN_CONTRACT_ABI, minterWallet);
    
    // Store the data string using setContractURI
    console.log('Storing data on contract...');
    const tx = await tokenContract.setContractURI(dataString);
    console.log('Transaction sent:', tx.hash);
    
    // Wait for confirmation
    console.log('Waiting for transaction confirmation...');
    const receipt = await tx.wait();
    console.log('Transaction confirmed!');
    console.log('Transaction receipt:', receipt);
    
    // Verify the stored data by reading it back
    console.log('Reading stored data back from contract...');
    const storedData = await tokenContract.contractURI();
    console.log('Stored data:', storedData);
    
    console.log(`Successfully stored and verified data: "${dataString}"`);
    console.log(`Transaction hash: ${tx.hash}`);
    
  } catch (error) {
    console.error('Error storing data:', error);
    throw error;
  }
}

async function readDataFromContract() {
  try {
    console.log('Reading data from contract...');
    
    // Initialize provider (read-only)
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    
    // Initialize contract (read-only)
    const tokenContract = new ethers.Contract(TOKEN_CONTRACT_ADDRESS, TOKEN_CONTRACT_ABI, provider);
    
    // Read the stored data
    const storedData = await tokenContract.contractURI();
    console.log('Current stored data:', storedData);
    
    return storedData;
    
  } catch (error) {
    console.error('Error reading data:', error);
    throw error;
  }
}

// Get operation and data from command line arguments
const operation = process.argv[2]; // 'store' or 'read'
const dataString = process.argv[3]; // Data to store (only needed for 'store' operation)

if (operation === 'store') {
  if (!dataString) {
    console.error('Please provide data to store. Usage: node store-data.js store "your data here"');
    process.exit(1);
  }
  
  // Run the storage process
  storeDataOnContract(dataString)
    .then(() => {
      console.log('Data storage completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Data storage failed:', error.message);
      process.exit(1);
    });
    
} else if (operation === 'read') {
  // Run the read process
  readDataFromContract()
    .then(() => {
      console.log('Data reading completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Data reading failed:', error.message);
      process.exit(1);
    });
    
} else {
  console.log('Usage:');
  console.log('  To store data: node scripts/store-data.js store "your data here"');
  console.log('  To read data:  node scripts/store-data.js read');
  process.exit(1);
}