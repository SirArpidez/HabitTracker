import React, { useState } from 'react';
import {
  Dimensions,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useHabits, dateKey } from '../store/HabitStore';

const { width: SW } = Dimensions.get('window');

// ─── monthly heatmap ─────────────────────────────────────────────────────────

const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function MonthHeatmap({ completions, year, month }) {
  // month is 0-indexed (JS Date)
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDow = firstDay.getDay(); // 0=Sun

  const CELL = Math.floor((SW - 40) / 7) - 4;

  const cells = [];
  // blank cells before the 1st
  for (let i = 0; i < startDow; i++) cells.push({ key: `b${i}`, blank: true });
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = dateKey(new Date(year, month, d));
    cells.push({ key: iso, day: d, done: !!completions[iso] });
  }

  return (
    <View>
      <View style={styles.dowRow}>
        {DAYS_OF_WEEK.map((d) => (
          <Text key={d} style={[styles.dowLabel, { width: CELL + 4 }]}>
            {d}
          </Text>
        ))}
      </View>
      <View style={styles.grid}>
        {cells.map((c) =>
          c.blank ? (
            <View key={c.key} style={[styles.cell, { width: CELL, height: CELL }]} />
          ) : (
            <View
              key={c.key}
              style={[
                styles.cell,
                { width: CELL, height: CELL, borderRadius: CELL / 4 },
                c.done ? styles.cellDone : styles.cellEmpty,
              ]}
            >
              <Text style={[styles.cellDay, c.done && styles.cellDayDone]}>{c.day}</Text>
            </View>
          ),
        )}
      </View>
    </View>
  );
}

// ─── month navigator ─────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

function MonthNav({ year, month, onPrev, onNext }) {
  const now = new Date();
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

  return (
    <View style={styles.monthNav}>
      <TouchableOpacity onPress={onPrev} style={styles.navBtn}>
        <Text style={styles.navArrow}>‹</Text>
      </TouchableOpacity>
      <Text style={styles.monthTitle}>
        {MONTH_NAMES[month]} {year}
      </Text>
      <TouchableOpacity onPress={onNext} style={styles.navBtn} disabled={isCurrentMonth}>
        <Text style={[styles.navArrow, isCurrentMonth && styles.navArrowDisabled]}>›</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── 7-day dot row ───────────────────────────────────────────────────────────

function DotRow({ dots }) {
  return (
    <View style={styles.dotRow}>
      {dots.map(({ date, done }) => (
        <View key={date} style={[styles.dot, done ? styles.dotDone : styles.dotEmpty]} />
      ))}
    </View>
  );
}

// ─── habit stats card ────────────────────────────────────────────────────────

function HabitCard({ habit, onExpand, expanded, viewYear, viewMonth, setViewYear, setViewMonth }) {
  const { getStats, getCompletions } = useHabits();
  const { streak, rate30, dots } = getStats(habit.id);
  const completions = getCompletions(habit.id);

  return (
    <View style={styles.card}>
      <TouchableOpacity onPress={onExpand} activeOpacity={0.75}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardEmoji}>{habit.emoji}</Text>
          <View style={styles.cardInfo}>
            <Text style={styles.cardName}>{habit.name}</Text>
            <DotRow dots={dots} />
          </View>
          <View style={styles.cardStats}>
            <Text style={styles.streakNum}>{streak}</Text>
            <Text style={styles.streakLabel}>day streak</Text>
          </View>
          <View style={styles.cardStats}>
            <Text style={styles.rateNum}>{rate30}%</Text>
            <Text style={styles.rateLabel}>30-day</Text>
          </View>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.heatmapSection}>
          <MonthNav
            year={viewYear}
            month={viewMonth}
            onPrev={() => {
              if (viewMonth === 0) { setViewYear(viewYear - 1); setViewMonth(11); }
              else setViewMonth(viewMonth - 1);
            }}
            onNext={() => {
              if (viewMonth === 11) { setViewYear(viewYear + 1); setViewMonth(0); }
              else setViewMonth(viewMonth + 1);
            }}
          />
          <MonthHeatmap completions={completions} year={viewYear} month={viewMonth} />
        </View>
      )}
    </View>
  );
}

// ─── screen ──────────────────────────────────────────────────────────────────

export default function StatsScreen() {
  const { habits } = useHabits();
  const [expandedId, setExpandedId] = useState(null);
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  if (habits.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyEmoji}>📊</Text>
        <Text style={styles.emptyText}>No habits to show yet.</Text>
        <Text style={styles.emptyHint}>Add habits in Settings to see stats here.</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={habits}
      keyExtractor={(h) => h.id}
      contentContainerStyle={styles.list}
      ListHeaderComponent={<Text style={styles.heading}>Statistics</Text>}
      renderItem={({ item }) => (
        <HabitCard
          habit={item}
          expanded={expandedId === item.id}
          onExpand={() => setExpandedId(expandedId === item.id ? null : item.id)}
          viewYear={viewYear}
          viewMonth={viewMonth}
          setViewYear={setViewYear}
          setViewMonth={setViewMonth}
        />
      )}
    />
  );
}

// ─── styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  list: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 12,
    backgroundColor: '#F8F9FA',
  },
  heading: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardEmoji: { fontSize: 26 },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: '600', color: '#1A1A2E', marginBottom: 6 },
  cardStats: { alignItems: 'center', marginLeft: 8 },
  streakNum: { fontSize: 20, fontWeight: '700', color: '#FF9A3C' },
  streakLabel: { fontSize: 10, color: '#6C757D' },
  rateNum: { fontSize: 20, fontWeight: '700', color: '#4D96FF' },
  rateLabel: { fontSize: 10, color: '#6C757D' },

  dotRow: { flexDirection: 'row', gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotDone: { backgroundColor: '#38A169' },
  dotEmpty: { backgroundColor: '#E2E8F0' },

  heatmapSection: { marginTop: 16 },

  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  navBtn: { padding: 6 },
  navArrow: { fontSize: 24, color: '#4D96FF', fontWeight: '700' },
  navArrowDisabled: { color: '#CBD5E0' },
  monthTitle: { fontSize: 15, fontWeight: '600', color: '#1A1A2E' },

  dowRow: { flexDirection: 'row', marginBottom: 4 },
  dowLabel: { textAlign: 'center', fontSize: 10, color: '#6C757D', fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  cell: { alignItems: 'center', justifyContent: 'center', margin: 2 },
  cellDone: { backgroundColor: '#38A169' },
  cellEmpty: { backgroundColor: '#EDF2F7' },
  cellDay: { fontSize: 10, color: '#718096' },
  cellDayDone: { color: '#FFFFFF', fontWeight: '700' },

  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F9FA',
  },
  emptyEmoji: { fontSize: 60, marginBottom: 12 },
  emptyText: { fontSize: 22, fontWeight: '700', color: '#1A1A2E' },
  emptyHint: { fontSize: 15, color: '#6C757D', marginTop: 6, textAlign: 'center', paddingHorizontal: 30 },
});
