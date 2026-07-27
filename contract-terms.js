(() => {
  'use strict';

  const page = window.ContractPage;
  const { elements, state } = page;

  function confirmTermsRead() {
    if (state.hasReadTerms) return;
    state.hasReadTerms = true;
    elements.agreeTerms.disabled = false;
    elements.agreeLabel.dataset.ready = 'true';
    elements.readProgress.classList.add('is-complete');
    elements.readProgress.innerHTML = '<i data-lucide="circle-check" class="size-4" aria-hidden="true"></i>條款已閱讀完畢';
    elements.agreeTerms.checked = true;
    elements.agreeTerms.dispatchEvent(new Event('change', { bubbles: true }));
    page.refreshIcons();
  }

  function setupTermsReading() {
    elements.termsBox.addEventListener('scroll', () => {
      const distanceFromBottom = elements.termsBox.scrollHeight
        - elements.termsBox.scrollTop
        - elements.termsBox.clientHeight;
      if (distanceFromBottom <= 32) confirmTermsRead();
    });

    elements.agreeTerms.addEventListener('change', () => {
      elements.agreeError.classList.add('hidden');
      elements.agreeError.classList.remove('flex');
      page.updateSubmitState();
    });
  }

  page.setupTermsReading = setupTermsReading;
})();
