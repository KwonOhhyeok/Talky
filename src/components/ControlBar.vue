<template>
  <nav class="fixed bottom-0 left-0 z-50 flex h-[100px] w-full items-start justify-around bg-surface/80 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-md">
    <div class="mx-auto flex w-full max-w-md items-start justify-around">
      <button
        class="mt-[12px] flex h-14 w-14 items-center justify-center rounded-full text-on-surface-variant transition-all hover:bg-surface-container-high active:scale-95"
        @click="$emit('toggleChat')"
        aria-label="Toggle chat"
      >
        <span class="material-symbols-outlined">history</span>
      </button>

      <div class="mt-[4px] flex h-[72px] w-[72px] items-center justify-center">
        <button
          class="flex h-16 w-16 items-center justify-center rounded-full text-on-primary shadow-lg transition-all active:scale-90"
          :class="callActive ? 'bg-error' : 'bg-primary'"
          @click="$emit('toggleCall')"
          :aria-label="callActive ? 'End call' : 'Start call'"
        >
          <span class="material-symbols-outlined text-3xl" style="font-variation-settings: 'FILL' 1">
            {{ callActive ? 'call_end' : 'mic' }}
          </span>
        </button>
      </div>

      <button
        class="mt-[12px] flex h-14 w-14 items-center justify-center rounded-full text-on-surface-variant transition-all hover:bg-surface-container-high active:scale-95"
        @click="$emit('toggleMenu')"
        aria-label="Settings"
      >
        <span class="material-symbols-outlined">settings</span>
      </button>
    </div>
  </nav>
</template>

<script setup>
defineProps({
  callActive: {
    type: Boolean,
    default: false,
  },
});

defineEmits(["toggleCall", "toggleChat", "toggleMenu"]);
</script>
