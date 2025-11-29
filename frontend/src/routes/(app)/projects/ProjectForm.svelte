<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { api, type Project, type Client, type DropdownLists } from '$lib/api/client';
  import { Modal, Button, Input, Select, DateInput } from '$components/shared';
  import { PROJECT_STATUS_LABELS, PRIORITY_LABELS } from '$lib/utils';
  import { toast } from 'svelte-sonner';

  export let open = false;
  export let project: Project | null = null;
  export let defaultClientId = ''; // Pre-fill client when creating from client page

  const dispatch = createEventDispatcher();

  let loading = false;
  let clients: Client[] = [];
  let managers: { id: string; firstName: string; lastName: string }[] = [];
  let dropdownLists: DropdownLists | null = null;

  // Form fields
  let name = '';
  let code = '';
  let description = '';
  let type = '';
  let status = 'PLANNING';
  let priority = 'MEDIUM';
  let startDate = '';
  let endDate = '';
  let budgetCost = '';
  let budgetHours = '';
  let clientId = '';
  let managerId = '';

  let lastProjectId = '';

  $: isEdit = !!project;
  $: title = isEdit ? 'Edit Project' : 'Create Project';

  // Only initialize form when modal opens or project changes
  $: if (open && (project?.id !== lastProjectId || !project)) {
    lastProjectId = project?.id || '';
    if (project) {
      name = project.name;
      code = project.code;
      description = project.description || '';
      type = (project as any).type || '';
      status = project.status;
      priority = project.priority;
      startDate = project.startDate?.split('T')[0] || '';
      endDate = project.endDate?.split('T')[0] || '';
      budgetCost = project.budgetCost?.toString() || '';
      budgetHours = project.budgetHours?.toString() || '';
      clientId = project.clientId;
      managerId = project.managerId || '';
    } else {
      resetForm();
    }
    loadOptions();
  }

  async function loadOptions() {
    try {
      const [clientsRes, managersRes, dropdownsRes] = await Promise.all([
        api.clients.list({ limit: 100 }),
        api.users.getManagers(),
        api.admin.dropdowns.getAll().catch(() => null),
      ]);
      clients = clientsRes.data || [];
      managers = managersRes || [];
      dropdownLists = dropdownsRes;
    } catch {
      // Silently fail - options will be empty
    }
  }

  function resetForm() {
    name = '';
    code = '';
    description = '';
    type = '';
    status = 'PLANNING';
    priority = 'MEDIUM';
    startDate = '';
    endDate = '';
    budgetCost = '';
    budgetHours = '';
    clientId = defaultClientId; // Use default if provided
    managerId = '';
  }

  async function handleSubmit() {
    if (!name || !code || !clientId) {
      toast.error('Please fill in all required fields');
      return;
    }

    loading = true;

    try {
      const data = {
        name,
        code,
        description: description || undefined,
        type: type || undefined,
        status: status as 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED',
        priority: priority as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        budgetCost: budgetCost ? parseFloat(budgetCost) : undefined,
        budgetHours: budgetHours ? parseFloat(budgetHours) : undefined,
        clientId,
        managerId: managerId || undefined,
      };

      if (isEdit && project) {
        await api.projects.update(project.id, data);
        toast.success('Project updated successfully');
      } else {
        await api.projects.create(data);
        toast.success('Project created successfully');
      }

      dispatch('success');
      open = false;
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to save project');
    } finally {
      loading = false;
    }
  }

  const statusOptions = Object.entries(PROJECT_STATUS_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  const priorityOptions = Object.entries(PRIORITY_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  $: clientOptions = (clients || []).map((c) => ({ value: c.id, label: c.name }));
  $: managerOptions = [
    { value: '', label: 'No Manager' },
    ...(managers || []).map((m) => ({ value: m.id, label: `${m.firstName} ${m.lastName}` })),
  ];
  $: projectTypeOptions = [
    { value: '', label: 'Select Type' },
    ...(dropdownLists?.projectTypes || []).map((t) => ({ value: t, label: t })),
  ];
</script>

<Modal bind:open {title} size="lg" on:close>
  <form on:submit|preventDefault={handleSubmit} class="space-y-4">
    <div class="grid gap-4 md:grid-cols-2">
      <Input
        id="name"
        label="Project Name"
        placeholder="Enter project name"
        bind:value={name}
        required
      />

      <Input
        id="code"
        label="Project Code"
        placeholder="e.g., PRJ-001"
        bind:value={code}
        required
      />
    </div>

    <div class="space-y-1.5">
      <label for="description" class="text-sm font-medium">Description</label>
      <textarea
        id="description"
        rows="3"
        placeholder="Enter project description"
        class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        bind:value={description}
      />
    </div>

    <div class="grid gap-4 md:grid-cols-2">
      <Select
        id="clientId"
        label="Client"
        options={clientOptions}
        bind:value={clientId}
        placeholder="Select client"
        required
      />

      <Select
        id="managerId"
        label="Project Manager"
        options={managerOptions}
        bind:value={managerId}
        placeholder="Select manager"
      />
    </div>

    <div class="grid gap-4 md:grid-cols-3">
      <Select
        id="type"
        label="Project Type"
        options={projectTypeOptions}
        bind:value={type}
      />

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
      <DateInput
        id="startDate"
        label="Start Date"
        bind:value={startDate}
      />

      <DateInput
        id="endDate"
        label="End Date"
        bind:value={endDate}
        min={startDate}
      />
    </div>

    <div class="grid gap-4 md:grid-cols-2">
      <Input
        id="budgetCost"
        type="number"
        label="Budget (Cost)"
        placeholder="0.00"
        bind:value={budgetCost}
      />

      <Input
        id="budgetHours"
        type="number"
        label="Budget (Hours)"
        placeholder="0"
        bind:value={budgetHours}
      />
    </div>
  </form>

  <svelte:fragment slot="footer">
    <div class="flex justify-end gap-3">
      <Button variant="outline" on:click={() => (open = false)}>
        Cancel
      </Button>
      <Button {loading} on:click={handleSubmit}>
        {isEdit ? 'Save Changes' : 'Create Project'}
      </Button>
    </div>
  </svelte:fragment>
</Modal>
