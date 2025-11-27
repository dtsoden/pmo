<script lang="ts">
  import { onMount } from 'svelte';
  import { api, type ProjectsSummary, type TimeSummary } from '$lib/api/client';
  import { Card, Button, Badge, Spinner } from '$components/shared';
  import {
    formatCurrency,
    formatHours,
    getProjectStatusVariant,
    getPriorityVariant,
    PROJECT_STATUS_LABELS,
    PRIORITY_LABELS,
  } from '$lib/utils';
  import { FolderKanban, Clock, DollarSign, TrendingUp } from 'lucide-svelte';
  import { format, startOfMonth, endOfMonth } from 'date-fns';

  // SvelteKit props - must be declared to avoid warnings
  export let data: unknown = null;
  export let form: unknown = null;
  export let params: Record<string, string> = {};

  let projectsSummary: ProjectsSummary | null = null;
  let timeSummary: TimeSummary | null = null;
  let loading = true;
  let error = '';

  // Default to current month for time analytics
  const now = new Date();
  const defaultStartDate = format(startOfMonth(now), 'yyyy-MM-dd');
  const defaultEndDate = format(endOfMonth(now), 'yyyy-MM-dd');

  async function loadData() {
    loading = true;
    error = '';

    try {
      const [projectsRes, timeRes] = await Promise.all([
        api.analytics.projectsSummary(),
        api.analytics.timeSummary({ startDate: defaultStartDate, endDate: defaultEndDate }),
      ]);

      projectsSummary = projectsRes;
      timeSummary = timeRes;
    } catch (err) {
      error = (err as { message?: string })?.message || 'Failed to load analytics';
    } finally {
      loading = false;
    }
  }

  onMount(loadData);

  $: totalByStatus = projectsSummary?.byStatus || {};
  $: totalByPriority = projectsSummary?.byPriority || {};
</script>

<svelte:head>
  <title>Analytics - PMO</title>
</svelte:head>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h1 class="text-2xl font-bold">Analytics</h1>
      <p class="text-muted-foreground">Overview of projects and time tracking metrics</p>
    </div>
    <Button variant="outline" on:click={loadData}>Refresh</Button>
  </div>

  {#if loading}
    <div class="flex justify-center py-12">
      <Spinner size="lg" />
    </div>
  {:else if error}
    <Card class="p-6">
      <p class="text-center text-destructive">{error}</p>
      <div class="mt-4 text-center">
        <Button variant="outline" on:click={loadData}>Retry</Button>
      </div>
    </Card>
  {:else}
    <!-- Summary Stats -->
    <div class="grid gap-4 md:grid-cols-4">
      <Card class="p-6">
        <div class="flex items-center gap-4">
          <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300">
            <FolderKanban class="h-6 w-6" />
          </div>
          <div>
            <p class="text-sm text-muted-foreground">Total Projects</p>
            <p class="text-2xl font-bold">{projectsSummary?.total || 0}</p>
          </div>
        </div>
      </Card>

      <Card class="p-6">
        <div class="flex items-center gap-4">
          <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300">
            <Clock class="h-6 w-6" />
          </div>
          <div>
            <p class="text-sm text-muted-foreground">Total Hours</p>
            <p class="text-2xl font-bold">{(timeSummary?.totalHours || 0).toFixed(0)}h</p>
          </div>
        </div>
      </Card>

      <Card class="p-6">
        <div class="flex items-center gap-4">
          <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-300">
            <DollarSign class="h-6 w-6" />
          </div>
          <div>
            <p class="text-sm text-muted-foreground">Billable Hours</p>
            <p class="text-2xl font-bold">{(timeSummary?.billableHours || 0).toFixed(0)}h</p>
          </div>
        </div>
      </Card>

      <Card class="p-6">
        <div class="flex items-center gap-4">
          <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300">
            <TrendingUp class="h-6 w-6" />
          </div>
          <div>
            <p class="text-sm text-muted-foreground">Billable Rate</p>
            <p class="text-2xl font-bold">
              {timeSummary?.totalHours && timeSummary.billableHours
                ? (((timeSummary.billableHours || 0) / timeSummary.totalHours) * 100).toFixed(0)
                : 0}%
            </p>
          </div>
        </div>
      </Card>
    </div>

    <div class="grid gap-6 lg:grid-cols-2">
      <!-- Projects by Status -->
      <Card>
        <div class="border-b px-6 py-4">
          <h2 class="font-semibold">Projects by Status</h2>
        </div>
        <div class="p-6">
          <div class="space-y-4">
            {#each Object.entries(PROJECT_STATUS_LABELS) as [status, label]}
              {@const count = totalByStatus[status] || 0}
              {@const percentage = projectsSummary?.total
                ? (count / projectsSummary.total) * 100
                : 0}
              <div>
                <div class="flex items-center justify-between text-sm">
                  <div class="flex items-center gap-2">
                    <Badge variant={getProjectStatusVariant(status)}>{label}</Badge>
                  </div>
                  <span class="font-medium">{count}</span>
                </div>
                <div class="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    class="h-full bg-primary transition-all"
                    style="width: {percentage}%"
                  />
                </div>
              </div>
            {/each}
          </div>
        </div>
      </Card>

      <!-- Projects by Priority -->
      <Card>
        <div class="border-b px-6 py-4">
          <h2 class="font-semibold">Projects by Priority</h2>
        </div>
        <div class="p-6">
          <div class="space-y-4">
            {#each Object.entries(PRIORITY_LABELS) as [priority, label]}
              {@const count = totalByPriority[priority] || 0}
              {@const percentage = projectsSummary?.total
                ? (count / projectsSummary.total) * 100
                : 0}
              <div>
                <div class="flex items-center justify-between text-sm">
                  <div class="flex items-center gap-2">
                    <Badge variant={getPriorityVariant(priority)}>{label}</Badge>
                  </div>
                  <span class="font-medium">{count}</span>
                </div>
                <div class="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    class="h-full bg-primary transition-all"
                    style="width: {percentage}%"
                  />
                </div>
              </div>
            {/each}
          </div>
        </div>
      </Card>
    </div>

    <!-- Time by Project -->
    <Card>
      <div class="border-b px-6 py-4">
        <h2 class="font-semibold">Hours by Project</h2>
      </div>
      <div class="divide-y">
        {#if !timeSummary?.byProject?.length}
          <div class="p-6 text-center text-muted-foreground">
            No time data available
          </div>
        {:else}
          {#each timeSummary.byProject.slice(0, 10) as project}
            {@const percentage = timeSummary?.totalHours
              ? ((project.hours || 0) / timeSummary.totalHours) * 100
              : 0}
            <div class="px-6 py-4">
              <div class="flex items-center justify-between">
                <a href="/projects/{project.projectId}" class="font-medium hover:text-primary">
                  {project.projectName}
                </a>
                <span class="font-semibold">{formatHours(project.hours)}</span>
              </div>
              <div class="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  class="h-full bg-primary transition-all"
                  style="width: {percentage}%"
                />
              </div>
            </div>
          {/each}
        {/if}
      </div>
    </Card>

    <!-- Hours by User -->
    <Card>
      <div class="border-b px-6 py-4">
        <h2 class="font-semibold">Hours by Team Member</h2>
      </div>
      <div class="divide-y">
        {#if !timeSummary?.byUser?.length}
          <div class="p-6 text-center text-muted-foreground">
            No time data available
          </div>
        {:else}
          {#each timeSummary.byUser.slice(0, 10) as user}
            {@const percentage = timeSummary?.totalHours
              ? ((user.hours || 0) / timeSummary.totalHours) * 100
              : 0}
            <div class="px-6 py-4">
              <div class="flex items-center justify-between">
                <span class="font-medium">{user.userName}</span>
                <span class="font-semibold">{formatHours(user.hours)}</span>
              </div>
              <div class="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  class="h-full bg-primary transition-all"
                  style="width: {percentage}%"
                />
              </div>
            </div>
          {/each}
        {/if}
      </div>
    </Card>
  {/if}
</div>
