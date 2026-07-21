/**
 * ⚠️ COPY of supabase/seed/kb-content.ts — kept in sync by hand.
 * Supabase Edge Functions bundle per-function and cannot import from outside
 * their own directory (supabase/seed/ is unreachable at deploy time), so this
 * is a verbatim duplicate. If you edit the seed content, update both files.
 *
 * RecovAI — RAG knowledge-base seed content (Development Plan.md §4.1).
 *
 * Curated for a Mauritian recovery-support chatbot. Every chunk is written
 * to be safe to hand to a language model as ground truth: no dosage or
 * medical-treatment instructions, no claims of clinical authority, and the
 * three crisis contacts are exactly the ones already verified and in use
 * in components/modals/CrisisResourcesModal.tsx (Emergency 999, SAMU 114,
 * Addiction Helpline 5 255 9050) — do not add or alter numbers here without
 * the same verification.
 *
 * `drug_class` is `null` for general content (applicable to every patient)
 * and set to one of the six taxonomy values for class-specific content —
 * see lib/types.ts `DrugClass`. This mirrors kb_documents' nullable column.
 *
 * Each `content` string is one retrieval chunk (~150-350 words, within the
 * ~300-500 token target from Development Plan.md §4.1). `source` records
 * where the guidance is adapted from, for the dissertation's source log —
 * every source here is a well-established, non-proprietary clinical
 * technique (CBT, urge-surfing, sleep hygiene, standard relapse-prevention
 * models), not copied text from any single copyrighted work.
 */

export type DrugClass =
  | 'cannabis'
  | 'synthetic_cannabinoids'
  | 'heroin_opioids'
  | 'stimulants'
  | 'sedatives_benzo'
  | 'other_polydrug';

export interface KbSeedChunk {
  content: string;
  source: string;
  category: string;
  drug_class: DrugClass | null;
}

export const KB_SEED_CONTENT: KbSeedChunk[] = [
  // ---------------------------------------------------------------------
  // CBT — general
  // ---------------------------------------------------------------------
  {
    category: 'cbt',
    drug_class: null,
    source: 'Standard CBT thought-record technique (adapted, general clinical practice)',
    content: `A thought record is a simple way to notice the link between a situation, a thought, and an urge. When a craving or a difficult feeling shows up, it can help to write down four things: what was happening right before the feeling started, the thought that went through your mind, how strong the urge or emotion feels on a scale of 1 to 10, and one alternative, more balanced thought. For example, the thought "I've already had a bad day, one use won't matter" can be gently challenged with "a bad day is temporary, and using would add a second problem on top of the first." This isn't about arguing yourself out of a feeling — it's about noticing that the first thought that appears is often the most extreme one, and that a calmer second thought is usually available if there's space to look for it. Writing it down, even briefly, creates that space. Over time, patterns tend to emerge: certain situations, times of day, or company reliably bring on the same kind of thought, which makes them easier to plan for in advance.`,
  },
  {
    category: 'cbt',
    drug_class: null,
    source: 'Trigger-identification technique (adapted, general clinical practice)',
    content: `Triggers are the specific people, places, feelings, or situations that reliably come before an urge. They tend to fall into a few groups: emotional triggers (stress, boredom, loneliness, anger), social triggers (certain friends, certain gatherings), environmental triggers (a particular street, bar, or time of day), and physical triggers (poor sleep, hunger, fatigue). Keeping a short daily note of what preceded any craving, even a mild one, is one of the most useful habits in early recovery — patterns that feel random in the moment are usually much clearer after a week of data. Once a trigger is identified, there are generally two ways to respond: avoid it where that's realistic (a route, a contact, an event), or prepare a specific plan for it when avoidance isn't possible (who to call, where to go, what to do with the first ten minutes). A plan made in a calm moment is far more reliable than a decision made in the middle of an urge.`,
  },

  // ---------------------------------------------------------------------
  // Craving management — general
  // ---------------------------------------------------------------------
  {
    category: 'craving_management',
    drug_class: null,
    source: 'Urge surfing (Marlatt & Gordon relapse-prevention model, adapted)',
    content: `Urge surfing is the idea that a craving behaves like a wave: it rises, peaks, and then falls, usually within 15 to 30 minutes, whether or not anyone acts on it. The instinct is often to fight the urge or to give in to make it stop, but both responses treat the wave as something that has to be resolved immediately. Instead, the technique is to notice the craving without judging it — naming it plainly ("this is a craving, it will pass") — and to observe where it's felt in the body, whether that's tightness in the chest, restlessness, or a racing mind. Breathing slowly and staying with the sensation, rather than either suppressing it or acting on it, tends to shorten how overwhelming it feels. It can help to set a timer for 15 minutes and simply wait it out while doing something low-effort — a short walk, tidying a small space, or texting a supportive contact. The craving doesn't need to disappear completely for this to work; it only needs to drop enough that a clearer decision becomes possible again.`,
  },
  {
    category: 'craving_management',
    drug_class: null,
    source: 'Delay-distract-decide framework (adapted, general relapse-prevention practice)',
    content: `A simple three-step response to a craving is delay, distract, decide. Delay means committing to wait a fixed amount of time — even ten minutes — before acting on the urge, since cravings weaken with time. Distract means filling that delay with something that occupies attention: physical movement, a phone call, a chore, music, or stepping outside. It doesn't need to be dramatic, just enough to interrupt the loop of thinking about the craving. Decide means that once the delay has passed, the choice gets made from a calmer state rather than the peak of the urge. This sequence works because cravings are strongest for a short window; the goal isn't to eliminate the urge but to get past its peak before deciding anything. Keeping a short list of two or three go-to distractions ready in advance — things that don't require planning in the moment — makes this much easier to use when it's actually needed.`,
  },

  // ---------------------------------------------------------------------
  // Craving management — class-specific
  // ---------------------------------------------------------------------
  {
    category: 'craving_management',
    drug_class: 'cannabis',
    source: 'Cannabis-specific coping guidance (adapted, general clinical practice)',
    content: `Cannabis cravings are often tied closely to routine and boredom — the end of the day, being alone, or specific rituals like a particular chair or time of night. Because the trigger is frequently "nothing else to do" rather than acute distress, replacing the ritual itself tends to help more than fighting the urge directly: a different evening activity, a short walk at the usual "wind-down" time, or a herbal tea in the same spot instead of the usual routine. Sleep disruption and irritability are common in the first couple of weeks without cannabis and are a normal, temporary part of adjustment rather than a sign that something has gone wrong — they typically ease within two to four weeks. Keeping evenings structured with something mildly engaging (not necessarily productive, just occupying) removes a lot of the "empty space" that cravings tend to fill.`,
  },
  {
    category: 'craving_management',
    drug_class: 'stimulants',
    source: 'Stimulant crash-management guidance (adapted, general clinical practice)',
    content: `The days after stopping stimulant use often bring a "crash" — low mood, heavy fatigue, increased appetite, and sometimes irritability or flat affect. This is a well-recognised, temporary withdrawal pattern, not a sign of failure or of worsening mental health on its own, though it should be mentioned to a doctor if it feels severe or doesn't ease after a week or two. During a crash, the most useful things tend to be the least exciting ones: regular meals even without appetite, extra sleep, and reducing demands on yourself for a few days rather than pushing through a normal schedule. Cravings during this period are frequently about wanting energy or motivation back quickly, so it helps to have that specific craving in mind — the urge is often less about the substance itself and more about wanting the low mood to lift immediately. Gentle movement (a walk, stretching) and consistent sleep and wake times tend to shorten the crash more reliably than trying to power through it.`,
  },
  {
    category: 'craving_management',
    drug_class: 'heroin_opioids',
    source: 'Opioid-specific coping guidance (adapted, general clinical practice)',
    content: `Opioid cravings can be intense and are frequently linked to specific physical cues — a particular time of day, physical discomfort, or a memory of relief from a difficult feeling. Cravings tend to be shorter and more physically felt than with some other substances, which makes the urge-surfing approach (naming the craving, observing it in the body, waiting it out) particularly useful here. Because opioid relapse carries a real risk of overdose — tolerance drops quickly after even a short period without use, so a previously "usual" amount can be dangerous again — any return to use after a break deserves extra caution rather than a resumption of an old routine. If a relapse does happen, using around other people rather than alone, and knowing the nearest emergency contact, materially reduces risk. This isn't a substitute for medical support; a doctor or an addiction service should be involved in managing opioid dependence directly, especially around any period of reduced tolerance.`,
  },
  {
    category: 'craving_management',
    drug_class: 'sedatives_benzo',
    source: 'Sedative/benzodiazepine safety-awareness guidance (adapted, general clinical practice)',
    content: `Sedatives and benzodiazepines are different from most other substances in one important way: stopping suddenly after regular, heavy use can itself be medically risky, including a risk of seizures in some cases. This isn't a reason to avoid stopping — it's a reason to do it under a doctor's supervision rather than abruptly on your own, since a supervised taper is significantly safer than stopping all at once. Cravings in this group are often tied to anxiety or sleep difficulty, since the substance may have been used originally to manage one of those. Non-medication approaches that can help alongside medical care include slow breathing exercises, keeping a consistent sleep schedule, and reducing caffeine, which can worsen the anxious feelings that often accompany withdrawal. If you are currently reducing or stopping a sedative or benzodiazepine and are not already working with a doctor on the taper, that is the single most protective step available.`,
  },

  // ---------------------------------------------------------------------
  // Overdose safety — heroin_opioids specific (recognition + emergency
  // response only; no dosage or use instructions of any kind)
  // ---------------------------------------------------------------------
  {
    category: 'overdose_safety',
    drug_class: 'heroin_opioids',
    source: 'Standard opioid overdose recognition guidance (adapted, general public-health practice)',
    content: `Recognising the signs of an opioid overdose can save a life. Warning signs include: very slow, shallow, or stopped breathing; blue or grey lips or fingertips; a limp body; choking, gurgling, or snoring sounds while unconscious; pinpoint pupils; and being unresponsive to shouting, a firm sternum rub, or shaking. If you see these signs in yourself starting to develop, or in someone else, treat it as a medical emergency immediately: call Emergency on 999 or SAMU on 114 without delay. If it's someone else, stay with them, try to keep them awake and breathing, place them on their side if they lose consciousness (the recovery position, to prevent choking), and continue trying to rouse them until help arrives. Do not assume it will resolve on its own — tolerance drops fast after any period of reduced or stopped use, so an amount that was previously manageable can be life-threatening after even a short break. This information is about recognising and responding to an emergency, not guidance on use.`,
  },

  // ---------------------------------------------------------------------
  // Synthetic cannabinoids / NPS — general risk awareness
  // ---------------------------------------------------------------------
  {
    category: 'overdose_safety',
    drug_class: 'synthetic_cannabinoids',
    source: 'Synthetic cannabinoid (NPS) risk-awareness guidance (adapted, general public-health practice)',
    content: `Synthetic cannabinoids and other novel psychoactive substances (sometimes sold under street names) carry a specific danger that traditional cannabis does not: their strength and chemical makeup varies unpredictably from batch to batch, so two doses that look identical can have very different effects, including a much higher risk of severe reaction. Warning signs of a serious reaction include a racing or irregular heartbeat, severe agitation or confusion, very high body temperature, chest pain, seizures, or loss of consciousness. Any of these should be treated as a medical emergency: call Emergency on 999 or SAMU on 114 immediately and try to note what was taken if it's safe to do so, since this information genuinely helps emergency responders. Because the unpredictability is the core risk — not just the substance itself — a pattern of "it was fine before" does not reliably predict what happens the next time.`,
  },

  // ---------------------------------------------------------------------
  // Sleep hygiene — general
  // ---------------------------------------------------------------------
  {
    category: 'sleep_hygiene',
    drug_class: null,
    source: 'Standard sleep-hygiene guidance (adapted, general clinical practice)',
    content: `Poor sleep and craving intensity are closely linked — a short night noticeably lowers the ability to tolerate an urge the next day. A few consistent habits tend to help the most: going to bed and waking up at roughly the same time every day, including weekends, since an irregular schedule confuses the body's own sleep signal more than short sleep alone does. Reducing screen use and bright light in the hour before bed, keeping the bedroom cool and dark, and avoiding caffeine in the second half of the day all support the body's natural wind-down. If sleep doesn't come within about 20 minutes, it's usually better to get up and do something calm in dim light rather than lie awake getting frustrated, then return to bed when sleepy — lying awake trying to force sleep tends to make the room itself feel stressful over time. A single bad night isn't something to fix in the moment; a consistent routine over a week or two is what actually shifts sleep quality.`,
  },
  {
    category: 'sleep_hygiene',
    drug_class: null,
    source: 'Wind-down routine guidance (adapted, general clinical practice)',
    content: `A short wind-down routine in the 30 to 45 minutes before bed signals to the body that sleep is coming, the same way a routine helps a child settle. This doesn't need to be elaborate — dimming the lights, a warm drink without caffeine, light stretching, or a few minutes of slow breathing are all enough. What matters more than the specific activity is doing the same sequence most nights, so it becomes an automatic cue rather than something that requires willpower each time. This is particularly useful in early recovery, where evenings are often the highest-risk period for cravings: a wind-down routine fills that window with something structured instead of leaving it open and unplanned.`,
  },

  // ---------------------------------------------------------------------
  // Relapse prevention — general
  // ---------------------------------------------------------------------
  {
    category: 'relapse_prevention',
    drug_class: null,
    source: 'Relapse-prevention early-warning-signs model (Marlatt & Gordon, adapted)',
    content: `Relapse is rarely a single sudden event — it usually follows a gradual build-up of smaller warning signs that are easier to catch early than to reverse later. Common early signs include: skipping check-ins or other routine recovery activities, withdrawing from supportive people, romanticising past use ("remembering the good parts only"), increasing contact with people or places associated with past use, and a build-up of stress or poor sleep without a plan to address it. None of these means relapse is inevitable — they're signals that it's a good time to increase support, not evidence that something has already failed. Reviewing this kind of list periodically, even when things feel stable, helps catch the pattern while it's still small. A single missed check-in or a hard day is not itself a warning sign; a repeated or accelerating pattern across several of these areas is what's worth acting on.`,
  },
  {
    category: 'relapse_prevention',
    drug_class: null,
    source: 'Lapse-versus-relapse reframing (Marlatt & Gordon abstinence-violation model, adapted)',
    content: `A single use after a period of not using (a lapse) is not the same thing as a full return to old patterns (a relapse), and treating the two identically often makes things worse rather than better. The abstinence-violation effect describes exactly this trap: after a lapse, guilt and shame can produce a thought like "I've already failed, so it doesn't matter now," which turns one difficult moment into a much longer one. The more useful response to a lapse is the same one that applies to any setback: notice it without adding a second layer of self-punishment, identify what led to it as data rather than as proof of failure, and re-engage with support immediately rather than waiting until things feel "back on track." Recovery is very rarely a straight line, and treating a lapse as information rather than as a verdict tends to shorten its impact substantially.`,
  },
  {
    category: 'relapse_prevention',
    drug_class: null,
    source: 'Support-network guidance (adapted, general clinical practice)',
    content: `Recovery is measurably easier with active support than without it, and building that support is a deliberate task, not something that happens automatically. A useful starting point is to identify three kinds of contacts: someone to talk to about how you're actually feeling, someone to do something with (grounding, distracting company), and a professional or service to escalate to if things get serious. Not every supportive person needs to fill every role. If your current circle mostly includes people connected to past use, it's worth naming that honestly rather than assuming it will sort itself out, and looking for at least one new low-pressure connection — a support group, a class, or an old friendship outside the previous routine. Isolation is one of the more consistent warning signs across recovery research, so treating regular contact with supportive people as part of the plan, not an optional extra, matters.`,
  },
  {
    category: 'general_support',
    drug_class: null,
    source: 'General motivational/self-compassion guidance (adapted, general clinical practice)',
    content: `Recovery involves setbacks for almost everyone who goes through it, and how a setback is treated in the moment matters more than whether it happens at all. Harsh self-criticism after a difficult day tends to increase the very feelings — shame, hopelessness, isolation — that make a further difficult day more likely, while a more balanced response ("today was hard, tomorrow is a new day, what do I need right now") tends to shorten the difficulty rather than prolong it. This isn't about lowering the bar or making excuses; it's about noticing that self-compassion and accountability are not opposites, and that people who treat themselves with some patience during setbacks generally sustain recovery longer than those who treat every difficult moment as evidence of failure.`,
  },

  // ---------------------------------------------------------------------
  // Isolation / social connection — general
  // ---------------------------------------------------------------------
  {
    category: 'general_support',
    drug_class: null,
    source: 'Social-isolation guidance (adapted, general clinical practice)',
    content: `Isolation and craving intensity tend to feed each other: being alone gives an urge more room to grow, and a strong urge often makes reaching out feel harder rather than easier, which deepens the isolation. Breaking this loop usually doesn't require a big gesture — a short message to one person, sitting in a shared space even without talking much, or a brief phone call can be enough to interrupt it. If reaching out feels difficult in the moment, it can help to prepare a very short, low-effort message in advance ("having a hard time, could use a distraction") so there's no need to compose one from scratch while already struggling. Consistently choosing some contact over none, even briefly, is more protective over time than waiting for a moment that feels like "enough" of a crisis to justify reaching out.`,
  },

  // ---------------------------------------------------------------------
  // Crisis resources — Mauritius (verified contacts only)
  // ---------------------------------------------------------------------
  {
    category: 'crisis_resources',
    drug_class: null,
    source: 'RecovAI verified emergency contacts (matches components/modals/CrisisResourcesModal.tsx)',
    content: `If you are in immediate danger, having thoughts of harming yourself, or seeing signs of an overdose in yourself or someone else, please contact emergency services in Mauritius right away rather than waiting: call Emergency on 999 for any medical emergency, or SAMU on 114 for ambulance and emergency medical service. For confidential support and guidance specifically around addiction and recovery, the Addiction Helpline is available on 5 255 9050. These contacts are available for exactly this purpose — reaching out is the right response to a crisis, not a last resort, and using them is not an overreaction even if the situation later turns out to be less serious than it felt in the moment.`,
  },
  {
    category: 'crisis_resources',
    drug_class: null,
    source: 'Collectif Urgence Toxida (cut.mu, verified directly from their own site) and Befrienders Mauritius (befriendersmauritius.com, verified directly from their own site)',
    content: `Beyond emergency services, two Mauritian organisations offer free, confidential ongoing support. Collectif Urgence Toxida (CUT), based in Quatre Bornes, provides harm-reduction services for people who use drugs — including needle and syringe exchange, HIV/Hepatitis C/Syphilis testing, and help connecting to substitution or detox programmes — and can be reached on +230 4279044. Befrienders Mauritius offers free, confidential emotional support by phone for anyone in distress, including suicidal thoughts, regardless of the reason, and can be reached on their hotline +230 8009393. Neither service requires a referral, and both are free of charge. These are appropriate to mention alongside the emergency numbers when someone needs ongoing support rather than (or in addition to) an immediate emergency response.`,
  },

  // ---------------------------------------------------------------------
  // Added 2026-07-20, Phase 4.5 follow-up: the DeepEval harness found
  // class_specific_coping retrieval recall stuck at 0.300 even after a
  // ranking boost, because several classes had only ONE relevant chunk to
  // retrieve from — recall can't exceed what exists. One additional chunk
  // per affected class, each covering a genuinely different angle from
  // what already existed (not a duplicate of the existing chunk).
  // ---------------------------------------------------------------------
  {
    category: 'craving_management',
    drug_class: 'synthetic_cannabinoids',
    source: 'Synthetic Cannabinoids (K2/Spice) DrugFacts. National Institute on Drug Abuse (NIDA), nida.nih.gov/publications/drugfacts/synthetic-cannabinoids-k2spice (accessed 2026-07-20). NIDA confirms these products "can be addictive" but that "behavioral therapies and medications have not specifically been tested for treatment of addiction to these products" — general craving techniques are the available option, not a class-specific validated protocol.',
    content: `Cravings for synthetic cannabinoids often carry an extra layer worth naming directly: the pull is sometimes toward trying to recreate a specific past high, which can feel more urgent than a general craving because it's tied to a particular memory rather than just wanting to feel different. It helps to notice this pattern explicitly — "I'm chasing a specific experience, not just craving in general" — since naming it tends to loosen its grip a little. The same core techniques apply as with any craving: delay acting for a fixed short period, distract with something engaging, and let the peak pass before deciding anything. Because these products vary so unpredictably in strength and effect from batch to batch, it can also help to remind yourself that even the memory being chased isn't a reliable guide — the same product, even from a similar source, is not the same experience twice. Keeping a note of what situations tend to bring on this specific kind of craving (boredom, a particular social group, a certain time of day) makes it easier to plan around them in advance rather than deciding in the moment.`,
  },
  {
    category: 'general_support',
    drug_class: 'heroin_opioids',
    source: 'Medications for Opioid Use Disorder. National Institute on Drug Abuse (NIDA), nida.nih.gov/research-topics/medications-opioid-use-disorder (accessed 2026-07-20).',
    content: `For opioid dependence specifically, medication-assisted treatment (such as methadone or buprenorphine, prescribed and monitored by a doctor) is a well-established, evidence-based option that many people find meaningfully reduces cravings and lowers relapse and overdose risk compared to attempting recovery through willpower alone. This isn't a suggestion to start or change any medication without medical supervision, and it isn't guidance on dosing — it's simply worth knowing that this option exists and is a legitimate, mainstream part of opioid recovery, not a last resort or a sign of failure to "do it properly" unmedicated. If this hasn't come up in conversation with a doctor yet, it's a reasonable thing to raise directly, especially if cravings or relapse risk feel difficult to manage day to day. Choosing this path, or not, is a personal and medical decision either way — the point is simply making sure it's a genuinely informed choice.`,
  },
  {
    category: 'relapse_prevention',
    drug_class: 'stimulants',
    source: 'Treatment (behavioral therapies for stimulant use disorder — no FDA-approved medication exists). National Institute on Drug Abuse (NIDA), nida.nih.gov/research-topics/treatment (accessed 2026-07-20).',
    content: `Stimulant relapse often follows a recognisable pattern worth watching for specifically: a stretch of low mood or low energy (sometimes left over from a crash) starts to feel unbearable, and the craving becomes less about wanting the substance itself and more about wanting motivation, focus, or energy back immediately. This "chasing the high" pattern can also show up as boredom becoming genuinely distressing in a way it didn't used to, since stimulants often raised the baseline of what felt engaging. Noticing this specific shape of the pattern — low energy building into an urgent need to feel switched-on again — makes it easier to catch early. Unlike opioid dependence, there's currently no approved medication specifically for stimulant cravings, so structured behavioural approaches carry more of the weight here: rebuilding a basic daily structure (consistent wake time, regular meals, some physical activity) tends to help more than it might for other substances, since it directly addresses the energy and motivation gap that's often driving the craving, rather than only addressing the urge itself.`,
  },
  {
    category: 'craving_management',
    drug_class: 'sedatives_benzo',
    source: 'Zgierska, A.E., Boyle, M.P., Conigliaro, J., 2025. Joint Clinical Practice Guideline on Benzodiazepine Tapering: Considerations When Risks Outweigh Benefits. Journal of General Internal Medicine (Springer). Developed jointly with the American Society of Addiction Medicine (ASAM); summary at asam.org/quality-care/clinical-guidelines/benzodiazepine-tapering (accessed 2026-07-20). Non-pharmacological coping strategies are endorsed alongside medical tapering, not as a substitute for it.',
    content: `Since sedative or benzodiazepine cravings are frequently rooted in underlying anxiety, having non-medication ways to bring anxiety down in the moment matters alongside any medical tapering plan. Slow, extended exhale breathing (a longer breath out than in) activates the body's own calming response and can noticeably reduce acute anxiety within a few minutes. Grounding techniques — naming five things you can see, four you can hear, three you can touch — can interrupt a spiral of anxious thoughts by shifting attention to the immediate physical environment. Regular, moderate physical activity (even a daily walk) measurably lowers baseline anxiety over time, not just in the moment. None of these replace a medically supervised taper if one is needed, but having them ready reduces how much weight the medication has to carry on its own, which can make the craving itself feel less urgent.`,
  },
  {
    category: 'craving_management',
    drug_class: 'cannabis',
    source: 'Cannabis (Marijuana). National Institute on Drug Abuse (NIDA), nida.nih.gov/research-topics/cannabis-marijuana (accessed 2026-07-20). NIDA identifies cognitive behavioral therapy, motivational enhancement therapy, and contingency management as effective behavioral interventions for cannabis use disorder; cue-reactivity research (e.g. environmental/social triggers such as gatherings) is a documented driver of craving and relapse in this population.',
    content: `Cannabis use is often closely tied to specific social settings — particular friends, gatherings, or a shared routine where using together is simply what's always been done. This makes social situations a distinct kind of trigger from the solo, boredom-driven cravings covered elsewhere: the pull here is often about not wanting to feel different from the group, or not knowing how to be in that setting without using. Deciding in advance how to handle a specific upcoming gathering — whether that's arriving late and leaving early, bringing a supportive friend, or having a ready, low-pressure reason prepared if asked — tends to work better than deciding in the moment. It's also worth being honest with yourself about which relationships are built mainly around using together versus relationships that would hold up without it; that distinction often becomes clearer once cannabis is no longer part of the equation, and it's not something that needs to be resolved all at once.`,
  },
];
