/**
 * Created by mysim1 on 13/06/15.
 */

import _                from 'lodash';
import EventEmitter     from 'eventemitter3';
import {UrlParser}      from 'arva-utils/request/UrlParser';
import {BlobHelper}     from 'arva-utils/BlobHelper';

var DEBUG_WORKER = true;
var SPWorkers = {};

/**
 * The SharePoint class will utilize a Web Worker to perform data operations. Running the data interfacing in a
 * seperate thread from the UI thread will ensure there is minimal interruption of the user interaction.
 */

export class SharePoint extends EventEmitter {

    constructor(options = {}) {
        super();

        let endpoint = UrlParser(options.endPoint);
        if (!endpoint) throw Error('Invalid configuration.');

        this.workerId = endpoint.path;

        /* If the worker doesn't exist. create it and register the message handlers
         * once so we can re-use the worker at a later moment. */
        if (!SPWorkers[this.workerId]) {
            SPWorkers[this.workerId] = new Worker('worker.js');

            this._setEventHandlers();

            /* Initialise the worker */
            SPWorkers[this.workerId].postMessage(['init', options]);
        } else {
            this._setEventHandlers();
        }
    }

    set(model) {
        /* If there is no ID. Make a temporary ID for reference in the main thread for the session scope. */
        let modelId = model.id;
        if (!modelId || modelId === 0) {
            model['_temporary-identifier'] = btoa(Math.floor((Math.random() * 10000000000000000)));
        }

        SPWorkers[this.workerId].postMessage(['set', model]);
        return model;
    }

    remove(model) {
        SPWorkers[this.workerId].postMessage(['remove', model]);
    }

    _setEventHandlers() {
        SPWorkers[this.workerId].onmessage = function (msg) {
            if (msg.data.event === 'INVALIDSTATE') {
                console.log("Worker Error:", msg.data.result);
                delete SPWorkers[this.workerId];
                this.workerId = msg.data.result.endPoint;
            }
            else {
                this.emit(msg.data.event, msg.data.result, msg.data.previousSiblingId);
            }
        }.bind(this);
    }
}