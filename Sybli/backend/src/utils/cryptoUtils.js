/**
 * Crypto Utilities
 * Advanced cryptographic helper functions for NeuroCredit
 */

const crypto = require('crypto');
const { promisify } = require('util');

class CryptoUtils {
    /**
     * Generate cryptographically secure random string
     */
    static generateRandomString(length = 32) {
        try {
            if (length < 1) throw new Error('Length must be positive');
            return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
        } catch (error) {
            throw new Error(`Random string generation failed: ${error.message}`);
        }
    }

    /**
     * Generate RSA key pair for asymmetric encryption
     */
    static generateKeyPair(modulusLength = 2048) {
        try {
            return crypto.generateKeyPairSync('rsa', {
                modulusLength: modulusLength,
                publicKeyEncoding: {
                    type: 'spki',
                    format: 'pem'
                },
                privateKeyEncoding: {
                    type: 'pkcs8',
                    format: 'pem',
                    cipher: 'aes-256-cbc',
                    passphrase: this.generateRandomString(32)
                }
            });
        } catch (error) {
            throw new Error(`Key pair generation failed: ${error.message}`);
        }
    }

    /**
     * Encrypt data using RSA public key
     */
    static encryptWithPublicKey(data, publicKey) {
        try {
            if (typeof data !== 'string') {
                data = JSON.stringify(data);
            }
            
            const buffer = Buffer.from(data, 'utf8');
            const encrypted = crypto.publicEncrypt(publicKey, buffer);
            return encrypted.toString('base64');
        } catch (error) {
            throw new Error(`Public key encryption failed: ${error.message}`);
        }
    }

    /**
     * Decrypt data using RSA private key
     */
    static decryptWithPrivateKey(encryptedData, privateKey, passphrase = '') {
        try {
            const buffer = Buffer.from(encryptedData, 'base64');
            const decrypted = crypto.privateDecrypt({
                key: privateKey,
                passphrase: passphrase
            }, buffer);
            return decrypted.toString('utf8');
        } catch (error) {
            throw new Error(`Private key decryption failed: ${error.message}`);
        }
    }

    /**
     * Create HMAC (Hash-based Message Authentication Code)
     */
    static createHMAC(data, secret, algorithm = 'sha256') {
        try {
            if (typeof data !== 'string') {
                data = JSON.stringify(data);
            }
            
            return crypto.createHmac(algorithm, secret)
                       .update(data)
                       .digest('hex');
        } catch (error) {
            throw new Error(`HMAC creation failed: ${error.message}`);
        }
    }

    /**
     * Verify HMAC signature
     */
    static verifyHMAC(data, hmac, secret, algorithm = 'sha256') {
        try {
            const calculatedHmac = this.createHMAC(data, secret, algorithm);
            return crypto.timingSafeEqual(
                Buffer.from(calculatedHmac, 'hex'),
                Buffer.from(hmac, 'hex')
            );
        } catch (error) {
            throw new Error(`HMAC verification failed: ${error.message}`);
        }
    }

    /**
     * AES-256-GCM encryption
     */
    static encryptAES(data, key, iv = null) {
        try {
            if (typeof data !== 'string') {
                data = JSON.stringify(data);
            }

            const encryptionKey = Buffer.from(key, 'hex');
            const initializationVector = iv ? Buffer.from(iv, 'hex') : crypto.randomBytes(16);
            
            const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey, initializationVector);
            
            let encrypted = cipher.update(data, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            
            const authTag = cipher.getAuthTag();
            
            return {
                iv: initializationVector.toString('hex'),
                data: encrypted,
                authTag: authTag.toString('hex'),
                algorithm: 'aes-256-gcm'
            };
        } catch (error) {
            throw new Error(`AES encryption failed: ${error.message}`);
        }
    }

    /**
     * AES-256-GCM decryption
     */
    static decryptAES(encryptedData, key) {
        try {
            const encryptionKey = Buffer.from(key, 'hex');
            const initializationVector = Buffer.from(encryptedData.iv, 'hex');
            const authTag = Buffer.from(encryptedData.authTag, 'hex');
            
            const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey, initializationVector);
            decipher.setAuthTag(authTag);
            
            let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            
            return decrypted;
        } catch (error) {
            throw new Error(`AES decryption failed: ${error.message}`);
        }
    }

    /**
     * Generate cryptographic salt for password hashing
     */
    static generateSalt(bytes = 16) {
        try {
            return crypto.randomBytes(bytes).toString('hex');
        } catch (error) {
            throw new Error(`Salt generation failed: ${error.message}`);
        }
    }

    /**
     * Derive key from password using PBKDF2
     */
    static async deriveKey(password, salt, iterations = 100000, keyLength = 32, algorithm = 'sha256') {
        try {
            const deriveKeyAsync = promisify(crypto.pbkdf2);
            return await deriveKeyAsync(password, salt, iterations, keyLength, algorithm);
        } catch (error) {
            throw new Error(`Key derivation failed: ${error.message}`);
        }
    }

    /**
     * Create digital signature using private key
     */
    static createSignature(data, privateKey, passphrase = '') {
        try {
            const sign = crypto.createSign('RSA-SHA256');
            sign.update(data);
            sign.end();
            
            return sign.sign({
                key: privateKey,
                passphrase: passphrase
            }, 'base64');
        } catch (error) {
            throw new Error(`Signature creation failed: ${error.message}`);
        }
    }

    /**
     * Verify digital signature using public key
     */
    static verifySignature(data, signature, publicKey) {
        try {
            const verify = crypto.createVerify('RSA-SHA256');
            verify.update(data);
            verify.end();
            
            return verify.verify(publicKey, signature, 'base64');
        } catch (error) {
            throw new Error(`Signature verification failed: ${error.message}`);
        }
    }

    /**
     * Generate ECDSA key pair for blockchain transactions
     */
    static generateECDSAKeyPair(curve = 'secp256k1') {
        try {
            return crypto.generateKeyPairSync('ec', {
                namedCurve: curve,
                publicKeyEncoding: {
                    type: 'spki',
                    format: 'pem'
                },
                privateKeyEncoding: {
                    type: 'pkcs8',
                    format: 'pem'
                }
            });
        } catch (error) {
            throw new Error(`ECDSA key pair generation failed: ${error.message}`);
        }
    }

    /**
     * Hash data with multiple algorithms
     */
    static hashData(data, algorithm = 'sha256') {
        try {
            if (typeof data !== 'string') {
                data = JSON.stringify(data);
            }
            
            const hash = crypto.createHash(algorithm);
            hash.update(data);
            return hash.digest('hex');
        } catch (error) {
            throw new Error(`Hashing failed: ${error.message}`);
        }
    }

    /**
     * Generate cryptographically secure UUID v4
     */
    static generateUUID() {
        try {
            return crypto.randomUUID();
        } catch (error) {
            // Fallback for older Node.js versions
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                const r = crypto.randomBytes(1)[0] % 16 | 0;
                const v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        }
    }

    /**
     * Create secure token for authentication
     */
    static generateSecureToken(length = 64) {
        try {
            return crypto.randomBytes(length).toString('base64url');
        } catch (error) {
            throw new Error(`Secure token generation failed: ${error.message}`);
        }
    }

    /**
     * Encrypt data with password using salt and IV
     */
    static async encryptWithPassword(data, password) {
        try {
            const salt = this.generateSalt(16);
            const iv = crypto.randomBytes(16);
            const key = await this.deriveKey(password, salt, 100000, 32);
            
            const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
            let encrypted = cipher.update(data, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            const authTag = cipher.getAuthTag();
            
            return {
                encrypted: encrypted,
                salt: salt,
                iv: iv.toString('hex'),
                authTag: authTag.toString('hex'),
                algorithm: 'aes-256-gcm-pbkdf2'
            };
        } catch (error) {
            throw new Error(`Password-based encryption failed: ${error.message}`);
        }
    }

    /**
     * Decrypt data with password
     */
    static async decryptWithPassword(encryptedData, password) {
        try {
            const key = await this.deriveKey(password, encryptedData.salt, 100000, 32);
            const iv = Buffer.from(encryptedData.iv, 'hex');
            const authTag = Buffer.from(encryptedData.authTag, 'hex');
            
            const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
            decipher.setAuthTag(authTag);
            
            let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            
            return decrypted;
        } catch (error) {
            throw new Error(`Password-based decryption failed: ${error.message}`);
        }
    }

    /**
     * Generate cryptographic nonce for authentication
     */
    static generateNonce(length = 32) {
        try {
            return crypto.randomBytes(length).toString('hex');
        } catch (error) {
            throw new Error(`Nonce generation failed: ${error.message}`);
        }
    }

    /**
     * Create checksum for data integrity verification
     */
    static createChecksum(data, algorithm = 'sha256') {
        try {
            return this.hashData(data, algorithm);
        } catch (error) {
            throw new Error(`Checksum creation failed: ${error.message}`);
        }
    }

    /**
     * Verify data integrity using checksum
     */
    static verifyChecksum(data, checksum, algorithm = 'sha256') {
        try {
            const calculatedChecksum = this.createChecksum(data, algorithm);
            return calculatedChecksum === checksum;
        } catch (error) {
            throw new Error(`Checksum verification failed: ${error.message}`);
        }
    }

    /**
     * Generate recovery codes for account recovery
     */
    static generateRecoveryCodes(count = 6, codeLength = 8) {
        try {
            const codes = [];
            for (let i = 0; i < count; i++) {
                const code = crypto.randomBytes(codeLength / 2).toString('hex').toUpperCase();
                codes.push(code);
            }
            return codes;
        } catch (error) {
            throw new Error(`Recovery code generation failed: ${error.message}`);
        }
    }

    /**
     * Create time-based one-time password (TOTP)
     */
    static generateTOTP(secret, timeStep = 30, digits = 6, algorithm = 'sha1') {
        try {
            const time = Math.floor(Date.now() / 1000 / timeStep);
            const timeBuffer = Buffer.alloc(8);
            for (let i = 7; i >= 0; i--) {
                timeBuffer[i] = time & 0xff;
                time = time >> 8;
            }
            
            const hmac = crypto.createHmac(algorithm, secret);
            hmac.update(timeBuffer);
            const hmacResult = hmac.digest();
            
            const offset = hmacResult[hmacResult.length - 1] & 0xf;
            const code = ((hmacResult[offset] & 0x7f) << 24) |
                        ((hmacResult[offset + 1] & 0xff) << 16) |
                        ((hmacResult[offset + 2] & 0xff) << 8) |
                        (hmacResult[offset + 3] & 0xff);
            
            return (code % Math.pow(10, digits)).toString().padStart(digits, '0');
        } catch (error) {
            throw new Error(`TOTP generation failed: ${error.message}`);
        }
    }

    /**
     * Verify time-based one-time password
     */
    static verifyTOTP(token, secret, timeStep = 30, digits = 6, window = 1) {
        try {
            for (let i = -window; i <= window; i++) {
                const adjustedTime = Math.floor(Date.now() / 1000 / timeStep) + i;
                const timeBuffer = Buffer.alloc(8);
                for (let j = 7; j >= 0; j--) {
                    timeBuffer[j] = adjustedTime & 0xff;
                    adjustedTime = adjustedTime >> 8;
                }
                
                const hmac = crypto.createHmac('sha1', secret);
                hmac.update(timeBuffer);
                const hmacResult = hmac.digest();
                
                const offset = hmacResult[hmacResult.length - 1] & 0xf;
                const code = ((hmacResult[offset] & 0x7f) << 24) |
                            ((hmacResult[offset + 1] & 0xff) << 16) |
                            ((hmacResult[offset + 2] & 0xff) << 8) |
                            (hmacResult[offset + 3] & 0xff);
                
                const expectedToken = (code % Math.pow(10, digits)).toString().padStart(digits, '0');
                
                if (crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expectedToken))) {
                    return true;
                }
            }
            return false;
        } catch (error) {
            throw new Error(`TOTP verification failed: ${error.message}`);
        }
    }

    /**
     * Generate cryptographic seed for deterministic key generation
     */
    static generateSeed(length = 64) {
        try {
            return crypto.randomBytes(length).toString('hex');
        } catch (error) {
            throw new Error(`Seed generation failed: ${error.message}`);
        }
    }

    /**
     * Create Merkle tree root hash from data array
     */
    static createMerkleRoot(dataArray, algorithm = 'sha256') {
        try {
            if (!Array.isArray(dataArray) || dataArray.length === 0) {
                throw new Error('Data array must not be empty');
            }

            let hashes = dataArray.map(item => this.hashData(item, algorithm));

            while (hashes.length > 1) {
                const newLevel = [];
                for (let i = 0; i < hashes.length; i += 2) {
                    if (i + 1 < hashes.length) {
                        const combined = hashes[i] + hashes[i + 1];
                        newLevel.push(this.hashData(combined, algorithm));
                    } else {
                        // Odd number of hashes, duplicate the last one
                        newLevel.push(hashes[i]);
                    }
                }
                hashes = newLevel;
            }

            return hashes[0];
        } catch (error) {
            throw new Error(`Merkle root creation failed: ${error.message}`);
        }
    }

    /**
     * Verify data against Merkle root and proof
     */
    static verifyMerkleProof(data, proof, root, algorithm = 'sha256') {
        try {
            let hash = this.hashData(data, algorithm);
            
            for (const [sibling, isLeft] of proof) {
                if (isLeft) {
                    hash = this.hashData(sibling + hash, algorithm);
                } else {
                    hash = this.hashData(hash + sibling, algorithm);
                }
            }
            
            return hash === root;
        } catch (error) {
            throw new Error(`Merkle proof verification failed: ${error.message}`);
        }
    }

    /**
     * Get supported cryptographic algorithms
     */
    static getSupportedAlgorithms() {
        return {
            hash: crypto.getHashes(),
            cipher: crypto.getCiphers(),
            hmac: crypto.getHashes(), // HMAC uses hash algorithms
            sign: ['RSA-SHA256', 'RSA-SHA384', 'RSA-SHA512', 'ECDSA']
        };
    }

    /**
     * Benchmark cryptographic operations
     */
    static async benchmarkOperation(operation, iterations = 1000) {
        try {
            const start = process.hrtime.bigint();
            
            for (let i = 0; i < iterations; i++) {
                await operation();
            }
            
            const end = process.hrtime.bigint();
            const duration = Number(end - start) / 1000000; // Convert to milliseconds
            
            return {
                iterations,
                totalTime: duration,
                averageTime: duration / iterations,
                operationsPerSecond: (iterations / duration) * 1000
            };
        } catch (error) {
            throw new Error(`Benchmark failed: ${error.message}`);
        }
    }
}

module.exports = CryptoUtils;