/**
 * Validation Utilities
 * Comprehensive input validation and sanitization functions for NeuroCredit
 */

const { Web3 } = require('web3');
const { VALIDATION, BIOMETRIC, API_RESPONSES } = require('./constants');
const BIOMETRIC_TYPES = BIOMETRIC.TYPES;

class ValidationUtils {
    /**
     * Validate Ethereum address format and checksum
     */
    static validateEthAddress(address) {
        try {
            if (!address || typeof address !== 'string') {
                return false;
            }
            
            // Basic Ethereum address validation
            const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
            if (!ethAddressRegex.test(address)) {
                return false;
            }
            
            // Validate checksum if address is mixed case
            if (address !== address.toLowerCase() && address !== address.toUpperCase()) {
                return this.validateChecksumAddress(address);
            }
            
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Validate Ethereum address checksum
     */
    static validateChecksumAddress(address) {
        try {
            const web3 = new Web3();
            return web3.utils.checkAddressChecksum(address);
        } catch (error) {
            return false;
        }
    }

    /**
     * Validate EIP-191 signature format
     */
    static validateSignature(signature) {
        try {
            if (!signature || typeof signature !== 'string') {
                return false;
            }
            
            // Basic signature validation (EIP-191 format)
            const signatureRegex = /^0x[a-fA-F0-9]{130}$/;
            return signatureRegex.test(signature);
        } catch (error) {
            return false;
        }
    }

    /**
     * Validate biometric data structure and content
     */
    static validateBiometricData(data, patternType) {
        try {
            if (!data || typeof data !== 'object') {
                return false;
            }

            switch (patternType) {
                case BIOMETRIC_TYPES.FACIAL:
                    return this.validateFacialData(data);
                case BIOMETRIC_TYPES.BEHAVIORAL:
                    return this.validateBehavioralData(data);
                case BIOMETRIC_TYPES.VOICE:
                    return this.validateVoiceData(data);
                default:
                    return false;
            }
        } catch (error) {
            return false;
        }
    }

    /**
     * Validate facial recognition data
     */
    static validateFacialData(data) {
        try {
            const requiredFields = ['frames', 'resolution', 'data'];
            const hasRequiredFields = requiredFields.every(field => data[field] !== undefined);
            
            if (!hasRequiredFields) {
                return false;
            }

            // Validate data types
            if (typeof data.frames !== 'number' || data.frames < 1) {
                return false;
            }

            if (!['480p', '720p', '1080p', '4k'].includes(data.resolution)) {
                return false;
            }

            if (!Buffer.isBuffer(data.data) && typeof data.data !== 'string') {
                return false;
            }

            // Validate data size limits
            const maxSize = 10 * 1024 * 1024; // 10MB
            if (data.data.length > maxSize) {
                return false;
            }

            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Validate behavioral data structure
     */
    static validateBehavioralData(data) {
        try {
            const requiredFields = ['sessionDuration', 'interactionCount'];
            const hasRequiredFields = requiredFields.every(field => data[field] !== undefined);
            
            if (!hasRequiredFields) {
                return false;
            }

            // Validate numeric fields
            if (typeof data.sessionDuration !== 'number' || data.sessionDuration < 0) {
                return false;
            }

            if (typeof data.interactionCount !== 'number' || data.interactionCount < 0) {
                return false;
            }

            // Validate optional fields if present
            if (data.mouseMovements && !Array.isArray(data.mouseMovements)) {
                return false;
            }

            if (data.typingData && typeof data.typingData !== 'object') {
                return false;
            }

            if (data.deviceInfo && typeof data.deviceInfo !== 'object') {
                return false;
            }

            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Validate voice biometric data
     */
    static validateVoiceData(data) {
        try {
            const requiredFields = ['audioFormat', 'duration', 'sampleRate'];
            const hasRequiredFields = requiredFields.every(field => data[field] !== undefined);
            
            if (!hasRequiredFields) {
                return false;
            }

            // Validate audio format
            const validFormats = ['wav', 'mp3', 'ogg', 'webm'];
            if (!validFormats.includes(data.audioFormat)) {
                return false;
            }

            // Validate duration (in seconds)
            if (typeof data.duration !== 'number' || data.duration < 1 || data.duration > 60) {
                return false;
            }

            // Validate sample rate
            if (typeof data.sampleRate !== 'number' || data.sampleRate < 8000 || data.sampleRate > 48000) {
                return false;
            }

            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Validate authentication nonce format
     */
    static validateNonce(nonce) {
        try {
            return nonce && 
                   typeof nonce === 'string' && 
                   nonce.length >= 16 && 
                   nonce.startsWith('neurocredit_') &&
                   nonce.split('_').length >= 3; // Should have multiple parts
        } catch (error) {
            return false;
        }
    }

    /**
     * Validate JWT token structure
     */
    static validateJWT(token) {
        try {
            if (!token || typeof token !== 'string') {
                return false;
            }
            
            // Basic JWT structure validation (3 parts separated by dots)
            const parts = token.split('.');
            if (parts.length !== 3) {
                return false;
            }

            // Validate each part is base64url encoded
            const jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/;
            return jwtRegex.test(token);
        } catch (error) {
            return false;
        }
    }

    /**
     * Sanitize and validate user input
     */
    static sanitizeInput(input, options = {}) {
        try {
            if (input === null || input === undefined) {
                return input;
            }

            const defaults = {
                trim: true,
                removeScripts: true,
                maxLength: 1000,
                allowHtml: false,
                allowedTags: []
            };
            
            const config = { ...defaults, ...options };

            let sanitized = input;

            // Handle different input types
            if (typeof sanitized === 'string') {
                if (config.trim) {
                    sanitized = sanitized.trim();
                }

                if (config.removeScripts) {
                    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
                }

                if (!config.allowHtml) {
                    sanitized = sanitized.replace(/<[^>]*>/g, '');
                } else if (config.allowedTags.length > 0) {
                    // Only allow specific HTML tags
                    const allowedPattern = new RegExp(`</?(?!(${config.allowedTags.join('|')})\\b)[^>]+>`, 'gi');
                    sanitized = sanitized.replace(allowedPattern, '');
                }

                // Limit length
                if (sanitized.length > config.maxLength) {
                    sanitized = sanitized.substring(0, config.maxLength);
                }

                // Escape potentially dangerous characters
                sanitized = sanitized
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#x27;')
                    .replace(/\//g, '&#x2F;');

            } else if (typeof sanitized === 'object' && sanitized !== null) {
                // Recursively sanitize object properties
                if (Array.isArray(sanitized)) {
                    sanitized = sanitized.map(item => this.sanitizeInput(item, config));
                } else {
                    const sanitizedObj = {};
                    for (const key in sanitized) {
                        if (sanitized.hasOwnProperty(key)) {
                            sanitizedObj[key] = this.sanitizeInput(sanitized[key], config);
                        }
                    }
                    sanitized = sanitizedObj;
                }
            }

            return sanitized;
        } catch (error) {
            // Return original input if sanitization fails
            return input;
        }
    }

    /**
     * Validate email format and domain
     */
    static validateEmail(email, options = {}) {
        try {
            if (!email || typeof email !== 'string') {
                return false;
            }

            const defaults = {
                checkDomain: true,
                allowSubdomains: true,
                maxLength: VALIDATION.MAX_EMAIL_LENGTH
            };
            
            const config = { ...defaults, ...options };

            if (email.length > config.maxLength) {
                return false;
            }

            // Basic email regex
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return false;
            }

            if (config.checkDomain) {
                const domain = email.split('@')[1];
                if (!this.validateDomain(domain, config.allowSubdomains)) {
                    return false;
                }
            }

            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Validate domain name
     */
    static validateDomain(domain, allowSubdomains = true) {
        try {
            if (!domain || typeof domain !== 'string') {
                return false;
            }

            const domainRegex = allowSubdomains 
                ? /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/
                : /^[a-z0-9]+(-[a-z0-9]+)*\.[a-z]{2,}$/;

            return domainRegex.test(domain.toLowerCase());
        } catch (error) {
            return false;
        }
    }

    /**
     * Validate username format
     */
    static validateUsername(username, options = {}) {
        try {
            if (!username || typeof username !== 'string') {
                return false;
            }

            const defaults = {
                minLength: 3,
                maxLength: VALIDATION.MAX_USERNAME_LENGTH,
                allowSpecialChars: false
            };
            
            const config = { ...defaults, ...options };

            if (username.length < config.minLength || username.length > config.maxLength) {
                return false;
            }

            // Username regex based on configuration
            let usernameRegex;
            if (config.allowSpecialChars) {
                usernameRegex = /^[a-zA-Z0-9_\-\.]+$/;
            } else {
                usernameRegex = /^[a-zA-Z0-9_]+$/;
            }

            if (!usernameRegex.test(username)) {
                return false;
            }

            // Check for reserved usernames
            const reservedUsernames = ['admin', 'root', 'system', 'null', 'undefined'];
            if (reservedUsernames.includes(username.toLowerCase())) {
                return false;
            }

            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Validate password strength
     */
    static validatePassword(password, options = {}) {
        try {
            if (!password || typeof password !== 'string') {
                return { isValid: false, issues: ['Password is required'] };
            }

            const defaults = {
                minLength: VALIDATION.MIN_PASSWORD_LENGTH,
                requireUppercase: true,
                requireLowercase: true,
                requireNumbers: true,
                requireSymbols: true,
                maxLength: 128
            };
            
            const config = { ...defaults, ...options };

            const issues = [];

            // Length validation
            if (password.length < config.minLength) {
                issues.push(`Password must be at least ${config.minLength} characters long`);
            }

            if (password.length > config.maxLength) {
                issues.push(`Password must be less than ${config.maxLength} characters long`);
            }

            // Character type validation
            if (config.requireUppercase && !/(?=.*[A-Z])/.test(password)) {
                issues.push('Password must contain at least one uppercase letter');
            }

            if (config.requireLowercase && !/(?=.*[a-z])/.test(password)) {
                issues.push('Password must contain at least one lowercase letter');
            }

            if (config.requireNumbers && !/(?=.*\d)/.test(password)) {
                issues.push('Password must contain at least one number');
            }

            if (config.requireSymbols && !/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(password)) {
                issues.push('Password must contain at least one special character');
            }

            // Common password check
            const commonPasswords = [
                'password', '123456', 'qwerty', 'letmein', 'admin', 'welcome',
                'monkey', 'password1', '12345678', '123456789', '1234567890'
            ];
            
            if (commonPasswords.includes(password.toLowerCase())) {
                issues.push('Password is too common and easily guessable');
            }

            // Sequential character check
            if (/(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|012|123|234|345|456|567|678|789)/i.test(password)) {
                issues.push('Password contains sequential characters');
            }

            // Repeated character check
            if (/(.)\1{2,}/.test(password)) {
                issues.push('Password contains repeated characters');
            }

            // Calculate strength score
            const strengthScore = this.calculatePasswordStrength(password, config);

            return {
                isValid: issues.length === 0,
                issues,
                strengthScore,
                strengthLevel: this.getPasswordStrengthLevel(strengthScore)
            };
        } catch (error) {
            return { isValid: false, issues: ['Password validation failed'] };
        }
    }

    /**
     * Validate file upload
     */
    static validateFile(file, options = {}) {
        try {
            if (!file || typeof file !== 'object') {
                return false;
            }

            const defaults = {
                maxSize: 10 * 1024 * 1024, // 10MB
                allowedTypes: ['image/jpeg', 'image/png', 'image/gif'],
                allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif']
            };
            
            const config = { ...defaults, ...options };

            // Check file size
            if (file.size > config.maxSize) {
                return false;
            }

            // Check MIME type
            if (config.allowedTypes.length > 0 && !config.allowedTypes.includes(file.mimetype)) {
                return false;
            }

            // Check file extension
            if (config.allowedExtensions.length > 0) {
                const extension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
                if (!config.allowedExtensions.includes(extension)) {
                    return false;
                }
            }

            // Check for potentially dangerous files
            const dangerousExtensions = ['.exe', '.bat', '.cmd', '.sh', '.php', '.js'];
            const dangerousMimeTypes = ['application/x-msdownload', 'application/x-sh'];
            
            const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
            if (dangerousExtensions.includes(fileExtension) || dangerousMimeTypes.includes(file.mimetype)) {
                return false;
            }

            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Validate URL format and safety
     */
    static validateURL(url, options = {}) {
        try {
            if (!url || typeof url !== 'string') {
                return false;
            }

            const defaults = {
                requireProtocol: true,
                allowedProtocols: ['http:', 'https:'],
                allowLocalhost: false
            };
            
            const config = { ...defaults, ...options };

            let urlObj;
            try {
                urlObj = new URL(url);
            } catch (error) {
                return false;
            }

            // Protocol validation
            if (config.requireProtocol && !config.allowedProtocols.includes(urlObj.protocol)) {
                return false;
            }

            // Localhost validation
            if (!config.allowLocalhost && (urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1')) {
                return false;
            }

            // Check for potentially malicious patterns
            const maliciousPatterns = [
                /javascript:/i,
                /vbscript:/i,
                /data:/i,
                /file:/i
            ];

            for (const pattern of maliciousPatterns) {
                if (pattern.test(url)) {
                    return false;
                }
            }

            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Validate date range
     */
    static validateDateRange(startDate, endDate, options = {}) {
        try {
            const defaults = {
                maxRange: 365 * 24 * 60 * 60 * 1000, // 1 year in milliseconds
                allowFuture: false
            };
            
            const config = { ...defaults, ...options };

            const start = new Date(startDate);
            const end = new Date(endDate);

            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                return false;
            }

            if (start > end) {
                return false;
            }

            if (!config.allowFuture && end > new Date()) {
                return false;
            }

            if (end - start > config.maxRange) {
                return false;
            }

            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Calculate password strength score
     */
    static calculatePasswordStrength(password, config) {
        let score = 0;

        // Length score
        if (password.length >= 12) score += 2;
        else if (password.length >= 8) score += 1;

        // Character variety score
        if (/[a-z]/.test(password)) score += 1;
        if (/[A-Z]/.test(password)) score += 1;
        if (/\d/.test(password)) score += 1;
        if (/[^a-zA-Z0-9]/.test(password)) score += 1;

        // Bonus for mixed case and numbers
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
        if (/\d/.test(password) && /[^a-zA-Z0-9]/.test(password)) score += 1;

        return Math.min(score, 10);
    }

    /**
     * Get password strength level
     */
    static getPasswordStrengthLevel(score) {
        if (score >= 9) return 'very-strong';
        if (score >= 7) return 'strong';
        if (score >= 5) return 'good';
        if (score >= 3) return 'weak';
        return 'very-weak';
    }

    /**
     * Validate API request parameters
     */
    static validateApiParams(params, schema) {
        try {
            const errors = [];

            for (const [key, rules] of Object.entries(schema)) {
                const value = params[key];
                const isRequired = rules.required !== false;

                // Check required fields
                if (isRequired && (value === undefined || value === null || value === '')) {
                    errors.push(`${key} is required`);
                    continue;
                }

                // Skip optional fields that are not provided
                if (!isRequired && (value === undefined || value === null)) {
                    continue;
                }

                // Type validation
                if (rules.type && typeof value !== rules.type) {
                    errors.push(`${key} must be of type ${rules.type}`);
                    continue;
                }

                // Array validation
                if (rules.type === 'array' && !Array.isArray(value)) {
                    errors.push(`${key} must be an array`);
                    continue;
                }

                // Number range validation
                if (rules.type === 'number') {
                    if (rules.min !== undefined && value < rules.min) {
                        errors.push(`${key} must be at least ${rules.min}`);
                    }
                    if (rules.max !== undefined && value > rules.max) {
                        errors.push(`${key} must be at most ${rules.max}`);
                    }
                }

                // String length validation
                if (rules.type === 'string') {
                    if (rules.minLength !== undefined && value.length < rules.minLength) {
                        errors.push(`${key} must be at least ${rules.minLength} characters long`);
                    }
                    if (rules.maxLength !== undefined && value.length > rules.maxLength) {
                        errors.push(`${key} must be at most ${rules.maxLength} characters long`);
                    }
                    if (rules.pattern && !rules.pattern.test(value)) {
                        errors.push(`${key} does not match the required pattern`);
                    }
                    if (rules.enum && !rules.enum.includes(value)) {
                        errors.push(`${key} must be one of: ${rules.enum.join(', ')}`);
                    }
                }

                // Array content validation
                if (rules.type === 'array' && rules.items) {
                    for (const item of value) {
                        const itemErrors = this.validateApiParams({ item }, { item: rules.items });
                        if (itemErrors.length > 0) {
                            errors.push(`${key} contains invalid items`);
                            break;
                        }
                    }
                }

                // Custom validation function
                if (rules.validate && typeof rules.validate === 'function') {
                    const customError = rules.validate(value);
                    if (customError) {
                        errors.push(`${key}: ${customError}`);
                    }
                }
            }

            return {
                isValid: errors.length === 0,
                errors
            };
        } catch (error) {
            return {
                isValid: false,
                errors: ['Parameter validation failed']
            };
        }
    }
}

module.exports = ValidationUtils;