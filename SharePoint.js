/**
 * Created by mysim1 on 13/06/15.
 */
import EventEmitter     from 'eventemitter3';
//import worker           from 'worker!base64';
import {BlobHelper}     from 'arva-utils/BlobHelper';

// convert the worker role in base64 format to a sourcecodeblob
var DEBUG_WORKER = true;
//var SharePointWorkerSourcecodeBlob = BlobHelper.base64toBlob(worker);

/**
 * The SharePoint class will utilize a Web Worker to perform data operations. Running the data interfacing in a
 * seperate thread from the UI thread will ensure there is minimal interruption of the user interaction.
 */

export class SharePoint extends EventEmitter {

    constructor(options = {}) {
        super();

        if (DEBUG_WORKER) {
            this.worker = new Worker('worker.js');
        }
        else {
            let url = window.URL.createObjectURL(SharePointWorkerSourcecodeBlob);
            this.worker = new Worker(url);
        }

        this.worker.onmessage = function(msg) {
            this.emit(msg.data.event, msg.data.result);
        }.bind(this);

        // have the worker initialized
        this.worker.postMessage(['init', options]);
    }
}