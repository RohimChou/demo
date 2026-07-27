(() => {
  'use strict';

  const elements = {
    form: document.querySelector('#contractForm'),
    birthdayInput: document.querySelector('#petBirthday'),
    ageInput: document.querySelector('#petAge'),
    emailInput: document.querySelector('#ownerEmail'),
    emailError: document.querySelector('#emailError'),
    termsBox: document.querySelector('#termsBox'),
    agreeTerms: document.querySelector('#agreeTerms'),
    agreeLabel: document.querySelector('#agreeLabel'),
    agreeError: document.querySelector('#agreeError'),
    readProgress: document.querySelector('#readProgress'),
    canvas: document.querySelector('#signatureCanvas'),
    signatureWrap: document.querySelector('#signatureWrap'),
    signaturePlaceholder: document.querySelector('#signaturePlaceholder'),
    signatureError: document.querySelector('#signatureError'),
    clearSignatureButton: document.querySelector('#clearSignature'),
    submitButton: document.querySelector('#submitButton'),
    submissionHint: document.querySelector('#submissionHint'),
    appVersion: document.querySelector('#appVersion'),
    successDialog: document.querySelector('#successDialog'),
    successContractNumber: document.querySelector('#successContractNumber'),
    successEmail: document.querySelector('#successEmail'),
    successEmailSent: document.querySelector('#successEmailSent'),
    successEmailFailed: document.querySelector('#successEmailFailed'),
    closeDialogButton: document.querySelector('#closeDialog'),
    signDate: document.querySelector('#signDate')
  };

  const state = {
    isDrawing: false,
    hasSignature: false,
    isSignatureLocked: false,
    hasReadTerms: false,
    isSubmitting: false,
    previousCanvasWidth: 0,
    previousCanvasHeight: 0,
    previousPointerPoint: null,
    smoothedLineWidth: 2.4
  };

  function refreshIcons() {
    window.lucide.createIcons();
  }

  function setSigningDate() {
    // 畫面使用本地日期；正式提交時間仍由伺服器保存。
    elements.signDate.textContent = new Intl.DateTimeFormat('zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(new Date());
  }

  function showAppVersion() {
    const version = document
      .querySelector('meta[name="app-version"]')
      ?.getAttribute('content')
      ?.trim();
    elements.appVersion.textContent = version ? `v${version}` : '';
  }

  function updateSubmitState() {
    elements.submitButton.disabled = !state.hasReadTerms || state.isSubmitting;
  }

  function selectedRadioValue(name) {
    return elements.form.querySelector(`input[name="${name}"]:checked`)?.value;
  }

  function checkedValues(name) {
    return [...elements.form.querySelectorAll(`input[name="${name}"]:checked`)]
      .map((field) => field.value);
  }

  function fieldValue(id) {
    return document.querySelector(`#${id}`)?.value.trim() ?? '';
  }

  window.ContractPage = {
    elements,
    state,
    requiredFields: [...elements.form.querySelectorAll('[data-required]')],
    canvasContext: elements.canvas.getContext('2d'),
    refreshIcons,
    setSigningDate,
    showAppVersion,
    updateSubmitState,
    selectedRadioValue,
    checkedValues,
    fieldValue
  };
})();
