<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { api, type ProjectStatus } from '$lib/api/client';
  import { Modal, Button, Input, DateInput, Select } from '$components/shared';
  import { PROJECT_STATUS_LABELS } from '$lib/utils';
  import { toast } from 'svelte-sonner';

  export let open = false;
  export let projectId: string;
  export let phase: any | null = null;

  const dispatch = createEventDispatcher();

  let loading = false;

  // Form fields
  let name = '';
  let description = '';
  let startDate = '';
  let endDate = '';
  let status = 'PLANNING';
  let order = 1;

  let lastPhaseId = '';

  $: isEdit = !!phase;
  $: title = isEdit ? 'Edit Phase' : 'Create Phase';

  // Only initialize form when modal opens or phase changes
  $: if (open && (phase?.id !== lastPhaseId || !phase)) {
    lastPhaseId = phase?.id || '';
    if (phase) {
      name = phase.name;
      description = phase.description || '';
      startDate = phase.startDate?.split('T')[0] || '';
      endDate = phase.endDate?.split('T')[0] || '';
      status = phase.status || 'PLANNING';
      order = phase.order || 1;
    } else {
      resetForm();
    }
  }

  function resetForm() {
    name = '';
    description = '';
    startDate = '';
    endDate = '';
    status = 'PLANNING';
    order = 1;
  }

  async function handleSubmit() {
    if (!name || !startDate || !endDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    loading = true;

    try {
      const data: any = {
        name,
        description: description || undefined,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
        status: status as ProjectStatus,
      };

      // Only include order when creating or if it changed
      if (!isEdit || order !== phase?.order) {
        data.order = order;
      }

      if (isEdit && phase) {
        await api.projects.phases.update(projectId, phase.id, data);
        toast.success('Phase updated successfully');
      } else {
        await api.projects.phases.create(projectId, data);
        toast.success('Phase created successfully');
      }

      dispatch('success');
      open = false;
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to save phase');
    } finally {
      loading = false;
    }
  }

  const statusOptions = Object.entries(PROJECT_STATUS_LABELS).map(([value, label]) => ({
    value,
    label,
  }));
</script>

<Modal bind:open {title} size="md" on:close>
  <form on:submit|preventDefault={handleSubmit} class="space-y-4">
    <Input
      id="name"
      label="Phase Name"
      placeholder="Enter phase name"
      bind:value={name}
      required
    />

    <div class="space-y-1.5">
      <label for="description" class="text-sm font-medium">Description</label>
      <textarea
        id="description"
        rows="2"
        placeholder="Enter phase description"
        class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        bind:value={description}
      />
    </div>

    <div class="grid gap-4 md:grid-cols-2">
      <DateInput
        id="startDate"
        label="Start Date"
        bind:value={startDate}
        required
      />

      <DateInput
        id="endDate"
        label="End Date"
        bind:value={endDate}
        min={startDate}
        required
      />
    </div>

    <div class="grid gap-4 md:grid-cols-2">
      <Select
        id="status"
        label="Status"
        options={statusOptions}
        bind:value={status}
      />

      <Input
        id="order"
        type="number"
        label="Order"
        bind:value={order}
        min={1}
      />
    </div>
  </form>

  <svelte:fragment slot="footer">
    <div class="flex justify-end gap-3">
      <Button variant="outline" on:click={() => (open = false)}>
        Cancel
      </Button>
      <Button {loading} on:click={handleSubmit}>
        {isEdit ? 'Save Changes' : 'Create Phase'}
      </Button>
    </div>
  </svelte:fragment>
</Modal>
