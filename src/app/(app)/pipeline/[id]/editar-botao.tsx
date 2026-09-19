"use client";

import { useState } from "react";
import { BotaoGhost } from "@/components/ui/primitivos";
import type { Lead } from "@/lib/types";
import { atualizarLead } from "../actions";
import { LeadFormModal } from "../lead-form";

export function EditarLeadBotao({ lead, tipos }: { lead: Lead; tipos: string[] }) {
  const [aberto, setAberto] = useState(false);
  const action = atualizarLead.bind(null, lead.id);
  return (
    <>
      <BotaoGhost onClick={() => setAberto(true)}>Editar</BotaoGhost>
      {aberto && <LeadFormModal action={action} tipos={tipos} lead={lead} onClose={() => setAberto(false)} />}
    </>
  );
}
