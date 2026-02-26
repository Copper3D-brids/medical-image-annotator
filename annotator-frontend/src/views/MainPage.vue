<template>
  <LayoutTwoPanels ref="layoutTwoPanelsRef">
    <template #left>
      <LeftPanel :panel-width="layoutTwoPanelsRef?.leftPanelWidth" :panel-percent="layoutTwoPanelsRef?.percent"/>
    </template>
    <template #right>
      <RightPanel :panel-width="layoutTwoPanelsRef?.rightPanelWidth" :panel-percent="100 - layoutTwoPanelsRef?.percent"/>
    </template>
  </LayoutTwoPanels>
</template>

<script setup lang="ts">
import { ref, onBeforeMount} from "vue";
import LayoutTwoPanels from "@/components/viewer/LayoutTwoPanels.vue";
import LeftPanel from "./LeftPanelController.vue";
import RightPanel from "./RightPanelController.vue";
import {useToolConfig} from "@/plugins/api/index";
// need to remove this after testing
import toolConfig from "@/assets/tool_config.json";
import { IToolConfig } from "@/models";
import { useAppConfig } from "@/plugins/hooks/config";
import { useSegmentationCasesStore } from "@/store/app";

const { setPluginReady } = useSegmentationCasesStore();
const layoutTwoPanelsRef = ref<InstanceType<typeof LayoutTwoPanels>>();
// need to remove this after testing
localStorage.setItem("app_config", JSON.stringify(toolConfig));

const { config } = useAppConfig();

onBeforeMount(async() => {
  if (!config) return;
  useToolConfig(config).then((res) => {
    if(res.status === "success"){
      setPluginReady();
    }
  }).catch((err) => {
    console.log(err);
  })
})

</script>

<style scoped>

</style>