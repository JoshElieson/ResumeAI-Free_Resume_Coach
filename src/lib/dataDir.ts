import os from "os";
import path from "path";

let dataRoot: string | null = null;

/**
 * Writable app data directory. Local dev uses `.data/` in the project root.
 * Vercel/serverless uses `/tmp` because the deployment filesystem is read-only.
 */
export function getDataRoot(): string {
  if (dataRoot) return dataRoot;

  if (process.env.DATA_DIR) {
    dataRoot = process.env.DATA_DIR;
    return dataRoot;
  }

  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    dataRoot = path.join(os.tmpdir(), "resume-feedback-data");
    return dataRoot;
  }

  dataRoot = path.join(process.cwd(), ".data");
  return dataRoot;
}
