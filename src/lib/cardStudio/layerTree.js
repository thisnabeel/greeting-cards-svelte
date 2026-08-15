const MAX_DEPTH = 8;

/** @param {any[]} layers @param {string|null} parentId */
export const getChildren = (layers, parentId = null) =>
	(layers || []).filter((l) => (l.parentId ?? null) === parentId);

/** Depth-first paint order: parents before children; sibling order = array order among siblings. */
export const walkPaintOrder = (layers) => {
	const result = [];
	const visit = (parentId) => {
		for (const layer of getChildren(layers, parentId)) {
			result.push(layer);
			visit(layer.id);
		}
	};
	visit(null);
	const seen = new Set(result.map((l) => l.id));
	for (const layer of layers || []) {
		if (!seen.has(layer.id)) result.push(layer);
	}
	return result;
};

export const getDescendantIds = (layers, id) => {
	const ids = [];
	const visit = (pid) => {
		for (const child of getChildren(layers, pid)) {
			ids.push(child.id);
			visit(child.id);
		}
	};
	visit(id);
	return ids;
};

export const getAncestorIds = (layers, id) => {
	const byId = Object.fromEntries((layers || []).map((l) => [l.id, l]));
	const ids = [];
	let cur = byId[id];
	let guard = 0;
	while (cur?.parentId && guard++ < 64) {
		ids.push(cur.parentId);
		cur = byId[cur.parentId];
	}
	return ids;
};

export const getDepth = (layers, id) => {
	if (!id) return 0;
	return getAncestorIds(layers, id).length;
};

export const wouldCreateCycle = (layers, id, newParentId) => {
	if (!newParentId) return false;
	if (newParentId === id) return true;
	return getDescendantIds(layers, id).includes(newParentId);
};

/**
 * Flatten tree rows for the panel UI.
 * @returns {{ layer: any, depth: number }[]}
 */
export const flattenTreeRows = (layers) => {
	const rows = [];
	const visit = (parentId, depth) => {
		for (const layer of getChildren(layers, parentId)) {
			rows.push({ layer, depth });
			visit(layer.id, depth + 1);
		}
	};
	visit(null, 0);
	const seen = new Set(rows.map((r) => r.layer.id));
	for (const layer of layers || []) {
		if (!seen.has(layer.id)) rows.push({ layer, depth: 0 });
	}
	return rows;
};

/**
 * Move layer to a new parent / sibling index among that parent's children.
 * Rebuilds the flat array as tree walk order so sibling order is stable.
 */
export const moveLayer = (layers, id, { parentId, index }) => {
	const list = (layers || []).map((l) => ({ ...l }));
	const layer = list.find((l) => l.id === id);
	if (!layer) return layers || [];
	const newParent = parentId ?? null;
	if (wouldCreateCycle(list, id, newParent)) return list;
	if (newParent && getDepth(list, newParent) >= MAX_DEPTH - 1) return list;

	layer.parentId = newParent;

	const without = list.filter((l) => l.id !== id);
	const siblings = without.filter((l) => (l.parentId ?? null) === newParent);
	const clamped = Math.max(0, Math.min(index, siblings.length));
	siblings.splice(clamped, 0, layer);

	const byParent = new Map();
	for (const l of without) {
		if ((l.parentId ?? null) === newParent) continue;
		const p = l.parentId ?? null;
		if (!byParent.has(p)) byParent.set(p, []);
		byParent.get(p).push(l);
	}
	byParent.set(newParent, siblings);

	const out = [];
	const walk = (pid) => {
		const kids = byParent.get(pid) || getChildren(without, pid);
		// Prefer explicit map for the modified parent; else filter without
		const listKids =
			pid === newParent ? siblings : without.filter((l) => (l.parentId ?? null) === pid);
		for (const child of listKids) {
			if (out.find((x) => x.id === child.id)) continue;
			out.push(child);
			walk(child.id);
		}
	};
	walk(null);

	for (const l of list) {
		if (!out.find((x) => x.id === l.id)) out.push(l);
	}
	return out;
};

/** Bounding box of all descendants (content layers). Falls back to the root layer's own rect. */
export const getSubtreeBounds = (layers, rootId) => {
	const root = (layers || []).find((l) => l.id === rootId);
	const ids = getDescendantIds(layers, rootId);
	const members = (layers || []).filter((l) => ids.includes(l.id) && l.type !== 'group');

	if (!members.length) {
		if (!root) return null;
		return {
			x: root.x || 0,
			y: root.y || 0,
			width: Math.max(40, root.width || 40),
			height: Math.max(40, root.height || 40)
		};
	}

	let minX = Infinity;
	let minY = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;
	for (const l of members) {
		const x = l.x || 0;
		const y = l.y || 0;
		const w = Math.max(1, l.width || 1);
		const h = Math.max(1, l.height || 1);
		minX = Math.min(minX, x);
		minY = Math.min(minY, y);
		maxX = Math.max(maxX, x + w);
		maxY = Math.max(maxY, y + h);
	}
	return {
		x: minX,
		y: minY,
		width: Math.max(1, maxX - minX),
		height: Math.max(1, maxY - minY)
	};
};

/** Apply dx/dy to layer and all descendants (absolute coords). */
export const applyDeltaToSubtree = (layers, rootId, dx, dy) => {
	const ids = new Set([rootId, ...getDescendantIds(layers, rootId)]);
	return (layers || []).map((layer) => {
		if (!ids.has(layer.id)) return layer;
		return {
			...layer,
			x: (layer.x || 0) + dx,
			y: (layer.y || 0) + dy
		};
	});
};

/**
 * Scale a group (and nested layers) from startBounds to a new size.
 * Positions/sizes are relative to the bounds origin; text fonts use √(sx·sy).
 * Pass the layer list from resize-start so scaling is not cumulative.
 */
export const scaleSubtree = (layers, rootId, startBounds, nextWidth, nextHeight) => {
	const ox = startBounds.x || 0;
	const oy = startBounds.y || 0;
	const sw = Math.max(8, startBounds.width || 8);
	const sh = Math.max(8, startBounds.height || 8);
	const nw = Math.max(8, nextWidth);
	const nh = Math.max(8, nextHeight);
	const sx = nw / sw;
	const sy = nh / sh;
	const fontScale = Math.sqrt(Math.max(0.01, sx * sy));
	const ids = new Set([rootId, ...getDescendantIds(layers, rootId)]);

	return (layers || []).map((layer) => {
		if (!ids.has(layer.id)) return layer;

		const next = {
			...layer,
			x: ox + ((layer.x || 0) - ox) * sx,
			y: oy + ((layer.y || 0) - oy) * sy,
			width: Math.max(1, (layer.width || 1) * sx),
			height: Math.max(1, (layer.height || 1) * sy)
		};
		if (layer.radius != null) {
			next.radius = Math.max(0, (layer.radius || 0) * Math.min(sx, sy));
		}

		if (layer.type === 'text') {
			const scaleFont = (n) => Math.max(6, Math.round((n || 32) * fontScale));
			next.fontSize = scaleFont(layer.fontSize || 32);
			if (layer.padding != null) next.padding = Math.max(0, (layer.padding || 0) * fontScale);
			if (layer.strokeWidth != null) {
				next.strokeWidth = Math.max(0, (layer.strokeWidth || 0) * fontScale);
			}
			if (layer.runs?.length) {
				next.runs = layer.runs.map((r) => ({
					...r,
					fontSize: scaleFont(r.fontSize || layer.fontSize || 32),
					letterSpacing: (r.letterSpacing || 0) * fontScale
				}));
			}
		}

		return next;
	});
};

export const deleteSubtree = (layers, rootId) => {
	const ids = new Set([rootId, ...getDescendantIds(layers, rootId)]);
	return (layers || []).filter((l) => !ids.has(l.id));
};

export const layerLabel = (layer, indexHint = 0) => {
	if (layer.type === 'group') return layer.name || `Group ${indexHint + 1}`;
	if (layer.type === 'text') {
		const t = (layer.text || '').trim().slice(0, 24);
		return t || `Text ${indexHint + 1}`;
	}
	if (layer.type === 'image') return `Image ${indexHint + 1}`;
	return `Layer ${indexHint + 1}`;
};
