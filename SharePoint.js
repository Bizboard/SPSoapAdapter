/**
 * Created by mysim1 on 13/06/15.
 */
import EventEmitter     from 'eventemitter3';
import worker           from 'worker.js!text';

export class SharePoint extends EventEmitter {

    constructor(options = {}) {
        super();

        //let url = window.URL.createObjectURL(new Blob([worker]));
        this.worker = new Worker('worker.js');

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