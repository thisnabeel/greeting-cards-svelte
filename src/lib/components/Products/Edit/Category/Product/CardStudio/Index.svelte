<script>
  // @ts-nocheck
  import { onMount, tick } from 'svelte';
  import Api from '$lib/api/api.js';
  import {
    getSheetSize,
    loadImage,
    createCardImage,
    createMockFrontFromPrint,
    createMockBackFromPrint,
    createMockInsidePanelsFromPrint
  } from '$lib/cardStudio/mocks.js';
  import LayerControls from './LayerControls.svelte';

  export let product;

  let frontUrl = '';
  let insideUrl = '';
  let frontPrintUrl = '';
  let insidePrintUrl = '';
  let mockView = 'front'; // 'front' | 'inside' | 'back'
  let foldRatioFront = 0.5; // 0 (top) – 1 (bottom)
  let foldRatioInside = 0.5; // 0 (top) – 1 (bottom)
  $: foldRatioInside = foldRatioFront;
  let frontScale = 1;
  let frontOffsetX = 0;
  let frontOffsetY = 0;
  let mockFrontUrl = '';
  let mockBackUrl = '';
  let mockInsideLeftUrl = '';
  let mockInsideRightUrl = '';
  let cardTitle = '';

  let loading = false;
  let saving = false;
  let error = '';
  let savedAt = null;

  const imprintLine1 = 'lamha paper co.';
  const imprintLine2 = 'a design studio';
  const imprintLine3 = 'www.lamhapaper.co  •  Handmade in Fremont, CA';

  let insideScale = 1;
  let insideOffsetX = 0; // -1 to 1
  let insideOffsetY = 0; // -1 to 1

  let clipAtFold = true;
  let sheetFormat = 'letter';

  // Overlay layers (persisted on greeting_card as ratio JSON)
  let layers = [];
  let selectedLayerId = null;
  let layerDeleteConfirmForId = null;
  let activeDrag = null; // { id, mode, startX, startY, startLayer }
  let frontPageEl;
  let frontLayerRenderTimer;
  let insideLayers = [];
  let selectedInsideLayerId = null;
  let layerDeleteConfirmForInsideId = null;
  let activeInsideDrag = null;
  let insidePageEl;
  let insideLayerRenderTimer;

  /** @type {null | 'front' | 'inside'} */
  let centerLinkWaitingFor = null;

  // Inside-layer import modal
  let importInsideModalOpen = false;
  let importInsideLoading = false;
  let importInsideError = '';
  let importInsideCandidates = [];
  let importInsideSearch = '';

  $: frontOtherSquareCount = layers.filter(
    (l) => l.id !== selectedLayerId && l.type !== 'text'
  ).length;
  $: insideOtherSquareCount = insideLayers.filter(
    (l) => l.id !== selectedInsideLayerId && l.type !== 'text'
  ).length;

  $: selectedLayer = layers.find((l) => l.id === selectedLayerId) || null;
  $: selectedInsideLayer = insideLayers.find((l) => l.id === selectedInsideLayerId) || null;

  $: importInsideFilteredCandidates = (() => {
    const q = importInsideSearch.trim().toLowerCase();
    if (!q) return importInsideCandidates;
    return importInsideCandidates.filter((c) => {
      const title = (c?.title ?? '').toString().toLowerCase();
      const productTitle = (c?.product_title ?? '').toString().toLowerCase();
      return title.includes(q) || productTitle.includes(q);
    });
  })();

  /** @param {Record<string, unknown>} o @param {string} k @param {number} def */
  const num = (o, k, def = 0) => {
    const v = o[k];
    if (typeof v === 'number' && !Number.isNaN(v)) return v;
    if (typeof v === 'string' && v !== '' && !Number.isNaN(Number(v))) return Number(v);
    return def;
  };

  /**
   * Restore editor pixel state from ratio payloads stored in the API.
   * @param {unknown[]} savedList
   * @param {DOMRect} rect
   */
  const hydrateLayersFromRatios = (savedList, rect) => {
    if (!savedList?.length || !rect?.width || !rect?.height) return [];
    const w = rect.width;
    const h = rect.height;
    const m = Math.min(w, h);
    return savedList.map((raw) => {
      const o = raw && typeof raw === 'object' ? /** @type {Record<string, unknown>} */ (raw) : {};
      const id =
        typeof o.id === 'string' && o.id
          ? o.id
          : `layer-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const type = o.type === 'text' ? 'text' : 'square';
      return {
        id,
        type,
        x: num(o, 'xRatio', 0) * w,
        y: num(o, 'yRatio', 0) * h,
        width: Math.max(24, num(o, 'widthRatio', 0.15) * w),
        height: Math.max(24, num(o, 'heightRatio', 0.12) * h),
        radius: num(o, 'radiusRatio', 0.02) * m,
        opacity: typeof o.opacity === 'number' ? o.opacity : 0.45,
        text: typeof o.text === 'string' ? o.text : '',
        fontSize: Math.max(10, num(o, 'fontSizeRatio', 32 / Math.max(1, h)) * h),
        textColor: typeof o.textColor === 'string' ? o.textColor : '#0f172a',
        fontFamily:
          typeof o.fontFamily === 'string' ? o.fontFamily : 'Georgia, "Times New Roman", serif',
        rotation: num(o, 'rotation', 0),
        strokeEnabled: !!o.strokeEnabled,
        strokeColor: typeof o.strokeColor === 'string' ? o.strokeColor : '#ffffff',
        strokeWidth: Math.max(0, num(o, 'strokeWidthRatio', 2 / Math.max(1, h)) * h),
        backgroundEnabled: !!o.backgroundEnabled,
        backgroundColor: typeof o.backgroundColor === 'string' ? o.backgroundColor : '#f8fafc',
        backgroundOpacity: typeof o.backgroundOpacity === 'number' ? o.backgroundOpacity : 0.75,
        backgroundStrokeColor:
          typeof o.backgroundStrokeColor === 'string' ? o.backgroundStrokeColor : '#2563eb',
        backgroundStrokeWidth: Math.max(
          0,
          num(o, 'backgroundStrokeWidthRatio', 2 / Math.max(1, h)) * h
        ),
        backgroundRadius: num(o, 'backgroundRadiusRatio', 10 / Math.max(1, m)) * m,
        backgroundPaddingX: num(o, 'backgroundPaddingXRatio', 14 / Math.max(1, w)) * w,
        backgroundPaddingY: num(o, 'backgroundPaddingYRatio', 10 / Math.max(1, h)) * h
      };
    });
  };

  // Same as `hydrateLayersFromRatios`, but assigns fresh unique IDs so imports
  // don't collide with existing layer IDs in the current editor session.
  const hydrateLayersFromRatiosWithFreshIds = (savedList, rect, idPrefix) => {
    const hydrated = hydrateLayersFromRatios(savedList, rect);
    if (!hydrated.length) return [];

    const base = `${idPrefix || 'import-layer'}-${Date.now()}`;
    return hydrated.map((layer, idx) => ({
      ...layer,
      id: `${base}-${idx}-${Math.random().toString(36).slice(2, 8)}`
    }));
  };

  /**
   * @param {typeof layers} layerList
   * @param {HTMLElement | undefined} pageEl
   * @returns {Record<string, unknown>[] | undefined}
   */
  const serializeLayersForApi = (layerList, pageEl) => {
    if (!layerList?.length) return [];
    if (!pageEl) return undefined;
    const rect = pageEl.getBoundingClientRect();
    if (!rect.width || !rect.height) return undefined;
    return layerList.map((layer) => ({
      id: layer.id,
      type: layer.type || 'square',
      xRatio: layer.x / rect.width,
      yRatio: layer.y / rect.height,
      widthRatio: layer.width / rect.width,
      heightRatio: layer.height / rect.height,
      radiusRatio: layer.radius / Math.min(rect.width, rect.height),
      opacity: layer.opacity ?? 0.45,
      text: layer.text || '',
      fontSizeRatio: (layer.fontSize || 32) / rect.height,
      textColor: layer.textColor || '#0f172a',
      fontFamily: layer.fontFamily || 'Georgia, "Times New Roman", serif',
      rotation: layer.rotation || 0,
      strokeEnabled: !!layer.strokeEnabled,
      strokeColor: layer.strokeColor || '#ffffff',
      strokeWidthRatio: (layer.strokeWidth || 2) / Math.max(1, rect.height),
      backgroundEnabled: !!layer.backgroundEnabled,
      backgroundColor: layer.backgroundColor || '#f8fafc',
      backgroundOpacity: layer.backgroundOpacity ?? 0.75,
      backgroundStrokeColor: layer.backgroundStrokeColor || '#2563eb',
      backgroundStrokeWidthRatio: (layer.backgroundStrokeWidth || 2) / Math.max(1, rect.height),
      backgroundRadiusRatio:
        (layer.backgroundRadius || 10) / Math.max(1, Math.min(rect.width, rect.height)),
      backgroundPaddingXRatio: (layer.backgroundPaddingX || 14) / Math.max(1, rect.width),
      backgroundPaddingYRatio: (layer.backgroundPaddingY || 10) / Math.max(1, rect.height)
    }));
  };

  const getFrontRenderLayers = () => {
    if (!frontPageEl) return [];
    const rect = frontPageEl.getBoundingClientRect();
    if (!rect.width || !rect.height) return [];

    return layers.map((layer) => ({
      id: layer.id,
      type: layer.type || 'square',
      xRatio: layer.x / rect.width,
      yRatio: layer.y / rect.height,
      widthRatio: layer.width / rect.width,
      heightRatio: layer.height / rect.height,
      radiusRatio: layer.radius / Math.min(rect.width, rect.height),
      opacity: layer.opacity ?? 0.45,
      text: layer.text || '',
      fontSizeRatio: (layer.fontSize || 32) / rect.height,
      textColor: layer.textColor || '#0f172a',
      fontFamily: layer.fontFamily || 'Georgia, "Times New Roman", serif',
      rotation: layer.rotation || 0,
      strokeEnabled: !!layer.strokeEnabled,
      strokeColor: layer.strokeColor || '#ffffff',
      strokeWidthRatio: (layer.strokeWidth || 2) / Math.max(1, rect.height),
      backgroundEnabled: !!layer.backgroundEnabled,
      backgroundColor: layer.backgroundColor || '#f8fafc',
      backgroundOpacity: layer.backgroundOpacity ?? 0.75,
      backgroundStrokeColor: layer.backgroundStrokeColor || '#2563eb',
      backgroundStrokeWidthRatio: (layer.backgroundStrokeWidth || 2) / Math.max(1, rect.height),
      backgroundRadiusRatio: (layer.backgroundRadius || 10) / Math.max(1, Math.min(rect.width, rect.height)),
      backgroundPaddingXRatio: (layer.backgroundPaddingX || 14) / Math.max(1, rect.width),
      backgroundPaddingYRatio: (layer.backgroundPaddingY || 10) / Math.max(1, rect.height),
      stroke: 'rgba(96, 165, 250, 0.95)',
      strokeWidth: 3
    }));
  };

  const renderFrontOutputs = async () => {
    if (!frontUrl) return;
    const dataUrl = await createCardImage(frontUrl, {
      place: 'front',
      scaleOverride: frontScale,
      offsetX: frontOffsetX,
      offsetY: frontOffsetY,
      cardTitle,
      imprintLine1,
      imprintLine2,
      imprintLine3,
      clipAtFold,
      foldRatioFront,
      sheetFormat,
      frontLayers: getFrontRenderLayers()
    });
    frontPrintUrl = dataUrl || frontUrl;
    mockFrontUrl = await createMockFrontFromPrint(frontPrintUrl);
    mockBackUrl = await createMockBackFromPrint(frontPrintUrl);
  };

  const getInsideRenderLayers = () => {
    if (!insidePageEl) return [];
    const rect = insidePageEl.getBoundingClientRect();
    if (!rect.width || !rect.height) return [];

    return insideLayers.map((layer) => ({
      id: layer.id,
      type: layer.type || 'square',
      xRatio: layer.x / rect.width,
      yRatio: layer.y / rect.height,
      widthRatio: layer.width / rect.width,
      heightRatio: layer.height / rect.height,
      radiusRatio: layer.radius / Math.min(rect.width, rect.height),
      opacity: layer.opacity ?? 0.45,
      text: layer.text || '',
      fontSizeRatio: (layer.fontSize || 32) / rect.height,
      textColor: layer.textColor || '#0f172a',
      fontFamily: layer.fontFamily || 'Georgia, "Times New Roman", serif',
      rotation: layer.rotation || 0,
      strokeEnabled: !!layer.strokeEnabled,
      strokeColor: layer.strokeColor || '#ffffff',
      strokeWidthRatio: (layer.strokeWidth || 2) / Math.max(1, rect.height),
      backgroundEnabled: !!layer.backgroundEnabled,
      backgroundColor: layer.backgroundColor || '#f8fafc',
      backgroundOpacity: layer.backgroundOpacity ?? 0.75,
      backgroundStrokeColor: layer.backgroundStrokeColor || '#2563eb',
      backgroundStrokeWidthRatio: (layer.backgroundStrokeWidth || 2) / Math.max(1, rect.height),
      backgroundRadiusRatio: (layer.backgroundRadius || 10) / Math.max(1, Math.min(rect.width, rect.height)),
      backgroundPaddingXRatio: (layer.backgroundPaddingX || 14) / Math.max(1, rect.width),
      backgroundPaddingYRatio: (layer.backgroundPaddingY || 10) / Math.max(1, rect.height),
      stroke: 'rgba(96, 165, 250, 0.95)',
      strokeWidth: 3
    }));
  };

  const renderInsideOutputs = async () => {
    if (!insideUrl) return;
    const dataUrl = await createCardImage(insideUrl, {
      place: 'inside',
      scaleOverride: insideScale,
      offsetX: insideOffsetX,
      offsetY: insideOffsetY,
      sheetFormat,
      layers: getInsideRenderLayers()
    });
    insidePrintUrl = dataUrl || insideUrl;
    const { left, right } = await createMockInsidePanelsFromPrint(insidePrintUrl);
    mockInsideLeftUrl = left;
    mockInsideRightUrl = right;
  };

  const scheduleFrontRender = () => {
    if (frontLayerRenderTimer) clearTimeout(frontLayerRenderTimer);
    frontLayerRenderTimer = setTimeout(() => {
      renderFrontOutputs().catch((e) => console.error('Error rendering front layers', e));
    }, 20);
  };

  const scheduleInsideRender = () => {
    if (insideLayerRenderTimer) clearTimeout(insideLayerRenderTimer);
    insideLayerRenderTimer = setTimeout(() => {
      renderInsideOutputs().catch((e) => console.error('Error rendering inside layers', e));
    }, 20);
  };

  const addSquareLayer = () => {
    const id = `layer-${Date.now()}`;
    const newLayer = {
      id,
      x: 32,
      y: 32,
      width: 120,
      height: 120,
      radius: 12,
      opacity: 0.45
    };
    layers = [...layers, newLayer];
    selectedLayerId = id;
    layerDeleteConfirmForId = null;
    scheduleFrontRender();
    scheduleSaveLayers();
  };

  const addInsideSquareLayer = () => {
    const id = `inside-layer-${Date.now()}`;
    const newLayer = {
      id,
      x: 32,
      y: 32,
      width: 120,
      height: 120,
      radius: 12,
      opacity: 0.45
    };
    insideLayers = [...insideLayers, newLayer];
    selectedInsideLayerId = id;
    layerDeleteConfirmForInsideId = null;
    scheduleInsideRender();
    scheduleSaveLayers();
  };

  const addTextLayer = () => {
    const id = `layer-${Date.now()}`;
    const newLayer = {
      id,
      type: 'text',
      x: 70,
      y: 70,
      width: 260,
      height: 120,
      radius: 8,
      opacity: 0.1,
      text: 'Eid Mubarak',
      fontSize: 48,
      textColor: '#0f172a',
      fontFamily: 'Georgia, "Times New Roman", serif',
      rotation: 0,
      strokeEnabled: false,
      strokeColor: '#ffffff',
      strokeWidth: 2,
      backgroundEnabled: false,
      backgroundColor: '#f8fafc',
      backgroundOpacity: 0.75,
      backgroundStrokeColor: '#2563eb',
      backgroundStrokeWidth: 2,
      backgroundRadius: 10,
      backgroundPaddingX: 14,
      backgroundPaddingY: 10
    };
    layers = [...layers, newLayer];
    selectedLayerId = id;
    layerDeleteConfirmForId = null;
    scheduleFrontRender();
    scheduleSaveLayers();
  };

  const addInsideTextLayer = () => {
    const id = `inside-layer-${Date.now()}`;
    const newLayer = {
      id,
      type: 'text',
      x: 70,
      y: 70,
      width: 260,
      height: 120,
      radius: 8,
      opacity: 0.1,
      text: 'Eid Mubarak',
      fontSize: 48,
      textColor: '#0f172a',
      fontFamily: 'Georgia, "Times New Roman", serif',
      rotation: 0,
      strokeEnabled: false,
      strokeColor: '#ffffff',
      strokeWidth: 2,
      backgroundEnabled: false,
      backgroundColor: '#f8fafc',
      backgroundOpacity: 0.75,
      backgroundStrokeColor: '#2563eb',
      backgroundStrokeWidth: 2,
      backgroundRadius: 10,
      backgroundPaddingX: 14,
      backgroundPaddingY: 10
    };
    insideLayers = [...insideLayers, newLayer];
    selectedInsideLayerId = id;
    layerDeleteConfirmForInsideId = null;
    scheduleInsideRender();
    scheduleSaveLayers();
  };

  const updateLayer = (id, patch) => {
    layers = layers.map((layer) => (layer.id === id ? { ...layer, ...patch } : layer));
    scheduleFrontRender();
    scheduleSaveLayers();
  };

  const updateInsideLayer = (id, patch) => {
    insideLayers = insideLayers.map((layer) => (layer.id === id ? { ...layer, ...patch } : layer));
    scheduleInsideRender();
    scheduleSaveLayers();
  };

  /**
   * Center the selected layer on the preview page. X = full width. Y uses the fold line:
   * layer is centered vertically within the top or bottom half (whichever contains its center).
   * @param {'front' | 'inside'} which
   * @param {{ axis: 'x' | 'y'; foldAwareVertical?: boolean }} detail
   */
  const centerSelectedLayer = (which, detail) => {
    const pageEl = which === 'inside' ? insidePageEl : frontPageEl;
    const layerList = which === 'inside' ? insideLayers : layers;
    const selectedId = which === 'inside' ? selectedInsideLayerId : selectedLayerId;
    const apply = which === 'inside' ? updateInsideLayer : updateLayer;

    if (!pageEl || !selectedId) return;
    const layer = layerList.find((l) => l.id === selectedId);
    if (!layer) return;

    const rect = pageEl.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const w = layer.width;
    const h = layer.height;
    const axis = detail?.axis;
    const foldAware = detail?.foldAwareVertical !== false;

    if (axis === 'x') {
      apply(selectedId, { x: Math.max(0, (rect.width - w) / 2) });
      return;
    }

    if (axis === 'y') {
      if (!foldAware) {
        apply(selectedId, { y: Math.max(0, (rect.height - h) / 2) });
        return;
      }

      const foldY = foldRatioFront * rect.height;
      const cy = layer.y + h / 2;
      const inTopHalf = cy < foldY;

      if (inTopHalf) {
        const midY = foldY / 2;
        const maxY = Math.max(0, foldY - h);
        apply(selectedId, { y: Math.max(0, Math.min(midY - h / 2, maxY)) });
      } else {
        const midY = foldY + (rect.height - foldY) / 2;
        const minY = foldY;
        const maxY = rect.height - h;
        apply(selectedId, { y: Math.max(minY, Math.min(midY - h / 2, maxY)) });
      }
    }
  };

  /**
   * Move the selected layer so its center matches `refLayer`'s center (square layers only as reference).
   * @param {'front' | 'inside'} which
   * @param {{ x: number; y: number; width: number; height: number; id: string; type?: string }} refLayer
   */
  const applyCenterLinkToReference = (which, refLayer) => {
    const pageEl = which === 'inside' ? insidePageEl : frontPageEl;
    const layerList = which === 'inside' ? insideLayers : layers;
    const selectedId = which === 'inside' ? selectedInsideLayerId : selectedLayerId;
    const apply = which === 'inside' ? updateInsideLayer : updateLayer;

    if (!pageEl || !selectedId || !refLayer || refLayer.type === 'text') return;
    if (refLayer.id === selectedId) return;

    const selected = layerList.find((l) => l.id === selectedId);
    if (!selected) return;

    const rect = pageEl.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const refCx = refLayer.x + refLayer.width / 2;
    const refCy = refLayer.y + refLayer.height / 2;
    let newX = refCx - selected.width / 2;
    let newY = refCy - selected.height / 2;
    newX = Math.max(0, Math.min(newX, rect.width - selected.width));
    newY = Math.max(0, Math.min(newY, rect.height - selected.height));

    apply(selectedId, { x: newX, y: newY });
    centerLinkWaitingFor = null;
  };

  /** @param {'front' | 'inside'} which */
  const toggleCenterLink = (which) => {
    centerLinkWaitingFor = centerLinkWaitingFor === which ? null : which;
  };

  const DUPLICATE_TEXT_OFFSET_Y = 40;

  /** Append or bump trailing " (n)" for duplicated text layers. */
  const nextDuplicateTextLabel = (text) => {
    const t = String(text ?? '').replace(/\s+$/, '');
    const m = t.match(/^(.*?)\s*\((\d+)\)\s*$/);
    if (m) {
      const base = m[1].trimEnd();
      const n = parseInt(m[2], 10) + 1;
      return base ? `${base} (${n})` : `(${n})`;
    }
    if (t) return `${t} (2)`;
    return '(2)';
  };

  /** Clone the selected text layer slightly lower and with an incremented label. */
  const duplicateTextLayer = (which) => {
    const layerList = which === 'inside' ? insideLayers : layers;
    const selectedId = which === 'inside' ? selectedInsideLayerId : selectedLayerId;
    const pageEl = which === 'inside' ? insidePageEl : frontPageEl;
    const layer = layerList.find((l) => l.id === selectedId);
    if (!layer || layer.type !== 'text') return;

    const rect = pageEl?.getBoundingClientRect();
    const h = layer.height ?? 120;
    let newY = layer.y + DUPLICATE_TEXT_OFFSET_Y;
    if (rect?.height) {
      newY = Math.min(newY, Math.max(0, rect.height - h));
    }

    const newId =
      which === 'inside' ? `inside-layer-${Date.now()}` : `layer-${Date.now()}`;
    const newLayer = {
      ...layer,
      id: newId,
      y: newY,
      text: nextDuplicateTextLabel(layer.text)
    };

    if (which === 'inside') {
      insideLayers = [...insideLayers, newLayer];
      selectedInsideLayerId = newId;
      layerDeleteConfirmForInsideId = null;
      scheduleInsideRender();
      scheduleSaveLayers();
    } else {
      layers = [...layers, newLayer];
      selectedLayerId = newId;
      layerDeleteConfirmForId = null;
      scheduleFrontRender();
      scheduleSaveLayers();
    }
  };

  const selectLayerTab = (id) => {
    if (selectedLayerId === id) {
      layerDeleteConfirmForId = layerDeleteConfirmForId === id ? null : id;
      return;
    }
    selectedLayerId = id;
    layerDeleteConfirmForId = null;
  };

  const selectInsideLayerTab = (id) => {
    if (selectedInsideLayerId === id) {
      layerDeleteConfirmForInsideId = layerDeleteConfirmForInsideId === id ? null : id;
      return;
    }
    selectedInsideLayerId = id;
    layerDeleteConfirmForInsideId = null;
  };

  const deleteSelectedLayer = () => {
    if (!selectedLayerId) return;
    const nextLayers = layers.filter((layer) => layer.id !== selectedLayerId);
    layers = nextLayers;
    selectedLayerId = nextLayers.length > 0 ? nextLayers[nextLayers.length - 1].id : null;
    layerDeleteConfirmForId = null;
    scheduleFrontRender();
    scheduleSaveLayers();
  };

  const deleteSelectedInsideLayer = () => {
    if (!selectedInsideLayerId) return;
    const nextLayers = insideLayers.filter((layer) => layer.id !== selectedInsideLayerId);
    insideLayers = nextLayers;
    selectedInsideLayerId = nextLayers.length > 0 ? nextLayers[nextLayers.length - 1].id : null;
    layerDeleteConfirmForInsideId = null;
    scheduleInsideRender();
    scheduleSaveLayers();
  };

  const startLayerDrag = (event, layerId, mode = 'move') => {
    if (centerLinkWaitingFor === 'front') {
      event.preventDefault();
      const layer = layers.find((l) => l.id === layerId);
      if (!layer || layer.type === 'text') return;
      if (layerId === selectedLayerId) {
        centerLinkWaitingFor = null;
        return;
      }
      applyCenterLinkToReference('front', layer);
      return;
    }

    event.preventDefault();
    const layer = layers.find((l) => l.id === layerId);
    if (!layer) return;

    selectedLayerId = layerId;
    activeDrag = {
      id: layerId,
      mode,
      startX: event.clientX,
      startY: event.clientY,
      startLayer: { ...layer }
    };

    const onMove = (e) => {
      if (!activeDrag) return;
      const dx = e.clientX - activeDrag.startX;
      const dy = e.clientY - activeDrag.startY;
      const base = activeDrag.startLayer;

      if (activeDrag.mode === 'resize') {
        updateLayer(layerId, {
          width: Math.max(24, base.width + dx),
          height: Math.max(24, base.height + dy)
        });
      } else {
        updateLayer(layerId, {
          x: Math.max(0, base.x + dx),
          y: Math.max(0, base.y + dy)
        });
      }
    };

    const onUp = () => {
      activeDrag = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const startInsideLayerDrag = (event, layerId, mode = 'move') => {
    if (centerLinkWaitingFor === 'inside') {
      event.preventDefault();
      const layer = insideLayers.find((l) => l.id === layerId);
      if (!layer || layer.type === 'text') return;
      if (layerId === selectedInsideLayerId) {
        centerLinkWaitingFor = null;
        return;
      }
      applyCenterLinkToReference('inside', layer);
      return;
    }

    event.preventDefault();
    const layer = insideLayers.find((l) => l.id === layerId);
    if (!layer) return;

    selectedInsideLayerId = layerId;
    activeInsideDrag = {
      id: layerId,
      mode,
      startX: event.clientX,
      startY: event.clientY,
      startLayer: { ...layer }
    };

    const onMove = (e) => {
      if (!activeInsideDrag) return;
      const dx = e.clientX - activeInsideDrag.startX;
      const dy = e.clientY - activeInsideDrag.startY;
      const base = activeInsideDrag.startLayer;

      if (activeInsideDrag.mode === 'resize') {
        updateInsideLayer(layerId, {
          width: Math.max(24, base.width + dx),
          height: Math.max(24, base.height + dy)
        });
      } else {
        updateInsideLayer(layerId, {
          x: Math.max(0, base.x + dx),
          y: Math.max(0, base.y + dy)
        });
      }
    };

    const onUp = () => {
      activeInsideDrag = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  let foldSaveTimer;

  const saveFoldRatios = async () => {
    if (!product?.id) return;
    try {
      await Api.post(`/products/${product.id}/greeting_card.json`, {
        greeting_card: {
          fold_ratio_front: foldRatioFront,
          fold_ratio_inside: foldRatioFront
        }
      });
    } catch (e) {
      console.error('Unable to save fold ratios', e);
    }
  };

  const scheduleSaveFoldRatios = () => {
    if (!product?.id) return;
    if (foldSaveTimer) clearTimeout(foldSaveTimer);
    foldSaveTimer = setTimeout(saveFoldRatios, 400);
  };

  let layerSaveTimer;

  const saveLayersToServer = async () => {
    if (!product?.id) return;
    const frontPayload = serializeLayersForApi(layers, frontPageEl);
    const insidePayload = serializeLayersForApi(insideLayers, insidePageEl);
    if (layers.length > 0 && frontPayload === undefined) return;
    if (insideLayers.length > 0 && insidePayload === undefined) return;
    try {
      await Api.post(`/products/${product.id}/greeting_card.json`, {
        greeting_card: {
          front_layers: frontPayload ?? [],
          inside_layers: insidePayload ?? []
        }
      });
    } catch (e) {
      console.error('Unable to save layers', e);
    }
  };

  const scheduleSaveLayers = () => {
    if (!product?.id) return;
    if (layerSaveTimer) clearTimeout(layerSaveTimer);
    layerSaveTimer = setTimeout(saveLayersToServer, 600);
  };

  const loadGreetingCard = async () => {
    if (!product?.id) return;
    loading = true;
    error = '';
    centerLinkWaitingFor = null;
    importInsideModalOpen = false;
    importInsideCandidates = [];
    importInsideLoading = false;
    importInsideError = '';
    importInsideSearch = '';
    try {
      const data = await Api.get(`/products/${product.id}/greeting_card.json`);
      if (data && Object.keys(data).length > 0) {
        cardTitle = data.title || '';
        sheetFormat = data.sheet_format || 'letter';
        // Treat stored S3 URLs as the *source* artwork.
        frontUrl = data.front_image_url || '';
        insideUrl = data.inside_image_url || '';
        frontScale = data.front_scale ?? 1;
        frontOffsetX = data.front_offset_x ?? 0;
        frontOffsetY = data.front_offset_y ?? 0;
        insideScale = data.inside_scale ?? 1;
        insideOffsetX = data.inside_offset_x ?? 0;
        insideOffsetY = data.inside_offset_y ?? 0;
        foldRatioFront = data.fold_ratio_front ?? data.fold_ratio_inside ?? 0.5;
        foldRatioInside = foldRatioFront;

        console.log('CardStudio load config', {
          frontUrl,
          insideUrl,
          frontScale,
          frontOffsetX,
          frontOffsetY,
          insideScale,
          insideOffsetX,
          insideOffsetY,
          foldRatioFront,
          foldRatioInside
        });

        // Rebuild printable sheets + mocks from saved config.
        if (frontUrl) {
          try {
            await renderFrontOutputs();
          } catch (e) {
            console.error('Error rebuilding FRONT from saved state', e);
            frontPrintUrl = frontUrl;
          }
        }
        if (insideUrl) {
          try {
            await renderInsideOutputs();
          } catch (e) {
            console.error('Error rebuilding INSIDE from saved state', e);
            insidePrintUrl = insideUrl;
          }
        }

        await tick();
        await new Promise((r) => requestAnimationFrame(r));
        await new Promise((r) => requestAnimationFrame(r));

        const frontSaved = Array.isArray(data.front_layers) ? data.front_layers : [];
        const insideSaved = Array.isArray(data.inside_layers) ? data.inside_layers : [];

        if (frontPageEl && frontSaved.length) {
          const fr = frontPageEl.getBoundingClientRect();
          if (fr.width && fr.height) {
            layers = hydrateLayersFromRatios(frontSaved, fr);
            selectedLayerId = layers.length ? layers[0].id : null;
            layerDeleteConfirmForId = null;
            if (frontUrl) {
              try {
                await renderFrontOutputs();
              } catch (e) {
                console.error('Error re-rendering front after layer hydrate', e);
              }
            }
          }
        }

        if (insidePageEl && insideSaved.length) {
          const ir = insidePageEl.getBoundingClientRect();
          if (ir.width && ir.height) {
            insideLayers = hydrateLayersFromRatios(insideSaved, ir);
            selectedInsideLayerId = insideLayers.length ? insideLayers[0].id : null;
            layerDeleteConfirmForInsideId = null;
            if (insideUrl) {
              try {
                await renderInsideOutputs();
              } catch (e) {
                console.error('Error re-rendering inside after layer hydrate', e);
              }
            }
          }
        }
      }
    } catch (e) {
      // 404 is expected when there is no existing configuration.
      // Only show banner when the HTTP request itself fails.
      if (e && e.response) {
        if (e.response.status !== 404) {
          console.error('Error fetching greeting card config', e);
          error = 'Unable to load existing card configuration.';
        }
      } else {
        console.error('Unexpected error in loadGreetingCard', e);
      }
    } finally {
      loading = false;
    }
  };

  onMount(loadGreetingCard);

  onMount(() => {
    const onEsc = (e) => {
      if (e.key === 'Escape') centerLinkWaitingFor = null;
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  });

  const openImportInsideModal = async () => {
    importInsideModalOpen = true;
    importInsideLoading = true;
    importInsideError = '';
    importInsideCandidates = [];
    importInsideSearch = '';
    centerLinkWaitingFor = null;

    try {
      const data = await Api.get(
        `/greeting_cards/import_candidates.json?sheet_format=${encodeURIComponent(sheetFormat)}`
      );
      importInsideCandidates = Array.isArray(data) ? data : [];
    } catch (e) {
      console.error(e);
      importInsideError = 'Unable to load import candidates.';
    } finally {
      importInsideLoading = false;
    }
  };

  const importInsideFromCandidate = async (candidate) => {
    if (!insidePageEl) return;
    if (!candidate) return;

    const rect = insidePageEl.getBoundingClientRect();
    const insideSaved = Array.isArray(candidate.inside_layers) ? candidate.inside_layers : [];

    const imported = hydrateLayersFromRatiosWithFreshIds(insideSaved, rect, 'inside-import');
    if (!imported.length) return;

    insideLayers = [...insideLayers, ...imported];
    selectedInsideLayerId = imported[imported.length - 1].id;
    layerDeleteConfirmForInsideId = null;

    importInsideModalOpen = false;
    scheduleInsideRender();
    scheduleSaveLayers();
  };

  const printCard = () => {
    window.print();
  };

  const downloadImage = (url, filename) => {
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // core image helpers are imported from $lib/cardStudio/mocks.js

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const updateFoldFromClientY = (pageEl, clientY, which) => {
    if (!pageEl) return;
    const rect = pageEl.getBoundingClientRect();
    const ratio = (clientY - rect.top) / rect.height;
    const next = clamp(ratio, 0.1, 0.9);
    if (which === 'inside') foldRatioInside = next;
    else foldRatioFront = next;
    scheduleSaveFoldRatios();
  };

  const centerFoldLine = () => {
    foldRatioFront = 0.5;
    foldRatioInside = 0.5;

    scheduleSaveFoldRatios();

    autoAlignFrontToFold();
  };

  const startFoldDrag = (event, which) => {
    const pageEl = event.currentTarget.closest('.page');
    if (!pageEl) return;

    const onMove = (e) => updateFoldFromClientY(pageEl, e.clientY, which);
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      // After the user lets go on the FRONT fold, auto-align artwork.
      if (which === 'front') {
        autoAlignFrontToFold();
      }
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    updateFoldFromClientY(pageEl, event.clientY, which);
  };

  const startFoldDragTouch = (event, which) => {
    const pageEl = event.currentTarget.closest('.page');
    if (!pageEl) return;

    const getY = (e) => (e.touches && e.touches[0] ? e.touches[0].clientY : e.clientY);

    const onMove = (e) => updateFoldFromClientY(pageEl, getY(e), which);
    const onUp = () => {
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
      window.removeEventListener('touchcancel', onUp);
      // After the user lets go on the FRONT fold (touch), auto-align artwork.
      if (which === 'front') {
        autoAlignFrontToFold();
      }
    };

    window.addEventListener('touchmove', onMove);
    window.addEventListener('touchend', onUp);
    window.addEventListener('touchcancel', onUp);
    updateFoldFromClientY(pageEl, getY(event), which);
  };

  const autoAlignFrontToFold = async () => {
    if (!frontUrl) return;

    const img = await loadImage(frontUrl);

    const { width: canvasW, height: canvasH } = getSheetSize(sheetFormat);
    const halfH = canvasH / 2;

    const targetW = canvasW;
    const targetH = halfH;
    const centerY = halfH + halfH / 2;

    const baseScale = Math.max(targetW / img.width, targetH / img.height);
    const scale = baseScale * (frontScale ?? 1);
    const drawW = img.width * scale;

    const foldY = foldRatioFront * canvasH;
    const requiredShiftX = foldY - centerY + drawW / 2;
    const newOffsetX = clamp((2 * requiredShiftX) / targetW, -1, 1);

    frontOffsetX = newOffsetX;
    await renderFrontOutputs();
  };

  // mock helpers are imported from $lib/cardStudio/mocks.js

  const saveGreetingCard = async () => {
    if (!product?.id) return;
    saving = true;
    error = '';
    try {
      const url = `/products/${product.id}/greeting_card.json`;
      const formData = new FormData();
      formData.append('greeting_card[title]', cardTitle || '');
      formData.append('greeting_card[sheet_format]', sheetFormat);
      formData.append('greeting_card[front_scale]', frontScale);
      formData.append('greeting_card[front_offset_x]', frontOffsetX);
      formData.append('greeting_card[front_offset_y]', frontOffsetY);
      formData.append('greeting_card[inside_scale]', insideScale);
      formData.append('greeting_card[inside_offset_x]', insideOffsetX);
      formData.append('greeting_card[inside_offset_y]', insideOffsetY);
      formData.append('greeting_card[fold_ratio_front]', foldRatioFront);
      formData.append('greeting_card[fold_ratio_inside]', foldRatioFront);

      const frontLayersJson = serializeLayersForApi(layers, frontPageEl);
      const insideLayersJson = serializeLayersForApi(insideLayers, insidePageEl);
      if (frontLayersJson !== undefined) {
        formData.append('greeting_card[front_layers]', JSON.stringify(frontLayersJson));
      }
      if (insideLayersJson !== undefined) {
        formData.append('greeting_card[inside_layers]', JSON.stringify(insideLayersJson));
      }

      // Save original uploads so layout is always rebuildable.
      if (frontUrl && frontUrl.startsWith('blob:')) {
        const res = await fetch(frontUrl);
        const blob = await res.blob();
        formData.append('greeting_card[front_image]', blob, 'front.png');
      }

      if (insideUrl && insideUrl.startsWith('blob:')) {
        const res = await fetch(insideUrl);
        const blob = await res.blob();
        formData.append('greeting_card[inside_image]', blob, 'inside.png');
      }

      const response = await Api.post(url, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response) {
        savedAt = new Date();
      }
    } catch (e) {
      console.error(e);
      error = 'Unable to save card configuration.';
    } finally {
      saving = false;
    }
  };
</script>

<section class="studio">
  <header class="studio-header">
    <div>
      <h2>Card Studio</h2>
      <p>Create printable fronts/insides for this product.</p>
    </div>
    <div class="studio-actions">
      <button class="secondary" type="button" on:click={printCard}>Print</button>
      <button class="primary" type="button" on:click={saveGreetingCard} disabled={saving}>
        {saving ? 'Saving…' : 'Save Studio Settings'}
      </button>
    </div>
  </header>

  {#if loading}
    <p class="hint">Loading existing studio configuration…</p>
  {/if}

  {#if error}
    <p class="hint error">{error}</p>
  {/if}

  {#if savedAt}
    <p class="hint success">Saved at {savedAt.toLocaleTimeString()}.</p>
  {/if}

  <!-- Main controls + previews (trimmed styling but same behavior as original card maker) -->
  <!-- For brevity, reuse the existing markup structure from the standalone app -->

  <section class="controls">
    <div class="sheet-row non-print">
      <label class="sheet-select">
        <span class="label-title">Sheet size</span>
        <select bind:value={sheetFormat}>
          <option value="letter">8.5×11 (Letter)</option>
          <option value="seven_by_ten">7×10</option>
        </select>
      </label>
    </div>

    <label class="title-input non-print">
      <span class="label-title">Card title (for back imprint)</span>
      <input
        type="text"
        placeholder="e.g. Eid Mubarak"
        bind:value={cardTitle}
      />
    </label>

    <div class="upload-grid">
      <label class="upload">
        <span class="label-title">Card front</span>
        <input
          type="file"
          accept="image/*"
          on:change={(e) => {
            const input = e.currentTarget;
            const file = input.files && input.files[0];
            if (!file) return;
            if (frontUrl && frontUrl.startsWith('blob:')) URL.revokeObjectURL(frontUrl);
            frontUrl = URL.createObjectURL(file);
            renderFrontOutputs().catch((e) => console.error('Error rendering front upload', e));
          }}
        />
        {#if frontUrl}
          <div class="thumb">
            <img src={frontUrl} alt="Raw front upload" />
          </div>
        {/if}
      </label>

      <label class="upload">
        <span class="label-title">Card inside</span>
        <input
          type="file"
          accept="image/*"
          on:change={(e) => {
            const input = e.currentTarget;
            const file = input.files && input.files[0];
            if (!file) return;
            if (insideUrl && insideUrl.startsWith('blob:')) URL.revokeObjectURL(insideUrl);
            insideUrl = URL.createObjectURL(file);
            renderInsideOutputs().catch((e) => console.error('Error rendering inside upload', e));
          }}
        />
        {#if insideUrl}
          <div class="thumb">
            <img src={insideUrl} alt="Raw inside upload" />
          </div>
        {/if}
      </label>
    </div>

    <section class="print-layout">
      {#if frontPrintUrl || frontUrl}
        <div class="page-wrapper">
          <div class="page-header non-print">
            <h3 class="page-title">Print page 1 – front (outside)</h3>
            <div class="page-header-actions">
              <button type="button" class="download-btn" on:click={addSquareLayer}>
                Add square
              </button>
              <button type="button" class="download-btn" on:click={addTextLayer}>
                Add text
              </button>
              <label class="clip-toggle">
                <input type="checkbox" bind:checked={clipAtFold} />
                <span>Clip at line</span>
              </label>
              <button type="button" class="download-btn" on:click={centerFoldLine}>
                Center fold line
              </button>
              <button type="button" class="download-btn" on:click={autoAlignFrontToFold}>
                Auto-align image
              </button>
              {#if frontPrintUrl}
                <button
                  type="button"
                  class="download-btn"
                  on:click={() => downloadImage(frontPrintUrl, 'card-front.png')}
                >
                  Download image
                </button>
              {/if}
            </div>
          </div>
          <div
            class="page"
            class:center-link-waiting={centerLinkWaitingFor === 'front'}
            aria-label="Front page preview"
            bind:this={frontPageEl}
          >
            <img class="page-image" src={frontPrintUrl || frontUrl} alt="Card front preview" />
            {#each layers as layer (layer.id)}
              <div
                class="layer-box non-print"
                class:selected={selectedLayerId === layer.id}
                style={`left:${layer.x}px;top:${layer.y}px;width:${layer.width}px;height:${layer.height}px;border-radius:${layer.radius}px;`}
                on:mousedown={(e) => startLayerDrag(e, layer.id, 'move')}
                role="presentation"
              >
                {#if layer.type === 'text'}
                  <div class="layer-box-label">Text layer</div>
                {/if}
                <div
                  class="layer-resize-handle"
                  on:mousedown|stopPropagation={(e) => startLayerDrag(e, layer.id, 'resize')}
                  role="presentation"
                />
              </div>
            {/each}
            <div class="fold-line non-print" style={`top: ${foldRatioFront * 100}%`} aria-hidden="true" />
            <div
              class="fold-handle non-print"
              style={`top: ${foldRatioFront * 100}%`}
              on:mousedown|preventDefault={(e) => startFoldDrag(e, 'front')}
              on:touchstart|preventDefault={(e) => startFoldDragTouch(e, 'front')}
              aria-hidden="true"
            />
          </div>
          <div class="inside-controls non-print">
            {#if selectedLayer}
              <LayerControls
                title="Layer Controls"
                layers={layers}
                selectedLayer={selectedLayer}
                selectedLayerId={selectedLayerId}
                deleteConfirmForId={layerDeleteConfirmForId}
                centerLinkActive={centerLinkWaitingFor === 'front'}
                centerLinkDisabled={frontOtherSquareCount < 1}
                on:selecttab={(e) => selectLayerTab(e.detail.id)}
                on:deleteselected={deleteSelectedLayer}
                on:updatelayer={(e) => updateLayer(e.detail.id, e.detail.patch)}
                on:centerlayer={(e) => centerSelectedLayer('front', e.detail)}
                on:togglecenterlink={() => toggleCenterLink('front')}
                on:duplicatetextlayer={() => duplicateTextLayer('front')}
              />
            {/if}
            <label>
              <span>Zoom</span>
              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.01"
                bind:value={frontScale}
                on:change={autoAlignFrontToFold}
              />
            </label>
            <label>
              <span>Move left / right</span>
              <input
                type="range"
                min="-1"
                max="1"
                step="0.01"
                bind:value={frontOffsetX}
                on:change={() => {
                  if (!frontUrl) return;
                  renderFrontOutputs().catch((e) => console.error('Error rendering front X move', e));
                }}
              />
            </label>
            <label>
              <span>Move up / down</span>
              <input
                type="range"
                min="-1"
                max="1"
                step="0.01"
                bind:value={frontOffsetY}
                on:change={() => {
                  if (!frontUrl) return;
                  renderFrontOutputs().catch((e) => console.error('Error rendering front Y move', e));
                }}
              />
            </label>
          </div>
        </div>
      {/if}

      {#if insidePrintUrl || insideUrl}
        <div class="page-wrapper">
          <div class="page-header non-print">
            <h3 class="page-title">Print page 2 – inside</h3>
            <div class="page-header-actions">
              <button type="button" class="download-btn" on:click={addInsideSquareLayer}>
                Add square
              </button>
              <button type="button" class="download-btn" on:click={addInsideTextLayer}>
                Add text
              </button>
              <button
                type="button"
                class="download-btn"
                on:click={openImportInsideModal}
                disabled={importInsideLoading}
              >
                Import
              </button>
              {#if insidePrintUrl}
                <button
                  type="button"
                  class="download-btn"
                  on:click={() => downloadImage(insidePrintUrl, 'card-inside.png')}
                >
                  Download image
                </button>
              {/if}
            </div>
            {#if importInsideModalOpen}
              <div
                class="import-modal-overlay"
                on:click={() => (importInsideModalOpen = false)}
                role="dialog"
                aria-modal="true"
              >
                <div class="import-modal" on:click|stopPropagation>
                  <div class="import-modal-header">
                    <div>
                      <h3 class="import-title">Import Inside Layers</h3>
                      <p class="import-subtitle">
                        Same sheet size: <strong>{sheetFormat}</strong>. Showing cards with existing inside layers.
                      </p>
                    </div>
                    <button
                      type="button"
                      class="import-close"
                      on:click={() => (importInsideModalOpen = false)}
                    >
                      Close
                    </button>
                  </div>

                  <label class="import-search">
                    <span>Search</span>
                    <input
                      type="text"
                      bind:value={importInsideSearch}
                      placeholder="Search by title or product…"
                    />
                  </label>

                  {#if importInsideLoading}
                    <p class="hint">Loading…</p>
                  {:else if importInsideError}
                    <p class="hint error">{importInsideError}</p>
                  {:else if importInsideFilteredCandidates.length === 0}
                    <p class="hint">No matching greeting cards found.</p>
                  {:else}
                    <ul class="import-candidate-list">
                      {#each importInsideFilteredCandidates as candidate (candidate.id)}
                        <li class="import-candidate">
                          <div class="import-candidate-body">
                            <div class="import-candidate-name">
                              {candidate.title || candidate.product_title || `Card ${candidate.id}`}
                            </div>
                            <div class="import-candidate-meta">
                              Inside layers: {candidate.inside_layers_count}
                            </div>
                          </div>
                          <div class="import-candidate-actions">
                            <button
                              type="button"
                              class="download-btn"
                              on:click={() => importInsideFromCandidate(candidate)}
                              disabled={importInsideLoading}
                            >
                              Use layers
                            </button>
                          </div>
                        </li>
                      {/each}
                    </ul>
                  {/if}
                </div>
              </div>
            {/if}
          </div>
          <div
            class="page"
            class:center-link-waiting={centerLinkWaitingFor === 'inside'}
            aria-label="Inside page preview"
            bind:this={insidePageEl}
          >
            <img
              class="page-image"
              src={insidePrintUrl || insideUrl}
              alt="Card inside preview"
            />
            {#each insideLayers as layer (layer.id)}
              <div
                class="layer-box non-print"
                class:selected={selectedInsideLayerId === layer.id}
                style={`left:${layer.x}px;top:${layer.y}px;width:${layer.width}px;height:${layer.height}px;border-radius:${layer.radius}px;`}
                on:mousedown={(e) => startInsideLayerDrag(e, layer.id, 'move')}
                role="presentation"
              >
                {#if layer.type === 'text'}
                  <div class="layer-box-label">Text layer</div>
                {/if}
                <div
                  class="layer-resize-handle"
                  on:mousedown|stopPropagation={(e) => startInsideLayerDrag(e, layer.id, 'resize')}
                  role="presentation"
                />
              </div>
            {/each}
            <div class="fold-line non-print" style={`top: ${foldRatioFront * 100}%`} aria-hidden="true" />
          </div>
          <div class="inside-controls non-print">
            {#if selectedInsideLayer}
              <LayerControls
                title="Inside Layer Controls"
                layers={insideLayers}
                selectedLayer={selectedInsideLayer}
                selectedLayerId={selectedInsideLayerId}
                deleteConfirmForId={layerDeleteConfirmForInsideId}
                centerLinkActive={centerLinkWaitingFor === 'inside'}
                centerLinkDisabled={insideOtherSquareCount < 1}
                on:selecttab={(e) => selectInsideLayerTab(e.detail.id)}
                on:deleteselected={deleteSelectedInsideLayer}
                on:updatelayer={(e) => updateInsideLayer(e.detail.id, e.detail.patch)}
                on:centerlayer={(e) => centerSelectedLayer('inside', e.detail)}
                on:togglecenterlink={() => toggleCenterLink('inside')}
                on:duplicatetextlayer={() => duplicateTextLayer('inside')}
              />
            {/if}
            <label>
              <span>Zoom</span>
              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.01"
                bind:value={insideScale}
                on:change={() => {
                  if (!insideUrl) return;
                  renderInsideOutputs().catch((e) => console.error('Error rendering inside zoom', e));
                }}
              />
            </label>
            <label>
              <span>Move left / right</span>
              <input
                type="range"
                min="-1"
                max="1"
                step="0.01"
                bind:value={insideOffsetX}
                on:change={() => {
                  if (!insideUrl) return;
                  renderInsideOutputs().catch((e) => console.error('Error rendering inside X move', e));
                }}
              />
            </label>
            <label>
              <span>Move up / down</span>
              <input
                type="range"
                min="-1"
                max="1"
                step="0.01"
                bind:value={insideOffsetY}
                on:change={() => {
                  if (!insideUrl) return;
                  renderInsideOutputs().catch((e) => console.error('Error rendering inside Y move', e));
                }}
              />
            </label>
          </div>
        </div>
      {/if}
    </section>

    {#if frontPrintUrl || insidePrintUrl || frontUrl || insideUrl}
      <section class="flipper-section">
        <div class="mock-header">
          <h3 class="page-title">Card mock</h3>
          <div class="mock-tabs non-print" role="tablist" aria-label="Card mock views">
            <button
              type="button"
              class:active={mockView === 'front'}
              on:click={() => (mockView = 'front')}
              role="tab"
              aria-selected={mockView === 'front'}
            >
              Front
            </button>
            <button
              type="button"
              class:active={mockView === 'inside'}
              on:click={() => (mockView = 'inside')}
              role="tab"
              aria-selected={mockView === 'inside'}
            >
              Inside
            </button>
            <button
              type="button"
              class:active={mockView === 'back'}
              on:click={() => (mockView = 'back')}
              role="tab"
              aria-selected={mockView === 'back'}
            >
              Back
            </button>
          </div>
        </div>

        <div class:open={mockView === 'inside'} class="card-scene">
          {#if mockView === 'inside'}
            <div class="inside-panels mock-surface">
              <div class="inside-panel">
                <img src={mockInsideLeftUrl || insidePrintUrl || insideUrl} alt="Inside left" />
              </div>
              <div class="inside-panel">
                <img src={mockInsideRightUrl || insidePrintUrl || insideUrl} alt="Inside right" />
              </div>
              <div class="inside-fold-line" aria-hidden="true" />
            </div>
          {:else if mockView === 'back'}
            <div class="mock-surface">
              <img src={mockBackUrl || frontPrintUrl || frontUrl} alt="Back of card" />
            </div>
          {:else}
            <div class="mock-surface">
              <img src={mockFrontUrl || frontPrintUrl || frontUrl} alt="Front of card" />
            </div>
          {/if}
        </div>
      </section>
    {/if}
  </section>
</section>

<style>
  .studio {
    margin-top: 1.5rem;
    border-radius: 1rem;
    padding: 1.25rem 1.5rem 1.5rem;
    background: #111827;
    color: #e5e7eb;
  }

  .studio-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .studio-header h2 {
    margin: 0;
    font-size: 1.25rem;
  }

  .studio-header p {
    margin: 0.15rem 0 0;
    font-size: 0.9rem;
    color: #9ca3af;
  }

  .studio-actions {
    display: flex;
    gap: 0.5rem;
  }

  .primary,
  .secondary {
    border-radius: 999px;
    padding: 0.45rem 1rem;
    font-size: 0.9rem;
    cursor: pointer;
    border: none;
  }

  .primary {
    background: linear-gradient(135deg, #2563eb, #1d4ed8);
    color: white;
  }

  .secondary {
    background: #111827;
    border: 1px solid #4b5563;
    color: #e5e7eb;
  }

  .hint {
    font-size: 0.8rem;
    color: #9ca3af;
    margin-bottom: 0.5rem;
  }

  .hint.error {
    color: #fecaca;
  }

  .hint.success {
    color: #bbf7d0;
  }

  /* Reuse much of the styling from the standalone app, trimmed a bit */
  .controls {
    margin-top: 0.75rem;
  }

  .upload-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 1rem;
    margin-bottom: 1.25rem;
  }

  .upload {
    border-radius: 0.9rem;
    border: 1px dashed rgba(148, 163, 184, 0.8);
    padding: 0.9rem 1rem;
    background: #020617;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .thumb {
    margin-top: 0.25rem;
    width: 56px;
    height: 56px;
    border-radius: 0.5rem;
    overflow: hidden;
    border: 1px solid rgba(148, 163, 184, 0.6);
  }

  .thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .title-input {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .sheet-row {
    margin-bottom: 1rem;
  }

  .sheet-select {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .sheet-select select {
    width: 100%;
    border-radius: 0.75rem;
    border: 1px solid rgba(148, 163, 184, 0.45);
    background: rgba(2, 6, 23, 0.35);
    color: #e5e7eb;
    padding: 0.65rem 0.75rem;
    outline: none;
  }

  .title-input input[type='text'] {
    width: 100%;
    border-radius: 0.75rem;
    border: 1px solid rgba(148, 163, 184, 0.45);
    background: rgba(2, 6, 23, 0.35);
    color: #e5e7eb;
    padding: 0.65rem 0.75rem;
    outline: none;
  }

  .print-layout {
    width: 100%;
    display: flex;
    flex-wrap: wrap;
    gap: 2rem;
    justify-content: center;
  }

  .page-wrapper {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    flex: 1 1 360px;
    max-width: 520px;
  }

  .page-header {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.6rem;
  }

  .page-header-actions {
    display: flex;
    gap: 0.45rem;
    align-items: center;
    flex-wrap: wrap;
    width: 100%;
  }

  .clip-toggle {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.8rem;
    color: #9ca3af;
    padding: 0.3rem 0.55rem;
    border-radius: 999px;
    border: 1px solid rgba(148, 163, 184, 0.35);
    background: rgba(2, 6, 23, 0.35);
  }

  .clip-toggle input[type='checkbox'] {
    accent-color: #3b82f6;
  }

  .inside-controls {
    margin-top: 0.5rem;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 0.5rem 1rem;
    font-size: 0.8rem;
    color: #9ca3af;
  }

  .inside-controls label {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .inside-controls input[type='range'] {
    width: 100%;
  }

  .download-btn {
    border: 1px solid rgba(148, 163, 184, 0.35);
    border-radius: 999px;
    padding: 0.4rem 0.85rem;
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    background: rgba(15, 23, 42, 0.92);
    color: #e2e8f0;
    transition: background 0.15s ease-in-out;
  }

  .download-btn:hover {
    background: rgba(30, 64, 175, 0.28);
  }

  .page {
    position: relative;
    width: 100%;
    aspect-ratio: 8.5 / 11;
    background: #020617;
    border-radius: 0.9rem;
    overflow: hidden;
    box-shadow: 0 18px 45px rgba(0, 0, 0, 0.8);
  }

  .page.center-link-waiting {
    outline: 3px dashed rgba(250, 204, 21, 0.85);
    outline-offset: 2px;
    cursor: crosshair;
  }

  .page.center-link-waiting .layer-box {
    cursor: crosshair;
  }

  .page-image {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .layer-box {
    position: absolute;
    border: 2px solid rgba(255, 255, 255, 0.65);
    background: rgba(248, 250, 252, 0.45);
    box-shadow: 0 10px 20px rgba(15, 23, 42, 0.4);
    cursor: move;
    z-index: 3;
  }

  .layer-box.selected {
    border-color: #60a5fa;
    box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.4), 0 12px 24px rgba(15, 23, 42, 0.45);
  }

  .layer-box-label {
    position: absolute;
    top: -18px;
    left: 0;
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #bfdbfe;
  }

  .layer-resize-handle {
    position: absolute;
    right: -7px;
    bottom: -7px;
    width: 14px;
    height: 14px;
    border-radius: 999px;
    background: #2563eb;
    border: 1px solid #bfdbfe;
    cursor: nwse-resize;
  }

  .fold-line {
    position: absolute;
    left: 0;
    right: 0;
    height: 0;
    border-top: 2px dashed rgba(248, 113, 113, 0.8);
    pointer-events: none;
  }

  .fold-handle {
    position: absolute;
    right: -10px;
    width: 18px;
    height: 18px;
    border-radius: 999px;
    background: #0f172a;
    border: 1px solid rgba(248, 113, 113, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: ns-resize;
  }

  .fold-handle::before {
    content: '';
    width: 6px;
    height: 2px;
    border-radius: 999px;
    background: rgba(248, 250, 252, 0.9);
  }

  .flipper-section {
    margin-top: 2rem;
  }

  .mock-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .mock-tabs {
    display: inline-flex;
    gap: 0.4rem;
    background: rgba(15, 23, 42, 0.9);
    border-radius: 999px;
    padding: 0.25rem;
    border: 1px solid rgba(148, 163, 184, 0.35);
  }

  .mock-tabs button {
    border: none;
    border-radius: 999px;
    padding: 0.35rem 0.7rem;
    font-size: 0.8rem;
    cursor: pointer;
    background: transparent;
    color: #9ca3af;
  }

  .mock-tabs button.active {
    background: rgba(59, 130, 246, 0.18);
    color: #bfdbfe;
  }

  .card-scene {
    margin-top: 0.75rem;
    width: 260px;
    height: 360px;
  }

  .card-scene.open {
    width: 520px;
    max-width: 100%;
  }

  .mock-surface {
    width: 100%;
    height: 100%;
    border-radius: 1rem;
    overflow: hidden;
    box-shadow: 0 14px 35px rgba(0, 0, 0, 0.65);
    background: #020617;
    display: flex;
    align-items: stretch;
    justify-content: stretch;
  }

  .mock-surface img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .inside-panels {
    position: relative;
    display: flex;
    flex-direction: row;
    width: 100%;
    height: 100%;
  }

  .inside-panel {
    flex: 1;
    overflow: hidden;
  }

  .inside-fold-line {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 50%;
    border-left: 1px dashed rgba(148, 163, 184, 0.9);
    pointer-events: none;
  }

  .import-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(2, 6, 23, 0.7);
    z-index: 1000000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.25rem;
  }

  .import-modal {
    width: 100%;
    max-width: 820px;
    background: rgba(2, 6, 23, 0.95);
    color: #e5e7eb;
    border-radius: 0.85rem;
    border: 1px solid rgba(59, 130, 246, 0.35);
    box-shadow: 0 30px 90px rgba(0, 0, 0, 0.7);
    padding: 1.05rem 1.1rem;
  }

  .import-modal-header {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 0.75rem;
  }

  .import-title {
    margin: 0;
    font-size: 1.25rem;
  }

  .import-subtitle {
    margin: 0.25rem 0 0;
    color: #cbd5e1;
    line-height: 1.35;
    font-size: 0.9rem;
  }

  .import-close {
    border: 1px solid rgba(148, 163, 184, 0.45);
    background: transparent;
    color: #e5e7eb;
    border-radius: 999px;
    padding: 0.45rem 0.75rem;
    cursor: pointer;
    font-weight: 700;
  }

  .import-search {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    margin-bottom: 0.9rem;
  }

  .import-search span {
    font-weight: 800;
    color: #bfdbfe;
    font-size: 0.85rem;
  }

  .import-search input {
    padding: 0.6rem 0.65rem;
    border-radius: 0.6rem;
    border: 1px solid rgba(148, 163, 184, 0.35);
    background: rgba(2, 6, 23, 0.6);
    color: #e5e7eb;
    width: 100%;
  }

  .import-candidate-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 0.75rem;
    max-height: 60vh;
    overflow: auto;
  }

  .import-candidate {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.9rem;
    padding: 0.85rem 0.9rem;
    border-radius: 0.75rem;
    border: 1px solid rgba(59, 130, 246, 0.28);
    background: rgba(30, 64, 175, 0.12);
  }

  .import-candidate-body {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    min-width: 260px;
  }

  .import-candidate-name {
    font-weight: 850;
    color: #e5e7eb;
  }

  .import-candidate-meta {
    color: #cbd5e1;
    font-size: 0.9rem;
  }

  .import-candidate-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
  }
</style>

