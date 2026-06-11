require("dotenv").config({ quiet: true });

const { chromium } = require("playwright");
const pdfParse = require("pdf-parse");

const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "openrouter/free";
const FANTASY_LOGIN_URL = process.env.FANTASY_LOGIN_URL || "";
const terminalLog = console.log.bind(console);
const OUTPUT_ONLY_GRID = process.env.OUTPUT_ONLY_GRID !== "0";

if (OUTPUT_ONLY_GRID) {
  console.log = () => {};
}

const CURRENT_SEASON = 2026;
const PREVIOUS_SEASON = CURRENT_SEASON - 1;
const JOLPICA_BASE_URL = "https://api.jolpi.ca/ergast/f1";
const MAX_GRID_DRIVERS = 22;

const MAX_WEB_SOURCES = 20;
const MAX_WEB_SOURCE_CHARS = 5200;
const MAX_WEB_TEXT_PER_SOURCE = 520;
const MAX_TOTAL_WEB_TEXT = 7000;
const FIA_DOCUMENTS_URL =
  "https://www.fia.com/documents/championships/fia-formula-one-world-championship-14/season/season-2026-2072";
const MAX_FIA_DOCUMENTS = 10;
const MAX_FIA_TEXT_PER_DOCUMENT = 1100;
const MAX_TOTAL_FIA_TEXT = 8000;
const SOURCE_ANALYSIS_THRESHOLD = 9000;
const SOURCE_ANALYSIS_CHUNK_CHARS = 6500;
const MAX_SOURCE_ANALYSIS_CHUNKS = 4;
const SAFETY_CAR_HISTORY_YEARS = 5;
const LIGHTS_OUT_SAFETY_CAR_CATEGORY_URL =
  "https://www.lightsoutblog.com/category/safety-car-deployments/";

const POINTS_BY_POSITION = {
  1: 25,
  2: 18,
  3: 15,
  4: 12,
  5: 10,
  6: 8,
  7: 6,
  8: 4,
  9: 2,
  10: 1,
};

const DEFAULT_PLAYER = {
  id: process.env.FANTASY_PLAYER_ID || "",
  nombre: process.env.FANTASY_PLAYER_NAME || "Jugador",
  password: null,
  rol: process.env.FANTASY_PLAYER_ROLE || "USER",
  colorGrafica: process.env.FANTASY_PLAYER_COLOR || "#000000",
  activo: null,
};

const DEFAULT_RACE_ID = process.env.FANTASY_RACE_ID || "";
const DEFAULT_LEAGUE_ID = process.env.FANTASY_LEAGUE_ID || "";

const TEAM_COLORS = {
  McLaren: "#FF8000",
  Ferrari: "#E80020",
  Mercedes: "#27F4D2",
  "Red Bull": "#3671C6",
  Williams: "#64C4FF",
  "Aston Martin": "#229971",
  Alpine: "#0093CC",
  Haas: "#B6BABD",
  "Racing Bulls": "#6692FF",
  RB: "#6692FF",
  Sauber: "#52E252",
  "Kick Sauber": "#52E252",
};

const TEAM_IDS = {
  McLaren: "mclaren",
  Ferrari: "ferrari",
  Mercedes: "mercedes",
  "Red Bull": "red_bull",
  Williams: "williams",
  "Aston Martin": "aston_martin",
  Alpine: "alpine",
  Haas: "haas",
  "Racing Bulls": "racing_bulls",
  RB: "racing_bulls",
  Sauber: "sauber",
  "Kick Sauber": "sauber",
};

const TEAM_ALIASES = {
  "mclaren formula 1 team": "McLaren",
  "scuderia ferrari": "Ferrari",
  "mercedes-amg petronas formula one team": "Mercedes",
  "mercedes amg petronas formula one team": "Mercedes",
  "red bull racing": "Red Bull",
  "oracle red bull racing": "Red Bull",
  "red bull": "Red Bull",
  "williams racing": "Williams",
  "aston martin aramco formula one team": "Aston Martin",
  "aston martin aramco": "Aston Martin",
  "aston martin": "Aston Martin",
  "bwt alpine formula one team": "Alpine",
  "moneygram haas f1 team": "Haas",
  "haas f1 team": "Haas",
  "visa cash app racing bulls f1 team": "Racing Bulls",
  "visa cash app rb": "Racing Bulls",
  "racing bulls": "Racing Bulls",
  rb: "Racing Bulls",
  "stake f1 team kick sauber": "Sauber",
  "kick sauber": "Sauber",
  sauber: "Sauber",
};

const DRIVER_OVERRIDES = {
  "andrea kimi antonelli": {
    id: "antonelli",
    nombre: "Andrea Kimi Antonelli",
    codPiloto: "ANT",
    dorsal: 12,
    nacionalidad: "Italian",
    team: "Mercedes",
  },
  "kimi antonelli": {
    id: "antonelli",
    nombre: "Andrea Kimi Antonelli",
    codPiloto: "ANT",
    dorsal: 12,
    nacionalidad: "Italian",
    team: "Mercedes",
  },
  "george russell": {
    id: "russell",
    codPiloto: "RUS",
    dorsal: 63,
    nacionalidad: "British",
    team: "Mercedes",
  },
  "lando norris": {
    id: "norris",
    codPiloto: "NOR",
    dorsal: 4,
    nacionalidad: "British",
    team: "McLaren",
  },
  "charles leclerc": {
    id: "leclerc",
    codPiloto: "LEC",
    dorsal: 16,
    nacionalidad: "Monegasque",
    team: "Ferrari",
  },
  "oscar piastri": {
    id: "piastri",
    codPiloto: "PIA",
    dorsal: 81,
    nacionalidad: "Australian",
    team: "McLaren",
  },
  "lewis hamilton": {
    id: "hamilton",
    codPiloto: "HAM",
    dorsal: 44,
    nacionalidad: "British",
    team: "Ferrari",
  },
  "max verstappen": {
    id: "max_verstappen",
    codPiloto: "VER",
    dorsal: 3,
    nacionalidad: "Dutch",
    team: "Red Bull",
  },
  "arvid lindblad": {
    id: "lindblad",
    codPiloto: "LIN",
    dorsal: 41,
    nacionalidad: "British",
    team: "Red Bull",
  },
  "carlos sainz": {
    id: "sainz",
    codPiloto: "SAI",
    dorsal: 55,
    nacionalidad: "Spanish",
    team: "Williams",
  },
  "alexander albon": {
    id: "albon",
    codPiloto: "ALB",
    dorsal: 23,
    nacionalidad: "Thai",
    team: "Williams",
  },
  "fernando alonso": {
    id: "alonso",
    codPiloto: "ALO",
    dorsal: 14,
    nacionalidad: "Spanish",
    team: "Aston Martin",
  },
};

const F1_WEB_SOURCES = [
  {
    title: "Formula1.com - Latest",
    url: "https://www.formula1.com/en/latest",
    source: "Formula1.com",
  },
  {
    title: "Formula1.com - 2026 Drivers Standings",
    url: "https://www.formula1.com/en/results/2026/drivers",
    source: "Formula1.com",
  },
  {
    title: "Formula1.com - 2026 Constructors Standings",
    url: "https://www.formula1.com/en/results/2026/team",
    source: "Formula1.com",
  },
  {
    title: "Formula1.com - 2026 Race Results",
    url: "https://www.formula1.com/en/results/2026/races",
    source: "Formula1.com",
  },
  {
    title: "SoyMotor F1",
    url: "https://soymotor.com/f1",
    source: "SoyMotor",
  },
  {
    title: "Motorsport F1 News",
    url: "https://www.motorsport.com/f1/news/",
    source: "Motorsport",
  },
  {
    title: "Autosport F1",
    url: "https://www.autosport.com/f1/",
    source: "Autosport",
  },
  {
    title: "The Race F1",
    url: "https://www.the-race.com/category/formula-1/",
    source: "The Race",
  },
  {
    title: "RaceFans F1",
    url: "https://www.racefans.net/category/formula-1/",
    source: "RaceFans",
  },
  {
    title: "Reuters F1",
    url: "https://www.reuters.com/sports/formula1/",
    source: "Reuters",
  },
  {
    title: "PlanetF1",
    url: "https://www.planetf1.com/news",
    source: "PlanetF1",
  },
  {
    title: "RacingNews365 F1",
    url: "https://racingnews365.com/formula-1",
    source: "RacingNews365",
  },
  {
    title: "GPBlog F1",
    url: "https://www.gpblog.com/en/news",
    source: "GPBlog",
  },
  {
    title: "Crash.net F1",
    url: "https://www.crash.net/f1/news",
    source: "Crash.net",
  },
  {
    title: "Sky Sports F1",
    url: "https://www.skysports.com/f1",
    source: "Sky Sports",
  },
  {
    title: "BBC Sport F1",
    url: "https://www.bbc.com/sport/formula1",
    source: "BBC Sport",
  },
  {
    title: "ESPN F1",
    url: "https://www.espn.com/f1/",
    source: "ESPN",
  },
  {
    title: "Motor Sport Magazine F1",
    url: "https://www.motorsportmagazine.com/articles/single-seaters/f1/",
    source: "Motor Sport Magazine",
  },
  {
    title: "F1i",
    url: "https://f1i.com/news",
    source: "F1i",
  },
  {
    title: "Car and Driver F1",
    url: "https://www.caranddriver.com/es/formula-1/",
    source: "Car and Driver",
  },
];

const CIRCUIT_PROFILES = [
  {
    keys: ["australia", "australian", "melbourne", "albert park"],
    name: "Australia",
    raceNameHints: ["Australian", "Australia", "Melbourne", "Albert Park"],
    fallbackPoleTime: "1:15.000",
    slowdownPercent2026: 1.3,
    type: "semiurbano fluido",
    characteristics:
      "curvas rápidas, muros cerca, alta velocidad y evolución de pista",
    favours:
      "coches estables en curva rápida y con buena eficiencia aerodinámica",
    overtaking: "media",
    degradation: "media",
    qualifyingImportance: "alta",
  },
  {
    keys: ["china", "chinese", "shanghai"],
    name: "China",
    raceNameHints: ["Chinese", "China", "Shanghai"],
    fallbackPoleTime: "1:33.500",
    slowdownPercent2026: 1.4,
    type: "permanente técnico",
    characteristics:
      "curvas largas, tracción, recta larga y degradación delantera",
    favours:
      "coches equilibrados con buen trato de neumáticos y velocidad punta",
    overtaking: "alta",
    degradation: "media-alta",
    qualifyingImportance: "media",
  },
  {
    keys: ["japan", "japón", "suzuka", "japanese"],
    name: "Japan",
    raceNameHints: ["Japanese", "Japan", "Suzuka"],
    fallbackPoleTime: "1:28.000",
    slowdownPercent2026: 1.2,
    type: "rápido técnico",
    characteristics:
      "eses rápidas, alta carga, precisión y estabilidad aerodinámica",
    favours:
      "coches con mucha carga eficiente y pilotos fuertes en curva rápida",
    overtaking: "media-baja",
    degradation: "media",
    qualifyingImportance: "alta",
  },
  {
    keys: ["miami"],
    name: "Miami",
    raceNameHints: ["Miami"],
    fallbackPoleTime: "1:27.800",
    slowdownPercent2026: 1.6,
    type: "semiurbano",
    characteristics:
      "rectas largas, curvas lentas, frenadas fuertes y tracción importante",
    favours: "coches eficientes, buena tracción y buena gestión de neumáticos",
    overtaking: "media",
    degradation: "media-alta",
    qualifyingImportance: "media-alta",
  },
  {
    keys: ["bahrain", "barein", "baréin", "sakhir"],
    name: "Bahrain",
    raceNameHints: ["Bahrain"],
    fallbackPoleTime: "1:29.500",
    slowdownPercent2026: 1.8,
    type: "permanente",
    characteristics: "frenadas fuertes, tracción y degradación alta",
    favours: "coches con buena tracción y buena gestión de neumáticos traseros",
    overtaking: "alta",
    degradation: "alta",
    qualifyingImportance: "media",
  },
  {
    keys: ["jeddah", "arabia", "saudi", "saudí"],
    name: "Jeddah",
    raceNameHints: ["Saudi", "Jeddah"],
    fallbackPoleTime: "1:27.500",
    slowdownPercent2026: 1.3,
    type: "urbano rápido",
    characteristics: "curvas rápidas, muros cerca y velocidad punta",
    favours: "coches eficientes en recta y estables en curva rápida",
    overtaking: "media",
    degradation: "media",
    qualifyingImportance: "alta",
  },
  {
    keys: ["imola", "emilia"],
    name: "Imola",
    raceNameHints: ["Emilia", "Imola"],
    fallbackPoleTime: "1:14.800",
    slowdownPercent2026: 1.5,
    type: "clásico",
    characteristics: "curvas medias, pianos, tracción y difícil adelantamiento",
    favours: "coches equilibrados y fuertes en clasificación",
    overtaking: "baja",
    degradation: "media",
    qualifyingImportance: "alta",
  },
  {
    keys: ["monaco", "mónaco", "montecarlo"],
    name: "Monaco",
    raceNameHints: ["Monaco"],
    fallbackPoleTime: "1:11.900",
    slowdownPercent2026: 1.8,
    type: "urbano lento",
    characteristics:
      "muy estrecho, casi imposible adelantar y máxima importancia de clasificación",
    favours:
      "coches con carga, tracción mecánica y pilotos muy fuertes a una vuelta",
    overtaking: "muy baja",
    degradation: "baja",
    qualifyingImportance: "muy alta",
  },
  {
    keys: [
      "barcelona",
      "catalunya",
      "barcelona-catalunya",
      "montmelo",
      "montmeló",
    ],
    name: "Barcelona",
    raceNameHints: ["Barcelona", "Catalunya", "Barcelona-Catalunya"],
    fallbackPoleTime: "1:12.900",
    slowdownPercent2026: 1.5,
    type: "permanente técnico",
    characteristics: "curvas rápidas y medias, referencia aerodinámica",
    favours: "coches con buena carga aerodinámica y equilibrio general",
    overtaking: "media",
    degradation: "media",
    qualifyingImportance: "alta",
  },
  {
    keys: ["madrid", "madring", "spain", "spanish", "españa"],
    name: "Madrid",
    raceNameHints: ["Spanish", "Spain", "Madrid", "Madring"],
    fallbackPoleTime: "1:30.000",
    slowdownPercent2026: 1.5,
    type: "semiurbano nuevo",
    characteristics:
      "circuito nuevo con mezcla de tramos urbanos y permanentes, rectas rápidas, frenadas fuertes y datos históricos limitados",
    favours:
      "coches eficientes, buena tracción, estabilidad en frenada y equipos que adapten rápido el set-up",
    overtaking: "media",
    degradation: "desconocida-media",
    qualifyingImportance: "alta",
  },
  {
    keys: ["canada", "canadá", "montreal"],
    name: "Canada",
    raceNameHints: ["Canadian", "Canada"],
    fallbackPoleTime: "1:12.500",
    slowdownPercent2026: 1.4,
    type: "semiurbano",
    characteristics: "rectas, chicanes, frenadas fuertes y tracción",
    favours: "coches eficientes en recta, buenos en frenada y tracción",
    overtaking: "alta",
    degradation: "media",
    qualifyingImportance: "media-alta",
  },
  {
    keys: ["austria", "spielberg", "red bull ring"],
    name: "Austria",
    raceNameHints: ["Austrian", "Austria"],
    fallbackPoleTime: "1:04.500",
    slowdownPercent2026: 1.3,
    type: "corto y rápido",
    characteristics: "vuelta corta, pocas curvas, rectas y frenadas fuertes",
    favours: "coches con velocidad punta, tracción y eficiencia",
    overtaking: "alta",
    degradation: "media",
    qualifyingImportance: "media",
  },
  {
    keys: ["silverstone", "gran bretaña", "britain", "british"],
    name: "Silverstone",
    raceNameHints: ["British", "Silverstone"],
    fallbackPoleTime: "1:26.500",
    slowdownPercent2026: 1.4,
    type: "rápido aerodinámico",
    characteristics: "curvas rápidas, alta carga y estabilidad",
    favours: "coches con gran carga aerodinámica y estabilidad en curva rápida",
    overtaking: "media",
    degradation: "media-alta",
    qualifyingImportance: "alta",
  },
  {
    keys: ["hungría", "hungary", "hungaroring"],
    name: "Hungary",
    raceNameHints: ["Hungarian", "Hungary"],
    fallbackPoleTime: "1:16.000",
    slowdownPercent2026: 1.7,
    type: "lento y técnico",
    characteristics: "muchas curvas, poca recta y difícil adelantamiento",
    favours: "coches con alta carga, tracción y buen paso por curva lenta",
    overtaking: "baja",
    degradation: "media",
    qualifyingImportance: "muy alta",
  },
  {
    keys: ["spa", "belgium", "bélgica"],
    name: "Spa",
    raceNameHints: ["Belgian", "Spa"],
    fallbackPoleTime: "1:41.800",
    slowdownPercent2026: 1.2,
    type: "rápido y largo",
    characteristics: "rectas largas, curvas rápidas y clima variable",
    favours:
      "coches eficientes, buena velocidad punta y estabilidad en curva rápida",
    overtaking: "alta",
    degradation: "media",
    qualifyingImportance: "media",
  },
  {
    keys: ["monza", "italia", "italy", "italian"],
    name: "Monza",
    raceNameHints: ["Italian", "Monza"],
    fallbackPoleTime: "1:19.500",
    slowdownPercent2026: 1.1,
    type: "muy rápido",
    characteristics: "mínima carga, rectas largas y frenadas fuertes",
    favours: "coches con mucha eficiencia en recta y baja resistencia",
    overtaking: "alta",
    degradation: "baja-media",
    qualifyingImportance: "media",
  },
  {
    keys: [
      "netherlands",
      "dutch",
      "zandvoort",
      "países bajos",
      "paises bajos",
      "holanda",
    ],
    name: "Netherlands",
    raceNameHints: ["Dutch", "Netherlands", "Zandvoort"],
    fallbackPoleTime: "1:10.500",
    slowdownPercent2026: 1.4,
    type: "permanente estrecho",
    characteristics:
      "curvas peraltadas, trazado estrecho, alta carga y difícil adelantamiento",
    favours:
      "coches con carga, buen equilibrio mecánico y pilotos fuertes en clasificación",
    overtaking: "baja",
    degradation: "media",
    qualifyingImportance: "muy alta",
  },
  {
    keys: ["azerbaijan", "azerbaiyán", "azerbaiyan", "baku", "bakú"],
    name: "Azerbaijan",
    raceNameHints: ["Azerbaijan", "Baku"],
    fallbackPoleTime: "1:41.000",
    slowdownPercent2026: 1.2,
    type: "urbano rápido",
    characteristics:
      "recta muy larga, sector estrecho, baja carga y alto riesgo de incidentes",
    favours:
      "coches con velocidad punta, eficiencia y buena tracción en salida de curva lenta",
    overtaking: "alta",
    degradation: "media",
    qualifyingImportance: "media-alta",
  },
  {
    keys: ["singapore", "singapur", "marina bay"],
    name: "Singapore",
    raceNameHints: ["Singapore"],
    fallbackPoleTime: "1:30.500",
    slowdownPercent2026: 1.8,
    type: "urbano lento",
    characteristics:
      "calor, muchas curvas lentas, alta carga y difícil adelantamiento",
    favours: "coches con buena tracción, alta carga y pilotos consistentes",
    overtaking: "baja",
    degradation: "media-alta",
    qualifyingImportance: "muy alta",
  },
  {
    keys: [
      "united states",
      "usa",
      "eeuu",
      "estados unidos",
      "austin",
      "cota",
      "americas",
    ],
    name: "United States",
    raceNameHints: ["United States", "Austin", "Americas", "COTA"],
    fallbackPoleTime: "1:32.500",
    slowdownPercent2026: 1.4,
    type: "permanente moderno",
    characteristics:
      "primer sector rápido, curvas enlazadas, recta larga y frenadas fuertes",
    favours:
      "coches equilibrados, buena carga en curva rápida y eficiencia en recta",
    overtaking: "alta",
    degradation: "media-alta",
    qualifyingImportance: "media-alta",
  },
  {
    keys: [
      "mexico",
      "méxico",
      "mexican",
      "ciudad de mexico",
      "ciudad de méxico",
      "hermanos rodriguez",
      "rodríguez",
    ],
    name: "Mexico",
    raceNameHints: ["Mexico", "Mexican", "Mexico City"],
    fallbackPoleTime: "1:15.000",
    slowdownPercent2026: 1.5,
    type: "alta altitud",
    characteristics:
      "alta altitud, baja densidad de aire, recta larga y tracción lenta",
    favours:
      "coches eficientes con buen enfriamiento, carga usable y velocidad punta",
    overtaking: "media-alta",
    degradation: "media",
    qualifyingImportance: "media-alta",
  },
  {
    keys: ["brazil", "brasil", "sao paulo", "são paulo", "interlagos"],
    name: "Brazil",
    raceNameHints: ["Brazil", "São Paulo", "Sao Paulo", "Interlagos"],
    fallbackPoleTime: "1:10.500",
    slowdownPercent2026: 1.4,
    type: "clásico corto",
    characteristics:
      "vuelta corta, desnivel, curvas medias, tracción y clima cambiante",
    favours:
      "coches equilibrados, buena tracción y pilotos fuertes en condiciones variables",
    overtaking: "alta",
    degradation: "media",
    qualifyingImportance: "media",
  },
  {
    keys: ["las vegas", "vegas"],
    name: "Las Vegas",
    raceNameHints: ["Las Vegas"],
    fallbackPoleTime: "1:32.000",
    slowdownPercent2026: 1.2,
    type: "urbano rápido",
    characteristics: "rectas muy largas, baja temperatura y frenadas fuertes",
    favours:
      "coches con velocidad punta, eficiencia y buen calentamiento de neumáticos",
    overtaking: "alta",
    degradation: "baja-media",
    qualifyingImportance: "media",
  },
  {
    keys: ["qatar", "losail", "lusail"],
    name: "Qatar",
    raceNameHints: ["Qatar", "Lusail", "Losail"],
    fallbackPoleTime: "1:20.500",
    slowdownPercent2026: 1.3,
    type: "rápido permanente",
    characteristics:
      "curvas rápidas, alta carga, abrasión y exigencia para neumáticos",
    favours:
      "coches con carga eficiente, estabilidad en curva rápida y buena gestión térmica",
    overtaking: "media",
    degradation: "alta",
    qualifyingImportance: "alta",
  },
  {
    keys: ["abu dhabi", "yas marina"],
    name: "Abu Dhabi",
    raceNameHints: ["Abu Dhabi", "Yas Marina"],
    fallbackPoleTime: "1:22.500",
    slowdownPercent2026: 1.5,
    type: "moderno",
    characteristics: "sectores variados, tracción, curvas medias y rectas",
    favours: "coches equilibrados, buena tracción y eficiencia en recta",
    overtaking: "media",
    degradation: "media",
    qualifyingImportance: "media-alta",
  },
];

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizeCircuit(circuit) {
  return String(circuit || "")
    .replace(/\bgrand prix\b/gi, "")
    .replace(/\bgp\b/gi, "")
    .replace(/\b2026\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getCircuitFromArgs() {
  const circuit = process.argv.slice(2).join(" ").trim();

  if (!circuit) {
    throw new Error(
      'Tienes que indicar el circuito. Ejemplo: node index.js "Miami"',
    );
  }

  return circuit;
}

function getCircuitProfile(circuit) {
  const normalizedCircuit = normalizeText(circuit);

  const match = CIRCUIT_PROFILES.find((profile) =>
    profile.keys.some((key) => normalizedCircuit.includes(normalizeText(key))),
  );

  if (match) {
    return match;
  }

  return {
    keys: [circuit],
    name: normalizeCircuit(circuit),
    raceNameHints: [normalizeCircuit(circuit)],
    fallbackPoleTime: "1:28.500",
    slowdownPercent2026: 1.5,
    type: "general",
    characteristics: "circuito no identificado; análisis general",
    favours: "coches equilibrados, buen ritmo de carrera y buena clasificación",
    overtaking: "media",
    degradation: "media",
    qualifyingImportance: "media",
  };
}

async function fetchJson(url) {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36",
      },
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    return null;
  }
}

async function fetchText(url) {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36",
      },
    });

    if (!response.ok) {
      return "";
    }

    return await response.text();
  } catch (error) {
    return "";
  }
}

function decodeHtmlEntities(value) {
  return String(value || "")
    .replace(/&nbsp;/g, " ")
    .replace(/&#8211;|&ndash;/g, "-")
    .replace(/&#8212;|&mdash;/g, "-")
    .replace(/&#8217;|&rsquo;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([a-f0-9]+);/gi, (_, code) =>
      String.fromCharCode(parseInt(code, 16)),
    );
}

function stripHtml(value) {
  return decodeHtmlEntities(
    String(value || "")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

function extractLinksFromHtml(html, baseUrl) {
  const links = [];
  const linkRegex = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = linkRegex.exec(html))) {
    const href = match[1];
    const text = stripHtml(match[2]);

    if (!href || !text) {
      continue;
    }

    try {
      links.push({
        href: new URL(href, baseUrl).href,
        text,
      });
    } catch (error) {
      // Ignore malformed links.
    }
  }

  return links;
}

async function getSeasonRaces(season) {
  const data = await fetchJson(`${JOLPICA_BASE_URL}/${season}.json?limit=100`);
  return data?.MRData?.RaceTable?.Races || [];
}

async function getDriverStandings(season) {
  const data = await fetchJson(
    `${JOLPICA_BASE_URL}/${season}/driverStandings.json?limit=100`,
  );

  const standings =
    data?.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings || [];

  return standings.map((item) => ({
    position: Number(item.position),
    id: item.Driver?.driverId || "",
    code: item.Driver?.code || "",
    number: Number(item.Driver?.permanentNumber || 0),
    nationality: item.Driver?.nationality || "",
    driver:
      `${item.Driver?.givenName || ""} ${item.Driver?.familyName || ""}`.trim(),
    team: item.Constructors?.[0]?.name || "",
    teamId: item.Constructors?.[0]?.constructorId || "",
    points: Number(item.points || 0),
    wins: Number(item.wins || 0),
  }));
}

async function getConstructorStandings(season) {
  const data = await fetchJson(
    `${JOLPICA_BASE_URL}/${season}/constructorStandings.json?limit=100`,
  );

  const standings =
    data?.MRData?.StandingsTable?.StandingsLists?.[0]?.ConstructorStandings ||
    [];

  return standings.map((item) => ({
    position: Number(item.position),
    team: item.Constructor?.name || "",
    points: Number(item.points || 0),
    wins: Number(item.wins || 0),
  }));
}

async function getSeasonRaceResults(season) {
  const data = await fetchJson(
    `${JOLPICA_BASE_URL}/${season}/results.json?limit=1000`,
  );
  return data?.MRData?.RaceTable?.Races || [];
}

async function getQualifyingResults(season, round) {
  const data = await fetchJson(
    `${JOLPICA_BASE_URL}/${season}/${round}/qualifying.json?limit=100`,
  );

  return data?.MRData?.RaceTable?.Races?.[0]?.QualifyingResults || [];
}

function raceMatchesCircuit(race, profile, circuit) {
  const haystack = normalizeText(
    [
      race.raceName,
      race.Circuit?.circuitName,
      race.Circuit?.Location?.locality,
      race.Circuit?.Location?.country,
    ].join(" "),
  );

  const directCircuit = normalizeText(circuit);
  const profileName = normalizeText(profile.name);

  if (haystack.includes(directCircuit)) {
    return true;
  }

  if (haystack.includes(profileName)) {
    return true;
  }

  return profile.raceNameHints.some((hint) =>
    haystack.includes(normalizeText(hint)),
  );
}

function getDriverName(driver) {
  return `${driver?.givenName || ""} ${driver?.familyName || ""}`.trim();
}

function getBestQualifyingTime(qualifyingResult) {
  return (
    qualifyingResult?.Q3 || qualifyingResult?.Q2 || qualifyingResult?.Q1 || ""
  );
}

function extractPoleFromQualifying(qualifyingResults) {
  if (!Array.isArray(qualifyingResults) || !qualifyingResults.length) {
    return null;
  }

  const pole =
    qualifyingResults.find((item) => Number(item.position) === 1) ||
    qualifyingResults[0];

  return {
    driver: getDriverName(pole.Driver),
    team: pole.Constructor?.name || "",
    time: getBestQualifyingTime(pole),
  };
}

async function getPreviousYearPoleForCircuit(circuit, profile) {
  const races = await getSeasonRaces(PREVIOUS_SEASON);
  const race = races.find((item) => raceMatchesCircuit(item, profile, circuit));

  if (!race) {
    return null;
  }

  const qualifyingResults = await getQualifyingResults(
    PREVIOUS_SEASON,
    race.round,
  );
  const pole = extractPoleFromQualifying(qualifyingResults);

  if (!pole) {
    return null;
  }

  return {
    ...pole,
    season: PREVIOUS_SEASON,
    raceName: race.raceName,
    round: Number(race.round),
  };
}

async function getCurrentYearRaceForCircuit(circuit, profile) {
  const races = await getSeasonRaces(CURRENT_SEASON);

  return (
    races.find((item) => raceMatchesCircuit(item, profile, circuit)) || null
  );
}

async function getRecentPoles(season, maxItems = 3) {
  const resultsRaces = await getSeasonRaceResults(season);
  const recentRaces = resultsRaces.slice(-maxItems);

  const poles = [];

  for (const race of recentRaces) {
    const qualifyingResults = await getQualifyingResults(season, race.round);
    const pole = extractPoleFromQualifying(qualifyingResults);

    if (pole) {
      poles.push({
        raceName: race.raceName,
        round: Number(race.round),
        ...pole,
      });
    }
  }

  return poles;
}

async function getPoleTrendComparison() {
  const currentRaces = await getSeasonRaceResults(CURRENT_SEASON);
  const previousRaces = await getSeasonRaces(PREVIOUS_SEASON);
  const comparisons = [];

  for (const race of currentRaces) {
    const profile = getCircuitProfile(race.raceName);
    const previousRace = previousRaces.find((item) =>
      raceMatchesCircuit(item, profile, race.raceName),
    );

    if (!previousRace) {
      continue;
    }

    const [currentQualifying, previousQualifying] = await Promise.all([
      getQualifyingResults(CURRENT_SEASON, race.round),
      getQualifyingResults(PREVIOUS_SEASON, previousRace.round),
    ]);
    const currentPole = extractPoleFromQualifying(currentQualifying);
    const previousPoleForRace = extractPoleFromQualifying(previousQualifying);
    const currentMs = parseLapTimeToMs(currentPole?.time);
    const previousMs = parseLapTimeToMs(previousPoleForRace?.time);

    if (!currentMs || !previousMs) {
      continue;
    }

    comparisons.push({
      raceName: race.raceName,
      currentRound: Number(race.round),
      previousRound: Number(previousRace.round),
      currentDriver: currentPole.driver,
      previousDriver: previousPoleForRace.driver,
      currentTime: currentPole.time,
      previousTime: previousPoleForRace.time,
      deltaMs: currentMs - previousMs,
      deltaSeconds: Number(((currentMs - previousMs) / 1000).toFixed(3)),
    });
  }

  const averageDeltaMs = comparisons.length
    ? Math.round(
        comparisons.reduce((total, item) => total + item.deltaMs, 0) /
          comparisons.length,
      )
    : 0;

  return {
    comparisons,
    averageDeltaMs,
    averageDeltaSeconds: Number((averageDeltaMs / 1000).toFixed(3)),
  };
}

function getWeatherCodeText(code) {
  const weatherCodes = {
    0: "despejado",
    1: "mayormente despejado",
    2: "parcialmente nublado",
    3: "nublado",
    45: "niebla",
    48: "niebla con escarcha",
    51: "llovizna ligera",
    53: "llovizna moderada",
    55: "llovizna intensa",
    61: "lluvia ligera",
    63: "lluvia moderada",
    65: "lluvia fuerte",
    80: "chubascos ligeros",
    81: "chubascos moderados",
    82: "chubascos fuertes",
    95: "tormenta",
    96: "tormenta con granizo ligero",
    99: "tormenta con granizo fuerte",
  };

  return weatherCodes[code] || `código meteorológico ${code}`;
}

async function getWeatherForecastForRace(circuit, profile) {
  const race = await getCurrentYearRaceForCircuit(circuit, profile);
  const location = race?.Circuit?.Location;
  const latitude = Number(location?.lat);
  const longitude = Number(location?.long);

  if (
    !race?.date ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return {
      available: false,
      reason: "No se encontró fecha o coordenadas del circuito.",
    };
  }

  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    daily:
      "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max",
    timezone: "auto",
    start_date: race.date,
    end_date: race.date,
  });
  const data = await fetchJson(
    `https://api.open-meteo.com/v1/forecast?${params}`,
  );
  const daily = data?.daily;
  const index = daily?.time?.indexOf(race.date) ?? -1;

  if (!daily || index === -1) {
    return {
      available: false,
      raceName: race.raceName,
      date: race.date,
      location: `${location.locality || ""}, ${location.country || ""}`.trim(),
      reason:
        "La previsión meteorológica no está disponible para la fecha de la carrera.",
    };
  }

  const weatherCode = daily.weather_code?.[index];

  return {
    available: true,
    raceName: race.raceName,
    date: race.date,
    location: `${location.locality || ""}, ${location.country || ""}`.trim(),
    weather: getWeatherCodeText(weatherCode),
    precipitationProbability: daily.precipitation_probability_max?.[index],
    precipitationSum: daily.precipitation_sum?.[index],
    temperatureMax: daily.temperature_2m_max?.[index],
    temperatureMin: daily.temperature_2m_min?.[index],
    windSpeedMax: daily.wind_speed_10m_max?.[index],
  };
}

function getSafetyCarHistorySeasons() {
  return Array.from(
    { length: SAFETY_CAR_HISTORY_YEARS },
    (_, index) => CURRENT_SEASON - 1 - index,
  );
}

function getRaceIdentityTerms(circuit, profile, currentRace) {
  return [
    circuit,
    profile.name,
    currentRace?.raceName,
    currentRace?.Circuit?.circuitName,
    currentRace?.Circuit?.Location?.locality,
    ...(profile.raceNameHints || []),
  ]
    .filter(Boolean)
    .map((term) => normalizeText(term).trim())
    .filter((term) => term.length >= 4);
}

function raceMatchesSameCircuitHistory(race, profile, circuit, currentRace) {
  const currentCircuitTerms = [
    currentRace?.Circuit?.circuitName,
    currentRace?.Circuit?.Location?.locality,
  ]
    .filter(Boolean)
    .map(normalizeText)
    .filter((term) => term.length >= 4);

  if (currentCircuitTerms.length) {
    const raceCircuitTerms = [
      race.Circuit?.circuitName,
      race.Circuit?.Location?.locality,
    ]
      .filter(Boolean)
      .map(normalizeText)
      .filter((term) => term.length >= 4);

    return currentCircuitTerms.some((currentTerm) =>
      raceCircuitTerms.some(
        (raceTerm) =>
          currentTerm === raceTerm ||
          currentTerm.includes(raceTerm) ||
          raceTerm.includes(currentTerm),
      ),
    );
  }

  return raceMatchesCircuit(race, profile, circuit);
}

async function getRecentSameCircuitRaces(circuit, profile, currentRace) {
  const seasons = getSafetyCarHistorySeasons();
  const racesBySeason = await Promise.all(
    seasons.map(async (season) => ({
      season,
      races: await getSeasonRaces(season),
    })),
  );

  return racesBySeason
    .map(({ season, races }) => {
      const race = races.find((item) =>
        raceMatchesSameCircuitHistory(item, profile, circuit, currentRace),
      );

      return race
        ? {
            season,
            raceName: race.raceName,
            circuitName: race.Circuit?.circuitName || "",
          }
        : null;
    })
    .filter(Boolean);
}

function safetyArticleMatches(link, searchTerms) {
  const haystack = normalizeText(`${link.text} ${link.href}`);

  return (
    haystack.includes("safety car") &&
    searchTerms.some((term) => haystack.includes(term))
  );
}

async function findLightsOutSafetyCarArticle(circuit, profile, currentRace) {
  const searchTerms = getRaceIdentityTerms(circuit, profile, currentRace);
  const pages = [
    LIGHTS_OUT_SAFETY_CAR_CATEGORY_URL,
    `${LIGHTS_OUT_SAFETY_CAR_CATEGORY_URL}page/2/`,
    `${LIGHTS_OUT_SAFETY_CAR_CATEGORY_URL}page/3/`,
  ];
  const links = [];
  const usedLinks = new Set();

  for (const pageUrl of pages) {
    const html = await fetchText(pageUrl);

    if (!html) {
      continue;
    }

    extractLinksFromHtml(html, pageUrl).forEach((link) => {
      if (usedLinks.has(link.href)) {
        return;
      }

      usedLinks.add(link.href);
      links.push(link);
    });
  }

  return links.find((link) => safetyArticleMatches(link, searchTerms)) || null;
}

function extractHtmlHeadingSections(html) {
  const cleanHtml = String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ");
  const headingRegex = /<h[2-4]\b[^>]*>([\s\S]*?)<\/h[2-4]>/gi;
  const sections = [];
  let current = null;
  let match;

  while ((match = headingRegex.exec(cleanHtml))) {
    if (current) {
      current.html = cleanHtml.slice(current.endIndex, match.index);
      sections.push(current);
    }

    current = {
      heading: stripHtml(match[1]),
      endIndex: headingRegex.lastIndex,
      html: "",
    };
  }

  if (current) {
    current.html = cleanHtml.slice(current.endIndex);
    sections.push(current);
  }

  return sections;
}

function getSafetyCarEventType(text) {
  const normalizedText = normalizeText(text);
  const hasFullSafetyCarSignal = [
    "full safety car",
    "safety car was called",
    "safety car was deployed",
    "safety car stayed out",
    "behind the safety car",
    "under safety car conditions",
  ].some((pattern) => normalizedText.includes(pattern));

  if (hasFullSafetyCarSignal) {
    return "SC";
  }

  if (normalizedText.includes("virtual safety car") || /\bvsc\b/i.test(text)) {
    return "VSC";
  }

  return "SC";
}

function extractSafetyCarEventsFromArticle(html) {
  return extractHtmlHeadingSections(html)
    .map((section) => {
      const heading = section.heading;
      const body = stripHtml(section.html);
      const yearMatch = heading.match(/\b(20\d{2}|19\d{2})\b/);
      const lapMatch = heading.match(/\blap\s+(\d+)/i);

      if (!yearMatch || !lapMatch || !/grand prix|gp/i.test(heading)) {
        return null;
      }

      const text = `${heading} ${body}`;

      return {
        year: Number(yearMatch[1]),
        lap: Number(lapMatch[1]),
        type: getSafetyCarEventType(text),
        heading,
        text,
      };
    })
    .filter(Boolean);
}

function shouldMergeSafetyCarEvents(first, second) {
  if (first.year !== second.year) {
    return false;
  }

  if (first.lap === second.lap) {
    return true;
  }

  const hasVscAndSc = new Set([first.type, second.type]).size > 1;
  const combinedText = normalizeText(`${first.text} ${second.text}`);

  return (
    hasVscAndSc &&
    Math.abs(first.lap - second.lap) <= 1 &&
    [
      "converted",
      "upgraded",
      "replaced",
      "followed by",
      "then",
      "full safety car",
      "safety car was called",
    ].some((pattern) => combinedText.includes(pattern))
  );
}

function mergeSafetyCarEvents(events) {
  const sortedEvents = [...events].sort((first, second) => {
    if (first.year !== second.year) {
      return first.year - second.year;
    }

    return first.lap - second.lap;
  });
  const merged = [];

  sortedEvents.forEach((event) => {
    const previous = merged[merged.length - 1];

    if (previous && shouldMergeSafetyCarEvents(previous, event)) {
      previous.type =
        previous.type === event.type
          ? previous.type
          : `${previous.type}+${event.type}`;
      previous.text = `${previous.text} ${event.text}`;
      previous.heading = `${previous.heading} / ${event.heading}`;
      return;
    }

    merged.push({ ...event });
  });

  return merged;
}

async function getSafetyCarHistory(circuit, profile, currentRace) {
  const recentRaces = await getRecentSameCircuitRaces(
    circuit,
    profile,
    currentRace,
  );

  if (!recentRaces.length) {
    return {
      available: false,
      source: "Lights Out",
      reason: "No se encontraron carreras recientes del mismo GP/circuito.",
      seasons: [],
      average: null,
    };
  }

  const article = await findLightsOutSafetyCarArticle(
    circuit,
    profile,
    currentRace,
  );

  if (!article) {
    return {
      available: false,
      source: "Lights Out",
      reason: "No se encontró artículo de Safety Car para este GP.",
      seasons: recentRaces.map((race) => ({
        season: race.season,
        raceName: race.raceName,
        count: null,
      })),
      average: null,
    };
  }

  const html = await fetchText(article.href);

  if (!html) {
    return {
      available: false,
      source: article.href,
      reason: "No se pudo leer el artículo de Safety Car.",
      seasons: recentRaces.map((race) => ({
        season: race.season,
        raceName: race.raceName,
        count: null,
      })),
      average: null,
    };
  }

  const events = extractSafetyCarEventsFromArticle(html);
  const seasons = recentRaces.map((race) => {
    const yearEvents = mergeSafetyCarEvents(
      events.filter((event) => event.year === race.season),
    );

    return {
      season: race.season,
      raceName: race.raceName,
      count: yearEvents.length,
      events: yearEvents.map((event) => ({
        lap: event.lap,
        type: event.type,
      })),
    };
  });
  const countedSeasons = seasons.filter((season) =>
    Number.isFinite(season.count),
  );
  const average = countedSeasons.length
    ? Math.round(
        countedSeasons.reduce((total, season) => total + season.count, 0) /
          countedSeasons.length,
      )
    : null;

  return {
    available: Number.isFinite(average),
    source: article.href,
    sourceTitle: article.text,
    reason: Number.isFinite(average) ? null : "No se pudieron contar eventos.",
    seasons,
    average,
  };
}

function parseLapTimeToMs(time) {
  if (!time || typeof time !== "string") {
    return null;
  }

  const match = time.trim().match(/^(\d+):(\d{2})[.:](\d{3})$/);

  if (!match) {
    return null;
  }

  const minutes = Number(match[1]);
  const seconds = Number(match[2]);
  const milliseconds = Number(match[3]);

  return minutes * 60 * 1000 + seconds * 1000 + milliseconds;
}

function formatMsToLapTime(ms) {
  if (!Number.isFinite(ms) || ms <= 0) {
    return "1:28.500";
  }

  const rounded = Math.round(ms);
  const minutes = Math.floor(rounded / 60000);
  const remainingAfterMinutes = rounded % 60000;
  const seconds = Math.floor(remainingAfterMinutes / 1000);
  const milliseconds = remainingAfterMinutes % 1000;

  return `${minutes}:${String(seconds).padStart(2, "0")}.${String(milliseconds).padStart(3, "0")}`;
}

function estimatePoleTime(previousPole, profile, poleTrend) {
  const fallbackMs = parseLapTimeToMs(profile.fallbackPoleTime);
  const baseTime = previousPole?.time || profile.fallbackPoleTime;
  const baseMs = parseLapTimeToMs(baseTime) || fallbackMs;
  const trendMs = poleTrend?.averageDeltaMs || 0;
  const boundedTrendMs = Math.max(-2500, Math.min(2500, trendMs));

  const regulationMs = baseMs * (profile.slowdownPercent2026 / 100);
  const boundedRegulationMs = Math.max(-2500, Math.min(2500, regulationMs));
  const estimatedMs = baseMs + boundedRegulationMs;
  const realisticMs = baseMs + boundedTrendMs;

  return {
    basePoleTime: formatMsToLapTime(baseMs),
    previousPoleTime: previousPole?.time || null,
    previousPoleDriver: previousPole?.driver || null,
    previousPoleTeam: previousPole?.team || null,
    estimatedPoleTime: formatMsToLapTime(estimatedMs),
    realisticPoleTime: formatMsToLapTime(realisticMs),
    trendDeltaSeconds: Number((boundedTrendMs / 1000).toFixed(3)),
    slowdownPercentApplied: profile.slowdownPercent2026,
  };
}

function getWebSources() {
  return F1_WEB_SOURCES.slice(0, MAX_WEB_SOURCES);
}

async function acceptCookiesIfNeeded(page) {
  const possibleButtons = [
    "Accept",
    "Accept all",
    "I accept",
    "Agree",
    "Aceptar",
    "Aceptar todo",
    "Estoy de acuerdo",
    "Consent",
    "Guardar configuración",
    "Aceptar y continuar",
    "Continue",
    "OK",
  ];

  for (const buttonText of possibleButtons) {
    try {
      const button = page.getByRole("button", {
        name: new RegExp(buttonText, "i"),
      });

      if (await button.first().isVisible({ timeout: 700 })) {
        await button.first().click({ timeout: 1500 });
        await page.waitForTimeout(600);
        return;
      }
    } catch (error) {
      // Probamos con el siguiente botón.
    }
  }
}

async function readWebPage(browser, webSource) {
  const page = await browser.newPage();

  try {
    console.log(`Leyendo web: ${webSource.source} - ${webSource.url}`);

    await page.goto(webSource.url, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    await page.waitForTimeout(1200);

    await acceptCookiesIfNeeded(page);

    const pageTitle = await page.title();

    const bodyText = await page.locator("body").innerText({
      timeout: 12000,
    });

    await page.close();

    return {
      ...webSource,
      pageTitle,
      content: bodyText
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, MAX_WEB_SOURCE_CHARS),
      error: null,
    };
  } catch (error) {
    await page.close();

    return {
      ...webSource,
      pageTitle: webSource.title,
      content: "",
      error: error.message,
    };
  }
}

async function readWebSources() {
  const webSources = getWebSources();

  const browser = await chromium.launch({
    headless: true,
  });

  const pages = [];

  for (const webSource of webSources) {
    const result = await readWebPage(browser, webSource);

    if (result.content && result.content.length > 120) {
      pages.push(result);
    } else {
      console.log(`Web ignorada por poco contenido: ${webSource.url}`);

      if (result.error) {
        console.log(`Motivo: ${result.error}`);
      }
    }
  }

  await browser.close();

  return pages;
}

function getRaceSearchTerms(circuit, profile, currentRace) {
  return [
    circuit,
    profile.name,
    currentRace?.raceName,
    ...(profile.raceNameHints || []),
  ]
    .filter(Boolean)
    .map(normalizeText)
    .filter(Boolean);
}

function linkMatchesRace(link, searchTerms) {
  const haystack = normalizeText(`${link.text} ${link.href}`);

  return searchTerms.some((term) => haystack.includes(term));
}

function isRelevantFiaDocument(link) {
  const text = normalizeText(`${link.text} ${link.href}`);
  const relevantKeywords = [
    "car presentation",
    "car display",
    "display procedure",
    "scrutineering",
    "technical",
    "technical delegate",
    "power unit",
    "pirelli",
    "tyre",
    "tire",
    "event notes",
    "competition notes",
    "race directors",
    "race director",
  ];

  return relevantKeywords.some((keyword) => text.includes(keyword));
}

async function extractFiaLinksFromPage(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll("a")]
      .map((anchor) => ({
        text: (anchor.innerText || anchor.textContent || "")
          .replace(/\s+/g, " ")
          .trim(),
        href: anchor.href,
      }))
      .filter((link) => link.href),
  );
}

async function getFiaDocumentLinks(circuit, profile, currentRace) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(FIA_DOCUMENTS_URL, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    const searchTerms = getRaceSearchTerms(circuit, profile, currentRace);
    let links = await extractFiaLinksFromPage(page);
    let pdfLinks = links.filter(
      (link) =>
        link.href.includes("/system/files/decision-document/") &&
        link.href.toLowerCase().includes(".pdf") &&
        linkMatchesRace(link, searchTerms),
    );

    if (!pdfLinks.length) {
      const eventLink = links.find(
        (link) =>
          !link.href.toLowerCase().includes(".pdf") &&
          linkMatchesRace(link, searchTerms),
      );

      if (eventLink) {
        await page.goto(eventLink.href, {
          waitUntil: "domcontentloaded",
          timeout: 60000,
        });
        links = await extractFiaLinksFromPage(page);
        pdfLinks = links.filter(
          (link) =>
            link.href.includes("/system/files/decision-document/") &&
            link.href.toLowerCase().includes(".pdf"),
        );
      }
    }

    return pdfLinks.filter(isRelevantFiaDocument).slice(0, MAX_FIA_DOCUMENTS);
  } catch (error) {
    console.log(`No se pudieron leer enlaces FIA: ${error.message}`);
    return [];
  } finally {
    await browser.close();
  }
}

function extractRelevantFiaText(text) {
  const keywords = [
    "major aerodynamic",
    "bodywork",
    "components",
    "assemblies",
    "not been run",
    "new",
    "upgrade",
    "updated",
    "floor",
    "front wing",
    "rear wing",
    "beam wing",
    "sidepod",
    "engine cover",
    "cooling",
    "diffuser",
    "suspension",
    "power unit",
    "gearbox",
    "tyre",
    "compound",
    "pirelli",
    "track limits",
    "safety car",
    "drs",
    "pit lane",
  ];
  const clean = String(text || "")
    .replace(/\s+/g, " ")
    .trim();
  const sentences = clean
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  const relevant = sentences.filter((sentence) =>
    keywords.some((keyword) =>
      sentence.toLowerCase().includes(keyword.toLowerCase()),
    ),
  );

  return (relevant.length ? relevant : sentences)
    .slice(0, 8)
    .join(" ")
    .slice(0, MAX_FIA_TEXT_PER_DOCUMENT);
}

async function readFiaPdf(link) {
  try {
    console.log(`Leyendo PDF FIA: ${link.text}`);

    const response = await fetch(link.href, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const originalConsoleWarn = console.warn;

    console.warn = (...args) => {
      const message = args.join(" ");

      if (message.includes("Warning: TT: undefined function")) {
        return;
      }

      originalConsoleWarn(...args);
    };

    let parsed;

    try {
      parsed = await pdfParse(buffer);
    } finally {
      console.warn = originalConsoleWarn;
    }

    return {
      title: link.text,
      url: link.href,
      text: extractRelevantFiaText(parsed.text),
      error: null,
    };
  } catch (error) {
    return {
      title: link.text,
      url: link.href,
      text: "",
      error: error.message,
    };
  }
}

async function readFiaDocuments(circuit, profile, currentRace) {
  const links = await getFiaDocumentLinks(circuit, profile, currentRace);
  const documents = [];

  for (const link of links) {
    const document = await readFiaPdf(link);

    documents.push(document);

    if (document.text) {
      console.log(`PDF FIA leído correctamente: ${link.text}`);
    } else {
      console.log(
        `El archivo FIA "${link.text}" no se ha podido leer. Motivo: ${document.error || "no se pudo extraer texto útil"}`,
      );
    }
  }

  return documents;
}

function buildFiaDocumentsText(fiaDocuments) {
  const readableDocuments = (fiaDocuments || []).filter(
    (document) => document.text,
  );

  if (!readableDocuments.length) {
    return "No se han encontrado PDFs FIA relevantes para este evento.";
  }

  return readableDocuments
    .map(
      (document, index) => `${index + 1}. ${document.title}: ${document.text}`,
    )
    .join(" | ")
    .slice(0, MAX_TOTAL_FIA_TEXT);
}

function buildTeamUpgradeText(fiaDocuments, webPages) {
  const teams = [
    "McLaren",
    "Ferrari",
    "Mercedes",
    "Red Bull",
    "Williams",
    "Aston Martin",
    "Alpine",
    "Haas",
    "Racing Bulls",
    "Sauber",
  ];
  const upgradeKeywords = [
    "upgrade",
    "upgrades",
    "updated",
    "new",
    "package",
    "aero",
    "aerodynamic",
    "floor",
    "front wing",
    "rear wing",
    "beam wing",
    "sidepod",
    "engine cover",
    "cooling",
    "diffuser",
    "suspension",
    "power unit",
    "mejora",
    "mejoras",
    "evolución",
    "paquete",
    "suelo",
    "alerón",
    "refrigeración",
  ];
  const sources = [
    ...(fiaDocuments || []).map((document) => ({
      source: `FIA ${document.title}`,
      text: document.text,
    })),
    ...(webPages || []).map((page) => ({
      source: page.source,
      text: page.content,
    })),
  ];
  const findings = [];

  for (const team of teams) {
    const normalizedTeam = normalizeText(team);

    for (const source of sources) {
      const sentences = String(source.text || "")
        .replace(/\s+/g, " ")
        .split(/(?<=[.!?])\s+/)
        .map((sentence) => sentence.trim())
        .filter(Boolean);
      const match = sentences.find((sentence) => {
        const normalizedSentence = normalizeText(sentence);

        return (
          normalizedSentence.includes(normalizedTeam) &&
          upgradeKeywords.some((keyword) =>
            normalizedSentence.includes(normalizeText(keyword)),
          )
        );
      });

      if (match) {
        findings.push(`${team} (${source.source}): ${match.slice(0, 220)}`);
        break;
      }
    }
  }

  if (!findings.length) {
    return "No se han detectado mejoras claras por equipo en PDFs FIA/noticias; no inventes mejoras.";
  }

  return findings.join(" | ").slice(0, 1800);
}

function buildSourceCorpus(context) {
  const fiaText = (context.fiaDocuments || [])
    .filter((document) => document.text)
    .map(
      (document, index) =>
        `FIA ${index + 1} - ${document.title}\n${document.text}`,
    )
    .join("\n\n");
  const webText = (context.webPages || [])
    .map((page, index) => `WEB ${index + 1} - ${page.source}\n${page.content}`)
    .join("\n\n");

  return [fiaText, webText].filter(Boolean).join("\n\n");
}

function chunkText(text, chunkSize) {
  const chunks = [];

  for (let index = 0; index < text.length; index += chunkSize) {
    chunks.push(text.slice(index, index + chunkSize));
  }

  return chunks;
}

function formatAnalysisValue(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item : JSON.stringify(item)))
      .join("; ");
  }

  if (typeof value === "string") {
    return value;
  }

  if (value && typeof value === "object") {
    return Object.entries(value)
      .map(
        ([key, item]) =>
          `${key}: ${Array.isArray(item) ? item.join(", ") : String(item)}`,
      )
      .join("; ");
  }

  return "";
}

function buildSourceAnalysesText(sourceAnalyses) {
  if (!sourceAnalyses?.length) {
    return "No se hizo análisis previo por lotes.";
  }

  return sourceAnalyses
    .map((analysis, index) => {
      if (typeof analysis === "string") {
        return `${index + 1}. ${analysis}`;
      }

      return `${index + 1}. mejoras=${formatAnalysisValue(analysis.team_upgrades)} | ritmo=${formatAnalysisValue(analysis.performance_signals)} | impacto=${formatAnalysisValue(analysis.prediction_impacts)}`;
    })
    .join(" | ")
    .slice(0, 3500);
}

async function analyzeSourceChunks(context) {
  const corpus = buildSourceCorpus(context);

  if (corpus.length <= SOURCE_ANALYSIS_THRESHOLD) {
    return [];
  }

  const chunks = chunkText(corpus, SOURCE_ANALYSIS_CHUNK_CHARS).slice(
    0,
    MAX_SOURCE_ANALYSIS_CHUNKS,
  );
  const analyses = [];

  console.log(
    `\nContexto de fuentes grande (${corpus.length} caracteres). Analizando en ${chunks.length} peticiones previas a OpenRouter...\n`,
  );

  for (let index = 0; index < chunks.length; index++) {
    const prompt = `
Analiza este lote de fuentes de F1 para el GP ${context.currentRace?.raceName || context.circuit}.
Busca SOLO señales útiles para predecir la carrera: mejoras por equipo, ritmo reciente, problemas de fiabilidad, neumáticos, clima, power unit y cualquier cambio técnico.
Responde SOLO JSON válido:
{
  "team_upgrades": ["equipo: mejora o paquete detectado y posible impacto"],
  "performance_signals": ["equipo/piloto: señal de ritmo o evolución"],
  "prediction_impacts": ["cómo debería afectar a pole/top10/escudería/piloto+"]
}

Fuentes lote ${index + 1}/${chunks.length}:
${chunks[index]}
`;

    const response = await askOpenRouter(prompt);
    const parsed = extractJson(response);

    analyses.push(parsed || response.slice(0, 1200));
  }

  console.log("Análisis previo de fuentes completado.\n");

  return analyses;
}

function extractRelevantWebText(text, circuit) {
  const cleanCircuit = normalizeCircuit(circuit);

  const keywords = [
    cleanCircuit,
    "Miami",
    "McLaren",
    "Mercedes",
    "Ferrari",
    "Red Bull",
    "Verstappen",
    "Norris",
    "Piastri",
    "Leclerc",
    "Hamilton",
    "Russell",
    "Antonelli",
    "Alonso",
    "Sainz",
    "pole",
    "qualifying",
    "classification",
    "race pace",
    "practice",
    "FP1",
    "FP2",
    "FP3",
    "sprint",
    "standings",
    "constructors",
    "drivers",
    "degradation",
    "tyres",
    "strategy",
    "upgrade",
    "updates",
    "upgrades",
    "development",
    "aero",
    "floor",
    "front wing",
    "rear wing",
    "new package",
    "long run",
    "one-lap pace",
    "race simulation",
    "weather",
    "rain",
    "wet",
    "dry",
    "safety car",
    "retirement",
    "reliability",
    "set-up",
    "setup",
    "mejora",
    "mejoras",
    "evolución",
    "paquete",
    "lluvia",
    "ritmo",
    "clasificación",
    "neumáticos",
    "race",
    "points",
  ];

  const sentences = String(text || "")
    .split(/[.!?]/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  const relevant = sentences.filter((sentence) =>
    keywords.some((keyword) =>
      sentence.toLowerCase().includes(keyword.toLowerCase()),
    ),
  );

  const selected = relevant.length
    ? relevant.slice(0, 2)
    : sentences.slice(0, 2);

  return selected.join(". ").slice(0, MAX_WEB_TEXT_PER_SOURCE);
}

function buildWebText(webPages, circuit) {
  if (!webPages.length) {
    return "No se ha podido extraer texto útil de páginas web.";
  }

  const text = webPages
    .map((page, index) => {
      const relevant = extractRelevantWebText(page.content, circuit);

      return `${index + 1}. ${page.source}: ${relevant}`;
    })
    .join(" | ");

  return text.slice(0, MAX_TOTAL_WEB_TEXT);
}

function buildFallbackTop10FromStandings(driverStandings) {
  if (Array.isArray(driverStandings) && driverStandings.length >= 10) {
    return driverStandings.slice(0, 10).map((item, index) => ({
      position: index + 1,
      driver: item.driver,
      team: item.team,
      confidence: Math.max(35, 65 - index * 3),
      reason:
        "Basado en clasificación actual de pilotos y rendimiento acumulado.",
    }));
  }

  const fallback = [
    { driver: "Lando Norris", team: "McLaren" },
    { driver: "Oscar Piastri", team: "McLaren" },
    { driver: "Max Verstappen", team: "Red Bull" },
    { driver: "Charles Leclerc", team: "Ferrari" },
    { driver: "George Russell", team: "Mercedes" },
    { driver: "Lewis Hamilton", team: "Ferrari" },
    { driver: "Kimi Antonelli", team: "Mercedes" },
    { driver: "Fernando Alonso", team: "Aston Martin" },
    { driver: "Carlos Sainz", team: "Williams" },
    { driver: "Alexander Albon", team: "Williams" },
  ];

  return fallback.map((item, index) => ({
    position: index + 1,
    driver: item.driver,
    team: item.team,
    confidence: Math.max(35, 60 - index * 3),
    reason: "Fallback basado en rendimiento general estimado de equipos.",
  }));
}

function isSameDriverOrder(first, second) {
  if (!Array.isArray(first) || !Array.isArray(second) || first.length < 10) {
    return false;
  }

  return first.slice(0, 10).every((item, index) => {
    const firstName = normalizeDriverName(item.driver);
    const secondName = normalizeDriverName(second[index]?.driver);

    return firstName && firstName === secondName;
  });
}

function computeTeamWithMostPoints(top10) {
  const pointsByTeam = {};

  top10.forEach((item) => {
    const points = POINTS_BY_POSITION[item.position] || 0;

    if (!pointsByTeam[item.team]) {
      pointsByTeam[item.team] = 0;
    }

    pointsByTeam[item.team] += points;
  });

  const sorted = Object.entries(pointsByTeam).sort((a, b) => b[1] - a[1]);

  if (!sorted.length) {
    return {
      team: "McLaren",
      points: 0,
    };
  }

  return {
    team: sorted[0][0],
    points: sorted[0][1],
  };
}

function slugify(value) {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function getDriverOverride(driverName) {
  return DRIVER_OVERRIDES[normalizeText(driverName)] || null;
}

function getDriverStanding(driverName, context) {
  const normalized = normalizeText(driverName);
  const override = getDriverOverride(driverName);
  const targetNames = [normalized];

  if (override?.nombre) {
    targetNames.push(normalizeText(override.nombre));
  }

  return (context.driverStandings || []).find((item) =>
    targetNames.includes(normalizeText(item.driver)),
  );
}

function resolveKnownDriverName(value, context) {
  const rawName = getDriverNameFromPrediction(value);
  const normalized = normalizeText(rawName);

  if (!normalized) {
    return "";
  }

  const override = getDriverOverride(rawName);

  if (override?.nombre) {
    return override.nombre;
  }

  const standing = getDriverStanding(rawName, context);

  if (standing?.driver) {
    return standing.driver;
  }

  return "";
}

function extractDriverNameFromFantasyCardText(value, context) {
  const rawText = String(value || "").replace(/\s+/g, " ").trim();
  const normalizedText = normalizeText(rawText);

  if (!normalizedText) {
    return "";
  }

  const candidates = [
    ...(context?.driverStandings || []).map((item) => item.driver),
    ...Object.values(DRIVER_OVERRIDES).map((item) => item.nombre).filter(Boolean),
  ];

  const match = candidates.find((driverName) =>
    normalizedText.includes(normalizeText(driverName)),
  );

  return match || "";
}

function getTeamName(team) {
  if (TEAM_IDS[team]) {
    return team;
  }

  const normalized = normalizeText(team);
  const alias = TEAM_ALIASES[normalized];

  if (alias) {
    return alias;
  }

  const found = Object.keys(TEAM_IDS).find(
    (candidate) => normalizeText(candidate) === normalized,
  );

  return found || team || "McLaren";
}

function buildTeamObject(team, includeColor) {
  const teamName = getTeamName(team);

  return {
    id: TEAM_IDS[teamName] || slugify(teamName),
    nombre: teamName,
    urlImagen: null,
    color: includeColor ? TEAM_COLORS[teamName] || null : null,
  };
}

function buildDriverObject(driverName, context, includeTeam) {
  const standing = getDriverStanding(driverName, context);
  const override = getDriverOverride(driverName) || {};
  const name = override.nombre || standing?.driver || driverName;
  const team = override.team || standing?.team || "McLaren";

  const driver = {
    id: override.id || standing?.id || slugify(name),
    nombre: name,
    codPiloto:
      override.codPiloto || standing?.code || name.slice(0, 3).toUpperCase(),
    nacionalidad: override.nacionalidad || standing?.nationality || "",
    dorsal: override.dorsal || standing?.number || 0,
  };

  if (!includeTeam) {
    return driver;
  }

  return {
    ...driver,
    urlImagen: null,
    activo: true,
    escuderia: buildTeamObject(team, false),
  };
}

function getDriverNameFromPrediction(value) {
  if (typeof value === "string") {
    return value;
  }

  return (
    value?.driver ||
    value?.nombre ||
    value?.piloto?.nombre ||
    value?.piloto?.driver ||
    ""
  );
}

function getTeamFromDriverName(driverName, context) {
  const standing = getDriverStanding(driverName, context);
  const override = getDriverOverride(driverName);

  return override?.team || standing?.team || "McLaren";
}

function getRawTop10(rawPrediction, fallbackTop10) {
  if (Array.isArray(rawPrediction?.ordenPilotosPuntos)) {
    return rawPrediction.ordenPilotosPuntos.slice(0, 10).map((item, index) => ({
      position: Number(item.posicion || index + 1),
      driver: getDriverNameFromPrediction(item),
      team: item.piloto?.escuderia?.nombre || "",
    }));
  }

  if (Array.isArray(rawPrediction?.top_10)) {
    return rawPrediction.top_10;
  }

  return fallbackTop10;
}

function getRawFullRacePrediction(rawPrediction) {
  if (Array.isArray(rawPrediction?.previsionCarreraCompleta)) {
    return rawPrediction.previsionCarreraCompleta.map((item, index) => ({
      position: Number(item.posicion || item.position || index + 1),
      driver: getDriverNameFromPrediction(item),
      team: item.team || item.piloto?.escuderia?.nombre || "",
    }));
  }

  if (
    Array.isArray(rawPrediction?.ordenPilotosPuntos) &&
    rawPrediction.ordenPilotosPuntos.length > 10
  ) {
    return rawPrediction.ordenPilotosPuntos.map((item, index) => ({
      position: Number(item.posicion || item.position || index + 1),
      driver: getDriverNameFromPrediction(item),
      team: item.team || item.piloto?.escuderia?.nombre || "",
    }));
  }

  if (Array.isArray(rawPrediction?.full_race_prediction)) {
    return rawPrediction.full_race_prediction.map((item, index) => ({
      position: Number(item.position || index + 1),
      driver: getDriverNameFromPrediction(item),
      team: item.team || "",
    }));
  }

  return [];
}

function getRawStartingGridPrediction(rawPrediction) {
  const rawGrid =
    rawPrediction?.previsionParrillaSalida ||
    rawPrediction?.previsionClasificacion ||
    rawPrediction?.starting_grid_prediction ||
    rawPrediction?.qualifying_prediction;

  if (!Array.isArray(rawGrid)) {
    return [];
  }

  return rawGrid.map((item, index) => ({
    position: Number(item.posicion || item.position || index + 1),
    driver: getDriverNameFromPrediction(item),
    team: item.team || item.piloto?.escuderia?.nombre || "",
  }));
}

function buildFullRacePrediction(rawPrediction, top10, context) {
  const rawFullRace = getRawFullRacePrediction(rawPrediction).filter(
    (item) => !isEmpty(item.driver),
  );
  const baseList = rawFullRace.length ? rawFullRace : top10;
  const usedDrivers = new Set();
  const fullRace = [];

  baseList.forEach((item) => {
    const driverName = resolveKnownDriverName(item, context);
    const normalizedDriver = normalizeDriverName(driverName);

    if (!normalizedDriver || usedDrivers.has(normalizedDriver)) {
      return;
    }

    usedDrivers.add(normalizedDriver);
    fullRace.push({
      position: fullRace.length + 1,
      driver: driverName,
      team: item.team || getTeamFromDriverName(driverName, context),
    });
  });

  (context.driverStandings || []).forEach((item) => {
    const normalizedDriver = normalizeDriverName(item.driver);

    if (!normalizedDriver || usedDrivers.has(normalizedDriver)) {
      return;
    }

    usedDrivers.add(normalizedDriver);
    fullRace.push({
      position: fullRace.length + 1,
      driver: item.driver,
      team: item.team,
    });
  });

  (context.fantasyDrivers || []).forEach((driverName) => {
    const resolvedDriverName = resolveKnownDriverName(driverName, context);
    const normalizedDriver = normalizeDriverName(resolvedDriverName);

    if (!normalizedDriver || usedDrivers.has(normalizedDriver)) {
      return;
    }

    usedDrivers.add(normalizedDriver);
    fullRace.push({
      position: fullRace.length + 1,
      driver: resolvedDriverName,
      team: getTeamFromDriverName(resolvedDriverName, context),
    });
  });

  return fullRace.slice(0, MAX_GRID_DRIVERS).map((item, index) => ({
    ...item,
    position: index + 1,
  }));
}

function buildStartingGridPrediction(
  rawPrediction,
  fullRacePrediction,
  context,
) {
  const rawStartingGrid = getRawStartingGridPrediction(rawPrediction).filter(
    (item) => !isEmpty(item.driver),
  );
  const baseList = rawStartingGrid.length
    ? rawStartingGrid
    : fullRacePrediction;
  const usedDrivers = new Set();
  const startingGrid = [];

  baseList.forEach((item) => {
    const driverName = resolveKnownDriverName(item, context);
    const normalizedDriver = normalizeDriverName(driverName);

    if (!normalizedDriver || usedDrivers.has(normalizedDriver)) {
      return;
    }

    usedDrivers.add(normalizedDriver);
    startingGrid.push({
      position: startingGrid.length + 1,
      driver: driverName,
      team: item.team || getTeamFromDriverName(driverName, context),
    });
  });

  fullRacePrediction.forEach((item) => {
    const normalizedDriver = normalizeDriverName(item.driver);

    if (!normalizedDriver || usedDrivers.has(normalizedDriver)) {
      return;
    }

    usedDrivers.add(normalizedDriver);
    startingGrid.push({
      position: startingGrid.length + 1,
      driver: item.driver,
      team: item.team,
    });
  });

  return startingGrid.slice(0, MAX_GRID_DRIVERS).map((item, index) => ({
    ...item,
    position: index + 1,
  }));
}

function getRawPodium(rawPrediction, top10) {
  if (Array.isArray(rawPrediction?.ordenPilotosPodio)) {
    return rawPrediction.ordenPilotosPodio
      .slice(0, 3)
      .map((item) => getDriverNameFromPrediction(item));
  }

  if (Array.isArray(rawPrediction?.podium)) {
    return rawPrediction.podium.slice(0, 3).map(getDriverNameFromPrediction);
  }

  return top10.slice(0, 3).map((item) => item.driver);
}

function getRawDriver(rawPrediction, newKey, oldKey, fallback) {
  const value = rawPrediction?.[newKey] || rawPrediction?.[oldKey];
  const driverName = getDriverNameFromPrediction(value);

  return isEmpty(driverName) ? fallback : driverName;
}

function normalizeDriverName(value) {
  return normalizeText(getDriverNameFromPrediction(value));
}

function pickMostPositionsGainedDriver(
  rawPrediction,
  top10,
  fullRacePrediction,
  startingGridPrediction,
  poleDriver,
) {
  const rawDriver = getRawDriver(
    rawPrediction,
    "pilotoMasPuestosGanados",
    "driver_most_positions_gained",
    "",
  );
  const rawFinalPosition = Number(rawPrediction?.puestoPilotoPlus || 0);
  const poleName = normalizeDriverName(poleDriver);
  const winnerName = normalizeDriverName(top10[0]?.driver);
  const candidateName = normalizeDriverName(rawDriver);
  const startingPositions = new Map(
    startingGridPrediction.map((item) => [
      normalizeDriverName(item.driver),
      item.position,
    ]),
  );
  const gainCandidates = fullRacePrediction
    .map((item) => {
      const driverName = normalizeDriverName(item.driver);
      const startPosition = startingPositions.get(driverName);
      const finalPosition = item.position;

      return {
        driver: item.driver,
        finalPosition,
        startPosition,
        gainedPositions:
          Number.isFinite(startPosition) && Number.isFinite(finalPosition)
            ? startPosition - finalPosition
            : -Infinity,
      };
    })
    .filter((item) => {
      const driverName = normalizeDriverName(item.driver);

      return (
        item.gainedPositions > 0 &&
        item.finalPosition < fullRacePrediction.length &&
        driverName !== poleName &&
        driverName !== winnerName
      );
    })
    .sort((a, b) => {
      if (b.gainedPositions !== a.gainedPositions) {
        return b.gainedPositions - a.gainedPositions;
      }

      return a.finalPosition - b.finalPosition;
    });

  if (gainCandidates.length) {
    return {
      driver: gainCandidates[0].driver,
      finalPosition: gainCandidates[0].finalPosition,
      gainedPositions: gainCandidates[0].gainedPositions,
      startPosition: gainCandidates[0].startPosition,
    };
  }

  const validFinalPosition =
    Number.isFinite(rawFinalPosition) &&
    rawFinalPosition >= 1 &&
    rawFinalPosition <= fullRacePrediction.length;

  const isValidCandidate =
    candidateName &&
    candidateName !== poleName &&
    candidateName !== winnerName &&
    validFinalPosition &&
    rawFinalPosition < fullRacePrediction.length;

  if (isValidCandidate) {
    const racePosition =
      fullRacePrediction.findIndex(
        (item) => normalizeDriverName(item.driver) === candidateName,
      ) + 1;

    return {
      driver: rawDriver,
      finalPosition:
        racePosition > 0
          ? racePosition
          : validFinalPosition
            ? rawFinalPosition
            : 10,
    };
  }

  const alternative =
    fullRacePrediction.find((item) => {
      const driverName = normalizeDriverName(item.driver);
      return (
        item.position >= 8 &&
        driverName !== poleName &&
        driverName !== winnerName
      );
    }) ||
    fullRacePrediction.find((item) => {
      const driverName = normalizeDriverName(item.driver);
      return driverName !== poleName && driverName !== winnerName;
    }) ||
    top10[top10.length - 1];

  return {
    driver: alternative.driver,
    finalPosition: alternative.position,
  };
}

function getFinalPositionInFullPrediction(driverName, fullRacePrediction) {
  const normalizedDriver = normalizeDriverName(driverName);
  const match = fullRacePrediction.find(
    (item) => normalizeDriverName(item.driver) === normalizedDriver,
  );

  return match?.position || null;
}

function getPlusPositionFromOrder(
  prediction,
  driverName = prediction?.pilotoMasPuestosGanados?.nombre,
) {
  if (!driverName || !Array.isArray(prediction?.ordenPilotosPuntos)) {
    return null;
  }

  const normalizedDriverName = normalizeDriverName(driverName);
  const match = prediction.ordenPilotosPuntos.find(
    (item) => normalizeDriverName(item.piloto?.nombre) === normalizedDriverName,
  );

  const position = Number(match?.posicion);

  return Number.isFinite(position) && position > 0 ? position : null;
}

function getRequiredPlusPositionFromOrder(prediction, driverName, label) {
  const plusPosition = getPlusPositionFromOrder(prediction, driverName);

  if (!plusPosition) {
    throw new Error(
      `No se pudo calcular ${label}: ${driverName || "piloto no detectado"} no aparece en ordenPilotosPuntos.`,
    );
  }

  return plusPosition;
}

function getPredictionDriverNames(prediction) {
  const names = [];
  const usedDrivers = new Set();
  const addDriver = (value) => {
    const driverName = getDriverNameFromPrediction(value);
    const normalizedDriver = normalizeDriverName(driverName);

    if (!normalizedDriver || usedDrivers.has(normalizedDriver)) {
      return;
    }

    usedDrivers.add(normalizedDriver);
    names.push(driverName);
  };

  [
    prediction?.ordenPilotosPuntos,
    prediction?.previsionCarreraCompleta,
    prediction?.previsionParrillaSalida,
  ].forEach((items) => {
    if (Array.isArray(items)) {
      items.forEach(addDriver);
    }
  });

  [
    prediction?.pilotoMasPuestosGanados,
    prediction?.pilotoPole,
    prediction?.pilotoVueltaRapida,
  ].forEach(addDriver);

  return names;
}

function formatFantasyPoleTime(value) {
  const raw = String(value || "").trim();

  if (!raw) {
    return "00:00:000";
  }

  const match = raw.match(/^(\d+):(\d{2})[.:](\d{3})$/);

  if (!match) {
    return raw;
  }

  return `${String(match[1]).padStart(2, "0")}:${match[2]}:${match[3]}`;
}

function sanitizePoleTime(value, context) {
  const predictedMs = parseLapTimeToMs(value);
  const baseMs =
    parseLapTimeToMs(context.previousPole?.time) ||
    parseLapTimeToMs(context.poleEstimation?.basePoleTime) ||
    parseLapTimeToMs(context.profile?.fallbackPoleTime);

  if (!predictedMs || !baseMs) {
    return formatFantasyPoleTime(value);
  }

  const trendMs = context.poleTrend?.averageDeltaMs || 0;
  const boundedTrendMs = Math.max(-2500, Math.min(2500, trendMs));
  const maxDeltaMs = Math.max(Math.abs(boundedTrendMs) + 1500, 3000);
  const deltaMs = predictedMs - baseMs;

  if (Math.abs(deltaMs) <= maxDeltaMs) {
    return formatFantasyPoleTime(value);
  }

  const correctedMs = baseMs + boundedTrendMs;

  console.log(
    `Tiempo de pole corregido por estar fuera de escala: ${value} -> ${formatMsToLapTime(correctedMs)}`,
  );

  return formatFantasyPoleTime(formatMsToLapTime(correctedMs));
}

function getPredictionDate(rawPrediction) {
  const rawDate = String(rawPrediction?.fecha || "").trim();

  if (rawDate && rawDate.toLowerCase() !== "fecha actual") {
    return rawDate;
  }

  return new Date().toString();
}

function buildFantasyPrediction(rawPrediction, context) {
  const fallbackTop10 = buildFallbackTop10FromStandings(
    context.driverStandings,
  );
  const rawTop10 = getRawTop10(rawPrediction, fallbackTop10);
  const warnings = [];

  let top10 = Array.from({ length: 10 }).map((_, index) => {
    const current = rawTop10[index] || {};
    const fallback = fallbackTop10[index];
    const driver = getDriverNameFromPrediction(current) || fallback.driver;

    return {
      position: index + 1,
      driver,
      team:
        current.team ||
        current.piloto?.escuderia?.nombre ||
        getTeamFromDriverName(driver, context),
    };
  });

  const fullRacePrediction = buildFullRacePrediction(
    rawPrediction,
    top10,
    context,
  );
  top10 = fullRacePrediction.slice(0, 10).map((item, index) => ({
    ...item,
    position: index + 1,
  }));

  if (isSameDriverOrder(top10, fallbackTop10)) {
    warnings.push(
      "OpenRouter devolvió el mismo orden que la clasificación actual del campeonato; el script no lo modificó.",
    );
  }

  const startingGridPrediction = buildStartingGridPrediction(
    rawPrediction,
    fullRacePrediction,
    context,
  );
  const teamLeader = computeTeamWithMostPoints(top10);
  const podium = getRawPodium(rawPrediction, top10);
  const poleDriver = getRawDriver(
    rawPrediction,
    "pilotoPole",
    "pole_driver",
    top10[0].driver,
  );
  const fastestLapDriver = getRawDriver(
    rawPrediction,
    "pilotoVueltaRapida",
    "fastest_lap_driver",
    poleDriver,
  );
  const plusPrediction = pickMostPositionsGainedDriver(
    rawPrediction,
    top10,
    fullRacePrediction,
    startingGridPrediction,
    poleDriver,
  );
  const rawPlusDriver = getRawDriver(
    rawPrediction,
    "pilotoMasPuestosGanados",
    "driver_most_positions_gained",
    "",
  );

  if (
    rawPlusDriver &&
    normalizeDriverName(rawPlusDriver) !==
      normalizeDriverName(plusPrediction.driver)
  ) {
    warnings.push(
      `pilotoMasPuestosGanados corregido: OpenRouter propuso ${rawPlusDriver}, pero no tenía ganancia real válida según parrilla/llegada. Se usa ${plusPrediction.driver}.`,
    );
  }
  const plusFinalPosition =
    getFinalPositionInFullPrediction(
      plusPrediction.driver,
      fullRacePrediction,
    ) || plusPrediction.finalPosition;

  if (plusFinalPosition !== plusPrediction.finalPosition) {
    warnings.push(
      `Posición final de pilotoMasPuestosGanados corregida: ${plusPrediction.driver} aparece ${plusFinalPosition}º en previsionCarreraCompleta, no ${plusPrediction.finalPosition}º.`,
    );
  }

  if (plusFinalPosition > 10) {
    warnings.push(
      `El piloto con más adelantamientos (${plusPrediction.driver}) termina fuera del top 10 según previsionCarreraCompleta: posición ${plusFinalPosition}.`,
    );
  }
  const winningTeam =
    rawPrediction?.escuderiaGanadora?.nombre ||
    rawPrediction?.team_most_points ||
    teamLeader.team;
  const poleTime =
    rawPrediction?.tiempoPole ||
    rawPrediction?.pole_time ||
    context.poleEstimation.realisticPoleTime;
  const rawPlusPosition = Number(rawPrediction?.puestoPilotoPlus ?? 0);
  const provisionalPlusPosition =
    Number.isFinite(rawPlusPosition) && rawPlusPosition > 0
      ? rawPlusPosition
      : 0;
  const rawSafetyCars = Number(rawPrediction?.numeroSafetyCars ?? 0);
  const safetyCarAverage = context.safetyCarHistory?.average;
  const numberSafetyCars =
    Number.isFinite(safetyCarAverage) && safetyCarAverage >= 0
      ? safetyCarAverage
      : rawSafetyCars;

  if (Number.isFinite(safetyCarAverage) && rawSafetyCars !== numberSafetyCars) {
    warnings.push(
      `numeroSafetyCars ajustado a la media histórica SC/VSC del mismo GP/circuito: ${numberSafetyCars} en vez de ${rawSafetyCars}.`,
    );
  }

  const prediction = {
    id: rawPrediction?.id ?? null,
    jugador: context.fantasyUser || rawPrediction?.jugador || DEFAULT_PLAYER,
    idCarrera: rawPrediction?.idCarrera || DEFAULT_RACE_ID,
    idLiga: rawPrediction?.idLiga || DEFAULT_LEAGUE_ID,
    fecha: getPredictionDate(rawPrediction),
    ordenPilotosPuntos: fullRacePrediction.map((item, index) => ({
      piloto: buildDriverObject(item.driver, context, false),
      posicion: index + 1,
    })),
    previsionCarreraCompleta: fullRacePrediction.map((item, index) => ({
      piloto: buildDriverObject(item.driver, context, true),
      posicion: index + 1,
    })),
    previsionParrillaSalida: startingGridPrediction.map((item, index) => ({
      piloto: buildDriverObject(item.driver, context, true),
      posicion: index + 1,
    })),
    ordenPilotosPodio: podium.slice(0, 3).map((driver, index) => ({
      piloto: buildDriverObject(driver, context, true),
      posicion: index + 1,
    })),
    escuderiaGanadora: buildTeamObject(winningTeam, true),
    pilotoMasPuestosGanados: buildDriverObject(
      plusPrediction.driver,
      context,
      true,
    ),
    pilotoPole: buildDriverObject(poleDriver, context, true),
    pilotoVueltaRapida: buildDriverObject(fastestLapDriver, context, true),
    numeroAbandonos: Number(rawPrediction?.numeroAbandonos ?? 0),
    numeroSafetyCars: numberSafetyCars,
    puestoPilotoPlus: provisionalPlusPosition,
    tiempoPole: sanitizePoleTime(poleTime, context),
    warnings,
  };

  return prediction;
}

function buildDriverStandingsText(driverStandings) {
  if (!driverStandings.length) {
    return "No disponible";
  }

  return driverStandings
    .slice(0, 8)
    .map(
      (item) =>
        `${item.position}.${item.driver}/${item.team}/${item.points}pts/${item.wins}wins`,
    )
    .join("; ");
}

function buildDriverStrengthReferenceText(driverStandings) {
  if (!driverStandings.length) {
    return "No disponible";
  }

  return [...driverStandings]
    .sort((a, b) => {
      const teamCompare = String(a.team).localeCompare(String(b.team));

      if (teamCompare !== 0) {
        return teamCompare;
      }

      return String(a.driver).localeCompare(String(b.driver));
    })
    .map((item) => `${item.driver}/${item.team}/${item.points}pts`)
    .join("; ");
}

function buildDriverEntryListText(driverStandings, fantasyDrivers = []) {
  if (!driverStandings.length && !fantasyDrivers.length) {
    return "No disponible";
  }

  const entries = [];
  const usedDrivers = new Set();

  driverStandings.forEach((item) => {
    const normalizedDriver = normalizeDriverName(item.driver);

    if (!normalizedDriver || usedDrivers.has(normalizedDriver)) {
      return;
    }

    usedDrivers.add(normalizedDriver);
    entries.push(item.driver);
  });

  fantasyDrivers.forEach((driverName) => {
    const normalizedDriver = normalizeDriverName(driverName);

    if (!normalizedDriver || usedDrivers.has(normalizedDriver)) {
      return;
    }

    usedDrivers.add(normalizedDriver);
    entries.push(driverName);
  });

  return entries.join("; ");
}

function buildConstructorStandingsText(constructorStandings) {
  if (!constructorStandings.length) {
    return "No disponible";
  }

  return constructorStandings
    .slice(0, 6)
    .map(
      (item) =>
        `${item.position}.${item.team}/${item.points}pts/${item.wins}wins`,
    )
    .join("; ");
}

function buildRecentRaceResultsText(races) {
  if (!races.length) {
    return "No disponible";
  }

  return races
    .slice(-3)
    .map((race) => {
      const top3 = (race.Results || [])
        .slice(0, 3)
        .map(
          (result) =>
            `${result.position}.${getDriverName(result.Driver)}/${result.Constructor?.name || ""}`,
        )
        .join(",");

      return `${race.raceName}: ${top3}`;
    })
    .join(" | ");
}

function buildLastRaceEvolutionText(races) {
  if (!races.length) {
    return "No disponible";
  }

  const lastRace = races[races.length - 1];
  const results = (lastRace.Results || []).slice(0, 10);
  const pointsByTeam = {};

  const top10 = results
    .map((result) => {
      const position = Number(result.position);
      const grid = Number(result.grid || 0);
      const delta =
        grid > 0 && Number.isFinite(position) ? grid - position : null;
      const team = result.Constructor?.name || "";

      pointsByTeam[team] =
        (pointsByTeam[team] || 0) + (POINTS_BY_POSITION[position] || 0);

      const deltaText =
        delta === null
          ? "sin dato parrilla"
          : `${delta >= 0 ? "+" : ""}${delta} puestos`;

      return `${position}.${getDriverName(result.Driver)}/${team}/salió ${grid || "?"}/${deltaText}`;
    })
    .join("; ");

  const teams = Object.entries(pointsByTeam)
    .sort((a, b) => b[1] - a[1])
    .map(([team, points]) => `${team} ${points}pts`)
    .join("; ");

  return `${lastRace.raceName}: top10 ${top10}. Puntos estimados por equipo: ${teams}`;
}

function buildRecentPolesText(poles) {
  if (!poles.length) {
    return "No disponible";
  }

  return poles
    .slice(0, 3)
    .map((pole) => `${pole.raceName}: ${pole.driver}/${pole.team}/${pole.time}`)
    .join(" | ");
}

function buildPoleTrendText(poleTrend) {
  if (!poleTrend?.comparisons?.length) {
    return "No disponible";
  }

  const comparisons = poleTrend.comparisons
    .map((item) => {
      const sign = item.deltaSeconds >= 0 ? "+" : "";
      return `${item.raceName}: ${CURRENT_SEASON} ${item.currentTime} vs ${PREVIOUS_SEASON} ${item.previousTime} (${sign}${item.deltaSeconds}s)`;
    })
    .join(" | ");

  const sign = poleTrend.averageDeltaSeconds >= 0 ? "+" : "";

  return `${comparisons}. Media ${CURRENT_SEASON} vs ${PREVIOUS_SEASON}: ${sign}${poleTrend.averageDeltaSeconds}s`;
}

function printPoleTrendComparison(poleTrend) {
  console.log(`\nComparativa poles ${PREVIOUS_SEASON} vs ${CURRENT_SEASON}:\n`);

  if (!poleTrend?.comparisons?.length) {
    console.log("No hay comparativas de pole disponibles.");
    return;
  }

  poleTrend.comparisons.forEach((item) => {
    const sign = item.deltaSeconds >= 0 ? "+" : "";

    console.log(`${item.raceName}`);
    console.log(
      `  ${PREVIOUS_SEASON}: ${item.previousTime} - ${item.previousDriver}`,
    );
    console.log(
      `  ${CURRENT_SEASON}: ${item.currentTime} - ${item.currentDriver}`,
    );
    console.log(`  Diferencia: ${sign}${item.deltaSeconds}s`);
  });

  const sign = poleTrend.averageDeltaSeconds >= 0 ? "+" : "";

  console.log(
    `\nMedia de diferencia de pole ${CURRENT_SEASON} vs ${PREVIOUS_SEASON}: ${sign}${poleTrend.averageDeltaSeconds}s`,
  );
}

function buildWeatherText(weatherForecast) {
  if (!weatherForecast?.available) {
    return weatherForecast?.reason || "No disponible";
  }

  return [
    `${weatherForecast.raceName}`,
    `fecha ${weatherForecast.date}`,
    `ubicación ${weatherForecast.location}`,
    `estado ${weatherForecast.weather}`,
    `probabilidad lluvia ${weatherForecast.precipitationProbability ?? "?"}%`,
    `precipitación ${weatherForecast.precipitationSum ?? "?"}mm`,
    `temperatura ${weatherForecast.temperatureMin ?? "?"}-${weatherForecast.temperatureMax ?? "?"}C`,
    `viento máx ${weatherForecast.windSpeedMax ?? "?"}km/h`,
  ].join("; ");
}

function buildSafetyCarHistoryText(safetyCarHistory) {
  if (!safetyCarHistory?.available) {
    return safetyCarHistory?.reason || "No disponible";
  }

  const seasonText = safetyCarHistory.seasons
    .map((season) => {
      const events = season.events?.length
        ? ` [${season.events.map((event) => `lap ${event.lap} ${event.type}`).join(", ")}]`
        : "";

      return `${season.season} ${season.raceName}: ${season.count} parones${events}`;
    })
    .join(" | ");

  return `${seasonText}. Media entera=${safetyCarHistory.average}. Definición: cuenta Safety Car y Virtual Safety Car; si un VSC se convierte en SC en el mismo momento/incidente, cuenta como 1. Fuente=${safetyCarHistory.source}`;
}

function buildBaselineText(driverStandings) {
  return buildFallbackTop10FromStandings(driverStandings)
    .map((item) => `${item.position}.${item.driver}/${item.team}`)
    .join("; ");
}

async function askOpenRouter(prompt) {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("Falta OPENROUTER_API_KEY en el archivo .env");
  }

  const maxAttempts = 4;
  let lastErrorText = "";

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const maxTokens = Number(process.env.OPENROUTER_MAX_TOKENS) || 3200;

    console.log("\nLlamando a OpenRouter...");
    console.log(`Modelo: ${OPENROUTER_MODEL}`);
    console.log(`Intento: ${attempt}/${maxAttempts}`);
    console.log(`Tamaño prompt: ${prompt.length} caracteres`);
    console.log(`Max tokens: ${maxTokens}`);

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost",
          "X-Title": "Agente F1",
        },
        body: JSON.stringify({
          model: OPENROUTER_MODEL,
          messages: [
            {
              role: "system",
              content:
                "Eres un analista experto de Fórmula 1. Responde únicamente con JSON válido. No uses markdown.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.35,
          max_tokens: maxTokens,
        }),
      },
    );

    const rawText = await response.text();

    if (!response.ok) {
      lastErrorText = rawText;

      console.log("STATUS:", response.status);
      console.log("RESPUESTA RAW DE OPENROUTER:");
      console.log(rawText);

      if (response.status === 429 && attempt < maxAttempts) {
        const waitMs = attempt * 3000;
        console.log(`Rate limit. Reintentando en ${waitMs / 1000}s...`);
        await sleep(waitMs);
        continue;
      }

      throw new Error("Error llamando a OpenRouter");
    }

    let data;

    try {
      data = JSON.parse(rawText);
    } catch (error) {
      lastErrorText = rawText;
      console.log("OpenRouter respondió, pero no era JSON parseable:");
      console.log(rawText);

      if (attempt < maxAttempts) {
        await sleep(attempt * 2000);
        continue;
      }

      throw new Error("Respuesta inválida de OpenRouter");
    }

    const content = data?.choices?.[0]?.message?.content;
    const modelUsed = data?.model || OPENROUTER_MODEL;

    if (!content || !String(content).trim()) {
      lastErrorText = JSON.stringify(data, null, 2);

      console.log("OpenRouter no devolvió contenido útil.");
      console.log(`Modelo que tocó: ${modelUsed}`);
      console.log("Respuesta completa:");
      console.log(lastErrorText);

      if (attempt < maxAttempts) {
        const waitMs = attempt * 3000;
        console.log(`Reintentando en ${waitMs / 1000}s...`);
        await sleep(waitMs);
        continue;
      }

      throw new Error("OpenRouter no devolvió contenido tras varios intentos");
    }

    console.log(`Modelo usado realmente por OpenRouter: ${modelUsed}`);

    return content;
  }

  console.log("Último error recibido:");
  console.log(lastErrorText);

  throw new Error("No se pudo obtener respuesta de OpenRouter");
}

function getJsonCandidate(text) {
  const clean = String(text || "")
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  const firstBrace = clean.indexOf("{");
  const lastBrace = clean.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return clean;
  }

  return clean.slice(firstBrace, lastBrace + 1);
}

function extractJson(text) {
  const candidate = getJsonCandidate(text);

  try {
    return JSON.parse(candidate);
  } catch (error) {
    console.log(
      "\nLa IA devolvió JSON mal formado. Se usará fallback calculado.",
    );
    console.log("Error JSON:", error.message);
    console.log("\nRespuesta original:\n");
    console.log(text);

    return null;
  }
}

function parseStorageJson(value) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
}

async function getSessionSelectedUser(page) {
  const rawUser = await page.evaluate(() =>
    sessionStorage.getItem("usuarioSeleccionado"),
  );

  return parseStorageJson(rawUser);
}

async function getFantasySessionData(context) {
  const webUser = process.env.WEB_USER;
  const webPassword = process.env.WEB_PASSWORD;

  if (!webUser || !webPassword || !FANTASY_LOGIN_URL) {
    return { user: null, drivers: [] };
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(FANTASY_LOGIN_URL, {
      waitUntil: "networkidle",
      timeout: 60000,
    });
    await page.fill('input[formcontrolname="usuario"]', webUser);
    await page.fill('input[formcontrolname="password"]', webPassword);
    await page.locator('button[type="submit"]').click();
    await page.waitForLoadState("networkidle", { timeout: 60000 });

    const apuestasLink = page
      .locator('a[routerlink="/apuestas"], a[href="/apuestas"]')
      .filter({ hasText: "Apuestas" })
      .first();

    await apuestasLink.click({ timeout: 30000 });
    await page.waitForURL(/\/apuestas/, { timeout: 30000 });
    await page.waitForLoadState("networkidle", { timeout: 60000 });

    const user = await getSessionSelectedUser(page);
    await page
      .locator("app-card")
      .first()
      .waitFor({ state: "visible", timeout: 10000 })
      .catch(() => {});
    const cardTexts = await page
      .locator("app-card")
      .evaluateAll((cards) =>
        cards
          .map((card) => card.textContent.replace(/\s+/g, " ").trim())
          .filter(Boolean),
      );
    const usedDrivers = new Set();
    const drivers = cardTexts
      .map((cardText) => extractDriverNameFromFantasyCardText(cardText, context))
      .filter((driverName) => {
        const normalizedDriver = normalizeDriverName(driverName);

        if (!normalizedDriver || usedDrivers.has(normalizedDriver)) {
          return false;
        }

        usedDrivers.add(normalizedDriver);
        return true;
      });

    return { user, drivers };
  } catch (error) {
    console.log(
      `No se pudo leer usuarioSeleccionado de sessionStorage: ${error.message}`,
    );
    return { user: null, drivers: [] };
  } finally {
    await browser.close();
  }
}

function buildPredictionPositionTemplate(count) {
  return Array.from({ length: count })
    .map(
      (_, index) =>
        `    {"piloto":{"codPiloto":"COD","dorsal":0,"id":"id_piloto","nacionalidad":"Nacionalidad","nombre":"Piloto"},"posicion":${index + 1}}`,
    )
    .join(",\n");
}

function buildPrompt(context) {
  const {
    circuit,
    profile,
    previousPole,
    currentRace,
    poleEstimation,
    driverStandings,
    constructorStandings,
    recentRaceResults,
    recentPoles,
    poleTrend,
    weatherForecast,
    safetyCarHistory,
    fiaDocuments,
    webPages,
    sourceAnalyses,
  } = context;
  const player = context.fantasyUser || DEFAULT_PLAYER;
  const predictionGridCount = MAX_GRID_DRIVERS;

  return `
Predice F1 ${CURRENT_SEASON} ${circuit}. Responde SOLO JSON válido.

Instrucciones de análisis:
- Tu tarea es estimar el resultado probable de ESTA carrera, no repetir la clasificación actual del campeonato.
- Construye "ordenPilotosPuntos" como predicción completa de carrera de todos los pilotos. No uses la clasificación general ni los puntos del campeonato como orden base.
- Ordena primero por rendimiento esperado del coche en ESTE circuito: eficiencia aerodinámica, carga, tracción, velocidad punta, gestión de neumáticos, degradación, fiabilidad y ritmo de carrera.
- Después ajusta por actualizaciones reales detectadas en FIA/noticias: suelo, alerones, refrigeración, suspensión, power unit, piezas de baja/alta carga o paquetes aerodinámicos. Una mejora útil para el perfil del circuito debe cambiar el orden previsto.
- Después ajusta por tipo de circuito y condiciones: facilidad de adelantamiento, importancia de qualy/parrilla, clima, probabilidad de Safety Car, estrategia y forma reciente del piloto.
- Usa los puntos del campeonato solo como referencia débil de nivel general cuando falten señales de rendimiento, nunca para reconstruir el top 10.
- Ponderación obligatoria para "ordenPilotosPuntos": 35% adaptación del coche al circuito, 25% ritmo reciente de carrera y clasificación, 20% actualizaciones/mejoras aplicables, 10% degradación/neumáticos/estrategia, 10% forma del piloto/fiabilidad/clima.
- Da mucho peso a "Última carrera": úsala para detectar evolución reciente de equipos y pilotos, quién convirtió bien la parrilla en resultado, quién tuvo mejor ritmo de carrera y qué equipos sumaron más puntos.
- Da mucho peso a "PDFs FIA" y "Noticias web" para detectar mejoras reales: si un equipo trae paquete aerodinámico, suelo, alerón, refrigeración, motor o cambios de neumáticos que puedan mejorar rendimiento, refléjalo en pole, top 10, escudería ganadora y ritmo.
- Revisa específicamente "Mejoras por equipo". Si un equipo aparece con mejoras o paquete nuevo, estima si esas piezas ayudan al tipo de circuito actual y sube/baja su rendimiento en consecuencia. No inventes mejoras si ese bloque dice que no hay evidencia.
- Pondera cada mejora según el tipo de circuito. En Mónaco o circuitos urbanos lentos importa mucho más clasificación, carga aerodinámica, tracción, suspensión mecánica y confianza del piloto; el motor y la velocidad punta pesan poco. En Monza, Bakú, Canadá, Spa o circuitos de rectas largas, motor, eficiencia, drag, velocidad punta y frenada pesan mucho más. En circuitos técnicos como Barcelona, Suzuka o Qatar pesan carga eficiente, equilibrio y degradación.
- Si existe "Análisis previo de fuentes", úsalo como comparación entre lotes de fuentes: prioriza señales repetidas o coherentes entre varios lotes y evita copiar una única noticia aislada si contradice el resto.
- "Referencia de fuerza de pilotos" no está ordenada por clasificación; úsala solo para saber nivel general. No reconstruyas una clasificación de campeonato con ella. Si tu top 10 queda casi igual al campeonato, reházlo antes de responder usando última carrera, mejoras, circuito y clima.
- Antes de devolver el JSON, compara mentalmente tu top 10 con la clasificación general del campeonato. Si coincide casi literal, es inválido: reházlo dando prioridad a rendimiento del coche, actualizaciones y tipo de circuito.
- Debe haber una justificación implícita de circuito: por ejemplo, en circuitos urbanos pesa más clasificación/tracción; en circuitos rápidos pesa más eficiencia y velocidad punta; con lluvia pesa más pilotaje, errores, Safety Cars y variabilidad.
- Puedes mantener pilotos fuertes arriba si tiene sentido, pero el orden final debe reflejar una estimación específica del GP, no una tabla de puntos.
- Para "tiempoPole", usa obligatoriamente "Comparativa poles": ahí están las poles de cada GP ya disputado en ${PREVIOUS_SEASON} y ${CURRENT_SEASON}, con su diferencia. Calcula la media de esas diferencias y aplícala a la pole ${PREVIOUS_SEASON} de este circuito.
- La fórmula base para "tiempoPole" es: pole de este circuito en ${PREVIOUS_SEASON} + media de diferencias de "Comparativa poles". Ajusta solo unas décimas si el circuito, clima o mejoras lo justifican. Si la media está cerca de +0.5s, no predigas +15s o +20s.
- Usa la pole ${PREVIOUS_SEASON} del circuito como base principal. Si la pole ${PREVIOUS_SEASON} fue 1:10.899, un tiempo como 1:29.827 es inválido salvo lluvia extrema o cambio de trazado probado.
- Evita tiempos exageradamente lentos: salvo evidencia fuerte en noticias, el "tiempoPole" debe quedar normalmente dentro de unos pocos segundos respecto a la pole ${PREVIOUS_SEASON} del mismo circuito.
- Usa el ajuste de normativa y el tiempo de pole estimado solo como referencia secundaria; corrígelo siempre que las clasificaciones recientes indiquen una tendencia distinta.
- Revisa en las noticias web si algún equipo ha traído mejoras, evoluciones o paquetes nuevos para esta carrera o las carreras recientes, y tenlo en cuenta al valorar rendimiento, pole, ganador y top 10.
- Revisa los PDFs FIA del evento. Si aparece un documento de car presentation/display, technical/scrutineering, power unit o Pirelli, úsalo para detectar piezas nuevas, paquetes aerodinámicos, cambios de motor, neumáticos y condiciones específicas de la carrera.
- Analiza la previsión meteorológica del día de la carrera en el circuito. Si hay lluvia o alta probabilidad de lluvia, ajusta pole, top 10, Safety Cars, abandonos y piloto con más adelantamientos. Si la previsión es seca, no inventes lluvia.
- Genera "previsionParrillaSalida" como listado simple de ${MAX_GRID_DRIVERS} pilotos ordenados por estimación real de la parrilla de carrera/salida para este GP. Debe contener SOLO pilotos, nunca equipos, escuderías ni textos combinados.
- Genera "previsionCarreraCompleta" con esos mismos pilotos ordenados por posición final prevista de carrera. No inventes un límite fijo: usa la lista real de "Pilotos disponibles para prevision completa".
- En cada objeto, "piloto.nombre" debe ser únicamente el nombre del piloto, por ejemplo "Kimi Antonelli". No pongas "Mercedes", "Ferrari", "McLaren", nombres de equipo, ni textos tipo "Kimi Antonelli Mercedes".
- No repitas pilotos. Cada piloto puede aparecer una sola vez en "ordenPilotosPuntos", una sola vez en "previsionParrillaSalida" y una sola vez en "previsionCarreraCompleta".
- "ordenPilotosPuntos" debe contener todos los pilotos disponibles en FantasyF1 ordenados por posición final prevista, no solo los 10 primeros. Los 10 primeros de "ordenPilotosPuntos" serán los que se seleccionen para puntos.
- "pilotoMasPuestosGanados" significa el piloto que más posiciones gana comparando "previsionParrillaSalida" contra "previsionCarreraCompleta". No elijas al poleman ni a un piloto que ya sale delante y gana; debe ser alguien con margen real para avanzar.
- "puestoPilotoPlus" NO es "pilotoMasPuestosGanados". Es un número provisional de posición final; el script lo recalcula después leyendo el piloto + real en FantasyF1 y buscándolo en "ordenPilotosPuntos". Devuelve un número coherente, pero no mezcles este campo con el piloto de más adelantamientos.
- "numeroSafetyCars" es el número de parones esperados: cuenta Safety Car real y Virtual Safety Car. Si primero sale Virtual Safety Car y se convierte en Safety Car por el mismo incidente/momento, cuenta como 1. Si sale un SC distinto cuenta otro; si sale un VSC distinto cuenta otro.
- Para "numeroSafetyCars", si "Histórico parones SC/VSC" trae una media entera, usa exactamente esa media entera. No la ajustes por clima ni por intuición; el script la validará contra el histórico.
- "numeroAbandonos" es el número de pilotos que no terminarán la carrera.
- "tiempoPole" debe ir en formato "MM:SS:MMM", por ejemplo "01:11:533".

Datos:
Circuito=${profile.name}
Carrera=${currentRace?.raceName || circuit}
Tipo=${profile.type}
Características=${profile.characteristics}
Favorece=${profile.favours}
Adelantar=${profile.overtaking}
Degradación=${profile.degradation}
Importancia qualy/parrilla en este circuito=${profile.qualifyingImportance}

Pole ${PREVIOUS_SEASON}=${
    previousPole
      ? `${previousPole.driver}/${previousPole.team}/${previousPole.time}`
      : `no encontrada/base ${profile.fallbackPoleTime}`
  }
Tiempo pole base=${poleEstimation.basePoleTime}
Tiempo pole realista sugerido ${CURRENT_SEASON}=${poleEstimation.realisticPoleTime}
Tiempo pole por normativa, solo referencia secundaria=${poleEstimation.estimatedPoleTime}
Diferencia media aplicada por tendencia=${poleEstimation.trendDeltaSeconds}s
Ajuste normativa=${poleEstimation.slowdownPercentApplied}%

Referencia de fuerza de pilotos, sin orden de campeonato=${buildDriverStrengthReferenceText(driverStandings)}
Pilotos disponibles para prevision completa=${buildDriverEntryListText(driverStandings, context.fantasyDrivers)}
Constructores=${buildConstructorStandingsText(constructorStandings)}
Carreras recientes=${buildRecentRaceResultsText(recentRaceResults)}
Última carrera, evolución reciente=${buildLastRaceEvolutionText(recentRaceResults)}
Poles recientes=${buildRecentPolesText(recentPoles)}
Comparativa poles ${CURRENT_SEASON} vs ${PREVIOUS_SEASON}=${buildPoleTrendText(poleTrend)}
Clima previsto=${buildWeatherText(weatherForecast)}
Histórico parones SC/VSC mismo GP/circuito últimos ${SAFETY_CAR_HISTORY_YEARS} años=${buildSafetyCarHistoryText(safetyCarHistory)}
PDFs FIA=${buildFiaDocumentsText(fiaDocuments)}
Mejoras por equipo=${buildTeamUpgradeText(fiaDocuments, webPages)}
Noticias web=${buildWebText(webPages, circuit)}
Análisis previo de fuentes=${buildSourceAnalysesText(sourceAnalyses)}

Devuelve exactamente este JSON, sin markdown. Mantén la estructura y nombres de campos:
{
  "id": null,
  "jugador": {
    "id": "${player.id}",
    "nombre": "${player.nombre}",
    "password": null,
    "rol": "${player.rol}",
    "colorGrafica": "${player.colorGrafica}",
    "activo": null
  },
  "idCarrera": "${DEFAULT_RACE_ID}",
  "idLiga": "${DEFAULT_LEAGUE_ID}",
  "fecha": "fecha actual",
  "ordenPilotosPuntos": [
${buildPredictionPositionTemplate(predictionGridCount)}
  ],
  "previsionParrillaSalida": [
${buildPredictionPositionTemplate(predictionGridCount)}
  ],
  "previsionCarreraCompleta": [
${buildPredictionPositionTemplate(predictionGridCount)}
  ],
  "ordenPilotosPodio": [
    {"piloto":{"id":"id_piloto","nombre":"Piloto","codPiloto":"COD","nacionalidad":"Nacionalidad","dorsal":0,"urlImagen":null,"activo":true,"escuderia":{"id":"id_escuderia","nombre":"Escudería","urlImagen":null,"color":null}},"posicion":1},
    {"piloto":{"id":"id_piloto","nombre":"Piloto","codPiloto":"COD","nacionalidad":"Nacionalidad","dorsal":0,"urlImagen":null,"activo":true,"escuderia":{"id":"id_escuderia","nombre":"Escudería","urlImagen":null,"color":null}},"posicion":2},
    {"piloto":{"id":"id_piloto","nombre":"Piloto","codPiloto":"COD","nacionalidad":"Nacionalidad","dorsal":0,"urlImagen":null,"activo":true,"escuderia":{"id":"id_escuderia","nombre":"Escudería","urlImagen":null,"color":null}},"posicion":3}
  ],
  "escuderiaGanadora": {"id":"id_escuderia","nombre":"Escudería","urlImagen":null,"color":"#000000"},
  "pilotoMasPuestosGanados": {"id":"id_piloto","nombre":"Piloto","codPiloto":"COD","nacionalidad":"Nacionalidad","dorsal":0,"urlImagen":null,"activo":true,"escuderia":{"id":"id_escuderia","nombre":"Escudería","urlImagen":null,"color":null}},
  "pilotoPole": {"id":"id_piloto","nombre":"Piloto","codPiloto":"COD","nacionalidad":"Nacionalidad","dorsal":0,"urlImagen":null,"activo":true,"escuderia":{"id":"id_escuderia","nombre":"Escudería","urlImagen":null,"color":null}},
  "pilotoVueltaRapida": {"id":"id_piloto","nombre":"Piloto","codPiloto":"COD","nacionalidad":"Nacionalidad","dorsal":0,"urlImagen":null,"activo":true,"escuderia":{"id":"id_escuderia","nombre":"Escudería","urlImagen":null,"color":null}},
  "numeroAbandonos": 0,
  "numeroSafetyCars": 0,
  "puestoPilotoPlus": 0,
  "tiempoPole": "${poleEstimation.realisticPoleTime}"
}
`;
}

function isEmpty(value) {
  return value === undefined || value === null || String(value).trim() === "";
}

function getReasonForPosition(item, context, index) {
  const profile = context.profile;

  if (index === 0) {
    return `Estimación basada en rendimiento actual, tipo de circuito ${profile.type} y características: ${profile.characteristics}.`;
  }

  if (index <= 2) {
    return `Candidato fuerte por ritmo reciente, equipo competitivo y adaptación al circuito ${profile.name}.`;
  }

  if (index <= 5) {
    return `Opción sólida para puntos por rendimiento de equipo, estrategia y consistencia reciente.`;
  }

  return `Estimación de zona de puntos condicionada por clasificación, degradación y oportunidades de carrera.`;
}

function buildFallbackPrediction(context) {
  return buildFantasyPrediction(null, context);
}

function normalizePrediction(rawPrediction, context) {
  return rawPrediction
    ? buildFantasyPrediction(rawPrediction, context)
    : buildFallbackPrediction(context);
}

function predictionCopiedChampionshipStandings(prediction) {
  return (prediction.warnings || []).some((warning) =>
    warning.includes("mismo orden que la clasificación actual"),
  );
}

function printContext(context) {
  console.log("\nContexto usado:\n");
  console.log(`Circuito: ${context.profile.name}`);
  console.log(`Tipo: ${context.profile.type}`);
  console.log(`Características: ${context.profile.characteristics}`);

  if (context.previousPole) {
    console.log(
      `Pole ${PREVIOUS_SEASON}: ${context.previousPole.driver} - ${context.previousPole.team} - ${context.previousPole.time}`,
    );
  } else {
    console.log(`Pole ${PREVIOUS_SEASON}: no encontrada`);
  }

  console.log(
    `Pole realista sugerida ${CURRENT_SEASON}: ${context.poleEstimation.realisticPoleTime}`,
  );
  console.log(`Pilotos standings: ${context.driverStandings.length}`);
  console.log(
    `Constructores standings: ${context.constructorStandings.length}`,
  );
  console.log(`Carreras recientes: ${context.recentRaceResults.length}`);
  console.log(`Poles recientes: ${context.recentPoles.length}`);
  console.log(
    `Comparativas poles ${CURRENT_SEASON} vs ${PREVIOUS_SEASON}: ${context.poleTrend?.comparisons?.length || 0}`,
  );
  console.log(`Clima previsto: ${buildWeatherText(context.weatherForecast)}`);
  console.log(
    `Histórico SC/VSC: ${buildSafetyCarHistoryText(context.safetyCarHistory)}`,
  );
  console.log(
    `PDFs FIA leídos: ${(context.fiaDocuments || []).filter((document) => document.text).length}/${context.fiaDocuments?.length || 0}`,
  );
  console.log(`Páginas web leídas: ${context.webPages.length}`);
}

function printWebPages(webPages) {
  console.log("\nPáginas web leídas:\n");

  if (!webPages.length) {
    console.log("No se pudo leer ninguna página web útil.");
    return;
  }

  webPages.forEach((page, index) => {
    console.log(`${index + 1}. ${page.source} - ${page.pageTitle}`);
    console.log(`   ${page.url}`);
    console.log(`   Caracteres extraídos: ${page.content.length}`);
  });
}

function printFiaDocuments(fiaDocuments) {
  console.log("\nPDFs FIA leídos:\n");

  if (!fiaDocuments?.length) {
    console.log("No se encontraron PDFs FIA relevantes.");
    return;
  }

  fiaDocuments.forEach((document, index) => {
    console.log(`${index + 1}. ${document.title}`);
    console.log(`   ${document.url}`);

    if (document.text) {
      console.log(`   Estado: leído correctamente`);
      console.log(`   Caracteres extraídos: ${document.text.length}`);
    } else {
      console.log(`   Estado: no se ha podido leer`);
      console.log(
        `   Motivo: ${document.error || "no se pudo extraer texto útil"}`,
      );
    }
  });
}

function printPrediction(prediction) {
  prediction.previsionParrillaSalida.slice(0, MAX_GRID_DRIVERS).forEach((item, index) => {
    const position = item.posicion || index + 1;

    terminalLog(`${position}. ${item.piloto.nombre}`);
  });
}

async function buildContext(circuit) {
  const profile = getCircuitProfile(circuit);

  console.log("\nLeyendo datos estructurados de F1...\n");

  const [
    currentRace,
    previousPole,
    driverStandings,
    constructorStandings,
    recentRaceResults,
    recentPoles,
    poleTrend,
    weatherForecast,
  ] = await Promise.all([
    getCurrentYearRaceForCircuit(circuit, profile),
    getPreviousYearPoleForCircuit(circuit, profile),
    getDriverStandings(CURRENT_SEASON),
    getConstructorStandings(CURRENT_SEASON),
    getSeasonRaceResults(CURRENT_SEASON),
    getRecentPoles(CURRENT_SEASON),
    getPoleTrendComparison(),
    getWeatherForecastForRace(circuit, profile),
  ]);

  const poleEstimation = estimatePoleTime(previousPole, profile, poleTrend);

  console.log("\nLeyendo histórico de Safety Car/VSC del mismo GP...\n");

  const safetyCarHistory = await getSafetyCarHistory(
    circuit,
    profile,
    currentRace,
  );

  console.log(
    `Histórico SC/VSC calculado: ${buildSafetyCarHistoryText(safetyCarHistory)}\n`,
  );

  console.log("\nLeyendo páginas web especializadas de F1...\n");

  const [webPages, fiaDocuments] = await Promise.all([
    readWebSources(),
    readFiaDocuments(circuit, profile, currentRace),
  ]);

  return {
    circuit,
    profile,
    currentRace,
    previousPole,
    poleEstimation,
    driverStandings,
    constructorStandings,
    recentRaceResults,
    recentPoles,
    poleTrend,
    weatherForecast,
    safetyCarHistory,
    fiaDocuments,
    webPages,
  };
}

async function generatePrediction(context) {
  context.sourceAnalyses = await analyzeSourceChunks(context);

  const prompt = buildPrompt(context);

  console.log("\nEnviando información a OpenRouter...");
  console.log(`Modelo usado: ${OPENROUTER_MODEL}`);
  console.log(`Tamaño final del prompt: ${prompt.length} caracteres`);
  console.log("Esperando respuesta...\n");

  const start = Date.now();

  const response = await askOpenRouter(prompt);

  const seconds = Math.round((Date.now() - start) / 1000);

  console.log(`\nOpenRouter ha respondido en ${seconds} segundos.\n`);

  const rawPrediction = extractJson(response);
  let prediction = normalizePrediction(rawPrediction, context);

  let retryCount = 0;

  while (predictionCopiedChampionshipStandings(prediction)) {
    retryCount += 1;

    console.log(
      `OpenRouter ha copiado la clasificación general. Reintento correctivo ${retryCount}: pidiendo una predicción basada en carrera, circuito, mejoras y última carrera...\n`,
    );

    const retryPrompt = `${prompt}

RESPUESTA ANTERIOR INVÁLIDA:
El top 10 coincidió con la clasificación general del campeonato. No repitas esa tabla.
Este es el reintento correctivo número ${retryCount}. Debes cambiar el orden respecto a la clasificación general.
Genera una predicción nueva específica de este GP usando:
- rendimiento esperado de cada coche en este tipo de circuito,
- actualizaciones detectadas en FIA/noticias y si encajan con el circuito,
- última carrera y evolución reciente de ritmo,
- degradación, neumáticos, clima y estrategia,
- parrilla estimada, facilidad de adelantamiento y ritmo de carrera.
No basta con intercambiar dos pilotos: reconstruye el orden desde cero usando rendimiento de coches, mejoras y características del circuito.
El top 10 NO puede ser una copia literal de la clasificación general. Responde solo el JSON válido completo con el mismo formato.`;

    const retryStart = Date.now();
    const retryResponse = await askOpenRouter(retryPrompt);
    const retrySeconds = Math.round((Date.now() - retryStart) / 1000);

    console.log(
      `\nOpenRouter ha respondido al reintento ${retryCount} en ${retrySeconds} segundos.\n`,
    );

    const retryRawPrediction = extractJson(retryResponse);
    prediction = normalizePrediction(retryRawPrediction, context);
  }

  return prediction;
}

function formatPoleTimeForPage(value) {
  const raw = String(value || "").trim();
  const match = raw.match(/^(\d{1,2}):(\d{2}):(\d{3})$/);

  if (!match) {
    return raw;
  }

  return `${match[1].padStart(2, "0")}:${match[2]}.${match[3]}`;
}

function uniqueValues(values) {
  const usedValues = new Set();

  return values.filter((value) => {
    const normalizedValue = normalizeText(value);

    if (!normalizedValue || usedValues.has(normalizedValue)) {
      return false;
    }

    usedValues.add(normalizedValue);
    return true;
  });
}

function getDropdownSearchCandidates(value, label) {
  const candidates = [value];

  if (/escuder/i.test(label)) {
    const teamName = getTeamName(value);
    candidates.unshift(teamName);

    Object.entries(TEAM_ALIASES).forEach(([alias, canonicalName]) => {
      if (canonicalName === teamName) {
        candidates.push(alias);
      }
    });
  }

  return uniqueValues(candidates.map((candidate) => String(candidate || "")));
}

function optionMatchesDropdownValue(optionText, candidate, label) {
  const normalizedOption = normalizeText(optionText);
  const normalizedCandidate = normalizeText(candidate);

  if (!normalizedOption || !normalizedCandidate) {
    return false;
  }

  if (/escuder/i.test(label)) {
    const optionTeam = getTeamName(optionText);
    const candidateTeam = getTeamName(candidate);
    const normalizedOptionTeam = normalizeText(optionTeam);
    const normalizedCandidateTeam = normalizeText(candidateTeam);

    return (
      optionTeam === candidateTeam ||
      normalizedOption.includes(normalizedCandidate) ||
      normalizedCandidate.includes(normalizedOption) ||
      normalizedOption.includes(normalizedCandidateTeam) ||
      normalizedCandidate.includes(normalizedOptionTeam)
    );
  }

  return (
    normalizedOption === normalizedCandidate ||
    normalizedOption.includes(normalizedCandidate) ||
    normalizedCandidate.includes(normalizedOption)
  );
}

async function selectDropdownOption(page, container, value, label) {
  if (!value) {
    console.log(`No hay valor para ${label}, saltando...\n`);
    return;
  }

  const button = container.locator("button.dropdown-toggle").first();
  await button.scrollIntoViewIfNeeded();
  await button.click();

  const input = container.locator("input.search-input").first();
  await input.waitFor({ state: "visible", timeout: 10000 });
  const options = container.locator("a.dropdown-item, span.dropdown-item");
  const candidates = getDropdownSearchCandidates(value, label);
  let lastVisibleOptions = [];

  for (const candidate of candidates) {
    await input.fill("");
    await input.fill(candidate);
    await page.waitForTimeout(350);

    const count = await options.count();
    const visibleOptions = [];

    for (let index = 0; index < count; index++) {
      const option = options.nth(index);

      if (!(await option.isVisible().catch(() => false))) {
        continue;
      }

      const text = (await option.textContent())?.replace(/\s+/g, " ").trim();

      if (!text) {
        continue;
      }

      visibleOptions.push(text);

      if (optionMatchesDropdownValue(text, candidate, label)) {
        await option.click();
        console.log(
          `Seleccionado ${label}: ${text}${text !== value ? ` (buscado: ${value})` : ""}\n`,
        );
        await page.waitForTimeout(300);
        return;
      }
    }

    if (visibleOptions.length) {
      lastVisibleOptions = visibleOptions;
    }
  }

  throw new Error(
    `No se encontró opción para ${label}: ${value}. Opciones visibles: ${
      lastVisibleOptions.length ? lastVisibleOptions.join(", ") : "ninguna"
    }`,
  );
}

async function selectQuickPick(page, title, value) {
  const container = page
    .locator(".quick-pick-item, .field-block")
    .filter({ hasText: title })
    .first();

  await selectDropdownOption(page, container, value, title);
}

async function selectPodiumDriver(page, position, driverName) {
  const slot = page
    .locator("app-podium .slot-wrap")
    .filter({ hasText: `${position}º puesto` })
    .first();

  await slot.locator("button.slot-btn").click();

  const input = slot.locator("input.search-input").first();
  await input.waitFor({ state: "visible", timeout: 10000 });
  await input.fill(driverName);

  const option = slot
    .locator(".slot-item")
    .filter({ hasText: driverName })
    .first();

  await option.waitFor({ state: "visible", timeout: 10000 });
  await option.click();

  await page.waitForTimeout(300);
}

async function fillInputByTitle(page, title, value) {
  const input = page
    .locator(".field-block")
    .filter({ hasText: title })
    .locator("input")
    .first();

  await input.scrollIntoViewIfNeeded();
  await input.fill(String(value));

}

async function clearCurrentSelection(page) {
  const clearButton = page
    .locator("button")
    .filter({ hasText: /Limpiar selecci[oó]n/i })
    .first();

  try {
    await clearButton.waitFor({ state: "visible", timeout: 5000 });
    await clearButton.click();
    console.log("Hizo clic en 'Limpiar selección' antes de rellenar.\n");
    await page.waitForTimeout(1000);
  } catch (error) {
    console.log("No se encontró botón 'Limpiar selección', continuando...\n");
  }
}

async function readPlusDriverFromPage(page, prediction) {
  const driverNames = getPredictionDriverNames(prediction);

  if (!driverNames.length) {
    return null;
  }

  return page.evaluate((names) => {
    const normalize = (value) =>
      String(value || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim();
    const normalizedDrivers = names
      .map((name) => ({
        name,
        normalized: normalize(name),
      }))
      .filter((item) => item.normalized);
    const plusLabelPattern = /piloto\s*(\+|plus)/i;
    const snippets = [];
    const pushSnippet = (node) => {
      const text = node?.textContent?.replace(/\s+/g, " ").trim();

      if (text && text.length <= 1200) {
        snippets.push(text);
      }
    };
    const elements = Array.from(document.querySelectorAll("body *")).filter(
      (element) => plusLabelPattern.test(element.textContent || ""),
    );

    elements.forEach((element) => {
      pushSnippet(element);
      pushSnippet(element.previousElementSibling);
      pushSnippet(element.nextElementSibling);
      pushSnippet(element.parentElement);
      pushSnippet(element.parentElement?.previousElementSibling);
      pushSnippet(element.parentElement?.nextElementSibling);
      pushSnippet(element.parentElement?.parentElement);
    });

    const readStorageEntries = (storage) =>
      Array.from({ length: storage.length }, (_, index) => {
        const key = storage.key(index);

        return {
          key,
          value: storage.getItem(key),
        };
      });
    const storagePlusPattern =
      /(^|[^a-z])piloto\s*(\+|plus)|(^|[^a-z])pilotoPlus|(^|[^a-z])pilotPlus|(^|[^a-z])driverPlus|bonus/i;
    const storageEntries = [
      ...readStorageEntries(sessionStorage),
      ...readStorageEntries(localStorage),
    ].filter((entry) => storagePlusPattern.test(`${entry.key} ${entry.value}`));

    storageEntries.forEach((entry) => {
      const text = `${entry.key} ${entry.value}`.replace(/\s+/g, " ").trim();

      if (text.length <= 2500) {
        snippets.push(text);
      }
    });

    const uniqueSnippets = Array.from(new Set(snippets)).sort(
      (first, second) => first.length - second.length,
    );

    for (const snippet of uniqueSnippets) {
      const normalizedSnippet = normalize(snippet);
      const hasPlusContext =
        /piloto\s*(\+|plus)/i.test(snippet) ||
        normalizedSnippet.includes("piloto plus") ||
        normalizedSnippet.includes("pilot plus") ||
        normalizedSnippet.includes("pilotplus") ||
        normalizedSnippet.includes("driver plus") ||
        normalizedSnippet.includes("driverplus") ||
        normalizedSnippet.includes("bonus");

      if (!hasPlusContext) {
        continue;
      }

      const matches = normalizedDrivers
        .map((driver) => ({
          ...driver,
          index: normalizedSnippet.indexOf(driver.normalized),
        }))
        .filter((driver) => driver.index >= 0)
        .sort((first, second) => first.index - second.index);

      if (matches.length) {
        return matches[0].name;
      }
    }

    return null;
  }, driverNames);
}

async function resolvePlusPositionForPage(
  page,
  prediction,
  detectedPlusDriver = null,
) {
  const pagePlusDriver =
    detectedPlusDriver || (await readPlusDriverFromPage(page, prediction));

  if (!pagePlusDriver) {
    throw new Error(
      "No se pudo detectar el piloto + en la página de FantasyF1. No se rellena ese campo para evitar enviar una posición incorrecta.",
    );
  }

  const plusPosition = getRequiredPlusPositionFromOrder(
    prediction,
    pagePlusDriver,
    "Piloto +",
  );

  prediction.puestoPilotoPlus = plusPosition;

  return plusPosition;
}

async function fillFullBetPage(page, prediction, detectedPlusDriver = null) {
  const plusPosition = await resolvePlusPositionForPage(
    page,
    prediction,
    detectedPlusDriver,
  );

  const podium = prediction.ordenPilotosPodio || [];

  for (const item of podium) {
    await selectPodiumDriver(page, item.posicion, item.piloto.nombre);
  }

  await selectQuickPick(page, "Poleman", prediction.pilotoPole?.nombre);
  await selectQuickPick(
    page,
    "Vuelta rápida",
    prediction.pilotoVueltaRapida?.nombre,
  );
  await selectQuickPick(
    page,
    "Escudería con más puntos",
    prediction.escuderiaGanadora?.nombre,
  );

  await fillInputByTitle(page, "Piloto +", plusPosition);
  await fillInputByTitle(
    page,
    "Tiempo de la pole",
    formatPoleTimeForPage(prediction.tiempoPole),
  );
  await fillInputByTitle(page, "Número de SC", prediction.numeroSafetyCars);
  await fillInputByTitle(
    page,
    "Número de abandonos",
    prediction.numeroAbandonos,
  );

  await selectQuickPick(
    page,
    "Piloto con más adelantamientos",
    prediction.pilotoMasPuestosGanados?.nombre,
  );
}

async function submitBet(page) {
  const submitButton = page.locator("button.submit-btn").filter({
    hasText: "Enviar Apuesta",
  });

  await submitButton.waitFor({ state: "visible", timeout: 10000 });
  await page.waitForFunction(
    () => {
      const buttons = Array.from(
        document.querySelectorAll("button.submit-btn"),
      );
      const submit = buttons.find((button) =>
        button.textContent.includes("Enviar Apuesta"),
      );

      return submit && !submit.disabled;
    },
    null,
    { timeout: 10000 },
  );

  await submitButton.click();
  await page.waitForLoadState("networkidle").catch(() => {});

  console.log("Apuesta enviada.\n");
}

async function keepBrowserOpenUntilInterrupt(browser, message) {
  console.log(message);

  const keepAliveTimer = setInterval(() => {}, 1000);

  process.once("SIGINT", async () => {
    clearInterval(keepAliveTimer);
    console.log("\nCerrando navegador...\n");
    await browser.close();
    process.exit(0);
  });

  await new Promise(() => {});
}

async function loginToFantasyF1(prediction) {
  const webUser = process.env.WEB_USER;
  const webPassword = process.env.WEB_PASSWORD;

  if (!webUser || !webPassword || !FANTASY_LOGIN_URL) {
    console.log(
      "\nFaltan WEB_USER, WEB_PASSWORD o FANTASY_LOGIN_URL en .env. Saltando login.\n",
    );
    return;
  }

  console.log("\nIniciando sesión en Fantasy F1...\n");

  const browser = await chromium.launch({ headless: false }); // headless: false para mostrar en pantalla
  const page = await browser.newPage();

  try {
    await page.goto(FANTASY_LOGIN_URL);

    // Esperar a que cargue la página
    await page.waitForLoadState("networkidle");

    // Llenar el formulario con los selectores reales
    await page.fill('input[formcontrolname="usuario"]', webUser);
    await page.fill('input[formcontrolname="password"]', webPassword);

    const loginButton = page.locator('button[type="submit"]');
    await loginButton.waitFor({ state: "visible", timeout: 10000 });

    // Esperar a que el botón se habilite tras validar los campos
    await page.waitForFunction(
      () => {
        const btn = document.querySelector('button[type="submit"]');
        return btn && !btn.disabled;
      },
      null,
      { timeout: 10000 },
    );

    // Hacer clic en el botón de login
    await loginButton.click();

    await page.waitForLoadState("networkidle");

    console.log(
      "Sesión iniciada exitosamente. El navegador se mantendrá abierto.\n",
    );

    // Navegar al enlace de apuestas
    const apuestasLink = page
      .locator('a[routerlink="/apuestas"], a[href="/apuestas"]')
      .filter({ hasText: "Apuestas" })
      .first();

    await apuestasLink.waitFor({ state: "visible", timeout: 20000 });
    await apuestasLink.click();

    await page.waitForURL(/\/apuestas/, { timeout: 20000 });

    console.log("Navegando a Apuestas...\n");

    // Esperar a que carguen los elementos de la página
    await page.waitForLoadState("networkidle");

    await clearCurrentSelection(page);

    const sessionUser = await getSessionSelectedUser(page);

    if (sessionUser) {
      prediction.jugador = sessionUser;
      console.log(
        `Jugador cargado desde sessionStorage.usuarioSeleccionado: ${sessionUser.nombre}\n`,
      );
    }

    const detectedPlusDriver = await readPlusDriverFromPage(page, prediction);

    if (detectedPlusDriver) {
      console.log(
        `Piloto + leído después de limpiar selección: ${detectedPlusDriver}\n`,
      );
    } else {
      console.log(
        "No se pudo leer el piloto + justo después de limpiar selección; se reintentará antes de rellenar.\n",
      );
    }

    // Hacer clic en cada piloto del top 10 en orden
    if (
      prediction &&
      prediction.ordenPilotosPuntos &&
      Array.isArray(prediction.ordenPilotosPuntos)
    ) {
      const top10ForPoints = prediction.ordenPilotosPuntos.slice(0, 10);

      // Obtener el contenedor de scroll
      const scrollContainer = page
        .locator(".horizontal-scroll-container")
        .first();

      for (let i = 0; i < top10ForPoints.length; i++) {
        const piloto = top10ForPoints[i].piloto;

        // Buscar el app-card dentro del contenedor de scroll
        const card = scrollContainer
          .locator("app-card")
          .filter({ hasText: piloto.nombre })
          .first();

        try {
          // Hacer scroll horizontal dentro del contenedor
          await page.evaluate((driverName) => {
            const container = document.querySelector(
              ".horizontal-scroll-container",
            );
            const cards = container.querySelectorAll("app-card");

            for (const cardEl of cards) {
              if (cardEl.textContent.includes(driverName)) {
                container.scrollLeft +=
                  cardEl.offsetLeft - container.offsetWidth / 2;
                break;
              }
            }
          }, piloto.nombre);

          await page.waitForTimeout(300);

          // Hacer clic en el card
          await card.click();
          await page.waitForTimeout(500);
        } catch (e) {
          // Se mantiene el terminal limpio; si falla, el flujo continuará con el resto.
        }
      }

      console.log(
        "Login y selecciones completados. Presiona Ctrl+C para cerrar.",
      );
    }

    console.log("Rellenando el resto de la apuesta...\n");
    await fillFullBetPage(page, prediction, detectedPlusDriver);
    console.log("Toda la página de apuesta queda rellenada.\n");
    await submitBet(page);

    await keepBrowserOpenUntilInterrupt(
      browser,
      "Navegador abierto. Presiona Ctrl+C para cerrar.",
    );
  } catch (error) {
    console.error("Error al iniciar sesión:", error.message);
    await keepBrowserOpenUntilInterrupt(
      browser,
      "El navegador queda abierto para revisar el fallo. Presiona Ctrl+C para cerrar.",
    );
  }
}

async function main() {
  const circuit = getCircuitFromArgs();

  console.log(`\nGenerando estimación para: ${circuit}\n`);

  const context = await buildContext(circuit);

  console.log("\nLeyendo usuario de FantasyF1 desde sessionStorage...\n");
  const fantasySession = await getFantasySessionData(context);
  context.fantasyUser = fantasySession.user;
  context.fantasyDrivers = fantasySession.drivers;

  if (context.fantasyUser) {
    console.log(`Usuario FantasyF1: ${context.fantasyUser.nombre}\n`);
  } else {
    console.log("No se pudo leer usuarioSeleccionado; se usará fallback.\n");
  }

  if (context.fantasyDrivers.length) {
    console.log(
      `Pilotos disponibles en FantasyF1: ${context.fantasyDrivers.length}\n`,
    );
  }

  const prediction = await generatePrediction(context);

  printPrediction(prediction);

  await loginToFantasyF1(prediction);
}

main().catch((error) => {
  console.error("\nError:\n");
  console.error(error.message);
});
