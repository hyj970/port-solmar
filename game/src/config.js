// Static configuration for Solmar Bay: the city, its districts, its cars,
// the story missions and the tuning numbers. No logic lives here, only data.

export const WORLD = {
  width: 5200,
  height: 3800,
  roadWidth: 96,
  // Road centre lines, spaced 500 apart, leaving 404-wide blocks.
  vRoads: [200, 700, 1200, 1700, 2200, 2700, 3200, 3700, 4200, 4700, 5000],
  hRoads: [200, 700, 1200, 1700, 2200, 2700, 3200, 3600],
  seed: 20261117,
};

// Six districts in a 3 x 2 grid, each with its own palette and flavour.
export const DISTRICTS = [
  { name: 'Marina Point', x0: 0, y0: 0, x1: 1733, y1: 1900, ground: '#c9a86a', accent: '#2e6f8e', blurb: 'yachts and glass towers' },
  { name: 'Old Harbor', x0: 1733, y0: 0, x1: 3466, y1: 1900, ground: '#b98d5f', accent: '#8e4b2e', blurb: 'warehouses and cranes' },
  { name: 'Coral Row', x0: 3466, y0: 0, x1: 5200, y1: 1900, ground: '#d8b48a', accent: '#c25e7a', blurb: 'neon shops and motels' },
  { name: 'Vista Heights', x0: 0, y0: 1900, x1: 1733, y1: 3800, ground: '#a8b06a', accent: '#5e7a3a', blurb: 'hillside villas' },
  { name: 'Dockside', x0: 1733, y0: 1900, x1: 3466, y1: 3800, ground: '#9a8a7a', accent: '#4a4a55', blurb: 'docks and container yards' },
  { name: 'Palm Court', x0: 3466, y0: 1900, x1: 5200, y1: 3800, ground: '#cfa06a', accent: '#b8862e', blurb: 'casinos and palm avenues' },
];

export function districtAt(x, y) {
  for (const d of DISTRICTS) {
    if (x >= d.x0 && x < d.x1 && y >= d.y0 && y < d.y1) return d;
  }
  return DISTRICTS[0];
}

// Eight stealable car models. topSpeed in px/s, accel in px/s^2.
export const CAR_MODELS = [
  { id: 'hatch', name: 'Pip Squeak', kind: 'hatchback', color: '#e8b13c', topSpeed: 330, accel: 260, grip: 3.4, hp: 60 },
  { id: 'sedan', name: 'Marlow 4-Door', kind: 'sedan', color: '#4a7fb5', topSpeed: 380, accel: 300, grip: 3.8, hp: 80 },
  { id: 'taxi', name: 'Bay Cab', kind: 'taxi', color: '#f2c200', topSpeed: 360, accel: 290, grip: 3.7, hp: 80 },
  { id: 'coupe', name: 'Vantara GT', kind: 'coupe', color: '#c22e3e', topSpeed: 520, accel: 420, grip: 4.6, hp: 70 },
  { id: 'muscle', name: 'Bulldog V8', kind: 'muscle', color: '#2e6b4f', topSpeed: 470, accel: 380, grip: 3.2, hp: 100 },
  { id: 'van', name: 'Cargo Mule', kind: 'van', color: '#8a8f96', topSpeed: 300, accel: 230, grip: 3.0, hp: 120 },
  { id: 'suv', name: 'Terra Hauler', kind: 'suv', color: '#5b4a7a', topSpeed: 400, accel: 320, grip: 3.5, hp: 110 },
  { id: 'sport', name: 'Comet R', kind: 'sport', color: '#e86a1c', topSpeed: 560, accel: 460, grip: 5.0, hp: 65 },
];

export const POLICE_MODEL = { id: 'police', name: 'Solmar PD Interceptor', kind: 'police', color: '#1c1c22', topSpeed: 540, accel: 460, grip: 4.8, hp: 120 };

// Vera Solano's six jobs. Each mission's steps are driven by missions.js;
// the defs here only name the job, its pay and its flavour text.
export const MISSIONS = [
  { id: 'm1', title: 'Hot Wheels', pay: 400, brief: 'Vera needs wheels. Steal any car and bring it to the chop garage in Old Harbor.' },
  { id: 'm2', title: 'The Pickup', pay: 600, brief: 'Collect Vera\u2019s cousin from Coral Row and drop him at the Palm Court safehouse. No cops, no dents.' },
  { id: 'm3', title: 'Chop Shop Special', pay: 900, brief: 'A Vantara GT is parked near the marina. Steal that exact car and deliver it. The PD will notice.' },
  { id: 'm4', title: 'Dockside Dispute', pay: 1400, brief: 'Rival crew at the Dockside yard. Go on foot, settle it, and walk out alive.' },
  { id: 'm5', title: 'Sunset Run', pay: 1200, brief: 'Five checkpoints across Port Solmar, two minutes on the clock. Drive like the sunset depends on it.' },
  { id: 'm6', title: 'The Solmar Job', pay: 3500, brief: 'Hit the Palm Court bank, grab the cash, and lose a five-star manhunt at the marina safehouse.' },
];

export const TUNING = {
  playerSpeed: 190,
  playerHp: 100,
  pistolDamage: 34,
  pistolAmmoStart: 24,
  pistolRange: 520,
  punchDamage: 20,
  punchRange: 46,
  wantedDecaySeconds: 18,
  bustedFine: 300,
  taxiBaseFare: 60,
  taxiPerPx: 0.12,
  copFootSpeed: 150,
  copArrestRange: 26,
  trafficCount: 26,
  pedCount: 46,
  maxWanted: 5,
};

export const CONTROLS_TEXT = [
  'W A S D — move / drive    Mouse — aim    Click — shoot pistol',
  'E — enter / exit car      Space — punch      F — fire pistol (keyboard)',
  'J — start next job        T — take a taxi fare      P — pause',
  'M — mute      R — restart after busted / wasted      H — honk',
];
