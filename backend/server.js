// backend/server.js

const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
require('dotenv').config();

const CryptoJS = require("crypto-js");
const { createClient } = require("webdav");

const { sendRegistrationEmail, sendPasswordResetEmail } = require('./emailService');

const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  'https://dev.robbstock-entertainment.de'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'Die CORS-Policy für diese Seite erlaubt den Zugriff von der angegebenen Origin nicht.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  }
})); 

app.use(express.json()); 

const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET;
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
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

// ... (Andere Endpunkte bleiben unverändert)

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
        const tokenExpires = Date.now() + 3600000;
        await db.query('UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?', [hashedToken, tokenExpires, user.id]);
        
        // KORREKTUR: Die URL zeigt jetzt wieder auf die lokale Frontend-Adresse.
        const resetUrl = `http://localhost:5173/reset-password/${resetToken}`;
        
        await sendPasswordResetEmail(user.email, resetUrl);
        res.status(200).json({ msg: 'Wenn ein Konto mit dieser E-Mail existiert, wurde ein Reset-Link gesendet.' });
    } catch (err) {
        console.error('Fehler bei Passwort vergessen:', err);
        res.status(500).json({ msg: 'Serverfehler.' });
    }
});

// ... (Der Rest der server.js bleibt unverändert)
app.post('/api/nextcloud/download', auth, async (req, res) => {
    const { path } = req.body;
    if (!path) {
        return res.status(400).json({ msg: 'Dateipfad fehlt.' });
    }
    try {
        const [settings] = await db.query('SELECT nextcloud_credentials FROM user_settings WHERE user_id = ?', [req.user.id]);
        if (!settings.length || !settings[0].nextcloud_credentials) {
            return res.status(404).json({ msg: 'Keine Nextcloud-Zugangsdaten konfiguriert.' });
        }
        const bytes = CryptoJS.AES.decrypt(settings[0].nextcloud_credentials, ENCRYPTION_KEY);
        const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
        const client = createClient(
            decryptedData.serverUrl + '/remote.php/dav/files/' + decryptedData.username,
            { username: decryptedData.username, password: decryptedData.password }
        );
        const stream = client.createReadStream(path);
        res.setHeader('Content-Type', 'application/octet-stream');
        stream.pipe(res);
    } catch (err) {
        console.error('Fehler beim Herunterladen der Nextcloud-Datei:', err);
        res.status(500).json({ msg: 'Serverfehler beim Herunterladen der Datei.' });
    }
});

app.post('/api/nextcloud/files', auth, async (req, res) => {
    const { path = '/' } = req.body;
    try {
        const [settings] = await db.query('SELECT nextcloud_credentials FROM user_settings WHERE user_id = ?', [req.user.id]);
        if (!settings.length || !settings[0].nextcloud_credentials) {
            return res.status(404).json({ msg: 'Keine Nextcloud-Zugangsdaten konfiguriert.' });
        }
        const bytes = CryptoJS.AES.decrypt(settings[0].nextcloud_credentials, ENCRYPTION_KEY);
        const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
        const client = createClient(
            decryptedData.serverUrl + '/remote.php/dav/files/' + decryptedData.username,
            { username: decryptedData.username, password: decryptedData.password }
        );
        const directoryContents = await client.getDirectoryContents(path);
        const items = directoryContents
            .map(item => ({
                name: item.basename,
                path: item.filename,
                type: item.type,
                size: item.size,
                lastModified: item.lastmod
            }));
        res.json(items);
    } catch (err) {
        console.error(`Fehler beim Abrufen von Nextcloud-Pfad "${path}":`, err);
        if (err.response && err.response.status === 401) return res.status(401).json({ msg: 'Nextcloud-Anmeldung fehlgeschlagen. Bitte überprüfe deine Zugangsdaten.' });
        if (err.response && err.response.status === 404) return res.status(404).json({ msg: `Ordner "${path}" nicht gefunden.` });
        if (err.message.includes('ENOTFOUND')) return res.status(400).json({ msg: 'Nextcloud-Server nicht gefunden. Bitte überprüfe die URL.' });
        res.status(500).json({ msg: 'Serverfehler beim Abrufen der Nextcloud-Dateien.' });
    }
});

app.post('/api/settings/nextcloud', auth, async (req, res) => {
    const { serverUrl, username, password } = req.body;
    if (!serverUrl || !username || !password) {
        return res.status(400).json({ msg: 'Bitte alle Felder für die Nextcloud-Verbindung ausfüllen.' });
    }
    try {
        const encryptedCredentials = CryptoJS.AES.encrypt(JSON.stringify(req.body), ENCRYPTION_KEY).toString();
        await db.query('UPDATE user_settings SET nextcloud_credentials = ? WHERE user_id = ?', [encryptedCredentials, req.user.id]);
        res.json({ msg: 'Nextcloud-Zugangsdaten erfolgreich gespeichert.' });
    } catch (err) {
        console.error('Fehler beim Speichern der Nextcloud-Daten:', err);
        res.status(500).json({ msg: 'Serverfehler beim Speichern der Nextcloud-Daten.' });
    }
});

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