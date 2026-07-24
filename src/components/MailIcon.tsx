import type { SVGProps } from "react";

export type MailIconName =
  | "archive"
  | "calendar"
  | "check"
  | "chevronDown"
  | "compose"
  | "drafts"
  | "inbox"
  | "mail"
  | "more"
  | "pin"
  | "reply"
  | "search"
  | "sent"
  | "settings"
  | "spam"
  | "trash"
  | "unread"
  | "x";

interface Props extends SVGProps<SVGSVGElement> {
  name: MailIconName;
}

export default function MailIcon({
  name,
  className = "h-5 w-5",
  ...props
}: Props) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true,
    ...props,
  };

  switch (name) {
    case "archive":
      return (
        <svg {...common}>
          <path d="M4 7.5h16l-1 12H5l-1-12Z" />
          <path d="M3 4.5h18v3H3zM9 11.5h6" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="17" rx="2" />
          <path d="M8 2v4M16 2v4M3 10h18" />
        </svg>
      );
    case "check":
      return (
        <svg {...common} strokeWidth={2.25}>
          <path d="m5 12.5 4.25 4.25L19 7" />
        </svg>
      );
    case "chevronDown":
      return (
        <svg {...common}>
          <path d="m7 9.5 5 5 5-5" />
        </svg>
      );
    case "compose":
      return (
        <svg {...common}>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5Z" />
        </svg>
      );
    case "drafts":
      return (
        <svg {...common}>
          <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z" />
          <path d="M14 3v6h6M8 14h8M8 18h5" />
        </svg>
      );
    case "inbox":
      return (
        <svg {...common}>
          <path d="M4 4h16v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4Z" />
          <path d="M4 13h4l2 3h4l2-3h4" />
        </svg>
      );
    case "mail":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="14" rx="2.5" />
          <path d="m4 7 7 5.5a1.6 1.6 0 0 0 2 0L20 7" />
        </svg>
      );
    case "more":
      return (
        <svg {...common} fill="currentColor" stroke="none">
          <circle cx="5" cy="12" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="19" cy="12" r="1.5" />
        </svg>
      );
    case "pin":
      return (
        <svg {...common}>
          <path d="m14.5 4 5.5 5.5-3 1.2-3.7 3.7.2 3-1.5 1.5-3.2-3.2-3.7 3.7-.9-.9 3.7-3.7-3.2-3.2 1.5-1.5 3 .2 3.7-3.7L14.5 4Z" />
        </svg>
      );
    case "reply":
      return (
        <svg {...common}>
          <path d="m9.5 7-5 5 5 5" />
          <path d="M5 12h7.5c4.25 0 6.5 2.25 6.5 6" />
        </svg>
      );
    case "search":
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="6.5" />
          <path d="m16 16 4 4" />
        </svg>
      );
    case "sent":
      return (
        <svg {...common}>
          <path d="m21 3-7.5 18-3.1-7.4L3 10.5 21 3Z" />
          <path d="m10.4 13.6 4-4" />
        </svg>
      );
    case "settings":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.56V21h-4v-.08A1.7 1.7 0 0 0 9 19.36a1.7 1.7 0 0 0-1.87.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.64 15a1.7 1.7 0 0 0-1.56-1H3v-4h.08A1.7 1.7 0 0 0 4.64 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.64a1.7 1.7 0 0 0 1-1.56V3h4v.08A1.7 1.7 0 0 0 15 4.64a1.7 1.7 0 0 0 1.87-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.36 9a1.7 1.7 0 0 0 1.56 1H21v4h-.08A1.7 1.7 0 0 0 19.4 15Z" />
        </svg>
      );
    case "spam":
      return (
        <svg {...common}>
          <path d="M8.5 3h7L21 8.5v7L15.5 21h-7L3 15.5v-7L8.5 3Z" />
          <path d="M12 7.5v5M12 16.5h.01" />
        </svg>
      );
    case "trash":
      return (
        <svg {...common}>
          <path d="M4 7h16M9 7V4h6v3M6.5 7l1 14h9l1-14M10 11v6M14 11v6" />
        </svg>
      );
    case "unread":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="14" rx="2.5" />
          <path d="m4 7 7 5.5a1.6 1.6 0 0 0 2 0L20 7" />
          <circle cx="19" cy="5" r="3" fill="currentColor" stroke="none" />
        </svg>
      );
    case "x":
      return (
        <svg {...common} strokeWidth={2}>
          <path d="m6 6 12 12M18 6 6 18" />
        </svg>
      );
  }
}
