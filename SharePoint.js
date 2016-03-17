/**
 * Created by mysim1 on 13/06/15.
 */

import _                from 'lodash';
import EventEmitter     from 'eventemitter3';
import {Settings}       from './Settings.js';
import {UrlParser}      from 'arva-utils/request/UrlParser.js';
import {ObjectHelper}   from 'arva-utils/ObjectHelper.js';
import {BlobHelper}     from 'arva-utils/BlobHelper.js';

let DEBUG_WORKER = true;
let SPWorker = new Worker('worker.js');
let workerEvents = new EventEmitter();
SPWorker.onmessage = (messageEvent) => {
    workerEvents.emit('message', messageEvent);
};

/**
 * The SharePoint class will utilize a Web Worker to perform data operations. Running the data interfacing in a
 * seperate thread from the UI thread will ensure there is minimal interruption of the user interaction.
 */

export class SharePoint extends EventEmitter {

    constructor(options = {}) {
        super();

        ObjectHelper.bindAllMethods(this, this);

        let endpoint = UrlParser(options.endPoint);
        if (!endpoint) throw Error('Invalid configuration.');

        this.subscriberID = SharePoint.hashCode(endpoint.path + JSON.stringify(options.query) + options.orderBy + options.limit);
        this.options = options;
        this.cache = null;

        workerEvents.on('message', this._onMessage.bind(this));
    }

    getAuth(callback, context = this) {
        super.once('auth_result', (authData) => this._handleAuthResult(authData, callback, context));

        /* Grab any existing cached data for this path. There will be data if there are other
         * subscribers on the same path already. */
        SPWorker.postMessage(_.extend({}, this.options, {
            subscriberID: this.subscriberID,
            endPoint: this.options.endPoint,
            operation: 'get_auth'
        }));
    }

    once(event, handler, context = this) {
        this.on(event, function () {
            handler.call(context, ...arguments);
            this.off(event, handler, context);
        }.bind(this), context);
    }

    on(event, handler, context = this) {

        /* Hold off on initialising the actual SharePoint connection until someone actually subscribes to data changes. */
        if (!this._initialised) {
            this._initialise();
            this._initialised = true;
        }

        /* Fix to make Arva-ds PrioArray.add() work, by immediately returning the model data with an ID when the model is created. */
        if (!this._ready && this.cache && event === 'value') {
            handler.call(context, this.cache);
        }

        if (this._ready && event === 'value') {
            this.once('cache_data', (cacheData) => this._handleCacheData(cacheData, event, handler, context));

            /* Grab any existing cached data for this path. There will be data if there are other
             * subscribers on the same path already. */
            SPWorker.postMessage(_.extend({}, this.options, {
                subscriberID: this.subscriberID,
                operation: 'get_cache'
            }));
        }

        /* Tell the SharePoint worker that we want to be subscribed to changes from now on (can be called multiple times) */
        SPWorker.postMessage(_.extend({}, this.options, {
            subscriberID: this.subscriberID,
            operation: 'subscribe'
        }));

        super.on(event, handler, context);
    }

    off(event, handler) {
        let amountRemoved;
        if (event && handler) {
            this.removeListener(event, handler);
            amountRemoved = 1;
        } else {
            this.removeAllListeners(event);
            amountRemoved = this.listeners(event).length;
        }

        for (let i = 0; i < amountRemoved; i++) {
            /* Tell the Manager that this subscription is cancelled and no longer requires refreshed data from SharePoint. */
            SPWorker.postMessage(_.extend({}, this.options, {
                subscriberID: this.subscriberID,
                operation: 'dispose'
            }));
        }
    }

    set(model) {
        /* Hold off on initialising the actual SharePoint connection until someone actually subscribes to data changes. */
        if (!this._initialised) {
            this._initialise();
            this._initialised = true;
        }

        /* If there is no ID, make a temporary ID for reference in the main thread for the session scope. */
        let modelId = model.id;
        if (!modelId || modelId === 0) {
            model['_temporary-identifier'] = `${Settings.localKeyPrefix}${Math.floor((Math.random() * 2000000000))}`;
        }

        SPWorker.postMessage({
            subscriberID: this.subscriberID,
            endPoint: this.options.endPoint,
            listName: this.options.listName,
            operation: 'set',
            model: model
        });


        if (model['_temporary-identifier']) {
            /* Set the model's ID to the temporary one so it can be used to query the dataSource with. */
            if (model.disableChangeListener) {
                model.disableChangeListener();
            }
            model.id = model['_temporary-identifier'];
            if (model.enableChangeListener) {
                model.enableChangeListener();
            }
        }

        /* Cache is used to immediately trigger the value callback if a new model was created and subscribes to its own changes. */
        this.cache = model;
        return model;
    }

    remove(model) {
        SPWorker.postMessage({
            subscriberID: this.subscriberID,
            endPoint: this.options.endPoint,
            listName: this.options.listName,
            operation: 'remove',
            model: model
        });
    }

    _initialise() {

        super.once('value', () => {
            this._ready = true;
        });

        /* Initialise the worker */
        SPWorker.postMessage(_.extend({}, this.options, {
            subscriberID: this.subscriberID,

            operation: 'init'
        }));
    }

    _onMessage(messageEvent) {
        let message = messageEvent.data;

        /* Ignore messages not meant for this SharePoint instance. */
        if (message.subscriberID !== this.subscriberID) {
            return;
        }
        let messageData = message.data;
        if (message.event === 'doSet') {
            let splitEndpoint = this.options.endPoint.split('/');
            let rootAddress = splitEndpoint.slice(0, splitEndpoint.indexOf(messageData.listName)).join('/');
            /* Uses the global object SP, be sure to include it in the HTML! (for now) */
            let clientContext = new SP.ClientContext(rootAddress);
            let list = clientContext.get_web().get_lists().getByTitle(messageData.listName);

            let item;
            if (messageData.method === "New") {
                item = list.addItem(new SP.ListItemCreationInformation());
            } else {
                item = list.getItemById(Number.parseInt(messageData.data.id));
            }
            let newData = messageData.data;
            for (var prop in newData) {
                let fieldValue = newData[prop];
                if (prop == "id" || typeof(fieldValue) == "undefined") continue;
                if (prop == "priority" || prop == "_temporary-identifier" || prop == "remoteId") continue;
                let value = fieldValue;
                if (typeof fieldValue === 'object') {
                    if (fieldValue.id && fieldValue.value) {
                        /* This is a SharePoint lookup type field. We must write it as a specially formatted value instead of an id/value object. */
                        value = new SP.FieldLookupValue();
                        let id = '' + fieldValue.id;
                        /* Replace local keys with remote keys */
                        let tempKey = _.find(messageData.tempKeys, (tempKey) => tempKey.localId === id);
                        value.set_lookupId(tempKey ? tempKey.remoteId : id);
                        //fieldValue = `${fieldValue.id};#`;
                    } else if (fieldValue.length !== undefined && fieldValue[0] && fieldValue[0].id && fieldValue[0].value) {
                        // TODO: FOR LATER
                        /* This is a SharePoint LookupMulti field. It is specially formatted like above. */
                        /*let IDs = _.pluck(fieldValue, 'id');
                         fieldValue = IDs.join(';#;#');*/
                    } else {
                        continue;
                    }
                } else if (value === ''){
                    continue;
                }
                item.set_item(prop, value);

            }
            item.update();
            clientContext.load(item);
            clientContext.executeQueryAsync(() => {

                let model = {id: messageData.method === "New" ? '' + item.get_id() : messageData.data.id};
                let retrievedInfo = item.get_fieldValues();
                for(let field in retrievedInfo){
                    let value = retrievedInfo[field];
                    if(value && value.get_lookupId && value.get_lookupValue){
                        let id = '' + value.get_lookupId();
                        let tempKey = _.find(messageData.tempKeys, (tempKey) => tempKey.remoteId === id);
                        model[field] = {id: tempKey ? tempKey.localId : id, value: value.get_lookupValue()};
                    } else if(typeof value === 'string'){
                        model[field] = value;
                    }
                }

                SPWorker.postMessage({
                    subscriberID: this.subscriberID,
                    endPoint: this.options.endPoint,
                    listName: this.options.listName,
                    operation: 'didSet' + messageData.secretKey,
                    model
                });
            }, (sender, args) => {
                console.log('Request failed. ' + args.get_message() + '\n' + args.get_stackTrace());
            });
            return;
        }

        if (message.event === 'cache_data') {
            this.emit('cache_data', message.cache);
        } else if (message.event === 'auth_result') {
            this.emit('auth_result', message.auth);
        } else if (message.event !== 'INVALIDSTATE') {
            this.emit(message.event, message.result, message.previousSiblingId);
        } else {
            console.log("Worker Error:", message.result);
        }
    }

    _handleCacheData(cacheData, event, handler, context) {
        if (!cacheData) {
            cacheData = [];
        }

        if (event === 'child_added') {
            for (let index = 0; index < cacheData.length; index++) {
                let child = cacheData[index];
                let previousChildID = index > 0 ? cacheData[index - 1] : null;
                handler.call(context, child, previousChildID);
            }
        } else if (event === 'value') {
            handler.call(context, cacheData.length ? cacheData : null);
        }
    }

    _handleAuthResult(authData, handler, context = this) {
        if (!authData) {
            authData = {};
        }

        handler.call(context, authData);

    }

    static hashCode(s) {
        return s.split("").reduce(function (a, b) {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a
        }, 0);
    }
}
