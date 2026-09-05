import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import type { Backup, BackupStatus } from '../backup';
import type { RecoverySnapshotHandle, RecoverySnapshotInfo } from '../backup/io';
import { ActionButton } from '../ui/controls';
import { tokens } from '../ui/tokens';

interface BackupSectionProps {
  backup: Backup;
}

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function formatWhen(ts: number | null): string {
  return ts ? new Date(ts).toLocaleString() : 'never';
}

/**
 * §16.9 layer 2 — two distinct rows, on purpose: an automatic on-device
 * recovery snapshot (weekly, silent unless it fails) is not the same
 * promise as a backup the reader has actually saved outside this phone.
 * Encryption is opt-in: the passphrase lives in the OS keychain
 * (expo-secure-store), never in the app's own database.
 */
export function BackupSection({ backup }: BackupSectionProps) {
  const [encryptionEnabled, setEncryptionEnabled] = useState(backup.isEncryptionEnabled());
  const [status, setStatus] = useState<BackupStatus>(() => backup.status());
  const [snapshots, setSnapshots] = useState<RecoverySnapshotInfo[]>([]);
  const [busy, setBusy] = useState(false);

  // Non-null while the "choose a passphrase" form is open (enabling encryption).
  const [newPassphrase, setNewPassphrase] = useState<string | null>(null);
  // Non-null while awaiting a passphrase to restore a picked (imported) file.
  const [restoreTarget, setRestoreTarget] = useState<string | null>(null);
  const [restorePassphrase, setRestorePassphrase] = useState('');
  // Non-null while awaiting a passphrase to restore an on-device snapshot.
  const [restoreSnapshot, setRestoreSnapshot] = useState<RecoverySnapshotHandle | null>(null);
  const [snapshotPassphrase, setSnapshotPassphrase] = useState('');
  // True right after a manual export, while asking whether it was actually saved anywhere.
  const [confirmingExternal, setConfirmingExternal] = useState(false);

  const refresh = () => {
    setStatus(backup.status());
    void backup.listRecoverySnapshots().then(setSnapshots);
  };

  // Refreshed on every mount — i.e. every time the knot opens this section.
  useEffect(refresh, [backup]);

  const handleToggleEncryption = (next: boolean) => {
    if (next) {
      setNewPassphrase('');
      return;
    }
    setBusy(true);
    backup
      .disableEncryption()
      .then(() => setEncryptionEnabled(false))
      .finally(() => setBusy(false));
  };

  const handleSavePassphrase = async () => {
    if (!newPassphrase) return;
    setBusy(true);
    try {
      await backup.enableEncryption(newPassphrase);
      setEncryptionEnabled(true);
      setNewPassphrase(null);
    } catch (e) {
      Alert.alert('Could not enable encryption', errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const handleExport = async () => {
    setBusy(true);
    try {
      await backup.exportNow();
      setConfirmingExternal(true);
    } catch (e) {
      Alert.alert('Export failed', errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmExternal = (saved: boolean) => {
    if (saved) {
      backup.confirmExternalBackupSaved();
      refresh();
    }
    setConfirmingExternal(false);
  };

  const handleRetrySnapshot = async () => {
    setBusy(true);
    try {
      await backup.retrySnapshot();
    } catch (e) {
      Alert.alert('Recovery snapshot failed', errorMessage(e));
    } finally {
      setBusy(false);
      refresh();
    }
  };

  const confirmAndRestoreFile = (uri: string, passphrase?: string) => {
    Alert.alert(
      'Replace all data on this phone?',
      'Restoring overwrites everything currently here with the contents of the backup file. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              await backup.restoreFrom(uri, passphrase);
              setRestoreTarget(null);
              Alert.alert('Restore complete', 'Close and reopen Thread to see the restored data.');
            } catch (e) {
              Alert.alert('Restore failed', errorMessage(e));
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  const confirmAndRestoreSnapshot = (handle: RecoverySnapshotHandle, passphrase?: string) => {
    Alert.alert(
      'Replace all data on this phone?',
      'Restoring overwrites everything currently here with the contents of this recovery snapshot. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              await backup.restoreRecoverySnapshot(handle, passphrase);
              setRestoreSnapshot(null);
              Alert.alert('Restore complete', 'Close and reopen Thread to see the restored data.');
            } catch (e) {
              Alert.alert('Restore failed', errorMessage(e));
            } finally {
              setBusy(false);
              refresh();
            }
          },
        },
      ],
    );
  };

  const handleSelectSnapshot = (snap: RecoverySnapshotInfo) => {
    if (snap.encrypted) {
      setSnapshotPassphrase('');
      setRestoreSnapshot(snap.handle);
      return;
    }
    confirmAndRestoreSnapshot(snap.handle);
  };

  const handleRestoreFromFile = async () => {
    setBusy(true);
    try {
      const picked = await backup.pickRestoreFile();
      setBusy(false);
      if (!picked) return;
      if (picked.requiresPassphrase) {
        setRestorePassphrase('');
        setRestoreTarget(picked.uri);
        return;
      }
      confirmAndRestoreFile(picked.uri);
    } catch (e) {
      setBusy(false);
      Alert.alert('Restore failed', errorMessage(e));
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Text style={styles.label}>Encrypt backups</Text>
        <Switch value={encryptionEnabled} onValueChange={handleToggleEncryption} disabled={busy} />
      </View>

      {newPassphrase !== null && (
        <View style={styles.form}>
          <Text style={styles.hint}>
            Choose a passphrase. You&apos;ll need it to restore an encrypted backup — Thread cannot recover it if you
            lose it.
          </Text>
          <TextInput
            style={styles.input}
            value={newPassphrase}
            onChangeText={setNewPassphrase}
            placeholder="Passphrase"
            placeholderTextColor={tokens.color.ink40}
            secureTextEntry
            autoCapitalize="none"
            autoFocus
          />
          <View style={styles.formRow}>
            <ActionButton label="Cancel" variant="secondary" onPress={() => setNewPassphrase(null)} />
            <ActionButton label="Save" onPress={handleSavePassphrase} disabled={!newPassphrase} busy={busy} />
          </View>
        </View>
      )}

      <View style={styles.divider} />

      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>On-device recovery snapshot</Text>
        {status.snapshotAttentionNeeded && <View style={styles.attentionDot} accessibilityLabel="Needs attention" />}
      </View>
      <Text style={styles.hint}>
        {status.snapshotLastOk
          ? `Last successful snapshot: ${formatWhen(status.snapshotLastOk)}`
          : 'No successful snapshot yet.'}
        {status.snapshotLastError ? ` Last attempt failed (${status.snapshotLastError}).` : ''}
      </Text>

      {snapshots.length > 0 && (
        <View style={styles.snapshotList}>
          {snapshots.map((snap) => (
            <ActionButton
              key={snap.handle.slot}
              label={`Restore ${snap.handle.slot} — ${formatWhen(snap.exportedAt)}${snap.encrypted ? ' (encrypted)' : ''}`}
              variant="secondary"
              onPress={() => handleSelectSnapshot(snap)}
              disabled={busy}
            />
          ))}
        </View>
      )}

      {restoreSnapshot !== null && (
        <View style={styles.form}>
          <Text style={styles.hint}>This snapshot is encrypted. Enter its passphrase to restore.</Text>
          <TextInput
            style={styles.input}
            value={snapshotPassphrase}
            onChangeText={setSnapshotPassphrase}
            placeholder="Passphrase"
            placeholderTextColor={tokens.color.ink40}
            secureTextEntry
            autoCapitalize="none"
            autoFocus
          />
          <View style={styles.formRow}>
            <ActionButton label="Cancel" variant="secondary" onPress={() => setRestoreSnapshot(null)} />
            <ActionButton
              label="Restore"
              onPress={() => confirmAndRestoreSnapshot(restoreSnapshot, snapshotPassphrase)}
              disabled={!snapshotPassphrase}
              busy={busy}
            />
          </View>
        </View>
      )}

      <View style={styles.formRow}>
        <ActionButton label="Retry snapshot" variant="secondary" onPress={handleRetrySnapshot} busy={busy} />
      </View>

      <View style={styles.divider} />

      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>Backup outside this phone</Text>
        {status.externalAttentionNeeded && <View style={styles.attentionDot} accessibilityLabel="Needs attention" />}
      </View>
      <Text style={styles.hint}>
        {status.externalConfirmedAt
          ? `Last confirmed: ${formatWhen(status.externalConfirmedAt)}`
          : 'Not confirmed saved outside this phone yet.'}
      </Text>

      {confirmingExternal && (
        <View style={styles.form}>
          <Text style={styles.hint}>Did you save it outside this phone?</Text>
          <View style={styles.formRow}>
            <ActionButton label="Not yet" variant="secondary" onPress={() => handleConfirmExternal(false)} />
            <ActionButton label="Yes, saved" onPress={() => handleConfirmExternal(true)} />
          </View>
        </View>
      )}

      {restoreTarget !== null && (
        <View style={styles.form}>
          <Text style={styles.hint}>This backup is encrypted. Enter its passphrase to restore.</Text>
          <TextInput
            style={styles.input}
            value={restorePassphrase}
            onChangeText={setRestorePassphrase}
            placeholder="Passphrase"
            placeholderTextColor={tokens.color.ink40}
            secureTextEntry
            autoCapitalize="none"
            autoFocus
          />
          <View style={styles.formRow}>
            <ActionButton label="Cancel" variant="secondary" onPress={() => setRestoreTarget(null)} />
            <ActionButton
              label="Restore"
              onPress={() => confirmAndRestoreFile(restoreTarget, restorePassphrase)}
              disabled={!restorePassphrase}
              busy={busy}
            />
          </View>
        </View>
      )}

      <View style={styles.formRow}>
        <ActionButton label="Export now" onPress={handleExport} busy={busy} />
        <ActionButton label="Restore from file" variant="secondary" onPress={handleRestoreFromFile} disabled={busy} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontFamily: tokens.font.display,
    fontSize: 15,
    color: tokens.color.ink,
  },
  hint: {
    fontFamily: tokens.font.mono,
    fontSize: 11,
    lineHeight: 16,
    color: tokens.color.ink40,
  },
  form: {
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: tokens.color.ink15,
  },
  input: {
    fontFamily: tokens.font.mono,
    fontSize: 15,
    color: tokens.color.ink,
    borderBottomWidth: 1,
    borderBottomColor: tokens.color.thread,
    paddingVertical: 6,
  },
  formRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  divider: { height: 1, backgroundColor: tokens.color.ink15, marginVertical: 4 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontFamily: tokens.font.display,
    fontWeight: '700',
    fontSize: 13,
    color: tokens.color.ink,
  },
  attentionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: tokens.color.madder,
  },
  snapshotList: {
    gap: 8,
  },
});
