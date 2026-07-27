(() => {
  'use strict';

  const page = window.ContractPage;
  const { elements } = page;

  function setConditionalRegion(regionId, isOpen) {
    const region = document.querySelector(`#${regionId}`);
    region.dataset.open = String(isOpen);
    region.querySelectorAll('input, select, textarea').forEach((field) => {
      field.disabled = !isOpen;
      if (!isOpen) {
        field.value = '';
        page.clearFieldValidation(field);
      }
    });
  }

  function setupMedicalHistoryRules() {
    const noMedicalHistory = document.querySelector('#noMedicalHistory');
    const medicalConditions = [
      ...elements.form.querySelectorAll('.medical-condition')
    ];

    noMedicalHistory.addEventListener('change', () => {
      if (!noMedicalHistory.checked) return;
      medicalConditions.forEach((condition) => {
        condition.checked = false;
      });
    });

    medicalConditions.forEach((condition) => {
      condition.addEventListener('change', () => {
        if (condition.checked) noMedicalHistory.checked = false;
      });
    });

    const otherInjury = document.querySelector('#otherInjury');
    const syncOtherInjury = () => {
      setConditionalRegion('otherInjuryRegion', otherInjury.checked);
    };
    otherInjury.addEventListener('change', syncOtherInjury);
    syncOtherInjury();
  }

  function setupTemperamentRules() {
    const temperamentChoices = [
      ...elements.form.querySelectorAll('.temperament-choice')
    ];
    temperamentChoices.forEach((choice) => {
      choice.addEventListener('change', () => {
        if (!choice.checked || !choice.dataset.exclusiveGroup) return;
        temperamentChoices.forEach((otherChoice) => {
          const isSameGroup = otherChoice.dataset.exclusiveGroup
            === choice.dataset.exclusiveGroup;
          if (otherChoice !== choice && isSameGroup) {
            otherChoice.checked = false;
          }
        });
      });
    });
  }

  Object.assign(page, {
    setupMedicalHistoryRules,
    setupTemperamentRules
  });
})();
