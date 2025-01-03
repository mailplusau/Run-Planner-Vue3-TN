<script setup>
import { useDataImporter } from "@/stores/data-importer";

const dataImporter = useDataImporter();

function proceed() {
    dataImporter.importCSV();
}
</script>

<template>
    <v-dialog v-model="dataImporter.importDialog.open" width="550">
        <v-card color="background" class="pa-4">
            <v-file-input variant="outlined" color="primary" density="compact" prepend-icon="" hide-details
                          v-model="dataImporter.importDialog.csvFile"
                          accept=".csv, .xls, .xlsx"
                          placeholder="Select your files"
                          single-line
                          :clearable="false"
                          label="Select a spreadsheet file (.csv, .xls, .xlsx)">
                <template v-slot:append-inner>
                    <v-slide-x-reverse-transition>
                        <v-icon color="red" v-if="!!dataImporter.importDialog.csvFile" class="mr-2"
                                @click.stop="dataImporter.importDialog.csvFile = null">
                            mdi-trash-can-outline
                        </v-icon>
                    </v-slide-x-reverse-transition>
                    <v-slide-x-reverse-transition>
                        <v-btn color="green" size="small" v-if="!!dataImporter.importDialog.csvFile" @click.stop="proceed()">Import</v-btn>
                    </v-slide-x-reverse-transition>
                </template>
            </v-file-input>
        </v-card>
    </v-dialog>
</template>

<style scoped>

</style>