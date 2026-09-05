import { signIn } from "@/auth";
import { jsonError, jsonOk, ApiError } from "@/server/core/errors";
import { loginSchema } from "@/server/user-accounts/schemas";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(401, "Credenciais inválidas");
    }

    const result = await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });

    if (!result || (typeof result === "object" && "error" in result && result.error)) {
      throw new ApiError(401, "Credenciais inválidas");
    }

    return jsonOk({ ok: true });
  } catch (error) {
    if (error instanceof ApiError) return jsonError(error);
    // Loga o erro real (visível nos logs do Vercel) mas responde 401 para não
    // vazar informação sobre existência de conta.
    if (error instanceof Error) {
      console.error(`[login] falha ao autenticar: ${error.name}: ${error.message}`);
    } else {
      console.error("[login] erro inesperado:", error);
    }
    return jsonError(new ApiError(401, "Credenciais inválidas"));
  }
}
