// backend/src/services/emailService.js
const nodemailer = require('nodemailer');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');
const handlebars = require('handlebars');

class EmailService {
    constructor() {
        this.transporter = null;
        this.templates = {};
        this.initializeTransporter();
        this.loadTemplates();
    }

    /**
     * Initialize email transporter
     */
    initializeTransporter() {
        try {
            // For hackathon, use Ethereal.email (fake SMTP service)
            if (process.env.NODE_ENV === 'development' || !process.env.SMTP_HOST) {
                this.setupEtherealTransporter();
                return;
            }

            // Production SMTP configuration
            this.transporter = nodemailer.createTransporter({
                host: process.env.SMTP_HOST || 'smtp.gmail.com',
                port: process.env.SMTP_PORT || 587,
                secure: process.env.SMTP_SECURE === 'true',
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                }
            });

            logger.info('Email transporter initialized with SMTP');
        } catch (error) {
            logger.error('Failed to initialize email transporter:', error);
            this.setupEtherealTransporter();
        }
    }

    /**
     * Setup Ethereal.email transporter for development
     */
    async setupEtherealTransporter() {
        try {
            // Create test account for development
            const testAccount = await nodemailer.createTestAccount();
            
            this.transporter = nodemailer.createTransporter({
                host: 'smtp.ethereal.email',
                port: 587,
                secure: false,
                auth: {
                    user: testAccount.user,
                    pass: testAccount.pass
                }
            });

            logger.info('Ethereal email transporter initialized', {
                user: testAccount.user,
                pass: testAccount.pass
            });

            // Log test account details for development
            if (process.env.NODE_ENV === 'development') {
                console.log('📧 Ethereal Email Test Account:');
                console.log('Username:', testAccount.user);
                console.log('Password:', testAccount.pass);
                console.log('Web Interface: https://ethereal.email');
            }
        } catch (error) {
            logger.error('Failed to setup Ethereal transporter:', error);
            this.transporter = null;
        }
    }

    /**
     * Load email templates
     */
    loadTemplates() {
        try {
            const templatesDir = path.join(__dirname, '../templates/emails');
            
            if (!fs.existsSync(templatesDir)) {
                logger.warn('Email templates directory not found, creating default templates');
                this.createDefaultTemplates();
                return;
            }

            const templateFiles = fs.readdirSync(templatesDir);
            
            templateFiles.forEach(file => {
                if (file.endsWith('.html')) {
                    const templateName = path.basename(file, '.html');
                    const templatePath = path.join(templatesDir, file);
                    const templateContent = fs.readFileSync(templatePath, 'utf8');
                    
                    this.templates[templateName] = handlebars.compile(templateContent);
                    logger.debug(`Loaded email template: ${templateName}`);
                }
            });

            logger.info(`Loaded ${Object.keys(this.templates).length} email templates`);
        } catch (error) {
            logger.error('Failed to load email templates:', error);
            this.createDefaultTemplates();
        }
    }

    /**
     * Create default templates if none exist
     */
    createDefaultTemplates() {
        const defaultTemplates = {
            'welcome': this.getWelcomeTemplate(),
            'verification-success': this.getVerificationSuccessTemplate(),
            'nft-minted': this.getNFTMintedTemplate(),
            'vote-confirmation': this.getVoteConfirmationTemplate(),
            'proposal-created': this.getProposalCreatedTemplate(),
            'admin-alert': this.getAdminAlertTemplate()
        };

        Object.keys(defaultTemplates).forEach(templateName => {
            this.templates[templateName] = handlebars.compile(defaultTemplates[templateName]);
        });

        logger.info('Created default email templates');
    }

    /**
     * Send email
     */
    async sendEmail(to, subject, templateName, data = {}) {
        try {
            if (!this.transporter) {
                logger.warn('Email transporter not available, skipping email send');
                return { success: false, message: 'Email service unavailable' };
            }

            // Get template
            const template = this.templates[templateName];
            if (!template) {
                throw new Error(`Email template not found: ${templateName}`);
            }

            // Merge with default data
            const emailData = {
                ...data,
                year: new Date().getFullYear(),
                appName: 'NeuroCredit',
                appUrl: process.env.APP_URL || 'http://localhost:3000',
                supportEmail: process.env.SUPPORT_EMAIL || 'support@neurocredit.io'
            };

            // Render template
            const html = template(emailData);
            const text = this.htmlToText(html);

            // Email options
            const mailOptions = {
                from: process.env.FROM_EMAIL || '"NeuroCredit" <noreply@neurocredit.io>',
                to: Array.isArray(to) ? to.join(', ') : to,
                subject: subject,
                text: text,
                html: html
            };

            // Send email
            const info = await this.transporter.sendMail(mailOptions);

            // Log success (in development, log Ethereal URL)
            if (process.env.NODE_ENV === 'development') {
                const previewUrl = nodemailer.getTestMessageUrl(info);
                logger.info('Email sent successfully', {
                    to: to,
                    subject: subject,
                    template: templateName,
                    previewUrl: previewUrl
                });

                if (previewUrl) {
                    console.log('📧 Email Preview URL:', previewUrl);
                }
            } else {
                logger.info('Email sent successfully', {
                    to: to,
                    subject: subject,
                    template: templateName,
                    messageId: info.messageId
                });
            }

            return { 
                success: true, 
                messageId: info.messageId,
                previewUrl: nodemailer.getTestMessageUrl(info) 
            };

        } catch (error) {
            logger.error('Failed to send email:', error);
            return { 
                success: false, 
                error: error.message,
                details: 'Email service temporarily unavailable' 
            };
        }
    }

    /**
     * Send welcome email to new user
     */
    async sendWelcomeEmail(user) {
        const subject = 'Welcome to NeuroCredit - Start Your Human Verification Journey!';
        
        const data = {
            username: user.username,
            walletAddress: user.walletAddress,
            verificationLink: `${process.env.APP_URL}/verify`,
            dashboardLink: `${process.env.APP_URL}/dashboard`
        };

        return await this.sendEmail(user.email, subject, 'welcome', data);
    }

    /**
     * Send biometric verification success email
     */
    async sendVerificationSuccessEmail(user, verificationData) {
        const subject = '🎉 Biometric Verification Successful! - NeuroCredit';
        
        const data = {
            username: user.username,
            verificationDate: new Date().toLocaleDateString(),
            qualityScore: verificationData.qualityScore,
            nftMintLink: `${process.env.APP_URL}/mint-nft`,
            nextSteps: [
                'Mint your Humanity NFT',
                'Participate in DAO governance',
                'Join exclusive human-verified communities'
            ]
        };

        return await this.sendEmail(user.email, subject, 'verification-success', data);
    }

    /**
     * Send NFT minted confirmation email
     */
    async sendNFTMintedEmail(user, nftData) {
        const subject = '🚀 Your Humanity NFT Has Been Minted! - NeuroCredit';
        
        const data = {
            username: user.username,
            tokenId: nftData.tokenId,
            transactionHash: nftData.transactionHash,
            mintDate: new Date().toLocaleDateString(),
            openseaLink: `https://testnets.opensea.io/assets/${nftData.contractAddress}/${nftData.tokenId}`,
            daoLink: `${process.env.APP_URL}/dao`,
            benefits: [
                'Sybil-resistant voting power',
                'Access to exclusive communities',
                'Priority access to features'
            ]
        };

        return await this.sendEmail(user.email, subject, 'nft-minted', data);
    }

    /**
     * Send vote confirmation email
     */
    async sendVoteConfirmationEmail(user, voteData) {
        const subject = '✅ Vote Cast Successfully - NeuroCredit DAO';
        
        const data = {
            username: user.username,
            proposalTitle: voteData.proposalTitle,
            optionVoted: voteData.optionVoted,
            voteDate: new Date().toLocaleString(),
            transactionHash: voteData.transactionHash,
            resultsLink: `${process.env.APP_URL}/proposals/${voteData.proposalId}`,
            daoLink: `${process.env.APP_URL}/dao`
        };

        return await this.sendEmail(user.email, subject, 'vote-confirmation', data);
    }

    /**
     * Send proposal creation confirmation
     */
    async sendProposalCreatedEmail(user, proposalData) {
        const subject = '📋 Your DAO Proposal Has Been Created - NeuroCredit';
        
        const data = {
            username: user.username,
            proposalTitle: proposalData.title,
            proposalId: proposalData.proposalId,
            endDate: new Date(proposalData.endTime).toLocaleString(),
            votingLink: `${process.env.APP_URL}/proposals/${proposalData.proposalId}`,
            shareLink: `${process.env.APP_URL}/proposals/${proposalData.proposalId}?ref=share`
        };

        return await this.sendEmail(user.email, subject, 'proposal-created', data);
    }

    /**
     * Send admin alert email
     */
    async sendAdminAlert(alertData) {
        const adminEmails = process.env.ADMIN_EMAILS ? 
            process.env.ADMIN_EMAILS.split(',') : 
            ['admin@neurocredit.io'];

        const subject = `🚨 Admin Alert: ${alertData.title} - NeuroCredit`;
        
        const data = {
            alertTitle: alertData.title,
            alertMessage: alertData.message,
            severity: alertData.severity || 'medium',
            timestamp: new Date().toISOString(),
            details: alertData.details || {},
            dashboardLink: `${process.env.APP_URL}/admin`
        };

        return await this.sendEmail(adminEmails, subject, 'admin-alert', data);
    }

    /**
     * Send password reset email
     */
    async sendPasswordResetEmail(user, resetToken) {
        const subject = '🔐 Password Reset Request - NeuroCredit';
        
        const data = {
            username: user.username,
            resetLink: `${process.env.APP_URL}/reset-password?token=${resetToken}`,
            expiryTime: '1 hour',
            supportLink: `${process.env.APP_URL}/support`
        };

        return await this.sendEmail(user.email, subject, 'password-reset', data);
    }

    /**
     * Verify email service connectivity
     */
    async verifyConnection() {
        try {
            if (!this.transporter) {
                return { success: false, message: 'Transporter not initialized' };
            }

            await this.transporter.verify();
            return { success: true, message: 'Email service connected' };
        } catch (error) {
            logger.error('Email service connection verification failed:', error);
            return { success: false, message: error.message };
        }
    }

    /**
     * Get email sending statistics
     */
    getStats() {
        return {
            transporterAvailable: !!this.transporter,
            templatesLoaded: Object.keys(this.templates).length,
            service: process.env.SMTP_HOST ? 'SMTP' : 'Ethereal (Development)'
        };
    }

    /**
     * Convert HTML to plain text
     */
    htmlToText(html) {
        return html
            .replace(/<[^>]*>/g, '') // Remove HTML tags
            .replace(/\s+/g, ' ') // Collapse whitespace
            .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
            .replace(/&amp;/g, '&') // Replace HTML entities
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .trim();
    }

    /**
     * Default email templates
     */
    getWelcomeTemplate() {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Welcome to NeuroCredit! 🎉</h1>
            <p>Your journey to Sybil-resistant digital identity begins now</p>
        </div>
        <div class="content">
            <h2>Hello {{username}}!</h2>
            <p>Welcome to the future of digital identity and decentralized governance. With NeuroCredit, you're joining a community of verified humans building a better web3.</p>
            
            <h3>🚀 What's Next?</h3>
            <ol>
                <li><strong>Complete Biometric Verification:</strong> Prove your unique human identity</li>
                <li><strong>Mint Your Humanity NFT:</strong> Get your soulbound verification token</li>
                <li><strong>Participate in Governance:</strong> Vote in DAO proposals with Sybil-resistant power</li>
            </ol>
            
            <p style="text-align: center;">
                <a href="{{verificationLink}}" class="button">Start Verification</a>
            </p>
            
            <p><strong>Wallet Address:</strong> {{walletAddress}}</p>
            
            <p>Need help? Check out our <a href="{{appUrl}}/guide">getting started guide</a> or contact our support team.</p>
        </div>
        <div class="footer">
            <p>&copy; {{year}} {{appName}}. All rights reserved.</p>
            <p>This is an automated message, please do not reply directly to this email.</p>
        </div>
    </div>
</body>
</html>
        `;
    }

    getVerificationSuccessTemplate() {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { background: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; }
        .success-badge { background: #4CAF50; color: white; padding: 10px 20px; border-radius: 20px; display: inline-block; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Verification Successful! ✅</h1>
            <p>Your unique human identity has been verified</p>
        </div>
        <div class="content">
            <div style="text-align: center;">
                <div class="success-badge">
                    <h2>Quality Score: {{qualityScore}}%</h2>
                </div>
            </div>
            
            <h2>Congratulations, {{username}}! 🎉</h2>
            <p>Your biometric verification was successful on {{verificationDate}}. You've proven your unique human identity using advanced pattern recognition.</p>
            
            <h3>🔑 What This Means:</h3>
            <ul>
                {{#each nextSteps}}
                <li>{{this}}</li>
                {{/each}}
            </ul>
            
            <p style="text-align: center;">
                <a href="{{nftMintLink}}" class="button">Mint Your Humanity NFT</a>
            </p>
            
            <p><strong>Privacy Note:</strong> Your biometric data was processed locally and only a cryptographic hash is stored. Your privacy is protected.</p>
        </div>
    </div>
</body>
</html>
        `;
    }

    getNFTMintedTemplate() {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .nft-card { background: white; border: 2px solid #ddd; border-radius: 10px; padding: 20px; margin: 20px 0; }
        .button { background: #FF6B6B; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Humanity NFT Minted! 🚀</h1>
            <p>Your soulbound identity token is now on the blockchain</p>
        </div>
        <div class="content">
            <div class="nft-card">
                <h3>NFT Details</h3>
                <p><strong>Token ID:</strong> #{{tokenId}}</p>
                <p><strong>Transaction:</strong> {{transactionHash}}</p>
                <p><strong>Minted:</strong> {{mintDate}}</p>
            </div>
            
            <h2>Welcome to the Verified Human Club! 👥</h2>
            <p>Your Humanity NFT proves your unique identity and grants you special privileges in the NeuroCredit ecosystem.</p>
            
            <h3>🎁 Exclusive Benefits:</h3>
            <ul>
                {{#each benefits}}
                <li>{{this}}</li>
                {{/each}}
            </ul>
            
            <p style="text-align: center;">
                <a href="{{daoLink}}" class="button">Start Voting in DAO</a>
                <a href="{{openseaLink}}" style="margin-left: 10px;" class="button">View on OpenSea</a>
            </p>
        </div>
    </div>
</body>
</html>
        `;
    }

    // Additional template methods would follow similar pattern...
    getVoteConfirmationTemplate() {
        return `...`; // Similar structure as above
    }

    getProposalCreatedTemplate() {
        return `...`; // Similar structure as above
    }

    getAdminAlertTemplate() {
        return `...`; // Similar structure as above
    }
}

module.exports = new EmailService();