import { requireUser, createDatabaseSession } from "@/server/core/auth";
import { jsonError, jsonOk } from "@/server/core/errors";

export async function POST(request: Request) {
  try {
    const user = await requireUser(request, { allowIncompleteOnboarding: true });
    const sessionToken = await createDatabaseSession(user.id);
    return jsonOk({ sessionToken, expiresIn: 30 * 24 * 60 * 60 });
  } catch (error) {
    return jsonError(error);
  }
}
