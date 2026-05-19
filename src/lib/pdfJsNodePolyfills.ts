/**
 * pdfjs-dist needs DOMMatrix in Node. Node 20 (Vercel default) does not provide it;
 * Node 22+ does. Polyfill before any pdfjs-dist import on the server.
 */
import { DOMMatrix as NapiDOMMatrix } from "@napi-rs/canvas";

export function ensurePdfJsNodePolyfills(): void {
  if (typeof window !== "undefined") return;

  if (!globalThis.DOMMatrix) {
    globalThis.DOMMatrix = NapiDOMMatrix as typeof DOMMatrix;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const canvas = require("@napi-rs/canvas") as {
      ImageData?: typeof ImageData;
      Path2D?: typeof Path2D;
    };
    if (!globalThis.ImageData && canvas.ImageData) {
      globalThis.ImageData = canvas.ImageData as typeof ImageData;
    }
    if (!globalThis.Path2D && canvas.Path2D) {
      globalThis.Path2D = canvas.Path2D as typeof Path2D;
    }
  } catch {
    // Optional canvas helpers for pdfjs rendering.
  }

  if (!globalThis.navigator?.language) {
    globalThis.navigator = {
      language: "en-US",
      platform: "",
      userAgent: "",
    } as Navigator;
  }
}
