<script setup>
import { computed, ref, watch } from "vue";
import { useDataStore } from "@/stores/data";
import { useAddressStore } from "@/stores/addresses";
import http from "@/utils/http.mjs";
import { _getAddressFieldNameByType, _parseNCLocation } from "@/utils/utils.mjs";
import { useFranchiseeStore } from "@/stores/franchisees";

const emit = defineEmits(['addressSelected'])
const props = defineProps({
    readonly: {
        type: Boolean,
        default: false,
    },
    title: {
        type: String,
        default: 'Select a date'
    },
    disabled: {
        type: Boolean,
        default: false,
    },
    min: {
        type: String,
        default: '',
    },
    clearable: {
        type: Boolean,
        default: false,
    }
})

const serviceStopObject = defineModel('serviceStopObject', {required: true});
const customerId = computed(() => serviceStopObject.value['custrecord_1288_customer'] || null);

const addressStore = useAddressStore();
const dataStore = useDataStore();

const dialogOpen = ref(false);
const locationOptions = ref([]);
const nclState = ref(1);
const nclType = ref('');
const nclLoading = ref(false);
const selectedBookId = ref('');
const selectedLocationId = ref('');
const selectedAddressType = ref(null);

const displayAddress = computed(() => {
    const addressObject = addressStore.findCache(
        serviceStopObject.value['custrecord_1288_address_type'],
        serviceStopObject.value[_getAddressFieldNameByType(serviceStopObject.value['custrecord_1288_address_type'])],
        serviceStopObject.value['custrecord_1288_customer']);

    return addressObject?.formatted || ''
});
const customerAddressOption = computed(() => !customerId.value ? [] : Object.keys(addressStore.cached)
    .filter(key => (new RegExp(`^(2\\.)\\S*(\\.${customerId.value})$`, 'gi')).test(key))
    .map(key => addressStore.cached[key]));
const selectedBook = computed(() => {
    if (!selectedBookId.value) return {};
    const cacheKey = `2.${selectedBookId.value}.${customerId.value}`;
    return addressStore.cached[cacheKey] || {};
});
const selectedLocation = computed(() => {
    const index = locationOptions.value.findIndex(item => item['id'] === selectedLocationId.value);

    return index >= 0 ? locationOptions.value[index] : {};
})
const nonCustomerLocationTypes = computed(() => {
    // AusPost (1), Bank (3), Storage Facilities (9), Partner Location (13), Meeting Point (14), Toll Depots (21), Kennards (22), Storage King (23), I.M. (25)
    let locations = [1, 3, 9, 13, 14, 21, 22, 23, 25];
    return dataStore.nonCustomerLocationTypes.filter(item => locations.includes(parseInt(item.value)));
})

async function getLocationOptions() {
    if (!nclState.value || !nclType.value) return;
    
    locationOptions.value.splice(0);
    nclLoading.value = true;
    const data = await http.get('getLocationsByFilters', {filters: [
            ['custrecord_ap_lodgement_site_state', 'is', nclState.value],
            'AND',
            ['custrecord_noncust_location_type', 'is', nclType.value],
            'AND',
            ['isinactive', 'is', false]
        ]});

    nclLoading.value = false;
    locationOptions.value = !Array.isArray(data) ? [] : data.map(item => ({ ..._parseNCLocation(item) }));
}

function useBookAddress() {
    serviceStopObject.value['custrecord_1288_address_type'] = '2';
    serviceStopObject.value['custrecord_1288_address_book'] = selectedBookId.value;
    emit('addressSelected');
    dialogOpen.value = false;
    resetDialog();
}

function useLocation() {
    addressStore.cacheLocations([selectedLocation.value], false);
    serviceStopObject.value['custrecord_1288_address_type'] = '3';
    serviceStopObject.value['custrecord_1288_postal_location'] = selectedLocationId.value;
    emit('addressSelected');
    dialogOpen.value = false;
    resetDialog();
}

function resetDialog() {
    selectedAddressType.value = null;
    selectedLocationId.value = '';
    selectedBookId.value = '';
    nclType.value = '';
    nclState.value = null;
}

watch(nclState, () => getLocationOptions());
watch(nclType, () => getLocationOptions());
watch(dialogOpen, val => {
    if (val) {
        nclState.value = parseInt(useFranchiseeStore().current.details.location);
    }
})
</script>

<template>
    <v-dialog v-model="dialogOpen" width="800">
        <template v-slot:activator="{ props: activatorProps }">
            <slot name="activator" :activatorProps="props.disabled ? null : activatorProps" :clearable="props.clearable"
                  :displayAddress="displayAddress" :readonly="props.readonly" :disabled="props.disabled"></slot>
        </template>

        <v-card color="background" class="pa-5">
            <p class="text-center text-h5 text-primary mb-5">Pick an address</p>
            <v-expansion-panels v-model="selectedAddressType" variant="popout">
                <v-expansion-panel :value="2">
                    <v-expansion-panel-title :color="selectedAddressType === 2 ? 'primary' : 'background'">
                        <template v-slot:default="{ expanded }">
                            {{ expanded ? 'CUSTOMER ADDRESS' : 'from Customer\'s Address Book'}}
                        </template>
                    </v-expansion-panel-title>
                    <v-expansion-panel-text class="bg-background">
                        <v-row class="mt-2">
                            <v-col cols="12">
                                <v-autocomplete label="Address" variant="underlined" density="compact" color="primary"
                                                v-model="selectedBookId" :items="customerAddressOption"
                                                item-value="id" item-title="formatted"></v-autocomplete>
                            </v-col>
                            <v-col cols="4">
                                <v-text-field label="City" variant="underlined" density="compact" color="primary" disabled
                                              :model-value="selectedBook.city"></v-text-field>
                            </v-col>
                            <v-col cols="4">
                                <v-text-field label="State" variant="underlined" density="compact" color="primary" disabled
                                              :model-value="selectedBook.state"></v-text-field>
                            </v-col>
                            <v-col cols="4">
                                <v-text-field label="Postcode" variant="underlined" density="compact" color="primary" disabled
                                              :model-value="selectedBook.zip"></v-text-field>
                            </v-col>
                            <v-col cols="6">
                                <v-text-field label="Latitude" variant="underlined" density="compact" color="primary" disabled
                                              :model-value="selectedBook.lat"></v-text-field>
                            </v-col>
                            <v-col cols="6">
                                <v-text-field label="Longitude" variant="underlined" density="compact" color="primary" disabled
                                              :model-value="selectedBook.lng"></v-text-field>
                            </v-col>
                            <v-col cols="12">
                                <v-btn color="green" block size="large" @click="useBookAddress()">Use this address</v-btn>
                            </v-col>
                        </v-row>
                    </v-expansion-panel-text>
                </v-expansion-panel>
                <v-expansion-panel :value="3">
                    <v-expansion-panel-title :color="selectedAddressType === 3 ? 'primary' : 'background'">
                        <template v-slot:default="{ expanded }">
                            {{ expanded ? 'NON-CUSTOMER LOCATION' : 'from list of Non-Customer Location'}}
                        </template>
                    </v-expansion-panel-title>
                    <v-expansion-panel-text class="bg-background">
                        <v-row class="mt-2">
                            <v-col cols="6">
                                <v-autocomplete label="Type" variant="underlined" density="compact" color="primary"
                                                v-model="nclType" :items="nonCustomerLocationTypes" :disabled="nclLoading"></v-autocomplete>
                            </v-col>
                            <v-col cols="6">
                                <v-autocomplete label="State" variant="underlined" density="compact" color="primary"
                                                v-model="nclState" :items="dataStore.states" :disabled="nclLoading"></v-autocomplete>
                            </v-col>
                            <v-col cols="12">
                                <v-autocomplete label="Locations" variant="underlined" density="compact" color="primary"
                                                v-model="selectedLocationId" :items="locationOptions" item-title="name" item-value="id"></v-autocomplete>
                            </v-col>
                            <v-col cols="4">
                                <v-text-field label="City" variant="underlined" density="compact" color="primary" disabled
                                              :model-value="selectedLocation.city"></v-text-field>
                            </v-col>
                            <v-col cols="4">
                                <v-text-field label="State" variant="underlined" density="compact" color="primary" disabled
                                              :model-value="selectedLocation.state"></v-text-field>
                            </v-col>
                            <v-col cols="4">
                                <v-text-field label="Postcode" variant="underlined" density="compact" color="primary" disabled
                                              :model-value="selectedLocation.zip"></v-text-field>
                            </v-col>
                            <v-col cols="6">
                                <v-text-field label="Latitude" variant="underlined" density="compact" color="primary" disabled
                                              :model-value="selectedLocation.lat"></v-text-field>
                            </v-col>
                            <v-col cols="6">
                                <v-text-field label="Longitude" variant="underlined" density="compact" color="primary" disabled
                                              :model-value="selectedLocation.lng"></v-text-field>
                            </v-col>
                            <v-col cols="12">
                                <v-btn color="green" block size="large" @click="useLocation()">Use this address</v-btn>
                            </v-col>
                        </v-row>
                    </v-expansion-panel-text>
                </v-expansion-panel>
            </v-expansion-panels>

            <v-row justify="center">
                <v-col cols="8">
                    <v-btn block color="red" class="mt-5" @click="dialogOpen = false">Cancel</v-btn></v-col>
            </v-row>
        </v-card>
    </v-dialog>
</template>

<style scoped>

</style>