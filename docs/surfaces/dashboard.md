# Dashboard Foodhub
Mode: Operate.
Artifact: components/dashboard.tsx; app/globals.css.
Direction: centro despacho courier. Seed: 5f2efb14, assigned candidate 5.
Authorization: usuario pidió completar MVP y agregar análisis de todos los correos recibidos de últimos 30 días; implementación dentro del alcance funcional confirmado.

THESIS: operador identifica pedidos entrantes y los mueve por cuatro estados persistentes.
OWN-WORLD: centro de despacho, petróleo en conexión y azul para acciones, superficies claras para lectura frecuente.
STORY: conectar Gmail; analizar correo; abrir detalle; preparar, enviar y completar.
FIRST VIEWPORT: header cuenta, título operativo, estado conexión, acciones analizar30 y recientes, tablero cuatro carriles.
FORM: ancho máximo1600, tickets compactos, fechas e importes visibles, controles nativos y sin SVG.
SIGNATURE INTERACTION: mover ticket entre carriles con drag y select accesible equivalente.
MOTION: ReactBits AnimatedContent en cabecera, desplazamiento12px 450ms; reducido desactiva movimiento. Progreso comunica trabajo sin inventar porcentaje.
CONTENT: datos reales. Empty columns cuando no hay pedidos. Errores visibles; reintentos deduplicados. No se confirma recepción al portal.
RISK: Gmail requiere consentimiento adicional; lectura PDF puede quedar incompleta y se explicita. Autenticación Google existente no implica permiso Gmail.
VERIFICATION: QA exploratorio coordinado por agente raíz; esta documentación registra implementación y no certifica login/lectura Gmail reales.

