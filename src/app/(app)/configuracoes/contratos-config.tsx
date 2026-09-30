"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { BotaoConfirmar } from "@/components/ui/modal";
import { Campo, Input, MensagemErro, Select, Textarea } from "@/components/ui/primitivos";
import { cn } from "@/lib/cn";
import type { Configuracoes as Config, ModeloContrato, TipoProjeto } from "@/lib/types";
import { criarModeloContrato, excluirModeloContrato, salvarDadosContrato, salvarModeloContrato, type FormState } from "./actions";

/*
 * Aba Contratos: dados da contratada, corpo comum (cláusulas 1–16) e um modelo por tipo de serviço.
 * O corpo usa {{variaveis}} trocadas na hora de gerar (ver src/lib/contrato.ts).
 */

const VARIAVEIS_CORPO = [
  ["{{titulo}}", "título do contrato (do modelo do tipo)"],
  ["{{numero}}", "001/2026"],
  ["{{objeto}}", "cláusula 1.1 (do modelo do tipo)"],
  ["{{contratada_razao}} {{contratada_cnpj}} {{contratada_endereco}} {{contratada_email}}", "seus dados"],
  ["{{cliente_nome}} {{cliente_tipo_documento}} {{cliente_documento}} {{cliente_endereco}} {{cliente_email}} {{cliente_telefone}} {{cliente_representante}}", "do cadastro do cliente"],
  ["{{pagamento}}", "montado das parcelas do projeto"],
  ["{{hospedagem}}", "opção escolhida ao gerar"],
  ["{{portfolio}}", "item 13.2, conforme a autorização"],
  ["{{cidade_foro}} {{data_extenso}} {{assinaturas}} {{testemunhas_texto}}", "fecho e assinaturas"],
];
const VARIAVEIS_ANEXO = ["{{projeto_nome}}", "{{valor}}", "{{valor_extenso}}", "{{prazo_extenso}}"];

export function ContratosConfig({
  config,
  modelos,
  tipos,
  onSalvo,
}: {
  config: Config;
  modelos: ModeloContrato[];
  tipos: TipoProjeto[];
  onSalvo: (msg: string) => void;
}) {
  const semModelo = tipos.filter((t) => !modelos.some((m) => m.tipo_projeto === t.nome));

  return (
    <div className="space-y-5 entrar">
      <div>
        <h2 className="text-lg font-semibold text-[#F5F5F4] mb-0.5">Contratos</h2>
        <p className="text-xs text-[#968F88]">Seus dados, o corpo das cláusulas e o escopo de cada tipo de serviço</p>
      </div>

      <DadosEcorpo config={config} onSalvo={onSalvo} />

      <Secao titulo="Modelos por tipo de serviço" sub="Cada tipo tem seu título, objeto (cláusula 1.1), prazo e Anexo I. Mudanças aqui não alteram contratos já gerados.">
        {modelos.length === 0 && <p className="px-6 py-6 text-xs text-[#968F88]">Nenhum modelo ainda. Rode a migração 010 ou crie um abaixo.</p>}
        {modelos.map((m) => (
          <ModeloEditor key={m.id} modelo={m} onSalvo={onSalvo} />
        ))}
        <div className="px-6 py-4">
          <NovoModelo tipos={semModelo} modelos={modelos} />
        </div>
      </Secao>
    </div>
  );
}

function DadosEcorpo({ config, onSalvo }: { config: Config; onSalvo: (msg: string) => void }) {
  const [state, action, pending] = useActionState<FormState, FormData>(salvarDadosContrato, {});
  const [verVariaveis, setVerVariaveis] = useState(false);
  useEffect(() => {
    if (state.ok) onSalvo("Alterações salvas com sucesso");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={action} className="space-y-5">
      <Secao titulo="Seus dados no contrato" sub="Entram no cabeçalho (CONTRATADA) e no fecho.">
        <div className="px-6 py-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Campo label="Razão social" htmlFor="razao_social">
            <Input id="razao_social" name="razao_social" defaultValue={config.razao_social ?? ""} />
          </Campo>
          <Campo label="CNPJ" htmlFor="cnpj_contrato">
            <Input id="cnpj_contrato" name="cnpj" defaultValue={config.cnpj ?? ""} />
          </Campo>
          <div className="sm:col-span-2">
            <Campo label="Endereço completo (com CEP)" htmlFor="endereco_empresa">
              <Input id="endereco_empresa" name="endereco_empresa" defaultValue={config.endereco_empresa ?? ""} />
            </Campo>
          </div>
          <Campo label="E-mail do contrato" htmlFor="email_contratual">
            <Input id="email_contratual" name="email_contratual" type="email" defaultValue={config.email_contratual ?? ""} />
          </Campo>
          <Campo label="Cidade do foro" htmlFor="cidade_foro" hint="Ex.: Curitiba/PR">
            <Input id="cidade_foro" name="cidade_foro" defaultValue={config.cidade_foro ?? ""} />
          </Campo>
        </div>
      </Secao>

      <Secao
        titulo="Corpo do contrato"
        sub="Cláusulas 1 a 16, iguais para todos os tipos. Cuidado ao editar: é o texto que vai valer juridicamente."
      >
        <div className="px-6 py-4 space-y-3">
          <button type="button" onClick={() => setVerVariaveis((v) => !v)} className="text-[11px] text-brand-400 hover:text-brand-300">
            {verVariaveis ? "Esconder" : "Ver"} variáveis disponíveis
          </button>
          {verVariaveis && (
            <ul className="rounded-lg border border-[#311C45] bg-[#150C1D] p-3 space-y-1.5">
              {VARIAVEIS_CORPO.map(([v, d]) => (
                <li key={v} className="text-[11px]">
                  <code className="text-brand-400 font-mono">{v}</code> <span className="text-[#968F88]">— {d}</span>
                </li>
              ))}
            </ul>
          )}
          <Textarea name="contrato_corpo" rows={18} defaultValue={config.contrato_corpo ?? ""} className="font-mono text-[11px]" />
          <p className="text-[11px] text-[#5A496A]">
            Formatação: <code>#</code> título, <code>##</code> subtítulo, <code>###</code> cláusula, <code>-</code> item, <code>**negrito**</code>.
          </p>
        </div>
      </Secao>

      <div className="flex items-center justify-end gap-3">
        {state.erro && <p className="text-xs text-red-400">{state.erro}</p>}
        <BotaoConfirmar disabled={pending}>{pending ? "Salvando…" : "Salvar"}</BotaoConfirmar>
      </div>
    </form>
  );
}

function ModeloEditor({ modelo, onSalvo }: { modelo: ModeloContrato; onSalvo: (msg: string) => void }) {
  const [aberto, setAberto] = useState(false);
  const [state, action, pending] = useActionState<FormState, FormData>(salvarModeloContrato.bind(null, modelo.id), {});
  const [excluindo, excluir] = useTransition();
  useEffect(() => {
    if (state.ok) onSalvo("Modelo salvo");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <div className="border-b border-[#311C45]/60 last:border-b-0">
      <button type="button" onClick={() => setAberto((v) => !v)} className="w-full flex items-center justify-between px-6 py-3 text-left hover:bg-white/[0.02] transition-colors">
        <span className="text-sm text-[#DDDBD9] font-medium">{modelo.tipo_projeto}</span>
        <span className="text-[10px] font-mono text-[#968F88]">
          {modelo.prazo_extenso} <span className="ml-2">{aberto ? "−" : "+"}</span>
        </span>
      </button>
      {aberto && (
        <form action={action} className="px-6 pb-5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px_180px] gap-3">
            <Campo label="Título" htmlFor={`t-${modelo.id}`}>
              <Input id={`t-${modelo.id}`} name="titulo" defaultValue={modelo.titulo} className="py-2 text-xs" />
            </Campo>
            <Campo label="Prazo (dias)" htmlFor={`d-${modelo.id}`}>
              <Input id={`d-${modelo.id}`} name="prazo_dias" type="number" min={1} max={365} defaultValue={modelo.prazo_dias} className="py-2 text-xs" />
            </Campo>
            <Campo label="Prazo por extenso" htmlFor={`pe-${modelo.id}`}>
              <Input id={`pe-${modelo.id}`} name="prazo_extenso" defaultValue={modelo.prazo_extenso} className="py-2 text-xs" />
            </Campo>
          </div>
          <Campo label="Objeto (cláusula 1.1)" htmlFor={`o-${modelo.id}`}>
            <Textarea id={`o-${modelo.id}`} name="objeto" rows={3} defaultValue={modelo.objeto} className="text-xs" />
          </Campo>
          <Campo label="Anexo I — escopo" htmlFor={`a-${modelo.id}`} hint={`Variáveis: ${VARIAVEIS_ANEXO.join(" ")}`}>
            <Textarea id={`a-${modelo.id}`} name="anexo" rows={16} defaultValue={modelo.anexo} className="font-mono text-[11px]" />
          </Campo>
          <MensagemErro>{state.erro}</MensagemErro>
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              disabled={excluindo}
              onClick={() => confirm(`Excluir o modelo de ${modelo.tipo_projeto}?`) && excluir(() => excluirModeloContrato(modelo.id))}
              className="text-[11px] text-[#968F88] hover:text-red-400 transition-colors disabled:opacity-40"
            >
              Excluir modelo
            </button>
            <BotaoConfirmar disabled={pending}>{pending ? "Salvando…" : "Salvar modelo"}</BotaoConfirmar>
          </div>
        </form>
      )}
    </div>
  );
}

function NovoModelo({ tipos, modelos }: { tipos: TipoProjeto[]; modelos: ModeloContrato[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(criarModeloContrato, {});

  if (tipos.length === 0) return <p className="text-[11px] text-[#5A496A]">Todos os tipos de serviço já têm modelo.</p>;

  return (
    <form action={action} className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#968F88]">Novo modelo</p>
      <div className="flex flex-wrap gap-2">
        <div className="flex-1 min-w-[160px]">
          <Select name="tipo_projeto" className="py-2 text-xs" defaultValue={tipos[0].nome}>
            {tipos.map((t) => (
              <option key={t.id} value={t.nome}>
                {t.nome}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-48">
          <Select name="copiar_de" className="py-2 text-xs" defaultValue="">
            <option value="">Começar do zero</option>
            {modelos.map((m) => (
              <option key={m.id} value={m.tipo_projeto}>
                Copiar de {m.tipo_projeto}
              </option>
            ))}
          </Select>
        </div>
        <BotaoConfirmar disabled={pending}>{pending ? "…" : "Criar"}</BotaoConfirmar>
      </div>
      <MensagemErro>{state.erro}</MensagemErro>
    </form>
  );
}

function Secao({ titulo, sub, children }: { titulo: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className={cn("bg-[#231431] border border-[#311C45] rounded-xl overflow-hidden")}>
      <div className="px-6 py-4 border-b border-[#311C45]">
        <p className="text-sm font-semibold text-[#F5F5F4]">{titulo}</p>
        {sub && <p className="text-xs text-[#968F88] mt-0.5 leading-relaxed">{sub}</p>}
      </div>
      {children}
    </div>
  );
}
