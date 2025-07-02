// services/mailService.js
require('dotenv').config();
const nodemailer = require('nodemailer');

let _transporter;

/**
 * Lazily create & verify a transporter.
 * First attempts SSL on 465, then STARTTLS on 587.
 */
async function _getTransporter() {
  if (_transporter) return _transporter;

  const baseOpts = {
    auth: {
      user: process.env.MAIL_USERNAME,
      pass: process.env.MAIL_PASSWORD,
    },
    connectionTimeout: 20000,
    greetingTimeout:   20000,
    socketTimeout:     20000,
    logger:            true,
    debug:             true,
    tls: { rejectUnauthorized: false },
  };

  // 1) Try SSL/TLS on port 465
  try {
    let opts465 = {
      ...baseOpts,
      host:   process.env.MAIL_HOST,
      port:   Number(process.env.MAIL_PORT) || 465,
      secure: true,
    };
    let t465 = nodemailer.createTransport(opts465);
    await t465.verify();
    console.log('✅ SMTP connected via 465/SSL');
    _transporter = t465;
    return _transporter;
  } catch (err) {
    console.warn('⚠️ 465/SSL failed, falling back to 587/STARTTLS:', err.message);
  }

  // 2) Fallback to STARTTLS on port 587
  let opts587 = {
    ...baseOpts,
    host:       process.env.MAIL_HOST,
    port:       587,
    secure:     false,
    requireTLS: true,
  };
  let t587 = nodemailer.createTransport(opts587);
  await t587.verify();
  console.log('✅ SMTP connected via 587/STARTTLS');
  _transporter = t587;
  return _transporter;
}

/**
 * Send a one-off auto-reply.
 */
async function sendAutoReply(to, text) {
  // normalize to a single address
  let recipient = Array.isArray(to)
    ? to[0]
    : (typeof to === 'string' && to.includes(','))
      ? to.split(',')[0].trim()
      : to;

  if (!recipient) {
    console.error('❌ sendAutoReply: no valid recipient:', to);
    return;
  }

  try {
    const transporter = await _getTransporter();
    const info = await transporter.sendMail({
      from:    `"${process.env.MAIL_FROM_NAME}" <${process.env.MAIL_FROM_ADDRESS}>`,
      to:       recipient,
      subject: 'Re: Your HR Query',
      text,
      // force envelope to prevent CC/BCC leakage
      envelope: {
        from: process.env.MAIL_FROM_ADDRESS,
        to:   recipient,
      },
    });
    console.log(`✅ Auto-reply sent to ${recipient} — ${info.response}`);
  } catch (err) {
    console.error('❌ sendAutoReply error:', err);
  }
}

module.exports = { sendAutoReply };