import { defineStore } from 'pinia';
import http from "@/utils/http.mjs";
import { runPlan as runPlanFields } from "../../../netsuite-shared-modules/index.mjs";
import { useServiceStopStore } from "@/stores/service-stops";

const state = {
    all: [],
    busy: false,

    current: {
        id: null,
        details: {...runPlanFields},
        texts: {...runPlanFields},
    }
};

const getters = {

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
                this.current.texts[fieldId] = this.all[index][fieldId + '_text'];
            }

        if (index >= 0 || parseInt(id) === -1) await useServiceStopStore().init();

        if (id === null) useServiceStopStore().data.splice(0);

        this.busy = false;
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
