/**
 * lib/plazos.js — Calculadora de plazos procesales argentina
 * Fuente de verdad: DOCTOR.md §1.4 y §2.3 (capacidad #4)
 *
 * Tipos soportados:
 *   dias_habiles_judiciales      → excluye fines de semana + feriados nacionales + feria judicial
 *   dias_habiles_administrativos → excluye fines de semana + feriados nacionales (sin feria judicial)
 *   dias_corridos                → cuenta todos los días calendario
 *   meses                        → suma N meses calendario
 *   anios                        → suma N años calendario
 *
 * Feriados: hardcodeados 2025-2027 (tabla feriados_argentina en Fase 3).
 * Feria judicial enero: 1–31 enero completo.
 * Feria judicial invierno: semanas 1 y 2 de julio (días 1–14).
 */

// ── Feriados nacionales Argentina 2025 ───────────────────────────────────────
const FERIADOS_2025 = [
  { fecha: '2025-01-01', motivo: 'Año Nuevo' },
  { fecha: '2025-03-03', motivo: 'Carnaval' },
  { fecha: '2025-03-04', motivo: 'Carnaval' },
  { fecha: '2025-03-24', motivo: 'Día Nacional de la Memoria por la Verdad y la Justicia' },
  { fecha: '2025-04-02', motivo: 'Día del Veterano y de los Caídos en la Guerra de Malvinas' },
  { fecha: '2025-04-17', motivo: 'Jueves Santo (feriado nacional)' },
  { fecha: '2025-04-18', motivo: 'Viernes Santo' },
  { fecha: '2025-05-01', motivo: 'Día del Trabajador' },
  { fecha: '2025-05-25', motivo: 'Día de la Revolución de Mayo' },
  { fecha: '2025-06-20', motivo: 'Paso a la Inmortalidad del Gral. Manuel Belgrano' },
  { fecha: '2025-07-09', motivo: 'Día de la Independencia' },
  { fecha: '2025-08-17', motivo: 'Paso a la Inmortalidad del Gral. José de San Martín' },
  { fecha: '2025-10-13', motivo: 'Día del Respeto a la Diversidad Cultural' },
  { fecha: '2025-11-20', motivo: 'Día de la Soberanía Nacional' },
  { fecha: '2025-12-08', motivo: 'Inmaculada Concepción de María' },
  { fecha: '2025-12-25', motivo: 'Navidad' },
];

// ── Feriados nacionales Argentina 2026 ───────────────────────────────────────
const FERIADOS_2026 = [
  { fecha: '2026-01-01', motivo: 'Año Nuevo' },
  { fecha: '2026-02-16', motivo: 'Carnaval' },
  { fecha: '2026-02-17', motivo: 'Carnaval' },
  { fecha: '2026-03-24', motivo: 'Día Nacional de la Memoria por la Verdad y la Justicia' },
  { fecha: '2026-04-02', motivo: 'Día del Veterano y de los Caídos en la Guerra de Malvinas' },
  { fecha: '2026-04-02', motivo: 'Jueves Santo (feriado nacional)' },
  { fecha: '2026-04-03', motivo: 'Viernes Santo' },
  { fecha: '2026-05-01', motivo: 'Día del Trabajador' },
  { fecha: '2026-05-25', motivo: 'Día de la Revolución de Mayo' },
  { fecha: '2026-06-15', motivo: 'Paso a la Inmortalidad del Gral. Manuel Belgrano' },
  { fecha: '2026-07-09', motivo: 'Día de la Independencia' },
  { fecha: '2026-08-17', motivo: 'Paso a la Inmortalidad del Gral. José de San Martín' },
  { fecha: '2026-10-12', motivo: 'Día del Respeto a la Diversidad Cultural' },
  { fecha: '2026-11-20', motivo: 'Día de la Soberanía Nacional' },
  { fecha: '2026-12-08', motivo: 'Inmaculada Concepción de María' },
  { fecha: '2026-12-25', motivo: 'Navidad' },
];

// ── Feriados nacionales Argentina 2027 ───────────────────────────────────────
const FERIADOS_2027 = [
  { fecha: '2027-01-01', motivo: 'Año Nuevo' },
  { fecha: '2027-02-08', motivo: 'Carnaval' },
  { fecha: '2027-02-09', motivo: 'Carnaval' },
  { fecha: '2027-03-24', motivo: 'Día Nacional de la Memoria por la Verdad y la Justicia' },
  { fecha: '2027-04-02', motivo: 'Día del Veterano y de los Caídos en la Guerra de Malvinas' },
  { fecha: '2027-03-25', motivo: 'Jueves Santo (feriado nacional)' },
  { fecha: '2027-03-26', motivo: 'Viernes Santo' },
  { fecha: '2027-05-01', motivo: 'Día del Trabajador' },
  { fecha: '2027-05-25', motivo: 'Día de la Revolución de Mayo' },
  { fecha: '2027-06-21', motivo: 'Paso a la Inmortalidad del Gral. Manuel Belgrano' },
  { fecha: '2027-07-09', motivo: 'Día de la Independencia' },
  { fecha: '2027-08-16', motivo: 'Paso a la Inmortalidad del Gral. José de San Martín' },
  { fecha: '2027-10-11', motivo: 'Día del Respeto a la Diversidad Cultural' },
  { fecha: '2027-11-22', motivo: 'Día de la Soberanía Nacional' },
  { fecha: '2027-12-08', motivo: 'Inmaculada Concepción de María' },
  { fecha: '2027-12-25', motivo: 'Navidad' },
];

const TODOS_FERIADOS = [...FERIADOS_2025, ...FERIADOS_2026, ...FERIADOS_2027];

// Set para lookup O(1): "YYYY-MM-DD" → motivo
const FERIADOS_MAP = new Map(
  TODOS_FERIADOS.map((f) => [f.fecha, f.motivo])
);

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Formatea una fecha como "YYYY-MM-DD" en zona local (sin UTC shift).
 * @param {Date} d
 * @returns {string}
 */
function toISOLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Formatea una fecha para mostrar al usuario: "DD/MM/YYYY".
 * @param {Date} d
 * @returns {string}
 */
function formatDisplay(d) {
  const day = String(d.getDate()).padStart(2, '0');
  const m   = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${m}/${d.getFullYear()}`;
}

/**
 * Devuelve el nombre del día en español.
 * @param {Date} d
 * @returns {string}
 */
function nombreDia(d) {
  return ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'][d.getDay()];
}

/**
 * Comprueba si una fecha es fin de semana.
 * @param {Date} d
 * @returns {boolean}
 */
function esFinDeSemana(d) {
  return d.getDay() === 0 || d.getDay() === 6;
}

/**
 * Comprueba si una fecha es feriado nacional.
 * @param {Date} d
 * @returns {string|null} motivo del feriado o null
 */
function esFeriado(d) {
  return FERIADOS_MAP.get(toISOLocal(d)) || null;
}

/**
 * Comprueba si una fecha cae en feria judicial.
 * Enero completo (1–31) y primeras 2 semanas de julio (1–14).
 * @param {Date} d
 * @returns {string|null} descripción de la feria o null
 */
function esFeriaJudicial(d) {
  const mes = d.getMonth() + 1; // 1-12
  const dia = d.getDate();
  if (mes === 1) return 'feria judicial de enero';
  if (mes === 7 && dia <= 14) return 'feria judicial de invierno (julio)';
  return null;
}

/**
 * Avanza una fecha en 1 día (muta el objeto Date).
 * @param {Date} d
 */
function avanzarDia(d) {
  d.setDate(d.getDate() + 1);
}

// ── Función principal ─────────────────────────────────────────────────────────

/**
 * Calcula la fecha de vencimiento de un plazo procesal.
 *
 * @param {string|Date} fechaInicio   Fecha de inicio del plazo (ISO "YYYY-MM-DD" o Date)
 * @param {number}       cantidad      Número de unidades del plazo
 * @param {string}       tipo          Tipo de plazo (ver constantes TIPOS_PLAZO en catalogos.js)
 * @param {Object}       [opciones]
 * @param {boolean}      [opciones.incluirInicio=false]  Si true, cuenta el día de inicio
 *
 * @returns {{
 *   fechaVencimiento: Date,
 *   fechaVencimientoDisplay: string,
 *   diasExcluidos: Array<{fecha: string, display: string, motivo: string}>,
 *   explicacion: string,
 *   diasContados: number
 * }}
 */
export function calcularPlazo(fechaInicio, cantidad, tipo, opciones = {}) {
  if (!fechaInicio || !cantidad || !tipo) {
    throw new Error('calcularPlazo: fechaInicio, cantidad y tipo son requeridos');
  }

  const n = Number(cantidad);
  if (isNaN(n) || n <= 0) throw new Error('calcularPlazo: cantidad debe ser un número positivo');

  // Normalizar fecha inicio
  const inicio = fechaInicio instanceof Date
    ? new Date(fechaInicio)
    : new Date(fechaInicio + 'T12:00:00'); // mediodía para evitar UTC shift

  if (isNaN(inicio.getTime())) throw new Error('calcularPlazo: fechaInicio inválida');

  // ── Meses y años: aritmética de calendar, no de días ─────────────────────
  if (tipo === 'meses' || tipo === 'anios') {
    const resultado = new Date(inicio);
    if (tipo === 'meses') resultado.setMonth(resultado.getMonth() + n);
    else resultado.setFullYear(resultado.getFullYear() + n);

    const unidad = tipo === 'meses' ? (n === 1 ? 'mes' : 'meses') : (n === 1 ? 'año' : 'años');
    return {
      fechaVencimiento: resultado,
      fechaVencimientoDisplay: formatDisplay(resultado),
      diasExcluidos: [],
      diasContados: n,
      explicacion:
        `El plazo de ${n} ${unidad} desde el ${formatDisplay(inicio)} vence el **${formatDisplay(resultado)}**.\n` +
        `(Cálculo por meses/años calendario — no se excluyen días hábiles.)`,
    };
  }

  // ── Días corridos ─────────────────────────────────────────────────────────
  if (tipo === 'dias_corridos') {
    const resultado = new Date(inicio);
    resultado.setDate(resultado.getDate() + n);
    return {
      fechaVencimiento: resultado,
      fechaVencimientoDisplay: formatDisplay(resultado),
      diasExcluidos: [],
      diasContados: n,
      explicacion:
        `El plazo de ${n} día${n > 1 ? 's' : ''} corrido${n > 1 ? 's' : ''} desde el ${formatDisplay(inicio)} vence el **${formatDisplay(resultado)}**.\n` +
        `(Días corridos: se cuentan todos los días calendario sin excepción.)`,
    };
  }

  // ── Días hábiles (judiciales o administrativos) ────────────────────────────
  const esJudicial = tipo === 'dias_habiles_judiciales';
  const fecha = new Date(inicio);
  let diasContados = 0;
  const diasExcluidos = [];

  // Si el día de inicio es hábil y se pide incluirlo, contarlo
  // Por defecto, el plazo empieza a correr AL DÍA SIGUIENTE del inicio
  if (!opciones.incluirInicio) avanzarDia(fecha);

  while (diasContados < n) {
    const fds = esFinDeSemana(fecha);
    const feriado = esFeriado(fecha);
    const feria = esJudicial ? esFeriaJudicial(fecha) : null;

    if (fds || feriado || feria) {
      const motivoExclusion = feria
        ? feria
        : feriado
        ? `feriado nacional — ${feriado}`
        : `${nombreDia(fecha)}`;

      diasExcluidos.push({
        fecha: toISOLocal(fecha),
        display: formatDisplay(fecha),
        motivo: motivoExclusion,
      });
    } else {
      diasContados++;
    }

    if (diasContados < n) avanzarDia(fecha);
  }

  // Asegurarse de que el día de vencimiento en sí sea hábil
  // (si el último día contado cayó en inhábil por coincidencia del while, ya lo saltó)

  const tipoLabel = esJudicial ? 'hábiles judiciales' : 'hábiles administrativos';
  const exclusionesText =
    diasExcluidos.length === 0
      ? 'Sin días excluidos.'
      : 'Días excluidos:\n' +
        diasExcluidos.map((d) => `  • ${d.display} (${nombreDia(new Date(d.fecha + 'T12:00:00'))}) — ${d.motivo}`).join('\n');

  const explicacion =
    `El plazo de ${n} día${n > 1 ? 's' : ''} ${tipoLabel} desde el ${formatDisplay(inicio)} ` +
    `vence el **${formatDisplay(fecha)}**.\n\n` +
    exclusionesText;

  return {
    fechaVencimiento: fecha,
    fechaVencimientoDisplay: formatDisplay(fecha),
    diasExcluidos,
    diasContados: n,
    explicacion,
  };
}

// ── Unit tests inline (se ejecutan solo en Node.js, nunca en el browser) ──────
// Correr con: node src/lib/plazos.js
if (typeof process !== 'undefined' && process.argv[1]?.endsWith('plazos.js')) {
  let passed = 0;
  let failed = 0;

  function assert(descripcion, condicion, detalle = '') {
    if (condicion) {
      console.log(`  ✅ ${descripcion}`);
      passed++;
    } else {
      console.error(`  ❌ ${descripcion}${detalle ? ' — ' + detalle : ''}`);
      failed++;
    }
  }

  console.log('\n── UNIT TESTS: plazos.js ──\n');

  // T1: 5 días corridos desde 2026-01-01 → 2026-01-06
  {
    const r = calcularPlazo('2026-01-01', 5, 'dias_corridos');
    assert(
      'T1: 5 días corridos desde 2026-01-01 → 2026-01-06',
      r.fechaVencimientoDisplay === '06/01/2026',
      `got: ${r.fechaVencimientoDisplay}`
    );
    assert('T1: sin días excluidos', r.diasExcluidos.length === 0);
  }

  // T2: 5 días hábiles judiciales desde 2026-01-01
  // Enero completo es feria judicial → ningún día hábil en enero
  // El vencimiento cae en febrero (6 de feb si empezamos a contar el 2 de feb
  // porque el 1 es feriado año nuevo y enero es feria)
  {
    const r = calcularPlazo('2026-01-01', 5, 'dias_habiles_judiciales');
    // Enero entero es feria + 01-feb es domingo → empezamos a contar el 02-feb
    // 02-feb (lun) = 1, 03-feb (mar) = 2, 04-feb (mié) = 3, 05-feb (jue) = 4, 06-feb (vie) = 5
    assert(
      'T2: 5 días hábiles judiciales desde 2026-01-01 → 06/02/2026 (feria enero + año nuevo)',
      r.fechaVencimientoDisplay === '06/02/2026',
      `got: ${r.fechaVencimientoDisplay}`
    );
    assert('T2: hay días excluidos (feria + feriados)', r.diasExcluidos.length > 0);
  }

  // T3: 3 meses desde 2026-01-15 → 2026-04-15
  {
    const r = calcularPlazo('2026-01-15', 3, 'meses');
    assert(
      'T3: 3 meses desde 2026-01-15 → 15/04/2026',
      r.fechaVencimientoDisplay === '15/04/2026',
      `got: ${r.fechaVencimientoDisplay}`
    );
  }

  // T4: 1 año desde 2026-03-10 → 2027-03-10
  {
    const r = calcularPlazo('2026-03-10', 1, 'anios');
    assert(
      'T4: 1 año desde 2026-03-10 → 10/03/2027',
      r.fechaVencimientoDisplay === '10/03/2027',
      `got: ${r.fechaVencimientoDisplay}`
    );
  }

  // T5: 5 días hábiles judiciales desde 2026-03-09 (lunes)
  // 10-mar (mar)=1, 11-mar (mié)=2, 12-mar (jue)=3, 13-mar (vie)=4,
  // 14-mar sábado excluido, 15-mar domingo excluido, 16-mar (lun)=5 → vence 16/03/2026
  {
    const r = calcularPlazo('2026-03-09', 5, 'dias_habiles_judiciales');
    assert(
      'T5: 5 días hábiles judiciales desde lunes 2026-03-09 → 16/03/2026',
      r.fechaVencimientoDisplay === '16/03/2026',
      `got: ${r.fechaVencimientoDisplay}`
    );
    const sabado = r.diasExcluidos.find((d) => d.fecha === '2026-03-14');
    assert('T5: sábado 14/03 excluido', !!sabado);
  }

  // T6: feriado nacional excluido en hábiles administrativos
  // 5 días hábiles admin desde 2026-03-23 (lunes antes del 24-mar)
  // Plazo empieza el día SIGUIENTE al inicio (no incluirInicio):
  // 24-mar feriado→excluido, 25-mar(mié)=1, 26-mar(jue)=2, 27-mar(vie)=3,
  // 28-mar sáb→excluido, 29-mar dom→excluido, 30-mar(lun)=4, 31-mar(mar)=5
  {
    const r = calcularPlazo('2026-03-23', 5, 'dias_habiles_administrativos');
    assert(
      'T6: 5 días hábiles admin desde 2026-03-23 → 31/03/2026 (feriado 24/03)',
      r.fechaVencimientoDisplay === '31/03/2026',
      `got: ${r.fechaVencimientoDisplay}`
    );
    const feriado = r.diasExcluidos.find((d) => d.fecha === '2026-03-24');
    assert('T6: feriado 24/03 (Memoria) excluido en admin', !!feriado);
  }

  // T7: feria invierno excluida solo en judicial, no en administrativo
  // 5 días hábiles judiciales desde 2026-07-01 (miércoles, feria)
  // Feria invierno: 01–14 julio → primeros 5 hábiles reales son 15-jul (mié)... verifiquemos
  {
    const rJud = calcularPlazo('2026-07-01', 5, 'dias_habiles_judiciales');
    const rAdm = calcularPlazo('2026-07-01', 5, 'dias_habiles_administrativos');
    assert(
      'T7: feria invierno excluye en judicial → vence después del 14/07',
      new Date(rJud.fechaVencimiento) > new Date('2026-07-14'),
      `got: ${rJud.fechaVencimientoDisplay}`
    );
    assert(
      'T7: feria invierno NO excluye en administrativo → vence antes del 14/07',
      new Date(rAdm.fechaVencimiento) <= new Date('2026-07-14'),
      `got: ${rAdm.fechaVencimientoDisplay}`
    );
  }

  // T8: error en input inválido
  {
    let threw = false;
    try { calcularPlazo('', 5, 'dias_corridos'); } catch { threw = true; }
    assert('T8: error con fechaInicio vacía', threw);
  }

  // T9: días corridos no excluyen feriados ni fin de semana
  // 3 días corridos desde viernes 2026-03-20 → lunes 2026-03-23
  // (sin importar que el 21 sea sáb y 22 sea dom)
  {
    const r = calcularPlazo('2026-03-20', 3, 'dias_corridos');
    assert(
      'T9: 3 días corridos desde viernes 2026-03-20 → 23/03/2026 (pasa fin de semana)',
      r.fechaVencimientoDisplay === '23/03/2026',
      `got: ${r.fechaVencimientoDisplay}`
    );
  }

  // T10: explicacion contiene la fecha de vencimiento
  {
    const r = calcularPlazo('2026-05-10', 10, 'dias_habiles_judiciales');
    assert(
      'T10: explicacion incluye fecha de vencimiento',
      r.explicacion.includes(r.fechaVencimientoDisplay)
    );
    assert('T10: explicacion no vacía', r.explicacion.length > 20);
  }

  console.log(`\n── Resultados: ${passed} passed, ${failed} failed ──\n`);
  if (failed > 0) process.exit(1);
}
