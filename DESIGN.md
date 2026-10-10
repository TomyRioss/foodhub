---
name: Foodhub
description: Pedidos de Gmail a la cocina.
colors:
  primary: "#165bd6"
  dispatch: "#173b4c"
  ink: "#173440"
  secondary: "#eaf0f6"
  secondary-ink: "#274757"
  canvas: "#f4f7fa"
  surface: "#ffffff"
  lane: "#e9eff4"
  muted-ink: "#526774"
  border: "#d7e1e8"
  input: "#c4d1dc"
  danger: "#b32631"
typography:
  display:
    fontFamily: "Geist, sans-serif"
    fontSize: "36px"
    fontWeight: 650
    lineHeight: 1.15
    letterSpacing: "-0.035em"
  title:
    fontFamily: "Geist, sans-serif"
    fontSize: "19px"
    fontWeight: 650
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Geist, sans-serif"
    fontSize: "14px"
    fontWeight: 400
  label:
    fontFamily: "Geist, sans-serif"
    fontSize: "12px"
    fontWeight: 500
  data:
    fontFamily: "Geist Mono, monospace"
    fontSize: "10px"
  platform-label:
    fontFamily: "Geist, sans-serif"
    fontSize: "9px"
  compact-label:
    fontFamily: "Geist, sans-serif"
    fontSize: "11px"
  mobile-customer:
    fontFamily: "Geist, sans-serif"
    fontSize: "15px"
  customer-large:
    fontFamily: "Geist, sans-serif"
    fontSize: "18px"
  dialog-title:
    fontFamily: "Geist, sans-serif"
    fontSize: "24px"
  display-mobile:
    fontFamily: "Geist, sans-serif"
    fontSize: "31px"
rounded:
  control: "6px"
  input: "8px"
  surface: "12px"
  dialog: "16px"
spacing:
  compact: "8px"
  ticket: "16px"
  section: "24px"
  workspace: "40px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
    height: "36px"
  button-outline:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "36px"
  button-ghost:
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
  ticket:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.surface}"
    padding: "16px"
  search:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.input}"
    height: "40px"
---
# Design System: Foodhub

## Overview
**Creative North Star: "Centro de despacho"**
Una interfaz clara para operar pedidos. Superficies frías, contenido compacto y controles legibles sostienen la lectura rápida; el azul marca las acciones y el petróleo identifica la conexión con correo.

**Key Characteristics:**
- Jerarquía compacta y operativa.
- Superficies claras y carriles tonales.
- Movimiento breve; contenido visible desde el inicio.

## Colors
### Primary
Azul de acción: botones principales, enlaces y foco.
### Secondary
Petróleo de despacho: área de conexión; texto claro para contraste.
### Neutral
Lienzo frío, tickets blancos, carriles suaves y tinta azulada. Bordes organizan sin competir con los pedidos.
**The Action Rule.** El azul vivo identifica acciones y foco.

## Typography
Geist para títulos, clientes y controles. Geist Mono reservado a números identificadores. Importes y conteos usan cifras tabulares. El título principal baja a 31px en móvil; nombres de clientes se parten cuando exceden el ancho.

## Layout
Contenedor de hasta 1600px. Espacio lateral de 40px en escritorio, 24px debajo de 1100px, 18px debajo de 760px y 14px debajo de 420px. Las superficies ajustan su composición a esas medidas. Los carriles usan cuatro columnas, dos debajo de 760px y una debajo de 420px.

## Elevation & Depth
Superficies planas por defecto. El ticket gana sombra suave al pasar el puntero; el diálogo tiene elevación suficiente para indicar foco protegido.
**The Flat Rule.** Las tarjetas descansan sin sombra; la elevación acompaña interacción o diálogo.

## Shapes
Superficies redondeadas, controles compactos y bordes finos. Los puntos de conexión representan estado. No usar SVG: restricción explícita del usuario.

## Components
Botones shadcn con variantes principal, outline y ghost. Inputs de búsqueda claros y selects nativos para estado. Tickets blancos: plataforma, identificador, cliente, productos, total y hora. Detalle en diálogo HTML con cierre explícito y Escape. ReactBits AnimatedContent inicia la cabecera una vez con desplazamiento de 12px; respeta movimiento reducido y conserva contenido visible antes de hidratar.

## Do's and Don'ts
### Do:
- Do conservar foco visible y alternativas de teclado.
- Do mostrar contenido real y errores con recuperación.
- Do reservar monospace para identificadores.
### Don'ts:
- Don't usar SVG sin autorización explícita.
- Don't presentar pedidos ficticios como datos reales.
- Don't depender únicamente de arrastrar para cambiar estados.



