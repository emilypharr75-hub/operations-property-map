const MAP_SIZE = 3120;
const BASE_DISPLAY_SIZE = 1800;
const DEFAULT_MARKER_COLOR = '#ff3535';
const MARKER_STORAGE_KEY = 'erlcPropertyMarkerEdits';
const MIN_MARKER_SIZE = 18;
const EDIT_PASSWORD = 'BillingForTheWin';

const elements = {
  datalist: document.querySelector('#propertyOptions'),
  mapSurface: document.querySelector('#mapSurface'),
  mapWrap: document.querySelector('#mapWrap'),
  markers: document.querySelector('#markers'),
  search: document.querySelector('#propertySearch'),
  zoomIn: document.querySelector('#zoomIn'),
  zoomOut: document.querySelector('#zoomOut'),
  zoomRange: document.querySelector('#zoomRange'),
  zoomValue: document.querySelector('#zoomValue'),
  editModeLock: document.querySelector('#editModeLock'),
  undoEdit: document.querySelector('#undoEdit'),
  resetBoxes: document.querySelector('#resetBoxes'),
  passwordDialog: document.querySelector('#passwordDialog'),
  passwordForm: document.querySelector('#passwordForm'),
  editPassword: document.querySelector('#editPassword'),
  passwordError: document.querySelector('#passwordError'),
  cancelPassword: document.querySelector('#cancelPassword'),
  propertyName: document.querySelector('#propertyName'),
  buildingType: document.querySelector('#buildingType'),
  propertyNumber: document.querySelector('#propertyNumber'),
  propertyOwner: document.querySelector('#propertyOwner'),
  propertyPrice: document.querySelector('#propertyPrice'),
  propertyTax: document.querySelector('#propertyTax')
};

let properties = [];
let propertiesById = new Map();
let propertyMarkers = [];
let activeMarker = null;
let selectedMarkerId = null;
let zoom = 1;
let editMode = false;
let dragState = null;
let undoStack = [];

function getMarkerScale() {
  return elements.markers.getBoundingClientRect().width / MAP_SIZE;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function labelFor(property) {
  return `${property.name} (${property.number})`;
}

function isPostalOnlyMarker(region) {
  return region.id.startsWith('postal-');
}

function isSelectableProperty(property) {
  return !property.id.startsWith('postal-');
}

function getBuildingRect(region, property) {
  if (region.buildingRect) {
    return region.buildingRect;
  }

  const [left, top, right, bottom] = region.rect;

  if (property.buildingType === 'House') {
    const centerX = (left + right) / 2;
    const width = Math.min(70, Math.max(46, (right - left) * 0.68));
    const height = Math.min(58, Math.max(40, (bottom - top) * 0.72));

    return [
      centerX - width / 2,
      top - height * 0.72,
      centerX + width / 2,
      top + height * 0.28
    ];
  }

  return region.buildingRect || region.rect;
}

function getMarkerRect(region, property) {
  return getBuildingRect(region, property);
}

function saveMarkerEdits() {
  const editedMarkers = {};

  for (const marker of propertyMarkers) {
    if (marker.buildingRect || marker.removed) {
      editedMarkers[marker.id] = {
        buildingRect: marker.buildingRect,
        removed: Boolean(marker.removed)
      };
    }
  }

  localStorage.setItem(MARKER_STORAGE_KEY, JSON.stringify(editedMarkers));
}

function applyStoredMarkerEdits() {
  const stored = JSON.parse(localStorage.getItem(MARKER_STORAGE_KEY) || '{}');

  for (const marker of propertyMarkers) {
    const edit = stored[marker.id];

    if (Array.isArray(edit)) {
      marker.buildingRect = edit;
      continue;
    }

    if (edit) {
      marker.buildingRect = edit.buildingRect;
      marker.removed = Boolean(edit.removed);
    }
  }
}

function markerSnapshot(marker) {
  return {
    buildingRect: marker.buildingRect ? [...marker.buildingRect] : undefined,
    removed: Boolean(marker.removed)
  };
}

function pushUndo(marker) {
  undoStack.push({
    id: marker.id,
    before: markerSnapshot(marker)
  });

  if (undoStack.length > 100) {
    undoStack.shift();
  }
}

function restoreMarkerSnapshot(id, snapshot) {
  const marker = propertyMarkers.find(region => region.id === id);

  if (!marker) {
    return;
  }

  marker.buildingRect = snapshot.buildingRect ? [...snapshot.buildingRect] : undefined;
  marker.removed = snapshot.removed;
  saveMarkerEdits();
  renderMarkers();
  selectedMarkerId = id;
  activeMarker = document.querySelector(`.marker[data-id="${id}"]`);

  if (activeMarker) {
    activeMarker.classList.add('active');
  }
}

function undoLastEdit() {
  const entry = undoStack.pop();

  if (!entry) {
    return;
  }

  restoreMarkerSnapshot(entry.id, entry.before);
}

function applyMarkerElementStyle(markerElement, rect) {
  const scale = getMarkerScale();
  const [left, top, right, bottom] = rect;
  markerElement.style.left = `${left * scale}px`;
  markerElement.style.top = `${top * scale}px`;
  markerElement.style.width = `${(right - left) * scale}px`;
  markerElement.style.height = `${(bottom - top) * scale}px`;
}

function updateMarkerRect(id, rect) {
  const marker = propertyMarkers.find(region => region.id === id);

  if (!marker) {
    return;
  }

  marker.buildingRect = rect.map(value => Math.round(value));

  const markerElement = document.querySelector(`.marker[data-id="${id}"]`);
  if (markerElement) {
    applyMarkerElementStyle(markerElement, marker.buildingRect);
    markerElement.classList.add('active');
    activeMarker = markerElement;
  }
}

function setZoom(nextZoom, keepCenter = true) {
  const previousScale = getMarkerScale();
  const centerX = elements.mapWrap.scrollLeft + elements.mapWrap.clientWidth / 2;
  const centerY = elements.mapWrap.scrollTop + elements.mapWrap.clientHeight / 2;
  const mapX = centerX / previousScale;
  const mapY = centerY / previousScale;

  zoom = Math.min(6, Math.max(0.45, nextZoom));
  const displaySize = Math.round(BASE_DISPLAY_SIZE * zoom);
  elements.mapSurface.style.setProperty('--map-width', `${displaySize}px`);
  elements.zoomRange.value = String(zoom);
  elements.zoomValue.textContent = `${Math.round(zoom * 100)}%`;
  renderMarkers();

  if (keepCenter) {
    const nextScale = getMarkerScale();
    elements.mapWrap.scrollLeft = mapX * nextScale - elements.mapWrap.clientWidth / 2;
    elements.mapWrap.scrollTop = mapY * nextScale - elements.mapWrap.clientHeight / 2;
  }
}

function setEditMode(enabled) {
  editMode = enabled;
  elements.editModeLock.setAttribute('aria-pressed', String(editMode));
  elements.editModeLock.setAttribute('aria-label', editMode ? 'Lock edit mode' : 'Unlock edit mode');
  elements.markers.classList.toggle('editing', editMode);
}

function openPasswordDialog() {
  elements.passwordError.textContent = '';
  elements.editPassword.value = '';
  elements.passwordDialog.showModal();
  elements.editPassword.focus();
}

function selectProperty(id) {
  const property = propertiesById.get(id);

  if (!property) {
    return;
  }

  elements.propertyName.textContent = labelFor(property);
  elements.buildingType.textContent = property.buildingType;
  elements.propertyNumber.textContent = property.number;
  elements.propertyOwner.textContent = property.owner;
  elements.propertyPrice.textContent = property.price;
  elements.propertyTax.textContent = property.tax;
  elements.search.value = labelFor(property);

  if (activeMarker) {
    activeMarker.classList.remove('active');
  }

  activeMarker = document.querySelector(`.marker[data-id="${id}"]`);
  selectedMarkerId = id;

  if (activeMarker) {
    activeMarker.classList.add('active');
    activeMarker.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
  }
}

function renderMarkers() {
  elements.markers.textContent = '';
  const scale = getMarkerScale();

  for (const region of propertyMarkers) {
    if (isPostalOnlyMarker(region)) {
      continue;
    }

    if (region.removed) {
      continue;
    }

    const property = propertiesById.get(region.id);

    if (!property) {
      continue;
    }

    const [left, top, right, bottom] = getMarkerRect(region, property);
    const marker = document.createElement('button');
    marker.type = 'button';
    marker.className = 'marker';
    marker.dataset.id = region.id;
    marker.style.setProperty('--marker-color', region.color || DEFAULT_MARKER_COLOR);
    marker.style.left = `${left * scale}px`;
    marker.style.top = `${top * scale}px`;
    marker.style.width = `${(right - left) * scale}px`;
    marker.style.height = `${(bottom - top) * scale}px`;
    marker.setAttribute('aria-label', labelFor(property));
    marker.addEventListener('pointerdown', event => startMarkerEdit(event, region, property));
    marker.addEventListener('click', event => {
      if (editMode) {
        event.preventDefault();
        selectedMarkerId = region.id;
        if (activeMarker) {
          activeMarker.classList.remove('active');
        }
        marker.classList.add('active');
        activeMarker = marker;
        return;
      }

      selectProperty(region.id);
    });
    for (const handleName of ['nw', 'ne', 'sw', 'se']) {
      const handle = document.createElement('span');
      handle.className = `resize-handle ${handleName}`;
      handle.dataset.handle = handleName;
      marker.append(handle);
    }
    elements.markers.append(marker);
  }
}

function startMarkerEdit(event, region, property) {
  if (!editMode) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  const handle = event.target.dataset.handle || 'move';
  const rect = getMarkerRect(region, property);
  const scale = getMarkerScale();
  pushUndo(region);
  selectedMarkerId = region.id;
  dragState = {
    handle,
    id: region.id,
    rect,
    startX: event.clientX,
    startY: event.clientY,
    scale
  };

  event.currentTarget.setPointerCapture(event.pointerId);
}

function moveMarkerEdit(event) {
  if (!dragState) {
    return;
  }

  const dx = (event.clientX - dragState.startX) / dragState.scale;
  const dy = (event.clientY - dragState.startY) / dragState.scale;
  let [left, top, right, bottom] = dragState.rect;

  if (dragState.handle === 'move') {
    left += dx;
    right += dx;
    top += dy;
    bottom += dy;
  } else {
    if (dragState.handle.includes('w')) {
      left += dx;
    }
    if (dragState.handle.includes('e')) {
      right += dx;
    }
    if (dragState.handle.includes('n')) {
      top += dy;
    }
    if (dragState.handle.includes('s')) {
      bottom += dy;
    }
  }

  if (right - left < MIN_MARKER_SIZE) {
    if (dragState.handle.includes('w')) {
      left = right - MIN_MARKER_SIZE;
    } else {
      right = left + MIN_MARKER_SIZE;
    }
  }

  if (bottom - top < MIN_MARKER_SIZE) {
    if (dragState.handle.includes('n')) {
      top = bottom - MIN_MARKER_SIZE;
    } else {
      bottom = top + MIN_MARKER_SIZE;
    }
  }

  const width = right - left;
  const height = bottom - top;
  left = clamp(left, 0, MAP_SIZE - width);
  top = clamp(top, 0, MAP_SIZE - height);
  right = left + width;
  bottom = top + height;

  updateMarkerRect(dragState.id, [left, top, right, bottom]);
}

function stopMarkerEdit() {
  if (dragState) {
    saveMarkerEdits();
  }

  dragState = null;
}

function removeSelectedMarker() {
  if (!editMode || !selectedMarkerId) {
    return;
  }

  const marker = propertyMarkers.find(region => region.id === selectedMarkerId);

  if (!marker || marker.removed) {
    return;
  }

  pushUndo(marker);
  marker.removed = true;
  saveMarkerEdits();
  selectedMarkerId = null;
  activeMarker = null;
  renderMarkers();
}

function handleKeyboardEdit(event) {
  const tagName = document.activeElement?.tagName?.toLowerCase();
  const isTyping = tagName === 'input' || tagName === 'textarea';

  if (isTyping) {
    return;
  }

  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
    event.preventDefault();
    undoLastEdit();
    return;
  }

  if (event.key === 'Backspace' || event.key === 'Delete') {
    event.preventDefault();
    removeSelectedMarker();
  }
}

function renderOptions() {
  elements.datalist.textContent = '';

  for (const property of properties.filter(isSelectableProperty)) {
    const option = document.createElement('option');
    option.value = labelFor(property);
    option.dataset.id = property.id;
    elements.datalist.append(option);
  }
}

function selectFromSearch() {
  const value = elements.search.value.trim().toLowerCase();
  const match = properties.filter(isSelectableProperty).find(property => {
    return labelFor(property).toLowerCase() === value ||
      property.number.toLowerCase() === value ||
      property.name.toLowerCase() === value;
  });

  if (match) {
    selectProperty(match.id);
  }
}

async function init() {
  const [propertiesResponse, markersResponse] = await Promise.all([
    fetch('/properties.json'),
    fetch('/property-markers.json')
  ]);
  properties = await propertiesResponse.json();
  propertyMarkers = await markersResponse.json();
  applyStoredMarkerEdits();
  propertiesById = new Map(properties.map(property => [property.id, property]));

  renderOptions();
  renderMarkers();
  elements.search.addEventListener('change', selectFromSearch);
  elements.search.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      selectFromSearch();
    }
  });
  elements.zoomIn.addEventListener('click', () => setZoom(zoom + 0.5));
  elements.zoomOut.addEventListener('click', () => setZoom(zoom - 0.35));
  elements.zoomRange.addEventListener('input', event => setZoom(Number(event.target.value)));
  elements.mapWrap.addEventListener('wheel', event => {
    if (!event.ctrlKey && !event.metaKey) {
      return;
    }

    event.preventDefault();
    setZoom(zoom + (event.deltaY < 0 ? 0.35 : -0.25));
  }, { passive: false });
  elements.editModeLock.addEventListener('click', () => {
    if (editMode) {
      setEditMode(false);
      return;
    }

    openPasswordDialog();
  });
  elements.passwordForm.addEventListener('submit', event => {
    event.preventDefault();

    if (elements.editPassword.value === EDIT_PASSWORD) {
      elements.passwordDialog.close();
      setEditMode(true);
      return;
    }

    elements.passwordError.textContent = 'Incorrect password.';
    elements.editPassword.select();
  });
  elements.cancelPassword.addEventListener('click', () => {
    elements.passwordDialog.close();
  });
  elements.undoEdit.addEventListener('click', undoLastEdit);
  elements.resetBoxes.addEventListener('click', () => {
    localStorage.removeItem(MARKER_STORAGE_KEY);
    window.location.reload();
  });
  window.addEventListener('keydown', handleKeyboardEdit);
  window.addEventListener('pointermove', moveMarkerEdit);
  window.addEventListener('pointerup', stopMarkerEdit);
  setZoom(1, false);
}

window.addEventListener('resize', renderMarkers);
init();
