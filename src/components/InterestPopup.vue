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

const topicPool = [
  "가상 아이돌 팬덤, 진짜 사랑일까?",
  "저속노화 루틴, 건강일까 또 다른 압박일까?",
  "러닝 크루, 운동일까 인맥 관리일까?",
  "OTT 알고리즘, 취향을 넓힐까 가둘까?",
  "워케이션, 자유일까 일의 침범일까?",
  "AI 친구가 사람 친구를 대체해도 될까?",
  "1인 가구의 자유, 외로움보다 클까?",
  "가격 비교 소비, 똑똑함일까 피곤함일까?",
  "조용한 퇴사, 현명한 거리두기일까 무책임일까?",
  "팝업스토어 열풍, 경험 소비일까 마케팅 과잉일까?",
  "AI 상담, 친구보다 더 편할 수 있을까?",
  "AI 에이전트에게 회사 일을 맡겨도 될까?",
  "AI로 줄어든 업무시간, 주4일제로 돌려줘야 할까?",
  "AI 시대에 신입사원은 더 불리해질까?",
  "AI가 만든 콘텐츠, 인간 창작물처럼 인정해야 할까?",
  "AI 개인비서, 편리함보다 사생활 침해가 클까?",
  "회사에서 AI 사용 능력, 연봉에 반영해야 할까?",
  "AI 프로필 사진, 매력 관리일까 과장일까?",
  "KBO 직관 열풍, 스포츠일까 새로운 팬덤 문화일까?",
  "야구장 데이트, 영화관보다 좋은 선택일까?",
  "스포츠 팬덤 굿즈, 취미일까 과소비일까?",
  "러닝 대신 야구장, 더 건강한 취미일까?",
  "운동 모임에서 연애 찾기, 자연스러울까 부담스러울까?",
  "K뷰티 시술 여행, 자기관리일까 외모 강박일까?",
  "AI 퍼스널 컬러 진단, 전문가보다 믿을 만할까?",
  "슬로우 에이징, 자기관리일까 나이 공포일까?",
  "피부과 홈케어템, 시술을 대체할 수 있을까?",
  "스킨케어 미니멀리즘, 덜 바르는 게 더 좋을까?",
  "수면 보조제 유행, 건강 관리일까 의존일까?",
  "기능성 음료, 웰니스일까 마케팅일까?",
  "멘탈 피트니스, 운동처럼 매일 해야 할까?",
  "건강 데이터 추적, 나를 지켜줄까 집착하게 만들까?",
  "향수 레이어링, 개성 표현일까 과한 소비일까?",
  "K컬처 여행, 한국을 더 깊게 알릴까 상업화할까?",
  "성수동 팝업 투어, 문화 경험일까 줄 서기 노동일까?",
  "팬덤 여행, 진짜 여행일까 덕질의 연장일까?",
  "해외여행보다 국내 소도시 여행, 더 가치 있을까?",
  "1박 2일 해외여행, 낭만일까 체력 낭비일까?",
  "마트 투어 여행, 현지 감성일까 억지 트렌드일까?",
  "디지털 디톡스 여행, 힐링일까 불편함일까?",
  "여행지에서 일하기, 자유일까 자기착취일까?",
  "여행 계획을 AI에게 맡겨도 괜찮을까?",
  "인스타 맛집 여행, 즐거움일까 알고리즘 노예일까?",
  "초저가 소비, 현명함일까 삶의 질 하락일까?",
  "럭셔리 한 방 소비, 낭비일까 자기보상일까?",
  "소용량 식품 유행, 합리적일까 더 비싼 소비일까?",
  "구독 서비스 줄이기, 절약일까 문화생활 포기일까?",
  "중고거래 선호, 실용적일까 피곤한 거래일까?",
  "브랜드보다 가성비, 더 똑똑한 소비일까?",
  "플렉스 소비, 스트레스 해소일까 불안의 증상일까?",
  "혼자 사는 삶, 더 자유로울까 더 외로울까?",
  "결혼보다 동거, 더 현실적인 선택일까?",
  "친구 같은 가족, 새로운 안정일까 책임 회피일까?",
  "취향 기반 소모임, 인간관계를 더 깊게 만들까?",
  "커리어 미니멀리즘, 게으름일까 현명한 생존일까?",
  "사이드잡, 미래 준비일까 번아웃 지름길일까?",
  "퇴사 없이 조용히 일하기, 전략일까 포기일까?",
];
const chips = ref(getRandomTopics(topicPool, 8));

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

function getRandomTopics(topics, count) {
  return [...topics].sort(() => Math.random() - 0.5).slice(0, count);
}

onMounted(() => {
  panelRef.value?.focus();
});
</script>
