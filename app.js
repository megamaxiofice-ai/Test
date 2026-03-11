const EUROPEAN_COUNTRIES = [
  "Albania", "Andorra", "Austria", "Belarus", "Belgium", "Bosnia and Herzegovina", "Bulgaria",
  "Croatia", "Czechia", "Denmark", "Estonia", "Finland", "France", "Germany", "Greece",
  "Hungary", "Iceland", "Ireland", "Italy", "Kosovo", "Latvia", "Liechtenstein", "Lithuania",
  "Luxembourg", "Malta", "Moldova", "Monaco", "Montenegro", "Netherlands", "North Macedonia",
  "Norway", "Poland", "Portugal", "Romania", "San Marino", "Serbia", "Slovakia", "Slovenia",
  "Spain", "Sweden", "Switzerland", "Ukraine", "United Kingdom", "Vatican City"
];

const state = {
  date: new Date("1936-01-01"),
  speed: 0,
  selectedCountry: null,
  resources: {
    factoriesCivil: 10,
    factoriesMilitary: 5,
    steel: 30,
    oil: 20,
    manpower: 250000,
    politicalPower: 150,
  },
  focus: { active: false, progress: 0, duration: 70 },
  research: { active: null, progress: 0 },
  military: { divisions: 12, infantryEquipment: 2500 },
  relations: {},
  mapLayer: null,
};

const map = L.map("map", { zoomControl: true }).setView([52, 15], 4);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap contributors",
}).addTo(map);

const refs = {
  countrySelect: document.getElementById("countrySelect"),
  selectedCountryInfo: document.getElementById("selectedCountryInfo"),
  dateDisplay: document.getElementById("dateDisplay"),
  speedInfo: document.getElementById("speedInfo"),
  resourceList: document.getElementById("resourceList"),
  focusProgress: document.getElementById("focusProgress"),
  researchName: document.getElementById("researchName"),
  divisionCount: document.getElementById("divisionCount"),
  infantryEquipment: document.getElementById("infantryEquipment"),
  relationsList: document.getElementById("relationsList"),
  logList: document.getElementById("logList"),
};

function logEvent(text) {
  const li = document.createElement("li");
  li.className = "log-entry";
  li.textContent = `[${state.date.toLocaleDateString("pl-PL")}] ${text}`;
  refs.logList.prepend(li);
  while (refs.logList.children.length > 15) {
    refs.logList.removeChild(refs.logList.lastChild);
  }
}

function render() {
  refs.dateDisplay.textContent = state.date.toLocaleDateString("pl-PL", {
    day: "numeric", month: "long", year: "numeric"
  });
  refs.speedInfo.textContent = `Tempo: ${state.speed === 0 ? "Pauza" : `x${state.speed}`}`;

  refs.resourceList.innerHTML = "";
  Object.entries(state.resources).forEach(([key, value]) => {
    const li = document.createElement("li");
    li.textContent = `${key}: ${Math.floor(value).toLocaleString("pl-PL")}`;
    refs.resourceList.appendChild(li);
  });

  refs.focusProgress.textContent = `${state.focus.progress} / ${state.focus.duration} dni`;
  refs.researchName.textContent = state.research.active
    ? `${state.research.active.name} (${state.research.progress}/${state.research.active.duration})`
    : "Brak";
  refs.divisionCount.textContent = state.military.divisions;
  refs.infantryEquipment.textContent = Math.floor(state.military.infantryEquipment);

  refs.relationsList.innerHTML = "";
  Object.entries(state.relations).forEach(([country, relation]) => {
    const li = document.createElement("li");
    li.textContent = `${country}: ${relation}`;
    refs.relationsList.appendChild(li);
  });
}

function initCountrySelect() {
  refs.countrySelect.innerHTML = "";
  EUROPEAN_COUNTRIES.forEach((country) => {
    const option = document.createElement("option");
    option.value = country;
    option.textContent = country;
    refs.countrySelect.appendChild(option);
  });
}

async function loadMapData() {
  const response = await fetch("https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson");
  const geojson = await response.json();
  const features = geojson.features.filter((f) => EUROPEAN_COUNTRIES.includes(f.properties.ADMIN));

  state.mapLayer = L.geoJSON({ type: "FeatureCollection", features }, {
    style: (feature) => ({
      color: "#182338",
      weight: 1,
      fillColor: state.selectedCountry === feature.properties.ADMIN ? "#dd9f3b" : "#4f6ca8",
      fillOpacity: 0.7,
    }),
    onEachFeature: (feature, layer) => {
      layer.bindTooltip(feature.properties.ADMIN);
      layer.on("click", () => {
        refs.countrySelect.value = feature.properties.ADMIN;
        selectCountry(feature.properties.ADMIN);
      });
    },
  }).addTo(map);
}

function refreshMapStyles() {
  if (!state.mapLayer) return;
  state.mapLayer.setStyle((feature) => ({
    color: "#182338",
    weight: 1,
    fillColor: state.selectedCountry === feature.properties.ADMIN ? "#dd9f3b" : "#4f6ca8",
    fillOpacity: 0.7,
  }));
}

function selectCountry(country) {
  state.selectedCountry = country;
  refs.selectedCountryInfo.textContent = `Wybrano: ${country}. Ustrój: demokracja. Stabilność: 55%.`;
  state.relations = {};
  EUROPEAN_COUNTRIES.filter((c) => c !== country).slice(0, 6).forEach((c) => {
    state.relations[c] = Math.floor(Math.random() * 60) - 20;
  });
  logEvent(`Rozpoczęto kampanię jako ${country}.`);
  refreshMapStyles();
  render();
}

function gameTick() {
  if (state.speed === 0 || !state.selectedCountry) return;

  for (let i = 0; i < state.speed; i += 1) {
    state.date.setDate(state.date.getDate() + 1);
    state.resources.politicalPower += 0.15;
    state.resources.manpower += 120;
    state.military.infantryEquipment += state.resources.factoriesMilitary * 2.4;

    if (state.focus.active) {
      state.focus.progress += 1;
      if (state.focus.progress >= state.focus.duration) {
        state.focus.active = false;
        state.resources.factoriesCivil += 2;
        state.resources.factoriesMilitary += 1;
        logEvent("Ukończono cel narodowy: Industrializacja (+2 fabryki cywilne, +1 wojskowa).");
      }
    }

    if (state.research.active) {
      state.research.progress += 1;
      if (state.research.progress >= state.research.active.duration) {
        logEvent(`Zakończono badanie: ${state.research.active.name}.`);
        if (state.research.active.id === "infantry") {
          state.military.infantryEquipment += 600;
        }
        if (state.research.active.id === "industry") {
          state.resources.factoriesMilitary += 1;
        }
        state.research.active = null;
        state.research.progress = 0;
      }
    }
  }

  render();
}

setInterval(gameTick, 1000);

document.querySelectorAll(".tempo-controls button").forEach((btn) => {
  btn.addEventListener("click", () => {
    state.speed = Number(btn.dataset.speed);
    render();
  });
});

document.getElementById("startBtn").addEventListener("click", () => {
  selectCountry(refs.countrySelect.value);
});

document.getElementById("buildFactoryBtn").addEventListener("click", () => {
  if (state.resources.politicalPower < 50) return logEvent("Za mało siły politycznej (wymagane 50).");
  state.resources.politicalPower -= 50;
  state.resources.factoriesCivil += 1;
  logEvent("Wybudowano fabrykę cywilną.");
  render();
});

document.getElementById("startFocusBtn").addEventListener("click", () => {
  if (state.focus.active) return;
  state.focus.active = true;
  state.focus.progress = 0;
  logEvent("Rozpoczęto cel narodowy: Industrializacja.");
  render();
});

document.getElementById("researchInfBtn").addEventListener("click", () => {
  if (state.research.active) return;
  state.research.active = { id: "infantry", name: "Piechota I", duration: 90 };
  state.research.progress = 0;
  logEvent("Rozpoczęto badania: Piechota I.");
  render();
});

document.getElementById("researchIndustryBtn").addEventListener("click", () => {
  if (state.research.active) return;
  state.research.active = { id: "industry", name: "Narzędzia produkcji", duration: 110 };
  state.research.progress = 0;
  logEvent("Rozpoczęto badania: Narzędzia produkcji.");
  render();
});

document.getElementById("trainDivisionBtn").addEventListener("click", () => {
  if (state.military.infantryEquipment < 500 || state.resources.manpower < 10000) {
    return logEvent("Brak sprzętu lub ludzi do wyszkolenia dywizji.");
  }
  state.military.infantryEquipment -= 500;
  state.resources.manpower -= 10000;
  state.military.divisions += 1;
  logEvent("Wyszkolono nową dywizję piechoty.");
  render();
});

document.getElementById("improveRelationBtn").addEventListener("click", () => {
  const countries = Object.keys(state.relations);
  if (!countries.length) return;
  const randomCountry = countries[Math.floor(Math.random() * countries.length)];
  state.relations[randomCountry] += 10;
  logEvent(`Poprawiono relacje z ${randomCountry} o +10.`);
  render();
});

document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(`${btn.dataset.tab}Tab`).classList.add("active");
  });
});

initCountrySelect();
loadMapData().then(render);
logEvent("Silnik gry gotowy. Wybierz państwo i rozpocznij kampanię.");
