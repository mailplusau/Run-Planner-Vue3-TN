/**
 * @author Tim Nguyen
 * @description NetSuite Experimentation - Run Planner
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @created 18/10/2024
 */

import { VARS } from "@/utils/utils.mjs";
import {
    address as addressFieldIds,
    addressSublist as addressSublistFieldIds,
    getFranchiseesByFilters,
    getCustomersByFilters,
    getOperatorsByFilters,
    getRunPlansByFilters, getServiceStopsByFilters, getLocationsByFilters, getServicesByFilters,
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
    
    'getServicesByFilters' : function(response, {filters, additionalColumns, overwriteColumns}) {
        _writeResponseJson(response, getServicesByFilters(NS_MODULES, filters, additionalColumns, overwriteColumns));
    },
    'getCustomersByFilters' : function(response, {filters, additionalColumns, overwriteColumns}) {
        _writeResponseJson(response, getCustomersByFilters(NS_MODULES, filters, additionalColumns, overwriteColumns));
    },
    'getFranchiseesByFilters' : function(response, {filters, additionalColumns, overwriteColumns}) {
        _writeResponseJson(response, getFranchiseesByFilters(NS_MODULES, filters, additionalColumns, overwriteColumns));
    },
    'getServiceStopsByFilters' : function(response, {filters, additionalColumns, overwriteColumns}) {
        _writeResponseJson(response, getServiceStopsByFilters(NS_MODULES, filters, additionalColumns, overwriteColumns));
    },
    'getLocationsByFilters' : function(response, {filters, additionalColumns, overwriteColumns}) {
        _writeResponseJson(response, getLocationsByFilters(NS_MODULES, filters, additionalColumns, overwriteColumns));
    },
}

const postOperations = {

};