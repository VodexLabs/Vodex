import { POST as projectPreviewBuild } from "@/app/api/projects/[id]/preview/build/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ appId: string }> },
) {
  const { appId } = await ctx.params;
  return projectPreviewBuild(req, { params: Promise.resolve({ id: appId }) });
}
