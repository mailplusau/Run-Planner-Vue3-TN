<script setup>
import WeeklyStopView from '@/views/weekly-stops/Main.vue';
import CustomerView from '@/views/customers/Main.vue';
import ServiceMapView from '@/views/service-map/Main.vue';
import DataImportView from '@/views/data-import/Main.vue';
import ServiceStopManagementDialog from '@/views/service-stops/management-dialog/Main.vue';
import ServiceStopCrudDialog from '@/views/service-stops/crud-dialog/Main.vue';
import RunPlanManagementDialog from '@/views/run-plans/management-dialog/Main.vue';

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
        <component v-show="mainStore.mainTab === mainStore.mainTabOptions[tabKey].value"
                   :is="components[mainStore.mainTabOptions[tabKey].component]"></component>
    </v-fade-transition>

    <ServiceStopManagementDialog />
    <ServiceStopCrudDialog />
    <RunPlanManagementDialog />
</template>

<style scoped>

</style>