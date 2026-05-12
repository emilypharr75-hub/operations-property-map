const fs = require('fs');
const path = require('path');
const { getProperties } = require('../src/lib/properties');

const outputPath = path.join(__dirname, '..', 'public', 'properties.json');
const webPropertiesSourcePath = path.join(__dirname, '..', 'data', 'web-properties.json');
const markerSourcePath = path.join(__dirname, '..', 'data', 'property-markers.json');
const markerOutputPath = path.join(__dirname, '..', 'public', 'property-markers.json');
const turfSourcePath = path.join(__dirname, '..', 'data', 'mafia-turfs.json');
const turfOutputPath = path.join(__dirname, '..', 'public', 'mafia-turfs.json');
const orgsSourcePath = path.join(__dirname, '..', 'data', 'orgs.json');
const orgsOutputPath = path.join(__dirname, '..', 'public', 'orgs.json');

function getWebProperties() {
  if (fs.existsSync(webPropertiesSourcePath)) {
    return JSON.parse(fs.readFileSync(webPropertiesSourcePath, 'utf8'));
  }

  return getProperties();
}

const webProperties = getWebProperties();

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(webProperties, null, 2)}\n`);

console.log(`Exported ${webProperties.length} properties to ${outputPath}`);

if (fs.existsSync(markerSourcePath)) {
  fs.copyFileSync(markerSourcePath, markerOutputPath);
  console.log(`Copied property markers to ${markerOutputPath}`);
}

if (fs.existsSync(turfSourcePath)) {
  fs.copyFileSync(turfSourcePath, turfOutputPath);
  console.log(`Copied mafia turfs to ${turfOutputPath}`);
}

if (fs.existsSync(orgsSourcePath)) {
  fs.copyFileSync(orgsSourcePath, orgsOutputPath);
  console.log(`Copied directory records to ${orgsOutputPath}`);
}
