import { GET as projectPreviewStatus } from "@/app/api/projects/[id]/preview/import-status/route";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ appId: string }> },
) {
  const { appId } = await ctx.params;
  return projectPreviewStatus(req, { params: Promise.resolve({ id: appId }) });
}
