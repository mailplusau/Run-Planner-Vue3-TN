<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { useServiceMap } from "@/stores/service-map";
import { useMainStore } from "@/stores/main";
import { useFranchiseeStore } from "@/stores/franchisees";
import { useGlobalDialog } from "@/stores/global-dialog";
import { useRunPlanStore } from "@/stores/run-plans";

const serviceMap = useServiceMap();
const mainStore = useMainStore();
const franchiseeStore = useFranchiseeStore();
const runPlanStore = useRunPlanStore();
const globalDialog = useGlobalDialog();

const componentReady = ref(false);

onMounted(async () => {
    globalDialog.displayProgress('', 'Preparing Service Map. Please wait...')
    await serviceMap.init();
    await serviceMap.getRoutesAndMarkersOfSelectedRunPlan();
    await serviceMap.getTerritoryMap();
    await nextTick();
    // mainStore.appBarExtended = true;
    mainStore.rightDrawerOpen = true;
    await nextTick();
    componentReady.value = true;
    globalDialog.close(200, 'Complete!').then();
})

onBeforeUnmount(() => {
    componentReady.value = false;
    // mainStore.appBarExtended = false;
    mainStore.rightDrawerOpen = false;
})

const selectedFranchisee = computed({
    get: () => franchiseeStore.current.id,
    set: async (val) => {
        globalDialog.displayProgress('', 'Retrieving Franchisee\'s Information...');
        await franchiseeStore.changeCurrentFranchiseeId(val);
        globalDialog.close(100, 'Complete!').then();
    }
});

const selectedRunPlan = computed({
    get: () => runPlanStore.current.id,
    set: async (val) => {
        globalDialog.displayProgress('', 'Retrieving Service Stop Information...');
        await runPlanStore.changeCurrentRunPlanId(val);
        await serviceMap.getRoutesAndMarkersOfSelectedRunPlan();
        globalDialog.close(100, 'Complete!').then();
    }
});

const runPlans = computed(() => {
    if (!franchiseeStore.current.id) return [];

    const associatedRunPlans = runPlanStore.all.filter(item => parseInt(item['custrecord_run_franchisee']) === parseInt(franchiseeStore.current.id));

    return associatedRunPlans.length > 1 ?
        [{internalid: '-1', name: 'All Run Plans'}, ...associatedRunPlans] : associatedRunPlans
})
</script>

<template>
    <v-container fluid class="fill-height pa-0">
        <v-row class="fill-height background" no-gutters>
            <v-col cols="12" id="google-map-container" ref="googleMapContainer"></v-col>
        </v-row>

        <v-btn icon="mdi-chevron-left" style="position: fixed; right: 10px; top: 100px;"
               @click="mainStore.rightDrawerOpen = !mainStore.rightDrawerOpen"></v-btn>

        <Teleport to="#appBarExtension" v-if="componentReady && mainStore.appBarExtended">
            <span class="ml-4">Service Map Controls</span>
        </Teleport>

        <Teleport to="#rightDrawerContents" v-if="componentReady">
            <v-list density="compact" class="bg-background">
                <v-list-item class="text-right">
                    <v-btn size="small" color="red" variant="outlined" @click="mainStore.rightDrawerOpen = !mainStore.rightDrawerOpen">
                        close panel <v-icon>mdi-chevron-double-right</v-icon>
                    </v-btn>
                </v-list-item>

                <v-divider class="my-2"></v-divider>

                <v-list-item>
                    <v-autocomplete label="Franchisee" variant="outlined" hide-details density="compact" color="primary"
                                    :items="franchiseeStore.all" v-model="selectedFranchisee"
                                    item-value="internalid" item-title="companyname" class="mt-2"></v-autocomplete>
                </v-list-item>
                <v-list-item>
                    <v-autocomplete label="Run Plan" variant="outlined" hide-details density="compact" color="primary"
                                    :items="runPlans" v-model="selectedRunPlan"
                                    item-value="internalid" item-title="name" class="my-2"></v-autocomplete>
                </v-list-item>

                <v-divider class="my-2"></v-divider>

                <v-list class="bg-background"
                        v-model:selected="serviceMap.settingsPanel.selectedDays"
                        select-strategy="leaf"
                         @update:selected="serviceMap.handleSelectedWeekDaysChanged()">
                    <v-list-subheader>Weekly Routes</v-list-subheader>
                    <v-list-item
                        v-for="item in serviceMap.serviceDaysOfWeek"
                        :key="item.day"
                        :title="item.date"
                        :value="item.day"
                    >
                        <template v-slot:prepend="{ isSelected }">
                            <v-list-item-action start>
                                <v-checkbox-btn :model-value="isSelected" color="primary"></v-checkbox-btn>
                            </v-list-item-action>
                        </template>
                    </v-list-item>
                </v-list>

                <v-divider class="my-2"></v-divider>
                <v-list-item>
                    <v-btn block @click="serviceMap.showTerritoryMarkings(!serviceMap.settingsPanel.territoryMarkings.show)">
                        {{ serviceMap.settingsPanel.territoryMarkings.show ? 'Hide Territories' : 'Show Territories' }}
                    </v-btn>
                </v-list-item>
            </v-list>
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