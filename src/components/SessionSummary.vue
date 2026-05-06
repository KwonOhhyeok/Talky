<template>
  <div class="mx-auto flex min-h-[calc(100dvh-192px)] w-full max-w-md flex-col items-center">
    <section class="mb-xl flex w-full flex-col items-center">
      <h2 class="mb-lg text-center font-heading-lg text-heading-lg text-on-surface">Session Complete</h2>
      <p v-if="lessonTopic" class="mb-md text-center font-body text-body text-secondary">
        {{ lessonTopic }}
      </p>
      <div class="grid w-full grid-cols-1 gap-md">
        <div class="flex flex-col items-center justify-center rounded-xl border border-grey-200 bg-background-layered p-lg">
          <span class="mb-xs font-body text-body text-secondary">Duration</span>
          <div class="font-number-display text-number-display text-on-surface">{{ durationFormatted }}</div>
          <span class="mt-xs font-body-sm text-body-sm text-grey-600">{{ durationKorean }}</span>
        </div>
        <div class="flex flex-col items-center justify-center rounded-xl border border-grey-200 bg-background-layered p-lg">
          <span class="mb-xs font-body text-body text-secondary">Exchanges</span>
          <div class="font-number-display text-number-display text-on-surface">{{ turnCount }}</div>
          <span class="mt-xs font-body-sm text-body-sm text-grey-600">턴</span>
        </div>
      </div>
    </section>

    <div class="mt-auto flex w-full flex-col gap-sm">
      <button
        class="w-full rounded-xl bg-primary px-lg py-md font-subtitle text-subtitle text-on-primary transition-colors hover:bg-blue-hover active:opacity-80"
        @click="$emit('viewChat')"
      >
        피드백 보기
      </button>
      <button
        class="w-full rounded-xl bg-grey-100 px-lg py-md font-subtitle text-subtitle text-on-surface transition-colors hover:bg-grey-200 active:bg-grey-200"
        @click="$emit('practiceAgain')"
      >
        같은 주제로 다시 연습
      </button>
      <button
        class="w-full px-lg py-md font-body-lg text-body-lg text-secondary transition-colors active:text-on-surface"
        @click="$emit('newTopic')"
      >
        새 주제 시작
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  durationSeconds: { type: Number, default: 0 },
  turnCount: { type: Number, default: 0 },
  lessonTopic: { type: String, default: "" },
});

defineEmits(["viewChat", "practiceAgain", "newTopic"]);

const durationFormatted = computed(() => {
  const m = Math.floor(props.durationSeconds / 60);
  const s = props.durationSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
});

const durationKorean = computed(() => {
  const m = Math.floor(props.durationSeconds / 60);
  const s = props.durationSeconds % 60;
  return `${m}분 ${String(s).padStart(2, "0")}초`;
});
</script>
