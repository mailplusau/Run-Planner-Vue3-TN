<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { useServiceMap } from "@/stores/service-map";
import { useMainStore } from "@/stores/main";

const serviceMap = useServiceMap();
const mainStore = useMainStore();
const componentReady = ref(false);

onMounted(async () => {
    serviceMap.init().then();
    await nextTick();
    mainStore.appBarExtended = true;
    await nextTick();
    componentReady.value = true;
})

onBeforeUnmount(() => {
    componentReady.value = false;
    mainStore.appBarExtended = false;
})
</script>

<template>
    <v-container fluid class="fill-height pa-0">
        <v-row class="fill-height background" no-gutters>
            <v-col cols="12" id="google-map-container" ref="googleMapContainer"></v-col>
        </v-row>

        <Teleport to="#appBarExtension" v-if="componentReady">
            <span class="ml-4">Service Map Controls</span>
        </Teleport>
    </v-container>
</template>

<style scoped>
.map-floating-toolbar {
    position: fixed;
    z-index: 90;
    left: 10px;
    right: 10px;
    top: 60px;
    box-shadow: 5px 5px 10px grey;
    background: transparent;
}
</style>