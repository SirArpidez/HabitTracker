import React, { createContext, useContext, useEffect, useReducer, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@habit_tracker_data';

// ─── helpers ────────────────────────────────────────────────────────────────

export function todayKey() {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

export function dateKey(date) {
  return new Date(date).toISOString().slice(0, 10);
}

// Returns the last `n` calendar dates (today included), newest last.
export function lastNDays(n) {
  const days = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(dateKey(d));
  }
  return days;
}

// Current streak: consecutive completed days ending today (or yesterday).
function calcStreak(completions) {
  const sorted = Object.keys(completions)
    .filter((k) => completions[k])
    .sort()
    .reverse();

  if (sorted.length === 0) return 0;

  const today = todayKey();
  const yesterday = dateKey(new Date(Date.now() - 86400000));

  // streak must touch today or yesterday to be "live"
  if (sorted[0] !== today && sorted[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diff = (prev - curr) / 86400000;
    if (diff === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

// ─── initial state ───────────────────────────────────────────────────────────

const initialState = {
  habits: [],        // [{ id, name, emoji, createdAt }]
  completions: {},   // { habitId: { "YYYY-MM-DD": true } }
  loaded: false,
};

// ─── reducer ─────────────────────────────────────────────────────────────────

function reducer(state, action) {
  switch (action.type) {
    case 'LOAD':
      return { ...action.payload, loaded: true };

    case 'ADD_HABIT': {
      const habit = {
        id: Date.now().toString(),
        name: action.name,
        emoji: action.emoji,
        createdAt: todayKey(),
      };
      return {
        ...state,
        habits: [...state.habits, habit],
        completions: { ...state.completions, [habit.id]: {} },
      };
    }

    case 'DELETE_HABIT': {
      const { [action.id]: _, ...rest } = state.completions;
      return {
        ...state,
        habits: state.habits.filter((h) => h.id !== action.id),
        completions: rest,
      };
    }

    case 'TOGGLE': {
      const key = action.date ?? todayKey();
      const prev = state.completions[action.id]?.[key];
      return {
        ...state,
        completions: {
          ...state.completions,
          [action.id]: {
            ...state.completions[action.id],
            [key]: !prev,
          },
        },
      };
    }

    default:
      return state;
  }
}

// ─── context ─────────────────────────────────────────────────────────────────

const HabitContext = createContext(null);

export function HabitProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // load from storage once
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          dispatch({ type: 'LOAD', payload: JSON.parse(raw) });
        } catch {
          dispatch({ type: 'LOAD', payload: initialState });
        }
      } else {
        dispatch({ type: 'LOAD', payload: initialState });
      }
    });
  }, []);

  // persist on every change after initial load
  useEffect(() => {
    if (!state.loaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const addHabit = useCallback((name, emoji) => {
    dispatch({ type: 'ADD_HABIT', name, emoji });
  }, []);

  const deleteHabit = useCallback((id) => {
    dispatch({ type: 'DELETE_HABIT', id });
  }, []);

  const toggle = useCallback((id, date) => {
    dispatch({ type: 'TOGGLE', id, date });
  }, []);

  // derived per-habit stats
  const getStats = useCallback(
    (id) => {
      const comp = state.completions[id] ?? {};
      const streak = calcStreak(comp);

      const last30 = lastNDays(30);
      const done30 = last30.filter((d) => comp[d]).length;
      const rate30 = Math.round((done30 / 30) * 100);

      const last7 = lastNDays(7);
      const dots = last7.map((d) => ({ date: d, done: !!comp[d] }));

      return { streak, rate30, dots };
    },
    [state.completions],
  );

  // all completions for a habit (for heatmap / CSV)
  const getCompletions = useCallback(
    (id) => state.completions[id] ?? {},
    [state.completions],
  );

  // true when every habit is checked today
  const allDoneToday = state.habits.length > 0 &&
    state.habits.every((h) => state.completions[h.id]?.[todayKey()]);

  return (
    <HabitContext.Provider
      value={{
        habits: state.habits,
        loaded: state.loaded,
        toggle,
        addHabit,
        deleteHabit,
        getStats,
        getCompletions,
        allDoneToday,
      }}
    >
      {children}
    </HabitContext.Provider>
  );
}

export function useHabits() {
  const ctx = useContext(HabitContext);
  if (!ctx) throw new Error('useHabits must be used inside HabitProvider');
  return ctx;
}
