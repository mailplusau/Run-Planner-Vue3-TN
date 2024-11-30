<script setup>
import { useServiceStopStore } from "@/stores/service-stops";
import { computed } from "vue";
import InlineSelect from "@/components/shared/InlineSelect.vue";
import { useFranchiseeStore } from "@/stores/franchisees";
import { useGlobalDialog } from "@/stores/global-dialog";
import { useRunPlanStore } from "@/stores/run-plans";
import { useAddressStore } from "@/stores/addresses";
import { _getAddressFieldNameByType } from "@/utils/utils.mjs";

const serviceStopStore = useServiceStopStore();
const franchiseeStore = useFranchiseeStore();
const runPlanStore = useRunPlanStore();
const globalDialog = useGlobalDialog();
const addressStore = useAddressStore();

const selectedFranchisee = computed({
    get: () => franchiseeStore.current.id,
    set: async (val) => {
        globalDialog.displayProgress('', 'Retrieving Franchisee\'s Information...');
        await franchiseeStore.changeCurrentFranchiseeId(val);
        globalDialog.close(100, 'Complete!').then();
    }
});

const vsItemTypes = {
    DATE: 'date',
    STOP: 'stop',
    DIVIDER: 'divider',
}

const selectedRunPlan = computed({
    get: () => runPlanStore.current.id,
    set: async (val) => {
        globalDialog.displayProgress('', 'Retrieving Service Stop Information...');
        await runPlanStore.changeCurrentRunPlanId(val);
        globalDialog.close(100, 'Complete!').then();
    }
});

const runPlans = computed(() => {
    if (!franchiseeStore.current.id) return [];

    const associatedRunPlans = runPlanStore.all.filter(item => parseInt(item['custrecord_run_franchisee']) === parseInt(franchiseeStore.current.id));

    return associatedRunPlans.length > 1 ?
        [{internalid: '-1', name: 'All Run Plans'}, ...associatedRunPlans] : associatedRunPlans
})

function getAddressObject(serviceStop) {
    let addressId = serviceStop[_getAddressFieldNameByType(serviceStop['custrecord_1288_address_type'])]
    const cacheId = `${serviceStop['custrecord_1288_address_type']}.${addressId}.${serviceStop['custrecord_1288_customer']}`;
    return addressStore.cached[cacheId];
}

const virtualScrollItems = computed(() => {
    const items = [];

    for (let serviceDay of serviceStopStore.weeklyData) {
        if (!serviceDay.stops.length) continue;

        items.push({
            type: vsItemTypes.DATE,
            data: serviceDay.date,
        })

        for (let stop of serviceDay.stops) {
            items.push({
                type: vsItemTypes.STOP,
                data: stop
            })
        }
    }

    return items;
})
</script>

<template>
    <v-container fluid>
        <v-row>
            <v-col cols="12">
                <v-card color="background" class="elevation-10">

                    <v-toolbar color="primary" density="compact">
                        <span class="mx-4">Weekly Stops</span>

                        <v-divider vertical></v-divider>

                        <v-spacer></v-spacer>

                        <InlineSelect :items="franchiseeStore.all" v-model="selectedFranchisee" item-value="internalid" item-title="companyname">
                            <template v-slot:activator="{ activatorProps, selectedTitle }">
                                <span v-bind="franchiseeStore.busy ? null : activatorProps" class="mx-3 text-subtitle-2 text-secondary cursor-pointer">
                                    Franchisee:
                                    <v-progress-circular v-if="franchiseeStore.busy" indeterminate size="20" width="2" class="ml-2"></v-progress-circular>
                                    <b v-else-if="franchiseeStore.current.id"><i><u>{{ selectedTitle }}</u></i></b>
                                    <b v-else><i><u class="text-red">[Non Selected]</u></i></b>
                                </span>
                            </template>
                        </InlineSelect>

                        <InlineSelect :items="runPlans" v-model="selectedRunPlan" item-value="internalid" item-title="name" no-data-text="No run plan found">
                            <template v-slot:activator="{ activatorProps, selectedTitle }">
                                <span v-bind="franchiseeStore.busy ? null : activatorProps" class="mx-3 text-subtitle-2 text-secondary cursor-pointer">
                                    Run Plan:
                                    <v-progress-circular v-if="franchiseeStore.busy" indeterminate size="20" width="2" class="ml-2"></v-progress-circular>
                                    <b v-else-if="parseInt(runPlanStore.current.id) === -1"><i><u>All Run Plans</u></i></b>
                                    <b v-else-if="runPlanStore.current.id"><i><u>{{ selectedTitle || 'Unknown' }}</u></i></b>
                                    <b v-else><i><u class="text-red">[Non Selected]</u></i></b>
                                </span>
                            </template>
                        </InlineSelect>

                        <span class="mr-3"></span>
                    </v-toolbar>

                    <v-virtual-scroll :style="{height: 'calc(100vh - 140px)'}" :items="virtualScrollItems">
                        <template v-slot:default="{ item }">

                            <template v-if="item['type'] === vsItemTypes.DATE">
                                <v-list-item class="text-primary text-subtitle-1 font-weight-bold">
                                    {{ item.data }}
                                </v-list-item>
                                <v-divider></v-divider>
                            </template>

                            <template v-if="item['type'] === vsItemTypes.STOP">
                                <v-list-item>
                                    <template v-slot:prepend>
                                        <span class="mr-5 text-subtitle-2">{{ item.data.stopTime || item.data[0].stopTime}}</span>
                                        <v-icon size="small">mdi-map-marker</v-icon>
                                    </template>
                                    <v-list-item-title class="text-subtitle-2">
                                        {{ item.data.custrecord_1288_stop_name || item.data[0].custrecord_1288_stop_name }}
                                        <span class="text-blue">{{Array.isArray(item.data) ? '(shared stop)' : ''}}</span>
                                    </v-list-item-title>
                                    <v-list-item-subtitle v-if="Array.isArray(item.data)" class="text-caption">
                                        {{ getAddressObject(item.data[0]).formatted }}
                                    </v-list-item-subtitle>
                                    <v-list-item-subtitle v-else class="text-caption">
                                        {{ getAddressObject(item.data).formatted }}
                                    </v-list-item-subtitle>
                                </v-list-item>
                                <v-divider></v-divider>
                            </template>

                        </template>
                    </v-virtual-scroll>

                </v-card>
            </v-col>
        </v-row>
    </v-container>
</template>

<style scoped>

</style>