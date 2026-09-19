/** Cabeçalho de página no padrão do wireframe: título + subtítulo mudo à esquerda, ações à direita. */
export function PaginaHeader({
  titulo,
  descricao,
  acao,
}: {
  titulo: string;
  descricao?: string;
  acao?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl text-texto sm:text-3xl">{titulo}</h1>
        {descricao && <p className="mt-0.5 text-xs text-texto-mudo">{descricao}</p>}
      </div>
      {acao && <div className="flex flex-wrap items-center gap-2">{acao}</div>}
    </div>
  );
}

export function Vazio({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[12px] border border-dashed border-borda-forte/60 p-10 text-center text-sm text-texto-mudo">
      {children}
    </div>
  );
}

export function MensagemErro({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="rounded-[8px] border border-falha/40 bg-falha/15 px-3 py-2 text-sm text-[#ff8a8a]">
      {children}
    </p>
  );
}
