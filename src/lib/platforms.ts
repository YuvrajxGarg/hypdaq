// Platforms and link parsing. A submission is a link to the creator's OWN post.

export type PlatformId = "reels" | "youtube" | "x";

export type Platform = {
  id: PlatformId;
  label: string;
  short: string;
  unit: string; // what we count as "views"
  metrics: { key: "likes" | "comments" | "shares"; label: string }[];
  source: string; // how real numbers will be fetched
  status: "mock" | "ready";
};

export const PLATFORMS: Platform[] = [
  {
    id: "reels", label: "Instagram Reels", short: "Reels", unit: "plays",
    metrics: [{ key: "likes", label: "Likes" }, { key: "comments", label: "Comments" }, { key: "shares", label: "Shares" }],
    source: "Public reel page (plays, likes, comments), checked by cron every few hours", status: "mock",
  },
  {
    id: "youtube", label: "YouTube", short: "YouTube", unit: "views",
    metrics: [{ key: "likes", label: "Likes" }, { key: "comments", label: "Comments" }],
    source: "YouTube Data API (free, exact public counts)", status: "mock",
  },
  {
    id: "x", label: "X posts", short: "X", unit: "engagements",
    metrics: [{ key: "likes", label: "Likes" }, { key: "comments", label: "Replies" }, { key: "shares", label: "Reposts" }],
    source: "Public post data (likes, reposts, replies), checked by cron. Views aren't public, so X trades on engagements", status: "mock",
  },
];

export const platform = (id: PlatformId) => PLATFORMS.find((p) => p.id === id)!;

export type ParsedLink = { platform: PlatformId; postId: string; kind: string; url: string };

/** Returns a parsed link, or a clear error saying what to fix. */
export function parseLink(raw: string): ParsedLink | { error: string } {
  const s = raw.trim();
  if (!s) return { error: "Paste a link to your post." };
  let u: URL;
  try {
    u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
  } catch {
    return { error: "That doesn't look like a link. Copy it from the app's Share button." };
  }
  const host = u.hostname.replace(/^www\.|^m\./, "");
  const parts = u.pathname.split("/").filter(Boolean);

  if (host === "instagram.com") {
    const i = parts.findIndex((p) => p === "reel" || p === "reels" || p === "p");
    if (i >= 0 && parts[i + 1]) return { platform: "reels", postId: parts[i + 1], kind: parts[i] === "p" ? "Post" : "Reel", url: s };
    return { error: "Use the link to a single reel (instagram.com/reel/…), not a profile." };
  }
  if (host === "youtube.com" || host === "youtu.be") {
    if (host === "youtu.be" && parts[0]) return { platform: "youtube", postId: parts[0], kind: "Video", url: s };
    if (parts[0] === "shorts" && parts[1]) return { platform: "youtube", postId: parts[1], kind: "Short", url: s };
    const v = u.searchParams.get("v");
    if (v) return { platform: "youtube", postId: v, kind: "Video", url: s };
    return { error: "Use the link to one video or Short, not a channel." };
  }
  if (host === "x.com" || host === "twitter.com") {
    const i = parts.indexOf("status");
    if (i >= 0 && /^\d+$/.test(parts[i + 1] ?? "")) return { platform: "x", postId: parts[i + 1], kind: "Post", url: s };
    return { error: "Use the link to one post (x.com/you/status/…), not a profile." };
  }
  return { error: "Only Instagram Reels, YouTube and X links for now." };
}
