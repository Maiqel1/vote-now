# VoteNow

Self-serve online elections. Organizers sign up, build a ballot, upload a voter list and send everyone a personal ballot link. Votes are secret, one per voter, and counted on the server.

Next.js 14 (App Router) on Vercel · Firebase Auth and Firestore · Cloudinary for images · Brevo (SMTP) or Resend for email.

## Local development

Local development runs against the **staging** Firebase project (`vote-now-staging`). Only ever put fake data there.

```bash
npm install
cp .env.example .env.local
npm run dev
```

- Fill `.env.local` with the staging web config, the staging `FIREBASE_SERVICE_ACCOUNT`, and the Cloudinary staging key.
- App: http://localhost:3000. `localhost` is an authorized Firebase Auth domain by default.
- With `EMAIL_TRANSPORT=log`, emails print to the terminal instead of being sent. Copy the ballot link from there to vote.
- Uploaded images land in the `vote-now/local` Cloudinary folder.
- To verify your organizer email, click the link Firebase emails you. Verification emails come from Firebase, not Brevo.
- Optional: with Java 21+ you can instead run the Firebase emulators (`firebase emulators:start --project demo-vote-now`). Set `NEXT_PUBLIC_USE_EMULATORS=true`, `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080` and `FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099`.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm test` | Unit tests: election lifecycle, results/ties, ballot validation, credentials |
| `npm run test:rules` | Firestore security rules tests (optional; needs Java 21+ for the emulator) |
| `npm run audit-2025` | Read-only check that the legacy 2025 tallies match the per-voter ballots |
| `npm run migrate-2025 -- --owner=you@example.com [--dry-run]` | Imports the 2025 election as `/e/shmc-2025` (no voter personal data copied) |

## Deploying

1. Set the environment variables in Vercel (see `.env.example`; production uses `EMAIL_TRANSPORT=smtp` and a base64 service account in `FIREBASE_SERVICE_ACCOUNT`, and must not set the emulator variables).
2. Deploy rules and indexes:
   - Production (Blaze): `firebase deploy --only firestore:rules,firestore:indexes -P production`.
   - Staging (Spark): `firebase deploy --only firestore:rules -P staging`. The TTL index setting requires billing, and staging works without it.
3. In the Google Cloud console, confirm the TTL policy on `rateLimits.expiresAt` is active (it's declared in `firestore.indexes.json`).

## How it works

- **Organizers** sign in with Firebase Auth; the server issues an httpOnly session cookie. All writes go through server actions or route handlers using the Admin SDK. The browser never writes to Firestore.
- **Voters** have no account. Each gets a random link token and an 8-character code by email; only SHA-256 hashes are stored. A short-lived signed cookie authorizes one ballot submission.
- **Casting a vote** is one Firestore transaction: mark the voter as voted, store an anonymous ballot (no voter ID, no timestamp), and increment one of 10 tally shards.
- **Election status** (scheduled, open, paused, closed) is derived from server time, so voting opens and closes without a scheduler. The ballot locks once voting starts.
- **Results** visibility is live, after close, manual publish or private, enforced in Firestore rules for the realtime tally listeners.
