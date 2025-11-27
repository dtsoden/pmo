<script lang="ts">
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import { auth, isAuthenticated, isInitialized } from '$lib/stores/auth';
  import { ws } from '$lib/stores/websocket';
  import { Sidebar, Header } from '$components/layout';
  import { Spinner, SessionTimeout } from '$components/shared';
  import { cn } from '$lib/utils';

  // SvelteKit props - must be declared to avoid warnings
  // See: https://github.com/sveltejs/kit/issues/5980
  export let data: unknown = null;
  export let form: unknown = null;
  export let params: Record<string, string> = {};

  let sidebarCollapsed = false;

  onMount(() => {
    // Wait for auth to initialize
    const unsubscribe = isInitialized.subscribe((initialized) => {
      if (initialized && !$isAuthenticated && browser) {
        window.location.href = '/login';
      } else if (initialized && $isAuthenticated) {
        // Connect WebSocket when authenticated
        ws.connect();
      }
    });

    return () => {
      unsubscribe();
      ws.disconnect();
    };
  });
</script>

{#if !$isInitialized}
  <div class="flex h-screen items-center justify-center">
    <Spinner size="lg" />
  </div>
{:else if $isAuthenticated}
  <SessionTimeout />
  <Sidebar bind:collapsed={sidebarCollapsed} />
  <Header {sidebarCollapsed} />

  <main
    class={cn(
      'min-h-screen pt-16 transition-all duration-300',
      sidebarCollapsed ? 'pl-16' : 'pl-64'
    )}
  >
    <div class="p-6">
      <slot />
    </div>
  </main>
{:else}
  <div class="flex h-screen items-center justify-center">
    <Spinner size="lg" />
  </div>
{/if}
