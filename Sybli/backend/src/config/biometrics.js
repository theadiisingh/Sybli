// backend/src/config/biometrics.js
const path = require('path');

module.exports = {
    // Biometric capture settings
    capture: {
        duration: 15000, // 15 seconds in milliseconds
        frameInterval: 100, // Capture frame every 100ms
        minFrames: 30, // Minimum frames required for analysis
        maxFrames: 150, // Maximum frames to process
        resolution: {
            width: 640,
            height: 480
        }
    },

    // Pattern detection thresholds
    thresholds: {
        // Facial micro-expression detection
        facial: {
            minMovement: 0.1, // Minimum movement threshold (0-1)
            maxMovement: 0.9, // Maximum movement threshold
            confidence: 0.7, // Minimum confidence for detection
            stability: 0.8 // Required stability score
        },

        // Blink pattern analysis
        blink: {
            minBlinks: 3, // Minimum blinks required
            maxBlinks: 20, // Maximum blinks expected
            durationRange: [100, 400], // Blink duration in ms
            frequencyRange: [2000, 10000] // Time between blinks in ms
        },

        // Head movement analysis
        headMovement: {
            minAngle: 2, // Minimum degrees of movement
            maxAngle: 15, // Maximum degrees expected
            smoothness: 0.6 // Movement smoothness threshold
        },

        // Mouse movement biometrics
        mouse: {
            minMovements: 10,
            patternComplexity: 0.5,
            timingVariability: 0.3
        }
    },

    // Quality scoring
    quality: {
        weights: {
            facial: 0.4,
            blink: 0.3,
            headMovement: 0.2,
            mouse: 0.1
        },
        minimumScore: 70, // Minimum quality score to accept
        excellentScore: 90 // Score considered excellent
    },

    // Hash generation
    hashing: {
        algorithm: 'sha256',
        saltRounds: 12,
        minEntropy: 0.8 // Minimum entropy for generated hash
    },

    // Privacy and security
    privacy: {
        dataRetention: {
            rawVideo: 0, // Delete immediately after processing
            processedData: 24 * 60 * 60 * 1000, // 24 hours
            hashes: 'permanent' // Keep hashes forever
        },
        anonymization: {
            removeMetadata: true,
            blurBackground: false,
            encryptLocal: true
        }
    },

    // Machine learning models (for future enhancement)
    models: {
        facialLandmarks: {
            url: 'https://tfhub.dev/mediapipe/tfjs-model/face_landmarks/1/default/1',
            inputSize: [192, 192],
            outputSize: 468
        },
        emotionDetection: {
            url: 'https://tfhub.dev/tensorflow/tfjs-model/blazeface/1/default/1',
            enabled: false // Not used in MVP
        }
    },

    // Performance optimization
    performance: {
        maxConcurrentProcesses: 2,
        timeout: 30000, // 30 seconds max processing time
        cacheSize: 100 // Number of patterns to cache
    },

    // Development and testing
    development: {
        mockData: process.env.NODE_ENV === 'development',
        saveFrames: false, // Save frames for debugging
        logLevel: 'verbose', // error, warn, info, verbose, debug
        simulateProcessing: false // Simulate processing for testing
    },

    // Error handling
    errors: {
        maxRetries: 3,
        retryDelay: 1000,
        fallbackToMock: process.env.NODE_ENV === 'development'
    }
};