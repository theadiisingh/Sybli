/**
 * Logger Utility
 * Structured logging for different application components
 */

const { LOGGING } = require('./constants');

class Logger {
    static logAuthActivity(walletAddress, action, metadata = {}) {
        console.log(JSON.stringify({
            timestamp: new Date().toISOString(),
            level: LOGGING.LEVELS.INFO,
            category: LOGGING.CATEGORIES.AUTH,
            walletAddress,
            action,
            ...metadata
        }));
    }

    static logBiometricActivity(walletAddress, action, metadata = {}) {
        console.log(JSON.stringify({
            timestamp: new Date().toISOString(),
            level: LOGGING.LEVELS.INFO,
            category: LOGGING.CATEGORIES.BIOMETRIC,
            walletAddress,
            action,
            ...metadata
        }));
    }

    static logSecurityEvent(walletAddress, event, metadata = {}) {
        console.warn(JSON.stringify({
            timestamp: new Date().toISOString(),
            level: LOGGING.LEVELS.WARN,
            category: LOGGING.CATEGORIES.AUTH,
            walletAddress,
            event: `SECURITY_${event}`,
            ...metadata
        }));
    }

    static error(component, error, metadata = {}) {
        console.error(JSON.stringify({
            timestamp: new Date().toISOString(),
            level: LOGGING.LEVELS.ERROR,
            category: component,
            error: error.message,
            stack: error.stack,
            ...metadata
        }));
    }

    static info(message, metadata = {}) {
        console.log(JSON.stringify({
            timestamp: new Date().toISOString(),
            level: LOGGING.LEVELS.INFO,
            message,
            ...metadata
        }));
    }

    static debug(message, metadata = {}) {
        if (process.env.NODE_ENV === 'development') {
            console.debug(JSON.stringify({
                timestamp: new Date().toISOString(),
                level: LOGGING.LEVELS.DEBUG,
                message,
                ...metadata
            }));
        }
    }
}

module.exports = Logger;