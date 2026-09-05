import { Fragment } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { tokens } from '../ui/tokens';
import type { ResourceBlock, ResourceInline } from './types';

function Inline({ part, onOpenArticle }: { part:ResourceInline; onOpenArticle?:(id:string)=>void }) {
  if (typeof part === 'string') return <>{part}</>;
  if (part.t === 'em') return <Text style={styles.em}>{part.v}</Text>;
  if (part.t === 'ref') return <Text style={styles.reference}>{part.v}</Text>;
  // No documented 44pt alternate route to this specific article exists
  // from inside another article's body (unlike ScriptureZone's inline
  // terms, which always resolve via VerseContextSheet's Dictionary
  // chips) — promoted with an explicit accessibilityLabel. Text has no
  // typed `hitSlop` in this RN version, and wrapping it in a Pressable
  // would break the surrounding inline prose flow.
  return onOpenArticle ? (
    <Text accessibilityRole="link" accessibilityLabel={`Open dictionary article ${part.v}`} accessibilityHint="Opens another dictionary article" style={styles.link} onPress={()=>onOpenArticle(part.id)}>{part.v}</Text>
  ) : <Text style={styles.reference}>{part.v}</Text>;
}

export function ResourceText({ content, onOpenArticle }: { content:ResourceBlock[]; onOpenArticle?:(id:string)=>void }) {
  return <View style={styles.wrap}>{content.map((block,index) => {
    if (block.t === 'omit') return <Text key={index} style={styles.omit}>{block.c.map((part,i)=><Inline key={i} part={part}/>)}</Text>;
    const rendered=<Text style={[styles.body,block.t==='h'&&styles.heading]}>{block.c.map((part,i)=><Fragment key={i}><Inline part={part} onOpenArticle={onOpenArticle}/></Fragment>)}</Text>;
    if(block.t==='li')return <View key={index} style={styles.listItem}><Text style={styles.bullet}>{'\u2022'}</Text>{rendered}</View>;
    return <View key={index}>{rendered}</View>;
  })}</View>;
}

const styles = StyleSheet.create({
  wrap:{ gap:12 },
  body:{ fontFamily:tokens.font.display, fontSize:16, lineHeight:24, color:tokens.color.ink },
  heading:{ fontSize:17, fontWeight:'800' },
  em:{ fontStyle:'italic' },
  reference:{ color:tokens.color.ink60 },
  link:{ color:tokens.color.thread, textDecorationLine:'underline' },
  omit:{ fontFamily:tokens.font.display, fontSize:13, lineHeight:20, fontStyle:'italic', color:tokens.color.ink40 },
  listItem:{ flexDirection:'row', paddingRight:12 },
  bullet:{ fontFamily:tokens.font.display, fontSize:16, lineHeight:24, color:tokens.color.ink, marginRight:8 },
});
