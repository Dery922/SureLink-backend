import nodemailer from "nodemailer";


export async function sendOtpEmail({ to, otp }) {


  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: String(process.env.EMAIL_USER).trim(),
      pass: String(process.env.EMAIL_PASS).trim(),
    },
  });

  await transporter.verify(); // 🔥 THIS WILL REVEAL REAL ISSUE IMMEDIATELY

  return transporter.sendMail({
    from: `"SureLink" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Your OTP Code",
    html: `<h1>${otp}</h1>`,
  });
}