// ============================================================================
// LudoZ — Network config for online multiplayer (WebRTC / Vercel mode)
//
// Phones on mobile data (4G/5G) sit behind carrier-grade NAT, where a direct
// peer-to-peer link usually cannot be opened. A TURN server relays the traffic
// in that case. STUN alone (the default below) only works on most Wi-Fi.
//
// Option A — Metered "Open Relay" (free tier, 20 GB/month):
//   1. Create a free account at https://www.metered.ca/tools/openrelay/
//   2. Copy your app name (the part before .metered.live) and API key below.
//
// Option B — any other TURN provider: put static entries in `turn`, e.g.
//   { urls: 'turn:turn.example.com:443?transport=tcp', username: 'u', credential: 'p' }
//
// Note: this file ships to the browser, so only use credentials meant for
// client-side use (Metered's TURN API keys are designed for that).
// ============================================================================

export const NET_CONFIG = {
  meteredApp: '', // e.g. 'ludoz' for ludoz.metered.live
  meteredApiKey: '',
  turn: [],
};
