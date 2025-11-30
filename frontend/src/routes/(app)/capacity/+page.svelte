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
    getUtilizationColor,
    getUtilizationBgStyle,
    getUtilizationCategory,
  } from '$lib/utils';
  import { Calendar, Users, TrendingUp, Clock, AlertTriangle, UsersRound, Plane, User, Building2 } from 'lucide-svelte';
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
        api.capacity.timeOff.listAll({ limit: 20 }),
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

  onMount(loadData);

  // Filters and pagination
  type UtilizationFilter = 'all' | 'critical' | 'low' | 'moderate' | 'optimal' | 'over-allocated';
  let teamFilter: UtilizationFilter = 'all';
  let deptFilter: UtilizationFilter = 'all';
  let teamPage = 1;
  let deptPage = 1;
  const pageSize = 10;

  // Calculate utilization categories based on gradient stops - TEAM MEMBERS
  $: overAllocatedUsers = (utilization?.users || []).filter(u => u?.utilization > 100);
  $: optimalUsers = (utilization?.users || []).filter(u => u?.utilization >= 80 && u?.utilization <= 100);
  $: moderateUsers = (utilization?.users || []).filter(u => u?.utilization >= 50 && u?.utilization < 80);
  $: lowUsers = (utilization?.users || []).filter(u => u?.utilization >= 25 && u?.utilization < 50);
  $: criticalUsers = (utilization?.users || []).filter(u => u?.utilization >= 0 && u?.utilization < 25);
  $: underUtilizedUsers = (utilization?.users || []).filter(u => u?.utilization >= 0 && u?.utilization < 50);

  // Calculate over-allocated DEPARTMENTS
  $: overAllocatedDepts = (capacityAnalytics?.byDepartment || []).filter(d => d?.utilization > 100);
  $: optimalDepts = (capacityAnalytics?.byDepartment || []).filter(d => d?.utilization >= 80 && d?.utilization <= 100);
  $: moderateDepts = (capacityAnalytics?.byDepartment || []).filter(d => d?.utilization >= 50 && d?.utilization < 80);
  $: lowDepts = (capacityAnalytics?.byDepartment || []).filter(d => d?.utilization >= 25 && d?.utilization < 50);
  $: criticalDepts = (capacityAnalytics?.byDepartment || []).filter(d => d?.utilization >= 0 && d?.utilization < 25);

  // Filtered and paginated lists
  $: filteredUsers = (() => {
    const allUsers = utilization?.users || [];
    let filtered = allUsers;

    switch (teamFilter) {
      case 'critical':
        filtered = allUsers.filter(u => u?.utilization >= 0 && u?.utilization < 25);
        break;
      case 'low':
        filtered = allUsers.filter(u => u?.utilization >= 25 && u?.utilization < 50);
        break;
      case 'moderate':
        filtered = allUsers.filter(u => u?.utilization >= 50 && u?.utilization < 80);
        break;
      case 'optimal':
        filtered = allUsers.filter(u => u?.utilization >= 80 && u?.utilization <= 100);
        break;
      case 'over-allocated':
        filtered = allUsers.filter(u => u?.utilization > 100);
        break;
      default:
        filtered = allUsers;
    }

    return filtered;
  })();

  $: paginatedUsers = filteredUsers.slice((teamPage - 1) * pageSize, teamPage * pageSize);
  $: totalTeamPages = Math.ceil(filteredUsers.length / pageSize);

  $: filteredDepts = (() => {
    const allDepts = capacityAnalytics?.byDepartment || [];
    let filtered = allDepts;

    switch (deptFilter) {
      case 'critical':
        filtered = allDepts.filter(d => d?.utilization >= 0 && d?.utilization < 25);
        break;
      case 'low':
        filtered = allDepts.filter(d => d?.utilization >= 25 && d?.utilization < 50);
        break;
      case 'moderate':
        filtered = allDepts.filter(d => d?.utilization >= 50 && d?.utilization < 80);
        break;
      case 'optimal':
        filtered = allDepts.filter(d => d?.utilization >= 80 && d?.utilization <= 100);
        break;
      case 'over-allocated':
        filtered = allDepts.filter(d => d?.utilization > 100);
        break;
      default:
        filtered = allDepts;
    }

    return filtered;
  })();

  $: paginatedDepts = filteredDepts.slice((deptPage - 1) * pageSize, deptPage * pageSize);
  $: totalDeptPages = Math.ceil(filteredDepts.length / pageSize);

  // Reset pagination when filter changes
  $: if (teamFilter) teamPage = 1;
  $: if (deptFilter) deptPage = 1;
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
    <div class="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
      <!-- 1. Hours Logged -->
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

      <!-- 2. Avg Utilization -->
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

      <!-- 3. Team Members -->
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

      <!-- 4. Team Members Under-Utilized -->
      <Card class={cn("p-6", underUtilizedUsers.length > 0 && "border-amber-200 dark:border-amber-900")}>
        <div class="flex items-center gap-4">
          <div class={cn(
            "flex h-12 w-12 items-center justify-center rounded-lg",
            underUtilizedUsers.length > 0
              ? "bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-300"
              : "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300"
          )}>
            <Users class="h-6 w-6" />
          </div>
          <div>
            <p class="text-sm text-muted-foreground">Team Members</p>
            <p class="text-xs text-muted-foreground">Under-Utilized</p>
            <p class={cn(
              "text-2xl font-bold",
              underUtilizedUsers.length > 0 ? "text-amber-600 dark:text-amber-400" : "text-green-600 dark:text-green-400"
            )}>
              {underUtilizedUsers.length}
            </p>
          </div>
        </div>
      </Card>

      <!-- 5. Team Members Over-Allocated -->
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
            <p class="text-sm text-muted-foreground">Team Members</p>
            <p class="text-xs text-muted-foreground">Over-Allocated</p>
            <p class={cn(
              "text-2xl font-bold",
              overAllocatedUsers.length > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"
            )}>
              {overAllocatedUsers.length}
            </p>
          </div>
        </div>
      </Card>

      <!-- 6. Departments Over-Allocated -->
      <Card class={cn("p-6", overAllocatedDepts.length > 0 && "border-red-200 dark:border-red-900")}>
        <div class="flex items-center gap-4">
          <div class={cn(
            "flex h-12 w-12 items-center justify-center rounded-lg",
            overAllocatedDepts.length > 0
              ? "bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300"
              : "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300"
          )}>
            <UsersRound class="h-6 w-6" />
          </div>
          <div>
            <p class="text-sm text-muted-foreground">Departments</p>
            <p class="text-xs text-muted-foreground">Over-Allocated</p>
            <p class={cn(
              "text-2xl font-bold",
              overAllocatedDepts.length > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"
            )}>
              {overAllocatedDepts.length}
            </p>
          </div>
        </div>
      </Card>
    </div>

    <!-- KEY -->
    <Card class="p-6">
      <h3 class="text-lg font-bold mb-4">KEY:</h3>
      <div class="flex flex-wrap items-center gap-4 md:gap-6">
        <div class="flex items-center gap-2">
          <div class="h-3 w-3 rounded-full" style="background-color: {getUtilizationColor(0)}" />
          <span class="text-sm">
            <span class="font-medium">{criticalUsers.length}</span> Critical (0-24%)
          </span>
        </div>
        <div class="flex items-center gap-2">
          <div class="h-3 w-3 rounded-full" style="background-color: {getUtilizationColor(37)}" />
          <span class="text-sm">
            <span class="font-medium">{lowUsers.length}</span> Low (25-49%)
          </span>
        </div>
        <div class="flex items-center gap-2">
          <div class="h-3 w-3 rounded-full" style="background-color: {getUtilizationColor(65)}" />
          <span class="text-sm">
            <span class="font-medium">{moderateUsers.length}</span> Moderate (50-79%)
          </span>
        </div>
        <div class="flex items-center gap-2">
          <div class="h-3 w-3 rounded-full" style="background-color: {getUtilizationColor(90)}" />
          <span class="text-sm">
            <span class="font-medium">{optimalUsers.length}</span> Optimal (80-100%)
          </span>
        </div>
        <div class="flex items-center gap-2">
          <div class="h-3 w-3 rounded-full bg-red-500" />
          <span class="text-sm">
            <span class="font-medium">{overAllocatedUsers.length}</span> Over-allocated (&gt;100%)
          </span>
        </div>
      </div>
    </Card>

    <div class="grid gap-6 lg:grid-cols-2">
      <!-- Utilization by User -->
      <Card>
        <div class="border-b px-6 py-4">
          <h2 class="font-semibold">Team Utilization</h2>
          <!-- Filter Buttons -->
          <div class="flex flex-wrap gap-2 mt-3">
            <Button
              size="sm"
              variant={teamFilter === 'all' ? 'default' : 'outline'}
              on:click={() => teamFilter = 'all'}
            >
              All ({utilization?.users?.length || 0})
            </Button>
            <Button
              size="sm"
              variant={teamFilter === 'critical' ? 'default' : 'outline'}
              on:click={() => teamFilter = 'critical'}
              style={teamFilter === 'critical' ? getUtilizationBgStyle(0) : ''}
            >
              Critical ({criticalUsers.length})
            </Button>
            <Button
              size="sm"
              variant={teamFilter === 'low' ? 'default' : 'outline'}
              on:click={() => teamFilter = 'low'}
              style={teamFilter === 'low' ? getUtilizationBgStyle(37) : ''}
            >
              Low ({lowUsers.length})
            </Button>
            <Button
              size="sm"
              variant={teamFilter === 'moderate' ? 'default' : 'outline'}
              on:click={() => teamFilter = 'moderate'}
              style={teamFilter === 'moderate' ? getUtilizationBgStyle(65) : ''}
            >
              Moderate ({moderateUsers.length})
            </Button>
            <Button
              size="sm"
              variant={teamFilter === 'optimal' ? 'default' : 'outline'}
              on:click={() => teamFilter = 'optimal'}
              style={teamFilter === 'optimal' ? getUtilizationBgStyle(90) : ''}
            >
              Optimal ({optimalUsers.length})
            </Button>
            <Button
              size="sm"
              variant={teamFilter === 'over-allocated' ? 'default' : 'outline'}
              on:click={() => teamFilter = 'over-allocated'}
              style={teamFilter === 'over-allocated' ? 'background-color: #ef4444; color: white;' : ''}
            >
              Over-allocated ({overAllocatedUsers.length})
            </Button>
          </div>
        </div>
        <div class="divide-y">
          {#if !filteredUsers.length}
            <div class="p-6 text-center text-muted-foreground">
              No team members match this filter
            </div>
          {:else}
            {#each paginatedUsers.filter(u => u?.user) as user}
              <div class="px-6 py-4">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <User class="h-5 w-5 text-muted-foreground" />
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
                  <div class="flex items-center gap-2">
                    <div
                      class="px-3 py-1 rounded-lg font-semibold text-white text-sm"
                      style={getUtilizationBgStyle(user.utilization || 0)}
                    >
                      {formatPercent(user.utilization || 0)}
                    </div>
                  </div>
                </div>
                <div class="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    class="h-full transition-all"
                    style="{getUtilizationBgStyle(user.utilization || 0)}; width: {Math.min(user.utilization || 0, 100)}%"
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
        <!-- Pagination -->
        {#if totalTeamPages > 1}
          <div class="flex items-center justify-between border-t px-6 py-4">
            <div class="text-sm text-muted-foreground">
              Showing {((teamPage - 1) * pageSize) + 1}-{Math.min(teamPage * pageSize, filteredUsers.length)} of {filteredUsers.length}
            </div>
            <div class="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={teamPage === 1}
                on:click={() => teamPage--}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={teamPage === totalTeamPages}
                on:click={() => teamPage++}
              >
                Next
              </Button>
            </div>
          </div>
        {/if}
        <!-- Summary -->
        {#if filteredUsers.length > 0}
          <div class="border-t bg-muted/50 px-6 py-4">
            <div class="flex items-center justify-between text-sm">
              <span class="font-medium">Total Hours Logged</span>
              <span class="font-semibold">{filteredUsers.reduce((sum, u) => sum + (u.loggedHours || 0), 0).toFixed(1)}h</span>
            </div>
            <div class="flex items-center justify-between text-sm mt-1">
              <span class="font-medium">Total Hours Available</span>
              <span class="font-semibold">{filteredUsers.reduce((sum, u) => sum + (u.availableHours || 0), 0).toFixed(0)}h</span>
            </div>
            <div class="flex items-center justify-between text-sm mt-1">
              <span class="font-medium">Average Utilization</span>
              <span class="font-semibold">{formatPercent(filteredUsers.reduce((sum, u) => sum + (u.utilization || 0), 0) / filteredUsers.length)}</span>
            </div>
          </div>
        {/if}
      </Card>

      <!-- Capacity Overview by Department -->
      <Card>
        <div class="border-b px-6 py-4">
          <h2 class="font-semibold">Capacity by Department</h2>
          <!-- Filter Buttons -->
          <div class="flex flex-wrap gap-2 mt-3">
            <Button
              size="sm"
              variant={deptFilter === 'all' ? 'default' : 'outline'}
              on:click={() => deptFilter = 'all'}
            >
              All ({capacityAnalytics?.byDepartment?.length || 0})
            </Button>
            <Button
              size="sm"
              variant={deptFilter === 'critical' ? 'default' : 'outline'}
              on:click={() => deptFilter = 'critical'}
              style={deptFilter === 'critical' ? getUtilizationBgStyle(0) : ''}
            >
              Critical ({criticalDepts.length})
            </Button>
            <Button
              size="sm"
              variant={deptFilter === 'low' ? 'default' : 'outline'}
              on:click={() => deptFilter = 'low'}
              style={deptFilter === 'low' ? getUtilizationBgStyle(37) : ''}
            >
              Low ({lowDepts.length})
            </Button>
            <Button
              size="sm"
              variant={deptFilter === 'moderate' ? 'default' : 'outline'}
              on:click={() => deptFilter = 'moderate'}
              style={deptFilter === 'moderate' ? getUtilizationBgStyle(65) : ''}
            >
              Moderate ({moderateDepts.length})
            </Button>
            <Button
              size="sm"
              variant={deptFilter === 'optimal' ? 'default' : 'outline'}
              on:click={() => deptFilter = 'optimal'}
              style={deptFilter === 'optimal' ? getUtilizationBgStyle(90) : ''}
            >
              Optimal ({optimalDepts.length})
            </Button>
            <Button
              size="sm"
              variant={deptFilter === 'over-allocated' ? 'default' : 'outline'}
              on:click={() => deptFilter = 'over-allocated'}
              style={deptFilter === 'over-allocated' ? 'background-color: #ef4444; color: white;' : ''}
            >
              Over-allocated ({overAllocatedDepts.length})
            </Button>
          </div>
        </div>
        <div class="divide-y">
          {#if !filteredDepts.length}
            <div class="p-6 text-center text-muted-foreground">
              No departments match this filter
            </div>
          {:else}
            {#each paginatedDepts as dept}
              <div class="px-6 py-4">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <Building2 class="h-5 w-5 text-muted-foreground" />
                    <span class="font-medium">{dept.department || 'Unassigned'}</span>
                  </div>
                  <div
                    class="px-3 py-1 rounded-lg font-semibold text-white text-sm"
                    style={getUtilizationBgStyle(dept.utilization)}
                  >
                    {formatPercent(dept.utilization)}
                  </div>
                </div>
                <div class="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    class="h-full transition-all"
                    style="{getUtilizationBgStyle(dept.utilization)}; width: {Math.min(dept.utilization, 100)}%"
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
        <!-- Pagination -->
        {#if totalDeptPages > 1}
          <div class="flex items-center justify-between border-t px-6 py-4">
            <div class="text-sm text-muted-foreground">
              Showing {((deptPage - 1) * pageSize) + 1}-{Math.min(deptPage * pageSize, filteredDepts.length)} of {filteredDepts.length}
            </div>
            <div class="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={deptPage === 1}
                on:click={() => deptPage--}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={deptPage === totalDeptPages}
                on:click={() => deptPage++}
              >
                Next
              </Button>
            </div>
          </div>
        {/if}
        <!-- Summary -->
        {#if filteredDepts.length > 0}
          <div class="border-t bg-muted/50 px-6 py-4">
            <div class="flex items-center justify-between text-sm">
              <span class="font-medium">Total Capacity</span>
              <span class="font-semibold">{filteredDepts.reduce((sum, d) => sum + (d.capacity || 0), 0).toFixed(0)}h</span>
            </div>
            <div class="flex items-center justify-between text-sm mt-1">
              <span class="font-medium">Total Allocated</span>
              <span class="font-semibold">{filteredDepts.reduce((sum, d) => sum + (d.allocated || 0), 0).toFixed(0)}h</span>
            </div>
            <div class="flex items-center justify-between text-sm mt-1">
              <span class="font-medium">Average Utilization</span>
              <span class="font-semibold">{formatPercent(filteredDepts.reduce((sum, d) => sum + (d.utilization || 0), 0) / filteredDepts.length)}</span>
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
