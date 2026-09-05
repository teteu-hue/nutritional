import { signIn } from "@/auth";
import { jsonError, jsonOk } from "@/server/core/errors";
import { signupSchema } from "@/server/user-accounts/schemas";
import { createUser } from "@/server/user-accounts/service";
import { ApiError } from "@/server/core/errors";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = signupSchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Dados inválidos";
      throw new ApiError(400, msg);
    }

    const user = await createUser(parsed.data.email, parsed.data.password);

    // Best-effort auto-login. Se signIn falhar (ex.: instabilidade momentânea
    // do provider ou do banco no callback), NÃO derrubamos o cadastro — o
    // usuário já existe e pode fazer login manualmente. Isso evita 500 no
    // fluxo de cadastro quando a criação de sessão falha por motivos externos.
    let signedIn = true;
    try {
      await signIn("credentials", {
        email: parsed.data.email,
        password: parsed.data.password,
        redirect: false,
      });
    } catch (signInError) {
      signedIn = false;
      console.error(
        "[signup] falha ao autenticar automaticamente após criar usuário:",
        signInError instanceof Error
          ? `${signInError.name}: ${signInError.message}`
          : signInError,
      );
    }

    return jsonOk(
      {
        userId: user.id,
        redirectTo: signedIn ? "/onboarding" : "/login",
        autoSignedIn: signedIn,
      },
      { status: 201 },
    );
  } catch (error) {
    return jsonError(error);
  }
}
