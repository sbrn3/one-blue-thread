import { useState } from 'react';
import { Linking, StyleSheet, Text } from 'react-native';
import type { SupportSummary } from '../lab/diagnostics';
import { needsAttention } from '../lab/diagnostics';
import { getProfile } from '../lab/profile';
import type { Log } from '../log/log';
import type { SqlDb } from '../log/db';
import { BUILD_SHA } from '../log/buildSha';
import { meta } from '../log/log';
import type { Services } from '../services';
import { DictionaryLibrary } from '../study/DictionaryLibrary';
import { ActionButton } from '../ui/controls';
import { tokens } from '../ui/tokens';
import { AdaptiveSection } from './AdaptiveSection';
import { BackupSection } from './BackupSection';
import { BrandOrigin } from '../brand/BrandOrigin';
import { DiagnosticsSection } from './DiagnosticsSection';
import { DisclosureSection } from './DisclosureSection';
import type { HistoryEntry } from './history';
import { issueUrl } from './issueLink';
import { PartnerSection } from './PartnerSection';
import { ResetSection } from './ResetSection';
import { SealModeSection } from './SealModeSection';
import { TranslationSection, translationName } from './TranslationSection';

export type MoreSectionKey =
  | 'translation'
  | 'safekeeping'
  | 'reset'
  | 'partner'
  | 'seal'
  | 'adaptive'
  | 'origin'
  | 'study'
  | 'support';

interface MoreSectionProps {
  services: Services;
  db: SqlDb;
  log: Log;
  today: string;
  openSections: Record<MoreSectionKey, boolean>;
  onToggle: (key: MoreSectionKey) => void;
  supportSummary: SupportSummary | null;
  /** Called after the reader switches translation, so the app rebuilds its services (App.tsx). */
  onTranslationChanged: () => void;
  /** Same expression Knot.tsx used to pass DictionaryLibrary before the split. */
  viewingEntry: HistoryEntry | null;
  /** Passed straight through to ResetSection — see SealZone's onScrollLock. */
  onScrollLock: (locked: boolean) => void;
}

/**
 * docs/plans/knot-opener-icon — the rare tier's three groups, ordered by how
 * often a reader reaches for them: Preferences (how the app behaves), Your
 * data, About. Nothing is ever promoted out of its group or opened for the
 * reader: only Support carries a "Needs attention" marker, and backup state
 * never raises one (the owner does not treat backup as a priority).
 *
 * Owns no open-state of its own — openSections/onToggle come from the
 * parent, exactly like DisclosureSection's own contract.
 */
export function MoreSection({
  services,
  db,
  log,
  today,
  openSections,
  onToggle,
  supportSummary,
  onTranslationChanged,
  viewingEntry,
  onScrollLock,
}: MoreSectionProps) {
  const { backup, partner, study, translation } = services;
  const [issueLinkFailed, setIssueLinkFailed] = useState(false);

  const reportProblem = () => {
    setIssueLinkFailed(false);
    Linking.openURL(issueUrl(BUILD_SHA)).catch(() => setIssueLinkFailed(true));
  };

  return (
    <>
      <Text style={styles.groupLabel}>Preferences</Text>

      <DisclosureSection
        summary="Translation"
        status={translationName(translation.current())}
        expanded={openSections.translation}
        onToggle={() => onToggle('translation')}
        nested
      >
        <TranslationSection translation={translation} onChanged={onTranslationChanged} />
      </DisclosureSection>

      <DisclosureSection
        summary="Sealing"
        status={getProfile(db, 'seal') === 'tap' ? 'Switched to tap' : undefined}
        expanded={openSections.seal}
        onToggle={() => onToggle('seal')}
        nested
      >
        <SealModeSection db={db} />
      </DisclosureSection>

      <DisclosureSection summary="Partner" expanded={openSections.partner} onToggle={() => onToggle('partner')} nested>
        <PartnerSection partner={partner} />
      </DisclosureSection>

      <DisclosureSection
        summary="Adaptive policy"
        expanded={openSections.adaptive}
        onToggle={() => onToggle('adaptive')}
        nested
      >
        <AdaptiveSection db={db} today={today} />
      </DisclosureSection>

      <Text style={styles.groupLabel}>Your data</Text>

      <DisclosureSection
        summary="Safekeeping"
        expanded={openSections.safekeeping}
        onToggle={() => onToggle('safekeeping')}
        nested
      >
        <BackupSection backup={backup} />
      </DisclosureSection>

      <DisclosureSection
        summary="Starting over"
        expanded={openSections.reset}
        onToggle={() => onToggle('reset')}
        nested
      >
        <ResetSection db={db} log={log} onScrollLock={onScrollLock} />
      </DisclosureSection>

      <Text style={styles.groupLabel}>About</Text>

      <DisclosureSection summary="Study library" expanded={openSections.study} onToggle={() => onToggle('study')} nested>
        <DictionaryLibrary study={study} book={viewingEntry?.book ?? meta.get(db, 'current_book') ?? 'genesis'} />
      </DisclosureSection>

      <DisclosureSection summary="Origin story" expanded={openSections.origin} onToggle={() => onToggle('origin')} nested>
        <BrandOrigin />
      </DisclosureSection>

      <DisclosureSection
        summary="Support"
        status={supportSummary && needsAttention(supportSummary) ? 'Needs attention' : undefined}
        attention={supportSummary ? needsAttention(supportSummary) : false}
        expanded={openSections.support}
        onToggle={() => onToggle('support')}
        nested
      >
        {supportSummary && <DiagnosticsSection summary={supportSummary} />}
      </DisclosureSection>

      <ActionButton label="Report a problem" variant="quiet" onPress={reportProblem} style={styles.report} />
      {issueLinkFailed && <Text style={styles.reportError}>Couldn&apos;t open the browser.</Text>}
    </>
  );
}

const styles = StyleSheet.create({
  groupLabel: {
    fontFamily: tokens.font.mono,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: tokens.color.ink40,
    marginTop: 12,
    marginBottom: 4,
  },
  report: {
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  reportError: {
    fontFamily: tokens.font.mono,
    fontSize: 11,
    color: tokens.color.madder,
  },
});
