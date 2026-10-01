import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal/LegalDocument";

export const metadata: Metadata = {
  title: "Termos de Uso — BrainFrost",
  description: "Termos que regem o uso do BrainFrost e de seus planos Free e Pro.",
};

export default function TermsPage() {
  return (
    <LegalDocument
      eyebrow="documento legal"
      title="Termos de Uso"
      description="Estas condições explicam como o BrainFrost pode ser usado, como funcionam os planos e quais são as responsabilidades de cada parte."
      updatedAt="28 de setembro de 2026"
      sections={[
        {
          title: "Aceitação e elegibilidade",
          content: <p>Ao criar uma conta ou usar o BrainFrost, você concorda com estes Termos e com a Política de Privacidade. Você deve ter capacidade legal para contratar o serviço e fornecer informações verdadeiras e atualizadas.</p>,
        },
        {
          title: "O que o BrainFrost oferece",
          content: <p>O BrainFrost organiza conteúdos, padrões, decisões, memórias e associações enviados pelo usuário para formar um contexto reutilizável em ferramentas de inteligência artificial. O serviço inclui recursos locais e integrações com terceiros escolhidos pelo usuário.</p>,
        },
        {
          title: "Conta e segurança",
          content: <><p>Você é responsável pela sua conta, pelos dispositivos usados e pela confidencialidade de credenciais e chaves de API. Avise imediatamente em caso de acesso indevido.</p><p>Não envie segredos, dados pessoais de terceiros ou conteúdos que você não tenha autorização para tratar.</p></>,
        },
        {
          title: "Planos, cobrança e renovação",
          content: <><p>O plano Free possui os limites apresentados no produto. O plano Pro é uma assinatura recorrente mensal ou anual, cobrada antecipadamente pelo Stripe e renovada automaticamente até o cancelamento.</p><p>Preço, periodicidade e impostos aplicáveis são exibidos antes da confirmação. O usuário pode atualizar a forma de pagamento, consultar faturas ou cancelar pelo Portal de Cobrança. O cancelamento interrompe futuras renovações e mantém o acesso até o fim do período pago, salvo indicação diferente no checkout ou exigência legal.</p></>,
        },
        {
          title: "Cancelamentos e reembolsos",
          content: <p>Pedidos de cancelamento e reembolso serão tratados conforme a legislação aplicável e as condições mostradas no momento da compra. Para solicitar análise, escreva para <a href="mailto:caua.fer@gmail.com">caua.fer@gmail.com</a>.</p>,
        },
        {
          title: "Conteúdo do usuário",
          content: <><p>Você continua titular do conteúdo que envia. Você concede ao BrainFrost apenas a autorização necessária para armazenar, organizar, analisar e devolver esse conteúdo conforme os recursos solicitados.</p><p>Ao escolher uma IA ou integração externa, você autoriza o envio dos dados necessários ao respectivo fornecedor e também fica sujeito aos termos dele.</p></>,
        },
        {
          title: "Uso responsável de IA",
          content: <p>Respostas, classificações e sugestões de IA podem conter erros. O BrainFrost permite revisar aprendizados antes de consolidá-los no cérebro. Decisões profissionais, técnicas, jurídicas, médicas ou financeiras não devem ser tomadas sem validação humana adequada.</p>,
        },
        {
          title: "Usos proibidos",
          content: <ul><li>Violar leis, direitos autorais, privacidade ou segurança de terceiros.</li><li>Tentar acessar contas, dados ou infraestrutura sem autorização.</li><li>Distribuir código malicioso, abusar de limites ou prejudicar o funcionamento do serviço.</li><li>Usar o BrainFrost para criar ou ampliar atividades ilícitas.</li></ul>,
        },
        {
          title: "Disponibilidade e mudanças",
          content: <p>O BrainFrost está em evolução e pode alterar, substituir ou descontinuar recursos. Buscaremos comunicar mudanças relevantes, preservar os dados e oferecer meios razoáveis de exportação, mas não garantimos funcionamento ininterrupto ou livre de falhas.</p>,
        },
        {
          title: "Suspensão e encerramento",
          content: <p>Podemos limitar ou suspender contas em caso de fraude, risco de segurança, inadimplência ou violação destes Termos. Você pode deixar de usar o serviço, cancelar a assinatura e solicitar a exclusão da conta a qualquer momento.</p>,
        },
        {
          title: "Responsabilidade",
          content: <p>Na extensão permitida pela lei, o BrainFrost não responde por decisões tomadas exclusivamente com base em conteúdo gerado por IA, indisponibilidade de serviços de terceiros ou perda causada por uso indevido da conta. Nada nestes Termos limita direitos obrigatórios do consumidor.</p>,
        },
        {
          title: "Contato e alterações",
          content: <p>Podemos atualizar estes Termos para refletir mudanças no produto ou na legislação. A versão vigente ficará nesta página. Dúvidas podem ser enviadas para <a href="mailto:caua.fer@gmail.com">caua.fer@gmail.com</a>.</p>,
        },
      ]}
    />
  );
}
