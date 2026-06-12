/* ═══════════════════════════════════════════════
   js/roasts.js — 100+ roast lines + generator
═══════════════════════════════════════════════ */

const ROAST_POOL = [
  // Main character energy
  "Main character energy detected in every frame.",
  "The AI detected an unusually high conviction that everyone is watching.",
  "Threat level: someone who enters rooms to background music.",
  "Walking in slow motion, even while stationary.",
  "The universe revolves around this energy. The data confirms it.",
  "Local mirrors report a 340% increase in usage.",
  "Has definitely practiced a speech for an award they haven't won yet.",

  // Drama
  "Warning: excessive dramatic behaviour logged.",
  "Drama index exceeded safe thresholds. Twice.",
  "Raised an eyebrow so hard it filed a separate biometric scan.",
  "The AI would like to know who hurt you, and whether it was cinematic.",
  "Facial muscles trained to theatrical professional standards.",
  "Every emotion arrived at least 40% louder than necessary.",
  "Gasped at something that had not yet happened.",

  // Aesthetic / fashion
  "Strong opinions about interior lighting detected.",
  "Knows exactly where every candle in a 5-mile radius is.",
  "Would absolutely redesign your apartment without being asked.",
  "Understands colour theory better than most architects.",
  "Has a skincare routine with more steps than a NASA launch.",
  "Owns at least one item described as 'a statement piece'.",
  "Has referred to an outfit as 'giving' without irony.",

  // Pop culture
  "Beyoncé recognition index: off the charts.",
  "Chromatica was a personal experience.",
  "Has strong, unrequested opinions about the SATC reboot.",
  "Knows the Drag Race winner for every season, including international.",
  "Could locate Taylor Swift's entire discography chronologically under pressure.",
  "Has watched Mamma Mia more times than is strictly necessary.",
  "Understands the Eras Tour setlist as a narrative arc.",

  // Brunch / food
  "Brunch probability: extremely high.",
  "Would absolutely know the best brunch spots in any city.",
  "Has rated a mimosa before 11am with genuine authority.",
  "Considers eggs benedict a personality type.",
  "The phrase 'but first, coffee' is not a joke here. It's a lifestyle.",

  // Voice
  "Vocal fry detected at scientifically impressive levels.",
  "Pitch variation charted like a prog rock album.",
  "Spoke with the energy of someone who has been wronged and is about to explain why.",
  "The word 'literally' was used non-literally at least once.",
  "Added drama to the end of every sentence that didn't require it.",
  "Voice contained more emphasis than the sentence structure warranted.",
  "Audible italics detected in standard speech patterns.",

  // Pose / movement
  "Struck a pose nobody asked for. Struck it with conviction.",
  "Hand placement suggested advanced spatial awareness training.",
  "Head tilt calibrated to maximum coyness.",
  "Maintained a stance that would look excellent in a photo.",
  "Gestured like someone who needs to be understood immediately.",
  "The wrist contributed meaningfully to this analysis.",
  "Body language fluent in Camp.",
  "Arms used for emphasis more than locomotion.",

  // References
  "Has an opinion about Lana Del Rey that takes over ten minutes to explain.",
  "Knows the difference between sad gay and sad, gay.",
  "Cried at a commercial and would do it again.",
  "Has a parasocial relationship described as 'she'd want this for me'.",
  "The response to 'how are you' is a full emotional arc.",
  "Attended something described as a 'vibe' and was correct.",
  "Has called something 'sickening' as a compliment.",

  // Fitness / wellness
  "Hot yoga attendance probability: very high.",
  "Owns a Stanley cup or wants one urgently.",
  "Has described a workout as 'giving pilates princess' without sarcasm.",
  "Wellness routine more elaborate than most corporate strategies.",

  // Gay culture
  "Has an opinion on every episode of Will & Grace, including the reboot.",
  "The phrase 'she's giving' is used correctly and with precision.",
  "Attended at least one event with a dress code described as 'lewk'.",
  "The AI detected familiarity with RuPaul's taxonomy of reading.",
  "Could choreograph a lip sync under pressure.",
  "Has described something as 'camp' with full academic accuracy.",
  "Studied at the Gaga School of Avant-Garde Reaction.",
  "Emotional support animal: a Mariah Carey album.",

  // Attitude
  "Exudes 'I've been through it but my hair looks great' energy.",
  "Confidence level: walking into a room you weren't invited to.",
  "Has rolled their eyes so hard it appeared in the biometric data.",
  "Sarcasm deployed with surgical precision.",
  "Dismissive hand gesture catalogued as a unique biometric event.",
  "Side-eye geometry is advanced.",
  "Delivered a compliment that was also a warning.",

  // Randomness
  "The AI has several follow-up questions.",
  "The data raised more questions than it answered.",
  "Score withheld pending review by a committee of gay scientists.",
  "Something about the jawline activated three separate alerts.",
  "The algorithm short-circuited briefly. We've reset it.",
  "Technically within acceptable parameters. Technically.",
  "The AI called its mother after processing this one.",
  "Results were peer-reviewed. Peers were shook.",
  "This scan has been submitted to the Smithsonian for documentation.",

  // Extra colour / misc
  "Has an emotional support playlist with over 400 songs.",
  "Interior design opinions are extremely specific and extremely correct.",
  "The energy in this room shifted noticeably upon arrival.",
  "Has cried in a parking lot for non-emergency reasons.",
  "Described something as 'not it' with full moral authority.",
  "Understood the assignment. And then some.",
  "The performance exceeded expectations set by people who expected a lot.",
  "Contributed meaningfully to the gay agenda. Details undisclosed.",
  "Could write a thesis on why that specific colour palette is wrong.",
  "The outfit was considered. The energy was not accidental.",
  "Attended an event 'for the girls' and was correct to do so.",
  "Has a relationship with drama that is both complicated and ongoing.",
  "The AI noted an unusual affinity for spaces with good acoustics.",
  "Knows the difference between a lewk and a look.",
  "Expressed an emotion with the whole body when the face would have sufficed.",
  "High probability of owning a vintage something.",
  "Has described a person, place, or food as 'giving everything'.",
  "The AI detected potential for a full Feelings Conversation at any moment.",
  "Would not stand for substandard cheese at a gathering.",
  "Sent a voice note that was over four minutes long. It was appropriate.",
  "The AI flagged several moments as 'for the story'.",
  "Has a clear, memorised ranking of Adele albums.",
  "Understands the cultural weight of a good playlist.",
];

/**
 * Pick `n` random roasts, weighted toward funnier combos for high scores.
 * @param {number} totalScore  0-100
 * @param {number} n           how many to pick (default 6)
 */
function pickRoasts(totalScore, n = 6) {
  const shuffled = [...ROAST_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

/**
 * Generate a face-specific breakdown note.
 */
function faceNote(score) {
  if (score > 80) return "Facial expressiveness exceeded expected parameters. Eyebrow authority detected.";
  if (score > 60) return "Above-average smile intensity and head tilt commitment. Camera eye contact suspicious.";
  if (score > 40) return "Moderate facial animation. Some eyebrow activity logged. More drama possible.";
  return "The face remained largely stoic. The AI was not convinced.";
}

/**
 * Generate a voice-specific breakdown note.
 */
function voiceNote(score) {
  if (score > 80) return "Pitch variation was cinematic. Vocal drama index exceeded safe levels.";
  if (score > 60) return "Good energy bursts detected. Speaking speed suggested someone with a lot to say.";
  if (score > 40) return "Average expressiveness. A few notable emphasis events. More flair recommended.";
  return "Delivery was measured. Calm, even. The AI was not entertained.";
}

/**
 * Generate a performance-specific breakdown note.
 */
function perfNote(score) {
  if (score > 80) return "Arm extension and body movement combined to create a genuinely dramatic spectacle.";
  if (score > 60) return "Solid enthusiasm. Hands were present and accounted for. Head moved meaningfully.";
  if (score > 40) return "Some movement detected. The banana was acknowledged. More commitment possible.";
  return "The banana prompt was met with restraint. The AI is concerned.";
}

/**
 * Select verdict based on total score.
 */
function getVerdict(score) {
  if (score >= 90) return { emoji: "🏳️‍🌈", text: "Statistically undeniable. The AI is not surprised." };
  if (score >= 80) return { emoji: "💅", text: "Aggressively qualified. The data is clear." };
  if (score >= 70) return { emoji: "✨", text: "Would absolutely know the best brunch spots." };
  if (score >= 60) return { emoji: "👀", text: "The performance raised additional questions the AI is still processing." };
  if (score >= 50) return { emoji: "🤔", text: "Significant potential detected. Several follow-up scans recommended." };
  if (score >= 35) return { emoji: "🧐", text: "Inconclusive results. The AI has some notes." };
  return { emoji: "🤷", text: "The AI remains unconvinced. Straight until proven fabulous." };
}
