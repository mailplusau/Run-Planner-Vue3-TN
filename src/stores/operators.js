import { defineStore } from 'pinia';
import http from "@/utils/http.mjs";

const state = {
    all: [],
};

const getters = {

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
