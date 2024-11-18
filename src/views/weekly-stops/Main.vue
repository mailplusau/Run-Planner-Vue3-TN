<script setup>
import { useServiceStopStore } from "@/stores/service-stops";
import { computed } from "vue";

const serviceStopStore = useServiceStopStore();
const weeklyStops = computed(() => {

})
</script>

<template>
    <v-container fluid>
        <v-row>
            <v-col cols="12">
                <v-card color="background" class="elevation-10">

                    <v-toolbar color="primary" density="compact">
                        <span class="mx-4">Weekly Stops</span>

                        <v-divider vertical></v-divider>

                        <v-spacer></v-spacer>

                        <v-autocomplete label="Franchisee:" persistent-placeholder variant="filled" density="compact" hide-details color="white" class="mr-2"></v-autocomplete>
                    </v-toolbar>

                    <v-list bg-color="background" :style="{height: '85vh', 'overflow-y': 'scroll'}">
                        <template v-for="serviceDay in serviceStopStore.weeklyData">
                            <v-list-item class="text-primary text-subtitle-1 font-weight-bold">
                                {{serviceDay.date}}
                            </v-list-item>
                            <v-divider></v-divider>

                            <template v-for="serviceStop in serviceDay.stops">
                                <v-list-item>
                                    <template v-slot:prepend>
                                        <span class="mr-5 text-subtitle-2">{{ serviceStop.stopTime || serviceStop[0].stopTime}}</span>
                                        <v-icon size="small">mdi-map-marker</v-icon>
                                    </template>
                                    <v-list-item-title>
                                        {{ serviceStop.custrecord_1288_stop_name || serviceStop[0].custrecord_1288_stop_name }}
                                        <span class="text-blue">{{Array.isArray(serviceStop) ? '(shared stop)' : ''}}</span>
                                    </v-list-item-title>
                                    <v-list-item-subtitle>
                                        {{ serviceStop.addressType || serviceStop[0].addressType}}
                                    </v-list-item-subtitle>
                                </v-list-item>
                                <v-divider></v-divider>
                            </template>
                        </template>
                        <v-list-item>
                            <template v-slot:prepend>
                                <span class="mr-5">05:00</span>
                                <v-icon size="small">mdi-map-marker</v-icon>
                            </template>
                            <v-list-item-title>
                                MASCOT POST SHOP
                            </v-list-item-title>
                            <v-list-item-subtitle>
                                175 Pitt Street, Sydney NSW 2000
                            </v-list-item-subtitle>
                        </v-list-item>
                    </v-list>

<!--                    <v-virtual-scroll :items="serviceStopStore.weeklyData" max-height="100%">-->
<!--                        <template v-slot:default="{ item }">-->
<!--                            <div>-->
<!--                                Item: {{ item }}-->
<!--                            </div>-->
<!--                        </template>-->
<!--                    </v-virtual-scroll>-->
                </v-card>
            </v-col>
        </v-row>
    </v-container>
</template>

<style scoped>

</style>