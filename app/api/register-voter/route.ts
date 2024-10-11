import { NextResponse } from "next/server";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

function generateVotingCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export async function POST(request: Request) {
  try {
    const { email, firstName, lastName, phoneNumber } = await request.json();

    // Check if email already exists
    const voterDoc = await getDoc(doc(db, "voters", email));
    if (voterDoc.exists()) {
      return NextResponse.json(
        { error: "This email has already been registered" },
        { status: 400 }
      );
    }

    const votingCode = generateVotingCode();

    // Store voter in Firestore
    await setDoc(doc(db, "voters", email), {
      email,
      firstName,
      lastName,
      phoneNumber,
      code: votingCode,
      hasVoted: false,
      emailSent: false,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error registering voter:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to register voter",
      },
      { status: 500 }
    );
  }
}
