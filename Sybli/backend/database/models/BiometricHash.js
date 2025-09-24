// backend/database/models/BiometricHash.js
const mongoose = require('mongoose');
const biometricHashSchema = require('../schemas/BiometricHashSchema');

const BiometricHash = mongoose.model('BiometricHash', biometricHashSchema);

module.exports = BiometricHash;
