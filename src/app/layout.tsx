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
    <html lang="pt-BR" className={`${dmSerif.variable} ${jakarta.variable} ${jetbrains.variable} h-full`}>
      <head>
        {/* Aplica o estado da sidebar antes do primeiro paint, pra ela não "pular" ao carregar. */}
        <script
          dangerouslySetInnerHTML={{
            __html: 'try{document.documentElement.dataset.sidebar=localStorage.getItem("sidebar")==="recolhida"?"recolhida":"expandida"}catch(e){}',
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
