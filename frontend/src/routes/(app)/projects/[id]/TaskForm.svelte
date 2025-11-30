<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { api, type Task, type Phase, type Milestone, type User } from '$lib/api/client';
  import { Modal, Button, Input, Select, SearchableSelect, Badge } from '$components/shared';
  import { TASK_STATUS_LABELS, PRIORITY_LABELS, fullName } from '$lib/utils';
  import { toast } from 'svelte-sonner';
  import { X } from 'lucide-svelte';

  export let open = false;
  export let projectId: string;
  export let task: Task | null = null;
  export let phases: Phase[] = [];
  export let milestones: Milestone[] = [];

  const dispatch = createEventDispatcher();

  let loading = false;

  // Form fields
  let name = '';
  let description = '';
  let status = 'TODO';
  let priority = 'MEDIUM';
  let phaseId = '';
  let milestoneId = '';
  let estimatedHours = '';
  let startDate = '';
  let dueDate = '';
  let assigneeIds: string[] = [];

  // User assignment
  let availableUsers: User[] = [];
  let loadingUsers = false;
  let userSearchTimeout: ReturnType<typeof setTimeout> | null = null;
  let selectedUsers: User[] = [];

  let lastTaskId = '';

  $: isEdit = !!task;
  $: title = isEdit ? 'Edit Task' : 'Create Task';

  // Only initialize form when modal opens or task changes
  $: if (open && (task?.id !== lastTaskId || !task)) {
    lastTaskId = task?.id || '';
    if (task) {
      name = task.title;
      description = task.description || '';
      status = task.status;
      priority = task.priority;
      phaseId = task.phaseId || '';
      milestoneId = task.milestoneId || '';
      estimatedHours = task.estimatedHours?.toString() || '';
      startDate = task.startDate?.split('T')[0] || '';
      dueDate = task.dueDate?.split('T')[0] || '';
      assigneeIds = task.assignments?.map(a => a.user.id) || [];
      selectedUsers = task.assignments?.map(a => a.user) || [];
    } else {
      resetForm();
    }
    // Load users when modal opens
    loadAvailableUsers();
  }

  function resetForm() {
    name = '';
    description = '';
    status = 'TODO';
    priority = 'MEDIUM';
    phaseId = '';
    milestoneId = '';
    estimatedHours = '';
    startDate = '';
    dueDate = '';
    assigneeIds = [];
    selectedUsers = [];
  }

  async function loadAvailableUsers(search = '') {
    loadingUsers = true;
    try {
      const response = await api.users.list({ limit: 20, search: search || undefined, status: 'ACTIVE' });
      availableUsers = response.data || [];
    } catch (err) {
      toast.error('Failed to load users');
    } finally {
      loadingUsers = false;
    }
  }

  function handleUserSearch(event: CustomEvent<{ query: string }>) {
    const query = event.detail.query;

    if (userSearchTimeout) {
      clearTimeout(userSearchTimeout);
    }

    userSearchTimeout = setTimeout(() => {
      loadAvailableUsers(query);
    }, 300);
  }

  function addAssignee(event: CustomEvent<{ value: string; item: any }>) {
    const user = event.detail.item;
    if (!assigneeIds.includes(user.id)) {
      assigneeIds = [...assigneeIds, user.id];
      selectedUsers = [...selectedUsers, user];
    }
  }

  function removeAssignee(userId: string) {
    assigneeIds = assigneeIds.filter(id => id !== userId);
    selectedUsers = selectedUsers.filter(u => u.id !== userId);
  }

  async function handleSubmit() {
    if (!name) {
      toast.error('Please enter a task name');
      return;
    }

    if (assigneeIds.length === 0) {
      toast.error('Please assign at least one person to this task');
      return;
    }

    loading = true;

    try {
      const data = {
        title: name,
        description: description || undefined,
        status: status as 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'BLOCKED' | 'COMPLETED' | 'CANCELLED',
        priority: priority as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT',
        phaseId: phaseId || undefined,
        milestoneId: milestoneId || undefined,
        estimatedHours: estimatedHours ? parseFloat(estimatedHours) : undefined,
        startDate: startDate || undefined,
        dueDate: dueDate || undefined,
        assigneeIds: assigneeIds,
      };

      if (isEdit && task) {
        await api.projects.tasks.update(projectId, task.id, data);
        toast.success('Task updated successfully');
      } else {
        await api.projects.tasks.create(projectId, data);
        toast.success('Task created successfully');
      }

      dispatch('success');
      open = false;
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to save task');
    } finally {
      loading = false;
    }
  }

  const statusOptions = Object.entries(TASK_STATUS_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  const priorityOptions = Object.entries(PRIORITY_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  $: phaseOptions = [
    { value: '', label: 'No Phase' },
    ...phases.map((p) => ({ value: p.id, label: p.name })),
  ];

  $: milestoneOptions = [
    { value: '', label: 'No Milestone' },
    ...milestones.map((m) => ({ value: m.id, label: m.name })),
  ];
</script>

<Modal bind:open {title} size="lg" on:close>
  <form on:submit|preventDefault={handleSubmit} class="space-y-4">
    <Input
      id="name"
      label="Task Name"
      placeholder="Enter task name"
      bind:value={name}
      required
    />

    <div class="space-y-1.5">
      <label for="description" class="text-sm font-medium">Description</label>
      <textarea
        id="description"
        rows="3"
        placeholder="Enter task description"
        class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        bind:value={description}
      />
    </div>

    <!-- Assignees (Required) -->
    <div class="space-y-2">
      <label class="text-sm font-medium">
        Assigned To <span class="text-destructive">*</span>
      </label>

      <!-- Selected assignees -->
      {#if selectedUsers.length > 0}
        <div class="flex flex-wrap gap-2 mb-2">
          {#each selectedUsers as user}
            <Badge variant="secondary" class="flex items-center gap-1">
              {fullName(user.firstName, user.lastName)}
              <button
                type="button"
                on:click={() => removeAssignee(user.id)}
                class="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
              >
                <X class="h-3 w-3" />
              </button>
            </Badge>
          {/each}
        </div>
      {/if}

      <!-- Add assignee -->
      <SearchableSelect
        value=""
        items={availableUsers.filter(u => !assigneeIds.includes(u.id)).map(u => ({ ...u, displayName: fullName(u.firstName, u.lastName) }))}
        loading={loadingUsers}
        placeholder="Search and add people..."
        displayField="displayName"
        valueField="id"
        secondaryField="email"
        minSearchLength={0}
        showSearchHint={false}
        on:search={handleUserSearch}
        on:select={addAssignee}
      />
      <p class="text-xs text-muted-foreground">At least one person must be assigned to this task</p>
    </div>

    <div class="grid gap-4 md:grid-cols-2">
      <Select
        id="status"
        label="Status"
        options={statusOptions}
        bind:value={status}
      />

      <Select
        id="priority"
        label="Priority"
        options={priorityOptions}
        bind:value={priority}
      />
    </div>

    <div class="grid gap-4 md:grid-cols-2">
      <Select
        id="phaseId"
        label="Phase"
        options={phaseOptions}
        bind:value={phaseId}
      />

      <Select
        id="milestoneId"
        label="Milestone"
        options={milestoneOptions}
        bind:value={milestoneId}
      />
    </div>

    <div class="grid gap-4 md:grid-cols-3">
      <Input
        id="startDate"
        type="date"
        label="Start Date"
        bind:value={startDate}
      />

      <Input
        id="dueDate"
        type="date"
        label="Due Date"
        bind:value={dueDate}
      />

      <Input
        id="estimatedHours"
        type="number"
        label="Estimated Hours"
        placeholder="0"
        bind:value={estimatedHours}
      />
    </div>
  </form>

  <svelte:fragment slot="footer">
    <div class="flex justify-end gap-3">
      <Button variant="outline" on:click={() => (open = false)}>
        Cancel
      </Button>
      <Button {loading} on:click={handleSubmit}>
        {isEdit ? 'Save Changes' : 'Create Task'}
      </Button>
    </div>
  </svelte:fragment>
</Modal>
