import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

type Position = "president" | "vicePresident" | "secretary";
interface VoteDocument {
  [key: string]: number;
}

async function initializeFirestore() {
  const positions: Position[] = ["president", "vicePresident", "secretary"];
  const candidateIds: Record<Position, string[]> = {
    president: ["1", "2"],
    vicePresident: ["3", "4"],
    secretary: ["5", "6"],
  };

  try {
    for (const position of positions) {
      const voteDoc = doc(db, "votes", position);
      const initialVotes: VoteDocument = {};
      candidateIds[position].forEach((id) => {
        initialVotes[id] = 0;
      });

      await setDoc(voteDoc, initialVotes);
      console.log(`Initialized ${position} votes`);
    }
    console.log("All votes initialized successfully");
  } catch (error) {
    console.error("Error initializing votes:", error);
  }
}

initializeFirestore();
