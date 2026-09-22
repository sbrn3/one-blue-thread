// Pure parsing for scripts/catch-me-up.mjs — no git, gh, or filesystem access here.

export const MARKERS=['✅','🔨','📋','❄️'];
const OPEN=new Set(['🔨','📋']);

const markerOf=(text)=>{
  let best=null;
  for(const marker of MARKERS){
    const at=text.indexOf(marker);
    if(at!==-1&&(best===null||at<best.at))best={marker,at};
  }
  return best?.marker??null;
};

const clean=(text)=>text.replace(/\s+/g,' ').trim();

/** Splits markdown into items: top-level bullets (with their indented continuation lines) and table rows. */
export function markdownItems(markdown){
  const items=[];
  let current=null;
  let section='';
  markdown.split(/\r?\n/).forEach((line,index)=>{
    const heading=/^#{1,6}\s+(.*)$/.exec(line);
    if(heading){current=null;section=heading[1].trim();return;}
    if(/^[-*]\s+/.test(line)||/^\|/.test(line)){
      current={section,line:index+1,text:line};
      items.push(current);
      if(/^\|/.test(line))current=null;
      return;
    }
    if(current&&/^\s+\S/.test(line)){current.text+=`\n${line}`;return;}
    current=null;
  });
  return items.map((item)=>({...item,marker:markerOf(item.text)}));
}

/** References an item names: `#n` / `PR #n` / `PRs #11–#17`, backticked branch names, backticked SHAs. */
export function referencesIn(text){
  const numbers=new Set();
  for(const match of text.matchAll(/(?<![\w&])#(\d+)\b(?:\s*[–-]\s*#?(\d+)\b)?/g)){
    const start=Number(match[1]);
    const end=match[2]?Number(match[2]):start;
    for(let n=start;n<=end&&n-start<50;n++)numbers.add(n);
  }
  const branches=new Set();
  const shas=new Set();
  for(const match of text.matchAll(/`([^`\s]+)`/g)){
    const token=match[1];
    if(/^(feat|fix|chore|docs|refactor|test|perf|build|ci)\/[\w.\-/]+$/.test(token))branches.add(token);
    else if(/^[0-9a-f]{7,40}$/.test(token))shas.add(token);
  }
  return {numbers:[...numbers],branches:[...branches],shas:[...shas]};
}

/** Open (🔨/📋) items that reference something already merged, closed, or on main. */
export function staleOpenItems(items,{prs,issues,mergedBranches,shaOnMain}){
  const findings=[];
  for(const item of items){
    if(!OPEN.has(item.marker))continue;
    const refs=referencesIn(item.text);
    const evidence=[];
    for(const n of refs.numbers){
      const pr=prs.get(n);
      if(pr?.state==='MERGED')evidence.push(`PR #${n} merged`);
      else if(!pr&&issues.get(n)==='CLOSED')evidence.push(`#${n} closed`);
    }
    for(const branch of refs.branches)if(mergedBranches.has(branch))evidence.push(`\`${branch}\` merged`);
    for(const sha of refs.shas)if(shaOnMain(sha))evidence.push(`\`${sha}\` on main`);
    if(evidence.length)findings.push({line:item.line,marker:item.marker,summary:summarize(item.text),evidence});
  }
  return findings;
}

export function summarize(text,limit=90){
  const flat=clean(text.replace(/^\s*[-*|]\s*/,'').replace(/\*\*/g,''));
  return flat.length>limit?`${flat.slice(0,limit-1)}…`:flat;
}

/** Plan status by slug from the STATUS.md "Active plans" bullets: `- **slug** — marker …`. */
export function statusPlans(statusMarkdown){
  const plans=new Map();
  for(const item of markdownItems(statusMarkdown)){
    if(!/^active plans$/i.test(item.section))continue;
    const slug=/^[-*]\s+\*\*([a-z0-9-]+)\*\*/.exec(item.text)?.[1];
    if(slug)plans.set(slug,item.marker);
  }
  return plans;
}

/** Plan status by slug from the docs/plans/README.md ledger table. */
export function ledgerPlans(ledgerMarkdown){
  const plans=new Map();
  for(const line of ledgerMarkdown.split(/\r?\n/)){
    const cells=line.split('|').map((cell)=>cell.trim());
    if(cells.length<5||!/^[a-z0-9-]+$/.test(cells[1])||cells[1]==='slug')continue;
    plans.set(cells[1],markerOf(cells[3]));
  }
  return plans;
}

/** Differences between the two plan indexes, plus plan folders neither lists. */
export function planDrift(status,ledger,folders){
  const drift=[];
  for(const [slug,marker] of ledger){
    if(!status.has(slug))continue;
    if(status.get(slug)!==marker)drift.push(`\`${slug}\`: STATUS says ${status.get(slug)??'no marker'}, plans ledger says ${marker??'no marker'}`);
  }
  for(const slug of status.keys())if(!ledger.has(slug))drift.push(`\`${slug}\`: in STATUS Active plans, missing from the plans ledger`);
  for(const slug of folders)if(!ledger.has(slug)&&!status.has(slug))drift.push(`\`docs/plans/${slug}/\`: in neither index`);
  return drift;
}

export function lastUpdated(statusMarkdown){
  return /_Last updated:\s*(\d{4}-\d{2}-\d{2})/.exec(statusMarkdown)?.[1]??null;
}

/** The SHA STATUS.md's "Branch state" section claims `main` is at. */
export function claimedMainSha(statusMarkdown){
  const section=/##\s+Branch state\s*\n([\s\S]*?)(?=\n##\s)/.exec(statusMarkdown)?.[1]??'';
  return /`main`\s+at\s+`([0-9a-f]{7,40})`/.exec(section)?.[1]??null;
}

export function duplicateHeadings(markdown){
  const seen=new Map();
  for(const match of markdown.matchAll(/^(#{1,6}\s+.+?)\s*$/gm))seen.set(match[1],(seen.get(match[1])??0)+1);
  return [...seen].filter(([,count])=>count>1).map(([heading])=>heading);
}

export function uncheckedActions(statusMarkdown){
  return markdownItems(statusMarkdown)
    .filter((item)=>/^next actions$/i.test(item.section)&&/^[-*]\s+\[ \]/.test(item.text))
    .map((item)=>summarize(item.text.replace(/^[-*]\s+\[ \]\s*/,''),110));
}

export function journalHeadings(journalMarkdown,count=3){
  return [...journalMarkdown.matchAll(/^##\s+(.+?)\s*$/gm)].slice(0,count).map((match)=>match[1]);
}
