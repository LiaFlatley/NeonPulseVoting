const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Starting Standard FHE Counter deployment with correct mnemonic...");
  
  // Get the contract factory
  const StandardFHECounter = await ethers.getContractFactory("StandardFHECounter");
  
  // Get deployer info
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying from address:", deployer.address);
  
  // Check deployer balance
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("💰 Deployer balance:", ethers.formatEther(balance), "ETH");
  
  if (balance < ethers.parseEther("0.01")) {
    console.warn("⚠️ Warning: Low balance. Make sure you have enough ETH for deployment.");
  }
  
  // Deploy the contract
  console.log("📝 Deploying StandardFHECounter contract...");
  const standardFHECounter = await StandardFHECounter.deploy();
  
  // Wait for deployment to be mined
  console.log("⏳ Waiting for deployment confirmation...");
  await standardFHECounter.waitForDeployment();
  
  const contractAddress = await standardFHECounter.getAddress();
  console.log("✅ StandardFHECounter deployed to:", contractAddress);
  
  // Display deployment information
  console.log("\n🔍 Deployment Summary:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Contract Name: StandardFHECounter");
  console.log("Contract Address:", contractAddress);
  console.log("Network: sepolia");
  console.log("Chain ID: 11155111");
  console.log("Deployer Address:", deployer.address);
  console.log("Gas Used: (will be shown after transaction)");
  
  // Etherscan verification URL
  console.log("\n🔗 Etherscan URL:");
  console.log(`https://sepolia.etherscan.io/address/${contractAddress}`);
  
  // Frontend update instructions
  console.log("\n📝 Frontend Update Required:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`1. Update file: D:\\web3\\dapp7\\frontend\\src\\hooks\\useFHECounter.ts`);
  console.log(`2. Replace old address with: ${contractAddress}`);
  console.log(`3. Line to change: address: "${contractAddress}"`);
  
  // Save deployment info for easy copy-paste
  const deploymentInfo = {
    contractName: "StandardFHECounter",
    contractAddress: contractAddress,
    network: "sepolia",
    chainId: 11155111,
    deploymentTime: new Date().toISOString(),
    deployer: deployer.address,
    etherscanUrl: `https://sepolia.etherscan.io/address/${contractAddress}`
  };
  
  console.log("\n📋 Deployment Info JSON:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(JSON.stringify(deploymentInfo, null, 2));
  
  // Test contract interaction
  console.log("\n🧪 Testing contract...");
  try {
    const owner = await standardFHECounter.getOwner();
    console.log("✅ Contract owner:", owner);
    console.log("✅ Contract is responsive and working!");
  } catch (error) {
    console.log("⚠️ Contract test failed:", error.message);
  }
  
  return contractAddress;
}

// Execute deployment
main()
  .then((address) => {
    console.log(`\n🎉 Deployment completed successfully!`);
    console.log(`📍 New Contract Address: ${address}`);
    console.log(`\n📋 Next Steps:`);
    console.log(`1. Copy the contract address: ${address}`);
    console.log(`2. Update the frontend configuration`);
    console.log(`3. Test FHE interactions with the new contract`);
    console.log(`4. Monitor transactions on Etherscan`);
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });