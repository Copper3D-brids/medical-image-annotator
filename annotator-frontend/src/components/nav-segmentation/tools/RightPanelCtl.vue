<template>
  <div>
    <Switcher
      :title="'3D Model'"
      :label="switchModelLabel"
      :disabled="modelDisabled"
      v-model:controller="modelState"
      @toggleUpdate="toggle3DModel"
    />
  </div>
</template>

<script setup lang="ts">
import Switcher from "@/components/commonBar/Switcher.vue";
import { ref, onMounted, onUnmounted } from "vue";
import emitter from "@/plugins/custom-emitter";

const modelState = ref(true);
const modelDisabled = ref(true)
const switchModelLabel = ref("show");


onMounted(() => {
  manageEmitters();
});

function manageEmitters() {
  emitter.on("Segmentation:FinishLoadAllCaseImages", emitterOnFinishLoadAllCaseImages)
}

const emitterOnFinishLoadAllCaseImages = () => {
  modelDisabled.value = false;
}

function toggle3DModel(value: boolean) {
  switchModelLabel.value = switchModelLabel.value === "show" ? "hide" : "show";
  emitter.emit("Common:ToggleRightModelVisibility", value);
}

onUnmounted(() => {
  emitter.off("Segmentation:FinishLoadAllCaseImages", emitterOnFinishLoadAllCaseImages)
})
</script>

<style scoped></style>
  