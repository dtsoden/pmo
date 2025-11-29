<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { api, type User, type EmploymentType, type DropdownLists } from '$lib/api/client';
  import { Modal, Button, Input, Badge } from '$components/shared';
  import { ROLE_LABELS, getTimezoneAbbreviation } from '$lib/utils';
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
  let role = 'TEAM_MEMBER';
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
  $: modalTitle = isEdit && user ? `Edit ${user.firstName} ${user.lastName}` : 'Add Team Member';

  // Track modal state to only initialize form when first opened
  let previousOpenState = false;

  $: if (open && !previousOpenState) {
    // Modal just opened - initialize form
    previousOpenState = true;
    if (user) {
      email = user.email;
      password = '';
      firstName = user.firstName;
      lastName = user.lastName;
      role = user.role;
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
  } else if (!open && previousOpenState) {
    // Modal just closed - reset state
    previousOpenState = false;
  }

  async function loadManagers() {
    try {
      const [managersRes, dropdownsRes] = await Promise.all([
        api.users.getManagers(),
        api.users.getDropdowns(), // Public endpoint available to all users
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
      // Note: Role changes are admin-only (Admin > User Management)
      const baseData = {
        firstName,
        lastName,
        // role is NOT included - admin-only field
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
        toast.success('Team member updated successfully');
      } else {
        // This path shouldn't be reached (Add button removed from People)
        // But just in case, create with default role
        await api.users.create({
          email,
          password,
          role: 'TEAM_MEMBER',
          ...baseData,
        });
        toast.success('Team member added successfully');
      }

      dispatch('success');
      open = false;
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to save team member');
    } finally {
      loading = false;
    }
  }

  const roleOptions = Object.entries(ROLE_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  const employmentTypeOptions = [
    { value: 'FULL_TIME', label: 'Full Time' },
    { value: 'PART_TIME', label: 'Part Time' },
    { value: 'CONTRACTOR', label: 'Contractor' },
  ];

  const timezoneOptions = [
    // UTC
    { value: 'UTC', label: 'UTC' },

    // Americas - North America
    { value: 'America/New_York', label: 'New York, Toronto (EST/EDT)' },
    { value: 'America/Chicago', label: 'Chicago, Mexico City (CST/CDT)' },
    { value: 'America/Denver', label: 'Denver, Calgary (MST/MDT)' },
    { value: 'America/Phoenix', label: 'Phoenix (MST - no DST)' },
    { value: 'America/Los_Angeles', label: 'Los Angeles, Vancouver (PST/PDT)' },
    { value: 'America/Anchorage', label: 'Anchorage (AKST/AKDT)' },
    { value: 'Pacific/Honolulu', label: 'Honolulu (HST)' },

    // Americas - Central America & Caribbean
    { value: 'America/Costa_Rica', label: 'Costa Rica, El Salvador' },
    { value: 'America/Panama', label: 'Panama, Jamaica' },
    { value: 'America/Havana', label: 'Havana' },

    // Americas - South America
    { value: 'America/Sao_Paulo', label: 'São Paulo, Brasília' },
    { value: 'America/Buenos_Aires', label: 'Buenos Aires' },
    { value: 'America/Santiago', label: 'Santiago' },
    { value: 'America/Lima', label: 'Lima, Bogotá' },
    { value: 'America/Caracas', label: 'Caracas' },

    // Europe - Western
    { value: 'Europe/London', label: 'London, Lisbon (GMT/BST)' },
    { value: 'Europe/Dublin', label: 'Dublin' },

    // Europe - Central
    { value: 'Europe/Paris', label: 'Paris, Madrid, Rome (CET/CEST)' },
    { value: 'Europe/Berlin', label: 'Berlin, Amsterdam, Brussels' },
    { value: 'Europe/Zurich', label: 'Zurich, Vienna' },
    { value: 'Europe/Prague', label: 'Prague, Budapest' },
    { value: 'Europe/Warsaw', label: 'Warsaw, Stockholm' },

    // Europe - Eastern
    { value: 'Europe/Athens', label: 'Athens, Bucharest, Helsinki' },
    { value: 'Europe/Istanbul', label: 'Istanbul' },
    { value: 'Europe/Moscow', label: 'Moscow' },

    // Africa
    { value: 'Africa/Cairo', label: 'Cairo' },
    { value: 'Africa/Johannesburg', label: 'Johannesburg, Cape Town' },
    { value: 'Africa/Lagos', label: 'Lagos, Kinshasa' },
    { value: 'Africa/Nairobi', label: 'Nairobi, Addis Ababa' },
    { value: 'Africa/Casablanca', label: 'Casablanca' },

    // Middle East
    { value: 'Asia/Dubai', label: 'Dubai, Abu Dhabi' },
    { value: 'Asia/Riyadh', label: 'Riyadh' },
    { value: 'Asia/Tel_Aviv', label: 'Tel Aviv, Jerusalem' },
    { value: 'Asia/Tehran', label: 'Tehran' },

    // Asia - South
    { value: 'Asia/Kolkata', label: 'Mumbai, Delhi, Bangalore (IST)' },
    { value: 'Asia/Karachi', label: 'Karachi' },
    { value: 'Asia/Dhaka', label: 'Dhaka' },

    // Asia - Southeast
    { value: 'Asia/Bangkok', label: 'Bangkok, Jakarta, Hanoi' },
    { value: 'Asia/Singapore', label: 'Singapore, Kuala Lumpur' },
    { value: 'Asia/Manila', label: 'Manila' },

    // Asia - East
    { value: 'Asia/Shanghai', label: 'Beijing, Shanghai, Hong Kong' },
    { value: 'Asia/Tokyo', label: 'Tokyo, Seoul' },
    { value: 'Asia/Taipei', label: 'Taipei' },

    // Oceania
    { value: 'Australia/Perth', label: 'Perth (AWST)' },
    { value: 'Australia/Adelaide', label: 'Adelaide (ACST/ACDT)' },
    { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
    { value: 'Australia/Melbourne', label: 'Melbourne (AEST/AEDT)' },
    { value: 'Australia/Brisbane', label: 'Brisbane (AEST - no DST)' },
    { value: 'Pacific/Auckland', label: 'Auckland (NZST/NZDT)' },
    { value: 'Pacific/Wellington', label: 'Wellington (NZST/NZDT)' },
    { value: 'Pacific/Fiji', label: 'Fiji' },
  ];

  // Pre-defined list of countries (most common)
  const countryOptions = [
    { value: 'US', label: 'United States' },
    { value: 'CA', label: 'Canada' },
    { value: 'MX', label: 'Mexico' },
    { value: 'BR', label: 'Brazil' },
    { value: 'GB', label: 'United Kingdom' },
    { value: 'FR', label: 'France' },
    { value: 'DE', label: 'Germany' },
    { value: 'IN', label: 'India' },
    { value: 'SG', label: 'Singapore' },
    { value: 'JP', label: 'Japan' },
    { value: 'CN', label: 'China' },
    { value: 'AU', label: 'Australia' },
    { value: 'ZA', label: 'South Africa' },
    { value: 'AE', label: 'United Arab Emirates' },
  ];

  $: skillSuggestions = dropdownLists?.skillCategories || [];
</script>

<Modal bind:open title={modalTitle} size="lg" on:close>
  <div slot="header-extra" class="flex items-center gap-2">
    <Badge variant="default">{getTimezoneAbbreviation(timezone)}</Badge>
  </div>

  <form on:submit|preventDefault={handleSubmit} class="space-y-6">
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
          <div class="space-y-1.5">
            <label for="managerId" class="text-sm font-medium">Reports To</label>
            <select
              id="managerId"
              class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              bind:value={managerId}
            >
              <option value="">No Manager</option>
              {#each managers as manager}
                <option value={manager.id}>{manager.firstName} {manager.lastName}</option>
              {/each}
            </select>
          </div>

          <Input
            id="jobTitle"
            label="Job Title"
            placeholder="e.g., Senior Developer"
            bind:value={jobTitle}
          />
        </div>

        <div class="grid gap-4 md:grid-cols-2">
          <div class="space-y-1.5">
            <label for="department" class="text-sm font-medium">Department</label>
            <select
              id="department"
              class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              bind:value={department}
            >
              <option value="">Select Department</option>
              {#each dropdownLists?.departments || [] as dept}
                <option value={dept}>{dept}</option>
              {/each}
            </select>
          </div>

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
          <div class="space-y-1.5">
            <label for="country" class="text-sm font-medium">Country</label>
            <select
              id="country"
              class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              bind:value={country}
            >
              <option value="">Select Country</option>
              {#each countryOptions as option}
                <option value={option.value}>{option.label}</option>
              {/each}
            </select>
          </div>

          <div class="space-y-1.5">
            <label for="region" class="text-sm font-medium">Region</label>
            <select
              id="region"
              class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              bind:value={region}
            >
              <option value="">Select Region</option>
              {#each dropdownLists?.regions || [] as reg}
                <option value={reg}>{reg}</option>
              {/each}
            </select>
          </div>
        </div>

        <div class="grid gap-4 md:grid-cols-2">
          <div class="space-y-1.5">
            <label for="employmentType" class="text-sm font-medium">Employment Type</label>
            <select
              id="employmentType"
              class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              bind:value={employmentType}
            >
              {#each employmentTypeOptions as option}
                <option value={option.value}>{option.label}</option>
              {/each}
            </select>
          </div>

          <div class="space-y-1.5">
            <label for="timezone" class="text-sm font-medium">Timezone</label>
            <select
              id="timezone"
              class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              bind:value={timezone}
            >
              {#each timezoneOptions as option}
                <option value={option.value}>{option.label}</option>
              {/each}
            </select>
          </div>
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
          <p class="text-xs text-muted-foreground">Legal limit based on region (US: 40, India: 48)</p>
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
        {isEdit ? 'Save Changes' : 'Add Member'}
      </Button>
    </div>
  </svelte:fragment>
</Modal>
