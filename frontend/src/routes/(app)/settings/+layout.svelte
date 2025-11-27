<script lang="ts">
  import { page } from '$app/stores';
  import { cn } from '$lib/utils';
  import { User, Bell, Shield, Palette, Timer, Puzzle } from 'lucide-svelte';

  // SvelteKit props - must be declared to avoid warnings
  // See: https://github.com/sveltejs/kit/issues/5980
  export let data: unknown = null;
  export let form: unknown = null;
  export let params: Record<string, string> = {};

  const navItems = [
    { href: '/settings/profile', label: 'Profile', icon: User },
    { href: '/settings/extension', label: 'Browser Extension', icon: Puzzle },
    { href: '/settings/timer-shortcuts', label: 'Timer Shortcuts', icon: Timer },
    { href: '/settings/notifications', label: 'Notifications', icon: Bell },
    { href: '/settings/security', label: 'Security', icon: Shield },
    { href: '/settings/appearance', label: 'Appearance', icon: Palette },
  ];
</script>

<div class="space-y-6">
  <div>
    <h1 class="text-2xl font-bold">Settings</h1>
    <p class="text-muted-foreground">Manage your account settings and preferences</p>
  </div>

  <div class="flex flex-col gap-6 lg:flex-row">
    <!-- Sidebar Navigation -->
    <nav class="w-full lg:w-64">
      <div class="space-y-1">
        {#each navItems as item}
          <a
            href={item.href}
            class={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              $page.url.pathname === item.href
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <svelte:component this={item.icon} class="h-4 w-4" />
            {item.label}
          </a>
        {/each}
      </div>
    </nav>

    <!-- Content -->
    <div class="flex-1">
      <slot />
    </div>
  </div>
</div>
