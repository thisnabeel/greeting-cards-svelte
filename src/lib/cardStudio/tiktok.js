import { loadImage } from './mocks.js';
import { DEFAULT_TIKTOK_FONT, ensureTikTokFontsLoaded } from './tiktokFonts.js';
import { ensureRuns, layoutRunsToLines, normalizeRun, ratiosToRuns, canvasFont } from './richText.js';

export const TIKTOK_SIZE = { width: 1080, height: 1920 };

const drawRoundedRectPath = (ctx, rx, ry, rw, rh, rr) => {
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

/**
 * Wrap text to fit maxWidth (matches CSS word-break / pre-wrap in the editor).
 * Honors explicit newlines.
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} text
 * @param {number} maxWidth
 * @returns {string[]}
 */
export const wrapTextToWidth = (ctx, text, maxWidth) => {
	const paragraphs = String(text || '').split('\n');
	const lines = [];
	const width = Math.max(1, maxWidth);

	for (const paragraph of paragraphs) {
		if (!paragraph) {
			lines.push('');
			continue;
		}
		const words = paragraph.split(/(\s+)/);
		let current = '';
		for (const token of words) {
			const next = current + token;
			if (current && ctx.measureText(next).width > width) {
				lines.push(current.replace(/\s+$/, ''));
				current = token.replace(/^\s+/, '');
				// Break oversized single tokens character-by-character
				while (current && ctx.measureText(current).width > width) {
					let fit = 1;
					while (
						fit < current.length &&
						ctx.measureText(current.slice(0, fit + 1)).width <= width
					) {
						fit += 1;
					}
					lines.push(current.slice(0, fit));
					current = current.slice(fit);
				}
			} else {
				current = next;
			}
		}
		if (current !== '') lines.push(current.replace(/\s+$/, ''));
	}

	return lines.length ? lines : [''];
};

/**
 * Draw a full-bleed cover image into the canvas (optional scale + offset).
 * @param {CanvasRenderingContext2D} ctx
 * @param {HTMLImageElement} img
 * @param {{ width: number, height: number }} size
 * @param {{ scale?: number, offsetX?: number, offsetY?: number }} opts
 */
const drawCoverImage = (ctx, img, size, { scale = 1, offsetX = 0, offsetY = 0 } = {}) => {
	const { width, height } = size;
	const base = Math.max(width / img.width, height / img.height);
	const s = base * (scale || 1);
	const drawW = img.width * s;
	const drawH = img.height * s;
	const x = (width - drawW) / 2 + (offsetX * width) / 2;
	const y = (height - drawH) / 2 + (offsetY * height) / 2;
	ctx.drawImage(img, x, y, drawW, drawH);
};

/**
 * Draw image as CSS `background-size: cover; background-position: center`
 * into a box centered at the current transform origin.
 * @param {CanvasRenderingContext2D} ctx
 * @param {HTMLImageElement} img
 * @param {number} boxW
 * @param {number} boxH
 */
const drawImageCoverCentered = (ctx, img, boxW, boxH) => {
	const scale = Math.max(boxW / img.width, boxH / img.height);
	const drawW = img.width * scale;
	const drawH = img.height * scale;
	ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
};

/**
 * Create a TikTok thumbnail PNG data URL (1080×1920).
 * Layers use ratio fields relative to the export canvas (same as CardStudio serialize).
 *
 * @param {{
 *   baseUrl?: string,
 *   layers?: Record<string, unknown>[],
 *   width?: number,
 *   height?: number,
 *   scale?: number,
 *   offsetX?: number,
 *   offsetY?: number
 * }} options
 * @returns {Promise<string>}
 */
export const createTikTokThumbnail = async ({
	baseUrl = '',
	layers = [],
	width = TIKTOK_SIZE.width,
	height = TIKTOK_SIZE.height,
	scale = 1,
	offsetX = 0,
	offsetY = 0
} = {}) => {
	await ensureTikTokFontsLoaded();

	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext('2d');
	if (!ctx) return '';

	ctx.fillStyle = '#0f172a';
	ctx.fillRect(0, 0, width, height);

	if (baseUrl) {
		try {
			const img = await loadImage(baseUrl);
			drawCoverImage(ctx, img, { width, height }, { scale, offsetX, offsetY });
		} catch {
			// keep solid background if base fails
		}
	}

	for (const layer of layers || []) {
		// Groups are structural only — never draw a placeholder box
		if (layer.type === 'group') continue;

		const x = (layer.xRatio || 0) * width;
		const y = (layer.yRatio || 0) * height;
		const w = Math.max(1, (layer.widthRatio || 0) * width);
		const h = Math.max(1, (layer.heightRatio || 0) * height);
		const r = Math.max(0, (layer.radiusRatio || 0) * Math.min(width, height));
		const opacity =
			typeof layer.opacity === 'number' ? Math.min(1, Math.max(0, layer.opacity)) : 1;
		const rotationDeg = Number(layer.rotation || 0);

		if (layer.type === 'text') {
			const padding = Math.max(0, (layer.paddingRatio || 0) * Math.min(width, height));
			const lineHeightMult = layer.lineHeight || 1.15;
			const strokePx = Math.max(0, (layer.strokeWidthRatio || 0) * height);
			const bgStrokePx = Math.max(0, (layer.backgroundStrokeWidthRatio || 0) * height);
			const bgRadiusPx = Math.max(
				0,
				(layer.backgroundRadiusRatio || 0) * Math.min(width, height)
			);
			const padX = Math.max(0, (layer.backgroundPaddingXRatio || 0) * width);
			const padY = Math.max(0, (layer.backgroundPaddingYRatio || 0) * height);

			// Prefer rich runs; fall back to flat text
			let runs = ratiosToRuns(layer.runs, height);
			if (!runs) {
				const flat = ensureRuns({
					type: 'text',
					text: layer.text || '',
					fontSize: Math.max(10, (layer.fontSizeRatio || 0.04) * height),
					fontFamily: layer.fontFamily || DEFAULT_TIKTOK_FONT.cssFamily,
					textColor: layer.textColor || '#ffffff'
				});
				runs = flat.runs;
			}

			const boxW = Math.max(1, (layer.widthRatio || 0) * width);
			const wrapW =
				layer.respectBounds === false
					? 1e9
					: Math.max(8, boxW - padding * 2);
			const lines = layoutRunsToLines(ctx, runs, wrapW);
			let textH = 0;
			let textW = 0;
			for (const line of lines) {
				textW = Math.max(textW, line.width);
				textH += line.maxFontSize * lineHeightMult;
			}

			ctx.save();
			ctx.translate(x, y);
			ctx.rotate((rotationDeg * Math.PI) / 180);
			ctx.textAlign = 'left';
			ctx.textBaseline = 'top';

			if (layer.backgroundEnabled) {
				const bgW = textW + padding * 2 + padX * 2;
				const bgH = textH + padding * 2 + padY * 2;
				ctx.save();
				ctx.globalAlpha = Math.min(1, Math.max(0, layer.backgroundOpacity ?? 0.75));
				ctx.fillStyle = layer.backgroundColor || '#f8fafc';
				drawRoundedRectPath(ctx, -padX, -padY, bgW, bgH, bgRadiusPx);
				ctx.fill();
				if (bgStrokePx > 0) {
					ctx.globalAlpha = 1;
					ctx.strokeStyle = layer.backgroundStrokeColor || '#2563eb';
					ctx.lineWidth = bgStrokePx;
					drawRoundedRectPath(ctx, -padX, -padY, bgW, bgH, bgRadiusPx);
					ctx.stroke();
				}
				ctx.restore();
			}

			if (layer.respectBounds !== false) {
				ctx.beginPath();
				ctx.rect(0, 0, Math.max(w, boxW), Math.max(h, textH + padding * 2));
				ctx.clip();
			}

			ctx.globalAlpha = opacity;
			let cursorY = padding;
			for (const line of lines) {
				let cursorX = padding;
				const lh = line.maxFontSize * lineHeightMult;
				for (const seg of line.segments) {
					const style = normalizeRun(seg);
					ctx.font = canvasFont(style);
					ctx.fillStyle = style.color || '#ffffff';
					const chars = [...(style.text || '')];
					if (!chars.length) continue;
					for (let i = 0; i < chars.length; i++) {
						const advance =
							ctx.measureText(chars[i]).width +
							(i < chars.length - 1 ? style.letterSpacing || 0 : 0);
						if (layer.strokeEnabled && strokePx > 0) {
							ctx.lineWidth = strokePx;
							ctx.strokeStyle = layer.strokeColor || '#000000';
							ctx.strokeText(chars[i], cursorX, cursorY);
						}
						ctx.fillText(chars[i], cursorX, cursorY);
						cursorX += advance;
					}
				}
				cursorY += lh;
			}
			ctx.restore();
			continue;
		}

		if (layer.type === 'image' && layer.src) {
			try {
				const layerImg = await loadImage(String(layer.src));
				ctx.save();
				ctx.translate(x + w / 2, y + h / 2);
				ctx.rotate((rotationDeg * Math.PI) / 180);
				ctx.globalAlpha = opacity;
				// Match editor: background-size: cover + background-position: center (clip to box)
				drawRoundedRectPath(ctx, -w / 2, -h / 2, w, h, r);
				ctx.clip();
				drawImageCoverCentered(ctx, layerImg, w, h);
				ctx.restore();
			} catch {
				// skip broken image layer
			}
			continue;
		}

		if (layer.type !== 'square') continue;

		// Fallback: rounded square placeholder
		ctx.save();
		ctx.translate(x + w / 2, y + h / 2);
		ctx.rotate((rotationDeg * Math.PI) / 180);
		ctx.globalAlpha = opacity;
		ctx.fillStyle = layer.fill || 'rgba(248, 250, 252, 0.45)';
		ctx.strokeStyle = layer.stroke || 'rgba(59, 130, 246, 0.95)';
		ctx.lineWidth = layer.strokeWidth || 3;
		drawRoundedRectPath(ctx, -w / 2, -h / 2, w, h, r);
		ctx.fill();
		ctx.stroke();
		ctx.restore();
	}

	return canvas.toDataURL('image/png');
};
