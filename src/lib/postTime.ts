// When a post was published, read from its id alone (no network).
// X: post ids are "snowflakes" whose top bits are milliseconds since 2010-11-04.
// Instagram: the shortcode decodes to a media id whose top bits are milliseconds since 2011-08-24.
// YouTube ids carry no time, so YouTube needs the page or the Data API (see /api/peek).

const X_EPOCH = 1288834974657n;
const IG_EPOCH = 1314220021721n;
const IG_ABC = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

export function xPostedAt(id: string): number | null {
  if (!/^\d{10,20}$/.test(id)) return null;
  const ms = Number((BigInt(id) >> 22n) + X_EPOCH);
  return ms > Date.UTC(2010, 10, 4) ? ms : null; // very old ids weren't snowflakes
}

export function igPostedAt(shortcode: string): number | null {
  const code = shortcode.slice(0, 11);
  if (!/^[A-Za-z0-9_-]{6,11}$/.test(code)) return null;
  let id = 0n;
  for (const c of code) id = id * 64n + BigInt(IG_ABC.indexOf(c));
  const ms = Number((id >> 23n) + IG_EPOCH);
  return ms > Date.UTC(2011, 7, 24) && ms < Date.now() + 864e5 ? ms : null;
}
