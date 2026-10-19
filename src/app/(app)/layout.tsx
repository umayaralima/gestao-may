import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getConfiguracoes } from "@/lib/configuracoes";
import { usuarioAtual } from "@/lib/supabase/usuario";
import { sair } from "@/app/login/actions";

/** Shell do protótipo: sidebar fixa (gaveta no mobile) + main com rolagem interna por tela. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // O proxy já barrou quem não tem sessão; aqui só precisamos do e-mail pra exibir.
  const [usuario, config] = await Promise.all([usuarioAtual(), getConfiguracoes()]);
  if (!usuario) redirect("/login");

  return (
    <AppShell email={usuario.email ?? ""} nome={config.nome ?? "Mayara Lima"} titulo={config.titulo ?? "Desenvolvedora Web"} sair={sair}>
      {children}
    </AppShell>
  );
}
