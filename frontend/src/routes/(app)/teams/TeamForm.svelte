<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { api, type Team } from '$lib/api/client';
  import { Modal, Button, Input } from '$components/shared';
  import { toast } from 'svelte-sonner';
  import { X } from 'lucide-svelte';

  export let open = false;
  export let team: Team | null = null;

  const dispatch = createEventDispatcher();

  let loading = false;

  // Form fields
  let name = '';
  let description = '';
  let skills: string[] = [];
  let newSkill = '';

  $: isEdit = !!team;
  $: title = isEdit ? 'Edit Team' : 'Create Team';

  $: if (open) {
    if (team) {
      name = team.name;
      description = team.description || '';
      skills = [...(team.skills || [])];
    } else {
      resetForm();
    }
  }

  function resetForm() {
    name = '';
    description = '';
    skills = [];
    newSkill = '';
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
    if (!name.trim()) {
      toast.error('Team name is required');
      return;
    }

    loading = true;

    try {
      const data = {
        name: name.trim(),
        description: description.trim() || undefined,
        skills: skills.length > 0 ? skills : undefined,
      };

      if (isEdit && team) {
        await api.teams.update(team.id, data);
      } else {
        await api.teams.create(data);
      }

      dispatch('success');
      open = false;
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to save team');
    } finally {
      loading = false;
    }
  }
</script>

<Modal bind:open {title} size="md" on:close>
  <form on:submit|preventDefault={handleSubmit} class="space-y-4">
    <Input
      id="name"
      label="Team Name"
      placeholder="e.g., Frontend Development Team"
      bind:value={name}
      required
    />

    <div class="space-y-1.5">
      <label for="description" class="text-sm font-medium">Description</label>
      <textarea
        id="description"
        rows="3"
        placeholder="Describe the team's purpose and responsibilities"
        class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        bind:value={description}
      />
    </div>

    <div class="space-y-2">
      <label class="text-sm font-medium">Skills & Competencies</label>
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
  </form>

  <svelte:fragment slot="footer">
    <div class="flex justify-end gap-3">
      <Button variant="outline" on:click={() => (open = false)}>
        Cancel
      </Button>
      <Button {loading} on:click={handleSubmit}>
        {isEdit ? 'Save Changes' : 'Create Team'}
      </Button>
    </div>
  </svelte:fragment>
</Modal>
