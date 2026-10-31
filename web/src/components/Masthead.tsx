import { motion } from "motion/react";

export function Masthead({ onHome, right }: { onHome: () => void; right?: React.ReactNode }) {
  const date = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return (
    <header className="border-b border-rule px-4 sm:px-8">
      <div className="flex items-center justify-between py-2 kicker text-mute">
        <span className="hidden sm:inline">{date}</span>
        <span>Evidence court for the news · Built on Mozaik</span>
        <span className="hidden sm:inline">{right}</span>
      </div>
      <div className="rule-double" />
      <button onClick={onHome} className="block w-full py-3 text-center group" aria-label="The Ground Truth — home">
        <motion.span initial={{ letterSpacing: "0.3em", opacity: 0 }} animate={{ letterSpacing: "-0.01em", opacity: 1 }} transition={{ duration: 1.1, ease: [0.2, 0.7, 0.1, 1] }}
          className="display block text-[clamp(28px,5vw,56px)] font-[650] leading-none">
          The Ground Truth
        </motion.span>
      </button>
    </header>
  );
}
