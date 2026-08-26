// services/emailService.js
import nodemailer from 'nodemailer';

/**
 * Fonction interne pour créer le transporteur SMTP à la demande.
 * Cela garantit que process.env a bien été peuplé par dotenv avant la création.
 */
const getTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error("❌ ERREUR CRITIQUE : Les identifiants d'email (EMAIL_USER / EMAIL_PASS) ne sont pas chargés.");
  }

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true', // true pour le port 465, false pour les autres
    auth: {
      user: process.env.EMAIL_USER, 
      pass: process.env.EMAIL_PASS  
    }
  });
};

/**
 * 1. EMAIL DE BIENVENUE / INSCRIPTION
 */
export const sendWelcomeEmail = async (userEmail, userName) => {
  try {
    const loginUrl = `${process.env.VITE_CLIENT_URL || 'http://localhost:5173'}/login`;
    const transporter = getTransporter();
    
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body { background-color: #0f172a; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #ffffff; margin: 0; padding: 0; }
            .wrapper { max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #0f172a; }
            .container { background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border: 1px solid #334155; border-radius: 24px; padding: 40px; text-align: center; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3); }
            .logo { font-size: 24px; font-weight: 900; letter-spacing: -1px; text-transform: uppercase; color: #ffffff; margin-bottom: 30px; }
            .logo span { color: #3b82f6; }
            h1 { font-size: 28px; font-weight: 800; margin-bottom: 16px; color: #ffffff; }
            p { color: #94a3b8; font-size: 15px; line-height: 1.6; margin-bottom: 30px; text-align: left; }
            .btn { display: inline-block; background-color: #2563eb; color: #ffffff !important; font-weight: 700; font-size: 14px; text-transform: uppercase; padding: 16px 32px; border-radius: 12px; text-decoration: none; box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.2); }
            .footer { margin-top: 40px; font-size: 11px; color: #475569; text-transform: uppercase; }
        </style>
    </head>
    <body>
        <div class="wrapper">
            <div class="container">
                <div class="logo">CV.<span>Craft</span></div>
                <h1>Ravi de vous compter parmi nous ! 👋</h1>
                <p>Bonjour ${userName},<br><br>Votre compte a été créé avec succès sur <strong>CV.Craft</strong>. Vous êtes maintenant prêt à concevoir des CV percutants, optimisés pour passer les filtres des recruteurs (ATS) et décrocher l'entretien de vos rêves.</p>
                <a href="${loginUrl}" class="btn">Créer mon premier CV</a>
                <div class="footer">© 2026 CV.Craft. Tous droits réservés.</div>
            </div>
        </div>
    </body>
    </html>`;

    await transporter.sendMail({
      from: `"CV.Craft" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: 'Bienvenue sur CV.Craft ! 🚀 Votre carrière commence ici',
      html: htmlContent
    });
  } catch (error) {
    console.error("❌ Erreur dans sendWelcomeEmail :", error.message);
  }
};

/**
 * 2. EMAIL DE CONFIRMATION DE PLAN (Paiement réussi)
 */
export const sendPlanConfirmationEmail = async (userEmail, userName, planDetails) => {
  try {
    const workspaceUrl = `${process.env.VITE_CLIENT_URL || 'http://localhost:5173'}/Home`;
    const { name, maxDownloads, duree, price } = planDetails;
    const transporter = getTransporter();

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body { background-color: #0f172a; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #ffffff; margin: 0; padding: 0; }
            .wrapper { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
            .container { background-color: #1e293b; border: 1px solid #334155; border-radius: 24px; padding: 40px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3); }
            .logo { font-size: 22px; font-weight: 900; text-transform: uppercase; text-align: center; margin-bottom: 30px; }
            .logo span { color: #3b82f6; }
            h1 { font-size: 24px; font-weight: 800; text-align: center; margin-bottom: 24px; }
            .invoice-box { background-color: #0f172a; border: 1px solid #334155; border-radius: 16px; padding: 20px; margin-bottom: 30px; }
            .invoice-row { display: flex; justify-content: space-between; font-size: 14px; padding: 8px 0; color: #94a3b8; }
            .invoice-row.total { border-top: 1px solid #334155; margin-top: 10px; padding-top: 12px; font-weight: 700; color: #ffffff; font-size: 16px; }
            .invoice-row.total .price { color: #3b82f6; }
            .feature-badge { background-color: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.2); color: #10b981; padding: 4px 12px; border-radius: 99px; font-size: 12px; font-weight: 700; }
            .btn { display: block; text-align: center; background-color: #2563eb; color: #ffffff !important; font-weight: 700; font-size: 13px; text-transform: uppercase; padding: 16px; border-radius: 12px; text-decoration: none; }
        </style>
    </head>
    <body>
        <div class="wrapper">
            <div class="container">
                <div class="logo">CV.<span>Craft</span></div>
                <h1>Merci pour votre confiance ! 🚀</h1>
                <p style="color: #94a3b8; font-size: 14px; line-height: 1.6;">Bonjour ${userName},<br>Votre paiement a été validé. Votre compte a instantanément été mis à jour avec vos nouveaux avantages professionnels :</p>
                
                <div class="invoice-box">
                    <div class="invoice-row">
                        <span>Formule activée :</span>
                        <span style="color: #ffffff; font-weight: bold;">${name}</span>
                    </div>
                    <div class="invoice-row">
                        <span>Limite de téléchargements :</span>
                        <span class="feature-badge">${maxDownloads} PDFs</span>
                    </div>
                    <div class="invoice-row">
                        <span>Durée de l'accès :</span>
                        <span>${duree} Jours</span>
                    </div>
                    <div class="invoice-row total">
                        <span>Montant réglé :</span>
                        <span class="price">${price.toLocaleString()} CFA</span>
                    </div>
                </div>
                <a href="${workspaceUrl}" class="btn">Accéder à mon espace Premium</a>
            </div>
        </div>
    </body>
    </html>`;

    await transporter.sendMail({
      from: `"CV.Craft" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: `Activation de votre plan ${name} 🎉 - CV.Craft`,
      html: htmlContent
    });
  } catch (error) {
    console.error("❌ Erreur dans sendPlanConfirmationEmail :", error.message);
  }
};


export const sendExpirationWarningEmail = async (userEmail, userName, planName) => {
  try {
    const renewUrl = `${process.env.VITE_CLIENT_URL || 'http://localhost:5173'}/plans`;
    const workspaceUrl = `${process.env.VITE_CLIENT_URL || 'http://localhost:5173'}/Home`;
    const transporter = getTransporter();

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body { background-color: #0f172a; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #ffffff; margin: 0; padding: 0; }
            .wrapper { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
            .container { background-color: #1e293b; border: 1px solid #334155; border-radius: 24px; padding: 40px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3); }
            .logo { font-size: 22px; font-weight: 900; text-transform: uppercase; text-align: center; margin-bottom: 30px; }
            .logo span { color: #3b82f6; }
            h1 { font-size: 24px; font-weight: 800; text-align: center; margin-bottom: 16px; color: #f59e0b; }
            p { color: #94a3b8; font-size: 14px; line-height: 1.6; margin-bottom: 24px; }
            .warning-box { background-color: rgba(245, 158, 11, 0.05); border: 1px solid rgba(245, 158, 11, 0.2); border-radius: 16px; padding: 20px; margin-bottom: 30px; font-size: 13px; color: #cbd5e1; }
            .btn { display: block; text-align: center; background-color: #f59e0b; color: #0f172a !important; font-weight: 900; font-size: 13px; text-transform: uppercase; padding: 16px; border-radius: 12px; text-decoration: none; }
            .secondary-link { display: block; text-align: center; margin-top: 15px; color: #64748b; font-size: 12px; text-decoration: none; }
        </style>
    </head>
    <body>
        <div class="wrapper">
            <div class="container">
                <div class="logo">CV.<span>Craft</span></div>
                <h1 style="text-align:center;">⏳ Votre offre expire bientôt</h1>
                <p>Bonjour ${userName},<br><br>Nous vous informons que votre abonnement au plan <strong>${planName}</strong> prendra fin dans exactement <strong>7 jours</strong>.</p>
                
                <div class="warning-box">
                    <strong>Ce qui va se passer à l'expiration :</strong>
                    <ul style="margin: 8px 0 0 20px; padding: 0;">
                        <li style="margin-bottom:4px;">Votre compte basculera automatiquement vers l'offre <strong>Gratuite</strong>.</li>
                        <li style="margin-bottom:4px;">Votre quota maximal de téléchargements passera à 5.</li>
                        <li>Vos données actuelles et CV restent sauvegardés en toute sécurité.</li>
                    </ul>
                </div>
                <p>Si vous avez des candidatures en cours ou des modifications de dernière minute à apporter à vos CV, c'est le moment idéal pour les exporter ou renouveler votre offre.</p>
                <a href="${renewUrl}" class="btn">Renouveler mon abonnement</a>
                <a href="${workspaceUrl}" class="secondary-link">Accéder à mes CV</a>
            </div>
        </div>
    </body>
    </html>`;

    await transporter.sendMail({
      from: `"CV.Craft" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: `⚠️ Attention : Votre accès Premium CV.Craft expire dans 7 jours`,
      html: htmlContent
    });
  } catch (error) {
    console.error("❌ Erreur dans sendExpirationWarningEmail :", error.message);
  }
};