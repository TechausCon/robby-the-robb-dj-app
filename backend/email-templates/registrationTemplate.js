// backend/email-templates/registrationTemplate.js

/**
 * Erzeugt das HTML für eine robuste, Outlook-kompatible Registrierungs-E-Mail.
 * @param {string} username - Der Benutzername des neuen Benutzers.
 * @returns {string} - Der vollständige HTML-String für die E-Mail.
 */
const getRegistrationHtml = (username) => {
  const loginUrl = 'http://localhost:5173//login';
  const logoUrl = 'https://techaus.org/pics/robby-logo.png';

  return `
    <!DOCTYPE html>
    <html lang="de">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <title>Willkommen bei der Robby the Robb DJ APP</title>
      <!--[if mso]>
      <style>
        table {border-collapse: collapse;}
        .button {
          border-radius: 30px !important;
        }
      </style>
      <![endif]-->
      <style>
        /* Stellt sicher, dass Outlook die Schriftart nicht ändert */
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
        body { margin: 0; padding: 0; background-color: #0a0a0a; }

        @media screen and (max-width: 600px) {
          .container {
            width: 100% !important;
            max-width: 100% !important;
          }
        }
      </style>
    </head>
    <body style="margin: 0; padding: 0; background-color: #0a0a0a;">
      <center>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #0a0a0a;">
          <tr>
            <td align="center">
              <!--[if mso]>
              <table role="presentation" align="center" style="width:600px;">
              <tr>
              <td>
              <![endif]-->
              <table role="presentation" class="container" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; margin: 20px auto; background-color: #111111; border-radius: 12px; box-shadow: 0 8px 30px rgba(0,0,0,0.7);">
                <!-- Header Sektion -->
                <tr>
                  <td align="center" style="background: linear-gradient(135deg, rgba(255,64,129,0.9) 0%, rgba(245,0,87,0.9) 100%); padding: 40px 20px; text-align: center; border-radius: 12px 12px 0 0;">
                    <h1 style="color: #ffffff; font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 24px; letter-spacing: 2px; text-transform: uppercase; margin: 0;">
                      Robby the Robb DJ APP
                    </h1>
                  </td>
                </tr>
                <!-- Logo Sektion -->
                <tr>
                  <td align="center" style="padding: 0; background-color: #111111;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td align="center" style="padding-top: 0; margin-top: -60px; display: block;">
                           <div style="margin-top: -64px; display: inline-block; width: 128px; height: 128px; background-color: #0a0a0a; border-radius: 50%; border: 4px solid #ff4081; box-shadow: 0 6px 20px rgba(0,0,0,0.5);">
                              <img src="${logoUrl}" alt="Logo" width="120" height="120" style="border-radius: 50%; width: 120px; height: 120px; display: block; margin: 4px;">
                           </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <!-- Divider & Tagline -->
                <tr>
                  <td align="center" style="padding: 20px 20px 10px 20px; background-color: #111111;">
                    <table role="presentation" width="100" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td height="4" style="background: linear-gradient(90deg, #ff4081, #f50057); border-radius: 2px;"></td>
                      </tr>
                    </table>
                    <p style="color: #ff4081; font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; margin: 20px 0 0 0;">
                      Robb to the Floor!
                    </p>
                  </td>
                </tr>
                <!-- Content Sektion -->
                <tr>
                  <td align="center" style="padding: 20px 30px 30px 30px; background-color: #111111; text-align: center;">
                    <h2 style="color: #ff4081; font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 20px; margin: 0 0 15px 0;">
                      Welcome on Decks, ${username}!
                    </h2>
                    <p style="color: #eeeeee; font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 15px; line-height: 1.6; margin: 0 0 18px 0;">
                      Dein Account rockt jetzt mit vollem Bass. Willkommen in der Crew!
                    </p>
                    <p style="color: #eeeeee; font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 15px; line-height: 1.6; margin: 0 0 30px 0;">
                      Log dich ein, mix deine ersten Tracks und fühl den Beat – deine Einstellungen bleiben dabei safe gespeichert.
                    </p>
                    <!-- Button Tabelle -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td align="center" style="border-radius: 30px; background-color: #ff4081; box-shadow: 0 4px 15px rgba(255,64,129,0.6);">
                          <a href="${loginUrl}" target="_blank" class="button" style="color: #ffffff; font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 16px; font-weight: bold; text-decoration: none; text-transform: uppercase; letter-spacing: 1px; padding: 14px 32px; border: 1px solid #ff4081; display: inline-block; border-radius: 30px;">
                            Let's Rock
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <!-- Footer Sektion -->
                <tr>
                  <td align="center" style="padding: 20px; background-color: #0f0f0f; border-radius: 0 0 12px 12px;">
                    <p style="color: #666666; font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 12px; margin: 0;">
                      &copy; ${new Date().getFullYear()} Robby the Robb Entertainment. Alle Rechte vorbehalten.
                    </p>
                  </td>
                </tr>
              </table>
              <!--[if mso]>
              </td>
              </tr>
              </table>
              <![endif]-->
            </td>
          </tr>
        </table>
      </center>
    </body>
    </html>
  `;
};

// Die Funktion exportieren, damit sie in anderen Dateien verwendet werden kann.
module.exports = { getRegistrationHtml };
