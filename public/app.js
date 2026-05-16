const MAP_SIZE = 3120;
const BASE_DISPLAY_SIZE = 1800;
const DEFAULT_MARKER_COLOR = '#ff3535';
const TURF_CANVAS_SIZE = 1040;
const DATA_VERSION = 'imported-boxes-2026-05-03-clean';
const DATA_VERSION_STORAGE_KEY = 'erlcPropertyMapDataVersion';
const MARKER_STORAGE_KEY = 'erlcPropertyMarkerEdits';
const PROPERTY_STORAGE_KEY = 'erlcPropertyEdits';
const CUSTOM_PROPERTY_STORAGE_KEY = 'erlcCustomProperties';
const ORG_STORAGE_KEY = 'erlcDirectoryRecords';
const TURF_STORAGE_KEY = 'erlcMafiaTurfEdits';
const TURF_ALIGNMENT_STORAGE_KEY = 'erlcMafiaTurfAlignment';
const BLACKLIST_REGIONS_STORAGE_KEY = 'erlcMafiaBlacklistRegions';
const CLIENT_ID_STORAGE_KEY = 'erlcPropertyMapClientId';
const LIVE_DATA_URL = 'https://floridaoperationshub.vercel.app/api/live-data';
const MIN_MARKER_SIZE = 18;
const EDIT_PASSWORD = 'MoreBusinesses';
const BLACKLIST_IMAGE_SRC = '/assets/mafia-turf-blacklist.png?v=2';
const DEFAULT_BLACKLIST_REGIONS = [
  { id: 'blacklist-1', sourceRect: [1083, 577, 1352, 772], offsetX: 0, offsetY: 0, scale: 1 },
  { id: 'blacklist-2', sourceRect: [577, 1031, 754, 1282], offsetX: 0, offsetY: 0, scale: 1 },
  { id: 'blacklist-3', sourceRect: [1118, 1189, 1175, 1286], offsetX: 0, offsetY: 0, scale: 1 },
  { id: 'blacklist-4', sourceRect: [877, 1269, 990, 1394], offsetX: 0, offsetY: 0, scale: 1 },
  { id: 'blacklist-5', sourceRect: [477, 1407, 535, 1471], offsetX: 0, offsetY: 0, scale: 1 },
  { id: 'blacklist-6', sourceRect: [1127, 1417, 1211, 1508], offsetX: 0, offsetY: 0, scale: 1 },
  { id: 'blacklist-7', sourceRect: [955, 1584, 1085, 1653], offsetX: 0, offsetY: 0, scale: 1 }
];

const elements = {
  navLinks: document.querySelectorAll('.nav-link'),
  viewPanels: document.querySelectorAll('[data-view-panel]'),
  directoryAddButtons: document.querySelectorAll('[data-directory-add]'),
  regulationAddButtons: document.querySelectorAll('[data-regulation-add]'),
  businessList: document.querySelector('#businessList'),
  mafiaList: document.querySelector('#mafiaList'),
  generalRegulationList: document.querySelector('#generalRegulationList'),
  billingRegulationList: document.querySelector('#billingRegulationList'),
  businessRegulationList: document.querySelector('#businessRegulationList'),
  mafiaRegulationList: document.querySelector('#mafiaRegulationList'),
  datalist: document.querySelector('#propertyOptions'),
  mapSurface: document.querySelector('#mapSurface'),
  mapWrap: document.querySelector('#mapWrap'),
  markers: document.querySelector('#markers'),
  turfDatalist: document.querySelector('#turfOptions'),
  turfMapSurface: document.querySelector('#turfMapSurface'),
  turfMapWrap: document.querySelector('#turfMapWrap'),
  turfShapeCanvas: document.querySelector('#turfShapeCanvas'),
  turfMarkers: document.querySelector('#turfMarkers'),
  turfSearch: document.querySelector('#turfSearch'),
  turfZoomIn: document.querySelector('#turfZoomIn'),
  turfZoomOut: document.querySelector('#turfZoomOut'),
  turfZoomRange: document.querySelector('#turfZoomRange'),
  turfZoomValue: document.querySelector('#turfZoomValue'),
  addTurf: document.querySelector('#addTurf'),
  undoTurfEdit: document.querySelector('#undoTurfEdit'),
  alignTurfs: document.querySelector('#alignTurfs'),
  turfScaleDown: document.querySelector('#turfScaleDown'),
  turfScaleUp: document.querySelector('#turfScaleUp'),
  resetTurfAlignment: document.querySelector('#resetTurfAlignment'),
  editBlacklistRegions: document.querySelector('#editBlacklistRegions'),
  blacklistScaleDown: document.querySelector('#blacklistScaleDown'),
  blacklistScaleUp: document.querySelector('#blacklistScaleUp'),
  resetBlacklistRegions: document.querySelector('#resetBlacklistRegions'),
  toggleTurfKey: document.querySelector('#toggleTurfKey'),
  turfKeyPanel: document.querySelector('#turfKeyPanel'),
  turfKeyList: document.querySelector('#turfKeyList'),
  turfPublishStatus: document.querySelector('#turfPublishStatus'),
  search: document.querySelector('#propertySearch'),
  zoomIn: document.querySelector('#zoomIn'),
  zoomOut: document.querySelector('#zoomOut'),
  zoomRange: document.querySelector('#zoomRange'),
  zoomValue: document.querySelector('#zoomValue'),
  addBox: document.querySelector('#addBox'),
  exportBoxes: document.querySelector('#exportBoxes'),
  publishStatus: document.querySelector('#publishStatus'),
  editModeLock: document.querySelector('#editModeLock'),
  undoEdit: document.querySelector('#undoEdit'),
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
  propertySaleStatus: document.querySelector('#propertySaleStatus'),
  propertySaleStatusEdit: document.querySelector('#propertySaleStatusEdit'),
  propertyPrice: document.querySelector('#propertyPrice'),
  propertyPriceEdit: document.querySelector('#propertyPriceEdit'),
  propertyTax: document.querySelector('#propertyTax'),
  propertyTaxEdit: document.querySelector('#propertyTaxEdit'),
  turfName: document.querySelector('#turfName'),
  turfNumber: document.querySelector('#turfNumber'),
  turfNumberEdit: document.querySelector('#turfNumberEdit'),
  turfOwner: document.querySelector('#turfOwner'),
  turfOwnerEdit: document.querySelector('#turfOwnerEdit'),
  turfStatus: document.querySelector('#turfStatus'),
  turfStatusEdit: document.querySelector('#turfStatusEdit')
};

let properties = [];
let propertiesById = new Map();
let propertyMarkers = [];
let mafiaTurfs = [];
let directoryRecords = {
  businesses: [],
  mafias: [],
  generalRegulations: [],
  billingRegulations: [],
  businessRegulations: [],
  mafiaRegulations: []
};
let activeMarker = null;
let selectedMarkerId = null;
let activeTurf = null;
let selectedTurfId = null;
let zoom = 1;
let turfZoom = 1;
let editMode = false;
let dragState = null;
let turfDragState = null;
let turfHitMap = null;
let turfHitIds = [];
let turfOutsideMask = null;
let turfAlignment = { scale: 0.94, offsetX: 0, offsetY: 0 };
let turfAlignmentMode = false;
let turfAlignmentDrag = null;
let blacklistRegions = getDefaultBlacklistRegions();
let blacklistHitMap = null;
let blacklistHitIds = [];
let blacklistRegionMode = false;
let blacklistRegionDrag = null;
let selectedBlacklistRegionId = null;
let blacklistImageCache = null;
let undoStack = [];
let turfUndoStack = [];
let editSessionPassword = '';
let cloudSaveTimeout = null;
let cloudSaveInFlight = false;
let cloudSaveQueued = false;
let remoteDataSignature = '';
let remoteDataVersion = '';
let lastLocalSaveSignature = '';
let lastSavedDataSignature = '';
const clientId = getClientId();

function getClientId() {
  const existing = sessionStorage.getItem(CLIENT_ID_STORAGE_KEY);

  if (existing) {
    return existing;
  }

  const value = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  sessionStorage.setItem(CLIENT_ID_STORAGE_KEY, value);
  return value;
}

function setActiveView(view) {
  for (const link of elements.navLinks) {
    link.classList.toggle('active', link.dataset.view === view);
  }

  for (const panel of elements.viewPanels) {
    panel.classList.toggle('active', panel.dataset.viewPanel === view);
  }

  if (view === 'propertyMap') {
    renderMarkers();
  }

  if (view === 'mafiaTurfMap') {
    renderTurfs();
    renderTurfKey();
  }
}

function unlockEditMode() {
  editSessionPassword = EDIT_PASSWORD;
  setEditMode(true);
}

function clearStoredEditorState() {
  localStorage.removeItem(MARKER_STORAGE_KEY);
  localStorage.removeItem(PROPERTY_STORAGE_KEY);
  localStorage.removeItem(CUSTOM_PROPERTY_STORAGE_KEY);
  localStorage.removeItem(ORG_STORAGE_KEY);
  localStorage.removeItem(TURF_STORAGE_KEY);
  localStorage.removeItem(TURF_ALIGNMENT_STORAGE_KEY);
  localStorage.removeItem(BLACKLIST_REGIONS_STORAGE_KEY);
}

function buildExportData() {
  return {
    properties: properties
      .filter(isSelectableProperty)
      .map(property => ({
        id: property.id,
        name: property.name,
        number: property.number,
        buildingType: property.buildingType,
        owner: property.owner,
        saleStatus: normalizeSaleStatus(property.saleStatus),
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
    ,
    orgs: getDirectoryExportData(),
    turfs: getTurfExportData(),
    turfAlignment: getTurfAlignmentExportData(),
    blacklistRegions: getBlacklistRegionsExportData()
  };
}

function setPublishStatus(message) {
  elements.publishStatus.textContent = message;
  elements.turfPublishStatus.textContent = message;
}

function isLocalHostPreview() {
  return ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
}

function getLiveDataUrl() {
  return isLocalHostPreview() ? LIVE_DATA_URL : '/api/live-data';
}

function getSaveBoxesUrl() {
  return isLocalHostPreview() ? 'https://floridaoperationshub.vercel.app/api/save-boxes' : '/api/save-boxes';
}

function currentDataSignature() {
  return JSON.stringify({
    properties: buildExportData().properties,
    markers: buildExportData().markers,
    orgs: getDirectoryExportData(),
    turfs: getTurfExportData(),
    turfAlignment: getTurfAlignmentExportData(),
    blacklistRegions: getBlacklistRegionsExportData()
  });
}

async function fetchJson(url) {
  const requestUrl = new URL(url, window.location.origin);
  requestUrl.searchParams.set('t', String(Date.now()));
  const response = await fetch(requestUrl.toString(), {
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}`);
  }

  return response.json();
}

function getFullLiveDataUrl() {
  const url = new URL(getLiveDataUrl(), window.location.origin);
  url.searchParams.set('full', '1');
  return url.toString();
}

function applyLiveDataset(liveData, statusMessage = 'Synced live') {
  if (liveData.unchanged) {
    remoteDataVersion = liveData.version || remoteDataVersion;
    return false;
  }

  const nextProperties = Array.isArray(liveData.properties) ? liveData.properties.map(normalizePropertyRecord) : [];
  const nextMarkers = liveData.markers || [];
  const nextOrgs = liveData.orgs || {};
  const nextTurfs = Array.isArray(liveData.turfs) ? liveData.turfs.map(normalizeTurfRecord) : [];
  const nextTurfAlignment = normalizeTurfAlignment(liveData.turfAlignment);
  const nextBlacklistRegions = normalizeBlacklistRegions(liveData.blacklistRegions);
  const nextSignature = JSON.stringify({
    properties: nextProperties,
    markers: nextMarkers,
    orgs: nextOrgs,
    turfs: nextTurfs,
    turfAlignment: nextTurfAlignment,
    blacklistRegions: nextBlacklistRegions
  });

  if (liveData.updatedBy === clientId) {
    remoteDataSignature = nextSignature;
    lastSavedDataSignature = nextSignature;
    remoteDataVersion = liveData.version || liveData.updatedAt || remoteDataVersion;
    return false;
  }

  if (nextSignature === lastLocalSaveSignature) {
    remoteDataSignature = nextSignature;
    lastSavedDataSignature = nextSignature;
    remoteDataVersion = liveData.version || liveData.updatedAt || remoteDataVersion;
    return false;
  }

  if (nextSignature === remoteDataSignature || nextSignature === currentDataSignature()) {
    remoteDataSignature = nextSignature;
    lastSavedDataSignature = nextSignature;
    remoteDataVersion = liveData.version || liveData.updatedAt || remoteDataVersion;
    return false;
  }

  properties = nextProperties;
  propertyMarkers = nextMarkers;
  mafiaTurfs = nextTurfs;
  turfAlignment = nextTurfAlignment;
  blacklistRegions = nextBlacklistRegions;
    directoryRecords = {
      businesses: Array.isArray(nextOrgs.businesses) ? nextOrgs.businesses.map(record => normalizeDirectoryRecord(record)) : [],
      mafias: Array.isArray(nextOrgs.mafias) ? nextOrgs.mafias.map(record => normalizeDirectoryRecord(record, 'Tier 1')) : [],
      generalRegulations: Array.isArray(nextOrgs.generalRegulations) ? nextOrgs.generalRegulations.map(normalizeRegulationRecord) : [],
      billingRegulations: Array.isArray(nextOrgs.billingRegulations) ? nextOrgs.billingRegulations.map(normalizeRegulationRecord) : [],
      businessRegulations: Array.isArray(nextOrgs.businessRegulations) ? nextOrgs.businessRegulations.map(normalizeRegulationRecord) : [],
      mafiaRegulations: Array.isArray(nextOrgs.mafiaRegulations) ? nextOrgs.mafiaRegulations.map(normalizeRegulationRecord) : []
    };
  propertiesById = new Map(properties.map(property => [property.id, property]));
  remoteDataSignature = nextSignature;
  lastSavedDataSignature = nextSignature;
  remoteDataVersion = liveData.version || liveData.updatedAt || remoteDataVersion;
  clearStoredEditorState();
  renderOptions();
  renderMarkers();
  renderTurfs();
  renderTurfOptions();
  renderDirectoryLists();

  if (selectedMarkerId && propertiesById.has(selectedMarkerId)) {
    selectProperty(selectedMarkerId);
  }

  setPublishStatus(statusMessage);
  return true;
}

function startLiveDataSync() {
  remoteDataSignature = currentDataSignature();
  lastSavedDataSignature = remoteDataSignature;
}

function normalizeTurfAlignment(record) {
  return {
    scale: Math.min(1.4, Math.max(0.55, Number(record?.scale) || 0.94)),
    offsetX: Math.min(220, Math.max(-220, Number(record?.offsetX) || 0)),
    offsetY: Math.min(220, Math.max(-220, Number(record?.offsetY) || 0))
  };
}

function getDefaultBlacklistRegions() {
  return DEFAULT_BLACKLIST_REGIONS.map((region, index) => normalizeBlacklistRegion(region, index));
}

function normalizeBlacklistRegion(record, index = 0) {
  const fallback = DEFAULT_BLACKLIST_REGIONS[index] || DEFAULT_BLACKLIST_REGIONS[0];
  const sourceRect = Array.isArray(record?.sourceRect) && record.sourceRect.length === 4
    ? record.sourceRect.map(value => Math.round(Number(value) || 0))
    : [...fallback.sourceRect];

  return {
    id: String(record?.id || fallback.id || `blacklist-${index + 1}`),
    sourceRect,
    offsetX: Math.min(260, Math.max(-260, Number(record?.offsetX) || 0)),
    offsetY: Math.min(260, Math.max(-260, Number(record?.offsetY) || 0)),
    scale: Math.min(2, Math.max(0.25, Number(record?.scale) || 1))
  };
}

function normalizeBlacklistRegions(records) {
  if (!Array.isArray(records) || !records.length) {
    return getDefaultBlacklistRegions();
  }

  const byId = new Map(records.map(record => [String(record?.id || ''), record]));

  return DEFAULT_BLACKLIST_REGIONS.map((fallback, index) => {
    return normalizeBlacklistRegion(byId.get(fallback.id) || records[index] || fallback, index);
  });
}

function normalizeTurfRecord(record) {
  const rect = Array.isArray(record.rect) && record.rect.length === 4
    ? record.rect.map(value => Math.round(Number(value) || 0))
    : [1200, 1200, 1380, 1320];

  return {
    id: String(record.id || `turf-${Date.now()}`),
    number: String(record.number || ''),
    owner: String(record.owner || 'Unclaimed'),
    status: String(record.status || 'Unclaimed'),
    rect,
    rotation: Number(record.rotation || 0)
  };
}

function getTurfAlignmentExportData() {
  return normalizeTurfAlignment(turfAlignment);
}

function getBlacklistRegionsExportData() {
  return normalizeBlacklistRegions(blacklistRegions);
}

function getTurfExportData() {
  return mafiaTurfs
    .filter(turf => !turf.removed)
    .map(turf => ({
      id: turf.id,
      number: turf.number,
      owner: turf.owner,
      status: turf.status,
      rect: turf.rect,
      rotation: Number(turf.rotation || 0)
    }));
}

function getDirectoryExportData() {
  return {
    businesses: directoryRecords.businesses.map(record => normalizeDirectoryRecord(record)),
    mafias: directoryRecords.mafias.map(record => normalizeDirectoryRecord(record, 'Tier 1')),
    generalRegulations: directoryRecords.generalRegulations.map(normalizeRegulationRecord),
    billingRegulations: directoryRecords.billingRegulations.map(normalizeRegulationRecord),
    businessRegulations: directoryRecords.businessRegulations.map(normalizeRegulationRecord),
    mafiaRegulations: directoryRecords.mafiaRegulations.map(normalizeRegulationRecord)
  };
}

function normalizeDirectoryRecord(record, defaultTier = '') {
  const ownerParts = splitOwnerLabelAndId(record.owner, record.ownerId);
  const tierValue = record.tier || defaultTier;

  return {
    id: String(record.id),
    name: String(record.name || ''),
    owner: ownerParts.owner,
    ownerId: ownerParts.ownerId,
    type: String(record.type || ''),
    tier: tierValue ? normalizeMafiaTier(tierValue) : '',
    server: String(record.server || ''),
    logo: String(record.logo || ''),
    registeredAt: String(record.registeredAt || record.createdAt || '')
  };
}

function normalizeMafiaTier(value) {
  const normalized = String(value || '').trim().toLowerCase().replace(/[-_]+/g, ' ');

  if (normalized === 'tier 2' || normalized === '2') {
    return 'Tier 2';
  }

  if (normalized === 'tier 3' || normalized === '3') {
    return 'Tier 3';
  }

  return 'Tier 1';
}

function splitOwnerLabelAndId(owner, ownerId = '') {
  const text = String(owner || '').trim();
  const explicitId = String(ownerId || '').trim();
  const match = text.match(/^(.*?)\s*\((\d{17,20})\)\s*$/);

  if (!match) {
    return {
      owner: text,
      ownerId: explicitId
    };
  }

  return {
    owner: match[1].trim(),
    ownerId: explicitId || match[2]
  };
}

function normalizeRegulationRecord(record) {
  return {
    id: String(record.id),
    name: String(record.name || ''),
    regulations: String(record.regulations || ''),
    pdfName: String(record.pdfName || ''),
    pdfData: String(record.pdfData || ''),
    pdfPath: String(record.pdfPath || '')
  };
}

function saveDirectoryRecords() {
  localStorage.setItem(ORG_STORAGE_KEY, JSON.stringify(getDirectoryExportData()));
  scheduleCloudSave();
}

function applyStoredDirectoryRecords() {
  const stored = JSON.parse(localStorage.getItem(ORG_STORAGE_KEY) || 'null');

  if (!stored) {
    return;
  }

    directoryRecords = {
      businesses: Array.isArray(stored.businesses) ? stored.businesses.map(record => normalizeDirectoryRecord(record)) : [],
      mafias: Array.isArray(stored.mafias) ? stored.mafias.map(record => normalizeDirectoryRecord(record, 'Tier 1')) : [],
      generalRegulations: Array.isArray(stored.generalRegulations) ? stored.generalRegulations.map(normalizeRegulationRecord) : [],
      billingRegulations: Array.isArray(stored.billingRegulations) ? stored.billingRegulations.map(normalizeRegulationRecord) : [],
      businessRegulations: Array.isArray(stored.businessRegulations) ? stored.businessRegulations.map(normalizeRegulationRecord) : [],
      mafiaRegulations: Array.isArray(stored.mafiaRegulations) ? stored.mafiaRegulations.map(normalizeRegulationRecord) : []
    };
}

function directoryConfig(key) {
  return key === 'mafias'
    ? {
      title: 'mafia',
      list: elements.mafiaList,
      records: directoryRecords.mafias
    }
    : {
      title: 'business',
      list: elements.businessList,
      records: directoryRecords.businesses
    };
}

function regulationConfig(key) {
  const configs = {
    generalRegulations: {
      title: 'general regulation',
      list: elements.generalRegulationList,
      records: directoryRecords.generalRegulations
    },
    billingRegulations: {
      title: 'billing regulation',
      list: elements.billingRegulationList,
      records: directoryRecords.billingRegulations
    },
    businessRegulations: {
      title: 'business regulation',
      list: elements.businessRegulationList,
      records: directoryRecords.businessRegulations
    },
    mafiaRegulations: {
      title: 'mafia regulation',
      list: elements.mafiaRegulationList,
      records: directoryRecords.mafiaRegulations
    }
  };

  return configs[key] || configs.businessRegulations;
}

function addDirectoryRecord(key) {
  if (!editMode) {
    openPasswordDialog();
    return;
  }

  const config = directoryConfig(key);
  const record = {
    id: `${key}-${Date.now()}`,
    name: `New ${config.title}`,
    owner: 'N/A',
    ownerId: '',
    type: config.title === 'mafia' ? 'Mafia' : 'Business',
    tier: config.title === 'mafia' ? 'Tier 1' : '',
    server: '',
    logo: ''
  };

  config.records.push(record);
  saveDirectoryRecords();
  renderDirectoryLists();
}

function updateDirectoryRecord(key, id, field, value) {
  const config = directoryConfig(key);
  const record = config.records.find(item => item.id === id);

  if (!record) {
    return;
  }

  record[field] = value;
  saveDirectoryRecords();
  renderDirectoryLists();
}

function removeDirectoryRecord(key, id) {
  const config = directoryConfig(key);
  const index = config.records.findIndex(item => item.id === id);

  if (index === -1) {
    return;
  }

  config.records.splice(index, 1);
  saveDirectoryRecords();
  renderDirectoryLists();
}

function createDirectoryCard(key, record) {
  const card = document.createElement('article');
  card.className = 'org-card';

  const logo = record.logo
    ? `<img src="${escapeHtml(record.logo)}" alt="">`
    : record.name.trim().slice(0, 1).toUpperCase() || '?';

  card.innerHTML = `
    <div class="org-card-header">
      <div class="org-logo">${logo}</div>
      <div class="org-title">
        <h2>${record.name || 'Unnamed'}</h2>
        <p>${record.type || '-'}</p>
      </div>
    </div>
    <div class="org-fields">
      ${directoryFieldHtml('Name', 'name', record.name)}
      ${directoryFieldHtml('Owner', 'owner', record.owner)}
      ${directoryFieldHtml('Owner ID', 'ownerId', record.ownerId)}
      ${directoryFieldHtml('Type', 'type', record.type)}
      ${key === 'mafias' ? directoryTierFieldHtml(record.tier) : ''}
      ${directoryFieldHtml('Discord Server', 'server', record.server)}
      ${directoryFieldHtml('Logo URL', 'logo', record.logo)}
    </div>
    <div class="org-card-actions">
      <button type="button" class="edit-toggle" data-remove-record>Remove</button>
    </div>
  `;

  for (const input of card.querySelectorAll('input[data-field], select[data-field]')) {
    input.addEventListener('change', () => updateDirectoryRecord(key, record.id, input.dataset.field, input.value));
  }

  card.querySelector('[data-remove-record]').addEventListener('click', () => removeDirectoryRecord(key, record.id));

  return card;
}

function directoryTierFieldHtml(value) {
  const tier = normalizeMafiaTier(value);
  const options = ['Tier 1', 'Tier 2', 'Tier 3']
    .map(option => `<option value="${option}"${option === tier ? ' selected' : ''}>${option}</option>`)
    .join('');

  return `
    <div class="org-field">
      <label>Tier</label>
      <span class="org-display">${tier}</span>
      <select data-field="tier">${options}</select>
    </div>
  `;
}

function directoryFieldHtml(label, field, value) {
  const escapedValue = escapeHtml(value || '');
  const displayValue = field === 'server' ? linkifyText(value || '') : escapedValue;

  return `
    <div class="org-field${field === 'logo' ? ' logo-url-field' : ''}">
      <label>${label}</label>
      <span class="org-display">${displayValue || '-'}</span>
      <input data-field="${field}" value="${escapedValue}">
    </div>
  `;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function linkifyText(value) {
  const urlPattern = /(https?:\/\/[^\s<>"']+)/g;

  return escapeHtml(value || '').replace(urlPattern, url => {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
  });
}

function renderDirectoryList(key) {
  const config = directoryConfig(key);
  config.list.textContent = '';

  if (!config.records.length) {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    emptyState.innerHTML = `<h2>No ${config.title === 'mafia' ? 'mafias' : 'businesses'} listed yet</h2><p>Unlock edit mode to add one.</p>`;
    config.list.append(emptyState);
    return;
  }

  for (const record of config.records) {
    config.list.append(createDirectoryCard(key, record));
  }
}

function renderDirectoryLists() {
  renderDirectoryList('businesses');
  renderDirectoryList('mafias');
  renderRegulationList('generalRegulations');
  renderRegulationList('billingRegulations');
  renderRegulationList('businessRegulations');
  renderRegulationList('mafiaRegulations');
  renderTurfKey();
  renderTurfOwnerOptions(selectedTurfId ? mafiaTurfs.find(turf => turf.id === selectedTurfId)?.owner : 'Unclaimed');
  renderTurfs();
}

function hashColor(value) {
  const text = String(value || 'Unclaimed');
  let hash = 0;

  for (let index = 0; index < text.length; index++) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  }

  const hue = hash % 360;
  return `hsl(${hue} 78% 52%)`;
}

function turfColorFor(owner) {
  const text = String(owner || '').trim();
  const normalized = text.toLowerCase();

  if (!text || normalized === 'unclaimed' || normalized === 'n/a') {
    return '#7a828a';
  }

  if (normalized === 'west side hustlers') {
    return '#2fb344';
  }

  if (normalized === 'bsc' || normalized === 'black crown syndacite' || normalized === 'black crown syndicate') {
    return '#0077be';
  }

  if (
    normalized === 'mainside authority syndacite' ||
    normalized === 'mainside authority syndicate' ||
    normalized === 'mainside authority sanctuary'
  ) {
    return '#ff4fb8';
  }

  if (normalized === 'camorra') {
    return '#ffd23f';
  }

  return hashColor(normalized);
}

function isUnclaimedTurf(turf) {
  const owner = String(turf.owner || '').trim().toLowerCase();

  return !owner || owner === 'unclaimed' || owner === 'n/a';
}

function turfFillAlpha(turf) {
  return isUnclaimedTurf(turf) ? 0 : 112;
}

function renderTurfKey() {
  if (!elements.turfKeyList) {
    return;
  }

  elements.turfKeyList.textContent = '';
  const mafias = Array.isArray(directoryRecords.mafias) ? directoryRecords.mafias : [];
  const blacklistItem = document.createElement('div');
  blacklistItem.className = 'turf-key-item';
  const blacklistSwatch = document.createElement('span');
  blacklistSwatch.className = 'turf-key-swatch';
  blacklistSwatch.style.background = '#d6122d';
  const blacklistLabel = document.createElement('span');
  blacklistLabel.textContent = 'Blacklisted territory';
  blacklistItem.append(blacklistSwatch, blacklistLabel);
  elements.turfKeyList.append(blacklistItem);

  if (!mafias.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = '<h2>No mafias listed yet</h2><p>Unlock edit mode and add mafias to build the key.</p>';
    elements.turfKeyList.append(empty);
    return;
  }

  for (const mafia of mafias) {
    const item = document.createElement('div');
    item.className = 'turf-key-item';
    const swatch = document.createElement('span');
    swatch.className = 'turf-key-swatch';
    swatch.style.background = turfColorFor(mafia.name);
    const label = document.createElement('span');
    label.textContent = mafia.name || 'Unnamed mafia';
    item.append(swatch, label);
    elements.turfKeyList.append(item);
  }
}

function saveTurfRecords() {
  localStorage.setItem(TURF_STORAGE_KEY, JSON.stringify(getTurfExportData()));
  scheduleCloudSave();
}

function applyStoredTurfRecords() {
  const stored = JSON.parse(localStorage.getItem(TURF_STORAGE_KEY) || 'null');

  if (Array.isArray(stored)) {
    mafiaTurfs = stored.map(normalizeTurfRecord);
  }
}

function saveTurfAlignment() {
  turfAlignment = normalizeTurfAlignment(turfAlignment);
  localStorage.setItem(TURF_ALIGNMENT_STORAGE_KEY, JSON.stringify(turfAlignment));
  renderTurfs();
  scheduleCloudSave();
}

function applyStoredTurfAlignment() {
  const stored = JSON.parse(localStorage.getItem(TURF_ALIGNMENT_STORAGE_KEY) || 'null');

  if (stored) {
    turfAlignment = normalizeTurfAlignment(stored);
  }
}

function saveBlacklistRegions() {
  blacklistRegions = normalizeBlacklistRegions(blacklistRegions);
  localStorage.setItem(BLACKLIST_REGIONS_STORAGE_KEY, JSON.stringify(blacklistRegions));
  renderTurfs();
  scheduleCloudSave();
}

function applyStoredBlacklistRegions() {
  const stored = JSON.parse(localStorage.getItem(BLACKLIST_REGIONS_STORAGE_KEY) || 'null');

  if (Array.isArray(stored)) {
    blacklistRegions = normalizeBlacklistRegions(stored);
  }
}

function turfLabel(turf) {
  return `Turf ${turf.number || turf.id}`;
}

function renderTurfOptions() {
  elements.turfDatalist.textContent = '';

  for (const turf of mafiaTurfs.filter(turf => !turf.removed)) {
    const option = document.createElement('option');
    option.value = `${turfLabel(turf)} - ${turf.owner} - ${turf.status}`;
    option.dataset.id = turf.id;
    elements.turfDatalist.append(option);
  }
}

function renderTurfOwnerOptions(selectedOwner = 'Unclaimed') {
  const currentValue = selectedOwner || 'Unclaimed';
  const owners = new Set(['Unclaimed']);

  for (const mafia of Array.isArray(directoryRecords.mafias) ? directoryRecords.mafias : []) {
    const name = String(mafia.name || '').trim();

    if (name) {
      owners.add(name);
    }
  }

  if (currentValue && currentValue !== 'Unclaimed') {
    owners.add(currentValue);
  }

  elements.turfOwnerEdit.textContent = '';

  for (const owner of owners) {
    const option = document.createElement('option');
    option.value = owner;
    option.textContent = owner;
    elements.turfOwnerEdit.append(option);
  }

  elements.turfOwnerEdit.value = owners.has(currentValue) ? currentValue : 'Unclaimed';
}

function parseHexColor(value) {
  const fallback = [122, 130, 138];
  const match = String(value || '').match(/^#([a-f0-9]{6})$/i);

  if (!match) {
    return fallback;
  }

  const hex = match[1];
  return [
    Number.parseInt(hex.slice(0, 2), 16),
    Number.parseInt(hex.slice(2, 4), 16),
    Number.parseInt(hex.slice(4, 6), 16)
  ];
}

function parseHslColor(value) {
  const match = String(value || '').match(/^hsl\((\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%\)$/i);

  if (!match) {
    return parseHexColor(value);
  }

  const hue = Number(match[1]) / 360;
  const saturation = Number(match[2]) / 100;
  const lightness = Number(match[3]) / 100;
  const helper = (p, q, t) => {
    let next = t;

    if (next < 0) {
      next += 1;
    }

    if (next > 1) {
      next -= 1;
    }

    if (next < 1 / 6) {
      return p + (q - p) * 6 * next;
    }

    if (next < 1 / 2) {
      return q;
    }

    if (next < 2 / 3) {
      return p + (q - p) * (2 / 3 - next) * 6;
    }

    return p;
  };

  if (saturation === 0) {
    const gray = Math.round(lightness * 255);
    return [gray, gray, gray];
  }

  const q = lightness < 0.5
    ? lightness * (1 + saturation)
    : lightness + saturation - lightness * saturation;
  const p = 2 * lightness - q;

  return [
    Math.round(helper(p, q, hue + 1 / 3) * 255),
    Math.round(helper(p, q, hue) * 255),
    Math.round(helper(p, q, hue - 1 / 3) * 255)
  ];
}

function turfSeedPoint(turf) {
  const [left, top, right, bottom] = turf.rect;

  return [
    Math.round(((left + right) / 2 / MAP_SIZE) * TURF_CANVAS_SIZE),
    Math.round(((top + bottom) / 2 / MAP_SIZE) * TURF_CANVAS_SIZE)
  ];
}

function turfLinePlacement(image) {
  const scale = Math.min(TURF_CANVAS_SIZE / image.width, TURF_CANVAS_SIZE / image.height) * turfAlignment.scale;
  const width = Math.round(image.width * scale);
  const height = Math.round(image.height * scale);

  return {
    x: Math.round((TURF_CANVAS_SIZE - width) / 2 + turfAlignment.offsetX),
    y: Math.round((TURF_CANVAS_SIZE - height) / 2 + turfAlignment.offsetY),
    width,
    height
  };
}

function isLinePixel(lineData, index) {
  return lineData[index * 4 + 3] > 20;
}

function buildOutsideMask(lineData) {
  const width = TURF_CANVAS_SIZE;
  const height = TURF_CANVAS_SIZE;
  const outside = new Uint8Array(width * height);
  const queue = [];
  const add = index => {
    if (!outside[index] && !isLinePixel(lineData, index)) {
      outside[index] = 1;
      queue.push(index);
    }
  };

  for (let x = 0; x < width; x++) {
    add(x);
    add((height - 1) * width + x);
  }

  for (let y = 0; y < height; y++) {
    add(y * width);
    add(y * width + width - 1);
  }

  for (let cursor = 0; cursor < queue.length; cursor++) {
    const index = queue[cursor];
    const x = index % width;
    const y = Math.floor(index / width);

    if (x > 0) {
      add(index - 1);
    }

    if (x < width - 1) {
      add(index + 1);
    }

    if (y > 0) {
      add(index - width);
    }

    if (y < height - 1) {
      add(index + width);
    }
  }

  return outside;
}

function drawTurfFallbackRegion(output, hitMap, turf, turfIndex) {
  const [left, top, right, bottom] = turf.rect.map(value => Math.round((value / MAP_SIZE) * TURF_CANVAS_SIZE));
  const [red, green, blue] = parseHslColor(turfColorFor(turf.owner));
  const alpha = turfFillAlpha(turf);

  for (let y = Math.max(0, top); y < Math.min(TURF_CANVAS_SIZE, bottom); y++) {
    for (let x = Math.max(0, left); x < Math.min(TURF_CANVAS_SIZE, right); x++) {
      const index = y * TURF_CANVAS_SIZE + x;
      const offset = (y * TURF_CANVAS_SIZE + x) * 4;
      output[offset] = red;
      output[offset + 1] = green;
      output[offset + 2] = blue;
      output[offset + 3] = alpha;
      hitMap[index] = turfIndex + 1;
    }
  }
}

function detectTurfRegions(lineData, outsideMask) {
  const width = TURF_CANVAS_SIZE;
  const height = TURF_CANVAS_SIZE;
  const visited = new Uint8Array(width * height);
  const componentMap = new Uint16Array(width * height);
  const regions = [];

  for (let start = 0; start < visited.length; start++) {
    if (visited[start] || outsideMask[start] || isLinePixel(lineData, start)) {
      continue;
    }

    const queue = [start];
    const pixels = [];
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    let sumX = 0;
    let sumY = 0;
    visited[start] = 1;

    for (let cursor = 0; cursor < queue.length; cursor++) {
      const index = queue[cursor];

      if (outsideMask[index] || isLinePixel(lineData, index)) {
        continue;
      }

      const x = index % width;
      const y = Math.floor(index / width);
      pixels.push(index);
      sumX += x;
      sumY += y;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);

      if (x > 0) {
        const next = index - 1;
        if (!visited[next]) {
          visited[next] = 1;
          queue.push(next);
        }
      }

      if (x < width - 1) {
        const next = index + 1;
        if (!visited[next]) {
          visited[next] = 1;
          queue.push(next);
        }
      }

      if (y > 0) {
        const next = index - width;
        if (!visited[next]) {
          visited[next] = 1;
          queue.push(next);
        }
      }

      if (y < height - 1) {
        const next = index + width;
        if (!visited[next]) {
          visited[next] = 1;
          queue.push(next);
        }
      }
    }

    if (pixels.length < 450) {
      continue;
    }

    const region = {
      id: regions.length + 1,
      pixels,
      minX,
      minY,
      maxX,
      maxY,
      centerX: sumX / pixels.length,
      centerY: sumY / pixels.length
    };

    for (const index of pixels) {
      componentMap[index] = region.id;
    }

    regions.push(region);
  }

  return { regions, componentMap };
}

function regionForTurf(turf, regions, componentMap, usedRegions) {
  const [seedX, seedY] = turfSeedPoint(turf);
  const seedIndex = seedY * TURF_CANVAS_SIZE + seedX;
  const seededRegionId = componentMap[seedIndex];

  if (seededRegionId && !usedRegions.has(seededRegionId)) {
    return regions.find(region => region.id === seededRegionId) || null;
  }

  let bestRegion = null;
  let bestDistance = Infinity;

  for (const region of regions) {
    if (usedRegions.has(region.id)) {
      continue;
    }

    const dx = region.centerX - seedX;
    const dy = region.centerY - seedY;
    const distance = dx * dx + dy * dy;

    if (distance < bestDistance) {
      bestDistance = distance;
      bestRegion = region;
    }
  }

  return bestRegion;
}

function drawTurfRegion(output, hitMap, turf, turfIndex, region) {
  const [red, green, blue] = parseHslColor(turfColorFor(turf.owner));
  const alpha = turfFillAlpha(turf);

  for (const index of region.pixels) {
    const offset = index * 4;
    output[offset] = red;
    output[offset + 1] = green;
    output[offset + 2] = blue;
    output[offset + 3] = alpha;
    hitMap[index] = turfIndex + 1;
  }
}

function drawTurfLineImage(context, image) {
  const placement = turfLinePlacement(image);
  context.save();
  context.globalAlpha = 0.95;
  context.shadowColor = '#000000';
  context.shadowBlur = 4;
  context.drawImage(image, placement.x, placement.y, placement.width, placement.height);
  context.restore();
}

function drawTurfBlacklistImage(context, image, placement) {
  if (!image) {
    return;
  }

  context.save();
  context.globalAlpha = 0.92;
  context.drawImage(image, placement.x, placement.y, placement.width, placement.height);
  context.restore();
}

function blacklistRegionDrawRect(region, image, placement) {
  const [sourceLeft, sourceTop, sourceRight, sourceBottom] = region.sourceRect;
  const sourceWidth = Math.max(1, sourceRight - sourceLeft);
  const sourceHeight = Math.max(1, sourceBottom - sourceTop);
  const baseLeft = placement.x + (sourceLeft / image.width) * placement.width;
  const baseTop = placement.y + (sourceTop / image.height) * placement.height;
  const baseWidth = (sourceWidth / image.width) * placement.width;
  const baseHeight = (sourceHeight / image.height) * placement.height;
  const scale = Number(region.scale) || 1;
  const width = baseWidth * scale;
  const height = baseHeight * scale;
  const left = baseLeft + Number(region.offsetX || 0) - (width - baseWidth) / 2;
  const top = baseTop + Number(region.offsetY || 0) - (height - baseHeight) / 2;

  return {
    sourceLeft,
    sourceTop,
    sourceWidth,
    sourceHeight,
    left,
    top,
    width,
    height
  };
}

function markBlacklistHitRegion(hitMap, regionIndex, drawRect) {
  const left = Math.max(0, Math.floor(drawRect.left));
  const top = Math.max(0, Math.floor(drawRect.top));
  const right = Math.min(TURF_CANVAS_SIZE, Math.ceil(drawRect.left + drawRect.width));
  const bottom = Math.min(TURF_CANVAS_SIZE, Math.ceil(drawRect.top + drawRect.height));

  for (let y = top; y < bottom; y++) {
    for (let x = left; x < right; x++) {
      hitMap[y * TURF_CANVAS_SIZE + x] = regionIndex + 1;
    }
  }
}

function drawBlacklistRegions(context, image, placement) {
  blacklistHitMap = new Uint16Array(TURF_CANVAS_SIZE * TURF_CANVAS_SIZE);
  blacklistHitIds = [];

  if (!image) {
    return;
  }

  context.save();
  context.globalAlpha = 0.92;

  const activeRegions = normalizeBlacklistRegions(blacklistRegions);
  activeRegions.forEach((region, index) => {
    const rect = blacklistRegionDrawRect(region, image, placement);
    context.drawImage(
      image,
      rect.sourceLeft,
      rect.sourceTop,
      rect.sourceWidth,
      rect.sourceHeight,
      rect.left,
      rect.top,
      rect.width,
      rect.height
    );
    blacklistHitIds.push(region.id);
    markBlacklistHitRegion(blacklistHitMap, index, rect);
  });

  context.restore();

  if (editMode && blacklistRegionMode && selectedBlacklistRegionId) {
    const selected = activeRegions.find(region => region.id === selectedBlacklistRegionId);

    if (selected) {
      const rect = blacklistRegionDrawRect(selected, image, placement);
      context.save();
      context.setLineDash([8, 5]);
      context.lineWidth = 3;
      context.strokeStyle = '#ffffff';
      context.strokeRect(rect.left, rect.top, rect.width, rect.height);
      context.restore();
    }
  }
}

function drawTurfNumbers(context, assignments) {
  context.save();
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = 'bold 24px Arial, Helvetica, sans-serif';
  context.lineWidth = 5;
  context.strokeStyle = '#000000';
  context.fillStyle = '#ffffff';

  for (const { turf, region } of assignments) {
    if (!turf.number) {
      continue;
    }

    const labelX = region.centerX + (String(turf.number).trim() === '5' ? -18 : 0);
    context.strokeText(turf.number, labelX, region.centerY);
    context.fillText(turf.number, labelX, region.centerY);
  }

  context.restore();
}

function renderTurfShapeCanvas() {
  const canvas = elements.turfShapeCanvas;

  if (!canvas) {
    return;
  }

  const context = canvas.getContext('2d');

  if (!context) {
    return;
  }

  canvas.width = TURF_CANVAS_SIZE;
  canvas.height = TURF_CANVAS_SIZE;
  const image = new Image();
  image.onload = () => {
    const draw = blacklistImage => {
    const lineCanvas = document.createElement('canvas');
    lineCanvas.width = TURF_CANVAS_SIZE;
    lineCanvas.height = TURF_CANVAS_SIZE;
    const lineContext = lineCanvas.getContext('2d', { willReadFrequently: true });

    if (!lineContext) {
      return;
    }

    const placement = turfLinePlacement(image);
    lineContext.drawImage(image, placement.x, placement.y, placement.width, placement.height);
    const lineImage = lineContext.getImageData(0, 0, TURF_CANVAS_SIZE, TURF_CANVAS_SIZE);
    const fillImage = context.createImageData(TURF_CANVAS_SIZE, TURF_CANVAS_SIZE);
    const activeTurfs = mafiaTurfs.filter(entry => !entry.removed);
    const hitMap = new Uint16Array(TURF_CANVAS_SIZE * TURF_CANVAS_SIZE);
    const outsideMask = buildOutsideMask(lineImage.data);
    const { regions, componentMap } = detectTurfRegions(lineImage.data, outsideMask);
    const usedRegions = new Set();
    const assignments = [];

    turfHitIds = activeTurfs.map(turf => turf.id);

    activeTurfs.forEach((turf, index) => {
      const region = regionForTurf(turf, regions, componentMap, usedRegions);

      if (region) {
        usedRegions.add(region.id);
        assignments.push({ turf, region });
        drawTurfRegion(fillImage.data, hitMap, turf, index, region);
      } else {
        drawTurfFallbackRegion(fillImage.data, hitMap, turf, index);
      }
    });

    context.clearRect(0, 0, TURF_CANVAS_SIZE, TURF_CANVAS_SIZE);
    context.putImageData(fillImage, 0, 0);
    drawBlacklistRegions(context, blacklistImage, placement);
    drawTurfLineImage(context, image);
    drawTurfNumbers(context, assignments);
    turfHitMap = hitMap;
    turfOutsideMask = outsideMask;
    };
    if (blacklistImageCache?.complete) {
      draw(blacklistImageCache);
      return;
    }

    const blacklistImage = new Image();
    blacklistImage.onload = () => {
      blacklistImageCache = blacklistImage;
      draw(blacklistImage);
    };
    blacklistImage.onerror = () => draw(null);
    blacklistImage.src = BLACKLIST_IMAGE_SRC;
  };
  image.onerror = () => {
    const activeTurfs = mafiaTurfs.filter(entry => !entry.removed);
    const fillImage = context.createImageData(TURF_CANVAS_SIZE, TURF_CANVAS_SIZE);
    const hitMap = new Uint16Array(TURF_CANVAS_SIZE * TURF_CANVAS_SIZE);
    turfHitIds = activeTurfs.map(turf => turf.id);

    activeTurfs.forEach((turf, index) => drawTurfFallbackRegion(fillImage.data, hitMap, turf, index));
    context.clearRect(0, 0, TURF_CANVAS_SIZE, TURF_CANVAS_SIZE);
    context.putImageData(fillImage, 0, 0);
    turfHitMap = hitMap;
    turfOutsideMask = null;
  };
  image.src = `/assets/mafia-turf-lines-v3.png?v=10`;
}

function selectTurfFromCanvas(event) {
  if (editMode && turfAlignmentMode) {
    return;
  }

  if (editMode && blacklistRegionMode && selectBlacklistRegionFromCanvas(event)) {
    return;
  }

  if (!turfHitMap?.length) {
    return;
  }

  const rect = elements.turfShapeCanvas.getBoundingClientRect();
  const x = Math.floor(((event.clientX - rect.left) / rect.width) * TURF_CANVAS_SIZE);
  const y = Math.floor(((event.clientY - rect.top) / rect.height) * TURF_CANVAS_SIZE);

  if (x < 0 || y < 0 || x >= TURF_CANVAS_SIZE || y >= TURF_CANVAS_SIZE) {
    return;
  }

  if (turfOutsideMask?.[y * TURF_CANVAS_SIZE + x]) {
    return;
  }

  const turfId = turfHitIds[turfHitMap[y * TURF_CANVAS_SIZE + x] - 1];

  if (turfId) {
    selectTurf(turfId);
  }
}

function setTurfAlignmentMode(enabled) {
  turfAlignmentMode = Boolean(enabled);
  elements.alignTurfs.setAttribute('aria-pressed', String(turfAlignmentMode));
  elements.turfShapeCanvas.classList.toggle('aligning', turfAlignmentMode && editMode);

  if (turfAlignmentMode) {
    setBlacklistRegionMode(false);
  }
}

function setBlacklistRegionMode(enabled) {
  blacklistRegionMode = Boolean(enabled);
  elements.editBlacklistRegions.setAttribute('aria-pressed', String(blacklistRegionMode));
  elements.turfShapeCanvas.classList.toggle('editing-blacklist', blacklistRegionMode && editMode);

  if (blacklistRegionMode) {
    setTurfAlignmentMode(false);
  } else {
    selectedBlacklistRegionId = null;
  }

  renderTurfs();
}

function startTurfAlignmentDrag(event) {
  if (!editMode || !turfAlignmentMode) {
    return;
  }

  event.preventDefault();
  const scale = elements.turfShapeCanvas.getBoundingClientRect().width / TURF_CANVAS_SIZE;
  turfAlignmentDrag = {
    startX: event.clientX,
    startY: event.clientY,
    offsetX: turfAlignment.offsetX,
    offsetY: turfAlignment.offsetY,
    scale
  };
  elements.turfShapeCanvas.setPointerCapture(event.pointerId);
}

function canvasPointFromEvent(event) {
  const rect = elements.turfShapeCanvas.getBoundingClientRect();

  return {
    x: Math.floor(((event.clientX - rect.left) / rect.width) * TURF_CANVAS_SIZE),
    y: Math.floor(((event.clientY - rect.top) / rect.height) * TURF_CANVAS_SIZE)
  };
}

function blacklistRegionAtPoint(event) {
  if (!blacklistHitMap?.length) {
    return null;
  }

  const { x, y } = canvasPointFromEvent(event);

  if (x < 0 || y < 0 || x >= TURF_CANVAS_SIZE || y >= TURF_CANVAS_SIZE) {
    return null;
  }

  const regionId = blacklistHitIds[blacklistHitMap[y * TURF_CANVAS_SIZE + x] - 1];

  return regionId || null;
}

function selectBlacklistRegionFromCanvas(event) {
  const regionId = blacklistRegionAtPoint(event);

  if (!regionId) {
    return false;
  }

  selectedBlacklistRegionId = regionId;
  renderTurfs();
  return true;
}

function startBlacklistRegionDrag(event) {
  if (!editMode || !blacklistRegionMode) {
    return;
  }

  const regionId = blacklistRegionAtPoint(event);

  if (!regionId) {
    return;
  }

  const region = blacklistRegions.find(entry => entry.id === regionId);

  if (!region) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  selectedBlacklistRegionId = regionId;
  const scale = elements.turfShapeCanvas.getBoundingClientRect().width / TURF_CANVAS_SIZE;
  blacklistRegionDrag = {
    id: regionId,
    startX: event.clientX,
    startY: event.clientY,
    offsetX: region.offsetX,
    offsetY: region.offsetY,
    scale
  };
  elements.turfShapeCanvas.setPointerCapture(event.pointerId);
  renderTurfs();
}

function moveBlacklistRegionDrag(event) {
  if (!blacklistRegionDrag) {
    return;
  }

  const region = blacklistRegions.find(entry => entry.id === blacklistRegionDrag.id);

  if (!region) {
    return;
  }

  region.offsetX = blacklistRegionDrag.offsetX + (event.clientX - blacklistRegionDrag.startX) / blacklistRegionDrag.scale;
  region.offsetY = blacklistRegionDrag.offsetY + (event.clientY - blacklistRegionDrag.startY) / blacklistRegionDrag.scale;
  blacklistRegions = normalizeBlacklistRegions(blacklistRegions);
  renderTurfs();
}

function stopBlacklistRegionDrag() {
  if (!blacklistRegionDrag) {
    return;
  }

  blacklistRegionDrag = null;
  saveBlacklistRegions();
}

function moveTurfAlignmentDrag(event) {
  if (!turfAlignmentDrag) {
    return;
  }

  turfAlignment.offsetX = turfAlignmentDrag.offsetX + (event.clientX - turfAlignmentDrag.startX) / turfAlignmentDrag.scale;
  turfAlignment.offsetY = turfAlignmentDrag.offsetY + (event.clientY - turfAlignmentDrag.startY) / turfAlignmentDrag.scale;
  turfAlignment = normalizeTurfAlignment(turfAlignment);
  renderTurfs();
}

function stopTurfAlignmentDrag() {
  if (!turfAlignmentDrag) {
    return;
  }

  turfAlignmentDrag = null;
  saveTurfAlignment();
}

function scaleSelectedBlacklistRegion(delta) {
  if (!editMode) {
    openPasswordDialog();
    return;
  }

  if (!selectedBlacklistRegionId) {
    setPublishStatus('Select a red region');
    return;
  }

  const region = blacklistRegions.find(entry => entry.id === selectedBlacklistRegionId);

  if (!region) {
    return;
  }

  region.scale = Number(region.scale || 1) + delta;
  saveBlacklistRegions();
}

function resetBlacklistRegions() {
  if (!editMode) {
    openPasswordDialog();
    return;
  }

  blacklistRegions = getDefaultBlacklistRegions();
  selectedBlacklistRegionId = null;
  saveBlacklistRegions();
}

function scaleTurfAlignment(delta) {
  if (!editMode) {
    openPasswordDialog();
    return;
  }

  turfAlignment.scale += delta;
  saveTurfAlignment();
}

function resetTurfAlignment() {
  if (!editMode) {
    openPasswordDialog();
    return;
  }

  turfAlignment = { scale: 0.94, offsetX: 0, offsetY: 0 };
  saveTurfAlignment();
}

function selectTurf(id) {
  const turf = mafiaTurfs.find(entry => entry.id === id);

  if (!turf) {
    return;
  }

  elements.turfName.textContent = turfLabel(turf);
  elements.turfNumber.textContent = turf.number || '-';
  elements.turfNumberEdit.value = turf.number || '';
  elements.turfOwner.textContent = turf.owner || 'Unclaimed';
  renderTurfOwnerOptions(turf.owner || 'Unclaimed');
  elements.turfStatus.textContent = turf.status || 'Unclaimed';
  elements.turfStatusEdit.value = turf.status || 'Unclaimed';
  elements.turfSearch.value = `${turfLabel(turf)} - ${turf.owner} - ${turf.status}`;
  setTurfEditorsDisabled(!editMode);

  if (activeTurf) {
    activeTurf.classList.remove('active');
  }

  activeTurf = document.querySelector(`.turf-marker[data-id="${turf.id}"]`);
  selectedTurfId = turf.id;

  if (activeTurf) {
    activeTurf.classList.add('active');
    activeTurf.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
  }
}

function setTurfEditorsDisabled(disabled) {
  elements.turfNumberEdit.disabled = disabled;
  elements.turfOwnerEdit.disabled = disabled;
  elements.turfStatusEdit.disabled = disabled;
}

function updateSelectedTurfField(field, value) {
  if (!editMode || !selectedTurfId) {
    return;
  }

  const turf = mafiaTurfs.find(entry => entry.id === selectedTurfId);

  if (!turf) {
    return;
  }

  turf[field] = String(value || '').trim() || (field === 'owner' ? 'Unclaimed' : '');

  if (field === 'owner') {
    if (isUnclaimedTurf(turf)) {
      turf.status = 'Unclaimed';
    } else if (String(turf.status || '').trim().toLowerCase() === 'unclaimed') {
      turf.status = 'Claimed';
    }
  }

  saveTurfRecords();
  renderTurfOptions();
  renderTurfs();
  selectTurf(turf.id);
}

function createNewTurf() {
  if (!editMode) {
    openPasswordDialog();
    return;
  }

  const number = window.prompt('Turf number:');

  if (!number?.trim()) {
    return;
  }

  const scale = getTurfScale();
  const centerX = clamp((elements.turfMapWrap.scrollLeft + elements.turfMapWrap.clientWidth / 2) / scale, 0, MAP_SIZE);
  const centerY = clamp((elements.turfMapWrap.scrollTop + elements.turfMapWrap.clientHeight / 2) / scale, 0, MAP_SIZE);
  const width = 180;
  const height = 130;
  const left = clamp(centerX - width / 2, 0, MAP_SIZE - width);
  const top = clamp(centerY - height / 2, 0, MAP_SIZE - height);
  const turf = normalizeTurfRecord({
    id: `turf-${Date.now()}`,
    number: number.trim(),
    owner: 'Unclaimed',
    status: 'Unclaimed',
    rect: [left, top, left + width, top + height]
  });

  mafiaTurfs.push(turf);
  saveTurfRecords();
  renderTurfOptions();
  renderTurfs();
  selectTurf(turf.id);
}

function addRegulationRecord(key) {
  if (!editMode) {
    openPasswordDialog();
    return;
  }

  const config = regulationConfig(key);
  config.records.push({
    id: `${key}-${Date.now()}`,
    name: `New ${config.title}`,
    regulations: '',
    pdfName: '',
    pdfData: '',
    pdfPath: ''
  });
  saveDirectoryRecords();
  renderDirectoryLists();
}

function updateRegulationRecord(key, id, field, value) {
  const config = regulationConfig(key);
  const record = config.records.find(item => item.id === id);

  if (!record) {
    return;
  }

  record[field] = value;
  saveDirectoryRecords();
  renderDirectoryLists();
}

function removeRegulationRecord(key, id) {
  const config = regulationConfig(key);
  const index = config.records.findIndex(item => item.id === id);

  if (index === -1) {
    return;
  }

  config.records.splice(index, 1);
  saveDirectoryRecords();
  renderDirectoryLists();
}

function updateRegulationPdf(key, id, file) {
  const config = regulationConfig(key);
  const record = config.records.find(item => item.id === id);

  if (!record || !file) {
    return;
  }

  if (file.type !== 'application/pdf') {
    window.alert('Please upload a PDF file.');
    return;
  }

  const reader = new FileReader();
  reader.addEventListener('load', () => {
    record.pdfName = file.name;
    record.pdfData = String(reader.result || '');
    record.pdfPath = '';
    saveDirectoryRecords();
    renderDirectoryLists();
  });
  reader.readAsDataURL(file);
}

function removeRegulationPdf(key, id) {
  const config = regulationConfig(key);
  const record = config.records.find(item => item.id === id);

  if (!record) {
    return;
  }

  record.pdfName = '';
  record.pdfData = '';
  record.pdfPath = '';
  saveDirectoryRecords();
  renderDirectoryLists();
}

function createRegulationCard(key, record) {
  const card = document.createElement('article');
  card.className = `regulation-card${record.regulations ? '' : ' no-regulations'}`;
  const pdfHref = record.pdfData || record.pdfPath;
  const pdfLink = pdfHref
    ? `<a href="${escapeHtml(pdfHref)}" target="_blank" rel="noopener noreferrer">${escapeHtml(record.pdfName || 'Open PDF')}</a>`
    : '-';
  card.innerHTML = `
    <h2>${escapeHtml(record.name || 'Unnamed')}</h2>
    <div class="org-field">
      <label>Name</label>
      <span class="org-display">${escapeHtml(record.name || '-')}</span>
      <input data-field="name" value="${escapeHtml(record.name || '')}">
    </div>
    <div class="org-field regulation-field">
      <label>Regulations</label>
      <p class="regulation-text">${linkifyText(record.regulations)}</p>
      <textarea data-field="regulations">${escapeHtml(record.regulations || '')}</textarea>
    </div>
    <div class="org-field">
      <label>PDF</label>
      <span class="org-display regulation-pdf-link">${pdfLink}</span>
      <input data-pdf-upload type="file" accept="application/pdf">
    </div>
    <div class="org-card-actions">
      <button type="button" class="edit-toggle" data-remove-pdf>Remove PDF</button>
      <button type="button" class="edit-toggle" data-remove-regulation>Remove</button>
    </div>
  `;

  for (const field of card.querySelectorAll('[data-field]')) {
    field.addEventListener('change', () => updateRegulationRecord(key, record.id, field.dataset.field, field.value));
  }

  card.querySelector('[data-pdf-upload]').addEventListener('change', event => {
    updateRegulationPdf(key, record.id, event.currentTarget.files?.[0]);
  });
  card.querySelector('[data-remove-pdf]').addEventListener('click', () => removeRegulationPdf(key, record.id));
  card.querySelector('[data-remove-regulation]').addEventListener('click', () => removeRegulationRecord(key, record.id));

  return card;
}

function renderRegulationList(key) {
  const config = regulationConfig(key);
  config.list.textContent = '';

  if (!config.records.length) {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    emptyState.innerHTML = `<h2>No ${config.title}s listed yet</h2><p>Unlock edit mode to add one.</p>`;
    config.list.append(emptyState);
    return;
  }

  for (const record of config.records) {
    config.list.append(createRegulationCard(key, record));
  }
}

function scheduleCloudSave() {
  if (!editMode || !editSessionPassword) {
    return;
  }

  if (currentDataSignature() === lastSavedDataSignature) {
    window.clearTimeout(cloudSaveTimeout);
    setPublishStatus('No changes');
    return;
  }

  window.clearTimeout(cloudSaveTimeout);
  setPublishStatus('Saving soon');
  cloudSaveTimeout = window.setTimeout(saveBoxesToCloud, 1800);
}

async function saveBoxesToCloud() {
  if (!editSessionPassword) {
    return;
  }

  if (cloudSaveInFlight) {
    cloudSaveQueued = true;
    return;
  }

  const nextSignature = currentDataSignature();

  if (nextSignature === lastSavedDataSignature) {
    cloudSaveQueued = false;
    setPublishStatus('No changes');
    return;
  }

  cloudSaveInFlight = true;
  cloudSaveQueued = false;
  setPublishStatus('Publishing');

  try {
    lastLocalSaveSignature = nextSignature;
    const response = await fetch(getSaveBoxesUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...buildExportData(),
        password: editSessionPassword,
        clientId
      })
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Live save failed.');
    }

    remoteDataSignature = lastLocalSaveSignature;
    lastSavedDataSignature = lastLocalSaveSignature;
    remoteDataVersion = result.version || result.updatedAt || remoteDataVersion;
    setPublishStatus(result.live ? 'Live saved' : 'Published');
  } catch (error) {
    setPublishStatus(error.message.includes('GITHUB_TOKEN') ? 'Missing token' : 'Save failed');
    console.error(error);
  } finally {
    cloudSaveInFlight = false;

    if (cloudSaveQueued) {
      scheduleCloudSave();
    }
  }
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

function getTurfScale() {
  return elements.turfMarkers.getBoundingClientRect().width / MAP_SIZE;
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
  const normalized = String(value || '').trim().toLowerCase();

  if (normalized === 'office building') {
    return 'office building';
  }

  if (normalized === 'house') {
    return 'house';
  }

  if (normalized === 'government') {
    return 'government';
  }

  if (normalized === 'mafia') {
    return 'mafia';
  }

  return 'building';
}

function normalizeSaleStatus(value) {
  const normalized = String(value || '').trim().toLowerCase().replace(/[-_]+/g, ' ');
  return normalized === 'off sale' ? 'Off Sale' : 'On Sale';
}

function normalizePropertyRecord(property) {
  return {
    ...property,
    id: String(property.id),
    name: String(property.name || property.number || property.id),
    number: String(property.number || 'N/A'),
    buildingType: normalizeBuildingType(property.buildingType),
    owner: String(property.owner || 'N/A'),
    saleStatus: normalizeSaleStatus(property.saleStatus),
    price: String(property.price || 'Not for sale'),
    tax: String(property.tax || 'Not for sale'),
    custom: Boolean(property.custom)
  };
}

function inferBuildingType(property) {
  const explicitType = normalizeBuildingType(property.buildingType);

  if (['government', 'house', 'mafia', 'office building'].includes(explicitType)) {
    return explicitType;
  }

  if (property.name.toLowerCase().includes('office building')) {
    return 'office building';
  }

  return explicitType;
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

  if (normalized === 'mafia') {
    return 'Mafia';
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

  if (type === 'mafia') {
    return '#d92323';
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

  if (isOwned) {
    return '#24d16f';
  }

  if (isUnavailable) {
    return '#ff3030';
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
    ['saleStatus', elements.propertySaleStatusEdit],
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
          saleStatus: normalizeSaleStatus(property.saleStatus),
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
  scheduleCloudSave();
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
  scheduleCloudSave();
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
        saleStatus: normalizeSaleStatus(property.saleStatus),
        price: property.price,
        tax: property.tax
      };
    }
  }

  localStorage.setItem(PROPERTY_STORAGE_KEY, JSON.stringify(editedProperties));
  saveCustomProperties();
  scheduleCloudSave();
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
      property.saleStatus = normalizeSaleStatus(edit.saleStatus || property.saleStatus);
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
    undoLastTurfEdit();
    return;
  }

  restoreMarkerSnapshot(entry.id, entry.before);
}

function turfSnapshot(turf) {
  return {
    rect: [...turf.rect],
    rotation: Number(turf.rotation || 0),
    removed: Boolean(turf.removed)
  };
}

function restoreTurfSnapshot(id, snapshot) {
  const turf = mafiaTurfs.find(entry => entry.id === id);

  if (!turf) {
    return;
  }

  turf.rect = [...snapshot.rect];
  turf.rotation = snapshot.rotation || 0;
  turf.removed = Boolean(snapshot.removed);
  saveTurfRecords();
  renderTurfs();
  selectTurf(id);
}

function undoLastTurfEdit() {
  const entry = turfUndoStack.pop();

  if (!entry) {
    return;
  }

  restoreTurfSnapshot(entry.id, entry.before);
}

function applyMarkerElementStyle(markerElement, rect, rotation = 0) {
  const [left, top, right, bottom] = rect;
  markerElement.style.left = `${(left / MAP_SIZE) * 100}%`;
  markerElement.style.top = `${(top / MAP_SIZE) * 100}%`;
  markerElement.style.width = `${((right - left) / MAP_SIZE) * 100}%`;
  markerElement.style.height = `${((bottom - top) / MAP_SIZE) * 100}%`;
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

function renderTurfs() {
  elements.turfMarkers.textContent = '';
  renderTurfShapeCanvas();

  for (const turf of mafiaTurfs) {
    if (turf.removed) {
      continue;
    }

    const [left, top, right, bottom] = turf.rect;
    const marker = document.createElement('button');
    marker.type = 'button';
    marker.className = 'turf-marker';
    marker.dataset.id = turf.id;
    marker.style.setProperty('--marker-color', turfColorFor(turf.owner));
    marker.style.setProperty('--turf-color', turfColorFor(turf.owner));
    applyMarkerElementStyle(marker, [left, top, right, bottom], Number(turf.rotation || 0));
    marker.setAttribute('aria-label', `${turfLabel(turf)} ${turf.owner} ${turf.status}`);
    marker.addEventListener('pointerdown', event => startTurfEdit(event, turf));
    marker.addEventListener('click', event => {
      if (editMode) {
        event.preventDefault();
      }

      selectTurf(turf.id);
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
    elements.turfMarkers.append(marker);
  }
}

function updateTurfRect(id, rect) {
  const turf = mafiaTurfs.find(entry => entry.id === id);

  if (!turf) {
    return;
  }

  turf.rect = rect.map(value => Math.round(value));

  const turfElement = document.querySelector(`.turf-marker[data-id="${id}"]`);
  if (turfElement) {
    applyMarkerElementStyle(turfElement, turf.rect, Number(turf.rotation || 0));
    turfElement.classList.add('active');
    activeTurf = turfElement;
  }
}

function updateTurfRotation(id, rotation) {
  const turf = mafiaTurfs.find(entry => entry.id === id);

  if (!turf) {
    return;
  }

  turf.rotation = normalizeDegrees(rotation);

  const turfElement = document.querySelector(`.turf-marker[data-id="${id}"]`);
  if (turfElement) {
    turfElement.style.transform = `rotate(${turf.rotation}deg)`;
    turfElement.classList.add('active');
    activeTurf = turfElement;
  }
}

function startTurfEdit(event, turf) {
  if (!editMode) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  const handle = event.target.dataset.handle || 'move';
  const rect = turf.rect;
  const scale = getTurfScale();
  const [left, top, right, bottom] = rect;
  const centerX = elements.turfMarkers.getBoundingClientRect().left + ((left + right) / 2) * scale;
  const centerY = elements.turfMarkers.getBoundingClientRect().top + ((top + bottom) / 2) * scale;
  selectTurf(turf.id);
  turfDragState = {
    handle,
    id: turf.id,
    rect: [...rect],
    before: turfSnapshot(turf),
    centerX,
    centerY,
    startAngle: Math.atan2(event.clientY - centerY, event.clientX - centerX) * 180 / Math.PI,
    startRotation: Number(turf.rotation || 0),
    moved: false,
    startX: event.clientX,
    startY: event.clientY,
    scale
  };

  event.currentTarget.setPointerCapture(event.pointerId);
}

function moveTurfEdit(event) {
  if (!turfDragState) {
    return;
  }

  const dx = (event.clientX - turfDragState.startX) / turfDragState.scale;
  const dy = (event.clientY - turfDragState.startY) / turfDragState.scale;

  if (!turfDragState.moved && (Math.abs(dx) >= 1 || Math.abs(dy) >= 1)) {
    turfUndoStack.push({
      id: turfDragState.id,
      before: turfDragState.before
    });

    if (turfUndoStack.length > 100) {
      turfUndoStack.shift();
    }

    turfDragState.moved = true;
  }

  let [left, top, right, bottom] = turfDragState.rect;

  if (turfDragState.handle === 'rotate') {
    const angle = Math.atan2(event.clientY - turfDragState.centerY, event.clientX - turfDragState.centerX) * 180 / Math.PI;
    updateTurfRotation(turfDragState.id, turfDragState.startRotation + angle - turfDragState.startAngle);
    return;
  }

  if (turfDragState.handle === 'move') {
    left += dx;
    right += dx;
    top += dy;
    bottom += dy;
  } else {
    if (turfDragState.handle.includes('w')) {
      left += dx;
    }
    if (turfDragState.handle.includes('e')) {
      right += dx;
    }
    if (turfDragState.handle.includes('n')) {
      top += dy;
    }
    if (turfDragState.handle.includes('s')) {
      bottom += dy;
    }
  }

  if (right - left < MIN_MARKER_SIZE) {
    if (turfDragState.handle.includes('w')) {
      left = right - MIN_MARKER_SIZE;
    } else {
      right = left + MIN_MARKER_SIZE;
    }
  }

  if (bottom - top < MIN_MARKER_SIZE) {
    if (turfDragState.handle.includes('n')) {
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

  updateTurfRect(turfDragState.id, [left, top, right, bottom]);
}

function stopTurfEdit() {
  if (turfDragState?.moved) {
    saveTurfRecords();
  }

  turfDragState = null;
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

  if (keepCenter) {
    const nextScale = getMarkerScale();
    elements.mapWrap.scrollLeft = mapX * nextScale - elements.mapWrap.clientWidth / 2;
    elements.mapWrap.scrollTop = mapY * nextScale - elements.mapWrap.clientHeight / 2;
  }
}

function setTurfZoom(nextZoom, keepCenter = true) {
  const previousScale = getTurfScale();
  const centerX = elements.turfMapWrap.scrollLeft + elements.turfMapWrap.clientWidth / 2;
  const centerY = elements.turfMapWrap.scrollTop + elements.turfMapWrap.clientHeight / 2;
  const mapX = centerX / previousScale;
  const mapY = centerY / previousScale;

  turfZoom = Math.min(6, Math.max(0.45, nextZoom));
  const displaySize = Math.round(BASE_DISPLAY_SIZE * turfZoom);
  elements.turfMapSurface.style.setProperty('--map-width', `${displaySize}px`);
  elements.turfZoomRange.value = String(turfZoom);
  elements.turfZoomValue.textContent = `${Math.round(turfZoom * 100)}%`;

  if (keepCenter) {
    const nextScale = getTurfScale();
    elements.turfMapWrap.scrollLeft = mapX * nextScale - elements.turfMapWrap.clientWidth / 2;
    elements.turfMapWrap.scrollTop = mapY * nextScale - elements.turfMapWrap.clientHeight / 2;
  }
}

function setEditMode(enabled) {
  editMode = enabled;
  elements.editModeLock.setAttribute('aria-pressed', String(editMode));
  elements.editModeLock.setAttribute('aria-label', editMode ? 'Lock edit mode' : 'Unlock edit mode');
  elements.markers.classList.toggle('editing', editMode);
  elements.turfMarkers.classList.toggle('editing', editMode);
  for (const panel of document.querySelectorAll('.status-panel')) {
    panel.classList.toggle('editing', editMode);
  }
  document.body.classList.toggle('editing', editMode);
  elements.addBox.disabled = !editMode;
  elements.exportBoxes.disabled = !editMode;
  elements.undoEdit.disabled = !editMode;
  elements.addTurf.disabled = !editMode;
  elements.undoTurfEdit.disabled = !editMode;
  elements.alignTurfs.disabled = !editMode;
  elements.turfScaleDown.disabled = !editMode;
  elements.turfScaleUp.disabled = !editMode;
  elements.resetTurfAlignment.disabled = !editMode;
  elements.editBlacklistRegions.disabled = !editMode;
  elements.blacklistScaleDown.disabled = !editMode;
  elements.blacklistScaleUp.disabled = !editMode;
  elements.resetBlacklistRegions.disabled = !editMode;
  if (!editMode) {
    setTurfAlignmentMode(false);
    setBlacklistRegionMode(false);
  }
  for (const button of elements.directoryAddButtons) {
    button.disabled = !editMode;
  }
  for (const button of elements.regulationAddButtons) {
    button.disabled = !editMode;
  }
  setPublishStatus(editMode ? 'Live save ready' : 'Live save locked');
  setPropertyEditorsDisabled(!editMode || !selectedMarkerId);
  setTurfEditorsDisabled(!editMode || !selectedTurfId);
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
  property.saleStatus = normalizeSaleStatus(property.saleStatus);
  elements.propertySaleStatus.textContent = property.saleStatus;
  elements.propertySaleStatusEdit.value = property.saleStatus;
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
  if (field === 'saleStatus') {
    property.saleStatus = normalizeSaleStatus(nextValue);
  }
  property.buildingType = inferBuildingType(property);
  property.localEdited = true;
  elements.propertyName.textContent = labelFor(property);
  elements.buildingType.textContent = formatBuildingType(property.buildingType);
  elements.buildingTypeEdit.value = normalizeBuildingType(property.buildingType);
  elements.propertyNumber.textContent = property.number;
  elements.propertyOwner.textContent = property.owner;
  property.saleStatus = normalizeSaleStatus(property.saleStatus);
  elements.propertySaleStatus.textContent = property.saleStatus;
  elements.propertySaleStatusEdit.value = property.saleStatus;
  elements.propertyPrice.textContent = property.price;
  elements.propertyTax.textContent = property.tax;
  elements.search.value = labelFor(property);
  savePropertyEdits();
  renderOptions();
  renderMarkers();

  if (activeMarker) {
    activeMarker = document.querySelector(`.marker[data-id="${property.id}"]`);
  }

  if (activeMarker) {
    activeMarker.classList.add('active');
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
    saleStatus: 'On Sale',
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
  const exportData = buildExportData();
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
    applyMarkerElementStyle(marker, [left, top, right, bottom], getMarkerRotation(region));
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
    removeSelectedTurf();
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

function removeSelectedTurf() {
  if (!editMode || !selectedTurfId) {
    return;
  }

  const turf = mafiaTurfs.find(entry => entry.id === selectedTurfId);

  if (!turf || turf.removed) {
    return;
  }

  turfUndoStack.push({
    id: turf.id,
    before: turfSnapshot(turf)
  });
  turf.removed = true;
  saveTurfRecords();
  selectedTurfId = null;
  activeTurf = null;
  renderTurfs();
  renderTurfOptions();
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
    if (selectedTurfId && document.querySelector('#mafiaTurfMapView').classList.contains('active')) {
      removeSelectedTurf();
      return;
    }

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

  let loadedLiveData = false;

  try {
    const liveData = await fetchJson(getFullLiveDataUrl());

    if (Array.isArray(liveData.properties) && Array.isArray(liveData.markers)) {
      applyLiveDataset(liveData, 'Live loaded');
      loadedLiveData = true;
    }
  } catch (error) {
    console.error(error);
  }

  if (!loadedLiveData) {
    const [propertiesResponse, markersResponse, turfResponse, blacklistRegionsResponse] = await Promise.all([
      fetch('/properties.json'),
      fetch('/property-markers.json'),
      fetch('/mafia-turfs.json'),
      fetch('/blacklist-regions.json').catch(() => null)
    ]);
    properties = (await propertiesResponse.json()).map(normalizePropertyRecord);
    propertyMarkers = await markersResponse.json();
    mafiaTurfs = await turfResponse.json();
    blacklistRegions = blacklistRegionsResponse?.ok
      ? normalizeBlacklistRegions(await blacklistRegionsResponse.json())
      : getDefaultBlacklistRegions();
    try {
      const turfAlignmentResponse = await fetch('/turf-alignment.json');
      turfAlignment = normalizeTurfAlignment(await turfAlignmentResponse.json());
    } catch {
      turfAlignment = normalizeTurfAlignment(turfAlignment);
    }
    try {
      const orgsResponse = await fetch('/orgs.json');
      directoryRecords = await orgsResponse.json();
    } catch {
      directoryRecords = {
        businesses: [],
        mafias: [],
        generalRegulations: [],
        billingRegulations: [],
        businessRegulations: [],
        mafiaRegulations: []
      };
    }
    applyStoredDirectoryRecords();
    applyStoredTurfRecords();
    applyStoredTurfAlignment();
    applyStoredBlacklistRegions();
    applyStoredCustomProperties();
    applyStoredPropertyEdits();
    applyStoredMarkerEdits();
    propertiesById = new Map(properties.map(property => [property.id, property]));
  }

  renderOptions();
  renderMarkers();
  renderTurfOptions();
  renderTurfs();
  renderDirectoryLists();
  elements.addBox.disabled = true;
  elements.exportBoxes.disabled = true;
  elements.undoEdit.disabled = true;
  elements.addTurf.disabled = true;
  elements.undoTurfEdit.disabled = true;
  elements.alignTurfs.disabled = true;
  elements.turfScaleDown.disabled = true;
  elements.turfScaleUp.disabled = true;
  elements.resetTurfAlignment.disabled = true;
  elements.editBlacklistRegions.disabled = true;
  elements.blacklistScaleDown.disabled = true;
  elements.blacklistScaleUp.disabled = true;
  elements.resetBlacklistRegions.disabled = true;
  for (const button of elements.directoryAddButtons) {
    button.disabled = true;
    button.addEventListener('click', () => addDirectoryRecord(button.dataset.directoryAdd));
  }
  for (const button of elements.regulationAddButtons) {
    button.disabled = true;
    button.addEventListener('click', () => addRegulationRecord(button.dataset.regulationAdd));
  }
  for (const link of elements.navLinks) {
    link.addEventListener('click', () => setActiveView(link.dataset.view));
  }
  elements.search.addEventListener('change', selectFromSearch);
  elements.search.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      selectFromSearch();
    }
  });
  elements.zoomIn.addEventListener('click', () => setZoom(zoom + 0.5));
  elements.zoomOut.addEventListener('click', () => setZoom(zoom - 0.35));
  elements.zoomRange.addEventListener('input', event => setZoom(Number(event.target.value)));
  elements.turfZoomIn.addEventListener('click', () => setTurfZoom(turfZoom + 0.5));
  elements.turfZoomOut.addEventListener('click', () => setTurfZoom(turfZoom - 0.35));
  elements.turfZoomRange.addEventListener('input', event => setTurfZoom(Number(event.target.value)));
  elements.alignTurfs.addEventListener('click', () => {
    if (!editMode) {
      openPasswordDialog();
      return;
    }

    setTurfAlignmentMode(!turfAlignmentMode);
  });
  elements.turfScaleDown.addEventListener('click', () => scaleTurfAlignment(-0.02));
  elements.turfScaleUp.addEventListener('click', () => scaleTurfAlignment(0.02));
  elements.resetTurfAlignment.addEventListener('click', resetTurfAlignment);
  elements.editBlacklistRegions.addEventListener('click', () => {
    if (!editMode) {
      openPasswordDialog();
      return;
    }

    setBlacklistRegionMode(!blacklistRegionMode);
  });
  elements.blacklistScaleDown.addEventListener('click', () => scaleSelectedBlacklistRegion(-0.04));
  elements.blacklistScaleUp.addEventListener('click', () => scaleSelectedBlacklistRegion(0.04));
  elements.resetBlacklistRegions.addEventListener('click', resetBlacklistRegions);
  elements.turfShapeCanvas.addEventListener('pointerdown', startBlacklistRegionDrag);
  elements.turfShapeCanvas.addEventListener('pointerdown', startTurfAlignmentDrag);
  window.addEventListener('pointermove', moveBlacklistRegionDrag);
  window.addEventListener('pointermove', moveTurfAlignmentDrag);
  window.addEventListener('pointerup', stopBlacklistRegionDrag);
  window.addEventListener('pointerup', stopTurfAlignmentDrag);
  elements.turfShapeCanvas.addEventListener('click', selectTurfFromCanvas);
  elements.mapWrap.addEventListener('wheel', event => {
    if (!event.ctrlKey && !event.metaKey) {
      return;
    }

    event.preventDefault();
    setZoom(zoom + (event.deltaY < 0 ? 0.35 : -0.25));
  }, { passive: false });
  elements.turfMapWrap.addEventListener('wheel', event => {
    if (!event.ctrlKey && !event.metaKey) {
      return;
    }

    event.preventDefault();
    setTurfZoom(turfZoom + (event.deltaY < 0 ? 0.35 : -0.25));
  }, { passive: false });
  elements.editModeLock.addEventListener('click', () => {
    if (editMode) {
      setEditMode(false);
      return;
    }

    if (editSessionPassword) {
      setEditMode(true);
      return;
    }

    openPasswordDialog();
  });
  elements.passwordForm.addEventListener('submit', event => {
    event.preventDefault();

    if (elements.editPassword.value === EDIT_PASSWORD) {
      elements.passwordDialog.close();
      unlockEditMode();
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
  elements.undoTurfEdit.addEventListener('click', undoLastTurfEdit);
  elements.addTurf.addEventListener('click', createNewTurf);
  elements.toggleTurfKey.addEventListener('click', () => {
    const isOpen = !elements.turfKeyPanel.hidden;
    elements.turfKeyPanel.hidden = isOpen;
    elements.toggleTurfKey.setAttribute('aria-expanded', String(!isOpen));
  });
  elements.turfSearch.addEventListener('change', () => {
    const value = elements.turfSearch.value.trim().toLowerCase();
    const match = mafiaTurfs.find(turf => {
      return `${turfLabel(turf)} - ${turf.owner} - ${turf.status}`.toLowerCase() === value ||
        turf.number.toLowerCase() === value ||
        turf.owner.toLowerCase() === value;
    });

    if (match) {
      selectTurf(match.id);
    }
  });
  elements.exportBoxes.addEventListener('click', () => {
    exportBoxes().catch(() => {
      elements.exportBoxes.textContent = 'Download Ready';
      window.setTimeout(() => {
        elements.exportBoxes.textContent = 'Export Boxes';
      }, 1600);
    });
  });
  for (const [field, element] of editablePropertyFields()) {
    element.dataset.field = field;
    if (!['buildingType', 'saleStatus'].includes(field)) {
      element.addEventListener('input', updateSelectedPropertyFromInput);
    }
  }
  elements.buildingTypeEdit.addEventListener('change', updateSelectedBuildingType);
  elements.propertySaleStatusEdit.addEventListener('change', updateSelectedPropertyFromInput);
  elements.turfNumberEdit.addEventListener('input', event => updateSelectedTurfField('number', event.currentTarget.value));
  elements.turfOwnerEdit.addEventListener('change', event => updateSelectedTurfField('owner', event.currentTarget.value));
  elements.turfStatusEdit.addEventListener('change', event => updateSelectedTurfField('status', event.currentTarget.value));
  window.addEventListener('keydown', handleKeyboardEdit);
  window.addEventListener('pointermove', moveMarkerEdit);
  window.addEventListener('pointermove', moveTurfEdit);
  window.addEventListener('pointerup', stopMarkerEdit);
  window.addEventListener('pointerup', stopTurfEdit);
  setZoom(1, false);
  setTurfZoom(1, false);
  startLiveDataSync();
}

init();
