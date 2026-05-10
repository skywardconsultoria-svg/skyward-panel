// Paleta de colores del sistema de diseño Skyward.
// C no se exporta desde acá porque depende del estado dark/light
// guardado en localStorage al momento de cargar la página.
// El cálculo dinámico de C queda en App.jsx:
//   const _storedTheme = localStorage.getItem('skyward_theme');
//   let C = _storedTheme === 'light' ? LIGHT_C : DARK_C;

export const TYPOGRAPHY = {
  fontDisplay:  "'Playfair Display', Georgia, serif",
  fontBody:     "'Inter', system-ui, sans-serif",
  fontMono:     "'Inter', system-ui, sans-serif", // tabular-nums vía font-feature

  // Escala
  display: { fontSize: '48px', fontWeight: 700, fontFamily: "'Playfair Display', Georgia, serif", lineHeight: 1.1, letterSpacing: '-0.02em' },
  h1:      { fontSize: '28px', fontWeight: 600, fontFamily: "'Playfair Display', Georgia, serif", lineHeight: 1.2, letterSpacing: '-0.01em' },
  h2:      { fontSize: '20px', fontWeight: 600, fontFamily: "'Inter', system-ui, sans-serif",     lineHeight: 1.3 },
  h3:      { fontSize: '15px', fontWeight: 600, fontFamily: "'Inter', system-ui, sans-serif",     lineHeight: 1.4 },
  body:    { fontSize: '14px', fontWeight: 400, fontFamily: "'Inter', system-ui, sans-serif",     lineHeight: 1.6 },
  caption: { fontSize: '12px', fontWeight: 400, fontFamily: "'Inter', system-ui, sans-serif",     lineHeight: 1.5 },
  label:   { fontSize: '11px', fontWeight: 500, fontFamily: "'Inter', system-ui, sans-serif",     lineHeight: 1.4, letterSpacing: '0.06em', textTransform: 'uppercase' },
  numeric: { fontVariantNumeric: 'tabular-nums lining-nums', fontFeatureSettings: '"tnum" 1' },
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
