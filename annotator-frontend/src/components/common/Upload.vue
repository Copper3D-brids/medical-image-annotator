<template>
  <div v-if="dialog" @click="closeDialog" class="upload_container">
    <v-card class="upload-card pa-4" width="60vw" @click.stop>
      <div class="text-h6 mb-2">Upload NRRD Files</div>
      <v-file-input
        v-model="files"
        color="primary"
        counter
        label="Drop files here or click to select"
        multiple
        placeholder="Select NRRD files"
        prepend-icon="mdi-cloud-upload"
        variant="outlined"
        :show-size="1000"
        accept=".nrrd"
        @update:modelValue="onFilesChanged"
      >
        <template v-slot:selection="{ fileNames }">
          <template v-for="(fileName, index) in fileNames" :key="fileName">
            <v-chip
              v-if="index < 3"
              color="primary"
              label
              size="small"
              class="me-2"
            >
              {{ fileName }}
            </v-chip>
            <span
              v-if="index === 3"
              class="text-overline text-grey-darken-3 mx-2"
            >
              +{{ files.length - 3 }} File(s)
            </span>
          </template>
        </template>
      </v-file-input>
      <div class="text-caption text-grey mt-2">
        Please drag or upload NRRD files! Click background to submit.
      </div>
    </v-card>
  </div>
</template>

<script setup lang="ts">
/**
 * Upload Component
 *
 * @description Modal file upload dialog for NRRD files.
 * Uses Vuetify v-file-input.
 *
 * Features:
 * - Multiple file selection
 * - Drag and drop upload support (native to v-file-input)
 * - Validates .nrrd file extension
 * - Creates object URLs for uploaded files
 *
 * @prop {boolean} dialog - Whether upload dialog is visible
 *
 * @emits onCloseDialog - Emitted when dialog is closed
 * @emits getLoadFilesUrls - Emitted with array of blob URLs for uploaded files
 */
import { ref, watch } from "vue";

/**
 * Component props interface
 */
type Props = {
  dialog?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
  dialog: false,
});

/** Array of selected File objects */
const files = ref<File[]>([]);

/** Array of generated blob URLs */
let urls: Array<string> = [];

const emit = defineEmits(["onCloseDialog", "getLoadFilesUrls"]);

const closeDialog = (e: MouseEvent) => {
  // Submit files when clicking on the background overlay
  if (files.value.length > 0) {
    processFiles();
  }
  emit("onCloseDialog", false);
};

const processFiles = () => {
  files.value.forEach((file) => {
    const url = URL.createObjectURL(file);
    urls.push(url);
  });
  emit("getLoadFilesUrls", urls, "uploadFiles");
  
  // Clear files after processing? 
  // Original logic seemed to keep them until reset. 
  // Here we emit and clear.
  files.value = [];
  urls = []; // URLs are sent, but we shouldn't revoke them immediately if app needs them.
  // The app likely revokes old URLs when new ones come in or on destroy.
  // We just reset local state.
};

const onFilesChanged = (newFiles: File | File[]) => {
  // Basic validation or filtering if needed
  // v-file-input accept=".nrrd" handles most, but we can double check
  if (Array.isArray(newFiles)) {
    files.value = newFiles.filter(f => f.name.toLowerCase().endsWith('.nrrd'));
    if (files.value.length < newFiles.length) {
       alert("Only .nrrd files are allowed!");
    }
  } else if (newFiles) {
     // Single file case (shouldn't happen with multiple prop but good for type safety)
     if (newFiles.name.toLowerCase().endsWith('.nrrd')) {
        files.value = [newFiles];
     } else {
        files.value = [];
        alert("Only .nrrd files are allowed!");
     }
  }
};

watch(() => props.dialog, (val) => {
  if (!val) {
    files.value = [];
    urls = [];
  }
});
</script>

<style scoped>
.upload_container {
  position: fixed;
  z-index: 1000;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
