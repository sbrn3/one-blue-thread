// Deterministic fact sheet for /catch-me-up: git state across every worktree, open
// issues/PRs, CI on main, and doc drift in STATUS.md / ROADMAP.md / the plans ledger.
// Read-only apart from `git fetch`. Usage: node scripts/catch-me-up.mjs [--no-fetch]

import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  claimedMainSha, duplicateHeadings, journalHeadings, lastUpdated, ledgerPlans, markdownItems,
  planDrift, referencesIn, staleOpenItems, statusPlans, summarize, uncheckedActions,
} from './lib/catch-me-up-parse.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const fetchRemote=!process.argv.includes('--no-fetch');
const GH_FALLBACK='C:\\Program Files\\GitHub CLI\\gh.exe';

const run=(cmd,args,cwd=root)=>new Promise((resolve)=>{
  execFile(cmd,args,{cwd,maxBuffer:16*1024*1024,windowsHide:true},(error,stdout,stderr)=>{
    resolve({ok:!error,code:error?.code,out:String(stdout).trim(),err:String(stderr||error?.message||'').trim()});
  });
});
const git=(args,cwd)=>run('git',args,cwd);
let ghCommand='gh';
const gh=async(args)=>{
  let result=await run(ghCommand,args);
  if(result.code==='ENOENT'&&ghCommand==='gh'&&fs.existsSync(GH_FALLBACK)){ghCommand=GH_FALLBACK;result=await run(ghCommand,args);}
  return result;
};
const ghJson=async(args)=>{
  const result=await gh(args);
  if(!result.ok)return {error:result.err.split('\n')[0]||'gh failed'};
  try{return {data:JSON.parse(result.out)};}catch{return {error:'gh returned non-JSON output'};}
};
const read=(file)=>{try{return fs.readFileSync(path.join(root,file),'utf8');}catch{return '';}};
const counts=(out)=>{const [a,b]=out.split(/\s+/).map(Number);return {left:a||0,right:b||0};};

// Network work in parallel: fetch alongside every gh query.
const [fetched,openIssues,allPrs,allIssues,ciRuns]=await Promise.all([
  fetchRemote?git(['fetch','origin','--quiet']):Promise.resolve({ok:true,skipped:true}),
  ghJson(['issue','list','--state','open','--limit','50','--json','number,title,labels,body']),
  ghJson(['pr','list','--state','all','--limit','100','--json','number,state,title,headRefName,isDraft']),
  ghJson(['issue','list','--state','all','--limit','300','--json','number,state']),
  ghJson(['run','list','--branch','main','--limit','4','--json','workflowName,status,conclusion,displayTitle,createdAt']),
]);

// Git state, all read-only and in parallel.
const worktreeList=await git(['worktree','list','--porcelain']);
const worktrees=worktreeList.out.split(/\r?\n\r?\n/).filter(Boolean).map((block)=>({
  path:/^worktree (.+)$/m.exec(block)?.[1]??'?',
  sha:/^HEAD ([0-9a-f]+)$/m.exec(block)?.[1]?.slice(0,7)??'?',
  branch:/^branch refs\/heads\/(.+)$/m.exec(block)?.[1]??(/^detached$/m.test(block)?'(detached)':'?'),
}));
const here=path.resolve(root).toLowerCase();
await Promise.all(worktrees.map(async(tree)=>{
  const [status,divergence]=await Promise.all([
    git(['status','--porcelain'],tree.path),
    git(['rev-list','--left-right','--count','origin/main...HEAD'],tree.path),
  ]);
  tree.dirty=status.ok?status.out.split(/\r?\n/).filter(Boolean).length:null;
  tree.divergence=divergence.ok?counts(divergence.out):null;
  tree.current=path.resolve(tree.path).toLowerCase()===here;
}));
const [localMain,mainLog,mainDate,mainSha]=await Promise.all([
  git(['rev-list','--left-right','--count','main...origin/main']),
  git(['log','--oneline','-6','origin/main']),
  git(['log','-1','--format=%cs','origin/main']),
  git(['rev-parse','--short','origin/main']),
]);

// Doc drift.
const docs={status:read('STATUS.md'),roadmap:read('ROADMAP.md'),journal:read('JOURNAL.md'),ledger:read('docs/plans/README.md')};
const prs=new Map((allPrs.data??[]).map((pr)=>[pr.number,pr]));
const issues=new Map((allIssues.data??[]).map((issue)=>[issue.number,issue.state]));
const mergedBranches=new Set((allPrs.data??[]).filter((pr)=>pr.state==='MERGED').map((pr)=>pr.headRefName));
const openItems={
  'STATUS.md':markdownItems(docs.status),
  'ROADMAP.md':markdownItems(docs.roadmap),
  'docs/plans/README.md':markdownItems(docs.ledger),
};
const shas=new Set(Object.values(openItems).flat().flatMap((item)=>referencesIn(item.text).shas));
const onMain=new Set();
await Promise.all([...shas].map(async(sha)=>{
  if((await git(['merge-base','--is-ancestor',sha,'origin/main'])).ok)onMain.add(sha);
}));
const stale=Object.entries(openItems).flatMap(([file,items])=>
  staleOpenItems(items,{prs,issues,mergedBranches,shaOnMain:(sha)=>onMain.has(sha)}).map((finding)=>({file,...finding})));
const planFolders=(()=>{try{return fs.readdirSync(path.join(root,'docs','plans'),{withFileTypes:true}).filter((entry)=>entry.isDirectory()).map((entry)=>entry.name);}catch{return [];}})();

// Output.
const lines=[];
const out=(line='')=>lines.push(line);
const flags=[];

if(fetched.skipped)flags.push('`git fetch` skipped (--no-fetch) — remote state may be stale');
else if(!fetched.ok)flags.push(`\`git fetch\` failed — remote state may be stale: ${fetched.err.split('\n')[0]}`);
if(localMain.ok){
  const {left:ahead,right:behind}=counts(localMain.out);
  if(behind)flags.push(`local \`main\` is **${behind} behind** \`origin/main\` — offer \`git pull --ff-only\` in whichever worktree holds \`main\`, or branch from \`origin/main\``);
  if(ahead)flags.push(`local \`main\` has **${ahead} unpushed** commit(s)`);
}
for(const tree of worktrees){
  if(!tree.dirty)continue;
  flags.push(tree.current
    ?`this worktree has **${tree.dirty} uncommitted/untracked** path(s)`
    :`worktree \`${path.basename(tree.path)}\` has **${tree.dirty} uncommitted/untracked** path(s) — possibly another session's; don't touch without asking`);
}

const current=worktrees.find((tree)=>tree.current);
out(`# Catch-me-up facts — ${new Date().toISOString().slice(0,16).replace('T',' ')} UTC`);
out();
out('## Flags');
out(flags.length?flags.map((flag)=>`- ${flag}`).join('\n'):'- none');
out();
out('## Git');
if(current)out(`- This worktree: \`${current.branch}\` at \`${current.sha}\` — ${current.divergence?`${current.divergence.right} ahead / ${current.divergence.left} behind origin/main`:'divergence unknown'}`);
out(`- \`origin/main\` at \`${mainSha.out||'?'}\`, last commit ${mainDate.out||'?'}`);
out();
out('| Worktree | Branch | vs origin/main | Dirty | Note |');
out('|---|---|---|---|---|');
for(const tree of worktrees){
  const d=tree.divergence;
  const pr=[...prs.values()].find((candidate)=>candidate.headRefName===tree.branch);
  const note=[
    tree.current?'this session':'',
    pr?`PR #${pr.number} ${pr.state.toLowerCase()}`:'',
    d&&d.right===0&&tree.branch!=='main'?'no commits beyond main':'',
  ].filter(Boolean).join('; ');
  out(`| ${path.basename(tree.path)} | \`${tree.branch}\` | ${d?`+${d.right} / −${d.left}`:'?'} | ${tree.dirty??'?'} | ${note} |`);
}
out();
out('Recent `origin/main`:');
out(mainLog.out.split(/\r?\n/).filter(Boolean).map((line)=>`- ${line}`).join('\n')||'- unavailable');
out();
out('## CI on main');
if(ciRuns.error)out(`- unavailable: ${ciRuns.error}`);
else{
  const latest=new Map();
  for(const ci of ciRuns.data)if(!latest.has(ci.workflowName))latest.set(ci.workflowName,ci);
  out([...latest.values()].map((ci)=>`- ${ci.workflowName}: ${ci.conclusion||ci.status} — ${summarize(ci.displayTitle,70)} (${ci.createdAt.slice(0,10)})`).join('\n')||'- no runs');
}
out();
out('## Open PRs');
if(allPrs.error)out(`- unavailable: ${allPrs.error}`);
else{
  const open=allPrs.data.filter((pr)=>pr.state==='OPEN');
  out(open.length?open.map((pr)=>`- #${pr.number} ${pr.title} — \`${pr.headRefName}\`${pr.isDraft?' (draft)':''}`).join('\n'):'- none');
}
out();
out('## Open issues');
if(openIssues.error)out(`- unavailable: ${openIssues.error}`);
else out(openIssues.data.length?openIssues.data.map((issue)=>{
  const labels=issue.labels.map((label)=>label.name).join(', ');
  const body=summarize(issue.body||'(no body)',200);
  return `- #${issue.number} ${issue.title} [${labels||'no labels'}] — ${body}`;
}).join('\n'):'- none');
out();
out('## Doc drift');
const drift=[];
const updated=lastUpdated(docs.status);
if(!updated)drift.push('STATUS.md has no "_Last updated:" line');
else if(mainDate.out&&updated<mainDate.out)drift.push(`STATUS.md last updated ${updated}; \`origin/main\` has commits from ${mainDate.out}`);
const claimed=claimedMainSha(docs.status);
if(claimed&&mainSha.out&&!mainSha.out.startsWith(claimed.slice(0,7))&&!claimed.startsWith(mainSha.out)){
  const behind=await git(['rev-list','--count',`${claimed}..origin/main`]);
  drift.push(`STATUS.md "Branch state" says \`main\` at \`${claimed}\`; \`origin/main\` is \`${mainSha.out}\`${behind.ok?` (${behind.out} commits later)`:''}`);
}
for(const finding of stale)drift.push(`${finding.file}:${finding.line} ${finding.marker} ${finding.summary} — **${finding.evidence.join(', ')}**`);
for(const line of planDrift(statusPlans(docs.status),ledgerPlans(docs.ledger),planFolders))drift.push(`plans: ${line}`);
for(const heading of duplicateHeadings(docs.roadmap))drift.push(`ROADMAP.md repeats the heading \`${heading}\``);
if(allPrs.error||allIssues.error)drift.push('issue/PR state unavailable — merged/closed references were not checked');
out(drift.length?drift.map((line)=>`- ${line}`).join('\n'):'- none detected');
out();
out('## STATUS next actions (unchecked)');
const actions=uncheckedActions(docs.status);
out(actions.length?actions.map((action)=>`- ${action}`).join('\n'):'- none');
out();
out('## Latest journal entries');
out(journalHeadings(docs.journal).map((heading)=>`- ${heading}`).join('\n')||'- none');

console.log(lines.join('\n'));
