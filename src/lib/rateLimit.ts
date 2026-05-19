import { promises as fs } from "fs";
import path from "path";
import type { NextRequest } from "next/server";

const STORE_PATH = path.join(process.cwd(), ".data", "rate-limits.json");

type Store = Record<string, number>;

let memoryStore: Store = {};

export function getRateLimitPerDay(): number {
  const parsed = parseInt(process.env.RATE_LIMIT_PER_DAY ?? "50", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 50;
}

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function nextUtcMidnight(): Date {
  const reset = new Date();
  reset.setUTCHours(24, 0, 0, 0);
  return reset;
}

function storeKey(ip: string, userId?: string | null): string {
  const day = getTodayKey();
  if (userId) return `user:${userId}|${day}`;
  return `anon:${ip}|${day}`;
}

async function readStore(): Promise<Store> {
  try {
    const raw = await fs.readFile(STORE_PATH, "utf-8");
    return JSON.parse(raw) as Store;
  } catch {
    return { ...memoryStore };
  }
}

async function writeStore(store: Store): Promise<void> {
  const today = getTodayKey();
  const pruned: Store = {};
  for (const [key, count] of Object.entries(store)) {
    if (key.endsWith(`|${today}`)) pruned[key] = count;
  }

  try {
    await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
    await fs.writeFile(STORE_PATH, JSON.stringify(pruned));
    memoryStore = pruned;
  } catch {
    memoryStore = pruned;
  }
}

export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;

  return "unknown";
}

export type RateLimitContext = {
  ip: string;
  userId?: string | null;
};

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: string;
  requiresAuth: boolean;
  authenticated: boolean;
  /** True after an anonymous user completes at least one analysis (for sign-in upsell). */
  promptSignIn: boolean;
};

export async function consumeRateLimit(
  ctx: RateLimitContext,
): Promise<RateLimitResult> {
  const authenticated = Boolean(ctx.userId);
  const resetAt = nextUtcMidnight().toISOString();

  if (!authenticated) {
    const key = storeKey(ctx.ip, null);
    const store = await readStore();
    const count = store[key] ?? 0;
    store[key] = count + 1;
    await writeStore(store);

    return {
      allowed: true,
      limit: 0,
      remaining: 0,
      resetAt,
      requiresAuth: false,
      authenticated: false,
      promptSignIn: store[key] >= 1,
    };
  }

  const limit = getRateLimitPerDay();
  const key = storeKey(ctx.ip, ctx.userId);
  const store = await readStore();
  const count = store[key] ?? 0;

  if (count >= limit) {
    return {
      allowed: false,
      limit,
      remaining: 0,
      resetAt,
      requiresAuth: false,
      authenticated: true,
      promptSignIn: false,
    };
  }

  store[key] = count + 1;
  await writeStore(store);

  return {
    allowed: true,
    limit,
    remaining: limit - store[key],
    resetAt,
    requiresAuth: false,
    authenticated: true,
    promptSignIn: false,
  };
}

export function rateLimitHeaders(result: RateLimitResult): HeadersInit {
  if (!result.authenticated) {
    return {};
  }

  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": result.resetAt,
  };
}

export function formatResetTime(iso: string): string {
  return `${new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  })} UTC`;
}
