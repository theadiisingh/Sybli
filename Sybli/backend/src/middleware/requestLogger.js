/**
 * Request Logger Middleware
 */

const { logServerEvent } = require('../utils/logger');

const requestLogger = (req, res, next) => {
    const start = Date.now();
    
    // Skip logging for health checks
    if (req.path === '/health' || req.path === '/health/db') {
        return next();
    }

    res.on('finish', () => {
        const duration = Date.now() - start;
        
        logServerEvent('http_request', {
            method: req.method,
            url: req.originalUrl,
            status: res.statusCode,
            duration: `${duration}ms`,
            userAgent: req.get('User-Agent'),
            ip: req.ip,
            userId: req.user?.userId || 'anonymous'
        });
    });

    next();
};

module.exports = requestLogger;