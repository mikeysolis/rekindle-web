import assert from "node:assert/strict"
import test from "node:test"

import { buildPromotionReconciliationPlan } from "./reconcile-promotions.js"

test("buildPromotionReconciliationPlan schedules status + sync-log repairs for desynced promotions", () => {
  const plan = buildPromotionReconciliationPlan({
    drafts: [
      { draftId: "draft-1", candidateId: "candidate-1" },
      { draftId: "draft-2", candidateId: "candidate-2" },
      { draftId: "draft-3", candidateId: "candidate-3" },
    ],
    candidates: [
      { candidateId: "candidate-1", status: "curated" },
      { candidateId: "candidate-2", status: "pushed_to_studio" },
    ],
    successLogs: [{ candidateId: "candidate-2", targetId: "draft-2" }],
  })

  assert.equal(plan.scannedDraftCount, 3)
  assert.equal(plan.missingCandidateCount, 1)
  assert.deepEqual(plan.statusRepairCandidateIds, ["candidate-1"])
  assert.deepEqual(plan.syncLogRepairs, [{ candidateId: "candidate-1", draftId: "draft-1" }])
})

test("buildPromotionReconciliationPlan dedupes repeated draft links and ignores null-target success rows", () => {
  const plan = buildPromotionReconciliationPlan({
    drafts: [
      { draftId: "draft-1", candidateId: "candidate-1" },
      { draftId: "draft-1", candidateId: "candidate-1" },
      { draftId: "draft-2", candidateId: "candidate-2" },
    ],
    candidates: [
      { candidateId: "candidate-1", status: "pushed_to_studio" },
      { candidateId: "candidate-2", status: "pushed_to_studio" },
    ],
    successLogs: [
      { candidateId: "candidate-1", targetId: "draft-1" },
      { candidateId: "candidate-2", targetId: null },
    ],
  })

  assert.equal(plan.scannedDraftCount, 3)
  assert.equal(plan.missingCandidateCount, 0)
  assert.deepEqual(plan.statusRepairCandidateIds, [])
  assert.deepEqual(plan.syncLogRepairs, [{ candidateId: "candidate-2", draftId: "draft-2" }])
})
