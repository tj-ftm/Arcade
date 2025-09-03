const { ethers } = require('hardhat');

async function main() {
  console.log('🚀 [DEPLOY] Starting GameTracker deployment...');
  
  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log('📝 [DEPLOY] Deploying with account:', deployer.address);
  console.log('💰 [DEPLOY] Account balance:', ethers.formatEther(await deployer.provider.getBalance(deployer.address)), 'S');
  
  // ARC Token address on Sonic Network (replace with actual address)
  const ARC_TOKEN_ADDRESS = '0x1234567890123456789012345678901234567890'; // TODO: Replace with actual ARC token address
  
  console.log('🎯 [DEPLOY] ARC Token Address:', ARC_TOKEN_ADDRESS);
  
  // Deploy GameTracker contract
  console.log('📦 [DEPLOY] Deploying GameTracker contract...');
  const GameTracker = await ethers.getContractFactory('GameTracker');
  const gameTracker = await GameTracker.deploy(ARC_TOKEN_ADDRESS);
  
  await gameTracker.waitForDeployment();
  const gameTrackerAddress = await gameTracker.getAddress();
  
  console.log('✅ [DEPLOY] GameTracker deployed to:', gameTrackerAddress);
  
  // Verify deployment
  console.log('🔍 [DEPLOY] Verifying deployment...');
  const totalGames = await gameTracker.getTotalGames();
  const nextGameId = await gameTracker.nextGameId();
  
  console.log('📊 [DEPLOY] Total games:', totalGames.toString());
  console.log('🆔 [DEPLOY] Next game ID:', nextGameId.toString());
  
  // Save deployment info
  const deploymentInfo = {
    network: 'sonic',
    gameTracker: {
      address: gameTrackerAddress,
      deployer: deployer.address,
      deploymentTime: new Date().toISOString(),
      arcTokenAddress: ARC_TOKEN_ADDRESS,
      totalGames: totalGames.toString(),
      nextGameId: nextGameId.toString()
    }
  };
  
  console.log('💾 [DEPLOY] Deployment info:', JSON.stringify(deploymentInfo, null, 2));
  
  // Write deployment info to file
  const fs = require('fs');
  const path = require('path');
  
  const deploymentsDir = path.join(__dirname, '..', 'deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  const deploymentFile = path.join(deploymentsDir, 'game-tracker-sonic.json');
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  
  console.log('📁 [DEPLOY] Deployment info saved to:', deploymentFile);
  
  // Generate TypeScript types and contract info
  const contractInfo = {
    address: gameTrackerAddress,
    abi: GameTracker.interface.formatJson(),
    network: 'sonic',
    chainId: 146, // Sonic mainnet chain ID
    deploymentBlock: await deployer.provider.getBlockNumber()
  };
  
  const contractInfoFile = path.join(__dirname, '..', 'src', 'contracts', 'GameTracker.json');
  const contractsDir = path.dirname(contractInfoFile);
  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir, { recursive: true });
  }
  
  fs.writeFileSync(contractInfoFile, JSON.stringify(contractInfo, null, 2));
  console.log('📄 [DEPLOY] Contract info saved to:', contractInfoFile);
  
  console.log('🎉 [DEPLOY] GameTracker deployment completed successfully!');
  console.log('');
  console.log('📋 [DEPLOY] Summary:');
  console.log('   Contract Address:', gameTrackerAddress);
  console.log('   Deployer:', deployer.address);
  console.log('   Network: Sonic Mainnet');
  console.log('   ARC Token:', ARC_TOKEN_ADDRESS);
  console.log('');
  console.log('🔗 [DEPLOY] Next steps:');
  console.log('   1. Update ARC_TOKEN_ADDRESS in this script with the actual token address');
  console.log('   2. Update frontend to use the new contract address');
  console.log('   3. Verify contract on Sonic Explorer if needed');
  console.log('   4. Test contract functions with small transactions');
  
  return {
    gameTracker: gameTrackerAddress,
    deployer: deployer.address,
    arcToken: ARC_TOKEN_ADDRESS
  };
}

// Handle script execution
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ [DEPLOY] Deployment failed:', error);
      process.exit(1);
    });
}

module.exports = main;