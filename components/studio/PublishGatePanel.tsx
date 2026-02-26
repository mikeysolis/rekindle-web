"use client";

import type { PublishGateResult } from "@/lib/studio/publish-gate";

type PublishGatePanelProps = {
  gate: PublishGateResult;
  baseFieldLabels?: Record<string, string>;
  traitLabelsBySlug?: Record<string, string>;
  onJumpToBaseField?: (field: string) => void;
  onJumpToTrait?: (traitTypeSlug: string) => void;
};

function renderListItemButton(
  key: string,
  label: string,
  onClick?: () => void,
) {
  if (!onClick) {
    return <li key={key}>{label}</li>;
  }

  return (
    <li key={key}>
      <button
        type="button"
        onClick={onClick}
        className="underline decoration-zinc-400 underline-offset-2 hover:decoration-zinc-900"
      >
        {label}
      </button>
    </li>
  );
}

export default function PublishGatePanel({
  gate,
  baseFieldLabels = {},
  traitLabelsBySlug = {},
  onJumpToBaseField,
  onJumpToTrait,
}: PublishGatePanelProps) {
  return (
    <section className="rounded border border-zinc-300 bg-white p-4">
      <h2 className="mb-2 text-base font-semibold">Publish Gate</h2>
      <p className={gate.isPublishable ? "text-green-700" : "text-amber-700"}>
        {gate.isPublishable ? "Publishable" : "Missing required fields or tags"}
      </p>

      {!gate.isPublishable && (
        <div className="mt-3 space-y-3 text-sm">
          {gate.missingBaseFields.length > 0 && (
            <div>
              <p className="font-medium">Missing base fields</p>
              <ul className="list-disc pl-6">
                {gate.missingBaseFields.map((field) =>
                  renderListItemButton(
                    field,
                    baseFieldLabels[field] ?? field,
                    onJumpToBaseField ? () => onJumpToBaseField(field) : undefined,
                  ),
                )}
              </ul>
            </div>
          )}

          {gate.missingTraitTypeSlugs.length > 0 && (
            <div>
              <p className="font-medium">Missing Tier 1 trait selections</p>
              <ul className="list-disc pl-6">
                {gate.missingTraitTypeSlugs.map((slug) =>
                  renderListItemButton(
                    slug,
                    traitLabelsBySlug[slug] ?? slug,
                    onJumpToTrait ? () => onJumpToTrait(slug) : undefined,
                  ),
                )}
              </ul>
            </div>
          )}
        </div>
      )}

      {gate.warnings.length > 0 && (
        <div className="mt-3 text-sm">
          <p className="font-medium">Warnings</p>
          <ul className="list-disc pl-6">
            {gate.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
