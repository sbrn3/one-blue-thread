import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, findNodeHandle, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import type { Passage } from '../log/types';
import { bookName } from '../text/canon';
import { tokens } from '../ui/tokens';
import { ResourceText } from './ResourceText';
import { STUDY_ATTRIBUTION } from './provider';
import type { DictionaryArticle, StudyResource, VerseLookup } from './types';

interface Props {
  verse: VerseLookup | null; resources: StudyResource[]; bookResources: StudyResource[];
  related: DictionaryArticle[]; activeArticle?: DictionaryArticle | null; remembered: Passage[];
  preview?: { start:number; end:number } | null; onClose:()=>void; onRememberVerse:()=>void;
  onSelectPassage:()=>void; onConfirmRange:()=>void; onRemove:(passage:Passage)=>void;
  onOpenArticle:(article:DictionaryArticle)=>void;
}

const labels:Record<StudyResource['type'],string>={StudyNote:'Study note',ThemeNote:'Theme',Profile:'Profile',BookIntroSummary:'Book summary',BookIntro:'Book introduction'};

export function VerseContextSheet(props:Props) {
  const reducedMotion=useReducedMotion();
  const sheetRef=useRef<View>(null);
  const {verse,resources,related,remembered,preview,activeArticle}=props;
  const [showBook,setShowBook]=useState(false);
  useEffect(()=>setShowBook(false),[verse?.book,verse?.chapter,verse?.verse]);
  return <Modal visible={verse!==null} transparent animationType={reducedMotion?'none':'slide'} onShow={()=>{const handle=findNodeHandle(sheetRef.current);if(handle)AccessibilityInfo.setAccessibilityFocus(handle);}} onRequestClose={props.onClose}>
    <View style={styles.backdrop}><View ref={sheetRef} accessible accessibilityLabel="Study context" style={styles.sheet} accessibilityViewIsModal>
      <View style={styles.head}>
        <Text accessibilityRole="header" style={styles.title}>{verse?`${bookName(verse.book)} ${verse.chapter}:${preview?`${preview.start}–${preview.end}`:verse.verse}`:''}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Close study context" style={styles.control} onPress={props.onClose}><Text style={styles.controlText}>Close</Text></Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {activeArticle ? <View style={styles.resource}><Text style={styles.kicker}>Bible dictionary</Text><Text accessibilityRole="header" style={styles.resourceTitle}>{activeArticle.title}</Text><ResourceText content={activeArticle.content}/></View>
        : preview ? <View style={styles.preview}><Text style={styles.section}>Remember this passage?</Text><Text style={styles.muted}>The range is saved only after confirmation.</Text><Pressable accessibilityRole="button" accessibilityLabel="Remember selected passage" style={styles.primary} onPress={props.onConfirmRange}><Text style={styles.primaryText}>Remember verses {preview.start}–{preview.end}</Text></Pressable></View>
        : <>
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" accessibilityLabel="Remember this verse" style={styles.primary} onPress={props.onRememberVerse}><Text style={styles.primaryText}>Remember this verse</Text></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Select a passage range" style={styles.secondary} onPress={props.onSelectPassage}><Text style={styles.secondaryText}>Select a passage</Text></Pressable>
          </View>
          {remembered.map((passage)=><View key={passage.id} style={styles.remembered}><Text style={styles.muted}>Remembered: verses {passage.verse_start}–{passage.verse_end}</Text><Pressable accessibilityRole="button" accessibilityLabel="Remove this remembered passage" style={styles.control} onPress={()=>props.onRemove(passage)}><Text style={styles.controlText}>Remove</Text></Pressable></View>)}
          <Text style={styles.section}>Study</Text>
          {resources.length?resources.map((resource)=><View key={resource.id} style={styles.resource}><Text style={styles.kicker}>{labels[resource.type]}</Text><Text accessibilityRole="header" style={styles.resourceTitle}>{resource.title}</Text>{resource.versificationNote?<Text style={styles.muted}>{resource.versificationNote}</Text>:null}<ResourceText content={resource.content}/></View>):<Text style={styles.muted}>No Tyndale study resource is linked to this verse.</Text>}
          <Pressable accessibilityRole="button" accessibilityLabel={showBook?'Hide book introduction':'Show book introduction'} style={styles.secondary} onPress={()=>setShowBook((value)=>!value)}><Text style={styles.secondaryText}>{showBook?'Hide book introduction':'About this book'}</Text></Pressable>
          {showBook?props.bookResources.map((resource)=><View key={resource.id} style={styles.resource}><Text style={styles.kicker}>{labels[resource.type]}</Text><Text accessibilityRole="header" style={styles.resourceTitle}>{resource.title}</Text><ResourceText content={resource.content}/></View>):null}
          <Text style={styles.section}>Dictionary</Text>
          {related.length?<View style={styles.chips}>{related.map((article)=><Pressable accessibilityRole="button" accessibilityLabel={`Open dictionary article ${article.title}`} key={article.id} style={styles.chip} onPress={()=>props.onOpenArticle(article)}><Text style={styles.chipText}>{article.title}</Text></Pressable>)}</View>:<Text style={styles.muted}>No exact dictionary term is linked to this verse.</Text>}
        </>}
        <Text style={styles.attribution}>{STUDY_ATTRIBUTION}</Text>
      </ScrollView>
    </View></View>
  </Modal>;
}

const styles=StyleSheet.create({
  backdrop:{flex:1,backgroundColor:'rgba(22, 22, 26, 0.4)',justifyContent:'flex-end'},sheet:{backgroundColor:tokens.color.paper,borderTopLeftRadius:20,borderTopRightRadius:20,maxHeight:'88%',borderTopWidth:1,borderColor:tokens.color.ink15},head:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:24,paddingVertical:12,borderBottomWidth:1,borderColor:tokens.color.ink15},title:{fontFamily:tokens.font.display,fontSize:20,fontWeight:'800',color:tokens.color.ink},control:{minHeight:44,minWidth:44,justifyContent:'center',alignItems:'center'},controlText:{fontFamily:tokens.font.display,color:tokens.color.thread,fontWeight:'700'},content:{padding:24,gap:16},actions:{gap:10},primary:{minHeight:48,borderRadius:12,backgroundColor:tokens.color.thread,alignItems:'center',justifyContent:'center',paddingHorizontal:16},primaryText:{fontFamily:tokens.font.display,color:'#fff',fontWeight:'800'},secondary:{minHeight:48,borderRadius:12,borderWidth:1,borderColor:tokens.color.ink15,alignItems:'center',justifyContent:'center'},secondaryText:{fontFamily:tokens.font.display,color:tokens.color.ink,fontWeight:'700'},section:{fontFamily:tokens.font.mono,fontSize:11,letterSpacing:1.5,textTransform:'uppercase',color:tokens.color.ink40,marginTop:6},muted:{fontFamily:tokens.font.display,fontSize:14,lineHeight:20,color:tokens.color.ink60},resource:{gap:8,borderTopWidth:1,borderColor:tokens.color.ink15,paddingTop:14},kicker:{fontFamily:tokens.font.mono,fontSize:10,textTransform:'uppercase',color:tokens.color.thread},resourceTitle:{fontFamily:tokens.font.display,fontSize:18,fontWeight:'800',color:tokens.color.ink},chips:{flexDirection:'row',flexWrap:'wrap',gap:8},chip:{minHeight:44,justifyContent:'center',borderWidth:1,borderStyle:'dotted',borderColor:tokens.color.thread,borderRadius:12,paddingHorizontal:14},chipText:{fontFamily:tokens.font.display,color:tokens.color.thread,fontWeight:'700'},remembered:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',backgroundColor:tokens.color.ink15,borderRadius:12,paddingLeft:12},preview:{gap:12},attribution:{fontFamily:tokens.font.mono,fontSize:10,lineHeight:16,color:tokens.color.ink40,marginTop:12},
});
