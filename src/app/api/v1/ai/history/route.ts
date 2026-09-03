import { requireUser } from "@/server/core/auth";
import { jsonError, jsonOk } from "@/server/core/errors";
import { prisma } from "@/server/core/db";

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get("page") ?? "1");
    const pageSize = Math.min(Number(searchParams.get("pageSize") ?? "20"), 50);
    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      prisma.aiInteraction.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
        select: {
          id: true,
          createdAt: true,
          intent: true,
          response: true,
          status: true,
        },
      }),
      prisma.aiInteraction.count({ where: { userId: user.id } }),
    ]);

    return jsonOk({
      items: items.map((i) => ({
        id: i.id,
        created_at: i.createdAt.toISOString(),
        intent: i.intent,
        response: i.response,
        status: i.status,
      })),
      page,
      pageSize,
      total,
    });
  } catch (error) {
    return jsonError(error);
  }
}
