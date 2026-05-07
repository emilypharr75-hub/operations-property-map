const fs = require('fs');
const path = require('path');
const Tesseract = require('tesseract.js');

const imagePath = path.join(__dirname, '..', 'public', 'assets', 'erlc-map.png');
const propertiesPath = path.join(__dirname, '..', 'public', 'properties.json');
const outputPath = path.join(__dirname, '..', 'public', 'property-markers.json');

async function main() {
  const properties = JSON.parse(fs.readFileSync(propertiesPath, 'utf8'));
  const wantedNumbers = new Set(properties.map(property => property.number).filter(number => number !== 'N/A'));

  const worker = await Tesseract.createWorker('eng', 1, {});
  await worker.setParameters({
    tessedit_char_whitelist: '0123456789',
    tessedit_pageseg_mode: Tesseract.PSM.SPARSE_TEXT
  });

  const result = await worker.recognize(imagePath, {}, { tsv: true });
  await worker.terminate();

  const rows = result.data.tsv
    .trim()
    .split(/\r?\n/)
    .map(row => row.split('\t'));
  const hasHeader = rows[0]?.[0] === 'level';
  let column = name => ({
    left: 6,
    top: 7,
    width: 8,
    height: 9,
    conf: 10,
    text: 11
  }[name]);

  if (hasHeader) {
    const headers = rows.shift();
    column = name => headers.indexOf(name);
  }

  const allWords = rows
    .map(row => {
      const left = Number(row[column('left')]);
      const top = Number(row[column('top')]);
      const width = Number(row[column('width')]);
      const height = Number(row[column('height')]);

      return {
        text: String(row[column('text')] || '').replace(/\D/g, ''),
        confidence: Number(row[column('conf')]),
        bbox: {
          x0: left,
          y0: top,
          x1: left + width,
          y1: top + height
        }
      };
    })
    .filter(word => word.text && word.confidence > -1);
  const words = allWords.filter(word => wantedNumbers.has(word.text));

  const bestByNumber = new Map();

  for (const word of words) {
    const previous = bestByNumber.get(word.text);

    if (!previous || word.confidence > previous.confidence) {
      bestByNumber.set(word.text, word);
    }
  }

  const wantedSorted = [...wantedNumbers].sort((a, b) => b.length - a.length);

  for (const word of allWords) {
    if (word.text.length < 4 || word.text.length > 14) {
      continue;
    }

    const matches = wantedSorted
      .map(number => ({ number, index: word.text.indexOf(number) }))
      .filter(match => match.index >= 0);

    if (matches.length === 0) {
      continue;
    }

    for (const match of matches) {
      if (bestByNumber.has(match.number)) {
        continue;
      }

      const charWidth = (word.bbox.x1 - word.bbox.x0) / word.text.length;
      const x0 = Math.round(word.bbox.x0 + match.index * charWidth);
      const x1 = Math.round(x0 + match.number.length * charWidth);

      bestByNumber.set(match.number, {
        text: match.number,
        confidence: Math.max(0, word.confidence - 10),
        bbox: {
          x0,
          y0: word.bbox.y0,
          x1,
          y1: word.bbox.y1
        }
      });
    }
  }

  const markers = [];

  for (const property of properties) {
    const word = bestByNumber.get(property.number);

    if (!word) {
      continue;
    }

    const { x0, y0, x1, y1 } = word.bbox;
    const pad = property.buildingType === 'House' ? 28 : 42;

    markers.push({
      id: property.id,
      rect: [
        Math.max(0, x0 - pad),
        Math.max(0, y0 - pad),
        Math.min(3120, x1 + pad),
        Math.min(3120, y1 + pad)
      ]
    });
  }

  fs.writeFileSync(outputPath, `${JSON.stringify(markers, null, 2)}\n`);
  console.log(`OCR matched ${markers.length} of ${properties.length} properties.`);
  console.log(`Wrote ${outputPath}`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
