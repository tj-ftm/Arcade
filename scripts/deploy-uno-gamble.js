const { ethers } = require('ethers');
require('dotenv').config();

// Contract bytecode and ABI for UnoGamble
const UNO_GAMBLE_BYTECODE = '0x608060405234801561001057600080fd5b50600436106100365760003560e01c8063...';
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
  "event GameCompleted(bytes32 indexed gameId, address indexed winner, uint256 payout)"
];

// Contract deployment script for UNO Gamble
async function deployUnoGambleContract() {
    try {
        console.log('🚀 [UNO GAMBLE] Starting contract deployment...');
        
        // Get environment variables
        const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || process.env.RPC_URL;
        const DEPLOYER_PRIVATE_KEY = process.env.MINTER_PRIVATE_KEY; // Reuse existing key
        const ARC_TOKEN_ADDRESS = process.env.TOKEN_CONTRACT_ADDRESS || '0xAD75eAb973D5AbB77DAdc0Ec3047008dF3aa094d';
        
        if (!RPC_URL || !DEPLOYER_PRIVATE_KEY || !ARC_TOKEN_ADDRESS) {
            throw new Error('Missing required environment variables');
        }
        
        // Setup provider and wallet
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const wallet = new ethers.Wallet(DEPLOYER_PRIVATE_KEY, provider);
        
        console.log('📝 [UNO GAMBLE] Deployer address:', wallet.address);
        console.log('🪙 [UNO GAMBLE] ARC Token address:', ARC_TOKEN_ADDRESS);
        
        // Check deployer balance
        const balance = await provider.getBalance(wallet.address);
        console.log('💰 [UNO GAMBLE] Deployer balance:', ethers.formatEther(balance), 'S');
        
        if (balance < ethers.parseEther('0.1')) {
            throw new Error('Insufficient balance for deployment (need at least 0.1 S)');
        }
        
        // Create contract factory
        const contractFactory = new ethers.ContractFactory(
            UNO_GAMBLE_ABI,
            UNO_GAMBLE_BYTECODE,
            wallet
        );
        
        console.log('⏳ Deploying UnoGamble contract with ARC token:', ARC_TOKEN_ADDRESS);
        
        // Deploy the contract
        const contract = await contractFactory.deploy(ARC_TOKEN_ADDRESS, {
            gasLimit: 3000000,
            gasPrice: ethers.parseUnits('20', 'gwei')
        });
        
        console.log('⏳ Waiting for deployment confirmation...');
        await contract.waitForDeployment();
        
        const contractAddress = await contract.getAddress();
        console.log('✅ UnoGamble deployed to:', contractAddress);
        
        // Verify contract on block explorer (optional)
        console.log('📝 Contract verification data:');
        console.log('- Contract Address:', contractAddress);
        console.log('- ARC Token Address:', ARC_TOKEN_ADDRESS);
        console.log('- Network: Sonic');
        
        return {
            contractAddress: contractAddress,
            abi: UNO_GAMBLE_ABI,
            deployerAddress: wallet.address,
            arcTokenAddress: ARC_TOKEN_ADDRESS,
            txHash: contract.deploymentTransaction()?.hash
        };
        
    } catch (error) {
        console.error('❌ [UNO GAMBLE] Deployment failed:', error.message);
        throw error;
    }
}

// For standalone deployment
async function main() {
    const result = await deployUnoGambleContract();
    console.log('🎉 [UNO GAMBLE] Deployment successful:', result);
    return result.contractAddress;
}

// Export for use in other scripts
module.exports = { deployUnoGambleContract, main };

// Run if called directly
if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch(error => {
            console.error('💥 [UNO GAMBLE] Deployment failed:', error);
            process.exit(1);
        });
}