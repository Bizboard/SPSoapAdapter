/**
 * Created by mysim1 on 13/06/15.
 */

import _                from 'lodash';
import EventEmitter     from 'eventemitter3';
import {UrlParser}      from 'arva-utils/request/UrlParser';
import {BlobHelper}     from 'arva-utils/BlobHelper';

let DEBUG_WORKER = true;
let SPWorker = new Worker('worker.js');
let workerEvents = new EventEmitter();
SPWorker.onmessage = (messageEvent) => { workerEvents.emit('message', messageEvent); };

/**
 * The SharePoint class will utilize a Web Worker to perform data operations. Running the data interfacing in a
 * seperate thread from the UI thread will ensure there is minimal interruption of the user interaction.
 */

export class SharePoint extends EventEmitter {

    constructor(options = {}) {
        super();

        let endpoint = UrlParser(options.endPoint);
        if (!endpoint) throw Error('Invalid configuration.');

        this.subscriberID = SharePoint.hashCode(endpoint.path + options.query + options.orderBy + options.limit);
        this.options = options;

        workerEvents.on('message', this._onMessage.bind(this));
    }

    once(event, handler, context) {
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
        super.on(event, () => { if (event === 'value') { this._ready = true; } }, this);
        super.on(event, handler, context);
    }

    set(model) {
        /* If there is no ID, make a temporary ID for reference in the main thread for the session scope. */
        let modelId = model.id;
        if (!modelId || modelId === 0) {
            model['_temporary-identifier'] = Math.floor((Math.random() * 2000000000));
        }

        SPWorker.postMessage({
            subscriberID: this.subscriberID,
            endPoint: this.options.endPoint,
            listName: this.options.listName,
            operation: 'set',
            model: model
        });
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
        /* Initialise the worker */
        SPWorker.postMessage(_.extend({}, this.options, {
            subscriberID: this.subscriberID,
            operation: 'init'
        }));

        /* Grab any existing cached data for this path. There will be data if there are other
         * subscribers on the same path already. */
        SPWorker.postMessage(_.extend({}, this.options, {
            subscriberID: this.subscriberID,
            operation: 'get_cache'
        }));
    }

    _onMessage(messageEvent) {
        let message = messageEvent.data;
        /* Ignore messages not meant for this SharePoint instance. */
        if (message.subscriberID !== this.subscriberID) { return; }

        if (message.event === 'cache_data') {
            this._handleCacheData(message.cache);
        } else if (message.event !== 'INVALIDSTATE') {
            this.emit(message.event, message.result, message.previousSiblingId);
        } else {
            console.log("Worker Error:", message.result);
        }
    }

    _handleCacheData(cacheData) {
        if(!cacheData) { cacheData = []; }

        /* Only emit cached data if we haven't seen a 'value' event yet */
        if (!this._ready) {
            for (let index = 0; index < cacheData.length; i++) {
                let child = cacheData[index];
                let previousChildID = index > 0 ? cacheData[index - 1] : null;
                this.emit('child_added', child, previousChildID);
            }
            this.emit('value', cacheData.length ? cacheData : null);
        }
    }

    static hashCode(s) {
        return s.split("").reduce(function (a, b) {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a
        }, 0);
    }
}
