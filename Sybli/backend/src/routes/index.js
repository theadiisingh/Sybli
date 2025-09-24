/**
 * Route Index
 * Central export point for all routes
 */

const express = require('express');
const authRoutes = require('./authRoutes');
const biometricRoutes = require('./biometricRoutes');
const nftRoutes = require('./nftRoutes');
const daoRoutes = require('./daoRoutes');
const userRoutes = require('./userRoutes');

const router = express.Router();

// Mount all routes
router.use('/auth', authRoutes);
router.use('/biometric', biometricRoutes);
router.use('/nft', nftRoutes);
router.use('/dao', daoRoutes);
router.use('/user', userRoutes);

module.exports = router;
