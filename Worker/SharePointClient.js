/**
 * Created by mysim1 on 13/06/15.
 */
import _                from 'lodash';
import EventEmitter     from 'eventemitter3';
import {SoapClient}     from './SoapClient';
import {ExistsRequest}  from 'arva-utils/request/RequestClient';
import {UrlParser}      from 'arva-utils/request/UrlParser';

// setup the soapClient.
var soapClient = new SoapClient();
var window = this;
var global = this;

export class SharePointClient extends EventEmitter {

    get refreshTimer() { return this._refreshTimer; }
    set refreshTimer(value) { this._refreshTimer = value; }

    constructor(options){
        super();

        this.settings = {};
        this.interval = 3000;
        this.retriever = null;
        this.cache = [];
        this.tempKeys = [];

        try {
            this.settings = this._intializeSettings(options);
            this._handleInit(this.settings);
            this._refresh();
        } catch (exception) {
            this.dispose();
        }
    }

    set(options) {
        return this._handleSet(options);
    }

    remove(options) {
        return this._handleRemove(options);
    }

    dispose() {
        clearTimeout(this.refreshTimer);
    }

    _intializeSettings(args) {

        // rebuild endpoint from polling server and interpreting response
        var url = UrlParser(args.endPoint);
        if (!url) throw new Error('Invalid DataSource path provided!');

        var newPath = url.protocol + '://' + url.host + '/';
        var pathParts = url.path.split('/');
        let identifiedParts = [];

        if(this._shouldSubscribeToChanges(args.path)) {
            while (!ExistsRequest(newPath + pathParts.join('/') + '/' + this._getListService())) {
                identifiedParts.unshift(pathParts.splice(pathParts.length - 1, 1)[0]);
            }
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
    _handleInit(args) {

        if (!args.listName) return;

        // initialize with SharePoint configuration
        this.retriever = this._getListItemsDefaultConfiguration();

        this.retriever.url = this._parsePath(args.endPoint, this._getListService());
        this.retriever.params = {
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
            this.retriever.params.query = args.query;
        }

        if (args.orderBy) {
            if (this.retriever.params.query) {
                this.retriever.params.query.OrderBy = {
                    "FieldRef": {
                        "_Ascending": "TRUE",
                        "_Name": args.orderBy
                    }
                };
            }
            else {
                this.retriever.params.query = {
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
            this.retriever.params.rowLimit = args.limit;
        }
    }


    /**
     * Add or Update a data record.
     * @private
     */
    _handleSet(newData) {
        var configuration = this._updateListItemsDefaultConfiguration();
        configuration.url = this._parsePath(this.settings.endPoint, this._getListService());
        var fieldCollection = [];
        var method = '';

        let isLocal = _.findIndex(this.tempKeys, function (key) {
            return key.localId == newData.id;
        });

        if (isLocal > -1) {
            newData.id = this.tempKeys[isLocal].remoteId;
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
            if (typeof fieldValue === "object" && fieldValue.id && fieldValue.value) {
                /* This is a SharePoint lookup type field. We must write it as a specially formatted value instead of an id/value object. */
                fieldValue = `${fieldValue.id};#${fieldValue.value}`;
            }

            fieldCollection.push({
                "_Name": prop,
                "__text": fieldValue
            });
        }

        configuration.params = {
            "listName": this.settings.listName,
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

                let data = this._getResults(result.data);
                if (data.length == 1) {

                    // push ID mapping for given session
                    if (newData['_temporary-identifier']) {
                        this.tempKeys.push({localId: newData['_temporary-identifier'], remoteId: data[0].id});
                    }
                    this._updateCache(data);
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
    _handleRemove(record) {
        var configuration = this._updateListItemsDefaultConfiguration();
        configuration.url = this._parsePath(this.settings.endPoint, this._getListService());
        var fieldCollection = [];

        let isLocal = _.findIndex(this.tempKeys, function (key) {
            return key.localId == record.id;
        });

        if (isLocal > -1) {
            record.id = this.tempKeys[isLocal].remoteId;
        }

        fieldCollection.push({
            "_Name": "ID",
            "__text": record.id
        });

        configuration.params = {
            "listName": this.settings.listName,
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
                this.emit('message', {event: 'child_removed', result: record});
            }, (error) => {
                console.log(error);
            });
    }


    /**
     * Update our cache and bubble child_added or child_changed events
     * @param data
     * @private
     */
    _updateCache(data) {
        let messages = [];
        for (let record in data) {

            let isLocal = _.findIndex(this.tempKeys, function (key) {
                return key.remoteId == data.id;
            });

            if (isLocal > -1) {
                data[record].id = this.tempKeys[isLocal].localId;
            }

            let isCached = _.findIndex(this.cache, function (item) {
                return data[record].id == item.id;
            });

            if (isCached == -1) {
                this.cache.push(data[record]);

                let previousSiblingId = this.cache.length == 0 ? null : this.cache[this.cache.length - 1];
                messages.push({
                    event: 'child_added',
                    result: data[record],
                    previousSiblingId: previousSiblingId ? previousSiblingId.id : null
                });
            }
            else {
                if (!_.isEqual(data[record], this.cache[isCached])) {
                    this.cache.splice(isCached, 1, data[record]);
                    let previousSibling = isCached == 0 ? null : this.cache[isCached - 1];
                    messages.push({
                        event: 'child_changed',
                        result: data[record],
                        previousSiblingId: previousSibling ? previousSibling.id : null
                    });
                }
            }
        }
        return messages;
    }


    /**
     * Update the last polling timestamp so we only get the latest changes.
     * @param newDate
     * @private
     */
    _setLastUpdated(lastChangeToken) {

        this.retriever.params.changeToken = lastChangeToken;
    }


    /**
     * Refresh SharePoint with latest changes.
     * @private
     */
    _refresh() {
        if (this.retriever) {
            soapClient.call(this.retriever)
                .then((result) => {
                    let changes = result.data["soap:Envelope"]["soap:Body"][0].GetListItemChangesSinceTokenResponse[0].GetListItemChangesSinceTokenResult[0].listitems[0].Changes[0];
                    let lastChangedToken = changes.$.LastChangeToken;

                    this._setLastUpdated(lastChangedToken);
                    let hasDeletions = this._handleDeleted(changes);

                    let data = this._getResults(result.data);
                    let messages = this._updateCache(data);

                    /* If any data was modified, emit a 'value' event. */
                    if (hasDeletions || data.length > 0) {
                        this.emit('message', {event: 'value', result: this.cache});
                    }

                    /* Emit any added/changed events. */
                    for (let message of messages) {
                        this.emit('message', message);
                    }

                    this.refreshTimer = setTimeout(this._refresh.bind(this), this.interval);

                }).catch((err) => {
                    this.emit('error', err);
                    this.refreshTimer = setTimeout(this._refresh.bind(this), this.interval);
                });
        }
    }

    _handleDeleted(result) {

        let changes = result.Id || null;

        if (changes && changes.length > 0) {

            for (let change in changes) {

                if (changes[change].$.ChangeType == "Delete") {

                    let recordId = changes[change]._;

                    let isLocal = _.findIndex(this.tempKeys, function (key) {
                        return key.remoteId == recordId;
                    });

                    if (isLocal > -1) {
                        recordId = this.tempKeys[isLocal].localId;
                    }

                    let cacheItem = _.findIndex(this.cache, function (item) {
                        return item.id == recordId;
                    });

                    this.emit('message', {
                        event: 'child_removed',
                        result: this.cache[cacheItem]
                    });
                    this.cache.splice(cacheItem, 1);
                }
            }

            return true;
        }

        return false;
    }

    /**
     * Parse SharePoint response into formatted records
     * @param result
     * @returns {Array}
     * @private
     */
    _getResults(result) {

        let arrayOfObjects = [];
        let node = null;


        if (result["soap:Envelope"]["soap:Body"][0].GetListItemChangesSinceTokenResponse) {

            node = result["soap:Envelope"]["soap:Body"][0].GetListItemChangesSinceTokenResponse[0].GetListItemChangesSinceTokenResult[0].listitems[0]["rs:data"][0];

            if (node) {
                if (node.$.ItemCount !== '0') {
                    for (let row in node['z:row']) {
                        let raw = node['z:row'][row].$;
                        let record = this._formatRecord(raw);
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
                        let record = this._formatRecord(raw);
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
    _formatRecord(record) {
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
    _parsePath(path, endPoint) {

        var url = UrlParser(path);
        if (!url) console.log('Invalid datasource path provided!');

        var pathParts = url.path.split('/');
        var newPath = url.protocol + '://' + url.host + '/';
        for (var i = 0; i < pathParts.length; i++)
            newPath += pathParts[i] + '/';
        newPath += endPoint;
        return newPath;
    }


    /**
     * Get Default resource for Updating Lists
     * @returns {{url: string, service: string, method: string, params: string, headers: (Map|*)}}
     * @private
     */
    _updateListItemsDefaultConfiguration() {
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
    }



    /**
     * Get Default resource for Reading Lists
     * @returns {{url: string, service: string, method: string, params: string, headers: (Map|*)}}
     * @private
     */
    _getListItemsDefaultConfiguration() {
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
    }




    /**
     * Default interface for Get list
     * @returns {string}
     * @private
     */
    _getListService() {
        return '_vti_bin/Lists.asmx';
    }



    /**
     * Default interface for Update list
     * @returns {string}
     * @private
     */
    _getUserGroupService() {
        return '_vti_bin/UserGroup.asmx';
    }

    /* Ignores all paths ending in a numeric value. These paths don't contain an array, but rather a specific child.
     * Binding to specific children is not supported by the SharePoint interface, and shouldn't be necessary either
     * because there is a subscription to child_changed events on the parent array containing this child. */
    _shouldSubscribeToChanges(path) {
        if(path[path.length - 1] === '/') { path = path.substring(0, path.length - 2); }

        let lastSlash = path.lastIndexOf('/');
        if(lastSlash) {
            let lastArgument = path.substring(lastSlash + 1);

            let isNumeric = (n) => {
                return !isNaN(parseFloat(n)) && isFinite(n);
            };

            return !isNumeric(lastArgument);
        }

        return true;
    }
}
