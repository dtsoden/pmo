<script lang="ts">
  import { onMount } from 'svelte';
  import { api, type CapacityAnalytics, type TimeOffRequest, type UtilizationReport } from '$lib/api/client';
  import { Card, Button, Badge, Avatar, Spinner, Select } from '$components/shared';
  import {
    cn,
    formatDate,
    formatPercent,
    fullName,
    getTimeOffStatusVariant,
    TIME_OFF_STATUS_LABELS,
    TIME_OFF_TYPE_LABELS,
  } from '$lib/utils';
  import { Calendar, Users, TrendingUp, Clock, AlertTriangle, UsersRound, Plane } from 'lucide-svelte';
  import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';

  // SvelteKit props - must be declared to avoid warnings
  export let data: unknown = null;
  export let form: unknown = null;
  export let params: Record<string, string> = {};

  let capacityAnalytics: CapacityAnalytics | null = null;
  let utilization: UtilizationReport | null = null;
  let timeOffRequests: TimeOffRequest[] = [];
  let loading = true;
  let error = '';

  // Date range
  let currentDate = new Date();
  $: monthStart = startOfMonth(currentDate);
  $: monthEnd = endOfMonth(currentDate);

  async function loadData() {
    loading = true;
    error = '';

    try {
      const [analyticsRes, utilizationRes, timeOffRes] = await Promise.all([
        api.analytics.capacityOverview(),
        api.capacity.utilization({
          startDate: format(monthStart, 'yyyy-MM-dd'),
          endDate: format(monthEnd, 'yyyy-MM-dd'),
        }),
        api.capacity.timeOff.list({ limit: 20 }),
      ]);

      capacityAnalytics = analyticsRes;
      utilization = utilizationRes;
      timeOffRequests = timeOffRes?.data || [];
    } catch (err) {
      error = (err as { message?: string })?.message || 'Failed to load capacity data';
    } finally {
      loading = false;
    }
  }

  function previousMonth() {
    currentDate = subMonths(currentDate, 1);
    loadData();
  }

  function nextMonth() {
    currentDate = addMonths(currentDate, 1);
    loadData();
  }

  function thisMonth() {
    currentDate = new Date();
    loadData();
  }

  function getUtilizationColor(rate: number): string {
    if (rate >= 100) return 'text-red-500';
    if (rate >= 80) return 'text-green-500';
    if (rate >= 50) return 'text-amber-500';
    return 'text-muted-foreground';
  }

  function getUtilizationBgColor(rate: number): string {
    if (rate >= 100) return 'bg-red-500';
    if (rate >= 80) return 'bg-green-500';
    if (rate >= 50) return 'bg-amber-500';
    return 'bg-muted';
  }

  onMount(loadData);

  // Calculate over-allocated users (>100% utilization)
  $: overAllocatedUsers = (utilization?.users || []).filter(u => u?.utilization > 100);
  $: underUtilizedUsers = (utilization?.users || []).filter(u => u?.utilization < 50 && u?.utilization >= 0);
  $: optimalUsers = (utilization?.users || []).filter(u => u?.utilization >= 50 && u?.utilization <= 100);
</script>

<svelte:head>
  <title>Capacity Planning - PMO</title>
</svelte:head>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h1 class="text-2xl font-bold">Capacity Planning</h1>
      <p class="text-muted-foreground">Monitor team capacity and resource utilization</p>
    </div>
  </div>

  <!-- Month Navigation -->
  <Card class="p-4">
    <div class="flex items-center justify-between">
      <Button variant="outline" size="sm" on:click={previousMonth}>Previous</Button>
      <div class="flex items-center gap-4">
        <h2 class="font-semibold">{format(currentDate, 'MMMM yyyy')}</h2>
        <Button variant="ghost" size="sm" on:click={thisMonth}>This Month</Button>
      </div>
      <Button variant="outline" size="sm" on:click={nextMonth}>Next</Button>
    </div>
  </Card>

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
            <Users class="h-6 w-6" />
          </div>
          <div>
            <p class="text-sm text-muted-foreground">Team Members</p>
            <p class="text-2xl font-bold">{utilization?.users?.length || 0}</p>
          </div>
        </div>
      </Card>

      <Card class="p-6">
        <div class="flex items-center gap-4">
          <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300">
            <TrendingUp class="h-6 w-6" />
          </div>
          <div>
            <p class="text-sm text-muted-foreground">Avg Utilization</p>
            <p class="text-2xl font-bold">
              {formatPercent(utilization?.summary?.averageUtilization || capacityAnalytics?.utilizationRate || 0)}
            </p>
          </div>
        </div>
      </Card>

      <Card class="p-6">
        <div class="flex items-center gap-4">
          <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-300">
            <Clock class="h-6 w-6" />
          </div>
          <div>
            <p class="text-sm text-muted-foreground">Hours Logged</p>
            <p class="text-2xl font-bold">{utilization?.summary?.totalLogged?.toFixed(0) || 0}h</p>
          </div>
        </div>
      </Card>

      <Card class={cn("p-6", overAllocatedUsers.length > 0 && "border-red-200 dark:border-red-900")}>
        <div class="flex items-center gap-4">
          <div class={cn(
            "flex h-12 w-12 items-center justify-center rounded-lg",
            overAllocatedUsers.length > 0
              ? "bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300"
              : "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300"
          )}>
            <AlertTriangle class="h-6 w-6" />
          </div>
          <div>
            <p class="text-sm text-muted-foreground">Over-Allocated</p>
            <p class={cn(
              "text-2xl font-bold",
              overAllocatedUsers.length > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"
            )}>
              {overAllocatedUsers.length}
            </p>
          </div>
        </div>
      </Card>
    </div>

    <!-- Over-Allocation Warnings -->
    {#if overAllocatedUsers.length > 0}
      <Card class="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950">
        <div class="flex items-start gap-4 p-4">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300">
            <AlertTriangle class="h-5 w-5" />
          </div>
          <div class="flex-1">
            <h3 class="font-semibold text-red-800 dark:text-red-200">
              Over-Allocated Resources ({overAllocatedUsers.length})
            </h3>
            <p class="text-sm text-red-700 dark:text-red-300 mb-3">
              The following team members are allocated beyond their maximum capacity:
            </p>
            <div class="space-y-2">
              {#each overAllocatedUsers as user}
                <a
                  href="/people/{user.user?.id}"
                  class="flex items-center justify-between rounded-lg bg-white/50 dark:bg-red-900/50 p-3 hover:bg-white dark:hover:bg-red-900 transition-colors"
                >
                  <div class="flex items-center gap-3">
                    <Avatar
                      firstName={user.user?.firstName}
                      lastName={user.user?.lastName}
                      size="sm"
                    />
                    <div>
                      <span class="font-medium text-red-900 dark:text-red-100">
                        {fullName(user.user?.firstName, user.user?.lastName)}
                      </span>
                      <p class="text-xs text-red-600 dark:text-red-400">
                        {user.loggedHours?.toFixed(1) || 0}h logged of {user.availableHours?.toFixed(0) || 0}h available
                      </p>
                    </div>
                  </div>
                  <span class="text-lg font-bold text-red-600 dark:text-red-300">
                    {formatPercent(user.utilization || 0)}
                  </span>
                </a>
              {/each}
            </div>
          </div>
        </div>
      </Card>
    {/if}

    <!-- Capacity Health Summary -->
    <Card class="p-4">
      <div class="flex items-center gap-6">
        <div class="flex items-center gap-2">
          <div class="h-3 w-3 rounded-full bg-red-500" />
          <span class="text-sm">
            <span class="font-medium">{overAllocatedUsers.length}</span> Over-allocated (&gt;100%)
          </span>
        </div>
        <div class="flex items-center gap-2">
          <div class="h-3 w-3 rounded-full bg-green-500" />
          <span class="text-sm">
            <span class="font-medium">{optimalUsers.length}</span> Optimal (50-100%)
          </span>
        </div>
        <div class="flex items-center gap-2">
          <div class="h-3 w-3 rounded-full bg-amber-500" />
          <span class="text-sm">
            <span class="font-medium">{underUtilizedUsers.length}</span> Under-utilized (&lt;50%)
          </span>
        </div>
      </div>
    </Card>

    <div class="grid gap-6 lg:grid-cols-2">
      <!-- Utilization by User -->
      <Card>
        <div class="border-b px-6 py-4">
          <h2 class="font-semibold">Team Utilization</h2>
        </div>
        <div class="divide-y">
          {#if !utilization?.users?.length}
            <div class="p-6 text-center text-muted-foreground">
              No utilization data available
            </div>
          {:else}
            {#each (utilization.users || []).filter(u => u?.user) as user}
              <div class="px-6 py-4">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <Avatar
                      firstName={user.user?.firstName}
                      lastName={user.user?.lastName}
                      size="sm"
                    />
                    <div>
                      <span class="font-medium">
                        {fullName(user.user?.firstName, user.user?.lastName)}
                      </span>
                      {#if user.upcomingTimeOff && user.upcomingTimeOff.length > 0}
                        <div class="flex items-center gap-1 mt-1">
                          <Plane class="h-3 w-3 text-amber-600" />
                          <span class="text-xs text-amber-600 font-medium">
                            {user.upcomingTimeOff.length} upcoming time-off
                          </span>
                        </div>
                      {/if}
                    </div>
                  </div>
                  <span class={cn('font-semibold', getUtilizationColor(user.utilization || 0))}>
                    {formatPercent(user.utilization || 0)}
                  </span>
                </div>
                <div class="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    class={cn('h-full transition-all', getUtilizationBgColor(user.utilization || 0))}
                    style="width: {Math.min(user.utilization || 0, 100)}%"
                  />
                </div>
                <div class="mt-1 flex justify-between text-xs text-muted-foreground">
                  <span>{user.loggedHours?.toFixed(1) || 0}h logged</span>
                  <span>{user.availableHours?.toFixed(0) || 0}h available</span>
                </div>
                {#if user.upcomingTimeOff && user.upcomingTimeOff.length > 0}
                  <div class="mt-2 space-y-1">
                    {#each user.upcomingTimeOff.slice(0, 2) as timeOff}
                      <div class="flex items-center justify-between text-xs">
                        <span class="text-muted-foreground">
                          {TIME_OFF_TYPE_LABELS[timeOff.type] || timeOff.type}
                        </span>
                        <span class="font-medium text-amber-600">
                          {formatDate(timeOff.startDate)} - {formatDate(timeOff.endDate)}
                        </span>
                      </div>
                    {/each}
                    {#if user.upcomingTimeOff.length > 2}
                      <div class="text-xs text-muted-foreground">
                        +{user.upcomingTimeOff.length - 2} more
                      </div>
                    {/if}
                  </div>
                {/if}
              </div>
            {/each}
          {/if}
        </div>
      </Card>

      <!-- Capacity Overview by Department -->
      <Card>
        <div class="border-b px-6 py-4">
          <h2 class="font-semibold">Capacity by Department</h2>
        </div>
        <div class="divide-y">
          {#if !capacityAnalytics?.byDepartment?.length}
            <div class="p-6 text-center text-muted-foreground">
              No capacity data available
            </div>
          {:else}
            {#each capacityAnalytics.byDepartment as dept}
              <div class="px-6 py-4">
                <div class="flex items-center justify-between">
                  <span class="font-medium">{dept.department || 'Unassigned'}</span>
                  <span class={cn('font-semibold', getUtilizationColor(dept.utilization))}>
                    {formatPercent(dept.utilization)}
                  </span>
                </div>
                <div class="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    class={cn('h-full transition-all', getUtilizationBgColor(dept.utilization))}
                    style="width: {Math.min(dept.utilization, 100)}%"
                  />
                </div>
                <div class="mt-1 flex justify-between text-xs text-muted-foreground">
                  <span>{dept.allocated?.toFixed(0) || 0}h allocated</span>
                  <span>{dept.capacity?.toFixed(0) || 0}h capacity</span>
                </div>
              </div>
            {/each}
          {/if}
        </div>
        <!-- Summary -->
        {#if capacityAnalytics}
          <div class="border-t bg-muted/50 px-6 py-4">
            <div class="flex items-center justify-between text-sm">
              <span class="font-medium">Total Capacity</span>
              <span class="font-semibold">{capacityAnalytics.totalCapacity?.toFixed(0) || 0}h</span>
            </div>
            <div class="flex items-center justify-between text-sm mt-1">
              <span class="font-medium">Total Allocated</span>
              <span class="font-semibold">{capacityAnalytics.totalAllocated?.toFixed(0) || 0}h</span>
            </div>
          </div>
        {/if}
      </Card>
    </div>

    <!-- Time Off Requests -->
    <Card>
      <div class="flex items-center justify-between border-b px-6 py-4">
        <h2 class="font-semibold">Recent Time Off Requests</h2>
        <Button variant="outline" size="sm" href="/capacity/time-off">View All</Button>
      </div>
      <div class="divide-y">
        {#if !timeOffRequests?.length}
          <div class="p-6 text-center text-muted-foreground">
            No time off requests
          </div>
        {:else}
          {#each (timeOffRequests || []).slice(0, 5).filter(r => r?.user) as request}
            <div class="flex items-center justify-between px-6 py-4">
              <div class="flex items-center gap-3">
                <Avatar
                  firstName={request.user?.firstName}
                  lastName={request.user?.lastName}
                  size="sm"
                />
                <div>
                  <p class="font-medium">
                    {fullName(request.user?.firstName, request.user?.lastName)}
                  </p>
                  <p class="text-sm text-muted-foreground">
                    {TIME_OFF_TYPE_LABELS[request.type] || request.type} - {request.hours || 0}h
                  </p>
                </div>
              </div>
              <div class="text-right">
                <Badge variant={getTimeOffStatusVariant(request.status)}>
                  {TIME_OFF_STATUS_LABELS[request.status] || request.status}
                </Badge>
                <p class="mt-1 text-xs text-muted-foreground">
                  {formatDate(request.startDate)} - {formatDate(request.endDate)}
                </p>
              </div>
            </div>
          {/each}
        {/if}
      </div>
    </Card>
  {/if}
</div>
