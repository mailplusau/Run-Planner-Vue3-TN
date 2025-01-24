<script setup>
import { AgGridVue } from "ag-grid-vue3";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef } from "vue";
import { useMainStore } from "@/stores/main";
import { _getAddressFieldNameByType, isServiceStopObjectValid } from "@/utils/utils.mjs";
import { useDataImporter } from "@/stores/data-importer";
import { useFranchiseeStore } from "@/stores/franchisees";
import agCellRemoval from '@/views/data-import/components/agCellRemoval.vue';
import agAddressPicker from '@/views/data-import/components/agAddressPicker.vue';
import agCompletenessCell from '@/views/data-import/components/agCompletenessCell.vue';
import agVAutocompleteEditor from '@/views/data-import/components/agVAutocompleteEditor.vue';
import DialogImportFile from "@/views/data-import/components/dialogImportFile.vue";

const mainStore = useMainStore();
const dataImporter = useDataImporter();
const franchiseeStore = useFranchiseeStore();
const componentReady = ref(false);

onMounted(async () => {
    await nextTick();
    mainStore.appBarExtended = true;
    await nextTick();
    componentReady.value = true;
})

onBeforeUnmount(() => {
    componentReady.value = false;
    mainStore.appBarExtended = false;
})

const gridApi = shallowRef();

const validStops = computed(() => dataImporter.stopsToBeImported.filter(stop => !isServiceStopObjectValid(stop)))
const rowData = computed({
    get() {
        return dataImporter.stopsToBeImported;
    },
    set(val) {
        if (Array.isArray(val)) {
            for (let [index, value] of val.entries())
                dataImporter.stopsToBeImported.splice(index, 1, value)

            dataImporter.stopsToBeImported.splice(val.length);
        }
    }
})

const onGridReady = (params) => {
    gridApi.value = params.api;
    gridApi.value.applyColumnState({
        state: [{ colId: "sessionStatus", sort: "asc" }],
        defaultState: { sort: null },
    });
};

const columnDefs = [
    {
        headerName: "#", width: '50px', pinned: 'left', cellClass: ['ag-left-pinned-col', 'text-center'], headerClass: 'text-center',
        valueGetter: params => {
            return params.node.rowIndex;
        }
    },
    {
        headerName: "", width: '36px', pinned: 'right', cellClass: 'ag-right-pinned-col',
        cellRenderer: 'agCompletenessCell',
        sortable: true, resizable: false,
        valueGetter: params => isServiceStopObjectValid(params.data),
    },
    { headerName: "", width: '40px', pinned: 'right', cellRenderer: 'agCellRemoval', sortable: false, resizable: false, cellClass: 'ag-right-pinned-col', },

    { headerName: 'Franchisee', editable: true, filter: true, width: '150px',
        valueGetter: params => {
            let franchisees = franchiseeStore.all.map(item => ({value: item.internalid, title: item.companyname}));
            let index = franchisees.findIndex(item => item.value === params.data.custrecord_1288_franchisee)
            return index >= 0 ? franchisees[index].title : params.data.custrecord_1288_franchisee;
        },
        valueSetter: params => {
            params.data.custrecord_1288_franchisee = params.newValue;
            params.data.custrecord_1288_plan = '';
            params.data.custrecord_1288_operator = '';
            params.data.custrecord_1288_customer = '';
            params.data.custrecord_1288_service = '';
            params.data.custrecord_1288_relief_operator = '';
            resetAddressAndStopName(params.data);
            dataImporter.getCustomersByFranchiseeId(params.newValue);
            dataImporter.getPlansByFranchiseeId(params.newValue);
            dataImporter.getOperatorsByFranchiseeId(params.newValue);
            return true;
        },
        cellEditor: "agVAutocompleteEditor",
        cellEditorParams: () => ({ values: franchiseeStore.all.map(item => ({value: item.internalid, title: item.companyname})) }),
    },
    {
        headerName: 'Plan', editable: true, filter: true, width: '100px',
        valueGetter: params => {
            let plans = dataImporter.runPlansByFranchiseeId[params.data.custrecord_1288_franchisee]
                ?.map(item => ({value: item.internalid, title: item.name})) || [];
            let index = plans.findIndex(item => item.value === params.data.custrecord_1288_plan)
            return index >= 0 ? plans[index].title : params.data.custrecord_1288_plan;
        },
        valueSetter: params => {
            params.data.custrecord_1288_plan = params.newValue;
            return true;
        },
        cellEditor: "agVAutocompleteEditor",
        cellEditorParams: params => ({ values: dataImporter.runPlansByFranchiseeId[params.data.custrecord_1288_franchisee]
                ?.map(item => ({value: item.internalid, title: item.name})) || [] }),
    },
    {
        headerName: 'Driver', editable: true, filter: true, width: '150px',
        valueGetter: params => {
            let operators = dataImporter.operatorsByFranchiseeId[params.data.custrecord_1288_franchisee]
                ?.map(item => ({value: item.internalid, title: item.name})) || [];
            let index = operators.findIndex(item => item.value === params.data.custrecord_1288_operator)
            return index >= 0 ? operators[index].title : params.data.custrecord_1288_operator;
        },
        valueSetter: params => {
            params.data.custrecord_1288_operator = params.newValue;
            return true;
        },
        cellEditor: "agVAutocompleteEditor",
        cellEditorParams: params => ({ values: dataImporter.operatorsByFranchiseeId[params.data.custrecord_1288_franchisee]
                ?.map(item => ({value: item.internalid, title: item.name})) || [] }),
    },
    {
        headerName: 'Customer', editable: true, filter: true, width: '200px',
        valueGetter: params => {
            let customers = dataImporter.customersByFranchiseeId[params.data.custrecord_1288_franchisee]
                ?.map(item => ({value: item.internalid, title: item.companyname})) || [];
            let index = customers.findIndex(item => item.value === params.data.custrecord_1288_customer)
            return index >= 0 ? customers[index].title : params.data.custrecord_1288_customer;
        },
        valueSetter: params => {
            params.data.custrecord_1288_customer = params.newValue;
            params.data.custrecord_1288_service = '';
            resetAddressAndStopName(params.data);
            dataImporter.getServicesByCustomerId(params.newValue);
            dataImporter.getAddressBooksByCustomerId(params.newValue);
            return true;
        },
        cellEditor: "agVAutocompleteEditor",
        cellEditorParams: params => ({ values: dataImporter.customersByFranchiseeId[params.data.custrecord_1288_franchisee]
                ?.map(item => ({value: item.internalid, title: item.companyname})) || [] }),
    },
    {
        headerName: 'Service', editable: true, filter: true, width: '80px',
        valueGetter: params => {
            let services = dataImporter.servicesByCustomerId[params.data.custrecord_1288_customer]
                ?.map(item => ({value: item.internalid, title: item.name})) || [];
            let index = services.findIndex(item => item.value === params.data.custrecord_1288_service)
            return index >= 0 ? services[index].title : params.data.custrecord_1288_service;
        },
        valueSetter: params => {
            params.data.custrecord_1288_service = params.newValue;
            return true;
        },
        cellEditor: "agVAutocompleteEditor",
        cellEditorParams: params => ({ values: dataImporter.servicesByCustomerId[params.data.custrecord_1288_customer]
                ?.map(item => ({value: item.internalid, title: item.name})) || [] }),
    },
    {
        headerName: 'Address', editable: true, filter: true, cellEditor: "agAddressPicker", width: '250px',
        valueGetter: params => {
            if (parseInt(params.data.custrecord_1288_address_type) === 2 && params.data.custrecord_1288_address_book) {
                let index = dataImporter.addressBooksByCustomerId[params.data.custrecord_1288_customer]
                    ?.findIndex(item => parseInt(item.internalid) === parseInt(params.data.custrecord_1288_address_book));

                let address = dataImporter.addressBooksByCustomerId[params.data.custrecord_1288_customer][index]
                return address ? address.fullAddress : '[Unknown]';
            }

            if (parseInt(params.data.custrecord_1288_address_type) === 3 && params.data.custrecord_1288_postal_location) {
                let address = dataImporter.locationsById[params.data.custrecord_1288_postal_location]?.[0] || null;

                return address ? address.location?.name : '[Unknown]';
            }

            return '';
        },
        valueSetter: params => {
            console.log('params.newValue', params.newValue)
            let [addressType, addressId] = params.newValue.split('|');

            if (addressType && addressId) {
                params.data.custrecord_1288_address_type = addressType;
                let fieldName = _getAddressFieldNameByType(addressType);
                params.data[fieldName] = addressId;
                params.data.custrecord_1288_stop_name = getStopName(params.data);
            }

            return true;
        },
    },
    { field: 'custrecord_1288_stop_name', headerName: 'Stop Name', editable: true, width: '200px', filter: true, },
    {
        headerName: 'MON', editable: true, cellClass: 'text-center', headerClass: 'text-center',
        valueGetter: params => freqGetter(0, params),
        valueSetter: params => freqSetter(0, params),
        width: '60px'
    },
    {
        headerName: 'TUE', editable: true, cellClass: 'text-center', headerClass: 'text-center',
        valueGetter: params => freqGetter(1, params),
        valueSetter: params => freqSetter(1, params),
        width: '60px'
    },
    {
        headerName: 'WED', editable: true, cellClass: 'text-center', headerClass: 'text-center',
        valueGetter: params => freqGetter(2, params),
        valueSetter: params => freqSetter(2, params),
        width: '60px'
    },
    {
        headerName: 'THU', editable: true, cellClass: 'text-center', headerClass: 'text-center',
        valueGetter: params => freqGetter(3, params),
        valueSetter: params => freqSetter(3, params),
        width: '60px'
    },
    {
        headerName: 'FRI', editable: true, cellClass: 'text-center', headerClass: 'text-center',
        valueGetter: params => freqGetter(4, params),
        valueSetter: params => freqSetter(4, params),
        width: '60px'
    },
    {
        headerName: 'Adhoc', editable: true, cellClass: 'text-center', headerClass: 'text-center',
        valueGetter: params => freqGetter(5, params),
        valueSetter: params => freqSetter(5, params),
        width: '60px'
    },
    {
        field: 'custrecord_1288_notes', headerName: 'Notes', editable: true, width: '200px', filter: true,
        cellEditor: 'agLargeTextCellEditor', cellEditorPopup: true,
    },
    { field: 'internalid', headerName: 'Service Stop ID', editable: false, width: '100px', filter: true, },
];

function freqGetter(index, params) {
    let time = params.data.custrecord_1288_stop_times.split(',')[index].split('|')[0];
    let freq = params.data.custrecord_1288_frequency.split(',')[index];

    return (parseInt(freq) === 1) ? time : '';
}

function freqSetter(index, params) {
    if (!params.newValue) return;

    let [hour, minute] = params.newValue.split(':');

    hour = (!hour || isNaN(hour)) ? 9 : parseInt(hour);
    hour = `${hour - Math.floor(hour / 24) * 24}`.padStart(2, '0');
    minute = (!minute || isNaN(minute)) ? 0 : parseInt(minute);
    minute = `${minute - Math.floor(minute / 60) * 60}`.padStart(2, '0');

    if (!hour || !minute) return;

    let timeArray = params.data.custrecord_1288_stop_times.split(',');
    let freqArray = params.data.custrecord_1288_frequency.split(',');

    if (params.newValue) {
        let stopDuration = params.data.custrecord_1288_stop_times.split(',')[index].split('|')[1]
        freqArray.splice(index, 1, '1');
        timeArray.splice(index, 1, `${hour}:${minute}|` + stopDuration)
    } else
        freqArray.splice(index, 1, '0');

    params.data.custrecord_1288_stop_times = timeArray.join(',');
    params.data.custrecord_1288_frequency = freqArray.join(',');
    return true;
}

function getStopName(singleRowData) {
    let stopName = '';

    if (parseInt(singleRowData.custrecord_1288_address_type) === 2 && singleRowData.custrecord_1288_address_book) {
        let customers = dataImporter.customersByFranchiseeId[singleRowData.custrecord_1288_franchisee]
            .map(item => ({value: item.internalid, title: item.companyname}));

        let index = customers.findIndex(item => item.value === singleRowData.custrecord_1288_customer);

        stopName = index >= 0 ? customers[index].title : '';
    }

    if (parseInt(singleRowData.custrecord_1288_address_type) === 3 && singleRowData.custrecord_1288_postal_location) {
        let address = dataImporter.locationsById[singleRowData.custrecord_1288_postal_location];

        stopName = address ? address.location?.name : '';
    }

    return stopName;
}

function resetAddressAndStopName(singleRowData) {
    if (parseInt(singleRowData.custrecord_1288_address_type) !== 3) {
        singleRowData.custrecord_1288_address_type = '';
        singleRowData.custrecord_1288_stop_name = '';
        singleRowData.custrecord_1288_address_book = '';
        singleRowData.custrecord_1288_postal_location = '';
        singleRowData.custrecord_1288_manual_address = '';
    }
}

function handleCellMouseDown(e) {
    // contextMenu.value.handleCellMouseDown(e);
}

defineExpose({agAddressPicker, agCompletenessCell, agVAutocompleteEditor, agCellRemoval})
</script>

<template>
    <v-container fluid class="fill-height pa-0">
        <v-row class="fill-height background" no-gutters>
            <ag-grid-vue style="width: 100%; height: 100%;" ref="agGrid"
                         class="ag-theme-custom"
                         :stopEditingWhenCellsLoseFocus="true"
                         :columnDefs="columnDefs"
                         :preventDefaultOnContextMenu="true"
                         :getRowClass="params => params.data['highlightClass']"
                         :enableCellTextSelection="true"
                         @gridReady="onGridReady"
                         @cellMouseDown="handleCellMouseDown"
                         v-model="rowData">
            </ag-grid-vue>
        </v-row>

        <Teleport to="div.v-toolbar__extension" v-if="componentReady">
            <div class="d-flex justify-end flex-grow-1">
                <v-btn variant="elevated" size="small" color="green" class="mr-4" @click="dataImporter.createStopsFromCSV()"
                       :disabled="!validStops.length">Import Service Stops</v-btn>
                <v-btn variant="outlined" size="small" color="secondary" class="mr-4" @click="dataImporter.importDialog.open = true">
                    Select File To Import</v-btn>
            </div>
        </Teleport>

        <dialogImportFile />
    </v-container>
</template>

<style lang="scss">
.v-data-table_row_has_error {
    background-color: white;
    color: red;
}
.v-data-table_row_cursor_pointer {
    cursor: pointer;
}
.ag-left-pinned-col {
    box-shadow: #095c7b42 0 0 7px inset;
    //border-right: 2px solid #00314469 !important;
}
.ag-right-pinned-col {
    box-shadow: #095c7b42 0 0 7px inset;
    //border-left: 2px solid #00314469 !important;
}
.ag-price-adjustment-col {
    box-shadow: #7bff8c 0 0 40px inset;
}

.national-account-filter {
    display: inline;
    width: 250px;
    margin-left: 15px;
}

.national-account-filter > * {
    margin: 8px;
}

.national-account-filter > div:first-child {
    font-weight: bold;
}

.national-account-filter > label {
    display: inline-block;
}

@import '@/assets/ag-grid-theme-builder.css';
</style>