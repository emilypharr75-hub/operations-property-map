const fs = require('fs');
const path = require('path');
const { getProperties } = require('../src/lib/properties');

const outputPath = path.join(__dirname, '..', 'public', 'properties.json');
const webPropertiesSourcePath = path.join(__dirname, '..', 'data', 'web-properties.json');
const markerSourcePath = path.join(__dirname, '..', 'data', 'property-markers.json');
const markerOutputPath = path.join(__dirname, '..', 'public', 'property-markers.json');

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
