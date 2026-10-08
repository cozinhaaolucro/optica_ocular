import { z } from "zod";
import { adminAuthorized, checkPassword, login, logout } from "@/lib/auth";
import {
  apiError,
  limited,
  privateJson,
  readJson,
  sameOrigin,
} from "@/lib/http";
export async function GET() {
  try {
    return privateJson({
      authenticated: await adminAuthorized(),
      configured: (process.env.OCULAR_ADMIN_PASSWORD?.length || 0) >= 24,
    });
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    await limited(request, "admin-login", 6);
    const { password } = z
      .object({ password: z.string().max(500) })
      .parse(await readJson(request));
    if (!checkPassword(password))
      return privateJson(
        { error: "Senha inválida ou acesso ainda não configurado." },
        401,
      );
    await login();
    return privateJson({ authenticated: true });
  } catch (e) {
    return apiError(e);
  }
}
export async function DELETE(request: Request) {
  try {
    sameOrigin(request);
    await logout();
    return privateJson({ authenticated: false });
  } catch (e) {
    return apiError(e);
  }
}
