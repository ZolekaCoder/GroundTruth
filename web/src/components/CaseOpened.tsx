import { motion } from "motion/react";

/** The "CASE OPENED" moment: a docket stamp, held just long enough to mark the threshold. */
export function CaseOpened({ caseNo, claim }: { caseNo: string; claim: string }) {
  return (
    <motion.div className="fixed inset-0 z-50 grid place-items-center bg-ink px-6" initial={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.6 } }} role="status" aria-live="assertive">
      <div className="max-w-3xl text-center">
        <motion.p className="kicker text-mute" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>Docket {caseNo}</motion.p>
        <motion.div initial={{ scale: 1.6, opacity: 0, rotate: -6 }} animate={{ scale: 1, opacity: 1, rotate: -2 }} transition={{ delay: 0.25, type: "spring", stiffness: 260, damping: 18 }}
          className="mx-auto mt-6 inline-block border-[3px] border-red px-8 py-3 text-red">
          <span className="display text-[clamp(40px,9vw,96px)] font-[800] tracking-[0.04em] leading-none">CASE OPENED</span>
        </motion.div>
        <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75 }} className="display mt-8 text-[clamp(18px,2.6vw,28px)] italic text-ivory-dim">“{claim}”</motion.p>
      </div>
    </motion.div>
  );
}
