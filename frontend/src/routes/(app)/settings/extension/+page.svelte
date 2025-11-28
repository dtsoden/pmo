<script lang="ts">
  import { onMount } from 'svelte';
  import { auth } from '$lib/stores/auth';
  import { api } from '$lib/api/client';
  import { Card, Button } from '$components/shared';
  import { toast } from 'svelte-sonner';
  import { Download, Link, Check, Chrome } from 'lucide-svelte';

  // SvelteKit props - must be declared to avoid warnings
  export let data: unknown = null;
  export let form: unknown = null;
  export let params: Record<string, string> = {};

  // Wizard steps
  type WizardStep = 'download' | 'install' | 'connect' | 'complete';
  let currentStep: WizardStep = 'download';

  let extensionDetected = false;
  let extensionAuthenticated = false;
  let connecting = false;

  // Check if extension is already authenticated on mount
  async function checkInitialStatus() {
    const status = await checkExtensionStatus();

    if (status.authenticated) {
      // Extension is fully connected
      currentStep = 'complete';
    } else if (status.detected) {
      // Extension is installed but not authenticated (session expired)
      // Skip directly to connect step for easy reconnection
      currentStep = 'connect';
      extensionDetected = true;
      console.log('Extension detected but not authenticated - ready to reconnect');
    }
    // else: Extension not installed, stay on download step
  }

  // Check extension status (no polling, just one check)
  function checkExtensionStatus(): Promise<{ detected: boolean; authenticated: boolean }> {
    return new Promise((resolve) => {
      let responded = false;

      const messageHandler = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        if (event.data?.type === 'PMO_EXTENSION_READY' && !responded) {
          responded = true;
          window.removeEventListener('message', messageHandler);
          resolve({
            detected: true,
            authenticated: event.data.isAuthenticated === true,
          });
        }
      };

      window.addEventListener('message', messageHandler);
      window.postMessage({ type: 'PMO_EXTENSION_PING' }, window.location.origin);

      // Timeout after 1 second
      setTimeout(() => {
        if (!responded) {
          responded = true;
          window.removeEventListener('message', messageHandler);
          resolve({ detected: false, authenticated: false });
        }
      }, 1000);
    });
  }

  onMount(() => {
    checkInitialStatus();
  });

  function handleDownloadClick() {
    currentStep = 'install';
  }

  async function connectExtension() {
    connecting = true;

    try {
      // First, check if extension is installed
      const status = await checkExtensionStatus();

      if (!status.detected) {
        toast.error('Extension not detected. Please install it first.');
        connecting = false;
        return;
      }

      if (status.authenticated) {
        // Already authenticated!
        currentStep = 'complete';
        toast.success('Extension already connected!');
        connecting = false;
        return;
      }

      // Extension is installed but not authenticated - connect it
      const token = api.getToken();
      if (!token) {
        toast.error('Not authenticated - please refresh the page');
        connecting = false;
        return;
      }

      // Validate token with backend
      await api.extension.install();

      // Send auth message to extension
      const apiUrl = window.location.hostname === 'localhost'
        ? 'http://localhost:7600'
        : 'https://pmoservices.cnxlab.us';

      window.postMessage(
        {
          type: 'PMO_EXTENSION_AUTH',
          token: token,
          apiUrl: apiUrl,
        },
        window.location.origin
      );

      // Wait for response from extension
      const response = await new Promise<{ success: boolean; error?: string }>((resolve) => {
        const timeout = setTimeout(() => {
          resolve({ success: false, error: 'Extension did not respond. Please try again.' });
        }, 5000);

        const handler = (event: MessageEvent) => {
          if (event.origin !== window.location.origin) return;

          if (event.data?.type === 'PMO_EXTENSION_AUTH_RESPONSE') {
            clearTimeout(timeout);
            window.removeEventListener('message', handler);
            resolve({
              success: event.data.success,
              error: event.data.error,
            });
          }
        };

        window.addEventListener('message', handler);
      });

      if (response.success) {
        toast.success('Extension connected successfully!');
        currentStep = 'complete';
      } else {
        toast.error(response.error || 'Failed to connect extension');
      }
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to connect extension');
    } finally {
      connecting = false;
    }
  }

  const steps = [
    { id: 'download', label: 'Download', number: 1 },
    { id: 'install', label: 'Install', number: 2 },
    { id: 'connect', label: 'Connect', number: 3 },
    { id: 'complete', label: 'Complete', number: 4 },
  ];

  function getStepIndex(step: WizardStep): number {
    return steps.findIndex(s => s.id === step);
  }
</script>

<svelte:head>
  <title>Browser Extension Setup - PMO</title>
</svelte:head>

<div class="space-y-6">
  <div>
    <h1 class="text-2xl font-bold">Browser Extension Setup</h1>
    <p class="text-muted-foreground">Follow the steps below to install and connect the PMO Timer extension</p>
  </div>

  <!-- Progress Indicator -->
  <Card class="p-6">
    <div class="flex items-center justify-between">
      {#each steps as step, i}
        <div class="flex items-center flex-1">
          <div class="flex flex-col items-center">
            <div class="flex items-center justify-center w-10 h-10 rounded-full border-2 {
              getStepIndex(currentStep) > i ? 'bg-green-600 border-green-600 text-white' :
              getStepIndex(currentStep) === i ? 'bg-blue-600 border-blue-600 text-white' :
              'bg-muted border-border text-muted-foreground'
            }">
              {#if getStepIndex(currentStep) > i}
                <Check class="h-5 w-5" />
              {:else}
                <span class="text-sm font-semibold">{step.number}</span>
              {/if}
            </div>
            <span class="mt-2 text-xs font-medium {
              getStepIndex(currentStep) >= i ? 'text-foreground' : 'text-muted-foreground'
            }">{step.label}</span>
          </div>
          {#if i < steps.length - 1}
            <div class="flex-1 h-0.5 mx-4 {
              getStepIndex(currentStep) > i ? 'bg-green-600' : 'bg-border'
            }"></div>
          {/if}
        </div>
      {/each}
    </div>
  </Card>

  <!-- Step Content -->
  {#if currentStep === 'download'}
    <Card class="p-6">
      <div class="space-y-6">
        <div>
          <h2 class="text-xl font-semibold mb-2">Step 1: Download Extension</h2>
          <p class="text-sm text-muted-foreground">
            Download the PMO Timer extension package to your computer
          </p>
        </div>

        <div class="rounded-lg border-2 border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-900 p-6 text-center">
          <Chrome class="h-12 w-12 mx-auto mb-4 text-blue-600" />
          <p class="mb-4 text-sm text-muted-foreground">
            Click the button below to download the extension files
          </p>
          <a href="/api/extension/download" download="pmo-timer-extension.zip" on:click={handleDownloadClick}>
            <Button size="lg">
              <Download class="mr-2 h-5 w-5" />
              Download Extension
            </Button>
          </a>
        </div>

        <div class="text-sm text-muted-foreground">
          <p class="font-medium mb-2">What happens next:</p>
          <ul class="space-y-1 list-disc list-inside">
            <li>The extension will download as a ZIP file</li>
            <li>Save it somewhere you can find it (like your Downloads folder)</li>
            <li>Click the Download button above when ready</li>
          </ul>
        </div>
      </div>
    </Card>
  {/if}

  {#if currentStep === 'install'}
    <Card class="p-6">
      <div class="space-y-6">
        <div>
          <h2 class="text-xl font-semibold mb-2">Step 2: Install Extension</h2>
          <p class="text-sm text-muted-foreground">
            Extract the ZIP file to a permanent location and load it into Chrome
          </p>
        </div>

        <div class="rounded-lg border-2 border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900 p-4">
          <p class="text-sm text-red-900 dark:text-red-100">
            <strong>⚠️ IMPORTANT:</strong> Extract the ZIP file to a <strong>permanent location</strong> where it will stay forever.
            Good locations: <code class="bg-red-100 dark:bg-red-900 px-1 rounded">Documents\Chrome Extensions</code> or
            <code class="bg-red-100 dark:bg-red-900 px-1 rounded">C:\Program Files\PMO Extension</code>
          </p>
          <p class="text-sm text-red-900 dark:text-red-100 mt-2">
            <strong>DO NOT</strong> extract to your Downloads folder or Desktop - if you delete the folder later, the extension will break!
          </p>
        </div>

        <div class="rounded-lg border border-border bg-muted/50 p-4">
          <h3 class="mb-3 text-sm font-semibold">Installation Instructions</h3>
          <ol class="space-y-3 text-sm">
            <li class="flex gap-3">
              <span class="font-semibold text-blue-600 shrink-0">1.</span>
              <div>
                <span>Extract the downloaded ZIP file to a <strong>permanent location</strong>:</span>
                <ul class="mt-2 ml-4 space-y-1 text-xs text-muted-foreground">
                  <li>✓ Good: <code class="bg-background px-1 rounded">Documents\Chrome Extensions\pmo-timer</code></li>
                  <li>✓ Good: <code class="bg-background px-1 rounded">C:\Program Files\PMO Timer</code></li>
                  <li>✗ Bad: Downloads folder (you might delete it later)</li>
                  <li>✗ Bad: Desktop (temporary location)</li>
                </ul>
              </div>
            </li>
            <li class="flex gap-3">
              <span class="font-semibold text-blue-600 shrink-0">2.</span>
              <div>
                <span>Open Chrome and navigate to:</span>
                <code class="block mt-1 rounded bg-background px-2 py-1 font-mono text-xs">chrome://extensions</code>
              </div>
            </li>
            <li class="flex gap-3">
              <span class="font-semibold text-blue-600 shrink-0">3.</span>
              <span>Enable <strong>"Developer mode"</strong> using the toggle in the top-right corner</span>
            </li>
            <li class="flex gap-3">
              <span class="font-semibold text-blue-600 shrink-0">4.</span>
              <span>Click <strong>"Load unpacked"</strong> button</span>
            </li>
            <li class="flex gap-3">
              <span class="font-semibold text-blue-600 shrink-0">5.</span>
              <span>Navigate to and select the <strong>extracted extension folder</strong> (the one containing manifest.json)</span>
            </li>
            <li class="flex gap-3">
              <span class="font-semibold text-blue-600 shrink-0">6.</span>
              <span><strong>Remember:</strong> Keep this folder - never delete it or the extension will stop working!</span>
            </li>
          </ol>
        </div>

        <div class="flex justify-end mt-6">
          <Button size="lg" on:click={() => currentStep = 'connect'}>
            Next: Connect Extension →
          </Button>
        </div>
      </div>
    </Card>
  {/if}

  {#if currentStep === 'connect'}
    <Card class="p-6">
      <div class="space-y-6">
        <div>
          <h2 class="text-xl font-semibold mb-2">
            {extensionDetected ? 'Reconnect Extension' : 'Step 3: Connect Extension'}
          </h2>
          <p class="text-sm text-muted-foreground">
            {extensionDetected
              ? 'Your session expired. Click below to reconnect the extension.'
              : 'Authenticate the extension with your PMO account'}
          </p>
        </div>

        <div class="rounded-lg border-2 border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-900 p-6 text-center">
          <Link class="h-12 w-12 mx-auto mb-4 text-blue-600" />
          {#if extensionDetected}
            <p class="mb-6 text-sm text-muted-foreground">
              Extension detected! Click the button below to restore the connection.
            </p>
          {:else}
            <p class="mb-6 text-sm text-muted-foreground">
              Click the button below to detect and connect the extension to your account
            </p>
          {/if}
          <Button size="lg" on:click={connectExtension} loading={connecting}>
            <Link class="mr-2 h-5 w-5" />
            {connecting ? 'Connecting...' : extensionDetected ? 'Reconnect Now' : 'Connect Extension'}
          </Button>
        </div>

        <div class="text-sm text-muted-foreground">
          <p class="font-medium mb-2">What this does:</p>
          <ul class="space-y-1 list-disc list-inside">
            <li>Securely shares your authentication with the extension</li>
            <li>Allows the extension to access your timer shortcuts</li>
            <li>Enables real-time sync between the extension and web app</li>
          </ul>
        </div>
      </div>
    </Card>
  {/if}

  {#if currentStep === 'complete'}
    <Card class="p-6">
      <div class="space-y-6">
        <div>
          <h2 class="text-xl font-semibold mb-2">Setup Complete!</h2>
          <p class="text-sm text-muted-foreground">
            Your extension is ready to use
          </p>
        </div>

        <div class="rounded-lg border-2 border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900 p-6 text-center">
          <div class="flex items-center justify-center gap-2 text-green-600 dark:text-green-400 mb-4">
            <Check class="h-12 w-12" />
          </div>
          <h3 class="text-lg font-semibold mb-2">All set!</h3>
          <p class="text-sm text-muted-foreground mb-6">
            The PMO Timer extension is connected and ready to track your time
          </p>
          <div class="flex gap-3 justify-center">
            <a href="/settings/timer-shortcuts">
              <Button>
                Manage Timer Shortcuts
              </Button>
            </a>
          </div>
        </div>

        <div class="grid gap-4 md:grid-cols-2">
          <div class="rounded-lg border border-border p-4">
            <h3 class="font-medium mb-2">Quick Timer Access</h3>
            <p class="text-sm text-muted-foreground">
              Click the extension icon in your browser toolbar to start/stop timers from any tab
            </p>
          </div>
          <div class="rounded-lg border border-border p-4">
            <h3 class="font-medium mb-2">Custom Shortcuts</h3>
            <p class="text-sm text-muted-foreground">
              Create shortcuts for your most-used tasks and start timers with one click
            </p>
          </div>
          <div class="rounded-lg border border-border p-4">
            <h3 class="font-medium mb-2">Side Panel</h3>
            <p class="text-sm text-muted-foreground">
              Right-click the extension icon and select "Open side panel" for a persistent timer view
            </p>
          </div>
          <div class="rounded-lg border border-border p-4">
            <h3 class="font-medium mb-2">Real-time Sync</h3>
            <p class="text-sm text-muted-foreground">
              Timer changes sync instantly between the extension and web app
            </p>
          </div>
        </div>
      </div>
    </Card>
  {/if}
</div>
