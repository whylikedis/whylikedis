// The reader's text size and contrast, loaded once at launch and handed to the theme. `ready` turns
// true after the one read, so the app draws once at the reader's size rather than at 100% and then
// jumping.
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  DEFAULT_READING_PREFS,
  type ContrastPreference,
  type ReadingPrefs,
  type TextSize,
} from '../../interlace/native';
import { capture } from '../analytics';
import { reportError } from '../errors/report';
import { loadReading, saveReading } from './store';

type Reading = {
  ready: boolean;
  prefs: ReadingPrefs;
  setTextSize: (size: TextSize) => void;
  setContrast: (contrast: ContrastPreference) => void;
};

const Ctx = createContext<Reading>({
  ready: false,
  prefs: DEFAULT_READING_PREFS,
  setTextSize: () => {},
  setContrast: () => {},
});

export function ReadingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ ready: boolean; prefs: ReadingPrefs }>({
    ready: false,
    prefs: DEFAULT_READING_PREFS,
  });
  const latest = useRef(state.prefs);

  useEffect(() => {
    let live = true;
    loadReading(AsyncStorage, reportError).then((prefs) => {
      if (!live) return;
      latest.current = prefs;
      setState({ ready: true, prefs });
    });
    return () => {
      live = false;
    };
  }, []);

  const change = useCallback((next: ReadingPrefs) => {
    latest.current = next;
    setState({ ready: true, prefs: next });
    void saveReading(AsyncStorage, next, reportError);
  }, []);

  const setTextSize = useCallback(
    (textSize: TextSize) => {
      if (textSize === latest.current.textSize) return;
      capture('text_size_changed', { size: textSize });
      change({ ...latest.current, textSize });
    },
    [change],
  );
  const setContrast = useCallback(
    (contrast: ContrastPreference) => {
      if (contrast === latest.current.contrast) return;
      capture('contrast_changed', { contrast });
      change({ ...latest.current, contrast });
    },
    [change],
  );

  const value = useMemo(
    () => ({ ...state, setTextSize, setContrast }),
    [state, setTextSize, setContrast],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useReading = () => useContext(Ctx);
