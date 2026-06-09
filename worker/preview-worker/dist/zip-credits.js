import { supabase } from "./supabase.js";
import { log } from "./logger.js";
function operationId(projectId) {
    return `zip-preview:${projectId}`;
}
function parseZipCreditRpc(data) {
    if (!data || typeof data !== "object")
        return null;
    const row = data;
    if (row.success === true) {
        return {
            success: true,
            charged: typeof row.charged === "number" ? row.charged : undefined,
            remaining: typeof row.remaining === "number" ? row.remaining : undefined,
            idempotent: row.idempotent === true,
        };
    }
    if (row.success === false) {
        return {
            success: false,
            error: typeof row.error === "string" ? row.error : "charge failed",
            message: typeof row.message === "string" ? row.message : undefined,
        };
    }
    return null;
}
export async function captureZipPreviewCredits(projectId, ownerId) {
    const op = operationId(projectId);
    const { data: hold } = await supabase
        .from("zip_preview_action_holds")
        .select("credits, status")
        .eq("operation_id", op)
        .maybeSingle();
    if (!hold || hold.status === "charged" || hold.status === "cancelled" || hold.status === "refunded") {
        return;
    }
    const credits = Number(hold.credits) || 10;
    const { data, error: rpcError } = await supabase.rpc("charge_action_credits", {
        p_owner_user_id: ownerId,
        p_project_id: null,
        p_action_type: "zip_preview_build",
        p_credits: credits,
        p_operation_id: op,
        p_provider: "preview_worker",
        p_provider_cost_usd: 0,
        p_metadata: { zip_preview: true, capture: true },
    });
    if (rpcError) {
        log("error", "zip preview charge failed", { projectId, error: rpcError.message });
        await patchJobBilling(projectId, {
            credit_reservation_id: op,
            estimated_action_credits: credits,
            captured_action_credits: null,
            credit_status: "reserved",
            credit_capture_error: `Worker capture RPC failed: ${rpcError.message}`,
            estimated_action_credits_legacy: credits,
            charged_action_credits: null,
            charge_status: "pending",
        });
        return;
    }
    const result = parseZipCreditRpc(data);
    if (result?.success) {
        await supabase
            .from("zip_preview_action_holds")
            .update({ status: "charged", updated_at: new Date().toISOString() })
            .eq("operation_id", op);
        const charged = result.charged ?? credits;
        await patchJobBilling(projectId, {
            credit_reservation_id: op,
            estimated_action_credits: credits,
            captured_action_credits: charged,
            credit_status: "captured",
            estimated_action_credits_legacy: credits,
            charged_action_credits: charged,
            charge_status: "charged",
        });
        log("info", "zip preview credits captured", { projectId, credits: charged, idempotent: result.idempotent });
        return;
    }
    const err = result && !result.success
        ? result.message ?? result.error
        : "charge failed";
    log("error", "zip preview charge rejected", { projectId, error: err });
    await patchJobBilling(projectId, {
        credit_reservation_id: op,
        estimated_action_credits: credits,
        captured_action_credits: null,
        credit_status: "reserved",
        credit_capture_error: `Worker capture failed: ${err}`,
        estimated_action_credits_legacy: credits,
        charged_action_credits: null,
        charge_status: "pending",
    });
}
export async function cancelZipPreviewHold(projectId) {
    const op = operationId(projectId);
    const { data: hold } = await supabase
        .from("zip_preview_action_holds")
        .select("credits")
        .eq("operation_id", op)
        .maybeSingle();
    await supabase
        .from("zip_preview_action_holds")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("operation_id", op)
        .eq("status", "reserved");
    const credits = Number(hold?.credits) || 0;
    await patchJobBilling(projectId, {
        credit_reservation_id: op,
        estimated_action_credits: credits,
        captured_action_credits: null,
        credit_status: "released",
        estimated_action_credits_legacy: credits,
        charged_action_credits: null,
        charge_status: "cancelled",
    });
}
async function patchJobBilling(projectId, billing) {
    const { data: job } = await supabase
        .from("preview_build_jobs")
        .select("id, diagnostics")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
    if (!job?.id)
        return;
    const prev = job.diagnostics && typeof job.diagnostics === "object" && !Array.isArray(job.diagnostics)
        ? job.diagnostics
        : {};
    await supabase
        .from("preview_build_jobs")
        .update({
        diagnostics: { ...prev, ...billing, previewBilling: billing },
        updated_at: new Date().toISOString(),
    })
        .eq("id", job.id);
}
