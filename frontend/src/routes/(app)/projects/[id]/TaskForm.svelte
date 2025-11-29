<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { api, type Task, type Phase, type Milestone } from '$lib/api/client';
  import { Modal, Button, Input, Select } from '$components/shared';
  import { TASK_STATUS_LABELS, PRIORITY_LABELS } from '$lib/utils';
  import { toast } from 'svelte-sonner';

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
    } else {
      resetForm();
    }
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
  }

  async function handleSubmit() {
    if (!name) {
      toast.error('Please enter a task name');
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
