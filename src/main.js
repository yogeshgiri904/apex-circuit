import * as THREE from 'three';
import './style.css';

const TAU = Math.PI * 2;
const TRACK_WIDTH = 12.6;
const SAMPLE_COUNT = 240;
const TOTAL_LAPS = 3;
const mount = document.querySelector('#game');
const bootLoader = document.querySelector('#boot-loader');
const bootStarted = performance.now();
let bootReady = false;
let bootScheduled = false;

const ui = {
  lap: document.querySelector('#lap'),
  position: document.querySelector('#position'),
  timer: document.querySelector('#timer'),
  best: document.querySelector('#best'),
  speed: document.querySelector('#speed'),
  gear: document.querySelector('#gear'),
  arc: document.querySelector('#speed-arc'),
  countdown: document.querySelector('#countdown'),
  countdownValue: document.querySelector('#countdown-value'),
  countdownCaption: document.querySelector('#countdown-caption'),
  raceLabel: document.querySelector('#race-label'),
  raceStatus: document.querySelector('.race-status'),
  finish: document.querySelector('#finish'),
  finishTime: document.querySelector('#finish-time'),
  finishBest: document.querySelector('#finish-best'),
  finishTitle: document.querySelector('#finish-title'),
  finishDescription: document.querySelector('#finish-description'),
  finishPosition: document.querySelector('#finish-position'),
  restart: document.querySelector('#restart'),
  garage: document.querySelector('#garage'),
  garageToggle: document.querySelector('#garage-toggle'),
  garageClose: document.querySelector('#garage-close'),
  garageFilters: document.querySelector('#garage-filters'),
  vehicleGrid: document.querySelector('#vehicle-grid'),
  vehicleName: document.querySelector('#vehicle-name'),
  standings: document.querySelector('#standings'),
  systems: document.querySelector('.systems-panel'),
  fuelBar: document.querySelector('#fuel-bar'),
  fuelValue: document.querySelector('#fuel-value'),
  timeBank: document.querySelector('#time-bank'),
  effectChips: document.querySelector('#effect-chips'),
  pickupToast: document.querySelector('#pickup-toast'),
  pickupSymbol: document.querySelector('#pickup-symbol'),
  pickupTitle: document.querySelector('#pickup-title'),
  pickupDetail: document.querySelector('#pickup-detail'),
  habitatPanel: document.querySelector('#habitat-panel'),
  wildlifeCount: document.querySelector('#wildlife-count'),
  habitatStatus: document.querySelector('#habitat-status'),
  wildlifeToast: document.querySelector('#wildlife-toast'),
  wildlifeSymbol: document.querySelector('#wildlife-symbol'),
  wildlifeTitle: document.querySelector('#wildlife-title'),
  wildlifeDetail: document.querySelector('#wildlife-detail'),
  signalGuide: document.querySelector('#signal-guide'),
  signalArrow: document.querySelector('#signal-arrow'),
  signalDistance: document.querySelector('#signal-distance'),
  signalStatus: document.querySelector('#signal-status'),
  monumentPrompt: document.querySelector('#monument-prompt'),
  steeringPad: document.querySelector('#steering-pad'),
  steeringKnob: document.querySelector('#steering-knob'),
  cruiseToggle: document.querySelector('#cruise-toggle'),
  mobileCoach: document.querySelector('#mobile-coach'),
  layoutToggle: document.querySelector('#layout-toggle'),
  layoutToggleLabel: document.querySelector('#layout-toggle-label'),
  controlSettings: document.querySelector('#control-settings'),
  controlSettingsClose: document.querySelector('#control-settings-close'),
};

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x9fc9d0, 135, 360);
const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.1, 500);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
function pixelRatioCap() { return matchMedia('(pointer: coarse)').matches ? 1.5 : 1.75; }
renderer.setPixelRatio(Math.min(devicePixelRatio, pixelRatioCap()));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
mount.appendChild(renderer.domElement);

const hemi = new THREE.HemisphereLight(0xd7f4ff, 0x65794d, 1.45);
scene.add(hemi);
const sunLight = new THREE.DirectionalLight(0xffe8ba, 2.25);
sunLight.position.set(-72, 100, -45);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
sunLight.shadow.camera.left = -115;
sunLight.shadow.camera.right = 115;
sunLight.shadow.camera.top = 95;
sunLight.shadow.camera.bottom = -95;
sunLight.shadow.camera.near = 1;
sunLight.shadow.camera.far = 230;
sunLight.shadow.bias = -0.00045;
sunLight.shadow.normalBias = 0.03;
scene.add(sunLight);

const sky = new THREE.Mesh(
  new THREE.SphereGeometry(350, 24, 16),
  new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: { top: { value: new THREE.Color(0x4a91c4) }, horizon: { value: new THREE.Color(0xc9e4de) } },
    vertexShader: 'varying vec3 vDirection; void main(){ vDirection=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 horizon; varying vec3 vDirection; void main(){ float h=clamp(vDirection.y*0.85+0.18,0.0,1.0); gl_FragColor=vec4(mix(horizon,top,pow(h,0.65)),1.0); }',
  }),
);
scene.add(sky);
const sun = new THREE.Mesh(new THREE.SphereGeometry(7, 20, 16), new THREE.MeshBasicMaterial({ color: 0xffe8a6, fog: false }));
sun.position.set(-150, 130, -190);
scene.add(sun);

// The meadow is intentionally much larger than the race area: leaving the asphalt is free-roam, not a collision.
const ground = new THREE.Mesh(new THREE.CircleGeometry(10000, 80), new THREE.MeshStandardMaterial({ color: 0x88a66a, roughness: 1 }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// A closed, asymmetric circuit gives the car a few distinct corners without a large world.
const curve = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-60, 0, -20),
  new THREE.Vector3(-59, 0, 19),
  new THREE.Vector3(-38, 0, 43),
  new THREE.Vector3(-4, 0, 51),
  new THREE.Vector3(39, 0, 46),
  new THREE.Vector3(69, 0, 25),
  new THREE.Vector3(74, 0, -5),
  new THREE.Vector3(58, 0, -29),
  new THREE.Vector3(28, 0, -39),
  new THREE.Vector3(-3, 0, -31),
  new THREE.Vector3(-29, 0, -48),
  new THREE.Vector3(-57, 0, -45),
], true, 'centripetal');

const samples = Array.from({ length: SAMPLE_COUNT }, (_, i) => {
  const u = i / SAMPLE_COUNT;
  const p = curve.getPointAt(u);
  const t = curve.getTangentAt(u).normalize();
  return { x: p.x, z: p.z, tx: t.x, tz: t.z, rx: t.z, rz: -t.x };
});
const TRACK_LENGTH = curve.getLength();
function trackAt(progress) {
  const wrapped = ((progress % 1) + 1) % 1;
  const scaled = wrapped * SAMPLE_COUNT, index = Math.floor(scaled), blend = scaled - index;
  const a = samples[index], b = samples[(index + 1) % SAMPLE_COUNT];
  const tx = THREE.MathUtils.lerp(a.tx, b.tx, blend), tz = THREE.MathUtils.lerp(a.tz, b.tz, blend), inv = 1 / Math.hypot(tx, tz);
  return { x: THREE.MathUtils.lerp(a.x, b.x, blend), z: THREE.MathUtils.lerp(a.z, b.z, blend), tx: tx * inv, tz: tz * inv, rx: tz * inv, rz: -tx * inv, index };
}

function ribbon(width, y, material, inset = 0) {
  const positions = new Float32Array((SAMPLE_COUNT + 1) * 6);
  const uvs = new Float32Array((SAMPLE_COUNT + 1) * 4);
  const indices = [];
  for (let i = 0; i <= SAMPLE_COUNT; i++) {
    const s = samples[i % SAMPLE_COUNT];
    const half = width / 2;
    const j = i * 6;
    positions[j] = s.x - s.rx * half; positions[j + 1] = y; positions[j + 2] = s.z - s.rz * half;
    positions[j + 3] = s.x + s.rx * half; positions[j + 4] = y; positions[j + 5] = s.z + s.rz * half;
    uvs[i * 4] = inset; uvs[i * 4 + 1] = i / 12; uvs[i * 4 + 2] = 1 - inset; uvs[i * 4 + 3] = i / 12;
    if (i < SAMPLE_COUNT) indices.push(i * 2, i * 2 + 2, i * 2 + 1, i * 2 + 1, i * 2 + 2, i * 2 + 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

ribbon(TRACK_WIDTH, 0.038, new THREE.MeshStandardMaterial({ color: 0x293b45, roughness: 0.94 }));

const dummy = new THREE.Object3D();

const dash = new THREE.InstancedMesh(new THREE.BoxGeometry(.18, .018, 1.65), new THREE.MeshStandardMaterial({ color: 0xe4dcbf, roughness: 1 }), Math.floor(SAMPLE_COUNT / 5));
let dashIndex = 0;
for (let i = 3; i < SAMPLE_COUNT; i += 5) {
  const s = samples[i]; dummy.position.set(s.x, .063, s.z); dummy.rotation.set(0, Math.atan2(s.tx, s.tz), 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); dash.setMatrixAt(dashIndex++, dummy.matrix);
}
dash.count = dashIndex; dash.receiveShadow = true; scene.add(dash);

function nearestTrack(x, z) {
  let best = 0, bestD = Infinity;
  for (let i = 0; i < SAMPLE_COUNT; i++) {
    const dx = x - samples[i].x, dz = z - samples[i].z, d = dx * dx + dz * dz;
    if (d < bestD) { bestD = d; best = i; }
  }
  const s = samples[best];
  return { index: best, sample: s, lateral: (x - s.x) * s.rx + (z - s.z) * s.rz, distanceSq: bestD };
}

// Deterministic scenery keeps the scene small and repeatable.
let seed = 7919;
function random() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }

const WATER_BODIES = [
  { x: -101, z: 38, rx: 24, rz: 14, phase: .2 },
  { x: 105, z: -25, rx: 19, rz: 11, phase: 1.7 },
  { x: 31, z: 15, rx: 11.5, rz: 7.2, phase: 3.1 },
];
function inWaterZone(x, z, padding = 0) {
  return WATER_BODIES.some(water => ((x - water.x) / (water.rx + padding)) ** 2 + ((z - water.z) / (water.rz + padding)) ** 2 < 1);
}
function organicPondShape(rx, rz, phase) {
  const shape = new THREE.Shape();
  for (let i = 0; i <= 36; i++) {
    const angle = i / 36 * TAU, wobble = 1 + Math.sin(angle * 3 + phase) * .055 + Math.sin(angle * 5 - phase) * .035;
    const x = Math.cos(angle) * rx * wobble, y = Math.sin(angle) * rz * wobble;
    if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
  }
  shape.closePath(); return shape;
}
const waterMaterial = new THREE.MeshStandardMaterial({ color: 0x4ea7a7, emissive: 0x153f42, emissiveIntensity: .22, metalness: .24, roughness: .3, transparent: true, opacity: .92 });
const shoreMaterial = new THREE.MeshStandardMaterial({ color: 0xc1b985, roughness: 1 });
const lilyMaterial = new THREE.MeshStandardMaterial({ color: 0x65976e, roughness: .9 });
const rippleMaterial = new THREE.MeshBasicMaterial({ color: 0xc0ebe4, transparent: true, opacity: .35, depthWrite: false });
const waterRipples = [];
for (const water of WATER_BODIES) {
  const shape = organicPondShape(water.rx, water.rz, water.phase), geometry = new THREE.ShapeGeometry(shape, 1);
  const shore = new THREE.Mesh(geometry, shoreMaterial); shore.rotation.x = -Math.PI / 2; shore.position.set(water.x, .009, water.z); shore.scale.set(1.1, 1.1, 1); shore.receiveShadow = true; scene.add(shore);
  const surface = new THREE.Mesh(geometry, waterMaterial); surface.rotation.x = -Math.PI / 2; surface.position.set(water.x, .026, water.z); surface.receiveShadow = true; scene.add(surface);
  for (let i = 0; i < 3; i++) {
    const ripple = new THREE.Mesh(new THREE.TorusGeometry(1, .025, 5, 32), rippleMaterial.clone()); ripple.rotation.x = Math.PI / 2;
    ripple.position.set(water.x + (i - 1) * water.rx * .31, .044, water.z + Math.sin(i * 2 + water.phase) * water.rz * .28); scene.add(ripple); waterRipples.push({ mesh: ripple, phase: water.phase + i * 1.7 });
  }
  for (let i = 0; i < 7; i++) {
    const angle = water.phase + i * 2.37, radius = .35 + (i % 3) * .13;
    const lily = new THREE.Mesh(new THREE.CircleGeometry(.35 + (i % 3) * .12, 7), lilyMaterial); lily.rotation.x = -Math.PI / 2; lily.position.set(water.x + Math.cos(angle) * water.rx * radius, .048, water.z + Math.sin(angle) * water.rz * radius); scene.add(lily);
    if (i % 3 === 0) { const flower = new THREE.Mesh(new THREE.SphereGeometry(.11, 7, 5), new THREE.MeshStandardMaterial({ color: 0xf7d9bb, roughness: .85 })); flower.position.set(lily.position.x, .11, lily.position.z); scene.add(flower); }
  }
}

// Faceted horizon layers give the small circuit a broad valley silhouette.
const mountainCount = 34, mountainGeometry = new THREE.ConeGeometry(1, 1, 7), mountainMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true });
const mountains = new THREE.InstancedMesh(mountainGeometry, mountainMaterial, mountainCount);
const snowcaps = new THREE.InstancedMesh(mountainGeometry, new THREE.MeshStandardMaterial({ color: 0xe6efeb, roughness: 1, flatShading: true }), mountainCount);
const mountainColors = [0x718f85, 0x7b9788, 0x66847f, 0x8a9e8c, 0x718681];
let capIndex = 0;
for (let i = 0; i < mountainCount; i++) {
  const angle = i / mountainCount * TAU + (random() - .5) * .11, distance = 195 + random() * 53, radius = 16 + random() * 20, height = 35 + random() * 54;
  const x = Math.sin(angle) * distance, z = Math.cos(angle) * distance;
  dummy.position.set(x, height / 2 - .5, z); dummy.rotation.set(0, random() * TAU, 0); dummy.scale.set(radius, height, radius * (.78 + random() * .36)); dummy.updateMatrix(); mountains.setMatrixAt(i, dummy.matrix); mountains.setColorAt(i, new THREE.Color(mountainColors[i % mountainColors.length]));
  if (height > 60) { const capHeight = height * .24; dummy.position.set(x, height - capHeight / 2 - .5, z); dummy.scale.set(radius * .245, capHeight, radius * .245); dummy.updateMatrix(); snowcaps.setMatrixAt(capIndex++, dummy.matrix); }
}
snowcaps.count = capIndex; scene.add(mountains, snowcaps);
const hills = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true }), 26);
for (let i = 0; i < 26; i++) {
  const angle = i / 26 * TAU + .08, distance = 152 + random() * 28, width = 11 + random() * 15;
  dummy.position.set(Math.sin(angle) * distance, 3 + random() * 3, Math.cos(angle) * distance); dummy.rotation.set(0, random() * TAU, 0); dummy.scale.set(width, 6 + random() * 5, width * (.7 + random() * .5)); dummy.updateMatrix(); hills.setMatrixAt(i, dummy.matrix); hills.setColorAt(i, new THREE.Color([0x76946a, 0x819c70, 0x6e8e68][i % 3]));
}
scene.add(hills);

const meadowPatches = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 16), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 }), 62);
for (let i = 0; i < 62; i++) {
  dummy.position.set((random() - .5) * 270, .007 + (i % 3) * .001, (random() - .5) * 210); dummy.rotation.set(-Math.PI / 2, 0, random() * TAU); dummy.scale.set(5 + random() * 14, 3 + random() * 8, 1); dummy.updateMatrix(); meadowPatches.setMatrixAt(i, dummy.matrix); meadowPatches.setColorAt(i, new THREE.Color([0x76965f, 0x91aa70, 0x819f63, 0x9bae73][i % 4]));
}
meadowPatches.receiveShadow = true; scene.add(meadowPatches);

const treeCount = 155;
const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(.22, .32, 2.4, 6), new THREE.MeshStandardMaterial({ color: 0x705340, roughness: 1 }), treeCount);
const crowns = new THREE.InstancedMesh(new THREE.ConeGeometry(1.6, 4.8, 7), new THREE.MeshStandardMaterial({ color: 0x426f56, roughness: 1 }), treeCount);
const crownTips = new THREE.InstancedMesh(new THREE.ConeGeometry(1.15, 3.4, 7), new THREE.MeshStandardMaterial({ color: 0x558766, roughness: 1 }), treeCount);
let treeIndex = 0, attempts = 0;
while (treeIndex < treeCount && attempts++ < 3000) {
  const x = (random() - .5) * 245, z = (random() - .5) * 190;
  if (Math.hypot(x, z) > 180 || Math.hypot(x, z) < 15 || inWaterZone(x, z, 2) || nearestTrack(x, z).distanceSq < 145) continue;
  const scale = .72 + random() * .68, turn = random() * TAU;
  dummy.position.set(x, 1.2 * scale, z); dummy.rotation.set(0, turn, 0); dummy.scale.set(scale, scale, scale); dummy.updateMatrix(); trunks.setMatrixAt(treeIndex, dummy.matrix);
  dummy.position.y = 3.65 * scale; dummy.updateMatrix(); crowns.setMatrixAt(treeIndex, dummy.matrix);
  dummy.position.y = 5.3 * scale; dummy.updateMatrix(); crownTips.setMatrixAt(treeIndex, dummy.matrix);
  treeIndex++;
}
trunks.count = crowns.count = crownTips.count = treeIndex;
trunks.castShadow = crowns.castShadow = crownTips.castShadow = true;
trunks.receiveShadow = crowns.receiveShadow = crownTips.receiveShadow = true;
scene.add(trunks, crowns, crownTips);

const groveCount = 72;
const groveTrunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(.2, .32, 2.4, 6), new THREE.MeshStandardMaterial({ color: 0x765946, roughness: 1 }), groveCount);
const groveCrowns = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .96, flatShading: true }), groveCount);
let groveIndex = 0, groveAttempts = 0;
while (groveIndex < groveCount && groveAttempts++ < 3000) {
  const x = (random() - .5) * 250, z = (random() - .5) * 200;
  if (Math.hypot(x, z) < 15 || inWaterZone(x, z, 2.5) || nearestTrack(x, z).distanceSq < 125) continue;
  const scale = .68 + random() * .58; dummy.position.set(x, 1.15 * scale, z); dummy.rotation.set(0, random() * TAU, 0); dummy.scale.set(scale, scale, scale); dummy.updateMatrix(); groveTrunks.setMatrixAt(groveIndex, dummy.matrix);
  dummy.position.y = 3.55 * scale; dummy.scale.set(2.05 * scale, 1.55 * scale, 1.85 * scale); dummy.updateMatrix(); groveCrowns.setMatrixAt(groveIndex, dummy.matrix); groveCrowns.setColorAt(groveIndex, new THREE.Color([0x649064, 0x759d67, 0x86a871, 0x5e8661, 0xa6ad6d][groveIndex % 5])); groveIndex++;
}
groveTrunks.count = groveCrowns.count = groveIndex; groveTrunks.castShadow = groveCrowns.castShadow = true; groveTrunks.receiveShadow = groveCrowns.receiveShadow = true; scene.add(groveTrunks, groveCrowns);

const herbGeometry = new THREE.BufferGeometry();
const herbPositions = [];
for (let i = 0; i < 4; i++) { const angle = i / 4 * Math.PI, c = Math.cos(angle), s = Math.sin(angle), width = .18; herbPositions.push(-c * width, 0, -s * width, c * width, 0, s * width, 0, .68 + i * .05, 0); }
herbGeometry.setAttribute('position', new THREE.Float32BufferAttribute(herbPositions, 3)); herbGeometry.computeVertexNormals();
const herbs = new THREE.InstancedMesh(herbGeometry, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, side: THREE.DoubleSide }), 780);
const flowerHeads = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(.12, 0), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .9 }), 195);
let herbIndex = 0, flowerIndex = 0, herbAttempts = 0;
while (herbIndex < 780 && herbAttempts++ < 5000) {
  const x = (random() - .5) * 245, z = (random() - .5) * 190;
  if (Math.hypot(x, z) < 11 || inWaterZone(x, z, .8) || nearestTrack(x, z).distanceSq < 62) continue;
  const scale = .65 + random() * .8; dummy.position.set(x, .025, z); dummy.rotation.set(0, random() * TAU, 0); dummy.scale.set(scale, scale, scale); dummy.updateMatrix(); herbs.setMatrixAt(herbIndex, dummy.matrix); herbs.setColorAt(herbIndex, new THREE.Color([0x5e8b57, 0x769c5c, 0x91a96a, 0x65945e][herbIndex % 4]));
  if (herbIndex % 4 === 0 && flowerIndex < 195) { dummy.position.y = .58 * scale; dummy.scale.setScalar(.75 + random() * .65); dummy.updateMatrix(); flowerHeads.setMatrixAt(flowerIndex, dummy.matrix); flowerHeads.setColorAt(flowerIndex, new THREE.Color([0xf0d38d, 0xf5d9c5, 0xd8a8bc, 0xbcc9ea, 0xe7b86b][flowerIndex % 5])); flowerIndex++; }
  herbIndex++;
}
herbs.count = herbIndex; flowerHeads.count = flowerIndex; scene.add(herbs, flowerHeads);

const reedCount = 84, reeds = new THREE.InstancedMesh(new THREE.CylinderGeometry(.025, .045, 1, 5), new THREE.MeshStandardMaterial({ color: 0x718854, roughness: 1 }), reedCount);
for (let i = 0; i < reedCount; i++) {
  const water = WATER_BODIES[i % WATER_BODIES.length], angle = i * 2.399, edge = .96 + random() * .12, height = .65 + random() * .9;
  dummy.position.set(water.x + Math.cos(angle) * water.rx * edge, height / 2, water.z + Math.sin(angle) * water.rz * edge); dummy.rotation.set((random() - .5) * .16, 0, (random() - .5) * .16); dummy.scale.set(1, height, 1); dummy.updateMatrix(); reeds.setMatrixAt(i, dummy.matrix);
}
scene.add(reeds);

const rockCount = 48;
const rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: 0xa79d7c, roughness: 1 }), rockCount);
let rockIndex = 0;
while (rockIndex < rockCount) {
  const x = (random() - .5) * 260, z = (random() - .5) * 205;
  if (Math.hypot(x, z) < 15 || inWaterZone(x, z, 2) || nearestTrack(x, z).distanceSq < 155) continue;
  dummy.position.set(x, .25 + random() * .35, z); dummy.rotation.set(random(), random() * TAU, random()); dummy.scale.set(.7 + random() * 1.8, .4 + random(), .7 + random() * 1.6); dummy.updateMatrix(); rocks.setMatrixAt(rockIndex++, dummy.matrix);
}
rocks.castShadow = true; rocks.receiveShadow = true; scene.add(rocks);

const cloudMat = new THREE.MeshBasicMaterial({ color: 0xf3f4e9, fog: false });
for (let i = 0; i < 12; i++) {
  const cloud = new THREE.Group();
  const count = 3 + Math.floor(random() * 3);
  for (let j = 0; j < count; j++) {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), cloudMat);
    puff.position.set((j - count / 2) * 3.3, random() * 1.5, random() * 2); puff.scale.set(3 + random() * 2, 1.5 + random(), 2 + random()); cloud.add(puff);
  }
  cloud.position.set((random() - .5) * 300, 42 + random() * 40, (random() - .5) * 290); scene.add(cloud);
}

// Shared low-poly animal parts keep a lively reserve inexpensive to render.
const wildlifeBox = new THREE.BoxGeometry(1, 1, 1), wildlifeSphere = new THREE.SphereGeometry(1, 8, 6), wildlifeCylinder = new THREE.CylinderGeometry(1, 1, 1, 7), wildlifeCone = new THREE.ConeGeometry(1, 1, 6);
const wildlifeMaterials = {
  deer: new THREE.MeshStandardMaterial({ color: 0xb98458, roughness: .92 }), deerLight: new THREE.MeshStandardMaterial({ color: 0xe4c495, roughness: .92 }),
  rabbit: new THREE.MeshStandardMaterial({ color: 0xe9dfd0, roughness: .94 }), rabbitPink: new THREE.MeshStandardMaterial({ color: 0xe8aaa4, roughness: .9 }),
  dog: new THREE.MeshStandardMaterial({ color: 0xc99668, roughness: .92 }), dogLight: new THREE.MeshStandardMaterial({ color: 0xe7d2b1, roughness: .92 }), dogDark: new THREE.MeshStandardMaterial({ color: 0x705343, roughness: .92 }),
  cat: new THREE.MeshStandardMaterial({ color: 0xd7ad75, roughness: .92 }), catStripe: new THREE.MeshStandardMaterial({ color: 0x9d704c, roughness: .92 }),
  eye: new THREE.MeshStandardMaterial({ color: 0x172a30, roughness: .6 }), antler: new THREE.MeshStandardMaterial({ color: 0xd8c39f, roughness: 1 }),
};
function wildlifePart(parent, geometry, material, position, scale, rotation = [0, 0, 0]) {
  const mesh = new THREE.Mesh(geometry, material); mesh.position.set(...position); mesh.scale.set(...scale); mesh.rotation.set(...rotation); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
function makeAnimal(type, x, z, phase) {
  const root = new THREE.Group(), pose = new THREE.Group(); root.add(pose); root.position.set(x, .015, z); scene.add(root);
  const legs = []; let tail = null, head = null, radius = .7, fleeSpeed = 4.5, wander = 3;
  const leg = (material, px, py, pz, sx, sy, sz) => { const part = wildlifePart(pose, wildlifeBox, material, [px, py, pz], [sx, sy, sz]); legs.push(part); return part; };
  if (type === 'deer') {
    radius = 1.12; fleeSpeed = 7.2; wander = 5.5;
    wildlifePart(pose, wildlifeSphere, wildlifeMaterials.deer, [0, 1.62, 0], [.72, .57, 1.23]);
    wildlifePart(pose, wildlifeCylinder, wildlifeMaterials.deer, [0, 2.16, .78], [.32, .93, .32], [.35, 0, 0]);
    head = wildlifePart(pose, wildlifeSphere, wildlifeMaterials.deer, [0, 2.56, 1.12], [.43, .43, .67]);
    wildlifePart(pose, wildlifeSphere, wildlifeMaterials.deerLight, [0, 2.39, 1.63], [.3, .24, .33]);
    for (const side of [-1, 1]) {
      leg(wildlifeMaterials.deer, side * .45, .75, .68, .16, 1.44, .18); leg(wildlifeMaterials.deer, side * .45, .75, -.66, .16, 1.44, .18);
      wildlifePart(pose, wildlifeCone, wildlifeMaterials.deerLight, [side * .32, 2.91, 1.1], [.18, .47, .14], [0, 0, side * -.35]);
      wildlifePart(pose, wildlifeCylinder, wildlifeMaterials.antler, [side * .3, 3.1, .97], [.045, .88, .045], [0, 0, side * -.27]);
      wildlifePart(pose, wildlifeCylinder, wildlifeMaterials.antler, [side * .47, 3.22, .96], [.038, .4, .038], [0, 0, side * .68]);
      wildlifePart(pose, wildlifeSphere, wildlifeMaterials.eye, [side * .33, 2.61, 1.55], [.055, .055, .04]);
    }
    tail = wildlifePart(pose, wildlifeCone, wildlifeMaterials.deerLight, [0, 1.72, -1.13], [.18, .42, .18], [-1.25, 0, 0]);
  } else if (type === 'rabbit') {
    radius = .59; fleeSpeed = 5.1; wander = 2.7;
    wildlifePart(pose, wildlifeSphere, wildlifeMaterials.rabbit, [0, .52, -.02], [.48, .42, .68]);
    head = wildlifePart(pose, wildlifeSphere, wildlifeMaterials.rabbit, [0, .83, .49], [.37, .34, .39]);
    for (const side of [-1, 1]) {
      wildlifePart(pose, wildlifeBox, wildlifeMaterials.rabbit, [side * .18, 1.23, .44], [.16, .64, .15], [side * .05, 0, side * -.1]);
      wildlifePart(pose, wildlifeBox, wildlifeMaterials.rabbitPink, [side * .18, 1.23, .524], [.075, .43, .015], [side * .05, 0, side * -.1]);
      leg(wildlifeMaterials.rabbit, side * .27, .2, .28, .19, .23, .38); leg(wildlifeMaterials.rabbit, side * .28, .23, -.35, .22, .28, .45);
      wildlifePart(pose, wildlifeSphere, wildlifeMaterials.eye, [side * .25, .88, .79], [.046, .046, .028]);
    }
    wildlifePart(pose, wildlifeSphere, wildlifeMaterials.rabbitPink, [0, .75, .84], [.06, .045, .035]); tail = wildlifePart(pose, wildlifeSphere, wildlifeMaterials.rabbit, [0, .57, -.65], [.2, .2, .2]);
  } else if (type === 'dog') {
    radius = .84; fleeSpeed = 5.6; wander = 4.1;
    wildlifePart(pose, wildlifeSphere, wildlifeMaterials.dog, [0, .84, 0], [.53, .46, .85]);
    head = wildlifePart(pose, wildlifeSphere, wildlifeMaterials.dog, [0, 1.25, .68], [.43, .4, .48]); wildlifePart(pose, wildlifeSphere, wildlifeMaterials.dogLight, [0, 1.1, 1.09], [.29, .23, .32]);
    for (const side of [-1, 1]) {
      leg(wildlifeMaterials.dog, side * .34, .39, .46, .17, .74, .18); leg(wildlifeMaterials.dog, side * .34, .39, -.48, .17, .74, .18);
      wildlifePart(pose, wildlifeBox, wildlifeMaterials.dogDark, [side * .37, 1.42, .67], [.2, .54, .16], [0, 0, side * .34]); wildlifePart(pose, wildlifeSphere, wildlifeMaterials.eye, [side * .27, 1.31, 1.03], [.05, .05, .03]);
    }
    wildlifePart(pose, wildlifeSphere, wildlifeMaterials.eye, [0, 1.1, 1.37], [.08, .065, .05]); tail = wildlifePart(pose, wildlifeCylinder, wildlifeMaterials.dogDark, [0, 1.01, -.87], [.12, .8, .12], [-.86, 0, 0]);
  } else {
    radius = .68; fleeSpeed = 4.8; wander = 3.2;
    wildlifePart(pose, wildlifeSphere, wildlifeMaterials.cat, [0, .62, 0], [.42, .35, .67]);
    head = wildlifePart(pose, wildlifeSphere, wildlifeMaterials.cat, [0, .92, .55], [.34, .33, .36]);
    for (const side of [-1, 1]) {
      leg(wildlifeMaterials.cat, side * .27, .28, .35, .13, .5, .15); leg(wildlifeMaterials.cat, side * .27, .28, -.37, .13, .5, .15);
      wildlifePart(pose, wildlifeCone, wildlifeMaterials.catStripe, [side * .23, 1.27, .51], [.2, .39, .15], [0, 0, side * -.24]); wildlifePart(pose, wildlifeSphere, wildlifeMaterials.eye, [side * .22, .96, .84], [.047, .047, .028]);
    }
    wildlifePart(pose, wildlifeSphere, wildlifeMaterials.rabbitPink, [0, .82, .87], [.05, .04, .03]); tail = wildlifePart(pose, wildlifeCylinder, wildlifeMaterials.catStripe, [.08, .73, -.69], [.085, .9, .085], [-1.1, 0, .25]);
  }
  return { type, root, pose, legs, tail, head, homeX: x, homeZ: z, phase, radius, fleeSpeed, wander, heading: phase, fleeTimer: 0, injury: 0, critical: false, criticalTimer: 0, hitCooldown: 0 };
}
const wildlife = [
  ['deer', -23, 22], ['deer', 47, -5], ['deer', -17, -23],
  ['rabbit', 17, 29], ['rabbit', -32, -3], ['rabbit', 84, 14], ['rabbit', 54, 29],
  ['dog', -78, -10], ['dog', -87, 18],
  ['cat', -94, 59], ['cat', 16, -20], ['cat', 91, -40],
].map(([type, x, z], index) => makeAnimal(type, x, z, index * 1.31 + .5));
let wildlifeToastTimer = 0, habitatUpdate = 0;
function showWildlifeToast(animal, critical) {
  ui.wildlifeToast.className = `wildlife-toast ${critical ? 'critical' : 'injured'}`;
  ui.wildlifeSymbol.textContent = critical ? '!' : '✦'; ui.wildlifeTitle.textContent = `${animal.type.toUpperCase()} ${critical ? 'LOST' : 'INJURED'}`;
  ui.wildlifeDetail.textContent = critical ? 'CRITICAL IMPACT · BRAKE FOR WILDLIFE' : 'RESTING IN THE MEADOW · SLOW DOWN';
  wildlifeToastTimer = critical ? 4.5 : 3.5;
}
function resetWildlife() {
  for (const animal of wildlife) { animal.root.visible = true; animal.root.position.set(animal.homeX, .015, animal.homeZ); animal.root.scale.setScalar(1); animal.pose.rotation.set(0, 0, 0); animal.fleeTimer = animal.injury = animal.criticalTimer = animal.hitCooldown = 0; animal.critical = false; }
  wildlifeToastTimer = 0; ui.wildlifeToast.classList.add('hidden'); ui.wildlifeCount.textContent = `${wildlife.length}/${wildlife.length}`; ui.habitatStatus.textContent = 'WILDLIFE ACTIVE'; ui.habitatPanel.classList.remove('warning');
}
function updateWildlife(dt, now) {
  const time = now * .001; let nearest = Infinity, nearestType = '', alive = 0;
  for (const animal of wildlife) {
    if (animal.critical) {
      animal.criticalTimer += dt; animal.pose.rotation.z += (-1.42 - animal.pose.rotation.z) * (1 - Math.exp(-dt * 7));
      if (animal.criticalTimer > 1.1) animal.root.scale.setScalar(Math.max(0, 1 - (animal.criticalTimer - 1.1) * .75));
      if (animal.criticalTimer > 2.45) animal.root.visible = false;
      continue;
    }
    alive++; animal.hitCooldown = Math.max(0, animal.hitCooldown - dt);
    const dx = animal.root.position.x - state.x, dz = animal.root.position.z - state.z, distance = Math.hypot(dx, dz);
    if (distance < nearest) { nearest = distance; nearestType = animal.type; }
    if (distance < 10 && state.phase === 'racing' && animal.injury <= 0) animal.fleeTimer = Math.max(animal.fleeTimer, 2.2);
    animal.fleeTimer = Math.max(0, animal.fleeTimer - dt);
    if (distance < activeVehicle.radius + animal.radius && animal.hitCooldown <= 0 && state.phase === 'racing') {
      const impact = Math.abs(state.forward) + Math.abs(state.lateral) * .35; animal.hitCooldown = 1.2;
      if (impact > 22) { animal.critical = true; animal.criticalTimer = 0; showWildlifeToast(animal, true); state.timeLeft = Math.max(0, state.timeLeft - 8); }
      else if (impact > 5) { animal.injury = 8; showWildlifeToast(animal, false); state.timeLeft = Math.max(0, state.timeLeft - 4); }
      else animal.fleeTimer = 3;
      if (impact > 5) { state.vx *= .72; state.vz *= .72; state.collision = Math.max(state.collision, .55); }
    }
    if (animal.critical) continue;
    animal.injury = Math.max(0, animal.injury - dt);
    const resting = animal.injury > 4.5;
    const targetTilt = resting ? -.94 : 0; animal.pose.rotation.z += (targetTilt - animal.pose.rotation.z) * (1 - Math.exp(-dt * 5));
    if (!resting) {
      let targetX, targetZ, pace;
      if (animal.fleeTimer > 0) { const inv = 1 / Math.max(distance, .1); targetX = animal.root.position.x + dx * inv * 10; targetZ = animal.root.position.z + dz * inv * 10; pace = animal.fleeSpeed; }
      else { targetX = animal.homeX + Math.sin(time * .24 + animal.phase) * animal.wander; targetZ = animal.homeZ + Math.cos(time * .19 + animal.phase * 1.3) * animal.wander * .72; pace = animal.injury > 0 ? .55 : 1.2; }
      const tx = targetX - animal.root.position.x, tz = targetZ - animal.root.position.z, remaining = Math.hypot(tx, tz);
      if (remaining > .08) { const step = Math.min(remaining, pace * dt); animal.root.position.x += tx / remaining * step; animal.root.position.z += tz / remaining * step; const desired = Math.atan2(tx, tz), delta = Math.atan2(Math.sin(desired - animal.heading), Math.cos(desired - animal.heading)); animal.heading += delta * (1 - Math.exp(-dt * 7)); }
      animal.root.rotation.y = animal.heading;
      const gait = time * (animal.fleeTimer > 0 ? 15 : 6) + animal.phase; animal.legs.forEach((legPart, index) => { legPart.rotation.x = Math.sin(gait + (index % 2) * Math.PI) * (animal.fleeTimer > 0 ? .34 : .13); });
      if (animal.tail) animal.tail.rotation.y = Math.sin(time * 4 + animal.phase) * .2;
      animal.pose.position.y = animal.type === 'rabbit' ? Math.abs(Math.sin(gait)) * (animal.fleeTimer > 0 ? .24 : .055) : Math.sin(gait * .5) * .025;
    }
  }
  if (wildlifeToastTimer > 0) { wildlifeToastTimer -= dt; if (wildlifeToastTimer <= 0) ui.wildlifeToast.classList.add('hidden'); }
  habitatUpdate -= dt;
  if (habitatUpdate <= 0) { habitatUpdate = .25; ui.wildlifeCount.textContent = `${alive}/${wildlife.length}`; ui.habitatStatus.textContent = nearest < 13 ? `${nearestType.toUpperCase()} NEARBY` : alive < wildlife.length ? 'DRIVE WITH CARE' : 'WILDLIFE ACTIVE'; ui.habitatPanel.classList.toggle('warning', nearest < 13 || alive < wildlife.length); }
}
function updateNature(now) {
  const time = now * .001;
  waterRipples.forEach(({ mesh, phase }) => { const cycle = (time * .34 + phase) % 1; mesh.scale.setScalar(.5 + cycle * 2.8); mesh.material.opacity = (1 - cycle) * .31; });
}

function canvasLabel(text, width = 512, height = 128, background = '#142b39', foreground = '#f8f5ed') {
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = background; ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#ff633c'; ctx.fillRect(0, height - 13, width, 13);
  ctx.fillStyle = foreground; ctx.font = `800 ${Math.round(height * .5)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, width / 2, height * .47);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; return texture;
}

const start = samples[0];
const startYaw = Math.atan2(start.tx, start.tz);
const startGroup = new THREE.Group(); startGroup.position.set(start.x, 0, start.z); startGroup.rotation.y = startYaw;
const checkerBlack = new THREE.MeshStandardMaterial({ color: 0x17262d, roughness: 1 });
const checkerWhite = new THREE.MeshStandardMaterial({ color: 0xf2eee2, roughness: 1 });
for (let row = 0; row < 2; row++) for (let col = 0; col < 12; col++) {
  const tile = new THREE.Mesh(new THREE.BoxGeometry(TRACK_WIDTH / 12, .015, .72), (row + col) % 2 ? checkerBlack : checkerWhite);
  tile.position.set((col - 5.5) * TRACK_WIDTH / 12, .067, (row - .5) * .72); tile.receiveShadow = true; startGroup.add(tile);
}
const gateMat = new THREE.MeshStandardMaterial({ color: 0x314957, metalness: .42, roughness: .58 });
for (const side of [-1, 1]) {
  const post = new THREE.Mesh(new THREE.BoxGeometry(.55, 9.4, .6), gateMat); post.position.set(side * (TRACK_WIDTH / 2 + 1.95), 4.7, 0); post.castShadow = true; startGroup.add(post);
  const foot = new THREE.Mesh(new THREE.BoxGeometry(1.4, .5, 1.6), new THREE.MeshStandardMaterial({ color: 0xe8573a, roughness: .8 })); foot.position.set(side * (TRACK_WIDTH / 2 + 1.95), .25, 0); foot.castShadow = true; startGroup.add(foot);
}
const beam = new THREE.Mesh(new THREE.BoxGeometry(TRACK_WIDTH + 4.45, 1.45, .65), new THREE.MeshStandardMaterial({ map: canvasLabel('APEX CIRCUIT'), roughness: .7 }));
beam.position.set(0, 9.2, 0); beam.castShadow = true; startGroup.add(beam); scene.add(startGroup);

// A small grandstand and flags make the start/finish area feel intentional.
const stand = new THREE.Group(); stand.position.set(start.x - start.rx * 15, 0, start.z - start.rz * 15); stand.rotation.y = startYaw;
const concrete = new THREE.MeshStandardMaterial({ color: 0xc6c6b6, roughness: .95 });
for (let i = 0; i < 5; i++) {
  const tier = new THREE.Mesh(new THREE.BoxGeometry(19, .65, 2.2), concrete); tier.position.set(0, .45 + i * .63, -i * 1.8); tier.castShadow = true; tier.receiveShadow = true; stand.add(tier);
}
const roof = new THREE.Mesh(new THREE.BoxGeometry(20.2, .28, 10.5), new THREE.MeshStandardMaterial({ color: 0xe35d40, roughness: .75 })); roof.position.set(0, 6.7, -3.8); roof.castShadow = true; stand.add(roof);
for (const x of [-9, 9]) for (const z of [0, -7]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(.16, .16, 6.7, 6), gateMat); p.position.set(x, 3.35, z); p.castShadow = true; stand.add(p); }
const spectators = new THREE.InstancedMesh(new THREE.BoxGeometry(.42, .7, .35), new THREE.MeshStandardMaterial({ color: 0xeacb8e, roughness: 1 }), 65);
for (let i = 0; i < 65; i++) { const tier = i % 5; dummy.position.set((random() - .5) * 17.5, 1.1 + tier * .63, -tier * 1.8 + (random() - .5) * .5); dummy.rotation.set(0, random() * .4 - .2, 0); dummy.scale.set(.75 + random() * .5, .8 + random() * .4, 1); dummy.updateMatrix(); spectators.setMatrixAt(i, dummy.matrix); spectators.setColorAt(i, new THREE.Color([0xf1b36d, 0xe7684e, 0x76a9a3, 0xf0e5c6, 0x3e6372][i % 5])); }
spectators.castShadow = true; stand.add(spectators); scene.add(stand);

function roundedBox(width, height, depth, radius, material) {
  const x = width / 2 - radius, y = height / 2 - radius;
  const shape = new THREE.Shape();
  shape.moveTo(-x, -height / 2); shape.lineTo(x, -height / 2); shape.quadraticCurveTo(width / 2, -height / 2, width / 2, -y);
  shape.lineTo(width / 2, y); shape.quadraticCurveTo(width / 2, height / 2, x, height / 2); shape.lineTo(-x, height / 2); shape.quadraticCurveTo(-width / 2, height / 2, -width / 2, y); shape.lineTo(-width / 2, -y); shape.quadraticCurveTo(-width / 2, -height / 2, -x, -height / 2);
  const extrudeDepth = Math.max(.02, depth - radius * 2);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: extrudeDepth, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: radius * .55, bevelThickness: radius, curveSegments: 4 });
  geometry.translate(0, 0, -extrudeDepth / 2);
  return new THREE.Mesh(geometry, material);
}

// A quiet, cyan-lit maker monument sits in the circuit's open infield.
const MONUMENT = { x: 0, z: 0, promptRadius: 12.5 };
const monument = new THREE.Group();
monument.position.set(MONUMENT.x, 0, MONUMENT.z);
monument.rotation.y = Math.atan2(start.x - MONUMENT.x, start.z - MONUMENT.z);
scene.add(monument);
const monumentStone = new THREE.MeshStandardMaterial({ color: 0x162b35, metalness: .48, roughness: .62 });
const monumentEdge = new THREE.MeshStandardMaterial({ color: 0x35515d, metalness: .64, roughness: .45 });
const monumentDark = new THREE.MeshStandardMaterial({ color: 0x081820, metalness: .32, roughness: .76 });
const monumentGlow = new THREE.MeshStandardMaterial({ color: 0x45e3da, emissive: 0x16c8c0, emissiveIntensity: 1.8, metalness: .28, roughness: .34 });
const monumentGlass = new THREE.MeshBasicMaterial({ color: 0x48e8df, transparent: true, opacity: .18, depthWrite: false, side: THREE.DoubleSide });
function monumentMesh(geometry, material, x, y, z, cast = true) {
  const mesh = new THREE.Mesh(geometry, material); mesh.position.set(x, y, z); mesh.castShadow = cast; mesh.receiveShadow = true; monument.add(mesh); return mesh;
}
const plaza = monumentMesh(new THREE.CircleGeometry(10.3, 64), monumentDark, 0, .024, 0, false); plaza.rotation.x = -Math.PI / 2;
for (const [radius, width, material] of [[9.55, .065, monumentGlow], [7.05, .035, monumentEdge], [3.75, .055, monumentGlow]]) {
  const ring = monumentMesh(new THREE.TorusGeometry(radius, width, 7, 64), material, 0, .052, 0, false); ring.rotation.x = Math.PI / 2;
}
for (let i = 0; i < 16; i++) {
  const angle = i / 16 * TAU, radius = i % 2 ? 8.28 : 8.45;
  const marker = monumentMesh(new THREE.BoxGeometry(i % 2 ? .11 : .18, .025, i % 2 ? .78 : 1.2), i % 2 ? monumentEdge : monumentGlow, Math.sin(angle) * radius, .06, Math.cos(angle) * radius, false);
  marker.rotation.y = angle;
}
monumentMesh(new THREE.CylinderGeometry(3.18, 3.52, 1.15, 10), monumentStone, 0, .61, 0);
monumentMesh(new THREE.CylinderGeometry(2.65, 3.12, .52, 10), monumentEdge, 0, 1.43, 0);
monumentMesh(new THREE.CylinderGeometry(2.48, 2.62, .23, 10), monumentDark, 0, 1.81, 0);
const pedestalBand = monumentMesh(new THREE.TorusGeometry(3.23, .055, 7, 64), monumentGlow, 0, .94, 0, false); pedestalBand.rotation.x = Math.PI / 2;

const robe = monumentMesh(new THREE.CylinderGeometry(.68, 1.36, 2.55, 8), monumentStone, 0, 3.19, 0);
robe.rotation.y = Math.PI / 8;
const shoulders = monumentMesh(new THREE.SphereGeometry(1.05, 10, 8), monumentEdge, 0, 4.22, -.02); shoulders.scale.set(1.23, .63, .7);
const hackerHood = monumentMesh(new THREE.SphereGeometry(1.19, 12, 9), monumentStone, 0, 5.06, -.06); hackerHood.scale.set(1, 1.07, .83);
const face = monumentMesh(new THREE.CircleGeometry(.72, 24), monumentDark, 0, 5.03, .945, false);
const eye = monumentMesh(new THREE.BoxGeometry(1.0, .075, .04), monumentGlow, 0, 5.14, .972, false);
const mask = monumentMesh(new THREE.BoxGeometry(.63, .25, .045), monumentDark, 0, 4.82, .966, false);
function monumentLimb(a, b, radius, material) {
  const direction = b.clone().sub(a), mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius * .82, radius, direction.length(), 8), material);
  mesh.position.copy(a).add(b).multiplyScalar(.5); mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()); mesh.castShadow = true; mesh.receiveShadow = true; monument.add(mesh); return mesh;
}
for (const side of [-1, 1]) {
  monumentLimb(new THREE.Vector3(side * .9, 4.12, .07), new THREE.Vector3(side * .46, 3.75, .93), .28, monumentStone);
  monumentMesh(new THREE.SphereGeometry(.28, 9, 7), monumentEdge, side * .43, 3.74, .95);
  monumentMesh(new THREE.BoxGeometry(.7, .22, 1.03), monumentDark, side * .55, 1.98, .45);
}
const laptopBase = roundedBox(1.92, 1.08, .13, .06, monumentEdge); laptopBase.rotation.x = -Math.PI / 2; laptopBase.position.set(0, 3.65, 1.04); laptopBase.castShadow = true; monument.add(laptopBase);
const keyboard = monumentMesh(new THREE.PlaneGeometry(1.48, .66), monumentDark, 0, 3.725, 1.1, false); keyboard.rotation.x = -Math.PI / 2;
const screenGroup = new THREE.Group(); screenGroup.position.set(0, 3.72, .62); screenGroup.rotation.x = -.13; monument.add(screenGroup);
const screenBack = roundedBox(1.92, 1.02, .09, .055, monumentEdge); screenBack.position.y = .51; screenBack.castShadow = true; screenGroup.add(screenBack);
const terminalCanvas = document.createElement('canvas'); terminalCanvas.width = 512; terminalCanvas.height = 256;
const terminalCtx = terminalCanvas.getContext('2d');
terminalCtx.fillStyle = '#081820'; terminalCtx.fillRect(0, 0, 512, 256);
terminalCtx.fillStyle = '#47e7dd'; terminalCtx.font = 'bold 48px monospace'; terminalCtx.fillText('>_', 34, 68);
terminalCtx.fillStyle = '#7cc7c5'; terminalCtx.font = '20px monospace';
['const maker = "YOGESH";', 'build(world);', 'while (curious) learn();'].forEach((line, i) => terminalCtx.fillText(line, 34, 117 + i * 37));
terminalCtx.fillStyle = '#ff704c'; terminalCtx.fillRect(34, 220, 128, 5); terminalCtx.fillStyle = '#23464d'; terminalCtx.fillRect(174, 220, 302, 5);
const terminalTexture = new THREE.CanvasTexture(terminalCanvas); terminalTexture.colorSpace = THREE.SRGBColorSpace;
const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.73, .83), new THREE.MeshBasicMaterial({ map: terminalTexture })); screen.position.set(0, .51, .058); screenGroup.add(screen);
const plaque = new THREE.Mesh(new THREE.PlaneGeometry(3.45, .73), new THREE.MeshStandardMaterial({ map: canvasLabel('YOGESH GIRI', 512, 128, '#0a202a', '#55e8df'), emissive: 0x103b40, emissiveIntensity: .5, roughness: .65 })); plaque.position.set(0, .69, 3.32); monument.add(plaque);

const codeHalo = monumentMesh(new THREE.TorusGeometry(1.75, .075, 8, 48), monumentGlow, 0, 5.09, -.36, false);
const beacon = monumentMesh(new THREE.CylinderGeometry(.16, .66, 14.5, 16, 1, true), monumentGlass, 0, 8.9, 0, false);
const beaconCore = monumentMesh(new THREE.CylinderGeometry(.045, .045, 16, 8), monumentGlow, 0, 9.4, 0, false);
const orbit = new THREE.Group(); orbit.position.y = 6.92; monument.add(orbit);
const orbitNodes = [];
for (let i = 0; i < 8; i++) {
  const angle = i / 8 * TAU, node = new THREE.Mesh(new THREE.OctahedronGeometry(i % 2 ? .18 : .27, 0), i % 2 ? monumentEdge : monumentGlow);
  node.position.set(Math.sin(angle) * 2.25, Math.sin(angle * 2) * .25, Math.cos(angle) * 2.25); orbit.add(node); orbitNodes.push(node);
}
const monumentLight = new THREE.PointLight(0x43e5dc, 8, 27, 2); monumentLight.position.set(0, 5.1, 1); monument.add(monumentLight);

const car = new THREE.Group();
const visual = new THREE.Group(); car.add(visual); scene.add(car);
const paint = new THREE.MeshPhysicalMaterial({ color: 0xf05b3d, metalness: .42, roughness: .27, clearcoat: .75, clearcoatRoughness: .22 });
const dark = new THREE.MeshStandardMaterial({ color: 0x172831, metalness: .42, roughness: .48 });
const glass = new THREE.MeshPhysicalMaterial({ color: 0x274b5c, metalness: .38, roughness: .16, clearcoat: 1 });
const trim = new THREE.MeshStandardMaterial({ color: 0xc8d3d0, metalness: .82, roughness: .27 });
const chassis = roundedBox(1.95, .48, 4.15, .17, paint); chassis.position.y = .68; visual.add(chassis);
const lower = roundedBox(1.84, .24, 3.96, .11, dark); lower.position.y = .43; visual.add(lower);
const hood = roundedBox(1.78, .32, 1.65, .13, paint); hood.position.set(0, .91, 1.13); hood.rotation.x = -.035; visual.add(hood);
const rearDeck = roundedBox(1.77, .31, 1.2, .12, paint); rearDeck.position.set(0, .9, -1.42); visual.add(rearDeck);
const cabin = roundedBox(1.53, .68, 1.85, .18, glass); cabin.position.set(0, 1.22, -.05); visual.add(cabin);
const roofCar = roundedBox(1.47, .17, 1.27, .12, paint); roofCar.position.set(0, 1.59, -.12); visual.add(roofCar);
const windshieldFrame = new THREE.Mesh(new THREE.BoxGeometry(1.55, .08, .08), trim); windshieldFrame.position.set(0, 1.44, .87); visual.add(windshieldFrame);
for (const side of [-1, 1]) {
  const sill = new THREE.Mesh(new THREE.BoxGeometry(.09, .16, 3.2), dark); sill.position.set(side * .98, .55, 0); visual.add(sill);
  const mirror = roundedBox(.25, .16, .32, .05, paint); mirror.position.set(side * 1.04, 1.18, .49); visual.add(mirror);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(.012, .065, 1.65), trim); stripe.position.set(side * .985, .8, -.07); visual.add(stripe);
}
const grille = new THREE.Mesh(new THREE.BoxGeometry(1.35, .24, .06), dark); grille.position.set(0, .63, 2.1); visual.add(grille);
const splitter = new THREE.Mesh(new THREE.BoxGeometry(1.85, .08, .34), dark); splitter.position.set(0, .39, 2.04); visual.add(splitter);
const rearDiffuser = new THREE.Mesh(new THREE.BoxGeometry(1.73, .15, .2), dark); rearDiffuser.position.set(0, .45, -2.06); visual.add(rearDiffuser);
const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.68, .12, .45), paint); spoiler.position.set(0, 1.24, -1.91); visual.add(spoiler);
for (const side of [-.62, .62]) { const support = new THREE.Mesh(new THREE.BoxGeometry(.1, .35, .13), dark); support.position.set(side, 1.08, -1.91); visual.add(support); }
const headlightMat = new THREE.MeshStandardMaterial({ color: 0xfff0c5, emissive: 0xffdda0, emissiveIntensity: .75, roughness: .25 });
const brakeMat = new THREE.MeshStandardMaterial({ color: 0x8c241e, emissive: 0xff2b19, emissiveIntensity: .2, roughness: .3 });
for (const side of [-1, 1]) {
  const head = new THREE.Mesh(new THREE.BoxGeometry(.48, .16, .055), headlightMat); head.position.set(side * .61, .82, 2.105); visual.add(head);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(.55, .15, .055), brakeMat); tail.position.set(side * .58, .78, -2.1); visual.add(tail);
  const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(.075, .075, .22, 10), trim); exhaust.rotation.x = Math.PI / 2; exhaust.position.set(side * .57, .43, -2.12); visual.add(exhaust);
}
const wheelPivots = [], wheelSpins = [];
const tireMat = new THREE.MeshStandardMaterial({ color: 0x1a2023, roughness: .92 });
const rimMat = new THREE.MeshStandardMaterial({ color: 0xbfc8c4, metalness: .82, roughness: .26 });
for (const z of [1.34, -1.34]) for (const x of [-.96, .96]) {
  const pivot = new THREE.Group(); pivot.position.set(x, .47, z); visual.add(pivot);
  const spin = new THREE.Group(); pivot.add(spin);
  const tire = new THREE.Mesh(new THREE.CylinderGeometry(.43, .43, .31, 16), tireMat); tire.rotation.z = Math.PI / 2; spin.add(tire);
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(.27, .27, .325, 12), rimMat); rim.rotation.z = Math.PI / 2; spin.add(rim);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(.11, .11, .34, 10), dark); hub.rotation.z = Math.PI / 2; spin.add(hub);
  wheelPivots.push({ pivot, front: z > 0 }); wheelSpins.push(spin);
}
visual.traverse(object => { if (object.isMesh) { object.castShadow = true; object.receiveShadow = true; } });

const rigs = {
  apex: { group: visual, wheelPivots, wheelSpins, brakeMaterials: [brakeMat], wheelRadius: .43, animations: {} },
};
const VEHICLES = [
  { id: 'apex', name: 'Apex GT', shortName: 'Apex GT', category: 'Sport', description: 'Balanced circuit coupe', color: '#f05b3d', maxSpeed: 46, accel: 25, brake: 39, grip: 8.7, turn: 1.62, reverse: 12, radius: 1.04, camera: 8.6, drift: 2.05 },
  { id: 'lamborghini', name: 'Lamborghini-inspired V12', shortName: 'V12 Supercar', category: 'Supercar', description: 'Low, sharp and very quick', color: '#b7de37', maxSpeed: 54, accel: 31, brake: 43, grip: 9.5, turn: 1.76, reverse: 12, radius: 1.08, camera: 9.1, drift: 2.25 },
  { id: 'scorpio', name: 'Mahindra Scorpio-N inspired', shortName: 'Scorpio-N style', category: 'SUV', description: 'Tall, planted road SUV', color: '#426987', maxSpeed: 40, accel: 21, brake: 36, grip: 7.7, turn: 1.42, reverse: 11, radius: 1.18, camera: 9.9, drift: 1.75 },
  { id: 'thar', name: 'Mahindra Thar inspired', shortName: 'Thar style', category: 'Off-road', description: 'Short wheelbase trail icon', color: '#d49845', maxSpeed: 37, accel: 22, brake: 35, grip: 7.1, turn: 1.72, reverse: 11, radius: 1.16, camera: 9.5, drift: 1.55 },
  { id: 'bicycle', name: 'Sprint Bicycle', shortName: 'Sprint Bicycle', category: 'Human-powered', description: 'Light, nimble pedal racer', color: '#60b8b1', maxSpeed: 16, accel: 10, brake: 20, grip: 11, turn: 2.05, reverse: 4, radius: .57, camera: 6.7, drift: 4.2 },
  { id: 'tanga', name: 'Heritage Tanga', shortName: 'Heritage Tanga', category: 'Heritage', description: 'Horse-drawn carriage', color: '#a96a46', maxSpeed: 18, accel: 8.5, brake: 18, grip: 7.6, turn: 1.28, reverse: 4, radius: 1.08, camera: 10.8, drift: 3.4 },
  { id: 'truck', name: 'Freight Truck', shortName: 'Freight Truck', category: 'Heavy', description: 'Six-wheel cargo hauler', color: '#e1a64e', maxSpeed: 30, accel: 13, brake: 28, grip: 6.9, turn: 1.05, reverse: 8, radius: 1.25, camera: 11.6, drift: 1.45 },
  { id: 'plane', name: 'Track Aeroplane', shortName: 'Track Aeroplane', category: 'Air', description: 'Propeller-powered low flyer', color: '#e8e6d7', maxSpeed: 56, accel: 27, brake: 34, grip: 7.4, turn: 1.28, reverse: 7, radius: 3.2, camera: 12.2, drift: 2.5 },
];
let activeVehicle = VEHICLES[0];
let activeRig = rigs.apex;

function makePaint(color) { return new THREE.MeshPhysicalMaterial({ color, metalness: .38, roughness: .3, clearcoat: .72, clearcoatRoughness: .24 }); }
function newRig(id, wheelRadius = .43) {
  const group = new THREE.Group(); group.visible = false; car.add(group);
  const rig = { group, wheelPivots: [], wheelSpins: [], brakeMaterials: [], wheelRadius, animations: {} }; rigs[id] = rig; return rig;
}
function addPart(group, geometry, material, x, y, z, rx = 0, ry = 0, rz = 0) {
  const mesh = new THREE.Mesh(geometry, material); mesh.position.set(x, y, z); mesh.rotation.set(rx, ry, rz); group.add(mesh); return mesh;
}
function addBox(group, material, size, position, rotation = [0, 0, 0]) { return addPart(group, new THREE.BoxGeometry(...size), material, ...position, ...rotation); }
function addRounded(group, material, size, position, radius = .1, rotation = [0, 0, 0]) {
  const mesh = roundedBox(...size, radius, material); mesh.position.set(...position); mesh.rotation.set(...rotation); group.add(mesh); return mesh;
}
function addWheel(rig, x, y, z, radius, width, front = false) {
  const pivot = new THREE.Group(); pivot.position.set(x, y, z); rig.group.add(pivot);
  const spin = new THREE.Group(); pivot.add(spin);
  addPart(spin, new THREE.CylinderGeometry(radius, radius, width, 16), tireMat, 0, 0, 0, 0, 0, Math.PI / 2);
  addPart(spin, new THREE.CylinderGeometry(radius * .61, radius * .61, width + .015, 12), rimMat, 0, 0, 0, 0, 0, Math.PI / 2);
  addPart(spin, new THREE.CylinderGeometry(radius * .22, radius * .22, width + .025, 10), dark, 0, 0, 0, 0, 0, Math.PI / 2);
  rig.wheelPivots.push({ pivot, front }); rig.wheelSpins.push(spin); return pivot;
}
function addRoadLights(rig, width, frontZ, rearZ, y, headWidth = .4) {
  const tailMaterial = new THREE.MeshStandardMaterial({ color: 0x8c241e, emissive: 0xff2b19, emissiveIntensity: .2, roughness: .3 }); rig.brakeMaterials.push(tailMaterial);
  for (const side of [-1, 1]) {
    addBox(rig.group, headlightMat, [headWidth, .15, .06], [side * width, y, frontZ]);
    addBox(rig.group, tailMaterial, [headWidth, .15, .06], [side * width, y, rearZ]);
  }
}
function finishRig(rig) { rig.group.traverse(object => { if (object.isMesh) { object.castShadow = true; object.receiveShadow = true; } }); }

// The supercar is a deliberately low wedge, not a copied manufacturer mesh or logo.
{
  const rig = newRig('lamborghini', .41), lime = makePaint(0xb7de37);
  addRounded(rig.group, lime, [2.08, .34, 4.45], [0, .57, 0], .14);
  addRounded(rig.group, dark, [1.98, .18, 4.4], [0, .37, 0], .08);
  addRounded(rig.group, lime, [1.94, .24, 1.72], [0, .76, 1.2], .09, [-.075, 0, 0]);
  addRounded(rig.group, glass, [1.54, .51, 1.64], [0, 1.03, -.03], .15);
  addRounded(rig.group, lime, [1.5, .13, 1.13], [0, 1.31, -.14], .08);
  addBox(rig.group, dark, [1.9, .09, .4], [0, .32, 2.2]);
  addBox(rig.group, dark, [1.62, .2, .08], [0, .53, 2.24]);
  addBox(rig.group, lime, [1.8, .11, .42], [0, 1.04, -2.04]);
  for (const side of [-.66, .66]) addBox(rig.group, dark, [.09, .28, .12], [side, .91, -2.04]);
  for (const side of [-1, 1]) { addBox(rig.group, dark, [.06, .13, 1.25], [side * 1.035, .55, -.4]); addRounded(rig.group, lime, [.24, .14, .3], [side * 1.1, 1.01, .45], .04); }
  addRoadLights(rig, .69, 2.25, -2.24, .69, .48);
  for (const z of [1.42, -1.42]) for (const x of [-1.02, 1.02]) addWheel(rig, x, .43, z, .41, .31, z > 0);
  finishRig(rig);
}

// Two SUV interpretations share a robust ladder-frame stance but have distinct profiles.
{
  const rig = newRig('scorpio', .48), blue = makePaint(0x426987);
  addRounded(rig.group, blue, [2.1, .64, 4.55], [0, .8, 0], .16);
  addRounded(rig.group, dark, [2.03, .24, 4.5], [0, .43, 0], .1);
  addRounded(rig.group, glass, [1.83, .85, 2.6], [0, 1.45, -.08], .14);
  addRounded(rig.group, blue, [1.89, .18, 2.45], [0, 1.91, -.1], .08);
  addRounded(rig.group, blue, [1.98, .35, 1.4], [0, 1.12, 1.44], .1);
  addBox(rig.group, dark, [1.63, .36, .07], [0, .94, 2.31]);
  for (let i = -3; i <= 3; i++) addBox(rig.group, trim, [.055, .29, .075], [i * .21, .94, 2.355]);
  for (const side of [-1, 1]) { addBox(rig.group, trim, [.06, .07, 2.28], [side * .81, 2.03, -.1]); addRounded(rig.group, blue, [.27, .18, .35], [side * 1.13, 1.43, .59], .05); }
  addRoadLights(rig, .72, 2.31, -2.31, 1.08, .42);
  for (const z of [1.49, -1.49]) for (const x of [-1.04, 1.04]) addWheel(rig, x, .51, z, .48, .34, z > 0);
  finishRig(rig);
}
{
  const rig = newRig('thar', .53), ochre = makePaint(0xd49845), roofMat = new THREE.MeshStandardMaterial({ color: 0x232c2d, roughness: .83 });
  addRounded(rig.group, ochre, [2.02, .63, 3.78], [0, .82, 0], .11);
  addRounded(rig.group, dark, [1.94, .23, 3.72], [0, .44, 0], .07);
  addBox(rig.group, glass, [1.72, .79, 2.06], [0, 1.46, -.28]);
  addRounded(rig.group, roofMat, [1.84, .2, 2.18], [0, 1.91, -.28], .08);
  addRounded(rig.group, ochre, [1.86, .32, 1.2], [0, 1.12, 1.24], .08);
  addBox(rig.group, dark, [1.61, .36, .08], [0, .97, 1.92]);
  for (let i = -3; i <= 3; i++) addBox(rig.group, trim, [.055, .29, .09], [i * .19, .97, 1.97]);
  for (const side of [-1, 1]) for (const z of [1.2, -1.17]) addRounded(rig.group, roofMat, [.29, .25, .8], [side * 1.01, .76, z], .06);
  addPart(rig.group, new THREE.CylinderGeometry(.48, .48, .22, 16), tireMat, 0, 1.11, -2.02, Math.PI / 2, 0, 0);
  addPart(rig.group, new THREE.CylinderGeometry(.25, .25, .235, 12), rimMat, 0, 1.11, -2.035, Math.PI / 2, 0, 0);
  addRoadLights(rig, .68, 1.94, -1.9, 1.12, .34);
  for (const z of [1.22, -1.22]) for (const x of [-1.01, 1.01]) addWheel(rig, x, .55, z, .53, .37, z > 0);
  finishRig(rig);
}

function tube(group, a, b, radius, material) {
  const from = new THREE.Vector3(...a), to = new THREE.Vector3(...b), direction = to.clone().sub(from);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, direction.length(), 8), material); mesh.position.copy(from).add(to).multiplyScalar(.5); mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()); group.add(mesh); return mesh;
}
{
  const rig = newRig('bicycle', .55), teal = makePaint(0x60b8b1), skin = new THREE.MeshStandardMaterial({ color: 0xc98d67, roughness: .88 }), jersey = new THREE.MeshStandardMaterial({ color: 0xe96749, roughness: .8 });
  for (const z of [1.05, -1.05]) {
    const pivot = new THREE.Group(); pivot.position.set(0, .59, z); rig.group.add(pivot); const spin = new THREE.Group(); pivot.add(spin);
    addPart(spin, new THREE.TorusGeometry(.53, .055, 6, 20), tireMat, 0, 0, 0, 0, Math.PI / 2, 0);
    addPart(spin, new THREE.TorusGeometry(.45, .022, 5, 20), rimMat, 0, 0, 0, 0, Math.PI / 2, 0);
    for (let i = 0; i < 8; i++) addBox(spin, trim, [.018, .91, .018], [0, 0, 0], [i * Math.PI / 8, 0, 0]);
    addPart(spin, new THREE.CylinderGeometry(.055, .055, .14, 8), dark, 0, 0, 0, 0, 0, Math.PI / 2);
    rig.wheelPivots.push({ pivot, front: z > 0 }); rig.wheelSpins.push(spin);
  }
  tube(rig.group, [0, .62, -1.05], [0, 1.12, -.24], .045, teal); tube(rig.group, [0, 1.12, -.24], [0, .67, .24], .045, teal); tube(rig.group, [0, .67, .24], [0, .62, -1.05], .045, teal); tube(rig.group, [0, 1.12, -.24], [0, 1.18, .63], .045, teal); tube(rig.group, [0, 1.18, .63], [0, .59, 1.05], .045, teal); tube(rig.group, [0, .67, .24], [0, 1.18, .63], .045, teal);
  addBox(rig.group, dark, [.34, .08, .24], [0, 1.24, -.29]); addBox(rig.group, dark, [.52, .045, .07], [0, 1.36, .68]);
  tube(rig.group, [0, 1.26, -.28], [0, 1.86, .03], .14, jersey); addPart(rig.group, new THREE.SphereGeometry(.19, 10, 8), skin, 0, 2.08, .16); addPart(rig.group, new THREE.SphereGeometry(.205, 10, 8), dark, 0, 2.17, .13);
  tube(rig.group, [-.12, 1.78, .09], [-.25, 1.38, .66], .07, skin); tube(rig.group, [.12, 1.78, .09], [.25, 1.38, .66], .07, skin);
  const pedal = new THREE.Group(); pedal.position.set(0, .68, .23); rig.group.add(pedal); addBox(pedal, dark, [.06, .48, .06], [0, 0, 0]); addBox(pedal, trim, [.36, .06, .09], [0, .24, 0]); rig.animations.pedal = pedal;
  tube(rig.group, [-.09, 1.22, -.25], [-.12, .74, .15], .075, dark); tube(rig.group, [.09, 1.22, -.25], [.12, .74, .3], .075, dark);
  finishRig(rig);
}

{
  const rig = newRig('tanga', .62), wood = new THREE.MeshStandardMaterial({ color: 0x8e5d3e, roughness: .92 }), leather = new THREE.MeshStandardMaterial({ color: 0x744331, roughness: .9 }), horse = new THREE.MeshStandardMaterial({ color: 0x88593e, roughness: .95 });
  addBox(rig.group, wood, [1.72, .22, 2.35], [0, .85, -.78]); addBox(rig.group, leather, [1.54, .27, .63], [0, 1.21, -.72]); addBox(rig.group, wood, [1.72, .7, .12], [0, 1.26, -1.91]);
  for (const side of [-1, 1]) { addBox(rig.group, wood, [.1, .73, 2.32], [side * .83, 1.26, -.79]); addBox(rig.group, wood, [.08, .08, 3.1], [side * .52, .94, .68]); }
  for (const side of [-1, 1]) addWheel(rig, side * .95, .65, -.7, .62, .18, false);
  addRounded(rig.group, horse, [.72, .84, 1.64], [0, 1.42, 1.32], .14); addRounded(rig.group, horse, [.44, .71, .75], [0, 1.87, 2.12], .12, [-.35, 0, 0]); addRounded(rig.group, horse, [.4, .43, .76], [0, 2.15, 2.5], .1);
  addBox(rig.group, dark, [.18, .31, .07], [0, 2.37, 2.13]); addBox(rig.group, dark, [.08, .48, .08], [0, 1.7, .51], [.36, 0, 0]);
  const legs = [];
  for (const z of [.82, 1.81]) for (const x of [-.25, .25]) { const pivot = new THREE.Group(); pivot.position.set(x, 1.18, z); rig.group.add(pivot); addBox(pivot, horse, [.16, 1.03, .18], [0, -.5, 0]); addBox(pivot, dark, [.19, .13, .22], [0, -1.03, 0]); legs.push(pivot); }
  rig.animations.legs = legs; finishRig(rig);
}

{
  const rig = newRig('truck', .51), yellow = makePaint(0xe1a64e), cargoMat = new THREE.MeshStandardMaterial({ color: 0xddd9c7, roughness: .78, metalness: .16 });
  addRounded(rig.group, dark, [2.22, .3, 5.85], [0, .55, -.15], .09);
  addRounded(rig.group, yellow, [2.18, 1.28, 2.02], [0, 1.32, 1.72], .13);
  addBox(rig.group, glass, [1.91, .59, .06], [0, 1.7, 2.76]); addBox(rig.group, dark, [1.65, .35, .08], [0, .92, 2.78]);
  addRounded(rig.group, cargoMat, [2.12, 1.78, 3.36], [0, 1.5, -1.18], .08);
  for (const side of [-1, 1]) { addBox(rig.group, trim, [.05, .055, 3.32], [side * 1.07, 1.05, -1.18]); addBox(rig.group, trim, [.05, .055, 3.32], [side * 1.07, 1.84, -1.18]); addRounded(rig.group, yellow, [.28, .21, .42], [side * 1.16, 1.58, 2.02], .05); }
  addRoadLights(rig, .76, 2.79, -2.93, 1.04, .42);
  for (const z of [1.82, -.65, -2.02]) for (const x of [-1.1, 1.1]) addWheel(rig, x, .54, z, .51, .34, z > 1);
  finishRig(rig);
}

{
  const rig = newRig('plane', .34), ivory = makePaint(0xe8e6d7), orange = makePaint(0xe86645);
  addPart(rig.group, new THREE.CylinderGeometry(.56, .68, 5.55, 14), ivory, 0, 1.36, 0, Math.PI / 2, 0, 0);
  addPart(rig.group, new THREE.ConeGeometry(.56, 1.05, 14), orange, 0, 1.36, 3.23, Math.PI / 2, 0, 0);
  addRounded(rig.group, glass, [1.05, .5, 1.35], [0, 1.86, .53], .14);
  addBox(rig.group, orange, [6.6, .16, 1.35], [0, 1.25, .05]); addBox(rig.group, ivory, [2.62, .12, .82], [0, 1.53, -2.2]); addBox(rig.group, orange, [.14, 1.25, .88], [0, 2.06, -2.18]);
  for (const side of [-1, 1]) { addBox(rig.group, dark, [.13, .68, .13], [side * .85, .64, .12]); addWheel(rig, side * .85, .35, .12, .34, .2, false); }
  addWheel(rig, 0, .31, -2.1, .28, .14, false);
  const propeller = new THREE.Group(); propeller.position.set(0, 1.36, 3.79); rig.group.add(propeller); addBox(propeller, dark, [.18, 2.38, .09], [0, 0, 0]); addPart(propeller, new THREE.SphereGeometry(.18, 10, 8), trim, 0, 0, .04); rig.animations.propeller = propeller;
  finishRig(rig);
}

// Compact AI field: shared geometry and a sampled path avoid per-frame curve allocations.
const BOT_PROFILES = [
  { id: 'maya', name: 'MAYA', color: 0x42b6b0, lane: -2.05, pace: .79, phase: .2 },
  { id: 'nova', name: 'NOVA', color: 0xe8b84f, lane: 1.95, pace: .75, phase: 2.3 },
  { id: 'kai', name: 'KAI', color: 0x9b82c5, lane: -.25, pace: .72, phase: 4.4 },
];
function nameTexture(name, color) {
  const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 72; const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(11,27,39,.85)'; ctx.fillRect(0, 10, 256, 52); ctx.fillStyle = `#${new THREE.Color(color).getHexString()}`; ctx.fillRect(0, 10, 8, 52); ctx.fillStyle = '#f8f5ed'; ctx.font = '700 31px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(name, 134, 36);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; return texture;
}
function createBot(profile) {
  const group = new THREE.Group(), botPaint = makePaint(profile.color), rig = { group, wheelPivots: [], wheelSpins: [], brakeMaterials: [] };
  addRounded(group, botPaint, [1.9, .43, 4.02], [0, .65, 0], .14); addRounded(group, dark, [1.8, .2, 3.94], [0, .4, 0], .08);
  addRounded(group, glass, [1.48, .61, 1.78], [0, 1.15, -.05], .14); addRounded(group, botPaint, [1.48, .15, 1.2], [0, 1.48, -.12], .08);
  addBox(group, dark, [1.52, .22, .07], [0, .64, 2.04]); addBox(group, botPaint, [1.59, .1, .38], [0, 1.06, -1.88]);
  addRoadLights(rig, .59, 2.04, -2.04, .79, .42);
  for (const z of [1.3, -1.3]) for (const x of [-.94, .94]) addWheel(rig, x, .45, z, .41, .29, z > 0);
  const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: nameTexture(profile.name, profile.color), transparent: true, depthWrite: false })); label.position.set(0, 2.55, 0); label.scale.set(2.5, .7, 1); group.add(label);
  group.traverse(object => { if (object.isMesh) { object.castShadow = true; object.receiveShadow = true; } }); scene.add(group);
  return { ...profile, group, wheelSpins: rig.wheelSpins, progress: 0, speed: 0, wheel: 0, finishTime: Infinity, laneNow: profile.lane };
}
const bots = BOT_PROFILES.map(createBot);
function placeBot(bot) {
  const s = trackAt(bot.progress), lane = bot.laneNow;
  bot.group.position.set(s.x + s.rx * lane, .015, s.z + s.rz * lane); bot.group.rotation.y = Math.atan2(s.tx, s.tz);
  for (const wheel of bot.wheelSpins) wheel.rotation.x = bot.wheel;
}
function resetBots() {
  bots.forEach((bot, index) => { bot.progress = .012 * (bots.length - index); bot.speed = 0; bot.wheel = 0; bot.finishTime = Infinity; bot.laneNow = bot.lane; placeBot(bot); });
}
function updateBots(dt) {
  if (state.phase !== 'racing') return;
  for (const bot of bots) {
    if (!Number.isFinite(bot.finishTime)) {
      const s = trackAt(bot.progress), ahead = samples[(s.index + 7) % SAMPLE_COUNT], bend = 1 - (s.tx * ahead.tx + s.tz * ahead.tz);
      const target = activeVehicle.maxSpeed * bot.pace * (1 - Math.min(.27, bend * 3.5));
      bot.speed += (target - bot.speed) * (1 - Math.exp(-dt * 1.7)); bot.progress += bot.speed / TRACK_LENGTH * dt; bot.wheel -= bot.speed * dt / .41;
      if (bot.progress >= TOTAL_LAPS) { bot.progress = TOTAL_LAPS; bot.finishTime = state.raceTime; bot.speed = 0; }
    }
    bot.laneNow = bot.lane + Math.sin(bot.progress * TAU * 2.1 + bot.phase) * .46;
    placeBot(bot);
  }
}

const PICKUP_TYPES = {
  nitro: { title: 'NITRO', symbol: 'N', detail: 'OVERDRIVE · 5 SEC', color: 0xff6d43, css: '#ff6d43' },
  time: { title: 'TIME BANK', symbol: '+', detail: '+12 SECONDS', color: 0xffcf5b, css: '#ffcf5b' },
  fuel: { title: 'FUEL CELL', symbol: 'F', detail: '+35% RESERVE', color: 0x72e4a1, css: '#72e4a1' },
  wings: { title: 'WINGS', symbol: 'W', detail: 'LOW-FLIGHT · 7 SEC', color: 0x76d7ff, css: '#76d7ff' },
  shield: { title: 'SHIELD', symbol: 'S', detail: 'IMPACT GUARD · 8 SEC', color: 0xb395ff, css: '#b395ff' },
  grip: { title: 'GRIP', symbol: 'G', detail: 'CORNER MODE · 7 SEC', color: 0xff8db8, css: '#ff8db8' },
};
const pickupGeometry = { ring: new THREE.TorusGeometry(.68, .055, 7, 22), core: new THREE.OctahedronGeometry(.36, 0), halo: new THREE.TorusGeometry(.88, .045, 6, 24), beam: new THREE.CylinderGeometry(.47, .72, 1.72, 12, 1, true) };
function pickupTexture(type) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128; const ctx = canvas.getContext('2d');
  ctx.fillStyle = type.css; ctx.font = '800 72px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(type.symbol, 64, 67);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; return texture;
}
const pickupMaterials = Object.fromEntries(Object.entries(PICKUP_TYPES).map(([id, type]) => [id, {
  solid: new THREE.MeshStandardMaterial({ color: type.color, emissive: type.color, emissiveIntensity: .65, metalness: .38, roughness: .3 }),
  beam: new THREE.MeshBasicMaterial({ color: type.color, transparent: true, opacity: .13, side: THREE.DoubleSide, depthWrite: false }),
  halo: new THREE.MeshBasicMaterial({ color: type.color, transparent: true, opacity: .75, depthWrite: false }),
  sprite: new THREE.SpriteMaterial({ map: pickupTexture(type), transparent: true, depthWrite: false }),
}]));
const pickupLayout = [
  [14, -2.25, 'nitro'], [28, 2.15, 'fuel'], [43, -.25, 'time'], [58, -2.1, 'wings'], [73, 2.2, 'shield'], [87, -.5, 'grip'],
  [102, 2.05, 'nitro'], [118, -2.3, 'fuel'], [133, .25, 'time'], [148, 2.1, 'wings'], [164, -2.05, 'shield'], [179, .4, 'grip'],
  [193, -2.2, 'nitro'], [207, 2.15, 'fuel'], [222, -.2, 'time'], [234, 2, 'wings'],
];
const pickups = pickupLayout.map(([index, lane, id], order) => {
  const type = PICKUP_TYPES[id], materials = pickupMaterials[id], s = samples[index], group = new THREE.Group(); group.position.set(s.x + s.rx * lane, 0, s.z + s.rz * lane);
  const halo = new THREE.Mesh(pickupGeometry.halo, materials.halo); halo.rotation.x = Math.PI / 2; halo.position.y = .095; group.add(halo);
  const beam = new THREE.Mesh(pickupGeometry.beam, materials.beam); beam.position.y = .93; group.add(beam);
  const ring = new THREE.Mesh(pickupGeometry.ring, materials.solid); ring.position.y = 1.42; group.add(ring);
  const core = new THREE.Mesh(pickupGeometry.core, materials.solid); core.position.y = 1.42; group.add(core);
  const icon = new THREE.Sprite(materials.sprite); icon.position.y = 1.43; icon.scale.set(.68, .68, 1); group.add(icon);
  scene.add(group); return { id, type, group, halo, ring, core, icon, x: group.position.x, z: group.position.z, active: true, respawn: 0, reveal: 1, phase: order * .65 };
});
let toastTimer = 0;
function showPickup(type) {
  ui.pickupToast.style.setProperty('--pickup-color', type.css); ui.pickupSymbol.textContent = type.symbol; ui.pickupTitle.textContent = type.title; ui.pickupDetail.textContent = type.detail; ui.pickupToast.classList.remove('hidden'); toastTimer = 2.25;
}
function applyPickup(pickup) {
  pickup.active = false; pickup.respawn = 13; pickup.reveal = 0; pickup.group.visible = false; state.pickups++;
  switch (pickup.id) {
    case 'nitro': state.nitro = Math.max(state.nitro, 5); state.vx += Math.sin(state.yaw) * 3.8; state.vz += Math.cos(state.yaw) * 3.8; break;
    case 'time': state.timeLeft = Math.min(180, state.timeLeft + 12); break;
    case 'fuel': state.fuel = Math.min(100, state.fuel + 35); break;
    case 'wings': state.wings = Math.max(state.wings, 7); break;
    case 'shield': state.shield = Math.max(state.shield, 8); break;
    case 'grip': state.gripBoost = Math.max(state.gripBoost, 7); break;
  }
  showPickup(pickup.type);
}
function resetPickups() { for (const pickup of pickups) { pickup.active = true; pickup.respawn = 0; pickup.reveal = 1; pickup.group.visible = true; pickup.group.scale.setScalar(1); } toastTimer = 0; ui.pickupToast.classList.add('hidden'); }
function updatePickups(dt, now) {
  for (const pickup of pickups) {
    if (!pickup.active) { pickup.respawn -= dt; if (pickup.respawn <= 0) { pickup.active = true; pickup.group.visible = true; pickup.reveal = 0; } continue; }
    pickup.reveal = Math.min(1, pickup.reveal + dt * 3.5); pickup.group.scale.setScalar(pickup.reveal);
    const bob = Math.sin(now * .0028 + pickup.phase) * .14; pickup.ring.position.y = 1.42 + bob; pickup.core.position.y = 1.42 + bob; pickup.icon.position.y = 1.43 + bob; pickup.ring.rotation.y += dt * 1.8; pickup.core.rotation.y -= dt * 2.3; pickup.core.rotation.x += dt * 1.2; pickup.halo.rotation.z += dt * .8;
    const dx = state.x - pickup.x, dz = state.z - pickup.z, reach = Math.min(2.65, activeVehicle.radius + 1.2);
    if (state.phase === 'racing' && dx * dx + dz * dz < reach * reach) applyPickup(pickup);
  }
  if (toastTimer > 0) { toastTimer -= dt; if (toastTimer <= 0) ui.pickupToast.classList.add('hidden'); }
}

const wingAura = new THREE.Group(), wingMat = new THREE.MeshBasicMaterial({ color: 0x76d7ff, transparent: true, opacity: .6, side: THREE.DoubleSide, depthWrite: false });
for (const side of [-1, 1]) { const wing = addBox(wingAura, wingMat, [2.15, .07, .72], [side * 1.72, 1.25, -.05], [0, side * -.18, side * -.1]); wing.renderOrder = 2; }
wingAura.visible = false; car.add(wingAura);
const shieldBubble = new THREE.Mesh(new THREE.SphereGeometry(2.22, 18, 12), new THREE.MeshBasicMaterial({ color: 0xb395ff, transparent: true, opacity: .16, depthWrite: false, side: THREE.DoubleSide })); shieldBubble.position.y = 1.22; shieldBubble.visible = false; car.add(shieldBubble);
const nitroFlames = new THREE.Group(), flameMat = new THREE.MeshBasicMaterial({ color: 0xffa352, transparent: true, opacity: .88 });
for (const side of [-1, 1]) addPart(nitroFlames, new THREE.ConeGeometry(.16, .95, 7), flameMat, side * .52, .53, -2.35, -Math.PI / 2, 0, 0);
nitroFlames.visible = false; car.add(nitroFlames);

let garageOpen = false;
let controlSettingsOpen = false;
const categories = ['All', ...new Set(VEHICLES.map(vehicle => vehicle.category))];
function renderGarage() {
  for (const category of categories) {
    const chip = document.createElement('button'); chip.type = 'button'; chip.className = `filter-chip${category === 'All' ? ' active' : ''}`; chip.textContent = category; chip.dataset.category = category; chip.setAttribute('aria-pressed', String(category === 'All'));
    chip.addEventListener('click', () => {
      ui.garageFilters.querySelectorAll('.filter-chip').forEach(item => { item.classList.toggle('active', item === chip); item.setAttribute('aria-pressed', String(item === chip)); });
      ui.vehicleGrid.querySelectorAll('.vehicle-card').forEach(card => card.classList.toggle('hidden', category !== 'All' && card.dataset.category !== category));
    }); ui.garageFilters.appendChild(chip);
  }
  VEHICLES.forEach((vehicle, index) => {
    const card = document.createElement('button'); card.type = 'button'; card.className = `vehicle-card${vehicle.id === activeVehicle.id ? ' selected' : ''}`; card.dataset.vehicle = vehicle.id; card.dataset.category = vehicle.category; card.style.setProperty('--vehicle-color', vehicle.color); card.setAttribute('aria-pressed', String(vehicle.id === activeVehicle.id));
    const speedStat = Math.round(vehicle.maxSpeed / 56 * 100), handlingStat = Math.round(vehicle.turn / 2.05 * 100);
    card.innerHTML = `<span class="vehicle-number">${String(index + 1).padStart(2, '0')}</span><span class="vehicle-swatch"></span><span class="vehicle-category">${vehicle.category}</span><h3>${vehicle.name}</h3><p>${vehicle.description}</p><div class="vehicle-stats"><span class="vehicle-stat">SPEED <span class="stat-bar"><i style="--stat:${speedStat}%"></i></span></span><span class="vehicle-stat">AGILITY <span class="stat-bar"><i style="--stat:${handlingStat}%"></i></span></span></div><span class="selected-tag" aria-hidden="true">SELECTED</span>`;
    card.addEventListener('click', () => selectVehicle(vehicle.id)); ui.vehicleGrid.appendChild(card);
  });
}
function setGarage(open) {
  garageOpen = open; ui.garage.classList.toggle('hidden', !open); ui.garage.setAttribute('aria-hidden', String(!open)); ui.garageToggle.setAttribute('aria-expanded', String(open));
  if (open) { Object.keys(controls).forEach(key => { controls[key] = false; }); resetSteeringPad(); ui.garageClose.focus(); } else ui.garageToggle.focus();
}
function selectVehicle(id) {
  const vehicle = VEHICLES.find(item => item.id === id); if (!vehicle) return;
  activeRig.group.visible = false; activeVehicle = vehicle; activeRig = rigs[id]; activeRig.group.visible = true; ui.vehicleName.textContent = vehicle.shortName;
  ui.vehicleGrid.querySelectorAll('.vehicle-card').forEach(card => { const selected = card.dataset.vehicle === id; card.classList.toggle('selected', selected); card.setAttribute('aria-pressed', String(selected)); });
  setGarage(false); restartRace();
}
renderGarage();

const smokeCanvas = document.createElement('canvas'); smokeCanvas.width = smokeCanvas.height = 64;
const smokeContext = smokeCanvas.getContext('2d');
const gradient = smokeContext.createRadialGradient(32, 32, 2, 32, 32, 30); gradient.addColorStop(0, 'rgba(235,235,222,.72)'); gradient.addColorStop(.48, 'rgba(214,218,208,.34)'); gradient.addColorStop(1, 'rgba(210,215,207,0)'); smokeContext.fillStyle = gradient; smokeContext.fillRect(0, 0, 64, 64);
const smokeTexture = new THREE.CanvasTexture(smokeCanvas);
const smoke = Array.from({ length: 54 }, () => {
  const material = new THREE.SpriteMaterial({ map: smokeTexture, color: 0xe6e7dc, transparent: true, opacity: 0, depthWrite: false });
  const sprite = new THREE.Sprite(material); sprite.visible = false; scene.add(sprite); return { sprite, life: 0, vx: 0, vz: 0, size: 1 };
});
let smokeCursor = 0, smokeAccumulator = 0;
function emitSmoke(x, z, vx, vz) {
  const p = smoke[smokeCursor++ % smoke.length]; p.life = 1; p.size = .55 + Math.random() * .35; p.vx = vx + (Math.random() - .5) * 1.8; p.vz = vz + (Math.random() - .5) * 1.8;
  p.sprite.position.set(x, .32, z); p.sprite.scale.setScalar(p.size); p.sprite.material.opacity = .48; p.sprite.visible = true;
}
function updateSmoke(dt) {
  for (const p of smoke) if (p.life > 0) {
    p.life -= dt * 1.35; p.sprite.position.x += p.vx * dt; p.sprite.position.z += p.vz * dt; p.sprite.position.y += dt * .72; p.vx *= Math.exp(-dt * 1.6); p.vz *= Math.exp(-dt * 1.6);
    p.sprite.scale.setScalar(p.size + (1 - p.life) * 2.3); p.sprite.material.opacity = Math.max(0, p.life) * .48; if (p.life <= 0) p.sprite.visible = false;
  }
}

const controls = { throttle: false, brake: false, left: false, right: false, handbrake: false };
const mobileInput = { steer: 0, pointerId: null, cruise: false };
const keyMap = { KeyW: 'throttle', ArrowUp: 'throttle', KeyS: 'brake', ArrowDown: 'brake', KeyA: 'right', ArrowLeft: 'right', KeyD: 'left', ArrowRight: 'left', Space: 'handbrake' };
addEventListener('keydown', event => {
  if (controlSettingsOpen && event.code === 'Escape' && !event.repeat) { setControlSettings(false); event.preventDefault(); return; }
  if (controlSettingsOpen) return;
  if ((event.code === 'KeyG' || event.code === 'Escape') && !event.repeat) { if (event.code === 'KeyG' || garageOpen) setGarage(!garageOpen); event.preventDefault(); return; }
  if (garageOpen) return;
  if (event.code === 'KeyR' && !event.repeat) restartRace();
  const control = keyMap[event.code]; if (control) { controls[control] = true; event.preventDefault(); }
});
addEventListener('keyup', event => { const control = keyMap[event.code]; if (control) { controls[control] = false; event.preventDefault(); } });
function hideMobileCoach() { ui.mobileCoach.classList.add('hidden'); }
function setSteering(clientX) {
  const rect = ui.steeringPad.getBoundingClientRect(), center = rect.left + rect.width / 2, range = rect.width * .35;
  let value = THREE.MathUtils.clamp((clientX - center) / range, -1, 1); if (Math.abs(value) < .06) value = 0;
  mobileInput.steer = value; ui.steeringPad.setAttribute('aria-valuenow', String(Math.round(value * 100))); ui.steeringKnob.style.transform = `translate(${value * range * .72}px, -50%)`;
}
function resetSteeringPad() {
  mobileInput.steer = 0; mobileInput.pointerId = null; ui.steeringPad.classList.remove('active'); ui.steeringPad.setAttribute('aria-valuenow', '0'); ui.steeringKnob.style.transform = 'translate(0, -50%)';
}
function setControlLayout(layout, persist = true) {
  const safeLayout = layout === 'right' ? 'right' : 'left'; document.body.dataset.controlLayout = safeLayout; ui.layoutToggleLabel.textContent = safeLayout === 'right' ? 'STEER RIGHT' : 'STEER LEFT';
  document.querySelectorAll('[data-layout]').forEach(option => { const selected = option.dataset.layout === safeLayout; option.classList.toggle('selected', selected); option.setAttribute('aria-pressed', String(selected)); });
  resetSteeringPad();
  if (persist) { try { localStorage.setItem('apex-control-layout', safeLayout); } catch { /* Device storage can be unavailable in private contexts. */ } }
}
function setControlSettings(open) {
  controlSettingsOpen = open; ui.controlSettings.classList.toggle('hidden', !open); ui.controlSettings.setAttribute('aria-hidden', String(!open)); ui.layoutToggle.setAttribute('aria-expanded', String(open));
  if (open) { Object.keys(controls).forEach(key => { controls[key] = false; }); resetSteeringPad(); ui.controlSettingsClose.focus(); } else ui.layoutToggle.focus();
}
ui.steeringPad.addEventListener('pointerdown', event => {
  if (mobileInput.pointerId !== null) return; event.preventDefault(); mobileInput.pointerId = event.pointerId; ui.steeringPad.classList.add('active'); ui.steeringPad.setPointerCapture(event.pointerId); setSteering(event.clientX); hideMobileCoach();
});
ui.steeringPad.addEventListener('pointermove', event => { if (event.pointerId === mobileInput.pointerId) { event.preventDefault(); setSteering(event.clientX); } });
const releaseSteering = event => { if (event.pointerId !== mobileInput.pointerId) return; if (ui.steeringPad.hasPointerCapture(event.pointerId)) ui.steeringPad.releasePointerCapture(event.pointerId); resetSteeringPad(); };
ui.steeringPad.addEventListener('pointerup', releaseSteering); ui.steeringPad.addEventListener('pointercancel', releaseSteering); ui.steeringPad.addEventListener('lostpointercapture', resetSteeringPad);
ui.cruiseToggle.addEventListener('click', () => { mobileInput.cruise = !mobileInput.cruise; ui.cruiseToggle.classList.toggle('active', mobileInput.cruise); ui.cruiseToggle.setAttribute('aria-pressed', String(mobileInput.cruise)); hideMobileCoach(); });
ui.layoutToggle.addEventListener('click', () => { setControlSettings(true); hideMobileCoach(); });
ui.controlSettingsClose.addEventListener('click', () => setControlSettings(false));
ui.controlSettings.addEventListener('click', event => { if (event.target === ui.controlSettings) setControlSettings(false); });
document.querySelectorAll('[data-layout]').forEach(option => option.addEventListener('click', () => { setControlLayout(option.dataset.layout); setControlSettings(false); }));
try { setControlLayout(localStorage.getItem('apex-control-layout'), false); } catch { setControlLayout('left', false); }
addEventListener('blur', () => { Object.keys(controls).forEach(key => { controls[key] = false; }); resetSteeringPad(); });
document.querySelectorAll('[data-control]').forEach(button => {
  const control = button.dataset.control;
  const release = event => { controls[control] = false; button.classList.remove('active'); if (button.hasPointerCapture(event.pointerId)) button.releasePointerCapture(event.pointerId); };
  button.addEventListener('pointerdown', event => { event.preventDefault(); controls[control] = true; button.classList.add('active'); button.setPointerCapture(event.pointerId); hideMobileCoach(); });
  button.addEventListener('pointerup', release); button.addEventListener('pointercancel', release); button.addEventListener('lostpointercapture', () => { controls[control] = false; button.classList.remove('active'); });
});
ui.restart.addEventListener('click', restartRace);
ui.garageToggle.addEventListener('click', () => setGarage(true));
ui.garageClose.addEventListener('click', () => setGarage(false));
ui.garage.addEventListener('click', event => { if (event.target === ui.garage) setGarage(false); });

const state = { x: start.x, z: start.z, yaw: startYaw, vx: 0, vz: 0, yawRate: 0, steer: 0, wheel: 0, forward: 0, lateral: 0, phase: 'countdown', countdown: 3, goTime: 0, raceTime: 0, lapStart: 0, completed: 0, bestLap: Infinity, checkpoint: false, lastIndex: 0, trackU: 0, collision: 0, fuel: 100, timeLeft: 120, nitro: 0, wings: 0, shield: 0, gripBoost: 0, pickups: 0, position: 1, playerFinishTime: Infinity, finishReason: '' };
const cameraLook = new THREE.Vector3(), desiredCamera = new THREE.Vector3(), desiredLook = new THREE.Vector3();
let lastCount = null;
const standingRows = Array.from({ length: 4 }, () => {
  const row = document.createElement('div'); row.className = 'standing-row'; row.innerHTML = '<span class="standing-place"></span><span class="standing-name"></span><span class="standing-gap"></span>'; ui.standings.appendChild(row); return row;
});
let orderUpdate = 0;

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return '--:--.---';
  const ms = Math.floor(seconds * 1000), minutes = Math.floor(ms / 60000), sec = Math.floor(ms / 1000) % 60;
  return `${String(minutes).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(ms % 1000).padStart(3, '0')}`;
}
function formatBank(seconds) { const whole = Math.max(0, Math.ceil(seconds)); return `${String(Math.floor(whole / 60)).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}`; }
function raceEntries() {
  const player = { id: 'player', name: 'YOU', progress: state.completed + state.trackU, finishTime: state.playerFinishTime, color: '#ff633c' };
  return [player, ...bots.map(bot => ({ id: bot.id, name: bot.name, progress: bot.progress, finishTime: bot.finishTime }))].sort((a, b) => {
    const aDone = Number.isFinite(a.finishTime), bDone = Number.isFinite(b.finishTime);
    if (aDone && bDone) return a.finishTime - b.finishTime;
    if (aDone !== bDone) return aDone ? -1 : 1;
    return b.progress - a.progress;
  });
}
function updateRaceOrder(force = false, dt = 0) {
  orderUpdate -= dt; if (!force && orderUpdate > 0) return; orderUpdate = .16;
  const order = raceEntries(), leader = order[0]; state.position = order.findIndex(entry => entry.id === 'player') + 1; ui.position.textContent = String(state.position);
  order.forEach((entry, index) => {
    const row = standingRows[index]; row.classList.toggle('player', entry.id === 'player'); row.querySelector('.standing-place').textContent = `P${index + 1}`; row.querySelector('.standing-name').textContent = entry.name;
    row.querySelector('.standing-gap').textContent = Number.isFinite(entry.finishTime) ? 'FIN' : index === 0 ? 'LEADER' : `+${Math.max(0, Math.round((leader.progress - entry.progress) * TRACK_LENGTH))}m`;
  });
}
function setCountdown(value, caption, go = false) {
  if (lastCount === value) return; lastCount = value; ui.countdownValue.textContent = value; ui.countdownCaption.textContent = caption; ui.countdown.classList.toggle('go', go); ui.countdown.classList.remove('hidden');
  ui.countdownValue.style.animation = 'none'; void ui.countdownValue.offsetWidth; ui.countdownValue.style.animation = '';
}
function restartRace() {
  Object.assign(state, { x: start.x, z: start.z, yaw: startYaw, vx: 0, vz: 0, yawRate: 0, steer: 0, wheel: 0, forward: 0, lateral: 0, phase: 'countdown', countdown: 3, goTime: 0, raceTime: 0, lapStart: 0, completed: 0, bestLap: Infinity, checkpoint: false, lastIndex: 0, trackU: 0, collision: 0, fuel: 100, timeLeft: 120, nitro: 0, wings: 0, shield: 0, gripBoost: 0, pickups: 0, position: 1, playerFinishTime: Infinity, finishReason: '' });
  lastCount = null; ui.finish.classList.add('hidden'); ui.lap.textContent = '1'; ui.position.textContent = '1'; ui.timer.textContent = '00:00.000'; ui.best.textContent = '--:--.---'; ui.raceLabel.textContent = 'GRID READY'; ui.raceStatus.className = 'race-status';
  setCountdown('3', 'GET READY');
  for (const p of smoke) { p.life = 0; p.sprite.visible = false; }
  resetBots(); resetPickups(); resetWildlife(); updateRaceOrder(true);
  activeRig.group.rotation.set(0, 0, 0); activeRig.group.position.set(0, 0, 0);
  updateCarVisual(0); snapCamera();
}
function finishRace(reason = 'complete') {
  if (state.phase === 'finished') return;
  state.finishReason = reason; if (reason === 'complete') state.playerFinishTime = state.raceTime;
  state.phase = 'finished'; updateRaceOrder(true);
  ui.finishTitle.textContent = reason === 'timeout' ? 'Time expired' : 'Race complete';
  ui.finishDescription.textContent = reason === 'timeout' ? 'The time bank ran dry. Grab the gold clocks and try again.' : `You finished three laps with ${state.pickups} pickups collected.`;
  ui.finishPosition.textContent = `P${state.position}`; ui.finishTime.textContent = formatTime(state.raceTime); ui.finishBest.textContent = formatTime(state.bestLap); ui.finish.classList.remove('hidden'); ui.raceLabel.textContent = reason === 'timeout' ? 'TIME EXPIRED' : 'RACE COMPLETE'; ui.raceStatus.className = 'race-status finished';
}

function updatePhysics(dt) {
  const spec = activeVehicle;
  const active = state.phase === 'racing';
  const brake = active && controls.brake, throttle = active && (controls.throttle || mobileInput.cruise) && !brake, handbrake = active && controls.handbrake;
  // Camera-facing left is positive world yaw for this circuit; invert the screen-space pad value.
  const steerInput = active ? THREE.MathUtils.clamp(Number(controls.right) - Number(controls.left) - mobileInput.steer, -1, 1) : 0;
  state.steer += (steerInput - state.steer) * (1 - Math.exp(-dt * 9));
  const fx = Math.sin(state.yaw), fz = Math.cos(state.yaw), rx = Math.cos(state.yaw), rz = -Math.sin(state.yaw);
  let forward = state.vx * fx + state.vz * fz;
  let lateral = state.vx * rx + state.vz * rz;
  let acceleration = 0;
  const nitroFactor = state.nitro > 0 ? 1.28 : 1, fuelFactor = state.fuel <= 0 ? .36 : state.fuel < 12 ? .72 : 1, speedCap = spec.maxSpeed * nitroFactor * (state.fuel <= 0 ? .56 : 1);
  if (throttle) acceleration += forward < speedCap ? spec.accel * fuelFactor * (state.nitro > 0 ? 1.42 : 1) * (1 - Math.max(0, forward) / (speedCap * 1.28)) : 0;
  if (brake) acceleration -= forward > 1 ? spec.brake : (forward > -spec.reverse ? spec.accel * .72 : 0);
  if (!throttle && !brake) acceleration -= Math.sign(forward) * Math.min(Math.abs(forward) / Math.max(dt, .001), 2.9 + Math.abs(forward) * .055);
  acceleration -= forward * Math.abs(forward) * .008;
  forward += acceleration * dt;
  forward = THREE.MathUtils.clamp(forward, -spec.reverse, speedCap);
  const grip = (handbrake ? spec.drift : spec.grip) * (state.gripBoost > 0 ? 1.5 : 1) * (state.wings > 0 ? .82 : 1);
  lateral *= Math.exp(-grip * dt);
  const speedTurn = THREE.MathUtils.clamp(Math.abs(forward) / Math.max(7, spec.maxSpeed * .3), 0, 1);
  const targetYaw = state.steer * speedTurn * (handbrake ? spec.turn * 1.5 : spec.turn) * (state.gripBoost > 0 ? 1.14 : 1) * (state.wings > 0 ? 1.1 : 1) * Math.sign(forward || 1);
  state.yawRate += (targetYaw - state.yawRate) * (1 - Math.exp(-dt * (handbrake ? 5 : 9)));
  state.yaw += state.yawRate * dt;
  const nfx = Math.sin(state.yaw), nfz = Math.cos(state.yaw), nrx = Math.cos(state.yaw), nrz = -Math.sin(state.yaw);
  // A handbrake retains some sideways momentum while the heading rotates.
  if (handbrake) lateral += -state.yawRate * forward * dt * .66;
  state.vx = nfx * forward + nrx * lateral; state.vz = nfz * forward + nrz * lateral;
  state.x += state.vx * dt; state.z += state.vz * dt;

  const track = nearestTrack(state.x, state.z);
  const onCircuit = track.distanceSq < (TRACK_WIDTH / 2 + 3) ** 2;
  state.forward = state.vx * nfx + state.vz * nfz; state.lateral = state.vx * nrx + state.vz * nrz;
  // Free-roam never clamps or slows the vehicle. Only nearby asphalt advances competitive lap progress.
  if (onCircuit) state.trackU = track.index / SAMPLE_COUNT;
  if (active && onCircuit) {
    if (track.index > SAMPLE_COUNT * .43 && track.index < SAMPLE_COUNT * .68) state.checkpoint = true;
    if (state.checkpoint && state.lastIndex > SAMPLE_COUNT * .84 && track.index < SAMPLE_COUNT * .16 && state.forward > 3) {
      const lapTime = state.raceTime - state.lapStart; state.bestLap = Math.min(state.bestLap, lapTime); state.lapStart = state.raceTime; state.completed++; state.checkpoint = false;
      ui.best.textContent = formatTime(state.bestLap);
      if (state.completed >= TOTAL_LAPS) finishRace(); else ui.lap.textContent = String(state.completed + 1);
    }
    state.lastIndex = track.index;
  }
  if (handbrake && !['bicycle', 'tanga', 'plane'].includes(spec.id) && Math.abs(state.forward) > Math.min(9, spec.maxSpeed * .32) && (Math.abs(state.steer) > .2 || Math.abs(state.lateral) > 2)) {
    smokeAccumulator += dt * 28;
    while (smokeAccumulator >= 1) {
      smokeAccumulator--;
      for (const side of [-1, 1]) emitSmoke(state.x + nrx * side * Math.min(.95, spec.radius * .82) - nfx * 1.35, state.z + nrz * side * Math.min(.95, spec.radius * .82) - nfz * 1.35, -nfx * state.forward * .12, -nfz * state.forward * .12);
    }
  } else smokeAccumulator = 0;
  for (const material of activeRig.brakeMaterials) material.emissiveIntensity += ((brake || handbrake ? 3.4 : .22) - material.emissiveIntensity) * (1 - Math.exp(-dt * 14));
  state.collision *= Math.exp(-dt * 7);
}

function resolveBotContacts() {
  if (state.phase !== 'racing') return;
  for (const bot of bots) {
    const dx = state.x - bot.group.position.x, dz = state.z - bot.group.position.z, distanceSq = dx * dx + dz * dz, radius = Math.min(2.5, activeVehicle.radius + 1.05);
    if (distanceSq > .001 && distanceSq < radius * radius) {
      const distance = Math.sqrt(distanceSq), nx = dx / distance, nz = dz / distance, overlap = radius - distance;
      state.x += nx * overlap * .42; state.z += nz * overlap * .42;
      if (state.shield <= 0) { state.vx += nx * Math.min(3, overlap * 5); state.vz += nz * Math.min(3, overlap * 5); state.vx *= .92; state.vz *= .92; state.collision = Math.max(state.collision, .32); }
    }
  }
}
function updateRaceSystems(dt, now) {
  updatePickups(dt, now);
  if (state.phase !== 'racing') return;
  state.timeLeft = Math.max(0, state.timeLeft - dt);
  state.fuel = Math.max(0, state.fuel - dt * (.22 + ((controls.throttle || mobileInput.cruise) && !controls.brake ? .62 : 0) + (state.nitro > 0 ? .32 : 0)));
  state.nitro = Math.max(0, state.nitro - dt); state.wings = Math.max(0, state.wings - dt); state.shield = Math.max(0, state.shield - dt); state.gripBoost = Math.max(0, state.gripBoost - dt);
  if (state.timeLeft <= 0) finishRace('timeout');
}

function updateCarVisual(dt) {
  car.position.set(state.x, .015, state.z); car.rotation.y = state.yaw;
  const speedRatio = Math.min(Math.abs(state.forward) / activeVehicle.maxSpeed, 1);
  const rollTarget = -state.steer * speedRatio * (activeVehicle.id === 'bicycle' ? .22 : .09) - state.lateral * .006;
  const pitchTarget = (controls.brake ? -.045 : controls.throttle || mobileInput.cruise ? .025 : 0) * Math.min(Math.abs(state.forward) / 7, 1);
  const group = activeRig.group;
  group.rotation.z += (rollTarget - group.rotation.z) * (1 - Math.exp(-dt * 8)); group.rotation.x += (pitchTarget - group.rotation.x) * (1 - Math.exp(-dt * 7));
  const lift = (activeVehicle.id === 'plane' ? speedRatio * 1.45 : 0) + (state.wings > 0 ? .5 + speedRatio * .34 : 0);
  group.position.y = lift + Math.sin(performance.now() * .016) * speedRatio * .018;
  state.wheel -= state.forward * dt / activeRig.wheelRadius;
  for (const spin of activeRig.wheelSpins) spin.rotation.x = state.wheel;
  for (const wheel of activeRig.wheelPivots) if (wheel.front) wheel.pivot.rotation.y = state.steer * .44;
  if (activeRig.animations.propeller) activeRig.animations.propeller.rotation.z += dt * (12 + Math.abs(state.forward) * 2.3);
  if (activeRig.animations.pedal) activeRig.animations.pedal.rotation.x = state.wheel * .75;
  if (activeRig.animations.legs) activeRig.animations.legs.forEach((leg, index) => { leg.rotation.x = Math.sin(state.wheel * .55 + (index % 2) * Math.PI) * Math.min(.42, Math.abs(state.forward) * .035); });
  wingAura.visible = state.wings > 0; wingAura.position.y = lift * .45; wingAura.scale.setScalar(1 + Math.sin(performance.now() * .011) * .035);
  shieldBubble.visible = state.shield > 0; shieldBubble.scale.setScalar(1 + Math.sin(performance.now() * .008) * .025); shieldBubble.material.opacity = .12 + Math.sin(performance.now() * .012) * .035;
  nitroFlames.visible = state.nitro > 0; nitroFlames.position.z = activeVehicle.id === 'truck' ? -.7 : activeVehicle.id === 'plane' ? -.5 : 0; nitroFlames.scale.z = .7 + Math.random() * .55;
}
function snapCamera() {
  const portrait = innerHeight > innerWidth && innerWidth <= 760, fx = Math.sin(state.yaw), fz = Math.cos(state.yaw), distance = activeVehicle.camera + .6 + (portrait ? 2.15 : 0);
  camera.position.set(state.x - fx * distance, portrait ? 5.1 : 4.5, state.z - fz * distance); cameraLook.set(state.x + fx * (portrait ? 5.3 : 4), 1.2, state.z + fz * (portrait ? 5.3 : 4)); camera.lookAt(cameraLook);
}
function updateCamera(dt) {
  const portrait = innerHeight > innerWidth && innerWidth <= 760;
  const fx = Math.sin(state.yaw), fz = Math.cos(state.yaw), speedRatio = Math.min(Math.abs(state.forward) / activeVehicle.maxSpeed, 1);
  const distance = activeVehicle.camera + speedRatio * 2.3 + (portrait ? 2.15 : 0), height = (activeVehicle.id === 'plane' ? 4.7 : 4.05) + speedRatio * .65 + (state.wings > 0 ? .45 : 0) + (portrait ? .65 : 0);
  desiredCamera.set(state.x - fx * distance - state.vx * .035, height, state.z - fz * distance - state.vz * .035);
  const shake = state.collision * .11; desiredCamera.x += (Math.random() - .5) * shake; desiredCamera.y += (Math.random() - .5) * shake;
  camera.position.lerp(desiredCamera, 1 - Math.exp(-dt * 5.4));
  const lookAhead = (portrait ? 5.3 : 4) + speedRatio * 2;
  desiredLook.set(state.x + fx * lookAhead, activeVehicle.id === 'plane' ? 1.7 + speedRatio : 1.15, state.z + fz * lookAhead); cameraLook.lerp(desiredLook, 1 - Math.exp(-dt * 7.4)); camera.lookAt(cameraLook);
  camera.fov += (((portrait ? 63 : 58) + speedRatio * 7 + (state.nitro > 0 ? 4 : 0)) - camera.fov) * (1 - Math.exp(-dt * 3)); camera.updateProjectionMatrix();
}
let effectSignature = '';
let monumentNear = false;
function updateMonument(now) {
  const time = now * .001;
  codeHalo.rotation.z = time * .24; orbit.rotation.y = time * .48;
  beacon.material.opacity = .13 + Math.sin(time * 2.1) * .035;
  beaconCore.material.emissiveIntensity = 1.35 + Math.sin(time * 2.1) * .42;
  orbitNodes.forEach((node, index) => { node.rotation.x = time * .7 + index; node.rotation.y = time * .9; node.position.y = Math.sin(time * 1.8 + index * .8) * .27; });
  const dx = MONUMENT.x - state.x, dz = MONUMENT.z - state.z, distance = Math.hypot(dx, dz);
  const bearing = Math.atan2(dx, dz) - state.yaw;
  ui.signalArrow.style.transform = `rotate(${-bearing * 180 / Math.PI}deg)`;
  ui.signalDistance.textContent = `${Math.round(distance)} m`;
  const near = distance <= MONUMENT.promptRadius;
  if (near !== monumentNear) {
    monumentNear = near; ui.monumentPrompt.classList.toggle('hidden', !near); ui.monumentPrompt.setAttribute('aria-hidden', String(!near));
    ui.signalGuide.classList.toggle('locked', near); ui.signalStatus.textContent = near ? 'TERMINAL UNLOCKED' : 'FOLLOW THE CYAN BEACON';
    document.body.classList.toggle('near-monument', near);
  }
}
function updateHud() {
  const kmh = Math.round(Math.abs(state.forward) * 3.6); ui.speed.textContent = String(kmh); ui.arc.style.strokeDasharray = `${Math.min(320, kmh / 235 * 320)} 427`;
  ui.gear.textContent = state.forward < -1 ? 'R' : kmh < 3 ? 'N' : String(Math.min(5, 1 + Math.floor(kmh / 36)));
  ui.timer.textContent = formatTime(state.raceTime);
  ui.fuelBar.style.width = `${state.fuel.toFixed(1)}%`; ui.fuelValue.textContent = `${Math.ceil(state.fuel)}%`; ui.timeBank.textContent = formatBank(state.timeLeft); ui.systems.classList.toggle('low-fuel', state.fuel < 22); ui.systems.classList.toggle('low-time', state.timeLeft < 25);
  const effects = [['NITRO', state.nitro, '#ff6d43'], ['WINGS', state.wings, '#76d7ff'], ['SHIELD', state.shield, '#b395ff'], ['GRIP', state.gripBoost, '#ff8db8']].filter(([, time]) => time > 0);
  const signature = effects.map(([name, time]) => `${name}${Math.ceil(time)}`).join('|');
  if (signature !== effectSignature) { effectSignature = signature; ui.effectChips.innerHTML = effects.map(([name, time, color]) => `<span class="effect-chip" style="--effect-color:${color}">${name} <b>${Math.ceil(time)}s</b></span>`).join(''); }
}

let previous = performance.now();
function revealGame() {
  if (bootScheduled) return;
  bootScheduled = true;
  const remaining = Math.max(0, 620 - (performance.now() - bootStarted));
  window.setTimeout(() => {
    bootReady = true; previous = performance.now(); document.body.classList.remove('is-loading'); bootLoader?.setAttribute('aria-hidden', 'true');
    window.setTimeout(() => bootLoader?.remove(), 520);
  }, remaining);
}
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - previous) / 1000, .05); previous = now;
  if (bootReady && !garageOpen && !controlSettingsOpen) {
    if (state.phase === 'countdown') {
      state.countdown -= dt;
      if (state.countdown > 0) setCountdown(String(Math.ceil(state.countdown)), 'GET READY');
      else { state.phase = 'racing'; state.goTime = .8; setCountdown('GO', 'PUSH HARD', true); ui.raceLabel.textContent = 'RACE LIVE'; ui.raceStatus.className = 'race-status live'; }
    } else if (state.phase === 'racing') {
      state.raceTime += dt;
      if (state.goTime > 0) { state.goTime -= dt; if (state.goTime <= 0) ui.countdown.classList.add('hidden'); }
    }
    updatePhysics(dt); updateBots(dt); resolveBotContacts(); updateWildlife(dt, now); updateRaceSystems(dt, now); updateCarVisual(dt); updateSmoke(dt); updateRaceOrder(false, dt);
  }
  updateCamera(dt); updateHud(); updateMonument(now); updateNature(now);
  sky.position.set(camera.position.x, 0, camera.position.z);
  sun.position.set(camera.position.x - 150, 130, camera.position.z - 190);
  renderer.render(scene, camera);
  revealGame();
}
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setPixelRatio(Math.min(devicePixelRatio, pixelRatioCap())); renderer.setSize(innerWidth, innerHeight); });
document.addEventListener('visibilitychange', () => { previous = performance.now(); });
restartRace(); requestAnimationFrame(frame);
