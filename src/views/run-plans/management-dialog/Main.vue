<script setup>
import { computed, ref, watch } from "vue";
import { useRunPlanStore } from "@/stores/run-plans";
import { rules } from "@/utils/utils.mjs";
import { useGlobalDialog } from "@/stores/global-dialog";
import { useFranchiseeStore } from "@/stores/franchisees";
import { useOperatorStore } from "@/stores/operators";

const { validate } = rules;
const globalDialog = useGlobalDialog();
const runPlanStore = useRunPlanStore();
const franchiseeStore = useFranchiseeStore();
const operatorStore = useOperatorStore();
const dialogMode = ref('view');
const runPlanForm = ref();
const searchTerm = ref('');
const runPlans = computed(() => runPlanStore.ofCurrentFranchisee
    .filter(item => searchTerm.value ? item.name.toLowerCase().includes(searchTerm.value['toLowerCase']()) : true))

function resetForm() {
    runPlanStore.crudDialog.form.id = null;
    runPlanStore.crudDialog.form.name = '';
    runPlanStore.crudDialog.form.custrecord_run_operator = '';
    runPlanStore.crudDialog.form.custrecord_run_franchisee = '';
}

function edit(runPlan) {
    runPlanStore.crudDialog.form.id = runPlan['internalid'];
    runPlanStore.crudDialog.form.name = runPlan['name'];
    runPlanStore.crudDialog.form.custrecord_run_operator = runPlan['custrecord_run_operator'];
    runPlanStore.crudDialog.form.custrecord_run_franchisee = runPlan['custrecord_run_franchisee'];
    dialogMode.value = 'crud';
}

async function saveForm() {
    let res = await runPlanForm.value['validate']();
    if (!res.valid) return console.log('Fix the errors');

    globalDialog.displayProgress('', 'Saving run plan. Please wait...');
    const runPlanData = JSON.parse(JSON.stringify(runPlanStore.crudDialog.form));
    const runPlanId = runPlanStore.crudDialog.form.id;
    delete runPlanData.id;

    await runPlanStore.saveRunPlan(runPlanId, runPlanData);
    globalDialog.close(1000, 'Complete!').then();
    resetForm()
    dialogMode.value = 'view';
}

watch(() => runPlanStore.crudDialog.open, val => {
    if (val) dialogMode.value = 'view';
})
</script>

<template>
    <v-dialog v-model="runPlanStore.crudDialog.open" width="700">
        <v-card color="background" style="overflow: hidden">
            <v-toolbar color="primary" density="compact">
                <span class="mx-4">
                    <b v-if="dialogMode === 'view'">Manage Run Plans</b>
                    <b v-else-if="dialogMode === 'crud' && runPlanStore.crudDialog.form.id">Edit Run Plan #{{runPlanStore.crudDialog.form.id}}</b>
                    <b v-else-if="dialogMode === 'crud'">Create New Run Plan</b>
                </span>

                <v-divider vertical></v-divider>

                <u class="ml-4 text-caption text-secondary">{{ franchiseeStore.current.details.companyname }}</u>

                <v-spacer></v-spacer>

                <v-btn v-if="dialogMode !== 'crud'" color="green" variant="elevated" class="ml-2" size="small"
                       @click="() => { resetForm(); dialogMode = 'crud'; }">New Run Plan</v-btn>
                <v-btn v-if="dialogMode !== 'view'" color="green" variant="elevated" class="ml-2" size="small"
                       @click="dialogMode = 'view'">Manage Run Plans</v-btn>
                <v-btn color="red" variant="elevated" class="mx-2" size="small"
                       @click="runPlanStore.crudDialog.open = false">Close</v-btn>
            </v-toolbar>

            <v-expansion-panels v-model="dialogMode" variant="accordion">
                <v-expansion-panel :value="'view'">
                    <v-expansion-panel-text class="bg-background pa-0">
                        <v-list-item class="my-2 px-3">
                            <v-text-field variant="outlined" hide-details density="compact" color="primary"
                                          v-model="searchTerm"
                                          placeholder="Search for run plan..." persistent-placeholder
                                          clearable prepend-inner-icon="mdi-magnify"></v-text-field>
                        </v-list-item>
                        <v-divider></v-divider>
                        <v-list-item class="my-2 px-3 text-center" v-if="!runPlans.length">
                            No Run Plan to Show
                        </v-list-item>

                        <v-virtual-scroll :items="runPlans" height="500">
                            <template v-slot:default="{ item }">
                                <v-list-item class="my-2">
                                    <template v-slot:prepend>
                                        <v-icon>mdi-truck-check-outline</v-icon>
                                    </template>

                                    <v-list-item-title>{{ item.name }}</v-list-item-title>
                                    <v-list-item-subtitle class="text-caption">
                                        <b>Franchisee: </b><u>{{item['custrecord_run_franchisee_text']}}</u>
                                    </v-list-item-subtitle>
                                    <v-list-item-subtitle class="text-caption">
                                        <b>Operator: </b>
                                        <span v-if="!item['custrecord_run_operator_text']" class="text-red">Unknown</span>
                                        <u v-else>{{item['custrecord_run_operator_text']}}</u>
                                    </v-list-item-subtitle>

                                    <template v-slot:append>
                                        <v-btn size="x-small" variant="outlined" icon="mdi-pencil" color="primary" class="mx-1" @click="edit(item)"></v-btn>
                                        <v-btn size="x-small" variant="outlined" icon="mdi-trash-can-outline" color="red" class="mx-1"></v-btn>
                                    </template>
                                </v-list-item>
                                <v-divider></v-divider>
                            </template>
                        </v-virtual-scroll>
                    </v-expansion-panel-text>
                </v-expansion-panel>

                <v-expansion-panel :value="'crud'">
                    <v-expansion-panel-text class="bg-background">
                        <v-form class="v-row justify-center mt-1" ref="runPlanForm">
                            <v-col cols="6">
                                <v-text-field prefix="Run Plan Name:" density="compact" color="primary" variant="outlined" persistent-placeholder
                                              v-model="runPlanStore.crudDialog.form.name"
                                              :rules="[v => validate(v, 'required')]"></v-text-field>
                            </v-col>
                            <v-col cols="6">
                                <v-autocomplete prefix="Franchisee:" density="compact" color="primary" variant="outlined" persistent-placeholder
                                                v-model="runPlanStore.crudDialog.form.custrecord_run_franchisee"
                                                :items="franchiseeStore.all" item-value="internalid" item-title="companyname"
                                                :rules="[v => validate(v, 'required')]"></v-autocomplete>
                            </v-col>
                            <v-col cols="12">
                                <v-autocomplete prefix="Operator:" density="compact" color="primary" variant="outlined" persistent-placeholder
                                                v-model="runPlanStore.crudDialog.form.custrecord_run_operator"
                                                :items="operatorStore.all.map(item => ({...item, name: `${item.name} (${item['custrecord_operator_franchisee_text']})`}))"
                                                item-value="internalid" item-title="name"
                                                :rules="[v => validate(v, 'required')]"></v-autocomplete>
                            </v-col>
                            <v-col cols="auto">
                                <v-btn class="mx-2" @click="dialogMode = 'view'">Cancel</v-btn>
                                <v-btn class="mx-2" color="green" @click="saveForm()">Save Run Plan</v-btn>
                            </v-col>
                        </v-form>
                    </v-expansion-panel-text>
                </v-expansion-panel>
            </v-expansion-panels>
        </v-card>
    </v-dialog>
</template>

<style scoped>

</style>