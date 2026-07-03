// Logika platformy: mapa, filtry, kalendarz, liczniki, pinezki, porównanie
// ============================================================================
// TOPOJSON WORLD BOUNDARIES (Natural Earth 110m, ~108KB)
// ============================================================================


// Minimal topojson->geojson decoder (based on topojson-client public algorithm)
function topojsonFeature(topology, name) {
  const o = topology.objects[name];
  const arcs = topology.arcs;
  const {scale, translate} = topology.transform;
  const decoded = arcs.map(arc => {
    let x = 0, y = 0;
    return arc.map(p => {
      x += p[0]; y += p[1];
      return [x * scale[0] + translate[0], y * scale[1] + translate[1]];
    });
  });
  function getArc(i) {
    return i < 0 ? decoded[~i].slice().reverse() : decoded[i];
  }
  function ring(ringArcs) {
    const pts = [];
    ringArcs.forEach((ai, idx) => {
      const a = getArc(ai);
      pts.push(...(idx === 0 ? a : a.slice(1)));
    });
    return pts;
  }
  function polygon(rings) { return rings.map(ring); }
  function convertGeom(g) {
    if (g.type === "Polygon") return { type: "Polygon", coordinates: polygon(g.arcs) };
    if (g.type === "MultiPolygon") return { type: "MultiPolygon", coordinates: g.arcs.map(polygon) };
    return null;
  }
  const feats = o.geometries.map(g => ({
    type: "Feature",
    id: g.id,
    properties: g.properties,
    geometry: convertGeom(g),
  })).filter(f => f.geometry);
  return { type: "FeatureCollection", features: feats };
}

const WORLD = topojsonFeature(TOPO, "countries");

// ============================================================================
// PROGRAMS — rozszerzone o category, amountEurMax, i dodatkowe pola (whatCovered,
// ownContribution, duration, trl, budgetTotal, procedure).
// ============================================================================
// Schema: {name, shortName, organizer, country, cc, region, lat, lng,
//   applyOpen, applyDeadline, status, amount, amountEurMax, currency, category,
//   fundingType, forWhom, requirements, description, details,
//   whatCovered, ownContribution, duration, trl, budgetTotal, procedure,
//   url, tags}
// ============================================================================


// ============================================================================
// UI STATE + init
// ============================================================================
document.getElementById("loaded-count").textContent = P.length;
document.getElementById("aggs-count").textContent = AGGS.length;

const state = {
  region: "ALL", country: "ALL", tag: "ALL", category: "ALL", amount: "ALL",
  stage: "ALL", access: "ALL",
  query: "", onlyConfirmed: false, month: null, selectedId: null,
};

// Ikony kategorii/branż (do listy i szczegółów)
const CATEGORY_ICON = {
  "Grant B+R": "🧪", "Grant komercjalizacyjny": "📦", "Grant pre-seed / seed": "🌱",
  "Stypendium": "🎓", "Akceleracja + grant": "🚀", "Grant sektorowy": "🎯",
  "Matching grant": "🤝", "Blended finance": "💠",
};
const TAG_ICON = {
  "AI":"🤖","deeptech":"🔬","biotech":"🧬","healthtech":"💊","medtech":"🩺",
  "cleantech":"🌱","space":"🚀","fintech":"💰","quantum":"⚛️","cyber":"🛡️",
  "offshore":"🌊","OZE":"☀️","defense":"🛡️","agritech":"🌾","robotics":"🦾",
  "wydarzenie":"🎤","hackathon":"⚡","climate":"🌍","food":"🥗","mobility":"🚗",
};
function iconsFor(p) {
  const set = new Set();
  set.add(CATEGORY_ICON[p.category] || "📄");
  p.tags.forEach(t => { if (TAG_ICON[t]) set.add(TAG_ICON[t]); });
  return [...set].slice(0, 4).join(" ");
}
const STAGE_ICON = { IDEA: "💡", NEW: "🚀", OPERATING: "📈", SCALEUP: "🌐", ANY: "◆" };
const STAGE_LABEL = { IDEA: "Pomysł (bez firmy)", NEW: "Nowa firma", OPERATING: "Działająca firma", SCALEUP: "Skalowanie", ANY: "Każdy etap" };
const ACCESS_ICON = { OK: "🇵🇱", RELOCATE: "✈️", NO: "⛔" };
const ACCESS_LABEL = {
  OK: "Polak z PL może aplikować bez relokacji",
  RELOCATE: "Wymaga założenia oddziału / relokacji do kraju programu",
  NO: "Praktycznie niedostępne dla Polaka z PL",
};

// Reguły inferencji dla programów bez explicit set
const EU_WIDE_ORGANIZERS = ["European Innovation Council","European Commission","Eureka Network","EIT Digital","EIT Health","European Commission (HaDEA)"];
function inferAccess(p) {
  if (p.polishAccess) return p.polishAccess;
  if (p.region === "PL") return "OK";
  if (p.cc === "EU" || EU_WIDE_ORGANIZERS.includes(p.organizer)) return "OK";
  return "RELOCATE"; // krajowe programy zewnętrzne wymagają rezydencji/oddziału
}
function inferStage(p) {
  if (p.stage) return p.stage;
  const c = p.category || "";
  const t = (p.tags || []).join(" ");
  if (c === "Stypendium" || t.includes("pomysł") || t.includes("pre-seed")) return "IDEA";
  if (c.includes("pre-seed / seed") || t.includes("seed") || t.includes("first-time")) return "NEW";
  if (c.includes("komercjalizacyjny") || c.includes("Blended") || t.includes("scale") || t.includes("ekspansja")) return "SCALEUP";
  if (c.includes("B+R") || c.includes("sektorowy") || c.includes("Matching")) return "OPERATING";
  return "NEW";
}

// bookmark storage
const STORAGE_KEY = "grant-atlas-bookmarks-v1";
function loadBookmarks() {
  try { return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")); }
  catch { return new Set(); }
}
function saveBookmarks() { localStorage.setItem(STORAGE_KEY, JSON.stringify([...bookmarks])); }
let bookmarks = loadBookmarks();

// Assign stable id + backfill pochodne pola (wywoływane w boot(), po ewentualnym
// nadpisaniu P danymi z API — dzięki temu ta sama strona działa statycznie i jako front API)
function prepareData() {
  P.forEach((p, i) => {
    if (!p.id) p.id = "p" + i;
    p.polishAccess = inferAccess(p);
    p.stage = inferStage(p);
  });
}

// populate country + tag + category selects
function populateSelects() {
  const countries = [...new Map(P.map(p => [p.cc, p.country]))].sort((a,b) => a[1].localeCompare(b[1]));
  const cs = document.getElementById("sel-country");
  countries.forEach(([cc, name]) => {
    const o = document.createElement("option"); o.value = cc; o.textContent = name; cs.appendChild(o);
  });
  const tags = [...new Set(P.flatMap(p => p.tags))].sort();
  const ts = document.getElementById("sel-tag");
  tags.forEach(t => { const o = document.createElement("option"); o.value = t; o.textContent = t; ts.appendChild(o); });
  const categories = [...new Set(P.map(p => p.category))].sort();
  const cats = document.getElementById("sel-category");
  categories.forEach(c => { const o = document.createElement("option"); o.value = c; o.textContent = c; cats.appendChild(o); });
}

const MONTHS_PL = ["styczeń","luty","marzec","kwiecień","maj","czerwiec","lipiec","sierpień","wrzesień","październik","listopad","grudzień"];
function monthKey(iso) {
  const d = new Date(iso);
  return d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, "0");
}
const RANGE = (() => {
  const out = [];
  for (let i = 0; i < 13; i++) {
    const d = new Date(Date.UTC(2026, 7 + i, 1));
    out.push({ key: d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, "0"),
               label: MONTHS_PL[d.getUTCMonth()] + " " + d.getUTCFullYear() });
  }
  return out;
})();

function buildCalendar() {
  const counts = new Map();
  for (const p of P) {
    if (!p.applyDeadline) continue;
    const k = monthKey(p.applyDeadline);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const grid = document.getElementById("cal-grid");
  grid.innerHTML = "";
  RANGE.forEach(m => {
    const n = counts.get(m.key) ?? 0;
    const btn = document.createElement("button");
    btn.className = "cal-cell" + (n === 0 ? " empty" : "");
    btn.dataset.key = m.key;
    btn.innerHTML = '<div class="cal-month">' + m.label + '</div>' +
                    '<div class="cal-count">' + n + ' ' + (n === 1 ? "termin" : "terminów") + '</div>';
    btn.addEventListener("click", () => { state.month = state.month === m.key ? null : m.key; render(); });
    grid.appendChild(btn);
  });
}

// ============================================================================
// MAP RENDERING (SVG + Natural Earth 110m paths)
// ============================================================================
// Kadrujemy do zamieszkanych szerokości (84°N…58°S) — bez pustych biegunów i Antarktydy
const MAP_W = 1000, LAT_MAX = 84, LAT_MIN = -58;
const MAP_H = Math.round((LAT_MAX - LAT_MIN) / 360 * MAP_W); // = 395 (spójne z viewBox)
let mapZoom = 1, mapPanX = 0, mapPanY = 0;

function proj(lat, lng) {
  return {
    x: (lng + 180) / 360 * MAP_W,
    y: (LAT_MAX - lat) / (LAT_MAX - LAT_MIN) * MAP_H,
  };
}

// ISO2 → ISO 3166-1 numeric (id w world-atlas topojson) — do podświetlania krajów z programami
const ISO2_NUM = {
  PL:"616", DE:"276", FR:"250", ES:"724", IT:"380", NL:"528", BE:"056", GB:"826",
  IE:"372", SE:"752", DK:"208", FI:"246", NO:"578", EE:"233", LT:"440", LV:"428",
  CZ:"203", SK:"703", HU:"348", PT:"620", AT:"040", CH:"756", RO:"642", GR:"300",
  US:"840", CA:"124", MX:"484", BR:"076", CL:"152", AR:"032", CO:"170", PE:"604",
  IL:"376", AE:"784", SA:"682", QA:"634", TR:"792", EG:"818", BH:"048", JO:"400",
  ZA:"710", NG:"566", KE:"404", RW:"646", MA:"504", JP:"392", KR:"410", SG:"702",
  IN:"356", VN:"704", ID:"360", TH:"764", MY:"458", TW:"158", PH:"608", AU:"036", NZ:"554",
};
const NUM_ISO2 = Object.fromEntries(Object.entries(ISO2_NUM).map(([a, b]) => [String(Number(b)), a]));

// Rozsuwanie markerów o identycznych współrzędnych (np. wiele programów w Warszawie/Brukseli)
function spreadMarkers(programs) {
  const groups = new Map();
  programs.forEach(p => {
    const key = p.lat.toFixed(2) + "," + p.lng.toFixed(2);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  });
  const out = new Map(); // id -> {x, y}
  groups.forEach(group => {
    group.forEach((p, i) => {
      const base = proj(p.lat, p.lng);
      if (group.length === 1 || i === 0) { out.set(p.id, base); return; }
      // spirala wokół punktu bazowego, promień w jednostkach mapy
      const ring = Math.ceil((Math.sqrt(4 * i + 1) - 1) / 2);
      const inRing = i - (2 * ring * (ring - 1));
      const perRing = 4 * ring;
      const angle = (inRing / perRing) * 2 * Math.PI + ring * 0.5;
      const r = 3.2 * ring;
      out.set(p.id, { x: base.x + r * Math.cos(angle), y: base.y + r * Math.sin(angle) });
    });
  });
  return out;
}

function pathFromRings(rings) {
  let d = "";
  for (const ring of rings) {
    ring.forEach((c, i) => {
      const {x, y} = proj(c[1], c[0]);
      d += (i === 0 ? "M" : "L") + x.toFixed(1) + "," + y.toFixed(1);
    });
    d += "Z";
  }
  return d;
}

function buildMap() {
  const svg = document.getElementById("map");
  svg.innerHTML = "";
  const ns = "http://www.w3.org/2000/svg";
  const rootG = document.createElementNS(ns, "g");
  rootG.setAttribute("id", "map-root");
  svg.appendChild(rootG);

  // graticule (siatka co 20°, w granicach kadru)
  const grat = document.createElementNS(ns, "g");
  grat.setAttribute("class", "graticule");
  for (let lng = -160; lng <= 160; lng += 20) {
    const {x} = proj(0, lng);
    const l = document.createElementNS(ns, "line");
    l.setAttribute("x1", x); l.setAttribute("x2", x);
    l.setAttribute("y1", 0); l.setAttribute("y2", MAP_H);
    grat.appendChild(l);
  }
  for (let lat = -40; lat <= 80; lat += 20) {
    const {y} = proj(lat, 0);
    const l = document.createElementNS(ns, "line");
    l.setAttribute("y1", y); l.setAttribute("y2", y);
    l.setAttribute("x1", 0); l.setAttribute("x2", MAP_W);
    grat.appendChild(l);
  }
  rootG.appendChild(grat);

  // countries (bez Antarktydy — poza kadrem)
  const landG = document.createElementNS(ns, "g");
  landG.setAttribute("id", "land");
  WORLD.features.forEach(f => {
    const name = (f.properties && f.properties.name) || "";
    if (name === "Antarctica") return;
    const geom = f.geometry;
    const path = document.createElementNS(ns, "path");
    let d = "";
    if (geom.type === "Polygon") d = pathFromRings(geom.coordinates);
    else if (geom.type === "MultiPolygon") d = geom.coordinates.map(pathFromRings).join("");
    path.setAttribute("d", d);
    path.setAttribute("class", "country");
    path.dataset.name = name;
    const iso2 = NUM_ISO2[String(Number(f.id))];
    if (iso2) {
      path.dataset.cc = iso2;
      path.addEventListener("click", () => {
        if (!path.classList.contains("has-programs")) return;
        // klik w kraj = przełącz filtr kraju
        state.country = state.country === iso2 ? "ALL" : iso2;
        document.getElementById("sel-country").value = state.country;
        render();
      });
    }
    const title = document.createElementNS(ns, "title");
    title.textContent = name;
    path.appendChild(title);
    landG.appendChild(path);
  });
  rootG.appendChild(landG);

  // markers — z rozsuwaniem nakładających się punktów
  const positions = spreadMarkers(P);
  const markersG = document.createElementNS(ns, "g");
  markersG.setAttribute("id", "markers");
  P.forEach(p => {
    const {x, y} = positions.get(p.id);
    const c = document.createElementNS(ns, "circle");
    c.setAttribute("cx", x); c.setAttribute("cy", y);
    c.setAttribute("r", 4.5);
    c.setAttribute("fill", p.region === "PL" ? "var(--pl)" : p.region === "EU" ? "var(--eu)" : "var(--world)");
    c.setAttribute("stroke", "rgba(255,255,255,0.85)");
    c.setAttribute("stroke-width", "1.5");
    c.setAttribute("class", "marker");
    c.setAttribute("data-id", p.id);
    c.addEventListener("click", (e) => { e.stopPropagation(); selectProgram(p.id); });
    const title = document.createElementNS(ns, "title");
    title.textContent = p.name + " · " + p.country;
    c.appendChild(title);
    markersG.appendChild(c);
  });
  rootG.appendChild(markersG);

  applyMapTransform(true);
}

// Podświetlenie krajów, w których są programy pasujące do filtrów
function highlightCountries(matchedPrograms) {
  const counts = new Map();
  matchedPrograms.forEach(p => counts.set(p.cc, (counts.get(p.cc) ?? 0) + 1));
  document.querySelectorAll(".country").forEach(c => {
    const cc = c.dataset.cc;
    const n = cc ? (counts.get(cc) ?? 0) : 0;
    c.classList.toggle("has-programs", n > 0);
    c.classList.toggle("active-country", !!cc && state.country === cc);
    const t = c.querySelector("title");
    if (t) t.textContent = c.dataset.name + (n > 0 ? ` — ${n} ${n === 1 ? "program" : "programów"} (kliknij, by filtrować)` : "");
  });
}

const MAX_ZOOM = 10;

function clampPan() {
  // Nie pozwól wyjechać mapą poza viewport
  mapPanX = Math.min(0, Math.max(MAP_W * (1 - mapZoom), mapPanX));
  mapPanY = Math.min(0, Math.max(MAP_H * (1 - mapZoom), mapPanY));
}

function applyMapTransform(instant) {
  clampPan();
  const root = document.getElementById("map-root");
  if (root) {
    // CSS transform (zamiast atrybutu SVG) — dzięki temu zoom animuje się płynnie
    root.style.transformOrigin = "0 0";
    root.style.transition = (instant || panStart) ? "none" : "transform 180ms ease-out";
    root.style.transform = `translate(${mapPanX}px, ${mapPanY}px) scale(${mapZoom})`;
  }
  // markery zachowują stały rozmiar ekranowy niezależnie od zoomu
  const r = 4.5 / Math.sqrt(mapZoom);
  const sw = 1.5 / Math.sqrt(mapZoom);
  document.querySelectorAll(".marker").forEach(m => {
    const sel = m.classList.contains("selected");
    m.setAttribute("r", sel ? r * 1.6 : r);
    m.setAttribute("stroke-width", m.classList.contains("saved") ? sw * 1.8 : sw);
  });
}

// zoom w kierunku punktu (świat SVG): utrzymuje punkt pod kursorem w miejscu
function zoomAt(worldX, worldY, factor) {
  const newZoom = Math.max(1, Math.min(MAX_ZOOM, mapZoom * factor));
  const k = newZoom / mapZoom;
  mapPanX = worldX - k * (worldX - mapPanX);
  mapPanY = worldY - k * (worldY - mapPanY);
  mapZoom = newZoom;
  if (mapZoom === 1) { mapPanX = 0; mapPanY = 0; }
  applyMapTransform();
}

function svgPoint(e) {
  const rect = svg.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) / rect.width * MAP_W,
    y: (e.clientY - rect.top) / rect.height * MAP_H,
  };
}

document.getElementById("zoom-in").addEventListener("click", () => zoomAt(MAP_W / 2, MAP_H / 2, 1.5));
document.getElementById("zoom-out").addEventListener("click", () => zoomAt(MAP_W / 2, MAP_H / 2, 1 / 1.5));
document.getElementById("zoom-reset").addEventListener("click", () => { mapZoom = 1; mapPanX = 0; mapPanY = 0; applyMapTransform(); });

let panStart = null;
const svg = document.getElementById("map");
svg.addEventListener("pointerdown", (e) => {
  panStart = { x: e.clientX, y: e.clientY, px: mapPanX, py: mapPanY };
  svg.setPointerCapture(e.pointerId);
});
svg.addEventListener("pointermove", (e) => {
  if (!panStart) return;
  const rect = svg.getBoundingClientRect();
  mapPanX = panStart.px + (e.clientX - panStart.x) / rect.width * MAP_W;
  mapPanY = panStart.py + (e.clientY - panStart.y) / rect.height * MAP_H;
  applyMapTransform();
});
svg.addEventListener("pointerup", () => { panStart = null; });
svg.addEventListener("pointercancel", () => { panStart = null; });
svg.addEventListener("wheel", (e) => {
  e.preventDefault();
  const pt = svgPoint(e);
  zoomAt(pt.x, pt.y, e.deltaY > 0 ? 1 / 1.25 : 1.25);
}, { passive: false });
svg.addEventListener("dblclick", (e) => {
  const pt = svgPoint(e);
  zoomAt(pt.x, pt.y, 1.8);
});

// ============================================================================
// FILTER + RENDER
// ============================================================================
function filtered() {
  return P.filter(p => {
    if (state.region === "SAVED") {
      if (!bookmarks.has(p.id)) return false;
    } else if (state.region !== "ALL" && p.region !== state.region) return false;
    if (state.country !== "ALL" && p.cc !== state.country) return false;
    if (state.tag !== "ALL" && !p.tags.includes(state.tag)) return false;
    if (state.category !== "ALL" && p.category !== state.category) return false;
    if (state.amount !== "ALL") {
      const a = p.amountEurMax || 0;
      if (state.amount === "lt50" && a >= 50000) return false;
      if (state.amount === "50to500" && (a < 50000 || a > 500000)) return false;
      if (state.amount === "500to5m" && (a < 500000 || a > 5000000)) return false;
      if (state.amount === "gt5m" && a <= 5000000) return false;
    }
    if (state.stage !== "ALL" && p.stage !== state.stage) return false;
    if (state.access !== "ALL" && p.polishAccess !== state.access) return false;
    if (state.onlyConfirmed && p.status !== "CONFIRMED") return false;
    if (state.query) {
      const q = state.query.toLowerCase();
      const hay = [p.name, p.shortName, p.organizer, p.country, p.description, p.tags.join(" "), p.category]
        .filter(Boolean).join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (state.month) {
      if (!p.applyDeadline) return false;
      if (monthKey(p.applyDeadline) !== state.month) return false;
    }
    return true;
  });
}

function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return String(d.getUTCDate()).padStart(2,"0") + "." + String(d.getUTCMonth()+1).padStart(2,"0") + "." + d.getUTCFullYear();
}

// ── Liczniki dni do startu naboru i do deadline'u ──
function daysFromToday(iso) {
  if (!iso) return null;
  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(iso).getTime();
  return Math.ceil((target - today) / 86400000);
}
// Zwraca { html, cls } — krótki licznik do listy/tabeli
function countdown(p) {
  const dOpen = daysFromToday(p.applyOpen);
  const dEnd = daysFromToday(p.applyDeadline);
  if (p.status === "ROLLING" && !p.applyDeadline) return { html: "♾️ nabór ciągły", cls: "cd-rolling" };
  if (dEnd !== null && dEnd < 0) return { html: "⏹ nabór zakończony", cls: "cd-closed" };
  if (dOpen !== null && dOpen > 0) {
    let s = "🔜 start za " + dOpen + " dni";
    if (dEnd !== null) s += " · koniec za " + dEnd + " dni";
    return { html: s, cls: "cd-upcoming" };
  }
  if (dEnd !== null) {
    if (dEnd === 0) return { html: "🔥 DZIŚ ostatni dzień!", cls: "cd-urgent" };
    if (dEnd <= 14) return { html: "🔥 zostało " + dEnd + " dni", cls: "cd-urgent" };
    return { html: "⏳ zostało " + dEnd + " dni", cls: "cd-open" };
  }
  return { html: "", cls: "" };
}

function updateSavedCount() {
  const el = document.getElementById("saved-count");
  if (bookmarks.size > 0) { el.style.display = "inline-block"; el.textContent = bookmarks.size; }
  else el.style.display = "none";
}

function render() {
  const list = filtered();
  const ids = new Set(list.map(p => p.id));

  document.querySelectorAll(".marker").forEach(m => {
    const id = m.dataset.id;
    m.classList.toggle("dimmed", !ids.has(id));
    m.classList.toggle("selected", id === state.selectedId);
    m.classList.toggle("saved", bookmarks.has(id));
  });

  document.querySelectorAll(".cal-cell").forEach(c => {
    c.classList.toggle("active", c.dataset.key === state.month);
  });
  document.getElementById("cal-clear").classList.toggle("on", !!state.month);

  const ul = document.getElementById("list");
  ul.innerHTML = "";
  document.getElementById("result-count").textContent = list.length;
  if (list.length === 0) {
    const li = document.createElement("li");
    li.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--muted); font-size: 13px;">Brak wyników — rozluźnij filtry.</div>';
    ul.appendChild(li);
  } else {
    list.forEach(p => {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      if (p.id === state.selectedId) btn.classList.add("selected");
      const saved = bookmarks.has(p.id);
      btn.innerHTML =
        '<span class="pin ' + p.region.toLowerCase() + '">' + p.cc + '</span>' +
        '<span><span class="row-name">' + escapeHTML(p.name) + '</span>' +
        '<span class="row-sub">' + escapeHTML(p.country) + ' · ' + escapeHTML(p.organizer) + '</span>' +
        '<span class="row-icons">' + STAGE_ICON[p.stage] + ' ' + ACCESS_ICON[p.polishAccess] + ' ' + iconsFor(p) + '</span></span>' +
        '<span class="row-date">' + (p.applyDeadline ? fmtDate(p.applyDeadline) : "ciągły") +
          (() => { const c = countdown(p); return c.html ? '<span class="cd ' + c.cls + '" style="display:block">' + c.html + '</span>' : ""; })() + '</span>' +
        '<button class="row-star ' + (saved ? "on" : "") + '" title="' + (saved ? "Usuń pinezkę" : "Dodaj pinezkę") + '">' + (saved ? "📌" : "📍") + '</button>';
      btn.addEventListener("click", (e) => {
        if (e.target.classList.contains("row-star")) { toggleBookmark(p.id); return; }
        selectProgram(p.id);
      });
      li.appendChild(btn);
      ul.appendChild(li);
    });
  }

  applyMapTransform(true); // odśwież rozmiary markerów po zmianie klas selected/saved
  highlightCountries(list);
  renderDetail();
  renderSavedView();
  renderCompareTable();
  updateSavedCount();
}

function renderCompareTable() {
  const wrap = document.getElementById("compare-wrap");
  const cnt = document.getElementById("compare-count");
  if (!wrap) return;
  const saved = P.filter(p => bookmarks.has(p.id));
  cnt.textContent = saved.length;
  if (saved.length === 0) {
    wrap.innerHTML = '<div class="compare-empty">Przypnij programy ikoną 📍 (w liście wyników lub w panelu szczegółów), a pojawią się tutaj w tabeli porównawczej.</div>';
    return;
  }
  const rows = saved.map(p =>
    '<tr>' +
      '<td class="name-cell"><button onclick="selectProgram(\'' + p.id + '\')">' + escapeHTML(p.shortName || p.name) + '</button>' +
        '<div class="sub">' + escapeHTML(p.organizer) + '</div></td>' +
      '<td>' + escapeHTML(p.country) + '</td>' +
      '<td class="num">' + (p.applyDeadline ? fmtDate(p.applyDeadline) : "ciągły") +
        (() => { const c = countdown(p); return c.html ? '<div class="cd ' + c.cls + '">' + c.html + '</div>' : ""; })() + '</td>' +
      '<td>' + STATUS_LABEL[p.status] + '</td>' +
      '<td>' + escapeHTML(p.amount) + '</td>' +
      '<td>' + (CATEGORY_ICON[p.category] || "") + ' ' + escapeHTML(p.category) + '</td>' +
      '<td>' + STAGE_ICON[p.stage] + ' ' + STAGE_LABEL[p.stage] + '</td>' +
      '<td>' + ACCESS_ICON[p.polishAccess] + '</td>' +
      '<td>' + escapeHTML(p.ownContribution || "—") + '</td>' +
      '<td><a href="' + p.url + '" target="_blank" rel="noopener">strona ↗</a></td>' +
      '<td><button class="unpin" title="Usuń z zapisanych" onclick="toggleBookmark(\'' + p.id + '\')">✕</button></td>' +
    '</tr>'
  ).join("");
  wrap.innerHTML =
    '<table class="compare"><thead><tr>' +
      '<th>Program</th><th>Kraj</th><th>Deadline</th><th>Status</th><th>Kwota</th>' +
      '<th>Rodzaj</th><th>Etap</th><th>🇵🇱</th><th>Wkład własny</th><th>Link</th><th></th>' +
    '</tr></thead><tbody>' + rows + '</tbody></table>';
}

const STATUS_LABEL = {
  CONFIRMED: "Termin potwierdzony", INDICATIVE: "Termin planowany (do potwierdzenia)", ROLLING: "Nabór ciągły"
};
const REGION_LABEL = { PL: "Polska", EU: "Europa / UE", WORLD: "Świat" };

function renderDetail() {
  const el = document.getElementById("detail");
  const p = P.find(x => x.id === state.selectedId);
  if (!p) {
    el.innerHTML = '<div class="detail-empty"><div class="big">◍</div>' +
      'Wybierz marker na mapie, pozycję z listy albo miesiąc w kalendarzu —<br/>szczegóły programu pojawią się tutaj.</div>';
    return;
  }
  const saved = bookmarks.has(p.id);
  const badges =
    '<span class="badge status-' + p.status + '">' + STATUS_LABEL[p.status] + '</span>' +
    '<span class="badge category">' + (CATEGORY_ICON[p.category] || "") + " " + escapeHTML(p.category) + '</span>' +
    '<span class="badge stage stage-' + p.stage + '" title="Etap firmy">' + STAGE_ICON[p.stage] + " " + STAGE_LABEL[p.stage] + '</span>' +
    '<span class="badge access-' + p.polishAccess + '" title="Dostępność dla Polaka z PL">' + ACCESS_ICON[p.polishAccess] + " " + ACCESS_LABEL[p.polishAccess] + '</span>' +
    p.tags.map(t => '<span class="badge">' + (TAG_ICON[t] ? TAG_ICON[t] + " " : "") + escapeHTML(t) + '</span>').join("");
  const optionalField = (k, v) => v ? '<div class="section"><h4>' + k + '</h4><p>' + escapeHTML(v) + '</p></div>' : "";
  el.innerHTML =
    '<button class="close" aria-label="zamknij" onclick="deselect()">×</button>' +
    '<div class="detail-head">' +
      '<div class="detail-eyebrow">' + REGION_LABEL[p.region] + ' · ' + escapeHTML(p.country) + '</div>' +
      '<h2 class="detail-title">' + escapeHTML(p.name) + '</h2>' +
      '<div class="detail-org">' + escapeHTML(p.organizer) + '</div>' +
    '</div>' +
    '<div class="badges">' + badges + '</div>' +
    '<div class="kv">' +
      (p.applyOpen ? '<div><div class="k">Nabór od</div><div class="v">' + fmtDate(p.applyOpen) + '</div></div>' : "") +
      (p.applyDeadline ? '<div><div class="k">Deadline</div><div class="v big">' + fmtDate(p.applyDeadline) + '</div></div>' : "") +
      '<div><div class="k">Kwota</div><div class="v">' + escapeHTML(p.amount) + '</div></div>' +
      '<div><div class="k">Typ finansowania</div><div class="v">' + escapeHTML(p.fundingType) + '</div></div>' +
      (p.duration ? '<div><div class="k">Długość trwania</div><div class="v">' + escapeHTML(p.duration) + '</div></div>' : "") +
      (p.trl ? '<div><div class="k">Poziom TRL</div><div class="v">' + escapeHTML(p.trl) + '</div></div>' : "") +
      (p.ownContribution ? '<div><div class="k">Wkład własny</div><div class="v">' + escapeHTML(p.ownContribution) + '</div></div>' : "") +
      (p.budgetTotal ? '<div><div class="k">Budżet konkursu</div><div class="v">' + escapeHTML(p.budgetTotal) + '</div></div>' : "") +
    '</div>' +
    (() => {
      const c = countdown(p);
      const dOpen = daysFromToday(p.applyOpen);
      let extra = "";
      if (dOpen !== null && dOpen > 0) extra = '<span class="cd cd-upcoming">🔜 do startu naboru: ' + dOpen + ' dni</span> ';
      return c.html ? '<div style="margin: 4px 0 8px">' + extra + '<span class="cd ' + c.cls + '">' + c.html + '</span></div>' : "";
    })() +
    optionalField("Dla kogo", p.forWhom) +
    optionalField("Wymagania", p.requirements) +
    optionalField("Opis", p.description) +
    optionalField("Dokładne informacje", p.details) +
    optionalField("Co można sfinansować", p.whatCovered) +
    optionalField("Procedura aplikacji", p.procedure) +
    '<div class="cta-row">' +
      '<a class="cta" href="' + p.url + '" target="_blank" rel="noopener">Oficjalna strona ↗</a>' +
      '<button class="cta cta-save ' + (saved ? "on" : "") + '" onclick="toggleBookmark(\'' + p.id + '\')">' +
        (saved ? "📌 Usuń pinezkę" : "📍 Przypnij") + '</button>' +
    '</div>';
}

function deselect() { state.selectedId = null; render(); }
window.deselect = deselect;
window.toggleBookmark = toggleBookmark;

function selectProgram(id) { state.selectedId = id; render(); }

function toggleBookmark(id) {
  if (bookmarks.has(id)) bookmarks.delete(id);
  else bookmarks.add(id);
  saveBookmarks();
  render();
}

function renderSavedView() {
  const el = document.getElementById("saved-content");
  if (!el) return;
  const saved = P.filter(p => bookmarks.has(p.id));
  if (saved.length === 0) {
    el.innerHTML = '<div style="padding: 40px 20px; text-align:center; color: var(--muted); font-size: 13px;">Nie masz jeszcze zapisanych programów. Przypnij dowolny program przez ikonę 📍 w liście lub przycisk „Przypnij" w panelu szczegółów.</div>';
    return;
  }
  el.innerHTML = '<ul class="list" style="max-height:none;">' + saved.map(p =>
    '<li><button onclick="selectProgram(\'' + p.id + '\'); switchTab(\'atlas\')">' +
      '<span class="pin ' + p.region.toLowerCase() + '">' + p.cc + '</span>' +
      '<span><span class="row-name">' + escapeHTML(p.name) + '</span>' +
      '<span class="row-sub">' + escapeHTML(p.country) + ' · ' + escapeHTML(p.organizer) + '</span></span>' +
      '<span class="row-date">' + (p.applyDeadline ? fmtDate(p.applyDeadline) : "ciągły") + '</span>' +
      '<span class="row-star on" onclick="event.stopPropagation(); toggleBookmark(\'' + p.id + '\')">📌</span>' +
    '</button></li>'
  ).join("") + '</ul>';
}
window.selectProgram = selectProgram;
window.switchTab = switchTab;

function escapeHTML(s) {
  if (s == null) return "";
  return String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}

// filter wiring
document.querySelectorAll("#chips-region .chip").forEach(c => {
  c.addEventListener("click", () => {
    document.querySelectorAll("#chips-region .chip").forEach(x => x.classList.remove("active"));
    c.classList.add("active");
    state.region = c.dataset.r; render();
  });
});
document.getElementById("sel-country").addEventListener("change", e => { state.country = e.target.value; render(); });
document.getElementById("sel-category").addEventListener("change", e => { state.category = e.target.value; render(); });
document.getElementById("sel-stage").addEventListener("change", e => { state.stage = e.target.value; render(); });
document.getElementById("sel-access").addEventListener("change", e => { state.access = e.target.value; render(); });
document.getElementById("sel-amount").addEventListener("change", e => { state.amount = e.target.value; render(); });
document.getElementById("sel-tag").addEventListener("change", e => { state.tag = e.target.value; render(); });
document.getElementById("inp-search").addEventListener("input", e => { state.query = e.target.value; render(); });
document.getElementById("chk-confirmed").addEventListener("change", e => { state.onlyConfirmed = e.target.checked; render(); });
document.getElementById("cal-clear").addEventListener("click", () => { state.month = null; render(); });
document.getElementById("btn-reset").addEventListener("click", () => {
  Object.assign(state, { region:"ALL", country:"ALL", tag:"ALL", category:"ALL", amount:"ALL", stage:"ALL", access:"ALL", query:"", onlyConfirmed:false, month:null });
  document.querySelectorAll("#chips-region .chip").forEach(x => x.classList.remove("active"));
  document.querySelector('#chips-region .chip[data-r="ALL"]').classList.add("active");
  document.getElementById("sel-country").value = "ALL";
  document.getElementById("sel-category").value = "ALL";
  document.getElementById("sel-amount").value = "ALL";
  document.getElementById("sel-stage").value = "ALL";
  document.getElementById("sel-access").value = "ALL";
  document.getElementById("sel-tag").value = "ALL";
  document.getElementById("inp-search").value = "";
  document.getElementById("chk-confirmed").checked = false;
  render();
});

// tab switching
function switchTab(tab) {
  document.querySelectorAll(".tab-link").forEach(x => x.classList.remove("active"));
  document.querySelector('.tab-link[data-tab="' + tab + '"]').classList.add("active");
  document.getElementById("view-atlas").style.display = tab === "atlas" ? "" : "none";
  document.getElementById("view-saved").style.display = tab === "saved" ? "grid" : "none";
  document.getElementById("view-aggs").style.display = tab === "aggs" ? "grid" : "none";
}
document.querySelectorAll(".tab-link").forEach(a => {
  a.addEventListener("click", e => { e.preventDefault(); switchTab(a.dataset.tab); });
});

// aggregators view — grouped
{
  const groups = { PL: [], EU: [], EUR_COUNTRY: [], ASIA: [], MENA: [], NAMER: [] };
  AGGS.forEach(a => (groups[a[3]] || []).push(a));
  const groupLabel = {
    PL: "🇵🇱 Polska",
    EU: "🇪🇺 Unia Europejska / UE ogólne",
    EUR_COUNTRY: "🇪🇺 Kraje europejskie — osobno",
    ASIA: "🌏 Azja",
    MENA: "🕌 Bliski Wschód i Afryka Północna",
    NAMER: "🌎 Ameryka Północna",
  };
  const root = document.getElementById("aggs-groups");
  ["PL","EU","EUR_COUNTRY","ASIA","MENA","NAMER"].forEach(k => {
    const g = document.createElement("div");
    g.className = "agg-group";
    g.innerHTML = '<h3>' + groupLabel[k] + ' <span class="cnt">(' + groups[k].length + ')</span></h3>';
    root.appendChild(g);
    if (k === "EUR_COUNTRY") {
      const bySub = new Map();
      groups[k].forEach(a => {
        const sub = a[4] || "Inne";
        if (!bySub.has(sub)) bySub.set(sub, []);
        bySub.get(sub).push(a);
      });
      [...bySub.keys()].sort().forEach(sub => {
        const s = document.createElement("div");
        s.className = "agg-subgroup";
        s.innerHTML = '<h4>' + sub + '</h4><div class="aggs"></div>';
        g.appendChild(s);
        const cont = s.querySelector(".aggs");
        bySub.get(sub).forEach(a => cont.appendChild(makeAggCard(a)));
      });
    } else {
      const cont = document.createElement("div"); cont.className = "aggs";
      g.appendChild(cont);
      groups[k].forEach(a => cont.appendChild(makeAggCard(a)));
    }
  });
}
function makeAggCard(a) {
  const card = document.createElement("div");
  card.className = "agg";
  card.innerHTML =
    '<a href="' + a[1] + '" target="_blank" rel="noopener">' +
      '<div class="agg-name">' + escapeHTML(a[0]) + ' ↗</div></a>' +
    '<div class="agg-country">' + escapeHTML(a[2]) + '</div>' +
    '<div class="agg-desc">' + escapeHTML(a[5]) + '</div>';
  return card;
}

// init — najpierw próba pobrania danych z API (pełna platforma / panel admin),
// fallback: dane wbudowane w plik (wersja statyczna, np. GitHub Pages)
async function boot() {
  let apiMode = false;
  try {
    const res = await fetch("/api/programs", { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        P.length = 0;
        data.forEach(p => P.push(p));
        document.getElementById("loaded-count").textContent = P.length;
        apiMode = true;
      }
    }
  } catch (_) { /* brak API = tryb statyczny */ }
  const note = document.getElementById("mode-note");
  if (note) {
    if (apiMode) {
      note.innerHTML = '<strong>✅ Pełna aplikacja (Next.js + API).</strong> Dane serwowane z backendu — ' +
        'panel <a href="/admin">admin</a> pozwala dodawać i edytować programy (po podpięciu bazy Postgres). ' +
        'Pinezki 📌 zapisywane w Twojej przeglądarce.';
      note.style.background = "rgba(52,211,153,0.08)";
      note.style.borderColor = "rgba(52,211,153,0.3)";
      note.style.borderLeftColor = "#34d399";
      note.style.color = "#6ee7b7";
    } else {
      note.innerHTML = '<strong>Wersja statyczna (GitHub Pages).</strong> Wszystkie funkcje działają; ' +
        'dane wbudowane w stronę. Pełna wersja z backendem i panelem admin — po zdeployowaniu repo ' +
        '<em>michalox227/GRANT</em> na Vercel. Pinezki 📌 zapisywane w Twojej przeglądarce.';
    }
  }
  prepareData();
  populateSelects();
  buildMap();
  buildCalendar();
  render();
}
boot();
