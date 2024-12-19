import { defineStore } from 'pinia';
import http from "@/utils/http.mjs";
import { useFranchiseeStore } from "@/stores/franchisees";

const state = {
    all: [],
};

const getters = {
    ofCurrentFranchisee : state => useFranchiseeStore().current.id ? state.all.filter(item => item['custrecord_operator_franchisee'] === useFranchiseeStore().current.id) : [],
};

const actions = {
    async init() {
        if (!top.location.href.includes('app.netsuite')) return;

        await _getAllActiveOperators(this);
    },
};

async function _getAllActiveOperators(ctx) {
    ctx.all = await http.get('getActiveOperators') || [];
}


export const useOperatorStore = defineStore('operators', {
    state: () => state,
    getters,
    actions,
});
