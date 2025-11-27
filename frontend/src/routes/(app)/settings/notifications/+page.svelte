<script lang="ts">
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import { Card, Button } from '$components/shared';
  import { toast } from 'svelte-sonner';
  import { api } from '$lib/api/client';

  // SvelteKit props - must be declared to avoid warnings
  export let data: unknown = null;
  export let form: unknown = null;
  export let params: Record<string, string> = {};

  interface NotificationPrefs {
    emailNotifications: boolean;
    projectUpdates: boolean;
    taskAssignments: boolean;
    timeReminders: boolean;
    weeklyDigest: boolean;
  }

  const defaults: NotificationPrefs = {
    emailNotifications: true,
    projectUpdates: true,
    taskAssignments: true,
    timeReminders: true,
    weeklyDigest: false,
  };

  // Initialize with defaults
  let emailNotifications = defaults.emailNotifications;
  let projectUpdates = defaults.projectUpdates;
  let taskAssignments = defaults.taskAssignments;
  let timeReminders = defaults.timeReminders;
  let weeklyDigest = defaults.weeklyDigest;
  let saving = false;
  let loading = true;

  // Load preferences from API on mount
  onMount(async () => {
    try {
      const prefs = await api.users.getPreferences();
      if (prefs.notifications) {
        emailNotifications = prefs.notifications.emailNotifications ?? defaults.emailNotifications;
        projectUpdates = prefs.notifications.projectUpdates ?? defaults.projectUpdates;
        taskAssignments = prefs.notifications.taskAssignments ?? defaults.taskAssignments;
        timeReminders = prefs.notifications.timeReminders ?? defaults.timeReminders;
        weeklyDigest = prefs.notifications.weeklyDigest ?? defaults.weeklyDigest;
      }
    } catch (err) {
      console.warn('Could not load notification preferences:', err);
    } finally {
      loading = false;
    }
  });

  async function handleSave() {
    saving = true;

    try {
      const notificationPrefs: NotificationPrefs = {
        emailNotifications,
        projectUpdates,
        taskAssignments,
        timeReminders,
        weeklyDigest,
      };

      await api.users.updatePreferences({ notifications: notificationPrefs });
      toast.success('Notification preferences saved');
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to save preferences');
    } finally {
      saving = false;
    }
  }
</script>

<svelte:head>
  <title>Notification Settings - PMO</title>
</svelte:head>

<div class="space-y-6">
  <Card class="p-6">
    <h2 class="mb-6 text-lg font-semibold">Notification Preferences</h2>

    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <p class="font-medium">Email Notifications</p>
          <p class="text-sm text-muted-foreground">Receive notifications via email</p>
        </div>
        <label class="relative inline-flex cursor-pointer items-center">
          <input type="checkbox" bind:checked={emailNotifications} class="peer sr-only" />
          <div class="peer h-6 w-11 rounded-full bg-muted after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full" />
        </label>
      </div>

      <div class="border-t pt-6">
        <p class="mb-4 font-medium">Notification Types</p>

        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium">Project Updates</p>
              <p class="text-xs text-muted-foreground">When projects are created or updated</p>
            </div>
            <label class="relative inline-flex cursor-pointer items-center">
              <input type="checkbox" bind:checked={projectUpdates} class="peer sr-only" />
              <div class="peer h-6 w-11 rounded-full bg-muted after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full" />
            </label>
          </div>

          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium">Task Assignments</p>
              <p class="text-xs text-muted-foreground">When you're assigned to a task</p>
            </div>
            <label class="relative inline-flex cursor-pointer items-center">
              <input type="checkbox" bind:checked={taskAssignments} class="peer sr-only" />
              <div class="peer h-6 w-11 rounded-full bg-muted after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full" />
            </label>
          </div>

          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium">Time Tracking Reminders</p>
              <p class="text-xs text-muted-foreground">Reminders to log your time</p>
            </div>
            <label class="relative inline-flex cursor-pointer items-center">
              <input type="checkbox" bind:checked={timeReminders} class="peer sr-only" />
              <div class="peer h-6 w-11 rounded-full bg-muted after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full" />
            </label>
          </div>

          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium">Weekly Digest</p>
              <p class="text-xs text-muted-foreground">Summary of weekly activity</p>
            </div>
            <label class="relative inline-flex cursor-pointer items-center">
              <input type="checkbox" bind:checked={weeklyDigest} class="peer sr-only" />
              <div class="peer h-6 w-11 rounded-full bg-muted after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full" />
            </label>
          </div>
        </div>
      </div>

      <div class="flex justify-end pt-4">
        <Button loading={saving} on:click={handleSave}>
          Save Preferences
        </Button>
      </div>
    </div>
  </Card>
</div>
