// backend/database/schemas/NFTSchema.js
const mongoose = require('mongoose');

const nftSchema = new mongoose.Schema({
    // On-chain identifier
    tokenId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    
    // Contract information
    contract: {
        address: {
            type: String,
            required: true,
            match: /^0x[a-fA-F0-9]{40}$/,
            index: true
        },
        name: { type: String, default: 'HumanityRegistry' },
        symbol: { type: String, default: 'HUMAN' },
        chainId: { type: Number, default: 1337 }, // Local=1337, Mumbai=80001, etc.
        standard: { type: String, default: 'ERC-721' }
    },
    
    // Owner information
    owner: {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        walletAddress: {
            type: String,
            required: true,
            match: /^0x[a-fA-F0-9]{40}$/,
            index: true
        }
    },
    
    // Biometric verification link
    biometricVerification: {
        bioHash: {
            type: String,
            required: true,
            match: /^[a-fA-F0-9]{64}$/,
            index: true
        },
        verifiedAt: { type: Date, required: true },
        qualityScore: { type: Number, min: 0, max: 100 }
    },
    
    // NFT Metadata (on-chain and off-chain)
    metadata: {
        name: { type: String, default: 'Humanity Verification NFT' },
        description: { type: String, default: 'Proof of unique human identity using biometric verification' },
        image: { type: String, default: 'ipfs://Qm.../humanity-badge.png' },
        externalUrl: { type: String, default: '' },
        
        // Attributes for OpenSea compatibility
        attributes: [{
            trait_type: String,
            value: mongoose.Schema.Types.Mixed, // String, Number, or Boolean
            display_type: { type: String, enum: ['string', 'number', 'date', 'boost'], default: 'string' }
        }],
        
        // IPFS storage
        ipfsHash: String,
        ipfsUrl: String,
        
        // Animation/audio for future enhancements
        animation_url: String,
        youtube_url: String
    },
    
    // Minting information
    minting: {
        transactionHash: {
            type: String,
            required: true,
            match: /^0x[a-fA-F0-9]{64}$/,
            index: true
        },
        blockNumber: { type: Number, required: true },
        gasUsed: { type: Number, default: 0 },
        gasPrice: { type: String, default: '0' },
        mintedBy: { type: String, default: 'system' }, // Could be user wallet or system
        timestamp: { type: Date, required: true }
    },
    
    // NFT Properties
    properties: {
        isSoulbound: { type: Boolean, default: true },
        isTransferable: { type: Boolean, default: false },
        isBurnable: { type: Boolean, default: false },
        rarity: { type: String, enum: ['common', 'rare', 'epic', 'legendary'], default: 'common' },
        generation: { type: Number, default: 1 }
    },
    
    // Usage statistics
    usage: {
        timesVerified: { type: Number, default: 0 },
        lastVerified: { type: Date, default: null },
        daoVotes: { type: Number, default: 0 },
        proposalsCreated: { type: Number, default: 0 }
    },
    
    // Status
    status: {
        isActive: { type: Boolean, default: true },
        isBurned: { type: Boolean, default: false },
        burnedAt: { type: Date, default: null },
        burnReason: { type: String, default: null }
    },
    
    // Timestamps
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    lastActivity: { type: Date, default: Date.now }
}, {
    timestamps: true,
    toJSON: {
        transform: function(doc, ret) {
            // Format for API responses
            ret.metadata = {
                ...ret.metadata,
                image: ret.metadata.image || `https://api.neurocredit.io/api/nft/${ret.tokenId}/image`
            };
            return ret;
        }
    }
});

// Indexes for performance
nftSchema.index({ 'contract.address': 1, tokenId: 1 });
nftSchema.index({ 'owner.walletAddress': 1 });
nftSchema.index({ 'biometricVerification.bioHash': 1 });
nftSchema.index({ 'minting.timestamp': -1 });
nftSchema.index({ 'usage.daoVotes': -1 });
nftSchema.index({ 'properties.rarity': 1 });

// Pre-save middleware
nftSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    
    // Set lastActivity if usage stats change
    if (this.isModified('usage.timesVerified') || this.isModified('usage.daoVotes')) {
        this.lastActivity = new Date();
    }
    
    next();
});

// Virtual for OpenSea URL
nftSchema.virtual('openseaUrl').get(function() {
    const baseUrl = this.contract.chainId === 80001 ? 
        'https://testnets.opensea.io/assets/mumbai' : 
        'https://opensea.io/assets';
    return `${baseUrl}/${this.contract.address}/${this.tokenId}`;
});

// Virtual for Etherscan URL
nftSchema.virtual('etherscanUrl').get(function() {
    const baseUrl = this.contract.chainId === 80001 ? 
        'https://mumbai.polygonscan.com/tx' : 
        'https://etherscan.io/tx';
    return `${baseUrl}/${this.minting.transactionHash}`;
});

// Method to increment verification count
nftSchema.methods.incrementVerification = function() {
    this.usage.timesVerified += 1;
    this.usage.lastVerified = new Date();
    return this.save();
};

// Method to increment DAO votes
nftSchema.methods.incrementDAOVotes = function() {
    this.usage.daoVotes += 1;
    this.lastActivity = new Date();
    return this.save();
};

// Method to mark as burned
nftSchema.methods.markBurned = function(reason) {
    this.status.isActive = false;
    this.status.isBurned = true;
    this.status.burnedAt = new Date();
    this.status.burnReason = reason;
    return this.save();
};

// Static method to find by owner
nftSchema.statics.findByOwner = function(walletAddress) {
    return this.find({ 'owner.walletAddress': walletAddress.toLowerCase() });
};

// Static method to find by contract
nftSchema.statics.findByContract = function(contractAddress) {
    return this.find({ 'contract.address': contractAddress.toLowerCase() });
};

// Static method to get minting statistics
nftSchema.statics.getMintingStats = function(timeRange = 'all') {
    const now = new Date();
    let startDate;
    
    switch (timeRange) {
        case 'day':
            startDate = new Date(now.setDate(now.getDate() - 1));
            break;
        case 'week':
            startDate = new Date(now.setDate(now.getDate() - 7));
            break;
        case 'month':
            startDate = new Date(now.setMonth(now.getMonth() - 1));
            break;
        default:
            startDate = new Date(0); // Beginning of time
    }
    
    return this.aggregate([
        { $match: { 'minting.timestamp': { $gte: startDate } } },
        {
            $group: {
                _id: null,
                totalMinted: { $sum: 1 },
                uniqueOwners: { $addToSet: '$owner.walletAddress' },
                averageGas: { $avg: '$minting.gasUsed' }
            }
        }
    ]);
};

module.exports = nftSchema;