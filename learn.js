'use strict';
/* =========================================================
   Convergence — Learn content and Pre-Research Checklists
   Based on "Y-DNA Lineage Reconstruction: Theory and Application"
   by David C. Joyce
   ========================================================= */

const EDU_SECTIONS = [
  { title: "How to Use Convergence", topics: [
    ["Where to start", "On the Home screen, answer the two Start here questions: whether you or a male relative has taken a Y-DNA test, and which one. The app then tells you which path to follow (SNP-first for Big Y-700, STR-first for Y-37, Y-67 or Y-111, or Non-Tester Research if no one has tested yet), lists what to gather, and starts your first case. To see what a finished case looks like first, click Look at a finished example."],
    ["What a case is", "Each case is built around one ancestor: the man you believe your testers descend from in the direct male line, father to son. Everything about him goes in his case: the testers, their DNA results, the records and the conclusion. Start a new case for each ancestor you research. They are listed in the menu on the left."],
    ["Gather before you begin", "Have these ready before you start a case: each tester's results from FamilyTreeDNA, each tester's birth year and how many generations he is from the ancestor (his father is generation 1), and your family tree back to the ancestor with the records that support it. For Big Y-700 testers, also have each tester's SNP path from FamilyTreeDNA Discover. For Y-37, Y-67 or Y-111 testers, have the Genetic Distance (GD) between each pair from the Y-DNA Matches page."],
    ["Moving through the steps", "A case moves one step at a time. Each step starts with a question and a What to do box that explains exactly what to enter. Fill in what you have, then click Continue. Click Back to return to an earlier step. Everything saves automatically as you type, so you can stop at any time and pick up where you left off."],
    ["Choosing your question", "On the Goal screen, choose what you want to find out, such as whether a documented ancestor is the right man or how far back two lines connect. The app tailors its advice to your question and shows whether your evidence has answered it: Answered, Lead found or Not answered yet."],
    ["Testers and their DNA", "On the Testers & DNA step, add each man who has taken a Y-DNA test and descends from the ancestor in the direct male line. Enter his birth year, the number of generations back to the ancestor, his test and, for Big Y-700, his SNP path. Use made-up labels such as Tester A if you prefer not to use names."],
    ["Reading the results", "The SNP Analysis step draws the testers' SNP tree and shows where their lines meet. The STR Analysis step estimates how many generations back two testers connect from their Genetic Distance, with a likely range. The Convergence step then weighs the DNA and the records together and shows whether they agree."],
    ["Your report", "The Report step brings the whole case together. Download it as a Word document or print it. Treat the conclusions as provisional: new records or new test results can change them."],
    ["Without a Y-DNA test", "Use Non-Tester Research in the left menu. You compare your documented line with the lineage groupings of a surname project, rule out the groupings that conflict with your records, and narrow down where your line most likely belongs. A Y-DNA test of a male-line descendant can then confirm it."],
    ["Keeping your research safe", "Your research is saved on this computer only. Go to Settings & Backup and click Export backup now and then to keep a copy, or to move your research to another computer with Import backup."]
  ] },
  { title: "Theory of SNP Research", topics: [
    ["The SNP-First Method", "Begin Y-DNA lineage research with SNP data, ideally from a Big Y-700 test. Single Nucleotide Polymorphisms (SNPs) are permanent, one-letter changes in the DNA that are passed down the paternal line. Because they do not change once formed, they give the research a solid foundation before STR markers and documents are considered."],
    ["Using SNPs to Avoid Research Bias", "A surname’s best-known origin can lead researchers to assume where a family came from. Checking the SNP evidence first prevents this: men who share a paternal lineage share the same SNPs, whatever the surname’s reputation suggests. Let the SNPs point to the origin, then look for documents that support it."],
    ["SNPs are Passed Down over the Generations", "Once a SNP forms, it is passed from father to son in every following generation. A SNP that formed centuries ago is still carried today by the male-line descendants of the man in whom it first appeared, which makes SNPs a lasting record of a paternal line and a pillar for genealogical research."],
    ["SNPs Represent the Y-DNA of a Patrilineal Ancestor", "A new SNP forms roughly every 3–5 generations, through a copying error in the Y chromosome passed from a father to his son. The man in whom it first appears is the first to carry it, and only his male-line descendants inherit it. Each SNP therefore represents a specific patrilineal ancestor."],
    ["SNPs Represent Geographical Origins", "Because each SNP began with one man, it is tied to where that man lived. Over time, SNPs become associated with particular regions, so the SNPs a tester carries can point to the geographical origins of his paternal line."],
    ["Not all lineages with the Same Surname Inherit the Same SNPs", "Families with the same surname often carry entirely different Y-DNA signatures. Surnames were adopted independently by unrelated men, so a shared name can act as a disguise for separate paternal origins. Only the SNPs show which lineage a tester actually belongs to."],
    ["SNPs and Non-Paternal Events", "Non-Paternal Event (NPE) refers to a break between the documented paternal line and the biological Y-chromosome line. This occurs when the man recorded as a father in the genealogy is not the biological father, resulting in a different Y-DNA signature than expected. NPEs can arise from various circumstances, such as adoption, informal name changes, extramarital paternity, or other undocumented family events, and are typically identified when Y-DNA results do not match others who share the same surname or claimed lineage."],
    ["Y-DNA Testers Can Inherit more than one SNP", "Because a new SNP forms every few generations, every man carries a chain of SNPs reaching back thousands of years: his terminal (most recent) SNP and all of the older SNPs above it. Each SNP in the chain marks an ancestor further back in the paternal line."],
    ["SNPs Mutate Slowly Over Time", "Because new SNPs arise approximately every 3–5 generations within a patrilineal lineage, they serve as stable markers for tracing the deep ancestral roots of a family. In contrast, Short Tandem Repeat (STR) markers mutate more rapidly over recent generations, making them better suited for distinguishing closely related individuals. While STR markers capture short-term variation, SNPs provide a more reliable foundation for reconstructing the long-term structure of a Y-DNA signature."],
    ["SNPs can Trace the Migration of a Family Over Time", "A Y-DNA signature contains a chain of SNPs that formed at different times and, often, in different places. Following those SNPs from the oldest to the most recent can trace a family’s movement over time, from an ancestral homeland to later places of settlement."],
    ["SNPs have Formation Dates", "Each SNP has an estimated formation date, which FamilyTreeDNA’s Discover feature provides for most SNPs. Formation dates show roughly when a SNP appeared, separate SNPs that fall within a genealogical timeframe from much older ones, and help reconstruct a lineage’s migration path."],
    ["SNP Formation Dates Roughly Equal Birth Years", "Aim to align the formation date of a SNP with the birth year of the ancestor believed to be the first to carry it. Because formation dates are approximate, use them as a compass toward a conclusion rather than a fixed answer. A SNP dated to c.1601 and an ancestor born in 1609, for example, would be a close alignment and a first step toward convergence."],
    ["Limitations of SNP Formation Dates", "SNP formation dates are estimates based on how often mutations are observed in tested Y-DNA results, not on exact historical records. Because different family lines can accumulate SNPs faster or slower than average, these dates can shift as more testers are added and new data becomes available. For this reason, formation dates should be used as a guide rather than treated as exact values. While they can be incorporated into formulas to estimate generational distance, mutation rates, or timelines, such calculations are only approximate and should be interpreted within a range rather than as precise figures."],
    ["SNPs as Branching Events", "Each new SNP creates a new branch on the Y-DNA Phylogenetic Tree. Comparing the SNPs of different testers shows where their paternal lines split from one another and which branch each family line belongs to."],
    ["SNPs as Historical Anchors", "SNPs function as fixed points in time within a patrilineal lineage. While documents can be destroyed or lost, SNPs remain permanently embedded in a family’s Y-DNA. Because each SNP originates with a single male ancestor, it provides a stable point from which genealogical timelines can be reconstructed, and, when combined with documentary and historical evidence, that ancestor becomes an anchor for the family’s research."],
    ["Inheritance of SNPs should be consistent Across All Testers", "To align genetic and documentary evidence, all testers descending from the same ancestor should carry the same SNPs and reach them at a similar Generations Per SNP (GPS) rate. When every descendant of an ancestor carries the same SNP at about the same number of generations back, the evidence converges."],
    ["Inheritance of SNPs is Measurable", "Despite SNPs mutating at random intervals, one can measure how often they occur throughout a patrilineal timeline by applying standard Y-DNA calculations such as Generations Per SNP (GPS) and Years Per SNP (YPS). Afterward, one can align these results with documented birth years and genealogical records to test whether the genetic and traditional evidence converge."]
  ] },
  { title: "Common Mistakes in SNP Interpretation", topics: [
    ["Same Surname, Different SNPs", "Assuming all men with the same surname share the same SNP is incorrect. Surnames are cultural identifiers and do not necessarily reflect a single biological lineage. Multiple unrelated patrilines can adopt the same surname over time, resulting in different DNA signatures within the same name group. Only SNP and STR marker testing can confirm whether individuals share a common paternal origin."],
    ["Treating SNPs as Recent Lineage Markers", "Treating SNPs as indicators of recent ancestry is incorrect. SNPs typically arise over many generations and define the deeper structure of a patrilineal lineage rather than close, recent relationships. Because they mutate slowly, SNPs are best used to establish long-term lineage branches, while more recent connections are better evaluated using STR markers."],
    ["SNPs Do not always Match Documented Genealogy", "SNP inheritance does not always align with documented genealogical records. While genealogy reflects recorded family relationships, Y-DNA follows the biological paternal line, which may differ due to errors, gaps in documentation, or events such as non-paternal events (NPEs). As a result, a mismatch between SNP evidence and genealogy should not be assumed to be incorrect data, but rather an indication that the recorded lineage and the biological lineage may not fully correspond."],
    ["Ignoring the Possibility of Non-Paternal Events (NPEs)", "Ignoring the possibility of Non-Paternal Events (NPEs) can lead to incorrect conclusions in Y-DNA analysis. NPEs create a break between the documented paternal line and the biological Y-DNA line, often without any record in genealogical sources. When SNP or STR results do not align with expected lineage patterns, this should not be assumed to be an error in the data. Instead, it indicates that the recorded ancestry and the biological lineage have diverged at some point in the past."],
    ["Assuming mutation rates are fixed", "Assuming mutation rates are fixed can lead to inaccurate conclusions in genetic genealogy. While averages such as generations per SNP provide a useful guideline, mutation rates vary between lineages and over time. Some branches may accumulate mutations more quickly or more slowly than expected. As a result, these rates should be treated as flexible estimates rather than constants, and conclusions should be expressed as ranges rather than exact values."]
  ] },
  { title: "Theory of STR Marker Research", topics: [
    ["The STR-First Method", "Short Tandem Repeat (STR) markers are regions of the Y chromosome that mutate more often than SNPs, which makes them better for distinguishing closely related men. Where SNPs reveal the long-term structure of a lineage, STR markers capture recent variation. Starting with STR markers is useful for questions about the last few centuries."],
    ["Using STR Markers to Avoid Research Bias", "Documents alone can suggest that everyone with a surname descends from one family. Comparing STR results between testers tests that assumption directly: men who share a surname but have very different STR values belong to different paternal lines, whatever the paper trail suggests."],
    ["STR-Markers Mutate once Every Few Generations", "Since STR markers are characterized as mutating more quickly than SNPs, they are best used for identifying how closely one Y-DNA tester is related to another tester. This is observed by contrasting the number and values of differing STR markers between testers. This contrast in markers which is defined in Y-DNA studies as the Genetic Distance (GD), gives insight into how closely one tester is related to another tester. If a tester, for example, has a 1 marker difference between another tester, then they often have a MRCA within a few generations. However, if they have a GD of 8, they share a very distant patrilineal ancestor."],
    ["STR Markers Mutation Rates Vary", "Not all STR markers mutate at the same speed. Markers are grouped by mutation rate from x-slow, slow, slow-medium and medium to fast-medium, fast and x-fast. A difference on a fast-mutating marker is far more common than a difference on a slow one."],
    ["STR markers are Comparative, not Definitive", "Serving the important function of determining how closely two or more testers are, STR markers are characterized by frequent and random mutations. This is because STR markers mutate at different rates and can undergo back mutation between values over successive generations. As a result, while STR markers are effective for comparing testers, they are not sufficient on their own for definitively confirming branching points from specific ancestors. This contrasts with SNPs, which are stable, permanent, and lineage-defining."],
    ["STR markers Carry Genealogical Weight", "Because STR markers mutate at different rates, not all mutations carry equal genealogical significance. This variation in mutation behavior gives rise to what can be described as genealogical weight. Slower-mutating markers, which change infrequently over generations, carry greater weight, as a mutation in such a marker represents a relatively rare event within a lineage. By contrast, faster-mutating markers change more frequently and therefore carry less weight, as their mutations may occur within only a few generations or even reverse through back mutation."],
    ["STR Markers Carry More Importance at Higher-Level Testing", "The more STR markers that are tested, the more reliable they become. At lower marker levels, such as 12 or 25 markers, a single mutation can have a disproportionate effect on the perceived relationship between two testers. As testing expands to 37, 67 or 111 markers, the influence of any single mutation is reduced and the broader pattern of variation becomes more apparent."],
    ["STR Markers are Measurable", "STR markers can be measured because they mutate at observable and predictable rates, allowing the differences between testers to be counted and analyzed. This makes it possible to calculate the Genetic Distance (GD) between testers and use it to estimate how far back a Most Recent Common Ancestor (MRCA) lies."]
  ] },
  { title: "Common Mistakes in STR Interpretation", topics: [
    ["Using STR Data to Define Lineage Instead of Refine it", "Using STR data alone to define lineage can lead to incorrect conclusions. While platforms like FamilyTreeDNA group STR matches based on genetic distance, these groupings reflect degrees of similarity rather than clearly defined lineage structure. STR matching is designed to identify potential relationships within a genetic range, not to establish distinct branches of deep ancestry. Without SNP confirmation or well-supported context, STR groupings may combine individuals who share similarity but do not belong to the same defined lineage."]
  ] },
  { title: "Convergence of Evidence", topics: [
    ["Defining Convergence", "In Y-DNA studies convergence is the point at which multiple independent lines of evidence, SNP data, STR marker variation, and traditional genealogical records, align to support the same conclusion regarding a shared paternal lineage. Rather than relying on a single form of evidence, convergence requires that each line of evidence independently points toward the same ancestral relationship. This is observed when SNPs establish the fixed branching structure of a lineage, STR markers estimate the degree of relatedness between testers, and traditional records provide the historical and genealogical context."],
    ["The Three Lines of Evidence", "When reconstructing Y-DNA signatures with SNP data, STR marker variation, and traditional genealogical records, each type of evidence represents an independent methodology used to evaluate a proposed paternal lineage. With SNP evidence, the branching structure of a lineage is confirmed, defining how different patrilines relate to one another over long periods of time. By contrast, STR marker variation measures the degree of relatedness between testers, offering insight into how closely individuals are connected within that structure."],
    ["Recognizing Convergence", "Recognizing convergence involves identifying when multiple lines of evidence align within expected ranges to support the same lineage conclusion. This occurs when SNP placement corresponds with the documented genealogy, STR-based genetic distances fall within reasonable expectations for related testers, and estimated SNP formation dates align with known birth years. When these conditions are met, the evidence is consistent across genetic and traditional sources, indicating a well-supported reconstruction."],
    ["Resolving Conflict", "Resolving conflicts requires a systematic reassessment of each line of evidence to determine the source of inconsistency. This process begins by confirming SNP placement to ensure the correct lineage structure is established. STR results are then reinterpreted, taking into account mutation rates and the relative weight of each marker. Finally, the traditional genealogy is reviewed for potential errors, omissions, or incorrect assumptions. By working through each layer of evidence, the researcher refines the analysis and restores alignment where possible."],
    ["Convergence as a Method", "Convergence is not a passive outcome, but an active research process that requires the deliberate testing and refinement of a lineage hypothesis across multiple lines of evidence. It is achieved by systematically confirming SNP placement, recalculating and interpreting STR variation, and critically reviewing traditional genealogical records. Each layer must be examined, challenged, and brought into alignment through careful analysis. Only after inconsistencies are identified and resolved can convergence be reached, resulting in a conclusion that is not assumed, but earned through disciplined evaluation."]
  ] },
  { title: "Common Mistakes in Convergence Interpretation", topics: [
    ["Relying on a single line of evidence", "Relying on a single line of evidence can lead to incomplete or incorrect conclusions in genetic genealogy. No single source, whether DNA results or documented genealogy, provides a complete picture on its own. Each has its strengths and limitations, and conclusions drawn from only one line of evidence may overlook contradictions or missing context. Strong analysis requires the convergence of multiple lines of evidence, where genetic data, genealogical records, and historical context are considered together to produce a more accurate and reliable interpretation."],
    ["Ignoring Conflicting Evidence Instead of Resolving it", "When evidence does not align, it should not be ignored. Conflicts between DNA results, genealogical records, or historical context often reveal gaps, errors, or previously unknown factors such as misattributed relationships or incomplete documentation. Dismissing these discrepancies can lead to incorrect conclusions or reinforce false assumptions. Instead, conflicting evidence should be examined and resolved, as doing so strengthens the analysis and leads to a more accurate understanding of lineage."],
    ["Failing to Revisit Earlier Assumptions", "As new evidence becomes available, earlier assumptions must be re-evaluated. Initial conclusions are often based on limited data, and over time, additional DNA results, genealogical records, or historical context may challenge those interpretations. If these assumptions are not revisited, errors can persist and shape the direction of further analysis. Regularly reassessing prior conclusions ensures that interpretations remain accurate, consistent, and supported by the full body of available evidence."],
    ["Treating Convergence as Automatic", "Convergence should not be assumed simply because some evidence appears to align. True convergence requires independent lines of evidence, such as DNA results, genealogical records, and historical context, to consistently support the same conclusion. Partial agreement or surface-level similarity does not constitute convergence and may overlook conflicting or incomplete data. Convergence must be demonstrated through careful analysis, where all relevant evidence is evaluated and shown to align in a meaningful and consistent way."]
  ] },
  { title: "Y-DNA Lineage Reconstruction for Non-Testers", topics: [
    ["Surname Project-Based Research", "Surname Project-Based Y-DNA Analysis begins with the study of organized Y-DNA project data, most commonly through FamilyTreeDNA. These projects group tested individuals into identifiable lineages based on shared genetic patterns, and in supporting genealogies. For non-testers, this serves as the starting point, allowing them to examine surname, geographic, and lineage-based patterns within the project. By comparing their documented genealogy to these groupings, the researcher can begin to determine where their lineage may align."],
    ["The Geographic Alignment Method", "The Geographic Alignment Method evaluates whether a researcher’s documented patrilineal genealogy corresponds to the geographic distribution of a given Y-DNA grouping. This is achieved by comparing the known locations associated with the researcher’s lineage to the regional concentration of tested individuals within that group. This assessment is not based on a single location, but on the overall pattern of geographic consistency. As a consequence, the researcher’s ancestry must align with the established geographic range of the Y-DNA grouping."],
    ["Aligning SNPs with the Grouping", "Defined as the process of identifying where a tested lineage fits within the structure of a Y-DNA project, each grouping is defined by a shared SNP, which represents a distinct paternal branch. Testers who carry the same defining SNP are placed within the same grouping, establishing a shared lineage at that level. The first step is to identify the tester’s terminal SNP and locate it within the project, which determines which grouping the tester belongs to."],
    ["The Elimination Method", "The Elimination Method begins by setting aside what does not fit, rather than attempting to identify the correct lineage straight away. The researcher works through each potential Y-DNA grouping and removes those that conflict with the documented genealogy. Comparing names, locations and known family connections against each grouping exposes clear inconsistencies that rule out the wrong Y-DNA signatures."],
    ["Narrowing to a Single Lineage", "After the inconsistent groupings have been eliminated, the focus shifts to which lineage continues to fit across the evidence. Names, locations, and known family connections must align, resulting in a conclusion without contradiction. When they do, the conclusion is based on convergence, providing the strongest support for identifying the lineage."],
    ["Limitations", "Non-tester research has its limits. Geographic comparison, elimination and convergence can narrow the possibilities, but they do not always produce a definitive conclusion. Not every surname or Y-DNA project includes all documented lineages, so the researcher is only working within what has been tested. The absence of a matching lineage does not mean it does not exist, only that it may not yet be represented. Any conclusion must therefore be understood in relation to the available data."],
    ["Access to Additional Data Through Testing", "There is a difference in the amount of information available to those who have tested and those who have not. Testers have direct access to their Y-DNA results, including SNP, STR marker values, and genetic matches. This provides a level of detail that is not available through project data alone. For researchers without testing, analysis is limited to what can be observed within Y-DNA projects and the documented ancestral lines associated with tested individuals. Where project-based analysis may narrow the range of possible lineages, testing can confirm placement within a specific lineage."],
    ["Contacting Project Administrators", "There are times when the available data within a project is not enough to resolve an inquiry. In these cases, the next step is to reach out to the project administrators. Project administrators often have a broader view of the lineage structure than what is visible in the FTDNA surname projects. This may include additional test results, unpublished testers, or a clearer understanding of how certain ancestral lines relate to one another. Contact should be made with a specific purpose, and the researcher should present their documented genealogy, outline the groupings under consideration, and identify where the uncertainty remains."]
  ] },
  { title: "Common Mistakes in Non-Tester Research", topics: [
    ["Treating a Narrowed Lineage as Confirmed", "Because non-tester conclusions are based on comparison, grouping and elimination rather than direct testing, there is a greater risk of overinterpretation. A lineage that has been narrowed down is a probable placement, not a confirmed one. It should be presented as narrowed until Y-DNA testing of a descendant confirms it."],
    ["Forcing a Single Conclusion", "Failing to recognize unresolved outcomes can lead to incorrect conclusions in non-tester research. Not all cases can be fully resolved through comparison and elimination alone, and some will remain inconclusive. Treating uncertainty as an error, or forcing a conclusion when the evidence does not support one, can result in misinterpretation. When the available data does not clearly align, the outcome should be recognized as unresolved rather than assumed."],
    ["Relying on Genealogy Without Sufficient Comparison", "Documented genealogy must be evaluated against project data to ensure accuracy. Without proper comparison to lineage groupings, genealogical lines may be misinterpreted or incorrectly placed. Assuming records are complete or correct without verification can introduce errors, particularly when contradictions exist. Genealogy should be used in conjunction with grouping structure, not as a standalone source."],
    ["Assuming Surname Alone Indicates Lineage", "A shared surname does not guarantee a shared lineage. Surnames often have multiple independent origins and cannot be treated as biological evidence on their own. Relying on a name without verification through grouping structure can lead to incorrect placement. Lineage must be supported through proper comparison, not assumed based on surname alone."]
  ] }
];

const GLOSSARY = [
  ["Years Per Generation (YPG)", "Number of years between generations.", "YPG = Total years ÷ Generations"],
  ["Generations Per SNP (GPS)", "Number of generations between SNP mutations.", "GPS = Generations ÷ SNPs"],
  ["Years Per SNP (YPS)", "Number of years between SNP mutations.", "YPS = GPS × YPG"],
  ["Genetic Distance (GD)", "Number of differing STR markers between two testers.", ""],
  ["Total Mutation Rate", "Sum of mutation rates across all STR markers.", ""],
  ["Estimated Generational Distance", "Number of generations between a tester and a SNP or ancestor.", "Generations = SNPs × GPS"],
  ["Estimated Years from Generations", "Conversion of generations into years.", "Years = Generations × YPG"],
  ["Estimated SNP Birth Year", "Approximate year a SNP formed.", "Birth Year = Reference Year − (SNPs × YPS)"],
  ["SNP Formation Date", "Estimated time a SNP originated based on genetic data.", "SNP Formation Date ≈ Reference Year − (SNPs × YPS)"],
  ["Most Recent Common Ancestor (MRCA)", "Most recent shared male ancestor between testers.", ""],
  ["Mutation Rate", "Frequency at which a genetic marker changes over time.", ""],
  ["Back Mutation", "Reversion of a STR marker to a previous value.", ""],
  ["Fast Markers", "STR markers that mutate frequently and reflect recent variation.", ""],
  ["Slow Markers", "STR markers that mutate less frequently and carry stronger genealogical weight.", ""],
  ["Convergence", "Alignment of SNP data, STR results, and genealogy within expected ranges.", ""],
  ["Convergence as a Method", "Active process of testing and refining evidence until alignment is achieved.", ""],
  ["Conflict Resolution", "Systematic reassessment of SNPs, STRs, and genealogy to resolve inconsistencies.", ""],
  ["SNP-First Method", "Approach prioritizing SNP data as the foundation of research.", ""],
  ["STR-First Method", "Approach beginning with STR comparison to assess relationships.", ""],
  ["Lineage Reconstruction", "Process of aligning genetic and traditional evidence to rebuild a paternal line.", ""],
  ["Downstream SNP", "More recent SNP within a lineage.", ""],
  ["Upstream SNP", "Earlier SNP shared by broader descendants.", ""],
  ["Y-DNA Signature", "Complete set of SNPs and STR markers defining a paternal lineage.", ""]
];

const CHECKLISTS = {
  tester: {
    title: "Pre-Research Checklist for Y-DNA Testers",
    purpose: "Ensure all data, context, and understanding are in place for accurate, methodical Y-DNA lineage reconstruction.",
    sections: [
      ["Y-DNA Data", [
        ["Confirm test level (37, 67, 111, Big Y)", "Determines the resolution and reliability of your comparisons"],
        ["Access full STR panel", "Required to calculate Genetic Distance (GD) and compare markers accurately"],
        ["Identify terminal SNP", "Defines your exact position within the paternal lineage"],
        ["Verify haplogroup", "Ensures your results are placed in the correct genetic branch"]
      ]],
      ["Matches", [
        ["Identify closest matches (GD)", "Focuses analysis on the most relevant testers"],
        ["Group by GD (0–2, 3–4, 5+)", "Helps distinguish close vs distant relationships"],
        ["Note shared SNP matches", "Confirms testers belong to the same lineage"],
        ["Select key testers", "Prevents analysis from becoming unfocused or overly broad"]
      ]],
      ["STR Review", [
        ["Compare marker values", "Identifies where genetic differences occur"],
        ["Identify differences", "Forms the basis for calculating GD"],
        ["Note fast-mutating markers", "Prevents overestimating distance due to rapid mutation"],
        ["Treat GD as a range", "Avoids interpreting STR differences as exact generational distance"]
      ]],
      ["SNP Structure", [
        ["Identify shared SNP", "Establishes the common ancestral branch"],
        ["Count SNPs to ancestor", "Allows estimation of generational distance"],
        ["Confirm SNP consistency", "Ensures all testers align within the same structure"],
        ["Place testers in SNP tree", "Visualizes lineage relationships"]
      ]],
      ["Genealogy", [
        ["Document paternal line", "Provides the historical framework for comparison"],
        ["Record names, dates, locations", "Enables alignment with genetic data"],
        ["Identify shared ancestors", "Supports or confirms genetic relationships"],
        ["Note gaps or conflicts", "Highlights areas requiring further investigation"]
      ]],
      ["Context", [
        ["Identify geographic origins", "Connects genetic lines to real-world locations"],
        ["Consider migration patterns", "Explains how lineages moved over time"],
        ["Ensure historical plausibility", "Prevents conclusions that conflict with known history"]
      ]],
      ["Data Reliability", [
        ["Evaluate source quality", "Ensures conclusions are based on credible evidence"],
        ["Distinguish documented vs assumed", "Prevents unsupported claims from influencing results"],
        ["Prioritize verified evidence", "Strengthens overall conclusions"]
      ]],
      ["Core Concepts", [
        ["Understand SNP vs STR", "Recognizes structural vs variable genetic markers"],
        ["Understand GD", "Measures relative relatedness between testers"],
        ["Understand GPS (Gen ÷ SNPs)", "Estimates mutation rate across generations"],
        ["Understand YPS (GPS × YPG)", "Converts genetic change into time"],
        ["Expect 3–5 generations per SNP", "Provides a baseline for evaluating results"]
      ]],
      ["Method Readiness", [
        ["Apply SNP + STR + genealogy together", "Ensures conclusions are based on multiple lines of evidence"],
        ["Avoid single-source conclusions", "Prevents overreliance on one dataset"],
        ["Test across multiple lines", "Confirms consistency and accuracy"]
      ]],
      ["Mindset", [
        ["Actively analyze (not passive)", "Requires engagement with data, not observation"],
        ["Avoid forcing conclusions", "Prevents bias in interpretation"],
        ["Stay objective", "Ensures conclusions reflect evidence, not assumptions"]
      ]],
      ["Final Check", [
        ["Select testers", "Defines scope of analysis"],
        ["Organize data", "Prepares for efficient comparison"],
        ["Prepare formulas/tools", "Ensures calculations can be performed correctly"],
        ["Begin analysis", "Proceed with structured methodology"]
      ]]
    ]
  },
  autosomal: {
    title: "Pre-Research Checklist for Autosomal DNA Testers",
    purpose: "Ensure matches, shared DNA, and documented lines are in place for accurate, methodical analysis of the recent generations of a line.",
    sections: [
      ["Autosomal Data", [
        ["Confirm testing company (AncestryDNA, Family Finder, 23andMe, MyHeritage)", "Determines which match list and tools are available"],
        ["Access the full match list", "Required to find the matches who descend from the ancestor"],
        ["Record shared cM and longest segment", "Forms the basis for estimating each relationship"],
        ["Consider uploading raw data to other sites", "Widens the pool of matches beyond one company"]
      ]],
      ["Matches", [
        ["Identify matches with family trees", "Allows the shared ancestor to be found"],
        ["Find matches who descend from the ancestor", "Focuses analysis on the relevant line"],
        ["Note which child each match descends through", "Separates the branches of the family"],
        ["Group matches using shared matches", "Shows which matches belong to the same line"]
      ]],
      ["Shared DNA Review", [
        ["Compare shared cM to the expected range", "Tests whether the documented relationship fits"],
        ["Treat shared cM as a range", "Avoids reading one amount of DNA as one exact relationship"],
        ["Set aside matches under 7 cM", "Small segments can be shared by chance"],
        ["Note intermarriage or double relationships", "Extra shared DNA can make cousins appear closer than they are"]
      ]],
      ["Generations", [
        ["Count generations from each person to the ancestor", "Allows the documented relationship to be worked out"],
        ["Work out the documented relationship", "Provides the expected range for comparison"],
        ["Expect reliable results to about 6th cousins", "Beyond that, shared DNA is too small or too rare to rely on"],
        ["Remember not every cousin shares DNA", "A missing match does not disprove a relationship"]
      ]],
      ["Genealogy", [
        ["Document the line to the ancestor", "Provides the historical framework for comparison"],
        ["Record names, dates, locations", "Enables alignment with genetic data"],
        ["Document each match's line down from the ancestor", "Confirms the match's descent rests on records"],
        ["Note gaps or conflicts", "Highlights areas requiring further investigation"]
      ]],
      ["Context", [
        ["Identify geographic origins", "Connects matches to real-world locations"],
        ["Look for shared surnames and places in matches' trees", "Points to the line the shared DNA came through"],
        ["Ensure historical plausibility", "Prevents conclusions that conflict with known history"]
      ]],
      ["Data Reliability", [
        ["Evaluate source quality", "Ensures conclusions are based on credible evidence"],
        ["Check matches' trees against records", "Unsourced online trees can repeat the same error"],
        ["Prioritize verified evidence", "Strengthens overall conclusions"]
      ]],
      ["Core Concepts", [
        ["Understand centimorgans (cM)", "Measures the amount of DNA shared"],
        ["Understand segments", "Longer segments usually come from a more recent shared ancestor"],
        ["Understand random inheritance", "Each child inherits a different half, so shared DNA varies"],
        ["Understand autosomal reach", "Tests recent generations on every line, not just the direct male line"]
      ]],
      ["Method Readiness", [
        ["Apply shared DNA + genealogy together", "Ensures conclusions are based on multiple lines of evidence"],
        ["Avoid single-match conclusions", "Prevents overreliance on one match"],
        ["Test across multiple branches", "Matches through different children confirm consistency"],
        ["Add Y-DNA where possible", "Extends the direct male line beyond autosomal reach"]
      ]],
      ["Mindset", [
        ["Actively analyze (not passive)", "Requires engagement with data, not observation"],
        ["Avoid forcing conclusions", "Prevents bias in interpretation"],
        ["Stay objective", "Ensures conclusions reflect evidence, not assumptions"]
      ]],
      ["Final Check", [
        ["Select matches", "Defines scope of analysis"],
        ["Organize data", "Prepares for efficient comparison"],
        ["Prepare formulas/tools", "Ensures calculations can be performed correctly"],
        ["Begin analysis", "Proceed with structured methodology"]
      ]]
    ]
  },
  nontester: {
    title: "Pre-Research Checklist for Non-Testers",
    purpose: "Ensure a structured comparison of genealogy against project-based Y-DNA data, allowing lineage placement to be narrowed through SNP alignment, grouping structure, and elimination, while recognizing the limits of non-tested research.",
    sections: [
      ["Project-Based Research", [
        ["Identify relevant Y-DNA projects or studies", "Determines where comparable lineage data exists"],
        ["Locate surname-based groupings", "Establishes the available structure for comparison"],
        ["Review project scope", "Ensures the project contains meaningful and sufficient data"]
      ]],
      ["Lineage Groupings", [
        ["Identify major lineage groupings", "Defines the primary branches associated with the surname"],
        ["Note geographic associations", "Connects each grouping to a specific region"],
        ["Observe grouping structure", "Clarifies how different lineages are separated"]
      ]],
      ["SNP Alignment with Groupings", [
        ["Identify defining SNPs for each grouping", "Establishes the genetic signature of each lineage group"],
        ["Note shared and distinguishing SNPs", "Differentiates between closely related groupings"],
        ["Align SNP data with grouping structure", "Confirms how genetic branches correspond to project groupings"],
        ["Evaluate SNP consistency within groupings", "Ensures testers within a group share the same lineage signature"],
        ["Distinguish between SNP-supported vs. surname-only groupings", "Prevents misclassification based on name alone"]
      ]],
      ["Genealogical Comparison", [
        ["Document paternal line", "Provides the basis for comparison"],
        ["Record names, locations, and family connections", "Allows alignment with project data"],
        ["Compare against groupings", "Determines whether genealogy corresponds to a known lineage"]
      ]],
      ["Pattern Evaluation", [
        ["Observe clustering of testers", "Identifies established lineage groupings"],
        ["Note consistent patterns", "Reveals which groupings align with the genealogy"],
        ["Distinguish between overlapping possibilities", "Prevents premature conclusions"]
      ]],
      ["Elimination", [
        ["Remove inconsistent groupings", "Excludes lineages that conflict with genealogy"],
        ["Retain plausible groupings", "Narrows the range of possible lineages"],
        ["Confirm no contradictions remain", "Ensures remaining options are viable"]
      ]],
      ["Lineage Placement", [
        ["Assess likely ancestral placement", "Based on geography, surname, documented ancestry and SNP alignment"],
        ["Determine level of certainty", "Distinguishes between probable and confirmed placement"]
      ]],
      ["Limitations", [
        ["Recognize incomplete project coverage", "Not all lineages are represented"],
        ["Acknowledge absence of direct testing", "Prevents definitive conclusions"],
        ["Avoid overextending conclusions", "Maintains accuracy of interpretation"]
      ]],
      ["Next Steps", [
        ["Contact project administrators", "Provides additional insight into grouping structure"],
        ["Identify potential test candidates", "Enables future confirmation"],
        ["Continue documentary research", "Supports or refines placement within a lineage"]
      ]],
      ["Mindset", [
        ["Remain objective", "Prevents bias in interpretation"],
        ["Avoid assuming lineage from surname alone", "Ensures reliance on structured comparison"],
        ["Accept unresolved outcomes", "Recognizes that narrowing does not always resolve"]
      ]],
      ["Final Check", [
        ["Have all groupings been reviewed?", ""],
        ["Have inconsistent lineages been eliminated?", ""],
        ["Does the remaining evidence align without contradiction?", ""],
        ["Has the outcome been correctly identified as resolved or narrowed?", ""]
      ]]
    ]
  }
};

/* =========================================================
   Plain-language help for beginners: the words used in each test,
   an introduction to each test, and small steps for each screen.
   ========================================================= */
const PLAIN_TERMS = {
  "DNA": "The instructions inside every cell of your body. You get half of yours from each parent.",
  "Y-DNA": "A piece of DNA that only men have. A father passes it to his son almost unchanged, so it follows the surname line from father to son.",
  "Tester": "A man who has taken a Y-DNA test.",
  "Ancestor": "The person in the past you are trying to connect the testers to.",
  "Generation": "One step from parent to child. A tester's father is 1 generation back, his grandfather 2, his great-grandfather 3.",
  "Direct male line": "Father to son to grandson, with no women in between. This is the line Y-DNA follows.",
  "Circa": "About. Tick it when a number is a close guess rather than proven, and it shows as \"c. 10\".",
  "FamilyTreeDNA": "The company that does Y-DNA tests and shows the results on its website.",
  "Research question": "What you want to find out, such as \"Is this ancestor the right man?\" The app tells you when the evidence answers it.",
  "Big Y-700": "The most detailed Y-DNA test from FamilyTreeDNA. It finds a man's SNPs.",
  "SNP": "Said \"snip\". A tiny, permanent change in Y-DNA. Once it appears in a man, all his sons, grandsons and so on carry it. Men who share an SNP descend from the same man.",
  "SNP path": "A tester's list of SNPs, from his newest back to his oldest. It is like a family tree written in DNA. FamilyTreeDNA Discover shows it under Ancestral Path.",
  "Terminal SNP": "A tester's newest SNP, the first one on his SNP path.",
  "Shared SNP": "An SNP that two or more testers both carry. It shows where their family lines meet.",
  "Formation date": "FamilyTreeDNA's estimate of the year an SNP first appeared. It is an estimate, not an exact date.",
  "GPS": "Generations Per SNP: about how many generations pass between one new SNP and the next. Usually 3 to 5.",
  "YPG": "Years Per Generation: the average number of years between a father's birth and his son's. Usually about 30 to 35.",
  "STR marker": "A spot on the Y-DNA that is counted as a number, such as 13 or 24. The numbers are passed from father to son, but now and then one changes by a step.",
  "Y-37 / Y-67 / Y-111": "Y-DNA tests that count 37, 67 or 111 markers. The more markers, the better the answer.",
  "Genetic Distance (GD)": "How many steps apart two testers' marker numbers are. GD 0 means they are identical. The smaller the GD, the closer the relationship.",
  "Mutation rate": "How often a marker's number changes. Some markers change often, some rarely. The app uses these rates to turn GD into generations.",
  "Common ancestor": "The man two testers both descend from.",
  "Autosomal DNA": "DNA from all your ancestors on both sides of your family, mixed together. Everyone has it, men and women.",
  "Match": "Someone who shares DNA with you, which means you are related. Your testing company lists your matches.",
  "Centimorgan (cM)": "The unit used to measure how much DNA two people share. The more cM, the closer the relatives.",
  "Shared cM": "The total amount of DNA you and a match share, in centimorgans.",
  "Longest segment": "The biggest single piece of DNA you share with a match. Your testing company shows it.",
  "Relationship": "How two people are related, such as 2nd cousins.",
  "Removed": "Cousins a generation apart. Your parent's 1st cousin is your 1st cousin once removed.",
  "Generation chart": "A row of numbered boxes, one per generation back. The dark box is the ancestor from your records; the bronze box is where the DNA estimate falls.",
  "Records": "Papers that prove family links: births, baptisms, marriages, deaths, wills, deeds, census and church records.",
  "Source": "Where a record came from, such as a county will book or a church register.",
  "Supports / Contradicts": "Whether a record agrees with the family line you are testing, or goes against it.",
  "Lost records": "Records that no longer exist, for example after a courthouse fire. The app does not count them for or against the line.",
  "Convergence": "When the DNA and the records point to the same answer. The more evidence that agrees, the stronger the conclusion.",
  "Conflict": "When two pieces of evidence disagree. A conflict needs a reason, such as a mistake in a record or a wrong generation count.",
  "Lineage society": "A society, such as the DAR, that you join by proving descent from a qualifying ancestor.",
  "Qualifying ancestor": "The ancestor a lineage society application is based on, such as a Patriot.",
  "Proof": "The record that shows a link, such as a birth record naming the parents."
};

/* An introduction to each test, written for an adult beginner. Each entry is one paragraph. */
const TEST_INTROS = {
  SNP: { title: "SNP-first: the Big Y-700 test",
    what: [
      "Y-DNA is passed from father to son nearly unchanged, so it traces the direct paternal line much as a surname does. About every three to five generations, a new permanent mutation called an SNP (pronounced \"snip\") arises in one man and is inherited by all of his male-line descendants, so every man who carries that SNP descends from him. FamilyTreeDNA's Big Y-700 test identifies a man's SNPs and arranges them in order of age; this sequence is his SNP path, and the most recent SNP on it is his terminal SNP. FamilyTreeDNA names each SNP (for example, BY12345) and estimates when it formed, known as its formation date. When two testers' paths are compared, the most recent SNP they share marks the point where their paternal lines converge."
    ],
    does: [
      "Here you will enter each tester, his SNP path, and how many generations back his earliest documented ancestor is. The app lines up the paths like a family tree, finds the shared SNP, and estimates how many generations ago the testers' lines meet. It bases that estimate on two averages: generations per SNP (GPS), usually 3 to 5, and years per generation (YPG), usually 30 to 35. It then checks the estimate against your records. When the DNA and the records point to the same ancestor, that agreement is called convergence, and it is what makes a conclusion strong."
    ] },
  "": { title: "STR-first: the Y-37, Y-67 and Y-111 tests",
    what: [
      "Y-DNA passes from father to son nearly unchanged, following the direct paternal line much like a surname. The Y-37, Y-67 and Y-111 tests read 37, 67 or 111 STR markers, each recorded as a number such as 13 or 24. STR markers change much more frequently than SNPs, which makes them useful for comparing men related within the last few centuries. The difference between two testers' numbers is their Genetic Distance (GD): the lower the GD, the more recent their common ancestor. The app uses each marker's mutation rate to estimate how many generations back two testers connect."
    ],
    does: [
      "Here you will enter each tester, how many generations back his earliest documented ancestor is, and the GD between each pair of testers from FamilyTreeDNA's Y-DNA Matches page. The app turns each GD into an estimate of how many generations back the two men connect, then checks that estimate against your records. When the DNA and the records point to the same ancestor, that agreement is called convergence, and it is what makes a conclusion strong."
    ] },
  AUTO: { title: "Autosomal-first: AncestryDNA, 23andMe, MyHeritage and Family Finder",
    what: [
      "Autosomal DNA is inherited from both parents and recombines in every generation, so each person carries a unique mix drawn from ancestors on all sides of the family. Because the amount inherited from any one ancestor roughly halves with each generation, autosomal tests such as AncestryDNA, 23andMe, MyHeritage and FamilyTreeDNA's Family Finder are most reliable within about five or six generations; beyond that, many genuine cousins share little or no detectable DNA. The testing company compares your results against its database and reports each match with the total shared DNA, measured in centimorgans (cM), and the longest shared segment. Together these figures point to a likely range of relationships, from close family to distant cousins, including cousins a generation apart, described as \"removed.\""
    ],
    does: [
      "Here you will enter the matches who descend from your ancestor, how much DNA you share with each, and how many generations each of you is from that ancestor. The app checks whether the shared DNA fits the relationship your family trees show, estimates how far back you connect, and checks that against your records. When the DNA and the records point to the same ancestor, that agreement is called convergence, and it is what makes a conclusion strong."
    ] }
};

/* Each screen in plain words: what it is for (shown on the Introduction), small steps, and the words used on it. */
const STEP_HELP = {
  checklist: { plain: "A list of things to have ready before you start.",
    steps: ["Read each item on the list.", "Tick the ones you have done or understand.", "You do not need to tick them all. You can come back later.", "Click Continue when you are ready."], terms: ["Ancestor", "Records"] },
  overview: { plain: "Choose what you want to find out, and enter the ancestor.",
    steps: ["Choose your question from the list.", "Read \"You need\" to see what to gather.", "Click Continue.", "Type the ancestor's name, birth and death years and where he lived. Estimates are fine.", "Click Continue."], terms: ["Research question", "Ancestor", "Generation"] },
  testers: { plain: "Add each man who took a Y-DNA test.",
    steps: ["Click + Add tester for each man who tested.", "Type his name, or a label such as Tester A.", "Check the earliest documented ancestor. It is filled in for you.", "Type his birth year. Use 1955 if you do not know it.", "Under Generations back, count from his father (1) up to the ancestor.", "Tick Circa if that count is a close guess.", "Choose the test he took."],
    snpSteps: ["Paste his SNP path from FamilyTreeDNA Discover: type his terminal SNP there and open Ancestral Path."],
    terms: ["Tester", "Generation", "Circa", "Y-37 / Y-67 / Y-111"], snpTerms: ["Tester", "Generation", "Circa", "Big Y-700", "SNP path", "Terminal SNP", "FamilyTreeDNA"] },
  snp: { plain: "The app draws the testers' SNPs as a tree and finds where their lines meet.",
    steps: ["Look at the tree. Each box is an SNP, and the testers are listed under their own SNPs.", "Find the shared SNP, where the testers' lines meet. It is highlighted.", "If you know the man an SNP first appeared in, type his name beside it. This is optional.", "Enter FamilyTreeDNA's formation date for the shared SNP.", "Read the generation charts and the answer to your question."],
    terms: ["SNP", "Shared SNP", "Formation date", "GPS", "YPG", "Generation chart"] },
  str: { plain: "Compare the testers two at a time, using their Genetic Distance.",
    steps: ["Click + Add comparison.", "Choose two testers.", "Choose how many markers were compared: 37, 67 or 111.", "Type the GD from FamilyTreeDNA's Y-DNA Matches page.", "Read the estimate: about how many generations back the two connect.", "Choose Yes under Consistent if that fits your family tree."],
    terms: ["Genetic Distance (GD)", "STR marker", "Mutation rate", "Common ancestor", "Generation chart"] },
  matches: { plain: "Add your DNA matches who descend from the ancestor.",
    steps: ["Open your match list on your testing company's website.", "Click + Add match for each match who descends from the ancestor.", "Type the shared cM and the longest segment, as your testing company shows them.", "Count the generations from you up to the ancestor, and from the match up to the ancestor. A parent is 1.", "Type which of the ancestor's children the match descends from."],
    terms: ["Match", "Centimorgan (cM)", "Shared cM", "Longest segment", "Generation"] },
  auto: { plain: "The app checks whether the DNA you share fits each relationship.",
    steps: ["Read each match's row.", "Consistent means the shared DNA fits the relationship your trees show.", "Outside the usual range means the tree needs a second look.", "Too small to rely on means the match shares too little DNA to count.", "Look at the generation charts and read the answer to your question."],
    terms: ["Shared cM", "Relationship", "Removed", "Generation chart"] },
  documents: { plain: "Enter the records that prove the family line.",
    steps: ["Click + Add document for each record.", "Choose its type, and type its date and place.", "Type where it came from (the source).", "Type what it shows.", "Choose Supports if it backs up the line, or Contradicts if it goes against it.", "If the records were destroyed, tick Records for this line are lost."],
    terms: ["Records", "Source", "Supports / Contradicts", "Lost records"] },
  convergence: { plain: "See whether the DNA and the records agree.",
    steps: ["Look at the chart: green supports the line, red goes against it, grey is not tested yet.", "Read the result for each kind of evidence.", "Change Consistent? only if you know better than the app.", "If something disagrees, add it under Conflicts with a possible reason."],
    terms: ["Convergence", "Conflict"] },
  society: { plain: "Set out the proof for a lineage society, one generation at a time.",
    steps: ["Type the society's name and the qualifying ancestor.", "Add one row for each generation, from the applicant up to the qualifying ancestor.", "For each generation, enter the birth, marriage and death with their sources.", "Enter the proof that each person was the child of the next generation.", "Download it when every generation is proven."],
    terms: ["Lineage society", "Qualifying ancestor", "Proof"] },
  report: { plain: "A summary of the whole case to print or download.",
    steps: ["Read the summary from top to bottom.", "Click Download (Word) to save it, or Print.", "Remember that new records or test results can change the result."],
    terms: ["Convergence"] }
};