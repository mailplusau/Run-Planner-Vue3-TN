import { defineStore } from 'pinia';
import http from '@/utils/http.mjs';

const state = {
    nonCustomerLocationTypes: [],
    states: [
        {value: 1, title: 'NSW'},
        {value: 2, title: 'QLD'},
        {value: 3, title: 'VIC'},
        {value: 4, title: 'SA'},
        {value: 5, title: 'TAS'},
        {value: 6, title: 'ACT'},
        {value: 7, title: 'WA'},
        {value: 8, title: 'NT'},
        {value: 9, title: 'NZ'},
    ],
};

const getters = {

};

const actions = {
    async init() {
        let alwaysLoad = ['getNonCustomerLocationType'];

        let dataToFetch = alwaysLoad.map(item => this[item]());

        await Promise.allSettled(dataToFetch);
    },
    async getNonCustomerLocationType() {
        await _fetchDataForHtmlSelect(this.nonCustomerLocationTypes,
            null, 'customlist_noncust_location_type', 'internalId', 'name');
    },
};

async function _fetchDataForHtmlSelect(stateObject, id, type, valueColumnName, textColumnName) {
    stateObject.splice(0);

    let data = await http.get('getCustomListData', {
        id, type, valueColumnName, textColumnName
    });

    data.forEach(item => { stateObject.push(item); });
}

export const useDataStore = defineStore('data', {
    state: () => state,
    getters,
    actions,
});
