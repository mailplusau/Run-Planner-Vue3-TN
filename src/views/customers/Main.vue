<script setup>
import { useCustomerStore } from "@/stores/customers";
import InlineSelect from "@/components/shared/InlineSelect.vue";
import { useFranchiseeStore } from "@/stores/franchisees";
import { computed, nextTick, ref } from "vue";
import { useGlobalDialog } from "@/stores/global-dialog";
import { useServiceStore } from "@/stores/services";
import { useServiceStopStore } from "@/stores/service-stops";
import { waitMilliseconds } from "@/utils/utils.mjs";

const serviceStore = useServiceStore();
const customerStore = useCustomerStore();
const franchiseeStore = useFranchiseeStore();
const globalDialog = useGlobalDialog();
const serviceStopStore = useServiceStopStore();

const customerTableHeaders = [
    { title: 'ID', align: 'start', key: 'entityid' },
    { title: 'Name', align: 'center', key: 'companyname' },
    { title: 'Services', align: 'center', key: 'services',
        sortRaw (a, b) {
            const aServices = serviceStore.ofCurrentFranchisee.filter(i => i['custrecord_service_customer'] === a['internalid']).length;
            const bServices = serviceStore.ofCurrentFranchisee.filter(i => i['custrecord_service_customer'] === b['internalid']).length;
            return aServices - bServices;
        },
    },
    { title: 'Stops', align: 'center', key: 'stops',
        sortRaw (a, b) {
            const aStops = serviceStopStore.ofCurrentFranchisee.filter(i => i['custrecord_1288_customer'] === a['internalid']).length;
            const bStops = serviceStopStore.ofCurrentFranchisee.filter(i => i['custrecord_1288_customer'] === b['internalid']).length;
            return aStops - bStops;
        },
    },
    { title: 'Scheduled', align: 'end', key: 'scheduled' },
]

const serviceTableHeaders = [
    { title: 'Name', align: 'start', key: 'custrecord_service_text' },
    { title: 'Price', align: 'center', key: 'custrecord_service_price' },
    { title: 'Scheduled', align: 'end', key: 'scheduled' },
]

const selected = ref([]);
const servicesOfCustomer = computed(() => serviceStore.ofCurrentFranchisee.filter(item => item['custrecord_service_customer'] === selected.value[0]));
const selectedFranchisee = computed({
    get: () => franchiseeStore.current.id,
    set: async (val) => { await loadFranchiseeRelatedData(val) }
});
const selectedCustomer = computed(() => {
    const index = customerStore.ofCurrentFranchisee.findIndex(item => item['internalid'] === selected.value[0])
    return index >= 0 ? customerStore.ofCurrentFranchisee[index] : {};
});

async function loadFranchiseeRelatedData(franchiseeId) {
    globalDialog.displayProgress('', 'Retrieving Franchisee\'s Information...');
    await franchiseeStore.changeCurrentFranchiseeId(franchiseeId);
    globalDialog.close(100, 'Complete!').then();
}

function isCustomerFullyScheduled(customerId) {
    let scheduled = true;
    const relatedServices = serviceStore.ofCurrentFranchisee.filter(i => i['custrecord_service_customer'] === customerId);

    if (!relatedServices.length) return false;

    relatedServices.forEach(service => {
        const numberOfServiceStops = serviceStopStore.ofCurrentFranchisee.filter(i => i['custrecord_1288_service'] === service['internalid']).length;
        scheduled = scheduled && !!numberOfServiceStops;
    });

    return scheduled;
}

function isServiceFullScheduled(serviceId) {
    return !!serviceStopStore.ofCurrentFranchisee.filter(i => i['custrecord_1288_service'] === serviceId).length;
}

async function handleCustomerTableClicked(event, item) {
    globalDialog.displayProgress('', 'Retrieving Services...');
    await waitMilliseconds(300);
    selected.value.splice(0, 1, item.item['internalid']);
    await globalDialog.close(200, 'Complete!')
}

async function handleServiceTableClicked(event, item) {
    serviceStopStore.current.customerId = item.item['custrecord_service_customer'];
}
</script>

<template>
    <v-container fluid>
        <v-row justify="center">
            <v-col xl="5" lg="6" md="7" cols="7">
                <v-card color="background" class="elevation-10">
                    <v-toolbar color="primary" density="compact">
                        <span class="ml-4 mr-2">Customers of Franchisee:</span>

                        <InlineSelect :items="franchiseeStore.all" v-model="selectedFranchisee" item-value="internalid" item-title="companyname">
                            <template v-slot:activator="{ activatorProps, selectedTitle }">
                                <span v-bind="franchiseeStore.busy ? null : activatorProps" class="text-secondary cursor-pointer">
                                    <v-progress-circular v-if="franchiseeStore.busy" indeterminate size="20" width="2" class="ml-2"></v-progress-circular>
                                    <b v-else-if="franchiseeStore.current.id"><i><u>{{ selectedTitle }}</u></i></b>
                                    <b v-else><i><u class="text-red">[Non Selected]</u></i></b>
                                </span>
                            </template>
                        </InlineSelect>

                        <v-icon size="small" variant="text" color="secondary" class="ml-2 mr-4" :disabled="!franchiseeStore.current.id"
                                @click="loadFranchiseeRelatedData(franchiseeStore.current.id)">mdi-refresh</v-icon>
                    </v-toolbar>

                    <v-data-table-virtual v-model="selected" select-strategy="single"
                                          class="bg-background" sticky fixed-header hover item-selectable
                                          :headers="customerTableHeaders"
                                          :items="customerStore.ofCurrentFranchisee"
                                          item-value="internalid"
                                          @click:row="handleCustomerTableClicked"
                                          :row-props="i => i.item['internalid'] === selected[0] ? {class: 'bg-white'} : {}"
                                          :height="customerStore.ofCurrentFranchisee.length ? 'calc(100vh - 140px)' : 'unset'">
                        <template v-slot:[`item.services`]="{ item }">
                            {{ serviceStore.ofCurrentFranchisee.filter(i => i['custrecord_service_customer'] === item['internalid']).length }}
                        </template>
                        <template v-slot:[`item.stops`]="{ item }">
                            {{ serviceStopStore.ofCurrentFranchisee.filter(i => i['custrecord_1288_customer'] === item['internalid']).length }}
                        </template>
                        <template v-slot:[`item.scheduled`]="{ item }">
                            <v-icon v-if="isCustomerFullyScheduled(item['internalid'])" color="green">mdi-check</v-icon>
                            <v-icon v-else color="red">mdi-close</v-icon>
                        </template>
                    </v-data-table-virtual>
                </v-card>
            </v-col>
            
            <v-col xl="3" lg="4" md="5" cols="5">
                <v-card color="background" class="elevation-10">
                    <v-toolbar color="primary" density="compact">
                        <v-toolbar-title class="text-subtitle-1 text-secondary">
                            {{ selectedCustomer['entityid'] }} {{ selectedCustomer['companyname'] }}
                        </v-toolbar-title>
                    </v-toolbar>

                    <v-data-table-virtual class="bg-background" sticky hover
                                          :headers="serviceTableHeaders"
                                          @click:row="handleServiceTableClicked"
                                          :items="servicesOfCustomer">
                        <template v-slot:[`item.scheduled`]="{ item }">
                            <v-icon v-if="isServiceFullScheduled(item['internalid'])" color="green">mdi-check</v-icon>
                            <v-icon v-else color="red">mdi-close</v-icon>
                        </template>
                    </v-data-table-virtual>
                </v-card>
            </v-col>
        </v-row>
    </v-container>
</template>

<style scoped>

</style>