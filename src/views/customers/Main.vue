<script setup>
import { useCustomerStore } from "@/stores/customers";
import InlineSelect from "@/components/shared/InlineSelect.vue";
import { useFranchiseeStore } from "@/stores/franchisees";
import { computed, ref } from "vue";
import { useGlobalDialog } from "@/stores/global-dialog";
import { useServiceStore } from "@/stores/services";

const serviceStore = useServiceStore();
const customerStore = useCustomerStore();
const franchiseeStore = useFranchiseeStore();
const globalDialog = useGlobalDialog();

const selectedFranchisee = computed({
    get: () => franchiseeStore.current.id,
    set: async (val) => { await loadFranchiseeRelatedData(val) }
});

const customerTableHeaders = [
    { title: 'ID', align: 'start', key: 'entityid' },
    { title: 'Name', align: 'center', key: 'companyname' },
    { title: 'Scheduled', align: 'end', key: 'scheduled' },
]

const serviceTableHeaders = [
    { title: 'Name', align: 'start', key: 'custrecord_service_text' },
    { title: 'Price', align: 'center', key: 'custrecord_service_price' },
    { title: 'Scheduled', align: 'end', key: 'scheduled' },
]

const selected = ref([]);
const servicesOfCustomer = computed(() => serviceStore.ofCurrentFranchisee.filter(item => item['custrecord_service_customer'] === selected.value[0]));
const selectedCustomer = computed(() => {
    const index = customerStore.ofCurrentFranchisee.findIndex(item => item['internalid'] === selected.value[0])
    return index >= 0 ? customerStore.ofCurrentFranchisee[index] : {};
});

async function loadFranchiseeRelatedData(franchiseeId) {
    globalDialog.displayProgress('', 'Retrieving Franchisee\'s Information...');
    await franchiseeStore.changeCurrentFranchiseeId(franchiseeId);
    globalDialog.close(100, 'Complete!').then();
}

function handleCustomerTableClicked(event, item) {
    selected.value.splice(0, 1, item.item['internalid']);
}

function handleServiceTableClicked() {

}
</script>

<template>
    <v-container>
        <v-row justify="center">
            <v-col cols="6">
                <v-card color="background" class="elevation-10">
                    <v-toolbar color="primary" density="compact">
                        <span class="mx-4">Customers</span>

                        <v-divider vertical></v-divider>

                        <v-spacer></v-spacer>

                        <InlineSelect :items="franchiseeStore.all" v-model="selectedFranchisee" item-value="internalid" item-title="companyname">
                            <template v-slot:activator="{ activatorProps, selectedTitle }">
                                <span v-bind="franchiseeStore.busy ? null : activatorProps" class="ml-3 text-subtitle-2 text-secondary cursor-pointer">
                                    Franchisee:
                                    <v-progress-circular v-if="franchiseeStore.busy" indeterminate size="20" width="2" class="ml-2"></v-progress-circular>
                                    <b v-else-if="franchiseeStore.current.id"><i><u>{{ selectedTitle }}</u></i></b>
                                    <b v-else><i><u class="text-red">[Non Selected]</u></i></b>
                                </span>
                            </template>
                        </InlineSelect>

                        <v-icon size="small" variant="text" color="secondary" class="ml-2 mr-4"
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
                        <template v-slot:[`item.scheduled`]>
                            <v-icon color="red">mdi-close</v-icon>
                        </template>
                    </v-data-table-virtual>
                </v-card>
            </v-col>
            
            <v-col cols="6">
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
                        <template v-slot:[`item.scheduled`]>
                            <v-icon color="red">mdi-close</v-icon>
                        </template>
                    </v-data-table-virtual>
                </v-card>
            </v-col>
        </v-row>
    </v-container>
</template>

<style scoped>

</style>