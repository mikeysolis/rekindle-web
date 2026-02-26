import { NextResponse } from "next/server";

import { getStudioUserOrNull } from "@/lib/studio/auth";
import { getTraitSelectionsForDraftIds, listDraftsByStatus } from "@/lib/studio/drafts";
import { buildExportRows, serializeExportRowsToCsv } from "@/lib/studio/export";
import { getIdeaRegistrySnapshot } from "@/lib/studio/registry";
import { createSupabaseServerClient } from "@/lib/database/server";

function buildFileName(): string {
  const now = new Date();
  const stamp = now
    .toISOString()
    .replaceAll("-", "")
    .replaceAll(":", "")
    .replace("T", "-")
    .slice(0, 15);

  return `idea-drafts-publishable-${stamp}.csv`;
}

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const studioUser = await getStudioUserOrNull("editor", supabase);

  if (!studioUser) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [snapshot, publishableDrafts] = await Promise.all([
    getIdeaRegistrySnapshot(),
    listDraftsByStatus("publishable"),
  ]);

  const selectionsByDraftId = await getTraitSelectionsForDraftIds(
    publishableDrafts.map((draft) => draft.id),
  );

  const exportBuild = buildExportRows(
    publishableDrafts,
    selectionsByDraftId,
    snapshot.bindings,
  );

  const csv = serializeExportRowsToCsv(exportBuild.rows);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${buildFileName()}"`,
      "cache-control": "no-store",
      "x-rekindle-export-total-rows": String(exportBuild.rows.length),
      "x-rekindle-export-skipped-rows": String(exportBuild.skippedDraftIds.length),
    },
  });
}
