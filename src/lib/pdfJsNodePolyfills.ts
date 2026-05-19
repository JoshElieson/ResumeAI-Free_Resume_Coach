/**
 * pdfjs-dist expects DOMMatrix/ImageData/Path2D in Node. On Vercel the built-in
 * polyfill can fail if @napi-rs/canvas is not resolved before pdf.mjs loads.
 */
export function ensurePdfJsNodePolyfills(): void {
  if (typeof window !== "undefined") return;

  if (!globalThis.DOMMatrix) {
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
  }

  if (!globalThis.navigator?.language) {
    globalThis.navigator = {
      language: "en-US",
      platform: "",
      userAgent: "",
    } as Navigator;
  }
}
