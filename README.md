# Foodhub

MVP: una cuenta Gmail (atuantojofl@gmail.com), pedidos DoorDash y Kanban persistente en PocketBase foodhub del VPS.

## Uso

1. Ejecutar `npm run dev` y abrir http://localhost:3000.
2. Habilitar Gmail API en el proyecto Google Cloud. En modo prueba, agregar la cuenta como usuario de prueba.
3. Pulsar Conectar Gmail y autorizar lectura. El ingreso anterior sin permiso Gmail requiere nuevo consentimiento.
4. Pulsar Analizar últimos 30 días. Recorre todas las páginas de mensajes recibidos, incluidos archivados, spam y papelera; excluye borradores y mensajes enviados sin recepción. Extrae pedidos de orders@doordash.com por asunto y PDF.
5. Mover pedidos entre pendientes, preparación, enviados y completados mediante arrastre o selector. Los estados persisten entre recargas e importaciones repetidas.

Un programador del servidor consulta Gmail cada 60 segundos, aunque el tablero esté cerrado. Con el tablero abierto, los pedidos guardados llegan por SSE; una recarga cada minuto recupera eventos perdidos durante desconexiones. Incluye búsqueda, detalle, progreso y notificaciones opcionales.

Nunca abre enlaces de confirmación de órdenes. Si falla un PDF, conserva la orden con advertencia y sin inventar importes.

## Configuración

Las credenciales locales están configuradas en .env.local. Consultar .env.example para instalaciones nuevas; nunca publicar secretos. Callback local: http://localhost:3000/api/auth/callback/google.

Auth.js restringe el ingreso a la cuenta permitida y verificada. Las APIs verifican sesión y origen en mutaciones. PocketBase tiene colecciones privadas y tokens Gmail cifrados; las credenciales quedan en servidor.

## Sincronización automática 24/7

El proyecto incluye `Dockerfile`, `compose.24-7.yaml` y un timer de systemd en `deploy/systemd`. En el VPS, la app queda disponible solo en `127.0.0.1:3180`; el timer envía `POST /api/cron/orders` cada minuto. El endpoint reutiliza el bloqueo, cursor y deduplicación existentes; si Gmail falla, el siguiente ciclo reintenta.

Creá `.env.runtime` en el VPS con las variables de `.env.example` y los mismos secretos usados por la instancia que conectó Gmail. Creá `.env.cron` con el mismo `CRON_SECRET`; ambos archivos deben quedar privados. Luego ejecutá `docker compose -f compose.24-7.yaml up -d --build`, instalá las unidades de `deploy/systemd` en `/etc/systemd/system` y habilitá `foodhub-orders-sync.timer`.

La ruta `GET /api/orders/events` usa la sesión de Foodhub y necesita que el host permita SSE. Para abrir el tablero desde Internet hace falta configurar un dominio, HTTPS y el callback correspondiente en Google OAuth.

## Validación

```sh
npm run lint
npm run build
node --experimental-strip-types --test tests/auth-policy.test.mjs tests/doordash.test.mjs tests/import-orders.test.mjs
```

Con servidor de producción local en puerto 3100:

```sh
node --test tests/auth-http.test.mjs
```

Integración PocketBase: crea y elimina registros temporales propios de prueba.

```sh
node --env-file=.env.local --conditions=react-server --experimental-strip-types --test tests/pocketbase.integration.mjs
```

26 pruebas automatizadas y 15 verificaciones de navegador aprobadas. Ver dogfood-output/report.md. Pendiente validar lectura del Gmail real tras nuevo consentimiento.
# foodhub
