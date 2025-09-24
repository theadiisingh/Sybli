/**
 * Email Service
 * Handles email notifications and communications
 */

const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }

  async sendEmail(to, subject, html) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to,
        subject,
        html
      };

      const result = await this.transporter.sendMail(mailOptions);
      return result;
    } catch (error) {
      throw new Error('Email sending failed: ' + error.message);
    }
  }

  async sendWelcomeEmail(email, name) {
    try {
      const subject = 'Welcome to Sybli!';
      const html = `
        <h1>Welcome ${name}!</h1>
        <p>Thank you for joining Sybli. We're excited to have you on board.</p>
        <p>Best regards,<br/>The Sybli Team</p>
      `;

      return await this.sendEmail(email, subject, html);
    } catch (error) {
      throw new Error('Welcome email failed: ' + error.message);
    }
  }

  async sendNotificationEmail(email, type, data) {
    try {
      const subject = `Sybli - ${type} Notification`;
      const html = this.generateNotificationHTML(type, data);

      return await this.sendEmail(email, subject, html);
    } catch (error) {
      throw new Error('Notification email failed: ' + error.message);
    }
  }

  generateNotificationHTML(type, data) {
    // Generate HTML content based on notification type
    return `
      <h1>${type} Notification</h1>
      <p>You have a new notification: ${JSON.stringify(data)}</p>
    `;
  }
}

module.exports = new EmailService();
