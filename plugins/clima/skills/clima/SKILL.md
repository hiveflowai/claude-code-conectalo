---
name: clima
description: Consulta el clima actual o el pronóstico de una ciudad con el MCP «clima» y lo traduce en una recomendación práctica. Úsala cuando el usuario pregunte por el clima, la temperatura, si va a llover, o cuando planee un viaje, un evento al aire libre o una entrega y el clima importe.
---

# Clima con criterio

El MCP `clima` da los datos; esta skill dice cómo usarlos.

## Cuándo
- «¿Cómo está el clima en…?», «¿va a llover…?», «¿llevo chamarra?».
- Planes donde el clima cambia la decisión: viajes, eventos al aire libre, rutas de entrega, obra.

## Cómo
1. Si no dicen ciudad, pregúntala (con país si es ambigua: hay varias «Victoria»).
2. Para «ahora» usa `clima_actual`; para fechas usa `pronostico` (máximo 7 días).
3. Responde en 2 o 3 líneas: el dato clave primero y luego **qué hacer** («llévate paraguas», «mejor la entrega temprano»).
4. Para un evento, da la probabilidad de lluvia del día y sugiere un plan B si supera 40 %.

## Reglas
- No inventes datos: si la herramienta falla, dilo y ofrece reintentar.
- Temperaturas en °C; viento en km/h.
- Nunca más de 7 días: el pronóstico más lejano no es confiable.
