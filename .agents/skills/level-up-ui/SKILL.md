---
name: level-up-ui
description: Force a Thread surface past "fine" toward a distinctive direction when the user says it feels generic or safe. Diverges deliberately with lateral-thinking techniques, breaks AI-convergence at construction level, rejects slop, and hands one committed direction to a build skill. Not for routine restyles or new feature behavior.
---

# Level up UI

The surface works but the design is unambitious. Deliberate divergence plus a
taste gate. Produces one committed direction and hands off — no product code.

Use when the surface *works* and the problem is that it is dull or generic. If
the product intent is unresolved, use `/grill` first. For a system-wide
consistency check use `/design-audit`. For a scoped restyle where the direction
is already clear, skip to `/visual-surgery`.

Only `docs/plans/<slug>/level-up.md`, an optional `docs/plans/<slug>/mockup.html`,
and the conversation may change. This runs before `/plan`, so it doesn't touch
`STATUS.md` or `ROADMAP.md`.

## 1. Frame the dissatisfaction

- Name the surface and read it: the screen, `src/ui/tokens.ts`, its `StyleSheet`,
  the reference palette/type in `docs/index.html`, and the nearby shipped flow
  screens you'd be judged against. Enough to know the material.
- State in one sentence what makes the current version obvious or forgettable. If
  the user already said it, sharpen it — don't re-ask.
- Pick or reuse a short kebab-case slug. Use `docs/plans/<slug>/level-up.md` as
  handoff state.
- If the dissatisfaction is vague ("just make it better"), the framing is the
  problem. Ask one sharpening question or run **concept-fan** to climb to what
  the surface is for, then continue.

## 2. Diverge with intent (lateral techniques)

Route by symptom, run 2 to 4. Workflows, operations, and honesty mechanics are in
[`references/lateral-techniques.md`](references/lateral-techniques.md); pools in
[`references/stimulus-pools.md`](references/stimulus-pools.md) and
[`references/analogy-domains.md`](references/analogy-domains.md).

| Symptom | Technique |
|---|---|
| Ideas repeat, all predictable | random-stimulus |
| A constraint is treated as immovable | provocation |
| An assumption goes unquestioned | inversion |
| Possibly solving the wrong problem | concept-fan |
| Solutions feel derivative | analogy |
| One idea, need real variants | scamper |
| Converging too fast to have examined it | six-hats |
| Every option is timid | worst-idea |

The divergent techniques share one loop: surface assumptions, generate a batch,
**extract movement per prompt**, meta-pattern scan, honest ranking. Movement
extraction is the core mechanic, not idea listing.

## 3. Honesty check

- Expect ~1 prompt in 3–4 to yield no movement. Mark those failed, visibly. A
  batch where every prompt lands means judgment is masquerading as divergence —
  redo it.
- Redundancy test per kept idea: could it have been reached from the target
  alone? If yes, abandon it.
- If more than half the batch stalls, the target is wrong — go back to step 1 or
  switch technique.

## 4. Give it a DNA

For the survivors fix three axes explicitly — **aesthetic family**, **layout
discipline**, **signature move** — then critique on distinctiveness, register fit
(Thread is quiet, scripture-forward, one reader — not a dashboard), and a tells
scan before choosing. Method in
[`references/aesthetic-families.md`](references/aesthetic-families.md). Anything
the user has stated about taste is a pin that locks an axis.

## 5. Reject the slop

Fresh-eyes pass against [`references/ai-tells.md`](references/ai-tells.md): name
every tell the direction still carries, then remove them. Apply the AI Slop Test.
The direction must also pass
[`references/production-gate.md`](references/production-gate.md) — copy the
relevant constraints into `level-up.md`. The gate constrains execution, not
ambition.

## 6. Mock before handoff (if it is a real departure)

If the direction meaningfully changes composition or hierarchy, build a low-fi
mockup (the `/plan` mockup template) and get sign-off before handing off. A
small, obvious shift skips this. Note: mockups are HTML for speed; the build is
React Native `StyleSheet` — keep the signature move something achievable with
RN + `react-native-svg` + Reanimated.

## 7. Commit and hand off

- Choose one direction. Write `level-up.md`: the framed dissatisfaction;
  techniques run and their verdicts (including failures); the meta-pattern; the
  chosen direction with aesthetic family, layout discipline, signature move,
  typography, color, spacing, atmosphere, motion intent; the gate constraints;
  and what is explicitly out of scope.
- If composition is now a product choice, hand to `/plan` (or `/grill` first if
  intent is still fuzzy). If it is purely visual, hand to `/visual-surgery`.
  Delete `level-up.md` once absorbed.
- Do not begin implementation here.

## Reference library

- [`references/lateral-techniques.md`](references/lateral-techniques.md)
- [`references/stimulus-pools.md`](references/stimulus-pools.md)
- [`references/analogy-domains.md`](references/analogy-domains.md)
- [`references/ai-tells.md`](references/ai-tells.md)
- [`references/aesthetic-families.md`](references/aesthetic-families.md)
- [`references/production-gate.md`](references/production-gate.md)

Sources: danium/lateral-thinking, ryanthedev/design-for-ai, Yu-369/VibeCurb,
nextlevelbuilder/ui-ux-pro-max-skill. Adapted, not copied.
