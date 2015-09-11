/**
 * Created by tom on 28/08/15.
 */

import {SharePointClient}               from './SharePointClient.js';

let clients = {};

onmessage = function(messageEvent) {
    let message = messageEvent.data;
    let {subscriberID, operation} = message;
    let client = clients[subscriberID];

    switch(operation) {
        case 'init':
            if(!client) {
                client = clients[subscriberID] = new SharePointClient(message);
            }
            client.on('message', (message) => {
                message.subscriberID = subscriberID;
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