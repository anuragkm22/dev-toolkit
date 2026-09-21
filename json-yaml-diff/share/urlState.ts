import type { FormatMode } from "../../shared/diff/detectFormat";

/** The full state that gets encoded into a shareable link. */
export interface SharedState {
  left: string;
  right: string;
  leftMode: FormatMode;
  rightMode: FormatMode;
}

// Everything lives in the URL *hash* fragment (the part after "#"), not
// a query string. Hash fragments are never sent in the HTTP request or
// logged by servers/proxies — the browser keeps them client-side only,
// which matters since users may paste real config values (potentially
// including secrets) into this tool.

const GZIP_PREFIX = "z:";
const RAW_PREFIX = "r:";

/**
 * Safe maximum URL length for sharing. Modern browsers technically
 * tolerate much longer URLs (Chrome ~32KB, Firefox ~64KB+), but the
 * universally-safe cross-browser, cross-app limit — accounting for
 * things a link actually gets pasted into, like Slack, email, SMS, and
 * older proxies/tools — is 2,048 characters. We check against that
 * rather than pushing to a browser-specific technical ceiling, since
 * the whole point of a "shareable" link is that it survives being
 * copy-pasted somewhere else.
 */
export const MAX_SAFE_URL_LENGTH = 2048;

export class ShareLinkTooLargeError extends Error {
  constructor(public readonly actualLength: number, public readonly limit: number) {
    super(`Encoded link is ${actualLength} characters, which exceeds the safe limit of ${limit}.`);
    this.name = "ShareLinkTooLargeError";
  }
}

/** Encodes state into a value suitable for the URL hash. */
export async function encodeState(state: SharedState): Promise<string> {
  const json = JSON.stringify(state);

  if (supportsCompressionStreams()) {
    const compressed = await gzipCompress(json);
    return GZIP_PREFIX + bytesToBase64Url(compressed);
  }

  // Fallback for browsers without CompressionStream: still shareable,
  // just a longer URL.
  return RAW_PREFIX + bytesToBase64Url(new TextEncoder().encode(json));
}

/** Decodes a hash-fragment value back into state. Returns null if invalid. */
export async function decodeState(encoded: string): Promise<SharedState | null> {
  try {
    if (encoded.startsWith(GZIP_PREFIX)) {
      const bytes = base64UrlToBytes(encoded.slice(GZIP_PREFIX.length));
      const json = await gzipDecompress(bytes);
      return JSON.parse(json) as SharedState;
    }

    if (encoded.startsWith(RAW_PREFIX)) {
      const bytes = base64UrlToBytes(encoded.slice(RAW_PREFIX.length));
      const json = new TextDecoder().decode(bytes);
      return JSON.parse(json) as SharedState;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Builds a full shareable URL for the current page with the given state
 * encoded. Throws ShareLinkTooLargeError if the result would exceed the
 * safe sharing length, rather than silently handing back a link that's
 * likely to get truncated or mangled wherever it's pasted.
 */
export async function buildShareUrl(state: SharedState): Promise<string> {
  const encoded = await encodeState(state);
  const url = new URL(window.location.href);
  url.hash = encoded;
  const result = url.toString();

  if (result.length > MAX_SAFE_URL_LENGTH) {
    throw new ShareLinkTooLargeError(result.length, MAX_SAFE_URL_LENGTH);
  }

  return result;
}

/** Reads state from the current page's URL hash, if present. */
export function readStateFromLocation(): Promise<SharedState | null> {
  const hash = window.location.hash.slice(1); // drop leading "#"
  if (!hash) return Promise.resolve(null);
  return decodeState(hash);
}

function supportsCompressionStreams(): boolean {
  return typeof CompressionStream !== "undefined" && typeof DecompressionStream !== "undefined";
}

async function gzipCompress(text: string): Promise<Uint8Array> {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream("gzip"));
  const buffer = await new Response(stream).arrayBuffer();
  return new Uint8Array(buffer);
}

async function gzipDecompress(bytes: Uint8Array): Promise<string> {
  const buffer = bytes.slice().buffer as ArrayBuffer;
  const stream = new Blob([buffer]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Response(stream).text();
}

/** Converts bytes to a URL-safe base64 string (no padding, - and _ instead of + and /). */
function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(value: string): Uint8Array {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
