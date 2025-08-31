const { ethers, fhevm } = require("hardhat");

async function main() {
  console.log("🚀 Starting FHE contract deployment...");
  
  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📋 Deploying contracts with account:", deployer.address);
  
  // Get account balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH");

  // Initialize FHEVM if needed
  if (fhevm) {
    console.log("🔧 Initializing FHEVM...");
    await fhevm.initializeFhevm();
  }

  // Deploy FHECounter
  console.log("\n📄 Deploying FHECounter...");
  const FHECounter = await ethers.getContractFactory("FHECounter");
  const fheCounter = await FHECounter.deploy();
  await fheCounter.waitForDeployment();
  const fheCounterAddress = await fheCounter.getAddress();
  console.log("✅ FHECounter deployed to:", fheCounterAddress);

  // Deploy PrivacyVault
  console.log("\n📄 Deploying PrivacyVault...");
  const PrivacyVault = await ethers.getContractFactory("PrivacyVault");
  const privacyVault = await PrivacyVault.deploy();
  await privacyVault.waitForDeployment();
  const privacyVaultAddress = await privacyVault.getAddress();
  console.log("✅ PrivacyVault deployed to:", privacyVaultAddress);

  // Save deployment info
  const deploymentInfo = {
    network: await ethers.provider.getNetwork(),
    deployer: deployer.address,
    contracts: {
      FHECounter: {
        address: fheCounterAddress,
        deploymentHash: fheCounter.deploymentTransaction()?.hash
      },
      PrivacyVault: {
        address: privacyVaultAddress,
        deploymentHash: privacyVault.deploymentTransaction()?.hash
      }
    },
    timestamp: new Date().toISOString()
  };

  console.log("\n📋 Deployment Summary:");
  console.log("Network:", deploymentInfo.network.name, "(Chain ID:", deploymentInfo.network.chainId + ")");
  console.log("Deployer:", deploymentInfo.deployer);
  console.log("FHECounter:", fheCounterAddress);
  console.log("PrivacyVault:", privacyVaultAddress);

  // Create Etherscan verification commands
  const network = await ethers.provider.getNetwork();
  if (network.chainId === 11155111n) { // Sepolia
    console.log("\n🔍 Etherscan Verification Commands:");
    console.log(`npx hardhat verify --network sepolia ${fheCounterAddress}`);
    console.log(`npx hardhat verify --network sepolia ${privacyVaultAddress}`);
    
    console.log("\n🌐 Etherscan Links:");
    console.log(`FHECounter: https://sepolia.etherscan.io/address/${fheCounterAddress}`);
    console.log(`PrivacyVault: https://sepolia.etherscan.io/address/${privacyVaultAddress}`);
  }

  // Save to deployment file
  const fs = require('fs');
  const deploymentPath = './deployment-info.json';
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n💾 Deployment info saved to: ${deploymentPath}`);

  console.log("\n✅ Deployment completed successfully!");
  
  // Test basic functionality
  console.log("\n🧪 Testing basic functionality...");
  try {
    // Test FHECounter increment
    console.log("Testing FHECounter increment...");
    const tx = await fheCounter.increment();
    await tx.wait();
    console.log("✅ FHECounter increment successful");
    
    // Get counter value
    const counterValue = await fheCounter.getCount();
    console.log("📊 Counter value handle:", counterValue);
    
  } catch (error) {
    console.log("⚠️ Basic testing failed:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });