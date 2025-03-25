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

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST() {
  try {
    const votersRef = collection(db, "voters");
    const q = query(votersRef, where("emailSent", "==", false));
    const querySnapshot = await getDocs(q);

    let sentCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const document of querySnapshot.docs) {
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
          <a href="https://vote-now-shmc.vercel.app/vote">https://vote-now-shmc.vercel.app/vote</a>
          <p style="color: #666; font-size: 14px;">If you didn't register for voting, please ignore this email.</p>
        </div>
      `;

      const mailOptions = {
        from: process.env.GMAIL_USER,
        to: voter.email,
        subject: "Your Voting Code for the Election",
        html: emailHTML,
      };

      try {
        await transporter.sendMail(mailOptions);
        await updateDoc(doc(db, "voters", voter.email), { emailSent: true });
        sentCount++;

        // Add a delay of 2 seconds between each email
        await delay(2000);
      } catch (error) {
        console.error(`Failed to send email to ${voter.email}:`, error);
        errorCount++;
        errors.push(
          `${voter.email}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );

        if (errorCount > 5) {
          throw new Error("Too many errors encountered, stopping the process.");
        }
      }
    }

    if (errorCount > 0) {
      return NextResponse.json(
        {
          partialSuccess: true,
          sentCount,
          errorCount,
          errors,
        },
        { status: 207 }
      );
    }

    return NextResponse.json({ success: true, sentCount });
  } catch (error) {
    console.error("Error in email sending process:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to send emails",
        sentCount: 0,
      },
      { status: 500 }
    );
  }
}
