/**
 * Ambient, passive "reach out for real help" reminders.
 *
 * Deliberately NON-clinical and number-free: listing specific hotlines is the
 * job of rag-chat's crisis pre-filter (which surfaces Emergency 999, SAMU 114,
 * Addiction Helpline 5 255 9050 only when it actually detects a crisis). These
 * are the calm, always-there counterpart — gentle nudges, not crisis triage.
 */
export const SUPPORT_DISCLAIMERS = [
  "RecovAI is here to support your day-to-day, but it isn't a replacement for a professional. If things feel heavy, please reach out to someone you trust.",
  "This app walks alongside your recovery — it doesn't replace the care of a doctor or counsellor. You're always welcome to lean on them too.",
  "RecovAI can help you reflect and stay on track, but some moments call for a real person. Don't hesitate to reach out for professional support when you need it.",
  "You don't have to do this alone. RecovAI is a companion, not a substitute for professional help — reaching out to someone is always a sign of strength.",
  "RecovAI supports you between visits, but it isn't a stand-in for your care team. If you're struggling, talking to a professional can make a real difference.",
] as const;

/** Uniformly-random pick. Call once per screen mount, not per render. */
export function getRandomSupportDisclaimer(): string {
  return SUPPORT_DISCLAIMERS[Math.floor(Math.random() * SUPPORT_DISCLAIMERS.length)];
}

/**
 * Doctor-facing epistemic-honesty line — ONE fixed string, shown wherever an
 * AI-generated summary or XAI explanation is rendered. Fixed, not randomized:
 * this is a factual caveat, so consistency matters more than variety.
 */
export const AI_DISCLAIMER =
  'AI-generated from recorded patterns — not a clinical diagnosis. Use alongside your own judgment.';
