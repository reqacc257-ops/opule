(async function () {
  'use strict';
  await OPULE.ready;

  var radius = 30;
  var sellerLatitude = 14.95;
  var sellerLongitude = 120.883;
  var sellerConfirmed = false;
  var buyerConfirmed = false;
  var paused = false;
  var completed = false;
  var role = null;
  var liveChat = new URLSearchParams(location.search).get('live') === '1';
  var demoBuyers = [];
  var selectedBuyer = demoBuyers[0];
  var conversationId = null;
  var seenMessageIds = new Set();
  var pollingMessages = false;
  var handoverId = null;
  var stateLoaded = false;
  var stateQueue = Promise.resolve();
  var operationPending = false;
  var sellerInboxOpen = false;
  var ownAgreement = false;
  var otherAgreement = false;
  var venueMode = 'suggested';
  var proposedVenue = null;
  var venueAccepted = false;
  var suggestedVenues = OPULE.suggestSpots('baliwag', 'baliwag', 3).map(function (pick) { return pick.spot; });
  var agreePrice = document.getElementById('agree-price');
  var agreeMeeting = document.getElementById('agree-meeting');
  var roleDialog = document.getElementById('role-dialog');
  var phoneDialog = document.getElementById('phone-dialog');
  var agreementDialog = document.getElementById('agreement-dialog');
  var scheduleDialog = document.getElementById('schedule-dialog');
  var appointmentDate = '';
  var appointmentHour = 14;
  var appointmentMinute = 0;
  var calendarYear;
  var calendarMonth;
  var deviceScroll = document.getElementById('device-scroll');
  var distance = document.getElementById('distance');
  var confirmSeller = document.getElementById('confirm-seller');
  var confirmBuyer = document.getElementById('confirm-buyer');
  var inspected = document.getElementById('inspected');
  var delivered = document.getElementById('delivered');
  var complete = document.getElementById('complete');
  var status = document.getElementById('handover-status');
  var arrive = document.getElementById('arrive');
  var cameraPreview = document.getElementById('camera-preview');
  var openCamera = document.getElementById('open-camera');
  var photoPreview = document.getElementById('photo-preview');
  var capturePhoto = document.getElementById('capture-photo');
  var photoFeedback = document.getElementById('photo-feedback');
  var photoReady = false;
  var photoAwarded = false;
  var photoVersion = 0;
  var cameraStream = null;
  var cameraPending = false;
  var photoKind = 'selfie';
  var stars = 0;
  var rewardError = '';
  async function loadStars() {
    stars = (await OPULE.db.all('rewards')).filter(function (entry) { return entry.userId === selectedBuyer.id; })
      .reduce(function (total, entry) { return total + entry.stars; }, 0);
  }

  function stopCamera() {
    photoVersion++;
    if (cameraStream) cameraStream.getTracks().forEach(function (track) { track.stop(); });
    cameraStream = null;
    cameraPending = false;
    cameraPreview.srcObject = null;
    cameraPreview.hidden = true;
    photoReady = false;
  }

  function clearPhoto() {
    stopCamera();
    photoAwarded = false;
    photoPreview.hidden = true;
    photoPreview.removeAttribute('src');
    photoFeedback.textContent = '';
    photoKind = 'selfie';
    photoPreview.alt = 'Preview of your optional handover selfie';
    document.getElementById('choose-selfie').setAttribute('aria-pressed', 'true');
    document.getElementById('choose-item-photo').setAttribute('aria-pressed', 'false');
  }

  function renderRewards() {
    document.getElementById('photo-reward').hidden = !completed;
    document.querySelector('.demo-grid').hidden = completed || !planAgreed();
    document.querySelector('.demo-progress').hidden = completed || !planAgreed();
    document.querySelector('.device-item').hidden = completed;
    document.getElementById('viewpoint-intro').hidden = completed;
    document.getElementById('completion-notification').hidden = !completed;
    document.getElementById('completion-title').textContent = photoAwarded ? 'Photo captured. +1 demo star!' : 'Item accepted. Handover complete.';
    document.getElementById('completion-message').textContent = photoAwarded
      ? (stars % 10 === 0 ? '10-star milestone: simulated coffee unlocked!' : stars + ' total stars. You are one step closer to coffee.')
      : 'Simulated payment released. No real money moved.';
    document.getElementById('photo-invitation').textContent = role === 'buyer'
      ? 'Your piece is yours! Take a selfie with it, or photograph the item, to earn 1 demo star.'
      : 'Buyer accepted your piece! Test control: simulate their optional selfie or item photo for 1 demo star.';
    var progress = stars === 0 ? 0 : (stars - 1) % 10 + 1;
    document.getElementById('star-visual').textContent = '★'.repeat(progress) + '☆'.repeat(10 - progress);
    document.getElementById('star-count').textContent = rewardError ? 'Demo star count unavailable' : stars + ' total stars · ' + progress + '/10 toward coffee';
    document.getElementById('star-progress').value = rewardError ? 0 : progress;
    var coffees = Math.floor(stars / 10);
    document.getElementById('coffee-reward').textContent = rewardError ? 'Rewards unavailable.'
      : coffees > 0 ? coffees + ' simulated Starbucks coffee reward' + (coffees === 1 ? '' : 's') + ' unlocked.'
        : 'Collect 10 stars to unlock a simulated Starbucks coffee.';
    capturePhoto.disabled = !completed || !photoReady || photoAwarded || !!rewardError;
    capturePhoto.textContent = photoAwarded ? '1 star earned for this handover' : 'Take picture · earn 1 star';
    openCamera.disabled = !completed || photoAwarded || cameraPending || !!cameraStream;
    openCamera.textContent = cameraPending ? 'Opening camera…' : 'Open camera';
    document.getElementById('choose-selfie').disabled = photoAwarded;
    document.getElementById('choose-item-photo').disabled = photoAwarded;
    document.getElementById('end-simulation').textContent = photoAwarded ? 'End simulation' : 'Skip photo & end simulation';
    if (rewardError) photoFeedback.textContent = rewardError;
  }

  function selectPhotoKind(kind) {
    if (!completed || photoAwarded) return;
    clearPhoto();
    photoKind = kind;
    photoPreview.alt = kind === 'selfie' ? 'Preview of your optional handover selfie' : 'Preview of your handover item photo';
    document.getElementById('choose-selfie').setAttribute('aria-pressed', String(kind === 'selfie'));
    document.getElementById('choose-item-photo').setAttribute('aria-pressed', String(kind === 'item'));
    renderRewards();
  }
  document.getElementById('choose-selfie').addEventListener('click', function () { selectPhotoKind('selfie'); });
  document.getElementById('choose-item-photo').addEventListener('click', function () { selectPhotoKind('item'); });

  function isNearby() {
    return planAgreed() && Number(distance.value) <= radius;
  }

  function planAgreed() {
    return chatAvailable() && ownAgreement && otherAgreement && !!proposedVenue && venueAccepted;
  }

  function chatAvailable() {
    return role === 'buyer' || (role === 'seller' && !sellerInboxOpen);
  }

  function resetAgreement() {
    stateLoaded = false;
    if (agreementDialog.open) agreementDialog.close();
    if (scheduleDialog.open) scheduleDialog.close();
    ownAgreement = false;
    otherAgreement = false;
    agreePrice.checked = false;
    agreeMeeting.checked = false;
    venueMode = 'suggested';
    proposedVenue = null;
    venueAccepted = false;
    document.getElementById('custom-name').value = '';
    document.getElementById('custom-address').value = '';
    document.getElementById('meeting-time').value = '';
    document.getElementById('meeting-time-label').textContent = 'Select a date & time';
    document.getElementById('chat-message').value = '';
    document.getElementById('chat-message').setCustomValidity('');
    var defaultVenue = document.querySelector('input[name="venue"]');
    if (defaultVenue) defaultVenue.checked = true;
    document.getElementById('chat-messages').replaceChildren();
    document.getElementById('chat-details').hidden = true;
    document.getElementById('chat-info-toggle').setAttribute('aria-expanded', 'false');
    document.getElementById('venue-status').textContent = 'Select a place and time. Both people must confirm the same plan.';
  }

  function clearConfirmations() {
    clearPhoto();
    sellerConfirmed = false;
    buyerConfirmed = false;
    inspected.checked = false;
    delivered.checked = false;
    completed = false;
  }

  function render() {
    var metres = Number(distance.value);
    var nearby = isNearby();
    var bothConfirmed = sellerConfirmed && buyerConfirmed;
    var isBuyer = role === 'buyer';
    var ownConfirmed = isBuyer ? sellerConfirmed : buyerConfirmed;
    var otherName = isBuyer ? 'seller' : 'buyer';
    document.getElementById('offer-participants').textContent = 'Jamie R. & Alex S. · you are ' + (isBuyer ? 'Jamie (buyer)' : 'Alex (seller)');
    if (!isBuyer) document.getElementById('offer-participants').textContent = selectedBuyer.name + ' & Alex S. · you are Alex (seller)';
    document.getElementById('open-agreement').textContent = ownAgreement ? 'View agreement · waiting for ' + otherName : 'Agree together';
    var chatting = chatAvailable() && !otherAgreement && !completed;
    if (!selectedBuyer) {
      document.getElementById('agreement-step').hidden = true;
      document.getElementById('venue-step').hidden = true;
      document.querySelector('.demo-grid').hidden = true;
      document.querySelector('.demo-progress').hidden = true;
      return;
    }
    phoneDialog.classList.toggle('buyer-messenger', isBuyer && chatting);
    document.getElementById('seller-inbox').hidden = role !== 'seller' || !sellerInboxOpen;
    document.getElementById('agreement-step').hidden = !chatAvailable() || (ownAgreement && otherAgreement) || completed;
    document.getElementById('back-to-buyers').hidden = isBuyer;
    document.getElementById('venue-step').hidden = !ownAgreement || !otherAgreement || planAgreed() || completed;
    document.getElementById('suggested-venues').hidden = venueMode !== 'suggested';
    document.getElementById('custom-venue').hidden = venueMode !== 'custom';
    ['use-suggestions', 'use-custom'].forEach(function (id) {
      document.getElementById(id).disabled = !!proposedVenue;
      document.getElementById(id).setAttribute('aria-pressed', String(id === (venueMode === 'suggested' ? 'use-suggestions' : 'use-custom')));
    });
    document.querySelectorAll('#venue-step input').forEach(function (input) { input.disabled = !!proposedVenue; });
    document.getElementById('confirm-venue').disabled = !!proposedVenue;
    document.getElementById('open-schedule').disabled = !!proposedVenue;
    document.getElementById('other-venue').hidden = !proposedVenue || venueAccepted;
    document.getElementById('simulate-venue').textContent = 'Simulate ' + otherName + ' accepting this place & time';
    if (proposedVenue) {
      var planText = '₱282,000 · ' + proposedVenue.name + ' · ' + proposedVenue.address + ' · ' + proposedVenue.time.replace('T', ' ') + ' (Philippine time, demo)';
      document.getElementById('proposed-venue').textContent = planText;
      document.getElementById('agreement-summary').textContent = 'Both parties agreed: ' + planText;
      document.getElementById('location-heading').textContent = 'Meet at ' + proposedVenue.name;
      var query = encodeURIComponent(proposedVenue.name + ', ' + proposedVenue.address);
      document.getElementById('meeting-google-maps').href = proposedVenue.googleMaps || 'https://www.google.com/maps/search/?api=1&query=' + query;
      document.getElementById('meeting-apple-maps').href = 'https://maps.apple.com/?q=' + query;
      document.getElementById('location-note').textContent = venueMode === 'custom'
        ? 'Custom venue: coordinates below are fictional, not geocoded from this address. Verify the location and opening hours together.'
        : 'Coordinates are approximate. Confirm the branch, opening hours, and seating before meeting. Not a staff-vetted safety recommendation.';
    }
    document.getElementById('agreement-summary').hidden = !planAgreed() || completed;
    agreePrice.disabled = ownAgreement;
    agreeMeeting.disabled = ownAgreement;
    document.getElementById('accept-plan').disabled = !chatAvailable() || ownAgreement || !agreePrice.checked || !agreeMeeting.checked;
    document.getElementById('accept-plan').textContent = ownAgreement ? 'You agreed on price & meeting intent' : 'Agree on price & meeting intent';
    document.getElementById('other-agreement').hidden = !ownAgreement || otherAgreement;
    document.getElementById('simulate-agreement').textContent = 'Simulate ' + otherName + ' accepting price & meeting';
    document.getElementById('agreement-status').textContent = ownAgreement
      ? 'You agreed. Waiting for the ' + otherName + ' to accept the price and agree to meet, before choosing a venue.'
      : 'Chat first. Both people must agree to the price and meeting intent before choosing a place.';
    var buyerY = 230 - metres;
    document.getElementById('buyer-marker').setAttribute('transform', 'translate(180 ' + buyerY + ')');
    document.getElementById('moving-marker-label').textContent = (isBuyer ? 'Buyer' : 'Seller') + ' (you)';
    document.getElementById('moving-pin-letter').textContent = isBuyer ? 'B' : 'S';
    document.getElementById('fixed-marker-label').textContent = (isBuyer ? 'Seller' : 'Buyer') + ' / meetup';
    document.getElementById('fixed-pin-letter').textContent = isBuyer ? 'S' : 'B';
    document.getElementById('map-connection').setAttribute('d', 'M180 230V' + buyerY);
    document.getElementById('distance-value').textContent = metres + ' m apart';
    document.getElementById('proximity-badge').textContent = nearby ? 'Within 30 m meeting zone' : 'Outside meeting zone';
    document.querySelector('.demo-map').classList.toggle('nearby', nearby);
    distance.setAttribute('aria-valuetext', metres + ' metres apart');
    var fixedCoordinates = sellerLatitude.toFixed(6) + ', ' + sellerLongitude.toFixed(6);
    var movingCoordinates = (sellerLatitude + metres / 111195).toFixed(6) + ', ' + sellerLongitude.toFixed(6);
    document.getElementById('seller-coordinates').textContent = isBuyer ? fixedCoordinates : movingCoordinates;
    document.getElementById('buyer-coordinates').textContent = isBuyer ? movingCoordinates : fixedCoordinates;
    document.getElementById('viewpoint-label').textContent = role ? (isBuyer ? 'Buyer' : 'Seller') + ' viewpoint' : 'Choose a viewpoint';
    document.getElementById('active-demo-account').textContent = isBuyer
      ? 'Using Jamie R. · DEMO-B01 · Buyer account'
      : 'Using Alex S. · DEMO-S01 · Seller account';
    document.getElementById('viewpoint-intro').textContent = isBuyer
      ? 'You are Jamie, the buyer. Meet Alex, check the seller, and inspect your piece before accepting it.'
      : sellerInboxOpen ? 'You are Alex, the seller. Review buyer enquiries and choose who to chat with.'
        : 'You are Alex, the seller. Meet ' + selectedBuyer.firstName + ', check the buyer, and hand over your piece once both of you confirm.';
    document.getElementById('phone-heading').textContent = sellerInboxOpen && !isBuyer ? 'Seller · buyer enquiries' : !ownAgreement || !otherAgreement
      ? 'Chat · ' + (isBuyer ? 'Alex' : selectedBuyer.firstName)
      : !planAgreed() ? 'Choose your meeting place' : isBuyer ? 'Buying · your handover' : 'Selling · your handover';
    document.getElementById('agreement-heading').textContent = isBuyer ? 'Alex S.' : selectedBuyer.name;
    document.getElementById('chat-subtitle').textContent = (isBuyer ? 'Seller' : 'Buyer') + ' · simulated conversation';
    var quickReplies = document.querySelectorAll('[data-message]');
    quickReplies[0].textContent = isBuyer ? 'Still available?' : 'Still interested?';
    quickReplies[0].dataset.message = isBuyer ? 'Is the item still available?' : 'Are you still interested in the piece at ₱282,000?';
    quickReplies[1].textContent = isBuyer ? 'Item condition' : 'Inspection welcome';
    quickReplies[1].dataset.message = isBuyer ? 'Could you describe the condition of the piece?' : 'You can inspect the piece at our agreed public meeting place before accepting it.';
    var chatPhoto = isBuyer ? 'assets/images/demo-seller.jpg' : selectedBuyer.photo;
    document.getElementById('chat-avatar').hidden = !chatPhoto;
    if (chatPhoto) document.getElementById('chat-avatar').src = chatPhoto;
    document.getElementById('chat-initials').hidden = !!chatPhoto;
    document.getElementById('chat-initials').textContent = selectedBuyer.initials;
    document.getElementById('chat-details-text').textContent = isBuyer
      ? 'Alex S. · Baliwag, Bulacan · member since 2024 · sample ID + video checked. Hermès Roulis 23 at ₱282,000.'
      : buyerSummary(selectedBuyer);
    document.getElementById('handover-buyer-name').textContent = selectedBuyer.name;
    document.getElementById('handover-buyer-area').textContent = selectedBuyer.area + ' · member since ' + selectedBuyer.joined;
    document.getElementById('handover-buyer-verification').textContent = selectedBuyer.verified ? 'Sample: ID + mobile checked' : 'Sample: ID not checked';
    document.getElementById('handover-buyer-history').textContent = selectedBuyer.transactions + ' completed demo transactions · ' + selectedBuyer.rating + (selectedBuyer.photo ? '' : ' · No demo portrait; initials are not an identity check.');
    document.getElementById('handover-buyer-photo').hidden = !selectedBuyer.photo;
    if (selectedBuyer.photo) document.getElementById('handover-buyer-photo').src = selectedBuyer.photo;
    document.getElementById('handover-buyer-initials').hidden = !!selectedBuyer.photo;
    document.getElementById('handover-buyer-initials').textContent = selectedBuyer.initials;
    document.getElementById('transaction-heading').textContent = isBuyer ? 'Inspect & receive your piece' : 'Hand over your piece';
    document.getElementById('mismatch').textContent = isBuyer ? 'This is not my seller' : 'This is not my buyer';
    document.getElementById('confirmation-heading').textContent = 'Know your ' + otherName + '.';
    document.getElementById('map-description').textContent = 'The ' + otherName + ' is at the meeting point. Move your simulated position into the 30-metre circle using the distance slider.';
    document.getElementById('buyer-view').hidden = !isBuyer;
    document.getElementById('seller-view').hidden = isBuyer;
    document.getElementById('other-party').hidden = !nearby || !ownConfirmed;
    document.getElementById('simulate-other').textContent = bothConfirmed ? 'Other person confirmed' : 'Simulate ' + otherName + ' confirming you';
    document.getElementById('simulate-other').disabled = bothConfirmed || paused || completed;
    document.getElementById('inspection-label').textContent = isBuyer
      ? 'I inspected and received the item.'
      : 'Simulate buyer: item inspected and received.';
    complete.textContent = isBuyer ? 'Accept item & finish demo' : 'Simulate buyer accepting item';
    document.getElementById('profiles').hidden = !nearby;
    document.getElementById('profile-lock').hidden = nearby;
    confirmSeller.disabled = !nearby || paused || completed || sellerConfirmed;
    confirmBuyer.disabled = !nearby || paused || completed || buyerConfirmed;
    confirmSeller.textContent = sellerConfirmed ? 'You confirmed the seller' : 'This is the seller';
    confirmBuyer.textContent = buyerConfirmed ? 'You confirmed the buyer' : 'This is the buyer';
    document.getElementById('mismatch').disabled = paused || completed;
    document.getElementById('seller-delivery').hidden = isBuyer;
    delivered.disabled = !nearby || !bothConfirmed || paused || completed;
    inspected.disabled = !nearby || !bothConfirmed || (!isBuyer && !delivered.checked) || paused || completed;
    complete.disabled = !nearby || !bothConfirmed || (!isBuyer && !delivered.checked) || !inspected.checked || paused || completed;
    distance.disabled = !planAgreed() || paused || completed;
    arrive.disabled = !planAgreed() || paused || completed;

    var message;
    if (completed) {
      message = 'Test handover complete. Both people confirmed and the buyer accepted the item. Simulated funds released; no money moved.';
    } else if (paused) {
      message = 'Handover paused: a person did not match. Confirmations cleared and simulated funds remain held. Do not exchange the item. Restart to try again.';
    } else if (!nearby) {
      message = 'Move closer to the ' + otherName + ' at the meeting point. Confirmations cleared; simulated funds remain held.';
    } else if (!bothConfirmed) {
      message = sellerConfirmed || buyerConfirmed
        ? 'You confirmed your ' + otherName + '. Waiting for their confirmation; use the simulation control to try their response. Simulated funds remain held.'
        : 'You are nearby. Compare your ' + otherName + '\'s sample face and details with the person at the meeting, then confirm.';
    } else {
      message = inspected.checked
        ? 'Both people confirmed and the item accepted. Ready to complete the test handover.'
        : !isBuyer && !delivered.checked
          ? 'Both people confirmed. Hand your piece to the buyer for inspection, then wait for their acceptance.'
          : 'Both people confirmed. The buyer must inspect and receive the item before completing the handover.';
    }
    status.textContent = message;
    document.getElementById('funds-status').textContent = completed
      ? '₱282,000 · simulated funds released (no money moved)'
      : planAgreed() ? '₱282,000 · simulated funds held' : '₱282,000 · awaiting agreement; no funds held';
    status.classList.toggle('is-complete', completed);
    var activeStep = completed ? null : !nearby ? 'step-arrive' : !bothConfirmed ? 'step-verify' : 'step-release';
    ['step-arrive', 'step-verify', 'step-release'].forEach(function (id) {
      var step = document.getElementById(id);
      if (id === activeStep) step.setAttribute('aria-current', 'step');
      else step.removeAttribute('aria-current');
      step.classList.toggle('is-done', completed || (id === 'step-arrive' && nearby) || (id === 'step-verify' && bothConfirmed));
    });
    renderRewards();
    document.querySelector('.device-item').hidden = completed || sellerInboxOpen;
    document.getElementById('viewpoint-intro').hidden = completed || (isBuyer && chatting);
    if (stateLoaded) {
      var snapshot = { id: handoverId, conversationId: conversationId, buyerId: selectedBuyer.id, sellerId: 'alex',
        buyerAgreement: role === 'buyer' ? ownAgreement : otherAgreement,
        sellerAgreement: role === 'seller' ? ownAgreement : otherAgreement,
        venueMode: venueMode, proposedVenue: proposedVenue, venueAccepted: venueAccepted,
        completed: completed, updatedAt: new Date().toISOString(), demo: true };
      stateQueue = stateQueue.then(function () { return OPULE.db.put('handovers', snapshot); });
      stateQueue.catch(OPULE.db.report);
    }
  }

  distance.addEventListener('input', function () {
    if (!isNearby()) clearConfirmations();
    render();
  });
  arrive.addEventListener('click', function () {
    if (!planAgreed() || paused || completed) return;
    distance.value = '12';
    render();
    document.querySelector('.demo-confirmation').scrollIntoView({ block: 'start' });
  });
  confirmSeller.addEventListener('click', function () {
    if (role !== 'buyer' || !isNearby() || paused || completed) return;
    sellerConfirmed = true;
    render();
  });
  confirmBuyer.addEventListener('click', function () {
    if (role !== 'seller' || !isNearby() || paused || completed) return;
    buyerConfirmed = true;
    render();
  });
  inspected.addEventListener('change', render);
  delivered.addEventListener('change', function () {
    if (!delivered.checked) inspected.checked = false;
    render();
  });
  document.getElementById('simulate-other').addEventListener('click', function () {
    if (!isNearby() || paused || completed) return;
    if (role === 'buyer' && sellerConfirmed) buyerConfirmed = true;
    else if (role === 'seller' && buyerConfirmed) sellerConfirmed = true;
    render();
    document.querySelector('.demo-transaction').scrollIntoView({ block: 'start' });
  });
  document.getElementById('mismatch').addEventListener('click', function () {
    clearConfirmations();
    paused = true;
    render();
  });
  complete.addEventListener('click', async function () {
    if (!isNearby() || !sellerConfirmed || !buyerConfirmed || (role === 'seller' && !delivered.checked) || !inspected.checked || paused || completed) return;
    completed = true;
    render();
    try { await stateQueue; } catch (error) { completed = false; OPULE.db.report(error); return; }
    document.getElementById('photo-heading').focus();
    deviceScroll.scrollTop = 0;
  });
  openCamera.addEventListener('click', async function () {
    if (!completed || photoAwarded || cameraPending || cameraStream) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      photoFeedback.textContent = 'Camera access is unavailable. Open this demo on HTTPS or localhost with a camera-enabled browser, or skip the photo.';
      return;
    }
    cameraPending = true;
    var version = ++photoVersion;
    photoFeedback.textContent = 'Allow camera access to take a picture. No photo is uploaded.';
    renderRewards();
    try {
      var stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: photoKind === 'selfie' ? 'user' : 'environment' } },
        audio: false
      });
      if (version !== photoVersion || !phoneDialog.open || !completed) {
        stream.getTracks().forEach(function (track) { track.stop(); });
        return;
      }
      cameraStream = stream;
      cameraPreview.srcObject = stream;
      cameraPreview.hidden = false;
      await cameraPreview.play();
      if (version !== photoVersion) return;
      cameraPending = false;
      photoReady = cameraPreview.videoWidth > 0 && cameraPreview.videoHeight > 0;
      photoFeedback.textContent = 'Camera ready. Take a picture to earn your demo star automatically.';
      stream.getVideoTracks().forEach(function (track) {
        track.addEventListener('ended', function () {
          if (cameraStream !== stream) return;
          stopCamera();
          photoFeedback.textContent = 'The camera disconnected. Reopen the camera or skip the photo.';
          renderRewards();
        });
      });
      renderRewards();
    } catch (error) {
      if (version !== photoVersion) return;
      stopCamera();
      photoFeedback.textContent = 'Could not open the camera. Check camera permission and device availability, then try again or skip the photo.';
      console.error('Unable to open demo camera:', error);
      renderRewards();
    }
  });
  capturePhoto.addEventListener('click', async function () {
    if (!completed || !photoReady || photoAwarded || rewardError || operationPending) return;
    operationPending = true;
    capturePhoto.disabled = true;
    try {
      if (!cameraStream || !cameraStream.getVideoTracks().some(function (track) { return track.readyState === 'live'; })) {
        throw new Error('Camera is no longer active');
      }
      var canvas = document.createElement('canvas');
      canvas.width = cameraPreview.videoWidth;
      canvas.height = cameraPreview.videoHeight;
      var context = canvas.getContext('2d');
      if (!context || !canvas.width || !canvas.height) throw new Error('Camera frame unavailable');
      context.drawImage(cameraPreview, 0, 0);
      var picture = canvas.toDataURL('image/jpeg', 0.85);
      await stateQueue;
      await OPULE.db.reward(handoverId, selectedBuyer.id);
      await loadStars();
    } catch (error) {
      photoFeedback.textContent = 'The photo or star could not be saved in this preview. No star was awarded. Try taking the picture again or end the simulation.';
      console.error('Unable to capture demo photo reward:', error);
      operationPending = false;
      capturePhoto.disabled = false;
      return;
    }
    photoPreview.src = picture;
    photoPreview.hidden = false;
    stopCamera();
    photoAwarded = true;
    operationPending = false;
    photoFeedback.textContent = stars % 10 === 0
      ? '1 star earned! You unlocked a simulated Starbucks coffee. No real voucher was issued.'
      : '1 star earned! Thank you for adding your ' + (photoKind === 'selfie' ? 'selfie.' : 'item photo.');
    renderRewards();
    document.getElementById('end-simulation').focus();
  });
  document.getElementById('end-simulation').addEventListener('click', async function () {
    if (!completed || operationPending) return;
    try { await stateQueue; } catch (error) { OPULE.db.report(error); return; }
    var summary = document.getElementById('simulation-summary');
    summary.textContent = photoAwarded
      ? 'Simulation ended. Handover complete; 1 demo photo star earned. You have ' + stars + ' total stars and ' + Math.floor(stars / 10) + ' simulated coffee rewards. No money moved and no real voucher was issued.'
      : 'Simulation ended. Handover complete; photo skipped, no star earned. No money moved.';
    summary.hidden = false;
    clearPhoto();
    phoneDialog.close();
    location.assign('index.html');
  });
  document.getElementById('reset').addEventListener('click', async function () {
    await stateQueue;
    resetAgreement();
    sellerInboxOpen = role === 'seller';
    if (!sellerInboxOpen) await startChat(true);
    clearConfirmations();
    paused = false;
    distance.value = '180';
    render();
    deviceScroll.scrollTop = 0;
  });
  async function chooseRole(chosenRole) {
    await stateQueue;
    await OPULE.db.loginDemo(chosenRole === 'buyer' ? 'jamie' : 'alex');
    demoBuyers = (await OPULE.db.all('users')).filter(function (user) { return user.role === 'buyer' && user.firstName; });
    resetAgreement();
    document.getElementById('simulation-summary').hidden = true;
    role = chosenRole;
    selectedBuyer = demoBuyers.find(function (buyer) { return buyer.id === 'jamie'; });
    sellerInboxOpen = false;
    clearBuyerFilters();
    clearConfirmations();
    await startChat();
    paused = false;
    distance.value = '180';
    render();
    roleDialog.close();
    phoneDialog.showModal();
    deviceScroll.scrollTop = 0;
    document.getElementById('close-preview').focus();
  }
  async function startChat(fresh) {
    conversationId = 'alex-' + selectedBuyer.id + '-L1';
    var handovers = (await OPULE.db.all('handovers')).filter(function (row) { return row.conversationId === conversationId; })
      .sort(function (a, b) { return b.updatedAt.localeCompare(a.updatedAt); });
    var saved = !fresh && handovers[0];
    handoverId = saved ? saved.id : crypto.randomUUID();
    if (saved) {
      ownAgreement = role === 'buyer' ? saved.buyerAgreement : saved.sellerAgreement;
      otherAgreement = role === 'seller' ? saved.buyerAgreement : saved.sellerAgreement;
      agreePrice.checked = ownAgreement;
      agreeMeeting.checked = ownAgreement;
      venueMode = saved.venueMode;
      proposedVenue = saved.proposedVenue;
      venueAccepted = saved.venueAccepted;
      completed = saved.completed;
      if (proposedVenue) {
        document.getElementById('meeting-time').value = proposedVenue.time;
        document.getElementById('meeting-time-label').textContent = proposedVenue.time.replace('T', ' ') + ' · Philippine time';
      }
    }
    document.getElementById('chat-messages').replaceChildren();
    seenMessageIds.clear();
    (await OPULE.db.messagesFor(conversationId)).forEach(function (message) {
      drawMessage(message.text, message.senderId === (role === 'buyer' ? selectedBuyer.id : 'alex'), message.id);
    });
    await loadStars();
    photoAwarded = !!(await OPULE.db.get('rewards', handoverId));
    stateLoaded = true;
  }
  document.getElementById('choose-buyer').addEventListener('click', function () { chooseRole('buyer').catch(OPULE.db.report); });
  document.getElementById('choose-seller').addEventListener('click', function () { chooseRole('seller').catch(OPULE.db.report); });
  document.getElementById('switch-role').addEventListener('click', function () {
    phoneDialog.close();
    roleDialog.showModal();
  });
  document.getElementById('open-preview').addEventListener('click', function () {
    roleDialog.showModal();
  });
  document.getElementById('close-preview').addEventListener('click', function () {
    phoneDialog.close();
  });
  phoneDialog.addEventListener('close', function () {
    if (agreementDialog.open) agreementDialog.close();
    if (scheduleDialog.open) scheduleDialog.close();
    clearPhoto();
    if (roleDialog.open) return;
    document.getElementById('open-preview').focus();
  });
  phoneDialog.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      phoneDialog.close();
    }
  });
  roleDialog.addEventListener('cancel', function () {
    document.getElementById('open-preview').focus();
  });
  window.addEventListener('pagehide', stopCamera);
  document.getElementById('open-agreement').addEventListener('click', function () {
    if (!phoneDialog.open || !chatAvailable() || otherAgreement || completed) return;
    agreementDialog.showModal();
  });
  document.getElementById('close-agreement').addEventListener('click', function () { agreementDialog.close(); });
  agreementDialog.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      agreementDialog.close();
    }
  });
  agreementDialog.addEventListener('close', function () {
    if (!phoneDialog.open) return;
    if (otherAgreement) document.getElementById('use-suggestions').focus();
    else if (chatAvailable()) document.getElementById('open-agreement').focus();
  });
  agreePrice.addEventListener('change', render);
  agreeMeeting.addEventListener('change', render);
  document.getElementById('accept-plan').addEventListener('click', function () {
    if (!chatAvailable() || ownAgreement || !agreePrice.checked || !agreeMeeting.checked) return;
    ownAgreement = true;
    addMessage('I agree to ₱282,000 and to meet in Baliwag. Let us pick the venue after you confirm.', true).catch(OPULE.db.report);
    render();
  });
    function philippineToday() {
      var parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
      function part(type) { return parts.find(function (value) { return value.type === type; }).value; }
      return part('year') + '-' + part('month') + '-' + part('day');
    }
    function pad(value) { return String(value).padStart(2, '0'); }
    function renderCalendar() {
      var today = philippineToday();
      document.getElementById('calendar-month').textContent = new Date(calendarYear, calendarMonth, 1).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });
      var firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
      var count = new Date(calendarYear, calendarMonth + 1, 0).getDate();
      var html = '<span aria-hidden="true"></span>'.repeat(firstDay);
      for (var day = 1; day <= count; day++) {
        var date = calendarYear + '-' + pad(calendarMonth + 1) + '-' + pad(day);
        html += '<button type="button" data-date="' + date + '" aria-label="' + date + '" aria-pressed="' + (date === appointmentDate) + '"' +
          (date < today ? ' disabled' : '') + (date === today ? ' aria-current="date"' : '') + '>' + day + '</button>';
      }
      document.getElementById('calendar-days').innerHTML = html;
      document.getElementById('previous-month').disabled = calendarYear === Number(today.slice(0, 4)) && calendarMonth <= Number(today.slice(5, 7)) - 1;
      renderAppointmentTime();
    }
    function renderAppointmentTime() {
      document.getElementById('appointment-hour').textContent = pad(appointmentHour % 12 || 12);
      document.getElementById('appointment-minute').textContent = pad(appointmentMinute);
      document.getElementById('appointment-period').textContent = appointmentHour < 12 ? 'AM' : 'PM';
      document.getElementById('schedule-status').textContent = appointmentDate
        ? appointmentDate + ' · ' + pad(appointmentHour % 12 || 12) + ':' + pad(appointmentMinute) + (appointmentHour < 12 ? ' AM' : ' PM') + ' · Philippine time'
        : 'Choose a date to continue.';
    }
    document.getElementById('open-schedule').addEventListener('click', function () {
      if (!ownAgreement || !otherAgreement || proposedVenue || !phoneDialog.open) return;
      var saved = document.getElementById('meeting-time').value;
      var today = philippineToday();
      appointmentDate = saved ? saved.slice(0, 10) : '';
      appointmentHour = saved ? Number(saved.slice(11, 13)) : 14;
      appointmentMinute = saved ? Number(saved.slice(14, 16)) : 0;
      calendarYear = Number((saved || today).slice(0, 4));
      calendarMonth = Number((saved || today).slice(5, 7)) - 1;
      renderCalendar();
      scheduleDialog.showModal();
    });
    ['previous-month', 'next-month'].forEach(function (id) {
      document.getElementById(id).addEventListener('click', function () {
        var next = new Date(calendarYear, calendarMonth + (id === 'next-month' ? 1 : -1), 1);
        calendarYear = next.getFullYear();
        calendarMonth = next.getMonth();
        renderCalendar();
      });
    });
    document.getElementById('calendar-days').addEventListener('click', function (event) {
      var button = event.target.closest('button[data-date]');
      if (!button || button.disabled) return;
      appointmentDate = button.dataset.date;
      renderCalendar();
      document.querySelector('[data-date="' + appointmentDate + '"]').focus();
    });
    ['hour-up', 'hour-down', 'minute-up', 'minute-down', 'appointment-period'].forEach(function (id) {
      document.getElementById(id).addEventListener('click', function () {
        if (id === 'appointment-period') appointmentHour = (appointmentHour + 12) % 24;
        else if (id.indexOf('hour') === 0) appointmentHour = (appointmentHour + (id === 'hour-up' ? 1 : 23)) % 24;
        else appointmentMinute = (appointmentMinute + (id === 'minute-up' ? 15 : 45)) % 60;
        renderAppointmentTime();
      });
    });
    document.getElementById('save-schedule').addEventListener('click', function () {
      if (!appointmentDate) {
        document.getElementById('schedule-status').textContent = 'Please choose a meeting date first.';
        return;
      }
      var value = appointmentDate + 'T' + pad(appointmentHour) + ':' + pad(appointmentMinute);
      if (new Date(value + ':00+08:00').getTime() <= Date.now()) {
        document.getElementById('schedule-status').textContent = 'Choose a future appointment date and time.';
        return;
      }
      document.getElementById('meeting-time').value = value;
      document.getElementById('meeting-time-label').textContent = new Date(value + ':00+08:00').toLocaleString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
      scheduleDialog.close();
    });
    document.getElementById('close-schedule').addEventListener('click', function () { scheduleDialog.close(); });
    scheduleDialog.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        scheduleDialog.close();
      }
    });
    scheduleDialog.addEventListener('close', function () {
      if (phoneDialog.open && !proposedVenue && ownAgreement && otherAgreement) document.getElementById('open-schedule').focus();
    });
  document.getElementById('simulate-agreement').addEventListener('click', function () {
    if (!ownAgreement || otherAgreement) return;
    otherAgreement = true;
    addMessage('Agreed on the price and meeting in Baliwag. Let us choose a place and time next. (Simulated reply)', false).catch(OPULE.db.report);
    render();
    if (agreementDialog.open) agreementDialog.close();
    deviceScroll.scrollTop = 0;
  });
  async function addMessage(text, mine) {
    var senderId = mine ? (role === 'buyer' ? selectedBuyer.id : 'alex') : (role === 'buyer' ? 'alex' : selectedBuyer.id);
    var pending = null;
    if (mine) {
      pending = document.createElement('p');
      pending.className = 'chat-bubble chat-mine chat-pending';
      pending.textContent = text;
      document.getElementById('chat-messages').appendChild(pending);
      document.getElementById('chat-messages').scrollTop = document.getElementById('chat-messages').scrollHeight;
    }
    try {
      var message = await OPULE.db.sendMessage(conversationId, senderId, text);
      if (pending) pending.remove();
      drawMessage(message.text, mine, message.id);
    } catch (error) {
      if (pending) pending.remove();
      throw error;
    }
  }
  function drawMessage(text, mine, id) {
    if (id && seenMessageIds.has(id)) return;
    if (id) seenMessageIds.add(id);
    var message = document.createElement('p');
    message.className = 'chat-bubble ' + (mine ? 'chat-mine' : 'chat-theirs');
    message.textContent = text;
    var log = document.getElementById('chat-messages');
    log.appendChild(message);
    log.scrollTop = log.scrollHeight;
  }
  async function refreshMessages() {
    if (!liveChat || !role || !conversationId || !phoneDialog.open || document.hidden || pollingMessages) return;
    pollingMessages = true;
    try {
      (await OPULE.db.messagesFor(conversationId)).forEach(function (message) {
        drawMessage(message.text, message.senderId === (role === 'buyer' ? selectedBuyer.id : 'alex'), message.id);
      });
    } catch (error) { OPULE.db.report(error); }
    finally { pollingMessages = false; }
  }
  window.setInterval(refreshMessages, 1500);
  function buyerSummary(buyer) {
    return buyer.name + ' · ' + buyer.area + ', Bulacan · member since ' + buyer.joined + ' · ' +
      buyer.transactions + ' completed demo transactions · ' + buyer.rating + ' · approx. ' + buyer.distanceKm +
      ' km from the sample seller area · ' + (buyer.verified ? 'sample ID + mobile checked' : 'sample ID not checked');
  }
  function renderBuyerResults() {
    var history = document.getElementById('filter-history').value;
    var maxDistance = document.getElementById('filter-distance').value;
    var verifiedOnly = document.getElementById('filter-verified').checked;
    var sort = document.getElementById('sort-buyers').value;
    var buyers = demoBuyers.filter(function (buyer) {
      return (history === 'all' || (history === 'returning' && buyer.transactions > 0) ||
        (history === 'experienced' && buyer.transactions >= 5) || (history === 'new' && buyer.transactions === 0)) &&
        (maxDistance === 'all' || buyer.distanceKm <= Number(maxDistance)) && (!verifiedOnly || buyer.verified);
    });
    buyers.sort(function (a, b) {
      return sort === 'transactions' ? b.transactions - a.transactions || a.distanceKm - b.distanceKm : a.distanceKm - b.distanceKm;
    });
    document.getElementById('buyer-results-status').textContent = buyers.length
      ? buyers.length + ' of ' + demoBuyers.length + ' sample enquiries match'
      : 'No buyers match these filters. Widen the distance or clear filters to see other enquiries.';
    document.getElementById('buyer-results').innerHTML = buyers.map(function (buyer) {
      return '<article class="buyer-card"><div class="buyer-card-heading"><span class="buyer-initials" aria-hidden="true">' +
        OPULE.esc(buyer.initials) + '</span><div><h3>' + OPULE.esc(buyer.name) + '</h3><p>' + OPULE.esc(buyer.area) +
        ', Bulacan · approx. ' + buyer.distanceKm + ' km</p></div></div><div class="buyer-badges"><span>' +
        (buyer.transactions ? buyer.transactions + ' completed transactions' : 'New buyer · no transactions') + '</span><span>' +
        (buyer.verified ? 'Sample ID checked' : 'Sample ID not checked') + '</span></div><p>' + OPULE.esc(buyer.rating) +
        ' · member since ' + buyer.joined + '</p><p class="buyer-enquiry">Interested in the Hermès Roulis 23. Open chat to discuss the offer.</p>' +
        '<button class="btn fill" type="button" data-buyer-id="' + OPULE.esc(buyer.id) + '">Chat with ' +
        OPULE.esc(buyer.firstName) + '</button></article>';
    }).join('');
  }
  function clearBuyerFilters() {
    document.getElementById('filter-history').value = 'all';
    document.getElementById('filter-distance').value = 'all';
    document.getElementById('filter-verified').checked = false;
    document.getElementById('sort-buyers').value = 'nearest';
    renderBuyerResults();
  }
  ['filter-history', 'filter-distance', 'filter-verified', 'sort-buyers'].forEach(function (id) {
    document.getElementById(id).addEventListener('change', renderBuyerResults);
  });
  document.getElementById('clear-buyer-filters').addEventListener('click', clearBuyerFilters);
  document.getElementById('buyer-results').addEventListener('click', async function (event) {
    var button = event.target.closest('button[data-buyer-id]');
    if (!button || role !== 'seller' || !sellerInboxOpen) return;
    selectedBuyer = demoBuyers.find(function (buyer) { return buyer.id === button.dataset.buyerId; });
    resetAgreement();
    clearConfirmations();
    sellerInboxOpen = false;
    paused = false;
    distance.value = '180';
    await startChat();
    render();
    deviceScroll.scrollTop = 0;
    document.getElementById('chat-message').focus();
  });
  document.getElementById('back-to-buyers').addEventListener('click', async function () {
    if (role !== 'seller') return;
    await stateQueue;
    resetAgreement();
    clearConfirmations();
    sellerInboxOpen = true;
    paused = false;
    distance.value = '180';
    render();
    deviceScroll.scrollTop = 0;
    document.getElementById('filter-history').focus();
  });
  document.getElementById('chat-info-toggle').addEventListener('click', function () {
    var details = document.getElementById('chat-details');
    details.hidden = !details.hidden;
    this.setAttribute('aria-expanded', String(!details.hidden));
  });
  document.querySelectorAll('[data-message]').forEach(function (button) {
    button.addEventListener('click', function () {
      document.getElementById('chat-message').value = button.dataset.message;
      document.getElementById('chat-form').requestSubmit();
    });
  });
  var chatForm = document.getElementById('chat-form');
  var sendStatus = document.createElement('p');
  sendStatus.className = 'chat-send-status';
  sendStatus.setAttribute('role', 'status');
  sendStatus.setAttribute('aria-live', 'polite');
  sendStatus.hidden = true;
  chatForm.after(sendStatus);
  chatForm.addEventListener('submit', async function (event) {
    event.preventDefault();
    if (!chatAvailable() || otherAgreement || completed) return;
    var input = document.getElementById('chat-message');
    var sendButton = this.querySelector('.chat-send');
    if (sendButton.disabled) return;
    var text = input.value.trim();
    if (!text) {
      input.setCustomValidity('Enter a message before sending.');
      input.reportValidity();
      return;
    }
    sendStatus.hidden = true;
    sendButton.disabled = true;
    var messageSent = false;
    try {
    await addMessage(text, true);
    input.value = '';
    messageSent = true;
    sendStatus.textContent = 'Message sent in the demo chat.';
    sendStatus.hidden = false;
    if (liveChat) return;
    var reply;
    if (/condition|accessor|inspect/i.test(text)) {
      reply = role === 'buyer'
        ? 'Please check the source listing for sample condition and accessories. You can inspect at the agreed public venue before accepting.'
        : 'Thank you! I would like to inspect the piece and accessories before accepting it at our agreed public venue.';
    } else if (/meet|baliwag|venue|place/i.test(text)) {
      reply = 'Baliwag works for this sample. Let us both confirm the price and meeting intent below, then choose a public venue and time together.';
    } else if (/price|282|offer|interested|available/i.test(text)) {
      reply = role === 'buyer'
        ? 'Yes, the sample piece is available. This demo has a fixed ₱282,000 price. Use the agreement controls when you are ready.'
        : 'I am interested at the ₱282,000 sample price. Let us confirm using the agreement controls before choosing a meeting place.';
    } else {
      reply = 'Thanks for your message. We can discuss the item, the ₱282,000 sample price, or meeting in Baliwag. The agreement controls stay separate from chat.';
    }
    await addMessage(reply + ' (Automated demo reply)', false);
    } catch (error) {
      sendStatus.textContent = messageSent
        ? 'Your message was sent, but the automated demo reply could not be loaded.'
        : 'The message could not be sent and was removed. Please try again.';
      sendStatus.hidden = false;
      OPULE.db.report(error);
    } finally {
      sendButton.disabled = false;
    }
  });
  document.getElementById('chat-message').addEventListener('input', function () { this.setCustomValidity(''); });
  document.getElementById('suggested-venues').innerHTML = suggestedVenues.map(function (spot, index) {
    return '<label class="venue-option"><input type="radio" name="venue" value="' + OPULE.esc(spot.id) + '"' + (index === 0 ? ' checked' : '') + '><span><strong>' + OPULE.esc(spot.name) + '</strong><small>' + OPULE.esc(spot.address) + '</small></span></label>';
  }).join('');
  document.getElementById('suggested-venues').innerHTML += suggestedVenues.map(function (spot) {
    var query = encodeURIComponent(spot.name + ', ' + spot.address);
    return '<p class="form-note">' + OPULE.esc(spot.name) + ': <a href="' + OPULE.esc(spot.googleMaps || 'https://www.google.com/maps/search/?api=1&query=' + query) + '" target="_blank" rel="noopener noreferrer">Google Maps</a> · <a href="https://maps.apple.com/?q=' + query + '" target="_blank" rel="noopener noreferrer">Apple Maps</a></p>';
  }).join('');
  function changeVenueMode(mode) {
    if (proposedVenue) return;
    venueMode = mode;
    render();
  }
  document.getElementById('use-suggestions').addEventListener('click', function () { changeVenueMode('suggested'); });
  document.getElementById('use-custom').addEventListener('click', function () { changeVenueMode('custom'); });
  document.getElementById('confirm-venue').addEventListener('click', function () {
    if (!ownAgreement || !otherAgreement || proposedVenue) return;
    var selected = document.querySelector('input[name="venue"]:checked');
    var spot = selected ? suggestedVenues.find(function (venue) { return venue.id === selected.value; }) : null;
    var name = venueMode === 'custom' ? document.getElementById('custom-name').value.trim() : spot && spot.name;
    var address = venueMode === 'custom' ? document.getElementById('custom-address').value.trim() : spot && spot.address;
    var time = document.getElementById('meeting-time').value;
    if (!name || !address || !time) {
      document.getElementById('venue-status').textContent = 'Enter a public venue name, full address, and meeting date/time before proposing.';
      return;
    }
    if (!Number.isFinite(new Date(time + ':00+08:00').getTime()) || new Date(time + ':00+08:00').getTime() <= Date.now()) {
      document.getElementById('venue-status').textContent = 'Choose a future meeting date and time before proposing.';
      return;
    }
    proposedVenue = { name: name, address: address, time: time, googleMaps: venueMode === 'suggested' ? spot.googleMaps : null };
    // Custom venue GPS stays fictional; a real app must geocode the agreed address.
    sellerLatitude = venueMode === 'suggested' ? spot.lat : 14.95;
    sellerLongitude = venueMode === 'suggested' ? spot.lng : 120.883;
    document.getElementById('venue-status').textContent = 'Proposal sent. Waiting for the other party to accept this exact place and time.';
    render();
  });
  document.getElementById('edit-venue').addEventListener('click', function () {
    if (venueAccepted) return;
    proposedVenue = null;
    document.getElementById('venue-status').textContent = 'Edit the meeting plan, then send a new proposal.';
    render();
  });
  document.getElementById('simulate-venue').addEventListener('click', function () {
    if (!ownAgreement || !otherAgreement || !proposedVenue || venueAccepted) return;
    venueAccepted = true;
    render();
    deviceScroll.scrollTop = 0;
  });
  render();
  var requestedAccount = new URLSearchParams(location.search).get('account');
  if (liveChat && (requestedAccount === 'jamie' || requestedAccount === 'alex')) {
    chooseRole(requestedAccount === 'jamie' ? 'buyer' : 'seller').catch(OPULE.db.report);
  } else {
    roleDialog.showModal();
  }
})().catch(OPULE.db.report);
