import { defineStore } from 'pinia';
import http from "@/utils/http.mjs";
import {franchisee as franchiseeFields} from 'netsuite-shared-modules';
import { useRunPlanStore } from "@/stores/run-plans";
import { useCustomerStore } from "@/stores/customers";
import { useServiceStore } from "@/stores/services";
import { useServiceStopStore } from "@/stores/service-stops";

const state = {
    all: [],
    busy: false,

    current: {
        id: null,
        details: {...franchiseeFields},
        texts: {...franchiseeFields},
    }
};

const getters = {

};

const actions = {
    async init() {
        if (!top.location.href.includes('app.netsuite')) return;

        await _getAllActiveFranchisees(this);
    },
    async changeCurrentFranchiseeId(id) {
        const index = this.all.findIndex(item => item.internalid === id);
        if (index < 0) return;

        const franchiseeIdChanged = this.current.id !== id;
        this.current.id = id;

        for (let fieldId in franchiseeFields) {
            this.current.details[fieldId] = this.all[index][fieldId];
            this.current.texts[fieldId] = this.all[index][fieldId + '_text'];
        }

        await Promise.allSettled([
            franchiseeIdChanged ? useRunPlanStore().changeCurrentRunPlanId(null) : null,
            useCustomerStore().getCustomersOfCurrentFranchisee(),
            useServiceStore().getServicesOfCurrentFranchisee(),
            useServiceStopStore().getServiceStopsOfCurrentFranchisee(),
        ])
    },
};

async function _getAllActiveFranchisees(ctx) {
    ctx.all = await http.get('getActiveFranchisees') || [];
}

export const useFranchiseeStore = defineStore('franchisees', {
    state: () => state,
    getters,
    actions,
});
