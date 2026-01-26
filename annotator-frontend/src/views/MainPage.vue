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
import LayoutTwoPanels from "@/components/view-components/LayoutTwoPanels.vue";
import LeftPanel from "./components/left-panel-core/left.vue";
import RightPanel from "./components/right-panel-core/right.vue";
import {useToolConfig} from "@/plugins/api";
import { useSegmentationCasesStore } from "@/store/app";
// need to remove this after testing
import toolConfig from "@/assets/tool_config.json";
import { IToolConfig } from "@/models/apiTypes";
import { useAppConfig } from "@/plugins/hooks/config";
import { useCases } from "@/plugins/hooks/cases";

const { getCasesInfo } = useCases();
const layoutTwoPanelsRef = ref<InstanceType<typeof LayoutTwoPanels>>();
// need to remove this after testing
localStorage.setItem("app_config", JSON.stringify(toolConfig));

const { config } = useAppConfig();

onBeforeMount(async() => {
  if (!config) return;
  useToolConfig(config).then((res) => {
    if(res.status === 200){
      getCasesInfo(config);
    }
  }).catch((err) => {
    console.log(err);
  })
})

</script>

<style scoped>

</style>