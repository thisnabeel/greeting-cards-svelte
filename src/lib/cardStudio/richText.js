import { DEFAULT_TIKTOK_FONT } from './tiktokFonts.js';

/**
 * @typedef {{
 *   text: string,
 *   fontSize: number,
 *   fontFamily: string,
 *   color: string,
 *   letterSpacing: number
 * }} TextRun
 */

export const defaultRunStyle = () => ({
	fontSize: 42,
	fontFamily: DEFAULT_TIKTOK_FONT.cssFamily,
	color: '#ffffff',
	letterSpacing: 0
});

/** Migrate flat text layer fields into a single run. */
export const ensureRuns = (layer) => {
	if (layer?.type !== 'text') return layer;
	if (Array.isArray(layer.runs) && layer.runs.length) {
		return {
			...layer,
			text: runsToPlainText(layer.runs),
			runs: layer.runs.map(normalizeRun)
		};
	}
	const style = {
		fontSize: layer.fontSize || 42,
		fontFamily: layer.fontFamily || DEFAULT_TIKTOK_FONT.cssFamily,
		color: layer.textColor || '#ffffff',
		letterSpacing: layer.letterSpacing || 0
	};
	const text = String(layer.text ?? 'Your headline');
	return {
		...layer,
		lineHeight: layer.lineHeight ?? 1.15,
		padding: layer.padding ?? 12,
		runs: [{ text, ...style }],
		text
	};
};

export const normalizeRun = (run) => ({
	text: String(run?.text ?? ''),
	fontSize: Math.max(8, Number(run?.fontSize) || 42),
	fontFamily: run?.fontFamily || DEFAULT_TIKTOK_FONT.cssFamily,
	color: run?.color || '#ffffff',
	letterSpacing: Number(run?.letterSpacing) || 0
});

/** Canvas `font` string that matches editor CSS (quoted family names). */
export const canvasFont = (style) => {
	const size = Math.max(8, Math.round(Number(style?.fontSize) || 42));
	const family = style?.fontFamily || DEFAULT_TIKTOK_FONT.cssFamily;
	return `700 ${size}px ${family}`;
};

/** CSS-like tracking: gaps between characters, not after the last. */
export const trackingWidth = (text, letterSpacing) =>
	(Number(letterSpacing) || 0) * Math.max(0, [...String(text || '')].length - 1);

export const runsToPlainText = (runs) =>
	(runs || []).map((r) => r.text || '').join('');

/** Escape text for HTML. */
const esc = (s) =>
	String(s)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');

/** Safe CSS value for use inside a double-quoted style="" attribute. */
const escCss = (s) => String(s ?? '').replace(/;/g, '').replace(/"/g, "'");

/** Runs → display HTML (newlines → <br>). */
export const runsToHtml = (runs) => {
	const parts = [];
	for (const run of runs || []) {
		const style = [
			`font-size:${run.fontSize}px`,
			`font-family:${escCss(run.fontFamily)}`,
			`color:${escCss(run.color || '#ffffff')}`,
			`letter-spacing:${run.letterSpacing || 0}px`,
			'font-weight:700',
			'white-space:pre-wrap'
		].join(';');
		const chunks = String(run.text || '').split('\n');
		chunks.forEach((chunk, i) => {
			if (i > 0) parts.push('<br>');
			if (chunk.length) {
				parts.push(`<span data-rich-run="1" style="${style}">${esc(chunk)}</span>`);
			}
		});
	}
	return parts.join('') || '<br>';
};

/**
 * Parse contenteditable root into runs (merges adjacent identical styles).
 * @param {HTMLElement} root
 * @returns {TextRun[]}
 */
export const htmlToRuns = (root) => {
	/** @type {TextRun[]} */
	const runs = [];
	const push = (text, style) => {
		if (!text) return;
		const last = runs[runs.length - 1];
		const next = normalizeRun({ text, ...style });
		if (
			last &&
			last.fontSize === next.fontSize &&
			last.fontFamily === next.fontFamily &&
			last.color === next.color &&
			last.letterSpacing === next.letterSpacing
		) {
			last.text += next.text;
		} else {
			runs.push(next);
		}
	};

	const walk = (node, inherited) => {
		if (node.nodeType === Node.TEXT_NODE) {
			push(node.textContent || '', inherited);
			return;
		}
		if (node.nodeType !== Node.ELEMENT_NODE) return;
		const el = /** @type {HTMLElement} */ (node);
		if (el.tagName === 'BR') {
			push('\n', inherited);
			return;
		}
		const style = { ...inherited };
		if (el.dataset?.richRun === '1' || el.style?.fontSize) {
			const fs = parseFloat(el.style.fontSize);
			if (!Number.isNaN(fs)) style.fontSize = fs;
			if (el.style.fontFamily) style.fontFamily = el.style.fontFamily;
			if (el.style.color) style.color = el.style.color;
			const ls = parseFloat(el.style.letterSpacing);
			if (!Number.isNaN(ls)) style.letterSpacing = ls;
		}
		el.childNodes.forEach((child) => walk(child, style));
	};

	const base = defaultRunStyle();
	if (!root) return [{ text: '', ...base }];
	root.childNodes.forEach((child) => walk(child, base));
	if (!runs.length) return [{ text: '', ...base }];
	return runs;
};

/**
 * Apply style patch to the current DOM selection inside root.
 * @param {HTMLElement} root
 * @param {Partial<TextRun>} patch
 */
export const applyFormatToSelection = (root, patch) => {
	const sel = window.getSelection();
	if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return false;
	const range = sel.getRangeAt(0);
	if (!root.contains(range.commonAncestorContainer)) return false;

	const contents = range.extractContents();
	const wrapper = document.createElement('span');
	wrapper.dataset.richRun = '1';
	// Inherit from first text parent if possible
	const inherited = defaultRunStyle();
	Object.assign(inherited, patch);
	wrapper.style.fontSize = `${inherited.fontSize}px`;
	wrapper.style.fontFamily = inherited.fontFamily;
	wrapper.style.color = inherited.color;
	wrapper.style.letterSpacing = `${inherited.letterSpacing || 0}px`;
	wrapper.style.fontWeight = '700';
	wrapper.style.whiteSpace = 'pre-wrap';
	wrapper.appendChild(contents);
	range.insertNode(wrapper);

	sel.removeAllRanges();
	const after = document.createRange();
	after.selectNodeContents(wrapper);
	after.collapse(false);
	sel.addRange(after);
	return true;
};

/**
 * Measure text from runs for box sizing (canvas).
 * @param {TextRun[]} runs
 * @param {{ maxWidth?: number, lineHeight?: number, padding?: number }} opts
 */
export const measureRuns = (runs, { maxWidth = Infinity, lineHeight = 1.15, padding = 0 } = {}) => {
	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d');
	if (!ctx) return { width: 40, height: 40, lines: [] };

	const contentWidth = Math.max(8, maxWidth - padding * 2);
	const lines = layoutRunsToLines(ctx, runs, contentWidth);
	let maxW = 0;
	let totalH = 0;
	for (const line of lines) {
		maxW = Math.max(maxW, line.width);
		const lh = line.maxFontSize * lineHeight;
		totalH += lh;
	}
	return {
		width: Math.ceil(maxW + padding * 2 + 2),
		height: Math.ceil(Math.max(totalH, 20) + padding * 2 + 2),
		lines
	};
};

/**
 * Layout runs into visual lines with segments (for export + measure).
 * @param {CanvasRenderingContext2D} ctx
 * @param {TextRun[]} runs
 * @param {number} maxWidth
 */
export const layoutRunsToLines = (ctx, runs, maxWidth) => {
	/** @type {{ segments: { text: string, fontSize: number, fontFamily: string, color: string, letterSpacing: number }[], width: number, maxFontSize: number }[]} */
	const lines = [];
	let current = { segments: [], width: 0, maxFontSize: 12 };

	const flush = () => {
		if (!current.segments.length) {
			lines.push({ segments: [{ text: '', ...defaultRunStyle() }], width: 0, maxFontSize: 12 });
		} else {
			lines.push(current);
		}
		current = { segments: [], width: 0, maxFontSize: 12 };
	};

	const measureSeg = (text, style) => {
		ctx.font = canvasFont(style);
		const base = ctx.measureText(text || '').width;
		return base + trackingWidth(text, style.letterSpacing);
	};

	const appendText = (text, style) => {
		if (!text) return;
		// Word-wrap within maxWidth
		const words = text.split(/(\s+)/);
		for (const word of words) {
			if (!word) continue;
			const w = measureSeg(word, style);
			if (current.width + w > maxWidth && current.segments.length) {
				flush();
			}
			// If single token still too wide, hard-break
			if (w > maxWidth && word.length > 1) {
				let rest = word;
				while (rest) {
					let fit = 1;
					while (
						fit < rest.length &&
						measureSeg(rest.slice(0, fit + 1), style) <= maxWidth - current.width
					) {
						fit += 1;
					}
					const chunk = rest.slice(0, fit);
					const cw = measureSeg(chunk, style);
					current.segments.push({
						text: chunk,
						fontSize: style.fontSize,
						fontFamily: style.fontFamily,
						color: style.color,
						letterSpacing: style.letterSpacing
					});
					current.width += cw;
					current.maxFontSize = Math.max(current.maxFontSize, style.fontSize);
					rest = rest.slice(fit);
					if (rest) flush();
				}
			} else {
				current.segments.push({
					text: word,
					fontSize: style.fontSize,
					fontFamily: style.fontFamily,
					color: style.color,
					letterSpacing: style.letterSpacing
				});
				current.width += w;
				current.maxFontSize = Math.max(current.maxFontSize, style.fontSize);
			}
		}
	};

	for (const run of runs || []) {
		const style = normalizeRun(run);
		const parts = String(style.text).split('\n');
		parts.forEach((part, i) => {
			if (i > 0) flush();
			appendText(part, style);
		});
	}
	if (current.segments.length || !lines.length) flush();
	return lines;
};

/**
 * Convert editor runs ↔ API ratio runs.
 */
export const runsToRatios = (runs, pageH) =>
	(runs || []).map((r) => ({
		text: r.text || '',
		fontSizeRatio: (r.fontSize || 42) / Math.max(1, pageH),
		fontFamily: r.fontFamily || DEFAULT_TIKTOK_FONT.cssFamily,
		color: r.color || '#ffffff',
		letterSpacingRatio: (r.letterSpacing || 0) / Math.max(1, pageH)
	}));

export const ratiosToRuns = (ratioRuns, pageH) => {
	if (!Array.isArray(ratioRuns) || !ratioRuns.length) return null;
	return ratioRuns.map((r) =>
		normalizeRun({
			text: r.text || '',
			fontSize: Math.max(8, (r.fontSizeRatio || 0.04) * pageH),
			fontFamily: r.fontFamily,
			color: r.color || r.textColor,
			letterSpacing: (r.letterSpacingRatio || 0) * pageH
		})
	);
};
