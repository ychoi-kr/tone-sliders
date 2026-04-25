import { STATIC_MODELS } from "@/lib/models";

export const runtime = "nodejs";

export async function GET() {
  return new Response(
    JSON.stringify({
      models: STATIC_MODELS.map((m) => ({
        id: m.id,
        label: m.label,
        recommendedFor: m.recommendedFor ?? [],
      })),
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    },
  );
}
