<script lang="ts">
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';

  // SvelteKit props - must be declared to avoid warnings
  export let data: unknown = null;
  export let form: unknown = null;
  export let params: Record<string, string> = {};

  // Redirect to profile settings by default
  onMount(() => {
    if (browser) {
      window.location.href = '/settings/profile';
    }
  });
</script>

<div class="flex items-center justify-center py-12">
  <p class="text-muted-foreground">Redirecting...</p>
</div>
