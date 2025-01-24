import { defineStore } from 'pinia';
import http from '@/utils/http.mjs';
import { serviceStop as serviceStopFields } from "netsuite-shared-modules";
import { _parseNCLocation, isServiceStopObjectValid } from "@/utils/utils.mjs";
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

        if (!this.stopsToBeImported.length)
            useGlobalDialog().displayError('Error', 'CSV file did not yield any service stop.');
        else await useGlobalDialog().close(2000, 'Complete!');
    },
    async createStopsFromCSV() {
        let validStops = [];
        let invalidStops = [];

        for (let stop of this.stopsToBeImported)
            if (isServiceStopObjectValid(stop)) validStops.push(stop); else invalidStops.push(stop);

        const confirmed = useGlobalDialog().displayConfirmation('Preparing to import Service Stops',
            `<b class="text-primary">${validStops.length} valid entries</b> will be uploaded to NetSuite.`
            + (invalidStops.length ? `<span>The remaining <b class="text-red">${invalidStops.length} invalid entries</b> will remain on this page for further correction.<br></span>` : '')
            + `Do you wish to proceed?`);

        if (!confirmed) return;

        let percent = 0;
        let warning = `<br><b class="text-red">Do not close or leave this page!</b>`;
        useGlobalDialog().displayProgress('', `Please wait. Creating service stops... 0% ${warning}`);

        for (let [index, stop] of validStops.entries()) {
            percent = Math.floor((index + 1) * 10000 / validStops.length) / 100;
            useGlobalDialog().displayProgress('', `Please wait. Creating service stops... ${percent}% ${warning}`);
            stop.custrecord_1288_relief_start = new Date('2024-01-01T00:00:00');
            stop.custrecord_1288_relief_end = new Date('2024-01-01T23:59:59');
            await http.post('saveOrCreateServiceStop', {serviceStopId: stop.internalid, serviceStopData: stop});
        }

        useGlobalDialog().displayInfo('Complete', `${validStops.length} service stops have been created.`);
        this.stopsToBeImported = invalidStops.length ? invalidStops : [{...serviceStopFields}];
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
