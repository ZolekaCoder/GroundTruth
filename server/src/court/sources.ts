import type { Case, Role, Source } from "./types.js";

const UA = "TheGroundTruth/1.0 (hackathon fact-checking research; local)";

function decode(s: string) {
  return s
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

export function htmlToText(html: string): { title: string; text: string; published?: string } {
  const title = decode(html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i)?.[1]
    ?? html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? "").trim();
  const published = html.match(/<meta[^>]+(?:property|name)=["'](?:article:published_time|date|pubdate)["'][^>]+content=["']([^"']+)/i)?.[1];
  const body = html
    .replace(/<(script|style|noscript|svg|nav|footer|header|aside|form)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<\/(p|h[1-6]|li|blockquote|div|br)>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
  const text = decode(body).split("\n").map((l) => l.replace(/\s+/g, " ").trim()).filter((l) => l.length > 40).join("\n");
  return { title, text, published };
}

/** Normalise for quote verification: case, whitespace and typographic punctuation. */
export function norm(s: string) {
  return s.toLowerCase().replace(/[‘’‛]/g, "'").replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-").replace(/\[\d+\]/g, "").replace(/\s+/g, " ").trim();
}

export function quoteIsGrounded(source: Source, quote: string) {
  const q = norm(quote).replace(/^["']|["']$/g, "").replace(/\.\.\.|…/g, "\u0000");
  if (q.replace(/\u0000/g, "").length < 12) return false;
  const hay = norm(source.text);
  // Allow ellipses: every fragment must appear, in order.
  let from = 0;
  for (const frag of q.split("\u0000").map((f) => f.trim()).filter(Boolean)) {
    const i = hay.indexOf(frag, from);
    if (i < 0) return false;
    from = i + frag.length;
  }
  return true;
}

function publisherOf(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return "unknown"; }
}

export async function searchWikipedia(query: string) {
  const u = new URL("https://en.wikipedia.org/w/api.php");
  u.search = new URLSearchParams({ action: "query", list: "search", srsearch: query, srlimit: "5", format: "json", origin: "*" }).toString();
  const res = await fetch(u, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`Wikipedia search failed (${res.status})`);
  const data: any = await res.json();
  return (data.query?.search ?? []).map((r: any) => ({
    title: r.title as string,
    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(r.title.replace(/ /g, "_"))}`,
    snippet: decode(String(r.snippet).replace(/<[^>]+>/g, "")),
  }));
}

async function fetchWikipedia(url: string) {
  const title = decodeURIComponent(new URL(url).pathname.split("/wiki/")[1] ?? "");
  const u = new URL("https://en.wikipedia.org/w/api.php");
  u.search = new URLSearchParams({ action: "query", prop: "extracts|revisions", explaintext: "1", redirects: "1", titles: title, rvprop: "timestamp", format: "json", origin: "*" }).toString();
  const res = await fetch(u, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(12_000) });
  if (!res.ok) throw new Error(`Wikipedia fetch failed (${res.status})`);
  const data: any = await res.json();
  const page: any = Object.values(data.query?.pages ?? {})[0];
  if (!page || page.missing !== undefined || !page.extract) throw new Error(`No Wikipedia article found for "${title}"`);
  return { title: page.title as string, text: page.extract as string, published: page.revisions?.[0]?.timestamp as string | undefined };
}

export async function fetchSource(c: Case, url: string, by: Role | "clerk"): Promise<Source> {
  const existing = c.sources.find((s) => s.url === url);
  if (existing) {
    if (by !== "clerk" && !existing.readBy.includes(by)) existing.readBy.push(by);
    return existing;
  }
  let parsed: { title: string; text: string; published?: string };
  if (/^https?:\/\/[a-z]+\.wikipedia\.org\/wiki\//.test(url)) {
    parsed = await fetchWikipedia(url);
  } else {
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "text/html" }, signal: AbortSignal.timeout(12_000), redirect: "follow" });
    if (!res.ok) throw new Error(`Could not retrieve ${url} (HTTP ${res.status})`);
    parsed = htmlToText(await res.text());
    if (parsed.text.length < 200) throw new Error(`Retrieved ${url} but it contained almost no readable text (paywall or script-rendered page).`);
  }
  const source: Source = {
    id: `S${c.sources.length + 1}`,
    url,
    title: parsed.title || url,
    publisher: publisherOf(url),
    retrievedAt: Date.now(),
    published: parsed.published,
    text: parsed.text.slice(0, 200_000),
    readBy: by === "clerk" ? [] : [by],
  };
  c.sources.push(source);
  return source;
}

/** Return the passages of a source most relevant to `focus`, so agents see signal rather than 40k chars. */
export function excerpt(source: Source, focus: string, budget = 5000) {
  const paras = source.text.split(/\n+/).map((p) => p.trim()).filter((p) => p.length > 30);
  const terms = norm(focus).split(/[^a-z0-9]+/).filter((t) => t.length > 3);
  const scored = paras.map((p, i) => {
    const n = norm(p);
    return { p, i, score: terms.reduce((s, t) => s + (n.includes(t) ? 1 : 0), 0) + (i < 3 ? 0.5 : 0) };
  });
  const picked = scored.sort((a, b) => b.score - a.score).slice(0, 14).sort((a, b) => a.i - b.i);
  let out = "";
  for (const { p } of picked) {
    if (out.length + p.length > budget) break;
    out += p + "\n\n";
  }
  return out.trim() || source.text.slice(0, budget);
}
