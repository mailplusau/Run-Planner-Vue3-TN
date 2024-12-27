import { defineStore } from 'pinia';
import http from "@/utils/http.mjs";
import {
    _getAddressFieldNameByType,
    _parseCustomerAddress,
    _parseManualAddress,
    _parseNCLocation,
} from "@/utils/utils.mjs";

const state = {
    cached: {},
};

const getters = {
    findCache: state => (addressType, addressId, customerId) => {
        const cacheId = `${addressType}.${addressId}${parseInt(addressType) === 2 ? '.' + customerId : ''}`;
        return state.cached[cacheId] || null;
    },
    findCacheByStopObj : state => stopObj => {
        const addressType = stopObj['custrecord_1288_address_type'];

        if (parseInt(addressType) === 1) return _parseManualAddress(stopObj.custrecord_1288_manual_address);

        const addressId = stopObj[_getAddressFieldNameByType(stopObj['custrecord_1288_address_type'])];
        const customerId = stopObj['custrecord_1288_customer'];
        const cacheId = `${addressType}.${addressId}${parseInt(addressType) === 2 ? '.' + customerId : ''}`;
        return state.cached[cacheId] || null;
    }
};

const actions = {
    async init() {
        if (!top.location.href.includes('app.netsuite')) return;

    },
    async cacheAnAddress(addressType, addressId, customerId) {
        const cacheId = `${addressType}.${addressId}${parseInt(addressType) === 2 ? '.' + customerId : ''}`;

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
    },
    async cacheCustomersAddresses(customerId, addresses = []) {
        addresses = !addresses || !Array.isArray(addresses) || !addresses.length ? await http.get('getCustomerAddresses', {customerId}) : addresses;

        for (let address of addresses) {
            const cacheId = `2.${address['internalid']}.${customerId}`;

            if (!this.cached[cacheId]) this.cached[cacheId] = _parseCustomerAddress(address);
        }
    },
    async cacheLocations(locations = [], parseLocation = false) {
        for (let location of locations) {
            const cacheId = `3.${location['internalid'] || location['id']}`;

            if (!this.cached[cacheId]) this.cached[cacheId] = parseLocation ? _parseNCLocation(location) : JSON.parse(JSON.stringify(location));
        }
    }
};


export const useAddressStore = defineStore('addresses', {
    state: () => state,
    getters,
    actions,
});
