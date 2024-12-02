import { defineStore } from 'pinia';
import http from "@/utils/http.mjs";
import { useFranchiseeStore } from "@/stores/franchisees";

const state = {
    ofCurrentFranchisee: [],
};

const getters = {

};

const actions = {
    async init() {
        if (!top.location.href.includes('app.netsuite')) return;

    },
    async getServicesOfCurrentFranchisee() {
        if (!useFranchiseeStore().current.id) return this.ofCurrentFranchisee.splice(0);

        this.ofCurrentFranchisee = await http.get('getServicesByFilters', {
            filters: [
                ['isinactive', 'is', false],
                'AND', ['custrecord_service_customer.partner', 'is', useFranchiseeStore().current.id],
                'AND', ['custrecord_service_customer.entitystatus', 'is', '13'],
                'AND', ['custrecord_service_category', 'is', '1'], // Service Category: Services (1)
            ],
        });
    }
};


export const useServiceStore = defineStore('services', {
    state: () => state,
    getters,
    actions,
});
