import { NextResponse } from "next/server";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import nodemailer from "nodemailer";

// Create a transporter using Gmail
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    // Check if email already exists and has voted
    const voterDoc = await getDoc(doc(db, "voters", email));
    if (voterDoc.exists() && voterDoc.data().hasVoted) {
      return NextResponse.json(
        { error: "This email has already been used for voting" },
        { status: 400 }
      );
    }

    const otp = generateOTP();
    const expiryTime = Date.now() + 10 * 60 * 1000;

    // Store OTP in Firestore
    await setDoc(doc(db, "otps", email), {
      otp,
      expiryTime,
      verified: false,
    });

    // Send email using nodemailer
    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: email,
      subject: "Your OTP for Voter Registration",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Verify Your Email</h1>
          <p>Your OTP for voter registration is:</p>
          <div style="background-color: #f0f0f0; padding: 15px; border-radius: 5px; text-align: center;">
            <h2 style="margin: 0; color: #0066cc;">${otp}</h2>
          </div>
          <p style="margin-top: 20px;">This OTP will expire in 10 minutes.</p>
          <p style="color: #666; font-size: 14px;">If you didn't request this OTP, please ignore this email.</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error sending OTP:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send OTP" },
      { status: 500 }
    );
  }
}
