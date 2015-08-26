/**
 * Created by mysim1 on 13/06/15.
 */
import {SoapClient}     from './SoapClient';
import {ExistsRequest}  from 'arva-utils/request/RequestClient';
import {UrlParser}      from 'arva-utils/request/UrlParser';
import _                from 'lodash';

// setup the soapClient.
var soapClient = new SoapClient();
var tempKeys = [];
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
this.onmessage = function (event) {
    var operation = event.data[0];
    var args = event.data[1];


    if (operation === 'init') {
        try {
            settings = _intializeSettings(args);
            _handleInit(settings);
            _refresh();
        }
            // if we can't initalize. we might as well kill ourselfs.
        catch (exception) {
            postMessage({event: 'INVALIDSTATE', result: exception});
            self.close();
        }
    }
    else if (operation == 'set') {
        _handleSet(args)
    }
    else if (operation == 'remove') {
        _handleRemove(args);
    }
};


function _intializeSettings(args) {

    // rebuild endpoint from polling server and interpreting response
    var url = UrlParser(args.endPoint);
    if (!url) throw new Error('Invalid DataSource path provided!');

    var newPath = url.protocol + '://' + url.host + '/';
    var pathParts = url.path.split('/');
    let identifiedParts = [];

    while (!ExistsRequest(newPath + pathParts.join('/') + '/' + _GetListService())) {
        identifiedParts.unshift(pathParts.splice(pathParts.length - 1, 1)[0]);
    }

    if (identifiedParts.length > 1) {
        throw {
            endPoint: pathParts.join('/') + '/' + identifiedParts[0],
            message: 'Parameters could not be correctly extracted for polling. Assuming invalid state.'
        }
    }
    else {
        let resultconfig = {
            endPoint: newPath + pathParts.join('/'),
            listName: identifiedParts[0],
            itemId: identifiedParts[1]
        };


        if (args.query) resultconfig.query = args.query;
        if (args.limit) resultconfig.limit = args.limit;
        if (args.orderBy) resultconfig.orderBy = args.orderBy;

        return resultconfig;
    }
}

/**
 * Start reading the list from SharePoint and only retrieve changes from last polling timestamp.
 * @param args
 * @private
 */
function _handleInit(args) {

    if (!args.listName) return;

    // initialize with SharePoint configuration
    retriever = _GetListItemsDefaultConfiguration();

    retriever.url = _ParsePath(args.endPoint, _GetListService());
    retriever.params = {
        'listName': args.listName,
        'viewFields': {
            'ViewFields': ''
        },
        //'since': new Date(0).toISOString(),
        'queryOptions': {
            'QueryOptions': {
                'IncludeMandatoryColumns': 'FALSE',
                'ViewAttributes': {
                    '_Scope': 'RecursiveAll'
                }
            }
        }
    };

    if (args.query) {
        retriever.params.query = args.query;
    }

    if (args.orderBy) {
        if (retriever.params.query) {
            retriever.params.query.OrderBy = {
                "FieldRef": {
                    "_Ascending": "TRUE",
                    "_Name": args.orderBy
                }
            };
        }
        else {
            retriever.params.query = {
                Query: {
                    OrderBy: {
                        "FieldRef": {
                            "_Ascending": "TRUE",
                            "_Name": args.orderBy
                        }
                    }
                }
            };
        }
    }

    if (args.limit) {
        retriever.params.rowLimit = args.limit;
    }
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

    let isLocal = _.findIndex(tempKeys, function (key) {
        return key.localId == newData.id;
    });

    if (isLocal > -1) {
        newData.id = tempKeys[isLocal].remoteId;
    }

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
        let fieldValue = newData[prop];
        if (prop == "id" || typeof(fieldValue) == "undefined") continue;
        if (prop == "priority" || prop == "_temporary-identifier") continue;
        if(typeof fieldValue === "object" && fieldValue.id && fieldValue.value) {
            /* This is a SharePoint lookup type field. We must write it as a specially formatted value instead of an id/value object. */
            fieldValue = `${fieldValue.id};#${fieldValue.value}`;
        }

        fieldCollection.push({
            "_Name": prop,
            "__text": fieldValue
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
        .then((result)=> {

            let data = _getResults(result.data);
            if (data.length == 1) {

                // push ID mapping for given session
                if (newData['_temporary-identifier']) {
                    tempKeys.push({localId: newData['_temporary-identifier'], remoteId: data[0].id});
                }
                _updateCache(data);
            }
        }, (error) => {
            console.log(error);
        });
}

/**
 * Remove a record from SharePoint
 * @param record
 * @private
 */
function _handleRemove(record) {
    var configuration = _UpdateListItemsDefaultConfiguration();
    configuration.url = _ParsePath(settings.endPoint, _GetListService());
    var fieldCollection = [];

    let isLocal = _.findIndex(tempKeys, function (key) {
        return key.localId == record.id;
    });

    if (isLocal > -1) {
        record.id = tempKeys[isLocal].remoteId;
    }

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
        .then(()=> {
            postMessage({event: 'child_removed', result: record});
        }, (error) => {
            console.log(error);
        });
}


/**
 * Update our cache and bubble child_added or child_changed events
 * @param data
 * @private
 */
function _updateCache(data) {

    for (let record in data) {

        let isLocal = _.findIndex(tempKeys, function (key) {
            return key.remoteId == data.id;
        });

        if (isLocal > -1) {
            data[record].id = tempKeys[isLocal].localId;
        }

        let isCached = _.findIndex(cache, function (item) {
            return data[record].id == item.id;
        });

        if (isCached == -1) {
            cache.push(data[record]);

            let previousSiblingId = cache.length == 0 ? null : cache[cache.length - 1];
            postMessage({
                event: 'child_added',
                result: data[record],
                previousSiblingId: previousSiblingId ? previousSiblingId.id : null
            });
        }
        else {
            if (!_.isEqual(data[record], cache[isCached])) {
                cache.splice(isCached, 1, data[record]);
                let previousSibling = isCached == 0 ? null : cache[isCached - 1];
                postMessage({
                    event: 'child_changed',
                    result: data[record],
                    previousSiblingId: previousSibling ? previousSibling.id : null
                });
            }
        }
    }
}


/**
 * Update the last polling timestamp so we only get the latest changes.
 * @param newDate
 * @private
 */
function _setLastUpdated(lastChangeToken) {

    retriever.params.changeToken = lastChangeToken;
}


/**
 * Refresh SharePoint with latest changes.
 * @private
 */
function _refresh() {
    if (retriever) {
        soapClient.call(retriever)
            .then((result)=> {
                let changes = result.data["soap:Envelope"]["soap:Body"][0].GetListItemChangesSinceTokenResponse[0].GetListItemChangesSinceTokenResult[0].listitems[0].Changes[0];
                let lastChangedToken = changes.$.LastChangeToken;

                _setLastUpdated(lastChangedToken);
                _handleDeleted(changes);

                let data = _getResults(result.data);
                _updateCache(data);

                postMessage({event: 'value', result: cache});
                setTimeout(_refresh, interval);

            }).catch(function (err) {

                setTimeout(_refresh, interval);
            });
    }
}

function _handleDeleted(result) {

    let changes = result.Id || null;

    if (changes && changes.length > 0) {

        for (let change in changes) {

            if (changes[change].$.ChangeType == "Delete") {

                let recordId = changes[change]._;

                let isLocal = _.findIndex(tempKeys, function (key) {
                    return key.remoteId == recordId;
                });

                if (isLocal > -1) {
                    recordId = tempKeys[isLocal].localId;
                }

                let cacheItem = _.findIndex(cache, function (item) {
                    return item.id == recordId;
                });

                postMessage({
                    event: 'child_removed',
                    result: cache[cacheItem]
                });
                cache.splice(cacheItem, 1);
            }
        }
    }
}

/**
 * Parse SharePoint response into formatted records
 * @param result
 * @returns {Array}
 * @private
 */
function _getResults(result) {

    let arrayOfObjects = [];
    let node = null;


    if (result["soap:Envelope"]["soap:Body"][0].GetListItemChangesSinceTokenResponse) {

        node = result["soap:Envelope"]["soap:Body"][0].GetListItemChangesSinceTokenResponse[0].GetListItemChangesSinceTokenResult[0].listitems[0]["rs:data"][0];

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

/**
 * Strip SharePoint record from SharePoint specifics
 * @param record
 * @returns {{}}
 * @private
 */
function _formatRecord(record) {
    let result = {};
    for (let attribute in record) {

        let name = attribute.replace('ows_', '');
        if (name == 'xmlns:z') continue;

        if (name == "ID") {
            name = "id";
            result[name] = record[attribute];
        }

        else if (record[attribute].indexOf(";#") > -1) {
            var keys = record[attribute].split(";#");
            var pairs = keys.length / 2;
            var assignable = pairs.length > 1 ? [] : {};
            for (var pair = 0; pair < pairs; pair++) {
                if (pairs > 1) assignable.push({id: keys[pair], value: keys[pair + 1]});
                else assignable = {id: keys[pair], value: keys[pair + 1]};
            }
            result[name] = assignable;
        }

        // map a number when that number is detected
        else if (!isNaN(record[attribute]))
            result[name] = parseFloat(record[attribute]);
        // default map 1-1
        else
            result[name] = record[attribute];
    }
    return result;
}


/**
 * Double check if given path is a valid path
 * @param path
 * @param endPoint
 * @returns {string}
 * @private
 */
function _ParsePath(path, endPoint) {

    var url = UrlParser(path);
    if (!url) console.log('Invalid datasource path provided!');

    var pathParts = url.path.split('/');
    var newPath = url.protocol + '://' + url.host + '/';
    for (var i = 0; i < pathParts.length; i++)
        newPath += pathParts[i] + '/';
    newPath += endPoint;
    return newPath;
};


/**
 * Get Default resource for Updating Lists
 * @returns {{url: string, service: string, method: string, params: string, headers: (Map|*)}}
 * @private
 */
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


/**
 * Get Default resource for Reading Lists
 * @returns {{url: string, service: string, method: string, params: string, headers: (Map|*)}}
 * @private
 */
function _GetListItemsDefaultConfiguration() {
    return {
        url: '',
        service: 'Lists',
        method: 'GetListItemChangesSinceToken',
        params: '',
        headers: new Map([
            ['SOAPAction', 'http://schemas.microsoft.com/sharepoint/soap/GetListItemChangesSinceToken'],
            ['Content-Type', 'text/xml']
        ])
    };
};


/**
 * Default interface for Get list
 * @returns {string}
 * @private
 */
function _GetListService() {
    return '_vti_bin/Lists.asmx';
};


/**
 * Default interface for Update list
 * @returns {string}
 * @private
 */
function _GetUserGroupService() {
    return '_vti_bin/UserGroup.asmx';
};
