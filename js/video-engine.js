/**
 * TikTok Stickers Grid - Video & Animation Processing Engine
 * Version 100% Autonome & Zero-Dependence (Compatible file://, localhost & GitHub Pages)
 */

// Canvas roundRect polyfill
if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    this.beginPath();
    this.moveTo(x + r, y);
    this.arcTo(x + w, y, x + w, y + h, r);
    this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r);
    this.arcTo(x, y + x, y, r);
    this.closePath();
    return this;
  };
}

/**
 * Pure JavaScript Lightweight GIF89a Encoder
 * Guarantees GIF export works 100% offline, on file:// and without CDN dependencies
 */
class BuiltinGifEncoder {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.frames = [];
  }

  // Quantize RGBA buffer to 256 colors using octree/median-cut approximation
  quantize(rgba) {
    const colorMap = new Map();
    const len = rgba.length;
    // Sample pixels for speed (every 4th pixel if large)
    const step = len > 354 * 354 * 4 * 2 ? 8 : 4;

    for (let i = 0; i < len; i += step * 4) {
      const a = rgba[i + 3];
      if (a < 128) continue; // skip transparent
      // Quantize to 5-5-5 bits for palette reduction
      const r = rgba[i] & 0xf8;
      const g = rgba[i + 1] & 0xf8;
      const b = rgba[i + 2] & 0xf8;
      const key = (r << 10) | (g << 5) | b;
      colorMap.set(key, (colorMap.get(key) || 0) + 1);
    }

    // Sort by popularity and pick top 255 colors
    const sorted = Array.from(colorMap.entries()).sort((a, b) => b[1] - a[1]);
    const palette = [];
    // Index 0 reserved for background/black
    palette.push([0, 0, 0]);

    for (let i = 0; i < Math.min(254, sorted.length); i++) {
      const key = sorted[i][0];
      const r = (key >> 10) & 0xf8;
      const g = (key >> 5) & 0xf8;
      const b = key & 0xf8;
      palette.push([r, g, b]);
    }

    // Fill remaining palette slots up to 256
    while (palette.length < 256) {
      palette.push([0, 0, 0]);
    }

    return palette;
  }

  // Map RGBA image data to 256 palette indices
  applyPalette(rgba, palette) {
    const numPixels = this.width * this.height;
    const indexed = new Uint8Array(numPixels);

    // Fast lookup cache
    const cache = new Map();

    for (let i = 0; i < numPixels; i++) {
      const offset = i * 4;
      const a = rgba[offset + 3];
      if (a < 128) {
        indexed[i] = 0;
        continue;
      }

      const r = rgba[offset];
      const g = rgba[offset + 1];
      const b = rgba[offset + 2];
      const key = ((r & 0xf8) << 10) | ((g & 0xf8) << 5) | (b & 0xf8);

      if (cache.has(key)) {
        indexed[i] = cache.get(key);
      } else {
        let bestIdx = 0;
        let bestDist = Infinity;
        // Euclidean distance search
        for (let p = 0; p < palette.length; p++) {
          const pal = palette[p];
          const dr = r - pal[0];
          const dg = g - pal[1];
          const db = b - pal[2];
          const dist = dr * dr + dg * dg + db * db;
          if (dist < bestDist) {
            bestDist = dist;
            bestIdx = p;
            if (dist === 0) break;
          }
        }
        cache.set(key, bestIdx);
        indexed[i] = bestIdx;
      }
    }

    return indexed;
  }

  addFrame(rgba, delayMs = 50) {
    const palette = this.quantize(rgba);
    const indexed = this.applyPalette(rgba, palette);
    this.frames.push({
      indexed,
      palette,
      delayCs: Math.max(2, Math.round(delayMs / 10)) // in 1/100ths of second
    });
  }

  // Standard GIF LZW compression
  encodeLZW(indexed, minCodeSize) {
    const clearCode = 1 << minCodeSize;
    const eoiCode = clearCode + 1;
    let codeSize = minCodeSize + 1;
    let nextCode = eoiCode + 1;

    const prefixTable = new Int32Array(4096);
    const suffixTable = new Uint8Array(4096);
    prefixTable.fill(-1);

    const outBytes = [];
    let curBits = 0;
    let curVal = 0;

    function writeCode(code) {
      curVal |= code << curBits;
      curBits += codeSize;
      while (curBits >= 8) {
        outBytes.push(curVal & 0xff);
        curVal >>= 8;
        curBits -= 8;
      }
    }

    writeCode(clearCode);

    let prefix = indexed[0];
    for (let i = 1; i < indexed.length; i++) {
      const suffix = indexed[i];
      // Hash lookup for (prefix, suffix)
      let found = -1;
      for (let c = clearCode + 2; c < nextCode; c++) {
        if (prefixTable[c] === prefix && suffixTable[c] === suffix) {
          found = c;
          break;
        }
      }

      if (found !== -1) {
        prefix = found;
      } else {
        writeCode(prefix);
        if (nextCode < 4096) {
          prefixTable[nextCode] = prefix;
          suffixTable[nextCode] = suffix;
          nextCode++;
          if (nextCode >= (1 << codeSize) && codeSize < 12) {
            codeSize++;
          }
        } else {
          // Table full, clear table
          writeCode(clearCode);
          prefixTable.fill(-1);
          codeSize = minCodeSize + 1;
          nextCode = eoiCode + 1;
        }
        prefix = suffix;
      }
    }

    writeCode(prefix);
    writeCode(eoiCode);

    if (curBits > 0) {
      outBytes.push(curVal & 0xff);
    }

    // Packetize into blocks of max 255 bytes
    const blocks = [];
    blocks.push(minCodeSize);

    let pos = 0;
    while (pos < outBytes.length) {
      const blockSize = Math.min(255, outBytes.length - pos);
      blocks.push(blockSize);
      for (let b = 0; b < blockSize; b++) {
        blocks.push(outBytes[pos + b]);
      }
      pos += blockSize;
    }
    blocks.push(0x00); // Block terminator

    return new Uint8Array(blocks);
  }

  finish() {
    const out = [];

    function push16(val) {
      out.push(val & 0xff);
      out.push((val >> 8) & 0xff);
    }

    // 1. Header: GIF89a
    const header = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61];
    out.push(...header);

    // 2. Logical Screen Descriptor
    push16(this.width);
    push16(this.height);
    // Packed: No global color table, 8 bits/pixel
    out.push(0x70); // 0111 0000
    out.push(0x00); // Background color index
    out.push(0x00); // Pixel aspect ratio

    // 3. Netscape 2.0 Loop Extension (Infinite Loop)
    const netscapeExt = [
      0x21, 0xff, 0x0b,
      0x4e, 0x45, 0x54, 0x53, 0x43, 0x41, 0x50, 0x45, 0x32, 0x2e, 0x30, // NETSCAPE2.0
      0x03, 0x01, 0x00, 0x00, 0x00
    ];
    out.push(...netscapeExt);

    // 4. Frames
    for (const frame of this.frames) {
      // Graphic Control Extension
      out.push(0x21, 0xf9, 0x04);
      out.push(0x04); // Disposal: Restore to background (2 << 2)
      push16(frame.delayCs);
      out.push(0x00); // Transparent index (none)
      out.push(0x00); // Block terminator

      // Image Descriptor
      out.push(0x2c); // Separator
      push16(0); // Left
      push16(0); // Top
      push16(this.width);
      push16(this.height);
      out.push(0x87); // Local color table present (1), 256 colors (7)

      // Local Color Table (256 * 3 bytes)
      for (const rgb of frame.palette) {
        out.push(rgb[0], rgb[1], rgb[2]);
      }

      // LZW Image Data
      const lzwData = this.encodeLZW(frame.indexed, 8);
      for (let i = 0; i < lzwData.length; i++) {
        out.push(lzwData[i]);
      }
    }

    // 5. Trailer
    out.push(0x3b);

    return new Uint8Array(out);
  }
}

/**
 * Main Video Grid Engine Class
 */
class VideoGridEngine {
  constructor() {
    this.CASE_SIZE = 354;
    this.CORNER_RADIUS = 30;
    this.Muxer = null;
    this.ArrayBufferTarget = null;
    this.hasWebCodecs = typeof window.VideoEncoder !== 'undefined';
  }

  async init() {
    if (window.Mp4Muxer) {
      this.Muxer = window.Mp4Muxer.Muxer;
      this.ArrayBufferTarget = window.Mp4Muxer.ArrayBufferTarget;
    } else {
      try {
        const muxerModule = await import('https://cdn.jsdelivr.net/npm/mp4-muxer@5.1.4/build/mp4-muxer.mjs');
        this.Muxer = muxerModule.Muxer;
        this.ArrayBufferTarget = muxerModule.ArrayBufferTarget;
      } catch (err) {
        console.warn('mp4-muxer load notice:', err);
      }
    }
  }

  async seekVideo(video, timeInSeconds) {
    return new Promise((resolve) => {
      let resolved = false;
      const onSeeked = () => {
        if (resolved) return;
        resolved = true;
        video.removeEventListener('seeked', onSeeked);
        resolve();
      };
      video.addEventListener('seeked', onSeeked);
      video.currentTime = Math.min(Math.max(0, timeInSeconds), video.duration || 100);

      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          video.removeEventListener('seeked', onSeeked);
          resolve();
        }
      }, 500);
    });
  }

  getGridDimensions(layoutMode, gap = 24) {
    const cols = layoutMode === '2x3' ? 2 : 3;
    const rows = layoutMode === '2x3' ? 3 : 2;
    let gridWidth = cols * this.CASE_SIZE + (cols - 1) * gap;
    let gridHeight = rows * this.CASE_SIZE + (rows - 1) * gap;

    if (gridWidth % 2 !== 0) gridWidth += 1;
    if (gridHeight % 2 !== 0) gridHeight += 1;

    const cells = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        cells.push({
          index: cells.length + 1,
          col: c,
          row: r,
          x: c * (this.CASE_SIZE + gap),
          y: r * (this.CASE_SIZE + gap),
          width: this.CASE_SIZE,
          height: this.CASE_SIZE,
          radius: this.CORNER_RADIUS
        });
      }
    }

    return { cols, rows, gridWidth, gridHeight, cells };
  }

  getVideoTransform(video, gridWidth, gridHeight, options = {}) {
    const {
      zoom = 1.0,
      panX = 0,
      panY = 0,
      fitMode = 'cover'
    } = options;

    const vWidth = video.videoWidth || 1080;
    const vHeight = video.videoHeight || 1920;

    let scale;
    if (fitMode === 'contain') {
      scale = Math.min(gridWidth / vWidth, gridHeight / vHeight) * zoom;
    } else {
      scale = Math.max(gridWidth / vWidth, gridHeight / vHeight) * zoom;
    }

    const drawW = vWidth * scale;
    const drawH = vHeight * scale;
    const drawX = (gridWidth - drawW) / 2 + panX;
    const drawY = (gridHeight - drawH) / 2 + panY;

    return { drawX, drawY, drawW, drawH };
  }

  renderCaseFrame(ctx, video, cell, transform, bgColor = '#000000') {
    const size = this.CASE_SIZE;
    const radius = this.CORNER_RADIUS;

    ctx.clearRect(0, 0, size, size);

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(0, 0, size, size, radius);
    ctx.clip();

    if (bgColor !== 'transparent') {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, size, size);
    } else {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, size, size);
    }

    ctx.drawImage(
      video,
      transform.drawX - cell.x,
      transform.drawY - cell.y,
      transform.drawW,
      transform.drawH
    );

    ctx.restore();
  }

  renderOverlayFrame(ctx, video, gridInfo, transform, bgColor = '#000000') {
    const { gridWidth, gridHeight, cells } = gridInfo;

    ctx.clearRect(0, 0, gridWidth, gridHeight);

    ctx.save();
    ctx.beginPath();
    for (const cell of cells) {
      ctx.roundRect(cell.x, cell.y, cell.width, cell.height, cell.radius);
    }
    ctx.clip();

    if (bgColor !== 'transparent') {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, gridWidth, gridHeight);
    } else {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, gridWidth, gridHeight);
    }

    ctx.drawImage(video, transform.drawX, transform.drawY, transform.drawW, transform.drawH);
    ctx.restore();
  }

  async processAndGeneratePack(videoElement, options, onProgress) {
    await this.init();

    const {
      layoutMode = '3x2',
      gap = 24,
      zoom = 1.0,
      panX = 0,
      panY = 0,
      fitMode = 'cover',
      bgColor = '#000000',
      startTime = 0,
      duration = 2.5,
      fps = 20,
      quality = 'high'
    } = options;

    const gridInfo = this.getGridDimensions(layoutMode, gap);
    const transform = this.getVideoTransform(videoElement, gridInfo.gridWidth, gridInfo.gridHeight, {
      zoom,
      panX,
      panY,
      fitMode
    });

    const totalFrames = Math.max(1, Math.round(duration * fps));
    const frameIntervalUs = Math.round(1_000_000 / fps);
    const frameDelayMs = Math.round(1000 / fps);

    onProgress({
      step: 'init',
      percent: 5,
      message: `Initialisation : ${totalFrames} frames à traiter (${fps} FPS)`
    });

    // 1. Canvases Setup
    const overlayCanvas = document.createElement('canvas');
    overlayCanvas.width = gridInfo.gridWidth;
    overlayCanvas.height = gridInfo.gridHeight;
    const overlayCtx = overlayCanvas.getContext('2d', { willReadFrequently: true });

    const caseCanvases = gridInfo.cells.map(() => {
      const c = document.createElement('canvas');
      c.width = this.CASE_SIZE;
      c.height = this.CASE_SIZE;
      return {
        canvas: c,
        ctx: c.getContext('2d', { willReadFrequently: true })
      };
    });

    // 2. MP4 Setup (WebCodecs)
    const canEncodeMP4 = this.hasWebCodecs && !!this.Muxer;
    let overlayMp4Muxer = null;
    let overlayMp4Encoder = null;
    let caseMp4Muxers = [];
    let caseMp4Encoders = [];

    if (canEncodeMP4) {
      try {
        let avcCodec = 'avc1.42001f';
        if (typeof VideoEncoder.isConfigSupported === 'function') {
          const check1 = await VideoEncoder.isConfigSupported({
            codec: 'avc1.42001f',
            width: this.CASE_SIZE,
            height: this.CASE_SIZE
          });
          if (!check1 || !check1.supported) {
            const check2 = await VideoEncoder.isConfigSupported({
              codec: 'avc1.4d002a',
              width: this.CASE_SIZE,
              height: this.CASE_SIZE
            });
            if (check2 && check2.supported) {
              avcCodec = 'avc1.4d002a';
            } else {
              avcCodec = 'avc1.640028';
            }
          }
        }

        overlayMp4Muxer = new this.Muxer({
          target: new this.ArrayBufferTarget(),
          video: {
            codec: 'avc',
            width: gridInfo.gridWidth,
            height: gridInfo.gridHeight
          },
          fastStart: 'in-memory'
        });

        overlayMp4Encoder = new VideoEncoder({
          output: (chunk, meta) => overlayMp4Muxer.addVideoChunk(chunk, meta),
          error: (e) => console.error('Overlay MP4 Encoder Error:', e)
        });

        overlayMp4Encoder.configure({
          codec: avcCodec,
          width: gridInfo.gridWidth,
          height: gridInfo.gridHeight,
          bitrate: quality === 'high' ? 4_000_000 : 2_500_000,
          framerate: fps
        });

        for (let i = 0; i < 6; i++) {
          const mux = new this.Muxer({
            target: new this.ArrayBufferTarget(),
            video: {
              codec: 'avc',
              width: this.CASE_SIZE,
              height: this.CASE_SIZE
            },
            fastStart: 'in-memory'
          });

          const enc = new VideoEncoder({
            output: (chunk, meta) => mux.addVideoChunk(chunk, meta),
            error: (e) => console.error(`Case ${i + 1} MP4 Encoder Error:`, e)
          });

          enc.configure({
            codec: avcCodec,
            width: this.CASE_SIZE,
            height: this.CASE_SIZE,
            bitrate: quality === 'high' ? 2_000_000 : 1_200_000,
            framerate: fps
          });

          caseMp4Muxers.push(mux);
          caseMp4Encoders.push(enc);
        }
      } catch (mp4InitErr) {
        console.warn('WebCodecs MP4 initialization error:', mp4InitErr);
      }
    }

    // 3. GIF Encoders (Pure Built-in GIF Encoder, 100% reliable)
    const overlayGif = new BuiltinGifEncoder(gridInfo.gridWidth, gridInfo.gridHeight);
    const caseGifs = [];
    for (let i = 0; i < 6; i++) {
      caseGifs.push(new BuiltinGifEncoder(this.CASE_SIZE, this.CASE_SIZE));
    }

    // 4. Extract & Encode Frames
    const originalTime = videoElement.currentTime;

    for (let frameIdx = 0; frameIdx < totalFrames; frameIdx++) {
      const currentTimeSec = startTime + frameIdx / fps;
      await this.seekVideo(videoElement, currentTimeSec);

      const timestampUs = frameIdx * frameIntervalUs;
      const isKeyFrame = frameIdx % (fps * 2) === 0;

      // Render Overlay
      this.renderOverlayFrame(overlayCtx, videoElement, gridInfo, transform, bgColor);

      if (overlayMp4Encoder && overlayMp4Encoder.state === 'configured') {
        const frame = new VideoFrame(overlayCanvas, { timestamp: timestampUs });
        overlayMp4Encoder.encode(frame, { keyFrame: isKeyFrame });
        frame.close();
      }

      // Add to Builtin GIF Encoder
      const overlayImgData = overlayCtx.getImageData(0, 0, gridInfo.gridWidth, gridInfo.gridHeight);
      overlayGif.addFrame(overlayImgData.data, frameDelayMs);

      // Render 6 Cases
      for (let i = 0; i < 6; i++) {
        const cell = gridInfo.cells[i];
        const { canvas, ctx } = caseCanvases[i];

        this.renderCaseFrame(ctx, videoElement, cell, transform, bgColor);

        if (caseMp4Encoders[i] && caseMp4Encoders[i].state === 'configured') {
          const frame = new VideoFrame(canvas, { timestamp: timestampUs });
          caseMp4Encoders[i].encode(frame, { keyFrame: isKeyFrame });
          frame.close();
        }

        const caseImgData = ctx.getImageData(0, 0, this.CASE_SIZE, this.CASE_SIZE);
        caseGifs[i].addFrame(caseImgData.data, frameDelayMs);
      }

      const framePercent = Math.round(5 + (frameIdx / totalFrames) * 75);
      onProgress({
        step: 'encoding',
        percent: framePercent,
        currentFrame: frameIdx + 1,
        totalFrames,
        message: `Rendu frame ${frameIdx + 1}/${totalFrames} (${framePercent}%)`
      });

      await new Promise((r) => setTimeout(r, 0));
    }

    videoElement.currentTime = originalTime;

    onProgress({
      step: 'finalizing',
      percent: 85,
      message: 'Finalisation des fichiers MP4 et GIF...'
    });

    // 5. Finalize MP4
    let overlayMp4Blob = null;
    let caseMp4Blobs = [];

    if (canEncodeMP4 && overlayMp4Encoder) {
      try {
        await overlayMp4Encoder.flush();
        overlayMp4Encoder.close();
        overlayMp4Muxer.finalize();
        overlayMp4Blob = new Blob([overlayMp4Muxer.target.buffer], { type: 'video/mp4' });

        for (let i = 0; i < 6; i++) {
          await caseMp4Encoders[i].flush();
          caseMp4Encoders[i].close();
          caseMp4Muxers[i].finalize();
          caseMp4Blobs.push(new Blob([caseMp4Muxers[i].target.buffer], { type: 'video/mp4' }));
        }
      } catch (mp4FlushErr) {
        console.error('Error finalizing MP4:', mp4FlushErr);
      }
    }

    // 6. Finalize Built-in GIF
    onProgress({
      step: 'gif',
      percent: 88,
      message: 'Compression des 7 fichiers GIF...'
    });

    const overlayGifBytes = overlayGif.finish();
    const overlayGifBlob = new Blob([overlayGifBytes], { type: 'image/gif' });

    const caseGifBlobs = [];
    for (let i = 0; i < 6; i++) {
      const bytes = caseGifs[i].finish();
      caseGifBlobs.push(new Blob([bytes], { type: 'image/gif' }));
    }

    onProgress({
      step: 'zipping',
      percent: 92,
      message: 'Assemblage de l\'archive ZIP structurée...'
    });

    if (typeof JSZip === 'undefined') {
      throw new Error('La librairie JSZip n\'est pas chargée');
    }

    const zip = new JSZip();

    // Folder 1: "full overlay"
    const fullOverlayFolder = zip.folder('full overlay');
    if (overlayMp4Blob) fullOverlayFolder.file('overlay.mp4', overlayMp4Blob);
    fullOverlayFolder.file('overlay.gif', overlayGifBlob);

    // Folder 2: "Case par Case"
    const caseParCaseFolder = zip.folder('Case par Case');
    for (let i = 0; i < 6; i++) {
      const caseNum = i + 1;
      if (caseMp4Blobs[i]) {
        caseParCaseFolder.file(`case_${caseNum}.mp4`, caseMp4Blobs[i]);
      }
      caseParCaseFolder.file(`case_${caseNum}.gif`, caseGifBlobs[i]);
    }

    const zipBlob = await zip.generateAsync(
      {
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      },
      (meta) => {
        const p = Math.round(92 + (meta.percent / 100) * 8);
        onProgress({
          step: 'zipping',
          percent: p,
          message: `Compression ZIP : ${Math.round(meta.percent)}%`
        });
      }
    );

    onProgress({
      step: 'done',
      percent: 100,
      message: 'Terminé avec succès !'
    });

    return {
      zipBlob,
      overlayMp4Blob,
      overlayGifBlob,
      caseMp4Blobs,
      caseGifBlobs
    };
  }
}

// Export globally
window.VideoGridEngine = VideoGridEngine;
