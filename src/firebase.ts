import admin from "firebase-admin";
import dotenv from "dotenv";

dotenv.config();

const requiredVars = ["FIREBASE_PROJECT_ID", "FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY"];
for (const key of requiredVars) {
  if (!process.env[key]) {
    throw new Error(`${key} is missing. Copy .env.example to .env and fill it in.`);
  }
}

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    // .env stores the key with literal \n characters - convert them back to real newlines
    privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
  }),
});

export const db = admin.firestore();
