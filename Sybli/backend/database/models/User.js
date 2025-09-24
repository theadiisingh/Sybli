/**
 * User Model
 * Represents users in the system with wallet-based authentication
 */

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  wallet_address: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    minlength: 42,
    maxlength: 42
  },
  email: {
    type: String,
    lowercase: true,
    trim: true
  },
  username: {
    type: String,
    required: true,
    unique: true,
    minlength: 3,
    maxlength: 50,
    trim: true
  },
  display_name: {
    type: String,
    maxlength: 100,
    trim: true
  },
  bio: {
    type: String,
    maxlength: 500
  },
  profile_picture_url: {
    type: String
  },
  cover_photo_url: {
    type: String
  },
  social_links: {
    type: Object,
    default: {}
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  is_verified: {
    type: Boolean,
    default: false
  },
  email_verified: {
    type: Boolean,
    default: false
  },
  isBiometricVerified: {
    type: Boolean,
    default: false
  },
  hasHumanityNFT: {
    type: Boolean,
    default: false
  },
  nftTokenId: {
    type: String
  },
  nftMintedAt: {
    type: Date
  },
  verificationCount: {
    type: Number,
    default: 0
  },
  lastVerification: {
    type: Date
  },
  preferences: {
    type: Object,
    default: {}
  },
  last_login_at: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  deactivatedAt: {
    type: Date
  }
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

// Indexes
userSchema.index({ wallet_address: 1 });
userSchema.index({ username: 1 });
userSchema.index({ email: 1 });
userSchema.index({ isBiometricVerified: 1 });
userSchema.index({ hasHumanityNFT: 1 });
userSchema.index({ status: 1 });

// Virtual fields
userSchema.virtual('isEligibleForGovernance').get(function() {
  return this.status === 'active' && this.is_verified;
});

userSchema.virtual('profileComplete').get(function() {
  return !!(this.username && this.display_name && this.profile_picture_url);
});

// Instance methods
userSchema.methods.verifyBiometricOwnership = async function() {
  const BiometricHash = mongoose.model('BiometricHash');
  const biometricHashes = await BiometricHash.find({ user_id: this._id });
  return biometricHashes.length > 0;
};

userSchema.methods.getActiveProposals = async function() {
  const DAOProposal = mongoose.model('DAOProposal');
  return await DAOProposal.find({
    proposer_id: this._id,
    status: 'active'
  });
};

userSchema.methods.getVotingPower = async function(daoId = null) {
  // This would calculate voting power based on NFTs, tokens, etc.
  // Simplified implementation
  const HumanityNFT = mongoose.model('HumanityNFT');
  const nfts = await HumanityNFT.find({
    user_id: this._id,
    is_active: true
  });
  return nfts.length; // Each NFT gives 1 voting power for simplicity
};

// Static methods
userSchema.statics.findByWalletAddress = function(walletAddress) {
  return this.findOne({ wallet_address: walletAddress.toLowerCase() });
};

userSchema.statics.createUser = async function(userData) {
  const existingUser = await this.findByWalletAddress(userData.wallet_address);
  if (existingUser) {
    throw new Error('User with this wallet address already exists');
  }

  const user = new this({
    ...userData,
    wallet_address: userData.wallet_address.toLowerCase()
  });

  return await user.save();
};

userSchema.statics.updateLastLogin = function(userId) {
  return this.findByIdAndUpdate(userId, {
    last_login_at: new Date()
  }, { new: true });
};

userSchema.statics.getUsersWithBiometrics = function() {
  return this.find({ isBiometricVerified: true });
};

// Pre-save middleware
userSchema.pre('save', function(next) {
  if (this.isModified('wallet_address')) {
    this.wallet_address = this.wallet_address.toLowerCase();
  }
  next();
});

// Remove sensitive data when converting to JSON
userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.__v;
  return userObject;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
