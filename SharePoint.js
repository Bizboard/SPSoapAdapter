/**
 * Created by mysim1 on 13/06/15.
 */
import EventEmitter     from 'eventemitter3';
import worker           from 'worker.js!base64';

function b64toBlob(b64Data, contentType, sliceSize) {
    contentType = contentType || '';
    sliceSize = sliceSize || 512;

    var byteCharacters = atob(b64Data);
    var byteArrays = [];

    for (var offset = 0; offset < byteCharacters.length; offset += sliceSize) {
        var slice = byteCharacters.slice(offset, offset + sliceSize);

        var byteNumbers = new Array(slice.length);
        for (var i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
        }

        var byteArray = new Uint8Array(byteNumbers);

        byteArrays.push(byteArray);
    }

    var blob = new Blob(byteArrays, {type: contentType});
    return blob;
}

var sourcecodeBlob = b64toBlob(worker);

export class SharePoint extends EventEmitter {

    constructor(options = {}) {
        super();

        let url = window.URL.createObjectURL(sourcecodeBlob);
        this.worker = new Worker(url);

        this.worker.onmessage = (msg) => {
            this.emit(msg.data.event, msg.data.result);
        };

        // have the worker initialized
        this.worker.postMessage(['init', options]);
    }

    /**
     * Before we add the handler for the specific event. We first instruct the worker to perform according operations.
     * @param event
     * @param handler
     */
    on(event, handler) {
        if (event === 'value') {
            this.worker.postMessage(['value']);
        }

        if (event === 'child_added') {
            this.worker.postMessage(['child_added']);
        }

        if (event === 'child_changed') {
            this.worker.postMessage(['value']);
        }

        if (event === 'child_removed') {
            this.worker.postMessage(['value']);
        }

        super.on(event, handler);
    }
}