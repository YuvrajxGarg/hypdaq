// Reads a post's public details and numbers, so a player only pastes a link and the number checker
// can take snapshots. Free sources only:
//   YouTube: Data API when YOUTUBE_API_KEY is set (views, likes, comments, publish time); otherwise
//            oEmbed (title, channel) + the watch page (views, likes, upload time).
//   X:       the public embed data (text, author, time, likes, replies, reposts when given).
//   Instagram: the public embed page (caption, username, likes, plays when given). Instagram often
//            blocks servers; then numbers come back empty and the client says so.
// Post time for X and Instagram also comes from the id itself (src/lib/postTime.ts).
import { NextRequest, NextResponse } from "next/server";
import { parseLink } from "@/lib/platforms";
import { igPostedAt, xPostedAt } from "@/lib/postTime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Stats = { views: number; likes: number; comments: number; shares: number };
type Peek = { title?: string; creator?: string; postedAt?: number; thumb?: string; stats?: Stats; source: string[] };

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

async function get(url: string, json = false) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 6000);
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { "user-agent": UA, "accept-language": "en-US,en" }, cache: "no-store" });
    if (!r.ok) return null;
    return json ? await r.json() : await r.text();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

const decode = (s: string) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d));
const meta = (html: string, prop: string) => html.match(new RegExp(`<meta[^>]+(?:property|name|itemprop)="${prop}"[^>]+content="([^"]*)"`, "i"))?.[1];
const int = (v: unknown) => (v == null || v === "" ? undefined : Number(String(v).replace(/[^\d]/g, "")) || 0);
const first = (html: string, res: RegExp[]) => { for (const re of res) { const m = html.match(re); if (m) return m[1]; } return undefined; };

async function youtube(id: string, out: Peek) {
  out.thumb = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
  const key = process.env.YOUTUBE_API_KEY;
  if (key) {
    const d = await get(`https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${id}&key=${key}`, true);
    const v = d?.items?.[0];
    if (v) {
      out.title = v.snippet.title; out.creator = v.snippet.channelTitle; out.postedAt = Date.parse(v.snippet.publishedAt);
      out.stats = { views: int(v.statistics.viewCount) ?? 0, likes: int(v.statistics.likeCount) ?? 0, comments: int(v.statistics.commentCount) ?? 0, shares: 0 };
      out.source.push("YouTube Data API");
      return;
    }
  }
  const watch = `https://www.youtube.com/watch?v=${id}`;
  const [o, page] = await Promise.all([get(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(watch)}`, true), get(watch)]);
  if (o) { out.title = o.title; out.creator = o.author_name; out.source.push("YouTube oEmbed"); }
  if (typeof page === "string") {
    const up = first(page, [/"(?:uploadDate|publishDate)":"([^"]+)"/]) ?? meta(page, "uploadDate");
    if (up && !Number.isNaN(Date.parse(up))) out.postedAt = Date.parse(up);
    const views = int(first(page, [/"videoDetails":\{[^}]*?"viewCount":"(\d+)"/, /"viewCount":"(\d+)"/, /itemprop="interactionCount" content="(\d+)"/]));
    const likes = int(first(page, [/along with ([\d,]+) other/, /"likeCount":"?(\d+)/]));
    const comments = int(first(page, [/"commentCount":\{"simpleText":"([\d,.]+)"/]));
    if (views != null) { out.stats = { views, likes: likes ?? 0, comments: comments ?? 0, shares: 0 }; out.source.push("YouTube page"); }
  }
}

async function x(id: string, out: Peek) {
  out.postedAt = xPostedAt(id) ?? undefined;
  const token = ((Number(id) / 1e15) * Math.PI).toString(36).replace(/(0+|\.)/g, "");
  const d = await get(`https://cdn.syndication.twimg.com/tweet-result?id=${id}&lang=en&token=${token}`, true);
  if (d && d.id_str) {
    out.title = d.text; out.creator = d.user?.screen_name;
    if (d.created_at) out.postedAt = Date.parse(d.created_at);
    out.stats = { views: 0, likes: int(d.favorite_count) ?? 0, comments: int(d.conversation_count ?? d.reply_count) ?? 0, shares: int(d.retweet_count ?? d.quote_count) ?? 0 };
    out.source.push("X embed data");
    return;
  }
  const o = await get(`https://publish.twitter.com/oembed?omit_script=1&url=${encodeURIComponent(`https://twitter.com/i/status/${id}`)}`, true);
  if (o) {
    out.creator = (o.author_url as string | undefined)?.split("/").pop() ?? o.author_name;
    const text = (o.html as string).match(/<p[^>]*>([\s\S]*?)<\/p>/)?.[1];
    if (text) out.title = decode(text.replace(/<br\s*\/?>/g, " ").replace(/<[^>]+>/g, "")).trim();
    out.source.push("X oEmbed");
  }
}

async function instagram(code: string, out: Peek) {
  out.postedAt = igPostedAt(code) ?? undefined;
  const page = await get(`https://www.instagram.com/p/${code}/embed/captioned/`);
  if (typeof page === "string") {
    const json = page.replace(/\\"/g, '"');
    const user = first(json, [/"username":"([\w.]+)"/, /class="UsernameText">([\w.]+)</]);
    const likes = int(first(json, [/"edge_liked_by":\{"count":(\d+)/, /"like_count":(\d+)/, /([\d,]+) likes/]));
    const plays = int(first(json, [/"video_view_count":(\d+)/, /"play_count":(\d+)/, /"video_play_count":(\d+)/]));
    const comments = int(first(json, [/"edge_media_to_comment":\{"count":(\d+)/, /"comment_count":(\d+)/]));
    const caption = first(page, [/class="Caption"[^>]*>[\s\S]*?<\/a>([\s\S]*?)<div/]);
    if (user) out.creator = user;
    if (caption) out.title = decode(caption.replace(/<br\s*\/?>/g, " ").replace(/<[^>]+>/g, "")).trim().slice(0, 140);
    if (likes != null || plays != null) out.stats = { views: plays ?? 0, likes: likes ?? 0, comments: comments ?? 0, shares: 0 };
    if (user || likes != null) out.source.push("Instagram embed");
  }
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("url") ?? "";
  const p = parseLink(raw);
  if ("error" in p) return NextResponse.json({ error: p.error }, { status: 400 });
  const out: Peek = { source: [] };
  if (p.platform === "youtube") await youtube(p.postId, out);
  else if (p.platform === "x") await x(p.postId, out);
  else await instagram(p.postId, out);
  if (!out.creator) {
    const parts = new URL(/^https?:/i.test(raw) ? raw : `https://${raw}`).pathname.split("/").filter(Boolean);
    if (parts.length > 2 && !["i", "reel", "reels", "p", "shorts", "watch"].includes(parts[0])) out.creator = parts[0].replace(/^@/, "");
  }
  if (out.title) out.title = out.title.slice(0, 160);
  return NextResponse.json({ ...p, ...out }, { headers: { "cache-control": "no-store" } });
}
