export type Preset = {
  tag: string;
  text: string;
  code: string;
};

export const DEFAULT_PROMPT =
  "Mill high-performance radial turbine manifold with anodized finish.";

export const DEFAULT_CODE = `
const group = new THREE.Group();

const baseGeo = new THREE.CylinderGeometry(1.5, 1.5, 0.3, 32);
const baseMat = new THREE.MeshStandardMaterial({
  color: 0xcccccc, metalness: 0.9, roughness: 0.25
});
const base = new THREE.Mesh(baseGeo, baseMat);
group.add(base);

const pillarGeo = new THREE.CylinderGeometry(0.5, 0.5, 1.5, 32);
const pillarMat = new THREE.MeshStandardMaterial({
  color: 0x111827, metalness: 0.8, roughness: 0.4
});
const pillar = new THREE.Mesh(pillarGeo, pillarMat);
pillar.position.y = 0.75;
group.add(pillar);

const numPegs = 8;
const radius = 1.1;
for (let i = 0; i < numPegs; i++) {
  const angle = (i / numPegs) * Math.PI * 2;
  const pegGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.6, 16);
  const pegMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, metalness: 0.7, roughness: 0.2 });
  const peg = new THREE.Mesh(pegGeo, pegMat);
  peg.position.x = Math.cos(angle) * radius;
  peg.position.z = Math.sin(angle) * radius;
  peg.position.y = 0.3;
  group.add(peg);
}

return group;
`.trim();

const turbine = `
const group = new THREE.Group();
const metal = new THREE.MeshStandardMaterial({ color: 0xc5ccd6, metalness: 0.92, roughness: 0.22 });
const accent = new THREE.MeshStandardMaterial({ color: 0x2563eb, metalness: 0.75, roughness: 0.28 });
const dark = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.8, roughness: 0.35 });

const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 0.9, 32), metal);
group.add(hub);

const shroud = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.18, 16, 48), dark);
shroud.rotation.x = Math.PI / 2;
group.add(shroud);

for (let i = 0; i < 12; i++) {
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.72, 0.5), accent);
  const a = (i / 12) * Math.PI * 2;
  fin.position.set(Math.cos(a) * 0.82, 0, Math.sin(a) * 0.82);
  fin.lookAt(0, 0, 0);
  group.add(fin);
}

const nose = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.55, 28), metal);
nose.position.y = 0.7;
group.add(nose);

const duct = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.15, 20), dark);
duct.rotation.z = Math.PI / 2;
group.add(duct);

return group;
`.trim();

const cooling = `
const group = new THREE.Group();
const core = new THREE.Mesh(
  new THREE.CylinderGeometry(0.35, 0.35, 1.5, 28),
  new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.82, roughness: 0.32 })
);
group.add(core);
const finMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, metalness: 0.72, roughness: 0.24 });
for (let i = 0; i < 16; i++) {
  const fin = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.055, 0.38), finMat);
  const a = (i / 16) * Math.PI * 2;
  fin.position.set(Math.cos(a) * 0.72, 0, Math.sin(a) * 0.72);
  fin.rotation.y = -a;
  group.add(fin);
}
const cap = new THREE.Mesh(
  new THREE.CylinderGeometry(0.42, 0.42, 0.12, 28),
  new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.9, roughness: 0.2 })
);
cap.position.y = 0.78;
group.add(cap);
return group;
`.trim();

const stairs = `
const group = new THREE.Group();
const stepMat = new THREE.MeshStandardMaterial({ color: 0xd6dbe3, metalness: 0.62, roughness: 0.34 });
const railMat = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.86, roughness: 0.28 });
const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 3.3, 20), railMat);
group.add(pole);
const steps = 18;
for (let i = 0; i < steps; i++) {
  const step = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.07, 0.28), stepMat);
  const a = i * 0.55;
  step.position.set(Math.cos(a) * 0.72, -1.45 + i * 0.16, Math.sin(a) * 0.72);
  step.rotation.y = -a;
  group.add(step);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.28, 8), railMat);
  post.position.set(Math.cos(a) * 1.05, -1.3 + i * 0.16, Math.sin(a) * 1.05);
  group.add(post);
}
return group;
`.trim();

const chamfer = `
const group = new THREE.Group();
const w = 2.1;
const d = 1.25;
const c = 0.2;
const shape = new THREE.Shape();
shape.moveTo(-w / 2 + c, -d / 2);
shape.lineTo(w / 2 - c, -d / 2);
shape.lineTo(w / 2, -d / 2 + c);
shape.lineTo(w / 2, d / 2 - c);
shape.lineTo(w / 2 - c, d / 2);
shape.lineTo(-w / 2 + c, d / 2);
shape.lineTo(-w / 2, d / 2 - c);
shape.lineTo(-w / 2, -d / 2 + c);
shape.closePath();
const geo = new THREE.ExtrudeGeometry(shape, {
  depth: 0.48,
  bevelEnabled: true,
  bevelThickness: 0.06,
  bevelSize: 0.05,
  bevelSegments: 2
});
geo.rotateX(-Math.PI / 2);
geo.translate(0, 0.18, 0);
const block = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
  color: 0xe7ebf0, metalness: 0.95, roughness: 0.12
}));
group.add(block);
return group;
`.trim();

const bolts = `
const group = new THREE.Group();
const shape = new THREE.Shape();
shape.absarc(0, 0, 1.35, 0, Math.PI * 2, false);
for (let i = 0; i < 6; i++) {
  const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
  const hole = new THREE.Path();
  hole.absarc(Math.cos(a) * 0.82, Math.sin(a) * 0.82, 0.13, 0, Math.PI * 2, true);
  shape.holes.push(hole);
}
const center = new THREE.Path();
center.absarc(0, 0, 0.28, 0, Math.PI * 2, true);
shape.holes.push(center);
const geo = new THREE.ExtrudeGeometry(shape, {
  depth: 0.22,
  bevelEnabled: true,
  bevelThickness: 0.025,
  bevelSize: 0.02,
  bevelSegments: 1
});
geo.rotateX(-Math.PI / 2);
geo.translate(0, 0.08, 0);
const plate = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
  color: 0xd5dbe3, metalness: 0.9, roughness: 0.26
}));
group.add(plate);
return group;
`.trim();

const fluid = `
const group = new THREE.Group();
const shellMat = new THREE.MeshStandardMaterial({
  color: 0xc5ccd6, metalness: 0.9, roughness: 0.22, side: THREE.DoubleSide
});
const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 2.2, 32, 1, true), shellMat);
group.add(shell);
const fluidMat = new THREE.MeshStandardMaterial({
  color: 0x2563eb, metalness: 0.35, roughness: 0.12, transparent: true, opacity: 0.88
});
const core = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 2.45, 24), fluidMat);
group.add(core);
const ringMat = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.8, roughness: 0.3 });
for (const y of [-0.72, 0.72]) {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.07, 12, 32), ringMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = y;
  group.add(ring);
}
return group;
`.trim();

const honeycomb = `
const group = new THREE.Group();
const mat = new THREE.MeshStandardMaterial({ color: 0xe6ebf1, metalness: 0.86, roughness: 0.24 });
const edge = new THREE.MeshStandardMaterial({ color: 0x2563eb, metalness: 0.7, roughness: 0.3 });
const r = 0.22;
for (let q = -3; q <= 3; q++) {
  for (let row = -3; row <= 3; row++) {
    const x = q * r * 1.78;
    const z = row * r * 1.55 + (Math.abs(q) % 2) * r * 0.78;
    if (x * x + z * z > 1.55) continue;
    const cell = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.9, r * 0.9, 0.32, 6), mat);
    cell.position.set(x, 0, z);
    group.add(cell);
  }
}
const rim = new THREE.Mesh(new THREE.TorusGeometry(1.28, 0.06, 10, 40), edge);
rim.rotation.x = Math.PI / 2;
rim.position.y = 0.12;
group.add(rim);
return group;
`.trim();

const gear = `
const group = new THREE.Group();
const mat = new THREE.MeshStandardMaterial({ color: 0xb7c0cc, metalness: 0.92, roughness: 0.28 });
const dark = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.7, roughness: 0.35 });
const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.26, 40), mat);
group.add(hub);
const teeth = 24;
for (let i = 0; i < teeth; i++) {
  const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.26, 0.2), mat);
  const a = (i / teeth) * Math.PI * 2;
  tooth.position.set(Math.cos(a) * 0.86, 0, Math.sin(a) * 0.86);
  tooth.rotation.y = -a;
  group.add(tooth);
}
const bore = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.32, 20), dark);
group.add(bore);
const web = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.05, 8, 28), dark);
web.rotation.x = Math.PI / 2;
group.add(web);
return group;
`.trim();

export const PRESETS: Preset[] = [
  {
    tag: "Turbine",
    text: "Mill high-performance radial turbine manifold with anodized finish.",
    code: turbine,
  },
  {
    tag: "Cooling",
    text: "Add radial cooling fins around the central axis for heat dissipation.",
    code: cooling,
  },
  {
    tag: "Architecture",
    text: "Sculpt spiraling staircase structure with filleted step edges.",
    code: stairs,
  },
  {
    tag: "Chamfer",
    text: "Bevel outer edges with a 2mm chamfer and polished metal surface.",
    code: chamfer,
  },
  {
    tag: "Mounting",
    text: "Drill array of 6 hexagonally patterned mounting bolt holes.",
    code: bolts,
  },
  {
    tag: "Fluids",
    text: "Extrude central cylinder and generate internal hollow fluid channel.",
    code: fluid,
  },
  {
    tag: "Aerospace",
    text: "Construct lightweight honeycomb infill matrix for aerospace component.",
    code: honeycomb,
  },
  {
    tag: "Gears",
    text: "Machine high-precision spiral bevel gear set with 24 teeth.",
    code: gear,
  },
];
