/**
 * Created by tom on 28/08/15.
 */

import {SharePointClient}               from './SharePointClient.js';

let clients = {};

onmessage = function(messageEvent) {
    let message = messageEvent.data;
    let {path, operation} = message;
    let client = clients[path];

    switch(operation) {
        case 'init':
            if(!client) {
                client = clients[path] = new SharePointClient(message);
            }
            client.on('message', (message) => {
                message.path = path;
                postMessage(message);
            });
            break;
        case 'set':
            if(client) { client.set(message.model); }
            break;
        case 'remove':
            if(client) { client.remove(message.model); }
            break;
    }
};