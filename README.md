# Gestão · May Lima

Sistema de uso único pra gerenciar clientes, projetos e pagamentos de web design.
Next.js (App Router) + Supabase + Tailwind. Spec completa em `CLAUDE.md`.

## Primeira vez

1. Crie um projeto no [Supabase](https://supabase.com/dashboard).
2. No **SQL Editor**, rode o conteúdo de `supabase/schema.sql`.
3. Em **Authentication → Providers → Email**, desative *Allow new users to sign up*.
4. Em **Authentication → Users → Add user**, crie o seu usuário (e-mail + senha, marque *Auto Confirm*).
5. Em **Settings → API**, copie a *Project URL* e a *anon public key* pro `.env.local`.
6. `npm install` e `npm run dev` → http://localhost:3000

## Deploy (Vercel)

Importe o repositório e configure as mesmas três variáveis do `.env.local`
(`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `ALLOWED_EMAIL`).
