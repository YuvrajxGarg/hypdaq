// Reads what we can about a post from free public sources, so a player only pastes a link.
// YouTube: oEmbed (title, channel) + the watch page (upload time). X: oEmbed (author, text).
// Instagram: the public reel page's meta tags when Instagram allows it (often blocked from servers).
// Post time for X and Instagram comes from the id itself (src/lib/postTime.ts), so it needs no fetch.
import { NextRequest, NextResponse } from "next/server";
import { parseLink } from "@/lib/platforms";
import { igPostedAt, xPostedAt } from "@/lib/postTime";

export const runtime = "nodejs";

type Peek = { title?: string; creator?: string; postedAt?: number; source: string[] };

async function get(url: string, json = false) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 5000);
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { "user-agent": "Mozilla/5.0 (compatible; HypdaqBot/0.1)", "accept-language": "en" }, cache: "no-store" });
    if (!r.ok) return null;
    return json ? await r.json() : await r.text();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

const decode = (s: string) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d));
const meta = (html: string, prop: string) => html.match(new RegExp(`<meta[^>]+(?:property|name)="${prop}"[^>]+content="([^"]*)"`, "i"))?.[1];

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("url") ?? "";
  const p = parseLink(raw);
  if ("error" in p) return NextResponse.json({ error: p.error }, { status: 400 });
  const out: Peek = { source: [] };

  if (p.platform === "youtube") {
    const watch = `https://www.youtube.com/watch?v=${p.postId}`;
    const [o, page] = await Promise.all([get(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(watch)}`, true), get(watch)]);
    if (o) { out.title = o.title; out.creator = o.author_name; out.source.push("YouTube oEmbed"); }
    const up = typeof page === "string" ? page.match(/"(?:uploadDate|publishDate)":"([^"]+)"/)?.[1] ?? meta(page, "uploadDate") : undefined;
    if (up && !Number.isNaN(Date.parse(up))) { out.postedAt = Date.parse(up); out.source.push("YouTube page"); }
  } else if (p.platform === "x") {
    out.postedAt = xPostedAt(p.postId) ?? undefined;
    const o = await get(`https://publish.twitter.com/oembed?omit_script=1&url=${encodeURIComponent(`https://twitter.com/i/status/${p.postId}`)}`, true);
    if (o) {
      out.creator = (o.author_url as string | undefined)?.split("/").pop() ?? o.author_name;
      const text = (o.html as string).match(/<p[^>]*>([\s\S]*?)<\/p>/)?.[1];
      if (text) out.title = decode(text.replace(/<br\s*\/?>/g, " ").replace(/<[^>]+>/g, "")).trim();
      out.source.push("X oEmbed");
    }
  } else {
    out.postedAt = igPostedAt(p.postId) ?? undefined;
    const page = await get(`https://www.instagram.com/reel/${p.postId}/`);
    if (typeof page === "string") {
      const t = meta(page, "og:title");
      const d = meta(page, "og:description");
      // og:description looks like: `1,234 likes, 56 comments - handle on November 12, 2026: "caption"`
      const m = d && decode(d).match(/-\s*([\w.]+)\s+on\s+[^:]+:\s*"?([\s\S]*?)"?\.?$/);
      if (m) { out.creator = m[1]; out.title = m[2]; }
      else if (t) out.title = decode(t);
      if (out.title || out.creator) out.source.push("Instagram page");
    }
    const fromUrl = new URL(/^https?:/i.test(raw) ? raw : `https://${raw}`).pathname.split("/").filter(Boolean);
    if (!out.creator && fromUrl.length > 2 && !["reel", "reels", "p"].includes(fromUrl[0])) out.creator = fromUrl[0];
  }
  if (out.title) out.title = out.title.slice(0, 140);
  return NextResponse.json({ ...p, ...out }, { headers: { "cache-control": "public, max-age=300" } });
}
