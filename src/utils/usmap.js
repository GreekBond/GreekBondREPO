// usmap.js: US tile-grid cartogram data + state helpers. Exports to window.
// A branded square-tile map: geographically-ordered grid, no fragile path data.

const US_STATE_NAMES = {
  AL:'Alabama', AK:'Alaska', AZ:'Arizona', AR:'Arkansas', CA:'California', CO:'Colorado',
  CT:'Connecticut', DE:'Delaware', FL:'Florida', GA:'Georgia', HI:'Hawaii', ID:'Idaho',
  IL:'Illinois', IN:'Indiana', IA:'Iowa', KS:'Kansas', KY:'Kentucky', LA:'Louisiana',
  ME:'Maine', MD:'Maryland', MA:'Massachusetts', MI:'Michigan', MN:'Minnesota', MS:'Mississippi',
  MO:'Missouri', MT:'Montana', NE:'Nebraska', NV:'Nevada', NH:'New Hampshire', NJ:'New Jersey',
  NM:'New Mexico', NY:'New York', NC:'North Carolina', ND:'North Dakota', OH:'Ohio', OK:'Oklahoma',
  OR:'Oregon', PA:'Pennsylvania', RI:'Rhode Island', SC:'South Carolina', SD:'South Dakota',
  TN:'Tennessee', TX:'Texas', UT:'Utah', VT:'Vermont', VA:'Virginia', WA:'Washington',
  WV:'West Virginia', WI:'Wisconsin', WY:'Wyoming', DC:'Washington, D.C.',
};

// [row, col] in a 12-col × 8-row grid (west→east, north→south)
const US_TILE_GRID = {
  ME:[0,11], VT:[1,10], NH:[1,11],
  WA:[2,1], MT:[2,2], ND:[2,3], MN:[2,4], WI:[2,6], MI:[2,7], NY:[2,9], MA:[2,10], RI:[2,11],
  OR:[3,1], ID:[3,2], WY:[3,3], SD:[3,4], IA:[3,5], IL:[3,6], IN:[3,7], OH:[3,8], PA:[3,9], NJ:[3,10], CT:[3,11],
  CA:[4,0], NV:[4,1], UT:[4,2], CO:[4,3], NE:[4,4], MO:[4,5], KY:[4,6], WV:[4,7], VA:[4,8], MD:[4,9], DE:[4,10],
  AZ:[5,2], NM:[5,3], KS:[5,4], AR:[5,5], TN:[5,6], NC:[5,7], SC:[5,8], DC:[5,9],
  OK:[6,4], LA:[6,5], MS:[6,6], AL:[6,7], GA:[6,8],
  AK:[7,0], HI:[7,1], TX:[7,4], FL:[7,8],
};

const US_GRID_COLS = 12, US_GRID_ROWS = 8;

// "Boston, MA" → "MA"
function stateOf(person) {
  if (!person || !person.location) return null;
  const m = person.location.match(/,\s*([A-Z]{2})\b/);
  if (m) return m[1] === 'DC' ? 'DC' : m[1];
  return null;
}

Object.assign(window, { US_STATE_NAMES, US_TILE_GRID, US_GRID_COLS, US_GRID_ROWS, stateOf });
