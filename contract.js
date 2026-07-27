const contractWebAppUrl = 'https://script.google.com/macros/s/AKfycbxuzL-UXN2QPNUOAcD0UOJQidodweHdv7gXW88QSN1ip3C1VfzlD8fC7t4n-Hnhe2g2Zg/exec?endpoint=contract-new';

document.addEventListener('alpine:init', () => {
  window.Alpine.data('contractApp', () => ({
    isOwnerSelf: '是',
    ownerRelation: '',
    petBreed: '',
    petBreedOther: '',
    chipHas: '有',
    chipNo: '',
    chipIdentifyInfo: '',
    foodAllergy: '無',
    allergyDetail: '',
    vetMode: '乙方指定',
    vetName: '',
    vetPhone: '',
    vetAddress: '',
    submitError: '',

    init() {
      this.$watch('isOwnerSelf', (value) => {
        if (value === '是') this.ownerRelation = '';
      });
      this.$watch('petBreed', (value) => {
        if (value !== '其他') this.petBreedOther = '';
      });
      this.$watch('chipHas', (value) => {
        if (value === '有') {
          this.chipIdentifyInfo = '';
        } else {
          this.chipNo = '';
        }
      });
      this.$watch('foodAllergy', (value) => {
        if (value === '無') this.allergyDetail = '';
      });
      this.$watch('vetMode', (value) => {
        if (value !== '甲方指定') {
          this.vetName = '';
          this.vetPhone = '';
          this.vetAddress = '';
        }
      });
    },

    async submitContract(payload) {
      this.submitError = '';

      try {
        const response = await fetch(contractWebAppUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain;charset=UTF-8'
          },
          body: JSON.stringify(payload),
          redirect: 'follow'
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        let result;
        try {
          result = JSON.parse(await response.text());
        } catch {
          throw new Error('伺服器回應格式錯誤');
        }

        if (result.success === false) {
          throw new Error(result.message || '契約建立失敗');
        }

        window.dispatchEvent(new CustomEvent('contract:success', {
          detail: { payload, result }
        }));
      } catch (error) {
        console.error('Contract submission failed', error);
        this.submitError = `送出失敗：${error.message}`;
        window.dispatchEvent(new CustomEvent('contract:error'));
      }
    }
  }));
});

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
    successDialog: document.querySelector('#successDialog'),
    successEmail: document.querySelector('#successEmail'),
    successEmailSent: document.querySelector('#successEmailSent'),
    successEmailFailed: document.querySelector('#successEmailFailed'),
    closeDialogButton: document.querySelector('#closeDialog'),
    signDate: document.querySelector('#signDate')
  };

  const requiredFields = [...elements.form.querySelectorAll('[data-required]')];
  const canvasContext = elements.canvas.getContext('2d');
  const state = {
    isDrawing: false,
    hasSignature: false,
    hasReadTerms: false,
    isSubmitting: false,
    previousCanvasWidth: 0,
    previousPointerPoint: null,
    smoothedLineWidth: 2.4
  };

  function refreshIcons() {
    window.lucide.createIcons();
  }

  function setSigningDate() {
    // 畫面使用本地日期；正式提交時間仍應由伺服器保存。
    elements.signDate.textContent = new Intl.DateTimeFormat('zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(new Date());
  }

  // 表單驗證
  function errorElementFor(field) {
    return elements.form.querySelector(`[data-error-for="${field.id}"]`);
  }

  function clearFieldValidation(field) {
    field.removeAttribute('aria-invalid');
    field.classList.remove('is-corrected');
    errorElementFor(field)?.classList.add('hidden');
  }

  function applyFieldValidation(field, isValid, message, showSuccess) {
    const errorElement = errorElementFor(field);
    field.setAttribute('aria-invalid', String(!isValid));

    if (errorElement) {
      errorElement.textContent = isValid ? '' : message;
      errorElement.classList.toggle('hidden', isValid);
    }

    if (!isValid) {
      field.dataset.hadError = 'true';
      field.classList.remove('is-corrected');
    } else if (showSuccess && field.dataset.hadError === 'true' && field.matches('input')) {
      field.classList.add('is-corrected');
    }
  }

  function validateRequiredField(field, options = {}) {
    const { showError = false, showSuccess = false } = options;
    if (field.disabled) {
      clearFieldValidation(field);
      return true;
    }

    let isValid = field.value.trim() !== '';
    let message = `請填寫${field.dataset.label}`;

    if (isValid && field.id === 'petBirthday') {
      isValid = calculateAge(field.value) !== null;
      message = '請輸入有效且非未來的生日';
    }

    if (isValid && field.id === 'petWeight') {
      isValid = /^\d+(\.\d+)?$/.test(field.value.trim()) && Number(field.value) > 0;
      message = '請輸入有效的體重，例如 6.5';
    }

    if (showError || field.getAttribute('aria-invalid') === 'true') {
      applyFieldValidation(field, isValid, message, showSuccess);
    }
    return isValid;
  }

  function validateEmail(options = {}) {
    const { showError = false, showSuccess = false } = options;
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(elements.emailInput.value.trim());
    if (showError || !isValid) {
      elements.emailInput.setAttribute('aria-invalid', String(!isValid));
      elements.emailError.classList.toggle('hidden', isValid);
      elements.emailError.classList.toggle('flex', !isValid);

      if (!isValid) {
        elements.emailInput.dataset.hadError = 'true';
        elements.emailInput.classList.remove('is-corrected');
      } else if (showSuccess && elements.emailInput.dataset.hadError === 'true') {
        elements.emailInput.classList.add('is-corrected');
      }
    }
    return isValid;
  }

  function setupFieldValidation() {
    requiredFields.forEach((field) => {
      field.addEventListener('focus', () => field.classList.remove('is-corrected'));
      field.addEventListener('blur', () => {
        validateRequiredField(field, { showError: true, showSuccess: true });
      });
      field.addEventListener('input', () => validateRequiredField(field));
      field.addEventListener('change', () => validateRequiredField(field));
    });

    elements.emailInput.addEventListener('focus', () => elements.emailInput.classList.remove('is-corrected'));
    elements.emailInput.addEventListener('blur', () => {
      validateEmail({ showError: true, showSuccess: true });
    });
    elements.emailInput.addEventListener('input', () => {
      if (elements.emailInput.getAttribute('aria-invalid') === 'true') {
        validateEmail({ showError: true });
      }
    });
  }

  function setupBirthdayFormatting() {
    elements.birthdayInput.addEventListener('input', () => {
      const digits = elements.birthdayInput.value.replace(/\D/g, '').slice(0, 8);
      elements.birthdayInput.value = [digits.slice(0, 4), digits.slice(4, 6), digits.slice(6, 8)]
        .filter(Boolean)
        .join('/');
      updatePetAge();
    });
  }

  function calculateAge(value) {
    const match = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(value.trim());
    if (!match) return null;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const birthday = new Date(year, month - 1, day);
    const today = new Date();
    const isRealDate = birthday.getFullYear() === year
      && birthday.getMonth() === month - 1
      && birthday.getDate() === day;
    if (!isRealDate || birthday > today) return null;

    let age = today.getFullYear() - year;
    const hasNotHadBirthday = today.getMonth() < month - 1
      || (today.getMonth() === month - 1 && today.getDate() < day);
    if (hasNotHadBirthday) age -= 1;
    return age;
  }

  function updatePetAge() {
    const age = calculateAge(elements.birthdayInput.value);
    elements.ageInput.value = age === null ? '' : `${age}歲`;
  }

  // 條件欄位與互斥選項
  function selectedRadioValue(name) {
    return elements.form.querySelector(`input[name="${name}"]:checked`)?.value;
  }

  function setConditionalRegion(regionId, isOpen) {
    const region = document.querySelector(`#${regionId}`);
    region.dataset.open = String(isOpen);
    region.querySelectorAll('input, select, textarea').forEach((field) => {
      field.disabled = !isOpen;
      if (!isOpen) {
        field.value = '';
        clearFieldValidation(field);
      }
    });
  }

  function setupMedicalHistoryRules() {
    const noMedicalHistory = document.querySelector('#noMedicalHistory');
    const medicalConditions = [...elements.form.querySelectorAll('.medical-condition')];

    noMedicalHistory.addEventListener('change', () => {
      if (!noMedicalHistory.checked) return;
      medicalConditions.forEach((condition) => { condition.checked = false; });
    });

    medicalConditions.forEach((condition) => {
      condition.addEventListener('change', () => {
        if (condition.checked) noMedicalHistory.checked = false;
      });
    });

    const otherInjury = document.querySelector('#otherInjury');
    const syncOtherInjury = () => setConditionalRegion('otherInjuryRegion', otherInjury.checked);
    otherInjury.addEventListener('change', syncOtherInjury);
    syncOtherInjury();
  }

  function setupTemperamentRules() {
    const temperamentChoices = [...elements.form.querySelectorAll('.temperament-choice')];
    temperamentChoices.forEach((choice) => {
      choice.addEventListener('change', () => {
        if (!choice.checked || !choice.dataset.exclusiveGroup) return;
        temperamentChoices.forEach((otherChoice) => {
          if (otherChoice !== choice && otherChoice.dataset.exclusiveGroup === choice.dataset.exclusiveGroup) {
            otherChoice.checked = false;
          }
        });
      });
    });
  }

  // 契約閱讀確認
  function updateSubmitState() {
    elements.submitButton.disabled = !state.hasReadTerms || state.isSubmitting;
  }

  function confirmTermsRead() {
    if (state.hasReadTerms) return;
    state.hasReadTerms = true;
    elements.agreeTerms.disabled = false;
    elements.agreeLabel.dataset.ready = 'true';
    elements.readProgress.classList.add('is-complete');
    elements.readProgress.innerHTML = '<i data-lucide="circle-check" class="size-4" aria-hidden="true"></i>條款已閱讀完畢';
    elements.agreeTerms.checked = true;
    elements.agreeTerms.dispatchEvent(new Event('change', { bubbles: true }));
    refreshIcons();
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
      updateSubmitState();
    });
  }

  // 簽名板
  function configureCanvasContext() {
    const ratio = window.devicePixelRatio || 1;
    canvasContext.setTransform(ratio, 0, 0, ratio, 0, 0);
    canvasContext.lineWidth = 2.4;
    canvasContext.lineCap = 'round';
    canvasContext.lineJoin = 'round';
    canvasContext.strokeStyle = '#40312E';
  }

  function resizeCanvas() {
    const bounds = elements.canvas.getBoundingClientRect();
    if (Math.round(bounds.width) === state.previousCanvasWidth) return;

    const signatureBackup = state.hasSignature ? elements.canvas.toDataURL('image/png') : null;
    state.previousCanvasWidth = Math.round(bounds.width);
    const ratio = window.devicePixelRatio || 1;
    elements.canvas.width = Math.round(bounds.width * ratio);
    elements.canvas.height = Math.round(bounds.height * ratio);
    configureCanvasContext();

    if (signatureBackup) {
      const signatureImage = new Image();
      signatureImage.onload = () => canvasContext.drawImage(signatureImage, 0, 0, bounds.width, bounds.height);
      signatureImage.src = signatureBackup;
    }
  }

  function pointerPosition(event) {
    const bounds = elements.canvas.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  }

  function markSignaturePresent() {
    if (state.hasSignature) return;
    state.hasSignature = true;
    elements.signaturePlaceholder.classList.add('hidden');
    elements.clearSignatureButton.classList.remove('hidden');
    elements.clearSignatureButton.classList.add('flex');
    elements.signatureWrap.classList.remove('border-danger');
    elements.signatureError.classList.add('hidden');
    elements.signatureError.classList.remove('flex');
    updateSubmitState();
  }

  function beginSignature(event) {
    state.isDrawing = true;
    elements.canvas.setPointerCapture(event.pointerId);
    const point = pointerPosition(event);
    state.previousPointerPoint = { ...point, time: performance.now() };
    state.smoothedLineWidth = 2.4;
    canvasContext.beginPath();
    canvasContext.moveTo(point.x, point.y);
  }

  function drawSignature(event) {
    if (!state.isDrawing) return;
    const point = pointerPosition(event);
    const currentTime = performance.now();

    if (state.previousPointerPoint) {
      const distance = Math.hypot(
        point.x - state.previousPointerPoint.x,
        point.y - state.previousPointerPoint.y
      );
      const elapsedTime = Math.max(currentTime - state.previousPointerPoint.time, 1);
      const velocity = distance / elapsedTime;
      const targetLineWidth = Math.max(1.35, Math.min(3.4, 3.4 - velocity * 1.8));
      state.smoothedLineWidth = state.smoothedLineWidth * .7 + targetLineWidth * .3;
      canvasContext.lineWidth = state.smoothedLineWidth;
    }

    canvasContext.lineTo(point.x, point.y);
    canvasContext.stroke();
    state.previousPointerPoint = { ...point, time: currentTime };
    markSignaturePresent();
  }

  function endSignature() {
    state.isDrawing = false;
    state.previousPointerPoint = null;
  }

  function clearSignature() {
    canvasContext.save();
    canvasContext.setTransform(1, 0, 0, 1, 0, 0);
    canvasContext.clearRect(0, 0, elements.canvas.width, elements.canvas.height);
    canvasContext.restore();
    state.hasSignature = false;
    elements.signaturePlaceholder.classList.remove('hidden');
    elements.clearSignatureButton.classList.add('hidden');
    elements.clearSignatureButton.classList.remove('flex');
    updateSubmitState();
  }

  function setupSignaturePad() {
    elements.canvas.addEventListener('pointerdown', beginSignature);
    elements.canvas.addEventListener('pointermove', drawSignature);
    ['pointerup', 'pointercancel', 'pointerleave'].forEach((eventName) => {
      elements.canvas.addEventListener(eventName, endSignature);
    });
    elements.clearSignatureButton.addEventListener('click', clearSignature);
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
  }

  // 送出與成功回饋
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
    const firstInvalidField = elements.form.querySelector('[aria-invalid="true"]');
    if (!firstInvalidField) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // 手機上不主動 focus，避免鍵盤蓋住剛出現的錯誤訊息。
    firstInvalidField.parentElement.scrollIntoView({
      behavior: reduceMotion ? 'auto' : 'smooth',
      block: 'center'
    });
  }

  function setSubmittingState() {
    state.isSubmitting = true;
    elements.submitButton.disabled = true;
    elements.submitButton.setAttribute('aria-busy', 'true');
    elements.submitButton.querySelector('.submit-icon').outerHTML = '<i data-lucide="loader-circle" class="submit-icon button-spinner size-5" aria-hidden="true"></i>';
    elements.submitButton.querySelector('.button-label').textContent = '安全送出中…';
    refreshIcons();
  }

  function resetSubmittingState() {
    state.isSubmitting = false;
    elements.submitButton.removeAttribute('aria-busy');
    elements.submitButton.querySelector('.submit-icon').outerHTML = '<i data-lucide="check" class="submit-icon size-5" aria-hidden="true"></i>';
    elements.submitButton.querySelector('.button-label').textContent = '確認並簽署';
    updateSubmitState();
    refreshIcons();
  }

  function checkedValues(name) {
    return [...elements.form.querySelectorAll(`input[name="${name}"]:checked`)]
      .map((field) => field.value);
  }

  function fieldValue(id) {
    return document.querySelector(`#${id}`)?.value.trim() ?? '';
  }

  function buildContractPayload() {
    const data = {
      ownerName: fieldValue('ownerName'),
      ownerPhone: fieldValue('ownerPhone'),
      emergencyName: fieldValue('emergencyName'),
      emergencyPhone: fieldValue('emergencyPhone'),
      ownerEmail: fieldValue('ownerEmail'),
      ownerAddress: fieldValue('ownerAddress'),
      isOwnerSelf: selectedRadioValue('isOwnerSelf'),
      ownerRelation: fieldValue('ownerRelation'),
      petName: fieldValue('petName'),
      petBreed: fieldValue('petBreed'),
      petBreedOther: fieldValue('petBreedOther'),
      petSex: selectedRadioValue('petSex'),
      petAge: fieldValue('petAge'),
      petBirthday: fieldValue('petBirthday'),
      neutered: selectedRadioValue('neutered'),
      petWeight: fieldValue('petWeight'),
      petTemperament: checkedValues('petTemperament'),
      petTemperamentNote: fieldValue('petTemperamentNote'),
      signDate: elements.signDate.textContent,
      chipHas: selectedRadioValue('chipHas'),
      chipNo: fieldValue('chipNo'),
      chipIdentifyInfo: fieldValue('chipIdentifyInfo'),
      foodAllergy: selectedRadioValue('foodAllergy'),
      allergyDetail: fieldValue('allergyDetail'),
      treatAllowed: selectedRadioValue('treatAllowed'),
      medicalHistory: [...new Set(checkedValues('medicalHistory'))],
      medicalNote: fieldValue('medicalNote'),
      otherInjuryNote: fieldValue('otherInjuryNote'),
      vetMode: selectedRadioValue('vetMode'),
      vetName: fieldValue('vetName'),
      vetPhone: fieldValue('vetPhone'),
      vetAddress: fieldValue('vetAddress')
    };

    return {
      data,
      signatureDataUrl: elements.canvas.toDataURL('image/png'),
      contractVersion: '115.04.29-v2',
      contractReadConfirmed: state.hasReadTerms
    };
  }

  function showSuccessDialog(event) {
    const emailSent = event.detail?.result?.emailSent === true;
    elements.successEmail.textContent = elements.emailInput.value.trim();
    elements.successEmailSent.classList.toggle('hidden', !emailSent);
    elements.successEmailFailed.classList.toggle('hidden', emailSent);
    elements.successDialog.classList.remove('hidden');
    elements.successDialog.classList.add('flex');
    window.requestAnimationFrame(() => elements.successDialog.classList.add('is-open'));
    elements.closeDialogButton.focus();
    elements.submitButton.removeAttribute('aria-busy');
    elements.submitButton.querySelector('.submit-icon').outerHTML = '<i data-lucide="check" class="submit-icon size-5" aria-hidden="true"></i>';
    elements.submitButton.querySelector('.button-label').textContent = '已完成簽署';
    refreshIcons();
  }

  function submitContract(event) {
    event.preventDefault();
    updatePetAge();
    const emailValid = validateEmail({ showError: true });
    const requiredFieldsValid = requiredFields
      .map((field) => validateRequiredField(field, { showError: true }))
      .every(Boolean);

    showAgreementError();
    showSignatureError();
    if (!emailValid || !requiredFieldsValid || !elements.agreeTerms.checked || !state.hasSignature) {
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
    const closeDelay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 200;
    window.setTimeout(() => {
      elements.successDialog.classList.add('hidden');
      elements.successDialog.classList.remove('flex');
    }, closeDelay);
  }

  function setupSubmission() {
    elements.form.addEventListener('submit', submitContract);
    elements.closeDialogButton.addEventListener('click', closeSuccessDialog);
    window.addEventListener('contract:success', showSuccessDialog);
    window.addEventListener('contract:error', resetSubmittingState);
  }

  function initializeContractPage() {
    refreshIcons();
    setSigningDate();
    setupFieldValidation();
    setupBirthdayFormatting();
    setupMedicalHistoryRules();
    setupTemperamentRules();
    setupTermsReading();
    setupSignaturePad();
    setupSubmission();
  }

  initializeContractPage();
})();
