import SectionOrchestrator from "@/components/sections/SectionOrchestrator";
import SectionNav from "@/components/ui/SectionNav";
import SectionHUD from "@/components/ui/SectionHUD";

export default function Page() {
  return (
    <>
      <SectionHUD />
      <SectionNav />
      <main className="relative z-10">
        <SectionOrchestrator />
      </main>
    </>
  );
}
