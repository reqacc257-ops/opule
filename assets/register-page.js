(async function () {
  await OPULE.ready;
  var root = document.getElementById('register-root');
  var existing = OPULE.getSeller();
  if (!OPULE.getUser() || OPULE.getUser().role !== 'seller') {
    root.innerHTML = '<p class="cap">Seller account required</p><h1 class="display serif">Your next chapter.</h1><a class="btn fill" href="auth.html">Sign in or create a seller account</a>';
    return;
  }

  if (existing) {
    root.innerHTML =
      '<p class="cap">Seller application</p>' +
      '<h1 class="display serif" style="margin-top:16px">You already applied.</h1>' +
      '<p style="margin-top:20px;font-size:18px">Your application is ' +
      (existing.status === 'verified' ? 'approved — <a href="sell.html">list an item</a>.' :
       'under review. <a href="sell.html">Check its status</a>.') + '</p>';
    return;
  }

  /* tomorrow, as the earliest date a call can be booked */
  var tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  var minDate = tomorrow.toISOString().slice(0, 10);

  root.innerHTML =
    '<div class="two-col">' +
      '<div>' +
        '<p class="cap">Seller application</p>' +
        '<h1 class="display serif" style="font-size:56px;margin-top:16px">Tell us who you are.</h1>' +
        '<p style="margin-top:24px;max-width:480px;font-size:18px">This prototype saves a seller application. Staff review, identity verification and video-call scheduling are not operational yet. Use fictional details; do not enter real ID information. Your selected call time is only a preference.</p>' +
        '<hr class="rule" style="margin-top:40px">' +
        '<dl class="facts">' +
          '<dt>ID</dt><dd>No identity checks or ID uploads are available. Never submit an ID photo here.</dd>' +
          '<dt>The call</dt><dd>Planned workflow only. Choosing a time does not book a call.</dd>' +
          '<dt>Privacy</dt><dd>Applications are stored on this server. Use fictional information while testing; a production privacy policy is still required.</dd>' +
        '</dl>' +
      '</div>' +
      '<form id="reg-form" novalidate>' +
        '<ol class="form-progress view-nav" aria-label="Application steps"><li aria-current="step">1 · About you</li><li>2 · Your collection</li><li>3 · Video call</li></ol>' +
        '<fieldset data-form-step><legend>About you</legend>' +
        '<label class="field"><span>Full legal name</span><input type="text" id="r-name" autocomplete="name" required></label>' +
        '<label class="field"><span>Mobile number</span><input type="tel" id="r-phone" placeholder="09xx xxx xxxx" autocomplete="tel" required></label>' +
        '<label class="field"><span>Email</span><input type="email" id="r-email" autocomplete="email" required></label>' +
        '<label class="field"><span>Your general area</span><select id="r-area">' + OPULE.areaOptions('') + '</select></label>' +

        '</fieldset><fieldset data-form-step hidden><legend>Your collection</legend>' +
        '<label class="field"><span>What do you plan to sell?</span>' +
          '<div class="choices" id="r-cats">' +
            ['Watches','Bags','Jewelry','Sneakers','Accessories','Other'].map(function (c) {
              return '<label><input type="checkbox" value="' + c + '">' + c + '</label>';
            }).join('') +
          '</div>' +
        '</label>' +
        '<label class="field"><span>Where do your items come from?</span>' +
          '<textarea id="r-source" placeholder="Personal collection, boutique purchases with receipts, inherited pieces…"></textarea>' +
        '</label>' +
        '<label class="field"><span>Have you sold luxury items before?</span>' +
          '<select id="r-exp"><option>No, first time</option><option>Occasionally, person to person</option><option>Regularly, on other platforms</option><option>I run a shop or consignment business</option></select>' +
        '</label>' +

        '</fieldset><fieldset data-form-step hidden><legend>Your video call</legend>' +
        '<label class="field"><span>ID you will present on the call</span>' +
          '<select id="r-idtype"><option>Philippine passport</option><option>Driver\u2019s license</option><option>National ID (PhilSys)</option><option>UMID</option><option>PRC ID</option></select>' +
        '</label>' +
        '<label class="field"><span>Call date (earliest: tomorrow)</span><input type="date" id="r-date" min="' + minDate + '" required></label>' +
        '<label class="field"><span>Time</span>' +
          '<select id="r-time"><option>9:00 AM</option><option>11:00 AM</option><option>2:00 PM</option><option>4:00 PM</option><option>7:00 PM</option></select>' +
        '</label></fieldset>' +

        '<p class="form-note">Your application will be saved as pending. No call is booked and no email or SMS notification is sent.</p>' +
        '<p class="error-note" id="r-error">Fill in your name, mobile number, email, and a call date.</p>' +
        '<div class="step-actions"><button class="btn quiet" type="button" data-step-back hidden>Back</button><button class="btn fill" type="button" data-step-next>Continue</button><button class="btn fill" type="submit" hidden>Submit application</button></div>' +
      '</form>' +
    '</div>';

  OPULE.initFormSteps(document.getElementById('reg-form'));

  /* toggle styling for category choices */
  document.getElementById('r-cats').addEventListener('change', function (e) {
    var label = e.target.closest('label');
    if (label) label.classList.toggle('on', e.target.checked);
  });

  document.getElementById('reg-form').addEventListener('submit', async function (e) {
    e.preventDefault();
    var name = document.getElementById('r-name').value.trim();
    var phone = document.getElementById('r-phone').value.trim();
    var email = document.getElementById('r-email').value.trim();
    var date = document.getElementById('r-date').value;
    var err = document.getElementById('r-error');
    if (!name || !phone || !email || !date) { err.style.display = 'block'; return; }
    err.style.display = 'none';

    var cats = Array.prototype.slice.call(
      document.querySelectorAll('#r-cats input:checked')
    ).map(function (i) { return i.value; });

    var d = new Date(date + 'T00:00:00');
    var slot = d.toLocaleDateString('en-PH', { month: 'long', day: 'numeric' }) +
               ', ' + document.getElementById('r-time').value;

    try {
    await OPULE.setSeller({
      status: 'pending',
      appliedAt: new Date().toISOString(),
      name: name,
      phone: phone,
      email: email,
      area: document.getElementById('r-area').value,
      categories: cats,
      source: document.getElementById('r-source').value.trim(),
      experience: document.getElementById('r-exp').value,
      idType: document.getElementById('r-idtype').value,
      callSlot: slot
    });

    location.href = 'sell.html';
    } catch (error) { OPULE.db.report(error); }
  });
})().catch(OPULE.db.report);
