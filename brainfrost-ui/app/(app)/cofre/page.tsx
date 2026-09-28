import { redirect } from "next/navigation";

// Compatibilidade com links antigos: o painel analítico foi incorporado ao
// fluxo principal e a entrada antiga não fica mais duplicada na navegação.
export default function Page() {
  redirect("/painel");
}
