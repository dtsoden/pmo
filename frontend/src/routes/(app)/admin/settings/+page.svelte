<script lang="ts">
  import { onMount } from 'svelte';
  import { api, type AdminSettings, type SettingCategory, type CategorySettings } from '$lib/api/client';
  import { hasAnyRole } from '$lib/stores/auth';
  import { goto } from '$app/navigation';
  import { toast } from 'svelte-sonner';
  import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$components/ui/card';
  import { Badge } from '$components/ui/badge';
  import { Button } from '$components/ui/button';
  import { Input } from '$components/ui/input';
  import { Spinner } from '$components/shared';
  import {
    Shield,
    Bell,
    Settings,
    Plug,
    Save,
    RotateCcw,
    AlertCircle,
    Check,
    Database,
  } from 'lucide-svelte';

  // SvelteKit props - must be declared to avoid warnings
  export let data: unknown = null;
  export let form: unknown = null;
  export let params: Record<string, string> = {};

  let settings: AdminSettings | null = null;
  let loading = true;
  let error: string | null = null;
  let activeCategory: SettingCategory = 'security';
  let saving = false;
  let editedValues: Record<string, Record<string, unknown>> = {};
  let testDataEnabled = false;
  let testDataProcessing = false;

  const categoryInfo = {
    security: {
      icon: Shield,
      title: 'Security Settings',
      description: 'Password policies, session management, and lockout settings',
    },
    notifications: {
      icon: Bell,
      title: 'Notification Settings',
      description: 'Email notifications and alert preferences',
    },
    platform: {
      icon: Settings,
      title: 'Platform Settings',
      description: 'General platform configuration and features',
    },
    integrations: {
      icon: Plug,
      title: 'Integration Settings',
      description: 'External service connections and APIs',
    },
  };

  onMount(async () => {
    if (!hasAnyRole('ADMIN', 'SUPER_ADMIN')) {
      goto('/dashboard');
      return;
    }

    await loadSettings();
  });

  async function loadSettings() {
    loading = true;
    error = null;
    try {
      const response = await api.admin.settings.getAll();
      settings = response.settings;
      // Initialize edited values
      editedValues = {};
      for (const cat of Object.keys(settings)) {
        editedValues[cat] = {};
        for (const [key, val] of Object.entries(settings[cat as SettingCategory])) {
          editedValues[cat][key] = val.value;
        }
      }
      // Initialize test data toggle from settings
      testDataEnabled = settings.platform?.testDataInstalled?.value === true;
    } catch (err) {
      error = (err as { message?: string })?.message || 'Failed to load settings';
    } finally {
      loading = false;
    }
  }

  async function saveSetting(category: SettingCategory, key: string) {
    saving = true;
    try {
      await api.admin.settings.update(category, key, editedValues[category][key]);
      toast.success('Setting updated');
      // Update local state
      if (settings && settings[category] && settings[category][key]) {
        settings[category][key].value = editedValues[category][key];
      }
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to update setting');
    } finally {
      saving = false;
    }
  }

  async function resetCategory(category: SettingCategory) {
    if (!confirm(`Are you sure you want to reset ${category} settings to defaults?`)) {
      return;
    }

    saving = true;
    try {
      await api.admin.settings.resetCategory(category);
      toast.success('Settings reset to defaults');
      await loadSettings();
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to reset settings');
    } finally {
      saving = false;
    }
  }

  function getInputType(key: string, value: unknown): string {
    if (typeof value === 'boolean') return 'checkbox';
    if (typeof value === 'number') return 'number';
    return 'text';
  }

  function formatKey(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  function hasChanges(category: SettingCategory, key: string): boolean {
    if (!settings || !settings[category] || !settings[category][key]) return false;
    return editedValues[category]?.[key] !== settings[category][key].value;
  }

  async function toggleTestData() {
    // testDataEnabled has already been toggled by bind:checked, so use it directly
    const newState = testDataEnabled;
    const action = newState ? 'install' : 'clear';

    if (!confirm(`Are you sure you want to ${action} all test data? ${newState ? 'This will populate the database with sample data for testing.' : 'This will remove all data except your admin account and dropdown lists.'}`)) {
      // User cancelled - revert the toggle
      testDataEnabled = !newState;
      return;
    }

    testDataProcessing = true;
    try {
      const result = await api.admin.testData.toggle(newState);
      toast.success(result.message);
      // Reload settings to persist the new state
      await loadSettings();
    } catch (err) {
      // Error - revert the toggle
      testDataEnabled = !newState;
      toast.error((err as { message?: string })?.message || `Failed to ${action} test data`);
    } finally {
      testDataProcessing = false;
    }
  }
</script>

<svelte:head>
  <title>Platform Settings - Admin - PMO Platform</title>
</svelte:head>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-3xl font-bold">Platform Settings</h1>
      <p class="text-muted-foreground">Configure security, notifications, and platform behavior</p>
    </div>
  </div>

  {#if loading}
    <div class="flex h-64 items-center justify-center">
      <Spinner size="lg" />
    </div>
  {:else if error}
    <Card>
      <CardContent class="py-8">
        <div class="text-center text-destructive">
          <AlertCircle class="mx-auto mb-2 h-8 w-8" />
          <p>{error}</p>
        </div>
      </CardContent>
    </Card>
  {:else if settings}
    <div class="flex flex-col lg:flex-row gap-6">
      <!-- Category Navigation -->
      <div class="lg:w-56 flex-shrink-0">
        <Card>
          <CardContent class="p-2">
            <nav class="space-y-1">
              {#each Object.entries(categoryInfo) as [cat, info]}
                <button
                  class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors {activeCategory === cat
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'}"
                  on:click={() => (activeCategory = cat)}
                >
                  <svelte:component this={info.icon} class="h-4 w-4" />
                  {info.title.replace(' Settings', '')}
                </button>
              {/each}
            </nav>
          </CardContent>
        </Card>
      </div>

      <!-- Settings Panel -->
      <div class="flex-1 min-w-0">
        <Card>
          <CardHeader>
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle class="flex items-center gap-2">
                  <svelte:component this={categoryInfo[activeCategory].icon} class="h-5 w-5" />
                  {categoryInfo[activeCategory].title}
                </CardTitle>
                <CardDescription>
                  {categoryInfo[activeCategory].description}
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                on:click={() => resetCategory(activeCategory)}
                disabled={saving}
                class="self-start sm:self-center"
              >
                <RotateCcw class="h-4 w-4 mr-1" />
                Reset
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div class="space-y-4">
              <!-- Test Data Toggle (Platform category only, SUPER_ADMIN only) -->
              {#if activeCategory === 'platform' && hasAnyRole('SUPER_ADMIN')}
                <div class="bg-muted/50 rounded-lg p-4 border-2 border-dashed border-muted-foreground/20">
                  <div class="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div class="flex-1 min-w-0">
                      <label for="testDataToggle" class="text-sm font-medium flex items-center gap-2">
                        <Database class="h-4 w-4" />
                        Test Data
                      </label>
                      <p class="text-xs text-muted-foreground mt-0.5">
                        {testDataEnabled
                          ? 'Test data is installed. Toggle OFF to clear all data except your admin account and dropdown lists.'
                          : 'Install comprehensive sample data for testing. Includes users, clients, projects, time entries, and more.'}
                      </p>
                    </div>

                    <div class="flex items-center gap-2">
                      <label for="testDataToggle" class="relative inline-flex items-center cursor-pointer">
                        <input
                          id="testDataToggle"
                          type="checkbox"
                          class="sr-only peer"
                          bind:checked={testDataEnabled}
                          on:change={toggleTestData}
                          disabled={testDataProcessing}
                        />
                        <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary {testDataProcessing ? 'opacity-50' : ''}"></div>
                      </label>

                      {#if testDataProcessing}
                        <div class="w-9 h-9 flex items-center justify-center">
                          <Spinner size="sm" />
                        </div>
                      {:else}
                        <div class="w-9 h-9 flex items-center justify-center {testDataEnabled ? 'text-green-500' : 'text-muted-foreground'}">
                          {#if testDataEnabled}
                            <Check class="h-4 w-4" />
                          {:else}
                            <Database class="h-4 w-4" />
                          {/if}
                        </div>
                      {/if}
                    </div>
                  </div>
                </div>
              {/if}

              {#each Object.entries(settings[activeCategory]) as [key, setting]}
                <div class="flex flex-col sm:flex-row sm:items-center gap-3 py-3 border-b last:border-0">
                  <div class="flex-1 min-w-0">
                    <label for={key} class="text-sm font-medium">
                      {formatKey(key)}
                    </label>
                    {#if setting.description}
                      <p class="text-xs text-muted-foreground mt-0.5">
                        {setting.description}
                      </p>
                    {/if}
                  </div>

                  <div class="flex items-center gap-2">
                    {#if typeof setting.value === 'boolean'}
                      <label for={key} class="relative inline-flex items-center cursor-pointer">
                        <input
                          id={key}
                          type="checkbox"
                          class="sr-only peer"
                          bind:checked={editedValues[activeCategory][key]}
                        />
                        <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    {:else if typeof setting.value === 'number'}
                      <Input
                        type="number"
                        id={key}
                        class="w-28"
                        bind:value={editedValues[activeCategory][key]}
                      />
                    {:else}
                      <Input
                        type="text"
                        id={key}
                        class="w-full sm:w-48 md:w-64"
                        bind:value={editedValues[activeCategory][key]}
                      />
                    {/if}

                    {#if hasChanges(activeCategory, key)}
                      <Button
                        size="sm"
                        disabled={saving}
                        on:click={() => saveSetting(activeCategory, key)}
                      >
                        {#if saving}
                          <Spinner size="sm" />
                        {:else}
                          <Save class="h-4 w-4" />
                        {/if}
                      </Button>
                    {:else}
                      <div class="w-9 h-9 flex items-center justify-center text-green-500">
                        <Check class="h-4 w-4" />
                      </div>
                    {/if}
                  </div>
                </div>
              {:else}
                <p class="text-center text-muted-foreground py-8">
                  No settings in this category
                </p>
              {/each}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  {/if}
</div>
