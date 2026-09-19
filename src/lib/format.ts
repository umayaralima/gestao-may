const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const brlInteiro = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const brlCompacto = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 });

export function formatBRL(valor: number | string | null | undefined) {
  if (valor === null || valor === undefined || valor === "") return "—";
  return brl.format(Number(valor));
}

/** Sem centavos, como o protótipo mostra nas tabelas e KPIs. */
export function fmt(valor: number | string | null | undefined) {
  if (valor === null || valor === undefined || valor === "") return "—";
  return brlInteiro.format(Number(valor));
}

/** R$ 432 mil, R$ 1,2 mi. */
export function fmtK(valor: number | string | null | undefined) {
  if (valor === null || valor === undefined || valor === "") return "—";
  return brlCompacto.format(Number(valor));
}

/** Recebe `YYYY-MM-DD` (coluna date) e devolve `dd/mm/aaaa` sem sofrer com fuso. */
export function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

/** `12 Set 2026`, como as tabelas do protótipo. */
export function fmtData(iso: string | null | undefined, comAno = true) {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d} ${MESES[Number(m) - 1]}${comAno ? ` ${y}` : ""}`;
}

/** "há 23 min", "há 3h", "Ontem", "12 Set". */
export function fmtRelativo(isoTimestamp: string) {
  const diff = Date.now() - new Date(isoTimestamp).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  if (d === 1) return "Ontem";
  if (d < 7) return `há ${d} dias`;
  return fmtData(isoTimestamp.slice(0, 10), false);
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Data local como `YYYY-MM-DD`. */
export function toISODate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Data de hoje como `YYYY-MM-DD` no fuso local. */
export function hojeISO() {
  return toISODate(new Date());
}

export function somarDias(iso: string, dias: number) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + dias);
  return toISODate(d);
}

/** Diferença em dias entre duas datas ISO (b - a). */
export function diffDias(a: string, b: string) {
  return Math.round((new Date(`${b}T00:00:00`).getTime() - new Date(`${a}T00:00:00`).getTime()) / 86400000);
}

export function primeiroEUltimoDiaDoMes(base = new Date()) {
  const y = base.getFullYear();
  const m = base.getMonth();
  const ultimo = new Date(y, m + 1, 0).getDate();
  return { inicio: `${y}-${pad(m + 1)}-01`, fim: `${y}-${pad(m + 1)}-${pad(ultimo)}` };
}

/** Rótulo curto do mês de um `YYYY-MM-DD`. */
export function mesCurto(iso: string) {
  return MESES[Number(iso.slice(5, 7)) - 1];
}

export function mesAnoExtenso(d = new Date()) {
  const s = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(d);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "Hoje", "Amanhã", "Ontem" ou `22 Set`. */
export function rotuloDia(iso: string | null | undefined) {
  if (!iso) return "Sem data";
  const d = diffDias(hojeISO(), iso);
  if (d === 0) return "Hoje";
  if (d === 1) return "Amanhã";
  if (d === -1) return "Ontem";
  return fmtData(iso, false);
}
