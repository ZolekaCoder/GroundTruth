# The Ground Truth: Election Desk 2026
### JigJoy Mozaik Hackathon · Freestyle · Novi Sad, 30–31 October 2026

**Don't just read the news. Cross-examine it.**

We built this in Novi Sad, five days after Serbia voted. International observers concluded that media bias and online manipulation *"hampered voters’ ability to obtain impartial and reliable information"* (OSCE/ODIHR, 26 Oct 2026). The United States votes on 3 November and South Africa on 4 November, where the Electoral Commission has just introduced a Disinformation Code.

**The Ground Truth is an evidence court for election claims.** The Election Desk opens on a globe of the three elections, each with a dossier quoted verbatim from primary sources. Choose a claim, or highlight one on any site with the Chrome extension, and it goes on trial.

**Technical innovation: genuinely concurrent Mozaik agents.** One `court.summons` event fans out through Mozaik's own situation specifications, and the Prosecutor, Defender and Investigator each start an independent `runLoop` at the same instant. They share one runtime state: a ledger of verbatim quotations that the server verifies against the retrieved source text, so paraphrased or invented quotes are rejected. A Clerk participant advances the case on `court.filing` events, not on a script. The agents cross-examine one another, tagging each challenge as a **factual** or a **framing** dispute, and revise their positions on the record. A Judge rules on the ledger alone: *Supported, Contradicted, Misleading or Insufficient evidence*, with stated uncertainty and framing problems listed separately from factual errors. The live timeline is drawn from Mozaik's own loop events, so overlapping bars mean overlapping wall-clock time. Silent loop failures are detected and recovered.

**Flagship result (real recorded run).** Given a synthetic claim that quotes the OSCE's praise for turnout while omitting the rest, the court read the OSCE report, entered 9 verified exhibits, and ruled **Misleading (82%)**. It named the problem as selective quotation, a framing issue, rather than a factual error.

**Why now.** Election misinformation is mostly real sentences stripped of context. The Ground Truth makes that visible in minutes, shows the provenance of every quotation, and never treats agreement between AIs as proof.

Synthetic test claims and recorded runs are labelled as such throughout. No political quotation, article or source is fabricated.
