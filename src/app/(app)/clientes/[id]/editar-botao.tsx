"use client";

import { useState } from "react";
import { BotaoGhost } from "@/components/ui/primitivos";
import type { Cliente } from "@/lib/types";
import { atualizarCliente } from "../actions";
import { ClienteFormModal } from "../cliente-form";

export function EditarClienteBotao({ cliente }: { cliente: Cliente }) {
  const [aberto, setAberto] = useState(false);
  const action = atualizarCliente.bind(null, cliente.id);
  return (
    <>
      <BotaoGhost onClick={() => setAberto(true)}>Editar</BotaoGhost>
      {aberto && <ClienteFormModal action={action} cliente={cliente} onClose={() => setAberto(false)} />}
    </>
  );
}
