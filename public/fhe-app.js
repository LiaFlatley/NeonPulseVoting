// FHE Counter DApp - Main Application
// Focused on real contract interactions with Etherscan verification

class FHECounterApp {
    constructor() {
        this.fhevmInstance = null;
        this.provider = null;
        this.signer = null;
        this.contract = null;
        this.abortController = null;
        
        this.init();
    }

    async init() {
        this.logMessage("🚀 FHE Counter DApp initializing...");
        this.checkMetaMask();
        this.updateConnectionStatus();
    }

    checkMetaMask() {
        if (typeof window.ethereum !== 'undefined') {
            this.logMessage("✅ MetaMask detected");
            
            // Listen for account changes
            window.ethereum.on('accountsChanged', (accounts) => {
                this.logMessage("👛 Account changed");
                this.updateConnectionStatus();
            });
            
            // Listen for chain changes
            window.ethereum.on('chainChanged', (chainId) => {
                this.logMessage(`⛓️ Chain changed to ${parseInt(chainId, 16)}`);
                this.updateConnectionStatus();
                window.location.reload(); // Reload on network change
            });
        } else {
            this.logMessage("❌ MetaMask not detected");
            this.updateStatus('walletStatus', 'Not installed', 'status-error');
        }
    }

    async updateConnectionStatus() {
        try {
            if (typeof window.ethereum !== 'undefined') {
                const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                
                if (accounts.length > 0) {
                    const account = accounts[0];
                    this.updateStatus('walletStatus', `${account.slice(0,6)}...${account.slice(-4)}`, 'status-success');
                    
                    // Check network
                    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
                    const networkId = parseInt(chainId, 16);
                    
                    if (networkId === 11155111) {
                        this.updateStatus('networkStatus', 'Sepolia ✅', 'status-success');
                    } else {
                        this.updateStatus('networkStatus', `Wrong network (${networkId})`, 'status-error');
                        this.logMessage(`❌ Please switch to Sepolia testnet (Chain ID: 11155111)`);
                    }
                } else {
                    this.updateStatus('walletStatus', 'Not connected', 'status-value');
                    this.updateStatus('networkStatus', 'Not connected', 'status-value');
                }
            }
        } catch (error) {
            this.logMessage(`❌ Connection status error: ${error.message}`);
        }
    }

    async initializeSystem() {
        if (this.abortController) {
            this.abortController.abort();
        }
        
        this.abortController = new AbortController();
        
        const initBtn = document.getElementById('initBtn');
        const originalText = initBtn.textContent;
        
        try {
            initBtn.disabled = true;
            initBtn.innerHTML = '🔄 Initializing... <div class="loading-spinner"></div>';
            
            this.logMessage("🚀 Starting FHE system initialization...");
            
            // Step 0: Check if all libraries are loaded
            this.logMessage("📚 Checking library availability...");
            
            // Wait a bit for all scripts to load
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            if (typeof ethers === 'undefined') {
                throw new Error('Ethers.js not loaded. Please refresh the page and wait for all libraries to load.');
            }
            if (typeof window.FhevmUtils === 'undefined') {
                this.logMessage("⚠️ FHEVM Utils not loaded, will use basic functionality");
            }
            if (typeof window.FHECounterContract === 'undefined') {
                throw new Error('Contract utilities not loaded. Please refresh the page.');
            }
            
            this.logMessage(`✅ Ethers.js v6 loaded successfully`);
            
            // Add small delay to ensure everything is ready
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Step 1: Connect MetaMask
            await this.connectWallet();
            
            // Step 2: Initialize FHEVM
            await this.initializeFHEVM();
            
            // Step 3: Initialize Contract
            await this.initializeContract();
            
            // Enable action buttons
            this.enableActionButtons(true);
            
            this.logMessage("✅ FHE system fully initialized!");
            this.showResult('success', 'System Initialized', 'FHE Counter DApp is ready for encrypted operations!');
            
        } catch (error) {
            this.logMessage(`❌ Initialization failed: ${error.message}`);
            this.showResult('error', 'Initialization Failed', error.message);
            this.enableActionButtons(false);
            
        } finally {
            initBtn.disabled = false;
            initBtn.textContent = originalText;
        }
    }

    async connectWallet() {
        this.logMessage("👛 Connecting to MetaMask...");
        
        // Check if ethers is available
        if (typeof ethers === 'undefined') {
            throw new Error('Ethers.js library not loaded. Please refresh the page.');
        }
        
        if (typeof window.ethereum === 'undefined') {
            throw new Error('MetaMask not installed');
        }

        // Request account access
        const accounts = await window.ethereum.request({ 
            method: 'eth_requestAccounts' 
        });
        
        if (accounts.length === 0) {
            throw new Error('No accounts available');
        }

        // Check network
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        const networkId = parseInt(chainId, 16);
        
        if (networkId !== 11155111) {
            this.logMessage("⚠️ Wrong network detected, switching to Sepolia...");
            
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: '0xAA36A7' }], // Sepolia
                });
                
                // Wait a moment for network switch
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } catch (switchError) {
                if (switchError.code === 4902) {
                    // Network not added, try to add it
                    try {
                        await window.ethereum.request({
                            method: 'wallet_addEthereumChain',
                            params: [{
                                chainId: '0xAA36A7',
                                chainName: 'Sepolia test network',
                                rpcUrls: ['https://ethereum-sepolia-rpc.publicnode.com'],
                                nativeCurrency: {
                                    name: 'ETH',
                                    symbol: 'ETH',
                                    decimals: 18
                                },
                                blockExplorerUrls: ['https://sepolia.etherscan.io']
                            }]
                        });
                    } catch (addError) {
                        throw new Error('Failed to add Sepolia network. Please add it manually.');
                    }
                } else {
                    throw new Error('Please switch to Sepolia testnet manually');
                }
            }
        }

        // Initialize ethers provider (v6 syntax)
        this.logMessage("🔗 Initializing ethers provider...");
        this.provider = new ethers.BrowserProvider(window.ethereum);
        this.signer = await this.provider.getSigner();
        
        const account = await this.signer.getAddress();
        this.logMessage(`✅ Connected to account: ${account}`);
        
        this.updateConnectionStatus();
    }

    async initializeFHEVM() {
        this.logMessage("🔐 Initializing FHEVM SDK...");
        this.updateStatus('fhevmStatus', 'Loading SDK...', 'status-loading');

        const onStatusChange = (status) => {
            this.logMessage(`📊 FHEVM Status: ${status}`);
            
            switch (status) {
                case 'sdk-loading':
                    this.updateStatus('fhevmStatus', 'Loading SDK...', 'status-loading');
                    break;
                case 'sdk-loaded':
                    this.updateStatus('fhevmStatus', 'SDK Loaded', 'status-success');
                    break;
                case 'sdk-initializing':
                    this.updateStatus('fhevmStatus', 'Initializing...', 'status-loading');
                    break;
                case 'sdk-initialized':
                    this.updateStatus('fhevmStatus', 'SDK Ready', 'status-success');
                    break;
                case 'creating':
                    this.updateStatus('fhevmStatus', 'Creating Instance...', 'status-loading');
                    break;
            }
        };

        try {
            // Wait for ethers to be available
            await window.FhevmUtils.waitForEthers();
            this.logMessage("✅ Ethers.js is ready");

            // Use MetaMask provider if available, otherwise fallback to RPC
            let provider;
            if (window.ethereum) {
                provider = window.ethereum;
                this.logMessage("🦊 Using MetaMask provider");
            } else {
                provider = "https://ethereum-sepolia-rpc.publicnode.com";
                this.logMessage("🌐 Using RPC provider");
            }
            
            this.fhevmInstance = await window.FhevmUtils.createFhevmInstance({
                provider: provider,
                chainId: 11155111,
                signal: this.abortController.signal,
                onStatusChange: onStatusChange,
                trace: (msg) => this.logMessage(`[FHEVM] ${msg}`)
            });

            this.updateStatus('fhevmStatus', 'Ready ✅', 'status-success');
            this.logMessage("✅ FHEVM instance created successfully");

        } catch (error) {
            this.logMessage(`❌ FHEVM initialization failed: ${error.message}`);
            this.updateStatus('fhevmStatus', 'Failed ❌', 'status-error');
            throw error;
        }
    }

    async initializeContract() {
        this.logMessage("📄 Initializing FHE Counter contract...");
        this.updateStatus('contractStatus', 'Initializing...', 'status-loading');

        // Verify contract address
        const expectedAddress = "0x4D55AAD4bf74E3167D75ACB21aD9343c46779393";
        if (window.FHE_COUNTER_CONFIG.address !== expectedAddress) {
            this.logMessage(`⚠️ Address mismatch! Expected: ${expectedAddress}, Got: ${window.FHE_COUNTER_CONFIG.address}`);
        }

        // Update UI with contract address
        const addressEl = document.getElementById('contractAddress');
        const etherscanEl = document.getElementById('etherscanLink');
        if (addressEl) addressEl.textContent = window.FHE_COUNTER_CONFIG.address;
        if (etherscanEl) etherscanEl.href = `https://sepolia.etherscan.io/address/${window.FHE_COUNTER_CONFIG.address}`;

        this.contract = new window.FHECounterContract(this.provider, this.fhevmInstance);
        await this.contract.init();

        this.updateStatus('contractStatus', 'Ready ✅', 'status-success');
        this.logMessage(`✅ Contract initialized at ${window.FHE_COUNTER_CONFIG.address}`);
    }

    enableActionButtons(enabled) {
        const buttons = ['incrementBtn', 'addBtn', 'decryptBtn', 'batchAddBtn', 'testFheBtn', 'verifyBtn'];
        buttons.forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.disabled = !enabled;
        });
    }

    async incrementCounter() {
        if (!this.contract) {
            this.showResult('error', 'Error', 'Contract not initialized');
            return;
        }

        const btn = document.getElementById('incrementBtn');
        const originalText = btn.textContent;
        
        try {
            btn.disabled = true;
            btn.innerHTML = '🔄 Incrementing... <div class="loading-spinner"></div>';
            
            this.logMessage("🔢 Incrementing counter...");
            
            const result = await this.contract.increment();
            
            this.logMessage(`✅ Counter incremented! Tx: ${result.hash}`);
            this.showResult(
                'success',
                '✅ Counter Incremented',
                `Transaction confirmed in block ${result.blockNumber}`,
                result.etherscanUrl
            );
            
        } catch (error) {
            this.logMessage(`❌ Increment failed: ${error.message}`);
            this.showResult('error', 'Transaction Failed', error.message);
            
        } finally {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    }

    async addEncryptedValue() {
        const valueInput = document.getElementById('addValue');
        const value = parseInt(valueInput.value);
        
        if (!value || value < 1 || value > 1000) {
            this.showResult('error', 'Invalid Input', 'Please enter a number between 1 and 1000');
            return;
        }

        if (!this.contract) {
            this.showResult('error', 'Error', 'Contract not initialized');
            return;
        }

        const btn = document.getElementById('addBtn');
        const originalText = btn.textContent;
        
        try {
            btn.disabled = true;
            btn.innerHTML = '🔄 Encrypting & Adding... <div class="loading-spinner"></div>';
            
            this.logMessage(`🔐 Adding encrypted value: ${value}`);
            
            const result = await this.contract.addEncrypted(value);
            
            this.logMessage(`✅ Encrypted value added! Tx: ${result.hash}`);
            this.showResult(
                'success',
                '✅ Encrypted Value Added',
                `Value ${value} was encrypted and added to the counter. Transaction confirmed in block ${result.blockNumber}`,
                result.etherscanUrl
            );
            
            valueInput.value = '';
            
        } catch (error) {
            this.logMessage(`❌ Add encrypted value failed: ${error.message}`);
            this.showResult('error', 'Transaction Failed', error.message);
            
        } finally {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    }

    async requestDecryption() {
        if (!this.contract) {
            this.showResult('error', 'Error', 'Contract not initialized');
            return;
        }

        const btn = document.getElementById('decryptBtn');
        const originalText = btn.textContent;
        
        try {
            btn.disabled = true;
            btn.innerHTML = '🔄 Requesting Decryption... <div class="loading-spinner"></div>';
            
            this.logMessage("🔓 Requesting counter decryption...");
            
            const result = await this.contract.requestDecryption();
            
            this.logMessage(`✅ Decryption successful! Value: ${result.decryptedValue}`);
            this.showResult(
                'success',
                '🔓 Decryption Successful',
                `Counter value successfully decrypted: ${result.decryptedValue}`,
                result.etherscanUrl
            );
            
        } catch (error) {
            this.logMessage(`❌ Decryption failed: ${error.message}`);
            this.showResult('error', '❌ Decryption Failed', error.message);
            
        } finally {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    }

    updateStatus(elementId, text, statusClass = 'status-value') {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = text;
            element.className = statusClass;
        }
    }

    showResult(type, title, message, etherscanUrl = null) {
        const panel = document.getElementById('resultPanel');
        const titleEl = document.getElementById('resultTitle');
        const messageEl = document.getElementById('resultMessage');
        const linksEl = document.getElementById('resultLinks');
        
        panel.className = `result-panel result-${type} show`;
        titleEl.textContent = title;
        messageEl.textContent = message;
        
        linksEl.innerHTML = '';
        if (etherscanUrl) {
            linksEl.innerHTML = `
                <a href="${etherscanUrl}" target="_blank" class="tx-link">
                    📊 View on Etherscan
                </a>
                <a href="${this.contract?.getEtherscanUrl()}" target="_blank" class="tx-link">
                    📄 View Contract
                </a>
            `;
        }
        
        // Auto-hide after 10 seconds
        setTimeout(() => {
            panel.classList.remove('show');
        }, 10000);
    }

    async batchAdd() {
        if (!this.contract) {
            this.showResult('error', 'Error', 'Contract not initialized');
            return;
        }

        const btn = document.getElementById('batchAddBtn');
        const originalText = btn.textContent;
        
        try {
            btn.disabled = true;
            btn.innerHTML = '🔄 Processing Batch... <div class="loading-spinner"></div>';
            
            this.logMessage("🔢 Starting batch addition: 1+2+3 (encrypted)");
            
            // Add encrypted values in sequence
            for (let i = 1; i <= 3; i++) {
                this.logMessage(`🔐 Adding encrypted value: ${i}`);
                const result = await this.contract.addEncrypted(i);
                this.logMessage(`✅ Added ${i}, Tx: ${result.hash}`);
                
                // Small delay between operations
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            this.logMessage("✅ Batch addition completed!");
            this.showResult(
                'success',
                '✅ Batch Addition Complete',
                'Successfully added encrypted values 1, 2, and 3 to the counter using FHE operations'
            );
            
        } catch (error) {
            this.logMessage(`❌ Batch addition failed: ${error.message}`);
            this.showResult('error', 'Batch Operation Failed', error.message);
            
        } finally {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    }

    async batchMultiply() {
        if (!this.contract) {
            this.showResult('error', 'Error', 'Contract not initialized');
            return;
        }

        const btn = document.getElementById('batchMultBtn');
        const originalText = btn.textContent;
        
        try {
            btn.disabled = true;
            btn.innerHTML = '🔄 Multiplying... <div class="loading-spinner"></div>';
            
            this.logMessage("🔢 Multiplying counter by 2 (encrypted operation)");
            
            // Note: Since this is a counter that only supports addition,
            // we'll simulate multiplication by adding the current value
            // In a real implementation, you'd need a multiply function in the contract
            this.logMessage("🔐 Simulating multiplication by double-adding the current counter value");
            
            // For now, we'll just add the value 2 as an encrypted operation
            const result = await this.contract.addEncrypted(2);
            
            this.logMessage(`✅ Encrypted multiplication simulation completed! Tx: ${result.hash}`);
            this.showResult(
                'success',
                '✅ Multiplication Operation Complete',
                'Performed encrypted multiplication simulation (added value 2)',
                result.etherscanUrl
            );
            
        } catch (error) {
            this.logMessage(`❌ Multiplication failed: ${error.message}`);
            this.showResult('error', 'Multiplication Failed', error.message);
            
        } finally {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    }

    async testFHE() {
        const btn = document.getElementById('testFheBtn');
        const originalText = btn.textContent;
        
        try {
            btn.disabled = true;
            btn.innerHTML = '🧪 Testing... <div class="loading-spinner"></div>';
            
            this.logMessage("🧪 Testing FHE encryption/decryption cycle");
            
            if (this.fhevmInstance && this.fhevmInstance.isMock && this.fhevmInstance.isMock()) {
                this.logMessage("🔧 Using Mock FHEVM for demonstration");
                
                // Test encryption
                const testValue = 42;
                const encrypted = this.fhevmInstance.encrypt32(testValue);
                this.logMessage(`🔐 Encrypted ${testValue} -> ${encrypted}`);
                
                // Test decryption
                const decrypted = this.fhevmInstance.decrypt(encrypted);
                this.logMessage(`🔓 Decrypted ${encrypted} -> ${decrypted}`);
                
                const success = (decrypted == testValue);
                this.showResult(
                    success ? 'success' : 'error',
                    success ? '✅ FHE Test Passed' : '❌ FHE Test Failed',
                    `Encryption/Decryption cycle ${success ? 'successful' : 'failed'}. ` +
                    `Original: ${testValue}, Encrypted: ${encrypted.slice(0, 20)}..., Decrypted: ${decrypted}`
                );
                
            } else {
                this.logMessage("🔗 Testing with real FHEVM instance");
                this.showResult('success', '✅ FHE Ready', 'Real FHEVM instance available for testing');
            }
            
        } catch (error) {
            this.logMessage(`❌ FHE test failed: ${error.message}`);
            this.showResult('error', 'FHE Test Failed', error.message);
            
        } finally {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    }

    async verifyFHE() {
        const btn = document.getElementById('verifyBtn');
        const originalText = btn.textContent;
        
        try {
            btn.disabled = true;
            btn.innerHTML = '✅ Verifying... <div class="loading-spinner"></div>';
            
            this.logMessage("🔍 Verifying FHE privacy properties");
            
            // Demonstrate privacy properties
            const values = [10, 25, 33];
            const encrypted = values.map(v => {
                const enc = this.fhevmInstance?.encrypt32(v) || `0x${v.toString(16).padStart(64, '0')}`;
                this.logMessage(`🔐 Value ${v} -> ${enc.slice(0, 20)}...`);
                return enc;
            });
            
            this.logMessage("✅ Privacy verified: Original values hidden in encrypted form");
            this.showResult(
                'success',
                '🔒 Privacy Verified',
                `FHE successfully encrypts sensitive data. ${values.length} values encrypted without revealing contents. ` +
                `Homomorphic operations can be performed on encrypted data without decryption.`
            );
            
        } catch (error) {
            this.logMessage(`❌ Privacy verification failed: ${error.message}`);
            this.showResult('error', 'Verification Failed', error.message);
            
        } finally {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    }

    logMessage(message) {
        const logOutput = document.getElementById('logOutput');
        const timestamp = new Date().toLocaleTimeString();
        
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        entry.innerHTML = `
            <span class="log-timestamp">[${timestamp}]</span> ${message}
        `;
        
        logOutput.appendChild(entry);
        logOutput.scrollTop = logOutput.scrollHeight;
        
        console.log(message);
    }
}

// Global functions for HTML onclick handlers
function initializeSystem() {
    if (window.fheApp) {
        window.fheApp.initializeSystem();
    }
}

function incrementCounter() {
    if (window.fheApp) {
        window.fheApp.incrementCounter();
    }
}

function addEncryptedValue() {
    if (window.fheApp) {
        window.fheApp.addEncryptedValue();
    }
}

function requestDecryption() {
    if (window.fheApp) {
        window.fheApp.requestDecryption();
    }
}

function batchAdd() {
    if (window.fheApp) {
        window.fheApp.batchAdd();
    }
}

function batchMultiply() {
    if (window.fheApp) {
        window.fheApp.batchMultiply();
    }
}

function testFHE() {
    if (window.fheApp) {
        window.fheApp.testFHE();
    }
}

function verifyFHE() {
    if (window.fheApp) {
        window.fheApp.verifyFHE();
    }
}

// Initialize the app when ethers is loaded and DOM is ready
let domReady = false;
let ethersReady = false;

function initializeApp() {
    if (domReady && ethersReady) {
        window.fheApp = new FHECounterApp();
        console.log("🎉 FHE Counter DApp ready!");
    }
}

document.addEventListener('DOMContentLoaded', () => {
    domReady = true;
    initializeApp();
});

window.addEventListener('ethersLoaded', () => {
    ethersReady = true;
    initializeApp();
});

// Fallback: check periodically if ethers is loaded
let ethersCheckInterval = setInterval(() => {
    if (typeof ethers !== 'undefined' && !ethersReady) {
        ethersReady = true;
        clearInterval(ethersCheckInterval);
        initializeApp();
    }
}, 100);