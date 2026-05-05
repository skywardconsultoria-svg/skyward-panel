// Helpers de comunicación con el backend.
// Sin dependencias de React ni del árbol de componentes.

export const API = import.meta.env.VITE_API_URL || "https://api.edgecrm.net";

export function tok() {
  return localStorage.getItem("edge_token") || "";
}

export function aH() {
  return { "Authorization": `Bearer ${tok()}` };
}

export function jH() {
  return { "Content-Type": "application/json", ...aH() };
}
