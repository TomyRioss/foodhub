# Product
<!-- impeccable:product-schema 1 -->
## Platform
web
## Users
Operador de local comida. Cuenta única atuantojofl@gmail.com.
## Product Purpose
Centralizar pedidos DoorDash recibidos por Gmail. Procesar correo y PDF. Kanban pendientes, preparación, enviados, completados.
## Capabilities and Constraints
Next.js + Auth.js Google. PocketBase foodhub VPS HTTP por IP. UI shadcn/ui + ReactBits. Botón analiza TODOS correos recibidos últimos30 días. Deduplicar plataforma+número. No confirmar pedidos al portal desde links del correo. No SVG. Datos reales; cero pedidos ficticios.
## Operating Context
Asunto Delivery order from Jeremiah A. for SMASH GULA: Order # b0ff3158; remitente orders@doordash.com. PDF contiene productos, cantidades, opciones, precios y retiro. Autorización Gmail read-only requiere consentimiento adicional. Login Google ya comprobado por usuario.
## Evidence on Hand
C:/Users/Pc/Downloads/delivery-b0ff3158.pdf. Pedido b0ff3158, SMASH GULA, Jeremiah A., total USD24.02. Ejemplo confirmado por usuario.
## Product Principles
Legibilidad operativa. Estados persistentes. Reintentos sin duplicados. Errores explícitos. Credenciales solamente servidor.
