import React, { useState, useEffect, useRef, useCallback } from "react";
import { DARK_C, LIGHT_C, TYPOGRAPHY } from "./theme";
import { STAGES, FUNNEL_ORDER, PROF_COLORS, MONEDAS_MUNDO } from "./constants";
import { API, tok, aH, jH } from "./utils/api";
import { useIsMobile } from "./hooks/useIsMobile";
import DoctorModule from "./modules/Doctor";

// -- Componente de reproducción de audio --
function AudioBubble({ audioUrl }) {
  const [playing, setPlaying] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [error, setError] = React.useState(false);
  const audioRef = React.useRef(null);

  const fmtSec = s => isNaN(s) ? "0:00" : `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) { el.pause(); setPlaying(false); }
    else { el.play().then(()=>setPlaying(true)).catch(e=>{ console.error('audio play error:', e); setError(true); }); }
  };

  const seek = (e) => {
    const el = audioRef.current;
    if (!el || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    el.currentTime = ((e.clientX - rect.left) / rect.width) * duration;
  };

  if (!audioUrl) return (
    <div style={{display:"flex",alignItems:"center",gap:6,color:"#8696a0",fontSize:12}}>
      <span style={{fontSize:18}}>🎙</span><span>Audio</span>
    </div>
  );

  return (
    <div style={{display:"flex",alignItems:"center",gap:8,minWidth:180,maxWidth:260}}>
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
        onLoadedMetadata={e => setDuration(e.target.duration || 0)}
        onTimeUpdate={e => { const d = e.target.duration||1; setProgress((e.target.currentTime/d)*100); }}
        onEnded={() => { setPlaying(false); setProgress(0); }}
        onError={e => { console.error('audio element error:', e.target.error); setError(true); }}
        style={{display:"none"}}
      />
      <button onClick={toggle}
        style={{width:36,height:36,borderRadius:"50%",background:"rgba(255,255,255,0.18)",border:"none",color:"white",fontSize:15,cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
        {playing ? "⏸" : "▶"}
      </button>
      <div style={{flex:1}}>
        <div style={{height:4,background:"rgba(255,255,255,0.15)",borderRadius:2,cursor:"pointer",position:"relative"}} onClick={seek}>
          <div style={{height:"100%",width:`${progress}%`,background:"#e9edef",borderRadius:2,transition:"width .1s"}}/>
        </div>
        <div style={{fontSize:10,color:"#8696a0",marginTop:3}}>
          {error ? "Error al cargar" : duration > 0 ? fmtSec(duration) : "🎙 Audio"}
        </div>
      </div>
    </div>
  );
}

// C se calcula dinámicamente según el tema guardado en localStorage.
// DARK_C y LIGHT_C vienen de ./theme; STAGES, etc. de ./constants.
const _storedTheme = typeof localStorage !== 'undefined' ? localStorage.getItem('skyward_theme') : 'dark';
let C = _storedTheme === 'light' ? LIGHT_C : DARK_C;
const _storedScale = typeof localStorage !== 'undefined' ? (localStorage.getItem('skyward_ui_scale')||'sm') : 'sm';
const UI_SCALE = _storedScale === 'lg' ? 1.5 : _storedScale === 'md' ? 1.3 : 1;
// Aplicar zoom al elemento raíz para escalar toda la UI
if (typeof document !== 'undefined' && UI_SCALE !== 1) {
  document.documentElement.style.zoom = UI_SCALE;
}
// vh no se ajusta al zoom CSS, hay que calcular la altura de modales manualmente
const _winH = typeof window !== 'undefined' ? window.innerHeight : 800;
// Altura del app root: compensar el zoom CSS para que no exceda el viewport físico.
// Con zoom:1.3, 100% da 900px CSS que rinden 1170px físico (excede el viewport de 900px).
// Usando _winH/UI_SCALE obtenemos los px CSS que × zoom = exactamente el viewport.
const APP_H = UI_SCALE !== 1 ? `${Math.floor(_winH / UI_SCALE)}px` : '100%';
const MH92 = `${Math.floor(_winH * 0.92 / UI_SCALE)}px`;
const MH90 = `${Math.floor(_winH * 0.90 / UI_SCALE)}px`;
const MH85 = `${Math.floor(_winH * 0.85 / UI_SCALE)}px`;

function timeAgo(d) {
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60) return "ahora";
  if (s < 3600) return `hace ${Math.floor(s/60)}m`;
  if (s < 86400) return `hace ${Math.floor(s/3600)}h`;
  return `hace ${Math.floor(s/86400)}d`;
}

// tok, aH, jH → importados desde ./utils/api

function Spinner() {
  return <div style={{width:28,height:28,border:`2px solid ${C.border}`,borderTop:`2px solid ${C.accent}`,borderRadius:"50%",animation:"spin .8s linear infinite"}}/>;
}

function Badge({ etapa }) {
  const s = STAGES[etapa] || STAGES.RAPPORT;
  return <span style={{background:s.bg,color:s.color,border:`1px solid ${s.color}33`,padding:"2px 8px",borderRadius:2,fontSize:10,fontWeight:600,whiteSpace:"nowrap"}}>{s.label}</span>;
}

function Btn({ onClick, disabled, children, secondary=false, small=false, style:xStyle }) {
  const [hov, setHov] = React.useState(false);
  const [act, setAct] = React.useState(false);
  const bg = secondary ? "transparent" : act ? C.accentActive : hov ? C.accentHover : C.accent;
  return (
    <button onClick={onClick} disabled={disabled}
      onMouseEnter={() => !disabled && setHov(true)}
      onMouseLeave={() => { setHov(false); setAct(false); }}
      onMouseDown={() => !disabled && setAct(true)}
      onMouseUp={() => setAct(false)}
      style={{
        background: bg,
        border: secondary ? `1px solid ${C.border}` : "none",
        borderRadius:4, color: secondary ? C.muted : "white",
        padding: small ? "5px 12px" : "8px 16px",
        fontSize: small ? 11 : 13, fontWeight:600, cursor: disabled ? "not-allowed" : "pointer",
        fontFamily:"inherit", opacity: disabled ? 0.6 : 1,
        transition: "background 200ms ease",
        ...(xStyle||{})
      }}>{children}</button>
  );
}

function Field({ label, value, onChange, placeholder, type="text", textarea=false }) {
  const s = {width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"10px 14px",color:C.text,fontSize:13,fontFamily:"inherit"};
  return (
    <div style={{marginBottom:14}}>
      <label style={{fontSize:11,color:C.muted,fontWeight:500,display:"block",marginBottom:5}}>{label}</label>
      {textarea
        ? <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={3} style={{...s,resize:"vertical"}}/>
        : <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={s}/>
      }
    </div>
  );
}

// -- MONEDA SELECTOR ----------------------------------------------------------

function AddMetodoPago({ activos, setCampos, campos }) {
  const [val, setVal] = useState("");
  const agregar = () => {
    const v = val.trim().toLowerCase().replace(/\s+/g,"_");
    if (!v || activos.includes(v)) return;
    setCampos({...campos, metodos_pago: [...activos, v].join(",")});
    setVal("");
  };
  return (
    <div style={{display:"flex",gap:8,alignItems:"center",marginTop:4}}>
      <input value={val} onChange={e=>setVal(e.target.value)}
        onKeyDown={e=>e.key==="Enter"&&agregar()}
        placeholder="Agregar método personalizado..."
        style={{flex:1,background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"8px 12px",color:C.text,fontSize:12,fontFamily:"inherit"}}/>
      <button onClick={agregar}
        style={{background:C.accent,border:"none",color:"white",borderRadius:4,padding:"8px 14px",fontSize:12,cursor:"pointer",fontWeight:600,fontFamily:"inherit"}}>
        + Agregar
      </button>
    </div>
  );
}

function MonedaSelector({ campos, setCampos }) {
  const [q, setQ] = useState("");
  const activas = (campos?.monedas||"").split(",").filter(Boolean);
  const filtradas = q
    ? MONEDAS_MUNDO.filter(m => m.code.toLowerCase().includes(q.toLowerCase()) || m.label.toLowerCase().includes(q.toLowerCase()))
    : MONEDAS_MUNDO;

  const toggle = (code) => {
    const next = activas.includes(code) ? activas.filter(x=>x!==code) : [...activas, code];
    setCampos({...campos, monedas: next.join(",")});
  };

  return (
    <div>
      <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar moneda..."
        style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"8px 12px",color:C.text,fontSize:12,fontFamily:"inherit",marginBottom:8}}/>
      <div style={{maxHeight:180,overflowY:"auto",display:"flex",flexWrap:"wrap",gap:6,padding:4}}>
        {filtradas.map(m => {
          const active = activas.includes(m.code);
          return (
            <div key={m.code} onClick={()=>toggle(m.code)}
              title={m.label}
              style={{padding:"5px 10px",borderRadius:2,border:`1px solid ${active?C.accent:C.border}`,background:active?C.accentGlow:"transparent",cursor:"pointer",fontSize:11,fontWeight:active?700:400,color:active?C.accentLight:C.muted,transition:"all .15s",whiteSpace:"nowrap"}}>
              {m.code}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// -- ONBOARDING CHECKLIST ------------------------------------------------------

const ONBOARDING_PASOS = [
  {
    fase: 1, faseLabel: "Cuenta y accesos",
    pasos: [
      {
        id: "crear_cliente", label: "Crear cliente en el sistema",
        desc: "El cliente ya aparece en la lista de Admin. Este paso se completa automáticamente al crear el cliente.",
        auto: true,
        detalle: null
      },
      {
        id: "crear_usuario", label: "Crear usuario y contraseña",
        desc: "Ir a Admin → cliente → crear usuario con email y contraseña para que el equipo pueda acceder al panel.",
        detalle: "Ve a la fila del cliente en Admin → botón 'Usuarios' → Nuevo usuario. Asigná el rango correcto:\n• Socio/Dueño: ve todo\n• Abogado Auxiliar: casos, honorarios y agenda\n• Secretario/a: solo conversaciones y agenda"
      },
      {
        id: "configurar_pais", label: "Configurar país",
        desc: "Entrar al cliente → Config → WhatsApp → seleccionar el país del negocio. Esto normaliza los teléfonos correctamente.",
        detalle: "Es importante hacerlo antes de que lleguen prospectos. Afecta cómo se formatean los números para enviar mensajes."
      },
    ]
  },
  {
    fase: 2, faseLabel: "WhatsApp API",
    pasos: [
      {
        id: "meta_crear_app", label: "Crear app en Meta Developers",
        desc: "Ir a developers.facebook.com → Crear app → Tipo: Business → Agregar producto WhatsApp.",
        detalle: "URL: https://developers.facebook.com/apps\n\n1. Clic en 'Crear app'\n2. Seleccionar tipo: 'Business'\n3. Nombre de la app: nombre del cliente\n4. En el dashboard de la app → Agregar producto → WhatsApp\n5. Conectar a la cuenta de Meta Business del cliente"
      },
      {
        id: "meta_numero", label: "Agregar y verificar número de WhatsApp",
        desc: "En la app de Meta → WhatsApp → Configuración → Agregar número de teléfono. El número no puede estar en WhatsApp personal.",
        detalle: "⚠️ IMPORTANTE: El número que se conecte a la API NO puede estar activo en WhatsApp personal o WhatsApp Business app al mismo tiempo.\n\n1. WhatsApp → Configuración → Números de teléfono → Agregar número\n2. Ingresar el número con código de país\n3. Verificar con SMS o llamada\n4. Copiar el Phone Number ID que aparece"
      },
      {
        id: "meta_token", label: "Obtener token permanente",
        desc: "Crear un usuario del sistema en Meta Business → generar token permanente con permisos de WhatsApp.",
        detalle: "1. Ir a business.facebook.com → Configuración → Usuarios del sistema\n2. Crear usuario del sistema (rol: Admin)\n3. Asignar activos: la app de WhatsApp\n4. Generar token → seleccionar la app → permisos necesarios:\n   • whatsapp_business_messaging\n   • whatsapp_business_management\n5. Copiar el token (solo se muestra una vez)\n\n⚠️ NO usar el token temporal de la página de inicio — vence en 24hs"
      },
      {
        id: "configurar_api", label: "Configurar credenciales en el panel",
        desc: "Ir al cliente → Config → WhatsApp → pegar Phone Number ID y Token → Guardar.",
        detalle: "Una vez guardado, el sistema va a usar estas credenciales para todos los mensajes del cliente."
      },
      {
        id: "webhook", label: "Configurar webhook en Meta",
        desc: "En Meta Developers → WhatsApp → Configuración → Webhook. URL del bot + verify token.",
        detalle: `URL del webhook: https://api.edgecrm.net/webhook\nVerify token: el que está en las variables de Railway (VERIFY_TOKEN)\n\n1. En Meta Developers → tu app → WhatsApp → Configuración\n2. Sección Webhook → Editar\n3. Pegar la URL y el verify token\n4. Verificar y guardar\n5. Suscribir al evento: messages\n\n✅ Si el webhook se verifica correctamente, el bot empieza a recibir mensajes.`
      },
      {
        id: "test_conexion", label: "Testear conexión",
        desc: "Enviar un mensaje al número desde un teléfono y verificar que el bot responde.",
        detalle: "1. Desde cualquier teléfono, escribir al número del cliente en WhatsApp\n2. El bot debería responder en menos de 5 segundos\n3. Si no responde, revisar logs en Railway → edge-bot → Deployments → logs\n4. Buscar errores con el número de teléfono"
      },
    ]
  },
  {
    fase: 3, faseLabel: "Plantillas Meta",
    pasos: [
      {
        id: "plantillas_crear", label: "Crear las 26 plantillas en Meta",
        desc: "Ir a business.facebook.com/wa/manage/message-templates → crear cada plantilla según la lista.",
        detalle: `Plantillas a crear (todas en idioma Spanish, categoría Marketing salvo las de recordatorio que van en Utilidad):

SEGUIMIENTO RAPPORT (B):
• edge_b1: Hola {{1}}, pudiste ver el mensajito que te mandé? 😊
• edge_b2: Hola {{1}}! cómo estás? quería saber si pudiste revisar lo que te compartí
• edge_b3: Hola {{1}}! justo hoy llegó un caso muy parecido al tuyo y me acordé de vos, te parece si hablamos un ratito?
• edge_b4: Hola {{1}}, sigo por acá por si tenés alguna duda o consulta 😊
• edge_b5: Hola {{1}}! cómo vas? pudiste pensar un poco en lo que estuvimos viendo?
• edge_b6: Hola {{1}}, no quiero ser molesto/a pero sé que esto puede ayudarte, seguís interesado/a?
• edge_b7: Hola {{1}}, último mensajito de mi parte. Si en algún momento querés saber más, acá estoy 😊

SEGUIMIENTO AGENDA (C):
• edge_c1: Hola {{1}}, te escribo para coordinar tu cita, cuándo te vendría bien?
• edge_c2: Hola {{1}}! pudiste pensar en un horario para tu cita?
• edge_c3: Hola {{1}}, tenemos lugar esta semana, te interesa que te reserve un horario?
• edge_c4: Hola {{1}}! solo quería confirmar si seguís con ganas de tener tu cita 😊
• edge_c5: Hola {{1}}, los horarios se están llenando, querés que te guarde uno?
• edge_c6: Hola {{1}}! última chance esta semana, coordinamos tu cita?
• edge_c7: Hola {{1}}, cuando quieras retomar acá estamos, no te preocupes 😊

RECORDATORIOS (Utilidad - 3 variables: nombre, fecha, hora):
• edge_rec1: Hola {{1}}! te recuerdo que tenés tu cita el {{2}} a las {{3}}hs. Confirmás asistencia? 😊
• edge_rec2: Hola {{1}}! tu cita es en 3 días, el {{2}} a las {{3}}hs. Todo bien para esa fecha?
• edge_rec3: Hola {{1}}! tu cita es en una semana, el {{2}} a las {{3}}hs. Sigue en pie?
• edge_rec4: Hola {{1}}! te cuento que tu cita está agendada para el {{2}} a las {{3}}hs. Cualquier cambio avisame 😊
• edge_rec5: Hola {{1}}! queríamos avisarte que tu cita del {{2}} a las {{3}}hs sigue confirmada 😊
• edge_rec6: Hola {{1}}! falta un mes para tu cita el {{2}} a las {{3}}hs. Seguís con todo? 😊
• edge_rec7: Hola {{1}}! todavía falta bastante pero queríamos confirmarte que tu cita del {{2}} a las {{3}}hs está agendada 😊

REACTIVACIÓN (Marketing):
• edge_react1: Hola {{1}}! cómo estás? hace tiempo que no hablamos, quería saber cómo seguís 😊
• edge_react2: Hola {{1}}! me acordé de vos hoy, cómo vas con todo?
• edge_react3: Hola {{1}}! justo hoy llegó un caso parecido al tuyo y pensé en vos, cómo estás?
• edge_react4: Hola {{1}}! tenemos novedades que creo que te pueden interesar, hablamos?
• edge_react5: Hola {{1}}! arrancó un nuevo período y quería ver si querés que retomemos 😊

RECUPERACIÓN (Marketing):
• edge_recuperar_horario: Hola {{1}}, perdón que tardé en responderte! 😅 quería coordinar tu cita, te queda bien esta semana?
• edge_recuperar_reagenda: Hola {{1}}, perdón que tardé! 😊 encontraste algún horario que te venga mejor?

RECUPERACIÓN CONFIRMACIÓN (Utilidad):
• edge_recuperar_confirmacion: Hola {{1}}, perdón la demora! el turno del {{2}} a las {{3}}hs te sigue quedando bien?

⚠️ Para cada plantilla con {{1}}: muestra → María
⚠️ Para las de 3 variables: {{1}} → María | {{2}} → 15 de abril | {{3}} → 10:00`
      },
      {
        id: "plantillas_esperar", label: "Esperar aprobación de Meta",
        desc: "Meta tarda entre 1 hora y 48 horas en aprobar las plantillas. El sistema no puede hacer seguimientos automáticos hasta que estén aprobadas.",
        detalle: "Ir a business.facebook.com/wa/manage/message-templates y verificar que todas figuren como 'Activa' (verde).\n\nSi alguna es rechazada, revisar el motivo y ajustar el texto. Los rechazos más comunes son:\n• Texto muy corto con muchas variables\n• Contenido que parece spam\n• Variables al principio o al final del mensaje"
      },
    ]
  },
  {
    fase: 4, faseLabel: "Configuración del bot",
    pasos: [
      {
        id: "bot_nombre", label: "Configurar nombre y tono del bot",
        desc: "Cliente → Config → Bot → nombre del bot, tono de comunicación, descripción de la agencia.",
        detalle: "Nombre del bot: puede ser el nombre de una persona (ej: \"Martina\") o genérico (\"Asistente de Skyward\")\nTono: profesional y cálido / cercano / formal\nDescripción: 2-3 líneas sobre qué hace la agencia, qué servicios ofrece, a quién ayuda"
      },
      {
        id: "bot_horarios", label: "Configurar horarios de atención",
        desc: "Cliente → Config → Horarios → agregar los días y horarios en que el bot está activo.",
        detalle: "Fuera de los horarios configurados, el bot responde con el mensaje de fuera de horario.\n\nRecomendación: configurar horarios amplios (ej: Lunes a Sábado 8:00-22:00) para que el bot capture prospectos incluso fuera del horario de la agencia."
      },
      {
        id: "bot_fuera_horario", label: "Configurar mensaje fuera de horario",
        desc: "Cliente → Config → Bot → mensaje fuera de horario. Qué responde el bot cuando llega un mensaje fuera del horario configurado.",
        detalle: "Ejemplo: 'Hola! gracias por escribirnos 😊 Estamos fuera de horario pero mañana a las 9hs te contactamos. Mientras tanto contanos, ¿en qué podemos ayudarte?'"
      },
      {
        id: "bot_modalidad", label: "Configurar modalidad",
        desc: "Presencial, virtual o ambas. Afecta cómo el bot presenta las opciones de cita.",
        detalle: "Si es solo presencial: el bot no pregunta por modalidad\nSi es solo virtual: el bot da el link de videollamada\nSi es ambas: el bot pregunta la preferencia del prospecto"
      },
    ]
  },
  {
    fase: 5, faseLabel: "Agenda y profesionales",
    pasos: [
      {
        id: "profesionales", label: "Cargar profesionales",
        desc: "Cliente → Config → Profesionales → agregar cada profesional con nombre y especialidad.",
        detalle: "Cada profesional puede tener sus propios horarios de disponibilidad si configurás Google."
      },
      {
        id: "tratamientos", label: "Cargar servicios",
        desc: "Cliente → Config → Servicios → agregar los servicios que ofrece la agencia con nombre y precio.",
        detalle: "Los servicios se usan para:\n• Segmentar prospectos por interés\n• Filtrar en difusión\n• Registrar en la reunión confirmada"
      },
      {
        id: "campos_agenda", label: "Configurar campos de agenda",
        desc: "Cliente → Config → Agenda → activar los campos que el bot debe recolectar (nombre, teléfono, información adicional, etc.).",
        detalle: "Campos disponibles:\n• Nombre ✓ (siempre activo)\n• Teléfono de contacto\n• Documento\n• Email\n• Información adicional\n• Modalidad (presencial/virtual)\n• Notas adicionales\n\nSolo activar los que realmente necesita la agencia — menos campos = más conversiones."
      },
      {
        id: "google_calendar", label: "Conectar Google (opcional)",
        desc: "Cliente → Config → Conectar Google → autorizar acceso. Los turnos confirmados se sincronizan automáticamente.",
        detalle: "1. Ir a Config → Google\n2. Clic en 'Conectar con Google'\n3. Autorizar con la cuenta de Google del cliente\n4. Los turnos nuevos aparecen en el calendario automáticamente\n\nSi no conectan Google, los turnos se gestionan solo desde el panel."
      },
    ]
  },
  {
    fase: 6, faseLabel: "Test y lanzamiento",
    pasos: [
      {
        id: "test_bot", label: "Testear flujo completo del bot",
        desc: "Escribir al número del cliente como si fuera un prospecto y verificar que el bot responde correctamente.",
        detalle: "Probar:\n1. ✅ Bot responde al primer mensaje\n2. ✅ Hace las preguntas de rapport\n3. ✅ Ofrece horarios disponibles\n4. ✅ El turno queda registrado en el panel\n5. ✅ El turno aparece en Google (si está conectado)\n6. ✅ La confirmación llega al prospecto"
      },
      {
        id: "test_plantillas", label: "Testear plantillas Meta",
        desc: "Verificar que las plantillas aprobadas se envían correctamente. Usar la difusión para mandar una plantilla de prueba.",
        detalle: "1. Ir a Difusión → seleccionar tu propio número\n2. Elegir una plantilla de reactivación\n3. Verificar que llegue el mensaje\n4. Si no llega: revisar que la plantilla esté activa en Meta y que el número esté en formato correcto"
      },
      {
        id: "capacitar", label: "Capacitar al equipo en el panel",
        desc: "Mostrar al equipo cómo usar el panel: ver conversaciones, responder mensajes, confirmar turnos y usar acciones rápidas.",
        detalle: "Puntos clave a mostrar:\n• Cómo ver cuáles prospectos están listos para cerrar (banner naranja)\n• Cómo activar modo humano para tomar el chat\n• Cómo confirmar un turno desde el panel\n• Cómo usar las acciones rápidas (⚡)\n• Cómo instalar el panel como app en el celular (PWA)"
      },
      {
        id: "lanzar", label: "¡Lanzar! 🚀",
        desc: "El cliente está listo. Activar el bot y empezar a recibir prospectos.",
        detalle: "Checklist final:\n✅ Bot configurado y respondiendo\n✅ Plantillas aprobadas\n✅ Equipo capacitado\n✅ Google conectado\n✅ Servicios y profesionales cargados\n\n🎉 ¡El sistema está listo para funcionar!"
      },
    ]
  },
];

function OnboardingChecklist({ cliente, onClose, API, jH }) {
  const _t = typeof localStorage !== 'undefined' ? localStorage.getItem('skyward_theme') : 'dark'; const C = _t === 'light' ? LIGHT_C : DARK_C;
  const storageKey = `onboarding_${cliente.id}`;
  const [completados, setCompletados] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch { return {}; }
  });
  const [expandido, setExpandido] = React.useState(null);
  const [faseAbierta, setFaseAbierta] = React.useState(1);

  const totalPasos = ONBOARDING_PASOS.reduce((acc, f) => acc + f.pasos.length, 0);
  const totalCompletados = Object.values(completados).filter(Boolean).length;
  const progreso = Math.round((totalCompletados / totalPasos) * 100);

  const toggle = (id) => {
    const nuevo = { ...completados, [id]: !completados[id] };
    setCompletados(nuevo);
    try { localStorage.setItem(storageKey, JSON.stringify(nuevo)); } catch {}
  };

  // Auto-completar "crear_cliente"
  React.useEffect(() => {
    if (!completados.crear_cliente) {
      const nuevo = { ...completados, crear_cliente: true };
      setCompletados(nuevo);
      try { localStorage.setItem(storageKey, JSON.stringify(nuevo)); } catch {}
    }
  }, []);

  return (
    <div style={{position:"fixed",inset:0,z:1000,background:"rgba(0,0,0,0.85)",backdropFilter:"blur(12px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16,zIndex:1000}} onClick={onClose}>
      <div style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:2,width:"100%",maxWidth:720,maxHeight:MH90,display:"flex",flexDirection:"column",overflow:"hidden"}} onClick={e=>e.stopPropagation()}>

        {/* Header */}
        <div style={{padding:"24px 28px",borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:16}}>
            <div>
              <div style={{fontSize:11,color:C.accentLight,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:4}}>Onboarding</div>
              <div style={{fontSize:20,fontWeight:700}}>{cliente.nombre}</div>
            </div>
            <button onClick={onClose} style={{background:"transparent",border:`1px solid ${C.border}`,color:C.muted,width:32,height:32,borderRadius:4,cursor:"pointer",fontSize:16}}>×</button>
          </div>
          {/* Barra de progreso */}
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{flex:1,height:6,background:C.border,borderRadius:2,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${progreso}%`,background:progreso===100?"#10b981":C.accent,borderRadius:2,transition:"width 0.4s ease"}}/>
            </div>
            <div style={{fontSize:12,fontWeight:700,color:progreso===100?"#10b981":C.accentLight,minWidth:40}}>{progreso}%</div>
            <div style={{fontSize:11,color:C.muted}}>{totalCompletados}/{totalPasos}</div>
          </div>
          {progreso === 100 && (
            <div style={{marginTop:12,padding:"8px 14px",background:"rgba(16,185,129,0.1)",border:"1px solid rgba(16,185,129,0.3)",borderRadius:4,fontSize:12,color:"#4ade80",fontWeight:600}}>
              🎉 ¡Onboarding completado! El cliente está listo para operar.
            </div>
          )}
        </div>

        {/* Fases tabs */}
        <div style={{display:"flex",gap:4,padding:"12px 28px",borderBottom:`1px solid ${C.border}`,flexShrink:0,overflowX:"auto"}}>
          {ONBOARDING_PASOS.map(fase => {
            const completadosFase = fase.pasos.filter(p => completados[p.id]).length;
            const todosFase = fase.pasos.length;
            const faseLista = completadosFase === todosFase;
            return (
              <button key={fase.fase} onClick={()=>setFaseAbierta(fase.fase)}
                style={{flexShrink:0,padding:"6px 14px",borderRadius:4,border:`1px solid ${faseAbierta===fase.fase?C.accent:C.border}`,
                  background:faseAbierta===fase.fase?"rgba(99,102,241,0.15)":"transparent",
                  color:faseLista?"#4ade80":faseAbierta===fase.fase?C.accentLight:C.muted,
                  fontSize:11,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:6,whiteSpace:"nowrap"}}>
                {faseLista ? "✓" : `${fase.fase}`} {fase.faseLabel}
                <span style={{opacity:0.6}}>{completadosFase}/{todosFase}</span>
              </button>
            );
          })}
        </div>

        {/* Lista de pasos */}
        <div style={{flex:1,overflowY:"auto",padding:"16px 28px 28px"}}>
          {ONBOARDING_PASOS.filter(f => f.fase === faseAbierta).map(fase => (
            <div key={fase.fase}>
              {fase.pasos.map((paso, idx) => {
                const done = completados[paso.id];
                const abierto = expandido === paso.id;
                return (
                  <div key={paso.id} style={{marginBottom:8}}>
                    <div style={{background:C.surface,border:`1px solid ${done?"rgba(16,185,129,0.3)":C.border}`,borderRadius:2,overflow:"hidden",transition:"border-color 0.2s"}}>
                      <div style={{display:"flex",alignItems:"flex-start",gap:12,padding:"14px 16px",cursor:"pointer"}}
                        onClick={()=>setExpandido(abierto?null:paso.id)}>
                        {/* Checkbox */}
                        <div onClick={e=>{e.stopPropagation();toggle(paso.id);}}
                          style={{width:22,height:22,borderRadius:4,border:`2px solid ${done?"#10b981":C.border}`,
                            background:done?"#10b981":"transparent",display:"flex",alignItems:"center",justifyContent:"center",
                            cursor:"pointer",flexShrink:0,marginTop:1,transition:"all 0.2s"}}>
                          {done && <span style={{color:"white",fontSize:12,fontWeight:700}}>✓</span>}
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                            <span style={{fontSize:10,fontFamily:"'DM Mono',monospace",color:C.muted}}>PASO {idx+1}</span>
                            {paso.auto && <span style={{fontSize:9,padding:"2px 6px",borderRadius:4,background:"rgba(16,185,129,0.1)",color:"#4ade80",fontWeight:600}}>AUTO</span>}
                          </div>
                          <div style={{fontSize:14,fontWeight:600,color:done?C.muted:C.text,textDecoration:done?"line-through":"none"}}>{paso.label}</div>
                          <div style={{fontSize:12,color:C.muted,marginTop:3,lineHeight:1.5}}>{paso.desc}</div>
                        </div>
                        {paso.detalle && (
                          <div style={{color:C.muted,fontSize:11,flexShrink:0,marginTop:2}}>{abierto?"▲":"▼"}</div>
                        )}
                      </div>
                      {/* Detalle expandido */}
                      {abierto && paso.detalle && (
                        <div style={{padding:"0 16px 16px 50px"}}>
                          <div style={{background:"rgba(99,102,241,0.06)",border:`1px solid rgba(99,102,241,0.15)`,borderRadius:4,padding:"14px 16px"}}>
                            <pre style={{fontSize:12,color:C.muted,lineHeight:1.7,whiteSpace:"pre-wrap",fontFamily:"inherit",margin:0}}>{paso.detalle}</pre>
                          </div>
                          {!done && (
                            <button onClick={()=>toggle(paso.id)}
                              style={{marginTop:10,padding:"7px 16px",borderRadius:4,border:"none",background:C.accent,color:"white",fontSize:12,fontWeight:600,cursor:"pointer"}}>
                              Marcar como completado ✓
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// -- ADMIN ---------------------------------------------------------------------

// ============================================================
// PROPUESTAS COMERCIALES (Admin only)
// ============================================================
function PropuestasComerciales() {
  const [vista, setVista] = useState('lista'); // lista | editor | preview
  const [propuestas, setPropuestas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState(null); // propuesta seleccionada
  const [form, setForm] = useState({ empresa:'', contacto:'', paquete:'premium', info_cruda:'' });
  const [contenido, setContenido] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [generando, setGenerando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);

  const fetchPropuestas = async () => {
    try {
      const r = await fetch(`${API}/api/propuestas-comerciales`, { headers: aH() });
      const d = await r.json();
      setPropuestas(Array.isArray(d) ? d : []);
    } catch {}
    setLoading(false);
  };
  useEffect(() => { fetchPropuestas(); }, []);
  useEffect(() => {
    if (vista === 'preview' && contenido) {
      setPreviewLoading(true);
      fetch(`${API}/api/propuestas-comerciales/preview-html`, {
        method: 'POST', headers: jH(), body: JSON.stringify(contenido)
      }).then(r => r.text()).then(h => { setPreviewHtml(h); setPreviewLoading(false); })
        .catch(() => { setPreviewHtml('<p>Error cargando preview</p>'); setPreviewLoading(false); });
    }
  }, [vista, contenido]);

  const estadoColor = { borrador: C.muted, enviada: C.accent, vista: '#f59e0b', aceptada: C.green, rechazada: C.red };
  const paqueteColor = { starter: '#f59e0b', growth: '#14b8a6', premium: C.accent };

  const generar = async (extraMsg) => {
    setGenerando(true);
    try {
      const msgs = extraMsg
        ? [...historial, { role:'user', content: extraMsg }]
        : [{ role:'user', content: form.info_cruda || 'Generá una propuesta de ejemplo' }];
      const r = await fetch(`${API}/api/propuestas-comerciales/generar`, {
        method:'POST', headers: jH(),
        body: JSON.stringify({ info_cruda: form.info_cruda, paquete: form.paquete, historial_chat: msgs })
      });
      const d = await r.json();
      if (d.contenido) { setContenido(d.contenido); setHistorial(d.historial || msgs); }
    } catch {}
    setGenerando(false);
  };

  const guardar = async () => {
    setGuardando(true);
    try {
      const body = { titulo: contenido?.empresa || form.empresa, empresa: form.empresa || contenido?.empresa, contacto: form.contacto || contenido?.meta?.preparado_para, paquete: form.paquete, info_cruda: form.info_cruda, contenido };
      let r;
      if (sel) {
        r = await fetch(`${API}/api/propuestas-comerciales/${sel.id}`, { method:'PUT', headers: jH(), body: JSON.stringify(body) });
      } else {
        r = await fetch(`${API}/api/propuestas-comerciales`, { method:'POST', headers: jH(), body: JSON.stringify(body) });
      }
      const d = await r.json();
      setSel(d);
      fetchPropuestas();
    } catch {}
    setGuardando(false);
  };

  const eliminar = async (id) => {
    if (!confirm('¿Eliminar esta propuesta?')) return;
    await fetch(`${API}/api/propuestas-comerciales/${id}`, { method:'DELETE', headers: aH() });
    fetchPropuestas();
  };

  const cambiarEstado = async (id, estado) => {
    await fetch(`${API}/api/propuestas-comerciales/${id}/estado`, { method:'PUT', headers: jH(), body: JSON.stringify({ estado }) });
    fetchPropuestas();
  };

  const copiarLink = (uuid) => {
    navigator.clipboard.writeText(`https://api.edgecrm.net/propuesta/${uuid}`);
    setCopiedId(uuid); setTimeout(() => setCopiedId(null), 2000);
  };

  const nuevaPropuesta = () => {
    setSel(null); setContenido(null); setHistorial([]); setForm({ empresa:'', contacto:'', paquete:'premium', info_cruda:'' }); setChatInput('');
    setVista('editor');
  };

  const editarPropuesta = async (p) => {
    // Traer propuesta completa con contenido desde la API
    try {
      const r = await fetch(`${API}/api/propuestas-comerciales/${p.id}`, { headers: aH() });
      if (r.ok) {
        const full = await r.json();
        setSel(full);
        setForm({ empresa: full.empresa||'', contacto: full.contacto||'', paquete: full.paquete||'premium', info_cruda: full.info_cruda||'' });
        setContenido(full.contenido || null);
        setHistorial([]);
        setVista(full.contenido ? 'preview' : 'editor');
        return;
      }
    } catch {}
    // Fallback si falla el fetch
    setSel(p);
    setForm({ empresa: p.empresa||'', contacto: p.contacto||'', paquete: p.paquete||'premium', info_cruda: p.info_cruda||'' });
    setContenido(p.contenido || null);
    setHistorial([]);
    setVista('editor');
  };

  // ---- LISTA ----
  if (vista === 'lista') return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <span style={{fontWeight:600,fontSize:14}}>⚖️ Honorarios</span>
        <Btn onClick={nuevaPropuesta} small>+ Nuevo honorario</Btn>
      </div>
      {loading ? <div style={{color:C.muted,fontSize:13,padding:20}}>Cargando...</div> :
       propuestas.length === 0 ? <div style={{color:C.muted,fontSize:13,padding:20,textAlign:"center"}}>No hay propuestas aún. Creá tu primera propuesta comercial.</div> :
       <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr style={{borderBottom:`1px solid ${C.border}`}}>
            {["Empresa","Paquete","Estado","Vistas","Fecha",""].map((h,i) => (
              <th key={i} style={{padding:"10px 16px",textAlign:"left",fontSize:11,color:C.muted,fontWeight:500,textTransform:"uppercase",letterSpacing:".6px"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {propuestas.map(p => (
              <tr key={p.id} className="hr" style={{borderBottom:`1px solid ${C.border}`,cursor:"pointer"}} onClick={()=>editarPropuesta(p)}>
                <td style={{padding:"12px 16px",fontWeight:500,fontSize:13}}>{p.empresa||p.titulo||'Sin nombre'}<div style={{fontSize:11,color:C.muted}}>{p.contacto||''}</div></td>
                <td style={{padding:"12px 16px"}}><span style={{background:`${paqueteColor[p.paquete]||C.accent}22`,color:paqueteColor[p.paquete]||C.accent,border:`1px solid ${paqueteColor[p.paquete]||C.accent}44`,borderRadius:2,padding:"3px 8px",fontSize:10,fontWeight:600,textTransform:"capitalize"}}>{p.paquete||'-'}</span></td>
                <td style={{padding:"12px 16px"}}><span style={{color:estadoColor[p.estado]||C.muted,fontSize:12,fontWeight:500,textTransform:"capitalize"}}>{p.estado}</span></td>
                <td style={{padding:"12px 16px",fontSize:13}}>{p.vistas||0}</td>
                <td style={{padding:"12px 16px",fontSize:12,color:C.muted}}>{p.creado_en ? new Date(p.creado_en).toLocaleDateString('es-AR') : '-'}</td>
                <td style={{padding:"12px 16px",textAlign:"right"}} onClick={e=>e.stopPropagation()}>
                  <span style={{display:"flex",gap:6,justifyContent:"flex-end"}}>
                    {p.uuid && <Btn onClick={()=>copiarLink(p.uuid)} secondary small>{copiedId===p.uuid?'Copiado':'Link'}</Btn>}
                    <select value={p.estado} onChange={e=>cambiarEstado(p.id,e.target.value)} onClick={e=>e.stopPropagation()} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"3px 6px",fontSize:10,color:C.text,cursor:"pointer",fontFamily:"inherit"}}>
                      {['borrador','enviada','vista','aceptada','rechazada'].map(e=><option key={e} value={e}>{e}</option>)}
                    </select>
                    <Btn onClick={()=>eliminar(p.id)} secondary small style={{color:C.red}}>X</Btn>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>}
    </div>
  );

  // ---- EDITOR ----
  if (vista === 'editor') return (
    <div>
      <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:16}}>
        <Btn onClick={()=>{setVista('lista');}} secondary small>← Volver</Btn>
        <span style={{fontWeight:600,fontSize:14}}>{sel ? 'Editar propuesta' : 'Nueva propuesta'}</span>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
        <Field label="Agencia / Empresa" value={form.empresa} onChange={v=>setForm({...form,empresa:v})} placeholder="FH Extensiones"/>
        <Field label="Nombre del contacto" value={form.contacto} onChange={v=>setForm({...form,contacto:v})} placeholder="Federico"/>
      </div>
      <div style={{marginBottom:16}}>
        <label style={{fontSize:11,color:C.muted,fontWeight:500,display:"block",marginBottom:5}}>Paquete</label>
        <div style={{display:"flex",gap:8}}>
          {[{k:'starter',l:'Starter ($400-500)'},{k:'growth',l:'Growth ($700-800)'},{k:'premium',l:'Premium ($1200-1400)'}].map(p=>(
            <button key={p.k} onClick={()=>setForm({...form,paquete:p.k})}
              style={{flex:1,padding:"10px 8px",borderRadius:4,border:`1px solid ${form.paquete===p.k?paqueteColor[p.k]:C.border}`,background:form.paquete===p.k?`${paqueteColor[p.k]}15`:C.bg,color:form.paquete===p.k?paqueteColor[p.k]:C.muted,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit",transition:"all .2s"}}>
              {p.l}
            </button>
          ))}
        </div>
      </div>
      <div style={{marginBottom:16}}>
        <label style={{fontSize:11,color:C.muted,fontWeight:500,display:"block",marginBottom:5}}>Notas de la llamada / contexto del prospecto</label>
        <textarea value={form.info_cruda} onChange={e=>setForm({...form,info_cruda:e.target.value})}
          placeholder="Pegá acá tus notas de la llamada, info del prospecto, problemas que tiene, qué le ofreciste, números que mencionó..."
          style={{width:"100%",minHeight:200,background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:14,color:C.text,fontSize:13,fontFamily:"inherit",resize:"vertical",lineHeight:1.6,boxSizing:"border-box"}}/>
        <div style={{marginTop:8,display:"flex",alignItems:"center",gap:10}}>
          <label style={{display:"inline-flex",alignItems:"center",gap:6,padding:"6px 12px",borderRadius:2,border:`1px solid ${C.border}`,background:C.bg,color:C.muted,fontSize:11,cursor:"pointer",transition:"all .2s"}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
            Adjuntar archivo
            <input type="file" accept=".txt,.md,.pdf,.doc,.docx,.json,.csv" multiple style={{display:"none"}} onChange={async e=>{
              const files = Array.from(e.target.files);
              let textos = [];
              for (const f of files) {
                if (f.type === 'application/pdf') {
                  textos.push(`\n--- Archivo: ${f.name} ---\n[PDF adjunto - contenido no extraíble desde el navegador. Describí el contenido manualmente o usá un archivo de texto.]`);
                } else {
                  const txt = await f.text();
                  textos.push(`\n--- Archivo: ${f.name} ---\n${txt}`);
                }
              }
              setForm(prev => ({...prev, info_cruda: prev.info_cruda + textos.join('\n')}));
              e.target.value = '';
            }}/>
          </label>
          <span style={{fontSize:10,color:C.muted}}>txt, md, json, csv</span>
        </div>
      </div>
      <div style={{display:"flex",gap:8}}>
        <Btn onClick={()=>generar()} disabled={generando}>{generando ? 'Generando...' : 'Generar con IA'}</Btn>
        {contenido && <Btn onClick={()=>setVista('preview')} secondary>Ver preview</Btn>}
        {contenido && <Btn onClick={guardar} disabled={guardando} secondary>{guardando?'Guardando...':'Guardar borrador'}</Btn>}
      </div>
      {contenido && (
        <div style={{marginTop:20,background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:16}}>
          <div style={{fontSize:13,fontWeight:600,marginBottom:8,color:C.green}}>Propuesta generada para: {contenido.empresa}</div>
          <div style={{fontSize:12,color:C.muted,marginBottom:12}}>Secciones: Diagnóstico ({(contenido.diagnostico?.problemas||[]).length} problemas) · Solución ({(contenido.solucion?.features||[]).length} features) · Timeline ({(contenido.timeline||[]).length} etapas)</div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter'&&chatInput.trim()){generar(chatInput.trim());setChatInput('');}}}
              placeholder="Pedile cambios: 'cambiá el precio a 1000', 'agregá un feature de email marketing'..."
              style={{flex:1,background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"9px 12px",color:C.text,fontSize:12,fontFamily:"inherit"}}/>
            <Btn onClick={()=>{if(chatInput.trim()){generar(chatInput.trim());setChatInput('');}}} small disabled={generando}>{generando?'...':'Ajustar'}</Btn>
          </div>
        </div>
      )}
    </div>
  );

  // ---- PREVIEW ----
  if (vista === 'preview' && contenido) {
    return (
      <div>
        <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:12,flexWrap:"wrap"}}>
          <Btn onClick={()=>setVista('editor')} secondary small>← Editar</Btn>
          <Btn onClick={()=>setVista('lista')} secondary small>Lista</Btn>
          {sel?.uuid && <Btn onClick={()=>copiarLink(sel.uuid)} small>{copiedId===sel.uuid?'Link copiado':'Copiar link'}</Btn>}
          {sel && sel.estado==='borrador' && <Btn onClick={()=>{cambiarEstado(sel.id,'enviada');setSel({...sel,estado:'enviada'});}} small>Marcar enviada</Btn>}
          <Btn onClick={guardar} disabled={guardando}>{guardando?'Guardando...':'Guardar'}</Btn>
          {sel?.uuid && <a href={`https://api.edgecrm.net/propuesta/${sel.uuid}`} target="_blank" rel="noopener" style={{fontSize:11,color:C.accent,textDecoration:"none"}}>Abrir link público ↗</a>}
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:8}}>
          <input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter'&&chatInput.trim()&&!generando){generar(chatInput.trim());setChatInput('');}}}
            placeholder="Pedí cambios: 'subí el precio a 1500', 'sacá la sección de timeline', 'cambiá la garantía'..."
            style={{flex:1,background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"9px 12px",color:C.text,fontSize:12,fontFamily:"inherit"}}/>
          <Btn onClick={()=>{if(chatInput.trim()){generar(chatInput.trim());setChatInput('');}}} small disabled={generando}>{generando?'Ajustando...':'Ajustar'}</Btn>
        </div>
        <div style={{background:"#F5F0E8",borderRadius:2,overflow:"hidden",border:`1px solid ${C.border}`,height:`${Math.floor(_winH * 0.72 / UI_SCALE)}px`}}>
          {previewLoading || generando ? <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%",color:"#7A6E62",fontSize:14}}>{generando?'Regenerando propuesta...':'Cargando preview...'}</div> :
          <iframe srcDoc={previewHtml} style={{width:"100%",height:"100%",border:"none"}} sandbox="allow-scripts"/>}
        </div>
      </div>
    );
  }

  return <div style={{color:C.muted,padding:20}}>Cargando...</div>;
}

function AdminView({ stats, clientes, onSelectClient, onRefresh, onCrearUsuario, onPlanChange }) {
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ nombre:"", numero_whatsapp:"", phone_number_id:"", whatsapp_token:"" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);
  const [onboardingCliente, setOnboardingCliente] = useState(null);
  const [adminTab, setAdminTab] = useState('clientes');

  const eliminarCliente = async (c, e) => {
    e.stopPropagation();
    if (!confirm(`¿Eliminar "${c.nombre}" y TODOS sus datos (prospectos, mensajes, usuarios)? Esta acción no se puede deshacer.`)) return;
    if (!confirm(`CONFIRMACIÓN FINAL: ¿Seguro que querés eliminar "${c.nombre}"?`)) return;
    try {
      const r = await fetch(`${API}/api/clientes/${c.id}`, { method:"DELETE", headers:{"Authorization":`Bearer ${tok()}`} });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Error al eliminar");
      onRefresh();
    } catch(e) { alert("Error: " + e.message); }
  };

  const crear = async () => {
    if (!form.nombre) return setErr("El nombre es obligatorio");
    setSaving(true); setErr(null);
    try {
      const r = await fetch(`${API}/api/clientes`, { method:"POST", headers:jH(), body:JSON.stringify(form) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Error");
      setShowNew(false); setForm({ nombre:"", numero_whatsapp:"", phone_number_id:"", whatsapp_token:"" });
      onRefresh();
    } catch(e) { setErr(e.message); }
    setSaving(false);
  };

  return (
    <div style={{flex:1,overflowY:"auto",padding:"16px 12px",paddingBottom:80}}>
      {/* Admin tabs */}
      <div style={{display:"flex",gap:3,background:C.bg,borderRadius:2,padding:3,border:`1px solid ${C.border}`,marginBottom:16,width:"fit-content"}}>
        {[{k:'clientes',l:'Clientes'},{k:'propuestas',l:'Honorarios'}].map(t=>(
          <button key={t.k} onClick={()=>setAdminTab(t.k)}
            style={{padding:"6px 14px",borderRadius:4,border:"none",cursor:"pointer",fontSize:12,fontWeight:500,background:adminTab===t.k?C.accent:"transparent",color:adminTab===t.k?"white":C.muted,transition:"all .2s",fontFamily:"inherit"}}>
            {t.l}
          </button>
        ))}
      </div>

      {adminTab === 'propuestas' ? <PropuestasComerciales /> : <>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:10,marginBottom:20}}>
        {[
          { label:"Clientes", value: clientes.length },
          { label:"Prospectos", value: stats?.prospectos||0 },
          { label:"Consultas totales", value: stats?.agendados||0 },
          { label:"Honorarios aceptados", value: stats?.honorarios_aceptados||0 },
          { label:"Conversión", value: stats?.conversion ? `${stats.conversion}%` : "0%" },
        ].map((s,i) => (
          <div key={i} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:"16px 20px"}}>
            <div style={{fontSize:11,color:C.muted,textTransform:"uppercase",letterSpacing:".8px",marginBottom:8,fontWeight:500}}>{s.label}</div>
            <div style={{fontSize:24,fontWeight:700,color:C.accentLight,fontFamily:"'DM Mono',monospace"}}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,overflow:"hidden"}}>
        <div style={{padding:"14px 16px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontWeight:600,fontSize:14}}>Clientes</span>
          <Btn onClick={()=>setShowNew(true)} small>+ Nuevo</Btn>
        </div>
        {/* Desktop: tabla / Mobile: cards */}
        <div className="admin-table-desktop">
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead>
              <tr style={{borderBottom:`1px solid ${C.border}`}}>
                {["Cliente","Plan","Prospectos","Agendados","Conv.",""].map((h,i) => (
                  <th key={i} style={{padding:"10px 16px",textAlign:"left",fontSize:11,color:C.muted,fontWeight:500,textTransform:"uppercase",letterSpacing:".6px"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clientes.map(c => (
                <tr key={c.id} className="hr" style={{borderBottom:`1px solid ${C.border}`}} onClick={()=>onSelectClient(c)}>
                  <td style={{padding:"14px 16px",fontWeight:500,fontSize:14,color:C.text}}>{c.nombre}<div style={{fontSize:11,color:C.textMuted,marginTop:2}}>{c.numero_whatsapp||"-"}</div></td>
                  <td style={{padding:"14px 16px"}} onClick={e=>e.stopPropagation()}>
                    <select value={c.plan||"pro"}
                      onChange={async e=>{const plan=e.target.value;await fetch(`${API}/api/clientes/${c.id}/plan`,{method:"PUT",headers:{"Content-Type":"application/json","Authorization":`Bearer ${tok()}`},body:JSON.stringify({plan})});if(onPlanChange)onPlanChange(c.id,plan);else onRefresh();}}
                      style={{background:c.plan==="base"?"rgba(251,191,36,0.15)":c.plan==="plus"?"rgba(20,184,166,0.15)":C.accentGlow,border:`1px solid ${c.plan==="base"?"#f59e0b":c.plan==="plus"?"#14b8a6":C.accent}`,borderRadius:4,padding:"4px 8px",fontSize:11,fontWeight:600,color:c.plan==="base"?"#f59e0b":c.plan==="plus"?"#14b8a6":C.accent,cursor:"pointer",fontFamily:"inherit"}}>
                      <option value="pro">Pro</option><option value="plus">Plus</option><option value="base">Básico</option>
                    </select>
                  </td>
                  <td style={{padding:"14px 16px",fontSize:13,color:C.textMuted,fontVariantNumeric:"tabular-nums"}}>{c.total_prospectos||0}</td>
                  <td style={{padding:"14px 16px",fontSize:13,color:C.textMuted,fontVariantNumeric:"tabular-nums"}}>{c.agendados||0}</td>
                  <td style={{padding:"14px 16px",fontSize:13,color:C.textMuted,fontVariantNumeric:"tabular-nums"}}>{c.tasa_conversion||0}%</td>
                  <td style={{padding:"12px 16px",textAlign:"right"}}>
                    <span style={{display:"flex",gap:6,justifyContent:"flex-end",alignItems:"center"}}>
                      <Btn onClick={e=>{e.stopPropagation();setOnboardingCliente(c);}} secondary small>📋 Setup</Btn>
                      <Btn onClick={e=>{e.stopPropagation();onCrearUsuario(c);}} secondary small>+ Usuario</Btn>
                      <Btn onClick={e=>eliminarCliente(c,e)} secondary small style={{color:C.red,borderColor:"rgba(239,68,68,0.3)"}}>🗑</Btn>
                      <span style={{color:C.accent,fontSize:12,fontWeight:500}}>Ver -></span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Mobile cards */}
        <div className="admin-table-mobile">
          {clientes.map(c => (
            <div key={c.id} onClick={()=>onSelectClient(c)} style={{padding:"14px 16px",borderBottom:`1px solid ${C.border}`,cursor:"pointer"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                <div>
                  <div style={{fontWeight:600,fontSize:14}}>{c.nombre}</div>
                  <div style={{fontSize:11,color:C.muted,marginTop:2}}>{c.numero_whatsapp||"-"}</div>
                </div>
                <select value={c.plan||"pro"}
                  onChange={async e=>{e.stopPropagation();const plan=e.target.value;await fetch(`${API}/api/clientes/${c.id}/plan`,{method:"PUT",headers:{"Content-Type":"application/json","Authorization":`Bearer ${tok()}`},body:JSON.stringify({plan})});if(onPlanChange)onPlanChange(c.id,plan);else onRefresh();}}
                  onClick={e=>e.stopPropagation()}
                  style={{background:c.plan==="base"?"rgba(251,191,36,0.15)":c.plan==="plus"?"rgba(20,184,166,0.15)":C.accentGlow,border:`1px solid ${c.plan==="base"?"#f59e0b":c.plan==="plus"?"#14b8a6":C.accent}`,borderRadius:4,padding:"4px 8px",fontSize:11,fontWeight:600,color:c.plan==="base"?"#f59e0b":c.plan==="plus"?"#14b8a6":C.accent,cursor:"pointer",fontFamily:"inherit"}}>
                  <option value="pro">Pro</option><option value="plus">Plus</option><option value="base">Básico</option>
                </select>
              </div>
              <div style={{display:"flex",gap:12,fontSize:12,color:C.muted}}>
                <span>👥 {c.total_prospectos||0} prospectos</span>
                <span>📅 {c.agendados||0} agendados</span>
                <span>🎯 {c.tasa_conversion||0}%</span>
              </div>
              <div style={{display:"flex",gap:8,marginTop:10}} onClick={e=>e.stopPropagation()}>
                <Btn onClick={()=>setOnboardingCliente(c)} secondary small>📋 Setup</Btn>
                <Btn onClick={()=>onCrearUsuario(c)} secondary small>+ Usuario</Btn>
                <Btn onClick={e=>eliminarCliente(c,e)} secondary small style={{color:C.red,borderColor:"rgba(239,68,68,0.3)"}}>🗑</Btn>
                <Btn onClick={()=>onSelectClient(c)} small>Ver panel -></Btn>
              </div>
            </div>
          ))}
        </div>
      </div>

      {onboardingCliente && (
        <OnboardingChecklist
          cliente={onboardingCliente}
          onClose={()=>setOnboardingCliente(null)}
          API={API} jH={jH}
        />
      )}

      {showNew && (
        <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.75)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}}>
          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:32,width:420,maxWidth:"92vw"}}>
            <div style={{fontSize:16,fontWeight:700,marginBottom:20}}>Nuevo cliente</div>
            <Field label="Nombre de la agencia *" value={form.nombre} onChange={v=>setForm({...form,nombre:v})} placeholder="Skyward Consultoría Jurídica"/>
            <Field label="Número de WhatsApp (opcional)" value={form.numero_whatsapp} onChange={v=>setForm({...form,numero_whatsapp:v})} placeholder="+54 11 4523-8901"/>
            <Field label="Phone Number ID (Meta)" value={form.phone_number_id} onChange={v=>setForm({...form,phone_number_id:v})} placeholder="1234567890"/>
            <div style={{marginBottom:16}}>
              <label style={{fontSize:11,color:C.muted,fontWeight:500,display:"block",marginBottom:5}}>WhatsApp Token (Meta)</label>
              <div style={{position:"relative"}}>
                <input type="password" value={form.whatsapp_token} onChange={e=>setForm({...form,whatsapp_token:e.target.value})}
                  placeholder="EAAxxxxx..."
                  style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:2,padding:"9px 40px 9px 12px",color:C.text,fontSize:12,fontFamily:"'DM Mono',monospace",boxSizing:"border-box"}}/>
                <span style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",fontSize:11,color:C.muted,cursor:"default"}}>🔒</span>
              </div>
              <div style={{fontSize:10,color:C.muted,marginTop:4}}>Token permanente del número en Meta Developers</div>
            </div>
            {err && <div style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:4,padding:"8px 12px",fontSize:12,color:C.red,marginBottom:16}}>{err}</div>}
            <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
              <Btn onClick={()=>setShowNew(false)} secondary>Cancelar</Btn>
              <Btn onClick={crear} disabled={saving}>{saving?"Creando...":"Crear cliente"}</Btn>
            </div>
          </div>
        </div>
      )}
      </>}
    </div>
  );
}

// -- CLIENT --------------------------------------------------------------------


// ============================================================
// ONBOARDING WIZARD
// ============================================================
function OnboardingWizard({ client, onComplete, onSkip, calStatus, plan }) {
  const PASOS = [
    { id:'whatsapp',      icon:'📱', titulo:'Conectar WhatsApp',        desc:'El número de WhatsApp desde donde el bot va a hablar con tus prospectos.', opcional: plan !== 'pro' },
    { id:'bot',           icon:'🤖', titulo:'Configurar el bot',         desc:'Dale personalidad al asistente. Nombre, tono y descripción de tu agencia.', opcional: false },
    { id:'profesionales', icon:'👨‍⚕️', titulo:'Agregar profesionales',    desc:'Los asesores del equipo. Necesitamos su email para invitarlos a las reuniones.', opcional: false },
    { id:'tratamientos',  icon:'💉', titulo:'Agregar servicios',       desc:'Los servicios que ofrecés. El bot los usa para entender qué busca cada prospecto.', opcional: false },
    { id:'horarios',      icon:'🕐', titulo:'Horarios de atención',       desc:'Los dias y franjas horarias en que podés recibir turnos.', opcional: false },
    { id:'calendar',      icon:'📅', titulo:'Conectar Google',   desc:'Los turnos aparecerán en tu calendario, se enviará invitación a profesionales y podrás enviar emails desde tu cuenta.', opcional: true },
    { id:'activar',       icon:'🚀', titulo:'¡Activar el bot!',           desc:'Revisá todo y activá el bot para que empiece a atender prospectos por WhatsApp.', opcional: false },
  ];

  const [paso, setPaso] = useState(0);
  const [saving, setSaving] = useState(false);

  // Estado de cada paso
  const [wa, setWa] = useState({ phone_number_id: client?.phone_number_id||'', whatsapp_token: '' });
  const [savingWa, setSavingWa] = useState(false);
  const [waGuardado, setWaGuardado] = useState(!!(client?.phone_number_id));

  const [bot, setBot] = useState({ bot_nombre:'', descripcion_clinica:'', tono:'profesional_calido', instrucciones_libres:'', bot_activo:false, modalidad:'presencial', nombre_consulta:'Demo Call', seguimiento_activo:false, seguimiento_7dias:true, seguimiento_post:true, seguimiento_post_horas:24, seguimiento_msg_7dias:'', seguimiento_msg_post:'' });
  const [savingBot, setSavingBot] = useState(false);
  const [botGuardado, setBotGuardado] = useState(false);

  const [profs, setProfs] = useState([]);
  const [formProf, setFormProf] = useState({ nombre:'', rol:'', email:'' });
  const [savingProf, setSavingProf] = useState(false);

  const [trats, setTrats] = useState([]);
  const [formTrat, setFormTrat] = useState({ nombre:'', duracion_minutos:60 });
  const [savingTrat, setSavingTrat] = useState(false);

  const [horarios, setHorarios] = useState([]);
  const [formHor, setFormHor] = useState({ dia_semana:1, hora_inicio:'09:00', hora_fin:'18:00' });
  const [savingHor, setSavingHor] = useState(false);

  const [calConectado, setCalConectado] = useState(!!(calStatus?.conectado));
  const [onbStatus, setOnbStatus] = useState(null);

  const DIAS_FULL = ['Domingo','Lunes','Martes','Miercoles','Jueves','Viernes','Sabado'];
  const TONOS = [
    { v:'profesional_calido', l:'Profesional y cálido' },
    { v:'formal',             l:'Formal' },
    { v:'amigable',           l:'Amigable' },
    { v:'diminutivos',        l:'Con diminutivos' },
    { v:'juvenil',            l:'Juvenil' },
  ];

  useEffect(() => {
    // Cargar datos existentes
    fetch(`${API}/api/profesionales?cliente_id=${client.id}`, { headers:aH() }).then(r=>r.json()).then(setProfs).catch(()=>{});
    fetch(`${API}/api/tratamientos?cliente_id=${client.id}`, { headers:aH() }).then(r=>r.json()).then(setTrats).catch(()=>{});
    fetch(`${API}/api/horarios-clinica?cliente_id=${client.id}`, { headers:aH() }).then(r=>r.json()).then(setHorarios).catch(()=>{});
    fetch(`${API}/api/bot-config?cliente_id=${client.id}`, { headers:aH() }).then(r=>r.json()).then(d => { if (d?.bot_nombre) { setBot(b=>({...b,...d})); setBotGuardado(true); } }).catch(()=>{});
    fetch(`${API}/api/clientes/${client.id}/onboarding-status`, { headers:aH() }).then(r=>r.json()).then(setOnbStatus).catch(()=>{});
  }, []);

  const guardarWa = async () => {
    setSavingWa(true);
    try {
      const r = await fetch(`${API}/api/clientes/${client.id}/whatsapp`, { method:'PUT', headers:jH(), body:JSON.stringify(wa) });
      if (r.ok) setWaGuardado(true);
    } catch(e) {}
    setSavingWa(false);
  };

  const guardarBot = async () => {
    setSavingBot(true);
    try {
      const r = await fetch(`${API}/api/bot-config`, { method:'PUT', headers:jH(), body:JSON.stringify({ ...bot, cliente_id:client.id }) });
      if (r.ok) setBotGuardado(true);
    } catch(e) {}
    setSavingBot(false);
  };

  const agregarProf = async () => {
    if (!formProf.nombre) return;
    setSavingProf(true);
    try {
      const r = await fetch(`${API}/api/profesionales`, { method:'POST', headers:jH(), body:JSON.stringify({ ...formProf, cliente_id:client.id }) });
      if (r.ok) { const d = await r.json(); setProfs(p=>[...p,d]); setFormProf({ nombre:'', rol:'', email:'' }); }
    } catch(e) {}
    setSavingProf(false);
  };

  const eliminarProf = async (id) => {
    await fetch(`${API}/api/profesionales/${id}`, { method:'DELETE', headers:aH() });
    setProfs(profs.filter(p=>p.id!==id));
  };

  const agregarTrat = async () => {
    if (!formTrat.nombre) return;
    setSavingTrat(true);
    try {
      const r = await fetch(`${API}/api/tratamientos`, { method:'POST', headers:jH(), body:JSON.stringify({ ...formTrat, cliente_id:client.id }) });
      if (r.ok) { const d = await r.json(); setTrats(t=>[...t,d]); setFormTrat({ nombre:'', duracion_minutos:60 }); }
    } catch(e) {}
    setSavingTrat(false);
  };

  const eliminarTrat = async (id) => {
    await fetch(`${API}/api/tratamientos/${id}`, { method:'DELETE', headers:aH() });
    setTrats(trats.filter(t=>t.id!==id));
  };

  const agregarHorario = async () => {
    setSavingHor(true);
    try {
      const r = await fetch(`${API}/api/horarios-clinica`, { method:'POST', headers:jH(), body:JSON.stringify({ ...formHor, cliente_id:client.id }) });
      if (r.ok) { const d = await r.json(); setHorarios(h=>[...h,d]); }
    } catch(e) {}
    setSavingHor(false);
  };

  const eliminarHorario = async (id) => {
    await fetch(`${API}/api/horarios-clinica/${id}`, { method:'DELETE', headers:aH() });
    setHorarios(horarios.filter(h=>h.id!==id));
  };

  const conectarCal = () => {
    const url = `${API}/auth/google?cliente_id=${client.id}&token=${tok()}`;
    const w = window.open(url,'_blank','width=600,height=700');
    const iv = setInterval(() => {
      fetch(`${API}/api/calendar/status?cliente_id=${client.id}`, { headers: aH() }).then(r=>r.json()).then(d => {
        if (d.conectado) { setCalConectado(true); clearInterval(iv); w?.close(); }
      }).catch(()=>{});
    }, 2000);
    setTimeout(() => clearInterval(iv), 60000); // safety: stop polling after 60s
  };

  const activarBot = async () => {
    setSaving(true);
    try {
      await fetch(`${API}/api/bot-config`, { method:'PUT', headers:jH(), body:JSON.stringify({ ...bot, cliente_id:client.id, bot_activo:true }) });
      await fetch(`${API}/api/clientes/${client.id}/onboarding`, { method:'PUT', headers:jH(), body:JSON.stringify({ completado:true }) });
      onComplete();
    } catch(e) {}
    setSaving(false);
  };

  const pasoActual = PASOS[paso];
  const progreso = Math.round(((paso) / (PASOS.length-1)) * 100);

  const puedeSiguiente = () => {
    if (pasoActual.id === 'whatsapp') return waGuardado || pasoActual.opcional;
    if (pasoActual.id === 'bot') return botGuardado;
    if (pasoActual.id === 'profesionales') return profs.length > 0;
    if (pasoActual.id === 'tratamientos') return trats.length > 0;
    if (pasoActual.id === 'horarios') return horarios.length > 0;
    if (pasoActual.id === 'calendar') return true; // siempre puede omitir
    return true;
  };

  return (
    <div style={{position:"fixed",inset:0,background:C.bg,zIndex:2000,display:"flex",flexDirection:"column",overflow:"hidden"}}>

      {/* Header con progreso */}
      <div style={{background:C.surface,borderBottom:`1px solid ${C.border}`,padding:"16px 24px",flexShrink:0}}>
        <div style={{maxWidth:680,margin:"0 auto"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
            <div style={{fontSize:13,fontWeight:700,color:C.accentLight}}>CRM Skyward</div>
            <div style={{fontSize:12,color:C.muted}}>Paso {paso+1} de {PASOS.length}</div>
          </div>
          {/* Barra progreso */}
          <div style={{height:4,background:C.border,borderRadius:2,overflow:"hidden"}}>
            <div style={{height:"100%",background:C.accent,borderRadius:2,width:`${progreso}%`,transition:"width .4s ease"}}/>
          </div>
          {/* Steps indicadores */}
          <div style={{display:"flex",gap:4,marginTop:10}}>
            {PASOS.map((p,i) => (
              <div key={i} style={{flex:1,height:3,borderRadius:2,background:i<=paso?C.accent:C.border,transition:"background .3s"}}/>
            ))}
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div style={{flex:1,overflowY:"auto",padding:"32px 24px"}}>
        <div style={{maxWidth:680,margin:"0 auto"}}>

          {/* Título del paso */}
          <div style={{textAlign:"center",marginBottom:32}}>
            <div style={{fontSize:40,marginBottom:12}}>{pasoActual.icon}</div>
            <div style={{fontSize:22,fontWeight:700,marginBottom:8}}>{pasoActual.titulo}</div>
            <div style={{fontSize:14,color:C.muted,lineHeight:1.6}}>{pasoActual.desc}</div>
            {pasoActual.opcional && <div style={{fontSize:12,color:C.muted,marginTop:8,fontStyle:"italic"}}>Este paso es opcional</div>}
          </div>

          {/* -- PASO: WhatsApp -- */}
          {pasoActual.id === 'whatsapp' && (
            <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:24}}>
              {waGuardado && (
                <div style={{background:"rgba(16,185,129,0.1)",border:"1px solid #10b981",borderRadius:4,padding:"10px 14px",marginBottom:16,fontSize:13,color:"#10b981",fontWeight:500}}>
                  ✅ WhatsApp configurado
                </div>
              )}
              <div style={{marginBottom:16}}>
                <label style={{fontSize:12,color:C.muted,display:"block",marginBottom:6}}>Phone Number ID</label>
                <input value={wa.phone_number_id} onChange={e=>setWa({...wa,phone_number_id:e.target.value})}
                  placeholder="Ej: 1052491337942532"
                  style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"10px 14px",color:C.text,fontSize:13,fontFamily:"inherit",boxSizing:"border-box"}}/>
                <div style={{fontSize:11,color:C.muted,marginTop:4}}>Se obtiene en Meta Developers -> WhatsApp -> API Setup</div>
              </div>
              <div style={{marginBottom:16}}>
                <label style={{fontSize:12,color:C.muted,display:"block",marginBottom:6}}>Token de acceso</label>
                <input type="password" value={wa.whatsapp_token} onChange={e=>setWa({...wa,whatsapp_token:e.target.value})}
                  placeholder="Token permanente de WhatsApp..."
                  style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"10px 14px",color:C.text,fontSize:13,fontFamily:"inherit",boxSizing:"border-box"}}/>
              </div>
              <button onClick={guardarWa} disabled={savingWa||!wa.phone_number_id}
                style={{width:"100%",padding:"11px 0",borderRadius:4,border:"none",background:C.accent,color:"white",fontSize:13,fontWeight:600,cursor:"pointer"}}>
                {savingWa?"Guardando...":"Guardar configuración"}
              </button>
            </div>
          )}

          {/* -- PASO: Bot -- */}
          {pasoActual.id === 'bot' && (
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {botGuardado && (
                <div style={{background:"rgba(16,185,129,0.1)",border:"1px solid #10b981",borderRadius:4,padding:"10px 14px",fontSize:13,color:"#10b981",fontWeight:500}}>
                  ✅ Bot configurado
                </div>
              )}
              <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:20}}>
                <label style={{fontSize:12,color:C.muted,display:"block",marginBottom:6}}>Nombre del bot</label>
                <input value={bot.bot_nombre} onChange={e=>setBot({...bot,bot_nombre:e.target.value})}
                  placeholder="Ej: Sofi, Luna, Valeria..."
                  style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"10px 14px",color:C.text,fontSize:13,fontFamily:"inherit",boxSizing:"border-box",marginBottom:14}}/>
                <label style={{fontSize:12,color:C.muted,display:"block",marginBottom:6}}>Descripción de la agencia</label>
                <textarea value={bot.descripcion_clinica} onChange={e=>setBot({...bot,descripcion_clinica:e.target.value})}
                  rows={3} placeholder="Quiénes son, qué hacen, a quién atienden..."
                  style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"10px 14px",color:C.text,fontSize:13,fontFamily:"inherit",resize:"vertical",boxSizing:"border-box",marginBottom:14}}/>
                <label style={{fontSize:12,color:C.muted,display:"block",marginBottom:8}}>Tono</label>
                <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:14}}>
                  {TONOS.map(t=>(
                    <div key={t.v} onClick={()=>setBot({...bot,tono:t.v})}
                      style={{padding:"6px 14px",borderRadius:2,cursor:"pointer",fontSize:12,border:`1.5px solid ${bot.tono===t.v?C.accent:C.border}`,background:bot.tono===t.v?C.accentGlow:"transparent",color:bot.tono===t.v?C.accentLight:C.muted,fontWeight:bot.tono===t.v?600:400}}>
                      {t.l}
                    </div>
                  ))}
                </div>
                <button onClick={guardarBot} disabled={savingBot||!bot.bot_nombre||!bot.descripcion_clinica}
                  style={{width:"100%",padding:"11px 0",borderRadius:4,border:"none",background:C.accent,color:"white",fontSize:13,fontWeight:600,cursor:"pointer"}}>
                  {savingBot?"Guardando...":"Guardar configuración del bot"}
                </button>
              </div>
            </div>
          )}

          {/* -- PASO: Profesionales -- */}
          {pasoActual.id === 'profesionales' && (
            <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:24}}>
              {profs.map(p=>(
                <div key={p.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",background:C.bg,borderRadius:2,border:`1px solid ${C.border}`,marginBottom:8}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:500}}>{p.nombre}</div>
                    <div style={{fontSize:11,color:C.muted}}>{p.rol||"-"}{p.email?` · ${p.email}`:""}</div>
                  </div>
                  <button onClick={()=>eliminarProf(p.id)} style={{background:"transparent",border:"none",color:C.muted,cursor:"pointer",fontSize:18}}>×</button>
                </div>
              ))}
              <div style={{marginTop:profs.length>0?16:0}}>
                <div style={{display:"flex",gap:8,marginBottom:8}}>
                  <input value={formProf.nombre} onChange={e=>setFormProf({...formProf,nombre:e.target.value})}
                    placeholder="Nombre *" onKeyDown={e=>e.key==="Enter"&&agregarProf()}
                    style={{flex:2,background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"9px 12px",color:C.text,fontSize:12,fontFamily:"inherit"}}/>
                  <input value={formProf.rol} onChange={e=>setFormProf({...formProf,rol:e.target.value})}
                    placeholder="Rol"
                    style={{flex:1,background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"9px 12px",color:C.text,fontSize:12,fontFamily:"inherit"}}/>
                </div>
                <div style={{display:"flex",gap:8}}>
                  <input value={formProf.email} onChange={e=>setFormProf({...formProf,email:e.target.value})}
                    placeholder="Email (para invitar a turnos)"
                    style={{flex:1,background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"9px 12px",color:C.text,fontSize:12,fontFamily:"inherit"}}/>
                  <button onClick={agregarProf} disabled={savingProf||!formProf.nombre}
                    style={{padding:"9px 18px",borderRadius:4,border:"none",background:C.accent,color:"white",fontSize:12,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}>
                    {savingProf?"...":"+ Agregar"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* -- PASO: Tratamientos -- */}
          {pasoActual.id === 'tratamientos' && (
            <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:24}}>
              {trats.map(t=>(
                <div key={t.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",background:C.bg,borderRadius:2,border:`1px solid ${C.border}`,marginBottom:8}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:500}}>{t.nombre}</div>
                    <div style={{fontSize:11,color:C.muted}}>{t.duracion_minutos} min</div>
                  </div>
                  <button onClick={()=>eliminarTrat(t.id)} style={{background:"transparent",border:"none",color:C.muted,cursor:"pointer",fontSize:18}}>×</button>
                </div>
              ))}
              <div style={{display:"flex",gap:8,marginTop:trats.length>0?16:0,flexWrap:"wrap"}}>
                <input value={formTrat.nombre} onChange={e=>setFormTrat({...formTrat,nombre:e.target.value})}
                  placeholder="Nombre del servicio *" onKeyDown={e=>e.key==="Enter"&&agregarTrat()}
                  style={{flex:2,minWidth:140,background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"9px 12px",color:C.text,fontSize:12,fontFamily:"inherit"}}/>
                <select value={formTrat.tipo||'tratamiento'} onChange={e=>setFormTrat({...formTrat,tipo:e.target.value})}
                  style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"9px 10px",color:C.text,fontSize:12,fontFamily:"inherit"}}>
                  <option value="tratamiento">Servicio</option>
                  <option value="valoracion">Demo Call</option>
                </select>
                <input type="number" value={formTrat.duracion_minutos} onChange={e=>setFormTrat({...formTrat,duracion_minutos:parseInt(e.target.value)||60})}
                  placeholder="Min"
                  style={{width:70,background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"9px 12px",color:C.text,fontSize:12,fontFamily:"inherit"}}/>
                <button onClick={agregarTrat} disabled={savingTrat||!formTrat.nombre}
                  style={{padding:"9px 18px",borderRadius:4,border:"none",background:C.accent,color:"white",fontSize:12,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}>
                  {savingTrat?"...":"+ Agregar"}
                </button>
              </div>
            </div>
          )}

          {/* -- PASO: Horarios -- */}
          {pasoActual.id === 'horarios' && (
            <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:24}}>
              {horarios.length === 0 && (
                <div style={{textAlign:"center",color:C.muted,fontSize:12,padding:"12px 0 20px"}}>Sin horarios configurados - usará lun-vie 9-18 por defecto</div>
              )}
              {Object.entries(horarios.reduce((acc,h)=>{ const d=h.dia_semana; if(!acc[d]) acc[d]=[]; acc[d].push(h); return acc; },{})).map(([dia,slots])=>(
                <div key={dia} style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,padding:"10px 14px",background:C.bg,borderRadius:2,border:`1px solid ${C.border}`}}>
                  <div style={{width:32,fontSize:12,fontWeight:600,color:C.accentLight,flexShrink:0}}>
                    {['Dom','Lun','Mar','Mie','Jue','Vie','Sab'][parseInt(dia)]}
                  </div>
                  <div style={{flex:1,display:"flex",flexWrap:"wrap",gap:6}}>
                    {slots.map(s=>(
                      <div key={s.id} style={{display:"flex",alignItems:"center",gap:5,padding:"3px 10px",borderRadius:2,background:C.accentGlow,border:`1px solid ${C.accent}44`,fontSize:12,color:C.accentLight}}>
                        {s.hora_inicio.substring(0,5)} - {s.hora_fin.substring(0,5)}
                        <span onClick={()=>eliminarHorario(s.id)} style={{cursor:"pointer",fontSize:14,color:C.muted}}>×</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <div style={{display:"flex",gap:8,alignItems:"flex-end",flexWrap:"wrap",marginTop:12}}>
                <div>
                  <label style={{fontSize:11,color:C.muted,display:"block",marginBottom:4}}>Día</label>
                  <select value={formHor.dia_semana} onChange={e=>setFormHor({...formHor,dia_semana:parseInt(e.target.value)})}
                    style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"8px 12px",color:C.text,fontSize:12,fontFamily:"inherit"}}>
                    {[1,2,3,4,5,6,0].map(d=><option key={d} value={d}>{DIAS_FULL[d]}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{fontSize:11,color:C.muted,display:"block",marginBottom:4}}>Desde</label>
                  <input type="time" value={formHor.hora_inicio} onChange={e=>setFormHor({...formHor,hora_inicio:e.target.value})}
                    style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"8px 12px",color:C.text,fontSize:12,fontFamily:"inherit"}}/>
                </div>
                <div>
                  <label style={{fontSize:11,color:C.muted,display:"block",marginBottom:4}}>Hasta</label>
                  <input type="time" value={formHor.hora_fin} onChange={e=>setFormHor({...formHor,hora_fin:e.target.value})}
                    style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"8px 12px",color:C.text,fontSize:12,fontFamily:"inherit"}}/>
                </div>
                <button onClick={agregarHorario} disabled={savingHor}
                  style={{padding:"9px 18px",borderRadius:4,border:"none",background:C.accent,color:"white",fontSize:12,fontWeight:600,cursor:"pointer"}}>
                  {savingHor?"...":"+ Agregar"}
                </button>
              </div>
            </div>
          )}

          {/* -- PASO: Google -- */}
          {pasoActual.id === 'calendar' && (
            <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:24,textAlign:"center"}}>
              {calConectado ? (
                <div>
                  <div style={{fontSize:48,marginBottom:12}}>✅</div>
                  <div style={{fontSize:15,fontWeight:600,color:"#10b981",marginBottom:8}}>Google conectado</div>
                  <div style={{fontSize:13,color:C.muted,marginBottom:16}}>Los turnos se van a sincronizar automáticamente con tu Google</div>
                  <div style={{background:"rgba(6,182,212,0.08)",border:"1px solid rgba(6,182,212,0.25)",borderRadius:4,padding:"12px 16px",marginBottom:16,textAlign:"left"}}>
                    <div style={{fontSize:12,fontWeight:600,color:"#67e8f9",marginBottom:4}}>📧 ¿Querés activar el envío de emails?</div>
                    <div style={{fontSize:11,color:C.muted,marginBottom:10}}>Para poder enviar emails desde tu cuenta necesitás reconectar Google con permisos adicionales de Gmail.</div>
                    <button onClick={conectarCal}
                      style={{padding:"8px 18px",borderRadius:4,border:"none",background:"#0891b2",color:"white",fontSize:12,fontWeight:600,cursor:"pointer"}}>
                      🔗 Conectar Google
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{fontSize:13,color:C.muted,marginBottom:20,lineHeight:1.6}}>
                    Al conectar Google, cada turno va a crear un evento automáticamente e invitar a los profesionales y prospectos. También podrás enviar emails desde tu cuenta.
                  </div>
                  <button onClick={conectarCal}
                    style={{padding:"12px 28px",borderRadius:4,border:"none",background:"#4285f4",color:"white",fontSize:14,fontWeight:600,cursor:"pointer",marginBottom:12}}>
                    🔗 Conectar Google
                  </button>
                  <div style={{fontSize:11,color:C.muted}}>Se abre una ventana de autorización de Google</div>
                </div>
              )}
            </div>
          )}

          {/* -- PASO: Activar -- */}
          {pasoActual.id === 'activar' && (
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {/* Resumen */}
              {[
                { icon:"📱", label:"WhatsApp", ok: waGuardado || !!(client?.phone_number_id) },
                { icon:"🤖", label:"Bot configurado", ok: botGuardado },
                { icon:"👨‍⚕️", label:"Profesionales", ok: profs.length > 0, extra: `${profs.length} cargados` },
                { icon:"💉", label:"Servicios", ok: trats.length > 0, extra: `${trats.length} cargados` },
                { icon:"🕐", label:"Horarios", ok: horarios.length > 0, extra: horarios.length > 0 ? `${horarios.length} franjas` : "Usando default lun-vie 9-18" },
                { icon:"📅", label:"Google", ok: calConectado, opcional: true },
              ].map((item,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",background:C.surface,borderRadius:2,border:`1px solid ${item.ok?"#10b981":item.opcional?C.border:"#ef444444"}`}}>
                  <span style={{fontSize:20}}>{item.icon}</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:500}}>{item.label}</div>
                    {item.extra && <div style={{fontSize:11,color:C.muted}}>{item.extra}</div>}
                  </div>
                  <span style={{fontSize:18}}>{item.ok ? "✅" : item.opcional ? "⚪" : "⚠️"}</span>
                </div>
              ))}

              <div style={{marginTop:8,background:"rgba(99,102,241,0.08)",border:"1.5px solid #6366f1",borderRadius:2,padding:20,textAlign:"center"}}>
                <div style={{fontSize:15,fontWeight:700,marginBottom:8}}>¿Todo listo?</div>
                <div style={{fontSize:13,color:C.muted,marginBottom:16}}>Al activar, el bot comenzará a responder mensajes de WhatsApp automáticamente.</div>
                <button onClick={activarBot} disabled={saving||!botGuardado}
                  style={{padding:"13px 32px",borderRadius:4,border:"none",background:C.accent,color:"white",fontSize:15,fontWeight:700,cursor:"pointer"}}>
                  {saving ? "Activando..." : "🚀 Activar el bot"}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Footer navegación */}
      <div style={{background:C.surface,borderTop:`1px solid ${C.border}`,padding:"16px 24px",flexShrink:0}}>
        <div style={{maxWidth:680,margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",gap:8}}>
            {paso > 0 && (
              <button onClick={()=>setPaso(p=>p-1)}
                style={{padding:"9px 20px",borderRadius:4,border:`1px solid ${C.border}`,background:"transparent",color:C.muted,fontSize:13,cursor:"pointer"}}>
                Atras
              </button>
            )}
            <button onClick={onSkip}
              style={{padding:"9px 20px",borderRadius:4,border:`1px solid ${C.border}`,background:"transparent",color:C.muted,fontSize:12,cursor:"pointer"}}>
              Configurar después
            </button>
          </div>
          {pasoActual.id !== 'activar' && (
            <button onClick={()=>setPaso(p=>p+1)} disabled={!puedeSiguiente()}
              style={{padding:"9px 24px",borderRadius:4,border:"none",background:puedeSiguiente()?C.accent:"#333",color:"white",fontSize:13,fontWeight:600,cursor:puedeSiguiente()?"pointer":"not-allowed",transition:"background .2s"}}>
              {pasoActual.opcional && !puedeSiguiente() ? "Omitir ->" : "Siguiente ->"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}


// ============================================================
// FICHA CLÍNICA POR SESIÓN
// ============================================================
function FichaClinicaModal({ client, turno, paciente, onClose, onSaved }) {
  const [campos, setCampos] = useState([]);
  const [datos, setDatos] = useState({});
  const [fotos, setFotos] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploadingFoto, setUploadingFoto] = useState(false);

  useEffect(() => {
    const cargar = async () => {
      setLoading(true);
      try {
        // Cargar campos configurados
        const [camposR, fichaR] = await Promise.all([
          fetch(`${API}/api/campos-ficha?cliente_id=${client.id}`, { headers:aH() }).then(r=>r.json()),
          turno?.id ? fetch(`${API}/api/fichas?cliente_id=${client.id}&turno_id=${turno.id}`, { headers:aH() }).then(r=>r.json()) : Promise.resolve([]),
        ]);
        setCampos(camposR.filter(c => c.activo && c.campo_key !== 'fotos'));
        if (fichaR.length > 0) {
          setDatos(fichaR[0].datos || {});
          setFotos(fichaR[0].fotos || []);
        }
      } catch(e) {}
      setLoading(false);
    };
    cargar();
  }, [turno?.id]);

  const subirFoto = async (file) => {
    setUploadingFoto(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('upload_preset', 'edge_resultados');
      const r = await fetch('https://api.cloudinary.com/v1_1/dhtriaslp/image/upload', { method:'POST', body:fd });
      const d = await r.json();
      if (d.secure_url) setFotos(prev => [...prev, { url:d.secure_url, label:'', fecha:new Date().toISOString() }]);
    } catch(e) {}
    setUploadingFoto(false);
  };

  const guardar = async () => {
    setSaving(true);
    try {
      await fetch(`${API}/api/fichas`, {
        method:'POST', headers:jH(),
        body:JSON.stringify({
          cliente_id: client.id,
          paciente_id: paciente?.id || turno?.paciente_id,
          turno_id: turno?.id,
          datos, fotos,
          creado_por: 'panel',
        })
      });
      onSaved?.();
      onClose();
    } catch(e) {}
    setSaving(false);
  };

  const fecha = turno?.fecha ? new Date(turno.fecha+'T12:00:00').toLocaleDateString('es-AR',{weekday:'long',day:'numeric',month:'long',year:'numeric'}) : '';

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',zIndex:3000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
      <div style={{background:C.surface,borderRadius:2,width:'100%',maxWidth:560,maxHeight:MH90,display:'flex',flexDirection:'column',border:`1px solid ${C.border}`}}>

        {/* Header */}
        <div style={{padding:'18px 22px',borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
          <div>
            <div style={{fontSize:15,fontWeight:700}}>📋 Ficha del cliente</div>
            <div style={{fontSize:12,color:C.muted,marginTop:2}}>
              {paciente?.nombre || turno?.paciente_nombre || '-'}
              {turno?.tratamiento && ` · ${turno.tratamiento}`}
              {fecha && ` · ${fecha}`}
            </div>
          </div>
          <button onClick={onClose} style={{background:'transparent',border:'none',color:C.muted,cursor:'pointer',fontSize:22,lineHeight:1}}>×</button>
        </div>

        {/* Body */}
        <div style={{flex:1,overflowY:'auto',padding:'18px 22px'}}>
          {loading ? (
            <div style={{textAlign:'center',color:C.muted,padding:40,fontSize:13}}>Cargando...</div>
          ) : (
            <div style={{display:'flex',flexDirection:'column',gap:16}}>

              {/* Campos configurados */}
              {campos.map(campo => (
                <div key={campo.campo_key}>
                  <label style={{fontSize:12,color:C.muted,display:'block',marginBottom:6,fontWeight:500}}>{campo.label}</label>
                  {campo.tipo === 'textarea' ? (
                    <textarea
                      value={datos[campo.campo_key] || ''}
                      onChange={e => setDatos({...datos, [campo.campo_key]: e.target.value})}
                      rows={3}
                      placeholder={`Escribí ${campo.label.toLowerCase()}...`}
                      style={{width:'100%',background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:'10px 12px',color:C.text,fontSize:13,fontFamily:'inherit',resize:'vertical',boxSizing:'border-box'}}
                    />
                  ) : campo.tipo === 'numero' ? (
                    <input
                      type="number"
                      value={datos[campo.campo_key] || ''}
                      onChange={e => setDatos({...datos, [campo.campo_key]: e.target.value})}
                      placeholder="0"
                      style={{width:'100%',background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:'10px 12px',color:C.text,fontSize:13,fontFamily:'inherit',boxSizing:'border-box'}}
                    />
                  ) : (
                    <input
                      type="text"
                      value={datos[campo.campo_key] || ''}
                      onChange={e => setDatos({...datos, [campo.campo_key]: e.target.value})}
                      placeholder={campo.label}
                      style={{width:'100%',background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:'10px 12px',color:C.text,fontSize:13,fontFamily:'inherit',boxSizing:'border-box'}}
                    />
                  )}
                </div>
              ))}

              {/* Fotos - si el campo fotos está activo */}
              {campos.length === 0 || (function() {
                // Verificar si fotos está habilitado desde afuera (se carga en campos completos)
                return true;
              })() ? null : null}
              <div>
                <label style={{fontSize:12,color:C.muted,display:'block',marginBottom:8,fontWeight:500}}>Fotos de la sesión</label>
                <div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:8}}>
                  {fotos.map((f,i) => (
                    <div key={i} style={{position:'relative'}}>
                      <img src={f.url} alt="" style={{width:80,height:80,objectFit:'cover',borderRadius:4,border:`1px solid ${C.border}`}}/>
                      <button onClick={() => setFotos(fotos.filter((_,j)=>j!==i))}
                        style={{position:'absolute',top:-6,right:-6,width:18,height:18,borderRadius:'50%',background:'#ef4444',border:'none',color:'white',fontSize:11,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',lineHeight:1}}>×</button>
                      <input value={f.label||''} onChange={e=>setFotos(fotos.map((ft,j)=>j===i?{...ft,label:e.target.value}:ft))}
                        placeholder="Descripción"
                        style={{width:80,fontSize:10,background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:'2px 5px',color:C.text,marginTop:4,boxSizing:'border-box'}}/>
                    </div>
                  ))}
                  <label style={{width:80,height:80,border:`2px dashed ${C.border}`,borderRadius:4,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',cursor:'pointer',color:C.muted,fontSize:11,gap:4}}>
                    {uploadingFoto ? '...' : <><span style={{fontSize:22}}>📷</span>Agregar</>}
                    <input type="file" accept="image/*" style={{display:'none'}} onChange={e=>e.target.files[0]&&subirFoto(e.target.files[0])}/>
                  </label>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{padding:'14px 22px',borderTop:`1px solid ${C.border}`,display:'flex',justifyContent:'flex-end',gap:8,flexShrink:0}}>
          <button onClick={onClose} style={{padding:'9px 20px',borderRadius:4,border:`1px solid ${C.border}`,background:'transparent',color:C.muted,fontSize:13,cursor:'pointer'}}>Cancelar</button>
          <button onClick={guardar} disabled={saving}
            style={{padding:'9px 22px',borderRadius:4,border:'none',background:C.accent,color:'white',fontSize:13,fontWeight:600,cursor:'pointer'}}>
            {saving ? 'Guardando...' : '💾 Guardar ficha'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// CONFIGURACIÓN DE CAMPOS FICHA
// ============================================================

// ============================================================
// CONSENTIMIENTOS - Gestión de plantillas (Config)
// ============================================================
function ConsentimientosConfig({ client }) {
  const [plantillas, setPlantillas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(null); // null | 'nueva' | id
  const [form, setForm] = useState({ titulo:'', contenido:'' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/consentimiento-plantillas?cliente_id=${client.id}`, { headers:aH() })
      .then(r=>r.json()).then(setPlantillas).catch(()=>{})
      .finally(()=>setLoading(false));
  }, []);

  const guardar = async () => {
    if (!form.titulo || !form.contenido) return;
    setSaving(true);
    try {
      if (editando === 'nueva') {
        const r = await fetch(`${API}/api/consentimiento-plantillas`, { method:'POST', headers:jH(), body:JSON.stringify({ ...form, cliente_id:client.id }) });
        if (r.ok) { const d = await r.json(); setPlantillas(p=>[...p,d]); }
      } else {
        const r = await fetch(`${API}/api/consentimiento-plantillas/${editando}`, { method:'PUT', headers:jH(), body:JSON.stringify(form) });
        if (r.ok) { const d = await r.json(); setPlantillas(p=>p.map(x=>x.id===editando?d:x)); }
      }
      setEditando(null); setForm({ titulo:'', contenido:'' });
    } catch(e) {}
    setSaving(false);
  };

  const eliminar = async (id) => {
    await fetch(`${API}/api/consentimiento-plantillas/${id}`, { method:'DELETE', headers:aH() });
    setPlantillas(plantillas.filter(p=>p.id!==id));
  };

  return (
    <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:20,marginBottom:16}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16}}>
        <div>
          <div style={{fontSize:13,fontWeight:600,marginBottom:2}}>📝 Consentimientos informados</div>
          <div style={{fontSize:12,color:C.muted}}>Plantillas para enviar a prospectos</div>
        </div>
        <button onClick={()=>{setEditando('nueva');setForm({titulo:'',contenido:''}); }}
          style={{padding:'6px 14px',borderRadius:4,border:'none',background:C.accent,color:'white',fontSize:12,fontWeight:600,cursor:'pointer',whiteSpace:'nowrap'}}>
          + Nueva
        </button>
      </div>

      {loading ? <div style={{color:C.muted,fontSize:12}}>Cargando...</div> : (
        <>
          {plantillas.map(p => (
            <div key={p.id} style={{padding:'12px 14px',background:C.bg,borderRadius:2,border:`1px solid ${C.border}`,marginBottom:8}}>
              {editando === p.id ? (
                <div>
                  <input value={form.titulo} onChange={e=>setForm({...form,titulo:e.target.value})}
                    placeholder="Título..."
                    style={{width:'100%',background:C.surface,border:`1px solid ${C.border}`,borderRadius:4,padding:'8px 10px',color:C.text,fontSize:13,fontFamily:'inherit',marginBottom:8,boxSizing:'border-box'}}/>
                  <textarea value={form.contenido} onChange={e=>setForm({...form,contenido:e.target.value})}
                    rows={8} placeholder="Texto del consentimiento..."
                    style={{width:'100%',background:C.surface,border:`1px solid ${C.border}`,borderRadius:4,padding:'8px 10px',color:C.text,fontSize:12,fontFamily:'inherit',resize:'vertical',boxSizing:'border-box',marginBottom:8}}/>
                  <div style={{display:'flex',gap:6,justifyContent:'flex-end'}}>
                    <button onClick={()=>setEditando(null)} style={{padding:'6px 14px',borderRadius:4,border:`1px solid ${C.border}`,background:'transparent',color:C.muted,fontSize:12,cursor:'pointer'}}>Cancelar</button>
                    <button onClick={guardar} disabled={saving||!form.titulo||!form.contenido}
                      style={{padding:'6px 14px',borderRadius:4,border:'none',background:C.accent,color:'white',fontSize:12,fontWeight:600,cursor:'pointer'}}>{saving?'Guardando...':'Guardar'}</button>
                  </div>
                </div>
              ) : (
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.titulo}</div>
                    <div style={{fontSize:11,color:C.muted,marginTop:2}}>{p.es_ejemplo?'Ejemplo precargado':'Personalizado'} · {p.contenido.length} caracteres</div>
                  </div>
                  <div style={{display:'flex',gap:5,flexShrink:0}}>
                    <button onClick={()=>{setEditando(p.id);setForm({titulo:p.titulo,contenido:p.contenido});}}
                      style={{padding:'4px 10px',borderRadius:2,border:`1px solid ${C.border}`,background:'transparent',color:C.muted,fontSize:11,cursor:'pointer'}}>✏️</button>
                    <button onClick={()=>eliminar(p.id)}
                      style={{padding:'4px 10px',borderRadius:4,border:'none',background:'transparent',color:C.muted,fontSize:14,cursor:'pointer'}}>×</button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {editando === 'nueva' && (
            <div style={{padding:'14px',background:C.bg,borderRadius:2,border:`1.5px solid ${C.accent}`,marginTop:8}}>
              <div style={{fontSize:12,fontWeight:600,color:C.accentLight,marginBottom:10}}>Nueva plantilla</div>
              <input value={form.titulo} onChange={e=>setForm({...form,titulo:e.target.value})}
                placeholder="Título del consentimiento..."
                style={{width:'100%',background:C.surface,border:`1px solid ${C.border}`,borderRadius:4,padding:'8px 10px',color:C.text,fontSize:13,fontFamily:'inherit',marginBottom:8,boxSizing:'border-box'}}/>
              <textarea value={form.contenido} onChange={e=>setForm({...form,contenido:e.target.value})}
                rows={8} placeholder="Texto completo del consentimiento informado..."
                style={{width:'100%',background:C.surface,border:`1px solid ${C.border}`,borderRadius:4,padding:'8px 10px',color:C.text,fontSize:12,fontFamily:'inherit',resize:'vertical',boxSizing:'border-box',marginBottom:8}}/>
              <div style={{display:'flex',gap:6,justifyContent:'flex-end'}}>
                <button onClick={()=>setEditando(null)} style={{padding:'6px 14px',borderRadius:4,border:`1px solid ${C.border}`,background:'transparent',color:C.muted,fontSize:12,cursor:'pointer'}}>Cancelar</button>
                <button onClick={guardar} disabled={saving||!form.titulo||!form.contenido}
                  style={{padding:'6px 14px',borderRadius:4,border:'none',background:C.accent,color:'white',fontSize:12,fontWeight:600,cursor:'pointer'}}>{saving?'Guardando...':'Guardar'}</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ============================================================
// MODAL ENVIAR CONSENTIMIENTO desde perfil de paciente
// ============================================================
function EnviarConsentimientoModal({ client, paciente, turno_id, onClose }) {
  const [plantillas, setPlantillas] = useState([]);
  const [selPlantilla, setSelPlantilla] = useState(null);
  const [sending, setSending] = useState(false);
  const [resultado, setResultado] = useState(null); // { link, enviado_wa }
  const [consentimientos, setConsentimientos] = useState([]);

  useEffect(() => {
    fetch(`${API}/api/consentimiento-plantillas?cliente_id=${client.id}`, { headers:aH() }).then(r=>r.json()).then(p=>{setPlantillas(p);if(p.length>0)setSelPlantilla(p[0].id);}).catch(()=>{});
    fetch(`${API}/api/consentimientos?cliente_id=${client.id}&paciente_id=${paciente.id}`, { headers:aH() }).then(r=>r.json()).then(setConsentimientos).catch(()=>{});
  }, []);

  const enviar = async () => {
    if (!selPlantilla) return;
    setSending(true);
    try {
      const r = await fetch(`${API}/api/consentimientos/enviar`, { method:'POST', headers:jH(), body:JSON.stringify({ cliente_id:client.id, paciente_id:paciente.id, plantilla_id:selPlantilla, turno_id }) });
      if (r.ok) {
        const d = await r.json();
        setResultado({ link:d.link, enviado_wa:!!paciente.telefono });
        fetch(`${API}/api/consentimientos?cliente_id=${client.id}&paciente_id=${paciente.id}`, { headers:aH() }).then(r=>r.json()).then(setConsentimientos).catch(()=>{});
      }
    } catch(e) {}
    setSending(false);
  };

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',zIndex:3000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
      <div style={{background:C.surface,borderRadius:2,width:'100%',maxWidth:500,maxHeight:MH85,display:'flex',flexDirection:'column',border:`1px solid ${C.border}`}}>

        <div style={{padding:'18px 22px',borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
          <div>
            <div style={{fontSize:15,fontWeight:700}}>📝 Consentimiento informado</div>
            <div style={{fontSize:12,color:C.muted,marginTop:2}}>{paciente.nombre}</div>
          </div>
          <button onClick={onClose} style={{background:'transparent',border:'none',color:C.muted,cursor:'pointer',fontSize:22}}>×</button>
        </div>

        <div style={{flex:1,overflowY:'auto',padding:'18px 22px'}}>

          {/* Historial de consentimientos */}
          {consentimientos.length > 0 && (
            <div style={{marginBottom:20}}>
              <div style={{fontSize:11,color:C.muted,textTransform:'uppercase',letterSpacing:'.8px',fontWeight:500,marginBottom:10}}>Historial</div>
              {consentimientos.map(c=>(
                <div key={c.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',background:C.bg,borderRadius:2,border:`1px solid ${C.border}`,marginBottom:6}}>
                  <div style={{width:8,height:8,borderRadius:'50%',background:c.estado==='firmado'?'#10b981':'#f59e0b',flexShrink:0}}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.titulo}</div>
                    <div style={{fontSize:11,color:C.muted}}>
                      {c.estado==='firmado'
                        ? `✅ Firmado ${new Date(c.firmado_en).toLocaleDateString('es-AR',{day:'numeric',month:'short'})}`
                        : `⏳ Pendiente · enviado ${new Date(c.enviado_en).toLocaleDateString('es-AR',{day:'numeric',month:'short'})}`}
                    </div>
                  </div>
                  {c.estado==='firmado' && c.firma_imagen && (
                    <img src={c.firma_imagen} alt="firma" style={{width:40,height:24,objectFit:'contain',border:`1px solid ${C.border}`,borderRadius:4,background:'white'}}/>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Seleccionar plantilla */}
          {resultado ? (
            <div style={{textAlign:'center',padding:'20px 0'}}>
              <div style={{fontSize:40,marginBottom:12}}>✅</div>
              <div style={{fontSize:15,fontWeight:700,marginBottom:8}}>
                {resultado.enviado_wa ? 'Enviado por WhatsApp' : 'Link generado'}
              </div>
              <div style={{fontSize:13,color:C.muted,marginBottom:16}}>
                {resultado.enviado_wa ? 'El prospecto recibió el link por WhatsApp para firmar.' : 'Copiá el link y enviáselo al prospecto.'}
              </div>
              <div style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:2,padding:'10px 14px',fontSize:11,color:C.muted,wordBreak:'break-all',marginBottom:12}}>
                {resultado.link}
              </div>
              <button onClick={()=>{navigator.clipboard.writeText(resultado.link).catch(()=>{});}}
                style={{padding:'8px 20px',borderRadius:4,border:`1px solid ${C.border}`,background:'transparent',color:C.accentLight,fontSize:12,cursor:'pointer'}}>
                📋 Copiar link
              </button>
            </div>
          ) : (
            <>
              <div style={{fontSize:12,color:C.muted,marginBottom:8,fontWeight:500}}>Elegí la plantilla a enviar</div>
              <div style={{display:'flex',flexDirection:'column',gap:6,marginBottom:20}}>
                {plantillas.map(p=>(
                  <div key={p.id} onClick={()=>setSelPlantilla(p.id)}
                    style={{padding:'12px 14px',background:C.bg,borderRadius:2,border:`1.5px solid ${selPlantilla===p.id?C.accent:C.border}`,cursor:'pointer',transition:'border .15s'}}>
                    <div style={{fontSize:13,fontWeight:500,color:selPlantilla===p.id?C.accentLight:C.text}}>{p.titulo}</div>
                    <div style={{fontSize:11,color:C.muted,marginTop:2}}>{p.contenido.substring(0,80)}...</div>
                  </div>
                ))}
              </div>
              {paciente.telefono
                ? <div style={{fontSize:12,color:C.muted,marginBottom:4}}>📱 Se enviará por WhatsApp a {paciente.telefono}</div>
                : <div style={{fontSize:12,color:'#f59e0b',marginBottom:4}}>⚠️ Sin teléfono - se generará solo el link</div>
              }
            </>
          )}
        </div>

        {!resultado && (
          <div style={{padding:'14px 22px',borderTop:`1px solid ${C.border}`,display:'flex',justifyContent:'flex-end',gap:8,flexShrink:0}}>
            <button onClick={onClose} style={{padding:'9px 20px',borderRadius:4,border:`1px solid ${C.border}`,background:'transparent',color:C.muted,fontSize:13,cursor:'pointer'}}>Cancelar</button>
            <button onClick={enviar} disabled={sending||!selPlantilla}
              style={{padding:'9px 22px',borderRadius:4,border:'none',background:C.accent,color:'white',fontSize:13,fontWeight:600,cursor:'pointer'}}>
              {sending?'Enviando...':'📨 Enviar consentimiento'}
            </button>
          </div>
        )}
        {resultado && (
          <div style={{padding:'14px 22px',borderTop:`1px solid ${C.border}`,display:'flex',justifyContent:'flex-end'}}>
            <button onClick={onClose} style={{padding:'9px 22px',borderRadius:4,border:'none',background:C.accent,color:'white',fontSize:13,fontWeight:600,cursor:'pointer'}}>Cerrar</button>
          </div>
        )}
      </div>
    </div>
  );
}

function CamposFichaConfig({ client }) {
  const [campos, setCampos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formNuevo, setFormNuevo] = useState({ label:'', tipo:'texto' });
  const [savingNuevo, setSavingNuevo] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/campos-ficha?cliente_id=${client.id}`, { headers:aH() })
      .then(r=>r.json()).then(setCampos).catch(()=>{})
      .finally(() => setLoading(false));
  }, []);

  const toggleCampo = async (campo) => {
    const updated = campos.map(c => c.id===campo.id ? {...c, activo:!c.activo} : c);
    setCampos(updated);
    await fetch(`${API}/api/campos-ficha/${campo.id}`, {
      method:'PUT', headers:jH(),
      body:JSON.stringify({ activo:!campo.activo })
    });
  };

  const agregarCampo = async () => {
    if (!formNuevo.label) return;
    setSavingNuevo(true);
    try {
      const r = await fetch(`${API}/api/campos-ficha`, {
        method:'POST', headers:jH(),
        body:JSON.stringify({ ...formNuevo, cliente_id:client.id })
      });
      if (r.ok) { const d = await r.json(); setCampos([...campos, d]); setFormNuevo({ label:'', tipo:'texto' }); }
    } catch(e) {}
    setSavingNuevo(false);
  };

  const eliminarCampo = async (id) => {
    await fetch(`${API}/api/campos-ficha/${id}`, { method:'DELETE', headers:aH() });
    setCampos(campos.filter(c => c.id !== id));
  };

  const TIPO_LABELS = { texto:'Texto corto', textarea:'Texto largo', numero:'Número', fecha:'Fecha' };

  return (
    <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:20,marginBottom:16}}>
      <div style={{fontSize:13,fontWeight:600,marginBottom:4}}>📋 Campos del cliente</div>
      <div style={{fontSize:12,color:C.muted,marginBottom:16}}>Definí qué información se registra en cada sesión</div>

      {loading ? <div style={{color:C.muted,fontSize:12}}>Cargando...</div> : (
        <>
          {campos.map(campo => (
            <div key={campo.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',background:C.bg,borderRadius:2,border:`1px solid ${C.border}`,marginBottom:8}}>
              {/* Toggle */}
              <div onClick={() => toggleCampo(campo)}
                style={{width:36,height:20,borderRadius:4,background:campo.activo?C.accent:C.border,cursor:'pointer',position:'relative',transition:'background .2s',flexShrink:0}}>
                <div style={{position:'absolute',width:14,height:14,borderRadius:'50%',background:'white',top:3,left:campo.activo?19:3,transition:'left .2s'}}/>
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:500,color:campo.activo?C.text:C.muted}}>{campo.label}</div>
                <div style={{fontSize:10,color:C.muted}}>{TIPO_LABELS[campo.tipo]||campo.tipo}{campo.es_base?' · base':' · personalizado'}</div>
              </div>
              {!campo.es_base && (
                <button onClick={() => eliminarCampo(campo.id)}
                  style={{background:'transparent',border:'none',color:C.muted,cursor:'pointer',fontSize:16}}>×</button>
              )}
            </div>
          ))}

          {/* Agregar campo custom */}
          <div style={{display:'flex',gap:8,marginTop:12,flexWrap:'wrap'}}>
            <input value={formNuevo.label} onChange={e=>setFormNuevo({...formNuevo,label:e.target.value})}
              placeholder="Nombre del campo..."
              style={{flex:2,minWidth:140,background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:'8px 12px',color:C.text,fontSize:12,fontFamily:'inherit'}}/>
            <select value={formNuevo.tipo} onChange={e=>setFormNuevo({...formNuevo,tipo:e.target.value})}
              style={{flex:1,minWidth:120,background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:'8px 12px',color:C.text,fontSize:12,fontFamily:'inherit'}}>
              <option value="texto">Texto corto</option>
              <option value="textarea">Texto largo</option>
              <option value="numero">Número</option>
            </select>
            <button onClick={agregarCampo} disabled={savingNuevo||!formNuevo.label}
              style={{padding:'8px 16px',borderRadius:4,border:'none',background:C.accent,color:'white',fontSize:12,fontWeight:600,cursor:'pointer',whiteSpace:'nowrap'}}>
              {savingNuevo?'...':'+ Agregar'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function DisponibilidadPanel({ client, profesionales, horariosClinica, setHorariosClinica, bloqueos, setBloqueos }) {
  const DIAS = ['Dom','Lun','Mar','Mie','Jue','Vie','Sab'];
  const DIAS_FULL = ['Domingo','Lunes','Martes','Miercoles','Jueves','Viernes','Sabado'];
  const TIPO_BLOQUEO = { ausencia:'🤒 Ausencia', feriado:'🏖 Feriado', mantenimiento:'🔧 Mantenimiento' };

  const [formHorario, setFormHorario] = useState({ dia_semana:1, hora_inicio:'09:00', hora_fin:'18:00' });
  const [savingH, setSavingH] = useState(false);
  const [showNewBloqueo, setShowNewBloqueo] = useState(false);
  const [formBloqueo, setFormBloqueo] = useState({ profesional_id:'', tipo:'ausencia', fecha_desde:'', fecha_hasta:'', motivo:'', todo_el_dia:true, hora_inicio:'', hora_fin:'' });
  const [savingB, setSavingB] = useState(false);

  const agregarHorario = async () => {
    setSavingH(true);
    try {
      const r = await fetch(`${API}/api/horarios-clinica`, { method:'POST', headers:jH(), body:JSON.stringify({ ...formHorario, cliente_id:client.id }) });
      if (r.ok) { const d = await r.json(); setHorariosClinica([...horariosClinica, d]); }
    } catch(e) {}
    setSavingH(false);
  };

  const eliminarHorario = async (id) => {
    await fetch(`${API}/api/horarios-clinica/${id}`, { method:'DELETE', headers:aH() });
    setHorariosClinica(horariosClinica.filter(h=>h.id!==id));
  };

  const agregarBloqueo = async () => {
    if (!formBloqueo.fecha_desde || !formBloqueo.fecha_hasta) return;
    setSavingB(true);
    try {
      const r = await fetch(`${API}/api/bloqueos`, { method:'POST', headers:jH(), body:JSON.stringify({ ...formBloqueo, cliente_id:client.id, profesional_id:formBloqueo.profesional_id||null }) });
      if (r.ok) {
        const d = await r.json();
        const prof = profesionales.find(p=>p.id===parseInt(formBloqueo.profesional_id));
        setBloqueos([{ ...d, profesional_nombre: prof?.nombre||null }, ...bloqueos]);
        setShowNewBloqueo(false);
        setFormBloqueo({ profesional_id:'', tipo:'ausencia', fecha_desde:'', fecha_hasta:'', motivo:'', todo_el_dia:true, hora_inicio:'', hora_fin:'' });
      }
    } catch(e) {}
    setSavingB(false);
  };

  const eliminarBloqueo = async (id) => {
    await fetch(`${API}/api/bloqueos/${id}`, { method:'DELETE', headers:aH() });
    setBloqueos(bloqueos.filter(b=>b.id!==id));
  };

  // Agrupar horarios por dia
  const horariosPorDia = {};
  for (const h of horariosClinica) {
    if (!horariosPorDia[h.dia_semana]) horariosPorDia[h.dia_semana] = [];
    horariosPorDia[h.dia_semana].push(h);
  }

  // Solo bloqueos futuros o actuales
  const hoy = new Date().toISOString().split('T')[0];
  const bloqueosActivos = bloqueos.filter(b => b.fecha_hasta >= hoy);
  const bloqueosPasados = bloqueos.filter(b => b.fecha_hasta < hoy);

  return (<>
    {/* Horarios de atención */}
    <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:20,marginBottom:16}}>
      <div style={{fontSize:13,fontWeight:600,marginBottom:2}}>🕐 Horarios de atención</div>
      <div style={{fontSize:12,color:C.muted,marginBottom:16}}>Días y franjas horarias en que la agencia agenda reuniones</div>

      {/* Grilla de dias */}
      {Object.keys(horariosPorDia).length === 0 && (
        <div style={{fontSize:12,color:C.muted,marginBottom:16,padding:"10px 14px",background:C.bg,borderRadius:2,border:`1px solid ${C.border}`}}>
          Sin horarios configurados - usando lun-vie 9 a 18hs por defecto
        </div>
      )}

      {[1,2,3,4,5,6,0].map(dia => {
        const slots = horariosPorDia[dia] || [];
        if (slots.length === 0) return null;
        return (
          <div key={dia} style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:10,padding:"10px 14px",background:C.bg,borderRadius:2,border:`1px solid ${C.border}`}}>
            <div style={{width:36,fontSize:12,fontWeight:600,color:C.accentLight,paddingTop:2,flexShrink:0}}>{DIAS[dia]}</div>
            <div style={{flex:1,display:"flex",flexWrap:"wrap",gap:6}}>
              {slots.map(s => (
                <div key={s.id} style={{display:"flex",alignItems:"center",gap:6,padding:"3px 10px",borderRadius:2,background:C.accentGlow,border:`1px solid ${C.accent}44`,fontSize:12,color:C.accentLight}}>
                  {s.hora_inicio.substring(0,5)} - {s.hora_fin.substring(0,5)}
                  <span onClick={()=>eliminarHorario(s.id)} style={{cursor:"pointer",color:C.muted,fontSize:14,lineHeight:1}}>×</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Form agregar franja */}
      <div style={{display:"flex",gap:8,alignItems:"flex-end",flexWrap:"wrap",marginTop:12}}>
        <div>
          <label style={{fontSize:11,color:C.muted,display:"block",marginBottom:4}}>Día</label>
          <select value={formHorario.dia_semana} onChange={e=>setFormHorario({...formHorario,dia_semana:parseInt(e.target.value)})}
            style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"8px 12px",color:C.text,fontSize:12,fontFamily:"inherit"}}>
            {[1,2,3,4,5,6,0].map(d=><option key={d} value={d}>{DIAS_FULL[d]}</option>)}
          </select>
        </div>
        <div>
          <label style={{fontSize:11,color:C.muted,display:"block",marginBottom:4}}>Desde</label>
          <input type="time" value={formHorario.hora_inicio} onChange={e=>setFormHorario({...formHorario,hora_inicio:e.target.value})}
            style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"8px 12px",color:C.text,fontSize:12,fontFamily:"inherit"}}/>
        </div>
        <div>
          <label style={{fontSize:11,color:C.muted,display:"block",marginBottom:4}}>Hasta</label>
          <input type="time" value={formHorario.hora_fin} onChange={e=>setFormHorario({...formHorario,hora_fin:e.target.value})}
            style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"8px 12px",color:C.text,fontSize:12,fontFamily:"inherit"}}/>
        </div>
        <Btn onClick={agregarHorario} disabled={savingH} small>{savingH?"...":"+ Agregar"}</Btn>
      </div>
      <div style={{fontSize:11,color:C.muted,marginTop:8}}>Podés agregar múltiples franjas por dia (ej: 9-13 y 16-20)</div>
    </div>

    {/* Bloqueos y ausencias */}
    <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:20,marginBottom:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
        <div>
          <div style={{fontSize:13,fontWeight:600,marginBottom:2}}>🚫 Bloqueos y ausencias</div>
          <div style={{fontSize:12,color:C.muted,marginBottom:16}}>Días en que la agencia o un asesor no está disponible</div>
        </div>
        <Btn onClick={()=>setShowNewBloqueo(!showNewBloqueo)} small secondary>+ Nuevo</Btn>
      </div>

      {showNewBloqueo && (
        <div style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:2,padding:16,marginBottom:16}}>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:10}}>
            <div style={{flex:1,minWidth:140}}>
              <label style={{fontSize:11,color:C.muted,display:"block",marginBottom:4}}>Tipo</label>
              <select value={formBloqueo.tipo} onChange={e=>setFormBloqueo({...formBloqueo,tipo:e.target.value})}
                style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:4,padding:"8px 12px",color:C.text,fontSize:12,fontFamily:"inherit"}}>
                <option value="ausencia">🤒 Ausencia</option>
                <option value="feriado">🏖 Feriado / Vacaciones</option>
                <option value="mantenimiento">🔧 Mantenimiento</option>
              </select>
            </div>
            <div style={{flex:1,minWidth:140}}>
              <label style={{fontSize:11,color:C.muted,display:"block",marginBottom:4}}>Profesional (opcional)</label>
              <select value={formBloqueo.profesional_id} onChange={e=>setFormBloqueo({...formBloqueo,profesional_id:e.target.value})}
                style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:4,padding:"8px 12px",color:C.text,fontSize:12,fontFamily:"inherit"}}>
                <option value="">Toda la agencia</option>
                {profesionales.map(p=><option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:10}}>
            <div style={{flex:1,minWidth:120}}>
              <label style={{fontSize:11,color:C.muted,display:"block",marginBottom:4}}>Desde</label>
              <input type="date" value={formBloqueo.fecha_desde} onChange={e=>setFormBloqueo({...formBloqueo,fecha_desde:e.target.value})}
                style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:4,padding:"8px 12px",color:C.text,fontSize:12,fontFamily:"inherit",boxSizing:"border-box"}}/>
            </div>
            <div style={{flex:1,minWidth:120}}>
              <label style={{fontSize:11,color:C.muted,display:"block",marginBottom:4}}>Hasta</label>
              <input type="date" value={formBloqueo.fecha_hasta} onChange={e=>setFormBloqueo({...formBloqueo,fecha_hasta:e.target.value})}
                style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:4,padding:"8px 12px",color:C.text,fontSize:12,fontFamily:"inherit",boxSizing:"border-box"}}/>
            </div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:10}}>
            <div onClick={()=>setFormBloqueo({...formBloqueo,todo_el_dia:!formBloqueo.todo_el_dia})}
              style={{width:34,height:18,borderRadius:4,background:formBloqueo.todo_el_dia?C.accent:C.border,cursor:"pointer",position:"relative",transition:"background .2s",flexShrink:0}}>
              <div style={{position:"absolute",top:2,left:formBloqueo.todo_el_dia?18:2,width:14,height:14,borderRadius:"50%",background:"white",transition:"left .2s"}}/>
            </div>
            <span style={{fontSize:12,color:C.muted}}>Todo el dia</span>
          </div>
          {!formBloqueo.todo_el_dia && (
            <div style={{display:"flex",gap:8,marginBottom:10}}>
              <div style={{flex:1}}>
                <label style={{fontSize:11,color:C.muted,display:"block",marginBottom:4}}>Hora inicio</label>
                <input type="time" value={formBloqueo.hora_inicio} onChange={e=>setFormBloqueo({...formBloqueo,hora_inicio:e.target.value})}
                  style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:4,padding:"8px 12px",color:C.text,fontSize:12,fontFamily:"inherit",boxSizing:"border-box"}}/>
              </div>
              <div style={{flex:1}}>
                <label style={{fontSize:11,color:C.muted,display:"block",marginBottom:4}}>Hora fin</label>
                <input type="time" value={formBloqueo.hora_fin} onChange={e=>setFormBloqueo({...formBloqueo,hora_fin:e.target.value})}
                  style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:4,padding:"8px 12px",color:C.text,fontSize:12,fontFamily:"inherit",boxSizing:"border-box"}}/>
              </div>
            </div>
          )}
          <Field label="Motivo (opcional)" value={formBloqueo.motivo} onChange={v=>setFormBloqueo({...formBloqueo,motivo:v})} placeholder="Ej: Dra. García de vacaciones, Feriado nacional..."/>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
            <Btn onClick={()=>setShowNewBloqueo(false)} secondary small>Cancelar</Btn>
            <Btn onClick={agregarBloqueo} disabled={savingB||!formBloqueo.fecha_desde||!formBloqueo.fecha_hasta} small>{savingB?"Guardando...":"Guardar bloqueo"}</Btn>
          </div>
        </div>
      )}

      {bloqueosActivos.length === 0 && !showNewBloqueo && (
        <div style={{fontSize:12,color:C.muted,padding:"10px 14px",background:C.bg,borderRadius:2,border:`1px solid ${C.border}`}}>Sin bloqueos activos</div>
      )}

      {bloqueosActivos.map(b => (
        <div key={b.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",background:C.bg,borderRadius:2,border:`1px solid ${C.border}`,marginBottom:8}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:18}}>{b.tipo==="ausencia"?"🤒":b.tipo==="feriado"?"🏖":"🔧"}</span>
            <div>
              <div style={{fontSize:13,fontWeight:500}}>
                {b.profesional_nombre ? b.profesional_nombre : "Toda la agencia"}
              </div>
              <div style={{fontSize:11,color:C.muted}}>
                {b.fecha_desde === b.fecha_hasta ? b.fecha_desde : `${b.fecha_desde} -> ${b.fecha_hasta}`}
                {!b.todo_el_dia && b.hora_inicio ? ` · ${b.hora_inicio.substring(0,5)}-${b.hora_fin.substring(0,5)}` : ""}
                {b.motivo ? ` · ${b.motivo}` : ""}
              </div>
            </div>
          </div>
          <button onClick={()=>eliminarBloqueo(b.id)} style={{background:"transparent",border:"none",color:C.muted,cursor:"pointer",fontSize:18,lineHeight:1}}>×</button>
        </div>
      ))}

      {bloqueosPasados.length > 0 && (
        <div style={{fontSize:11,color:C.muted,marginTop:8}}>+ {bloqueosPasados.length} bloqueo{bloqueosPasados.length>1?"s":""} pasado{bloqueosPasados.length>1?"s":""}</div>
      )}
    </div>
  </>);
}

function BotConfigPanel({ client, botConfig, setBotConfig }) {
  const TONOS = [
    { v:'profesional_calido', l:'Profesional y cálido', desc:'Rioplatense natural, minúsculas. Cercano pero sin excesos.' },
    { v:'formal',             l:'Formal',               desc:'Usted/tuteo consistente. Sin coloquialismos.' },
    { v:'amigable',           l:'Amigable',             desc:'Muy conversacional. Cálido y empático.' },
    { v:'diminutivos',        l:'Con diminutivos',      desc:'Turncito, momentito... Femenino y cálido.' },
    { v:'juvenil',            l:'Juvenil',              desc:'Dinámico e informal pero sin exagerar.' },
  ];

  const [form, setForm] = useState({
    bot_nombre: botConfig?.bot_nombre || '',
    descripcion_clinica: botConfig?.descripcion_clinica || '',
    tono: botConfig?.tono || 'profesional_calido',
    instrucciones_libres: botConfig?.instrucciones_libres || '',
    bot_activo: botConfig?.bot_activo || false,
    modalidad: botConfig?.modalidad || 'presencial',
    nombre_consulta: botConfig?.nombre_consulta || 'Demo Call',
    recordatorio_activo: botConfig?.recordatorio_activo ?? true,
    recordatorio_horas: botConfig?.recordatorio_horas ?? 24,
    recordatorio_horas_2: botConfig?.recordatorio_horas_2 ?? 0,
    recordatorio_msg_custom: botConfig?.recordatorio_msg_custom || '',
    msg_horarios_pendientes: botConfig?.msg_horarios_pendientes || '',
    msg_fuera_horario: botConfig?.msg_fuera_horario || '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [preview, setPreview] = useState(false);

  const tonoActivo = TONOS.find(t => t.v === form.tono) || TONOS[0];

  const guardar = async () => {
    setSaving(true);
    try {
      const r = await fetch(`${API}/api/bot-config`, {
        method:'PUT', headers:jH(),
        body:JSON.stringify({ ...form, cliente_id: client.id })
      });
      if (r.ok) {
        const d = await r.json();
        setBotConfig(d);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch(e) {}
    setSaving(false);
  };

  const previewText = `Nombre: ${form.bot_nombre||'(sin nombre)'}
Primera cita: "${form.nombre_consulta||'Demo Call'}"
Modalidad: ${form.modalidad==='presencial'?'Solo presencial':form.modalidad==='virtual'?'Solo virtual':'Presencial y virtual'}
Tono: ${tonoActivo.l} - ${tonoActivo.desc}
${form.descripcion_clinica ? 'Clínica: '+form.descripcion_clinica : '(sin descripción de agencia)'}
${form.instrucciones_libres ? 'Instrucciones extra:\n'+form.instrucciones_libres : '(sin instrucciones adicionales)'}`;

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>

      {/* Estado del bot */}
      <div style={{background:C.surface,border:`1.5px solid ${form.bot_activo?"#10b981":C.border}`,borderRadius:2,padding:20}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <div style={{fontSize:13,fontWeight:600,marginBottom:2}}>Estado del bot</div>
            <div style={{fontSize:12,color:form.bot_activo?"#10b981":C.muted}}>
              {form.bot_activo ? "🟢 Activo - el bot responde automáticamente" : "🔴 Inactivo - completá la config antes de activar"}
            </div>
          </div>
          <div onClick={()=>setForm({...form,bot_activo:!form.bot_activo})}
            style={{width:42,height:22,borderRadius:4,background:form.bot_activo?"#10b981":C.border,cursor:"pointer",position:"relative",transition:"background .2s",flexShrink:0}}>
            <div style={{position:"absolute",top:2,left:form.bot_activo?22:2,width:18,height:18,borderRadius:"50%",background:"white",transition:"left .2s",boxShadow:"0 1px 3px rgba(0,0,0,.3)"}}/>
          </div>
        </div>
      </div>

      {/* Nombre del bot */}
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:20}}>
        <div style={{fontSize:13,fontWeight:600,marginBottom:4}}>🤖 Nombre del bot</div>
        <div style={{fontSize:12,color:C.muted,marginBottom:12}}>Cómo se presenta el asistente al prospecto</div>
        <input value={form.bot_nombre} onChange={e=>setForm({...form,bot_nombre:e.target.value})}
          placeholder="Ej: Sofi, Luna, Valeria, Asistente..."
          style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"10px 14px",color:C.text,fontSize:13,fontFamily:"inherit",boxSizing:"border-box"}}/>
      </div>

      {/* Descripción de la agencia */}
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:20}}>
        <div style={{fontSize:13,fontWeight:600,marginBottom:4}}>🏢 Descripción de la agencia</div>
        <div style={{fontSize:12,color:C.muted,marginBottom:12}}>Qué hacen, a quién atienden, qué los diferencia. El bot usa esto para contextualizar las conversaciones.</div>
        <textarea value={form.descripcion_clinica} onChange={e=>setForm({...form,descripcion_clinica:e.target.value})}
          rows={4}
          placeholder={"Ej: Somos una agencia de marketing jurídico. Ayudamos a abogados y estudios a triplicar sus honorarios. Nuestro diferencial es el sistema de captación de clientes automatizado..."}
          style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"10px 14px",color:C.text,fontSize:13,fontFamily:"inherit",resize:"vertical",boxSizing:"border-box"}}/>
      </div>

      {/* Modalidad */}
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:20}}>
        <div style={{fontSize:13,fontWeight:600,marginBottom:4}}>📍 Modalidad de atención</div>
        <div style={{fontSize:12,color:C.muted,marginBottom:14}}>Cómo atiende la agencia. El bot solo ofrecerá la opción configurada.</div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {[
            { v:'presencial', l:'Solo presencial',     desc:'Las reuniones son siempre en persona.' },
            { v:'virtual',    l:'Solo virtual',         desc:'Los turnos son siempre por videollamada.' },
            { v:'ambas',      l:'Presencial y virtual', desc:'El prospecto elige cuál prefiere.' },
          ].map(op => (
            <div key={op.v} onClick={()=>setForm({...form,modalidad:op.v})}
              style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",borderRadius:4,border:`1.5px solid ${form.modalidad===op.v?C.accent:C.border}`,background:form.modalidad===op.v?C.accentGlow:C.bg,cursor:"pointer",transition:"all .15s"}}>
              <div style={{width:16,height:16,borderRadius:"50%",border:`2px solid ${form.modalidad===op.v?C.accent:C.border}`,background:form.modalidad===op.v?C.accent:"transparent",flexShrink:0,transition:"all .15s"}}/>
              <div>
                <div style={{fontSize:13,fontWeight:form.modalidad===op.v?600:400,color:form.modalidad===op.v?C.accentLight:C.text}}>{op.l}</div>
                <div style={{fontSize:11,color:C.muted}}>{op.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Nombre de la primera consulta */}
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:20}}>
        <div style={{fontSize:13,fontWeight:600,marginBottom:4}}>📋 Nombre de la primera cita</div>
        <div style={{fontSize:12,color:C.muted,marginBottom:12}}>Cómo llama la agencia a la primera consulta. El bot usará siempre este término.</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:10}}>
          {['Demo Call','consulta inicial','primera reunión','entrevista','evaluación','diagnóstico'].map(op=>(
            <div key={op} onClick={()=>setForm({...form,nombre_consulta:op})}
              style={{padding:"6px 14px",borderRadius:2,cursor:"pointer",fontSize:12,border:`1.5px solid ${form.nombre_consulta===op?C.accent:C.border}`,background:form.nombre_consulta===op?C.accentGlow:"transparent",color:form.nombre_consulta===op?C.accentLight:C.muted,transition:"all .15s",fontWeight:form.nombre_consulta===op?600:400}}>
              {op}
            </div>
          ))}
        </div>
        <input value={form.nombre_consulta} onChange={e=>setForm({...form,nombre_consulta:e.target.value})}
          placeholder="O escribí el tuyo: 'primera sesión', 'cita de bienvenida'..."
          style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"9px 14px",color:C.text,fontSize:12,fontFamily:"inherit",boxSizing:"border-box"}}/>
      </div>

      {/* Tono */}
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:20}}>
        <div style={{fontSize:13,fontWeight:600,marginBottom:4}}>🎭 Tono y estilo</div>
        <div style={{fontSize:12,color:C.muted,marginBottom:14}}>Cómo quieren que hable el bot</div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {TONOS.map(t => (
            <div key={t.v} onClick={()=>setForm({...form,tono:t.v})}
              style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",borderRadius:4,border:`1.5px solid ${form.tono===t.v?C.accent:C.border}`,background:form.tono===t.v?C.accentGlow:C.bg,cursor:"pointer",transition:"all .15s"}}>
              <div style={{width:16,height:16,borderRadius:"50%",border:`2px solid ${form.tono===t.v?C.accent:C.border}`,background:form.tono===t.v?C.accent:"transparent",flexShrink:0,transition:"all .15s"}}/>
              <div>
                <div style={{fontSize:13,fontWeight:form.tono===t.v?600:400,color:form.tono===t.v?C.accentLight:C.text}}>{t.l}</div>
                <div style={{fontSize:11,color:C.muted}}>{t.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Instrucciones libres */}
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:20}}>
        <div style={{fontSize:13,fontWeight:600,marginBottom:4}}>📝 Instrucciones adicionales</div>
        <div style={{fontSize:12,color:C.muted,marginBottom:12}}>Cualquier indicación extra para el bot. Se agrega tal cual al prompt.</div>
        <textarea value={form.instrucciones_libres} onChange={e=>setForm({...form,instrucciones_libres:e.target.value})}
          rows={5}
          placeholder={"Ej: Cuando pregunten por precio decí 'los valores los conversamos en la Demo Call'.\nNo menciones competidores.\nSi alguien pregunta por Tomas, decí que está disponible martes y jueves.\nSiempre preguntá qué tipo de abogado es y cuántos clientes tiene por mes."}
          style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"10px 14px",color:C.text,fontSize:13,fontFamily:"inherit",resize:"vertical",boxSizing:"border-box"}}/>
      </div>

      {/* Preview */}
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:20}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:preview?14:0}}>
          <div style={{fontSize:13,fontWeight:600}}>👁 Vista previa</div>
          <button onClick={()=>setPreview(!preview)}
            style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:4,padding:"5px 12px",color:C.muted,fontSize:12,cursor:"pointer"}}>
            {preview?"Ocultar":"Ver resumen del bot"}
          </button>
        </div>
        {preview && (
          <pre style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:2,padding:14,fontSize:11,color:C.muted,whiteSpace:"pre-wrap",lineHeight:1.7,margin:0,fontFamily:"'DM Mono',monospace"}}>
{previewText}
          </pre>
        )}
      </div>

      {/* Recordatorios automáticos */}
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:20}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
          <div>
            <div style={{fontSize:13,fontWeight:600}}>📅 Recordatorios automáticos</div>
            <div style={{fontSize:11,color:C.muted,marginTop:2}}>El bot manda un WhatsApp antes del turno generado por IA</div>
          </div>
          <div onClick={()=>setForm({...form,recordatorio_activo:!form.recordatorio_activo})}
            style={{width:42,height:24,borderRadius:2,background:form.recordatorio_activo?"#10b981":C.border,cursor:"pointer",position:"relative",transition:"background .2s",flexShrink:0}}>
            <div style={{position:"absolute",top:3,left:form.recordatorio_activo?20:3,width:18,height:18,borderRadius:"50%",background:"white",transition:"left .2s"}}/>
          </div>
        </div>

        {form.recordatorio_activo && (<>
          <div style={{display:"flex",gap:12,marginBottom:14,flexWrap:"wrap"}}>
            <div style={{flex:1,minWidth:120}}>
              <div style={{fontSize:11,color:C.muted,marginBottom:6,fontWeight:500}}>1er recordatorio</div>
              <select value={form.recordatorio_horas}
                onChange={e=>setForm({...form,recordatorio_horas:parseInt(e.target.value)})}
                style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"8px 10px",color:C.text,fontSize:13,fontFamily:"inherit"}}>
                <option value={2}>2 horas antes</option>
                <option value={4}>4 horas antes</option>
                <option value={12}>12 horas antes</option>
                <option value={24}>24 horas antes</option>
                <option value={48}>48 horas antes</option>
                <option value={72}>72 horas antes</option>
              </select>
            </div>
            <div style={{flex:1,minWidth:120}}>
              <div style={{fontSize:11,color:C.muted,marginBottom:6,fontWeight:500}}>2do recordatorio (opcional)</div>
              <select value={form.recordatorio_horas_2}
                onChange={e=>setForm({...form,recordatorio_horas_2:parseInt(e.target.value)})}
                style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"8px 10px",color:C.text,fontSize:13,fontFamily:"inherit"}}>
                <option value={0}>Sin segundo recordatorio</option>
                <option value={2}>2 horas antes</option>
                <option value={4}>4 horas antes</option>
                <option value={12}>12 horas antes</option>
                <option value={24}>24 horas antes</option>
              </select>
            </div>
          </div>

          <div style={{marginBottom:8}}>
            <div style={{fontSize:11,color:C.muted,marginBottom:6,fontWeight:500}}>
              Mensaje personalizado <span style={{fontWeight:400}}>(dejar vacío para que lo genere el bot)</span>
            </div>
            <textarea value={form.recordatorio_msg_custom}
              onChange={e=>setForm({...form,recordatorio_msg_custom:e.target.value})}
              placeholder={"Hola {nombre}! 😊 Te recordamos tu turno el {fecha} a las {hora}. ¡Te esperamos!\n\nVariables: {nombre} {fecha} {hora} {tratamiento} {profesional}"}
              rows={4}
              style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"10px 12px",color:C.text,fontSize:12,fontFamily:"inherit",resize:"vertical",boxSizing:"border-box"}}/>
            <div style={{fontSize:10,color:C.muted,marginTop:4}}>Variables: {"{nombre}"} {"{fecha}"} {"{hora}"} {"{tratamiento}"} {"{profesional}"}</div>
          </div>
        </>)}
      </div>

      {/* Mensaje cuando paciente quiere agendar estando ya agendado */}
      <div style={{background:"rgba(99,102,241,0.06)",border:`1px solid ${C.border}`,borderRadius:4,padding:16}}>
        <div style={{fontSize:13,fontWeight:600,marginBottom:4}}>💬 Mensaje cuando el prospecto ya tiene reunión agendada</div>
        <div style={{fontSize:12,color:C.muted,marginBottom:10}}>Qué responde el bot cuando un un prospecto ya ya agendado pide otro turno o agenda para un tercero</div>
        <input value={form.msg_horarios_pendientes}
          onChange={e=>setForm({...form,msg_horarios_pendientes:e.target.value})}
          placeholder="¡Perfecto! Ya te confirmo los horarios disponibles 😊"
          style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"10px 12px",color:C.text,fontSize:13,fontFamily:"inherit",boxSizing:"border-box"}}/>
        <div style={{fontSize:10,color:C.muted,marginTop:4}}>Dejalo vacío para usar el mensaje por defecto</div>
      </div>

      {/* Mensaje fuera de horario */}
      <div style={{background:"rgba(99,102,241,0.06)",border:`1px solid ${C.border}`,borderRadius:4,padding:16}}>
        <div style={{fontSize:13,fontWeight:600,marginBottom:4}}>🌙 Mensaje fuera de horario</div>
        <div style={{fontSize:12,color:C.muted,marginBottom:10}}>Qué responde el bot cuando alguien quiere turno fuera del horario de atención</div>
        <input value={form.msg_fuera_horario}
          onChange={e=>setForm({...form,msg_fuera_horario:e.target.value})}
          placeholder="¡Perfecto! Estamos fuera de horario ahora, pero te confirmamos disponibilidad lo antes posible 😊"
          style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"10px 12px",color:C.text,fontSize:13,fontFamily:"inherit",boxSizing:"border-box"}}/>
        <div style={{fontSize:10,color:C.muted,marginTop:4}}>Dejalo vacío para que el bot genere el mensaje automáticamente</div>
      </div>

      <button onClick={guardar} disabled={saving}
        style={{width:"100%",padding:"13px 0",borderRadius:4,border:"none",background:saved?"#10b981":C.accent,color:"white",fontSize:14,fontWeight:600,cursor:"pointer",transition:"background .3s"}}>
        {saving ? "Guardando..." : saved ? "✅ ¡Guardado!" : "Guardar configuración del bot"}
      </button>
    </div>
  );
}

function WAConfigPanel({ client }) {
  const PAISES_LISTA = [
    { codigo: 'AR', nombre: '🇦🇷 Argentina' },
    { codigo: 'MX', nombre: '🇲🇽 México' },
    { codigo: 'CO', nombre: '🇨🇴 Colombia' },
    { codigo: 'CL', nombre: '🇨🇱 Chile' },
    { codigo: 'PE', nombre: '🇵🇪 Perú' },
    { codigo: 'UY', nombre: '🇺🇾 Uruguay' },
    { codigo: 'PY', nombre: '🇵🇾 Paraguay' },
    { codigo: 'BO', nombre: '🇧🇴 Bolivia' },
    { codigo: 'EC', nombre: '🇪🇨 Ecuador' },
    { codigo: 'VE', nombre: '🇻🇪 Venezuela' },
    { codigo: 'BR', nombre: '🇧🇷 Brasil' },
    { codigo: 'ES', nombre: '🇪🇸 España' },
    { codigo: 'PT', nombre: '🇵🇹 Portugal' },
    { codigo: 'US', nombre: '🇺🇸 Estados Unidos' },
    { codigo: 'CA', nombre: '🇨🇦 Canadá' },
    { codigo: 'GT', nombre: '🇬🇹 Guatemala' },
    { codigo: 'SV', nombre: '🇸🇻 El Salvador' },
    { codigo: 'HN', nombre: '🇭🇳 Honduras' },
    { codigo: 'NI', nombre: '🇳🇮 Nicaragua' },
    { codigo: 'CR', nombre: '🇨🇷 Costa Rica' },
    { codigo: 'PA', nombre: '🇵🇦 Panamá' },
    { codigo: 'DO', nombre: '🇩🇴 Rep. Dominicana' },
    { codigo: 'CU', nombre: '🇨🇺 Cuba' },
    { codigo: 'IT', nombre: '🇮🇹 Italia' },
    { codigo: 'FR', nombre: '🇫🇷 Francia' },
    { codigo: 'DE', nombre: '🇩🇪 Alemania' },
    { codigo: 'GB', nombre: '🇬🇧 Reino Unido' },
  ];
  const [wform, setWform] = useState({ phone_number_id: client?.phone_number_id||"", whatsapp_token: "", numero_whatsapp: client?.numero_whatsapp||"", pais_codigo: client?.pais_codigo||"AR" });
  const [wsaving, setWsaving] = useState(false);
  const [wok, setWok] = useState(false);
  const guardarWA = async () => {
    setWsaving(true); setWok(false);
    try {
      await fetch(`${API}/api/clientes/${client.id}/whatsapp`, {
        method:"PUT", headers:jH(),
        body: JSON.stringify(wform)
      });
      setWok(true); setTimeout(()=>setWok(false), 3000);
    } catch(e) {}
    setWsaving(false);
  };
  return (
    <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:20,marginBottom:16}}>
      <div style={{fontSize:13,fontWeight:600,marginBottom:2}}>📱 Número de WhatsApp</div>
      <div style={{fontSize:12,color:C.muted,marginBottom:16}}>Credenciales del número de WhatsApp en Meta</div>
      <div style={{marginBottom:16}}>
        <label style={{fontSize:11,color:C.muted,fontWeight:500,display:"block",marginBottom:5}}>País del negocio</label>
        <select value={wform.pais_codigo} onChange={e=>setWform({...wform,pais_codigo:e.target.value})}
          style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:2,padding:"9px 12px",color:C.text,fontSize:12,boxSizing:"border-box"}}>
          {PAISES_LISTA.map(p=>(
            <option key={p.codigo} value={p.codigo}>{p.nombre}</option>
          ))}
        </select>
        <div style={{fontSize:10,color:C.muted,marginTop:4}}>Se usa para normalizar los teléfonos de prospectos al enviar mensajes.</div>
      </div>
      <Field label="Número de WhatsApp" value={wform.numero_whatsapp} onChange={v=>setWform({...wform,numero_whatsapp:v})} placeholder="+54 11 4523-8901"/>
      <Field label="Phone Number ID (Meta)" value={wform.phone_number_id} onChange={v=>setWform({...wform,phone_number_id:v})} placeholder="1234567890"/>
      <div style={{marginBottom:16}}>
        <label style={{fontSize:11,color:C.muted,fontWeight:500,display:"block",marginBottom:5}}>WhatsApp Token</label>
        <input type="password" value={wform.whatsapp_token} onChange={e=>setWform({...wform,whatsapp_token:e.target.value})}
          placeholder="EAAxxxxx... (dejar vacío para no cambiar)"
          style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:2,padding:"9px 12px",color:C.text,fontSize:12,fontFamily:"'DM Mono',monospace",boxSizing:"border-box"}}/>
        <div style={{fontSize:10,color:C.muted,marginTop:4}}>Token permanente de Meta Developers. Dejar vacío para no modificarlo.</div>
      </div>
      <div style={{display:"flex",gap:10,alignItems:"center"}}>
        <Btn onClick={guardarWA} disabled={wsaving} small>{wsaving?"Guardando...":"Guardar credenciales"}</Btn>
        {wok && <span style={{fontSize:12,color:C.green}}>✓ Guardado</span>}
      </div>
    </div>
  );
}


function DifusionPanel({ client, API, aH, jH, tratamientos, plan }) {
  const _t = typeof localStorage !== 'undefined' ? localStorage.getItem('skyward_theme') : 'dark'; const C = _t === 'light' ? LIGHT_C : DARK_C;
  const [tratFiltro, setTratFiltro] = useState('');
  const [sinTurnoDias, setSinTurnoDias] = useState('');
  const [minTurnos, setMinTurnos] = useState('');
  const [etapaFiltro, setEtapaFiltro] = useState('');
  const [sinContactoDias, setSinContactoDias] = useState('');
  const [tipoPacienteFiltro, setTipoPacienteFiltro] = useState('');
  const [pacientes, setPacientes] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [modoEnvio, setModoEnvio] = useState('texto'); // 'texto' | 'plantilla' | 'email'
  const [emailAsunto, setEmailAsunto] = useState('');
  const [emailCuerpo, setEmailCuerpo] = useState('');
  const [plantillaElegida, setPlantillaElegida] = useState('edge_react1');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(null);
  const [seleccionados, setSeleccionados] = useState(new Set());
  const [paso, setPaso] = useState('filtros');
  const [progreso, setProgreso] = useState(null);
  const [vistaActiva, setVistaActiva] = useState('nueva'); // 'nueva' | 'historial'
  const [historial, setHistorial] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  const fetchHistorial = async () => {
    setCargandoHistorial(true);
    try {
      const r = await fetch(`${API}/api/difusion/historial?cliente_id=${client.id}`, {headers:aH()});
      if (r.ok) setHistorial(await r.json());
    } catch(e) {}
    setCargandoHistorial(false);
  };

  useEffect(() => {
    if (vistaActiva === 'historial') fetchHistorial();
  }, [vistaActiva]);

  const PLANTILLAS_REACT = [
    { value: 'edge_react1', label: '😊 Hace tiempo que no hablamos' },
    { value: 'edge_react2', label: '💭 Me acordé de vos hoy' },
    { value: 'edge_react3', label: '👥 Llegó un caso parecido al tuyo' },
    { value: 'edge_react4', label: '📢 Tenemos novedades' },
    { value: 'edge_react5', label: '🔄 Nuevo período, retomamos?' },
  ];

  const buscarPacientes = async () => {
    setCargando(true);
    setPacientes([]);
    setSeleccionados(new Set());
    let url = `${API}/api/difusion/preview?cliente_id=${client.id}`;
    if (tratFiltro) url += `&tratamiento=${encodeURIComponent(tratFiltro)}`;
    if (sinTurnoDias) url += `&sin_turno_dias=${sinTurnoDias}`;
    if (minTurnos) url += `&min_turnos=${minTurnos}`;
    if (etapaFiltro) url += `&etapa=${encodeURIComponent(etapaFiltro)}`;
    if (sinContactoDias) url += `&sin_contacto_dias=${sinContactoDias}`;
    if (tipoPacienteFiltro) url += `&tipo_paciente=${encodeURIComponent(tipoPacienteFiltro)}`;
    const r = await fetch(url, {headers:aH()}).catch(()=>null);
    if (r?.ok) {
      const data = await r.json();
      setPacientes(data);
      setSeleccionados(new Set(data.map(p=>p.id)));
      setPaso('preview');
    }
    setCargando(false);
  };

  const enviar = async () => {
    const pacsSelec = pacientes.filter(p=>seleccionados.has(p.id));
    if (!pacsSelec.length) return;
    if (modoEnvio === 'texto' && !mensaje.trim()) return;
    if (modoEnvio === 'plantilla' && !plantillaElegida) return;
    if (modoEnvio === 'email' && (!emailAsunto.trim() || !emailCuerpo.trim())) return;
    setEnviando(true);
    setPaso('enviando');
    setProgreso({ enviados:0, fallidos:0, total:pacsSelec.length, nombre:'' });

    let enviados = 0;
    let fallidos = 0;

    for (let i = 0; i < pacsSelec.length; i++) {
      const pac = pacsSelec[i];
      setProgreso(p => ({...p, nombre: pac.nombre||pac.telefono, enviados, fallidos}));
      try {
        let r;
        if (modoEnvio === 'email') {
          if (!pac.email) { fallidos++; continue; }
          r = await fetch(`${API}/api/difusion/enviar-email`, {
            method:'POST', headers:jH(),
            body: JSON.stringify({ cliente_id:client.id, paciente:pac, asunto:emailAsunto.trim(), cuerpo:emailCuerpo.trim() })
          });
        } else {
          const body = modoEnvio === 'plantilla'
            ? { cliente_id:client.id, paciente:pac, plantilla:plantillaElegida }
            : { cliente_id:client.id, paciente:pac, mensaje:mensaje.trim() };
          r = await fetch(`${API}/api/difusion/enviar-uno`, { method:'POST', headers:jH(), body: JSON.stringify(body) });
        }
        if (r.ok) enviados++;
        else {
          fallidos++;
          const err = await r.json().catch(()=>({}));
          console.error(`📣 Difusión FAIL para ${pac.nombre||pac.telefono}:`, {
            error: err.error, tel_original: err.tel_original,
            tel_normalizado: err.tel_normalizado, detalle: err.detalle
          });
        }
      } catch(e) {
        fallidos++;
        console.error(`📣 Difusión excepción para ${pac.nombre||pac.telefono}:`, e.message);
      }
      setProgreso({ enviados, fallidos, total:pacsSelec.length, nombre: pac.nombre||pac.telefono });

      // Delay 3 segundos entre mensajes (excepto el último)
      if (i < pacsSelec.length - 1) {
        await new Promise(r => setTimeout(r, 3000));
      }
    }

    setEnviado(`${enviados} enviados${fallidos>0?`, ${fallidos} fallidos`:''}`);
    setEnviando(false);
    setPaso('filtros');
    setPacientes([]);
    setMensaje('');
  };

  const toggleTodos = () => {
    if (seleccionados.size === pacientes.length) setSeleccionados(new Set());
    else setSeleccionados(new Set(pacientes.map(p=>p.id)));
  };

  return (
    <div>
      <div style={{fontSize:16,fontWeight:700,marginBottom:4}}>📣 Difusión</div>
      <div style={{fontSize:12,color:C.muted,marginBottom:16}}>Enviá mensajes segmentados a tus prospectos</div>

      {/* Tabs */}
      <div style={{display:"flex",gap:8,marginBottom:20}}>
        <button onClick={()=>setVistaActiva('nueva')}
          style={{padding:"7px 16px",borderRadius:4,border:`1px solid ${vistaActiva==='nueva'?C.accent:C.border}`,
            background:vistaActiva==='nueva'?"rgba(99,102,241,0.15)":C.surface,
            color:vistaActiva==='nueva'?C.accentLight:C.muted,fontSize:12,fontWeight:600,cursor:"pointer"}}>
          📣 Nueva campaña
        </button>
        <button onClick={()=>setVistaActiva('historial')}
          style={{padding:"7px 16px",borderRadius:4,border:`1px solid ${vistaActiva==='historial'?C.accent:C.border}`,
            background:vistaActiva==='historial'?"rgba(99,102,241,0.15)":C.surface,
            color:vistaActiva==='historial'?C.accentLight:C.muted,fontSize:12,fontWeight:600,cursor:"pointer"}}>
          📋 Historial
        </button>
      </div>

      {/* Vista historial */}
      {vistaActiva === 'historial' && (
        <div>
          {cargandoHistorial ? (
            <div style={{textAlign:"center",padding:40,color:C.muted,fontSize:13}}>Cargando historial...</div>
          ) : historial.length === 0 ? (
            <div style={{textAlign:"center",padding:40,color:C.muted,fontSize:13}}>Sin campañas enviadas aún</div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {historial.map((h,i) => (
                <details key={i} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,overflow:"hidden"}}>
                  <summary style={{padding:"14px 16px",cursor:"pointer",listStyle:"none",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <span style={{fontSize:18}}>{h.tipo==='difusion_email'?'📧':'📣'}</span>
                      <div>
                        <div style={{fontSize:13,fontWeight:600,color:C.text}}>{h.descripcion || (h.tipo==='difusion_email'?'Campaña email':'Campaña WhatsApp')}</div>
                        <div style={{fontSize:11,color:C.muted,marginTop:2}}>
                          {new Date(h.fecha+'T12:00:00').toLocaleDateString('es-AR',{day:'numeric',month:'short',year:'numeric'})}
                          {' · '}
                          <span style={{color:"#10b981"}}>✅ {h.enviados}</span>
                          {h.fallidos > 0 && <span style={{color:"#f87171"}}> · ❌ {h.fallidos}</span>}
                          {' · '}{h.tipo==='difusion_email'?'Email':'WhatsApp'}
                        </div>
                      </div>
                    </div>
                    <span style={{fontSize:11,color:C.muted,flexShrink:0}}>▼ ver destinatarios</span>
                  </summary>
                  <div style={{borderTop:`1px solid ${C.border}`,padding:"10px 16px",maxHeight:300,overflowY:"auto"}}>
                    {(h.destinatarios||[]).map((d,j) => (
                      <div key={j} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0",borderBottom:j<h.destinatarios.length-1?`1px solid ${C.border}`:"none"}}>
                        <div style={{width:8,height:8,borderRadius:"50%",flexShrink:0,background:d.estado==='enviado'?"#10b981":"#ef4444"}}/>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:12,fontWeight:500,color:C.text}}>{d.nombre}</div>
                          {(d.email||d.telefono) && <div style={{fontSize:10,color:C.muted}}>{d.email||d.telefono}</div>}
                        </div>
                        <div style={{fontSize:10,color:d.estado==='enviado'?"#10b981":"#f87171",flexShrink:0}}>
                          {d.estado==='enviado'?'✅ Enviado':'❌ Falló'}
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Vista nueva campaña */}
      {vistaActiva === 'nueva' && <>

      {enviado && (
        <div style={{background:"rgba(16,185,129,0.1)",border:"1px solid rgba(16,185,129,0.3)",borderRadius:4,padding:"10px 14px",marginBottom:16,fontSize:12,color:"#4ade80"}}>
          ✅ Difusión completada: {enviado}
          <button onClick={()=>{setEnviado(null);fetchHistorial();setVistaActiva('historial');}} style={{marginLeft:10,background:"transparent",border:"none",color:"#4ade80",cursor:"pointer",fontSize:12}}>Ver historial →</button>
        </div>
      )}

      {paso === 'enviando' ? (
        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:32,textAlign:"center"}}>
          <div style={{fontSize:28,marginBottom:16}}>📣</div>
          <div style={{fontSize:14,fontWeight:600,marginBottom:8}}>Enviando mensajes...</div>
          {progreso && (
            <>
              <div style={{fontSize:13,color:C.muted,marginBottom:16}}>
                {progreso.nombre && <span>Enviando a <strong style={{color:C.text}}>{progreso.nombre}</strong>...</span>}
              </div>
              <div style={{background:C.bg,borderRadius:2,height:8,overflow:"hidden",marginBottom:10}}>
                <div style={{width:`${((progreso.enviados+progreso.fallidos)/progreso.total)*100}%`,height:"100%",background:C.accent,borderRadius:4,transition:"width .5s ease"}}/>
              </div>
              <div style={{fontSize:12,color:C.muted}}>
                {progreso.enviados+progreso.fallidos} de {progreso.total}
                {progreso.fallidos>0 && <span style={{color:C.red}}> · {progreso.fallidos} fallidos</span>}
              </div>
            </>
          )}
          <div style={{fontSize:11,color:C.muted,marginTop:16}}>Podés navegar a otra sección — el envío continúa en segundo plano</div>
        </div>
      ) : paso === 'filtros' ? (<>
        {/* Filtros */}
        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:20,marginBottom:16}}>
          <div style={{fontSize:13,fontWeight:600,marginBottom:16}}>🎯 Segmentación</div>

          <div style={{marginBottom:14}}>
            <label style={{fontSize:11,color:C.muted,fontWeight:500,display:"block",marginBottom:6}}>Servicio</label>
            <select value={tratFiltro} onChange={e=>setTratFiltro(e.target.value)}
              style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"9px 12px",color:C.text,fontSize:13,fontFamily:"inherit"}}>
              <option value="">Todos los servicios</option>
              {(tratamientos||[]).map(t=><option key={t.id} value={t.nombre}>{t.nombre}</option>)}
            </select>
          </div>

          <div style={{marginBottom:14}}>
            <label style={{fontSize:11,color:C.muted,fontWeight:500,display:"block",marginBottom:6}}>Etapa del prospecto</label>
            <select value={etapaFiltro} onChange={e=>setEtapaFiltro(e.target.value)}
              style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"9px 12px",color:C.text,fontSize:13,fontFamily:"inherit"}}>
              <option value="">Todas las etapas</option>
              <option value="RAPPORT">Rapport</option>
              <option value="OFRECER_AGENDA">Quiere cita</option>
              <option value="CONFIRMAR_AGENDA">Confirmando agenda</option>
              <option value="SEGUIMIENTO_PENDIENTE">Seguimiento pendiente</option>
              <option value="PACIENTE_ACTIVO">Prospecto activo</option>
            </select>
          </div>

          <div style={{marginBottom:14}}>
            <label style={{fontSize:11,color:C.muted,fontWeight:500,display:"block",marginBottom:6}}>Sin turno hace más de</label>
            <select value={sinTurnoDias} onChange={e=>setSinTurnoDias(e.target.value)}
              style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"9px 12px",color:C.text,fontSize:13,fontFamily:"inherit"}}>
              <option value="">Sin límite</option>
              <option value="30">30 días</option>
              <option value="60">60 días</option>
              <option value="90">90 días</option>
              <option value="180">6 meses</option>
              <option value="365">1 año</option>
            </select>
          </div>

          <div style={{marginBottom:20}}>
            <label style={{fontSize:11,color:C.muted,fontWeight:500,display:"block",marginBottom:6}}>Mínimo de turnos realizados</label>
            <select value={minTurnos} onChange={e=>setMinTurnos(e.target.value)}
              style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"9px 12px",color:C.text,fontSize:13,fontFamily:"inherit"}}>
              <option value="">Sin mínimo</option>
              <option value="0">Sin ningún turno (nuevos)</option>
              <option value="1">Al menos 1 turno</option>
              <option value="2">Al menos 2 turnos</option>
              <option value="3">Al menos 3 turnos</option>
              <option value="5">Al menos 5 turnos</option>
              <option value="10">Al menos 10 turnos</option>
            </select>
          </div>

          <div style={{marginBottom:14}}>
            <label style={{fontSize:11,color:C.muted,fontWeight:500,display:"block",marginBottom:6}}>Sin contacto hace más de</label>
            <select value={sinContactoDias||''} onChange={e=>setSinContactoDias(e.target.value)}
              style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"9px 12px",color:C.text,fontSize:13,fontFamily:"inherit"}}>
              <option value="">Sin límite</option>
              <option value="7">7 días</option>
              <option value="14">14 días</option>
              <option value="30">30 días</option>
              <option value="60">60 días</option>
              <option value="90">90 días</option>
              <option value="180">6 meses</option>
            </select>
          </div>

          <div style={{marginBottom:20}}>
            <label style={{fontSize:11,color:C.muted,fontWeight:500,display:"block",marginBottom:6}}>Tipo de prospecto</label>
            <select value={tipoPacienteFiltro||''} onChange={e=>setTipoPacienteFiltro(e.target.value)}
              style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"9px 12px",color:C.text,fontSize:13,fontFamily:"inherit"}}>
              <option value="">Todos</option>
              <option value="sin_tratamiento">Sin servicio nunca</option>
              <option value="con_tratamiento">Con al menos 1 servicio</option>
              <option value="inactivos">Inactivos (tuvieron turno pero no vuelven)</option>
            </select>
          </div>

          <button onClick={buscarPacientes} disabled={cargando}
            style={{width:"100%",padding:"11px 0",borderRadius:4,border:"none",background:C.accent,color:"white",fontSize:13,fontWeight:600,cursor:"pointer"}}>
            {cargando?"Buscando...":"🔍 Ver prospectos"}
          </button>
        </div>
      </>) : (<>
        {/* Preview */}
        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:16,marginBottom:16}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
            <div style={{fontSize:13,fontWeight:600}}>{seleccionados.size} de {pacientes.length} prospectos seleccionados</div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={toggleTodos} style={{padding:"4px 10px",borderRadius:4,border:`1px solid ${C.border}`,background:"transparent",color:C.muted,fontSize:11,cursor:"pointer"}}>
                {seleccionados.size===pacientes.length?"Deseleccionar todos":"Seleccionar todos"}
              </button>
              <button onClick={()=>{setPaso('filtros');setPacientes([]);}} style={{padding:"4px 10px",borderRadius:4,border:`1px solid ${C.border}`,background:"transparent",color:C.muted,fontSize:11,cursor:"pointer"}}>
                ← Cambiar filtros
              </button>
            </div>
          </div>
          <div style={{maxHeight:220,overflowY:"auto",borderRadius:4,border:`1px solid ${C.border}`}}>
            {pacientes.map((p,i)=>(
              <div key={p.id} onClick={()=>{const s=new Set(seleccionados);s.has(p.id)?s.delete(p.id):s.add(p.id);setSeleccionados(s);}}
                style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",cursor:"pointer",
                  borderBottom:i<pacientes.length-1?`1px solid ${C.border}`:"none",
                  background:seleccionados.has(p.id)?"rgba(99,102,241,0.05)":"transparent"}}>
                <div style={{width:16,height:16,borderRadius:4,border:`1.5px solid ${seleccionados.has(p.id)?C.accent:C.border}`,background:seleccionados.has(p.id)?C.accent:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  {seleccionados.has(p.id)&&<span style={{color:"white",fontSize:10}}>✓</span>}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.nombre||p.telefono}</div>
                  <div style={{fontSize:10,color:C.muted}}>{p.total_turnos} turno{p.total_turnos!=1?"s":""}{p.ultimo_turno?` · último: ${new Date(p.ultimo_turno+'T12:00:00').toLocaleDateString('es-AR',{day:'numeric',month:'short'})}`:""}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mensaje */}
        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:16,marginBottom:16}}>
          <div style={{fontSize:13,fontWeight:600,marginBottom:10}}>✍️ Mensaje</div>
          <div style={{display:"flex",gap:8,marginBottom:14}}>
            {plan !== 'base' && <button onClick={()=>setModoEnvio('texto')}
              style={{flex:1,padding:"8px 0",borderRadius:4,border:`1px solid ${modoEnvio==='texto'?C.accent:C.border}`,
                background:modoEnvio==='texto'?"rgba(99,102,241,0.15)":C.bg,
                color:modoEnvio==='texto'?C.accentLight:C.muted,fontSize:12,fontWeight:600,cursor:"pointer"}}>
              💬 Texto libre
            </button>}
            {plan !== 'base' && <button onClick={()=>setModoEnvio('plantilla')}
              style={{flex:1,padding:"8px 0",borderRadius:4,border:`1px solid ${modoEnvio==='plantilla'?C.accent:C.border}`,
                background:modoEnvio==='plantilla'?"rgba(99,102,241,0.15)":C.bg,
                color:modoEnvio==='plantilla'?C.accentLight:C.muted,fontSize:12,fontWeight:600,cursor:"pointer"}}>
              📋 Plantilla Meta
            </button>}
            <button onClick={()=>setModoEnvio('email')}
              style={{flex:1,padding:"8px 0",borderRadius:4,border:`1px solid ${modoEnvio==='email'?'#06b6d4':C.border}`,
                background:modoEnvio==='email'?"rgba(6,182,212,0.15)":C.bg,
                color:modoEnvio==='email'?'#67e8f9':C.muted,fontSize:12,fontWeight:600,cursor:"pointer"}}>
              📧 Email
            </button>
          </div>
          {modoEnvio === 'texto' ? (<>
            <div style={{fontSize:11,color:"#f59e0b",marginBottom:8,padding:"6px 10px",background:"rgba(245,158,11,0.08)",borderRadius:4,border:"1px solid rgba(245,158,11,0.2)"}}>
              ⚠️ Solo funciona si el prospecto escribió en las últimas 24hs. Para reactivar inactivos usá Plantilla Meta.
            </div>
            <textarea value={mensaje} onChange={e=>setMensaje(e.target.value)}
              placeholder="Escribí el mensaje que van a recibir los prospectos..."
              rows={5}
              style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"10px 12px",color:C.text,fontSize:13,fontFamily:"inherit",resize:"vertical",boxSizing:"border-box",marginBottom:8}}/>
            {mensaje && (
              <div style={{background:"rgba(99,102,241,0.08)",border:`1px solid ${C.accent}44`,borderRadius:4,padding:"8px 12px",marginBottom:10}}>
                <div style={{fontSize:10,color:C.muted,marginBottom:4}}>Preview:</div>
                <div style={{fontSize:12,color:C.text,whiteSpace:"pre-wrap"}}>{mensaje}</div>
              </div>
            )}
          </>) : (<>
            <div style={{fontSize:11,color:"#4ade80",marginBottom:8,padding:"6px 10px",background:"rgba(74,222,128,0.08)",borderRadius:4,border:"1px solid rgba(74,222,128,0.2)"}}>
              ✅ Las plantillas llegan aunque el prospecto no haya escrito recientemente.
            </div>
            <select value={plantillaElegida} onChange={e=>setPlantillaElegida(e.target.value)}
              style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:2,padding:"9px 12px",color:C.text,fontSize:13,marginBottom:10}}>
              {PLANTILLAS_REACT.map(p=>(
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
            <div style={{background:"rgba(99,102,241,0.08)",border:`1px solid ${C.accent}44`,borderRadius:4,padding:"8px 12px",marginBottom:10}}>
              <div style={{fontSize:10,color:C.muted,marginBottom:4}}>Preview (el nombre se reemplaza automáticamente):</div>
              <div style={{fontSize:12,color:C.text}}>
                {plantillaElegida==="edge_react1" && "Hola [Nombre]! cómo estás? hace tiempo que no hablamos, quería saber cómo seguís 😊"}
                {plantillaElegida==="edge_react2" && "Hola [Nombre]! me acordé de vos hoy, cómo vas con todo?"}
                {plantillaElegida==="edge_react3" && "Hola [Nombre]! justo hoy llegó un caso parecido al tuyo y pensé en vos, cómo estás?"}
                {plantillaElegida==="edge_react4" && "Hola [Nombre]! tenemos novedades que creo que te pueden interesar, hablamos?"}
                {plantillaElegida==="edge_react5" && "Hola [Nombre]! arrancó un nuevo período y quería ver si querés que retomemos 😊"}
              </div>
            </div>
          </>)}
          {modoEnvio === 'email' && (<>
            <div style={{fontSize:11,color:"#67e8f9",marginBottom:8,padding:"6px 10px",background:"rgba(6,182,212,0.08)",borderRadius:4,border:"1px solid rgba(6,182,212,0.2)"}}>
              📧 Se envía por Gmail de la agencia. Solo llega a prospectos con email registrado.
            </div>
            <div style={{marginBottom:10}}>
              <label style={{fontSize:11,color:C.muted,fontWeight:500,display:"block",marginBottom:4}}>Asunto</label>
              <input value={emailAsunto} onChange={e=>setEmailAsunto(e.target.value)}
                placeholder="Ej: Tenemos algo para vos"
                style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"9px 12px",color:C.text,fontSize:13,fontFamily:"inherit",boxSizing:"border-box"}}/>
            </div>
            <div style={{marginBottom:10}}>
              <label style={{fontSize:11,color:C.muted,fontWeight:500,display:"block",marginBottom:4}}>Cuerpo del email</label>
              <textarea value={emailCuerpo} onChange={e=>setEmailCuerpo(e.target.value)}
                placeholder={"Hola [Nombre]!\n\nEscribí acá el mensaje...\n\nSaludos,\nSkyward"}
                rows={6}
                style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"10px 12px",color:C.text,fontSize:13,fontFamily:"inherit",resize:"vertical",boxSizing:"border-box"}}/>
            </div>
            <div style={{fontSize:11,color:C.muted,marginBottom:8}}>
              💡 Usá [Nombre] para personalizar con el nombre del prospecto.
            </div>
            {emailAsunto && emailCuerpo && (
              <div style={{background:"rgba(6,182,212,0.06)",border:"1px solid rgba(6,182,212,0.2)",borderRadius:4,padding:"8px 12px",marginBottom:10}}>
                <div style={{fontSize:10,color:C.muted,marginBottom:4}}>Preview:</div>
                <div style={{fontSize:12,fontWeight:600,color:"#67e8f9",marginBottom:4}}>{emailAsunto}</div>
                <div style={{fontSize:11,color:C.text,whiteSpace:"pre-wrap"}}>{emailCuerpo.replace('[Nombre]', pacientes[0]?.nombre?.split(' ')[0] || 'María')}</div>
              </div>
            )}
            <div style={{fontSize:11,color:C.muted,marginBottom:12}}>
              📊 {pacientes.filter(p=>seleccionados.has(p.id)&&p.email).length} de {seleccionados.size} seleccionados tienen email registrado.
            </div>
          </>)}
          {modoEnvio !== 'email' && (
            <div style={{fontSize:11,color:C.muted,marginBottom:12}}>
              ⏱️ 3 segundos de delay entre mensajes. Para {seleccionados.size} prospectos tardará ~{Math.ceil(seleccionados.size*3/60)} minutos.
            </div>
          )}
          <button onClick={enviar}
            disabled={enviando||(modoEnvio==='texto'&&!mensaje.trim())||(modoEnvio==='email'&&(!emailAsunto.trim()||!emailCuerpo.trim()))||seleccionados.size===0}
            style={{width:"100%",padding:"11px 0",borderRadius:4,border:"none",
              background:modoEnvio==='email'?"#0891b2":seleccionados.size===0?"#374151":"#ef4444",
              color:"white",fontSize:13,fontWeight:600,cursor:"pointer"}}>
            {enviando?(modoEnvio==='email'?'Enviando emails...':'Enviando...'):(modoEnvio==='email'?`📧 Enviar email a ${pacientes.filter(p=>seleccionados.has(p.id)&&p.email).length} pacientes`:`📣 Enviar a ${seleccionados.size} prospecto${seleccionados.size!=1?"s":""}`)}
          </button>
        </div>
      </>)}
      </>}
    </div>
  );
}

function FuentesConfig({ client }) {
  const _t = typeof localStorage !== 'undefined' ? localStorage.getItem('skyward_theme') : 'dark';
  const C = _t === 'light' ? LIGHT_C : DARK_C;
  const waNum = client?.numero_whatsapp?.replace(/\D/g,'') || '';
  const waBase = waNum ? `https://wa.me/${waNum}` : 'https://wa.me/TU_NUMERO';
  const linkGoogle = `${waBase}?text=ref:google`;
  const [otroNombre, setOtroNombre] = useState('landing');
  const linkOtro = `${waBase}?text=ref:${encodeURIComponent(otroNombre||'otro')}`;
  const [copiado, setCopiado] = useState('');
  const copy = (txt, key) => {
    navigator.clipboard.writeText(txt).catch(()=>{});
    setCopiado(key);
    setTimeout(()=>setCopiado(''), 2000);
  };

  return (
    <div>
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:20,marginBottom:16}}>
        <div style={{fontSize:13,fontWeight:600,marginBottom:8}}>📊 ¿Cómo funciona la atribución?</div>
        <div style={{fontSize:12,color:C.muted,lineHeight:1.7,marginBottom:12}}>
          Cada vez que alguien te escribe por WhatsApp, el sistema detecta automáticamente de dónde vino. Así podés ver qué canales traen más pacientes y cuáles convierten mejor.
        </div>
        {[
          {icon:"🟢", label:"Meta Ads", desc:"Se detecta automáticamente en anuncios «Click to WhatsApp». No necesitás configurar nada."},
          {icon:"🔵", label:"Google Ads", desc:"Usás el link de abajo como URL final en tu anuncio de Google."},
          {icon:"⚪", label:"Directo / Orgánico", desc:"Si alguien escribe sin venir de un anuncio, se registra como «directo»."},
          {icon:"🟣", label:"Personalizado", desc:"Para TikTok, landing, bio de Instagram o cualquier otra fuente."},
        ].map((f,i)=>(
          <div key={i} style={{display:"flex",gap:10,padding:"8px 0",borderBottom:i<3?`1px solid ${C.border}`:"none"}}>
            <span style={{fontSize:14,flexShrink:0}}>{f.icon}</span>
            <div>
              <div style={{fontSize:12,fontWeight:600}}>{f.label}</div>
              <div style={{fontSize:11,color:C.muted,marginTop:2}}>{f.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:20,marginBottom:12}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
          <span>🟢</span><div style={{fontSize:13,fontWeight:600}}>Meta Ads</div>
        </div>
        <div style={{fontSize:12,color:C.muted,marginBottom:10,lineHeight:1.6}}>
          Automático para anuncios <strong style={{color:C.text}}>«Click to WhatsApp»</strong>. Meta envía la fuente directamente.
        </div>
        <div style={{background:C.bg,borderRadius:2,padding:"8px 12px",fontSize:11,color:"#4ade80"}}>
          ✅ Activo automáticamente — no requiere configuración
        </div>
      </div>

      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:20,marginBottom:12}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
          <span>🔵</span><div style={{fontSize:13,fontWeight:600}}>Google Ads</div>
        </div>
        <div style={{fontSize:12,color:C.muted,marginBottom:10,lineHeight:1.6}}>
          Pegá este link como <strong style={{color:C.text}}>URL final</strong> en tu anuncio de Google.
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <div style={{flex:1,background:C.bg,border:`1px solid ${C.border}`,borderRadius:2,padding:"8px 12px",fontSize:11,color:C.accentLight,fontFamily:"monospace",wordBreak:"break-all"}}>{linkGoogle}</div>
          <button onClick={()=>copy(linkGoogle,'google')}
            style={{padding:"8px 14px",borderRadius:4,border:"none",background:copiado==='google'?"#10b981":C.accent,color:"white",fontSize:12,fontWeight:600,cursor:"pointer",flexShrink:0,transition:"background .2s"}}>
            {copiado==='google'?'✓ Copiado':'Copiar'}
          </button>
        </div>
      </div>

      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:20,marginBottom:12}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
          <span>🟣</span><div style={{fontSize:13,fontWeight:600}}>Personalizado</div>
        </div>
        <div style={{fontSize:12,color:C.muted,marginBottom:10}}>Escribí el nombre y copiá el link.</div>
        <input value={otroNombre} onChange={e=>setOtroNombre(e.target.value.toLowerCase().replace(/\s+/g,'-'))}
          placeholder="tiktok, landing, organico..."
          style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"8px 12px",color:C.text,fontSize:12,fontFamily:"inherit",marginBottom:10,boxSizing:"border-box"}}/>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <div style={{flex:1,background:C.bg,border:`1px solid ${C.border}`,borderRadius:2,padding:"8px 12px",fontSize:11,color:C.accentLight,fontFamily:"monospace",wordBreak:"break-all"}}>{linkOtro}</div>
          <button onClick={()=>copy(linkOtro,'otro')}
            style={{padding:"8px 14px",borderRadius:4,border:"none",background:copiado==='otro'?"#10b981":C.accent,color:"white",fontSize:12,fontWeight:600,cursor:"pointer",flexShrink:0,transition:"background .2s"}}>
            {copiado==='otro'?'✓ Copiado':'Copiar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ClientView({ client, campos: camposGlobal, rango, user, plan, prospectos, mensajes, funnelData, selectedProspect, setSelectedProspect, datosAgenda, chatRef, activeTab, setActiveTab, onRefresh, onRefreshMensajes, onAddMensaje, horariosSugeridos=null, pushActivo=false, highlightPush=false, onHighlightPushDone, onPushActivado, token, onMarcarLimpiado }) {
  const [calStatus, setCalStatus] = useState(null);
  const [campos, setCampos] = useState(null);
  const [camposSaving, setCamposSaving] = useState(false);
  const [tratamientos, setTratamientos] = useState([]);
  const [profesionales, setProfesionales] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [showNewUsuario, setShowNewUsuario] = useState(false);
  const [savingUsuario, setSavingUsuario] = useState(false);
  const [formUsuario, setFormUsuario] = useState({nombre:'',email:'',password:'',rango:'staff',cargo:''});
  const [errUsuario, setErrUsuario] = useState(null);

  const fetchUsuarios = async () => {
    try {
      const r = await fetch(`${API}/api/usuarios?cliente_id=${client.id}`, {headers:aH()});
      if (r.ok) setUsuarios(await r.json());
    } catch(e) {}
  };

  const crearUsuarioConfig = async () => {
    if (!formUsuario.nombre || !formUsuario.email || !formUsuario.password) return;
    setSavingUsuario(true); setErrUsuario(null);
    try {
      const r = await fetch(`${API}/api/auth/crear-usuario`, {
        method:'POST', headers:jH(),
        body: JSON.stringify({...formUsuario, cliente_id: client.id})
      });
      const d = await r.json();
      if (r.ok) { fetchUsuarios(); setShowNewUsuario(false); setFormUsuario({nombre:'',email:'',password:'',rango:'staff',cargo:''}); }
      else setErrUsuario(d.error || 'Error al crear usuario');
    } catch(e) { setErrUsuario(e.message); }
    setSavingUsuario(false);
  };

  const eliminarUsuario = async (id) => {
    if (!confirm('¿Eliminar este usuario?')) return;
    await fetch(`${API}/api/usuarios/${id}`, {method:'DELETE', headers:aH()});
    fetchUsuarios();
  };

  const [savingTrat, setSavingTrat] = useState(false);
  const [savingProf, setSavingProf] = useState(false);
  const [showNewTrat, setShowNewTrat] = useState(false);
  const [showNewProf, setShowNewProf] = useState(false);
  const [editingProf, setEditingProf] = useState(null); // id del profesional en edición
  const [formEditProf, setFormEditProf] = useState({ nombre:'', rol:'', email:'' });
  const [savingEditProf, setSavingEditProf] = useState(false);
  const [formTrat, setFormTrat] = useState({ nombre:"", duracion_minutos:60, descripcion:"" });
  const [formProf, setFormProf] = useState({ nombre:"", rol:"", email:"" });
  const [pacientes, setPacientes] = useState([]);
  const [searchQ, setSearchQ] = useState("");
  const [selPac, setSelPac] = useState(null);
  const [filtroDeuda, setFiltroDeuda] = useState(false);
  const [pacDet, setPacDet] = useState(null);
  const [tratCount, setTratCount] = useState({ total:0, realizados:0, este_mes:0 });
  const [planesP, setPlanesP] = useState([]);
  const [facPagos, setFacPagos] = useState([]);
  const [facFiltroFP, setFacFiltroFP] = useState("todos");
  const [facVistaDetalle, setFacVistaDetalle] = useState("resumen"); // resumen | pagos | pendientes
  const [showPago, setShowPago] = useState(false);
  const [confTab, setConfTab] = useState("clinica");
  const [logoPreview, setLogoPreview] = useState('');
  const [logoGuardando, setLogoGuardando] = useState(false);
  const [logoOk, setLogoOk] = useState(false);
  const [dashboard, setDashboard] = useState(null);
  const [loadingDash, setLoadingDash] = useState(false);
  const [horariosClinica, setHorariosClinica] = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  const [botConfig, setBotConfig] = useState(null);
  const [solicitudesPendientes, setSolicitudesPendientes] = useState(0);
  const [notificaciones, setNotificaciones] = useState([]);

  const fetchNotificaciones = async () => {
    if (!client?.id) return;
    try {
      const r = await fetch(`${API}/api/notificaciones?cliente_id=${client.id}`, {headers:aH()});
      if (r.ok) setNotificaciones(await r.json());
    } catch(e) {}
  };

  useEffect(() => {
    fetchNotificaciones();
    const interval = setInterval(fetchNotificaciones, 30000);
    return () => clearInterval(interval);
  }, [client?.id]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [fichaModal, setFichaModal] = useState(null);
  const [msgManual, setMsgManual] = useState("");
  const [modoHumano, setModoHumano] = useState({});
  const [showChatDetail, setShowChatDetail] = useState(false);
  const [enviandoMsg, setEnviandoMsg] = useState(false);
  const [grabando, setGrabando] = useState(false);
  const [enviandoAudio, setEnviandoAudio] = useState(false);
  const [horariosParaEnviar, setHorariosParaEnviar] = useState([]);
  const [yaEnvieHorariosIds, setYaEnvieHorariosIds] = useState(new Set()); // ids de prospectos ya con horarios enviados
  const [modalCalendario, setModalCalendario] = useState(false);
  const [reagendaMode, setReagendaMode] = useState(false);
  const mediaRecorderRef = React.useRef(null);
  const audioChunksRef = React.useRef([]);
  const [plantillaRapida, setPlantillaRapida] = useState("");
  const [consentimientoModal, setConsentimientoModal] = useState(null);
  const [portalLink, setPortalLink] = useState(null);
  const [loadingPortal, setLoadingPortal] = useState(false); // { paciente, turno_id } // { turno, paciente }
  const [fichasCache, setFichasCache] = useState({}); // cache por turno_id
  const prevSolicitudesPendientes = useRef(0);
  const [solicitudActiva, setSolicitudActiva] = useState(null);
  const [modoRechazo, setModoRechazo] = useState(false);
  const [motivoRechazo, setMotivoRechazo] = useState('');
  // Chat UI state
  const [busquedaProspectos, setBusquedaProspectos] = useState('');
  const limpiadosRef = useRef(new Set());
  const lastSeenRef = useRef({}); // { [prospecto_id]: timestamp cuando se abrió }
  const marcarLimpiado = (id) => {
    limpiadosRef.current.add(id);
    if (onMarcarLimpiado) onMarcarLimpiado(id);
  };
  const [showFiltros, setShowFiltros] = useState(false);
  const [filtroEtapa, setFiltroEtapa] = useState('');
  const [filtroTratamientoChat, setFiltroTratamientoChat] = useState('');
  const [filtroNoShow, setFiltroNoShow] = useState(false);
  const [filtroInactivos, setFiltroInactivos] = useState(0);
  const [showDetalle, setShowDetalle] = useState(false);
  const [marcandoNoShow, setMarcandoNoShow] = useState(false);
  const [recuperando, setRecuperando] = useState(false);
  const [editandoNombre, setEditandoNombre] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [respuestaBot, setRespuestaBot] = useState('');
  const [generandoRespuesta, setGenerandoRespuesta] = useState(false);
  const [enviandoConfirm, setEnviandoConfirm] = useState(false);
  const [bloqueos, setBloqueos] = useState([]);
  const [loadingDisp, setLoadingDisp] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [showAcciones, setShowAcciones] = useState(false);
  const [esRecordatorioFlag, setEsRecordatorioFlag] = useState(false);
  const [filtroRapido, setFiltroRapido] = useState('todos'); // todos | horario | agendados | cancelaciones
  const [pagoCtx, setPagoCtx] = useState(null);
  const [formPago, setFormPago] = useState({ monto:"", moneda:"ARS", forma_pago:"efectivo", concepto:"", nota:"" });
  const [savingPago, setSavingPago] = useState(false);

  useEffect(() => {
    if (!client?.id) return;
    fetch(`${API}/api/tratamientos/count?cliente_id=${client.id}`, { headers:aH() })
      .then(r=>r.json()).then(setTratCount).catch(()=>{});
    if (client?.logo_url) setLogoPreview(client.logo_url);
  }, [client?.id]);

  const CLOUDINARY_CLOUD = "dhtriaslp";

  // Importación CSV/Excel
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importRows, setImportRows] = useState([]);
  const [importCols, setImportCols] = useState({});
  const [importPreview, setImportPreview] = useState([]);
  const [importando, setImportando] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState(null);
  const [importStep, setImportStep] = useState("upload"); // upload | mapear | preview | resultado
  const CLOUDINARY_PRESET = "edge_resultados";

  const [resultados, setResultados] = useState([]);
  const [resLoading, setResLoading] = useState(false);
  const [resQ, setResQ] = useState("");
  const [resFiltroTrat, setResFiltroTrat] = useState("");
  const [showNuevoRes, setShowNuevoRes] = useState(false);
  const [resContextPac, setResContextPac] = useState(null); // paciente precargado
  const [formRes, setFormRes] = useState({ paciente_id:"", tratamiento_id:"", tratamiento_libre:"", fecha:"", nota:"" });
  const [fotoAntes, setFotoAntes] = useState(null);
  const [fotoDespues, setFotoDespues] = useState(null);
  const [fotoAntesURL, setFotoAntesURL] = useState("");
  const [fotoDespuesURL, setFotoDespuesURL] = useState("");
  const [savingRes, setSavingRes] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [calVista, setCalVista] = useState("dia"); // mensual | semanal | dia
  const [ahora, setAhora] = useState(new Date());
  useEffect(() => { const iv = setInterval(()=>setAhora(new Date()), 30000); return ()=>clearInterval(iv); }, []);
  const [calDrawer, setCalDrawer] = useState(null); // fecha string del drawer abierto
  const [calFecha, setCalFecha] = useState(new Date());
  const [calTurnos, setCalTurnos] = useState([]);
  const [calDiasel, setCalDiasel] = useState(null); // fecha seleccionada
  const [calLoading, setCalLoading] = useState(false);
  const [facData, setFacData] = useState(null);
  const [facLoading, setFacLoading] = useState(false);
  const [facMes, setFacMes] = useState(String(new Date().getMonth()+1));
  const [facAño, setFacAño] = useState(String(new Date().getFullYear()));
  const [facVista, setFacVista] = useState("mes"); // mes | año
  const [facMoneda, setFacMoneda] = useState("local"); // local | usd
  // Funnel nuevo — vive en ClientView donde tiene acceso a client.id
  const [funnelNuevo, setFunnelNuevo] = useState(null);
  const [funnelMes, setFunnelMes] = useState(String(new Date().getMonth()+1));
  const [funnelAño, setFunnelAño] = useState(String(new Date().getFullYear()));
  const [funnelLoading, setFunnelLoading] = useState(false);
  const [recordatorios, setRecordatorios] = useState([]);
  const [recordatoriosProximos, setRecordatoriosProximos] = useState([]);
  const [categoriasRec, setCategoriasRec] = useState([]);
  const [recBuscar, setRecBuscar] = useState("");
  const [recFiltroCategoria, setRecFiltroCategoria] = useState("");
  const [showNuevoRec, setShowNuevoRec] = useState(false);
  const [formRec, setFormRec] = useState({ titulo:"", descripcion:"", fecha_recordatorio:"", tipo:"manual", paciente_id:"", categoria:"", categoria_personalizada:"" });
  const [savingRec, setSavingRec] = useState(false);
  const [newCatRec, setNewCatRec] = useState({ nombre:"", color:"#8b5cf6" });
  const [savingCatRec, setSavingCatRec] = useState(false);
  const [showNuevoTurno, setShowNuevoTurno] = useState(false);
  const [showEditTurno, setShowEditTurno] = useState(false);
  const [editTurnoData, setEditTurnoData] = useState(null);
  const [savingEditTurno, setSavingEditTurno] = useState(false);
  const [errEditTurno, setErrEditTurno] = useState(null);
  const FORM_TURNO_INIT = { tratamiento_id:"", tratamiento_libre:"", profesional_id:"", fecha:"", hora_inicio:"", hora_fin:"", monto:"", moneda:"", forma_pago:(campos?.metodos_pago||"efectivo").split(",")[0]||"efectivo", cuotas:1, estado_pago:"pendiente", notas_pago:"", tipo_turno:"tratamiento", tipo_consulta:"paga" };
  const FORM_PAC_INIT = { nombre:"", telefono:"", documento:"", email:"", notas:"", notas:"", fecha_nacimiento:"" };
  const [formTurno, setFormTurno] = useState(FORM_TURNO_INIT);
  const [savingTurno, setSavingTurno] = useState(false);
  const [errTurno, setErrTurno] = useState(null);
  const [turnoStep, setTurnoStep] = useState("buscar"); // buscar | nuevo_pac | turno
  const [turnoSearch, setTurnoSearch] = useState("");
  const [turnoSearchRes, setTurnoSearchRes] = useState([]);
  const [turnoPaciente, setTurnoPaciente] = useState(null);
  const [formNuevoPac, setFormNuevoPac] = useState(FORM_PAC_INIT);
  const [savingNuevoPac, setSavingNuevoPac] = useState(false);

  useEffect(() => {
    if (!client?.id) return;
    const go = () => fetch(`${API}/api/calendar/status?cliente_id=${client.id}`).then(r=>r.json()).then(setCalStatus).catch(()=>{});
    go();
    const iv = setInterval(go, 5000);
    return () => clearInterval(iv);
  }, [client?.id]);

  // Polling solicitudes pendientes cada 15s
  useEffect(() => {
    if (!client?.id) return;
    const check = async () => {
      try {
        const r = await fetch(`${API}/api/solicitudes-turno?cliente_id=${client.id}`, { headers:aH() });
        if (!r.ok) return;
        const data = await r.json();
        setSolicitudes(data);
        const pendientes = data.filter(s => s.estado === 'pendiente').length;
        setSolicitudesPendientes(pendientes);
        if (pendientes > prevSolicitudesPendientes.current) {
          try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator(); const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
            osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.4);
          } catch(e) {}
          document.title = `(${pendientes}) CRM Skyward`;
        } else if (pendientes === 0) {
          document.title = "CRM Skyward";
        }
        prevSolicitudesPendientes.current = pendientes;
      } catch(e) {}
    };
    check();
    const iv = setInterval(check, 15000);
    return () => clearInterval(iv);
  }, [client?.id]);

  useEffect(() => {
    if (!client?.id) return;
    fetch(`${API}/api/tratamientos?cliente_id=${client.id}`, { headers:aH() }).then(r=>r.json()).then(setTratamientos).catch(()=>{});
    fetch(`${API}/api/profesionales?cliente_id=${client.id}`, { headers:aH() }).then(r=>r.json()).then(setProfesionales).catch(()=>{});
    if (['admin','dueno'].includes(rango)) fetchUsuarios();
  }, [client?.id]);

  useEffect(() => {
    if (!client?.id) return;
    fetch(`${API}/api/campos-agenda?cliente_id=${client.id}`, { headers: aH() }).then(r=>r.json()).then(setCampos).catch(()=>{});
  }, [client?.id]);

  // Carga inicial - todo de una cuando hay cliente
  useEffect(() => {
    if (!client?.id) return;
    fetchPacientes();
    fetchRecordatorios();
    fetchResultados();
    fetchCategorias();
    fetch(`${API}/api/horarios-clinica?cliente_id=${client.id}`, { headers:aH() }).then(r=>r.json()).then(setHorariosClinica).catch(()=>{});
    fetch(`${API}/api/solicitudes-turno?cliente_id=${client.id}`, { headers:aH() }).then(r=>r.json()).then(setSolicitudes).catch(()=>{});
    fetch(`${API}/api/bot-config?cliente_id=${client.id}`, { headers:aH() }).then(r=>r.json()).then(setBotConfig).catch(()=>{});
    if (['admin','dueno'].includes(rango)) {
      fetch(`${API}/api/clientes/${client.id}/onboarding-status`, { headers:aH() })
        .then(r=>r.json())
        .then(d => { if (!d.onboarding_completado) setShowOnboarding(true); })
        .catch(()=>{});
    }
    fetch(`${API}/api/bloqueos?cliente_id=${client.id}`, { headers:aH() }).then(r=>r.json()).then(setBloqueos).catch(()=>{});
    // Calendario: mes actual
    const hoy = new Date();
    const desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0];
    const hasta = new Date(hoy.getFullYear(), hoy.getMonth()+1, 0).toISOString().split('T')[0];
    fetchCalTurnos(desde, hasta);
    fetchPlanesPago();
    fetchDashboard();
    // Precargar todas las tabs en background
    const mesActual = String(new Date().getMonth()+1);
    const anioActual = String(new Date().getFullYear());
    fetchFunnelNuevo(mesActual, anioActual);
    fetchFac('mes', mesActual, anioActual);
    fetch(`${API}/api/tratamientos/count?cliente_id=${client.id}`, { headers:aH() }).then(r=>r.json()).then(setTratCount).catch(()=>{});
  }, [client?.id]);

  const fetchDashboard = async () => {
    if (!client?.id) return;
    setLoadingDash(true);
    try {
      const r = await fetch(`${API}/api/dashboard?cliente_id=${client.id}`, { headers:aH() });
      if (r.ok) {
        setDashboard(await r.json());
      } else {
        const err = await r.json().catch(()=>({}));
        console.error('Dashboard error:', r.status, err);
      }
    } catch(e) { console.error('Dashboard fetch error:', e); }
    setLoadingDash(false);
  };

  useEffect(() => {
    if (activeTab === 'recordatorios' && client?.id) fetchCategorias();
  }, [activeTab, client?.id]);

  useEffect(() => {
    if (selPac) fetch(`${API}/api/pacientes/${selPac.id}`, { headers:aH() }).then(r=>r.json()).then(setPacDet).catch(()=>{});
    setPortalLink(null);
  }, [selPac]);

  useEffect(() => {
    if (prospectos?.length) {
      const map = {};
      prospectos.forEach(p => { map[p.id] = p.modo_humano; });
      setModoHumano(map);
    }
  }, [prospectos]);

  const fetchPacientes = async (q="", deuda=filtroDeuda) => {
    if (!client?.id) return;
    const params = `cliente_id=${client.id}${q?"&q="+encodeURIComponent(q):""}${deuda?"&solo_deuda=1":""}`;
    const r = await fetch(`${API}/api/pacientes?${params}`, { headers:aH() });
    if (r.ok) setPacientes(await r.json());
  };

  const crearTratamiento = async () => {
    if (!formTrat.nombre) return;
    setSavingTrat(true);
    const r = await fetch(`${API}/api/tratamientos`, { method:"POST", headers:jH(), body:JSON.stringify({ ...formTrat, cliente_id:client.id }) });
    if (r.ok) {
      const d = await r.json();
      setTratamientos([...tratamientos, d]);
      setShowNewTrat(false); setFormTrat({ nombre:"", duracion_minutos:60, descripcion:"" });
    }
    setSavingTrat(false);
  };

  const eliminarTratamiento = async (id) => {
    await fetch(`${API}/api/tratamientos/${id}`, { method:"DELETE", headers:aH() });
    setTratamientos(tratamientos.filter(t=>t.id!==id));
  };

  const crearProfesional = async () => {
    if (!formProf.nombre) return;
    setSavingProf(true);
    const usedColors = profesionales.map(p => p.color).filter(Boolean);
    const autoColor = formProf.color || PROF_COLORS.find(c => !usedColors.includes(c)) || PROF_COLORS[profesionales.length % PROF_COLORS.length];
    const r = await fetch(`${API}/api/profesionales`, { method:"POST", headers:jH(), body:JSON.stringify({ ...formProf, color: autoColor, cliente_id:client.id }) });
    if (r.ok) {
      const d = await r.json();
      setProfesionales([...profesionales, d]);
      setShowNewProf(false); setFormProf({ nombre:"", rol:"", color:"" });
    }
    setSavingProf(false);
  };

  const eliminarProfesional = async (id) => {
    await fetch(`${API}/api/profesionales/${id}`, { method:"DELETE", headers:aH() });
    setProfesionales(profesionales.filter(p=>p.id!==id));
  };

  const PLANTILLAS_RAPIDAS = [
    { label:"Confirmar turno", texto:"Hola! Te confirmamos tu turno. Cualquier consulta estamos a disposición 😊" },
    { label:"Recordatorio 24hs", texto:"Hola! Te recordamos que mañana tenés turno con nosotros. ¡Te esperamos! 📅" },
    { label:"Pedir datos", texto:"Hola! Para completar tu registro necesitamos tu nombre completo y DNI. ¿Me los pasás?" },
    { label:"Reagendar", texto:"Hola! Necesitamos reagendar tu turno. ¿Cuándo te vendría bien?" },
  ];

  const toggleModoHumano = async (prospectoId, valor) => {
    setModoHumano(prev => ({ ...prev, [prospectoId]: valor }));
    await fetch(`${API}/api/prospectos/${prospectoId}/modo-humano`, {
      method:'PUT', headers:jH(), body:JSON.stringify({ modo_humano: valor })
    }).catch(()=>{});
  };

  const toggleGrabacion = async () => {
    if (grabando) {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
        setGrabando(false);
      }
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus'
                     : MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm'
                     : 'audio/mp4';
      const mr = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mr;
      mr.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        if (audioChunksRef.current.length === 0) return;
        const finalMime = mr.mimeType || mimeType;
        const blob = new Blob(audioChunksRef.current, { type: finalMime });
        // URL local para reproducir en el panel (antes de que llegue la respuesta del server)
        const localObjectUrl = URL.createObjectURL(blob);
        // Mostrar burbuja optimista de inmediato
        const tempId = `temp_audio_${Date.now()}`;
        const msgTemp = { id: tempId, rol:'assistant', contenido:'🎤 Audio (panel)', audio_url: localObjectUrl, creado_en: new Date().toISOString(), status:'sent' };
        if (onAddMensaje) onAddMensaje(msgTemp);
        setEnviandoAudio(true);
        const reader = new FileReader();
        // Enviar como FormData para evitar límite de tamaño de JSON
        try {
          const fd = new FormData();
          fd.append('audio', blob, 'audio.webm');
          fd.append('telefono', selectedProspect?.telefono || '');
          fd.append('cliente_id', client.id);
          const h = aH();
          const r = await fetch(`${API}/api/enviar-audio`, { method:'POST', headers:h, body:fd });
          const data = await r.json();
          if (r.ok) {
            setTimeout(() => {
              if (onRefreshMensajes && selectedProspect?.id) onRefreshMensajes(selectedProspect.id);
            }, 800);
          } else {
            console.error('Error enviando audio:', data.error);
          }
        } catch(e) { console.error('Error enviando audio:', e); }
        setEnviandoAudio(false);
        URL.revokeObjectURL(localObjectUrl);
      };
      mr.start(200);
      setGrabando(true);
    } catch(e) {
      alert('No se pudo acceder al micrófono: ' + e.message);
    }
  };

  const iniciarGrabacion = toggleGrabacion;
  const detenerGrabacion = () => {};

  const enviarMensajeManual = async (telefono, horariosAGuardar = null) => {
    if (!msgManual.trim() || !telefono) return;
    const textoEnviar = msgManual;
    const esRecordatorio = esRecordatorioFlag;
    setMsgManual("");
    setPlantillaRapida("");
    setHorariosParaEnviar([]);
    setEnviandoMsg(true);
    setEsRecordatorioFlag(false);
    const msgTemp = { id: `temp_${Date.now()}`, rol:"assistant", contenido:textoEnviar, creado_en:new Date().toISOString(), status:"sent" };
    if (onAddMensaje) onAddMensaje(msgTemp);
    try {
      const body = { telefono, texto:textoEnviar, cliente_id:client.id };
      if (horariosAGuardar && horariosAGuardar.length > 0) body.horarios_ofrecidos = horariosAGuardar;
      const r = await fetch(`${API}/api/enviar-mensaje`, {
        method:'POST', headers:jH(),
        body:JSON.stringify(body)
      });
      if (r.ok) {
        // Si es recordatorio, guardarlo en la tabla de recordatorios
        if (esRecordatorio && selectedProspect) {
          // Buscar paciente por teléfono
          const pacRes = await fetch(`${API}/api/pacientes?cliente_id=${client.id}&q=${encodeURIComponent(telefono)}`, {headers:aH()}).catch(()=>null);
          const pacs = pacRes ? await pacRes.json().catch(()=>[]) : [];
          const pac = Array.isArray(pacs) ? pacs[0] : null;
          await fetch(`${API}/api/recordatorios`, {
            method:'POST', headers:jH(),
            body: JSON.stringify({
              cliente_id: client.id,
              paciente_id: pac?.id || null,
              tipo: 'manual',
              titulo: `Recordatorio manual — ${selectedProspect.nombre||telefono}`,
              descripcion: textoEnviar,
              fecha_recordatorio: new Date().toISOString().split('T')[0],
              estado: 'enviado',
            })
          }).catch(()=>{});
        }
        if (onRefreshMensajes && selectedProspect?.id) {
          setTimeout(() => onRefreshMensajes(selectedProspect.id), 800);
          setTimeout(() => onRefreshMensajes(selectedProspect.id), 2500);
        }
        if (onRefresh) setTimeout(() => onRefresh(), 1000);
        if (horariosAGuardar && horariosAGuardar.length > 0 && selectedProspect?.id) {
          setYaEnvieHorariosIds(prev => new Set([...prev, selectedProspect.id]));
        }
      }
    } catch(e) {}
    setEnviandoMsg(false);
  };

  const guardarEditProf = async () => {
    if (!formEditProf.nombre) return;
    setSavingEditProf(true);
    try {
      const r = await fetch(`${API}/api/profesionales/${editingProf}`, {
        method:'PUT', headers:jH(),
        body:JSON.stringify({ ...formEditProf, activo:true })
      });
      if (r.ok) {
        const d = await r.json();
        setProfesionales(profesionales.map(p => p.id===editingProf ? d : p));
        setEditingProf(null);
      }
    } catch(e) {}
    setSavingEditProf(false);
  };

  const crearTurno = async (pacId) => {
    if (!formTurno.fecha || !formTurno.hora_inicio) return setErrTurno("Fecha y hora son obligatorios");
    setSavingTurno(true); setErrTurno(null);
    try {
      const trat = tratamientos.find(t=>t.id===parseInt(formTurno.tratamiento_id));
      const prof = profesionales.find(p=>p.id===parseInt(formTurno.profesional_id));
      const tratNombre = trat?.nombre || formTurno.tratamiento_libre || "";
      const r = await fetch(`${API}/api/turnos`, { method:"POST", headers:jH(), body:JSON.stringify({
        cliente_id: client.id,
        paciente_id: pacId,
        tratamiento: tratNombre,
        profesional: prof?.nombre || "",
        fecha: formTurno.fecha,
        hora: formTurno.hora_inicio,
        hora_fin: formTurno.hora_fin,
        monto: parseFloat(formTurno.monto)||0,
        moneda: formTurno.moneda || (campos?.monedas||"ARS").split(",")[0],
        forma_pago: formTurno.forma_pago,
        cuotas: parseInt(formTurno.cuotas)||1,
        estado_pago: formTurno.estado_pago,
        notas_pago: formTurno.notas_pago,
        duracion_minutos: trat?.duracion_minutos||60,
        tipo_turno: formTurno.tipo_turno || trat?.tipo || "tratamiento",
        tipo_consulta: formTurno.tipo_consulta || "paga",
        tratamiento_id: formTurno.tratamiento_id || null,
        prospecto_id: selectedProspect?.id || null,
      })});
      const d = await r.json();
      if (!r.ok) throw new Error(d.error||"Error");
      // cerrar y resetear
      setShowNuevoTurno(false);
      setTurnoStep("buscar"); setTurnoPaciente(null);
      setFormTurno(FORM_TURNO_INIT);
      // Si vino desde el chat — limpiar banner y actualizar etapa del prospecto
      if (selectedProspect) {
        try {
          await fetch(`${API}/api/prospectos/${selectedProspect.id}/limpiar-estado`, {
            method:'POST', headers:jH(),
            body: JSON.stringify({ etapa: 'SEGUIMIENTO_PENDIENTE' })
          });
        } catch(e) {}
        marcarLimpiado(selectedProspect.id);
        setSelectedProspect({
          ...selectedProspect,
          etapa: 'SEGUIMIENTO_PENDIENTE',
          horario_elegido: null,
          horarios_ofrecidos: null,
          listo_para_cierre: false,
          modo_humano: false,
        });
      }
      // refrescar ficha si está abierta
      if (selPac?.id === pacId) {
        const upd = await fetch(`${API}/api/pacientes/${pacId}`, { headers:aH() }).then(r=>r.json());
        setPacDet(upd);
      }
      fetchPacientes();
      // refrescar calendario
      const d2 = new Date(calFecha);
      if (calVista === "mensual") {
        const desde = new Date(d2.getFullYear(), d2.getMonth(), 1).toISOString().split('T')[0];
        const hasta = new Date(d2.getFullYear(), d2.getMonth()+1, 0).toISOString().split('T')[0];
        fetchCalTurnos(desde, hasta);
      } else {
        const dow = d2.getDay();
        const lunes = new Date(d2); lunes.setDate(d2.getDate()-(dow===0?6:dow-1));
        const domingo = new Date(lunes); domingo.setDate(lunes.getDate()+6);
        fetchCalTurnos(lunes.toISOString().split('T')[0], domingo.toISOString().split('T')[0]);
      }
    } catch(e) { setErrTurno(e.message); }
    setSavingTurno(false);
  };

  // ---- IMPORTACIÓN ----
  const FIELD_ALIASES = {
    nombre:      ["nombre","name","paciente","apellido y nombre","apellido","apellido_nombre","nombre completo","full name","cliente"],
    telefono:    ["telefono","teléfono","tel","celular","phone","movil","móvil","whatsapp","cel"],
    email:       ["email","mail","correo","e-mail","correo electronico"],
    fecha_nacimiento: ["fecha_nacimiento","fecha nacimiento","nacimiento","fecha nac","birthday","fec_nac","fnac","f.nac","f nacimiento"],
    notas: ["notas","obra social","os","prepaga","mutual","seguro"],
    notas:       ["notas","nota","observaciones","observacion","comentarios","comentario"],
  };

  const detectarColumna = (headers, field) => {
    const aliases = FIELD_ALIASES[field];
    for (const h of headers) {
      const hn = h.toLowerCase().trim().replace(/[_\-\.]/g," ");
      if (aliases.some(a => hn.includes(a) || a.includes(hn))) return h;
    }
    return "";
  };

  const parsearCSV = (text) => {
    const sep = text.indexOf(";") !== -1 ? ";" : ",";
    const lines = text.split("\n").map(l=>l.replace(/\r/g,"")).filter(l=>l.trim());
    if (lines.length < 2) return [];
    const headers = lines[0].split(sep).map(h=>h.replace(/^["']|["']$/g,"").trim());
    const rows = [];
    for (let i=1; i<lines.length; i++) {
      // Parser simple que respeta comillas
      const vals = [];
      let cur = "", inQ = false;
      for (let c=0; c<lines[i].length; c++) {
        const ch = lines[i][c];
        if (ch==='"' || ch==="'") { inQ=!inQ; }
        else if (ch===sep && !inQ) { vals.push(cur.trim()); cur=""; }
        else cur+=ch;
      }
      vals.push(cur.trim());
      if (vals.every(v=>!v)) continue;
      const row = {};
      headers.forEach((h,j)=>row[h]=vals[j]||"");
      rows.push(row);
    }
    return rows;
  };

  const parsearArchivo = (file) => new Promise((resolve, reject) => {
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext === "csv") {
      const reader = new FileReader();
      reader.onload = e => {
        try { resolve(parsearCSV(e.target.result)); }
        catch(err) { reject(err); }
      };
      reader.onerror = () => reject(new Error("Error leyendo CSV"));
      reader.readAsText(file, "UTF-8");
    } else {
      // Excel con SheetJS desde window (cargado en index.html o disponible en Vite)
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const XLSX = window.XLSX;
          if (!XLSX) throw new Error("SheetJS no disponible - usá CSV por ahora");
          const wb = XLSX.read(new Uint8Array(e.target.result), { type:"array", cellDates:true });
          const ws = wb.Sheets[wb.SheetNames[0]];
          resolve(XLSX.utils.sheet_to_json(ws, { defval:"", raw:false }));
        } catch(err) { reject(err); }
      };
      reader.onerror = () => reject(new Error("Error leyendo Excel"));
      reader.readAsArrayBuffer(file);
    }
  });

  const handleImportFile = async (file) => {
    if (!file) return;
    setImportFile(file);
    setImportResult(null);
    try {
      const rows = await parsearArchivo(file);
      if (rows.length === 0) return;
      setImportRows(rows);
      const headers = Object.keys(rows[0]);
      const cols = {};
      for (const field of Object.keys(FIELD_ALIASES)) {
        cols[field] = detectarColumna(headers, field);
      }
      setImportCols(cols);
      setImportPreview(rows.slice(0,5));
      setImportStep("mapear");
    } catch(e) { console.error(e); alert("Error leyendo archivo: " + e.message); }
  };

  const ejecutarImportacion = async () => {
    setImportando(true);
    setImportProgress(10);
    setImportResult(null);

    // Mapear todas las filas de una vez en el cliente
    const lista = importRows.map(row => ({
      nombre:           (row[importCols.nombre]||"").trim(),
      telefono:         (row[importCols.telefono]||"").trim(),
      email:            (row[importCols.email]||"").trim(),
      fecha_nacimiento: (() => {
        const v = (row[importCols.fecha_nacimiento]||"").toString().trim();
        if (!v) return null;
        const partes = v.split(/[\/\-]/);
        if (partes.length === 3) {
          if (partes[0].length === 4) return `${partes[0]}-${partes[1].padStart(2,"0")}-${partes[2].padStart(2,"0")}`;
          return `${partes[2]}-${partes[1].padStart(2,"0")}-${partes[0].padStart(2,"0")}`;
        }
        return null;
      })(),
      notas: (row[importCols.notas]||"").trim(),
      notas:       (row[importCols.notas]||"").trim(),
    }));

    setImportProgress(30);

    // Mandar todo al backend de una sola vez - el backend maneja los lotes internamente
    try {
      const r = await fetch(`${API}/api/pacientes/importar`, {
        method:"POST", headers:jH(),
        body: JSON.stringify({ cliente_id: client.id, pacientes: lista })
      });
      setImportProgress(90);
      if (r.ok) {
        const d = await r.json();
        setImportResult({ ...d, total: lista.length });
        setImportStep("resultado");
        fetchPacientes();
      } else {
        const e = await r.json();
        alert("Error: " + (e.error||"desconocido"));
      }
    } catch(e) {
      alert("Error de conexión: " + e.message);
    }
    setImportProgress(100);
    setImportando(false);
  };

  const fetchPlanesPago = async (pacId=null) => {
    if (!client?.id) return;
    let url = `${API}/api/planes-pago?cliente_id=${client.id}`;
    if (pacId) url += `&paciente_id=${pacId}`;
    const r = await fetch(url, { headers:aH() });
    if (r.ok) setPlanesP(await r.json());
  };

  const abrirPago = (paciente, plan=null) => {
    setPagoCtx({ paciente, plan });
    setFormPago({
      monto: plan ? (parseFloat(plan.monto_por_sesion)||"").toString() : "",
      moneda: plan?.moneda || campos?.monedas?.split(",")[0] || "ARS",
      forma_pago: plan?.forma_pago || "efectivo",
      concepto: plan?.tratamiento || "",
      nota: "",
    });
    setShowPago(true);
  };

  const confirmarPago = async () => {
    if (!pagoCtx?.paciente?.id || !formPago.monto) return;
    setSavingPago(true);
    try {
      if (pagoCtx.plan) {
        // Pagar cuota de plan existente
        await fetch(`${API}/api/planes-pago/${pagoCtx.plan.id}/pagar`, {
          method:"PUT", headers:jH(),
          body:JSON.stringify({ monto_adicional: formPago.monto, forma_pago: formPago.forma_pago, nota: formPago.nota })
        });
      } else {
        // Pago suelto → crear plan de pago pagado al 100% para que aparezca en la ficha
        const montoNum = parseFloat(formPago.monto) || 0;
        await fetch(`${API}/api/planes-pago`, {
          method:"POST", headers:jH(),
          body:JSON.stringify({
            cliente_id: client.id,
            paciente_id: pagoCtx.paciente.id,
            tratamiento: formPago.concepto || "Pago manual",
            monto_total: montoNum,
            monto_pagado: montoNum,
            moneda: formPago.moneda,
            forma_pago: formPago.forma_pago,
            total_sesiones: 1,
            sesiones_pagas: 1,
            estado: "pagado",
            notas_pago: formPago.nota || "",
          })
        });
      }
      setShowPago(false);
      fetchPlanesPago();
    } finally { setSavingPago(false); }
  };

  const fetchResultados = async (q="", trat="", pacId=null) => {
    if (!client?.id) return;
    setResLoading(true);
    let url = `${API}/api/resultados?cliente_id=${client.id}`;
    if (q) url += `&q=${encodeURIComponent(q)}`;
    if (trat) url += `&tratamiento=${encodeURIComponent(trat)}`;
    if (pacId) url += `&paciente_id=${pacId}`;
    const r = await fetch(url, { headers:aH() });
    if (r.ok) setResultados(await r.json());
    setResLoading(false);
  };



  const uploadToCloudinary = async (file) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("upload_preset", CLOUDINARY_PRESET);
    const r = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, { method:"POST", body:fd });
    const d = await r.json();
    if (!r.ok || d.error) throw new Error(d.error?.message || "Error subiendo imagen a Cloudinary");
    return d.secure_url;
  };

  const guardarResultado = async () => {
    if (!fotoAntes && !fotoDespues) return;
    setSavingRes(true);
    try {
      let urlAntes = fotoAntesURL, urlDespues = fotoDespuesURL;
      if (fotoAntes) { setUploadProgress("Subiendo foto antes..."); urlAntes = await uploadToCloudinary(fotoAntes); }
      if (fotoDespues) { setUploadProgress("Subiendo foto después..."); urlDespues = await uploadToCloudinary(fotoDespues); }
      setUploadProgress("Guardando...");
      const trat = tratamientos.find(t=>t.id===parseInt(formRes.tratamiento_id));
      const tratNombre = trat?.nombre || formRes.tratamiento_libre || "";
      const pacId = resContextPac?.id || formRes.paciente_id;
      await fetch(`${API}/api/resultados`, { method:"POST", headers:jH(), body:JSON.stringify({
        cliente_id: client.id,
        paciente_id: pacId||null,
        tratamiento: tratNombre,
        fecha: formRes.fecha || new Date().toISOString().split('T')[0],
        foto_antes: urlAntes,
        foto_despues: urlDespues,
        nota: formRes.nota,
        subido_por: user?.nombre||user?.email||rango||"",
      })});
      setShowNuevoRes(false);
      setFotoAntes(null); setFotoDespues(null);
      setFotoAntesURL(""); setFotoDespuesURL("");
      setFormRes({ paciente_id:"", tratamiento_id:"", tratamiento_libre:"", fecha:"", nota:"" });
      setResContextPac(null);
      setUploadProgress("");
      fetchResultados(resQ, resFiltroTrat);
      // refrescar ficha si corresponde
      if (selPac?.id) {
        const upd = await fetch(`${API}/api/pacientes/${selPac.id}`, { headers:aH() }).then(r=>r.json());
        setPacDet(upd);
      }
    } catch(e) {
      console.error(e);
      setUploadProgress("❌ Error: " + e.message);
      setSavingRes(false);
      return;
    }
    setSavingRes(false);
  };

  const fetchCalTurnos = async (desde, hasta) => {
    if (!client?.id) return;
    setCalLoading(true);
    const r = await fetch(`${API}/api/turnos?cliente_id=${client.id}&desde=${desde}&hasta=${hasta}`, { headers:aH() });
    if (r.ok) setCalTurnos(await r.json());
    setCalLoading(false);
  };

  useEffect(() => {
    if (!client?.id) return;
    const d = new Date(calFecha);
    if (calVista === "mensual") {
      const desde = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
      const hasta = new Date(d.getFullYear(), d.getMonth()+1, 0).toISOString().split('T')[0];
      fetchCalTurnos(desde, hasta);
    } else if (calVista === "semanal") {
      const dow = d.getDay();
      const lunes = new Date(d); lunes.setDate(d.getDate()-(dow===0?6:dow-1));
      const domingo = new Date(lunes); domingo.setDate(lunes.getDate()+6);
      fetchCalTurnos(lunes.toISOString().split('T')[0], domingo.toISOString().split('T')[0]);
    } else {
      const dStr = d.toISOString().split('T')[0];
      fetchCalTurnos(dStr, dStr);
    }
  }, [client?.id, calVista, calFecha]);

  const fetchPagos = async (desde, hasta) => {
    if (!client?.id) return;
    let url = `${API}/api/pagos?cliente_id=${client.id}`;
    if (desde) url += `&desde=${desde}`;
    if (hasta) url += `&hasta=${hasta}`;
    const r = await fetch(url, { headers:aH() });
    if (r.ok) setFacPagos(await r.json());
  };

  const fetchFunnelNuevo = async (mes, año) => {
    if (!client?.id) return;
    setFunnelLoading(true);
    try {
      const url = `${API}/api/funnel?cliente_id=${client.id}&mes=${mes}&anio=${año}`;
      console.log('[fetchFunnelNuevo] fetching:', url);
      const r = await fetch(url, { headers:aH() });
      console.log('[fetchFunnelNuevo] status:', r.status);
      const d = await r.json();
      console.log('[fetchFunnelNuevo] response:', JSON.stringify(d).substring(0, 200));
      if (r.ok && d && d.etapas && d.conversiones) {
        setFunnelNuevo(d);
      } else {
        console.error('[fetchFunnelNuevo] bad structure:', d);
        setFunnelNuevo(null);
      }
    } catch(e) { console.error('[fetchFunnelNuevo] error:', e); }
    setFunnelLoading(false);
  };

  const fetchFac = async (vista, mes, año) => {
    if (!client?.id) return;
    setFacLoading(true);
    const params = new URLSearchParams({ cliente_id: client.id, año });
    if (vista === "mes") params.set("mes", mes);
    const r = await fetch(`${API}/api/facturacion?${params}`, { headers:aH() });
    if (r.ok) {
      const d = await r.json();
      setFacData(d);
      if (d.pagos) setFacPagos(d.pagos);
    }
    setFacLoading(false);
  };

  const fetchCategorias = async () => {
    if (!client?.id) return;
    try {
      const r = await fetch(`${API}/api/categorias-recordatorio?cliente_id=${client.id}`, { headers:aH() });
      if (r.ok) setCategoriasRec(await r.json());
    } catch(e) {}
  };

  const fetchRecordatorios = async (buscar="", categoria="") => {
    if (!client?.id) return;
    let url = `${API}/api/recordatorios?cliente_id=${client.id}`;
    if (buscar) url += `&buscar=${encodeURIComponent(buscar)}`;
    if (categoria) url += `&categoria=${encodeURIComponent(categoria)}`;
    const r = await fetch(url, { headers:aH() });
    if (r.ok) setRecordatorios(await r.json());
    // También cargar próximos automáticos
    const rp = await fetch(`${API}/api/recordatorios/proximos?cliente_id=${client.id}`, { headers:aH() }).catch(()=>null);
    if (rp?.ok) setRecordatoriosProximos(await rp.json());
  };

  const crearRecordatorio = async () => {
    if (!formRec.titulo || !formRec.fecha_recordatorio) return;
    setSavingRec(true);
    const catFinal = formRec.categoria === "__custom__" ? formRec.categoria_personalizada : formRec.categoria;
    const r = await fetch(`${API}/api/recordatorios`, { method:"POST", headers:jH(), body:JSON.stringify({ ...formRec, categoria:catFinal, cliente_id:client.id, paciente_id:formRec.paciente_id||null }) });
    if (r.ok) { setShowNuevoRec(false); setFormRec({ titulo:"", descripcion:"", fecha_recordatorio:"", tipo:"manual", paciente_id:"", categoria:"", categoria_personalizada:"" }); fetchRecordatorios(recBuscar, recFiltroCategoria); }
    setSavingRec(false);
  };

  const crearCategoriaRec = async () => {
    if (!newCatRec.nombre) return;
    setSavingCatRec(true);
    const r = await fetch(`${API}/api/categorias-recordatorio`, { method:"POST", headers:jH(), body:JSON.stringify({ ...newCatRec, cliente_id:client.id }) });
    if (r.ok) { const d = await r.json(); setCategoriasRec([...categoriasRec, d]); setNewCatRec({ nombre:"", color:"#8b5cf6" }); }
    setSavingCatRec(false);
  };

  const eliminarCategoriaRec = async (id) => {
    await fetch(`${API}/api/categorias-recordatorio/${id}`, { method:"DELETE", headers:aH() });
    setCategoriasRec(categoriasRec.filter(c=>c.id!==id));
  };

  const cambiarEstadoRec = async (id, estado) => {
    await fetch(`${API}/api/recordatorios/${id}`, { method:"PUT", headers:jH(), body:JSON.stringify({ estado }) });
    setRecordatorios(recordatorios.map(r => r.id===id ? {...r,estado} : r));
  };

  const eliminarRec = async (id) => {
    await fetch(`${API}/api/recordatorios/${id}`, { method:"DELETE", headers:aH() });
    setRecordatorios(recordatorios.filter(r=>r.id!==id));
  };

  const abrirNuevoTurnoFecha = (fechaStr, horaStr) => {
    setTurnoStep("buscar");
    setTurnoPaciente(null);
    setTurnoSearch("");
    setTurnoSearchRes([]);
    setFormTurno({...FORM_TURNO_INIT, fecha: fechaStr, hora_inicio: horaStr||""});
    setShowNuevoTurno(true);
  };

  const abrirEditTurno = (turno) => {
    // Buscar monto_pagado del plan de pago existente para este paciente/tratamiento
    const planExistente = planesP.find(p =>
      p.paciente_id === (turno.paciente_id || selPac?.id) &&
      p.tratamiento === turno.tratamiento &&
      p.estado !== 'pagado'
    );
    setEditTurnoData({
      id: turno.id,
      paciente_id: turno.paciente_id,
      paciente_nombre: turno.paciente_nombre,
      tratamiento: turno.tratamiento||"",
      profesional: turno.profesional||"",
      fecha: turno.fecha?.toString().slice(0,10)||"",
      hora_inicio: turno.hora?.toString().slice(0,5)||"",
      hora_fin: turno.hora_fin?.toString().slice(0,5)||"",
      monto: turno.monto||"",
      monto_pagado: planExistente ? planExistente.monto_pagado : "",
      moneda: turno.moneda||"",
      forma_pago: turno.forma_pago||"efectivo",
      cuotas: planExistente ? planExistente.total_sesiones : (turno.cuotas||1),
      estado_pago: turno.estado_pago||"pendiente",
      estado_turno: turno.estado_turno||"pendiente",
      notas_pago: turno.notas_pago||"",
      google_event_id: turno.google_event_id||"",
      historial_cambios: turno.historial_cambios||[],
    });
    setShowEditTurno(true);
    setErrEditTurno(null);
  };

  const guardarEditTurno = async () => {
    if (!editTurnoData) return;
    setSavingEditTurno(true); setErrEditTurno(null);
    try {
      const r = await fetch(`${API}/api/turnos/${editTurnoData.id}`, { method:"PUT", headers:jH(), body:JSON.stringify({
        tratamiento: editTurnoData.tratamiento,
        profesional: editTurnoData.profesional,
        fecha: editTurnoData.fecha,
        hora: editTurnoData.hora_inicio,
        hora_fin: editTurnoData.hora_fin,
        monto: editTurnoData.monto,
        monto_pagado: editTurnoData.monto_pagado,
        moneda: editTurnoData.moneda,
        forma_pago: editTurnoData.forma_pago,
        cuotas: editTurnoData.cuotas,
        estado_pago: editTurnoData.estado_pago,
        estado_turno: editTurnoData.estado_turno,
        notas_pago: editTurnoData.notas_pago,
        cliente_id: client.id,
        paciente_id: editTurnoData.paciente_id || selPac?.id,
        paciente_nombre: editTurnoData.paciente_nombre || selPac?.nombre,
      })});
      const d = await r.json();
      if (!r.ok) throw new Error(d.error||"Error al guardar");
      setShowEditTurno(false);
      fetchPlanesPago();
      fetchRecordatorios();
      // Refrescar ficha
      const pacId = editTurnoData.paciente_id || selPac?.id;
      if (pacId) {
        const upd = await fetch(`${API}/api/pacientes/${pacId}`, { headers:aH() }).then(r=>r.json());
        setPacDet(upd);
      }
    } catch(e) { setErrEditTurno(e.message); }
    setSavingEditTurno(false);
  };

  const guardarCampos = async () => {
    if (!campos || !client?.id) return;
    setCamposSaving(true);
    try { await fetch(`${API}/api/campos-agenda`, { method:"PUT", headers:jH(), body:JSON.stringify({ cliente_id:client.id, ...campos }) }); }
    catch(e) { console.error(e); }
    setCamposSaving(false);
  };

  const conectarCalendar = () => {
    const url = `${API}/auth/google?cliente_id=${client.id}&token=${tok()}`;
    window.open(url, "_blank", "width=600,height=700");
    const iv = setInterval(() => {
      fetch(`${API}/api/calendar/status?cliente_id=${client.id}`).then(r=>r.json()).then(d => { if (d.conectado) { setCalStatus(d); clearInterval(iv); } });
    }, 3000);
    setTimeout(() => clearInterval(iv), 60000);
  };

  const buscarPacientesModal = async (q) => {
    setTurnoSearch(q);
    if (!q || q.length < 2) return setTurnoSearchRes([]);
    const r = await fetch(`${API}/api/pacientes?cliente_id=${client.id}&q=${encodeURIComponent(q)}`, { headers:aH() });
    if (r.ok) setTurnoSearchRes(await r.json());
  };

  const seleccionarPacienteTurno = (p) => {
    setTurnoPaciente(p);
    setTurnoStep("turno");
    setTurnoSearch("");
    setTurnoSearchRes([]);
  };

  const crearNuevoPacYSeguir = async () => {
    if (!formNuevoPac.nombre) return;
    setSavingNuevoPac(true);
    try {
      const r = await fetch(`${API}/api/pacientes`, { method:"POST", headers:jH(), body:JSON.stringify({ ...formNuevoPac, cliente_id:client.id }) });
      if (!r.ok) throw new Error("Error");
      const pac = await r.json();
      setTurnoPaciente(pac);
      setFormNuevoPac({ nombre:"", telefono:"", documento:"", email:"", notas:"", notas:"" });
      setTurnoStep("turno");
      fetchPacientes();
    } catch(e) { console.error(e); }
    setSavingNuevoPac(false);
  };

  const funnelMap = {};
  (funnelData||[]).forEach(f => { funnelMap[f.etapa] = parseInt(f.count); });

  const isMobile = useIsMobile();

  return (
    <>
    {/* Banner solicitudes pendientes — fuera del overflow:hidden */}
    {solicitudesPendientes > 0 && (
      <div className="slide-down" onClick={()=>{
        if (activeTab !== "conversations") setActiveTab("conversations");
        const pendiente = (prospectos||[]).find(p => p.etapa === 'PENDIENTE_CONFIRMACION');
        if (pendiente) setTimeout(()=>setSelectedProspect(pendiente), 100);
      }}
        style={{background:"linear-gradient(90deg,rgba(249,115,22,0.95),rgba(239,68,68,0.9))",
          padding:"8px 16px",display:"flex",alignItems:"center",gap:10,cursor:"pointer",
          boxShadow:"0 2px 12px rgba(249,115,22,0.4)",flexShrink:0,zIndex:500}}>
        <div style={{width:8,height:8,borderRadius:"50%",background:"white",animation:"pulse 1.5s infinite",flexShrink:0}}/>
        <span style={{fontSize:12,fontWeight:700,color:"white",flex:1}}>
          🔔 {solicitudesPendientes} solicitud{solicitudesPendientes>1?"es":""} de turno esperando confirmación
        </span>
        <span style={{fontSize:11,color:"white",fontWeight:600}}>Ver →</span>
      </div>
    )}
    <div style={{flex:1,display:"flex",overflow:"hidden"}}>
      {/* Modal Consentimiento */}
      {consentimientoModal && (
        <EnviarConsentimientoModal
          client={client}
          paciente={consentimientoModal.paciente}
          turno_id={consentimientoModal.turno_id}
          onClose={()=>setConsentimientoModal(null)}
        />
      )}

      {/* Ficha Clínica Modal */}
      {fichaModal && (
        <FichaClinicaModal
          client={client}
          turno={fichaModal.turno}
          paciente={fichaModal.paciente}
          onClose={() => setFichaModal(null)}
          onSaved={() => {
            setFichasCache(prev => ({ ...prev, [fichaModal.turno?.id]: true }));
          }}
        />
      )}

      {/* Onboarding Wizard */}
      {showOnboarding && (
        <OnboardingWizard
          client={client}
          calStatus={calStatus}
          plan={plan}
          onComplete={() => { setShowOnboarding(false); onRefresh(); }}
          onSkip={() => {
            fetch(`${API}/api/clientes/${client.id}/onboarding`, { method:'PUT', headers:jH(), body:JSON.stringify({ completado:true }) }).catch(()=>{});
            setShowOnboarding(false);
          }}
        />
      )}

      {/* Nav Sidebar */}
      {(() => {
        const navItems = [
          {key:"inicio",     icon:<><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg></>, label:"Inicio",       rangos:["admin","dueno"],         planes:["base","plus","pro"]},
          {key:"doctor",     icon:<><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg></>, label:"Doctor",       rangos:["admin","dueno","staff","profesional"], planes:["base","plus","pro"]},
          {key:"calendario", icon:<><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></>, label:"Agenda",       rangos:["admin","dueno","staff","profesional"], planes:["base","plus","pro"]},
          {key:"conversations",icon:<><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg></>,label:"Conversación",rangos:["admin","dueno","staff"], planes:["base","plus","pro"], badge: solicitudesPendientes + (prospectos||[]).filter(p=>p.insistencia_notificada&&p.modo_humano).length + (prospectos||[]).filter(p=>p.listo_para_cierre&&!p.horario_elegido).length, badgeUrgente: (prospectos||[]).filter(p=>p.listo_para_cierre&&!p.horario_elegido).length > 0},
          {key:"prospectos",  icon:<><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg></>, label:"Clientes",    rangos:["admin","dueno","staff","profesional"], planes:["base","plus","pro"]},
          {key:"recordatorios",icon:<><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg></>,label:"Recordatorios",rangos:["admin","dueno","staff"],planes:["base","plus","pro"]},
          {key:"honorarios",  icon:<><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg></>, label:"Honorarios",    rangos:["admin","dueno","staff","profesional"],  planes:["base","plus","pro"], badge: notificaciones.filter(n=>n.referencia_tipo==='propuesta').length},
          {key:"honorarios_dash", icon:<><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="20" x2="12" y2="10"/><path d="M18 20V4"/><path d="M6 20v-4"/><circle cx="12" cy="6" r="2"/></svg></>, label:"Balance", rangos:["admin","dueno","staff"], planes:["base","plus","pro"]},
          {key:"tracker",    icon:<><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/><circle cx="11" cy="11" r="3"/></svg></>, label:"Tracker",  rangos:["admin","dueno","staff"], planes:["base","plus","pro"]},
          {key:"funnel",      icon:<><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg></>, label:"Etapas",        rangos:["admin","dueno"],          planes:["base","plus","pro"]},
          {key:"facturacion",icon:<><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg></>, label:"Facturación",  rangos:["admin","dueno"],         planes:["base","plus","pro"]},
          {key:"config",     icon:<><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg></>, label:"Config",       rangos:["admin","dueno"],         planes:["base","plus","pro"]},
        ].filter(t=>(user?.rol==='admin' || t.rangos.includes(rango||"dueno")) && t.planes.includes(plan||"pro"));
        return (
          <div style={isMobile ? {
            position:"fixed",bottom:0,left:0,right:0,height:60,background:C.surface,
            borderTop:`1px solid ${C.border}`,display:"flex",flexDirection:"row",
            zIndex:100,padding:"0 4px",
            // Ocultar cuando hay chat abierto en mobile para no tapar el input
            transform:(activeTab==="conversations" && selectedProspect)?"translateY(100%)":"translateY(0)",
            transition:"transform .2s ease"
          } : {width:52,background:C.bg,borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column",flexShrink:0,zIndex:10}}>
            {/* Logo / cliente */}
            {!isMobile && <div style={{height:56,display:"flex",alignItems:"center",justifyContent:"center",borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
              <div title={client?.nombre} style={{width:34,height:34,borderRadius:2,background:C.accentGlow,border:`1px solid ${C.accent}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,color:C.accent,cursor:"default",userSelect:"none",overflow:"hidden"}}>
                {client?.logo_url ? <img src={client.logo_url} style={{width:"100%",height:"100%",objectFit:"contain",borderRadius:"inherit"}} alt="Logo"/> : (client?.nombre||"?")[0].toUpperCase()}
              </div>
            </div>}
            {/* Items */}
            <div style={isMobile ? {display:"flex",flex:1,alignItems:"center",overflowX:"auto"} : {flex:1,overflowY:"auto",padding:"8px 0"}}>
              {navItems.map(item=>{
                const active = activeTab===item.key;
                return (
                  <div key={item.key} onClick={()=>setActiveTab(item.key)} title={item.label}
                    onMouseEnter={e=>{if(!active){const s=e.currentTarget.querySelectorAll('span');if(s[0])s[0].style.color=C.text;if(s[1])s[1].style.color=C.text;}}}
                    onMouseLeave={e=>{if(!active){const s=e.currentTarget.querySelectorAll('span');if(s[0])s[0].style.color=C.muted;if(s[1])s[1].style.color=C.muted;}}}
                    style={isMobile ? {
                      flex:"0 0 auto",minWidth:60,height:56,display:"flex",flexDirection:"column",
                      alignItems:"center",justifyContent:"center",gap:2,cursor:"pointer",position:"relative",
                      background:active?C.accentGlow:"transparent",
                      borderTop:active?`2px solid ${C.accent}`:"2px solid transparent",
                      padding:"0 6px",transition:"all .15s"
                    } : {
                      width:"100%",minHeight:52,display:"flex",flexDirection:"column",alignItems:"center",
                      justifyContent:"center",gap:3,cursor:"pointer",position:"relative",
                      padding:"6px 4px",
                      background:"transparent",
                      boxShadow:active?`inset 2px 0 0 ${C.accent}`:"none",
                      transition:"all .15s"
                    }}>
                    <span style={{color:active?C.accentWarm:C.muted,lineHeight:1,position:"relative",display:"inline-flex",alignItems:"center",justifyContent:"center",transition:"color .15s"}}>
                      {item.icon}
                      {item.badge > 0 && (
                        <div className={item.badgeUrgente?"pulso-naranja":""} style={{position:"absolute",top:-5,right:-7,background:item.badgeUrgente?"#f97316":"#ef4444",borderRadius:"50%",width:15,height:15,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:700,color:"white"}}>
                          {item.badge > 9 ? "9+" : item.badge}
                        </div>
                      )}
                    </span>
                    <span style={{fontSize:9,color:active?C.accentWarm:C.muted,fontWeight:active?600:400,letterSpacing:".3px",textAlign:"center",lineHeight:1.2,maxWidth:52,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",padding:"0 2px"}}>
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </div>
            {/* Refresh + wizard + logout */}
            {!isMobile && <div style={{borderTop:`1px solid ${C.border}`,padding:"8px 0"}}>
              {['admin','dueno'].includes(rango) && (
                <div onClick={()=>setShowOnboarding(true)} title="Asistente de configuración"
                  style={{height:40,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:C.muted,fontSize:16,transition:"color .15s"}}
                  onMouseEnter={e=>e.currentTarget.style.color=C.text} onMouseLeave={e=>e.currentTarget.style.color=C.muted}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
              </div>
              )}
              <div onClick={onRefresh} title="Actualizar"
                style={{height:44,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:C.muted,fontSize:16,transition:"color .15s"}}
                onMouseEnter={e=>e.currentTarget.style.color=C.text} onMouseLeave={e=>e.currentTarget.style.color=C.muted}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
              </div>
              <div onClick={()=>{const next=localStorage.getItem('skyward_theme')==='light'?'dark':'light';localStorage.setItem('skyward_theme',next);window.location.reload();}} title={localStorage.getItem('skyward_theme')==='light'?"Modo oscuro":"Modo claro"}
                style={{height:44,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:C.muted,fontSize:16,transition:"color .15s"}}
                onMouseEnter={e=>e.currentTarget.style.color=C.text} onMouseLeave={e=>e.currentTarget.style.color=C.muted}>
                {localStorage.getItem('skyward_theme')==='light'
                  ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                  : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                }
              </div>
            </div>}
          </div>
        );
      })()}

      {/* Main - en mobile+chat el input queda sobre el bottom nav, no se necesita padding */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",paddingBottom:(isMobile && activeTab==="conversations" && selectedProspect)?0:isMobile?"60px":0}}>

        {/* Conversación */}
        {activeTab === "conversations" && (
          <div style={{flex:1,display:"flex",overflow:"hidden",position:"relative"}}>

            {/* Sidebar prospectos */}
            {["plus","pro"].includes(plan) && (!isMobile || !selectedProspect) && (
              <div style={isMobile
                ? {position:"absolute",inset:0,background:C.bg,zIndex:10,display:"flex",flexDirection:"column",overflow:"hidden"}
                : {width: selectedProspect ? 260 : "100%", background:C.surface, borderRight:`1px solid ${C.border}`, display:"flex", flexDirection:"column", flexShrink:0, transition:"width .2s ease"}}>

                {/* Header con búsqueda */}
                <div style={{padding:"10px 12px",borderBottom:`1px solid ${C.border}`,display:"flex",flexDirection:"column",gap:8,flexShrink:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div style={{flex:1,position:"relative"}}>
                      <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:C.muted,fontSize:13,pointerEvents:"none"}}>🔍</span>
                      <input value={busquedaProspectos} onChange={e=>setBusquedaProspectos(e.target.value)}
                        placeholder="Buscar por nombre o teléfono..."
                        style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"7px 10px 7px 30px",color:C.text,fontSize:12,fontFamily:"inherit",boxSizing:"border-box"}}/>
                      {busquedaProspectos && (
                        <button onClick={()=>setBusquedaProspectos('')}
                          style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"transparent",border:"none",color:C.muted,cursor:"pointer",fontSize:14,lineHeight:1,padding:0}}>×</button>
                      )}
                    </div>
                    <button onClick={()=>setShowFiltros(f=>!f)}
                      style={{padding:"7px 10px",borderRadius:2,border:`1px solid ${(showFiltros||filtroEtapa||filtroTratamientoChat||filtroNoShow||filtroInactivos)?C.accent:C.border}`,background:(showFiltros||filtroEtapa||filtroTratamientoChat||filtroNoShow||filtroInactivos)?C.accentGlow:"transparent",color:(showFiltros||filtroEtapa||filtroTratamientoChat||filtroNoShow||filtroInactivos)?C.accentLight:C.muted,fontSize:11,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>
                      ⚙{(filtroEtapa||filtroTratamientoChat||filtroNoShow||filtroInactivos)?" ●":""}
                    </button>
                  </div>

                  {/* Filtros rápidos */}
                  <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:2}}>
                    {[
                      {id:'todos', label:'Todos'},
                      {id:'horario', label:'⏳ Con horario'},
                      {id:'agendados', label:'✅ Agendados'},
                      {id:'cancelaciones', label:'❌ Cancelaciones'},
                      {id:'reagendas', label:'🔄 Reagendas'},
                    ].map(f=>(
                      <button key={f.id} onClick={()=>setFiltroRapido(f.id)}
                        style={{padding:"4px 10px",borderRadius:2,border:`1px solid ${filtroRapido===f.id?C.accent:C.border}`,background:filtroRapido===f.id?C.accentGlow:"transparent",color:filtroRapido===f.id?C.accentLight:C.muted,fontSize:11,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0,transition:"all .15s"}}>
                        {f.label}
                      </button>
                    ))}
                  </div>
                  {showFiltros && (
                    <div style={{display:"flex",flexDirection:"column",gap:8,paddingTop:4}}>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                        <select value={filtroEtapa} onChange={e=>setFiltroEtapa(e.target.value)}
                          style={{background:C.bg,border:`1px solid ${filtroEtapa?C.accent:C.border}`,borderRadius:4,padding:"5px 8px",color:filtroEtapa?C.accentLight:C.muted,fontSize:11,fontFamily:"inherit"}}>
                          <option value="">Todas las etapas</option>
                          {Object.entries(STAGES).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                          <option value="PACIENTE_ACTIVO">Prospecto activo</option>
                          <option value="NO_SHOW">No show</option>
                        </select>
                        <select value={filtroTratamientoChat} onChange={e=>setFiltroTratamientoChat(e.target.value)}
                          style={{background:C.bg,border:`1px solid ${filtroTratamientoChat?C.accent:C.border}`,borderRadius:4,padding:"5px 8px",color:filtroTratamientoChat?C.accentLight:C.muted,fontSize:11,fontFamily:"inherit"}}>
                          <option value="">Todos los servicios</option>
                          {[...new Set((prospectos||[]).map(p=>p.tratamiento).filter(Boolean))].map(t=><option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                        <button onClick={()=>setFiltroNoShow(f=>!f)}
                          style={{padding:"4px 10px",borderRadius:2,border:`1px solid ${filtroNoShow?"#ef4444":C.border}`,background:filtroNoShow?"rgba(239,68,68,0.1)":"transparent",color:filtroNoShow?"#ef4444":C.muted,fontSize:10,fontWeight:filtroNoShow?700:400,cursor:"pointer"}}>
                          🔴 No-show
                        </button>
                        <select value={filtroInactivos} onChange={e=>setFiltroInactivos(parseInt(e.target.value))}
                          style={{flex:1,background:filtroInactivos?C.accentGlow:C.bg,border:`1px solid ${filtroInactivos?C.accent:C.border}`,borderRadius:4,padding:"4px 6px",color:filtroInactivos?C.accentLight:C.muted,fontSize:10,fontFamily:"inherit"}}>
                          <option value={0}>Sin actividad: todos</option>
                          <option value={3}>+3 días sin actividad</option>
                          <option value={7}>+7 días sin actividad</option>
                          <option value={14}>+14 días sin actividad</option>
                          <option value={30}>+30 días sin actividad</option>
                        </select>
                        {(filtroEtapa||filtroTratamientoChat||filtroNoShow||filtroInactivos) && (
                          <button onClick={()=>{setFiltroEtapa('');setFiltroTratamientoChat('');setFiltroNoShow(false);setFiltroInactivos(0);}}
                            style={{padding:"4px 8px",borderRadius:2,border:"none",background:"transparent",color:C.muted,fontSize:10,cursor:"pointer"}}>✕ Limpiar</button>
                        )}
                      </div>
                    </div>
                  )}
                  <div style={{fontSize:10,color:C.muted,fontWeight:500,textTransform:"uppercase",letterSpacing:".6px"}}>
                    {(() => {
                      const total = (prospectos||[]).length;
                      const hayFiltro = busquedaProspectos||filtroEtapa||filtroTratamientoChat||filtroNoShow||filtroInactivos;
                      if (!hayFiltro) return `${total} prospectos`;
                      const filtrados = (prospectos||[]).filter(p => {
                        if (busquedaProspectos) { const q=busquedaProspectos.toLowerCase(); if (!(p.nombre||'').toLowerCase().includes(q)&&!(p.telefono||'').includes(q)) return false; }
                        if (filtroEtapa && p.etapa!==filtroEtapa) return false;
                        if (filtroTratamientoChat && p.tratamiento!==filtroTratamientoChat) return false;
                        if (filtroNoShow && !p.noshow && p.etapa!=='NO_SHOW') return false;
                        if (filtroInactivos) { const corte=Date.now()-filtroInactivos*86400000; if (new Date(p.actualizado_en).getTime()>=corte) return false; }
                        return true;
                      }).length;
                      return `${filtrados} de ${total} prospectos`;
                    })()}
                  </div>
                </div>

                {/* Lista prospectos */}
                <div style={{overflowY:"auto",flex:1}}>
                  {(() => {
                    let lista = [...(prospectos||[])];
                    if (busquedaProspectos) { const q=busquedaProspectos.toLowerCase(); lista=lista.filter(p=>(p.nombre||'').toLowerCase().includes(q)||(p.telefono||'').includes(q)); }
                    if (filtroEtapa) lista=lista.filter(p=>p.etapa===filtroEtapa);
                    if (filtroTratamientoChat) lista=lista.filter(p=>p.tratamiento===filtroTratamientoChat);
                    if (filtroNoShow) lista=lista.filter(p=>p.noshow||p.etapa==='NO_SHOW');
                    if (filtroInactivos) { const corte=Date.now()-filtroInactivos*86400000; lista=lista.filter(p=>new Date(p.actualizado_en).getTime()<corte); }
                    // Filtros rápidos
                    if (filtroRapido==='horario') lista=lista.filter(p=>p.listo_para_cierre&&!p.horario_elegido);
                    if (filtroRapido==='agendados') lista=lista.filter(p=>['SEGUIMIENTO_PENDIENTE','PACIENTE_ACTIVO','CONFIRMAR_AGENDA'].includes(p.etapa));
                    if (filtroRapido==='cancelaciones') lista=lista.filter(p=>p.cancelacion_pendiente);
                    if (filtroRapido==='reagendas') lista=lista.filter(p=>p.reagenda_pendiente);
                    if (lista.length===0) return <div style={{padding:24,textAlign:"center",color:C.muted,fontSize:12}}>{busquedaProspectos||filtroEtapa||filtroTratamientoChat||filtroNoShow||filtroInactivos?"Sin resultados para estos filtros":"Sin prospectos"}</div>;
                    lista.sort((a,b)=>{
                      const aA=a.listo_para_cierre&&!a.horario_elegido&&!limpiadosRef?.current?.has(a.id);
                      const bA=b.listo_para_cierre&&!b.horario_elegido&&!limpiadosRef?.current?.has(b.id);
                      if(aA&&!bA)return -1; if(!aA&&bA)return 1;
                      if(a.noshow&&!b.noshow)return -1; if(!a.noshow&&b.noshow)return 1;
                      if(a.insistencia_notificada&&!b.insistencia_notificada)return -1; if(!a.insistencia_notificada&&b.insistencia_notificada)return 1;
                      if(a.etapa==="PENDIENTE_CONFIRMACION"&&b.etapa!=="PENDIENTE_CONFIRMACION")return -1; if(a.etapa!=="PENDIENTE_CONFIRMACION"&&b.etapa==="PENDIENTE_CONFIRMACION")return 1;
                      return new Date(b.actualizado_en)-new Date(a.actualizado_en);
                    });
                    const modoExpandido=!selectedProspect&&!isMobile;
                    return lista.map(p=>{
                      const tieneAlerta=p.insistencia_notificada&&p.modo_humano;
                      const esperaHorario=p.listo_para_cierre&&!p.horario_elegido&&!limpiadosRef?.current?.has(p.id);
                      const esNoShow=p.noshow||p.etapa==='NO_SHOW';
                      const esCancelacion=p.cancelacion_pendiente;
                      const esReagenda=p.reagenda_pendiente;
                      const esSeleccionado=selectedProspect?.id===p.id;
                      const ultimoMsg=esSeleccionado&&mensajes?.length>0?mensajes[mensajes.length-1]?.contenido?.substring(0,60):null;
                      const borderColor=esCancelacion?"#ef4444":esReagenda?"#3b82f6":esperaHorario?"#f97316":esNoShow?"#ef4444":tieneAlerta?"#ef4444":p.etapa==="PENDIENTE_CONFIRMACION"?"#f97316":"transparent";
                      // Mensajes no vistos: el prospecto fue actualizado después de que lo vimos por última vez
                      const lastSeen = lastSeenRef.current[p.id] || 0;
                      const ultimaActualizacion = new Date(p.actualizado_en).getTime();
                      const tieneNoVistos = !esSeleccionado && ultimaActualizacion > lastSeen && p.etapa !== 'SEGUIMIENTO_PENDIENTE' && p.etapa !== 'PACIENTE_ACTIVO';
                      return (
                        <div key={p.id} className="pi" onClick={()=>{
                          setSelectedProspect(p);
                          setShowDetalle(false);
                          lastSeenRef.current[p.id] = Date.now(); // marcar como visto
                        }}
                          style={{padding:modoExpandido?"14px 16px":"10px 14px",cursor:"pointer",borderBottom:`1px solid ${C.border}`,
                            borderLeft:`3px solid ${esSeleccionado?C.accent:borderColor}`,
                            background:esSeleccionado?C.accentGlow:esperaHorario?"rgba(249,115,22,0.05)":esNoShow?"rgba(239,68,68,0.04)":tieneAlerta?"rgba(239,68,68,0.04)":"transparent",
                            transition:"background .1s"}}>
                          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                            {(esperaHorario||tieneAlerta||esNoShow)&&<div className={esperaHorario?"pulso-naranja":""} style={{width:7,height:7,borderRadius:"50%",flexShrink:0,background:esperaHorario?"#f97316":"#ef4444",animation:esperaHorario?"":"pulse 1.5s infinite"}}/>}
                            <div style={{flex:1,fontWeight:esSeleccionado||esperaHorario?700:500,fontSize:modoExpandido?13:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:esNoShow?"#f87171":esperaHorario?"#fb923c":C.text}}>{p.nombre||p.telefono}</div>
                            {esperaHorario&&<span style={{fontSize:9,padding:"2px 6px",borderRadius:4,background:"rgba(249,115,22,0.2)",color:"#fb923c",fontWeight:700,flexShrink:0,whiteSpace:"nowrap"}}>⏳ HORARIO</span>}
                            {esNoShow&&!esperaHorario&&<span style={{fontSize:9,padding:"2px 6px",borderRadius:4,background:"rgba(239,68,68,0.15)",color:"#ef4444",fontWeight:700,flexShrink:0}}>NO SHOW</span>}
                            {!esNoShow&&!esperaHorario&&tieneAlerta&&<span style={{fontSize:9,padding:"2px 6px",borderRadius:4,background:"rgba(239,68,68,0.15)",color:"#ef4444",fontWeight:700,flexShrink:0}}>ATENDER</span>}
                            {esCancelacion&&<span style={{fontSize:9,padding:"2px 6px",borderRadius:4,background:"rgba(239,68,68,0.15)",color:"#ef4444",fontWeight:700,flexShrink:0}}>❌ CANCELA</span>}
                            {esReagenda&&!esCancelacion&&<span style={{fontSize:9,padding:"2px 6px",borderRadius:4,background:"rgba(59,130,246,0.15)",color:"#60a5fa",fontWeight:700,flexShrink:0}}>🔄 REAGENDA</span>}
                            {tieneNoVistos&&!esperaHorario&&!tieneAlerta&&!esNoShow&&(
                              <div style={{width:18,height:18,borderRadius:"50%",background:"#22c55e",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:"white",flexShrink:0}}>N</div>
                            )}
                          </div>
                          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:4}}>
                            <Badge etapa={p.etapa}/>
                            {p.tratamiento&&!modoExpandido&&<span style={{fontSize:10,color:C.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1,marginLeft:4}}>{p.tratamiento}</span>}
                            <span style={{fontSize:10,color:C.muted,flexShrink:0}}>{timeAgo(p.actualizado_en)}</span>
                          </div>
                          {modoExpandido&&(
                            <div style={{marginTop:6}}>
                              {p.tratamiento&&<div style={{fontSize:11,color:C.accent,marginBottom:3,fontWeight:500}}>💉 {p.tratamiento}</div>}
                              {ultimoMsg&&<div style={{fontSize:11,color:C.muted,fontStyle:"italic",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ultimoMsg}</div>}
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            )}

            {/* Columna del chat */}
            <div style={{...(isMobile && selectedProspect
              ? {position:"absolute",inset:0,zIndex:20,background:C.bg,display:"flex",flexDirection:"column",overflow:"hidden"}
              : {flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minHeight:0})}}>
              {selectedProspect ? (
                <>
                  {/* Header fijo — nombre + volver + controles */}
                  <div style={{
                    padding:"12px 16px",
                    borderBottom:`1px solid ${C.border}`,
                    display:"flex",alignItems:"center",justifyContent:"space-between",
                    flexShrink:0,
                    background:C.surface,
                    position:"sticky",top:0,zIndex:20,
                  }}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      {isMobile && (
                        <button onClick={()=>setSelectedProspect(null)}
                          style={{background:"transparent",border:"none",color:C.muted,fontSize:22,cursor:"pointer",padding:"0 2px",lineHeight:1}}>←</button>
                      )}
                      <div onClick={()=>isMobile&&setShowChatDetail(true)} style={{cursor:isMobile?"pointer":"default"}}>
                        {editandoNombre ? (
                          <div style={{display:"flex",alignItems:"center",gap:6}}>
                            <input
                              autoFocus
                              value={nuevoNombre}
                              onChange={e=>setNuevoNombre(e.target.value)}
                              onKeyDown={async e=>{
                                if (e.key==="Enter") {
                                  const nom = nuevoNombre.trim();
                                  if (!nom) { setEditandoNombre(false); return; }
                                  await fetch(`${API}/api/prospectos/${selectedProspect.id}`, {method:"PUT",headers:jH(),body:JSON.stringify({nombre:nom,cliente_id:client.id})}).catch(()=>{});
                                  // Actualizar también en pacientes si existe
                                  await fetch(`${API}/api/pacientes/actualizar-nombre`, {method:"POST",headers:jH(),body:JSON.stringify({cliente_id:client.id,telefono:selectedProspect.telefono,nombre:nom})}).catch(()=>{});
                                  setSelectedProspect({...selectedProspect,nombre:nom});
                                  setEditandoNombre(false);
                                } else if (e.key==="Escape") {
                                  setEditandoNombre(false);
                                }
                              }}
                              style={{fontWeight:600,fontSize:14,background:"transparent",border:"none",borderBottom:"1px solid #6366f1",outline:"none",color:"white",width:160,padding:"0 2px"}}
                            />
                            <button onClick={async ()=>{
                              const nom = nuevoNombre.trim();
                              if (!nom) { setEditandoNombre(false); return; }
                              await fetch(`${API}/api/prospectos/${selectedProspect.id}`, {method:"PUT",headers:jH(),body:JSON.stringify({nombre:nom,cliente_id:client.id})}).catch(()=>{});
                              await fetch(`${API}/api/pacientes/actualizar-nombre`, {method:"POST",headers:jH(),body:JSON.stringify({cliente_id:client.id,telefono:selectedProspect.telefono,nombre:nom})}).catch(()=>{});
                              setSelectedProspect({...selectedProspect,nombre:nom});
                              setEditandoNombre(false);
                            }} style={{background:"#6366f1",border:"none",color:"white",borderRadius:4,padding:"1px 8px",fontSize:11,cursor:"pointer"}}>✓</button>
                            <button onClick={()=>setEditandoNombre(false)} style={{background:"transparent",border:"none",color:C.muted,fontSize:14,cursor:"pointer"}}>✕</button>
                          </div>
                        ) : (
                          <div style={{display:"flex",alignItems:"center",gap:6}}>
                            <div style={{fontWeight:600,fontSize:14}}>{selectedProspect.nombre||selectedProspect.telefono}{isMobile&&<span style={{fontSize:11,color:C.muted,marginLeft:6}}>ℹ️</span>}</div>
                            <button onClick={()=>{setNuevoNombre(selectedProspect.nombre||"");setEditandoNombre(true);}} title="Editar nombre"
                              style={{background:"transparent",border:"none",color:C.muted,fontSize:11,cursor:"pointer",padding:"0 2px",lineHeight:1,opacity:.6}}>✏️</button>
                          </div>
                        )}
                        <div style={{fontSize:11,color:C.muted}}>{selectedProspect.telefono} · {selectedProspect.tratamiento}</div>
                      </div>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <Badge etapa={selectedProspect.etapa}/>
                      <button onClick={()=>toggleModoHumano(selectedProspect.id, !modoHumano[selectedProspect.id])}
                        style={{padding:"4px 12px",borderRadius:2,border:`1px solid ${modoHumano[selectedProspect.id]?"#10b981":C.border}`,background:modoHumano[selectedProspect.id]?"rgba(16,185,129,0.12)":"transparent",color:modoHumano[selectedProspect.id]?"#34d399":C.muted,fontSize:11,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}>
                        {modoHumano[selectedProspect.id] ? "🧑 Vos" : "🤖 Bot"}
                      </button>
                      {/* Toggle panel derecho — solo PC */}
                      {!isMobile && (
                        <button onClick={()=>setShowDetalle(d=>!d)}
                          title={showDetalle?"Ocultar detalle":"Ver detalle del prospecto"}
                          style={{width:30,height:30,borderRadius:4,border:`1px solid ${showDetalle?C.accent:C.border}`,background:showDetalle?C.accentGlow:"transparent",color:showDetalle?C.accentLight:C.muted,fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all .15s"}}>
                          ℹ
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Barra de estado debajo del header */}
                  {(() => {
                    const sp = selectedProspect;
                    if (!sp) return null;
                    const ultimoUser = sp.ultimo_mensaje_user;
                    const ventanaCerrada = ultimoUser
                      ? (Date.now() - new Date(ultimoUser).getTime()) > 23 * 3600000
                      : false; // sin dato no mostramos como cerrada

                    const recuperar = async (plantilla, params = []) => {
                      setRecuperando(true);
                      try {
                        const r = await fetch(`${API}/api/difusion/enviar-uno`, {
                          method:'POST', headers:jH(),
                          body: JSON.stringify({ cliente_id: client.id, paciente: { id: sp.id, telefono: sp.telefono, nombre: sp.nombre }, plantilla })
                        });
                        if (r.ok) alert('✅ Mensaje enviado correctamente');
                        else {
                          const errData = await r.json().catch(()=>({}));
                          alert('❌ ' + (errData.error || 'Error al enviar'));
                        }
                      } catch(e) { alert('❌ Error: ' + e.message); }
                      finally { setRecuperando(false); }
                    };

                    // Cancelación siempre tiene prioridad
                    if (sp.cancelacion_pendiente) return (
                      <div style={{background:"rgba(239,68,68,0.12)",borderBottom:"1px solid rgba(239,68,68,0.3)",padding:"5px 16px",display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
                        <span style={{fontSize:11}}>❌</span>
                        <span style={{fontSize:11,color:"#f87171",fontWeight:600}}>Solicitud de cancelación pendiente</span>
                      </div>
                    );

                    // Reagenda
                    if (sp.reagenda_pendiente) {
                      if (ventanaCerrada) return (
                        <div style={{background:"rgba(239,68,68,0.12)",borderBottom:"1px solid rgba(239,68,68,0.3)",padding:"5px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:6,flexShrink:0}}>
                          <div style={{display:"flex",alignItems:"center",gap:6}}>
                            <span style={{fontSize:11}}>🔴</span>
                            <span style={{fontSize:11,color:"#f87171",fontWeight:600}}>Ventana cerrada — reagenda pendiente</span>
                          </div>
                          <button onClick={()=>recuperar('edge_recuperar_reagenda')} disabled={recuperando}
                            style={{fontSize:10,padding:"3px 10px",borderRadius:2,border:"none",background:recuperando?"#6b7280":"#ef4444",color:"white",fontWeight:600,cursor:recuperando?"not-allowed":"pointer",flexShrink:0}}>
                            {recuperando ? '⏳ Enviando...' : 'Recuperar'}
                          </button>
                        </div>
                      );
                      return (
                        <div style={{background:"rgba(59,130,246,0.12)",borderBottom:"1px solid rgba(59,130,246,0.3)",padding:"5px 16px",display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
                          <span style={{fontSize:11}}>🔄</span>
                          <span style={{fontSize:11,color:"#60a5fa",fontWeight:600}}>Quiere reagendar</span>
                        </div>
                      );
                    }

                    // Confirmación de turno pendiente
                    if (sp.etapa === 'PENDIENTE_CONFIRMACION') {
                      if (ventanaCerrada) return (
                        <div style={{background:"rgba(239,68,68,0.12)",borderBottom:"1px solid rgba(239,68,68,0.3)",padding:"5px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:6,flexShrink:0}}>
                          <div style={{display:"flex",alignItems:"center",gap:6}}>
                            <span style={{fontSize:11}}>🔴</span>
                            <span style={{fontSize:11,color:"#f87171",fontWeight:600}}>Ventana cerrada — confirmación pendiente</span>
                          </div>
                          <button onClick={()=>recuperar('edge_recuperar_confirmacion')} disabled={recuperando}
                            style={{fontSize:10,padding:"3px 10px",borderRadius:2,border:"none",background:recuperando?"#6b7280":"#ef4444",color:"white",fontWeight:600,cursor:recuperando?"not-allowed":"pointer",flexShrink:0}}>
                            {recuperando ? '⏳ Enviando...' : 'Recuperar'}
                          </button>
                        </div>
                      );
                      return (
                        <div style={{background:"rgba(249,115,22,0.12)",borderBottom:"1px solid rgba(249,115,22,0.3)",padding:"5px 16px",display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
                          <div style={{width:8,height:8,borderRadius:"50%",background:"#f97316",animation:"pulse 1.5s infinite",flexShrink:0}}/>
                          <span style={{fontSize:11,color:"#fb923c",fontWeight:600}}>Turno pendiente de confirmación</span>
                        </div>
                      );
                    }

                    // Esperando horario — solo si NO hay reagenda pendiente y NO está recolectando datos
                    if (sp.listo_para_cierre && !sp.horario_elegido && !sp.reagenda_pendiente && sp.etapa !== 'RECOLECTAR_DATOS') {
                      if (ventanaCerrada) return (
                        <div style={{background:"rgba(239,68,68,0.12)",borderBottom:"1px solid rgba(239,68,68,0.3)",padding:"5px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:6,flexShrink:0}}>
                          <div style={{display:"flex",alignItems:"center",gap:6}}>
                            <span style={{fontSize:11}}>🔴</span>
                            <span style={{fontSize:11,color:"#f87171",fontWeight:600}}>Ventana cerrada — esperando horario</span>
                          </div>
                          <div style={{display:"flex",gap:6,flexShrink:0}}>
                            <button onClick={async()=>{
                              const datosR = await fetch(`${API}/api/prospectos/${sp.id}/datos-agenda`,{headers:aH()}).then(r=>r.json()).catch(()=>({}));
                              const emailPac = datosR?.email || '';
                              if (!emailPac) { alert('No hay email registrado para este prospecto'); return; }
                              const r = await fetch(`${API}/api/prospectos/${sp.id}/recuperar-email`,{method:'POST',headers:jH(),body:JSON.stringify({cliente_id:client.id})});
                              if (r.ok) alert(`📧 Email enviado a ${emailPac}`);
                            }} style={{fontSize:10,padding:"3px 10px",borderRadius:2,border:"1px solid rgba(6,182,212,0.5)",background:"transparent",color:"#67e8f9",fontWeight:600,cursor:"pointer",flexShrink:0}}>
                              📧 Email
                            </button>
                            <button onClick={()=>recuperar('edge_recuperar_horario')} disabled={recuperando}
                              style={{fontSize:10,padding:"3px 10px",borderRadius:2,border:"none",background:recuperando?"#6b7280":"#ef4444",color:"white",fontWeight:600,cursor:recuperando?"not-allowed":"pointer",flexShrink:0}}>
                              {recuperando ? '⏳ Enviando...' : 'Recuperar WA'}
                            </button>
                          </div>
                        </div>
                      );
                      return (
                        <div style={{background:"rgba(249,115,22,0.12)",borderBottom:"1px solid rgba(249,115,22,0.3)",padding:"5px 16px",display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
                          <span style={{fontSize:11}}>⏳</span>
                          <span style={{fontSize:11,color:"#fb923c",fontWeight:600}}>Esperando horario</span>
                        </div>
                      );
                    }

                    return null;
                  })()}

                  {/* Badge de seguimiento actual */}
                  {selectedProspect?.seguimiento_actual && (
                    <div style={{background:"rgba(99,102,241,0.1)",borderBottom:"1px solid rgba(99,102,241,0.25)",padding:"4px 16px",display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                      <span style={{fontSize:10}}>📋</span>
                      <span style={{fontSize:11,color:"#818cf8",fontWeight:600}}>
                        Seguimiento {selectedProspect.seguimiento_actual} en curso
                      </span>
                      <span style={{fontSize:10,color:"#64748b",marginLeft:"auto"}}>
                        {selectedProspect.seguimiento_actual?.startsWith('1B') ? 'Rapport' :
                         selectedProspect.seguimiento_actual?.startsWith('2B') || selectedProspect.seguimiento_actual?.endsWith('B') ? 'Rapport' :
                         selectedProspect.seguimiento_actual?.endsWith('C') ? 'Agenda' : ''}
                      </span>
                    </div>
                  )}

                  {/* Banner recordatorios de turno pendientes */}
                  {(()=>{
                    const tel = selectedProspect?.telefono;
                    const recs = (recordatoriosProximos||[]).filter(r => r.paciente_telefono === tel);
                    const pendientes = recs.filter(r => r.pendiente);
                    const proximo = pendientes.sort((a,b) => new Date(a.fecha_recordatorio) - new Date(b.fecha_recordatorio))[0];
                    if (!proximo) return null;
                    const diffHs = Math.round((new Date(proximo.fecha_recordatorio) - new Date()) / 3600000);
                    const tiempoStr = diffHs < 1 ? 'en menos de 1hs' : diffHs < 24 ? `en ${diffHs}hs` : `en ${Math.round(diffHs/24)}d`;
                    return (
                      <div style={{background:"rgba(99,102,241,0.06)",borderBottom:"1px solid rgba(99,102,241,0.15)",padding:"4px 16px",display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                        <span style={{fontSize:10}}>⏰</span>
                        <span style={{fontSize:11,color:"#818cf8"}}>
                          Próximo recordatorio: {proximo.nivel_desc} — {tiempoStr}
                          {pendientes.length > 1 && ` · ${pendientes.length} pendientes`}
                        </span>
                      </div>
                    );
                  })()}

                  {/* -- BANNER PREFERENCIAS PROSPECTO -- */}
                  {selectedProspect.etapa === "PENDIENTE_CONFIRMACION" && (() => {
                    const sol = solicitudes.find(s => s.prospecto_id === selectedProspect.id && s.estado === "pendiente");
                    if (!sol) return null;
                    const fechaStr = sol.fecha_solicitada
                      ? new Date(sol.fecha_solicitada + "T12:00:00").toLocaleDateString("es-AR",{weekday:"long",day:"numeric",month:"long"})
                      : null;
                    const horaStr = sol.hora_solicitada ? sol.hora_solicitada.substring(0,5)+"hs" : "";
                    return (
                      <div style={{margin:"0 16px 0 16px",marginTop:12,borderRadius:2,border:"1.5px solid #f97316",background:"rgba(249,115,22,0.07)",padding:"12px 16px",marginBottom:6}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                          <div style={{width:10,height:10,borderRadius:"50%",background:"#f97316",animation:"pulse 1.5s infinite"}}/>
                          <div style={{fontSize:13,fontWeight:700,color:"#f97316"}}>Preferencias del cliente</div>
                        </div>
                        <div style={{background:"rgba(0,0,0,0.2)",borderRadius:4,padding:"8px 12px",fontSize:12,color:"#e9edef"}}>
                          {selectedProspect?.preferencia_horaria && selectedProspect.preferencia_horaria !== "cualquiera" && (
                            <div style={{marginBottom:4}}>
                              {selectedProspect.preferencia_horaria === "manana" ? "🌅 Prefiere mañana" : "🌆 Prefiere tarde"}
                            </div>
                          )}
                          {fechaStr && <div>📅 Solicitó: {fechaStr}{horaStr ? " · " + horaStr : ""}</div>}
                          {sol.preferencia_reagenda && <div style={{marginTop:4,color:"#94a3b8",fontStyle:"italic"}}>💬 "{sol.preferencia_reagenda}"</div>}
                          {!fechaStr && !selectedProspect?.preferencia_horaria && <div style={{color:"#64748b"}}>Sin preferencia específica</div>}
                        </div>
                      </div>
                    );
                  })()}
                  {/* -- MENSAJES estilo WhatsApp -- */}
                  {/* -- MENSAJES estilo WhatsApp -- */}
                  <div ref={chatRef} style={{flex:1,overflowY:"auto",padding:"12px 16px",display:"flex",flexDirection:"column",gap:2,background:"#0d1117"}}>
                    {(mensajes||[]).map((m,i) => {
                      const esBot = m.rol === "assistant";
                      const esAudio = m.contenido?.startsWith("🎤");
                      const prev = mensajes[i-1];
                      const mismoLado = prev && prev.rol === m.rol;
                      const cercano = prev && (new Date(m.creado_en) - new Date(prev.creado_en)) < 120000;
                      const primerDelGrupo = !mismoLado || !cercano;
                      // Ticks: sent=✓ delivered=✓✓ read=✓✓azul
                      const TickIcon = () => {
                        if (m.rol !== "assistant") return null;
                        const s = m.status || "sent";
                        if (s === "read") return <span style={{marginLeft:3,color:"#53bdeb",fontSize:11}}>✓✓</span>;
                        if (s === "delivered") return <span style={{marginLeft:3,color:"#8696a0",fontSize:11}}>✓✓</span>;
                        return <span style={{marginLeft:3,color:"#8696a0",fontSize:11}}>✓</span>;
                      };
                      return (
                        <div key={i} style={{display:"flex",justifyContent:esBot?"flex-end":"flex-start",marginTop:primerDelGrupo?6:2}}>
                          <div style={{
                            maxWidth:"72%",
                            background:esBot?"#005c4b":"#1f2937",
                            borderRadius: esBot
                              ? (primerDelGrupo?"18px 4px 18px 18px":"18px 18px 18px 18px")
                              : (primerDelGrupo?"4px 18px 18px 18px":"18px 18px 18px 18px"),
                            padding:"7px 11px 5px 11px",
                            boxShadow:"0 1px 2px rgba(0,0,0,0.3)",
                          }}>
                            {esAudio && m.audio_url ? (
                              <AudioBubble audioUrl={m.audio_url} />
                            ) : esAudio ? (
                              <div style={{display:"flex",alignItems:"center",gap:6,color:"#8696a0",fontSize:12,padding:"2px 0"}}>
                                <span style={{fontSize:16}}>🎙</span>
                                <span style={{fontStyle:"italic"}}>{m.contenido?.replace("🎤 ","") || "Audio"}</span>
                              </div>
                            ) : (
                              <div style={{fontSize:13.5,lineHeight:1.45,color:"#e9edef",whiteSpace:"pre-wrap",wordBreak:"break-word"}}>{m.contenido}</div>
                            )}
                            <div style={{fontSize:10,color:"#8696a0",marginTop:2,textAlign:"right",lineHeight:1,display:"flex",alignItems:"center",justifyContent:"flex-end",gap:1}}>
                              {new Date(m.creado_en).toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"})}
                              <TickIcon/>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {/* Indicador grabando */}
                    {grabando && (
                      <div style={{display:"flex",justifyContent:"flex-end",marginTop:4}}>
                        <div style={{background:"#005c4b",borderRadius:"18px 4px 18px 18px",padding:"7px 14px",display:"flex",alignItems:"center",gap:8}}>
                          <div style={{width:8,height:8,borderRadius:"50%",background:"#ef4444",animation:"pulse 1s infinite"}}/>
                          <span style={{fontSize:12,color:"#e9edef"}}>Grabando…</span>
                        </div>
                      </div>
                    )}
                    {enviandoAudio && (
                      <div style={{display:"flex",justifyContent:"flex-end",marginTop:4}}>
                        <div style={{background:"#005c4b",borderRadius:"18px 4px 18px 18px",padding:"7px 14px"}}>
                          <span style={{fontSize:12,color:"#8696a0"}}>Enviando audio…</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* -- INPUT estilo WhatsApp - siempre visible abajo -- */}
                  <div style={{background:"#111b21",borderTop:"1px solid #2a3942",padding:"6px 8px",flexShrink:0,position:"sticky",bottom:0,zIndex:10}}>

                    {/* Menú acciones desplegable */}
                    {showAcciones && (
                      <div style={{marginBottom:8,background:"#1f2c34",border:"1px solid #2a3942",borderRadius:2,overflow:"hidden"}}>
                        {[
                          { icon:"📅", label:"Ofrecer horarios", desc:"Abre el calendario y ofrece slots al cliente", action: ()=>{ setReagendaMode(false); setModalCalendario(true); setShowAcciones(false); } },
                          { icon:"✅", label:"Confirmar turno", desc:"Abre el modal para confirmar el turno", action: async ()=>{ setShowAcciones(false);
                            setEnviandoConfirm(true);
                            try {
                              const telefPro = selectedProspect.telefono;
                              // 1. Extraer datos del historial
                              let datosChat = {};
                              try {
                                const dr = await fetch(`${API}/api/prospectos/${selectedProspect.id}/datos-agenda`, {headers:aH()});
                                if (dr.ok) datosChat = await dr.json() || {};
                              } catch(e) {}
                              try {
                                const extr = await fetch(`${API}/api/prospectos/${selectedProspect.id}/extraer-datos`, {method:'POST', headers:jH(), body:JSON.stringify({cliente_id:client.id})});
                                if (extr.ok) { const d = await extr.json(); if (d.datos) datosChat = {...datosChat, ...d.datos}; }
                              } catch(e) {}

                              const nombreFinal = datosChat.nombre || selectedProspect.nombre || '';
                              const telefonoFinal = datosChat.telefono_contacto || telefPro || '';

                              // 2. Buscar paciente SOLO por DNI (más preciso, evita confusiones)
                              let pacienteEncontrado = null;
                              if (datosChat.documento) {
                                try {
                                  const byDoc = await fetch(`${API}/api/pacientes?cliente_id=${client.id}&documento=${encodeURIComponent(datosChat.documento)}`, {headers:aH()}).then(r=>r.json()).catch(()=>[]);
                                  if (Array.isArray(byDoc) && byDoc.length > 0) pacienteEncontrado = byDoc[0];
                                } catch(e) {}
                              }

                              // 3. Precargar form
                              const slot = selectedProspect.horario_elegido ? (typeof selectedProspect.horario_elegido === 'string' ? JSON.parse(selectedProspect.horario_elegido) : selectedProspect.horario_elegido) : null;
                              setFormTurno({...FORM_TURNO_INIT, fecha:slot?.fecha||'', hora_inicio:slot?.hora||'', tratamiento_libre:selectedProspect.tratamiento||'Consulta General'});
                              setTurnoPaciente(pacienteEncontrado || null);
                              setTurnoStep(pacienteEncontrado ? 'turno' : 'nuevo_pac');
                              if (!pacienteEncontrado) {
                                setFormNuevoPac({nombre:nombreFinal, telefono:telefonoFinal, documento:datosChat.documento||'', email:datosChat.email||'', notas:datosChat.notas||'', notas:datosChat.notas||''});
                              }
                              setShowNuevoTurno(true);
                            } catch(e) {
                              console.error('Error confirmar turno:', e);
                              setTurnoStep('nuevo_pac');
                              setFormNuevoPac({nombre:selectedProspect.nombre||'', telefono:'', documento:'', email:'', notas:'', notas:''});
                              setShowNuevoTurno(true);
                            }
                            setEnviandoConfirm(false);
                          }},
                          { icon:"📋", label:"Pedir datos", desc:"Manda la lista de datos al cliente", action: async ()=>{ setShowAcciones(false);
                            const camposRes = await fetch(`${API}/api/campos-agenda?cliente_id=${client.id}`, {headers:aH()}).catch(()=>null);
                            const c = camposRes ? await camposRes.json().catch(()=>({})) : {};
                            const lista = [];
                            if (c.nombre_activo) lista.push('- Nombre completo:');
                            if (c.documento_activo) lista.push(`- ${c.documento_label||'DNI'}:`);
                            if (c.telefono_activo) lista.push('- WhatsApp:');
                            if (c.email_activo) lista.push('- Email:');
                            if (c.notas_activo) lista.push(`- ${c.notas_label||'Obra social'}:`);
                            if (c.modalidad_activo) lista.push('- Modalidad (presencial/virtual):');
                            if (c.notas_activo) lista.push('- Algo a tener en cuenta:');
                            if (lista.length>0) { setMsgManual(`para completar el registro necesito estos datos:\n\n${lista.join('\n')}`); }
                          }},
                          { icon:"🔄", label:"Reagendar", desc:"Cancela el turno viejo y ofrece uno nuevo", action: async ()=>{ 
                            setShowAcciones(false);
                            // Marcar reagenda_pendiente y limpiar listo_para_cierre
                            await fetch(`${API}/api/prospectos/${selectedProspect.id}`, {
                              method:'PUT', headers:jH(),
                              body: JSON.stringify({ reagenda_pendiente:true, listo_para_cierre:false, horario_elegido:null, horarios_ofrecidos:null, cliente_id:client.id })
                            }).catch(()=>{});
                            setSelectedProspect({...selectedProspect, reagenda_pendiente:true, listo_para_cierre:false, horario_elegido:null});
                            setReagendaMode(true); setModalCalendario(true);
                          } },
                          { icon:"❌", label:"Cancelar turno", desc:"Cancela el turno y avisa al prospecto", action: async ()=>{ setShowAcciones(false);
                            if (!window.confirm('¿Confirmar cancelación del turno?')) return;
                            try {
                              const rT = await fetch(`${API}/api/turnos?cliente_id=${client.id}&paciente_tel=${selectedProspect.telefono}`, {headers:aH()});
                              const ts = await rT.json().catch(()=>[]);
                              const ta = Array.isArray(ts) ? ts.find(t=>t.estado_turno!=='cancelado') : null;
                              if (ta) await fetch(`${API}/api/turnos/${ta.id}`, {method:'PUT',headers:jH(),body:JSON.stringify({estado_turno:'cancelado',cliente_id:client.id})});
                              await fetch(`${API}/api/prospectos/${selectedProspect.id}`, {method:'PUT',headers:jH(),body:JSON.stringify({cancelacion_pendiente:false,etapa:'SEGUIMIENTO_PENDIENTE',modo_humano:false,cliente_id:client.id})});
                              await fetch(`${API}/api/enviar-mensaje`,{method:'POST',headers:jH(),body:JSON.stringify({telefono:selectedProspect.telefono,mensaje:'tu turno fue cancelado. cuando quieras volver a agendar escribinos!',cliente_id:client.id})}).catch(()=>{});
                              setSelectedProspect({...selectedProspect,cancelacion_pendiente:false,etapa:'SEGUIMIENTO_PENDIENTE'});
                            } catch(e){console.error(e);}
                          }},
                          { icon:"🚫", label:"Marcar no show", desc:"El prospecto no se presentó", action: async ()=>{ setShowAcciones(false);
                            setMarcandoNoShow(true);
                            await fetch(`${API}/api/prospectos/${selectedProspect.id}`, {method:'PUT',headers:jH(),body:JSON.stringify({etapa:'NO_SHOW',cliente_id:client.id})}).catch(()=>{});
                            setSelectedProspect({...selectedProspect,etapa:'NO_SHOW'});
                            setMarcandoNoShow(false);
                          }},
                          { icon:"📧", label:"Recuperar por email", desc:"Manda email de recuperación al prospecto", action: async ()=>{ setShowAcciones(false);
                            try {
                              const r = await fetch(`${API}/api/prospectos/${selectedProspect.id}/recuperar-email`, {method:'POST', headers:jH(), body:JSON.stringify({cliente_id:client.id})});
                              const d = await r.json();
                              if (d.ok) alert(`📧 Email enviado a ${d.email}`);
                              else alert(d.error || 'No hay email registrado');
                            } catch(e) { alert('Error al enviar email'); }
                          }},
                          { icon:"🔔", label:"Enviar recordatorio", desc:"Manda recordatorio del turno próximo", action: ()=>{ setShowAcciones(false);
                            setEsRecordatorioFlag(true);
                            setMsgManual(`Hola${selectedProspect?.nombre?` ${selectedProspect.nombre.split(' ')[0]}`:''}! Te recordamos que tenés turno con nosotros. Ante cualquier consulta escribinos.`);
                          }},
                          { icon:"🔄", label:"Resetear estado", desc:"Limpia seguimiento, banners y estado del bot", action: async ()=>{ setShowAcciones(false);
                            try {
                              const tel = selectedProspect.telefono;
                              const pacId = selectedProspect.paciente_id;
                              let tieneFuturo = false, tienePasado = false;
                              // Buscar por paciente_id si existe, sino por teléfono
                              const url = pacId
                                ? `${API}/api/turnos?cliente_id=${client.id}&paciente_id=${pacId}`
                                : `${API}/api/pacientes?cliente_id=${client.id}&q=${encodeURIComponent(tel)}`;
                              const data = await fetch(url, {headers:aH()}).then(r=>r.json()).catch(()=>[]);
                              const hoyStr = new Date().toISOString().split('T')[0];
                              const procesarTurnos = (turnos) => {
                                tieneFuturo = turnos.some(t => !['cancelado'].includes(t.estado_turno) && String(t.fecha).substring(0,10) >= hoyStr);
                                tienePasado = turnos.some(t => !['cancelado'].includes(t.estado_turno) && String(t.fecha).substring(0,10) < hoyStr);
                              };
                              if (pacId && Array.isArray(data)) {
                                procesarTurnos(data);
                              } else if (!pacId && Array.isArray(data) && data[0]) {
                                const pac = data.find(p => (p.telefono||'').replace(/\D/g,'').slice(-8) === (tel||'').replace(/\D/g,'').slice(-8)) || data[0];
                                const turnos = await fetch(`${API}/api/turnos?cliente_id=${client.id}&paciente_id=${pac.id}`, {headers:aH()}).then(r=>r.json()).catch(()=>[]);
                                procesarTurnos(turnos);
                              }
                              const etapaNueva = tieneFuturo ? 'SEGUIMIENTO_PENDIENTE' : tienePasado ? 'PACIENTE_ACTIVO' : 'RAPPORT';
                              await fetch(`${API}/api/prospectos/${selectedProspect.id}`, {
                                method:'PUT', headers:jH(),
                                body: JSON.stringify({
                                  cliente_id: client.id,
                                  etapa: etapaNueva,
                                  seguimiento_actual: null,
                                  listo_para_cierre: false,
                                  modo_humano: false,
                                  horario_elegido: null,
                                  reagenda_pendiente: false,
                                  cancelacion_pendiente: false,
                                })
                              });
                              setSelectedProspect({...selectedProspect, etapa:etapaNueva, seguimiento_actual:null, listo_para_cierre:false, modo_humano:false, horario_elegido:null, reagenda_pendiente:false, cancelacion_pendiente:false});
                            } catch(e) { console.error('Error al resetear', e); }
                          }},
                        ].map((a,i)=>(
                          <button key={i} onClick={a.action}
                            style={{width:"100%",padding:"10px 14px",background:"transparent",border:"none",borderBottom:i<8?"1px solid #2a3942":"none",cursor:"pointer",display:"flex",alignItems:"center",gap:10,textAlign:"left"}}>
                            <span style={{fontSize:18,flexShrink:0}}>{a.icon}</span>
                            <div>
                              <div style={{fontSize:12,fontWeight:600,color:"#e9edef"}}>{a.label}</div>
                              <div style={{fontSize:10,color:"#8696a0",marginTop:1}}>{a.desc}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {/* Banner horario elegido por el prospecto - solo si NO hay solicitud pendiente */}
                    {selectedProspect?.horario_elegido && selectedProspect?.etapa !== "PENDIENTE_CONFIRMACION" && (() => {
                      let slot = selectedProspect.horario_elegido;
                      if (typeof slot === 'string') { try { slot = JSON.parse(slot); } catch(e) { slot = null; } }
                      if (!slot) return null;
                      const hora = (slot.hora||'').replace(':00','')+'hs';
                      return (
                        <div style={{background:"rgba(34,197,94,0.08)",border:"1px solid rgba(34,197,94,0.4)",borderRadius:4,padding:"10px 12px",marginBottom:6,display:"flex",alignItems:"center",gap:10}}>
                          <div style={{flex:1}}>
                            <div style={{fontSize:12,color:"#4ade80",fontWeight:700,marginBottom:2}}>✅ Horario elegido por el prospecto</div>
                            <div style={{fontSize:13,color:"#e9edef",fontWeight:600}}>{slot.label} a las {hora}</div>
                            <div style={{fontSize:11,color:"#8696a0",marginTop:2}}>{selectedProspect.nombre||selectedProspect.telefono} - {selectedProspect.tratamiento||'Consulta'}</div>
                          </div>
                          <button
                            onClick={async () => {
                              if (!window.confirm('¿Limpiar este horario?')) return;
                              try {
                                await fetch(`${API}/api/prospectos/${selectedProspect.id}/limpiar-estado`, {
                                  method:'POST', headers:jH(),
                                  body: JSON.stringify({ etapa: selectedProspect.etapa })
                                });
                              } catch(e) {}
                              // Marcar como limpiado para que el polling no lo sobrescriba
                              marcarLimpiado(selectedProspect.id);
                              setSelectedProspect({...selectedProspect, horario_elegido: null, horarios_ofrecidos: null, listo_para_cierre: false});
                            }}
                            style={{padding:"6px 10px",borderRadius:4,border:"1px solid rgba(239,68,68,0.4)",background:"transparent",color:"#f87171",fontSize:11,cursor:"pointer",flexShrink:0,marginRight:4}}>
                            ✕ Limpiar
                          </button>
                          <button
                            onClick={async (e)=>{
                              setEnviandoConfirm(true);
                              try {
                              const telefPro = selectedProspect.telefono;
                              const fecha = slot.fecha||'';
                              const hora_inicio = slot.hora||'';

                              // Extraer datos del historial
                              let datosChat = {};
                              try {
                                const dr = await fetch(`${API}/api/prospectos/${selectedProspect.id}/datos-agenda`, {headers:aH()});
                                if (dr.ok) datosChat = await dr.json() || {};
                              } catch(e) {}
                              try {
                                const extr = await fetch(`${API}/api/prospectos/${selectedProspect.id}/extraer-datos`, {method:'POST', headers:jH(), body:JSON.stringify({cliente_id:client.id})});
                                if (extr.ok) { const d = await extr.json(); if (d.datos) datosChat = {...datosChat, ...d.datos}; }
                              } catch(e) {}

                              const nombreFinal = datosChat.nombre || selectedProspect.nombre || '';
                              const telefonoFinal = datosChat.telefono_contacto || telefPro || '';

                              // Buscar paciente SOLO por DNI
                              let pacienteEncontrado = null;
                              if (datosChat.documento) {
                                try {
                                  const byDoc = await fetch(`${API}/api/pacientes?cliente_id=${client.id}&documento=${encodeURIComponent(datosChat.documento)}`, {headers:aH()}).then(r=>r.json()).catch(()=>[]);
                                  if (Array.isArray(byDoc) && byDoc.length > 0) pacienteEncontrado = byDoc[0];
                                } catch(e) {}
                              }
                              // Pre-rellenar el form del turno con datos del chat
                              const tratamientoFinal = selectedProspect.tratamiento || 'Consulta';
                              setFormTurno({
                                ...FORM_TURNO_INIT,
                                fecha,
                                hora_inicio,
                                tratamiento_libre: tratamientoFinal,
                              });
                              setTurnoPaciente(pacienteEncontrado || null);
                              setTurnoStep(pacienteEncontrado ? "turno" : "nuevo_pac");
                              // Si no encontró paciente, pre-rellenar datos del nuevo paciente
                              if (!pacienteEncontrado) {
                                setFormNuevoPac({
                                  nombre: nombreFinal,
                                  telefono: telefonoFinal || '',
                                  documento: datosChat.documento || '',
                                  email: datosChat.email || '',
                                  notas: datosChat.notas || '',
                                  notas: datosChat.notas || '',
                                });
                              }
                              setShowNuevoTurno(true);
                              setEnviandoConfirm(false);
                            } catch(e) {
                              console.error('Error confirmar turno verde:', e);
                              setTurnoStep('nuevo_pac');
                              setFormNuevoPac({nombre: selectedProspect.nombre||'', telefono:'', documento:'', email:'', notas:'', notas:''});
                              setShowNuevoTurno(true);
                              setEnviandoConfirm(false);
                            }
                            }}
                            disabled={enviandoConfirm}
                            style={{padding:"8px 14px",borderRadius:4,border:"none",background:enviandoConfirm?"#374151":"#22c55e",color:"white",fontSize:12,fontWeight:700,cursor:enviandoConfirm?"not-allowed":"pointer",whiteSpace:"nowrap",flexShrink:0}}>
                            {enviandoConfirm ? '⏳ Cargando...' : '📅 Confirmar turno'}
                          </button>
                        </div>
                      );
                    })()}

                    {/* Banner push no activo */}
                    {selectedProspect?.listo_para_cierre && !pushActivo && (
                      <div style={{background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:4,padding:"6px 10px",marginBottom:6,display:"flex",alignItems:"center",gap:8}}>
                        <span style={{fontSize:13}}>🔕</span>
                        <span style={{fontSize:11,color:"#f87171"}}>Las notificaciones no están activas. <span style={{textDecoration:"underline",cursor:"pointer"}} onClick={()=>{ setActiveTab("config"); window._edgeHighlightPush = true; setTimeout(()=>{ const el = document.getElementById("push-settings-block"); if(el){ el.scrollIntoView({behavior:"smooth",block:"center"}); el.classList.add("push-highlight"); setTimeout(()=>el.classList.remove("push-highlight"),2000); } },300); }}>Activarlas en Configuración</span></span>
                      </div>
                    )}

                    {/* Banner cancelación pendiente */}
                    {selectedProspect?.cancelacion_pendiente && (
                      <div style={{background:"rgba(239,68,68,0.08)",border:"1.5px solid rgba(239,68,68,0.5)",borderRadius:4,padding:"10px 12px",marginBottom:6}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                          <div style={{width:8,height:8,borderRadius:"50%",background:"#ef4444",animation:"pulse 1.5s infinite"}}/>
                          <span style={{fontSize:12,fontWeight:700,color:"#f87171"}}>❌ Solicitud de cancelación</span>
                        </div>
                        <div style={{fontSize:11,color:C.muted,marginBottom:10}}>{selectedProspect.nombre||selectedProspect.telefono} quiere cancelar su turno</div>
                        <div style={{display:"flex",gap:8}}>
                          <button onClick={async()=>{
                            // Buscar turno activo del prospecto
                            try {
                              const r = await fetch(`${API}/api/turnos?cliente_id=${client.id}&prospecto_tel=${selectedProspect.telefono}&estado=confirmado`, {headers:aH()});
                              const turnos = await r.json();
                              const turno = Array.isArray(turnos) ? turnos.find(t=>t.estado_turno!=='cancelado') : null;
                              if (turno) {
                                await fetch(`${API}/api/turnos/${turno.id}`, {method:'PUT',headers:jH(),body:JSON.stringify({estado_turno:'cancelado',cliente_id:client.id})});
                              }
                              await fetch(`${API}/api/prospectos/${selectedProspect.id}`, {method:'PUT',headers:jH(),body:JSON.stringify({cancelacion_pendiente:false,etapa:'SEGUIMIENTO_PENDIENTE',modo_humano:false,cliente_id:client.id})}).catch(()=>{});
                              setSelectedProspect({...selectedProspect,cancelacion_pendiente:false,etapa:'SEGUIMIENTO_PENDIENTE'});
                              // Avisar al paciente
                              const tel = selectedProspect.telefono;
                              await fetch(`${API}/api/enviar-mensaje`,{method:'POST',headers:jH(),body:JSON.stringify({telefono:tel,mensaje:'tu turno fue cancelado. cuando quieras volver a agendar escribinos!',cliente_id:client.id})}).catch(()=>{});
                            } catch(e) { console.error(e); }
                          }} style={{flex:1,padding:"7px 0",borderRadius:4,border:"none",background:"#ef4444",color:"white",fontSize:12,fontWeight:700,cursor:"pointer"}}>
                            ✓ Confirmar cancelación
                          </button>
                          <button onClick={async()=>{
                            await fetch(`${API}/api/prospectos/${selectedProspect.id}`,{method:'PUT',headers:jH(),body:JSON.stringify({cancelacion_pendiente:false,cliente_id:client.id})}).catch(()=>{});
                            setSelectedProspect({...selectedProspect,cancelacion_pendiente:false});
                          }} style={{padding:"7px 12px",borderRadius:4,border:`1px solid ${C.border}`,background:"transparent",color:C.muted,fontSize:12,cursor:"pointer"}}>
                            Ignorar
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Banner reagenda pendiente */}
                    {selectedProspect?.reagenda_pendiente && !selectedProspect?.cancelacion_pendiente && (
                      <div style={{background:"rgba(59,130,246,0.08)",border:"1.5px solid rgba(59,130,246,0.4)",borderRadius:4,padding:"10px 12px",marginBottom:6}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                          <div style={{width:8,height:8,borderRadius:"50%",background:"#3b82f6",animation:"pulse 1.5s infinite"}}/>
                          <span style={{fontSize:12,fontWeight:700,color:"#60a5fa"}}>🔄 Quiere reagendar</span>
                        </div>
                        <div style={{fontSize:11,color:C.muted,marginBottom:4}}>{selectedProspect.nombre||selectedProspect.telefono} quiere cambiar su turno</div>
                        {selectedProspect.preferencia_reagenda && (
                          <div style={{fontSize:11,color:"#60a5fa",marginBottom:8,fontStyle:"italic"}}>
                            💬 "{selectedProspect.preferencia_reagenda}"
                          </div>
                        )}
                        <button onClick={()=>{
                          setReagendaMode(true);
                          setModalCalendario(true);
                        }}
                          style={{width:"100%",padding:"7px 0",borderRadius:4,border:"none",background:"#3b82f6",color:"white",fontSize:12,fontWeight:700,cursor:"pointer"}}>
                          📅 Ver disponibilidad para reagendar
                        </button>
                      </div>
                    )}
                    {/* Boton ver disponibilidad — calendario fantasma */}
                    {modoHumano[selectedProspect?.id] && selectedProspect?.listo_para_cierre && !selectedProspect?.horario_elegido && !yaEnvieHorariosIds.has(selectedProspect?.id) && !selectedProspect?.reagenda_pendiente && !selectedProspect?.cancelacion_pendiente && (
                      <div style={{background:"rgba(249,115,22,0.06)",border:"1px solid rgba(249,115,22,0.3)",borderRadius:4,padding:"8px 10px",marginBottom:6,display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
                        <div>
                          <div style={{fontSize:11,color:"#fb923c",fontWeight:600}}>🎯 Listo para agendar{selectedProspect?.tratamiento ? ` — ${selectedProspect.tratamiento}` : ''}</div>
                          {selectedProspect?.preferencia_horaria && selectedProspect.preferencia_horaria !== 'cualquiera' &&
                            <div style={{fontSize:10,color:"#fb923c",opacity:.7,marginTop:2}}>Prefiere: {selectedProspect.preferencia_horaria}</div>
                          }
                          {selectedProspect?.nombre &&
                            <div style={{fontSize:10,color:"#fb923c",opacity:.7,marginTop:1}}>{selectedProspect.nombre} · {selectedProspect.mensajes_count||0} mensajes</div>
                          }
                        </div>
                        <button onClick={()=>setModalCalendario(true)}
                          style={{padding:"6px 14px",borderRadius:4,border:"none",background:"#f97316",color:"white",fontSize:12,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>
                          📅 Ver disponibilidad
                        </button>
                      </div>
                    )}
                    {/* Fila de input */}
                    <div style={{display:"flex",gap:6,alignItems:"flex-end"}}>
                      {/* Botón Acciones */}
                      <button
                        onClick={()=>setShowAcciones(a=>!a)}
                        title="Acciones"
                        style={{width:42,height:42,borderRadius:"50%",border:"none",flexShrink:0,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,transition:"all .15s",
                          background:showAcciones?"#6366f1":"#2a3942",
                          color:showAcciones?"white":"#8696a0"}}>
                        ⚡
                      </button>
                      {/* Micrófono */}
                      <button
                        onClick={toggleGrabacion}
                        disabled={enviandoAudio}
                        title={grabando?"Detener y enviar audio":"Grabar audio"}
                        style={{width:42,height:42,borderRadius:"50%",border:"none",flexShrink:0,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,transition:"all .15s",
                          background:grabando?"#ef4444":enviandoAudio?"#374151":"#2a3942",
                          color:grabando?"white":enviandoAudio?"#6b7280":"#8696a0",
                          boxShadow:grabando?"0 0 0 4px rgba(239,68,68,0.25)":"none"}}>
                        {enviandoAudio?"⏳":grabando?"⏹":"🎙"}
                      </button>
                      {/* Textarea */}
                      <textarea
                        value={msgManual}
                        onChange={e=>{setMsgManual(e.target.value);setPlantillaRapida("");e.target.style.height="auto";e.target.style.height=Math.min(e.target.scrollHeight,120)+"px";}}
                        onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();enviarMensajeManual(selectedProspect?.telefono, horariosParaEnviar);setHorariosParaEnviar([]);}}}
                        placeholder={modoHumano[selectedProspect?.id]?"Mensaje…":"Tomá el control para escribir"}
                        rows={1}
                        style={{flex:1,background:"#2a3942",border:"none",borderRadius:4,padding:"10px 14px",color:"#e9edef",fontSize:13.5,fontFamily:"inherit",resize:"none",outline:"none",lineHeight:1.4,maxHeight:120,overflowY:"auto",transition:"height .1s"}}
                      />
                      {/* Enviar */}
                      <button
                        onClick={()=>{ enviarMensajeManual(selectedProspect?.telefono, horariosParaEnviar); setHorariosParaEnviar([]); }}
                        disabled={enviandoMsg||!msgManual.trim()}
                        style={{width:42,height:42,borderRadius:"50%",border:"none",flexShrink:0,
                          background:msgManual.trim()?"#00a884":"#2a3942",
                          color:msgManual.trim()?"white":"#8696a0",
                          fontSize:18,cursor:msgManual.trim()?"pointer":"default",display:"flex",alignItems:"center",justifyContent:"center",transition:"background .2s"}}>
                        {enviandoMsg?"⏳":"➤"}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                !isMobile ? <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",color:C.muted,fontSize:13}}>Seleccioná un prospecto</div> : null
              )}
            </div>


            {selectedProspect && !isMobile && showDetalle && (
              <div style={{width:240,background:C.surface,borderLeft:`1px solid ${C.border}`,padding:16,overflowY:"auto",flexShrink:0,animation:"si .2s ease"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
                  <div style={{fontSize:11,color:C.muted,textTransform:"uppercase",letterSpacing:".8px",fontWeight:500}}>Detalle</div>
                  <button onClick={()=>setShowDetalle(false)} style={{background:"transparent",border:"none",color:C.muted,cursor:"pointer",fontSize:16,lineHeight:1,padding:0}}>×</button>
                </div>
                {[
                  { label:"Servicio", value:selectedProspect.tratamiento||"-" },
                  { label:"Etapa", value:(STAGES[selectedProspect.etapa]||STAGES.RAPPORT).label },
                  { label:"Mensajes", value:selectedProspect.mensajes_count||0 },
                  { label:"Último contacto", value:timeAgo(selectedProspect.actualizado_en) },
                  { label:"Creado", value:new Date(selectedProspect.creado_en).toLocaleDateString("es-AR") },
                ].map((item,i) => (
                  <div key={i} style={{marginBottom:14}}>
                    <div style={{fontSize:11,color:C.muted,marginBottom:3}}>{item.label}</div>
                    <div style={{fontSize:13,fontWeight:500}}>{item.value}</div>
                  </div>
                ))}
                {datosAgenda && (
                  <>
                    <div style={{height:1,background:C.border,margin:"14px 0"}}/>
                    <div style={{fontSize:11,color:C.muted,textTransform:"uppercase",letterSpacing:".8px",marginBottom:14,fontWeight:500}}>Datos del turno</div>
                    {datosAgenda.fecha_turno && (
                      <div style={{marginBottom:10,background:C.accentGlow,borderRadius:4,padding:"8px 10px",border:`1px solid ${C.border}`}}>
                        <div style={{fontSize:10,color:C.muted,marginBottom:2}}>TURNO</div>
                        <div style={{fontSize:13,fontWeight:600,color:C.accentLight}}>
                          {new Date(datosAgenda.fecha_turno).toLocaleDateString("es-AR",{weekday:"long",day:"numeric",month:"long"})} · {(datosAgenda.hora_turno||"").replace(":00","")+"hs"}
                        </div>
                      </div>
                    )}
                    {[
                      { label:"Nombre", value:datosAgenda.nombre },
                      { label:camposGlobal?.documento_label||"Documento", value:datosAgenda.documento },
                      { label:"Email", value:datosAgenda.email },
                      { label:camposGlobal?.notas_label||"Obra social", value:datosAgenda.notas },
                      { label:"Modalidad", value:datosAgenda.modalidad },
                      { label:"Notas", value:datosAgenda.notas },
                    ].filter(x=>x.value).map((item,i) => (
                      <div key={i} style={{marginBottom:10}}>
                        <div style={{fontSize:10,color:C.muted,marginBottom:2}}>{item.label.toUpperCase()}</div>
                        <div style={{fontSize:12,fontWeight:500}}>{item.value}</div>
                      </div>
                    ))}
                  </>
                )}
              <div style={{height:1,background:"rgba(255,255,255,0.05)",margin:"16px 0"}}/>
                <button
                  onClick={async ()=>{
                    if (!window.confirm('¿Resetear el estado? Se limpia el banner, horarios y modo humano.')) return;
                    const r = await fetch(`${API}/api/prospectos/${selectedProspect.id}/limpiar-estado`, {
                      method:'POST', headers:jH(),
                      body: JSON.stringify({ etapa: selectedProspect.etapa })
                    });
                    if (r.ok) {
                      marcarLimpiado(selectedProspect.id);
                      setSelectedProspect({...selectedProspect, horario_elegido:null, horarios_ofrecidos:null, listo_para_cierre:false, modo_humano:false});
                      const t = document.createElement('div');
                      t.textContent = '✅ Estado reseteado';
                      t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#6366f1;color:white;padding:10px 20px;border-radius:10px;font-size:13px;font-weight:600;z-index:9999';
                      document.body.appendChild(t);
                      setTimeout(()=>t.remove(), 3000);
                    }
                  }}
                  style={{width:"100%",padding:"8px 0",borderRadius:4,border:"1px solid rgba(239,68,68,0.3)",background:"transparent",color:"#f87171",fontSize:11,fontWeight:600,cursor:"pointer"}}>
                  🔄 Resetear estado del prospecto
                </button>
              </div>
            )}

            {/* Drawer detalle en mobile */}
            {selectedProspect && isMobile && showChatDetail && (
              <div style={{position:"fixed",top:0,left:0,right:0,bottom:60,background:C.bg,zIndex:200,overflowY:"auto",padding:16}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}>
                  <button onClick={()=>setShowChatDetail(false)} style={{background:"transparent",border:"none",color:C.muted,fontSize:22,cursor:"pointer",lineHeight:1}}>Volver</button>
                  <div style={{fontSize:15,fontWeight:700}}>{selectedProspect.nombre||selectedProspect.telefono}</div>
                </div>
                {[
                  { label:"Servicio", value:selectedProspect.tratamiento||"-" },
                  { label:"Etapa", value:(STAGES[selectedProspect.etapa]||STAGES.RAPPORT).label },
                  { label:"Mensajes", value:selectedProspect.mensajes_count||0 },
                  { label:"Último contacto", value:timeAgo(selectedProspect.actualizado_en) },
                ].map((item,i) => (
                  <div key={i} style={{marginBottom:14,background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:"10px 14px"}}>
                    <div style={{fontSize:10,color:C.muted,marginBottom:2,textTransform:"uppercase"}}>{item.label}</div>
                    <div style={{fontSize:13,fontWeight:500}}>{item.value}</div>
                  </div>
                ))}
                {datosAgenda?.fecha_turno && (
                  <div style={{background:C.accentGlow,border:`1px solid ${C.border}`,borderRadius:4,padding:"10px 14px",marginBottom:10}}>
                    <div style={{fontSize:10,color:C.muted,marginBottom:4,textTransform:"uppercase"}}>Turno</div>
                    <div style={{fontSize:14,fontWeight:600,color:C.accentLight}}>
                      {new Date(datosAgenda.fecha_turno).toLocaleDateString("es-AR",{weekday:"long",day:"numeric",month:"long"})} · {(datosAgenda.hora_turno||"").replace(":00","")+"hs"}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Funnel */}
        {activeTab === "funnel" && (
          <div style={{flex:1,overflowY:"auto",padding:isMobile?12:24}}>
            <div style={{maxWidth:900,margin:"0 auto"}}>

              {/* Header con selector período */}
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20,flexWrap:"wrap",gap:10}}>
                <div>
                  <div style={{fontSize:16,fontWeight:700}}>📊 Funnel del negocio</div>
                  <div style={{fontSize:11,color:C.muted,marginTop:2}}>Bot + manual · todo el período</div>
                </div>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <select value={funnelMes} onChange={e=>{setFunnelMes(e.target.value);fetchFunnelNuevo(e.target.value,funnelAño);}}
                    style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:4,padding:"6px 10px",color:C.text,fontSize:12,fontFamily:"inherit"}}>
                    {["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"].map((m,i)=>(
                      <option key={i+1} value={String(i+1)}>{m}</option>
                    ))}
                  </select>
                  <select value={funnelAño} onChange={e=>{setFunnelAño(e.target.value);fetchFunnelNuevo(funnelMes,e.target.value);}}
                    style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:4,padding:"6px 10px",color:C.text,fontSize:12,fontFamily:"inherit"}}>
                    {[2024,2025,2026,2027].map(y=><option key={y} value={y}>{y}</option>)}
                  </select>
                  <button onClick={()=>fetchFunnelNuevo(funnelMes,funnelAño)}
                    style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:"6px 10px",color:C.muted,fontSize:12,cursor:"pointer"}}>
                    {funnelLoading?"...":"↻"}
                  </button>
                </div>
              </div>

              {funnelLoading && !funnelNuevo ? (
                <div style={{textAlign:"center",color:C.muted,padding:40}}>Cargando...</div>
              ) : funnelNuevo?.etapas ? (
                <>
                  {/* KPIs principales */}
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:10,marginBottom:24}}>
                    {[
                      {label:"Potenciales clientes", value:funnelNuevo.etapas.prospectos,  color:"#6366f1", icon:"💬", desc:"Del bot"},
                      {label:"Rapport",              value:funnelNuevo.etapas.rapport,     color:"#3b82f6", icon:"🗣", desc:"≥2 mensajes"},
                      {label:"Consulta agendada",    value:funnelNuevo.etapas.agendados,   color:"#f59e0b", icon:"📅", desc:"Todos los turnos"},
                      {label:"Presentados",          value:funnelNuevo.etapas.presentados, color:"#10b981", icon:"✅", desc:"Showup"},
                      {label:"Honorarios aceptados", value:funnelNuevo.etapas.vendidos,    color:"#8b5cf6", icon:"💰", desc:"Servicio contratado"},
                    ].map((s,i)=>(
                      <div key={i} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:"14px 16px"}}>
                        <div style={{fontSize:18,marginBottom:4}}>{s.icon}</div>
                        <div style={{fontSize:24,fontWeight:700,color:s.color,fontFamily:"'DM Mono',monospace"}}>{s.value}</div>
                        <div style={{fontSize:11,fontWeight:600,color:C.text,marginTop:4}}>{s.label}</div>
                        <div style={{fontSize:10,color:C.muted}}>{s.desc}</div>
                      </div>
                    ))}
                  </div>

                  {/* Funnel visual con conversiones entre etapas */}
                  <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:20,marginBottom:16}}>
                    <div style={{fontSize:13,fontWeight:600,marginBottom:20}}>Conversión entre etapas</div>
                    {(() => {
                      const etapas = [
                        {label:"Potenciales clientes", value:funnelNuevo.etapas.prospectos,  color:"#6366f1", conv:null, convLabel:null},
                        {label:"Rapport",              value:funnelNuevo.etapas.rapport,     color:"#3b82f6", conv:funnelNuevo.conversiones.prospectos_rapport,    convLabel:"Potenciales → Rapport"},
                        {label:"Consulta agendada",    value:funnelNuevo.etapas.agendados,   color:"#f59e0b", conv:funnelNuevo.conversiones.rapport_agendados,     convLabel:"Rapport → Consulta agendada"},
                        {label:"Presentados",          value:funnelNuevo.etapas.presentados, color:"#10b981", conv:funnelNuevo.conversiones.agendados_presentados,  convLabel:"Consulta → Presentados"},
                        {label:"Honorarios aceptados", value:funnelNuevo.etapas.vendidos,    color:"#8b5cf6", conv:funnelNuevo.conversiones.presentados_vendidos,   convLabel:"Presentados → Honorarios"},
                      ];
                      const max = Math.max(...etapas.map(e=>e.value), 1);
                      return etapas.map((etapa, i) => {
                        const pct = Math.round((etapa.value / max) * 100);
                        const convColor = etapa.conv >= 50 ? "#10b981" : etapa.conv >= 25 ? "#f59e0b" : "#ef4444";
                        return (
                          <div key={i} style={{marginBottom:12}}>
                            {etapa.conv !== null && etapa.conv > 0 && (
                              <div style={{paddingLeft:2,marginBottom:4,marginTop:2}}>
                                <span style={{fontSize:10,color:convColor,fontWeight:500}}>
                                  ↓ {etapa.conv}% {etapa.convLabel}
                                </span>
                              </div>
                            )}
                            <div style={{display:"flex",justifyContent:"space-between",marginBottom:4,fontSize:12}}>
                              <span style={{fontWeight:600,color:etapa.color}}>{etapa.label}</span>
                              <span style={{color:C.muted,fontWeight:600}}>{etapa.value}</span>
                            </div>
                            <div style={{background:C.border,borderRadius:2,height:8,overflow:"hidden"}}>
                              <div style={{width:etapa.value>0?`${pct}%`:"0%",height:"100%",background:etapa.color,borderRadius:4,transition:"width .6s ease",minWidth:0}}/>
                            </div>
                          </div>
                        );
                      });
                    })()}

                    {/* Métricas globales abajo */}
                    <div style={{display:"flex",gap:12,marginTop:20,flexWrap:"wrap"}}>
                      <div style={{flex:1,minWidth:120,textAlign:"center",padding:"10px 8px",background:C.bg,borderRadius:2,border:`1px solid ${C.border}`}}>
                        <div style={{fontSize:18,fontWeight:700,color:"#f59e0b"}}>{funnelNuevo.showrate}%</div>
                        <div style={{fontSize:10,color:C.muted,marginTop:2}}>Showrate</div>
                      </div>
                      <div style={{flex:1,minWidth:120,textAlign:"center",padding:"10px 8px",background:C.bg,borderRadius:2,border:`1px solid ${C.border}`}}>
                        <div style={{fontSize:18,fontWeight:700,color:"#8b5cf6"}}>{funnelNuevo.conversiones.global}%</div>
                        <div style={{fontSize:10,color:C.muted,marginTop:2}}>Conversión global</div>
                      </div>
                    </div>

                    {/* Desglose por fuente */}
                    {funnelNuevo.fuentes && funnelNuevo.fuentes.length > 0 && (
                      <div style={{marginTop:16,background:C.bg,borderRadius:2,padding:"12px 14px",border:`1px solid ${C.border}`}}>
                        <div style={{fontSize:12,fontWeight:600,marginBottom:10,color:C.muted}}>📊 Prospectos por fuente</div>
                        {funnelNuevo.fuentes.map((f,i)=>{
                          const icon = f.fuente==='meta'?'🟢':f.fuente==='google'?'🔵':f.fuente==='directo'?'⚪':'🟣';
                          const label = f.fuente==='meta'?'Meta Ads':f.fuente==='google'?'Google Ads':f.fuente==='directo'?'Directo':f.fuente;
                          const maxP = Math.max(...funnelNuevo.fuentes.map(x=>x.prospectos));
                          const pct = maxP > 0 ? (f.prospectos/maxP)*100 : 0;
                          return (
                            <div key={i} style={{marginBottom:i<funnelNuevo.fuentes.length-1?10:0}}>
                              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
                                <div style={{display:"flex",alignItems:"center",gap:6}}>
                                  <span style={{fontSize:12}}>{icon}</span>
                                  <span style={{fontSize:12,fontWeight:500,textTransform:"capitalize"}}>{label}</span>
                                </div>
                                <div style={{display:"flex",gap:12,fontSize:11,color:C.muted}}>
                                  <span>{f.prospectos} leads</span>
                                  <span style={{color:"#4ade80"}}>{f.conversion}% conv.</span>
                                </div>
                              </div>
                              <div style={{background:C.border,borderRadius:4,height:5,overflow:"hidden"}}>
                                <div style={{width:`${pct}%`,height:"100%",background:f.fuente==='meta'?"#22c55e":f.fuente==='google'?"#3b82f6":f.fuente==='directo'?"#64748b":"#8b5cf6",borderRadius:4,transition:"width .6s ease"}}/>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Tratamientos este mes */}
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:10,marginBottom:16}}>
                    {[
                      {label:"Prospectos totales", value:pacientes.length, icon:"👥", color:C.accent},
                      {label:"Turnos este mes",   value:tratCount.este_mes||0, icon:"📅", color:"#3b82f6"},
                      {label:"Realizados",         value:tratCount.realizados||0, icon:"✅", color:C.green},
                      {label:"No-shows",           value:tratCount.no_shows||0, icon:"🔴", color:"#ef4444"},
                    ].map((s,i)=>(
                      <div key={i} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:"14px 16px"}}>
                        <div style={{fontSize:18,marginBottom:4}}>{s.icon}</div>
                        <div style={{fontSize:22,fontWeight:700,color:s.color,fontFamily:"'DM Mono',monospace"}}>{s.value}</div>
                        <div style={{fontSize:11,color:C.muted,marginTop:4,fontWeight:500}}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div style={{textAlign:"center",padding:40}}>
                  <button onClick={()=>fetchFunnelNuevo(funnelMes,funnelAño)}
                    style={{background:C.accent,border:"none",borderRadius:4,padding:"10px 24px",color:"white",fontSize:13,fontWeight:600,cursor:"pointer"}}>
                    Cargar funnel
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Pacientes */}
        {activeTab === "prospectos" && (
          <div style={{flex:1,display:"flex",overflow:"hidden"}}>
            <div style={isMobile && selPac ? {display:"none"} : isMobile ? {flex:1,display:"flex",flexDirection:"column"} : {width:300,borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column"}}>
              <div style={{padding:"12px 14px",borderBottom:`1px solid ${C.border}`,display:"flex",flexDirection:"column",gap:8}}>
                <div style={{display:"flex",gap:8}}>
                  <input value={searchQ} onChange={e=>{setSearchQ(e.target.value);fetchPacientes(e.target.value);}}
                    placeholder="Buscar nombre, doc..."
                    style={{flex:1,background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"7px 12px",color:C.text,fontSize:12,fontFamily:"inherit"}}/>
                  <Btn onClick={()=>{setShowNuevoTurno(true);setTurnoStep("buscar");setTurnoPaciente(null);setTurnoSearch("");setTurnoSearchRes([]);setFormTurno(FORM_TURNO_INIT);}} small>+ Nuevo cliente</Btn>
                </div>
                <button onClick={()=>{const nd=!filtroDeuda;setFiltroDeuda(nd);fetchPacientes(searchQ,nd);}}
                  style={{display:"flex",alignItems:"center",gap:6,padding:"5px 10px",borderRadius:4,border:`1px solid ${filtroDeuda?"#ef4444":C.border}`,background:filtroDeuda?"rgba(239,68,68,0.1)":"transparent",color:filtroDeuda?"#ef4444":C.muted,fontSize:11,cursor:"pointer",fontWeight:filtroDeuda?600:400,width:"fit-content"}}>
                  💰 {filtroDeuda?"Con deuda (activo)":"Filtrar con deuda"}
                </button>
              </div>
              <div style={{overflowY:"auto",flex:1}}>
                {pacientes.length === 0 ? (
                  <div style={{padding:24,textAlign:"center",color:C.muted,fontSize:13}}>Sin clientes registrados</div>
                ) : pacientes.map(p => (
                  <div key={p.id} className="pi" onClick={()=>setSelPac(p)}
                    style={{padding:"12px 14px",borderBottom:`1px solid ${C.border}`,background:selPac?.id===p.id?C.accentGlow:"transparent",cursor:"pointer"}}>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:6}}>
                      <div style={{fontWeight:600,fontSize:13,marginBottom:3,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.nombre}</div>
                      {parseFloat(p.deuda_pendiente)>0 && (
                        <span style={{fontSize:10,padding:"2px 6px",borderRadius:4,background:"rgba(239,68,68,0.15)",color:"#ef4444",fontWeight:600,flexShrink:0,whiteSpace:"nowrap"}}>
                          💰 {p.deuda_moneda||"$"} {parseFloat(p.deuda_pendiente).toLocaleString("es-AR")}
                        </span>
                      )}
                    </div>
                    <div style={{fontSize:11,color:C.muted,display:"flex",gap:8}}>
                      {p.telefono && <span>📱 {p.telefono}</span>}
                      {p.documento && <span>🪪 {p.documento}</span>}
                    </div>
                    {p.ultimo_tratamiento && <div style={{fontSize:11,color:C.accent,marginTop:3}}>Último: {p.ultimo_tratamiento}</div>}
                  </div>
                ))}
              </div>
            </div>


            {pacDet ? (
              <div style={{flex:1,overflowY:"auto",padding:isMobile?12:24}}>
                {isMobile && <button onClick={()=>setSelPac(null)} style={{display:"flex",alignItems:"center",gap:6,background:"transparent",border:`1px solid ${C.border}`,color:C.muted,borderRadius:4,padding:"6px 14px",fontSize:12,cursor:"pointer",marginBottom:14}}>Volver</button>}
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <div style={{fontSize:18,fontWeight:700}}>{pacDet.nombre}</div>
                    {pacDet.historial?.some(h=>h.estado_pago==="pendiente"||h.estado_pago==="parcial") && (() => {
                      const deuda = pacDet.historial.filter(h=>h.estado_pago==="pendiente"||h.estado_pago==="parcial").reduce((acc,h)=>acc+parseFloat(h.monto||0),0);
                      const moneda = pacDet.historial.find(h=>h.estado_pago!=="pagado")?.moneda||"$";
                      return deuda > 0 ? (
                        <span style={{fontSize:11,padding:"3px 8px",borderRadius:2,background:"rgba(239,68,68,0.12)",color:"#ef4444",fontWeight:600,border:"1px solid rgba(239,68,68,0.2)"}}>
                          💰 Deuda: {moneda} {deuda.toLocaleString("es-AR")}
                        </span>
                      ) : null;
                    })()}
                  </div>
                  <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                    <button onClick={()=>setConsentimientoModal({paciente:pacDet})}
                      style={{padding:'6px 14px',borderRadius:4,border:`1px solid ${C.border}`,background:'transparent',color:C.muted,fontSize:12,cursor:'pointer'}}>
                      📝 Consentimiento
                    </button>
                    <button onClick={async()=>{
                      setLoadingPortal(true);
                      try {
                        const r = await fetch(`${API}/api/pacientes/${pacDet.id}/portal-token`, { method:'POST', headers:jH() });
                        if (r.ok) { const d = await r.json(); setPortalLink(d.link); }
                      } catch(e) {}
                      setLoadingPortal(false);
                    }} style={{padding:'6px 14px',borderRadius:4,border:`1px solid ${C.border}`,background:'transparent',color:C.muted,fontSize:12,cursor:'pointer'}}>
                      {loadingPortal ? '...' : '🔗 Portal'}
                    </button>
                    <Btn onClick={()=>{setShowNuevoTurno(true);setTurnoStep("turno");setTurnoPaciente(pacDet);setFormTurno(FORM_TURNO_INIT);}} small>+ Nuevo turno</Btn>
                  </div>
                  {/* Link portal */}
                  {portalLink && (
                    <div style={{marginTop:8,background:"rgba(99,102,241,0.08)",border:`1px solid ${C.accent}44`,borderRadius:4,padding:"10px 14px",display:"flex",alignItems:"center",gap:8}}>
                      <div style={{flex:1,fontSize:11,color:C.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{portalLink}</div>
                      <button onClick={()=>navigator.clipboard.writeText(portalLink).catch(()=>{})}
                        style={{padding:"4px 10px",borderRadius:2,border:`1px solid ${C.border}`,background:"transparent",color:C.accentLight,fontSize:11,cursor:"pointer",flexShrink:0}}>
                        📋 Copiar
                      </button>
                      {pacDet?.telefono && (
                        <button onClick={async()=>{
                          const texto = `Hola ${pacDet.nombre}! Podés ver tus turnos, resultados y consentimientos desde tu portal personal: ${portalLink}`;
                          await fetch(`${API}/api/enviar-mensaje`, { method:'POST', headers:jH(), body:JSON.stringify({ telefono:pacDet.telefono, texto, cliente_id:client.id }) }).catch(()=>{});
                        }} style={{padding:"4px 10px",borderRadius:2,border:`1px solid ${C.border}`,background:"transparent",color:"#10b981",fontSize:11,cursor:"pointer",flexShrink:0}}>
                          📱 Enviar WA
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div style={{display:"flex",gap:16,flexWrap:"wrap",marginBottom:20}}>
                  {pacDet.telefono && <span style={{fontSize:13,color:C.muted}}>📱 {pacDet.telefono}</span>}
                  {pacDet.documento && <span style={{fontSize:13,color:C.muted}}>🪪 {pacDet.documento}</span>}
                  {pacDet.email && <span style={{fontSize:13,color:C.muted}}>✉️ {pacDet.email}</span>}
                  {pacDet.notas && <span style={{fontSize:13,color:C.muted}}>🏥 {pacDet.notas}</span>}
                  {pacDet.fecha_nacimiento && (() => {
                    const nac = new Date(pacDet.fecha_nacimiento+'T12:00:00');
                    const hoy = new Date();
                    let proxCumple = new Date(hoy.getFullYear(), nac.getMonth(), nac.getDate());
                    if (proxCumple < hoy) proxCumple.setFullYear(hoy.getFullYear()+1);
                    const dias = Math.ceil((proxCumple-hoy)/(1000*60*60*24));
                    return <span style={{fontSize:13,color:dias===0?C.green:C.muted}}>🎂 {nac.toLocaleDateString("es-AR",{day:"numeric",month:"long"})}{dias===0?" · ¡Hoy!":dias<=7?` · en ${dias} dias`:""}</span>;
                  })()}
                </div>
                {pacDet.notas && <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:14,marginBottom:20,fontSize:13,color:C.muted}}>{pacDet.notas}</div>}

                {/* Valoraciones grabadas — solo Pro */}
                {plan === 'pro' && (
                  <ValoracionesPaciente paciente={pacDet} client={client} API={API} aH={aH} jH={jH} user={user}/>
                )}

                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                  <div style={{fontSize:11,color:C.muted,textTransform:"uppercase",letterSpacing:".8px",fontWeight:500}}>Historial</div>
                  <button onClick={()=>{setResContextPac(pacDet);setFormRes({paciente_id:pacDet.id,tratamiento_id:"",tratamiento_libre:"",fecha:"",nota:""});setFotoAntes(null);setFotoDespues(null);setFotoAntesURL("");setFotoDespuesURL("");setShowNuevoRes(true);}}
                    style={{background:"transparent",border:`1px solid ${C.border}`,color:C.muted,borderRadius:2,padding:"3px 10px",fontSize:11,cursor:"pointer"}}>📷 + Resultado</button>
                </div>
                {!(pacDet.historial?.length) ? (
                  <div style={{color:C.muted,fontSize:13}}>Sin tratamientos registrados</div>
                ) : pacDet.historial.map((h,i) => (
                  <div key={i} style={{display:"flex",gap:12,marginBottom:12,paddingBottom:12,borderBottom:`1px solid ${C.border}`}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:h.estado==="realizado"?C.green:C.accent,marginTop:4,flexShrink:0}}/>
                    <div>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                        <div>
                          <div style={{fontWeight:600,fontSize:13}}>{h.tratamiento}</div>
                          <div style={{fontSize:11,color:C.muted}}>
                            {h.fecha && new Date((h.fecha+'').slice(0,10)+'T12:00:00').toLocaleDateString("es-AR",{day:"numeric",month:"long",year:"numeric"})}
                            {h.hora && ` · ${h.hora.slice(0,5)}hs`}
                            {h.profesional && ` · ${h.profesional}`}
                          </div>
                          <div style={{display:"flex",gap:6,marginTop:3,flexWrap:"wrap"}}>
                            {h.monto > 0 && <span style={{fontSize:10,color:C.muted}}>{h.moneda} {parseFloat(h.monto).toLocaleString("es-AR")}</span>}
                            <span style={{fontSize:10,padding:"1px 6px",borderRadius:4,fontWeight:600,
                              background:h.estado_turno==="realizado"?"rgba(16,185,129,0.12)":h.estado_turno==="no_show"?"rgba(239,68,68,0.12)":h.estado_turno==="cancelado"?"rgba(100,116,139,0.12)":"rgba(99,102,241,0.12)",
                              color:h.estado_turno==="realizado"?C.green:h.estado_turno==="no_show"?C.red:h.estado_turno==="cancelado"?C.muted:C.accent}}>
                              {h.estado_turno==="realizado"?"Realizado":h.estado_turno==="no_show"?"No se presentó":h.estado_turno==="cancelado"?"Cancelado":"Pendiente"}
                            </span>
                            <span style={{fontSize:10,padding:"1px 6px",borderRadius:4,background:"rgba(100,116,139,0.1)",color:C.muted}}>
                              {h.estado_pago==="pagado"?"✓ Pagado":h.estado_pago==="parcial"?"Parcial":"Pendiente pago"}
                            </span>
                          </div>
                        </div>
                        <div style={{display:'flex',gap:6,flexShrink:0}}>
                          <button onClick={()=>setFichaModal({turno:h, paciente:pacDet})}
                            style={{background:fichasCache[h.id]?"rgba(99,102,241,0.12)":"transparent",border:`1px solid ${fichasCache[h.id]?C.accent:C.border}`,color:fichasCache[h.id]?C.accentLight:C.muted,borderRadius:2,padding:"3px 8px",fontSize:11,cursor:"pointer",whiteSpace:"nowrap"}}>
                            📋 Ficha
                          </button>
                          <button onClick={()=>abrirEditTurno(h)} style={{background:"transparent",border:`1px solid ${C.border}`,color:C.muted,borderRadius:4,padding:"3px 8px",fontSize:11,cursor:"pointer",whiteSpace:"nowrap"}}>✏ Editar</button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {/* Mensaje manual desde perfil paciente */}
                {pacDet?.telefono && (
                  <div style={{marginTop:20,background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:16}}>
                    <div style={{fontSize:11,color:C.muted,textTransform:"uppercase",letterSpacing:".8px",fontWeight:500,marginBottom:10}}>Enviar mensaje por WhatsApp</div>
                    <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:8}}>
                      {PLANTILLAS_RAPIDAS.map((p,i)=>(
                        <button key={i} onClick={()=>{setPlantillaRapida(p.label);setMsgManual(p.texto);}}
                          style={{padding:"3px 10px",borderRadius:2,border:`1px solid ${plantillaRapida===p.label?C.accent:C.border}`,background:plantillaRapida===p.label?C.accentGlow:"transparent",color:plantillaRapida===p.label?C.accentLight:C.muted,fontSize:10,cursor:"pointer",whiteSpace:"nowrap"}}>
                          {p.label}
                        </button>
                      ))}
                    </div>
                    <div style={{display:"flex",gap:8,alignItems:"flex-end"}}>
                      <textarea
                        value={msgManual}
                        onChange={e=>{setMsgManual(e.target.value);setPlantillaRapida("");}}
                        onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();enviarMensajeManual(pacDet.telefono);}}}
                        placeholder="Escribí un mensaje..."
                        rows={2}
                        style={{flex:1,background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"8px 12px",color:C.text,fontSize:13,fontFamily:"inherit",resize:"none",outline:"none"}}
                      />
                      <button
                        onClick={()=>enviarMensajeManual(pacDet.telefono)}
                        disabled={enviandoMsg||!msgManual.trim()}
                        style={{width:38,height:38,borderRadius:4,border:"none",background:msgManual.trim()?C.accent:C.border,color:"white",fontSize:18,cursor:msgManual.trim()?"pointer":"default",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"background .2s"}}>
                        {enviandoMsg?"…":"➤"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Resultados en ficha */}
                {pacDet && (() => {
                  const resP = resultados.filter(r=>r.paciente_id===pacDet.id);
                  if (resP.length === 0) return null;
                  return (
                    <div style={{marginTop:20}}>
                      <div style={{fontSize:11,color:C.muted,textTransform:"uppercase",letterSpacing:".8px",fontWeight:500,marginBottom:12}}>Antes y Después</div>
                      <div style={{display:"flex",flexDirection:"column",gap:12}}>
                        {resP.map((res,i)=>(
                          <div key={i} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:12}}>
                            <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                              <div>
                                <div style={{fontSize:12,fontWeight:600}}>{res.tratamiento||"Servicio"}</div>
                                <div style={{fontSize:11,color:C.muted}}>{res.fecha && new Date(res.fecha+'T12:00:00').toLocaleDateString("es-AR",{day:"numeric",month:"long",year:"numeric"})}</div>
                              </div>
                              <button onClick={async()=>{await fetch(`${API}/api/resultados/${res.id}`,{method:"DELETE",headers:aH()});fetchResultados();const upd=await fetch(`${API}/api/pacientes/${pacDet.id}`,{headers:aH()}).then(r=>r.json());setPacDet(upd);}}
                                style={{background:"transparent",border:"none",color:C.muted,cursor:"pointer",fontSize:13}}>×</button>
                            </div>
                            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                              {res.foto_antes && (
                                <div>
                                  <div style={{fontSize:10,color:C.muted,marginBottom:4,textTransform:"uppercase",letterSpacing:".5px"}}>Antes</div>
                                  <img src={res.foto_antes} alt="antes" style={{width:"100%",borderRadius:4,objectFit:"cover",maxHeight:160}}/>
                                </div>
                              )}
                              {res.foto_despues && (
                                <div>
                                  <div style={{fontSize:10,color:C.muted,marginBottom:4,textTransform:"uppercase",letterSpacing:".5px"}}>Después</div>
                                  <img src={res.foto_despues} alt="después" style={{width:"100%",borderRadius:4,objectFit:"cover",maxHeight:160}}/>
                                </div>
                              )}
                            </div>
                            {res.nota && <div style={{fontSize:12,color:C.muted,marginTop:8}}>{res.nota}</div>}
                            {res.subido_por && <div style={{fontSize:10,color:C.muted,marginTop:4}}>Subido por {res.subido_por}</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
                {/* Pagos en ficha - simplificado */}
                {pacDet && (() => {
                  const planes = planesP.filter(p=>p.paciente_id===pacDet.id);
                  return (
                    <div style={{marginTop:20}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                        <div style={{fontSize:11,color:C.muted,textTransform:"uppercase",letterSpacing:".8px",fontWeight:500}}>Pagos</div>
                        <button onClick={()=>abrirPago(pacDet)}
                          style={{background:"transparent",border:`1px solid ${C.border}`,color:C.muted,borderRadius:2,padding:"3px 10px",fontSize:11,cursor:"pointer"}}>+ Registrar pago</button>
                      </div>
                      {planes.length === 0
                        ? <div style={{fontSize:12,color:C.muted,padding:"12px 0"}}>Sin pagos registrados</div>
                        : planes.map((pl,i) => {
                            const pct = pl.total_sesiones > 0 ? Math.round((pl.sesiones_pagas/pl.total_sesiones)*100) : 0;
                            const saldo = parseFloat(pl.monto_total) - parseFloat(pl.monto_pagado);
                            const estadoColor = pl.estado==="pagado" ? C.green : pl.estado==="parcial" ? "#f59e0b" : C.red;
                            return (
                              <div key={i} style={{background:C.bg,border:`1px solid ${C.border}`,borderLeft:`3px solid ${estadoColor}`,borderRadius:2,padding:"12px 14px",marginBottom:10}}>
                                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                                  <div>
                                    <div style={{fontWeight:600,fontSize:13}}>{pl.tratamiento}</div>
                                    <div style={{fontSize:11,color:C.muted,marginTop:2}}>
                                      {pl.moneda} {parseFloat(pl.monto_total).toLocaleString("es-AR")} · {pl.sesiones_pagas}/{pl.total_sesiones} sesiones
                                    </div>
                                  </div>
                                  <div style={{display:"flex",gap:6,alignItems:"center"}}>
                                    <span style={{fontSize:10,padding:"3px 8px",borderRadius:4,background:`${estadoColor}22`,color:estadoColor,fontWeight:600}}>
                                      {pl.estado==="pagado"?"✓ Pagado":pl.estado==="parcial"?"Parcial":"Pendiente"}
                                    </span>
                                    {pl.estado !== "pagado" && (
                                      <button onClick={()=>abrirPago(pacDet, pl)}
                                        style={{background:C.accentGlow,border:`1px solid ${C.accent}`,color:C.accent,borderRadius:2,padding:"3px 10px",fontSize:11,cursor:"pointer",fontWeight:600}}>
                                        + Pagar
                                      </button>
                                    )}
                                    <button onClick={async()=>{await fetch(`${API}/api/planes-pago/${pl.id}`,{method:"DELETE",headers:aH()});fetchPlanesPago();}}
                                      style={{background:"transparent",border:`1px solid ${C.border}`,color:C.muted,borderRadius:2,padding:"3px 8px",fontSize:11,cursor:"pointer"}}>×</button>
                                  </div>
                                </div>
                                <div style={{background:C.surface,borderRadius:4,height:5,overflow:"hidden",marginBottom:6}}>
                                  <div style={{width:`${pct}%`,height:"100%",background:estadoColor,borderRadius:4,transition:"width .4s"}}/>
                                </div>
                                <div style={{fontSize:11,color:C.muted,display:"flex",justifyContent:"space-between"}}>
                                  <span>Pagado: <strong style={{color:C.text}}>{pl.moneda} {parseFloat(pl.monto_pagado).toLocaleString("es-AR")}</strong></span>
                                  {saldo > 0 && <span>Saldo: <strong style={{color:C.red}}>{pl.moneda} {saldo.toLocaleString("es-AR")}</strong></span>}
                                </div>
                              </div>
                            );
                          })
                      }
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",color:C.muted,fontSize:13}}>Seleccioná un prospecto</div>
            )}



          </div>
        )}

        {/* -- MÓDULO DOCTOR -- */}
        {activeTab === "doctor" && (
          <DoctorModule C={C} clienteId={client?.id} />
        )}

        {/* -- DASHBOARD / INICIO -- */}
        {activeTab === "inicio" && (() => {
          const d = dashboard;
          const mes = new Date().toLocaleDateString("es-AR",{month:"long",year:"numeric"});
          const fmtNum = n => (n||0).toLocaleString("es-AR");
          const fmtMoney = n => `$${(n||0).toLocaleString("es-AR",{maximumFractionDigits:0})}`;
          const pctBadge = (n) => {
            const v = parseFloat(n)||0;
            const color = v >= 0 ? "#10b981" : "#ef4444";
            const arrow = v >= 0 ? "^" : "v";
            return <span style={{fontSize:11,color,fontWeight:600,marginLeft:6}}>{arrow}{Math.abs(v)}%</span>;
          };

          const Card = ({icon,label,value,sub,pct,color}) => (
            <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:isMobile?"14px 16px":"24px 28px",flex:1,minWidth:isMobile?"calc(50% - 6px)":160}}>
              <div style={{fontSize:11,fontWeight:500,color:C.textMuted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>{label}</div>
              <div style={{width:32,height:1,background:C.accent,marginBottom:12}}/>
              <div style={{fontSize:isMobile?24:48,fontWeight:700,color:C.text,lineHeight:1.1,marginBottom:8,fontFamily:TYPOGRAPHY.fontDisplay,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                {value}
              </div>
              {pct !== undefined && <div style={{marginBottom:4}}>{pctBadge(pct)}</div>}
              {sub && <div style={{fontSize:11,color:C.textMuted,marginTop:4}}>{sub}</div>}
            </div>
          );

          // Mini sparkline de turnos (últimos 30 dias)
          const dias = d?.turnos_por_dia || [];
          const maxCant = Math.max(...dias.map(d=>parseInt(d.cant)),1);
          const W = 280; const H = 48;

          return (
            <div style={{flex:1,overflowY:"auto",padding:isMobile?12:24}}>
              <div style={{maxWidth:1000,margin:"0 auto"}}>

                {/* Header */}
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:8,minHeight:56,borderBottom:`1px solid ${C.border}`,paddingBottom:16}}>
                  <div>
                    <div style={{fontSize:isMobile?16:20,fontWeight:600,fontFamily:TYPOGRAPHY.fontDisplay,color:C.text}}>Dashboard</div>
                    <div style={{fontSize:11,color:C.textMuted,marginTop:2}}>{mes} · {client?.nombre}</div>
                  </div>
                  <button onClick={fetchDashboard} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:4,padding:"7px 14px",color:C.muted,fontSize:12,cursor:"pointer"}}>
                    {loadingDash ? "..." : "↻"}
                  </button>
                </div>

                {/* Alertas activas */}
                {(d?.solicitudes_pendientes > 0) && (
                  <div onClick={()=>setActiveTab("conversations")} style={{background:"rgba(249,115,22,0.08)",border:"1.5px solid #f97316",borderRadius:4,padding:"12px 16px",marginBottom:20,cursor:"pointer",display:"flex",alignItems:"center",gap:10}}>
                    <div style={{width:10,height:10,borderRadius:"50%",background:"#f97316",animation:"pulse 1.5s infinite"}}/>
                    <div style={{fontSize:13,fontWeight:600,color:"#f97316"}}>
                      {d.solicitudes_pendientes} solicitud{d.solicitudes_pendientes>1?"es":""} de turno esperando confirmación
                    </div>
                    <div style={{marginLeft:"auto",fontSize:12,color:"#f97316"}}>Ver -></div>
                  </div>
                )}

                {/* KPIs fila 1 */}
                {loadingDash && !d ? (
                  <div style={{textAlign:"center",color:C.muted,padding:60,fontSize:13}}>Cargando métricas...</div>
                ) : !d ? (
                  <div style={{textAlign:"center",color:C.muted,padding:60,fontSize:13}}>
                    <div style={{marginBottom:8}}>⚠️ No se pudieron cargar las métricas</div>
                    <button onClick={fetchDashboard} style={{background:C.accent,border:"none",borderRadius:4,padding:"8px 16px",color:"white",fontSize:12,cursor:"pointer"}}>Reintentar</button>
                  </div>
                ) : d ? (<>

                <div style={{display:"flex",gap:12,marginBottom:12,flexWrap:"wrap"}}>
                  {/* Consultas este mes con mini breakdown */}
                  <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:isMobile?14:20,flex:1,minWidth:isMobile?"calc(50% - 6px)":200}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                      <div style={{width:34,height:34,borderRadius:4,background:"#6366f122",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>⚖️</div>
                      <div style={{fontSize:12,color:C.muted,fontWeight:500}}>Consultas este mes</div>
                    </div>
                    <div style={{fontSize:isMobile?18:24,fontWeight:700,color:C.text,lineHeight:1.2,marginBottom:4}}>{fmtNum(d.turnos.mes)}</div>
                    {d.turnos.pct_cambio !== undefined && <div style={{marginBottom:8}}>{(() => { const v=parseFloat(d.turnos.pct_cambio)||0; return <span style={{fontSize:11,color:v>=0?"#10b981":"#ef4444",fontWeight:600}}>{v>=0?"^":"v"}{Math.abs(v)}%</span>; })()}</div>}
                    <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                      {[{l:"💰 Paga",v:d.consultas_breakdown?.paga||0,c:"#10b981"},{l:"🆓 Gratis",v:d.consultas_breakdown?.gratis||0,c:C.muted},{l:"🤝 Seña",v:d.consultas_breakdown?.seña||0,c:C.accentLight}].map((t,i)=>(
                        <div key={i} style={{fontSize:10,padding:"3px 8px",borderRadius:2,background:C.bg,border:`1px solid ${C.border}`,color:t.c,fontWeight:600,whiteSpace:"nowrap"}}>{t.l} {t.v}</div>
                      ))}
                    </div>
                  </div>
                  <Card icon="💰" label="Facturado este mes" value={fmtMoney(d.facturacion.mes)} pct={d.facturacion.pct_cambio}
                    sub={`Total acumulado: ${fmtMoney(d.facturacion.total)}`} color="#10b981"/>
                  <Card icon="💬" label="Leads del bot" value={fmtNum(d.prospectos.mes)} pct={d.prospectos.pct_cambio}
                    sub={`${d.prospectos.convertidos} convertidos · ${d.prospectos.tasa_conversion}% conversión`} color="#f59e0b"/>
                  <Card icon="📁" label="Casos este mes" value={fmtNum(d.casos_nuevos_mes||d.pacientes_nuevos_mes)}
                    sub="Nuevos clientes" color="#8b5cf6"/>
                </div>

                {/* Fila 2 - gráfico + próximos turnos */}
                <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>

                  {/* Gráfico turnos 30 dias */}
                  <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:20,flex:1,minWidth:280}}>
                    <div style={{fontSize:13,fontWeight:600,marginBottom:4}}>Consultas - últimos 30 días</div>
                    <div style={{fontSize:11,color:C.muted,marginBottom:16}}>Barras diarias</div>
                    {dias.length === 0 ? (
                      <div style={{textAlign:"center",color:C.muted,fontSize:12,padding:"20px 0"}}>Sin datos</div>
                    ) : (
                      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} style={{overflow:"visible"}}>
                        {dias.map((dia,i) => {
                          const x = (i/dias.length)*W;
                          const bw = Math.max((W/dias.length)-2, 2);
                          const cant = parseInt(dia.cant);
                          const bh = (cant/maxCant)*(H-8);
                          return (
                            <g key={i}>
                              <rect x={x} y={H-bh} width={bw} height={bh} rx={2}
                                fill={`${C.accent}88`} />
                            </g>
                          );
                        })}
                      </svg>
                    )}
                    <div style={{display:"flex",justifyContent:"space-between",marginTop:8}}>
                      <span style={{fontSize:10,color:C.muted}}>hace 30 dias</span>
                      <span style={{fontSize:10,color:C.muted}}>hoy</span>
                    </div>
                  </div>

                  {/* Próximos turnos */}
                  <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:20,flex:1.4,minWidth:300}}>
                    <div style={{fontSize:13,fontWeight:600,marginBottom:4}}>Próximas consultas</div>
                    <div style={{fontSize:11,color:C.muted,marginBottom:14}}>{d.proximos_turnos.length} consultas en los próximos 7 días</div>
                    {d.proximos_turnos.length === 0 ? (
                      <div style={{textAlign:"center",color:C.muted,fontSize:12,padding:"20px 0"}}>Sin turnos próximos</div>
                    ) : d.proximos_turnos.map((t,i) => {
                      const fecha = new Date((t.fecha+'').slice(0,10)+"T12:00:00").toLocaleDateString("es-AR",{weekday:"short",day:"numeric",month:"short"});
                      const hora = (t.hora||"").substring(0,5);
                      return (
                        <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:i<d.proximos_turnos.length-1?`1px solid ${C.border}`:"none"}}>
                          <div style={{width:40,textAlign:"center",flexShrink:0}}>
                            <div style={{fontSize:10,color:C.muted,textTransform:"uppercase"}}>{fecha.split(" ")[0]}</div>
                            <div style={{fontSize:13,fontWeight:700,color:C.accentLight}}>{hora}</div>
                          </div>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:12,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.paciente_nombre||"-"}</div>
                            <div style={{fontSize:11,color:C.muted}}>{t.tratamiento||"-"}{t.profesional?` · ${t.profesional}`:""}</div>
                          </div>
                          <div style={{fontSize:10,color:C.muted,flexShrink:0}}>{fecha.split(" ").slice(1).join(" ")}</div>
                        </div>
                      );
                    })}
                  </div>

                </div>

                {/* Fila 3 - funnel del período */}
                {["plus","pro"].includes(plan) && (
                  <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:20,marginTop:12}}>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:8}}>
                      <div style={{fontSize:13,fontWeight:600}}>Funnel del período</div>
                      <button onClick={()=>fetchFunnelNuevo(funnelMes,funnelAño)}
                        style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:2,padding:"4px 10px",color:C.muted,fontSize:11,cursor:"pointer"}}>
                        {funnelLoading?"...":"↻"}
                      </button>
                    </div>
                    {funnelNuevo?.etapas ? (
                      <>
                        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
                          {[
                            {label:"Potenciales clientes", value:funnelNuevo.etapas.prospectos,  color:"#6366f1"},
                            {label:"Rapport",              value:funnelNuevo.etapas.rapport,     color:"#3b82f6"},
                            {label:"Consulta agendada",    value:funnelNuevo.etapas.agendados,   color:"#f59e0b"},
                            {label:"Presentados",          value:funnelNuevo.etapas.presentados, color:"#10b981"},
                            {label:"Honorarios aceptados", value:funnelNuevo.etapas.vendidos,    color:"#8b5cf6"},
                          ].map((e,i)=>(
                            <div key={i} style={{flex:1,minWidth:90,textAlign:"center",padding:"10px 6px",background:C.bg,borderRadius:2,border:`1px solid ${C.border}`}}>
                              <div style={{fontSize:20,fontWeight:700,color:e.color}}>{e.value}</div>
                              <div style={{fontSize:10,color:C.muted,marginTop:3}}>{e.label}</div>
                            </div>
                          ))}
                        </div>
                        <div style={{display:"flex",gap:16}}>
                          <div style={{fontSize:12,color:C.muted}}>Showrate: <span style={{color:"#f59e0b",fontWeight:600}}>{funnelNuevo.showrate}%</span></div>
                          <div style={{fontSize:12,color:C.muted}}>Conversión global: <span style={{color:"#8b5cf6",fontWeight:600}}>{funnelNuevo.conversiones.global}%</span></div>
                        </div>
                      </>
                    ) : (
                      <div style={{textAlign:"center",color:C.muted,fontSize:12,padding:"12px 0"}}>
                        <button onClick={()=>fetchFunnelNuevo(funnelMes,funnelAño)}
                          style={{background:C.accent,border:"none",borderRadius:4,padding:"7px 18px",color:"white",fontSize:12,cursor:"pointer",fontWeight:600}}>
                          Cargar funnel
                        </button>
                      </div>
                    )}
                  </div>
                )}

                </>) : null}

              </div>
            </div>
          );
        })()}

        {/* Calendario */}
        {activeTab === "calendario" && (
          <div style={{flex:1,overflowY:"auto",padding:isMobile?10:24,position:"relative"}}>
            <div style={{maxWidth:1040,margin:"0 auto"}}>

              {/* Alerta solicitudes pendientes */}
              {solicitudesPendientes > 0 && (
                <div onClick={()=>setActiveTab("conversations")} style={{background:"rgba(249,115,22,0.08)",border:"1.5px solid #f97316",borderRadius:4,padding:"10px 14px",marginBottom:14,cursor:"pointer",display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:"#f97316",animation:"pulse 1.5s infinite",flexShrink:0}}/>
                  <div style={{fontSize:13,fontWeight:600,color:"#f97316",flex:1}}>
                    {solicitudesPendientes} solicitud{solicitudesPendientes>1?"es":""} esperando confirmación
                  </div>
                  <div style={{fontSize:12,color:"#f97316"}}>Ver -></div>
                </div>
              )}

              {/* Header */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:10}}>
                <div style={{fontSize:16,fontWeight:700}}>Calendario</div>
                <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                  <div style={{display:"flex",background:C.bg,borderRadius:2,border:`1px solid ${C.border}`,overflow:"hidden"}}>
                    {[["dia","Día"],["semanal","Semana"],["mensual","Mes"]].map(([v,l])=>(
                      <div key={v} onClick={()=>setCalVista(v)}
                        style={{padding:"6px 14px",cursor:"pointer",fontSize:12,fontWeight:calVista===v?700:400,background:calVista===v?C.accent:"transparent",color:calVista===v?"white":C.muted}}>
                        {l}
                      </div>
                    ))}
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <button onClick={()=>{const d=new Date(calFecha);if(calVista==="mensual")d.setMonth(d.getMonth()-1);else if(calVista==="semanal")d.setDate(d.getDate()-7);else d.setDate(d.getDate()-1);setCalFecha(new Date(d));}}
                      style={{background:C.bg,border:`1px solid ${C.border}`,color:C.text,borderRadius:2,padding:"6px 12px",cursor:"pointer",fontSize:14}}>‹</button>
                    <div style={{fontSize:13,fontWeight:600,minWidth:160,textAlign:"center"}}>
                      {calVista==="mensual" && calFecha.toLocaleDateString("es-AR",{month:"long",year:"numeric"})}
                      {calVista==="dia" && calFecha.toLocaleDateString("es-AR",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}
                      {calVista==="semanal" && (()=>{
                        const dow=calFecha.getDay();
                        const lun=new Date(calFecha);lun.setDate(calFecha.getDate()-(dow===0?6:dow-1));
                        const dom=new Date(lun);dom.setDate(lun.getDate()+6);
                        return `${lun.toLocaleDateString("es-AR",{day:"numeric",month:"short"})} - ${dom.toLocaleDateString("es-AR",{day:"numeric",month:"short",year:"numeric"})}`;
                      })()}
                    </div>
                    <button onClick={()=>{const d=new Date(calFecha);if(calVista==="mensual")d.setMonth(d.getMonth()+1);else if(calVista==="semanal")d.setDate(d.getDate()+7);else d.setDate(d.getDate()+1);setCalFecha(new Date(d));}}
                      style={{background:C.bg,border:`1px solid ${C.border}`,color:C.text,borderRadius:2,padding:"6px 12px",cursor:"pointer",fontSize:14}}>›</button>
                    <button onClick={()=>{setCalFecha(new Date());if(calVista==="dia")setCalVista("dia");}}
                      style={{background:C.bg,border:`1px solid ${C.border}`,color:C.muted,borderRadius:2,padding:"6px 10px",cursor:"pointer",fontSize:11}}>Hoy</button>
                  </div>
                  {profesionales.filter(p=>p.color).length > 0 && (
                    <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center",marginTop:8}}>
                      {profesionales.filter(p=>p.color&&p.activo).map(p=>(
                        <div key={p.id} style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:C.muted}}>
                          <div style={{width:8,height:8,borderRadius:"50%",background:p.color}}/>
                          {p.nombre.split(' ').slice(0,2).join(' ')}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {calLoading ? <div style={{textAlign:"center",padding:60,color:C.muted}}>Cargando...</div> : (()=>{
                const ESTADO_COLOR = {realizado:C.green,no_show:C.red,cancelado:"#64748b",confirmado:"#3b82f6",pendiente:C.accent};
                const profColorMap = {};
                (profesionales||[]).forEach(p => { if (p.color) profColorMap[p.nombre] = p.color; });
                const getColor = (t) => t.estado_turno === 'cancelado' ? '#64748b' : t.estado_turno === 'no_show' ? C.red : profColorMap[t.profesional] || ESTADO_COLOR[t.estado_turno] || C.accent;
                // Horas 7-22, HORA_H calculado para que todo entre en 700px sin scroll
                // Día: 700 - 28 (header) = 672px para 16 horas -> 42px/hora
                // Semana: 700 - 52 (header) = 648px para 16 horas -> 40px/hora
                const CAL_H = 700;
                const HORAS = Array.from({length:16},(_,i)=>i+7); // 7:00-22:00
                const HORA_H_DIA = Math.floor((CAL_H - 28) / HORAS.length);   // ~42px
                const HORA_H_SEM = Math.floor((CAL_H - 52) / HORAS.length);   // ~40px

                // ===== VISTA DÍA =====
                const VistaDia = ({fecha}) => {
                  const dStr = fecha.toISOString().split('T')[0];
                  const turnos = calTurnos.filter(t=>t.fecha?.toString().slice(0,10)===dStr).sort((a,b)=>a.hora>b.hora?1:-1);
                  const esHoy = dStr===ahora.toISOString().split('T')[0];
                  const lineaY = esHoy ? ((ahora.getHours()-7)*HORA_H_DIA + ahora.getMinutes()/60*HORA_H_DIA) : -1;

                  return (
                    <div style={{display:"flex",gap:0,height:CAL_H,overflow:"hidden"}}>
                      {/* Columna horas */}
                      <div style={{width:52,flexShrink:0}}>
                        <div style={{height:28}}/>
                        {HORAS.map(h=>(
                          <div key={h} style={{height:HORA_H_DIA,display:"flex",alignItems:"flex-start",paddingTop:2,paddingRight:8}}>
                            <span style={{fontSize:10,color:C.muted,whiteSpace:"nowrap"}}>{String(h).padStart(2,"0")}:00</span>
                          </div>
                        ))}
                      </div>
                      {/* Columna eventos */}
                      <div style={{flex:1,position:"relative",borderLeft:`1px solid ${C.border}`,overflow:"hidden"}}>
                        {/* Header dia */}
                        <div style={{height:28,display:"flex",alignItems:"center",paddingLeft:12,fontSize:12,fontWeight:600,color:esHoy?C.accent:C.text,borderBottom:`1px solid ${C.border}`}}>
                          {fecha.toLocaleDateString("es-AR",{weekday:"long",day:"numeric",month:"long"})}
                        </div>
                        {/* Celdas hora */}
                        {HORAS.map(h=>{
                          const esPasada = esHoy && h < ahora.getHours();
                          return (
                            <div key={h} onClick={()=>abrirNuevoTurnoFecha(dStr,`${String(h).padStart(2,"0")}:00`)}
                              style={{height:HORA_H_DIA,borderBottom:`1px solid ${C.border}22`,cursor:"pointer",position:"relative",
                                background: esPasada ? "rgba(0,0,0,0.15)" : "transparent",
                              }}
                              onMouseEnter={e=>{ if(!esPasada) e.currentTarget.style.background="rgba(99,102,241,0.04)"; }}
                              onMouseLeave={e=>{ e.currentTarget.style.background=esPasada?"rgba(0,0,0,0.15)":"transparent"; }}
                            />
                          );
                        })}
                        {/* Linea hora actual */}
                        {lineaY > 0 && (
                          <div style={{position:"absolute",top:28+lineaY,left:0,right:0,height:2,background:C.red,zIndex:3,pointerEvents:"none"}}>
                            <div style={{width:8,height:8,borderRadius:"50%",background:C.red,marginTop:-3,marginLeft:-4}}/>
                          </div>
                        )}
                        {/* Turnos */}
                        {turnos.map((t,i)=>{
                          const hIni = parseInt(t.hora?.slice(0,2)||"8");
                          const mIni = parseInt(t.hora?.slice(3,5)||"0");
                          const hFin = t.hora_fin ? parseInt(t.hora_fin.slice(0,2)) : hIni+1;
                          const mFin = t.hora_fin ? parseInt(t.hora_fin.slice(3,5)) : 0;
                          const top = (hIni-7)*HORA_H_DIA + mIni/60*HORA_H_DIA + 28;
                          const height = Math.max(HORA_H_DIA-2, ((hFin-hIni)*60+(mFin-mIni))/60*HORA_H_DIA - 2);
                          const color = getColor(t);
                          return (
                            <div key={i} onClick={e=>{e.stopPropagation();abrirEditTurno(t);}}
                              style={{position:"absolute",top,left:4,right:4,height,background:`${color}22`,border:`1px solid ${color}66`,borderLeft:`3px solid ${color}`,borderRadius:2,padding:"2px 6px",cursor:"pointer",zIndex:2,overflow:"hidden",display:"flex",flexDirection:"column",justifyContent:"center",gap:1}}>
                              <div style={{fontWeight:700,fontSize:10,color,lineHeight:1.2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                                {t.hora?.slice(0,5)}{t.hora_fin?` - ${t.hora_fin.slice(0,5)}`:""} 
                              </div>
                              {height >= 30 && <div style={{fontWeight:600,fontSize:11,lineHeight:1.2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.paciente_nombre||"Prospecto"}</div>}
                              {height >= 52 && <div style={{fontSize:10,color:C.muted,lineHeight:1.2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.tratamiento}</div>}
                            </div>
                          );
                        })}
                        {/* Botón agregar */}
                        <div onClick={()=>abrirNuevoTurnoFecha(dStr,"")}
                          style={{position:"absolute",top:4,right:8,zIndex:4,background:C.accent,color:"white",borderRadius:2,padding:"4px 10px",fontSize:11,fontWeight:600,cursor:"pointer"}}>
                          + Cita
                        </div>
                      </div>
                    </div>
                  );
                };

                // ===== VISTA SEMANAL =====
                const VistaSemanal = () => {
                  const dow = calFecha.getDay();
                  const lunes = new Date(calFecha); lunes.setDate(calFecha.getDate()-(dow===0?6:dow-1));
                  const semana = Array.from({length:7},(_,i)=>{ const d=new Date(lunes); d.setDate(lunes.getDate()+i); return d; });
                  const hoyStr = ahora.toISOString().split('T')[0];
                  const lineaY = (ahora.getHours()-7)*HORA_H_SEM + ahora.getMinutes()/60*HORA_H_SEM;

                  return (
                    <div style={{display:"flex",gap:0,height:CAL_H,overflow:"hidden"}}>
                      {/* Columna horas */}
                      <div style={{width:52,flexShrink:0}}>
                        <div style={{height:52}}/>
                        {HORAS.map(h=>(
                          <div key={h} style={{height:HORA_H_SEM,display:"flex",alignItems:"flex-start",paddingTop:2,paddingRight:8}}>
                            <span style={{fontSize:10,color:C.muted}}>{String(h).padStart(2,"0")}:00</span>
                          </div>
                        ))}
                      </div>
                      {/* 7 columnas - flex:1 para distribuir el ancho */}
                      <div style={{flex:1,display:"flex",overflow:"hidden"}}>
                        {semana.map((dia,ci)=>{
                          const dStr = dia.toISOString().split('T')[0];
                          const esHoy = dStr===hoyStr;
                          const turnosDia = calTurnos.filter(t=>t.fecha?.toString().slice(0,10)===dStr);
                          return (
                            <div key={ci} style={{flex:1,borderLeft:`1px solid ${C.border}`,position:"relative",overflow:"hidden"}}>
                              {/* Header dia */}
                              <div onClick={()=>{setCalVista("dia");setCalFecha(new Date(dStr+"T12:00:00"));}}
                                style={{height:52,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",cursor:"pointer",background:esHoy?C.accentGlow:"transparent",borderBottom:`1px solid ${C.border}`}}>
                                <div style={{fontSize:10,color:C.muted}}>{["Lun","Mar","Mie","Jue","Vie","Sab","Dom"][ci]}</div>
                                <div style={{fontSize:18,fontWeight:700,color:esHoy?C.accent:C.text}}>{dia.getDate()}</div>
                              </div>
                              {/* Celdas */}
                              {HORAS.map(h=>{
                                const esPasada = esHoy && h < ahora.getHours();
                                return (
                                  <div key={h} onClick={()=>abrirNuevoTurnoFecha(dStr,`${String(h).padStart(2,"0")}:00`)}
                                    style={{height:HORA_H_SEM,borderBottom:`1px solid ${C.border}22`,cursor:"pointer",
                                      background: esPasada ? "rgba(0,0,0,0.15)" : "transparent",
                                    }}
                                    onMouseEnter={e=>{ if(!esPasada) e.currentTarget.style.background="rgba(99,102,241,0.04)"; }}
                                    onMouseLeave={e=>{ e.currentTarget.style.background=esPasada?"rgba(0,0,0,0.15)":"transparent"; }}
                                  />
                                );
                              })}
                              {/* Linea hora actual */}
                              {esHoy && lineaY>0 && (
                                <div style={{position:"absolute",top:52+lineaY,left:0,right:0,height:2,background:C.red,zIndex:3,pointerEvents:"none"}}/>
                              )}
                              {/* Turnos */}
                              {turnosDia.map((t,i)=>{
                                const hIni=parseInt(t.hora?.slice(0,2)||"8");
                                const mIni=parseInt(t.hora?.slice(3,5)||"0");
                                const hFin=t.hora_fin?parseInt(t.hora_fin.slice(0,2)):hIni+1;
                                const mFin=t.hora_fin?parseInt(t.hora_fin.slice(3,5)):0;
                                const top=52+(hIni-7)*HORA_H_SEM+mIni/60*HORA_H_SEM;
                                const height=Math.max(HORA_H_SEM-2,((hFin-hIni)*60+(mFin-mIni))/60*HORA_H_SEM-2);
                                const color=getColor(t);
                                return (
                                  <div key={i} onClick={e=>{e.stopPropagation();abrirEditTurno(t);}}
                                    style={{position:"absolute",top,left:2,right:2,height,background:`${color}22`,borderLeft:`3px solid ${color}`,borderRadius:4,padding:"2px 4px",cursor:"pointer",zIndex:2,overflow:"hidden"}}>
                                    <div style={{fontSize:9,fontWeight:700,color,lineHeight:1.2}}>{t.hora?.slice(0,5)}</div>
                                    <div style={{fontSize:9,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.paciente_nombre?.split(" ")[0]||t.tratamiento}</div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>{/* fin wrapper 7 col */}
                    </div>
                  );
                };

                // ===== VISTA MENSUAL =====
                const VistaMensual = () => {
                  const año=calFecha.getFullYear(), mes=calFecha.getMonth();
                  const primerDia=new Date(año,mes,1);
                  const ultimoDia=new Date(año,mes+1,0);
                  const dowInicio=primerDia.getDay()===0?6:primerDia.getDay()-1;
                  const hoyStr=new Date().toISOString().split('T')[0];
                  const dias=[];
                  for(let i=0;i<dowInicio;i++) dias.push(null);
                  for(let d=1;d<=ultimoDia.getDate();d++) dias.push(new Date(año,mes,d));
                  while(dias.length%7!==0) dias.push(null);

                  return (
                    <div>
                      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:4}}>
                        {["Lun","Mar","Mie","Jue","Vie","Sab","Dom"].map(d=>(
                          <div key={d} style={{textAlign:"center",fontSize:11,fontWeight:600,color:C.muted,padding:"4px 0"}}>{d}</div>
                        ))}
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3}}>
                        {dias.map((dia,i)=>{
                          if(!dia) return <div key={i} style={{minHeight:100}}/>;
                          const dStr=dia.toISOString().split('T')[0];
                          const turnosDia=calTurnos.filter(t=>t.fecha?.toString().slice(0,10)===dStr);
                          const esHoy=dStr===hoyStr;
                          const esSelec=calDiasel===dStr;
                          return (
                            <div key={i} onClick={()=>setCalDrawer(esSelec?null:dStr)}
                              style={{minHeight:100,background:esSelec?C.accentGlow:esHoy?"rgba(99,102,241,0.06)":C.surface,border:`1px solid ${esSelec||esHoy?C.accent:C.border}`,borderRadius:4,padding:"6px 8px",cursor:"pointer",transition:"all .15s"}}>
                              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                                <span style={{fontSize:12,fontWeight:esHoy?700:400,color:esHoy?C.accent:C.text}}>{dia.getDate()}</span>
                                {turnosDia.length>0&&<span style={{fontSize:10,background:C.accentGlow,color:C.accent,borderRadius:4,padding:"1px 5px",fontWeight:600}}>{turnosDia.length}</span>}
                              </div>
                              {turnosDia.slice(0,3).map((t,j)=>{const tc=getColor(t);return(
                                <div key={j} style={{fontSize:10,padding:"2px 5px",borderRadius:4,marginBottom:2,background:`${tc}22`,color:tc,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",borderLeft:`2px solid ${tc}`}}>
                                  {t.hora?.slice(0,5)} {t.paciente_nombre?.split(" ")[0]||t.tratamiento}
                                </div>
                              )})}

                              {turnosDia.length>3&&<div style={{fontSize:9,color:C.muted,marginTop:2}}>+{turnosDia.length-3} más</div>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                };

                // ===== BANNER PRÓXIMO TURNO =====
                const BannerProximo = () => {
                  const hoyStr = ahora.toISOString().split('T')[0];
                  const ahoraStr = `${String(ahora.getHours()).padStart(2,'0')}:${String(ahora.getMinutes()).padStart(2,'0')}`;
                  const turnosHoy = calTurnos
                    .filter(t => t.fecha?.toString().slice(0,10) === hoyStr && (t.hora||'').slice(0,5) >= ahoraStr)
                    .sort((a,b) => a.hora > b.hora ? 1 : -1);
                  const proximo = turnosHoy[0];
                  if (!proximo) return null;

                  const [hP, mP] = (proximo.hora||'00:00').slice(0,5).split(':').map(Number);
                  const minFaltan = (hP*60+mP) - (ahora.getHours()*60+ahora.getMinutes());
                  const faltaTexto = minFaltan <= 0 ? 'Ahora' : minFaltan < 60
                    ? `en ${minFaltan} min`
                    : `en ${Math.floor(minFaltan/60)}h ${minFaltan%60>0?minFaltan%60+'min':''}`;
                  const color = ESTADO_COLOR[proximo.estado_turno]||C.accent;
                  const urgente = minFaltan <= 15;

                  return (
                    <div style={{
                      display:"flex", alignItems:"center", gap:10,
                      padding:"8px 14px", marginBottom:10, borderRadius:4,
                      background: urgente ? `${C.accent}18` : `${C.surface}`,
                      border: `1px solid ${urgente ? C.accent : C.border}`,
                      transition:"all .3s",
                    }}>
                      <div style={{width:8,height:8,borderRadius:"50%",background:urgente?C.accent:color,flexShrink:0,
                        ...(urgente?{boxShadow:`0 0 6px ${C.accent}`,animation:"pulse 1.5s infinite"}:{})}}/>
                      <div style={{flex:1,minWidth:0}}>
                        <span style={{fontSize:12,fontWeight:600,color:urgente?C.accent:C.text}}>
                          Próximo: {proximo.paciente_nombre?.split(' ')[0]||'Cliente'}
                        </span>
                        <span style={{fontSize:12,color:C.muted,marginLeft:6}}>
                          {proximo.hora?.slice(0,5)}hs
                          {proximo.tratamiento ? ` · ${proximo.tratamiento}` : ''}
                        </span>
                      </div>
                      <div style={{
                        fontSize:11, fontWeight:700, flexShrink:0,
                        color: urgente ? C.accent : C.muted,
                        background: urgente ? `${C.accent}18` : 'transparent',
                        padding: urgente ? '2px 8px' : '0',
                        borderRadius:4,
                      }}>
                        {faltaTexto}
                      </div>
                      {turnosHoy.length > 1 && (
                        <div style={{fontSize:10,color:C.muted,flexShrink:0}}>
                          +{turnosHoy.length-1} más
                        </div>
                      )}
                    </div>
                  );
                };

                return (
                  <div>
                    {(calVista==="dia"||calVista==="semanal") && <BannerProximo/>}
                    {calVista==="mensual" && <VistaMensual/>}
                    {calVista==="semanal" && <VistaSemanal/>}
                    {calVista==="dia" && <VistaDia fecha={calFecha}/>}
                  </div>
                );
              })()}
            </div>

            {/* Drawer dia seleccionado (mensual) */}
            {calDrawer && calVista==="mensual" && (
              <div style={{position:"fixed",top:0,right:0,bottom:0,width:340,background:C.surface,borderLeft:`1px solid ${C.border}`,zIndex:200,display:"flex",flexDirection:"column",boxShadow:"-4px 0 24px rgba(0,0,0,0.3)"}}>
                <div style={{padding:"20px 20px 16px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div>
                    <div style={{fontSize:15,fontWeight:700}}>
                      {new Date(calDrawer+'T12:00:00').toLocaleDateString("es-AR",{weekday:"long",day:"numeric",month:"long"})}
                    </div>
                    <div style={{fontSize:12,color:C.muted,marginTop:2}}>
                      {calTurnos.filter(t=>t.fecha?.toString().slice(0,10)===calDrawer).length} turnos
                    </div>
                  </div>
                  <button onClick={()=>setCalDrawer(null)} style={{background:"transparent",border:"none",color:C.muted,fontSize:22,cursor:"pointer",lineHeight:1}}>×</button>
                </div>
                <div style={{padding:16,flex:1,overflowY:"auto"}}>
                  <button onClick={()=>abrirNuevoTurnoFecha(calDrawer,"")}
                    style={{width:"100%",marginBottom:16,padding:"8px 0",background:C.accent,border:"none",borderRadius:4,color:"white",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
                    + Nueva cita
                  </button>
                  {calTurnos.filter(t=>t.fecha?.toString().slice(0,10)===calDrawer).sort((a,b)=>a.hora>b.hora?1:-1).map((t,i)=>{
                    const color = {realizado:C.green,no_show:C.red,cancelado:"#64748b",confirmado:"#3b82f6",pendiente:C.accent}[t.estado_turno]||C.accent;
                    return (
                      <div key={i} style={{background:C.bg,border:`1px solid ${C.border}`,borderLeft:`3px solid ${color}`,borderRadius:2,padding:"12px 14px",marginBottom:10}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                          <div style={{fontWeight:600,fontSize:13}}>{t.paciente_nombre||"Prospecto"}</div>
                          <div style={{display:"flex",gap:5}}>
                            <button onClick={()=>setFichaModal({turno:t, paciente:{id:t.paciente_id, nombre:t.paciente_nombre}})}
                              style={{background:"transparent",border:`1px solid ${C.border}`,color:C.muted,borderRadius:2,padding:"2px 8px",fontSize:11,cursor:"pointer"}}>📋</button>
                            <button onClick={()=>abrirEditTurno(t)} style={{background:"transparent",border:`1px solid ${C.border}`,color:C.muted,borderRadius:4,padding:"2px 8px",fontSize:11,cursor:"pointer"}}>✏</button>
                          </div>
                        </div>
                        <div style={{fontSize:12,color:C.muted,marginTop:2}}>{t.hora?.slice(0,5)}{t.hora_fin?` - ${t.hora_fin.slice(0,5)}`:""} · {t.tratamiento}</div>
                        {t.profesional&&<div style={{fontSize:11,color:C.muted}}>{t.profesional}</div>}
                        <div style={{marginTop:6,display:"flex",gap:6}}>
                          <span style={{fontSize:10,padding:"2px 7px",borderRadius:4,background:`${color}22`,color,fontWeight:600}}>
                            {t.estado_turno==="realizado"?"Realizado":t.estado_turno==="no_show"?"No se presentó":t.estado_turno==="cancelado"?"Cancelado":t.estado_turno==="confirmado"?"Confirmado":"Pendiente"}
                          </span>
                          {t.monto>0&&<span style={{fontSize:10,padding:"2px 7px",borderRadius:4,background:"rgba(100,116,139,0.1)",color:C.muted}}>{t.moneda} {parseFloat(t.monto).toLocaleString("es-AR")}</span>}
                        </div>
                      </div>
                    );
                  })}
                  {calTurnos.filter(t=>t.fecha?.toString().slice(0,10)===calDrawer).length===0&&(
                    <div style={{textAlign:"center",padding:"40px 0",color:C.muted,fontSize:13}}>Sin turnos este dia</div>
                  )}
                </div>
                <div style={{padding:16,borderTop:`1px solid ${C.border}`}}>
                  <button onClick={()=>{setCalVista("dia");setCalFecha(new Date(calDrawer+'T12:00:00'));setCalDrawer(null);}}
                    style={{width:"100%",padding:"7px 0",background:"transparent",border:`1px solid ${C.border}`,borderRadius:4,color:C.muted,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
                    Ver vista dia ->
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Recordatorios */}
        {activeTab === "recordatorios" && (
          <div style={{flex:1,overflowY:"auto",padding:24}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <div>
                <div style={{fontSize:16,fontWeight:700,marginBottom:2}}>Recordatorios</div>
                <div style={{fontSize:12,color:C.muted}}>Seguimientos y pagos pendientes</div>
              </div>
              <Btn onClick={()=>setShowNuevoRec(true)} small>+ Nuevo</Btn>
            </div>

                        {/* Recordatorios automáticos próximos */}
            {recordatoriosProximos.length > 0 && (() => {
              const pendientes = recordatoriosProximos.filter(r => r.pendiente);
              const enviados = recordatoriosProximos.filter(r => r.ya_enviado);
              return (
              <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:16,marginBottom:16}}>
                <div style={{fontSize:12,fontWeight:600,color:C.muted,textTransform:"uppercase",letterSpacing:".7px",marginBottom:12}}>
                  🤖 Recordatorios automáticos — próximos 30 días · {recordatoriosProximos.length}
                </div>
                {pendientes.length === 0 && <div style={{fontSize:12,color:C.muted,marginBottom:8}}>Sin recordatorios pendientes próximos</div>}
                {pendientes.map((r,i)=>{
                  const fechaRec = new Date(r.fecha_recordatorio);
                  const diffMs = fechaRec - new Date();
                  const diffHs = Math.round(diffMs / 3600000);
                  const tiempoStr = diffMs < 0 ? 'Muy pronto' : diffHs < 1 ? 'En menos de 1hs' : diffHs < 24 ? `en ${diffHs}hs` : `en ${Math.round(diffHs/24)}d`;
                  const fechaTurnoStr = new Date(r.fecha_turno+'T12:00:00').toLocaleDateString('es-AR',{weekday:'short',day:'numeric',month:'short'});
                  return (
                    <div key={`${r.turno_id}-${r.horas_antes}`} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:i<pendientes.length-1?`1px solid ${C.border}`:"none"}}>
                      <div style={{width:8,height:8,borderRadius:"50%",flexShrink:0,background:"#6366f1"}}/>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:12,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.paciente_nombre||r.paciente_telefono}</div>
                        <div style={{fontSize:11,color:C.muted}}>Turno: {fechaTurnoStr} {r.hora_turno?.substring(0,5)}hs{r.tratamiento?` · ${r.tratamiento}`:''} · {r.nivel_desc||`${r.horas_antes}hs antes`}</div>
                      </div>
                      <div style={{fontSize:11,fontWeight:600,flexShrink:0,color:"#818cf8"}}>{tiempoStr}</div>
                    </div>
                  );
                })}
                {enviados.length > 0 && (
                  <details style={{marginTop:pendientes.length>0?8:0}}>
                    <summary style={{fontSize:11,color:C.muted,cursor:"pointer",userSelect:"none"}}>✅ {enviados.length} enviado{enviados.length>1?'s':''} — ver</summary>
                    <div style={{marginTop:8}}>
                      {enviados.map((r,i)=>{
                        const fechaTurnoStr = new Date(r.fecha_turno+'T12:00:00').toLocaleDateString('es-AR',{weekday:'short',day:'numeric',month:'short'});
                        return (
                          <div key={`env-${r.turno_id}-${r.horas_antes}`} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0",opacity:0.6,borderBottom:i<enviados.length-1?`1px solid ${C.border}`:"none"}}>
                            <div style={{width:8,height:8,borderRadius:"50%",flexShrink:0,background:"#10b981"}}/>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{fontSize:11,fontWeight:600}}>{r.paciente_nombre||r.paciente_telefono}</div>
                              <div style={{fontSize:10,color:C.muted}}>{fechaTurnoStr} · {r.nivel_desc||`${r.horas_antes}hs antes`}</div>
                            </div>
                            <div style={{fontSize:10,color:"#10b981",flexShrink:0}}>✅</div>
                          </div>
                        );
                      })}
                    </div>
                  </details>
                )}
              </div>
              );
            })()}

            {/* Buscador */}
            <input value={recBuscar} onChange={e=>{setRecBuscar(e.target.value);fetchRecordatorios(e.target.value,recFiltroCategoria);}}
              placeholder="Buscar por prospecto, título, descripción..."
              style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:4,padding:"10px 14px",color:C.text,fontSize:13,fontFamily:"inherit",marginBottom:12}}/>

            {/* Filtros unificados: tipos fijos + categorías personalizadas */}
            {(()=>{
              const TIPOS_FIJOS = [
                {v:"",          l:"Todos",         color:C.accent},
                {v:"cuota",     l:"💰 Cuotas",     color:"#f59e0b"},
                {v:"seguimiento",l:"👁 Seguimiento",color:"#8b5cf6"},
                {v:"cumpleanos",l:"🎂 Cumpleaños", color:"#ec4899"},
                {v:"llamada",   l:"📞 Llamadas",   color:"#3b82f6"},
                {v:"manual",    l:"📝 Manuales",   color:"#64748b"},
              ];
              // Filtro activo: puede ser tipo fijo o categoría personalizada
              const tipoActivo = TIPOS_FIJOS.find(t=>t.v===filtroTipo);
              const catActiva = !tipoActivo && categoriasRec.find(c=>c.nombre===filtroTipo);
              return (
                <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:16}}>
                  {TIPOS_FIJOS.map(t=>{
                    const act = filtroTipo===t.v;
                    return (
                      <div key={t.v} onClick={()=>{setFiltroTipo(t.v);setRecFiltroCategoria("");fetchRecordatorios(recBuscar,"");}}
                        style={{padding:"4px 12px",borderRadius:2,cursor:"pointer",fontSize:12,fontWeight:act?600:400,
                          border:`1px solid ${act?t.color:C.border}`,
                          background:act?`${t.color}22`:"transparent",
                          color:act?t.color:C.muted,transition:"all .15s"}}>
                        {t.l}
                        {t.v&&t.v!=="todos"&&<span style={{marginLeft:4,opacity:.6,fontSize:11}}>{recordatorios.filter(r=>r.tipo===t.v&&r.estado==="pendiente").length||""}</span>}
                      </div>
                    );
                  })}
                  {categoriasRec.length > 0 && (
                    <>
                      <div style={{width:1,background:C.border,margin:"0 4px",alignSelf:"stretch"}}/>
                      {categoriasRec.map(cat=>{
                        const act = filtroTipo===cat.nombre;
                        return (
                          <div key={cat.id} onClick={()=>{setFiltroTipo(cat.nombre);setRecFiltroCategoria(cat.nombre);fetchRecordatorios(recBuscar,cat.nombre);}}
                            style={{padding:"4px 12px",borderRadius:2,cursor:"pointer",fontSize:12,fontWeight:act?600:400,
                              border:`1px solid ${act?cat.color:C.border}`,
                              background:act?`${cat.color}22`:"transparent",
                              color:act?cat.color:C.muted,transition:"all .15s"}}>
                            {cat.nombre}
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              );
            })()}

            {/* Lista de recordatorios */}
            {(()=>{
              const TIPO_META = {
                cuota:       {color:"#f59e0b", icon:"💰", label:"Cuota"},
                seguimiento: {color:"#8b5cf6", icon:"👁",  label:"Seguimiento"},
                cumpleanos:  {color:"#ec4899", icon:"🎂", label:"Cumpleaños"},
                llamada:     {color:"#3b82f6", icon:"📞", label:"Llamada"},
                manual:      {color:"#64748b", icon:"📝", label:"Manual"},
              };
              const recFiltrados = recordatorios.filter(r => {
                if (filtroTipo === "todos" || filtroTipo === "") return true;
                // Puede ser tipo fijo o categoría personalizada
                return r.tipo === filtroTipo || r.categoria === filtroTipo;
              });
              return (
                <>

                  {["pendiente","enviado","fallido","completado"].map(est => {
                    const grupo = recFiltrados.filter(r=>r.estado===est);
                    if (est==="completado" && grupo.length===0) return null;
                    return (
                      <div key={est} style={{marginBottom:24}}>
                        <div style={{fontSize:11,color:C.muted,textTransform:"uppercase",letterSpacing:".7px",fontWeight:500,marginBottom:12}}>
                          {est==="pendiente"?"⏳ Pendientes":est==="enviado"?"✅ Enviados por WA":est==="fallido"?"❌ Fallidos":"✓ Completados"} · {grupo.length}
                        </div>
                        {grupo.length === 0 ? (
                          <div style={{fontSize:13,color:C.muted,padding:"20px 0",textAlign:"center"}}>Sin recordatorios pendientes 🎉</div>
                        ) : grupo.map(rec => {
                          const hoy = new Date().toISOString().split('T')[0];
                          const vencido = rec.fecha_recordatorio < hoy && rec.estado==="pendiente";
                          const hoyMismo = rec.fecha_recordatorio === hoy;
                          const meta = TIPO_META[rec.tipo] || {color:"#64748b", icon:"🔔", label:rec.tipo||"Recordatorio"};
                          const esCuota = rec.tipo === "cuota";
                          return (
                            <div key={rec.id} style={{
                              background: esCuota ? "#f59e0b0d" : C.surface,
                              border:`1px solid ${vencido?"rgba(239,68,68,0.4)":esCuota?"#f59e0b44":C.border}`,
                              borderLeft:`3px solid ${meta.color}`,
                              borderRadius:2,padding:"12px 16px",marginBottom:8,display:"flex",gap:12,alignItems:"flex-start"}}>
                              {/* Ícono tipo */}
                              <div style={{width:32,height:32,borderRadius:4,background:`${meta.color}18`,border:`1px solid ${meta.color}33`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>
                                {meta.icon}
                              </div>
                              <div style={{flex:1,minWidth:0}}>
                                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3,flexWrap:"wrap"}}>
                                  <div style={{fontWeight:600,fontSize:13}}>{rec.titulo}</div>
                                  {vencido && rec.estado==="pendiente" && <span style={{fontSize:10,background:"rgba(239,68,68,0.15)",color:C.red,padding:"1px 6px",borderRadius:4,fontWeight:600}}>VENCIDO</span>}
                                  {rec.estado==="enviado" && <span style={{fontSize:10,background:"rgba(16,185,129,0.15)",color:"#10b981",padding:"1px 6px",borderRadius:4,fontWeight:600}}>📱 WA ENVIADO</span>}
                                  {rec.estado==="fallido" && <span style={{fontSize:10,background:"rgba(239,68,68,0.15)",color:C.red,padding:"1px 6px",borderRadius:4,fontWeight:600}}>⚠️ FALLIDO</span>}
                                  {hoyMismo && <span style={{fontSize:10,background:"rgba(16,185,129,0.15)",color:C.green,padding:"1px 6px",borderRadius:4,fontWeight:600}}>HOY</span>}
                                  <span style={{fontSize:10,padding:"1px 7px",borderRadius:4,background:`${meta.color}18`,color:meta.color,fontWeight:600,border:`1px solid ${meta.color}33`}}>
                                    {meta.label}
                                  </span>
                                </div>
                                <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:3}}>
                                  {rec.paciente_nombre && <span style={{fontSize:11,color:C.accent}}>👤 {rec.paciente_nombre}</span>}
                                  {rec.categoria && rec.tipo!=="cuota" && (
                                    <span style={{fontSize:10,padding:"1px 7px",borderRadius:4,background:`${(categoriasRec.find(c=>c.nombre===rec.categoria)?.color||"#64748b")}22`,color:categoriasRec.find(c=>c.nombre===rec.categoria)?.color||C.muted,fontWeight:600}}>
                                      {rec.categoria}
                                    </span>
                                  )}
                                </div>
                                {rec.descripcion && <div style={{fontSize:12,color:C.muted,marginBottom:4}}>{rec.descripcion}</div>}
                                {rec.error_envio && <div style={{fontSize:11,color:C.red,marginBottom:4}}>⚠️ {rec.error_envio}</div>}
                                {rec.enviado_en && <div style={{fontSize:11,color:"#10b981",marginBottom:4}}>Enviado {new Date(rec.enviado_en).toLocaleString("es-AR",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}</div>}
                                <div style={{fontSize:11,color:C.muted}}>
                                  📅 {new Date(rec.fecha_recordatorio+'T12:00:00').toLocaleDateString("es-AR",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}
                                </div>
                              </div>
                              <div style={{display:"flex",gap:6,flexShrink:0}}>
                                {rec.estado==="pendiente" && (
                                  <button onClick={()=>cambiarEstadoRec(rec.id,"completado")}
                                    style={{background:"rgba(16,185,129,0.1)",border:"1px solid rgba(16,185,129,0.3)",color:C.green,borderRadius:2,padding:"4px 10px",fontSize:11,cursor:"pointer",fontWeight:500}}>✓ Listo</button>
                                )}
                                <button onClick={()=>eliminarRec(rec.id)}
                                  style={{background:"transparent",border:`1px solid ${C.border}`,color:C.muted,borderRadius:2,padding:"4px 8px",fontSize:11,cursor:"pointer"}}>×</button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </>
              );
            })()}           {showNuevoRec && (
              <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.75)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}}>
                <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:32,width:440,maxWidth:"92vw"}}>
                  <div style={{fontSize:16,fontWeight:700,marginBottom:20}}>Nuevo recordatorio</div>
                  <Field label="Título *" value={formRec.titulo} onChange={v=>setFormRec({...formRec,titulo:v})} placeholder="Cuota 2 de 3, Seguimiento, Llamar..."/>
                  <Field label="Fecha *" value={formRec.fecha_recordatorio} onChange={v=>setFormRec({...formRec,fecha_recordatorio:v})} type="date"/>
                  <div style={{marginBottom:14}}>
                    <label style={{fontSize:11,color:C.muted,fontWeight:500,display:"block",marginBottom:5}}>Categoría</label>
                    <select value={formRec.categoria} onChange={e=>setFormRec({...formRec,categoria:e.target.value})}
                      style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"10px 14px",color:C.text,fontSize:13,fontFamily:"inherit"}}>
                      <option value="">Sin categoría</option>
                      {categoriasRec.map(c=><option key={c.id} value={c.nombre}>{c.nombre}</option>)}
                      <option value="__custom__">+ Personalizada...</option>
                    </select>
                    {formRec.categoria === "__custom__" && (
                      <input value={formRec.categoria_personalizada} onChange={e=>setFormRec({...formRec,categoria_personalizada:e.target.value})}
                        placeholder="Nombre de la categoría"
                        style={{marginTop:6,width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"10px 14px",color:C.text,fontSize:13,fontFamily:"inherit"}}/>
                    )}
                  </div>
                  <div style={{marginBottom:14}}>
                    <label style={{fontSize:11,color:C.muted,fontWeight:500,display:"block",marginBottom:5}}>Cliente (opcional)</label>
                    <select value={formRec.paciente_id} onChange={e=>setFormRec({...formRec,paciente_id:e.target.value})}
                      style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"10px 14px",color:C.text,fontSize:13,fontFamily:"inherit"}}>
                      <option value="">Sin prospecto</option>
                      {pacientes.map(p=><option key={p.id} value={p.id}>{p.nombre}</option>)}
                    </select>
                  </div>
                  <Field label="Descripción" value={formRec.descripcion} onChange={v=>setFormRec({...formRec,descripcion:v})} placeholder="Notas..." textarea/>
                  <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                    <Btn onClick={()=>setShowNuevoRec(false)} secondary>Cancelar</Btn>
                    <Btn onClick={crearRecordatorio} disabled={savingRec}>{savingRec?"Guardando...":"Guardar"}</Btn>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Resultados */}
        {activeTab === "_resultados_disabled" && (
          <div style={{flex:1,overflowY:"auto",padding:24}}>
            <div style={{maxWidth:900,margin:"0 auto"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                <div>
                  <div style={{fontSize:16,fontWeight:700,marginBottom:2}}>Antes y Después</div>
                  <div style={{fontSize:12,color:C.muted}}>Resultados de tratamientos</div>
                </div>
                <Btn onClick={()=>{setResContextPac(null);setFormRes({paciente_id:"",tratamiento_id:"",tratamiento_libre:"",fecha:"",nota:""});setFotoAntes(null);setFotoDespues(null);setFotoAntesURL("");setFotoDespuesURL("");setShowNuevoRes(true);}} small>+ Agregar resultado</Btn>
              </div>

              {/* Buscador y filtros */}
              <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
                <input value={resQ} onChange={e=>{setResQ(e.target.value);fetchResultados(e.target.value,resFiltroTrat);}}
                  placeholder="Buscar por prospecto, servicio..."
                  style={{flex:1,minWidth:200,background:C.surface,border:`1px solid ${C.border}`,borderRadius:4,padding:"9px 14px",color:C.text,fontSize:13,fontFamily:"inherit"}}/>
                <select value={resFiltroTrat} onChange={e=>{setResFiltroTrat(e.target.value);fetchResultados(resQ,e.target.value);}}
                  style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:4,padding:"9px 14px",color:resFiltroTrat?C.text:C.muted,fontSize:13,fontFamily:"inherit"}}>
                  <option value="">Todos los servicios</option>
                  {tratamientos.map(t=><option key={t.id} value={t.nombre}>{t.nombre}</option>)}
                </select>
              </div>

              {resLoading ? <div style={{textAlign:"center",padding:40,color:C.muted}}>Cargando...</div> : (
                resultados.length === 0
                  ? <div style={{textAlign:"center",padding:60,color:C.muted,fontSize:13}}>Sin resultados cargados todavía</div>
                  : <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(380px,1fr))",gap:16}}>
                      {resultados.map((res,i)=>(
                        <div key={i} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,overflow:"hidden"}}>
                          {/* Fotos */}
                          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:2,background:C.bg}}>
                            {res.foto_antes
                              ? <div style={{position:"relative"}}><img src={res.foto_antes} alt="antes" style={{width:"100%",height:180,objectFit:"cover",display:"block"}}/><div style={{position:"absolute",bottom:6,left:6,fontSize:10,background:"rgba(0,0,0,0.6)",color:"white",padding:"2px 7px",borderRadius:4,fontWeight:600}}>ANTES</div></div>
                              : <div style={{height:180,background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",color:C.muted,fontSize:12}}>Sin foto</div>
                            }
                            {res.foto_despues
                              ? <div style={{position:"relative"}}><img src={res.foto_despues} alt="después" style={{width:"100%",height:180,objectFit:"cover",display:"block"}}/><div style={{position:"absolute",bottom:6,left:6,fontSize:10,background:"rgba(0,0,0,0.6)",color:"white",padding:"2px 7px",borderRadius:4,fontWeight:600}}>DESPUÉS</div></div>
                              : <div style={{height:180,background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",color:C.muted,fontSize:12}}>Sin foto</div>
                            }
                          </div>
                          {/* Info */}
                          <div style={{padding:"12px 14px"}}>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                              <div>
                                {res.paciente_nombre && <div style={{fontWeight:600,fontSize:13,marginBottom:2}}>👤 {res.paciente_nombre}</div>}
                                <div style={{fontSize:12,color:C.accent,fontWeight:500}}>{res.tratamiento||"Sin tratamiento"}</div>
                                <div style={{fontSize:11,color:C.muted,marginTop:2}}>{res.fecha && new Date(res.fecha+'T12:00:00').toLocaleDateString("es-AR",{day:"numeric",month:"long",year:"numeric"})}{res.subido_por?` · ${res.subido_por}`:""}</div>
                              </div>
                              <button onClick={async()=>{await fetch(`${API}/api/resultados/${res.id}`,{method:"DELETE",headers:aH()});fetchResultados(resQ,resFiltroTrat);}}
                                style={{background:"transparent",border:`1px solid ${C.border}`,color:C.muted,borderRadius:2,padding:"3px 8px",fontSize:11,cursor:"pointer"}}>×</button>
                            </div>
                            {res.nota && <div style={{fontSize:12,color:C.muted,marginTop:8,borderTop:`1px solid ${C.border}`,paddingTop:8}}>{res.nota}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
              )}
            </div>
          </div>
        )}

        {/* Difusión */}
        {activeTab === "_difusion_disabled" && (
          <div style={{flex:1,overflowY:"auto",padding:24}}>
            <div style={{maxWidth:600,margin:"0 auto"}}>
              <DifusionPanel client={client} API={API} aH={aH} jH={jH} tratamientos={tratamientos} plan={plan}/>
            </div>
          </div>
        )}

        {/* Honorarios */}
        {activeTab === "honorarios" && (
          <div style={{flex:1,overflowY:"auto",padding:24}}>
            <div style={{maxWidth:900,margin:"0 auto"}}>
              <PropuestasPanel client={client} API={API} aH={aH} jH={jH} pacientes={pacientes}
                notificaciones={notificaciones}
                onLeerNotificacion={async (id)=>{
                  await fetch(`${API}/api/notificaciones/${id}/leer`,{method:'PUT',headers:jH()});
                  setNotificaciones(prev=>prev.filter(n=>n.id!==id));
                }}/>
            </div>
          </div>
        )}

        {/* Ventas */}
        {activeTab === "_ventas_disabled" && (
          <div style={{flex:1,overflowY:"auto",padding:24}}>
            <div style={{maxWidth:900,margin:"0 auto"}}>
              <VentasPanel client={client} API={API} aH={aH} jH={jH} user={user} rango={rango}/>
            </div>
          </div>
        )}

        {/* Balance de Honorarios */}
        {activeTab === "honorarios_dash" && (
          <div style={{flex:1,overflowY:"auto",padding:24}}>
            <HonorariosDashboard client={client} API={API} aH={aH} jH={jH}
              onIrAHonorarios={(pacienteId)=>{ setActiveTab('honorarios'); }} />
          </div>
        )}

        {/* Tracker de Clientes */}
        {activeTab === "tracker" && (
          <div style={{flex:1,overflowY:"auto",padding:24}}>
            <TrackerClientesPanel prospectos={prospectos||[]} onVerCliente={p=>{setSelectedProspect(p);setActiveTab('prospectos');}} />
          </div>
        )}

        {/* Facturación */}
        {activeTab === "facturacion" && (
          <div style={{flex:1,overflowY:"auto",padding:24}}>
            <div style={{maxWidth:900,margin:"0 auto"}}>

              {/* Header */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20,flexWrap:"wrap",gap:12}}>
                <div>
                  <div style={{fontSize:16,fontWeight:700,marginBottom:2}}>Facturación</div>
                  <div style={{fontSize:12,color:C.muted}}>Ingresos, consultas y honorarios</div>
                </div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                  {/* Vista mes/año */}
                  <div style={{display:"flex",background:C.bg,borderRadius:2,border:`1px solid ${C.border}`,overflow:"hidden"}}>
                    {["mes","año"].map(v=>(
                      <div key={v} onClick={()=>{setFacVista(v);fetchFac(v,facMes,facAño);}}
                        style={{padding:"6px 16px",cursor:"pointer",fontSize:12,fontWeight:facVista===v?700:400,background:facVista===v?C.accent:"transparent",color:facVista===v?"white":C.muted}}>
                        {v==="mes"?"Mes":"Año"}
                      </div>
                    ))}
                  </div>
                  {/* Selector mes */}
                  {facVista==="mes" && (
                    <select value={facMes} onChange={e=>{setFacMes(e.target.value);fetchFac("mes",e.target.value,facAño);}}
                      style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"6px 12px",color:C.text,fontSize:12,fontFamily:"inherit"}}>
                      {["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"].map((m,i)=>(
                        <option key={i+1} value={String(i+1)}>{m}</option>
                      ))}
                    </select>
                  )}
                  {/* Selector año */}
                  <select value={facAño} onChange={e=>{setFacAño(e.target.value);fetchFac(facVista,facMes,e.target.value);}}
                    style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"6px 12px",color:C.text,fontSize:12,fontFamily:"inherit"}}>
                    {[2024,2025,2026,2027].map(y=><option key={y} value={String(y)}>{y}</option>)}
                  </select>
                  {/* Toggle moneda */}
                  <div style={{display:"flex",background:C.bg,borderRadius:2,border:`1px solid ${C.border}`,overflow:"hidden"}}>
                    {["local","usd"].map(m=>(
                      <div key={m} onClick={()=>setFacMoneda(m)}
                        style={{padding:"6px 14px",cursor:"pointer",fontSize:12,fontWeight:facMoneda===m?700:400,background:facMoneda===m?C.accent:"transparent",color:facMoneda===m?"white":C.muted}}>
                        {m==="local"?"Local":"USD"}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {facLoading ? (
                <div style={{textAlign:"center",padding:60,color:C.muted}}>Cargando...</div>
              ) : facData ? (() => {
                const r = facData.resumen;
                const usd = facMoneda === "usd";
                const sym = usd ? "USD" : (campos?.monedas||"ARS").split(",")[0];
                const toARS = (monto, moneda) => {
                  if (!monto) return 0;
                  if (moneda==='USD') return parseFloat(monto)*facData.cotizUSD;
                  if (moneda==='EUR') return parseFloat(monto)*facData.cotizUSD*1.08;
                  return parseFloat(monto);
                };
                const fmt = (n) => usd
                  ? `${sym} ${(n||0).toLocaleString("es-AR",{minimumFractionDigits:0,maximumFractionDigits:0})}`
                  : `${sym} ${(n||0).toLocaleString("es-AR",{minimumFractionDigits:0,maximumFractionDigits:0})}`;
                const val = (local, usdVal) => fmt(usd ? usdVal : local);

                return (
                  <div>
                    {/* Cotización */}
                    <div style={{fontSize:11,color:C.muted,marginBottom:16,textAlign:"right"}}>
                      Cotización USD: ${(facData.cotizUSD||0).toLocaleString("es-AR")} · {facData.periodo?.desde} -> {facData.periodo?.hasta}
                    </div>

                    {/* Tarjetas principales */}
                    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:12,marginBottom:24}}>
                      {[
                        { label:"Cobrado", value:val(r.totalCobrado,r.totalCobradoUSD), color:C.green, sub:"pagado" },
                        { label:"Pendiente", value:val(r.totalPendiente,r.totalPendienteUSD), color:"#f59e0b", sub:"por cobrar" },
                        { label:"En cuotas", value:val(r.totalCuotas,r.totalCuotas/facData.cotizUSD), color:"#8b5cf6", sub:"parcial" },
                        { label:"Total ingresos", value:val(r.totalIngresos,r.totalIngresosUSD), color:C.accent, sub:"cobrado + cuotas" },
                        { label:"Consultas", value:r.cantTurnos, color:C.text, sub:"en el período" },
                        { label:"Honorario prom.", value:val(r.ticketProm,r.ticketPromUSD), color:C.text, sub:"por consulta" },
                      ].map(card=>(
                        <div key={card.label} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:"16px 18px"}}>
                          <div style={{fontSize:11,color:C.muted,marginBottom:6,textTransform:"uppercase",letterSpacing:".6px"}}>{card.label}</div>
                          <div style={{fontSize:20,fontWeight:700,color:card.color,marginBottom:2}}>{card.value}</div>
                          <div style={{fontSize:11,color:C.muted}}>{card.sub}</div>
                        </div>
                      ))}
                    </div>

                    {/* Tabs detalle */}
                    <div style={{display:"flex",gap:6,marginBottom:20,background:C.bg,borderRadius:2,padding:4,border:`1px solid ${C.border}`}}>
                      {[
                        {v:"resumen",label:"Resumen"},
                        {v:"pagos",label:`Pagos (${facPagos.length})`},
                        {v:"pendientes",label:`Pendientes (${facData.pendientes?.length||0})`},
                      ].map(t=>(
                        <div key={t.v} onClick={()=>setFacVistaDetalle(t.v)}
                          style={{flex:1,textAlign:"center",padding:"7px 0",borderRadius:4,cursor:"pointer",fontSize:12,fontWeight:facVistaDetalle===t.v?700:400,
                            background:facVistaDetalle===t.v?C.surface:"transparent",color:facVistaDetalle===t.v?C.text:C.muted,
                            boxShadow:facVistaDetalle===t.v?"0 1px 4px rgba(0,0,0,.15)":"none",transition:"all .2s"}}>
                          {t.label}
                        </div>
                      ))}
                    </div>

                    {/* Vista Pagos */}
                    {facVistaDetalle === "pagos" && (
                      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:20,marginBottom:16}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:8}}>
                          <div style={{fontSize:13,fontWeight:600}}>Pagos registrados</div>
                          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                            {["todos","efectivo","transferencia","tarjeta_debito","tarjeta_credito","mercadopago"].map(fp=>(
                              <div key={fp} onClick={()=>setFacFiltroFP(fp)}
                                style={{padding:"4px 12px",borderRadius:2,cursor:"pointer",fontSize:11,fontWeight:facFiltroFP===fp?700:400,
                                  background:facFiltroFP===fp?C.accent:"transparent",color:facFiltroFP===fp?"white":C.muted,
                                  border:`1px solid ${facFiltroFP===fp?C.accent:C.border}`}}>
                                {fp==="todos"?"Todos":fp.replace("_"," ")}
                              </div>
                            ))}
                          </div>
                        </div>
                        {(() => {
                          const lista = facFiltroFP === "todos" ? facPagos : facPagos.filter(p=>p.forma_pago===facFiltroFP);
                          const totalFiltrado = lista.reduce((s,p)=>s+toARS(p.monto,p.moneda),0);
                          return (
                            <>
                              {lista.length === 0
                                ? <div style={{color:C.muted,fontSize:12,padding:"20px 0",textAlign:"center"}}>Sin pagos en este período</div>
                                : <>
                                    <div style={{marginBottom:12,padding:"8px 12px",background:C.accentGlow,borderRadius:4,fontSize:12}}>
                                      Total filtrado: <strong>{fmt(usd?totalFiltrado/facData.cotizUSD:totalFiltrado)}</strong> · {lista.length} registro{lista.length!==1?"s":""}
                                    </div>
                                    <div style={{maxHeight:420,overflowY:"auto"}}>
                                      {lista.map((pg,i)=>(
                                        <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
                                          <div>
                                            <div style={{fontSize:13,fontWeight:500}}>{pg.paciente_nombre||"Cliente"}</div>
                                            <div style={{fontSize:11,color:C.muted,marginTop:2}}>
                                              {pg.tratamiento||"-"} · {pg.forma_pago?.replace("_"," ")} · {new Date(pg.fecha).toLocaleDateString("es-AR")}
                                            </div>
                                            {pg.nota && <div style={{fontSize:11,color:C.muted,fontStyle:"italic"}}>{pg.nota}</div>}
                                          </div>
                                          <div style={{fontWeight:700,fontSize:14,color:C.green}}>
                                            {pg.moneda} {parseFloat(pg.monto).toLocaleString("es-AR")}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </>
                              }
                            </>
                          );
                        })()}
                      </div>
                    )}

                    {/* Vista Pendientes */}
                    {facVistaDetalle === "pendientes" && (
                      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:20,marginBottom:16}}>
                        <div style={{fontSize:13,fontWeight:600,marginBottom:16}}>Saldos pendientes de cobro</div>
                        {!facData.pendientes?.length
                          ? <div style={{color:C.muted,fontSize:12,padding:"20px 0",textAlign:"center"}}>¡Todo al dia! Sin saldos pendientes 🎉</div>
                          : <>
                              <div style={{marginBottom:12,padding:"8px 12px",background:"#f59e0b18",border:"1px solid #f59e0b44",borderRadius:4,fontSize:12}}>
                                Total pendiente: <strong style={{color:"#f59e0b"}}>{fmt(usd?r.totalPendienteUSD:r.totalPendiente)}</strong> · {facData.pendientes.length} plan{facData.pendientes.length!==1?"es":""}
                              </div>
                              <div style={{maxHeight:420,overflowY:"auto"}}>
                                {facData.pendientes.map((pp,i)=>{
                                  const saldo = parseFloat(pp.monto_total)-parseFloat(pp.monto_pagado);
                                  const pct = pp.total_sesiones>0 ? Math.round(pp.sesiones_pagas/pp.total_sesiones*100) : 0;
                                  return (
                                    <div key={i} style={{padding:"12px 0",borderBottom:`1px solid ${C.border}`}}>
                                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                                        <div>
                                          <div style={{fontSize:13,fontWeight:500}}>{pp.paciente_nombre}</div>
                                          <div style={{fontSize:11,color:C.muted,marginTop:2}}>
                                            {pp.tratamiento} · {pp.sesiones_pagas}/{pp.total_sesiones} sesiones · {pp.moneda}
                                          </div>
                                        </div>
                                        <div style={{textAlign:"right"}}>
                                          <div style={{fontWeight:700,fontSize:14,color:"#f59e0b"}}>{pp.moneda} {saldo.toLocaleString("es-AR")}</div>
                                          <div style={{fontSize:10,color:C.muted}}>saldo pendiente</div>
                                        </div>
                                      </div>
                                      <div style={{background:C.bg,borderRadius:4,height:4,overflow:"hidden"}}>
                                        <div style={{width:`${pct}%`,height:"100%",background:C.green,borderRadius:4}}/>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </>
                        }
                      </div>
                    )}

                    {/* Vista Resumen */}
                    {facVistaDetalle === "resumen" && <>

                    {/* Funnel prospectos */}
                    <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:20,marginBottom:16}}>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:8}}>
                        <div style={{fontSize:13,fontWeight:600}}>Funnel del período</div>
                        <div style={{display:"flex",gap:6,alignItems:"center"}}>
                          <select value={funnelMes} onChange={e=>{setFunnelMes(e.target.value);fetchFunnelNuevo(e.target.value,funnelAño);}}
                            style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"4px 8px",color:C.text,fontSize:11,fontFamily:"inherit"}}>
                            {["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"].map((m,i)=>(
                              <option key={i+1} value={String(i+1)}>{m}</option>
                            ))}
                          </select>
                          <select value={funnelAño} onChange={e=>{setFunnelAño(e.target.value);fetchFunnelNuevo(funnelMes,e.target.value);}}
                            style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"4px 8px",color:C.text,fontSize:11,fontFamily:"inherit"}}>
                            {[2024,2025,2026,2027].map(y=><option key={y} value={y}>{y}</option>)}
                          </select>
                          <button onClick={()=>fetchFunnelNuevo(funnelMes,funnelAño)}
                            style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:2,padding:"4px 8px",color:C.muted,fontSize:11,cursor:"pointer"}}>
                            {funnelLoading?"...":"↻"}
                          </button>
                        </div>
                      </div>
                      {funnelNuevo?.etapas ? (
                        <>
                          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14}}>
                            {[
                              {label:"Potenciales clientes", value:funnelNuevo.etapas.prospectos||0,  color:"#6366f1"},
                              {label:"Rapport",              value:funnelNuevo.etapas.rapport||0,     color:"#3b82f6"},
                              {label:"Consulta agendada",    value:funnelNuevo.etapas.agendados||0,   color:"#f59e0b"},
                              {label:"Presentados",          value:funnelNuevo.etapas.presentados||0, color:"#10b981"},
                              {label:"Honorarios aceptados", value:funnelNuevo.etapas.vendidos||0,    color:C.green},
                            ].map(e=>(
                              <div key={e.label} style={{flex:1,minWidth:80,background:C.bg,borderRadius:2,padding:"12px 10px",textAlign:"center",border:`1px solid ${e.color}33`}}>
                                <div style={{fontSize:22,fontWeight:700,color:e.color}}>{e.value}</div>
                                <div style={{fontSize:10,color:C.muted,marginTop:3}}>{e.label}</div>
                              </div>
                            ))}
                          </div>
                          <div style={{display:"flex",gap:16,paddingTop:12,borderTop:`1px solid ${C.border}`}}>
                            <div style={{fontSize:12,color:C.muted}}>Conversión global: <span style={{color:C.green,fontWeight:600}}>{funnelNuevo.conversiones?.global||0}%</span></div>
                            <div style={{fontSize:12,color:C.muted}}>Showrate: <span style={{color:C.accent,fontWeight:600}}>{funnelNuevo.showrate||0}%</span></div>
                          </div>
                        </>
                      ) : (
                        <div style={{textAlign:"center",padding:16}}>
                          <button onClick={()=>fetchFunnelNuevo(funnelMes,funnelAño)}
                            style={{background:C.accent,border:"none",borderRadius:4,padding:"8px 20px",color:"white",fontSize:12,cursor:"pointer",fontWeight:600}}>
                            Cargar funnel
                          </button>
                        </div>
                      )}
                    </div>

                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
                      {/* Por tratamiento */}
                      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:20}}>
                        <div style={{fontSize:13,fontWeight:600,marginBottom:14}}>Por tratamiento</div>
                        {facData.porTratamiento?.length===0 && <div style={{color:C.muted,fontSize:12}}>Sin datos</div>}
                        {facData.porTratamiento?.map((t,i)=>{
                          const max = facData.porTratamiento[0]?.total||1;
                          return (
                            <div key={i} style={{marginBottom:12}}>
                              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                                <span style={{fontSize:12,fontWeight:500}}>{t.nombre}</span>
                                <span style={{fontSize:12,color:C.muted}}>{t.turnos} turnos</span>
                              </div>
                              <div style={{background:C.bg,borderRadius:4,height:6,overflow:"hidden",marginBottom:2}}>
                                <div style={{height:"100%",background:C.accent,borderRadius:4,width:`${(t.total/max*100).toFixed(0)}%`,transition:"width .4s"}}/>
                              </div>
                              <div style={{fontSize:11,color:C.muted}}>{fmt(usd?t.totalUSD:t.total)}</div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Por profesional */}
                      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:20}}>
                        <div style={{fontSize:13,fontWeight:600,marginBottom:14}}>Por profesional</div>
                        {facData.porProfesional?.length===0 && <div style={{color:C.muted,fontSize:12}}>Sin datos</div>}
                        {facData.porProfesional?.map((p,i)=>{
                          const max = facData.porProfesional[0]?.total||1;
                          return (
                            <div key={i} style={{marginBottom:12}}>
                              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                                <span style={{fontSize:12,fontWeight:500}}>{p.nombre}</span>
                                <span style={{fontSize:12,color:C.muted}}>{p.turnos} turnos</span>
                              </div>
                              <div style={{background:C.bg,borderRadius:4,height:6,overflow:"hidden",marginBottom:2}}>
                                <div style={{height:"100%",background:"#8b5cf6",borderRadius:4,width:`${(p.total/max*100).toFixed(0)}%`,transition:"width .4s"}}/>
                              </div>
                              <div style={{fontSize:11,color:C.muted}}>{fmt(usd?p.totalUSD:p.total)}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Por forma de pago */}
                    <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:20,marginBottom:16}}>
                      <div style={{fontSize:13,fontWeight:600,marginBottom:14}}>Por forma de pago</div>
                      <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                        {facData.porFormaPago?.map((f,i)=>(
                          <div key={i} style={{background:C.bg,borderRadius:2,padding:"12px 16px",border:`1px solid ${C.border}`,minWidth:120}}>
                            <div style={{fontSize:11,color:C.muted,textTransform:"capitalize",marginBottom:4}}>{f.fp}</div>
                            <div style={{fontSize:15,fontWeight:700}}>{fmt(usd?f.totalUSD:f.total)}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Evolución mensual (solo vista año) */}
                    {facVista==="año" && facData.porMes?.length > 0 && (
                      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:20}}>
                        <div style={{fontSize:13,fontWeight:600,marginBottom:16}}>Evolución mensual</div>
                        <div style={{display:"flex",gap:6,alignItems:"flex-end",height:120}}>
                          {facData.porMes.map((m,i)=>{
                            const maxVal = Math.max(...facData.porMes.map(x=>x.cobrado));
                            const h = maxVal>0 ? Math.max(4,(m.cobrado/maxVal*100)) : 4;
                            const mLabel = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"][parseInt(m.mes?.split("-")[1])-1]||m.mes;
                            return (
                              <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                                <div style={{fontSize:9,color:C.muted}}>{fmt(usd?m.cobradoUSD:m.cobrado)}</div>
                                <div style={{width:"100%",background:C.accent,borderRadius:"3px 3px 0 0",height:`${h}%`,minHeight:4,transition:"height .4s"}}/>
                                <div style={{fontSize:10,color:C.muted}}>{mLabel}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    </>}
                  </div>
                );
              })() : (
                <div style={{textAlign:"center",padding:60,color:C.muted}}>Sin datos para el período seleccionado</div>
              )}
            </div>
          </div>
        )}

        {/* Config */}
        {activeTab === "config" && (
          <div style={{flex:1,overflowY:"auto",padding:isMobile?10:24,WebkitOverflowScrolling:"touch"}}>
            <div style={{maxWidth:620,margin:"0 auto"}}>
              <h2 style={{fontSize:18,fontWeight:700,marginBottom:4}}>Configuración</h2>
              <p style={{color:C.muted,fontSize:13,marginBottom:20}}>{client?.nombre}</p>

              {/* Tabs internas */}
              <div style={{display:"flex",gap:4,marginBottom:24,background:C.surface,borderRadius:2,padding:4,border:`1px solid ${C.border}`}}>
                {[
                  {v:"clinica",  l:"🏢 Agencia"},
                  {v:"agenda",   l:"📅 Agenda"},
                  {v:"sistema",  l:"⚙️ Sistema"},
                  ...(plan !== 'base' ? [{v:"bot", l:"🤖 Bot"}] : []),
                  {v:"fuentes",  l:"📊 Fuentes"},
                ].map(t=>(
                  <div key={t.v} onClick={()=>setConfTab(t.v)}
                    style={{flex:1,textAlign:"center",padding:"8px 0",borderRadius:4,cursor:"pointer",fontSize:13,fontWeight:confTab===t.v?600:400,
                      background:confTab===t.v?C.accent:"transparent",color:confTab===t.v?"white":C.muted,transition:"all .15s"}}>
                    {t.l}
                  </div>
                ))}
              </div>

              {/* -- TAB CLÍNICA -- */}
              {confTab === "clinica" && (<>

              {/* WhatsApp - credenciales del número — solo Plus y Pro */}
              {plan !== 'base' && <WAConfigPanel client={client} />}

              {/* Logo de la agencia */}
              <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:20,marginBottom:16}}>
                <div style={{fontSize:13,fontWeight:600,marginBottom:4}}>🖼️ Logo de la agencia</div>
                <div style={{fontSize:12,color:C.muted,marginBottom:14}}>Se usa en propuestas y comunicaciones. PNG o JPG, máx 2MB.</div>
                <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:14}}>
                  <div style={{width:64,height:64,borderRadius:2,background:C.bg,border:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",flexShrink:0}}>
                    {logoPreview ? <img src={logoPreview} style={{width:"100%",height:"100%",objectFit:"contain"}} alt="Logo"/> : <span style={{fontSize:24}}>⚖️</span>}
                  </div>
                  <div style={{flex:1}}>
                    <input type="file" accept="image/*" style={{display:"none"}} id="logo-upload"
                      onChange={async e=>{
                        const file = e.target.files[0];
                        if (!file) return;
                        if (file.size > 2*1024*1024) { alert('El archivo es muy grande. Máx 2MB.'); return; }
                        const reader = new FileReader();
                        reader.onload = ev => setLogoPreview(ev.target.result);
                        reader.readAsDataURL(file);
                      }}/>
                    <label htmlFor="logo-upload" style={{display:"inline-block",padding:"7px 14px",borderRadius:2,border:`1px solid ${C.border}`,background:C.bg,color:C.muted,fontSize:12,cursor:"pointer",marginBottom:8}}>
                      📁 Elegir imagen
                    </label>
                    {logoPreview && logoPreview !== client?.logo_url && (
                      <button onClick={async()=>{
                        setLogoGuardando(true);
                        const r = await fetch(`${API}/api/clientes/${client.id}/logo`,{method:'PUT',headers:jH(),body:JSON.stringify({logo_base64:logoPreview})});
                        if(r.ok){setLogoOk(true);setTimeout(()=>setLogoOk(false),2000);}
                        setLogoGuardando(false);
                      }} style={{display:"block",padding:"7px 14px",borderRadius:4,border:"none",background:C.accent,color:"white",fontSize:12,fontWeight:600,cursor:"pointer"}}>
                        {logoGuardando?'Guardando...':logoOk?'✓ Guardado':'Guardar logo'}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Protocolo de atención */}
              <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:20,marginBottom:16}}>
                <div style={{fontSize:13,fontWeight:600,marginBottom:4}}>Protocolo de atención</div>
                <div style={{fontSize:12,color:C.muted,marginBottom:14}}>Sube un documento .doc o .docx con el protocolo de atención de la agencia.</div>
                {client?.protocolo_url && (
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14,padding:"10px 14px",background:C.bg,borderRadius:2,border:`1px solid ${C.border}`}}>
                    <span style={{fontSize:18}}>📄</span>
                    <div style={{flex:1}}>
                      <div style={{fontSize:12,fontWeight:600}}>{client.protocolo_nombre||'Protocolo'}</div>
                      <a href={client.protocolo_url} target="_blank" rel="noopener noreferrer" style={{fontSize:11,color:C.accent}}>Descargar</a>
                    </div>
                    <button onClick={async()=>{
                      if(!confirm('Eliminar protocolo?'))return;
                      const r=await fetch(`${API}/api/clientes/${client.id}/protocolo`,{method:'PUT',headers:jH(),body:JSON.stringify({protocolo_url:null,protocolo_nombre:null})});
                      if(r.ok) { client.protocolo_url=null; client.protocolo_nombre=null; if(onRefresh) onRefresh(); location.reload(); }
                    }} style={{background:"transparent",border:"none",color:C.muted,cursor:"pointer",fontSize:16}}>x</button>
                  </div>
                )}
                <input type="file" accept=".doc,.docx" style={{display:"none"}} id="protocolo-upload"
                  onChange={async e=>{
                    const file = e.target.files[0];
                    if (!file) return;
                    if (file.size > 10*1024*1024) { alert('Archivo muy grande. Max 10MB.'); return; }
                    if (!file.name.match(/\.(doc|docx)$/i)) { alert('Solo archivos .doc o .docx'); return; }
                    const btn = document.getElementById('protocolo-btn');
                    if (btn) btn.textContent = 'Subiendo...';
                    try {
                      const fd = new FormData();
                      fd.append('file', file);
                      fd.append('upload_preset', CLOUDINARY_PRESET);
                      const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/raw/upload`,{method:'POST',body:fd});
                      const cloudData = await cloudRes.json();
                      if (!cloudRes.ok || cloudData.error) throw new Error(cloudData.error?.message || 'Error subiendo');
                      const r = await fetch(`${API}/api/clientes/${client.id}/protocolo`,{method:'PUT',headers:jH(),body:JSON.stringify({protocolo_url:cloudData.secure_url,protocolo_nombre:file.name})});
                      if (r.ok) { if(onRefresh) onRefresh(); if(btn) btn.textContent='Guardado'; setTimeout(()=>{if(btn)btn.textContent='Subir protocolo';},2000); }
                    } catch(err) { alert('Error: '+err.message); if(btn) btn.textContent='Subir protocolo'; }
                  }}/>
                <label htmlFor="protocolo-upload" id="protocolo-btn"
                  style={{display:"inline-block",padding:"7px 14px",borderRadius:2,border:`1px solid ${C.border}`,background:C.bg,color:C.muted,fontSize:12,cursor:"pointer"}}>
                  Subir protocolo
                </label>
              </div>

              <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:20,marginBottom:16}}>
                <div style={{fontSize:13,fontWeight:600,marginBottom:4}}>Google</div>
                <div style={{fontSize:12,color:C.muted,marginBottom:14}}>
                  {calStatus?.conectado ? <span style={{color:C.green}}>✓ Conectado</span> : <span style={{color:C.yellow}}>⚠ No conectado</span>}
                </div>
                <Btn onClick={conectarCalendar} small>{calStatus?.conectado?"Reconectar":"Conectar Calendar"}</Btn>
              </div>

              </>) }

              {/* -- TAB AGENDA -- */}
              {confTab === "agenda" && (<>

              {/* Tratamientos — oculto para estudios jurídicos (los servicios se definen por propuesta) */}
              {false && <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:20,marginBottom:16}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:600,marginBottom:2}}>Tratamientos</div>
                    <div style={{fontSize:12,color:C.muted}}>Servicios que ofrece la agencia</div>
                  </div>
                  <Btn onClick={()=>setShowNewTrat(true)} small>+ Agregar</Btn>
                </div>
                {tratamientos.length === 0 ? (
                  <div style={{fontSize:12,color:C.muted,textAlign:"center",padding:"12px 0"}}>Sin tratamientos cargados</div>
                ) : tratamientos.map(t => (
                  <div key={t.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",background:C.bg,borderRadius:2,border:`1px solid ${C.border}`,marginBottom:8}}>
                    <div>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <div style={{fontSize:13,fontWeight:500}}>{t.nombre}</div>
                        <span style={{fontSize:10,padding:"2px 7px",borderRadius:2,fontWeight:600,
                          background:t.tipo==="valoracion"?"rgba(59,130,246,0.12)":"rgba(139,92,246,0.12)",
                          color:t.tipo==="valoracion"?"#3b82f6":"#8b5cf6",border:`1px solid ${t.tipo==="valoracion"?"rgba(59,130,246,0.3)":"rgba(139,92,246,0.3)"}`}}>
                          {t.tipo==="valoracion"?"Demo Call":"Servicio"}
                        </span>
                      </div>
                      <div style={{fontSize:11,color:C.muted}}>{t.duracion_minutos} min{t.descripcion?` · ${t.descripcion}`:""}</div>
                    </div>
                    <button onClick={()=>eliminarTratamiento(t.id)} style={{background:"transparent",border:"none",color:C.muted,cursor:"pointer",fontSize:16,lineHeight:1}}>×</button>
                  </div>
                ))}
                {showNewTrat && (
                  <div style={{marginTop:12,padding:16,background:C.bg,borderRadius:2,border:`1px solid ${C.border}`}}>
                    <Field label="Nombre *" value={formTrat.nombre} onChange={v=>setFormTrat({...formTrat,nombre:v})} placeholder="Ultraformer, Botox..."/>
                    <div style={{marginBottom:14}}>
                      <label style={{fontSize:11,color:C.muted,fontWeight:500,display:"block",marginBottom:8}}>Tipo</label>
                      <div style={{display:"flex",gap:8}}>
                        {[{v:"tratamiento",l:"💉 Tratamiento",d:"Servicio que se cobra"},
                          {v:"valoracion",l:"🩺 Valoración",d:"Primera consulta/evaluación"}].map(op=>(
                          <div key={op.v} onClick={()=>setFormTrat({...formTrat,tipo:op.v})}
                            style={{flex:1,padding:"10px 12px",borderRadius:4,border:`1.5px solid ${(formTrat.tipo||"tratamiento")===op.v?C.accent:C.border}`,
                              background:(formTrat.tipo||"tratamiento")===op.v?C.accentGlow:"transparent",cursor:"pointer",transition:"all .15s"}}>
                            <div style={{fontSize:12,fontWeight:600,color:(formTrat.tipo||"tratamiento")===op.v?C.accentLight:C.text}}>{op.l}</div>
                            <div style={{fontSize:10,color:C.muted,marginTop:2}}>{op.d}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <Field label="Duración (minutos)" value={String(formTrat.duracion_minutos)} onChange={v=>setFormTrat({...formTrat,duracion_minutos:parseInt(v)||60})} placeholder="60"/>
                    <Field label="Descripción" value={formTrat.descripcion} onChange={v=>setFormTrat({...formTrat,descripcion:v})} placeholder="Opcional..."/>
                    <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                      <Btn onClick={()=>setShowNewTrat(false)} secondary small>Cancelar</Btn>
                      <Btn onClick={crearTratamiento} disabled={savingTrat} small>{savingTrat?"Guardando...":"Guardar"}</Btn>
                    </div>
                  </div>
                )}
              </div>}

              {/* Profesionales */}
              <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:20,marginBottom:16}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:600,marginBottom:2}}>Profesionales</div>
                    <div style={{fontSize:12,color:C.muted}}>Equipo del estudio</div>
                  </div>
                  <Btn onClick={()=>setShowNewProf(true)} small>+ Agregar</Btn>
                </div>
                {profesionales.length === 0 ? (
                  <div style={{fontSize:12,color:C.muted,textAlign:"center",padding:"12px 0"}}>Sin profesionales cargados</div>
                ) : profesionales.map(p => (
                  <div key={p.id} style={{marginBottom:8}}>
                    {editingProf === p.id ? (
                      <div style={{padding:14,background:C.bg,borderRadius:2,border:`1.5px solid ${C.accent}`}}>
                        <Field label="Nombre *" value={formEditProf.nombre} onChange={v=>setFormEditProf({...formEditProf,nombre:v})} placeholder="Dr. García"/>
                        <Field label="Rol" value={formEditProf.rol} onChange={v=>setFormEditProf({...formEditProf,rol:v})} placeholder="Socio, Abogado/a, Asesor..."/>
                        <Field label="Email (para invitar a la consulta)" value={formEditProf.email} onChange={v=>setFormEditProf({...formEditProf,email:v})} placeholder="asesor@estudio.com"/>
                        <div style={{marginBottom:8}}>
                          <div style={{fontSize:11,color:C.muted,marginBottom:4}}>Color en calendario</div>
                          <div style={{display:"flex",gap:4}}>{PROF_COLORS.map(c=>(
                            <div key={c} onClick={()=>setFormEditProf({...formEditProf,color:c})}
                              style={{width:22,height:22,borderRadius:4,background:c,cursor:"pointer",border:formEditProf.color===c?'2px solid white':'2px solid transparent'}}/>
                          ))}</div>
                        </div>
                        <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:8}}>
                          <Btn onClick={()=>setEditingProf(null)} secondary small>Cancelar</Btn>
                          <Btn onClick={guardarEditProf} disabled={savingEditProf||!formEditProf.nombre} small>{savingEditProf?"Guardando...":"Guardar"}</Btn>
                        </div>
                      </div>
                    ) : (
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",background:C.bg,borderRadius:2,border:`1px solid ${C.border}`}}>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <div style={{width:10,height:10,borderRadius:"50%",background:p.color||C.accent,flexShrink:0}}/>
                          <div>
                          <div style={{fontSize:13,fontWeight:500}}>{p.nombre}</div>
                          <div style={{fontSize:11,color:C.muted}}>
                            {p.rol||"Sin rol"}
                            {p.email ? <span style={{color:C.accentLight}}> · {p.email}</span> : <span style={{color:"#ef4444"}}> · Sin email</span>}
                          </div>
                          </div>
                        </div>
                        <div style={{display:"flex",gap:6}}>
                          <button onClick={()=>{setEditingProf(p.id);setFormEditProf({nombre:p.nombre,rol:p.rol||'',email:p.email||'',color:p.color||''});}}
                            style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:2,padding:"4px 10px",color:C.muted,cursor:"pointer",fontSize:11}}>✏️</button>
                          <button onClick={()=>eliminarProfesional(p.id)}
                            style={{background:"transparent",border:"none",color:C.muted,cursor:"pointer",fontSize:16,lineHeight:1}}>×</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {showNewProf && (
                  <div style={{marginTop:12,padding:16,background:C.bg,borderRadius:2,border:`1px solid ${C.border}`}}>
                    <Field label="Nombre *" value={formProf.nombre} onChange={v=>setFormProf({...formProf,nombre:v})} placeholder="Dr. García"/>
                    <Field label="Rol" value={formProf.rol} onChange={v=>setFormProf({...formProf,rol:v})} placeholder="Socio, Abogado/a, Asesor..."/>
                    <Field label="Email (para invitar a la consulta)" value={formProf.email} onChange={v=>setFormProf({...formProf,email:v})} placeholder="martin@estudio.com"/>
                    <div style={{marginBottom:8}}>
                      <div style={{fontSize:11,color:C.muted,marginBottom:4}}>Color en calendario</div>
                      <div style={{display:"flex",gap:4}}>{PROF_COLORS.map(c=>(
                        <div key={c} onClick={()=>setFormProf({...formProf,color:c})}
                          style={{width:22,height:22,borderRadius:4,background:c,cursor:"pointer",border:formProf.color===c?'2px solid white':'2px solid transparent'}}/>
                      ))}</div>
                    </div>
                    <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                      <Btn onClick={()=>setShowNewProf(false)} secondary small>Cancelar</Btn>
                      <Btn onClick={crearProfesional} disabled={savingProf} small>{savingProf?"Guardando...":"Guardar"}</Btn>
                    </div>
                  </div>
                )}
              </div>

              {/* Campos del cliente */}
              <CamposFichaConfig client={client} />

              {/* Usuarios del panel — solo admin y dueño */}
              {['admin','dueno'].includes(rango) && (
                <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:20,marginBottom:16}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                    <div>
                      <div style={{fontSize:13,fontWeight:600,marginBottom:2}}>Usuarios del panel</div>
                      <div style={{fontSize:12,color:C.muted}}>Quiénes pueden acceder al software</div>
                    </div>
                    <Btn onClick={()=>setShowNewUsuario(true)} small>+ Agregar</Btn>
                  </div>
                  {usuarios.length === 0 ? (
                    <div style={{fontSize:12,color:C.muted,textAlign:"center",padding:"12px 0"}}>Sin usuarios adicionales</div>
                  ) : usuarios.map(u => (
                    <div key={u.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",background:C.bg,borderRadius:2,border:`1px solid ${C.border}`,marginBottom:8}}>
                      <div>
                        <div style={{fontSize:13,fontWeight:500}}>{u.nombre}</div>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginTop:2}}>
                          <span style={{fontSize:11,color:C.muted}}>{u.email}{u.cargo ? <span style={{color:C.accentLight}}> · {u.cargo}</span> : ''}</span>
                          <select value={u.rango||'staff'} onChange={async e=>{
                            await fetch(`${API}/api/usuarios/${u.id}/rango`,{method:'PUT',headers:jH(),body:JSON.stringify({rango:e.target.value})});
                            fetchUsuarios();
                          }} style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:4,padding:"1px 6px",fontSize:10,color:C.muted,fontFamily:"inherit",cursor:"pointer"}}>
                            <option value="dueno">Socio / Dueño</option>
                            <option value="profesional">Abogado Auxiliar</option>
                            <option value="staff">Secretario/a</option>
                          </select>
                        </div>
                      </div>
                      <button onClick={()=>eliminarUsuario(u.id)} style={{background:"transparent",border:"none",color:C.muted,cursor:"pointer",fontSize:16,lineHeight:1}}>×</button>
                    </div>
                  ))}
                  {showNewUsuario && (
                    <div style={{marginTop:12,padding:16,background:C.bg,borderRadius:2,border:`1px solid ${C.border}`}}>
                      <Field label="Nombre *" value={formUsuario.nombre} onChange={v=>setFormUsuario({...formUsuario,nombre:v})} placeholder="Ana García"/>
                      <Field label="Email *" value={formUsuario.email} onChange={v=>setFormUsuario({...formUsuario,email:v})} placeholder="ana@skyward.com" type="email"/>
                      <Field label="Contraseña *" value={formUsuario.password} onChange={v=>setFormUsuario({...formUsuario,password:v})} placeholder="••••••••" type="password"/>
                      <Field label="Cargo (opcional)" value={formUsuario.cargo||''} onChange={v=>setFormUsuario({...formUsuario,cargo:v})} placeholder="Dr., Esteticista, Recepcionista..."/>
                      <div style={{marginBottom:14}}>
                        <label style={{fontSize:11,color:C.muted,fontWeight:500,display:"block",marginBottom:6}}>Rango</label>
                        <div style={{display:"flex",gap:8}}>
                          {[{v:"dueno",l:"Socio / Dueño",d:"Acceso completo"},{v:"profesional",l:"Abogado Auxiliar",d:"Clientes, Casos y Honorarios"},{v:"staff",l:"Secretario/a",d:"Clientes y Agenda"}].map(r=>(
                            <div key={r.v} onClick={()=>setFormUsuario({...formUsuario,rango:r.v})}
                              style={{flex:1,padding:"8px 12px",borderRadius:4,border:`1px solid ${formUsuario.rango===r.v?C.accent:C.border}`,background:formUsuario.rango===r.v?C.accentGlow:"transparent",cursor:"pointer"}}>
                              <div style={{fontSize:12,fontWeight:600,color:formUsuario.rango===r.v?C.accentLight:C.text}}>{r.l}</div>
                              <div style={{fontSize:10,color:C.muted}}>{r.d}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                      {errUsuario && <div style={{fontSize:12,color:C.red,marginBottom:8}}>{errUsuario}</div>}
                      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                        <Btn onClick={()=>{setShowNewUsuario(false);setErrUsuario(null);}} secondary small>Cancelar</Btn>
                        <Btn onClick={crearUsuarioConfig} disabled={savingUsuario||!formUsuario.nombre||!formUsuario.email||!formUsuario.password} small>{savingUsuario?"Guardando...":"Crear usuario"}</Btn>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Consentimientos */}
              <ConsentimientosConfig client={client} />

              {/* Disponibilidad y bloqueos */}
              <DisponibilidadPanel
                client={client}
                profesionales={profesionales}
                horariosClinica={horariosClinica}
                setHorariosClinica={setHorariosClinica}
                bloqueos={bloqueos}
                setBloqueos={setBloqueos}
              />

              </>)}

              {/* -- TAB SISTEMA -- */}
              {confTab === "sistema" && (<>

              {/* Mensajes automáticos WhatsApp */}
              {!campos && (
                <div style={{textAlign:"center",padding:40,color:C.muted,fontSize:13}}>
                  Cargando configuración...
                  <br/>
                  <button onClick={()=>fetch(`${API}/api/campos-agenda?cliente_id=${client.id}`).then(r=>r.json()).then(setCampos).catch(()=>{})}
                    style={{marginTop:12,background:C.accent,border:"none",borderRadius:4,padding:"8px 16px",color:"white",fontSize:12,cursor:"pointer"}}>
                    Reintentar
                  </button>
                </div>
              )}
              {campos && (
                <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:20,marginBottom:16}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
                    <div>
                      <div style={{fontSize:13,fontWeight:600,marginBottom:2}}>📱 Mensajes automáticos por WhatsApp</div>
                      <div style={{fontSize:12,color:C.muted,marginBottom:14}}>El bot le escribe al prospecto cuando se agenda o el dia anterior al turno</div>
                    </div>
                    <div onClick={()=>setCampos({...campos,recordatorio_activo:!campos.recordatorio_activo})}
                      style={{width:36,height:20,borderRadius:4,background:campos.recordatorio_activo!==false?C.accent:C.border,cursor:"pointer",position:"relative",transition:"background .2s",flexShrink:0,marginTop:2}}>
                      <div style={{position:"absolute",top:2,left:campos.recordatorio_activo!==false?18:2,width:16,height:16,borderRadius:"50%",background:"white",transition:"left .2s"}}/>
                    </div>
                  </div>

                  <div style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:2,padding:"10px 14px",marginBottom:14,fontSize:11,color:C.muted,lineHeight:1.7}}>
                    Variables disponibles: <strong style={{color:C.accentLight}}>NOMBRE</strong> · <strong style={{color:C.accentLight}}>TRATAMIENTO</strong> · <strong style={{color:C.accentLight}}>PROFESIONAL</strong> · <strong style={{color:C.accentLight}}>FECHA</strong> · <strong style={{color:C.accentLight}}>HORA</strong> · <strong style={{color:C.accentLight}}>CLINICA</strong>
                  </div>

                  <div style={{marginBottom:14}}>
                    <label style={{fontSize:11,color:C.muted,fontWeight:500,display:"block",marginBottom:5}}>✅ Confirmación inmediata (al crear el turno)</label>
                    <textarea value={campos.msg_confirmacion||""} onChange={e=>setCampos({...campos,msg_confirmacion:e.target.value})}
                      placeholder={"Hola NOMBRE 👋 Tu turno de TRATAMIENTO quedó confirmado para el FECHA a las HORA hs. ¡Te esperamos! 💙"}
                      rows={3}
                      style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"10px 14px",color:C.text,fontSize:12,fontFamily:"inherit",resize:"vertical",boxSizing:"border-box"}}/>
                    {campos.msg_confirmacion && (
                      <div style={{marginTop:6,padding:"8px 12px",background:C.accentGlow,border:`1px solid ${C.accent}44`,borderRadius:4,fontSize:11,color:C.muted,lineHeight:1.6}}>
                        <span style={{fontWeight:600,color:C.accentLight}}>Preview: </span>
                        {campos.msg_confirmacion
                          .replace(/NOMBRE/gi,"Ana García")
                          .replace(/TRATAMIENTO/gi,"Ultraformer")
                          .replace(/PROFESIONAL/gi,"Dra. Pérez")
                          .replace(/FECHA/gi,"viernes 21 de marzo")
                          .replace(/HORA/gi,"15:00")
                          .replace(/CLINICA/gi, client?.nombre||"Skyward")}
                      </div>
                    )}
                  </div>

                  <div style={{marginBottom:14}}>
                    <label style={{fontSize:11,color:C.muted,fontWeight:500,display:"block",marginBottom:5}}>🔔 Recordatorio 24hs antes del turno</label>
                    <textarea value={campos.msg_recordatorio||""} onChange={e=>setCampos({...campos,msg_recordatorio:e.target.value})}
                      placeholder={"Hola NOMBRE! 🔔 Te recordamos que mañana tenés turno de TRATAMIENTO a las HORA hs. ¡Te esperamos! 💙"}
                      rows={3}
                      style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"10px 14px",color:C.text,fontSize:12,fontFamily:"inherit",resize:"vertical",boxSizing:"border-box"}}/>
                    {campos.msg_recordatorio && (
                      <div style={{marginTop:6,padding:"8px 12px",background:C.accentGlow,border:`1px solid ${C.accent}44`,borderRadius:4,fontSize:11,color:C.muted,lineHeight:1.6}}>
                        <span style={{fontWeight:600,color:C.accentLight}}>Preview: </span>
                        {campos.msg_recordatorio
                          .replace(/NOMBRE/gi,"Ana García")
                          .replace(/TRATAMIENTO/gi,"Ultraformer")
                          .replace(/PROFESIONAL/gi,"Dra. Pérez")
                          .replace(/FECHA/gi,"viernes 21 de marzo")
                          .replace(/HORA/gi,"15:00")
                          .replace(/CLINICA/gi, client?.nombre||"Skyward")}
                      </div>
                    )}
                  </div>

                  <Btn onClick={guardarCampos} disabled={camposSaving} small>{camposSaving?"Guardando...":"Guardar mensajes"}</Btn>
                </div>
              )}

              {/* Seguimientos automáticos */}
              {botConfig && (
              <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:20,marginBottom:16}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:600}}>💬 Seguimientos automáticos</div>
                    <div style={{fontSize:12,color:C.muted,marginTop:2}}>El bot escribe solo antes y después de cada turno</div>
                  </div>
                  <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}}>
                    <div style={{width:36,height:20,borderRadius:4,background:botConfig?.seguimiento_activo?"#6366f1":"#374151",position:"relative",transition:"background .2s",cursor:"pointer"}}
                      onClick={()=>setBotConfig({...(botConfig||{}),seguimiento_activo:!botConfig?.seguimiento_activo})}>
                      <div style={{position:"absolute",top:2,left:botConfig?.seguimiento_activo?18:2,width:16,height:16,borderRadius:"50%",background:"white",transition:"left .2s"}}/>
                    </div>
                    <span style={{fontSize:12,color:botConfig?.seguimiento_activo?C.accentLight:C.muted}}>{botConfig?.seguimiento_activo?"Activo":"Inactivo"}</span>
                  </label>
                </div>

                {botConfig?.seguimiento_activo && (
                  <div style={{marginTop:16}}>
                    {/* 7 días antes */}
                    <div style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:2,padding:"12px 14px",marginBottom:12}}>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                        <div style={{fontSize:12,fontWeight:600,color:C.accentLight}}>📆 7 días antes del turno</div>
                        <label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer"}}>
                          <input type="checkbox" checked={botConfig?.seguimiento_7dias!==false}
                            onChange={e=>setBotConfig({...(botConfig||{}),seguimiento_7dias:e.target.checked})}
                            style={{accentColor:"#6366f1"}}/>
                          <span style={{fontSize:11,color:C.muted}}>Activo</span>
                        </label>
                      </div>
                      <textarea value={botConfig?.seguimiento_msg_7dias||""}
                        onChange={e=>setBotConfig({...(botConfig||{}),seguimiento_msg_7dias:e.target.value})}
                        placeholder={"Dejá vacío para que Claude genere el mensaje según el contexto del chat\nVariables: {nombre} {fecha} {hora} {tratamiento}"}
                        rows={3}
                        style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:4,padding:"8px 12px",color:C.text,fontSize:12,fontFamily:"inherit",resize:"vertical",boxSizing:"border-box"}}/>
                      <div style={{fontSize:10,color:C.muted,marginTop:4}}>Si está vacío, Claude genera el mensaje personalizado usando el historial del chat del prospecto.</div>
                    </div>

                    {/* Post turno */}
                    <div style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:2,padding:"12px 14px",marginBottom:12}}>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                        <div style={{fontSize:12,fontWeight:600,color:C.accentLight}}>🌟 Post-turno</div>
                        <label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer"}}>
                          <input type="checkbox" checked={botConfig?.seguimiento_post!==false}
                            onChange={e=>setBotConfig({...(botConfig||{}),seguimiento_post:e.target.checked})}
                            style={{accentColor:"#6366f1"}}/>
                          <span style={{fontSize:11,color:C.muted}}>Activo</span>
                        </label>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                        <span style={{fontSize:12,color:C.muted,whiteSpace:"nowrap"}}>Enviar a las</span>
                        <select value={botConfig?.seguimiento_post_horas||24}
                          onChange={e=>setBotConfig({...(botConfig||{}),seguimiento_post_horas:parseInt(e.target.value)})}
                          style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:"4px 8px",color:C.text,fontSize:12}}>
                          <option value={2}>2 horas después</option>
                          <option value={4}>4 horas después</option>
                          <option value={24}>24 horas después</option>
                          <option value={48}>48 horas después</option>
                        </select>
                        <span style={{fontSize:12,color:C.muted}}>del turno</span>
                      </div>
                      <textarea value={botConfig?.seguimiento_msg_post||""}
                        onChange={e=>setBotConfig({...(botConfig||{}),seguimiento_msg_post:e.target.value})}
                        placeholder={"Dejá vacío para que Claude genere el mensaje según el contexto del chat\nVariables: {nombre} {tratamiento}"}
                        rows={3}
                        style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:4,padding:"8px 12px",color:C.text,fontSize:12,fontFamily:"inherit",resize:"vertical",boxSizing:"border-box"}}/>
                      <div style={{fontSize:10,color:C.muted,marginTop:4}}>Si está vacío, Claude pregunta cómo se sintió y si tiene dudas sobre el post-tratamiento.</div>
                    </div>

                    <Btn onClick={async ()=>{
                      await fetch(`${API}/api/bot-config`, {
                        method:'PUT', headers:jH(),
                        body: JSON.stringify({...(botConfig||{}), cliente_id: client.id})
                      });
                      const t = document.createElement('div');
                      t.textContent = '✅ Seguimientos guardados';
                      t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#10b981;color:white;padding:10px 20px;border-radius:10px;font-size:13px;font-weight:600;z-index:9999';
                      document.body.appendChild(t);
                      setTimeout(()=>t.remove(), 3000);
                    }} small>Guardar seguimientos</Btn>
                  </div>
                )}
              </div>
              )}

              {/* Monedas */}
              {campos && (
                <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:20,marginBottom:16}}>
                  <div style={{fontSize:13,fontWeight:600,marginBottom:4}}>Monedas aceptadas</div>
                  <div style={{fontSize:12,color:C.muted,marginBottom:12}}>Las monedas que usa la agencia para cobrar</div>

                  {/* Seleccionadas */}
                  {(campos.monedas||"").split(",").filter(Boolean).length > 0 && (
                    <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:12}}>
                      {(campos.monedas||"").split(",").filter(Boolean).map(code => (
                        <div key={code} style={{display:"flex",alignItems:"center",gap:4,padding:"4px 10px",borderRadius:4,background:C.accentGlow,border:`1px solid ${C.accent}`,fontSize:12,fontWeight:600,color:C.accentLight}}>
                          {code}
                          <span onClick={()=>setCampos({...campos,monedas:(campos.monedas||"").split(",").filter(x=>x&&x!==code).join(",")})}
                            style={{cursor:"pointer",color:C.muted,fontSize:14,lineHeight:1}}>×</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Buscador */}
                  <MonedaSelector campos={campos} setCampos={setCampos}/>

                  <div style={{marginTop:12}}>
                    <Btn onClick={guardarCampos} disabled={camposSaving} small>{camposSaving?"Guardando...":"Guardar"}</Btn>
                  </div>
                </div>
              )}

              {/* Métodos de pago */}
              {campos && (
                <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:20,marginBottom:16}}>
                  <div style={{fontSize:13,fontWeight:600,marginBottom:4}}>Métodos de pago</div>
                  <div style={{fontSize:12,color:C.muted,marginBottom:14}}>Los métodos que acepta la agencia. Aparecen en todos los modales de pago.</div>
                  {(() => {
                    const PREDEFINIDOS = [
                      {v:"efectivo",l:"💵 Efectivo"},{v:"transferencia",l:"🏦 Transferencia"},
                      {v:"tarjeta_debito",l:"💳 Débito"},{v:"tarjeta_credito",l:"💳 Crédito"},
                      {v:"mercadopago",l:"📱 MercadoPago"},{v:"paypal",l:"🅿️ PayPal"},
                      {v:"stripe",l:"💠 Stripe"},{v:"pix",l:"🇧🇷 Pix"},{v:"zelle",l:"🇺🇸 Zelle"},
                      {v:"venmo",l:"💜 Venmo"},{v:"nequi",l:"🇨🇴 Nequi"},{v:"daviplata",l:"🇨🇴 Daviplata"},
                      {v:"yape",l:"🇵🇪 Yape"},{v:"cheque",l:"📄 Cheque"},{v:"cripto",l:"🔗 Cripto"},
                    ];
                    const predefinidosKeys = PREDEFINIDOS.map(p=>p.v);
                    const activos = (campos.metodos_pago||"efectivo,transferencia").split(",").filter(Boolean);
                    const custom = activos.filter(x=>!predefinidosKeys.includes(x));
                    const toggle = (v) => {
                      const next = activos.includes(v) ? activos.filter(x=>x!==v) : [...activos,v];
                      setCampos({...campos, metodos_pago: next.join(",")});
                    };
                    return (
                      <>
                        <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:12}}>
                          {PREDEFINIDOS.map(({v,l})=>{
                            const active = activos.includes(v);
                            return (
                              <div key={v} onClick={()=>toggle(v)}
                                style={{padding:"7px 14px",borderRadius:4,border:`1px solid ${active?C.accent:C.border}`,
                                  background:active?C.accentGlow:"transparent",cursor:"pointer",fontSize:12,
                                  fontWeight:active?700:400,color:active?C.accentLight:C.muted,transition:"all .15s"}}>
                                {l}
                              </div>
                            );
                          })}
                        </div>
                        {/* Personalizados activos */}
                        {custom.length > 0 && (
                          <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}>
                            {custom.map(v=>(
                              <div key={v} style={{display:"flex",alignItems:"center",gap:4,padding:"5px 12px",borderRadius:4,background:C.accentGlow,border:`1px solid ${C.accent}`,fontSize:12,fontWeight:600,color:C.accentLight}}>
                                {v}
                                <span onClick={()=>toggle(v)} style={{cursor:"pointer",color:C.muted,fontSize:14,lineHeight:1}}>×</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {/* Agregar personalizado */}
                        <AddMetodoPago activos={activos} setCampos={setCampos} campos={campos}/>
                      </>
                    );
                  })()}
                  <div style={{marginTop:14}}>
                    <Btn onClick={guardarCampos} disabled={camposSaving} small>{camposSaving?"Guardando...":"Guardar"}</Btn>
                  </div>
                </div>
              )}

              {/* Categorías de recordatorio */}
              <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:20,marginBottom:16}}>
                <div style={{fontSize:13,fontWeight:600,marginBottom:2}}>Categorías de recordatorios</div>
                <div style={{fontSize:12,color:C.muted,marginBottom:16}}>Etiquetas para filtrar y clasificar recordatorios</div>

                {categoriasRec.length === 0 ? (
                  <div style={{fontSize:12,color:C.muted,marginBottom:16,padding:"10px 14px",background:C.bg,borderRadius:2,border:`1px solid ${C.border}`}}>
                    Sin categorías creadas todavía
                  </div>
                ) : (
                  <div style={{marginBottom:16}}>
                    {categoriasRec.map(c=>(
                      <div key={c.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",background:C.bg,borderRadius:2,border:`1px solid ${C.border}`,marginBottom:8}}>
                        <div style={{display:"flex",alignItems:"center",gap:10}}>
                          <div style={{width:14,height:14,borderRadius:"50%",background:c.color,flexShrink:0}}/>
                          <span style={{fontSize:13,fontWeight:500}}>{c.nombre}</span>
                        </div>
                        <button onClick={()=>eliminarCategoriaRec(c.id)}
                          style={{background:"transparent",border:"none",color:C.muted,cursor:"pointer",fontSize:18,lineHeight:1,padding:"0 4px"}}
                          title="Eliminar categoría">×</button>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <div style={{width:32,height:32,flexShrink:0,position:"relative"}}>
                    <input type="color" value={newCatRec.color} onChange={e=>setNewCatRec({...newCatRec,color:e.target.value})}
                      style={{width:"100%",height:"100%",padding:2,background:"transparent",border:`1px solid ${C.border}`,borderRadius:4,cursor:"pointer"}}/>
                  </div>
                  <input value={newCatRec.nombre} onChange={e=>setNewCatRec({...newCatRec,nombre:e.target.value})}
                    onKeyDown={e=>e.key==="Enter"&&crearCategoriaRec()}
                    placeholder="Nombre de la categoría..."
                    style={{flex:1,background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"8px 12px",color:C.text,fontSize:12,fontFamily:"inherit"}}/>
                  <Btn onClick={crearCategoriaRec} disabled={savingCatRec||!newCatRec.nombre} small>{savingCatRec?"...":"+ Agregar"}</Btn>
                </div>
              </div>

              {/* Notificaciones Push */}
              <div id="push-settings-block" style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:20,marginBottom:16,transition:"box-shadow .3s, border-color .3s"}}>
                <div style={{fontSize:13,fontWeight:600,marginBottom:4}}>🔔 Notificaciones push</div>
                <div style={{fontSize:12,color:C.muted,marginBottom:14}}>Recibí alertas en tu celular aunque el panel esté cerrado</div>
                <PushSettings API={API} jH={jH} aH={aH} onActivado={onPushActivado}/>
              </div>

              {/* Importar pacientes */}
              <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:20,marginBottom:16}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:600,marginBottom:3}}>Importar pacientes</div>
                    <div style={{fontSize:12,color:C.muted}}>CSV o Excel - soporta miles de pacientes sin límite</div>
                  </div>
                  <Btn onClick={()=>{setImportStep("upload");setImportFile(null);setImportRows([]);setImportResult(null);setShowImport(true);}} small>⬆ Importar</Btn>
                </div>
              </div>

              {campos && (
                <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:20,marginBottom:16}}>
                  <div style={{fontSize:13,fontWeight:600,marginBottom:4}}>Datos para agendar</div>
                  <div style={{fontSize:12,color:C.muted,marginBottom:16}}>Qué le pide el bot al prospecto</div>
                  {[
                    { key:"nombre_activo", label:"Nombre completo" },
                    { key:"documento_activo", label:"Número de documento", lk:"documento_label", ld:"DNI" },
                    { key:"telefono_activo", label:"Teléfono / WhatsApp" },
                    { key:"email_activo", label:"Email" },
                    { key:"notas_activo", label:"Obra social / Seguro", lk:"notas_label", ld:"Obra social" },
                    { key:"modalidad_activo", label:"Modalidad (presencial/virtual)" },
                    { key:"notas_activo", label:"Notas adicionales" },
                  ].map(f => (
                    <div key={f.key} style={{marginBottom:12,padding:12,background:C.bg,borderRadius:2,border:`1px solid ${C.border}`}}>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                        <span style={{fontSize:13}}>{f.label}</span>
                        <div onClick={()=>setCampos({...campos,[f.key]:!campos[f.key]})}
                          style={{width:36,height:20,borderRadius:4,background:campos[f.key]?C.accent:C.border,cursor:"pointer",position:"relative",transition:"background .2s",flexShrink:0}}>
                          <div style={{position:"absolute",top:2,left:campos[f.key]?18:2,width:16,height:16,borderRadius:"50%",background:"white",transition:"left .2s"}}/>
                        </div>
                      </div>
                      {f.lk && campos[f.key] && (
                        <input value={campos[f.lk]??f.ld} onChange={e=>setCampos({...campos,[f.lk]:e.target.value})} placeholder={f.ld}
                          style={{marginTop:8,width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:4,padding:"6px 10px",color:C.text,fontSize:12,fontFamily:"inherit"}}/>
                      )}
                    </div>
                  ))}
                  <Btn onClick={guardarCampos} disabled={camposSaving} small>{camposSaving?"Guardando...":"Guardar"}</Btn>
                </div>
              )}

              {/* Nombres de tipos de turno */}
              {campos && (
                <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:20,marginBottom:16}}>
                  <div style={{fontSize:13,fontWeight:600,marginBottom:4}}>Terminología del estudio</div>
                  <div style={{fontSize:12,color:C.muted,marginBottom:16}}>Cómo el estudio llama a cada tipo de encuentro. Aparece en el funnel y reportes.</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
                    <div>
                      <label style={{fontSize:11,color:C.muted,fontWeight:500,display:"block",marginBottom:5}}>📋 Nombre para la "primera consulta"</label>
                      <input value={campos.nombre_valoracion||"primera consulta"}
                        onChange={e=>setCampos({...campos,nombre_valoracion:e.target.value})}
                        placeholder="primera consulta, evaluación inicial..."
                        style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"9px 12px",color:C.text,fontSize:13,fontFamily:"inherit",boxSizing:"border-box"}}/>
                      <div style={{fontSize:10,color:C.muted,marginTop:4}}>Primera reunión con el cliente</div>
                    </div>
                    <div>
                      <label style={{fontSize:11,color:C.muted,fontWeight:500,display:"block",marginBottom:5}}>⚖️ Nombre para el "servicio"</label>
                      <input value={campos.nombre_tratamiento||"consulta"}
                        onChange={e=>setCampos({...campos,nombre_tratamiento:e.target.value})}
                        placeholder="consulta, asesoramiento, representación..."
                        style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"9px 12px",color:C.text,fontSize:13,fontFamily:"inherit",boxSizing:"border-box"}}/>
                      <div style={{fontSize:10,color:C.muted,marginTop:4}}>Servicio legal que genera honorario</div>
                    </div>
                  </div>
                  <Btn onClick={guardarCampos} disabled={camposSaving} small>{camposSaving?"Guardando...":"Guardar"}</Btn>
                </div>
              )}

              </>)}

              {/* -- TAB BOT -- */}
              {confTab === "bot" && (
                <BotConfigPanel client={client} botConfig={botConfig} setBotConfig={setBotConfig} />
              )}

              {/* -- TAB FUENTES -- */}
              {confTab === "fuentes" && <FuentesConfig client={client} />}

            </div>
          </div>
        )}
      </div>

      {/* Modal importación CSV/Excel */}
      {showImport && (
        <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.85)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}}>
          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:28,width:620,maxWidth:"95vw",maxHeight:MH92,overflowY:"auto"}}>

            {/* Header */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <div>
                <div style={{fontSize:15,fontWeight:700}}>Importar pacientes</div>
                <div style={{fontSize:12,color:C.muted}}>CSV o Excel (.csv, .xlsx, .xls)</div>
              </div>
              <button onClick={()=>setShowImport(false)} style={{background:"transparent",border:"none",color:C.muted,fontSize:22,cursor:"pointer"}}>×</button>
            </div>

            {/* PASO 1: Upload */}
            {importStep === "upload" && (
              <div
                onDragOver={e=>{e.preventDefault();e.currentTarget.querySelector(".dropzone").style.borderColor=C.accent;}}
                onDragLeave={e=>{e.currentTarget.querySelector(".dropzone").style.borderColor=C.border;}}
                onDrop={e=>{e.preventDefault();e.currentTarget.querySelector(".dropzone").style.borderColor=C.border;const f=e.dataTransfer.files[0];if(f)handleImportFile(f);}}
              >
                <label style={{display:"block",cursor:"pointer"}}>
                  <input type="file" accept=".csv,.xlsx,.xls" style={{display:"none"}} onChange={e=>handleImportFile(e.target.files[0])}/>
                  <div className="dropzone" style={{border:`2px dashed ${C.border}`,borderRadius:2,padding:"48px 24px",textAlign:"center",background:C.bg,transition:"border-color .2s"}}>
                    <div style={{fontSize:40,marginBottom:12}}>📂</div>
                    <div style={{fontWeight:600,fontSize:14,marginBottom:6}}>Arrastrá o tocá para seleccionar</div>
                    <div style={{fontSize:12,color:C.muted}}>CSV, Excel (.xlsx, .xls) - sin límite de registros</div>
                  </div>
                </label>
              </div>
            )}

            {/* PASO 2: Mapear columnas */}
            {importStep === "mapear" && (
              <div>
                <div style={{background:C.accentGlow,border:`1px solid ${C.accent}44`,borderRadius:4,padding:"10px 14px",marginBottom:16,fontSize:12}}>
                  ✅ <strong>{importRows.length} filas</strong> detectadas en <strong>{importFile?.name}</strong>
                </div>

                <div style={{fontSize:12,fontWeight:600,color:C.muted,marginBottom:10,textTransform:"uppercase",letterSpacing:".5px"}}>Mapeo de columnas</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20}}>
                  {Object.keys(FIELD_ALIASES).map(field => {
                    const headers = Object.keys(importRows[0]||{});
                    const labels = {nombre:"Nombre *",telefono:"Teléfono",email:"Email",fecha_nacimiento:"Fecha nacimiento",notas:"Obra social",notas:"Notas"};
                    return (
                      <div key={field}>
                        <label style={{fontSize:11,color:C.muted,fontWeight:500,display:"block",marginBottom:4}}>{labels[field]}</label>
                        <select value={importCols[field]||""} onChange={e=>setImportCols({...importCols,[field]:e.target.value})}
                          style={{width:"100%",background:C.bg,border:`1px solid ${importCols[field]?C.accent:C.border}`,borderRadius:4,padding:"8px 12px",color:C.text,fontSize:12,fontFamily:"inherit"}}>
                          <option value="">- No importar -</option>
                          {headers.map(h=><option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>
                    );
                  })}
                </div>

                {/* Preview */}
                <div style={{fontSize:12,fontWeight:600,color:C.muted,marginBottom:8,textTransform:"uppercase",letterSpacing:".5px"}}>Vista previa (primeros {importPreview.length})</div>
                <div style={{overflowX:"auto",marginBottom:20,border:`1px solid ${C.border}`,borderRadius:4}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                    <thead>
                      <tr style={{background:C.bg}}>
                        {["Nombre","Teléfono","Email","Nac.","Obra Social"].map(h=>(
                          <th key={h} style={{padding:"8px 10px",textAlign:"left",color:C.muted,fontWeight:500,borderBottom:`1px solid ${C.border}`}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.map((row,i)=>(
                        <tr key={i} style={{borderBottom:`1px solid ${C.border}22`}}>
                          <td style={{padding:"7px 10px"}}>{row[importCols.nombre]||<span style={{color:C.muted}}>-</span>}</td>
                          <td style={{padding:"7px 10px"}}>{row[importCols.telefono]||<span style={{color:C.muted}}>-</span>}</td>
                          <td style={{padding:"7px 10px"}}>{row[importCols.email]||<span style={{color:C.muted}}>-</span>}</td>
                          <td style={{padding:"7px 10px"}}>{row[importCols.fecha_nacimiento]||<span style={{color:C.muted}}>-</span>}</td>
                          <td style={{padding:"7px 10px"}}>{row[importCols.notas]||<span style={{color:C.muted}}>-</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                  <Btn onClick={()=>setImportStep("upload")} secondary>Volver</Btn>
                  <Btn onClick={ejecutarImportacion} disabled={!importCols.nombre && !importCols.telefono}>
                    Importar {importRows.length} pacientes ->
                  </Btn>
                </div>
              </div>
            )}

            {/* PASO 3: Progreso */}
            {importando && (
              <div style={{textAlign:"center",padding:"32px 0"}}>
                <Spinner/>
                <div style={{marginTop:16,fontSize:13,color:C.muted}}>Importando... {importProgress}%</div>
                <div style={{marginTop:12,background:C.bg,borderRadius:2,height:8,overflow:"hidden"}}>
                  <div style={{height:"100%",background:C.accent,width:`${importProgress}%`,transition:"width .3s",borderRadius:4}}/>
                </div>
              </div>
            )}

            {/* PASO 4: Resultado */}
            {importStep === "resultado" && importResult && !importando && (
              <div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:20}}>
                  {[
                    {label:"Nuevos",val:importResult.importados,color:C.green},
                    {label:"Actualizados",val:importResult.actualizados||0,color:C.accent},
                    {label:"Errores",val:importResult.errores,color:C.red},
                  ].map(({label,val,color})=>(
                    <div key={label} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:2,padding:"14px 16px",textAlign:"center"}}>
                      <div style={{fontSize:28,fontWeight:700,color}}>{val}</div>
                      <div style={{fontSize:11,color:C.muted,marginTop:2}}>{label}</div>
                    </div>
                  ))}
                </div>
                <div style={{fontSize:12,color:C.muted,marginBottom:16,textAlign:"center"}}>
                  {importResult.importados} nuevos · {importResult.actualizados||0} actualizados · de {importResult.total} filas procesadas
                </div>
                {importResult.errores > 0 && (
                  <div style={{background:"rgba(239,68,68,0.05)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:4,padding:12,marginBottom:16}}>
                    <div style={{fontSize:12,color:C.red}}>{importResult.errores} filas no pudieron importarse</div>
                  </div>
                )}
                <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                  <Btn onClick={()=>{setShowImport(false);setImportResult(null);}}>Cerrar</Btn>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Modal pago unificado */}
      {showPago && pagoCtx && (
        <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.8)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1001}}>
          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:28,width:420,maxWidth:"95vw"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
              <div style={{fontSize:15,fontWeight:700}}>{pagoCtx.plan ? "Registrar pago de cuota" : "Registrar pago"}</div>
              <button onClick={()=>setShowPago(false)} style={{background:"transparent",border:"none",color:C.muted,fontSize:20,cursor:"pointer"}}>×</button>
            </div>
            <div style={{fontSize:12,color:C.muted,marginBottom:20}}>👤 {pagoCtx.paciente?.nombre}</div>

            {pagoCtx.plan && (
              <div style={{background:C.bg,borderRadius:2,padding:"10px 14px",marginBottom:16,fontSize:12}}>
                <div style={{fontWeight:600,marginBottom:4}}>{pagoCtx.plan.tratamiento}</div>
                <div style={{display:"flex",justifyContent:"space-between",color:C.muted}}>
                  <span>Sesiones pagas: <strong style={{color:C.text}}>{pagoCtx.plan.sesiones_pagas}/{pagoCtx.plan.total_sesiones}</strong></span>
                  <span>Saldo: <strong style={{color:C.red}}>{pagoCtx.plan.moneda} {(parseFloat(pagoCtx.plan.monto_total)-parseFloat(pagoCtx.plan.monto_pagado)).toLocaleString("es-AR")}</strong></span>
                </div>
              </div>
            )}

            {!pagoCtx.plan && (
              <div style={{marginBottom:12}}>
                <label style={{fontSize:11,color:C.muted,fontWeight:500,display:"block",marginBottom:5}}>Concepto</label>
                <input value={formPago.concepto} onChange={e=>setFormPago({...formPago,concepto:e.target.value})}
                  placeholder="Seña, producto, consulta..."
                  style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"10px 14px",color:C.text,fontSize:13,fontFamily:"inherit"}}/>
              </div>
            )}

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
              <div>
                <label style={{fontSize:11,color:C.muted,fontWeight:500,display:"block",marginBottom:5}}>Monto</label>
                <input type="number" value={formPago.monto} onChange={e=>setFormPago({...formPago,monto:e.target.value})} autoFocus
                  style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"10px 14px",color:C.text,fontSize:15,fontFamily:"inherit",fontWeight:600}}/>
              </div>
              <div>
                <label style={{fontSize:11,color:C.muted,fontWeight:500,display:"block",marginBottom:5}}>Moneda</label>
                <select value={formPago.moneda} onChange={e=>setFormPago({...formPago,moneda:e.target.value})}
                  style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"10px 14px",color:C.text,fontSize:13,fontFamily:"inherit"}}>
                  {(campos?.monedas||"ARS").split(",").filter(Boolean).map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div style={{marginBottom:16}}>
              <label style={{fontSize:11,color:C.muted,fontWeight:500,display:"block",marginBottom:8}}>Forma de pago</label>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {(campos?.metodos_pago||"efectivo,transferencia").split(",").filter(Boolean).map(v=>{
                  const labels = {efectivo:"💵 Efectivo",transferencia:"🏦 Transferencia",tarjeta_debito:"💳 Débito",tarjeta_credito:"💳 Crédito",mercadopago:"📱 MercadoPago",paypal:"🅿️ PayPal",stripe:"💠 Stripe",pix:"🇧🇷 Pix",zelle:"🇺🇸 Zelle",venmo:"💜 Venmo",nequi:"🇨🇴 Nequi",daviplata:"🇨🇴 Daviplata",yape:"🇵🇪 Yape",cheque:"📄 Cheque",cripto:"🔗 Cripto"};
                  return (
                    <div key={v} onClick={()=>setFormPago({...formPago,forma_pago:v})}
                      style={{padding:"6px 12px",borderRadius:4,cursor:"pointer",fontSize:12,fontWeight:formPago.forma_pago===v?700:400,
                        background:formPago.forma_pago===v?C.accent:"transparent",color:formPago.forma_pago===v?"white":C.muted,
                        border:`1px solid ${formPago.forma_pago===v?C.accent:C.border}`,transition:"all .15s"}}>
                      {labels[v]||v}
                    </div>
                  );
                })}
              </div>
            </div>

            <Field label="Nota (opcional)" value={formPago.nota} onChange={v=>setFormPago({...formPago,nota:v})} placeholder="Observación..."/>

            <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:16}}>
              <Btn onClick={()=>setShowPago(false)} secondary>Cancelar</Btn>
              <Btn onClick={confirmarPago} disabled={savingPago||!formPago.monto}>
                {savingPago?"Guardando...":"Confirmar pago"}
              </Btn>
            </div>
          </div>
        </div>
      )}

      {/* Modal nuevo resultado */}
      {showNuevoRes && (
        <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.8)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}}>
          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:28,width:540,maxWidth:"95vw",maxHeight:MH90,overflowY:"auto"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <div style={{fontSize:15,fontWeight:700}}>Agregar resultado</div>
              <button onClick={()=>setShowNuevoRes(false)} style={{background:"transparent",border:"none",color:C.muted,fontSize:20,cursor:"pointer"}}>×</button>
            </div>

            {/* Paciente */}
            {resContextPac ? (
              <div style={{background:C.accentGlow,border:`1px solid ${C.accent}44`,borderRadius:4,padding:"8px 14px",marginBottom:14,fontSize:13,color:C.accentLight}}>👤 {resContextPac.nombre}</div>
            ) : (
              <div style={{marginBottom:14}}>
                <label style={{fontSize:11,color:C.muted,fontWeight:500,display:"block",marginBottom:5}}>Cliente (opcional)</label>
                <select value={formRes.paciente_id} onChange={e=>setFormRes({...formRes,paciente_id:e.target.value})}
                  style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"10px 14px",color:C.text,fontSize:13,fontFamily:"inherit"}}>
                  <option value="">Sin prospecto</option>
                  {pacientes.map(p=><option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </div>
            )}

            {/* Tratamiento */}
            <div style={{marginBottom:14}}>
              <label style={{fontSize:11,color:C.muted,fontWeight:500,display:"block",marginBottom:5}}>Servicio</label>
              <select value={formRes.tratamiento_id} onChange={e=>setFormRes({...formRes,tratamiento_id:e.target.value,tratamiento_libre:""})}
                style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"10px 14px",color:C.text,fontSize:13,fontFamily:"inherit"}}>
                <option value="">Escribir manualmente...</option>
                {tratamientos.map(t=><option key={t.id} value={t.id}>{t.nombre}</option>)}
              </select>
              {!formRes.tratamiento_id && (
                <input value={formRes.tratamiento_libre} onChange={e=>setFormRes({...formRes,tratamiento_libre:e.target.value})}
                  placeholder="Ej: Ultraformer, Botox..."
                  style={{marginTop:6,width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"10px 14px",color:C.text,fontSize:13,fontFamily:"inherit"}}/>
              )}
            </div>

            <Field label="Fecha" value={formRes.fecha} onChange={v=>setFormRes({...formRes,fecha:v})} type="date"/>

            {/* Fotos */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
              {[["Antes",fotoAntes,setFotoAntes,fotoAntesURL,setFotoAntesURL],["Después",fotoDespues,setFotoDespues,fotoDespuesURL,setFotoDespuesURL]].map(([label,file,setFile,url,setUrl])=>(
                <div key={label}>
                  <label style={{fontSize:11,color:C.muted,fontWeight:500,display:"block",marginBottom:5}}>{label}</label>
                  <label style={{display:"block",cursor:"pointer"}}>
                    <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{
                      const f=e.target.files[0];
                      if(!f) return;
                      setFile(f);
                      setUrl(URL.createObjectURL(f));
                    }}/>
                    <div style={{border:`2px dashed ${url?C.accent:C.border}`,borderRadius:2,overflow:"hidden",height:140,display:"flex",alignItems:"center",justifyContent:"center",background:C.bg,position:"relative"}}>
                      {url
                        ? <img src={url} alt={label} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                        : <div style={{textAlign:"center",color:C.muted}}>
                            <div style={{fontSize:24,marginBottom:4}}>📷</div>
                            <div style={{fontSize:11}}>Tocar para seleccionar</div>
                          </div>
                      }
                    </div>
                  </label>
                </div>
              ))}
            </div>

            <Field label="Nota (opcional)" value={formRes.nota} onChange={v=>setFormRes({...formRes,nota:v})} placeholder="Descripción del resultado..." textarea/>

            {uploadProgress && <div style={{fontSize:12,color:C.accent,marginBottom:12,textAlign:"center"}}>{uploadProgress}</div>}

            <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
              <Btn onClick={()=>setShowNuevoRes(false)} secondary>Cancelar</Btn>
              <Btn onClick={guardarResultado} disabled={savingRes||(!fotoAntes&&!fotoDespues)}>{savingRes?"Subiendo...":"Guardar resultado"}</Btn>
            </div>
          </div>
        </div>
      )}

      {/* Modales globales - disponibles desde cualquier tab */}
      {/* -- MODAL TURNO UNIFICADO (nuevo + editar) -- */}
      {(showNuevoTurno || (showEditTurno && editTurnoData)) && (() => {
        const esEdicion = !showNuevoTurno && showEditTurno;
        const METODOS_LABELS = {efectivo:"Efectivo",transferencia:"Transferencia",tarjeta_debito:"Tarjeta débito",tarjeta_credito:"Tarjeta crédito",mercadopago:"MercadoPago",paypal:"PayPal",stripe:"Stripe",pix:"Pix",zelle:"Zelle",venmo:"Venmo",nequi:"Nequi",daviplata:"Daviplata",yape:"Yape",cheque:"Cheque",cripto:"Cripto"};
        const MONEDA_LABELS = {ARS:"Pesos argentinos",USD:"Dólares (USD)",EUR:"Euros (EUR)",BRL:"Reales (BRL)",UYU:"Pesos uruguayos",CLP:"Pesos chilenos",MXN:"Pesos mexicanos",COP:"Pesos colombianos",PEN:"Soles (PEN)",PYG:"Guaraníes",BOB:"Bolivianos",VES:"Bolívares",JUL:"JUL"};
        const SERVICIOS_LEGALES = ["Consulta inicial","Asesoramiento legal","Redacción de contrato","Revisión de documento","Mediación","Representación judicial","Consulta urgente"];
        const cerrar = () => { setShowNuevoTurno(false); setShowEditTurno(false); setErrTurno(null); setErrEditTurno(null); setTurnoStep("buscar"); setTurnoPaciente(null); setTurnoSearch(""); setTurnoSearchRes([]); };
        const pacienteActual = esEdicion ? (selPac || {nombre: editTurnoData?.paciente_nombre}) : turnoPaciente;
        return (
          <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.8)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}}>
            <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:28,width:560,maxWidth:"96vw",maxHeight:MH92,overflowY:"auto"}}>

              {/* Header */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
                <div>
                  <div style={{fontSize:16,fontWeight:700}}>{esEdicion ? "Editar turno" : "Nueva consulta"}</div>
                  {pacienteActual && <div style={{fontSize:12,color:C.accent,marginTop:2}}>👤 {pacienteActual.nombre}{esEdicion && editTurnoData?.tratamiento ? ` · ${editTurnoData.tratamiento}` : ""}</div>}
                </div>
                <button onClick={cerrar} style={{background:"transparent",border:"none",color:C.muted,fontSize:20,cursor:"pointer",lineHeight:1}}>×</button>
              </div>

              {/* -- MODO EDICIÓN -- */}
              {esEdicion && editTurnoData && (
                <div>
                  {/* Estado turno */}
                  <div style={{marginBottom:18}}>
                    <label style={{fontSize:11,color:C.muted,fontWeight:500,display:"block",marginBottom:8,textTransform:"uppercase",letterSpacing:".6px"}}>Estado del turno</label>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                      {[{v:"pendiente",l:"Pendiente",c:"#6366f1"},{v:"confirmado",l:"✓ Confirmado",c:"#3b82f6"},{v:"realizado",l:"✓✓ Realizado",c:C.green},{v:"no_show",l:"No se presentó",c:C.red},{v:"cancelado",l:"Cancelado",c:"#64748b"}].map(s=>(
                        <div key={s.v} onClick={()=>setEditTurnoData({...editTurnoData,estado_turno:s.v})}
                          style={{padding:"6px 13px",borderRadius:4,border:`1px solid ${editTurnoData.estado_turno===s.v?s.c:C.border}`,background:editTurnoData.estado_turno===s.v?`${s.c}22`:"transparent",cursor:"pointer",fontSize:12,fontWeight:editTurnoData.estado_turno===s.v?700:400,color:editTurnoData.estado_turno===s.v?s.c:C.muted,transition:"all .15s"}}>
                          {s.l}
                        </div>
                      ))}
                    </div>
                    {(editTurnoData.estado_turno==="no_show"||editTurnoData.estado_turno==="cancelado") && (
                      <div style={{marginTop:8,padding:"7px 12px",background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:4,fontSize:12,color:"#f87171"}}>
                        ⚡ {editTurnoData.estado_turno==="no_show" ? "Se enviará seguimiento de recuperación automáticamente" : "Recordatorio automático en 3 días"}
                      </div>
                    )}
                  </div>
                  <div style={{height:1,background:C.border,marginBottom:16}}/>
                  {/* Datos */}
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
                    <Field label="Servicio" value={editTurnoData.tratamiento} onChange={v=>setEditTurnoData({...editTurnoData,tratamiento:v})}/>
                    <div>
                      <label style={{fontSize:11,color:C.muted,fontWeight:500,display:"block",marginBottom:5}}>Profesional</label>
                      <select value={editTurnoData.profesional||""} onChange={e=>setEditTurnoData({...editTurnoData,profesional:e.target.value})} style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"10px 14px",color:C.text,fontSize:13,fontFamily:"inherit"}}>
                        <option value="">Sin asignar</option>
                        {profesionales.map(p=><option key={p.id} value={p.nombre}>{p.nombre}{p.rol?` · ${p.rol}`:""}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{fontSize:11,color:C.muted,fontWeight:500,display:"block",marginBottom:5}}>Fecha</label>
                      <input type="date" value={editTurnoData.fecha||""} onChange={e=>setEditTurnoData({...editTurnoData,fecha:e.target.value})} style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"10px 14px",color:C.text,fontSize:13,fontFamily:"inherit"}}/>
                    </div>
                    <div>
                      <label style={{fontSize:11,color:C.muted,fontWeight:500,display:"block",marginBottom:5}}>Horario</label>
                      <div style={{display:"flex",gap:6,alignItems:"center"}}>
                        <input type="time" value={editTurnoData.hora_inicio||""} onChange={e=>setEditTurnoData({...editTurnoData,hora_inicio:e.target.value})} style={{flex:1,background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"10px 8px",color:C.text,fontSize:13,fontFamily:"inherit"}}/>
                        <span style={{color:C.muted,fontSize:12}}>a</span>
                        <input type="time" value={editTurnoData.hora_fin||""} onChange={e=>setEditTurnoData({...editTurnoData,hora_fin:e.target.value})} style={{flex:1,background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"10px 8px",color:C.text,fontSize:13,fontFamily:"inherit"}}/>
                      </div>
                    </div>
                  </div>
                  <div style={{height:1,background:C.border,marginBottom:14}}/>
                  <div style={{fontSize:11,color:C.muted,textTransform:"uppercase",letterSpacing:".6px",fontWeight:500,marginBottom:12}}>Pago</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                    <div><label style={{fontSize:11,color:C.muted,fontWeight:500,display:"block",marginBottom:5}}>Monto total</label>
                      <input type="number" value={editTurnoData.monto||""} onChange={e=>setEditTurnoData({...editTurnoData,monto:e.target.value})} style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"10px 14px",color:C.text,fontSize:13,fontFamily:"inherit"}}/></div>
                    <div><label style={{fontSize:11,color:C.muted,fontWeight:500,display:"block",marginBottom:5}}>Sesiones totales</label>
                      <input type="number" min="1" value={editTurnoData.cuotas||1} onChange={e=>setEditTurnoData({...editTurnoData,cuotas:parseInt(e.target.value)||1})} style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"10px 14px",color:C.text,fontSize:13,fontFamily:"inherit"}}/></div>
                    <div><label style={{fontSize:11,color:C.muted,fontWeight:500,display:"block",marginBottom:5}}>Pagado hasta ahora</label>
                      <input type="number" value={editTurnoData.monto_pagado||""} onChange={e=>setEditTurnoData({...editTurnoData,monto_pagado:e.target.value})} style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"10px 14px",color:C.text,fontSize:13,fontFamily:"inherit"}}/></div>
                    <div><label style={{fontSize:11,color:C.muted,fontWeight:500,display:"block",marginBottom:5}}>Moneda</label>
                      <select value={editTurnoData.moneda||""} onChange={e=>setEditTurnoData({...editTurnoData,moneda:e.target.value})} style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"10px 14px",color:C.text,fontSize:13,fontFamily:"inherit"}}>
                        {(campos?.monedas||"ARS").split(",").filter(Boolean).map(c=><option key={c} value={c}>{c}</option>)}
                      </select></div>
                    <div><label style={{fontSize:11,color:C.muted,fontWeight:500,display:"block",marginBottom:5}}>Forma de pago</label>
                      <select value={editTurnoData.forma_pago||""} onChange={e=>setEditTurnoData({...editTurnoData,forma_pago:e.target.value})} style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"10px 14px",color:C.text,fontSize:13,fontFamily:"inherit"}}>
                        {(campos?.metodos_pago||"efectivo,transferencia").split(",").filter(Boolean).map(v=><option key={v} value={v}>{METODOS_LABELS[v]||v}</option>)}
                      </select></div>
                    <div><label style={{fontSize:11,color:C.muted,fontWeight:500,display:"block",marginBottom:5}}>Estado pago</label>
                      <select value={editTurnoData.estado_pago||"pendiente"} onChange={e=>setEditTurnoData({...editTurnoData,estado_pago:e.target.value})} style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"10px 14px",color:C.text,fontSize:13,fontFamily:"inherit"}}>
                        <option value="pendiente">Pendiente</option><option value="parcial">Parcial</option><option value="pagado">Pagado</option>
                      </select></div>
                  </div>
                  {editTurnoData.monto && editTurnoData.cuotas > 1 && (
                    <div style={{background:C.accentGlow,border:`1px solid ${C.accent}44`,borderRadius:4,padding:"9px 14px",marginBottom:12,fontSize:12}}>
                      💰 <strong>{editTurnoData.moneda||"ARS"} {(parseFloat(editTurnoData.monto||0)/parseInt(editTurnoData.cuotas||1)).toLocaleString("es-AR",{maximumFractionDigits:0})}</strong> por sesión · {editTurnoData.cuotas} sesiones
                    </div>
                  )}
                  <Field label="Notas de pago" value={editTurnoData.notas_pago||""} onChange={v=>setEditTurnoData({...editTurnoData,notas_pago:v})} placeholder="Observaciones..." textarea/>
                  {editTurnoData.historial_cambios?.length > 0 && (
                    <div style={{marginTop:12}}>
                      <div style={{fontSize:11,color:C.muted,textTransform:"uppercase",letterSpacing:".6px",fontWeight:500,marginBottom:6}}>Historial</div>
                      {editTurnoData.historial_cambios.map((h,i)=>(
                        <div key={i} style={{fontSize:11,color:C.muted,padding:"5px 0",borderTop:`1px solid ${C.border}`}}>
                          <span style={{color:C.text}}>{new Date(h.fecha).toLocaleDateString("es-AR",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}</span>
                          {h.cambios.map((c,j)=><span key={j}> · {c.campo}: <span style={{textDecoration:"line-through"}}>{c.de}</span> -> <span style={{color:C.accentLight}}>{c.a}</span></span>)}
                        </div>
                      ))}
                    </div>
                  )}
                  {errEditTurno && <div style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:4,padding:"8px 12px",fontSize:12,color:C.red,marginTop:12}}>{errEditTurno}</div>}
                  <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:16}}>
                    <Btn onClick={cerrar} secondary>Cancelar</Btn>
                    <Btn onClick={guardarEditTurno} disabled={savingEditTurno}>{savingEditTurno?"Guardando...":"Guardar cambios"}</Btn>
                  </div>
                </div>
              )}

              {/* -- MODO NUEVO -- */}
              {!esEdicion && (
                <div>
                  {/* Paciente - siempre visible arriba */}
                  {!turnoPaciente ? (
                    <div style={{marginBottom:18}}>
                      <label style={{fontSize:11,color:C.muted,fontWeight:500,display:"block",marginBottom:8,textTransform:"uppercase",letterSpacing:".6px"}}>Cliente</label>
                      <input value={turnoSearch} onChange={e=>buscarPacientesModal(e.target.value)}
                        placeholder="Buscar por nombre o teléfono..."
                        style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"10px 14px",color:C.text,fontSize:13,fontFamily:"inherit",marginBottom:6}}/>
                      {turnoSearchRes.length > 0 && (
                        <div style={{border:`1px solid ${C.border}`,borderRadius:4,overflow:"hidden",marginBottom:8}}>
                          {turnoSearchRes.map(p=>(
                            <div key={p.id} className="pi" onClick={()=>seleccionarPacienteTurno(p)}
                              style={{padding:"9px 14px",borderBottom:`1px solid ${C.border}`,cursor:"pointer"}}>
                              <div style={{fontWeight:600,fontSize:13}}>{p.nombre}</div>
                              <div style={{fontSize:11,color:C.muted}}>{p.telefono||""}{p.documento?` · ${p.documento}`:""}</div>
                            </div>
                          ))}
                        </div>
                      )}
                      {turnoSearch.length > 1 && turnoSearchRes.length === 0 && <div style={{fontSize:12,color:C.muted,textAlign:"center",padding:"10px 0"}}>Sin resultados</div>}
                      <div style={{height:1,background:C.border,margin:"10px 0"}}/>
                      {turnoStep !== "nuevo_pac" && <Btn onClick={()=>setTurnoStep("nuevo_pac")} secondary small>+ Crear cliente nuevo</Btn>}
                      {turnoStep === "nuevo_pac" && (
                        <div style={{marginTop:12,background:"rgba(99,102,241,0.06)",border:`1px solid ${C.border}`,borderRadius:4,padding:14}}>
                          <div style={{fontSize:11,color:C.accent,textTransform:"uppercase",letterSpacing:".6px",fontWeight:600,marginBottom:10}}>① Completá los datos del cliente</div>
                          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                            <Field label="Nombre *" value={formNuevoPac.nombre} onChange={v=>setFormNuevoPac({...formNuevoPac,nombre:v})} placeholder="Nombre completo"/>
                            <Field label="Teléfono" value={formNuevoPac.telefono} onChange={v=>setFormNuevoPac({...formNuevoPac,telefono:v})} placeholder="+54 9..."/>
                            <Field label={camposGlobal?.documento_label||"Documento"} value={formNuevoPac.documento} onChange={v=>setFormNuevoPac({...formNuevoPac,documento:v})}/>
                            <Field label="Email" value={formNuevoPac.email} onChange={v=>setFormNuevoPac({...formNuevoPac,email:v})}/>
                          </div>
                          {formTurno.fecha && (
                            <div style={{marginTop:10,padding:"8px 12px",background:C.bg,borderRadius:2,border:`1px solid ${C.border}`,fontSize:12,color:C.muted}}>
                              📅 Turno: <span style={{color:C.text,fontWeight:600}}>{new Date(formTurno.fecha+'T12:00:00').toLocaleDateString('es-AR',{weekday:'long',day:'numeric',month:'long'})}</span> a las <span style={{color:C.text,fontWeight:600}}>{formTurno.hora_inicio?.replace(':00','')+'hs'}</span>
                            </div>
                          )}
                          <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:12}}>
                            <Btn onClick={()=>setTurnoStep("buscar")} secondary small>Cancelar</Btn>
                            <Btn onClick={crearNuevoPacYSeguir} disabled={savingNuevoPac||!formNuevoPac.nombre} small>{savingNuevoPac?"Creando...":"② Crear y continuar →"}</Btn>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,padding:"8px 12px",background:C.accentGlow,border:`1px solid ${C.accent}44`,borderRadius:4}}>
                      <span style={{fontSize:13,fontWeight:600,color:C.accentLight}}>👤 {turnoPaciente.nombre}</span>
                      <button onClick={()=>{setTurnoPaciente(null);setTurnoSearch("");setTurnoSearchRes([]);setTurnoStep("buscar");}} style={{background:"transparent",border:"none",color:C.muted,cursor:"pointer",fontSize:12}}>Cambiar</button>
                    </div>
                  )}

                  {/* Formulario turno - visible siempre que haya paciente */}
                  {turnoPaciente && (
                    <div>
                      <div style={{height:1,background:C.border,marginBottom:14}}/>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
                        <div>
                          <label style={{fontSize:11,color:C.muted,fontWeight:500,display:"block",marginBottom:5}}>Servicio</label>
                          <select
                            value={SERVICIOS_LEGALES.includes(formTurno.tratamiento_libre)?formTurno.tratamiento_libre:"__manual"}
                            onChange={e=>{
                              if(e.target.value==="__manual") setFormTurno({...formTurno,tratamiento_id:"",tratamiento_libre:""});
                              else setFormTurno({...formTurno,tratamiento_id:"",tratamiento_libre:e.target.value});
                            }}
                            style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"10px 14px",color:C.text,fontSize:13,fontFamily:"inherit"}}>
                            <option value="__manual">✏️ Escribir manualmente...</option>
                            {SERVICIOS_LEGALES.map(s=><option key={s} value={s}>{s}</option>)}
                          </select>
                          {!SERVICIOS_LEGALES.includes(formTurno.tratamiento_libre) && (
                            <input value={formTurno.tratamiento_libre} onChange={e=>setFormTurno({...formTurno,tratamiento_libre:e.target.value})} placeholder="Ej: Consulta inicial, asesoramiento..." style={{marginTop:6,width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"10px 14px",color:C.text,fontSize:13,fontFamily:"inherit"}}/>
                          )}
                        </div>
                        <div>
                          <label style={{fontSize:11,color:C.muted,fontWeight:500,display:"block",marginBottom:5}}>Profesional</label>
                          <select value={formTurno.profesional_id} onChange={e=>setFormTurno({...formTurno,profesional_id:e.target.value})} style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"10px 14px",color:C.text,fontSize:13,fontFamily:"inherit"}}>
                            <option value="">Sin asignar</option>
                            {profesionales.map(p=><option key={p.id} value={p.id}>{p.nombre}{p.rol?` · ${p.rol}`:""}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={{fontSize:11,color:C.muted,fontWeight:500,display:"block",marginBottom:5}}>Fecha *</label>
                          <input type="date" value={formTurno.fecha} onChange={e=>setFormTurno({...formTurno,fecha:e.target.value})} style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"10px 14px",color:C.text,fontSize:13,fontFamily:"inherit"}}/>
                        </div>
                        <div>
                          <label style={{fontSize:11,color:C.muted,fontWeight:500,display:"block",marginBottom:5}}>Horario</label>
                          <div style={{display:"flex",gap:6,alignItems:"center"}}>
                            <input type="time" value={formTurno.hora_inicio} onChange={e=>setFormTurno({...formTurno,hora_inicio:e.target.value})} style={{flex:1,background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"10px 8px",color:C.text,fontSize:13,fontFamily:"inherit"}}/>
                            <span style={{color:C.muted,fontSize:12}}>a</span>
                            <input type="time" value={formTurno.hora_fin} onChange={e=>setFormTurno({...formTurno,hora_fin:e.target.value})} style={{flex:1,background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"10px 8px",color:C.text,fontSize:13,fontFamily:"inherit"}}/>
                          </div>
                        </div>
                      </div>
                      <div style={{height:1,background:C.border,marginBottom:14}}/>
                      <div style={{fontSize:11,color:C.muted,textTransform:"uppercase",letterSpacing:".6px",fontWeight:500,marginBottom:12}}>Pago <span style={{fontSize:10,fontWeight:400,textTransform:"none",letterSpacing:0}}>(opcional)</span></div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:12}}>
                        <div><label style={{fontSize:11,color:C.muted,fontWeight:500,display:"block",marginBottom:5}}>Monto</label>
                          <input type="text" inputMode="numeric"
                            value={formTurno.monto ? Number(formTurno.monto).toLocaleString('es-AR') : ''}
                            onChange={e=>{const raw=e.target.value.replace(/\./g,'').replace(/[^0-9]/g,'');setFormTurno({...formTurno,monto:raw});}}
                            placeholder="0" style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"10px 14px",color:C.text,fontSize:13,fontFamily:"inherit"}}/></div>
                        <div><label style={{fontSize:11,color:C.muted,fontWeight:500,display:"block",marginBottom:5}}>Moneda</label>
                          <select value={formTurno.moneda} onChange={e=>setFormTurno({...formTurno,moneda:e.target.value})} style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"10px 14px",color:C.text,fontSize:13,fontFamily:"inherit"}}>
                            {(campos?.monedas||"ARS").split(",").filter(Boolean).map(c=><option key={c} value={c}>{MONEDA_LABELS[c]||c}</option>)}
                          </select></div>
                        <div><label style={{fontSize:11,color:C.muted,fontWeight:500,display:"block",marginBottom:5}}>Estado</label>
                          <select value={formTurno.estado_pago} onChange={e=>setFormTurno({...formTurno,estado_pago:e.target.value})} style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"10px 14px",color:C.text,fontSize:13,fontFamily:"inherit"}}>
                            <option value="pendiente">Pendiente</option><option value="parcial">Parcial</option><option value="pagado">Pagado</option>
                          </select></div>
                        <div><label style={{fontSize:11,color:C.muted,fontWeight:500,display:"block",marginBottom:5}}>Forma de pago</label>
                          <select value={formTurno.forma_pago} onChange={e=>setFormTurno({...formTurno,forma_pago:e.target.value})} style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"10px 14px",color:C.text,fontSize:13,fontFamily:"inherit"}}>
                            {(campos?.metodos_pago||"efectivo,transferencia").split(",").filter(Boolean).map(v=><option key={v} value={v}>{METODOS_LABELS[v]||v}</option>)}
                          </select></div>
                      </div>
                      <div style={{marginBottom:14}}>
                        <label style={{fontSize:11,color:C.muted,fontWeight:500,display:"block",marginBottom:6}}>Tipo de consulta</label>
                        <div style={{display:"flex",gap:8}}>
                          {[{v:"paga",l:"💰 Paga"},{v:"gratis",l:"🆓 Gratis"},{v:"seña",l:"🤝 Seña"}].map(t=>(
                            <div key={t.v} onClick={()=>setFormTurno({...formTurno,tipo_consulta:t.v})}
                              style={{flex:1,textAlign:"center",padding:"8px 4px",borderRadius:4,border:`1px solid ${formTurno.tipo_consulta===t.v?C.accent:C.border}`,background:formTurno.tipo_consulta===t.v?C.accentGlow:"transparent",cursor:"pointer",fontSize:12,fontWeight:formTurno.tipo_consulta===t.v?700:400,color:formTurno.tipo_consulta===t.v?C.accentLight:C.muted,transition:"all .15s"}}>
                              {t.l}
                            </div>
                          ))}
                        </div>
                      </div>
                      <Field label="Notas" value={formTurno.notas_pago} onChange={v=>setFormTurno({...formTurno,notas_pago:v})} placeholder="Observaciones..." textarea/>
                      {errTurno && <div style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:4,padding:"8px 12px",fontSize:12,color:C.red,marginBottom:12}}>{errTurno}</div>}
                      <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:12}}>
                        <Btn onClick={cerrar} secondary>Cancelar</Btn>
                        <Btn onClick={()=>crearTurno(turnoPaciente.id)} disabled={savingTurno||!turnoPaciente}>{savingTurno?"Guardando...":"Confirmar consulta ✓"}</Btn>
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        );
      })()}

    </div>

      {/* Modal Calendario Disponibilidad — fuera del overflow:hidden */}
      {modalCalendario && selectedProspect && client && (
        <CalendarioDisponibilidad
          clienteId={client.id}
          prospecto={selectedProspect}
          API={API}
          aH={aH}
          jH={jH}
          onCerrar={()=>{ setModalCalendario(false); setReagendaMode(false); }}
          onSeleccionar={async (slots)=>{
            // slots puede ser array (multi-selección) o objeto único (legacy)
            const slotsArr = Array.isArray(slots) ? slots : [slots];
            const nombrePac = selectedProspect?.nombre ? `, ${selectedProspect.nombre.split(' ')[0]}` : '';
            const tratPac = selectedProspect?.tratamiento && selectedProspect.tratamiento !== 'Consulta General' ? ` para ${selectedProspect.tratamiento}` : '';

            if (reagendaMode) {
              setReagendaMode(false);
              try {
                const rTurnos = await fetch(`${API}/api/turnos?cliente_id=${client.id}&paciente_tel=${selectedProspect.telefono}`, {headers:aH()});
                const turnos = await rTurnos.json().catch(()=>[]);
                const turnoActivo = Array.isArray(turnos) ? turnos.find(t=>t.estado_turno!=='cancelado') : null;
                if (turnoActivo) {
                  await fetch(`${API}/api/turnos/${turnoActivo.id}`, {method:'PUT',headers:jH(),body:JSON.stringify({estado_turno:'cancelado',cliente_id:client.id})}).catch(()=>{});
                }
                await fetch(`${API}/api/prospectos/${selectedProspect.id}`, {method:'PUT',headers:jH(),body:JSON.stringify({reagenda_pendiente:false,modo_humano:false,listo_para_cierre:false,cliente_id:client.id})}).catch(()=>{});
                setSelectedProspect({...selectedProspect,reagenda_pendiente:false,modo_humano:false,listo_para_cierre:false});
              } catch(e) { console.error(e); }
            }

            // Armar mensaje según cantidad de slots
            let msgTexto = '';
            if (slotsArr.length === 1) {
              const s = slotsArr[0];
              const fechaStr = new Date(s.fecha+'T12:00:00').toLocaleDateString('es-AR',{weekday:'long',day:'numeric',month:'long'});
              const horaStr = s.hora.replace(':00','');
              msgTexto = reagendaMode
                ? `Hola${nombrePac}! Tenemos disponibilidad el ${fechaStr} a las ${horaStr}hs${tratPac} para reagendar tu turno. ¿Te viene bien?`
                : `Hola${nombrePac}! Tenemos disponibilidad el ${fechaStr} a las ${horaStr}hs${tratPac}. ¿Te viene bien?`;
            } else {
              const opciones = slotsArr.map((s,i) => {
                const fechaStr = new Date(s.fecha+'T12:00:00').toLocaleDateString('es-AR',{weekday:'long',day:'numeric',month:'long'});
                return `${['1️⃣','2️⃣','3️⃣'][i]} ${fechaStr} a las ${s.hora.replace(':00','')}hs`;
              }).join('\n');
              msgTexto = 'Hola' + nombrePac + '! Tenemos estas opciones disponibles' + tratPac + ':\n\n' + opciones + '\n\n¿Cuál te queda mejor?';
            }

            setMsgManual(msgTexto);
            setHorariosParaEnviar(slotsArr.map(s => ({
              fecha: s.fecha,
              hora: s.hora,
              label: new Date(s.fecha+'T12:00:00').toLocaleDateString('es-AR',{weekday:'long',day:'numeric',month:'long'})
            })));
            setModalCalendario(false);
          }}
        />
      )}
    </>
  );
}

// -- MAIN ----------------------------------------------------------------------

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}


// ============================================================
// CALENDARIO FANTASMA — Modal fullscreen para ofrecer horarios
// ============================================================
function CalendarioDisponibilidad({ clienteId, prospecto, API, aH, jH, onSeleccionar, onCerrar }) {
  const [turnos, setTurnos] = useState([]);
  const [horariosClinica, setHorariosClinica] = useState([]);
  const [fecha, setFecha] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [slotsSeleccionados, setSlotsSeleccionados] = useState([]); // hasta 3 slots
  const [expandidos, setExpandidos] = useState({}); // {fechaStr: true} días expandidos

  // Cargar turnos y horarios del mes actual
  useEffect(() => {
    if (!clienteId) return;
    setLoading(true);
    const d = new Date(fecha);
    const desde = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
    const hasta = new Date(d.getFullYear(), d.getMonth()+1, 0).toISOString().split('T')[0];
    Promise.all([
      fetch(`${API}/api/turnos?cliente_id=${clienteId}&desde=${desde}&hasta=${hasta}`, { headers: aH() }).then(r=>r.json()).catch(()=>[]),
      fetch(`${API}/api/horarios-clinica?cliente_id=${clienteId}`, { headers: aH() }).then(r=>r.json()).catch(()=>[]),
    ]).then(([t, h]) => {
      setTurnos(Array.isArray(t) ? t : []);
      setHorariosClinica(Array.isArray(h) ? h : []);
      setLoading(false);
    });
  }, [fecha, clienteId]);

  const DIAS = ['Dom','Lun','Mar','Mie','Jue','Vie','Sab'];
  const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  // Generar slots para un día (filtra pasados si es hoy)
  const getSlotsDelDia = (fechaStr) => {
    const d = new Date(fechaStr + 'T12:00:00');
    const dow = d.getDay();
    const hConfig = horariosClinica.filter(h => h.dia_semana === dow);
    let slots = [];
    if (hConfig.length > 0) {
      hConfig.forEach(h => {
        const [hi] = h.hora_inicio.split(':').map(Number);
        const [hf] = h.hora_fin.split(':').map(Number);
        for (let hora = hi; hora < hf; hora++) {
          slots.push(`${String(hora).padStart(2,'0')}:00`);
        }
      });
    } else {
      if (dow === 0) return [];
      const fin = dow === 6 ? 13 : 18;
      for (let h = 9; h < fin; h++) slots.push(`${String(h).padStart(2,'0')}:00`);
    }
    // Filtrar slots pasados si es hoy
    const ahora = new Date();
    const esHoyFecha = fechaStr === ahora.toISOString().split('T')[0];
    if (esHoyFecha) {
      const ahoraMin = ahora.getHours() * 60 + ahora.getMinutes();
      slots = slots.filter(s => {
        const [hh, mm] = s.split(':').map(Number);
        return hh * 60 + (mm||0) > ahoraMin + 30; // margen 30min
      });
    }
    return slots;
  };

  // Ver si un slot está ocupado
  const estaOcupado = (fechaStr, hora) => {
    return turnos.some(t => {
      const tFecha = (t.fecha||'').substring(0,10);
      const tHora = (t.hora||'').substring(0,5);
      return tFecha === fechaStr && tHora === hora && !['cancelado','rechazado'].includes(t.estado_turno);
    });
  };

  // Construir semanas del mes
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const primerDia = new Date(fecha.getFullYear(), fecha.getMonth(), 1);
  const ultimoDia = new Date(fecha.getFullYear(), fecha.getMonth()+1, 0);
  const startDow = primerDia.getDay();
  const semanas = [];
  let semana = [];
  for (let i = 0; i < startDow; i++) semana.push(null);
  for (let d = 1; d <= ultimoDia.getDate(); d++) {
    semana.push(new Date(fecha.getFullYear(), fecha.getMonth(), d));
    if (semana.length === 7) { semanas.push(semana); semana = []; }
  }
  while (semana.length < 7 && semana.length > 0) semana.push(null);
  if (semana.length) semanas.push(semana);

  const mesAnt = () => { const d = new Date(fecha); d.setMonth(d.getMonth()-1); setFecha(d); };
  const mesSig = () => { const d = new Date(fecha); d.setMonth(d.getMonth()+1); setFecha(d); };

  return (
    <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.92)',zIndex:9999,display:'flex',flexDirection:'column',overflow:'hidden'}}>
      {/* Header */}
      <div style={{background:'#0d1117',borderBottom:'1px solid #2a3942',padding:'12px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <span style={{fontSize:20}}>📅</span>
          <div>
            <div style={{fontWeight:700,fontSize:15,color:'white'}}>Disponibilidad para {prospecto?.nombre||prospecto?.telefono}</div>
            <div style={{fontSize:11,color:'#8696a0'}}>
              {prospecto?.tratamiento ? `${prospecto.tratamiento} · ` : ''}
              {prospecto?.preferencia_horaria && prospecto.preferencia_horaria !== 'cualquiera' ? `Prefiere ${prospecto.preferencia_horaria}` : 'Sin preferencia horaria'}
            </div>
          </div>
        </div>
        <button onClick={onCerrar} style={{background:'transparent',border:'none',color:'#8696a0',fontSize:22,cursor:'pointer',padding:'4px 8px'}}>✕</button>
      </div>

      {/* Leyenda */}
      <div style={{background:'#111b21',padding:'6px 20px',display:'flex',gap:16,flexShrink:0,borderBottom:'1px solid #2a3942'}}>
        {[['#10b981','Libre'],['#374151','Ocupado'],['#f97316','Seleccionado (hasta 3)']].map(([col,lbl])=>(
          <div key={col} style={{display:'flex',alignItems:'center',gap:5}}>
            <div style={{width:10,height:10,borderRadius:2,background:col}}/>
            <span style={{fontSize:10,color:'#8696a0'}}>{lbl}</span>
          </div>
        ))}
      </div>

      {/* Navegación mes */}
      <div style={{background:'#111b21',padding:'8px 20px',display:'flex',alignItems:'center',gap:12,flexShrink:0}}>
        <button onClick={mesAnt} style={{background:'#2a3942',border:'none',color:'white',borderRadius:4,padding:'4px 10px',cursor:'pointer',fontSize:14}}>‹</button>
        <span style={{fontWeight:700,fontSize:15,color:'white',minWidth:160,textAlign:'center'}}>{MESES[fecha.getMonth()]} {fecha.getFullYear()}</span>
        <button onClick={mesSig} style={{background:'#2a3942',border:'none',color:'white',borderRadius:4,padding:'4px 10px',cursor:'pointer',fontSize:14}}>›</button>
      </div>

      {/* Calendario */}
      <div style={{flex:1,overflow:'auto',padding:'12px 16px'}}>
        {loading ? (
          <div style={{textAlign:'center',color:'#8696a0',padding:40}}>Cargando disponibilidad...</div>
        ) : (
          <>
            {/* Cabecera días */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:4,marginBottom:4}}>
              {DIAS.map(d=><div key={d} style={{textAlign:'center',fontSize:11,color:'#8696a0',fontWeight:600,padding:'4px 0'}}>{d}</div>)}
            </div>
            {/* Semanas */}
            {semanas.map((sem, si) => (
              <div key={si} style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:4,marginBottom:4}}>
                {sem.map((dia, di) => {
                  if (!dia) return <div key={di}/>;
                  const fechaStr = dia.toISOString().split('T')[0];
                  const esPasado = dia < hoy;
                  const slots = getSlotsDelDia(fechaStr);
                  const libres = slots.filter(s => !estaOcupado(fechaStr, s));
                  const esHoy = dia.toDateString() === hoy.toDateString();
                  return (
                    <div key={di} style={{
                      minHeight:80,border:`1px solid ${esHoy?'#f97316':'#2a3942'}`,borderRadius:4,
                      padding:'4px',background:esPasado?'rgba(255,255,255,0.02)':'#111b21',
                      opacity:esPasado?0.4:1
                    }}>
                      <div style={{fontSize:11,fontWeight:esHoy?700:500,color:esHoy?'#f97316':'#8696a0',marginBottom:3,textAlign:'center'}}>{dia.getDate()}</div>
                      {!esPasado && (
                        <div style={{display:'flex',flexDirection:'column',gap:2}}>
                          {slots.length === 0 ? (
                            <div style={{fontSize:9,color:'#374151',textAlign:'center'}}>cerrado</div>
                          ) : libres.length === 0 ? (
                            <div style={{fontSize:9,color:'#374151',textAlign:'center'}}>completo</div>
                          ) : (() => {
                            const expandido = expandidos[fechaStr];
                            const visibles = expandido ? libres : libres.slice(0,4);
                            const resto = libres.length - 4;
                            return (
                              <>
                                {visibles.map(hora => {
                                  const seleccionado = slotsSeleccionados.some(s=>s.fecha===fechaStr&&s.hora===hora);
                                  return (
                                    <button key={hora} onClick={()=>{
                                        const key = fechaStr+'_'+hora;
                                        const yaEsta = slotsSeleccionados.some(s=>s.fecha===fechaStr&&s.hora===hora);
                                        if (yaEsta) {
                                          setSlotsSeleccionados(slotsSeleccionados.filter(s=>!(s.fecha===fechaStr&&s.hora===hora)));
                                        } else if (slotsSeleccionados.length < 3) {
                                          setSlotsSeleccionados([...slotsSeleccionados, {fecha:fechaStr,hora,dia}]);
                                        }
                                      }}
                                      style={{
                                        fontSize:9,padding:'2px 3px',borderRadius:2,border:'none',cursor:'pointer',
                                        fontWeight:slotsSeleccionados.some(s=>s.fecha===fechaStr&&s.hora===hora)?700:400,
                                        background:slotsSeleccionados.some(s=>s.fecha===fechaStr&&s.hora===hora)?'#f97316':'#10b981',
                                        color:slotsSeleccionados.some(s=>s.fecha===fechaStr&&s.hora===hora)?'white':'#022c22',
                                        transition:'all .1s',
                                        opacity:(!slotsSeleccionados.some(s=>s.fecha===fechaStr&&s.hora===hora)&&slotsSeleccionados.length>=3)?0.4:1
                                      }}>
                                      {slotsSeleccionados.findIndex(s=>s.fecha===fechaStr&&s.hora===hora)>=0 ? `${slotsSeleccionados.findIndex(s=>s.fecha===fechaStr&&s.hora===hora)+1}·` : ''}{hora.replace(':00','')}hs
                                    </button>
                                  );
                                })}
                                {!expandido && resto > 0 && (
                                  <button
                                    onClick={()=>setExpandidos(prev=>({...prev,[fechaStr]:true}))}
                                    style={{fontSize:8,padding:'2px 3px',borderRadius:2,border:'1px solid #10b981',background:'transparent',color:'#10b981',cursor:'pointer',textAlign:'center',marginTop:1}}>
                                    +{resto} más
                                  </button>
                                )}
                                {expandido && libres.length > 4 && (
                                  <button
                                    onClick={()=>setExpandidos(prev=>({...prev,[fechaStr]:false}))}
                                    style={{fontSize:8,padding:'2px 3px',borderRadius:2,border:'1px solid #374151',background:'transparent',color:'#8696a0',cursor:'pointer',textAlign:'center',marginTop:1}}>
                                    ver menos
                                  </button>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </>
        )}
      </div>

      {/* Footer con slots seleccionados */}
      {slotsSeleccionados.length > 0 && (
        <div style={{background:'#111b21',borderTop:'2px solid #f97316',padding:'12px 20px',flexShrink:0}}>
          <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12}}>
            <div style={{flex:1}}>
              <div style={{fontSize:11,color:'#fb923c',fontWeight:700,marginBottom:6}}>
                {slotsSeleccionados.length} horario{slotsSeleccionados.length>1?'s':''} seleccionado{slotsSeleccionados.length>1?'s':''} {slotsSeleccionados.length<3?`— podés elegir hasta ${3-slotsSeleccionados.length} más`:'— máximo alcanzado'}
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:4}}>
                {slotsSeleccionados.map((s,i)=>(
                  <div key={i} style={{display:'flex',alignItems:'center',gap:8,fontSize:12,color:'white'}}>
                    <span style={{background:'#f97316',color:'white',width:18,height:18,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,flexShrink:0}}>{i+1}</span>
                    {new Date(s.fecha+'T12:00:00').toLocaleDateString('es-AR',{weekday:'short',day:'numeric',month:'short'})} · {s.hora.replace(':00','')}hs
                    <button onClick={()=>setSlotsSeleccionados(slotsSeleccionados.filter((_,j)=>j!==i))}
                      style={{background:'transparent',border:'none',color:'#8696a0',cursor:'pointer',fontSize:12,padding:0}}>✕</button>
                  </div>
                ))}
              </div>
            </div>
            <button
              onClick={()=>onSeleccionar(slotsSeleccionados)}
              style={{padding:'9px 22px',borderRadius:4,border:'none',background:'#f97316',color:'white',fontSize:13,fontWeight:700,cursor:'pointer',flexShrink:0,alignSelf:'flex-end'}}>
              Ofrecer {slotsSeleccionados.length>1?'opciones':'horario'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PushSettings({ API, jH, aH, onActivado }) {
  const [suscripto, setSuscripto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [prefs, setPrefs] = useState({ push_cierre: true, push_turno: true });

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    navigator.serviceWorker.getRegistration().then(reg => {
      if (reg) reg.pushManager.getSubscription().then(sub => setSuscripto(!!sub));
    });
  }, []);

  const suscribirse = async () => {
    setCargando(true);
    try {
      const vapidRes = await fetch(`${API}/api/push/vapid-key`, { headers: aH() });
      const { publicKey } = await vapidRes.json();
      if (!publicKey) { alert("Web Push no está configurado en el servidor aún"); setCargando(false); return; }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) });
      await fetch(`${API}/api/push/subscribe`, { method:'POST', headers:jH(), body:JSON.stringify({ subscription: sub }) });
      setSuscripto(true);
      if (onActivado) onActivado();
    } catch(e) { alert("Error: " + e.message); }
    setCargando(false);
  };

  const guardarPrefs = async (nuevasPrefs) => {
    setPrefs(nuevasPrefs);
    await fetch(`${API}/api/push/preferences`, { method:'PUT', headers:jH(), body:JSON.stringify(nuevasPrefs) }).catch(()=>{});
  };

  if (!('serviceWorker' in navigator)) return <div style={{fontSize:12,color:"#64748b"}}>Tu navegador no soporta notificaciones push</div>;

  return (
    <div>
      {suscripto ? (
        <div>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
            <div style={{width:8,height:8,borderRadius:"50%",background:"#10b981"}}/>
            <span style={{fontSize:12,color:"#34d399",fontWeight:600}}>Activas en este dispositivo ✓</span>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {[{key:"push_cierre",label:"🎯 Prospecto listo para cierre"},{key:"push_turno",label:"📅 Nueva solicitud de turno"}].map(item=>(
              <label key={item.key} style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}} onClick={()=>guardarPrefs({...prefs,[item.key]:!prefs[item.key]})}>
                <div style={{width:36,height:20,borderRadius:4,background:prefs[item.key]?"#6366f1":"#374151",position:"relative",transition:"background .2s",flexShrink:0}}>
                  <div style={{position:"absolute",top:2,left:prefs[item.key]?18:2,width:16,height:16,borderRadius:"50%",background:"white",transition:"left .2s"}}/>
                </div>
                <span style={{fontSize:12}}>{item.label}</span>
              </label>
            ))}
          </div>
        </div>
      ) : (
        <button onClick={suscribirse} disabled={cargando}
          style={{padding:"8px 18px",borderRadius:4,border:"none",background:"#6366f1",color:"white",fontSize:13,fontWeight:600,cursor:cargando?"wait":"pointer"}}>
          {cargando?"Activando...":"🔔 Activar en este dispositivo"}
        </button>
      )}
    </div>
  );
}



const ANATOMICAL_IMAGES = {
  cara_completa:  { f: "https://res.cloudinary.com/dhtriaslp/image/upload/v1774280983/full_face_mujer_uxn0bw.png",    m: "https://res.cloudinary.com/dhtriaslp/image/upload/v1774280983/full_face_hombre_zr4ejo.png" },
  frente:         { f: "https://res.cloudinary.com/dhtriaslp/image/upload/v1774280985/frente_mujer_xurpdt.png",       m: "https://res.cloudinary.com/dhtriaslp/image/upload/v1774280984/frente_hombre_i4knq3.png" },
  ojeras:         { f: "https://res.cloudinary.com/dhtriaslp/image/upload/v1774280982/ojeras_mujer_hf6cg1.png",       m: "https://res.cloudinary.com/dhtriaslp/image/upload/v1774280984/ojeras_hombre_ddsoi3.png" },
  papada:         { f: "https://res.cloudinary.com/dhtriaslp/image/upload/v1774280984/papada_mujer_cd9tzo.png",       m: "https://res.cloudinary.com/dhtriaslp/image/upload/v1774282537/papada_hombre_pno3o1.png" },
  labios:         { f: "https://res.cloudinary.com/dhtriaslp/image/upload/v1774280982/labios_mujer_zavikk.png",       m: "https://res.cloudinary.com/dhtriaslp/image/upload/v1774283611/labios_hombre_w3h37a.png" },
  cuello:         { f: "https://res.cloudinary.com/dhtriaslp/image/upload/v1774282626/cuello_mujer_to0zkg.png",       m: "https://res.cloudinary.com/dhtriaslp/image/upload/v1774282626/cuello_mujer_to0zkg.png" },
  abdomen:        { f: "https://res.cloudinary.com/dhtriaslp/image/upload/v1774280983/abdomen_y_flanquitos_mujer_flbjkl.png", m: "https://res.cloudinary.com/dhtriaslp/image/upload/v1774280984/abdomen_hombre_sn6swn.png" },
  espalda:        { f: "https://res.cloudinary.com/dhtriaslp/image/upload/v1774280982/espalda_y_flanquitos_mujer_abxcze.png", m: "https://res.cloudinary.com/dhtriaslp/image/upload/v1774280982/espalda_y_flanquitos_mujer_abxcze.png" },
  brazos:         { f: "https://res.cloudinary.com/dhtriaslp/image/upload/v1774280982/brazos_mujer_fbhwtw.png",       m: "https://res.cloudinary.com/dhtriaslp/image/upload/v1774280982/brazos_mujer_fbhwtw.png" },
  muslos:         { f: "https://res.cloudinary.com/dhtriaslp/image/upload/v1774280985/gluteo_y_muslos_mujer_lxiimi.png", m: "https://res.cloudinary.com/dhtriaslp/image/upload/v1774280985/gluteo_y_muslos_mujer_lxiimi.png" },
  gluteos:        { f: "https://res.cloudinary.com/dhtriaslp/image/upload/v1774280985/gluteo_y_muslos_mujer_lxiimi.png", m: "https://res.cloudinary.com/dhtriaslp/image/upload/v1774280985/gluteo_y_muslos_mujer_lxiimi.png" },
  pecho:          { f: "https://res.cloudinary.com/dhtriaslp/image/upload/v1774280985/escote_mujer_y8cxyb.png",       m: "https://res.cloudinary.com/dhtriaslp/image/upload/v1774280985/escote_mujer_y8cxyb.png" },
  manos:          { f: "https://res.cloudinary.com/dhtriaslp/image/upload/v1774283611/manos_okg7hx.png",              m: "https://res.cloudinary.com/dhtriaslp/image/upload/v1774283611/manos_okg7hx.png" },
  pomulos:        { f: "https://res.cloudinary.com/dhtriaslp/image/upload/v1774280983/full_face_mujer_uxn0bw.png",    m: "https://res.cloudinary.com/dhtriaslp/image/upload/v1774280983/full_face_hombre_zr4ejo.png" },
  cuerpo_completo:{ f: "https://res.cloudinary.com/dhtriaslp/image/upload/v1774280983/abdomen_y_flanquitos_mujer_flbjkl.png", m: "https://res.cloudinary.com/dhtriaslp/image/upload/v1774280984/abdomen_hombre_sn6swn.png" },
};

const ANATOMICAL_IMAGE_OPTIONS = [
  { label: "Cara completa (mujer)",   area: "cara_completa", genero: "f" },
  { label: "Cara completa (hombre)",  area: "cara_completa", genero: "m" },
  { label: "Frente (mujer)",          area: "frente",        genero: "f" },
  { label: "Frente (hombre)",         area: "frente",        genero: "m" },
  { label: "Ojeras (mujer)",          area: "ojeras",        genero: "f" },
  { label: "Ojeras (hombre)",         area: "ojeras",        genero: "m" },
  { label: "Papada (mujer)",          area: "papada",        genero: "f" },
  { label: "Papada (hombre)",         area: "papada",        genero: "m" },
  { label: "Labios (mujer)",          area: "labios",        genero: "f" },
  { label: "Labios (hombre)",         area: "labios",        genero: "m" },
  { label: "Cuello (mujer)",          area: "cuello",        genero: "f" },
  { label: "Abdomen (mujer)",         area: "abdomen",       genero: "f" },
  { label: "Abdomen (hombre)",        area: "abdomen",       genero: "m" },
  { label: "Espalda (mujer)",         area: "espalda",       genero: "f" },
  { label: "Brazos (mujer)",          area: "brazos",        genero: "f" },
  { label: "Muslos / glúteos (mujer)",area: "muslos",        genero: "f" },
  { label: "Glúteos (mujer)",         area: "gluteos",       genero: "f" },
  { label: "Escote / pecho (mujer)",  area: "pecho",         genero: "f" },
  { label: "Manos",                   area: "manos",         genero: "f" },
  { label: "Pómulos (mujer)",         area: "pomulos",       genero: "f" },
];

function getAnatomicalImage(area, genero='f') {
  const imgs = ANATOMICAL_IMAGES[area] || ANATOMICAL_IMAGES.cara_completa;
  return imgs[genero] || imgs.f;
}

function detectarAreaAnatomica(tratamiento) {
  if (!tratamiento) return 'generico';
  const t = tratamiento.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (t.includes('papada') || t.includes('submental')) return 'papada';
  if (t.includes('pomulo') || t.includes('mejilla') || t.includes('malar')) return 'pomulos';
  if (t.includes('ojera') || t.includes('periocular') || t.includes('parpado')) return 'ojeras';
  if (t.includes('frente') || t.includes('frontal') || t.includes('botox') || t.includes('entrecejo')) return 'frente';
  if (t.includes('labio') || t.includes('peribucal')) return 'labios';
  if (t.includes('abdomen') || t.includes('abdomin') || t.includes('barriga') || t.includes('cintura') || t.includes('lipol')) return 'abdomen';
  if (t.includes('brazo') || t.includes('bicep') || t.includes('tricep')) return 'brazos';
  if (t.includes('muslo') || t.includes('pierna') || t.includes('celulitis')) return 'muslos';
  if (t.includes('gluteo') || t.includes('cadera')) return 'gluteos';
  if (t.includes('espalda') || t.includes('lumbar') || t.includes('dorsal')) return 'espalda';
  if (t.includes('pecho') || t.includes('busto') || t.includes('seno') || t.includes('mama')) return 'pecho';
  if (t.includes('cuello') || t.includes('cervical')) return 'cuello';
  if (t.includes('mano') || t.includes('dedo')) return 'manos';
  if (t.includes('cara') || t.includes('facial') || t.includes('rostro') || t.includes('hifu') || t.includes('rejuven')) return 'cara_completa';
  if (t.includes('cuerpo') || t.includes('body') || t.includes('corporal')) return 'cuerpo_completo';
  return 'generico';
}


function ScoreBadge({ score }) {
  if (!score) return null;
  const cfg = score >= 9 ? { color:'#8b5cf6', bg:'rgba(139,92,246,0.15)', label:'Excelente' }
    : score >= 7 ? { color:'#10b981', bg:'rgba(16,185,129,0.15)', label:'Bien' }
    : score >= 4 ? { color:'#f97316', bg:'rgba(249,115,22,0.15)', label:'Regular' }
    : { color:'#ef4444', bg:'rgba(239,68,68,0.15)', label:'Crítico' };
  return (
    <span style={{background:cfg.bg,color:cfg.color,border:`1px solid ${cfg.color}44`,padding:'2px 10px',borderRadius:2,fontSize:11,fontWeight:700}}>
      {score}/10 · {cfg.label}
    </span>
  );
}

function VentasPanel({ client, API, aH, jH, user, rango }) {
  const _t = typeof localStorage !== 'undefined' ? localStorage.getItem('skyward_theme') : 'dark'; const C = _t === 'light' ? LIGHT_C : DARK_C;
  const [vista, setVista] = useState('menu'); // menu | feedback | entrenador | grabar
  const [subVista, setSubVista] = useState('historial'); // historial | detalle
  const [valoraciones, setValoraciones] = useState([]);
  const [sesiones, setSesiones] = useState([]);
  const [stats, setStats] = useState(null);
  const [seleccionada, setSeleccionada] = useState(null);
  const [coachingMsg, setCoachingMsg] = useState('');
  const [coachingHistorial, setCoachingHistorial] = useState([]);
  const [coachingLoading, setCoachingLoading] = useState(false);
  const [cargando, setCargando] = useState(false);

  // Grabación
  const [grabando, setGrabando] = useState(false);
  const [grabSegundos, setGrabSegundos] = useState(0);
  const [grabPausado, setGrabPausado] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);
  const [procesando, setProcesando] = useState(false);
  const [pacienteGrab, setPacienteGrab] = useState('');
  const timerRef = React.useRef(null);
  const chunksRef = React.useRef([]);

  const isPro = client?.plan === 'pro';
  const isPlusOPro = ['plus','pro'].includes(client?.plan);

  // Entrenador
  const [modoEnt, setModoEnt] = useState('chat');
  const [perfilEnt, setPerfilEnt] = useState('indeciso');
  const [contextoEnt, setContextoEnt] = useState('');
  const [entHistorial, setEntHistorial] = useState([]);
  const [entMsg, setEntMsg] = useState('');
  const [entLoading, setEntLoading] = useState(false);
  const [entActivo, setEntActivo] = useState(false);
  const [entFeedback, setEntFeedback] = useState(null);
  const [screenshot, setScreenshot] = useState(null);
  const entRef = React.useRef(null);

  const esAdminODueno = ['admin','dueno'].includes(rango);
  const usuarioFiltro = esAdminODueno ? '' : (user?.id || '');

  const fetchData = async () => {
    setCargando(true);
    try {
      const params = new URLSearchParams({ cliente_id: client.id });
      if (usuarioFiltro) params.set('usuario_id', usuarioFiltro);
      const [rv, rs, rstat] = await Promise.all([
        fetch(`${API}/api/valoraciones?${params}`, {headers:aH()}).then(r=>r.json()),
        fetch(`${API}/api/entrenamiento/sesiones?${params}`, {headers:aH()}).then(r=>r.json()),
        fetch(`${API}/api/ventas/stats?${params}`, {headers:aH()}).then(r=>r.json()),
      ]);
      setValoraciones(Array.isArray(rv)?rv:[]);
      setSesiones(Array.isArray(rs)?rs:[]);
      setStats(rstat);
    } catch(e) {}
    setCargando(false);
  };

  useEffect(() => { if (vista === 'feedback' || vista === 'menu') fetchData(); }, [vista]);

  // Iniciar grabación
  const iniciarGrabacion = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg' });
      chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.start(1000);
      setMediaRecorder(mr);
      setGrabando(true);
      setGrabPausado(false);
      setGrabSegundos(0);
      timerRef.current = setInterval(() => setGrabSegundos(s => s + 1), 1000);
    } catch(e) { alert('No se pudo acceder al micrófono: ' + e.message); }
  };

  const pausarGrabacion = () => {
    if (!mediaRecorder) return;
    if (grabPausado) { mediaRecorder.resume(); clearInterval(timerRef.current); timerRef.current = setInterval(() => setGrabSegundos(s => s + 1), 1000); }
    else { mediaRecorder.pause(); clearInterval(timerRef.current); }
    setGrabPausado(!grabPausado);
  };

  const finalizarGrabacion = () => {
    return new Promise(resolve => {
      if (!mediaRecorder) return resolve(null);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
        mediaRecorder.stream.getTracks().forEach(t => t.stop());
        clearInterval(timerRef.current);
        resolve(blob);
      };
      mediaRecorder.stop();
      setGrabando(false);
      setGrabPausado(false);
    });
  };

  const procesarAudio = async (blob, tipo) => {
    setProcesando(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise(res => { reader.onload = e => res(e.target.result.split(',')[1]); reader.readAsDataURL(blob); });
      const r = await fetch(`${API}/api/valoraciones/transcribir`, {
        method: 'POST', headers: jH(),
        body: JSON.stringify({ audio_base64: base64, audio_tipo: tipo || blob.type, cliente_id: client.id, paciente_id: pacienteGrab || null, usuario_id: user?.id })
      });
      const d = await r.json();
      if (d.ok) { setSeleccionada(d); setSubVista('detalle'); setVista('feedback'); fetchData(); }
      else alert('Error procesando audio: ' + (d.error || 'desconocido'));
    } catch(e) { alert('Error: ' + e.message); }
    setProcesando(false);
  };

  const grabacionFinalizar = async () => {
    const blob = await finalizarGrabacion();
    if (blob) await procesarAudio(blob, blob.type);
  };

  const subirArchivo = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    await procesarAudio(file, file.type);
  };

  // Generar propuesta desde valoración (solo Pro)
  const generarPropuestaDesdeValoracion = async () => {
    if (!seleccionada?.transcripcion) return;
    // Navegar a propuestas con la transcripción pre-cargada
    // Guardamos en sessionStorage para que PropuestasPanel lo lea
    sessionStorage.setItem('propuesta_desde_valoracion', JSON.stringify({
      info_cruda: seleccionada.transcripcion,
      paciente_id: seleccionada.paciente_id,
      valoracion_id: seleccionada.id
    }));
    // Disparar evento para cambiar tab
    window.dispatchEvent(new CustomEvent('edge_goto_propuestas'));
  };

  const abrirDetalle = async (val) => {
    setSeleccionada(val);
    setCoachingHistorial([]);

    setCoachingMsg('');
    setSubVista('detalle');
  };

  const enviarCoaching = async () => {
    if (!coachingMsg.trim() || !seleccionada) return;
    setCoachingLoading(true);
    const r = await fetch(`${API}/api/valoraciones/${seleccionada.id}/coaching`, {
      method:'POST', headers:jH(),
      body: JSON.stringify({ mensaje: coachingMsg, historial: coachingHistorial, cliente_id: client.id })
    });
    const d = await r.json();
    if (d.ok) { setCoachingHistorial(d.historial); setCoachingMsg(''); }
    setCoachingLoading(false);
  };

  const iniciarEntrenador = () => {
    setEntHistorial([]);
    setEntFeedback(null);
    setEntActivo(true);
    setScreenshot(null);
  };

  const enviarEntrenador = async () => {
    if (!entMsg.trim() && !screenshot) return;
    setEntLoading(true);
    const body = { cliente_id: client.id, usuario_id: user?.id, modo: modoEnt, perfil: perfilEnt, mensaje: entMsg, historial: entHistorial, contexto: contextoEnt||'' };
    if (screenshot) body.screenshot_base64 = screenshot;
    const r = await fetch(`${API}/api/entrenamiento/sesion`, { method:'POST', headers:jH(), body: JSON.stringify(body) });
    const d = await r.json();
    if (d.ok) {
      setEntHistorial(d.historial);
      setEntMsg('');
      setScreenshot(null);
      setTimeout(() => entRef.current?.scrollTo(0, entRef.current.scrollHeight), 100);
    }
    setEntLoading(false);
  };

  const finalizarEntrenador = async () => {
    setEntLoading(true);
    const r = await fetch(`${API}/api/entrenamiento/finalizar`, {
      method:'POST', headers:jH(),
      body: JSON.stringify({ cliente_id: client.id, usuario_id: user?.id, modo: modoEnt, perfil: perfilEnt, historial: entHistorial, duracion_segundos: 0 })
    });
    const d = await r.json();
    if (d.ok) { setEntFeedback(d.feedback); setEntActivo(false); fetchData(); }
    setEntLoading(false);
  };

  const subirScreenshot = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setScreenshot(ev.target.result.split(',')[1]);
    reader.readAsDataURL(file);
  };

  // MENU PRINCIPAL
  if (vista === 'menu') return (
    <div>
      <div style={{fontSize:16,fontWeight:700,marginBottom:4}}>🎯 Ventas</div>
      <div style={{fontSize:12,color:C.muted,marginBottom:20}}>Feedback de valoraciones y entrenamiento comercial</div>

      {/* Stats */}
      {stats && (
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:24}}>
          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:16}}>
            <div style={{fontSize:11,color:C.muted,marginBottom:6,textTransform:"uppercase",letterSpacing:1}}>Valoraciones</div>
            <div style={{fontSize:28,fontWeight:700,color:C.text}}>{stats.valoraciones?.total||0}</div>
            {stats.valoraciones?.score_promedio > 0 && <div style={{fontSize:12,color:C.muted,marginTop:4}}>Score promedio: <span style={{color:C.accentLight,fontWeight:600}}>{stats.valoraciones.score_promedio}/10</span></div>}
          </div>
          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:16}}>
            <div style={{fontSize:11,color:C.muted,marginBottom:6,textTransform:"uppercase",letterSpacing:1}}>Entrenamientos</div>
            <div style={{fontSize:28,fontWeight:700,color:C.text}}>{stats.entrenamientos?.total||0}</div>
            {stats.entrenamientos?.score_promedio > 0 && <div style={{fontSize:12,color:C.muted,marginTop:4}}>Score promedio: <span style={{color:C.accentLight,fontWeight:600}}>{stats.entrenamientos.score_promedio}/10</span></div>}
          </div>
        </div>
      )}

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
        {isPro && (
        <div onClick={()=>setVista('feedback')} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:24,cursor:"pointer",transition:"border-color .15s"}}
          onMouseEnter={e=>e.currentTarget.style.borderColor=C.accent} onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
          <div style={{fontSize:32,marginBottom:12}}>📋</div>
          <div style={{fontSize:14,fontWeight:600,color:C.text,marginBottom:6}}>Feedback de valoraciones</div>
          <div style={{fontSize:12,color:C.muted}}>Historial de valoraciones grabadas, transcripciones y coaching con IA</div>
        </div>
        )}
        <div onClick={()=>setVista('entrenador')} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:24,cursor:"pointer",transition:"border-color .15s"}}
          onMouseEnter={e=>e.currentTarget.style.borderColor=C.accent} onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
          <div style={{fontSize:32,marginBottom:12}}>🤖</div>
          <div style={{fontSize:14,fontWeight:600,color:C.text,marginBottom:6}}>Entrenador IA</div>
          <div style={{fontSize:12,color:C.muted}}>Practicá chat de WhatsApp y valoraciones con pacientes simulados</div>
        </div>
      </div>

      {/* Grabar valoración — solo Pro */}
      {isPro && (
        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:24}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
            <div style={{fontSize:28}}>🎙️</div>
            <div>
              <div style={{fontSize:14,fontWeight:600,color:C.text}}>Grabar valoración</div>
              <div style={{fontSize:12,color:C.muted}}>Grabá la sesión o subí un archivo de audio/video</div>
            </div>
          </div>
          <div style={{display:"flex",gap:8,marginTop:12}}>
            <button onClick={()=>setVista('grabar')} style={{flex:1,padding:"10px",borderRadius:4,border:"none",background:"#ef4444",color:"white",fontSize:13,fontWeight:600,cursor:"pointer"}}>
              ⏺ Grabar ahora
            </button>
            <label style={{flex:1,padding:"10px",borderRadius:4,border:`1px solid ${C.border}`,background:"transparent",color:C.muted,fontSize:13,fontWeight:600,cursor:"pointer",textAlign:"center"}}>
              📁 Subir archivo
              <input type="file" accept="audio/*,video/*" style={{display:"none"}} onChange={subirArchivo} disabled={procesando}/>
            </label>
          </div>
          {procesando && <div style={{marginTop:10,fontSize:12,color:C.accentLight,textAlign:"center"}}>⏳ Procesando audio con IA... puede tardar unos segundos</div>}
        </div>
      )}
    </div>
  );

  // VISTA GRABACIÓN EN VIVO
  if (vista === 'grabar') return (
    <div>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
        <button onClick={()=>{setVista('menu');if(grabando)finalizarGrabacion();}} style={{padding:"6px 12px",borderRadius:4,border:`1px solid ${C.border}`,background:"transparent",color:C.muted,fontSize:12,cursor:"pointer"}}>← Volver</button>
        <div style={{fontSize:15,fontWeight:700}}>🎙️ Grabar valoración</div>
      </div>

      {/* Aviso videollamada */}
      <div style={{background:"rgba(6,182,212,0.08)",border:"1px solid rgba(6,182,212,0.2)",borderRadius:4,padding:"12px 16px",marginBottom:20,fontSize:12,color:"#67e8f9"}}>
        💡 <strong>¿Por videollamada?</strong> Grabá la pantalla desde Google Meet o Zoom (activan la grabación con audio de ambas partes) y subí el archivo con el botón "Subir archivo" en el menú.
      </div>

      {/* Paciente opcional */}
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:16,marginBottom:16}}>
        <label style={{fontSize:11,color:C.muted,display:"block",marginBottom:6}}>Cliente (opcional)</label>
        <input value={pacienteGrab} onChange={e=>setPacienteGrab(e.target.value)}
          placeholder="Nombre del cliente..."
          style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"8px 12px",color:C.text,fontSize:13,fontFamily:"inherit",boxSizing:"border-box"}}/>
      </div>

      {/* Grabador */}
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:32,textAlign:"center"}}>
        {!grabando && !procesando && (
          <>
            <div style={{fontSize:64,marginBottom:16}}>🎙️</div>
            <div style={{fontSize:13,color:C.muted,marginBottom:20}}>Presioná grabar para comenzar la sesión</div>
            <button onClick={iniciarGrabacion} style={{padding:"14px 40px",borderRadius:4,border:"none",background:"#ef4444",color:"white",fontSize:15,fontWeight:700,cursor:"pointer"}}>
              ⏺ Comenzar grabación
            </button>
          </>
        )}

        {grabando && (
          <>
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,marginBottom:8}}>
              {!grabPausado && <div style={{width:12,height:12,borderRadius:"50%",background:"#ef4444",animation:"pulse 1s infinite"}}/>}
              <div style={{fontSize:32,fontWeight:700,color:grabPausado?C.muted:"#ef4444",fontFamily:"monospace"}}>
                {String(Math.floor(grabSegundos/60)).padStart(2,'0')}:{String(grabSegundos%60).padStart(2,'0')}
              </div>
            </div>
            <div style={{fontSize:12,color:C.muted,marginBottom:24}}>{grabPausado?'Pausado':'Grabando...'}</div>
            <div style={{display:"flex",gap:12,justifyContent:"center"}}>
              <button onClick={pausarGrabacion} style={{padding:"10px 24px",borderRadius:4,border:`1px solid ${C.border}`,background:"transparent",color:C.muted,fontSize:13,cursor:"pointer"}}>
                {grabPausado?'▶ Reanudar':'⏸ Pausar'}
              </button>
              <button onClick={grabacionFinalizar} style={{padding:"10px 24px",borderRadius:4,border:"none",background:"#10b981",color:"white",fontSize:13,fontWeight:600,cursor:"pointer"}}>
                ⏹ Finalizar y analizar
              </button>
            </div>
          </>
        )}

        {procesando && (
          <>
            <div style={{fontSize:48,marginBottom:16}}>⏳</div>
            <div style={{fontSize:14,fontWeight:600,color:C.accentLight,marginBottom:8}}>Transcribiendo con IA...</div>
            <div style={{fontSize:12,color:C.muted}}>Esto puede tardar entre 10 y 60 segundos según la duración del audio</div>
          </>
        )}
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
    </div>
  );

  // FEEDBACK DE VALORACIONES
  if (vista === 'feedback') return (
    <div>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
        <button onClick={()=>{setVista('menu');setSubVista('historial');setSeleccionada(null);}} style={{padding:"6px 12px",borderRadius:4,border:`1px solid ${C.border}`,background:"transparent",color:C.muted,fontSize:12,cursor:"pointer"}}>← Volver</button>
        <div style={{fontSize:15,fontWeight:700}}>📋 Feedback de valoraciones</div>
      </div>

      {subVista === 'historial' && (
        <div>
          {cargando ? <div style={{textAlign:"center",padding:40,color:C.muted}}>Cargando...</div> :
          valoraciones.length === 0 ? (
            <div style={{textAlign:"center",padding:40,color:C.muted}}>
              <div style={{fontSize:32,marginBottom:12}}>🎙️</div>
              <div style={{fontSize:13}}>No hay valoraciones grabadas aún</div>
              <div style={{fontSize:11,marginTop:8}}>Las valoraciones se grabarán desde la ficha del cliente</div>
            </div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {valoraciones.map((v,i) => (
                <div key={i} onClick={()=>abrirDetalle(v)} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:"14px 16px",cursor:"pointer",display:"flex",alignItems:"center",gap:12}}
                  onMouseEnter={e=>e.currentTarget.style.borderColor=C.accent} onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                      <span style={{fontSize:13,fontWeight:600,color:C.text}}>{v.paciente_nombre||'Sin paciente'}</span>
                      <ScoreBadge score={v.score}/>
                    </div>
                    <div style={{fontSize:11,color:C.muted}}>
                      {esAdminODueno && v.usuario_nombre && <span>{v.usuario_nombre} · </span>}
                      {new Date(v.creado_en).toLocaleDateString('es-AR',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}
                    </div>
                    {v.feedback_ia?.resumen && <div style={{fontSize:11,color:C.muted,marginTop:4}}>{v.feedback_ia.resumen}</div>}
                  </div>
                  <span style={{color:C.muted,fontSize:14}}>→</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {subVista === 'detalle' && seleccionada && (
        <div>
          <button onClick={()=>setSubVista('historial')} style={{padding:"6px 12px",borderRadius:4,border:`1px solid ${C.border}`,background:"transparent",color:C.muted,fontSize:12,cursor:"pointer",marginBottom:16}}>← Historial</button>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
            <div style={{fontSize:15,fontWeight:700}}>{seleccionada.paciente_nombre||'Sin paciente'}</div>
            <ScoreBadge score={seleccionada.score}/>
          </div>

          {/* Feedback */}
          {seleccionada.feedback_ia && (
            <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:20,marginBottom:16}}>
              <div style={{fontSize:12,fontWeight:600,color:C.muted,marginBottom:12,textTransform:"uppercase",letterSpacing:1}}>📊 Análisis IA</div>
              {seleccionada.feedback_ia.resumen && <p style={{fontSize:13,color:C.text,marginBottom:12,lineHeight:1.6}}>{seleccionada.feedback_ia.resumen}</p>}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                {seleccionada.feedback_ia.fortalezas?.length > 0 && (
                  <div style={{background:"rgba(16,185,129,0.08)",border:"1px solid rgba(16,185,129,0.2)",borderRadius:4,padding:12}}>
                    <div style={{fontSize:11,fontWeight:600,color:"#10b981",marginBottom:8}}>✅ Fortalezas</div>
                    {seleccionada.feedback_ia.fortalezas.map((f,i)=><div key={i} style={{fontSize:12,color:C.text,marginBottom:4}}>· {f}</div>)}
                  </div>
                )}
                {seleccionada.feedback_ia.oportunidades?.length > 0 && (
                  <div style={{background:"rgba(249,115,22,0.08)",border:"1px solid rgba(249,115,22,0.2)",borderRadius:4,padding:12}}>
                    <div style={{fontSize:11,fontWeight:600,color:"#f97316",marginBottom:8}}>🔧 A mejorar</div>
                    {seleccionada.feedback_ia.oportunidades.map((f,i)=><div key={i} style={{fontSize:12,color:C.text,marginBottom:4}}>· {f}</div>)}
                  </div>
                )}
              </div>
              {seleccionada.feedback_ia.conclusion && (
                <div style={{background:C.accentGlow,border:`1px solid ${C.accent}44`,borderRadius:4,padding:12,fontSize:12,color:C.accentLight,fontStyle:"italic"}}>
                  💡 {seleccionada.feedback_ia.conclusion}
                </div>
              )}
            </div>
          )}

          {/* Transcripción */}
          {seleccionada.transcripcion && (
            <details style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:16,marginBottom:16}}>
              <summary style={{cursor:"pointer",fontSize:12,fontWeight:600,color:C.muted,textTransform:"uppercase",letterSpacing:1}}>📝 Transcripción completa</summary>
              <p style={{fontSize:12,color:C.text,lineHeight:1.7,marginTop:12,whiteSpace:"pre-wrap"}}>{seleccionada.transcripcion}</p>
            </details>
          )}

          {/* Botón generar propuesta — solo Pro */}
          {isPro && seleccionada?.transcripcion && (
            <div style={{background:"rgba(99,102,241,0.08)",border:`1px solid ${C.accent}44`,borderRadius:2,padding:16,marginBottom:16,display:"flex",alignItems:"center",gap:14}}>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600,color:C.accentLight,marginBottom:3}}>📄 Generar propuesta desde esta valoración</div>
                <div style={{fontSize:11,color:C.muted}}>La IA va a usar la transcripción para armar la propuesta automáticamente</div>
              </div>
              <button onClick={generarPropuestaDesdeValoracion} style={{padding:"9px 18px",borderRadius:4,border:"none",background:C.accent,color:"white",fontSize:12,fontWeight:600,cursor:"pointer",flexShrink:0}}>
                ✨ Generar propuesta
              </button>
            </div>
          )}

          {/* Chat de coaching */}
          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:20}}>
            <div style={{fontSize:12,fontWeight:600,color:C.muted,marginBottom:12,textTransform:"uppercase",letterSpacing:1}}>💬 Coaching con IA</div>
            <div style={{maxHeight:300,overflowY:"auto",marginBottom:12,display:"flex",flexDirection:"column",gap:8}}>
              {coachingHistorial.length === 0 && <div style={{fontSize:12,color:C.muted,textAlign:"center",padding:16}}>Preguntale a la IA cómo mejorar esta valoración</div>}
              {coachingHistorial.filter(m=>m.role!=='system').map((m,i)=>(
                <div key={i} style={{display:"flex",justifyContent:m.role==='user'?'flex-end':'flex-start'}}>
                  <div style={{maxWidth:"80%",background:m.role==='user'?C.accent:C.bg,borderRadius:4,padding:"8px 12px",fontSize:12,color:"white",lineHeight:1.5}}>
                    {m.content}
                  </div>
                </div>
              ))}
              {coachingLoading && <div style={{fontSize:12,color:C.muted,textAlign:"center"}}>Pensando...</div>}
            </div>
            <div style={{display:"flex",gap:8}}>
              <input value={coachingMsg} onChange={e=>setCoachingMsg(e.target.value)} onKeyDown={e=>e.key==='Enter'&&enviarCoaching()}
                placeholder='Ej: "¿Cómo podría haber manejado mejor la objeción del precio?"'
                style={{flex:1,background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"8px 12px",color:C.text,fontSize:12,fontFamily:"inherit"}}/>
              <button onClick={enviarCoaching} disabled={coachingLoading||!coachingMsg.trim()} style={{padding:"8px 16px",borderRadius:4,border:"none",background:C.accent,color:"white",fontSize:12,cursor:"pointer"}}>
                Enviar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ENTRENADOR IA
  if (vista === 'entrenador') return (
    <div>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
        <button onClick={()=>{setVista('menu');setEntActivo(false);setEntFeedback(null);setEntHistorial([]);}} style={{padding:"6px 12px",borderRadius:4,border:`1px solid ${C.border}`,background:"transparent",color:C.muted,fontSize:12,cursor:"pointer"}}>← Volver</button>
        <div style={{fontSize:15,fontWeight:700}}>🤖 Entrenador IA</div>
      </div>

      {!entActivo && !entFeedback && (
        <div>
          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:20,marginBottom:16}}>
            <div style={{fontSize:12,fontWeight:600,color:C.muted,marginBottom:12,textTransform:"uppercase",letterSpacing:1}}>Configurar sesión</div>
            <div style={{marginBottom:14}}>
              <label style={{fontSize:11,color:C.muted,display:"block",marginBottom:6}}>Modo</label>
              <div style={{display:"flex",gap:8}}>
                {[{v:'chat',l:'💬 Chat'},{v:'valoracion',l:'🏥 Valoración presencial'}].map(m=>(
                  <button key={m.v} onClick={()=>setModoEnt(m.v)} style={{flex:1,padding:"10px",borderRadius:4,border:`1px solid ${modoEnt===m.v?C.accent:C.border}`,background:modoEnt===m.v?"rgba(99,102,241,0.15)":C.bg,color:modoEnt===m.v?C.accentLight:C.muted,fontSize:12,fontWeight:600,cursor:"pointer"}}>
                    {m.l}
                  </button>
                ))}
              </div>
            </div>
            <div style={{marginBottom:16}}>
              <label style={{fontSize:11,color:C.muted,display:"block",marginBottom:6}}>Perfil del cliente</label>
              <select value={perfilEnt} onChange={e=>setPerfilEnt(e.target.value)} style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"9px 12px",color:C.text,fontSize:13,fontFamily:"inherit"}}>
                <option value="indeciso">😕 Indeciso — "lo tengo que pensar"</option>
                <option value="precio">💸 Sensible al precio — compara y pregunta costos</option>
                <option value="ansioso">😰 Ansioso — muchas preguntas y miedos</option>
                <option value="desconfiado">🤨 Desconfiado — escéptico, pide pruebas</option>
                <option value="interesado">🙌 Interesado — necesita el empujón final</option>
                <option value="ocupado">⏰ Ocupado — "no tengo tiempo ahora"</option>
                <option value="personalizado">✏️ Personalizado — usar solo mi contexto</option>
              </select>
            </div>
            <div style={{marginBottom:16}}>
              <label style={{fontSize:11,color:C.muted,display:"block",marginBottom:6}}>{perfilEnt === "personalizado" ? "Contexto del cliente *" : "Contexto adicional (opcional)"}</label>
              <textarea value={contextoEnt} onChange={e=>setContextoEnt(e.target.value)}
                placeholder={perfilEnt === 'personalizado' ? 'Describí al prospecto y la situación. La IA va a actuar exactamente según este contexto, sin mezclar perfiles predefinidos.' : 'Ej: "El prospecto ya habló con otra agencia y le salió más barato", "Viene recomendado por un colega"...'}
                rows={3}
                style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"9px 12px",color:C.text,fontSize:12,fontFamily:"inherit",resize:"vertical",boxSizing:"border-box"}}/>
              <div style={{fontSize:10,color:C.muted,marginTop:4}}>También podés pegar el texto de un chat real para que la IA lo tenga en cuenta</div>
            </div>
            <button onClick={iniciarEntrenador} style={{width:"100%",padding:"11px",borderRadius:4,border:"none",background:C.accent,color:"white",fontSize:13,fontWeight:600,cursor:"pointer"}}>
              🚀 Iniciar sesión
            </button>
          </div>

          {/* Analizar chat — screenshot o texto */}
          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:20,marginBottom:16}}>
            <div style={{fontSize:12,fontWeight:600,color:C.muted,marginBottom:8,textTransform:"uppercase",letterSpacing:1}}>📸 Analizar chat real</div>
            <div style={{fontSize:12,color:C.muted,marginBottom:12}}>Subí un screenshot o pegá el texto de un chat para recibir feedback directo</div>
            <label htmlFor="screenshot-upload" style={{display:"block",padding:"10px",borderRadius:4,border:`2px dashed ${C.border}`,textAlign:"center",cursor:"pointer",fontSize:12,color:C.muted}}>
              📁 Subir screenshot
            </label>
            <input type="file" id="screenshot-upload" accept="image/*" style={{display:"none"}} onChange={e=>{subirScreenshot(e);iniciarEntrenador();}}/>
          </div>

          {/* Historial de sesiones */}
          {sesiones.length > 0 && (
            <div>
              <div style={{fontSize:12,fontWeight:600,color:C.muted,marginBottom:10,textTransform:"uppercase",letterSpacing:1}}>Sesiones anteriores</div>
              {sesiones.slice(0,5).map((s,i)=>(
                <div key={i} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:"12px 14px",marginBottom:8,display:"flex",alignItems:"center",gap:10}}>
                  <span style={{fontSize:16}}>{s.modo==='chat'?'💬':'🏥'}</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12,fontWeight:500,color:C.text,marginBottom:2}}>
                      {s.modo==='chat'?'Chat':'Valoración'} · {s.perfil_paciente}
                      {esAdminODueno && s.usuario_nombre && <span style={{color:C.muted}}> · {s.usuario_nombre}</span>}
                    </div>
                    <div style={{fontSize:10,color:C.muted}}>{new Date(s.creado_en).toLocaleDateString('es-AR',{day:'numeric',month:'short'})}</div>
                  </div>
                  <ScoreBadge score={s.score}/>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {entActivo && (
        <div>
          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,overflow:"hidden",marginBottom:12}}>
            <div style={{padding:"10px 14px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:12,color:C.muted}}>{modoEnt==='chat'?'💬 Simulando chat WhatsApp':'🏥 Simulando valoración presencial'} · Perfil: {perfilEnt}</span>
              <button onClick={finalizarEntrenador} disabled={entLoading||entHistorial.length===0} style={{padding:"5px 12px",borderRadius:4,border:"none",background:"#10b981",color:"white",fontSize:11,fontWeight:600,cursor:"pointer"}}>
                {entLoading?'Finalizando...':'✅ Finalizar y ver feedback'}
              </button>
            </div>
            <div ref={entRef} style={{height:350,overflowY:"auto",padding:16,display:"flex",flexDirection:"column",gap:8}}>
              {entHistorial.length === 0 && (
                <div style={{textAlign:"center",padding:20,color:C.muted,fontSize:12}}>
                  {modoEnt==='chat'?'Escribí el primer mensaje como si fuera tu secretaria/comercial contactando al cliente por WhatsApp':'Comenzá la valoración presentándote'}
                </div>
              )}
              {entHistorial.filter(m=>m.role!=='system').map((m,i)=>(
                <div key={i} style={{display:"flex",justifyContent:m.role==='user'?'flex-end':'flex-start',gap:8,alignItems:"flex-end"}}>
                  <div style={{maxWidth:"75%",background:m.role==='user'?C.accent:"#1e2a38",borderRadius:m.role==='user'?"12px 12px 2px 12px":"12px 12px 12px 2px",padding:"8px 12px",fontSize:13,color:"white",lineHeight:1.5}}>
                    {typeof m.content === 'string' ? m.content : '[imagen adjunta]'}
                  </div>
                </div>
              ))}
              {entLoading && <div style={{fontSize:12,color:C.muted,textAlign:"center"}}>El cliente está escribiendo...</div>}
            </div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            {screenshot && <span style={{fontSize:11,color:"#10b981",flexShrink:0}}>📸 Con imagen</span>}
            <input value={entMsg} onChange={e=>setEntMsg(e.target.value)} onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&enviarEntrenador()}
              placeholder={modoEnt==='chat'?'Escribí como si fuera el comercial...':'Tu respuesta en la valoración...'}
              style={{flex:1,background:C.surface,border:`1px solid ${C.border}`,borderRadius:4,padding:"10px 14px",color:C.text,fontSize:13,fontFamily:"inherit"}}/>
            <button onClick={enviarEntrenador} disabled={entLoading||(!entMsg.trim()&&!screenshot)} style={{padding:"10px 16px",borderRadius:4,border:"none",background:C.accent,color:"white",fontSize:13,cursor:"pointer",flexShrink:0}}>
              {entLoading?'...':'Enviar'}
            </button>
          </div>
        </div>
      )}

      {entFeedback && (
        <div>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
            <div style={{fontSize:15,fontWeight:700}}>Resultado de la sesión</div>
            <ScoreBadge score={entFeedback.score}/>
          </div>
          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:20,marginBottom:16}}>
            {entFeedback.resumen && <p style={{fontSize:13,color:C.text,lineHeight:1.6,marginBottom:12}}>{entFeedback.resumen}</p>}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
              {entFeedback.fortalezas?.length > 0 && (
                <div style={{background:"rgba(16,185,129,0.08)",border:"1px solid rgba(16,185,129,0.2)",borderRadius:4,padding:12}}>
                  <div style={{fontSize:11,fontWeight:600,color:"#10b981",marginBottom:8}}>✅ Lo que hiciste bien</div>
                  {entFeedback.fortalezas.map((f,i)=><div key={i} style={{fontSize:12,color:C.text,marginBottom:4}}>· {f}</div>)}
                </div>
              )}
              {entFeedback.oportunidades?.length > 0 && (
                <div style={{background:"rgba(249,115,22,0.08)",border:"1px solid rgba(249,115,22,0.2)",borderRadius:4,padding:12}}>
                  <div style={{fontSize:11,fontWeight:600,color:"#f97316",marginBottom:8}}>🔧 A mejorar</div>
                  {entFeedback.oportunidades.map((f,i)=><div key={i} style={{fontSize:12,color:C.text,marginBottom:4}}>· {f}</div>)}
                </div>
              )}
            </div>
            {entFeedback.frases_sugeridas?.length > 0 && (
              <div style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:2,padding:12,marginBottom:12}}>
                <div style={{fontSize:11,fontWeight:600,color:C.accentLight,marginBottom:8}}>💬 Frases que funcionan mejor</div>
                {entFeedback.frases_sugeridas.map((f,i)=><div key={i} style={{fontSize:12,color:C.text,marginBottom:6,padding:"6px 10px",background:C.surface,borderRadius:2}}>"{f}"</div>)}
              </div>
            )}
            {entFeedback.conclusion && (
              <div style={{background:C.accentGlow,border:`1px solid ${C.accent}44`,borderRadius:4,padding:12,fontSize:12,color:C.accentLight,fontStyle:"italic"}}>
                💡 {entFeedback.conclusion}
              </div>
            )}
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>{setEntFeedback(null);setEntHistorial([]);}} style={{flex:1,padding:"10px",borderRadius:4,border:`1px solid ${C.border}`,background:"transparent",color:C.muted,fontSize:13,cursor:"pointer"}}>
              🔄 Nueva sesión
            </button>
            <button onClick={()=>{setEntFeedback(null);setEntHistorial([]);setVista('menu');}} style={{flex:1,padding:"10px",borderRadius:4,border:"none",background:C.accent,color:"white",fontSize:13,fontWeight:600,cursor:"pointer"}}>
              ✓ Listo
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return null;
}


function ValoracionesPaciente({ paciente, client, API, aH, jH, user }) {
  const _t = typeof localStorage !== 'undefined' ? localStorage.getItem('skyward_theme') : 'dark'; const C = _t === 'light' ? LIGHT_C : DARK_C;
  const [valoraciones, setValoraciones] = useState([]);
  const [grabando, setGrabando] = useState(false);
  const [grabSegundos, setGrabSegundos] = useState(0);
  const [grabPausado, setGrabPausado] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [expandido, setExpandido] = useState(false);
  const timerRef = React.useRef(null);
  const chunksRef = React.useRef([]);

  const fetchValoraciones = async () => {
    try {
      const r = await fetch(`${API}/api/valoraciones?cliente_id=${client.id}&paciente_id=${paciente.id}`, {headers:aH()});
      if (r.ok) setValoraciones(await r.json());
    } catch(e) {}
  };

  useEffect(() => { fetchValoraciones(); }, [paciente.id]);

  const iniciarGrabacion = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg' });
      chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.start(1000);
      setMediaRecorder(mr);
      setGrabando(true);
      setGrabPausado(false);
      setGrabSegundos(0);
      timerRef.current = setInterval(() => setGrabSegundos(s => s + 1), 1000);
    } catch(e) { alert('No se pudo acceder al micrófono: ' + e.message); }
  };

  const pausarGrabacion = () => {
    if (!mediaRecorder) return;
    if (grabPausado) { mediaRecorder.resume(); timerRef.current = setInterval(() => setGrabSegundos(s => s + 1), 1000); }
    else { mediaRecorder.pause(); clearInterval(timerRef.current); }
    setGrabPausado(!grabPausado);
  };

  const finalizarYProcesar = async () => {
    if (!mediaRecorder) return;
    clearInterval(timerRef.current);
    const blob = await new Promise(resolve => {
      mediaRecorder.onstop = () => {
        resolve(new Blob(chunksRef.current, { type: mediaRecorder.mimeType }));
        mediaRecorder.stream.getTracks().forEach(t => t.stop());
      };
      mediaRecorder.stop();
    });
    setGrabando(false);
    setProcesando(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise(res => { reader.onload = e => res(e.target.result.split(',')[1]); reader.readAsDataURL(blob); });
      const r = await fetch(`${API}/api/valoraciones/transcribir`, {
        method: 'POST', headers: jH(),
        body: JSON.stringify({ audio_base64: base64, audio_tipo: blob.type, cliente_id: client.id, paciente_id: paciente.id, usuario_id: user?.id })
      });
      const d = await r.json();
      if (d.ok) { fetchValoraciones(); setExpandido(true); }
      else alert('Error: ' + (d.error || 'desconocido'));
    } catch(e) { alert('Error: ' + e.message); }
    setProcesando(false);
  };

  const subirArchivo = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setProcesando(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise(res => { reader.onload = ev => res(ev.target.result.split(',')[1]); reader.readAsDataURL(file); });
      const r = await fetch(`${API}/api/valoraciones/transcribir`, {
        method: 'POST', headers: jH(),
        body: JSON.stringify({ audio_base64: base64, audio_tipo: file.type, cliente_id: client.id, paciente_id: paciente.id, usuario_id: user?.id })
      });
      const d = await r.json();
      if (d.ok) { fetchValoraciones(); setExpandido(true); }
      else alert('Error: ' + (d.error || 'desconocido'));
    } catch(e) { alert('Error: ' + e.message); }
    setProcesando(false);
  };

  return (
    <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,marginBottom:16,overflow:"hidden"}}>
      <div style={{padding:"12px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer"}} onClick={()=>setExpandido(!expandido)}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span>🎙️</span>
          <span style={{fontSize:12,fontWeight:600,color:C.text}}>Valoraciones grabadas</span>
          {valoraciones.length > 0 && <span style={{background:C.accentGlow,color:C.accentLight,borderRadius:4,padding:"1px 8px",fontSize:10,fontWeight:600}}>{valoraciones.length}</span>}
        </div>
        <span style={{color:C.muted,fontSize:12}}>{expandido?'▲':'▼'}</span>
      </div>

      {expandido && (
        <div style={{borderTop:`1px solid ${C.border}`,padding:14}}>
          {/* Botones grabar/subir */}
          {!grabando && !procesando && (
            <div style={{display:"flex",gap:8,marginBottom:12}}>
              <button onClick={iniciarGrabacion} style={{flex:1,padding:"8px",borderRadius:4,border:"none",background:"#ef4444",color:"white",fontSize:11,fontWeight:600,cursor:"pointer"}}>
                ⏺ Grabar valoración
              </button>
              <label style={{flex:1,padding:"8px",borderRadius:4,border:`1px solid ${C.border}`,background:"transparent",color:C.muted,fontSize:11,fontWeight:600,cursor:"pointer",textAlign:"center"}}>
                📁 Subir audio/video
                <input type="file" accept="audio/*,video/*" style={{display:"none"}} onChange={subirArchivo}/>
              </label>
            </div>
          )}

          {/* Grabando */}
          {grabando && (
            <div style={{background:C.bg,borderRadius:2,padding:14,marginBottom:12,textAlign:"center"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:8}}>
                {!grabPausado && <div style={{width:8,height:8,borderRadius:"50%",background:"#ef4444",animation:"pulse 1s infinite"}}/>}
                <span style={{fontSize:20,fontWeight:700,color:grabPausado?C.muted:"#ef4444",fontFamily:"monospace"}}>
                  {String(Math.floor(grabSegundos/60)).padStart(2,'0')}:{String(grabSegundos%60).padStart(2,'0')}
                </span>
              </div>
              <div style={{display:"flex",gap:8,justifyContent:"center"}}>
                <button onClick={pausarGrabacion} style={{padding:"6px 14px",borderRadius:4,border:`1px solid ${C.border}`,background:"transparent",color:C.muted,fontSize:11,cursor:"pointer"}}>
                  {grabPausado?'▶ Reanudar':'⏸ Pausar'}
                </button>
                <button onClick={finalizarYProcesar} style={{padding:"6px 14px",borderRadius:4,border:"none",background:"#10b981",color:"white",fontSize:11,fontWeight:600,cursor:"pointer"}}>
                  ⏹ Finalizar
                </button>
              </div>
            </div>
          )}

          {/* Procesando */}
          {procesando && <div style={{textAlign:"center",padding:12,fontSize:12,color:C.accentLight,marginBottom:12}}>⏳ Transcribiendo... puede tardar unos segundos</div>}

          {/* Historial de valoraciones */}
          {valoraciones.length === 0 ? (
            <div style={{fontSize:11,color:C.muted,textAlign:"center",padding:8}}>Sin valoraciones grabadas</div>
          ) : valoraciones.map((v,i) => (
            <details key={i} style={{marginBottom:8,background:C.bg,borderRadius:2,overflow:"hidden"}}>
              <summary style={{padding:"10px 12px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between",listStyle:"none"}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <ScoreBadge score={v.score}/>
                  <span style={{fontSize:11,color:C.muted}}>{new Date(v.creado_en).toLocaleDateString('es-AR',{day:'numeric',month:'short',year:'numeric'})}</span>
                </div>
                <span style={{fontSize:10,color:C.muted}}>▼ ver detalle</span>
              </summary>
              <div style={{padding:"10px 12px",borderTop:`1px solid ${C.border}`}}>
                {v.feedback_ia?.resumen && <p style={{fontSize:11,color:C.text,marginBottom:8,lineHeight:1.5}}>{v.feedback_ia.resumen}</p>}
                {v.transcripcion && (
                  <details style={{marginBottom:8}}>
                    <summary style={{fontSize:10,color:C.muted,cursor:"pointer"}}>📝 Ver transcripción</summary>
                    <p style={{fontSize:11,color:C.text,lineHeight:1.6,marginTop:6,whiteSpace:"pre-wrap"}}>{v.transcripcion}</p>
                  </details>
                )}
                <button onClick={()=>{
                  sessionStorage.setItem('propuesta_desde_valoracion', JSON.stringify({info_cruda: v.transcripcion, paciente_id: paciente.id, valoracion_id: v.id}));
                  window.dispatchEvent(new CustomEvent('edge_goto_propuestas'));
                }} style={{padding:"5px 12px",borderRadius:4,border:"none",background:C.accent,color:"white",fontSize:10,fontWeight:600,cursor:"pointer"}}>
                  ✨ Generar propuesta
                </button>
              </div>
            </details>
          ))}
          <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
        </div>
      )}
    </div>
  );
}

// ── TRACKER DE CLIENTES ────────────────────────────────────────────────────────
function TrackerClientesPanel({ prospectos, onVerCliente }) {
  const _t = typeof localStorage !== 'undefined' ? localStorage.getItem('skyward_theme') : 'dark';
  const C = _t === 'light' ? LIGHT_C : DARK_C;

  const [busqueda, setBusqueda] = React.useState('');
  const [filtroFuente, setFiltroFuente] = React.useState('');
  const [filtroEtapa, setFiltroEtapa] = React.useState('');

  const FUENTE_META = {
    meta: {label:'Meta Ads', icon:'🟢', color:'#22c55e'},
    google: {label:'Google Ads', icon:'🔵', color:'#3b82f6'},
    directo: {label:'Directo', icon:'⚪', color:'#64748b'},
  };
  const getFuente = (f) => FUENTE_META[f] || {label: f||'Sin fuente', icon:'🟣', color:'#8b5cf6'};

  // KPIs
  const total = prospectos.length;
  const porFuente = prospectos.reduce((acc, p) => {
    const k = p.fuente || 'directo';
    acc[k] = (acc[k]||0) + 1;
    return acc;
  }, {});
  const porEtapa = prospectos.reduce((acc, p) => {
    const k = p.etapa || 'SIN_ETAPA';
    acc[k] = (acc[k]||0) + 1;
    return acc;
  }, {});
  const agendados = prospectos.filter(p => p.etapa === 'AGENDADO' || p.horario_elegido).length;
  const conEmail = prospectos.filter(p => p.email).length;
  const tasaConv = total > 0 ? Math.round((agendados/total)*100) : 0;

  // Filtros
  const lista = prospectos.filter(p => {
    if (filtroFuente && (p.fuente||'directo') !== filtroFuente) return false;
    if (filtroEtapa && p.etapa !== filtroEtapa) return false;
    if (busqueda) {
      const q = busqueda.toLowerCase();
      return (p.nombre||'').toLowerCase().includes(q) || (p.telefono||'').includes(q) || (p.email||'').toLowerCase().includes(q) || (p.tratamiento||'').toLowerCase().includes(q);
    }
    return true;
  });

  const maxFuente = Math.max(...Object.values(porFuente), 1);

  return (
    <div style={{maxWidth:1100, margin:'0 auto'}}>
      {/* Header */}
      <div style={{marginBottom:24}}>
        <div style={{fontSize:18,fontWeight:800,color:C.text,marginBottom:4}}>🔍 Tracker de Clientes</div>
        <div style={{fontSize:12,color:C.muted}}>Origen, seguimiento y estado de todos los prospectos del estudio</div>
      </div>

      {/* KPI Cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:12,marginBottom:24}}>
        {[
          {label:'Total prospectos', value:total, icon:'👥', color:C.accent},
          {label:'Agendados', value:agendados, icon:'📅', color:C.green},
          {label:'Tasa conversión', value:`${tasaConv}%`, icon:'🎯', color:tasaConv>=40?C.green:C.yellow},
          {label:'Con email', value:conEmail, icon:'📧', color:C.accentLight},
          {label:'Fuentes activas', value:Object.keys(porFuente).length, icon:'📡', color:'#8b5cf6'},
        ].map((kpi,i)=>(
          <div key={i} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:'14px 16px'}}>
            <div style={{fontSize:18,marginBottom:5}}>{kpi.icon}</div>
            <div style={{fontSize:22,fontWeight:800,color:kpi.color,marginBottom:2}}>{kpi.value}</div>
            <div style={{fontSize:10,color:C.muted,letterSpacing:.3}}>{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Gráfico por fuente */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:24}}>
        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:20}}>
          <div style={{fontSize:13,fontWeight:600,marginBottom:16}}>📊 Prospectos por fuente</div>
          {Object.entries(porFuente).sort((a,b)=>b[1]-a[1]).map(([fuente, cant])=>{
            const meta = getFuente(fuente);
            const pct = Math.round((cant/maxFuente)*100);
            return (
              <div key={fuente} style={{marginBottom:10}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                  <span style={{fontSize:12,color:C.text}}>{meta.icon} {meta.label}</span>
                  <span style={{fontSize:12,fontWeight:700,color:meta.color}}>{cant}</span>
                </div>
                <div style={{background:C.bg,borderRadius:4,height:6,overflow:'hidden'}}>
                  <div style={{width:`${pct}%`,height:'100%',background:meta.color,borderRadius:4,transition:'width .6s ease'}}/>
                </div>
              </div>
            );
          })}
          {Object.keys(porFuente).length === 0 && <div style={{fontSize:12,color:C.muted,textAlign:'center',padding:'12px 0'}}>Sin datos de fuente aún</div>}
        </div>

        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:20}}>
          <div style={{fontSize:13,fontWeight:600,marginBottom:16}}>🏷️ Prospectos por etapa</div>
          {Object.entries(porEtapa).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([etapa, cant])=>{
            const pct = Math.round((cant/total)*100);
            const color = etapa==='AGENDADO'?C.green:etapa==='PERDIDO'?C.red:etapa==='CONSULTA_GRATIS'?C.yellow:C.accent;
            return (
              <div key={etapa} style={{marginBottom:10}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                  <span style={{fontSize:11,color:C.text}}>{etapa.replace(/_/g,' ')}</span>
                  <span style={{fontSize:12,fontWeight:700,color}}>{cant} <span style={{fontSize:10,color:C.muted,fontWeight:400}}>({pct}%)</span></span>
                </div>
                <div style={{background:C.bg,borderRadius:4,height:5,overflow:'hidden'}}>
                  <div style={{width:`${pct}%`,height:'100%',background:color,borderRadius:4}}/>
                </div>
              </div>
            );
          })}
          {Object.keys(porEtapa).length === 0 && <div style={{fontSize:12,color:C.muted,textAlign:'center',padding:'12px 0'}}>Sin etapas aún</div>}
        </div>
      </div>

      {/* Tabla */}
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,overflow:'hidden'}}>
        {/* Filtros */}
        <div style={{padding:'14px 20px',borderBottom:`1px solid ${C.border}`,display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
          <input value={busqueda} onChange={e=>setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, teléfono, email..."
            style={{flex:1,minWidth:180,background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:'8px 12px',color:C.text,fontSize:12,fontFamily:'inherit'}}/>
          <select value={filtroFuente} onChange={e=>setFiltroFuente(e.target.value)}
            style={{background:C.bg,border:`1px solid ${filtroFuente?C.accent:C.border}`,borderRadius:4,padding:'8px 12px',color:filtroFuente?C.accentLight:C.muted,fontSize:12,fontFamily:'inherit'}}>
            <option value=''>Todas las fuentes</option>
            {Object.keys(porFuente).map(f=><option key={f} value={f}>{getFuente(f).label}</option>)}
          </select>
          <select value={filtroEtapa} onChange={e=>setFiltroEtapa(e.target.value)}
            style={{background:C.bg,border:`1px solid ${filtroEtapa?C.accent:C.border}`,borderRadius:4,padding:'8px 12px',color:filtroEtapa?C.accentLight:C.muted,fontSize:12,fontFamily:'inherit'}}>
            <option value=''>Todas las etapas</option>
            {Object.keys(porEtapa).map(e=><option key={e} value={e}>{e.replace(/_/g,' ')}</option>)}
          </select>
          {(busqueda||filtroFuente||filtroEtapa) && (
            <button onClick={()=>{setBusqueda('');setFiltroFuente('');setFiltroEtapa('');}}
              style={{background:'transparent',border:`1px solid ${C.border}`,borderRadius:4,padding:'7px 12px',color:C.muted,fontSize:11,cursor:'pointer'}}>× Limpiar</button>
          )}
          <span style={{fontSize:11,color:C.muted,marginLeft:'auto'}}>{lista.length} cliente{lista.length!==1?'s':''}</span>
        </div>

        {/* Header tabla */}
        <div style={{display:'grid',gridTemplateColumns:'2fr 1.2fr 1.2fr 1.4fr 1fr 1fr',padding:'10px 20px',background:C.bg,borderBottom:`1px solid ${C.border}`}}>
          {['Cliente','Teléfono','Email','Servicio','Fuente','Etapa'].map(h=>(
            <div key={h} style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:'.5px'}}>{h}</div>
          ))}
        </div>

        {/* Rows */}
        {lista.length === 0 ? (
          <div style={{padding:'32px 20px',textAlign:'center',color:C.muted,fontSize:13}}>
            {prospectos.length === 0 ? 'No hay prospectos registrados aún' : 'Sin resultados para los filtros aplicados'}
          </div>
        ) : lista.slice(0,100).map((p,i)=>{
          const fuente = getFuente(p.fuente||'directo');
          const etapaColor = p.etapa==='AGENDADO'?C.green:p.etapa==='PERDIDO'?C.red:C.muted;
          return (
            <div key={p.id||i} onClick={()=>onVerCliente&&onVerCliente(p)}
              style={{display:'grid',gridTemplateColumns:'2fr 1.2fr 1.2fr 1.4fr 1fr 1fr',padding:'11px 20px',
                borderBottom:`1px solid ${C.border}`,cursor:'pointer',transition:'background .12s'}}
              onMouseEnter={e=>e.currentTarget.style.background=C.surfaceHover}
              onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              <div>
                <div style={{fontSize:13,fontWeight:600,color:C.text}}>{p.nombre||p.telefono||'—'}</div>
                {p.tratamiento && <div style={{fontSize:10,color:C.accent,marginTop:2}}>{p.tratamiento}</div>}
              </div>
              <div style={{fontSize:12,color:C.muted,alignSelf:'center'}}>{p.telefono||'—'}</div>
              <div style={{fontSize:12,color:C.muted,alignSelf:'center',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.email||<span style={{color:C.border}}>Sin email</span>}</div>
              <div style={{fontSize:12,color:C.text,alignSelf:'center',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.tratamiento||'—'}</div>
              <div style={{alignSelf:'center'}}>
                <span style={{fontSize:11,padding:'2px 7px',borderRadius:2,background:`${fuente.color}18`,color:fuente.color,border:`1px solid ${fuente.color}40`,fontWeight:600}}>
                  {fuente.icon} {fuente.label}
                </span>
              </div>
              <div style={{alignSelf:'center'}}>
                <span style={{fontSize:10,padding:'2px 8px',borderRadius:2,background:`${etapaColor}15`,color:etapaColor,border:`1px solid ${etapaColor}30`,fontWeight:500}}>
                  {(p.etapa||'—').replace(/_/g,' ')}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── HONORARIOS DASHBOARD ───────────────────────────────────────────────────────
function HonorariosDashboard({ client, API, aH, jH, onIrAHonorarios }) {
  const [data, setData] = useState([]);
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [año, setAño] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [expandido, setExpandido] = useState(null); // paciente_id expandido
  const [guardando, setGuardando] = useState(null); // paciente_id guardando
  const [edits, setEdits] = useState({}); // { paciente_id: { campo: valor } }
  const meses = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

  const cargar = () => {
    if (!client?.id) return;
    setLoading(true);
    fetch(`${API}/api/honorario-tracker?cliente_id=${client.id}&mes=${mes}&año=${año}`, { headers: aH() })
      .then(r => r.ok ? r.json() : [])
      .then(d => { setData(Array.isArray(d) ? d : []); })
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, [client?.id, mes, año]);

  const getEdit = (pid, campo, fallback) => edits[pid]?.[campo] !== undefined ? edits[pid][campo] : fallback;
  const setEdit = (pid, campo, val) => setEdits(e => ({ ...e, [pid]: { ...(e[pid]||{}), [campo]: val } }));

  const guardar = async (row) => {
    const pid = row.paciente_id;
    const e = edits[pid] || {};
    setGuardando(pid);
    try {
      await fetch(`${API}/api/honorario-tracker`, {
        method: 'POST', headers: { 'Content-Type':'application/json', ...aH() },
        body: JSON.stringify({
          cliente_id: client.id, paciente_id: pid,
          propuesta_id: row.propuesta?.id || null,
          fecha_envio: e.fecha_envio !== undefined ? e.fecha_envio : row.fecha_envio,
          acepto: e.acepto !== undefined ? e.acepto : row.acepto,
          fecha_aceptacion: e.fecha_aceptacion !== undefined ? e.fecha_aceptacion : row.fecha_aceptacion,
          monto_honorario: e.monto_honorario !== undefined ? e.monto_honorario : row.monto_honorario,
          seg1_hecho: e.seg1_hecho !== undefined ? e.seg1_hecho : row.seg1_hecho,
          seg1_fecha: e.seg1_fecha !== undefined ? e.seg1_fecha : row.seg1_fecha,
          seg1_nota: e.seg1_nota !== undefined ? e.seg1_nota : row.seg1_nota,
          seg2_hecho: e.seg2_hecho !== undefined ? e.seg2_hecho : row.seg2_hecho,
          seg2_fecha: e.seg2_fecha !== undefined ? e.seg2_fecha : row.seg2_fecha,
          seg2_nota: e.seg2_nota !== undefined ? e.seg2_nota : row.seg2_nota,
          seg3_hecho: e.seg3_hecho !== undefined ? e.seg3_hecho : row.seg3_hecho,
          seg3_fecha: e.seg3_fecha !== undefined ? e.seg3_fecha : row.seg3_fecha,
          seg3_nota: e.seg3_nota !== undefined ? e.seg3_nota : row.seg3_nota,
          notas: e.notas !== undefined ? e.notas : row.notas,
        })
      });
      setEdits(ed => { const n={...ed}; delete n[pid]; return n; });
      cargar();
    } catch(err) {}
    setGuardando(null);
  };

  // KPIs
  const totalConsultas = data.length;
  const totalEnviados = data.filter(r => r.fecha_envio).length;
  const totalAceptados = data.filter(r => getEdit(r.paciente_id,'acepto',r.acepto)).length;
  const tasaCierre = totalEnviados > 0 ? Math.round((totalAceptados / totalEnviados) * 100) : 0;
  const promDias = (() => {
    const conDias = data.filter(r => r.dias_transcurridos !== null && !getEdit(r.paciente_id,'acepto',r.acepto));
    if (!conDias.length) return null;
    return Math.round(conDias.reduce((a,r) => a + r.dias_transcurridos, 0) / conDias.length);
  })();
  const pendSeg = data.filter(r => {
    if (getEdit(r.paciente_id,'acepto',r.acepto)) return false;
    if (!r.fecha_envio) return false;
    return !getEdit(r.paciente_id,'seg1_hecho',r.seg1_hecho) || !getEdit(r.paciente_id,'seg2_hecho',r.seg2_hecho) || !getEdit(r.paciente_id,'seg3_hecho',r.seg3_hecho);
  }).length;

  const diasColor = (dias) => {
    if (dias === null) return C.muted;
    if (dias <= 2) return C.green;
    if (dias <= 5) return C.yellow;
    return C.red;
  };

  const fmtFecha = (f) => f ? new Date(f+'T00:00:00').toLocaleDateString('es-AR',{day:'numeric',month:'short'}) : '—';

  return (
    <div style={{maxWidth:1100,margin:"0 auto"}}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:20,flexWrap:"wrap",gap:12}}>
        <div>
          <div style={{fontSize:18,fontWeight:800,color:C.text,marginBottom:3}}>⚖️ Balance de Honorarios</div>
          <div style={{fontSize:12,color:C.muted}}>Honorarios enviados este mes · pipeline de seguimiento</div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          <select value={mes} onChange={e=>setMes(Number(e.target.value))}
            style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:4,padding:"7px 14px",color:C.text,fontSize:12,fontFamily:"inherit"}}>
            {meses.map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}
          </select>
          <select value={año} onChange={e=>setAño(Number(e.target.value))}
            style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:4,padding:"7px 14px",color:C.text,fontSize:12,fontFamily:"inherit"}}>
            {[2024,2025,2026,2027].map(y=><option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:12,marginBottom:24}}>
        {[
          {label:"Honorarios del mes", value:totalConsultas, icon:"⚖️", color:C.accent},
          {label:"Honorarios enviados", value:totalEnviados, icon:"📤", color:C.accentLight},
          {label:"Aceptados", value:totalAceptados, icon:"✅", color:C.green},
          {label:"Tasa de cierre", value:totalEnviados>0?`${tasaCierre}%`:"—", icon:"🎯", color:tasaCierre>=50?C.green:C.yellow},
          {label:"Días prom. respuesta", value:promDias!==null?`${promDias}d`:"—", icon:"⏱️", color:C.muted},
          {label:"Seguimientos pend.", value:pendSeg, icon:"🔔", color:pendSeg>0?C.yellow:C.green},
        ].map((kpi,i)=>(
          <div key={i} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:"14px 16px"}}>
            <div style={{fontSize:18,marginBottom:5}}>{kpi.icon}</div>
            <div style={{fontSize:20,fontWeight:800,color:kpi.color,marginBottom:2}}>{kpi.value}</div>
            <div style={{fontSize:10,color:C.muted,letterSpacing:.3,lineHeight:1.3}}>{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Tabla tracker */}
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,overflow:"hidden"}}>
        <div style={{padding:"13px 18px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontSize:13,fontWeight:700,color:C.text}}>Pipeline de seguimiento — {meses[mes-1]} {año}</div>
          <div style={{fontSize:11,color:C.muted}}>{totalConsultas} cliente{totalConsultas!==1?'s':''}</div>
        </div>

        {loading ? (
          <div style={{padding:40,textAlign:"center",color:C.muted}}>Cargando...</div>
        ) : data.length === 0 ? (
          <div style={{padding:50,textAlign:"center",color:C.muted}}>
            <div style={{fontSize:32,marginBottom:10}}>📋</div>
            <div style={{fontSize:13,fontWeight:600,marginBottom:4}}>Sin honorarios enviados este mes</div>
            <div style={{fontSize:11}}>Cuando envíes honorarios a clientes aparecerán acá para hacer seguimiento</div>
          </div>
        ) : (
          <div>
            {data.map((row, idx) => {
              const pid = row.paciente_id;
              const isOpen = expandido === pid;
              const hasEdits = !!edits[pid] && Object.keys(edits[pid]).length > 0;
              const acepto = getEdit(pid,'acepto',row.acepto);
              const fechaEnvio = getEdit(pid,'fecha_envio',row.fecha_envio);
              const seg1h = getEdit(pid,'seg1_hecho',row.seg1_hecho);
              const seg2h = getEdit(pid,'seg2_hecho',row.seg2_hecho);
              const seg3h = getEdit(pid,'seg3_hecho',row.seg3_hecho);
              const diasT = fechaEnvio ? Math.floor((Date.now() - new Date(fechaEnvio)) / 86400000) : null;
              const estadoPreso = row.propuesta ? (acepto ? 'aceptado' : (fechaEnvio ? 'enviado' : 'borrador')) : 'sin_presupuesto';

              return (
                <div key={pid} style={{borderBottom:idx<data.length-1?`1px solid ${C.border}`:"none"}}>
                  {/* Fila principal */}
                  <div style={{display:"flex",alignItems:"center",gap:12,padding:"12px 18px",cursor:"pointer",transition:"background .15s",background:isOpen?C.surfaceHover:"transparent"}}
                    onClick={()=>setExpandido(isOpen?null:pid)}>

                    {/* Avatar */}
                    <div style={{width:36,height:36,borderRadius:4,background:acepto?"rgba(16,185,129,0.15)":C.accentGlow,border:`1px solid ${acepto?"rgba(16,185,129,0.3)":C.accent+"44"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>
                      {acepto?"✅":"⚖️"}
                    </div>

                    {/* Nombre y tipo */}
                    <div style={{flex:"0 0 200px",minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:600,color:C.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{row.paciente_nombre||row.paciente_telefono}</div>
                      <div style={{fontSize:10,color:row.tipo_consulta==='gratis'?C.green:C.accentLight,fontWeight:600,marginTop:1}}>
                        {row.tipo_consulta==='gratis'?'🆓 Consulta gratis':'💰 Consulta paga'} · {fmtFecha(row.fecha_consulta)}
                      </div>
                    </div>

                    {/* Estado presupuesto */}
                    <div style={{flex:"0 0 130px"}}>
                      {estadoPreso==='sin_presupuesto' && <span style={{fontSize:11,padding:"3px 9px",borderRadius:2,background:"rgba(100,100,100,0.15)",color:C.muted,fontWeight:600}}>Sin presupuesto</span>}
                      {estadoPreso==='borrador' && <span style={{fontSize:11,padding:"3px 9px",borderRadius:2,background:"rgba(100,100,100,0.15)",color:C.muted,fontWeight:600}}>📝 Borrador</span>}
                      {estadoPreso==='enviado' && <span style={{fontSize:11,padding:"3px 9px",borderRadius:2,background:C.accentGlow,color:C.accentLight,fontWeight:600}}>📤 Enviado</span>}
                      {estadoPreso==='aceptado' && <span style={{fontSize:11,padding:"3px 9px",borderRadius:2,background:"rgba(16,185,129,0.15)",color:C.green,fontWeight:600}}>✅ Aceptado</span>}
                    </div>

                    {/* Días transcurridos */}
                    <div style={{flex:"0 0 90px",textAlign:"center"}}>
                      {diasT !== null ? (
                        <div>
                          <div style={{fontSize:18,fontWeight:800,color:diasColor(diasT),lineHeight:1}}>{diasT}</div>
                          <div style={{fontSize:9,color:C.muted}}>días</div>
                        </div>
                      ) : <div style={{fontSize:11,color:C.muted}}>—</div>}
                    </div>

                    {/* Seguimientos — pills */}
                    <div style={{flex:1,display:"flex",gap:6,justifyContent:"center"}}>
                      {[['S1',seg1h],['S2',seg2h],['S3',seg3h]].map(([label,hecho])=>(
                        <div key={label} style={{width:28,height:28,borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,
                          background:hecho?"rgba(16,185,129,0.2)":"rgba(100,100,100,0.1)",
                          color:hecho?C.green:C.muted,
                          border:`1px solid ${hecho?"rgba(16,185,129,0.35)":C.border}`}}>
                          {hecho?"✓":label}
                        </div>
                      ))}
                    </div>

                    {/* Chevron */}
                    <div style={{color:C.muted,fontSize:11,flexShrink:0,transition:"transform .2s",transform:isOpen?"rotate(180deg)":"rotate(0deg)"}}>▼</div>
                  </div>

                  {/* Panel expandido */}
                  {isOpen && (
                    <div style={{background:C.bg,borderTop:`1px solid ${C.border}`,padding:"20px 18px 18px"}}>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16,marginBottom:16}}>

                        {/* Columna 1: Presupuesto */}
                        <div>
                          <div style={{fontSize:11,fontWeight:700,color:C.muted,marginBottom:10,textTransform:"uppercase",letterSpacing:".6px"}}>Presupuesto</div>
                          {row.propuesta ? (
                            <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:"10px 12px",marginBottom:8}}>
                              <div style={{fontSize:12,fontWeight:600,color:C.text,marginBottom:2}}>{row.propuesta.titulo||'Sin título'}</div>
                              <div style={{fontSize:10,color:C.muted}}>Estado: {row.propuesta.estado||'borrador'}</div>
                            </div>
                          ) : (
                            <div style={{fontSize:11,color:C.muted,marginBottom:8,padding:"10px",background:C.surface,borderRadius:2,border:`1px dashed ${C.border}`,textAlign:"center"}}>
                              Sin presupuesto<br/>
                              <span style={{fontSize:10}}>Crealo desde Honorarios →</span>
                            </div>
                          )}
                          <div>
                            <label style={{fontSize:10,color:C.muted,display:"block",marginBottom:3}}>Fecha de envío</label>
                            <input type="date" value={getEdit(pid,'fecha_envio',row.fecha_envio)||''}
                              onChange={e=>setEdit(pid,'fecha_envio',e.target.value)}
                              style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:4,padding:"6px 10px",color:C.text,fontSize:12,fontFamily:"inherit",boxSizing:"border-box"}}/>
                          </div>
                          <div style={{marginTop:8}}>
                            <label style={{fontSize:10,color:C.muted,display:"block",marginBottom:3}}>Monto honorario ($)</label>
                            <input type="number" placeholder="Ej: 150000" value={getEdit(pid,'monto_honorario',row.monto_honorario)||''}
                              onChange={e=>setEdit(pid,'monto_honorario',e.target.value)}
                              style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:4,padding:"6px 10px",color:C.text,fontSize:12,fontFamily:"inherit",boxSizing:"border-box"}}/>
                          </div>
                        </div>

                        {/* Columna 2: Resultado */}
                        <div>
                          <div style={{fontSize:11,fontWeight:700,color:C.muted,marginBottom:10,textTransform:"uppercase",letterSpacing:".6px"}}>Resultado</div>
                          {/* Aceptó */}
                          <div style={{marginBottom:10}}>
                            <label style={{fontSize:10,color:C.muted,display:"block",marginBottom:6}}>¿Aceptó el honorario?</label>
                            <div style={{display:"flex",gap:8}}>
                              {[{v:true,l:"✅ Sí, aceptó"},{v:false,l:"❌ No aceptó"}].map(opt=>(
                                <button key={String(opt.v)} onClick={()=>setEdit(pid,'acepto',opt.v)}
                                  style={{flex:1,padding:"7px 6px",borderRadius:4,border:`1px solid ${getEdit(pid,'acepto',row.acepto)===opt.v?(opt.v?"rgba(16,185,129,0.5)":"rgba(239,68,68,0.4)"):C.border}`,
                                    background:getEdit(pid,'acepto',row.acepto)===opt.v?(opt.v?"rgba(16,185,129,0.15)":"rgba(239,68,68,0.1)"):"transparent",
                                    color:getEdit(pid,'acepto',row.acepto)===opt.v?(opt.v?C.green:C.red):C.muted,
                                    fontSize:11,fontWeight:600,cursor:"pointer"}}>
                                  {opt.l}
                                </button>
                              ))}
                            </div>
                          </div>
                          {getEdit(pid,'acepto',row.acepto) && (
                            <div style={{marginBottom:10}}>
                              <label style={{fontSize:10,color:C.muted,display:"block",marginBottom:3}}>Fecha de aceptación</label>
                              <input type="date" value={getEdit(pid,'fecha_aceptacion',row.fecha_aceptacion)||''}
                                onChange={e=>setEdit(pid,'fecha_aceptacion',e.target.value)}
                                style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:4,padding:"6px 10px",color:C.text,fontSize:12,fontFamily:"inherit",boxSizing:"border-box"}}/>
                            </div>
                          )}
                          <div>
                            <label style={{fontSize:10,color:C.muted,display:"block",marginBottom:3}}>Notas internas</label>
                            <textarea value={getEdit(pid,'notas',row.notas)||''} onChange={e=>setEdit(pid,'notas',e.target.value)}
                              rows={3} placeholder="Observaciones, objeciones, próximos pasos..."
                              style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:4,padding:"7px 10px",color:C.text,fontSize:12,fontFamily:"inherit",resize:"vertical",boxSizing:"border-box",lineHeight:1.5}}/>
                          </div>
                        </div>

                        {/* Columna 3: Seguimientos */}
                        <div>
                          <div style={{fontSize:11,fontWeight:700,color:C.muted,marginBottom:10,textTransform:"uppercase",letterSpacing:".6px"}}>Seguimientos</div>
                          {[
                            {n:1,hecho:'seg1_hecho',fecha:'seg1_fecha',nota:'seg1_nota',
                             hint:"2-3 días post-envío: preguntar si lo pudo revisar"},
                            {n:2,hecho:'seg2_hecho',fecha:'seg2_fecha',nota:'seg2_nota',
                             hint:"5-7 días: resolver objeciones, reforzar valor"},
                            {n:3,hecho:'seg3_hecho',fecha:'seg3_fecha',nota:'seg3_nota',
                             hint:"10-14 días: decisión final, oferta especial o cerrar"},
                          ].map(seg => (
                            <div key={seg.n} style={{marginBottom:12,background:C.surface,border:`1px solid ${getEdit(pid,seg.hecho,row[seg.hecho])?"rgba(16,185,129,0.3)":C.border}`,borderRadius:2,padding:"10px 12px",transition:"border-color .2s"}}>
                              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                                <input type="checkbox" checked={!!getEdit(pid,seg.hecho,row[seg.hecho])}
                                  onChange={e=>setEdit(pid,seg.hecho,e.target.checked)}
                                  style={{width:16,height:16,cursor:"pointer",accentColor:C.green}}/>
                                <span style={{fontSize:12,fontWeight:700,color:getEdit(pid,seg.hecho,row[seg.hecho])?C.green:C.text}}>Seguimiento {seg.n}</span>
                              </div>
                              <div style={{fontSize:9,color:C.muted,marginBottom:6,lineHeight:1.4}}>{seg.hint}</div>
                              <input type="date" value={getEdit(pid,seg.fecha,row[seg.fecha])||''}
                                onChange={e=>setEdit(pid,seg.fecha,e.target.value)}
                                style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"5px 8px",color:C.text,fontSize:11,fontFamily:"inherit",boxSizing:"border-box",marginBottom:5}}/>
                              <input placeholder={`Nota seg. ${seg.n}...`} value={getEdit(pid,seg.nota,row[seg.nota])||''}
                                onChange={e=>setEdit(pid,seg.nota,e.target.value)}
                                style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"5px 8px",color:C.text,fontSize:11,fontFamily:"inherit",boxSizing:"border-box"}}/>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Footer expandido */}
                      <div style={{display:"flex",gap:8,justifyContent:"flex-end",paddingTop:12,borderTop:`1px solid ${C.border}`}}>
                        {onIrAHonorarios && (
                          <button onClick={()=>onIrAHonorarios(pid)}
                            style={{padding:"7px 14px",borderRadius:4,border:`1px solid ${C.border}`,background:"transparent",color:C.muted,fontSize:11,cursor:"pointer"}}>
                            📄 Ver / crear presupuesto
                          </button>
                        )}
                        <button onClick={()=>{setExpandido(null);setEdits(ed=>{const n={...ed};delete n[pid];return n;});}}
                          style={{padding:"7px 14px",borderRadius:4,border:`1px solid ${C.border}`,background:"transparent",color:C.muted,fontSize:11,cursor:"pointer"}}>
                          Cancelar
                        </button>
                        <button onClick={()=>guardar(row)} disabled={guardando===pid}
                          style={{padding:"7px 16px",borderRadius:4,border:"none",background:C.accent,color:"white",fontSize:11,fontWeight:700,cursor:"pointer"}}>
                          {guardando===pid?"Guardando…":"💾 Guardar cambios"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Leyenda */}
      <div style={{display:"flex",gap:16,marginTop:12,flexWrap:"wrap"}}>
        {[
          {color:C.green,label:"0-2 días"},
          {color:C.yellow,label:"3-5 días"},
          {color:C.red,label:"6+ días"},
        ].map(l=>(
          <div key={l.label} style={{display:"flex",alignItems:"center",gap:5,fontSize:10,color:C.muted}}>
            <div style={{width:8,height:8,borderRadius:"50%",background:l.color}}/>
            {l.label}
          </div>
        ))}
        <div style={{fontSize:10,color:C.muted,marginLeft:"auto"}}>🕐 Días desde envío del honorario</div>
      </div>
    </div>
  );
}

// ── HONORARIOS CONSTANTS ─────────────────────────────────────────────────────
const FUEROS_JURIDICOS = ['Civil','Comercial','Familia','Laboral','Penal','Administrativo','Tributario','Sucesorio','Otros'];
const SERVICIOS_POR_FUERO = {
  Civil:['Daños y perjuicios','Cumplimiento contractual','Desalojo','Cobro de alquileres','Prescripción adquisitiva','Reivindicación','Otros'],
  Comercial:['Contratos comerciales','Sociedades','Concursos y quiebras','Facturas impagas','Marcas y patentes','Otros'],
  Familia:['Divorcio vincular','Alimentos','Régimen de visitas','Adopción','Violencia familiar','Guarda','Otros'],
  Laboral:['Despido','Accidente laboral','Liquidación de haberes','Reinstalación','ART','Otros'],
  Penal:['Defensa penal','Querella','Violencia de género','Delitos informáticos','Narcotráfico','Otros'],
  Administrativo:['Impugnación de acto admin.','Contrato administrativo','Habeas data','Amparo','Otros'],
  Tributario:['AFIP','ARBA','Ejecución fiscal','Concurso de acreedores','Otros'],
  Sucesorio:['Sucesión intestada','Sucesión testamentaria','Legítima','Colación','Otros'],
  Otros:['Consultoría','Redacción de contratos','Asesoría general','Mediación','Otros'],
};
const PROVINCIAS_AR = ['Buenos Aires','CABA','Catamarca','Chaco','Chubut','Córdoba','Corrientes','Entre Ríos','Formosa','Jujuy','La Pampa','La Rioja','Mendoza','Misiones','Neuquén','Río Negro','Salta','San Juan','San Luis','Santa Cruz','Santa Fe','Santiago del Estero','Tierra del Fuego','Tucumán'];
const GASTOS_PREDEFINIDOS = ['Tasa de justicia','Edictos','Peritos','Sellados','Gastos de inscripción','Honorarios del mediador','Honorarios del escribano','Gastos de notificación','Certificaciones','Impuesto de sellos','Gastos de correspondencia','Gastos de traslado'];

function PropuestasPanel({ client, API, aH, jH, pacientes, notificaciones=[], onLeerNotificacion }) {
  // ── Vista ─────────────────────────────────────────────────────────────────
  const [vista, setVista] = useState('lista'); // lista | editor | plantillas
  const [propuestas, setPropuestas] = useState([]);
  const [plantillas, setPlantillas] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [propActual, setPropActual] = useState(null);
  const [titulo, setTitulo] = useState('');
  const [contenidoGenerado, setContenidoGenerado] = useState(null);
  const [previewTick, setPreviewTick] = useState(0);
  const [generando, setGenerando] = useState(false);
  const [autocompletando, setAutocompletando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [showEnviar, setShowEnviar] = useState(false);
  const [emailEnvio, setEmailEnvio] = useState('');
  const [historialChat, setHistorialChat] = useState([]);
  const [mensajeEdicion, setMensajeEdicion] = useState('');
  const [abiertos, setAbiertos] = useState([true, true, true, true]);
  const [selectedPlantillaId, setSelectedPlantillaId] = useState('');

  // ── Bloque 1: Datos del cliente ───────────────────────────────────────────
  const [pacienteId, setPacienteId] = useState('');
  const [tipoPersona, setTipoPersona] = useState('humana');
  const [b1Nombre, setB1Nombre] = useState('');
  const [b1Apellido, setB1Apellido] = useState('');
  const [b1Dni, setB1Dni] = useState('');
  const [b1RazonSocial, setB1RazonSocial] = useState('');
  const [b1Cuit, setB1Cuit] = useState('');
  const [b1Representante, setB1Representante] = useState('');
  const [b1Tel, setB1Tel] = useState('');
  const [b1Email, setB1Email] = useState('');
  const [b1Calle, setB1Calle] = useState('');
  const [b1Numero, setB1Numero] = useState('');
  const [b1Piso, setB1Piso] = useState('');
  const [b1DomConst, setB1DomConst] = useState('');
  const [b1Ciudad, setB1Ciudad] = useState('');
  const [b1Provincia, setB1Provincia] = useState('');
  const [b1Cp, setB1Cp] = useState('');

  // ── Bloque 2: Información del servicio legal ──────────────────────────────
  const [b2Fuero, setB2Fuero] = useState('');
  const [b2Servicio, setB2Servicio] = useState('');
  const [b2Jurisdiccion, setB2Jurisdiccion] = useState('');
  const [b2Descripcion, setB2Descripcion] = useState('');
  const [b2Objetivo, setB2Objetivo] = useState('');
  const [b2Incluye, setB2Incluye] = useState(['']);
  const [b2NoIncluye, setB2NoIncluye] = useState(['']);
  const [b2Contraparte, setB2Contraparte] = useState('');
  const [b2Urgencia, setB2Urgencia] = useState('Normal');

  // ── Bloque 3: Honorarios ──────────────────────────────────────────────────
  const [b3Modalidad, setB3Modalidad] = useState('fijo');
  const [b3Valor, setB3Valor] = useState('');
  const [b3Moneda, setB3Moneda] = useState('ARS');
  const [b3Etapas, setB3Etapas] = useState([{nombre:'', valor:''}]);
  const [b3ValorHora, setB3ValorHora] = useState('');
  const [b3Horas, setB3Horas] = useState('');
  const [b3CuotaLitisPct, setB3CuotaLitisPct] = useState('');
  const [b3Anticipo, setB3Anticipo] = useState('');
  const [b3FormaPago, setB3FormaPago] = useState([]);
  const [b3Cuotas, setB3Cuotas] = useState('');
  const [b3GastosNoInc, setB3GastosNoInc] = useState([]);
  const [b3GastoCustom, setB3GastoCustom] = useState('');
  const [cotizacion, setCotizacion] = useState(null);
  const [b3Validez, setB3Validez] = useState('15');
  const [b3Condiciones, setB3Condiciones] = useState('');

  // ── Bloque 4: Info en crudo ───────────────────────────────────────────────
  const [infoCruda, setInfoCruda] = useState('');

  // ── Debounce preview ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!contenidoGenerado) return;
    const t = setTimeout(() => setPreviewTick(n => n + 1), 400);
    return () => clearTimeout(t);
  }, [contenidoGenerado]);

  // ── Cotización USD/JUL (dolarapi.com) ─────────────────────────────────────
  useEffect(() => {
    const fetchCotizacion = async () => {
      try {
        const r = await fetch('https://dolarapi.com/v1/dolares');
        if (!r.ok) return;
        const data = await r.json();
        const blue = data.find(d => d.casa === 'blue');
        const oficial = data.find(d => d.casa === 'oficial');
        const now = new Date();
        const fecha = now.toLocaleDateString('es-AR',{day:'numeric',month:'short'}) + ' ' + now.toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'});
        setCotizacion({ blue: blue?.venta, oficial: oficial?.venta, fecha });
      } catch(e) {}
    };
    fetchCotizacion();
  }, []);

  // ── Helpers de estilo ─────────────────────────────────────────────────────
  const inputSt = {width:'100%',background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:'8px 12px',color:C.text,fontSize:13,fontFamily:'inherit',boxSizing:'border-box'};
  const labelSt = {fontSize:11,color:C.muted,fontWeight:500,display:'block',marginBottom:4,textTransform:'uppercase',letterSpacing:'.5px'};
  const fieldSt = {marginBottom:12};
  const bloqueBodySt = {padding:'16px',borderBottom:`1px solid ${C.border}`};

  const toggleBloque = i => setAbiertos(prev => prev.map((v, j) => j === i ? !v : v));

  const AccordionHeader = ({idx, label}) => (
    <div onClick={()=>toggleBloque(idx)}
      style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',padding:'12px 16px',background:C.surface,borderBottom:`1px solid ${C.border}`,userSelect:'none'}}>
      <span style={{fontSize:10,color:C.muted,transition:'transform .15s',display:'inline-block',transform:abiertos[idx]?'rotate(90deg)':'rotate(0deg)'}}>▶</span>
      <span style={{fontSize:12,fontWeight:700,letterSpacing:'.7px',textTransform:'uppercase',flex:1,color:C.text}}>{label}</span>
    </div>
  );

  // ── Compilar info cruda desde los bloques ─────────────────────────────────
  const compilarInfoCruda = () => {
    const id = tipoPersona==='humana'
      ? `Cliente: ${[b1Nombre,b1Apellido].filter(Boolean).join(' ')}${b1Dni?`, DNI ${b1Dni}`:''}`
      : `Empresa: ${b1RazonSocial}${b1Cuit?`, CUIT ${b1Cuit}`:''}${b1Representante?`, Rep. Legal: ${b1Representante}`:''}`;
    const dir = [b1Calle,b1Numero,b1Piso,b1Ciudad,b1Provincia,b1Cp].filter(Boolean).join(', ');
    const contacto = [b1Tel&&`Tel: ${b1Tel}`, b1Email&&`Email: ${b1Email}`].filter(Boolean).join(' | ');
    const domConst = b1DomConst ? `Domicilio constituido: ${b1DomConst}` : '';
    const svc = [
      b2Fuero&&`Fuero: ${b2Fuero}`,
      b2Servicio&&`Tipo de servicio: ${b2Servicio}`,
      b2Jurisdiccion&&`Jurisdicción: ${b2Jurisdiccion}`,
      b2Urgencia!=='Normal'&&`Urgencia: ${b2Urgencia}`,
    ].filter(Boolean).join(' | ');
    const desc = b2Descripcion ? `Descripción del caso: ${b2Descripcion}` : '';
    const obj = b2Objetivo ? `Objetivo: ${b2Objetivo}` : '';
    const inc = b2Incluye.filter(Boolean).length ? `Incluye: ${b2Incluye.filter(Boolean).join(', ')}` : '';
    const noInc = b2NoIncluye.filter(Boolean).length ? `No incluye: ${b2NoIncluye.filter(Boolean).join(', ')}` : '';
    const contra = b2Contraparte ? `Contraparte: ${b2Contraparte}` : '';
    const hon = b3Modalidad==='fijo' ? `Honorarios fijos: ${b3Valor} ${b3Moneda}`
      : b3Modalidad==='hora' ? `Por hora: ${b3ValorHora} ${b3Moneda}/h, estimado ${b3Horas}h`
      : b3Modalidad==='cuota_litis' ? `Cuota litis: ${b3CuotaLitisPct}%${b3Anticipo?`, anticipo $${b3Anticipo}`:''}`
      : b3Modalidad==='mixto' ? `Honorarios mixtos: anticipo $${b3Anticipo} + ${b3CuotaLitisPct}% sobre éxito`
      : b3Modalidad==='etapa' ? `Por etapas: ${b3Etapas.filter(e=>e.nombre).map(e=>`${e.nombre} ($${e.valor})`).join(', ')}`
      : '';
    const pago = b3FormaPago.length ? `Forma de pago: ${b3FormaPago.join(', ')}` : '';
    const cuotas = b3Cuotas ? `Cuotas: ${b3Cuotas}` : '';
    const gastos = b3GastosNoInc.filter(Boolean).length ? `Gastos no incluidos: ${b3GastosNoInc.filter(Boolean).join(', ')}` : '';
    const validez = b3Validez ? `Validez de la oferta: ${b3Validez} días` : '';
    const cond = b3Condiciones ? `Condiciones: ${b3Condiciones}` : '';
    return [id, dir&&`Domicilio: ${dir}`, domConst, contacto, svc, desc, obj, inc, noInc, contra, hon, pago, cuotas, gastos, validez, cond, infoCruda].filter(Boolean).join('\n');
  };

  // ── Data fetching ─────────────────────────────────────────────────────────
  const fetchPropuestas = async () => {
    setCargando(true);
    try {
      const [rp, rt] = await Promise.all([
        fetch(`${API}/api/propuestas?cliente_id=${client.id}&es_plantilla=0`, {headers:aH()}).then(r=>r.json()),
        fetch(`${API}/api/propuestas?cliente_id=${client.id}&es_plantilla=1`, {headers:aH()}).then(r=>r.json()),
      ]);
      setPropuestas(Array.isArray(rp) ? rp : []);
      setPlantillas(Array.isArray(rt) ? rt : []);
    } catch(e) {}
    setCargando(false);
  };

  useState(() => {
    fetchPropuestas();
    const fromVal = sessionStorage.getItem('propuesta_desde_valoracion');
    if (fromVal) {
      try {
        const data = JSON.parse(fromVal);
        setInfoCruda(data.info_cruda || '');
        if (data.paciente_id) setPacienteId(String(data.paciente_id));
        setVista('editor');
        sessionStorage.removeItem('propuesta_desde_valoracion');
      } catch(e) {}
    }
  }, []);

  // ── IA: Generar propuesta ─────────────────────────────────────────────────
  const generarPropuesta = async (esEdicion = false) => {
    const texto = esEdicion ? mensajeEdicion : compilarInfoCruda();
    if (!texto.trim()) return;
    setGenerando(true);
    try {
      const pac = pacientes?.find(p => p.id === parseInt(pacienteId));
      const nombreCliente = pac?.nombre || [b1Nombre, b1Apellido].filter(Boolean).join(' ') || b1RazonSocial || '';
      const r = await fetch(`${API}/api/propuestas/generar`, {
        method:'POST', headers:jH(),
        body: JSON.stringify({
          info_cruda: texto,
          cliente_id: client.id,
          paciente_nombre: nombreCliente,
          historial_chat: esEdicion ? historialChat : [],
        })
      });
      const d = await r.json();
      if (d.ok) {
        if (d.es_conversacional) {
          const newHist = d.historial || [...historialChat, {role:'user',content:texto}, {role:'assistant',content:d.mensaje}];
          setHistorialChat(newHist);
          if (esEdicion) setMensajeEdicion('');
        } else {
          setContenidoGenerado(d.contenido);
          setHistorialChat(d.historial || []);
          if (!titulo && d.contenido?.titulo) setTitulo(d.contenido.titulo);
          if (esEdicion) setMensajeEdicion('');
        }
      }
    } catch(e) { console.error(e); }
    setGenerando(false);
  };

  // ── IA: Autocompletar formulario desde crudo ──────────────────────────────
  const autocompletar = async () => {
    if (!infoCruda.trim()) return;
    setAutocompletando(true);
    try {
      const r = await fetch(`${API}/api/propuestas/generar`, {
        method:'POST', headers:jH(),
        body: JSON.stringify({ info_cruda: infoCruda, cliente_id: client.id, paciente_nombre: '', historial_chat: [] })
      });
      const d = await r.json();
      if (d.ok && d.contenido) {
        const c = d.contenido;
        if (c.titulo && !titulo) setTitulo(c.titulo);
        if (c.cliente_nombre && !b1Nombre && !b1RazonSocial) {
          const parts = (c.cliente_nombre || '').split(' ');
          setB1Nombre(parts[0] || ''); setB1Apellido(parts.slice(1).join(' ') || '');
        }
        if (c.diagnostico && !b2Descripcion) setB2Descripcion(c.diagnostico);
        if (c.objetivo && !b2Objetivo) setB2Objetivo(c.objetivo);
        setContenidoGenerado(c);
      }
    } catch(e) { console.error(e); }
    setAutocompletando(false);
  };

  // ── Guardar ───────────────────────────────────────────────────────────────
  const guardar = async (comoPlantilla = false, notificarSecretaria = false, nomPlantilla = '') => {
    setGuardando(true);
    try {
      const body = {
        cliente_id: client.id,
        paciente_id: comoPlantilla ? null : (pacienteId || null),
        titulo: titulo || contenidoGenerado?.titulo || 'Sin título',
        info_cruda: infoCruda || compilarInfoCruda(),
        contenido: contenidoGenerado,
        es_plantilla: comoPlantilla,
        nombre_plantilla: comoPlantilla ? nomPlantilla : null,
        estado: notificarSecretaria ? 'borrador' : undefined,
        notificar_secretaria: notificarSecretaria,
      };
      let r;
      if (propActual?.id) {
        r = await fetch(`${API}/api/propuestas/${propActual.id}`, {method:'PUT', headers:jH(), body:JSON.stringify(body)});
      } else {
        r = await fetch(`${API}/api/propuestas`, {method:'POST', headers:jH(), body:JSON.stringify(body)});
      }
      if (r.ok) { const saved = await r.json(); setPropActual(saved); fetchPropuestas(); }
    } catch(e) {}
    setGuardando(false);
  };

  // ── Eliminar ──────────────────────────────────────────────────────────────
  const eliminar = async (id) => {
    if (!confirm('¿Eliminar este presupuesto? Esta acción no se puede deshacer.')) return;
    try {
      const r = await fetch(`${API}/api/propuestas/${id}`, {method:'DELETE', headers:jH()});
      if (!r.ok) { const d = await r.json().catch(()=>{}); alert('Error al eliminar: ' + (d?.error || r.status)); return; }
      fetchPropuestas();
    } catch(e) { alert('Error de red al eliminar'); }
  };

  // ── Reset editor ──────────────────────────────────────────────────────────
  const resetEditor = () => {
    setPropActual(null); setTitulo(''); setContenidoGenerado(null); setHistorialChat([]);
    setMensajeEdicion(''); setInfoCruda(''); setPacienteId(''); setTipoPersona('humana');
    setB1Nombre(''); setB1Apellido(''); setB1Dni(''); setB1RazonSocial(''); setB1Cuit('');
    setB1Representante(''); setB1Tel(''); setB1Email(''); setB1Calle(''); setB1Numero('');
    setB1Piso(''); setB1DomConst(''); setB1Ciudad(''); setB1Provincia(''); setB1Cp('');
    setB2Fuero(''); setB2Servicio(''); setB2Jurisdiccion(''); setB2Descripcion('');
    setB2Objetivo(''); setB2Incluye(['']); setB2NoIncluye(['']); setB2Contraparte(''); setB2Urgencia('Normal');
    setB3Modalidad('fijo'); setB3Valor(''); setB3Moneda('ARS'); setB3Etapas([{nombre:'',valor:''}]);
    setB3ValorHora(''); setB3Horas(''); setB3CuotaLitisPct(''); setB3Anticipo('');
    setB3FormaPago([]); setB3Cuotas('');
    setB3GastosNoInc([]); setB3GastoCustom('');
    setB3Validez('15'); setB3Condiciones(''); setSelectedPlantillaId('');
  };

  const abrirEditor = (prop) => {
    resetEditor();
    setPropActual(prop);
    setInfoCruda(prop.info_cruda || '');
    setTitulo(prop.titulo || '');
    setPacienteId(prop.paciente_id ? String(prop.paciente_id) : '');
    setContenidoGenerado(prop.contenido || null);
    setVista('editor');
  };

  const nueva = (plantilla = null) => {
    resetEditor();
    if (plantilla) {
      setInfoCruda(plantilla.info_cruda || '');
      setContenidoGenerado(plantilla.contenido || null);
      setSelectedPlantillaId(String(plantilla.id));
    }
    setVista('editor');
  };

  const aplicarPlantilla = (pid) => {
    setSelectedPlantillaId(pid);
    const p = plantillas.find(x => String(x.id) === String(pid));
    if (p?.contenido) setContenidoGenerado(p.contenido);
  };

  const enviarEmail = async () => {
    if (!emailEnvio.trim() || !propActual?.id) return;
    setEnviando(true);
    await guardar(false);
    const r = await fetch(`${API}/api/propuestas/${propActual.id}/enviar-email`, {
      method:'POST', headers:jH(),
      body: JSON.stringify({cliente_id: client.id, email_destino: emailEnvio})
    });
    if (r.ok) { setShowEnviar(false); setEmailEnvio(''); fetchPropuestas(); }
    setEnviando(false);
  };

  // ── VISTA: Editor ─────────────────────────────────────────────────────────
  if (vista === 'editor') return (
    <div>
      {/* Header del editor */}
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:20,flexWrap:'wrap'}}>
        <button onClick={()=>setVista('lista')} style={{padding:'6px 12px',borderRadius:4,border:`1px solid ${C.border}`,background:'transparent',color:C.muted,fontSize:12,cursor:'pointer',flexShrink:0}}>← Volver</button>
        <input value={titulo} onChange={e=>setTitulo(e.target.value)} placeholder="Título del presupuesto de honorarios..."
          style={{flex:1,minWidth:180,background:C.surface,border:`1px solid ${C.border}`,borderRadius:4,padding:'8px 12px',color:C.text,fontSize:14,fontWeight:600,fontFamily:'inherit'}}/>
        <div style={{display:'flex',gap:8,flexShrink:0,flexWrap:'wrap'}}>
          <button onClick={()=>generarPropuesta(false)} disabled={generando}
            style={{padding:'8px 14px',borderRadius:4,border:'none',background:generando?'#374151':C.accent,color:'white',fontSize:12,fontWeight:600,cursor:'pointer'}}>
            {generando?'✨ Generando...':'✨ Generar IA'}
          </button>
          <button onClick={()=>guardar(false)} disabled={guardando}
            style={{padding:'8px 14px',borderRadius:4,border:'none',background:C.green,color:'white',fontSize:12,fontWeight:600,cursor:'pointer'}}>
            {guardando?'Guardando...':'💾 Guardar'}
          </button>
          {contenidoGenerado && (
            <button onClick={()=>{
              const pac = pacientes?.find(p=>p.id===parseInt(pacienteId));
              if (pac?.email) setEmailEnvio(pac.email);
              setShowEnviar(true);
            }} style={{padding:'8px 14px',borderRadius:4,border:'none',background:'#0891b2',color:'white',fontSize:12,fontWeight:600,cursor:'pointer'}}>✉ Enviar</button>
          )}
        </div>
      </div>

      {/* Modal enviar */}
      {showEnviar && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={()=>setShowEnviar(false)}>
          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:24,width:420}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:14,fontWeight:600,marginBottom:4}}>Enviar presupuesto</div>
            <div style={{fontSize:12,color:C.muted,marginBottom:16}}>Elegí cómo enviárselo al cliente</div>
            <div style={{marginBottom:14}}>
              <label style={labelSt}>📧 Email</label>
              <input value={emailEnvio} onChange={e=>setEmailEnvio(e.target.value)} placeholder="Email del cliente..."
                style={{width:'100%',background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:'9px 12px',color:C.text,fontSize:13,fontFamily:'inherit',boxSizing:'border-box'}}/>
            </div>
            {propActual?.uuid && (
              <div style={{marginBottom:14}}>
                <label style={labelSt}>🔗 Link público</label>
                <div style={{display:'flex',gap:8}}>
                  <input readOnly value={`https://api.edgecrm.net/tratamiento/${propActual.uuid}`}
                    style={{flex:1,background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:'9px 12px',fontSize:12,color:C.text,fontFamily:'inherit',boxSizing:'border-box'}}/>
                  <button onClick={()=>navigator.clipboard.writeText(`https://api.edgecrm.net/tratamiento/${propActual.uuid}`)}
                    style={{padding:'8px 12px',borderRadius:4,border:'none',background:C.accent,color:'white',fontSize:12,fontWeight:600,cursor:'pointer',flexShrink:0}}>📋</button>
                </div>
              </div>
            )}
            {client?.plan === 'pro' && pacientes?.find(p=>p.id===parseInt(pacienteId))?.telefono && (
              <div style={{marginBottom:14}}>
                <label style={labelSt}>💬 WhatsApp</label>
                <div style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:2,padding:'9px 12px',fontSize:13,color:C.muted}}>{pacientes.find(p=>p.id===parseInt(pacienteId)).telefono}</div>
              </div>
            )}
            <div style={{display:'flex',gap:8,justifyContent:'flex-end',flexWrap:'wrap'}}>
              <button onClick={()=>setShowEnviar(false)} style={{padding:'8px 14px',borderRadius:4,border:`1px solid ${C.border}`,background:'transparent',color:C.muted,fontSize:12,cursor:'pointer'}}>Cancelar</button>
              {client?.plan === 'pro' && pacientes?.find(p=>p.id===parseInt(pacienteId))?.telefono && (
                <button onClick={async()=>{
                  setEnviando(true);
                  await guardar(false);
                  const pac = pacientes.find(p=>p.id===parseInt(pacienteId));
                  const link = propActual?.uuid ? `https://api.edgecrm.net/tratamiento/${propActual.uuid}` : '';
                  const msg = `Hola ${pac?.nombre?.split(' ')[0]||''}! Te enviamos tu propuesta de honorarios${contenidoGenerado?.titulo?`: *${contenidoGenerado.titulo}*`:''}.\n\n${link?`Podés verla completa acá:\n${link}\n\n`:''}Ante cualquier consulta escribinos.`;
                  await fetch(`${API}/api/enviar-mensaje`, {method:'POST',headers:jH(),body:JSON.stringify({telefono:pac.telefono,texto:msg,cliente_id:client.id})});
                  setShowEnviar(false); setEnviando(false);
                }} disabled={enviando} style={{padding:'8px 14px',borderRadius:4,border:'none',background:'#25d366',color:'white',fontSize:12,fontWeight:600,cursor:'pointer'}}>
                  {enviando?'Enviando...':'💬 WhatsApp'}
                </button>
              )}
              <button onClick={enviarEmail} disabled={!emailEnvio.trim()||enviando}
                style={{padding:'8px 14px',borderRadius:4,border:'none',background:'#0891b2',color:'white',fontSize:12,fontWeight:600,cursor:'pointer'}}>
                {enviando?'Enviando...':'📧 Enviar email'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Layout 2 columnas */}
      <div style={{display:'grid',gridTemplateColumns:'3fr 2fr',gap:20,alignItems:'start'}}>

        {/* COL IZQUIERDA: 4 bloques acordeón */}
        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,overflow:'hidden'}}>

          {/* ▼ BLOQUE 1: Datos del cliente */}
          <AccordionHeader idx={0} label="Bloque 1 · Datos del cliente" />
          {abiertos[0] && (
            <div style={bloqueBodySt}>
              <div style={fieldSt}>
                <label style={labelSt}>Cliente existente</label>
                <select value={pacienteId} onChange={e=>{
                  setPacienteId(e.target.value);
                  const pac = pacientes?.find(p=>p.id===parseInt(e.target.value));
                  if (pac) {
                    const parts = (pac.nombre||'').split(' ');
                    setB1Nombre(parts[0]||''); setB1Apellido(parts.slice(1).join(' ')||'');
                    setB1Tel(pac.telefono||''); setB1Email(pac.email||'');
                  }
                }} style={inputSt}>
                  <option value="">Sin cliente asignado</option>
                  {(pacientes||[]).map(p=><option key={p.id} value={p.id}>{p.nombre||p.telefono}</option>)}
                </select>
              </div>
              <div style={fieldSt}>
                <label style={labelSt}>Tipo de persona</label>
                <div style={{display:'flex',gap:20}}>
                  {[['humana','Persona humana'],['juridica','Persona jurídica']].map(([val,lbl])=>(
                    <label key={val} style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',fontSize:13}}>
                      <input type="radio" checked={tipoPersona===val} onChange={()=>setTipoPersona(val)} style={{accentColor:C.accent}}/>
                      {lbl}
                    </label>
                  ))}
                </div>
              </div>
              {tipoPersona==='humana' ? (
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                  <div style={fieldSt}><label style={labelSt}>Nombre</label><input value={b1Nombre} onChange={e=>setB1Nombre(e.target.value)} style={inputSt}/></div>
                  <div style={fieldSt}><label style={labelSt}>Apellido</label><input value={b1Apellido} onChange={e=>setB1Apellido(e.target.value)} style={inputSt}/></div>
                  <div style={fieldSt}><label style={labelSt}>DNI</label><input value={b1Dni} onChange={e=>setB1Dni(e.target.value)} style={inputSt}/></div>
                  <div style={fieldSt}><label style={labelSt}>Email</label><input value={b1Email} onChange={e=>setB1Email(e.target.value)} style={inputSt}/></div>
                </div>
              ) : (
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                  <div style={{...fieldSt,gridColumn:'1/-1'}}><label style={labelSt}>Razón social</label><input value={b1RazonSocial} onChange={e=>setB1RazonSocial(e.target.value)} style={inputSt}/></div>
                  <div style={fieldSt}><label style={labelSt}>CUIT</label><input value={b1Cuit} onChange={e=>setB1Cuit(e.target.value)} style={inputSt}/></div>
                  <div style={fieldSt}><label style={labelSt}>Representante legal</label><input value={b1Representante} onChange={e=>setB1Representante(e.target.value)} style={inputSt}/></div>
                  <div style={fieldSt}><label style={labelSt}>Email</label><input value={b1Email} onChange={e=>setB1Email(e.target.value)} style={inputSt}/></div>
                </div>
              )}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                <div style={fieldSt}><label style={labelSt}>Teléfono</label><input value={b1Tel} onChange={e=>setB1Tel(e.target.value)} style={inputSt}/></div>
                <div style={fieldSt}><label style={labelSt}>Calle</label><input value={b1Calle} onChange={e=>setB1Calle(e.target.value)} placeholder="Av. Corrientes" style={inputSt}/></div>
                <div style={fieldSt}><label style={labelSt}>Número</label><input value={b1Numero} onChange={e=>setB1Numero(e.target.value)} style={inputSt}/></div>
                <div style={fieldSt}><label style={labelSt}>Piso / Depto <span style={{color:C.muted,fontWeight:400,textTransform:'none'}}>(opcional)</span></label><input value={b1Piso} onChange={e=>setB1Piso(e.target.value)} placeholder="Ej: 3° B" style={inputSt}/></div>
                <div style={fieldSt}><label style={labelSt}>Ciudad</label><input value={b1Ciudad} onChange={e=>setB1Ciudad(e.target.value)} style={inputSt}/></div>
                <div style={fieldSt}>
                  <label style={labelSt}>Provincia</label>
                  <select value={b1Provincia} onChange={e=>setB1Provincia(e.target.value)} style={inputSt}>
                    <option value="">Seleccionar...</option>
                    {PROVINCIAS_AR.map(p=><option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div style={fieldSt}><label style={labelSt}>Código postal</label><input value={b1Cp} onChange={e=>setB1Cp(e.target.value)} style={inputSt}/></div>
              </div>
              <div style={fieldSt}><label style={labelSt}>Domicilio constituido (opcional)</label><input value={b1DomConst} onChange={e=>setB1DomConst(e.target.value)} placeholder="Si difiere del domicilio real..." style={inputSt}/></div>
            </div>
          )}

          {/* ▼ BLOQUE 2: Información del servicio legal */}
          <AccordionHeader idx={1} label="Bloque 2 · Servicio legal" />
          {abiertos[1] && (
            <div style={bloqueBodySt}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                <div style={fieldSt}>
                  <label style={labelSt}>Fuero / Materia</label>
                  <select value={b2Fuero} onChange={e=>{setB2Fuero(e.target.value); setB2Servicio('');}} style={inputSt}>
                    <option value="">Seleccionar...</option>
                    {FUEROS_JURIDICOS.map(f=><option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div style={fieldSt}>
                  <label style={labelSt}>Tipo de servicio</label>
                  <select value={b2Servicio} onChange={e=>setB2Servicio(e.target.value)} style={inputSt} disabled={!b2Fuero}>
                    <option value="">Seleccionar...</option>
                    {(SERVICIOS_POR_FUERO[b2Fuero]||[]).map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div style={fieldSt}>
                  <label style={labelSt}>Jurisdicción</label>
                  <select value={b2Jurisdiccion} onChange={e=>setB2Jurisdiccion(e.target.value)} style={inputSt}>
                    <option value="">Seleccionar...</option>
                    {['CABA','Provincia','Federal'].map(j=><option key={j} value={j}>{j}</option>)}
                  </select>
                </div>
                <div style={fieldSt}>
                  <label style={labelSt}>Urgencia</label>
                  <select value={b2Urgencia} onChange={e=>setB2Urgencia(e.target.value)} style={inputSt}>
                    {['Normal','Alta','Crítica'].map(u=><option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div style={fieldSt}>
                <label style={labelSt}>Descripción del caso</label>
                <textarea value={b2Descripcion} onChange={e=>setB2Descripcion(e.target.value)} rows={3} style={{...inputSt,resize:'vertical',lineHeight:1.5}}/>
              </div>
              <div style={fieldSt}>
                <label style={labelSt}>Objetivo del cliente</label>
                <textarea value={b2Objetivo} onChange={e=>setB2Objetivo(e.target.value)} rows={2} style={{...inputSt,resize:'vertical',lineHeight:1.5}}/>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                <div style={fieldSt}>
                  <label style={labelSt}>Alcance — qué incluye</label>
                  {b2Incluye.map((item,i)=>(
                    <div key={i} style={{display:'flex',gap:6,marginBottom:6}}>
                      <input value={item} onChange={e=>setB2Incluye(prev=>{const n=[...prev];n[i]=e.target.value;return n;})} style={{...inputSt,flex:1}}/>
                      {b2Incluye.length>1&&<button onClick={()=>setB2Incluye(prev=>prev.filter((_,j)=>j!==i))} style={{padding:'4px 8px',borderRadius:4,border:`1px solid ${C.border}`,background:'transparent',color:C.muted,cursor:'pointer',fontSize:12}}>×</button>}
                    </div>
                  ))}
                  <button onClick={()=>setB2Incluye(prev=>[...prev,''])} style={{fontSize:11,color:C.accent,background:'transparent',border:'none',cursor:'pointer',padding:0}}>+ Agregar</button>
                </div>
                <div style={fieldSt}>
                  <label style={labelSt}>Alcance — no incluye</label>
                  {b2NoIncluye.map((item,i)=>(
                    <div key={i} style={{display:'flex',gap:6,marginBottom:6}}>
                      <input value={item} onChange={e=>setB2NoIncluye(prev=>{const n=[...prev];n[i]=e.target.value;return n;})} style={{...inputSt,flex:1}}/>
                      {b2NoIncluye.length>1&&<button onClick={()=>setB2NoIncluye(prev=>prev.filter((_,j)=>j!==i))} style={{padding:'4px 8px',borderRadius:4,border:`1px solid ${C.border}`,background:'transparent',color:C.muted,cursor:'pointer',fontSize:12}}>×</button>}
                    </div>
                  ))}
                  <button onClick={()=>setB2NoIncluye(prev=>[...prev,''])} style={{fontSize:11,color:C.accent,background:'transparent',border:'none',cursor:'pointer',padding:0}}>+ Agregar</button>
                </div>
              </div>
              <div style={fieldSt}><label style={labelSt}>Contraparte (opcional)</label><input value={b2Contraparte} onChange={e=>setB2Contraparte(e.target.value)} placeholder="Nombre de la contraparte..." style={inputSt}/></div>
            </div>
          )}

          {/* ▼ BLOQUE 3: Honorarios */}
          <AccordionHeader idx={2} label="Bloque 3 · Honorarios" />
          {abiertos[2] && (
            <div style={bloqueBodySt}>
              <div style={fieldSt}>
                <label style={labelSt}>Modalidad de honorarios</label>
                <div style={{display:'flex',flexWrap:'wrap',gap:12}}>
                  {[['fijo','Honorarios fijos'],['etapa','Por etapa procesal'],['hora','Por hora'],['cuota_litis','Cuota litis'],['mixto','Mixto']].map(([val,lbl])=>(
                    <label key={val} style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',fontSize:12}}>
                      <input type="radio" checked={b3Modalidad===val} onChange={()=>setB3Modalidad(val)} style={{accentColor:C.accent}}/>{lbl}
                    </label>
                  ))}
                </div>
              </div>
              {b3Modalidad==='fijo' && (
                <div>
                  <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:10}}>
                    <div style={fieldSt}><label style={labelSt}>Valor</label><input value={b3Valor} onChange={e=>setB3Valor(e.target.value)} placeholder="500.000" style={inputSt}/></div>
                    <div style={fieldSt}><label style={labelSt}>Moneda</label>
                      <select value={b3Moneda} onChange={e=>setB3Moneda(e.target.value)} style={inputSt}>
                        {['ARS','USD','UVA','JUL'].map(m=><option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                  </div>
                  {cotizacion && (b3Moneda==='USD'||b3Moneda==='UVA'||b3Moneda==='JUL') && (
                    <div style={{display:'inline-flex',alignItems:'center',gap:8,background:C.accentGlow,border:`1px solid ${C.accent}33`,borderRadius:2,padding:'4px 12px',fontSize:11,color:C.text,marginBottom:8}}>
                      <span style={{color:C.accent,fontWeight:600}}>●</span>
                      <span>USD blue <strong>${cotizacion.blue?.toLocaleString('es-AR')}</strong></span>
                      <span style={{color:C.muted}}>·</span>
                      <span>USD oficial <strong>${cotizacion.oficial?.toLocaleString('es-AR')}</strong></span>
                      <span style={{color:C.muted}}>·</span>
                      <span style={{color:C.muted}}>act. {cotizacion.fecha}</span>
                    </div>
                  )}
                </div>
              )}
              {b3Modalidad==='hora' && (
                <div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
                    <div style={fieldSt}><label style={labelSt}>Valor / hora</label><input value={b3ValorHora} onChange={e=>setB3ValorHora(e.target.value)} style={inputSt}/></div>
                    <div style={fieldSt}><label style={labelSt}>Horas estimadas</label><input value={b3Horas} onChange={e=>setB3Horas(e.target.value)} style={inputSt}/></div>
                    <div style={fieldSt}><label style={labelSt}>Moneda</label>
                      <select value={b3Moneda} onChange={e=>setB3Moneda(e.target.value)} style={inputSt}>
                        {['ARS','USD','JUL'].map(m=><option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                  </div>
                  {cotizacion && b3Moneda==='USD' && (
                    <div style={{display:'inline-flex',alignItems:'center',gap:8,background:C.accentGlow,border:`1px solid ${C.accent}33`,borderRadius:2,padding:'4px 12px',fontSize:11,color:C.text,marginBottom:8}}>
                      <span style={{color:C.accent,fontWeight:600}}>●</span>
                      <span>USD blue <strong>${cotizacion.blue?.toLocaleString('es-AR')}</strong></span>
                      <span style={{color:C.muted}}>·</span>
                      <span>USD oficial <strong>${cotizacion.oficial?.toLocaleString('es-AR')}</strong></span>
                      <span style={{color:C.muted}}>·</span>
                      <span style={{color:C.muted}}>act. {cotizacion.fecha}</span>
                    </div>
                  )}
                </div>
              )}
              {b3Modalidad==='cuota_litis' && (
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                  <div style={fieldSt}><label style={labelSt}>% sobre cobro</label><input value={b3CuotaLitisPct} onChange={e=>setB3CuotaLitisPct(e.target.value)} placeholder="20" style={inputSt}/></div>
                  <div style={fieldSt}><label style={labelSt}>Anticipo (opcional)</label><input value={b3Anticipo} onChange={e=>setB3Anticipo(e.target.value)} style={inputSt}/></div>
                </div>
              )}
              {b3Modalidad==='mixto' && (
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                  <div style={fieldSt}><label style={labelSt}>Anticipo fijo</label><input value={b3Anticipo} onChange={e=>setB3Anticipo(e.target.value)} style={inputSt}/></div>
                  <div style={fieldSt}><label style={labelSt}>% sobre éxito</label><input value={b3CuotaLitisPct} onChange={e=>setB3CuotaLitisPct(e.target.value)} placeholder="15" style={inputSt}/></div>
                </div>
              )}
              {b3Modalidad==='etapa' && (
                <div style={fieldSt}>
                  <label style={labelSt}>Etapas procesales</label>
                  {b3Etapas.map((et,i)=>(
                    <div key={i} style={{display:'flex',gap:8,marginBottom:8}}>
                      <input value={et.nombre} onChange={e=>setB3Etapas(prev=>{const n=[...prev];n[i]={...n[i],nombre:e.target.value};return n;})} placeholder="Ej: Mediación" style={{...inputSt,flex:2}}/>
                      <input value={et.valor} onChange={e=>setB3Etapas(prev=>{const n=[...prev];n[i]={...n[i],valor:e.target.value};return n;})} placeholder="$" style={{...inputSt,flex:1}}/>
                      {b3Etapas.length>1&&<button onClick={()=>setB3Etapas(prev=>prev.filter((_,j)=>j!==i))} style={{padding:'4px 8px',borderRadius:4,border:`1px solid ${C.border}`,background:'transparent',color:C.muted,cursor:'pointer',fontSize:12}}>×</button>}
                    </div>
                  ))}
                  <button onClick={()=>setB3Etapas(prev=>[...prev,{nombre:'',valor:''}])} style={{fontSize:11,color:C.accent,background:'transparent',border:'none',cursor:'pointer',padding:0}}>+ Agregar etapa</button>
                </div>
              )}
              <div style={fieldSt}>
                <label style={labelSt}>Forma de pago</label>
                <div style={{display:'flex',flexWrap:'wrap',gap:12}}>
                  {['Efectivo','Transferencia','Tarjeta','Cheque'].map(fp=>(
                    <label key={fp} style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',fontSize:12}}>
                      <input type="checkbox" checked={b3FormaPago.includes(fp)} onChange={e=>setB3FormaPago(prev=>e.target.checked?[...prev,fp]:prev.filter(x=>x!==fp))} style={{accentColor:C.accent}}/>{fp}
                    </label>
                  ))}
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                <div style={fieldSt}><label style={labelSt}>Cuotas / plazos</label><input value={b3Cuotas} onChange={e=>setB3Cuotas(e.target.value)} placeholder="Ej: 3 cuotas mensuales" style={inputSt}/></div>
                <div style={fieldSt}><label style={labelSt}>Validez de la oferta (días)</label><input value={b3Validez} onChange={e=>setB3Validez(e.target.value)} style={inputSt}/></div>
              </div>
              <div style={fieldSt}>
                <label style={labelSt}>Gastos no incluidos</label>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginBottom:10,background:C.bg,borderRadius:2,padding:'10px 12px',border:`1px solid ${C.border}`}}>
                  {GASTOS_PREDEFINIDOS.map(g=>(
                    <label key={g} style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',fontSize:12,padding:'2px 0'}}>
                      <input type="checkbox" checked={b3GastosNoInc.includes(g)}
                        onChange={e=>setB3GastosNoInc(prev=>e.target.checked?[...prev,g]:prev.filter(x=>x!==g))}
                        style={{accentColor:C.accent,flexShrink:0}}/>
                      {g}
                    </label>
                  ))}
                </div>
                {b3GastosNoInc.filter(g=>!GASTOS_PREDEFINIDOS.includes(g)).map((g,i)=>(
                  <div key={g} style={{display:'flex',gap:6,marginBottom:6}}>
                    <input value={g} readOnly style={{...inputSt,flex:1,color:C.muted}}/>
                    <button onClick={()=>setB3GastosNoInc(prev=>prev.filter(x=>x!==g))} style={{padding:'4px 8px',borderRadius:4,border:`1px solid ${C.border}`,background:'transparent',color:C.muted,cursor:'pointer',fontSize:12}}>×</button>
                  </div>
                ))}
                <div style={{display:'flex',gap:8,marginTop:4}}>
                  <input value={b3GastoCustom} onChange={e=>setB3GastoCustom(e.target.value)}
                    onKeyDown={e=>{if(e.key==='Enter'&&b3GastoCustom.trim()){setB3GastosNoInc(prev=>[...prev,b3GastoCustom.trim()]);setB3GastoCustom('');}}}
                    placeholder="Agregar gasto personalizado..." style={{...inputSt,flex:1}}/>
                  <button onClick={()=>{if(b3GastoCustom.trim()){setB3GastosNoInc(prev=>[...prev,b3GastoCustom.trim()]);setB3GastoCustom('');}}}
                    style={{padding:'8px 14px',borderRadius:4,border:'none',background:C.accent,color:'white',fontSize:12,fontWeight:600,cursor:'pointer',flexShrink:0}}>+</button>
                </div>
              </div>
              <div style={fieldSt}><label style={labelSt}>Condiciones adicionales</label><textarea value={b3Condiciones} onChange={e=>setB3Condiciones(e.target.value)} rows={2} style={{...inputSt,resize:'vertical',lineHeight:1.5}}/></div>
            </div>
          )}

          {/* ▼ BLOQUE 4: Información en crudo */}
          <AccordionHeader idx={3} label="Bloque 4 · Información en crudo" />
          {abiertos[3] && (
            <div style={{padding:'16px'}}>
              <div style={{background:`${C.accent}10`,border:`1px solid ${C.accent}25`,borderRadius:4,padding:'10px 12px',marginBottom:12,fontSize:12,color:C.muted,lineHeight:1.5}}>
                💡 <strong style={{color:C.text}}>Dos formas de generar:</strong> completá los bloques 1–3 y hacé clic en <strong style={{color:C.accent}}>✨ Generar IA</strong> arriba, o escribí toda la info acá abajo y usá <strong style={{color:'#8b5cf6'}}>Autocompletar</strong>.
              </div>
              <div style={{display:'flex',gap:8,marginBottom:10}}>
                <button onClick={()=>{const compilado = compilarInfoCruda(); if(compilado.trim()) setInfoCruda(compilado);}}
                  style={{flex:1,padding:'8px',borderRadius:4,border:`1px solid ${C.border}`,background:'transparent',color:C.text,fontSize:12,fontWeight:600,cursor:'pointer'}}>
                  📋 Compilar datos del formulario
                </button>
              </div>
              <div style={fieldSt}>
                <label style={labelSt}>Texto libre (opcional si ya completaste los bloques)</label>
                <textarea value={infoCruda} onChange={e=>setInfoCruda(e.target.value)}
                  placeholder={"Podés escribir acá información adicional o todo el caso desde cero:\n\nNombre, apellido, DNI/CUIT, provincia, ciudad, código postal, detalles del servicio, fuero, valor de honorarios, plazos de pago, objetivo del trabajo..."}
                  rows={7} style={{...inputSt,resize:'vertical',lineHeight:1.6}}/>
              </div>
              <button onClick={autocompletar} disabled={autocompletando||!infoCruda.trim()}
                style={{width:'100%',padding:'10px',borderRadius:4,border:'none',background:autocompletando?'#374151':'#8b5cf6',color:'white',fontSize:13,fontWeight:600,cursor:'pointer'}}>
                {autocompletando?'✨ Autocompletando formulario...':'✨ Autocompletar bloques 1–3 desde el texto'}
              </button>
            </div>
          )}

          {/* Chat IA: respuestas conversacionales + edición */}
          {(historialChat.length > 0 || contenidoGenerado) && (
            <div style={{padding:'16px',borderTop:`1px solid ${C.border}`}}>
              {/* Mensajes del historial */}
              {historialChat.length > 0 && (
                <div style={{marginBottom:12,maxHeight:200,overflowY:'auto',display:'flex',flexDirection:'column',gap:8}}>
                  {historialChat.filter(m=>m.role==='assistant').map((m,i)=>(
                    <div key={i} style={{background:`${C.accent}15`,border:`1px solid ${C.accent}30`,borderRadius:4,padding:'10px 12px',fontSize:12,color:C.text,lineHeight:1.5}}>
                      <span style={{fontSize:10,color:C.accent,fontWeight:700,display:'block',marginBottom:4}}>✨ IA</span>
                      {m.content}
                    </div>
                  ))}
                </div>
              )}
              <div style={{fontSize:12,fontWeight:600,color:C.muted,marginBottom:8,textTransform:'uppercase',letterSpacing:'.7px'}}>
                {contenidoGenerado ? 'Editar con IA' : 'Responder a la IA'}
              </div>
              <textarea value={mensajeEdicion} onChange={e=>setMensajeEdicion(e.target.value)}
                placeholder={contenidoGenerado
                  ? '"Cambiá el precio a $350.000", "Hacelo más formal", "Agregá cláusula de confidencialidad"'
                  : 'Respondé la pregunta de la IA para continuar generando el presupuesto...'}
                rows={3} style={{...inputSt,resize:'vertical',lineHeight:1.5}}/>
              <button onClick={()=>generarPropuesta(true)} disabled={generando||!mensajeEdicion.trim()}
                style={{width:'100%',marginTop:8,padding:'9px',borderRadius:4,border:'none',background:generando?'#374151':'#8b5cf6',color:'white',fontSize:13,fontWeight:600,cursor:'pointer'}}>
                {generando?'Procesando...':contenidoGenerado?'💬 Aplicar cambio con IA':'💬 Enviar respuesta a la IA'}
              </button>
            </div>
          )}
        </div>

        {/* COL DERECHA: Selector de plantilla + Preview */}
        <div style={{position:'sticky',top:20}}>
          {plantillas.length > 0 && (
            <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:'12px 16px',marginBottom:12}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                <span style={{fontSize:11,fontWeight:700,letterSpacing:'.7px',textTransform:'uppercase',color:C.muted,flex:1}}>Plantilla</span>
                <button onClick={()=>setVista('plantillas')} style={{fontSize:11,color:C.accent,background:'transparent',border:'none',cursor:'pointer',padding:0}}>📐 Gestionar</button>
              </div>
              <select value={selectedPlantillaId} onChange={e=>aplicarPlantilla(e.target.value)} style={inputSt}>
                <option value="">Estándar (sin plantilla)</option>
                {plantillas.map(p=><option key={p.id} value={p.id}>{p.nombre_plantilla||p.titulo}</option>)}
              </select>
            </div>
          )}
          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,overflow:'hidden'}}>
            <div style={{padding:'10px 16px',borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',gap:8}}>
              <span style={{fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'.7px',color:C.muted,flex:1}}>Preview en vivo</span>
              {contenidoGenerado && <span style={{fontSize:10,color:C.green}}>● Actualizado</span>}
            </div>
            {contenidoGenerado ? (
              <PropuestaPreviewIframe contenido={contenidoGenerado} cliente={client} propActual={propActual} previewTick={previewTick}/>
            ) : (
              <div style={{padding:40,textAlign:'center',color:C.muted}}>
                <div style={{fontSize:32,marginBottom:12}}>⚖️</div>
                <div style={{fontSize:13,marginBottom:6}}>Completá el formulario y generá</div>
                <div style={{fontSize:11}}>la propuesta con IA para ver el preview</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // ── VISTA: Plantillas ─────────────────────────────────────────────────────
  if (vista === 'plantillas') return (
    <div>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
        <button onClick={()=>setVista('lista')} style={{padding:'6px 12px',borderRadius:4,border:`1px solid ${C.border}`,background:'transparent',color:C.muted,fontSize:12,cursor:'pointer'}}>← Volver</button>
        <div>
          <div style={{fontSize:16,fontWeight:700}}>📐 Plantillas de honorarios</div>
          <div style={{fontSize:12,color:C.muted}}>Modelos reutilizables para el estudio</div>
        </div>
        <button onClick={()=>nueva()} style={{marginLeft:'auto',padding:'8px 16px',borderRadius:4,border:'none',background:C.accent,color:'white',fontSize:12,fontWeight:600,cursor:'pointer'}}>+ Nueva plantilla</button>
      </div>
      {plantillas.length === 0 ? (
        <div style={{textAlign:'center',padding:60,color:C.muted}}>
          <div style={{fontSize:36,marginBottom:12}}>📐</div>
          <div style={{fontWeight:600,marginBottom:6}}>No hay plantillas guardadas</div>
          <div style={{fontSize:11,marginBottom:20}}>Creá un presupuesto y guardalo como plantilla para reutilizarlo</div>
          <button onClick={()=>nueva()} style={{padding:'9px 18px',borderRadius:4,border:'none',background:C.accent,color:'white',fontSize:13,fontWeight:600,cursor:'pointer'}}>Crear primera plantilla</button>
        </div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {plantillas.map(p=>(
            <div key={p.id} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:'14px 16px',display:'flex',alignItems:'center',gap:12}}>
              <div style={{width:36,height:36,borderRadius:4,background:C.accentGlow,border:`1px solid ${C.accent}44`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>📐</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:600,color:C.text,marginBottom:2}}>{p.nombre_plantilla||p.titulo||'Sin nombre'}</div>
                <div style={{fontSize:11,color:C.muted}}>{new Date(p.actualizado_en).toLocaleDateString('es-AR',{day:'numeric',month:'short',year:'numeric'})}</div>
              </div>
              <div style={{display:'flex',gap:6,flexShrink:0}}>
                <button onClick={()=>nueva(p)} style={{padding:'5px 14px',borderRadius:4,border:'none',background:C.accent,color:'white',fontSize:11,fontWeight:600,cursor:'pointer'}}>Usar</button>
                <button onClick={()=>abrirEditor(p)} style={{padding:'5px 12px',borderRadius:4,border:`1px solid ${C.border}`,background:'transparent',color:C.muted,fontSize:11,cursor:'pointer'}}>✏️ Editar</button>
                <button onClick={()=>eliminar(p.id)} style={{padding:'5px 12px',borderRadius:4,border:'1px solid rgba(239,68,68,0.3)',background:'transparent',color:'#f87171',fontSize:11,cursor:'pointer'}}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ── VISTA: Lista de presupuestos ──────────────────────────────────────────
  return (
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20,flexWrap:'wrap',gap:10}}>
        <div>
          <div style={{fontSize:16,fontWeight:700,marginBottom:2}}>⚖️ Honorarios</div>
          <div style={{fontSize:12,color:C.muted}}>Presupuestos de honorarios profesionales</div>
        </div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          {plantillas.length>0&&<button onClick={()=>setVista('plantillas')} style={{padding:'8px 14px',borderRadius:4,border:`1px solid ${C.border}`,background:'transparent',color:C.muted,fontSize:12,cursor:'pointer'}}>📐 Plantillas ({plantillas.length})</button>}
          <button onClick={()=>nueva()} style={{padding:'9px 18px',borderRadius:4,border:'none',background:C.accent,color:'white',fontSize:13,fontWeight:600,cursor:'pointer'}}>+ Nuevo presupuesto</button>
        </div>
      </div>

      {notificaciones.filter(n=>n.referencia_tipo==='propuesta').map(n=>(
        <div key={n.id} style={{background:'rgba(16,185,129,0.08)',border:'1px solid rgba(16,185,129,0.25)',borderRadius:4,padding:'12px 16px',marginBottom:12,display:'flex',alignItems:'center',gap:12}}>
          <span style={{fontSize:16}}>📄</span>
          <div style={{flex:1}}>
            <div style={{fontSize:12,fontWeight:600,color:'#10b981'}}>{n.titulo}</div>
            <div style={{fontSize:11,color:C.muted}}>{n.descripcion}</div>
          </div>
          <button onClick={()=>{const prop=propuestas.find(p=>p.id===n.referencia_id);if(prop)abrirEditor(prop);onLeerNotificacion?.(n.id);}}
            style={{padding:'5px 12px',borderRadius:4,border:'none',background:'#10b981',color:'white',fontSize:11,fontWeight:600,cursor:'pointer',flexShrink:0}}>Ver presupuesto</button>
          <button onClick={()=>onLeerNotificacion?.(n.id)}
            style={{padding:'5px 8px',borderRadius:4,border:`1px solid ${C.border}`,background:'transparent',color:C.muted,fontSize:11,cursor:'pointer'}}>×</button>
        </div>
      ))}

      {cargando ? <div style={{textAlign:'center',padding:40,color:C.muted}}>Cargando...</div> : (
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {propuestas.map(p=>(
            <div key={p.id} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:'14px 16px',display:'flex',alignItems:'center',gap:12}}>
              <div style={{width:36,height:36,borderRadius:4,background:C.accentGlow,border:`1px solid ${C.accent}44`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>⚖️</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:600,color:C.text,marginBottom:2}}>{p.titulo||'Sin título'}</div>
                <div style={{fontSize:11,color:C.muted}}>
                  {p.paciente_nombre&&<span>{p.paciente_nombre} · </span>}
                  {p.estado==='enviada'?<span style={{color:'#10b981'}}>✅ Enviado</span>:<span>Borrador</span>}
                  {' · '}{new Date(p.actualizado_en).toLocaleDateString('es-AR',{day:'numeric',month:'short'})}
                </div>
              </div>
              <div style={{display:'flex',gap:6,flexShrink:0}}>
                <button onClick={()=>abrirEditor(p)} style={{padding:'5px 12px',borderRadius:4,border:`1px solid ${C.border}`,background:'transparent',color:C.muted,fontSize:11,cursor:'pointer'}}>✏️ Editar</button>
                <button onClick={()=>eliminar(p.id)} style={{padding:'5px 12px',borderRadius:4,border:'1px solid rgba(239,68,68,0.3)',background:'transparent',color:'#f87171',fontSize:11,cursor:'pointer'}}>🗑️</button>
              </div>
            </div>
          ))}
          {propuestas.length===0&&(
            <div style={{textAlign:'center',padding:60,color:C.muted,fontSize:13}}>
              <div style={{fontSize:36,marginBottom:12}}>⚖️</div>
              <div style={{fontWeight:600,marginBottom:6}}>No hay presupuestos aún</div>
              <div style={{fontSize:11}}>Creá el primer presupuesto de honorarios profesionales</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PropuestaPreviewIframe({ contenido, cliente, propActual, previewTick=0 }) {
  const iframeRef = React.useRef(null);
  React.useEffect(() => {
    if (!contenido || !iframeRef.current) return;
    const fetchHtml = async () => {
      try {
        const r = await fetch(`${API}/api/propuestas/preview-html`, {
          method:'POST', headers:{'Content-Type':'application/json',...aH()},
          body: JSON.stringify({ contenido, cliente_nombre: cliente?.nombre, logo_url: cliente?.logo_url, whatsapp_number: cliente?.whatsapp_number, titulo: propActual?.titulo })
        });
        if (r.ok) {
          const html = await r.text();
          const doc = iframeRef.current.contentDocument;
          doc.open(); doc.write(html); doc.close();
        }
      } catch {}
    };
    fetchHtml();
  }, [contenido, cliente, previewTick]);
  return <iframe ref={iframeRef} style={{width:"100%",minHeight:700,border:"none",borderRadius:2,background:"#FAF8F5"}} title="Preview propuesta"/>;
}

function PropuestaPreview({ contenido: c, cliente }) {
  const color = '#6366f1';
  return (
    <div style={{fontFamily:"'Helvetica Neue',Arial,sans-serif",background:"#fff",color:"#1a1a2e"}}>
      {/* Header */}
      <div style={{background:"linear-gradient(135deg,#0f0f1a 0%,#1a1a2e 100%)",padding:"32px 24px",textAlign:"center"}}>
        {cliente?.logo_url && <img src={cliente.logo_url} style={{height:40,objectFit:"contain",marginBottom:12,display:"block",margin:"0 auto 12px"}} alt="Logo"/>}
        <div style={{color:"#818cf8",fontSize:11,letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>{cliente?.nombre||'Skyward'}</div>
        <h1 style={{color:"#fff",fontSize:20,margin:"0 0 6px",fontWeight:700}}>{c.titulo||'Propuesta'}</h1>
        {c.subtitulo && <p style={{color:"#94a3b8",fontSize:13,margin:0}}>{c.subtitulo}</p>}
      </div>

      <div style={{padding:20,background:"#f8fafc"}}>
        {/* Diagnóstico */}
        {c.diagnostico && (
          <div style={{background:"#fff",borderRadius:4,padding:18,marginBottom:14,boxShadow:"0 1px 4px rgba(0,0,0,0.06)"}}>
            <div style={{color:color,fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>📋 Diagnóstico</div>
            <p style={{color:"#374151",lineHeight:1.6,margin:0,fontSize:13}}>{c.diagnostico}</p>
          </div>
        )}

        {/* Tratamientos */}
        {c.tratamientos?.length > 0 && (
          <div style={{background:"#fff",borderRadius:4,padding:18,marginBottom:14,boxShadow:"0 1px 4px rgba(0,0,0,0.06)"}}>
            <div style={{color:color,fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:12}}>✨ Plan de tratamiento</div>
            {c.tratamientos.map((t,i) => {
              const area = detectarAreaAnatomica(t.nombre + ' ' + (t.area||''));
              const imgUrl = t.imagen_override || getAnatomicalImage(area, 'f');
              return (
              <div key={i} style={{border:"1px solid #e5e7eb",borderRadius:4,marginBottom:12,overflow:"hidden"}}>
                <div style={{position:"relative",height:180,overflow:"hidden",background:"#f8fafc"}}>
                  <img src={imgUrl} alt={t.area||t.nombre} style={{width:"100%",height:"100%",objectFit:"cover",objectPosition:"top"}}/>
                  <div style={{position:"absolute",inset:0,background:`linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%)`}}/>
                  <div style={{position:"absolute",bottom:12,left:14,right:14}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontSize:20}}>{t.icono||'💉'}</span>
                      <div style={{fontWeight:700,color:"white",fontSize:14}}>{t.nombre}</div>
                    </div>
                    {t.area && <div style={{fontSize:11,color:"rgba(255,255,255,0.7)",marginTop:2}}>{t.area}</div>}
                  </div>
                </div>
                <div style={{padding:"12px 14px"}}>
                  <p style={{color:"#374151",fontSize:12,margin:"0 0 10px",lineHeight:1.6}}>{t.descripcion}</p>
                  {t.sesiones && <span style={{background:"#ede9fe",color:color,padding:"3px 12px",borderRadius:2,fontSize:11,fontWeight:600}}>{t.sesiones} sesiones{t.frecuencia?` · ${t.frecuencia}`:''}</span>}
                </div>
              </div>
              );
            })}
          </div>
        )}

        {/* Resultados */}
        {c.resultados_esperados && (
          <div style={{background:"linear-gradient(135deg,#ede9fe,#ddd6fe)",borderRadius:4,padding:18,marginBottom:14}}>
            <div style={{color:color,fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>🎯 Resultados esperados</div>
            <p style={{color:"#374151",lineHeight:1.6,margin:"0 0 12px",fontSize:13}}>{c.resultados_esperados}</p>
            {c.progreso_porcentaje && (
              <>
                <div style={{background:"rgba(255,255,255,0.6)",borderRadius:2,height:8,overflow:"hidden"}}>
                  <div style={{background:color,height:"100%",width:`${c.progreso_porcentaje}%`,borderRadius:4}}/>
                </div>
                <div style={{textAlign:"right",fontSize:11,color:color,fontWeight:600,marginTop:4}}>{c.progreso_porcentaje}% mejora esperada</div>
              </>
            )}
          </div>
        )}

        {/* Timeline */}
        {c.timeline?.length > 0 && (
          <div style={{background:"#fff",borderRadius:4,padding:18,marginBottom:14,boxShadow:"0 1px 4px rgba(0,0,0,0.06)"}}>
            <div style={{color:color,fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:14}}>📅 Plan de acción</div>
            {c.timeline.map((f,i) => (
              <div key={i} style={{display:"flex",gap:12,marginBottom:14}}>
                <div style={{width:28,height:28,borderRadius:"50%",background:color,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:12,flexShrink:0}}>{i+1}</div>
                <div>
                  <div style={{fontWeight:600,color:"#111827",fontSize:13}}>{f.fase} <span style={{fontSize:11,color:"#9ca3af",fontWeight:400}}>{f.semana||''}</span></div>
                  <div style={{fontSize:12,color:"#6b7280",marginTop:2}}>{f.descripcion}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Precio */}
        {c.precio && (
          <div style={{background:"#fff",borderRadius:4,padding:18,marginBottom:14,boxShadow:"0 1px 4px rgba(0,0,0,0.06)",textAlign:"center"}}>
            <div style={{color:color,fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>💰 Inversión</div>
            <div style={{fontSize:28,fontWeight:700,color:"#111827"}}>{c.precio}</div>
            {c.forma_pago && <div style={{fontSize:12,color:"#6b7280",marginTop:6}}>{c.forma_pago}</div>}
          </div>
        )}

        {/* Próximos pasos */}
        {c.proximos_pasos && (
          <div style={{background:"#0f172a",borderRadius:4,padding:18}}>
            <div style={{color:"#818cf8",fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>🚀 Próximos pasos</div>
            <p style={{color:"#e2e8f0",lineHeight:1.6,margin:0,fontSize:13}}>{c.proximos_pasos}</p>
          </div>
        )}
      </div>
    </div>
  );
}


function EdgePanel({ token, user, onLogout }) {
  React.useEffect(() => {
    if (document.getElementById('edge-push-style')) return;
    const st = document.createElement('style');
    st.id = 'edge-push-style';
    st.textContent = `
      @keyframes pushFlash {
        0%   { box-shadow: 0 0 0 0 rgba(34,197,94,0); border-color: inherit; }
        25%  { box-shadow: 0 0 0 10px rgba(34,197,94,0.5); border-color: #22c55e; }
        100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); border-color: inherit; }
      }
      .push-highlight { animation: pushFlash 2s ease-out forwards !important; border-color: #22c55e !important; }
    `;
    document.head.appendChild(st);
  }, []);
  const [view, setView] = useState(user?.rol === 'admin' ? "admin" : "client");
  const [selClient, setSelClient] = useState(null);
  const [pushActivo, setPushActivo] = useState(false);
  const [highlightPush, setHighlightPush] = useState(false);
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    navigator.serviceWorker.getRegistration().then(reg => {
      if (reg) reg.pushManager.getSubscription().then(sub => setPushActivo(!!sub));
    });
  }, []);
  const [selProspect, setSelProspect] = useState(null);
  const [activeTab, setActiveTab] = useState(["admin","dueno"].includes(user?.rango) ? "inicio" : "calendario");
  const [stats, setStats] = useState(null);
  const [clientes, setClientes] = useState([]);
  const [prospectos, setProspectos] = useState([]);
  const [mensajes, setMensajes] = useState([]);
  const [funnelData, setFunnelData] = useState([]);
  const [datosAgenda, setDatosAgenda] = useState(null);

  useEffect(() => {
    const handler = () => setActiveTab('honorarios');
    window.addEventListener('edge_goto_propuestas', handler);
    return () => window.removeEventListener('edge_goto_propuestas', handler);
  }, []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalUsr, setModalUsr] = useState(null);
  const [formUsr, setFormUsr] = useState({ nombre:"", email:"", password:"", rango:"staff" });
  const [savingUsr, setSavingUsr] = useState(false);
  const [errUsr, setErrUsr] = useState(null);
  const [okUsr, setOkUsr] = useState(false);
  const chatRef = useRef(null);

  const fetchAdmin = useCallback(async () => {
    try {
      const h = aH();
      const [s, c] = await Promise.all([
        fetch(`${API}/api/stats`, { headers:h }).then(r=>r.json()),
        fetch(`${API}/api/clientes`, { headers:h }).then(r=>r.json()),
      ]);
      setStats(s); setClientes(Array.isArray(c)?c:[]); setError(null);
    } catch { setError("No se pudo conectar"); }
    finally { setLoading(false); }
  }, []);

  // Ref para detectar cambios de listo_para_cierre y reproducir sonido
  const prospectosPrevRef = useRef({});

  const fetchProspectos = useCallback(async (cid) => {
    try {
      const h = aH();
      const p = await fetch(`${API}/api/prospectos?cliente_id=${cid}`, { headers:h }).then(r=>r.json());
      const lista = Array.isArray(p) ? p : [];
      lista.forEach(nuevo => {
        const prev = prospectosPrevRef.current[nuevo.id];
        if (nuevo.listo_para_cierre && prev && !prev.listo_para_cierre) {
          try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            [0, 0.25].forEach(delay => {
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.connect(gain); gain.connect(ctx.destination);
              osc.frequency.value = 880;
              osc.type = 'sine';
              gain.gain.setValueAtTime(0.3, ctx.currentTime + delay);
              gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.2);
              osc.start(ctx.currentTime + delay);
              osc.stop(ctx.currentTime + delay + 0.25);
            });
          } catch(e) {}
        }
      });
      const map = {};
      lista.forEach(p => { map[p.id] = { listo_para_cierre: p.listo_para_cierre, modo_humano: p.modo_humano }; });
      prospectosPrevRef.current = map;
      setProspectos(lista);
      setFunnelData([]);
    } catch {}
  }, []);

  const fetchMensajes = useCallback(async (pid, forzarScroll = false) => {
    try {
      const m = await fetch(`${API}/api/prospectos/${pid}/mensajes`, { headers:aH() }).then(r=>r.json());
      setMensajes(Array.isArray(m)?m:[]);
      setTimeout(() => {
        const el = chatRef.current;
        if (!el) return;
        const distanciaDelFondo = el.scrollHeight - el.scrollTop - el.clientHeight;
        if (forzarScroll || distanciaDelFondo < 120) {
          el.scrollTop = el.scrollHeight;
        }
      }, 150);
      // Si hay un mensaje nuevo, reproducir sonido y refrescar prospectos
      if (Array.isArray(m) && m.length > 0) {
        const ultimo = m[m.length - 1];
        const esReciente = Date.now() - new Date(ultimo.creado_en || 0).getTime() < 6000;
        if (esReciente) {
          // Sonido suave para mensaje nuevo del paciente
          if (ultimo.rol === 'user') {
            try {
              const ctx = new (window.AudioContext || window.webkitAudioContext)();
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.connect(gain); gain.connect(ctx.destination);
              osc.frequency.value = 660;
              osc.type = 'sine';
              gain.gain.setValueAtTime(0.15, ctx.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
              osc.start(ctx.currentTime);
              osc.stop(ctx.currentTime + 0.3);
            } catch(e) {}
          }
          // Refrescar prospectos si es mensaje del bot (puede haber cambiado estado)
          if (ultimo.rol === 'assistant') {
            setTimeout(() => { if (window._edgeRefreshProspectos) window._edgeRefreshProspectos(); }, 600);
          }
        }
      }
    } catch {}
  }, []);

  useEffect(() => { fetchAdmin(); }, [fetchAdmin]);
  useEffect(() => { const iv = setInterval(fetchAdmin, 10000); return () => clearInterval(iv); }, [fetchAdmin]);

  // Auto-seleccionar cliente para usuarios no-admin
  useEffect(() => {
    if (user?.rol !== 'admin' && user?.cliente_id && clientes.length > 0 && !selClient) {
      const miCliente = clientes.find(c => c.id === user.cliente_id);
      if (miCliente) { setSelClient(miCliente); setView("client"); }
    }
  }, [clientes, user, selClient]);

  // IDs de prospectos donde limpiamos el horario_elegido localmente
  // El polling no los sobrescribe hasta que la DB confirme el cambio
  const limpiadosRef = useRef(new Set());

  // Sincronizar selProspect con datos frescos sin resetear mensajes
  useEffect(() => {
    if (selProspect?.id && prospectos.length > 0) {
      const fresco = prospectos.find(p => p.id === selProspect.id);
      if (!fresco) return;

      // Si limpiamos este prospecto manualmente, verificar si la DB ya sincronizó
      if (limpiadosRef.current.has(selProspect.id)) {
        if (!fresco.horario_elegido && !fresco.listo_para_cierre) {
          // DB ya tiene el estado limpio — sacar del Set y sincronizar normalmente
          limpiadosRef.current.delete(selProspect.id);
        } else {
          // DB todavía tiene datos viejos — no sobrescribir el estado local limpio
          // Solo sincronizar mensajes_count y etapa para no bloquear otras cosas
          if (fresco.mensajes_count !== selProspect.mensajes_count ||
              fresco.etapa !== selProspect.etapa) {
            setSelProspect(p => p ? {...p, mensajes_count: fresco.mensajes_count, etapa: fresco.etapa} : p);
          }
          return;
        }
      }

      if (
        fresco.listo_para_cierre !== selProspect.listo_para_cierre ||
        fresco.horario_elegido !== selProspect.horario_elegido ||
        fresco.modo_humano !== selProspect.modo_humano ||
        fresco.etapa !== selProspect.etapa ||
        fresco.mensajes_count !== selProspect.mensajes_count
      ) {
        setSelProspect(fresco);
      }
    }
  }, [prospectos]);

  useEffect(() => {
    if (selClient) {
      fetchProspectos(selClient.id);
      window._edgeRefreshProspectos = () => fetchProspectos(selClient.id);
      const iv = setInterval(() => fetchProspectos(selClient.id), 4000);
      return () => {
        clearInterval(iv);
        window._edgeRefreshProspectos = null;
      };
    }
  }, [selClient, fetchProspectos]);

  useEffect(() => {
    if (selProspect) {
      fetchMensajes(selProspect.id, true);
      // Scroll forzado al fondo — múltiples intentos para cuando carguen los mensajes
      [150, 400, 800, 1500].forEach(delay => {
        setTimeout(() => {
          if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
        }, delay);
      });
      const iv = setInterval(() => fetchMensajes(selProspect.id), 5000);
      return () => clearInterval(iv);
    }
  }, [selProspect?.id]);

  // Cargar horarios sugeridos cuando el prospecto esta listo para cerrar
  // null = cargando, [] = cargó sin resultados, [...] = tiene slots
  const [horariosSugeridos, setHorariosSugeridos] = useState(null);
  useEffect(()=>{
    if(selProspect?.listo_para_cierre && selProspect?.id){
      setHorariosSugeridos(null); // cargando
      fetch(`${API}/api/horarios-sugeridos/${selProspect.id}`,{headers:aH()})
        .then(r=>r.json())
        .then(d=>{ setHorariosSugeridos(d.slots||[]); })
        .catch(()=>{ setHorariosSugeridos([]); });
    } else {
      setHorariosSugeridos(null);
    }
  },[selProspect?.id, selProspect?.listo_para_cierre]);

  const [camposConfig, setCamposConfig] = useState(null);

  useEffect(() => {
    if (selClient?.id) {
      fetch(`${API}/api/campos-agenda?cliente_id=${selClient.id}`).then(r=>r.json()).then(setCamposConfig).catch(()=>{});
    }
  }, [selClient?.id]);

  useEffect(() => {
    if (selProspect) {
      fetch(`${API}/api/prospectos/${selProspect.id}/datos-agenda`, { headers: aH() }).then(r=>r.json()).then(setDatosAgenda).catch(()=>setDatosAgenda(null));
    }
  }, [selProspect]);

  const selectClient = (c) => { setSelClient(c); setSelProspect(null); setProspectos([]); setMensajes([]); setView("client"); };

  const crearUsr = async () => {
    if (!formUsr.email || !formUsr.password || !formUsr.nombre) return setErrUsr("Todos los campos son obligatorios");
    setSavingUsr(true); setErrUsr(null);
    try {
      const r = await fetch(`${API}/api/auth/crear-usuario`, { method:"POST", headers:jH(), body:JSON.stringify({ ...formUsr, cliente_id:modalUsr.id, rango:formUsr.rango||"staff" }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Error");
      setOkUsr(true);
      setTimeout(() => { setModalUsr(null); setOkUsr(false); setFormUsr({ nombre:"", email:"", password:"", rango:"staff" }); }, 2000);
    } catch(e) { setErrUsr(e.message); }
    setSavingUsr(false);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        html, body, #root { height: 100%; background: #0a0a0f; }
        body { overflow: hidden; }
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#2a2a3e;border-radius:2px}
        .hr:hover{background:${C.surfaceHover}!important;cursor:pointer}
        .pi:hover{background:${C.surfaceHover}!important;cursor:pointer}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @media(max-width:767px){.admin-table-desktop{display:none}.admin-table-mobile{display:block}}
        @media(min-width:768px){.admin-table-desktop{display:block}.admin-table-mobile{display:none}}
        @keyframes si{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        .si{animation:si .25s ease}
        @keyframes pulsoNaranja{0%,100%{box-shadow:0 0 0 0 rgba(249,115,22,0.5)}70%{box-shadow:0 0 0 8px rgba(249,115,22,0)}}
        .pulso-naranja{animation:pulsoNaranja 1.8s infinite}
        @keyframes slideDown{from{opacity:0;transform:translateY(-16px)}to{opacity:1;transform:translateY(0)}}
        .slide-down{animation:slideDown .3s ease}
        * { -webkit-tap-highlight-color: transparent; }
      `}</style>

      <div style={{fontFamily:"'Inter','Segoe UI',system-ui,sans-serif",background:C.bg,height:APP_H,color:C.text,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        {/* Banner global: prospectos listos para agendar */}
        {prospectos.filter(p => p.listo_para_cierre && !p.horario_elegido).length > 0 && (
          <div className="slide-down" style={{background:"linear-gradient(90deg,rgba(249,115,22,0.15),rgba(239,68,68,0.1))",borderBottom:"2px solid #f97316",padding:"7px 16px",display:"flex",alignItems:"center",gap:10,zIndex:200,flexShrink:0,flexWrap:"wrap"}}>
            <span style={{fontSize:16,flexShrink:0}}>🎯</span>
            <span style={{fontSize:12,fontWeight:700,color:"#fb923c",flexShrink:0}}>
              {prospectos.filter(p=>p.listo_para_cierre&&!p.horario_elegido).length === 1
                ? "Cliente esperando horarios:"
                : `${prospectos.filter(p=>p.listo_para_cierre&&!p.horario_elegido).length} pacientes esperando horarios:`}
            </span>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",flex:1}}>
              {prospectos.filter(p=>p.listo_para_cierre&&!p.horario_elegido).map(p=>(
                <button key={p.id}
                  className="pulso-naranja"
                  onClick={()=>{
                    const cli = clientes.find(c=>c.id===p.cliente_id);
                    setView("client");
                    setActiveTab("conversations");
                    setMensajes([]);
                    if(cli && cli.id !== selClient?.id){
                      setSelClient(cli);
                      setSelProspect(null);
                      // Esperar que carguen los prospectos del nuevo cliente y luego seleccionar
                      setTimeout(()=>{ fetchProspectos(cli.id); }, 50);
                      setTimeout(()=>{ setSelProspect(p); setMensajes([]); }, 400);
                    } else {
                      setTimeout(()=>{ setSelProspect(p); setMensajes([]); }, 80);
                    }
                  }}
                  style={{padding:"3px 12px",borderRadius:2,border:"1px solid #f97316",background:"rgba(249,115,22,0.15)",color:"#fb923c",fontSize:11,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}>
                  {p.nombre||p.telefono} {p.tratamiento?`— ${p.tratamiento}`:""}
                </button>
              ))}
            </div>
            <button onClick={()=>{ setView("client"); setActiveTab("conversations"); setSelProspect(null); }}
              style={{padding:"2px 10px",borderRadius:2,border:"1px solid rgba(249,115,22,0.4)",background:"transparent",color:"#fb923c",fontSize:10,fontWeight:600,cursor:"pointer",flexShrink:0,whiteSpace:"nowrap"}}>
              Ver todos
            </button>
          </div>
        )}
        <div style={{background:C.surface,borderBottom:`1px solid ${C.border}`,padding:"0 16px",display:"flex",alignItems:"center",justifyContent:"space-between",height:56,flexShrink:0,gap:8}}>
          <div style={{display:"flex",alignItems:"center",gap:10,minWidth:0}}>
            <img src="/logo.svg" alt="Skyward" style={{height:38,width:"auto",flexShrink:0,filter:"drop-shadow(0 1px 4px rgba(232,78,15,0.4))"}} />
            <div style={{display:"flex",flexDirection:"column",lineHeight:1.15,minWidth:0}}>
              <span style={{fontWeight:800,fontSize:13,color:C.text,letterSpacing:-0.3,whiteSpace:"nowrap"}}>CRM - Skyward</span>
              <span style={{fontSize:10,color:C.accentLight,fontWeight:500,letterSpacing:0.5,textTransform:"uppercase"}}>{view==="admin"?"Panel Admin":selClient?.nombre||"CRM"}</span>
            </div>
          </div>
          {user?.rol === 'admin' && (
          <div style={{display:"flex",gap:3,background:C.bg,borderRadius:2,padding:3,border:`1px solid ${C.border}`,flexShrink:0}}>
            {["admin","client"].map(v => (
              <button key={v} onClick={()=>{setView(v);if(v==="admin")fetchAdmin();}}
                style={{padding:"4px 10px",borderRadius:4,border:"none",cursor:"pointer",fontSize:11,fontWeight:500,background:view===v?C.accent:"transparent",color:view===v?"white":C.muted,transition:"all .2s",fontFamily:"inherit"}}>
                {v==="admin"?"Admin":"Cliente"}
              </button>
            ))}
          </div>
          )}
          {/* Selector de tamaño de texto */}
          <div style={{display:"flex",alignItems:"center",gap:2,flexShrink:0}}>
            {[{k:'sm',l:'A',s:10},{k:'md',l:'A',s:13},{k:'lg',l:'A',s:16}].map(({k,l,s})=>(
              <button key={k} onClick={()=>{localStorage.setItem('skyward_ui_scale',k);window.location.reload();}}
                title={k==='sm'?'Tamaño normal':k==='md'?'Tamaño grande':'Tamaño muy grande'}
                style={{background:_storedScale===k?C.accentGlow:"transparent",border:`1px solid ${_storedScale===k?C.accent:C.border}`,borderRadius:2,width:22,height:22,cursor:"pointer",color:_storedScale===k?C.accentLight:C.muted,fontSize:s,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1,padding:0,fontFamily:"Georgia,serif"}}>
                {l}
              </button>
            ))}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
            <div style={{width:8,height:8,background:error?C.red:C.green,borderRadius:"50%",animation:"pulse 2s infinite",flexShrink:0}}/>
            <div style={{width:26,height:26,background:C.accentGlow,borderRadius:"50%",border:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,flexShrink:0,color:C.accentLight,fontWeight:600}}>{user?.nombre?.[0]||"A"}</div>
            <div style={{display:"flex",flexDirection:"column",lineHeight:1.2}}>
              <span style={{fontSize:11,fontWeight:600,color:C.text}}>{user?.nombre||''}</span>
              {user?.cargo && <span style={{fontSize:10,color:C.muted}}>{user.cargo}</span>}
            </div>
            <button onClick={onLogout} style={{background:"transparent",border:`1px solid ${C.border}`,color:C.muted,padding:"4px 8px",borderRadius:4,fontSize:11,cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>Salir</button>
          </div>
        </div>

        {loading ? (
          <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12}}><Spinner/><span style={{color:C.muted,fontSize:13}}>Conectando...</span></div>
        ) : error ? (
          <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12}}>
            <span style={{fontSize:32}}>⚠️</span><span style={{color:C.muted,fontSize:14}}>{error}</span>
            <Btn onClick={fetchAdmin}>Reintentar</Btn>
          </div>
        ) : view === "admin" ? (
          <AdminView stats={stats} clientes={clientes} onSelectClient={selectClient} onRefresh={fetchAdmin} onCrearUsuario={setModalUsr}
            onPlanChange={(id,plan)=>{if(selClient?.id===id)setSelClient(sc=>({...sc,plan}));fetchAdmin();}}/>
        ) : !selClient ? (
          <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12}}>
            <span style={{fontSize:32}}>🏥</span>
            <span style={{color:C.muted,fontSize:14}}>Seleccioná un cliente desde Admin</span>
            <Btn onClick={()=>setView("admin")}>Ir a Admin</Btn>
          </div>
        ) : (
          <ClientView
            client={selClient} campos={camposConfig} rango={user?.rango} user={user} plan={selClient?.plan||'pro'} prospectos={prospectos} mensajes={mensajes}
            funnelData={funnelData} selectedProspect={selProspect}
            setSelectedProspect={p=>{setSelProspect(p);setMensajes([]);}}
            datosAgenda={datosAgenda} chatRef={chatRef}
            activeTab={activeTab} setActiveTab={setActiveTab}
            onRefresh={()=>selClient&&fetchProspectos(selClient.id)}
            onRefreshMensajes={pid=>fetchMensajes(pid)}
            onAddMensaje={msg=>{
              setMensajes(prev=>[...(prev||[]),msg]);
              setTimeout(()=>{ if(chatRef.current) chatRef.current.scrollTop=chatRef.current.scrollHeight; },80);
            }}
            token={token}
            horariosSugeridos={horariosSugeridos}
            pushActivo={pushActivo}
            highlightPush={highlightPush}
            onHighlightPushDone={()=>setHighlightPush(false)}
            onPushActivado={()=>setPushActivo(true)}
            onMarcarLimpiado={id=>limpiadosRef.current.add(id)}
          />
        )}
      </div>

      {modalUsr && (
        <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.75)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}}>
          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:32,width:400,maxWidth:"92vw"}}>
            {okUsr ? (
              <div style={{textAlign:"center",padding:"20px 0"}}>
                <div style={{fontSize:40,marginBottom:12}}>✅</div>
                <div style={{fontSize:16,fontWeight:700}}>Usuario creado</div>
                <div style={{fontSize:13,color:C.muted,marginTop:6}}>{formUsr.email}</div>
              </div>
            ) : (
              <>
                <div style={{fontSize:16,fontWeight:700,marginBottom:4}}>Nuevo usuario</div>
                <div style={{fontSize:12,color:C.muted,marginBottom:20}}>Para: {modalUsr.nombre}</div>
                <Field label="Nombre *" value={formUsr.nombre} onChange={v=>setFormUsr({...formUsr,nombre:v})} placeholder="Ana García"/>
                <Field label="Email *" value={formUsr.email} onChange={v=>setFormUsr({...formUsr,email:v})} placeholder="ana@skyward.com" type="email"/>
                <Field label="Contraseña *" value={formUsr.password} onChange={v=>setFormUsr({...formUsr,password:v})} placeholder="••••••••" type="password"/>
                <div style={{marginBottom:14}}>
                  <label style={{fontSize:11,color:C.muted,fontWeight:500,display:"block",marginBottom:5}}>Rango</label>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                    {[
                      {v:"dueno",   label:"Socio / Dueño",    desc:"Todo + Config"},
                      {v:"profesional", label:"Abogado Auxiliar", desc:"Clientes, Casos y Honorarios"},
                      {v:"staff",   label:"Secretario/a",     desc:"Clientes y Agenda"},
                    ].map(r=>(
                      <div key={r.v} onClick={()=>setFormUsr({...formUsr,rango:r.v})}
                        style={{flex:1,minWidth:100,padding:"10px 14px",borderRadius:4,border:`1px solid ${(formUsr.rango||"staff")===r.v?C.accent:C.border}`,background:(formUsr.rango||"staff")===r.v?C.accentGlow:"transparent",cursor:"pointer",transition:"all .15s"}}>
                        <div style={{fontSize:13,fontWeight:600,color:(formUsr.rango||"staff")===r.v?C.accentLight:C.text}}>{r.label}</div>
                        <div style={{fontSize:11,color:C.muted,marginTop:2}}>{r.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
                {errUsr && <div style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:4,padding:"8px 12px",fontSize:12,color:C.red,marginBottom:16}}>{errUsr}</div>}
                <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                  <Btn onClick={()=>{setModalUsr(null);setErrUsr(null);}} secondary>Cancelar</Btn>
                  <Btn onClick={crearUsr} disabled={savingUsr}>{savingUsr?"Creando...":"Crear usuario"}</Btn>
                </div>
              </>
            )}
          </div>
        </div>
      )}

    </>
  );
}

function LoginForm({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const login = async () => {
    if (!email || !password) return setErr('Completá todos los campos');
    setLoading(true); setErr(null);
    try {
      const r = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Credenciales inválidas');
      localStorage.setItem('edge_token', d.token);
      onLogin(d.token, d.user);
    } catch(e) { setErr(e.message); }
    setLoading(false);
  };

  return (
    <div style={{height:APP_H,overflowY:'auto',display:'flex',alignItems:'center',justifyContent:'center',background:C.bg,backgroundImage:'radial-gradient(ellipse at 60% 20%, rgba(232,78,15,0.06) 0%, transparent 60%), radial-gradient(ellipse at 20% 80%, rgba(251,186,0,0.04) 0%, transparent 50%)'}}>
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:'40px 44px',width:400,maxWidth:'94vw',boxShadow:'0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(232,78,15,0.08)'}}>
        {/* Logo + Brand */}
        <div style={{textAlign:'center',marginBottom:36}}>
          <img src="/logo.svg" alt="Skyward" style={{height:72,width:"auto",marginBottom:16,filter:'drop-shadow(0 4px 12px rgba(232,78,15,0.35))'}}/>
          <div style={{fontSize:22,fontWeight:800,color:C.text,letterSpacing:-0.5,lineHeight:1.1}}>Skyward</div>
          <div style={{fontSize:12,color:C.accentLight,fontWeight:600,letterSpacing:2,textTransform:'uppercase',marginTop:4}}>Consultoría Jurídica</div>
          <div style={{width:40,height:2,background:`linear-gradient(90deg, ${C.accent}, ${C.yellow})`,borderRadius:2,margin:'14px auto 0'}}/>
        </div>

        <div style={{marginBottom:16}}>
          <label style={{fontSize:10,color:C.muted,fontWeight:600,display:'block',marginBottom:6,letterSpacing:1.2,textTransform:'uppercase'}}>Email</label>
          <input value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==='Enter'&&login()}
            type="email" placeholder="tu@email.com" autoFocus
            style={{width:'100%',padding:'11px 14px',borderRadius:4,border:`1.5px solid ${C.border}`,background:C.bg,color:C.text,fontSize:14,outline:'none',fontFamily:'inherit',boxSizing:'border-box',transition:'border-color .2s'}}
            onFocus={e=>e.target.style.borderColor=C.accent} onBlur={e=>e.target.style.borderColor=C.border}/>
        </div>
        <div style={{marginBottom:24}}>
          <label style={{fontSize:10,color:C.muted,fontWeight:600,display:'block',marginBottom:6,letterSpacing:1.2,textTransform:'uppercase'}}>Contraseña</label>
          <input value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==='Enter'&&login()}
            type="password" placeholder="••••••••"
            style={{width:'100%',padding:'11px 14px',borderRadius:4,border:`1.5px solid ${C.border}`,background:C.bg,color:C.text,fontSize:14,outline:'none',fontFamily:'inherit',boxSizing:'border-box',transition:'border-color .2s'}}
            onFocus={e=>e.target.style.borderColor=C.accent} onBlur={e=>e.target.style.borderColor=C.border}/>
        </div>
        {err && <div style={{background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.25)',borderRadius:4,padding:'10px 14px',fontSize:12,color:C.red,marginBottom:18}}>{err}</div>}
        <button onClick={login} disabled={loading}
          style={{width:'100%',padding:'13px',borderRadius:4,border:'none',background:`linear-gradient(135deg, ${C.accent} 0%, #c73d0a 100%)`,color:'white',fontSize:14,fontWeight:700,cursor:loading?'not-allowed':'pointer',opacity:loading?0.75:1,fontFamily:'inherit',letterSpacing:0.3,boxShadow:loading?'none':'0 4px 16px rgba(232,78,15,0.35)',transition:'all .2s'}}>
          {loading ? 'Ingresando...' : 'Ingresar al CRM'}
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('edge_token') || '');
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const t = localStorage.getItem('edge_token');
    if (!t) { setChecking(false); return; }
    fetch(`${API}/api/auth/me`, { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.ok ? r.json() : null)
      .then(u => {
        if (u) { setToken(t); setUser(u); }
        else { localStorage.removeItem('edge_token'); setToken(''); }
      })
      .catch(() => { localStorage.removeItem('edge_token'); setToken(''); })
      .finally(() => setChecking(false));
  }, []);

  if (checking) return (
    <div style={{height:APP_H,display:'flex',alignItems:'center',justifyContent:'center',background:C.bg}}>
      <div style={{color:C.muted,fontSize:14}}>Cargando...</div>
    </div>
  );

  if (!token || !user) return (
    <LoginForm onLogin={(t, u) => { setToken(t); setUser(u); }} />
  );

  return (
    <EdgePanel token={token} user={user} onLogout={() => {
      localStorage.removeItem('edge_token');
      setToken(''); setUser(null);
    }} />
  );
}
