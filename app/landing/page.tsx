import type { Metadata } from "next";
import Link from "next/link";
import type { IconType } from "react-icons";
import { SiDoordash, SiGmail, SiUbereats } from "react-icons/si";
import { TbPaperBag } from "react-icons/tb";
import {
  LuArrowDown,
  LuCheck,
  LuCopyX,
  LuFileText,
  LuInbox,
  LuKeyRound,
  LuMailOpen,
  LuShieldCheck,
  LuTriangleAlert,
} from "react-icons/lu";
import AnimatedContent from "@/components/react-bits/animated-content";

export const metadata: Metadata = {
  title: "Foodhub · Todos tus pedidos de delivery en un solo tablero",
  description:
    "Foodhub lee los pedidos que DoorDash, Uber Eats y Grubhub envían a tu correo y los ordena en un tablero para tu cocina.",
};

const SIGN_IN_URL = "/api/auth/signin?callbackUrl=%2F";

type PlatformStatus = "live" | "soon";

type Platform = {
  name: string;
  icon: IconType;
  color: string;
  status: PlatformStatus;
  detail: string;
};

const PLATFORMS: Platform[] = [
  {
    name: "DoorDash",
    icon: SiDoordash,
    color: "#ff3008",
    status: "live",
    detail: "Lee el correo de cada pedido y el PDF adjunto: productos, opciones, precios y hora de retiro.",
  },
  {
    name: "Uber Eats",
    icon: SiUbereats,
    color: "#06c167",
    status: "soon",
    detail: "En desarrollo. Los pedidos llegarán al mismo tablero, con el mismo formato de ticket.",
  },
  {
    name: "Grubhub",
    icon: TbPaperBag,
    color: "#f63440",
    status: "soon",
    detail: "En desarrollo. Mismo flujo: correo, lectura del pedido y ticket en la columna de pendientes.",
  },
];

const STEPS = [
  {
    icon: LuMailOpen,
    title: "Conecta el correo del local",
    body: "Entras con la cuenta de Google donde llegan los pedidos. Foodhub solo pide permiso de lectura.",
  },
  {
    icon: LuFileText,
    title: "Foodhub lee cada pedido",
    body: "Revisa los correos de las plataformas, abre el PDF y extrae cliente, productos, opciones, total y hora.",
  },
  {
    icon: LuInbox,
    title: "La cocina trabaja desde el tablero",
    body: "Cada pedido entra como ticket en Pendientes y avanza de columna a medida que se prepara y se entrega.",
  },
];

const LANES = [
  { name: "Pendientes", body: "Pedidos recién leídos del correo, listos para aceptar en cocina." },
  { name: "En preparación", body: "Lo que está en la plancha. El ticket muestra opciones y notas del cliente." },
  { name: "Enviados", body: "Entregados al repartidor. Quedan visibles hasta cerrar el pedido." },
  { name: "Completados", body: "Historial del día para cuadrar ventas por plataforma." },
];

const GUARANTEES = [
  {
    icon: LuKeyRound,
    title: "Acceso de solo lectura",
    body: "Foodhub lee tu correo; no envía, borra ni mueve mensajes.",
  },
  {
    icon: LuCopyX,
    title: "Sin pedidos duplicados",
    body: "Cada pedido se identifica por plataforma y número. Volver a sincronizar no lo repite.",
  },
  {
    icon: LuShieldCheck,
    title: "No toca el portal de la plataforma",
    body: "Nunca abre los enlaces del correo para confirmar pedidos. Esa decisión sigue siendo tuya.",
  },
  {
    icon: LuTriangleAlert,
    title: "Errores a la vista",
    body: "Si un PDF no se puede leer, el tablero lo dice y permite reintentar sin perder el pedido.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-full flex-col bg-[#f4f7fa] text-foreground">
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <HowItWorks />
        <Lanes />
        <Platforms />
        <Guarantees />
        <FinalCall />
      </main>
      <SiteFooter />
    </div>
  );
}

function Container({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <div className={`mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-10 ${className}`}>{children}</div>;
}

function SiteHeader() {
  return (
    <header className="border-b border-border bg-[#f4f7fa]/90 backdrop-blur supports-[backdrop-filter]:bg-[#f4f7fa]/75 sticky top-0 z-20">
      <Container className="flex h-16 items-center justify-between gap-6">
        <Link
          href="/landing"
          className="rounded-md text-[26px] font-extrabold tracking-[-0.035em] text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
        >
          foodhub
        </Link>
        <nav aria-label="Secciones" className="hidden items-center gap-1 md:flex">
          <NavLink href="#como-funciona">Cómo funciona</NavLink>
          <NavLink href="#tablero">El tablero</NavLink>
          <NavLink href="#plataformas">Plataformas</NavLink>
          <NavLink href="#seguridad">Seguridad</NavLink>
        </nav>
        <a
          href={SIGN_IN_URL}
          className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
        >
          Entrar
        </a>
      </Container>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      {children}
    </a>
  );
}

/* ------------------------------------------------------------------ */
/* Hero: tres plataformas entran por el correo y salen como un ticket */
/* ------------------------------------------------------------------ */

function Hero() {
  return (
    <section aria-labelledby="hero-title" className="pt-14 pb-16 sm:pt-20 lg:pb-24">
      <Container className="grid items-center gap-12 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.18fr)] lg:gap-12">
        <div className="max-w-xl">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1 text-xs font-medium text-secondary-foreground">
            <span className="size-1.5 rounded-full bg-[#1f9d55]" aria-hidden />
            DoorDash ya funciona. Uber Eats y Grubhub, en camino.
          </p>
          <h1
            id="hero-title"
            className="text-[34px] leading-[1.08] font-[650] tracking-[-0.04em] text-balance sm:text-5xl lg:text-[56px]"
          >
            Todos tus pedidos de delivery en un solo tablero de cocina.
          </h1>
          <p className="mt-6 max-w-[60ch] text-base leading-relaxed text-muted-foreground sm:text-lg">
            Foodhub lee los pedidos que las plataformas envían a tu correo, abre el PDF y los convierte en tickets
            ordenados. Sin saltar entre tres tabletas, sin copiar pedidos a mano.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <a
              href={SIGN_IN_URL}
              className="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-5 text-[15px] font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
            >
              <SiGmail className="size-4" aria-hidden />
              Entrar con Google
            </a>
            <a
              href="#como-funciona"
              className="inline-flex h-11 items-center gap-2 rounded-md border border-input bg-white px-5 text-[15px] font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
            >
              Ver cómo funciona
              <LuArrowDown className="size-4" aria-hidden />
            </a>
          </div>
        </div>

        <DispatchPanel />
      </Container>
    </section>
  );
}

function DispatchPanel() {
  return (
    <figure
      aria-label="Ejemplo: los pedidos de cada plataforma llegan por correo y Foodhub los convierte en un ticket"
      className="@container relative overflow-hidden rounded-2xl bg-[#173b4c] p-5 text-white sm:p-7"
    >
      <div className="grid gap-6 @[30rem]:grid-cols-[minmax(0,0.85fr)_auto_minmax(0,1fr)] @[30rem]:items-center @[30rem]:gap-3">
        {/* Entradas */}
        <ul className="space-y-2.5">
          {PLATFORMS.map((p) => (
            <li
              key={p.name}
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.06] px-3.5 py-3"
            >
              <span
                className="grid size-8 shrink-0 place-items-center rounded-lg bg-white"
                style={{ color: p.color }}
                aria-hidden
              >
                <p.icon className="size-[18px]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{p.name}</span>
                <span className="block text-xs text-white/60">
                  {p.status === "live" ? "Pedidos entrando" : "En desarrollo"}
                </span>
              </span>
              <span
                className={`size-2 shrink-0 rounded-full ${
                  p.status === "live" ? "bg-[#4ade80] shadow-[0_0_0_4px_rgba(74,222,128,0.18)]" : "bg-white/25"
                }`}
                aria-hidden
              />
            </li>
          ))}
        </ul>

        {/* Conector: correo → Foodhub */}
        <div className="flex flex-col items-center justify-center gap-2 @[30rem]:flex-row" aria-hidden>
          <span className="h-6 w-px border-l border-dashed border-white/30 @[30rem]:h-px @[30rem]:w-4 @[30rem]:border-l-0 @[30rem]:border-t" />
          <span className="grid size-10 place-items-center rounded-full border border-white/15 bg-white/10">
            <LuMailOpen className="size-[18px] text-white/85" />
          </span>
          <span className="h-6 w-px border-l border-dashed border-white/30 @[30rem]:h-px @[30rem]:w-4 @[30rem]:border-l-0 @[30rem]:border-t" />
        </div>

        {/* Ticket */}
        <AnimatedContent distance={14} duration={0.55} delay={0.25} ease="power3.out" threshold={0}>
          <ExampleTicket />
        </AnimatedContent>
      </div>

      <figcaption className="mt-6 border-t border-white/10 pt-4 text-xs leading-relaxed text-white/60">
        Ilustración del flujo con un pedido de ejemplo. En el tablero solo aparecen pedidos reales leídos de tu correo.
      </figcaption>
    </figure>
  );
}

function ExampleTicket() {
  return (
    <article className="rounded-xl bg-white p-4 text-foreground shadow-[0_18px_50px_rgba(8,24,34,0.35)]">
      <div className="flex items-center justify-between gap-3">
        <span className="rounded bg-[#fff0ef] px-1.5 py-[3px] text-[10px] font-medium text-[#a5342d]">DoorDash</span>
        <span className="font-mono text-[11px] text-muted-foreground">#e7a21c40</span>
      </div>
      <p className="mt-3 text-lg font-semibold tracking-[-0.02em]">Cliente de ejemplo</p>
      <ul className="mt-3 space-y-1.5 border-t border-border pt-3 text-sm">
        <li className="flex justify-between gap-3">
          <span>
            <span className="tabular-nums text-muted-foreground">2×</span> Empanada de carne
          </span>
          <span className="tabular-nums">$7.00</span>
        </li>
        <li className="flex justify-between gap-3">
          <span>
            <span className="tabular-nums text-muted-foreground">1×</span> Arepa rellena
            <span className="block pl-6 text-xs text-muted-foreground">Sin queso, salsa aparte</span>
          </span>
          <span className="tabular-nums">$9.50</span>
        </li>
      </ul>
      <div className="mt-3 flex items-end justify-between border-t border-border pt-3">
        <span className="text-xs text-muted-foreground">
          Retiro <span className="tabular-nums font-medium text-foreground">12:40 p. m.</span>
        </span>
        <span className="text-base font-semibold tabular-nums">$16.50</span>
      </div>
      <div className="mt-4 grid grid-cols-4 gap-1" aria-label="Estado: pendiente">
        {LANES.map((lane, i) => (
          <span
            key={lane.name}
            className={`h-1.5 rounded-full ${i === 0 ? "bg-primary" : "bg-[#e9eff4]"}`}
            title={lane.name}
          />
        ))}
      </div>
      <p className="mt-1.5 text-[11px] font-medium text-primary">Pendiente</p>
    </article>
  );
}

/* --------------------------- Cómo funciona --------------------------- */

function SectionHeading({ id, title, intro }: { id: string; title: string; intro: string }) {
  return (
    <div className="max-w-2xl">
      <h2 id={id} className="text-[28px] leading-tight font-[650] tracking-[-0.03em] sm:text-[34px]">
        {title}
      </h2>
      <p className="mt-3 text-base leading-relaxed text-muted-foreground">{intro}</p>
    </div>
  );
}

function HowItWorks() {
  return (
    <section id="como-funciona" aria-labelledby="como-funciona-title" className="scroll-mt-20 border-t border-border bg-white py-16 sm:py-20">
      <Container>
        <SectionHeading
          id="como-funciona-title"
          title="Del correo a la plancha en tres pasos"
          intro="Las plataformas ya te avisan de cada pedido por email. Foodhub usa ese mismo correo, así que no hay que instalar nada en las tabletas."
        />
        <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
          {STEPS.map((step, i) => (
            <li key={step.title} className="relative">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground tabular-nums">
                  {i + 1}
                </span>
                {i < STEPS.length - 1 && <span className="hidden h-px flex-1 bg-border md:block" aria-hidden />}
              </div>
              <step.icon className="mt-6 size-6 text-[#173b4c]" aria-hidden />
              <h3 className="mt-3 text-lg font-[650] tracking-[-0.02em]">{step.title}</h3>
              <p className="mt-2 max-w-[42ch] text-[15px] leading-relaxed text-muted-foreground">{step.body}</p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}

/* ----------------------------- Tablero ----------------------------- */

function Lanes() {
  return (
    <section id="tablero" aria-labelledby="tablero-title" className="scroll-mt-20 py-16 sm:py-20">
      <Container>
        <SectionHeading
          id="tablero-title"
          title="Cuatro columnas, un solo vistazo"
          intro="El tablero sigue el recorrido real de un pedido. Puedes arrastrar cada ticket o cambiar su estado desde el detalle, también con teclado."
        />
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {LANES.map((lane, i) => (
            <div key={lane.name} className="rounded-xl bg-[#e9eff4] p-3">
              <div className="flex items-center justify-between px-1 pb-3">
                <h3 className="text-sm font-semibold">{lane.name}</h3>
                <span className="text-xs tabular-nums text-muted-foreground">{i + 1} de 4</span>
              </div>
              <div className="rounded-lg border border-[#d4dfe8] bg-white p-3.5">
                <p className="text-sm leading-relaxed text-secondary-foreground">{lane.body}</p>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

/* --------------------------- Plataformas --------------------------- */

function Platforms() {
  return (
    <section id="plataformas" aria-labelledby="plataformas-title" className="scroll-mt-20 border-t border-border bg-white py-16 sm:py-20">
      <Container className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
        <SectionHeading
          id="plataformas-title"
          title="Plataformas"
          intro="Empezamos por DoorDash porque es donde más pedidos recibimos. Uber Eats y Grubhub entran al mismo tablero apenas estén listas."
        />
        <ul className="divide-y divide-border border-y border-border">
          {PLATFORMS.map((p) => (
            <li key={p.name} className="flex gap-4 py-5">
              <span
                className="grid size-11 shrink-0 place-items-center rounded-xl border border-border bg-[#f4f7fa]"
                style={{ color: p.color }}
                aria-hidden
              >
                <p.icon className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <h3 className="text-base font-semibold">{p.name}</h3>
                  {p.status === "live" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#e8f6ee] px-2 py-0.5 text-xs font-medium text-[#17663a]">
                      <LuCheck className="size-3" aria-hidden />
                      Disponible
                    </span>
                  ) : (
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                      Próximamente
                    </span>
                  )}
                </div>
                <p className="mt-1.5 max-w-[62ch] text-[15px] leading-relaxed text-muted-foreground">{p.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

/* --------------------------- Seguridad --------------------------- */

function Guarantees() {
  return (
    <section id="seguridad" aria-labelledby="seguridad-title" className="scroll-mt-20 py-16 sm:py-20">
      <Container>
        <SectionHeading
          id="seguridad-title"
          title="Lo que Foodhub no hace con tu cuenta"
          intro="Conectar el correo del negocio es una decisión seria. Estas reglas están escritas en el producto, no solo en esta página."
        />
        <dl className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2">
          {GUARANTEES.map((g) => (
            <div key={g.title} className="flex gap-4">
              <g.icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
              <div>
                <dt className="font-semibold">{g.title}</dt>
                <dd className="mt-1 max-w-[52ch] text-[15px] leading-relaxed text-muted-foreground">{g.body}</dd>
              </div>
            </div>
          ))}
        </dl>
      </Container>
    </section>
  );
}

/* ----------------------------- CTA final ----------------------------- */

function FinalCall() {
  return (
    <section aria-labelledby="cta-title" className="pb-20">
      <Container>
        <div className="flex flex-col items-start justify-between gap-6 rounded-2xl bg-[#173b4c] px-6 py-10 text-white sm:px-10 md:flex-row md:items-center">
          <div>
            <h2 id="cta-title" className="text-2xl font-[650] tracking-[-0.03em] sm:text-[28px]">
              Abre el tablero con la cuenta del local
            </h2>
            <p className="mt-2 max-w-[56ch] text-white/70">
              La primera sincronización revisa los correos de los últimos 30 días y arma el tablero con lo que encuentre.
            </p>
          </div>
          <a
            href={SIGN_IN_URL}
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-md bg-white px-5 text-[15px] font-medium text-[#173b4c] transition-colors hover:bg-[#eaf0f6] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
          >
            <SiGmail className="size-4 text-[#165bd6]" aria-hidden />
            Entrar con Google
          </a>
        </div>
      </Container>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-border bg-white">
      <Container className="flex flex-col gap-2 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span className="text-lg font-extrabold tracking-[-0.035em] text-foreground">foodhub</span>
        <span>Pedidos de delivery organizados para tu cocina.</span>
      </Container>
    </footer>
  );
}
