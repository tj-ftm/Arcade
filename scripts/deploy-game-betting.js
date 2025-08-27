const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying GameBetting contract...");
  
  // ARC token contract address as specified
  const ARC_TOKEN_ADDRESS = "0xAD75eAb973D5AbB77DAdc0Ec3047008dF3aa094d";
  
  // Get the contract factory
  const GameBetting = await ethers.getContractFactory("GameBetting");
  
  // Deploy the contract
  console.log("Deploying with ARC token address:", ARC_TOKEN_ADDRESS);
  const gameBetting = await GameBetting.deploy(ARC_TOKEN_ADDRESS);
  
  // Wait for deployment to complete
  await gameBetting.waitForDeployment();
  
  const contractAddress = await gameBetting.getAddress();
  console.log("GameBetting contract deployed to:", contractAddress);
  
  // Get deployment transaction
  const deploymentTx = gameBetting.deploymentTransaction();
  console.log("Deployment transaction hash:", deploymentTx.hash);
  
  // Wait for a few confirmations
  console.log("Waiting for confirmations...");
  await deploymentTx.wait(3);
  
  console.log("\n=== Deployment Summary ===");
  console.log("Contract Address:", contractAddress);
  console.log("ARC Token Address:", ARC_TOKEN_ADDRESS);
  console.log("Transaction Hash:", deploymentTx.hash);
  console.log("Network:", (await ethers.provider.getNetwork()).name);
  
  // Verify initial contract state
  console.log("\n=== Initial Contract State ===");
  const houseFee = await gameBetting.houseFeePercent();
  const minBet = await gameBetting.minBetAmount();
  const maxBet = await gameBetting.maxBetAmount();
  const arcToken = await gameBetting.arcToken();
  
  console.log("House Fee:", houseFee.toString(), "basis points (" + (houseFee / 100).toString() + "%)");
  console.log("Min Bet Amount:", ethers.formatEther(minBet), "ARC");
  console.log("Max Bet Amount:", ethers.formatEther(maxBet), "ARC");
  console.log("ARC Token Address:", arcToken);
  
  // Save deployment info to file
  const fs = require('fs');
  const deploymentInfo = {
    contractAddress: contractAddress,
    arcTokenAddress: ARC_TOKEN_ADDRESS,
    transactionHash: deploymentTx.hash,
    network: (await ethers.provider.getNetwork()).name,
    deployedAt: new Date().toISOString(),
    houseFeePercent: houseFee.toString(),
    minBetAmount: minBet.toString(),
    maxBetAmount: maxBet.toString()
  };
  
  fs.writeFileSync(
    './deployment-game-betting.json',
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log("\nDeployment info saved to deployment-game-betting.json");
  
  return {
    contractAddress,
    contract: gameBetting
  };
}

// Execute deployment
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Deployment failed:", error);
      process.exit(1);
    });
}

module.exports = main;