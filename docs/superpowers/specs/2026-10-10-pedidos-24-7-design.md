# Pedidos DoorDash 24/7

## Objetivo

Gmail → importación automática aunque navegador cerrado. Tablero abierto → pedido nuevo visible en vivo.

## Arquitectura

- `POST /api/cron/orders` valida `CRON_SECRET` y ejecuta una pasada `scanOrders`; programador del host invoca cada 60 s.
- Reusar importador, lease, `lastSyncedAt` y deduplicación existentes.
- Tablero autenticado abre `GET /api/orders/events`; servidor suscribe a PocketBase y emite SSE al guardar pedido. Cliente deduplica eventos, reconecta y recarga periódicamente como respaldo.
- Host Next.js no identificado. Instalación 24/7 requiere runtime Node, programador del proveedor, acceso a PocketBase y soporte SSE.

## Fallos y recuperación

- Error Gmail/guardado → no avanzar `lastSyncedAt`; próximo ciclo reintenta.
- Lease evita análisis simultáneos; dedupe conserva estado de pedido existente.
- Token Gmail ausente/vencido → error visible; no informar sincronización exitosa.
- Sin cambios de esquema ni operaciones manuales sobre base.

## Latencia

Importación: hasta 60 s + procesamiento. Tras guardar → SSE actualiza tablero abierto.

## Alternativa diferida

Gmail Push/Pub/Sub → menor latencia; requiere topic, webhook público y renovación periódica de `watch`. Fuera de primera entrega.

## Aceptación

- Pedido recibido con navegador cerrado aparece tras ciclo automático.
- Tablero abierto recibe evento una vez; recarga conserva pedido.
- Reintento no duplica pedido ni cambia estado existente.
- Error Gmail no avanza `lastSyncedAt`; ciclo posterior recupera pedido.
- Ruta interna rechaza solicitud sin `CRON_SECRET`; stream rechaza sesión ausente.
