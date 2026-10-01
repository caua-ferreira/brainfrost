import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal/LegalDocument";

export const metadata: Metadata = {
  title: "Política de Privacidade — BrainFrost",
  description: "Saiba quais dados o BrainFrost trata e como você pode exercer seus direitos.",
};

export default function PrivacyPage() {
  return (
    <LegalDocument
      eyebrow="privacidade e dados"
      title="Política de Privacidade"
      description="Esta política descreve quais dados o BrainFrost trata, por que eles são necessários e quais escolhas permanecem sob seu controle."
      updatedAt="30 de setembro de 2026"
      sections={[
        {
          title: "Quem controla os dados",
          content: <p>O BrainFrost é o controlador dos dados tratados diretamente na plataforma. Para assuntos de privacidade, solicitações ou dúvidas, use <a href="mailto:caua.fer@gmail.com">caua.fer@gmail.com</a>.</p>,
        },
        {
          title: "Dados que podemos tratar",
          content: <ul><li>Cadastro e perfil: nome, e-mail, foto e provedores de login conectados.</li><li>Conteúdo: projetos, textos, padrões, camadas, conexões, conversas e arquivos que você decide importar.</li><li>Configurações: preferências, integrações e chaves de API protegidas por criptografia.</li><li>Assinatura: identificadores de cliente e assinatura, plano, status, faturas e dados resumidos do meio de pagamento. Os dados completos do cartão são tratados pelo Stripe.</li><li>Uso e segurança: endereço IP, navegador, registros técnicos e eventos necessários para prevenir fraude e corrigir falhas.</li></ul>,
        },
        {
          title: "Por que usamos esses dados",
          content: <ul><li>Criar e proteger sua conta.</li><li>Importar, organizar, relacionar e exportar o contexto solicitado.</li><li>Executar recursos de IA e integrações escolhidos por você.</li><li>Processar assinaturas, cumprir obrigações legais e prestar suporte.</li><li>Prevenir abuso, medir estabilidade e melhorar a experiência.</li></ul>,
        },
        {
          title: "Métricas de uso e observabilidade",
          content: <><p>Coletamos métricas first-party associadas à conta para operar e melhorar o serviço, como início e última atividade da sessão, tempo em que a aplicação esteve visível e recebeu interação, páginas acessadas, resultado das importações e códigos técnicos de erro.</p><p>Essa telemetria não inclui conteúdo importado, mensagens de chat, prompts, respostas completas de IA ou chaves de API. Segredos reconhecidos em mensagens técnicas são mascarados antes do registro.</p></>,
        },
        {
          title: "Bases legais",
          content: <p>Dependendo da finalidade, o tratamento ocorre para executar o contrato com você, cumprir obrigações legais, proteger a plataforma e seus usuários por legítimo interesse ou atender a consentimentos específicos, que podem ser revogados quando aplicável.</p>,
        },
        {
          title: "IA local e provedores externos",
          content: <><p>Quando você usa o WebLLM local, o processamento principal do modelo ocorre no seu navegador. Ao escolher Claude, Gemini, OpenRouter ou outro provedor, o conteúdo necessário à solicitação pode ser enviado ao serviço escolhido.</p><p>As chaves fornecidas pelo usuário são armazenadas de forma criptografada e usadas somente para executar as integrações solicitadas.</p></>,
        },
        {
          title: "Com quem os dados podem ser compartilhados",
          content: <p>Usamos fornecedores necessários à operação, como Supabase para autenticação e banco de dados, Vercel para hospedagem, Stripe para cobrança, provedores de login e as IAs ou integrações que você escolher. Não vendemos seus dados pessoais.</p>,
        },
        {
          title: "Transferências internacionais",
          content: <p>Alguns fornecedores podem processar dados fora do Brasil. Nesses casos, buscamos usar serviços reconhecidos e mecanismos contratuais e técnicos adequados à proteção dos dados.</p>,
        },
        {
          title: "Retenção e exclusão",
          content: <p>Mantemos os dados enquanto sua conta estiver ativa e pelo tempo necessário para prestar o serviço, resolver disputas e cumprir obrigações legais. Você pode solicitar a exclusão; dados sujeitos a retenção obrigatória ou necessários para defesa de direitos poderão ser preservados pelo prazo aplicável.</p>,
        },
        {
          title: "Seus direitos",
          content: <p>Você pode solicitar confirmação do tratamento, acesso, correção, informações sobre compartilhamento, portabilidade quando aplicável, anonimização, bloqueio ou exclusão, oposição e revogação de consentimento. Escreva para <a href="mailto:caua.fer@gmail.com">caua.fer@gmail.com</a>; poderemos pedir confirmação de identidade para proteger sua conta.</p>,
        },
        {
          title: "Cookies e armazenamento local",
          content: <p>Usamos cookies e armazenamento do navegador necessários para autenticação, sessão, preferências, identificação temporária da sessão de uso e funcionamento de recursos locais. Não usamos essa identificação para publicidade comportamental.</p>,
        },
        {
          title: "Segurança",
          content: <p>Adotamos controles técnicos e organizacionais compatíveis com a natureza do serviço, como autenticação, isolamento de dados, criptografia de credenciais e acesso restrito. Nenhum sistema é imune a riscos; comunique qualquer suspeita de incidente pelo canal de contato.</p>,
        },
        {
          title: "Atualizações desta política",
          content: <p>Podemos atualizar esta política quando o produto, os fornecedores ou a legislação mudarem. A data da versão vigente aparece no início da página, e alterações relevantes poderão ser comunicadas dentro do produto.</p>,
        },
      ]}
    />
  );
}
