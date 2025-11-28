<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { api, type DashboardData } from '$lib/api/client';
  import { user } from '$lib/stores/auth';
  import { ws } from '$lib/stores/websocket';
  import { Card, Badge, Spinner, EmptyState, ActiveTimerBanner } from '$components/shared';
  import {
    formatDate,
    getProjectStatusVariant,
    getTaskStatusVariant,
    getPriorityVariant,
    PROJECT_STATUS_LABELS,
    TASK_STATUS_LABELS,
    PRIORITY_LABELS,
  } from '$lib/utils';
  import {
    FolderKanban,
    CheckSquare,
    Clock,
    Users,
    Target,
    ArrowRight,
    Play,
    Calendar,
  } from 'lucide-svelte';

  // SvelteKit props - must be declared to avoid warnings
  export let data: unknown = null;
  export let form: unknown = null;
  export let params: Record<string, string> = {};

  let dashboardData: DashboardData | null = null;
  let loading = true;
  let error = '';
  let timerInterval: ReturnType<typeof setInterval> | null = null;
  let elapsedSeconds = 0;

  async function refreshActiveTimer() {
    try {
      const data = await api.analytics.dashboard();

      // Clear existing timer interval
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }

      // Update active timer
      if (dashboardData) {
        dashboardData.user.activeTimer = data.user.activeTimer;
      }

      // If there's an active timer, start updating elapsed seconds
      if (data.user?.activeTimer) {
        elapsedSeconds = data.user.activeTimer.elapsedSeconds || 0;
        timerInterval = setInterval(() => {
          elapsedSeconds++;
        }, 1000);
      } else {
        elapsedSeconds = 0;
      }
    } catch (err) {
      console.error('Failed to refresh timer:', err);
    }
  }

  onMount(async () => {
    try {
      dashboardData = await api.analytics.dashboard();

      // If there's an active timer, start updating elapsed seconds
      if (dashboardData?.user?.activeTimer) {
        elapsedSeconds = dashboardData.user.activeTimer?.elapsedSeconds || 0;
        timerInterval = setInterval(() => {
          elapsedSeconds++;
        }, 1000);
      }

      // Listen for timer events (real-time sync)
      const unsubTimerStarted = ws.on('time:started', (data: any) => {
        console.log('Dashboard: Timer started event received');
        refreshActiveTimer();
      });

      const unsubTimerStopped = ws.on('time:stopped', (data: any) => {
        console.log('Dashboard: Timer stopped event received');
        refreshActiveTimer();
      });

      // Cleanup WebSocket listeners on unmount
      return () => {
        unsubTimerStarted();
        unsubTimerStopped();
      };
    } catch (err) {
      error = (err as { message?: string })?.message || 'Failed to load dashboard';
    } finally {
      loading = false;
    }
  });

  onDestroy(() => {
    if (timerInterval) {
      clearInterval(timerInterval);
    }
  });

  function formatElapsedTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  $: teamStats = dashboardData?.teamStats;
  $: isManager = teamStats !== null;
</script>

<svelte:head>
  <title>Dashboard - PMO</title>
</svelte:head>

<div class="space-y-6">
  <!-- Welcome Header -->
  <div>
    <h1 class="text-2xl font-bold">
      Welcome back, {$user?.firstName || 'User'}
    </h1>
    <p class="text-muted-foreground">
      Here's what's happening with your projects today.
    </p>
  </div>

  {#if loading}
    <div class="flex justify-center py-12">
      <Spinner size="lg" />
    </div>
  {:else if error}
    <Card class="p-6">
      <p class="text-center text-destructive">{error}</p>
    </Card>
  {:else if dashboardData}
    <!-- Active Timer Banner -->
    {#if dashboardData.user?.activeTimer}
      <ActiveTimerBanner
        activeTimer={dashboardData.user.activeTimer}
        {elapsedSeconds}
        linkTo="/time"
        compact
      />
    {/if}

    <!-- Stats Grid -->
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card class="p-6">
        <div class="flex items-center gap-4">
          <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300">
            <FolderKanban class="h-6 w-6" />
          </div>
          <div>
            <p class="text-sm text-muted-foreground">My Projects</p>
            <p class="text-2xl font-bold">{dashboardData.myAssignments?.length || 0}</p>
          </div>
        </div>
      </Card>

      <Card class="p-6">
        <div class="flex items-center gap-4">
          <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-300">
            <CheckSquare class="h-6 w-6" />
          </div>
          <div>
            <p class="text-sm text-muted-foreground">My Tasks</p>
            <p class="text-2xl font-bold">{dashboardData.myTasks?.length || 0}</p>
          </div>
        </div>
      </Card>

      <Card class="p-6">
        <div class="flex items-center gap-4">
          <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300">
            <Clock class="h-6 w-6" />
          </div>
          <div>
            <p class="text-sm text-muted-foreground">Hours Today</p>
            <p class="text-2xl font-bold">{(dashboardData.user?.hoursLoggedToday || 0).toFixed(1)}</p>
          </div>
        </div>
      </Card>

      <Card class="p-6">
        <div class="flex items-center gap-4">
          <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300">
            <Target class="h-6 w-6" />
          </div>
          <div>
            <p class="text-sm text-muted-foreground">Upcoming Milestones</p>
            <p class="text-2xl font-bold">{dashboardData.upcomingMilestones?.length || 0}</p>
          </div>
        </div>
      </Card>
    </div>

    <!-- Team Stats (Managers only) -->
    {#if teamStats}
      <Card class="p-6">
        <h2 class="mb-4 font-semibold flex items-center gap-2">
          <Users class="h-5 w-5" />
          Team Overview
        </h2>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div class="text-center p-3 bg-muted/50 rounded-lg">
            <p class="text-2xl font-bold">{teamStats.totalProjects}</p>
            <p class="text-sm text-muted-foreground">Total Projects</p>
          </div>
          <div class="text-center p-3 bg-muted/50 rounded-lg">
            <p class="text-2xl font-bold text-green-600">{teamStats.activeProjects}</p>
            <p class="text-sm text-muted-foreground">Active Projects</p>
          </div>
          <div class="text-center p-3 bg-muted/50 rounded-lg">
            <p class="text-2xl font-bold">{teamStats.totalUsers}</p>
            <p class="text-sm text-muted-foreground">Total Users</p>
          </div>
          <div class="text-center p-3 bg-muted/50 rounded-lg">
            <p class="text-2xl font-bold text-green-600">{teamStats.activeUsers}</p>
            <p class="text-sm text-muted-foreground">Active Users</p>
          </div>
          <div class="text-center p-3 bg-muted/50 rounded-lg">
            <p class="text-2xl font-bold text-amber-600">{teamStats.pendingTimeOff}</p>
            <p class="text-sm text-muted-foreground">Pending Time Off</p>
          </div>
        </div>
      </Card>
    {/if}

    <!-- Main Content Grid -->
    <div class="grid gap-6 lg:grid-cols-2">
      <!-- My Project Assignments -->
      <Card>
        <div class="flex items-center justify-between border-b px-6 py-4">
          <h2 class="font-semibold">My Projects</h2>
          <a
            href="/projects"
            class="flex items-center gap-1 text-sm text-primary hover:underline"
          >
            View all
            <ArrowRight class="h-4 w-4" />
          </a>
        </div>
        <div class="divide-y">
          {#if !dashboardData.myAssignments?.length}
            <EmptyState
              title="No projects"
              description="You haven't been assigned to any projects yet."
              class="py-8"
            />
          {:else}
            {#each (dashboardData.myAssignments || []).filter(a => a?.project) as assignment}
              <a
                href="/projects/{assignment.project.id}"
                class="flex items-center justify-between px-6 py-4 hover:bg-muted/50"
              >
                <div>
                  <p class="font-medium">{assignment.project.name}</p>
                  <p class="text-sm text-muted-foreground">
                    {assignment.role || 'Team Member'} • {assignment.allocatedHours || 0}h allocated
                  </p>
                </div>
                <Badge variant={getProjectStatusVariant(assignment.project.status)}>
                  {PROJECT_STATUS_LABELS[assignment.project.status] || assignment.project.status}
                </Badge>
              </a>
            {/each}
          {/if}
        </div>
      </Card>

      <!-- My Tasks -->
      <Card>
        <div class="flex items-center justify-between border-b px-6 py-4">
          <h2 class="font-semibold">My Tasks</h2>
          <a
            href="/time"
            class="flex items-center gap-1 text-sm text-primary hover:underline"
          >
            View all
            <ArrowRight class="h-4 w-4" />
          </a>
        </div>
        <div class="divide-y">
          {#if !dashboardData.myTasks?.length}
            <EmptyState
              title="No tasks"
              description="You don't have any tasks assigned to you."
              class="py-8"
            />
          {:else}
            {#each (dashboardData.myTasks || []).filter(t => t?.title) as task}
              <div class="flex items-center justify-between px-6 py-4">
                <div>
                  <p class="font-medium">{task.title}</p>
                  <p class="text-sm text-muted-foreground">
                    {task.project?.name || 'Unknown Project'}
                    {#if task.dueDate}
                      • Due: {formatDate(task.dueDate)}
                    {/if}
                  </p>
                </div>
                <div class="flex items-center gap-2">
                  <Badge variant={getPriorityVariant(task.priority)}>
                    {PRIORITY_LABELS[task.priority] || task.priority}
                  </Badge>
                  <Badge variant={getTaskStatusVariant(task.status)}>
                    {TASK_STATUS_LABELS[task.status] || task.status}
                  </Badge>
                </div>
              </div>
            {/each}
          {/if}
        </div>
      </Card>
    </div>

    <!-- Upcoming Milestones -->
    {#if dashboardData.upcomingMilestones?.length}
      <Card>
        <div class="flex items-center justify-between border-b px-6 py-4">
          <h2 class="font-semibold flex items-center gap-2">
            <Calendar class="h-5 w-5" />
            Upcoming Milestones
          </h2>
        </div>
        <div class="divide-y">
          {#each (dashboardData.upcomingMilestones || []).filter(m => m?.name) as milestone}
            <div class="flex items-center justify-between px-6 py-4">
              <div>
                <p class="font-medium">{milestone.name}</p>
                <p class="text-sm text-muted-foreground">
                  {milestone.project?.name || 'Unknown'} ({milestone.project?.code || ''})
                </p>
              </div>
              {#if milestone.dueDate}
                <Badge variant="outline">
                  Due: {formatDate(milestone.dueDate)}
                </Badge>
              {/if}
            </div>
          {/each}
        </div>
      </Card>
    {/if}
  {/if}
</div>
