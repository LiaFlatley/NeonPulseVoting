import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Starting New FHE Counter deployment...");
  
  // Get the contract factory
  const NewFHECounter = await ethers.getContractFactory("NewFHECounter");
  
  // Deploy the contract
  console.log("📝 Deploying NewFHECounter contract...");
  const newFHECounter = await NewFHECounter.deploy();
  
  // Wait for deployment to be mined
  await newFHECounter.waitForDeployment();
  
  const contractAddress = await newFHECounter.getAddress();
  console.log("✅ NewFHECounter deployed to:", contractAddress);
  
  // Display deployment information
  console.log("\n🔍 Deployment Summary:");
  console.log("Contract Name: NewFHECounter");
  console.log("Contract Address:", contractAddress);
  console.log("Network: sepolia");
  console.log("Chain ID: 11155111");
  
  // Get deployer info
  const [deployer] = await ethers.getSigners();
  console.log("Deployer Address:", deployer.address);
  
  // Etherscan verification URL
  console.log("🔗 Etherscan URL:", `https://sepolia.etherscan.io/address/${contractAddress}`);
  
  // Save deployment info for frontend update
  const deploymentInfo = {
    contractName: "NewFHECounter",
    contractAddress: contractAddress,
    network: "sepolia",
    chainId: 11155111,
    deploymentTime: new Date().toISOString(),
    deployer: deployer.address,
    abi: [
      "function increment(bytes32 inputEuint32, bytes calldata inputProof) external",
      "function decrement(bytes32 inputEuint32, bytes calldata inputProof) external", 
      "function getCount() external view returns (bytes32)",
      "function allowUser(address user) external"
    ]
  };
  
  console.log("\n📋 Deployment Info:");
  console.log(JSON.stringify(deploymentInfo, null, 2));
  
  console.log("\n📝 Next steps:");
  console.log(`1. Update D:\\web3\\dapp7\\frontend\\src\\hooks\\useFHECounter.ts`);
  console.log(`2. Replace address "0x4D55AAD4bf74E3167D75ACB21aD9343c46779393" with "${contractAddress}"`);
  console.log(`3. Test the new contract interactions`);
  
  return contractAddress;
}

// Execute deployment
main()
  .then((address) => {
    console.log(`\n🎉 Deployment completed successfully!`);
    console.log(`New Contract Address: ${address}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });