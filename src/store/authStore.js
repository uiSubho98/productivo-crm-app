import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { authAPI } from '../services/api';

const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  isLoading: false,
  isInitialized: false,
  error: null,

  initialize: async () => {
    const token = await SecureStore.getItemAsync('token');
    if (!token) {
      set({ isInitialized: true, user: null, token: null });
      return;
    }
    // If MPIN is enabled, don't auto-restore session — force the user through PIN screen.
    const mpinEnabled = await SecureStore.getItemAsync('mpin_enabled');
    if (mpinEnabled === 'true') {
      // Mark as initialized but leave user/token null so Login screen shows.
      set({ isInitialized: true, user: null, token: null, isLoading: false });
      return;
    }
    // No MPIN — restore session from local storage first (fast path, works offline)
    const storedUser = await SecureStore.getItemAsync('user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        set({ user, token, isInitialized: true, isLoading: false });
      } catch {}
    }
    // Then refresh from server in background (don't block, don't wipe on failure)
    try {
      const res = await authAPI.getProfile();
      const user = res.data?.data || res.data;
      await SecureStore.setItemAsync('user', JSON.stringify(user));
      set({ user, token, isInitialized: true, isLoading: false });
    } catch (err) {
      // Only force logout on explicit 401 (invalid/expired token), not network errors
      if (err?.response?.status === 401) {
        await SecureStore.deleteItemAsync('token');
        await SecureStore.deleteItemAsync('user');
        set({ user: null, token: null, isInitialized: true, isLoading: false });
      } else {
        // Network error — keep existing session alive
        set({ isInitialized: true, isLoading: false });
      }
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await authAPI.login({ email, password });
      const { token, user } = res.data?.data || res.data;
      await SecureStore.setItemAsync('token', token);
      await SecureStore.setItemAsync('user', JSON.stringify(user));
      set({ user, token, isLoading: false, error: null });
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || err.response?.data?.error || 'Login failed';
      set({ isLoading: false, error: message });
      return { success: false, error: message };
    }
  },

  verifyMpin: async (mpin) => {
    try {
      const res = await authAPI.verifyMpin({ mpin });
      if (res.data?.success) return { success: true };
      return { success: false, error: 'Invalid PIN' };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || 'Invalid PIN' };
    }
  },

  logout: async () => {
    // Keep token in SecureStore so MPIN/biometric login still works after logout.
    // Only clear in-memory state so the app shows the login screen.
    set({ user: null, token: null, error: null });
  },

  clearError: () => set({ error: null }),
}));

export default useAuthStore;
