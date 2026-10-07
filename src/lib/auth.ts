import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { db, audit } from "./db";
const digest = (value: string) => createHash("sha256").update(value).digest();
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
  const row = db()
    .prepare("SELECT expires FROM sessions WHERE token=?")
    .get(digest(token).toString("hex")) as { expires: number } | undefined;
  return !!row && row.expires > Date.now();
}
export async function requireAdmin() {
  if (!(await adminAuthorized()))
    throw new Error("Acesso administrativo necessário.");
}
export async function login() {
  const token = randomBytes(32).toString("hex");
  db().prepare("DELETE FROM sessions WHERE expires<?").run(Date.now());
  db()
    .prepare("INSERT INTO sessions VALUES (?,?)")
    .run(digest(token).toString("hex"), Date.now() + 8 * 60 * 60 * 1000);
  (await cookies()).set("ocular-admin", token, {
    httpOnly: true,
    secure: process.env.OCULAR_SITE_URL?.startsWith("https://"),
    sameSite: "strict",
    maxAge: 8 * 60 * 60,
    path: "/",
  });
  audit("admin_login", {});
}
export async function logout() {
  const c = await cookies();
  const token = c.get("ocular-admin")?.value;
  if (token)
    db()
      .prepare("DELETE FROM sessions WHERE token=?")
      .run(digest(token).toString("hex"));
  c.delete("ocular-admin");
}
export const hashToken = (token: string) => digest(token).toString("hex");
