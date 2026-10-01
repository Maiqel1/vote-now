import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

const shared = globalThis as typeof globalThis & { __voteNowFirestore?: Firestore };

function adminApp(): App {
  const existing = getApps()[0];
  if (existing) return existing;

  const encoded = process.env.FIREBASE_SERVICE_ACCOUNT;

  if (encoded) {
    const serviceAccount = JSON.parse(Buffer.from(encoded, "base64").toString("utf8"));
    return initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });
  }

  return initializeApp({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });
}

export function adminDb(): Firestore {
  if (!shared.__voteNowFirestore) {
    const firestore = getFirestore(adminApp());
    firestore.settings({ ignoreUndefinedProperties: true });
    shared.__voteNowFirestore = firestore;
  }
  return shared.__voteNowFirestore;
}

export function adminAuth(): Auth {
  return getAuth(adminApp());
}
