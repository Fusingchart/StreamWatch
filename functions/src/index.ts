import * as admin from 'firebase-admin';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import * as sgMail from '@sendgrid/mail';

admin.initializeApp();

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY ?? '';
const FROM_EMAIL = 'reports@streamwatch.app';

// Fired whenever a new sighting document is created in Firestore.
// Routes an alert email to the correct agency based on pollution class + county.
export const onSightingCreated = onDocumentCreated(
  'sightings/{sightingId}',
  async (event) => {
    const data = event.data?.data();
    if (!data) return;

    const { pollutionClass, severity, confidence, county, agencyEmailed, photoUrl, latitude, longitude } = data;

    if (!agencyEmailed || severity === 'NONE') return;
    if (confidence < 0.6) return;

    sgMail.setApiKey(SENDGRID_API_KEY);

    const msg = {
      to: agencyEmailed,
      from: FROM_EMAIL,
      subject: `[StreamWatch] ${severity} Severity: ${formatClass(pollutionClass)} in ${county} County`,
      text: buildEmailBody({ pollutionClass, severity, confidence, county, photoUrl, latitude, longitude }),
    };

    await sgMail.send(msg);
    await event.data?.ref.update({ emailSent: true });
  }
);

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

    // More than 5 sightings in 5 minutes → hide as potential spam
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
}): string {
  const { pollutionClass, severity, confidence, county, photoUrl, latitude, longitude } = params;
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

Reported via StreamWatch — AI-powered waterway pollution detection for WA-01.
This is an automated alert. Do not reply to this email.
  `.trim();
}
