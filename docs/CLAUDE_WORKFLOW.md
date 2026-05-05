# CLAUDE_WORKFLOW.md
# Reglas y estado del proyecto para sesiones multi-agente con Claude

> Última actualización: 2026-05-04
> Repositorio: `skyward-panel` (frontend React/Vite)
> Backend companion: `edge-bot` (Express.js + PostgreSQL en Railway)

---

## A. Estado actual del proyecto

### Commits clave

| Commit    | Descripción                                              | Repo            |
|-----------|----------------------------------------------------------|-----------------|
| `f33f0e4` | Fase 0: gitignore root-anchored + untrack .claude/       | `edge-bot`      |
| `4cc8530` | Fase 1A+1B: extract theme, constants, api, hook          | `skyward-panel` |

### Archivos nuevos creados en Fase 1A+1B

| Archivo                          | Exports                                      |
|----------------------------------|----------------------------------------------|
| `src/theme.js`                   | `DARK_C`, `LIGHT_C`                          |
| `src/constants.js`               | `STAGES`, `FUNNEL_ORDER`, `PROF_COLORS`, `MONEDAS_MUNDO` |
| `src/utils/api.js`               | `API`, `tok()`, `aH()`, `jH()`              |
| `src/hooks/useIsMobile.js`       | `useIsMobile()`                              |

### Estado actual de los archivos principales

- **`src/App.jsx`**: ~10.993 líneas — aún monolítico. Contiene todos los componentes, lógica de negocio, rutas, modales, dashboards y estado global. Reducido 125 líneas respecto al original tras Fase 1A+1B.
- **`edge-bot/bot_index.js`**: ~8.765 líneas — monolítico. Contiene 153+ endpoints, lógica del bot WhatsApp, migraciones de DB, helpers, y toda la lógica de negocio del backend.

### Nota crítica sobre `C` (theme object)

`C` **no se exporta desde `theme.js`**. Se calcula dinámicamente en `App.jsx` a nivel de módulo leyendo `localStorage` en el momento de carga:

```js
const _storedTheme = typeof localStorage !== 'undefined' ? localStorage.getItem('skyward_theme') : 'dark';
let C = _storedTheme === 'light' ? LIGHT_C : DARK_C;
```

El toggle de tema hace `window.location.reload()`. No usar `useState` para `C`. No mover este bloque fuera de `App.jsx` sin repensar la arquitectura.

---

## B. Reglas para trabajo multi-sesión

1. **Un ejecutor por fase.** Solo una sesión puede modificar código en una fase dada. No paralelizar fases que tocan los mismos archivos.

2. **Git status antes y después de cada fase.**
   - Antes: verificar que el working tree esté limpio (sin cambios sin commitear de otra sesión).
   - Después: verificar que solo los archivos esperados fueron modificados.

3. **Commits atómicos por fase.** Cada fase termina con exactamente un commit que describe lo que se hizo. No mezclar cambios de múltiples fases en un solo commit.

4. **Sin aprobación explícita del usuario = no avanzar.** Cada fase debe ser aprobada por el usuario antes de ejecutarse. El plan de una fase no es aprobación para ejecutarla.

5. **No tocar código de otra capa.** Una sesión frontend no modifica `bot_index.js`. Una sesión backend no modifica `App.jsx`. Las capas están separadas.

6. **Reportar antes de cerrar la sesión.** Al finalizar una fase, reportar: hash del commit, archivos modificados, líneas añadidas/eliminadas, confirmación de que no se avanzó más de lo aprobado.

7. **Leer este archivo al inicio de cada sesión** para conocer el estado actual antes de proponer cualquier cambio.

---

## C. Roles recomendados por sesión

| Rol                      | Responsabilidad principal                                          |
|--------------------------|--------------------------------------------------------------------|
| **Principal / Integrador** | Aprueba fases, revisa PRs, mantiene este documento actualizado    |
| **Frontend**              | Trabaja exclusivamente en `skyward-panel/src/`                    |
| **Backend**               | Trabaja exclusivamente en `edge-bot/bot_index.js` y migraciones   |
| **Métricas / Producto**   | Define KPIs, estructura de datos, nuevas features a diseñar       |
| **QA / Testing**          | Valida builds, prueba endpoints, revisa regresiones visuales      |

---

## D. Qué puede hacer cada sesión

- Leer cualquier archivo del repo para entender contexto.
- Proponer planes de refactorización sin ejecutarlos.
- Ejecutar la fase explícitamente aprobada por el usuario en esa sesión.
- Crear archivos nuevos dentro del scope de la fase aprobada.
- Hacer `git add` y `git commit` de los archivos de su fase.
- Correr `git status`, `git log`, `git diff` para verificar el estado.
- Reportar errores encontrados fuera del scope sin corregirlos (abrir como tarea separada).

---

## E. Qué NO puede hacer cada sesión

- **No ejecutar una fase no aprobada**, aunque parezca lógico hacerlo.
- **No modificar archivos fuera del scope de la fase aprobada** (ej: una sesión de Fase 1C no toca `bot_index.js`).
- **No hacer `git push` sin instrucción explícita** del usuario (Railway auto-deploya al hacer push; puede interrumpir producción).
- **No reorganizar más de lo aprobado** (ej: no mover 3 componentes si solo 1 fue aprobado).
- **No cambiar la lógica de negocio** durante una fase de refactorización estructural. Refactorizar = mover, no reescribir.
- **No asumir que el build pasa** si no hay forma de verificarlo localmente. Indicar que la validación es estática.
- **No actualizar este archivo** sin aprobación del usuario. Este documento refleja el estado real, no el deseado.

---

## F. Fases futuras sugeridas (sin ejecutar)

### Fase 1C — Primitivas de UI
**Scope:** `skyward-panel/src/components/ui/`
**Archivos a crear:** `Spinner.jsx`, `Badge.jsx`, `Btn.jsx`, `Field.jsx`
**Qué se mueve:** Componentes sin estado ni lógica de negocio definidos inline en `App.jsx`.
**Criterio de extracción:** Componente usado 3+ veces, sin props de datos del dominio, sin side effects.
**Riesgo:** Bajo. No cambia comportamiento, solo mueve JSX.
**Dependencia:** Ninguna (no requiere Fase 1D).

### Fase 1D — Helpers de backend puros
**Scope:** `edge-bot/src/utils/`
**Funciones candidatas:** `normalizarTelefono()`, `convertirAOgg()`, `formatearMensajeTurno()`
**Criterio:** Función sin acceso a DB, sin estado, sin referencias a `req`/`res`, resultado determinístico.
**Riesgo:** Bajo-medio. Requiere verificar que no haya dependencias implícitas en el closure de `bot_index.js`.
**Dependencia:** Ninguna (independiente de Fase 1C).

### Fase 2 — Extracción de componentes de dominio
**Scope:** `skyward-panel/src/components/`
**Candidatos:** `HonorariosDashboard`, `AgendaView`, `PacientesView`, `VentasView`
**Criterio:** Componente con más de 150 líneas, lógica de fetch propia, estado local.
**Riesgo:** Medio. Requiere verificar que los props y callbacks estén correctamente definidos.
**Dependencia:** Requiere Fase 1C completada (para usar primitivas de UI).

### Fase 3 — Extracción de rutas del backend
**Scope:** `edge-bot/src/routes/`
**Candidatos:** `clientes.js`, `pacientes.js`, `agenda.js`, `honorarios.js`
**Criterio:** Agrupar endpoints por entidad de dominio. Cada archivo = un router Express.
**Riesgo:** Alto. Requiere refactorizar el objeto `app` y los middlewares. Potencial de romper Railway si hay error de sintaxis.
**Dependencia:** Requiere Fase 1D completada + validación de build local o staging.

---

*Este archivo debe mantenerse actualizado al cierre de cada fase. Es la fuente de verdad del estado del proyecto para nuevas sesiones de Claude.*
