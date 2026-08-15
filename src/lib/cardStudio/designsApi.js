import Api from '$lib/api/api.js';

const ACTIVE_KEY = 'studioActiveDesignId';

/**
 * @typedef {{
 *   id: number,
 *   name: string,
 *   width: number,
 *   height: number,
 *   updated_at?: string,
 *   thumbnail_url?: string | null
 * }} DesignSummary
 */

/**
 * @typedef {DesignSummary & {
 *   base_scale: number,
 *   base_offset_x: number,
 *   base_offset_y: number,
 *   layers: Record<string, unknown>[],
 *   base_image_url?: string | null
 * }} Design
 */

export const getActiveDesignId = () => {
	try {
		const raw = localStorage.getItem(ACTIVE_KEY);
		return raw ? Number(raw) : null;
	} catch {
		return null;
	}
};

export const setActiveDesignId = (id) => {
	try {
		if (id == null) localStorage.removeItem(ACTIVE_KEY);
		else localStorage.setItem(ACTIVE_KEY, String(id));
	} catch {
		/* ignore */
	}
};

/** @returns {Promise<DesignSummary[]>} */
export const listDesigns = () => Api.get('/designs.json');

/** @param {number|string} id @returns {Promise<Design>} */
export const getDesign = (id) => Api.get(`/designs/${id}.json`);

/**
 * @param {{
 *   name?: string,
 *   width: number,
 *   height: number,
 *   base_scale?: number,
 *   base_offset_x?: number,
 *   base_offset_y?: number,
 *   layers?: unknown[],
 *   baseImageBlob?: Blob | null,
 *   thumbnailBlob?: Blob | null,
 *   layerImageBlobs?: Record<string, Blob>
 * }} payload
 * @returns {Promise<Design>}
 */
export const createDesign = (payload) => {
	const formData = buildFormData(payload);
	return Api.post('/designs.json', formData);
};

/**
 * @param {number|string} id
 * @param {{
 *   name?: string,
 *   base_scale?: number,
 *   base_offset_x?: number,
 *   base_offset_y?: number,
 *   layers?: unknown[],
 *   baseImageBlob?: Blob | null,
 *   thumbnailBlob?: Blob | null,
 *   layerImageBlobs?: Record<string, Blob>
 * }} payload
 * @returns {Promise<Design>}
 */
export const updateDesign = (id, payload) => {
	const formData = buildFormData(payload);
	// Use POST + method override so CORS preflight matches existing allowed methods
	// (PATCH was missing from Rack::Cors until application.rb restart).
	formData.append('_method', 'patch');
	return Api.post(`/designs/${id}.json`, formData);
};

/** @param {number|string} id */
export const deleteDesign = (id) => Api.delete(`/designs/${id}.json`);

/** @param {number|string} id @returns {Promise<Design>} */
export const duplicateDesign = (id) => Api.post(`/designs/${id}/duplicate.json`, {});

/**
 * @param {{
 *   name?: string,
 *   width?: number,
 *   height?: number,
 *   base_scale?: number,
 *   base_offset_x?: number,
 *   base_offset_y?: number,
 *   layers?: unknown[],
 *   baseImageBlob?: Blob | null,
 *   thumbnailBlob?: Blob | null,
 *   layerImageBlobs?: Record<string, Blob>
 * }} payload
 */
const buildFormData = (payload) => {
	const formData = new FormData();
	if (payload.name != null) formData.append('design[name]', payload.name);
	if (payload.width != null) formData.append('design[width]', String(payload.width));
	if (payload.height != null) formData.append('design[height]', String(payload.height));
	if (payload.base_scale != null) formData.append('design[base_scale]', String(payload.base_scale));
	if (payload.base_offset_x != null) {
		formData.append('design[base_offset_x]', String(payload.base_offset_x));
	}
	if (payload.base_offset_y != null) {
		formData.append('design[base_offset_y]', String(payload.base_offset_y));
	}
	if (payload.layers != null) {
		formData.append('design[layers]', JSON.stringify(payload.layers));
	}
	if (payload.baseImageBlob) {
		formData.append('design[base_image]', payload.baseImageBlob, 'base.png');
	}
	if (payload.thumbnailBlob) {
		formData.append('design[thumbnail]', payload.thumbnailBlob, 'thumb.png');
	}
	const layerBlobs = payload.layerImageBlobs || {};
	for (const [layerId, blob] of Object.entries(layerBlobs)) {
		if (!blob) continue;
		formData.append(`design[layer_images][${layerId}]`, blob, `${layerId}.png`);
	}
	return formData;
};

/** Convert a data URL or blob URL to a Blob. */
export const urlToBlob = async (url) => {
	if (!url) return null;
	const res = await fetch(url);
	return res.blob();
};
