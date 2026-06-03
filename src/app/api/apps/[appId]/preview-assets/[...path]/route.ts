import { GET as projectPreviewAssets } from "@/app/api/projects/[id]/preview-assets/[...path]/route";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ appId: string; path: string[] }> },
) {
  const { appId, path } = await ctx.params;
  return projectPreviewAssets(req, { params: Promise.resolve({ id: appId, path }) });
}
