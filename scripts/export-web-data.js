const fs = require('fs');
const path = require('path');
const { getProperties } = require('../src/lib/properties');

const outputPath = path.join(__dirname, '..', 'public', 'properties.json');
const markerSourcePath = path.join(__dirname, '..', 'data', 'property-markers.json');
const markerOutputPath = path.join(__dirname, '..', 'public', 'property-markers.json');

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(getProperties(), null, 2)}\n`);

console.log(`Exported ${getProperties().length} properties to ${outputPath}`);

if (fs.existsSync(markerSourcePath)) {
  fs.copyFileSync(markerSourcePath, markerOutputPath);
  console.log(`Copied property markers to ${markerOutputPath}`);
}
