export type SharePlatformId =
  | "x"
  | "facebook"
  | "linkedin"
  | "whatsapp"
  | "reddit"
  | "telegram"
  | "email";

export type ShareTarget = {
  id: SharePlatformId;
  label: string;
  href: string;
};

export function buildShareTargets(input: {
  url: string;
  title: string;
}): ShareTarget[] {
  const url = encodeURIComponent(input.url);
  const title = encodeURIComponent(input.title);
  const titleAndUrl = encodeURIComponent(`${input.title} ${input.url}`);
  const emailBody = encodeURIComponent(`${input.title}\n\n${input.url}`);

  return [
    {
      id: "x",
      label: "X",
      href: `https://twitter.com/intent/tweet?url=${url}&text=${title}`,
    },
    {
      id: "facebook",
      label: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
    },
    {
      id: "linkedin",
      label: "LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
    },
    {
      id: "whatsapp",
      label: "WhatsApp",
      href: `https://wa.me/?text=${titleAndUrl}`,
    },
    {
      id: "reddit",
      label: "Reddit",
      href: `https://www.reddit.com/submit?url=${url}&title=${title}`,
    },
    {
      id: "telegram",
      label: "Telegram",
      href: `https://t.me/share/url?url=${url}&text=${title}`,
    },
    {
      id: "email",
      label: "Email",
      href: `mailto:?subject=${title}&body=${emailBody}`,
    },
  ];
}
