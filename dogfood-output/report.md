# Foodhub: QA MVP

Fecha: 2026-10-09. Coordinación Ruflo y exploración Dogfood mediante Playwright CLI, Chrome aislado.

Build y lint aprobados. 26 pruebas automatizadas: 2 de acceso, 10 DoorDash/Gmail, 5 importación, 6 autorización HTTP y 3 integración PocketBase real. Registros temporales eliminados al terminar.

15 verificaciones de navegador aprobadas: búsqueda vacía y por producto; detalle y Escape; estado y recarga; arrastre mediante Mover; fallo de guardado sin alterar estado; análisis de 30 días con progreso de 1200 mensajes; duplicados sin repetir notificación; error Gmail accionable; fallo de carga y reintento; escritorio y móvil sin desbordes; ausencia de errores JavaScript. El HTTP 503 de consola fue simulado deliberadamente.

Las sesiones HTTP son sintéticas. Los tickets y el análisis masivo en navegador usan respuestas controladas. No demuestran lectura del buzón real.

Verificado contra PocketBase real: deduplicación concurrente, recuperación de datos PDF sin perder estado, cuatro estados persistentes, bloqueo de importación, colecciones privadas, rechazo de origen inválido y respuestas sin tokens.

Verificado con mensajes controlados: paginación, corte exacto de 30 días, exclusión de enviados y borradores, reintentos, renovación de tokens, continuidad ante errores individuales y cancelación. El PDF local del usuario fue analizado para validar productos, opciones y total.

Correcciones comprobadas: lectura de sesión dinámica antes de auth; arrastre mediante control explícito; notificaciones solo para órdenes nuevas; preservación del error Gmail; fecha de retiro del PDF; ticket móvil completo.

Evidencia:

- screenshots/dashboard-desktop.png: estado vacío real.
- screenshots/dashboard-mobile.png: estado vacío real móvil.
- screenshots/dashboard-order-desktop.png: ticket controlado escritorio.
- screenshots/dashboard-order-mobile.png: ticket controlado móvil, 390 px.

Pendiente externo: habilitar Gmail API y conceder gmail.readonly mediante Conectar Gmail. Después ejecutar Analizar últimos 30 días para validar contenido real. No se confirmó una importación del buzón real.


Registro de análisis de Gmail: se probaron 5 mensajes simulados (omitidos por remitente y asunto, pedido, duplicado y error). El panel inicia cerrado y muestra fecha, remitente, asunto y motivo; no incluye cuerpo ni adjuntos. Verificado en escritorio y móvil a 390 px, sin desbordamiento ni errores de consola.

- screenshots/scan-log-desktop.png: registro desplegado en escritorio.
- screenshots/scan-log-mobile.png: registro desplegado en móvil.


Reintentos Gmail y borrado total:

- 21 pruebas unitarias aprobadas, incluidas cuotas 403, 403 de permisos sin reintento, agotamiento de intentos y cancelación durante espera. Lint y TypeScript aprobados.
- El borrado se probó en navegador con API simulada: cancelar confirmación, éxito, conflicto 409 y borrado parcial; además, el endpoint real rechazó la petición sin confirmación con 400 antes de acceder a PocketBase.
- Escritorio y móvil a 390 px sin desborde ni errores JavaScript. La consola registra un 409 esperado del escenario simulado.
- No se ejecutó ningún borrado ni comando contra PocketBase.

- screenshots/delete-orders-desktop.png
- screenshots/delete-orders-mobile.png

Ruflo diff analysis: 9/100, then CLI TypeError reading undefined.length; no init or repair.
