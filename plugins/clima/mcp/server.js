#!/usr/bin/env node
// MCP del clima, sin dependencias: MCP es JSON-RPC 2.0 por stdin/stdout, un mensaje por línea.
// Consume Open-Meteo (gratis, sin API key). Node 18+ (usa fetch nativo).
//
//   Probarlo solo:   node server.js        y escribe una línea JSON-RPC
//   En Claude Code:  claude mcp add clima -- node /ruta/a/server.js

const PROTOCOL = '2025-06-18';
const TIMEOUT_MS = 10000;

// ── La API que ya tienes (aquí, Open-Meteo) ─────────────────────────────
async function getJson(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`Open-Meteo respondió HTTP ${res.status}`);
  return res.json();
}

// Nombres comunes cuya ciudad principal se llama distinto en el geocodificador
const ALIAS = { 'queretaro': 'Santiago de Querétaro', 'cdmx': 'Ciudad de México', 'df': 'Ciudad de México', 'leon': 'León de los Aldama' };
const plano = (t) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

// "Monterrey, México" → busca "Monterrey" y usa "México" como pista de país o estado.
// Entre homónimos gana el que coincide con la pista y luego el más poblado.
async function buscarCiudad(texto) {
  const [nombre, ...resto] = String(texto).split(',');
  const pista = plano(resto.join(' '));
  const q = new URLSearchParams({ name: ALIAS[plano(nombre)] || nombre.trim(), count: '10', language: 'es', format: 'json' });
  const data = await getJson(`https://geocoding-api.open-meteo.com/v1/search?${q}`);
  const encaja = (r) => !!pista && [r.country, r.admin1, r.country_code].some((v) => v && (plano(v).includes(pista) || pista.includes(plano(v))));
  const c = (data.results || []).slice().sort((a, b) => (encaja(b) - encaja(a)) || ((b.population || 0) - (a.population || 0)))[0];
  if (!c) throw new Error(`No encontré la ciudad «${texto}». Prueba con otro nombre o agrega el país.`);
  return { nombre: c.name, estado: c.admin1 || '', pais: c.country || '', lat: c.latitude, lon: c.longitude, zona: c.timezone };
}

const CODIGOS = { 0: 'despejado', 1: 'mayormente despejado', 2: 'parcialmente nublado', 3: 'nublado', 45: 'niebla', 48: 'niebla', 51: 'llovizna ligera', 53: 'llovizna', 55: 'llovizna intensa', 61: 'lluvia ligera', 63: 'lluvia', 65: 'lluvia fuerte', 71: 'nieve ligera', 73: 'nieve', 75: 'nieve fuerte', 80: 'chubascos', 81: 'chubascos', 82: 'chubascos fuertes', 95: 'tormenta', 96: 'tormenta con granizo', 99: 'tormenta con granizo' };
const cielo = (code) => CODIGOS[code] || `código ${code}`;

async function climaActual({ ciudad }) {
  const c = await buscarCiudad(ciudad);
  const q = new URLSearchParams({ latitude: c.lat, longitude: c.lon, timezone: 'auto', current: 'temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,wind_speed_10m,weather_code' });
  const d = await getJson(`https://api.open-meteo.com/v1/forecast?${q}`);
  const x = d.current;
  return { ciudad: `${c.nombre}, ${c.estado || c.pais}`, hora_local: x.time, temperatura_c: x.temperature_2m, sensacion_c: x.apparent_temperature, humedad_pct: x.relative_humidity_2m, lluvia_mm: x.precipitation, viento_kmh: x.wind_speed_10m, cielo: cielo(x.weather_code) };
}

async function pronostico({ ciudad, dias = 3 }) {
  const n = Math.min(Math.max(Number(dias) || 3, 1), 7);
  const c = await buscarCiudad(ciudad);
  const q = new URLSearchParams({ latitude: c.lat, longitude: c.lon, timezone: 'auto', forecast_days: String(n), daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code' });
  const d = await getJson(`https://api.open-meteo.com/v1/forecast?${q}`);
  const k = d.daily;
  return { ciudad: `${c.nombre}, ${c.estado || c.pais}`, dias: k.time.map((fecha, i) => ({ fecha, max_c: k.temperature_2m_max[i], min_c: k.temperature_2m_min[i], prob_lluvia_pct: k.precipitation_probability_max[i], cielo: cielo(k.weather_code[i]) })) };
}

// ── Las herramientas que ve Claude ──────────────────────────────────────
// La descripción es lo que Claude lee para decidir cuándo usarla: escríbela para él.
const TOOLS = [
  {
    name: 'clima_actual',
    title: 'Clima actual',
    description: 'Clima en este momento en una ciudad: temperatura, sensación, humedad, lluvia, viento y cielo. Úsala cuando pregunten cómo está el clima ahora o si hace frío o calor.',
    inputSchema: { type: 'object', properties: { ciudad: { type: 'string', description: 'Ciudad, de preferencia con país, p. ej. "Monterrey, México"' } }, required: ['ciudad'] },
    annotations: { readOnlyHint: true, openWorldHint: true },
    run: climaActual
  },
  {
    name: 'pronostico',
    title: 'Pronóstico',
    description: 'Pronóstico diario de 1 a 7 días: máxima, mínima, probabilidad de lluvia y cielo. Úsala para planear (viajes, eventos, entregas).',
    inputSchema: { type: 'object', properties: { ciudad: { type: 'string' }, dias: { type: 'integer', minimum: 1, maximum: 7, description: 'Días (por defecto 3)' } }, required: ['ciudad'] },
    annotations: { readOnlyHint: true, openWorldHint: true },
    run: pronostico
  }
];

// ── El protocolo: JSON-RPC por stdio ────────────────────────────────────
const send = (msg) => process.stdout.write(JSON.stringify({ jsonrpc: '2.0', ...msg }) + '\n');
const log = (...a) => process.stderr.write(a.join(' ') + '\n'); // stdout es solo para el protocolo

async function handle(req) {
  const { id, method, params = {} } = req;
  if (method === 'initialize') {
    return send({ id, result: { protocolVersion: params.protocolVersion || PROTOCOL, capabilities: { tools: {} }, serverInfo: { name: 'clima', version: '1.0.0' } } });
  }
  if (method === 'notifications/initialized' || id === undefined) return; // notificaciones: sin respuesta
  if (method === 'ping') return send({ id, result: {} });
  if (method === 'tools/list') {
    return send({ id, result: { tools: TOOLS.map(({ run, ...t }) => t) } });
  }
  if (method === 'tools/call') {
    const tool = TOOLS.find((t) => t.name === params.name);
    if (!tool) return send({ id, error: { code: -32602, message: `Herramienta desconocida: ${params.name}` } });
    try {
      const out = await tool.run(params.arguments || {});
      return send({ id, result: { content: [{ type: 'text', text: JSON.stringify(out, null, 2) }] } });
    } catch (e) {
      // Error que el modelo puede leer y corregir (isError), no un crash del servidor
      return send({ id, result: { content: [{ type: 'text', text: e.message }], isError: true } });
    }
  }
  return send({ id, error: { code: -32601, message: `Método no soportado: ${method}` } });
}

let buffer = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  buffer += chunk;
  let i;
  while ((i = buffer.indexOf('\n')) >= 0) {
    const line = buffer.slice(0, i).trim();
    buffer = buffer.slice(i + 1);
    if (!line) continue;
    let req;
    try { req = JSON.parse(line); } catch { send({ id: null, error: { code: -32700, message: 'JSON inválido' } }); continue; }
    handle(req).catch((e) => log('error', e.message));
  }
});
log('MCP clima listo (stdio)');
