<template>
  <div class="main-page-wrapper">
    <LayoutTwoPanels ref="layoutTwoPanelsRef">
      <template #left>
        <LeftPanel :panel-width="layoutTwoPanelsRef?.leftPanelWidth" :panel-percent="layoutTwoPanelsRef?.percent"/>
      </template>
      <template #right>
        <RightPanel :panel-width="layoutTwoPanelsRef?.rightPanelWidth" :panel-percent="100 - layoutTwoPanelsRef?.percent"/>
      </template>
    </LayoutTwoPanels>

    <!-- Backend health check modal -->
    <ConnectionModal :show="!backendReady" :attemptCount="attemptCount" />
  </div>
</template>

<script setup lang="ts">
import { ref, onBeforeMount, onUnmounted } from "vue";
import LayoutTwoPanels from "@/components/viewer/LayoutTwoPanels.vue";
import LeftPanel from "./LeftPanelController.vue";
import RightPanel from "./RightPanelController.vue";
import ConnectionModal from "@/components/common/ConnectionModal.vue";
import { useToolConfig, checkHealth } from "@/plugins/api/index";
// need to remove this after testing
import toolConfig from "@/assets/tool_config.json";
import { useAppConfig } from "@/plugins/hooks/config";
import { useSegmentationCasesStore } from "@/store/app";
import { useToast } from "@/composables/useToast";

const { setPluginReady } = useSegmentationCasesStore();
const toast = useToast();
const layoutTwoPanelsRef = ref<InstanceType<typeof LayoutTwoPanels>>();
// need to remove this after testing
localStorage.setItem("app_config", JSON.stringify(toolConfig));

const { config } = useAppConfig();

const backendReady = ref(false);
const attemptCount = ref(0);
let pollTimer: ReturnType<typeof setInterval> | null = null;

function stopPolling() {
  if (pollTimer !== null) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

async function runToolConfig() {
  if (!config) return;
  useToolConfig(config).then((res) => {
    if (res.status === "success") {
      setPluginReady();
    }
  }).catch((err) => {
    const errData = err?.response?.data?.detail;
    if (errData && typeof errData === "object" && errData.summary) {
      // Structured error from backend
      toast.error(errData.summary, 10000);
      if (errData.detail) {
        toast.warning(errData.detail, 12000);
      }
      console.error(`[tool-config] Step ${errData.step}: ${errData.summary}\n${errData.detail}`);
    } else {
      // Fallback for unstructured errors
      const message = typeof errData === "string" ? errData : err?.message ?? "Unknown error";
      toast.error(`Configuration failed: ${message}`, 8000);
      console.error("[tool-config] error:", message);
    }
  });
}

async function pollHealth() {
  attemptCount.value += 1;
  try {
    const res = await checkHealth();
    if (res.status === "ok") {
      stopPolling();
      backendReady.value = true;
      runToolConfig();
    }
  } catch {
    // backend not ready yet, keep polling
  }
}

onBeforeMount(() => {
  pollTimer = setInterval(pollHealth, 2000);
  pollHealth();
});

onUnmounted(() => {
  stopPolling();
});
</script>

<style scoped>
.main-page-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
}
</style>
