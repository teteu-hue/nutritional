import { requireUser } from "@/server/core/auth";
import { jsonError, jsonOk } from "@/server/core/errors";
import { updateProfile } from "@/server/user-accounts/profile-endpoint";
import { getProfile, serializeProfile } from "@/server/user-accounts/service";

export async function GET(request: Request) {
  try {
    const user = await requireUser(request, { allowIncompleteOnboarding: true });
    const profile = await getProfile(user.id);
    if (!profile) {
      return jsonOk({ complete: false, profile: null });
    }
    return jsonOk({ complete: Boolean(user.onboardingCompletedAt), profile: serializeProfile(profile) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(request: Request) {
  return updateProfile(request);
}
