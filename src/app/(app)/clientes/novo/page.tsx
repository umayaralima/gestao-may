import { PaginaHeader } from "@/components/ui/pagina";
import { criarCliente } from "../actions";
import { ClienteForm } from "../cliente-form";

export default function NovoClientePage() {
  return (
    <div className="max-w-3xl">
      <PaginaHeader titulo="Novo cliente" />
      <ClienteForm action={criarCliente} cancelarHref="/clientes" />
    </div>
  );
}
