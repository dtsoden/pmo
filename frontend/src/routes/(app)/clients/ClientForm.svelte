<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { api, type Client } from '$lib/api/client';
  import { Modal, Button, Input, Select, Switch } from '$components/shared';
  import { toast } from 'svelte-sonner';

  export let open = false;
  export let client: Client | null = null;

  const dispatch = createEventDispatcher();

  let loading = false;
  let industries: string[] = [];

  // Form fields
  let name = '';
  let status: 'ACTIVE' | 'INACTIVE' | 'PROSPECT' = 'ACTIVE';
  let industry = '';
  let website = '';
  let description = '';
  let notes = '';
  // Address
  let addressLine1 = '';
  let addressLine2 = '';
  let city = '';
  let stateProvince = '';
  let postalCode = '';
  let country = '';
  // Primary contact
  let primaryContactName = '';
  let primaryContactEmail = '';
  let primaryContactPhone = '';
  // Salesforce
  let salesforceAccountId = '';
  let salesforceAccountName = '';
  let salesforceOwnerId = '';

  $: isActive = status === 'ACTIVE';

  $: isEdit = !!client;
  $: title = isEdit ? `Edit ${client?.name || 'Client'}` : 'Create Client';

  $: if (open) {
    if (client) {
      name = client.name;
      status = client.status || 'ACTIVE';
      industry = client.industry || '';
      website = client.website || '';
      description = client.description || '';
      notes = client.notes || '';
      addressLine1 = client.addressLine1 || '';
      addressLine2 = client.addressLine2 || '';
      city = client.city || '';
      stateProvince = client.stateProvince || '';
      postalCode = client.postalCode || '';
      country = client.country || '';
      primaryContactName = client.primaryContactName || '';
      primaryContactEmail = client.primaryContactEmail || '';
      primaryContactPhone = client.primaryContactPhone || '';
      salesforceAccountId = client.salesforceAccountId || '';
      salesforceAccountName = client.salesforceAccountName || '';
      salesforceOwnerId = client.salesforceOwnerId || '';
    } else {
      resetForm();
    }
    loadIndustries();
  }

  async function loadIndustries() {
    try {
      const response = await api.clients.getIndustries();
      // Backend returns { industries: [...] }
      industries = (response as { industries?: string[] })?.industries || [];
    } catch {
      // Use default industries
      industries = [
        'Technology',
        'Healthcare',
        'Finance',
        'Manufacturing',
        'Retail',
        'Education',
        'Government',
        'Non-profit',
        'Other',
      ];
    }
  }

  function resetForm() {
    name = '';
    status = 'ACTIVE';
    industry = '';
    website = '';
    description = '';
    notes = '';
    addressLine1 = '';
    addressLine2 = '';
    city = '';
    stateProvince = '';
    postalCode = '';
    country = '';
    primaryContactName = '';
    primaryContactEmail = '';
    primaryContactPhone = '';
    salesforceAccountId = '';
    salesforceAccountName = '';
    salesforceOwnerId = '';
  }

  async function handleSubmit() {
    if (loading) return; // Prevent double-submit

    if (!name) {
      toast.error('Please enter a client name');
      return;
    }

    loading = true;

    try {
      const data = {
        name,
        status,
        industry: industry || undefined,
        website: website || undefined,
        description: description || undefined,
        notes: notes || undefined,
        addressLine1: addressLine1 || undefined,
        addressLine2: addressLine2 || undefined,
        city: city || undefined,
        stateProvince: stateProvince || undefined,
        postalCode: postalCode || undefined,
        country: country || undefined,
        primaryContactName: primaryContactName || undefined,
        primaryContactEmail: primaryContactEmail || undefined,
        primaryContactPhone: primaryContactPhone || undefined,
        salesforceAccountId: salesforceAccountId || undefined,
        salesforceAccountName: salesforceAccountName || undefined,
        salesforceOwnerId: salesforceOwnerId || undefined,
      };

      if (isEdit && client) {
        await api.clients.update(client.id, data);
        toast.success('Client updated successfully');
      } else {
        await api.clients.create(data);
        toast.success('Client created successfully');
      }

      dispatch('success');
      open = false;
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to save client');
    } finally {
      loading = false;
    }
  }

  $: industryOptions = [
    { value: '', label: 'Select Industry' },
    ...industries.map((i) => ({ value: i, label: i })),
  ];
</script>

<Modal bind:open {title} size="lg" on:close>
  <form on:submit|preventDefault={handleSubmit} class="space-y-4">
    {#if isEdit}
      <div class="rounded-lg border p-4">
        <Switch
          id="status"
          label="Active Client"
          description={isActive ? 'This client is active and visible' : 'This client is inactive and hidden from lists'}
          checked={isActive}
          on:change={(e) => (status = e.detail ? 'ACTIVE' : 'INACTIVE')}
        />
      </div>
    {/if}

    <Input
      id="name"
      label="Client Name"
      placeholder="Enter client name"
      bind:value={name}
      required
    />

    <div class="grid gap-4 md:grid-cols-2">
      <Select
        id="industry"
        label="Industry"
        options={industryOptions}
        bind:value={industry}
      />

      <Input
        id="website"
        type="url"
        label="Website"
        placeholder="https://example.com"
        bind:value={website}
      />
    </div>

    <div class="space-y-1.5">
      <label for="description" class="text-sm font-medium">Description</label>
      <textarea
        id="description"
        rows="2"
        placeholder="Brief description of the client"
        class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        bind:value={description}
      />
    </div>

    <!-- Address -->
    <details class="rounded-lg border p-4" open>
      <summary class="cursor-pointer text-sm font-medium">Address</summary>
      <div class="mt-4 space-y-4">
        <Input
          id="addressLine1"
          label="Address Line 1"
          placeholder="Street address"
          bind:value={addressLine1}
        />
        <Input
          id="addressLine2"
          label="Address Line 2"
          placeholder="Suite, unit, building, floor, etc."
          bind:value={addressLine2}
        />
        <div class="grid gap-4 md:grid-cols-2">
          <Input
            id="city"
            label="City"
            placeholder="City"
            bind:value={city}
          />
          <Input
            id="stateProvince"
            label="State / Province"
            placeholder="State or Province"
            bind:value={stateProvince}
          />
        </div>
        <div class="grid gap-4 md:grid-cols-2">
          <Input
            id="postalCode"
            label="Postal Code"
            placeholder="ZIP / Postal code"
            bind:value={postalCode}
          />
          <Input
            id="country"
            label="Country"
            placeholder="Country"
            bind:value={country}
          />
        </div>
      </div>
    </details>

    <!-- Primary Contact -->
    <details class="rounded-lg border p-4" open>
      <summary class="cursor-pointer text-sm font-medium">Primary Contact</summary>
      <div class="mt-4 grid gap-4 md:grid-cols-3">
        <Input
          id="primaryContactName"
          label="Name"
          placeholder="Contact name"
          bind:value={primaryContactName}
        />
        <Input
          id="primaryContactEmail"
          type="email"
          label="Email"
          placeholder="contact@example.com"
          bind:value={primaryContactEmail}
        />
        <Input
          id="primaryContactPhone"
          type="tel"
          label="Phone"
          placeholder="+1 (555) 123-4567"
          bind:value={primaryContactPhone}
        />
      </div>
    </details>

    <div class="space-y-1.5">
      <label for="notes" class="text-sm font-medium">Notes</label>
      <textarea
        id="notes"
        rows="3"
        placeholder="Enter any notes about this client"
        class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        bind:value={notes}
      />
    </div>

    <!-- Salesforce Integration Fields -->
    <details class="rounded-lg border p-4">
      <summary class="cursor-pointer text-sm font-medium">Salesforce Integration (Optional)</summary>
      <div class="mt-4 grid gap-4 md:grid-cols-3">
        <Input
          id="salesforceAccountId"
          label="Account ID"
          placeholder="Salesforce Account ID"
          bind:value={salesforceAccountId}
        />
        <Input
          id="salesforceAccountName"
          label="Account Name"
          placeholder="Salesforce Account Name"
          bind:value={salesforceAccountName}
        />
        <Input
          id="salesforceOwnerId"
          label="Owner ID"
          placeholder="Salesforce Owner ID"
          bind:value={salesforceOwnerId}
        />
      </div>
    </details>
  </form>

  <svelte:fragment slot="footer">
    <div class="flex justify-end gap-3">
      <Button variant="outline" on:click={() => (open = false)}>
        Cancel
      </Button>
      <Button {loading} on:click={handleSubmit}>
        {isEdit ? 'Save Changes' : 'Create Client'}
      </Button>
    </div>
  </svelte:fragment>
</Modal>
