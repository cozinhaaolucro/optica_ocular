import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { query, execute, audit } from "./persistence";
import { secureCookie } from "./http";
const digest = (value: string) => createHash("sha256").update(value).digest();
export class AdminAccessError extends Error {
  status = 401;
  constructor() {
    super("Sua sessão terminou. Entre novamente no painel.");
  }
}
export function checkPassword(value: string) {
  const secret = process.env.OCULAR_ADMIN_PASSWORD;
  return (
    !!secret &&
    secret.length >= 24 &&
    timingSafeEqual(digest(value), digest(secret))
  );
}
export async function adminAuthorized() {
  const token = (await cookies()).get("ocular-admin")?.value;
  if (!token) return false;
  const [row] = await query<{ expires: number }>(
    "SELECT expires FROM sessions WHERE token=?",
    [digest(token).toString("hex")],
  );
  return !!row && Number(row.expires) > Date.now();
}
export async function requireAdmin() {
  if (!(await adminAuthorized())) throw new AdminAccessError();
}
export async function login(request: Request) {
  const token = randomBytes(32).toString("hex");
  await execute("DELETE FROM sessions WHERE expires<?", [Date.now()]);
  await execute("INSERT INTO sessions(token,expires) VALUES (?,?)", [
    digest(token).toString("hex"),
    Date.now() + 8 * 60 * 60 * 1000,
  ]);
  (await cookies()).set("ocular-admin", token, {
    httpOnly: true,
    secure: secureCookie(request),
    sameSite: "strict",
    maxAge: 8 * 60 * 60,
    path: "/",
  });
  await audit("admin_login", {});
}
export async function logout() {
  const c = await cookies();
  const token = c.get("ocular-admin")?.value;
  if (token)
    await execute("DELETE FROM sessions WHERE token=?", [
      digest(token).toString("hex"),
    ]);
  c.delete("ocular-admin");
}
export const hashToken = (token: string) => digest(token).toString("hex");
