<template>
  <div
    class="flex flex-1 flex-col items-center justify-center px-h-padding pb-[120px]"
    role="dialog"
    aria-modal="true"
    aria-label="관심사 선택"
    @keydown.escape="handleEscape"
  >
    <div
      ref="panelRef"
      tabindex="-1"
      class="flex w-full max-w-3xl flex-col items-center outline-none"
    >
      <h2 class="mb-xl text-center font-display-hero text-display-hero text-grey-900 tracking-tight">
        어떤 주제로 대화할까요?
      </h2>

      <div class="flex w-full max-w-2xl flex-wrap justify-center gap-sm" role="listbox" aria-label="주제 선택">
        <button
          v-for="chip in chips"
          :key="chip"
          role="option"
          :aria-selected="selectedChip === chip"
          class="group flex h-[56px] w-[calc((100%_-_12px)/2)] items-center justify-center rounded-xl px-sm py-xs text-center shadow-[0_2px_8px_rgba(0,0,0,0.08)] transition-all duration-200 active:scale-95 sm:w-[180px]"
          :class="selectedChip === chip
            ? 'bg-blue-light text-primary ring-2 ring-primary'
            : 'bg-grey-50 text-grey-600 hover:bg-grey-100 hover:text-primary'"
          @click="handleChipSelect(chip)"
        >
          <span class="line-clamp-2 font-body-sm text-body-sm transition-colors">{{ chip }}</span>
        </button>
      </div>

      <div class="fixed bottom-8 left-0 z-40 flex w-full justify-center px-h-padding">
        <div class="flex w-full max-w-3xl items-end rounded-xl bg-grey-100 p-xs">
          <textarea
            ref="inputRef"
            v-model="customInput"
            rows="1"
            placeholder="메시지를 입력하세요..."
            class="min-h-[56px] w-full resize-none rounded-lg border-0 bg-transparent px-md py-md font-body text-body text-grey-900 placeholder-grey-600 transition-all focus:bg-background focus:ring-2 focus:ring-primary"
            @focus="handleInputFocus"
            @input="handleInputChange"
            @keydown.enter.exact.prevent="handleStart"
          ></textarea>
          <button
            v-if="customInput"
            type="button"
            class="mb-xs mr-xs flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-grey-600 transition-colors hover:bg-grey-200"
            aria-label="입력값 지우기"
            @click="clearCustomInput"
          >
            <span class="material-symbols-outlined text-[20px]">close</span>
          </button>
          <button
            :disabled="!finalTopic || isLoading"
            class="mb-xs flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-white transition-all active:scale-95"
            :class="finalTopic && !isLoading
              ? 'bg-primary hover:bg-blue-hover'
              : 'bg-grey-400 cursor-not-allowed'"
            aria-label="시작하기"
            @click="handleStart"
          >
            <span v-if="isLoading" class="inline-flex items-center gap-1" aria-hidden="true">
              <i class="h-1.5 w-1.5 rounded-full bg-white" style="animation: connecting-bounce 1s ease-in-out infinite"></i>
              <i class="h-1.5 w-1.5 rounded-full bg-white" style="animation: connecting-bounce 1s ease-in-out infinite 0.14s"></i>
              <i class="h-1.5 w-1.5 rounded-full bg-white" style="animation: connecting-bounce 1s ease-in-out infinite 0.28s"></i>
            </span>
            <span v-else class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1">send</span>
          </button>
        </div>
      </div>

      <p v-if="isLoading" class="mt-md font-body-sm text-body-sm text-primary" role="status">
        {{ loadingStepText }}
      </p>
      <p v-if="errorMessage" class="mt-sm font-body-sm text-body-sm text-error" role="alert">
        {{ errorMessage }}
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";

const props = defineProps({
  isLoading: { type: Boolean, default: false },
  errorMessage: { type: String, default: "" },
  loadingStep: { type: Number, default: 0 },
});

const emit = defineEmits(["start"]);

const panelRef = ref(null);
const inputRef = ref(null);

const chips = [
  "가상 아이돌 팬덤, 진짜 사랑일까?",
  "저속노화 루틴, 건강일까 또 다른 압박일까?",
  "러닝 크루, 운동일까 인맥 관리일까?",
  "OTT 알고리즘, 취향을 넓힐까 가둘까?",
  "워케이션, 자유일까 일의 침범일까?",
  "AI 친구가 사람 친구를 대체해도 될까?",
  "1인 가구의 자유, 외로움보다 클까?",
  "가격 비교 소비, 똑똑함일까 피곤함일까?",
];

const LOADING_STEPS = ["주제 분석 중...", "수업 자료 작성 중...", "마무리 중..."];

const loadingStepText = computed(() => {
  return LOADING_STEPS[props.loadingStep] ?? LOADING_STEPS[0];
});

const STORAGE_KEY = "talky:last_interest";

const selectedChip = ref("");
const customInput = ref("");

const finalTopic = computed(() => customInput.value.trim() || selectedChip.value);

function handleChipSelect(chip) {
  selectedChip.value = chip;
  customInput.value = chip;
  inputRef.value?.focus();
}

function handleInputFocus() {
  if (!customInput.value.trim()) selectedChip.value = "";
}

function handleInputChange() {
  if (customInput.value.trim() !== selectedChip.value) {
    selectedChip.value = "";
  }
}

function clearCustomInput() {
  customInput.value = "";
  inputRef.value?.focus();
}

function handleStart() {
  const topic = finalTopic.value;
  if (!topic || props.isLoading) return;
  localStorage.setItem(STORAGE_KEY, topic);
  emit("start", topic);
}

function handleEscape() {
  // 팝업이 처음 진입 시 필수로 선택해야 하므로 취소 불가
  // 필요 시 emit('close') 추가 가능
}

onMounted(() => {
  panelRef.value?.focus();
});
</script>
