/* ==========================================================================
   Lexicon — Offline Oxford-Style Dictionary & Linguistic Analysis Engine
   ========================================================================== */

window.LexiconDictionary = (function () {
  'use strict';

  const OFFLINE_DICTIONARY = {
    ephemeral: {
      syllables: "e·phem·er·al", ipa: "/ɪˈfɛm.ər.əl/", category: "Literature",
      synonyms: ["fleeting", "transient", "momentary", "evanescent"],
      tip: "Greek 'ephemeros' (lasting only a day) — think of cherry blossoms or morning mist.",
      meanings: [
        { pos: "adjective", def: "Lasting for a very short time; quickly fading from existence or memory.", example: "Fame on social media is often ephemeral, peaking in hours and vanishing by the weekend." },
        { pos: "noun", def: "An ephemeral plant or organism, or a short-lived cultural artifact.", example: "Desert ephemerals bloom rapidly right after rare rainfall." }
      ]
    },
    ubiquitous: {
      syllables: "u·biq·ui·tous", ipa: "/juːˈbɪk.wɪ.təs/", category: "Everyday Precision",
      synonyms: ["omnipresent", "everywhere", "pervasive", "universal"],
      tip: "Latin 'ubique' means 'everywhere' — use it for things so common you barely notice them.",
      meanings: [
        { pos: "adjective", def: "Present, appearing, or found everywhere at the same time.", example: "Smartphones have become ubiquitous in modern classrooms and cafés alike." }
      ]
    },
    serendipity: {
      syllables: "ser·en·dip·i·ty", ipa: "/ˌsɛr.ənˈdɪp.ɪ.ti/", category: "Books & Ideas",
      synonyms: ["fortuity", "chance", "providence", "happy accident"],
      tip: "Coined by Horace Walpole in 1754 for making fortunate discoveries by accident.",
      meanings: [
        { pos: "noun", def: "The occurrence and development of events by chance in a happy or beneficial way.", example: "Finding that rare out-of-print edition in a tiny alley bookshop was pure serendipity." }
      ]
    },
    sanguine: {
      syllables: "san·guine", ipa: "/ˈsæŋ.ɡwɪn/", category: "Mindset",
      synonyms: ["optimistic", "buoyant", "hopeful", "confident"],
      tip: "Means cheerfully optimistic even in tough situations (not to be confused with 'sanguinary').",
      meanings: [
        { pos: "adjective", def: "Optimistic or positive, especially in an apparently bad or difficult situation.", example: "Despite the delayed launch, the lead remained sanguine about meeting the quarterly goal." }
      ]
    },
    perspicacious: {
      syllables: "per·spi·ca·cious", ipa: "/ˌpɜː.spɪˈkeɪ.ʃəs/", category: "Books & Ideas",
      synonyms: ["astute", "discerning", "shrewd", "incisive"],
      tip: "Root 'spec' (to see) + 'per' (through) = seeing right through complexity to the core truth.",
      meanings: [
        { pos: "adjective", def: "Having a ready insight into and sharp understanding of complex things.", example: "Her perspicacious critique uncovered a subtle flaw that three earlier reviews had missed." }
      ]
    },
    lucid: {
      syllables: "lu·cid", ipa: "/ˈluː.sɪd/", category: "Communication",
      synonyms: ["clear", "coherent", "luminous", "transparent"],
      tip: "Latin 'lux' (light) — a lucid explanation shines clean light on a confusing subject.",
      meanings: [
        { pos: "adjective", def: "Expressed clearly; easy to understand and logically coherent.", example: "He wrote a remarkably lucid summary of quantum entanglement for general readers." },
        { pos: "adjective", def: "Showing ability to think clearly, especially in intervals between confusion.", example: "She described having a vivid, lucid dream where she could steer the story." }
      ]
    },
    pragmatic: {
      syllables: "prag·mat·ic", ipa: "/præɡˈmæt.ɪk/", category: "Work & Craft",
      synonyms: ["practical", "realistic", "sensible", "matter-of-fact"],
      tip: "Favors what works reliably in practice over abstract theoretical perfection.",
      meanings: [
        { pos: "adjective", def: "Dealing with things sensibly and realistically based on practical rather than theoretical considerations.", example: "They took a pragmatic approach, shipping a fast offline app before adding cloud sync." }
      ]
    },
    nuance: {
      syllables: "nu·ance", ipa: "/ˈnjuː.ɑːns/", category: "Communication",
      synonyms: ["subtlety", "shade", "distinction", "refinement"],
      tip: "French 'nuer' (to shade) — the small shades of meaning that elevate clear writing.",
      meanings: [
        { pos: "noun", def: "A subtle difference in or shade of meaning, expression, or sound.", example: "Translation requires capturing the emotional nuance of a phrase, not just its literal words." }
      ]
    },
    eloquent: {
      syllables: "el·o·quent", ipa: "/ˈɛl.ə.kwənt/", category: "Communication",
      synonyms: ["articulate", "expressive", "persuasive", "fluent"],
      tip: "Describes fluent, persuasive speech or writing — or even an expressive silence.",
      meanings: [
        { pos: "adjective", def: "Fluent or persuasive in speaking or writing; clearly expressing an emotion or message.", example: "Her eloquent closing remarks left the auditorium completely silent." }
      ]
    },
    resilient: {
      syllables: "re·sil·ient", ipa: "/rɪˈzɪl.jənt/", category: "Mindset",
      synonyms: ["adaptable", "hardy", "buoyant", "tenacious"],
      tip: "Literally 'leaping back' (Latin 'resilire') — recovering shape quickly after pressure.",
      meanings: [
        { pos: "adjective", def: "Able to withstand or recover quickly from difficult conditions or setbacks.", example: "Local-first software is resilient because it keeps working even when the internet drops." }
      ]
    },
    mitigate: {
      syllables: "mit·i·gate", ipa: "/ˈmɪt.ɪ.ɡeɪt/", category: "Work & Craft",
      synonyms: ["alleviate", "reduce", "lessen", "soften"],
      tip: "Used for lowering risk, harm, or severity.",
      meanings: [
        { pos: "verb", def: "Make something bad less severe, serious, or painful.", example: "Automated daily backups mitigate the risk of losing months of research notes." }
      ]
    },
    ambivalent: {
      syllables: "am·biv·a·lent", ipa: "/æmˈbɪv.ə.lənt/", category: "Mindset",
      synonyms: ["conflicted", "torn", "uncertain", "mixed"],
      tip: "Pulled strongly in two opposite directions — not the same as indifferent.",
      meanings: [
        { pos: "adjective", def: "Having mixed feelings or contradictory ideas about someone or something.", example: "Many readers feel ambivalent about e-books: they love the convenience yet miss paper." }
      ]
    },
    quintessential: {
      syllables: "quin·tes·sen·tial", ipa: "/ˌkwɪn.tɪˈsɛn.ʃəl/", category: "Literature",
      synonyms: ["archetypal", "classic", "definitive", "ideal"],
      tip: "From 'fifth essence' — the purest, most representative example of something.",
      meanings: [
        { pos: "adjective", def: "Representing the most perfect or typical example of a quality or class.", example: "A crisp white shirt and dark denim remain the quintessential minimalist uniform." }
      ]
    },
    taciturn: {
      syllables: "tac·i·turn", ipa: "/ˈtæs.ɪ.tɜːn/", category: "Literature",
      synonyms: ["reserved", "reticent", "uncommunicative", "quiet"],
      tip: "Related to 'tacit' (unspoken) — someone who naturally speaks very little.",
      meanings: [
        { pos: "adjective", def: "Reserved or uncommunicative in speech; saying little.", example: "Though taciturn in meetings, his written design memos were remarkably thorough." }
      ]
    },
    alacrity: {
      syllables: "a·lac·ri·ty", ipa: "/əˈlæk.rɪ.ti/", category: "Everyday Precision",
      synonyms: ["eagerness", "readiness", "enthusiasm", "promptness"],
      tip: "Usually paired with 'with': 'She accepted the invitation with alacrity.'",
      meanings: [
        { pos: "noun", def: "Brisk and cheerful readiness; eager willingness to act.", example: "He accepted the challenge with alacrity and sketched a prototype before lunch." }
      ]
    },
    ameliorate: {
      syllables: "a·me·lio·rate", ipa: "/əˈmiː.li.ə.reɪt/", category: "Work & Craft",
      synonyms: ["improve", "enhance", "better", "ease"],
      tip: "Latin 'melior' (better) — to improve a bad or unsatisfactory situation.",
      meanings: [
        { pos: "verb", def: "Make something bad or unsatisfactory better.", example: "Shorter daily review sessions helped ameliorate study fatigue." }
      ]
    },
    candid: {
      syllables: "can·did", ipa: "/ˈkæn.dɪd/", category: "Communication",
      synonyms: ["frank", "honest", "forthright", "direct"],
      tip: "Refreshingly honest and direct without sugarcoating.",
      meanings: [
        { pos: "adjective", def: "Truthful and straightforward; frank and open.", example: "I appreciate your candid feedback on the interface—it saved us weeks of iteration." }
      ]
    },
    catalyst: {
      syllables: "cat·a·lyst", ipa: "/ˈkæt.əl.ɪst/", category: "Books & Ideas",
      synonyms: ["spark", "stimulus", "impetus", "trigger"],
      tip: "Borrowed from chemistry: speeds up meaningful change without being consumed.",
      meanings: [
        { pos: "noun", def: "A person or thing that precipitates an event or speeds up meaningful change.", example: "Keeping a daily word streak became the catalyst for her renewed love of reading." }
      ]
    },
    catharsis: {
      syllables: "ca·thar·sis", ipa: "/kəˈθɑː.sɪs/", category: "Literature",
      synonyms: ["release", "purging", "relief", "cleansing"],
      tip: "Emotional release and relief after intense expression or reflection.",
      meanings: [
        { pos: "noun", def: "The process of releasing, and thereby providing relief from, strong or repressed emotions.", example: "Writing in a late-night journal offered a quiet sense of catharsis." }
      ]
    },
    cognizant: {
      syllables: "cog·ni·zant", ipa: "/ˈkɒɡ.nɪ.zənt/", category: "Books & Ideas",
      synonyms: ["aware", "conscious", "mindful", "informed"],
      tip: "Almost always followed by 'of': 'cognizant of the constraints'.",
      meanings: [
        { pos: "adjective", def: "Having knowledge or being consciously aware of something.", example: "Good designers stay cognizant of how cognitive load affects daily habits." }
      ]
    },
    concise: {
      syllables: "con·cise", ipa: "/kənˈsaɪs/", category: "Communication",
      synonyms: ["succinct", "brief", "crisp", "compact"],
      tip: "Saying a lot clearly in very few, carefully chosen words.",
      meanings: [
        { pos: "adjective", def: "Giving a lot of information clearly and in a few words; brief but comprehensive.", example: "A concise definition is far easier to remember than a dense paragraph." }
      ]
    },
    conundrum: {
      syllables: "co·nun·drum", ipa: "/kəˈnʌn.drəm/", category: "Books & Ideas",
      synonyms: ["dilemma", "puzzle", "riddle", "quandary"],
      tip: "A tricky problem with no obvious or easy answer.",
      meanings: [
        { pos: "noun", def: "A confusing and difficult problem or question.", example: "Balancing rich features with a minimal interface is a classic product design conundrum." }
      ]
    },
    dichotomy: {
      syllables: "di·chot·o·my", ipa: "/daɪˈkɒt.ə.mi/", category: "Books & Ideas",
      synonyms: ["division", "contrast", "split", "polarity"],
      tip: "Greek 'dicha' (in two) + 'tomia' (cutting) — a sharp split into two contrasting halves.",
      meanings: [
        { pos: "noun", def: "A division or contrast between two things represented as being opposed or entirely different.", example: "There is often a false dichotomy between simplicity and power in software." }
      ]
    },
    discerning: {
      syllables: "dis·cern·ing", ipa: "/dɪˈsɜː.nɪŋ/", category: "Everyday Precision",
      synonyms: ["perceptive", "selective", "judicious", "refined"],
      tip: "Describes sharp taste and sound judgment.",
      meanings: [
        { pos: "adjective", def: "Having or showing good judgment and keen perception of quality.", example: "Discerning listeners immediately noticed the warmth of the acoustic recording." }
      ]
    },
    eclectic: {
      syllables: "ec·lec·tic", ipa: "/ɪˈklɛk.tɪk/", category: "Everyday Precision",
      synonyms: ["diverse", "varied", "wide-ranging", "assorted"],
      tip: "Hand-picking the best elements from many different styles or sources.",
      meanings: [
        { pos: "adjective", def: "Deriving ideas, style, or taste from a broad and diverse range of sources.", example: "Her bookshelf held an eclectic mix of typography manuals, sci-fi novels, and stoic essays." }
      ]
    },
    elucidate: {
      syllables: "e·lu·ci·date", ipa: "/ɪˈluː.sɪ.deɪt/", category: "Communication",
      synonyms: ["clarify", "explain", "illuminate", "expound"],
      tip: "Shares the 'luc' (light) root with 'lucid' — to shine light on a tough topic.",
      meanings: [
        { pos: "verb", def: "Make something clear; explain thoroughly.", example: "A single well-chosen example can elucidate a word faster than three abstract definitions." }
      ]
    },
    enigma: {
      syllables: "e·nig·ma", ipa: "/ɪˈnɪɡ.mə/", category: "Literature",
      synonyms: ["mystery", "riddle", "puzzle", "paradox"],
      tip: "A mysterious person or unexplained phenomenon.",
      meanings: [
        { pos: "noun", def: "A person or thing that is mysterious, puzzling, or difficult to understand.", example: "Even after decades of study, the manuscript's author remains an enigma." }
      ]
    },
    equanimity: {
      syllables: "e·qua·nim·i·ty", ipa: "/ˌɛk.wəˈnɪm.ɪ.ti/", category: "Mindset",
      synonyms: ["composure", "calmness", "poise", "serenity"],
      tip: "Latin 'aequus' (even) + 'animus' (mind) — literally an 'even mind' under stress.",
      meanings: [
        { pos: "noun", def: "Mental calmness, composure, and evenness of temper, especially in a difficult situation.", example: "She handled the live demo outage with remarkable equanimity." }
      ]
    },
    erudite: {
      syllables: "er·u·dite", ipa: "/ˈɛr.ʊ.daɪt/", category: "Books & Ideas",
      synonyms: ["scholarly", "learned", "knowledgeable", "well-read"],
      tip: "Pronounced EH-roo-dite — describes deep, wide-ranging scholarly knowledge.",
      meanings: [
        { pos: "adjective", def: "Having or showing great knowledge or learning.", example: "The professor delivered an erudite lecture without once glancing at his notes." }
      ]
    },
    esoteric: {
      syllables: "es·o·ter·ic", ipa: "/ˌɛs.əˈtɛr.ɪk/", category: "Books & Ideas",
      synonyms: ["obscure", "arcane", "specialized", "recondite"],
      tip: "Understood only by a small inner circle of specialists.",
      meanings: [
        { pos: "adjective", def: "Intended for or likely to be understood by only a small number of people with specialized knowledge.", example: "Avoid esoteric jargon when writing onboarding copy for everyday users." }
      ]
    },
    exacerbate: {
      syllables: "ex·ac·er·bate", ipa: "/ɪɡˈzæs.ə.beɪt/", category: "Work & Craft",
      synonyms: ["worsen", "aggravate", "intensify", "compound"],
      tip: "Opposite of 'mitigate' — makes an already bad problem worse.",
      meanings: [
        { pos: "verb", def: "Make a problem, bad situation, or negative feeling worse.", example: "Adding too many mandatory form fields only exacerbates user drop-off." }
      ]
    },
    fastidious: {
      syllables: "fas·tid·i·ous", ipa: "/fæsˈtɪd.i.əs/", category: "Work & Craft",
      synonyms: ["meticulous", "particular", "exacting", "scrupulous"],
      tip: "Very attentive to accuracy and tiny details.",
      meanings: [
        { pos: "adjective", def: "Very attentive to and concerned about accuracy and detail.", example: "He was fastidious about pixel alignment and typography spacing." }
      ]
    },
    fortuitous: {
      syllables: "for·tu·i·tous", ipa: "/fɔːˈtjuː.ɪ.təs/", category: "Everyday Precision",
      synonyms: ["lucky", "serendipitous", "chance", "providential"],
      tip: "Happening by a lucky, fortunate coincidence.",
      meanings: [
        { pos: "adjective", def: "Happening by a lucky chance; fortunate and unexpected.", example: "Their fortuitous meeting at the conference sparked a five-year collaboration." }
      ]
    },
    gregarious: {
      syllables: "gre·gar·i·ous", ipa: "/ɡrɪˈɡɛə.ri.əs/", category: "Everyday Precision",
      synonyms: ["sociable", "outgoing", "convivial", "friendly"],
      tip: "From Latin 'grex' (flock) — someone who thrives in company.",
      meanings: [
        { pos: "adjective", def: "Fond of company; sociable and enjoying being with other people.", example: "Her gregarious nature made every newcomer feel welcome within minutes." }
      ]
    },
    ineffable: {
      syllables: "in·ef·fa·ble", ipa: "/ɪnˈɛf.ə.bəl/", category: "Literature",
      synonyms: ["indescribable", "inexpressible", "unspeakable", "transcendent"],
      tip: "Use for beauty, awe, or joy so immense that words fall short.",
      meanings: [
        { pos: "adjective", def: "Too great or extreme to be expressed or described in words.", example: "Standing beneath the aurora borealis filled them with an ineffable sense of wonder." }
      ]
    },
    juxtapose: {
      syllables: "jux·ta·pose", ipa: "/ˌdʒʌk.stəˈpəʊz/", category: "Work & Craft",
      synonyms: ["contrast", "compare", "place side by side"],
      tip: "Placing two contrasting things side by side to highlight their differences.",
      meanings: [
        { pos: "verb", def: "Place or deal with close together for contrasting effect.", example: "The layout juxtaposes generous whitespace with crisp monospace typography." }
      ]
    },
    laconic: {
      syllables: "la·con·ic", ipa: "/ləˈkɒn.ɪk/", category: "Communication",
      synonyms: ["terse", "concise", "brief", "pithy"],
      tip: "Named after Laconia (Sparta), famous for ultra-short, sharp replies.",
      meanings: [
        { pos: "adjective", def: "Using very few words; brief to the point of seeming blunt or witty.", example: "His laconic reply to the three-page proposal was simply: 'Ship it.'" }
      ]
    },
    luminous: {
      syllables: "lu·mi·nous", ipa: "/ˈluː.mɪ.nəs/", category: "Literature",
      synonyms: ["radiant", "glowing", "brilliant", "bright"],
      tip: "Works literally for light and figuratively for exceptionally clear prose.",
      meanings: [
        { pos: "adjective", def: "Full of or shedding steady light; bright or shining, especially in the dark.", example: "The essay's luminous prose made complex philosophy feel effortless." }
      ]
    },
    magnanimous: {
      syllables: "mag·nan·i·mous", ipa: "/mæɡˈnæn.ɪ.məs/", category: "Mindset",
      synonyms: ["generous", "charitable", "gracious", "noble"],
      tip: "Latin 'magnus' (great) + 'animus' (spirit) — big-hearted, especially toward a rival.",
      meanings: [
        { pos: "adjective", def: "Generous or forgiving, especially toward a rival or less powerful person.", example: "In a magnanimous gesture, the winner praised her opponent's strategy on stage." }
      ]
    },
    meticulous: {
      syllables: "me·tic·u·lous", ipa: "/məˈtɪk.jʊ.ləs/", category: "Work & Craft",
      synonyms: ["thorough", "careful", "exacting", "precise"],
      tip: "Positive word for extreme care and thoroughness in craft.",
      meanings: [
        { pos: "adjective", def: "Showing great attention to detail; very careful and precise.", example: "Her meticulous notes allowed the entire team to reproduce the experiment on the first try." }
      ]
    },
    myriad: {
      syllables: "myr·i·ad", ipa: "/ˈmɪr.i.əd/", category: "Everyday Precision",
      synonyms: ["countless", "innumerable", "multitude", "plethora"],
      tip: "Works as an adjective ('myriad possibilities') or a noun ('a myriad of stars').",
      meanings: [
        { pos: "noun", def: "A countless or extremely great number of people or things.", example: "The night sky revealed a myriad of stars far from the city lights." },
        { pos: "adjective", def: "Countless or extremely great in number.", example: "Modern learners have myriad tools at their fingertips." }
      ]
    },
    nascent: {
      syllables: "nas·cent", ipa: "/ˈnæs.ənt/", category: "Work & Craft",
      synonyms: ["emerging", "budding", "developing", "incipient"],
      tip: "Latin 'nasci' (to be born) — a new habit or trend just coming to life.",
      meanings: [
        { pos: "adjective", def: "Just coming into existence and beginning to display signs of future potential.", example: "A nascent daily reading habit grows strongest when protected by low-friction tools." }
      ]
    },
    obfuscate: {
      syllables: "ob·fus·cate", ipa: "/ˈɒb.fʌs.keɪt/", category: "Communication",
      synonyms: ["obscure", "confuse", "muddy", "cloud"],
      tip: "Opposite of 'elucidate' — to make something murky or hard to understand.",
      meanings: [
        { pos: "verb", def: "Render obscure, unclear, or unintelligible.", example: "Overly dense legal wording can obfuscate simple user rights." }
      ]
    },
    panacea: {
      syllables: "pan·a·ce·a", ipa: "/ˌpæn.əˈsiː.ə/", category: "Books & Ideas",
      synonyms: ["cure-all", "remedy", "elixir", "silver bullet"],
      tip: "Usually used skeptically ('not a panacea') for a supposed cure-all.",
      meanings: [
        { pos: "noun", def: "A solution or remedy for all difficulties or diseases.", example: "Flashcards are powerful, though no single technique is a panacea for language mastery." }
      ]
    },
    paradox: {
      syllables: "par·a·dox", ipa: "/ˈpær.ə.dɒks/", category: "Books & Ideas",
      synonyms: ["contradiction", "irony", "anomaly", "enigma"],
      tip: "Sounds self-contradictory at first glance yet reveals a deeper truth.",
      meanings: [
        { pos: "noun", def: "A seemingly absurd or self-contradictory statement that when investigated may prove true.", example: "It is a paradox of productivity that doing fewer things often achieves much more." }
      ]
    },
    pithy: {
      syllables: "pith·y", ipa: "/ˈpɪθ.i/", category: "Communication",
      synonyms: ["concise", "succinct", "punchy", "terse"],
      tip: "'Pith' is the essential core — a pithy remark delivers maximum punch in minimal words.",
      meanings: [
        { pos: "adjective", def: "Concise and forcefully expressive.", example: "Her pithy one-sentence summary captured the heart of the entire book." }
      ]
    },
    plethora: {
      syllables: "pleth·o·ra", ipa: "/ˈplɛθ.ər.ə/", category: "Everyday Precision",
      synonyms: ["abundance", "excess", "profusion", "surfeit"],
      tip: "An overwhelming abundance or excess of something.",
      meanings: [
        { pos: "noun", def: "A large or excessive amount of something.", example: "A plethora of widgets on the homepage can distract users from their core habit." }
      ]
    },
    poignant: {
      syllables: "poign·ant", ipa: "/ˈpɔɪ.njənt/", category: "Literature",
      synonyms: ["moving", "touching", "bittersweet", "evocative"],
      tip: "Pronounced POY-nyuhnt (silent 'g') — deeply moving, often bittersweet.",
      meanings: [
        { pos: "adjective", def: "Evoking a keen sense of sadness, nostalgia, or heartfelt emotion.", example: "The final chapter offered a poignant reminder of how quickly seasons pass." }
      ]
    },
    prescient: {
      syllables: "pre·scient", ipa: "/ˈprɛs.i.ənt/", category: "Books & Ideas",
      synonyms: ["farsighted", "prophetic", "visionary", "clairvoyant"],
      tip: "'Pre' (before) + 'scient' (knowing) — foreseeing events before they unfold.",
      meanings: [
        { pos: "adjective", def: "Having or showing knowledge of events before they take place.", example: "His 1995 essay about pocket-sized computers turned out to be remarkably prescient." }
      ]
    },
    prolific: {
      syllables: "pro·lif·ic", ipa: "/prəˈlɪf.ɪk/", category: "Work & Craft",
      synonyms: ["productive", "abundant", "fertile", "fruitful"],
      tip: "Used for creators or thinkers who produce a high volume of strong work.",
      meanings: [
        { pos: "adjective", def: "Producing abundant works, results, or ideas.", example: "She was a prolific essayist who published a thoughtful column every Sunday." }
      ]
    },
    quixotic: {
      syllables: "quix·ot·ic", ipa: "/kwɪkˈsɒt.ɪk/", category: "Literature",
      synonyms: ["idealistic", "romantic", "impractical", "visionary"],
      tip: "From Don Quixote — charmingly idealistic, even if impractical.",
      meanings: [
        { pos: "adjective", def: "Exceedingly idealistic; unrealistic and impractical.", example: "Memorizing the entire dictionary in alphabetical order proved to be a quixotic quest." }
      ]
    },
    sagacious: {
      syllables: "sa·ga·cious", ipa: "/səˈɡeɪ.ʃəs/", category: "Mindset",
      synonyms: ["wise", "astute", "shrewd", "judicious"],
      tip: "Related to 'sage' — denotes seasoned wisdom and sound judgment.",
      meanings: [
        { pos: "adjective", def: "Having or showing keen mental discernment and good judgment; wise and shrewd.", example: "Her sagacious mentor advised focusing on daily consistency rather than marathon cramming." }
      ]
    },
    salient: {
      syllables: "sa·lient", ipa: "/ˈseɪ.li.ənt/", category: "Communication",
      synonyms: ["prominent", "notable", "key", "striking"],
      tip: "Latin 'salire' (to leap) — the salient points leap right off the page.",
      meanings: [
        { pos: "adjective", def: "Most noticeable, important, or prominent.", example: "The workspace surfaces only the most salient habit metrics at a glance." }
      ]
    },
    stoic: {
      syllables: "sto·ic", ipa: "/ˈstəʊ.ɪk/", category: "Mindset",
      synonyms: ["composed", "unflappable", "resilient", "enduring"],
      tip: "Calm endurance under pressure without complaining.",
      meanings: [
        { pos: "adjective", def: "Enduring pain or hardship without showing one's feelings or complaining.", example: "He remained stoic throughout the winter storm, calmly tending the generator." },
        { pos: "noun", def: "A person who can endure hardship without complaining.", example: "Modern stoics practice distinguishing what they control from what they cannot." }
      ]
    },
    succinct: {
      syllables: "suc·cinct", ipa: "/səkˈsɪŋkt/", category: "Communication",
      synonyms: ["concise", "brief", "compact", "crisp"],
      tip: "Clean, tightly edited expression with zero wasted words.",
      meanings: [
        { pos: "adjective", def: "Briefly and clearly expressed, with no wasted words.", example: "Use succinct prompts so you can capture a new word in under three seconds." }
      ]
    },
    tenacious: {
      syllables: "te·na·cious", ipa: "/təˈneɪ.ʃəs/", category: "Mindset",
      synonyms: ["persistent", "determined", "resolute", "dogged"],
      tip: "Latin 'tenere' (to hold) — holding fast and refusing to let go.",
      meanings: [
        { pos: "adjective", def: "Tending to keep a firm hold of something; persisting stubbornly in pursuit of a goal.", example: "Tenacious learners turn five minutes a day into thousands of mastered words." }
      ]
    },
    transient: {
      syllables: "tran·sient", ipa: "/ˈtræn.zi.ənt/", category: "Literature",
      synonyms: ["temporary", "fleeting", "ephemeral", "brief"],
      tip: "Lasting only a short time — often used for moods, stays, or weather.",
      meanings: [
        { pos: "adjective", def: "Lasting only for a short time; impermanent.", example: "The afternoon rain was transient, leaving the streets bright and cool ten minutes later." }
      ]
    },
    veracity: {
      syllables: "ve·rac·i·ty", ipa: "/vəˈræs.ɪ.ti/", category: "Books & Ideas",
      synonyms: ["truthfulness", "accuracy", "honesty", "fidelity"],
      tip: "Habitual truthfulness or factual accuracy.",
      meanings: [
        { pos: "noun", def: "Conformity to facts; accuracy and habitual truthfulness.", example: "Journalists verify primary sources to ensure the veracity of every quote." }
      ]
    },
    voracious: {
      syllables: "vo·ra·cious", ipa: "/vəˈreɪ.ʃəs/", category: "Everyday Precision",
      synonyms: ["insatiable", "avid", "eager", "ravenous"],
      tip: "Commonly paired with 'reader' or 'appetite for knowledge'.",
      meanings: [
        { pos: "adjective", def: "Having an eager, insatiable approach to an activity.", example: "As a voracious reader, she constantly saved unfamiliar words to review later." }
      ]
    },
    zenith: {
      syllables: "ze·nith", ipa: "/ˈzɛn.ɪθ/", category: "Literature",
      synonyms: ["peak", "pinnacle", "apex", "summit"],
      tip: "Opposite of 'nadir' — the highest peak of success or momentum.",
      meanings: [
        { pos: "noun", def: "The time at which something is most powerful, successful, or at its highest point.", example: "The chart highlighted Saturday as the zenith of her monthly vocabulary streak." }
      ]
    },
    zephyr: {
      syllables: "zeph·yr", ipa: "/ˈzɛf.ər/", category: "Literature",
      synonyms: ["breeze", "draft", "gust", "air"],
      tip: "From Zephyrus, the Greek god of the gentle west wind.",
      meanings: [
        { pos: "noun", def: "A soft, gentle, mild breeze.", example: "A cool evening zephyr drifted through the open study window." }
      ]
    },
    verbose: {
      syllables: "ver·bose", ipa: "/vɜːˈbəʊs/", category: "Communication",
      synonyms: ["wordy", "long-winded", "prolix", "rambling"],
      tip: "Opposite of 'succinct' — using far more words than needed.",
      meanings: [
        { pos: "adjective", def: "Using or expressed in more words than are needed.", example: "Editing out verbose introductions makes guides much easier to scan." }
      ]
    },
    whimsical: {
      syllables: "whim·si·cal", ipa: "/ˈwɪm.zɪ.kəl/", category: "Everyday Precision",
      synonyms: ["playful", "fanciful", "quirky", "capricious"],
      tip: "Light-hearted, delightfully imaginative charm.",
      meanings: [
        { pos: "adjective", def: "Playfully quaint or fanciful, especially in an appealing and amusing way.", example: "The bookstore featured whimsical hand-drawn maps of fictional worlds." }
      ]
    },
    zealous: {
      syllables: "zeal·ous", ipa: "/ˈzɛl.əs/", category: "Mindset",
      synonyms: ["fervent", "passionate", "devoted", "ardent"],
      tip: "Intense enthusiasm and devotion to a craft or cause.",
      meanings: [
        { pos: "adjective", def: "Having or showing great energy or enthusiasm in pursuit of a cause or objective.", example: "A zealous typographer notices kerning flaws from across the room." }
      ]
    },
    wistful: {
      syllables: "wist·ful", ipa: "/ˈwɪst.fəl/", category: "Literature",
      synonyms: ["nostalgic", "longing", "melancholy", "pensive"],
      tip: "A gentle, quiet longing for something past or slightly out of reach.",
      meanings: [
        { pos: "adjective", def: "Having or showing a feeling of vague or regretful longing.", example: "She gave a wistful smile as she flipped through her university notebooks." }
      ]
    },
    astute: {
      syllables: "as·tute", ipa: "/əˈstjuːt/", category: "Work & Craft",
      synonyms: ["shrewd", "sharp", "perceptive", "canny"],
      tip: "Quick, practical intelligence that spots opportunities or pitfalls fast.",
      meanings: [
        { pos: "adjective", def: "Having or showing an ability to accurately assess situations or people.", example: "An astute observer noticed that users added words mostly during evening reading." }
      ]
    },
    brevity: {
      syllables: "brev·i·ty", ipa: "/ˈbrɛv.ɪ.ti/", category: "Communication",
      synonyms: ["conciseness", "shortness", "economy", "terse style"],
      tip: "Shakespeare wrote: 'Brevity is the soul of wit.'",
      meanings: [
        { pos: "noun", def: "Concise and exact use of words in writing or speech; shortness of time.", example: "The memo stood out for its refreshing brevity and clear action items." }
      ]
    },
    empathy: {
      syllables: "em·pa·thy", ipa: "/ˈɛm.pə.θi/", category: "Mindset",
      synonyms: ["understanding", "compassion", "sensitivity", "insight"],
      tip: "Stepping into another person's perspective to feel with them.",
      meanings: [
        { pos: "noun", def: "The ability to understand and share the feelings and perspective of another.", example: "Great software begins with genuine empathy for how people work every day." }
      ]
    },
    fortitude: {
      syllables: "for·ti·tude", ipa: "/ˈfɔː.tɪ.tjuːd/", category: "Mindset",
      synonyms: ["courage", "grit", "endurance", "strength"],
      tip: "Quiet inner courage during long challenges.",
      meanings: [
        { pos: "noun", def: "Courage and steady resolve in the face of pain or adversity.", example: "Rebuilding after the setback demanded quiet fortitude and patience." }
      ]
    },
    harbinger: {
      syllables: "har·bin·ger", ipa: "/ˈhɑː.bɪn.dʒər/", category: "Literature",
      synonyms: ["forerunner", "herald", "sign", "precursor"],
      tip: "An early sign announcing what is about to arrive.",
      meanings: [
        { pos: "noun", def: "A person or thing that announces or signals the approach of another.", example: "The first warm breeze in March was a welcome harbinger of spring." }
      ]
    },
    incisive: {
      syllables: "in·ci·sive", ipa: "/ɪnˈsaɪ.sɪv/", category: "Communication",
      synonyms: ["sharp", "penetrating", "keen", "trenchant"],
      tip: "Cuts straight through fluff to the core point.",
      meanings: [
        { pos: "adjective", def: "Intelligently analytical and clear-thinking; cutting straight to the heart of an issue.", example: "Her incisive question reframed the entire product roadmap in thirty seconds." }
      ]
    },
    nonchalant: {
      syllables: "non·cha·lant", ipa: "/ˌnɒn.ʃəˈlɑːnt/", category: "Everyday Precision",
      synonyms: ["casual", "unconcerned", "relaxed", "effortless"],
      tip: "Appearing coolly calm and unbothered.",
      meanings: [
        { pos: "adjective", def: "Feeling or appearing casually calm and relaxed; not displaying anxiety.", example: "He gave a nonchalant shrug before sinking the game-winning shot." }
      ]
    },
    respite: {
      syllables: "res·pite", ipa: "/ˈrɛs.paɪt/", category: "Everyday Precision",
      synonyms: ["break", "relief", "pause", "breather"],
      tip: "A welcome short pause from something intense or exhausting.",
      meanings: [
        { pos: "noun", def: "A short period of rest or relief from something difficult or unpleasant.", example: "A quiet afternoon walk provided welcome respite from back-to-back meetings." }
      ]
    },
    sublime: {
      syllables: "sub·lime", ipa: "/səˈblaɪm/", category: "Literature",
      synonyms: ["exalted", "awe-inspiring", "transcendent", "magnificent"],
      tip: "Excellence or beauty so elevated it inspires genuine awe.",
      meanings: [
        { pos: "adjective", def: "Of such excellence, grandeur, or beauty as to inspire great admiration or awe.", example: "The view of the snow-capped ridge at sunrise was nothing short of sublime." }
      ]
    }
  };

  function syllabifyWord(word) {
    const clean = String(word || '').toLowerCase().trim();
    if (clean.length <= 3) return clean;
    const chunks = clean.match(/[^aeiouy]*[aeiouy]+(?:[^aeiouy]*$|[^aeiouy](?=[^aeiouy]))?/gi);
    if (!chunks || chunks.length <= 1) return clean;
    return chunks.join('·');
  }

  function estimateIpa(word) {
    const w = String(word || '').toLowerCase().trim();
    const p = w
      .replace(/tion$/g, 'ʃən').replace(/sion$/g, 'ʒən').replace(/cious$/g, 'ʃəs').replace(/tious$/g, 'ʃəs')
      .replace(/ph/g, 'f').replace(/sh/g, 'ʃ').replace(/ch/g, 'tʃ').replace(/th/g, 'θ').replace(/qu/g, 'kw')
      .replace(/ee/g, 'iː').replace(/oo/g, 'uː').replace(/igh/g, 'aɪ')
      .replace(/ous$/g, 'əs').replace(/ing$/g, 'ɪŋ').replace(/ed$/g, 'd').replace(/y$/g, 'i');
    return '/' + p + '/';
  }

  function guessPosAndHint(word) {
    const w = String(word || '').toLowerCase();
    if (/(tion|sion|ment|ness|ity|ance|ence|ism|ist|ship)$/.test(w)) return { pos: 'noun', hint: 'Suffix pattern indicates a noun.' };
    if (/(ous|ful|less|able|ible|ive|ic|al|ant|ent)$/.test(w)) return { pos: 'adjective', hint: 'Suffix pattern indicates a descriptive adjective.' };
    if (/(ly)$/.test(w)) return { pos: 'adverb', hint: 'Suffix "-ly" typically indicates an adverb.' };
    if (/(ate|ize|ise|ify)$/.test(w)) return { pos: 'verb', hint: 'Suffix pattern indicates a verb.' };
    return { pos: 'noun', hint: 'Offline linguistic estimate — connect online anytime for full Gemini / Dictionary details.' };
  }

  function offlineLookup(rawWord) {
    const key = String(rawWord || '').trim().toLowerCase();
    if (OFFLINE_DICTIONARY[key]) {
      const entry = OFFLINE_DICTIONARY[key];
      return {
        word: rawWord.trim(),
        syllables: entry.syllables,
        ipa: entry.ipa,
        category: entry.category,
        synonyms: entry.synonyms.slice(),
        tip: entry.tip,
        meanings: entry.meanings.map(m => ({ ...m })),
        source: 'Offline Oxford-Style Lexicon',
        audioUrl: ''
      };
    }
    const morph = guessPosAndHint(key);
    return {
      word: rawWord.trim(),
      syllables: syllabifyWord(key),
      ipa: estimateIpa(key),
      category: 'General',
      synonyms: [],
      tip: morph.hint,
      meanings: [{
        pos: morph.pos,
        def: `Saved offline entry for "${rawWord.trim()}". Click "Edit details" to add your own definition, or enrich once online.`,
        example: `I saved "${rawWord.trim()}" to revisit later.`
      }],
      source: 'Offline Linguistic Engine',
      audioUrl: ''
    };
  }

  return {
    OFFLINE_DICTIONARY,
    syllabifyWord,
    estimateIpa,
    offlineLookup
  };
})();
