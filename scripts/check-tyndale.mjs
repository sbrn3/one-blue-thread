import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dir=path.join(root,'assets','tyndale');
const read=(file)=>JSON.parse(fs.readFileSync(file,'utf8'));
const sha=(file)=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const manifest=read(path.join(dir,'manifest.json'));
const index=read(path.join(dir,'dictionary-index.json'));
const bible=read(path.join(root,'assets','bible','web.json')).books;
const studyFiles=fs.readdirSync(path.join(dir,'study')).filter((name)=>name.endsWith('.json')).sort();
const dictionaryFiles=fs.readdirSync(path.join(dir,'dictionary')).filter((name)=>name.endsWith('.json')).sort();
const fail=(message)=>{throw new Error(message);};
const validContent=(content)=>Array.isArray(content)&&content.length>0&&content.every((block)=>['p','h','li','omit'].includes(block.t)&&Array.isArray(block.c)&&block.c.length>0);
const linksIn=(content)=>content.flatMap((block)=>block.c.filter((part)=>typeof part==='object'&&part?.t==='link').map((part)=>part.id));
const refValid=(ref)=>Number.isInteger(ref.startChapter)&&Number.isInteger(ref.startVerse)&&Number.isInteger(ref.endChapter)&&Number.isInteger(ref.endVerse)&&ref.startChapter>0&&ref.startVerse>0&&(ref.endChapter>ref.startChapter||(ref.endChapter===ref.startChapter&&ref.endVerse>=ref.startVerse));
const webRefValid=(ref)=>refValid(ref)&&Boolean(bible[ref.book]?.[ref.startChapter-1]?.some((verse)=>verse.v===ref.startVerse))&&Boolean(bible[ref.book]?.[ref.endChapter-1]?.some((verse)=>verse.v===ref.endVerse));
const packedText=(file)=>{
  const source=fs.readFileSync(file,'utf8').trim();
  if(!source.startsWith('module.exports=')||!source.endsWith(';'))fail(`Invalid packed module: ${file}`);
  const encoded=JSON.parse(source.slice('module.exports='.length,-1));
  return zlib.gunzipSync(Buffer.from(encoded,'base64')).toString('utf8');
};

if(studyFiles.length!==66)fail(`Expected 66 study partitions, found ${studyFiles.length}`);
if(studyFiles.length!==Object.keys(manifest.books).length)fail('Study partition manifest mismatch');
if(dictionaryFiles.length!==Object.keys(manifest.letters).length)fail('Dictionary partition manifest mismatch');

let resourceCount=0;
for(const file of studyFiles){
  const book=file.replace(/\.json$/,''); const rows=read(path.join(dir,'study',file)); const ids=new Set();
  if(packedText(path.join(root,'src','study','generated','study',`${book}.js`))!==fs.readFileSync(path.join(dir,'study',file),'utf8'))fail(`Packed study mismatch for ${book}`);
  if(rows.length!==manifest.books[book])fail(`Study count mismatch for ${book}`);
  resourceCount+=rows.length;
  for(const row of rows){
    if(!row.id||ids.has(row.id)||!row.refs?.length||!validContent(row.content))fail(`Invalid or duplicate resource in ${file}: ${row.id}`);
    ids.add(row.id);
    if(!row.refs.some((ref)=>ref.book===book)||row.refs.some((ref)=>!refValid(ref)))fail(`Invalid source reference in ${row.id}`);
    const lookup=row.lookupRefs??row.refs;
    if(lookup.some((ref)=>!webRefValid(ref)))fail(`Reference outside bundled WEB in ${row.id}`);
    if(row.lookupRefs&&(!row.versificationNote||JSON.stringify(row.lookupRefs)===JSON.stringify(row.refs)))fail(`Unexplained versification mapping in ${row.id}`);
  }
}

const articles=[]; const articleIds=new Set();
for(const file of dictionaryFiles){
  const letter=file.replace(/\.json$/,''); const rows=read(path.join(dir,'dictionary',file));
  if(packedText(path.join(root,'src','study','generated','dictionary',`${letter}.js`))!==fs.readFileSync(path.join(dir,'dictionary',file),'utf8'))fail(`Packed dictionary mismatch for ${letter}`);
  if(rows.length!==manifest.letters[letter])fail(`Dictionary count mismatch for ${letter}`);
  for(const row of rows){if(!row.id||articleIds.has(row.id)||!validContent(row.content))fail(`Invalid or duplicate dictionary article ${row.id}`);articleIds.add(row.id);articles.push(row);}
}
for(const article of articles)for(const target of linksIn(article.content))if(!articleIds.has(target))fail(`Broken dictionary link ${article.id} -> ${target}`);
if(resourceCount!==manifest.counts.resources)fail(`Resource count ${resourceCount} != ${manifest.counts.resources}`);
if(articleIds.size!==manifest.counts.articles||index.length!==articleIds.size)fail('Dictionary manifest/index mismatch');
if(index.some((row)=>!articleIds.has(row.id)||!Array.isArray(row.normalizedAliases)||row.normalizedAliases.length!==row.aliases.length))fail('Invalid dictionary index row');
if(packedText(path.join(root,'src','study','generated','dictionary-index.js'))!==fs.readFileSync(path.join(dir,'dictionary-index.json'),'utf8'))fail('Packed dictionary index mismatch');

for(const [relative,expected] of Object.entries(manifest.files)){
  const file=relative.startsWith('src/')?path.join(root,relative):path.join(dir,relative);
  if(!fs.existsSync(file)||sha(file)!==expected)fail(`Hash mismatch: ${relative}`);
}
const license=fs.readFileSync(path.join(dir,'LICENSE.md'),'utf8');
for(const exact of ['Adapted from Tyndale Open Study Notes. The original work by Tyndale House Publishers is available for free at http://www.tyndaleopenresources.com.','Adapted from Tyndale Open Bible Dictionary. The original work by Tyndale House Publishers is available for free at http://www.tyndaleopenresources.com.','https://creativecommons.org/licenses/by-sa/4.0/'])if(!license.includes(exact))fail(`Missing required notice: ${exact}`);
console.log(`Tyndale assets OK: ${resourceCount} resources, ${articleIds.size} articles, ${studyFiles.length} books`);
