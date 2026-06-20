import nodemailer from "nodemailer";
import { Resend } from "resend";

export async function sendOtpEmail({ to, otp }) {
  // const transporter = nodemailer.createTransport({
  //   host: "smtp.gmail.com",
  //   port: 465,
  //   secure: false,
  //   auth: {
  //     user: String(process.env.EMAIL_USER).trim(),
  //     pass: String(process.env.EMAIL_PASS).trim(),
  //   },
  // });

  // Inside src/services/mailService.js
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: String(process.env.EMAIL_USER).trim(),
      pass: String(process.env.EMAIL_PASS).trim(),
    },
    // 🚀 THE INFRASTRUCTURE FIX: Force connection to use standard IPv4 addresses
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
  });

  await transporter.verify(); // 🔥 THIS WILL REVEAL REAL ISSUE IMMEDIATELY

  return transporter.sendMail({
    from: `"SureLink" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Your OTP Code",
    html: `<h1>${otp}</h1>`,
  });
}

// Initialize using your dashboard secret key variable
// const resend = new Resend(process.env.RESEND_API_KEY);

// export async function sendOtpEmail({ to, otp }) {
//   // Bypasses Nodemailer and delivers via standard secure web requests!
//   return resend.emails.send({
//     from: "SureLink <onboarding@resend.dev>", // Replace with your domain when ready
//     to: [to],
//     subject: "Your OTP Code",
//     html: `<h1>${otp}</h1>`,
//   });
// }
