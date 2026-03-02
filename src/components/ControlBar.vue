<template>
  <footer class="bg-white dark:bg-navy/80 p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:p-6 sm:pb-10 shrink-0">
    <div class="flex items-center justify-around max-w-sm mx-auto">
      <button
        class="flex size-12 sm:size-14 items-center justify-center rounded-full border border-navy/10 dark:border-white/10 bg-white dark:bg-navy/60 text-navy dark:text-white hover:bg-navy/10 dark:hover:bg-white/10 transition-all"
        @click="$emit('toggleChat')"
        aria-label="Toggle chat"
      >
        <span class="material-symbols-outlined">history</span>
      </button>

      <button
        class="flex size-16 sm:size-20 items-center justify-center rounded-full text-white shadow-xl hover:scale-105 active:scale-95 transition-all"
        :class="callActive
          ? 'bg-red shadow-red/20'
          : 'bg-teal shadow-teal/20'"
        @click="$emit('toggleCall')"
        :aria-label="callActive ? 'End call' : 'Start call'"
      >
        <span class="material-symbols-outlined text-2xl sm:text-3xl">
          {{ callActive ? 'call_end' : 'call' }}
        </span>
      </button>

      <button
        class="flex size-12 sm:size-14 items-center justify-center rounded-full border border-navy/10 dark:border-white/10 bg-white dark:bg-navy/60 text-navy dark:text-white hover:bg-navy/10 dark:hover:bg-white/10 transition-all"
        @click="$emit('toggleMenu')"
        aria-label="Settings"
      >
        <span class="material-symbols-outlined">settings</span>
      </button>
    </div>
  </footer>
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
