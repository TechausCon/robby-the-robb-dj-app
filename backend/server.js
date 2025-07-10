// backend/server.js

const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
require('dotenv').config();

// KORREKTUR: Beide E-Mail-Funktionen importieren
const { sendRegistrationEmail, sendPasswordResetEmail } = require('./emailService');

const app = express();
app.use(cors()); 
app.use(express.json()); 

const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET;

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Registrierungs-Endpunkt (unverändert)
app.post('/api/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) return res.status(400).json({ msg: 'Bitte alle Felder ausfüllen.' });
  try {
    const [existingUsers] = await db.query('SELECT id FROM users WHERE username = ? OR email = ?', [username, email]);
    if (existingUsers.length > 0) return res.status(400).json({ msg: 'Benutzername oder E-Mail bereits vergeben.' });
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const [newUserResult] = await db.query('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)', [username, email, hashedPassword]);
    const newUserId = newUserResult.insertId;
    const defaultSettings = { 
      mixer_settings: {
        deckA: { volume: 85, low: 50, mid: 50, high: 50, filter: 50 },
        deckB: { volume: 85, low: 50, mid: 50, high: 50, filter: 50 },
        crossfader: 50
      },
      midi_mapping: null,
      ui_settings: { waveform_zoom: 25, deck_a_color: '#3b82f6', deck_b_color: '#f97316' }
    };
    await db.query('INSERT INTO user_settings (user_id, mixer_settings, midi_mapping, ui_settings) VALUES (?, ?, ?, ?)', 
      [newUserId, JSON.stringify(defaultSettings.mixer_settings), JSON.stringify(defaultSettings.midi_mapping), JSON.stringify(defaultSettings.ui_settings)]
    );
    await sendRegistrationEmail(email, username);
    res.status(201).json({ msg: 'Benutzer erfolgreich registriert!' });
  } catch (err) {
    console.error('Fehler bei der Registrierung:', err);
    res.status(500).json({ msg: 'Serverfehler bei der Registrierung.' });
  }
});

// Passwort vergessen Endpunkt
app.post('/api/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(200).json({ msg: 'Wenn ein Konto mit dieser E-Mail existiert, wurde ein Reset-Link gesendet.' });
        }
        const user = users[0];

        const resetToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        const tokenExpires = Date.now() + 3600000; // 1 Stunde

        await db.query('UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?', [hashedToken, tokenExpires, user.id]);
        
        const resetUrl = `http://localhost:5173/reset-password/${resetToken}`;
        
        // KORREKTUR: Die E-Mail-Funktion wird jetzt tatsächlich aufgerufen.
        await sendPasswordResetEmail(user.email, resetUrl);

        res.status(200).json({ msg: 'Wenn ein Konto mit dieser E-Mail existiert, wurde ein Reset-Link gesendet.' });

    } catch (err) {
        console.error('Fehler bei Passwort vergessen:', err);
        res.status(500).json({ msg: 'Serverfehler.' });
    }
});

// Passwort zurücksetzen Endpunkt (unverändert)
app.post('/api/reset-password', async (req, res) => {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ msg: 'Token und Passwort sind erforderlich.' });
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    try {
        const [users] = await db.query('SELECT * FROM users WHERE reset_token = ? AND reset_token_expires > ?', [hashedToken, Date.now()]);
        if (users.length === 0) return res.status(400).json({ msg: 'Token ist ungültig oder abgelaufen.' });
        const user = users[0];
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        await db.query('UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?', [hashedPassword, user.id]);
        res.json({ msg: 'Passwort erfolgreich zurückgesetzt!' });
    } catch (err) {
        console.error('Fehler beim Zurücksetzen des Passworts:', err);
        res.status(500).json({ msg: 'Serverfehler.' });
    }
});


// Login, Auth-Middleware und Settings-Routen bleiben unverändert...
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ msg: 'Bitte gib Benutzername und Passwort an.' });
    try {
        const [users] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
        if (users.length === 0) return res.status(400).json({ msg: 'Ungültige Anmeldedaten.' });
        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) return res.status(400).json({ msg: 'Ungültige Anmeldedaten.' });
        const payload = { user: { id: user.id } };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
        res.json({ token });
    } catch (err) {
        console.error('Fehler beim Login:', err);
        res.status(500).json({ msg: 'Serverfehler beim Login.' });
    }
});

const auth = (req, res, next) => {
  const token = req.header('x-auth-token');
  if (!token) return res.status(401).json({ msg: 'Kein Token, Autorisierung verweigert.' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded.user;
    next();
  } catch (e) {
    res.status(400).json({ msg: 'Token ist nicht gültig.' });
  }
};

app.get('/api/settings', auth, async (req, res) => {
  try {
    const [results] = await db.query('SELECT mixer_settings, midi_mapping, ui_settings FROM user_settings WHERE user_id = ?', [req.user.id]);
    if (results.length === 0) return res.status(404).json({ msg: 'Keine Einstellungen für diesen Benutzer gefunden.' });
    const dbSettings = results[0];
    const settings = {
      mixer_settings: dbSettings.mixer_settings ? JSON.parse(dbSettings.mixer_settings) : {},
      midi_mapping: dbSettings.midi_mapping ? JSON.parse(dbSettings.midi_mapping) : null,
      ui_settings: dbSettings.ui_settings ? JSON.parse(dbSettings.ui_settings) : {}
    };
    res.json(settings);
  } catch (err) {
    console.error('Fehler beim Abrufen der Einstellungen:', err);
    res.status(500).json({ msg: 'Serverfehler beim Abrufen der Einstellungen.' });
  }
});

app.put('/api/settings', auth, async (req, res) => {
    const { mixer_settings, midi_mapping, ui_settings } = req.body;
    try {
        const queryParams = [
            JSON.stringify(mixer_settings),
            JSON.stringify(midi_mapping),
            JSON.stringify(ui_settings),
            req.user.id
        ];
        await db.query('UPDATE user_settings SET mixer_settings = ?, midi_mapping = ?, ui_settings = ? WHERE user_id = ?', queryParams);
        res.json({ msg: 'Einstellungen erfolgreich gespeichert.' });
    } catch (err) {
        console.error('Fehler beim Speichern der Einstellungen:', err);
        res.status(500).json({ msg: 'Serverfehler beim Speichern der Einstellungen.' });
    }
});

app.listen(PORT, () => {
  console.log(`Backend-Server lauscht auf http://localhost:${PORT}`);
});
