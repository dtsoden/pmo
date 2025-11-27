<script lang="ts">
  import { page } from '$app/stores';
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import { api, type User, type ResourceAllocation, type Task, type TimeEntry } from '$lib/api/client';
  import { Card, Button, Badge, Avatar, Spinner, Modal } from '$components/shared';
  import { cn, fullName, formatDate, formatHours, ROLE_LABELS, TASK_STATUS_LABELS, getTaskStatusVariant, getTimezoneAbbreviation } from '$lib/utils';
  import {
    ArrowLeft,
    Edit,
    Mail,
    Phone,
    Building2,
    Calendar,
    FolderKanban,
    Clock,
    MapPin,
    Briefcase,
    DollarSign,
    Wrench,
    CheckCircle2,
    AlertCircle,
    ListTodo,
    TrendingUp,
  } from 'lucide-svelte';
  import { toast } from 'svelte-sonner';
  import UserForm from '../UserForm.svelte';
  import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';

  // SvelteKit props - must be declared to avoid warnings
  export let data: unknown = null;
  export let form: unknown = null;
  export let params: Record<string, string> = {};

  // Make userId reactive so it updates when params change
  $: userId = $page?.params?.id || '';

  let user: User | null = null;
  let allocations: ResourceAllocation[] = [];
  let tasks: Task[] = [];
  let recentTimeEntries: TimeEntry[] = [];
  let hoursThisWeek = 0;
  let hoursThisMonth = 0;
  let loading = true;
  let error = '';

  let showEditModal = false;

  // Date ranges for time queries
  const now = new Date();
  const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const weekEnd = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd');

  async function loadUser() {
    // Don't load if no userId
    if (!userId) {
      error = 'No user ID provided';
      loading = false;
      return;
    }

    loading = true;
    error = '';

    try {
      const [userData, allocationsData, tasksData, timeEntriesData] = await Promise.all([
        api.users.get(userId),
        api.resources.getByUser(userId).catch(() => null),
        // Get tasks assigned to this user
        api.timetracking.entries.list({ userId, startDate: monthStart, endDate: monthEnd, limit: 100 }).catch(() => ({ data: [] })),
        api.timetracking.entries.list({ userId, limit: 10 }).catch(() => ({ data: [] })),
      ]);

      user = userData;
      // Backend returns { assignments: [...], totalAllocatedHours, utilizationPercent }
      allocations = allocationsData?.assignments || [];
      recentTimeEntries = timeEntriesData?.data || [];

      // Calculate hours
      const monthEntries = tasksData?.data || [];
      hoursThisMonth = monthEntries.reduce((sum: number, e: TimeEntry) => sum + (e.hours || 0), 0);

      // Filter for this week
      const weekEntries = monthEntries.filter((e: TimeEntry) => {
        const entryDate = new Date(e.date);
        return entryDate >= new Date(weekStart) && entryDate <= new Date(weekEnd);
      });
      hoursThisWeek = weekEntries.reduce((sum: number, e: TimeEntry) => sum + (e.hours || 0), 0);
    } catch (err) {
      error = (err as { message?: string })?.message || 'Failed to load user';
    } finally {
      loading = false;
    }
  }

  function handleUserUpdated() {
    showEditModal = false;
    loadUser();
  }

  function getRoleBadgeVariant(role: string) {
    switch (role) {
      case 'SUPER_ADMIN':
      case 'ADMIN':
        return 'error';
      case 'PMO_MANAGER':
      case 'PROJECT_MANAGER':
        return 'info';
      case 'RESOURCE_MANAGER':
        return 'warning';
      default:
        return 'default';
    }
  }

  // Load when userId becomes available
  $: if (userId && browser) {
    loadUser();
  }

  $: totalAllocation = (allocations || []).reduce((sum, a) => sum + (a.allocatedHours || 0), 0);
  $: maxHours = user?.maxWeeklyHours || user?.defaultWeeklyHours || 40;
  $: utilizationPercent = maxHours > 0 ? Math.round((totalAllocation / maxHours) * 100) : 0;
</script>

<svelte:head>
  <title>{user ? fullName(user.firstName, user.lastName) : 'Team Member'} - PMO Platform</title>
</svelte:head>

{#if loading}
  <div class="flex justify-center py-12">
    <Spinner size="lg" />
  </div>
{:else if error}
  <Card class="p-6">
    <p class="text-center text-destructive">{error}</p>
    <div class="mt-4 text-center">
      <Button variant="outline" on:click={loadUser}>Retry</Button>
    </div>
  </Card>
{:else if user}
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <a
          href="/people"
          class="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft class="h-4 w-4" />
          Back to People
        </a>
        <div class="flex items-center gap-4">
          <Avatar
            firstName={user.firstName}
            lastName={user.lastName}
            src={user.avatarUrl}
            size="lg"
          />
          <div>
            <h1 class="text-2xl font-bold">{fullName(user.firstName, user.lastName)}</h1>
            {#if user.jobTitle}
              <p class="text-muted-foreground">{user.jobTitle}</p>
            {/if}
            <div class="mt-2 flex items-center gap-2">
              <Badge variant="default">
                {getTimezoneAbbreviation(user.timezone)}
              </Badge>
              <Badge variant={getRoleBadgeVariant(user.role)}>
                {ROLE_LABELS[user.role]}
              </Badge>
              <Badge variant={user.status === 'ACTIVE' ? 'success' : 'default'}>
                {user.status === 'ACTIVE' ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>
        </div>
      </div>
      <div class="flex gap-2">
        <Button variant="outline" on:click={() => (showEditModal = true)}>
          <Edit class="h-4 w-4" />
          Edit Profile
        </Button>
      </div>
    </div>

    <!-- Performance Summary Stats -->
    <div class="grid gap-4 md:grid-cols-4">
      <Card class="p-6">
        <div class="flex items-center gap-4">
          <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300">
            <Clock class="h-6 w-6" />
          </div>
          <div>
            <p class="text-sm text-muted-foreground">Hours This Week</p>
            <p class="text-2xl font-bold">{hoursThisWeek.toFixed(1)}h</p>
          </div>
        </div>
      </Card>

      <Card class="p-6">
        <div class="flex items-center gap-4">
          <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300">
            <TrendingUp class="h-6 w-6" />
          </div>
          <div>
            <p class="text-sm text-muted-foreground">Hours This Month</p>
            <p class="text-2xl font-bold">{hoursThisMonth.toFixed(1)}h</p>
          </div>
        </div>
      </Card>

      <Card class="p-6">
        <div class="flex items-center gap-4">
          <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300">
            <FolderKanban class="h-6 w-6" />
          </div>
          <div>
            <p class="text-sm text-muted-foreground">Active Projects</p>
            <p class="text-2xl font-bold">{allocations.length}</p>
          </div>
        </div>
      </Card>

      <Card class={cn("p-6", utilizationPercent > 100 && "border-red-200 dark:border-red-900")}>
        <div class="flex items-center gap-4">
          <div class={cn(
            "flex h-12 w-12 items-center justify-center rounded-lg",
            utilizationPercent > 100
              ? "bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300"
              : utilizationPercent > 80
              ? "bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-300"
              : "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300"
          )}>
            <AlertCircle class="h-6 w-6" />
          </div>
          <div>
            <p class="text-sm text-muted-foreground">Utilization</p>
            <p class={cn(
              "text-2xl font-bold",
              utilizationPercent > 100 ? "text-red-600 dark:text-red-400" : ""
            )}>
              {utilizationPercent}%
            </p>
          </div>
        </div>
      </Card>
    </div>

    <div class="grid gap-6 lg:grid-cols-3">
      <!-- Main Content -->
      <div class="space-y-6 lg:col-span-2">
        <!-- Project Assignments -->
        <Card>
          <div class="border-b px-6 py-4">
            <div class="flex items-center justify-between">
              <h2 class="font-semibold">Project Assignments</h2>
              <span class="text-sm text-muted-foreground">
                Total: {totalAllocation}h/week
              </span>
            </div>
          </div>
          {#if !allocations || allocations.length === 0}
            <div class="p-6 text-center text-muted-foreground">
              Not assigned to any projects
            </div>
          {:else}
            <div class="divide-y">
              {#each allocations as assignment}
                <div class="flex items-center justify-between px-6 py-4">
                  <div class="flex items-center gap-3">
                    <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <FolderKanban class="h-5 w-5" />
                    </div>
                    <div>
                      <a
                        href="/projects/{assignment.project?.id || assignment.projectId}"
                        class="font-medium hover:text-primary"
                      >
                        {assignment.project?.name || 'Unknown Project'}
                      </a>
                      <p class="text-sm text-muted-foreground">{assignment.role}</p>
                    </div>
                  </div>
                  <div class="text-right">
                    <p class="font-semibold">{assignment.allocatedHours}h/wk</p>
                    <p class="text-sm text-muted-foreground">{assignment.status}</p>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </Card>

        <!-- Recent Time Entries -->
        <Card>
          <div class="border-b px-6 py-4">
            <div class="flex items-center justify-between">
              <h2 class="font-semibold">Recent Time Entries</h2>
              <Button variant="ghost" size="sm" href="/time?userId={userId}">View All</Button>
            </div>
          </div>
          {#if !recentTimeEntries || recentTimeEntries.length === 0}
            <div class="p-6 text-center text-muted-foreground">
              No time entries recorded
            </div>
          {:else}
            <div class="divide-y">
              {#each recentTimeEntries.slice(0, 5) as entry}
                <div class="flex items-center justify-between px-6 py-3">
                  <div class="flex items-center gap-3">
                    <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                      <Clock class="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p class="text-sm font-medium">
                        {#if entry.sessions && entry.sessions.length > 0 && entry.sessions[0].description}
                          {entry.sessions[0].description}
                        {:else if entry.task?.title}
                          {entry.task.title}
                        {:else}
                          Time entry
                        {/if}
                      </p>
                      <p class="text-xs text-muted-foreground">
                        {formatDate(entry.date)}
                        {#if entry.task?.project?.name}
                          • {entry.task.project.name}
                        {/if}
                        {#if entry.sessions && entry.sessions.length > 1}
                          • {entry.sessions.length} sessions
                        {/if}
                      </p>
                    </div>
                  </div>
                  <div class="text-right">
                    <p class="font-semibold">{entry.hours?.toFixed(1)}h</p>
                    {#if entry.billableHours && entry.billableHours > 0}
                      <Badge variant="success" class="text-xs">{entry.billableHours.toFixed(1)}h billable</Badge>
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </Card>

        <!-- Allocation Chart -->
        <Card class="p-6">
          <h2 class="mb-4 font-semibold">Allocation Overview</h2>
          <div class="h-4 overflow-hidden rounded-full bg-muted">
            <div
              class={cn(
                'h-full transition-all',
                utilizationPercent > 100 ? 'bg-red-500' : utilizationPercent > 80 ? 'bg-amber-500' : 'bg-green-500'
              )}
              style="width: {Math.min(utilizationPercent, 100)}%"
            />
          </div>
          <div class="mt-2 flex justify-between text-sm">
            <span class="text-muted-foreground">0h</span>
            <span class={cn(
              utilizationPercent > 100 ? 'text-red-500 font-medium' : 'text-muted-foreground'
            )}>
              {totalAllocation}h / {maxHours}h ({utilizationPercent}%)
            </span>
            <span class="text-muted-foreground">{maxHours}h</span>
          </div>
        </Card>
      </div>

      <!-- Sidebar -->
      <div class="space-y-6">
        <!-- Capacity Card -->
        <Card>
          <div class="border-b px-6 py-4">
            <h2 class="font-semibold">Capacity</h2>
          </div>
          <div class="space-y-4 p-4">
            <div class="flex items-center gap-3">
              <Clock class="h-5 w-5 text-muted-foreground" />
              <div>
                <p class="text-sm font-medium">{user.defaultWeeklyHours || 40}h / week</p>
                <p class="text-xs text-muted-foreground">Default Hours</p>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <Clock class="h-5 w-5 text-muted-foreground" />
              <div>
                <p class="text-sm font-medium">{user.maxWeeklyHours || 40}h / week</p>
                <p class="text-xs text-muted-foreground">Maximum Hours</p>
              </div>
            </div>
            {#if user.employmentType}
              <div class="flex items-center gap-3">
                <Briefcase class="h-5 w-5 text-muted-foreground" />
                <span class="text-sm">{user.employmentType.replace('_', ' ')}</span>
              </div>
            {/if}
          </div>
        </Card>

        <!-- Contact Info -->
        <Card>
          <div class="border-b px-6 py-4">
            <h2 class="font-semibold">Contact Information</h2>
          </div>
          <div class="space-y-4 p-4">
            <div class="flex items-center gap-3">
              <Mail class="h-5 w-5 text-muted-foreground" />
              <a href="mailto:{user.email}" class="text-sm text-primary hover:underline">
                {user.email}
              </a>
            </div>
            {#if user.phone}
              <div class="flex items-center gap-3">
                <Phone class="h-5 w-5 text-muted-foreground" />
                <a href="tel:{user.phone}" class="text-sm hover:text-primary">
                  {user.phone}
                </a>
              </div>
            {/if}
            {#if user.department}
              <div class="flex items-center gap-3">
                <Building2 class="h-5 w-5 text-muted-foreground" />
                <span class="text-sm">{user.department}</span>
              </div>
            {/if}
            {#if user.country || user.region}
              <div class="flex items-center gap-3">
                <MapPin class="h-5 w-5 text-muted-foreground" />
                <span class="text-sm">
                  {[user.region, user.country].filter(Boolean).join(', ')}
                </span>
              </div>
            {/if}
            {#if user.timezone}
              <div class="flex items-center gap-3">
                <Calendar class="h-5 w-5 text-muted-foreground" />
                <span class="text-sm">{user.timezone}</span>
              </div>
            {/if}
          </div>
        </Card>

        <!-- Skills -->
        {#if user.skills && user.skills.length > 0}
          <Card>
            <div class="border-b px-6 py-4">
              <h2 class="font-semibold">Skills</h2>
            </div>
            <div class="p-4">
              <div class="flex flex-wrap gap-2">
                {#each user.skills as skill}
                  <Badge variant="default">
                    <Wrench class="mr-1 h-3 w-3" />
                    {skill}
                  </Badge>
                {/each}
              </div>
            </div>
          </Card>
        {/if}

        <!-- Billing Rates -->
        {#if user.hourlyRate || user.billableRate}
          <Card>
            <div class="border-b px-6 py-4">
              <h2 class="font-semibold">Billing Rates</h2>
            </div>
            <div class="space-y-3 p-4">
              {#if user.hourlyRate}
                <div class="flex items-center gap-3">
                  <DollarSign class="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p class="text-sm font-medium">${user.hourlyRate.toFixed(2)}/hr</p>
                    <p class="text-xs text-muted-foreground">Hourly Rate</p>
                  </div>
                </div>
              {/if}
              {#if user.billableRate}
                <div class="flex items-center gap-3">
                  <DollarSign class="h-5 w-5 text-green-500" />
                  <div>
                    <p class="text-sm font-medium">${user.billableRate.toFixed(2)}/hr</p>
                    <p class="text-xs text-muted-foreground">Billable Rate</p>
                  </div>
                </div>
              {/if}
            </div>
          </Card>
        {/if}

        <!-- Manager -->
        {#if user.manager}
          <Card>
            <div class="border-b px-6 py-4">
              <h2 class="font-semibold">Reports To</h2>
            </div>
            <div class="p-4">
              <a href="/people/{user.managerId}" class="flex items-center gap-3 hover:text-primary">
                <Avatar
                  firstName={user.manager.firstName}
                  lastName={user.manager.lastName}
                  size="sm"
                />
                <span class="text-sm font-medium">
                  {fullName(user.manager.firstName, user.manager.lastName)}
                </span>
              </a>
            </div>
          </Card>
        {/if}

        <!-- Metadata -->
        <Card>
          <div class="space-y-2 p-4 text-sm">
            <div class="flex justify-between">
              <span class="text-muted-foreground">Member Since</span>
              <span>{formatDate(user.createdAt)}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted-foreground">Last Updated</span>
              <span>{formatDate(user.updatedAt)}</span>
            </div>
            {#if user.lastLoginAt}
              <div class="flex justify-between">
                <span class="text-muted-foreground">Last Login</span>
                <span>{formatDate(user.lastLoginAt)}</span>
              </div>
            {/if}
          </div>
        </Card>
      </div>
    </div>
  </div>

  <!-- Edit Modal -->
  <UserForm
    bind:open={showEditModal}
    {user}
    on:success={handleUserUpdated}
  />

{/if}
