import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import { useHabits, lastNDays } from '../store/HabitStore';

// ─── emoji picker ─────────────────────────────────────────────────────────────

const EMOJIS = [
  '🏃','💪','📚','🧘','💧','🥗','😴','🎯','✍️','🎸',
  '🧠','🌿','🚴','🏊','🍎','🧹','💊','🛁','🌅','🎨',
];

function EmojiPicker({ selected, onSelect }) {
  return (
    <View style={styles.emojiGrid}>
      {EMOJIS.map((e) => (
        <TouchableOpacity
          key={e}
          onPress={() => onSelect(e)}
          style={[styles.emojiBtn, selected === e && styles.emojiBtnSelected]}
        >
          <Text style={styles.emojiItem}>{e}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── CSV export ───────────────────────────────────────────────────────────────

async function exportCSV(habits, getCompletions) {
  const days = lastNDays(365);

  const header = ['Date', ...habits.map((h) => `${h.emoji} ${h.name}`)].join(',');
  const rows = days.map((d) => {
    const cols = habits.map((h) => (getCompletions(h.id)[d] ? '1' : '0'));
    return [d, ...cols].join(',');
  });

  const csv = [header, ...rows].join('\n');
  const path = FileSystem.documentDirectory + 'habits_export.csv';

  await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });

  await Share.share({
    title: 'Habit Tracker Export',
    url: path,       // iOS native share sheet accepts file URLs
    message: csv,    // Android fallback: inline text
  });
}

// ─── screen ──────────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const { habits, addHabit, deleteHabit, getCompletions } = useHabits();

  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState(EMOJIS[0]);
  const [exporting, setExporting] = useState(false);

  function handleAdd() {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Name required', 'Please enter a habit name.');
      return;
    }
    addHabit(trimmed, emoji);
    setName('');
    setEmoji(EMOJIS[0]);
  }

  function handleDelete(habit) {
    Alert.alert(
      'Delete habit',
      `Remove "${habit.emoji} ${habit.name}"? All history will be lost.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteHabit(habit.id) },
      ],
    );
  }

  async function handleExport() {
    if (habits.length === 0) {
      Alert.alert('Nothing to export', 'Add some habits first.');
      return;
    }
    setExporting(true);
    try {
      await exportCSV(habits, getCompletions);
    } catch (e) {
      Alert.alert('Export failed', e.message);
    } finally {
      setExporting(false);
    }
  }

  return (
    <FlatList
      data={habits}
      keyExtractor={(h) => h.id}
      contentContainerStyle={styles.container}
      ListHeaderComponent={
        <View>
          <Text style={styles.heading}>Settings</Text>

          {/* ── add habit ── */}
          <Text style={styles.sectionTitle}>Add a Habit</Text>
          <View style={styles.inputRow}>
            <Text style={styles.selectedEmoji}>{emoji}</Text>
            <TextInput
              style={styles.input}
              placeholder="Habit name…"
              placeholderTextColor="#A0AEC0"
              value={name}
              onChangeText={setName}
              maxLength={40}
              returnKeyType="done"
              onSubmitEditing={handleAdd}
            />
          </View>
          <EmojiPicker selected={emoji} onSelect={setEmoji} />
          <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
            <Text style={styles.addBtnText}>+ Add Habit</Text>
          </TouchableOpacity>

          {/* ── habit list header ── */}
          {habits.length > 0 && (
            <Text style={[styles.sectionTitle, { marginTop: 28 }]}>My Habits</Text>
          )}
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.habitRow}>
          <Text style={styles.habitEmoji}>{item.emoji}</Text>
          <Text style={styles.habitName}>{item.name}</Text>
          <TouchableOpacity onPress={() => handleDelete(item)} style={styles.deleteBtn}>
            <Text style={styles.deleteBtnText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}
      ListFooterComponent={
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.exportBtn, exporting && styles.exportBtnDisabled]}
            onPress={handleExport}
            disabled={exporting}
          >
            <Text style={styles.exportBtnText}>
              {exporting ? 'Exporting…' : '⬆️  Export to CSV'}
            </Text>
          </TouchableOpacity>
        </View>
      }
    />
  );
}

// ─── styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 60,
    backgroundColor: '#F8F9FA',
  },
  heading: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6C757D',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 12,
  },
  selectedEmoji: { fontSize: 22, marginRight: 10 },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1A1A2E',
    paddingVertical: 12,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  emojiBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EDF2F7',
  },
  emojiBtnSelected: {
    backgroundColor: '#BEE3F8',
    borderWidth: 2,
    borderColor: '#4D96FF',
  },
  emojiItem: { fontSize: 22 },
  addBtn: {
    backgroundColor: '#4D96FF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  addBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  habitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  habitEmoji: { fontSize: 22, marginRight: 12 },
  habitName: { flex: 1, fontSize: 16, color: '#1A1A2E', fontWeight: '500' },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FED7D7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnText: { color: '#E53E3E', fontSize: 12, fontWeight: '700' },

  footer: { marginTop: 28 },
  exportBtn: {
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  exportBtnDisabled: { opacity: 0.5 },
  exportBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
