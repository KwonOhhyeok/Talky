<template>
  <div class="control-bar">
    <button class="circle" @click="$emit('toggleChat')" aria-label="Toggle chat">
      <img
        class="circle-icon circle-icon-chat"
        :src="chatIcon"
        alt=""
        aria-hidden="true"
      />
    </button>
    <button
      class="circle hangup"
      :class="{ live: callActive }"
      @click="$emit('toggleCall')"
      :aria-label="callActive ? 'Stop call' : 'Start call'"
    >
      <img
        class="circle-icon circle-icon-call"
        :src="callIcon"
        alt=""
        aria-hidden="true"
      />
    </button>
    <button class="circle" @click="$emit('toggleMenu')" aria-label="Settings">
      <img
        class="circle-icon circle-icon-settings"
        :src="settingsIcon"
        alt=""
        aria-hidden="true"
      />
    </button>
  </div>
</template>

<script setup>
import chatIcon from "../assets/images/chat.png";
import callIcon from "../assets/images/call.png";
import settingsIcon from "../assets/images/settings.png";

defineProps({
  callActive: {
    type: Boolean,
    default: false,
  },
});

defineEmits(["toggleCall", "toggleChat", "toggleMenu"]);
</script>
