import { defineStore } from 'pinia';
import { getDay, addDays, format, addMilliseconds } from 'date-fns';
import { useRunPlanStore } from "@/stores/run-plans";
import { useFranchiseeStore } from "@/stores/franchisees";
import http from "@/utils/http.mjs";
import { serviceStop as serviceStopFields } from "netsuite-shared-modules";
import { useAddressStore } from "@/stores/addresses";
import { _getAddressFieldNameByType, simpleCompare } from "@/utils/utils.mjs";
import { useGlobalDialog } from "@/stores/global-dialog";
import { useCustomerStore } from "@/stores/customers";
import { writeFile, utils } from 'xlsx';

const state = {
    ofCurrentFranchisee: [],

    current: {
        customerId: null,
        serviceIds: [],

        id: null,
        crudDialogOpen: false,
        form: {...serviceStopFields},
    }
};

const getters = {
    weeklyData: state => {
        let today = getDay(new Date());

        let obj = [ // 5 working days and 1 for Adhoc
            { day: 1, date: format(addDays(new Date(), 1 - today), "EEEE, do 'of' MMMM, yyyy"), stops: [] },
            { day: 2, date: format(addDays(new Date(), 2 - today), "EEEE, do 'of' MMMM, yyyy"), stops: [] },
            { day: 3, date: format(addDays(new Date(), 3 - today), "EEEE, do 'of' MMMM, yyyy"), stops: [] },
            { day: 4, date: format(addDays(new Date(), 4 - today), "EEEE, do 'of' MMMM, yyyy"), stops: [] },
            { day: 5, date: format(addDays(new Date(), 5 - today), "EEEE, do 'of' MMMM, yyyy"), stops: [] },
            { day: 6, date: 'ADHOC', stops: [] },
        ]

        if (useRunPlanStore().current.id === null) return obj;

        const serviceStopsOfCurrentRunPlan = parseInt(useRunPlanStore().current.id) === -1
            ? state.ofCurrentFranchisee.filter(item => useRunPlanStore().ofCurrentFranchisee.map(i => i['internalid']).includes(item['custrecord_1288_plan']))
            : state.ofCurrentFranchisee.filter(item => item['custrecord_1288_plan'] === useRunPlanStore().current.id);

        serviceStopsOfCurrentRunPlan.forEach(stop => { // goes through the data and create a stop for each day of each service
            let daysOfWeek = stop.custrecord_1288_frequency.split(',');
            let stopTimePerDay = stop.custrecord_1288_stop_times.split(',');

            for (const [index, value] of daysOfWeek.entries()) {
                if (value === '1') {
                    let [stopTime, stopDuration] = stopTimePerDay[index].split('|');
                    let addressTypes = ['Manually Entered', 'Address Book', 'Non-Customer Location']

                    let eventTime = new Date(format(addDays(new Date(), obj[index].day - today), "yyyy-MM-dd") + 'T' + stopTime);
                    obj[index].stops.push({
                        ...stop,
                        eventStart: eventTime.getTime(),
                        eventEnd: addMilliseconds(eventTime, parseInt(stopDuration)).getTime(),
                        stopTime, stopDuration,
                        address: stop.custrecord_1288_address_type,
                        addressType: addressTypes[parseInt(stop.custrecord_1288_address_type) - 1]
                    });
                }
            }
        })

        const simpleCompare = (a, b) => `${a}`.localeCompare(`${b}`);
        const fieldNames = ['custrecord_1288_manual_address', 'custrecord_1288_address_book', 'custrecord_1288_postal_location'];

        obj.forEach(weekDay => {
            weekDay.stops.sort((a, b) =>
                simpleCompare(a.stopTime, b.stopTime) ||
                simpleCompare(a.custrecord_1288_address_type, b.custrecord_1288_address_type) ||
                simpleCompare(a.custrecord_1288_postal_location, b.custrecord_1288_postal_location) ||
                simpleCompare(a.custrecord_1288_address_book, b.custrecord_1288_address_book)
            );

            let prevStop = null;
            let newStopArray = [];
            let groupArray = [];

            // Grouping stops based on address type and address data
            for (let stop of [...weekDay.stops, {}]) {
                if (!prevStop) prevStop = stop;
                else if (prevStop.stopTime === stop.stopTime &&
                    prevStop.custrecord_1288_address_type === stop.custrecord_1288_address_type &&
                    prevStop[fieldNames[parseInt(prevStop.custrecord_1288_address_type) - 1]] === stop[fieldNames[parseInt(stop.custrecord_1288_address_type) - 1]]) {
                    groupArray.push(prevStop);
                    prevStop = stop;
                } else {
                    if (groupArray.length) {
                        groupArray.push(prevStop);
                        newStopArray.push([...groupArray]);
                    }
                    else newStopArray.push(prevStop);
                    groupArray.splice(0);
                    prevStop = stop;
                }
            }

            weekDay.stops = newStopArray;
        })

        return obj;
    }
};

const actions = {
    async init() {
        if (!top.location.href.includes('app.netsuite')) return;

        console.log('service-stops init')
    },
    triggerStopNamePrefill() {
        this.current.form.custrecord_1288_stop_name = _getPrefilledStopName(this.current.form, this.current.customerId);
    },
    async getServiceStopsOfCurrentFranchisee() {
        if (!useFranchiseeStore().current.id) return this.ofCurrentFranchisee.splice(0);

        const serviceStops = await http.get('getServiceStopsByFilters', {
            filters: [
                ['custrecord_1288_customer.partner', 'is', useFranchiseeStore().current.id],
                'AND', ['custrecord_1288_customer.entitystatus', 'is', '13'],
                'AND', ['isinactive', 'is', false],
            ],
        });

        serviceStops.forEach(serviceStop => {
            let addressId = serviceStop[_getAddressFieldNameByType(serviceStop['custrecord_1288_address_type'])]
            useAddressStore().cacheAnAddress(serviceStop['custrecord_1288_address_type'], addressId, serviceStop['custrecord_1288_customer']);
        });

        this.ofCurrentFranchisee = serviceStops;
    },
    async saveServiceStopForm() {
        let serviceStopData = JSON.parse(JSON.stringify(this.current.form));

        // Data preparation
        serviceStopData.custrecord_1288_relief_start = new Date(serviceStopData.custrecord_1288_relief_start + ' 00:00:00');
        serviceStopData.custrecord_1288_relief_end = new Date(serviceStopData.custrecord_1288_relief_end + ' 23:59:59');

        await http.post('saveOrCreateServiceStop', {
            serviceStopId: this.current.id,
            serviceStopData
        });
    },
    async exportServiceStopsToSpreadsheet() {
        const franchiseeName = useFranchiseeStore().current.details.companyname;
        const msg = `Would you like to export all service stops of franchisee <u><b class="text-primary">${franchiseeName}</b></u> to a spreadsheet file?`;

        const confirmed = await new Promise((resolve) => {
            useGlobalDialog().displayInfo('', msg, false, [
                'spacer',
                {color: 'unset', variant: 'elevated', text: 'Cancel', action:() => { resolve(0); useGlobalDialog().close(); }, class: 'text-none'},
                {color: 'green', variant: 'elevated', text: 'Export All', action:() => { resolve(1); }, class: 'text-none'},
                'spacer',
            ], false, 465)
        });

        if (!confirmed) return;

        useGlobalDialog().displayProgress('', 'Exporting service stops. Please wait...');
        await this.getServiceStopsOfCurrentFranchisee();

        const serviceStops = JSON.parse(JSON.stringify(this.ofCurrentFranchisee));

        serviceStops.sort((a, b) =>
            simpleCompare(a.custrecord_1288_customer, b.custrecord_1288_customer) ||
            simpleCompare(a.custrecord_1288_service, b.custrecord_1288_service) ||
            simpleCompare(a.custrecord_1288_stop_times, b.custrecord_1288_stop_times)
        );

        const excelRows = [];

        for (let serviceStop of serviceStops) {
            let addressObject = useAddressStore().findCacheByStopObj(serviceStop);

            let terms = [
                {key: 'mon', value: 'Monday'},
                {key: 'tue', value: 'Tuesday'},
                {key: 'wed', value: 'Wednesday'},
                {key: 'thu', value: 'Thursday'},
                {key: 'fri', value: 'Friday'},
                {key: 'adhoc', value: 'Adhoc'},
            ]
            let stopTimes = {}
            let stopTimeArray = serviceStop.custrecord_1288_stop_times.split(',');
            for (let [index, freq] of serviceStop.custrecord_1288_frequency.split(',').entries())
                stopTimes[terms[index].value.toLowerCase()] = parseInt(freq) === 1 ? stopTimeArray[index].split('|')[0] : ''

            let addressTypes = ['Undocumented', 'Customer\'s Address', 'Known Address'];

            excelRows.push({
                franchisee: serviceStop.custrecord_1288_franchisee_text,
                customerInternalId: serviceStop.custrecord_1288_customer,
                customerEntityId: serviceStop.custrecord_1288_customer_text.substring(0, serviceStop.custrecord_1288_customer_text.indexOf(' ') + 1),
                customerName: serviceStop.custrecord_1288_customer_text.substring(serviceStop.custrecord_1288_customer_text.indexOf(' ') + 1),
                serviceID: serviceStop.custrecord_1288_service,
                serviceName: serviceStop.custrecord_1288_service_text,
                addressType: addressTypes[parseInt(serviceStop.custrecord_1288_address_type) - 1],
                address: addressObject.formatted,

                ...stopTimes,

                notes: serviceStop.custrecord_1288_notes,
                driverId: serviceStop.custrecord_1288_operator,
                driverName: serviceStop.custrecord_1288_operator_text,
                planId: serviceStop.custrecord_1288_plan,
                planName: serviceStop.custrecord_1288_plan_text,
                serviceStopId: serviceStop.internalid,
            });
        }

        const headers = ['Franchisee', 'Customer Internal ID', 'Customer Entity ID', 'Customer Name', 'Service ID', 'Service Name', 'Address Type', 'Address',
            'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Adhoc',' Notes', 'Driver ID', 'Driver Name', 'Plan ID', 'Plan Name', 'Service Stop ID'];

        const workbook = utils.book_new();
        const worksheet = utils.json_to_sheet(excelRows);

        utils.sheet_add_aoa(worksheet, [headers], { origin: "A1" });
        utils.sheet_add_json(worksheet, excelRows, { origin: 'A2', skipHeader: true });
        utils.book_append_sheet(workbook, worksheet, "Report");

        writeFile(workbook, `${franchiseeName.toLowerCase()} (${(new Date()).getTime()}).xlsx`, { compression: true });

        await useGlobalDialog().close(2500, 'Export Complete. File will be downloaded shortly.')
    },
    async saveOrCreateServiceStop(serviceStopId, serviceStopData) {
        await http.post('saveOrCreateServiceStop', {serviceStopId, serviceStopData});
    },
    async deleteServiceStop(serviceStop) {
        const msg = `<p class="mb-5 text-center"><i class="mdi-close-octagon mdi v-icon notranslate v-theme--light text-red" style="font-size: 50px; height: 50px; width: 50px;"></i></p>` +
            `<p>You are about to delete a service stop with the following information:</p>` +
            `<ul class="text-subtitle-1" style="padding-left: 24px">` +
            `<li>Stop Name: <b class="text-primary">${serviceStop.custrecord_1288_stop_name}</b></li>` +
            `<li>Service Name: <b class="text-primary">${serviceStop.custrecord_1288_service_text}</b></li>` +
            `<li>Customer Name: <b class="text-primary">${serviceStop.custrecord_1288_customer_text}</b></li>` +
            `</ul><p class="my-2">Would you like to delete this service stop?</p>` +
            `<p class="mt-2 mb-0"><b class="text-red">Warning: This action is irreversible!</b></p>`;

        const confirmed = await new Promise((resolve) => {
            useGlobalDialog().displayInfo('', msg, false, [
                'spacer',
                {color: 'unset', variant: 'elevated', text: 'Cancel', action:() => { resolve(0); useGlobalDialog().close(); }, class: 'text-none'},
                {color: 'red', variant: 'elevated', text: 'DELETE SERVICE STOP', action:() => { resolve(1); useGlobalDialog().close(); }, class: 'text-none'},
                'spacer',
            ])
        });

        if (!confirmed) return;

        useGlobalDialog().displayProgress('', 'Deleting service stop. Please wait...');
        const res = await http.post('deleteServiceStop', {serviceStopId: serviceStop['internalid']});
        await this.getServiceStopsOfCurrentFranchisee();
        useGlobalDialog().displayInfo('Complete', res);
    },

    resetForm() {
        for (let fieldId in serviceStopFields) this.current.form[fieldId] = serviceStopFields[fieldId];

        this.current.form.custrecord_1288_customer = this.current.customerId;
        this.current.form.custrecord_1288_franchisee = useFranchiseeStore().current.id;

    }
};

function _getPrefilledStopName(stopObject, customerId) {
    const form = stopObject;
    console.log('stopObject', stopObject);
    const customer = useCustomerStore().ofCurrentFranchisee.filter(i => i['internalid'] === customerId)?.[0] || {};

    if (parseInt(form.custrecord_1288_address_type) === 2) {
        console.log('customer', customer);
        return customer.companyname;
    }

    if (parseInt(form.custrecord_1288_address_type) === 3) {
        const locationObject = useAddressStore().findCache('3', form.custrecord_1288_postal_location, customerId);

        console.log('locationObject', locationObject);
        return locationObject?.name || '';
    }

    return '';
}


export const useServiceStopStore = defineStore('service-stops', {
    state: () => state,
    getters,
    actions,
});
