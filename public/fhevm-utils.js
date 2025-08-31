// FHEVM Utilities - Based on Zama's official template
// Uses official Zama CDN: https://cdn.zama.ai/relayer-sdk-js/0.1.2/relayer-sdk-js.umd.cjs

class FhevmReactError extends Error {
    constructor(code, message, options) {
        super(message, options);
        this.code = code;
        this.name = "FhevmReactError";
    }
}

class FhevmAbortError extends Error {
    constructor(message = "FHEVM operation was cancelled") {
        super(message);
        this.name = "FhevmAbortError";
    }
}

// Constants - Official Zama CDN
const SDK_CDN_URL = "https://cdn.zama.ai/relayer-sdk-js/0.1.2/relayer-sdk-js.umd.cjs";

// Network configurations with Sepolia support
const NETWORK_CONFIGS = {
    sepolia: {
        chainId: 11155111,
        name: "Sepolia Testnet",
        rpcUrl: "https://ethereum-sepolia-rpc.publicnode.com"
    },
    local: {
        chainId: 31337,
        name: "Local Hardhat",
        rpcUrl: "http://localhost:8545"
    }
};

// PublicKey Storage System using IndexedDB
class PublicKeyStorage {
    constructor() {
        this.dbName = 'FhevmPublicKeyDB';
        this.version = 1;
        this.storeName = 'publicKeys';
    }

    async openDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const store = db.createObjectStore(this.storeName, { keyPath: 'address' });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
        });
    }

    async get(address) {
        const db = await this.openDB();
        const transaction = db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        
        return new Promise((resolve, reject) => {
            const request = store.get(address);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                if (request.result) {
                    resolve({
                        publicKey: request.result.publicKey,
                        publicParams: request.result.publicParams
                    });
                } else {
                    // Return default empty values if not found
                    resolve({
                        publicKey: "",
                        publicParams: ""
                    });
                }
            };
        });
    }

    async set(address, publicKey, publicParams) {
        const db = await this.openDB();
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        
        const data = {
            address,
            publicKey,
            publicParams,
            timestamp: Date.now()
        };
        
        return new Promise((resolve, reject) => {
            const request = store.put(data);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    }

    async clear() {
        const db = await this.openDB();
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        
        return new Promise((resolve, reject) => {
            const request = store.clear();
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    }

    async list() {
        const db = await this.openDB();
        const transaction = db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }
}

// Global storage instance
const publicKeyStorage = new PublicKeyStorage();

// SDK Verification System
class RelayerSDKLoader {
    constructor(options = {}) {
        this.trace = options.trace || console.log;
    }

    isLoaded() {
        if (typeof window === "undefined") {
            throw new Error("RelayerSDKLoader: can only be used in the browser.");
        }
        return this.isFhevmWindowType(window);
    }

    async load() {
        console.log("[RelayerSDKLoader] load...");
        
        if (typeof window === "undefined") {
            console.log("[RelayerSDKLoader] window === undefined");
            return Promise.reject(
                new Error("RelayerSDKLoader: can only be used in the browser.")
            );
        }

        if ("relayerSDK" in window) {
            if (!this.isValidRelayerSDK(window.relayerSDK)) {
                console.log("[RelayerSDKLoader] window.relayerSDK === undefined");
                throw new Error("RelayerSDKLoader: Unable to load FHEVM Relayer SDK");
            }
            return Promise.resolve();
        }

        return new Promise((resolve, reject) => {
            const existingScript = document.querySelector(`script[src="${SDK_CDN_URL}"]`);
            if (existingScript) {
                if (!this.isFhevmWindowType(window)) {
                    reject(new Error("RelayerSDKLoader: window object does not contain a valid relayerSDK object."));
                }
                resolve();
                return;
            }

            const script = document.createElement("script");
            script.src = SDK_CDN_URL;
            script.type = "text/javascript";
            script.async = true;

            script.onload = () => {
                if (!this.isFhevmWindowType(window)) {
                    console.log("[RelayerSDKLoader] script onload FAILED...");
                    reject(new Error(`RelayerSDKLoader: Relayer SDK script has been successfully loaded from ${SDK_CDN_URL}, however, the window.relayerSDK object is invalid.`));
                }
                resolve();
            };

            script.onerror = () => {
                console.log("[RelayerSDKLoader] script onerror... ");
                reject(new Error(`RelayerSDKLoader: Failed to load Relayer SDK from ${SDK_CDN_URL}`));
            };

            console.log("[RelayerSDKLoader] add script to DOM...");
            document.head.appendChild(script);
            console.log("[RelayerSDKLoader] script added!");
        });
    }

    // Complete SDK verification system
    isValidRelayerSDK(obj) {
        if (typeof obj === "undefined") {
            this.trace("RelayerSDKLoader: relayerSDK is undefined");
            return false;
        }
        if (obj === null) {
            this.trace("RelayerSDKLoader: relayerSDK is null");
            return false;
        }
        if (typeof obj !== "object") {
            this.trace("RelayerSDKLoader: relayerSDK is not an object");
            return false;
        }
        
        // Check required properties and methods
        if (!this.hasProperty(obj, "initSDK", "function")) {
            this.trace("RelayerSDKLoader: relayerSDK.initSDK is invalid");
            return false;
        }
        if (!this.hasProperty(obj, "createInstance", "function")) {
            this.trace("RelayerSDKLoader: relayerSDK.createInstance is invalid");
            return false;
        }
        if (!this.hasProperty(obj, "SepoliaConfig", "object")) {
            this.trace("RelayerSDKLoader: relayerSDK.SepoliaConfig is invalid");
            return false;
        }
        
        if ("__initialized__" in obj) {
            if (obj.__initialized__ !== true && obj.__initialized__ !== false) {
                this.trace("RelayerSDKLoader: relayerSDK.__initialized__ is invalid");
                return false;
            }
        }
        
        return true;
    }

    isFhevmWindowType(win) {
        if (typeof win === "undefined") {
            this.trace("RelayerSDKLoader: window object is undefined");
            return false;
        }
        if (win === null) {
            this.trace("RelayerSDKLoader: window object is null");
            return false;
        }
        if (typeof win !== "object") {
            this.trace("RelayerSDKLoader: window is not an object");
            return false;
        }
        if (!("relayerSDK" in win)) {
            this.trace("RelayerSDKLoader: window does not contain 'relayerSDK' property");
            return false;
        }
        return this.isValidRelayerSDK(win.relayerSDK);
    }

    // Enhanced property checking with detailed error logging
    hasProperty(obj, propertyName, propertyType) {
        if (!obj || typeof obj !== "object") {
            return false;
        }

        if (!(propertyName in obj)) {
            this.trace(`RelayerSDKLoader: missing ${propertyName}.`);
            return false;
        }

        const value = obj[propertyName];

        if (value === null || value === undefined) {
            this.trace(`RelayerSDKLoader: ${propertyName} is null or undefined.`);
            return false;
        }

        if (typeof value !== propertyType) {
            this.trace(`RelayerSDKLoader: ${propertyName} is not a ${propertyType}.`);
            return false;
        }

        return true;
    }
}

// Enhanced FHEVM Instance Creator with full configuration support
async function createFhevmInstance(parameters) {
    const {
        provider: providerOrUrl,
        mockChains = {},
        signal,
        onStatusChange = () => {},
    } = parameters;

    const throwIfAborted = () => {
        if (signal.aborted) throw new FhevmAbortError();
    };

    const notify = (status) => {
        onStatusChange(status);
    };

    // Resolve network configuration
    const chainId = await getChainId(providerOrUrl);
    let rpcUrl = typeof providerOrUrl === "string" ? providerOrUrl : undefined;

    const _mockChains = {
        31337: "http://localhost:8545",
        ...mockChains,
    };

    const isMock = Object.hasOwnProperty.call(_mockChains, chainId);
    if (isMock && !rpcUrl) {
        rpcUrl = _mockChains[chainId];
    }

    if (isMock) {
        // Handle mock/local network
        const fhevmRelayerMetadata = await tryFetchFHEVMHardhatNodeRelayerMetadata(rpcUrl);
        
        if (fhevmRelayerMetadata) {
            notify("creating");
            // For simplicity, we'll skip mock implementation in this demo
            // In production, you would use the mock utilities here
            console.log("Mock FHEVM instance would be created here");
            throwIfAborted();
            return createMockInstance(rpcUrl, chainId, fhevmRelayerMetadata);
        }
    }

    throwIfAborted();

    const loader = new RelayerSDKLoader({ trace: console.log });
    
    if (!loader.isLoaded()) {
        notify("sdk-loading");
        await loader.load();
        throwIfAborted();
        notify("sdk-loaded");
    }

    if (!isFhevmInitialized()) {
        notify("sdk-initializing");
        await fhevmInitSDK();
        throwIfAborted();
        notify("sdk-initialized");
    }

    const relayerSDK = window.relayerSDK;

    // Get ACL address from Sepolia config
    const aclAddress = relayerSDK.SepoliaConfig.aclContractAddress;
    if (!isValidAddress(aclAddress)) {
        throw new Error(`Invalid address: ${aclAddress}`);
    }

    // Get public key from cache
    const pub = await publicKeyStorage.get(aclAddress);
    throwIfAborted();

    // Create configuration with direct provider passing
    const config = {
        ...relayerSDK.SepoliaConfig,
        network: providerOrUrl, // Direct provider/URL passing
        publicKey: pub.publicKey,
        publicParams: pub.publicParams,
    };

    notify("creating");

    const instance = await relayerSDK.createInstance(config);

    // Save the key to cache
    await publicKeyStorage.set(
        aclAddress,
        instance.getPublicKey(),
        instance.getPublicParams(2048)
    );

    throwIfAborted();

    return instance;
}

// Helper functions
function isFhevmInitialized() {
    if (typeof window === "undefined" || !window.relayerSDK) {
        return false;
    }
    return window.relayerSDK.__initialized__ === true;
}

async function fhevmInitSDK(options) {
    if (typeof window === "undefined" || !window.relayerSDK) {
        throw new Error("window.relayerSDK is not available");
    }
    const result = await window.relayerSDK.initSDK(options);
    window.relayerSDK.__initialized__ = result;
    if (!result) {
        throw new Error("window.relayerSDK.initSDK failed.");
    }
    return true;
}

async function getChainId(providerOrUrl) {
    if (typeof providerOrUrl === "string") {
        // For RPC URL, we'll assume Sepolia for demo purposes
        return 11155111; // Sepolia
    }
    
    // For providers
    if (providerOrUrl && typeof providerOrUrl.request === "function") {
        const chainId = await providerOrUrl.request({ method: "eth_chainId" });
        return parseInt(chainId, 16);
    }
    
    throw new Error("Invalid provider or URL");
}

function isValidAddress(address) {
    if (typeof address !== "string") return false;
    return /^0x[a-fA-F0-9]{40}$/.test(address);
}

async function tryFetchFHEVMHardhatNodeRelayerMetadata(rpcUrl) {
    try {
        const response = await fetch(rpcUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'fhevm_relayer_metadata',
                params: [],
                id: 1
            })
        });
        
        const data = await response.json();
        if (data.result) {
            return data.result;
        }
        return undefined;
    } catch {
        return undefined;
    }
}

function createMockInstance(rpcUrl, chainId, metadata) {
    // Simplified mock instance for demo
    return {
        encrypt8: (value) => `encrypted_${value}`,
        encrypt16: (value) => `encrypted_${value}`,
        encrypt32: (value) => `encrypted_${value}`,
        encrypt64: (value) => `encrypted_${value}`,
        getPublicKey: () => "mock_public_key",
        getPublicParams: () => "mock_public_params",
        chainId,
        metadata
    };
}

// Global FHEVM instance
let fhevmInstance = null;
let currentProvider = null;

// Export for global use
window.FhevmUtils = {
    createFhevmInstance,
    RelayerSDKLoader,
    publicKeyStorage,
    FhevmReactError,
    FhevmAbortError,
    NETWORK_CONFIGS,
    SDK_CDN_URL
};

console.log("✅ FHEVM Utils loaded successfully");