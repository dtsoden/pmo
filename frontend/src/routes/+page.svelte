<script lang="ts">
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import { isAuthenticated, isInitialized } from '$lib/stores/auth';
  import { Button, Card, Spinner } from '$components/shared';
  import { FolderKanban, Users, Clock, ArrowRight } from 'lucide-svelte';

  // SvelteKit props - must be declared to avoid warnings
  export let data: unknown = null;
  export let form: unknown = null;
  export let params: Record<string, string> = {};

  let title = 'PMO Platform';

  onMount(() => {
    const unsubscribe = isInitialized.subscribe((initialized) => {
      if (initialized && $isAuthenticated && browser) {
        window.location.href = '/dashboard';
      }
    });

    return unsubscribe;
  });
</script>

<svelte:head>
  <title>{title}</title>
</svelte:head>

{#if !$isInitialized}
  <div class="flex h-screen items-center justify-center">
    <Spinner size="lg" />
  </div>
{:else}
  <div class="min-h-screen bg-gradient-to-b from-background to-muted/30">
    <!-- Hero Section -->
    <div class="container mx-auto px-4 py-20">
      <div class="mx-auto max-w-4xl text-center">
        <div class="mb-6 inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-2 text-sm">
          <span class="flex h-2 w-2 rounded-full bg-green-500" />
          Enterprise-ready PMO solution
        </div>
        <h1 class="mb-6 text-5xl font-bold tracking-tight">
          Streamline Your Project
          <span class="text-primary">Management</span>
        </h1>
        <p class="mx-auto mb-8 max-w-2xl text-xl text-muted-foreground">
          PMO Platform brings together project management, capacity planning, and time tracking
          in one powerful, integrated solution.
        </p>
        <div class="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button href="/login" size="lg">
            Sign In
            <ArrowRight class="ml-2 h-4 w-4" />
          </Button>
          <Button href="/register" variant="outline" size="lg">
            Create Account
          </Button>
        </div>
      </div>
    </div>

    <!-- Features Section -->
    <div class="container mx-auto px-4 py-16">
      <div class="grid gap-8 md:grid-cols-3">
        <Card class="p-8">
          <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300">
            <FolderKanban class="h-6 w-6" />
          </div>
          <h3 class="mb-2 text-xl font-semibold">Project Management</h3>
          <p class="text-muted-foreground">
            Manage projects with phases, milestones, and tasks. Track progress with visual dashboards
            and real-time updates.
          </p>
        </Card>

        <Card class="p-8">
          <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300">
            <Users class="h-6 w-6" />
          </div>
          <h3 class="mb-2 text-xl font-semibold">Capacity Planning</h3>
          <p class="text-muted-foreground">
            Resource allocation and availability tracking across projects. See team utilization
            at a glance.
          </p>
        </Card>

        <Card class="p-8">
          <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-300">
            <Clock class="h-6 w-6" />
          </div>
          <h3 class="mb-2 text-xl font-semibold">Time Tracking</h3>
          <p class="text-muted-foreground">
            Real-time task-based time tracking with an active timer. Generate reports and track
            billable hours.
          </p>
        </Card>
      </div>
    </div>

    <!-- Footer -->
    <footer class="border-t py-8">
      <div class="container mx-auto px-4 text-center text-sm text-muted-foreground">
        <p>PMO Platform - Built for modern project teams</p>
      </div>
    </footer>
  </div>
{/if}
