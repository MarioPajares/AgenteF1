# AgenteF1

AgenteF1 genera una estimacion para una carrera de Formula 1 y, si hay credenciales configuradas, rellena una apuesta en una web privada de Fantasy F1.

## Funcionamiento

La aplicacion se ejecuta indicando el circuito o Gran Premio:

```bash
node index.js "Barcelona"
```

Si no se indica circuito (o se pasa `--next`), el script consulta el calendario y usa el proximo Gran Premio, siempre que se dispute en los proximos 4 dias (`MAX_DAYS_TO_RACE`). Si no hay GP ese fin de semana, termina sin hacer nada:

```bash
node index.js
```

El flujo principal es:

1. Lee el circuito recibido por argumentos.
2. Construye un contexto de carrera con datos estructurados de F1.
3. Consulta resultados, standings, poles recientes, comparativas de poles, clima, historico de Safety Car/VSC, documentos FIA y noticias web.
4. Si hay credenciales de las carreras de F1, abre la pagina privada con Playwright para leer usuario y pilotos disponibles.
5. Envia el contexto a OpenRouter para generar una prediccion en JSON.
6. Normaliza la respuesta para evitar pilotos duplicados, equipos tratados como pilotos y clasificaciones copiadas del campeonato.
7. Muestra un mensaje con el top 10 previsto en carrera, el piloto de la pole (con tiempo) y la vuelta rapida en carrera.
8. Si hay credenciales y URL privada configuradas, abre el navegador y rellena la apuesta.

Por defecto el terminal queda en modo limpio y solo imprime el mensaje de prediccion. Para ver logs de depuracion, configura:

```env
OUTPUT_ONLY_GRID=0
```

## Prediccion automatica cada jueves

El workflow `.github/workflows/prediccion-semanal.yml` se ejecuta cada jueves a las 08:17 UTC en GitHub Actions. Detecta el GP del fin de semana, genera la parrilla, rellena la apuesta (si hay credenciales) y deja la prediccion en el resumen del run y como artefacto. Las semanas sin carrera termina sin hacer nada. Tambien se puede lanzar a mano desde la pestana Actions ("Run workflow"), opcionalmente indicando el circuito.

En modo desatendido (`CI=true` o `UNATTENDED=1`) el navegador va en headless y se cierra solo al terminar.

Configura en GitHub (Settings > Secrets and variables > Actions):

- Secrets: `OPENROUTER_API_KEY`, `WEB_USER`, `WEB_PASSWORD`, `FANTASY_LOGIN_URL`, `FANTASY_PLAYER_ID`, `FANTASY_PLAYER_NAME`, `FANTASY_LEAGUE_ID`.
- Variables (opcionales): `OPENROUTER_MODEL`, `OPENROUTER_MAX_TOKENS`, `FANTASY_PLAYER_ROLE`, `FANTASY_PLAYER_COLOR`, `FANTASY_RACE_ID`.

## Configuracion local

1. Copia `.env.example` a `.env`.
2. Rellena en `.env` tus credenciales y URLs privadas.
3. No subas `.env` al repositorio: ya esta excluido por `.gitignore`.

El codigo no incluye credenciales, usuario, contrasenas, IDs privados ni la URL privada de acceso.

## Variables de entorno

Estas variables se configuran en `.env`:

- `OPENROUTER_API_KEY`: clave privada para llamar a OpenRouter.
- `OPENROUTER_MODEL`: modelo usado en OpenRouter.
- `OPENROUTER_MAX_TOKENS`: limite de tokens de respuesta.
- `WEB_USER`: usuario de la web privada de Fantasy F1.
- `WEB_PASSWORD`: contrasena de la web privada de Fantasy F1.
- `FANTASY_LOGIN_URL`: URL privada de acceso.
- `FANTASY_PLAYER_ID`: ID del jugador.
- `FANTASY_PLAYER_NAME`: nombre visible del jugador.
- `FANTASY_PLAYER_ROLE`: rol del jugador.
- `FANTASY_PLAYER_COLOR`: color asociado al jugador.
- `FANTASY_RACE_ID`: ID de la carrera en Fantasy F1.
- `FANTASY_LEAGUE_ID`: ID de la liga en Fantasy F1.
- `OUTPUT_ONLY_GRID`: `1` para salida limpia, `0` para logs completos.

## Salida esperada

En modo limpio, la salida por terminal es un mensaje listo para compartir:

```text
🏁 Prediccion F1 - Las Vegas Grand Prix (2026-11-21)

🏆 Top 10 en carrera:
1. Piloto (Escuderia)
...
10. Piloto (Escuderia)

⏱️ Pole: Piloto (Escuderia) - 1:32.512
🟣 Vuelta rapida en carrera: Piloto (Escuderia)
```

Si se envia la apuesta, al final se anade la comprobacion de la peticion de red del envio (lo mismo que se ve en F12 > Red):

```text
✅ Apuesta enviada (HTTP 201, POST /api/apuestas)
📌 Carrera registrada en la web: Las Vegas, id 7
```

Si la web rechaza la apuesta o no se detecta el envio, se muestra `❌` y el workflow termina en error, asi GitHub te avisa. `FANTASY_RACE_ID` no se envia a la web: la carrera la decide la propia web al pulsar "Enviar Apuesta".

## Seguridad

No se debe commitear `.env`. El archivo `.env.example` existe solo como plantilla y no debe contener valores reales.
