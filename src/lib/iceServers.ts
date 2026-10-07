/**
 * Central ICE server configuration for LoveStream's peer-to-peer video calls.
 *
 * Why this file exists (see GitHub issue #3):
 *
 * - STUN servers only let a peer *discover* its public address. That is enough
 *   when both peers sit behind "friendly" NATs (same network, typical home
 *   routers), which is why same-network calls always worked.
 *
 * - Cross-network calls (mobile hotspot <-> home WiFi, CGNAT or symmetric-NAT
 *   ISPs) frequently cannot form a direct path at all. Those calls REQUIRE a
 *   TURN relay to carry the media; without one, ICE stays in the "checking"
 *   state forever and the call UI hangs on "CONNECTING..." with no video.
 *
 * TURN is configured through environment variables (see .env.example):
 *
 *   VITE_TURN_URLS       comma-separated turn:/turns: URLs
 *   VITE_TURN_USERNAME   TURN username
 *   VITE_TURN_CREDENTIAL TURN credential / password
 *
 * When TURN is not configured we gracefully fall back to STUN-only, which
 * still works for most direct connections; the call UI surfaces a clear
 * failure + retry instead of hanging (see VideoCall.tsx).
 */

/** Default STUN servers — address discovery for direct connections. */
const STUN_SERVERS: RTCIceServer[] = [
  {
    // Google STUN — reliable and geo-distributed
    urls: [
      "stun:stun.l.google.com:19302",
      "stun:stun1.l.google.com:19302",
      "stun:stun2.l.google.com:19302",
      "stun:stun3.l.google.com:19302",
      "stun:stun4.l.google.com:19302",
    ],
  },
  {
    // Additional reliable public STUN
    urls: "stun:global.stun.twilio.com:3478",
  },
];

/**
 * TURN relay servers, read from environment variables.
 * Returns an empty list when TURN is not configured (STUN-only fallback).
 */
function buildTurnServers(): RTCIceServer[] {
  const rawUrls = import.meta.env.VITE_TURN_URLS;
  if (!rawUrls || typeof rawUrls !== "string" || !rawUrls.trim()) {
    return [];
  }

  const urls = rawUrls
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean);

  if (urls.length === 0) return [];

  const username = import.meta.env.VITE_TURN_USERNAME ?? "";
  const credential = import.meta.env.VITE_TURN_CREDENTIAL ?? "";

  if (!username || !credential) {
    console.warn(
      "[WebRTC] VITE_TURN_URLS is set but VITE_TURN_USERNAME / VITE_TURN_CREDENTIAL are missing — TURN authentication will likely fail."
    );
  }

  console.log(`[WebRTC] Using ${urls.length} TURN relay URL(s) for cross-network calls.`);
  return [{ urls, username, credential }];
}

/** Full ICE server list: STUN first (cheap), TURN relay as fallback. */
export const ICE_SERVERS: RTCIceServer[] = [...STUN_SERVERS, ...buildTurnServers()];

/** RTCPeerConnection configuration shared by every peer connection. */
export const RTC_CONFIGURATION: RTCConfiguration = {
  iceServers: ICE_SERVERS,
  iceCandidatePoolSize: 10,
  bundlePolicy: "max-bundle",
};
