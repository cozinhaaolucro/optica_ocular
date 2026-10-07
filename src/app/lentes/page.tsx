import LensSimulator from "@/components/LensSimulator";
export const metadata = {
  title: "Lentes para sua rotina",
  description:
    "Compare linhas, materiais e tratamentos no simulador de lentes da Óptica Ocular e receba orientação da equipe.",
  alternates: { canonical: "/lentes" },
};
export default function Page() {
  return (
    <main id="conteudo">
      <LensSimulator standalone />
    </main>
  );
}
