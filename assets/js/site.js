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
  if (!f || !window.RawForm) return;
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

  // Field checks and the send go through the shared kit (form-kit.js), the same code path as the other three forms.
  var K = window.RawForm;
  var byId = function (id) { return document.getElementById(id); };
  var RULES = [
    [byId('fn'), K.req('Enter your first name.')],
    [byId('ln'), K.req('Enter your last name.')],
    [byId('em'), K.email],
    [byId('ph'), K.phone(false)],
    [byId('resort'), K.req('Choose a resort.')],
    [byId('size'), K.req('Choose a suite size.')],
    [ci, function (v) { return !v ? 'Choose a check-in date.' : (v < iso(today) ? 'Check-in can\'t be in the past.' : ''); }],
    [co, function (v) { return !v ? 'Choose a check-out date.' : (ci.value && v <= ci.value ? 'Check-out has to be after check-in.' : ''); }],
    [byId('ad'), function (v) { return (v && Number(v) >= 1) ? '' : 'Enter at least 1 adult.'; }]
  ];

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
    K.showRef(document.getElementById('okRefWrap'), document.getElementById('okRef'), ref);
    f.hidden = true;
    var aside = document.querySelector('.aside'); if (aside) aside.hidden = true;
    var intro = document.querySelector('.sec-head p'); if (intro) intro.hidden = true;
    okBox.hidden = false; okBox.scrollIntoView({ behavior: 'smooth', block: 'start' }); okBox.focus({ preventScroll: true });
  }
  var FAIL = 'We couldn\'t confirm your request went through. Please try again in a moment, or email info@rentatwyndham.com with your dates and phone number.';

  f.addEventListener('submit', function (e) {
    e.preventDefault(); msg.hidden = true;
    var bad = K.check(RULES);
    if (bad.length) { showErr(K.summary(bad)); K.focusFirst(bad); return; }
    if (f.website && f.website.value) { return; } // honeypot
    var elapsed = Date.now() - Number(started.value || 0);
    if (elapsed < 3000) { showErr('That was quick. Please take a second look and send again.'); started.value = String(Date.now() - 3000); return; }
    if (!ENDPOINT) { showErr(FAIL); return; }
    var data = new URLSearchParams(new FormData(f));
    var a1 = txt('addr1'), a2 = txt('addr2'), notes = txt('notes');
    if (a1 || a2) data.set('notes', 'Mailing address: ' + [a1, a2].filter(Boolean).join(', ') + (notes ? '\n' + notes : ''));
    data.set('page', location.href);
    data.set('submitted_at', new Date().toISOString());
    var done = K.busy(submitBtn, 'Sending...');
    var resetBtn = function () { done('Send my request'); };
    // Read the backend's answer instead of assuming success. Apps Script returns {ok, id} once the lead is logged/emailed.
    K.send(ENDPOINT, data)
      .then(function (res) {
        if (res.id) {
          done(); showSuccess(res.id);
          try { if (window.gtag) gtag('event', 'generate_lead', { form: 'date_request' }); } catch (err) {}
        } else if (res.error === 'missing_required') {
          resetBtn(); showErr('Some required details didn\'t come through. Please check your name, email and dates and send again.');
        } else if (res.ignored) {
          resetBtn();
        } else {
          resetBtn(); showErr(FAIL);
        }
      })
      .catch(function () { resetBtn(); showErr(FAIL); });
  });
})();
