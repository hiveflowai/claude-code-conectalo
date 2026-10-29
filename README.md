# Conéctalo: de tu sistema a herramientas de Claude Code

**Taller de 30 minutos · Claude Code for Devs** con Jonathan Olvera, fundador de [Hiveflow](https://hiveflow.ai).

De una API que ya tienes a herramientas de Claude Code: **tu propio MCP server**, una **skill** que le dice cuándo usarlo y un **plugin** que tu equipo instala con un comando. El ejemplo consume el clima de [Open-Meteo](https://open-meteo.com) (gratis, sin API key); cámbialo por tu API.

```
tu API ──► MCP server (herramientas) ──► skill (cuándo y cómo) ──► plugin (tu equipo, un comando)
```

## 0 · Instálalo en 30 segundos (para ver el final primero)

En Claude Code:

```
/plugin marketplace add hiveflowai/claude-code-conectalo
/plugin install clima@conectalo
```

Reinicia o usa `/reload-plugins` y pregunta: *«¿Va a llover mañana en Monterrey?»*. Requiere Node 18+.

## 1 · Qué es MCP (2 min)

MCP (Model Context Protocol) es el USB-C de la IA: un estándar para que Claude use herramientas de cualquier sistema. Un servidor MCP ofrece **herramientas** (acciones), **recursos** (datos para leer) y **prompts** (plantillas). Por dentro es solo **JSON-RPC por stdin/stdout**: `initialize`, `tools/list` y `tools/call`.

## 2 · Tu MCP en 100 líneas, sin dependencias (8 min)

Lee [plugins/clima/mcp/server.js](plugins/clima/mcp/server.js). Tiene tres partes:

1. **Tu API:** `fetch` a Open-Meteo (geocoding + pronóstico).
2. **Las herramientas:** `clima_actual` y `pronostico`, cada una con nombre, **descripción escrita para Claude**, esquema de entrada y anotaciones (`readOnlyHint`).
3. **El protocolo:** un loop que lee JSON-RPC línea por línea y responde.

Pruébalo sin Claude:

```bash
printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node plugins/clima/mcp/server.js
```

¿Quieres hacerlo tú? Pídeselo a Claude Code:

> Escribe un servidor MCP en Node sin dependencias (JSON-RPC por stdio) con dos herramientas que consuman Open-Meteo: clima_actual(ciudad) y pronostico(ciudad, dias). Usa el geocoding de Open-Meteo para convertir la ciudad en coordenadas. Errores como isError para que el modelo los lea.

## 3 · Conéctalo a Claude Code (4 min)

```bash
claude mcp add clima -- node "$PWD/plugins/clima/mcp/server.js"
```

Dentro de Claude Code: `/mcp` muestra el servidor y sus herramientas. Pregunta *«¿cómo está el clima en Guadalajara?»*. Para todo el equipo, usa `--scope project` (se guarda en `.mcp.json` del repo).

## 4 · La skill: cuándo y cómo usarlo (5 min)

El MCP da los datos; la skill da el criterio. [plugins/clima/skills/clima/SKILL.md](plugins/clima/skills/clima/SKILL.md):

- **`description`** con los disparadores reales («clima», «va a llover», «viaje», «evento»): con eso Claude decide usarla.
- **Procedimiento:** qué herramienta usar para «ahora» y cuál para fechas.
- **Reglas:** no inventar datos, máximo 7 días, responder con una recomendación («llévate paraguas»).

## 5 · El plugin: tu equipo lo instala con un comando (5 min)

```
.claude-plugin/marketplace.json        ← este repo es un marketplace
plugins/clima/
  .claude-plugin/plugin.json           ← nombre, versión, descripción
  .mcp.json                            ← levanta el MCP con ${CLAUDE_PLUGIN_ROOT}
  mcp/server.js                        ← el servidor
  skills/clima/SKILL.md                ← la skill
```

Valídalo y publícalo:

```bash
claude plugin validate plugins/clima
claude plugin validate .
git push   # tu equipo: /plugin marketplace add <tu-org>/<tu-repo>
```

Para tu API: copia `plugins/clima`, cambia las funciones de la sección «La API que ya tienes» y las descripciones de las herramientas. Las llaves de tu API van en variables de entorno (`"env"` en `.mcp.json`), nunca en el código.

## 6 · De tu laptop a producción (3 min)

Un MCP local sirve para ti y tu equipo. Para que lo usen agentes que corren solos (un chat, un WhatsApp, un horario), con **permisos por herramienta**, **aprobaciones humanas** y **bitácora**, conéctalo en [Hiveflow](https://hiveflow.ai) como servidor MCP. Y conecta tu Claude Code a Hiveflow para crear y operar esos agentes desde la terminal:

```bash
claude mcp add --transport http hiveflow https://mcp.hiveflow.ai
```

### Móntalo en Hiveflow

¿Quieres que tu MCP corra en la nube y no en tu laptop? Hiveflow lo monta en un **Sandbox de Hiveflow** (un entorno aislado) y lo conecta a tus agentes. Puedes armarlo **sin código**, con el Generador de MCP (pegas la documentación de tu API), o subir **tu propio código** desde Claude con la herramienta `deploy_mcp_server`.

Paso a paso: **[docs/hiveflow.md](docs/hiveflow.md)**.

## Seguridad: lo que enseñamos

- **Un plugin ejecuta código en tu máquina.** Lee `server.js` y `.mcp.json` antes de instalar uno de un tercero; instala solo de marketplaces que confíes.
- **Solo lo necesario:** herramientas de lectura marcadas `readOnlyHint`; Claude Code pide permiso para usar cada herramienta (o limítalas con `--allowedTools`).
- **Errores legibles, no crashes:** `isError` con un mensaje que el modelo pueda corregir.
- **Llaves fuera del código** y del repo: variables de entorno.

## Enlaces

- Documentación: [docs.claude.com](https://docs.claude.com) · [modelcontextprotocol.io](https://modelcontextprotocol.io)
- Hiveflow: [hiveflow.ai](https://hiveflow.ai) · [app.hiveflow.ai/signup](https://app.hiveflow.ai/signup)
- Jonathan en [Instagram](https://instagram.com/johnolven), [TikTok](https://tiktok.com/@JohnOlven) y [LinkedIn](https://linkedin.com/in/johnolven)

---

Uso libre (MIT). Datos del clima: [Open-Meteo](https://open-meteo.com) (CC BY 4.0).
