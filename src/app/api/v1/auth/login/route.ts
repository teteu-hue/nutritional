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
    return jsonError(new ApiError(401, "Credenciais inválidas"));
  }
}
