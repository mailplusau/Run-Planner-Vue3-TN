import { defineStore } from 'pinia';
import { getWindowContext, VARS } from "@/utils/utils.mjs";
import { useGlobalDialog } from "@/stores/global-dialog";
import { useFranchiseeStore } from "@/stores/franchisees";
import { useRunPlanStore } from "@/stores/run-plans";
import { useOperatorStore } from "@/stores/operators";
import { useDataStore } from "@/stores/data";

const state = {
    pageTitle: VARS.pageTitle,

    testMode: false,
    appBarExtended: false,

    mainTab: 'STOPS',
    mainTabOptions: {
        STOPS: {
            icon: 'mdi-message-processing-outline',
            text: 'Weekly Stops',
            value: 'STOPS',
            component: 'WeeklyStopView',
        },
        CUSTOMERS: {
            icon: 'mdi-email-multiple-outline',
            text: 'Customers',
            value: 'CUSTOMERS',
            component: 'CustomerView',
        },
        MAP: {
            icon: 'mdi-bell-outline',
            text: 'Service Map',
            value: 'MAP',
            component: 'ServiceMapView',
        },
        IMPORT: {
            icon: 'mdi-history',
            text: 'CSV Handling',
            value: 'IMPORT',
            component: 'DataImportView',
        },
    },

    dev: {
        sidebar: false,
    },
};

const getters = {

};

const actions = {
    async init() {
        if (this.testMode) await _readUrlParams(this);

        await Promise.allSettled([
            useFranchiseeStore().init(),
            useRunPlanStore().init(),
            useOperatorStore().init(),
            useDataStore().init(),
        ]);

        await useGlobalDialog().close(500, 'Load Complete!')
    },
    addShortcut() {
        if (top['addShortcut']) top['addShortcut']();
        else console.error('addShortcut function not found.')
    }
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
