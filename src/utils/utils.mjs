const AUDollar = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'AUD',
});

const dateFormat = new Intl.DateTimeFormat('en-AU', {
    dateStyle: 'long',
    timeZone: 'Australia/Sydney',
});

export const VARS = {
    pageTitle: 'Run Planner',
}

export const isoStringRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z?$/;

export const rules = {
    email(value, fieldName = 'This field') {
        return !value
            || /^([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x22([^\x0d\x22\x5c\x80-\xff]|\x5c[\x00-\x7f])*\x22)(\x2e([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x22([^\x0d\x22\x5c\x80-\xff]|\x5c[\x00-\x7f])*\x22))*\x40([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x5b([^\x0d\x5b-\x5d\x80-\xff]|\x5c[\x00-\x7f])*\x5d)(\x2e([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x5b([^\x0d\x5b-\x5d\x80-\xff]|\x5c[\x00-\x7f])*\x5d))*$/.test(value)
            || `${fieldName} must be a valid email`;
    },
    required(value, fieldName = 'This field') {
        return !!value || `${fieldName} is required`;
    },
    minLength(value, fieldName = 'This field', length) {
        return (value && value.length >= length) || `${fieldName} must be more than ${length} characters`;
    },
    abn(value, fieldName = 'This field') {
        if (!value) return true;

        let weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19],
            checksum = value.split('').map(Number).reduce(
                function(total, digit, index) {
                    if (!index) {
                        digit--;
                    }
                    return total + (digit * weights[index]);
                },
                0
            );

        return value.length === 11 || !(!checksum || checksum % 89 !== 0) || `${fieldName} must be a valid ABN`;
    },
    ausPhone(value, fieldName = 'This field') {
        let australiaPhoneFormat = /^(\+\d{2}[ -]{0,1}){0,1}(((\({0,1}[ -]{0,1})0{0,1}\){0,1}[2|3|7|8]{1}\){0,1}[ -]*(\d{4}[ -]{0,1}\d{4}))|(1[ -]{0,1}(300|800|900|902)[ -]{0,1}((\d{6})|(\d{3}[ -]{0,1}\d{3})))|(13[ -]{0,1}([\d -]{5})|((\({0,1}[ -]{0,1})0{0,1}\){0,1}4{1}[\d -]{8,10})))$/;
        return !value || australiaPhoneFormat.test(value) || `${fieldName} must be a valid phone number`;
    },

    validate(v, validationString, fieldName = 'This field') {
        let validations = validationString.split('|');

        for (let validation of validations) {
            if (validation === 'validate') continue;

            let terms = validation.split(':');
            let rule = terms.shift();
            terms = terms.length ? terms[0].split(',') : [];
            let result = rules[rule] ? rules[rule](v, fieldName || 'Field', ...terms) : null;

            if (typeof result === 'string') return result;
        }

        return true
    }
}


export function getWindowContext() {
    if (window.location.href.includes('app.netsuite.com')) return window;
    else return top;
}

export function allowOnlyNumericalInput(evt) {
    if ((evt.key === 'a' || evt.key === 'c' || evt.key === 'v') && evt.ctrlKey) // allow select all and copy
        return true;

    // if (!/^[-+]?[0-9]*?[0-9]*$/.test(expect)) // Allow only 1 leading + sign and numbers
    if (!/^[0-9]*$/.test(evt.key) && evt.key.length === 1) // Allow only numbers, assuming evt.key is a string
        evt.preventDefault();
    else return true;
}

export function getDialogWidth({md, lg, smAndDown}) {
    if (smAndDown.value) return '95vw';
    else if (md.value) return '75vw';
    else if (lg.value) return '60vw';
    else return '40vw';
}

export function getTodayDate() {
    return new Date(new Date().setHours(new Date().getTimezoneOffset()/-60, 0, 0))
}

export function readFileAsBase64(fileObject) {
    return new Promise((resolve, reject) => {
        if (!fileObject) resolve(null);

        let reader = new FileReader();

        reader.onload = (event) => {
            try {
                resolve(event.target.result.split(',')[1]);
            } catch (e) {reject(e);}
        }
        reader.readAsDataURL(fileObject);
    });
}

export const debounce = (fn, delay, option = { leading: true, trailing: true}) => {
    let timeout;
    let isLeadingInvoked = false;

    return function (...args) {
        return new Promise(resolve => {
            const context = this;

            // base condition
            if (timeout) {
                clearTimeout(timeout);
            }

            // handle leading
            if (option.leading && !timeout) {
                Promise.resolve(fn.apply(context, args)).then(resolve);
                isLeadingInvoked = true;
            } else isLeadingInvoked = false;

            // handle trailing
            timeout = setTimeout(() => {
                if (option.trailing && !isLeadingInvoked)
                    Promise.resolve(fn.apply(context, args)).then(resolve);

                timeout = null;
            }, delay);
        })
    }
}

export function offsetDateObjectForNSDateField(dateObject) {
    if (Object.prototype.toString.call(dateObject) !== '[object Date]') return dateObject;

    return dateObject.getFullYear() + '-' + `${dateObject.getMonth() + 1}`.padStart(2, '0') + '-' + `${dateObject.getDate()}`.padStart(2, '0') + 'T00:00:00.000';
}

export function waitMilliseconds(millis = 1000) {
    return new Promise(resolve => {
        setTimeout(() => resolve(), millis)
    })
}

export function formatPrice(price) {
    return AUDollar.format(price);
}

export function formatDate(date) {
    return dateFormat.format(date)
}

export function formatBytes(bytes, decimals = 2) {
    if (!+bytes) return '0 Bytes'

    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['Bytes', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB']

    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

export const simpleCompare = (a, b) => `${a}`.localeCompare(`${b}`);

export const checkSubset = (parentArray, subsetArray) => {
    return subsetArray.every((el) => {
        return parentArray.includes(el)
    })
}

export function isServiceStopObjectValid(ssObj) {
    let fieldsToCheck = [
        'custrecord_1288_customer',
        'custrecord_1288_service',
        'custrecord_1288_plan',
        'custrecord_1288_franchisee',
        'custrecord_1288_operator',
        'custrecord_1288_stop_name',
        // 'custrecord_1288_frequency',
        // 'custrecord_1288_stop_times',
        // 'custrecord_1288_notes',
        'custrecord_1288_address_type', // Manual (1), Book (2), Location (3)
        // 'custrecord_1288_address_book',
        // 'custrecord_1288_postal_location',
        // 'custrecord_1288_manual_address',
    ]

    return fieldsToCheck.reduce((accumulator, fieldId) => !!ssObj[fieldId] && accumulator, true)
        && !!ssObj.custrecord_1288_address_type
        && (!!ssObj.custrecord_1288_address_book || !!ssObj.custrecord_1288_postal_location || !!ssObj.custrecord_1288_manual_address)
        && ssObj.custrecord_1288_frequency.split(',').reduce((accumulator, item) => parseInt(item) + accumulator, 0) > 0;
}

export function _getAddressFieldNameByType(addressType) {
    let arr = ['custrecord_1288_manual_address', 'custrecord_1288_address_book', 'custrecord_1288_postal_location'];
    return arr[parseInt(addressType) - 1];
}

export function _parseManualAddress(jsonString) {
    let address = JSON.parse(jsonString);
    return {...address, formatted: `${address.addr1} ${address.addr2}, ${address.city} ${address.state} ${address.zip}`}
}

export function _parseCustomerAddress(address) {
    return {
        id: address['internalid'],
        formatted: `${address.addr1} ${address.addr2}, ${address.city} ${address.state} ${address.zip}`,
        name: address['addressee'],
        addr1: address['addr1'],
        addr2: address['addr2'],
        city: address['city'],
        state: address['state'],
        zip: address['zip'],
        lat: address['custrecord_address_lat'],
        lng: address['custrecord_address_lon'],
    }
}

export function _parseNCLocation(address) {
    const fullAddress = `${address.custrecord_ap_lodgement_addr1} ${address.custrecord_ap_lodgement_addr2},` +
        ` ${address.custrecord_ap_lodgement_suburb} ${address.custrecord_ap_lodgement_site_state_text} ${address.custrecord_ap_lodgement_postcode}`;
    let formatted = `${address.name} (${fullAddress})`;
    return {
        id: address['internalid'],
        formatted, fullAddress, name: address['name'],
        addr1: address['custrecord_ap_lodgement_addr1'],
        addr2: address['custrecord_ap_lodgement_addr2'],
        city: address['custrecord_ap_lodgement_suburb'],
        state: address['custrecord_ap_lodgement_site_state_text'],
        zip: address['custrecord_ap_lodgement_postcode'],
        lat: address['custrecord_ap_lodgement_lat'],
        lng: address['custrecord_ap_lodgement_long'],
    }
}