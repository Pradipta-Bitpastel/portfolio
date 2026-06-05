/**
 * @process portfolio/parallax-overhaul
 * @description Build the Firewatch-parallax + scroll-3D + horizontal-pin portfolio
 *   overhaul one workstream at a time, each with an implement -> verify -> review
 *   refine loop, then a final full-page review + human approval.
 * @inputs { repoRoot, planPath, devUrl, workstreams: [...], maxRefine }
 * @outputs { success, workstreams: [...] }
 */

import { defineTask } from "@a5c-ai/babysitter-sdk";

export async function process(inputs, ctx) {
  const {
    repoRoot = "/Users/pradiptajana/Portfolio",
    planPath = "PARALLAX_OVERHAUL_PLAN.md",
    devUrl = "http://localhost:3000",
    maxRefine = 2,
    workstreams = [],
  } = inputs;

  const results = [];

  for (const ws of workstreams) {
    let iteration = 0;
    let passed = false;
    let lastReview = null;
    let lastImpl = null;

    while (iteration < maxRefine && !passed) {
      iteration++;

      // 1. Implement (or refine) the workstream — the agent edits code,
      //    runs `npx tsc --noEmit`, and captures a Playwright screenshot.
      lastImpl = await ctx.task(implementWorkstreamTask, {
        ws,
        iteration,
        repoRoot,
        planPath,
        devUrl,
        previousReview: lastReview,
      });

      // 2. Review the result (code + screenshot) against the plan + guardrails.
      lastReview = await ctx.task(reviewWorkstreamTask, {
        ws,
        iteration,
        repoRoot,
        planPath,
        devUrl,
        implementation: lastImpl,
      });

      if (lastReview && lastReview.pass === true) passed = true;
    }

    results.push({
      id: ws.id,
      title: ws.title,
      passed,
      iterations: iteration,
      review: lastReview,
      implementation: lastImpl,
    });

    // Human checkpoint after each workstream (resolved via AskUserQuestion in
    // interactive mode). Shows the latest screenshot + summary.
    await ctx.breakpoint({
      title: `Workstream complete: ${ws.title}`,
      question: `"${ws.title}" finished after ${iteration} iteration(s), pass=${passed}. Review the screenshot and approve to continue to the next workstream?`,
      context: {
        runId: ctx.runId,
        workstreamId: ws.id,
        passed,
        reviewSummary: lastReview && lastReview.summary,
        screenshot: lastImpl && lastImpl.screenshotPath,
      },
    });
  }

  // Final full-page review across the whole site.
  const finalReview = await ctx.task(finalReviewTask, {
    repoRoot,
    planPath,
    devUrl,
    results,
  });

  await ctx.breakpoint({
    title: "Final review — full portfolio overhaul",
    question: `All workstreams done. Final verdict: ${
      finalReview && finalReview.verdict
    }. Approve the completed overhaul?`,
    context: {
      runId: ctx.runId,
      verdict: finalReview && finalReview.verdict,
      results: results.map((r) => ({ id: r.id, passed: r.passed })),
    },
  });

  return {
    success: results.every((r) => r.passed),
    workstreams: results,
    finalReview,
    metadata: { processId: "portfolio/parallax-overhaul", timestamp: ctx.now() },
  };
}

/* ------------------------------------------------------------------ *
 * TASKS
 * ------------------------------------------------------------------ */

export const implementWorkstreamTask = defineTask(
  "implement-workstream",
  (args, taskCtx) => ({
    kind: "agent",
    title: `Implement: ${args.ws.title} (iter ${args.iteration})`,
    description: `Implement workstream ${args.ws.id} per the plan, then self-verify.`,
    agent: {
      name: "general-purpose",
      prompt: {
        role: "senior creative front-end engineer (Next.js 14 + React Three Fiber + GSAP)",
        task: `Implement workstream "${args.ws.id} — ${args.ws.title}" of the portfolio overhaul, then verify it.`,
        context: {
          repoRoot: args.repoRoot,
          planPath: args.planPath,
          devUrl: args.devUrl,
          iteration: args.iteration,
          workstream: args.ws,
          previousReviewFeedback: args.previousReview
            ? args.previousReview.feedback
            : null,
        },
        instructions: [
          `Read ${args.planPath} in ${args.repoRoot} and focus ONLY on this workstream: ${args.ws.id} — ${args.ws.title}.`,
          `Workstream details/acceptance: ${args.ws.detail}`,
          "If a previousReviewFeedback is present, address every point it raises.",
          "Honor every guardrail in the plan's Guardrails section (native scroll only, no extra GSAP pin except the Projects horizontal track, rAF engine owns layer transforms, keep reduced-motion/touch/low-tier fallbacks, no React-children+textContent mix).",
          "Make the actual file edits in the repo (use Edit/Write). Match the surrounding code style.",
          "After editing, run `npx tsc --noEmit` from the repo root and fix any type errors you introduced.",
          "Verify the dev server responds at the devUrl (it should already be running); if not, note it but do not block.",
          "Capture a Playwright screenshot to /tmp so the reviewer can see it: write a temporary CJS script in the repo root that launches chromium (viewport 1440x820, deviceScaleFactor 2), navigates to the relevant scroll position for this workstream (use page.evaluate(()=>window.scrollTo(...)) + waitForTimeout), screenshots to a unique /tmp path, then delete the temp script.",
          "Return ONLY the JSON result described in the output schema — no prose.",
        ],
        outputFormat:
          "JSON with filesChanged (string[]), summary (string), typecheckPassed (boolean), screenshotPath (string), notes (string)",
      },
      outputSchema: {
        type: "object",
        required: ["filesChanged", "summary", "typecheckPassed", "screenshotPath"],
        properties: {
          filesChanged: { type: "array", items: { type: "string" } },
          summary: { type: "string" },
          typecheckPassed: { type: "boolean" },
          screenshotPath: { type: "string" },
          notes: { type: "string" },
        },
      },
    },
    io: {
      inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
      outputJsonPath: `tasks/${taskCtx.effectId}/result.json`,
    },
    labels: ["agent", "implement", args.ws.id, `iteration-${args.iteration}`],
  })
);

export const reviewWorkstreamTask = defineTask(
  "review-workstream",
  (args, taskCtx) => ({
    kind: "agent",
    title: `Review: ${args.ws.title} (iter ${args.iteration})`,
    description: `Visual + code review of workstream ${args.ws.id} against the plan.`,
    agent: {
      name: "general-purpose",
      prompt: {
        role: "principal front-end reviewer with a high visual-design bar",
        task: `Review the implementation of workstream "${args.ws.id} — ${args.ws.title}" against the plan and its acceptance criteria, including the captured screenshot.`,
        context: {
          repoRoot: args.repoRoot,
          planPath: args.planPath,
          workstream: args.ws,
          implementation: args.implementation,
        },
        instructions: [
          `Read ${args.planPath} and the changed files (${
            args.implementation ? (args.implementation.filesChanged || []).join(", ") : ""
          }).`,
          `View the screenshot at ${
            args.implementation ? args.implementation.screenshotPath : "(none)"
          } using the Read tool and judge it visually against the workstream's acceptance criteria: ${args.ws.detail}`,
          "Verify guardrails were respected and `npx tsc --noEmit` passes (run it yourself to confirm).",
          "Be strict but fair: pass=true only if the workstream's acceptance criteria are visibly and functionally met.",
          "If pass=false, give specific, actionable feedback the implementer can act on next iteration.",
          "Return ONLY the JSON result described in the output schema.",
        ],
        outputFormat:
          "JSON with pass (boolean), score (number 0-100), summary (string), feedback (string[])",
      },
      outputSchema: {
        type: "object",
        required: ["pass", "score", "summary"],
        properties: {
          pass: { type: "boolean" },
          score: { type: "number", minimum: 0, maximum: 100 },
          summary: { type: "string" },
          feedback: { type: "array", items: { type: "string" } },
        },
      },
    },
    io: {
      inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
      outputJsonPath: `tasks/${taskCtx.effectId}/result.json`,
    },
    labels: ["agent", "review", args.ws.id, `iteration-${args.iteration}`],
  })
);

export const finalReviewTask = defineTask("final-review", (args, taskCtx) => ({
  kind: "agent",
  title: "Final full-page review",
  description: "Whole-site review across all workstreams.",
  agent: {
    name: "general-purpose",
    prompt: {
      role: "principal engineer and design director",
      task: "Conduct a final whole-site review of the overhauled portfolio: scroll through, capture screenshots at several scroll positions, and judge cohesion, performance signals, and fidelity to the plan.",
      context: {
        repoRoot: args.repoRoot,
        planPath: args.planPath,
        devUrl: args.devUrl,
        results: args.results,
      },
      instructions: [
        `Read ${args.planPath}. Confirm each workstream's intent is met and nothing in the Guardrails section regressed.`,
        "Write a temporary Playwright CJS script that navigates the devUrl and screenshots at top, mid, and bottom scroll positions; Read each screenshot and assess.",
        "Run `npx tsc --noEmit` to confirm the build is type-clean.",
        "Give an honest verdict and a short punch-list of any remaining polish.",
        "Return ONLY the JSON result described in the output schema.",
      ],
      outputFormat:
        "JSON with verdict (string), approved (boolean), strengths (string[]), remaining (string[])",
    },
    outputSchema: {
      type: "object",
      required: ["verdict", "approved"],
      properties: {
        verdict: { type: "string" },
        approved: { type: "boolean" },
        strengths: { type: "array", items: { type: "string" } },
        remaining: { type: "array", items: { type: "string" } },
      },
    },
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/result.json`,
  },
  labels: ["agent", "final-review"],
}));
