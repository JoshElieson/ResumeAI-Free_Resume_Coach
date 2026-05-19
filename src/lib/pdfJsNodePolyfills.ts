/**
 * pdfjs-dist needs DOMMatrix in Node. Node 20 (Vercel default) does not provide it;
 * Node 22+ does. Polyfill before any pdfjs-dist import on the server.
 */
export function ensurePdfJsNodePolyfills(): void {
  if (typeof window !== "undefined") return;
  if (globalThis.DOMMatrix) return;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const canvas = require("@napi-rs/canvas") as {
      DOMMatrix?: typeof DOMMatrix;
      ImageData?: typeof ImageData;
      Path2D?: typeof Path2D;
    };
    if (canvas.DOMMatrix) {
      globalThis.DOMMatrix = canvas.DOMMatrix as typeof DOMMatrix;
    }
    if (canvas.ImageData) {
      globalThis.ImageData = canvas.ImageData as typeof ImageData;
    }
    if (canvas.Path2D) {
      globalThis.Path2D = canvas.Path2D as typeof Path2D;
    }
  } catch {
    // @napi-rs/canvas may be unavailable in the serverless bundle.
  }

  if (!globalThis.DOMMatrix) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const DOMMatrixPolyfill = require("dommatrix") as
      | (new () => DOMMatrix)
      | { default: new () => DOMMatrix };
    globalThis.DOMMatrix = (
      "default" in DOMMatrixPolyfill
        ? DOMMatrixPolyfill.default
        : DOMMatrixPolyfill
    ) as typeof DOMMatrix;
  }

  if (!globalThis.navigator?.language) {
    globalThis.navigator = {
      language: "en-US",
      platform: "",
      userAgent: "",
    } as Navigator;
  }
}
