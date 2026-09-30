import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // o PDF do contrato vai em base64 pra server action antes de subir no Autentique
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
  /* config options here */
};

export default nextConfig;
