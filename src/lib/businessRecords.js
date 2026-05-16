const fs = require('fs');
const path = require('path');

const BUSINESS_RECORDS_PATH = path.join(__dirname, '..', '..', 'data', 'business-records.json');

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function readBusinessRecords() {
  return readJson(BUSINESS_RECORDS_PATH, {});
}

function writeBusinessRecords(records) {
  writeJson(BUSINESS_RECORDS_PATH, records);
}

function normalizeBusinessName(name) {
  return String(name || '').trim();
}

function getBusinessRecord(name) {
  const businessName = normalizeBusinessName(name);
  const records = readBusinessRecords();

  return records[businessName] || {
    notes: [],
    status: 'Active',
    strikes: [],
    suspensions: [],
    warnings: []
  };
}

function saveBusinessRecord(name, record) {
  const businessName = normalizeBusinessName(name);
  const records = readBusinessRecords();

  records[businessName] = {
    notes: Array.isArray(record.notes) ? record.notes : [],
    status: record.status || 'Active',
    strikes: Array.isArray(record.strikes) ? record.strikes : [],
    suspensions: Array.isArray(record.suspensions) ? record.suspensions : [],
    warnings: Array.isArray(record.warnings) ? record.warnings : []
  };

  writeBusinessRecords(records);
  return records[businessName];
}

function addBusinessEntry(name, type, entry) {
  const record = getBusinessRecord(name);
  const entries = Array.isArray(record[type]) ? record[type] : [];
  const nextEntry = {
    ...entry,
    at: new Date().toISOString(),
    id: `${type}-${Date.now()}`
  };

  entries.push(nextEntry);
  record[type] = entries;
  saveBusinessRecord(name, record);

  return { entry: nextEntry, record };
}

function addBusinessStrike(name, entry) {
  const result = addBusinessEntry(name, 'strikes', entry);
  result.record.status = result.record.status || 'Active';
  saveBusinessRecord(name, result.record);
  return result;
}

function addBusinessWarning(name, entry) {
  return addBusinessEntry(name, 'warnings', entry);
}

function addBusinessNote(name, entry) {
  return addBusinessEntry(name, 'notes', entry);
}

function suspendBusiness(name, entry) {
  const result = addBusinessEntry(name, 'suspensions', entry);

  result.record.status = 'Suspended';
  result.record.suspendedUntil = entry.duration;
  saveBusinessRecord(name, result.record);

  return result;
}

function unsuspendBusiness(name, entry) {
  const record = getBusinessRecord(name);
  const historyEntry = {
    ...entry,
    at: new Date().toISOString(),
    id: `unsuspend-${Date.now()}`
  };

  record.status = 'Active';
  delete record.suspendedUntil;
  record.suspensions = Array.isArray(record.suspensions) ? record.suspensions : [];
  record.suspensions.push(historyEntry);
  saveBusinessRecord(name, record);

  return { entry: historyEntry, record };
}

function clearBusinessStrike(name, strikeId, entry) {
  const record = getBusinessRecord(name);
  const strike = record.strikes.find(item => item.id === strikeId);

  if (!strike) {
    return { ok: false, reason: 'not_found', record };
  }

  strike.cleared = true;
  strike.clearedAt = new Date().toISOString();
  strike.clearReason = entry.reason;
  strike.clearedBy = entry.actorId;
  saveBusinessRecord(name, record);

  return { ok: true, record, strike };
}

module.exports = {
  addBusinessNote,
  addBusinessStrike,
  addBusinessWarning,
  clearBusinessStrike,
  getBusinessRecord,
  suspendBusiness,
  unsuspendBusiness
};
