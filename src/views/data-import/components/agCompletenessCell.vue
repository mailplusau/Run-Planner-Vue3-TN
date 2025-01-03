<script setup>
import { computed } from "vue";

const props = defineProps(['params']);
const iconColor = computed(() => props.params.value ? 'primary' : 'red');
const iconName = computed(() => props.params.value ? 'mdi-check' : 'mdi-exclamation-thick');
</script>

<template>
    <v-icon :color="iconColor" small>{{ iconName }}</v-icon>
</template>

<style scoped>

</style>