import { requireUser } from "@/server/core/auth";
import { jsonError, jsonOk, ApiError } from "@/server/core/errors";
import { getWeeklyDashboard } from "@/server/nutrition-dashboard/service";

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const { searchParams } = new URL(request.url);
    const isoWeek = searchParams.get("iso_week");
    if (!isoWeek) throw new ApiError(400, "Parâmetro iso_week é obrigatório");
    const dashboard = await getWeeklyDashboard(user.id, isoWeek);
    return jsonOk(dashboard);
  } catch (error) {
    return jsonError(error);
  }
}
