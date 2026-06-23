const nodemailer = require('nodemailer');

// ─── Create Transporter ───────────────────────────────────────────────────────
// Uses Gmail SMTP with an App Password (not your regular Gmail password).
// Required env vars: EMAIL_USER, EMAIL_PASS
const createTransporter = () =>
  nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS   // Gmail App Password (16 chars, no spaces)
    }
  });

// ─── Send Password Reset Email ────────────────────────────────────────────────
const sendPasswordResetEmail = async ({ toEmail, toName, token, expiresInMinutes = 60 }) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: `"Giantek Consultancy Services" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: '🔐 Password Reset Request — Giantek Portal',
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <title>Password Reset</title>
      </head>
      <body style="margin:0;padding:0;background-color:#0f1117;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f1117;padding:40px 20px;">
          <tr>
            <td align="center">
              <table width="520" cellpadding="0" cellspacing="0" style="background:linear-gradient(145deg,#1a1d2e,#12151f);border:1px solid #2a2d3e;border-radius:16px;overflow:hidden;">

                <!-- Header -->
                <tr>
                  <td style="background:linear-gradient(135deg,#b8a04a,#d4b95a);padding:32px 40px;text-align:center;">
                    <h1 style="margin:0;color:#0f1117;font-size:22px;font-weight:700;letter-spacing:1px;">GIANTEK CONSULTANCY SERVICES</h1>
                    <p style="margin:4px 0 0;color:#0f1117;opacity:0.7;font-size:13px;font-style:italic;">Think Different</p>
                  </td>
                </tr>

                <!-- Body -->
                <tr>
                  <td style="padding:40px;">
                    <h2 style="margin:0 0 12px;color:#e2e8f0;font-size:20px;">Password Reset Request</h2>
                    <p style="margin:0 0 24px;color:#94a3b8;font-size:15px;line-height:1.6;">
                      Hi <strong style="color:#e2e8f0;">${toName}</strong>,<br/><br/>
                      We received a request to reset the password for your Giantek Portal account. 
                      Use the token below to set a new password.
                    </p>

                    <!-- Token Box -->
                    <div style="background:#0f1117;border:2px dashed #b8a04a;border-radius:12px;padding:24px;text-align:center;margin:0 0 28px;">
                      <p style="margin:0 0 8px;color:#94a3b8;font-size:12px;letter-spacing:2px;text-transform:uppercase;">Your Reset Token</p>
                      <p style="margin:0;color:#b8a04a;font-size:32px;font-weight:700;letter-spacing:8px;font-family:monospace;">${token}</p>
                      <p style="margin:10px 0 0;color:#64748b;font-size:12px;">⏱ Expires in ${expiresInMinutes} minutes</p>
                    </div>

                    <!-- Instructions -->
                    <div style="background:#1e2235;border-radius:10px;padding:20px;margin-bottom:28px;">
                      <p style="margin:0 0 10px;color:#e2e8f0;font-size:14px;font-weight:600;">How to reset your password:</p>
                      <ol style="margin:0;padding-left:20px;color:#94a3b8;font-size:14px;line-height:2;">
                        <li>Go to the Giantek Portal login page</li>
                        <li>Click <strong style="color:#b8a04a;">"Forgot Password?"</strong></li>
                        <li>Click <strong style="color:#b8a04a;">"I have a token →"</strong></li>
                        <li>Enter your email, paste the token above, and set a new password</li>
                      </ol>
                    </div>

                    <p style="margin:0;color:#64748b;font-size:13px;line-height:1.6;">
                      If you did not request this, you can safely ignore this email. Your password will not change.
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding:20px 40px;border-top:1px solid #2a2d3e;text-align:center;">
                    <p style="margin:0;color:#475569;font-size:12px;">
                      © ${new Date().getFullYear()} Giantek Consultancy Services. All rights reserved.
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `
  };

  await transporter.sendMail(mailOptions);
  console.log(`✅ Password reset email sent to ${toEmail}`);
};

module.exports = { sendPasswordResetEmail };
