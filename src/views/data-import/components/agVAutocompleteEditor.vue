<script>
import { nextTick } from "vue";

export default {
    props: {
        params: Object
    },
    data: () => ({
        value: null,
        isMenuOpen: false,
    }),
    async mounted() {
        this.value = this.params.value;
        await nextTick();
        this.$refs.mainInput.focus();
        this.isMenuOpen = true;
    },
    methods: {
        getValue() {
            return this.value;
        },
    },
    computed: {
        modelValue: {
            get() {
                return this.params.value;
            },
            set(val) {
                this.value = val;
                this.params.stopEditing();
            }
        }
    }
}
</script>

<template>
    <v-card width="100%">
        <v-autocomplete density="compact" hide-details variant="outlined" color="primary"
                        class="ag-v-autocomplete"
                        :no-data-text="'No suggestion'"
                        :items="params['values']"
                        :menu-props="{contentClass: 'ag-v-autocomplete_v-list-item'}" v-model:menu="isMenuOpen"
                        ref="mainInput" v-model="modelValue">
        </v-autocomplete>
    </v-card>
</template>

<style>
.ag-v-autocomplete_v-list-item .v-list-item {
    min-height: 35px !important;
}
.ag-v-autocomplete_v-list-item .v-list-item-title {
    font-size: 12px !important;
}
div.ag-v-autocomplete div.v-field__input {
    font-size: 12px !important;
}
</style>