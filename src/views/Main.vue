<script setup>
import WeeklyStopView from '@/views/weekly-stops/Main.vue';
import CustomerView from '@/views/customers/Main.vue';
import ServiceMapView from '@/views/service-map/Main.vue';
import DataImportView from '@/views/data-import/Main.vue';

import { useMainStore } from "@/stores/main";

const mainStore = useMainStore();

const components = {
    WeeklyStopView,
    CustomerView,
    ServiceMapView,
    DataImportView
}
</script>

<template>
    <v-fade-transition v-for="(_, tabKey) in mainStore.mainTabOptions" :key="tabKey" leave-absolute hide-on-leave mode="out-in">
        <component v-if="mainStore.mainTab === mainStore.mainTabOptions[tabKey].value"
                   :is="components[mainStore.mainTabOptions[tabKey].component]"></component>
    </v-fade-transition>
</template>

<style scoped>

</style>