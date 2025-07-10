// backend/emailService.js
const nodemailer = require('nodemailer');

// Die HTML-Vorlagen aus den separaten Dateien importieren
const { getRegistrationHtml } = require('./email-templates/registrationTemplate');
const { getPasswordResetHtml } = require('./email-templates/passwordResetTemplate');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false, 
  requireTLS: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000,
});

/**
 * Sendet die Registrierungs-E-Mail an einen neuen Benutzer.
 */
const sendRegistrationEmail = async (userEmail, username) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: userEmail,
    subject: 'Willkommen bei der Robby the Robb DJ APP!',
    html: getRegistrationHtml(username),
  };

  try {
    await transporter.verify();
    await transporter.sendMail(mailOptions);
    console.log(`Registrierungs-E-Mail an ${userEmail} gesendet.`);
  } catch (error) {
    console.error(`Fehler beim Senden der Registrierungs-E-Mail an ${userEmail}:`, error);
  }
};

/**
 * NEU: Sendet die Passwort-Reset-E-Mail.
 * @param {string} userEmail - Die E-Mail-Adresse des Empfängers.
 * @param {string} resetUrl - Die URL zum Zurücksetzen des Passworts.
 */
const sendPasswordResetEmail = async (userEmail, resetUrl) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: userEmail,
    subject: 'Dein Link zum Zurücksetzen des Passworts',
    html: getPasswordResetHtml(resetUrl),
  };

  try {
    await transporter.verify();
    await transporter.sendMail(mailOptions);
    console.log(`Passwort-Reset-E-Mail an ${userEmail} gesendet.`);
  } catch (error) {
    console.error(`Fehler beim Senden der Passwort-Reset-E-Mail an ${userEmail}:`, error);
  }
};


module.exports = { sendRegistrationEmail, sendPasswordResetEmail };
