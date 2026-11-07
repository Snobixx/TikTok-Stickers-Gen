(function () {
  'use strict';

  let videoInput;
  let dropzone;
  let fileLoadedBar;
  let fileNameDisplay;
  let fileMetaDisplay;
  let removeVideoBtn;
  let sampleVideoBtn;

  let layout3x2Btn;
  let layout2x3Btn;
  let fitCoverBtn;
  let fitContainBtn;
  let zoomSlider;
  let zoomValue;
  let panXSlider;
  let panXValue;
  let panYSlider;
  let panYValue;
  let gapSlider;
  let gapValue;
  let resetTransformBtn;

  let trimStartInput;
  let trimDurationInput;
  let fpsSelect;
  let colorSwatches;
  let generateBtn;

  let stageEmptyState;
  let gridStageViewport;
  let stickersGridDisplay;
  let singleCaseView;
  let singleCaseCanvas;
  let singleCaseCtx;
  let tabFullGrid;
  let tabSingleCase;
  let caseSelectorBtns;

  let playPauseBtn;
  let playPauseIcon;
  let seekSlider;
  let timecodeDisplay;

  let progressModal;
  let progressBarFill;
  let progressPercent;
  let progressStatusText;
  let progressLogs;

  let resultsModal;
  let downloadZipBtn;
  let downloadOverlayMp4DirectBtn;
  let downloadOverlayMp4ModalBtn;
  let closeResultsBtn;
  let individualFilesList;

  let engine;
  let activeVideo;
  let isVideoLoaded = false;
  let currentLayout = '3x2';
  let currentFit = 'cover';
  let currentBgColor = '#000000';
  let activePreviewTab = 'grid';
  let activeCaseIndex = 1;
  let animationFrameId = null;
  let currentZipBlob = null;
  let generatedResults = null;
  let directOverlayMp4Blob = null;
  let directOverlayMp4Extension = 'mp4';
  let previewCanvases = [];

  function init() {
    videoInput = document.getElementById('videoInput');
    dropzone = document.getElementById('uploadDropzone');
    fileLoadedBar = document.getElementById('fileLoadedInfo');
    fileNameDisplay = document.getElementById('fileNameDisplay');
    fileMetaDisplay = document.getElementById('fileMetaDisplay');
    removeVideoBtn = document.getElementById('removeVideoBtn');
    sampleVideoBtn = document.getElementById('sampleVideoBtn');

    layout3x2Btn = document.getElementById('layout3x2Btn');
    layout2x3Btn = document.getElementById('layout2x3Btn');
    fitCoverBtn = document.getElementById('fitCoverBtn');
    fitContainBtn = document.getElementById('fitContainBtn');
    zoomSlider = document.getElementById('zoomSlider');
    zoomValue = document.getElementById('zoomValue');
    panXSlider = document.getElementById('panXSlider');
    panXValue = document.getElementById('panXValue');
    panYSlider = document.getElementById('panYSlider');
    panYValue = document.getElementById('panYValue');
    gapSlider = document.getElementById('gapSlider');
    gapValue = document.getElementById('gapValue');
    resetTransformBtn = document.getElementById('resetTransformBtn');

    trimStartInput = document.getElementById('trimStartInput');
    trimDurationInput = document.getElementById('trimDurationInput');
    fpsSelect = document.getElementById('fpsSelect');
    colorSwatches = document.querySelectorAll('.color-swatch-btn');
    generateBtn = document.getElementById('generateBtn');

    stageEmptyState = document.getElementById('stageEmptyState');
    gridStageViewport = document.getElementById('gridStageViewport');
    stickersGridDisplay = document.getElementById('stickersGridDisplay');
    singleCaseView = document.getElementById('singleCaseView');
    singleCaseCanvas = document.getElementById('singleCaseCanvas');
    singleCaseCtx = singleCaseCanvas ? singleCaseCanvas.getContext('2d') : null;
    tabFullGrid = document.getElementById('tabFullGrid');
    tabSingleCase = document.getElementById('tabSingleCase');
    caseSelectorBtns = document.querySelectorAll('.case-selector-btn');

    playPauseBtn = document.getElementById('playPauseBtn');
    playPauseIcon = document.getElementById('playPauseIcon');
    seekSlider = document.getElementById('seekSlider');
    timecodeDisplay = document.getElementById('timecodeDisplay');

    progressModal = document.getElementById('progressModal');
    progressBarFill = document.getElementById('progressBarFill');
    progressPercent = document.getElementById('progressPercent');
    progressStatusText = document.getElementById('progressStatusText');
    progressLogs = document.getElementById('progressLogs');

    resultsModal = document.getElementById('resultsModal');
    downloadZipBtn = document.getElementById('downloadZipBtn');
    downloadOverlayMp4DirectBtn = document.getElementById('downloadOverlayMp4DirectBtn');
    downloadOverlayMp4ModalBtn = document.getElementById('downloadOverlayMp4ModalBtn');
    [downloadOverlayMp4DirectBtn, downloadOverlayMp4ModalBtn].forEach((button) => {
      if (button) button.dataset.defaultLabel = button.textContent.trim();
    });
    closeResultsBtn = document.getElementById('closeResultsBtn');
    individualFilesList = document.getElementById('individualFilesList');

    activeVideo = document.getElementById('activeVideoPlayer');
    if (!activeVideo) {
      activeVideo = document.createElement('video');
      activeVideo.id = 'activeVideoPlayer';
      activeVideo.playsInline = true;
      activeVideo.muted = true;
      activeVideo.loop = true;
      activeVideo.style.cssText = 'position:fixed; top:0; left:0; width:1px; height:1px; opacity:0.001; pointer-events:none; z-index:-100;';
      document.body.appendChild(activeVideo);
    }

    if (window.VideoGridEngine) {
      engine = new window.VideoGridEngine();
    }

    setupPreviewCanvases();
    setupEventListeners();
    updateWebCodecsBadge();
  }

  function updateWebCodecsBadge() {
    const badge = document.getElementById('gpuStatusBadge');
    if (badge) {
      if (typeof window.VideoEncoder !== 'undefined') {
        badge.innerHTML = `<span class="pulse-dot"></span> WebCodecs GPU : Activé`;
      } else {
        badge.innerHTML = `<span style="color:#f59e0b">●</span> Mode CPU / Canvas`;
        badge.style.color = '#f59e0b';
        badge.style.borderColor = 'rgba(245, 158, 11, 0.3)';
        badge.style.background = 'rgba(245, 158, 11, 0.1)';
      }
    }
  }

  function setupPreviewCanvases() {
    if (!stickersGridDisplay) return;
    stickersGridDisplay.innerHTML = '';
    stickersGridDisplay.style.gap = '24px';
    previewCanvases = [];

    for (let i = 1; i <= 6; i++) {
      const cellEl = document.createElement('div');
      cellEl.className = 'sticker-square-cell';
      cellEl.dataset.caseIndex = i;

      const badge = document.createElement('span');
      badge.className = 'square-badge-label';
      badge.textContent = `Case #${i} (354×354)`;
      cellEl.appendChild(badge);

      const canvas = document.createElement('canvas');
      canvas.width = 354;
      canvas.height = 354;
      cellEl.appendChild(canvas);

      cellEl.addEventListener('click', () => {
        selectSingleCase(i);
        switchPreviewTab('single');
      });

      stickersGridDisplay.appendChild(cellEl);

      previewCanvases.push({
        element: cellEl,
        canvas: canvas,
        ctx: canvas.getContext('2d')
      });
    }
  }

  function setupEventListeners() {
    if (videoInput) {
      videoInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
          handleFileSelected(e.target.files[0]);
        }
      });
    }

    if (dropzone) {
      ['dragenter', 'dragover'].forEach((eventName) => {
        dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropzone.classList.add('drag-active');
        });
      });

      ['dragleave', 'drop'].forEach((eventName) => {
        dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropzone.classList.remove('drag-active');
        });
      });

      dropzone.addEventListener('drop', (e) => {
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          handleFileSelected(e.dataTransfer.files[0]);
        }
      });
    }

    if (removeVideoBtn) {
      removeVideoBtn.addEventListener('click', unloadVideo);
    }

    if (sampleVideoBtn) {
      sampleVideoBtn.addEventListener('click', loadSampleDemoVideo);
    }

    if (layout3x2Btn) layout3x2Btn.addEventListener('click', () => setLayout('3x2'));
    if (layout2x3Btn) layout2x3Btn.addEventListener('click', () => setLayout('2x3'));

    if (fitCoverBtn) fitCoverBtn.addEventListener('click', () => setFitMode('cover'));
    if (fitContainBtn) fitContainBtn.addEventListener('click', () => setFitMode('contain'));

    if (zoomSlider) {
      zoomSlider.addEventListener('input', (e) => {
        if (zoomValue) zoomValue.textContent = `${parseFloat(e.target.value).toFixed(1)}x`;
        renderPreview();
      });
    }

    if (panXSlider) {
      panXSlider.addEventListener('input', (e) => {
        if (panXValue) panXValue.textContent = `${e.target.value}px`;
        renderPreview();
      });
    }

    if (panYSlider) {
      panYSlider.addEventListener('input', (e) => {
        if (panYValue) panYValue.textContent = `${e.target.value}px`;
        renderPreview();
      });
    }

    if (gapSlider) {
      gapSlider.addEventListener('input', (e) => {
        if (gapValue) gapValue.textContent = `${e.target.value}px`;
        if (stickersGridDisplay) stickersGridDisplay.style.gap = `${e.target.value}px`;
        renderPreview();
      });
    }

    if (resetTransformBtn) {
      resetTransformBtn.addEventListener('click', () => {
        if (zoomSlider) zoomSlider.value = 1.0;
        if (zoomValue) zoomValue.textContent = '1.0x';
        if (panXSlider) panXSlider.value = 0;
        if (panXValue) panXValue.textContent = '0px';
        if (panYSlider) panYSlider.value = 0;
        if (panYValue) panYValue.textContent = '0px';
        if (gapSlider) gapSlider.value = 24;
        if (gapValue) gapValue.textContent = '24px';
        if (stickersGridDisplay) stickersGridDisplay.style.gap = '24px';
        renderPreview();
      });
    }

    if (colorSwatches) {
      colorSwatches.forEach((btn) => {
        btn.addEventListener('click', () => {
          colorSwatches.forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          currentBgColor = btn.dataset.hex;
          renderPreview();
        });
      });
    }

    if (tabFullGrid) tabFullGrid.addEventListener('click', () => switchPreviewTab('grid'));
    if (tabSingleCase) tabSingleCase.addEventListener('click', () => switchPreviewTab('single'));

    if (caseSelectorBtns) {
      caseSelectorBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
          selectSingleCase(parseInt(btn.dataset.case, 10));
        });
      });
    }

    if (playPauseBtn) playPauseBtn.addEventListener('click', togglePlayPause);
    if (seekSlider) {
      seekSlider.addEventListener('input', (e) => {
        if (activeVideo && isVideoLoaded) {
          activeVideo.currentTime = parseFloat(e.target.value);
          updateTimecode();
          renderPreview();
        }
      });
    }

    if (activeVideo) {
      activeVideo.addEventListener('timeupdate', () => {
        if (seekSlider && !seekSlider.matches(':active')) {
          seekSlider.value = activeVideo.currentTime;
          updateTimecode();
        }
      });

      activeVideo.addEventListener('play', () => {
        updatePlayIcon(true);
        startRenderLoop();
      });

      activeVideo.addEventListener('pause', () => {
        updatePlayIcon(false);
        stopRenderLoop();
        renderPreview();
      });
    }

    const setStartCurrentBtn = document.getElementById('setStartCurrentBtn');
    if (setStartCurrentBtn) {
      setStartCurrentBtn.addEventListener('click', () => {
        if (activeVideo && isVideoLoaded && trimStartInput) {
          trimStartInput.value = activeVideo.currentTime.toFixed(1);
        }
      });
    }

    const presetBtns = document.querySelectorAll('.preset-duration-btn');
    presetBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        if (trimDurationInput) trimDurationInput.value = btn.dataset.sec;
      });
    });

    if (generateBtn) generateBtn.addEventListener('click', startGenerationProcess);

    if (downloadOverlayMp4DirectBtn) {
      downloadOverlayMp4DirectBtn.addEventListener('click', () => handleOverlayMp4Download(downloadOverlayMp4DirectBtn));
    }

    if (downloadOverlayMp4ModalBtn) {
      downloadOverlayMp4ModalBtn.addEventListener('click', () => {
        handleOverlayMp4Download(downloadOverlayMp4ModalBtn);
      });
    }

    if (downloadZipBtn) {
      downloadZipBtn.addEventListener('click', () => {
        if (currentZipBlob) {
          downloadBlob(currentZipBlob, `TikTok_Stickers_${currentLayout}_Pack.zip`);
        }
      });
    }

    if (closeResultsBtn && resultsModal) {
      closeResultsBtn.addEventListener('click', () => {
        resultsModal.style.display = 'none';
      });
    }

    setupDragToPan();
  }

  function handleFileSelected(file) {
    if (!file) return;

    const isVideo = (file.type && file.type.startsWith('video/')) ||
                    /\.(mp4|webm|mov|mkv|m4v|avi|ogv)$/i.test(file.name);

    if (!isVideo) {
      alert(`Veuillez sélectionner un fichier vidéo valide (MP4, WEBM, MOV).\nFichier sélectionné : ${file.name}`);
      return;
    }

    try {
      const fileUrl = URL.createObjectURL(file);
      loadVideoSource(fileUrl, file.name, file.size);
    } catch (err) {
      alert('Erreur lors de la lecture du fichier : ' + err.message);
    }
  }

  function loadVideoSource(url, name, sizeInBytes) {
    isVideoLoaded = false;
    currentZipBlob = null;
    generatedResults = null;
    directOverlayMp4Blob = null;
    directOverlayMp4Extension = 'mp4';
    if (generateBtn) generateBtn.disabled = true;
    if (downloadOverlayMp4DirectBtn) downloadOverlayMp4DirectBtn.disabled = true;
    if (downloadOverlayMp4ModalBtn) downloadOverlayMp4ModalBtn.disabled = true;
    setDownloadButtonLabel(downloadOverlayMp4DirectBtn, downloadOverlayMp4DirectBtn && downloadOverlayMp4DirectBtn.dataset.defaultLabel);
    setDownloadButtonLabel(downloadOverlayMp4ModalBtn, downloadOverlayMp4ModalBtn && downloadOverlayMp4ModalBtn.dataset.defaultLabel);

    activeVideo.pause();

    const onMetadata = () => {
      cleanup();
      setupVideoState(name, sizeInBytes);
    };

    const onError = (e) => {
      cleanup();
      const code = activeVideo.error ? activeVideo.error.code : 'inconnu';
      alert(`Impossible de lire cette vidéo (Code erreur: ${code}).\nAssurez-vous qu'il s'agit d'une vidéo MP4/WebM lisible par votre navigateur.`);
    };

    const cleanup = () => {
      activeVideo.removeEventListener('loadedmetadata', onMetadata);
      activeVideo.removeEventListener('loadeddata', onMetadata);
      activeVideo.removeEventListener('error', onError);
    };

    activeVideo.addEventListener('loadedmetadata', onMetadata, { once: true });
    activeVideo.addEventListener('loadeddata', onMetadata, { once: true });
    activeVideo.addEventListener('error', onError, { once: true });

    activeVideo.src = url;
    activeVideo.load();
  }

  function setupVideoState(name, sizeInBytes) {
    isVideoLoaded = true;

    if (dropzone) dropzone.style.display = 'none';
    if (fileLoadedBar) fileLoadedBar.style.display = 'flex';
    if (fileNameDisplay) fileNameDisplay.textContent = name;

    const duration = activeVideo.duration || 0;
    const durationStr = duration.toFixed(1);
    const sizeStr = sizeInBytes ? (sizeInBytes / (1024 * 1024)).toFixed(1) + ' MB' : '';
    if (fileMetaDisplay) {
      fileMetaDisplay.textContent = `${activeVideo.videoWidth}×${activeVideo.videoHeight}px • ${durationStr}s ${sizeStr ? '• ' + sizeStr : ''}`;
    }

    if (trimStartInput) trimStartInput.value = '0';
    if (trimDurationInput) trimDurationInput.value = Math.min(3.0, duration || 3.0).toFixed(1);
    if (seekSlider) {
      seekSlider.max = duration || 10;
      seekSlider.value = 0;
    }

    if (stageEmptyState) stageEmptyState.style.display = 'none';
    if (gridStageViewport) gridStageViewport.style.display = 'block';

    if (generateBtn) generateBtn.disabled = false;
    if (downloadOverlayMp4DirectBtn) downloadOverlayMp4DirectBtn.disabled = false;

    const playPromise = activeVideo.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        startRenderLoop();
      }).catch(() => {
        renderPreview();
      });
    }

    setLayout(currentLayout);
  }

  function unloadVideo() {
    if (activeVideo) {
      activeVideo.pause();
      activeVideo.src = '';
    }
    isVideoLoaded = false;

    if (fileLoadedBar) fileLoadedBar.style.display = 'none';
    if (dropzone) dropzone.style.display = 'block';
    if (videoInput) videoInput.value = '';

    if (stageEmptyState) stageEmptyState.style.display = 'block';
    if (gridStageViewport) gridStageViewport.style.display = 'none';
    if (singleCaseView) singleCaseView.style.display = 'none';
    if (generateBtn) generateBtn.disabled = true;
    if (downloadOverlayMp4DirectBtn) downloadOverlayMp4DirectBtn.disabled = true;

    stopRenderLoop();
  }

  function loadSampleDemoVideo() {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d');

    const stream = canvas.captureStream(30);
    let mimeType = 'video/webm';
    if (MediaRecorder.isTypeSupported('video/mp4')) {
      mimeType = 'video/mp4';
    }

    const recorder = new MediaRecorder(stream, { mimeType });
    const chunks = [];

    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      loadVideoSource(URL.createObjectURL(blob), 'demo_sample_tiktok.mp4', blob.size);
    };

    recorder.start();

    let frame = 0;
    const totalFrames = 90;

    function drawSynthFrame() {
      ctx.fillStyle = '#090a10';
      ctx.fillRect(0, 0, 1080, 1080);

      const angle = (frame / totalFrames) * Math.PI * 2;
      const grad = ctx.createRadialGradient(
        540 + Math.cos(angle) * 200,
        540 + Math.sin(angle) * 200,
        50,
        540,
        540,
        600
      );
      grad.addColorStop(0, '#38bdf8');
      grad.addColorStop(0.5, '#6366f1');
      grad.addColorStop(1, '#090a10');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1080, 1080);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 72px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('TIKTOK STICKERS', 540, 480);

      ctx.font = '500 36px Inter, sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('Grid 6 Carrés • 354×354 r=30px', 540, 560);

      ctx.beginPath();
      ctx.arc(540, 680, 40 + Math.sin(angle * 2) * 15, 0, Math.PI * 2);
      ctx.fillStyle = '#38bdf8';
      ctx.fill();

      frame++;
      if (frame < totalFrames) {
        requestAnimationFrame(drawSynthFrame);
      } else {
        recorder.stop();
      }
    }

    drawSynthFrame();
  }

  function setLayout(mode) {
    currentLayout = mode;
    const layoutTag = document.getElementById('layoutTag');
    if (mode === '3x2') {
      if (layout3x2Btn) layout3x2Btn.classList.add('active');
      if (layout2x3Btn) layout2x3Btn.classList.remove('active');
      if (stickersGridDisplay) {
        stickersGridDisplay.classList.remove('mode-2x3');
        stickersGridDisplay.classList.add('mode-3x2');
      }
      if (layoutTag) layoutTag.textContent = '3 Colonnes × 2 Lignes';
    } else {
      if (layout2x3Btn) layout2x3Btn.classList.add('active');
      if (layout3x2Btn) layout3x2Btn.classList.remove('active');
      if (stickersGridDisplay) {
        stickersGridDisplay.classList.remove('mode-3x2');
        stickersGridDisplay.classList.add('mode-2x3');
      }
      if (layoutTag) layoutTag.textContent = '2 Colonnes × 3 Lignes';
    }
    renderPreview();
  }

  function setFitMode(mode) {
    currentFit = mode;
    if (mode === 'cover') {
      if (fitCoverBtn) fitCoverBtn.classList.add('active');
      if (fitContainBtn) fitContainBtn.classList.remove('active');
    } else {
      if (fitContainBtn) fitContainBtn.classList.add('active');
      if (fitCoverBtn) fitCoverBtn.classList.remove('active');
    }
    renderPreview();
  }

  function switchPreviewTab(tab) {
    activePreviewTab = tab;
    if (tab === 'grid') {
      if (tabFullGrid) tabFullGrid.classList.add('active');
      if (tabSingleCase) tabSingleCase.classList.remove('active');
      if (stickersGridDisplay) stickersGridDisplay.style.display = 'grid';
      if (singleCaseView) singleCaseView.style.display = 'none';
    } else {
      if (tabSingleCase) tabSingleCase.classList.add('active');
      if (tabFullGrid) tabFullGrid.classList.remove('active');
      if (stickersGridDisplay) stickersGridDisplay.style.display = 'none';
      if (singleCaseView) singleCaseView.style.display = 'flex';
    }
    renderPreview();
  }

  function selectSingleCase(caseNum) {
    activeCaseIndex = caseNum;
    if (caseSelectorBtns) {
      caseSelectorBtns.forEach((btn) => {
        if (parseInt(btn.dataset.case, 10) === caseNum) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
    }
    renderPreview();
  }

  function togglePlayPause() {
    if (!isVideoLoaded || !activeVideo) return;
    if (activeVideo.paused) {
      activeVideo.play();
    } else {
      activeVideo.pause();
    }
  }

  function updatePlayIcon(isPlaying) {
    if (!playPauseIcon) return;
    if (isPlaying) {
      playPauseIcon.innerHTML = `<path d="M6 4h4v16H6zM14 4h4v16h-4z"/>`;
    } else {
      playPauseIcon.innerHTML = `<polygon points="5 3 19 12 5 21 5 3"/>`;
    }
  }

  function updateTimecode() {
    if (!timecodeDisplay || !activeVideo) return;
    const current = activeVideo.currentTime.toFixed(1);
    const total = (activeVideo.duration || 0).toFixed(1);
    timecodeDisplay.textContent = `${current}s / ${total}s`;
  }

  function startRenderLoop() {
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    function loop() {
      renderPreview();
      if (activeVideo && !activeVideo.paused && !activeVideo.ended) {
        animationFrameId = requestAnimationFrame(loop);
      }
    }
    animationFrameId = requestAnimationFrame(loop);
  }

  function stopRenderLoop() {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  }

  function renderPreview() {
    if (!isVideoLoaded || !activeVideo || activeVideo.readyState < 2 || !engine) return;

    const gap = gapSlider ? parseInt(gapSlider.value, 10) : 24;
    const zoom = zoomSlider ? parseFloat(zoomSlider.value) : 1.0;
    const panX = panXSlider ? parseInt(panXSlider.value, 10) : 0;
    const panY = panYSlider ? parseInt(panYSlider.value, 10) : 0;

    const gridInfo = engine.getGridDimensions(currentLayout, gap);
    const transform = engine.getVideoTransform(activeVideo, gridInfo.gridWidth, gridInfo.gridHeight, {
      zoom,
      panX,
      panY,
      fitMode: currentFit
    });

    if (activePreviewTab === 'grid') {
      for (let i = 0; i < 6; i++) {
        const cell = gridInfo.cells[i];
        const preview = previewCanvases[i];
        if (preview && preview.ctx) {
          engine.renderCaseFrame(preview.ctx, activeVideo, cell, transform, currentBgColor, false);
        }
      }
    }

    if (activePreviewTab === 'single' && singleCaseCtx) {
      const targetCell = gridInfo.cells[activeCaseIndex - 1];
      if (targetCell) {
        engine.renderCaseFrame(singleCaseCtx, activeVideo, targetCell, transform, currentBgColor, false);
      }
    }
  }

  function setupDragToPan() {
    const stage = document.getElementById('stageWrapper');
    if (!stage) return;

    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let initialPanX = 0;
    let initialPanY = 0;

    function onPointerDown(e) {
      if (!isVideoLoaded) return;
      if (e.target.closest('button') || e.target.closest('input')) return;

      isDragging = true;
      startX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
      startY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
      initialPanX = panXSlider ? parseInt(panXSlider.value, 10) : 0;
      initialPanY = panYSlider ? parseInt(panYSlider.value, 10) : 0;
      stage.style.cursor = 'grabbing';
    }

    function onPointerMove(e) {
      if (!isDragging) return;
      e.preventDefault();

      const currentX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
      const currentY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
      const dx = currentX - startX;
      const dy = currentY - startY;

      const newX = Math.max(-400, Math.min(400, initialPanX + dx));
      const newY = Math.max(-400, Math.min(400, initialPanY + dy));

      if (panXSlider) {
        panXSlider.value = Math.round(newX);
        if (panXValue) panXValue.textContent = `${Math.round(newX)}px`;
      }

      if (panYSlider) {
        panYSlider.value = Math.round(newY);
        if (panYValue) panYValue.textContent = `${Math.round(newY)}px`;
      }

      renderPreview();
    }

    function onPointerUp() {
      if (isDragging) {
        isDragging = false;
        stage.style.cursor = 'default';
      }
    }

    stage.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);

    stage.addEventListener('touchstart', onPointerDown, { passive: true });
    window.addEventListener('touchmove', onPointerMove, { passive: false });
    window.addEventListener('touchend', onPointerUp);
  }

  async function startGenerationProcess() {
    if (!isVideoLoaded || !engine) return;

    if (progressModal) progressModal.style.display = 'flex';
    if (progressLogs) progressLogs.innerHTML = '';
    addLog('Démarrage du processus de découpe TikTok...');

    activeVideo.pause();

    const options = getGenerationOptions();

    try {
      const results = await engine.processAndGeneratePack(activeVideo, options, (progress) => {
        if (progressBarFill) progressBarFill.style.width = `${progress.percent}%`;
        if (progressPercent) progressPercent.textContent = `${progress.percent}%`;
        if (progressStatusText) progressStatusText.textContent = progress.message;
        if (progress.step !== 'encoding' || progress.currentFrame % 10 === 0) {
          addLog(progress.message, progress.step === 'done');
        }
      });

      currentZipBlob = results.zipBlob;
      generatedResults = results;

      setTimeout(() => {
        if (progressModal) progressModal.style.display = 'none';
        showResultsScreen(results);
      }, 600);
    } catch (err) {
      alert('Une erreur est survenue lors de l\'encodage. ' + err.message);
      if (progressModal) progressModal.style.display = 'none';
    }
  }

  function getGenerationOptions() {
    const startTime = trimStartInput ? parseFloat(trimStartInput.value) || 0 : 0;
    const duration = trimDurationInput
      ? Math.min(parseFloat(trimDurationInput.value) || 2.5, (activeVideo.duration || 10) - startTime)
      : 2.5;

    return {
      layoutMode: currentLayout,
      gap: gapSlider ? parseInt(gapSlider.value, 10) : 24,
      zoom: zoomSlider ? parseFloat(zoomSlider.value) || 1.0 : 1.0,
      panX: panXSlider ? parseInt(panXSlider.value, 10) || 0 : 0,
      panY: panYSlider ? parseInt(panYSlider.value, 10) || 0 : 0,
      fitMode: currentFit,
      bgColor: currentBgColor,
      startTime,
      duration,
      fps: fpsSelect ? parseInt(fpsSelect.value, 10) || 20 : 20,
      quality: 'high'
    };
  }

  function handleOverlayMp4Download(button) {
    const blob = (generatedResults && generatedResults.overlayMp4Blob) || directOverlayMp4Blob;
    if (blob) {
      const extension = generatedResults && generatedResults.overlayMp4Blob
        ? 'mp4'
        : directOverlayMp4Extension;
      downloadBlob(blob, `overlay.${extension}`);
      setDownloadButtonLabel(button, button.dataset.defaultLabel);
      return;
    }

    startOverlayMp4Generation(button);
  }

  async function startOverlayMp4Generation(button) {
    if (!isVideoLoaded || !engine || !downloadOverlayMp4DirectBtn) return;

    const wasGenerateBtnDisabled = !generateBtn || generateBtn.disabled;
    downloadOverlayMp4DirectBtn.disabled = true;
    if (downloadOverlayMp4ModalBtn) downloadOverlayMp4ModalBtn.disabled = true;
    if (generateBtn) generateBtn.disabled = true;
    if (progressModal) progressModal.style.display = 'flex';
    if (progressLogs) progressLogs.innerHTML = '';
    addLog('Préparation de la vidéo Full Overlay...');

    activeVideo.pause();

    try {
      const result = await engine.processOverlayOnly(activeVideo, getGenerationOptions(), (progress) => {
        if (progressBarFill) progressBarFill.style.width = `${progress.percent}%`;
        if (progressPercent) progressPercent.textContent = `${progress.percent}%`;
        if (progressStatusText) progressStatusText.textContent = progress.message;
        if (progress.step !== 'encoding' || progress.currentFrame % 10 === 0) {
          addLog(progress.message, progress.step === 'done');
        }
      });

      if (!result.overlayMp4Blob) {
        throw new Error('L’encodage n’a pas produit de fichier MP4.');
      }

      directOverlayMp4Blob = result.overlayMp4Blob;
      directOverlayMp4Extension = result.fileExtension || 'mp4';
      downloadBlob(directOverlayMp4Blob, `overlay.${directOverlayMp4Extension}`);
      const readyLabel = `Télécharger la vidéo ${directOverlayMp4Extension.toUpperCase()} à nouveau`;
      setDownloadButtonLabel(downloadOverlayMp4DirectBtn, readyLabel);
      setDownloadButtonLabel(downloadOverlayMp4ModalBtn, readyLabel);
      if (progressModal) progressModal.style.display = 'none';
    } catch (err) {
      if (progressModal) progressModal.style.display = 'none';
      alert('Impossible de générer la vidéo Full Overlay. ' + err.message);
    } finally {
      downloadOverlayMp4DirectBtn.disabled = !isVideoLoaded;
      if (downloadOverlayMp4ModalBtn) downloadOverlayMp4ModalBtn.disabled = !isVideoLoaded;
      if (generateBtn) generateBtn.disabled = wasGenerateBtnDisabled || !isVideoLoaded;
    }
  }

  function setDownloadButtonLabel(button, label) {
    if (!button) return;
    const textNode = Array.from(button.childNodes).find((node) =>
      node.nodeType === Node.TEXT_NODE && node.textContent.trim()
    );
    if (textNode) {
      textNode.textContent = `\n          ${label}\n        `;
    }
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  function addLog(text, isDone = false) {
    if (!progressLogs) return;
    const entry = document.createElement('div');
    entry.className = `log-entry ${isDone ? 'done' : 'active'}`;
    entry.innerHTML = `<span>›</span> ${text}`;
    progressLogs.appendChild(entry);
    progressLogs.scrollTop = progressLogs.scrollHeight;
  }

  function showResultsScreen(results) {
    if (resultsModal) resultsModal.style.display = 'flex';
    if (downloadOverlayMp4ModalBtn) {
      downloadOverlayMp4ModalBtn.disabled = !isVideoLoaded;
    }
    if (!individualFilesList) return;
    individualFilesList.innerHTML = '';

    const files = [
      { folder: 'full overlay', name: 'overlay.mp4', blob: results.overlayMp4Blob, type: 'mp4' },
      { folder: 'full overlay', name: 'overlay.gif', blob: results.overlayGifBlob, type: 'gif' }
    ];

    for (let i = 1; i <= 6; i++) {
      files.push({
        folder: 'Case par Case',
        name: `case_${i}.mp4`,
        blob: results.caseMp4Blobs[i - 1],
        type: 'mp4'
      });
      files.push({
        folder: 'Case par Case',
        name: `case_${i}.gif`,
        blob: results.caseGifBlobs[i - 1],
        type: 'gif'
      });
    }

    files.forEach((file) => {
      if (!file.blob) return;

      const row = document.createElement('div');
      row.className = 'file-row-item';

      const sizeKb = (file.blob.size / 1024).toFixed(1);

      row.innerHTML = `
        <div class="file-row-name">
          <span class="file-badge-type ${file.type}">${file.type.toUpperCase()}</span>
          <span>${file.folder}/${file.name}</span>
          <span style="color:var(--text-muted); font-size:0.75rem;">(${sizeKb} KB)</span>
        </div>
        <button class="btn-download-single" data-name="${file.name}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Télécharger
        </button>
      `;

      const singleBtn = row.querySelector('.btn-download-single');
      singleBtn.addEventListener('click', () => {
        const url = URL.createObjectURL(file.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      });

      individualFilesList.appendChild(row);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
