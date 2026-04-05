import { create } from 'zustand';
import { Appearance } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const getSystemDark = () => Appearance.getColorScheme() === 'dark';

const useThemeStore = create((set, get) => ({
  mode: 'system', // 'light' | 'dark' | 'system'
  isDark: getSystemDark(),

  initialize: async () => {
    try {
      const saved = await SecureStore.getItemAsync('theme_mode');
      if (saved) {
        const isDark = saved === 'dark' || (saved === 'system' && getSystemDark());
        set({ mode: saved, isDark });
      }
    } catch {}
  },

  setMode: async (mode) => {
    const isDark = mode === 'dark' || (mode === 'system' && getSystemDark());
    set({ mode, isDark });
    await SecureStore.setItemAsync('theme_mode', mode);
  },

  toggle: async () => {
    const { isDark } = get();
    const newMode = isDark ? 'light' : 'dark';
    set({ mode: newMode, isDark: !isDark });
    await SecureStore.setItemAsync('theme_mode', newMode);
  },
}));

export default useThemeStore;
