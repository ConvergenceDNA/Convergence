'use strict';
/* =========================================================
   Convergence — Learn content and Pre-Research Checklists
   Based on "Y-DNA Lineage Reconstruction: Theory and Application"
   by David C. Joyce
   ========================================================= */

const EDU_SECTIONS = [
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