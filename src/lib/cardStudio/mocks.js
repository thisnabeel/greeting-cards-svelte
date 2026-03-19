export const SHEET_FORMATS = {
  letter: { width: 2550, height: 3300 }, // 8.5x11 @ 300dpi
  seven_by_ten: { width: 2100, height: 3000 } // 7x10 @ 300dpi
};

export const getSheetSize = (sheetFormat = 'letter') =>
  SHEET_FORMATS[sheetFormat] || SHEET_FORMATS.letter;

export const loadImage = (url) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });

export const createCardImage = async (
  sourceUrl,
  {
    place = 'front',
    scaleOverride,
    offsetX = 0,
    offsetY = 0,
    cardTitle = '',
    imprintLine1 = '',
    imprintLine2 = '',
    imprintLine3 = '',
    clipAtFold = false,
    foldRatioFront = 0.5,
    sheetFormat = 'letter',
    frontLayers = [],
    layers = []
  } = {}
) => {
  if (!sourceUrl) return '';

  const { width: sheetW, height: sheetH } = getSheetSize(sheetFormat);

  const img = new Image();
  img.crossOrigin = 'anonymous';

  const loaded = new Promise((resolve, reject) => {
    img.onload = () => resolve(true);
    img.onerror = reject;
  });

  img.src = sourceUrl;
  await loaded;

  const canvas = document.createElement('canvas');
  canvas.width = sheetW;
  canvas.height = sheetH;
  const ctx = canvas.getContext('2d');

  // white background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const halfHeight = canvas.height / 2;

  // Outside/front sheet imprint band (optional).
  if (place === 'front' && (cardTitle || imprintLine1 || imprintLine2 || imprintLine3)) {
    ctx.save();
    const margin = Math.round(canvas.width * -0.04);
    const imprintHeight = halfHeight - margin * 2;
    const imprintWidth = canvas.width * 0.45;

    ctx.translate(margin + imprintWidth / 2, halfHeight / 2);
    ctx.rotate((90 * Math.PI) / 180);

    ctx.fillStyle = '#0b0f1a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';

    const title = (cardTitle || '').trim();
    if (title) {
      ctx.font = `700 ${Math.round(canvas.width * 0.028)}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
      ctx.fillText(title.toUpperCase(), 0, -Math.round(imprintHeight * 0.06), imprintWidth);
    }

    if (imprintLine1) {
      ctx.font = `800 ${Math.round(canvas.width * 0.032)}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
      ctx.fillText(imprintLine1, 0, 0, imprintWidth);
    }

    if (imprintLine2 || imprintLine3) {
      ctx.font = `500 ${Math.round(canvas.width * 0.018)}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
      ctx.fillStyle = '#334155';
      if (imprintLine2) {
        ctx.fillText(imprintLine2, 0, Math.round(imprintHeight * 0.05), imprintWidth);
      }
      if (imprintLine3) {
        ctx.fillText(imprintLine3, 0, Math.round(imprintHeight * 0.1), imprintWidth);
      }
    }

    ctx.strokeStyle = 'rgba(15, 23, 42, 0.18)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-imprintWidth * 0.4, Math.round(imprintHeight * 0.16));
    ctx.lineTo(imprintWidth * 0.4, Math.round(imprintHeight * 0.16));
    ctx.stroke();

    ctx.restore();
  }

  // Optional clipping region for front artwork so it cannot cross the fold line
  if (place === 'front' && clipAtFold) {
    const safeFold = Math.min(Math.max(foldRatioFront, 0), 1);
    const foldY = safeFold * canvas.height;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, foldY, canvas.width, canvas.height - foldY);
    ctx.clip();
  }

  ctx.save();
  let targetW = canvas.width;
  let targetH = halfHeight;
  let centerX = canvas.width / 2;
  let centerY = halfHeight + halfHeight / 2; // bottom half center (front)

  if (place === 'inside') {
    targetH = canvas.height;
    centerY = canvas.height / 2;
  }

  ctx.translate(centerX, centerY);
  ctx.rotate((90 * Math.PI) / 180);

  const baseScale = Math.max(targetW / img.width, targetH / img.height);
  const scale = (scaleOverride ?? 1) * baseScale;
  const drawW = img.width * scale;
  const drawH = img.height * scale;

  const shiftX = ((offsetX || 0) * targetW) / 2;
  const shiftY = ((offsetY || 0) * targetH) / 2;

  ctx.drawImage(img, -drawW / 2 + shiftX, -drawH / 2 + shiftY, drawW, drawH);
  ctx.restore();

  if (place === 'front' && clipAtFold) {
    // restore clipping
    ctx.restore();
  }

  const activeLayers =
    (layers && layers.length > 0) ? layers : place === 'front' ? frontLayers : [];

  if (activeLayers && activeLayers.length > 0) {
    activeLayers.forEach((layer) => {
      const x = (layer.xRatio || 0) * canvas.width;
      const y = (layer.yRatio || 0) * canvas.height;
      const w = Math.max(1, (layer.widthRatio || 0) * canvas.width);
      const h = Math.max(1, (layer.heightRatio || 0) * canvas.height);
      const r = Math.max(0, (layer.radiusRatio || 0) * Math.min(canvas.width, canvas.height));
      const opacity = typeof layer.opacity === 'number' ? Math.min(1, Math.max(0, layer.opacity)) : 0.82;

      if (layer.type === 'text') {
        const fontPx = Math.max(10, (layer.fontSizeRatio || 0.04) * canvas.height);
        const strokePx = Math.max(0, (layer.strokeWidthRatio || 0) * canvas.height);
        const bgStrokePx = Math.max(0, (layer.backgroundStrokeWidthRatio || 0) * canvas.height);
        const bgRadiusPx = Math.max(0, (layer.backgroundRadiusRatio || 0) * Math.min(canvas.width, canvas.height));
        const padX = Math.max(0, (layer.backgroundPaddingXRatio || 0) * canvas.width);
        const padY = Math.max(0, (layer.backgroundPaddingYRatio || 0) * canvas.height);
        const rotationDeg = Number(layer.rotation || 0);

        const drawRoundedRect = (rx, ry, rw, rh, rr) => {
          const radius = Math.min(Math.max(rr, 0), rw / 2, rh / 2);
          ctx.beginPath();
          ctx.moveTo(rx + radius, ry);
          ctx.lineTo(rx + rw - radius, ry);
          ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + radius);
          ctx.lineTo(rx + rw, ry + rh - radius);
          ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - radius, ry + rh);
          ctx.lineTo(rx + radius, ry + rh);
          ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - radius);
          ctx.lineTo(rx, ry + radius);
          ctx.quadraticCurveTo(rx, ry, rx + radius, ry);
          ctx.closePath();
        };

        ctx.save();
        ctx.font = `${Math.round(fontPx)}px ${layer.fontFamily || 'Georgia, "Times New Roman", serif'}`;
        const lines = String(layer.text || '').split('\n');
        const lineHeight = fontPx * 1.2;
        const textW = Math.max(1, ...lines.map((line) => ctx.measureText(line).width));
        const textH = Math.max(lineHeight, lines.length * lineHeight);

        ctx.translate(x, y);
        ctx.rotate((rotationDeg * Math.PI) / 180);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        if (layer.backgroundEnabled) {
          const bgW = textW + padX * 2;
          const bgH = textH + padY * 2;
          ctx.save();
          ctx.globalAlpha = Math.min(1, Math.max(0, layer.backgroundOpacity ?? 0.75));
          ctx.fillStyle = layer.backgroundColor || '#f8fafc';
          drawRoundedRect(-padX, -padY, bgW, bgH, bgRadiusPx);
          ctx.fill();
          if (bgStrokePx > 0) {
            ctx.globalAlpha = 1;
            ctx.strokeStyle = layer.backgroundStrokeColor || '#2563eb';
            ctx.lineWidth = bgStrokePx;
            drawRoundedRect(-padX, -padY, bgW, bgH, bgRadiusPx);
            ctx.stroke();
          }
          ctx.restore();
        }

        ctx.globalAlpha = opacity;
        ctx.fillStyle = layer.textColor || '#0f172a';
        if (layer.strokeEnabled && strokePx > 0) {
          ctx.lineWidth = strokePx;
          ctx.strokeStyle = layer.strokeColor || '#ffffff';
          lines.forEach((line, i) => {
            ctx.strokeText(line, 0, i * lineHeight);
          });
        }
        lines.forEach((line, i) => {
          ctx.fillText(line, 0, i * lineHeight);
        });
        ctx.restore();
      } else {
        ctx.save();
        ctx.shadowColor = 'rgba(15, 23, 42, 0.45)';
        ctx.shadowBlur = 18;
        ctx.shadowOffsetY = 8;
        ctx.fillStyle = layer.fill || `rgba(248, 250, 252, ${opacity})`;
        ctx.strokeStyle = layer.stroke || 'rgba(59, 130, 246, 0.95)';
        ctx.lineWidth = layer.strokeWidth || 3;

        const radius = Math.min(r, w / 2, h / 2);
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + w - radius, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
        ctx.lineTo(x + w, y + h - radius);
        ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
        ctx.lineTo(x + radius, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    });
  }

  return canvas.toDataURL('image/png');
};

export const createMockFrontFromPrint = async (printUrl) => {
  if (!printUrl) return '';
  const img = await loadImage(printUrl);

  const sheetW = img.width;
  const sheetH = img.height;
  const halfH = sheetH / 2;

  const out = document.createElement('canvas');
  out.width = halfH;
  out.height = sheetW;
  const ctx = out.getContext('2d');

  ctx.save();
  ctx.translate(out.width / 2, out.height / 2);
  ctx.rotate((-90 * Math.PI) / 180);
  ctx.drawImage(img, 0, halfH, sheetW, halfH, -sheetW / 2, -halfH / 2, sheetW, halfH);
  ctx.restore();

  return out.toDataURL('image/png');
};

export const createMockBackFromPrint = async (printUrl) => {
  if (!printUrl) return '';
  const img = await loadImage(printUrl);

  const sheetW = img.width;
  const sheetH = img.height;
  const halfH = sheetH / 2;

  const out = document.createElement('canvas');
  out.width = halfH;
  out.height = sheetW;
  const ctx = out.getContext('2d');

  ctx.save();
  ctx.translate(out.width / 2, out.height / 2);
  ctx.rotate((-90 * Math.PI) / 180);
  ctx.drawImage(img, 0, 0, sheetW, halfH, -sheetW / 2, -halfH / 2, sheetW, halfH);
  ctx.restore();

  return out.toDataURL('image/png');
};

export const createMockInsidePanelsFromPrint = async (printUrl) => {
  if (!printUrl) return { left: '', right: '' };
  const img = await loadImage(printUrl);

  const rotated = document.createElement('canvas');
  rotated.width = img.height; // 3300
  rotated.height = img.width; // 2550
  const rctx = rotated.getContext('2d');

  rctx.save();
  rctx.translate(rotated.width / 2, rotated.height / 2);
  rctx.rotate((-90 * Math.PI) / 180);
  rctx.drawImage(img, -img.width / 2, -img.height / 2);
  rctx.restore();

  const halfW = rotated.width / 2;

  const left = document.createElement('canvas');
  left.width = halfW;
  left.height = rotated.height;
  left.getContext('2d').drawImage(rotated, 0, 0, halfW, rotated.height, 0, 0, halfW, rotated.height);

  const right = document.createElement('canvas');
  right.width = halfW;
  right.height = rotated.height;
  right
    .getContext('2d')
    .drawImage(rotated, halfW, 0, halfW, rotated.height, 0, 0, halfW, rotated.height);

  return { left: left.toDataURL('image/png'), right: right.toDataURL('image/png') };
};

