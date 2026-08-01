import * as THREE from 'three';

export const GITHUB_URL = 'https://github.com/yogeshgiri904';

const GLYPHS = {
  P: { width: .69, outline: [[0, 0], [.18, 0], [.18, .4], [.49, .4], [.61, .46], [.69, .58], [.69, .79], [.63, .92], [.52, 1], [0, 1]], holes: [[[.18, .57], [.47, .57], [.51, .63], [.51, .76], [.47, .82], [.18, .82]]] },
  A: { width: .77, outline: [[0, 0], [.18, 0], [.25, .25], [.52, .25], [.59, 0], [.77, 0], [.49, 1], [.28, 1]], holes: [[[.31, .43], [.385, .75], [.46, .43]]] },
  N: { width: .72, outline: [[0, 0], [.18, 0], [.18, .68], [.53, 0], [.72, 0], [.72, 1], [.54, 1], [.54, .32], [.19, 1], [0, 1]] },
  D: { width: .78, outline: [[0, 0], [.43, 0], [.61, .06], [.72, .19], [.78, .38], [.78, .62], [.72, .81], [.61, .94], [.43, 1], [0, 1]], holes: [[[.19, .19], [.39, .19], [.5, .25], [.56, .38], [.56, .62], [.5, .75], [.39, .81], [.19, .81]]] },
  I: { width: .42, outline: [[0, 0], [.42, 0], [.42, .16], [.3, .16], [.3, .84], [.42, .84], [.42, 1], [0, 1], [0, .84], [.12, .84], [.12, .16], [0, .16]] },
  T: { width: .76, outline: [[0, .82], [.28, .82], [.28, 0], [.48, 0], [.48, .82], [.76, .82], [.76, 1], [0, 1]] },
  J: { width: .72, outline: [[0, .22], [.18, .22], [.18, .18], [.24, .14], [.37, .14], [.44, .2], [.44, .84], [.27, .84], [.27, 1], [.72, 1], [.72, .84], [.64, .84], [.64, .2], [.58, .07], [.46, 0], [.21, 0], [.07, .07], [0, .15]] },
};

function trace(path, points) {
  path.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) path.lineTo(points[i][0], points[i][1]);
  path.closePath();
  return path;
}

function glyphGeometry(character) {
  const glyph = GLYPHS[character], shape = trace(new THREE.Shape(), glyph.outline);
  for (const points of glyph.holes || []) shape.holes.push(trace(new THREE.Path(), points));
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: .46, steps: 1, bevelEnabled: true, bevelSegments: 2, bevelSize: .028, bevelThickness: .075, curveSegments: 4 });
  geometry.translate(0, 0, -.23);
  return geometry;
}

function roundedBlock(width, height, depth, radius) {
  const x = width / 2 - radius, y = height / 2 - radius, shape = new THREE.Shape();
  shape.moveTo(-x, -height / 2); shape.lineTo(x, -height / 2); shape.quadraticCurveTo(width / 2, -height / 2, width / 2, -y);
  shape.lineTo(width / 2, y); shape.quadraticCurveTo(width / 2, height / 2, x, height / 2); shape.lineTo(-x, height / 2); shape.quadraticCurveTo(-width / 2, height / 2, -width / 2, y);
  shape.lineTo(-width / 2, -y); shape.quadraticCurveTo(-width / 2, -height / 2, -x, -height / 2);
  const coreDepth = Math.max(.04, depth - radius * 2), geometry = new THREE.ExtrudeGeometry(shape, { depth: coreDepth, steps: 1, bevelEnabled: true, bevelSegments: 2, bevelSize: radius * .48, bevelThickness: radius, curveSegments: 4 });
  geometry.translate(0, 0, -coreDepth / 2);
  return geometry;
}

function plaqueTexture() {
  const canvas = document.createElement('canvas'); canvas.width = 768; canvas.height = 192;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#101b24'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#d5b577'; ctx.lineWidth = 3; ctx.strokeRect(15, 15, 738, 162);
  ctx.fillStyle = '#f0dfb5'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '700 72px system-ui, sans-serif'; ctx.fillText('PANDITJI', 384, 78);
  ctx.fillStyle = '#7dded5'; ctx.font = '500 22px ui-monospace, monospace'; ctx.fillText('SIGNATURE / DESIGN IN MOTION', 384, 140);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4; return texture;
}

export function createPanditjiMonument() {
  const group = new THREE.Group(); group.name = 'PANDITJI Landmark';
  const stone = new THREE.MeshStandardMaterial({ color: 0x17252f, metalness: .38, roughness: .75 });
  const titanium = new THREE.MeshPhysicalMaterial({ color: 0x344852, metalness: .8, roughness: .31, clearcoat: .34, clearcoatRoughness: .31 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x11232b, metalness: .47, roughness: .55 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xc6a66c, metalness: .84, roughness: .3 });
  const letterFace = new THREE.MeshPhysicalMaterial({ color: 0xefd39a, emissive: 0x533b1b, emissiveIntensity: .31, metalness: .76, roughness: .26, clearcoat: .52, clearcoatRoughness: .25 });
  const letterEdge = new THREE.MeshStandardMaterial({ color: 0x293c47, metalness: .82, roughness: .34 });
  const glow = new THREE.MeshStandardMaterial({ color: 0x7de2d9, emissive: 0x35d3c9, emissiveIntensity: 1.46, metalness: .28, roughness: .28 });
  const beamMaterial = new THREE.MeshBasicMaterial({ color: 0x66e1d6, transparent: true, opacity: .085, depthWrite: false, side: THREE.DoubleSide });
  const add = (geometry, material, position, rotation = [0, 0, 0], scale = [1, 1, 1], cast = true) => {
    const mesh = new THREE.Mesh(geometry, material); mesh.position.set(...position); mesh.rotation.set(...rotation); mesh.scale.set(...scale); mesh.castShadow = cast; mesh.receiveShadow = true; group.add(mesh); return mesh;
  };

  const plaza = add(new THREE.CircleGeometry(11.2, 64), dark, [0, .024, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
  for (const [radius, tube, material] of [[10.25, .075, gold], [8.25, .038, titanium], [5.4, .05, glow]]) add(new THREE.TorusGeometry(radius, tube, 8, 72), material, [0, .055, 0], [Math.PI / 2, 0, 0], [1, 1, 1], false);
  for (let i = 0; i < 28; i++) { const angle = i / 28 * Math.PI * 2, radius = 9.13; add(new THREE.BoxGeometry(i % 4 ? .1 : .22, .025, i % 4 ? .68 : 1.14), i % 4 ? titanium : gold, [Math.sin(angle) * radius, .066, Math.cos(angle) * radius], [0, angle, 0], [1, 1, 1], false); }

  add(roundedBlock(17.45, .66, 4.7, .17), stone, [0, .4, 0]);
  add(roundedBlock(16.9, .56, 4.05, .15), titanium, [0, 1.02, 0]);
  add(roundedBlock(16.18, .34, 3.38, .12), dark, [0, 1.49, 0]);
  add(roundedBlock(15.9, .22, 1.4, .08), gold, [0, 1.78, .06]);
  add(new THREE.BoxGeometry(15.25, .055, .08), glow, [0, 1.62, 1.75], [0, 0, 0], [1, 1, 1], false);
  for (const side of [-1, 1]) {
    add(roundedBlock(.31, 5.35, .58, .08), titanium, [side * 8.16, 4.27, -.42]);
    add(new THREE.BoxGeometry(.14, 4.84, .08), glow, [side * 8.16, 4.29, -.08], [0, 0, 0], [1, 1, 1], false);
    add(new THREE.OctahedronGeometry(.25, 0), gold, [side * 8.16, 7.06, -.42], [0, Math.PI / 4, 0]);
  }
  add(roundedBlock(16.64, .2, .48, .06), gold, [0, 6.96, -.42]);
  const plaque = add(new THREE.PlaneGeometry(5.35, 1.18), new THREE.MeshStandardMaterial({ map: plaqueTexture(), metalness: .28, roughness: .56, emissive: 0x14252a, emissiveIntensity: .28 }), [0, .99, 2.06], [0, 0, 0], [1, 1, 1], false);

  const word = 'PANDITJI', gap = .105, xScale = 2.55, yScale = 3.8;
  const normalizedWidth = [...word].reduce((sum, character) => sum + GLYPHS[character].width, 0) + gap * (word.length - 1);
  let cursor = -normalizedWidth * xScale / 2;
  const letters = [];
  for (const character of word) {
    const glyph = GLYPHS[character], letter = new THREE.Mesh(glyphGeometry(character), [letterFace, letterEdge]);
    letter.position.set(cursor, 1.98, .13); letter.scale.set(xScale, yScale, 1); letter.castShadow = true; letter.receiveShadow = true; group.add(letter); letters.push(letter);
    cursor += (glyph.width + gap) * xScale;
  }

  const halo = add(new THREE.TorusGeometry(4.05, .048, 8, 72), glow, [0, 4.17, -.71], [0, 0, 0], [2.02, .68, 1], false);
  const beacon = add(new THREE.CylinderGeometry(.18, .72, 17, 18, 1, true), beamMaterial, [0, 12.45, -.92], [0, 0, 0], [1, 1, 1], false);
  const beaconCore = add(new THREE.CylinderGeometry(.035, .035, 18, 8), glow, [0, 12.15, -.92], [0, 0, 0], [1, 1, 1], false);
  const shardOrbit = new THREE.Group(); shardOrbit.position.set(0, 7.65, -.3); group.add(shardOrbit);
  const shards = [];
  for (let i = 0; i < 14; i++) { const angle = i / 14 * Math.PI * 2, shard = new THREE.Mesh(new THREE.OctahedronGeometry(i % 3 ? .17 : .25, 0), i % 3 ? gold : glow); shard.position.set(Math.sin(angle) * 8.65, Math.sin(angle * 2) * .22, Math.cos(angle) * 2.7); shard.castShadow = true; shardOrbit.add(shard); shards.push(shard); }
  const particlePositions = new Float32Array(84 * 3);
  for (let i = 0; i < 84; i++) { const angle = i * 2.399, radius = 3.5 + (i % 11) * .48; particlePositions[i * 3] = Math.sin(angle) * radius; particlePositions[i * 3 + 1] = 1.65 + (i % 17) * .37; particlePositions[i * 3 + 2] = Math.cos(angle) * radius * .58; }
  const particleGeometry = new THREE.BufferGeometry(); particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
  const particles = new THREE.Points(particleGeometry, new THREE.PointsMaterial({ color: 0x8ee8df, size: .068, transparent: true, opacity: .55, depthWrite: false, blending: THREE.AdditiveBlending })); group.add(particles);
  const light = new THREE.PointLight(0x53d8ce, 7, 25, 2); light.position.set(0, 4.3, 3.5); group.add(light);
  return { group, plaza, plaque, letters, halo, beacon, beaconCore, shardOrbit, shards, particles, glow, letterFace, beamMaterial };
}

export function animatePanditjiMonument(rig, time, reducedMotion = false, hovered = false) {
  const pace = reducedMotion ? .12 : 1;
  rig.shardOrbit.rotation.y = time * .19 * pace; rig.halo.rotation.z = Math.sin(time * .22 * pace) * .035; rig.particles.rotation.y = time * .035 * pace;
  rig.shards.forEach((shard, index) => { shard.rotation.x = time * .48 * pace + index; shard.rotation.y = time * .65 * pace; shard.position.y = Math.sin(time * 1.1 * pace + index * .62) * .2; });
  rig.beamMaterial.opacity = .082 + (reducedMotion ? 0 : Math.sin(time * 1.5) * .022);
  rig.glow.emissiveIntensity = (hovered ? 2.18 : 1.42) + (reducedMotion ? 0 : Math.sin(time * 1.65) * .19);
  rig.letterFace.emissiveIntensity = (hovered ? .62 : .31) + (reducedMotion ? 0 : Math.sin(time * 1.2) * .04);
}
