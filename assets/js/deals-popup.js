(function () {
  // "Join our special deals list" pop-up (homepage).
  // Sends to the Apps Script web app in RentAtWyndham/automations apps-script/special-deals-signup,
  // which writes the Subscribers tab of the "RAW Special Deals List" sheet and (v1.1.0) emails new subscribers a welcome.
  // ENDPOINT empty = the pop-up never shows on its own (add ?deals=preview to the URL to see it).
  // Live web app: "RAW - Special Deals List (website)", deployment "v1.0.0 deals list" (2026-11-19).
  var ENDPOINT = 'https://script.google.com/macros/s/AKfycbygZLetPVzb3W9o7nHuw5PHB9-DfmwcmwuMHoruxSf_FpodFNww9PkHrJTo2pnLMs22/exec';
  var SHOW_AFTER_MS = 10000, SHOW_AT_SCROLL = 0.45;
  var SNOOZE_DAYS = 14, JOINED_DAYS = 365, KEY = 'raw_deals_popup';
  var INTERESTS = ['Wisconsin Dells', 'Orlando', 'Beach', 'Mountains', 'Las Vegas', 'Any Wyndham resort'];

  var preview = /[?&]deals=preview\b/.test(location.search);
  function getState() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } }
  function setState(s, days) { try { localStorage.setItem(KEY, JSON.stringify({ s: s, until: Date.now() + days * 86400000 })); } catch (e) {} }
  function suppressed() { var st = getState(); return !!(st && st.until > Date.now()); }

  var d = document.createElement('dialog');
  d.className = 'deals';
  d.setAttribute('aria-labelledby', 'dealsTitle');
  d.innerHTML =
    '<button class="deals-x" type="button" aria-label="Close">&times;</button>' +
    '<div class="deals-art" aria-hidden="true"><img src="/assets/img/wave.jpg" alt="" width="600" height="800" loading="lazy"><span class="deals-badge">Deals list</span></div>' +
    '<div class="deals-body">' +
      '<form id="dealsForm" novalidate>' +
        '<span class="eyebrow">Special deals list</span>' +
        '<h2 id="dealsTitle">Join our special deals list</h2>' +
        '<p class="deals-lead">Last-minute openings and price drops on Club Wyndham suites at Glacier Canyon and 240+ other resorts, emailed straight to you.</p>' +
        '<label><span class="req">First name</span><input name="first_name" required autocomplete="given-name" maxlength="60"></label>' +
        '<label><span class="req">Email</span><input name="email" type="email" required autocomplete="email" maxlength="120"></label>' +
        '<fieldset class="deals-chips"><legend>Where would you like deals? <small>(optional)</small></legend>' +
          INTERESTS.map(function (x) { return '<label><input type="checkbox" name="interest" value="' + x + '"><span>' + x + '</span></label>'; }).join('') +
        '</fieldset>' +
        '<div class="hp" aria-hidden="true"><label>Leave this empty<input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>' +
        '<button class="btn btn-sun deals-go" type="submit">Join the deals list</button>' +
        '<p class="form-msg" id="dealsMsg" role="alert" hidden></p>' +
        '<p class="deals-fine">Deal emails only. Unsubscribe anytime. We never sell your info. <a href="/privacy">Privacy</a></p>' +
        '<button class="deals-no" type="button">No thanks</button>' +
      '</form>' +
      '<div class="deals-ok" id="dealsOk" hidden tabindex="-1">' +
        '<span class="eyebrow">You\'re in</span><h2 id="dealsOkTitle">You\'re on the list<span id="dealsName"></span>.</h2>' +
        '<p class="deals-lead" id="dealsOkLead"></p>' +
        '<p class="deals-lead">If our emails land in spam, mark them "not spam" so you don\'t miss a deal.</p>' +
        '<p class="deals-lead">Already have dates in mind? You don\'t have to wait for a deal.</p>' +
        '<a class="btn btn-sun deals-go" href="/booking-request">Request your dates</a>' +
        '<p class="deals-fine" id="dealsRefWrap" hidden>Questions? Email info@rentatwyndham.com and mention reference <b id="dealsRef"></b>.</p>' +
      '</div>' +
    '</div>';
  document.body.appendChild(d);

  var f = d.querySelector('#dealsForm'), msg = d.querySelector('#dealsMsg'), go = f.querySelector('.deals-go');
  var opened = false, openedAt = 0;

  function open(force) {
    if (opened || d.open) return;
    if (!force && (suppressed() || (!ENDPOINT && !preview))) return;
    if (document.querySelector('dialog[open]')) return;
    opened = true; openedAt = Date.now();
    if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', '');
    document.documentElement.classList.add('deals-lock');
    try { if (window.gtag) gtag('event', 'deals_popup_view'); } catch (e) {}
  }
  function close() {
    if (d.open) { if (typeof d.close === 'function') d.close(); else d.removeAttribute('open'); }
  }
  d.addEventListener('close', function () {
    document.documentElement.classList.remove('deals-lock');
    var st = getState();
    if (!st || st.s !== 'joined') setState('dismissed', SNOOZE_DAYS);
  });
  d.querySelector('.deals-x').addEventListener('click', close);
  d.querySelector('.deals-no').addEventListener('click', close);
  d.addEventListener('click', function (e) { if (e.target === d) close(); }); // backdrop

  // Triggers: time on page, scroll depth, or desktop exit intent - whichever comes first. Once per page view.
  setTimeout(function () { open(false); }, preview ? 600 : SHOW_AFTER_MS);
  window.addEventListener('scroll', function onS() {
    var h = document.documentElement.scrollHeight - innerHeight;
    if (h > 0 && scrollY / h >= SHOW_AT_SCROLL) { window.removeEventListener('scroll', onS); open(false); }
  }, { passive: true });
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    document.addEventListener('mouseout', function (e) { if (!e.relatedTarget && e.clientY <= 0) open(false); });
  }
  // Manual openers: any link to #deals or element with data-deals-open (always opens, even if snoozed)
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-deals-open], a[href="#deals"], a[href="/#deals"]');
    if (a && (location.pathname === '/' || location.pathname === '/index.html')) { e.preventDefault(); opened = false; open(true); }
  });
  if (location.hash === '#deals') setTimeout(function () { open(true); }, 300);

  function showErr(t) { msg.textContent = t; msg.hidden = false; }
  var FAIL = 'We couldn\'t confirm you were added. Please try again in a moment, or email info@rentatwyndham.com and ask to be added.';
  f.addEventListener('submit', function (e) {
    e.preventDefault(); msg.hidden = true;
    if (f.website.value) return; // honeypot
    var K = window.RawForm;
    var bad = K.check([[f.first_name, K.req('Enter your first name.')], [f.email, K.email]]);
    if (bad.length) { showErr(K.summary(bad).replace(' above', '')); bad[0].focus(); return; }
    var first = f.first_name.value.trim(), email = f.email.value.trim();
    if (Date.now() - openedAt < 2000) { showErr('That was quick. Please take a second look and send again.'); openedAt = 0; return; }
    if (!ENDPOINT) { showErr(FAIL); return; }
    var picks = Array.prototype.map.call(f.querySelectorAll('input[name=interest]:checked'), function (x) { return x.value; });
    var data = new URLSearchParams();
    data.set('first_name', first); data.set('email', email); data.set('interests', picks.join(','));
    data.set('website', ''); data.set('page', location.href); data.set('submitted_at', new Date().toISOString());
    var done = K.busy(go, 'Joining...', 'Joining - this can take up to 20 seconds...');
    var resetBtn = function () { done('Join the deals list'); };
    // Read the backend's answer: {ok:true, added|updated, id (v1.2.0)} or {ok:false, error:'bad_email'|'missing_name'}.
    K.send(ENDPOINT, data)
      .then(function (res) {
        if (res.ok) {
          done(); setState('joined', JOINED_DAYS);
          d.querySelector('#dealsName').textContent = ', ' + K.niceName(first);
          var lead = d.querySelector('#dealsOkLead');
          if (res.updated) {
            d.querySelector('#dealsOkTitle').firstChild.nodeValue = 'You\'re already on the list';
            lead.textContent = 'We updated your deal preferences for ' + email + '.';
          } else {
            lead.textContent = 'A welcome email is on its way to ' + email + '. Watch your inbox for our next deal.';
          }
          K.showRef(d.querySelector('#dealsRefWrap'), d.querySelector('#dealsRef'), res.id);
          f.hidden = true; var ok = d.querySelector('#dealsOk'); ok.hidden = false; ok.focus();
          try { if (window.gtag) gtag('event', 'sign_up', { method: 'deals_list' }); } catch (err) {}
        } else {
          resetBtn();
          if (res.error === 'bad_email') { K.setErr(f.email, 'Enter a full email address, like name@example.com.'); f.email.focus(); showErr('Please check your email address.'); }
          else if (res.error === 'missing_name') { K.setErr(f.first_name, 'Enter your first name.'); f.first_name.focus(); showErr('Please add your first name.'); }
          else showErr(FAIL);
        }
      })
      .catch(function () { resetBtn(); showErr(FAIL); });
  });
})();
