# Auditoría técnica independiente — TPV Restaurante

**Fecha:** 28 de julio de 2026
**Alcance:** repositorio completo (`tpv-restaturante` + `packages/core` + `mobile`)
**Método:** revisión de código estático — arquitectura, seguridad, calidad, CI/CD, dependencias. No incluye pentesting activo ni pruebas de carga.

> Nota: en el repo ya existe un `AUDITORIA_PROFESIONAL.md` generado por otra IA (22 jul 2026, nota 8.5/10). Esta auditoría es independiente: confirma varios de sus puntos pero añade hallazgos concretos de seguridad y hygiene que ese informe no cubre, con evidencia de archivo/línea.

## Resumen ejecutivo

El proyecto está notablemente más maduro que un TPV típico de este tamaño: arquitectura por capas (`domain/application/infrastructure`), CI con typecheck + lint + tests + build, multi-tenant con 77 tablas, rate limiting y CORS en middleware, verificación de firma en webhooks de Stripe/Uber/Glovo. Eso es un nivel de disciplina que no se ve en la mayoría de proyectos solo.

Al mismo tiempo hay una brecha real entre "el patrón correcto existe" y "se aplica siempre": hay endpoints sensibles con guardas más débiles de lo que el propio middleware documenta como su límite, secretos de ejemplo poco robustos, y una cantidad de `any` en TypeScript que contradice el `strict: true` declarado. Ninguno de estos puntos es alarmante por sí solo, pero son exactamente el tipo de cosas que en un TPV en producción (dinero real, facturación fiscal Verifactu) conviene cerrar antes de escalar a más locales o más tráfico.

**Valoración global: 7.5/10** — sólido en fundamentos, con deuda técnica concentrada y localizable (no dispersa por todo el código), lo cual es buena noticia: se puede pagar por partes.

---

## Puntos fuertes

**1. Arquitectura intencional, no accidental**
Separación clara `domain/` (13 subdominios: catalog, kitchen, orders, payments, pricing…) / `application/` (casos de uso: `CloseOrder`, `CancelTable`, `ApplyPersonalDiscount`) / `infrastructure/`. Esto no es habitual en un proyecto de una persona — indica que las decisiones de diseño se tomaron con intención de que el código dure y escale.

**2. Seguridad "en capas", con las capas correctas**
El middleware (`app/middleware.ts`) hace exactamente lo que edge runtime le permite hacer bien: API key, CORS con lista blanca, rate limiting por IP. Y documenta explícitamente *por qué* la validación de sesión/rol vive en cada handler (`getSessionEmployee()`, `requireRole()`) y no en el middleware — porque el middleware corre en Edge y no puede hablar con Postgres. Ese razonamiento por escrito en el propio código es señal de que se pensó el trade-off, no que se improvisó.

**3. Webhooks correctamente verificados**
Stripe usa `constructEvent` con firma; Uber Eats y Glovo pasan por `verifyWebhookSignature()` contra secretos dedicados. Es el error más común en integraciones de delivery (confiar en el payload sin verificar firma) y aquí está bien resuelto.

**4. CI real, no decorativo**
`ci.yml` encadena typecheck de `packages/core` + typecheck de la app + lint + tests unitarios como *fast gate*, y solo si eso pasa se lanza el build de producción. Es la secuencia correcta (barato y rápido primero, caro después).

**5. Multi-tenant consistente**
`tenant_id` presente de forma sistemática en el esquema (77 tablas) y usado como filtro en las queries revisadas — no encontré un endpoint que lo omitiera, lo cual en multi-tenant es justo donde suelen aparecer las fugas de datos entre clientes.

**6. Consultas parametrizadas**
Todo el SQL crudo pasa por el tag `sql\`...\`` de Drizzle (parametrizado), no por interpolación de strings. No encontré ningún patrón de inyección SQL en la muestra revisada.

---

## Puntos débiles

### Críticos / atender ya

- **`app/api/backup-cron/route.ts`**: si `CRON_SECRET` no está definida en el entorno, la comprobación `if (expected && auth !== ...)` se salta por completo y el endpoint queda abierto sin autenticación. Y el `.env.example` sugiere `CRON_SECRET=1234` como valor de partida — fácil de dejar así en un despliegue rápido. Recomendación: que el endpoint falle (500) si `CRON_SECRET` no está definida, igual que ya hace `TPV_API_KEY` en producción dentro del middleware.
- **Rate limiting en memoria (`Map` local)**: en `middleware.ts` el store de rate limit vive en la memoria del proceso. En un entorno serverless (Vercel, que es donde apunta `vercel.json`) cada instancia tiene su propio contador — en la práctica el límite real es N × instancias activas, no N. Para un TPV con pagos y checkout, un rate limit que no limita de verdad es un riesgo silencioso. A medio plazo conviene mover esto a Redis/Upstash o similar.
- **`.env.example` con datos reales, no placeholders**: el `DATABASE_URL` de ejemplo incluye una referencia de proyecto Supabase real (`usrdtucgeogytnxyivoy`) y `FISKALY_TAXPAYER_NIF` trae un NIF con formato válido, no un `XXXXXXXXX` genérico. Si ese repo (o ese NIF) es real, es información que no debería estar en un archivo pensado para compartirse/subirse a git. Vale la pena revisar y sustituir por placeholders neutros.

### Importantes / próximas 2-4 semanas

- **`strict: true` en TypeScript, pero 617 usos de `any`/`as any`** fuera de los tests. El strict mode declarado pierde buena parte de su valor si el código real esquiva el tipado en cientos de puntos — cada `any` es una zona donde el compilador ya no te protege de errores en runtime, justo el tipo de errores que en un TPV terminan en un cobro mal calculado o un pedido perdido. No hace falta eliminarlos todos de golpe: conviene priorizar los que tocan dinero (payments, pricing, invoice) y bajar el número progresivamente, con un límite máximo que no se pueda superar en CI (`eslint` con regla que cuente `any` y falle si sube).
- **12 de 77 endpoints sin `requireRole`/`getSessionEmployee`**: la mayoría están justificados (webhooks públicos, salud, PIN de admin por otra vía), pero vale la pena una pasada endpoint por endpoint documentando *por qué* cada uno está fuera del patrón estándar — hoy esa justificación vive en la cabeza de quien lo escribió, no en el código.
- **Archivo huérfano en el repo**: hay una carpeta `tpv-restaurante/` (sin la segunda "t", solo 3 archivos) conviviendo con la carpeta real `tpv-restaturante/`. Es fácil que alguien nuevo en el proyecto — o una IA asistente — edite la carpeta equivocada sin darse cuenta. Merece borrarse o consolidarse.
- **Cobertura de tests desigual**: 22 archivos de test unitario y 1 solo de e2e (Playwright) para una app con 77 endpoints y vistas de más de 1.000 líneas (`ComandaDrawer.tsx` con 1.771, `InformesView.tsx` con 1.698). El flujo crítico de negocio — abrir mesa → pedir → cobrar → facturar Verifactu — es exactamente el que más se beneficiaría de un e2e que lo cubra de punta a punta, porque es el que más dinero real mueve.

### Menores / cuando haya hueco

- Archivos sueltos en la raíz que parecen residuos de sesiones de desarrollo: `add_parsebody.py` y `add_parse_body.py` (dos versiones del mismo script), `fix_schemas.py`, `opencode.jsonc.tui-migration.bak`, un log de error de instalación de Sentry (`sentry-wizard-installation-error-*.log`). Ninguno afecta al funcionamiento, pero ensucian el repo y confunden a quien llega nuevo.
- Componentes muy grandes (`ComandaDrawer.tsx` 1.771 líneas, `GestoriaView.tsx` 1.054, `PedidosCompraView.tsx` 1.047): mantenibles hoy porque los conoces bien, pero cada nueva función que se añada ahí va a costar más revisar y testear que si estuvieran divididos por responsabilidad.
- Dependencia en beta para el hardware de pago (`@stripe/stripe-terminal-react-native` en `0.0.1-beta.31`, ya señalada en el otro informe): razonable mientras se prueba, pero antes de un despliegue a más locales conviene fijar una versión estable o al menos "pinnear" el commit exacto para que un update de npm no rompa el cobro con datáfono sin avisar.

---

## Hoja de ruta sugerida

**Medio plazo (próximas 2–6 semanas) — cerrar riesgo, no añadir features**
1. Arreglar `backup-cron` para que falle si `CRON_SECRET` no existe (mismo patrón que ya usa `TPV_API_KEY`).
2. Sanear `.env.example`: placeholders genéricos en vez de referencias/NIF con pinta real.
3. Borrar o fusionar la carpeta `tpv-restaurante/` huérfana y los scripts sueltos de la raíz.
4. Escribir un e2e Playwright del flujo completo mesa → pedido → cobro → Verifactu — el camino que más dinero mueve es el que menos margen de error debería tener.
5. Documentar (aunque sea en un comentario) por qué cada uno de los 12 endpoints sin `requireRole` está fuera del patrón estándar.

**Largo plazo (2–6 meses) — pagar deuda estructural**
1. Sustituir el rate limiter en memoria por uno compartido (Redis/Upstash) antes de escalar tráfico o número de locales — en serverless, el actual da una falsa sensación de protección.
2. Reducir `any` de forma dirigida, empezando por `payments/`, `pricing/`, `invoice/` (el dinero primero), con un tope duro en CI para que no vuelva a crecer.
3. Descomponer los componentes de más de 1.000 líneas en piezas por responsabilidad (esto también facilita el punto 2, porque es más fácil tipar bien algo pequeño).
4. Revisar y fijar versiones de dependencias beta/legacy antes de cualquier despliegue a producción con más carga (Stripe Terminal, `node-forge`).

## Conclusión

No es un proyecto que necesite "arreglos" en el sentido de estar mal hecho — al contrario, el nivel de arquitectura y el hecho de que la seguridad se haya pensado en capas con justificación escrita es más de lo que se ve en la mayoría de TPVs artesanales. Lo que hay es la brecha normal entre un proyecto que crece rápido a base de features y uno que ha tenido tiempo de cerrar los flecos: el `CRON_SECRET` sin fallback seguro, el rate limit que no limita en serverless, y el `any` que rompe el contrato del `strict: true`. Son arreglos concretos, no un rediseño — y el hecho de que estén localizados (no repartidos por todo el código) es lo que hace que esta hoja de ruta sea razonable en el plazo que se plantea.
