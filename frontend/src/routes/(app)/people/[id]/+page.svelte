<script lang="ts">
  import { page } from '$app/stores';
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import { api, type User, type ResourceAllocation, type Task, type TimeEntry, type TimeOffRequest } from '$lib/api/client';
  import { Card, Button, Badge, Avatar, Spinner, Modal } from '$components/shared';
  import { cn, fullName, formatDate, formatHours, ROLE_LABELS, TASK_STATUS_LABELS, getTaskStatusVariant, getTimezoneAbbreviation, TIME_OFF_STATUS_LABELS, TIME_OFF_TYPE_LABELS, getTimeOffStatusVariant } from '$lib/utils';
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
    CalendarDays,
    XCircle,
    Plane,
    Check,
    X,
    Users,
    UserPlus,
    Trash2,
    Plus,
  } from 'lucide-svelte';
  import { toast } from 'svelte-sonner';
  import UserForm from '../UserForm.svelte';
  import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, parseISO } from 'date-fns';

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
  let showAssignTeamModal = false;
  let showAssignProjectModal = false;
  let showEditProjectModal = false;
  let showDeleteModal = false;

  // Team assignment form
  let availableTeams: any[] = [];
  let loadingTeams = false;
  let selectedTeamId = '';
  let selectedTeamRole: 'LEAD' | 'SENIOR' | 'MEMBER' = 'MEMBER';
  let assigningTeam = false;

  // Project assignment form
  let availableProjects: any[] = [];
  let loadingProjects = false;
  let selectedProjectId = '';
  let projectRole = '';
  let projectHours = 40;
  let projectStartDate = '';
  let projectEndDate = '';
  let assigningProject = false;

  // Edit project assignment
  let editingAssignment: any = null;
  let updatingProject = false;

  // Availability and time-off
  let availability: any = null;
  let loadingAvailability = false;
  let timeOffRequests: TimeOffRequest[] = [];
  let pendingTimeOff: TimeOffRequest[] = [];
  let upcomingTimeOff: TimeOffRequest[] = [];

  // Rejection modal
  let showRejectModal = false;
  let selectedTimeOffId = '';
  let rejectionReason = '';
  let processingAction = false;

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

  async function loadAvailability() {
    if (!userId) return;

    loadingAvailability = true;
    try {
      const today = new Date();
      const startDate = format(today, 'yyyy-MM-dd');
      const endDate = format(addDays(today, 30), 'yyyy-MM-dd');

      const response = await api.capacity.availability.get(userId, {
        startDate,
        endDate,
      });

      availability = response.availability;
    } catch (err) {
      console.error('Failed to load availability:', err);
    } finally {
      loadingAvailability = false;
    }
  }

  async function loadTimeOff() {
    if (!userId) return;

    try {
      const response = await api.capacity.timeOff.listAll({ limit: 100 });
      const allRequests = response.data || [];

      // Filter for this user
      timeOffRequests = allRequests.filter((r: TimeOffRequest) => r.userId === userId);

      // Get pending requests
      pendingTimeOff = timeOffRequests.filter((r: TimeOffRequest) => r.status === 'PENDING');

      // Get upcoming approved time-off (within next 60 days)
      const sixtyDaysFromNow = addDays(now, 60);
      upcomingTimeOff = timeOffRequests.filter((r: TimeOffRequest) => {
        const startDate = new Date(r.startDate);
        return r.status === 'APPROVED' && startDate >= now && startDate <= sixtyDaysFromNow;
      });
    } catch (err) {
      console.error('Failed to load time-off:', err);
    }
  }

  async function approveTimeOff(id: string) {
    processingAction = true;
    try {
      await api.capacity.timeOff.approve(id);
      toast.success('Time-off request approved');
      await loadTimeOff();
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to approve request');
    } finally {
      processingAction = false;
    }
  }

  function openRejectModal(id: string) {
    selectedTimeOffId = id;
    rejectionReason = '';
    showRejectModal = true;
  }

  async function rejectTimeOff() {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    processingAction = true;
    try {
      await api.capacity.timeOff.reject(selectedTimeOffId, rejectionReason);
      toast.success('Time-off request rejected');
      showRejectModal = false;
      selectedTimeOffId = '';
      rejectionReason = '';
      await loadTimeOff();
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to reject request');
    } finally {
      processingAction = false;
    }
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

  // Team membership management
  async function loadAvailableTeams() {
    loadingTeams = true;
    try {
      const response = await api.teams.list({ limit: 100 });
      availableTeams = response.data || [];
    } catch (err) {
      toast.error('Failed to load teams');
    } finally {
      loadingTeams = false;
    }
  }

  async function assignToTeam() {
    if (!userId || !selectedTeamId) return;

    assigningTeam = true;
    try {
      await api.users.addToTeam(userId, selectedTeamId, selectedTeamRole);
      toast.success('Assigned to team successfully');
      showAssignTeamModal = false;
      selectedTeamId = '';
      selectedTeamRole = 'MEMBER';
      await loadUser();
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to assign to team');
    } finally {
      assigningTeam = false;
    }
  }

  async function removeFromTeam(teamId: string) {
    if (!userId) return;

    try {
      await api.users.removeFromTeam(userId, teamId);
      toast.success('Removed from team successfully');
      await loadUser();
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to remove from team');
    }
  }

  // Project assignment management
  async function loadAvailableProjects() {
    loadingProjects = true;
    try {
      const response = await api.projects.list({ limit: 100, status: 'ACTIVE' });
      availableProjects = response.data || [];
    } catch (err) {
      toast.error('Failed to load projects');
    } finally {
      loadingProjects = false;
    }
  }

  async function assignToProject() {
    if (!userId || !selectedProjectId || !projectRole || !projectStartDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    assigningProject = true;
    try {
      await api.users.assignToProject(userId, {
        projectId: selectedProjectId,
        role: projectRole,
        allocatedHours: projectHours,
        startDate: projectStartDate,
        endDate: projectEndDate || undefined,
      });
      toast.success('Assigned to project successfully');
      showAssignProjectModal = false;
      selectedProjectId = '';
      projectRole = '';
      projectHours = 40;
      projectStartDate = '';
      projectEndDate = '';
      await loadUser();
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to assign to project');
    } finally {
      assigningProject = false;
    }
  }

  function openEditProject(assignment: any) {
    editingAssignment = assignment;
    selectedProjectId = assignment.projectId;
    projectRole = assignment.role;
    projectHours = assignment.allocatedHours || 40;
    projectStartDate = assignment.startDate ? new Date(assignment.startDate).toISOString().split('T')[0] : '';
    projectEndDate = assignment.endDate ? new Date(assignment.endDate).toISOString().split('T')[0] : '';
    showEditProjectModal = true;
  }

  async function updateProjectAssignment() {
    if (!userId || !editingAssignment || !projectRole || !projectStartDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    updatingProject = true;
    try {
      // Remove old assignment
      await api.users.removeFromProject(userId, editingAssignment.projectId);
      // Add new assignment with updated data
      await api.users.assignToProject(userId, {
        projectId: selectedProjectId,
        role: projectRole,
        allocatedHours: projectHours,
        startDate: projectStartDate,
        endDate: projectEndDate || undefined,
      });
      toast.success('Project assignment updated successfully');
      showEditProjectModal = false;
      editingAssignment = null;
      selectedProjectId = '';
      projectRole = '';
      projectHours = 40;
      projectStartDate = '';
      projectEndDate = '';
      await loadUser();
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to update project assignment');
    } finally {
      updatingProject = false;
    }
  }

  async function removeFromProject(projectId: string) {
    if (!userId) return;

    try {
      await api.users.removeFromProject(userId, projectId);
      toast.success('Removed from project successfully');
      await loadUser();
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to remove from project');
    }
  }

  function calculateDuration(startDate: string, endDate?: string | null): string {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const weeks = Math.floor(diffDays / 7);

    if (endDate) {
      return `${weeks} weeks`;
    } else {
      return `${weeks} weeks (ongoing)`;
    }
  }

  // User deletion
  async function deleteUser() {
    if (!userId) return;

    try {
      await api.users.delete(userId);
      toast.success('User deleted successfully');
      showDeleteModal = false;
      window.location.href = '/people';
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to delete user');
    }
  }

  // Load teams when modal opens
  $: if (showAssignTeamModal && browser) {
    loadAvailableTeams();
  }

  // Load projects when modal opens
  $: if ((showAssignProjectModal || showEditProjectModal) && browser) {
    loadAvailableProjects();
  }

  // Load when userId becomes available
  $: if (userId && browser) {
    loadUser();
    loadAvailability();
    loadTimeOff();
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
              {#if user.deletedAt}
                <Badge variant="destructive">
                  Deleted
                </Badge>
              {/if}
            </div>
          </div>
        </div>
      </div>
      <div class="flex gap-2">
        <Button variant="outline" on:click={() => (showEditModal = true)}>
          <Edit class="h-4 w-4" />
          Edit Profile
        </Button>
        <Button variant="destructive" on:click={() => (showDeleteModal = true)}>
          <Trash2 class="h-4 w-4" />
          Delete User
        </Button>
      </div>
    </div>

    <!-- Time-Off Alerts -->
    {#if pendingTimeOff.length > 0 || upcomingTimeOff.length > 0}
      <!-- Pending Requests Banner -->
      {#if pendingTimeOff.length > 0}
        <Card class="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
          <div class="p-4">
            <div class="flex items-start gap-4">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-300">
                <AlertCircle class="h-5 w-5" />
              </div>
              <div class="flex-1">
                <h3 class="font-semibold text-amber-800 dark:text-amber-200">
                  Pending Time-Off Requests ({pendingTimeOff.length})
                </h3>
                <p class="text-sm text-amber-700 dark:text-amber-300 mb-3">
                  This employee has time-off requests awaiting your approval
                </p>
                <div class="space-y-2">
                  {#each pendingTimeOff as request}
                    <div class="flex items-center justify-between rounded-lg bg-white/60 dark:bg-amber-900/50 p-3">
                      <div class="flex items-center gap-3">
                        <Plane class="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        <div>
                          <span class="font-medium text-amber-900 dark:text-amber-100">
                            {TIME_OFF_TYPE_LABELS[request.type]} - {request.hours}h
                          </span>
                          <p class="text-xs text-amber-600 dark:text-amber-400">
                            {formatDate(request.startDate)} - {formatDate(request.endDate)}
                          </p>
                          {#if request.reason}
                            <p class="text-xs text-amber-700 dark:text-amber-300 italic mt-1">
                              {request.reason}
                            </p>
                          {/if}
                        </div>
                      </div>
                      <div class="flex gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          on:click={() => approveTimeOff(request.id)}
                          disabled={processingAction}
                        >
                          <Check class="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          on:click={() => openRejectModal(request.id)}
                          disabled={processingAction}
                        >
                          <X class="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  {/each}
                </div>
              </div>
            </div>
          </div>
        </Card>
      {/if}

      <!-- Upcoming Approved Time-Off -->
      {#if upcomingTimeOff.length > 0}
        <Card class="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
          <div class="p-4">
            <div class="flex items-start gap-4">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300">
                <Plane class="h-5 w-5" />
              </div>
              <div class="flex-1">
                <h3 class="font-semibold text-blue-800 dark:text-blue-200">
                  Upcoming Time-Off ({upcomingTimeOff.length})
                </h3>
                <p class="text-sm text-blue-700 dark:text-blue-300 mb-3">
                  This employee has approved time-off scheduled
                </p>
                <div class="space-y-2">
                  {#each upcomingTimeOff as request}
                    <div class="flex items-center gap-3 rounded-lg bg-white/60 dark:bg-blue-900/50 p-3">
                      <Plane class="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <div>
                        <span class="font-medium text-blue-900 dark:text-blue-100">
                          {TIME_OFF_TYPE_LABELS[request.type]} - {request.hours}h
                        </span>
                        <p class="text-xs text-blue-600 dark:text-blue-400">
                          {formatDate(request.startDate)} - {formatDate(request.endDate)}
                        </p>
                      </div>
                    </div>
                  {/each}
                </div>
              </div>
            </div>
          </div>
        </Card>
      {/if}
    {/if}

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
        <!-- Team Memberships -->
        <Card>
          <div class="border-b px-6 py-4">
            <div class="flex items-center justify-between">
              <h2 class="font-semibold">Team Memberships</h2>
              <Button size="sm" on:click={() => (showAssignTeamModal = true)}>
                <UserPlus class="h-4 w-4 mr-1" />
                Assign to Team
              </Button>
            </div>
          </div>
          {#if !user?.teamMemberships || user.teamMemberships.length === 0}
            <div class="p-6 text-center text-muted-foreground">
              Not a member of any teams
            </div>
          {:else}
            <div class="divide-y">
              {#each user.teamMemberships as membership}
                <div class="flex items-center justify-between px-6 py-4">
                  <div class="flex items-center gap-3">
                    <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Users class="h-5 w-5" />
                    </div>
                    <div>
                      <a
                        href="/teams/{membership.team.id}"
                        class="font-medium hover:text-primary"
                      >
                        {membership.team.name}
                      </a>
                      {#if membership.team.description}
                        <p class="text-sm text-muted-foreground">{membership.team.description}</p>
                      {/if}
                    </div>
                  </div>
                  <div class="flex items-center gap-3">
                    <div class="text-right">
                      <Badge variant="default">{membership.role}</Badge>
                      <p class="text-xs text-muted-foreground mt-1">
                        Joined {formatDate(membership.joinedAt)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      on:click={() => removeFromTeam(membership.team.id)}
                    >
                      <X class="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </Card>

        <!-- Project Assignments -->
        <Card>
          <div class="border-b px-6 py-4">
            <div class="flex items-center justify-between">
              <div>
                <h2 class="font-semibold">Project Assignments</h2>
                <span class="text-xs text-muted-foreground">
                  Total: {totalAllocation}h/week
                </span>
              </div>
              <Button size="sm" on:click={() => (showAssignProjectModal = true)}>
                <Plus class="h-4 w-4 mr-1" />
                Assign to Project
              </Button>
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
                    <div class="flex-1">
                      <a
                        href="/projects/{assignment.project?.id || assignment.projectId}"
                        class="font-medium hover:text-primary"
                      >
                        {assignment.project?.name || 'Unknown Project'}
                      </a>
                      <p class="text-sm text-muted-foreground">{assignment.role}</p>
                      <div class="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        {#if assignment.startDate}
                          <span class="flex items-center gap-1">
                            <Calendar class="h-3 w-3" />
                            {formatDate(assignment.startDate)}
                            {#if assignment.endDate}
                              → {formatDate(assignment.endDate)}
                            {:else}
                              → ongoing
                            {/if}
                          </span>
                        {/if}
                        {#if assignment.startDate}
                          <span class="flex items-center gap-1">
                            <Clock class="h-3 w-3" />
                            {calculateDuration(assignment.startDate, assignment.endDate)}
                          </span>
                        {/if}
                      </div>
                    </div>
                  </div>
                  <div class="flex items-center gap-3">
                    <div class="text-right">
                      <p class="font-semibold">{assignment.allocatedHours}h/wk</p>
                      <Badge variant="default" class="text-xs">{assignment.status}</Badge>
                    </div>
                    <div class="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        on:click={() => openEditProject(assignment)}
                      >
                        <Edit class="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        on:click={() => removeFromProject(assignment.project?.id || assignment.projectId, assignment.project?.name || 'this project')}
                      >
                        <X class="h-4 w-4" />
                      </Button>
                    </div>
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

        <!-- Availability & Time-Off -->
        <Card>
          <div class="border-b px-6 py-4">
            <div class="flex items-center justify-between">
              <h2 class="font-semibold">Availability (Next 30 Days)</h2>
              <Button variant="ghost" size="sm" href="/capacity/time-off">
                View All
              </Button>
            </div>
          </div>
          {#if loadingAvailability}
            <div class="p-12 text-center">
              <Spinner />
            </div>
          {:else if !availability}
            <div class="p-6 text-center text-muted-foreground">
              No availability data
            </div>
          {:else}
            <div class="p-6">
              <div class="grid grid-cols-7 gap-2">
                {#each (availability.availability || []).slice(0, 28) as day}
                  {@const isTimeOff = day.timeOff}
                  {@const isUnavailable = day.type === 'UNAVAILABLE' && !day.timeOff}
                  {@const isPartial = day.type === 'PARTIAL'}
                  {@const isWeekend = new Date(day.date).getDay() === 0 || new Date(day.date).getDay() === 6}

                  <div
                    class={cn(
                      'relative flex flex-col items-center justify-center rounded-md border p-2 text-center transition-all hover:shadow-sm',
                      isTimeOff && 'border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/20',
                      isUnavailable && !isTimeOff && 'border-muted bg-muted/30',
                      isPartial && 'border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20',
                      !isTimeOff && !isUnavailable && !isPartial && isWeekend && 'bg-muted/20',
                      !isTimeOff && !isUnavailable && !isPartial && !isWeekend && 'border-green-200 bg-green-50 dark:border-green-900/50 dark:bg-green-950/20'
                    )}
                    title={day.timeOff
                      ? `${day.timeOff.type}: ${day.timeOff.hours}h${day.timeOff.reason ? ' - ' + day.timeOff.reason : ''}`
                      : day.notes || ''}
                  >
                    <div class="text-[10px] font-medium text-muted-foreground">
                      {format(parseISO(day.date), 'MMM d')}
                    </div>
                    <div class="text-xs font-semibold">
                      {#if isTimeOff}
                        <div class="flex items-center gap-1 text-red-600 dark:text-red-400">
                          <XCircle class="h-3 w-3" />
                          <span class="text-[10px]">{day.timeOff.type.slice(0, 3)}</span>
                        </div>
                      {:else if isUnavailable}
                        <span class="text-muted-foreground">-</span>
                      {:else}
                        <span class={cn(
                          isPartial && 'text-amber-600 dark:text-amber-400',
                          !isPartial && !isWeekend && 'text-green-600 dark:text-green-400',
                          isWeekend && 'text-muted-foreground'
                        )}>
                          {day.availableHours.toFixed(0)}h
                        </span>
                      {/if}
                    </div>
                  </div>
                {/each}
              </div>

              <!-- Legend -->
              <div class="mt-4 flex flex-wrap gap-4 border-t pt-4 text-xs">
                <div class="flex items-center gap-2">
                  <div class="h-3 w-3 rounded border border-green-200 bg-green-50 dark:border-green-900/50 dark:bg-green-950/20"></div>
                  <span class="text-muted-foreground">Available</span>
                </div>
                <div class="flex items-center gap-2">
                  <div class="h-3 w-3 rounded border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20"></div>
                  <span class="text-muted-foreground">Partial</span>
                </div>
                <div class="flex items-center gap-2">
                  <div class="h-3 w-3 rounded border border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/20"></div>
                  <span class="text-muted-foreground">Time Off</span>
                </div>
                <div class="flex items-center gap-2">
                  <div class="h-3 w-3 rounded border border-muted bg-muted/30"></div>
                  <span class="text-muted-foreground">Unavailable</span>
                </div>
              </div>
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

  <!-- Rejection Modal -->
  <Modal bind:open={showRejectModal} title="Reject Time-Off Request" size="md">
    <div class="space-y-4">
      <p class="text-sm text-muted-foreground">
        Please provide a reason for rejecting this time-off request. This will be visible to the employee.
      </p>
      <div>
        <label for="rejection-reason" class="mb-2 block text-sm font-medium">
          Rejection Reason <span class="text-destructive">*</span>
        </label>
        <textarea
          id="rejection-reason"
          bind:value={rejectionReason}
          rows="4"
          class="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="e.g., Overlaps with critical project deadline, insufficient coverage during requested period, etc."
          required
        ></textarea>
        <p class="mt-1 text-xs text-muted-foreground">
          Be clear and professional - the employee will see this explanation.
        </p>
      </div>
    </div>

    <div slot="footer" class="flex justify-end gap-2">
      <Button
        variant="outline"
        on:click={() => {
          showRejectModal = false;
          selectedTimeOffId = '';
          rejectionReason = '';
        }}
      >
        Cancel
      </Button>
      <Button
        variant="destructive"
        on:click={rejectTimeOff}
        loading={processingAction}
        disabled={!rejectionReason.trim()}
      >
        <X class="mr-2 h-4 w-4" />
        Reject Request
      </Button>
    </div>
  </Modal>

  <!-- Assign to Team Modal -->
  <Modal bind:open={showAssignTeamModal} title="Assign to Team" size="md">
    <div class="space-y-4">
      {#if loadingTeams}
        <div class="py-8 text-center">
          <Spinner />
        </div>
      {:else}
        <div>
          <label for="team-select" class="mb-2 block text-sm font-medium">
            Team <span class="text-destructive">*</span>
          </label>
          <select
            id="team-select"
            bind:value={selectedTeamId}
            class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            required
          >
            <option value="">Select a team...</option>
            {#each availableTeams as team}
              <option value={team.id}>{team.name}</option>
            {/each}
          </select>
        </div>

        <div>
          <label for="team-role" class="mb-2 block text-sm font-medium">
            Role <span class="text-destructive">*</span>
          </label>
          <select
            id="team-role"
            bind:value={selectedTeamRole}
            class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            required
          >
            <option value="MEMBER">Member</option>
            <option value="SENIOR">Senior</option>
            <option value="LEAD">Lead</option>
          </select>
        </div>
      {/if}
    </div>

    <div slot="footer" class="flex justify-end gap-2">
      <Button variant="outline" on:click={() => (showAssignTeamModal = false)}>
        Cancel
      </Button>
      <Button
        variant="default"
        on:click={assignToTeam}
        loading={assigningTeam}
        disabled={!selectedTeamId || loadingTeams}
      >
        <UserPlus class="mr-2 h-4 w-4" />
        Assign to Team
      </Button>
    </div>
  </Modal>

  <!-- Assign to Project Modal -->
  <Modal bind:open={showAssignProjectModal} title="Assign to Project" size="lg">
    <div class="space-y-4">
      {#if loadingProjects}
        <div class="py-8 text-center">
          <Spinner />
        </div>
      {:else}
        <div>
          <label for="project-select" class="mb-2 block text-sm font-medium">
            Project <span class="text-destructive">*</span>
          </label>
          <select
            id="project-select"
            bind:value={selectedProjectId}
            class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            required
          >
            <option value="">Select a project...</option>
            {#each availableProjects as project}
              <option value={project.id}>{project.name} ({project.code})</option>
            {/each}
          </select>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="project-role" class="mb-2 block text-sm font-medium">
              Role <span class="text-destructive">*</span>
            </label>
            <input
              id="project-role"
              type="text"
              bind:value={projectRole}
              placeholder="e.g., Developer, Designer, PM"
              class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              required
            />
          </div>

          <div>
            <label for="project-hours" class="mb-2 block text-sm font-medium">
              Hours per Week <span class="text-destructive">*</span>
            </label>
            <input
              id="project-hours"
              type="number"
              bind:value={projectHours}
              min="0"
              max="168"
              class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              required
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="project-start" class="mb-2 block text-sm font-medium">
              Start Date <span class="text-destructive">*</span>
            </label>
            <input
              id="project-start"
              type="date"
              bind:value={projectStartDate}
              class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              required
            />
          </div>

          <div>
            <label for="project-end" class="mb-2 block text-sm font-medium">
              End Date (Optional)
            </label>
            <input
              id="project-end"
              type="date"
              bind:value={projectEndDate}
              min={projectStartDate}
              class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>
      {/if}
    </div>

    <div slot="footer" class="flex justify-end gap-2">
      <Button variant="outline" on:click={() => (showAssignProjectModal = false)}>
        Cancel
      </Button>
      <Button
        variant="default"
        on:click={assignToProject}
        loading={assigningProject}
        disabled={!selectedProjectId || !projectRole || !projectStartDate || loadingProjects}
      >
        <Plus class="mr-2 h-4 w-4" />
        Assign to Project
      </Button>
    </div>
  </Modal>

  <!-- Edit Project Assignment Modal -->
  <Modal bind:open={showEditProjectModal} title="Edit Project Assignment" size="lg">
    <div class="space-y-4">
      {#if loadingProjects}
        <div class="py-8 text-center">
          <Spinner />
        </div>
      {:else}
        <div>
          <label for="edit-project-select" class="mb-2 block text-sm font-medium">
            Project <span class="text-destructive">*</span>
          </label>
          <select
            id="edit-project-select"
            bind:value={selectedProjectId}
            class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            required
          >
            <option value="">Select a project...</option>
            {#each availableProjects as project}
              <option value={project.id}>{project.name} ({project.code})</option>
            {/each}
          </select>
          <p class="mt-1 text-xs text-muted-foreground">
            Changing the project will create a new assignment
          </p>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="edit-project-role" class="mb-2 block text-sm font-medium">
              Role <span class="text-destructive">*</span>
            </label>
            <input
              id="edit-project-role"
              type="text"
              bind:value={projectRole}
              placeholder="e.g., Developer, Designer, PM"
              class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              required
            />
          </div>

          <div>
            <label for="edit-project-hours" class="mb-2 block text-sm font-medium">
              Hours per Week <span class="text-destructive">*</span>
            </label>
            <input
              id="edit-project-hours"
              type="number"
              bind:value={projectHours}
              min="0"
              max="168"
              class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              required
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="edit-project-start" class="mb-2 block text-sm font-medium">
              Start Date <span class="text-destructive">*</span>
            </label>
            <input
              id="edit-project-start"
              type="date"
              bind:value={projectStartDate}
              class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              required
            />
          </div>

          <div>
            <label for="edit-project-end" class="mb-2 block text-sm font-medium">
              End Date (Optional)
            </label>
            <input
              id="edit-project-end"
              type="date"
              bind:value={projectEndDate}
              min={projectStartDate}
              class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>
      {/if}
    </div>

    <div slot="footer" class="flex justify-end gap-2">
      <Button variant="outline" on:click={() => {
        showEditProjectModal = false;
        editingAssignment = null;
      }}>
        Cancel
      </Button>
      <Button
        variant="default"
        on:click={updateProjectAssignment}
        loading={updatingProject}
        disabled={!selectedProjectId || !projectRole || !projectStartDate || loadingProjects}
      >
        <Edit class="mr-2 h-4 w-4" />
        Update Assignment
      </Button>
    </div>
  </Modal>

  <!-- Delete User Confirmation Modal -->
  <Modal bind:open={showDeleteModal} title="Delete User" size="md">
    <div class="space-y-4">
      <div class="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
        <div class="flex gap-3">
          <AlertCircle class="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <p class="font-medium text-destructive">Warning: This action will soft-delete the user</p>
            <p class="mt-1 text-sm text-muted-foreground">
              The user will be marked as deleted and hidden from most views. Admin users can restore deleted users if needed.
            </p>
          </div>
        </div>
      </div>

      {#if user}
        <p class="text-sm">
          Are you sure you want to delete <span class="font-semibold">{fullName(user.firstName, user.lastName)}</span>?
        </p>
      {/if}
    </div>

    <div slot="footer" class="flex justify-end gap-2">
      <Button variant="outline" on:click={() => (showDeleteModal = false)}>
        Cancel
      </Button>
      <Button variant="destructive" on:click={deleteUser}>
        <Trash2 class="mr-2 h-4 w-4" />
        Delete User
      </Button>
    </div>
  </Modal>

{/if}
