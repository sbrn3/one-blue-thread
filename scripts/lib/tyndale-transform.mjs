import { XMLParser } from 'fast-xml-parser';

const BOOKS = {
  Gen:'genesis', Exod:'exodus', Ex:'exodus', Lev:'leviticus', Num:'numbers', Deut:'deuteronomy',
  Josh:'joshua', Judg:'judges', Ruth:'ruth', '1Sam':'1samuel', '2Sam':'2samuel', '1Kgs':'1kings',
  '2Kgs':'2kings', '1Chr':'1chronicles', '2Chr':'2chronicles', Ezra:'ezra', Neh:'nehemiah',
  Esth:'esther', Job:'job', Ps:'psalms', Pss:'psalms', Prov:'proverbs', Pr:'proverbs',
  Eccl:'ecclesiastes', Song:'songofsolomon', Isa:'isaiah', Jer:'jeremiah', Lam:'lamentations',
  Ezek:'ezekiel', Dan:'daniel', Hos:'hosea', Joel:'joel', Amos:'amos', Obad:'obadiah', Jonah:'jonah',
  Mic:'micah', Jon:'jonah', Nah:'nahum', Hab:'habakkuk', Zeph:'zephaniah', Hag:'haggai', Hagg:'haggai', Zech:'zechariah', Mal:'malachi',
  Matt:'matthew', Mark:'mark', Luke:'luke', John:'john', Acts:'acts', Rom:'romans', '1Cor':'1corinthians',
  '2Cor':'2corinthians', Gal:'galatians', Eph:'ephesians', Phil:'philippians', Col:'colossians',
  '1Thess':'1thessalonians', '2Thess':'2thessalonians', '1Thes':'1thessalonians', '2Thes':'2thessalonians', '1Tim':'1timothy', '2Tim':'2timothy',
  Titus:'titus', Phlm:'philemon', Heb:'hebrews', Jas:'james', '1Pet':'1peter', '2Pet':'2peter',
  '1Jn':'1john', '2Jn':'2john', '3Jn':'3john', Jude:'jude', Rev:'revelation',
};

export const CANONICAL_BOOKS = [...new Set(Object.values(BOOKS))];

export function normalizeSearch(value) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('en')
    .replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

export function parseReference(value) {
  const input = String(value ?? '').trim();
  const matches = [...input.matchAll(/([1-3]?[A-Za-z]+)\.(\d+)\.(\d+)(?:-((?:[1-3]?[A-Za-z]+\.)?\d+)(?:\.(\d+))?)?/g)];
  if (!matches.length) throw new Error(`Unparseable Scripture reference: ${input}`);
  let cursor=0;
  for(const match of matches){
    const gap=input.slice(cursor,match.index);
    if(!/^[\s,;]*$/.test(gap))throw new Error(`Unsupported Scripture reference syntax: ${input}`);
    cursor=(match.index??0)+match[0].length;
  }
  if(!/^[\s,;]*$/.test(input.slice(cursor)))throw new Error(`Unsupported Scripture reference syntax: ${input}`);
  return matches.map((m) => {
    const book = BOOKS[m[1]];
    if (!book) throw new Error(`Unknown Scripture book code ${m[1]} in ${input}`);
    const startChapter = Number(m[2]);
    const startVerse = Number(m[3]);
    let endChapter = startChapter;
    let endVerse = startVerse;
    if (m[4]) {
      const end = m[4];
      if (end.includes('.')) {
        const parts = end.split('.');
        if (parts.length === 2 && /^\d+$/.test(parts[0])) {
          endChapter = Number(parts[0]); endVerse = Number(m[5]);
        } else {
          const endBook = BOOKS[parts[0]];
          if (endBook !== book) throw new Error(`Cross-book reference is unsupported: ${input}`);
          endChapter = Number(parts[1]); endVerse = Number(m[5]);
        }
      } else if (m[5]) {
        endChapter = Number(end); endVerse = Number(m[5]);
      } else {
        endVerse = Number(end);
      }
    }
    return { book, startChapter, startVerse, endChapter, endVerse };
  });
}

const orderedParser = new XMLParser({ ignoreAttributes:false, attributeNamePrefix:'', textNodeName:'#text', trimValues:false, preserveOrder:true });
const tagOf = (node) => Object.keys(node ?? {}).find((key) => key !== ':@' && key !== '#text');
const childrenOf = (node) => { const tag=tagOf(node); return tag ? node[tag] : []; };
function textOf(node) {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (Object.hasOwn(node,'#text')) return String(node['#text']);
  return textOf(childrenOf(node));
}
function findElements(nodes, tag) {
  const found=[];
  for (const node of Array.isArray(nodes)?nodes:[]) {
    const own=tagOf(node); if(own===tag)found.push(node);
    found.push(...findElements(childrenOf(node),tag));
  }
  return found;
}

function cleanText(value) {
  return value.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').replace(/\s+([,.;:!?])/g, '$1').trim();
}

function inlineContent(nodes, emphasized = false) {
  const content=[];
  const appendText=(value) => {
    const normalized=String(value).replace(/\u00a0/g,' ').replace(/\s+/g,' ');
    if(!normalized)return;
    const last=content.at(-1);
    if(typeof last==='string')content[content.length-1]=last+normalized;
    else content.push(normalized);
  };
  for(const node of Array.isArray(nodes)?nodes:[]){
    if(Object.hasOwn(node,'#text')){appendText(node['#text']);continue;}
    const tag=tagOf(node); const children=childrenOf(node); const label=cleanText(textOf(children)); const attrs=node[':@']??{};
    if(tag==='a'&&attrs.href?.includes('bref=')){content.push({t:'ref',v:label,r:attrs.href.split('bref=')[1].split('&')[0]});continue;}
    if(tag==='a'&&attrs.href?.includes('_Article_TyndaleOpenBibleDictionary')){const raw=attrs.href.match(/[?&]item=([^&]+)/)?.[1];if(raw){content.push({t:'link',v:label,id:decodeURIComponent(raw).replace(/_Article_TyndaleOpenBibleDictionary$/,'')});continue;}}
    const isEmphasis=emphasized||['em','i','strong','b'].includes(tag)||String(attrs.class??'').match(/ital|bold|hebrew|greek/);
    if(isEmphasis&&label){content.push({t:'em',v:label});continue;}
    for(const child of inlineContent(children,isEmphasis)){if(typeof child==='string')appendText(child);else content.push(child);}
  }
  if(typeof content[0]==='string')content[0]=content[0].trimStart();
  if(typeof content.at(-1)==='string')content[content.length-1]=content.at(-1).trimEnd();
  return content.filter((part)=>typeof part!=='string'||part.length>0);
}

function bodyContent(bodyNode) {
  if (!bodyNode) return [];
  const blocks = [];
  const walk = (nodes) => {
    for (const node of Array.isArray(nodes)?nodes:[]) {
      const tag=tagOf(node);
      if (tag === 'include_items') {
        blocks.push({t:'omit',c:['Supplement omitted from this text-first edition.']});
      } else if (/^(p|li|h[1-6]|caption|td|th)$/.test(tag ?? '')) {
        const attrs=node[':@']??{}; const content=inlineContent(childrenOf(node));
        if(content.length)blocks.push({t:tag==='li'?'li':/^h/.test(tag)||String(attrs.class??'').includes('title')?'h':'p',c:content});
      } else walk(childrenOf(node));
    }
  };
  walk(childrenOf(bodyNode));
  if (!blocks.length) {
    const content=inlineContent(childrenOf(bodyNode));
    if(content.length)blocks.push({t:'p',c:content});
  }
  return blocks;
}

export function applyVersification(resource) {
  let note;
  const lookupRefs=resource.refs.map((ref)=>{
    if(ref.book==='3john'&&ref.endChapter===1&&ref.endVerse>14){note='Tyndale numbers the closing greeting as verse 15; WEB includes it in verse 14.';return {...ref,startVerse:Math.min(ref.startVerse,14),endVerse:14};}
    if(ref.book==='revelation'&&ref.startChapter===12&&ref.startVerse===18){note='Tyndale numbers this line as Revelation 12:18; WEB includes it at 13:1.';return {...ref,startChapter:13,startVerse:1,endChapter:ref.endChapter===12?13:ref.endChapter,endVerse:ref.endChapter===12?1:ref.endVerse};}
    if(ref.book==='romans'&&ref.endChapter===16&&ref.endVerse>24){note='Tyndale includes the Romans 16:25–27 doxology; this WEB edition ends at verse 24. The note is attached to the chapter ending.';return {...ref,startVerse:ref.startChapter===16?Math.min(ref.startVerse,24):ref.startVerse,endVerse:24};}
    return ref;
  });
  return note?{...resource,lookupRefs,versificationNote:note}:resource;
}

export function parseStudyXml(xml, expectedType) {
  const items = findElements(orderedParser.parse(xml),'item').filter((item) => item[':@']?.typename === expectedType);
  return items.map((item, sourceOrder) => {
    const name=item[':@']?.name; const refsNode=findElements(childrenOf(item),'refs')[0]; const titleNode=findElements(childrenOf(item),'title')[0]; const bodyNode=findElements(childrenOf(item),'body')[0];
    const refs = parseReference(textOf(childrenOf(refsNode)));
    const content = bodyContent(bodyNode);
    if (!content.length) throw new Error(`Empty ${expectedType} body: ${name}`);
    return applyVersification({ id:`${expectedType}:${name}`, type:expectedType, title:cleanText(textOf(childrenOf(titleNode))) || name, refs, content, sourceOrder });
  });
}

function aliasesFor(title) {
  const clean = title.replace(/\*/g, '').trim();
  const aliases = new Set([clean]);
  clean.split(/,|\bor\b|\//i).map((x) => x.trim()).filter((x) => x.length >= 3).forEach((x) => aliases.add(x));
  const noParen = clean.replace(/\s*\([^)]*\)\s*/g, ' ').trim();
  if (noParen.length >= 3) aliases.add(noParen);
  return [...aliases];
}

export function parseDictionaryXml(xml) {
  const items = findElements(orderedParser.parse(xml),'item').filter((item) => item[':@']?.typename === 'Article');
  return items.map((item) => {
    const name=item[':@']?.name; const titleNode=findElements(childrenOf(item),'title')[0]; const bodyNode=findElements(childrenOf(item),'body')[0];
    const title = cleanText(textOf(childrenOf(titleNode))) || name;
    const content = bodyContent(bodyNode);
    if (!content.length) throw new Error(`Empty dictionary body: ${name}`);
    return { id:name, title, aliases:aliasesFor(title), content };
  });
}

export function stableJson(value) { return `${JSON.stringify(value)}\n`; }
