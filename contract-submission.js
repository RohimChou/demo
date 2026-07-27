(() => {
  'use strict';

  const page = window.ContractPage;
  const { elements, state, requiredFields } = page;
  const submissionProgressTimeouts = [];
  const submissionProgressSteps = [
    {
      minimumDelayMs: 2000,
      maximumDelayMs: 3500,
      message: '正在確認契約資料…'
    },
    {
      minimumDelayMs: 5000,
      maximumDelayMs: 7000,
      message: '正在產製契約 PDF…'
    },
    {
      minimumDelayMs: 9500,
      maximumDelayMs: 12000,
      message: '正在寄送契約副本…'
    },
    {
      minimumDelayMs: 15000,
      maximumDelayMs: 16500,
      message: '快完成了，請稍候…'
    }
  ];

  function clearSubmissionProgress() {
    submissionProgressTimeouts.forEach((timeoutId) => {
      window.clearTimeout(timeoutId);
    });
    submissionProgressTimeouts.length = 0;
  }

  function startSubmissionProgress() {
    clearSubmissionProgress();
    submissionProgressSteps.forEach((step) => {
      const delayRange = step.maximumDelayMs - step.minimumDelayMs;
      const delay = step.minimumDelayMs + Math.round(
        Math.random() * delayRange
      );
      const timeoutId = window.setTimeout(() => {
        if (state.isSubmitting) {
          elements.submitButton
            .querySelector('.button-label')
            .textContent = step.message;
        }
      }, delay);
      submissionProgressTimeouts.push(timeoutId);
    });
  }

  function showAgreementError() {
    if (elements.agreeTerms.checked) return;
    elements.agreeError.classList.remove('hidden');
    elements.agreeError.classList.add('flex');
  }

  function showSignatureError() {
    if (state.hasSignature) return;
    elements.signatureWrap.classList.add('border-danger');
    elements.signatureError.classList.remove('hidden');
    elements.signatureError.classList.add('flex');
  }

  function scrollToFirstInvalidField() {
    const firstInvalidField = elements.form.querySelector(
      '[aria-invalid="true"]'
    );
    if (!firstInvalidField) return;
    const reduceMotion = window
      .matchMedia('(prefers-reduced-motion: reduce)')
      .matches;
    // 手機上不主動 focus，避免鍵盤蓋住剛出現的錯誤訊息。
    firstInvalidField.parentElement.scrollIntoView({
      behavior: reduceMotion ? 'auto' : 'smooth',
      block: 'center'
    });
  }

  function setSubmittingState() {
    state.isSubmitting = true;
    page.setSignatureLocked(true);
    elements.submitButton.disabled = true;
    elements.submitButton.setAttribute('aria-busy', 'true');
    elements.submitButton.querySelector('.submit-icon').outerHTML = '<i data-lucide="loader-circle" class="submit-icon button-spinner size-5" aria-hidden="true"></i>';
    elements.submitButton.querySelector('.button-label').textContent = '提交資料中…';
    elements.submissionHint.classList.remove('hidden');
    page.refreshIcons();
    startSubmissionProgress();
  }

  function resetSubmittingState() {
    clearSubmissionProgress();
    state.isSubmitting = false;
    page.setSignatureLocked(false);
    elements.submissionHint.classList.add('hidden');
    elements.submitButton.removeAttribute('aria-busy');
    elements.submitButton.querySelector('.submit-icon').outerHTML = '<i data-lucide="check" class="submit-icon size-5" aria-hidden="true"></i>';
    elements.submitButton.querySelector('.button-label').textContent = '確認並簽署';
    page.updateSubmitState();
    page.refreshIcons();
  }

  function buildContractPayload() {
    const data = {
      ownerName: page.fieldValue('ownerName'),
      ownerPhone: page.fieldValue('ownerPhone'),
      emergencyName: page.fieldValue('emergencyName'),
      emergencyPhone: page.fieldValue('emergencyPhone'),
      ownerEmail: page.fieldValue('ownerEmail'),
      ownerAddress: page.fieldValue('ownerAddress'),
      isOwnerSelf: page.selectedRadioValue('isOwnerSelf'),
      ownerRelation: page.fieldValue('ownerRelation'),
      petName: page.fieldValue('petName'),
      petBreed: page.fieldValue('petBreed'),
      petBreedOther: page.fieldValue('petBreedOther'),
      petSex: page.selectedRadioValue('petSex'),
      petAge: page.fieldValue('petAge'),
      petBirthday: page.fieldValue('petBirthday'),
      neutered: page.selectedRadioValue('neutered'),
      petWeight: page.fieldValue('petWeight'),
      petTemperament: page.checkedValues('petTemperament'),
      petTemperamentNote: page.fieldValue('petTemperamentNote'),
      signDate: elements.signDate.textContent,
      chipHas: page.selectedRadioValue('chipHas'),
      chipNo: page.fieldValue('chipNo'),
      chipIdentifyInfo: page.fieldValue('chipIdentifyInfo'),
      foodAllergy: page.selectedRadioValue('foodAllergy'),
      allergyDetail: page.fieldValue('allergyDetail'),
      treatAllowed: page.selectedRadioValue('treatAllowed'),
      medicalHistory: [
        ...new Set(page.checkedValues('medicalHistory'))
      ],
      medicalNote: page.fieldValue('medicalNote'),
      otherInjuryNote: page.fieldValue('otherInjuryNote'),
      vetMode: page.selectedRadioValue('vetMode'),
      vetName: page.fieldValue('vetName'),
      vetPhone: page.fieldValue('vetPhone'),
      vetAddress: page.fieldValue('vetAddress')
    };

    return {
      data,
      signatureDataUrl: elements.canvas.toDataURL('image/png'),
      contractVersion: '115.04.29-v2',
      contractReadConfirmed: state.hasReadTerms
    };
  }

  function showSuccessDialog(event) {
    clearSubmissionProgress();
    elements.submissionHint.classList.add('hidden');
    const emailSent = event.detail?.result?.emailSent === true;
    const contractNumber = String(
      event.detail?.result?.contractNumber ?? ''
    ).trim();
    elements.successContractNumber.textContent = contractNumber
      ? `契約編號：${contractNumber}`
      : '';
    elements.successContractNumber.classList.toggle(
      'hidden',
      !contractNumber
    );
    elements.successEmail.textContent = elements.emailInput.value.trim();
    elements.successEmailSent.classList.toggle('hidden', !emailSent);
    elements.successEmailFailed.classList.toggle('hidden', emailSent);
    elements.successDialog.classList.remove('hidden');
    elements.successDialog.classList.add('flex');
    window.requestAnimationFrame(
      () => elements.successDialog.classList.add('is-open')
    );
    elements.closeDialogButton.focus();
    elements.submitButton.removeAttribute('aria-busy');
    elements.submitButton.querySelector('.submit-icon').outerHTML = '<i data-lucide="check" class="submit-icon size-5" aria-hidden="true"></i>';
    elements.submitButton.querySelector('.button-label').textContent = '已完成簽署';
    page.refreshIcons();
  }

  function submitContract(event) {
    event.preventDefault();
    page.updatePetAge();
    const emailValid = page.validateEmail({ showError: true });
    const requiredFieldsValid = requiredFields
      .map((field) => {
        return page.validateRequiredField(field, { showError: true });
      })
      .every(Boolean);

    showAgreementError();
    showSignatureError();
    const agreementValid = elements.agreeTerms.checked;
    if (
      !emailValid
      || !requiredFieldsValid
      || !agreementValid
      || !state.hasSignature
    ) {
      scrollToFirstInvalidField();
      return;
    }

    const payload = buildContractPayload();
    setSubmittingState();
    elements.form.dispatchEvent(new CustomEvent('contract:submit', {
      detail: payload,
      bubbles: true
    }));
  }

  function closeSuccessDialog() {
    elements.successDialog.classList.remove('is-open');
    const reduceMotion = window
      .matchMedia('(prefers-reduced-motion: reduce)')
      .matches;
    window.setTimeout(() => {
      elements.successDialog.classList.add('hidden');
      elements.successDialog.classList.remove('flex');
    }, reduceMotion ? 0 : 200);
  }

  function setupSubmission() {
    elements.form.addEventListener('submit', submitContract);
    elements.closeDialogButton.addEventListener('click', closeSuccessDialog);
    window.addEventListener('contract:success', showSuccessDialog);
    window.addEventListener('contract:error', resetSubmittingState);
  }

  function initializeContractPage() {
    page.refreshIcons();
    page.showAppVersion();
    page.setSigningDate();
    page.setupFieldValidation();
    page.setupBirthdayFormatting();
    page.setupMedicalHistoryRules();
    page.setupTemperamentRules();
    page.setupTermsReading();
    page.setupSignaturePad();
    setupSubmission();
  }

  initializeContractPage();
})();
