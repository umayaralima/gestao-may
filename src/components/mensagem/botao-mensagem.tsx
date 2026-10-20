"use client";

import { useMemo, useState, useTransition } from "react";
import { cn } from "@/lib/cn";
import { Modal, BotaoCancelar } from "@/components/ui/modal";
import { Textarea, Rotulo } from "@/components/ui/primitivos";
import {
  renderizarMensagem,
  variaveisVazias,
  linkWhatsApp,
  linkEmail,
  type ContextoMensagem,
  type ModeloMensagem,
} from "@/lib/mensagem";
import { registrarEnvioMensagem } from "@/app/(app)/crm/actions";
import type { Dono } from "@/app/(app)/crm/actions";

/*
 * O botão "Mensagem" que aparece na parcela, no lead, no cliente e no projeto.
 * Escolhe o modelo, mostra o texto já com as {{variaveis}} resolvidas, deixa
 * ajustar e manda. Se vier um `dono`, registra a interação sozinho — é aí que
 * mora a economia de tempo: a May não precisa voltar pra anotar que falou.
 *
 * O texto NÃO é guardado: mensagem é descartável, o que fica é a interação.
 */
export function BotaoMensagem({
  modelos,
  contexto,
  contato,
  dono,
  rotulo = "Mensagem",
  variante = "linha",
}: {
  modelos: ModeloMensagem[];
  contexto: ContextoMensagem;
  contato: { nome: string; whatsapp: string | null; email: string | null };
  dono?: Dono;
  rotulo?: string;
  variante?: "linha" | "ghost";
}) {
  const [aberto, setAberto] = useState(false);

  if (modelos.length === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className={cn(
          "whitespace-nowrap transition-colors",
          variante === "linha"
            ? "px-2.5 py-1 text-[11px] text-brand-400 border border-brand-400/30 hover:bg-brand-400/10 rounded-lg"
            : "px-3 py-1.5 text-xs text-[#968F88] hover:text-[#DDDBD9] border border-[#311C45] hover:border-[#5A496A] rounded-lg",
        )}
        title="Montar mensagem a partir de um modelo"
      >
        💬 {rotulo}
      </button>
      {aberto && (
        <PainelMensagem
          modelos={modelos}
          contexto={contexto}
          contato={contato}
          dono={dono}
          onClose={() => setAberto(false)}
        />
      )}
    </>
  );
}

function PainelMensagem({
  modelos,
  contexto,
  contato,
  dono,
  onClose,
}: {
  modelos: ModeloMensagem[];
  contexto: ContextoMensagem;
  contato: { nome: string; whatsapp: string | null; email: string | null };
  dono?: Dono;
  onClose: () => void;
}) {
  const [escolhidoId, setEscolhidoId] = useState(modelos[0].id);
  const [texto, setTexto] = useState(() => renderizarMensagem(modelos[0].corpo, contexto));
  const [tocado, setTocado] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [registrar, setRegistrar] = useState(!!dono);
  const [pendente, iniciar] = useTransition();

  const escolhido = modelos.find((m) => m.id === escolhidoId) ?? modelos[0];
  const faltando = useMemo(() => variaveisVazias(escolhido.corpo, contexto), [escolhido, contexto]);

  const zap = linkWhatsApp(contato.whatsapp, texto);
  const mail = linkEmail(contato.email, escolhido.assunto, texto);

  // Trocar de modelo descarta o que foi digitado — pergunta antes, se houve edição.
  const trocar = (m: ModeloMensagem) => {
    if (tocado && !confirm("Trocar de modelo vai descartar o texto que você ajustou. Continuar?")) return;
    setEscolhidoId(m.id);
    setTexto(renderizarMensagem(m.corpo, contexto));
    setTocado(false);
  };

  const registrarSePedido = (canal: "whatsapp" | "email") => {
    if (!dono || !registrar) return;
    iniciar(async () => {
      await registrarEnvioMensagem(dono, canal, `${escolhido.nome}: ${texto.split("\n")[0]}`);
    });
  };

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
      registrarSePedido("whatsapp");
    } catch {
      setCopiado(false);
    }
  };

  return (
    <Modal titulo={`Mensagem para ${contato.nome.split(" ")[0]}`} onClose={onClose} largura="lg">
      {modelos.length > 1 && (
        <div className="space-y-1.5">
          <Rotulo>Modelo</Rotulo>
          <div className="flex flex-wrap gap-1.5">
            {modelos.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => trocar(m)}
                className={cn(
                  "px-2.5 py-1.5 text-[11px] rounded-lg border transition-colors text-left",
                  m.id === escolhidoId
                    ? "bg-brand-400/15 text-brand-400 border-brand-400/30 font-medium"
                    : "text-[#968F88] border-[#311C45] hover:border-[#5A496A] hover:text-[#DDDBD9]",
                )}
              >
                {m.nome}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Rotulo htmlFor="mensagem-texto">Mensagem</Rotulo>
          <span className="text-[10px] text-[#5A496A] font-mono">{texto.length} caracteres</span>
        </div>
        <Textarea
          id="mensagem-texto"
          rows={12}
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value);
            setTocado(true);
          }}
          className="font-sans leading-relaxed"
        />
        <p className="text-[10px] text-[#5A496A]">
          Pode ajustar à vontade antes de mandar — o modelo original não muda.
        </p>
      </div>

      {faltando.length > 0 && (
        <div className="flex gap-2 px-3 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/25">
          <span className="text-amber-400 text-xs shrink-0">⚠</span>
          <p className="text-[11px] text-amber-200/90 leading-relaxed">
            Sem valor no cadastro: <span className="font-mono">{faltando.join(", ")}</span>. As linhas
            correspondentes saíram da mensagem — confira se ficou faltando alguma informação.
          </p>
        </div>
      )}

      {dono && (
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={registrar}
            onChange={(e) => setRegistrar(e.target.checked)}
            className="w-3.5 h-3.5 rounded accent-brand-400"
          />
          <span className="text-[11px] text-[#968F88]">
            Registrar a interação {dono.tipo === "lead" ? "no lead" : "no cliente"} ao mandar
          </span>
        </label>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          type="button"
          onClick={copiar}
          className="px-3 py-2 text-xs text-brand-400 border border-brand-400/30 hover:bg-brand-400/10 rounded-lg transition-colors"
        >
          {copiado ? "Copiado ✓" : "Copiar texto"}
        </button>

        {zap ? (
          <a
            href={zap}
            target="_blank"
            rel="noreferrer"
            onClick={() => registrarSePedido("whatsapp")}
            className="px-3 py-2 text-xs text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/10 rounded-lg transition-colors"
          >
            Abrir no WhatsApp
          </a>
        ) : (
          <span className="text-[10px] text-[#5A496A]">Sem WhatsApp no cadastro</span>
        )}

        {mail && (
          <a
            href={mail}
            onClick={() => registrarSePedido("email")}
            className="px-3 py-2 text-xs text-[#968F88] hover:text-[#DDDBD9] border border-[#311C45] hover:border-[#5A496A] rounded-lg transition-colors"
          >
            Abrir no e-mail
          </a>
        )}

        {pendente && <span className="text-[10px] text-[#5A496A]">registrando…</span>}
      </div>

      <div className="flex justify-end pt-1">
        <BotaoCancelar onClick={onClose}>Fechar</BotaoCancelar>
      </div>
    </Modal>
  );
}
