# Monta tu MCP en Hiveflow

Tu MCP local sirve para ti y tu equipo. Si quieres que corra en la nube y que lo usen agentes que trabajan solos (un chat, un WhatsApp, un horario), móntalo en [Hiveflow](https://hiveflow.ai). Hay dos caminos.

> Necesitas una cuenta: [app.hiveflow.ai/signup](https://app.hiveflow.ai/signup).

## Camino 1 · Sin código: el Generador de MCP

1. En [app.hiveflow.ai](https://app.hiveflow.ai) abre **Integraciones → Generador de MCP**.
2. En **Configuración** elige el modelo que va a escribir el código.
3. Pega la URL de la documentación de tu API y di qué herramientas quieres. Por ejemplo:

   > Crea un servidor MCP del clima con la API de Open-Meteo (https://open-meteo.com/en/docs, sin API key). Dos herramientas: `clima_actual(ciudad)` y `pronostico(ciudad, dias 1-7)`.

4. El agente escribe `src/index.js` y `package.json`. Revísalos y pídele cambios en el chat si hace falta.
5. Presiona **Desplegar en la nube**. Si tu código usa `process.env.ALGO`, la ventana te pide esos valores (tus API keys).
6. Al terminar ves las herramientas, la hora en que vence y el botón **Detener**. El MCP ya aparece como conector de tu organización.

## Camino 2 · Con tu código: desde Claude

1. Conecta Claude a Hiveflow:
   - **Claude Code:** `claude mcp add --transport http hiveflow https://mcp.hiveflow.ai`
   - **Claude (web, escritorio o celular):** Personalizar → Conectores → Agregar conector personalizado → `https://mcp.hiveflow.ai`
2. Pídele que lo despliegue. Por ejemplo, desde este repo:

   > Despliega en Hiveflow el MCP de `plugins/clima/mcp/server.js` con el nombre «Clima».

3. Claude usa la herramienta `deploy_mcp_server` (nombre, archivos y variables) y te responde con las herramientas que quedaron en línea.
4. Para verlos o apagarlos: `list_hosted_mcp_servers` y `stop_hosted_mcp_server`.

Formato que espera `deploy_mcp_server`:

| Campo | Qué es |
|---|---|
| `name` | Nombre del conector en Hiveflow, por ejemplo `"Clima"` |
| `files` | Archivos `{ "ruta": "contenido" }`. Debe incluir el de entrada |
| `entry` | Archivo de entrada (por defecto `server.js`) |
| `env` | Variables para tu servidor, por ejemplo `{ "WEATHER_API_KEY": "…" }` |

Tu servidor debe ser un MCP de Node por **stdio**, como el de este repo. Hiveflow lo expone por HTTPS por ti.

## Cómo se monta (y por qué es seguro)

```
tu código ──► Sandbox de Hiveflow (aislado) ──► conector HTTPS con token ──► tus agentes en Hiveflow
```

- **Tu código nunca corre en los servidores de Hiveflow.** Corre en un **Sandbox de Hiveflow**: un entorno aislado que se apaga solo (1 hora por defecto).
- **Tus llaves solo viajan al sandbox.** Hiveflow guarda los nombres de las variables, no los valores, y ninguna llave de Hiveflow entra al sandbox.
- **`npm install` sin scripts** (`--ignore-scripts`) y límites de tamaño y de archivos.
- **Solo tu organización** lo ve y lo puede detener; desplegar pide permiso de escritura.
- **Conector con token propio:** cada despliegue tiene su token, cifrado en Hiveflow. Sin el token, el sandbox responde 401.
- **Se cobra como cómputo** con tus créditos, y se detiene si te quedas sin saldo.

## Úsalo en tus agentes

Ya montado, agrega el conector a un nodo LLM o a un agente de Hiveflow. Ahí decides qué herramientas puede usar, cuáles piden aprobación humana, y todo queda en la bitácora con su costo.
