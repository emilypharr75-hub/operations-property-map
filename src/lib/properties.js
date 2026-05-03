const fs = require('fs');
const path = require('path');

const CHECK_PROPERTY_CHANNEL_ID = '1491639237693673593';
const PROPERTY_OVERRIDES_PATH = path.join(__dirname, '..', '..', 'data', 'properties-overrides.json');

const baseProperties = [
  {
    id: 'starblox-cafe',
    name: 'Starblox Cafe',
    number: '2063',
    buildingType: 'Starblox Cafe',
    owner: 'N/A',
    price: '$3,000,000',
    tax: '$25,000'
  },
  {
    id: 'three-guys',
    name: 'Three Guys',
    number: '2171',
    buildingType: 'Three Guys',
    owner: 'N/A',
    price: '$3,500,000',
    tax: '$25,000'
  },
  {
    id: 'river-city-gas-station',
    name: 'River City Gas Station',
    number: '2001',
    buildingType: 'River City Gas Station',
    owner: 'N/A',
    price: '$4,500,000',
    tax: '$30,000'
  },
  {
    id: 'county-gas-station',
    name: 'County Gas Station',
    number: '6021',
    buildingType: 'County Gas Station',
    owner: 'N/A',
    price: '$4,500,000',
    tax: '$30,000'
  },
  {
    id: 'springfield-gas-station',
    name: 'Springfield Gas Station',
    number: '11101',
    buildingType: 'Springfield Gas Station',
    owner: 'N/A',
    price: '$4,500,000',
    tax: '$30,000'
  },
  {
    id: 'gas-depot',
    name: 'Gas Depot',
    number: '3071',
    buildingType: 'Gas Depot',
    owner: 'Government',
    price: 'N/A',
    tax: 'N/A'
  },
  {
    id: 'river-city-gun-store',
    name: 'River City Gun Store',
    number: '4011',
    buildingType: 'River City Gun Store',
    owner: 'N/A',
    price: '$15,500,000',
    tax: '$50,000'
  },
  {
    id: 'family-jewels',
    name: 'Family Jewels',
    number: '4031',
    buildingType: 'Family Jewels',
    owner: 'N/A',
    price: '$6,000,000',
    tax: '$35,000'
  },
  {
    id: 'springfield-repair-shop',
    name: 'Springfield Repair Shop',
    number: '11082',
    buildingType: 'Springfield Repair Shop',
    owner: 'N/A',
    price: '$3,500,000',
    tax: '$25,000'
  },
  {
    id: 'rick-and-johns',
    name: "Rick and John's",
    number: '11051',
    buildingType: "Rick and John's",
    owner: 'N/A',
    price: '$2,000,000',
    tax: '$15,000'
  },
  {
    id: 'spring-bakery',
    name: 'Spring Bakery',
    number: '11051',
    buildingType: 'Spring Bakery',
    owner: 'N/A',
    price: '$2,000,000',
    tax: '$15,000'
  },
  {
    id: 'springfield-apparel',
    name: 'Springfield Apparel',
    number: '11071',
    buildingType: 'Springfield Apparel',
    owner: 'N/A',
    price: '$2,000,000',
    tax: '$15,000'
  },
  {
    id: 'redwood-outdoor-store',
    name: 'Redwood Outdoor Store',
    number: '4121',
    buildingType: 'Redwood Outdoor Store',
    owner: 'N/A',
    price: '$5,000,000',
    tax: '$30,000'
  },
  {
    id: 'tool-store',
    name: 'Tool Store',
    number: '4061',
    buildingType: 'Tool Store',
    owner: 'N/A',
    price: '$6,000,000',
    tax: '$40,000'
  },
  {
    id: 'valley-transit',
    name: 'Valley Transit',
    number: '2172',
    buildingType: 'Valley Transit',
    owner: 'N/A',
    price: '$3,500,000',
    tax: '$25,000'
  },
  {
    id: 'county-farm',
    name: 'County Farm',
    number: 'N/A',
    buildingType: 'County Farm',
    owner: 'N/A',
    price: '$4,000,000',
    tax: '$20,000'
  },
  {
    id: 'main-farm-rural-heartland',
    name: 'Main Farm (Rural Heartland)',
    number: 'N/A',
    buildingType: 'Main Farm (Rural Heartland)',
    owner: 'N/A',
    price: '$4,500,000',
    tax: '$25,000'
  },
  {
    id: 'theater',
    name: 'Theater',
    number: '11081',
    buildingType: 'Theater',
    owner: 'N/A',
    price: '$2,000,000',
    tax: '$25,000'
  },
  {
    id: 'dealership',
    name: 'Dealership',
    number: '2031',
    buildingType: 'Dealership',
    owner: 'N/A',
    price: '$20,000,000',
    tax: '$80,000'
  },
  {
    id: 'bank',
    name: 'Bank',
    number: '2051',
    buildingType: 'Bank',
    owner: 'Government',
    price: 'N/A',
    tax: 'N/A'
  },
  {
    id: 'memorial-hospital',
    name: 'Memorial Hospital',
    number: '4041',
    buildingType: 'Memorial Hospital',
    owner: 'Government',
    price: 'N/A',
    tax: 'N/A'
  },
  {
    id: 'post-office',
    name: 'Post Office',
    number: '3081',
    buildingType: 'Post Office',
    owner: 'N/A',
    price: '$3,000,000',
    tax: '$30,000'
  },
  {
    id: 'waste-services',
    name: 'Waste Services',
    number: 'N/A',
    buildingType: 'Waste Services',
    owner: 'N/A',
    price: '$7,500,000',
    tax: '$40,000'
  },
  {
    id: 'distribution-center',
    name: 'Distribution Center',
    number: 'N/A',
    buildingType: 'Distribution Center',
    owner: 'N/A',
    price: '$7,500,000',
    tax: '$40,000'
  },
  {
    id: 'warehouse',
    name: 'Warehouse',
    number: 'N/A',
    buildingType: 'Warehouse',
    owner: 'N/A',
    price: '$10,000,000',
    tax: '$60,000'
  },
  {
    id: 'springfield-guns-and-ammo',
    name: 'Springfield Guns and Ammo',
    number: '11043',
    buildingType: 'Springfield Guns and Ammo',
    owner: 'N/A',
    price: '$15,500,000',
    tax: '$50,000'
  },
  {
    id: 'news-service',
    name: 'News Service',
    number: 'N/A',
    buildingType: 'News Service',
    owner: 'N/A',
    price: '$1,000,000',
    tax: '$15,000'
  },
  {
    id: 'metro-tactical',
    name: 'Metro Tactical',
    number: 'N/A',
    buildingType: 'Metro Tactical',
    owner: 'N/A',
    price: '$6,000,000',
    tax: '$30,000'
  },
  {
    id: 'construction-site',
    name: 'Construction Site',
    number: '4071',
    buildingType: 'Construction Site',
    owner: 'N/A',
    price: '$3,500,000',
    tax: '$20,000'
  },
  {
    id: 'la-mesa',
    name: 'La Mesa',
    number: 'N/A',
    buildingType: 'La Mesa',
    owner: 'N/A',
    price: '$4,500,000',
    tax: '$30,000'
  },
  {
    id: 'springfield-office-building-5',
    name: 'Springfield Office Building #5',
    number: '5',
    buildingType: 'Springfield Office Building #5',
    owner: 'N/A',
    price: '$1,000,000',
    tax: '$15,000'
  }
];

const housingPostalNumbers = [
  '2011', '2012',
  '2061', '2062', '2063',
  '2071', '2072', '2073', '2074',
  '2081', '2082', '2083', '2084', '2085',
  '2111', '2121', '2131', '2132', '2161', '2191',
  '2201', '2202', '2211', '2212', '2213', '2214', '2221', '2222',
  '3001', '3041', '3051', '3061', '3091',
  '4052', '4053', '4054', '4055', '4056',
  '5021', '5041', '5042', '5043', '5044',
  '5051', '5052', '5053', '5054', '5061', '5062', '5063',
  '7001', '7011', '7012', '7013',
  '7021', '7022', '7023',
  '7041', '7042', '7043', '7044',
  '7051', '7052', '7053', '7054', '7055', '7056',
  '7061', '7062', '7063', '7064',
  '7091', '7092', '7093', '7094', '7095',
  '9041', '9042', '9043', '9045',
  '9061', '9062',
  '9071', '9072', '9073', '9074',
  '9081', '9082', '9101',
  '11031', '11032',
  '11091', '11092',
  '11121', '11122', '11123',
  '12021', '12022', '12023',
  '12051', '12052', '12053', '12054', '12055', '12056'
];

const housingProperties = housingPostalNumbers.map(number => ({
  id: `house-${number}`,
  name: `House ${number}`,
  number,
  buildingType: 'House',
  owner: 'N/A',
  price: 'Not for sale',
  tax: 'Not for sale'
}));

const mapPostalNumbers = [
  '200', '201', '202', '203', '204', '205', '206', '207', '208', '210', '211', '212', '213',
  '216', '217', '218', '219', '220', '221', '222', '223', '224', '225',
  '300', '301', '302', '303', '304', '305', '306', '307', '308', '309', '310', '311', '312',
  '313', '314',
  '400', '401', '402', '403', '404', '405', '406', '407', '408', '409', '410', '411', '412',
  '500', '501', '502', '503', '504', '505', '506', '507', '509', '510', '511',
  '600', '601', '602', '603', '604', '605',
  '700', '701', '702', '703', '704', '705', '706', '707', '708', '709', '710', '711',
  '800', '801', '802', '803', '804', '805', '806',
  '900', '901', '902', '903', '904', '905', '906', '907', '908', '909', '910',
  '1100', '1101', '1102', '1103', '1104', '1105', '1106', '1107', '1108', '1109',
  '1110', '1111', '1112', '1113',
  '1200', '1201', '1202', '1203', '1204', '1205', '1206', '1207'
];

const notableNumbers = new Set(baseProperties.map(property => property.number));
const housingNumbers = new Set(housingPostalNumbers);

const mapPostalProperties = mapPostalNumbers
  .filter(number => !notableNumbers.has(number) && !housingNumbers.has(number))
  .map(number => ({
    id: `postal-${number}`,
    name: `Property ${number}`,
    number,
    buildingType: 'Property',
    owner: 'N/A',
    price: 'Not for sale',
    tax: 'Not for sale'
  }));

const allProperties = [...baseProperties, ...housingProperties, ...mapPostalProperties];
const basePropertyById = new Map(allProperties.map(property => [property.id, property]));

function readPropertyOverrides() {
  if (!fs.existsSync(PROPERTY_OVERRIDES_PATH)) {
    return {};
  }

  return JSON.parse(fs.readFileSync(PROPERTY_OVERRIDES_PATH, 'utf8'));
}

function writePropertyOverrides(overrides) {
  fs.mkdirSync(path.dirname(PROPERTY_OVERRIDES_PATH), { recursive: true });
  fs.writeFileSync(PROPERTY_OVERRIDES_PATH, `${JSON.stringify(overrides, null, 2)}\n`);
}

function applyPropertyOverride(property, overrides) {
  const merged = {
    ...property,
    ...(overrides[property.id] || {})
  };

  return {
    ...merged,
    price: merged.price === 'N/A' ? 'Not for sale' : merged.price,
    tax: merged.tax === 'N/A' ? 'Not for sale' : merged.tax
  };
}

function formatPropertyLabel(property) {
  return `${property.name} (${property.number})`;
}

function getProperties() {
  const overrides = readPropertyOverrides();
  return allProperties.map(property => applyPropertyOverride(property, overrides));
}

function getPropertyById(id) {
  const property = basePropertyById.get(id);

  if (!property) {
    return null;
  }

  return applyPropertyOverride(property, readPropertyOverrides());
}

function getPropertiesByIds(ids) {
  return ids
    .map(getPropertyById)
    .filter(Boolean);
}

function getPropertyAutocompleteChoices(focusedValue) {
  const search = focusedValue.toLowerCase();

  return getProperties()
    .filter(property => {
      const label = formatPropertyLabel(property).toLowerCase();
      return label.includes(search) || property.id.includes(search);
    })
    .slice(0, 25)
    .map(property => ({
      name: formatPropertyLabel(property),
      value: property.id
    }));
}

function updatePropertyField(id, field, value) {
  if (!basePropertyById.has(id)) {
    return null;
  }

  const overrides = readPropertyOverrides();
  overrides[id] = {
    ...(overrides[id] || {}),
    [field]: value
  };

  writePropertyOverrides(overrides);
  return getPropertyById(id);
}

module.exports = {
  CHECK_PROPERTY_CHANNEL_ID,
  formatPropertyLabel,
  getProperties,
  getPropertyAutocompleteChoices,
  getPropertiesByIds,
  updatePropertyField
};
