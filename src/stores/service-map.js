import { defineStore } from 'pinia';
import { mapStyleJson } from "@/utils/defaults.mjs";

let directionsService, googleMap;

const state = {

};

const getters = {

};

const actions = {
    async init() {
        // if (!top.location.href.includes('app.netsuite')) return;

        console.log('init google map');
        const { Map } = await window['google']['maps']['importLibrary']("maps");

        googleMap = new Map(document.getElementById('google-map-container'), {
            gestureHandling: 'greedy',
            fullscreenControl: false,
            zoom: 10,
            center: {
                lat: -33.8685466,
                lng: 151.2054126
            },
            styles: mapStyleJson,
            mapTypeControlOptions: {
                style: 1, // google.maps.MapTypeControlStyle.HORIZONTAL_BAR
                position: 11, // google.maps.ControlPosition.BOTTOM_CENTER
            },
        });
    },
};


export const useServiceMap = defineStore('service-map', {
    state: () => state,
    getters,
    actions,
});
