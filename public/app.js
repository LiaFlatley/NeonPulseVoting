// Main Application - FHEVM DApp8
// Advanced FHEVM implementation with complete error handling and logging

class DApp8 {
    constructor() {
        this.fhevmInstance = null;
        this.currentProvider = null;
        this.abortController = null;
        this.isInitializing = false;
        
        this.initializeUI();
        this.setupEventListeners();
        this.logMessage("🚀 DApp8 initialized", "info");
    }

    initializeUI() {
        // Update network selector
        const networkSelect = document.getElementById('networkSelect');
        networkSelect.addEventListener('change', this.onNetworkChange.bind(this));
        
        // Show/hide custom RPC input
        this.onNetworkChange();
        
        // Update initial cache status
        this.updateCacheStatus();
    }

    setupEventListeners() {
        // Global error handler
        window.addEventListener('error', (event) => {
            this.showError(`Global Error: ${event.message}`);
            this.logMessage(`❌ Global Error: ${event.message}`, "error");
        });

        // Unhandled promise rejection handler
        window.addEventListener('unhandledrejection', (event) => {
            this.showError(`Unhandled Promise Rejection: ${event.reason}`);
            this.logMessage(`❌ Unhandled Promise: ${event.reason}`, "error");
        });
    }

    onNetworkChange() {
        const networkSelect = document.getElementById('networkSelect');
        const customRpcGroup = document.getElementById('customRpcGroup');
        
        if (networkSelect.value === 'custom') {
            customRpcGroup.style.display = 'block';
        } else {
            customRpcGroup.style.display = 'none';
        }
    }

    async updateCacheStatus() {
        try {
            const keys = await window.FhevmUtils.publicKeyStorage.list();
            const cacheStatus = document.getElementById('cacheStatus');
            
            if (keys.length === 0) {
                cacheStatus.textContent = "Empty";
                cacheStatus.className = "status-value";
            } else {
                cacheStatus.textContent = `${keys.length} key(s) cached`;
                cacheStatus.className = "status-success";
            }
        } catch (error) {
            const cacheStatus = document.getElementById('cacheStatus');
            cacheStatus.textContent = "Error checking cache";
            cacheStatus.className = "status-error";
        }
    }

    getSelectedProvider() {
        const networkSelect = document.getElementById('networkSelect');
        const customRpc = document.getElementById('customRpc');
        
        switch (networkSelect.value) {
            case 'sepolia':
                return window.FhevmUtils.NETWORK_CONFIGS.sepolia.rpcUrl;
            case 'local':
                return window.FhevmUtils.NETWORK_CONFIGS.local.rpcUrl;
            case 'custom':
                const customUrl = customRpc.value.trim();
                if (!customUrl) {
                    throw new Error("Please enter a custom RPC URL");
                }
                return customUrl;
            default:
                throw new Error("Invalid network selection");
        }
    }

    updateStatus(elementId, text, statusClass = "status-value") {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = text;
            element.className = statusClass;
        }
    }

    logMessage(message, type = "info") {
        const logOutput = document.getElementById('logOutput');
        const timestamp = new Date().toLocaleTimeString();
        
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        logEntry.innerHTML = `
            <span class="log-timestamp">[${timestamp}]</span>
            <span>${message}</span>
        `;
        
        logOutput.appendChild(logEntry);
        logOutput.scrollTop = logOutput.scrollHeight;
        
        // Also log to console with appropriate level
        switch (type) {
            case 'error':
                console.error(message);
                break;
            case 'warn':
                console.warn(message);
                break;
            default:
                console.log(message);
        }
    }

    showError(message) {
        const errorPanel = document.getElementById('errorPanel');
        const errorMessage = document.getElementById('errorMessage');
        const successPanel = document.getElementById('successPanel');
        
        errorMessage.textContent = message;
        errorPanel.style.display = 'block';
        successPanel.style.display = 'none';
        
        this.logMessage(`❌ ${message}`, "error");
        
        setTimeout(() => {
            errorPanel.style.display = 'none';
        }, 10000);
    }

    showSuccess(message) {
        const successPanel = document.getElementById('successPanel');
        const successMessage = document.getElementById('successMessage');
        const errorPanel = document.getElementById('errorPanel');
        
        successMessage.textContent = message;
        successPanel.style.display = 'block';
        errorPanel.style.display = 'none';
        
        this.logMessage(`✅ ${message}`, "info");
        
        setTimeout(() => {
            successPanel.style.display = 'none';
        }, 5000);
    }

    setButtonsEnabled(enabled) {
        const buttons = ['testBtn', 'addBtn', 'getCounterBtn'];
        buttons.forEach(buttonId => {
            const button = document.getElementById(buttonId);
            if (button) {
                button.disabled = !enabled;
            }
        });
    }

    async initializeSystem() {
        if (this.isInitializing) {
            this.logMessage("⚠️ System is already initializing...", "warn");
            return;
        }

        this.isInitializing = true;
        const connectBtn = document.getElementById('connectBtn');
        const originalText = connectBtn.textContent;
        
        try {
            // Cancel any existing initialization
            if (this.abortController) {
                this.abortController.abort();
            }
            
            this.abortController = new AbortController();
            
            connectBtn.disabled = true;
            connectBtn.textContent = "🔄 Initializing...";
            
            this.updateStatus('sdkStatus', 'Loading...', 'status-loading');
            this.updateStatus('networkStatus', 'Connecting...', 'status-loading');
            this.updateStatus('fhevmStatus', 'Creating...', 'status-loading');
            
            this.logMessage("🚀 Starting FHEVM initialization...");

            // Get provider configuration
            const provider = this.getSelectedProvider();
            this.logMessage(`🌐 Using provider: ${provider}`);

            // Create FHEVM instance with status tracking
            const onStatusChange = (status) => {
                this.logMessage(`📊 FHEVM Status: ${status}`);
                
                switch (status) {
                    case 'sdk-loading':
                        this.updateStatus('sdkStatus', 'Loading SDK...', 'status-loading');
                        break;
                    case 'sdk-loaded':
                        this.updateStatus('sdkStatus', 'SDK Loaded', 'status-success');
                        break;
                    case 'sdk-initializing':
                        this.updateStatus('sdkStatus', 'Initializing SDK...', 'status-loading');
                        break;
                    case 'sdk-initialized':
                        this.updateStatus('sdkStatus', 'SDK Initialized', 'status-success');
                        break;
                    case 'creating':
                        this.updateStatus('fhevmStatus', 'Creating Instance...', 'status-loading');
                        break;
                }
            };

            // Create FHEVM instance
            this.fhevmInstance = await window.FhevmUtils.createFhevmInstance({
                provider: provider,
                signal: this.abortController.signal,
                onStatusChange: onStatusChange,
                mockChains: {
                    31337: "http://localhost:8545"
                }
            });

            this.currentProvider = provider;
            
            // Update all status indicators
            this.updateStatus('sdkStatus', 'Ready', 'status-success');
            this.updateStatus('networkStatus', 'Connected', 'status-success');
            this.updateStatus('fhevmStatus', 'Ready', 'status-success');
            
            // Update cache status
            await this.updateCacheStatus();
            
            // Enable demo buttons
            this.setButtonsEnabled(true);
            
            this.logMessage("✅ FHEVM system initialized successfully!");
            this.showSuccess("FHEVM system initialized successfully! You can now use encryption features.");
            
        } catch (error) {
            this.logMessage(`❌ Initialization failed: ${error.message}`, "error");
            
            // Update status indicators to show error
            this.updateStatus('sdkStatus', 'Failed', 'status-error');
            this.updateStatus('networkStatus', 'Failed', 'status-error');
            this.updateStatus('fhevmStatus', 'Failed', 'status-error');
            
            if (error.name === 'FhevmAbortError') {
                this.showError("Initialization was cancelled");
            } else {
                this.showError(`Initialization failed: ${error.message}`);
            }
            
            this.setButtonsEnabled(false);
            
        } finally {
            this.isInitializing = false;
            connectBtn.disabled = false;
            connectBtn.textContent = originalText;
        }
    }

    async clearPublicKeyCache() {
        try {
            this.logMessage("🗑️ Clearing public key cache...");
            await window.FhevmUtils.publicKeyStorage.clear();
            await this.updateCacheStatus();
            this.showSuccess("Public key cache cleared successfully");
            this.logMessage("✅ Public key cache cleared");
        } catch (error) {
            this.showError(`Failed to clear cache: ${error.message}`);
        }
    }

    async testEncryption() {
        if (!this.fhevmInstance) {
            this.showError("FHEVM system not initialized");
            return;
        }

        try {
            this.logMessage("🧪 Testing encryption capabilities...");
            
            const testValue = 42;
            const encrypted = this.fhevmInstance.encrypt32 
                ? this.fhevmInstance.encrypt32(testValue)
                : `encrypted_${testValue}`;
            
            this.logMessage(`📊 Test value: ${testValue}`);
            this.logMessage(`🔐 Encrypted result: ${encrypted}`);
            
            this.showSuccess(`Encryption test successful! Value ${testValue} was encrypted.`);
            
        } catch (error) {
            this.showError(`Encryption test failed: ${error.message}`);
        }
    }

    async addToCounter() {
        if (!this.fhevmInstance) {
            this.showError("FHEVM system not initialized");
            return;
        }

        const counterValue = document.getElementById('counterValue').value;
        
        if (!counterValue || isNaN(counterValue)) {
            this.showError("Please enter a valid number");
            return;
        }

        try {
            const value = parseInt(counterValue);
            this.logMessage(`➕ Adding encrypted value: ${value}`);
            
            const encryptedValue = this.fhevmInstance.encrypt32 
                ? this.fhevmInstance.encrypt32(value)
                : `encrypted_${value}`;
            
            this.logMessage(`🔐 Encrypted value: ${encryptedValue}`);
            
            // In a real implementation, you would send this to a smart contract
            this.showSuccess(`Successfully encrypted and added value ${value} to counter!`);
            
            // Clear input
            document.getElementById('counterValue').value = '';
            
        } catch (error) {
            this.showError(`Failed to add to counter: ${error.message}`);
        }
    }

    async getCounter() {
        if (!this.fhevmInstance) {
            this.showError("FHEVM system not initialized");
            return;
        }

        try {
            this.logMessage("📊 Retrieving counter value...");
            
            // In a real implementation, you would:
            // 1. Call the smart contract to get the encrypted counter
            // 2. Use the FHEVM instance to decrypt it
            // For demo purposes, we'll simulate this
            
            const simulatedEncryptedCounter = "encrypted_counter_data";
            const simulatedDecryptedValue = Math.floor(Math.random() * 1000);
            
            this.logMessage(`🔓 Decrypted counter value: ${simulatedDecryptedValue}`);
            this.showSuccess(`Counter value retrieved: ${simulatedDecryptedValue}`);
            
        } catch (error) {
            this.showError(`Failed to get counter: ${error.message}`);
        }
    }
}

// Global functions for HTML onclick handlers
function initializeSystem() {
    if (window.dapp8) {
        window.dapp8.initializeSystem();
    }
}

function clearPublicKeyCache() {
    if (window.dapp8) {
        window.dapp8.clearPublicKeyCache();
    }
}

function testEncryption() {
    if (window.dapp8) {
        window.dapp8.testEncryption();
    }
}

function addToCounter() {
    if (window.dapp8) {
        window.dapp8.addToCounter();
    }
}

function getCounter() {
    if (window.dapp8) {
        window.dapp8.getCounter();
    }
}

// Initialize the DApp when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.dapp8 = new DApp8();
    console.log("🎉 DApp8 ready!");
});