// The player's progress, kept on the device. One read at start, writes after each answer; the
// rules are in game-model.ts. There is no account yet, so nothing leaves the phone.
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  EMPTY,
  parseProgress,
  record,
  today,
  type Progress,
  type Rating,
} from './game-model.ts';

const KEY = 'wld.progress.v1';

type Store = {
  progress: Progress;
  ready: boolean;
  rate: (cardId: string, rating: Rating, daily: boolean) => void;
};

const Ctx = createContext<Store>({
  progress: EMPTY,
  ready: false,
  rate: () => {},
});

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState<Progress>(EMPTY);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => setProgress(parseProgress(raw)))
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const rate = useCallback((cardId: string, rating: Rating, daily: boolean) => {
    setProgress((p) => {
      const next = record(p, cardId, rating, today(), daily);
      AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ progress, ready, rate }),
    [progress, ready, rate],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useProgress = () => useContext(Ctx);
