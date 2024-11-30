import { defineStore } from 'pinia';
import http from "@/utils/http.mjs";
import {franchisee as franchiseeFields} from 'netsuite-shared-modules';
import { useRunPlanStore } from "@/stores/run-plans";
import { _parseCustomerAddress, _parseNCLocation } from "@/utils/utils.mjs";

const state = {
    cached: {},
};

const getters = {

};

const actions = {
    async init() {
        if (!top.location.href.includes('app.netsuite')) return;

    },
    async cacheAnAddress(addressType, addressId, customerId) {
        const cacheId = `${addressType}.${addressId}.${customerId}`;

        if (!this.cached[cacheId]) {
            this.cached[cacheId] = {formatted: 'Retrieving...', name: '', addr1: '', addr2: '', city: '', state: '', zip: '', lat: '', lng: ''};

            if (parseInt(addressType) === 1) {
                let address = JSON.parse(addressId);
                this.cached[cacheId] = {...address, formatted: `${address.addr1} ${address.addr2}, ${address.city} ${address.state} ${address.zip}`}
            } else if (parseInt(addressType) === 2) {
                let address = await http.get('getCustomerAddressById', {customerId, addressId});
                this.cached[cacheId] = _parseCustomerAddress(address);
            } else if (parseInt(addressType) === 3) {
                let addresses = await http.get('getLocationsByFilters', {filters: ['internalid', 'is', addressId]});
                this.cached[cacheId] = addresses[0] ? _parseNCLocation(addresses[0])
                    : {formatted: `Unknown (${addressId})`, name: '', addr1: '', addr2: '', city: '', state: '', zip: '', lat: '', lng: ''};
            }
        }
    }
};


export const useAddressStore = defineStore('addresses', {
    state: () => state,
    getters,
    actions,
});
