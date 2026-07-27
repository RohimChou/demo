(() => {
  'use strict';

  const page = window.ContractPage;
  const { elements, state, canvasContext } = page;

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

    const signatureBackup = state.hasSignature
      ? elements.canvas.toDataURL('image/png')
      : null;
    state.previousCanvasWidth = Math.round(bounds.width);
    const ratio = window.devicePixelRatio || 1;
    elements.canvas.width = Math.round(bounds.width * ratio);
    elements.canvas.height = Math.round(bounds.height * ratio);
    configureCanvasContext();

    if (signatureBackup) {
      const signatureImage = new Image();
      signatureImage.onload = () => {
        canvasContext.drawImage(
          signatureImage,
          0,
          0,
          bounds.width,
          bounds.height
        );
      };
      signatureImage.src = signatureBackup;
    }
  }

  function pointerPosition(event) {
    const bounds = elements.canvas.getBoundingClientRect();
    return {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top
    };
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
    page.updateSubmitState();
  }

  function beginSignature(event) {
    state.isDrawing = true;
    elements.canvas.setPointerCapture(event.pointerId);
    const point = pointerPosition(event);
    state.previousPointerPoint = {
      ...point,
      time: performance.now()
    };
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
      const elapsedTime = Math.max(
        currentTime - state.previousPointerPoint.time,
        1
      );
      const velocity = distance / elapsedTime;
      const targetLineWidth = Math.max(
        1.35,
        Math.min(3.4, 3.4 - velocity * 1.8)
      );
      state.smoothedLineWidth = state.smoothedLineWidth * .7
        + targetLineWidth * .3;
      canvasContext.lineWidth = state.smoothedLineWidth;
    }

    canvasContext.lineTo(point.x, point.y);
    canvasContext.stroke();
    state.previousPointerPoint = {
      ...point,
      time: currentTime
    };
    markSignaturePresent();
  }

  function endSignature() {
    state.isDrawing = false;
    state.previousPointerPoint = null;
  }

  function clearSignature() {
    canvasContext.save();
    canvasContext.setTransform(1, 0, 0, 1, 0, 0);
    canvasContext.clearRect(
      0,
      0,
      elements.canvas.width,
      elements.canvas.height
    );
    canvasContext.restore();
    state.hasSignature = false;
    elements.signaturePlaceholder.classList.remove('hidden');
    elements.clearSignatureButton.classList.add('hidden');
    elements.clearSignatureButton.classList.remove('flex');
    page.updateSubmitState();
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

  page.setupSignaturePad = setupSignaturePad;
})();
