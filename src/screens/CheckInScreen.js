import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useHabits, todayKey } from '../store/HabitStore';

const { width: SW, height: SH } = Dimensions.get('window');
const PARTICLE_COUNT = 60;
const COLORS = ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#FF9A3C', '#C77DFF'];

// ─── single confetti particle ────────────────────────────────────────────────

function Particle({ startX, color, delay }) {
  const y = useRef(new Animated.Value(-20)).current;
  const x = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const xTarget = (Math.random() - 0.5) * SW * 0.8;
    const duration = 1800 + Math.random() * 1000;

    Animated.parallel([
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(y, { toValue: SH + 40, duration, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(x, { toValue: xTarget, duration, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(rotate, { toValue: 6, duration, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.delay(delay + duration * 0.6),
        Animated.timing(opacity, { toValue: 0, duration: duration * 0.4, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const spin = rotate.interpolate({ inputRange: [0, 6], outputRange: ['0deg', '720deg'] });

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          left: startX,
          backgroundColor: color,
          transform: [{ translateY: y }, { translateX: x }, { rotate: spin }],
          opacity,
        },
      ]}
    />
  );
}

// ─── confetti burst (rendered full-screen, pointer-events none) ──────────────

function Confetti({ visible }) {
  if (!visible) return null;

  const particles = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    key: i,
    startX: Math.random() * SW,
    color: COLORS[i % COLORS.length],
    delay: Math.random() * 400,
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((p) => (
        <Particle key={p.key} startX={p.startX} color={p.color} delay={p.delay} />
      ))}
    </View>
  );
}

// ─── habit row ───────────────────────────────────────────────────────────────

function HabitRow({ habit, done, onToggle }) {
  const scale = useRef(new Animated.Value(1)).current;

  function handlePress() {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.88, duration: 80, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
    ]).start();
    onToggle();
  }

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.8}>
      <Animated.View style={[styles.row, done && styles.rowDone, { transform: [{ scale }] }]}>
        <Text style={styles.emoji}>{habit.emoji}</Text>
        <Text style={[styles.habitName, done && styles.habitNameDone]}>{habit.name}</Text>
        <View style={[styles.check, done && styles.checkDone]}>
          {done && <Text style={styles.checkMark}>✓</Text>}
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─── screen ──────────────────────────────────────────────────────────────────

export default function CheckInScreen() {
  const { habits, getCompletions, toggle, allDoneToday } = useHabits();
  const [showConfetti, setShowConfetti] = useState(false);
  const prevAllDone = useRef(false);
  const today = todayKey();

  useEffect(() => {
    if (allDoneToday && !prevAllDone.current && habits.length > 0) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }
    prevAllDone.current = allDoneToday;
  }, [allDoneToday]);

  if (habits.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyEmoji}>🌱</Text>
        <Text style={styles.emptyText}>No habits yet.</Text>
        <Text style={styles.emptyHint}>Add some in the Settings tab!</Text>
      </View>
    );
  }

  const doneCount = habits.filter((h) => getCompletions(h.id)[today]).length;

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Today's Check-In</Text>
      <Text style={styles.subheading}>
        {doneCount}/{habits.length} done
        {allDoneToday ? '  🎉' : ''}
      </Text>

      <FlatList
        data={habits}
        keyExtractor={(h) => h.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <HabitRow
            habit={item}
            done={!!getCompletions(item.id)[today]}
            onToggle={() => toggle(item.id)}
          />
        )}
      />

      <Confetti visible={showConfetti} />
    </View>
  );
}

// ─── styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  heading: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 4,
  },
  subheading: {
    fontSize: 16,
    color: '#6C757D',
    marginBottom: 24,
  },
  list: {
    gap: 12,
    paddingBottom: 40,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  rowDone: {
    backgroundColor: '#F0FFF4',
  },
  emoji: {
    fontSize: 28,
    marginRight: 14,
  },
  habitName: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: '#1A1A2E',
  },
  habitNameDone: {
    color: '#38A169',
    textDecorationLine: 'line-through',
  },
  check: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#CBD5E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkDone: {
    borderColor: '#38A169',
    backgroundColor: '#38A169',
  },
  checkMark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F9FA',
  },
  emptyEmoji: { fontSize: 60, marginBottom: 12 },
  emptyText: { fontSize: 22, fontWeight: '700', color: '#1A1A2E' },
  emptyHint: { fontSize: 15, color: '#6C757D', marginTop: 6 },
  particle: {
    position: 'absolute',
    top: 0,
    width: 10,
    height: 14,
    borderRadius: 2,
  },
});
