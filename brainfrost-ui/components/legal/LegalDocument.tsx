import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

type Section = {
  title: string;
  content: ReactNode;
};

export function LegalDocument({
  eyebrow,
  title,
  description,
  updatedAt,
  sections,
}: {
  eyebrow: string;
  title: string;
  description: string;
  updatedAt: string;
  sections: Section[];
}) {
  return (
    <div className="min-h-[100dvh] bg-[#F7FAFD] text-[#0B1B30]">
      <header className="border-b border-[#DFE8F2] bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <Image src="/mascot/yeti-icon.png" alt="" width={28} height={28} className="h-7 w-7 rounded-full object-cover" />
            BrainFrost
          </Link>
          <Link href="/" className="text-[13px] font-medium text-[#5A6B85] hover:text-[#0B1B30]">
            Voltar ao início
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-14 md:py-20">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#0EA5CF]">{eyebrow}</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-6xl">{title}</h1>
        <p className="mt-5 max-w-2xl text-[16px] leading-7 text-[#5A6B85]">{description}</p>
        <p className="mt-4 font-mono text-[10px] uppercase tracking-widest text-[#8190A6]">
          última atualização: {updatedAt}
        </p>

        <div className="mt-12 space-y-4">
          {sections.map((section, index) => (
            <section key={section.title} className="rounded-2xl border border-[#DFE8F2] bg-white p-6 md:p-8">
              <div className="flex items-start gap-4">
                <span className="mt-1 font-mono text-[10px] text-[#0EA5CF]">{String(index + 1).padStart(2, "0")}</span>
                <div className="min-w-0">
                  <h2 className="text-xl font-semibold tracking-tight">{section.title}</h2>
                  <div className="mt-3 space-y-3 text-[14px] leading-6 text-[#5A6B85] [&_a]:text-[#0B8FB4] [&_a]:underline [&_a]:underline-offset-2 [&_li]:ml-5 [&_li]:list-disc">
                    {section.content}
                  </div>
                </div>
              </div>
            </section>
          ))}
        </div>
      </main>

      <footer className="border-t border-[#DFE8F2] bg-white">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-x-6 gap-y-2 px-6 py-8 text-[12px] text-[#5A6B85]">
          <span>BrainFrost</span>
          <Link href="/termos" className="hover:text-[#0B1B30]">Termos de Uso</Link>
          <Link href="/privacidade" className="hover:text-[#0B1B30]">Privacidade</Link>
          <a href="mailto:caua.fer@gmail.com" className="hover:text-[#0B1B30]">Contato</a>
        </div>
      </footer>
    </div>
  );
}
