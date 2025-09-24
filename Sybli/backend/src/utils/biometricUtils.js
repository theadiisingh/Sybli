/**
 * Biometric Utilities
 * Utility functions for biometric pattern analysis and processing
 */

const crypto = require('crypto');
const { BIOMETRIC, PATTERN_THRESHOLDS } = require('./constants');
const BIOMETRIC_TYPES = BIOMETRIC.TYPES;

class BiometricUtils {
    /**
     * Extract facial patterns from video data
     */
    static extractFacialPattern(videoData) {
        try {
            if (!videoData || typeof videoData !== 'object') {
                throw new Error('Invalid video data provided');
            }

            // Simulate facial landmark detection
            const landmarks = this.detectFacialLandmarks(videoData);
            const textureFeatures = this.analyzeFacialTexture(videoData);
            const geometricFeatures = this.calculateGeometricFeatures(landmarks);
            const temporalFeatures = this.analyzeTemporalPatterns(videoData);

            const facialPattern = {
                landmarks,
                texture: textureFeatures,
                geometric: geometricFeatures,
                temporal: temporalFeatures,
                metadata: {
                    timestamp: Date.now(),
                    dataSource: 'webcam_capture',
                    processingVersion: '1.0',
                    confidence: this.calculateOverallConfidence(landmarks, textureFeatures)
                }
            };

            const qualityScore = this.calculateFacialPatternQuality(facialPattern);

            return {
                pattern: facialPattern,
                quality: qualityScore,
                features: Object.keys(facialPattern).length
            };

        } catch (error) {
            throw new Error(`Facial pattern extraction failed: ${error.message}`);
        }
    }

    /**
     * Extract behavioral patterns from interaction data
     */
    static extractBehavioralPattern(behavioralData) {
        try {
            if (!behavioralData || typeof behavioralData !== 'object') {
                throw new Error('Invalid behavioral data provided');
            }

            const behavioralPattern = {
                mouseDynamics: this.analyzeMouseDynamics(behavioralData.mouseMovements),
                keystrokeDynamics: this.analyzeKeystrokeDynamics(behavioralData.typingData),
                interactionPatterns: this.analyzeInteractionPatterns(behavioralData.interactions),
                navigationBehavior: this.analyzeNavigationBehavior(behavioralData.navigation),
                deviceFingerprint: this.generateDeviceFingerprint(behavioralData.deviceInfo),
                temporalPatterns: this.analyzeBehavioralTemporalPatterns(behavioralData),
                metadata: {
                    timestamp: Date.now(),
                    sessionDuration: behavioralData.sessionDuration || 0,
                    interactionCount: behavioralData.interactionCount || 0,
                    dataCompleteness: this.calculateDataCompleteness(behavioralData)
                }
            };

            const qualityScore = this.calculateBehavioralPatternQuality(behavioralPattern);

            return {
                pattern: behavioralPattern,
                quality: qualityScore,
                features: Object.keys(behavioralPattern).length
            };

        } catch (error) {
            throw new Error(`Behavioral pattern extraction failed: ${error.message}`);
        }
    }

    /**
     * Calculate similarity between two biometric patterns
     */
    static calculatePatternSimilarity(pattern1, pattern2, patternType) {
        try {
            if (patternType === BIOMETRIC_TYPES.FACIAL) {
                return this.calculateFacialSimilarity(pattern1, pattern2);
            } else if (patternType === BIOMETRIC_TYPES.BEHAVIORAL) {
                return this.calculateBehavioralSimilarity(pattern1, pattern2);
            } else {
                throw new Error(`Unsupported pattern type: ${patternType}`);
            }
        } catch (error) {
            throw new Error(`Similarity calculation failed: ${error.message}`);
        }
    }

    /**
     * Validate biometric pattern quality
     */
    static validatePatternQuality(pattern, patternType) {
        const quality = patternType === BIOMETRIC_TYPES.FACIAL 
            ? this.calculateFacialPatternQuality(pattern)
            : this.calculateBehavioralPatternQuality(pattern);

        const issues = [];

        if (quality < PATTERN_THRESHOLDS.MINIMUM_QUALITY) {
            issues.push(`Pattern quality too low: ${quality}`);
        }

        if (!this.hasSufficientFeatures(pattern, patternType)) {
            issues.push('Insufficient features detected');
        }

        if (!this.isPatternConsistent(pattern)) {
            issues.push('Pattern consistency check failed');
        }

        return {
            isValid: issues.length === 0,
            qualityScore: quality,
            issues,
            recommendation: issues.length > 0 ? 'Retry biometric capture' : 'Pattern acceptable'
        };
    }

    /**
     * Normalize biometric pattern for consistent processing
     */
    static normalizePattern(pattern, patternType) {
        try {
            const normalized = JSON.parse(JSON.stringify(pattern)); // Deep clone

            if (patternType === BIOMETRIC_TYPES.FACIAL) {
                return this.normalizeFacialPattern(normalized);
            } else {
                return this.normalizeBehavioralPattern(normalized);
            }
        } catch (error) {
            throw new Error(`Pattern normalization failed: ${error.message}`);
        }
    }

    /**
     * Generate pattern fingerprint for quick comparison
     */
    static generatePatternFingerprint(pattern) {
        try {
            // Create a simplified version for quick comparisons
            const fingerprintData = {
                featureCount: this.countFeatures(pattern),
                complexity: this.calculatePatternComplexity(pattern),
                keyCharacteristics: this.extractKeyCharacteristics(pattern),
                hash: this.generatePatternHash(pattern)
            };

            return fingerprintData;
        } catch (error) {
            throw new Error(`Fingerprint generation failed: ${error.message}`);
        }
    }

    // ==================== FACIAL PATTERN METHODS ====================

    static detectFacialLandmarks(videoData) {
        // Simulate facial landmark detection
        return {
            eyes: {
                left: { x: 0.25, y: 0.35, confidence: 0.95, width: 0.08, height: 0.04 },
                right: { x: 0.75, y: 0.35, confidence: 0.94, width: 0.08, height: 0.04 }
            },
            nose: {
                tip: { x: 0.5, y: 0.5, confidence: 0.92 },
                bridge: { x: 0.5, y: 0.45, confidence: 0.90 }
            },
            mouth: {
                center: { x: 0.5, y: 0.65, confidence: 0.90 },
                corners: {
                    left: { x: 0.4, y: 0.65, confidence: 0.88 },
                    right: { x: 0.6, y: 0.65, confidence: 0.88 }
                }
            },
            faceContour: this.generateFaceContourPoints(),
            eyebrows: {
                left: this.generateEyebrowPoints(0.25, 0.3),
                right: this.generateEyebrowPoints(0.75, 0.3)
            },
            metadata: {
                landmarkCount: 68, // Standard facial landmark points
                detectionMethod: 'neural_network',
                processingTime: 125 // ms
            }
        };
    }

    static analyzeFacialTexture(videoData) {
        return {
            skinTexture: {
                smoothness: 0.85,
                poreDensity: 0.23,
                wrinklePattern: 0.15
            },
            colorFeatures: {
                hue: 0.62,
                saturation: 0.78,
                brightness: 0.82,
                contrast: 0.75
            },
            spatialFeatures: {
                gradientOrientation: 0.45,
                textureUniformity: 0.88,
                localBinaryPatterns: this.generateLocalBinaryPatterns()
            },
            qualityMetrics: {
                sharpness: 0.91,
                noiseLevel: 0.12,
                illumination: 0.85
            }
        };
    }

    static calculateGeometricFeatures(landmarks) {
        const leftEye = landmarks.eyes.left;
        const rightEye = landmarks.eyes.right;
        const nose = landmarks.nose.tip;
        const mouth = landmarks.mouth.center;

        return {
            distances: {
                interocular: this.calculateDistance(leftEye, rightEye),
                noseToMouth: this.calculateDistance(nose, mouth),
                eyeToNose: this.calculateDistance(leftEye, nose)
            },
            ratios: {
                facialSymmetry: this.calculateSymmetryRatio(landmarks),
                goldenRatioDeviation: this.calculateGoldenRatioDeviation(landmarks),
                aspectRatios: this.calculateAspectRatios(landmarks)
            },
            angles: {
                eyeAlignment: this.calculateAlignmentAngle(leftEye, rightEye),
                facialTilt: this.calculateFacialTilt(landmarks)
            }
        };
    }

    static analyzeTemporalPatterns(videoData) {
        return {
            facialMovements: {
                blinkRate: 0.23, // blinks per second
                smileFrequency: 0.08,
                headMovement: {
                    horizontal: 0.15,
                    vertical: 0.08,
                    rotational: 0.05
                }
            },
            expressionChanges: {
                neutralToSmile: 0.12,
                smileToNeutral: 0.10,
                eyebrowRaise: 0.06
            },
            stabilityMetrics: {
                positionStability: 0.88,
                expressionStability: 0.82,
                overallStability: 0.85
            }
        };
    }

    // ==================== BEHAVIORAL PATTERN METHODS ====================

    static analyzeMouseDynamics(mouseMovements) {
        if (!mouseMovements || mouseMovements.length < 5) {
            return this.generateDefaultMousePattern();
        }

        const movements = mouseMovements.slice(-100); // Use last 100 movements

        return {
            movementPatterns: {
                speed: this.calculateAverageSpeed(movements),
                acceleration: this.calculateAccelerationPattern(movements),
                curvature: this.calculateMovementCurvature(movements),
                directness: this.calculateMovementDirectness(movements)
            },
            clickBehavior: {
                frequency: this.calculateClickFrequency(movements),
                duration: this.calculateClickDuration(movements),
                pressure: 0.75 // Simulated
            },
            precision: {
                targetingAccuracy: this.calculateTargetingAccuracy(movements),
                movementSmoothness: this.calculateMovementSmoothness(movements),
                errorRate: this.calculateErrorRate(movements)
            }
        };
    }

    static analyzeKeystrokeDynamics(typingData) {
        if (!typingData || typingData.keystrokes < 10) {
            return this.generateDefaultTypingPattern();
        }

        return {
            timingPatterns: {
                averageSpeed: typingData.speed || 45, // characters per minute
                rhythmConsistency: typingData.consistency || 0.78,
                pausePatterns: this.analyzePausePatterns(typingData)
            },
            errorPatterns: {
                errorRate: typingData.errorRate || 0.12,
                correctionPattern: typingData.correctionPattern || 0.25,
                backspaceUsage: typingData.backspaceUsage || 0.08
            },
            pressurePatterns: {
                keyPressDuration: 0.15, // seconds
                pressureVariation: 0.23,
                rhythmSignature: this.generateRhythmSignature(typingData)
            }
        };
    }

    static analyzeInteractionPatterns(interactions) {
        return {
            timing: {
                responseTime: this.calculateAverageResponseTime(interactions),
                decisionTime: this.calculateDecisionTime(interactions),
                interactionInterval: this.calculateInteractionInterval(interactions)
            },
            sequence: {
                commonSequences: this.identifyCommonSequences(interactions),
                patternConsistency: this.calculatePatternConsistency(interactions),
                behavioralSignature: this.generateBehavioralSignature(interactions)
            },
            preferences: {
                favoriteActions: this.identifyFavoriteActions(interactions),
                avoidancePatterns: this.identifyAvoidancePatterns(interactions),
                efficiencyPatterns: this.calculateEfficiencyPatterns(interactions)
            }
        };
    }

    // ==================== QUALITY ASSESSMENT METHODS ====================

    static calculateFacialPatternQuality(pattern) {
        const weights = {
            landmarks: 0.35,
            texture: 0.25,
            geometric: 0.25,
            temporal: 0.15
        };

        let quality = 0;

        // Check landmark quality
        if (pattern.landmarks && this.validateLandmarks(pattern.landmarks)) {
            quality += weights.landmarks * pattern.landmarks.metadata.confidence;
        }

        // Check texture quality
        if (pattern.texture) {
            const textureQuality = pattern.texture.qualityMetrics 
                ? (pattern.texture.qualityMetrics.sharpness * 0.6 + pattern.texture.qualityMetrics.illumination * 0.4)
                : 0.8;
            quality += weights.texture * textureQuality;
        }

        // Check geometric consistency
        if (pattern.geometric) {
            const geometricQuality = pattern.geometric.ratios.facialSymmetry || 0.85;
            quality += weights.geometric * geometricQuality;
        }

        // Check temporal stability
        if (pattern.temporal) {
            const temporalQuality = pattern.temporal.stabilityMetrics.overallStability || 0.8;
            quality += weights.temporal * temporalQuality;
        }

        return Math.min(quality, 1.0);
    }

    static calculateBehavioralPatternQuality(pattern) {
        const weights = {
            mouseDynamics: 0.3,
            keystrokeDynamics: 0.3,
            interactionPatterns: 0.25,
            navigationBehavior: 0.15
        };

        let quality = 0;

        Object.keys(weights).forEach(key => {
            if (pattern[key] && this.hasValidBehavioralData(pattern[key])) {
                quality += weights[key] * 0.8; // Base quality for presence
            }
        });

        // Additional quality factors
        const dataCompleteness = pattern.metadata?.dataCompleteness || 0.7;
        quality *= dataCompleteness;

        return Math.min(quality, 1.0);
    }

    // ==================== HELPER METHODS ====================

    static calculateDistance(point1, point2) {
        const dx = point1.x - point2.x;
        const dy = point1.y - point2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    static calculateSymmetryRatio(landmarks) {
        // Simplified symmetry calculation
        const leftFeatures = this.extractLeftSideFeatures(landmarks);
        const rightFeatures = this.extractRightSideFeatures(landmarks);
        
        if (leftFeatures.length !== rightFeatures.length) return 0.5;
        
        let similarity = 0;
        for (let i = 0; i < leftFeatures.length; i++) {
            similarity += 1 - Math.abs(leftFeatures[i] - rightFeatures[i]);
        }
        
        return similarity / leftFeatures.length;
    }

    static generateFaceContourPoints() {
        const points = [];
        for (let i = 0; i < 17; i++) { // Standard 17 contour points
            points.push({
                x: 0.1 + (i * 0.05),
                y: 0.8 + (Math.random() * 0.1 - 0.05),
                confidence: 0.85 + (Math.random() * 0.1)
            });
        }
        return points;
    }

    static generateEyebrowPoints(centerX, centerY) {
        const points = [];
        for (let i = 0; i < 5; i++) { // 5 eyebrow points
            points.push({
                x: centerX - 0.05 + (i * 0.025),
                y: centerY + (Math.random() * 0.02 - 0.01),
                confidence: 0.8 + (Math.random() * 0.15)
            });
        }
        return points;
    }

    static generateLocalBinaryPatterns() {
        const patterns = [];
        for (let i = 0; i < 256; i++) { // Standard LBP histogram
            patterns.push(Math.random() * 0.1);
        }
        return patterns;
    }

    static validateLandmarks(landmarks) {
        return landmarks && 
               landmarks.eyes && 
               landmarks.eyes.left.confidence > 0.5 && 
               landmarks.eyes.right.confidence > 0.5;
    }

    static hasValidBehavioralData(behavioralData) {
        return behavioralData && Object.keys(behavioralData).length > 0;
    }

    static countFeatures(pattern) {
        let count = 0;
        const countRecursive = (obj) => {
            for (let key in obj) {
                if (obj[key] && typeof obj[key] === 'object') {
                    countRecursive(obj[key]);
                } else if (typeof obj[key] === 'number' || typeof obj[key] === 'string') {
                    count++;
                }
            }
        };
        countRecursive(pattern);
        return count;
    }

    static calculatePatternComplexity(pattern) {
        const featureCount = this.countFeatures(pattern);
        const depth = this.calculateObjectDepth(pattern);
        return Math.min((featureCount * depth) / 1000, 1.0);
    }

    static calculateObjectDepth(obj, currentDepth = 0) {
        if (typeof obj !== 'object' || obj === null) return currentDepth;
        
        let maxDepth = currentDepth;
        for (let key in obj) {
            if (obj.hasOwnProperty(key)) {
                const depth = this.calculateObjectDepth(obj[key], currentDepth + 1);
                maxDepth = Math.max(maxDepth, depth);
            }
        }
        return maxDepth;
    }

    static generatePatternHash(pattern) {
        const patternString = JSON.stringify(pattern);
        return crypto.createHash('sha256').update(patternString).digest('hex').substring(0, 16);
    }

    // Default patterns for incomplete data
    static generateDefaultMousePattern() {
        return {
            movementPatterns: { speed: 0.5, acceleration: 0.3, curvature: 0.4, directness: 0.6 },
            clickBehavior: { frequency: 0.2, duration: 0.15, pressure: 0.5 },
            precision: { targetingAccuracy: 0.7, movementSmoothness: 0.6, errorRate: 0.3 }
        };
    }

    static generateDefaultTypingPattern() {
        return {
            timingPatterns: { averageSpeed: 40, rhythmConsistency: 0.7, pausePatterns: 0.3 },
            errorPatterns: { errorRate: 0.2, correctionPattern: 0.3, backspaceUsage: 0.1 },
            pressurePatterns: { keyPressDuration: 0.2, pressureVariation: 0.25, rhythmSignature: 0.6 }
        };
    }

    // Placeholder methods for behavioral analysis
    static calculateAverageSpeed(movements) { return 0.5; }
    static calculateAccelerationPattern(movements) { return 0.3; }
    static calculateMovementCurvature(movements) { return 0.4; }
    static calculateMovementDirectness(movements) { return 0.6; }
    static calculateClickFrequency(movements) { return 0.2; }
    static calculateClickDuration(movements) { return 0.15; }
    static calculateTargetingAccuracy(movements) { return 0.7; }
    static calculateMovementSmoothness(movements) { return 0.6; }
    static calculateErrorRate(movements) { return 0.3; }
    static analyzePausePatterns(typingData) { return 0.3; }
    static generateRhythmSignature(typingData) { return 0.6; }
    static calculateAverageResponseTime(interactions) { return 250; }
    static calculateDecisionTime(interactions) { return 1200; }
    static calculateInteractionInterval(interactions) { return 5000; }
    static identifyCommonSequences(interactions) { return []; }
    static calculatePatternConsistency(interactions) { return 0.7; }
    static generateBehavioralSignature(interactions) { return 'default'; }
    static identifyFavoriteActions(interactions) { return []; }
    static identifyAvoidancePatterns(interactions) { return []; }
    static calculateEfficiencyPatterns(interactions) { return 0.6; }
    static analyzeNavigationBehavior(navigation) { return { efficiency: 0.7, patterns: [] }; }
    static generateDeviceFingerprint(deviceInfo) { return 'default_fingerprint'; }
    static analyzeBehavioralTemporalPatterns(behavioralData) { return { patterns: [] }; }
    static calculateDataCompleteness(behavioralData) { return 0.8; }
    static calculateOverallConfidence(landmarks, texture) { return 0.85; }
    static calculateGoldenRatioDeviation(landmarks) { return 0.08; }
    static calculateAspectRatios(landmarks) { return { face: 1.2, eyes: 0.3 }; }
    static calculateAlignmentAngle(point1, point2) { return 0.1; }
    static calculateFacialTilt(landmarks) { return 0.05; }
    static extractLeftSideFeatures(landmarks) { return [0.25, 0.3, 0.4]; }
    static extractRightSideFeatures(landmarks) { return [0.75, 0.3, 0.4]; }
    static hasSufficientFeatures(pattern, patternType) { return true; }
    static isPatternConsistent(pattern) { return true; }
    static normalizeFacialPattern(pattern) { return pattern; }
    static normalizeBehavioralPattern(pattern) { return pattern; }
    static calculateFacialSimilarity(pattern1, pattern2) { return 0.85; }
    static calculateBehavioralSimilarity(pattern1, pattern2) { return 0.75; }
}

module.exports = BiometricUtils;