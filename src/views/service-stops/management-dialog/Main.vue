<script setup>
import { computed, watch } from "vue";
import { useServiceStopStore } from "@/stores/service-stops";
import { useServiceStore } from "@/stores/services";
import { useCustomerStore } from "@/stores/customers";
import { useAddressStore } from "@/stores/addresses";
import { _getAddressFieldNameByType } from "@/utils/utils.mjs";

const customerStore = useCustomerStore();
const serviceStore = useServiceStore();
const addressStore = useAddressStore();
const ssStore = useServiceStopStore();

const selectedCustomer = computed(() => {
    const index = customerStore.ofCurrentFranchisee.findIndex(item => item['internalid'] === ssStore.current.customerId)
    return index >= 0 ? customerStore.ofCurrentFranchisee[index] : {};
});
const dialogOpen = computed({
    get: () => !!ssStore.current.customerId,
    set: val => ssStore.current.customerId = !val ? null : ssStore.current.customerId,
});
const servicesOfCustomer = computed(() => {
    return serviceStore.ofCurrentFranchisee
        .filter(item => item['custrecord_service_customer'] === ssStore.current.customerId)
        .map(service => ({
            ...service,
            serviceStops: ssStore.ofCurrentFranchisee.filter(item => item['custrecord_1288_service'] === service['internalid']).map(serviceStop => {
                let addressId = serviceStop[_getAddressFieldNameByType(serviceStop['custrecord_1288_address_type'])]

                return {
                    ...serviceStop,
                    address: addressStore.findCache(serviceStop['custrecord_1288_address_type'], addressId, serviceStop['custrecord_1288_customer'])
                }
            })
        }))
})

function frequencyText(serviceStop) {
    let text = '';
    let days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Adhoc'];

    let daysOfWeek = serviceStop.custrecord_1288_frequency.split(',');
    let stopTimePerDay = serviceStop.custrecord_1288_stop_times.split(',');

    for (const [index, value] of daysOfWeek.entries()) {
        if (value === '1') {
            let [stopTime, _] = stopTimePerDay[index].split('|');
            if (text) text += ' | '
            text += days[index] + ' @ ' + stopTime
        }
    }

    return text;
}

function openServiceStopEditor(serviceId, serviceStop) {
    ssStore.resetForm();

    ssStore.current.form.custrecord_1288_service = serviceId;

    if (serviceStop)
        for (let fieldId in ssStore.current.form)
            ssStore.current.form[fieldId] = serviceStop[fieldId];

    ssStore.current.crudDialogOpen = true;
}

watch(dialogOpen, val => {
    if (val) addressStore.cacheCustomersAddresses(ssStore.current.customerId);
})
</script>

<template>
    <v-dialog v-model="dialogOpen" fullscreen persistent transition="dialog-bottom-transition">
        <v-card color="background">
            <v-toolbar color="primary" class="mb-4">
                <span class="ml-4 text-subtitle-1 text-secondary">
                    <b>{{ selectedCustomer['entityid'] }} {{ selectedCustomer['companyname'] }}</b>
                </span>

                <v-spacer></v-spacer>

                <v-btn color="red" @click="dialogOpen = false" variant="elevated" class="mr-3" size="small"><v-icon>mdi-close</v-icon> close</v-btn>
            </v-toolbar>

            <v-expansion-panels multiple :model-value="servicesOfCustomer.map(item => item['internalid'])" variant="accordion" elevation="5" class="px-4 mb-5">
                <v-expansion-panel v-for="service in servicesOfCustomer" :value="service['internalid']">
                    <v-expansion-panel-title color="primary">
                        <v-row justify="space-between" align="center" class="text-white font-weight-bold">
                            <v-col cols="auto" class="text-subtitle-1">{{ service['custrecord_service_text'] }}</v-col>

                            <v-col cols="auto" class="mr-10">
                                <v-btn color="green" size="small"
                                       @click.stop="openServiceStopEditor(service.internalid)" class="mr-3">Add Service Stop</v-btn>
                            </v-col>
                        </v-row>
                    </v-expansion-panel-title>
                    <v-expansion-panel-text class="bg-background">
                        <span class="text-grey-darken-2 font-italic" v-if="!service.serviceStops.length">No service stop scheduled</span>

                        <v-timeline align="start" side="end" dot-color="primary" justify="auto" style="justify-content: start" class="service-stop-timeline">
                            <v-timeline-item v-for="serviceStop in service.serviceStops" size="small">
                                <v-row justify="space-between" align="center" class="mb-3">
                                    <v-col cols="auto">
                                        <strong class="text-primary">{{ serviceStop['custrecord_1288_stop_name'] }}</strong>
                                        <div class="text-subtitle-2">
                                            Address: {{ serviceStop.address.formatted }}
                                        </div>
                                        <div class="text-caption">
                                            Frequency: {{ frequencyText(serviceStop) }}
                                        </div>
                                        <div class="text-caption font-italic text-grey-darken-2">Notes: {{ serviceStop['custrecord_1288_notes'] }}</div>
                                    </v-col>
                                    <v-col cols="auto">
                                        <v-btn color="primary" size="small" @click.stop="openServiceStopEditor(null, serviceStop)">
                                            <v-icon size="small" class="mr-2">mdi-pencil</v-icon> Edit stop
                                        </v-btn>
                                        <v-btn variant="plain" icon="" color="red" class="ml-2">
                                            <v-icon>mdi-delete</v-icon>
                                        </v-btn>
                                    </v-col>
                                </v-row>
                            </v-timeline-item>
                        </v-timeline>
                    </v-expansion-panel-text>
                </v-expansion-panel>
            </v-expansion-panels>
        </v-card>
    </v-dialog>
</template>

<style scoped>

</style>