const mongoose = require('mongoose');
const { NFTSchema } = require('../schemas');

const HumanityNFT = mongoose.model('HumanityNFT', NFTSchema);

module.exports = HumanityNFT;
