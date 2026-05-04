const MAP_SIZE = 3120;
const BASE_DISPLAY_SIZE = 1800;
const DEFAULT_MARKER_COLOR = '#ff3535';
const DATA_VERSION = 'imported-boxes-2026-05-03-clean';
const DATA_VERSION_STORAGE_KEY = 'erlcPropertyMapDataVersion';
const MARKER_STORAGE_KEY = 'erlcPropertyMarkerEdits';
const PROPERTY_STORAGE_KEY = 'erlcPropertyEdits';
const CUSTOM_PROPERTY_STORAGE_KEY = 'erlcCustomProperties';
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
  addBox: document.querySelector('#addBox'),
  exportBoxes: document.querySelector('#exportBoxes'),
  editModeLock: document.querySelector('#editModeLock'),
  undoEdit: document.querySelector('#undoEdit'),
  resetBoxes: document.querySelector('#resetBoxes'),
  passwordDialog: document.querySelector('#passwordDialog'),
  passwordForm: document.querySelector('#passwordForm'),
  editPassword: document.querySelector('#editPassword'),
  togglePasswordView: document.querySelector('#togglePasswordView'),
  passwordError: document.querySelector('#passwordError'),
  cancelPassword: document.querySelector('#cancelPassword'),
  propertyName: document.querySelector('#propertyName'),
  propertyNameEdit: document.querySelector('#propertyNameEdit'),
  buildingType: document.querySelector('#buildingType'),
  buildingTypeEdit: document.querySelector('#buildingTypeEdit'),
  propertyNumber: document.querySelector('#propertyNumber'),
  propertyNumberEdit: document.querySelector('#propertyNumberEdit'),
  propertyOwner: document.querySelector('#propertyOwner'),
  propertyOwnerEdit: document.querySelector('#propertyOwnerEdit'),
  propertyPrice: document.querySelector('#propertyPrice'),
  propertyPriceEdit: document.querySelector('#propertyPriceEdit'),
  propertyTax: document.querySelector('#propertyTax'),
  propertyTaxEdit: document.querySelector('#propertyTaxEdit')
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

function clearStoredEditorState() {
  localStorage.removeItem(MARKER_STORAGE_KEY);
  localStorage.removeItem(PROPERTY_STORAGE_KEY);
  localStorage.removeItem(CUSTOM_PROPERTY_STORAGE_KEY);
}

function resetStoredEditorStateForImportedData() {
  if (localStorage.getItem(DATA_VERSION_STORAGE_KEY) === DATA_VERSION) {
    return;
  }

  clearStoredEditorState();
  localStorage.setItem(DATA_VERSION_STORAGE_KEY, DATA_VERSION);
}

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

function normalizeBuildingType(value) {
  const normalized = value.toLowerCase();

  if (normalized === 'office building') {
    return 'office building';
  }

  if (normalized === 'house') {
    return 'house';
  }

  if (normalized === 'government') {
    return 'government';
  }

  return 'building';
}

function inferBuildingType(property) {
  if (property.name.toLowerCase().includes('office building')) {
    return 'office building';
  }

  return normalizeBuildingType(property.buildingType);
}

function formatBuildingType(type) {
  const normalized = normalizeBuildingType(type);

  if (normalized === 'office building') {
    return 'Office Building';
  }

  if (normalized === 'government') {
    return 'Government';
  }

  if (normalized === 'house') {
    return 'House';
  }

  return 'Building';
}

function markerColorFor(property) {
  const type = inferBuildingType(property);

  if (type === 'house') {
    return '#25a55f';
  }

  if (type === 'office building') {
    return '#8e44ad';
  }

  if (type === 'government') {
    return '#050505';
  }

  return '#f28c28';
}

function markerOutlineColorFor(property) {
  const owner = property.owner.trim().toLowerCase();
  const price = property.price.trim().toLowerCase();
  const tax = property.tax.trim().toLowerCase();
  const isOwned = owner && owner !== 'n/a' && owner !== 'none';
  const isUnavailable = price === 'not for sale' ||
    tax === 'not for sale' ||
    price === 'n/a' ||
    tax === 'n/a';

  if (isUnavailable) {
    return '#ff3030';
  }

  if (isOwned) {
    return '#24d16f';
  }

  return '#ffd43b';
}

function getBuildingRect(region, property) {
  if (region.buildingRect) {
    return region.buildingRect;
  }

  const [left, top, right, bottom] = region.rect;

  if (property.buildingType.toLowerCase() === 'house') {
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

function getMarkerRotation(region) {
  return Number(region.rotation || 0);
}

function normalizeDegrees(value) {
  return Math.round((((value % 360) + 540) % 360) - 180);
}

function editablePropertyFields() {
  return [
    ['name', elements.propertyNameEdit],
    ['buildingType', elements.buildingTypeEdit],
    ['number', elements.propertyNumberEdit],
    ['owner', elements.propertyOwnerEdit],
    ['price', elements.propertyPriceEdit],
    ['tax', elements.propertyTaxEdit]
  ];
}

function setPropertyEditorsDisabled(disabled) {
  for (const [, element] of editablePropertyFields()) {
    element.disabled = disabled;
  }
}

function saveCustomProperties() {
  const customProperties = properties
    .filter(property => property.custom)
    .map(property => {
      const marker = propertyMarkers.find(region => region.id === property.id);

      return {
        property: {
          id: property.id,
          name: property.name,
          number: property.number,
          buildingType: property.buildingType,
          owner: property.owner,
          price: property.price,
          tax: property.tax,
          custom: true
        },
        marker: marker ? {
          id: marker.id,
          rect: marker.rect,
          buildingRect: marker.buildingRect,
          removed: Boolean(marker.removed),
          rotation: getMarkerRotation(marker),
          color: marker.color || DEFAULT_MARKER_COLOR,
          custom: true
        } : null
      };
    });

  localStorage.setItem(CUSTOM_PROPERTY_STORAGE_KEY, JSON.stringify(customProperties));
}

function applyStoredCustomProperties() {
  const stored = JSON.parse(localStorage.getItem(CUSTOM_PROPERTY_STORAGE_KEY) || '[]');

  for (const entry of stored) {
    if (!entry?.property?.id || !entry?.marker) {
      continue;
    }

    if (properties.some(property => property.id === entry.property.id) ||
      propertyMarkers.some(marker => marker.id === entry.marker.id)) {
      continue;
    }

    properties.push({
      ...entry.property,
      custom: true
    });
    propertyMarkers.push({
      ...entry.marker,
      custom: true
    });
  }
}

function saveMarkerEdits() {
  const editedMarkers = {};

  for (const marker of propertyMarkers) {
    if (marker.custom) {
      continue;
    }

    if (marker.buildingRect || marker.removed || marker.rotation) {
      editedMarkers[marker.id] = {
        buildingRect: marker.buildingRect,
        removed: Boolean(marker.removed),
        rotation: getMarkerRotation(marker)
      };
    }
  }

  localStorage.setItem(MARKER_STORAGE_KEY, JSON.stringify(editedMarkers));
  saveCustomProperties();
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
      marker.rotation = Number(edit.rotation || 0);
    }
  }
}

function savePropertyEdits() {
  const editedProperties = {};

  for (const property of properties) {
    if (property.custom) {
      continue;
    }

    if (property.localEdited) {
      editedProperties[property.id] = {
        buildingType: property.buildingType,
        name: property.name,
        number: property.number,
        owner: property.owner,
        price: property.price,
        tax: property.tax
      };
    }
  }

  localStorage.setItem(PROPERTY_STORAGE_KEY, JSON.stringify(editedProperties));
  saveCustomProperties();
}

function applyStoredPropertyEdits() {
  const stored = JSON.parse(localStorage.getItem(PROPERTY_STORAGE_KEY) || '{}');

  for (const property of properties) {
    const edit = stored[property.id];

    if (edit) {
      property.name = edit.name || property.name;
      property.number = edit.number || property.number;
      property.buildingType = edit.buildingType ? normalizeBuildingType(edit.buildingType) : property.buildingType;
      property.owner = edit.owner || property.owner;
      property.price = edit.price || property.price;
      property.tax = edit.tax || property.tax;
      property.localEdited = true;
    }

    property.buildingType = inferBuildingType(property);
  }
}

function markerSnapshot(marker) {
  return {
    buildingRect: marker.buildingRect ? [...marker.buildingRect] : undefined,
    removed: Boolean(marker.removed),
    rotation: getMarkerRotation(marker)
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
  marker.rotation = snapshot.rotation || 0;
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

function applyMarkerElementStyle(markerElement, rect, rotation = 0) {
  const scale = getMarkerScale();
  const [left, top, right, bottom] = rect;
  markerElement.style.left = `${left * scale}px`;
  markerElement.style.top = `${top * scale}px`;
  markerElement.style.width = `${(right - left) * scale}px`;
  markerElement.style.height = `${(bottom - top) * scale}px`;
  markerElement.style.transform = `rotate(${rotation}deg)`;
}

function updateMarkerRect(id, rect) {
  const marker = propertyMarkers.find(region => region.id === id);

  if (!marker) {
    return;
  }

  marker.buildingRect = rect.map(value => Math.round(value));

  const markerElement = document.querySelector(`.marker[data-id="${id}"]`);
  if (markerElement) {
    applyMarkerElementStyle(markerElement, marker.buildingRect, getMarkerRotation(marker));
    markerElement.classList.add('active');
    activeMarker = markerElement;
  }
}

function updateMarkerRotation(id, rotation) {
  const marker = propertyMarkers.find(region => region.id === id);

  if (!marker) {
    return;
  }

  marker.rotation = normalizeDegrees(rotation);

  const markerElement = document.querySelector(`.marker[data-id="${id}"]`);
  if (markerElement) {
    markerElement.style.transform = `rotate(${marker.rotation}deg)`;
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
  document.querySelector('.status-panel').classList.toggle('editing', editMode);
  elements.addBox.disabled = !editMode;
  elements.exportBoxes.disabled = !editMode;
  setPropertyEditorsDisabled(!editMode || !selectedMarkerId);
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
  elements.propertyNameEdit.value = property.name;
  property.buildingType = inferBuildingType(property);
  elements.buildingType.textContent = formatBuildingType(property.buildingType);
  elements.buildingTypeEdit.value = normalizeBuildingType(property.buildingType);
  elements.propertyNumber.textContent = property.number;
  elements.propertyNumberEdit.value = property.number;
  elements.propertyOwner.textContent = property.owner;
  elements.propertyOwnerEdit.value = property.owner;
  elements.propertyPrice.textContent = property.price;
  elements.propertyPriceEdit.value = property.price;
  elements.propertyTax.textContent = property.tax;
  elements.propertyTaxEdit.value = property.tax;
  elements.search.value = labelFor(property);
  setPropertyEditorsDisabled(!editMode);

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

function updateSelectedPropertyField(field, value) {
  if (!editMode || !selectedMarkerId) {
    return;
  }

  const property = propertiesById.get(selectedMarkerId);
  const nextValue = value.trim();

  if (!property || !nextValue) {
    return;
  }

  property[field] = field === 'buildingType' ? normalizeBuildingType(nextValue) : nextValue;
  property.buildingType = inferBuildingType(property);
  property.localEdited = true;
  elements.propertyName.textContent = labelFor(property);
  elements.buildingType.textContent = formatBuildingType(property.buildingType);
  elements.buildingTypeEdit.value = normalizeBuildingType(property.buildingType);
  elements.propertyNumber.textContent = property.number;
  elements.propertyOwner.textContent = property.owner;
  elements.propertyPrice.textContent = property.price;
  elements.propertyTax.textContent = property.tax;
  elements.search.value = labelFor(property);
  savePropertyEdits();
  renderOptions();

  if (activeMarker) {
    activeMarker.setAttribute('aria-label', labelFor(property));
  }
}

function updateSelectedPropertyFromInput(event) {
  updateSelectedPropertyField(event.currentTarget.dataset.field, event.currentTarget.value);
}

function updateSelectedBuildingType() {
  if (!editMode || !selectedMarkerId) {
    return;
  }

  const property = propertiesById.get(selectedMarkerId);

  if (!property) {
    return;
  }

  property.buildingType = normalizeBuildingType(elements.buildingTypeEdit.value);
  property.buildingType = inferBuildingType(property);
  property.localEdited = true;
  savePropertyEdits();
  renderOptions();
  renderMarkers();
  selectProperty(property.id);
}

function createNewBox() {
  if (!editMode) {
    openPasswordDialog();
    return;
  }

  const number = window.prompt('Postal or building number for the new box:');

  if (!number?.trim()) {
    return;
  }

  const scale = getMarkerScale();
  const centerX = clamp((elements.mapWrap.scrollLeft + elements.mapWrap.clientWidth / 2) / scale, 0, MAP_SIZE);
  const centerY = clamp((elements.mapWrap.scrollTop + elements.mapWrap.clientHeight / 2) / scale, 0, MAP_SIZE);
  const width = 90;
  const height = 70;
  const left = clamp(centerX - width / 2, 0, MAP_SIZE - width);
  const top = clamp(centerY - height / 2, 0, MAP_SIZE - height);
  const id = `custom-${Date.now()}`;
  const property = {
    id,
    name: `Property ${number.trim()}`,
    number: number.trim(),
    buildingType: 'building',
    owner: 'N/A',
    price: 'Not for sale',
    tax: 'Not for sale',
    custom: true,
    localEdited: true
  };
  const marker = {
    id,
    rect: [left, top, left + width, top + height].map(value => Math.round(value)),
    buildingRect: [left, top, left + width, top + height].map(value => Math.round(value)),
    color: '#35a7ff',
    custom: true
  };

  properties.push(property);
  propertyMarkers.push(marker);
  propertiesById.set(id, property);
  saveCustomProperties();
  renderOptions();
  renderMarkers();
  selectProperty(id);
}

async function exportBoxes() {
  const exportData = {
    properties: properties
      .filter(isSelectableProperty)
      .map(property => ({
        id: property.id,
        name: property.name,
        number: property.number,
        buildingType: property.buildingType,
        owner: property.owner,
        price: property.price,
        tax: property.tax,
        custom: Boolean(property.custom)
      })),
    markers: propertyMarkers
      .filter(region => !isPostalOnlyMarker(region) && !region.removed)
      .map(region => ({
        id: region.id,
        rect: region.rect,
        buildingRect: region.buildingRect || region.rect,
        rotation: getMarkerRotation(region),
        custom: Boolean(region.custom)
      }))
  };
  const json = `${JSON.stringify(exportData, null, 2)}\n`;
  const blob = new Blob([json], { type: 'application/json' });
  const link = document.createElement('a');

  link.href = URL.createObjectURL(blob);
  link.download = 'erlc-property-boxes-export.json';
  link.click();
  URL.revokeObjectURL(link.href);

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(json);
  }

  elements.exportBoxes.textContent = 'Exported';
  window.setTimeout(() => {
    elements.exportBoxes.textContent = 'Export Boxes';
  }, 1600);
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
    property.buildingType = inferBuildingType(property);
    marker.style.setProperty('--marker-color', markerColorFor(property));
    marker.style.setProperty('--outline-color', markerOutlineColorFor(property));
    marker.style.left = `${left * scale}px`;
    marker.style.top = `${top * scale}px`;
    marker.style.width = `${(right - left) * scale}px`;
    marker.style.height = `${(bottom - top) * scale}px`;
    marker.style.transform = `rotate(${getMarkerRotation(region)}deg)`;
    marker.setAttribute('aria-label', labelFor(property));
    marker.addEventListener('pointerdown', event => startMarkerEdit(event, region, property));
    marker.addEventListener('click', event => {
      if (editMode) {
        event.preventDefault();
        selectProperty(region.id);
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
    const rotateHandle = document.createElement('span');
    rotateHandle.className = 'rotate-handle';
    rotateHandle.dataset.handle = 'rotate';
    marker.append(rotateHandle);
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
  const [left, top, right, bottom] = rect;
  const centerX = elements.markers.getBoundingClientRect().left + ((left + right) / 2) * scale;
  const centerY = elements.markers.getBoundingClientRect().top + ((top + bottom) / 2) * scale;
  selectProperty(region.id);
  dragState = {
    handle,
    id: region.id,
    rect: [...rect],
    before: markerSnapshot(region),
    centerX,
    centerY,
    startAngle: Math.atan2(event.clientY - centerY, event.clientX - centerX) * 180 / Math.PI,
    startRotation: getMarkerRotation(region),
    moved: false,
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

  if (!dragState.moved && (Math.abs(dx) >= 1 || Math.abs(dy) >= 1)) {
    undoStack.push({
      id: dragState.id,
      before: dragState.before
    });

    if (undoStack.length > 100) {
      undoStack.shift();
    }

    dragState.moved = true;
  }

  let [left, top, right, bottom] = dragState.rect;

  if (dragState.handle === 'rotate') {
    const angle = Math.atan2(event.clientY - dragState.centerY, event.clientX - dragState.centerX) * 180 / Math.PI;
    updateMarkerRotation(dragState.id, dragState.startRotation + angle - dragState.startAngle);
    return;
  }

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
  if (dragState?.moved) {
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
  const isTyping = tagName === 'input' || tagName === 'textarea' || tagName === 'select';

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
  resetStoredEditorStateForImportedData();

  const [propertiesResponse, markersResponse] = await Promise.all([
    fetch('/properties.json'),
    fetch('/property-markers.json')
  ]);
  properties = await propertiesResponse.json();
  propertyMarkers = await markersResponse.json();
  applyStoredCustomProperties();
  applyStoredPropertyEdits();
  applyStoredMarkerEdits();
  propertiesById = new Map(properties.map(property => [property.id, property]));

  renderOptions();
  renderMarkers();
  elements.addBox.disabled = true;
  elements.exportBoxes.disabled = true;
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
  elements.togglePasswordView.addEventListener('click', () => {
    const isVisible = elements.editPassword.type === 'text';
    elements.editPassword.type = isVisible ? 'password' : 'text';
    elements.togglePasswordView.textContent = isVisible ? 'Show' : 'Hide';
    elements.togglePasswordView.setAttribute('aria-label', isVisible ? 'Show password' : 'Hide password');
    elements.togglePasswordView.setAttribute('aria-pressed', String(!isVisible));
    elements.editPassword.focus();
  });
  elements.undoEdit.addEventListener('click', undoLastEdit);
  elements.addBox.addEventListener('click', createNewBox);
  elements.exportBoxes.addEventListener('click', () => {
    exportBoxes().catch(() => {
      elements.exportBoxes.textContent = 'Download Ready';
      window.setTimeout(() => {
        elements.exportBoxes.textContent = 'Export Boxes';
      }, 1600);
    });
  });
  elements.resetBoxes.addEventListener('click', () => {
    clearStoredEditorState();
    window.location.reload();
  });
  for (const [field, element] of editablePropertyFields()) {
    element.dataset.field = field;
    if (field !== 'buildingType') {
      element.addEventListener('input', updateSelectedPropertyFromInput);
    }
  }
  elements.buildingTypeEdit.addEventListener('change', updateSelectedBuildingType);
  window.addEventListener('keydown', handleKeyboardEdit);
  window.addEventListener('pointermove', moveMarkerEdit);
  window.addEventListener('pointerup', stopMarkerEdit);
  setZoom(1, false);
}

window.addEventListener('resize', renderMarkers);
init();
