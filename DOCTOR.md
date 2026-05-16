# DOCTOR.md — Especificación del módulo de gestión jurídica

> **Este archivo es la fuente de verdad del módulo Doctor.**
> Claude Code debe leer este archivo al inicio de CADA sesión que toque el módulo.
> Cualquier desviación de este spec requiere aprobación explícita del usuario.

---

## 0. Resumen ejecutivo

**Doctor** es el módulo del CRM dedicado a la gestión jurídica integral para abogados y estudios jurídicos en Argentina. Reemplaza herramientas legacy como Lex-Doctor con una experiencia web nativa, IA integrada (Claude), procuración automática de tribunales argentinos, y facturación electrónica AFIP nativa.

**Diferenciador clave (MVP):** **Doctor IA** — un asistente con contexto del expediente, no un addon, no un wrapper de ChatGPT.

**Ubicación en la UI:** segundo ícono del sidebar, después del Dashboard general. Ícono: `Scale` o `Gavel` (lucide-react). Label: `Doctor`.

---

## 1. Mercado primario: Argentina

### 1.1 Jurisdicciones soportadas (orden de prioridad)

| Prioridad | Jurisdicción | Sistema judicial |
|---|---|---|
| 1 | PJN (Poder Judicial de la Nación) | Lex100, MEV, PJN.gov.ar |
| 2 | SCBA (Provincia de Buenos Aires) | MEV PBA |
| 3 | CABA | Sistema CABA |
| 4 | Resto provincial (Córdoba, Santa Fe, Mendoza, Neuquén, Río Negro) | Variable |

### 1.2 Fueros

`Civil`, `Comercial`, `Laboral`, `Penal`, `Familia`, `Contencioso Administrativo`, `Concursal`, `Previsional`, `Tributario` — federal y provincial. Almacenar como enum + jurisdicción.

### 1.3 Tipos de proceso (catálogo inicial)

`ordinario`, `sumario`, `sumarísimo`, `ejecutivo`, `ejecución_de_sentencia`, `ejecución_hipotecaria`, `ejecución_prendaria`, `amparo`, `habeas_corpus`, `habeas_data`, `sucesorio_ab_intestato`, `sucesorio_testamentario`, `voluntario`, `mediación_prejudicial`, `mediación_familiar`, `concurso_preventivo`, `quiebra`, `divorcio`, `alimentos`, `tenencia`, `régimen_comunicación`, `accidente_de_trabajo`, `accidente_de_tránsito`, `despido`, `daños_y_perjuicios`. Catálogo extensible.

### 1.4 Plazos y feriados

- **Tipos de plazo:** `días_hábiles_judiciales`, `días_hábiles_administrativos`, `días_corridos`, `meses`, `años`.
- **Feria judicial enero:** del 1 al último día hábil de enero (varía por jurisdicción y año, configurable).
- **Feria judicial invierno:** ~2 semanas en julio (configurable por año).
- **Feriados nacionales:** API o tabla `feriados_argentina` con campos `fecha`, `motivo`, `tipo` (nacional/provincial), `jurisdiccion`.
- **Calculadora de plazos:** input fecha inicio + cantidad + tipo → output fecha vencimiento + lista de días excluidos + razonamiento textual ("vence el 14/03 porque excluyo: 8/3 sábado, 9/3 domingo, 10/3 feriado nacional Día de la Memoria, 11-12/3 feria judicial...").

### 1.5 Índices económicos (para liquidaciones)

Tabla `indices_economicos` con actualización programada (cron diaria):
- `CER` (Coeficiente Estabilización Referencia)
- `UVA` (Unidad de Valor Adquisitivo)
- `IPC_INDEC` (mensual)
- `tasa_pasiva_BCRA`
- `tasa_activa_Banco_Nacion`
- `RIPTE` (accidentes de trabajo)
- `SMVM` (Salario Mínimo Vital y Móvil)
- Tipo de cambio: `USD_oficial`, `USD_MEP`, `USD_blue`

Fuentes: scraping de BCRA, INDEC, AFIP. Modelar como interfaz `IndiceProvider` para permitir múltiples fuentes.

### 1.6 Documentación fiscal e identidad

- **CUIT** (11 dígitos, persona jurídica + monotributo + RI). Validación con dígito verificador algoritmo módulo 11.
- **CUIL** (11 dígitos, trabajadores).
- **DNI** (7-8 dígitos, consumidor final).
- **Pasaporte** (extranjeros).
- Categorías AFIP: `Responsable_Inscripto`, `Monotributo_A` ... `Monotributo_K`, `Exento`, `Consumidor_Final`, `Sujeto_No_Categorizado`.

### 1.7 Facturación electrónica AFIP

- Autenticación: WSAA (Web Service de Autenticación y Autorización) con certificado X.509.
- Emisión: WSFE (Web Service de Factura Electrónica).
- Tipos de comprobantes (códigos AFIP):
  - `01` Factura A
  - `06` Factura B
  - `11` Factura C (Monotributo)
  - `03` Nota de Crédito A
  - `08` Nota de Crédito B
  - `13` Nota de Crédito C
- CAE (Código de Autorización Electrónico) obligatorio antes de imprimir/enviar.
- Modos: `homologacion` (testing) y `produccion`. Switcheable por env var.
- Para v1: dejar interfaz `FacturaEmisor` lista, implementación con biblioteca como `afip.js` o `arca-sdk` después.

---

## 2. Doctor IA — el diferenciador (PRIORIDAD MÁXIMA)

### 2.1 Filosofía
Doctor IA NO es un chatbot que escribe demandas solo. Es un asistente que opera con contexto del expediente actual, ayuda al abogado a trabajar más rápido, y siempre marca su output como borrador. **El abogado decide, la IA asiste.**

### 2.2 Ubicación en la UI
- **Panel lateral colapsable** disponible desde cualquier vista del módulo Doctor (atajo `Cmd/Ctrl + I`).
- **Página dedicada** `/doctor/ia` con chat de pantalla completa, historial por expediente.
- Cuando el usuario está dentro de un expediente, Doctor IA tiene auto-cargado el contexto: carátula, partes, etapa, últimos 20 movimientos, documentos vinculados.

### 2.3 Capacidades v1 (MVP)

| # | Capacidad | Input | Output | Modelo Claude |
|---|---|---|---|---|
| 1 | Resumir expediente | expediente_id | brief 5-7 líneas + próximos pasos sugeridos | `claude-haiku-4-5-20251001` |
| 2 | Redactar borrador | tipo_escrito + plantilla + expediente_id | documento Word/markdown editable | `claude-opus-4-7` |
| 3 | Analizar PDF | PDF subido + opcional expediente_id | resumen, partes, hechos, plazos detectados, riesgos | `claude-opus-4-7` |
| 4 | Calcular plazo con razonamiento | fecha_inicio + cantidad + tipo + jurisdicción | fecha_vencimiento + días_excluidos + explicación | `claude-haiku-4-5-20251001` |
| 5 | Búsqueda inteligente en biblioteca | query natural | top-N fallos/leyes con justificación | `claude-haiku-4-5-20251001` |
| 6 | Chat por expediente | mensaje | respuesta contextualizada al caso | `claude-opus-4-7` |

### 2.4 Capacidades v2 (post-MVP)
- Detección automática de vencimientos al ingresar un nuevo movimiento (parsea proveído, sugiere agenda).
- Recomendación de jurisprudencia similar al expediente activo.
- Asistente de mediación (resume posturas, propone redacciones de convenio).
- Análisis de probabilidad de éxito basado en histórico de fallos.

### 2.5 Implementación técnica de IA

**Endpoint:** `https://api.anthropic.com/v1/messages`

**Modelos:**
- `claude-opus-4-7` — tareas críticas: redacción de escritos, análisis profundo de PDFs, chat con razonamiento jurídico.
- `claude-haiku-4-5-20251001` — tareas rápidas: resúmenes cortos, búsqueda, cálculos.

**Seguridad:**
- API key en env var `ANTHROPIC_API_KEY` solo del lado servidor.
- NUNCA exponer en cliente. Toda llamada a la API pasa por endpoint propio del backend.
- El backend valida que el usuario tenga acceso al expediente antes de inyectar contexto.

**Streaming:** usar Server-Sent Events o streaming nativo en el chat. UX responsiva.

**System prompt base** (para todas las capacidades):
```
Sos Doctor IA, asistente jurídico para abogados argentinos. Reglas inviolables:
1. Hablás en español rioplatense, formal pero claro.
2. Citás siempre el código aplicable (CCyC, CPCN, CPCC PBA, LCT, etc.) cuando hagas afirmaciones legales.
3. Marcás todo borrador con "[BORRADOR-IA — REVISAR ANTES DE PRESENTAR]" al inicio.
4. Si te falta data del expediente, pedila explícitamente, no inventes.
5. Si la consulta excede tu capacidad (ej. estrategia procesal compleja), recomendá consulta con un colega especialista.
6. Nunca des certezas absolutas sobre resultados judiciales; usá lenguaje probabilístico.
```

**Auditoría:** tabla `doctor_ia_interactions` con campos:
- `id, user_id, expediente_id?, capacidad, input_tokens, output_tokens, model, latency_ms, created_at, prompt_full, response_full`

**Rate limiting:**
- Default: 100 req/día por usuario.
- Configurable por plan del CRM.
- Throttle en backend con Redis o equivalente.

**Costos:**
- Mostrar al admin del CRM dashboard mensual de uso de IA por usuario y capacidad.

### 2.6 Disclaimers obligatorios
- Cada output de IA arriba: `[BORRADOR-IA — REVISAR ANTES DE PRESENTAR]`.
- Footer en el panel de IA: "Esta herramienta es un asistente. La responsabilidad profesional es del abogado matriculado."
- Para PDFs analizados: nunca eliminar el PDF original; el resumen es complementario.

---

## 3. Arquitectura de módulos

### 3.1 Estructura de archivos (adaptar al stack del CRM tras Fase 0)

```
/doctor
├── /pages          → vistas principales (cada submódulo)
├── /components     → componentes específicos del módulo
├── /hooks          → useExpediente, useAgenda, useDoctorIA...
├── /api            → endpoints / data fetching
├── /db             → schemas/migrations de las tablas nuevas
├── /lib
│   ├── plazos.ts   → calculadora de plazos
│   ├── cuit.ts     → validación CUIT/CUIL/DNI
│   ├── indices.ts  → fetch de índices económicos
│   ├── ai/
│   │   ├── client.ts       → cliente Claude API
│   │   ├── prompts.ts      → prompts del sistema por capacidad
│   │   └── streaming.ts    → manejo de streaming
│   └── procuracion/        → conectores judiciales (PJN, SCBA, etc.)
└── /types          → TypeScript types o equivalente
```

### 3.2 Submódulos del sidebar interno de Doctor

1. **📁 Expedientes** — CRUD completo con vistas lista/kanban
2. **📅 Agenda** — calendario con audiencias/vencimientos/tareas
3. **👥 Personas** — clientes, oponentes, peritos, jueces, juzgados
4. **📄 Escritos** — editor + plantillas con variables
5. **💰 Cuentas** — cuenta corriente, liquidaciones, facturación AFIP
6. **🤖 Doctor IA** — chat dedicado + dashboard de uso
7. **⚖️ Procuración** — auto-pull de movimientos desde PJN/MEV
8. **📚 Biblioteca** — fallos, leyes, modelos
9. **🔔 Bandeja** — alertas, tareas, notificaciones
10. **⚙️ Config** — roles, plantillas, integraciones, AFIP

---

## 4. Base de datos — esquema starter

> Adaptar al ORM del CRM (Prisma/Drizzle/Sequelize/TypeORM/etc.). Mantener convenciones de naming del CRM existente.

### Tablas core (Fase 1)

```sql
-- expedientes
expedientes (
  id PK,
  organizacion_id FK,
  caratula TEXT NOT NULL,
  tipo_proceso ENUM,
  num_carpeta_interna TEXT,
  num_expediente_judicial TEXT,
  juzgado_id FK,
  fuero ENUM,
  jurisdiccion ENUM,
  etapa ENUM, -- inicial, prueba, alegatos, sentencia, ejecucion, archivado
  estado ENUM, -- activo, suspendido, terminado, archivado
  prioridad ENUM, -- baja, media, alta, urgente
  responsable_id FK users,
  observaciones TEXT,
  monto_reclamado DECIMAL,
  moneda VARCHAR(3),
  created_at, updated_at, archived_at
)

-- personas (clientes, oponentes, peritos, abogados, jueces)
personas (
  id PK,
  organizacion_id FK,
  tipo ENUM, -- fisica, juridica
  nombre TEXT,
  apellido TEXT,
  razon_social TEXT,
  doc_tipo ENUM, -- DNI, CUIT, CUIL, Pasaporte
  doc_numero TEXT,
  cuit_validado BOOLEAN, -- resultado de validación módulo 11
  categoria_afip ENUM,
  email TEXT,
  telefono TEXT,
  direccion JSONB, -- calle, numero, piso, depto, localidad, provincia, cp
  tags TEXT[],
  notas TEXT,
  created_at, updated_at
)

-- relación N:N expediente <-> persona con rol
expediente_personas (
  expediente_id FK,
  persona_id FK,
  rol ENUM, -- actor, demandado, tercero, perito, abogado_propio, abogado_contrario, juez, fiscal, defensor
  porcentaje DECIMAL, -- % de honorarios si es cliente
  PRIMARY KEY (expediente_id, persona_id, rol)
)

-- movimientos del expediente (timeline)
movimientos (
  id PK,
  expediente_id FK,
  fecha DATE NOT NULL,
  tipo ENUM, -- presentación, proveído, audiencia, notificación, actuación, nota_interna
  descripcion TEXT,
  responsable_id FK users,
  proveido_pdf_url TEXT,
  source ENUM, -- manual, scraping_pjn, scraping_scba, importado
  metadata JSONB, -- datos del scraper, hash del PDF, etc.
  created_at
)

-- agenda
agenda_eventos (
  id PK,
  organizacion_id FK,
  expediente_id FK NULLABLE,
  persona_id FK NULLABLE,
  tipo ENUM, -- audiencia, vencimiento, reunion, tarea, recordatorio
  titulo TEXT,
  descripcion TEXT,
  fecha_inicio TIMESTAMP,
  fecha_fin TIMESTAMP,
  todo_el_dia BOOLEAN,
  ubicacion TEXT,
  recordatorios JSONB, -- [{tipo: 'push', minutos_antes: 1440}, ...]
  asignados_ids UUID[],
  estado ENUM, -- pendiente, completado, cancelado, vencido
  created_at, updated_at
)

-- documentos
documentos (
  id PK,
  expediente_id FK,
  plantilla_id FK NULLABLE,
  titulo TEXT,
  contenido TEXT, -- markdown o JSON del editor
  contenido_html TEXT, -- render para preview
  version INT,
  autor_id FK users,
  estado ENUM, -- borrador, revision, final, presentado
  generado_por_ia BOOLEAN,
  ia_interaction_id FK NULLABLE,
  created_at, updated_at
)

documentos_versiones (
  id PK,
  documento_id FK,
  version INT,
  contenido TEXT,
  autor_id FK users,
  comentario TEXT,
  created_at
)

-- plantillas
plantillas (
  id PK,
  organizacion_id FK,
  categoria ENUM, -- demanda, contestacion, cedula, oficio, mandamiento, recurso, carta_documento, telegrama, convenio, acuerdo, nota
  titulo TEXT,
  descripcion TEXT,
  contenido_con_variables TEXT, -- usa {{expediente.caratula}}, {{actor.nombre}}, etc.
  variables_requeridas TEXT[],
  fuero_aplicable ENUM[],
  publica BOOLEAN, -- compartida con otras orgs
  created_at, updated_at
)

-- cuentas y movimientos contables
cuentas_movimientos (
  id PK,
  organizacion_id FK,
  expediente_id FK NULLABLE,
  persona_id FK NULLABLE,
  rubro ENUM, -- honorarios_pactados, honorarios_regulados, gastos, tasa_justicia, peritos, anticipo, otros
  descripcion TEXT,
  monto DECIMAL,
  moneda VARCHAR(3),
  tipo_cambio DECIMAL,
  fecha DATE,
  tipo ENUM, -- debito, credito
  facturado BOOLEAN,
  factura_id FK NULLABLE,
  created_at
)

-- Doctor IA — auditoría
doctor_ia_interactions (
  id PK,
  user_id FK,
  organizacion_id FK,
  expediente_id FK NULLABLE,
  capacidad ENUM, -- resumir_expediente, redactar_borrador, analizar_pdf, calcular_plazo, buscar_biblioteca, chat
  model VARCHAR, -- claude-opus-4-7, claude-haiku-4-5-20251001
  prompt_full TEXT,
  response_full TEXT,
  input_tokens INT,
  output_tokens INT,
  latency_ms INT,
  cost_usd DECIMAL,
  created_at
)

-- Procuración — credenciales encriptadas
procuracion_credenciales (
  id PK,
  organizacion_id FK,
  jurisdiccion ENUM,
  usuario_encrypted BYTEA,
  password_encrypted BYTEA,
  ultima_sincronizacion TIMESTAMP,
  estado ENUM, -- activo, error, deshabilitado
  created_at, updated_at
)

-- Índices económicos
indices_economicos (
  id PK,
  tipo ENUM, -- CER, UVA, IPC, tasa_pasiva_BCRA, tasa_activa_BNA, RIPTE, SMVM, USD_oficial, USD_MEP, USD_blue
  fecha DATE,
  valor DECIMAL,
  fuente VARCHAR,
  created_at,
  UNIQUE(tipo, fecha)
)

-- Feriados
feriados_argentina (
  id PK,
  fecha DATE,
  motivo TEXT,
  tipo ENUM, -- nacional, provincial, judicial, feria_judicial
  jurisdiccion ENUM, -- nacional, PBA, CABA, etc.
  UNIQUE(fecha, jurisdiccion)
)
```

**Encriptación obligatoria:**
- `procuracion_credenciales.usuario_encrypted` y `password_encrypted` → AES-256 con key del CRM (KMS si existe).
- Si existe sistema de encriptación en el CRM, reusarlo. NO inventar uno nuevo.

---

## 5. Implementación por fases

> **Regla de oro:** al final de cada fase, mostrar al usuario qué se hizo, qué decisiones se tomaron y por qué, antes de avanzar a la siguiente.

### Fase 0 — Discovery (lectura del CRM existente)
- Inspeccionar estructura del repo, identificar stack, sistema de auth, sistema de DB, sistema de UI components, i18n, sistema de routing, sistema de permisos.
- Reportar hallazgos en formato tabla.
- **No escribir código.** Esperar aprobación del usuario para Fase 1.

### Fase 1 — Estructura base + Expedientes
- Routing del módulo + entrada en sidebar (segundo ícono).
- Layout con sub-navegación.
- Submódulo Expedientes: CRUD, vistas lista/kanban, filtros, ficha completa con pestañas (Datos, Movimientos, Documentos, Plazos, Notas).
- Migración DB: `expedientes`, `personas`, `expediente_personas`, `movimientos`.
- Validación CUIT con dígito verificador (`/lib/cuit.ts`).
- **Criterio de aceptación:** se puede crear un expediente, asociarle partes, registrar 3 movimientos, y verlo todo en la vista detalle.

### Fase 2 — Doctor IA básico (capacidades 1, 4, 6)
- Endpoint backend `/api/doctor/ai/chat` con streaming.
- Cliente Claude API con `claude-opus-4-7` y `claude-haiku-4-5-20251001`.
- System prompts en `/lib/ai/prompts.ts`.
- Panel lateral en UI (`Cmd/Ctrl + I`).
- Capacidades: resumir expediente, calcular plazos, chat por expediente.
- Tabla `doctor_ia_interactions` para auditoría.
- **Criterio de aceptación:** abrir un expediente, presionar `Cmd+I`, pedir "resumime este expediente" → respuesta en streaming en <3s con disclaimer correcto.

### Fase 3 — Agenda y calculadora de plazos
- Calendario (mes/semana/día/agenda).
- Eventos vinculables a expediente y/o persona.
- `/lib/plazos.ts` con calculadora robusta + tabla `feriados_argentina` precargada (al menos 2 años).
- Integración con Doctor IA: capacidad #4 enriquecida.
- **Criterio de aceptación:** pedir "tengo 5 días hábiles para apelar desde el 12/03/2026" → devuelve fecha + razonamiento detallado.

### Fase 4 — Personas y Doctor IA capacidad #3 (analizar PDF)
- CRUD de personas con tipos múltiples.
- Vista 360° de cada persona.
- Endpoint `/api/doctor/ai/analyze-pdf` con upload, parsing y análisis vía Claude (con vision si aplica).
- **Criterio de aceptación:** subir PDF de proveído → IA extrae partes, plazos, próximos pasos.

### Fase 5 — Escritos + plantillas + Doctor IA capacidad #2
- Editor rich-text (reusar el del CRM si existe; si no, TipTap o Lexical).
- Sistema de plantillas con variables `{{expediente.X}}`, `{{actor.X}}`, etc.
- Generación seriada (un escrito para N expedientes).
- Capacidad IA: redactar borrador desde plantilla + datos.
- Versionado en `documentos_versiones`.
- **Criterio de aceptación:** seleccionar 5 expedientes, aplicar plantilla "cédula", IA personaliza cada uno, exportar a PDF.

### Fase 6 — Cuentas, liquidaciones, índices, AFIP (interfaz)
- Cuenta corriente por cliente y por expediente.
- Liquidaciones con índices económicos.
- Tabla `indices_economicos` + cron de actualización.
- Multi-moneda con conversión.
- **Interfaz** `FacturaEmisor` lista para integrar AFIP (implementación real en fase posterior).

### Fase 7 — Procuración PJN
- Conector PJN: scraper o API que ingresa con credenciales del estudio, descarga movimientos nuevos, sube PDFs y los carga al expediente correspondiente.
- Encriptación de credenciales en `procuracion_credenciales`.
- Job programable (diario o cada N horas).
- Matching por `num_expediente_judicial`.
- **Criterio de aceptación:** configurar credenciales PJN, correr job, ver movimientos nuevos cargados.

### Fase 8 — Biblioteca + IA capacidad #5
- DB de fallos/leyes con full-text search.
- Búsqueda inteligente vía Claude (RAG simple).
- Marcadores y notas por documento.

### Fase 9 — Bandeja + tareas + notificaciones
- Inbox unificado.
- Sistema de tareas asignables.
- Notificaciones push, email, in-app.

### Fase 10 — Configuración + roles + integraciones
- Roles: Admin, Abogado Senior, Junior, Procurador, Secretaria, Cliente.
- Permisos granulares.
- Integraciones: Gmail, Outlook, Drive, Dropbox, WhatsApp Business, Mercado Pago.

---

## 6. Reglas de oro (NO-GO ZONES)

1. **No tocar nada fuera del módulo `/doctor`.** Cero refactor del CRM existente sin aprobación explícita.
2. **No copiar código de Lex-Doctor.** Es propietario, ilegal, y no tiene sentido — esto es una reimaginación, no una clonación.
3. **No exponer `ANTHROPIC_API_KEY` en cliente.** Toda llamada a Claude pasa por backend.
4. **No guardar credenciales de procuración sin encriptar.**
5. **No tomar decisiones legales por el usuario.** Todo output de IA es borrador.
6. **No inventar dependencias pesadas.** Si el CRM ya tiene una librería para algo (UI, forms, validación), reusarla.
7. **No saltar fases.** Cada fase tiene su criterio de aceptación. Sin aprobación, no se avanza.
8. **No asumir el stack.** Tras Fase 0, el stack está confirmado. Cualquier cambio se justifica.
9. **No crear sistemas paralelos.** Auth, permisos, DB, i18n, UI: usar lo que el CRM ya tiene.
10. **Dudas → preguntar.** Mejor pausa que decisión silenciosa.

---

## 7. Estilo de código

- Seguir las convenciones del CRM existente (naming, formatting, file structure).
- Tests: si el CRM tiene framework de testing, agregar tests al menos para `/lib/cuit.ts`, `/lib/plazos.ts`, validadores de formularios.
- Comentarios en español, código en inglés (si el CRM ya hace eso) o consistente con el repo.
- Commits atómicos por fase, mensajes descriptivos en imperativo: "agrega CRUD de expedientes", "implementa calculadora de plazos".

---

## 8. Out of scope (explícito)

- ❌ Multi-país desde día 1. Argentina primero. La arquitectura debe permitir extender (interfaces de jurisdicción, índices, tribunales), pero la implementación inicial es 100% AR.
- ❌ Mobile app nativa. La web responsive cubre v1.
- ❌ E-firma. Interfaz lista, integración después.
- ❌ Marketing/SEO público. Esto es el módulo interno del CRM.

---

## 9. Stack (a completar tras Fase 0)

| Aspecto | Valor |
|---|---|
| Framework | _por descubrir_ |
| Lenguaje | _por descubrir_ |
| ORM | _por descubrir_ |
| DB | _por descubrir_ |
| Auth | _por descubrir_ |
| UI components | _por descubrir_ |
| Routing | _por descubrir_ |
| Estado | _por descubrir_ |
| Test framework | _por descubrir_ |

---

_Última actualización: definición inicial — 2026-05-09_
