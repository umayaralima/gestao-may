import type { Metadata } from "next";
import { DM_Serif_Display, JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const dmSerif = DM_Serif_Display({
  variable: "--font-dm-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["italic", "normal"],
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Mayara · Gestão",
  description: "Clientes, projetos e pagamentos em um só lugar.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: o script abaixo escreve data-sidebar no <html> ANTES da
    // hidratação, então o atributo existe no cliente e não no HTML do servidor. React avisa
    // ("won't be patched up") e mantém o valor do cliente — o comportamento sempre esteve certo,
    // o aviso é que era ruído, e ruído fixo no console esconde erro de verdade. O atributo vale
    // só pro <html>: não desce pros filhos, então nenhum mismatch real fica escondido.
    <html lang="pt-BR" suppressHydrationWarning className={`${dmSerif.variable} ${jakarta.variable} ${jetbrains.variable} h-full`}>
      <head>
        {/*
          Aplica sidebar e tema antes do primeiro paint, pra nada "pular" ao carregar.
          Sem escolha salva, o padrão vem da rota: as páginas que o CLIENTE abre
          (/p/ proposta, /b/ briefing, /c/ portal) nascem claras, porque são leitura
          longa e ele costuma imprimir; o sistema nasce escuro, como o wireframe.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              'try{var d=document.documentElement,t=localStorage.getItem("tema");' +
              // sem regex de propósito: a barra invertida se perde na string e quebra o script inteiro
              'if(t!=="claro"&&t!=="escuro"){var p=location.pathname.slice(0,3);' +
              't=(p==="/p/"||p==="/b/"||p==="/c/")?"claro":"escuro"}' +
              'd.dataset.tema=t;' +
              'd.dataset.sidebar=localStorage.getItem("sidebar")==="recolhida"?"recolhida":"expandida"}catch(e){}',
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
