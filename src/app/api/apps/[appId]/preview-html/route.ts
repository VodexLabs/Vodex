import { GET as projectPreviewHtml } from "@/app/api/projects/[id]/preview-html/route";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ appId: string }> },
) {
  const { appId } = await ctx.params;
  return projectPreviewHtml(req, { params: Promise.resolve({ id: appId }) });
}
