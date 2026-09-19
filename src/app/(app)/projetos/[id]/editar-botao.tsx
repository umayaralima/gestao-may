"use client";

import { useState } from "react";
import { BotaoGhost } from "@/components/ui/primitivos";
import type { Projeto } from "@/lib/types";
import { atualizarProjeto } from "../actions";
import { ProjetoFormModal, type ClienteOpcao } from "../projeto-form";

export function EditarProjetoBotao({ projeto, clientes, tipos }: { projeto: Projeto; clientes: ClienteOpcao[]; tipos: string[] }) {
  const [aberto, setAberto] = useState(false);
  const action = atualizarProjeto.bind(null, projeto.id);
  return (
    <>
      <BotaoGhost onClick={() => setAberto(true)}>Editar</BotaoGhost>
      {aberto && <ProjetoFormModal action={action} clientes={clientes} tipos={tipos} projeto={projeto} onClose={() => setAberto(false)} />}
    </>
  );
}
