/**
 * Health Check Routes
 * Provides health check endpoints for monitoring and load balancers
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const os = require('os');
const logger = require('../utils/logger');

// Import services for health checks
const web3Service = require('../services/web3Service');
const emailService = require('../services/emailService');

/**
 * Basic health check
 * GET /health
 */
router.get('/', async (req, res) => {
    try {
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            version: process.env.npm_package_version || '1.0.0',
            environment: process.env.NODE_ENV || 'development'
        };

        res.status(200).json(health);
    } catch (error) {
        logger.error('Health check error:', error);
        res.status(500).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: 'Health check failed'
        });
    }
});

/**
 * Detailed health check
 * GET /health/detailed
 */
router.get('/detailed', async (req, res) => {
    try {
        const checks = {
            database: await checkDatabaseHealth(),
            web3: await checkWeb3Health(),
            email: await checkEmailHealth(),
            memory: checkMemoryHealth(),
            disk: checkDiskHealth()
        };

        const overallStatus = Object.values(checks).every(check => check.status === 'healthy')
            ? 'healthy'
            : 'unhealthy';

        const health = {
            status: overallStatus,
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            version: process.env.npm_package_version || '1.0.0',
            environment: process.env.NODE_ENV || 'development',
            checks: checks,
            system: {
                platform: os.platform(),
                arch: os.arch(),
                nodeVersion: process.version,
                pid: process.pid,
                memoryUsage: process.memoryUsage(),
                cpuUsage: process.cpuUsage()
            }
        };

        const statusCode = overallStatus === 'healthy' ? 200 : 503;
        res.status(statusCode).json(health);

    } catch (error) {
        logger.error('Detailed health check error:', error);
        res.status(500).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: 'Detailed health check failed',
            details: error.message
        });
    }
});

/**
 * Readiness check for Kubernetes/load balancers
 * GET /health/ready
 */
router.get('/ready', async (req, res) => {
    try {
        // Check critical dependencies
        const databaseHealthy = await checkDatabaseHealth();
        const web3Healthy = await checkWeb3Health();

        const isReady = databaseHealthy.status === 'healthy' && web3Healthy.status === 'healthy';

        const readiness = {
            status: isReady ? 'ready' : 'not ready',
            timestamp: new Date().toISOString(),
            checks: {
                database: databaseHealthy,
                web3: web3Healthy
            }
        };

        const statusCode = isReady ? 200 : 503;
        res.status(statusCode).json(readiness);

    } catch (error) {
        logger.error('Readiness check error:', error);
        res.status(503).json({
            status: 'not ready',
            timestamp: new Date().toISOString(),
            error: 'Readiness check failed'
        });
    }
});

/**
 * Liveness check for Kubernetes
 * GET /health/live
 */
router.get('/live', (req, res) => {
    // Simple liveness check - if the server is responding, it's alive
    res.status(200).json({
        status: 'alive',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

/**
 * Database health check
 */
async function checkDatabaseHealth() {
    try {
        const startTime = Date.now();

        // Simple query to check database connectivity
        await mongoose.connection.db.admin().ping();

        const responseTime = Date.now() - startTime;

        return {
            status: 'healthy',
            responseTime: `${responseTime}ms`,
            details: {
                name: mongoose.connection.name,
                host: mongoose.connection.host,
                port: mongoose.connection.port,
                readyState: mongoose.connection.readyState
            }
        };
    } catch (error) {
        return {
            status: 'unhealthy',
            error: error.message
        };
    }
}

/**
 * Web3 service health check
 */
async function checkWeb3Health() {
    try {
        const isConnected = await web3Service.isConnected();

        if (isConnected) {
            const networkId = await web3Service.getNetworkId();
            const networkName = web3Service.getNetworkName(networkId);

            return {
                status: 'healthy',
                details: {
                    network: networkName,
                    networkId: networkId,
                    account: web3Service.account ? web3Service.account.address : null
                }
            };
        } else {
            return {
                status: 'unhealthy',
                error: 'Web3 service not connected'
            };
        }
    } catch (error) {
        return {
            status: 'unhealthy',
            error: error.message
        };
    }
}

/**
 * Email service health check
 */
async function checkEmailHealth() {
    try {
        const status = await emailService.verifyConnection();

        return {
            status: status.success ? 'healthy' : 'warning',
            details: status.message,
            stats: emailService.getStats ? emailService.getStats() : null
        };
    } catch (error) {
        return {
            status: 'unhealthy',
            error: error.message
        };
    }
}

/**
 * Memory health check
 */
function checkMemoryHealth() {
    const memUsage = process.memoryUsage();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();

    // Check if memory usage is too high (>90% of system memory)
    const memoryUsagePercent = ((totalMemory - freeMemory) / totalMemory) * 100;
    const heapUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

    const isHealthy = memoryUsagePercent < 90 && heapUsagePercent < 90;

    return {
        status: isHealthy ? 'healthy' : 'warning',
        details: {
            systemMemoryUsage: `${memoryUsagePercent.toFixed(1)}%`,
            heapUsage: `${heapUsagePercent.toFixed(1)}%`,
            heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(1)} MB`,
            heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(1)} MB`,
            external: `${(memUsage.external / 1024 / 1024).toFixed(1)} MB`,
            rss: `${(memUsage.rss / 1024 / 1024).toFixed(1)} MB`
        }
    };
}

/**
 * Disk health check
 */
function checkDiskHealth() {
    try {
        // This is a basic check - in production you might want more sophisticated disk monitoring
        const diskUsage = require('diskusage');

        // Check current directory disk usage
        const { available, free, total } = diskusage.checkSync(process.cwd());
        const usedPercent = ((total - free) / total) * 100;

        const isHealthy = usedPercent < 90; // Warning if disk usage > 90%

        return {
            status: isHealthy ? 'healthy' : 'warning',
            details: {
                usedPercent: `${usedPercent.toFixed(1)}%`,
                available: `${(available / 1024 / 1024 / 1024).toFixed(1)} GB`,
                total: `${(total / 1024 / 1024 / 1024).toFixed(1)} GB`
            }
        };
    } catch (error) {
        // diskusage might not be available
        return {
            status: 'unknown',
            details: 'Disk usage check not available',
            error: error.message
        };
    }
}

module.exports = router;
