import { Resend } from 'resend';
import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { IOrder } from '../models/Order';
import { User } from '../models/User';

export interface SendOtpOptions {
  to: string;
  otp: string;
  userName?: string;
}

export interface SendWelcomeOptions {
  to: string;
  userName?: string;
}

export interface SendOrderConfirmationOptions {
  to: string;
  order: IOrder;
  userName?: string;
}

export interface SendOrderStatusOptions {
  to: string;
  order: IOrder;
  status: string;
  userName?: string;
  note?: string;
}

export interface SendOrderNotificationOptions {
  order: IOrder;
  event: 'confirmed' | 'status_update';
  statusNote?: string;
}

export class EmailService {
  private static resendClient: Resend | null = null;
  private static smtpTransporter: Transporter | null = null;

  private static getResendClient(): Resend | null {
    if (this.resendClient) return this.resendClient;
    if (env.RESEND_API_KEY && env.RESEND_API_KEY.trim() !== '') {
      this.resendClient = new Resend(env.RESEND_API_KEY.trim());
      return this.resendClient;
    }
    return null;
  }

  private static getSmtpTransporter(): Transporter | null {
    if (this.smtpTransporter) return this.smtpTransporter;

    if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) {
      return null;
    }

    try {
      this.smtpTransporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: parseInt(env.SMTP_PORT, 10) || 587,
        secure: env.SMTP_PORT === '465',
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS
        }
      });
      return this.smtpTransporter;
    } catch (err: any) {
      logger.error(`[EMAIL SERVICE] Failed to initialize SMTP transporter: ${err.message}`);
      return null;
    }
  }

  /**
   * Generic sender with Resend primary, SMTP fallback, and console simulation
   */
  private static async sendEmail({
    to,
    subject,
    html,
    text
  }: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<{ sent: boolean; message: string }> {
    // 1. Primary: Resend API
    const resend = this.getResendClient();
    if (resend) {
      try {
        const fromAddress = env.RESEND_FROM_EMAIL || 'LocaBite <onboarding@resend.dev>';
        const result = await resend.emails.send({
          from: fromAddress,
          to: [to],
          subject,
          text,
          html
        });

        if (result.error) {
          logger.error(`[RESEND SERVICE] Error sending email to ${to}: ${result.error.message}`);
          // If Resend free tier error (only send to account owner), log clearly
          if (result.error.message.includes('only send testing emails')) {
            logger.warn(
              `[RESEND SERVICE] Tip: Resend free tier with onboarding@resend.dev restricts delivery to the account owner's email. Verify a domain at resend.com/domains to send to all addresses.`
            );
          }
        } else {
          logger.info(`[RESEND SERVICE] Email "${subject}" delivered to ${to} (ID: ${result.data?.id})`);
          return { sent: true, message: `Email delivered to ${to} via Resend` };
        }
      } catch (err: any) {
        logger.error(`[RESEND SERVICE] Exception sending email to ${to}: ${err.message}`);
      }
    }

    // 2. Secondary fallback: SMTP
    const smtp = this.getSmtpTransporter();
    if (smtp) {
      try {
        const info = await smtp.sendMail({
          from: env.SMTP_FROM,
          to,
          subject,
          text,
          html
        });
        logger.info(`[SMTP SERVICE] Email "${subject}" delivered to ${to} (MessageID: ${info.messageId})`);
        return { sent: true, message: `Email delivered to ${to} via SMTP` };
      } catch (err: any) {
        logger.error(`[SMTP SERVICE] Failed to send email to ${to}: ${err.message}`);
      }
    }

    // 3. Fallback when credentials are absent or restricted
    logger.warn(`[EMAIL SERVICE] Simulated email dispatch to <${to}>: "${subject}"`);
    return {
      sent: false,
      message: 'Email processed (logged to server console in development)'
    };
  }

  // -------------------------------------------------------------
  // HTML EMAIL TEMPLATES
  // -------------------------------------------------------------

  /**
   * 1. Branded HTML email template for OTP Verification
   */
  private static getOtpTemplate(otp: string, userName?: string): string {
    const greeting = userName ? `Hi ${userName},` : 'Hello,';
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>LocaBite Verification Code</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f7f6; margin: 0; padding: 0; }
          .container { max-width: 540px; margin: 30px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
          .header { background: linear-gradient(135deg, #FF5722 0%, #E64A19 100%); padding: 32px 24px; text-align: center; }
          .header h1 { color: #ffffff; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px; }
          .header p { color: #ffe0b2; margin: 6px 0 0; font-size: 14px; }
          .content { padding: 32px 28px; color: #2d3748; }
          .greeting { font-size: 16px; font-weight: 600; margin-bottom: 12px; }
          .message { font-size: 14px; line-height: 1.6; color: #4a5568; margin-bottom: 24px; }
          .otp-box { background: #fff5ee; border: 2px dashed #ff7043; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
          .otp-code { font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #d84315; font-family: 'SFMono-Regular', Consolas, monospace; }
          .otp-sub { font-size: 12px; color: #8d6e63; margin-top: 8px; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #a0aec0; border-top: 1px solid #edf2f7; background: #fafafa; }
          .badge { display: inline-block; background: #e0f2fe; color: #0284c7; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>LocaBite</h1>
            <p>Campus Food & Fast Mart Express</p>
          </div>
          <div class="content">
            <span class="badge">Security Verification</span>
            <div class="greeting">${greeting}</div>
            <p class="message">
              You requested a verification code to sign in or confirm your account on LocaBite. Use the one-time code below to complete your verification:
            </p>
            <div class="otp-box">
              <div class="otp-code">${otp}</div>
              <div class="otp-sub">This code is valid for 10 minutes. Never share this code with anyone.</div>
            </div>
            <p class="message" style="font-size: 13px; color: #718096;">
              If you did not request this OTP, you can safely ignore this email. Your account remains secure.
            </p>
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} LocaBite Technologies. Quantum University Campus Services.
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * 2. Branded HTML email template for Welcome Email
   */
  private static getWelcomeTemplate(userName?: string): string {
    const greeting = userName ? `Hi ${userName}!` : 'Hey there!';
    const appUrl = env.CLIENT_URL || 'http://localhost:5173';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to LocaBite Campus</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f7f6; margin: 0; padding: 0; }
          .container { max-width: 560px; margin: 30px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
          .header { background: linear-gradient(135deg, #FF5722 0%, #E64A19 100%); padding: 36px 24px; text-align: center; }
          .header h1 { color: #ffffff; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px; }
          .header p { color: #ffe0b2; margin: 8px 0 0; font-size: 15px; }
          .content { padding: 32px 28px; color: #2d3748; }
          .greeting { font-size: 20px; font-weight: 700; color: #1a202c; margin-bottom: 12px; }
          .intro { font-size: 14px; line-height: 1.6; color: #4a5568; margin-bottom: 24px; }
          .perk-grid { margin: 20px 0; }
          .perk-card { display: flex; align-items: flex-start; background: #fafafa; border: 1px solid #edf2f7; border-radius: 12px; padding: 14px 16px; margin-bottom: 12px; }
          .perk-icon { font-size: 24px; margin-right: 14px; line-height: 1.2; }
          .perk-title { font-weight: 700; font-size: 14px; color: #2d3748; margin-bottom: 2px; }
          .perk-desc { font-size: 12px; color: #718096; line-height: 1.4; }
          .promo-box { background: linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%); border: 2px dashed #FF9800; border-radius: 12px; padding: 18px; text-align: center; margin: 24px 0; }
          .promo-title { font-size: 12px; font-weight: 700; color: #E65100; text-transform: uppercase; letter-spacing: 1px; }
          .promo-code { font-size: 24px; font-weight: 800; color: #BF360C; letter-spacing: 3px; margin: 6px 0; }
          .promo-sub { font-size: 12px; color: #D84315; }
          .cta-btn { display: block; width: fit-content; margin: 26px auto 10px; background: #FF5722; color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 30px; font-weight: 700; font-size: 15px; box-shadow: 0 4px 14px rgba(255, 87, 34, 0.35); text-align: center; }
          .footer { padding: 22px; text-align: center; font-size: 12px; color: #a0aec0; border-top: 1px solid #edf2f7; background: #fafafa; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>LocaBite</h1>
            <p>Welcome to Quantum University Campus Express! 🍕</p>
          </div>
          <div class="content">
            <div class="greeting">${greeting} Welcome to LocaBite!</div>
            <p class="intro">
              Your official student account is all set up. Craving late-night study munchies, hot cafeteria specials, or quick grocery items delivered directly to your hostel room? We've got you covered in 10 minutes flat!
            </p>

            <div class="perk-grid">
              <div class="perk-card">
                <div class="perk-icon">⚡</div>
                <div>
                  <div class="perk-title">10-Min Dark Store Grocery</div>
                  <div class="perk-desc">Chilled sodas, instant noodles, stationery, toiletries, and snacks delivered lightning fast.</div>
                </div>
              </div>
              <div class="perk-card">
                <div class="perk-icon">🍔</div>
                <div>
                  <div class="perk-title">All Campus Eateries in One Place</div>
                  <div class="perk-desc">Order from campus cafeterias, juice centers, and local partner kitchens with live tray tracking.</div>
                </div>
              </div>
              <div class="perk-card">
                <div class="perk-icon">📍</div>
                <div>
                  <div class="perk-title">Direct Hostel Dorm Drop</div>
                  <div class="perk-desc">Live driver GPS map and secure 4-digit handover OTP so your food reaches the right hands.</div>
                </div>
              </div>
            </div>

            <div class="promo-box">
              <div class="promo-title">🎁 Exclusive Student Welcome Offer</div>
              <div class="promo-code">WELCOME50</div>
              <div class="promo-sub">Flat 50% OFF (up to ₹100) on your very first order. Use coupon at checkout!</div>
            </div>

            <a href="${appUrl}" class="cta-btn">Start Exploring Food & Mart &rarr;</a>
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} LocaBite Technologies • Quantum University Campus Express Services.
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * 3. Branded HTML email template for Order Confirmation & Receipt
   */
  private static getOrderConfirmationTemplate(order: IOrder, userName?: string): string {
    const greeting = userName ? `Hi ${userName},` : 'Hello,';
    const appUrl = env.CLIENT_URL || 'http://localhost:5173';
    const trackUrl = `${appUrl}/orders/${order.id || order.orderNumber}`;

    const itemsHtml = (order.items || [])
      .map(item => {
        const dietaryBadge =
          item.dietary === 'veg'
            ? '<span style="color:#2e7d32; font-size:11px; font-weight:700; background:#e8f5e9; padding:2px 6px; border-radius:4px; margin-right:6px;">VEG</span>'
            : '<span style="color:#c62828; font-size:11px; font-weight:700; background:#ffebee; padding:2px 6px; border-radius:4px; margin-right:6px;">NON-VEG</span>';

        const customizationText = item.customizations?.size?.name
          ? `<div style="font-size:11px; color:#718096; margin-top:2px;">Size: ${item.customizations.size.name}</div>`
          : '';

        const itemSubtotal = (Number(item.price) || 0) * (Number(item.quantity) || 1);

        return `
          <tr style="border-bottom: 1px solid #edf2f7;">
            <td style="padding: 12px 0;">
              ${dietaryBadge}
              <strong style="color: #2d3748; font-size: 13px;">${item.name}</strong>
              ${customizationText}
            </td>
            <td style="padding: 12px 0; text-align: center; color: #4a5568; font-size: 13px;">
              × ${item.quantity}
            </td>
            <td style="padding: 12px 0; text-align: right; color: #2d3748; font-weight: 700; font-size: 13px;">
              ₹${itemSubtotal}
            </td>
          </tr>
        `;
      })
      .join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Confirmed #${order.orderNumber}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f7f6; margin: 0; padding: 0; }
          .container { max-width: 560px; margin: 30px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
          .header { background: linear-gradient(135deg, #FF5722 0%, #E64A19 100%); padding: 30px 24px; text-align: center; }
          .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
          .header p { color: #ffe0b2; margin: 6px 0 0; font-size: 14px; }
          .content { padding: 30px 26px; color: #2d3748; }
          .badge { display: inline-block; background: #e8f5e9; color: #2e7d32; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase; margin-bottom: 12px; }
          .hero-box { background: #fff5ee; border: 1px solid #ffd8cc; border-radius: 12px; padding: 18px; margin: 16px 0 24px; }
          .meta-grid { display: flex; justify-content: space-between; border-bottom: 1px dashed #ffd8cc; padding-bottom: 12px; margin-bottom: 12px; }
          .meta-col { flex: 1; }
          .meta-label { font-size: 11px; text-transform: uppercase; color: #8d6e63; font-weight: 700; }
          .meta-val { font-size: 15px; font-weight: 700; color: #d84315; margin-top: 2px; }
          .otp-banner { background: #ffffff; border: 2px dashed #ff7043; border-radius: 8px; padding: 10px 14px; text-align: center; margin-top: 10px; }
          .otp-banner strong { font-size: 20px; letter-spacing: 4px; color: #d84315; font-family: monospace; }
          .table-title { font-size: 14px; font-weight: 700; color: #1a202c; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
          .items-table { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
          .summary-table { width: 100%; border-collapse: collapse; margin-top: 12px; border-top: 2px solid #edf2f7; }
          .summary-row td { padding: 6px 0; font-size: 13px; color: #4a5568; }
          .summary-row.total td { padding: 10px 0; font-size: 16px; font-weight: 800; color: #1a202c; border-top: 1px solid #e2e8f0; }
          .address-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; margin: 20px 0; font-size: 13px; color: #4a5568; line-height: 1.5; }
          .cta-btn { display: block; width: fit-content; margin: 24px auto 8px; background: #FF5722; color: #ffffff !important; text-decoration: none; padding: 13px 28px; border-radius: 30px; font-weight: 700; font-size: 14px; box-shadow: 0 4px 14px rgba(255, 87, 34, 0.35); text-align: center; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #a0aec0; border-top: 1px solid #edf2f7; background: #fafafa; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>LocaBite</h1>
            <p>Order Confirmed & Sent to Kitchen! 🍳</p>
          </div>
          <div class="content">
            <span class="badge">● Kitchen Preparing</span>
            <div style="font-size: 16px; font-weight: 600; margin-bottom: 8px;">${greeting}</div>
            <p style="font-size: 14px; line-height: 1.5; color: #4a5568; margin: 0 0 16px;">
              Thank you for ordering with LocaBite! Your order <strong>#${order.orderNumber}</strong> has been received by the kitchen and is being freshly prepared.
            </p>

            <div class="hero-box">
              <table style="width: 100%;">
                <tr>
                  <td style="width: 50%;">
                    <div class="meta-label">Order Number</div>
                    <div class="meta-val">#${order.orderNumber}</div>
                  </td>
                  <td style="width: 50%; text-align: right;">
                    <div class="meta-label">Est. Arrival</div>
                    <div class="meta-val">${order.estimatedArrival || '15–20 mins'}</div>
                  </td>
                </tr>
              </table>

              <div class="otp-banner">
                <span style="font-size: 11px; text-transform: uppercase; color: #8d6e63; display: block;">Driver Handover OTP</span>
                <strong>${order.otpOnArrival}</strong>
                <span style="font-size: 10px; color: #a0aec0; display: block; margin-top: 2px;">Share this code with your rider upon arrival</span>
              </div>
            </div>

            <div class="table-title">Order Items</div>
            <table class="items-table">
              ${itemsHtml}
            </table>

            <table class="summary-table">
              <tr class="summary-row">
                <td>Item Subtotal</td>
                <td style="text-align: right;">₹${order.itemTotal}</td>
              </tr>
              <tr class="summary-row">
                <td>Delivery Fee</td>
                <td style="text-align: right;">${order.deliveryFee === 0 ? '<span style="color:#2e7d32; font-weight:700;">FREE</span>' : `₹${order.deliveryFee}`}</td>
              </tr>
              <tr class="summary-row">
                <td>Taxes & Campus Handling</td>
                <td style="text-align: right;">₹${order.taxesAndHandling}</td>
              </tr>
              ${
                order.discount && order.discount > 0
                  ? `
                <tr class="summary-row" style="color: #2e7d32;">
                  <td>Promo Discount (${order.appliedPromo || 'Coupon'})</td>
                  <td style="text-align: right; font-weight: 700;">-₹${order.discount}</td>
                </tr>
              `
                  : ''
              }
              <tr class="summary-row total">
                <td>Total Amount Paid</td>
                <td style="text-align: right; color: #d84315;">₹${order.totalToPay}</td>
              </tr>
              <tr class="summary-row">
                <td style="font-size: 11px; color: #a0aec0;">Payment Method</td>
                <td style="text-align: right; font-size: 11px; color: #a0aec0;">${order.paymentMethod || 'UPI'}</td>
              </tr>
            </table>

            <div class="address-card">
              <strong style="color: #1a202c; display: block; margin-bottom: 4px;">📍 Delivery Location</strong>
              ${order.deliveryAddress?.building || 'Campus Residence'}, Room ${order.deliveryAddress?.room || 'Ground Floor'}<br>
              ${order.deliveryAddress?.campus || 'Quantum University Campus'}<br>
              <em style="color: #718096; font-size: 12px;">Drop Note: "${order.deliveryInstructions || 'Leave at door'}"</em>
            </div>

            <a href="${trackUrl}" class="cta-btn">Track Order Live on Map &rarr;</a>
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} LocaBite Technologies • Quantum University Campus Express.
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * 4. Branded HTML email template for Milestone Status Updates
   */
  private static getOrderStatusTemplate(order: IOrder, status: string, userName?: string, note?: string): string {
    const greeting = userName ? `Hi ${userName},` : 'Hello,';
    const appUrl = env.CLIENT_URL || 'http://localhost:5173';
    const trackUrl = `${appUrl}/orders/${order.id || order.orderNumber}`;

    let statusTitle = `Order Status: ${status.toUpperCase()}`;
    let statusBadgeColor = '#0284c7';
    let statusBadgeBg = '#e0f2fe';
    let statusEmoji = '📦';
    let messageBody = `Your order #${order.orderNumber} status has been updated to: <strong>${status}</strong>.`;

    if (status === 'out_for_delivery') {
      statusTitle = 'Out for Delivery! 🛵';
      statusBadgeColor = '#d97706';
      statusBadgeBg = '#fef3c7';
      statusEmoji = '🚀';
      messageBody = `Rider <strong>${order.driver?.name || 'Campus Partner'}</strong> (${order.driver?.vehicleNumber || 'Electric Moped'}) has picked up your order and is heading towards <strong>${order.deliveryAddress?.building || 'your building'}</strong>!`;
    } else if (status === 'delivered') {
      statusTitle = 'Delivered! Enjoy your meal 🍽️';
      statusBadgeColor = '#15803d';
      statusBadgeBg = '#dcfce7';
      statusEmoji = '✅';
      messageBody = `Your order #${order.orderNumber} has been successfully delivered to <strong>${order.deliveryAddress?.building || 'your location'}</strong>. We hope you love your food!`;
    } else if (status === 'cancelled') {
      statusTitle = 'Order Cancelled';
      statusBadgeColor = '#b91c1c';
      statusBadgeBg = '#fee2e2';
      statusEmoji = '⚠️';
      messageBody = `Your order #${order.orderNumber} has been cancelled. ${note ? `Reason: ${note}.` : ''} If payment was deducted online, the refund will be credited back automatically.`;
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${statusTitle}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f7f6; margin: 0; padding: 0; }
          .container { max-width: 560px; margin: 30px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
          .header { background: linear-gradient(135deg, #FF5722 0%, #E64A19 100%); padding: 30px 24px; text-align: center; }
          .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
          .header p { color: #ffe0b2; margin: 6px 0 0; font-size: 14px; }
          .content { padding: 30px 26px; color: #2d3748; }
          .status-badge { display: inline-block; background: ${statusBadgeBg}; color: ${statusBadgeColor}; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase; margin-bottom: 14px; }
          .hero-box { background: #fafafa; border: 1px solid #edf2f7; border-radius: 12px; padding: 18px; margin: 20px 0; }
          .otp-banner { background: #fff5ee; border: 2px dashed #ff7043; border-radius: 10px; padding: 14px; text-align: center; margin: 16px 0; }
          .otp-banner strong { font-size: 24px; letter-spacing: 6px; color: #d84315; font-family: monospace; }
          .cta-btn { display: block; width: fit-content; margin: 24px auto 8px; background: #FF5722; color: #ffffff !important; text-decoration: none; padding: 13px 28px; border-radius: 30px; font-weight: 700; font-size: 14px; box-shadow: 0 4px 14px rgba(255, 87, 34, 0.35); text-align: center; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #a0aec0; border-top: 1px solid #edf2f7; background: #fafafa; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>LocaBite</h1>
            <p>Campus Order Live Notification ${statusEmoji}</p>
          </div>
          <div class="content">
            <span class="status-badge">${statusTitle}</span>
            <div style="font-size: 16px; font-weight: 600; margin-bottom: 8px;">${greeting}</div>
            <p style="font-size: 14px; line-height: 1.6; color: #4a5568; margin-bottom: 16px;">
              ${messageBody}
            </p>

            ${
              status === 'out_for_delivery'
                ? `
              <div class="otp-banner">
                <span style="font-size: 12px; text-transform: uppercase; color: #8d6e63; font-weight: 700; display: block; margin-bottom: 4px;">Driver Verification OTP</span>
                <strong>${order.otpOnArrival}</strong>
                <span style="font-size: 11px; color: #718096; display: block; margin-top: 4px;">Handover code for rider ${order.driver?.name || 'Rider'}</span>
              </div>
            `
                : ''
            }

            <div class="hero-box">
              <div style="font-size: 12px; text-transform: uppercase; color: #718096; font-weight: 700; margin-bottom: 4px;">Order Summary</div>
              <div style="font-size: 14px; font-weight: 700; color: #1a202c;">Order #${order.orderNumber} • ₹${order.totalToPay}</div>
              <div style="font-size: 12px; color: #718096; margin-top: 4px;">${order.items?.length || 0} item(s) to ${order.deliveryAddress?.building || 'Hostel'}</div>
            </div>

            <a href="${trackUrl}" class="cta-btn">View Order Details &rarr;</a>
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} LocaBite Technologies • Quantum University Campus Express.
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // -------------------------------------------------------------
  // PUBLIC DISPATCH METHODS
  // -------------------------------------------------------------

  /**
   * 1. Send OTP Verification Email
   */
  static async sendOtpEmail({ to, otp, userName }: SendOtpOptions): Promise<{ sent: boolean; message: string }> {
    const htmlContent = this.getOtpTemplate(otp, userName);
    const textContent = `Your LocaBite verification code is: ${otp}. It is valid for 10 minutes.`;
    const subject = `LocaBite Verification Code: ${otp}`;

    return this.sendEmail({
      to,
      subject,
      html: htmlContent,
      text: textContent
    });
  }

  /**
   * 2. Send Welcome Email to New Students / Users
   */
  static async sendWelcomeEmail({ to, userName }: SendWelcomeOptions): Promise<{ sent: boolean; message: string }> {
    const htmlContent = this.getWelcomeTemplate(userName);
    const textContent = `Welcome to LocaBite Campus, ${userName || 'Foodie'}! Use coupon WELCOME50 for 50% off your first order.`;
    const subject = `Welcome to LocaBite, ${userName || 'Foodie'}! 🍕 Your Campus Express Access`;

    return this.sendEmail({
      to,
      subject,
      html: htmlContent,
      text: textContent
    });
  }

  /**
   * 3. Send Order Confirmation Email (Digital Receipt)
   */
  static async sendOrderConfirmationEmail({
    to,
    order,
    userName
  }: SendOrderConfirmationOptions): Promise<{ sent: boolean; message: string }> {
    const htmlContent = this.getOrderConfirmationTemplate(order, userName);
    const textContent = `Order Confirmed: #${order.orderNumber}. Total ₹${order.totalToPay}. Arrival OTP: ${order.otpOnArrival}. Estimated arrival: ${order.estimatedArrival}.`;
    const subject = `Order Confirmed: #${order.orderNumber} 🎉 | LocaBite Campus Express`;

    return this.sendEmail({
      to,
      subject,
      html: htmlContent,
      text: textContent
    });
  }

  /**
   * 4. Send Order Status Milestone Updates
   */
  static async sendOrderStatusUpdateEmail({
    to,
    order,
    status,
    userName,
    note
  }: SendOrderStatusOptions): Promise<{ sent: boolean; message: string }> {
    const htmlContent = this.getOrderStatusTemplate(order, status, userName, note);
    let subject = `Order Update: #${order.orderNumber} is ${status}`;
    if (status === 'out_for_delivery') {
      subject = `🛵 On the Way! Order #${order.orderNumber} is Out for Delivery (OTP: ${order.otpOnArrival})`;
    } else if (status === 'delivered') {
      subject = `✅ Order Delivered: #${order.orderNumber} | Enjoy your meal!`;
    } else if (status === 'cancelled') {
      subject = `⚠️ Order #${order.orderNumber} Cancelled`;
    }

    const textContent = `Your order #${order.orderNumber} status is now: ${status}. ${note || ''}`;

    return this.sendEmail({
      to,
      subject,
      html: htmlContent,
      text: textContent
    });
  }

  /**
   * 5. Helper to automatically resolve recipient and dispatch order confirmation or milestone updates
   */
  static async sendOrderNotification({ order, event, statusNote }: SendOrderNotificationOptions): Promise<void> {
    try {
      let recipientEmail = (order.deliveryAddress as any)?.email;
      let customerName = (order.deliveryAddress as any)?.title || 'Campus Member';

      // Look up user from database if email isn't on the delivery address
      if (!recipientEmail && order.userId && order.userId !== 'guest-session') {
        try {
          const user = await User.findById(order.userId);
          if (user) {
            recipientEmail = user.email;
            customerName = user.name || customerName;
          }
        } catch {
          // If userId is not ObjectId, find by phone or custom id
          const user = await User.findOne({
            $or: [{ phone: order.userId }, { id: order.userId } as any]
          });
          if (user) {
            recipientEmail = user.email;
            customerName = user.name || customerName;
          }
        }
      }

      if (!recipientEmail || !recipientEmail.includes('@')) {
        logger.debug(
          `[EMAIL SERVICE] No recipient email found for order #${order.orderNumber}, skipping email dispatch.`
        );
        return;
      }

      if (event === 'confirmed') {
        await this.sendOrderConfirmationEmail({
          to: recipientEmail,
          order,
          userName: customerName
        });
      } else if (event === 'status_update') {
        await this.sendOrderStatusUpdateEmail({
          to: recipientEmail,
          order,
          status: order.status,
          userName: customerName,
          note: statusNote
        });
      }
    } catch (err: any) {
      logger.error(
        `[EMAIL SERVICE] Failed to process order notification email for #${order.orderNumber}: ${err.message}`
      );
    }
  }
}
