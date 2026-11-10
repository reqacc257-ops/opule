(function () {
  'use strict';
  OPULE.renderListingManagement = function (catalog, listings) {
    var esc = OPULE.esc;
    catalog.replaceChildren();
    listings.forEach(function (listing) {
      var article = document.createElement('article');
      article.appendChild(OPULE.listingCard(listing));
      var editor = document.createElement('details');
      editor.className = 'listing-management';
      editor.innerHTML = '<summary>Manage piece · ' + esc(listing.status || 'active') + '</summary>' +
        '<form><label class="field"><span>Title</span><input name="title" maxlength="200" required></label>' +
        '<label class="field"><span>Price · PHP</span><input name="price" type="number" min="1000" max="100000000" step="1" required></label>' +
        '<label class="field"><span>Category</span><select name="category">' + ['Watches', 'Bags', 'Jewelry', 'Sneakers', 'Accessories', 'Other'].map(function (value) { return '<option>' + value + '</option>'; }).join('') + '</select></label>' +
        '<label class="field"><span>Condition</span><select name="condition">' + ['New', 'Excellent', 'Very good', 'Good', 'Fair'].map(function (value) { return '<option>' + value + '</option>'; }).join('') + '</select></label>' +
        '<label class="field"><span>Details</span><textarea name="meta" maxlength="2000"></textarea></label>' +
        '<label class="field"><span>General area</span><select name="area">' + OPULE.areaOptions(listing.area) + '</select></label>' +
        '<label class="field"><span>Availability</span><select name="status"><option value="active">Available</option><option value="sold">Sold</option><option value="archived">Archived · hidden from public</option></select></label>' +
        '<button class="btn" type="submit">Save changes</button></form>' +
        '<form data-photo-form><label class="field"><span>Replace photo · JPEG, PNG or WebP, up to 5 MB / 20 megapixels</span><input type="file" accept="image/jpeg,image/png,image/webp" required></label>' +
        '<p class="form-note">Only upload photos you own or have permission to use. Avoid people, IDs, receipts and addresses. Image metadata is removed.</p><button class="btn" type="submit">Upload photo</button></form>' +
        '<p role="status" aria-live="polite"></p>';
      var form = editor.querySelector('form');
      ['title', 'price', 'category', 'condition', 'meta', 'area'].forEach(function (name) { form.elements[name].value = listing[name] || ''; });
      form.elements.status.value = listing.status || 'active';
      var photoForm = editor.querySelector('[data-photo-form]');
      var status = editor.querySelector('[role="status"]');
      var busy = false;
      function lock(value) {
        busy = value;
        editor.querySelectorAll('input, select, textarea, button').forEach(function (field) { field.disabled = value; });
      }
      function update(row) {
        listing = row;
        article.replaceChild(OPULE.listingCard(row), article.firstChild);
        editor.querySelector('summary').textContent = 'Manage piece · ' + row.status;
      }
      form.addEventListener('submit', async function (event) {
        event.preventDefault();
        if (busy) return;
        var changes = {};
        ['title', 'category', 'condition', 'meta', 'area', 'status'].forEach(function (name) { changes[name] = form.elements[name].value; });
        changes.price = Number(form.elements.price.value);
        lock(true);
        status.textContent = 'Saving changes…';
        try {
          update(await OPULE.updateListing(listing.id, changes));
          status.textContent = 'Saved. Sold pieces cannot receive new enquiries; archived pieces are hidden from public browsing. Existing conversations remain available.';
        } catch (error) {
          status.textContent = error.message + ' Your edits are kept; retry saving.';
          OPULE.db.report(error);
        } finally { lock(false); }
      });
      photoForm.addEventListener('submit', async function (event) {
        event.preventDefault();
        if (busy) return;
        var file = photoForm.querySelector('input').files[0];
        lock(true);
        status.textContent = 'Processing photo…';
        try {
          update(await OPULE.uploadListingPhoto(listing.id, file));
          photoForm.reset();
          status.textContent = 'Photo saved. Image metadata has been removed.';
        } catch (error) {
          status.textContent = error.message + ' The previous photo has not been replaced; retry uploading.';
          OPULE.db.report(error);
        } finally { lock(false); }
      });
      article.appendChild(editor);
      catalog.appendChild(article);
    });
  };
})();
