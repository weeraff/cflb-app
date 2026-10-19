// The exact wording shown next to the opt-in box. Bump CONSENT_VERSION
// whenever CONSENT_TEXT changes, so every stored consent can be traced
// back to the words that person actually agreed to.
export const CONSENT_VERSION = '2026-10-19-v1'
export const CONSENT_TEXT = 'Yes, send me round reminders, results and offers from CFLB and our partners.'

export function consentFields(optIn, now = new Date()) {
  return {
    marketing_opt_in: Boolean(optIn),
    consent_at: now.toISOString(),
    consent_version: CONSENT_VERSION,
  }
}
