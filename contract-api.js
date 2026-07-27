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
    submissionId: '',

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
      this.submissionId ||= crypto.randomUUID();
      const submissionPayload = {
        ...payload,
        submissionId: this.submissionId
      };

      try {
        const response = await fetch(contractWebAppUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain;charset=UTF-8'
          },
          body: JSON.stringify(submissionPayload),
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
          detail: { payload: submissionPayload, result }
        }));
      } catch (error) {
        console.error('Contract submission failed', error);
        this.submitError = `送出失敗：${error.message}`;
        window.dispatchEvent(new CustomEvent('contract:error'));
      }
    }
  }));
});
