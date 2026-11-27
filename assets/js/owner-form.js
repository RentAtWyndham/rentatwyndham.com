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

  // Prep questions: one-tap chips (radio inputs). Not required; a blank one is sent as "Not given" as before.
  var PREP_KEYS = ['vip', 'owners_count', 'mortgage', 'rented_before', 'renting_now'];
  var countEl = document.getElementById('prepCount');
  function answered(k) { var c = f.querySelector('input[name="' + k + '"]:checked'); return c ? c.value : ''; }
  function updateCount() {
    var n = PREP_KEYS.filter(function (k) { return answered(k); }).length;
    if (countEl) countEl.textContent = n + ' of 5 answered';
  }
  f.addEventListener('change', function (e) { if (e.target && PREP_KEYS.indexOf(e.target.name) > -1) updateCount(); });
  updateCount();

  // Thank-you step: ask only the questions left blank; each tap is saved at once (owner-interest v1.3.0 update call).
  // Shown only when the backend returned an edit token, so an older backend simply shows nothing extra.
  function prepLater(ref, edit) {
    var wrap = document.getElementById('oPrep'), left = document.getElementById('oPrepLeft'), qs = document.getElementById('oPrepQs');
    var blank = PREP_KEYS.filter(function (k) { return !answered(k); });
    if (!wrap || !ref || !edit || !blank.length) return;
    var remaining = blank.length;
    function say() {
      left.textContent = remaining === 0 ? 'Thank you - John has everything he needs.'
        : remaining + (remaining === 1 ? ' quick question' : ' quick questions') + ' left so John can prepare';
    }
    blank.forEach(function (k) {
      var src = f.querySelector('fieldset.chips[data-q="' + k + '"]'); if (!src) return;
      var fs = src.cloneNode(true);
      Array.prototype.forEach.call(fs.querySelectorAll('input'), function (i) { i.name = 'later_' + k; i.checked = false; i.disabled = false; });
      var st = document.createElement('span'); st.className = 'prep-status'; st.setAttribute('role', 'status');
      fs.querySelector('legend').appendChild(st);
      fs.addEventListener('change', function (e) {
        var v = e.target && e.target.value; if (!v) return;
        var inputs = fs.querySelectorAll('input');
        Array.prototype.forEach.call(inputs, function (i) { i.disabled = true; });
        st.className = 'prep-status'; st.textContent = 'Saving...';
        var data = new URLSearchParams();
        data.set('action', 'update'); data.set('ref', ref); data.set('edit', edit); data.set('_started', started.value); data.set(k, v);
        window.RawForm.send(ENDPOINT, data, 20000).then(function (res) {
          if (res.ok && ((res.saved || []).indexOf(k) > -1 || (res.kept || []).indexOf(k) > -1)) {
            st.textContent = 'Saved'; remaining--; say();
          } else { throw new Error(res.error || 'not saved'); }
        }).catch(function () {
          Array.prototype.forEach.call(inputs, function (i) { i.disabled = false; i.checked = false; });
          st.className = 'prep-status err'; st.textContent = "Couldn't save - please tap again";
        });
      });
      qs.appendChild(fs);
    });
    say(); wrap.hidden = false;
  }
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
    // Prep questions left blank still need a value for the backend's checks
    ['vip', 'owners_count', 'mortgage', 'rented_before', 'renting_now', 'source'].forEach(function (k) {
      if (!data.get(k)) data.set(k, 'Not given');
    });
    data.set('contracts', contractsJson());
    data.set('page', location.href);
    data.set('submitted_at', new Date().toISOString());
    if (TURNSTILE_SITEKEY && !data.get('cf-turnstile-response')) { showErr('Please complete the quick check above the Submit button.'); return; }
    var done = K.busy(submitBtn, 'Sending...');
    var resetBtn = function () { done('Submit'); };
    // Read the backend's answer. ok:true = logged (v1.1.0 adds id, the reference shown on the page); ok:false with no error code = the sheet write failed but the
    // team email and owner confirmation still went out, so the application is received.
    K.send(ENDPOINT, data)
      .then(function (res) {
        if (res.ok || !res.error) {
          done(); f.hidden = true;
          var aside = document.querySelector('#apply .aside'); if (aside) aside.hidden = true;
          var head = document.getElementById('applyHead'); if (head) head.style.display = 'none';
          var first = K.niceName(f.first_name.value);
          if (first) document.getElementById('oName').textContent = ', ' + first;
          var em = document.getElementById('oEmail'); if (em) em.textContent = f.email.value.trim();
          K.showRef(document.getElementById('oRefWrap'), document.getElementById('oRef'), res.id);
          prepLater(res.id, res.edit);
          okBox.hidden = false; okBox.scrollIntoView({ behavior: 'smooth', block: 'start' }); okBox.focus({ preventScroll: true });
          try { if (window.gtag) gtag('event', 'generate_lead', { form: 'owner_application' }); } catch (err) {}
        } else {
          resetBtn(); showErr(BACKEND_MSG[res.error] || FAIL);
        }
      })
      .catch(function () { resetBtn(); showErr(FAIL); });
  });
})();
