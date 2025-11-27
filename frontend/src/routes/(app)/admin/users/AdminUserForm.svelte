<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { api, type User, type EmploymentType, type UserStatus, type Role, type DropdownLists } from '$lib/api/client';
  import { Modal, Button, Input, Select } from '$components/shared';
  import { ROLE_LABELS } from '$lib/utils';
  import { toast } from 'svelte-sonner';
  import { X } from 'lucide-svelte';

  export let open = false;
  export let user: User | null = null;

  const dispatch = createEventDispatcher();

  let loading = false;
  let managers: { id: string; firstName: string; lastName: string }[] = [];
  let dropdownLists: DropdownLists | null = null;

  // Basic info
  let email = '';
  let password = '';
  let firstName = '';
  let lastName = '';
  let role: Role = 'TEAM_MEMBER';
  let status: UserStatus = 'ACTIVE';
  let jobTitle = '';
  let department = '';
  let phone = '';
  let managerId = '';

  // Geographic and employment
  let country = '';
  let region = '';
  let employmentType: EmploymentType = 'FULL_TIME';

  // Capacity
  let defaultWeeklyHours = 40;
  let maxWeeklyHours = 40;
  let timezone = 'UTC';

  // Skills and rates
  let skills: string[] = [];
  let newSkill = '';
  let hourlyRate: number | undefined = undefined;
  let billableRate: number | undefined = undefined;

  $: isEdit = !!user;
  $: modalTitle = isEdit ? 'Edit User' : 'Add User';

  $: if (open) {
    if (user) {
      email = user.email;
      password = '';
      firstName = user.firstName;
      lastName = user.lastName;
      role = user.role;
      status = user.status || 'ACTIVE';
      jobTitle = user.jobTitle || '';
      department = user.department || '';
      phone = user.phone || '';
      managerId = user.managerId || '';
      country = user.country || '';
      region = user.region || '';
      employmentType = user.employmentType || 'FULL_TIME';
      defaultWeeklyHours = user.defaultWeeklyHours || 40;
      maxWeeklyHours = user.maxWeeklyHours || 40;
      timezone = user.timezone || 'UTC';
      skills = [...(user.skills || [])];
      hourlyRate = user.hourlyRate ?? undefined;
      billableRate = user.billableRate ?? undefined;
    } else {
      resetForm();
    }
    loadManagers();
  }

  async function loadManagers() {
    try {
      const [managersRes, dropdownsRes] = await Promise.all([
        api.users.getManagers(),
        api.admin.dropdowns.getAll(),
      ]);
      managers = managersRes;
      dropdownLists = dropdownsRes;
    } catch {
      // Silently fail - options will be empty
    }
  }

  function resetForm() {
    email = '';
    password = '';
    firstName = '';
    lastName = '';
    role = 'TEAM_MEMBER';
    status = 'ACTIVE';
    jobTitle = '';
    department = '';
    phone = '';
    managerId = '';
    country = '';
    region = '';
    employmentType = 'FULL_TIME';
    defaultWeeklyHours = 40;
    maxWeeklyHours = 40;
    timezone = 'UTC';
    skills = [];
    newSkill = '';
    hourlyRate = undefined;
    billableRate = undefined;
  }

  function addSkill() {
    const skill = newSkill.trim();
    if (skill && !skills.includes(skill)) {
      skills = [...skills, skill];
      newSkill = '';
    }
  }

  function removeSkill(skill: string) {
    skills = skills.filter((s) => s !== skill);
  }

  function handleSkillKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSkill();
    }
  }

  async function handleSubmit() {
    if (!email || !firstName || !lastName) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!isEdit && !password) {
      toast.error('Password is required for new users');
      return;
    }

    loading = true;

    try {
      const baseData = {
        firstName,
        lastName,
        role,
        status,
        jobTitle: jobTitle || undefined,
        department: department || undefined,
        phone: phone || undefined,
        managerId: managerId || undefined,
        country: country || undefined,
        region: region || undefined,
        employmentType,
        defaultWeeklyHours,
        maxWeeklyHours,
        timezone: timezone || 'UTC',
        skills: skills.length > 0 ? skills : undefined,
        hourlyRate: hourlyRate ?? undefined,
        billableRate: billableRate ?? undefined,
      };

      if (isEdit && user) {
        await api.users.update(user.id, baseData);
        toast.success('User updated successfully');
      } else {
        await api.users.create({
          email,
          password,
          ...baseData,
        });
        toast.success('User created successfully');
      }

      dispatch('success');
      open = false;
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to save user');
    } finally {
      loading = false;
    }
  }

  const roleOptions = Object.entries(ROLE_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  const statusOptions = [
    { value: 'ACTIVE', label: 'Active' },
    { value: 'INACTIVE', label: 'Inactive' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'SUSPENDED', label: 'Suspended' },
  ];

  const employmentTypeOptions = [
    { value: 'FULL_TIME', label: 'Full Time' },
    { value: 'PART_TIME', label: 'Part Time' },
    { value: 'CONTRACTOR', label: 'Contractor' },
  ];

  const timezoneOptions = [
    { value: 'UTC', label: 'UTC' },
    { value: 'America/New_York', label: 'Eastern Time (US)' },
    { value: 'America/Chicago', label: 'Central Time (US)' },
    { value: 'America/Denver', label: 'Mountain Time (US)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (US)' },
    { value: 'Europe/London', label: 'London' },
    { value: 'Europe/Paris', label: 'Paris' },
    { value: 'Asia/Tokyo', label: 'Tokyo' },
    { value: 'Asia/Shanghai', label: 'Shanghai' },
    { value: 'Asia/Kolkata', label: 'India (IST)' },
    { value: 'Australia/Sydney', label: 'Sydney' },
  ];

  const countryOptions = [
    { value: '', label: 'Select Country' },
    { value: 'US', label: 'United States' },
    { value: 'CA', label: 'Canada' },
    { value: 'GB', label: 'United Kingdom' },
    { value: 'DE', label: 'Germany' },
    { value: 'FR', label: 'France' },
    { value: 'IN', label: 'India' },
    { value: 'AU', label: 'Australia' },
    { value: 'JP', label: 'Japan' },
    { value: 'CN', label: 'China' },
    { value: 'BR', label: 'Brazil' },
    { value: 'MX', label: 'Mexico' },
  ];

  $: managerOptions = [
    { value: '', label: 'No Manager' },
    ...managers.map((m) => ({ value: m.id, label: `${m.firstName} ${m.lastName}` })),
  ];

  $: departmentOptions = [
    { value: '', label: 'Select Department' },
    ...(dropdownLists?.departments || []).map((d) => ({ value: d, label: d })),
  ];

  $: regionOptions = [
    { value: '', label: 'Select Region' },
    ...(dropdownLists?.regions || []).map((r) => ({ value: r, label: r })),
  ];

  $: skillSuggestions = dropdownLists?.skillCategories || [];
</script>

<Modal bind:open title={modalTitle} size="lg" on:close>
  <form on:submit|preventDefault={handleSubmit} class="space-y-6">
    <!-- Account Settings Section (Admin-specific) -->
    <div class="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
      <h3 class="mb-3 text-sm font-semibold uppercase text-amber-800 dark:text-amber-200">Account Settings (Admin Only)</h3>
      <div class="grid gap-4 md:grid-cols-2">
        <Select
          id="role"
          label="Role"
          options={roleOptions}
          bind:value={role}
        />

        <Select
          id="status"
          label="Account Status"
          options={statusOptions}
          bind:value={status}
        />
      </div>
    </div>

    <!-- Basic Information Section -->
    <div>
      <h3 class="mb-3 text-sm font-semibold uppercase text-muted-foreground">Basic Information</h3>
      <div class="space-y-4">
        <div class="grid gap-4 md:grid-cols-2">
          <Input
            id="firstName"
            label="First Name"
            placeholder="John"
            bind:value={firstName}
            required
          />

          <Input
            id="lastName"
            label="Last Name"
            placeholder="Doe"
            bind:value={lastName}
            required
          />
        </div>

        <div class="grid gap-4 md:grid-cols-2">
          <Input
            id="email"
            type="email"
            label="Email"
            placeholder="john@example.com"
            bind:value={email}
            required
            disabled={isEdit}
          />

          {#if !isEdit}
            <Input
              id="password"
              type="password"
              label="Password"
              placeholder="Enter password"
              bind:value={password}
              required
            />
          {/if}
        </div>

        <div class="grid gap-4 md:grid-cols-2">
          <Select
            id="managerId"
            label="Reports To"
            options={managerOptions}
            bind:value={managerId}
          />

          <Input
            id="jobTitle"
            label="Job Title"
            placeholder="e.g., Senior Developer"
            bind:value={jobTitle}
          />
        </div>

        <div class="grid gap-4 md:grid-cols-2">
          <Select
            id="department"
            label="Department"
            options={departmentOptions}
            bind:value={department}
          />

          <Input
            id="phone"
            type="tel"
            label="Phone"
            placeholder="+1 (555) 123-4567"
            bind:value={phone}
          />
        </div>
      </div>
    </div>

    <!-- Geographic & Employment Section -->
    <div>
      <h3 class="mb-3 text-sm font-semibold uppercase text-muted-foreground">Location & Employment</h3>
      <div class="space-y-4">
        <div class="grid gap-4 md:grid-cols-2">
          <Select
            id="country"
            label="Country"
            options={countryOptions}
            bind:value={country}
          />

          <Select
            id="region"
            label="Region"
            options={regionOptions}
            bind:value={region}
          />
        </div>

        <div class="grid gap-4 md:grid-cols-2">
          <Select
            id="employmentType"
            label="Employment Type"
            options={employmentTypeOptions}
            bind:value={employmentType}
          />

          <Select
            id="timezone"
            label="Timezone"
            options={timezoneOptions}
            bind:value={timezone}
          />
        </div>
      </div>
    </div>

    <!-- Capacity Section -->
    <div>
      <h3 class="mb-3 text-sm font-semibold uppercase text-muted-foreground">Capacity</h3>
      <div class="grid gap-4 md:grid-cols-2">
        <div class="space-y-1.5">
          <label for="defaultWeeklyHours" class="text-sm font-medium">Default Weekly Hours</label>
          <input
            id="defaultWeeklyHours"
            type="number"
            min="0"
            max="168"
            step="1"
            class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            bind:value={defaultWeeklyHours}
          />
          <p class="text-xs text-muted-foreground">Typical hours worked per week</p>
        </div>

        <div class="space-y-1.5">
          <label for="maxWeeklyHours" class="text-sm font-medium">Max Weekly Hours</label>
          <input
            id="maxWeeklyHours"
            type="number"
            min="0"
            max="168"
            step="1"
            class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            bind:value={maxWeeklyHours}
          />
          <p class="text-xs text-muted-foreground">Legal limit based on region</p>
        </div>
      </div>
    </div>

    <!-- Skills Section -->
    <div>
      <h3 class="mb-3 text-sm font-semibold uppercase text-muted-foreground">Skills</h3>
      <div class="space-y-2">
        <div class="flex gap-2">
          <input
            type="text"
            placeholder="Add a skill (press Enter)"
            class="flex-1 h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            bind:value={newSkill}
            on:keydown={handleSkillKeydown}
          />
          <Button type="button" variant="outline" on:click={addSkill}>
            Add
          </Button>
        </div>

        {#if skillSuggestions.length > 0}
          <div class="flex flex-wrap gap-1">
            <span class="text-xs text-muted-foreground mr-1">Quick add:</span>
            {#each skillSuggestions.filter(s => !skills.includes(s)) as suggestion}
              <button
                type="button"
                class="text-xs px-2 py-0.5 rounded bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
                on:click={() => { skills = [...skills, suggestion]; }}
              >
                + {suggestion}
              </button>
            {/each}
          </div>
        {/if}

        {#if skills.length > 0}
          <div class="flex flex-wrap gap-2 mt-2">
            {#each skills as skill}
              <span class="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-sm">
                {skill}
                <button
                  type="button"
                  class="ml-1 rounded-full p-0.5 hover:bg-muted"
                  on:click={() => removeSkill(skill)}
                >
                  <X class="h-3 w-3" />
                </button>
              </span>
            {/each}
          </div>
        {:else}
          <p class="text-sm text-muted-foreground">No skills added yet</p>
        {/if}
      </div>
    </div>

    <!-- Rates Section -->
    <div>
      <h3 class="mb-3 text-sm font-semibold uppercase text-muted-foreground">Billing Rates</h3>
      <div class="grid gap-4 md:grid-cols-2">
        <div class="space-y-1.5">
          <label for="hourlyRate" class="text-sm font-medium">Hourly Rate ($)</label>
          <input
            id="hourlyRate"
            type="number"
            min="0"
            step="0.01"
            placeholder="e.g., 75.00"
            class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            bind:value={hourlyRate}
          />
          <p class="text-xs text-muted-foreground">Internal cost rate</p>
        </div>

        <div class="space-y-1.5">
          <label for="billableRate" class="text-sm font-medium">Billable Rate ($)</label>
          <input
            id="billableRate"
            type="number"
            min="0"
            step="0.01"
            placeholder="e.g., 150.00"
            class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            bind:value={billableRate}
          />
          <p class="text-xs text-muted-foreground">Client billing rate</p>
        </div>
      </div>
    </div>
  </form>

  <svelte:fragment slot="footer">
    <div class="flex justify-end gap-3">
      <Button variant="outline" on:click={() => (open = false)}>
        Cancel
      </Button>
      <Button {loading} on:click={handleSubmit}>
        {isEdit ? 'Save Changes' : 'Create User'}
      </Button>
    </div>
  </svelte:fragment>
</Modal>
