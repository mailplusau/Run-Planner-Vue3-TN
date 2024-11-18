<script setup>
import { computed } from "vue";
import { useMainStore } from "@/stores/main";

const mainStore = useMainStore();

const tabItems = computed(() => Object.keys(mainStore.mainTabOptions).map(key => ({ ...mainStore.mainTabOptions[key], key })));
</script>

<template>
    <v-tabs v-model="mainStore.mainTab" :items="tabItems" color="secondary" slider-color="secondary" density="compact">
        <template v-slot:tab="{ item }">
            <v-tab :prepend-icon="item.icon"
                   :text="item.text"
                   :value="item.key"
                   class="text-none"
            ></v-tab>
        </template>
    </v-tabs>
</template>

<style scoped>

</style>