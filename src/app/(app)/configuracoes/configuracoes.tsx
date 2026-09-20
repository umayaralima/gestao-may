"use client";

import { useActionState, useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { FORMA_PAGAMENTO_LABEL, FORMAS_PAGAMENTO } from "@/lib/constantes";
import type { Configuracoes as Config, TipoProjeto } from "@/lib/types";
import { alterarSenha, excluirTipoProjeto, renomearTipoProjeto, salvarConfiguracoes, type FormState, type SecaoConfig } from "./actions";
import { NovoTipoForm } from "./novo-tipo-form";

/*
 * Tela Configurações do protótipo (Figma Make, Configuracoes.tsx): nav lateral de abas + seções em card
 * (Section > Row > Label + controle). Adaptações pro sistema de uso único: sem Notificações (entra com a
 * integração de E-mails), Segurança só com troca de senha, aba "Serviços" (tipos de projeto) acrescentada.
 */

const ABAS = [
  { id: "perfil", label: "Perfil", Icone: PersonIcon },
  { id: "empresa", label: "Empresa", Icone: BuildingIcon },
  { id: "pipeline", label: "Pipeline", Icone: FunnelIcon },
  { id: "financeiro", label: "Financeiro", Icone: MoneyIcon },
  { id: "servicos", label: "Serviços", Icone: TagIcon },
  { id: "seguranca", label: "Segurança", Icone: LockIcon },
] as const;
type Aba = (typeof ABAS)[number]["id"];

type Props = { config: Config; tipos: TipoProjeto[]; usoTipos: Record<string, number>; etapas: string[] };

export function ConfiguracoesView({ config, tipos, usoTipos, etapas }: Props) {
  const [aba, setAba] = useState<Aba>("perfil");
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const salvo = () => setToast("Alterações salvas com sucesso");

  return (
    <div className="flex flex-col lg:flex-row h-full overflow-hidden">
      {/* Nav de abas: coluna no desktop, fileira rolável no celular */}
      <aside className="lg:w-52 shrink-0 border-b lg:border-b-0 lg:border-r border-[#311C45] bg-[#1B0F26] flex flex-col lg:py-4">
        <p className="hidden lg:block px-5 pb-3 text-[10px] font-semibold tracking-widest text-[#968F88] uppercase">Configurações</p>
        <nav className="flex lg:flex-col gap-1 lg:gap-0.5 px-3 py-2 lg:py-0 overflow-x-auto lg:overflow-visible">
          {ABAS.map(({ id, label, Icone }) => (
            <button
              key={id}
              type="button"
              onClick={() => setAba(id)}
              className={cn(
                "flex items-center gap-2.5 lg:gap-3 px-3 py-2 rounded-lg text-sm text-left transition-all whitespace-nowrap lg:w-full",
                aba === id ? "bg-brand-400/15 text-brand-400 font-medium" : "text-[#968F88] hover:text-[#DDDBD9] hover:bg-white/4",
              )}
            >
              <Icone />
              {label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-5">
        {toast && (
          <div className="fixed top-5 right-5 z-50 flex items-center gap-2.5 bg-emerald-500 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-lg entrar">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 7l3.5 3.5L12 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {toast}
          </div>
        )}

        {aba === "perfil" && (
          <FormSecao key="perfil" secao="perfil" titulo="Perfil" sub="Suas informações e como aparece no sistema" onSalvo={salvo}>
            <Section title="Foto e identidade">
              <Row>
                <Label label="Avatar" description="Iniciais do nome, com o gradiente da marca." />
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-300 to-brand-700 flex items-center justify-center text-xl font-bold text-white shrink-0">
                  {iniciais(config.nome ?? "Mayara Lima")}
                </div>
              </Row>
            </Section>
            <Section title="Informações pessoais">
              <Row>
                <Label label="Nome completo" />
                <Input name="nome" defaultValue={config.nome ?? ""} />
              </Row>
              <Row>
                <Label label="Título" description="Aparece embaixo do nome, ex.: Desenvolvedora Web" />
                <Input name="titulo" defaultValue={config.titulo ?? ""} />
              </Row>
              <Row>
                <Label label="E-mail de contato" description="O de login não muda por aqui" />
                <Input name="email_contato" type="email" defaultValue={config.email_contato ?? ""} />
              </Row>
              <Row>
                <Label label="Telefone / WhatsApp" />
                <Input name="telefone" defaultValue={config.telefone ?? ""} placeholder="(00) 00000-0000" />
              </Row>
            </Section>
          </FormSecao>
        )}

        {aba === "empresa" && (
          <FormSecao key="empresa" secao="empresa" titulo="Empresa" sub="Dados que entram em propostas e contratos" onSalvo={salvo}>
            <Section title="Dados cadastrais">
              <Row>
                <Label label="Nome da empresa" />
                <Input name="empresa" defaultValue={config.empresa ?? ""} />
              </Row>
              <Row>
                <Label label="CNPJ" />
                <Input name="cnpj" defaultValue={config.cnpj ?? ""} placeholder="00.000.000/0001-00" />
              </Row>
              <Row>
                <Label label="Site" />
                <Input name="site" defaultValue={config.site ?? ""} placeholder="empresa.com.br" />
              </Row>
            </Section>
          </FormSecao>
        )}

        {aba === "pipeline" && (
          <FormSecao key="pipeline" secao="pipeline" titulo="Pipeline" sub="Etapas e alertas do seu funil" onSalvo={salvo}>
            <Section title="Etapas do funil" sub="Fixas por enquanto, com os nomes do protótipo">
              {etapas.map((e) => (
                <div key={e} className="flex items-center gap-3 px-6 py-3">
                  <div className="w-2 h-2 rounded-full bg-brand-400" />
                  <span className="text-sm text-[#DDDBD9]">{e}</span>
                </div>
              ))}
            </Section>
            <Section title="Alertas">
              <Row>
                <Label label="Alerta de negócio parado" description="Marca com ⚠ no Pipeline o negócio que fica N dias sem movimentação" />
                <div className="flex items-center gap-2">
                  <Input name="dias_negocio_parado" type="number" min={1} max={365} defaultValue={config.dias_negocio_parado} largura="sm:w-24" />
                  <span className="text-xs text-[#968F88] whitespace-nowrap">dias</span>
                </div>
              </Row>
            </Section>
          </FormSecao>
        )}

        {aba === "financeiro" && (
          <FormSecao key="financeiro" secao="financeiro" titulo="Financeiro" sub="Metas, alertas e forma de recebimento" onSalvo={salvo}>
            <Section title="Metas">
              <Row>
                <Label label="Meta mensal de receita" description="Aparece no card Receita do mês, no Dashboard" />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#968F88]">R$</span>
                  <Input name="meta_mensal" inputMode="decimal" defaultValue={config.meta_mensal ?? ""} placeholder="8000" largura="sm:w-32" />
                </div>
              </Row>
            </Section>
            <Section title="Alertas de vencimento">
              <Row>
                <Label label="Aviso antes do vencimento" description="Quantos dias antes de uma parcela vencer ela aparece como “vence em breve” no Financeiro" />
                <div className="flex items-center gap-2">
                  <Input name="dias_aviso_vencimento" type="number" min={0} max={90} defaultValue={config.dias_aviso_vencimento} largura="sm:w-24" />
                  <span className="text-xs text-[#968F88] whitespace-nowrap">dias antes</span>
                </div>
              </Row>
            </Section>
            <Section title="Dados de recebimento">
              <Row>
                <Label label="Forma de pagamento preferida" description="Vem selecionada ao criar um lançamento" />
                <SelectField name="forma_pagamento_preferida" defaultValue={config.forma_pagamento_preferida}>
                  {FORMAS_PAGAMENTO.map((f) => (
                    <option key={f} value={f}>
                      {FORMA_PAGAMENTO_LABEL[f]}
                    </option>
                  ))}
                </SelectField>
              </Row>
              <Row>
                <Label label="Chave Pix" />
                <Input name="chave_pix" defaultValue={config.chave_pix ?? ""} placeholder="CPF, e-mail ou telefone" />
              </Row>
            </Section>
          </FormSecao>
        )}

        {aba === "servicos" && (
          <div className="space-y-5 entrar">
            <Titulo titulo="Serviços" sub="Tipos de projeto que aparecem nos formulários" />
            <Section
              title="Tipos de serviço"
              sub="Aparecem no “Tipo de serviço” do projeto e no “Serviço de interesse” do pipeline. Renomear atualiza quem já usa; excluir não apaga nada."
            >
              {tipos.length === 0 && <p className="px-6 py-6 text-xs text-[#968F88]">Nenhum serviço cadastrado.</p>}
              {tipos.map((t) => {
                const usos = usoTipos[t.nome] ?? 0;
                return (
                  <div key={t.id} className="flex items-center gap-3 px-6 py-2.5">
                    <form action={renomearTipoProjeto.bind(null, t.id)} className="flex flex-1 items-center gap-2 min-w-0">
                      <input
                        name="nome"
                        defaultValue={t.nome}
                        maxLength={80}
                        className="w-full rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-sm text-[#DDDBD9] hover:border-[#311C45] focus:border-brand-400/60 focus:bg-[#150C1D] focus:outline-none transition-colors"
                      />
                      <button type="submit" className="px-2.5 py-1 text-[11px] text-[#968F88] hover:text-[#DDDBD9] border border-[#311C45] hover:border-[#5A496A] rounded-lg transition-colors">
                        Salvar
                      </button>
                    </form>
                    <span className="hidden sm:block w-20 text-right text-[10px] font-mono text-[#968F88]">{usos ? `${usos} em uso` : ""}</span>
                    <form action={excluirTipoProjeto.bind(null, t.id)}>
                      <button type="submit" className="text-[#5A496A] hover:text-red-400 transition-colors text-xs">
                        Remover
                      </button>
                    </form>
                  </div>
                );
              })}
              <div className="px-6 py-4">
                <NovoTipoForm />
              </div>
            </Section>
          </div>
        )}

        {aba === "seguranca" && <Seguranca onSalvo={() => setToast("Senha alterada")} />}
      </div>
    </div>
  );
}

/* ---------- Formulário de uma aba (um <form> com Salvar no rodapé) ---------- */

function FormSecao({ secao, titulo, sub, children, onSalvo }: { secao: SecaoConfig; titulo: string; sub: string; children: React.ReactNode; onSalvo: () => void }) {
  const [state, action, pending] = useActionState<FormState, FormData>(salvarConfiguracoes.bind(null, secao), {});
  useEffect(() => {
    if (state.ok) onSalvo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={action} className="space-y-5 entrar">
      <Titulo titulo={titulo} sub={sub} />
      {children}
      <div className="flex items-center justify-end gap-3">
        {state.erro && <p className="text-xs text-red-400">{state.erro}</p>}
        <SaveButton pending={pending} />
      </div>
    </form>
  );
}

function Seguranca({ onSalvo }: { onSalvo: () => void }) {
  const [state, action, pending] = useActionState<FormState, FormData>(alterarSenha, {});
  useEffect(() => {
    if (state.ok) onSalvo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={action} className="space-y-5 entrar" key={state.ok ? "ok" : "form"}>
      <Titulo titulo="Segurança" sub="Senha de acesso ao sistema" />
      <Section title="Alterar senha">
        <Row>
          <Label label="Senha atual" />
          <Input name="senha_atual" type="password" placeholder="••••••••" autoComplete="current-password" />
        </Row>
        <Row>
          <Label label="Nova senha" description="Mínimo de 8 caracteres" />
          <Input name="senha_nova" type="password" placeholder="••••••••" autoComplete="new-password" />
        </Row>
        <Row>
          <Label label="Confirmar nova senha" />
          <Input name="senha_conf" type="password" placeholder="••••••••" autoComplete="new-password" />
        </Row>
        <div className="px-6 py-4 flex items-center justify-end gap-3">
          {state.erro && <p className="text-xs text-red-400">{state.erro}</p>}
          <SaveButton pending={pending}>Atualizar senha</SaveButton>
        </div>
      </Section>
    </form>
  );
}

/* ---------- Primitivos da tela (copiados do Make) ---------- */

function Titulo({ titulo, sub }: { titulo: string; sub: string }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-[#F5F5F4] mb-0.5">{titulo}</h2>
      <p className="text-xs text-[#968F88]">{sub}</p>
    </div>
  );
}

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#231431] border border-[#311C45] rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-[#311C45]">
        <p className="text-sm font-semibold text-[#F5F5F4]">{title}</p>
        {sub && <p className="text-xs text-[#968F88] mt-0.5">{sub}</p>}
      </div>
      <div className="divide-y divide-[#311C45]/60">{children}</div>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-6 py-4 gap-3 sm:gap-6">{children}</div>;
}

function Label({ label, description }: { label: string; description?: string }) {
  return (
    <div className="flex-1 min-w-0">
      <p className="text-sm text-[#DDDBD9] font-medium">{label}</p>
      {description && <p className="text-xs text-[#968F88] mt-0.5 leading-relaxed">{description}</p>}
    </div>
  );
}

const controleCls =
  "bg-[#1B0F26] border border-[#311C45] rounded-lg px-3 py-2 text-sm text-[#DDDBD9] placeholder:text-[#5A496A] outline-none focus:border-brand-400/60 focus:ring-1 focus:ring-brand-400/20 transition-all";

function Input({ className, largura = "sm:w-64", ...props }: React.InputHTMLAttributes<HTMLInputElement> & { largura?: string }) {
  return <input {...props} className={cn(controleCls, "w-full", largura, className)} />;
}

function SelectField({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={cn(controleCls, "appearance-none cursor-pointer w-full sm:w-48", className)}>
      {children}
    </select>
  );
}

function SaveButton({ pending, children = "Salvar" }: { pending: boolean; children?: React.ReactNode }) {
  return (
    <button type="submit" disabled={pending} className="px-4 py-2 bg-brand-400 hover:bg-brand-300 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-colors">
      {pending ? "Salvando…" : children}
    </button>
  );
}

function iniciais(nome: string) {
  const p = nome.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p[p.length - 1]?.[0] ?? "")).toUpperCase();
}

/* Ícones do Make, 15px, traço 1.3 */
function PersonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <circle cx="7.5" cy="5" r="3" stroke="currentColor" strokeWidth="1.3" />
      <path d="M2 14c0-3.31 2.46-6 5.5-6s5.5 2.69 5.5 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
function BuildingIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <rect x="1.5" y="5" width="12" height="8.5" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5 13.5V10h5v3.5" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M5 2h5v3H5V2Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}
function FunnelIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M1.5 2.5h12L9 8v5L6 11.5V8L1.5 2.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}
function MoneyIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <rect x="1.5" y="3.5" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="7.5" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M1.5 6h2M11.5 6h2M1.5 9h2M11.5 9h2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
function TagIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M1.5 7.5V2.5a1 1 0 0 1 1-1h5l6 6-6 6-6-6Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <circle cx="5" cy="5" r="1" fill="currentColor" />
    </svg>
  );
}
function LockIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <rect x="2.5" y="6.5" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M4.5 6.5V5a3 3 0 0 1 6 0v1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="7.5" cy="10" r="1" fill="currentColor" />
    </svg>
  );
}
