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

const canvas = document.getElementById("atomCanvas");
const ctx = canvas.getContext("2d");
const dropZone = document.getElementById("dropZone");
const speedSlider = document.getElementById("speedSlider");
const speedValue = document.getElementById("speedValue");
const resetButton = document.getElementById("resetButton");

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
};

function ensureCanvasSize() {
  const rect = dropZone.getBoundingClientRect();
  canvas.width = Math.max(500, Math.floor(rect.width));
  canvas.height = Math.max(420, Math.floor(rect.height));
}

function orbitCapacity(index) {
  return 2 * (index + 1) * (index + 1);
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

function drawBackgroundStars(width, height) {
  const count = 55;
  for (let i = 0; i < count; i += 1) {
    const x = ((i * 151) % width) + ((Math.sin(i) + 1) * 4);
    const y = ((i * 97) % height) + ((Math.cos(i * 0.7) + 1) * 4);
    const alpha = 0.25 + (i % 5) * 0.12;
    ctx.fillStyle = `rgba(220,230,255,${Math.min(alpha, 0.8)})`;
    ctx.beginPath();
    ctx.arc(x % width, y % height, (i % 3) + 0.7, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawNucleus(centerX, centerY) {
  const totalNucleons = Math.max(1, state.protons + state.neutrons);
  const nucleusRadius = Math.max(28, Math.min(80, 24 + Math.sqrt(totalNucleons) * 8));
  const particleR = Math.max(6, Math.min(13, 5 + nucleusRadius / 8));

  const particles = [];
  for (let i = 0; i < state.protons; i += 1) particles.push("proton");
  for (let i = 0; i < state.neutrons; i += 1) particles.push("neutron");

  if (particles.length === 0) {
    ctx.fillStyle = "rgba(120,140,180,0.35)";
    ctx.beginPath();
    ctx.arc(centerX, centerY, nucleusRadius * 0.6, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  particles.forEach((kind, idx) => {
    const ratio = (idx + 0.5) / particles.length;
    const r = Math.sqrt(ratio) * (nucleusRadius - particleR * 0.7);
    const angle = idx * goldenAngle + state.time * 0.1;
    const x = centerX + Math.cos(angle) * r;
    const y = centerY + Math.sin(angle) * r;

    ctx.fillStyle = kind === "proton" ? "#ff6b6b" : "#b9bec7";
    ctx.beginPath();
    ctx.arc(x, y, particleR, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.lineWidth = 1;
    ctx.stroke();
  });
}

function drawOrbitsAndElectrons(centerX, centerY, maxRadius) {
  const distribution = electronDistribution(state.electrons, state.orbitCount);

  for (let i = 0; i < state.orbitCount; i += 1) {
    const orbitRadius = 80 + i * 45;
    if (orbitRadius > maxRadius) break;

    ctx.strokeStyle = "rgba(200,162,255,0.7)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, orbitRadius, 0, Math.PI * 2);
    ctx.stroke();

    const count = distribution[i] || 0;
    for (let e = 0; e < count; e += 1) {
      const baseAngle = (e / count) * Math.PI * 2;
      const speed = 0.22 / (i + 1);
      const angle = baseAngle + state.time * speed * state.speedMultiplier;
      const ex = centerX + Math.cos(angle) * orbitRadius;
      const ey = centerY + Math.sin(angle) * orbitRadius;

      ctx.fillStyle = "#4fc3f7";
      ctx.beginPath();
      ctx.arc(ex, ey, 7, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
}

function renderFrame() {
  const width = canvas.width;
  const height = canvas.height;
  const cx = width / 2;
  const cy = height / 2;

  ctx.clearRect(0, 0, width, height);
  drawBackgroundStars(width, height);
  drawOrbitsAndElectrons(cx, cy, Math.min(width, height) * 0.48);
  drawNucleus(cx, cy);
}

let lastTime = performance.now();
function animate(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  state.time += dt;
  renderFrame();
  requestAnimationFrame(animate);
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

  resetButton.addEventListener("click", () => {
    state.protons = 1;
    state.neutrons = 0;
    state.electrons = 1;
    state.orbitCount = 1;
    state.speedMultiplier = Number(speedSlider.value);
    state.time = 0;
    updateElementInfo();
  });

  window.addEventListener("resize", () => {
    ensureCanvasSize();
  });
}

function init() {
  ensureCanvasSize();
  setupDragAndDrop();
  setupControls();
  updateElementInfo();
  speedValue.textContent = `${Number(speedSlider.value).toFixed(1)}x`;
  requestAnimationFrame(animate);
}

init();
