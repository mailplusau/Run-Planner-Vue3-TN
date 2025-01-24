<script setup>
import { useServiceStopStore } from "@/stores/service-stops";
import { computed, ref } from "vue";
import InlineSelect from "@/components/shared/InlineSelect.vue";
import { useFranchiseeStore } from "@/stores/franchisees";
import { useGlobalDialog } from "@/stores/global-dialog";
import { useRunPlanStore } from "@/stores/run-plans";
import { useAddressStore } from "@/stores/addresses";
import { _getAddressFieldNameByType } from "@/utils/utils.mjs";
import { mapPinColorOptions } from "@/utils/defaults.mjs";
import { useCustomerStore } from "@/stores/customers";

const serviceStopStore = useServiceStopStore();
const franchiseeStore = useFranchiseeStore();
const runPlanStore = useRunPlanStore();
const globalDialog = useGlobalDialog();
const addressStore = useAddressStore();
const customerStore = useCustomerStore();

const baseUrl = 'https://' + import.meta.env.VITE_NS_REALM + '.app.netsuite.com';
const combinedStops = ref([]);
const combinedStopsDialog = computed({
    get: () => !!combinedStops.value.length,
    set: val => { if (!val) combinedStops.value.splice(0); }
})
const selectedFranchisee = computed({
    get: () => franchiseeStore.current.id,
    set: async (val) => {
        globalDialog.displayProgress('', 'Retrieving Franchisee\'s Information...');
        await franchiseeStore.changeCurrentFranchiseeId(val);
        globalDialog.close(100, 'Complete!').then();
    }
});

const vsItemTypes = {
    NO_DATA: 'no_data',
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

    if (!items.length) items.push({type: vsItemTypes.NO_DATA});

    return items;
})

function getPinColor(serviceStop) {
    let stop = Array.isArray(serviceStop) ? serviceStop[0] : serviceStop;
    return mapPinColorOptions[parseInt(stop.custrecord_1288_address_type) - 1] || '';
}

function getAddressObject(serviceStop) {
    let addressId = serviceStop[_getAddressFieldNameByType(serviceStop['custrecord_1288_address_type'])]
    return addressStore.findCache(serviceStop['custrecord_1288_address_type'], addressId, serviceStop['custrecord_1288_customer']);
}

function handleStopClicked(serviceStop) {
    combinedStops.value.splice(0);
    if (Array.isArray(serviceStop)) combinedStops.value = [...serviceStop];
    else serviceStopStore.current.customerId = serviceStop['custrecord_1288_customer'];
}

function getCustomerName(id) {
    let index = customerStore.ofCurrentFranchisee.findIndex(item => parseInt(id) === parseInt(item['internalid']));
    if (index < 0) return 'Unknown';
    let customer = customerStore.ofCurrentFranchisee[index];
    return `${customer['entityid']} ${customer['companyname']}`;
}
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

                    <v-virtual-scroll :height="virtualScrollItems.length <= 1 ? 'unset' : 'calc(100vh - 140px)'" :items="virtualScrollItems">
                        <template v-slot:default="{ item }">

                            <template v-if="item['type'] === vsItemTypes.NO_DATA">
                                <v-list-item class="text-grey text-subtitle-1 font-italic">
                                    No data to show
                                </v-list-item>
                                <v-divider></v-divider>
                            </template>

                            <template v-else-if="item['type'] === vsItemTypes.DATE">
                                <v-list-item class="text-primary text-subtitle-1 font-weight-bold">
                                    {{ item.data }}
                                </v-list-item>
                                <v-divider></v-divider>
                            </template>

                            <template v-else-if="item['type'] === vsItemTypes.STOP">
                                <v-list-item @click="handleStopClicked(item.data)">
                                    <template v-slot:prepend>
                                        <span class="mr-5 text-subtitle-2">{{ item.data.stopTime || item.data[0].stopTime}}</span>
                                        <v-icon size="small" :color="getPinColor(item.data)">mdi-map-marker</v-icon>
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

        <v-dialog v-model="combinedStopsDialog" width="450px" scrollable>
            <v-card class="bg-background">
                <v-card-title>
                    <p v-if="combinedStops.length" class="text-center">
                        Service stop <b class="text-primary">{{combinedStops[0].custrecord_1288_stop_name}}</b>
                        at <b class="text-primary">{{combinedStops[0].stopTime}}</b> <br>is shared by the following services:
                    </p>
                </v-card-title>
                <v-divider></v-divider>
                <v-card-text style="max-height: 500px;" class="pa-0">
                    <v-table class="bg-background">
                        <thead>
                        <tr>
                            <th class="text-center">Services</th>
                            <th class="text-center">Customers</th>
                        </tr>
                        </thead>
                        <tbody style="max-height: 500px;">
                        <tr v-for="(stop, index) in combinedStops" :key="index">
                            <td class="text-center">
                                <a @click="handleStopClicked(stop)" class="text-decoration-underline text-primary cursor-pointer">
                                    {{stop.custrecord_1288_service_text}}
                                </a>
                            </td>
                            <td class="text-center">
                                <a :href="`${baseUrl}/app/common/entity/custjob.nl?id=${stop.custrecord_1288_customer}`" target="_blank" class="text-primary">
                                    {{ getCustomerName(stop.custrecord_1288_customer) }}
                                </a>
                            </td>
                        </tr>
                        </tbody>
                    </v-table>
                </v-card-text>

                <v-divider></v-divider>

                <v-card-actions>
                    <v-spacer></v-spacer>
                    <v-btn color="primary" small outlined dark @click="combinedStopsDialog = false">Close</v-btn>
                    <v-spacer></v-spacer>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </v-container>
</template>

<style scoped>

</style>