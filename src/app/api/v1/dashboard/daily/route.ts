import { requireUser } from "@/server/core/auth";
import { jsonError, jsonOk, ApiError } from "@/server/core/errors";
import { getDailyDashboard } from "@/server/nutrition-dashboard/service";

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    if (!date) throw new ApiError(400, "Parâmetro date é obrigatório");
    const dashboard = await getDailyDashboard(user.id, date);
    return jsonOk(dashboard);
  } catch (error) {
    return jsonError(error);
  }
}
