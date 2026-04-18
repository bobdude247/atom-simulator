import * as THREE from "https://unpkg.com/three@0.164.1/build/three.module.js";

const ELEMENTS = {
  1: { name: "Hydrogen", symbol: "H", category: "Nonmetal", period: 1, group: 1 },
  2: { name: "Helium", symbol: "He", category: "Noble gas", period: 1, group: 18 },
  3: { name: "Lithium", symbol: "Li", category: "Alkali metal", period: 2, group: 1 },
  4: { name: "Beryllium", symbol: "Be", category: "Alkaline earth metal", period: 2, group: 2 },
  5: { name: "Boron", symbol: "B", category: "Metalloid", period: 2, group: 13 },
  6: { name: "Carbon", symbol: "C", category: "Nonmetal", period: 2, group: 14 },
  7: { name: "Nitrogen", symbol: "N", category: "Nonmetal", period: 2, group: 15 },
  8: { name: "Oxygen", symbol: "O", category: "Nonmetal", period: 2, group: 16 },
  9: { name: "Fluorine", symbol: "F", category: "Halogen", period: 2, group: 17 },
  10: { name: "Neon", symbol: "Ne", category: "Noble gas", period: 2, group: 18 },
  11: { name: "Sodium", symbol: "Na", category: "Alkali metal", period: 3, group: 1 },
  12: { name: "Magnesium", symbol: "Mg", category: "Alkaline earth metal", period: 3, group: 2 },
  13: { name: "Aluminum", symbol: "Al", category: "Post-transition metal", period: 3, group: 13 },
  14: { name: "Silicon", symbol: "Si", category: "Metalloid", period: 3, group: 14 },
  15: { name: "Phosphorus", symbol: "P", category: "Nonmetal", period: 3, group: 15 },
  16: { name: "Sulfur", symbol: "S", category: "Nonmetal", period: 3, group: 16 },
  17: { name: "Chlorine", symbol: "Cl", category: "Halogen", period: 3, group: 17 },
  18: { name: "Argon", symbol: "Ar", category: "Noble gas", period: 3, group: 18 },
  19: { name: "Potassium", symbol: "K", category: "Alkali metal", period: 4, group: 1 },
  20: { name: "Calcium", symbol: "Ca", category: "Alkaline earth metal", period: 4, group: 2 },
};

const dropZone = document.getElementById("dropZone");
const threeContainer = document.getElementById("threeContainer");
const canvas2D = document.getElementById("atomCanvas");
const ctx2D = canvas2D.getContext("2d");

const speedSlider = document.getElementById("speedSlider");
const speedValue = document.getElementById("speedValue");
const resetButton = document.getElementById("resetButton");
const viewModeInputs = document.querySelectorAll('input[name="viewMode"]');
const yawSlider = document.getElementById("yawSlider");
const yawValue = document.getElementById("yawValue");
const pitchSlider = document.getElementById("pitchSlider");
const pitchValue = document.getElementById("pitchValue");
const zoomSlider = document.getElementById("zoomSlider");
const zoomValue = document.getElementById("zoomValue");

const elementNameEl = document.getElementById("elementName");
const elementSymbolEl = document.getElementById("elementSymbol");
const atomicNumberEl = document.getElementById("atomicNumber");
const massNumberEl = document.getElementById("massNumber");
const elementCategoryEl = document.getElementById("elementCategory");
const periodGroupEl = document.getElementById("periodGroup");
const countsEl = document.getElementById("counts");

const state = {
  protons: 1,
  neutrons: 0,
  electrons: 1,
  orbitCount: 1,
  speedMultiplier: 1,
  time: 0,
  viewMode: "3d",
  cameraYaw: 25,
  cameraPitch: 18,
  cameraDistance: 360,
};

const threeState = {
  renderer: null,
  scene: null,
  camera: null,
  nucleusGroup: null,
  orbitGroup: null,
  electronMeshes: [],
  interaction: {
    dragging: false,
    startX: 0,
    startY: 0,
    startYaw: 0,
    startPitch: 0,
  },
};

function orbitCapacity(index) {
  return 2 * (index + 1) * (index + 1);
}

function requiredOrbitsForElectrons(electronCount) {
  let remaining = electronCount;
  let count = 0;
  while (remaining > 0) {
    remaining -= orbitCapacity(count);
    count += 1;
  }
  return Math.max(1, count);
}

function electronDistribution(totalElectrons, orbitCount) {
  let remaining = totalElectrons;
  const distribution = [];
  for (let i = 0; i < orbitCount; i += 1) {
    const cap = orbitCapacity(i);
    const inOrbit = Math.max(0, Math.min(remaining, cap));
    distribution.push(inOrbit);
    remaining -= inOrbit;
  }
  return distribution;
}

function normalizeState() {
  state.protons = Math.max(0, state.protons);
  state.neutrons = Math.max(0, state.neutrons);
  state.electrons = Math.max(0, state.electrons);
  state.orbitCount = Math.max(1, Math.min(7, state.orbitCount));

  while (requiredOrbitsForElectrons(state.electrons) > state.orbitCount && state.orbitCount < 7) {
    state.orbitCount += 1;
  }
}

function getCurrentElement() {
  return ELEMENTS[state.protons] || null;
}

function updateElementInfo() {
  normalizeState();
  const element = getCurrentElement();
  const massNumber = state.protons + state.neutrons;

  if (element) {
    elementNameEl.textContent = element.name;
    elementSymbolEl.textContent = element.symbol;
    atomicNumberEl.textContent = String(state.protons);
    elementCategoryEl.textContent = element.category;
    periodGroupEl.textContent = `${element.period} / ${element.group}`;
  } else if (state.protons === 0) {
    elementNameEl.textContent = "No element";
    elementSymbolEl.textContent = "-";
    atomicNumberEl.textContent = "0";
    elementCategoryEl.textContent = "N/A";
    periodGroupEl.textContent = "-";
  } else {
    elementNameEl.textContent = `Unknown (Z=${state.protons})`;
    elementSymbolEl.textContent = "?";
    atomicNumberEl.textContent = String(state.protons);
    elementCategoryEl.textContent = "Out of lookup range";
    periodGroupEl.textContent = "-";
  }

  massNumberEl.textContent = String(massNumber);
  countsEl.textContent = `p:${state.protons} n:${state.neutrons} e:${state.electrons} orbits:${state.orbitCount}`;
}

function ensureViewSizes() {
  const rect = dropZone.getBoundingClientRect();
  const width = Math.max(500, Math.floor(rect.width));
  const height = Math.max(420, Math.floor(rect.height));
  canvas2D.width = width;
  canvas2D.height = height;

  if (threeState.renderer && threeState.camera) {
    threeState.renderer.setSize(width, height, false);
    threeState.camera.aspect = width / height;
    threeState.camera.updateProjectionMatrix();
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function updateCameraPosition() {
  if (!threeState.camera) return;
  const yaw = THREE.MathUtils.degToRad(state.cameraYaw);
  const pitch = THREE.MathUtils.degToRad(state.cameraPitch);
  const distance = state.cameraDistance;

  const x = distance * Math.cos(pitch) * Math.sin(yaw);
  const y = distance * Math.sin(pitch);
  const z = distance * Math.cos(pitch) * Math.cos(yaw);

  threeState.camera.position.set(x, y, z);
  threeState.camera.lookAt(0, 0, 0);
}

function syncCameraUI() {
  yawSlider.value = String(Math.round(state.cameraYaw));
  pitchSlider.value = String(Math.round(state.cameraPitch));
  zoomSlider.value = String(Math.round(state.cameraDistance));
  yawValue.textContent = `${Math.round(state.cameraYaw)}°`;
  pitchValue.textContent = `${Math.round(state.cameraPitch)}°`;
  zoomValue.textContent = `${Math.round(state.cameraDistance)}`;
}

function clearGroup(group) {
  while (group.children.length) {
    const child = group.children.pop();
    group.remove(child);
  }
}

function createOrbitLine(radius, tiltX, tiltY, color = 0xc8a2ff) {
  const points = [];
  const segments = 96;
  for (let i = 0; i <= segments; i += 1) {
    const a = (i / segments) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
  }
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.75 });
  const line = new THREE.LineLoop(geometry, material);
  line.rotation.x = tiltX;
  line.rotation.y = tiltY;
  return line;
}

function init3D() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x08101f);

  const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 2000);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(900, 620);
  threeContainer.innerHTML = "";
  threeContainer.appendChild(renderer.domElement);

  const ambient = new THREE.AmbientLight(0xffffff, 0.75);
  scene.add(ambient);

  const keyLight = new THREE.PointLight(0x80b7ff, 1.15, 1200);
  keyLight.position.set(260, 300, 260);
  scene.add(keyLight);

  const fillLight = new THREE.PointLight(0xff9aa2, 0.5, 900);
  fillLight.position.set(-220, -120, -180);
  scene.add(fillLight);

  const starsGeometry = new THREE.BufferGeometry();
  const starCount = 500;
  const positions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i += 1) {
    const idx = i * 3;
    positions[idx] = (Math.random() - 0.5) * 1500;
    positions[idx + 1] = (Math.random() - 0.5) * 1000;
    positions[idx + 2] = (Math.random() - 0.5) * 1500;
  }
  starsGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const stars = new THREE.Points(
    starsGeometry,
    new THREE.PointsMaterial({ color: 0xe5f1ff, size: 2, sizeAttenuation: true, transparent: true, opacity: 0.75 })
  );
  scene.add(stars);

  const nucleusGroup = new THREE.Group();
  const orbitGroup = new THREE.Group();
  scene.add(nucleusGroup);
  scene.add(orbitGroup);

  threeState.scene = scene;
  threeState.camera = camera;
  threeState.renderer = renderer;
  threeState.nucleusGroup = nucleusGroup;
  threeState.orbitGroup = orbitGroup;

  updateCameraPosition();
}

function buildNucleus3D() {
  const { nucleusGroup } = threeState;
  clearGroup(nucleusGroup);

  const particles = [];
  for (let i = 0; i < state.protons; i += 1) particles.push("proton");
  for (let i = 0; i < state.neutrons; i += 1) particles.push("neutron");

  const total = Math.max(1, particles.length);
  const r = Math.max(16, Math.min(42, 10 + Math.sqrt(total) * 5));

  if (particles.length === 0) {
    const placeholder = new THREE.Mesh(
      new THREE.SphereGeometry(10, 24, 24),
      new THREE.MeshStandardMaterial({ color: 0x7a8db0, transparent: true, opacity: 0.4 })
    );
    nucleusGroup.add(placeholder);
    return;
  }

  const protonMat = new THREE.MeshStandardMaterial({ color: 0xff6b6b, roughness: 0.45, metalness: 0.08 });
  const neutronMat = new THREE.MeshStandardMaterial({ color: 0xb9bec7, roughness: 0.5, metalness: 0.06 });
  const nucleonGeom = new THREE.SphereGeometry(Math.max(4.8, Math.min(7.5, 3.8 + r / 8)), 20, 20);
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));

  particles.forEach((kind, idx) => {
    const t = (idx + 0.5) / particles.length;
    const radius = Math.sqrt(t) * r;
    const theta = idx * goldenAngle;
    const phi = Math.acos(1 - 2 * t);
    const x = Math.cos(theta) * Math.sin(phi) * radius;
    const y = Math.cos(phi) * radius;
    const z = Math.sin(theta) * Math.sin(phi) * radius;

    const mesh = new THREE.Mesh(nucleonGeom, kind === "proton" ? protonMat : neutronMat);
    mesh.position.set(x, y, z);
    nucleusGroup.add(mesh);
  });
}

function buildOrbitsAndElectrons3D() {
  const { orbitGroup } = threeState;
  clearGroup(orbitGroup);
  threeState.electronMeshes = [];

  const distribution = electronDistribution(state.electrons, state.orbitCount);
  const electronMaterial = new THREE.MeshStandardMaterial({
    color: 0x4fc3f7,
    emissive: 0x133646,
    roughness: 0.3,
    metalness: 0.1,
  });
  const electronGeometry = new THREE.SphereGeometry(4.5, 18, 18);

  for (let i = 0; i < state.orbitCount; i += 1) {
    const orbitRadius = 55 + i * 26;
    const tiltX = (i % 2 === 0 ? 1 : -1) * (0.18 + i * 0.05);
    const tiltY = (i % 3) * 0.42;

    orbitGroup.add(createOrbitLine(orbitRadius, tiltX, tiltY));

    const count = distribution[i] || 0;
    for (let e = 0; e < count; e += 1) {
      const mesh = new THREE.Mesh(electronGeometry, electronMaterial);
      orbitGroup.add(mesh);
      threeState.electronMeshes.push({ mesh, orbitIndex: i, electronIndex: e, count, radius: orbitRadius, tiltX, tiltY });
    }
  }
}

function refresh3DAtom() {
  buildNucleus3D();
  buildOrbitsAndElectrons3D();
}

function updateElectrons3D() {
  threeState.electronMeshes.forEach((entry) => {
    const { mesh, orbitIndex, electronIndex, count, radius, tiltX, tiltY } = entry;
    const baseAngle = count > 0 ? (electronIndex / count) * Math.PI * 2 : 0;
    const speed = 0.42 / (orbitIndex + 1);
    const angle = baseAngle + state.time * speed * state.speedMultiplier;

    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const pos = new THREE.Vector3(x, 0, z);

    const rx = new THREE.Matrix4().makeRotationX(tiltX);
    const ry = new THREE.Matrix4().makeRotationY(tiltY);
    pos.applyMatrix4(rx).applyMatrix4(ry);
    mesh.position.copy(pos);
  });
}

function setViewMode(mode) {
  state.viewMode = mode === "2d" ? "2d" : "3d";
  const show3D = state.viewMode === "3d";
  threeContainer.classList.toggle("hidden", !show3D);
  canvas2D.classList.toggle("hidden", show3D);
  ensureViewSizes();
}

function setupPointerControls() {
  const target = threeContainer;

  target.addEventListener("pointerdown", (event) => {
    if (state.viewMode !== "3d") return;
    const i = threeState.interaction;
    i.dragging = true;
    i.startX = event.clientX;
    i.startY = event.clientY;
    i.startYaw = state.cameraYaw;
    i.startPitch = state.cameraPitch;
    target.setPointerCapture(event.pointerId);
  });

  target.addEventListener("pointermove", (event) => {
    const i = threeState.interaction;
    if (!i.dragging || state.viewMode !== "3d") return;

    const dx = event.clientX - i.startX;
    const dy = event.clientY - i.startY;
    state.cameraYaw = i.startYaw + dx * 0.35;
    state.cameraPitch = clamp(i.startPitch - dy * 0.25, -70, 70);
    syncCameraUI();
    updateCameraPosition();
  });

  target.addEventListener("pointerup", (event) => {
    const i = threeState.interaction;
    i.dragging = false;
    if (target.hasPointerCapture(event.pointerId)) {
      target.releasePointerCapture(event.pointerId);
    }
  });

  target.addEventListener("pointercancel", () => {
    threeState.interaction.dragging = false;
  });

  target.addEventListener(
    "wheel",
    (event) => {
      if (state.viewMode !== "3d") return;
      event.preventDefault();
      state.cameraDistance = clamp(state.cameraDistance + event.deltaY * 0.35, 160, 720);
      syncCameraUI();
      updateCameraPosition();
    },
    { passive: false }
  );
}

function drawBackgroundStars2D(width, height) {
  const count = 60;
  for (let i = 0; i < count; i += 1) {
    const x = ((i * 151) % width) + ((Math.sin(i) + 1) * 4);
    const y = ((i * 97) % height) + ((Math.cos(i * 0.7) + 1) * 4);
    const alpha = 0.25 + (i % 5) * 0.12;
    ctx2D.fillStyle = `rgba(220,230,255,${Math.min(alpha, 0.8)})`;
    ctx2D.beginPath();
    ctx2D.arc(x % width, y % height, (i % 3) + 0.7, 0, Math.PI * 2);
    ctx2D.fill();
  }
}

function drawNucleus2D(centerX, centerY) {
  const totalNucleons = Math.max(1, state.protons + state.neutrons);
  const nucleusRadius = Math.max(28, Math.min(80, 24 + Math.sqrt(totalNucleons) * 8));
  const particleR = Math.max(6, Math.min(13, 5 + nucleusRadius / 8));

  const particles = [];
  for (let i = 0; i < state.protons; i += 1) particles.push("proton");
  for (let i = 0; i < state.neutrons; i += 1) particles.push("neutron");

  if (particles.length === 0) {
    ctx2D.fillStyle = "rgba(120,140,180,0.35)";
    ctx2D.beginPath();
    ctx2D.arc(centerX, centerY, nucleusRadius * 0.6, 0, Math.PI * 2);
    ctx2D.fill();
    return;
  }

  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  particles.forEach((kind, idx) => {
    const ratio = (idx + 0.5) / particles.length;
    const r = Math.sqrt(ratio) * (nucleusRadius - particleR * 0.7);
    const angle = idx * goldenAngle + state.time * 0.1;
    const x = centerX + Math.cos(angle) * r;
    const y = centerY + Math.sin(angle) * r;

    ctx2D.fillStyle = kind === "proton" ? "#ff6b6b" : "#b9bec7";
    ctx2D.beginPath();
    ctx2D.arc(x, y, particleR, 0, Math.PI * 2);
    ctx2D.fill();
    ctx2D.strokeStyle = "rgba(255,255,255,0.3)";
    ctx2D.lineWidth = 1;
    ctx2D.stroke();
  });
}

function drawOrbitsAndElectrons2D(centerX, centerY, maxRadius) {
  const distribution = electronDistribution(state.electrons, state.orbitCount);
  for (let i = 0; i < state.orbitCount; i += 1) {
    const orbitRadius = 80 + i * 45;
    if (orbitRadius > maxRadius) break;

    ctx2D.strokeStyle = "rgba(200,162,255,0.7)";
    ctx2D.lineWidth = 2;
    ctx2D.beginPath();
    ctx2D.arc(centerX, centerY, orbitRadius, 0, Math.PI * 2);
    ctx2D.stroke();

    const count = distribution[i] || 0;
    for (let e = 0; e < count; e += 1) {
      const baseAngle = (e / count) * Math.PI * 2;
      const speed = 0.22 / (i + 1);
      const angle = baseAngle + state.time * speed * state.speedMultiplier;
      const ex = centerX + Math.cos(angle) * orbitRadius;
      const ey = centerY + Math.sin(angle) * orbitRadius;

      ctx2D.fillStyle = "#4fc3f7";
      ctx2D.beginPath();
      ctx2D.arc(ex, ey, 7, 0, Math.PI * 2);
      ctx2D.fill();
      ctx2D.strokeStyle = "rgba(255,255,255,0.35)";
      ctx2D.lineWidth = 1;
      ctx2D.stroke();
    }
  }
}

function render2D() {
  const width = canvas2D.width;
  const height = canvas2D.height;
  const cx = width / 2;
  const cy = height / 2;

  ctx2D.clearRect(0, 0, width, height);
  drawBackgroundStars2D(width, height);
  drawOrbitsAndElectrons2D(cx, cy, Math.min(width, height) * 0.48);
  drawNucleus2D(cx, cy);
}

function handleDroppedItem(type) {
  switch (type) {
    case "proton":
      state.protons += 1;
      break;
    case "neutron":
      state.neutrons += 1;
      break;
    case "electron":
      state.electrons += 1;
      break;
    case "orbit":
      state.orbitCount += 1;
      break;
    default:
      return;
  }
  updateElementInfo();
  refresh3DAtom();
}

function setupDragAndDrop() {
  const items = document.querySelectorAll(".palette-item");
  items.forEach((item) => {
    item.addEventListener("dragstart", (event) => {
      event.dataTransfer.setData("text/plain", item.dataset.itemType || "");
      event.dataTransfer.effectAllowed = "copy";
    });
  });

  dropZone.addEventListener("dragover", (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    dropZone.classList.add("drag-over");
  });

  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("drag-over");
  });

  dropZone.addEventListener("drop", (event) => {
    event.preventDefault();
    dropZone.classList.remove("drag-over");
    const type = event.dataTransfer.getData("text/plain");
    handleDroppedItem(type);
  });
}

function setupControls() {
  speedSlider.addEventListener("input", () => {
    state.speedMultiplier = Number(speedSlider.value);
    speedValue.textContent = `${state.speedMultiplier.toFixed(1)}x`;
  });

  yawSlider.addEventListener("input", () => {
    state.cameraYaw = Number(yawSlider.value);
    yawValue.textContent = `${Math.round(state.cameraYaw)}°`;
    updateCameraPosition();
  });

  pitchSlider.addEventListener("input", () => {
    state.cameraPitch = Number(pitchSlider.value);
    pitchValue.textContent = `${Math.round(state.cameraPitch)}°`;
    updateCameraPosition();
  });

  zoomSlider.addEventListener("input", () => {
    state.cameraDistance = Number(zoomSlider.value);
    zoomValue.textContent = `${Math.round(state.cameraDistance)}`;
    updateCameraPosition();
  });

  viewModeInputs.forEach((input) => {
    input.addEventListener("change", () => {
      if (input.checked) {
        setViewMode(input.value);
      }
    });
  });

  resetButton.addEventListener("click", () => {
    state.protons = 1;
    state.neutrons = 0;
    state.electrons = 1;
    state.orbitCount = 1;
    state.speedMultiplier = Number(speedSlider.value);
    state.time = 0;
    state.cameraYaw = 25;
    state.cameraPitch = 18;
    state.cameraDistance = 360;
    syncCameraUI();
    updateCameraPosition();
    updateElementInfo();
    refresh3DAtom();
  });

  window.addEventListener("resize", ensureViewSizes);
}

let lastTime = performance.now();
function animate(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  state.time += dt;

  updateElectrons3D();
  if (state.viewMode === "2d") {
    render2D();
  }

  threeState.nucleusGroup.rotation.y += dt * 0.2;
  threeState.orbitGroup.rotation.y += dt * 0.05;
  threeState.renderer.render(threeState.scene, threeState.camera);
  requestAnimationFrame(animate);
}

function init() {
  init3D();
  ensureViewSizes();
  setupDragAndDrop();
  setupPointerControls();
  setupControls();
  updateElementInfo();
  speedValue.textContent = `${Number(speedSlider.value).toFixed(1)}x`;
  syncCameraUI();
  refresh3DAtom();
  setViewMode("3d");
  requestAnimationFrame(animate);
}

init();
