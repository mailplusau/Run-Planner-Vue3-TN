<script setup>
import {nextTick, onMounted, ref, watch} from 'vue';

const model = defineModel({
    required: true,
});

const props = defineProps({
    disabled: {
        type: Boolean,
        default: false,
    }
});

const dialogOpen = ref(false);
const hours = ref('04');
const minutes = ref('00');
const displayValue = ref('04:00 AM');

onMounted(() => {
    parseModel();
})

function onBlur() {
    nextTick(() => {
        hours.value = `${hours.value < 0 ? 0 : (hours.value <= 23 ? parseInt(hours.value) : 23)}`.padStart(2, '0');
        minutes.value = `${minutes.value < 0 ? 0 : (minutes.value <= 59 ? parseInt(minutes.value) : 59)}`.padStart(2, '0');
    })
}

function onFocus(e) {
    e.srcElement.select();
}

function save() {
    model.value = `${hours.value}:${minutes.value}`;
    displayValue.value = `${hours.value}:${minutes.value}`;
    dialogOpen.value = false;
}

function parseModel() {
    if (!/^\d+:\d+$/i.test(`${model.value}`)) return;
    let [hour, minute] = `${model.value}`.split(':');
    hours.value = hour;
    minutes.value = minute;
    onBlur();
    displayValue.value = `${hours.value}:${minutes.value}`;
}

let incrementHourInterval = null;
function incrementHourInput(step = 1, mouseDown = true) {
    const increment = () => {
        let nextVal = parseInt(hours.value) + step
        if (nextVal > 23) nextVal = 0;
        if (nextVal < 0) nextVal = 23;
        hours.value = `${nextVal}`;
        onBlur();
    }

    if (mouseDown) {
        increment()
        incrementHourInterval = setInterval(increment, 100);
    } else clearInterval(incrementHourInterval);
}

let incrementMinuteInterval = null;
function incrementMinuteInput(step = 1, mouseDown = true) {
    const increment = () => {
        let nextVal = parseInt(minutes.value) + step;
        if (nextVal > 59) nextVal = 0;
        if (nextVal < 0) nextVal = 59;
        minutes.value = `${nextVal}`;
        onBlur();
    }

    if (mouseDown) {
        increment()
        incrementMinuteInterval = setInterval(increment, 100);
    } else clearInterval(incrementMinuteInterval);
}

watch(model, () => { parseModel(); })
</script>

<template>
    <v-dialog v-model="dialogOpen">
        <template v-slot:activator="{ props: activatorProps }">
            <slot name="activator" :activatorProps="props.disabled ? null : activatorProps" :displayValue="displayValue"></slot>
        </template>

        <v-card width="250" class="v-container v-container--fluid pa-0" color="background">
            <v-row justify="center" align="center" no-gutters class="py-3">
                <v-col cols="11" class="text-primary mb-3 text-center">Select a time:</v-col>
                <v-col cols="auto">
                    <v-btn size="x-small" block variant="plain" class="my-2"
                           @mousedown="incrementHourInput()" @mouseup="incrementHourInput(1, false)">
                        <v-icon size="25">mdi-chevron-up</v-icon>
                    </v-btn>
                    <input type="number" min="0" max="23" step="1" id="hourInput" class="no-spinners time-input" size="50" v-model="hours" @blur="onBlur" @focus="onFocus">
                    <v-btn size="x-small" block variant="plain" class="my-2"
                           @mousedown="incrementHourInput(-1)" @mouseup="incrementHourInput(-1, false)">
                        <v-icon size="25">mdi-chevron-down</v-icon>
                    </v-btn>
                </v-col>
                <span class="mx-4" style="font-size: 30px">:</span>
                <v-col cols="auto">
                    <v-btn size="x-small" block variant="plain" class="my-2"
                           @mousedown="incrementMinuteInput()" @mouseup="incrementMinuteInput(1, false)">
                        <v-icon size="25">mdi-chevron-up</v-icon>
                    </v-btn>
                    <input type="number" min="0" max="59" step="1" id="minuteInput" class="no-spinners time-input" size="50" v-model="minutes" @blur="onBlur" @focus="onFocus">
                    <v-btn size="x-small" block variant="plain" class="my-2"
                           @mousedown="incrementMinuteInput(-1)" @mouseup="incrementMinuteInput(-1, false)">
                        <v-icon size="25">mdi-chevron-down</v-icon>
                    </v-btn>
                </v-col>
                <v-col cols="11" class="mt-3">
                    <v-btn color="green" block @click="save">save</v-btn>
                </v-col>
            </v-row>
        </v-card>
    </v-dialog>
</template>

<style scoped>
.no-spinners {
    -moz-appearance: textfield;
}

.no-spinners::-webkit-outer-spin-button,
.no-spinners::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
}

.time-input {
    border: none;
    text-align: center;
    width: 40px;
    font-size: 30px;
}
.time-input:focus {
    border: none;
    outline: none;
}
</style>