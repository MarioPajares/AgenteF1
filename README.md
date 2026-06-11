# AgenteF1

AgenteF1 genera una estimacion para una carrera de Formula 1 y, si hay credenciales configuradas, rellena una apuesta en una web privada de Fantasy F1.

## Funcionamiento

La aplicacion se ejecuta indicando el circuito o Gran Premio:

```bash
node index.js "Barcelona"
```

El flujo principal es:

1. Lee el circuito recibido por argumentos.
2. Construye un contexto de carrera con datos estructurados de F1.
3. Consulta resultados, standings, poles recientes, comparativas de poles, clima, historico de Safety Car/VSC, documentos FIA y noticias web.
4. Si hay credenciales de las carreras de F1, abre la pagina privada con Playwright para leer usuario y pilotos disponibles.
5. Envia el contexto a OpenRouter para generar una prediccion en JSON.
6. Normaliza la respuesta para evitar pilotos duplicados, equipos tratados como pilotos y clasificaciones copiadas del campeonato.
7. Muestra por terminal solo la parrilla prevista de 22 pilotos.
8. Si hay credenciales y URL privada configuradas, abre el navegador y rellena la apuesta.

Por defecto el terminal queda en modo limpio y solo imprime la parrilla prevista. Para ver logs de depuracion, configura:

```env
OUTPUT_ONLY_GRID=0
```

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

En modo limpio, la salida por terminal tiene este formato:

```text
1. Piloto
2. Piloto
...
22. Piloto
```

## Seguridad

No se debe commitear `.env`. El archivo `.env.example` existe solo como plantilla y no debe contener valores reales.
