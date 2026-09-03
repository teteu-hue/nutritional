import { signOut, invalidateUserSessions } from "@/auth";
import { requireUser } from "@/server/core/auth";
import { jsonError, jsonOk } from "@/server/core/errors";

export async function POST(request: Request) {
  try {
    const user = await requireUser(request, { allowIncompleteOnboarding: true });
    await invalidateUserSessions(user.id);
    await signOut({ redirect: false });
    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
