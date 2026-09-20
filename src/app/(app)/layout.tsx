import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { sair } from "@/app/login/actions";

/** Shell do protótipo: sidebar fixa (gaveta no mobile) + main com rolagem interna por tela. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <AppShell email={user.email ?? ""} sair={sair}>
      {children}
    </AppShell>
  );
}
