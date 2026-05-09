/**
 * lib/cuit.js — Validación de CUIT / CUIL / DNI argentina
 * Algoritmo: Módulo 11 con pesos [5,4,3,2,7,6,5,4,3,2]
 *
 * Reglas:
 *   - Resto 0  → dígito verificador = 0
 *   - Resto 1  → INVÁLIDO (excepto prefijos 20/23/24/27 con ajuste)
 *   - Otro     → dígito verificador = 11 - resto
 */

const PESOS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];

/**
 * Limpia un string dejando sólo dígitos.
 * @param {string} valor
 * @returns {string}
 */
function soloDigitos(valor) {
  return String(valor || '').replace(/[^0-9]/g, '');
}

/**
 * Calcula el dígito verificador esperado para los primeros 10 dígitos.
 * Devuelve -1 si el CUIT es inválido (resto === 1).
 * @param {string} digitos10 — string de exactamente 10 dígitos
 * @returns {number}  0-9  o  -1 si inválido
 */
function calcularVerificador(digitos10) {
  const suma = digitos10
    .split('')
    .reduce((acc, d, i) => acc + parseInt(d, 10) * PESOS[i], 0);
  const resto = suma % 11;
  if (resto === 0) return 0;
  if (resto === 1) return -1; // inválido
  return 11 - resto;
}

/**
 * Valida un CUIT o CUIL.
 * Acepta formatos: "20-12345678-9" o "20123456789"
 * @param {string} cuit
 * @returns {{ valido: boolean, mensaje: string }}
 */
export function validarCUIT(cuit) {
  const d = soloDigitos(cuit);
  if (d.length !== 11) return { valido: false, mensaje: 'Debe tener 11 dígitos' };

  const prefijo = d.substring(0, 2);
  const prefijosValidos = ['20', '23', '24', '27', '30', '33', '34'];
  if (!prefijosValidos.includes(prefijo)) {
    return { valido: false, mensaje: `Prefijo ${prefijo} no válido` };
  }

  const verificadorEsperado = calcularVerificador(d.substring(0, 10));
  if (verificadorEsperado === -1) {
    return { valido: false, mensaje: 'CUIT inválido (resto 1 en módulo 11)' };
  }

  const verificadorReal = parseInt(d[10], 10);
  if (verificadorReal !== verificadorEsperado) {
    return {
      valido: false,
      mensaje: `Dígito verificador incorrecto (esperado: ${verificadorEsperado}, recibido: ${verificadorReal})`,
    };
  }

  return { valido: true, mensaje: 'CUIT válido' };
}

/**
 * Alias semántico: misma lógica que validarCUIT.
 */
export const validarCUIL = validarCUIT;

/**
 * Valida un DNI argentino (número, sin guiones).
 * Rango aceptado: 1.000.000 – 99.999.999
 * @param {string|number} dni
 * @returns {{ valido: boolean, mensaje: string }}
 */
export function validarDNI(dni) {
  const d = soloDigitos(dni);
  if (!/^\d{7,8}$/.test(d)) {
    return { valido: false, mensaje: 'El DNI debe tener 7 u 8 dígitos' };
  }
  const n = parseInt(d, 10);
  if (n < 1_000_000 || n > 99_999_999) {
    return { valido: false, mensaje: 'Número de DNI fuera de rango válido' };
  }
  return { valido: true, mensaje: 'DNI válido' };
}

/**
 * Formatea un CUIT/CUIL con guiones: XX-XXXXXXXX-X
 * @param {string} cuit  — 11 dígitos (con o sin guiones)
 * @returns {string}
 */
export function formatCUIT(cuit) {
  const d = soloDigitos(cuit);
  if (d.length !== 11) return cuit; // devolver tal cual si es inválido
  return `${d.substring(0, 2)}-${d.substring(2, 10)}-${d[10]}`;
}

/**
 * Formatea un DNI con puntos: X.XXX.XXX o XX.XXX.XXX
 * @param {string|number} dni
 * @returns {string}
 */
export function formatDNI(dni) {
  const d = soloDigitos(dni);
  if (d.length < 7 || d.length > 8) return String(dni);
  return parseInt(d, 10).toLocaleString('es-AR');
}
