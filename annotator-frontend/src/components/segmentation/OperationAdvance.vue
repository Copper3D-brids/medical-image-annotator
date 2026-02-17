<template>
  <v-list-group value="Advance">
    <template v-slot:activator="{ props }">
      <v-list-item
        v-bind="props"
        color="nav-success-2"
        prepend-icon="mdi-axe-battle"
        title="Advance Settings"
      ></v-list-item>
    </template>
    <v-container fluid>
      <v-progress-linear
        color="nav-success-2"
        buffer-value="0"
        stream
      ></v-progress-linear>
      <v-radio-group
        class="radio-group"
        v-model="commColorPickerRadios"
        label="Canvas Color Picker"
        :inline="true"
        :disabled="commColorPickerRadiosDisabled"
        @update:modelValue="toggleColorPickerRadios"
      >
        <v-radio
          v-for="(item, idx) in commFuncRadioValues"
          :key="idx"
          :label="item.label"
          :value="item.value"
          :color="item.color"
        ></v-radio>
      </v-radio-group>

      <v-color-picker
        v-model:model-value="commColorPicker"
        class="ml-2"
        mode="hex"
        hide-inputs
        :disabled="commColorPickerDisabled"
        @update:modelValue="handleOnColorPicked"
      ></v-color-picker>
      <v-progress-linear
        color="nav-success-2"
        buffer-value="0"
        stream
      ></v-progress-linear>
    </v-container>
  </v-list-group>
</template>

<script setup lang="ts">
/**
 * Operation Advance Component
 *
 * @description Advanced settings panel for customizing drawing colors:
 * - Pencil stroke color
 * - Pencil fill color
 * - Brush color
 *
 * Uses Vuetify color picker integrated with Copper3D GUI state.
 *
 * @listens Segmentation:FinishLoadAllCaseImages - Enables color picker after loading
 * @listens Core:SegmentationManager - Receives SegmentationManager instance (Phase 7 - Step 10)
 */
import { ref, onMounted, onUnmounted } from "vue";
import emitter from "@/plugins/custom-emitter";
import * as Copper from "@/ts/index";

/** Currently selected color mode (color, fillColor, brushColor) */
const commColorPickerRadios = ref("");

/** Whether color picker radios are disabled */
const commColorPickerRadiosDisabled = ref(true);

/** Current color picker value in hex format */
const commColorPicker = ref("#009688");

/** Whether color picker is disabled */
const commColorPickerDisabled = ref(true);

/** Pencil stroke color */
const pencilColor = ref("#f50a33");

/** Pencil fill color */
const pencilFillColor = ref("#00ff00");

/** Brush color */
const brushColor = ref("#00ff00");


/**
 * Radio button configuration for color type selection.
 * Colors are bound reactively to current values.
 */
const commFuncRadioValues = ref([
  { label: "Pencil Color", value: "color", color: pencilColor },
  { label: "PencilFill Color", value: "fillColor", color: pencilFillColor },
  { label: "Brush Color", value: "brushColor", color: brushColor },
]);

/** GUI settings reference from NrrdTools */
const guiSettings = ref<any>();

onMounted(() => {
  manageEmitters();
});

function manageEmitters() {
  emitter.on("Segmentation:FinishLoadAllCaseImages", emitterOnFinishLoadAllCaseImages);
}

const emitterOnFinishLoadAllCaseImages = (val:
  {
    guiState: Copper.IGUIStates;
    guiSetting: Copper.IGuiParameterSettings;
  }) => {
  guiSettings.value = val;
  commColorPickerRadios.value = "color";
  commColorPicker.value = guiSettings.value.guiState.color;
  pencilColor.value = guiSettings.value.guiState.color;
  pencilFillColor.value = guiSettings.value.guiState.fillColor;
  brushColor.value = guiSettings.value.guiState.brushColor;

  commColorPickerRadiosDisabled.value = false;
  commColorPickerDisabled.value = false;
}


function toggleColorPickerRadios(val: string | null) {
  if (val === null) return;
  commColorPicker.value = guiSettings.value.guiState[val];
}

function handleOnColorPicked(color: string) {
  switch (commColorPickerRadios.value) {
    case "color":
      pencilColor.value = guiSettings.value.guiState.color = color;
      break;
    case "fillColor":
      pencilFillColor.value = guiSettings.value.guiState.fillColor = color;
      break;
    case "brushColor":
      brushColor.value = guiSettings.value.guiState.brushColor = color;
      break;
  }
}

onUnmounted(() => {
  emitter.off("Segmentation:FinishLoadAllCaseImages", emitterOnFinishLoadAllCaseImages);
});
</script>

<style scoped></style>
