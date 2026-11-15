#!/usr/bin/env python3
"""Build testimonials.html from testimonials.json. Plain Python, no AI, no network.
Usage: python3 build_testimonials.py [testimonials.json] [testimonials.html] [template.html]
To add a testimonial: append an object to "owner" or "renter" in the JSON, rerun.
Show a name (first name + last initial) only when name_ok is true AND display_name is filled in.
Optional "location" (City, ST) is appended after the name.

The page shell (head links, header, menu, footer, site script) is copied from
faqs.html, so the Testimonials page always matches the rest of the site. Rerun
this script after changing the site menu or footer. It stops with an error if
faqs.html no longer has the parts it expects."""
import html, json, re, sys
from pathlib import Path

src = Path(sys.argv[1] if len(sys.argv) > 1 else "testimonials.json")
out = Path(sys.argv[2] if len(sys.argv) > 2 else "testimonials.html")
tpl = Path(sys.argv[3] if len(sys.argv) > 3 else "faqs.html")
d = json.loads(src.read_text(encoding="utf-8"))
t = tpl.read_text(encoding="utf-8")
e = html.escape

URL = "https://www.rentatwyndham.com/testimonials"
TITLE = "Testimonials | RentAtWyndham.com"
DESC = "What owners said about working with RentAtWyndham's founder, John Ellis, at his earlier company (2012-2013)."


def sub1(pattern, repl, text, flags=re.S):
    """Replace exactly one match, or stop."""
    new, n = re.subn(pattern, lambda m: repl, text, count=1, flags=flags)
    if n != 1:
        sys.exit(f"build_testimonials: template {tpl} is missing: {pattern}")
    return new


def card(x):
    name = x["display_name"] if x.get("name_ok") and x.get("display_name") else x["who"]
    meta = e(name) + (", " + e(x["location"]) if x.get("location") else "")
    return (f'<figure class="ccard tcard"><blockquote>{e(x["quote"])}</blockquote>'
            f'<figcaption>{meta}</figcaption></figure>')


def section(title, intro, items):
    if not items:
        return ""
    cards = "\n".join(card(x) for x in items)
    return (f'  <div class="sec-head top-gap"><h2>{e(title)}</h2><p>{e(intro)}</p></div>\n'
            f'  <div class="cgrid">{cards}</div>\n')


body = section("Renters", d.get("renter_disclosure", ""), d.get("renter", [])) + \
       section("Owners (2012-2013, earlier company)", d.get("owner_disclosure", ""), d.get("owner", []))

main = ('<main id="main">\n<section><div class="wrap">\n'
        '  <div class="sec-head short"><span class="eyebrow">Testimonials</span><h1>In their own words</h1></div>\n'
        f'{body}'
        '</div></section>\n'
        '<section class="tight"><div class="wrap">\n'
        '  <p class="after"><strong>Ready to rent?</strong> '
        '<a href="https://www.rentatwyndham.com/booking-request">www.rentatwyndham.com/booking-request</a></p>\n'
        '  <p>Questions? <a href="mailto:info@rentatwyndham.com">info@rentatwyndham.com</a></p>\n'
        '</div></section>\n'
        '</main>')

style = ('<style>\n'
         '.tcard{margin:0}\n'
         '.tcard blockquote{margin:0;font-size:1.02rem}\n'
         '.tcard blockquote::before{content:"\\201C"}.tcard blockquote::after{content:"\\201D"}\n'
         '.tcard figcaption{color:var(--muted);font-size:.9rem;font-weight:700}\n'
         '</style>\n')

p = t
p = sub1(r"<title>.*?</title>", f"<title>{e(TITLE)}</title>", p)
p = sub1(r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{e(DESC)}">', p)
p = sub1(r'<link rel="canonical" href="[^"]*">', f'<link rel="canonical" href="{URL}">', p)
p = sub1(r'<meta property="og:title" content="[^"]*">', f'<meta property="og:title" content="{e(TITLE)}">', p)
p = sub1(r'<meta property="og:description" content="[^"]*">', f'<meta property="og:description" content="{e(DESC)}">', p)
p = sub1(r'<meta property="og:url" content="[^"]*">', f'<meta property="og:url" content="{URL}">', p)
p = sub1(r'<script type="application/ld\+json">.*?</script>\n', "", p)
p = sub1(r"</head>", style + "</head>", p)
p = sub1(r'<a href="/faqs" class="active">FAQ</a>', '<a href="/faqs">FAQ</a>', p)
p = sub1(r'<a href="/testimonials">Testimonials</a>', '<a href="/testimonials" class="active">Testimonials</a>', p)
p = sub1(r"<main\b.*?</main>", main, p)

out.write_text(p, encoding="utf-8")
print(f"wrote {out} ({len(d.get('owner', []))} owner, {len(d.get('renter', []))} renter)")
