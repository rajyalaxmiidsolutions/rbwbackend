const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

const generateInvoicePDF = (order) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', (err) => reject(err));

    // Logo (if exists)
    const logoPath = path.join(__dirname, '..', 'logo.png');
    if (fs.existsSync(logoPath)) {
      try {
        doc.image(logoPath, 50, 45, { width: 60 });
      } catch (err) {
        console.error('Error drawing logo in PDF:', err.message);
      }
    }

    // Company details header
    doc.fillColor('#6D0F1A') // Burgundy brand color
       .font('Helvetica-Bold')
       .fontSize(22)
       .text('Rajyalaxmi Binding Works', 125, 45);

    doc.fillColor('#333333')
       .font('Helvetica')
       .fontSize(9)
       .text('Wholesalers & Retailers of Wedding Cards', 125, 70)
       .text('Phone: +91 9182200381 | Email: support.rajyalaxmibindingworks@gmail.com', 125, 83);

    // Draw horizontal line
    doc.strokeColor('#CCCCCC')
       .lineWidth(1)
       .moveTo(50, 115)
       .lineTo(545, 115)
       .stroke();

    // Invoice Meta (ID, Date, etc.)
    doc.font('Helvetica-Bold')
       .fontSize(12)
       .text('INVOICE / BILL', 50, 130);

    doc.font('Helvetica')
       .fontSize(9)
       .text(`Invoice No: #INV-${order._id.toString().slice(-8).toUpperCase()}`, 50, 150)
       .text(`Order ID: #${order._id.toString().toUpperCase()}`, 50, 165)
       .text(`Date: ${new Date(order.createdAt).toLocaleDateString('en-IN')}`, 50, 180)
       .text(`Payment Status: ${order.orderStatus}`, 50, 195)
       .text(`Payment Method: ${order.paymentMethod}`, 50, 210);

    // Bill To Customer Details
    doc.font('Helvetica-Bold')
       .fontSize(12)
       .text('BILL TO:', 320, 130);

    doc.font('Helvetica')
       .fontSize(9)
       .text(order.shippingAddress.fullName || '', 320, 150);
    if (order.shippingAddress.businessName) {
      doc.text(order.shippingAddress.businessName, 320, 165);
    }
    if (order.shippingAddress.gstNumber) {
      doc.text(`GSTIN: ${order.shippingAddress.gstNumber}`, 320, 180);
    }
    doc.text(`${order.shippingAddress.street || ''}`, 320, 195)
       .text(`${order.shippingAddress.city || ''}, ${order.shippingAddress.state || ''} — ${order.shippingAddress.pincode || ''}`, 320, 210)
       .text(`Phone: ${order.shippingAddress.phone || ''}`, 320, 225)
       .text(`Email: ${order.shippingAddress.email || ''}`, 320, 240);

    // Items table header
    const tableTop = 275;
    doc.strokeColor('#6D0F1A')
       .lineWidth(2)
       .moveTo(50, tableTop)
       .lineTo(545, tableTop)
       .stroke();

    doc.fillColor('#6D0F1A')
       .font('Helvetica-Bold')
       .fontSize(9)
       .text('Product Name', 55, tableTop + 6)
       .text('Unit Price', 320, tableTop + 6, { width: 60, align: 'right' })
       .text('Qty', 410, tableTop + 6, { width: 30, align: 'center' })
       .text('Total', 485, tableTop + 6, { width: 60, align: 'right' });

    doc.strokeColor('#E0E0E0')
       .lineWidth(1)
       .moveTo(50, tableTop + 20)
       .lineTo(545, tableTop + 20)
       .stroke();

    // Table rows
    let currentY = tableTop + 20;
    doc.fillColor('#333333').font('Helvetica');

    order.products.forEach((item) => {
      currentY += 20;
      doc.text(item.name, 55, currentY, { width: 250 })
         .text(`₹${item.price.toFixed(2)}`, 320, currentY, { width: 60, align: 'right' })
         .text(item.quantity.toString(), 410, currentY, { width: 30, align: 'center' })
         .text(`₹${(item.price * item.quantity).toFixed(2)}`, 485, currentY, { width: 60, align: 'right' });

      doc.strokeColor('#F0F0F0')
         .lineWidth(0.5)
         .moveTo(50, currentY + 15)
         .lineTo(545, currentY + 15)
         .stroke();
      currentY += 5;
    });

    // Totals
    currentY += 15;
    doc.font('Helvetica')
       .text('Product Subtotal:', 350, currentY, { width: 110, align: 'right' })
       .font('Helvetica-Bold')
       .text(`₹${order.productTotal.toFixed(2)}`, 485, currentY, { width: 60, align: 'right' });

    currentY += 15;
    doc.font('Helvetica')
       .text('Shipping Charge:', 350, currentY, { width: 110, align: 'right' })
       .font('Helvetica-Bold')
       .text(`₹${order.shippingCharge.toFixed(2)}`, 485, currentY, { width: 60, align: 'right' });

    currentY += 20;
    doc.strokeColor('#6D0F1A')
       .lineWidth(1)
       .moveTo(350, currentY)
       .lineTo(545, currentY)
       .stroke();

    currentY += 8;
    doc.fillColor('#6D0F1A')
       .font('Helvetica-Bold')
       .fontSize(11)
       .text('Grand Total:', 350, currentY, { width: 110, align: 'right' })
       .text(`₹${order.totalPrice.toFixed(2)}`, 485, currentY, { width: 60, align: 'right' });

    // Delivery Address & Receiving Info Section at the bottom if Delivered
    if (order.deliveryInfo && (order.deliveryInfo.receivingSpot || order.deliveryInfo.trackingNumber)) {
      currentY += 40;
      doc.fillColor('#333333');
      doc.strokeColor('#E0E0E0')
         .lineWidth(1)
         .moveTo(50, currentY)
         .lineTo(545, currentY)
         .stroke();

      currentY += 10;
      doc.font('Helvetica-Bold')
         .fontSize(10)
         .text('DELIVERY & RECEIVING DETAILS', 50, currentY);

      currentY += 15;
      doc.font('Helvetica')
         .fontSize(9);
      if (order.deliveryInfo.trackingNumber) {
        doc.text(`Tracking Number: ${order.deliveryInfo.trackingNumber}`, 50, currentY);
        currentY += 13;
      }
      if (order.deliveryInfo.receivingSpot) {
        doc.text(`Receiving Spot: ${order.deliveryInfo.receivingSpot}`, 50, currentY);
        currentY += 13;
      }
      if (order.deliveryInfo.deliveryBoyName) {
        doc.text(`Delivery Executive: ${order.deliveryInfo.deliveryBoyName} (${order.deliveryInfo.deliveryBoyPhone || 'N/A'})`, 50, currentY);
        currentY += 13;
      }
      if (order.deliveryInfo.deliveryNotes) {
        doc.text(`Delivery Notes: ${order.deliveryInfo.deliveryNotes}`, 50, currentY);
      }
    }

    // Thank you footer
    doc.fillColor('#999999')
       .font('Helvetica-Oblique')
       .fontSize(9)
       .text('Thank you for choosing Rajyalaxmi Binding Works!', 50, 750, { align: 'center', width: 495 });

    doc.end();
  });
};

module.exports = { generateInvoicePDF };
