<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { api, type Milestone } from '$lib/api/client';
  import { Modal, Button, Input, DateInput, Select } from '$components/shared';
  import { toast } from 'svelte-sonner';

  export let open = false;
  export let projectId: string;
  export let milestone: Milestone | null = null;
  export let phases: any[] = [];

  const dispatch = createEventDispatcher();

  let loading = false;

  // Form fields
  let name = '';
  let description = '';
  let dueDate = '';
  let phaseId = '';
  let isCompleted = false;

  let lastMilestoneId = '';

  $: isEdit = !!milestone;
  $: title = isEdit ? 'Edit Milestone' : 'Create Milestone';

  // Only initialize form when modal opens or milestone changes
  $: if (open && (milestone?.id !== lastMilestoneId || !milestone)) {
    lastMilestoneId = milestone?.id || '';
    if (milestone) {
      name = milestone.name;
      description = milestone.description || '';
      dueDate = milestone.dueDate?.split('T')[0] || '';
      phaseId = (milestone as any).phaseId || '';
      isCompleted = milestone.isCompleted || false;
    } else {
      resetForm();
    }
  }

  function resetForm() {
    name = '';
    description = '';
    dueDate = '';
    phaseId = '';
    isCompleted = false;
  }

  async function handleSubmit() {
    if (!name || !dueDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    loading = true;

    try {
      const data = {
        name,
        description: description || undefined,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        phaseId: phaseId || undefined,
        isCompleted,
      };

      if (isEdit && milestone) {
        await api.projects.milestones.update(projectId, milestone.id, data);
        toast.success('Milestone updated successfully');
      } else {
        await api.projects.milestones.create(projectId, data);
        toast.success('Milestone created successfully');
      }

      dispatch('success');
      open = false;
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to save milestone');
    } finally {
      loading = false;
    }
  }

  $: phaseOptions = [
    { value: '', label: 'No Phase' },
    ...(phases || []).map((p) => ({ value: p.id, label: p.name })),
  ];
</script>

<Modal bind:open {title} size="md" on:close>
  <form on:submit|preventDefault={handleSubmit} class="space-y-4">
    <Input
      id="name"
      label="Milestone Name"
      placeholder="Enter milestone name"
      bind:value={name}
      required
    />

    <div class="space-y-1.5">
      <label for="description" class="text-sm font-medium">Description</label>
      <textarea
        id="description"
        rows="2"
        placeholder="Enter milestone description"
        class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        bind:value={description}
      />
    </div>

    <DateInput
      id="dueDate"
      label="Due Date"
      bind:value={dueDate}
      required
    />

    <Select
      id="phaseId"
      label="Phase"
      options={phaseOptions}
      bind:value={phaseId}
    />

    {#if isEdit}
      <div class="flex items-center gap-2">
        <input
          type="checkbox"
          id="isCompleted"
          class="h-4 w-4 rounded border-input"
          bind:checked={isCompleted}
        />
        <label for="isCompleted" class="text-sm font-medium">
          Mark as completed
        </label>
      </div>
    {/if}
  </form>

  <svelte:fragment slot="footer">
    <div class="flex justify-end gap-3">
      <Button variant="outline" on:click={() => (open = false)}>
        Cancel
      </Button>
      <Button {loading} on:click={handleSubmit}>
        {isEdit ? 'Save Changes' : 'Create Milestone'}
      </Button>
    </div>
  </svelte:fragment>
</Modal>
