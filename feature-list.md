# Feature List

Features to implement over time, roughly in priority order.

## Planned

- **Calendar event responses** — parse `text/calendar` parts from incoming emails and surface Accept / Decline / Tentative actions inline in the email view
- **Paste images into composer** — handle `paste` events in the composer, upload the image blob to Fastmail via JMAP `Upload`, insert a `![](cid:...)` reference or inline data URL into the markdown, and embed it correctly in the outgoing multipart email

## Ideas (not yet prioritized)

- Folder / label navigation in the sidebar
- Thread view — group emails by `threadId`
- Search — `Email/query` with a `text` filter
- Keyboard shortcuts (j/k navigation, r to reply, c to compose, etc.)
- Reply / reply-all / forward
- Draft auto-save
- Multiple account support (Gmail, Outlook via IMAP bridge or OAuth)
- Unread count badge in sidebar
- Mark as read / unread / starred
- Archive and delete actions
- Mobile-responsive layout
- Dark mode
