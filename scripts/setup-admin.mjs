import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
const path = ".env.local";
const current = existsSync(path) ? readFileSync(path, "utf8") : "";
if (/^OCULAR_ADMIN_PASSWORD=/m.test(current)) {
  console.log(
    "O acesso já está configurado em .env.local. Nenhuma alteração feita.",
  );
} else {
  writeFileSync(
    path,
    `${current}${current && !current.endsWith("\n") ? "\n" : ""}OCULAR_ADMIN_PASSWORD=${randomBytes(32).toString("hex")}\n`,
    { mode: 0o600 },
  );
  console.log(
    "Senha de acesso criada em .env.local. Consulte esse arquivo localmente e reinicie o servidor. Não compartilhe o arquivo.",
  );
}
