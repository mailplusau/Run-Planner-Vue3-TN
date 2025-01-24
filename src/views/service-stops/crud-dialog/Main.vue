<script setup>
import { rules } from "@/utils/utils.mjs";
import { useServiceStore } from "@/stores/services";
import { useServiceStopStore } from "@/stores/service-stops";
import TimePicker from "@/components/shared/TimePicker.vue";
import AddressPicker from "@/views/service-stops/crud-dialog/components/AddressPicker.vue";
import { useRunPlanStore } from "@/stores/run-plans";
import { useOperatorStore } from "@/stores/operators";
import { computed, onMounted, ref } from "vue";
import { useGlobalDialog } from "@/stores/global-dialog";

const { validate } = rules;
const serviceStore = useServiceStore();
const globalDialog = useGlobalDialog();
const ssStore = useServiceStopStore();
const runPlanStore = useRunPlanStore();
const operatorStore = useOperatorStore();

const serviceTimeDifference = 0; // 0: same every day | 1: different each day

const formDisabled = ref(false);
const formValid = ref(true);
const mainForm = ref(null);
const currentService = computed(() => {
    return serviceStore.ofCurrentFranchisee.filter(service => service['internalid'] === ssStore.current.form.custrecord_1288_service)?.[0] || {};
})

function getFreq(index) { // arcane voodoo black magic stuffs
    if (index >= 0 && index <= 5)
        return ssStore.current.form?.custrecord_1288_frequency?.split(',')[index] ? !!parseInt(ssStore.current.form.custrecord_1288_frequency.split(',')[index]) : false;
    else if (index === -1)
        return ssStore.current.form.custrecord_1288_frequency.substr(0, 9) === '1,1,1,1,1';
}

function setFreq(index, value) {
    if (index === 5) {
        ssStore.current.form.custrecord_1288_frequency = '0,0,0,0,0,' + (value === null ? 0 : 1);
    } else if (index >= 0 && index <= 4) {
        let arr = ssStore.current.form.custrecord_1288_frequency.split(',');
        arr.splice(index, 1, value === null ? '0' : '1');
        arr.splice(5, 1, '0');
        ssStore.current.form.custrecord_1288_frequency = arr.join(',');
    } else if (index === -1)
        ssStore.current.form.custrecord_1288_frequency = '1,1,1,1,1,0';
}

function getServiceTime(index) {
    return ssStore.current.form.custrecord_1288_stop_times.split(',')[index].split('|')[0];
}

function setServiceTime(index, value) {
    let arr = ssStore.current.form.custrecord_1288_stop_times.split(',');
    let duration = ssStore.current.form.custrecord_1288_stop_times.split(',')[index].split('|')[1];

    if (serviceTimeDifference === 0)
        ssStore.current.form.custrecord_1288_stop_times = arr.map(() => value + '|' + duration).join(',');
    else {
        arr.splice(index, 1, value + '|' + duration);
        ssStore.current.form.custrecord_1288_stop_times = arr.join(',');
    }
}

async function saveForm() {
    let res = await mainForm['value']['validate']();
    if (!res.valid) return console.log('Fix the errors');

    console.log('form valid!')
    globalDialog.displayProgress('', 'Saving service stop data. Please wait...');
    await ssStore.saveServiceStopForm();
    await ssStore.getServiceStopsOfCurrentFranchisee();
    ssStore.resetForm();
    ssStore.current.id = null;
    ssStore.current.crudDialogOpen = false;
    await globalDialog.close(500, 'Save complete!');
}


</script>

<template>
    <v-dialog v-model="ssStore.current.crudDialogOpen" width="950" persistent>
        <v-card color="background">
            <v-toolbar color="primary">
                <span class="ml-4">
                    <span v-if="ssStore.current.id">Edit <b class="text-secondary">Service Stop #{{ssStore.current.id}}</b> of </span>
                    <span v-else>Add new service stop for </span>
                    service <b class="text-secondary">{{currentService['custrecord_service_text']}}</b>
                    <br><span class="text-caption">Customer: <i class="text-secondary">{{currentService['custrecord_service_customer_text']}}</i></span>
                </span>

                <v-spacer></v-spacer>

                <v-btn color="red" @click="ssStore.current.crudDialogOpen = false" variant="elevated" class="mr-3" size="small"><v-icon>mdi-close</v-icon> cancel</v-btn>
            </v-toolbar>

            <div style="max-height: 80vh; overflow-y: scroll; overflow-x: hidden;">
                <v-container class="mt-5">
                    <v-form ref="mainForm" v-model="formValid" lazy-validation :disabled="formDisabled">
                        <v-row justify="center">
                            <v-col cols="12" class="pb-0">
                                <AddressPicker v-model:service-stop-object="ssStore.current.form" @address-selected="ssStore.triggerStopNamePrefill()">
                                    <template v-slot:activator="{ activatorProps, displayAddress }">
                                        <v-text-field label="Address" variant="outlined" density="compact" color="primary" :model-value="displayAddress"
                                                      prepend-icon="mdi-map-marker-outline" v-bind="activatorProps" readonly
                                                      :rules="[v => validate(v, 'required')]"></v-text-field>
                                    </template>
                                </AddressPicker>
                            </v-col>
                            <v-col cols="8">
                                <v-autocomplete label="Run Plan" variant="outlined" density="compact" color="primary" class="mb-5"
                                                prepend-icon="mdi-book-play-outline" :items="runPlanStore.ofCurrentFranchisee"
                                                item-value="internalid" item-title="name" v-model="ssStore.current.form.custrecord_1288_plan"
                                                :rules="[v => validate(v, 'required')]"></v-autocomplete>
                                <v-autocomplete label="Operator" variant="outlined" density="compact" color="primary" class="mb-5"
                                                prepend-icon="mdi-account" :items="operatorStore.ofCurrentFranchisee"
                                                item-value="internalid" item-title="name" v-model="ssStore.current.form.custrecord_1288_operator"
                                                :rules="[v => validate(v, 'required')]"></v-autocomplete>
                                <v-text-field label="Stop Name" variant="outlined" density="compact" color="primary" class="mb-4"
                                              prepend-icon="mdi-tag-heart-outline" v-model="ssStore.current.form.custrecord_1288_stop_name"
                                              :rules="[v => validate(v, 'required')]"></v-text-field>

                                <TimePicker :model-value="getServiceTime(0)" @update:model-value="v => setServiceTime(0, v)">
                                    <template v-slot:activator="{ activatorProps, displayValue }">
                                        <v-text-field prefix="Service Time:" variant="outlined" density="compact" color="primary"
                                                      prepend-icon="mdi-timer-check-outline" persistent-placeholder
                                                      v-bind="activatorProps" :model-value="displayValue" readonly
                                                      :rules="[v => validate(v, 'required')]"></v-text-field>
                                    </template>
                                </TimePicker>
                            </v-col>

                            <v-col cols="4">
                                <v-textarea v-model="ssStore.current.form.custrecord_1288_notes"
                                            label="Notes" variant="outlined" density="compact" color="primary" rows="11" no-resize></v-textarea>
                            </v-col>
                        </v-row>

                        <v-row justify="space-between" no-gutters class="mt-3">
                            <v-col cols="12">
                                Frequency:
                                <i v-show="ssStore.current.form.custrecord_1288_frequency === '0,0,0,0,0,0'" class="text-red">
                                    (Please specify frequency)
                                </i>
                            </v-col>
                            <v-col cols="auto">
                                <v-checkbox hide-details label="Daily" color="primary"
                                            :model-value="getFreq(-1)" @update:model-value="v => setFreq(-1, v)"
                                ></v-checkbox>
                            </v-col>

                            <v-col cols="auto">
                                <v-checkbox hide-details label="Adhoc" color="primary"
                                            :model-value="getFreq(5)" @update:model-value="v => setFreq(5, v)"
                                ></v-checkbox>
                            </v-col>
                            <v-col cols="auto">
                                <v-checkbox hide-details label="Monday" color="primary"
                                            :model-value="getFreq(0)" @update:model-value="v => setFreq(0, v)"
                                ></v-checkbox>
                            </v-col>
                            <v-col cols="auto">
                                <v-checkbox hide-details label="Tuesday" color="primary"
                                            :model-value="getFreq(1)" @update:model-value="v => setFreq(1, v)"
                                ></v-checkbox>
                            </v-col>
                            <v-col cols="auto">
                                <v-checkbox hide-details label="Wednesday" color="primary"
                                            :model-value="getFreq(2)" @update:model-value="v => setFreq(2, v)"
                                ></v-checkbox>
                            </v-col>
                            <v-col cols="auto">
                                <v-checkbox hide-details label="Thursday" color="primary"
                                            :model-value="getFreq(3)" @update:model-value="v => setFreq(3, v)"
                                ></v-checkbox>
                            </v-col>
                            <v-col cols="auto">
                                <v-checkbox hide-details label="Friday" color="primary"
                                            :model-value="getFreq(4)" @update:model-value="v => setFreq(4, v)"
                                ></v-checkbox>
                            </v-col>
                        </v-row>

                        <v-row justify="center">
                            <v-col cols="12">
                                <v-btn color="green" block size="large" @click="saveForm">Save & Close</v-btn>
                            </v-col>
                        </v-row>
                    </v-form>
                </v-container>
            </div>
        </v-card>
    </v-dialog>
</template>

<style scoped>

</style>