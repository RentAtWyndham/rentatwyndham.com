(function () {
  // Resale contracts page: renders cards from /assets/data/contracts.json and sends the buyer-interest form.
  // Buyer form -> separate Apps Script web app (logs to the Kushman tracker Leads tab, emails owners@).
  // If ENDPOINT is emptied, the form tells people to email instead.
  var ENDPOINT = 'https://script.google.com/macros/s/AKfycbwaptDG5nF_rhj5HXjIdy8YGXjyMzYHBPj6VE6lhnyt3jq6CT_y4VnrThgMIBoIm1LuHQ/exec';
  var grid = document.getElementById('cGrid');
  if (!grid) return;

  var money = function (n) { return '$' + n.toLocaleString('en-US', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }); };
  var whole = function (n) { return '$' + Math.round(n).toLocaleString('en-US'); };
  var esc = function (t) { var d = document.createElement('div'); d.textContent = t; return d.innerHTML; };
  var all = [], retail = 180;

  function card(c) {
    var mfk = c.mf / (c.points / 1000);
    var free = c.closing === 'Free';
    var taken = c.status !== 'Available', sold = c.status === 'Sold';
    return '<article class="ccard' + (taken ? ' taken' : '') + '">' +
      '<div class="chead"><span class="cid">' + esc(c.id) + '</span>' +
        (sold ? '' : free ? '<span class="tag">Free closing</span>' : '<span class="tag warn">Ask about closing</span>') +
        (taken ? '<span class="tag' + (sold ? ' sold' : '') + '">' + (sold ? 'SOLD' + (c.date_sold ? ' ' + esc(soldOn(c.date_sold)) : '') : esc(c.status)) + '</span>' : '') + '</div>' +
      '<h3>' + esc(c.resort) + '</h3>' +
      '<p class="cpts"><b>' + c.points.toLocaleString('en-US') + '</b> points · ' + esc(c.usage) + (c.renewal ? ' · renews ' + esc(c.renewal) : '') + '</p>' +
      '<dl class="cfacts">' +
        '<div><dt>' + (c.sold_price ? 'Sold for' : 'Price (once)') + '</dt><dd>' + money(c.price) + '</dd></div>' +
        '<div><dt>Yearly fee</dt><dd>' + money(c.mf) + '</dd></div>' +
        '<div><dt>Fee per 1,000 pts</dt><dd>' + money(Math.round(mfk * 100) / 100) + '</dd></div>' +
        (sold ? '<div><dt>Wyndham retail</dt><dd>' + whole(c.points / 1000 * retail) + '</dd></div>' : '<div><dt>Year one</dt><dd>' + whole(c.price + c.mf) + (free ? '' : ' + closing') + '</dd></div>') +
      '</dl>' +
      (sold ? '' : '<p class="hint">New from Wyndham: about ' + whole(c.points / 1000 * retail) + '</p>') +
      (taken ? '' : '<button class="btn btn-line sm pick" type="button" data-id="' + esc(c.id) + '" data-name="' + esc(c.resort) + '">I\'m interested</button>') +
      '</article>';
  }

  function soldOn(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); if (!m) return '';
    return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][+m[2] - 1] + ' ' + (+m[3]) + ', ' + m[1];
  }
  var fPts = document.getElementById('fPts'), fUse = document.getElementById('fUse'), fSort = document.getElementById('fSort'), fFree = document.getElementById('fFree');
  function render() {
    var range = fPts.value ? fPts.value.split('-').map(Number) : null;
    var list = all.filter(function (c) {
      if (range && (c.points < range[0] || c.points >= range[1])) return false;
      if (fUse.value && c.usage !== fUse.value) return false;
      if (fFree.checked && c.closing !== 'Free') return false;
      return true;
    });
    var key = fSort.value;
    list.sort(function (a, b) {
      var d = key === 'price' ? a.price - b.price : key === 'mfk' ? a.mf / a.points - b.mf / b.points : a.points - b.points;
      return d || ((a.status === 'Sold') - (b.status === 'Sold'));
    });
    grid.innerHTML = list.length ? list.map(card).join('') : '<p>No contracts match those filters.</p>';
  }
  [fPts, fUse, fSort, fFree].forEach(function (el) { el.addEventListener('change', render); });

  fetch('/assets/data/contracts.json', { cache: 'no-cache' })
    .then(function (r) { return r.json(); })
    .then(function (d) {
      all = d.contracts || []; retail = d.retail_per_1000 || retail;
      render();
    })
    .catch(function () {
      grid.innerHTML = '<p>The list didn\'t load. Email <a href="mailto:owners@rentatwyndham.com">owners@rentatwyndham.com</a> and we\'ll send it.</p>';
    });

  // "I'm interested" adds the contract to the form
  var bContracts = document.getElementById('bContracts');
  grid.addEventListener('click', function (e) {
    var b = e.target.closest('.pick'); if (!b || !bContracts) return;
    var label = b.getAttribute('data-id') + ' ' + b.getAttribute('data-name');
    if (bContracts.value.indexOf(b.getAttribute('data-id')) === -1) bContracts.value = bContracts.value ? bContracts.value + ', ' + label : label;
    b.textContent = 'Added to form'; b.disabled = true;
    document.getElementById('interest').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // Buyer-interest form
  var f = document.getElementById('buyerForm');
  if (!f) return;
  var started = document.getElementById('bStarted');
  started.value = String(Date.now());
  var msg = document.getElementById('bMsg'), okBox = document.getElementById('bOk'), submitBtn = document.getElementById('bSubmit');
  function showErr(t) { msg.textContent = t; msg.hidden = false; }
  f.addEventListener('submit', function (e) {
    e.preventDefault(); msg.hidden = true;
    if (!f.checkValidity()) { f.reportValidity(); return; }
    if (f.website && f.website.value) { return; } // honeypot
    if (Date.now() - Number(started.value || 0) < 3000) { showErr('That was quick. Please take a second look and send again.'); started.value = String(Date.now() - 3000); return; }
    if (!ENDPOINT) {
      showErr('The form is being connected. Please email owners@rentatwyndham.com with the contract IDs you like and your questions.');
      return;
    }
    var data = new URLSearchParams(new FormData(f));
    data.set('page', location.href);
    data.set('submitted_at', new Date().toISOString());
    submitBtn.disabled = true; submitBtn.textContent = 'Sending...';
    fetch(ENDPOINT, { method: 'POST', mode: 'no-cors', body: data })
      .then(function () {
        f.hidden = true;
        var aside = document.querySelector('#interest .aside'); if (aside) aside.hidden = true;
        okBox.hidden = false; okBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
        try { if (window.gtag) gtag('event', 'generate_lead', { form: 'resale_interest' }); } catch (err) {}
      })
      .catch(function () {
        submitBtn.disabled = false; submitBtn.textContent = 'Submit';
        showErr('Something went wrong sending that. Please email owners@rentatwyndham.com with the contract IDs you like.');
      });
  });
})();
