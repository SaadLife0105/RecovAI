/** Google Cloud Translation API v2 (REST, single call). Omit `source` to let
 * Google auto-detect and return `detectedSourceLanguage` alongside the
 * translation; pass source='en' when the input language is already known.
 *
 * Lifted out of rag-chat/index.ts in Phase 5 so risk-agent's
 * send_patient_message translates through the exact same implementation
 * rather than a second copy that can drift.
 */
export async function googleTranslate(
  text: string,
  target: string,
  source?: string
): Promise<{ translatedText: string; detectedSourceLanguage?: string }> {
  const apiKey = Deno.env.get('GOOGLE_TRANSLATE_API_KEY');
  if (!apiKey) throw new Error('GOOGLE_TRANSLATE_API_KEY is not configured');

  const res = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${apiKey}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ q: text, target, format: 'text', ...(source ? { source } : {}) }),
  });

  if (!res.ok) {
    throw new Error(`Google Translate API error (${res.status}): ${await res.text()}`);
  }

  const translation = (await res.json())?.data?.translations?.[0];
  if (!translation?.translatedText) {
    throw new Error('Google Translate returned no translation');
  }

  // Defensive: format:'text' should prevent HTML in the response, but a
  // stray tag (e.g. "<strong>") was observed leaking through on-device
  // 2026-07-20 despite that setting. Strip anything tag-shaped before it can
  // reach a plain-text chat bubble as literal markup.
  const cleanedText = translation.translatedText.replace(/<\/?[a-z][^>]*>/gi, '');

  return { translatedText: cleanedText, detectedSourceLanguage: translation.detectedSourceLanguage };
}
