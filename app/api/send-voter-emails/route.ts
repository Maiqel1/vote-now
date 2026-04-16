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

export const maxDuration = 60;

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

const BATCH_SIZE = 5;

export async function POST() {
  try {
    const votersRef = collection(db, "voters");
    const q = query(votersRef, where("emailSent", "==", false));
    const querySnapshot = await getDocs(q);

    let sentCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    const docs = querySnapshot.docs;

    for (let i = 0; i < docs.length; i += BATCH_SIZE) {
      const batch = docs.slice(i, i + BATCH_SIZE);

      const results = await Promise.allSettled(
        batch.map(async (document) => {
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

          await transporter.sendMail({
            from: process.env.GMAIL_USER,
            to: voter.email,
            subject: "Your Voting Code for the Election",
            html: emailHTML,
          });

          await updateDoc(doc(db, "voters", voter.email), { emailSent: true });
        })
      );

      results.forEach((result, idx) => {
        if (result.status === "fulfilled") {
          sentCount++;
        } else {
          const voter = batch[idx].data();
          const message =
            result.reason instanceof Error
              ? result.reason.message
              : String(result.reason);
          console.error(`Failed to send email to ${voter.email}:`, message);
          errorCount++;
          errors.push(`${voter.email}: ${message}`);
        }
      });

      if (errorCount > 5) {
        throw new Error("Too many errors encountered, stopping the process.");
      }
    }

    if (errorCount > 0) {
      return NextResponse.json(
        { partialSuccess: true, sentCount, errorCount, errors },
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
