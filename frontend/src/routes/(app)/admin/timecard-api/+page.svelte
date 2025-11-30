<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '$lib/api/client';
  import { Card, Button, Spinner } from '$components/shared';
  import { Key, Copy, RotateCw, Trash2, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-svelte';

  // SvelteKit props
  export let data: unknown = null;
  export let form: unknown = null;
  export let params: Record<string, string> = {};

  interface ApiKeyData {
    id: string;
    keyHash: string;
    description: string | null;
    isActive: boolean;
    createdBy: string;
    createdAt: string;
    lastUsedAt: string | null;
    revokedAt: string | null;
  }

  let apiKey: ApiKeyData | null = null;
  let generatedKey: string | null = null; // Only shown once when creating/regenerating
  let loading = true;
  let error = '';
  let showGeneratedKey = false;
  let description = '';

  async function loadApiKey() {
    loading = true;
    error = '';
    try {
      apiKey = await api.admin.timecard.getApiKey();
    } catch (err: any) {
      // 404 means no key exists - this is expected
      if (err.statusCode === 404) {
        apiKey = null;
      } else {
        error = err.message || 'Failed to load API key';
      }
    } finally {
      loading = false;
    }
  }

  onMount(loadApiKey);

  async function createKey() {
    if (!description.trim()) {
      error = 'Please provide a description for the API key';
      return;
    }

    try {
      error = '';
      const result = await api.admin.timecard.createApiKey(description.trim());
      generatedKey = result.apiKey;
      showGeneratedKey = true;
      apiKey = result.keyData;
      description = '';
    } catch (err: any) {
      error = err.message || 'Failed to create API key';
    }
  }

  async function regenerateKey() {
    if (!confirm('Are you sure you want to regenerate the API key? The old key will stop working immediately.')) {
      return;
    }

    try {
      error = '';
      const result = await api.admin.timecard.regenerateApiKey();
      generatedKey = result.apiKey;
      showGeneratedKey = true;
      apiKey = result.keyData;
    } catch (err: any) {
      error = err.message || 'Failed to regenerate API key';
    }
  }

  async function revokeKey() {
    if (!confirm('Are you sure you want to revoke the API key? This will immediately stop all external integrations.')) {
      return;
    }

    try {
      error = '';
      await api.admin.timecard.revokeApiKey();
      apiKey = null;
      generatedKey = null;
    } catch (err: any) {
      error = err.message || 'Failed to revoke API key';
    }
  }

  async function copyToClipboard() {
    if (generatedKey) {
      try {
        await navigator.clipboard.writeText(generatedKey);
        // Visual feedback via button state change could be added here if needed
      } catch (err) {
        error = 'Failed to copy to clipboard';
      }
    }
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleString();
  }
</script>

<svelte:head>
  <title>Time Card API - Admin - PMO Platform</title>
</svelte:head>

<div class="space-y-6">
  <div>
    <h1 class="text-2xl font-bold">Time Card API</h1>
    <p class="text-muted-foreground">Manage API key for external payroll integrations (Workday, PeopleSoft, etc.)</p>
  </div>

  <!-- Important Notice -->
  <Card class="border-l-4 border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
    <div class="p-4 flex gap-3">
      <AlertCircle class="h-5 w-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
      <div class="space-y-1">
        <p class="font-medium text-yellow-900 dark:text-yellow-100">Security Notice</p>
        <p class="text-sm text-yellow-800 dark:text-yellow-200">
          Only one API key can exist at a time. The key will be shown only once when created or regenerated.
          Store it securely - you won't be able to see it again.
        </p>
      </div>
    </div>
  </Card>

  {#if loading}
    <div class="flex justify-center py-12">
      <Spinner size="lg" />
    </div>
  {:else if error}
    <Card class="p-6">
      <p class="text-center text-destructive">{error}</p>
      <div class="mt-4 text-center">
        <Button variant="outline" on:click={loadApiKey}>Retry</Button>
      </div>
    </Card>
  {:else}
    <!-- Generated Key Display (shown only once) -->
    {#if generatedKey}
      <Card class="border-l-4 border-l-green-500 bg-green-50 dark:bg-green-950/20">
        <div class="p-6 space-y-4">
          <div class="flex items-center gap-2">
            <CheckCircle class="h-5 w-5 text-green-600 dark:text-green-500" />
            <h3 class="font-semibold text-green-900 dark:text-green-100">API Key Generated</h3>
          </div>
          <p class="text-sm text-green-800 dark:text-green-200">
            Copy this key now - you won't be able to see it again!
          </p>
          <div class="flex gap-2">
            <div class="flex-1 relative">
              <input
                type={showGeneratedKey ? 'text' : 'password'}
                value={generatedKey}
                readonly
                class="w-full rounded-md border border-green-300 bg-white dark:bg-gray-900 px-3 py-2 pr-24 font-mono text-sm"
              />
              <div class="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                <button
                  on:click={() => showGeneratedKey = !showGeneratedKey}
                  class="rounded p-1.5 hover:bg-green-100 dark:hover:bg-green-900/50"
                  title={showGeneratedKey ? 'Hide' : 'Show'}
                >
                  {#if showGeneratedKey}
                    <EyeOff class="h-4 w-4 text-green-700 dark:text-green-400" />
                  {:else}
                    <Eye class="h-4 w-4 text-green-700 dark:text-green-400" />
                  {/if}
                </button>
                <button
                  on:click={copyToClipboard}
                  class="rounded p-1.5 hover:bg-green-100 dark:hover:bg-green-900/50"
                  title="Copy to clipboard"
                >
                  <Copy class="h-4 w-4 text-green-700 dark:text-green-400" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </Card>
    {/if}

    <!-- Current API Key Status -->
    {#if apiKey}
      <Card>
        <div class="border-b px-6 py-4">
          <h2 class="font-semibold flex items-center gap-2">
            <Key class="h-5 w-5" />
            Active API Key
          </h2>
        </div>
        <div class="p-6 space-y-4">
          <div class="grid gap-4 md:grid-cols-2">
            <div>
              <p class="text-sm font-medium text-muted-foreground">Description</p>
              <p class="mt-1">{apiKey.description || 'No description'}</p>
            </div>
            <div>
              <p class="text-sm font-medium text-muted-foreground">Status</p>
              <div class="mt-1 flex items-center gap-2">
                <div class={`h-2 w-2 rounded-full ${apiKey.isActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <p>{apiKey.isActive ? 'Active' : 'Revoked'}</p>
              </div>
            </div>
            <div>
              <p class="text-sm font-medium text-muted-foreground">Created</p>
              <p class="mt-1 text-sm">{formatDate(apiKey.createdAt)}</p>
            </div>
            <div>
              <p class="text-sm font-medium text-muted-foreground">Last Used</p>
              <p class="mt-1 text-sm">{formatDate(apiKey.lastUsedAt)}</p>
            </div>
          </div>

          <div class="border-t pt-4 flex gap-3">
            <Button variant="outline" on:click={regenerateKey}>
              <RotateCw class="mr-2 h-4 w-4" />
              Regenerate Key
            </Button>
            <Button variant="destructive" on:click={revokeKey}>
              <Trash2 class="mr-2 h-4 w-4" />
              Revoke Key
            </Button>
          </div>
        </div>
      </Card>
    {:else}
      <!-- No API Key Exists -->
      <Card>
        <div class="p-6 text-center space-y-4">
          <div class="flex justify-center">
            <div class="rounded-full bg-muted p-4">
              <Key class="h-8 w-8 text-muted-foreground" />
            </div>
          </div>
          <div>
            <h3 class="font-semibold">No API Key</h3>
            <p class="text-sm text-muted-foreground">Create an API key to enable time card data export</p>
          </div>
          <div class="max-w-md mx-auto space-y-3">
            <input
              type="text"
              placeholder="Description (e.g., 'Workday Integration')"
              bind:value={description}
              class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <Button on:click={createKey} disabled={!description.trim()}>
              <Key class="mr-2 h-4 w-4" />
              Create API Key
            </Button>
          </div>
        </div>
      </Card>
    {/if}

    <!-- API Documentation Link -->
    <Card>
      <div class="p-6">
        <h3 class="font-semibold mb-2">API Documentation</h3>
        <p class="text-sm text-muted-foreground mb-4">
          Learn how to integrate with the Time Card API to export time card data for payroll processing.
        </p>
        <Button variant="outline" href="https://github.com/dtsoden/pmo/blob/main/docs/TIME-CARD-API.md" target="_blank">
          View API Documentation
        </Button>
      </div>
    </Card>
  {/if}
</div>
