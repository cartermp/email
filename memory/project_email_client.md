---
name: Personal email client project
description: Next.js app — personal email client for pcarter@fastmail.com using JMAP
type: project
---

Next.js 15 App Router email client backed by Fastmail's JMAP API.

**Why:** User wants a personal, clean, minimal, fast email client they control.

**How to apply:** When suggesting features or changes, keep the UI minimal/monochrome. JMAP is the only backend protocol (Fastmail-first). Auth is a Bearer API token in FASTMAIL_API_TOKEN env var.

Key files:
- `src/lib/jmap.ts` — JMAP client (server-side only)
- `src/lib/types.ts` — shared TypeScript types
- `src/lib/format.ts` — date/address formatting
- `src/app/page.tsx` — inbox list (server component)
- `src/app/email/[id]/page.tsx` — email detail (server component)
- `src/app/compose/page.tsx` — compose page (server component wrapping client Composer)
- `src/components/Composer.tsx` — markdown editor + split preview (client component)
- `src/components/EmailBody.tsx` — renders HTML email in sandboxed iframe
- `src/app/api/send/route.ts` — send email API route
- `feature-list.md` — backlog of planned features
- `.env.local.example` — FASTMAIL_API_TOKEN

Markdown composing: uses `marked` library; split pane (write | preview); preview rendered in sandboxed iframe; send creates JMAP Email/set + EmailSubmission/set with multipart/alternative (text/plain markdown + text/html rendered).
