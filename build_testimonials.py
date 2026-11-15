#!/usr/bin/env python3
"""Build testimonials.html from testimonials.json. Plain Python, no AI, no network.
Usage: python3 build_testimonials.py [testimonials.json] [testimonials.html]
To add a testimonial: append an object to "owner" or "renter" in the JSON, rerun.
Show a name (first name + last initial) only when name_ok is true AND display_name is filled in.
Optional "location" (City, ST) is appended after the name."""
import html, json, sys
from pathlib import Path

src = Path(sys.argv[1] if len(sys.argv) > 1 else "testimonials.json")
out = Path(sys.argv[2] if len(sys.argv) > 2 else "testimonials.html")
d = json.loads(src.read_text(encoding="utf-8"))
e = html.escape

def card(t):
    name = t["display_name"] if t.get("name_ok") and t.get("display_name") else t["who"]
    meta = e(name) + (", " + e(t["location"]) if t.get("location") else "")
    return f'<figure class="card"><blockquote>{e(t["quote"])}</blockquote><figcaption>{meta}</figcaption></figure>'

def section(title, intro, items):
    if not items:
        return ""
    cards = "\n".join(card(t) for t in items)
    return f'<section><h2>{e(title)}</h2><p class="note">{e(intro)}</p><div class="grid">{cards}</div></section>'

body = section("Renters", d.get("renter_disclosure", ""), d.get("renter", [])) + \
       section("Owners (2012-2013, earlier company)", d.get("owner_disclosure", ""), d.get("owner", []))

page = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Testimonials | RentAtWyndham</title>
<meta name="description" content="What owners said about working with RentAtWyndham's founder, John Ellis, at his earlier company (2012-2013).">
<style>
:root{{--bg:#fff;--fg:#1b2430;--muted:#5b6675;--card:#f4f6f9;--line:#dde3ea;--accent:#0b5cab}}
@media (prefers-color-scheme:dark){{:root{{--bg:#12171d;--fg:#e8edf2;--muted:#9aa6b4;--card:#1b222b;--line:#2b3440;--accent:#6db3f2}}}}
*{{box-sizing:border-box}}
body{{margin:0;background:var(--bg);color:var(--fg);font:17px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}}
main{{max-width:960px;margin:0 auto;padding:40px 16px 64px}}
h1{{font-size:2rem;margin:0 0 8px}}
h2{{font-size:1.4rem;margin:40px 0 4px}}
.lead{{color:var(--muted);margin:0 0 8px}}
.note{{color:var(--muted);font-size:.9rem;margin:0 0 16px;max-width:70ch}}
.grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px}}
.card{{margin:0;padding:20px;background:var(--card);border:1px solid var(--line);border-radius:10px}}
blockquote{{margin:0 0 12px;font-size:1.02rem}}
blockquote::before{{content:"\\201C"}} blockquote::after{{content:"\\201D"}}
figcaption{{color:var(--muted);font-size:.9rem}}
.cta{{margin-top:48px;padding:20px;border:1px solid var(--line);border-radius:10px}}
.cta a{{color:var(--accent);font-weight:600}}
</style>
</head>
<body>
<main>
<h1>Testimonials</h1>
<p class="lead">In their own words.</p>
{body}
<div class="cta">
<p><strong>Ready to rent?</strong> <a href="https://www.rentatwyndham.com/booking-request">www.rentatwyndham.com/booking-request</a></p>
<p>Questions? <a href="mailto:info@rentatwyndham.com">info@rentatwyndham.com</a></p>
</div>
</main>
</body>
</html>
"""
out.write_text(page, encoding="utf-8")
print(f"wrote {out} ({len(d.get('owner', []))} owner, {len(d.get('renter', []))} renter)")
