import { NextResponse } from "next/server";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function POST() {
  try {
    const votersRef = collection(db, "voters");
    const q = query(votersRef, where("emailSent", "==", false));
    const querySnapshot = await getDocs(q);

    let sentCount = 0;
    const emailPromises: any = [];

    querySnapshot.forEach((document) => {
      const voter = document.data();
      const emailHTML = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Your Voting Code</h1>
          <p>Dear ${voter.firstName},</p>
          <p>Your voting code for the election is:</p>
          <div style="background-color: #f0f0f0; padding: 15px; border-radius: 5px; text-align: center;">
            <h2 style="margin: 0; color: #0066cc;">${voter.code}</h2>
          </div>
          <p style="margin-top: 20px;">You will need this code to cast your vote.</p>
          <p>Cast your vote here</p>
          <a href="https://vote-now-shmc.vercel.app">https://vote-now-shmc.vercel.app/vote</a>
          <p style="color: #666; font-size: 14px;">If you didn't register for voting, please ignore this email.</p>
        </div>
      `;

      const mailOptions = {
        from: process.env.GMAIL_USER,
        to: voter.email,
        subject: "Your Voting Code for the Election",
        html: emailHTML,
      };

      const emailPromise = transporter
        .sendMail(mailOptions)
        .then(() =>
          updateDoc(doc(db, "voters", voter.email), { emailSent: true })
        )
        .then(() => sentCount++);

      emailPromises.push(emailPromise);
    });

    await Promise.all(emailPromises);

    return NextResponse.json({ success: true, sentCount });
  } catch (error) {
    console.error("Error sending emails:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to send emails",
      },
      { status: 500 }
    );
  }
}
