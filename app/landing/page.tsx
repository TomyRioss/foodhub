import type { Metadata } from "next";
import Link from "next/link";
import type { IconType } from "react-icons";
import { SiDoordash, SiUbereats } from "react-icons/si";
import { TbPaperBag } from "react-icons/tb";
import {
  LuBellRing,
  LuChartColumn,
  LuCheck,
  LuCopyX,
  LuKeyRound,
  LuLayers,
  LuMailOpen,
  LuMonitor,
  LuPrinter,
  LuReceipt,
  LuShieldCheck,
  LuStore,
  LuTablet,
  LuTicketPercent,
  LuTimer,
} from "react-icons/lu";
import {
  DiscountSuggestionMock,
  KitchenDisplayMock,
  PrintedTicketMock,
  StationScreensMock,
  StatsMock,
} from "@/components/landing/mockups";

export const metadata: Metadata = {
  title: "Foodhub · Pantalla de cocina para pedidos de DoorDash, Uber Eats y Grubhub",
  description:
    "Recibe los pedidos de todas tus apps de delivery en una sola cocina: pantallas por estación, tickets impresos, estadísticas y sugerencias de descuentos.",
};

const SIGN_IN_URL = "/api/auth/signin?callbackUrl=%2F";
/** Correo de ventas. Defínelo en NEXT_PUBLIC_SALES_EMAIL; sin él, el botón lleva al inicio de sesión. */
const SALES_EMAIL = process.env.NEXT_PUBLIC_SALES_EMAIL;
const DEMO_URL = SALES_EMAIL
  ? `mailto:${SALES_EMAIL}?subject=${encodeURIComponent("Quiero una demo de Foodhub")}`
  : SIGN_IN_URL;

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--brand)";

/* ------------------------------------------------------------------ */

/**
 * Paleta "Mango y violeta" de la página de ventas.
 * El violeta se separa del rojo, verde y naranja de las plataformas de delivery;
 * el mango marca la acción principal sobre fondos oscuros.
 */
const PALETTE = {
  "--brand": "#5b2ee6",
  "--brand-hover": "#4a22c9",
  "--brand-soft": "#efeaff",
  "--brand-ink": "#3b1aa3",
  "--deep": "#24154f",
  "--mango": "#ffc83d",
  "--mango-hover": "#ffb914",
  "--ink": "#1c1633",
  "--ink-soft": "#3d3560",
  "--muted": "#625b7a",
  "--canvas": "#f7f5fc",
  "--lane": "#ece8f7",
  "--line": "#e2ddf0",
  "--line-strong": "#cfc8e4",
} as React.CSSProperties;

export default function SalesPage() {
  return (
    <div style={PALETTE} className="flex min-h-full flex-col bg-(--canvas) text-(--ink)">
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <PainPoints />
        <KitchenScreens />
        <Printing />
        <Stats />
        <Discounts />
        <Setup />
        <Pricing />
        <Faq />
        <FinalCall />
      </main>
      <SiteFooter />
      <MobileCtaBar />
    </div>
  );
}

function Container({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <div className={`mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-10 ${className}`}>{children}</div>;
}

function PrimaryLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-(--mango) px-6 text-base font-semibold text-(--ink) transition-colors hover:bg-(--mango-hover) focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
    >
      {children}
    </a>
  );
}

function SecondaryLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-white/25 px-6 text-base font-medium text-white transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
    >
      {children}
    </a>
  );
}

function SectionHeading({ id, title, intro }: { id: string; title: string; intro: string }) {
  return (
    <div className="max-w-2xl">
      <h2 id={id} className="text-[28px] leading-tight font-[650] tracking-[-0.03em] text-balance sm:text-[36px]">
        {title}
      </h2>
      <p className="mt-3 text-base leading-relaxed text-(--muted) sm:text-[17px]">{intro}</p>
    </div>
  );
}

type Feature = { icon: IconType; title: string; body: string };

function FeatureItem({ f }: { f: Feature }) {
  return (
    <div className="flex gap-3.5">
      <f.icon className="mt-0.5 size-5 shrink-0 text-(--brand)" aria-hidden />
      <div>
        <p className="font-semibold">{f.title}</p>
        <p className="mt-1 max-w-[52ch] text-[15px] leading-relaxed text-(--muted)">{f.body}</p>
      </div>
    </div>
  );
}

function FeatureList({ items, className = "space-y-5" }: { items: Feature[]; className?: string }) {
  return (
    <ul className={className}>
      {items.map((f) => (
        <li key={f.title}>
          <FeatureItem f={f} />
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------ Header ------------------------------ */

const NAV = [
  ["#pantallas", "Pantallas"],
  ["#impresion", "Impresión"],
  ["#estadisticas", "Estadísticas"],
  ["#descuentos", "Descuentos"],
  ["#precios", "Precios"],
];

function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 bg-(--deep) text-white">
      <Container className="flex h-14 items-center justify-between gap-6 sm:h-16">
        <Link
          href="/landing"
          className="rounded-md text-[24px] font-extrabold tracking-[-0.035em] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white sm:text-[26px]"
        >
          foodhub
        </Link>
        <nav aria-label="Secciones principales" className="hidden items-center gap-1 lg:flex">
          {NAV.map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="rounded-md px-3 py-2 text-sm font-medium text-white/75 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              {label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-1.5">
          <a
            href={SIGN_IN_URL}
            className="inline-flex h-9 items-center rounded-md px-3 text-sm font-medium text-white/85 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Entrar
          </a>
          <a
            href={DEMO_URL}
            className="hidden h-9 items-center rounded-md bg-(--mango) px-4 text-sm font-semibold text-(--ink) hover:bg-(--mango-hover) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:inline-flex"
          >
            Pedir una demo
          </a>
        </div>
      </Container>
      <nav
        aria-label="Secciones"
        className="flex gap-1.5 overflow-x-auto border-t border-white/10 px-4 py-2 [scrollbar-width:none] lg:hidden [&::-webkit-scrollbar]:hidden"
      >
        {NAV.map(([href, label]) => (
          <a
            key={href}
            href={href}
            className="shrink-0 rounded-full bg-white/10 px-3.5 py-1.5 text-[13px] font-medium text-white/85 focus-visible:outline-2 focus-visible:outline-white"
          >
            {label}
          </a>
        ))}
      </nav>
    </header>
  );
}

/* ------------------------------- Hero ------------------------------- */

const HERO_PLATFORMS = [
  { name: "DoorDash", icon: SiDoordash, color: "#ff3008" },
  { name: "Uber Eats", icon: SiUbereats, color: "#06c167" },
  { name: "Grubhub", icon: TbPaperBag, color: "#f63440" },
];

function Hero() {
  return (
    <section aria-labelledby="hero-title" className="overflow-hidden bg-(--deep) pt-10 pb-14 text-white sm:pt-16 lg:pb-20">
      <Container>
        <div className="max-w-3xl sm:mx-auto sm:text-center">
          <h1
            id="hero-title"
            className="text-[40px] leading-[1.02] font-[680] tracking-[-0.05em] text-balance sm:text-[56px] lg:text-[68px]"
          >
            Una sola cocina para todas tus apps de delivery.
          </h1>
          <p className="mt-5 max-w-[58ch] text-[17px] leading-relaxed text-white/75 sm:mx-auto sm:mt-6 sm:text-lg">
            Los pedidos de DoorDash, Uber Eats y Grubhub llegan a la misma pantalla, se imprimen solos y se ordenan por
            estación. Al cierre del día sabes qué vendiste, dónde y a qué hora.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <PrimaryLink href={DEMO_URL}>Pedir una demo</PrimaryLink>
            <SecondaryLink href="#precios">Ver precios</SecondaryLink>
          </div>
          <ul className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/80 sm:justify-center">
            {HERO_PLATFORMS.map((p) => (
              <li key={p.name} className="inline-flex items-center gap-2">
                <span className="grid size-6 place-items-center rounded-md bg-white" style={{ color: p.color }} aria-hidden>
                  <p.icon className="size-3.5" />
                </span>
                {p.name}
              </li>
            ))}
          </ul>
        </div>
        <div className="-mx-4 mt-10 sm:mx-auto sm:mt-14 sm:max-w-4xl">
          <KitchenDisplayMock />
        </div>
      </Container>
    </section>
  );
}

/* ---------------------------- Problemas ---------------------------- */

const PAINS = [
  {
    before: "Tres tabletas sonando en el mostrador",
    after: "Una pantalla con todos los pedidos, ordenados por hora de retiro.",
  },
  {
    before: "Pedidos copiados a mano en papel",
    after: "Cada pedido se imprime al entrar, con opciones y notas del cliente.",
  },
  {
    before: "Cuentas que no cuadran al cierre",
    after: "Ventas por plataforma, por producto y por hora, sin hojas de cálculo.",
  },
];

function PainPoints() {
  return (
    <section aria-label="Lo que cambia en tu cocina" className="border-y border-(--line) bg-white py-14 sm:py-16">
      <Container>
        <ul className="grid gap-8 md:grid-cols-3 md:gap-10">
          {PAINS.map((p) => (
            <li key={p.before}>
              <p className="text-[15px] text-(--muted) line-through decoration-[#b32631]/50">{p.before}</p>
              <p className="mt-2 text-lg leading-snug font-[650] tracking-[-0.02em]">{p.after}</p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

/* ---------------------------- Pantallas ---------------------------- */

function KitchenScreens() {
  return (
    <section id="pantallas" aria-labelledby="pantallas-title" className="scroll-mt-28 lg:scroll-mt-20 py-16 sm:py-24">
      <Container>
        <SectionHeading
          id="pantallas-title"
          title="Una pantalla de comanda para cada estación"
          intro="La plancha ve lo que va a la plancha, la freidora lo suyo y quien despacha sabe qué bolsa sale primero. Usa las tabletas o televisores que ya tienes."
        />
        <div className="mt-10">
          <StationScreensMock />
        </div>
        <FeatureList
          className="mt-12 grid gap-8 md:grid-cols-3"
          items={[
            {
              icon: LuLayers,
              title: "Pantallas por estación",
              body: "Asigna productos a cada estación una vez. Cada comanda se reparte sola.",
            },
            {
              icon: LuTimer,
              title: "Tiempos a la vista",
              body: "El borde de la comanda pasa de verde a ámbar y a rojo según el tiempo de espera.",
            },
            {
              icon: LuBellRing,
              title: "Aviso al llegar un pedido",
              body: "Un sonido por pedido nuevo, sin importar de qué app viene.",
            },
          ]}
        />
      </Container>
    </section>
  );
}

/* ---------------------------- Impresión ---------------------------- */

function Printing() {
  return (
    <section id="impresion" aria-labelledby="impresion-title" className="scroll-mt-28 lg:scroll-mt-20 border-t border-(--line) bg-white py-16 sm:py-24">
      <Container className="grid items-center gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-16">
        <div>
          <SectionHeading
            id="impresion-title"
            title="Tickets impresos sin tocar nada"
            intro="Cada pedido sale de la impresora apenas entra. Letra grande para la cocina, opciones debajo de cada producto y la hora de retiro arriba."
          />
          <FeatureList
            className="mt-8 space-y-5"
            items={[
              {
                icon: LuPrinter,
                title: "Impresoras térmicas de 80 mm",
                body: "Conectadas por red o USB a la computadora o tableta de la cocina.",
              },
              {
                icon: LuReceipt,
                title: "Comanda y etiqueta de bolsa",
                body: "Una copia para cocinar y otra para pegar en el pedido con el nombre del cliente.",
              },
              {
                icon: LuCopyX,
                title: "Nunca dos veces",
                body: "Si el correo llega repetido, el pedido no se imprime de nuevo. Reimprimir es un botón.",
              },
            ]}
          />
        </div>
        <PrintedTicketMock />
      </Container>
    </section>
  );
}

/* --------------------------- Estadísticas --------------------------- */

function Stats() {
  return (
    <section id="estadisticas" aria-labelledby="estadisticas-title" className="scroll-mt-28 lg:scroll-mt-20 py-16 sm:py-24">
      <Container className="grid items-start gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
        <div className="lg:sticky lg:top-28">
          <SectionHeading
            id="estadisticas-title"
            title="Tus números sin abrir tres portales"
            intro="Foodhub suma los pedidos de todas las apps y te muestra el negocio completo: cuánto vendes, en qué plataforma y a qué hora se llena la cocina."
          />
          <FeatureList
            className="mt-8 space-y-5"
            items={[
              {
                icon: LuChartColumn,
                title: "Venta por plataforma y por producto",
                body: "Descubre qué app te deja más pedidos y qué plato se vende en cada una.",
              },
              {
                icon: LuTimer,
                title: "Horas pico y tiempo en cocina",
                body: "Planea turnos y preparación con base en lo que pasó, no en la intuición.",
              },
              {
                icon: LuReceipt,
                title: "Exporta a Excel",
                body: "Lleva los datos a tu contador o a tu hoja de costos cuando quieras.",
              },
            ]}
          />
        </div>
        <StatsMock />
      </Container>
    </section>
  );
}

/* ---------------------------- Descuentos ---------------------------- */

function Discounts() {
  return (
    <section id="descuentos" aria-labelledby="descuentos-title" className="scroll-mt-28 lg:scroll-mt-20 border-t border-(--line) bg-white py-16 sm:py-24">
      <Container className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div>
          <SectionHeading
            id="descuentos-title"
            title="Descuentos que tienen sentido para tu margen"
            intro="Foodhub mira tus horas flojas y tus productos con mejor margen, y te sugiere promociones concretas. Tú decides si las activas en la plataforma."
          />
          <FeatureList
            className="mt-8 space-y-5"
            items={[
              {
                icon: LuTicketPercent,
                title: "Sugerencias con números",
                body: "Cada sugerencia dice en qué franja, en qué app, cuánto baja el margen y cuántos pedidos necesitas para cubrirlo.",
              },
              {
                icon: LuChartColumn,
                title: "Mide si funcionó",
                body: "Guarda la promoción y compara la semana con la anterior. Si no movió pedidos, lo verás.",
              },
              {
                icon: LuShieldCheck,
                title: "Nada se activa solo",
                body: "Foodhub no cambia precios ni crea promociones en tus cuentas de delivery.",
              },
            ]}
          />
        </div>
        <DiscountSuggestionMock />
      </Container>
    </section>
  );
}

/* ------------------------------ Setup ------------------------------ */

const SETUP: Feature[] = [
  {
    icon: LuMailOpen,
    title: "Conecta el correo del local",
    body: "Entras con la cuenta de Google donde llegan los pedidos. Foodhub solo pide permiso de lectura.",
  },
  {
    icon: LuTablet,
    title: "Abre Foodhub en la cocina",
    body: "En una tableta, computadora o televisor con navegador. Asignas estaciones y conectas la impresora.",
  },
  {
    icon: LuMonitor,
    title: "Recibe el siguiente pedido",
    body: "Desde ese momento, cada pedido de cualquier app aparece en pantalla y sale impreso.",
  },
];

function Setup() {
  return (
    <section aria-labelledby="setup-title" className="py-16 sm:py-24">
      <Container>
        <SectionHeading
          id="setup-title"
          title="Funcionando en una tarde"
          intro="No reemplaza tu POS ni tus cuentas de delivery. Se conecta a lo que ya usas."
        />
        <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
          {SETUP.map((step, i) => (
            <li key={step.title}>
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-full bg-(--brand) text-sm font-semibold text-white tabular-nums">
                  {i + 1}
                </span>
                {i < SETUP.length - 1 && <span className="hidden h-px flex-1 bg-(--line) md:block" aria-hidden />}
              </div>
              <step.icon className="mt-6 hidden size-6 text-(--deep) md:block" aria-hidden />
              <h3 className="mt-3 text-lg font-[650] tracking-[-0.02em]">{step.title}</h3>
              <p className="mt-2 max-w-[42ch] text-[15px] leading-relaxed text-(--muted)">{step.body}</p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}

/* ------------------------------ Precios ------------------------------ */

type Plan = {
  name: string;
  price: number;
  pitch: string;
  features: string[];
  featured?: boolean;
};

const PLANS: Plan[] = [
  {
    name: "Esencial",
    price: 29,
    pitch: "Para empezar con una sola app.",
    features: ["DoorDash", "1 pantalla de cocina", "Impresión automática de tickets", "Historial de 30 días"],
  },
  {
    name: "Cocina",
    price: 59,
    pitch: "Para cocinas que reciben de varias apps.",
    featured: true,
    features: [
      "DoorDash, Uber Eats y Grubhub",
      "Pantallas por estación sin límite",
      "Comanda y etiqueta de bolsa",
      "Estadísticas y exportación a Excel",
    ],
  },
  {
    name: "Crecimiento",
    price: 99,
    pitch: "Para vender más con lo que ya tienes.",
    features: [
      "Todo lo de Cocina",
      "Sugerencias de descuentos",
      "Varias ubicaciones o food trucks",
      "Soporte prioritario por WhatsApp",
    ],
  },
];

function Pricing() {
  return (
    <section id="precios" aria-labelledby="precios-title" className="scroll-mt-28 lg:scroll-mt-20 border-t border-(--line) bg-white py-16 sm:py-24">
      <Container>
        <SectionHeading
          id="precios-title"
          title="Precios de lanzamiento"
          intro="Por ubicación, en dólares, sin contrato. Cancelas cuando quieras."
        />
        <div className="-mx-4 mt-10 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] lg:mx-0 lg:grid lg:grid-cols-3 lg:gap-4 lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden">
          {PLANS.map((plan) => (
            <article
              key={plan.name}
              className={`flex w-[84%] shrink-0 snap-center flex-col rounded-2xl p-6 sm:w-[60%] sm:p-7 lg:w-auto ${
                plan.featured ? "bg-(--deep) text-white" : "border border-(--line) bg-(--canvas)"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                {plan.featured && (
                  <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium">Recomendado</span>
                )}
              </div>
              <p className={`mt-1 text-sm ${plan.featured ? "text-white/70" : "text-(--muted)"}`}>{plan.pitch}</p>
              <p className="mt-6 flex items-baseline gap-1">
                <span className="text-[44px] leading-none font-[650] tracking-[-0.04em] tabular-nums">${plan.price}</span>
                <span className={plan.featured ? "text-white/70" : "text-(--muted)"}>/mes</span>
              </p>
              <ul className="mt-6 flex-1 space-y-2.5 text-[15px]">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2.5">
                    <LuCheck
                      className={`mt-1 size-4 shrink-0 ${plan.featured ? "text-(--mango)" : "text-(--brand)"}`}
                      aria-hidden
                    />
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href={DEMO_URL}
                className={`mt-8 inline-flex h-11 items-center justify-center rounded-md text-[15px] font-medium transition-colors ${
                  plan.featured
                    ? "bg-(--mango) text-(--ink) hover:bg-(--mango-hover) focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                    : `border border-(--line-strong) bg-white hover:bg-(--brand-soft) hover:text-(--brand-ink) ${focusRing}`
                }`}
              >
                Empezar con {plan.name}
              </a>
            </article>
          ))}
        </div>
        <p className="mt-2 text-center text-xs text-(--muted) lg:hidden">Desliza para ver los tres planes</p>
        <p className="mt-6 max-w-3xl text-sm leading-relaxed text-(--muted)">
          Foodhub está en acceso anticipado. La integración con DoorDash funciona hoy; Uber Eats, Grubhub y las funciones
          nuevas se activan en tu cuenta a medida que salen, sin costo adicional durante el lanzamiento.
        </p>
      </Container>
    </section>
  );
}

/* -------------------------------- FAQ -------------------------------- */

const FAQS = [
  {
    q: "¿Tengo que cambiar mi POS o mis cuentas de delivery?",
    a: "No. Foodhub trabaja con los correos que las plataformas ya te envían. Tu POS, tus menús y tus cuentas siguen igual.",
  },
  {
    q: "¿Qué necesito en la cocina?",
    a: "Cualquier tableta, computadora o televisor con navegador y, si quieres tickets impresos, una impresora térmica de 80 mm.",
  },
  {
    q: "¿Foodhub acepta o rechaza pedidos por mí?",
    a: "No. Nunca abre los enlaces de los correos ni confirma pedidos en los portales. Esa decisión sigue en tus manos.",
  },
  {
    q: "¿Qué pasa con mi correo?",
    a: "Foodhub solo tiene permiso de lectura y solo procesa los correos de pedidos. No envía, borra ni mueve mensajes.",
  },
  {
    q: "¿Y si un pedido no se puede leer?",
    a: "Aparece marcado en el tablero con el motivo y un botón para reintentar. El pedido no se pierde ni se duplica.",
  },
];

function Faq() {
  return (
    <section aria-labelledby="faq-title" className="py-16 sm:py-24">
      <Container className="grid gap-10 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] lg:gap-16">
        <h2 id="faq-title" className="text-[28px] leading-tight font-[650] tracking-[-0.03em] sm:text-[36px]">
          Preguntas frecuentes
        </h2>
        <div className="divide-y divide-(--line) border-y border-(--line)">
          {FAQS.map((f) => (
            <details key={f.q} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-md py-5 text-base font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--brand) [&::-webkit-details-marker]:hidden">
                {f.q}
                <span
                  className="grid size-6 shrink-0 place-items-center rounded-full border border-(--line) text-(--muted) transition-transform group-open:rotate-45"
                  aria-hidden
                >
                  +
                </span>
              </summary>
              <p className="max-w-[64ch] pb-5 text-[15px] leading-relaxed text-(--muted)">{f.a}</p>
            </details>
          ))}
        </div>
      </Container>
    </section>
  );
}

/* ----------------------------- CTA final ----------------------------- */

function FinalCall() {
  return (
    <section aria-labelledby="cta-title" className="pb-20">
      <Container>
        <div className="flex flex-col items-start justify-between gap-6 rounded-2xl bg-(--deep) px-6 py-10 text-white sm:px-10 md:flex-row md:items-center">
          <div>
            <h2 id="cta-title" className="text-2xl font-[650] tracking-[-0.03em] sm:text-[30px]">
              Ve tu cocina funcionando con tus propios pedidos
            </h2>
            <p className="mt-2 max-w-[56ch] text-white/70">
              En la demo conectamos tu correo y revisamos juntos los pedidos de los últimos 30 días.
            </p>
          </div>
          <a
            href={DEMO_URL}
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-md bg-(--mango) text-(--ink) px-5 text-[15px] font-medium transition-colors hover:bg-(--mango-hover) focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
          >
            <LuStore className="size-4" aria-hidden />
            Pedir una demo
          </a>
        </div>
      </Container>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-(--line) bg-white pb-20 sm:pb-0">
      <Container className="flex flex-col gap-3 py-8 text-sm text-(--muted) sm:flex-row sm:items-center sm:justify-between">
        <span className="text-lg font-extrabold tracking-[-0.035em] text-(--ink)">foodhub</span>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <span className="inline-flex items-center gap-1.5">
            <LuKeyRound className="size-3.5" aria-hidden />
            Acceso de solo lectura a tu correo
          </span>
          <a href={SIGN_IN_URL} className="font-medium text-(--ink) hover:underline">
            Entrar
          </a>
        </div>
      </Container>
    </footer>
  );
}

/** Barra fija en celular: la acción principal siempre a un toque. */
function MobileCtaBar() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-(--deep) px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:hidden">
      <div className="flex gap-2">
        <a
          href="#precios"
          className="inline-flex h-12 flex-1 items-center justify-center rounded-lg border border-white/25 text-[15px] font-medium text-white focus-visible:outline-2 focus-visible:outline-white"
        >
          Precios
        </a>
        <a
          href={DEMO_URL}
          className="inline-flex h-12 flex-[2] items-center justify-center rounded-lg bg-(--mango) text-[15px] font-semibold text-(--ink) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          Pedir una demo
        </a>
      </div>
    </div>
  );
}
