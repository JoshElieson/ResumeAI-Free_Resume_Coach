import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { hashPassword, verifyPassword } from "@/lib/password";

const USERS_PATH = path.join(process.cwd(), ".data", "users.json");

export type StoredUser = {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
};

type UserStore = {
  usersById: Record<string, StoredUser>;
  emailToId: Record<string, string>;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function readStore(): Promise<UserStore> {
  try {
    const raw = await fs.readFile(USERS_PATH, "utf-8");
    return JSON.parse(raw) as UserStore;
  } catch {
    return { usersById: {}, emailToId: {} };
  }
}

async function writeStore(store: UserStore): Promise<void> {
  await fs.mkdir(path.dirname(USERS_PATH), { recursive: true });
  await fs.writeFile(USERS_PATH, JSON.stringify(store), "utf-8");
}

export async function createUser(input: {
  email: string;
  password: string;
}): Promise<StoredUser> {
  const email = normalizeEmail(input.email);
  const store = await readStore();

  if (store.emailToId[email]) {
    throw new Error("An account with this email already exists.");
  }

  const user: StoredUser = {
    id: randomUUID(),
    email,
    passwordHash: await hashPassword(input.password),
    createdAt: new Date().toISOString(),
  };

  store.usersById[user.id] = user;
  store.emailToId[email] = user.id;
  await writeStore(store);

  return user;
}

export async function verifyCredentials(
  email: string,
  password: string,
): Promise<StoredUser | null> {
  const normalized = normalizeEmail(email);
  const store = await readStore();
  const userId = store.emailToId[normalized];
  if (!userId) return null;

  const user = store.usersById[userId];
  if (!user) return null;

  const valid = await verifyPassword(password, user.passwordHash);
  return valid ? user : null;
}
