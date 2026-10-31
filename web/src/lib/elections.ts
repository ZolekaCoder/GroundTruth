/**
 * Election Desk dossiers. Every `quote` below is copied verbatim from the linked source and was
 * checked against the retrieved page text with the same verifier the court uses
 * (server/src/court/sources.ts → quoteIsGrounded). Nothing here is paraphrased into quotation marks.
 *
 * `testClaim`s are SYNTHETIC: written by The Ground Truth to exercise the court. They are not
 * quotations from, or attributions to, any person, party or outlet, and the UI labels them so.
 */

export type Citation = { quote: string; publisher: string; title: string; url: string; date: string };

export type Dossier = {
  id: "rs" | "us" | "za";
  atlasId: string; // ISO 3166 numeric, matches world-atlas
  country: string;
  election: string;
  date: string; // ISO
  centroid: [number, number]; // lon, lat
  standfirst: string;
  context: Citation[];
  sources: { label: string; publisher: string; url: string }[];
  testClaim: { text: string; url: string; why: string };
};

export const DOSSIERS: Dossier[] = [
  {
    id: "rs",
    atlasId: "688",
    country: "Serbia",
    election: "Early parliamentary elections",
    date: "2026-10-25",
    centroid: [20.9, 44.1],
    standfirst:
      "A snap vote called after a protest movement that began in Novi Sad, the city where The Ground Truth was built. International observers published preliminary findings the next day.",
    context: [
      {
        quote: "16 people were killed in 2024 when a concrete canopy collapsed at a railway station",
        publisher: "Al Jazeera", title: "Serbia’s snap election: Can Vucic outmanoeuvre the student revolt?",
        url: "https://www.aljazeera.com/features/2026/9/28/serbias-snap-election-can-vucic-outmanoeuvre-the-student-revolt", date: "28 Sep 2026",
      },
      {
        quote: "Student protesters blamed the disaster on government negligence and alleged corruption.",
        publisher: "Al Jazeera", title: "Serbia’s snap election: Can Vucic outmanoeuvre the student revolt?",
        url: "https://www.aljazeera.com/features/2026/9/28/serbias-snap-election-can-vucic-outmanoeuvre-the-student-revolt", date: "28 Sep 2026",
      },
      {
        quote: "The 25 October early parliamentary elections saw active citizen engagement with high voter turnout and vigorous competition between two main contenders, but unfolded in an atmosphere of profound polarization, with the equality of campaign opportunities seriously compromised.",
        publisher: "OSCE/ODIHR", title: "Serbia, Early Parliamentary Elections, 25 October 2026 — preliminary findings",
        url: "https://odihr.osce.org/node/666908", date: "26 Oct 2026",
      },
      {
        quote: "A pronounced bias in monitored media coverage in favour of the incumbent party, coupled with an online environment marked by inflammatory rhetoric and information manipulation, hampered voters’ ability to obtain impartial and reliable information.",
        publisher: "OSCE/ODIHR", title: "Serbia, Early Parliamentary Elections, 25 October 2026 — preliminary findings",
        url: "https://odihr.osce.org/node/666908", date: "26 Oct 2026",
      },
    ],
    sources: [
      { label: "International observers’ preliminary findings", publisher: "OSCE/ODIHR", url: "https://odihr.osce.org/node/666908" },
      { label: "Background: the student movement and the snap election", publisher: "Al Jazeera", url: "https://www.aljazeera.com/features/2026/9/28/serbias-snap-election-can-vucic-outmanoeuvre-the-student-revolt" },
    ],
    testClaim: {
      text: "International observers gave Serbia’s 25 October 2026 election a positive assessment, praising high voter turnout and vigorous competition.",
      url: "https://odihr.osce.org/node/666908",
      why: "Tests selective quotation: it echoes real words from the observers’ report while leaving out what follows them.",
    },
  },
  {
    id: "us",
    atlasId: "840",
    country: "United States",
    election: "Midterm federal general election",
    date: "2026-11-03",
    centroid: [-98.5, 39.5],
    standfirst:
      "The next regularly scheduled federal general election. The FEC itself points out that results are certified by state election offices, a detail often blurred in claims about who “certifies” an election.",
    context: [
      {
        quote: "Tuesday, November 3, 2026, is the next regularly scheduled federal General Election date.",
        publisher: "Federal Election Commission", title: "Election results and voting information",
        url: "https://www.fec.gov/introduction-campaign-finance/election-results-and-voting-information/", date: "Retrieved 31 Oct 2026",
      },
      {
        quote: "Election results are not available immediately from the FEC. Instead, state election offices are responsible for certifying results.",
        publisher: "Federal Election Commission", title: "Election results and voting information",
        url: "https://www.fec.gov/introduction-campaign-finance/election-results-and-voting-information/", date: "Retrieved 31 Oct 2026",
      },
    ],
    sources: [
      { label: "Election results and voting information", publisher: "FEC", url: "https://www.fec.gov/introduction-campaign-finance/election-results-and-voting-information/" },
    ],
    testClaim: {
      text: "The Federal Election Commission certifies the results of the 3 November 2026 midterm elections.",
      url: "https://www.fec.gov/introduction-campaign-finance/election-results-and-voting-information/",
      why: "Tests institutional confusion: a plausible-sounding claim about who certifies results.",
    },
  },
  {
    id: "za",
    atlasId: "710",
    country: "South Africa",
    election: "Local government elections",
    date: "2026-11-04",
    centroid: [24.7, -29.0],
    standfirst:
      "The Electoral Commission has written disinformation rules into the electoral code of conduct for parties and candidates, while explicitly protecting criticism and satire.",
    context: [
      {
        quote: "promulgated the Electoral Code of Conduct Countering Disinformation in the Local Government elections (the Disinformation Code) on Friday, 4 September 2026.",
        publisher: "South African Government", title: "Electoral Commission introduces new Disinformation Code ahead of 2026 Local Government Elections",
        url: "https://www.gov.za/news/media-statements/electoral-commission-introduces-new-disinformation-code-ahead-2026-local", date: "8 Sep 2026",
      },
      {
        quote: "Publicly retract and correct any false or misleading information within 36 hours of becoming aware of it",
        publisher: "South African Government", title: "Electoral Commission introduces new Disinformation Code ahead of 2026 Local Government Elections",
        url: "https://www.gov.za/news/media-statements/electoral-commission-introduces-new-disinformation-code-ahead-2026-local", date: "8 Sep 2026",
      },
      {
        quote: "It permits lawful criticism, opinion, commentary, fair reporting, satire, parody or legitimate democratic debate insofar as these fall within the realm of protected speech.",
        publisher: "South African Government", title: "Electoral Commission introduces new Disinformation Code ahead of 2026 Local Government Elections",
        url: "https://www.gov.za/news/media-statements/electoral-commission-introduces-new-disinformation-code-ahead-2026-local", date: "8 Sep 2026",
      },
    ],
    sources: [
      { label: "IEC Disinformation Code announcement", publisher: "gov.za", url: "https://www.gov.za/news/media-statements/electoral-commission-introduces-new-disinformation-code-ahead-2026-local" },
      { label: "Electoral Commission of South Africa", publisher: "IEC", url: "https://www.elections.org.za/" },
    ],
    testClaim: {
      text: "South Africa’s new election Disinformation Code bans political satire and parody.",
      url: "https://www.gov.za/news/media-statements/electoral-commission-introduces-new-disinformation-code-ahead-2026-local",
      why: "Tests a free-speech scare claim against the text of the code itself.",
    },
  },
];

export const findTestClaim = (claim: string) => DOSSIERS.find((d) => d.testClaim.text === claim.trim());

export function relativeDay(iso: string, now = new Date()) {
  const day = 86_400_000;
  const d = Math.round((Date.parse(iso + "T12:00:00Z") - Date.parse(now.toISOString().slice(0, 10) + "T12:00:00Z")) / day);
  if (d === 0) return "Polling day";
  if (d > 0) return d === 1 ? "Tomorrow" : `In ${d} days`;
  return d === -1 ? "Held yesterday" : `Held ${-d} days ago`;
}
