/**
 * Email Service for sending test/scan reports to caregivers
 * Uses Nodemailer with Gmail SMTP
 */

const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    // Create transporter with explicit Gmail SMTP configuration
    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // Use STARTTLS
      auth: {
        user: process.env.EMAIL_USER || 'tanmaymirgal26@gmail.com',
        pass: process.env.EMAIL_PASSWORD || 'qgugckfwmrmcydrh'
      },
      tls: {
        rejectUnauthorized: false
      }
    });
    
    console.log('📧 Email service initialized with:', process.env.EMAIL_USER || 'tanmaymirgal26@gmail.com');
  }

  /**
   * Send test/scan report to caregiver
   * @param {Object} options - Email options
   * @param {string} options.caregiverEmail - Caregiver's email address
   * @param {string} options.caregiverName - Caregiver's name
   * @param {string} options.patientName - Patient's name
   * @param {string} options.testType - Type of test (scan, clinical, cognitive, speech)
   * @param {Object} options.results - Test results
   * @param {string} options.reportUrl - URL to PDF report (optional)
   */
  async sendReportToCaregiver(options) {
    try {
      const {
        caregiverEmail,
        caregiverName,
        patientName,
        testType,
        results,
        reportUrl,
        questions,
        reportPath
      } = options;

      // Generate email subject
      const subject = `${patientName}'s ${this.getTestTypeLabel(testType)} Report - Cognix Health`;

      // Generate email HTML content
      const htmlContent = this.generateEmailHTML({
        caregiverName,
        patientName,
        testType,
        results,
        reportUrl,
        questions
      });

      // Prepare email options
      const mailOptions = {
        from: `"Cognix Health" <${process.env.EMAIL_USER || 'tanmaymirgal26@gmail.com'}>`,
        to: caregiverEmail,
        subject: subject,
        html: htmlContent,
        attachments: []
      };

      // Attach PDF report if available
      if (reportPath) {
        try {
          const fs = require('fs');
          const path = require('path');
          
          // Check if file exists
          if (fs.existsSync(reportPath)) {
            const fileName = path.basename(reportPath);
            mailOptions.attachments.push({
              filename: fileName,
              path: reportPath,
              contentType: 'application/pdf'
            });
            console.log(`📎 Attaching PDF report: ${fileName}`);
          } else {
            console.warn(`⚠️ PDF file not found at: ${reportPath}`);
          }
        } catch (attachError) {
          console.error('⚠️ Error attaching PDF:', attachError.message);
          // Continue sending email without attachment
        }
      }

      // Send email
      const info = await this.transporter.sendMail(mailOptions);

      console.log(`✅ Email sent to caregiver: ${caregiverEmail} - Message ID: ${info.messageId}`);
      return { success: true, messageId: info.messageId };

    } catch (error) {
      console.error('❌ Email sending failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get human-readable test type label
   */
  getTestTypeLabel(testType) {
    const labels = {
      'scan': 'Document Scan',
      'clinical': 'Clinical Assessment',
      'test': 'Cognitive Test',
      'speech': 'Speech & Language Assessment',
      'report': 'Personal Report'
    };
    return labels[testType] || 'Health Assessment';
  }

  /**
   * Generate HTML email content
   */
  generateEmailHTML({ caregiverName, patientName, testType, results, reportUrl, questions }) {
    const testLabel = this.getTestTypeLabel(testType);
    const date = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Build questions section if available
    let questionsHTML = '';
    if (questions && questions.length > 0) {
      questionsHTML = `
        <div style="margin: 30px 0; padding: 20px; background-color: #F8FAFC; border-radius: 8px;">
          <h3 style="color: #1E293B; margin-top: 0;">Test Questions & Answers</h3>
          ${questions.map((q, index) => `
            <div style="margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #E2E8F0;">
              <p style="color: #64748B; font-size: 14px; margin: 0 0 5px 0;">Question ${index + 1}:</p>
              <p style="color: #1E293B; font-weight: 600; margin: 0 0 8px 0;">${q.question}</p>
              <p style="color: #6366F1; margin: 0;">Answer: ${q.answer || 'Not answered'}</p>
            </div>
          `).join('')}
        </div>
      `;
    }

    // Build results section
    const resultsHTML = this.generateResultsHTML(testType, results);

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${testLabel} Report</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #F1F5F9;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%); padding: 40px 30px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">🧠 Cognix Health</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Cognitive Health Monitoring</p>
    </div>

    <!-- Main Content -->
    <div style="padding: 40px 30px;">
      
      <!-- Greeting -->
      <p style="color: #1E293B; font-size: 16px; line-height: 1.6;">
        Hello <strong>${caregiverName}</strong>,
      </p>
      
      <p style="color: #64748B; font-size: 15px; line-height: 1.6;">
        <strong>${patientName}</strong> has completed a <strong>${testLabel}</strong> on <strong>${date}</strong>. 
        As their registered caregiver, we're sharing the results with you.
      </p>

      <!-- Test Type Badge -->
      <div style="margin: 25px 0; padding: 15px; background-color: #EEF2FF; border-left: 4px solid #6366F1; border-radius: 6px;">
        <p style="margin: 0; color: #4F46E5; font-weight: 600;">📋 ${testLabel}</p>
      </div>

      <!-- Results -->
      ${resultsHTML}

      <!-- Questions Section -->
      ${questionsHTML}

      <!-- Report Link -->
      ${reportUrl ? `
        <div style="margin: 30px 0; text-align: center;">
          <a href="${reportUrl}" style="display: inline-block; background: linear-gradient(135deg, #DC2626 0%, #EF4444 100%); color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;">
            📄 View Full PDF Report
          </a>
        </div>
      ` : ''}

      <!-- Important Note -->
      <div style="margin: 30px 0; padding: 20px; background-color: #FEF3C7; border-left: 4px solid #F59E0B; border-radius: 6px;">
        <p style="margin: 0; color: #92400E; font-size: 14px; line-height: 1.6;">
          <strong>⚠️ Important:</strong> This report is AI-assisted and for informational purposes only. 
          Please consult with qualified healthcare professionals for medical advice and treatment decisions.
        </p>
      </div>

      <!-- Footer Message -->
      <p style="color: #64748B; font-size: 14px; line-height: 1.6; margin-top: 30px;">
        Thank you for being a caring and supportive caregiver. Your involvement in ${patientName}'s health journey makes a significant difference.
      </p>

      <p style="color: #64748B; font-size: 14px; line-height: 1.6;">
        Best regards,<br>
        <strong style="color: #6366F1;">The Cognix Health Team</strong>
      </p>

    </div>

    <!-- Footer -->
    <div style="background-color: #F8FAFC; padding: 30px; text-align: center; border-top: 1px solid #E2E8F0;">
      <p style="color: #94A3B8; font-size: 12px; margin: 0;">
        This email was sent by Cognix Health - Cognitive Health Monitoring Platform
      </p>
      <p style="color: #94A3B8; font-size: 12px; margin: 10px 0 0 0;">
        © ${new Date().getFullYear()} Cognix Health. All rights reserved.
      </p>
    </div>

  </div>
</body>
</html>
    `;
  }

  /**
   * Generate results HTML based on test type
   */
  generateResultsHTML(testType, results) {
    if (!results) return '';

    const { prediction, score, summary } = results;

    let html = '<div style="margin: 25px 0;">';

    // Prediction/Disease
    if (prediction && prediction.disease) {
      const riskColors = {
        'Low': '#10B981',
        'Moderate': '#F59E0B',
        'Medium': '#F59E0B',
        'High': '#EF4444',
        'Critical': '#DC2626'
      };
      const riskColor = riskColors[prediction.riskLevel] || '#6366F1';

      html += `
        <div style="background-color: #F8FAFC; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="color: #1E293B; margin: 0 0 15px 0; font-size: 18px;">Assessment Results</h3>
          
          <div style="margin-bottom: 12px;">
            <p style="color: #64748B; font-size: 13px; margin: 0 0 5px 0;">Prediction:</p>
            <p style="color: #1E293B; font-size: 20px; font-weight: 700; margin: 0;">${prediction.disease}</p>
          </div>

          <div style="display: flex; gap: 20px; margin-top: 15px;">
            <div>
              <p style="color: #64748B; font-size: 13px; margin: 0 0 5px 0;">Confidence:</p>
              <p style="color: #6366F1; font-size: 16px; font-weight: 600; margin: 0;">
                ${(prediction.confidence * 100).toFixed(1)}%
              </p>
            </div>
            <div>
              <p style="color: #64748B; font-size: 13px; margin: 0 0 5px 0;">Risk Level:</p>
              <p style="color: ${riskColor}; font-size: 16px; font-weight: 600; margin: 0;">
                ${prediction.riskLevel}
              </p>
            </div>
          </div>
        </div>
      `;
    }

    // Score (for cognitive tests)
    if (score) {
      html += `
        <div style="background-color: #F8FAFC; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="color: #1E293B; margin: 0 0 10px 0; font-size: 18px;">Test Score</h3>
          <p style="color: #1E293B; font-size: 24px; font-weight: 700; margin: 0;">
            ${score.current !== undefined ? score.current : '?'}/${score.max !== undefined ? score.max : '?'} <span style="font-size: 16px; color: #64748B;">(${score.percentage}%)</span>
          </p>
        </div>
      `;
    }

    // Summary
    if (summary) {
      html += `
        <div style="background-color: #FFFBEB; padding: 20px; border-radius: 8px; border-left: 4px solid #F59E0B;">
          <h3 style="color: #92400E; margin: 0 0 10px 0; font-size: 16px;">Clinical Summary</h3>
          <p style="color: #78350F; font-size: 14px; line-height: 1.6; margin: 0;">${summary}</p>
        </div>
      `;
    }

    html += '</div>';
    return html;
  }

  /**
   * Test email configuration
   */
  async testConnection() {
    try {
      await this.transporter.verify();
      console.log('✅ Email service is ready to send emails');
      return true;
    } catch (error) {
      console.error('❌ Email service configuration error:', error);
      return false;
    }
  }
}

module.exports = new EmailService();
