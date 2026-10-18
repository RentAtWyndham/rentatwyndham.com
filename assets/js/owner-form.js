(function () {
  // Owner application form on /rent-your-points -> separate Apps Script web app
  // (logs to the owner pipeline sheet's "Website Applications" tab, emails join@).
  // Leave ENDPOINT empty until that web app is deployed; the form then tells people to email instead.
  var ENDPOINT = '';
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

  f.addEventListener('submit', function (e) {
    e.preventDefault(); msg.hidden = true;
    if (!f.checkValidity()) { f.reportValidity(); return; }
    if (f.website && f.website.value) { return; } // honeypot
    if (Date.now() - Number(started.value || 0) < 3000) { showErr('That was quick. Please take a second look and send again.'); started.value = String(Date.now() - 3000); return; }
    if (!ENDPOINT) {
      showErr('The form is being connected. Please email join@rentatwyndham.com with your name, phone, and what you own.');
      return;
    }
    var data = new URLSearchParams(new FormData(f));
    data.set('contracts', contractsJson());
    data.set('page', location.href);
    data.set('submitted_at', new Date().toISOString());
    if (TURNSTILE_SITEKEY && !data.get('cf-turnstile-response')) { showErr('Please complete the quick check above the Submit button.'); return; }
    submitBtn.disabled = true; submitBtn.textContent = 'Sending...';
    fetch(ENDPOINT, { method: 'POST', mode: 'no-cors', body: data })
      .then(function () {
        f.hidden = true;
        var aside = document.querySelector('#apply .aside'); if (aside) aside.hidden = true;
        okBox.hidden = false; okBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
        try { if (window.gtag) gtag('event', 'generate_lead', { form: 'owner_application' }); } catch (err) {}
      })
      .catch(function () {
        submitBtn.disabled = false; submitBtn.textContent = 'Submit';
        showErr('Something went wrong sending that. Please email join@rentatwyndham.com.');
      });
  });
})();
