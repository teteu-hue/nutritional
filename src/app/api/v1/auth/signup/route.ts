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
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });

    return jsonOk(
      { userId: user.id, redirectTo: "/onboarding" },
      { status: 201 },
    );
  } catch (error) {
    return jsonError(error);
  }
}
