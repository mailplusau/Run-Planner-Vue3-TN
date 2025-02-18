import { defineStore } from 'pinia';
import http from "@/utils/http.mjs";
import { runPlan as runPlanFields } from "../../../netsuite-shared-modules/index.mjs";
import { useFranchiseeStore } from "@/stores/franchisees";
import { useServiceMap } from "@/stores/service-map";

const state = {
    all: [],
    busy: false,

    current: {
        id: null,
        details: {...runPlanFields},
        texts: {...runPlanFields},
    },

    crudDialog: {
        open: false,
        form: {
            id: null,
            name: '',
            custrecord_run_franchisee: '',
            custrecord_run_operator: '',
        }
    }
};

const getters = {
    ofCurrentFranchisee : state => useFranchiseeStore().current.id ? state.all.filter(item => item['custrecord_run_franchisee'] === useFranchiseeStore().current.id) : [],
};

const actions = {
    async init() {
        if (!top.location.href.includes('app.netsuite')) return;

        await _getAllActiveRunPlans(this);
    },
    async changeCurrentRunPlanId(id) {
        this.current.id = id;
        this.busy = true;

        const index = this.all.findIndex(item => item.internalid === id);

        if (index >= 0)
            for (let fieldId in runPlanFields) {
                this.current.details[fieldId] = this.all[index][fieldId];
                this.current.texts[fieldId] = this.all[index][fieldId + "_text"];
            }

        await useServiceMap().getRoutesAndMarkersOfSelectedRunPlan();

        this.busy = false;
    },
    async saveRunPlan(runPlanId, runPlanData) {
        await http.post('saveRunPlan', { runPlanId, runPlanData })
        await _getAllActiveRunPlans(this);
    }
};

async function _getAllActiveRunPlans(ctx) {
    ctx.all = await http.get('getActiveRunPlans') || [];
}

export const useRunPlanStore = defineStore('run-plans', {
    state: () => state,
    getters,
    actions,
});
