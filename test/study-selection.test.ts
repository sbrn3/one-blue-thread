import { describe, expect, it } from 'vitest';
import { visibleTermCues } from '../src/study/selection';

describe('study selection interaction',()=>{
  const cues=[{articleId:'Prayer',title:'Prayer',verse:3,start:0,end:6}];
  it('hides nested dictionary targets while selecting a passage',()=>{
    expect(visibleTermCues(cues,null)).toBe(cues);
    expect(visibleTermCues(cues,3)).toEqual([]);
  });
});
