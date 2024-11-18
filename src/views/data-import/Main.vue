<script setup>
import { AgGridVue } from "ag-grid-vue3";
import { nextTick, onBeforeUnmount, onMounted, ref, shallowRef } from "vue";
import { useMainStore } from "@/stores/main";

const mainStore = useMainStore();
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

const contextMenu = ref();
const gridApi = shallowRef();

const rowData = ref([])

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
        headerName: 'ID', editable: false, filter: true, width: '80px', field: 'internalId'.toLowerCase()
    },
    {
        headerName: 'Franchisee Name', editable: false, filter: true, width: '280px', field: 'companyName'.toLowerCase()
    },
    {
        headerName: 'Session Status', editable: false, filter: 'agFilterSessionStatus', width: '250px', cellRenderer: 'agFranchiseeSessionStatus',
        field: 'sessionStatus',
    },
    {
        headerName: 'Last Modified', editable: false, filter: true, width: '150px',
    },
    {
        headerName: 'By', editable: false, filter: true, width: '160px',
    },
    {
        headerName: '', editable: false, filter: false, width: '110px', resizable: false, cellRenderer: 'agControlCell'
    },
];

function handleCellMouseDown(e) {
    // contextMenu.value.handleCellMouseDown(e);
}
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

        <Teleport to="#appBarExtension" v-if="componentReady">
            <div class="d-flex">
                <v-btn variant="elevated" size="small" color="green" class="ml-4">CSV Import Controls</v-btn>
                <v-btn variant="elevated" size="small" color="green" class="ml-4">CSV Import Controls</v-btn>
            </div>
        </Teleport>
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
    box-shadow: #095c7b42 0px 0px 7px inset;
    //border-right: 2px solid #00314469 !important;
}
.ag-right-pinned-col {
    box-shadow: #095c7b42 0px 0px 7px inset;
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