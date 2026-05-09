// Paleta de colores del sistema de diseño Skyward.
// C no se exporta desde acá porque depende del estado dark/light
// guardado en localStorage al momento de cargar la página.
// El cálculo dinámico de C queda en App.jsx:
//   const _storedTheme = localStorage.getItem('skyward_theme');
//   let C = _storedTheme === 'light' ? LIGHT_C : DARK_C;

export const TYPE = {
  serif: "'Playfair Display', Georgia, serif",
  sans:  "'Inter', 'Segoe UI', system-ui, sans-serif",
  mono:  "'DM Mono', 'Courier New', monospace",
  scale: {
    display: { fontSize: "3rem",     fontWeight: 700 },
    h1:      { fontSize: "1.75rem",  fontWeight: 600 },
    h2:      { fontSize: "1.25rem",  fontWeight: 600 },
    h3:      { fontSize: "0.94rem",  fontWeight: 600 },
    body:    { fontSize: "0.875rem", fontWeight: 400 },
    caption: { fontSize: "0.75rem",  fontWeight: 400 },
    label:   { fontSize: "0.69rem",  fontWeight: 500 },
  },
};

export const DARK_C = {
  bg:"#0c0a07", surface:"#141109", surfaceHover:"#1c1710",
  border:"#2a2016", accent:"#E84E0F", accentLight:"#F39200",
  accentGlow:"rgba(232,78,15,0.13)", green:"#10b981",
  yellow:"#FBBA00", red:"#ef4444", text:"#f0ece4", muted:"#646464",
};

export const LIGHT_C = {
  bg:"#f7f4ef", surface:"#ffffff", surfaceHover:"#f0ece6",
  border:"#e8ddd0", accent:"#E84E0F", accentLight:"#d46a00",
  accentGlow:"rgba(232,78,15,0.07)", green:"#059669",
  yellow:"#b45309", red:"#dc2626", text:"#1c1710", muted:"#9a8a78",
};
