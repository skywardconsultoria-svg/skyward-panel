/**
 * lib/catalogos.js — Catálogos argentinos para el módulo Doctor
 * Fuente de verdad: DOCTOR.md §1 y §4
 * NO modificar sin actualizar también DOCTOR.md.
 */

// ── Jurisdicciones ────────────────────────────────────────────
export const JURISDICCIONES = [
  { value: 'PJN',        label: 'PJN — Poder Judicial de la Nación' },
  { value: 'SCBA',       label: 'SCBA — Provincia de Buenos Aires' },
  { value: 'CABA',       label: 'CABA — Ciudad Autónoma de Buenos Aires' },
  { value: 'cordoba',    label: 'Córdoba' },
  { value: 'santa_fe',   label: 'Santa Fe' },
  { value: 'mendoza',    label: 'Mendoza' },
  { value: 'neuquen',    label: 'Neuquén' },
  { value: 'rio_negro',  label: 'Río Negro' },
  { value: 'otra',       label: 'Otra provincial' },
];

// ── Fueros ────────────────────────────────────────────────────
export const FUEROS = [
  { value: 'civil',                      label: 'Civil' },
  { value: 'comercial',                  label: 'Comercial' },
  { value: 'laboral',                    label: 'Laboral' },
  { value: 'penal',                      label: 'Penal' },
  { value: 'familia',                    label: 'Familia' },
  { value: 'contencioso_administrativo', label: 'Contencioso Administrativo' },
  { value: 'concursal',                  label: 'Concursal' },
  { value: 'previsional',                label: 'Previsional' },
  { value: 'tributario',                 label: 'Tributario' },
];

// ── Tipos de proceso ──────────────────────────────────────────
// Catálogo inicial de 24 ítems según DOCTOR.md §1.3. Extensible.
export const TIPOS_PROCESO = [
  { value: 'ordinario',                 label: 'Ordinario' },
  { value: 'sumario',                   label: 'Sumario' },
  { value: 'sumarisimo',                label: 'Sumarísimo' },
  { value: 'ejecutivo',                 label: 'Ejecutivo' },
  { value: 'ejecucion_de_sentencia',    label: 'Ejecución de sentencia' },
  { value: 'ejecucion_hipotecaria',     label: 'Ejecución hipotecaria' },
  { value: 'ejecucion_prendaria',       label: 'Ejecución prendaria' },
  { value: 'amparo',                    label: 'Amparo' },
  { value: 'habeas_corpus',             label: 'Hábeas corpus' },
  { value: 'habeas_data',               label: 'Hábeas data' },
  { value: 'sucesorio_ab_intestato',    label: 'Sucesorio ab intestato' },
  { value: 'sucesorio_testamentario',   label: 'Sucesorio testamentario' },
  { value: 'voluntario',                label: 'Voluntario' },
  { value: 'mediacion_prejudicial',     label: 'Mediación prejudicial' },
  { value: 'mediacion_familiar',        label: 'Mediación familiar' },
  { value: 'concurso_preventivo',       label: 'Concurso preventivo' },
  { value: 'quiebra',                   label: 'Quiebra' },
  { value: 'divorcio',                  label: 'Divorcio' },
  { value: 'alimentos',                 label: 'Alimentos' },
  { value: 'tenencia',                  label: 'Tenencia' },
  { value: 'regimen_comunicacion',      label: 'Régimen de comunicación' },
  { value: 'accidente_de_trabajo',      label: 'Accidente de trabajo' },
  { value: 'accidente_de_transito',     label: 'Accidente de tránsito' },
  { value: 'despido',                   label: 'Despido' },
  { value: 'danos_y_perjuicios',        label: 'Daños y perjuicios' },
];

// ── Etapas procesales ─────────────────────────────────────────
export const ETAPAS_EXPEDIENTE = [
  { value: 'inicial',     label: 'Inicial' },
  { value: 'prueba',      label: 'Prueba' },
  { value: 'alegatos',    label: 'Alegatos' },
  { value: 'sentencia',   label: 'Sentencia' },
  { value: 'ejecucion',   label: 'Ejecución' },
  { value: 'archivado',   label: 'Archivado' },
];

// ── Estados del expediente ────────────────────────────────────
export const ESTADOS_EXPEDIENTE = [
  { value: 'activo',      label: 'Activo' },
  { value: 'suspendido',  label: 'Suspendido' },
  { value: 'terminado',   label: 'Terminado' },
  { value: 'archivado',   label: 'Archivado' },
];

// ── Prioridades ───────────────────────────────────────────────
export const PRIORIDADES = [
  { value: 'baja',    label: 'Baja' },
  { value: 'media',   label: 'Media' },
  { value: 'alta',    label: 'Alta' },
  { value: 'urgente', label: 'Urgente' },
];

// ── Roles de persona en expediente ───────────────────────────
export const ROLES_PERSONA = [
  { value: 'actor',              label: 'Actor / Demandante' },
  { value: 'demandado',          label: 'Demandado' },
  { value: 'tercero',            label: 'Tercero' },
  { value: 'perito',             label: 'Perito' },
  { value: 'abogado_propio',     label: 'Abogado propio' },
  { value: 'abogado_contrario',  label: 'Abogado contrario' },
  { value: 'juez',               label: 'Juez' },
  { value: 'fiscal',             label: 'Fiscal' },
  { value: 'defensor',           label: 'Defensor' },
];

// ── Tipos de movimiento ───────────────────────────────────────
export const TIPOS_MOVIMIENTO = [
  { value: 'presentacion',   label: 'Presentación' },
  { value: 'proveido',       label: 'Proveído' },
  { value: 'audiencia',      label: 'Audiencia' },
  { value: 'notificacion',   label: 'Notificación' },
  { value: 'actuacion',      label: 'Actuación' },
  { value: 'nota_interna',   label: 'Nota interna' },
];

// ── Tipos de documento (doc_tipo en personas) ─────────────────
export const DOC_TIPOS = [
  { value: 'DNI',       label: 'DNI' },
  { value: 'CUIT',      label: 'CUIT' },
  { value: 'CUIL',      label: 'CUIL' },
  { value: 'Pasaporte', label: 'Pasaporte' },
];

// ── Categorías AFIP ───────────────────────────────────────────
export const CATEGORIAS_AFIP = [
  { value: 'Responsable_Inscripto',    label: 'Responsable Inscripto (RI)' },
  { value: 'Monotributo_A',            label: 'Monotributo — Cat. A' },
  { value: 'Monotributo_B',            label: 'Monotributo — Cat. B' },
  { value: 'Monotributo_C',            label: 'Monotributo — Cat. C' },
  { value: 'Monotributo_D',            label: 'Monotributo — Cat. D' },
  { value: 'Monotributo_E',            label: 'Monotributo — Cat. E' },
  { value: 'Monotributo_F',            label: 'Monotributo — Cat. F' },
  { value: 'Monotributo_G',            label: 'Monotributo — Cat. G' },
  { value: 'Monotributo_H',            label: 'Monotributo — Cat. H' },
  { value: 'Monotributo_I',            label: 'Monotributo — Cat. I' },
  { value: 'Monotributo_J',            label: 'Monotributo — Cat. J' },
  { value: 'Monotributo_K',            label: 'Monotributo — Cat. K' },
  { value: 'Exento',                   label: 'Exento' },
  { value: 'Consumidor_Final',         label: 'Consumidor Final' },
  { value: 'Sujeto_No_Categorizado',   label: 'Sujeto No Categorizado' },
];

// ── Tipos de proceso de plazo ─────────────────────────────────
// (Usado en la calculadora de plazos — Fase 3)
export const TIPOS_PLAZO = [
  { value: 'dias_habiles_judiciales',      label: 'Días hábiles judiciales' },
  { value: 'dias_habiles_administrativos', label: 'Días hábiles administrativos' },
  { value: 'dias_corridos',                label: 'Días corridos' },
  { value: 'meses',                        label: 'Meses' },
  { value: 'anios',                        label: 'Años' },
];

// ── Índices económicos ────────────────────────────────────────
// (Para Fase 6 — Cuentas y liquidaciones)
export const TIPOS_INDICE = [
  { value: 'CER',              label: 'CER — Coeficiente de Estabilización de Referencia' },
  { value: 'UVA',              label: 'UVA — Unidad de Valor Adquisitivo' },
  { value: 'IPC_INDEC',        label: 'IPC — Índice de Precios al Consumidor (INDEC)' },
  { value: 'tasa_pasiva_BCRA', label: 'Tasa Pasiva BCRA' },
  { value: 'tasa_activa_BNA',  label: 'Tasa Activa Banco Nación' },
  { value: 'RIPTE',            label: 'RIPTE — Remuneraciones Imponibles Promedio' },
  { value: 'SMVM',             label: 'SMVM — Salario Mínimo Vital y Móvil' },
  { value: 'USD_oficial',      label: 'USD Oficial' },
  { value: 'USD_MEP',          label: 'USD MEP / Bolsa' },
  { value: 'USD_blue',         label: 'USD Blue (informal)' },
];

// ── Monedas ───────────────────────────────────────────────────
export const MONEDAS = [
  { value: 'ARS', label: 'Peso argentino (ARS)' },
  { value: 'USD', label: 'Dólar (USD)' },
  { value: 'EUR', label: 'Euro (EUR)' },
];

// ── Fase 6 — Rubros de cuenta corriente ──────────────────────
export const RUBROS_CUENTA = [
  { value: 'honorarios_pactados',  label: 'Honorarios pactados' },
  { value: 'honorarios_regulados', label: 'Honorarios regulados' },
  { value: 'gastos',               label: 'Gastos' },
  { value: 'tasa_justicia',        label: 'Tasa de justicia' },
  { value: 'peritos',              label: 'Peritos' },
  { value: 'anticipo',             label: 'Anticipo' },
  { value: 'otros',                label: 'Otros' },
];

// ── Fase 6 — Tipos de movimiento contable ────────────────────
export const TIPOS_CUENTA_MOV = [
  { value: 'credito', label: 'Ingreso' },
  { value: 'debito',  label: 'Egreso' },
];

// ── Helper: convertir lista a opciones de <select> ────────────
/**
 * Filtra un catálogo y devuelve sólo los valores como array de strings.
 * Útil para validaciones Zod: z.enum(valoresDe(FUEROS))
 * @param {Array<{value:string, label:string}>} catalogo
 * @returns {string[]}
 */
export function valoresDe(catalogo) {
  return catalogo.map((item) => item.value);
}
