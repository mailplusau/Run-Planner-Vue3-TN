<script setup>
import { useDataImporter } from "@/stores/data-importer";

const props = defineProps(['params']);
const dataImporter = useDataImporter();

function deleteCell() {
    if (dataImporter.stopsToBeImported.length > 1)
        props.params.api.applyTransaction({ remove: [props.params.node.data]})
}
</script>

<template>
    <div>
        <v-btn size="x-small" icon="mdi-trash-can-outline" color="red" variant="plain" @click="deleteCell"></v-btn>
    </div>
</template>

<style scoped>

</style>