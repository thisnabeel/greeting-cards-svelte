<script>
	// @ts-nocheck
	import { onDestroy, onMount, tick } from 'svelte';
	import LayerControls from '$lib/components/Products/Edit/Category/Product/CardStudio/LayerControls.svelte';
	import { createTikTokThumbnail, TIKTOK_SIZE } from '$lib/cardStudio/tiktok.js';
	import {
		DEFAULT_TIKTOK_FONT,
		TIKTOK_FONTS,
		ensureTikTokFontsLoaded
	} from '$lib/cardStudio/tiktokFonts.js';
	import {
		listDesigns,
		getDesign,
		createDesign,
		updateDesign,
		deleteDesign,
		duplicateDesign,
		getActiveDesignId,
		setActiveDesignId,
		urlToBlob
	} from '$lib/cardStudio/designsApi.js';
	import {
		ensureRuns,
		measureRuns,
		runsToPlainText,
		runsToRatios,
		ratiosToRuns,
		defaultRunStyle
	} from '$lib/cardStudio/richText.js';
	import {
		walkPaintOrder,
		deleteSubtree,
		getDescendantIds,
		getSubtreeBounds,
		applyDeltaToSubtree,
		scaleSubtree,
		getChildren
	} from '$lib/cardStudio/layerTree.js';
	import DesignStrip from './DesignStrip.svelte';
	import NewDesignModal from './NewDesignModal.svelte';
	import LayersPanel from './LayersPanel.svelte';
	import RichTextEditor from './RichTextEditor.svelte';

	let designs = [];
	let activeDesignId = null;
	let designName = 'Untitled';
	let canvasWidth = TIKTOK_SIZE.width;
	let canvasHeight = TIKTOK_SIZE.height;
	let showNewModal = false;
	let saving = false;
	let saveError = '';
	let hydrating = false;
	/** @type {Set<string>} */
	let dirtyLayerIds = new Set();
	let saveTimer;
	let bootstrapped = false;

	let layers = [];
	let selectedLayerId = null;
	let editingLayerId = null;
	let deleteConfirmForId = null;
	let pageEl;
	let imageLayerInput;
	let exporting = false;
	let exportPreview = '';
	let activeDrag = null;
	let renderTimer;

	$: selectedLayer = (() => {
		const layer = layers.find((l) => l.id === selectedLayerId) || null;
		if (!layer) return null;
		if (layer.type === 'group') {
			const bounds = getSubtreeBounds(layers, layer.id);
			return bounds ? { ...layer, ...bounds } : layer;
		}
		return layer;
	})();
	$: paintLayers = walkPaintOrder(layers);
	$: aspectRatio = `${canvasWidth} / ${canvasHeight}`;
	/** When a group is selected, descendants ignore pointer events so the group can be dragged. */
	$: lockedBySelectedGroup =
		selectedLayer?.type === 'group'
			? new Set(getDescendantIds(layers, selectedLayer.id))
			: new Set();

	onMount(() => {
		const onKey = (e) => {
			if (e.key === 'Escape') editingLayerId = null;
		};
		window.addEventListener('keydown', onKey);
		(async () => {
			await ensureTikTokFontsLoaded();
			await bootstrapDesigns();
			bootstrapped = true;
		})();
		return () => window.removeEventListener('keydown', onKey);
	});

	onDestroy(() => {
		if (renderTimer) clearTimeout(renderTimer);
		if (saveTimer) clearTimeout(saveTimer);
		revokeBlobUrls();
	});

	const revokeBlobUrls = () => {
		layers.forEach((layer) => {
			if (layer.src?.startsWith('blob:')) URL.revokeObjectURL(layer.src);
		});
	};

	const markDirty = () => {
		if (!bootstrapped || hydrating || !activeDesignId) return;
		scheduleSave();
	};

	const scheduleSave = () => {
		if (saveTimer) clearTimeout(saveTimer);
		saveTimer = setTimeout(() => {
			persistDesign();
		}, 800);
	};

	const schedulePreview = () => {
		if (renderTimer) clearTimeout(renderTimer);
		renderTimer = setTimeout(() => {
			renderExportPreview();
		}, 40);
	};

	const bootstrapDesigns = async () => {
		try {
			designs = (await listDesigns()) || [];
		} catch (err) {
			console.error(err);
			saveError = 'Could not load designs.';
			designs = [];
			return;
		}

		const storedId = getActiveDesignId();
		const match = designs.find((d) => d.id === storedId);
		if (match) {
			await loadDesign(match.id);
		} else if (designs.length) {
			await loadDesign(designs[0].id);
		}
		// Empty list: stay on empty canvas; user clicks "+ New design"
	};

	const refreshDesignList = async () => {
		try {
			designs = (await listDesigns()) || [];
		} catch (err) {
			console.error(err);
		}
	};

	const resetEditorState = () => {
		revokeBlobUrls();
		layers = [];
		selectedLayerId = null;
		editingLayerId = null;
		deleteConfirmForId = null;
		exportPreview = '';
		dirtyLayerIds = new Set();
	};

	const ratiosToEditorLayers = (ratioLayers, pageW, pageH) => {
		const minSide = Math.min(pageW, pageH);
		return (ratioLayers || []).map((layer) => {
			const base = {
				id: layer.id,
				type: layer.type || 'text',
				name: layer.name || '',
				parentId: layer.parentId || null,
				x: (layer.xRatio || 0) * pageW,
				y: (layer.yRatio || 0) * pageH,
				width: Math.max(1, (layer.widthRatio || 0) * pageW),
				height: Math.max(1, (layer.heightRatio || 0) * pageH),
				radius: (layer.radiusRatio || 0) * minSide,
				opacity: layer.opacity ?? 1,
				rotation: layer.rotation || 0
			};

			if (layer.type === 'group') {
				return { ...base, type: 'group', width: Math.max(40, base.width), height: Math.max(40, base.height) };
			}

			if (layer.type === 'image') {
				return { ...base, src: layer.src || '' };
			}

			const runs =
				ratiosToRuns(layer.runs, pageH) ||
				ensureRuns({
					type: 'text',
					text: layer.text || '',
					fontSize: Math.max(10, (layer.fontSizeRatio || 0.04) * pageH),
					fontFamily: layer.fontFamily || DEFAULT_TIKTOK_FONT.cssFamily,
					textColor: layer.textColor || '#ffffff'
				}).runs;

			return ensureRuns({
				...base,
				text: runsToPlainText(runs),
				runs,
				fontSize: runs[0]?.fontSize || 42,
				textColor: runs[0]?.color || '#ffffff',
				fontFamily: runs[0]?.fontFamily || DEFAULT_TIKTOK_FONT.cssFamily,
				lineHeight: layer.lineHeight ?? 1.15,
				padding:
					layer.padding != null
						? Number(layer.padding)
						: Math.max(0, (layer.paddingRatio || 0) * minSide) || 12,
				respectBounds: layer.respectBounds !== false,
				strokeEnabled: !!layer.strokeEnabled,
				strokeColor: layer.strokeColor || '#000000',
				strokeWidth: Math.max(0, (layer.strokeWidthRatio || 0) * pageH),
				backgroundEnabled: !!layer.backgroundEnabled,
				backgroundColor: layer.backgroundColor || '#f8fafc',
				backgroundOpacity: layer.backgroundOpacity ?? 0.75,
				backgroundStrokeColor: layer.backgroundStrokeColor || '#2563eb',
				backgroundStrokeWidth: Math.max(0, (layer.backgroundStrokeWidthRatio || 0) * pageH),
				backgroundRadius: Math.max(0, (layer.backgroundRadiusRatio || 0) * minSide),
				backgroundPaddingX: Math.max(0, (layer.backgroundPaddingXRatio || 0) * pageW),
				backgroundPaddingY: Math.max(0, (layer.backgroundPaddingYRatio || 0) * pageH)
			});
		});
	};

	const loadDesign = async (id) => {
		hydrating = true;
		saveError = '';
		if (saveTimer) clearTimeout(saveTimer);

		try {
			const design = await getDesign(id);
			resetEditorState();
			activeDesignId = design.id;
			setActiveDesignId(design.id);
			designName = design.name || 'Untitled';
			canvasWidth = design.width || TIKTOK_SIZE.width;
			canvasHeight = design.height || TIKTOK_SIZE.height;

			await tick();
			await new Promise((r) => requestAnimationFrame(r));

			const rect = pageEl?.getBoundingClientRect();
			const pageW = rect?.width || 360;
			const pageH = rect?.height || pageW * (canvasHeight / canvasWidth);
			layers = ratiosToEditorLayers(design.layers, pageW, pageH).map((layer) =>
				withFittedTextBounds(layer)
			);
			schedulePreview();
		} catch (err) {
			console.error(err);
			saveError = 'Could not open design.';
		} finally {
			hydrating = false;
			dirtyLayerIds = new Set();
		}
	};

	const layersForApi = () => {
		const ratioLayers = layersToRatios();
		return ratioLayers.map(({ src, ...rest }) => rest);
	};

	const persistDesign = async () => {
		if (!activeDesignId || hydrating || saving) return;
		saving = true;
		saveError = '';
		try {
			await tick();
			const payload = {
				name: designName,
				layers: layersForApi(),
				layerImageBlobs: {}
			};

			for (const layer of layers) {
				if (layer.type !== 'image' || !layer.src) continue;
				if (dirtyLayerIds.has(layer.id) || layer.src.startsWith('blob:')) {
					payload.layerImageBlobs[layer.id] = await urlToBlob(layer.src);
				}
			}

			let thumbUrl = exportPreview;
			if (!thumbUrl) {
				thumbUrl = await createTikTokThumbnail({
					layers: layersToRatios(),
					width: canvasWidth,
					height: canvasHeight
				});
			}
			if (thumbUrl) {
				payload.thumbnailBlob = await urlToBlob(thumbUrl);
			}

			const updated = await updateDesign(activeDesignId, payload);
			applyServerUrls(updated);
			dirtyLayerIds = new Set();
			await refreshDesignList();
		} catch (err) {
			console.error(err);
			saveError = 'Save failed.';
		} finally {
			saving = false;
		}
	};

	const applyServerUrls = (design) => {
		if (!design) return;

		const byId = {};
		(design.layers || []).forEach((l) => {
			if (l.id) byId[l.id] = l;
		});
		layers = layers.map((layer) => {
			if (layer.type !== 'image') return layer;
			const remote = byId[layer.id]?.src;
			if (remote && layer.src?.startsWith('blob:')) {
				URL.revokeObjectURL(layer.src);
				return { ...layer, src: remote };
			}
			if (remote && !dirtyLayerIds.has(layer.id)) {
				return { ...layer, src: remote };
			}
			return layer;
		});
	};

	const onCreateDesign = async (e) => {
		const { name, width, height } = e.detail;
		showNewModal = false;
		saving = true;
		saveError = '';
		try {
			const created = await createDesign({
				name,
				width,
				height,
				layers: []
			});
			await refreshDesignList();
			await loadDesign(created.id);
		} catch (err) {
			console.error(err);
			saveError = 'Could not create design.';
			showNewModal = true;
		} finally {
			saving = false;
		}
	};

	const onSelectDesign = async (e) => {
		const id = e.detail.id;
		if (id === activeDesignId) return;
		if (saveTimer) {
			clearTimeout(saveTimer);
			await persistDesign();
		}
		await loadDesign(id);
	};

	const onDuplicateDesign = async (e) => {
		const id = e.detail.id;
		saving = true;
		try {
			if (saveTimer) {
				clearTimeout(saveTimer);
				await persistDesign();
			}
			const copy = await duplicateDesign(id);
			await refreshDesignList();
			await loadDesign(copy.id);
		} catch (err) {
			console.error(err);
			saveError = 'Duplicate failed.';
		} finally {
			saving = false;
		}
	};

	const onDeleteDesign = async (e) => {
		const id = e.detail.id;
		try {
			await deleteDesign(id);
			if (activeDesignId === id) {
				setActiveDesignId(null);
				activeDesignId = null;
				resetEditorState();
			}
			await refreshDesignList();
			if (!activeDesignId && designs.length) {
				await loadDesign(designs[0].id);
			}
			// Leave empty state alone — user opens "+ New design"
		} catch (err) {
			console.error(err);
			saveError = 'Delete failed.';
		}
	};

	const onRenameDesign = async (e) => {
		const { id, name } = e.detail;
		try {
			await updateDesign(id, { name });
			if (id === activeDesignId) designName = name;
			await refreshDesignList();
		} catch (err) {
			console.error(err);
			saveError = 'Rename failed.';
		}
	};

	const withFittedTextBounds = (layer) => {
		if (layer.type !== 'text') return layer;
		const ensured = ensureRuns(layer);
		const pad = ensured.padding ?? 12;
		// Keep the user-set box width; wrap inside it. Do not cap at 280px.
		const boxW = Math.max(40, ensured.width || 80);
		const wrapW =
			ensured.respectBounds === false ? 1e9 : boxW;
		const measured = measureRuns(ensured.runs, {
			maxWidth: wrapW,
			lineHeight: ensured.lineHeight ?? 1.15,
			padding: pad
		});
		return {
			...ensured,
			text: runsToPlainText(ensured.runs),
			width: boxW,
			height: Math.max(measured.height, 24),
			fontSize: ensured.runs[0]?.fontSize || ensured.fontSize || 42,
			textColor: ensured.runs[0]?.color || ensured.textColor || '#ffffff',
			fontFamily: ensured.runs[0]?.fontFamily || ensured.fontFamily
		};
	};

	const addTextLayer = () => {
		const id = `layer-${Date.now()}`;
		const style = defaultRunStyle();
		const newLayer = withFittedTextBounds({
			id,
			type: 'text',
			parentId: null,
			x: 40,
			y: 80,
			width: 200,
			height: 60,
			radius: 0,
			opacity: 1,
			text: 'Your headline',
			runs: [{ text: 'Your headline', ...style }],
			fontSize: style.fontSize,
			textColor: style.color,
			fontFamily: style.fontFamily,
			lineHeight: 1.15,
			padding: 12,
			rotation: 0,
			respectBounds: true,
			strokeEnabled: false,
			strokeColor: '#000000',
			strokeWidth: 3,
			backgroundEnabled: false,
			backgroundColor: '#f8fafc',
			backgroundOpacity: 0.75,
			backgroundStrokeColor: '#2563eb',
			backgroundStrokeWidth: 2,
			backgroundRadius: 10,
			backgroundPaddingX: 14,
			backgroundPaddingY: 10
		});
		layers = [...layers, newLayer];
		selectedLayerId = id;
		editingLayerId = null;
		deleteConfirmForId = null;
		schedulePreview();
		markDirty();
	};

	const addGroupLayer = () => {
		const id = `layer-${Date.now()}`;
		layers = [
			...layers,
			{
				id,
				type: 'group',
				name: 'Group',
				parentId: null,
				x: 24,
				y: 24,
				width: 120,
				height: 80,
				opacity: 1,
				rotation: 0
			}
		];
		selectedLayerId = id;
		editingLayerId = null;
		markDirty();
	};

	const addImageLayerFromFile = (file) => {
		if (!file) return;
		const id = `layer-${Date.now()}`;
		const src = URL.createObjectURL(file);
		const newLayer = {
			id,
			type: 'image',
			parentId: null,
			src,
			x: 48,
			y: 120,
			width: 160,
			height: 160,
			radius: 12,
			opacity: 1,
			rotation: 0
		};
		layers = [...layers, newLayer];
		selectedLayerId = id;
		editingLayerId = null;
		deleteConfirmForId = null;
		dirtyLayerIds = new Set([...dirtyLayerIds, id]);
		schedulePreview();
		markDirty();
	};

	const onAddImageLayerClick = () => {
		imageLayerInput?.click();
	};

	const onImageLayerFile = (e) => {
		const file = e.currentTarget.files?.[0];
		if (file) addImageLayerFromFile(file);
		e.currentTarget.value = '';
	};

	const replaceImageLayer = ({ id, file }) => {
		if (!file) return;
		layers = layers.map((layer) => {
			if (layer.id !== id) return layer;
			if (layer.src?.startsWith('blob:')) URL.revokeObjectURL(layer.src);
			return { ...layer, src: URL.createObjectURL(file) };
		});
		dirtyLayerIds = new Set([...dirtyLayerIds, id]);
		schedulePreview();
		markDirty();
	};

	const updateLayer = async (id, patch) => {
		await ensureTikTokFontsLoaded();
		const current = layers.find((l) => l.id === id);

		// Group width/height sliders scale nested layers proportionally
		if (
			current?.type === 'group' &&
			(patch.width != null || patch.height != null) &&
			Object.keys(patch).every((k) => k === 'width' || k === 'height')
		) {
			const bounds = getSubtreeBounds(layers, id);
			if (bounds) {
				layers = scaleSubtree(
					layers,
					id,
					bounds,
					patch.width ?? bounds.width,
					patch.height ?? bounds.height
				);
				schedulePreview();
				markDirty();
				return;
			}
		}

		layers = layers.map((layer) => {
			if (layer.id !== id) return layer;
			let next = { ...layer, ...patch };
			if (
				next.type === 'text' &&
				(patch.runs ||
					patch.text ||
					patch.padding != null ||
					patch.lineHeight != null ||
					patch.width != null ||
					patch.fontSize != null)
			) {
				if (patch.text && !patch.runs) {
					const style = next.runs?.[0] || defaultRunStyle();
					next.runs = [{ ...style, text: patch.text }];
				}
				next = withFittedTextBounds(next);
			}
			return next;
		});
		schedulePreview();
		markDirty();
	};

	const onRichTextChange = (id, detail) => {
		updateLayer(id, { runs: detail.runs, text: detail.text });
	};

	const onRichFormatAll = (id, patch) => {
		const layer = layers.find((l) => l.id === id);
		if (!layer) return;
		const baseRuns =
			layer.runs?.length > 0
				? layer.runs
				: [{ text: layer.text || '', ...defaultRunStyle() }];
		const runs = baseRuns.map((r) => ({ ...r, ...patch }));
		const layerPatch = { runs, text: runsToPlainText(runs) };
		if (patch.fontSize != null) layerPatch.fontSize = patch.fontSize;
		if (patch.color != null) layerPatch.textColor = patch.color;
		if (patch.fontFamily != null) layerPatch.fontFamily = patch.fontFamily;
		updateLayer(id, layerPatch);
	};

	const onRichStyle = (e) => {
		const { id, patch } = e.detail || {};
		if (!id || !patch) return;
		onRichFormatAll(id, patch);
	};

	const selectLayer = (id) => {
		if (editingLayerId && editingLayerId !== id) editingLayerId = null;
		if (selectedLayerId === id) {
			deleteConfirmForId = deleteConfirmForId === id ? null : id;
		} else {
			deleteConfirmForId = null;
		}
		selectedLayerId = id;
	};

	const enterTextEdit = (id) => {
		selectedLayerId = id;
		editingLayerId = id;
		deleteConfirmForId = null;
	};

	const deleteSelected = () => {
		if (!selectedLayerId) return;
		const doomedIds = new Set([selectedLayerId, ...getDescendantIds(layers, selectedLayerId)]);
		layers.forEach((l) => {
			if (doomedIds.has(l.id) && l.src?.startsWith('blob:')) URL.revokeObjectURL(l.src);
		});
		const next = deleteSubtree(layers, selectedLayerId);
		layers = next;
		if (editingLayerId && doomedIds.has(editingLayerId)) editingLayerId = null;
		selectedLayerId = next.length ? next[next.length - 1].id : null;
		deleteConfirmForId = null;
		schedulePreview();
		markDirty();
	};

	const onLayersReorder = (e) => {
		layers = e.detail.layers;
		markDirty();
		schedulePreview();
	};

	const duplicateTextLayer = () => {
		if (!selectedLayer || selectedLayer.type !== 'text') return;
		const id = `layer-${Date.now()}`;
		const baseText = String(selectedLayer.text || 'Text').replace(/\s*\(\d+\)\s*$/, '');
		const siblings = layers.filter(
			(l) => l.type === 'text' && String(l.text || '').startsWith(baseText)
		);
		const n = siblings.length + 1;
		const label = `${baseText} (${n})`;
		const runs = (selectedLayer.runs?.length
			? selectedLayer.runs
			: [{ text: selectedLayer.text || '', ...defaultRunStyle() }]
		).map((r, i) => (i === 0 ? { ...r, text: label } : { ...r }));
		if (runs.length === 1) runs[0].text = label;
		const copy = withFittedTextBounds({
			...selectedLayer,
			id,
			parentId: selectedLayer.parentId || null,
			x: selectedLayer.x,
			y: selectedLayer.y + selectedLayer.height + 12,
			text: label,
			runs
		});
		layers = [...layers, copy];
		selectedLayerId = id;
		deleteConfirmForId = null;
		schedulePreview();
		markDirty();
	};

	const centerLayer = ({ axis }) => {
		if (!selectedLayer || !pageEl) return;
		const rect = pageEl.getBoundingClientRect();

		if (selectedLayer.type === 'group') {
			const bounds = getSubtreeBounds(layers, selectedLayer.id);
			if (!bounds) return;
			const dx =
				axis === 'x' ? (rect.width - bounds.width) / 2 - bounds.x : 0;
			const dy =
				axis === 'y' ? (rect.height - bounds.height) / 2 - bounds.y : 0;
			if (!dx && !dy) return;
			layers = applyDeltaToSubtree(layers, selectedLayer.id, dx, dy);
			schedulePreview();
			markDirty();
			return;
		}

		if (axis === 'x') {
			updateLayer(selectedLayer.id, {
				x: (rect.width - selectedLayer.width) / 2
			});
		} else {
			updateLayer(selectedLayer.id, {
				y: (rect.height - selectedLayer.height) / 2
			});
		}
	};

	/** Visual frame for a layer; groups wrap all nested content. */
	const layerFrame = (layer) => {
		if (layer.type !== 'group') return layer;
		return getSubtreeBounds(layers, layer.id) || layer;
	};

	/** Topmost descendant under a point (page-local coords), for drill-in. */
	const descendantAtPoint = (groupId, localX, localY) => {
		const ids = new Set(getDescendantIds(layers, groupId));
		for (let i = paintLayers.length - 1; i >= 0; i--) {
			const layer = paintLayers[i];
			if (!ids.has(layer.id) || layer.type === 'group') continue;
			const f = layerFrame(layer);
			if (
				localX >= f.x &&
				localX <= f.x + f.width &&
				localY >= f.y &&
				localY <= f.y + f.height
			) {
				return layer;
			}
		}
		return null;
	};

	const onGroupDblClick = (event, groupId) => {
		if (!pageEl) return;
		const rect = pageEl.getBoundingClientRect();
		const child = descendantAtPoint(
			groupId,
			event.clientX - rect.left,
			event.clientY - rect.top
		);
		if (!child) return;
		selectLayer(child.id);
		if (child.type === 'text') enterTextEdit(child.id);
	};

	const startLayerDrag = (event, layerId, mode = 'move') => {
		if (editingLayerId === layerId) return;
		event.preventDefault();
		const layer = layers.find((l) => l.id === layerId);
		if (!layer) return;

		selectedLayerId = layerId;
		deleteConfirmForId = null;
		const subtreeIds = new Set([layerId, ...getDescendantIds(layers, layerId)]);
		const members = layers.filter((l) => subtreeIds.has(l.id));
		const starts = Object.fromEntries(members.map((l) => [l.id, { x: l.x, y: l.y }]));

		// Bounds of content (or the layer itself) — clamp the shared delta against these
		const boundMembers = members.filter((l) => l.type !== 'group');
		const forBounds = boundMembers.length ? boundMembers : members;
		let minX = Infinity;
		let minY = Infinity;
		let maxX = -Infinity;
		let maxY = -Infinity;
		for (const l of forBounds) {
			const x = l.x || 0;
			const y = l.y || 0;
			const w = Math.max(1, l.width || 1);
			const h = Math.max(1, l.height || 1);
			minX = Math.min(minX, x);
			minY = Math.min(minY, y);
			maxX = Math.max(maxX, x + w);
			maxY = Math.max(maxY, y + h);
		}

		activeDrag = {
			id: layerId,
			mode,
			startX: event.clientX,
			startY: event.clientY,
			startLayer: { ...layer },
			starts,
			startBounds: { minX, minY, maxX, maxY },
			startLayers:
				mode === 'resize' && layer.type === 'group'
					? layers.map((l) => ({
							...l,
							runs: l.runs?.map((r) => ({ ...r }))
					  }))
					: null
		};

		const onMove = (e) => {
			if (!activeDrag) return;
			let dx = e.clientX - activeDrag.startX;
			let dy = e.clientY - activeDrag.startY;
			const base = activeDrag.startLayer;

			if (activeDrag.mode === 'resize') {
				if (base.type === 'group' && activeDrag.startLayers && activeDrag.startBounds) {
					const b = activeDrag.startBounds;
					const bw = Math.max(8, b.maxX - b.minX);
					const bh = Math.max(8, b.maxY - b.minY);
					let nextW = Math.max(24, bw + dx);
					let nextH = Math.max(24, bh + dy);
					if (pageEl) {
						const page = pageEl.getBoundingClientRect();
						nextW = Math.min(nextW, Math.max(24, page.width - b.minX));
						nextH = Math.min(nextH, Math.max(24, page.height - b.minY));
					}
					layers = scaleSubtree(
						activeDrag.startLayers,
						layerId,
						{ x: b.minX, y: b.minY, width: bw, height: bh },
						nextW,
						nextH
					);
					schedulePreview();
				} else if (base.type === 'text') {
					updateLayer(layerId, { width: Math.max(40, base.width + dx) });
				} else if (base.type !== 'group') {
					updateLayer(layerId, {
						width: Math.max(24, base.width + dx),
						height: Math.max(24, base.height + dy)
					});
				}
			} else {
				// Shared delta keeps groups rigid. Oversized layers can pan past the
				// artboard edge (old clamp locked them when width/height ≥ canvas).
				if (pageEl && activeDrag.startBounds) {
					const page = pageEl.getBoundingClientRect();
					const b = activeDrag.startBounds;
					const minVisible = 32;
					const minDx = minVisible - b.maxX;
					const maxDx = page.width - minVisible - b.minX;
					const minDy = minVisible - b.maxY;
					const maxDy = page.height - minVisible - b.minY;
					dx = Math.max(minDx, Math.min(dx, maxDx));
					dy = Math.max(minDy, Math.min(dy, maxDy));
				}
				layers = layers.map((l) => {
					const s = activeDrag.starts[l.id];
					if (!s) return l;
					return { ...l, x: s.x + dx, y: s.y + dy };
				});
				schedulePreview();
			}
		};

		const onUp = () => {
			activeDrag = null;
			window.removeEventListener('mousemove', onMove);
			window.removeEventListener('mouseup', onUp);
			markDirty();
		};

		window.addEventListener('mousemove', onMove);
		window.addEventListener('mouseup', onUp);
	};

	const layersToRatios = () => {
		if (!pageEl) return [];
		const rect = pageEl.getBoundingClientRect();
		if (!rect.width || !rect.height) return [];
		const minSide = Math.min(rect.width, rect.height);

		return walkPaintOrder(layers).map((layer) => {
			const base = {
				id: layer.id,
				type: layer.type || 'square',
				name: layer.name || '',
				parentId: layer.parentId || null,
				src: layer.src || '',
				xRatio: layer.x / rect.width,
				yRatio: layer.y / rect.height,
				widthRatio: layer.width / rect.width,
				heightRatio: layer.height / rect.height,
				radiusRatio: (layer.radius || 0) / minSide,
				opacity: layer.opacity ?? 1,
				rotation: layer.rotation || 0
			};

			if (layer.type === 'group') return base;

			if (layer.type === 'image') return base;

			const ensured = ensureRuns(layer);
			return {
				...base,
				text: runsToPlainText(ensured.runs),
				runs: runsToRatios(ensured.runs, rect.height),
				fontSizeRatio: (ensured.runs[0]?.fontSize || 32) / rect.height,
				textColor: ensured.runs[0]?.color || '#ffffff',
				fontFamily: ensured.runs[0]?.fontFamily || DEFAULT_TIKTOK_FONT.cssFamily,
				lineHeight: ensured.lineHeight ?? 1.15,
				paddingRatio: (ensured.padding ?? 12) / minSide,
				respectBounds: ensured.respectBounds !== false,
				strokeEnabled: !!ensured.strokeEnabled,
				strokeColor: ensured.strokeColor || '#000000',
				strokeWidthRatio: (ensured.strokeWidth || 2) / Math.max(1, rect.height),
				backgroundEnabled: !!ensured.backgroundEnabled,
				backgroundColor: ensured.backgroundColor || '#f8fafc',
				backgroundOpacity: ensured.backgroundOpacity ?? 0.75,
				backgroundStrokeColor: ensured.backgroundStrokeColor || '#2563eb',
				backgroundStrokeWidthRatio:
					(ensured.backgroundStrokeWidth || 2) / Math.max(1, rect.height),
				backgroundRadiusRatio: (ensured.backgroundRadius || 10) / minSide,
				backgroundPaddingXRatio: (ensured.backgroundPaddingX || 14) / Math.max(1, rect.width),
				backgroundPaddingYRatio: (ensured.backgroundPaddingY || 10) / Math.max(1, rect.height)
			};
		});
	};

	const renderExportPreview = async () => {
		await tick();
		if (!pageEl) return;
		try {
			exportPreview = await createTikTokThumbnail({
				layers: layersToRatios(),
				width: canvasWidth,
				height: canvasHeight
			});
		} catch (err) {
			console.error(err);
		}
	};

	const downloadPng = async () => {
		exporting = true;
		try {
			await tick();
			const dataUrl = await createTikTokThumbnail({
				layers: layersToRatios(),
				width: canvasWidth,
				height: canvasHeight
			});
			exportPreview = dataUrl;
			const a = document.createElement('a');
			a.href = dataUrl;
			a.download = `design-${canvasWidth}x${canvasHeight}.png`;
			a.click();
		} catch (err) {
			console.error(err);
			alert('Could not export PNG. Check the console for details.');
		} finally {
			exporting = false;
		}
	};
</script>

<div class="tiktok-studio">
	<DesignStrip
		{designs}
		activeId={activeDesignId}
		{saving}
		{saveError}
		on:new={() => (showNewModal = true)}
		on:select={onSelectDesign}
		on:duplicate={onDuplicateDesign}
		on:delete={onDeleteDesign}
		on:rename={onRenameDesign}
	/>

	<NewDesignModal
		open={showNewModal}
		on:cancel={() => (showNewModal = false)}
		on:create={onCreateDesign}
	/>

	<header class="studio-header">
		<div>
			<h1>{designName || 'Design Studio'}</h1>
			<p class="sub">
				{canvasWidth} × {canvasHeight}
				{#if activeDesignId}
					· auto-saved
				{:else}
					· create a design to start
				{/if}
			</p>
		</div>
		<button type="button" class="primary" disabled={exporting || !activeDesignId} on:click={downloadPng}>
			{exporting ? 'Exporting…' : 'Download PNG'}
		</button>
	</header>

	<div class="toolbar">
		<button type="button" disabled={!activeDesignId} on:click={addTextLayer}>Add text</button>
		<button type="button" disabled={!activeDesignId} on:click={onAddImageLayerClick}>Add image</button>
		<input
			bind:this={imageLayerInput}
			type="file"
			accept="image/*"
			hidden
			on:change={onImageLayerFile}
		/>
	</div>

	<div class="workspace">
		<div class="preview-col">
			<div class="page" bind:this={pageEl} style="aspect-ratio: {aspectRatio};">
				{#if exportPreview && !editingLayerId}
					<img class="page-render" src={exportPreview} alt="" />
				{/if}
				{#if !layers.length}
					<p class="empty-hint">
						{activeDesignId ? 'Add text or an image to start' : 'Create a design to start'}
					</p>
				{/if}
				{#each paintLayers as layer (layer.id)}
					<div
						class="layer"
						class:selected={selectedLayerId === layer.id}
						class:editing={editingLayerId === layer.id}
						class:text={layer.type === 'text'}
						class:image={layer.type === 'image'}
						class:group={layer.type === 'group'}
						class:group-filled={layer.type === 'group' && getChildren(layers, layer.id).length > 0}
						class:locked-by-group={lockedBySelectedGroup.has(layer.id)}
						class:ghost={!!exportPreview && !editingLayerId}
						style="left:{layerFrame(layer).x}px;top:{layerFrame(layer).y}px;width:{layerFrame(layer).width}px;height:{layerFrame(layer).height}px;opacity:{exportPreview && !editingLayerId ? 1 : layer.opacity ?? 1};border-radius:{layer.radius || 0}px;transform:rotate({layer.rotation || 0}deg);{layer.type === 'image' && layer.src && !(exportPreview && !editingLayerId)
							? `background-image:url(${layer.src});`
							: ''}"
						on:mousedown={(e) => {
							if (editingLayerId === layer.id) return;
							if (lockedBySelectedGroup.has(layer.id)) return;
							startLayerDrag(e, layer.id, 'move');
						}}
						on:click={() => {
							if (lockedBySelectedGroup.has(layer.id)) return;
							selectLayer(layer.id);
						}}
						on:dblclick={(e) => {
							if (layer.type === 'group') {
								onGroupDblClick(e, layer.id);
								return;
							}
							if (layer.type === 'text') enterTextEdit(layer.id);
						}}
						role="button"
						tabindex="0"
						on:keydown={(e) => e.key === 'Enter' && selectLayer(layer.id)}
					>
						{#if layer.type === 'text'}
							<RichTextEditor
								{layer}
								editing={editingLayerId === layer.id}
								on:change={(e) => onRichTextChange(layer.id, e.detail)}
								on:formatall={(e) => onRichFormatAll(layer.id, e.detail)}
							/>
						{:else if layer.type === 'group'}
							<span class="group-label">{layer.name || 'Group'}</span>
						{/if}
						{#if selectedLayerId === layer.id}
							<span
								class="layer-resize-handle"
								title={layer.type === 'group'
									? 'Resize group'
									: layer.type === 'text'
										? 'Resize text box'
										: 'Resize'}
								on:mousedown|stopPropagation={(e) => startLayerDrag(e, layer.id, 'resize')}
								role="presentation"
							/>
						{/if}
					</div>
				{/each}
			</div>
			{#if exportPreview}
				<figure class="export-thumb">
					<img
						src={exportPreview}
						alt="Export preview"
						style="aspect-ratio: {aspectRatio};"
					/>
					<figcaption>Export preview ({canvasWidth}×{canvasHeight})</figcaption>
				</figure>
			{/if}
		</div>

		<div class="side-col">
			<LayersPanel
				{layers}
				{selectedLayerId}
				on:select={(e) => selectLayer(e.detail.id)}
				on:reorder={onLayersReorder}
				on:addgroup={addGroupLayer}
			/>

			{#if selectedLayer}
				<LayerControls
					title="Layer Controls"
					{layers}
					{selectedLayer}
					{selectedLayerId}
					{deleteConfirmForId}
					verticalCenterUsesFold={false}
					showCenterLink={false}
					showLayerTabs={false}
					showTextBoxControls={true}
					fontOptions={TIKTOK_FONTS}
					showRespectBounds={true}
					on:selecttab={(e) => selectLayer(e.detail.id)}
					on:deleteselected={deleteSelected}
					on:updatelayer={(e) => updateLayer(e.detail.id, e.detail.patch)}
					on:centerlayer={(e) => centerLayer(e.detail)}
					on:duplicatetextlayer={duplicateTextLayer}
					on:replaceimagelayer={(e) => replaceImageLayer(e.detail)}
					on:richstyle={onRichStyle}
				/>
			{:else}
				<p class="side-hint">Select a layer or add text / image.</p>
			{/if}
		</div>
	</div>
</div>

<style>
	.tiktok-studio {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		width: 100%;
		color: #0f172a;
	}
	.studio-header {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
	}
	.studio-header h1 {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 800;
		letter-spacing: -0.02em;
	}
	.sub {
		margin: 0.25rem 0 0;
		font-size: 0.85rem;
		color: #64748b;
	}
	.primary {
		border: none;
		border-radius: 0.65rem;
		padding: 0.65rem 1.1rem;
		font-weight: 700;
		cursor: pointer;
		background: #0f172a;
		color: #fff;
	}
	.primary:disabled {
		opacity: 0.55;
		cursor: wait;
	}
	.toolbar {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}
	.toolbar button {
		border: 1px solid #cbd5e1;
		border-radius: 0.55rem;
		padding: 0.45rem 0.75rem;
		font-size: 0.85rem;
		font-weight: 600;
		background: #fff;
		cursor: pointer;
		color: #0f172a;
	}
	.toolbar button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.workspace {
		display: grid;
		grid-template-columns: minmax(240px, 360px) minmax(280px, 1fr);
		gap: 1.25rem;
		align-items: start;
	}
	@media (max-width: 800px) {
		.workspace {
			grid-template-columns: 1fr;
		}
	}
	.page {
		position: relative;
		width: 100%;
		background: #0f172a;
		overflow: hidden;
		box-shadow: 0 12px 40px rgba(15, 23, 42, 0.18);
		background-repeat: no-repeat;
	}
	.empty-hint {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		margin: 0;
		color: #94a3b8;
		font-size: 0.9rem;
		pointer-events: none;
	}
	.page-render {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: contain;
		object-position: center;
		pointer-events: none;
		z-index: 0;
	}
	.layer {
		position: absolute;
		box-sizing: border-box;
		border: none;
		outline: 2px solid transparent;
		outline-offset: -2px;
		cursor: move;
		user-select: none;
		background-size: cover;
		background-position: center;
		background-repeat: no-repeat;
		z-index: 1;
	}
	.layer.selected {
		outline-color: #3b82f6;
	}
	.layer.ghost :global(.rich-wrap) {
		visibility: hidden;
	}
	.layer.ghost.image {
		background-color: transparent;
	}
	.layer.group {
		border: 1px dashed rgba(148, 163, 184, 0.7);
		background: rgba(148, 163, 184, 0.12);
		display: flex;
		align-items: flex-start;
		padding: 0.25rem 0.4rem;
		z-index: 0;
	}
	.layer.group.group-filled {
		background: transparent;
	}
	/* Unselected groups must not steal clicks from nested layers */
	.layer.group.group-filled:not(.selected) {
		pointer-events: none;
		border-color: transparent;
		background: transparent;
	}
	.layer.group.group-filled:not(.selected) .group-label {
		display: none;
	}
	.layer.group.selected {
		outline: 2px solid #3b82f6;
		outline-offset: -2px;
		background: rgba(59, 130, 246, 0.06);
		z-index: 4;
		pointer-events: auto;
	}
	.layer.locked-by-group {
		pointer-events: none;
	}
	.group-label {
		font-size: 0.65rem;
		font-weight: 700;
		color: #94a3b8;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}
	.layer.editing {
		z-index: 5;
		cursor: text;
	}
	.layer.text {
		display: block;
		overflow: visible;
		background: transparent;
		font-weight: 700;
		line-height: 1.15;
		padding: 0;
	}
	.layer.text.selected {
		outline-color: #3b82f6;
	}
	.layer.image {
		background-color: rgba(15, 23, 42, 0.2);
		background-size: cover;
		background-position: center;
		background-repeat: no-repeat;
		overflow: hidden;
	}
	.layer-text {
		display: block;
		width: max-content;
		max-width: none;
		paint-order: stroke fill;
	}
	.layer-resize-handle {
		position: absolute;
		right: -6px;
		bottom: -6px;
		width: 14px;
		height: 14px;
		border-radius: 3px;
		background: #3b82f6;
		cursor: nwse-resize;
	}
	.layer-resize-handle.font-size {
		border-radius: 999px;
		cursor: ns-resize;
		background: #2563eb;
		box-shadow: 0 0 0 2px #fff;
	}
	.side-hint {
		margin: 0;
		color: #64748b;
		font-size: 0.9rem;
	}
	.export-thumb {
		margin: 0.75rem 0 0;
		width: 100%;
	}
	.export-thumb img {
		width: 100%;
		height: auto;
		object-fit: contain;
		object-position: center;
		background: #0f172a;
		border: 1px solid #e2e8f0;
		display: block;
	}
	.export-thumb figcaption {
		margin-top: 0.35rem;
		font-size: 0.72rem;
		color: #64748b;
	}

	.side-col :global(.layer-controls-card) {
		background: #f8fafc;
		border-color: #cbd5e1;
	}
	.side-col :global(.control-group-title) {
		color: #334155;
	}
	.side-col :global(.layer-tab),
	.side-col :global(.layer-mini-btn) {
		background: #fff;
		color: #0f172a;
		border-color: #cbd5e1;
	}
	.side-col :global(.layer-tab.active),
	.side-col :global(.layer-mini-btn.active) {
		background: #dbeafe;
		color: #1e3a8a;
	}
	.side-col :global(.layer-controls-grid input[type='text']),
	.side-col :global(.layer-controls-grid select),
	.side-col :global(.layer-controls-grid textarea) {
		background: #fff;
		color: #0f172a;
		border-color: #cbd5e1;
	}
	.side-col :global(.duplicate-text-hint),
	.side-col :global(.layer-hint) {
		color: #64748b;
	}
	.side-col :global(.font-picker) {
		background: #fff;
		border-color: #cbd5e1;
	}
	.side-col :global(.font-option) {
		color: #0f172a;
	}
	.side-col :global(.font-option.active) {
		background: #dbeafe;
		border-color: #93c5fd;
	}
</style>
