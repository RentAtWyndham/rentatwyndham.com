// Playwright checks for the four site forms with a mocked script.google.com. Usage: node forms.test.js <site dir>
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = process.argv[2]; let pass = 0, fail = 0; const fails = [];
const ok = (c, m) => { if (c) pass++; else { fail++; fails.push(m); console.log('FAIL: ' + m); } };
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p === '/') p = '/index.html'; let f = path.join(ROOT, p);
  if (!path.extname(f)) f += '.html'; fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); r.end('nf'); } else { r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); r.end(b); } }); });

(async () => {
  await new Promise(r => srv.listen(8765, r));
  const browser = await chromium.launch();
  // mode: {json} | 'net' (abort) | 'html' (unreadable reply); delay ms
  async function open(url, width, mock) {
    const ctx = await browser.newContext({ viewport: { width, height: 844 } }); const page = await ctx.newPage(); const posts = [];
    page.on('pageerror', e => ok(false, url + ' page error: ' + e.message));
    await page.route('**/*', async route => { const u = route.request().url();
      if (u.startsWith('http://localhost:8765')) return route.continue();
      if (u.includes('script.google.com')) { posts.push(route.request().postData() || ''); const m = mock.current;
        if (m.delay) await new Promise(r => setTimeout(r, m.delay));
        if (m.kind === 'net') return route.abort('failed');
        if (m.kind === 'html') return route.fulfill({ status: 200, contentType: 'text/html', headers: { 'access-control-allow-origin': '*' }, body: '<html>Error</html>' });
        return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(m.json) }); }
      return route.abort(); });
    await page.goto('http://localhost:8765' + url); return { page, posts, ctx };
  }
  const noScroll = async (page, label) => ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), label + ': no sideways scroll');
  const errs = page => page.$$eval('.field-err', a => a.map(x => x.textContent));
  const vis = (page, sel) => page.$eval(sel, e => !e.hidden && e.offsetParent !== null).catch(() => false);
  const text = (page, sel) => page.$eval(sel, e => e.textContent.trim());

  const FORMS = [
    { name: 'booking', url: '/booking-request', form: '#reqForm', btn: '#submitBtn', msg: '#formMsg', okSel: '#okBox', refWrap: '#okRefWrap', ref: '#okRef', idle: 'Send my request', busy: 'Sending...', slow: 'Sending - this can take up to 20 seconds...',
      nEmpty: 6, emptyHas: ['Enter your first name.', 'Enter your last name.', 'Enter your email address.', 'Enter a phone number.', 'Choose a check-in date.', 'Choose a check-out date.'],
      fill: async p => { await p.fill('#fn', 'Test'); await p.fill('#ln', 'Formcheck'); await p.fill('#em', 'jellis@rentatwyndham.com'); await p.fill('#ph', '555-010-0100');
        await p.selectOption('#resort', { index: 1 }); await p.fill('#ad', '2'); await p.selectOption('#size', { index: 2 }); await p.fill('#ci', '2027-03-11'); await p.fill('#co', '2027-03-14'); await p.fill('#notes', 'TEST'); },
      bad: async p => { await p.fill('#em', 'nope@x'); await p.fill('#ph', '12345'); }, gate: p => p.evaluate(() => { document.getElementById('started').value = String(Date.now() - 5000); }),
      okJson: { ok: true, id: 'WEB-20261119-101010-FORMCH' }, noIdOk: false, id: 'WEB-20261119-101010-FORMCH',
      codes: [[{ ok: false, error: 'missing_required' }, /required details didn't come through/], [{ ok: false, error: 'Exception: boom' }, /couldn't confirm your request/], [{ ok: true, ignored: 'honeypot' }, null]],
      failRe: /couldn't confirm your request went through.*info@rentatwyndham\.com/, okChecks: async p => { ok(/Thank you, Test\. We received your request\./.test(await text(p, '#okTitle')), 'booking: title thanks by name');
        const sum = await text(p, '#okSum'); ok(/Glacier Canyon/.test(sum) && /Mar 11 to Mar 14, 2027 \(3 nights\)/.test(sum) && /2 adults/.test(sum), 'booking: summary repeats the request (' + sum + ')');
        ok(await text(p, '#okEmail') === 'jellis@rentatwyndham.com', 'booking: email shown'); ok(!(await vis(p, '#reqForm')) && !(await vis(p, '.aside')), 'booking: form + side box hidden'); } },
    { name: 'owner', url: '/rent-your-points', form: '#ownerForm', btn: '#oSubmit', msg: '#oMsg', okSel: '#oOk', refWrap: '#oRefWrap', ref: '#oRef', idle: 'Submit', busy: 'Sending...', slow: 'Sending - this can take up to 20 seconds...',
      nEmpty: 6, emptyHas: ['Enter your first name.', 'Enter your last name.', 'Enter your email address.', 'Enter a phone number.', 'Enter the home resort or contract name for contract 1.', 'Choose about how many points contract 1 has.'],
      fill: async p => { await p.fill('#ownerForm [name=first_name]', 'test'); await p.fill('#ownerForm [name=last_name]', 'Formcheck'); await p.fill('#ownerForm [name=email]', 'jellis@rentatwyndham.com'); await p.fill('#ownerForm [name=phone]', '555-010-0100');
        await p.fill('#ownerForm [data-k=resort]', 'TEST resort'); const pts = await p.$('#ownerForm [data-k=points]'); if ((await pts.evaluate(e => e.tagName)) === 'SELECT') await pts.selectOption({ index: 1 }); else await pts.fill('200000'); },
      bad: async p => { await p.fill('#ownerForm [name=email]', 'nope@x'); await p.fill('#ownerForm [name=phone]', '12345'); }, gate: p => p.evaluate(() => { document.getElementById('oStarted').value = String(Date.now() - 5000); }),
      okJson: { ok: true, id: 'WEB-20261119-101010-FORMCH' }, noIdOk: true, id: 'WEB-20261119-101010-FORMCH',
      codes: [[{ ok: false, error: 'bad_email' }, /check your email address/], [{ ok: false, error: 'bad_phone' }, /area code/], [{ ok: false, error: 'missing_contracts' }, /at least one contract/], [{ ok: false, error: 'missing_first_name' }, /first name didn't come through/],
        [{ ok: false, error: 'missing_last_name' }, /last name didn't come through/], [{ ok: false, error: 'missing_email' }, /email didn't come through/], [{ ok: false, error: 'missing_phone' }, /phone number didn't come through/], [{ ok: false, error: 'check_failed' }, /quick check/], [{ ok: false, error: 'weird' }, /couldn't confirm your application/]],
      failRe: /couldn't confirm your application went through.*join@rentatwyndham\.com/, okChecks: async p => { ok(/Thank you, Test! We're so glad you reached out\./.test(await text(p, '#oOk h2')), 'owner: thanks by name'); ok(await text(p, '#oEmail') === 'jellis@rentatwyndham.com', 'owner: email shown');
        ok(!(await vis(p, '#ownerForm')), 'owner: form hidden'); ok((await p.$$('#oOk .thanks-steps li')).length === 3, 'owner: three next steps');
        const bk = await p.$eval('#oBook', e => ({ href: e.href, t: e.target, txt: e.textContent.trim(), v: !e.hidden && e.offsetParent !== null })).catch(() => ({}));
        ok(bk.v && bk.href === 'https://calendar.app.google/CTuLzUTubQTp26sS9' && bk.t === '_blank' && bk.txt === 'Pick a time to talk with John', 'owner: booking button shown, opens in a new tab');
        ok(await p.$eval('#oOk', e => Boolean(e.querySelector('#oBook').compareDocumentPosition(e.querySelector('.thanks-steps')) & 4)), 'owner: booking button above the steps');
        ok(/pick a time.*or we'll reach out within a day/i.test(await text(p, '#oOk .thanks-lead')), 'owner: lead says pick a time now or we reach out within a day');
        ok((await p.$$eval('a[href="https://calendar.app.google/CTuLzUTubQTp26sS9"][target=_blank]', a => a.length)) === 3, 'owner: hero, form and thank-you booking links'); } },
    { name: 'resale', url: '/wyndham-points-for-sale', form: '#buyerForm', btn: '#bSubmit', msg: '#bMsg', okSel: '#bOk', refWrap: '#bRefWrap', ref: '#bRef', idle: 'Submit', busy: 'Sending...', slow: 'Sending - this can take up to 20 seconds...',
      nEmpty: 4, emptyHas: ['Enter your first name.', 'Enter your last name.', 'Enter your email address.'],
      fill: async p => { await p.fill('#buyerForm [name=first_name]', 'test'); await p.fill('#buyerForm [name=last_name]', 'Formcheck'); await p.fill('#buyerForm [name=email]', 'jellis@rentatwyndham.com'); await p.fill('#buyerForm [name=phone]', '555-010-0100');
        await p.waitForSelector('#cGrid .pick'); if (!(await p.inputValue('#buyerForm [name=contracts]'))) await p.click('#cGrid .pick:not([disabled])'); },
      bad: async p => { await p.fill('#buyerForm [name=email]', 'nope@x'); await p.fill('#buyerForm [name=phone]', '12345'); }, gate: p => p.evaluate(() => { document.getElementById('bStarted').value = String(Date.now() - 5000); }),
      okJson: { ok: true, id: 'RES-20261119-101010-FORMCH' }, noIdOk: true, id: 'RES-20261119-101010-FORMCH',
      codes: [[{ ok: false, error: 'missing_required' }, /required details didn't come through/], [{ ok: false, error: 'Exception: sheet down' }, /couldn't confirm your request/]],
      failRe: /couldn't confirm your request went through.*owners@rentatwyndham\.com/, okChecks: async p => { ok(/Thank you, Test\. We received your request\./.test(await text(p, '#bTitle')), 'resale: thanks by name'); ok(/^RC-\d\d /.test(await text(p, '#bPicked')), 'resale: contract repeated');
        ok(await text(p, '#bEmail') === 'jellis@rentatwyndham.com', 'resale: email shown'); ok(!!(await p.$('#bOk a[href="#contracts"]')), 'resale: back-to-list link'); } },
    { name: 'deals', url: '/#deals', form: '#dealsForm', btn: '#dealsForm .deals-go', msg: '#dealsMsg', okSel: '#dealsOk', refWrap: '#dealsRefWrap', ref: '#dealsRef', idle: 'Join the deals list', busy: 'Joining...', slow: 'Joining - this can take up to 20 seconds...',
      nEmpty: 2, emptyHas: ['Enter your first name.', 'Enter your email address.'],
      fill: async p => { await p.fill('#dealsForm [name=first_name]', 'test'); await p.fill('#dealsForm [name=email]', 'jellis@rentatwyndham.com'); },
      bad: async p => { await p.fill('#dealsForm [name=email]', 'nope@x'); }, gate: p => p.waitForTimeout(2100), badN: 1,
      okJson: { ok: true, added: true, welcomed: true, id: 'DEAL-20261119-101010-TEST' }, noIdOk: true, id: 'DEAL-20261119-101010-TEST',
      codes: [[{ ok: false, error: 'bad_email' }, /check your email address/], [{ ok: false, error: 'missing_name' }, /add your first name/], [{ ok: false, error: 'other' }, /couldn't confirm you were added/]],
      failRe: /couldn't confirm you were added.*info@rentatwyndham\.com/, okChecks: async p => { ok(/You're on the list, Test\./.test(await text(p, '#dealsOkTitle')), 'deals: on the list by name'); ok(/welcome email is on its way to jellis@rentatwyndham\.com/.test(await text(p, '#dealsOkLead')), 'deals: welcome line');
        ok(!!(await p.$('#dealsOk a[href="/booking-request"]')), 'deals: Request your dates button'); } },
  ];

  for (const F of FORMS) for (const width of [1280, 390]) {
    const L = F.name + '@' + width; const mock = { current: { json: F.okJson } };
    let { page, posts, ctx } = await open(F.url, width, mock);
    await page.waitForSelector(F.form, { state: 'visible', timeout: 8000 });
    // 1. empty submit
    if (F.name === 'booking') await page.selectOption('#resort', ''), await page.selectOption('#size', ''), await page.fill('#ad', '');
    await page.click(F.btn); let e = await errs(page);
    if (F.name === 'booking') ok(e.length === 9, L + ': empty booking form marks 9 fields (got ' + e.length + ')'); else ok(e.length >= F.nEmpty, L + ': empty submit marks >= ' + F.nEmpty + ' fields (got ' + e.length + ')');
    F.emptyHas.forEach(t => ok(e.includes(t), L + ': empty shows "' + t + '"'));
    ok(/fields need attention - they're marked in red/.test(await text(page, F.msg)) && await vis(page, F.msg), L + ': summary line by the button');
    ok(posts.length === 0, L + ': nothing sent on empty'); ok((await page.$$('[aria-invalid=true]')).length === e.length, L + ': aria-invalid on each bad field');
    await noScroll(page, L + ' empty errors');
    // 2. bad email + phone
    await F.fill(page); await F.bad(page); await page.click(F.btn); e = await errs(page);
    ok(e.includes('Enter a full email address, like name@example.com.'), L + ': bad email message'); if (!F.badN) ok(e.includes('Enter a 10-digit phone number, including area code.'), L + ': bad phone message');
    ok(e.length === (F.badN || 2), L + ': only the bad fields are marked (got ' + e.length + ': ' + e.join(' | ') + ')'); ok(posts.length === 0, L + ': nothing sent with bad fields');
    ok(/needs? attention/.test(await text(page, F.msg)), L + ': summary for bad fields'); await noScroll(page, L + ' bad fields');
    // fix: error clears as the field is corrected
    await F.fill(page); ok((await errs(page)).length === 0, L + ': errors clear when fixed');
    // 3. network failure
    await F.gate(page); mock.current = { kind: 'net' }; await page.click(F.btn); await page.waitForSelector(F.msg, { state: 'visible' });
    ok(F.failRe.test(await text(page, F.msg)), L + ': network failure message with email fallback (' + (await text(page, F.msg)) + ')'); ok(await text(page, F.btn) === F.idle && !(await page.$eval(F.btn, b => b.disabled)), L + ': button restored after failure');
    ok(!(await vis(page, F.okSel)), L + ': no thank-you on failure'); await noScroll(page, L + ' failure');
    // 3b. unreadable reply
    mock.current = { kind: 'html' }; await page.click(F.btn); await page.waitForFunction(s => !document.querySelector(s).disabled, F.btn); ok(F.failRe.test(await text(page, F.msg)) && !(await vis(page, F.okSel)), L + ': unreadable reply = failure, not thanks');
    // 4. backend error codes
    for (const [json, re] of F.codes) { mock.current = { json }; await page.click(F.btn); await page.waitForFunction(s => !document.querySelector(s).disabled, F.btn); await page.waitForTimeout(50);
      const shown = (await vis(page, F.msg)) ? await text(page, F.msg) : '';
      if (re) ok(re.test(shown), L + ': code ' + JSON.stringify(json) + ' -> "' + shown + '"'); else ok(shown === '', L + ': ' + JSON.stringify(json) + ' shows nothing');
      ok(!(await vis(page, F.okSel)), L + ': no thank-you for ' + (json.error || 'ignored')); }
    // 5. slow send: label changes after 4 s, then success with reference
    mock.current = { json: F.okJson, delay: 5200 }; const before = posts.length; await page.click(F.btn);
    await page.waitForTimeout(300); ok(await text(page, F.btn) === F.busy && await page.$eval(F.btn, b => b.disabled), L + ': "' + F.busy + '" at once, button disabled');
    await page.waitForTimeout(3000); ok(await text(page, F.btn) === F.busy, L + ': still short label at 3.3 s');
    await page.waitForTimeout(1100); ok(await text(page, F.btn) === F.slow, L + ': slow label after 4 s (' + (await text(page, F.btn)) + ')'); await noScroll(page, L + ' slow label');
    await page.waitForSelector(F.okSel, { state: 'visible', timeout: 5000 }); ok(posts.length === before + 1, L + ': exactly one POST');
    ok(await vis(page, F.refWrap) && await text(page, F.ref) === F.id, L + ': reference shown (' + (await text(page, F.ref)) + ')'); ok(/mention reference/.test(await text(page, F.refWrap)), L + ': "mention reference" wording');
    await F.okChecks(page); await noScroll(page, L + ' success');
    const sent = new URLSearchParams(posts[posts.length - 1]); ok(sent.get('email') === 'jellis@rentatwyndham.com' && !!sent.get('first_name') && !!sent.get('submitted_at'), L + ': POST carries the fields');
    await ctx.close();
    // 6. old backend (no id): still thanks, reference line hidden. Booking needs an id by design.
    ({ page, posts, ctx } = await open(F.url, width, mock)); await page.waitForSelector(F.form, { state: 'visible' }); await F.fill(page); await F.gate(page);
    const j = Object.assign({}, F.okJson); delete j.id; mock.current = { json: j }; await page.click(F.btn);
    if (F.noIdOk) { await page.waitForSelector(F.okSel, { state: 'visible' }); ok(!(await vis(page, F.refWrap)), L + ': no id from an older backend = thanks, reference hidden'); }
    else { await page.waitForSelector(F.msg, { state: 'visible' }); ok(F.failRe.test(await text(page, F.msg)) && !(await vis(page, F.okSel)), L + ': no Inquiry ID = not confirmed'); }
    await ctx.close();
  }
  // deals: repeat sign-up wording
  { const mock = { current: { json: { ok: true, updated: true, id: 'DEAL-20261119-101010-TEST' } } }; const { page, ctx } = await open('/#deals', 390, mock); await page.waitForSelector('#dealsForm', { state: 'visible' });
    await page.fill('#dealsForm [name=first_name]', 'test'); await page.fill('#dealsForm [name=email]', 'jellis@rentatwyndham.com'); await page.waitForTimeout(2100); await page.click('#dealsForm .deals-go'); await page.waitForSelector('#dealsOk', { state: 'visible' });
    ok(/You're already on the list, Test\./.test(await text(page, '#dealsOkTitle')), 'deals repeat: already on the list'); ok(/updated your deal preferences/.test(await text(page, '#dealsOkLead')), 'deals repeat: preferences line'); ok(await text(page, '#dealsRef') === 'DEAL-20261119-101010-TEST', 'deals repeat: same reference'); await ctx.close(); }
  // resale: sheet failed but id returned = received (v1.4.0)
  { const mock = { current: { json: { ok: false, id: 'RES-1', error: 'Exception: sheet' } } }; const { page, ctx } = await open('/wyndham-points-for-sale', 1280, mock); const F = FORMS[2]; await page.waitForSelector(F.form); await F.fill(page); await F.gate(page); await page.click(F.btn);
    await page.waitForSelector('#bOk', { state: 'visible' }); ok(await text(page, '#bRef') === 'RES-1', 'resale: id with a sheet error still confirms'); await ctx.close(); }
  // booking: too-quick guard and ?resort= prefill still work
  { const mock = { current: { json: FORMS[0].okJson } }; const { page, posts, ctx } = await open('/booking-request?resort=Bonnet%20Creek', 1280, mock); const F = FORMS[0]; await page.waitForSelector(F.form);
    ok(/Bonnet Creek/.test(await page.$eval('#resort', s => s.value)), 'booking: ?resort= prefill'); await F.fill(page); await page.click(F.btn); ok(/That was quick/.test(await text(page, F.msg)) && posts.length === 0, 'booking: too-quick guard'); await ctx.close(); }
  await browser.close(); srv.close();
  console.log(fail ? 'FAILED ' + fail + ' of ' + (pass + fail) : 'ALL ' + pass + ' CHECKS PASSED'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
