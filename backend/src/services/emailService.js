const nodemailer = require('nodemailer');

/**
 * Create email transporter from environment variables
 */
const createTransporter = () => {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT || 587;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpHost || !smtpUser || !smtpPass) {
    console.warn('SMTP configuration not found. Email sending will be disabled.');
    return null;
  }

  return nodemailer.createTransport({
    host: smtpHost,
    port: parseInt(smtpPort, 10),
    secure: smtpPort === '465', // true for 465, false for other ports
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
};

/**
 * Send quotation email to client
 * @param {Object} options - Email options
 * @param {Object} options.quotation - Quotation object with client and lines
 * @param {String} options.message - Custom message
 * @param {String} options.pdfUrl - URL to PDF attachment (optional)
 * @returns {Promise<Object>} Email send result
 */
const sendQuotationEmail = async ({ quotation, message, pdfUrl }) => {
  try {
    const transporter = createTransporter();

    if (!transporter) {
      throw new Error('Email service not configured');
    }

    const client = quotation.client;
    const clientEmail = client.email;

    if (!clientEmail) {
      throw new Error('Client email not found');
    }

    // Build email content
    const subject = `Quotation ${quotation.quotationNumber} - ${quotation.client.companyName || quotation.client.name}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background-color: #4CAF50; color: white; }
          .total-row { font-weight: bold; background-color: #e8f5e9; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Quotation ${quotation.quotationNumber}</h1>
          </div>
          <div class="content">
            <p>Dear ${client.name},</p>
            <p>${message || 'Please find attached our quotation for your consideration.'}</p>
            
            <h3>Quotation Details</h3>
            <p><strong>Quotation Number:</strong> ${quotation.quotationNumber}</p>
            <p><strong>Valid Until:</strong> ${quotation.validityDays ? new Date(Date.now() + quotation.validityDays * 24 * 60 * 60 * 1000).toLocaleDateString() : 'N/A'}</p>
            
            <h3>Items</h3>
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Quantity</th>
                  <th>Unit Rate</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${quotation.quotationLines?.map(line => `
                  <tr>
                    <td>${line.itemName}</td>
                    <td>${line.quantity}</td>
                    <td>${line.unitRate.toFixed(2)}</td>
                    <td>${line.total.toFixed(2)}</td>
                  </tr>
                `).join('') || ''}
              </tbody>
            </table>
            
            <div style="margin-top: 20px; text-align: right;">
              <p><strong>Subtotal:</strong> ${quotation.subtotal?.toFixed(2) || '0.00'}</p>
              ${quotation.discount ? `<p><strong>Discount:</strong> ${quotation.discount.toFixed(2)}</p>` : ''}
              ${quotation.vatAmount ? `<p><strong>VAT (${quotation.vatPercent}%):</strong> ${quotation.vatAmount.toFixed(2)}</p>` : ''}
              <p class="total-row"><strong>Total Amount:</strong> ${quotation.totalAmount?.toFixed(2) || '0.00'}</p>
            </div>
            
            ${quotation.notes ? `<p><strong>Notes:</strong> ${quotation.notes}</p>` : ''}
            
            <p>Thank you for your business!</p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply directly to this message.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `"${process.env.SMTP_FROM_NAME || 'Zent ERP'}" <${process.env.SMTP_USER}>`,
      to: clientEmail,
      subject: subject,
      html: htmlContent,
    };

    // Add PDF attachment if provided
    if (pdfUrl) {
      mailOptions.attachments = [
        {
          filename: `Quotation-${quotation.quotationNumber}.pdf`,
          path: pdfUrl,
        },
      ];
    }

    const info = await transporter.sendMail(mailOptions);

    return {
      success: true,
      messageId: info.messageId,
      to: clientEmail,
    };
  } catch (error) {
    console.error('Error sending quotation email:', error);
    throw error;
  }
};

/**
 * Verify email configuration
 * @returns {Promise<Boolean>} True if email is configured
 */
const isEmailConfigured = () => {
  return !!(
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  );
};

module.exports = {
  sendQuotationEmail,
  isEmailConfigured,
};

