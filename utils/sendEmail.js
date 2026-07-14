const transporter = require('../config/email');

const sendEmail = async (to, subject, html, attachments = []) => {
  if (process.env.BREVO_API_KEY) {
    try {
      const fromEmail = process.env.BREVO_SENDER || 'rajyalaxmi.idsolutions@gmail.com';
      const attachmentPayload = [];
      if (attachments && attachments.length > 0) {
        for (const att of attachments) {
          attachmentPayload.push({
            name: att.filename,
            content: att.content.toString('base64'),
          });
        }
      }

      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': process.env.BREVO_API_KEY,
          'Content-Type': 'application/json',
          'accept': 'application/json',
        },
        body: JSON.stringify({
          sender: {
            name: 'Rajyalaxmi Binding Works',
            email: fromEmail,
          },
          to: [
            {
              email: to,
            }
          ],
          subject,
          htmlContent: html,
          attachment: attachmentPayload.length > 0 ? attachmentPayload : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Brevo API returned status ${response.status}`);
      }

      const data = await response.json();
      console.log(`[Brevo Email Sent] To: ${to}, Message ID: ${data.messageId}`);
    } catch (error) {
      console.error(`--- EMAIL SENDING FAILED (BREVO) ---`);
      console.error(`To: ${to}`);
      console.error(`Subject: ${subject}`);
      console.error(`Error: ${error.message}`);
      // Extract OTP if present in the HTML content
      const otpMatch = html.match(/>\s*([0-9]{4,6})\s*</);
      if (otpMatch) {
        console.log(`\n=========================================`);
        console.log(`[DEVELOPER NOTICE] GENERATED OTP FOR ${to} IS: ${otpMatch[1]}`);
        console.log(`=========================================\n`);
      }
      console.error(`----------------------------`);
    }
  } else if (process.env.RESEND_API_KEY) {
    try {
      const fromEmail = process.env.RESEND_FROM || 'onboarding@resend.dev';
      const attachmentsPayload = [];
      if (attachments && attachments.length > 0) {
        for (const att of attachments) {
          attachmentsPayload.push({
            filename: att.filename,
            content: att.content.toString('base64'),
          });
        }
      }

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `"Rajyalaxmi Binding Works" <${fromEmail}>`,
          to,
          subject,
          html,
          attachments: attachmentsPayload.length > 0 ? attachmentsPayload : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Resend API returned status ${response.status}`);
      }

      const data = await response.json();
      console.log(`[Resend Email Sent] To: ${to}, ID: ${data.id}`);
    } catch (error) {
      console.error(`--- EMAIL SENDING FAILED (RESEND) ---`);
      console.error(`To: ${to}`);
      console.error(`Subject: ${subject}`);
      console.error(`Error: ${error.message}`);
      // Extract OTP if present in the HTML content
      const otpMatch = html.match(/>\s*([0-9]{4,6})\s*</);
      if (otpMatch) {
        console.log(`\n=========================================`);
        console.log(`[DEVELOPER NOTICE] GENERATED OTP FOR ${to} IS: ${otpMatch[1]}`);
        console.log(`=========================================\n`);
      }
      console.error(`----------------------------`);
    }
  } else {
    const mailOptions = {
      from: `"Rajyalaxmi Binding Works" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
      attachments,
    };

    try {
      await transporter.sendMail(mailOptions);
    } catch (error) {
      console.error(`--- EMAIL SENDING FAILED (SMTP) ---`);
      console.error(`To: ${to}`);
      console.error(`Subject: ${subject}`);
      console.error(`Error: ${error.message}`);
      // Extract OTP if present in the HTML content
      const otpMatch = html.match(/>\s*([0-9]{4,6})\s*</);
      if (otpMatch) {
        console.log(`\n=========================================`);
        console.log(`[DEVELOPER NOTICE] GENERATED OTP FOR ${to} IS: ${otpMatch[1]}`);
        console.log(`=========================================\n`);
      }
      console.error(`----------------------------`);
    }
  }
};

const sendOTPEmail = async (email, otp, purpose) => {
  console.log(`\n=========================================`);
  console.log(`[DEVELOPER NOTICE] GENERATED OTP FOR ${email} IS: ${otp} (${purpose})`);
  console.log(`=========================================\n`);

  const subject = purpose === 'verification'
    ? 'Verify Your Email — Rajyalaxmi Binding Works'
    : purpose === 'emergency'
    ? 'Emergency Approval OTP — Rajyalaxmi Binding Works'
    : purpose === 'emergency_admin'
    ? 'Boss Admin Security OTP — Rajyalaxmi Binding Works'
    : 'Reset Your Password — Rajyalaxmi Binding Works';

  const html = `
    <div style="font-family: 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px; background: #FFFFFF;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #6D0F1A; font-size: 28px; margin: 0;">Rajyalaxmi Binding Works</h1>
      </div>
      <div style="background: #F8F8F8; border-radius: 18px; padding: 32px; text-align: center;">
        <h2 style="color: #222222; font-size: 20px; margin: 0 0 8px;">
          ${purpose === 'verification' ? 'Email Verification' : purpose === 'emergency' ? 'Emergency Approval Required' : purpose === 'emergency_admin' ? 'Admin Security Verification' : 'Password Reset'}
        </h2>
        <p style="color: #666; font-size: 14px; margin: 0 0 24px;">
          ${purpose === 'verification'
      ? 'Use the OTP below to verify your email address.'
      : purpose === 'emergency'
      ? 'Use the OTP below to approve the critical settings modification request.'
      : purpose === 'emergency_admin'
      ? 'Use the OTP below to verify and authorize settings modification from your admin account.'
      : 'Use the OTP below to reset your password.'}
        </p>
        <div style="background: #6D0F1A; color: #FFFFFF; font-size: 32px; font-weight: 700; letter-spacing: 8px; padding: 16px 32px; border-radius: 12px; display: inline-block;">
          ${otp}
        </div>
        <p style="color: #999; font-size: 12px; margin: 24px 0 0;">
          This OTP is valid for <strong>5 minutes</strong>. Do not share it with anyone.
        </p>
      </div>
      <p style="color: #BBB; font-size: 11px; text-align: center; margin-top: 24px;">
        If you didn't request this, please ignore this email.
      </p>
    </div>
  `;

  await sendEmail(email, subject, html);
};

// Sent when order is placed / product payment received (Step 2)
const sendOrderReceivedEmail = async (email, order) => {
  const itemsHtml = order.products.map(item => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #E8E8E8;">${item.name}</td>
      <td style="padding: 8px; border-bottom: 1px solid #E8E8E8; text-align: center;">${item.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #E8E8E8; text-align: right;">₹${item.price}</td>
    </tr>
  `).join('');

  const html = `
    <div style="font-family: 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; padding: 40px 24px; background: #FFFFFF;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #6D0F1A; font-size: 28px; margin: 0;">Rajyalaxmi Binding Works</h1>
      </div>
      <div style="background: #F8F8F8; border-radius: 18px; padding: 32px;">
        <h2 style="color: #222222; font-size: 20px; margin: 0 0 16px;">Order Received!</h2>
        <p style="color: #666; font-size: 14px;">Order ID: <strong>${order._id}</strong></p>
        <p style="color: #666; font-size: 14px;">Payment Method: <strong>${order.paymentMethod}</strong></p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <thead>
            <tr style="background: #6D0F1A; color: #FFF;">
              <th style="padding: 8px; text-align: left;">Item</th>
              <th style="padding: 8px; text-align: center;">Qty</th>
              <th style="padding: 8px; text-align: right;">Price</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
        </table>
        <p style="font-size: 18px; font-weight: 700; color: #6D0F1A; text-align: right; margin: 16px 0 0;">
          Product Total: ₹${order.productTotal}
        </p>
        <p style="color: #888; font-size: 13px; margin-top: 16px; padding: 12px; background: #FFF8E1; border-radius: 8px;">
          ⏳ Shipping charges will be calculated by our team based on your delivery location. You will be notified once set.
        </p>
      </div>
    </div>
  `;

  await sendEmail(email, `Order Received — #${order._id}`, html);
};

// Sent when admin sets shipping charge (Step 4)
const sendShippingChargeEmail = async (email, order) => {
  const html = `
    <div style="font-family: 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; padding: 40px 24px; background: #FFFFFF;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #6D0F1A; font-size: 28px; margin: 0;">Rajyalaxmi Binding Works</h1>
      </div>
      <div style="background: #F8F8F8; border-radius: 18px; padding: 32px;">
        <h2 style="color: #222222; font-size: 20px; margin: 0 0 16px;">Shipping Charge Updated!</h2>
        <p style="color: #666; font-size: 14px;">Order ID: <strong>${order._id}</strong></p>
        <div style="background: #FFFFFF; border-radius: 12px; padding: 20px; margin: 16px 0;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: #666;">Product Total:</span>
            <span style="font-weight: 600;">₹${order.productTotal}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: #666;">Shipping Charge:</span>
            <span style="font-weight: 600; color: #6D0F1A;">₹${order.shippingCharge}</span>
          </div>
          <div style="border-top: 2px solid #E8E8E8; padding-top: 8px; display: flex; justify-content: space-between;">
            <span style="font-weight: 700;">Grand Total:</span>
            <span style="font-weight: 700; color: #6D0F1A; font-size: 18px;">₹${order.totalPrice}</span>
          </div>
        </div>
        <p style="color: #444; font-size: 14px; margin-top: 16px; padding: 12px; background: #E3F2FD; border-radius: 8px;">
          ${order.paymentMethod === 'Razorpay'
      ? '💳 Please log in to your account and pay the shipping charge to confirm your order.'
      : '✅ Please log in to your account and accept the shipping charge to confirm your order (Cash on Delivery).'}
        </p>
      </div>
    </div>
  `;

  await sendEmail(email, `Shipping Charge Set — Order #${order._id}`, html);
};

// Sent when shipping is paid/accepted and order is fully confirmed (Step 6)
const sendOrderFinalConfirmationEmail = async (email, order) => {
  const itemsHtml = order.products.map(item => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #E8E8E8;">${item.name}</td>
      <td style="padding: 8px; border-bottom: 1px solid #E8E8E8; text-align: center;">${item.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #E8E8E8; text-align: right;">₹${item.price * item.quantity}</td>
    </tr>
  `).join('');

  const html = `
    <div style="font-family: 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; padding: 40px 24px; background: #FFFFFF;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #6D0F1A; font-size: 28px; margin: 0;">Rajyalaxmi Binding Works</h1>
      </div>
      <div style="background: #F8F8F8; border-radius: 18px; padding: 32px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="background: #E8F5E9; width: 56px; height: 56px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
            <span style="font-size: 28px;">✅</span>
          </div>
        </div>
        <h2 style="color: #222222; font-size: 20px; margin: 0 0 16px; text-align: center;">Order Confirmed!</h2>
        <p style="color: #666; font-size: 14px;">Order ID: <strong>${order._id}</strong></p>
        <p style="color: #666; font-size: 14px;">Payment: <strong>${order.paymentMethod}</strong></p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <thead>
            <tr style="background: #6D0F1A; color: #FFF;">
              <th style="padding: 8px; text-align: left;">Item</th>
              <th style="padding: 8px; text-align: center;">Qty</th>
              <th style="padding: 8px; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
        </table>
        <div style="background: #FFFFFF; border-radius: 12px; padding: 16px; margin: 16px 0;">
          <p style="margin: 4px 0; color: #666;">Product Total: <strong>₹${order.productTotal}</strong></p>
          <p style="margin: 4px 0; color: #666;">Shipping: <strong>₹${order.shippingCharge}</strong></p>
          <p style="margin: 8px 0 0; font-size: 18px; font-weight: 700; color: #6D0F1A;">Grand Total: ₹${order.totalPrice}</p>
        </div>
        <p style="color: #4CAF50; font-size: 14px; font-weight: 600; text-align: center; margin-top: 16px;">
          Your order is confirmed and being processed! 🎉
        </p>
      </div>
    </div>
  `;

  await sendEmail(email, `Order Confirmed — #${order._id}`, html);
};

// Sent to admin when an order is placed (Step 2/3)
const sendAdminOrderPlacedEmail = async (adminEmail, order) => {
  const itemsHtml = order.products.map(item => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #E8E8E8;">${item.name}</td>
      <td style="padding: 8px; border-bottom: 1px solid #E8E8E8; text-align: center;">${item.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #E8E8E8; text-align: right;">₹${item.price * item.quantity}</td>
    </tr>
  `).join('');

  const html = `
    <div style="font-family: 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; padding: 40px 24px; background: #FFFFFF;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #6D0F1A; font-size: 24px; margin: 0;">Rajyalaxmi Binding Works</h1>
        <p style="color: #666; font-size: 14px; margin: 4px 0 0;">Admin Order Notification</p>
      </div>
      <div style="background: #FFF8F8; border: 1px solid #FFCDD2; border-radius: 18px; padding: 32px;">
        <h2 style="color: #6D0F1A; font-size: 20px; margin: 0 0 16px;">New Order Placed! 🎉</h2>
        <p style="color: #333; font-size: 14px; margin: 0 0 8px;">Order ID: <strong>#${order._id}</strong></p>
        <p style="color: #333; font-size: 14px; margin: 0 0 16px;">Payment Method: <strong>${order.paymentMethod}</strong></p>
        
        <h3 style="color: #6D0F1A; font-size: 15px; margin: 24px 0 8px; border-bottom: 1px solid #FFCDD2; padding-bottom: 4px;">Customer Details</h3>
        <p style="color: #555; font-size: 13px; margin: 4px 0;"><strong>Name:</strong> ${order.shippingAddress.fullName}</p>
        <p style="color: #555; font-size: 13px; margin: 4px 0;"><strong>Phone:</strong> ${order.shippingAddress.phone}</p>
        <p style="color: #555; font-size: 13px; margin: 4px 0;"><strong>Email:</strong> ${order.shippingAddress.email}</p>
        ${order.shippingAddress.businessName ? `<p style="color: #555; font-size: 13px; margin: 4px 0;"><strong>Business:</strong> ${order.shippingAddress.businessName}</p>` : ''}
        ${order.shippingAddress.gstNumber ? `<p style="color: #555; font-size: 13px; margin: 4px 0;"><strong>GSTIN:</strong> ${order.shippingAddress.gstNumber}</p>` : ''}
        
        <h3 style="color: #6D0F1A; font-size: 15px; margin: 24px 0 8px; border-bottom: 1px solid #FFCDD2; padding-bottom: 4px;">Shipping Address</h3>
        <p style="color: #555; font-size: 13px; margin: 4px 0;">${order.shippingAddress.street}, ${order.shippingAddress.city}, ${order.shippingAddress.state} — ${order.shippingAddress.pincode}</p>

        <h3 style="color: #6D0F1A; font-size: 15px; margin: 24px 0 8px; border-bottom: 1px solid #FFCDD2; padding-bottom: 4px;">Order Summary</h3>
        <table style="width: 100%; border-collapse: collapse; margin: 12px 0;">
          <thead>
            <tr style="background: #6D0F1A; color: #FFF; font-size: 12px;">
              <th style="padding: 6px; text-align: left;">Item</th>
              <th style="padding: 6px; text-align: center;">Qty</th>
              <th style="padding: 6px; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody style="font-size: 12px;">${itemsHtml}</tbody>
        </table>
        
        <div style="background: #FFFFFF; border-radius: 12px; padding: 16px; margin: 16px 0; border: 1px solid #FFCDD2;">
          <p style="margin: 4px 0; color: #666; font-size: 13px;">Product Subtotal: <strong>₹${order.productTotal}</strong></p>
          <p style="margin: 4px 0; color: #666; font-size: 13px;">Shipping: <strong>₹${order.shippingCharge}</strong></p>
          <p style="margin: 8px 0 0; font-size: 16px; font-weight: 700; color: #6D0F1A;">Grand Total: ₹${order.totalPrice}</p>
        </div>
      </div>
    </div>
  `;

  await sendEmail(adminEmail, `[New Order] #${order._id.toString().toUpperCase()} - Rajyalaxmi Binding Works`, html);
};

// Sent to customer when order is marked Delivered, attaches the generated bill PDF
const sendOrderDeliveredEmailWithPdf = async (email, order, pdfBuffer) => {
  const deliveryInfo = order.deliveryInfo || {};
  
  const html = `
    <div style="font-family: 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; padding: 40px 24px; background: #FFFFFF;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #6D0F1A; font-size: 28px; margin: 0;">Rajyalaxmi Binding Works</h1>
        <p style="color: #888; font-size: 13px; margin: 4px 0 0;">Your Order Invoice & Delivery Details</p>
      </div>
      <div style="background: #F8F8F8; border-radius: 18px; padding: 32px; border-top: 4px solid #4CAF50;">
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="background: #E8F5E9; width: 56px; height: 56px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
            <span style="font-size: 28px;">📦</span>
          </div>
        </div>
        <h2 style="color: #222222; font-size: 20px; margin: 0 0 16px; text-align: center;">Your Order Has Been Delivered! 🎉</h2>
        <p style="color: #666; font-size: 14px;">Hi <strong>${order.shippingAddress.fullName}</strong>,</p>
        <p style="color: #666; font-size: 14px; line-height: 1.6;">We are pleased to inform you that your order has been successfully delivered. Please review your receiving details and the attached official invoice bill PDF.</p>
        
        <h3 style="color: #6D0F1A; font-size: 15px; margin: 24px 0 8px; border-bottom: 1px solid #E8E8E8; padding-bottom: 4px;">Delivery Address</h3>
        <p style="color: #555; font-size: 13px; margin: 4px 0; line-height: 1.5;">
          ${order.shippingAddress.street},<br/>
          ${order.shippingAddress.city}, ${order.shippingAddress.state} — ${order.shippingAddress.pincode}
        </p>

        <h3 style="color: #6D0F1A; font-size: 15px; margin: 24px 0 8px; border-bottom: 1px solid #E8E8E8; padding-bottom: 4px;">Receiving Details</h3>
        ${deliveryInfo.receivingSpot ? `<p style="color: #555; font-size: 13px; margin: 4px 0;"><strong>📍 Receiving Spot:</strong> ${deliveryInfo.receivingSpot}</p>` : ''}
        ${deliveryInfo.trackingNumber ? `<p style="color: #555; font-size: 13px; margin: 4px 0;"><strong>📦 Tracking ID:</strong> ${deliveryInfo.trackingNumber}</p>` : ''}
        ${deliveryInfo.deliveryBoyName ? `<p style="color: #555; font-size: 13px; margin: 4px 0;"><strong>👤 Delivery Person:</strong> ${deliveryInfo.deliveryBoyName} ${deliveryInfo.deliveryBoyPhone ? `(${deliveryInfo.deliveryBoyPhone})` : ''}</p>` : ''}
        ${deliveryInfo.deliveryNotes ? `<p style="color: #555; font-size: 13px; margin: 4px 0;"><strong>📝 Delivery Notes:</strong> ${deliveryInfo.deliveryNotes}</p>` : ''}

        <div style="background: #E8F5E9; border-radius: 12px; padding: 16px; margin: 24px 0 16px; text-align: center; border: 1px solid #C8E6C9;">
          <p style="margin: 0; color: #2E7D32; font-weight: 600; font-size: 14px;">📄 Your custom bill invoice PDF is attached to this email.</p>
        </div>

        <p style="color: #666; font-size: 13px; text-align: center; margin-top: 24px;">
          For any support or query, please reach out to us at <strong>support.rajyalaxmibindingworks@gmail.com</strong>.
        </p>
      </div>
    </div>
  `;

  const attachments = [
    {
      filename: `Invoice_RBW_${order._id.toString().slice(-8).toUpperCase()}.pdf`,
      content: pdfBuffer,
    }
  ];

  await sendEmail(email, `Order Delivered & Invoice — #${order._id.toString().slice(-8).toUpperCase()}`, html, attachments);
};

module.exports = {
  sendEmail,
  sendOTPEmail,
  sendOrderReceivedEmail,
  sendShippingChargeEmail,
  sendOrderFinalConfirmationEmail,
  sendAdminOrderPlacedEmail,
  sendOrderDeliveredEmailWithPdf
};
