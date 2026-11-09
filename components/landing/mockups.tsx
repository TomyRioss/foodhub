import { SiDoordash, SiUbereats } from "react-icons/si";
import { TbPaperBag } from "react-icons/tb";
import { LuChefHat, LuFlame, LuPackageCheck, LuPrinter, LuTicketPercent, LuTimer } from "react-icons/lu";
import AnimatedContent from "@/components/react-bits/animated-content";

/*
 * Vistas de ejemplo para la página de ventas.
 * Todo el contenido es ilustrativo y se rotula como tal en la página:
 * el producto nunca muestra pedidos ficticios como datos reales.
 */

type PlatformKey = "doordash" | "ubereats" | "grubhub";

const PLATFORM_CHIP: Record<PlatformKey, { label: string; className: string }> = {
  doordash: { label: "DoorDash", className: "bg-[#fff0ef] text-[#a5342d]" },
  ubereats: { label: "Uber Eats", className: "bg-[#e7f7ee] text-[#126b3b]" },
  grubhub: { label: "Grubhub", className: "bg-[#fff1e8] text-[#a8461c]" },
};

function PlatformChip({ platform }: { platform: PlatformKey }) {
  const chip = PLATFORM_CHIP[platform];
  return <span className={`rounded px-1.5 py-[3px] text-[10px] font-medium ${chip.className}`}>{chip.label}</span>;
}

type Age = "fresh" | "warn" | "late";

const AGE_STYLE: Record<Age, string> = {
  fresh: "border-l-[#1f9d55] text-[#17663a]",
  warn: "border-l-[#d98a0b] text-[#8a5300]",
  late: "border-l-[#b32631] text-[#b32631]",
};

type KdsTicket = {
  platform: PlatformKey;
  id: string;
  minutes: number;
  age: Age;
  items: string[];
};

function KdsCard({ ticket }: { ticket: KdsTicket }) {
  return (
    <div className={`rounded-md border border-(--line) border-l-[3px] bg-white p-2 ${AGE_STYLE[ticket.age]}`}>
      <div className="flex items-center justify-between gap-1">
        <PlatformChip platform={ticket.platform} />
        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold tabular-nums">
          <LuTimer className="size-2.5" aria-hidden />
          {ticket.minutes} min
        </span>
      </div>
      <p className="mt-1 font-mono text-[9px] text-(--muted)">#{ticket.id}</p>
      <ul className="mt-1 space-y-0.5 text-[11px] leading-snug text-(--ink)">
        {ticket.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

const KDS_COLUMNS: { name: string; tickets: KdsTicket[] }[] = [
  {
    name: "Pendientes",
    tickets: [
      { platform: "ubereats", id: "4c19", minutes: 1, age: "fresh", items: ["2× Choripán", "1× Papas"] },
      { platform: "doordash", id: "e7a2", minutes: 3, age: "fresh", items: ["3× Empanada", "1× Café"] },
    ],
  },
  {
    name: "En preparación",
    tickets: [
      { platform: "grubhub", id: "91bd", minutes: 9, age: "warn", items: ["1× Steak bowl", "1× Patacón"] },
      { platform: "doordash", id: "b20f", minutes: 16, age: "late", items: ["2× Arepa rellena"] },
    ],
  },
  {
    name: "Listos",
    tickets: [{ platform: "doordash", id: "07ce", minutes: 12, age: "fresh", items: ["1× Perro colombiano"] }],
  },
];

/** Pantalla de cocina del hero. */
export function KitchenDisplayMock() {
  return (
    <figure
      aria-label="Vista de ejemplo de la pantalla de cocina con pedidos de tres plataformas"
      className="rounded-none bg-white/10 p-2.5 ring-white/15 sm:rounded-2xl sm:p-3 sm:ring-1"
    >
      <div className="overflow-hidden rounded-xl bg-(--canvas) text-(--ink)">
        <div className="flex items-center justify-between gap-3 border-b border-(--line) bg-white px-3 py-2">
          <span className="text-sm font-extrabold tracking-[-0.035em]">foodhub</span>
          <div className="flex gap-1 text-[10px] font-medium" role="presentation">
            <span className="rounded bg-(--brand) px-2 py-1 text-white">Todas</span>
            <span className="rounded px-2 py-1 text-(--muted)">Plancha</span>
            <span className="hidden rounded px-2 py-1 text-(--muted) sm:inline">Freidora</span>
            <span className="hidden rounded px-2 py-1 text-(--muted) sm:inline">Despacho</span>
          </div>
          <span className="hidden text-[10px] text-(--muted) tabular-nums sm:inline">5 abiertos</span>
        </div>
        <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto p-2.5 [scrollbar-width:none] sm:grid sm:grid-cols-3 sm:overflow-visible [&::-webkit-scrollbar]:hidden">
          {KDS_COLUMNS.map((col, colIndex) => (
            <div key={col.name} className="w-[72%] min-w-0 shrink-0 snap-start rounded-lg bg-(--lane) p-1.5 sm:w-auto">
              <div className="flex items-center justify-between px-1 pb-1.5">
                <span className="truncate text-[11px] font-semibold">{col.name}</span>
                <span className="text-[10px] tabular-nums text-(--muted)">{col.tickets.length}</span>
              </div>
              <div className="space-y-1.5">
                {col.tickets.map((t, i) =>
                  colIndex === 0 && i === 0 ? (
                    <AnimatedContent key={t.id} distance={10} duration={0.5} delay={0.6} threshold={0}>
                      <KdsCard ticket={t} />
                    </AnimatedContent>
                  ) : (
                    <KdsCard key={t.id} ticket={t} />
                  ),
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      <figcaption className="px-1.5 pt-2.5 text-[11px] text-white/65">
        Vista de ejemplo. El borde de cada comanda cambia de color según el tiempo de espera.
      </figcaption>
    </figure>
  );
}

const STATIONS = [
  { name: "Plancha", icon: LuFlame, items: ["2× Choripán", "1× Steak bowl", "2× Arepa rellena"] },
  { name: "Freidora", icon: LuChefHat, items: ["1× Papas", "1× Patacón", "3× Empanada"] },
  { name: "Despacho", icon: LuPackageCheck, items: ["#07ce listo para DoorDash", "#4c19 empacando"] },
];

/** Tres pantallas, una por estación. */
export function StationScreensMock() {
  return (
    <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden" aria-label="Ejemplo: una pantalla por estación">
      {STATIONS.map((s) => (
        <div key={s.name} className="w-[78%] shrink-0 snap-center rounded-xl bg-(--deep) p-1.5 sm:w-auto">
          <div className="h-full rounded-lg bg-white p-3">
            <div className="flex items-center gap-2 border-b border-(--line) pb-2">
              <s.icon className="size-4 text-(--brand)" aria-hidden />
              <span className="text-sm font-semibold">{s.name}</span>
            </div>
            <ul className="mt-2 space-y-1.5 text-[13px] text-(--ink-soft)">
              {s.items.map((item) => (
                <li key={item} className="rounded bg-(--canvas) px-2 py-1.5">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Ticket térmico de 80 mm. */
export function PrintedTicketMock() {
  return (
    <figure aria-label="Ejemplo de ticket impreso" className="mx-auto w-full max-w-[290px]">
      <div className="flex items-center justify-center gap-2 rounded-t-xl bg-(--deep) py-2.5 text-xs font-medium text-white/80">
        <LuPrinter className="size-4" aria-hidden />
        Impresora de cocina
      </div>
      <div className="bg-white px-5 pt-5 pb-6 font-mono text-[12px] leading-relaxed text-[#1d2a30] shadow-[0_18px_40px_-20px_rgba(36,21,79,0.45)] [mask-image:linear-gradient(to_bottom,black_calc(100%-10px),transparent)]">
        <p className="text-center text-[15px] font-bold tracking-tight">A TU ANTOJO</p>
        <p className="text-center text-[11px]">Comanda de cocina</p>
        <div className="my-3 border-t border-dashed border-[#9aa8b1]" />
        <div className="flex justify-between">
          <span>DoorDash</span>
          <span>#e7a21c40</span>
        </div>
        <div className="flex justify-between">
          <span>Retiro</span>
          <span>12:40 PM</span>
        </div>
        <div className="my-3 border-t border-dashed border-[#9aa8b1]" />
        <p className="font-bold">3  EMPANADA DE CARNE</p>
        <p className="font-bold">1  AREPA RELLENA</p>
        <p className="pl-4">- sin queso</p>
        <p className="pl-4">- salsa aparte</p>
        <p className="font-bold">1  CAFÉ AMERICANO</p>
        <div className="my-3 border-t border-dashed border-[#9aa8b1]" />
        <p>Nota: tocar el timbre al llegar</p>
      </div>
      <figcaption className="mt-3 text-center text-xs text-(--muted)">Ticket de ejemplo</figcaption>
    </figure>
  );
}

const HOURS = [
  { h: "11", v: 6 },
  { h: "12", v: 18 },
  { h: "13", v: 22 },
  { h: "14", v: 11 },
  { h: "15", v: 4 },
  { h: "16", v: 5 },
  { h: "17", v: 9 },
  { h: "18", v: 19 },
  { h: "19", v: 26 },
  { h: "20", v: 21 },
  { h: "21", v: 10 },
];

const SHARE = [
  { label: "DoorDash", pct: 54, color: "#ff3008", icon: SiDoordash },
  { label: "Uber Eats", pct: 31, color: "#06c167", icon: SiUbereats },
  { label: "Grubhub", pct: 15, color: "#f63440", icon: TbPaperBag },
];

/** Panel de estadísticas. */
export function StatsMock() {
  const max = Math.max(...HOURS.map((x) => x.v));
  return (
    <figure aria-label="Ejemplo de estadísticas semanales" className="rounded-2xl border border-(--line) bg-white p-5 sm:p-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { k: "Pedidos", v: "151" },
          { k: "Venta bruta", v: "$3,412" },
          { k: "Ticket promedio", v: "$22.60" },
          { k: "Tiempo en cocina", v: "11 min" },
        ].map((kpi) => (
          <div key={kpi.k}>
            <p className="text-xs text-(--muted)">{kpi.k}</p>
            <p className="mt-1 text-xl font-[650] tabular-nums tracking-[-0.02em]">{kpi.v}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 border-t border-(--line) pt-5">
        <p className="text-sm font-semibold">Pedidos por hora</p>
        <div className="mt-4 flex h-32 items-end gap-1.5" role="img" aria-label="Picos a la 1 p. m. y a las 7 p. m.; valle a las 3 p. m.">
          {HOURS.map((x) => (
            <div key={x.h} className="flex h-full flex-1 flex-col justify-end gap-1">
              <div
                className={`rounded-t-sm ${x.h === "15" ? "bg-(--mango)" : "bg-(--brand)"}`}
                style={{ height: `${(x.v / max) * 100}%` }}
              />
              <span className="text-center text-[10px] tabular-nums text-(--muted)">{x.h}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 border-t border-(--line) pt-5">
        <p className="text-sm font-semibold">Venta por plataforma</p>
        <div className="mt-3 flex h-2.5 overflow-hidden rounded-full">
          {SHARE.map((s) => (
            <div key={s.label} style={{ width: `${s.pct}%`, backgroundColor: s.color }} />
          ))}
        </div>
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
          {SHARE.map((s) => (
            <li key={s.label} className="inline-flex items-center gap-1.5">
              <s.icon className="size-3.5" style={{ color: s.color }} aria-hidden />
              {s.label}
              <span className="tabular-nums text-(--muted)">{s.pct}%</span>
            </li>
          ))}
        </ul>
      </div>
      <figcaption className="mt-5 text-xs text-(--muted)">Semana de ejemplo</figcaption>
    </figure>
  );
}

/** Tarjeta de sugerencia de descuento. */
export function DiscountSuggestionMock() {
  return (
    <figure aria-label="Ejemplo de sugerencia de descuento" className="rounded-2xl bg-(--deep) p-5 text-white sm:p-6">
      <div className="flex items-center gap-2 text-sm font-medium text-white/80">
        <LuTicketPercent className="size-4 text-(--mango)" aria-hidden />
        Sugerencia de la semana
      </div>
      <p className="mt-4 text-xl leading-snug font-[650] tracking-[-0.02em] text-balance">
        Entre 3 y 5 p. m. recibes 4 pedidos en promedio. Prueba 15% en el combo de empanadas solo en esa franja.
      </p>
      <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-white/15 pt-4 text-sm">
        <div>
          <dt className="text-white/60">Basado en</dt>
          <dd className="mt-0.5">6 semanas de pedidos</dd>
        </div>
        <div>
          <dt className="text-white/60">Margen del combo</dt>
          <dd className="mt-0.5 tabular-nums">62% → 47%</dd>
        </div>
        <div>
          <dt className="text-white/60">Dónde activarlo</dt>
          <dd className="mt-0.5">Promociones de DoorDash</dd>
        </div>
        <div>
          <dt className="text-white/60">Pedidos para cubrirlo</dt>
          <dd className="mt-0.5 tabular-nums">+3 por día</dd>
        </div>
      </dl>
      <div className="mt-5 flex flex-wrap gap-2">
        <span className="rounded-md bg-(--mango) px-3 py-1.5 text-sm font-semibold text-(--ink)">Guardar para medir</span>
        <span className="rounded-md border border-white/25 px-3 py-1.5 text-sm font-medium">Descartar</span>
      </div>
      <figcaption className="mt-5 text-xs text-white/60">Sugerencia de ejemplo</figcaption>
    </figure>
  );
}
