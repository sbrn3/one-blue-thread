import { describe, expect, it } from 'vitest';
import {
  claimedMainSha, duplicateHeadings, journalHeadings, lastUpdated, ledgerPlans, markdownItems,
  planDrift, referencesIn, staleOpenItems, statusPlans, uncheckedActions,
} from '../scripts/lib/catch-me-up-parse.mjs';

const status=`# Status

_Last updated: 2026-09-07 (something)_

## Branch state

\`main\` at \`25a3faf\`, tagged \`v0.6.0\`.

## Active plans

- **knot-declutter** — 🔨 implementation complete; PR open.
  PR #24 on \`fix/knot-declutter\` is MERGEABLE.

- **app-quality-foundations** — ✅ shipped. PRs #11–#17 merged.

## Next actions

- [x] ~~Done thing.~~
- [ ] Give the suite a real renderer.
      Continuation line.
`;

const ledger=`| Slug | Intent | Status | Next action |
|------|--------|--------|-------------|
| knot-declutter | Fix the knot | 🔨 implementation complete | PR #24 |
| app-quality-foundations | Fonts | ✅ shipped | Merged |
| one-blue-thread-rebrand | Rename | 🔨 launch gated | Review |

Status: 📋 planned · 🔨 in progress.
`;

describe('catch-me-up doc parsing', () => {
  it('groups bullets with their indented continuation lines and reads the first marker', () => {
    const [knot,quality]=markdownItems(status).filter((item)=>item.section==='Active plans');
    expect(knot.marker).toBe('🔨');
    expect(knot.text).toContain('fix/knot-declutter');
    expect(quality.marker).toBe('✅');
  });

  it('extracts issue ranges, branches and SHAs but not hex colours', () => {
    const refs=referencesIn('PRs #11–#17, PR #24 on `fix/knot-declutter` at `2118227`, warp `#8F8779`, `v0.6.0`');
    expect(refs.numbers).toEqual([11,12,13,14,15,16,17,24]);
    expect(refs.branches).toEqual(['fix/knot-declutter']);
    expect(refs.shas).toEqual(['2118227']);
  });

  it('flags only open items whose references have already landed', () => {
    const findings=staleOpenItems(markdownItems(status),{
      prs:new Map([[24,{state:'MERGED'}],[11,{state:'MERGED'}]]),
      issues:new Map(),
      mergedBranches:new Set(['fix/knot-declutter']),
      shaOnMain:()=>false,
    });
    expect(findings).toHaveLength(1);
    expect(findings[0].evidence).toEqual(['PR #24 merged','`fix/knot-declutter` merged']);
  });

  it('does not flag open items whose PRs are still open', () => {
    const findings=staleOpenItems(markdownItems(status),{
      prs:new Map([[24,{state:'OPEN'}]]),issues:new Map(),mergedBranches:new Set(),shaOnMain:()=>false,
    });
    expect(findings).toEqual([]);
  });

  it('reports status disagreements between STATUS and the plans ledger, and unindexed folders', () => {
    expect(planDrift(statusPlans(status),ledgerPlans(ledger),['knot-declutter','orphan-plan'])).toEqual([
      '`docs/plans/orphan-plan/`: in neither index',
    ]);
    const drifted=new Map([['knot-declutter','✅'],['apple-web-pwa','📋']]);
    expect(planDrift(drifted,ledgerPlans(ledger),[])).toEqual([
      '`knot-declutter`: STATUS says ✅, plans ledger says 🔨',
      '`apple-web-pwa`: in STATUS Active plans, missing from the plans ledger',
    ]);
  });

  it('reads the header facts STATUS makes claims about', () => {
    expect(lastUpdated(status)).toBe('2026-09-07');
    expect(claimedMainSha(status)).toBe('25a3faf');
    expect(uncheckedActions(status)).toEqual(['Give the suite a real renderer. Continuation line.']);
  });

  it('finds repeated headings and the newest journal entries', () => {
    expect(duplicateHeadings('## Shipped\n\n## Planned\n\n## Shipped\n')).toEqual(['## Shipped']);
    expect(journalHeadings('# Journal\n\n## 2026-09-07 — b\n\n## 2026-09-06 — a\n',1)).toEqual(['2026-09-07 — b']);
  });
});
