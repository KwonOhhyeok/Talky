<template>
  <div class="avatar-container">
    <div class="avatar-orb" :class="{ speaking }">
      <span v-if="listening" class="listening-text">Listening</span>
      <img
        v-else
        class="avatar-circle avatar-image"
        :src="avatarImage"
        alt="Talky avatar"
      />
    </div>
  </div>
</template>

<script setup>
import avatarImage from "../assets/images/avatar.png";

defineProps({
  speaking: {
    type: Boolean,
    default: false,
  },
  listening: {
    type: Boolean,
    default: false,
  },
});
</script>
