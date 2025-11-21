const nodemailer = require('nodemailer');
const prisma = require('../config/prisma');

/**
 * Create email transporter from tenant settings or environment variables
 * @param {String} tenantId - Optional tenant ID to use tenant-specific SMTP
 * @returns {Promise<Object>} Transporter and from address
 */
const createTransporter = async (tenantId = null) => {
  let smtpConfig = null;
  let fromName = 'Zent ERP';
  let fromEmail = null;
  let replyTo = null;

  // Try to get tenant-specific SMTP configuration
  if (tenantId) {
    try {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { settings: true, name: true },
      });

      if (tenant?.settings?.smtp) {
        const smtp = tenant.settings.smtp;
        if (smtp.enabled && smtp.host && smtp.user && smtp.password) {
          smtpConfig = {
            host: smtp.host,
            port: parseInt(smtp.port || '587', 10),
            secure: smtp.secure === true || smtp.port === '465',
            auth: {
              user: smtp.user,
              pass: smtp.password,
            },
          };
          fromName = smtp.fromName || tenant.name || 'Zent ERP';
          fromEmail = smtp.fromEmail || smtp.user;
          replyTo = smtp.replyTo || smtp.fromEmail || smtp.user;
        }
      }
    } catch (error) {
      console.error('Error fetching tenant SMTP config:', error);
    }
  }

  // Fallback to environment variables if tenant config not available
  if (!smtpConfig) {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT || 587;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (!smtpHost || !smtpUser || !smtpPass) {
      console.warn('SMTP configuration not found. Email sending will be disabled.');
      return { transporter: null, fromName, fromEmail, replyTo };
    }

    smtpConfig = {
      host: smtpHost,
      port: parseInt(smtpPort, 10),
      secure: smtpPort === '465',
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    };
    fromName = process.env.SMTP_FROM_NAME || 'Zent ERP';
    fromEmail = smtpUser;
    replyTo = process.env.SMTP_REPLY_TO || smtpUser;
  }

  const transporter = nodemailer.createTransport(smtpConfig);

  return { transporter, fromName, fromEmail, replyTo };
};

/**
 * Create transporter from provided SMTP configuration (for testing)
 */
const createTransporterFromConfig = (smtpConfig) => {
  if (!smtpConfig.host || !smtpConfig.user || !smtpConfig.password) {
    return null;
  }

  return nodemailer.createTransport({
    host: smtpConfig.host,
    port: parseInt(smtpConfig.port || '587', 10),
    secure: smtpConfig.secure === true || smtpConfig.port === '465',
    auth: {
      user: smtpConfig.user,
      pass: smtpConfig.password,
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
const sendQuotationEmail = async ({ quotation, message, pdfUrl, tenantId = null }) => {
  try {
    const { transporter, fromName, fromEmail, replyTo } = await createTransporter(tenantId);

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
      from: `"${fromName}" <${fromEmail}>`,
      to: clientEmail,
      subject: subject,
      html: htmlContent,
      ...(replyTo && { replyTo }),
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

/**
 * Send Material Request to suppliers for quotation
 * @param {Object} options - Email options
 * @param {Object} options.materialRequest - Material Request object
 * @param {Object} options.vendor - Supplier/Vendor object
 * @param {String} options.quoteLink - Link for supplier to submit quote (optional)
 * @returns {Promise<Object>} Email send result
 */
const sendMaterialRequestToVendor = async ({ materialRequest, vendor, quoteLink, tenantId = null }) => {
  try {
    const { transporter, fromName, fromEmail, replyTo } = await createTransporter(tenantId);

    if (!transporter) {
      throw new Error('Email service not configured');
    }

    const vendorEmail = vendor.email;

    if (!vendorEmail) {
      throw new Error('Supplier email not found');
    }

    const subject = `Material Request ${materialRequest.requestNumber} - Quotation Request`;

    const itemsHtml = Array.isArray(materialRequest.items)
      ? materialRequest.items
          .map(
            (item, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${item.itemName || '-'}</td>
            <td>${item.qty || 0}</td>
            <td>${item.unit || '-'}</td>
          </tr>
        `
          )
          .join('')
      : '';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background-color: #2563eb; color: white; }
          .button { display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Material Request for Quotation</h1>
          </div>
          <div class="content">
            <p>Dear ${vendor.name},</p>
            <p>We are requesting a quotation from your company for the following material request:</p>
            
            <h3>Request Details</h3>
            <p><strong>Request Number:</strong> ${materialRequest.requestNumber}</p>
            <p><strong>Requested Date:</strong> ${new Date(materialRequest.requestedDate).toLocaleDateString()}</p>
            ${materialRequest.project ? `<p><strong>Project:</strong> ${materialRequest.project.projectCode || materialRequest.project.name || '-'}</p>` : ''}
            ${materialRequest.notes ? `<p><strong>Notes:</strong> ${materialRequest.notes}</p>` : ''}
            
            <h3>Requested Items</h3>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Item Name</th>
                  <th>Quantity</th>
                  <th>Unit</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
            
            ${quoteLink ? `
              <div style="text-align: center; margin: 30px 0;">
                <a href="${quoteLink}" class="button">Submit Quote Online</a>
              </div>
              <p>Alternatively, you can reply to this email with your quotation details.</p>
            ` : `
              <p>Please reply to this email with your quotation details including:</p>
              <ul>
                <li>Unit rates for each item</li>
                <li>Total amount</li>
                <li>Lead time (delivery days)</li>
                <li>Validity period</li>
              </ul>
            `}
            
            <p>Thank you for your prompt response.</p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please reply with your quotation.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to: vendorEmail,
      subject: subject,
      html: htmlContent,
      ...(replyTo && { replyTo }),
    };

    const info = await transporter.sendMail(mailOptions);

    return {
      success: true,
      messageId: info.messageId,
      to: vendorEmail,
    };
  } catch (error) {
    console.error('Error sending material request email:', error);
    throw error;
  }
};

/**
 * Test SMTP connection
 * @param {Object} smtpConfig - SMTP configuration object
 * @returns {Promise<Object>} Test result
 */
const testSMTPConnection = async (smtpConfig) => {
  try {
    const transporter = createTransporterFromConfig(smtpConfig);

    if (!transporter) {
      return {
        success: false,
        message: 'Invalid SMTP configuration',
      };
    }

    // Verify connection
    await transporter.verify();

    return {
      success: true,
      message: 'SMTP connection successful',
    };
  } catch (error) {
    return {
      success: false,
      message: error.message || 'Failed to connect to SMTP server',
      error: error.message,
    };
  }
};

/**
 * Send test email
 * @param {Object} smtpConfig - SMTP configuration
 * @param {String} toEmail - Recipient email address
 * @returns {Promise<Object>} Send result
 */
const sendTestEmail = async (smtpConfig, toEmail) => {
  try {
    const transporter = createTransporterFromConfig(smtpConfig);

    if (!transporter) {
      throw new Error('Invalid SMTP configuration');
    }

    const fromName = smtpConfig.fromName || 'Zent ERP';
    const fromEmail = smtpConfig.fromEmail || smtpConfig.user;

    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to: toEmail,
      subject: 'Test Email from Zent ERP',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Test Email</h1>
            </div>
            <div class="content">
              <p>This is a test email from Zent ERP.</p>
              <p>If you received this email, your SMTP configuration is working correctly!</p>
              <p><strong>Sent at:</strong> ${new Date().toLocaleString()}</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    const info = await transporter.sendMail(mailOptions);

    return {
      success: true,
      message: 'Test email sent successfully',
      messageId: info.messageId,
    };
  } catch (error) {
    throw error;
  }
};

module.exports = {
  sendQuotationEmail,
  sendMaterialRequestToVendor,
  isEmailConfigured,
  testSMTPConnection,
  sendTestEmail,
  createTransporter,
};

