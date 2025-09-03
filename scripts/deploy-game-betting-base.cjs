const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying GameBetting contract to Base Mainnet...");
  
  // ARC token contract address on Base Mainnet
  const ARC_TOKEN_ADDRESS = "0xAD75eAb973D5AbB77DAdc0Ec3047008dF3aa094d";
  
  // Get the deployer's address to use as initial owner
  const [deployer] = await ethers.getSigners();
  console.log("Deploying from account:", deployer.address);
  
  // Check deployer balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance:", ethers.formatEther(balance), "ETH");
  
  if (balance < ethers.parseEther("0.001")) {
    throw new Error("Insufficient balance for deployment. Need at least 0.001 ETH for gas fees.");
  }
  
  // Get the contract factory
  const GameBetting = await ethers.getContractFactory("GameBetting");
  
  // Use appropriate gas price for Base network
  const feeData = await ethers.provider.getFeeData();
  const gasPrice = feeData.gasPrice;
  console.log("Using gas price:", ethers.formatUnits(gasPrice, "gwei"), "gwei");
  
  // Deploy the contract
  console.log("Deploying with ARC token address:", ARC_TOKEN_ADDRESS);
  console.log("Initial owner:", deployer.address);
  
  const gameBetting = await GameBetting.deploy(ARC_TOKEN_ADDRESS, deployer.address, {
    gasPrice: gasPrice
  });
  
  // Wait for deployment to complete
  console.log("Waiting for deployment...");
  await gameBetting.waitForDeployment();
  
  const contractAddress = await gameBetting.getAddress();
  console.log("GameBetting contract deployed to:", contractAddress);
  
  // Get deployment transaction
  const deploymentTx = gameBetting.deploymentTransaction();
  console.log("Deployment transaction hash:", deploymentTx.hash);
  
  // Wait for confirmations
  console.log("Waiting for confirmations...");
  await deploymentTx.wait(3);
  
  console.log("\n=== Deployment Summary ===");
  console.log("Network: Base Mainnet");
  console.log("Contract Address:", contractAddress);
  console.log("ARC Token Address:", ARC_TOKEN_ADDRESS);
  console.log("Transaction Hash:", deploymentTx.hash);
  console.log("Explorer URL: https://basescan.org/tx/" + deploymentTx.hash);
  
  // Verify initial contract state
  console.log("\n=== Initial Contract State ===");
  try {
    const houseFee = await gameBetting.houseFeePercent();
    const minBet = await gameBetting.minBetAmount();
    const owner = await gameBetting.owner();
    const arcToken = await gameBetting.arcToken();
    
    console.log("House Fee Percent:", houseFee.toString(), "%");
    console.log("Minimum Bet Amount:", ethers.formatEther(minBet), "ARC");
    console.log("Contract Owner:", owner);
    console.log("ARC Token Address:", arcToken);
  } catch (error) {
    console.log("Could not verify contract state:", error.message);
  }
  
  console.log("\n=== Next Steps ===");
  console.log("1. Update betting configuration in src/lib/betting-config.ts");
  console.log("2. Add Base chain contract address to environment variables");
  console.log("3. Test contract functionality on Base testnet first");
  console.log("4. Verify contract on BaseScan if needed");
  
  return {
    contractAddress,
    transactionHash: deploymentTx.hash,
    network: "base-mainnet"
  };
}

// Execute deployment
if (require.main === module) {
  main()
    .then((result) => {
      console.log("\n✅ Deployment completed successfully!");
      console.log("Contract Address:", result.contractAddress);
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Deployment failed:");
      console.error(error);
      process.exit(1);
    });
}

module.exports = main;