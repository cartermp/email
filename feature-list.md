# Feature List

Features to implement over time, roughly in priority order.

## Planned

- Good mobile support
- **Calendar event responses** — parse `text/calendar` parts from incoming emails and surface Accept / Decline / Tentative actions inline in the email view
- ~~**Paste images into composer**~~ — done: paste inserts `@@id@@` placeholder, uploads to JMAP, preview uses base64 data URL, send builds `multipart/related` with CID references
- **Mark as unread** — button in the email detail view that removes `$seen` via `Email/set` and returns to inbox

## Ideas (not yet prioritized)

- Folder / label navigation in the sidebar
- Thread view — group emails by `threadId`
- Keyboard shortcuts (j/k navigation, r to reply, c to compose, etc.)
- Reply / reply-all / forward
- Draft auto-save
- Multiple account support (Gmail, Outlook via IMAP bridge or OAuth)
- Unread count badge in sidebar
- Mark as starred
- Archive and delete actions
- Mobile-responsive layout
- Dark mode
