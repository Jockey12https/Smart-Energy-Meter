// Simulation of Dashboard identify logic

const numToLabel = {
  7: 'Bulb 7W',
  12: 'Bulb 12W',
  15: 'Bulb 15W'
};

function applyIdentification(devices, payload) {
  // Normalize payload
  let tokens = [];
  if (payload == null) tokens = [];
  else if (Array.isArray(payload)) tokens = payload.map(String);
  else tokens = [String(payload)];

  const joined = tokens.join(',').toUpperCase();

  if (joined.includes('ALL_OFF')) {
    return devices.map(d => ({ ...d, status: 'offline' }));
  }
  if (joined.includes('ALL_ON')) {
    return devices.map(d => ({ ...d, status: 'online' }));
  }

  const matches = joined.match(/\b(7|12|15)\b/g) || [];
  const found = new Set(matches.map(m => Number(m)));

  return devices.map(d => {
    let isOnline = false;
    for (const n of Array.from(found)) {
      if (numToLabel[n] && d.name === numToLabel[n]) {
        isOnline = true;
        break;
      }
    }
    return { ...d, status: isOnline ? 'online' : 'offline' };
  });
}

const sampleDevices = [
  { id: 'a', name: 'Bulb 7W', status: 'offline' },
  { id: 'b', name: 'Bulb 12W', status: 'offline' },
  { id: 'c', name: 'Bulb 15W', status: 'offline' }
];

const tests = [
  'ALL_OFF',
  'ALL_ON',
  '12',
  ['7','12'],
  ['15'],
  '7,12',
  null
];

for (const t of tests) {
  console.log('---');
  console.log('Payload:', JSON.stringify(t));
  const result = applyIdentification(sampleDevices, t);
  console.table(result.map(d => ({ name: d.name, status: d.status })));
}
