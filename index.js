require("dotenv").config({ quiet: true });

const { chromium } = require("playwright");

const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "openrouter/free";

const CURRENT_SEASON = 2026;
const PREVIOUS_SEASON = CURRENT_SEASON - 1;
const JOLPICA_BASE_URL = "https://api.jolpi.ca/ergast/f1";

const MAX_WEB_SOURCES = 11;
const MAX_WEB_SOURCE_CHARS = 2200;
const MAX_WEB_TEXT_PER_SOURCE = 220;
const MAX_TOTAL_WEB_TEXT = 1500;

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
];

const CIRCUIT_PROFILES = [
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
    keys: ["españa", "spain", "barcelona", "montmelo", "montmeló"],
    name: "Barcelona",
    raceNameHints: ["Spanish", "Spain"],
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
    driver:
      `${item.Driver?.givenName || ""} ${item.Driver?.familyName || ""}`.trim(),
    team: item.Constructors?.[0]?.name || "",
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

function parseLapTimeToMs(time) {
  if (!time || typeof time !== "string") {
    return null;
  }

  const match = time.trim().match(/^(\d+):(\d{2})\.(\d{3})$/);

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

function estimatePoleTime(previousPole, profile) {
  const fallbackMs = parseLapTimeToMs(profile.fallbackPoleTime);

  const baseTime = previousPole?.time || profile.fallbackPoleTime;
  const baseMs = parseLapTimeToMs(baseTime) || fallbackMs;

  const estimatedMs = baseMs * (1 + profile.slowdownPercent2026 / 100);

  return {
    previousPoleTime: previousPole?.time || null,
    previousPoleDriver: previousPole?.driver || null,
    previousPoleTeam: previousPole?.team || null,
    estimatedPoleTime: formatMsToLapTime(estimatedMs),
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

function buildRecentPolesText(poles) {
  if (!poles.length) {
    return "No disponible";
  }

  return poles
    .slice(0, 3)
    .map((pole) => `${pole.raceName}: ${pole.driver}/${pole.team}/${pole.time}`)
    .join(" | ");
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
    const maxTokens = Number(process.env.OPENROUTER_MAX_TOKENS) || 1400;

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

function buildPrompt(context) {
  const {
    circuit,
    profile,
    previousPole,
    poleEstimation,
    driverStandings,
    constructorStandings,
    recentRaceResults,
    recentPoles,
    webPages,
  } = context;

  return `
Predice F1 ${CURRENT_SEASON} ${circuit}. Responde SOLO JSON válido.

Datos:
Circuito=${profile.name}
Tipo=${profile.type}
Características=${profile.characteristics}
Favorece=${profile.favours}
Adelantar=${profile.overtaking}
Degradación=${profile.degradation}
Clasificación=${profile.qualifyingImportance}

Pole ${PREVIOUS_SEASON}=${
    previousPole
      ? `${previousPole.driver}/${previousPole.team}/${previousPole.time}`
      : `no encontrada/base ${profile.fallbackPoleTime}`
  }
Tiempo pole estimado ${CURRENT_SEASON}=${poleEstimation.estimatedPoleTime}
Ajuste normativa=${poleEstimation.slowdownPercentApplied}%

Pilotos=${buildDriverStandingsText(driverStandings)}
Constructores=${buildConstructorStandingsText(constructorStandings)}
Carreras recientes=${buildRecentRaceResultsText(recentRaceResults)}
Poles recientes=${buildRecentPolesText(recentPoles)}
Noticias web=${buildWebText(webPages, circuit)}
Ranking base=${buildBaselineText(driverStandings)}

Devuelve exactamente este JSON, sin markdown:
{
  "pole_driver": "piloto",
  "pole_team": "equipo",
  "pole_time": "${poleEstimation.estimatedPoleTime}",
  "team_most_points": "equipo",
  "winner": "piloto",
  "podium": ["piloto1", "piloto2", "piloto3"],
  "top_10": [
    {"position":1,"driver":"piloto","team":"equipo"},
    {"position":2,"driver":"piloto","team":"equipo"},
    {"position":3,"driver":"piloto","team":"equipo"},
    {"position":4,"driver":"piloto","team":"equipo"},
    {"position":5,"driver":"piloto","team":"equipo"},
    {"position":6,"driver":"piloto","team":"equipo"},
    {"position":7,"driver":"piloto","team":"equipo"},
    {"position":8,"driver":"piloto","team":"equipo"},
    {"position":9,"driver":"piloto","team":"equipo"},
    {"position":10,"driver":"piloto","team":"equipo"}
  ],
  "summary": "resumen breve"
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
  const fallbackTop10 = buildFallbackTop10FromStandings(
    context.driverStandings,
  );
  const teamLeader = computeTeamWithMostPoints(fallbackTop10);

  return {
    grand_prix: context.circuit,
    season: CURRENT_SEASON,
    pole_prediction: {
      driver: fallbackTop10[0].driver,
      team: fallbackTop10[0].team,
      estimated_time: context.poleEstimation.estimatedPoleTime,
      confidence: 50,
      reason:
        "Fallback basado en clasificación actual, pole estimada por histórico, webs especializadas y características del circuito.",
    },
    team_with_most_points: {
      team: teamLeader.team,
      confidence: 50,
      reason: `Según el top 10 base, ${teamLeader.team} sumaría aproximadamente más puntos.`,
    },
    top_10: fallbackTop10,
    winner: fallbackTop10[0].driver,
    podium: [
      fallbackTop10[0].driver,
      fallbackTop10[1].driver,
      fallbackTop10[2].driver,
    ],
    general_confidence: 45,
    summary:
      "Predicción fallback basada en standings, rendimiento acumulado, webs especializadas, tipo de circuito y pole del año anterior.",
  };
}

function normalizePrediction(rawPrediction, context) {
  if (!rawPrediction) {
    return buildFallbackPrediction(context);
  }

  const fallbackTop10 = buildFallbackTop10FromStandings(
    context.driverStandings,
  );

  const rawTop10 = Array.isArray(rawPrediction.top_10)
    ? rawPrediction.top_10
    : [];

  const top10 = Array.from({ length: 10 }).map((_, index) => {
    const current = rawTop10[index] || {};
    const fallback = fallbackTop10[index];

    const driver = isEmpty(current.driver) ? fallback.driver : current.driver;
    const team = isEmpty(current.team) ? fallback.team : current.team;

    return {
      position: index + 1,
      driver,
      team,
      confidence: Math.max(35, 65 - index * 3),
      reason: getReasonForPosition({ driver, team }, context, index),
    };
  });

  const teamLeader = computeTeamWithMostPoints(top10);

  const poleDriver = isEmpty(rawPrediction.pole_driver)
    ? top10[0].driver
    : rawPrediction.pole_driver;

  const poleTeam = isEmpty(rawPrediction.pole_team)
    ? top10[0].team
    : rawPrediction.pole_team;

  const poleTime = isEmpty(rawPrediction.pole_time)
    ? context.poleEstimation.estimatedPoleTime
    : rawPrediction.pole_time;

  const podium =
    Array.isArray(rawPrediction.podium) &&
    rawPrediction.podium.length >= 3 &&
    !rawPrediction.podium.some(isEmpty)
      ? rawPrediction.podium.slice(0, 3)
      : [top10[0].driver, top10[1].driver, top10[2].driver];

  return {
    grand_prix: context.circuit,
    season: CURRENT_SEASON,
    pole_prediction: {
      driver: poleDriver,
      team: poleTeam,
      estimated_time: poleTime,
      confidence: 55,
      reason:
        "Estimación basada en la pole del año anterior, el ajuste por normativa 2026, webs especializadas y rendimiento actual.",
    },
    team_with_most_points: {
      team: isEmpty(rawPrediction.team_most_points)
        ? teamLeader.team
        : rawPrediction.team_most_points,
      confidence: 55,
      reason: `Según el top 10 estimado, el equipo más fuerte en puntos sería ${
        isEmpty(rawPrediction.team_most_points)
          ? teamLeader.team
          : rawPrediction.team_most_points
      }.`,
    },
    top_10: top10,
    winner: isEmpty(rawPrediction.winner)
      ? top10[0].driver
      : rawPrediction.winner,
    podium,
    general_confidence: 55,
    summary: isEmpty(rawPrediction.summary)
      ? "Estimación basada en rendimiento actual, histórico de poles, características del circuito, webs especializadas y resultados recientes."
      : rawPrediction.summary,
  };
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
    `Pole estimada base ${CURRENT_SEASON}: ${context.poleEstimation.estimatedPoleTime}`,
  );
  console.log(`Pilotos standings: ${context.driverStandings.length}`);
  console.log(
    `Constructores standings: ${context.constructorStandings.length}`,
  );
  console.log(`Carreras recientes: ${context.recentRaceResults.length}`);
  console.log(`Poles recientes: ${context.recentPoles.length}`);
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

function printPrediction(prediction) {
  console.log("\nPredicción generada:\n");
  console.log(JSON.stringify(prediction, null, 2));

  console.log("\nPole prevista:\n");
  console.log(
    `${prediction.pole_prediction.driver} - ${prediction.pole_prediction.team} - ${prediction.pole_prediction.estimated_time} - confianza ${prediction.pole_prediction.confidence}%`,
  );
  console.log(`Motivo: ${prediction.pole_prediction.reason}`);

  console.log("\nTop 10 previsto:\n");

  prediction.top_10.forEach((item) => {
    console.log(
      `${item.position}. ${item.driver} - ${item.team} - confianza ${item.confidence}%`,
    );
    console.log(`   Motivo: ${item.reason}`);
  });

  console.log("\nEquipo con más puntos previsto:\n");
  console.log(
    `${prediction.team_with_most_points.team} - confianza ${prediction.team_with_most_points.confidence}%`,
  );
  console.log(`Motivo: ${prediction.team_with_most_points.reason}`);

  console.log("\nResumen:\n");
  console.log(prediction.summary);
}

async function buildContext(circuit) {
  const profile = getCircuitProfile(circuit);

  console.log("\nLeyendo datos estructurados de F1...\n");

  const [
    previousPole,
    driverStandings,
    constructorStandings,
    recentRaceResults,
    recentPoles,
  ] = await Promise.all([
    getPreviousYearPoleForCircuit(circuit, profile),
    getDriverStandings(CURRENT_SEASON),
    getConstructorStandings(CURRENT_SEASON),
    getSeasonRaceResults(CURRENT_SEASON),
    getRecentPoles(CURRENT_SEASON),
  ]);

  const poleEstimation = estimatePoleTime(previousPole, profile);

  console.log("\nLeyendo páginas web especializadas de F1...\n");

  const webPages = await readWebSources();

  return {
    circuit,
    profile,
    previousPole,
    poleEstimation,
    driverStandings,
    constructorStandings,
    recentRaceResults,
    recentPoles,
    webPages,
  };
}

async function generatePrediction(context) {
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

  return normalizePrediction(rawPrediction, context);
}

async function main() {
  const circuit = getCircuitFromArgs();

  console.log(`\nGenerando estimación para: ${circuit}\n`);

  const context = await buildContext(circuit);

  printContext(context);
  printWebPages(context.webPages);

  const prediction = await generatePrediction(context);

  printPrediction(prediction);
}

main().catch((error) => {
  console.error("\nError:\n");
  console.error(error.message);
});
