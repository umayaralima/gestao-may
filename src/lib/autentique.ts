/*
 * Cliente da API do Autentique (GraphQL v2). Só roda no servidor: o token fica em
 * AUTENTIQUE_TOKEN (env de servidor na Vercel, nunca NEXT_PUBLIC_).
 * Docs: https://docs.autentique.com.br/api
 */

const URL_API = process.env.AUTENTIQUE_API_URL ?? "https://api.autentique.com.br/v2/graphql";

export type SignatarioAutentique = {
  public_id: string;
  name: string | null;
  email: string | null;
  signed: { created_at: string } | null;
  rejected: { created_at: string } | null;
  viewed: { created_at: string } | null;
  link: { short_link: string } | null;
};
export type DocumentoAutentique = {
  id: string;
  name: string;
  created_at?: string;
  signatures: SignatarioAutentique[];
};

function token() {
  const t = process.env.AUTENTIQUE_TOKEN;
  if (!t) throw new Error("Falta AUTENTIQUE_TOKEN nas variáveis de ambiente.");
  return t;
}

async function graphql<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const r = await fetch(URL_API, {
    method: "POST",
    headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  return tratar<T>(r);
}

async function tratar<T>(r: Response): Promise<T> {
  const texto = await r.text();
  if (!r.ok) throw new Error(`Autentique ${r.status}: ${texto.slice(0, 300)}`);
  let json: { data?: T; errors?: Array<{ message: string }> };
  try {
    json = JSON.parse(texto);
  } catch {
    throw new Error(`Resposta inesperada do Autentique: ${texto.slice(0, 200)}`);
  }
  if (json.errors?.length) throw new Error(json.errors.map((e) => e.message).join(" · "));
  if (!json.data) throw new Error("Autentique não devolveu dados.");
  return json.data;
}

/** Testa o token e devolve o nome/plano da conta. */
export async function contaAutentique() {
  const d = await graphql<{ me: { name: string; email: string; subscription: { documents: number | null; has_premium_features: boolean } | null } }>(
    `query { me { name email subscription { documents has_premium_features } } }`,
  );
  return d.me;
}

export type NovoSignatario = { email: string; name?: string; action?: "SIGN" | "APPROVE" | "RECOGNIZE" | "SIGN_AS_A_WITNESS" };

/**
 * Cria o documento e dispara os e-mails de assinatura.
 * Upload segue o GraphQL multipart request: `operations`, `map` e o arquivo.
 */
export async function criarDocumentoAutentique({
  nome,
  pdf,
  signatarios,
  mensagem,
}: {
  nome: string;
  pdf: Buffer;
  signatarios: NovoSignatario[];
  mensagem?: string;
}): Promise<DocumentoAutentique> {
  const query = `mutation CriarDocumento($document: DocumentInput!, $signers: [SignerInput!]!, $file: Upload!) {
    createDocument(document: $document, signers: $signers, file: $file) {
      id
      name
      created_at
      signatures { public_id name email link { short_link } }
    }
  }`;

  const operations = {
    query,
    variables: {
      document: { name: nome, ...(mensagem ? { message: mensagem } : {}), refusable: true, sortable: false },
      signers: signatarios.map((s) => ({ email: s.email, ...(s.name ? { name: s.name } : {}), action: s.action ?? "SIGN" })),
      file: null,
    },
  };

  const form = new FormData();
  form.append("operations", JSON.stringify(operations));
  form.append("map", JSON.stringify({ file: ["variables.file"] }));
  form.append("file", new Blob([new Uint8Array(pdf)], { type: "application/pdf" }), `${nome}.pdf`);

  const r = await fetch(URL_API, { method: "POST", headers: { Authorization: `Bearer ${token()}` }, body: form });
  const d = await tratar<{ createDocument: DocumentoAutentique }>(r);
  return d.createDocument;
}

export async function consultarDocumentoAutentique(id: string): Promise<DocumentoAutentique> {
  const d = await graphql<{ document: DocumentoAutentique }>(
    `query Documento($id: UUID!) {
      document(id: $id) {
        id
        name
        signatures { public_id name email signed { created_at } rejected { created_at } viewed { created_at } link { short_link } }
      }
    }`,
    { id },
  );
  return d.document;
}

/** Situação do documento a partir das assinaturas. */
export function situacao(doc: DocumentoAutentique) {
  const pessoas = doc.signatures ?? [];
  const assinaram = pessoas.filter((s) => s.signed);
  const recusou = pessoas.find((s) => s.rejected);
  return {
    total: pessoas.length,
    assinaram: assinaram.length,
    recusado: !!recusou,
    concluido: pessoas.length > 0 && assinaram.length === pessoas.length,
    ultimaAssinatura: assinaram.map((s) => s.signed!.created_at).sort().at(-1) ?? null,
    linkCliente: pessoas.find((s) => s.link?.short_link)?.link?.short_link ?? null,
  };
}
