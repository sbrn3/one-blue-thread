# Lateral techniques

Adapted from danium/lateral-thinking (Edward de Bono; Synectics; reverse brainstorming). Each technique is divergent. Convergence is the user's move, never the skill's. Refuse to *perform* analytical work (debugging, code review); redesigning a process is in scope.

## The shared loop

1. **Confirm the target** - a concrete creative problem, not a blank page and not an analytical task.
2. **Surface 4 to 8 load-bearing assumptions** the current design treats as fixed.
3. **Generate a batch** of prompts for the technique. Push for genuine distance or absurdity, not plausibility.
4. **Extract movement per prompt** - do not judge the prompt. Name three things: the principle hiding inside it, what happens moment to moment if it were literally true, what concretely differs from the current design.
5. **Meta-pattern scan** - the structural idea that keeps recurring across the prompts that produced real movement. Scan the abandonments too; they usually share a reason and that reason is a finding.
6. **Honest ranking** - 2 to 4 strongest directions, weak ones named weak, dead prompts shown dead. No closure pressure.

## Honesty mechanics (all techniques)

- Expect roughly 1 in 3 to 1 in 4 prompts to yield nothing. Mark them failed, visibly.
- A batch where every prompt lands cleanly means judgment is masquerading as divergence. Redo it.
- **Redundancy test**: could this idea have been reached from the target alone, without the prompt? If yes, the prompt did no work. Abandon it however pretty the image.
- If more than half the batch dies, do not run more prompts - that is the move that just failed. Diagnose the target and switch technique.

## The eight

### random-stimulus - "ideas repeat, all predictable"
Draw 8 to 12 unrelated stimuli from `stimulus-pools.md`. At least five distinct categories, at least two concrete objects and one abstraction, no two adjacent from the same category. Each stimulus has a *structural property* (cyclical, layered, swarming, ephemeral, branching) the target could have but does not. Show the full chain: stimulus, properties, force-fit jump, idea. The seductive failure is a stimulus that restates the target as a nicer picture of itself.
Upstream: target phrased as a solution to concept-fan; target fenced by one fixed constraint to provocation.

### provocation - "a constraint is treated as immovable"
State 4 to 6 assumptions as immovable facts, then break them with de Bono's five operations, each prefixed `Po:` - **Escape** (drop a rule), **Reversal** (invert direction), **Exaggeration** (impossible extreme), **Distortion** (scramble sequence or swap roles), **Wishful thinking** (state fantasy as done). At least three operations per batch, max eight prompts. Never defend, attack, or treat a provocation as a proposal. Aim for real absurdity.
Upstream: whole batch stalls on vague target to random-stimulus; repeated convergence to concept-fan.

### inversion - "an assumption goes unquestioned"
List 5 to 8 assumptions across categories: the user, the value, the channel, the sequence, the price, the effort split. Flip each into its strongest *plausible* opposite (a competitor could defend it), not a strawman. Then the load-bearing question: **in what market, segment, or era is this flip already true, and who profits from it today?** Name a real place or the flip is dead. Expect one or two flips to die; something usually survives inversion unscathed, and that is a finding about where not to spend effort.

### concept-fan - "possibly solving the wrong problem"
Ask "what is this a way of doing?" to name the *direction* above the current solution. Climb at most twice (a third rung lands on "deliver value" and nothing fans from it). At each level, list 3 to 4 *alternative* concepts serving the level above. Drop the 2 to 3 best down into concrete implementations. Prune cosmetic variants visibly ("faster onboarding emails is the original with a coat of paint - pruned").
Failed fan: both climbs land too abstract to fan to analogy.

### analogy - "solutions feel derivative"
State the problem's structure in one sentence - actors, flows, bottleneck - with no domain vocabulary. If it still names your industry it is not abstract enough. Draw 3 to 5 domains from `analogy-domains.md` whose structure *rhymes* (not whose words sound related). Mix at least one biological, one operational, one social. Per domain: map the roles in one line, then ask "what does this domain DO about the bottleneck that we don't?" and carry back the *mechanism*, not the imagery. One-forced-role rule: the moment a domain needs a second forced role, it does not rhyme - abandon it.

### scamper - "one idea, need real variants"
Push one existing thing through seven lenses in fixed order: **S**ubstitute, **C**ombine, **A**dapt, **M**odify/Magnify, **P**ut to other use, **E**liminate, **R**everse/Rearrange. Apply only the questions that bite. Empty operations are shown empty, not padded. Expect 3 to 5 productive operations on a real target; all seven producing hits signals manufactured output. State what changes, what it costs, what it risks per variant.

### six-hats - "a decision is racing to consensus"
Six sequential passes over one decision, never blended: **White** (only verifiable facts, name missing data), **Red** (one line of gut feeling each, no justification), **Black** (each risk tied to its mechanism), **Yellow** (each benefit tied to its mechanism), **Green** (min three new options, at least one abandons the premise), **Blue** (what did the hats disagree about; recommendation with a stated confidence level). A Red pass where every feeling agrees with the current answer is a tell.

### worst-idea - "every option is timid"
Generate 5 to 8 genuinely plausible bad ideas - ones a real team rationalized its way into, not cartoons. State in one sentence *why* each fails structurally. Invert the *mechanism* (not just remove the bad thing) into a design principle. Develop the 2 to 4 strongest into concrete features. If a "worst idea" turns out viable, disqualify and replace it. Cluster the mechanisms into what this design must never do.
