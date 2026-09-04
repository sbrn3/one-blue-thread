import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import AdmZip from 'adm-zip';
import { fileURLToPath } from 'node:url';
import { CANONICAL_BOOKS, normalizeSearch, parseDictionaryXml, parseStudyXml, stableJson } from './lib/tyndale-transform.mjs';

const EXPECTED = {
  notes:'7B4D5AE088449D5A6925170C4B89B978ACEE2F78F73DC6B8A278FA948A7E8498',
  dictionary:'10758EA00DBEA7540F9337E43E59C8E4000295C1261E3426BAB6F31C31DCFF5B',
};
const argv = process.argv.slice(2);
const arg = (name) => { const i=argv.indexOf(name); return i >= 0 ? argv[i+1] : null; };
const notesZip = arg('--notes');
const dictionaryZip = arg('--dictionary');
if (!notesZip || !dictionaryZip) throw new Error('Usage: node scripts/build-tyndale.mjs --notes <notes.zip> --dictionary <dictionary.zip>');
const sha = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
if (sha(notesZip) !== EXPECTED.notes) throw new Error('Study Notes archive checksum differs from the reviewed release');
if (sha(dictionaryZip) !== EXPECTED.dictionary) throw new Error('Dictionary archive checksum differs from the reviewed release');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'assets', 'tyndale');
fs.rmSync(out, { recursive:true, force:true });
const generated=path.join(root,'src','study','generated');
fs.rmSync(generated,{recursive:true,force:true});
fs.mkdirSync(path.join(root,'src','study'), { recursive:true });
fs.mkdirSync(path.join(generated,'study'),{recursive:true});
fs.mkdirSync(path.join(generated,'dictionary'),{recursive:true});
fs.mkdirSync(path.join(out,'study'), { recursive:true });
fs.mkdirSync(path.join(out,'dictionary'), { recursive:true });
const notes = new AdmZip(notesZip);
const dict = new AdmZip(dictionaryZip);
const readEntry = (zip, suffix) => {
  const entry = zip.getEntries().find((x) => x.entryName.replace(/\\/g,'/').endsWith(suffix));
  if (!entry) throw new Error(`Missing archive entry: ${suffix}`);
  return entry.getData().toString('utf8');
};
const resources = [
  ...parseStudyXml(readEntry(notes,'StudyNotes.xml'),'StudyNote'),
  ...parseStudyXml(readEntry(notes,'ThemeNotes.xml'),'ThemeNote'),
  ...parseStudyXml(readEntry(notes,'Profiles.xml'),'Profile'),
  ...parseStudyXml(readEntry(notes,'BookIntroSummaries.xml'),'BookIntroSummary'),
  ...parseStudyXml(readEntry(notes,'BookIntros.xml'),'BookIntro'),
];
const byBook = Object.fromEntries(CANONICAL_BOOKS.map((book) => [book, []]));
for (const resource of resources) {
  const books = new Set(resource.refs.map((ref) => ref.book));
  for (const book of books) byBook[book].push(resource);
}
const writePacked=(file,value)=>fs.writeFileSync(file,`module.exports=${JSON.stringify(zlib.gzipSync(Buffer.from(stableJson(value)),{level:9}).toString('base64'))};\n`);
for (const [book, records] of Object.entries(byBook)) {
  fs.writeFileSync(path.join(out,'study',`${book}.json`), stableJson(records));
  writePacked(path.join(generated,'study',`${book}.js`),records);
}

const articles = dict.getEntries().filter((x) => /Articles\/[A-Z]+\.xml$/i.test(x.entryName.replace(/\\/g,'/')))
  .flatMap((entry) => parseDictionaryXml(entry.getData().toString('utf8')));
const seen = new Set();
for (const article of articles) { if (seen.has(article.id)) throw new Error(`Duplicate dictionary id: ${article.id}`); seen.add(article.id); }
const byLetter = {};
const index = [];
for (const article of articles) {
  const normalized = normalizeSearch(article.title);
  const letter = /^[a-z]/.test(normalized) ? normalized[0].toUpperCase() : 'OTHER';
  (byLetter[letter] ??= []).push(article);
  index.push({ id:article.id, title:article.title, aliases:article.aliases, normalized, normalizedAliases:article.aliases.map(normalizeSearch), letter });
}
for (const [letter, records] of Object.entries(byLetter)) {
  fs.writeFileSync(path.join(out,'dictionary',`${letter}.json`), stableJson(records));
  writePacked(path.join(generated,'dictionary',`${letter}.js`),records);
}
const compareText=(a,b)=>a<b?-1:a>b?1:0;
index.sort((a,b) => compareText(a.normalized,b.normalized) || compareText(a.id,b.id));
fs.writeFileSync(path.join(out,'dictionary-index.json'), stableJson(index));
writePacked(path.join(generated,'dictionary-index.js'),index);
fs.writeFileSync(path.join(out,'LICENSE.md'), `# Tyndale Open Resources\n\nTyndale Open Study Notes. Copyright (C) 2022 by Tyndale House Publishers.\n\nAdapted from Tyndale Open Study Notes. The original work by Tyndale House Publishers is available for free at http://www.tyndaleopenresources.com.\n\nTyndale Open Bible Dictionary. Copyright (C) 2023 by Tyndale House Publishers.\n\nAdapted from Tyndale Open Bible Dictionary. The original work by Tyndale House Publishers is available for free at http://www.tyndaleopenresources.com.\n\nLicensed under CC BY-SA 4.0: https://creativecommons.org/licenses/by-sa/4.0/\n\nChanges: XML markup was converted to compact JSON; references and searchable titles were normalized; maps, pictures, charts and supplemental textboxes were omitted. The transformed resource data in this directory is offered under CC BY-SA 4.0.\n`);

const bookLines = CANONICAL_BOOKS.map((book) => `  ${JSON.stringify(book)}: () => decode<StudyResource[]>(require('./generated/study/${book}.js')),`).join('\n');
const letters = Object.keys(byLetter).sort();
const letterLines = letters.map((letter) => `  ${JSON.stringify(letter)}: () => decode<DictionaryArticle[]>(require('./generated/dictionary/${letter}.js')),`).join('\n');
fs.writeFileSync(path.join(root,'src','study','assets.generated.ts'), `// Generated by scripts/build-tyndale.mjs — do not edit.\nimport type { DictionaryArticle, StudyResource } from './types';\nexport const studyAssets: Record<string, () => StudyResource[]> = {\n${bookLines}\n};\nexport const dictionaryAssets: Record<string, () => DictionaryArticle[]> = {\n${letterLines}\n};\n`);
const generatedRegistry=path.join(root,'src','study','assets.generated.ts');
fs.appendFileSync(generatedRegistry,`import { decode } from './packed';\nimport type { DictionaryIndexEntry } from './types';\nexport const dictionaryIndex=decode<DictionaryIndexEntry[]>(require('./generated/dictionary-index.js'));\n`);
const assetFiles=[
  ...fs.readdirSync(path.join(out,'study')).map((file)=>`study/${file}`),
  ...fs.readdirSync(path.join(out,'dictionary')).map((file)=>`dictionary/${file}`),
  'dictionary-index.json','LICENSE.md',
].sort(compareText);
const fileHashes=Object.fromEntries(assetFiles.map((relative)=>[relative,sha(path.join(out,relative))]));
fileHashes['src/study/assets.generated.ts']=sha(generatedRegistry);
for(const file of fs.readdirSync(path.join(generated,'study')))fileHashes[`src/study/generated/study/${file}`]=sha(path.join(generated,'study',file));
for(const file of fs.readdirSync(path.join(generated,'dictionary')))fileHashes[`src/study/generated/dictionary/${file}`]=sha(path.join(generated,'dictionary',file));
fileHashes['src/study/generated/dictionary-index.js']=sha(path.join(generated,'dictionary-index.js'));
const manifest = { source:{ notes:{release:'1.25',sha256:EXPECTED.notes}, dictionary:{release:'1.6',sha256:EXPECTED.dictionary} }, counts:{resources:resources.length,articles:articles.length}, books:Object.fromEntries(Object.entries(byBook).map(([k,v])=>[k,v.length])), letters:Object.fromEntries(Object.entries(byLetter).map(([k,v])=>[k,v.length])), files:fileHashes };
fs.writeFileSync(path.join(out,'manifest.json'), stableJson(manifest));
console.log(JSON.stringify(manifest.counts));
