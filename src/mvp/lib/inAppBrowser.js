// Google refuses OAuth inside Instagram/Facebook's built-in browsers
// ("disallowed_useragent"), and that's where most CFLB traffic lands, so
// the sign-up sheet leads with email there instead of a broken button.
export function isInAppBrowser(userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent) {
  return /Instagram|FBAN|FBAV|FB_IAB/i.test(userAgent)
}
