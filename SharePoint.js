/**
 * Created by mysim1 on 13/06/15.
 */
import EventEmitter     from 'eventemitter3';
import _                from 'lodash';
import {UrlParser}      from 'arva-utils/request/UrlParser';
//import worker           from 'worker!base64';
import {BlobHelper}     from 'arva-utils/BlobHelper';

// convert the worker role in base64 format to a sourcecodeblob
var DEBUG_WORKER = true;
var SPWorkers = {};
//var SharePointWorkerSourcecodeBlob = BlobHelper.base64toBlob(worker);

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


        if (DEBUG_WORKER) {
            // if the worker doesn't exist. create it and register the message handlers
            // once so we can re-use the worker at a later moment.

            if (!SPWorkers[this.workerId]) {
                SPWorkers[this.workerId] = new Worker('worker.js');

                SPWorkers[this.workerId].onmessage = function(msg) {
                    if (msg.data.event === 'INVALIDSTATE') {
                        console.log("Worker Error:", msg.data.result);
                        delete SPWorkers[this.workerId];
                        this.workerId = msg.data.result.endPoint;
                    }
                    else {
                        this.emit(msg.data.event, msg.data.result, msg.data.previousSiblingId);
                    }
                }.bind(this);

                // have the worker initialized
                SPWorkers[this.workerId].postMessage(['init', options]);
            }
            //this.worker = new Worker('worker.js');
        }
        else {
            //let url = window.URL.createObjectURL(SharePointWorkerSourcecodeBlob);
            //this.worker = new Worker(url);
        }
    }

    set(model) {
        // if there is no ID. Make a temporary ID for reference in the main thread for the session scope
        let modelId = model.id;
        if (!modelId || modelId === 0) {
            model['_temporary-identifier'] = btoa(Math.floor((Math.random()*10000000000000000)));
        }

        SPWorkers[this.workerId].postMessage(['set', model]);
        return model;
    }

    remove(model) {
        SPWorkers[this.workerId].postMessage(['remove', model]);
    }
}