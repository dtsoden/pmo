<script lang="ts">
  import { browser } from '$app/environment';
  import { auth, isAuthenticated } from '$lib/stores/auth';
  import { Button, Input, Card } from '$components/shared';
  import { onMount } from 'svelte';

  // SvelteKit props - must be declared to avoid warnings
  export let data: unknown = null;
  export let form: unknown = null;
  export let params: Record<string, string> = {};

  let firstName = '';
  let lastName = '';
  let email = '';
  let password = '';
  let confirmPassword = '';
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

    if (password !== confirmPassword) {
      error = 'Passwords do not match';
      return;
    }

    if (password.length < 8) {
      error = 'Password must be at least 8 characters';
      return;
    }

    loading = true;

    const result = await auth.register({ email, password, firstName, lastName });

    if (result.success) {
      if (browser) {
        window.location.href = '/dashboard';
      }
    } else {
      error = result.error || 'Registration failed';
    }

    loading = false;
  }
</script>

<svelte:head>
  <title>Register - PMO</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-muted/30 px-4">
  <Card class="w-full max-w-md p-8">
    <div class="mb-8 text-center">
      <h1 class="text-2xl font-bold">Create an account</h1>
      <p class="mt-2 text-sm text-muted-foreground">
        Get started with PMO
      </p>
    </div>

    <form on:submit|preventDefault={handleSubmit} class="space-y-4">
      {#if error}
        <div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      {/if}

      <div class="grid grid-cols-2 gap-4">
        <Input
          id="firstName"
          type="text"
          label="First name"
          placeholder="John"
          bind:value={firstName}
          required
          autocomplete="given-name"
        />

        <Input
          id="lastName"
          type="text"
          label="Last name"
          placeholder="Doe"
          bind:value={lastName}
          required
          autocomplete="family-name"
        />
      </div>

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
        placeholder="Create a password"
        bind:value={password}
        required
        autocomplete="new-password"
      />

      <Input
        id="confirmPassword"
        type="password"
        label="Confirm password"
        placeholder="Confirm your password"
        bind:value={confirmPassword}
        required
        autocomplete="new-password"
      />

      <Button type="submit" class="w-full" {loading}>
        {loading ? 'Creating account...' : 'Create account'}
      </Button>
    </form>

    <div class="mt-6 text-center text-sm">
      <span class="text-muted-foreground">Already have an account? </span>
      <a href="/login" class="font-medium text-primary hover:underline">
        Sign in
      </a>
    </div>
  </Card>
</div>
