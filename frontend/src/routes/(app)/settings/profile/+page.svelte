<script lang="ts">
  import { user, auth } from '$lib/stores/auth';
  import { api } from '$lib/api/client';
  import { Card, Button, Input, Avatar } from '$components/shared';
  import { fullName, ROLE_LABELS } from '$lib/utils';
  import { toast } from 'svelte-sonner';

  // SvelteKit props - must be declared to avoid warnings
  export let data: unknown = null;
  export let form: unknown = null;
  export let params: Record<string, string> = {};

  let firstName = $user?.firstName || '';
  let lastName = $user?.lastName || '';
  let jobTitle = $user?.jobTitle || '';
  let department = $user?.department || '';
  let phone = $user?.phone || '';
  let timezone = $user?.timezone || 'UTC';
  let saving = false;

  // Common timezones with UTC offsets
  const timezones = [
    // UTC
    { value: 'UTC', label: 'UTC', offset: 0 },

    // Americas - North America
    { value: 'America/New_York', label: 'New York, Toronto (EST/EDT)', offset: -5 },
    { value: 'America/Chicago', label: 'Chicago, Mexico City (CST/CDT)', offset: -6 },
    { value: 'America/Denver', label: 'Denver, Calgary (MST/MDT)', offset: -7 },
    { value: 'America/Phoenix', label: 'Phoenix (MST - no DST)', offset: -7 },
    { value: 'America/Los_Angeles', label: 'Los Angeles, Vancouver (PST/PDT)', offset: -8 },
    { value: 'America/Anchorage', label: 'Anchorage (AKST/AKDT)', offset: -9 },
    { value: 'Pacific/Honolulu', label: 'Honolulu (HST)', offset: -10 },

    // Americas - Central America & Caribbean
    { value: 'America/Costa_Rica', label: 'Costa Rica, El Salvador', offset: -6 },
    { value: 'America/Panama', label: 'Panama, Jamaica', offset: -5 },
    { value: 'America/Havana', label: 'Havana', offset: -5 },

    // Americas - South America
    { value: 'America/Sao_Paulo', label: 'São Paulo, Brasília', offset: -3 },
    { value: 'America/Buenos_Aires', label: 'Buenos Aires', offset: -3 },
    { value: 'America/Santiago', label: 'Santiago', offset: -4 },
    { value: 'America/Lima', label: 'Lima, Bogotá', offset: -5 },
    { value: 'America/Caracas', label: 'Caracas', offset: -4 },

    // Europe - Western
    { value: 'Europe/London', label: 'London, Lisbon (GMT/BST)', offset: 0 },
    { value: 'Europe/Dublin', label: 'Dublin', offset: 0 },

    // Europe - Central
    { value: 'Europe/Paris', label: 'Paris, Madrid, Rome (CET/CEST)', offset: 1 },
    { value: 'Europe/Berlin', label: 'Berlin, Amsterdam, Brussels', offset: 1 },
    { value: 'Europe/Zurich', label: 'Zurich, Vienna', offset: 1 },
    { value: 'Europe/Prague', label: 'Prague, Budapest', offset: 1 },
    { value: 'Europe/Warsaw', label: 'Warsaw, Stockholm', offset: 1 },

    // Europe - Eastern
    { value: 'Europe/Athens', label: 'Athens, Bucharest, Helsinki', offset: 2 },
    { value: 'Europe/Istanbul', label: 'Istanbul', offset: 3 },
    { value: 'Europe/Moscow', label: 'Moscow', offset: 3 },

    // Africa
    { value: 'Africa/Cairo', label: 'Cairo', offset: 2 },
    { value: 'Africa/Johannesburg', label: 'Johannesburg, Cape Town', offset: 2 },
    { value: 'Africa/Lagos', label: 'Lagos, Kinshasa', offset: 1 },
    { value: 'Africa/Nairobi', label: 'Nairobi, Addis Ababa', offset: 3 },
    { value: 'Africa/Casablanca', label: 'Casablanca', offset: 1 },

    // Middle East
    { value: 'Asia/Dubai', label: 'Dubai, Abu Dhabi', offset: 4 },
    { value: 'Asia/Riyadh', label: 'Riyadh', offset: 3 },
    { value: 'Asia/Tel_Aviv', label: 'Tel Aviv, Jerusalem', offset: 2 },
    { value: 'Asia/Tehran', label: 'Tehran', offset: 3.5 },

    // Asia - South
    { value: 'Asia/Kolkata', label: 'Mumbai, Delhi, Bangalore (IST)', offset: 5.5 },
    { value: 'Asia/Karachi', label: 'Karachi', offset: 5 },
    { value: 'Asia/Dhaka', label: 'Dhaka', offset: 6 },

    // Asia - Southeast
    { value: 'Asia/Bangkok', label: 'Bangkok, Jakarta, Hanoi', offset: 7 },
    { value: 'Asia/Singapore', label: 'Singapore, Kuala Lumpur', offset: 8 },
    { value: 'Asia/Manila', label: 'Manila', offset: 8 },

    // Asia - East
    { value: 'Asia/Shanghai', label: 'Beijing, Shanghai, Hong Kong', offset: 8 },
    { value: 'Asia/Tokyo', label: 'Tokyo, Seoul', offset: 9 },
    { value: 'Asia/Taipei', label: 'Taipei', offset: 8 },

    // Oceania
    { value: 'Australia/Perth', label: 'Perth (AWST)', offset: 8 },
    { value: 'Australia/Adelaide', label: 'Adelaide (ACST/ACDT)', offset: 9.5 },
    { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)', offset: 10 },
    { value: 'Australia/Melbourne', label: 'Melbourne (AEST/AEDT)', offset: 10 },
    { value: 'Australia/Brisbane', label: 'Brisbane (AEST - no DST)', offset: 10 },
    { value: 'Pacific/Auckland', label: 'Auckland (NZST/NZDT)', offset: 12 },
    { value: 'Pacific/Wellington', label: 'Wellington (NZST/NZDT)', offset: 12 },
    { value: 'Pacific/Fiji', label: 'Fiji', offset: 12 },
  ];

  // Update form when user changes
  $: if ($user) {
    firstName = $user.firstName;
    lastName = $user.lastName;
    jobTitle = $user.jobTitle || '';
    department = $user.department || '';
    phone = $user.phone || '';
    timezone = $user.timezone || 'UTC';
  }

  async function handleSave() {
    if (!$user) return;

    saving = true;

    try {
      await api.users.update($user.id, {
        firstName,
        lastName,
        jobTitle: jobTitle || undefined,
        department: department || undefined,
        phone: phone || undefined,
        timezone,
      });

      // Refresh user data
      await auth.initialize();
      toast.success('Profile updated successfully');
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to update profile');
    } finally {
      saving = false;
    }
  }
</script>

<svelte:head>
  <title>Profile Settings - PMO</title>
</svelte:head>

<div class="space-y-6">
  <Card class="p-6">
    <h2 class="mb-6 text-lg font-semibold">Profile Information</h2>

    <!-- Avatar Section -->
    <div class="mb-6 flex items-center gap-4">
      <Avatar
        firstName={$user?.firstName}
        lastName={$user?.lastName}
        src={$user?.avatarUrl}
        size="lg"
      />
      <div>
        <p class="font-medium">{fullName($user?.firstName, $user?.lastName)}</p>
        <p class="text-sm text-muted-foreground">{ROLE_LABELS[$user?.role || ''] || $user?.role}</p>
      </div>
    </div>

    <form on:submit|preventDefault={handleSave} class="space-y-4">
      <div class="grid gap-4 md:grid-cols-2">
        <Input
          id="firstName"
          label="First Name"
          bind:value={firstName}
          required
        />
        <Input
          id="lastName"
          label="Last Name"
          bind:value={lastName}
          required
        />
      </div>

      <Input
        id="email"
        type="email"
        label="Email"
        value={$user?.email || ''}
        disabled
      />

      <div class="grid gap-4 md:grid-cols-2">
        <Input
          id="jobTitle"
          label="Job Title"
          placeholder="e.g., Senior Developer"
          bind:value={jobTitle}
        />
        <Input
          id="department"
          label="Department"
          placeholder="e.g., Engineering"
          bind:value={department}
        />
      </div>

      <Input
        id="phone"
        type="tel"
        label="Phone"
        placeholder="+1 (555) 123-4567"
        bind:value={phone}
      />

      <div class="space-y-2">
        <label for="timezone" class="text-sm font-medium">Timezone</label>
        <select
          id="timezone"
          bind:value={timezone}
          class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {#each timezones as tz}
            <option value={tz.value}>{tz.label}</option>
          {/each}
        </select>
        <p class="text-xs text-muted-foreground">
          Your timezone is used to accurately log time entries and display times in reports
        </p>
      </div>

      <div class="flex justify-end pt-4">
        <Button type="submit" loading={saving}>
          Save Changes
        </Button>
      </div>
    </form>
  </Card>
</div>
