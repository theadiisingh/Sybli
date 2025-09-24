// backend/src/utils/healthcheck.js
const mongoose = require('mongoose');
const web3Service = require('../services/web3Service');
const emailService = require('../services/emailService');
const logger = require('./logger');

class HealthCheck {
    constructor() {
        this.checks = new Map();
        this.initializeChecks();
    }

    /**
     * Initialize all health checks
     */
    initializeChecks() {
        // Database connectivity check
        this.checks.set('database', {
            name: 'MongoDB Database',
            critical: true,
            check: this.checkDatabase.bind(this),
            timeout: 10000
        });

        // Blockchain connectivity check
        this.checks.set('blockchain', {
            name: 'Blockchain Network',
            critical: true,
            check: this.checkBlockchain.bind(this),
            timeout: 15000
        });

        // Email service check
        this.checks.set('email', {
            name: 'Email Service',
            critical: false,
            check: this.checkEmailService.bind(this),
            timeout: 10000
        });

        // Memory usage check
        this.checks.set('memory', {
            name: 'Memory Usage',
            critical: false,
            check: this.checkMemory.bind(this),
            timeout: 5000
        });

        // Disk space check
        this.checks.set('disk', {
            name: 'Disk Space',
            critical: false,
            check: this.checkDiskSpace.bind(this),
            timeout: 5000
        });

        // API responsiveness check
        this.checks.set('api', {
            name: 'API Responsiveness',
            critical: true,
            check: this.checkAPI.bind(this),
            timeout: 5000
        });

        // External services check
        this.checks.set('external', {
            name: 'External Services',
            critical: false,
            check: this.checkExternalServices.bind(this),
            timeout: 10000
        });
    }

    /**
     * Check MongoDB database connectivity
     */
    async checkDatabase() {
        try {
            const startTime = Date.now();
            
            // Check connection state
            const state = mongoose.connection.readyState;
            if (state !== 1) { // 1 = connected
                return {
                    status: 'error',
                    message: `Database connection state: ${this.getMongoStateName(state)}`,
                    details: {
                        state: state,
                        stateName: this.getMongoStateName(state),
                        connection: mongoose.connection.name || 'unknown'
                    }
                };
            }

            // Test with a simple query
            const result = await mongoose.connection.db.admin().ping();
            const responseTime = Date.now() - startTime;

            if (result.ok === 1) {
                return {
                    status: 'healthy',
                    message: 'Database connection is healthy',
                    details: {
                        responseTime: `${responseTime}ms`,
                        database: mongoose.connection.name,
                        host: mongoose.connection.host,
                        port: mongoose.connection.port
                    }
                };
            } else {
                return {
                    status: 'error',
                    message: 'Database ping failed',
                    details: {
                        responseTime: `${responseTime}ms`,
                        pingResult: result
                    }
                };
            }
        } catch (error) {
            return {
                status: 'error',
                message: 'Database check failed',
                error: error.message,
                details: {
                    connectionState: this.getMongoStateName(mongoose.connection.readyState)
                }
            };
        }
    }

    /**
     * Check blockchain connectivity
     */
    async checkBlockchain() {
        try {
            const startTime = Date.now();
            
            // Check if Web3 service is initialized
            if (!web3Service.initialized) {
                return {
                    status: 'error',
                    message: 'Web3 service not initialized'
                };
            }

            // Test connection
            const isConnected = await web3Service.isConnected();
            const networkId = await web3Service.getNetworkId();
            const blockNumber = await web3Service.web3.eth.getBlockNumber();
            const responseTime = Date.now() - startTime;

            if (isConnected) {
                return {
                    status: 'healthy',
                    message: 'Blockchain connection is healthy',
                    details: {
                        responseTime: `${responseTime}ms`,
                        networkId: networkId,
                        networkName: web3Service.getNetworkName(networkId),
                        latestBlock: blockNumber,
                        account: web3Service.account ? web3Service.account.address : 'No account configured'
                    }
                };
            } else {
                return {
                    status: 'error',
                    message: 'Cannot connect to blockchain network',
                    details: {
                        responseTime: `${responseTime}ms`,
                        networkId: networkId
                    }
                };
            }
        } catch (error) {
            return {
                status: 'error',
                message: 'Blockchain check failed',
                error: error.message,
                details: {
                    initialized: web3Service.initialized
                }
            };
        }
    }

    /**
     * Check email service
     */
    async checkEmailService() {
        try {
            const startTime = Date.now();
            const status = await emailService.verifyConnection();
            const responseTime = Date.now() - startTime;

            if (status.success) {
                return {
                    status: 'healthy',
                    message: 'Email service is healthy',
                    details: {
                        responseTime: `${responseTime}ms`,
                        service: emailService.getStats().service
                    }
                };
            } else {
                return {
                    status: 'degraded',
                    message: 'Email service has issues',
                    details: {
                        responseTime: `${responseTime}ms`,
                        error: status.message
                    }
                };
            }
        } catch (error) {
            return {
                status: 'degraded',
                message: 'Email service check failed',
                error: error.message
            };
        }
    }

    /**
     * Check memory usage
     */
    async checkMemory() {
        try {
            const memoryUsage = process.memoryUsage();
            const totalMemory = Math.round(memoryUsage.heapTotal / 1024 / 1024);
            const usedMemory = Math.round(memoryUsage.heapUsed / 1024 / 1024);
            const usagePercentage = ((usedMemory / totalMemory) * 100).toFixed(2);

            let status = 'healthy';
            if (usagePercentage > 90) status = 'error';
            else if (usagePercentage > 80) status = 'warning';

            return {
                status: status,
                message: `Memory usage: ${usagePercentage}%`,
                details: {
                    used: `${usedMemory} MB`,
                    total: `${totalMemory} MB`,
                    percentage: parseFloat(usagePercentage),
                    rss: Math.round(memoryUsage.rss / 1024 / 1024) + ' MB',
                    external: Math.round(memoryUsage.external / 1024 / 1024) + ' MB'
                }
            };
        } catch (error) {
            return {
                status: 'error',
                message: 'Memory check failed',
                error: error.message
            };
        }
    }

    /**
     * Check disk space (simplified for hackathon)
     */
    async checkDiskSpace() {
        try {
            // This is a simplified check - in production, use a proper disk space library
            const fs = require('fs');
            const path = require('path');
            
            // Check if we can write to the uploads directory
            const testDir = path.join(__dirname, '../../uploads');
            const testFile = path.join(testDir, 'healthcheck.test');
            
            // Create directory if it doesn't exist
            if (!fs.existsSync(testDir)) {
                fs.mkdirSync(testDir, { recursive: true });
            }
            
            // Test write permission
            fs.writeFileSync(testFile, 'healthcheck');
            fs.unlinkSync(testFile);
            
            return {
                status: 'healthy',
                message: 'Disk write permissions are OK',
                details: {
                    testDirectory: testDir,
                    writable: true
                }
            };
        } catch (error) {
            return {
                status: 'warning',
                message: 'Disk space check issues',
                error: error.message,
                details: {
                    writable: false
                }
            };
        }
    }

    /**
     * Check API responsiveness
     */
    async checkAPI() {
        try {
            const startTime = Date.now();
            
            // Simulate a simple internal API call
            // In a real scenario, this would make an actual HTTP request
            await new Promise(resolve => setTimeout(resolve, 10));
            
            const responseTime = Date.now() - startTime;
            
            let status = 'healthy';
            if (responseTime > 1000) status = 'warning';
            if (responseTime > 5000) status = 'error';

            return {
                status: status,
                message: `API responsiveness: ${responseTime}ms`,
                details: {
                    responseTime: responseTime,
                    uptime: Math.round(process.uptime()) + ' seconds',
                    nodeVersion: process.version,
                    platform: process.platform
                }
            };
        } catch (error) {
            return {
                status: 'error',
                message: 'API responsiveness check failed',
                error: error.message
            };
        }
    }

    /**
     * Check external services
     */
    async checkExternalServices() {
        try {
            const services = [
                { name: 'IPFS Gateway', url: 'https://ipfs.io', timeout: 5000 },
                { name: 'Etherscan', url: 'https://api.etherscan.io', timeout: 5000 },
                { name: 'Infura', url: 'https://mainnet.infura.io', timeout: 5000 }
            ];

            const results = await Promise.allSettled(
                services.map(service => this.checkExternalService(service))
            );

            const healthyServices = results.filter(r => r.status === 'fulfilled' && r.value.status === 'healthy').length;
            const totalServices = services.length;

            return {
                status: healthyServices === totalServices ? 'healthy' : 'degraded',
                message: `${healthyServices}/${totalServices} external services healthy`,
                details: {
                    services: results.map((result, index) => ({
                        name: services[index].name,
                        status: result.status === 'fulfilled' ? result.value.status : 'error',
                        responseTime: result.status === 'fulfilled' ? result.value.responseTime : 'timeout'
                    }))
                }
            };
        } catch (error) {
            return {
                status: 'degraded',
                message: 'External services check failed',
                error: error.message
            };
        }
    }

    /**
     * Check individual external service
     */
    async checkExternalService(service) {
        try {
            const https = require('https');
            const startTime = Date.now();

            const response = await new Promise((resolve, reject) => {
                const req = https.get(service.url, (res) => {
                    resolve(res.statusCode);
                });

                req.setTimeout(service.timeout, () => {
                    req.destroy();
                    reject(new Error('Timeout'));
                });

                req.on('error', reject);
            });

            const responseTime = Date.now() - startTime;

            return {
                status: response < 400 ? 'healthy' : 'degraded',
                responseTime: responseTime
            };
        } catch (error) {
            return {
                status: 'error',
                responseTime: null
            };
        }
    }

    /**
     * Get MongoDB connection state name
     */
    getMongoStateName(state) {
        const states = {
            0: 'disconnected',
            1: 'connected',
            2: 'connecting',
            3: 'disconnecting',
            99: 'uninitialized'
        };
        return states[state] || 'unknown';
    }

    /**
     * Run all health checks
     */
    async runAllChecks() {
        const results = {};
        const startTime = Date.now();

        // Run checks in parallel with timeouts
        const checkPromises = Array.from(this.checks.entries()).map(async ([key, check]) => {
            try {
                // Add timeout to each check
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error(`Check timeout after ${check.timeout}ms`)), check.timeout);
                });

                const checkPromise = check.check();
                const result = await Promise.race([checkPromise, timeoutPromise]);

                results[key] = {
                    ...result,
                    name: check.name,
                    critical: check.critical,
                    duration: Date.now() - startTime
                };
            } catch (error) {
                results[key] = {
                    status: 'error',
                    name: check.name,
                    critical: check.critical,
                    message: `Check failed: ${error.message}`,
                    error: error.message,
                    duration: Date.now() - startTime
                };
            }
        });

        await Promise.allSettled(checkPromises);

        // Calculate overall status
        const allResults = Object.values(results);
        const criticalChecks = allResults.filter(check => check.critical);
        const failedCritical = criticalChecks.filter(check => check.status !== 'healthy');
        
        let overallStatus = 'healthy';
        if (failedCritical.length > 0) {
            overallStatus = 'error';
        } else if (allResults.some(check => check.status === 'warning' || check.status === 'degraded')) {
            overallStatus = 'degraded';
        }

        return {
            status: overallStatus,
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            version: process.env.npm_package_version || '1.0.0',
            environment: process.env.NODE_ENV || 'development',
            checks: results,
            summary: {
                total: allResults.length,
                healthy: allResults.filter(c => c.status === 'healthy').length,
                warning: allResults.filter(c => c.status === 'warning').length,
                degraded: allResults.filter(c => c.status === 'degraded').length,
                error: allResults.filter(c => c.status === 'error').length
            }
        };
    }

    /**
     * Run readiness check (for Kubernetes/load balancers)
     */
    async runReadinessCheck() {
        const criticalChecks = ['database', 'blockchain', 'api'];
        const results = await this.runSpecificChecks(criticalChecks);

        const allHealthy = Object.values(results).every(check => check.status === 'healthy');
        
        return {
            ready: allHealthy,
            timestamp: new Date().toISOString(),
            checks: results
        };
    }

    /**
     * Run liveness check (for Kubernetes)
     */
    async runLivenessCheck() {
        // Liveness check is simpler - just check if the process is running
        return {
            alive: true,
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
        };
    }

    /**
     * Run specific checks only
     */
    async runSpecificChecks(checkKeys) {
        const results = {};
        
        for (const key of checkKeys) {
            const check = this.checks.get(key);
            if (check) {
                try {
                    results[key] = await check.check();
                    results[key].name = check.name;
                    results[key].critical = check.critical;
                } catch (error) {
                    results[key] = {
                        status: 'error',
                        name: check.name,
                        critical: check.critical,
                        message: `Check failed: ${error.message}`,
                        error: error.message
                    };
                }
            }
        }

        return results;
    }

    /**
     * Get health check statistics
     */
    getStats() {
        return {
            totalChecks: this.checks.size,
            criticalChecks: Array.from(this.checks.values()).filter(c => c.critical).length,
            checkNames: Array.from(this.checks.keys())
        };
    }
}

// Create singleton instance
const healthCheck = new HealthCheck();

module.exports = healthCheck;