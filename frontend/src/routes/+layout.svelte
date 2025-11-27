<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { auth } from '$lib/stores/auth';
  import { Toaster } from 'svelte-sonner';

  // SvelteKit props - must be declared to avoid warnings
  // See: https://github.com/sveltejs/kit/issues/5980
  export let data: unknown = null;
  export let form: unknown = null;
  export let params: Record<string, string> = {};

  onMount(() => {
    auth.initialize();
  });
</script>

<Toaster position="top-right" richColors />

<div class="min-h-screen bg-background">
  <slot />
</div>
