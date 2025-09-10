const nodemailer = require('nodemailer');

function makeTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: process.env.SMTP_USER && process.env.SMTP_PASS ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
}

async function sendMail({ to, subject, html }) {
  const transporter = makeTransport();
  await transporter.sendMail({ from: process.env.SMTP_FROM || 'no-reply@example.com', to, subject, html });
}

async function sendMailWithAttachments({ to, subject, html, attachments }) {
  const transporter = makeTransport();
  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'no-reply@example.com',
    to,
    subject,
    html,
    attachments,
  });
}

module.exports = { sendMail, sendMailWithAttachments };




