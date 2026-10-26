const notice = document.querySelector('.preview-notice');
let noticeTimer;
function showNotice(text) {
  if (!notice) return;
  notice.textContent = text;
  notice.dataset.visible = 'true';
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => { notice.dataset.visible = 'false'; }, 2600);
}
document.querySelectorAll('[data-notice]').forEach((button) => {
  button.addEventListener('click', () => showNotice(button.dataset.notice));
});
document.querySelectorAll('[data-modal]').forEach((button) => {
  button.addEventListener('click', () => document.getElementById(button.dataset.modal).showModal());
});
document.querySelectorAll('dialog').forEach((dialog) => {
  dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
});
document.querySelectorAll('[data-sound]').forEach((button) => {
  button.addEventListener('click', () => {
    const enabled = button.getAttribute('aria-pressed') !== 'true';
    button.setAttribute('aria-pressed', String(enabled));
    const label = enabled ? 'Sound on' : 'Sound off';
    button.setAttribute('aria-label', label);
    const state = button.querySelector('[data-sound-state]');
    if (state) state.textContent = enabled ? 'On' : 'Off';
    showNotice(`${label} in this mockup; no audio is connected.`);
  });
});
