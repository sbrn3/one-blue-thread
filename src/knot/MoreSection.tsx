import { StyleSheet, Text } from 'react-native';
import type { BackupStatus } from '../backup';
import type { SupportSummary } from '../lab/diagnostics';
import { needsAttention } from '../lab/diagnostics';
import type { Log } from '../log/log';
import type { SqlDb } from '../log/db';
import { meta } from '../log/log';
import type { Services } from '../services';
import { DictionaryLibrary } from '../study/DictionaryLibrary';
import { tokens } from '../ui/tokens';
import { AdaptiveSection } from './AdaptiveSection';
import { BackupSection } from './BackupSection';
import { BrandOrigin } from '../brand/BrandOrigin';
import { DiagnosticsSection } from './DiagnosticsSection';
import { DisclosureSection } from './DisclosureSection';
import type { HistoryEntry } from './history';
import { PartnerSection } from './PartnerSection';
import { ResetSection } from './ResetSection';

export type MoreSectionKey = 'safekeeping' | 'reset' | 'partner' | 'adaptive' | 'origin' | 'study' | 'support';

interface MoreSectionProps {
  services: Services;
  db: SqlDb;
  log: Log;
  today: string;
  openSections: Record<MoreSectionKey, boolean>;
  onToggle: (key: MoreSectionKey) => void;
  backupStatus: BackupStatus | null;
  supportSummary: SupportSummary | null;
  /** Same expression Knot.tsx used to pass DictionaryLibrary before the split. */
  viewingEntry: HistoryEntry | null;
  /**
   * Safekeeping or Support may be showing promoted into the everyday tier
   * (Knot.tsx) when it needs attention — name it here so its item is left
   * out of its group below and never renders twice.
   */
  promoted: 'safekeeping' | 'support' | null;
}

/**
 * docs/plans/knot-declutter, direction A — the rare tier's three groups.
 * Dissolves the old flat "App" section (origin story + adaptive policy +
 * account reset with no relation to each other) along the line that
 * actually matters: what each item does to the reader's data.
 *
 * Owns no open-state of its own — openSections/onToggle come from the
 * parent, exactly like DisclosureSection's own contract, so a promoted
 * attention section and a group item never disagree about being open.
 */
export function MoreSection({
  services,
  db,
  log,
  today,
  openSections,
  onToggle,
  backupStatus,
  supportSummary,
  viewingEntry,
  promoted,
}: MoreSectionProps) {
  const { backup, partner, study } = services;

  return (
    <>
      <Text style={styles.groupLabel}>Your data</Text>

      {promoted !== 'safekeeping' && (
        <DisclosureSection
          summary="Safekeeping"
          status={
            backupStatus?.snapshotAttentionNeeded || backupStatus?.externalAttentionNeeded
              ? 'Needs attention'
              : undefined
          }
          attention={backupStatus?.snapshotAttentionNeeded || backupStatus?.externalAttentionNeeded}
          expanded={openSections.safekeeping}
          onToggle={() => onToggle('safekeeping')}
          nested
        >
          <BackupSection backup={backup} />
        </DisclosureSection>
      )}

      <DisclosureSection
        summary="Starting over"
        expanded={openSections.reset}
        onToggle={() => onToggle('reset')}
        nested
      >
        <ResetSection db={db} log={log} />
      </DisclosureSection>

      <Text style={styles.groupLabel}>Practice</Text>

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

      <Text style={styles.groupLabel}>About</Text>

      <DisclosureSection summary="Origin story" expanded={openSections.origin} onToggle={() => onToggle('origin')} nested>
        <BrandOrigin />
      </DisclosureSection>

      <DisclosureSection summary="Study library" expanded={openSections.study} onToggle={() => onToggle('study')} nested>
        <DictionaryLibrary study={study} book={viewingEntry?.book ?? meta.get(db, 'current_book') ?? 'genesis'} />
      </DisclosureSection>

      {promoted !== 'support' && (
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
      )}
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
});
