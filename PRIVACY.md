# StreamWatch Privacy Policy

*Last updated: July 16, 2026*

StreamWatch is a citizen-reporting app for waterway pollution in Washington's 1st Congressional District, built for the Congressional App Challenge. This page explains what data the app collects, how it's used, and who it's shared with.

## No account required

StreamWatch does not ask for your name, email, or phone number. When you first open the app, it creates an anonymous, randomly generated ID (via Firebase Anonymous Authentication) to associate your reports with your device. This ID is not linked to your identity by StreamWatch.

## What we collect

- **Photos** you take of a waterway when submitting a report.
- **Location (GPS coordinates)** captured at the moment you submit a report, used to place your report on the map, determine which waterway and downstream areas it affects, and route it to the correct agency.
- **The AI classification result** (pollution type and confidence score) generated from your photo.

We do not collect contacts, browsing history, analytics, or advertising identifiers. StreamWatch has no ad or analytics SDKs.

## How your data is used and shared

- **Your photo is sent to Google's Gemini API** (via a server-side proxy we control) to classify the type of pollution shown. Google's own privacy terms apply to that processing.
- **Your photo, location, and classification are stored in Firebase** (Google Cloud) and are **visible to other users of the app** on the community map and sightings history — this is a core feature of the app, since it's meant to build a shared, public record of waterway conditions. Do not submit a photo you don't want other app users to see.
- **For reports rated Medium or High severity**, a summary (photo link, location, pollution type, and confidence score) is emailed via SendGrid to the relevant environmental agency (e.g., WA Department of Ecology or King County) so they can investigate.
- We do not sell your data, and we do not share it with advertisers.

## Data retention and deletion

Reports are kept indefinitely to preserve the historical record of waterway conditions, unless removed by app moderation. Since there's no account system, we have no way to look up "your" reports specifically — if you'd like a report you submitted removed, contact us with the location, approximate time, and description, and we'll do our best to identify and remove it.

## Children's privacy

StreamWatch doesn't knowingly collect personal information from anyone, including children, since no account, name, or contact info is ever requested. If you believe a child has submitted a photo containing personal information and want it removed, contact us below.

## Changes to this policy

If this policy changes, the updated version will be posted at this same URL with a new "last updated" date.

## Contact

Questions or removal requests: **rishrao987@gmail.com**
