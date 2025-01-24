/**
 * @author Tim Nguyen
 * @description NetSuite Experimentation - Run Planner
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @created 18/10/2024
 */

import { _parseCustomerAddress, _parseNCLocation, VARS } from "@/utils/utils.mjs";
import {
    address as addressFieldIds,
    addressSublist as addressSublistFieldIds,
    serviceStop as serviceStopFields,
    getFranchiseesByFilters, getCustomersByFilters, getOperatorsByFilters, getServicesByFilters,
    getRunPlansByFilters, getServiceStopsByFilters, getLocationsByFilters, getCustomersAddresses, getCustomListData,
} from "netsuite-shared-modules";

// These variables will be injected during upload. These can be changed under 'netsuite' of package.json
let htmlTemplateFilename;
let clientScriptFilename;

const defaultTitle = VARS.pageTitle;

let NS_MODULES = {};


// eslint-disable-next-line no-undef
define(['N/ui/serverWidget', 'N/render', 'N/search', 'N/file', 'N/log', 'N/record', 'N/email', 'N/runtime', 'N/https', 'N/task', 'N/format', 'N/url'],
    (serverWidget, render, search, file, log, record, email, runtime, https, task, format, url) => {
        NS_MODULES = {serverWidget, render, search, file, log, record, email, runtime, https, task, format, url};

        const onRequest = ({request, response}) => {
            if (request.method === "GET") {

                if (!_.handleGETRequests(request.parameters['requestData'], response)){
                    // Render the page using either inline form or standalone page
                    if (request.parameters['standalone']) _.getStandalonePage(response)
                    else _.getInlineForm(response)
                }

            } else if (request.method === "POST") { // Request method should be POST (?)
                _.handlePOSTRequests(JSON.parse(request.body), response);
                // _writeResponseJson(response, {test: 'test response from post', params: request.parameters, body: request.body});
            } else log.debug({ title: "request method type", details: `method : ${request.method}` });

        }

        const _ = {
            // Render the htmlTemplateFile as a standalone page without any of NetSuite's baggage. However, this also means no
            // NetSuite module will be exposed to the Vue app. Thus, an api approach using Axios and structuring this Suitelet as
            // a http request handler will be necessary. For reference:
            // https://medium.com/@vladimir.aca/how-to-vuetify-your-suitelet-on-netsuite-part-2-axios-http-3e8e731ac07c
            getStandalonePage(response) {
                let {file} = NS_MODULES;

                // Get the id and url of our html template file
                const htmlFileData = this.getHtmlTemplate(htmlTemplateFilename);

                // Load the  html file and store it in htmlFile
                const htmlFile = file.load({id: htmlFileData[htmlTemplateFilename].id});

                response.write(htmlFile['getContents']());
            },
            // Render the page within a form element of NetSuite. This can cause conflict with NetSuite's stylesheets.
            getInlineForm(response) {
                let {serverWidget} = NS_MODULES;

                // Create a NetSuite form
                let form = serverWidget['createForm']({ title: defaultTitle });

                // Retrieve client script ID using its file name.
                form.clientScriptFileId = this.getHtmlTemplate(clientScriptFilename)[clientScriptFilename].id;

                response['writePage'](form);
            },
            // Search for the ID and URL of a given file name inside the NetSuite file cabinet
            getHtmlTemplate(htmlPageName) {
                let {search} = NS_MODULES;

                const htmlPageData = {};

                search.create({
                    type: 'file',
                    filters: ['name', 'is', htmlPageName],
                    columns: ['name', 'url']
                }).run().each(resultSet => {
                    htmlPageData[resultSet['getValue']({ name: 'name' })] = {
                        url: resultSet['getValue']({ name: 'url' }),
                        id: resultSet['id']
                    };
                    return true;
                });

                return htmlPageData;
            },
            handleGETRequests(request, response) {
                if (!request) return false;

                try {
                    let {operation, requestParams} = this.validateRequest('GET', request);

                    if (operation === 'getIframeContents') this.getIframeContents(response);
                    else getOperations[operation](response, requestParams);
                } catch (e) {
                    NS_MODULES.log.debug({title: "_handleGETRequests", details: `error: ${e}`});
                    this.handleError(request, e)
                    _writeResponseJson(response, {error: `${e}`})
                }

                return true;
            },
            handlePOSTRequests(request, response) {
                if (!request) return;

                let {operation, requestParams} = this.validateRequest('POST', request);
                try {

                    postOperations[operation](response, requestParams);
                } catch (e) {
                    NS_MODULES.log.debug({title: "_handlePOSTRequests", details: `error: ${e}`});
                    this.handleError(JSON.stringify(request), e)
                    _writeResponseJson(response, {error: `${e}`})
                }
            },
            getIframeContents(response) {
                const htmlFileData = this.getHtmlTemplate(htmlTemplateFilename);
                const htmlFile = NS_MODULES.file.load({ id: htmlFileData[htmlTemplateFilename].id });

                _writeResponseJson(response, htmlFile['getContents']());
            },
            validateRequest(method, request) {
                let {operation, requestParams} = method === 'POST' ? request : JSON.parse(request);
                if (!operation) throw 'No operation specified.';

                if (method === 'POST' && !postOperations[operation]) throw `POST operation [${operation}] is not supported.`;
                else if (method === 'GET' && !getOperations[operation] && operation !== 'getIframeContents')
                    throw `GET operation [${operation}] is not supported.`;

                return {operation, requestParams};
            },
            handleError(request, e) {
                try {
                    const currentScript = NS_MODULES.runtime['getCurrentScript']();
                    NS_MODULES.email['sendBulk'].promise({
                        author: 112209,
                        body: `User: ${JSON.stringify(NS_MODULES.runtime['getCurrentUser']())}<br><br>Incoming request data: ${request}<br><br>Stacktrace: ${e}`,
                        subject: `[ERROR][SCRIPT=${currentScript.id}][DEPLOY=${currentScript.deploymentId}]`,
                        recipients: ['tim.nguyen@mailplus.com.au'],
                        isInternalOnly: true
                    });
                    NS_MODULES.log.error('Error handled', `${e}`);
                } catch (error) { NS_MODULES.log.error('failed to handle error', `${error}`); }
            }
        }

        return {onRequest};
    });

function _writeResponseJson(response, body) {
    response['addHeader']({name: 'Content-Type', value: 'application/json; charset=utf-8'});
    response.write({ output: JSON.stringify(body) });
}


const getOperations = {
    'getCurrentUserDetails' : function (response) {
        let user = {
            role: NS_MODULES.runtime['getCurrentUser']().role,
            id: NS_MODULES.runtime['getCurrentUser']().id,
            name: NS_MODULES.runtime['getCurrentUser']().name,
        };
        let salesRep = {};

        if (parseInt(user.role) === 1000) {
            let franchiseeRecord = NS_MODULES.record.load({type: 'partner', id: user.id});
            let employeeId = franchiseeRecord.getValue({fieldId: 'custentity_sales_rep_assigned'});
            let employeeRecord = NS_MODULES.record.load({type: 'employee', id: employeeId});
            salesRep['id'] = employeeId;
            salesRep['name'] = `${employeeRecord.getValue({fieldId: 'firstname'})} ${employeeRecord.getValue({fieldId: 'lastname'})}`;
        }

        _writeResponseJson(response, {...user, salesRep});
    },
    'getCustomListData' : function(response, {id, type, valueColumnName, textColumnName}) {
        _writeResponseJson(response, getCustomListData(NS_MODULES, id, type, valueColumnName, textColumnName))
    },

    'getActiveFranchisees' : function(response) {
        _writeResponseJson(response, getFranchiseesByFilters(NS_MODULES, [
            ['isInactive'.toLowerCase(), 'is', false]
        ]));
    },
    'getActiveRunPlans' : function(response) {
        _writeResponseJson(response, getRunPlansByFilters(NS_MODULES, [
            ['isInactive'.toLowerCase(), 'is', false]
        ]));
    },
    'getActiveOperators' : function(response) {
        _writeResponseJson(response, getOperatorsByFilters(NS_MODULES, [
            ['isInactive'.toLowerCase(), 'is', false]
        ]));
    },

    'getCustomerAddresses' : function(response, {customerId}) {
        _writeResponseJson(response, getCustomersAddresses(NS_MODULES, customerId))
    },
    'getCustomerAddressById' : function (response, {customerId, addressId}) {
        let {record} = NS_MODULES;

        let customerRecord = record.load({ type: 'customer', id: customerId, isDynamic: true });

        let line = customerRecord['findSublistLineWithValue']({sublistId: 'addressbook', fieldId: 'internalid', value: addressId});

        let entry = {};
        customerRecord['selectLine']({sublistId: 'addressbook', line});

        for (let fieldId in addressSublistFieldIds)
            entry[fieldId] = customerRecord['getCurrentSublistValue']({sublistId: 'addressbook', fieldId})

        let addressSubRecord = customerRecord['getCurrentSublistSubrecord']({sublistId: 'addressbook', fieldId: 'addressbookaddress'});

        for (let fieldId in addressFieldIds)
            entry[fieldId] = addressSubRecord.getValue({ fieldId })

        _writeResponseJson(response, entry);
    },
    'getTerritoryPolygons' : function (response) {
        let file = NS_MODULES.file.load({id: 3772482});
        let contents = file['getContents']()

        _writeResponseJson(response, JSON.parse(contents.replaceAll('\\n', '').replaceAll(' ', '')));
    },
    'getLocationsByNearestName' : function (response, {locationName}) {
        let tokens = locationName.toLowerCase().replaceAll(/\W/gi, '|').split('|').filter(n => n);
        let searchFilter = [[], "AND", ["isinactive", "is", false]];
        for (let token of tokens)
            searchFilter[0].push(['name', 'contains', token], 'OR')

        searchFilter[0].pop();
        let locations = getLocationsByFilters(NS_MODULES, searchFilter);

        _writeResponseJson(response, locations.map(location => ({
            addressId: location['internalid'],
            addressType: 3,
            address: _parseNCLocation(location),
            location,
        })))
    },
    
    'getServicesByFilters' : function(response, {filters, additionalColumns, overwriteColumns}) {
        _writeResponseJson(response, getServicesByFilters(NS_MODULES, filters, additionalColumns, overwriteColumns));
    },
    'getCustomersByFilters' : function(response, {filters, additionalColumns, overwriteColumns}) {
        _writeResponseJson(response, getCustomersByFilters(NS_MODULES, filters, additionalColumns, overwriteColumns));
    },
    'getFranchiseesByFilters' : function(response, {filters, additionalColumns, overwriteColumns}) {
        _writeResponseJson(response, getFranchiseesByFilters(NS_MODULES, filters, additionalColumns, overwriteColumns));
    },
    'getRunPlansByFilters' : function(response, {filters, additionalColumns, overwriteColumns}) {
        _writeResponseJson(response, getRunPlansByFilters(NS_MODULES, filters, additionalColumns, overwriteColumns));
    },
    'getOperatorsByFilters' : function(response, {filters, additionalColumns, overwriteColumns}) {
        _writeResponseJson(response, getOperatorsByFilters(NS_MODULES, filters, additionalColumns, overwriteColumns));
    },
    'getServiceStopsByFilters' : function(response, {filters, additionalColumns, overwriteColumns}) {
        _writeResponseJson(response, getServiceStopsByFilters(NS_MODULES, filters, additionalColumns, overwriteColumns));
    },
    'getLocationsByFilters' : function(response, {filters, additionalColumns, overwriteColumns}) {
        _writeResponseJson(response, getLocationsByFilters(NS_MODULES, filters, additionalColumns, overwriteColumns));
    },
}

const postOperations = {
    'saveOrCreateServiceStop' : function (response, {serviceStopId, serviceStopData}) {
        let {record} = NS_MODULES;
        let serviceStopRecord;
        let isoStringRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/;

        if (serviceStopId) serviceStopRecord = record.load({type: 'customrecord_service_stop', id: serviceStopId, isDynamic: true});
        else serviceStopRecord = record.create({type: 'customrecord_service_stop'}); // id not present, this is new

        for (let fieldId in serviceStopFields)
            if (fieldId.toLowerCase() !== 'internalid')
                serviceStopRecord.setValue({
                    fieldId,
                    value: isoStringRegex.test(serviceStopData[fieldId]) ? new Date(serviceStopData[fieldId]) : serviceStopData[fieldId]
                });

        // TODO: send a notification to Data Admins if an address is manually entered
        serviceStopId = serviceStopRecord.save({ignoreMandatoryFields: true});

        _writeResponseJson(response, serviceStopId);
    },
    'convertCsvLineToServiceStopData' : function (response, {lineData, useOldTemplate}) {
        if (!lineData) return _writeResponseJson(response, {error: 'Invalid data provided'});

        let {record, search} = NS_MODULES;
        let data = {};

        if (useOldTemplate) {
            let [customerId, entityId, customerName, serviceId, serviceName, price, frequency,
                stop1Type, _1, stop1Address, stop1Duration, stop1Time, stop1Transfer, stop1Notes,
                stop2Type, _2, stop2Address, stop2Duration, stop2Time, stop2Transfer, stop2Notes,
                operatorName, runPlanName] = lineData;

            if (!customerId || !customerName || !serviceId || !frequency || !runPlanName
                || !stop1Type || !stop1Address || !stop1Time
                || !stop2Type || !stop2Address || !stop2Time)
                return _writeResponseJson(response, {error: 'Invalid data provided'});

            stop1Duration = stop1Duration || 300;
            stop2Duration = stop2Duration || 300;
            let customerRecord = record.load({type: 'customer', id: customerId});
            let runPlanId, operatorId, franchiseeId = customerRecord.getValue({fieldId: 'partner'});

            search.create({
                type: "customrecord_run_plan",
                filters: [["name", "is", runPlanName], 'AND', ['custrecord_run_franchisee', 'is', franchiseeId]],
                columns: [ 'internalid', 'name', 'custrecord_run_franchisee', 'custrecord_run_operator' ]
            }).run().each(result => {
                runPlanId = result.id;
                operatorId = result.getValue('custrecord_run_operator');

                return true;
            });

            let serviceStop1Data = {
                custrecord_1288_customer: customerId,
                custrecord_1288_service: serviceId,
                custrecord_1288_plan: runPlanId,
                custrecord_1288_franchisee: franchiseeId,
                custrecord_1288_operator: operatorId,
                custrecord_1288_frequency: _oldTemplateParser.getFrequency(frequency),
                custrecord_1288_stop_times: _oldTemplateParser.getStopTime(stop1Time, (parseInt(stop1Duration) * 1000) + ''),
                custrecord_1288_notes: stop1Notes,
                custrecord_1288_sequence: 0,
                custrecord_1288_is_transfer: '2', // Yes (1), No (2)
                custrecord_1288_transfer_operator: null,
                custrecord_1288_relief_operator: null,
                custrecord_1288_relief_start: '2024-01-01',
                custrecord_1288_relief_end: '2024-01-01',
                ..._oldTemplateParser.getAddress(customerId, stop1Address),
            }

            let serviceStop2Data = {
                custrecord_1288_customer: customerId,
                custrecord_1288_service: serviceId,
                custrecord_1288_plan: runPlanId,
                custrecord_1288_franchisee: franchiseeId,
                custrecord_1288_operator: operatorId,
                custrecord_1288_frequency: _oldTemplateParser.getFrequency(frequency),
                custrecord_1288_stop_times: _oldTemplateParser.getStopTime(stop2Time, (parseInt(stop2Duration) * 1000) + ''),
                custrecord_1288_notes: stop2Notes,
                custrecord_1288_sequence: 0,
                custrecord_1288_is_transfer: '2', // Yes (1), No (2)
                custrecord_1288_transfer_operator: null,
                custrecord_1288_relief_operator: null,
                custrecord_1288_relief_start: '2024-01-01',
                custrecord_1288_relief_end: '2024-01-01',
                ..._oldTemplateParser.getAddress(customerId, stop2Address),
            }
            data = [{...serviceStop1Data}, {...serviceStop2Data}];
        } else {
            let [franchiseeName, customerId, entityId, customerName, serviceId, serviceName, addressType, address,
                mon, tue, wed, thu, fri, adhoc, notes, driverId, driverName, planId, planName, serviceStopId] = lineData;

            let franchiseeId;

            let arr = NS_MODULES.search['lookupFields']({
                type: 'customrecord_run_plan',
                id: planId,
                columns: ['custrecord_run_franchisee']
            })['custrecord_run_franchisee'];

            if (arr.length) franchiseeId = arr[0].value;
            else throw `Could not find associated franchisee for plan [${planName} (${planId})].`;

            let serviceStopData = {
                internalid: serviceStopId,
                custrecord_1288_customer: customerId,
                custrecord_1288_service: serviceId,
                custrecord_1288_plan: planId,
                custrecord_1288_franchisee: franchiseeId,
                custrecord_1288_operator: driverId,

                ..._newTemplateParser.getFreqAndStopTime(mon, tue, wed, thu, fri, adhoc),

                custrecord_1288_notes: notes,
                custrecord_1288_sequence: 0,
                custrecord_1288_is_transfer: '2', // Yes (1), No (2)
                custrecord_1288_transfer_operator: null,
                custrecord_1288_relief_operator: null,
                custrecord_1288_relief_start: '2024-01-01',
                custrecord_1288_relief_end: '2024-01-01',

                ..._newTemplateParser.getAddress(customerId, addressType, address),
            };

            data = [{...serviceStopData}];
        }

        _writeResponseJson(response, data);
    },
    'deleteServiceStop' : function (response, {serviceStopId}) {
        NS_MODULES.record.delete({type: 'customrecord_service_stop', id: serviceStopId});

        _writeResponseJson(response, `Service stop id# ${serviceStopId} has been deleted`);
    },
    'saveRunPlan' : function (response, {runPlanId, runPlanData}) {
        const {record} = NS_MODULES;
        let runPlanRecord;

        if (runPlanId) runPlanRecord = record.load({type: 'customrecord_run_plan', id: runPlanId});
        else runPlanRecord = record.create({type: 'customrecord_run_plan'});

        for (let fieldId of ['name', 'custrecord_run_franchisee', 'custrecord_run_operator'])
            runPlanRecord.setValue({fieldId, value: runPlanData[fieldId]});

        _writeResponseJson(response, runPlanRecord.save({ignoreMandatoryFields: true}));
    }
};

const _oldTemplateParser = {
    getFrequency(freqString) {
        let freqTerms = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'adhoc'];
        let freqArray = freqString.toLowerCase().trim().replace(/\W/gi, ' ').split(/\s+/).filter(i => !!i);

        if (freqArray.filter(i => 'daily'.indexOf(i) === 0).length) return '1,1,1,1,1,0';
        if (freqArray.filter(i => 'adhoc'.indexOf(i) === 0).length) return '0,0,0,0,0,1';

        return freqTerms.map(term => { // using this, we can match M, Mon or Monday to 'monday'.
            return freqArray.filter(i => term.indexOf(i) === 0).length ? '1' : '0';
        }).join(',');
    },
    getStopTime(timeString, duration = '300000') { // timeString can be '00:00 AM', '00:00', '00.00' or '0000'
        let hour = 0;
        let minute = 0;
        let indicator = null;

        let arr = timeString.trim().replace(/\W/gi, ' ').split(/\s+/);
        if (arr.length === 1 && arr[0].length === 4 && !isNaN(arr[0])) {
            hour = parseInt(arr[0].substring(0, 2));
            minute = parseInt(arr[0].substring(2));
        } else if (arr.length === 2 && !isNaN(arr[0])) {
            hour = parseInt(arr[0]);
            minute = isNaN(arr[1].replace(/[PM]|[AM]/gi, '')) ? 0 : parseInt(arr[1].replace(/[PM]|[AM]/gi, ''));

            indicator = arr[1].toLowerCase().includes('am') ? 'AM' : indicator;
            indicator = arr[1].toLowerCase().includes('pm') ? 'PM' : indicator;
        } else if (arr.length >= 3 && !isNaN(arr[0]) && !isNaN(arr[1])) {
            hour = parseInt(arr[0]);
            minute = parseInt(arr[1]);

            indicator = arr[2].toLowerCase().includes('am') ? 'AM' : indicator;
            indicator = arr[2].toLowerCase().includes('pm') ? 'PM' : indicator;
        }

        hour = (indicator !== null) ? hour - 12 * Math.floor(hour / 12) : hour - 24 * Math.floor(hour / 24);
        hour = ((indicator === 'AM' && hour === 12) || (indicator === 'PM' && hour !== 12)) ? hour + 12 : hour;
        minute = minute - 60 * Math.floor(minute / 60);

        return String((hour + '').padStart(2, '0') + ':' + (minute + '').padStart(2, '0') + '|' + duration + ',').repeat(6).slice(0, -1);
    },
    getAddress(customerId, addressString) {
        let addressType = null;
        let addressBookId = null;
        let locationId = null;
        let stopName = '';
        let customerCompanyName = NS_MODULES.search['lookupFields']({type: 'customer', id: customerId, columns: 'companyname'})['companyname'];

        let result = _analyse.address(customerId, addressString, 0.8);

        if (result.addressType) {
            addressType = result.addressType;
            addressBookId = addressType === 2 ? result.addressId : null;
            locationId = addressType === 3 ? result.addressId : null;
            stopName = addressType === 2 ? customerCompanyName : (addressType === 3 ? result?.location?.name : '');
        }


        return {
            custrecord_1288_address_type: addressType, // Manual (1), Book (2), Location (3)
            custrecord_1288_address_book: addressBookId,
            custrecord_1288_postal_location: locationId,
            custrecord_1288_manual_address: '',
            custrecord_1288_stop_name: stopName,
            addressAnalysis: result,
        }
    }
};

const _newTemplateParser = {
    getAddress(customerId, addressType, addressString) {
        let stopName = '';
        let addressAnalysis = null;
        let addressBookId = null;
        let locationId = null;
        let addressTypes = ['Undocumented', 'Customer\'s Address', 'Known Address'];
        addressType = addressTypes.indexOf(addressType) + 1

        if (addressType === 2) {
            addressAnalysis = _analyse.address(customerId, addressString, 0.8);

            if (addressAnalysis.addressType) {
                addressBookId = addressAnalysis.addressId;
                stopName = NS_MODULES.search['lookupFields']({type: 'customer', id: customerId, columns: 'companyname'})['companyname'];
            }
        } else if (addressType === 3) {
            let locations = getLocationsByFilters(NS_MODULES, [["name", "is", addressString.substring(0, addressString.indexOf('(') - 1)], "AND", ["isinactive", "is", false]]);

            if (locations.length) {
                locationId = locations[0]['internalid'];
                stopName = locations[0]['name'];

                addressAnalysis = {
                    addressId: locations[0]['internalid'],
                    addressType: 3,
                    similarity: 1,
                    address: _parseNCLocation(locations[0]),
                    location: locations[0],
                };
            } else {
                addressAnalysis = _analyse.address(customerId, addressString, 0.8);

                if (addressAnalysis.addressType) {
                    locationId = addressAnalysis.addressId;
                    stopName = addressAnalysis?.location?.name || '';
                }
            }
        }

        return {
            custrecord_1288_stop_name: stopName,
            custrecord_1288_address_type: addressType, // Manual (1), Book (2), Location (3)
            custrecord_1288_address_book: addressBookId,
            custrecord_1288_postal_location: locationId,
            custrecord_1288_manual_address: '',
            addressAnalysis,
        }
    },
    getFreqAndStopTime(mon, tue, wed, thu, fri, adhoc) {
        let freq = [mon, tue, wed, thu, fri, adhoc].map(item => item ? 1 : 0);
        let stopTimes = [mon, tue, wed, thu, fri, adhoc].map(item => {
            if (!item) return `07:00|300000`;
            item = item.toLowerCase().replaceAll(/[^a-zA-Z\d:]/gi, '');
            let [hour, minute] = item.split(':');
            hour = parseInt(hour);
            let hasPM = minute.includes('pm');
            minute = parseInt(minute.replaceAll('am', '').replaceAll('pm', ''));

            if (hour <= 12 && hasPM) hour += 12;

            return `${hour}:${minute}|300000`;
        });

        return {
            custrecord_1288_frequency: freq.join(','),
            custrecord_1288_stop_times: stopTimes.join(','),
        }
    }
}

const _analyse = {
    address(customerId, addressString, similarityThreshold = 1) {
        let tokens = addressString.toLowerCase().replaceAll(/\W/gi, '|').split('|').filter(n => n);

        let customerAddresses = getCustomersAddresses(NS_MODULES, customerId);
        let caSimilarities = customerAddresses.map(address => {
            let bible = address['fullAddress'].toLowerCase().replaceAll(/\W/gi, '|').split('|').filter(n => n);

            return {
                addressId: address['internalid'],
                addressType: 2,
                similarity: tokens.reduce((prevVal, currVal) => prevVal + (bible.includes(currVal) ? 1 : 0), 0) / tokens.length,
                address: _parseCustomerAddress(address),
                location: address,
            };
        }).sort((a, b) => b.similarity - a.similarity);

        // If confidence is higher than similarityThreshold, return it
        if (caSimilarities.length && caSimilarities[0].similarity >= similarityThreshold) return caSimilarities[0];

        // Assume that the string is just a name
        let locations = getLocationsByFilters(NS_MODULES, [["name", "is", addressString], "AND", ["isinactive", "is", false]]);

        if (locations.length)
            return { addressType: 3, addressId: locations[0].internalid, similarity: 1, address: _parseNCLocation(locations[0]), location: locations[0] };

        // if no hit  with name field, we need to dive deeper
        // we assume that one of the tokens is postcode, we need to find it
        let laSimilarities = [];
        let [postcode] = tokens.filter(token => /^\d{4}$/g.test(token));

        if (postcode) { // postcode found, we try to search through known locations
            let searchFilter = [["custrecord_ap_lodgement_postcode", "is", postcode], 'AND', [], "AND", ["isinactive", "is", false]];
            for (let token of tokens)
                searchFilter[2].push(
                    ['custrecord_ap_lodgement_addr1', 'contains', token], 'OR',
                    ['custrecord_ap_lodgement_addr2', 'contains', token], 'OR'
                )

            searchFilter[2].pop();
            let locations = getLocationsByFilters(NS_MODULES, searchFilter);
            laSimilarities = locations.map(location => {
                let address = _parseNCLocation(location);
                let bible = address['formatted'].toLowerCase().replaceAll(/\W/gi, '|').split('|').filter(n => n);

                return {
                    addressId: location['internalid'],
                    addressType: 3,
                    similarity: tokens.reduce((prevVal, currVal) => prevVal + (bible.includes(currVal) ? 1 : 0), 0) / tokens.length,
                    address,
                    location,
                };
            }).sort((a, b) => b.similarity - a.similarity);
        } else { // otherwise, we assume that the addressString is just a partially wrong name, try to search by names
            let searchFilter = [[], "AND", ["isinactive", "is", false]];
            for (let token of tokens)
                searchFilter[0].push(['name', 'contains', token], 'OR')

            searchFilter[0].pop();
            let locations = getLocationsByFilters(NS_MODULES, searchFilter);
            laSimilarities = locations.map(location => {
                let address = _parseNCLocation(location);
                let bible = address['name'].toLowerCase().replaceAll(/\W/gi, '|').split('|').filter(n => n);

                return {
                    addressId: location['internalid'],
                    addressType: 3,
                    similarity: tokens.reduce((prevVal, currVal) => prevVal + (bible.includes(currVal) ? 1 : 0), 0) / tokens.length,
                    address,
                    location,
                };
            }).sort((a, b) => b.similarity - a.similarity);
        }

        // If confidence is higher than similarityThreshold, return it
        if (laSimilarities.length && laSimilarities[0].similarity >= similarityThreshold) return laSimilarities[0];

        let similarities = [...caSimilarities, ...laSimilarities].sort((a, b) => b.similarity - a.similarity);

        return {addressString, similarities};
    }
}