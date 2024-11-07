/**
 * @author Tim Nguyen
 * @description NetSuite Experimentation - Run Planner (Processor)
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @created 08/11/2024
 */

let NS_MODULES = {};

const moduleNames = ['render', 'file', 'runtime', 'search', 'record', 'url', 'format', 'email', 'task', 'log', 'https'];

// eslint-disable-next-line no-undef
define(moduleNames.map(item => 'N/' + item), (...args) => {
    for (let [index, moduleName] of moduleNames.entries())
        NS_MODULES[moduleName] = args[index];

    function getInputData() { // Processor should run at early hour of the day
        return {};
    }

    function map(context) {
        // const value = JSON.parse(context.value);

        NS_MODULES.log.debug('map', `key: ${context.key} | values: ${context.value}`)

    }

    function reduce(context) {
        // const value = JSON.parse(context.values);
        NS_MODULES.log.debug('reduce', `key: ${context.key} | values: ${context.values}`)

    }

    function summarize(context) {
        _.handleErrorIfAny(context);
        NS_MODULES.log.debug('summarize', 'done')
    }

    return {
        getInputData,
        map,
        reduce,
        summarize
    };
});

const _ = {
    handleErrorIfAny(summary) {
        let inputSummary = summary['inputSummary'];
        let mapSummary = summary['mapSummary'];
        let reduceSummary = summary['reduceSummary'];

        if (inputSummary.error)
            NS_MODULES.log.debug('INPUT_STAGE_FAILED', `${inputSummary.error}`)

        mapSummary.errors.iterator().each(function(key, value){
            NS_MODULES.log.debug(`MAP_STAGE_KEY_${key}_FAILED`, `Error was: ${JSON.parse(value + '').message}`)
            return true;
        });

        reduceSummary.errors.iterator().each(function(key, value){
            NS_MODULES.log.debug(`REDUCE_STAGE_KEY_${key}_FAILED`, `Error was: ${JSON.parse(value + '').message}`)
            return true;
        });
    },

    convertDateTimeToDateField(dateTimeObject) {
        if (Object.prototype.toString.call(dateTimeObject) !== '[object Date]')
            throw `Non-date object is given: ${dateTimeObject}`;

        let date = new Date(dateTimeObject.toISOString());
        date.setTime(date.getTime() + 11*60*60*1000); // forward 12 hours (AEST is about +10 or +11 UTC)

        return new Date(date.toISOString().replace('Z', ''));
    },
    getTodayDate() {
        let today = new Date();
        today.setTime(today.getTime() + 11*60*60*1000);
        return `${today.getDate()}/${today.getMonth()+1}/${today.getFullYear()}`
    }
}