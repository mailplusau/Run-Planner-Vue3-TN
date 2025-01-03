import { defineStore } from 'pinia';
import http from '@/utils/http.mjs';
import { getOperatorsByFilters, serviceStop as serviceStopFields } from "netsuite-shared-modules";
import { _parseNCLocation } from "@/utils/utils.mjs";
import { read, utils } from 'xlsx';
import { useGlobalDialog } from "@/stores/global-dialog";

const state = {
    importDialog: {
        open: false,
        csvFile: null,
    },

    stopsToBeImported: [],

    franchisees: [],
    customersByFranchiseeId: {},
    runPlansByFranchiseeId: {},
    operatorsByFranchiseeId: {},
    servicesByCustomerId: {},
    addressBooksByCustomerId: {},
    locationsById: {},
};

state.stopsToBeImported.push({...serviceStopFields});

const getters = {

};

const actions = {
    async init() {

    },
    async importCSV() {
        useGlobalDialog().displayProgress('', 'Reading file for data...');

        let workBook;
        let fileToImport = this.importDialog.csvFile;

        const errorMsg = `<b class="text-red"><u>${fileToImport.name}</u></b> is not an acceptable data file.`
        if (!/(.csv|.xls|.xlsx)$/gi.test(fileToImport.name)) return useGlobalDialog().displayError('Error', errorMsg);

        let fileContent = await new Promise(resolve => {
            let fr = new FileReader();
            fr.onload = () => { resolve(fr.result); }
            fr.readAsArrayBuffer(fileToImport);
        })

        try {
            workBook = read(fileContent, { raw: false });
        } catch (e) { return useGlobalDialog().displayError('Error', errorMsg); }

        /* generate array of data from the first worksheet */
        const workSheet = workBook.Sheets[workBook.SheetNames[0]]; // get the first worksheet
        const lineDataArray = utils.sheet_to_json(workSheet, {raw: false, header: 1}); // generate array of arrays

        let serviceStopResults = [];
        let promises = [];
        let headers = lineDataArray.shift();

        this.stopsToBeImported.splice(0);

        let results = await Promise.allSettled(lineDataArray.map(lineData =>
            http.post('convertCsvLineToServiceStopData', {lineData, useOldTemplate: headers.includes('Stop 1 Location')}, {noErrorPopup: true})));

        this.importDialog.open = false;
        this.importDialog.csvFile = null;

        for (let result of results) {
            if (result.status === 'fulfilled') {
                serviceStopResults.push(...result.value)
                promises.push(this.getCustomersByFranchiseeId(serviceStopResults[serviceStopResults.length - 1].custrecord_1288_franchisee));
                promises.push(this.getPlansByFranchiseeId(serviceStopResults[serviceStopResults.length - 1].custrecord_1288_franchisee));
                promises.push(this.getOperatorsByFranchiseeId(serviceStopResults[serviceStopResults.length - 1].custrecord_1288_franchisee));
                promises.push(this.getServicesByCustomerId(serviceStopResults[serviceStopResults.length - 1].custrecord_1288_customer));
                promises.push(this.getAddressBooksByCustomerId(serviceStopResults[serviceStopResults.length - 1].custrecord_1288_customer));

                if (Array.isArray(result.value)) {
                    for (let subResult of result.value)
                        if (parseInt(subResult.custrecord_1288_address_type) === 3 && subResult.custrecord_1288_postal_location)
                            promises.push(this.getLocationById(subResult.custrecord_1288_postal_location));
                }
            }
        }

        await Promise.allSettled(promises);

        this.stopsToBeImported = serviceStopResults;
        this.stopsToBeImported.push({...serviceStopFields});
        console.log(serviceStopResults);

        if (!this.stopsToBeImported.length)
            useGlobalDialog().displayError('Error', 'CSV file did not yield any service stop.');
        else await useGlobalDialog().close(2000, 'Complete!');

        console.log(JSON.parse(JSON.stringify(this.locationsById)))
    },

    async getCustomersByFranchiseeId(franchiseeId) {
        if (!this.customersByFranchiseeId[franchiseeId])
            this.customersByFranchiseeId[franchiseeId] =
                await http.get('getCustomersByFilters', {filters: [
                        ['partner', 'is', franchiseeId],
                        'AND', ['entitystatus', 'is', 13]
                    ]})
    },
    async getPlansByFranchiseeId(franchiseeId) {
        if (!this.runPlansByFranchiseeId[franchiseeId])
            this.runPlansByFranchiseeId[franchiseeId] =
                await http.get('getRunPlansByFilters', {filters: [['custrecord_run_franchisee', 'is', franchiseeId]]})
    },
    async getOperatorsByFranchiseeId(franchiseeId) {
        if (!this.operatorsByFranchiseeId[franchiseeId])
            this.operatorsByFranchiseeId[franchiseeId] =
                await http.get('getOperatorsByFilters', {filters: [['custrecord_operator_franchisee', 'is', franchiseeId]]})
    },
    async getServicesByCustomerId(customerId) {
        if (!this.servicesByCustomerId[customerId])
            this.servicesByCustomerId[customerId] =
                await http.get('getServicesByFilters', {filters: [['custrecord_service_customer', 'is', customerId]]})
    },
    async getAddressBooksByCustomerId(customerId) {
        if (!this.addressBooksByCustomerId[customerId])
            this.addressBooksByCustomerId[customerId] = await http.get('getCustomerAddresses', {customerId})
    },
    async getLocationById(locationId) {
        if (!this.locationsById[locationId]) {
            let results = await http.get('getLocationsByFilters', {filters: [['internalid', 'is', locationId]]});
            if (!Array.isArray(results)) return;
            let location = results[0];
            let address = _parseNCLocation(location);
            this.locationsById[locationId] = [{
                addressId: location['internalid'],
                addressType: 3,
                address,
                location,
            }]
        }
    },
};


export const useDataImporter = defineStore('data-importer', {
    state: () => state,
    getters,
    actions,
});
