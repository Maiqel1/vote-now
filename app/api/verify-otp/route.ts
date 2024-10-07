// app/api/verify-otp/route.ts
import { NextResponse } from "next/server";
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

function generateVotingCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export async function POST(request: Request) {
  try {
    const { email, otp } = await request.json();

    const otpDoc = await getDoc(doc(db, "otps", email));

    if (!otpDoc.exists()) {
      return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });
    }

    const otpData = otpDoc.data();

    if (otpData.otp !== otp) {
      return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });
    }

    if (Date.now() > otpData.expiryTime) {
      await deleteDoc(doc(db, "otps", email));
      return NextResponse.json({ error: "OTP has expired" }, { status: 400 });
    }

    // Generate voting code
    const votingCode = generateVotingCode();

    // Store voter in Firestore
    await setDoc(doc(db, "voters", email), {
      email,
      code: votingCode,
      hasVoted: false,
      createdAt: new Date().toISOString(),
    });

    // Delete OTP document
    await deleteDoc(doc(db, "otps", email));

    return NextResponse.json({ success: true, votingCode });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return NextResponse.json(
      { error: "Failed to verify OTP" },
      { status: 500 }
    );
  }
}
