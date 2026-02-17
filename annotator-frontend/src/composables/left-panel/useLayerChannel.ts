/**
 * useLayerChannel Composable
 *
 * Phase 3.5: Layer/Channel Selection UI
 *
 * Manages layer and channel selection state for the segmentation module.
 * Provides reactive state for Vue components and syncs with NrrdTools.
 */
import { ref, computed, type Ref, type ComputedRef } from "vue";
import * as Copper from "@/ts/index";

// ===== Types =====

export interface ILayerChannelDeps {
    nrrdTools: Ref<Copper.NrrdTools | undefined>;
}

export interface LayerConfig {
    id: Copper.LayerId;
    name: string;
    color: string;  // Display color for UI
}

export interface ChannelConfig {
    value: Copper.ChannelValue;
    name: string;
    color: string;  // From CHANNEL_COLORS
}

// ===== Constants =====

/**
 * Layer configurations
 */
export const LAYER_CONFIGS: LayerConfig[] = [
    { id: 'layer1', name: 'Layer 1', color: '#4CAF50' },  // Green
    { id: 'layer2', name: 'Layer 2', color: '#2196F3' },  // Blue
    { id: 'layer3', name: 'Layer 3', color: '#FF9800' },  // Orange
];

/**
 * Channel configurations (channels 1-8, channel 0 is transparent/erased)
 */
export const CHANNEL_CONFIGS: ChannelConfig[] = [
    { value: 1 as Copper.ChannelValue, name: 'Ch 1', color: Copper.CHANNEL_COLORS[1] },
    { value: 2 as Copper.ChannelValue, name: 'Ch 2', color: Copper.CHANNEL_COLORS[2] },
    { value: 3 as Copper.ChannelValue, name: 'Ch 3', color: Copper.CHANNEL_COLORS[3] },
    { value: 4 as Copper.ChannelValue, name: 'Ch 4', color: Copper.CHANNEL_COLORS[4] },
    { value: 5 as Copper.ChannelValue, name: 'Ch 5', color: Copper.CHANNEL_COLORS[5] },
    { value: 6 as Copper.ChannelValue, name: 'Ch 6', color: Copper.CHANNEL_COLORS[6] },
    { value: 7 as Copper.ChannelValue, name: 'Ch 7', color: Copper.CHANNEL_COLORS[7] },
    { value: 8 as Copper.ChannelValue, name: 'Ch 8', color: Copper.CHANNEL_COLORS[8] },
];

// ===== Composable =====

export function useLayerChannel(deps: ILayerChannelDeps) {

    // ===== Reactive State =====

    /** Currently active layer */
    const activeLayer = ref<Copper.LayerId>('layer1');

    /** Currently active channel */
    const activeChannel = ref<Copper.ChannelValue>(1 as Copper.ChannelValue);

    /** Layer visibility states */
    const layerVisibility = ref<Record<Copper.LayerId, boolean>>({
        layer1: true,
        layer2: true,
        layer3: true,
    });

    /** Channel visibility states (per layer) */
    const channelVisibility = ref<Record<Copper.LayerId, Record<number, boolean>>>({
        layer1: { 1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 7: true, 8: true },
        layer2: { 1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 7: true, 8: true },
        layer3: { 1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 7: true, 8: true },
    });

    /** Whether the controls are enabled (after images loaded) */
    const controlsEnabled = ref(false);

    // ===== Computed =====

    /** Get display color for the active channel */
    const activeChannelColor: ComputedRef<string> = computed(() => {
        return Copper.CHANNEL_COLORS[activeChannel.value] || 'rgba(0,0,0,0)';
    });

    /** Get display name for the active layer */
    const activeLayerName: ComputedRef<string> = computed(() => {
        const config = LAYER_CONFIGS.find(l => l.id === activeLayer.value);
        return config?.name || activeLayer.value;
    });

    // ===== Actions =====

    /**
     * Set the active layer and sync to NrrdTools
     */
    function setActiveLayer(layerId: Copper.LayerId): void {
        activeLayer.value = layerId;
        deps.nrrdTools.value?.setActiveLayer(layerId);
    }

    /**
     * Set the active channel and sync to NrrdTools
     */
    function setActiveChannel(channel: Copper.ChannelValue): void {
        activeChannel.value = channel;
        deps.nrrdTools.value?.setActiveChannel(channel);
    }

    /**
     * Toggle layer visibility and sync to NrrdTools
     */
    function toggleLayerVisibility(layerId: Copper.LayerId): void {
        const newValue = !layerVisibility.value[layerId];
        layerVisibility.value[layerId] = newValue;
        deps.nrrdTools.value?.setLayerVisible(layerId, newValue);
    }

    /**
     * Toggle channel visibility and sync to NrrdTools
     */
    function toggleChannelVisibility(layerId: Copper.LayerId, channel: Copper.ChannelValue): void {
        const newValue = !channelVisibility.value[layerId][channel];
        channelVisibility.value[layerId][channel] = newValue;
        deps.nrrdTools.value?.setChannelVisible(layerId, channel, newValue);
    }

    /**
     * Enable controls after images loaded
     */
    function enableControls(): void {
        controlsEnabled.value = true;
    }

    /**
     * Disable controls (e.g., when switching cases)
     */
    function disableControls(): void {
        controlsEnabled.value = false;
    }

    /**
     * Sync state from NrrdTools (called after initialization)
     */
    function syncFromManager(): void {
        const tools = deps.nrrdTools.value;
        if (!tools) return;

        // Sync active layer and channel
        activeLayer.value = tools.getActiveLayer();
        activeChannel.value = tools.getActiveChannel() as Copper.ChannelValue;

        // Sync visibility states
        const layerVis = tools.getLayerVisibility();
        const channelVis = tools.getChannelVisibility();

        const layers: Copper.LayerId[] = ['layer1', 'layer2', 'layer3'];
        layers.forEach(layerId => {
            layerVisibility.value[layerId] = layerVis[layerId] ?? true;
            if (channelVis[layerId]) {
                channelVisibility.value[layerId] = { ...channelVis[layerId] };
            }
        });
    }

    // ===== Return =====

    return {
        // State
        activeLayer,
        activeChannel,
        layerVisibility,
        channelVisibility,
        controlsEnabled,

        // Computed
        activeChannelColor,
        activeLayerName,

        // Actions
        setActiveLayer,
        setActiveChannel,
        toggleLayerVisibility,
        toggleChannelVisibility,
        enableControls,
        disableControls,
        syncFromManager,

        // Configs (for UI rendering)
        LAYER_CONFIGS,
        CHANNEL_CONFIGS,
    };
}
