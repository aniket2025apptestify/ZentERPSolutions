const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Helper function to add company header (logo + formatted company info) to PDF
 */
const addCompanyHeader = (doc, tenant) => {
  const settings = tenant.settings || {};
  let yPos = 50;
  const leftMargin = 50;
  const logoSize = 60; // Logo size in points
  const logoRightMargin = 20;
  const pageWidth = 612; // Letter size width in points
  const logoX = pageWidth - logoSize - logoRightMargin - 50; // 50 is margin
  
  // Try to add logo if available
  if (tenant.logoUrl) {
    try {
      // Check if it's a Cloudinary URL (starts with http/https)
      if (tenant.logoUrl.startsWith('http://') || tenant.logoUrl.startsWith('https://')) {
        // For Cloudinary URLs, we can use the URL directly
        // PDFKit supports HTTP URLs for images
        doc.image(tenant.logoUrl, logoX, yPos, {
          fit: [logoSize, logoSize],
        });
      } else {
        // Handle local file paths
        let logoPath;
        if (tenant.logoUrl.startsWith('/uploads/')) {
          logoPath = path.join(__dirname, '../../', tenant.logoUrl.replace(/^\//, ''));
        } else if (path.isAbsolute(tenant.logoUrl)) {
          logoPath = tenant.logoUrl;
        } else {
          logoPath = path.join(__dirname, '../../', tenant.logoUrl);
        }
        
        if (fs.existsSync(logoPath)) {
          // Add logo on the right side
          doc.image(logoPath, logoX, yPos, {
            fit: [logoSize, logoSize],
          });
        }
      }
    } catch (error) {
      console.error('Error loading logo:', error);
      // Continue without logo if there's an error
    }
  }

  // Format company information according to template
  const formatTemplate = settings.companyInfoFormat || '{company_name}\n{address}\n{city} {state}\n{country_code} {zip_code}';
  
  // Replace placeholders with actual values
  let formattedText = formatTemplate
    .replace(/{company_name}/g, tenant.name || '')
    .replace(/{address}/g, tenant.address || '')
    .replace(/{city}/g, settings.city || '')
    .replace(/{state}/g, settings.state || '')
    .replace(/{zip_code}/g, settings.zipCode || '')
    .replace(/{country_code}/g, settings.countryCode || '')
    .replace(/{phone}/g, settings.phone || '')
    .replace(/{vat_number}/g, tenant.vatNumber || '')
    .replace(/{vat_number_with_label}/g, tenant.vatNumber ? `VAT: ${tenant.vatNumber}` : '');

  // Handle custom fields - replace placeholders with actual values from tenant data
  if (settings.customFields && Array.isArray(settings.customFields)) {
    settings.customFields.forEach((field, index) => {
      if (field.label && field.value) {
        const placeholder = `{cf_${index + 1}}`;
        // If value is a placeholder like {gstin}, replace it with actual value
        let fieldValue = field.value;
        if (fieldValue === '{gstin}' && settings.gstin) {
          fieldValue = settings.gstin;
        } else if (fieldValue.startsWith('{') && fieldValue.endsWith('}')) {
          // Try to resolve other placeholders
          const placeholderKey = fieldValue.slice(1, -1);
          if (settings[placeholderKey]) {
            fieldValue = settings[placeholderKey];
          }
        }
        formattedText = formattedText.replace(new RegExp(placeholder, 'g'), `${field.label}: ${fieldValue}`);
      }
    });
  }

  // Add GSTIN if available
  if (settings.gstin) {
    formattedText = formattedText.replace(/{gstin}/g, `GSTIN: ${settings.gstin}`);
  }

  // Split by newlines and add each line
  const lines = formattedText.split('\n').filter(line => line.trim() !== '');
  
  doc.fontSize(12).font('Helvetica-Bold');
  if (lines.length > 0) {
    doc.text(lines[0], leftMargin, yPos);
    yPos += 20;
  }
  
  doc.fontSize(10).font('Helvetica');
  for (let i = 1; i < lines.length; i++) {
    doc.text(lines[i], leftMargin, yPos);
    yPos += 15;
  }

  // Add additional info if not in template
  if (!formatTemplate.includes('{phone}') && settings.phone) {
    doc.text(`Phone: ${settings.phone}`, leftMargin, yPos);
    yPos += 15;
  }
  if (!formatTemplate.includes('{vat_number}') && tenant.vatNumber) {
    doc.text(`VAT Number: ${tenant.vatNumber}`, leftMargin, yPos);
    yPos += 15;
  }
  if (!formatTemplate.includes('{gstin}') && settings.gstin) {
    doc.text(`GSTIN: ${settings.gstin}`, leftMargin, yPos);
    yPos += 15;
  }

  return yPos + 20; // Return next Y position
};

/**
 * Generate Purchase Order PDF
 */
const generatePurchaseOrderPDF = async (purchaseOrder, tenant) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
      const chunks = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Add company header (logo + formatted company info)
      const headerEndY = addCompanyHeader(doc, tenant);

      // Title - Purchase Order (Top Right)
      doc.fontSize(24)
        .font('Helvetica-Bold')
        .text('Purchase Order', 400, 50, { align: 'right' });

      // PO Number Section
      doc.fontSize(10)
        .font('Helvetica')
        .text('The following number must appear on all related correspondence, shipping papers, and invoices:', 50, headerEndY, { width: 500 });
      doc.fontSize(12)
        .font('Helvetica-Bold')
        .text(`P.O. NUMBER: ${purchaseOrder.poNumber}`, 50, headerEndY + 20);

      // Client Section (Primary focus - you're procuring for this client)
      let yPos = headerEndY + 60;
      doc.fontSize(11).font('Helvetica-Bold').text('Client:', 50, yPos);
      if (purchaseOrder.client) {
        doc.fontSize(10).font('Helvetica');
        doc.text(purchaseOrder.client.companyName || purchaseOrder.client.name || '', 50, yPos + 20);
        if (purchaseOrder.client.address) doc.text(purchaseOrder.client.address, 50, yPos + 35);
        if (purchaseOrder.client.phone) {
          doc.text(`Phone: ${purchaseOrder.client.phone}`, 50, yPos + 50);
        }
        if (purchaseOrder.client.email) doc.text(`Email: ${purchaseOrder.client.email}`, 50, yPos + 65);
        if (purchaseOrder.client.vatNumber) {
          doc.text(`VAT: ${purchaseOrder.client.vatNumber}`, 50, yPos + 80);
        }
      } else if (purchaseOrder.project) {
        // Fallback to project info if client not directly linked
        doc.fontSize(10).font('Helvetica');
        if (purchaseOrder.project.name) doc.text(purchaseOrder.project.name, 50, yPos + 20);
        if (purchaseOrder.project.projectCode) {
          doc.text(`Project Code: ${purchaseOrder.project.projectCode}`, 50, yPos + 35);
        }
      }

      // Supplier Section (Minimal - only name, positioned on right)
      doc.fontSize(11).font('Helvetica-Bold').text('Supplier:', 350, yPos);
      if (purchaseOrder.vendor) {
        doc.fontSize(10).font('Helvetica');
        doc.text(purchaseOrder.vendor.name || '', 350, yPos + 20);
        // Only show contact person if available, keep it minimal
        if (purchaseOrder.vendor.contactPerson) {
          doc.text(`Contact: ${purchaseOrder.vendor.contactPerson}`, 350, yPos + 35);
        }
      }

      // Purchase Order Details Header (Blue Bar)
      yPos = yPos + 140;
      doc.rect(50, yPos, 500, 25).fillAndStroke('#0066CC', '#0066CC');
      doc.fillColor('white')
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('P.O. DATE', 60, yPos + 8)
        .text('REQUISITIONER', 150, yPos + 8)
        .text('SHIPPED VIA', 280, yPos + 8)
        .text('F.O.B. POINT', 380, yPos + 8)
        .text('TERMS', 480, yPos + 8);

      // Purchase Order Details Values
      yPos += 30;
      doc.fillColor('black')
        .fontSize(10)
        .font('Helvetica')
        .text(new Date(purchaseOrder.createdAt).toLocaleDateString(), 60, yPos)
        .text(purchaseOrder.createdBy || '-', 150, yPos)
        .text(purchaseOrder.shippedVia || '-', 280, yPos)
        .text(purchaseOrder.fobPoint || '-', 380, yPos)
        .text(purchaseOrder.terms || '-', 480, yPos);

      // Item Details Table Header (Blue Bar)
      yPos += 40;
      doc.rect(50, yPos, 500, 25).fillAndStroke('#0066CC', '#0066CC');
      doc.fillColor('white')
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('QTY', 60, yPos + 8)
        .text('UNIT', 120, yPos + 8)
        .text('DESCRIPTION', 180, yPos + 8)
        .text('UNIT PRICE', 420, yPos + 8)
        .text('TOTAL', 480, yPos + 8);

      // Item Details Rows
      yPos += 30;
      doc.fillColor('black').fontSize(10).font('Helvetica');
      
      if (purchaseOrder.poLines && purchaseOrder.poLines.length > 0) {
        purchaseOrder.poLines.forEach((line, index) => {
          if (yPos > 700) {
            doc.addPage();
            yPos = 50;
          }
          
          doc.text((line.qty || 0).toString(), 60, yPos)
            .text(line.unit || '-', 120, yPos)
            .text(line.description || '-', 180, yPos, { width: 230 })
            .text(`$${(line.unitRate || 0).toFixed(2)}`, 420, yPos)
            .text(`$${(line.amount || 0).toFixed(2)}`, 480, yPos);
          
          yPos += 20;
          
          // Draw line between rows
          doc.moveTo(50, yPos - 5).lineTo(550, yPos - 5).stroke();
        });
      }

      // Financial Summary
      yPos += 20;
      const subtotal = purchaseOrder.totalAmount || 0;
      const salesTax = purchaseOrder.salesTax || 0;
      const shipping = purchaseOrder.shippingHandling || 0;
      const total = subtotal + salesTax + shipping;

      doc.fontSize(10)
        .text('SUBTOTAL', 400, yPos)
        .text(`$${subtotal.toFixed(2)}`, 480, yPos);
      yPos += 20;
      doc.text('SALES TAX', 400, yPos)
        .text(`$${salesTax.toFixed(2)}`, 480, yPos);
      yPos += 20;
      doc.text('SHIP. & HANDLING', 400, yPos)
        .text(`$${shipping.toFixed(2)}`, 480, yPos);
      yPos += 20;
      doc.font('Helvetica-Bold')
        .text('TOTAL', 400, yPos)
        .text(`$${total.toFixed(2)}`, 480, yPos);

      // Instructions
      yPos += 50;
      doc.font('Helvetica').fontSize(10);
      doc.text('1. Please send two copies of your invoice.', 50, yPos);
      yPos += 20;
      doc.text('2. Enter this order in accordance with the prices, terms, delivery method and specifications listed above.', 50, yPos, { width: 450 });
      yPos += 20;
      doc.text('3. Please notify us immediately if you are unable to ship as specified.', 50, yPos, { width: 450 });

      // Authorization Section
      yPos += 50;
      doc.text('Authorized by:', 50, yPos);
      doc.text(purchaseOrder.approvedBy || purchaseOrder.createdBy || '-', 50, yPos + 30);
      doc.text('Title:', 50, yPos + 60);
      doc.text('Signature', 50, yPos + 100);
      doc.text('Date', 200, yPos + 100);
      if (purchaseOrder.approvedAt) {
        doc.text(new Date(purchaseOrder.approvedAt).toLocaleDateString(), 200, yPos + 130);
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Generate Material Request PDF
 */
const generateMaterialRequestPDF = async (materialRequest, tenant) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
      const chunks = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Add company header (logo + formatted company info)
      const headerEndY = addCompanyHeader(doc, tenant);

      // Header
      doc.fontSize(24).font('Helvetica-Bold').text('Material Request', 50, headerEndY, { align: 'center' });
      
      // MR Number
      doc.fontSize(12).font('Helvetica-Bold').text(`MR Number: ${materialRequest.requestNumber}`, 50, headerEndY + 40);
      doc.fontSize(10).font('Helvetica').text(`Date: ${new Date(materialRequest.requestedDate).toLocaleDateString()}`, 50, headerEndY + 60);
      doc.text(`Requested By: ${materialRequest.requestedBy}`, 50, headerEndY + 80);

      // Project Info
      if (materialRequest.project) {
        doc.text(`Project: ${materialRequest.project.projectCode || materialRequest.project.name}`, 50, headerEndY + 100);
      }

      // Items Table
      let yPos = headerEndY + 140;
      doc.rect(50, yPos, 500, 25).fillAndStroke('#0066CC', '#0066CC');
      doc.fillColor('white').fontSize(10).font('Helvetica-Bold')
        .text('ITEM NAME', 60, yPos + 8)
        .text('QUANTITY', 300, yPos + 8)
        .text('UNIT', 400, yPos + 8)
        .text('REMARKS', 450, yPos + 8);

      yPos += 30;
      doc.fillColor('black').fontSize(10).font('Helvetica');
      
      const items = Array.isArray(materialRequest.items) ? materialRequest.items : [];
      items.forEach((item) => {
        if (yPos > 700) {
          doc.addPage();
          yPos = 50;
        }
        doc.text(item.itemName || '-', 60, yPos, { width: 230 })
          .text((item.qty || 0).toString(), 300, yPos)
          .text(item.unit || '-', 400, yPos)
          .text(item.remarks || '-', 450, yPos, { width: 80 });
        yPos += 20;
        doc.moveTo(50, yPos - 5).lineTo(550, yPos - 5).stroke();
      });

      // Notes
      if (materialRequest.notes) {
        yPos += 20;
        doc.font('Helvetica-Bold').text('Notes:', 50, yPos);
        doc.font('Helvetica').text(materialRequest.notes, 50, yPos + 20, { width: 500 });
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Generate GRN PDF
 */
const generateGRNPDF = async (grn, tenant) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
      const chunks = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Add company header (logo + formatted company info)
      const headerEndY = addCompanyHeader(doc, tenant);

      // Header
      doc.fontSize(24).font('Helvetica-Bold').text('Goods Receipt Note', 50, headerEndY, { align: 'center' });
      
      // GRN Details
      doc.fontSize(12).font('Helvetica-Bold').text(`GRN Number: ${grn.grnNumber}`, 50, headerEndY + 40);
      doc.fontSize(10).font('Helvetica')
        .text(`Date: ${new Date(grn.receivedDate).toLocaleDateString()}`, 50, headerEndY + 60)
        .text(`Received By: ${grn.receivedBy}`, 50, headerEndY + 80);

      if (grn.purchaseOrder) {
        doc.text(`Purchase Order: ${grn.purchaseOrder.poNumber}`, 50, headerEndY + 100);
      }

      // Items Table
      let yPos = headerEndY + 140;
      doc.rect(50, yPos, 500, 25).fillAndStroke('#0066CC', '#0066CC');
      doc.fillColor('white').fontSize(10).font('Helvetica-Bold')
        .text('DESCRIPTION', 60, yPos + 8)
        .text('QUANTITY', 300, yPos + 8)
        .text('BATCH NO', 380, yPos + 8)
        .text('REMARKS', 450, yPos + 8);

      yPos += 30;
      doc.fillColor('black').fontSize(10).font('Helvetica');
      
      const items = Array.isArray(grn.items) ? grn.items : [];
      items.forEach((item) => {
        if (yPos > 700) {
          doc.addPage();
          yPos = 50;
        }
        doc.text(item.description || '-', 60, yPos, { width: 230 })
          .text((item.qty || 0).toString(), 300, yPos)
          .text(item.batchNo || '-', 380, yPos)
          .text(item.remarks || '-', 450, yPos, { width: 80 });
        yPos += 20;
        doc.moveTo(50, yPos - 5).lineTo(550, yPos - 5).stroke();
      });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Generate Invoice PDF
 */
const generateInvoicePDF = async (invoice, tenant) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
      const chunks = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Add company header (logo + formatted company info)
      const headerEndY = addCompanyHeader(doc, tenant);

      // Header
      doc.fontSize(24).font('Helvetica-Bold').text('INVOICE', 50, headerEndY, { align: 'center' });
      
      // Invoice Details
      doc.fontSize(12).font('Helvetica-Bold').text(`Invoice Number: ${invoice.invoiceNumber}`, 50, headerEndY + 40);
      doc.fontSize(10).font('Helvetica')
        .text(`Date: ${new Date(invoice.createdAt).toLocaleDateString()}`, 50, headerEndY + 60);

      // Client Info
      if (invoice.client) {
        doc.text(`Bill To: ${invoice.client.name}`, 50, headerEndY + 100);
        if (invoice.client.address) doc.text(invoice.client.address, 50, headerEndY + 120);
        if (invoice.client.email) doc.text(`Email: ${invoice.client.email}`, 50, headerEndY + 140);
      }

      // Items Table
      let yPos = headerEndY + 180;
      doc.rect(50, yPos, 500, 25).fillAndStroke('#0066CC', '#0066CC');
      doc.fillColor('white').fontSize(10).font('Helvetica-Bold')
        .text('DESCRIPTION', 60, yPos + 8)
        .text('QTY', 300, yPos + 8)
        .text('UNIT RATE', 350, yPos + 8)
        .text('TOTAL', 480, yPos + 8);

      yPos += 30;
      doc.fillColor('black').fontSize(10).font('Helvetica');
      
      if (invoice.invoiceLines && invoice.invoiceLines.length > 0) {
        invoice.invoiceLines.forEach((line) => {
          if (yPos > 700) {
            doc.addPage();
            yPos = 50;
          }
          doc.text(line.description || '-', 60, yPos, { width: 230 })
            .text((line.qty || 0).toString(), 300, yPos)
            .text(`$${(line.unitRate || 0).toFixed(2)}`, 350, yPos)
            .text(`$${(line.total || 0).toFixed(2)}`, 480, yPos);
          yPos += 20;
          doc.moveTo(50, yPos - 5).lineTo(550, yPos - 5).stroke();
        });
      }

      // Financial Summary
      yPos += 20;
      doc.fontSize(10)
        .text('SUBTOTAL', 400, yPos)
        .text(`$${(invoice.subtotal || 0).toFixed(2)}`, 480, yPos);
      yPos += 20;
      if (invoice.discount) {
        doc.text('DISCOUNT', 400, yPos)
          .text(`$${(invoice.discount || 0).toFixed(2)}`, 480, yPos);
        yPos += 20;
      }
      if (invoice.vatAmount) {
        doc.text(`VAT (${invoice.vatPercent || 0}%)`, 400, yPos)
          .text(`$${(invoice.vatAmount || 0).toFixed(2)}`, 480, yPos);
        yPos += 20;
      }
      doc.font('Helvetica-Bold')
        .text('TOTAL', 400, yPos)
        .text(`$${(invoice.total || 0).toFixed(2)}`, 480, yPos);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Generate Quotation PDF
 */
const generateQuotationPDF = async (quotation, tenant) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
      const chunks = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Add company header (logo + formatted company info)
      const headerEndY = addCompanyHeader(doc, tenant);

      // Header
      doc.fontSize(24).font('Helvetica-Bold').text('QUOTATION', 50, headerEndY, { align: 'center' });
      
      // Quotation Details
      doc.fontSize(12).font('Helvetica-Bold').text(`Quotation Number: ${quotation.quotationNumber}`, 50, headerEndY + 40);
      doc.fontSize(10).font('Helvetica')
        .text(`Date: ${new Date(quotation.createdAt).toLocaleDateString()}`, 50, headerEndY + 60)
        .text(`Valid Until: ${quotation.validUntil ? new Date(quotation.validUntil).toLocaleDateString() : '-'}`, 50, headerEndY + 80);

      // Client Info
      if (quotation.client) {
        doc.text(`Quote To: ${quotation.client.name}`, 50, headerEndY + 120);
        if (quotation.client.address) doc.text(quotation.client.address, 50, headerEndY + 140);
        if (quotation.client.email) doc.text(`Email: ${quotation.client.email}`, 50, headerEndY + 160);
      }

      // Items Table
      let yPos = headerEndY + 200;
      doc.rect(50, yPos, 500, 25).fillAndStroke('#0066CC', '#0066CC');
      doc.fillColor('white').fontSize(10).font('Helvetica-Bold')
        .text('ITEM', 60, yPos + 8)
        .text('QUANTITY', 250, yPos + 8)
        .text('UNIT RATE', 350, yPos + 8)
        .text('TOTAL', 480, yPos + 8);

      yPos += 30;
      doc.fillColor('black').fontSize(10).font('Helvetica');
      
      if (quotation.quotationLines && quotation.quotationLines.length > 0) {
        quotation.quotationLines.forEach((line) => {
          if (yPos > 700) {
            doc.addPage();
            yPos = 50;
          }
          doc.text(line.itemName || '-', 60, yPos, { width: 180 })
            .text((line.quantity || 0).toString(), 250, yPos)
            .text(`$${(line.unitRate || 0).toFixed(2)}`, 350, yPos)
            .text(`$${(line.total || 0).toFixed(2)}`, 480, yPos);
          yPos += 20;
          doc.moveTo(50, yPos - 5).lineTo(550, yPos - 5).stroke();
        });
      }

      // Financial Summary
      yPos += 20;
      doc.fontSize(10)
        .text('SUBTOTAL', 400, yPos)
        .text(`$${(quotation.subtotal || 0).toFixed(2)}`, 480, yPos);
      yPos += 20;
      if (quotation.discount) {
        doc.text('DISCOUNT', 400, yPos)
          .text(`$${(quotation.discount || 0).toFixed(2)}`, 480, yPos);
        yPos += 20;
      }
      if (quotation.vatAmount) {
        doc.text(`VAT (${quotation.vatPercent || 0}%)`, 400, yPos)
          .text(`$${(quotation.vatAmount || 0).toFixed(2)}`, 480, yPos);
        yPos += 20;
      }
      doc.font('Helvetica-Bold')
        .text('TOTAL AMOUNT', 400, yPos)
        .text(`$${(quotation.totalAmount || 0).toFixed(2)}`, 480, yPos);

      // Notes
      if (quotation.notes) {
        yPos += 40;
        doc.font('Helvetica-Bold').text('Notes:', 50, yPos);
        doc.font('Helvetica').text(quotation.notes, 50, yPos + 20, { width: 500 });
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = {
  generatePurchaseOrderPDF,
  generateMaterialRequestPDF,
  generateGRNPDF,
  generateInvoicePDF,
  generateQuotationPDF,
};

