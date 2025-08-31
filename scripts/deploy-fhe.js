const { ethers } = require("hardhat");
const fs = require('fs');

async function main() {
  console.log("🚀 Starting FHE Counter deployment with mnemonic...");
  console.log("====================================================");

  try {
    // Get deployer account from mnemonic
    const [deployer] = await ethers.getSigners();
    console.log("📋 Deployer address:", deployer.address);
    
    // Get balance
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("💰 Account balance:", ethers.formatEther(balance), "ETH");

    if (balance === 0n) {
      throw new Error("⚠️ Insufficient balance for deployment. Please add ETH to the account.");
    }

    // Get network info
    const network = await ethers.provider.getNetwork();
    console.log("🌐 Network:", network.name || "unknown", `(Chain ID: ${network.chainId})`);

    // Deploy FHECounter
    console.log("\n📄 Deploying FHECounter contract...");
    
    const FHECounter = await ethers.getContractFactory("FHECounter");
    const fheCounter = await FHECounter.deploy({
      gasLimit: 5000000,
      gasPrice: ethers.parseUnits("20", "gwei")
    });
    
    await fheCounter.waitForDeployment();
    const contractAddress = await fheCounter.getAddress();
    
    console.log("✅ FHECounter deployed to:", contractAddress);
    console.log("📝 Transaction hash:", fheCounter.deploymentTransaction().hash);

    // Wait for confirmations
    console.log("⏳ Waiting for confirmations...");
    await fheCounter.deploymentTransaction().wait(2);
    console.log("✅ Confirmed!");

    // Test basic functionality
    console.log("\n🧪 Testing basic functionality...");
    try {
      const tx = await fheCounter.increment();
      await tx.wait();
      console.log("✅ Increment test successful");
    } catch (error) {
      console.log("⚠️ Increment test failed:", error.message);
    }

    // Save deployment info
    const deploymentInfo = {
      contractAddress: contractAddress,
      deployer: deployer.address,
      network: {
        name: network.name || "unknown",
        chainId: Number(network.chainId)
      },
      deploymentHash: fheCounter.deploymentTransaction().hash,
      timestamp: new Date().toISOString(),
      gasUsed: fheCounter.deploymentTransaction().gasLimit?.toString() || "unknown"
    };

    const deploymentPath = './fhe-deployment.json';
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`\n💾 Deployment info saved to: ${deploymentPath}`);

    // Generate new contract config
    const contractConfig = `// FHE Counter Contract Configuration - Real Deployment
// Generated from mnemonic: dance kind slim miss until copy verify brain sugar mercy make later

const FHE_COUNTER_CONFIG = {
    address: "${contractAddress}",
    network: "${network.name || 'sepolia'}",
    chainId: ${Number(network.chainId)},
    deployer: "${deployer.address}",
    
    // Contract ABI for FHE operations
    abi: [
        {
            "inputs": [],
            "name": "increment",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {"internalType": "einput", "name": "encryptedValue", "type": "bytes32"},
                {"internalType": "bytes", "name": "inputProof", "type": "bytes"}
            ],
            "name": "add",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "getCount",
            "outputs": [{"internalType": "euint32", "name": "", "type": "uint256"}],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "getCountHandle",
            "outputs": [{"internalType": "bytes32", "name": "", "type": "bytes32"}],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
            "name": "allowUser",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "reset",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "owner",
            "outputs": [{"internalType": "address", "name": "", "type": "address"}],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "anonymous": false,
            "inputs": [{"indexed": true, "internalType": "address", "name": "user", "type": "address"}],
            "name": "CounterIncremented",
            "type": "event"
        }
    ]
};

// Contract interaction helper class
class FHECounterContract {
    constructor(provider, fhevmInstance) {
        this.provider = provider;
        this.fhevmInstance = fhevmInstance;
        this.config = FHE_COUNTER_CONFIG;
        this.contract = null;
    }

    async init() {
        if (!this.provider) {
            throw new Error('No provider available');
        }

        const signer = await this.provider.getSigner();
        this.contract = new ethers.Contract(
            this.config.address,
            this.config.abi,
            signer
        );

        console.log(\`📄 FHE Counter contract initialized at: \${this.config.address}\`);
    }

    async increment() {
        if (!this.contract) {
            throw new Error('Contract not initialized');
        }

        console.log('🔢 Incrementing counter...');
        const tx = await this.contract.increment();
        console.log(\`📝 Transaction hash: \${tx.hash}\`);
        
        const receipt = await tx.wait();
        console.log(\`✅ Transaction confirmed in block: \${receipt.blockNumber}\`);
        
        return {
            hash: tx.hash,
            blockNumber: receipt.blockNumber,
            etherscanUrl: \`https://sepolia.etherscan.io/tx/\${tx.hash}\`
        };
    }

    async addEncrypted(value) {
        if (!this.contract || !this.fhevmInstance) {
            throw new Error('Contract or FHEVM instance not initialized');
        }

        console.log(\`🔢 Adding encrypted value: \${value}\`);
        
        // Create encrypted input
        const input = this.fhevmInstance.createEncryptedInput(this.config.address, await this.provider.getSigner().getAddress());
        input.add32(value);
        const encryptedInput = await input.encrypt();
        
        const tx = await this.contract.add(encryptedInput.handles[0], encryptedInput.inputProof);
        console.log(\`📝 Transaction hash: \${tx.hash}\`);
        
        const receipt = await tx.wait();
        console.log(\`✅ Transaction confirmed in block: \${receipt.blockNumber}\`);
        
        return {
            hash: tx.hash,
            blockNumber: receipt.blockNumber,
            etherscanUrl: \`https://sepolia.etherscan.io/tx/\${tx.hash}\`
        };
    }

    getEtherscanUrl() {
        return \`https://sepolia.etherscan.io/address/\${this.config.address}\`;
    }
}

// Export for global use
window.FHECounterContract = FHECounterContract;
window.FHE_COUNTER_CONFIG = FHE_COUNTER_CONFIG;

console.log('✅ FHE Counter contract configuration loaded');
console.log('🔗 Contract Address:', FHE_COUNTER_CONFIG.address);
console.log('🌐 Network:', FHE_COUNTER_CONFIG.network);
`;

    fs.writeFileSync('./public/contracts/FHECounter.js', contractConfig);
    console.log("📄 Updated contract configuration file");

    console.log("\n🎉 Deployment Summary:");
    console.log("======================");
    console.log("✅ Contract Address:", contractAddress);
    console.log("🌐 Network:", network.name || "unknown", `(${network.chainId})`);
    console.log("👤 Deployer:", deployer.address);
    console.log("💰 Gas Used:", fheCounter.deploymentTransaction().gasLimit?.toString() || "unknown");
    
    if (Number(network.chainId) === 11155111) {
      console.log("\n🔗 Verification Links:");
      console.log("📊 Contract:", `https://sepolia.etherscan.io/address/${contractAddress}`);
      console.log("📝 Transaction:", `https://sepolia.etherscan.io/tx/${fheCounter.deploymentTransaction().hash}`);
      
      console.log("\n🔍 Etherscan Verification Command:");
      console.log(`npx hardhat verify --network sepolia ${contractAddress}`);
    }

  } catch (error) {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => {
    console.log("\n✅ Deployment completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Unexpected error:", error);
    process.exit(1);
  });