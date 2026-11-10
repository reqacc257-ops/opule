(async function () {
  await OPULE.ready;
  OPULE.renderInbox(document.getElementById('inbox-root'));
})().catch(function (error) {
  document.getElementById('inbox-root').textContent = 'Messages could not be loaded. Please refresh to retry.';
  OPULE.db.report(error);
});
