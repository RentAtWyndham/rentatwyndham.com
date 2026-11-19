(function () {
  // Owner application form on /rent-your-points -> separate Apps Script web app
  // (logs to the owner pipeline sheet's "Website Applications" tab, emails join@).
  // If ENDPOINT is emptied, the form tells people to email instead.
  var ENDPOINT = 'https://script.google.com/macros/s/AKfycby1QI1CTOL6LY5ahl_bWcPSzIU5QCwyne6QjZngln95eSAh9-rO3puoLH5ZtjaiwoCz6Q/exec';
  // Cloudflare Turnstile site key (public). Leave empty to skip the widget.
  var TURNSTILE_SITEKEY = '';
  var MAX_CONTRACTS = 6;

  var f = document.getElementById('ownerForm');
  if (!f) return;
  var box = document.getElementById('contracts'), tpl = document.getElementById('contractTpl'), addBtn = document.getElementById('addContract');

  function renumber() {
    var blocks = box.querySelectorAll('.cblock');
    Array.prototype.forEach.call(blocks, function (b, i) { b.querySelector('.cnum').textContent = String(i + 1); });
    addBtn.hidden = blocks.length >= MAX_CONTRACTS;
  }
  function addContract() {
    box.appendChild(tpl.content.cloneNode(true));
    renumber();
  }
  addBtn.addEventListener('click', function () { addContract(); var b = box.lastElementChild; if (b) b.querySelector('input').focus(); });
  box.addEventListener('click', function (e) {
    var r = e.target.closest('.cremove'); if (!r) return;
    if (box.querySelectorAll('.cblock').length > 1) { r.closest('.cblock').remove(); renumber(); }
  });
  addContract();

  if (TURNSTILE_SITEKEY) {
    var ts = document.getElementById('tsBox');
    ts.className = 'cf-turnstile'; ts.setAttribute('data-sitekey', TURNSTILE_SITEKEY);
    var s = document.createElement('script'); s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'; s.async = true; s.defer = true;
    document.head.appendChild(s);
  }

  var started = document.getElementById('oStarted');
  started.value = String(Date.now());
  var msg = document.getElementById('oMsg'), okBox = document.getElementById('oOk'), submitBtn = document.getElementById('oSubmit');
  function showErr(t) { msg.textContent = t; msg.hidden = false; }

  function contractsJson() {
    return JSON.stringify(Array.prototype.map.call(box.querySelectorAll('.cblock'), function (b) {
      var o = {};
      Array.prototype.forEach.call(b.querySelectorAll('[data-k]'), function (el) { o[el.getAttribute('data-k')] = el.value.trim(); });
      return o;
    }));
  }

  var FAIL = 'We couldn\'t confirm your application went through. Please try again in a moment, or email join@rentatwyndham.com with your name, phone and what you own.';
  var BACKEND_MSG = {
    missing_first_name: 'Your first name didn\'t come through. Please check it and send again.',
    missing_last_name: 'Your last name didn\'t come through. Please check it and send again.',
    missing_email: 'Your email didn\'t come through. Please check it and send again.',
    missing_phone: 'Your phone number didn\'t come through. Please check it and send again.',
    missing_contracts: 'Please add at least one contract with its resort and points.',
    bad_email: 'Please check your email address and send again.',
    bad_phone: 'Please enter your phone number with the area code (10 digits).',
    check_failed: 'Please complete the quick check above the Submit button and send again.'
  };
  function resetBtn() { submitBtn.disabled = false; submitBtn.textContent = 'Submit'; }

  f.addEventListener('submit', function (e) {
    e.preventDefault(); msg.hidden = true;
    var K = window.RawForm;
    var rules = [
      [f.first_name, K.req('Enter your first name.')],
      [f.last_name, K.req('Enter your last name.')],
      [f.email, K.email],
      [f.phone, K.phone(false)]
    ];
    Array.prototype.forEach.call(box.querySelectorAll('.cblock'), function (b) {
      var n = b.querySelector('.cnum').textContent;
      rules.push([b.querySelector('[data-k="resort"]'), K.req('Enter the home resort or contract name for contract ' + n + '.')]);
      rules.push([b.querySelector('[data-k="points"]'), K.req('Choose about how many points contract ' + n + ' has.')]);
    });
    var bad = K.check(rules);
    if (bad.length) { showErr(K.summary(bad)); K.focusFirst(bad); return; }
    if (f.website && f.website.value) { return; } // honeypot
    if (Date.now() - Number(started.value || 0) < 3000) { showErr('That was quick. Please take a second look and send again.'); started.value = String(Date.now() - 3000); return; }
    if (!ENDPOINT) { showErr(FAIL); return; }
    var data = new URLSearchParams(new FormData(f));
    // Optional questions left blank still need a value for the backend's checks
    ['vip', 'owners_count', 'mortgage', 'rented_before', 'renting_now', 'source'].forEach(function (k) {
      if (!data.get(k)) data.set(k, 'Not given');
    });
    data.set('contracts', contractsJson());
    data.set('page', location.href);
    data.set('submitted_at', new Date().toISOString());
    if (TURNSTILE_SITEKEY && !data.get('cf-turnstile-response')) { showErr('Please complete the quick check above the Submit button.'); return; }
    submitBtn.disabled = true; submitBtn.textContent = 'Sending...';
    // Read the backend's answer. ok:true = logged; ok:false with no error code = the sheet write failed but the
    // team email and owner confirmation still went out, so the application is received.
    K.send(ENDPOINT, data)
      .then(function (res) {
        if (res.ok || !res.error) {
          f.hidden = true;
          var aside = document.querySelector('#apply .aside'); if (aside) aside.hidden = true;
          var head = document.getElementById('applyHead'); if (head) head.style.display = 'none';
          var first = K.niceName(f.first_name.value);
          if (first) document.getElementById('oName').textContent = ', ' + first;
          var em = document.getElementById('oEmail'); if (em) em.textContent = f.email.value.trim();
          okBox.hidden = false; okBox.scrollIntoView({ behavior: 'smooth', block: 'start' }); okBox.focus({ preventScroll: true });
          try { if (window.gtag) gtag('event', 'generate_lead', { form: 'owner_application' }); } catch (err) {}
        } else {
          resetBtn(); showErr(BACKEND_MSG[res.error] || FAIL);
        }
      })
      .catch(function () { resetBtn(); showErr(FAIL); });
  });
})();
