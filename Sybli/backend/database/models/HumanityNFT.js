// backend/database/models/HumanityNFT.js
const mongoose = require('mongoose');
const nftSchema = require('../schemas/NFTSchema');

const HumanityNFT = mongoose.model('HumanityNFT', nftSchema);

module.exports = HumanityNFT;
