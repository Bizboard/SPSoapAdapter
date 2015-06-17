/**
 * Created by mysim1 on 13/06/15.
 */
import {SoapClient}     from './SoapClient';
import {UrlParser}      from 'arva-utils/request/UrlParser';
import _                from 'lodash';

// setup the soapClient.
var soapClient = new SoapClient();
var cache = [];
var retriever = null;
var window = this;
var global = this;
var interval = 3000;
var settings = {};

/**
 * Handle incoming requests from the UI layer.
 * @param event Event will be an array where the first parameter is the instruction, and second parameter is the relevant data for that action.
 */
this.onmessage = function(event) {

    var operation = event.data[0];
    var args = event.data[1];


    if (operation === 'init') {
        settings = args;
        _handleInit(settings);
        _refresh();
    }
    else if (operation == 'set') {
        _handleSet(args)
    }
    else if (operation == 'remove') {
        _handleRemove(args);
    }


};

function _updateCache(data) {
    for (let record in data) {

        let isCached = _.findIndex(cache, function(item) {
            return  data[record].id == item.id;
        });

        if (isCached == -1) {
            cache.push(data[record]);
            postMessage({ event: 'child_added', result: data[record] });
        }
        else {
            if (!_.isEqual(data[record], cache[isCached])) {
                cache.splice(isCached, 1, data[record]);
                postMessage({event: 'child_changed', result: data[record]});
            }
        }
    }
}

function _refresh() {
    soapClient.call(retriever)
        .then((result)=> {

            _setLastUpdated(result.timestamp);
            let data = _getResults(result.data);
            _updateCache(data);

            postMessage({ event: 'value', result: cache });
            setTimeout(_refresh, interval);

        }).catch(function(err){

            setTimeout(_refresh, interval);
        });
}

function _setLastUpdated(newDate) {
    if (newDate) {
        let dateObject = new Date(newDate);
        let offset = dateObject.getTimezoneOffset();
        dateObject.setTime(dateObject.getTime() + (offset*-1)*60*1000);
        retriever.params.query.Query.Where.Gt.Value.__text = dateObject.toISOString();
    }
}


function _handleInit(args) {
    // initialize with SharePoint configuration
    retriever = _GetListItemsDefaultConfiguration();

    retriever.url = _ParsePath(args.endPoint, _GetListService());
    retriever.params = {
        'listName': args.listName,
        'viewFields': {
            'ViewFields': ''
        },
        'query': {
            'Query': {
                'Where': {
                    'Gt': {
                        'FieldRef': {
                            '_Name': 'Modified'
                        },
                        'Value': {
                            '_Type': 'DateTime',
                            '_IncludeTimeValue': 'TRUE',
                            '__text': new Date(0).toISOString()
                        }
                    }
                }
            }
        },
        'queryOptions': {
            'QueryOptions': {
                'IncludeMandatoryColumns': 'FALSE',
                'ViewAttributes': {
                    '_Scope': 'RecursiveAll'
                }
            }
        }
    };
}


/**
 * Add or Update a data record.
 * @private
 */
function _handleSet(newData) {
    var configuration = _UpdateListItemsDefaultConfiguration();
    configuration.url = _ParsePath(settings.endPoint, _GetListService());
    var fieldCollection = [];
    var method = '';

    // assume existing record to be updated.
    if (newData.id) {

        fieldCollection.push({
            "_Name": "ID",
            "__text": newData.id
        });

        method = "Update";
    }
    // create a new record, because there is no id.
    else {
        fieldCollection.push({
            "_Name": "ID",
            "__text": 'New'
        });
        method = 'New';
    }

    for (var prop in newData) {
        if (prop == "id" || typeof(newData[prop]) == "undefined") continue;
        if (prop == "priority") continue;

        fieldCollection.push({
            "_Name": prop,
            "__text": newData[prop]
        });
    }

    configuration.params = {
        "listName": settings.listName,
        "updates": {
            "Batch": {
                "Method": {
                    "Field": fieldCollection,

                    "_ID": "1",
                    "_Cmd": method
                },

                "_OnError": "Continue",
                "_ListVersion": "1",
                "_ViewName": ""
            }
        }
    };

    // initial initialisation of the datasource
    soapClient.call(configuration)
        .then((result)=>{

            let data = _getResults(result.data);
            _updateCache(data);

        }, (error) => {
            console.log(error);
        });
}


function _getResults(result) {

    let arrayOfObjects = [];
    let node = null;



    if (result["soap:Envelope"]["soap:Body"][0].GetListItemsResponse) {
        node = result["soap:Envelope"]["soap:Body"][0].GetListItemsResponse[0].GetListItemsResult[0].listitems[0]["rs:data"][0];

        if (node) {
            if (node.$.ItemCount !== '0') {
                for (let row in node['z:row']) {
                    let raw = node['z:row'][row].$;
                    let record = _formatRecord(raw);
                    arrayOfObjects.push(record);
                }
            }
        }
    }
    else if (result["soap:Envelope"]["soap:Body"][0].UpdateListItemsResponse) {

        // check for error
        let error = result["soap:Envelope"]["soap:Body"][0].UpdateListItemsResponse[0].UpdateListItemsResult[0].Results[0].Result[0].ErrorCode;
        if (error == '0x00000000') {
            node = result["soap:Envelope"]["soap:Body"][0].UpdateListItemsResponse[0].UpdateListItemsResult[0].Results[0];
            if (node) {
                for (let row in node.Result) {
                    let raw = node.Result[row]["z:row"][0].$;
                    let record = _formatRecord(raw);
                    arrayOfObjects.push(record);
                }
            }
        }
    }

    return arrayOfObjects;
}

function _formatRecord(record) {
    let result = {};
    for (let attribute in record) {

        let name = attribute.replace('ows_', '');
        if (name == 'xmlns:z') continue;

        if (name=="ID"){
            name="id";
            result[name] = record[attribute];
        }

        /*
         if (attribute.value.indexOf(";#")>-1) {
         var keys = attribute.value.split(";#");
         var pairs = keys.length/2;
         var assignable = pairs.length>1?[]:{};
         for(var pair=0;pair<pairs;pair++){
         if (pairs>1) assignable.push({ id: keys[pair], value: keys[pair+1]});
         else assignable = {id: keys[pair], value: keys[pair+1]};
         }
         result[name] = { id: 0, value: ""};
         }*/

        // map a number when that number is detected
        else if (!isNaN(record[attribute]))
            result[name] = parseFloat(record[attribute]);
        // default map 1-1
        else
            result[name] = record[attribute];
    }
    return result;
}

function _handleRemove(record) {
    var configuration = _UpdateListItemsDefaultConfiguration();
    configuration.url = _ParsePath(settings.endPoint, _GetListService());
    var fieldCollection = [];

    fieldCollection.push({
        "_Name": "ID",
        "__text": record.id
    });

    configuration.params = {
        "listName": settings.listName,
        "updates": {
            "Batch": {
                "Method": {
                    "Field": fieldCollection,

                    "_ID": '1',
                    "_Cmd": 'Delete'
                },

                "_OnError": 'Continue',
                "_ListVersion": '1',
                "_ViewName": ''
            }
        }
    };

    // initial initialisation of the datasource
    soapClient.call(configuration)
        .then(()=>{
            postMessage({ event: 'child_removed', result: record });
        }, (error) =>{
            console.log(error);
        });
}


function _ParsePath(path, endPoint) {

    var url = UrlParser(path);
    if (!url) console.log('Invalid datasource path provided!');

    var pathParts = url.path.split('/');
    var newPath = url.protocol + '://' + url.host + '/';
    for(var i=0;i<pathParts.length;i++)
        newPath += pathParts[i] + '/';
    newPath += endPoint;
    return newPath;
};


function _UpdateListItemsDefaultConfiguration() {
    return {
        url: '',
        service: 'Lists',
        method: 'UpdateListItems',
        params: '',
        headers: new Map([
            ['SOAPAction', 'http://schemas.microsoft.com/sharepoint/soap/UpdateListItems'],
            ['Content-Type', 'text/xml']
        ])
    };
};

function _GetListItemsDefaultConfiguration() {
    return {
        url: '',
        service: 'Lists',
        method: 'GetListItems',
        params: '',
        headers: new Map([
            ['SOAPAction', 'http://schemas.microsoft.com/sharepoint/soap/GetListItems'],
            ['Content-Type', 'text/xml']
        ])
    };
};

function _GetListService() {
    return '_vti_bin/Lists.asmx';
};



function _GetUserGroupService() {
    return '_vti_bin/UserGroup.asmx';
};
