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
    async getCustomersOfCurrentFranchisee() {
        if (!useFranchiseeStore().current.id) return this.ofCurrentFranchisee.splice(0);

        this.ofCurrentFranchisee = await http.get('getCustomersByFilters', {
            filters: [
                ['partner', 'is', useFranchiseeStore().current.id],
                'AND',
                ['entitystatus', 'is', '13']
            ],
            additionalColumns: ['entityid', 'companyname', 'entitystatus'],
            overwriteColumns: true
        });
    }
};



export const useCustomerStore = defineStore('customers', {
    state: () => state,
    getters,
    actions,
});
