import { randomBytes } from 'crypto';
import * as admin from 'firebase-admin';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { onRequest } from 'firebase-functions/v2/https';
import * as sgMail from '@sendgrid/mail';

admin.initializeApp();

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY ?? '';
const FROM_EMAIL = 'reports@streamwatch.app';
const PROJECT_ID = 'streamwatch-f1d98';
const REGION = 'us-central1';

function resolveUrl(token: string): string {
  return `https://${REGION}-${PROJECT_ID}.cloudfunctions.net/resolveReport?token=${token}`;
}

// Fired whenever a new sighting document is created in Firestore.
// Routes an alert email to the correct agency based on pollution class + county.
export const onSightingCreated = onDocumentCreated(
  'sightings/{sightingId}',
  async (event) => {
    const data = event.data?.data();
    if (!data) return;

    const { pollutionClass, severity, confidence, county, agencyEmailed, photoUrl, latitude, longitude } = data;

    // The resolve token authorizes marking a report resolved via a public
    // email link, so it must be minted server-side with real randomness —
    // never trust a client-supplied value for this.
    const resolveToken = randomBytes(24).toString('hex');
    await event.data?.ref.update({ resolveToken });

    if (!agencyEmailed || severity === 'NONE') return;
    if (confidence < 0.6) return;

    sgMail.setApiKey(SENDGRID_API_KEY);

    const msg = {
      to: agencyEmailed,
      from: FROM_EMAIL,
      subject: `[StreamWatch] ${severity} Severity: ${formatClass(pollutionClass)} in ${county} County`,
      text: buildEmailBody({
        pollutionClass, severity, confidence, county,
        photoUrl, latitude, longitude, resolveToken,
      }),
    };

    await sgMail.send(msg);
    await event.data?.ref.update({ emailSent: true });
  }
);

// Agency clicks "Mark Resolved" in their email → GET renders a confirmation
// page with a button; only the resulting POST actually mutates Firestore.
// This matters because email security scanners (Outlook Safe Links, spam
// filters, etc.) auto-crawl every link in an incoming email with a GET
// request before a human ever opens it — a state-changing GET would let
// that silently resolve real reports.
export const resolveReport = onRequest(async (req, res) => {
  const token = (req.method === 'POST' ? req.body?.token : req.query.token) as string | undefined;

  if (!token) {
    res.status(400).send(htmlPage('Missing token', 'This link is incomplete. Please use the link from the original email.'));
    return;
  }

  const snap = await admin.firestore()
    .collection('sightings')
    .where('resolveToken', '==', token)
    .limit(1)
    .get();

  if (snap.empty) {
    res.status(404).send(htmlPage('Not found', 'This report could not be found. It may have already been deleted.'));
    return;
  }

  const docRef = snap.docs[0].ref;
  const data = snap.docs[0].data();

  if (data.resolved) {
    const when = data.resolvedAt?.toDate().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) ?? 'earlier';
    res.send(htmlPage('Already resolved', `This report was already marked as resolved on ${when}.`));
    return;
  }

  if (req.method !== 'POST') {
    res.send(confirmPage(token));
    return;
  }

  await docRef.update({
    resolved: true,
    resolvedAt: admin.firestore.FieldValue.serverTimestamp(),
    resolvedBy: 'agency',
  });

  res.send(htmlPage('Report resolved', `Thank you. This StreamWatch report has been marked as resolved. The community will see the updated status.`));
});

// Auto-hide sightings submitted too rapidly from the same user (spam guard).
export const onSightingSpamCheck = onDocumentCreated(
  'sightings/{sightingId}',
  async (event) => {
    const data = event.data?.data();
    if (!data) return;

    const { userId } = data;
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const recent = await admin
      .firestore()
      .collection('sightings')
      .where('userId', '==', userId)
      .where('reportedAt', '>=', fiveMinutesAgo)
      .get();

    if (recent.size > 5) {
      await event.data?.ref.update({ hidden: true });
    }
  }
);

function formatClass(cls: string): string {
  return cls.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function buildEmailBody(params: {
  pollutionClass: string;
  severity: string;
  confidence: number;
  county: string;
  photoUrl: string;
  latitude: number;
  longitude: number;
  resolveToken: string;
}): string {
  const { pollutionClass, severity, confidence, county, photoUrl, latitude, longitude, resolveToken } = params;
  const resolveLink = resolveUrl(resolveToken);
  return `
StreamWatch Pollution Report
=============================
Type:       ${formatClass(pollutionClass)}
Severity:   ${severity}
Confidence: ${Math.round(confidence * 100)}%
County:     ${county}
Location:   ${latitude.toFixed(5)}, ${longitude.toFixed(5)}
Maps link:  https://maps.google.com/?q=${latitude},${longitude}
Photo:      ${photoUrl}

Once you have investigated and resolved this issue, click the link below
to mark it as resolved in StreamWatch:

  ${resolveLink}

This link is single-use and tied to this report only.

Reported via StreamWatch — AI-powered waterway pollution detection for WA-01.
  `.trim();
}

function htmlPage(title: string, message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — StreamWatch</title>
  <style>
    body { font-family: -apple-system, sans-serif; background: #0a0a0a; color: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .card { background: #1c1c1e; border: 1px solid #2c2c2e; border-radius: 16px; padding: 40px; max-width: 420px; text-align: center; }
    h1 { font-size: 22px; margin: 0 0 12px; }
    p { color: #8e8e93; font-size: 15px; line-height: 1.5; margin: 0; }
    .check { font-size: 48px; margin-bottom: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="check">✓</div>
    <h1>${title}</h1>
    <p>${message}</p>
  </div>
</body>
</html>`;
}

// Server-generated hex token — safe to interpolate directly, never user input.
function confirmPage(token: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm resolved — StreamWatch</title>
  <style>
    body { font-family: -apple-system, sans-serif; background: #0a0a0a; color: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .card { background: #1c1c1e; border: 1px solid #2c2c2e; border-radius: 16px; padding: 40px; max-width: 420px; text-align: center; }
    h1 { font-size: 22px; margin: 0 0 12px; }
    p { color: #8e8e93; font-size: 15px; line-height: 1.5; margin: 0 0 24px; }
    button { background: #34c759; color: #0a0a0a; border: none; border-radius: 10px; padding: 14px 28px; font-size: 16px; font-weight: 600; cursor: pointer; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Mark this report resolved?</h1>
    <p>Confirm that this pollution report has been investigated and cleaned up. The community will see the updated status.</p>
    <form method="POST" action="">
      <input type="hidden" name="token" value="${token}">
      <button type="submit">Confirm Resolved</button>
    </form>
  </div>
</body>
</html>`;
}
