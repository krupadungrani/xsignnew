import nodemailer from "nodemailer";

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    // Only create transporter if email credentials are provided
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || "smtp.gmail.com",
        port: parseInt(process.env.EMAIL_PORT || "587"),
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });
    }
  }

  async sendVerificationEmail(email: string, fullName: string, token: string) {
    const verificationUrl = `${process.env.APP_URL || 'http://localhost:5000'}/verify-email?token=${token}`;
    
    if (this.transporter) {
      // Production: Send actual email
      const mailOptions = {
        from: process.env.EMAIL_USER || "noreply@digisign.com",
        to: email,
        subject: "Verify Your XSignature Account",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #1976D2;">Welcome to XSignature</h1>
            <p>Hello ${fullName},</p>
            <p>Thank you for registering with XSignature. Please click the button below to verify your email address:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" style="background-color: #1976D2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Verify Email Address
              </a>
            </div>
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
            <p>This verification link will expire in 24 hours.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #888; font-size: 12px;">
              If you didn't create an account with XSignature, please ignore this email.
            </p>
          </div>
        `,
      };

      await this.transporter.sendMail(mailOptions);
    } else {
      // Development: Log verification link to console
      console.log('\n📧 EMAIL VERIFICATION LINK (Development Mode)');
      console.log('==============================================');
      console.log(`To: ${email}`);
      console.log(`Name: ${fullName}`);
      console.log(`Verification URL: ${verificationUrl}`);
      console.log('==============================================\n');
    }
  }
}

export const emailService = new EmailService();
