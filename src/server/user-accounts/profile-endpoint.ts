import { jsonError, jsonOk, ApiError } from "@/server/core/errors";
import { requireUser } from "@/server/core/auth";
import { profileSchema } from "@/server/user-accounts/schemas";
import { serializeProfile, upsertProfile } from "@/server/user-accounts/service";

export async function updateProfile(request: Request) {
  try {
    const user = await requireUser(request, { allowIncompleteOnboarding: true });
    const body = await request.json();
    const parsed = profileSchema.safeParse(body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new ApiError(400, issue?.message ?? "Perfil inválido", "validation_error", {
        field: issue?.path.join("."),
      });
    }

    const profile = await upsertProfile(user.id, parsed.data);
    return jsonOk({ profile: serializeProfile(profile), complete: true });
  } catch (error) {
    return jsonError(error);
  }
}
