// The reader's text size and contrast choice, kept on the phone under its own key. Reading the
// choice can never stop the app opening: a missing, corrupt or unreadable value is the default, and a
// failed save is reported and the choice still applies for this launch.
import {
  DEFAULT_READING_PREFS,
  parseReadingPrefs,
  serializeReadingPrefs,
  type ReadingPrefs,
} from '../../interlace/native/reading-prefs.ts';

export const READING_KEY = 'wld.reading';

type Storage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
};
type OnError = (error: unknown, where: string) => void;

export async function loadReading(
  storage: Pick<Storage, 'getItem'>,
  onError: OnError,
): Promise<ReadingPrefs> {
  try {
    return parseReadingPrefs(await storage.getItem(READING_KEY));
  } catch (e) {
    onError(e, 'reading: load');
    return DEFAULT_READING_PREFS;
  }
}

export async function saveReading(
  storage: Pick<Storage, 'setItem'>,
  prefs: ReadingPrefs,
  onError: OnError,
): Promise<void> {
  try {
    await storage.setItem(READING_KEY, serializeReadingPrefs(prefs));
  } catch (e) {
    onError(e, 'reading: save');
  }
}
