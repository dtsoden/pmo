<script lang="ts">
  import { Card, Button, Input } from '$components/shared';
  import { toast } from 'svelte-sonner';
  import { api } from '$lib/api/client';

  // SvelteKit props - must be declared to avoid warnings
  export let data: unknown = null;
  export let form: unknown = null;
  export let params: Record<string, string> = {};

  let currentPassword = '';
  let newPassword = '';
  let confirmPassword = '';
  let saving = false;

  async function handleChangePassword() {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    saving = true;

    try {
      await api.users.changePassword(currentPassword, newPassword);
      toast.success('Password changed successfully');
      currentPassword = '';
      newPassword = '';
      confirmPassword = '';
    } catch (err: any) {
      const message = err?.error || err?.message || 'Failed to change password';
      toast.error(message);
    } finally {
      saving = false;
    }
  }
</script>

<svelte:head>
  <title>Security Settings - PMO</title>
</svelte:head>

<div class="space-y-6">
  <Card class="p-6">
    <h2 class="mb-6 text-lg font-semibold">Change Password</h2>

    <form on:submit|preventDefault={handleChangePassword} class="space-y-4">
      <Input
        id="currentPassword"
        type="password"
        label="Current Password"
        bind:value={currentPassword}
        required
        autocomplete="current-password"
      />

      <Input
        id="newPassword"
        type="password"
        label="New Password"
        bind:value={newPassword}
        required
        autocomplete="new-password"
      />

      <Input
        id="confirmPassword"
        type="password"
        label="Confirm New Password"
        bind:value={confirmPassword}
        required
        autocomplete="new-password"
      />

      <div class="flex justify-end pt-4">
        <Button type="submit" loading={saving}>
          Update Password
        </Button>
      </div>
    </form>
  </Card>

  <Card class="p-6">
    <h2 class="mb-4 text-lg font-semibold">Sessions</h2>
    <p class="mb-4 text-sm text-muted-foreground">
      Manage your active sessions. You can sign out of other devices if needed.
    </p>
    <Button variant="outline">Sign Out All Other Sessions</Button>
  </Card>
</div>
