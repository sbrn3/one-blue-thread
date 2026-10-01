import { useEffect, useState } from 'react';
import type { Cue, CueService } from './index';

/**
 * The current cue, kept in step with every other place that shows or edits it
 * (see CueService.subscribe). Reads the service, never holds its own copy.
 */
export function useCue(service: CueService): Cue | null {
  const [cue, setCue] = useState<Cue | null>(() => service.current());
  useEffect(() => {
    setCue(service.current()); // catch a save made between first render and subscribing
    return service.subscribe(setCue);
  }, [service]);
  return cue;
}
