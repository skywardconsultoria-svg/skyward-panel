/**
 * modules/Doctor.jsx — Módulo de gestión jurídica
 * Fase 1: Expedientes CRUD (lista/kanban, detalle, personas, movimientos)
 * Fase 2: Doctor IA — panel lateral + página dedicada + streaming SSE
 * Fuente de verdad: DOCTOR.md
 *
 * cliente_id se pasa explícitamente en cada request (patrón del CRM,
 * igual que POST /api/pacientes). No se usa req.user.cliente_id en backend.
 */
import React, { useState, useEffect, useCallback, useRef } from "react";
import { API, jH, aH } from "../utils/api";
import { validarCUIT, validarDNI, formatCUIT } from "../lib/cuit";
import { calcularPlazo } from "../lib/plazos";
import { marked } from "marked";
import {
  FUEROS, JURISDICCIONES, TIPOS_PROCESO, ETAPAS_EXPEDIENTE,
  ESTADOS_EXPEDIENTE, PRIORIDADES, ROLES_PERSONA, TIPOS_MOVIMIENTO,
  DOC_TIPOS, CATEGORIAS_AFIP, MONEDAS,
} from "../lib/catalogos";

// ── Helpers ───────────────────────────────────────────────────

function labelDe(catalogo, val) {
  return catalogo.find((x) => x.value === val)?.label ?? val ?? "—";
}

function fmtFecha(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function Spinner({ C }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
      <div style={{ width: 28, height: 28, border: `2px solid ${C.border}`, borderTop: `2px solid ${C.accent}`, borderRadius: "50%", animation: "spin .8s linear infinite" }} />
    </div>
  );
}

function EmptyState({ C, icon, title, sub }) {
  return (
    <div style={{ textAlign: "center", padding: "60px 20px", color: C.muted }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 4 }}>{title}</div>
      {sub && <div style={{ fontSize: 12 }}>{sub}</div>}
    </div>
  );
}

function Placeholder({ C, fase }) {
  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", padding: 40 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🚧</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 8 }}>Próximamente</div>
        <div style={{ fontSize: 13, color: C.muted }}>Disponible en {fase}</div>
      </div>
    </div>
  );
}

const ETAPA_COLOR = {
  inicial: "#6366f1", prueba: "#f59e0b", alegatos: "#8b5cf6",
  sentencia: "#3b82f6", ejecucion: "#10b981", archivado: "#6b7280",
};
const ESTADO_COLOR = {
  activo: "#10b981", suspendido: "#f59e0b", terminado: "#6366f1", archivado: "#6b7280",
};
const PRIORIDAD_COLOR = {
  baja: "#6b7280", media: "#3b82f6", alta: "#f59e0b", urgente: "#ef4444",
};

function Chip({ label, color }) {
  return (
    <span style={{
      display: "inline-block", padding: "2px 8px", borderRadius: 99,
      fontSize: 11, fontWeight: 600, letterSpacing: ".3px",
      background: `${color}22`, color, border: `1px solid ${color}44`,
    }}>
      {label}
    </span>
  );
}

// ── Input / Select helpers ────────────────────────────────────

function Field({ C, label, required, children }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 11, color: C.muted, marginBottom: 4, fontWeight: 500 }}>
        {label}{required && <span style={{ color: C.accent }}> *</span>}
      </label>
      {children}
    </div>
  );
}

const inputSt = (C) => ({
  width: "100%", padding: "8px 10px", background: C.bg,
  border: `1px solid ${C.border}`, borderRadius: 8, color: C.text,
  fontSize: 13, fontFamily: "inherit", boxSizing: "border-box",
});

function Input({ C, ...props }) {
  return <input style={inputSt(C)} {...props} />;
}

function Sel({ C, options, ...props }) {
  return (
    <select style={inputSt(C)} {...props}>
      <option value="">— seleccionar —</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

function Btn({ C, variant = "primary", style = {}, ...props }) {
  const base = {
    padding: "8px 16px", borderRadius: 8, border: "none",
    cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "inherit",
    transition: "opacity .15s",
  };
  const styles = {
    primary: { background: C.accent, color: "white" },
    ghost:   { background: "transparent", color: C.muted, border: `1px solid ${C.border}` },
    danger:  { background: "#ef444420", color: "#ef4444", border: "1px solid #ef444440" },
  };
  return <button style={{ ...base, ...styles[variant], ...style }} {...props} />;
}

// ── Formulario: Persona inline (para añadir al expediente) ───────────────────────────────────

function PersonaFormInline({ C, clienteId, onSave, onCancel }) {
  const [f, setF] = useState({ tipo: "fisica", nombre: "", apellido: "", razon_social: "", doc_tipo: "DNI", doc_numero: "", cuit_validado: false, email: "", telefono: "", notas: "" });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const validarDoc = () => {
    if (!f.doc_numero) return { valido: true };
    if (f.doc_tipo === "DNI") return validarDNI(f.doc_numero);
    if (f.doc_tipo === "CUIT" || f.doc_tipo === "CUIL") return validarCUIT(f.doc_numero);
    return { valido: true };
  };

  const handleSave = async () => {
    if (f.tipo === "fisica" && !f.nombre) return setErr("El nombre es obligatorio");
    if (f.tipo === "juridica" && !f.razon_social) return setErr("La razón social es obligatoria");

    const docCheck = validarDoc();
    if (!docCheck.valido) return setErr(docCheck.mensaje);

    setLoading(true);
    try {
      const payload = { ...f, cliente_id: clienteId, cuit_validado: docCheck.valido };
      if (f.doc_tipo === "CUIT" || f.doc_tipo === "CUIL") {
        payload.doc_numero = formatCUIT(f.doc_numero);
      }
      const res = await fetch(`${API}/api/doctor/personas`, { method: "POST", headers: jH(), body: JSON.stringify(payload) });
      if (!res.ok) throw new Error((await res.json()).error);
      const data = await res.json();
      onSave(data);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, marginTop: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, color: C.text }}>Nueva persona</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field C={C} label="Tipo">
          <Sel C={C} value={f.tipo} onChange={(e) => set("tipo", e.target.value)} options={[{ value: "fisica", label: "Persona física" }, { value: "juridica", label: "Persona jurídica" }]} />
        </Field>
        {f.tipo === "fisica" ? (
          <>
            <Field C={C} label="Nombre" required><Input C={C} value={f.nombre} onChange={(e) => set("nombre", e.target.value)} /></Field>
            <Field C={C} label="Apellido"><Input C={C} value={f.apellido} onChange={(e) => set("apellido", e.target.value)} /></Field>
          </>
        ) : (
          <Field C={C} label="Razón social" required style={{ gridColumn: "span 2" }}>
            <Input C={C} value={f.razon_social} onChange={(e) => set("razon_social", e.target.value)} />
          </Field>
        )}
        <Field C={C} label="Tipo documento">
          <Sel C={C} value={f.doc_tipo} onChange={(e) => set("doc_tipo", e.target.value)} options={DOC_TIPOS} />
        </Field>
        <Field C={C} label="Número documento">
          <Input C={C} value={f.doc_numero} onChange={(e) => set("doc_numero", e.target.value)} placeholder={f.doc_tipo === "DNI" ? "12345678" : "20-12345678-9"} />
        </Field>
        <Field C={C} label="Email"><Input C={C} type="email" value={f.email} onChange={(e) => set("email", e.target.value)} /></Field>
        <Field C={C} label="Teléfono"><Input C={C} value={f.telefono} onChange={(e) => set("telefono", e.target.value)} /></Field>
      </div>
      {err && <div style={{ color: "#ef4444", fontSize: 12, marginTop: 8 }}>{err}</div>}
      <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
        <Btn C={C} variant="ghost" onClick={onCancel}>Cancelar</Btn>
        <Btn C={C} onClick={handleSave} disabled={loading}>{loading ? "Guardando…" : "Crear persona"}</Btn>
      </div>
    </div>
  );
}

// ── Personas del expediente ───────────────────────────────────

function PersonasTab({ C, clienteId, expedienteId }) {
  const [personas, setPersonas] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState([]);
  const [rolSel, setRolSel] = useState("");
  const [personaSel, setPersonaSel] = useState(null);
  const [showNueva, setShowNueva] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/doctor/expedientes/${expedienteId}/personas?cliente_id=${clienteId}`, { headers: aH() });
      if (r.ok) setPersonas(await r.json());
    } catch (e) { /* silenciar */ } finally { setLoading(false); }
  }, [expedienteId, clienteId]);

  useEffect(() => { load(); }, [load]);

  const buscar = async (q) => {
    setBusqueda(q);
    if (q.length < 2) { setResultados([]); return; }
    const r = await fetch(`${API}/api/doctor/personas?cliente_id=${clienteId}&q=${encodeURIComponent(q)}`, { headers: aH() });
    if (r.ok) setResultados(await r.json());
  };

  const asociar = async () => {
    if (!personaSel || !rolSel) return setErr("Seleccioná una persona y un rol");
    setErr("");
    const r = await fetch(`${API}/api/doctor/expedientes/${expedienteId}/personas`, {
      method: "POST", headers: jH(),
      body: JSON.stringify({ cliente_id: clienteId, persona_id: personaSel.id, rol: rolSel }),
    });
    if (r.ok) { setPersonaSel(null); setBusqueda(""); setResultados([]); setRolSel(""); load(); }
    else { const d = await r.json(); setErr(d.error); }
  };

  const desasociar = async (personaId, rol) => {
    await fetch(`${API}/api/doctor/expedientes/${expedienteId}/personas/${personaId}/${rol}?cliente_id=${clienteId}`, { method: "DELETE", headers: aH() });
    load();
  };

  const onPersonaCreada = (p) => { setPersonaSel(p); setShowNueva(false); setBusqueda(`${p.nombre || ""} ${p.apellido || p.razon_social || ""}`.trim()); };

  if (loading) return <Spinner C={C} />;

  return (
    <div>
      {/* Personas existentes */}
      {personas.length === 0
        ? <EmptyState C={C} icon="👥" title="Sin partes asociadas" sub="Asociá actores, demandados, peritos u otros intervinientes." />
        : (
          <div style={{ marginBottom: 24 }}>
            {personas.map((p) => (
              <div key={`${p.id}-${p.rol}`} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
                    {p.tipo === "juridica" ? p.razon_social : `${p.nombre || ""} ${p.apellido || ""}`.trim() || "—"}
                  </div>
                  {p.doc_numero && <div style={{ fontSize: 11, color: C.muted }}>{p.doc_tipo}: {p.doc_numero}</div>}
                </div>
                <Chip label={labelDe(ROLES_PERSONA, p.rol)} color="#6366f1" />
                <button onClick={() => desasociar(p.id, p.rol)} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: 16, padding: 4 }} title="Desasociar">✕</button>
              </div>
            ))}
          </div>
        )
      }

      {/* Agregar persona */}
      <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 12 }}>Asociar persona</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, alignItems: "end", marginBottom: 8 }}>
        <Field C={C} label="Buscar persona (nombre, apellido, doc)">
          <Input C={C} value={busqueda} onChange={(e) => buscar(e.target.value)} placeholder="Ej: García" />
        </Field>
        <Field C={C} label="Rol en el expediente">
          <Sel C={C} value={rolSel} onChange={(e) => setRolSel(e.target.value)} options={ROLES_PERSONA} />
        </Field>
        <Btn C={C} onClick={asociar} style={{ height: 37 }}>Asociar</Btn>
      </div>

      {/* Resultados de búsqueda */}
      {resultados.length > 0 && (
        <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, marginBottom: 8, maxHeight: 180, overflowY: "auto" }}>
          {resultados.map((p) => {
            const label = p.tipo === "juridica" ? p.razon_social : `${p.nombre || ""} ${p.apellido || ""}`.trim();
            const sel = personaSel?.id === p.id;
            return (
              <div key={p.id} onClick={() => { setPersonaSel(p); setBusqueda(label); setResultados([]); }}
                style={{ padding: "8px 12px", cursor: "pointer", background: sel ? C.accentGlow : "transparent",
                  borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
                {label} {p.doc_numero && <span style={{ color: C.muted, fontSize: 11 }}>— {p.doc_tipo}: {p.doc_numero}</span>}
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button onClick={() => setShowNueva(!showNueva)}
          style={{ fontSize: 12, color: C.accent, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
          {showNueva ? "▲ Cancelar nueva persona" : "+ Crear persona nueva inline"}
        </button>
      </div>

      {showNueva && <PersonaFormInline C={C} clienteId={clienteId} onSave={onPersonaCreada} onCancel={() => setShowNueva(false)} />}
      {err && <div style={{ color: "#ef4444", fontSize: 12, marginTop: 8 }}>{err}</div>}
    </div>
  );
}

// ── Movimientos ───────────────────────────────────────────────

function MovimientosTab({ C, clienteId, expedienteId }) {
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [f, setF] = useState({ fecha: "", tipo: "", descripcion: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/doctor/expedientes/${expedienteId}/movimientos?cliente_id=${clienteId}`, { headers: aH() });
      if (r.ok) setMovimientos(await r.json());
    } catch (e) { /* silenciar */ } finally { setLoading(false); }
  }, [expedienteId, clienteId]);

  useEffect(() => { load(); }, [load]);

  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const guardar = async () => {
    if (!f.fecha) return setErr("La fecha es obligatoria");
    setSaving(true); setErr("");
    try {
      const r = await fetch(`${API}/api/doctor/expedientes/${expedienteId}/movimientos`, {
        method: "POST", headers: jH(), body: JSON.stringify({ ...f, cliente_id: clienteId }),
      });
      if (!r.ok) throw new Error((await r.json()).error);
      setF({ fecha: "", tipo: "", descripcion: "" });
      setShowForm(false);
      load();
    } catch (e) { setErr(e.message); } finally { setSaving(false); }
  };

  const eliminar = async (id) => {
    if (!confirm("¿Eliminar este movimiento?")) return;
    await fetch(`${API}/api/doctor/movimientos/${id}?cliente_id=${clienteId}`, { method: "DELETE", headers: aH() });
    load();
  };

  if (loading) return <Spinner C={C} />;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Timeline de movimientos</div>
        <Btn C={C} onClick={() => setShowForm(!showForm)} style={{ fontSize: 12 }}>+ Agregar</Btn>
      </div>

      {/* Formulario */}
      {showForm && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <Field C={C} label="Fecha" required><Input C={C} type="date" value={f.fecha} onChange={(e) => set("fecha", e.target.value)} /></Field>
            <Field C={C} label="Tipo">
              <Sel C={C} value={f.tipo} onChange={(e) => set("tipo", e.target.value)} options={TIPOS_MOVIMIENTO} />
            </Field>
          </div>
          <Field C={C} label="Descripción">
            <textarea value={f.descripcion} onChange={(e) => set("descripcion", e.target.value)}
              style={{ ...inputSt(C), minHeight: 80, resize: "vertical" }} />
          </Field>
          {err && <div style={{ color: "#ef4444", fontSize: 12, marginTop: 8 }}>{err}</div>}
          <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "flex-end" }}>
            <Btn C={C} variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Btn>
            <Btn C={C} onClick={guardar} disabled={saving}>{saving ? "Guardando…" : "Guardar movimiento"}</Btn>
          </div>
        </div>
      )}

      {/* Timeline */}
      {movimientos.length === 0
        ? <EmptyState C={C} icon="📋" title="Sin movimientos" sub='Registrá el primer movimiento con "+ Agregar".' />
        : (
          <div style={{ position: "relative", paddingLeft: 24 }}>
            <div style={{ position: "absolute", left: 8, top: 0, bottom: 0, width: 2, background: C.border, borderRadius: 1 }} />
            {movimientos.map((m) => (
              <div key={m.id} style={{ position: "relative", marginBottom: 20 }}>
                <div style={{ position: "absolute", left: -20, top: 4, width: 10, height: 10, borderRadius: "50%", background: C.accent, border: `2px solid ${C.bg}` }} />
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{fmtFecha(m.fecha)}</span>
                        {m.tipo && <Chip label={labelDe(TIPOS_MOVIMIENTO, m.tipo)} color={C.accent} />}
                        {m.responsable_nombre && <span style={{ fontSize: 11, color: C.muted }}>— {m.responsable_nombre}</span>}
                      </div>
                      {m.descripcion && <div style={{ fontSize: 13, color: C.text, lineHeight: 1.5 }}>{m.descripcion}</div>}
                    </div>
                    <button onClick={() => eliminar(m.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: 14, flexShrink: 0 }} title="Eliminar">✕</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      }
    </div>
  );
}

// ── Plazos tab dentro de ExpedienteDetalle ────────────────────

function PlazosExpedienteTab({ C, clienteId, expedienteId }) {
  const [eventos, setEventos]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [eventoEdit, setEventoEdit] = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const r = await fetch(
        `${API}/api/doctor/expedientes/${expedienteId}/agenda?cliente_id=${clienteId}`,
        { headers: aH() }
      );
      if (r.ok) {
        setEventos(await r.json());
      } else {
        const body = await r.json().catch(() => ({}));
        console.error("PlazosExpedienteTab:", r.status, body);
        setFetchError(body.error || `Error ${r.status} al cargar los plazos.`);
      }
    } catch (e) {
      console.error("PlazosExpedienteTab:", e);
      setFetchError("No se pudieron cargar los plazos. Verificá la conexión.");
    } finally { setLoading(false); }
  }, [clienteId, expedienteId]);

  useEffect(() => { cargar(); }, [cargar]);

  const onSave = (ev) => {
    setEventos((prev) => {
      const idx = prev.findIndex((e) => e.id === ev.id);
      return idx >= 0 ? prev.map((e) => (e.id === ev.id ? ev : e)) : [ev, ...prev];
    });
    setModalOpen(false);
    setEventoEdit(null);
  };

  const onDelete = (id) => {
    setEventos((p) => p.filter((e) => e.id !== id));
    setModalOpen(false);
    setEventoEdit(null);
  };

  if (loading) return <Spinner C={C} />;
  if (fetchError) return (
    <div style={{ padding: 24 }}>
      <div style={{ background: "#ef444422", border: "1px solid #ef4444", borderRadius: 8, padding: "14px 18px", color: "#ef4444", fontSize: 13 }}>
        ⚠️ {fetchError}
        <button onClick={cargar} style={{ marginLeft: 12, background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontWeight: 600, fontSize: 13, textDecoration: "underline" }}>Reintentar</button>
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>Plazos y eventos del expediente</div>
        <Btn C={C} onClick={() => { setEventoEdit(null); setModalOpen(true); }}>+ Agregar plazo</Btn>
      </div>

      {eventos.length === 0 ? (
        <EmptyState C={C} icon="⏱" title="Sin plazos cargados" sub="Agregá el primer plazo con el botón +" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {eventos.map((ev) => {
            const color = TIPO_AGENDA_COLOR[ev.tipo] || "#6366f1";
            const msFin = new Date(ev.fecha_fin || ev.fecha_inicio).getTime();
            const dias  = Math.ceil((msFin - Date.now()) / 86400000);
            const urgColor = dias <= 0 ? "#ef4444" : dias <= 3 ? "#ef4444" : dias <= 7 ? "#FBBA00" : C.muted;
            return (
              <div key={ev.id}
                onClick={() => { setEventoEdit(ev); setModalOpen(true); }}
                style={{ display: "flex", gap: 14, padding: "14px 18px", background: C.surface,
                  borderRadius: 10, border: `1px solid ${C.border}`, cursor: "pointer",
                  borderLeft: `4px solid ${color}` }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 4 }}>{ev.titulo}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>
                    {(TIPOS_AGENDA.find((t) => t.value === ev.tipo) || {}).label || ev.tipo}
                    {" · "}
                    {new Date(ev.fecha_inicio).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" })}
                    {ev.estado ? ` · ${ev.estado}` : ""}
                  </div>
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: urgColor, whiteSpace: "nowrap", alignSelf: "center" }}>
                  {dias <= 0 ? "Vencido" : dias === 1 ? "Mañana" : `${dias}d`}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <EventoModal
          C={C}
          clienteId={clienteId}
          evento={eventoEdit}
          fechaInicio={new Date().toISOString()}
          expedienteIdPreset={String(expedienteId)}
          expedientes={[]}
          onSave={onSave}
          onDelete={onDelete}
          onSuccess={cargar}
          onClose={() => { setModalOpen(false); setEventoEdit(null); }}
        />
      )}
    </div>
  );
}

// ── Ficha del expediente ──────────────────────────────────────

function ExpedienteDetalle({ C, clienteId, expedienteId, usuarios, onVolver, onResumirIA, onEscritoCreado }) {
  const [exp, setExp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("datos");
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [notas, setNotas] = useState("");
  const [notasGuardando, setNotasGuardando] = useState(false);

  // PDF analyzer states
  const [pdfModalOpen, setPdfModalOpen]       = useState(false);

  // Plantilla picker states
  const [plantPickerOpen, setPlantPickerOpen]   = useState(false);
  const [plantillas, setPlantillas]             = useState([]);
  const [loadingPlant, setLoadingPlant]         = useState(false);
  const [creatingEscrito, setCreatingEscrito]   = useState(false);
  const [pdfFile, setPdfFile]                 = useState(null);
  const [pdfInstruccion, setPdfInstruccion]   = useState("");
  const [pdfOut, setPdfOut]                   = useState("");
  const [pdfStreaming, setPdfStreaming]        = useState(false);
  const [pdfErr, setPdfErr]                   = useState("");
  const [savingNota, setSavingNota]           = useState(false);
  const pdfScrollRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/doctor/expedientes/${expedienteId}?cliente_id=${clienteId}`, { headers: aH() });
      if (r.ok) {
        const d = await r.json();
        setExp(d);
        setForm(d);
        setNotas(d.observaciones || "");
      }
    } catch (e) { /* silenciar */ } finally { setLoading(false); }
  }, [expedienteId, clienteId]);

  useEffect(() => { load(); }, [load]);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const guardar = async () => {
    setSaving(true);
    try {
      const r = await fetch(`${API}/api/doctor/expedientes/${expedienteId}`, {
        method: "PUT", headers: jH(), body: JSON.stringify({ ...form, cliente_id: clienteId }),
      });
      if (r.ok) { setExp(await r.json()); setEditando(false); }
    } catch (e) { /* silenciar */ } finally { setSaving(false); }
  };

  const guardarNotas = async () => {
    setNotasGuardando(true);
    await fetch(`${API}/api/doctor/expedientes/${expedienteId}`, {
      method: "PUT", headers: jH(), body: JSON.stringify({ ...exp, cliente_id: clienteId, observaciones: notas }),
    });
    setNotasGuardando(false);
  };

  const handlePdfExpediente = async () => {
    if (!pdfFile || pdfStreaming) return;
    setPdfOut(""); setPdfStreaming(true); setPdfErr("");
    let acc = "";
    await streamPDF(
      { file: pdfFile, clienteId, expedienteId, instruccion: pdfInstruccion },
      (t) => { acc += t; setPdfOut(acc); if (pdfScrollRef.current) pdfScrollRef.current.scrollTop = 9999; },
      () => setPdfStreaming(false),
      (e) => { setPdfErr(e); setPdfStreaming(false); }
    );
  };

  const guardarComoNota = async () => {
    if (!pdfOut) return;
    setSavingNota(true);
    const nuevaNota = (notas ? notas + "\n\n" : "") +
      `--- Análisis PDF (${pdfFile?.name || "documento"}) ---\n${pdfOut}`;
    await fetch(`${API}/api/doctor/expedientes/${expedienteId}`, {
      method: "PUT", headers: jH(),
      body: JSON.stringify({ ...exp, cliente_id: clienteId, observaciones: nuevaNota }),
    });
    setNotas(nuevaNota);
    setSavingNota(false);
    setPdfModalOpen(false);
  };

  // Plantilla picker: carga bajo demanda
  const abrirPickerPlantilla = async () => {
    setPlantPickerOpen(true);
    if (plantillas.length === 0) {
      setLoadingPlant(true);
      const data = await fetch(
        `${API}/api/doctor/plantillas?cliente_id=${clienteId}`,
        { headers: aH() }
      ).then(r => r.ok ? r.json() : []);
      setPlantillas(data);
      setLoadingPlant(false);
    }
  };

  const usarPlantillaDesdeExp = async (p) => {
    if (creatingEscrito) return;
    setCreatingEscrito(true);
    try {
      const personas = exp?.personas || [];
      const contenidoResuelto = resolverVariablesPreview(p.contenido, exp, personas);
      const body = {
        cliente_id:     clienteId,
        expediente_id:  expedienteId,
        plantilla_id:   p.id,
        titulo:         p.titulo,
        categoria:      p.categoria,
        estado:         "borrador",
        contenido:      contenidoResuelto,
        contenido_html: contenidoResuelto,
      };
      const r = await fetch(`${API}/api/doctor/escritos`, {
        method: "POST", headers: jH(), body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error("Error al crear el escrito");
      const escrito = await r.json();
      setPlantPickerOpen(false);
      onEscritoCreado?.(escrito);
    } catch (_) {} finally { setCreatingEscrito(false); }
  };

  const TABS = [
    { key: "datos",       label: "Datos" },
    { key: "movimientos", label: "Movimientos" },
    { key: "documentos",  label: "Documentos" },
    { key: "plazos",      label: "Plazos" },
    { key: "notas",       label: "Notas" },
  ];

  if (loading) return <Spinner C={C} />;
  if (!exp) return <EmptyState C={C} icon="❌" title="Expediente no encontrado" />;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      {/* Header */}
      <div style={{ padding: "16px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "flex-start", gap: 12, flexShrink: 0 }}>
        <button onClick={onVolver} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: 20, padding: 0, lineHeight: 1 }}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 4 }}>{exp.caratula}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {exp.fuero && <Chip label={labelDe(FUEROS, exp.fuero)} color="#6366f1" />}
            {exp.etapa && <Chip label={labelDe(ETAPAS_EXPEDIENTE, exp.etapa)} color={ETAPA_COLOR[exp.etapa] || "#6366f1"} />}
            {exp.estado && <Chip label={labelDe(ESTADOS_EXPEDIENTE, exp.estado)} color={ESTADO_COLOR[exp.estado] || "#6b7280"} />}
            {exp.prioridad && <Chip label={labelDe(PRIORIDADES, exp.prioridad)} color={PRIORIDAD_COLOR[exp.prioridad] || "#6b7280"} />}
          </div>
        </div>
        {onResumirIA && (
          <Btn C={C} variant="ghost" onClick={onResumirIA} style={{ fontSize: 12 }}>✨ Resumir con IA</Btn>
        )}
        <Btn C={C} variant="ghost" onClick={abrirPickerPlantilla} style={{ fontSize: 12 }}>📝 Nuevo escrito</Btn>
        <Btn C={C} variant="ghost" onClick={() => { setPdfModalOpen(true); setPdfOut(""); setPdfErr(""); }} style={{ fontSize: 12 }}>📄 Analizar PDF</Btn>
        {!editando
          ? <Btn C={C} variant="ghost" onClick={() => setEditando(true)} style={{ fontSize: 12 }}>✏ Editar</Btn>
          : <div style={{ display: "flex", gap: 8 }}>
              <Btn C={C} variant="ghost" onClick={() => { setEditando(false); setForm(exp); }}>Cancelar</Btn>
              <Btn C={C} onClick={guardar} disabled={saving}>{saving ? "…" : "Guardar"}</Btn>
            </div>
        }
      </div>

      {/* Pestañas */}
      <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, flexShrink: 0, padding: "0 24px" }}>
        {TABS.map((t) => (
          <div key={t.key} onClick={() => setTab(t.key)}
            style={{ padding: "10px 16px", cursor: "pointer", fontSize: 13, fontWeight: tab === t.key ? 600 : 400,
              color: tab === t.key ? C.accent : C.muted,
              borderBottom: tab === t.key ? `2px solid ${C.accent}` : "2px solid transparent",
              transition: "all .15s" }}>
            {t.label}
          </div>
        ))}
      </div>

      {/* Contenido de tab */}
      <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>

        {/* ── DATOS ── */}
        {tab === "datos" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
              <Field C={C} label="Carátula" required>
                {editando ? <Input C={C} value={form.caratula || ""} onChange={(e) => set("caratula", e.target.value)} />
                  : <div style={{ fontSize: 13, color: C.text, padding: "8px 0" }}>{exp.caratula || "—"}</div>}
              </Field>
              <Field C={C} label="Tipo de proceso">
                {editando ? <Sel C={C} value={form.tipo_proceso || ""} onChange={(e) => set("tipo_proceso", e.target.value)} options={TIPOS_PROCESO} />
                  : <div style={{ fontSize: 13, color: C.text, padding: "8px 0" }}>{labelDe(TIPOS_PROCESO, exp.tipo_proceso)}</div>}
              </Field>
              <Field C={C} label="Fuero">
                {editando ? <Sel C={C} value={form.fuero || ""} onChange={(e) => set("fuero", e.target.value)} options={FUEROS} />
                  : <div style={{ fontSize: 13, color: C.text, padding: "8px 0" }}>{labelDe(FUEROS, exp.fuero)}</div>}
              </Field>
              <Field C={C} label="Jurisdicción">
                {editando ? <Sel C={C} value={form.jurisdiccion || ""} onChange={(e) => set("jurisdiccion", e.target.value)} options={JURISDICCIONES} />
                  : <div style={{ fontSize: 13, color: C.text, padding: "8px 0" }}>{labelDe(JURISDICCIONES, exp.jurisdiccion)}</div>}
              </Field>
              <Field C={C} label="Etapa">
                {editando ? <Sel C={C} value={form.etapa || ""} onChange={(e) => set("etapa", e.target.value)} options={ETAPAS_EXPEDIENTE} />
                  : <div style={{ fontSize: 13, color: C.text, padding: "8px 0" }}>{labelDe(ETAPAS_EXPEDIENTE, exp.etapa)}</div>}
              </Field>
              <Field C={C} label="Estado">
                {editando ? <Sel C={C} value={form.estado || ""} onChange={(e) => set("estado", e.target.value)} options={ESTADOS_EXPEDIENTE} />
                  : <div style={{ fontSize: 13, color: C.text, padding: "8px 0" }}>{labelDe(ESTADOS_EXPEDIENTE, exp.estado)}</div>}
              </Field>
              <Field C={C} label="Prioridad">
                {editando ? <Sel C={C} value={form.prioridad || ""} onChange={(e) => set("prioridad", e.target.value)} options={PRIORIDADES} />
                  : <div style={{ fontSize: 13, color: C.text, padding: "8px 0" }}>{labelDe(PRIORIDADES, exp.prioridad)}</div>}
              </Field>
              <Field C={C} label="Responsable">
                {editando
                  ? <select style={inputSt(C)} value={form.responsable_id || ""} onChange={(e) => set("responsable_id", e.target.value)}>
                      <option value="">— sin asignar —</option>
                      {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                    </select>
                  : <div style={{ fontSize: 13, color: C.text, padding: "8px 0" }}>{exp.responsable_nombre || "—"}</div>}
              </Field>
              <Field C={C} label="N° carpeta interna">
                {editando ? <Input C={C} value={form.num_carpeta_interna || ""} onChange={(e) => set("num_carpeta_interna", e.target.value)} />
                  : <div style={{ fontSize: 13, color: C.text, padding: "8px 0" }}>{exp.num_carpeta_interna || "—"}</div>}
              </Field>
              <Field C={C} label="N° expediente judicial">
                {editando ? <Input C={C} value={form.num_expediente_judicial || ""} onChange={(e) => set("num_expediente_judicial", e.target.value)} />
                  : <div style={{ fontSize: 13, color: C.text, padding: "8px 0" }}>{exp.num_expediente_judicial || "—"}</div>}
              </Field>
              <Field C={C} label="Monto reclamado">
                {editando
                  ? <div style={{ display: "flex", gap: 8 }}>
                      <Sel C={C} value={form.moneda || "ARS"} onChange={(e) => set("moneda", e.target.value)} options={MONEDAS} />
                      <Input C={C} type="number" value={form.monto_reclamado || ""} onChange={(e) => set("monto_reclamado", e.target.value)} placeholder="0.00" />
                    </div>
                  : <div style={{ fontSize: 13, color: C.text, padding: "8px 0" }}>
                      {exp.monto_reclamado ? `${exp.moneda} ${Number(exp.monto_reclamado).toLocaleString("es-AR")}` : "—"}
                    </div>}
              </Field>
              <Field C={C} label="Creado el">
                <div style={{ fontSize: 13, color: C.muted, padding: "8px 0" }}>{fmtFecha(exp.created_at)}</div>
              </Field>
            </div>

            {/* Personas */}
            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 24 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 16 }}>Partes del expediente</div>
              <PersonasTab C={C} clienteId={clienteId} expedienteId={expedienteId} />
            </div>
          </div>
        )}

        {/* ── MOVIMIENTOS ── */}
        {tab === "movimientos" && <MovimientosTab C={C} clienteId={clienteId} expedienteId={expedienteId} />}

        {/* ── DOCUMENTOS (placeholder) ── */}
        {tab === "documentos" && <Placeholder C={C} fase="Fase 5 — Escritos y plantillas" />}

        {/* ── PLAZOS ── */}
        {tab === "plazos" && (
          <PlazosExpedienteTab C={C} clienteId={clienteId} expedienteId={expedienteId} />
        )}

        {/* ── NOTAS ── */}
        {tab === "notas" && (
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 12 }}>Notas internas del expediente</div>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              style={{ ...inputSt(C), minHeight: 200, resize: "vertical" }}
              placeholder="Anotaciones internas, recordatorios, estrategia procesal…"
            />
            <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end" }}>
              <Btn C={C} onClick={guardarNotas} disabled={notasGuardando}>{notasGuardando ? "Guardando…" : "Guardar notas"}</Btn>
            </div>
          </div>
        )}

      </div>

      {/* Modal Analizar PDF */}
      {pdfModalOpen && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.55)", zIndex:2000, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
          <div style={{ background:C.surface, borderRadius:14, width:"100%", maxWidth:600, maxHeight:"90vh",
            display:"flex", flexDirection:"column", boxShadow:"0 8px 40px rgba(0,0,0,.35)" }}>
            <div style={{ padding:"16px 20px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", gap:10 }}>
              <span style={{ fontSize:20 }}>📄</span>
              <div style={{ flex:1, fontSize:15, fontWeight:700, color:C.text }}>Analizar PDF con IA</div>
              <button onClick={() => setPdfModalOpen(false)} style={{ background:"none", border:"none", cursor:"pointer", color:C.muted, fontSize:22 }}>×</button>
            </div>
            <div style={{ flex:1, overflowY:"auto", padding:20, display:"flex", flexDirection:"column", gap:14 }}>
              <div>
                <div style={{ fontSize:12, color:C.muted, marginBottom:6 }}>Archivo PDF (máx. 20 MB)</div>
                <input type="file" accept="application/pdf"
                  onChange={e => { setPdfFile(e.target.files[0]||null); setPdfOut(""); setPdfErr(""); }}
                  style={{ fontSize:12, color:C.text, width:"100%" }} />
                {pdfFile && <div style={{ fontSize:11, color:C.muted, marginTop:4 }}>📄 {pdfFile.name} ({(pdfFile.size/1024/1024).toFixed(1)} MB)</div>}
              </div>
              <Field C={C} label="Instrucción personalizada (opcional)">
                <textarea value={pdfInstruccion} onChange={e=>setPdfInstruccion(e.target.value)}
                  placeholder="Ej: Identificá las cláusulas de penalidad y los plazos de rescisión."
                  style={{ ...inputSt(C), width:"100%", boxSizing:"border-box", minHeight:56, resize:"vertical", fontSize:12 }} />
              </Field>
              <Btn C={C} onClick={handlePdfExpediente} disabled={!pdfFile||pdfStreaming}
                style={{ background:"linear-gradient(135deg,#6366f1,#8b5cf6)", color:"white", border:"none" }}>
                {pdfStreaming ? "⏳ Analizando…" : "📄 Analizar"}
              </Btn>
              {pdfErr && <div style={{ fontSize:12, color:"#ef4444" }}>{pdfErr}</div>}
              {pdfOut && (
                <div ref={pdfScrollRef} style={{ flex:1, background:C.bg, border:`1px solid ${C.border}`, borderRadius:10, padding:14, overflowY:"auto", maxHeight:320 }}>
                  <style>{mdStyles(C)}</style>
                  <div className="md-ia" style={{ fontSize:12, color:C.text, lineHeight:1.75 }}
                    dangerouslySetInnerHTML={{ __html: mdHtml(pdfOut) }} />
                  {pdfStreaming && <span style={{ color:C.accent }}>▌</span>}
                </div>
              )}
            </div>
            {pdfOut && !pdfStreaming && (
              <div style={{ padding:"12px 20px", borderTop:`1px solid ${C.border}`, display:"flex", justifyContent:"flex-end", gap:10 }}>
                <Btn C={C} variant="ghost" onClick={() => setPdfModalOpen(false)}>Cerrar sin guardar</Btn>
                <Btn C={C} onClick={guardarComoNota} disabled={savingNota}>
                  {savingNota ? "Guardando…" : "💾 Guardar como nota"}
                </Btn>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modal: Nuevo escrito desde plantilla ── */}
      {plantPickerOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", zIndex: 2000,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={e => { if (e.target === e.currentTarget) setPlantPickerOpen(false); }}>
          <div style={{ background: C.surface, borderRadius: 16, width: "100%", maxWidth: 480,
            maxHeight: "80vh", display: "flex", flexDirection: "column",
            boxShadow: "0 8px 40px rgba(0,0,0,.35)", overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`,
              display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1, fontSize: 15, fontWeight: 700, color: C.text }}>
                📝 Nuevo escrito desde plantilla
              </div>
              <button onClick={() => setPlantPickerOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: 22 }}>
                ×
              </button>
            </div>
            <div style={{ padding: "8px 20px", borderBottom: `1px solid ${C.border}`,
              fontSize: 12, color: C.muted }}>
              Las variables &#123;&#123;expediente.X&#125;&#125;, &#123;&#123;actor.X&#125;&#125; etc. se resuelven automáticamente con los datos de este expediente.
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
              {loadingPlant ? <Spinner C={C} /> :
                plantillas.length === 0
                  ? <EmptyState C={C} icon="📋" title="Sin plantillas"
                      sub='Creá plantillas en la pestaña Escritos → Plantillas.' />
                  : plantillas.map(p => (
                      <div key={p.id}
                        onClick={() => usarPlantillaDesdeExp(p)}
                        style={{ padding: "12px 14px", borderRadius: 10, cursor: "pointer",
                          border: `1px solid ${C.border}`, marginBottom: 8, background: C.bg,
                          borderLeft: `3px solid ${p.publica ? "#10b981" : C.accent}`,
                          opacity: creatingEscrito ? 0.5 : 1, transition: "background .12s" }}
                        onMouseEnter={ev => ev.currentTarget.style.background = C.surface}
                        onMouseLeave={ev => ev.currentTarget.style.background = C.bg}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 4 }}>
                          {p.titulo}
                        </div>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <Chip label={labelDe(CATEGORIAS_ESCRITO, p.categoria)} color={C.accent} />
                          {p.publica && <Chip label="Pública" color="#10b981" />}
                          {p.descripcion && (
                            <span style={{ fontSize: 11, color: C.muted }}>{p.descripcion}</span>
                          )}
                        </div>
                      </div>
                    ))
              }
              {creatingEscrito && (
                <div style={{ textAlign: "center", fontSize: 12, color: C.muted, padding: 12 }}>
                  Creando escrito…
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Formulario nuevo expediente ───────────────────────────────

function NuevoExpedienteForm({ C, clienteId, usuarios, onCreado, onCancelar }) {
  const [f, setF] = useState({
    caratula: "", tipo_proceso: "", num_carpeta_interna: "", num_expediente_judicial: "",
    fuero: "", jurisdiccion: "", etapa: "inicial", estado: "activo", prioridad: "media",
    responsable_id: "", observaciones: "", monto_reclamado: "", moneda: "ARS",
  });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const guardar = async () => {
    if (!f.caratula.trim()) return setErr("La carátula es obligatoria");
    setLoading(true); setErr("");
    try {
      const r = await fetch(`${API}/api/doctor/expedientes`, {
        method: "POST", headers: jH(), body: JSON.stringify({ ...f, cliente_id: clienteId }),
      });
      if (!r.ok) throw new Error((await r.json()).error);
      onCreado(await r.json());
    } catch (e) { setErr(e.message); } finally { setLoading(false); }
  };

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <button onClick={onCancelar} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: 20 }}>←</button>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>Nuevo expediente</div>
            <div style={{ fontSize: 12, color: C.muted }}>Completá los campos del expediente</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={{ gridColumn: "span 2" }}>
            <Field C={C} label="Carátula" required>
              <Input C={C} value={f.caratula} onChange={(e) => set("caratula", e.target.value)} placeholder="Ej: García Juan c/ Pérez María s/ Daños y Perjuicios" />
            </Field>
          </div>
          <Field C={C} label="Tipo de proceso"><Sel C={C} value={f.tipo_proceso} onChange={(e) => set("tipo_proceso", e.target.value)} options={TIPOS_PROCESO} /></Field>
          <Field C={C} label="Fuero"><Sel C={C} value={f.fuero} onChange={(e) => set("fuero", e.target.value)} options={FUEROS} /></Field>
          <Field C={C} label="Jurisdicción"><Sel C={C} value={f.jurisdiccion} onChange={(e) => set("jurisdiccion", e.target.value)} options={JURISDICCIONES} /></Field>
          <Field C={C} label="Etapa"><Sel C={C} value={f.etapa} onChange={(e) => set("etapa", e.target.value)} options={ETAPAS_EXPEDIENTE} /></Field>
          <Field C={C} label="Estado"><Sel C={C} value={f.estado} onChange={(e) => set("estado", e.target.value)} options={ESTADOS_EXPEDIENTE} /></Field>
          <Field C={C} label="Prioridad"><Sel C={C} value={f.prioridad} onChange={(e) => set("prioridad", e.target.value)} options={PRIORIDADES} /></Field>
          <Field C={C} label="Responsable">
            <select style={inputSt(C)} value={f.responsable_id} onChange={(e) => set("responsable_id", e.target.value)}>
              <option value="">— sin asignar —</option>
              {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
            </select>
          </Field>
          <Field C={C} label="N° carpeta interna"><Input C={C} value={f.num_carpeta_interna} onChange={(e) => set("num_carpeta_interna", e.target.value)} /></Field>
          <Field C={C} label="N° expediente judicial"><Input C={C} value={f.num_expediente_judicial} onChange={(e) => set("num_expediente_judicial", e.target.value)} /></Field>
          <Field C={C} label="Moneda">
            <Sel C={C} value={f.moneda} onChange={(e) => set("moneda", e.target.value)} options={MONEDAS} />
          </Field>
          <Field C={C} label="Monto reclamado">
            <Input C={C} type="number" value={f.monto_reclamado} onChange={(e) => set("monto_reclamado", e.target.value)} placeholder="0.00" />
          </Field>
          <div style={{ gridColumn: "span 2" }}>
            <Field C={C} label="Observaciones">
              <textarea value={f.observaciones} onChange={(e) => set("observaciones", e.target.value)}
                style={{ ...inputSt(C), minHeight: 80, resize: "vertical" }} />
            </Field>
          </div>
        </div>

        {err && <div style={{ color: "#ef4444", fontSize: 12, marginTop: 12 }}>{err}</div>}

        <div style={{ display: "flex", gap: 8, marginTop: 20, justifyContent: "flex-end" }}>
          <Btn C={C} variant="ghost" onClick={onCancelar}>Cancelar</Btn>
          <Btn C={C} onClick={guardar} disabled={loading}>{loading ? "Guardando…" : "Crear expediente"}</Btn>
        </div>
      </div>
    </div>
  );
}

// ── Vista lista + kanban ──────────────────────────────────────

function ExpedientesLista({ C, clienteId, onNuevo, onVer }) {
  const [expedientes, setExpedientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vista, setVista] = useState("tabla");
  const [filtros, setFiltros] = useState({ etapa: "", fuero: "", estado: "", q: "" });

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("cliente_id", clienteId);
    if (filtros.etapa) params.set("etapa", filtros.etapa);
    if (filtros.fuero)  params.set("fuero",  filtros.fuero);
    if (filtros.estado) params.set("estado", filtros.estado);
    if (filtros.q)      params.set("q",      filtros.q);
    try {
      const r = await fetch(`${API}/api/doctor/expedientes?${params}`, { headers: aH() });
      if (r.ok) setExpedientes(await r.json());
    } catch (e) { /* silenciar */ } finally { setLoading(false); }
  }, [filtros, clienteId]);

  useEffect(() => { load(); }, [load]);

  const setFiltro = (k, v) => setFiltros((p) => ({ ...p, [k]: v }));

  // Vista Kanban
  const kanban = () => {
    const cols = ETAPAS_EXPEDIENTE.map((e) => ({
      ...e, items: expedientes.filter((x) => x.etapa === e.value),
    }));
    return (
      <div style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 8 }}>
        {cols.map((col) => (
          <div key={col.value} style={{ minWidth: 240, flex: "0 0 240px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: ETAPA_COLOR[col.value] || C.muted }}>
                {col.label.toUpperCase()}
              </div>
              <span style={{ fontSize: 11, color: C.muted, background: C.surface, borderRadius: 99, padding: "1px 7px" }}>{col.items.length}</span>
            </div>
            {col.items.length === 0
              ? <div style={{ fontSize: 11, color: C.muted, padding: "12px 0", textAlign: "center" }}>—</div>
              : col.items.map((exp) => (
                <div key={exp.id} onClick={() => onVer(exp.id)}
                  style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12,
                    marginBottom: 8, cursor: "pointer", transition: "border-color .15s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = C.accent)}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = C.border)}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 4, lineHeight: 1.4 }}>{exp.caratula}</div>
                  {exp.fuero && <div style={{ fontSize: 11, color: C.muted }}>{labelDe(FUEROS, exp.fuero)}</div>}
                  {exp.responsable_nombre && <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>👤 {exp.responsable_nombre}</div>}
                </div>
              ))
            }
          </div>
        ))}
      </div>
    );
  };

  // Vista tabla
  const tabla = () => (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${C.border}` }}>
            {["Carátula", "Tipo", "Fuero", "Etapa", "Estado", "Responsable", "Creado"].map((h) => (
              <th key={h} style={{ textAlign: "left", padding: "8px 12px", fontSize: 11, color: C.muted, fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {expedientes.map((exp) => (
            <tr key={exp.id} onClick={() => onVer(exp.id)}
              style={{ borderBottom: `1px solid ${C.border}`, cursor: "pointer", transition: "background .1s" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = C.surfaceHover)}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
              <td style={{ padding: "10px 12px", fontWeight: 500, maxWidth: 280 }}>
                <div style={{ color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{exp.caratula}</div>
                {exp.num_carpeta_interna && <div style={{ fontSize: 10, color: C.muted }}>Carpeta: {exp.num_carpeta_interna}</div>}
              </td>
              <td style={{ padding: "10px 12px", color: C.muted, whiteSpace: "nowrap" }}>{labelDe(TIPOS_PROCESO, exp.tipo_proceso) || "—"}</td>
              <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>{exp.fuero ? <Chip label={labelDe(FUEROS, exp.fuero)} color="#6366f1" /> : "—"}</td>
              <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>{exp.etapa ? <Chip label={labelDe(ETAPAS_EXPEDIENTE, exp.etapa)} color={ETAPA_COLOR[exp.etapa] || "#6366f1"} /> : "—"}</td>
              <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>{exp.estado ? <Chip label={labelDe(ESTADOS_EXPEDIENTE, exp.estado)} color={ESTADO_COLOR[exp.estado] || "#6b7280"} /> : "—"}</td>
              <td style={{ padding: "10px 12px", color: C.muted, whiteSpace: "nowrap" }}>{exp.responsable_nombre || "—"}</td>
              <td style={{ padding: "10px 12px", color: C.muted, whiteSpace: "nowrap" }}>{fmtFecha(exp.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {expedientes.length === 0 && !loading && (
        <EmptyState C={C} icon="📁" title="Sin expedientes" sub='Creá el primero con "Nuevo expediente".' />
      )}
    </div>
  );

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      {/* Header */}
      <div style={{ padding: "16px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0, flexWrap: "wrap", gap: 8 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>Expedientes</div>
          <div style={{ fontSize: 12, color: C.muted }}>{expedientes.length} expediente{expedientes.length !== 1 ? "s" : ""}</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ display: "flex", background: C.bg, borderRadius: 8, border: `1px solid ${C.border}`, overflow: "hidden" }}>
            {[{ v: "tabla", l: "Tabla" }, { v: "kanban", l: "Kanban" }].map(({ v, l }) => (
              <div key={v} onClick={() => setVista(v)}
                style={{ padding: "6px 12px", cursor: "pointer", fontSize: 12, fontWeight: vista === v ? 700 : 400,
                  background: vista === v ? C.accent : "transparent", color: vista === v ? "white" : C.muted }}>
                {l}
              </div>
            ))}
          </div>
          <Btn C={C} onClick={onNuevo}>+ Nuevo expediente</Btn>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ padding: "12px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", gap: 8, flexWrap: "wrap", flexShrink: 0 }}>
        <input value={filtros.q} onChange={(e) => setFiltro("q", e.target.value)} placeholder="Buscar carátula…"
          style={{ ...inputSt(C), width: 200 }} />
        <select style={{ ...inputSt(C), width: 140 }} value={filtros.etapa} onChange={(e) => setFiltro("etapa", e.target.value)}>
          <option value="">Etapa: todas</option>
          {ETAPAS_EXPEDIENTE.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select style={{ ...inputSt(C), width: 160 }} value={filtros.fuero} onChange={(e) => setFiltro("fuero", e.target.value)}>
          <option value="">Fuero: todos</option>
          {FUEROS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select style={{ ...inputSt(C), width: 150 }} value={filtros.estado} onChange={(e) => setFiltro("estado", e.target.value)}>
          <option value="">Estado: todos</option>
          {ESTADOS_EXPEDIENTE.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {(filtros.q || filtros.etapa || filtros.fuero || filtros.estado) && (
          <button onClick={() => setFiltros({ etapa: "", fuero: "", estado: "", q: "" })}
            style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: 12 }}>
            ✕ Limpiar
          </button>
        )}
      </div>

      {/* Contenido */}
      <div style={{ flex: 1, overflowY: "auto", overflowX: vista === "kanban" ? "auto" : "hidden", padding: 24 }}>
        {loading ? <Spinner C={C} /> : vista === "kanban" ? kanban() : tabla()}
      </div>
    </div>
  );
}

// ── Helper: streaming SSE desde /api/doctor/ai/chat ──────────

// Configurar marked: saltos de línea GFM, sin HTML arbitrario del backend
marked.use({ breaks: true, gfm: true });
function mdHtml(text) {
  return text ? marked(text) : "";
}

// CSS mínimo para markdown dentro de la paleta del CRM
function mdStyles(C) {
  return `
    .md-ia h1,.md-ia h2,.md-ia h3{color:${C.text};font-weight:600;margin:10px 0 4px;line-height:1.3}
    .md-ia h1{font-size:1.1em} .md-ia h2{font-size:1.05em} .md-ia h3{font-size:1em}
    .md-ia strong,.md-ia b{color:${C.text};font-weight:700}
    .md-ia p{margin:0 0 8px}
    .md-ia ul,.md-ia ol{padding-left:18px;margin:0 0 8px}
    .md-ia li{margin-bottom:2px}
    .md-ia table{border-collapse:collapse;width:100%;margin-bottom:8px}
    .md-ia td,.md-ia th{padding:5px 9px;border:1px solid ${C.border};font-size:inherit}
    .md-ia th{font-weight:600;background:${C.border}22}
    .md-ia hr{border:none;border-top:1px solid ${C.border};margin:10px 0}
    .md-ia code{background:${C.border}44;padding:1px 5px;border-radius:3px;font-size:.92em;font-family:monospace}
    .md-ia pre{background:${C.border}44;padding:10px 12px;border-radius:6px;overflow-x:auto;margin-bottom:8px}
    .md-ia pre code{background:none;padding:0}
    .md-ia blockquote{border-left:3px solid ${C.accent};margin:0 0 8px;padding:4px 12px;color:${C.muted}}
    .md-ia a{color:${C.accent};text-decoration:underline}
  `;
}

// Convierte errores crudos de la API en mensajes amigables para el usuario final
function humanizarErrorIA(raw = "") {
  const msg = String(raw).toLowerCase();
  if (msg.includes("credit balance") || msg.includes("too low") || msg.includes("billing"))
    return "Sin créditos disponibles en Doctor IA. Contactá al administrador para recargar.";
  if (msg.includes("invalid_api_key") || msg.includes("authentication") || msg.includes("api key"))
    return "API key de Doctor IA inválida. Contactá al administrador.";
  // Si ya es un mensaje amigable del backend (empieza en mayúscula, sin llaves JSON), pasarlo tal cual
  if (!msg.includes("{") && !msg.includes("http") && raw.length < 200) return raw;
  return "Doctor IA no está disponible en este momento. Intentá de nuevo en unos minutos.";
}

async function streamSSE(res, onToken, onDone, onError) {
  const reader  = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n\n");
    buffer = lines.pop();
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      try {
        const data = JSON.parse(line.slice(6));
        if (data.text)  onToken(data.text);
        if (data.done)  onDone(data);
        if (data.error) onError(humanizarErrorIA(data.error));
      } catch { /* ignorar líneas malformadas */ }
    }
  }
}

async function streamPDF({ file, clienteId, expedienteId, instruccion }, onToken, onDone, onError) {
  try {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("cliente_id", clienteId);
    if (expedienteId) fd.append("expediente_id", expedienteId);
    if (instruccion)  fd.append("instruccion", instruccion);
    const res = await fetch(`${API}/api/doctor/ai/analyze-pdf`, {
      method: "POST", headers: aH(), body: fd,
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      return onError(humanizarErrorIA(d.error || `Error ${res.status}`));
    }
    await streamSSE(res, onToken, onDone, onError);
  } catch(e) { onError(humanizarErrorIA(e.message)); }
}

async function streamIA(payload, onToken, onDone, onError) {
  try {
    const res = await fetch(`${API}/api/doctor/ai/chat`, {
      method: "POST", headers: jH(),
      body: JSON.stringify({
        cliente_id:    payload.clienteId,
        capacidad:     payload.capacidad,
        expediente_id: payload.expedienteId,
        mensaje:       payload.mensaje,
        historial:     payload.historial,
        plazo_input:   payload.plazoInput,
      }),
    });
    if (!res.ok) {
      if (res.status === 429) {
        const d = await res.json().catch(() => ({}));
        return onError(d.error || "Límite diario alcanzado. Volvé mañana.");
      }
      const d = await res.json().catch(() => ({}));
      return onError(humanizarErrorIA(d.error || `Error ${res.status}`));
    }
    await streamSSE(res, onToken, onDone, onError);
  } catch (e) { onError(humanizarErrorIA(e.message)); }
}

// ── Panel lateral IA ──────────────────────────────────────────

function DoctorIAPanel({ C, clienteId, expedienteId, iaOpen, setIaOpen, triggerResumir }) {
  const [iaTab, setIaTab]             = useState("resumir");
  const [resumirOut, setResumirOut]   = useState("");
  const [streaming, setStreaming]     = useState(false);
  const [err, setErr]                 = useState("");

  // Chat states
  const [chatHistory, setChatHistory]   = useState([]);
  const [chatInput, setChatInput]       = useState("");
  const [streamingMsg, setStreamingMsg] = useState(""); // mensaje IA en construcción

  // Plazos states
  const [plazoForm, setPlazoForm]       = useState({ fecha_inicio: "", cantidad: "", tipo: "dias_habiles_judiciales" });
  const [plazoResult, setPlazoResult]   = useState(null);
  const [plazoExpl, setPlazoExpl]       = useState("");

  // PDF states
  const [pdfFile, setPdfFile]           = useState(null);
  const [pdfInstruccion, setPdfInstruccion] = useState("");
  const [pdfOut, setPdfOut]             = useState("");
  const [pdfStreaming, setPdfStreaming]  = useState(false);

  const scrollRef = useRef(null);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [resumirOut, chatHistory, streamingMsg, plazoExpl]);

  // Reset contexto cuando cambia el expediente
  useEffect(() => {
    setChatHistory([]);
    setStreamingMsg("");
    setResumirOut("");
    setPlazoResult(null);
    setPlazoExpl("");
    setErr("");
  }, [expedienteId]);

  // Trigger externo: cuando llega un nuevo valor de triggerResumir, resumir
  useEffect(() => {
    if (triggerResumir && iaOpen && expedienteId) handleResumir();
  }, [triggerResumir]); // eslint-disable-line

  const handleResumir = async () => {
    if (!expedienteId) return setErr("Abrí un expediente para usar esta función.");
    setIaTab("resumir");
    setResumirOut(""); setErr(""); setStreaming(true);
    await streamIA(
      { clienteId, capacidad: "resumir_expediente", expedienteId },
      (t) => setResumirOut((p) => p + t),
      () => setStreaming(false),
      (e) => { setErr(e); setStreaming(false); }
    );
  };

  const handlePlazo = async () => {
    const { fecha_inicio, cantidad, tipo } = plazoForm;
    if (!fecha_inicio || !cantidad) return setErr("Completá fecha y cantidad.");
    setErr(""); setPlazoResult(null); setPlazoExpl("");
    let local;
    try { local = calcularPlazo(fecha_inicio, parseInt(cantidad), tipo); }
    catch (e) { return setErr(e.message); }
    setPlazoResult(local);
    setStreaming(true);
    await streamIA(
      { clienteId, capacidad: "calcular_plazo", expedienteId,
        plazoInput: { fecha_inicio, cantidad, tipo, resultado_calculo: local.explicacion } },
      (t) => setPlazoExpl((p) => p + t),
      () => setStreaming(false),
      (e) => { setErr(e); setStreaming(false); }
    );
  };

  const handleChat = async () => {
    if (!chatInput.trim() || streaming) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    const snapshot = [...chatHistory];
    setChatHistory((p) => [...p, { role: "user", content: userMsg }]);
    setStreamingMsg(""); setStreaming(true); setErr("");
    let acc = "";
    await streamIA(
      { clienteId, capacidad: "chat", expedienteId, mensaje: userMsg, historial: snapshot },
      (t) => { acc += t; setStreamingMsg(acc); },
      () => {
        setChatHistory((p) => [...p, { role: "assistant", content: acc }]);
        setStreamingMsg(""); setStreaming(false);
      },
      (e) => { setErr(e); setStreaming(false); }
    );
  };

  const handleAnalizarPdf = async () => {
    if (!pdfFile || pdfStreaming) return;
    setPdfOut(""); setPdfStreaming(true); setErr("");
    let acc = "";
    await streamPDF(
      { file: pdfFile, clienteId, expedienteId, instruccion: pdfInstruccion },
      (t) => { acc += t; setPdfOut(acc); },
      () => setPdfStreaming(false),
      (e) => { setErr(e); setPdfStreaming(false); }
    );
  };

  if (!iaOpen) return null;

  const TABS_IA = [
    { key: "resumir", label: "📋 Resumir" },
    { key: "plazos",  label: "⏱ Plazos" },
    { key: "chat",    label: "💬 Chat" },
    { key: "pdf",     label: "📄 PDF" },
  ];

  return (
    <div style={{
      position: "fixed", right: 0, top: 0, bottom: 0, width: 390,
      background: C.surface, borderLeft: `1px solid ${C.border}`,
      display: "flex", flexDirection: "column", zIndex: 1000,
      boxShadow: "-6px 0 24px rgba(0,0,0,.18)",
    }}>
      <style>{mdStyles(C)}</style>
      {/* Header */}
      <div style={{ padding: "14px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <span style={{ fontSize: 20 }}>🤖</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Doctor IA</div>
          <div style={{ fontSize: 10, color: C.muted }}>
            {expedienteId ? "Contexto del expediente cargado ✓" : "Sin expediente activo"}{" "}
            <span style={{ opacity: .5 }}>· Ctrl/⌘ I para cerrar</span>
          </div>
        </div>
        <button onClick={() => setIaOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: 20, lineHeight: 1, padding: 4 }}>×</button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        {TABS_IA.map((t) => (
          <div key={t.key} onClick={() => setIaTab(t.key)}
            style={{ flex: 1, padding: "9px 4px", textAlign: "center", cursor: "pointer", fontSize: 12,
              fontWeight: iaTab === t.key ? 700 : 400, color: iaTab === t.key ? C.accent : C.muted,
              borderBottom: iaTab === t.key ? `2px solid ${C.accent}` : "2px solid transparent" }}>
            {t.label}
          </div>
        ))}
      </div>

      {/* ── RESUMIR ── */}
      {iaTab === "resumir" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, padding: 16, gap: 12 }}>
          <Btn C={C} onClick={handleResumir} disabled={streaming || !expedienteId}
            style={{ opacity: !expedienteId ? .45 : 1, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "white", border: "none" }}>
            {streaming ? "⏳ Generando…" : "✨ Resumir este expediente"}
          </Btn>
          {!expedienteId && <div style={{ fontSize: 11, color: C.muted, textAlign: "center" }}>Abrí un expediente para usar esta función.</div>}
          {err && <div style={{ fontSize: 11, color: "#ef4444" }}>{err}</div>}
          {resumirOut && (
            <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14, fontFamily: "inherit" }}>
              <div className="md-ia" style={{ fontSize: 12, color: C.text, lineHeight: 1.75 }}
                dangerouslySetInnerHTML={{ __html: mdHtml(resumirOut) }} />
              {streaming && <span style={{ color: C.accent }}>▌</span>}
            </div>
          )}
        </div>
      )}

      {/* ── PLAZOS ── */}
      {iaTab === "plazos" && (
        <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Field C={C} label="Fecha de inicio">
              <Input C={C} type="date" value={plazoForm.fecha_inicio} onChange={(e) => setPlazoForm((p) => ({ ...p, fecha_inicio: e.target.value }))} />
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <Field C={C} label="Cantidad">
                <Input C={C} type="number" min="1" value={plazoForm.cantidad} onChange={(e) => setPlazoForm((p) => ({ ...p, cantidad: e.target.value }))} placeholder="5" />
              </Field>
              <Field C={C} label="Tipo">
                <Sel C={C} value={plazoForm.tipo} onChange={(e) => setPlazoForm((p) => ({ ...p, tipo: e.target.value }))}
                  options={[
                    { value: "dias_habiles_judiciales",      label: "Hábiles judiciales" },
                    { value: "dias_habiles_administrativos", label: "Hábiles admin." },
                    { value: "dias_corridos",                label: "Corridos" },
                    { value: "meses",                        label: "Meses" },
                    { value: "anios",                        label: "Años" },
                  ]} />
              </Field>
            </div>
            <Btn C={C} onClick={handlePlazo} disabled={streaming}>
              {streaming ? "⏳ Calculando…" : "⚡ Calcular y explicar con IA"}
            </Btn>
          </div>

          {err && <div style={{ fontSize: 11, color: "#ef4444" }}>{err}</div>}

          {plazoResult && (
            <div style={{ background: `${C.accent}18`, border: `1px solid ${C.accent}44`, borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: 10, color: C.muted, letterSpacing: 1, marginBottom: 4 }}>VENCIMIENTO</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: C.accent, marginBottom: 6 }}>{plazoResult.fechaVencimientoDisplay}</div>
              {plazoResult.diasExcluidos.length > 0 && (
                <div style={{ fontSize: 11, color: C.muted }}>
                  {plazoResult.diasExcluidos.length} día{plazoResult.diasExcluidos.length > 1 ? "s" : ""} excluido{plazoResult.diasExcluidos.length > 1 ? "s" : ""}:
                  {" "}{plazoResult.diasExcluidos.slice(0, 3).map((d) => d.display).join(", ")}
                  {plazoResult.diasExcluidos.length > 3 ? "…" : ""}
                </div>
              )}
            </div>
          )}

          {plazoExpl && (
            <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14 }}>
              <div className="md-ia" style={{ fontSize: 12, color: C.text, lineHeight: 1.75 }}
                dangerouslySetInnerHTML={{ __html: mdHtml(plazoExpl) }} />
              {streaming && <span style={{ color: C.accent }}>▌</span>}
            </div>
          )}
        </div>
      )}

      {/* ── CHAT ── */}
      {iaTab === "chat" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
            {chatHistory.length === 0 && !streamingMsg && (
              <div style={{ fontSize: 12, color: C.muted, textAlign: "center", padding: "24px 8px" }}>
                {expedienteId ? "Consultá sobre el expediente activo." : "Abrí un expediente para consultas contextualizadas, o consultá libremente."}
              </div>
            )}
            {chatHistory.map((msg, i) => (
              msg.role === "user" ? (
                <div key={i} style={{
                  alignSelf: "flex-end", maxWidth: "88%", padding: "8px 12px",
                  borderRadius: "12px 12px 2px 12px", background: C.accent,
                  color: "white", fontSize: 12, lineHeight: 1.65, whiteSpace: "pre-wrap",
                }}>
                  {msg.content}
                </div>
              ) : (
                <div key={i} className="md-ia" style={{
                  alignSelf: "flex-start", maxWidth: "88%", padding: "8px 12px",
                  borderRadius: "12px 12px 12px 2px", background: C.bg,
                  color: C.text, fontSize: 12, lineHeight: 1.65,
                  border: `1px solid ${C.border}`,
                }}
                  dangerouslySetInnerHTML={{ __html: mdHtml(msg.content) }} />
              )
            ))}
            {streamingMsg && (
              <div style={{ alignSelf: "flex-start", maxWidth: "88%", padding: "8px 12px", borderRadius: "12px 12px 12px 2px", background: C.bg, border: `1px solid ${C.border}`, color: C.text, fontSize: 12, lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
                {streamingMsg}<span style={{ color: C.accent }}>▌</span>
              </div>
            )}
            {streaming && !streamingMsg && (
              <div style={{ alignSelf: "flex-start", padding: "8px 12px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: "12px 12px 12px 2px", fontSize: 12, color: C.muted }}>●●●</div>
            )}
          </div>
          {err && <div style={{ fontSize: 11, color: "#ef4444", padding: "0 14px 6px" }}>{err}</div>}
          <div style={{ padding: "8px 12px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 8, alignItems: "flex-end", flexShrink: 0 }}>
            <textarea
              value={chatInput} onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleChat(); } }}
              placeholder="Consultá… (Enter enviar, Shift+Enter nueva línea)"
              style={{ ...inputSt(C), flex: 1, minHeight: 56, maxHeight: 112, resize: "none", fontSize: 12 }}
              disabled={streaming}
            />
            <Btn C={C} onClick={handleChat} disabled={streaming || !chatInput.trim()} style={{ height: 56, minWidth: 40, fontSize: 16, padding: "0 12px" }}>↑</Btn>
          </div>
        </div>
      )}

      {/* ── PDF ── */}
      {iaTab === "pdf" && (
        <div style={{ flex:1, display:"flex", flexDirection:"column", minHeight:0, padding:16, gap:12 }}>
          <div>
            <div style={{ fontSize:12, color:C.muted, marginBottom:6 }}>Archivo PDF (máx. 20 MB)</div>
            <input type="file" accept="application/pdf"
              onChange={e => { setPdfFile(e.target.files[0]||null); setPdfOut(""); }}
              style={{ fontSize:12, color:C.text, width:"100%" }} />
            {pdfFile && <div style={{ fontSize:11, color:C.muted, marginTop:4 }}>📄 {pdfFile.name} ({(pdfFile.size/1024/1024).toFixed(1)} MB)</div>}
          </div>
          <Field C={C} label="Instrucción (opcional)">
            <textarea value={pdfInstruccion} onChange={e=>setPdfInstruccion(e.target.value)}
              placeholder="Ej: Extraé los plazos y obligaciones de esta parte..."
              style={{ ...inputSt(C), width:"100%", boxSizing:"border-box", minHeight:60, resize:"vertical", fontSize:12 }} />
          </Field>
          <Btn C={C} onClick={handleAnalizarPdf} disabled={!pdfFile || pdfStreaming}
            style={{ background:"linear-gradient(135deg,#6366f1,#8b5cf6)", color:"white", border:"none" }}>
            {pdfStreaming ? "⏳ Analizando…" : "📄 Analizar PDF"}
          </Btn>
          {err && <div style={{ fontSize:11, color:"#ef4444" }}>{err}</div>}
          {pdfOut && (
            <div ref={scrollRef} style={{ flex:1, overflowY:"auto", background:C.bg, border:`1px solid ${C.border}`, borderRadius:10, padding:14 }}>
              <div className="md-ia" style={{ fontSize:12, color:C.text, lineHeight:1.75 }}
                dangerouslySetInnerHTML={{ __html: mdHtml(pdfOut) }} />
              {pdfStreaming && <span style={{ color:C.accent }}>▌</span>}
            </div>
          )}
        </div>
      )}

      {/* Footer disclaimer */}
      <div style={{ padding: "6px 12px", borderTop: `1px solid ${C.border}`, fontSize: 10, color: C.muted, lineHeight: 1.4, flexShrink: 0 }}>
        Esta herramienta es un asistente. La responsabilidad profesional es del abogado matriculado.
      </div>
    </div>
  );
}

// ── Página Doctor IA (pantalla completa, sub-tab "ia") ────────

function DoctorIAPage({ C, clienteId, expedienteId }) {
  const [chatHistory, setChatHistory]   = useState([]);
  const [chatInput, setChatInput]       = useState("");
  const [streaming, setStreaming]       = useState(false);
  const [streamingMsg, setStreamingMsg] = useState("");
  const [err, setErr]                   = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, streamingMsg]);

  // Reset al cambiar expediente
  useEffect(() => {
    setChatHistory([]); setStreamingMsg(""); setErr("");
  }, [expedienteId]);

  const handleChat = async () => {
    if (!chatInput.trim() || streaming) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    const snapshot = [...chatHistory];
    setChatHistory((p) => [...p, { role: "user", content: userMsg }]);
    setStreamingMsg(""); setStreaming(true); setErr("");
    let acc = "";
    await streamIA(
      { clienteId, capacidad: "chat", expedienteId, mensaje: userMsg, historial: snapshot },
      (t) => { acc += t; setStreamingMsg(acc); },
      () => {
        setChatHistory((p) => [...p, { role: "assistant", content: acc }]);
        setStreamingMsg(""); setStreaming(false);
      },
      (e) => { setErr(e); setStreaming(false); }
    );
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <style>{mdStyles(C)}</style>
      {/* Header */}
      <div style={{ padding: "16px 24px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>🤖 Doctor IA — Chat</div>
        <div style={{ fontSize: 12, color: C.muted }}>
          {expedienteId ? "Contexto del expediente activo cargado." : "Sin expediente abierto — modo libre."}
          {" · "}Historial de sesión (no persiste al refrescar)
        </div>
      </div>

      {/* Mensajes */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 14, justifyContent: chatHistory.length === 0 && !streamingMsg ? "center" : "flex-start" }}>
        {chatHistory.length === 0 && !streamingMsg && (
          <EmptyState C={C} icon="🤖" title="Doctor IA listo"
            sub={expedienteId ? "El expediente activo está cargado como contexto. Hacé tu consulta jurídica." : "Hacé una consulta jurídica libre o abrí un expediente para contexto."}
          />
        )}
        {chatHistory.map((msg, i) => (
          msg.role === "user" ? (
            <div key={i} style={{
              alignSelf: "flex-end", maxWidth: "68%", padding: "12px 18px",
              borderRadius: "18px 18px 4px 18px", background: C.accent,
              color: "white", fontSize: 13, lineHeight: 1.75, whiteSpace: "pre-wrap",
            }}>
              {msg.content}
            </div>
          ) : (
            <div key={i} className="md-ia" style={{
              alignSelf: "flex-start", maxWidth: "68%", padding: "12px 18px",
              borderRadius: "18px 18px 18px 4px", background: C.surface,
              color: C.text, fontSize: 13, lineHeight: 1.75,
              border: `1px solid ${C.border}`,
            }}
              dangerouslySetInnerHTML={{ __html: mdHtml(msg.content) }} />
          )
        ))}
        {streamingMsg && (
          <div style={{ alignSelf: "flex-start", maxWidth: "68%", padding: "12px 18px", borderRadius: "18px 18px 18px 4px", background: C.surface, border: `1px solid ${C.border}`, color: C.text, fontSize: 13, lineHeight: 1.75, whiteSpace: "pre-wrap" }}>
            {streamingMsg}<span style={{ color: C.accent }}>▌</span>
          </div>
        )}
        {streaming && !streamingMsg && (
          <div style={{ alignSelf: "flex-start", padding: "12px 18px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: "18px 18px 18px 4px", fontSize: 13, color: C.muted }}>
            ●●● generando…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {err && <div style={{ padding: "0 24px 8px", fontSize: 12, color: "#ef4444" }}>{err}</div>}

      {/* Input */}
      <div style={{ padding: "16px 24px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 12, alignItems: "flex-end", flexShrink: 0 }}>
        <textarea
          value={chatInput} onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleChat(); } }}
          placeholder="Consultá sobre el expediente, cita de artículos, estrategia… (Enter = enviar, Shift+Enter = nueva línea)"
          style={{ ...inputSt(C), flex: 1, minHeight: 72, maxHeight: 160, resize: "none" }}
          disabled={streaming}
        />
        <Btn C={C} onClick={handleChat} disabled={streaming || !chatInput.trim()} style={{ height: 72, minWidth: 56, fontSize: 20, padding: "0 16px" }}>↑</Btn>
      </div>

      <div style={{ padding: "8px 24px 10px", fontSize: 10, color: C.muted, flexShrink: 0 }}>
        Esta herramienta es un asistente. La responsabilidad profesional es del abogado matriculado.
      </div>
    </div>
  );
}

// ── Agenda ────────────────────────────────────────────────────

const TIPO_AGENDA_COLOR = {
  audiencia:    "#E84E0F",
  vencimiento:  "#FBBA00",
  reunion:      "#F39200",
  tarea:        "#646464",
  recordatorio: "#10B981",
};
const TIPOS_AGENDA = [
  { value: "audiencia",    label: "Audiencia" },
  { value: "vencimiento",  label: "Vencimiento" },
  { value: "reunion",      label: "Reunión" },
  { value: "tarea",        label: "Tarea" },
  { value: "recordatorio", label: "Recordatorio" },
];
const ESTADOS_AGENDA = [
  { value: "pendiente",  label: "Pendiente" },
  { value: "completado", label: "Completado" },
  { value: "cancelado",  label: "Cancelado" },
];
const DIAS_SEMANA_AG = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MESES_ES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function fmtDatetimeLocal(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}T${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}

// ── EventoModal ────────────────────────────────────────────────
function EventoModal({ C, clienteId, evento, fechaInicio, expedienteIdPreset, expedientes, onSave, onDelete, onSuccess, onClose }) {
  const isNew = !evento;
  const initFecha = fechaInicio ? fmtDatetimeLocal(fechaInicio) : "";
  const [form, setForm] = useState({
    titulo:        evento?.titulo || "",
    tipo:          evento?.tipo || "tarea",
    fecha_inicio:  evento ? fmtDatetimeLocal(evento.fecha_inicio) : initFecha,
    fecha_fin:     evento ? fmtDatetimeLocal(evento.fecha_fin) : "",
    todo_el_dia:   evento?.todo_el_dia || false,
    descripcion:   evento?.descripcion || "",
    expediente_id: evento?.expediente_id || expedienteIdPreset || "",
    estado:        evento?.estado || "pendiente",
  });
  const [saving, setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [err, setErr]         = useState("");
  const [plazoOpen, setPlazoOpen] = useState(false);
  const [plazoForm, setPlazoForm] = useState({ fecha_inicio: "", cantidad: "5", tipo: "dias_habiles_judiciales" });
  const [plazoResult, setPlazoResult] = useState(null);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handlePlazo = () => {
    if (!plazoForm.fecha_inicio || !plazoForm.cantidad) return;
    try { setPlazoResult(calcularPlazo(plazoForm.fecha_inicio, parseInt(plazoForm.cantidad), plazoForm.tipo)); }
    catch { setPlazoResult(null); }
  };

  const aplicarPlazo = () => {
    if (!plazoResult) return;
    const d = plazoResult.fechaVencimiento;
    set("fecha_fin", `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}T23:59`);
    setPlazoOpen(false);
  };

  const handleSave = async () => {
    if (!form.titulo.trim()) return setErr("El título es obligatorio.");
    if (!form.fecha_inicio)  return setErr("La fecha de inicio es obligatoria.");
    setSaving(true); setErr("");
    try {
      const body = { cliente_id: clienteId, ...form, expediente_id: form.expediente_id || null, asignados: [] };
      const r = await fetch(
        isNew ? `${API}/api/doctor/agenda` : `${API}/api/doctor/agenda/${evento.id}`,
        { method: isNew ? "POST" : "PUT", headers: jH(), body: JSON.stringify(body) }
      );
      if (!r.ok) throw new Error((await r.json()).error);
      onSave(await r.json());
      onSuccess?.();
    } catch (e) { setErr(e.message); } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!window.confirm("¿Eliminar este evento?")) return;
    setDeleting(true);
    try {
      await fetch(`${API}/api/doctor/agenda/${evento.id}?cliente_id=${clienteId}`, { method: "DELETE", headers: aH() });
      onDelete(evento.id);
      onSuccess?.();
    } catch (e) { setErr(e.message); } finally { setDeleting(false); }
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.6)", zIndex:2000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }} onClick={onClose}>
      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, width:"100%", maxWidth:520, maxHeight:"90vh", overflowY:"auto", padding:24 }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:"flex", alignItems:"center", marginBottom:20 }}>
          <div style={{ fontSize:16, fontWeight:700, color:C.text, flex:1 }}>{isNew ? "Nuevo evento" : "Editar evento"}</div>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", fontSize:22, color:C.muted, padding:0, lineHeight:1 }}>×</button>
        </div>

        {/* Tipo */}
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:11, color:C.muted, marginBottom:6, fontWeight:600, letterSpacing:".5px" }}>TIPO</div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {TIPOS_AGENDA.map(t => (
              <div key={t.value} onClick={() => set("tipo", t.value)} style={{
                padding:"5px 12px", borderRadius:99, cursor:"pointer", fontSize:12, fontWeight:600,
                background: form.tipo===t.value ? TIPO_AGENDA_COLOR[t.value] : C.bg,
                color:      form.tipo===t.value ? "white" : C.muted,
                border:     `1px solid ${form.tipo===t.value ? TIPO_AGENDA_COLOR[t.value] : C.border}`,
                transition:"all .15s",
              }}>{t.label}</div>
            ))}
          </div>
        </div>

        <Field C={C} label="Título *">
          <Input C={C} value={form.titulo} onChange={e=>set("titulo",e.target.value)} placeholder="Ej: Audiencia preliminar" />
        </Field>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:14 }}>
          <Field C={C} label="Fecha inicio *">
            <input type="datetime-local" value={form.fecha_inicio} onChange={e=>set("fecha_inicio",e.target.value)}
              style={{ ...inputSt(C), width:"100%", boxSizing:"border-box" }} />
          </Field>
          <Field C={C} label="Fecha fin">
            <input type="datetime-local" value={form.fecha_fin} onChange={e=>set("fecha_fin",e.target.value)}
              style={{ ...inputSt(C), width:"100%", boxSizing:"border-box" }} />
          </Field>
        </div>

        {/* Calcular con plazos.js */}
        <div style={{ marginBottom:14, background:C.bg, borderRadius:8, border:`1px solid ${C.border}`, overflow:"hidden" }}>
          <div onClick={() => setPlazoOpen(p=>!p)} style={{ display:"flex", alignItems:"center", gap:8, padding:"9px 12px", cursor:"pointer", color:C.accent, fontSize:12, fontWeight:600 }}>
            <span style={{ fontSize:10 }}>{plazoOpen?"▼":"▶"}</span> Calcular fecha fin con plazos.js
          </div>
          {plazoOpen && (
            <div style={{ padding:"0 12px 12px", borderTop:`1px solid ${C.border}` }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 72px 1fr", gap:8, alignItems:"flex-end", marginBottom:8, marginTop:10 }}>
                <Field C={C} label="Fecha base">
                  <input type="date" value={plazoForm.fecha_inicio} onChange={e=>setPlazoForm(p=>({...p,fecha_inicio:e.target.value}))}
                    style={{ ...inputSt(C), width:"100%", boxSizing:"border-box" }} />
                </Field>
                <Field C={C} label="Cant.">
                  <input type="number" min="1" value={plazoForm.cantidad} onChange={e=>setPlazoForm(p=>({...p,cantidad:e.target.value}))}
                    style={{ ...inputSt(C), width:"100%", boxSizing:"border-box" }} />
                </Field>
                <Field C={C} label="Tipo">
                  <Sel C={C} value={plazoForm.tipo} onChange={e=>setPlazoForm(p=>({...p,tipo:e.target.value}))} options={[
                    { value:"dias_habiles_judiciales",      label:"Háb. judiciales" },
                    { value:"dias_habiles_administrativos", label:"Háb. admin." },
                    { value:"dias_corridos",                label:"Corridos" },
                    { value:"meses",                        label:"Meses" },
                    { value:"anios",                        label:"Años" },
                  ]} />
                </Field>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
                <Btn C={C} onClick={handlePlazo} style={{ fontSize:12 }}>⚡ Calcular</Btn>
                {plazoResult && <>
                  <span style={{ fontSize:13, fontWeight:700, color:C.accent }}>→ {plazoResult.fechaVencimientoDisplay}</span>
                  <Btn C={C} onClick={aplicarPlazo} style={{ fontSize:12 }}>Aplicar como fecha fin</Btn>
                </>}
              </div>
            </div>
          )}
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
          <input type="checkbox" id="ag_todo_dia" checked={form.todo_el_dia} onChange={e=>set("todo_el_dia",e.target.checked)} />
          <label htmlFor="ag_todo_dia" style={{ fontSize:13, color:C.text, cursor:"pointer" }}>Todo el día</label>
        </div>

        {expedienteIdPreset ? (
          <Field C={C} label="Expediente vinculado">
            <div style={{ fontSize: 13, color: C.text, padding: "8px 0" }}>
              {expedientes.find(e => String(e.id) === String(expedienteIdPreset))?.caratula
                || `Expediente #${expedienteIdPreset}`}
            </div>
          </Field>
        ) : (
          <Field C={C} label="Expediente vinculado (opcional)">
            <Sel C={C} value={form.expediente_id} onChange={e=>set("expediente_id",e.target.value)}
              options={[{ value:"", label:"— Sin expediente —" }, ...expedientes.map(e=>({ value:e.id, label:e.caratula }))]} />
          </Field>
        )}
        <Field C={C} label="Estado">
          <Sel C={C} value={form.estado} onChange={e=>set("estado",e.target.value)} options={ESTADOS_AGENDA} />
        </Field>
        <Field C={C} label="Descripción">
          <textarea value={form.descripcion} onChange={e=>set("descripcion",e.target.value)} placeholder="Detalles adicionales..."
            style={{ ...inputSt(C), width:"100%", boxSizing:"border-box", minHeight:60, resize:"vertical" }} />
        </Field>

        {err && <div style={{ color:"#ef4444", fontSize:12, marginBottom:12 }}>{err}</div>}

        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
          {!isNew && <Btn C={C} variant="ghost" onClick={handleDelete} disabled={deleting} style={{ color:"#ef4444", marginRight:"auto" }}>{deleting?"…":"🗑 Eliminar"}</Btn>}
          <Btn C={C} variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn C={C} onClick={handleSave} disabled={saving}>{saving?"Guardando…":isNew?"Crear evento":"Guardar"}</Btn>
        </div>
      </div>
    </div>
  );
}

// ── Vistas del calendario ──────────────────────────────────────

function VistaMes({ C, fechaRef, eventos, onDiaClick, onEventoClick }) {
  const año = fechaRef.getFullYear();
  const mes = fechaRef.getMonth();
  const primerDia = new Date(año, mes, 1);
  const offsetLun = (primerDia.getDay() + 6) % 7;
  const diasMes = new Date(año, mes + 1, 0).getDate();
  const hoy = new Date();

  const celdas = [];
  for (let i = 0; i < offsetLun; i++) celdas.push({ fecha: new Date(año, mes, -(offsetLun - i - 1)), esEsteMes: false });
  for (let d = 1; d <= diasMes; d++) celdas.push({ fecha: new Date(año, mes, d), esEsteMes: true });
  while (celdas.length % 7 !== 0) {
    const ult = celdas[celdas.length - 1].fecha;
    celdas.push({ fecha: new Date(ult.getFullYear(), ult.getMonth(), ult.getDate() + 1), esEsteMes: false });
  }

  const evsByDay = {};
  eventos.forEach(ev => {
    const k = new Date(ev.fecha_inicio).toLocaleDateString("sv-SE");
    if (!evsByDay[k]) evsByDay[k] = [];
    evsByDay[k].push(ev);
  });

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", minHeight:0 }}>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", borderBottom:`1px solid ${C.border}`, flexShrink:0 }}>
        {DIAS_SEMANA_AG.map(d => (
          <div key={d} style={{ textAlign:"center", padding:"7px 4px", fontSize:11, fontWeight:600, color:C.muted, letterSpacing:".5px" }}>{d}</div>
        ))}
      </div>
      <div style={{ flex:1, display:"grid", gridTemplateColumns:"repeat(7,1fr)", gridAutoRows:"1fr", overflow:"hidden" }}>
        {celdas.map(({ fecha, esEsteMes }, i) => {
          const k = fecha.toLocaleDateString("sv-SE");
          const evs = evsByDay[k] || [];
          const esHoy = fecha.toDateString() === hoy.toDateString();
          return (
            <div key={i} onClick={() => onDiaClick(fecha)}
              style={{ border:`1px solid ${C.border}`, padding:"5px 4px", cursor:"pointer", overflow:"hidden",
                background: esHoy ? `${C.accent}12` : C.surface, opacity: esEsteMes ? 1 : .4, transition:"background .1s" }}
              onMouseEnter={e => e.currentTarget.style.background = `${C.accent}14`}
              onMouseLeave={e => e.currentTarget.style.background = esHoy ? `${C.accent}12` : C.surface}>
              <div style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", width:22, height:22, borderRadius:"50%", fontSize:12,
                fontWeight: esHoy ? 700 : 400, color: esHoy ? "white" : esEsteMes ? C.text : C.muted,
                background: esHoy ? C.accent : "none", marginBottom:2 }}>
                {fecha.getDate()}
              </div>
              {evs.slice(0, 3).map(ev => (
                <div key={ev.id} onClick={e => { e.stopPropagation(); onEventoClick(ev); }}
                  style={{ fontSize:10, padding:"1px 5px", borderRadius:4, marginBottom:2, cursor:"pointer",
                    background:`${TIPO_AGENDA_COLOR[ev.tipo]||"#646464"}22`,
                    color: TIPO_AGENDA_COLOR[ev.tipo]||"#646464",
                    border:`1px solid ${TIPO_AGENDA_COLOR[ev.tipo]||"#646464"}44`,
                    whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                  {ev.titulo}
                </div>
              ))}
              {evs.length > 3 && <div style={{ fontSize:10, color:C.muted }}>+{evs.length - 3} más</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function VistaSemana({ C, fechaRef, eventos, onEventoClick, onSlotClick }) {
  const lunes = new Date(fechaRef);
  lunes.setDate(fechaRef.getDate() - ((fechaRef.getDay() + 6) % 7));
  const dias = Array.from({ length: 7 }, (_, i) => { const d = new Date(lunes); d.setDate(lunes.getDate() + i); return d; });
  const horas = Array.from({ length: 16 }, (_, i) => i + 7);
  const hoy = new Date();
  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", minHeight:0, overflowY:"auto" }}>
      <div style={{ display:"grid", gridTemplateColumns:"48px repeat(7,1fr)", borderBottom:`1px solid ${C.border}`, flexShrink:0, position:"sticky", top:0, background:C.surface, zIndex:1 }}>
        <div />
        {dias.map((d, i) => (
          <div key={i} style={{ textAlign:"center", padding:"7px 4px", borderLeft:`1px solid ${C.border}` }}>
            <div style={{ fontSize:10, color:C.muted }}>{DIAS_SEMANA_AG[i]}</div>
            <div style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", width:26, height:26, borderRadius:"50%", fontSize:13, fontWeight:600,
              background: d.toDateString()===hoy.toDateString() ? C.accent : "none",
              color:      d.toDateString()===hoy.toDateString() ? "white" : C.text }}>
              {d.getDate()}
            </div>
          </div>
        ))}
      </div>
      {horas.map(h => (
        <div key={h} style={{ display:"grid", gridTemplateColumns:"48px repeat(7,1fr)", minHeight:52, borderBottom:`1px solid ${C.border}40` }}>
          <div style={{ fontSize:10, color:C.muted, padding:"4px 6px", textAlign:"right" }}>{String(h).padStart(2,"0")}:00</div>
          {dias.map((d, di) => {
            const clave = d.toLocaleDateString("sv-SE");
            const evsSlot = eventos.filter(ev => {
              const fi = new Date(ev.fecha_inicio);
              return fi.toLocaleDateString("sv-SE") === clave && fi.getHours() === h;
            });
            return (
              <div key={di} onClick={() => { const f = new Date(d); f.setHours(h,0,0); onSlotClick(f); }}
                style={{ borderLeft:`1px solid ${C.border}`, padding:"2px 3px", cursor:"pointer" }}
                onMouseEnter={e => e.currentTarget.style.background = `${C.accent}08`}
                onMouseLeave={e => e.currentTarget.style.background = ""}>
                {evsSlot.map(ev => (
                  <div key={ev.id} onClick={e => { e.stopPropagation(); onEventoClick(ev); }}
                    style={{ fontSize:10, padding:"2px 5px", borderRadius:4, marginBottom:2, cursor:"pointer",
                      background: TIPO_AGENDA_COLOR[ev.tipo]||"#646464", color:"white",
                      whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                    {String(new Date(ev.fecha_inicio).getHours()).padStart(2,"0")}:{String(new Date(ev.fecha_inicio).getMinutes()).padStart(2,"0")} {ev.titulo}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function VistaDia({ C, fechaRef, eventos, onEventoClick, onSlotClick }) {
  const clave = fechaRef.toLocaleDateString("sv-SE");
  const evsDia = eventos.filter(ev => new Date(ev.fecha_inicio).toLocaleDateString("sv-SE") === clave);
  return (
    <div style={{ flex:1, overflowY:"auto" }}>
      <div style={{ padding:"12px 16px", borderBottom:`1px solid ${C.border}`, fontWeight:700, color:C.text, fontSize:14, flexShrink:0 }}>
        {DIAS_SEMANA_AG[(fechaRef.getDay()+6)%7]}, {fechaRef.getDate()} de {MESES_ES[fechaRef.getMonth()]} {fechaRef.getFullYear()}
      </div>
      {Array.from({ length:24 }, (_,h) => {
        const evsHora = evsDia.filter(ev => new Date(ev.fecha_inicio).getHours() === h);
        return (
          <div key={h} onClick={() => { const f = new Date(fechaRef); f.setHours(h,0,0); onSlotClick(f); }}
            style={{ display:"flex", minHeight:52, borderBottom:`1px solid ${C.border}40`, cursor:"pointer" }}
            onMouseEnter={e => e.currentTarget.style.background = `${C.accent}08`}
            onMouseLeave={e => e.currentTarget.style.background = ""}>
            <div style={{ width:52, flexShrink:0, fontSize:11, color:C.muted, padding:"6px 8px", textAlign:"right" }}>{String(h).padStart(2,"0")}:00</div>
            <div style={{ flex:1, padding:"4px 8px", borderLeft:`1px solid ${C.border}` }}>
              {evsHora.map(ev => (
                <div key={ev.id} onClick={e => { e.stopPropagation(); onEventoClick(ev); }}
                  style={{ display:"inline-flex", gap:8, alignItems:"center", padding:"4px 10px", borderRadius:6, marginBottom:4, cursor:"pointer",
                    background: TIPO_AGENDA_COLOR[ev.tipo]||"#646464", color:"white", fontSize:12 }}>
                  <span>{String(new Date(ev.fecha_inicio).getHours()).padStart(2,"0")}:{String(new Date(ev.fecha_inicio).getMinutes()).padStart(2,"0")}</span>
                  <span>{ev.titulo}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function VistaAgenda({ C, fechaRef, eventos, onEventoClick }) {
  const base = new Date(fechaRef); base.setHours(0,0,0,0);
  const futuros = [...eventos].filter(ev => new Date(ev.fecha_inicio) >= base)
    .sort((a,b) => new Date(a.fecha_inicio) - new Date(b.fecha_inicio));
  const grupos = {};
  futuros.forEach(ev => {
    const k = new Date(ev.fecha_inicio).toLocaleDateString("sv-SE");
    if (!grupos[k]) grupos[k] = [];
    grupos[k].push(ev);
  });
  if (!futuros.length) return <EmptyState C={C} icon="📅" title="Sin eventos" sub="No hay eventos en este período." />;
  return (
    <div style={{ flex:1, overflowY:"auto", padding:16 }}>
      {Object.entries(grupos).map(([k, evs]) => {
        const f = new Date(k + "T12:00:00");
        return (
          <div key={k} style={{ marginBottom:20 }}>
            <div style={{ fontSize:12, fontWeight:700, color:C.muted, letterSpacing:".5px", marginBottom:8, paddingBottom:4, borderBottom:`1px solid ${C.border}` }}>
              {DIAS_SEMANA_AG[(f.getDay()+6)%7]}, {f.getDate()} de {MESES_ES[f.getMonth()]} {f.getFullYear()}
            </div>
            {evs.map(ev => (
              <div key={ev.id} onClick={() => onEventoClick(ev)}
                style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 12px", borderRadius:8, marginBottom:6, cursor:"pointer", background:C.bg, border:`1px solid ${C.border}` }}
                onMouseEnter={e => e.currentTarget.style.borderColor = TIPO_AGENDA_COLOR[ev.tipo]||C.accent}
                onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
                <div style={{ width:4, height:36, borderRadius:2, background:TIPO_AGENDA_COLOR[ev.tipo]||"#646464", flexShrink:0 }} />
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:C.text }}>{ev.titulo}</div>
                  <div style={{ fontSize:11, color:C.muted }}>
                    {!ev.todo_el_dia && new Date(ev.fecha_inicio).toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"})}
                    {ev.expediente_caratula && <span> · {ev.expediente_caratula}</span>}
                  </div>
                </div>
                <Chip label={TIPOS_AGENDA.find(t=>t.value===ev.tipo)?.label||ev.tipo} color={TIPO_AGENDA_COLOR[ev.tipo]||"#646464"} />
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ── ProximosVencimientos ──────────────────────────────────────
function ProximosVencimientos({ C, clienteId, refreshKey, onEventoClick }) {
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!clienteId) return;
    setLoading(true);
    fetch(`${API}/api/doctor/agenda/proximos?cliente_id=${clienteId}&dias=30`, { headers: aH() })
      .then(r => r.ok ? r.json() : []).then(setEventos).catch(() => {}).finally(() => setLoading(false));
  }, [clienteId, refreshKey]);
  const colorDias = d => d <= 3 ? "#ef4444" : d <= 7 ? "#FBBA00" : "#10B981";
  return (
    <div style={{ width:252, flexShrink:0, borderLeft:`1px solid ${C.border}`, display:"flex", flexDirection:"column", minHeight:0 }}>
      <div style={{ padding:"11px 14px", borderBottom:`1px solid ${C.border}`, fontSize:12, fontWeight:700, color:C.text, flexShrink:0 }}>📌 Próximos 30 días</div>
      <div style={{ flex:1, overflowY:"auto", padding:8 }}>
        {loading && <Spinner C={C} />}
        {!loading && !eventos.length && <div style={{ textAlign:"center", padding:20, fontSize:12, color:C.muted }}>Sin vencimientos próximos</div>}
        {eventos.map(ev => {
          const diasR = Math.max(0, Math.ceil(parseFloat(ev.dias_restantes)));
          return (
            <div key={ev.id} onClick={() => onEventoClick(ev)}
              style={{ padding:"8px 10px", borderRadius:8, marginBottom:6, cursor:"pointer", background:C.bg, border:`1px solid ${C.border}` }}
              onMouseEnter={e => e.currentTarget.style.borderColor = TIPO_AGENDA_COLOR[ev.tipo]||C.accent}
              onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
              <div style={{ display:"flex", gap:6 }}>
                <div style={{ width:3, borderRadius:2, background:TIPO_AGENDA_COLOR[ev.tipo]||"#646464", flexShrink:0 }} />
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:C.text, lineHeight:1.3 }}>{ev.titulo}</div>
                  {ev.expediente_caratula && <div style={{ fontSize:10, color:C.muted }}>{ev.expediente_caratula}</div>}
                  <div style={{ fontSize:11, fontWeight:700, color:colorDias(diasR), marginTop:2 }}>
                    {diasR <= 0 ? "¡Hoy!" : diasR === 1 ? "Mañana" : `En ${diasR} días`}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── AgendaModule ──────────────────────────────────────────────
function AgendaModule({ C, clienteId, onAgendaChange }) {
  const hoy = new Date();
  const [vista, setVista]       = useState("mes");
  const [fechaRef, setFechaRef] = useState(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
  const [eventos, setEventos]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modalOpen, setModalOpen]   = useState(false);
  const [eventoSel, setEventoSel]   = useState(null);
  const [fechaModal, setFechaModal] = useState(null);
  const [expedientes, setExpedientes] = useState([]);
  const [proximosKey, setProximosKey] = useState(0);

  useEffect(() => {
    if (!clienteId) return;
    fetch(`${API}/api/doctor/expedientes?cliente_id=${clienteId}`, { headers: aH() })
      .then(r => r.ok ? r.json() : []).then(d => setExpedientes(Array.isArray(d) ? d : [])).catch(() => {});
  }, [clienteId]);

  const cargarEventos = useCallback(() => {
    if (!clienteId) return;
    setLoading(true);
    const mes = fechaRef.getMonth() + 1, anio = fechaRef.getFullYear();
    fetch(`${API}/api/doctor/agenda?cliente_id=${clienteId}&mes=${mes}&anio=${anio}`, { headers: aH() })
      .then(r => r.ok ? r.json() : []).then(setEventos).catch(() => {}).finally(() => setLoading(false));
  }, [clienteId, fechaRef]);

  useEffect(() => { cargarEventos(); }, [cargarEventos]);

  const nav = (dir) => {
    setFechaRef(prev => {
      const f = new Date(prev);
      if (vista === "mes")    f.setMonth(f.getMonth() + dir);
      else if (vista === "semana") f.setDate(f.getDate() + dir * 7);
      else f.setDate(f.getDate() + dir);
      return f;
    });
  };
  const irHoy = () => setFechaRef(vista === "mes" ? new Date(hoy.getFullYear(), hoy.getMonth(), 1) : new Date());

  const titulo = () => {
    if (vista === "mes") return `${MESES_ES[fechaRef.getMonth()]} ${fechaRef.getFullYear()}`;
    if (vista === "semana") {
      const lu = new Date(fechaRef); lu.setDate(fechaRef.getDate() - ((fechaRef.getDay()+6)%7));
      const do_ = new Date(lu); do_.setDate(lu.getDate()+6);
      return `${lu.getDate()} ${MESES_ES[lu.getMonth()]} — ${do_.getDate()} ${MESES_ES[do_.getMonth()]} ${do_.getFullYear()}`;
    }
    return `${DIAS_SEMANA_AG[(fechaRef.getDay()+6)%7]} ${fechaRef.getDate()} de ${MESES_ES[fechaRef.getMonth()]} ${fechaRef.getFullYear()}`;
  };

  const abrirCrear  = (fecha) => { setEventoSel(null); setFechaModal(fecha || new Date()); setModalOpen(true); };
  const abrirEditar = (ev)    => { setEventoSel(ev);   setFechaModal(null); setModalOpen(true); };
  const cerrar      = ()      => { setModalOpen(false); setEventoSel(null); setFechaModal(null); };
  const onSave   = (ev)  => { setEventos(prev => { const i = prev.findIndex(e=>e.id===ev.id); return i>=0?prev.map(e=>e.id===ev.id?ev:e):[...prev,ev]; }); cerrar(); };
  const onDelete = (id)  => { setEventos(prev => prev.filter(e=>e.id!==id)); cerrar(); };
  const onSuccess = useCallback(() => {
    cargarEventos();
    setProximosKey(p => p + 1);
    onAgendaChange?.();
  }, [cargarEventos, onAgendaChange]);

  const VISTAS_BTN = [{ key:"mes",label:"Mes"},{ key:"semana",label:"Semana"},{ key:"dia",label:"Día"},{ key:"agenda",label:"Agenda"}];

  return (
    <div style={{ flex:1, display:"flex", minHeight:0 }}>
      <div style={{ flex:1, display:"flex", flexDirection:"column", minHeight:0 }}>
        {/* Toolbar */}
        <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", borderBottom:`1px solid ${C.border}`, flexShrink:0, flexWrap:"wrap" }}>
          <Btn C={C} variant="ghost" onClick={irHoy} style={{ fontSize:12 }}>Hoy</Btn>
          <div style={{ display:"flex" }}>
            <button onClick={() => nav(-1)} style={{ background:"none", border:`1px solid ${C.border}`, borderRadius:"6px 0 0 6px", padding:"4px 10px", cursor:"pointer", color:C.text }}>‹</button>
            <button onClick={() => nav(1)}  style={{ background:"none", border:`1px solid ${C.border}`, borderLeft:"none", borderRadius:"0 6px 6px 0", padding:"4px 10px", cursor:"pointer", color:C.text }}>›</button>
          </div>
          <div style={{ fontSize:15, fontWeight:700, color:C.text, flex:1 }}>{titulo()}{loading&&<span style={{ fontSize:11,color:C.muted,marginLeft:8 }}>…</span>}</div>
          <div style={{ display:"flex", background:C.bg, borderRadius:8, border:`1px solid ${C.border}`, overflow:"hidden" }}>
            {VISTAS_BTN.map(v => (
              <div key={v.key} onClick={() => setVista(v.key)}
                style={{ padding:"6px 11px", fontSize:12, cursor:"pointer", fontWeight: vista===v.key?600:400,
                  color: vista===v.key?C.accent:C.muted, background: vista===v.key?`${C.accent}14`:"none", transition:"all .15s" }}>
                {v.label}
              </div>
            ))}
          </div>
          <Btn C={C} onClick={() => abrirCrear(new Date())} style={{ fontSize:12 }}>+ Evento</Btn>
        </div>
        {vista==="mes"    && <VistaMes    C={C} fechaRef={fechaRef} eventos={eventos} onDiaClick={abrirCrear} onEventoClick={abrirEditar} />}
        {vista==="semana" && <VistaSemana C={C} fechaRef={fechaRef} eventos={eventos} onEventoClick={abrirEditar} onSlotClick={abrirCrear} />}
        {vista==="dia"    && <VistaDia    C={C} fechaRef={fechaRef} eventos={eventos} onEventoClick={abrirEditar} onSlotClick={abrirCrear} />}
        {vista==="agenda" && <VistaAgenda C={C} fechaRef={fechaRef} eventos={eventos} onEventoClick={abrirEditar} />}
      </div>
      <ProximosVencimientos C={C} clienteId={clienteId} refreshKey={proximosKey} onEventoClick={abrirEditar} />
      {modalOpen && (
        <EventoModal C={C} clienteId={clienteId} evento={eventoSel} fechaInicio={fechaModal}
          expedienteIdPreset={null} expedientes={expedientes}
          onSave={onSave} onDelete={onDelete} onSuccess={onSuccess} onClose={cerrar} />
      )}
    </div>
  );
}

// ── Personas CRUD ─────────────────────────────────────────────

const TIPOS_PERSONA = [
  { value: "fisica",   label: "Persona física" },
  { value: "juridica", label: "Persona jurídica" },
];

function PersonaCard({ C, persona, onClick }) {
  const nombre = persona.tipo === "juridica"
    ? (persona.razon_social || "—")
    : [persona.nombre, persona.apellido].filter(Boolean).join(" ") || "—";
  const docLabel = persona.doc_numero
    ? `${labelDe(DOC_TIPOS, persona.doc_tipo) || persona.doc_tipo || ""} ${persona.doc_numero}`.trim()
    : null;
  return (
    <div onClick={onClick}
      style={{ padding:"14px 18px", background:C.surface, borderRadius:10, border:`1px solid ${C.border}`,
        cursor:"pointer", borderLeft:`4px solid ${persona.tipo==="juridica"?"#6366f1":"#10B981"}`,
        display:"flex", gap:12, alignItems:"flex-start", transition:"background .12s" }}
      onMouseEnter={e=>e.currentTarget.style.background=C.bg}
      onMouseLeave={e=>e.currentTarget.style.background=C.surface}>
      <div style={{ fontSize:22, lineHeight:1, paddingTop:1 }}>{persona.tipo==="juridica"?"🏢":"👤"}</div>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:14, fontWeight:700, color:C.text, marginBottom:2 }}>{nombre}</div>
        {docLabel && <div style={{ fontSize:12, color:C.muted }}>{docLabel}</div>}
        <div style={{ fontSize:12, color:C.muted }}>
          {[persona.email, persona.telefono].filter(Boolean).join(" · ")}
        </div>
        {persona.tags?.length > 0 && (
          <div style={{ display:"flex", gap:4, marginTop:6, flexWrap:"wrap" }}>
            {persona.tags.map(t => <Chip key={t} label={t} color="#6366f1" />)}
          </div>
        )}
      </div>
    </div>
  );
}

function PersonaForm({ C, clienteId, persona, onSave, onCancelar }) {
  const isNew = !persona;
  const [form, setForm] = useState({
    tipo:           persona?.tipo           || "fisica",
    nombre:         persona?.nombre         || "",
    apellido:       persona?.apellido       || "",
    razon_social:   persona?.razon_social   || "",
    doc_tipo:       persona?.doc_tipo       || "DNI",
    doc_numero:     persona?.doc_numero     || "",
    email:          persona?.email          || "",
    telefono:       persona?.telefono       || "",
    cuit_validado:  persona?.cuit_validado  || false,
    categoria_afip: persona?.categoria_afip || "",
    notas:          persona?.notas          || "",
    tags:           (persona?.tags || []).join(", "),
    dir_calle:      persona?.direccion?.calle    || "",
    dir_numero:     persona?.direccion?.numero   || "",
    dir_piso:       persona?.direccion?.piso     || "",
    dir_dto:        persona?.direccion?.dto      || "",
    dir_ciudad:     persona?.direccion?.ciudad   || "",
    dir_provincia:  persona?.direccion?.provincia|| "",
    dir_cp:         persona?.direccion?.cp       || "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState("");
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const guardar = async () => {
    if (form.tipo === "fisica" && !form.nombre && !form.apellido)
      return setErr("Ingresá nombre o apellido.");
    if (form.tipo === "juridica" && !form.razon_social)
      return setErr("La razón social es obligatoria.");
    // Bug 1+2: para jurídica el doc_tipo efectivo siempre es CUIT;
    // para física usamos el selector. Validar CUIT/CUIL antes de guardar.
    const docTipoEfectivo = form.tipo === "juridica" ? "CUIT" : form.doc_tipo;
    if (form.doc_numero && (docTipoEfectivo === "CUIT" || docTipoEfectivo === "CUIL")) {
      const check = validarCUIT(form.doc_numero);
      if (!check.valido) return setErr(check.mensaje || "CUIT/CUIL inválido.");
    }
    setSaving(true); setErr("");
    try {
      const tags = form.tags.split(",").map(t => t.trim()).filter(Boolean);
      const tieneDir = form.dir_calle || form.dir_ciudad;
      const direccion = tieneDir ? {
        calle: form.dir_calle, numero: form.dir_numero, piso: form.dir_piso,
        dto: form.dir_dto, ciudad: form.dir_ciudad,
        provincia: form.dir_provincia, cp: form.dir_cp,
      } : null;
      const body = {
        cliente_id: clienteId, tipo: form.tipo,
        nombre: form.nombre || null, apellido: form.apellido || null,
        razon_social: form.razon_social || null,
        doc_tipo: docTipoEfectivo || null, doc_numero: form.doc_numero || null,
        email: form.email || null, telefono: form.telefono || null,
        cuit_validado: form.cuit_validado,
        categoria_afip: form.categoria_afip || null,
        notas: form.notas || null,
        tags: tags.length ? tags : null,
        direccion,
      };
      const url = isNew ? `${API}/api/doctor/personas` : `${API}/api/doctor/personas/${persona.id}`;
      const r = await fetch(url, { method: isNew ? "POST" : "PUT", headers: jH(), body: JSON.stringify(body) });
      if (!r.ok) throw new Error((await r.json()).error);
      onSave(await r.json(), isNew);
    } catch(e) { setErr(e.message); } finally { setSaving(false); }
  };

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", minHeight:0 }}>
      <div style={{ padding:"14px 24px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", gap:12, flexShrink:0 }}>
        <button onClick={onCancelar} style={{ background:"none", border:"none", cursor:"pointer", color:C.muted, fontSize:20, padding:0 }}>←</button>
        <div style={{ fontSize:15, fontWeight:700, color:C.text }}>{isNew ? "Nueva persona" : "Editar persona"}</div>
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:24 }}>
        {err && <div style={{ background:"#ef444422", border:"1px solid #ef4444", borderRadius:8, padding:"10px 14px", color:"#ef4444", fontSize:13, marginBottom:16 }}>{err}</div>}

        <Field C={C} label="Tipo">
          <div style={{ display:"flex", gap:20 }}>
            {TIPOS_PERSONA.map(t => (
              <label key={t.value} style={{ display:"flex", alignItems:"center", gap:6, cursor:"pointer", fontSize:13, color:C.text }}>
                <input type="radio" checked={form.tipo===t.value} onChange={()=>set("tipo",t.value)} />{t.label}
              </label>
            ))}
          </div>
        </Field>

        {form.tipo === "fisica" ? (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
            <Field C={C} label="Nombre" required><Input C={C} value={form.nombre} onChange={e=>set("nombre",e.target.value)} /></Field>
            <Field C={C} label="Apellido" required><Input C={C} value={form.apellido} onChange={e=>set("apellido",e.target.value)} /></Field>
            <Field C={C} label="Tipo de documento">
              <Sel C={C} value={form.doc_tipo} onChange={e=>set("doc_tipo",e.target.value)} options={DOC_TIPOS} />
            </Field>
            <Field C={C} label="Número de documento">
              <Input C={C} value={form.doc_numero} onChange={e=>set("doc_numero",e.target.value)} placeholder="Ej: 30123456" />
            </Field>
          </div>
        ) : (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
            <Field C={C} label="Razón social" required style={{ gridColumn:"1/-1" }}>
              <Input C={C} value={form.razon_social} onChange={e=>set("razon_social",e.target.value)} />
            </Field>
            <Field C={C} label="CUIT">
              <Input C={C} value={form.doc_numero} onChange={e=>set("doc_numero",e.target.value)} placeholder="20-12345678-9" />
            </Field>
            <Field C={C} label="Categoría AFIP">
              <Sel C={C} value={form.categoria_afip} onChange={e=>set("categoria_afip",e.target.value)}
                options={[{value:"",label:"— sin especificar —"}, ...CATEGORIAS_AFIP]} />
            </Field>
            <Field C={C} label="">
              <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:13, color:C.text }}>
                <input type="checkbox" checked={form.cuit_validado} onChange={e=>set("cuit_validado",e.target.checked)} />
                CUIT validado en AFIP
              </label>
            </Field>
          </div>
        )}

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginTop:16 }}>
          <Field C={C} label="Email"><Input C={C} type="email" value={form.email} onChange={e=>set("email",e.target.value)} /></Field>
          <Field C={C} label="Teléfono"><Input C={C} value={form.telefono} onChange={e=>set("telefono",e.target.value)} /></Field>
        </div>

        <div style={{ fontSize:13, fontWeight:600, color:C.text, margin:"20px 0 10px" }}>Dirección</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 80px 60px 60px", gap:12, marginBottom:12 }}>
          <Field C={C} label="Calle"><Input C={C} value={form.dir_calle} onChange={e=>set("dir_calle",e.target.value)} /></Field>
          <Field C={C} label="N°"><Input C={C} value={form.dir_numero} onChange={e=>set("dir_numero",e.target.value)} /></Field>
          <Field C={C} label="Piso"><Input C={C} value={form.dir_piso} onChange={e=>set("dir_piso",e.target.value)} /></Field>
          <Field C={C} label="Dto"><Input C={C} value={form.dir_dto} onChange={e=>set("dir_dto",e.target.value)} /></Field>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 80px", gap:12, marginBottom:20 }}>
          <Field C={C} label="Ciudad"><Input C={C} value={form.dir_ciudad} onChange={e=>set("dir_ciudad",e.target.value)} /></Field>
          <Field C={C} label="Provincia"><Input C={C} value={form.dir_provincia} onChange={e=>set("dir_provincia",e.target.value)} /></Field>
          <Field C={C} label="CP"><Input C={C} value={form.dir_cp} onChange={e=>set("dir_cp",e.target.value)} /></Field>
        </div>

        <Field C={C} label="Tags (separados por coma)">
          <Input C={C} value={form.tags} onChange={e=>set("tags",e.target.value)} placeholder="ej: cliente, deudor, testigo" />
        </Field>
        <Field C={C} label="Notas">
          <textarea value={form.notas} onChange={e=>set("notas",e.target.value)}
            style={{ ...inputSt(C), width:"100%", boxSizing:"border-box", minHeight:80, resize:"vertical" }} />
        </Field>

        <div style={{ display:"flex", gap:10, marginTop:24 }}>
          <Btn C={C} variant="ghost" onClick={onCancelar}>Cancelar</Btn>
          <Btn C={C} onClick={guardar} disabled={saving}>{saving ? "Guardando…" : isNew ? "Crear persona" : "Guardar cambios"}</Btn>
        </div>
      </div>
    </div>
  );
}

function PersonaDetalle({ C, clienteId, personaId, onVolver, onEditar }) {
  const [persona, setPersona]       = useState(null);
  const [expedientes, setExpedientes] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [deleting, setDeleting]     = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [pR, eR] = await Promise.all([
        fetch(`${API}/api/doctor/personas/${personaId}?cliente_id=${clienteId}`, { headers: aH() }),
        fetch(`${API}/api/doctor/personas/${personaId}/expedientes?cliente_id=${clienteId}`, { headers: aH() }),
      ]);
      if (pR.ok) setPersona(await pR.json());
      if (eR.ok) setExpedientes(await eR.json());
    } catch(e) { /* silenciar */ } finally { setLoading(false); }
  }, [personaId, clienteId]);

  useEffect(() => { cargar(); }, [cargar]);

  const eliminar = async () => {
    if (!window.confirm("¿Eliminar esta persona? Se desvinculará de todos los expedientes.")) return;
    setDeleting(true);
    try {
      const r = await fetch(`${API}/api/doctor/personas/${personaId}?cliente_id=${clienteId}`,
        { method: "DELETE", headers: aH() });
      if (r.ok) onVolver(true);
    } catch(e) { /* silenciar */ } finally { setDeleting(false); }
  };

  if (loading) return <Spinner C={C} />;
  if (!persona) return <EmptyState C={C} icon="❌" title="Persona no encontrada" />;

  const nombre = persona.tipo === "juridica"
    ? (persona.razon_social || "—")
    : [persona.nombre, persona.apellido].filter(Boolean).join(" ") || "—";

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", minHeight:0 }}>
      <div style={{ padding:"16px 24px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", gap:12, flexShrink:0 }}>
        <button onClick={() => onVolver(false)} style={{ background:"none", border:"none", cursor:"pointer", color:C.muted, fontSize:20, padding:0 }}>←</button>
        <div style={{ fontSize:24 }}>{persona.tipo==="juridica"?"🏢":"👤"}</div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:16, fontWeight:700, color:C.text }}>{nombre}</div>
          <div style={{ fontSize:11, color:C.muted }}>{labelDe(TIPOS_PERSONA, persona.tipo)}</div>
        </div>
        <Btn C={C} variant="ghost" onClick={onEditar} style={{ fontSize:12 }}>✏ Editar</Btn>
        <Btn C={C} variant="ghost" onClick={eliminar} disabled={deleting}
          style={{ color:"#ef4444", fontSize:12 }}>{deleting?"…":"🗑 Eliminar"}</Btn>
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:24, display:"flex", flexDirection:"column", gap:24 }}>
        <div>
          <div style={{ fontSize:14, fontWeight:700, color:C.text, marginBottom:14 }}>Datos</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            {persona.doc_numero && (
              <Field C={C} label={labelDe(DOC_TIPOS, persona.doc_tipo) || "Documento"}>
                <div style={{ fontSize:13, color:C.text }}>{persona.doc_numero}</div>
              </Field>
            )}
            {persona.email && <Field C={C} label="Email"><div style={{ fontSize:13, color:C.text }}>{persona.email}</div></Field>}
            {persona.telefono && <Field C={C} label="Teléfono"><div style={{ fontSize:13, color:C.text }}>{persona.telefono}</div></Field>}
            {persona.categoria_afip && (
              <Field C={C} label="Categoría AFIP"><div style={{ fontSize:13, color:C.text }}>{persona.categoria_afip}</div></Field>
            )}
          </div>
          {persona.direccion?.calle && (
            <Field C={C} label="Dirección">
              <div style={{ fontSize:13, color:C.text }}>
                {[persona.direccion.calle, persona.direccion.numero,
                  persona.direccion.piso, persona.direccion.dto].filter(Boolean).join(" ")}
                {persona.direccion.ciudad    && `, ${persona.direccion.ciudad}`}
                {persona.direccion.provincia && `, ${persona.direccion.provincia}`}
                {persona.direccion.cp        && ` (${persona.direccion.cp})`}
              </div>
            </Field>
          )}
          {persona.tags?.length > 0 && (
            <Field C={C} label="Tags">
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                {persona.tags.map(t => <Chip key={t} label={t} color="#6366f1" />)}
              </div>
            </Field>
          )}
          {persona.notas && (
            <Field C={C} label="Notas">
              <div style={{ fontSize:13, color:C.text, whiteSpace:"pre-wrap" }}>{persona.notas}</div>
            </Field>
          )}
        </div>

        <div>
          <div style={{ fontSize:14, fontWeight:700, color:C.text, marginBottom:14 }}>
            Vista 360° — Expedientes vinculados ({expedientes.length})
          </div>
          {expedientes.length === 0 ? (
            <div style={{ fontSize:13, color:C.muted }}>Sin expedientes vinculados.</div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {expedientes.map(e => (
                <div key={`${e.id}-${e.rol}`} style={{ padding:"12px 16px", background:C.surface,
                  borderRadius:8, border:`1px solid ${C.border}`,
                  borderLeft:`4px solid ${ETAPA_COLOR[e.etapa]||C.accent}` }}>
                  <div style={{ fontSize:13, fontWeight:600, color:C.text }}>{e.caratula}</div>
                  <div style={{ display:"flex", gap:6, marginTop:6, flexWrap:"wrap", alignItems:"center" }}>
                    <Chip label={e.rol} color="#6366f1" />
                    {e.fuero  && <Chip label={labelDe(FUEROS, e.fuero)}  color="#6b7280" />}
                    {e.etapa  && <Chip label={labelDe(ETAPAS_EXPEDIENTE, e.etapa)} color={ETAPA_COLOR[e.etapa]||"#6366f1"} />}
                    {e.estado && <Chip label={labelDe(ESTADOS_EXPEDIENTE, e.estado)} color={ESTADO_COLOR[e.estado]||"#6b7280"} />}
                    {e.porcentaje && <span style={{ fontSize:11, color:C.muted }}>{e.porcentaje}%</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PersonasModule({ C, clienteId }) {
  const [view, setView]           = useState("lista");
  const [personaId, setPersonaId] = useState(null);
  const [personas, setPersonas]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [q, setQ]                 = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("");

  const cargar = useCallback(() => {
    if (!clienteId) return;
    setLoading(true);
    const params = new URLSearchParams({ cliente_id: clienteId });
    if (q) params.set("q", q);
    if (tipoFiltro) params.set("tipo", tipoFiltro);
    fetch(`${API}/api/doctor/personas?${params}`, { headers: aH() })
      .then(r => r.ok ? r.json() : [])
      .then(setPersonas).catch(() => {}).finally(() => setLoading(false));
  }, [clienteId, q, tipoFiltro]);

  useEffect(() => { cargar(); }, [cargar]);

  const irADetalle  = (id)       => { setPersonaId(id); setView("detalle"); };
  const irAEditar   = ()         => setView("editar");
  const irALista    = (eliminado)=> { setView("lista"); setPersonaId(null); if (eliminado) cargar(); };

  const onSave = (p, isNew) => {
    if (isNew) {
      setPersonas(prev => [p, ...prev]);
      irADetalle(p.id);
    } else {
      setPersonas(prev => prev.map(x => x.id === p.id ? p : x));
      setView("detalle");
    }
  };

  if (view === "nuevo") return (
    <PersonaForm C={C} clienteId={clienteId} persona={null} onSave={onSave} onCancelar={() => setView("lista")} />
  );
  if (view === "editar" && personaId) {
    const persona = personas.find(p => p.id === personaId);
    return <PersonaForm C={C} clienteId={clienteId} persona={persona} onSave={onSave} onCancelar={() => setView("detalle")} />;
  }
  if (view === "detalle" && personaId) return (
    <PersonaDetalle C={C} clienteId={clienteId} personaId={personaId} onVolver={irALista} onEditar={irAEditar} />
  );

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", minHeight:0 }}>
      <div style={{ padding:"12px 20px", borderBottom:`1px solid ${C.border}`, display:"flex", gap:10, alignItems:"center", flexShrink:0, flexWrap:"wrap" }}>
        <Input C={C} value={q} onChange={e=>setQ(e.target.value)}
          placeholder="Buscar por nombre, doc, email…" style={{ flex:1, minWidth:180 }} />
        <Sel C={C} value={tipoFiltro} onChange={e=>setTipoFiltro(e.target.value)}
          options={[{value:"",label:"Todos"},{value:"fisica",label:"Física"},{value:"juridica",label:"Jurídica"}]} />
        <Btn C={C} onClick={() => setView("nuevo")}>+ Nueva persona</Btn>
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:20 }}>
        {loading && <Spinner C={C} />}
        {!loading && personas.length === 0 && (
          <EmptyState C={C} icon="👥" title="Sin personas" sub='Creá la primera con "+ Nueva persona".' />
        )}
        {!loading && personas.length > 0 && (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {personas.map(p => <PersonaCard key={p.id} C={C} persona={p} onClick={() => irADetalle(p.id)} />)}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Escritos + Plantillas ─────────────────────────────────────

const CATEGORIAS_ESCRITO = [
  { value: "demanda",         label: "Demanda" },
  { value: "contestacion",    label: "Contestación" },
  { value: "cedula",          label: "Cédula" },
  { value: "oficio",          label: "Oficio" },
  { value: "mandamiento",     label: "Mandamiento" },
  { value: "recurso",         label: "Recurso" },
  { value: "carta_documento", label: "Carta Documento" },
  { value: "telegrama",       label: "Telegrama" },
  { value: "convenio",        label: "Convenio" },
  { value: "acuerdo",         label: "Acuerdo" },
  { value: "nota",            label: "Nota" },
];

const ESTADOS_ESCRITO = [
  { value: "borrador",   label: "Borrador" },
  { value: "revision",   label: "En revisión" },
  { value: "final",      label: "Final" },
  { value: "presentado", label: "Presentado" },
];

const ESTADO_ESCRITO_COLOR = {
  borrador: "#6b7280", revision: "#f59e0b",
  final: "#10b981",    presentado: "#3b82f6",
};

// ── Editor rich-text (contentEditable + execCommand) ──────────
// Nota: document.execCommand está deprecado pero funcional en todos los browsers.
// TODO: reemplazar con librería de PDF real (jsPDF o similar) cuando haya demanda de usuarios.
// window.print() no funciona bien en todos los contextos (mobile, algunas configuraciones de browser).

function RichTextEditor({ C, initialValue, onChange, placeholder, editorRef: extRef, style }) {
  const innerRef = useRef(null);
  const ref = extRef || innerRef;

  // Inicializar contenido una sola vez al montar
  useEffect(() => {
    if (ref.current) ref.current.innerHTML = initialValue || "";
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const exec = (cmd, val) => {
    ref.current?.focus();
    document.execCommand(cmd, false, val ?? null);
    onChange?.(ref.current?.innerHTML || "");
  };

  const Sep = () => (
    <div style={{ width: 1, background: C.border, margin: "0 2px", alignSelf: "stretch" }} />
  );

  const TBtn = ({ label, cmd, val, title }) => (
    <button
      onMouseDown={e => { e.preventDefault(); exec(cmd, val); }}
      title={title || label}
      style={{
        background: "none", border: `1px solid ${C.border}`, borderRadius: 4,
        cursor: "pointer", color: C.text, padding: "2px 7px", fontSize: 12,
        fontWeight: 600, lineHeight: "20px", fontFamily: "inherit",
      }}>
      {label}
    </button>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0,
      border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden", ...style }}>
      {/* Toolbar */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 3, padding: "6px 10px",
        borderBottom: `1px solid ${C.border}`, background: C.bg, flexShrink: 0 }}>
        <TBtn label="B"  cmd="bold"      title="Negrita (Ctrl+B)" />
        <TBtn label="I"  cmd="italic"    title="Itálica (Ctrl+I)" />
        <TBtn label="U"  cmd="underline" title="Subrayado (Ctrl+U)" />
        <Sep />
        <TBtn label="H1" cmd="formatBlock" val="h1" title="Título 1" />
        <TBtn label="H2" cmd="formatBlock" val="h2" title="Título 2" />
        <TBtn label="H3" cmd="formatBlock" val="h3" title="Título 3" />
        <TBtn label="¶" cmd="formatBlock" val="p" title="Párrafo normal" />
        <Sep />
        <TBtn label="≡" cmd="insertUnorderedList" title="Lista con viñetas" />
        <TBtn label="1."     cmd="insertOrderedList"   title="Lista numerada" />
        <Sep />
        <TBtn label="⇦" cmd="justifyLeft"   title="Alinear izquierda" />
        <TBtn label="⇔" cmd="justifyCenter" title="Centrar" />
        <TBtn label="⇨" cmd="justifyRight"  title="Alinear derecha" />
      </div>
      {/* Área editable */}
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={() => onChange?.(ref.current?.innerHTML || "")}
        style={{
          flex: 1, overflowY: "auto", padding: 20, outline: "none",
          color: C.text, fontSize: 14, lineHeight: 1.7,
          fontFamily: 'Georgia, "Times New Roman", serif',
          minHeight: 300,
        }}
      />
    </div>
  );
}

// ── Editor de un escrito individual ───────────────────────────

function EscritoEditor({ C, clienteId, escrito, expedientes, onGuardado, onEliminado, onVolver }) {
  const isNew = !escrito?.id;
  const [form, setForm] = useState({
    titulo:        escrito?.titulo        || "",
    categoria:     escrito?.categoria     || "nota",
    estado:        escrito?.estado        || "borrador",
    expediente_id: escrito?.expediente_id || "",
  });
  const [saving, setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [err, setErr]         = useState("");
  const editorRef             = useRef(null);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const guardar = async () => {
    if (!form.titulo.trim()) return setErr("El título es obligatorio.");
    setSaving(true); setErr("");
    try {
      const html  = editorRef.current?.innerHTML || "";
      const texto = editorRef.current?.innerText  || "";
      const body  = {
        cliente_id:    clienteId,
        ...form,
        expediente_id: form.expediente_id || null,
        contenido:     texto,
        contenido_html: html,
      };
      const url    = isNew
        ? `${API}/api/doctor/escritos`
        : `${API}/api/doctor/escritos/${escrito.id}`;
      const r = await fetch(url, { method: isNew ? "POST" : "PUT", headers: jH(), body: JSON.stringify(body) });
      if (!r.ok) throw new Error((await r.json()).error);
      onGuardado(await r.json());
    } catch (e) { setErr(e.message); } finally { setSaving(false); }
  };

  const eliminar = async () => {
    if (!window.confirm("¿Eliminar este escrito? No se puede deshacer.")) return;
    setDeleting(true);
    try {
      const r = await fetch(
        `${API}/api/doctor/escritos/${escrito.id}?cliente_id=${clienteId}`,
        { method: "DELETE", headers: aH() }
      );
      if (!r.ok) throw new Error((await r.json()).error);
      onEliminado(escrito.id);
    } catch (e) { setErr(e.message); } finally { setDeleting(false); }
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      {/* Header del editor */}
      <div style={{ padding: "12px 20px", borderBottom: `1px solid ${C.border}`,
        display: "flex", alignItems: "center", gap: 8, flexShrink: 0, flexWrap: "wrap" }}>
        <button onClick={onVolver}
          style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: 20, padding: 0, flexShrink: 0 }}>
          ←
        </button>
        <Input C={C} value={form.titulo} onChange={e => set("titulo", e.target.value)}
          placeholder="Título del escrito..."
          style={{ flex: 1, minWidth: 180, fontWeight: 700, fontSize: 14 }} />
        <Sel C={C} value={form.categoria} onChange={e => set("categoria", e.target.value)}
          options={CATEGORIAS_ESCRITO} style={{ fontSize: 12 }} />
        <Sel C={C} value={form.estado} onChange={e => set("estado", e.target.value)}
          options={ESTADOS_ESCRITO} style={{ fontSize: 12 }} />
        {!isNew && (
          <Btn C={C} variant="ghost" onClick={eliminar} disabled={deleting}
            style={{ color: "#ef4444", fontSize: 12 }}>{deleting ? "…" : "🗑"}</Btn>
        )}
        <Btn C={C} onClick={guardar} disabled={saving} style={{ fontSize: 12 }}>
          {saving ? "Guardando…" : "💾 Guardar"}
        </Btn>
      </div>
      {/* Expediente vinculado */}
      <div style={{ padding: "8px 20px", borderBottom: `1px solid ${C.border}`,
        display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <span style={{ fontSize: 12, color: C.muted, whiteSpace: "nowrap" }}>📁 Expediente:</span>
        <Sel C={C} value={form.expediente_id} onChange={e => set("expediente_id", e.target.value)}
          options={[{ value: "", label: "— Sin expediente —" },
            ...expedientes.map(e => ({ value: e.id, label: e.caratula }))]}
          style={{ fontSize: 12, flex: 1, maxWidth: 420 }} />
        {!isNew && (
          <span style={{ fontSize: 10, color: C.muted, whiteSpace: "nowrap" }}>
            v{escrito.version_actual} · {fmtFecha(escrito.updated_at)}
          </span>
        )}
      </div>
      {err && (
        <div style={{ padding: "6px 20px", background: "#ef444422",
          color: "#ef4444", fontSize: 12, flexShrink: 0 }}>{err}</div>
      )}
      {/* Editor */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, padding: 16 }}>
        <RichTextEditor
          C={C}
          initialValue={escrito?.contenido_html || escrito?.contenido || ""}
          editorRef={editorRef}
          placeholder="Escribí el contenido del escrito..."
        />
      </div>
    </div>
  );
}

// ── Módulo Escritos ────────────────────────────────────────────

function EscritorModule({ C, clienteId, escritoPendiente, onEscritoPendienteConsumed }) {
  const [view, setView]               = useState("lista");
  const [mainView, setMainView]       = useState("escritos"); // "escritos" | "plantillas"
  const [escritos, setEscritos]       = useState([]);
  const [expedientes, setExpedientes] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [escritoActivo, setEscritoActivo] = useState(null);
  const [filCat, setFilCat]           = useState("");
  const [filEst, setFilEst]           = useState("");

  // Navegación entrante desde ExpedienteDetalle
  useEffect(() => {
    if (escritoPendiente) {
      setEscritoActivo(escritoPendiente);
      setView("editor");
      setMainView("escritos");
      onEscritoPendienteConsumed?.();
    }
  }, [escritoPendiente]); // eslint-disable-line

  const cargar = useCallback(async () => {
    if (!clienteId) return;
    setLoading(true);
    try {
      let url = `${API}/api/doctor/escritos?cliente_id=${clienteId}`;
      if (filCat) url += `&categoria=${filCat}`;
      if (filEst) url += `&estado=${filEst}`;
      const [es, exps] = await Promise.all([
        fetch(url, { headers: aH() }).then(r => r.ok ? r.json() : []),
        fetch(`${API}/api/doctor/expedientes?cliente_id=${clienteId}`, { headers: aH() })
          .then(r => r.ok ? r.json() : []),
      ]);
      setEscritos(es);
      setExpedientes(exps);
    } catch (_) {} finally { setLoading(false); }
  }, [clienteId, filCat, filEst]);

  useEffect(() => { cargar(); }, [cargar]);

  const abrirEditor = (escrito = null) => {
    setEscritoActivo(escrito);
    setView("editor");
  };

  const onGuardado = (escrito) => {
    setEscritos(prev => {
      const idx = prev.findIndex(e => e.id === escrito.id);
      return idx >= 0 ? prev.map(e => e.id === escrito.id ? escrito : e) : [escrito, ...prev];
    });
    setEscritoActivo(escrito); // actualizar datos en el editor
  };

  const onEliminado = (id) => {
    setEscritos(prev => prev.filter(e => e.id !== id));
    setView("lista");
  };

  // Usar plantilla desde PlantillasModule (sin contexto de expediente)
  const usarPlantilla = (p) => {
    setEscritoActivo({
      titulo:         p.titulo,
      categoria:      p.categoria,
      estado:         "borrador",
      plantilla_id:   p.id,
      contenido_html: p.contenido,
      contenido:      p.contenido,
    });
    setMainView("escritos");
    setView("editor");
  };

  if (view === "editor") {
    return (
      <EscritoEditor
        key={escritoActivo?.id || "nuevo"}
        C={C}
        clienteId={clienteId}
        escrito={escritoActivo}
        expedientes={expedientes}
        onGuardado={onGuardado}
        onEliminado={onEliminado}
        onVolver={() => setView("lista")}
      />
    );
  }

  if (mainView === "plantillas") {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
        {/* Tab switcher compartido */}
        <div style={{ padding: "0 24px", borderBottom: `1px solid ${C.border}`,
          display: "flex", gap: 2, flexShrink: 0 }}>
          {["escritos", "plantillas"].map(t => (
            <button key={t} onClick={() => setMainView(t)}
              style={{ padding: "12px 16px", background: "none", border: "none",
                cursor: "pointer", fontSize: 13, fontFamily: "inherit",
                fontWeight: mainView === t ? 700 : 400,
                color: mainView === t ? C.accent : C.muted,
                borderBottom: mainView === t ? `2px solid ${C.accent}` : "2px solid transparent" }}>
              {t === "escritos" ? "📄 Escritos" : "📋 Plantillas"}
            </button>
          ))}
        </div>
        <PlantillasModule C={C} clienteId={clienteId} onUsarPlantilla={usarPlantilla} />
      </div>
    );
  }

  // ── Vista lista de escritos ──
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
      {/* Header con tab switcher */}
      <div style={{ padding: "0 24px", borderBottom: `1px solid ${C.border}`,
        display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 2, flex: 1 }}>
          {["escritos", "plantillas"].map(t => (
            <button key={t} onClick={() => setMainView(t)}
              style={{ padding: "12px 16px", background: "none", border: "none",
                cursor: "pointer", fontSize: 13, fontFamily: "inherit",
                fontWeight: mainView === t ? 700 : 400,
                color: mainView === t ? C.accent : C.muted,
                borderBottom: mainView === t ? `2px solid ${C.accent}` : "2px solid transparent" }}>
              {t === "escritos" ? "📄 Escritos" : "📋 Plantillas"}
            </button>
          ))}
        </div>
        <Btn C={C} onClick={() => abrirEditor(null)} style={{ fontSize: 12 }}>+ Nuevo escrito</Btn>
      </div>
      {/* Filtros */}
      <div style={{ padding: "10px 24px", borderBottom: `1px solid ${C.border}`,
        display: "flex", gap: 10, flexShrink: 0 }}>
        <Sel C={C} value={filCat} onChange={e => setFilCat(e.target.value)}
          options={[{ value: "", label: "Todas las categorías" }, ...CATEGORIAS_ESCRITO]}
          style={{ fontSize: 12, flex: 1 }} />
        <Sel C={C} value={filEst} onChange={e => setFilEst(e.target.value)}
          options={[{ value: "", label: "Todos los estados" }, ...ESTADOS_ESCRITO]}
          style={{ fontSize: 12, flex: 1 }} />
      </div>
      {/* Lista */}
      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {loading ? <Spinner C={C} /> :
         escritos.length === 0
           ? <EmptyState C={C} icon="📄" title="Sin escritos"
               sub="Creá tu primer escrito con el botón de arriba." />
           : escritos.map(e => (
               <div key={e.id} onClick={() => abrirEditor(e)}
                 style={{
                   padding: "12px 16px", background: C.surface, borderRadius: 10,
                   border: `1px solid ${C.border}`, cursor: "pointer", marginBottom: 8,
                   borderLeft: `4px solid ${ESTADO_ESCRITO_COLOR[e.estado] || C.accent}`,
                   display: "flex", gap: 12, alignItems: "flex-start", transition: "background .12s",
                 }}
                 onMouseEnter={ev => ev.currentTarget.style.background = C.bg}
                 onMouseLeave={ev => ev.currentTarget.style.background = C.surface}>
                 <div style={{ flex: 1 }}>
                   <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 4 }}>
                     {e.titulo}
                   </div>
                   <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                     <Chip label={labelDe(CATEGORIAS_ESCRITO, e.categoria)} color={C.accent} />
                     <Chip label={labelDe(ESTADOS_ESCRITO, e.estado)}
                       color={ESTADO_ESCRITO_COLOR[e.estado] || "#6b7280"} />
                     {e.expediente_caratula && (
                       <span style={{ fontSize: 11, color: C.muted }}>📁 {e.expediente_caratula}</span>
                     )}
                   </div>
                 </div>
                 <div style={{ fontSize: 10, color: C.muted, whiteSpace: "nowrap", paddingTop: 2 }}>
                   v{e.version_actual} · {fmtFecha(e.updated_at)}
                 </div>
               </div>
             ))
        }
      </div>
    </div>
  );
}

// ── Resolver de variables (frontend, preview) ─────────────────

function resolverVariablesPreview(contenido = "", expediente = {}, personas = []) {
  const actor     = personas.find(p => p.rol === "actor");
  const demandado = personas.find(p => p.rol === "demandado");
  const fechaHoy  = new Date().toLocaleDateString("es-AR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
  const montoFmt = expediente.monto_reclamado
    ? Number(expediente.monto_reclamado).toLocaleString("es-AR")
    : "[COMPLETAR]";
  return contenido
    .replace(/\{\{expediente\.caratula\}\}/g,    expediente.caratula                || "[COMPLETAR]")
    .replace(/\{\{expediente\.num_judicial\}\}/g, expediente.num_expediente_judicial || "[COMPLETAR]")
    .replace(/\{\{expediente\.fuero\}\}/g,        expediente.fuero                   || "[COMPLETAR]")
    .replace(/\{\{expediente\.etapa\}\}/g,        expediente.etapa                   || "[COMPLETAR]")
    .replace(/\{\{actor\.nombre\}\}/g,            actor?.nombre                      || "[COMPLETAR]")
    .replace(/\{\{actor\.apellido\}\}/g,          actor?.apellido                    || "[COMPLETAR]")
    .replace(/\{\{demandado\.nombre\}\}/g,        demandado?.nombre                  || "[COMPLETAR]")
    .replace(/\{\{demandado\.apellido\}\}/g,      demandado?.apellido                || "[COMPLETAR]")
    .replace(/\{\{juzgado\}\}/g,                  expediente.juzgado                 || "[COMPLETAR]")
    .replace(/\{\{fecha_hoy\}\}/g,               fechaHoy)
    .replace(/\{\{monto_reclamado\}\}/g,          montoFmt);
}

const VARIABLES_AYUDA = [
  { var: "{{expediente.caratula}}",     desc: "Carátula del expediente" },
  { var: "{{expediente.num_judicial}}", desc: "Número de expediente judicial" },
  { var: "{{expediente.fuero}}",        desc: "Fuero" },
  { var: "{{expediente.etapa}}",        desc: "Etapa procesal" },
  { var: "{{actor.nombre}}",            desc: "Nombre del actor" },
  { var: "{{actor.apellido}}",          desc: "Apellido del actor" },
  { var: "{{demandado.nombre}}",        desc: "Nombre del demandado" },
  { var: "{{demandado.apellido}}",      desc: "Apellido del demandado" },
  { var: "{{juzgado}}",                 desc: "Juzgado interviniente" },
  { var: "{{fecha_hoy}}",              desc: "Fecha de hoy (dd/mm/aaaa)" },
  { var: "{{monto_reclamado}}",         desc: "Monto reclamado formateado" },
];

// ── PlantillaForm ─────────────────────────────────────────────

function PlantillaForm({ C, clienteId, plantilla, onGuardado, onCancelar }) {
  const isNew     = !plantilla?.id;
  const editorRef = useRef(null);
  const [form, setForm] = useState({
    titulo:      plantilla?.titulo      || "",
    categoria:   plantilla?.categoria   || "nota",
    descripcion: plantilla?.descripcion || "",
  });
  const [saving, setSaving]       = useState(false);
  const [err, setErr]             = useState("");
  const [ayudaOpen, setAyudaOpen] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const guardar = async () => {
    if (!form.titulo.trim()) return setErr("El título es obligatorio.");
    setSaving(true); setErr("");
    try {
      const body = {
        cliente_id: clienteId,
        ...form,
        // Guardamos innerHTML para preservar el formato del rich-text
        contenido: editorRef.current?.innerHTML || "",
        publica: false, // los clientes solo crean plantillas privadas
      };
      const url = isNew
        ? `${API}/api/doctor/plantillas`
        : `${API}/api/doctor/plantillas/${plantilla.id}`;
      const r = await fetch(url, {
        method: isNew ? "POST" : "PUT",
        headers: jH(), body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error((await r.json()).error || "Error al guardar");
      onGuardado(await r.json());
    } catch (e) { setErr(e.message); } finally { setSaving(false); }
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      {/* Header */}
      <div style={{ padding: "12px 20px", borderBottom: `1px solid ${C.border}`,
        display: "flex", alignItems: "center", gap: 8, flexShrink: 0, flexWrap: "wrap" }}>
        <button onClick={onCancelar}
          style={{ background: "none", border: "none", cursor: "pointer",
            color: C.muted, fontSize: 20, padding: 0, flexShrink: 0 }}>
          ←
        </button>
        <Input C={C} value={form.titulo} onChange={e => set("titulo", e.target.value)}
          placeholder="Título de la plantilla..."
          style={{ flex: 1, minWidth: 180, fontWeight: 700, fontSize: 14 }} />
        <Sel C={C} value={form.categoria} onChange={e => set("categoria", e.target.value)}
          options={CATEGORIAS_ESCRITO} style={{ fontSize: 12 }} />
        <Btn C={C} variant="ghost" onClick={() => setAyudaOpen(p => !p)} style={{ fontSize: 12 }}>
          {ayudaOpen ? "× Variables" : "{ } Variables"}
        </Btn>
        <Btn C={C} onClick={guardar} disabled={saving} style={{ fontSize: 12 }}>
          {saving ? "Guardando…" : "💾 Guardar"}
        </Btn>
      </div>
      {/* Descripción */}
      <div style={{ padding: "8px 20px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <Input C={C} value={form.descripcion}
          onChange={e => set("descripcion", e.target.value)}
          placeholder="Descripción breve (opcional)..."
          style={{ fontSize: 12 }} />
      </div>
      {err && (
        <div style={{ padding: "6px 20px", background: "#ef444422",
          color: "#ef4444", fontSize: 12, flexShrink: 0 }}>{err}
        </div>
      )}
      {/* Body: editor + panel de variables */}
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, padding: 16 }}>
          <RichTextEditor
            C={C}
            initialValue={plantilla?.contenido || ""}
            editorRef={editorRef}
            placeholder="Contenido de la plantilla. Usá {{expediente.caratula}}, {{actor.nombre}}, etc."
          />
        </div>
        {ayudaOpen && (
          <div style={{ width: 260, borderLeft: `1px solid ${C.border}`,
            padding: "16px 12px", overflowY: "auto", flexShrink: 0, background: C.bg }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 8 }}>
              Variables disponibles
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 12, lineHeight: 1.4 }}>
              Clic para copiar al portapapeles. Serán reemplazadas al generar el escrito.
            </div>
            {VARIABLES_AYUDA.map(v => (
              <div key={v.var}
                onClick={() => navigator.clipboard?.writeText(v.var)}
                style={{ marginBottom: 6, cursor: "pointer", padding: "5px 8px",
                  borderRadius: 6, background: C.surface, border: `1px solid ${C.border}` }}
                title="Clic para copiar">
                <div style={{ fontFamily: "monospace", fontSize: 11, color: C.accent, marginBottom: 2 }}>
                  {v.var}
                </div>
                <div style={{ fontSize: 10, color: C.muted }}>{v.desc}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── PlantillasModule ──────────────────────────────────────────

function PlantillasModule({ C, clienteId, onUsarPlantilla }) {
  const [view, setView]             = useState("lista");
  const [plantillas, setPlantillas] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [activa, setActiva]         = useState(null);
  const [filCat, setFilCat]         = useState("");

  const cargar = useCallback(async () => {
    if (!clienteId) return;
    setLoading(true);
    try {
      let url = `${API}/api/doctor/plantillas?cliente_id=${clienteId}`;
      if (filCat) url += `&categoria=${filCat}`;
      const data = await fetch(url, { headers: aH() }).then(r => r.ok ? r.json() : []);
      setPlantillas(data);
    } catch (_) {} finally { setLoading(false); }
  }, [clienteId, filCat]);

  useEffect(() => { cargar(); }, [cargar]);

  const onGuardado = (p) => {
    setPlantillas(prev => {
      const idx = prev.findIndex(x => x.id === p.id);
      return idx >= 0 ? prev.map(x => x.id === p.id ? p : x) : [p, ...prev];
    });
    setView("lista");
  };

  const eliminar = async (p) => {
    if (p.publica) return;
    if (!window.confirm(`¿Eliminar "${p.titulo}"?`)) return;
    await fetch(
      `${API}/api/doctor/plantillas/${p.id}?cliente_id=${clienteId}`,
      { method: "DELETE", headers: aH() }
    );
    setPlantillas(prev => prev.filter(x => x.id !== p.id));
  };

  if (view === "form") {
    return (
      <PlantillaForm
        C={C} clienteId={clienteId}
        plantilla={activa}
        onGuardado={onGuardado}
        onCancelar={() => setView("lista")}
      />
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "16px 24px", borderBottom: `1px solid ${C.border}`,
        display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.text, flex: 1 }}>Plantillas</div>
        <Btn C={C} onClick={() => { setActiva(null); setView("form"); }} style={{ fontSize: 12 }}>
          + Nueva plantilla
        </Btn>
      </div>
      {/* Filtro */}
      <div style={{ padding: "10px 24px", borderBottom: `1px solid ${C.border}`,
        display: "flex", gap: 10, flexShrink: 0 }}>
        <Sel C={C} value={filCat} onChange={e => setFilCat(e.target.value)}
          options={[{ value: "", label: "Todas las categorías" }, ...CATEGORIAS_ESCRITO]}
          style={{ fontSize: 12, flex: 1 }} />
      </div>
      {/* Lista */}
      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {loading ? <Spinner C={C} /> :
          plantillas.length === 0
            ? <EmptyState C={C} icon="📋" title="Sin plantillas"
                sub="Creá tu primera plantilla con el botón de arriba." />
            : plantillas.map(p => (
                <div key={p.id}
                  style={{ padding: "12px 16px", background: C.surface, borderRadius: 10,
                    border: `1px solid ${C.border}`, marginBottom: 8,
                    borderLeft: `4px solid ${p.publica ? "#10b981" : C.accent}`,
                    display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
                        {p.titulo}
                      </span>
                      {p.publica && <Chip label="Pública" color="#10b981" />}
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <Chip label={labelDe(CATEGORIAS_ESCRITO, p.categoria)} color={C.accent} />
                      {p.descripcion && (
                        <span style={{ fontSize: 11, color: C.muted }}>{p.descripcion}</span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    {onUsarPlantilla && (
                      <Btn C={C} onClick={() => onUsarPlantilla(p)} style={{ fontSize: 11 }}>
                        Usar
                      </Btn>
                    )}
                    {!p.publica && (
                      <>
                        <Btn C={C} variant="ghost"
                          onClick={() => { setActiva(p); setView("form"); }}
                          style={{ fontSize: 11 }}>
                          ✏ Editar
                        </Btn>
                        <Btn C={C} variant="ghost"
                          onClick={() => eliminar(p)}
                          style={{ fontSize: 11, color: "#ef4444" }}>
                          🗑
                        </Btn>
                      </>
                    )}
                  </div>
                </div>
              ))
        }
      </div>
    </div>
  );
}

// ── Sub-navegación Doctor ─────────────────────────────────────

const SUB_NAV = [
  { key: "expedientes", label: "📁 Expedientes",  fase: null },
  { key: "agenda",      label: "📅 Agenda",        fase: null },
  { key: "personas",    label: "👥 Personas",       fase: null },
  { key: "escritos",    label: "📄 Escritos",       fase: null },
  { key: "cuentas",     label: "💰 Cuentas",        fase: "Fase 6" },
  { key: "ia",          label: "🤖 Doctor IA",      fase: null },
  { key: "procuracion", label: "⚖️ Procuración",    fase: "Fase 7" },
  { key: "biblioteca",  label: "📚 Biblioteca",     fase: "Fase 8" },
  { key: "bandeja",     label: "🔔 Bandeja",        fase: "Fase 9" },
  { key: "config",      label: "⚙️ Config",         fase: "Fase 10" },
];

// ── Componente principal ──────────────────────────────────────

export default function DoctorModule({ C, clienteId }) {
  const [subTab, setSubTab]             = useState("expedientes");
  const [view, setView]                 = useState("lista");
  const [expId, setExpId]               = useState(null);
  const [usuarios, setUsuarios]         = useState([]);
  const [iaOpen, setIaOpen]             = useState(false);
  const [triggerResumir, setTriggerResumir] = useState(0);
  const [agendaBadge, setAgendaBadge]   = useState(0);
  // Navegación entrante Expediente → EscritorModule
  const [escritoPendiente, setEscritoPendiente] = useState(null);

  // Cargar usuarios para selects de responsable
  useEffect(() => {
    if (!clienteId) return;
    fetch(`${API}/api/doctor/usuarios?cliente_id=${clienteId}`, { headers: aH() })
      .then((r) => r.ok ? r.json() : [])
      .then(setUsuarios)
      .catch(() => {});
  }, [clienteId]);

  // Badge de vencimientos próximos (≤3 días) en sub-nav Agenda
  const refreshBadge = useCallback(() => {
    if (!clienteId) return;
    fetch(`${API}/api/doctor/agenda/proximos?cliente_id=${clienteId}&dias=3`, { headers: aH() })
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setAgendaBadge(Array.isArray(data) ? data.length : 0))
      .catch(() => {});
  }, [clienteId]);

  useEffect(() => {
    refreshBadge();
    // Refrescar cada 5 minutos
    const t = setInterval(refreshBadge, 5 * 60 * 1000);
    return () => clearInterval(t);
  }, [refreshBadge]);

  // Atajo de teclado Cmd/Ctrl+I → toggle panel IA
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "i") {
        e.preventDefault();
        setIaOpen((p) => !p);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Guard: admin sin cliente seleccionado
  if (!clienteId) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚖️</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Seleccioná un cliente</div>
          <div style={{ fontSize: 13, color: C.muted }}>Andá a Admin → elegí un cliente → volvé a Doctor</div>
        </div>
      </div>
    );
  }

  const irALista   = () => { setView("lista"); setExpId(null); };
  const irANuevo   = () => { setView("nuevo"); };
  const irADetalle = (id) => { setExpId(id); setView("detalle"); };
  const onCreado   = (exp) => { irADetalle(exp.id); };

  // expedienteId activo para el panel IA
  const activeExpId = view === "detalle" ? expId : null;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, position: "relative" }}>

      {/* Sub-nav horizontal */}
      <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, flexShrink: 0, overflowX: "auto", background: C.surface }}>
        {SUB_NAV.map((item) => {
          const active = subTab === item.key;
          return (
            <div key={item.key}
              onClick={() => { setSubTab(item.key); if (item.key === "expedientes") irALista(); }}
              style={{ padding: "12px 16px", cursor: "pointer", whiteSpace: "nowrap", fontSize: 13,
                fontWeight: active ? 600 : 400, color: active ? C.accent : C.muted,
                borderBottom: active ? `2px solid ${C.accent}` : "2px solid transparent",
                transition: "all .15s", flexShrink: 0, display: "flex", alignItems: "center", gap: 6 }}>
              {item.label}
              {item.key === "agenda" && agendaBadge > 0 && (
                <span style={{
                  background: "#ef4444", color: "#fff", borderRadius: "999px",
                  fontSize: 10, fontWeight: 700, minWidth: 16, height: 16,
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  padding: "0 4px", lineHeight: 1,
                }}>
                  {agendaBadge > 9 ? "9+" : agendaBadge}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Contenido del sub-tab activo */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>

        {/* Submódulos con placeholder (solo los que tienen fase asignada) */}
        {SUB_NAV.filter((x) => x.fase !== null).map((item) =>
          subTab === item.key
            ? <Placeholder key={item.key} C={C} fase={item.fase} />
            : null
        )}

        {/* Doctor IA — página completa */}
        {subTab === "ia" && (
          <DoctorIAPage C={C} clienteId={clienteId} expedienteId={activeExpId} />
        )}

        {/* Agenda */}
        {subTab === "agenda" && (
          <AgendaModule C={C} clienteId={clienteId} onAgendaChange={refreshBadge} />
        )}

        {/* Personas */}
        {subTab === "personas" && (
          <PersonasModule C={C} clienteId={clienteId} />
        )}

        {/* Escritos */}
        {subTab === "escritos" && (
          <EscritorModule
            C={C} clienteId={clienteId}
            escritoPendiente={escritoPendiente}
            onEscritoPendienteConsumed={() => setEscritoPendiente(null)}
          />
        )}

        {/* Expedientes — con sub-vistas */}
        {subTab === "expedientes" && view === "lista" && (
          <ExpedientesLista C={C} clienteId={clienteId} onNuevo={irANuevo} onVer={irADetalle} />
        )}
        {subTab === "expedientes" && view === "nuevo" && (
          <NuevoExpedienteForm C={C} clienteId={clienteId} usuarios={usuarios} onCreado={onCreado} onCancelar={irALista} />
        )}
        {subTab === "expedientes" && view === "detalle" && expId && (
          <ExpedienteDetalle
            C={C}
            clienteId={clienteId}
            expedienteId={expId}
            usuarios={usuarios}
            onVolver={irALista}
            onResumirIA={() => { setIaOpen(true); setTriggerResumir((p) => p + 1); }}
            onEscritoCreado={(e) => { setEscritoPendiente(e); setSubTab("escritos"); }}
          />
        )}

      </div>

      {/* Panel IA flotante (solo fuera de sub-tab ia) */}
      {subTab !== "ia" && (
        <DoctorIAPanel
          C={C}
          clienteId={clienteId}
          expedienteId={activeExpId}
          iaOpen={iaOpen}
          setIaOpen={setIaOpen}
          triggerResumir={triggerResumir}
        />
      )}
    </div>
  );
}
