(() => {
  'use strict';

  const page = window.ContractPage;
  const { elements, requiredFields } = page;

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
    } else if (
      showSuccess
      && field.dataset.hadError === 'true'
      && field.matches('input')
    ) {
      field.classList.add('is-corrected');
    }
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
      isValid = /^\d+(\.\d+)?$/.test(field.value.trim())
        && Number(field.value) > 0;
      message = '請輸入有效的體重，例如 6.5';
    }

    if (showError || field.getAttribute('aria-invalid') === 'true') {
      applyFieldValidation(field, isValid, message, showSuccess);
    }
    return isValid;
  }

  function validateEmail(options = {}) {
    const { showError = false, showSuccess = false } = options;
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      elements.emailInput.value.trim()
    );
    if (showError || !isValid) {
      elements.emailInput.setAttribute('aria-invalid', String(!isValid));
      elements.emailError.classList.toggle('hidden', isValid);
      elements.emailError.classList.toggle('flex', !isValid);

      if (!isValid) {
        elements.emailInput.dataset.hadError = 'true';
        elements.emailInput.classList.remove('is-corrected');
      } else if (
        showSuccess
        && elements.emailInput.dataset.hadError === 'true'
      ) {
        elements.emailInput.classList.add('is-corrected');
      }
    }
    return isValid;
  }

  function setupFieldValidation() {
    requiredFields.forEach((field) => {
      field.addEventListener(
        'focus',
        () => field.classList.remove('is-corrected')
      );
      field.addEventListener('blur', () => {
        validateRequiredField(field, {
          showError: true,
          showSuccess: true
        });
      });
      field.addEventListener('input', () => validateRequiredField(field));
      field.addEventListener('change', () => validateRequiredField(field));
    });

    elements.emailInput.addEventListener(
      'focus',
      () => elements.emailInput.classList.remove('is-corrected')
    );
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
      const digits = elements.birthdayInput.value
        .replace(/\D/g, '')
        .slice(0, 8);
      elements.birthdayInput.value = [
        digits.slice(0, 4),
        digits.slice(4, 6),
        digits.slice(6, 8)
      ]
        .filter(Boolean)
        .join('/');
      updatePetAge();
    });
  }

  Object.assign(page, {
    clearFieldValidation,
    validateRequiredField,
    validateEmail,
    updatePetAge,
    setupFieldValidation,
    setupBirthdayFormatting
  });
})();
