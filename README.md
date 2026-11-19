# Agente F1

Agente F1 es un script de Node.js que genera una prediccion para un Gran Premio de Formula 1 y, si se configuran credenciales, entra en una web privada de Fantasy F1 para rellenar la apuesta automaticamente.

El proyecto esta concentrado en `index.js`. Recibe por terminal el circuito o Gran Premio, recopila informacion deportiva y contextual, pide una prediccion a OpenRouter, normaliza el resultado y muestra la parrilla prevista por consola.

## Que hace

- Lee el circuito indicado por argumentos, por ejemplo `Barcelona`, `Miami` o `Monaco`.
- Identifica el perfil del circuito: tipo de trazado, importancia de clasificacion, facilidad de adelantamiento, degradacion y caracteristicas relevantes.
- Consulta datos estructurados de F1 mediante la API compatible con Ergast de Jolpica:
  - calendario de la temporada 2026;
  - clasificacion de pilotos;
  - clasificacion de constructores;
  - resultados recientes;
  - resultados de clasificacion;
  - poles recientes;
  - comparativa de poles entre 2025 y 2026.
- Calcula una estimacion realista del tiempo de pole usando la pole previa del mismo circuito y la tendencia de tiempos de la temporada.
- Consulta la prevision meteorologica con Open-Meteo para el circuito cuando hay datos de ubicacion disponibles.
- Revisa historico reciente de Safety Car y Virtual Safety Car para el mismo GP o circuito.
- Lee noticias y paginas especializadas de F1, incluyendo Formula1.com, SoyMotor, Motorsport, Autosport, The Race, RaceFans, Reuters, PlanetF1, RacingNews365, GPBlog, Crash, Sky Sports, BBC, ESPN y otras fuentes.
- Busca documentos FIA de la temporada 2026, descarga PDFs relevantes y extrae texto con `pdf-parse`.
- Analiza bloques largos de fuentes con OpenRouter para detectar senales utiles: mejoras por equipo, ritmo reciente, fiabilidad, neumaticos, clima y cambios tecnicos.
- Genera una prediccion en JSON con OpenRouter.
- Normaliza la prediccion para evitar:
  - pilotos duplicados;
  - equipos usados como si fueran pilotos;
  - listas copiadas directamente de la clasificacion del campeonato;
  - tiempos de pole absurdos;
  - valores incoherentes de Safety Car frente al historico.
- Construye los objetos necesarios para Fantasy F1:
  - orden de pilotos por puntos;
  - prevision de parrilla de salida;
  - prevision de carrera completa;
  - podio;
  - escuderia ganadora;
  - piloto con mas puestos ganados;
  - poleman;
  - vuelta rapida;
  - abandonos;
  - Safety Cars/VSC;
  - tiempo de pole.
- Si hay credenciales de Fantasy F1, abre el navegador con Playwright, inicia sesion, lee datos de `sessionStorage`, entra en Apuestas, limpia la seleccion actual, rellena la apuesta y la envia.

## Requisitos

- Node.js 18 o superior recomendado, porque el script usa `fetch` global.
- npm.
- Acceso a internet para consultar APIs, webs, PDFs y OpenRouter.
- Una clave de OpenRouter.
- Opcional: credenciales y URL de la web privada de Fantasy F1 si se quiere rellenar la apuesta automaticamente.

## Instalacion

Instala las dependencias:

```bash
npm install
```

Si Playwright no tiene el navegador instalado en tu maquina, instala Chromium:

```bash
npx playwright install chromium
```

Copia la plantilla de variables de entorno:

```bash
cp .env.example .env
```

Despues edita `.env` con tus valores reales.

## Variables de entorno

El archivo `.env.example` contiene la plantilla:

```env
OPENROUTER_API_KEY=
OPENROUTER_MODEL=openrouter/free
OPENROUTER_MAX_TOKENS=3200

WEB_USER=
WEB_PASSWORD=
FANTASY_LOGIN_URL=

FANTASY_PLAYER_ID=
FANTASY_PLAYER_NAME=
FANTASY_PLAYER_ROLE=USER
FANTASY_PLAYER_COLOR=#000000
FANTASY_RACE_ID=
FANTASY_LEAGUE_ID=

OUTPUT_ONLY_GRID=1
```

Variables principales:

- `OPENROUTER_API_KEY`: obligatoria para generar la prediccion con IA.
- `OPENROUTER_MODEL`: modelo de OpenRouter que se usara. Por defecto: `openrouter/free`.
- `OPENROUTER_MAX_TOKENS`: limite de tokens de la respuesta. Por defecto: `3200`.
- `WEB_USER`: usuario de la web privada de Fantasy F1.
- `WEB_PASSWORD`: contrasena de la web privada de Fantasy F1.
- `FANTASY_LOGIN_URL`: URL de login de Fantasy F1.
- `FANTASY_PLAYER_ID`: ID del jugador en Fantasy F1.
- `FANTASY_PLAYER_NAME`: nombre visible del jugador.
- `FANTASY_PLAYER_ROLE`: rol del jugador. Por defecto: `USER`.
- `FANTASY_PLAYER_COLOR`: color del jugador. Por defecto: `#000000`.
- `FANTASY_RACE_ID`: ID de la carrera en Fantasy F1.
- `FANTASY_LEAGUE_ID`: ID de la liga en Fantasy F1.
- `OUTPUT_ONLY_GRID`: si vale `1`, la consola muestra solo la parrilla prevista; si vale `0`, muestra logs de depuracion.

## Ejemplo de ejecucion

Configura como minimo tu clave de OpenRouter en `.env`:

```env
OPENROUTER_API_KEY=tu_clave_de_openrouter
OPENROUTER_MODEL=openrouter/free
OPENROUTER_MAX_TOKENS=3200
OUTPUT_ONLY_GRID=1
```

Ejecuta el script indicando el circuito:

```bash
node index.js "Barcelona"
```

En modo limpio, la salida esperada por terminal es una parrilla de salida prevista:

```text
1. Piloto
2. Piloto
3. Piloto
...
22. Piloto
```

Para ver el flujo completo de logs:

```bash
OUTPUT_ONLY_GRID=0 node index.js "Barcelona"
```

Tambien puedes cambiar el circuito:

```bash
node index.js "Miami"
node index.js "Monaco"
node index.js "Silverstone"
```

Si ejecutas el script sin circuito, mostrara un error como este:

```text
Tienes que indicar el circuito. Ejemplo: node index.js "Miami"
```

## Uso con Fantasy F1

Para que el script rellene la apuesta automaticamente, ademas de OpenRouter debes configurar:

```env
WEB_USER=tu_usuario
WEB_PASSWORD=tu_contrasena
FANTASY_LOGIN_URL=https://url-de-login
FANTASY_PLAYER_ID=id_del_jugador
FANTASY_PLAYER_NAME=Nombre
FANTASY_RACE_ID=id_de_carrera
FANTASY_LEAGUE_ID=id_de_liga
```

Cuando estas variables existen, el script:

1. Abre Chromium con Playwright.
2. Entra en `FANTASY_LOGIN_URL`.
3. Rellena usuario y contrasena.
4. Navega a la seccion de apuestas.
5. Lee datos disponibles de la sesion y de los pilotos.
6. Limpia la seleccion previa.
7. Selecciona el top 10 de pilotos.
8. Rellena podio, pole, vuelta rapida, Safety Cars, abandonos, tiempo de pole y piloto plus.
9. Envia la apuesta.
10. Mantiene el navegador abierto hasta que pulses `Ctrl+C`.

Si faltan `WEB_USER`, `WEB_PASSWORD` o `FANTASY_LOGIN_URL`, el script genera la prediccion pero salta el login y no rellena la web.

## Salida generada

Internamente, la IA devuelve y el script normaliza un JSON con esta informacion:

- `ordenPilotosPuntos`: prediccion de carrera completa ordenada por posicion final.
- `previsionParrillaSalida`: parrilla de salida prevista.
- `previsionCarreraCompleta`: orden final previsto de carrera.
- `ordenPilotosPodio`: top 3.
- `escuderiaGanadora`: equipo que se espera que sume mas puntos o gane segun la prediccion.
- `pilotoMasPuestosGanados`: piloto con mayor ganancia real entre parrilla y carrera.
- `pilotoPole`: piloto previsto para la pole.
- `pilotoVueltaRapida`: piloto previsto para la vuelta rapida.
- `numeroAbandonos`: abandonos esperados.
- `numeroSafetyCars`: numero esperado de SC/VSC, ajustado al historico cuando esta disponible.
- `puestoPilotoPlus`: posicion usada para el piloto plus en Fantasy F1.
- `tiempoPole`: tiempo previsto de pole en formato `MM:SS:MMM`.

Por defecto, la consola solo imprime `previsionParrillaSalida`.

## Scripts disponibles

Actualmente el `package.json` no define un script `start`. La ejecucion directa es:

```bash
node index.js "Nombre del circuito"
```

El script `npm test` existe solo como placeholder y no ejecuta pruebas reales.

## Seguridad

- No subas `.env` al repositorio.
- `.env` esta excluido por `.gitignore`.
- `.env.example` debe mantenerse como plantilla sin credenciales reales.
- La URL privada, usuarios, contrasenas e IDs de Fantasy F1 deben vivir solo en tu `.env` local.

## Estructura del proyecto

```text
.
├── .env.example       # Plantilla de configuracion
├── index.js           # Logica principal del agente
├── package.json       # Dependencias npm
├── package-lock.json  # Lockfile de dependencias
└── README.md          # Documentacion del proyecto
```
