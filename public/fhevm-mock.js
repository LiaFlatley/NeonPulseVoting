// FHEVM Mock Implementation for Demo Purposes
// Provides basic FHE simulation without requiring full KMS setup

class MockFHEVMInstance {
    constructor(config) {
        this.config = config;
        this.chainId = config.chainId || 11155111;
        this.contractAddress = config.contractAddress;
        console.log(`🔧 Mock FHEVM Instance created for chain ${this.chainId}`);
    }

    // Mock encryption - just encodes the value
    encrypt32(value) {
        const encoded = `0x${value.toString(16).padStart(64, '0')}`;
        console.log(`🔐 Mock encrypt32(${value}) -> ${encoded}`);
        return encoded;
    }

    // Mock decryption - extracts the value
    decrypt(handle) {
        if (typeof handle === 'string' && handle.startsWith('0x')) {
            const value = parseInt(handle, 16);
            console.log(`🔓 Mock decrypt(${handle}) -> ${value}`);
            return value;
        }
        return handle;
    }

    // Create encrypted input for transactions
    createEncryptedInput(contractAddress, userAddress) {
        return new MockEncryptedInput(contractAddress, userAddress);
    }

    // Check if this is a mock instance
    isMock() {
        return true;
    }
}

class MockEncryptedInput {
    constructor(contractAddress, userAddress) {
        this.contractAddress = contractAddress;
        this.userAddress = userAddress;
        this.values = [];
        this.handles = [];
    }

    add32(value) {
        const handle = `0x${value.toString(16).padStart(64, '0')}`;
        this.values.push(value);
        this.handles.push(handle);
        console.log(`📝 Mock add32(${value}) added to input`);
    }

    async encrypt() {
        // Generate mock proof
        const inputProof = '0x' + Array(128).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');
        
        console.log(`🔒 Mock encrypt() -> handles: ${this.handles.length}, proof: ${inputProof.slice(0, 20)}...`);
        
        return {
            handles: this.handles,
            inputProof: inputProof
        };
    }
}

// Enhanced FHEVM Utils with Mock Support
window.FhevmUtilsMock = {
    async createFhevmInstance(config) {
        const { provider, chainId, onStatusChange, trace } = config;

        if (onStatusChange) onStatusChange('sdk-loading');
        if (trace) trace('🔄 Loading Mock FHEVM SDK...');

        // Simulate loading time
        await new Promise(resolve => setTimeout(resolve, 1000));

        if (onStatusChange) onStatusChange('sdk-loaded');
        if (trace) trace('✅ Mock SDK loaded');

        if (onStatusChange) onStatusChange('sdk-initializing');
        if (trace) trace('🔧 Initializing Mock SDK...');

        await new Promise(resolve => setTimeout(resolve, 500));

        if (onStatusChange) onStatusChange('sdk-initialized');
        if (trace) trace('✅ Mock SDK initialized');

        if (onStatusChange) onStatusChange('creating');
        if (trace) trace('🏗️ Creating Mock FHEVM instance...');

        // Create mock instance
        const instance = new MockFHEVMInstance({
            provider,
            chainId: chainId || 11155111
        });

        if (trace) trace('✅ Mock FHEVM instance created successfully');

        return instance;
    },

    // Mock relayer SDK
    mockRelayerSDK: {
        __initialized__: false,
        
        async initSDK() {
            this.__initialized__ = true;
            console.log('🔧 Mock Relayer SDK initialized');
            return true;
        },

        SepoliaConfig: {
            chainId: 11155111,
            aclContractAddress: "0x2Fb4341027eb1d2aD8B5D9708187df8633cAFA92",
            inputVerifierAddress: "0x33a5B57658F8BBD25806b5983C1FD2d6A2D4Fe18", 
            kmsVerifierAddress: "0x9d6891A6240D6130c54ae243d8005063D05fE14b"
        },

        createInstance(config) {
            return new MockFHEVMInstance(config);
        }
    }
};

// Override the global FHEVM utils to use mock
if (!window.relayerSDK || !window.relayerSDK.__initialized__) {
    window.relayerSDK = window.FhevmUtilsMock.mockRelayerSDK;
}

// Enhanced FhevmUtils with fallback to mock
const originalCreateFhevmInstance = window.FhevmUtils?.createFhevmInstance;
if (window.FhevmUtils) {
    window.FhevmUtils.createFhevmInstance = async function(config) {
        try {
            // Try the original implementation first
            if (originalCreateFhevmInstance) {
                return await originalCreateFhevmInstance.call(this, config);
            }
        } catch (error) {
            console.warn('🔄 Original FHEVM failed, falling back to mock:', error.message);
            config.trace?.('⚠️ Falling back to Mock FHEVM implementation');
            
            // Fallback to mock implementation
            return await window.FhevmUtilsMock.createFhevmInstance(config);
        }
        
        // Use mock as default
        return await window.FhevmUtilsMock.createFhevmInstance(config);
    };
}

console.log('✅ FHEVM Mock implementation loaded');
console.log('🔧 Will fallback to mock if real FHEVM fails');