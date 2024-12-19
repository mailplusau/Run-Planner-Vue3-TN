import { defineStore } from 'pinia';
import { getDay, addDays, format, addMilliseconds } from 'date-fns';
import { useRunPlanStore } from "@/stores/run-plans";
import { useFranchiseeStore } from "@/stores/franchisees";
import http from "@/utils/http.mjs";
import { serviceStop as serviceStopFields } from "netsuite-shared-modules";
import { useAddressStore } from "@/stores/addresses";
import { _getAddressFieldNameByType } from "@/utils/utils.mjs";

const state = {
    ofCurrentFranchisee: [],

    current: {
        customerId: null,

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
                        // address: rootGetters['addresses/getAddressObject'](parseInt(stop.custrecord_1288_address_type), stop),
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

    resetForm() {
        for (let fieldId in serviceStopFields) this.current.form[fieldId] = serviceStopFields[fieldId];

        this.current.form.custrecord_1288_customer = this.current.customerId;
        this.current.form.custrecord_1288_franchisee = useFranchiseeStore().current.id;

    }
};


export const useServiceStopStore = defineStore('service-stops', {
    state: () => state,
    getters,
    actions,
});
