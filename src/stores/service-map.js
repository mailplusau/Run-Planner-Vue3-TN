import { defineStore } from 'pinia';
import { mapStyleJson } from "@/utils/defaults.mjs";
import {addDays, format, getDay} from 'date-fns';
import { useServiceStopStore } from "@/stores/service-stops";
import { useAddressStore } from "@/stores/addresses";
import { mapPinColorOptions } from "@/utils/defaults.mjs";
import { waitMilliseconds } from "@/utils/utils.mjs";
import http from "@/utils/http.mjs";
import { useGlobalDialog } from "@/stores/global-dialog";

let directionsService, googleMap;
let serviceDaysOfWeekData = [], territories = [];

const baseUrl = 'https://' + import.meta.env.VITE_NS_REALM + '.app.netsuite.com';
const mapCenterTextDisplayId = 'custom_map_control_text_display'
let mapCenterTextDisplayElement;

const state = {
    serviceDaysOfWeek: [],
    globalDialogMsg: '',
    mapBusy: false,
    routeColors: [
        "#FF5733",
        "#006232",
        "#337aff",
        "#da33ff",
        "#790d0d"
    ],
    waypointInfoDialog: {
        open: false,
        data: {},
    },
    settingsPanel: {
        open: false,
        dataLoading: false,
        selectedDays: [],
        territoryMarkings: {
            show: false,
            processing: false,
        }
    }
};

const getters = {

};

const actions = {
    async init() {
        // if (!top.location.href.includes('app.netsuite')) return;

        const { Map } = await window['google']['maps']['importLibrary']("maps");
        directionsService = new window['google']['maps']['DirectionsService']();

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
    async getRoutesAndMarkersOfSelectedRunPlan() {
        this.mapBusy = true;
        mapUtils.displayMsgOnMap('Loading routes. Please wait... ');
        mapUtils.cleanUp();

        let today = getDay(new Date());

        this.serviceDaysOfWeek = [ // A light weight reactive version of the real data array
            { day: 1, date: format(addDays(new Date(), 1 - today), "EEEE (dd/MM/yyyy)") },
            { day: 2, date: format(addDays(new Date(), 2 - today), "EEEE (dd/MM/yyyy)") },
            { day: 3, date: format(addDays(new Date(), 3 - today), "EEEE (dd/MM/yyyy)") },
            { day: 4, date: format(addDays(new Date(), 4 - today), "EEEE (dd/MM/yyyy)") },
            { day: 5, date: format(addDays(new Date(), 5 - today), "EEEE (dd/MM/yyyy)") },
            // { day: 6, date: 'ADHOC' },
        ];

        serviceDaysOfWeekData = JSON.parse(JSON.stringify(useServiceStopStore().weeklyData));

        if (!Array.isArray(serviceDaysOfWeekData)) return;

        let totalProgress = serviceDaysOfWeekData.length;
        let progressed = 0;
        for (let weekDay of serviceDaysOfWeekData) totalProgress += weekDay.stops.length;

        mapUtils.displayMsgOnMap('Loading routes... ' + (Math.floor((progressed/totalProgress) * 10000))/100 + '%');

        for (let weekDay of serviceDaysOfWeekData) {
            // Clean up google map data if any
            this.settingsPanel.selectedDays.splice(0, Infinity, today);

            if (!weekDay.stops.length) continue;

            let mapMarkers = [];

            for (let [index, stop] of weekDay.stops.entries()) {
                let stopObject = Array.isArray(stop) ? stop[0] : stop;

                // populate address object
                stopObject.addressObj = useAddressStore().findCacheByStopObj(stopObject);

                let latLngObject = new window['google']['maps']['LatLng'](stopObject.addressObj.lat, stopObject.addressObj.lng);

                // create map markers
                let newMapMarker = new google.maps.Marker({
                    position: latLngObject,
                    title: `Address: ${stopObject.addressObj.formatted} | Stop Time: ${stopObject.stopTime}`,
                    icon: mapUtils.getPinSymbol(mapPinColorOptions[parseInt(stopObject.custrecord_1288_address_type) - 1]),
                    label: {
                        text: `${index + 1}`,
                        color: 'white',
                        fontSize: '15px',
                    }
                });

                newMapMarker['addListener']('click', () => { // click event on the marker
                    mapUtils.displayWaypointInfo(stop);
                })

                mapMarkers.push(newMapMarker);
                progressed++;
                mapUtils.displayMsgOnMap('Loading routes... ' + (Math.floor((progressed/totalProgress) * 10000))/100 + '%');
            }

            weekDay.mapMarkers = mapMarkers;

            // build request object for Directions Service

            progressed++;
            mapUtils.displayMsgOnMap('Loading routes... ' + (Math.floor((progressed/totalProgress) * 10000))/100 + '%');
        }

        mapUtils.displayMsgOnMap('All routes loaded... ' + (Math.floor((progressed/totalProgress) * 10000))/100 + '%');

        await waitMilliseconds(1000);
        this.handleSelectedWeekDaysChanged();

        this.mapBusy = false;
        mapUtils.displayMsgOnMap('');
    },
    async getTerritoryMap() {
        let json = await http.get('getTerritoryPolygons');
    
        if (!json?.features || !Array.isArray(json?.features)) return;
    
        for (let feature of json.features) {
            if (!feature?.['geometry']?.['coordinates']?.length || !feature?.['properties']?.['Name']) continue;
    
            let invalidCoords = false;
            let paths = feature?.['geometry']?.['coordinates'][0].map(item => {
                let [lng, lat] = item;
                if (isNaN(lng) || isNaN(lat)) invalidCoords = true
                return isNaN(lng) || isNaN(lat) ? null : new google.maps.LatLng(lat, lng);
            })
    
            if (invalidCoords) continue;
    
            let territoryName = `${feature['properties']['Territory'] || feature['properties']['Name']} (${feature['properties']['State']})`
    
            let polygon = new google.maps.Polygon({
                paths,
                strokeColor: "#ff0000",
                strokeOpacity: 0.2,
                strokeWeight: 2,
                fillColor: "#ff5959",
                fillOpacity: 0.1,
            });
    
            polygon.addListener('mouseover', () => {
                mapUtils.displayMsgOnMap(`Territory: ${territoryName}`)
                polygon['setOptions']({strokeOpacity: 0.1});
                polygon['setOptions']({fillOpacity: 0.5});
            });
    
            polygon.addListener('mouseout', () => {
                mapUtils.displayMsgOnMap('')
                polygon['setOptions']({strokeOpacity: 0.2});
                polygon['setOptions']({fillOpacity: 0.1});
            });
    
            territories.push({
                text: territoryName,
                ...feature['properties'],
                polygon
            })
        }
    },

    showTerritoryMarkings(show = true) {
        this.settingsPanel.territoryMarkings.processing = true;
        this.settingsPanel.territoryMarkings.show = show;

        for (let territory of territories)
            territory.polygon['setMap'](show ? googleMap : null);

        this.settingsPanel.territoryMarkings.processing = false;
    },
    handleSelectedWeekDaysChanged() {
        for (let [index, weekDay] of serviceDaysOfWeekData.entries()) {
            if (!Array.isArray(weekDay.mapMarkers)) continue;

            // Set map for markers
            for (let marker of weekDay.mapMarkers)
                marker['setMap'](this.settingsPanel.selectedDays.includes(index + 1) ? googleMap : null);

            // Set map for renders
            if (weekDay['visuals']) {
                for (let visual of weekDay['visuals']) {
                    visual['setMap'](this.settingsPanel.selectedDays.includes(index + 1) ? googleMap : null);
                }
            }
        }
    },
};

const mapUtils = {
    cleanUp() {
        // clean up previous data if any
        for (let weekDay of serviceDaysOfWeekData) {
            if (weekDay.mapMarkers) for (let marker of weekDay.mapMarkers) marker['setMap'](null);

            if (weekDay['visuals'])
                for (let visual of weekDay['visuals'])
                    visual['setMap'](null);
        }
    },
    displayWaypointInfo(stop) {
        console.log('should display info for stop:', stop);
        let stopObject = Array.isArray(stop) ? stop[0] : stop;

        let customerList = '';

        if (!Array.isArray(stop))
            customerList = `<p class="my-1"><b>Customer:</b> <a target="_blank" href="${baseUrl}/app/common/entity/custjob.nl?id=${stopObject.custrecord_1288_customer}">${formatCustomerName(stopObject.custrecord_1288_customer_text)}</a></p>`
        else {
            let ul = stop.map(item => `<li><a target="_blank" href="${baseUrl}/app/common/entity/custjob.nl?id=${item.custrecord_1288_customer}">${formatCustomerName(item.custrecord_1288_customer_text)}</a></li>`);
            customerList = `<p class="my-1"><b>Customers <span class="blue--text">(shared)</span>:</b></p><ul>${ul.join('')}</ul>`
        }

        useGlobalDialog().displayInfo(
            `${stopObject.custrecord_1288_stop_name}`,
            `
                <p class="my-1"><b>Address:</b> ${stopObject.addressObj.formatted}</p>
                <p class="my-1"><b>Service name:</b> ${stopObject.custrecord_1288_service_text}</p>
                <p class="my-1"><b>Stop time:</b> ${stopObject.stopTime}</p>
                <p class="my-1"><b>Notes:</b> ${stopObject.custrecord_1288_notes || 'None provided'}</p>
                ${customerList}
            `, false, [
                'spacer',
                {
                    text: 'okay',
                    color: 'green darken-1',
                },
        ])
    },
    displayMsgOnMap(message = '') {
        if (!googleMap) return;

        googleMap.controls[2].clear(); // google.maps.ControlPosition.TOP_CENTER = 2

        if (!message) return;

        if (!mapCenterTextDisplayElement) {
            mapCenterTextDisplayElement = document.createElement("div");

            // Set CSS for the control.
            mapCenterTextDisplayElement.id = mapCenterTextDisplayId;
            mapCenterTextDisplayElement.style.backgroundColor = "#fff";
            mapCenterTextDisplayElement.style.border = "2px solid #fff";
            mapCenterTextDisplayElement.style.borderRadius = "5px";
            mapCenterTextDisplayElement.style.boxShadow = "0 2px 6px rgba(0,0,0,.3)";
            mapCenterTextDisplayElement.style.color = "rgb(25,25,25)";
            mapCenterTextDisplayElement.style.fontFamily = "Roboto,Arial,sans-serif";
            mapCenterTextDisplayElement.style.fontSize = "16px";
            mapCenterTextDisplayElement.style.lineHeight = "38px";
            mapCenterTextDisplayElement.style.margin = "10px 0 22px";
            mapCenterTextDisplayElement.style.padding = "0 15px";
            mapCenterTextDisplayElement.style.textAlign = "center";
            mapCenterTextDisplayElement.style.pointerEvents = "none";
        }

        mapCenterTextDisplayElement.textContent = message;

        googleMap.controls[2].push(mapCenterTextDisplayElement); // google.maps.ControlPosition.TOP_CENTER = 2
    },
    getPinSymbol(color) {
        return {
            // path: 'M8,0C3.400,0,0,3.582,0,8s8,24,8,24s8-19.582,8-24S12.418,0,8,0z M8,12c-2.209,0-4-1.791-4-4   s1.791-4,4-4s4,1.791,4,4S10.209,12,8,12z',
            path: 'M 0,0 C -2,-20 -10,-22 -10,-30 A 10,10 0 1,1 10,-30 C 10,-22 2,-20 0,0 z',
            fillOpacity: 1,
            strokeColor: "#173600",
            strokeWeight: 1,
            labelOrigin: new google.maps.Point(0, -29),
            anchor: new google.maps.Point(0, 0),
            fillColor: color,
            scale: 1
        };
    }
}

function formatCustomerName(name) {
    let formattedName = name;
    if (name.indexOf('- Parent') >= 1) formattedName = name.substring(0, name.indexOf('- Parent') - 1)
    let firstWhiteSpace = formattedName.indexOf(' ');
    if (!isNaN(parseInt(formattedName.substring(0, firstWhiteSpace)))) formattedName = formattedName.substring(firstWhiteSpace + 1);
    return formattedName;
}


export const useServiceMap = defineStore('service-map', {
    state: () => state,
    getters,
    actions,
});
