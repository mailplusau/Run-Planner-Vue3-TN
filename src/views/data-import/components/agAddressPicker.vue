<script>
import { debounce } from "@/utils/utils.mjs";
import http from "@/utils/http.mjs";
import { nextTick } from "vue";
import { useDataImporter } from "@/stores/data-importer";

export default {
    data: () => ({
        value: null,
        searchInput: '',
        loading: false,
        locationsByName: [],
        isMenuOpen: false,
    }),
    created() {
        this.dataImporter = useDataImporter();
        this.debouncedSearchInputChanged = debounce(async (rawInput) => {
            console.log('debouncedSearchInputChanged')
            this.loading = true;
            const magic = (input) => input.toLowerCase().replaceAll(/\W+/gi, '|');
            let locations = await http.get('getLocationsByNearestName', {locationName: this.searchInput})

            if (Array.isArray(locations))
                this.locationsByName = locations.sort((a, b) => {
                    let aCase = magic(a.address.formatted).includes(magic(this.searchInput)) ? 0 : 1;
                    let bCase = magic(b.address.formatted).includes(magic(this.searchInput)) ? 0 : 1;
                    return aCase - bCase;
                });
            this.loading = false;
            this.isMenuOpen = true;
        }, 1000, {leading: false, trailing: true});
    },
    mounted() {
        this.value = this.params.value;
        nextTick(() => {
            this.$refs.mainInput.focus();
            this.isMenuOpen = true;
        })
    },
    methods: {
        getValue() {
            return this.value;
        },
        addLocationToCache(selectedVal) {
            let [addressType, addressId] = selectedVal.split('|');
            let locations = [...this.locationsByName, ...this.addressAnalysisResults];
            let index = locations.findIndex(item => item.addressId === addressId);
            if (parseInt(addressType) === 3 && index >= 0)
                this.dataImporter.locationsById[addressId] = [locations[index]]
        },
    },
    computed: {
        modelValue: {
            get() {
                return this.params.value;
            },
            set(val) {
                this.addLocationToCache(val);
                this.value = val;
                this.params.stopEditing();
            }
        },
        addressAnalysisResults() {
            let results = this.params?.data?.addressAnalysis?.similarities;
            return results && Array.isArray(results) ? results : [];
        },
        addressesOfCustomer() {
            return this.dataImporter.addressBooksByCustomerId[this.params?.data?.custrecord_1288_customer] || []
        },
        suggestions() {
            let data = [];

            if (this.searchInput) {
                data.push(...this.locationsByName.map(result => ({
                    value: `${result.addressType}|${result.addressId}`,
                    title: result.address.formatted
                })));
            } else if (this.addressAnalysisResults.length) {
                data.push(...this.addressAnalysisResults.map(result => ({
                    value: result.addressType + '|' + result.addressId,
                    title: `(${Math.ceil(parseFloat(result.similarity) * 10000) / 100}%) ${result.address.formatted}`
                })));
            } else
                data.push(...this.addressesOfCustomer?.map(address => ({value: '2|' + address['internalid'], title: address['fullAddress']})))

            return data;
        }
    },
    watch: {
        searchInput(val) {
            console.log(val)
            val && this.debouncedSearchInputChanged(val)
        },
    },
}

</script>

<template>
    <v-card width="100%">
        <v-autocomplete density="compact" hide-details variant="outlined" color="primary" auto-select-first
                        :loading="loading" :readonly="loading" class="ag-v-autocomplete"
                        :no-data-text="loading ? 'Loading...' : 'No suggestion'" no-filter
                        :items="suggestions" @update:search="v => searchInput = v"
                        :menu-props="{contentClass: 'ag-v-autocomplete_v-list-item'}" v-model:menu="isMenuOpen"
                        ref="mainInput" v-model="modelValue">
        </v-autocomplete>
    </v-card>
</template>

<style>
.ag-v-autocomplete_v-list-item .v-list-item {
    min-height: 10px !important;
}
.ag-v-autocomplete_v-list-item .v-list-item-title {
    font-size: 12px !important;
}
div.ag-v-autocomplete div.v-field__input {
    font-size: 12px !important;
}
</style>