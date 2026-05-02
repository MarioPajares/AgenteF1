require("dotenv").config({ quiet: true });

const { chromium } = require("playwright");
const cheerio = require("cheerio");

const MODEL = "qwen2.5:3b";

const CURRENT_SEASON = 2026;
const PREVIOUS_SEASON = CURRENT_SEASON - 1;

const MAX_WEB_SOURCES = 3;
const MAX_WEB_SOURCE_CHARS = 350;

const JOLPICA_BASE_URL = "https://api.jolpi.ca/ergast/f1";

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

const DEFAULT_DRIVER_BASELINE = [
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

const CIRCUIT_PROFILES = [
  {
    keys: ["miami"],
    name: "Miami",
    raceNameHints: ["Miami"],
    fallbackPoleTime: "1:27.800",
    slowdownPercent2026: 1.6,
    type: "semiurbano",
    characteristics:
      "rectas largas, curvas lentas, frenadas fuertes, tracción importante, posible calor y degradación media-alta",
    favours:
      "coches con buena eficiencia aerodinámica, buena tracción en curva lenta y buena gestión térmica de neumáticos",
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
    characteristics:
      "frenadas fuertes, tracción, degradación alta, curvas lentas y medias",
    favours:
      "coches con buena tracción, estabilidad en frenada y gestión de neumáticos traseros",
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
    characteristics:
      "altísima velocidad, muros cerca, curvas rápidas, eficiencia aerodinámica y confianza del piloto",
    favours:
      "coches eficientes en recta, estables en curvas rápidas y pilotos fuertes en clasificación",
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
    characteristics:
      "pocas oportunidades claras de adelantamiento, pianos, curvas medias y tracción",
    favours: "coches equilibrados, buena tracción y buena clasificación",
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
      "circuito muy estrecho, casi imposible adelantar, máxima importancia de clasificación",
    favours:
      "coches con mucha carga, buena tracción mecánica y pilotos muy fuertes a una vuelta",
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
    characteristics:
      "curvas rápidas y medias, referencia aerodinámica, degradación media",
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
    characteristics: "rectas, chicanes, frenadas fuertes, tracción y pianos",
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
    characteristics:
      "vuelta corta, pocas curvas, rectas, frenadas fuertes y mucho DRS",
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
    characteristics:
      "curvas rápidas, alta carga, eficiencia aerodinámica y estabilidad",
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
    characteristics:
      "muchas curvas, poca recta, difícil adelantar y mucha importancia de la clasificación",
    favours:
      "coches con alta carga aerodinámica, tracción y buen paso por curva lenta",
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
    characteristics:
      "rectas largas, curvas rápidas, baja resistencia, clima variable",
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
    characteristics:
      "mínima carga, rectas largas, frenadas fuertes y velocidad punta",
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
      "calor, muchas curvas lentas, alta carga, difícil adelantar y carrera física",
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
    characteristics:
      "rectas muy largas, baja temperatura, frenadas fuertes y baja carga",
    favours:
      "coches con velocidad punta, buena eficiencia y calentamiento de neumáticos",
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
    characteristics:
      "sectores variados, tracción, curvas medias y largas rectas",
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

  const match = CIRCUIT_PROFILES.find((profile) => {
    return profile.keys.some((key) =>
      normalizedCircuit.includes(normalizeText(key)),
    );
  });

  if (match) {
    return match;
  }

  return {
    keys: [circuit],
    name: normalizeCircuit(circuit),
    raceNameHints: [normalizeCircuit(circuit)],
    fallbackPoleTime: "1:28.500",
    slowdownPercent2026: 1.5,
    type: "desconocido",
    characteristics:
      "circuito no identificado en la tabla interna; se usa análisis general de F1",
    favours:
      "coches equilibrados con buen ritmo de carrera, clasificación y gestión de neumáticos",
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

async function getRecentPoles(season, maxItems = 4) {
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

  const clean = time.trim();

  const match = clean.match(/^(\d+):(\d{2})\.(\d{3})$/);

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

function buildFallbackTop10FromStandings(driverStandings) {
  if (Array.isArray(driverStandings) && driverStandings.length >= 10) {
    return driverStandings.slice(0, 10).map((item, index) => ({
      position: index + 1,
      driver: item.driver,
      team: item.team,
      confidence: Math.max(35, 65 - index * 3),
      reason:
        "Fallback basado en clasificación actual de pilotos porque el modelo no generó una estimación completa.",
    }));
  }

  return DEFAULT_DRIVER_BASELINE.map((item, index) => ({
    position: index + 1,
    driver: item.driver,
    team: item.team,
    confidence: Math.max(35, 60 - index * 3),
    reason:
      "Fallback basado en rendimiento general estimado de equipos y pilotos.",
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

function buildSearchQueries(circuit) {
  const cleanCircuit = normalizeCircuit(circuit);

  return [
    `Formula 1 ${cleanCircuit} Grand Prix 2026 race pace qualifying`,
    `F1 ${cleanCircuit} 2026 practice qualifying sprint race pace`,
    `Formula 1 ${cleanCircuit} 2026 latest news McLaren Mercedes Ferrari Red Bull`,
    `site:soymotor.com/f1 ${cleanCircuit} GP 2026 F1`,
    `site:formula1.com ${cleanCircuit} 2026 F1 qualifying race`,
    `site:motorsport.com/f1 ${cleanCircuit} 2026 F1`,
  ];
}

function cleanDuckDuckGoUrl(rawUrl) {
  try {
    if (!rawUrl) {
      return "";
    }

    let url = rawUrl.trim();

    if (url.startsWith("//")) {
      url = `https:${url}`;
    }

    const parsedUrl = new URL(url, "https://duckduckgo.com");
    const uddg = parsedUrl.searchParams.get("uddg");

    if (uddg) {
      return decodeURIComponent(uddg);
    }

    return parsedUrl.href;
  } catch (error) {
    return rawUrl;
  }
}

function cleanBingUrl(rawUrl) {
  try {
    if (!rawUrl) {
      return "";
    }

    return new URL(rawUrl).href;
  } catch (error) {
    return rawUrl;
  }
}

function isUsefulUrl(url) {
  if (!url) {
    return false;
  }

  const blockedDomains = [
    "duckduckgo.com",
    "google.com",
    "bing.com",
    "facebook.com",
    "instagram.com",
    "x.com",
    "twitter.com",
    "youtube.com",
    "tiktok.com",
    "reddit.com",
    "pinterest.com",
  ];

  return (
    url.startsWith("http") &&
    !blockedDomains.some((domain) => url.includes(domain))
  );
}

async function searchDuckDuckGo(query) {
  const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

  console.log(`\nBuscando en DuckDuckGo:\n${query}\n`);

  try {
    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36",
      },
    });

    if (!response.ok) {
      return [];
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const results = [];

    $("a.result__a").each((index, element) => {
      const title = $(element).text().trim();
      const rawUrl = $(element).attr("href");
      const url = cleanDuckDuckGoUrl(rawUrl);

      if (
        title &&
        isUsefulUrl(url) &&
        !results.some((result) => result.url === url)
      ) {
        results.push({
          title,
          url,
          source: "DuckDuckGo",
        });
      }
    });

    return results;
  } catch (error) {
    return [];
  }
}

async function searchBing(query) {
  const searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(query)}`;

  console.log(`\nBuscando en Bing:\n${query}\n`);

  try {
    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36",
      },
    });

    if (!response.ok) {
      return [];
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const results = [];

    $("li.b_algo h2 a").each((index, element) => {
      const title = $(element).text().trim();
      const rawUrl = $(element).attr("href");
      const url = cleanBingUrl(rawUrl);

      if (
        title &&
        isUsefulUrl(url) &&
        !results.some((result) => result.url === url)
      ) {
        results.push({
          title,
          url,
          source: "Bing",
        });
      }
    });

    return results;
  } catch (error) {
    return [];
  }
}

function getMandatorySources(circuit) {
  const cleanCircuit = normalizeCircuit(circuit);

  return [
    {
      title: "Formula1.com - Últimas noticias",
      url: "https://www.formula1.com/en/latest",
      source: "Fuente fija",
    },
    {
      title: "SoyMotor F1",
      url: "https://soymotor.com/f1",
      source: "Fuente fija",
    },
    {
      title: `Motorsport F1 ${cleanCircuit}`,
      url: "https://www.motorsport.com/f1/news/",
      source: "Fuente fija",
    },
  ];
}

async function searchWebSources(circuit) {
  const queries = buildSearchQueries(circuit);
  const sources = [];

  for (const query of queries) {
    const results = [
      ...(await searchDuckDuckGo(query)),
      ...(await searchBing(query)),
    ];

    for (const result of results) {
      if (!sources.some((item) => item.url === result.url)) {
        sources.push(result);
      }
    }

    if (sources.length >= MAX_WEB_SOURCES) {
      break;
    }
  }

  const mandatory = getMandatorySources(circuit);
  const combined = [...mandatory, ...sources];

  const unique = [];

  for (const source of combined) {
    if (!unique.some((item) => item.url === source.url)) {
      unique.push(source);
    }
  }

  return unique.slice(0, MAX_WEB_SOURCES);
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

      if (await button.first().isVisible({ timeout: 1000 })) {
        await button.first().click({ timeout: 2000 });
        await page.waitForTimeout(800);
        return;
      }
    } catch (error) {
      // probar siguiente
    }
  }
}

async function readPage(browser, source) {
  const page = await browser.newPage();

  try {
    console.log(`Leyendo web: ${source.url}`);

    await page.goto(source.url, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    await page.waitForTimeout(1200);
    await acceptCookiesIfNeeded(page);

    const title = await page.title();
    const bodyText = await page.locator("body").innerText({
      timeout: 12000,
    });

    await page.close();

    return {
      ...source,
      pageTitle: title,
      content: bodyText
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, MAX_WEB_SOURCE_CHARS),
    };
  } catch (error) {
    await page.close();

    return {
      ...source,
      pageTitle: source.title,
      content: "",
      error: error.message,
    };
  }
}

async function readWebSources(sources) {
  const browser = await chromium.launch({
    headless: true,
  });

  const pages = [];

  for (const source of sources) {
    const page = await readPage(browser, source);

    if (page.content && page.content.length > 80) {
      pages.push(page);
    }
  }

  await browser.close();

  return pages;
}

function extractRelevantWebText(text, circuit) {
  const cleanCircuit = normalizeCircuit(circuit);

  const keywords = [
    cleanCircuit,
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
  ];

  const sentences = text
    .split(/[.!?]/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  const relevant = sentences.filter((sentence) =>
    keywords.some((keyword) =>
      sentence.toLowerCase().includes(keyword.toLowerCase()),
    ),
  );

  if (relevant.length) {
    return relevant.slice(0, 3).join(". ");
  }

  return text.slice(0, 220);
}

function buildWebText(pages, circuit) {
  if (!pages.length) {
    return "No hay texto web útil.";
  }

  return pages
    .map((page, index) => {
      return `
WEB ${index + 1}
Título: ${page.pageTitle}
URL: ${page.url}
Texto útil: ${extractRelevantWebText(page.content, circuit)}
`;
    })
    .join("\n");
}

function buildDriverStandingsText(driverStandings) {
  if (!driverStandings.length) {
    return "No hay clasificación de pilotos disponible.";
  }

  return driverStandings
    .slice(0, 12)
    .map((item) => {
      return `${item.position}. ${item.driver} - ${item.team} - ${item.points} pts - ${item.wins} victorias`;
    })
    .join("\n");
}

function buildConstructorStandingsText(constructorStandings) {
  if (!constructorStandings.length) {
    return "No hay clasificación de constructores disponible.";
  }

  return constructorStandings
    .slice(0, 10)
    .map((item) => {
      return `${item.position}. ${item.team} - ${item.points} pts - ${item.wins} victorias`;
    })
    .join("\n");
}

function buildRecentRaceResultsText(races) {
  if (!races.length) {
    return "No hay resultados recientes disponibles.";
  }

  return races
    .slice(-4)
    .map((race) => {
      const results = race.Results || [];

      const top5 = results
        .slice(0, 5)
        .map((result) => {
          return `${result.position}. ${getDriverName(result.Driver)} - ${result.Constructor?.name || ""}`;
        })
        .join("; ");

      return `${race.raceName}: ${top5}`;
    })
    .join("\n");
}

function buildRecentPolesText(poles) {
  if (!poles.length) {
    return "No hay poles recientes disponibles.";
  }

  return poles
    .map((pole) => {
      return `${pole.raceName}: ${pole.driver} - ${pole.team} - ${pole.time}`;
    })
    .join("\n");
}

function buildBaselineText(driverStandings) {
  const baseline = buildFallbackTop10FromStandings(driverStandings);

  return baseline
    .map((item) => `${item.position}. ${item.driver} - ${item.team}`)
    .join("\n");
}

async function askOllama(prompt) {
  console.log("\nLlamando a Ollama...");
  console.log(`Modelo: ${MODEL}`);
  console.log(`Tamaño prompt: ${prompt.length} caracteres`);

  const response = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      prompt,
      stream: false,
      format: "json",
      options: {
        temperature: 0.35,
        num_ctx: 2048,
        num_predict: 900,
      },
    }),
  });

  const rawText = await response.text();

  if (!response.ok) {
    console.log("STATUS:", response.status);
    console.log("RESPUESTA RAW DE OLLAMA:");
    console.log(rawText);
    throw new Error("Error llamando a Ollama");
  }

  const data = JSON.parse(rawText);
  return data.response;
}

function extractJson(text) {
  try {
    return JSON.parse(text);
  } catch (error) {
    const match = text.match(/\{[\s\S]*\}/);

    if (!match) {
      console.log("\nRespuesta de IA no parseable:\n");
      console.log(text);
      throw new Error("La IA no ha devuelto JSON válido");
    }

    return JSON.parse(match[0]);
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
Eres analista experto de Fórmula 1.

Quiero una ESTIMACIÓN para el Gran Premio de ${circuit} ${CURRENT_SEASON}.
La carrera todavía no ha pasado, así que debes estimar.

DATOS DEL CIRCUITO:
Nombre: ${profile.name}
Tipo: ${profile.type}
Características: ${profile.characteristics}
Favorece a: ${profile.favours}
Adelantamiento: ${profile.overtaking}
Degradación: ${profile.degradation}
Importancia clasificación: ${profile.qualifyingImportance}

POLE DEL AÑO PASADO EN ESTE MISMO GP:
${
  previousPole
    ? `${previousPole.season} ${previousPole.raceName}: ${previousPole.driver} - ${previousPole.team} - ${previousPole.time}`
    : `No encontrada. Usar tiempo base interno: ${profile.fallbackPoleTime}`
}

CÁLCULO BASE DEL TIEMPO DE POLE ${CURRENT_SEASON}:
Tiempo base anterior: ${poleEstimation.previousPoleTime || profile.fallbackPoleTime}
Ajuste por normativa ${CURRENT_SEASON}: +${poleEstimation.slowdownPercentApplied}%
Tiempo estimado base: ${poleEstimation.estimatedPoleTime}

CLASIFICACIÓN ACTUAL DE PILOTOS:
${buildDriverStandingsText(driverStandings)}

CLASIFICACIÓN ACTUAL DE CONSTRUCTORES:
${buildConstructorStandingsText(constructorStandings)}

RESULTADOS RECIENTES DE CARRERA:
${buildRecentRaceResultsText(recentRaceResults)}

POLES RECIENTES:
${buildRecentPolesText(recentPoles)}

WEB/NOTICIAS RESUMIDAS:
${buildWebText(webPages, circuit)}

RANKING BASE SI FALTAN DATOS:
${buildBaselineText(driverStandings)}

TAREA:
1. Estima el poleman.
2. Estima el tiempo de pole.
3. Estima los 10 primeros pilotos de carrera.
4. Calcula el equipo que hará más puntos.

CRITERIOS:
- Usa rendimiento actual de equipos.
- Usa resultados de GP anteriores.
- Usa clasificación de pilotos y constructores.
- Usa tipo de circuito y características para ver que tipo de coche se adapta más.
- Usa la pole del año pasado para estimar el tiempo de este año.
- Si hay poca información, da una estimación igualmente, con menor confianza.
- Está prohibido dejar campos vacíos.

DEVUELVE SOLO JSON VÁLIDO CON ESTA ESTRUCTURA:
{
  "grand_prix": "${circuit}",
  "season": ${CURRENT_SEASON},
  "pole_prediction": {
    "driver": "nombre piloto",
    "team": "equipo",
    "estimated_time": "${poleEstimation.estimatedPoleTime}",
    "confidence": 50,
    "reason": "motivo breve"
  },
  "team_with_most_points": {
    "team": "equipo",
    "confidence": 50,
    "reason": "motivo breve"
  },
  "top_10": [
    { "position": 1, "driver": "piloto", "team": "equipo", "confidence": 50, "reason": "motivo breve" },
    { "position": 2, "driver": "piloto", "team": "equipo", "confidence": 50, "reason": "motivo breve" },
    { "position": 3, "driver": "piloto", "team": "equipo", "confidence": 50, "reason": "motivo breve" },
    { "position": 4, "driver": "piloto", "team": "equipo", "confidence": 50, "reason": "motivo breve" },
    { "position": 5, "driver": "piloto", "team": "equipo", "confidence": 50, "reason": "motivo breve" },
    { "position": 6, "driver": "piloto", "team": "equipo", "confidence": 50, "reason": "motivo breve" },
    { "position": 7, "driver": "piloto", "team": "equipo", "confidence": 50, "reason": "motivo breve" },
    { "position": 8, "driver": "piloto", "team": "equipo", "confidence": 50, "reason": "motivo breve" },
    { "position": 9, "driver": "piloto", "team": "equipo", "confidence": 50, "reason": "motivo breve" },
    { "position": 10, "driver": "piloto", "team": "equipo", "confidence": 50, "reason": "motivo breve" }
  ],
  "winner": "piloto ganador",
  "podium": ["piloto 1", "piloto 2", "piloto 3"],
  "general_confidence": 50,
  "summary": "resumen breve"
}
`;
}

function isEmpty(value) {
  return value === undefined || value === null || String(value).trim() === "";
}

function completePrediction(prediction, context) {
  const fallbackTop10 = buildFallbackTop10FromStandings(
    context.driverStandings,
  );

  const completed = {
    ...prediction,
  };

  completed.grand_prix = isEmpty(completed.grand_prix)
    ? context.circuit
    : completed.grand_prix;

  completed.season = CURRENT_SEASON;

  if (!Array.isArray(completed.top_10)) {
    completed.top_10 = [];
  }

  completed.top_10 = Array.from({ length: 10 }).map((_, index) => {
    const current = completed.top_10[index] || {};
    const fallback = fallbackTop10[index];

    return {
      position: index + 1,
      driver: isEmpty(current.driver) ? fallback.driver : current.driver,
      team: isEmpty(current.team) ? fallback.team : current.team,
      confidence:
        typeof current.confidence === "number" && current.confidence > 0
          ? current.confidence
          : fallback.confidence,
      reason: isEmpty(current.reason) ? fallback.reason : current.reason,
    };
  });

  const pole = completed.pole_prediction || {};
  const fallbackPoleDriver = completed.top_10[0];

  completed.pole_prediction = {
    driver: isEmpty(pole.driver) ? fallbackPoleDriver.driver : pole.driver,
    team: isEmpty(pole.team) ? fallbackPoleDriver.team : pole.team,
    estimated_time: isEmpty(pole.estimated_time)
      ? context.poleEstimation.estimatedPoleTime
      : pole.estimated_time,
    confidence:
      typeof pole.confidence === "number" && pole.confidence > 0
        ? pole.confidence
        : 50,
    reason: isEmpty(pole.reason)
      ? `Estimación basada en la pole previa del circuito (${context.poleEstimation.previousPoleTime || context.profile.fallbackPoleTime}) ajustada por normativa ${CURRENT_SEASON} y rendimiento actual.`
      : pole.reason,
  };

  completed.winner = isEmpty(completed.winner)
    ? completed.top_10[0].driver
    : completed.winner;

  completed.podium =
    Array.isArray(completed.podium) && completed.podium.length >= 3
      ? completed.podium
      : [
          completed.top_10[0].driver,
          completed.top_10[1].driver,
          completed.top_10[2].driver,
        ];

  const pointsLeader = computeTeamWithMostPoints(completed.top_10);
  const teamPoints = completed.team_with_most_points || {};

  completed.team_with_most_points = {
    team: isEmpty(teamPoints.team) ? pointsLeader.team : teamPoints.team,
    confidence:
      typeof teamPoints.confidence === "number" && teamPoints.confidence > 0
        ? teamPoints.confidence
        : 50,
    reason: isEmpty(teamPoints.reason)
      ? `Según el top 10 estimado, ${pointsLeader.team} sumaría aproximadamente ${pointsLeader.points} puntos.`
      : teamPoints.reason,
  };

  completed.general_confidence =
    typeof completed.general_confidence === "number" &&
    completed.general_confidence > 0
      ? completed.general_confidence
      : 50;

  completed.summary = isEmpty(completed.summary)
    ? `Estimación para ${context.circuit} basada en rendimiento actual, características del circuito y pole del año anterior.`
    : completed.summary;

  return completed;
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
  console.log(`Pilotos en standings: ${context.driverStandings.length}`);
  console.log(
    `Constructores en standings: ${context.constructorStandings.length}`,
  );
  console.log(`Carreras recientes leídas: ${context.recentRaceResults.length}`);
  console.log(`Poles recientes leídas: ${context.recentPoles.length}`);
  console.log(`Páginas web leídas: ${context.webPages.length}`);
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

  console.log("\nBuscando noticias y análisis web...\n");

  const sources = await searchWebSources(circuit);
  const webPages = await readWebSources(sources);

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

  console.log("\nEnviando información a Ollama...");
  console.log(`Modelo usado: ${MODEL}`);
  console.log(`Tamaño final del prompt: ${prompt.length} caracteres`);
  console.log("Esperando respuesta...\n");

  const start = Date.now();

  const response = await askOllama(prompt);

  const seconds = Math.round((Date.now() - start) / 1000);

  console.log(`\nOllama ha respondido en ${seconds} segundos.\n`);

  const parsed = extractJson(response);

  return completePrediction(parsed, context);
}

async function main() {
  const circuit = getCircuitFromArgs();

  console.log(`\nGenerando estimación para: ${circuit}\n`);

  const context = await buildContext(circuit);

  printContext(context);

  const prediction = await generatePrediction(context);

  printPrediction(prediction);
}

main().catch((error) => {
  console.error("\nError:\n");
  console.error(error.message);
});
