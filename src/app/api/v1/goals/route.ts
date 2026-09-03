import { requireUser } from "@/server/core/auth";
import { jsonError, jsonOk } from "@/server/core/errors";
import { getActiveGoals } from "@/server/nutrition-goals/repository";

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const goals = await getActiveGoals(user.id);
    return jsonOk(goals);
  } catch (error) {
    return jsonError(error);
  }
}
