/** Cabeçalho padrão de página: título serifado + ação à direita. */
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
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl text-neutro-900 sm:text-4xl">{titulo}</h1>
        {descricao && <p className="mt-1 text-sm text-neutro-500">{descricao}</p>}
      </div>
      {acao}
    </div>
  );
}

export function Vazio({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-medium border-2 border-dashed border-neutro-100 p-10 text-center text-sm text-neutro-500">
      {children}
    </div>
  );
}

export function MensagemErro({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="rounded-smaller border border-falha/40 bg-falha/10 px-3 py-2 text-sm text-falha">
      {children}
    </p>
  );
}
