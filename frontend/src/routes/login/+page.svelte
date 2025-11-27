<script lang="ts">
  import { auth, isAuthenticated } from '$lib/stores/auth';
  import { Button, Input, Card } from '$components/shared';
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';

  // SvelteKit props - must be declared to avoid warnings
  export let data: unknown = null;
  export let form: unknown = null;
  export let params: Record<string, string> = {};

  let email = '';
  let password = '';
  let loading = false;
  let error = '';

  onMount(() => {
    // Redirect if already logged in
    if ($isAuthenticated && browser) {
      window.location.href = '/dashboard';
    }
  });

  async function handleSubmit() {
    error = '';
    loading = true;

    const result = await auth.login(email, password);

    if (result.success) {
      // Use window.location for more reliable navigation
      if (browser) {
        window.location.href = '/dashboard';
      }
    } else {
      error = result.error || 'Login failed';
    }

    loading = false;
  }
</script>

<svelte:head>
  <title>Login - PMO</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-muted/30 px-4">
  <Card class="w-full max-w-md p-8">
    <div class="mb-8 text-center">
      <h1 class="text-2xl font-bold">Welcome back</h1>
      <p class="mt-2 text-sm text-muted-foreground">
        Sign in to your PMO account
      </p>
    </div>

    <form on:submit|preventDefault={handleSubmit} class="space-y-4">
      {#if error}
        <div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      {/if}

      <Input
        id="email"
        type="email"
        label="Email"
        placeholder="you@example.com"
        bind:value={email}
        required
        autocomplete="email"
      />

      <Input
        id="password"
        type="password"
        label="Password"
        placeholder="Enter your password"
        bind:value={password}
        required
        autocomplete="current-password"
      />

      <Button type="submit" class="w-full" {loading}>
        {loading ? 'Signing in...' : 'Sign in'}
      </Button>
    </form>

    <div class="mt-6 text-center text-sm">
      <span class="text-muted-foreground">Don't have an account? </span>
      <a href="/register" class="font-medium text-primary hover:underline">
        Sign up
      </a>
    </div>
  </Card>
</div>
