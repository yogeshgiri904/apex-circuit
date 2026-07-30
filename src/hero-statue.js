import * as THREE from 'three';

export const GITHUB_URL = 'https://github.com/yogeshgiri904';

function labelTexture() {
  const canvas = document.createElement('canvas'); canvas.width = 768; canvas.height = 192;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#111a24'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#d9b877'; ctx.lineWidth = 3; ctx.strokeRect(16, 16, 736, 160);
  ctx.fillStyle = '#ead9b2'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '700 71px system-ui, sans-serif'; ctx.fillText('MERIDIAN', 384, 79);
  ctx.fillStyle = '#81d9d6'; ctx.font = '500 22px ui-monospace, monospace'; ctx.fillText('GUARDIAN OF THE OPEN SKY', 384, 139);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; return texture;
}

function capeGeometry() {
  const geometry = new THREE.BufferGeometry();
  const vertices = new Float32Array([
    -1.18, 8.75, -.38, 0, 8.92, -.56, -1.78, 3.18, -1.4,
    0, 8.92, -.56, 0, 3.52, -1.86, -1.78, 3.18, -1.4,
    0, 8.92, -.56, 1.18, 8.75, -.38, 1.9, 3.25, -1.33,
    0, 8.92, -.56, 1.9, 3.25, -1.33, 0, 3.52, -1.86,
    -1.78, 3.18, -1.4, 0, 3.52, -1.86, -.32, 2.83, -1.74,
    0, 3.52, -1.86, 1.9, 3.25, -1.33, .35, 2.91, -1.71,
  ]);
  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3)); geometry.computeVertexNormals(); return geometry;
}

export function createHeroMonument() {
  const group = new THREE.Group(); group.name = 'Meridian Monument';
  const stone = new THREE.MeshStandardMaterial({ color: 0x18232e, metalness: .42, roughness: .72 });
  const titanium = new THREE.MeshPhysicalMaterial({ color: 0x344654, metalness: .78, roughness: .31, clearcoat: .35, clearcoatRoughness: .32 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xc6a468, metalness: .85, roughness: .29 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x0b141e, metalness: .48, roughness: .52 });
  const cape = new THREE.MeshStandardMaterial({ color: 0x8b3e46, metalness: .12, roughness: .78, side: THREE.DoubleSide, flatShading: true });
  const glow = new THREE.MeshStandardMaterial({ color: 0x7de2dc, emissive: 0x31d4ce, emissiveIntensity: 1.6, metalness: .32, roughness: .25 });
  const beamMaterial = new THREE.MeshBasicMaterial({ color: 0x5be1d8, transparent: true, opacity: .11, depthWrite: false, side: THREE.DoubleSide });
  const add = (geometry, material, position, rotation = [0, 0, 0], scale = [1, 1, 1], cast = true) => {
    const item = new THREE.Mesh(geometry, material); item.position.set(...position); item.rotation.set(...rotation); item.scale.set(...scale); item.castShadow = cast; item.receiveShadow = true; group.add(item); return item;
  };
  const limb = (a, b, top, bottom, material, sides = 8) => {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), vector = end.clone().sub(start);
    const item = new THREE.Mesh(new THREE.CylinderGeometry(top, bottom, vector.length(), sides), material);
    item.position.copy(start).add(end).multiplyScalar(.5); item.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vector.normalize()); item.castShadow = true; item.receiveShadow = true; group.add(item); return item;
  };

  const plaza = add(new THREE.CircleGeometry(11.2, 64), dark, [0, .024, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
  for (const [radius, tube, material] of [[10.25, .08, gold], [7.9, .038, titanium], [5.05, .06, glow]]) add(new THREE.TorusGeometry(radius, tube, 8, 72), material, [0, .054, 0], [Math.PI / 2, 0, 0], [1, 1, 1], false);
  for (let i = 0; i < 24; i++) { const angle = i / 24 * Math.PI * 2, radius = 9.12; add(new THREE.BoxGeometry(i % 3 ? .12 : .22, .025, i % 3 ? .74 : 1.25), i % 3 ? titanium : gold, [Math.sin(angle) * radius, .065, Math.cos(angle) * radius], [0, angle, 0], [1, 1, 1], false); }
  add(new THREE.CylinderGeometry(4.22, 4.65, 1.26, 12), stone, [0, .67, 0]);
  add(new THREE.CylinderGeometry(3.88, 4.23, .72, 12), titanium, [0, 1.63, 0]);
  add(new THREE.CylinderGeometry(3.68, 3.89, .35, 12), dark, [0, 2.17, 0]);
  add(new THREE.TorusGeometry(4.27, .065, 8, 72), gold, [0, 1.04, 0], [Math.PI / 2, 0, 0], [1, 1, 1], false);
  for (let i = 0; i < 12; i++) { const angle = i / 12 * Math.PI * 2; add(new THREE.BoxGeometry(.17, .75, .13), gold, [Math.sin(angle) * 4.05, 1.61, Math.cos(angle) * 4.05], [0, angle, 0]); }
  const plaque = add(new THREE.PlaneGeometry(4.6, 1.15), new THREE.MeshStandardMaterial({ map: labelTexture(), metalness: .3, roughness: .58, emissive: 0x15252a, emissiveIntensity: .3 }), [0, .75, 4.47], [0, 0, 0], [1, 1, 1], false);

  // Meridian is an original guardian: a faceted sky-forged suit, asymmetrical raised arm, and split ceremonial cape.
  add(new THREE.CylinderGeometry(.94, 1.15, 1.15, 8), titanium, [0, 4.13, 0], [0, Math.PI / 8, 0]);
  for (const side of [-1, 1]) {
    limb([side * .62, 3.8, .04], [side * .7, 2.46, side === -1 ? .24 : -.03], .39, .44, titanium);
    add(new THREE.BoxGeometry(.79, .38, 1.27), dark, [side * .7, 2.43, .25], [0, side * -.07, 0]);
    add(new THREE.BoxGeometry(.55, .17, .94), gold, [side * .7, 2.64, .31]);
  }
  add(new THREE.DodecahedronGeometry(1, 0), titanium, [0, 6.12, 0], [0, Math.PI / 4, 0], [1.45, 2.03, .76]);
  add(new THREE.CylinderGeometry(1.31, 1.14, .38, 8), gold, [0, 7.82, -.02], [0, Math.PI / 8, 0]);
  add(new THREE.DodecahedronGeometry(1, 0), dark, [0, 6.33, .59], [0, 0, 0], [1.08, 1.36, .21]);
  const chestCore = add(new THREE.OctahedronGeometry(.56, 0), glow, [0, 6.65, .87], [0, 0, Math.PI / 4], [1, 1.26, .25]);
  add(new THREE.BoxGeometry(1.26, .085, .08), gold, [0, 5.51, .77]);
  for (const side of [-1, 1]) add(new THREE.SphereGeometry(.78, 10, 8), titanium, [side * 1.29, 7.47, 0], [0, 0, 0], [1, .82, .75]);
  limb([-1.35, 7.35, .02], [-1.78, 5.8, .18], .39, .31, titanium); limb([-1.78, 5.8, .18], [-1.64, 4.55, .55], .31, .24, titanium);
  add(new THREE.SphereGeometry(.34, 9, 7), dark, [-1.64, 4.38, .56]);
  limb([1.34, 7.35, .02], [1.75, 8.55, .22], .38, .31, titanium); limb([1.75, 8.55, .22], [1.35, 9.71, .45], .3, .23, titanium);
  add(new THREE.SphereGeometry(.33, 9, 7), gold, [1.31, 9.86, .46]);
  add(new THREE.CylinderGeometry(.44, .51, .72, 8), dark, [0, 8.12, 0]);
  add(new THREE.SphereGeometry(.79, 12, 9), titanium, [0, 8.98, .04], [0, 0, 0], [.9, 1.08, .83]);
  add(new THREE.BoxGeometry(1.03, .14, .09), glow, [0, 9.02, .68]);
  add(new THREE.BoxGeometry(.18, .89, .24), gold, [0, 9.62, -.02], [-.18, 0, 0]);
  add(capeGeometry(), cape, [0, 0, 0]);
  const energy = add(new THREE.IcosahedronGeometry(.56, 1), glow, [1.34, 10.57, .46]);
  const energyHalo = add(new THREE.TorusGeometry(.93, .055, 8, 48), gold, [1.34, 10.57, .46], [0, .22, 0], [1, 1, 1], false);
  const backHalo = add(new THREE.TorusGeometry(2.55, .07, 8, 64), glow, [0, 8.08, -.63], [0, 0, 0], [1, 1, 1], false);
  const beacon = add(new THREE.CylinderGeometry(.16, .72, 18, 18, 1, true), beamMaterial, [0, 10.2, -.1], [0, 0, 0], [1, 1, 1], false);
  const beaconCore = add(new THREE.CylinderGeometry(.04, .04, 19, 8), glow, [0, 10.7, -.1], [0, 0, 0], [1, 1, 1], false);
  const shardOrbit = new THREE.Group(); shardOrbit.position.set(0, 11.16, 0); group.add(shardOrbit);
  const shards = [];
  for (let i = 0; i < 12; i++) { const angle = i / 12 * Math.PI * 2, shard = new THREE.Mesh(new THREE.OctahedronGeometry(i % 3 ? .2 : .3, 0), i % 3 ? gold : glow); shard.position.set(Math.sin(angle) * 2.78, Math.sin(angle * 2) * .28, Math.cos(angle) * 2.78); shard.castShadow = true; shardOrbit.add(shard); shards.push(shard); }
  const particlePositions = new Float32Array(96 * 3);
  for (let i = 0; i < 96; i++) { const angle = i * 2.399, radius = 2.3 + (i % 13) * .33; particlePositions[i * 3] = Math.sin(angle) * radius; particlePositions[i * 3 + 1] = 2.1 + (i % 19) * .46; particlePositions[i * 3 + 2] = Math.cos(angle) * radius; }
  const particleGeometry = new THREE.BufferGeometry(); particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
  const particles = new THREE.Points(particleGeometry, new THREE.PointsMaterial({ color: 0x8ce7de, size: .075, transparent: true, opacity: .62, depthWrite: false, blending: THREE.AdditiveBlending })); group.add(particles);
  const light = new THREE.PointLight(0x48ded6, 8, 27, 2); light.position.set(0, 7.4, 2.1); group.add(light);
  return { group, plaza, plaque, chestCore, energy, energyHalo, backHalo, beacon, beaconCore, shardOrbit, shards, particles, glow, beamMaterial };
}

export function animateHeroMonument(rig, time, reducedMotion = false, hovered = false) {
  const pace = reducedMotion ? .12 : 1;
  rig.shardOrbit.rotation.y = time * .36 * pace; rig.energyHalo.rotation.z = time * .52 * pace; rig.backHalo.rotation.z = Math.sin(time * .24 * pace) * .12;
  rig.particles.rotation.y = time * .055 * pace;
  rig.shards.forEach((shard, index) => { shard.rotation.x = time * .6 * pace + index; shard.rotation.y = time * .85 * pace; shard.position.y = Math.sin(time * 1.35 * pace + index * .65) * .27; });
  rig.beamMaterial.opacity = .09 + (reducedMotion ? 0 : Math.sin(time * 1.8) * .028);
  rig.glow.emissiveIntensity = (hovered ? 2.35 : 1.48) + (reducedMotion ? 0 : Math.sin(time * 1.8) * .24);
  rig.energy.scale.setScalar((hovered ? 1.14 : 1) + (reducedMotion ? 0 : Math.sin(time * 2.3) * .035));
}
