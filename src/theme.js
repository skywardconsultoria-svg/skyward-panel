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
  // Fondos
  bg:              '#0c0a07',
  surface:         '#141109',
  surface2:        '#1E1A12',   // hover de rows, selected state
  surfaceHover:    '#1c1710',

  // Bordes
  border:          '#2A2016',

  // Texto
  text:            '#F5F0EB',   // blanco roto — más cálido
  textMuted:       '#646464',
  muted:           '#646464',   // alias legacy

  // Acento naranja (paleta de marca)
  accent:          '#E84E0F',   // naranja fuerte — CTAs
  accentHover:     '#C94010',   // hover del CTA
  accentActive:    '#A83510',   // mousedown del CTA
  accentLight:     '#F39200',   // alias legacy (= accentWarm)
  accentWarm:      '#F39200',   // naranja medio — iconos activos
  accentSecondary: '#FBBA00',   // amarillo dorado — highlights
  accentGlow:      'rgba(232,78,15,0.08)', // tint para estados seleccionados

  // Estados semánticos
  green:   '#10B981',
  success: '#10B981',
  yellow:  '#FBBA00',
  warning: '#FBBA00',
  red:     '#EF4444',
  error:   '#EF4444',
  info:    '#F39200',   // naranja medio (era azul — ahora brand-consistent)
};

export const LIGHT_C = {
  // Fondos
  bg:              '#f7f4ef',
  surface:         '#ffffff',
  surface2:        '#F0EBE3',   // hover de rows, selected state
  surfaceHover:    '#f0ece6',

  // Bordes
  border:          '#e8ddd0',

  // Texto
  text:            '#0D0D0D',
  textMuted:       '#646464',
  muted:           '#646464',   // alias legacy

  // Acento naranja (paleta de marca)
  accent:          '#E84E0F',
  accentHover:     '#C94010',
  accentActive:    '#A83510',
  accentLight:     '#d46a00',   // alias legacy (light mode variant)
  accentWarm:      '#F39200',
  accentSecondary: '#FBBA00',
  accentGlow:      'rgba(232,78,15,0.07)',

  // Estados semánticos
  green:   '#059669',
  success: '#059669',
  yellow:  '#b45309',
  warning: '#b45309',
  red:     '#dc2626',
  error:   '#dc2626',
  info:    '#d46a00',
};
