<script lang="ts">
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import { Card, Button } from '$components/shared';
  import { Sun, Moon, Monitor } from 'lucide-svelte';
  import { toast } from 'svelte-sonner';
  import { api } from '$lib/api/client';

  // SvelteKit props - must be declared to avoid warnings
  export let data: unknown = null;
  export let form: unknown = null;
  export let params: Record<string, string> = {};

  type Theme = 'light' | 'dark' | 'system';

  let theme: Theme = 'system';
  let loading = true;
  let saving = false;

  // Load theme on mount - from API first, then localStorage fallback
  onMount(async () => {
    // Immediately apply localStorage theme for fast UI
    if (browser) {
      theme = (localStorage.getItem('theme') as Theme) || 'system';
      applyTheme(theme);
    }

    // Then sync with API
    try {
      const prefs = await api.users.getPreferences();
      if (prefs.theme) {
        theme = prefs.theme;
        applyTheme(theme);
        // Sync localStorage with server value
        localStorage.setItem('theme', theme);
      }
    } catch (err) {
      // Fallback to localStorage if API fails (user not logged in, etc.)
      console.warn('Could not load preferences from API:', err);
    } finally {
      loading = false;
    }
  });

  function applyTheme(selectedTheme: Theme) {
    if (!browser) return;

    const root = document.documentElement;

    if (selectedTheme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', prefersDark);
    } else {
      root.classList.toggle('dark', selectedTheme === 'dark');
    }

    // Always update localStorage for immediate theme on next load
    localStorage.setItem('theme', selectedTheme);
  }

  async function setTheme(newTheme: Theme) {
    theme = newTheme;
    applyTheme(newTheme);
    saving = true;

    try {
      // Save to API for persistence across devices
      await api.users.updatePreferences({ theme: newTheme });
      toast.success(`Theme changed to ${newTheme}`);
    } catch (err) {
      toast.error('Failed to save theme preference');
      console.error('Failed to save theme:', err);
    } finally {
      saving = false;
    }
  }
</script>

<svelte:head>
  <title>Appearance Settings - PMO</title>
</svelte:head>

<div class="space-y-6">
  <Card class="p-6">
    <h2 class="mb-6 text-lg font-semibold">Theme</h2>
    <p class="mb-4 text-sm text-muted-foreground">
      Choose how PMO looks to you. Select a theme or sync with your system settings.
    </p>

    <div class="grid gap-4 md:grid-cols-3">
      <button
        type="button"
        class="flex flex-col items-center rounded-lg border p-4 transition-colors hover:bg-muted {theme === 'light' ? 'border-primary bg-primary/5' : ''}"
        on:click={() => setTheme('light')}
      >
        <div class="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
          <Sun class="h-6 w-6" />
        </div>
        <span class="font-medium">Light</span>
        <span class="text-xs text-muted-foreground">Always light mode</span>
      </button>

      <button
        type="button"
        class="flex flex-col items-center rounded-lg border p-4 transition-colors hover:bg-muted {theme === 'dark' ? 'border-primary bg-primary/5' : ''}"
        on:click={() => setTheme('dark')}
      >
        <div class="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-800 text-slate-200">
          <Moon class="h-6 w-6" />
        </div>
        <span class="font-medium">Dark</span>
        <span class="text-xs text-muted-foreground">Always dark mode</span>
      </button>

      <button
        type="button"
        class="flex flex-col items-center rounded-lg border p-4 transition-colors hover:bg-muted {theme === 'system' ? 'border-primary bg-primary/5' : ''}"
        on:click={() => setTheme('system')}
      >
        <div class="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300">
          <Monitor class="h-6 w-6" />
        </div>
        <span class="font-medium">System</span>
        <span class="text-xs text-muted-foreground">Match system theme</span>
      </button>
    </div>
  </Card>

  <Card class="p-6">
    <h2 class="mb-4 text-lg font-semibold">Density</h2>
    <p class="text-sm text-muted-foreground">
      Display density options coming soon. This will allow you to adjust spacing and element sizes throughout the interface.
    </p>
  </Card>
</div>
