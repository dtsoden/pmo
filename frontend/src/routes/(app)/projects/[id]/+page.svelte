<script lang="ts">
  import { page } from '$app/stores';
  import { browser } from '$app/environment';
  import { onMount, onDestroy } from 'svelte';
  import { api, type ProjectDetail, type Task } from '$lib/api/client';
  import { ws } from '$lib/stores/websocket';
  import { Card, Button, Badge, Avatar, Spinner, EmptyState, Modal, SearchableSelect } from '$components/shared';
  import {
    cn,
    formatDate,
    formatCurrency,
    fullName,
    getProjectStatusVariant,
    getTaskStatusVariant,
    getPriorityVariant,
    PROJECT_STATUS_LABELS,
    TASK_STATUS_LABELS,
    PRIORITY_LABELS,
  } from '$lib/utils';
  import {
    ArrowLeft,
    Edit,
    Trash2,
    Plus,
    Users,
    Calendar,
    DollarSign,
    CheckCircle2,
    Clock,
    UsersRound,
    X,
  } from 'lucide-svelte';
  import { toast } from 'svelte-sonner';
  import ProjectForm from '../ProjectForm.svelte';
  import TaskForm from './TaskForm.svelte';
  import MilestoneForm from '../MilestoneForm.svelte';
  import PhaseForm from '../PhaseForm.svelte';

  // SvelteKit props - must be declared to avoid warnings
  export let data: unknown = null;
  export let form: unknown = null;
  export let params: Record<string, string> = {};

  const projectId = $page?.params?.id ?? '';

  let project: ProjectDetail | null = null;
  let tasks: Task[] = [];
  let loading = true;
  let error = '';

  let showEditModal = false;
  let showDeleteModal = false;
  let showTaskModal = false;
  let showAssignTeamModal = false;
  let showEditTeamModal = false;
  let showAssignPersonModal = false;
  let showEditPersonModal = false;
  let showMilestoneModal = false;
  let showPhaseModal = false;
  let deleting = false;

  // Team assignment state
  let availableTeams: any[] = [];
  let selectedTeamId = '';
  let teamHours = 40;
  let teamStartDate = '';
  let teamEndDate = '';
  let assigningTeam = false;
  let editingTeamAssignment: any = null;
  let updatingTeam = false;
  let loadingTeams = false;
  let teamSearchTimeout: ReturnType<typeof setTimeout> | null = null;

  // Person assignment state
  let availablePeople: any[] = [];
  let selectedPersonId = '';
  let personRole = '';
  let personHours = 40;
  let personStartDate = '';
  let personEndDate = '';
  let assigningPerson = false;
  let editingPersonAssignment: any = null;
  let updatingPerson = false;
  let loadingPeople = false;
  let personSearchTimeout: ReturnType<typeof setTimeout> | null = null;

  // Milestone and phase state
  let editingMilestone: any = null;
  let editingPhase: any = null;

  // Task state
  let editingTask: any = null;

  async function loadProject() {
    loading = true;
    error = '';

    try {
      const [projectData, tasksData] = await Promise.all([
        api.projects.get(projectId),
        api.projects.tasks.list(projectId),
      ]);

      project = projectData;
      tasks = tasksData || [];
    } catch (err) {
      error = (err as { message?: string })?.message || 'Failed to load project';
    } finally {
      loading = false;
    }
  }

  async function handleDelete() {
    deleting = true;

    try {
      await api.projects.delete(projectId);
      toast.success('Project deleted successfully');
      if (browser) {
        window.location.href = '/projects';
      }
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to delete project');
    } finally {
      deleting = false;
      showDeleteModal = false;
    }
  }

  function handleProjectUpdated() {
    showEditModal = false;
    loadProject();
  }

  function handleTaskCreated() {
    showTaskModal = false;
    loadProject();
  }

  // Team assignment functions
  async function loadAvailableTeams(search = '') {
    loadingTeams = true;
    try {
      const response = await api.teams.list({ limit: 20, search: search || undefined });
      const assignedTeamIds = project?.teamAssignments?.map((a) => a.team.id) || [];
      availableTeams = (response.data || []).filter((t) => !assignedTeamIds.includes(t.id));
    } catch (err) {
      toast.error('Failed to load teams');
    } finally {
      loadingTeams = false;
    }
  }

  function handleTeamSearch(event: CustomEvent<{ query: string }>) {
    const query = event.detail.query;

    // Clear existing timeout
    if (teamSearchTimeout) {
      clearTimeout(teamSearchTimeout);
    }

    // Debounce search
    teamSearchTimeout = setTimeout(() => {
      loadAvailableTeams(query);
    }, 300);
  }

  async function openAssignTeamModal() {
    selectedTeamId = '';
    teamHours = 40;
    teamStartDate = '';
    teamEndDate = '';
    showAssignTeamModal = true;
    await loadAvailableTeams();
  }

  async function assignTeam() {
    if (!selectedTeamId || !projectId || !teamHours || !teamStartDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    assigningTeam = true;
    try {
      await api.projects.teams.assign(projectId, {
        teamId: selectedTeamId,
        allocatedHours: teamHours,
        startDate: teamStartDate,
        endDate: teamEndDate || undefined,
      });
      toast.success('Team assigned to project successfully');
      showAssignTeamModal = false;
      selectedTeamId = '';
      teamHours = 40;
      teamStartDate = '';
      teamEndDate = '';
      await loadProject();
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to assign team');
    } finally {
      assigningTeam = false;
    }
  }

  function openEditTeamModal(assignment: any) {
    editingTeamAssignment = assignment;
    selectedTeamId = assignment.team?.id || assignment.teamId;
    teamHours = assignment.allocatedHours || 40;
    teamStartDate = assignment.startDate ? new Date(assignment.startDate).toISOString().split('T')[0] : '';
    teamEndDate = assignment.endDate ? new Date(assignment.endDate).toISOString().split('T')[0] : '';
    showEditTeamModal = true;
    loadAvailableTeams();
  }

  async function updateTeamAssignment() {
    if (!projectId || !editingTeamAssignment || !teamHours || !teamStartDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    updatingTeam = true;
    try {
      // Backend doesn't have update endpoint, so we remove and re-create
      const teamId = editingTeamAssignment.team?.id || editingTeamAssignment.teamId;
      await api.projects.teams.remove(projectId, editingTeamAssignment.id);
      await api.projects.teams.assign(projectId, {
        teamId,
        allocatedHours: teamHours,
        startDate: teamStartDate,
        endDate: teamEndDate || undefined,
      });
      toast.success('Team assignment updated successfully');
      showEditTeamModal = false;
      editingTeamAssignment = null;
      selectedTeamId = '';
      teamHours = 40;
      teamStartDate = '';
      teamEndDate = '';
      await loadProject();
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to update team assignment');
    } finally {
      updatingTeam = false;
    }
  }

  async function removeTeam(assignmentId: string, teamName: string) {
    if (!projectId) return;
    if (!confirm(`Remove team "${teamName}" from this project?`)) {
      return;
    }

    try {
      await api.projects.teams.remove(projectId, assignmentId);
      toast.success('Team removed from project successfully');
      await loadProject();
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to remove team');
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

  // Person assignment functions
  async function loadAvailablePeople(search = '') {
    loadingPeople = true;
    try {
      const response = await api.users.list({ limit: 20, search: search || undefined, status: 'ACTIVE' });
      const assignedUserIds = project?.assignments?.map((a) => a.user.id) || [];
      availablePeople = (response.data || []).filter((u) => !assignedUserIds.includes(u.id));
    } catch (err) {
      toast.error('Failed to load people');
    } finally {
      loadingPeople = false;
    }
  }

  function handlePersonSearch(event: CustomEvent<{ query: string }>) {
    const query = event.detail.query;

    // Clear existing timeout
    if (personSearchTimeout) {
      clearTimeout(personSearchTimeout);
    }

    // Debounce search
    personSearchTimeout = setTimeout(() => {
      loadAvailablePeople(query);
    }, 300);
  }

  async function openAssignPersonModal() {
    selectedPersonId = '';
    personRole = '';
    personHours = 40;
    personStartDate = '';
    personEndDate = '';
    showAssignPersonModal = true;
    await loadAvailablePeople();
  }

  async function assignPerson() {
    if (!selectedPersonId || !projectId || !personRole || !personHours || !personStartDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    assigningPerson = true;
    try {
      await api.projects.assignments.create(projectId, {
        userId: selectedPersonId,
        role: personRole,
        allocatedHours: personHours,
        startDate: personStartDate,
        endDate: personEndDate || undefined,
      });
      toast.success('Person assigned to project successfully');
      showAssignPersonModal = false;
      selectedPersonId = '';
      personRole = '';
      personHours = 40;
      personStartDate = '';
      personEndDate = '';
      await loadProject();
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to assign person');
    } finally {
      assigningPerson = false;
    }
  }

  function openEditPersonModal(assignment: any) {
    editingPersonAssignment = assignment;
    selectedPersonId = assignment.user?.id || assignment.userId;
    personRole = assignment.role || '';
    personHours = assignment.allocatedHours || 40;
    personStartDate = assignment.startDate ? new Date(assignment.startDate).toISOString().split('T')[0] : '';
    personEndDate = assignment.endDate ? new Date(assignment.endDate).toISOString().split('T')[0] : '';
    showEditPersonModal = true;
    loadAvailablePeople();
  }

  async function updatePersonAssignment() {
    if (!projectId || !editingPersonAssignment || !personRole || !personHours || !personStartDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    updatingPerson = true;
    try {
      // Backend doesn't have update endpoint, so we remove and re-create
      const userId = editingPersonAssignment.user?.id || editingPersonAssignment.userId;
      await api.projects.assignments.delete(projectId, userId);
      await api.projects.assignments.create(projectId, {
        userId,
        role: personRole,
        allocatedHours: personHours,
        startDate: personStartDate,
        endDate: personEndDate || undefined,
      });
      toast.success('Person assignment updated successfully');
      showEditPersonModal = false;
      editingPersonAssignment = null;
      selectedPersonId = '';
      personRole = '';
      personHours = 40;
      personStartDate = '';
      personEndDate = '';
      await loadProject();
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to update person assignment');
    } finally {
      updatingPerson = false;
    }
  }

  async function removePerson(userId: string, personName: string) {
    if (!projectId) return;
    if (!confirm(`Remove "${personName}" from this project?`)) {
      return;
    }

    try {
      await api.projects.assignments.delete(projectId, userId);
      toast.success('Person removed from project successfully');
      await loadProject();
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to remove person');
    }
  }

  // Milestone functions
  function openCreateMilestoneModal() {
    editingMilestone = null;
    showMilestoneModal = true;
  }

  function openEditMilestoneModal(milestone: any) {
    editingMilestone = milestone;
    showMilestoneModal = true;
  }

  async function deleteMilestone(milestoneId: string, milestoneName: string) {
    if (!projectId) return;
    if (!confirm(`Delete milestone "${milestoneName}"?`)) {
      return;
    }

    try {
      await api.projects.milestones.delete(projectId, milestoneId);
      toast.success('Milestone deleted successfully');
      await loadProject();
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to delete milestone');
    }
  }

  function handleMilestoneSuccess() {
    showMilestoneModal = false;
    loadProject();
  }

  // Phase functions
  function openCreatePhaseModal() {
    editingPhase = null;
    showPhaseModal = true;
  }

  function openEditPhaseModal(phase: any) {
    editingPhase = phase;
    showPhaseModal = true;
  }

  async function deletePhase(phaseId: string, phaseName: string) {
    if (!projectId) return;
    if (!confirm(`Delete phase "${phaseName}"?`)) {
      return;
    }

    try {
      await api.projects.phases.delete(projectId, phaseId);
      toast.success('Phase deleted successfully');
      await loadProject();
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to delete phase');
    }
  }

  function handlePhaseSuccess() {
    showPhaseModal = false;
    loadProject();
  }

  // Task functions
  function openEditTaskModal(task: Task) {
    editingTask = task;
    showTaskModal = true;
  }

  function openCreateTaskModal() {
    editingTask = null;
    showTaskModal = true;
  }

  async function deleteTask(taskId: string, taskTitle: string) {
    if (!projectId) return;
    if (!confirm(`Delete task "${taskTitle}"?`)) {
      return;
    }

    try {
      await api.projects.tasks.delete(projectId, taskId);
      toast.success('Task deleted successfully');
      await loadProject();
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to delete task');
    }
  }

  onMount(() => {
    loadProject();

    // Join project room for real-time updates
    ws.joinProject(projectId);

    const unsubscribe = ws.on('project:updated', (data: unknown) => {
      const event = data as { projectId: string };
      if (event.projectId === projectId) {
        loadProject();
      }
    });

    return () => {
      unsubscribe();
      ws.leaveProject(projectId);
    };
  });

  $: completedTasks = tasks.filter((t) => t.status === 'COMPLETED').length;
  $: progress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;
</script>

<svelte:head>
  <title>{project?.name || 'Project'} - PMO</title>
</svelte:head>

{#if loading}
  <div class="flex justify-center py-12">
    <Spinner size="lg" />
  </div>
{:else if error}
  <Card class="p-6">
    <p class="text-center text-destructive">{error}</p>
    <div class="mt-4 text-center">
      <Button variant="outline" on:click={loadProject}>Retry</Button>
    </div>
  </Card>
{:else if project}
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <a
          href="/projects"
          class="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft class="h-4 w-4" />
          Back to Projects
        </a>
        <div class="flex items-center gap-3">
          <h1 class="text-2xl font-bold">{project.name}</h1>
          <span class="text-muted-foreground">({project.code})</span>
        </div>
        {#if project.client}
          <p class="mt-1 text-sm font-medium">
            <span class="text-muted-foreground">Client:</span> {project.client.name}
          </p>
        {/if}
        {#if project.description}
          <p class="mt-1 text-muted-foreground">{project.description}</p>
        {/if}
        <div class="mt-2 flex items-center gap-3">
          <Badge variant={getPriorityVariant(project.priority)}>
            {PRIORITY_LABELS[project.priority]}
          </Badge>
          <Badge variant={getProjectStatusVariant(project.status)}>
            {PROJECT_STATUS_LABELS[project.status]}
          </Badge>
        </div>
      </div>
      <div class="flex gap-2">
        <Button variant="outline" on:click={() => (showEditModal = true)}>
          <Edit class="h-4 w-4" />
          Edit
        </Button>
        <Button variant="destructive" on:click={() => (showDeleteModal = true)}>
          <Trash2 class="h-4 w-4" />
          Delete
        </Button>
      </div>
    </div>

    <!-- Stats -->
    <div class="grid gap-4 md:grid-cols-4">
      <Card class="p-4">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300">
            <Users class="h-5 w-5" />
          </div>
          <div>
            <p class="text-sm text-muted-foreground">Resources</p>
            <p class="text-xl font-semibold">
              {project.assignments.length + (project.teamAssignments?.length || 0)}
            </p>
            <p class="text-xs text-muted-foreground">
              {project.teamAssignments?.length || 0} teams, {project.assignments.length} individuals
            </p>
          </div>
        </div>
      </Card>

      <Card class="p-4">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300">
            <CheckCircle2 class="h-5 w-5" />
          </div>
          <div>
            <p class="text-sm text-muted-foreground">Progress</p>
            <p class="text-xl font-semibold">{progress}%</p>
          </div>
        </div>
      </Card>

      <Card class="p-4">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-300">
            <Calendar class="h-5 w-5" />
          </div>
          <div>
            <p class="text-sm text-muted-foreground">Timeline</p>
            <p class="text-sm font-medium">
              {formatDate(project.startDate)} - {formatDate(project.endDate)}
            </p>
          </div>
        </div>
      </Card>

      <Card class="p-4">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300">
            <DollarSign class="h-5 w-5" />
          </div>
          <div>
            <p class="text-sm text-muted-foreground">Budget</p>
            {#if project.budgetCost || project.budgetHours}
              <div class="space-y-0.5">
                {#if project.budgetCost}
                  <p class="text-lg font-semibold">{formatCurrency(project.budgetCost)}</p>
                {/if}
                {#if project.budgetHours}
                  <p class="text-sm text-muted-foreground">{project.budgetHours}h allocated</p>
                {/if}
              </div>
            {:else}
              <p class="text-sm text-muted-foreground">Not set</p>
            {/if}
          </div>
        </div>
      </Card>
    </div>

    <div class="grid gap-6 lg:grid-cols-3">
      <!-- Tasks -->
      <div class="lg:col-span-2">
        <Card>
          <div class="flex items-center justify-between border-b px-6 py-4">
            <h2 class="font-semibold">Tasks ({tasks.length})</h2>
            <Button size="sm" on:click={openCreateTaskModal}>
              <Plus class="h-4 w-4" />
              Add Task
            </Button>
          </div>
          <div class="divide-y">
            {#if tasks.length === 0}
              <EmptyState
                title="No tasks"
                description="Add tasks to track work on this project"
                class="py-8"
              >
                <svelte:fragment slot="action">
                  <Button size="sm" on:click={openCreateTaskModal}>
                    <Plus class="h-4 w-4" />
                    Add Task
                  </Button>
                </svelte:fragment>
              </EmptyState>
            {:else}
              {#each tasks as task}
                <div class="flex items-center justify-between px-6 py-4">
                  <div class="flex-1">
                    <p class="font-medium">{task.title}</p>
                    <div class="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                      {#if task.dueDate}
                        <span class="flex items-center gap-1">
                          <Clock class="h-3 w-3" />
                          {formatDate(task.dueDate)}
                        </span>
                      {/if}
                      {#if task.estimatedHours}
                        <span>{task.estimatedHours}h estimated</span>
                      {/if}
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <Badge variant={getPriorityVariant(task.priority)}>
                      {PRIORITY_LABELS[task.priority]}
                    </Badge>
                    <Badge variant={getTaskStatusVariant(task.status)}>
                      {TASK_STATUS_LABELS[task.status]}
                    </Badge>
                    <div class="flex gap-1">
                      <Button size="sm" variant="ghost" on:click={() => openEditTaskModal(task)}>
                        <Edit class="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" on:click={() => deleteTask(task.id, task.title)}>
                        <Trash2 class="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              {/each}
            {/if}
          </div>
        </Card>
      </div>

      <!-- Sidebar -->
      <div class="space-y-6">
        <!-- Assigned Teams -->
        <Card>
          <div class="flex items-center justify-between border-b px-6 py-4">
            <h2 class="font-semibold">Assigned Teams</h2>
            <Button variant="outline" size="sm" on:click={openAssignTeamModal}>
              <Plus class="h-4 w-4" />
              Assign Team
            </Button>
          </div>
          <div class="p-4">
            {#if !project.teamAssignments || project.teamAssignments.length === 0}
              <p class="text-center text-sm text-muted-foreground">No teams assigned</p>
            {:else}
              <div class="space-y-3">
                {#each project.teamAssignments as teamAssignment}
                  <div class="flex items-start justify-between rounded-lg border p-3">
                    <a
                      href="/teams/{teamAssignment.team.id}"
                      class="flex flex-1 flex-col gap-1 transition-colors hover:opacity-70"
                    >
                      <div class="flex items-center gap-2">
                        <div class="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <UsersRound class="h-3 w-3" />
                        </div>
                        <p class="text-sm font-medium">{teamAssignment.team.name}</p>
                      </div>
                      <div class="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{teamAssignment.team._count?.members || 0} members</span>
                        <span>·</span>
                        <span>{teamAssignment.allocatedHours}h/week</span>
                      </div>
                      {#if teamAssignment.startDate}
                        <div class="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs text-muted-foreground">
                          <span class="flex items-center gap-1">
                            <Calendar class="h-3 w-3" />
                            {formatDate(teamAssignment.startDate)}
                            {#if teamAssignment.endDate}
                              → {formatDate(teamAssignment.endDate)}
                            {:else}
                              → ongoing
                            {/if}
                          </span>
                          <span class="flex items-center gap-1">
                            <Clock class="h-3 w-3" />
                            {calculateDuration(teamAssignment.startDate, teamAssignment.endDate)}
                          </span>
                        </div>
                      {/if}
                    </a>
                    <div class="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        on:click={() => openEditTeamModal(teamAssignment)}
                      >
                        <Edit class="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        on:click={() => removeTeam(teamAssignment.id, teamAssignment.team.name)}
                      >
                        <X class="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        </Card>

        <!-- Individual Assignments -->
        <Card>
          <div class="flex items-center justify-between border-b px-6 py-4">
            <h2 class="font-semibold">Individual Assignments</h2>
            <Button variant="outline" size="sm" on:click={openAssignPersonModal}>
              <Plus class="h-4 w-4" />
              Assign Person
            </Button>
          </div>
          <div class="p-4">
            {#if !project.assignments || project.assignments.length === 0}
              <p class="text-center text-sm text-muted-foreground">No individuals directly assigned</p>
            {:else}
              <div class="space-y-3">
                {#each project.assignments as assignment}
                  <div class="flex items-start justify-between rounded-lg border p-3">
                    <a
                      href="/people/{assignment.user.id}"
                      class="flex flex-1 flex-col gap-1 transition-colors hover:opacity-70"
                    >
                      <div class="flex items-center gap-2">
                        <Avatar
                          firstName={assignment.user.firstName}
                          lastName={assignment.user.lastName}
                          src={assignment.user.avatarUrl}
                          size="sm"
                        />
                        <div>
                          <p class="text-sm font-medium">
                            {fullName(assignment.user.firstName, assignment.user.lastName)}
                          </p>
                          <p class="text-xs text-muted-foreground">{assignment.role}</p>
                        </div>
                      </div>
                      <div class="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{assignment.allocatedHours}h/week</span>
                        <span>·</span>
                        <Badge variant="secondary" class="text-xs">{assignment.status}</Badge>
                      </div>
                      {#if assignment.startDate}
                        <div class="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs text-muted-foreground">
                          <span class="flex items-center gap-1">
                            <Calendar class="h-3 w-3" />
                            {formatDate(assignment.startDate)}
                            {#if assignment.endDate}
                              → {formatDate(assignment.endDate)}
                            {:else}
                              → ongoing
                            {/if}
                          </span>
                          <span class="flex items-center gap-1">
                            <Clock class="h-3 w-3" />
                            {calculateDuration(assignment.startDate, assignment.endDate)}
                          </span>
                        </div>
                      {/if}
                    </a>
                    <div class="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        on:click={() => openEditPersonModal(assignment)}
                      >
                        <Edit class="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        on:click={() => removePerson(assignment.user.id, fullName(assignment.user.firstName, assignment.user.lastName))}
                      >
                        <X class="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        </Card>

        <!-- Phases -->
        <Card>
          <div class="flex items-center justify-between border-b px-6 py-4">
            <h2 class="font-semibold">Phases</h2>
            <Button size="sm" variant="outline" on:click={openCreatePhaseModal}>
              <Plus class="h-4 w-4" />
              Add Phase
            </Button>
          </div>
          <div class="p-4">
            {#if project.phases.length === 0}
              <p class="text-center text-sm text-muted-foreground">No phases defined</p>
            {:else}
              <div class="space-y-3">
                {#each project.phases as phase}
                  <div class="flex items-start justify-between gap-3">
                    <div class="flex-1">
                      <div class="flex items-center gap-2">
                        <p class="text-sm font-medium">{phase.name}</p>
                        <Badge variant={getProjectStatusVariant(phase.status)}>
                          {PROJECT_STATUS_LABELS[phase.status]}
                        </Badge>
                      </div>
                      {#if phase.description}
                        <p class="text-xs text-muted-foreground mt-1">{phase.description}</p>
                      {/if}
                      <div class="mt-1 flex gap-3 text-xs text-muted-foreground">
                        <span>{formatDate(phase.startDate)} → {formatDate(phase.endDate)}</span>
                        {#if phase._count}
                          <span>{phase._count.tasks || 0} tasks</span>
                        {/if}
                      </div>
                    </div>
                    <div class="flex gap-2">
                      <Button size="sm" variant="ghost" on:click={() => openEditPhaseModal(phase)}>
                        <Edit class="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" on:click={() => deletePhase(phase.id, phase.name)}>
                        <Trash2 class="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        </Card>

        <!-- Milestones -->
        <Card>
          <div class="flex items-center justify-between border-b px-6 py-4">
            <h2 class="font-semibold">Milestones</h2>
            <Button size="sm" variant="outline" on:click={openCreateMilestoneModal}>
              <Plus class="h-4 w-4" />
              Add Milestone
            </Button>
          </div>
          <div class="p-4">
            {#if project.milestones.length === 0}
              <p class="text-center text-sm text-muted-foreground">No milestones defined</p>
            {:else}
              <div class="space-y-3">
                {#each project.milestones as milestone}
                  <div class="flex items-start justify-between gap-3">
                    <div class="flex items-start gap-3 flex-1">
                      <div
                        class={cn(
                          'mt-1 h-3 w-3 rounded-full',
                          milestone.isCompleted ? 'bg-green-500' : 'bg-muted'
                        )}
                      />
                      <div>
                        <p class="text-sm font-medium">{milestone.name}</p>
                        <p class="text-xs text-muted-foreground">{formatDate(milestone.dueDate)}</p>
                        {#if milestone.description}
                          <p class="text-xs text-muted-foreground mt-1">{milestone.description}</p>
                        {/if}
                      </div>
                    </div>
                    <div class="flex gap-2">
                      <Button size="sm" variant="ghost" on:click={() => openEditMilestoneModal(milestone)}>
                        <Edit class="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" on:click={() => deleteMilestone(milestone.id, milestone.name)}>
                        <Trash2 class="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        </Card>

        <!-- Details -->
        <Card>
          <div class="border-b px-6 py-4">
            <h2 class="font-semibold">Details</h2>
          </div>
          <div class="space-y-3 p-4 text-sm">
            {#if project.client}
              <div class="flex justify-between">
                <span class="text-muted-foreground">Client</span>
                <span class="font-medium">{project.client.name}</span>
              </div>
            {/if}
            {#if project.manager}
              <div class="flex justify-between">
                <span class="text-muted-foreground">Project Manager</span>
                <span class="font-medium">
                  {fullName(project.manager.firstName, project.manager.lastName)}
                </span>
              </div>
            {/if}
            <div class="flex justify-between">
              <span class="text-muted-foreground">Created</span>
              <span>{formatDate(project.createdAt)}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted-foreground">Last Updated</span>
              <span>{formatDate(project.updatedAt)}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  </div>

  <!-- Edit Modal -->
  <ProjectForm
    bind:open={showEditModal}
    {project}
    on:success={handleProjectUpdated}
  />

  <!-- Task Modal -->
  <TaskForm
    bind:open={showTaskModal}
    {projectId}
    task={editingTask}
    phases={project.phases}
    milestones={project.milestones}
    on:success={handleTaskCreated}
  />

  <!-- Delete Confirmation Modal -->
  <Modal bind:open={showDeleteModal} title="Delete Project" size="sm">
    <p class="text-muted-foreground">
      Are you sure you want to delete <strong>{project.name}</strong>? This action cannot be undone
      and will remove all associated tasks, assignments, and time entries.
    </p>
    <svelte:fragment slot="footer">
      <div class="flex justify-end gap-3">
        <Button variant="outline" on:click={() => (showDeleteModal = false)}>
          Cancel
        </Button>
        <Button variant="destructive" loading={deleting} on:click={handleDelete}>
          Delete Project
        </Button>
      </div>
    </svelte:fragment>
  </Modal>

  <!-- Assign Team Modal -->
  <Modal bind:open={showAssignTeamModal} title="Assign Team to Project" size="md">
    <div class="space-y-4">
      <!-- Team Selection -->
      <SearchableSelect
        bind:value={selectedTeamId}
        items={availableTeams}
        loading={loadingTeams}
        label="Team"
        placeholder="Search teams..."
        displayField="name"
        valueField="id"
        required={true}
        minSearchLength={0}
        showSearchHint={false}
        on:search={handleTeamSearch}
      />

      <!-- Allocated Hours -->
      <div class="space-y-1.5">
        <label for="teamHours" class="text-sm font-medium">Allocated Hours per Week <span class="text-destructive">*</span></label>
        <input
          id="teamHours"
          type="number"
          min="1"
          max="168"
          step="1"
          class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          bind:value={teamHours}
        />
        <p class="text-xs text-muted-foreground">Total hours per week this team will spend on the project</p>
      </div>

      <!-- Start Date -->
      <div class="space-y-1.5">
        <label for="teamStartDate" class="text-sm font-medium">Start Date <span class="text-destructive">*</span></label>
        <input
          id="teamStartDate"
          type="date"
          class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          bind:value={teamStartDate}
        />
      </div>

      <!-- End Date -->
      <div class="space-y-1.5">
        <label for="teamEndDate" class="text-sm font-medium">End Date</label>
        <input
          id="teamEndDate"
          type="date"
          class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          bind:value={teamEndDate}
        />
        <p class="text-xs text-muted-foreground">Leave empty if ongoing</p>
      </div>
    </div>

    <svelte:fragment slot="footer">
      <div class="flex justify-end gap-2">
        <Button variant="outline" on:click={() => (showAssignTeamModal = false)}>
          Cancel
        </Button>
        <Button loading={assigningTeam} on:click={assignTeam}>
          Assign Team
        </Button>
      </div>
    </svelte:fragment>
  </Modal>

  <!-- Edit Team Assignment Modal -->
  <Modal bind:open={showEditTeamModal} title="Edit Team Assignment" size="md">
    <div class="space-y-4">
      <!-- Team Name (Read-only) -->
      <div class="space-y-1.5">
        <label class="text-sm font-medium">Team</label>
        <div class="h-10 flex items-center rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground">
          {editingTeamAssignment?.team?.name || 'Unknown Team'}
        </div>
        <p class="text-xs text-muted-foreground">Team cannot be changed when editing</p>
      </div>

      <!-- Allocated Hours -->
      <div class="space-y-1.5">
        <label for="editTeamHours" class="text-sm font-medium">Allocated Hours per Week <span class="text-destructive">*</span></label>
        <input
          id="editTeamHours"
          type="number"
          min="1"
          max="168"
          step="1"
          class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          bind:value={teamHours}
        />
        <p class="text-xs text-muted-foreground">Total hours per week this team will spend on the project</p>
      </div>

      <!-- Start Date -->
      <div class="space-y-1.5">
        <label for="editTeamStartDate" class="text-sm font-medium">Start Date <span class="text-destructive">*</span></label>
        <input
          id="editTeamStartDate"
          type="date"
          class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          bind:value={teamStartDate}
        />
      </div>

      <!-- End Date -->
      <div class="space-y-1.5">
        <label for="editTeamEndDate" class="text-sm font-medium">End Date</label>
        <input
          id="editTeamEndDate"
          type="date"
          class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          bind:value={teamEndDate}
        />
        <p class="text-xs text-muted-foreground">Leave empty if ongoing</p>
      </div>
    </div>

    <svelte:fragment slot="footer">
      <div class="flex justify-end gap-2">
        <Button variant="outline" on:click={() => (showEditTeamModal = false)}>
          Cancel
        </Button>
        <Button loading={updatingTeam} on:click={updateTeamAssignment}>
          Update Assignment
        </Button>
      </div>
    </svelte:fragment>
  </Modal>

  <!-- Assign Person Modal -->
  <Modal bind:open={showAssignPersonModal} title="Assign Person to Project" size="md">
    <div class="space-y-4">
      <!-- Person Selection -->
      <SearchableSelect
        bind:value={selectedPersonId}
        items={availablePeople.map(p => ({ ...p, displayName: fullName(p.firstName, p.lastName) }))}
        loading={loadingPeople}
        label="Person"
        placeholder="Search by name or email..."
        displayField="displayName"
        valueField="id"
        secondaryField="email"
        required={true}
        minSearchLength={0}
        showSearchHint={false}
        on:search={handlePersonSearch}
      />

      <!-- Role -->
      <div class="space-y-1.5">
        <label for="personRole" class="text-sm font-medium">Role <span class="text-destructive">*</span></label>
        <input
          id="personRole"
          type="text"
          placeholder="e.g., Developer, Designer, PM"
          class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          bind:value={personRole}
        />
      </div>

      <!-- Allocated Hours -->
      <div class="space-y-1.5">
        <label for="personHours" class="text-sm font-medium">Allocated Hours per Week <span class="text-destructive">*</span></label>
        <input
          id="personHours"
          type="number"
          min="1"
          max="168"
          step="1"
          class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          bind:value={personHours}
        />
        <p class="text-xs text-muted-foreground">Total hours per week this person will spend on the project</p>
      </div>

      <!-- Start Date -->
      <div class="space-y-1.5">
        <label for="personStartDate" class="text-sm font-medium">Start Date <span class="text-destructive">*</span></label>
        <input
          id="personStartDate"
          type="date"
          class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          bind:value={personStartDate}
        />
      </div>

      <!-- End Date -->
      <div class="space-y-1.5">
        <label for="personEndDate" class="text-sm font-medium">End Date</label>
        <input
          id="personEndDate"
          type="date"
          class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          bind:value={personEndDate}
        />
        <p class="text-xs text-muted-foreground">Leave empty if ongoing</p>
      </div>
    </div>

    <svelte:fragment slot="footer">
      <div class="flex justify-end gap-2">
        <Button variant="outline" on:click={() => (showAssignPersonModal = false)}>
          Cancel
        </Button>
        <Button loading={assigningPerson} on:click={assignPerson}>
          Assign Person
        </Button>
      </div>
    </svelte:fragment>
  </Modal>

  <!-- Edit Person Assignment Modal -->
  <Modal bind:open={showEditPersonModal} title="Edit Person Assignment" size="md">
    <div class="space-y-4">
      <!-- Person Name (Read-only) -->
      <div class="space-y-1.5">
        <label class="text-sm font-medium">Person</label>
        <div class="h-10 flex items-center rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground">
          {#if editingPersonAssignment?.user}
            {fullName(editingPersonAssignment.user.firstName, editingPersonAssignment.user.lastName)}
          {:else}
            Unknown Person
          {/if}
        </div>
        <p class="text-xs text-muted-foreground">Person cannot be changed when editing</p>
      </div>

      <!-- Role -->
      <div class="space-y-1.5">
        <label for="editPersonRole" class="text-sm font-medium">Role <span class="text-destructive">*</span></label>
        <input
          id="editPersonRole"
          type="text"
          placeholder="e.g., Developer, Designer, PM"
          class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          bind:value={personRole}
        />
      </div>

      <!-- Allocated Hours -->
      <div class="space-y-1.5">
        <label for="editPersonHours" class="text-sm font-medium">Allocated Hours per Week <span class="text-destructive">*</span></label>
        <input
          id="editPersonHours"
          type="number"
          min="1"
          max="168"
          step="1"
          class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          bind:value={personHours}
        />
        <p class="text-xs text-muted-foreground">Total hours per week this person will spend on the project</p>
      </div>

      <!-- Start Date -->
      <div class="space-y-1.5">
        <label for="editPersonStartDate" class="text-sm font-medium">Start Date <span class="text-destructive">*</span></label>
        <input
          id="editPersonStartDate"
          type="date"
          class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          bind:value={personStartDate}
        />
      </div>

      <!-- End Date -->
      <div class="space-y-1.5">
        <label for="editPersonEndDate" class="text-sm font-medium">End Date</label>
        <input
          id="editPersonEndDate"
          type="date"
          class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          bind:value={personEndDate}
        />
        <p class="text-xs text-muted-foreground">Leave empty if ongoing</p>
      </div>
    </div>

    <svelte:fragment slot="footer">
      <div class="flex justify-end gap-2">
        <Button variant="outline" on:click={() => (showEditPersonModal = false)}>
          Cancel
        </Button>
        <Button loading={updatingPerson} on:click={updatePersonAssignment}>
          Update Assignment
        </Button>
      </div>
    </svelte:fragment>
  </Modal>

  <!-- Milestone Form Modal -->
  <MilestoneForm
    bind:open={showMilestoneModal}
    {projectId}
    milestone={editingMilestone}
    phases={project?.phases || []}
    on:success={handleMilestoneSuccess}
  />

  <!-- Phase Form Modal -->
  <PhaseForm
    bind:open={showPhaseModal}
    {projectId}
    phase={editingPhase}
    on:success={handlePhaseSuccess}
  />
{/if}
