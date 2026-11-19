(function () {
  // Mobile menu
  var btn = document.getElementById('menuBtn'), nav = document.getElementById('mainNav');
  if (btn && nav) btn.addEventListener('click', function () {
    var open = nav.classList.toggle('open');
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  // Request form -> Apps Script web app (emails info@ and logs to the Rental Worksheet)
  var ENDPOINT = 'https://script.google.com/macros/s/AKfycbxsp3TacVHaU6R-ZRK3O36PhrWz5_WAHQCXrCvG2TKwEN7smJOviltnSNz8dfV683bh/exec';
  var f = document.getElementById('reqForm');
  if (!f) return;
  // Prefill resort from /booking-request?resort=Name (links from the resort directory)
  try {
    var qp = new URLSearchParams(location.search).get('resort');
    var sel = document.getElementById('resort');
    if (qp && sel) {
      var hit = Array.prototype.find.call(sel.options, function (o) { return o.text.indexOf(qp) === 0; });
      if (hit) { sel.value = hit.value || hit.text; }
      else { var o = document.createElement('option'); o.text = qp; o.value = qp; sel.insertBefore(o, sel.options[1]); sel.value = qp; }
      var h = document.querySelector('.sec-head h2'); if (h) h.textContent = 'Request dates at ' + qp;
    }
  } catch (err) {}
  var started = document.getElementById('started');
  if (started) started.value = String(Date.now());
  var ci = document.getElementById('ci'), co = document.getElementById('co');
  var today = new Date(); today.setHours(0, 0, 0, 0);
  var iso = function (d) { return d.toISOString().slice(0, 10); };
  if (ci) ci.min = iso(today);
  if (ci && co) ci.addEventListener('change', function () {
    if (ci.value) { var d = new Date(ci.value); d.setDate(d.getDate() + 1); co.min = iso(d); if (co.value && co.value <= ci.value) co.value = iso(d); }
  });
  var msg = document.getElementById('formMsg'), okBox = document.getElementById('okBox'), submitBtn = document.getElementById('submitBtn');
  function showErr(t) { msg.textContent = t; msg.hidden = false; }

  // Inline validation: every problem field gets a red border and its own message under it.
  var RULES = [
    ['fn', function (v) { return v ? '' : 'Enter your first name.'; }],
    ['ln', function (v) { return v ? '' : 'Enter your last name.'; }],
    ['em', function (v) { return !v ? 'Enter your email address.' : (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? '' : 'Enter a full email address, like name@example.com.'); }],
    ['ph', function (v) { return !v ? 'Enter a phone number.' : (v.replace(/\D/g, '').length >= 10 ? '' : 'Enter a 10-digit phone number, including area code.'); }],
    ['resort', function (v) { return v ? '' : 'Choose a resort.'; }],
    ['size', function (v) { return v ? '' : 'Choose a suite size.'; }],
    ['ci', function (v) { return !v ? 'Choose a check-in date.' : (v < iso(today) ? 'Check-in can\'t be in the past.' : ''); }],
    ['co', function (v) { return !v ? 'Choose a check-out date.' : (ci.value && v <= ci.value ? 'Check-out has to be after check-in.' : ''); }],
    ['ad', function (v) { return (v && Number(v) >= 1) ? '' : 'Enter at least 1 adult.'; }]
  ];
  function setFieldErr(el, text) {
    var lab = el.closest('label'), box = lab && lab.querySelector('.field-err');
    if (text) {
      if (!box && lab) { box = document.createElement('small'); box.className = 'field-err'; box.id = el.id + '-err'; lab.appendChild(box); }
      if (box) box.textContent = text;
      el.setAttribute('aria-invalid', 'true'); el.setAttribute('aria-describedby', el.id + '-err');
    } else {
      if (box) box.remove();
      el.removeAttribute('aria-invalid'); el.removeAttribute('aria-describedby');
    }
  }
  function validate() {
    var bad = [];
    RULES.forEach(function (r) {
      var el = document.getElementById(r[0]); if (!el) return;
      var err = r[1](String(el.value || '').trim()); setFieldErr(el, err); if (err) bad.push(el);
    });
    return bad;
  }
  RULES.forEach(function (r) {
    var el = document.getElementById(r[0]); if (!el) return;
    var recheck = function () { if (el.getAttribute('aria-invalid')) setFieldErr(el, r[1](String(el.value || '').trim())); };
    el.addEventListener('input', recheck); el.addEventListener('change', recheck);
  });

  function txt(id) { var el = document.getElementById(id); return el ? String(el.value || '').trim() : ''; }
  function niceDates(a, b) {
    var M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var x = /^(\d{4})-(\d{2})-(\d{2})$/.exec(a), y = /^(\d{4})-(\d{2})-(\d{2})$/.exec(b);
    if (!x || !y) return a + ' to ' + b;
    var f = function (m) { return M[+m[2] - 1] + ' ' + (+m[3]); };
    var n = Math.round((Date.UTC(+y[1], +y[2] - 1, +y[3]) - Date.UTC(+x[1], +x[2] - 1, +x[3])) / 86400000);
    var r = x[1] === y[1] ? f(x) + ' to ' + f(y) + ', ' + y[1] : f(x) + ', ' + x[1] + ' to ' + f(y) + ', ' + y[1];
    return r + ' (' + n + (n === 1 ? ' night' : ' nights') + ')';
  }
  function showSuccess(ref) {
    var first = txt('fn'), kids = Number(txt('kd') || 0), adults = Number(txt('ad') || 0);
    document.getElementById('okTitle').textContent = 'Thank you' + (first ? ', ' + first : '') + '. We received your request.';
    var rows = [
      ['Resort', txt('resort')],
      ['Suite', txt('size').replace(/\s*\(sleeps\s*\d+\)/i, '')],
      ['Dates', niceDates(txt('ci'), txt('co')) + (document.getElementById('flex').checked ? ', flexible' : '')],
      ['Guests', adults + (adults === 1 ? ' adult' : ' adults') + (kids ? ', ' + kids + (kids === 1 ? ' child' : ' children') : '')]
    ];
    var dl = document.getElementById('okSum'); dl.textContent = '';
    rows.forEach(function (r) {
      var dt = document.createElement('dt'), dd = document.createElement('dd');
      dt.textContent = r[0]; dd.textContent = r[1]; dl.appendChild(dt); dl.appendChild(dd);
    });
    document.getElementById('okEmail').textContent = txt('em');
    if (ref) document.getElementById('okRef').textContent = ref; else document.getElementById('okRefWrap').hidden = true;
    f.hidden = true;
    var aside = document.querySelector('.aside'); if (aside) aside.hidden = true;
    var intro = document.querySelector('.sec-head p'); if (intro) intro.hidden = true;
    okBox.hidden = false; okBox.scrollIntoView({ behavior: 'smooth', block: 'start' }); okBox.focus({ preventScroll: true });
  }
  function resetBtn() { submitBtn.disabled = false; submitBtn.textContent = 'Send my request'; }
  var FAIL = 'We couldn\'t confirm your request went through. Please try again in a moment, or email info@rentatwyndham.com with your dates and phone number.';

  f.addEventListener('submit', function (e) {
    e.preventDefault(); msg.hidden = true;
    var bad = validate();
    if (bad.length) {
      showErr(bad.length === 1 ? 'One field needs attention - it\'s marked in red above.' : bad.length + ' fields need attention - they\'re marked in red above.');
      bad[0].focus(); bad[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (f.website && f.website.value) { return; } // honeypot
    var elapsed = Date.now() - Number(started.value || 0);
    if (elapsed < 3000) { showErr('That was quick. Please take a second look and send again.'); started.value = String(Date.now() - 3000); return; }
    if (!ENDPOINT) { showErr(FAIL); return; }
    var data = new URLSearchParams(new FormData(f));
    var a1 = txt('addr1'), a2 = txt('addr2'), notes = txt('notes');
    if (a1 || a2) data.set('notes', 'Mailing address: ' + [a1, a2].filter(Boolean).join(', ') + (notes ? '\n' + notes : ''));
    data.set('page', location.href);
    data.set('submitted_at', new Date().toISOString());
    submitBtn.disabled = true; submitBtn.textContent = 'Sending...';
    var ctl = window.AbortController ? new AbortController() : null;
    var timer = ctl ? setTimeout(function () { ctl.abort(); }, 45000) : null;
    // Read the backend's answer instead of assuming success. Apps Script returns {ok, id} once the lead is logged/emailed.
    fetch(ENDPOINT, { method: 'POST', body: data, signal: ctl ? ctl.signal : undefined })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        clearTimeout(timer);
        if (res && res.id) {
          showSuccess(res.id);
          try { if (window.gtag) gtag('event', 'generate_lead', { form: 'date_request' }); } catch (err) {}
        } else if (res && res.error === 'missing_required') {
          resetBtn(); showErr('Some required details didn\'t come through. Please check your name, email and dates and send again.');
        } else if (res && res.ignored) {
          resetBtn();
        } else {
          resetBtn(); showErr(FAIL);
        }
      })
      .catch(function () { clearTimeout(timer); resetBtn(); showErr(FAIL); });
  });
})();
