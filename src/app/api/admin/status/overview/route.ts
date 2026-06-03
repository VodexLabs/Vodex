import { NextResponse } from "next/server";
import { requireDreamosOwner } from "@/lib/admin/require-owner";
import {
  getStatusSchemaState,
  loadPlatformAnnouncementsAdmin,
} from "@/lib/status/status-schema";
import {
  STATUS_SCHEMA_CACHE_HINT,
  STATUS_SCHEMA_INSTALL_HINT,
} from "@/lib/status/status-db";
import { fetchPublicStatusPayload } from "@/lib/status/status-public";

export async function GET() {
  const owner = await requireDreamosOwner();
  if (owner.error) return owner.error;

  const schema = await getStatusSchemaState();
  if (!schema.ready) {
    const hint =
      schema.hint ??
      (schema.missingTables.length > 0
        ? `${STATUS_SCHEMA_INSTALL_HINT} Missing: ${schema.missingTables.join(", ")}.`
        : STATUS_SCHEMA_INSTALL_HINT);
    return NextResponse.json({
      schemaReady: false,
      hint,
      serviceRoleConfigured: schema.serviceRoleConfigured,
      missingTables: schema.missingTables,
      components: [],
      announcements: [],
    });
  }

  const { rows: announcements, error: annError } = await loadPlatformAnnouncementsAdmin();
  const payload = await fetchPublicStatusPayload();

  if (annError && announcements.length === 0) {
    return NextResponse.json({
      schemaReady: true,
      schemaDegraded: true,
      hint: STATUS_SCHEMA_CACHE_HINT,
      components: payload.ok ? payload.components : [],
      announcements: [],
    });
  }

  return NextResponse.json({
    schemaReady: true,
    schemaDegraded: Boolean(annError),
    hint: annError ? STATUS_SCHEMA_CACHE_HINT : null,
    components: payload.ok ? payload.components : [],
    announcements,
  });
}
