import { defineStore } from 'pinia';
import { getWindowContext, VARS } from "@/utils/utils.mjs";
import { useGlobalDialog } from "@/stores/global-dialog";

const state = {
    pageTitle: VARS.pageTitle,

    testMode: false,

    dev: {
        sidebar: false,
    },
};

const getters = {

};

const actions = {
    async init() {
        if (this.testMode) await _readUrlParams(this);

        await useGlobalDialog().close(500, 'Load Complete!')
    },
};

async function _readUrlParams(ctx) {
    let currentUrl = getWindowContext().location.href;
    let [, queryString] = currentUrl.split('?');

    const params = new Proxy(new URLSearchParams(`?${queryString}`), {
        get: (searchParams, prop) => searchParams.get(prop),
    });

    ctx.testMode = !!params['test'];
}

export const useMainStore = defineStore('main', {
    state: () => state,
    getters,
    actions,
});
