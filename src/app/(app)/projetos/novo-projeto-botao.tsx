"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { BotaoPrimario } from "@/components/ui/primitivos";
import { criarProjeto } from "./actions";
import { ProjetoFormModal, type ClienteOpcao } from "./projeto-form";

type Props = {
  clientes: ClienteOpcao[];
  tipos: string[];
  abrir?: boolean;
  inicial?: { cliente_id?: string; tipo?: string; valor_total?: number };
};

export function NovoProjetoBotao({ clientes, tipos, abrir, inicial }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [aberto, setAberto] = useState(!!abrir);

  const fechar = useCallback(() => {
    setAberto(false);
    if (abrir) {
      const n = new URLSearchParams(params.toString());
      ["novo", "cliente", "servico", "valor"].forEach((k) => n.delete(k));
      router.replace(`${pathname}${n.toString() ? `?${n}` : ""}`);
    }
  }, [abrir, params, pathname, router]);

  return (
    <>
      <BotaoPrimario onClick={() => setAberto(true)} disabled={clientes.length === 0} title={clientes.length === 0 ? "Cadastre um cliente primeiro" : undefined}>
        Novo projeto
      </BotaoPrimario>
      {aberto && clientes.length > 0 && <ProjetoFormModal action={criarProjeto} clientes={clientes} tipos={tipos} inicial={inicial} onClose={fechar} />}
    </>
  );
}
