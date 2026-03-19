import { writable } from 'svelte/store';
import { browser } from '$app/environment';

const SESSION_KEY = 'isAdmin';

const createAdminStore = () => {
  const { subscribe, set } = writable(false);

  const refresh = () => {
    if (!browser) return;
    set(sessionStorage.getItem(SESSION_KEY) === 'true');
  };

  const login = () => {
    if (!browser) return;
    sessionStorage.setItem(SESSION_KEY, 'true');
    set(true);
  };

  const logout = () => {
    if (!browser) return;
    sessionStorage.removeItem(SESSION_KEY);
    set(false);
  };

  return { subscribe, refresh, login, logout };
};

export const adminSession = createAdminStore();

