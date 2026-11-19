/* Shared helpers for the site's forms (owner application, resale interest, deals pop-up).
 * - check(): marks every bad field in red with its own message under it and returns the bad fields.
 * - send(): posts to an Apps Script web app and READS its JSON reply (no no-cors), so the page only
 *   says "thank you" when the backend really answered. Rejects on network failure, timeout or an unreadable reply.
 * Form test rule: docs/FORM_TEST_CHECKLIST.md. */
(function () {
  var EMAIL_RE = /^[^\s@,;<>]+@[^\s@,;<>]+\.[A-Za-z]{2,}$/;

  function setErr(el, text) {
    var lab = el.closest('label'), box = lab && lab.querySelector('.field-err');
    if (!el.id) el.id = 'f' + Math.random().toString(36).slice(2, 9);
    if (text) {
      if (!box && lab) { box = document.createElement('small'); box.className = 'field-err'; box.id = el.id + '-err'; lab.appendChild(box); }
      if (box) box.textContent = text;
      el.setAttribute('aria-invalid', 'true'); el.setAttribute('aria-describedby', el.id + '-err');
    } else {
      if (box) box.remove();
      el.removeAttribute('aria-invalid'); el.removeAttribute('aria-describedby');
    }
  }

  // rules: [[element, function (trimmedValue) -> '' or message], ...]
  function check(rules) {
    var bad = [];
    rules.forEach(function (r) {
      var el = r[0]; if (!el) return;
      var err = r[1](String(el.value || '').trim());
      setErr(el, err); if (err) bad.push(el);
      if (!el._fkBound) {
        el._fkBound = true;
        var re = function () { if (el.getAttribute('aria-invalid')) setErr(el, r[1](String(el.value || '').trim())); };
        el.addEventListener('input', re); el.addEventListener('change', re);
      }
    });
    return bad;
  }

  function summary(bad) {
    return bad.length === 1 ? 'One field needs attention - it\'s marked in red above.'
      : bad.length + ' fields need attention - they\'re marked in red above.';
  }

  function focusFirst(bad) { bad[0].focus(); bad[0].scrollIntoView({ behavior: 'smooth', block: 'center' }); }

  function send(endpoint, data, ms) {
    var ctl = window.AbortController ? new AbortController() : null;
    var timer = ctl ? setTimeout(function () { ctl.abort(); }, ms || 45000) : null;
    return fetch(endpoint, { method: 'POST', body: data, signal: ctl ? ctl.signal : undefined })
      .then(function (r) { return r.json(); })
      .then(function (res) { clearTimeout(timer); if (!res || typeof res !== 'object') throw new Error('bad reply'); return res; },
            function (err) { clearTimeout(timer); throw err; });
  }

  var req = function (msg) { return function (v) { return v ? '' : msg; }; };
  var email = function (v) { return !v ? 'Enter your email address.' : (EMAIL_RE.test(v) ? '' : 'Enter a full email address, like name@example.com.'); };
  var phone = function (optional) {
    return function (v) {
      if (!v) return optional ? '' : 'Enter a phone number.';
      return v.replace(/\D/g, '').length >= 10 ? '' : 'Enter a 10-digit phone number, including area code.';
    };
  };
  var niceName = function (v) { return String(v || '').trim().toLowerCase().replace(/(^|[\s-])\S/g, function (m) { return m.toUpperCase(); }); };

  window.RawForm = { check: check, setErr: setErr, summary: summary, focusFirst: focusFirst, send: send,
    req: req, email: email, phone: phone, niceName: niceName };
})();
