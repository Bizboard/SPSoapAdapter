/**
 * Created by mysim1 on 13/06/15.
 */

import _                from 'lodash';
import EventEmitter     from 'eventemitter3';
import {UrlParser}      from 'arva-utils/request/UrlParser';
import {BlobHelper}     from 'arva-utils/BlobHelper';

var DEBUG_WORKER = true;
var SPWorker = new Worker('worker.js');

/**
 * The SharePoint class will utilize a Web Worker to perform data operations. Running the data interfacing in a
 * seperate thread from the UI thread will ensure there is minimal interruption of the user interaction.
 */

export class SharePoint extends EventEmitter {

    constructor(options = {}) {
        super();

        let endpoint = UrlParser(options.endPoint);
        if (!endpoint) throw Error('Invalid configuration.');

        this.path = endpoint.path;

        SPWorker.onmessage = this._onMessage.bind(this);

        /* Initialise the worker */
        options.path = this.path;
        options.operation = 'init';
        SPWorker.postMessage(options);
    }

    set(model) {
        /* If there is no ID. Make a temporary ID for reference in the main thread for the session scope. */
        let modelId = model.id;
        if (!modelId || modelId === 0) {
            model['_temporary-identifier'] = Math.floor((Math.random() * 2000000000));
        }

        SPWorker.postMessage({path: this.path, operation: 'set', model: model});
        return model;
    }

    remove(model) {
        SPWorker.postMessage({path: this.path, operation: 'remove', model: model});
    }

    _onMessage(messageEvent) {
        let message = messageEvent.data;
        /* Ignore messages not meant for this SharePoint instance. */
        if(message.path !== this.path) { return; }

        if (message.event === 'INVALIDSTATE') {
            console.log("Worker Error:", message.result);
            this.path = message.result.endPoint;
        } else {
            this.emit(message.event, message.result, message.previousSiblingId);
        }
    }
}