import { Botao } from "@/components/ui/botao";
import { Input } from "@/components/ui/input";
import { Vazio } from "@/components/ui/pagina";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import type { Contrato } from "@/lib/types";
import { atualizarLinkContrato, excluirContrato, marcarAssinado, marcarEnviado, voltarParaRascunho } from "./actions";

const etapas: Array<{ id: Contrato["status"]; label: string }> = [
  { id: "rascunho", label: "Rascunho" },
  { id: "enviado", label: "Enviado" },
  { id: "assinado", label: "Assinado" },
];

export function ListaContratos({ contratos }: { contratos: Contrato[] }) {
  if (!contratos.length) return <Vazio>Nenhum contrato ainda. Crie o primeiro abaixo.</Vazio>;

  return (
    <div className="space-y-4">
      {contratos.map((c) => {
        const idx = etapas.findIndex((e) => e.id === c.status);
        const enviar = marcarEnviado.bind(null, c.id, c.projeto_id);
        const assinar = marcarAssinado.bind(null, c.id, c.projeto_id);
        const rascunho = voltarParaRascunho.bind(null, c.id, c.projeto_id);
        const excluir = excluirContrato.bind(null, c.id, c.projeto_id);
        const salvarLink = atualizarLinkContrato.bind(null, c.id, c.projeto_id);

        return (
          <div key={c.id} className="rounded-[12px] bg-superficie p-5 border border-borda">
            {/* Linha do tempo rascunho → enviado → assinado */}
            <ol className="mb-4 flex items-center gap-2">
              {etapas.map((e, i) => (
                <li key={e.id} className="flex items-center gap-2">
                  <span
                    className={cn(
                      "rounded-[8px] px-2.5 py-1 text-xs font-medium",
                      i < idx && "bg-rosa-900 text-rosa-100",
                      i === idx && (e.id === "assinado" ? "bg-sucesso text-white" : "bg-rosa-600 text-rosa-50"),
                      i > idx && "bg-superficie-2 text-texto-mudo",
                    )}
                  >
                    {e.label}
                  </span>
                  {i < etapas.length - 1 && <span className={cn("h-px w-6", i < idx ? "bg-rosa-600" : "bg-superficie-2")} />}
                </li>
              ))}
            </ol>

            <dl className="mb-4 grid gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="rotulo">Criado em</dt>
                <dd className="text-texto-suave">{formatDate(c.criado_em)}</dd>
              </div>
              <div>
                <dt className="rotulo">Enviado em</dt>
                <dd className="text-texto-suave">{formatDate(c.data_envio)}</dd>
              </div>
              <div>
                <dt className="rotulo">Assinado em</dt>
                <dd className={cn("text-texto-suave", c.data_assinatura && "font-medium text-[#5fe07a]")}>{formatDate(c.data_assinatura)}</dd>
              </div>
            </dl>

            <form action={salvarLink} className="mb-4 flex items-end gap-2">
              <div className="flex-1">
                <label htmlFor={`link-${c.id}`} className="mb-1.5 block rotulo">
                  Link do documento
                </label>
                <Input id={`link-${c.id}`} name="link_documento" type="url" placeholder="https://" defaultValue={c.link_documento ?? ""} />
              </div>
              <Botao type="submit" variante="secundario">
                Salvar link
              </Botao>
              {c.link_documento && (
                <Botao href={c.link_documento} variante="terciario" className="pb-2">
                  Abrir ↗
                </Botao>
              )}
            </form>

            <div className="flex flex-wrap items-center gap-3 border-t border-borda/60 pt-4">
              {c.status === "rascunho" && (
                <form action={enviar}>
                  <Botao type="submit">Marcar como enviado</Botao>
                </form>
              )}
              {c.status !== "assinado" && (
                <form action={assinar}>
                  <Botao type="submit" variante={c.status === "enviado" ? "primario" : "secundario"}>
                    Marcar como assinado
                  </Botao>
                </form>
              )}
              {c.status !== "rascunho" && (
                <form action={rascunho}>
                  <button type="submit" className="text-xs text-texto-mudo underline underline-offset-4 hover:text-texto-suave">
                    Voltar pra rascunho
                  </button>
                </form>
              )}
              <form action={excluir} className="ml-auto">
                <button type="submit" className="text-xs text-[#ff8a8a] underline underline-offset-4 hover:opacity-80">
                  Excluir contrato
                </button>
              </form>
            </div>
          </div>
        );
      })}
    </div>
  );
}
