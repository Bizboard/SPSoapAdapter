/**
 * Created by tom on 28/08/15.
 */

import {SharePointClient}               from './SharePointClient.js';

let clients = {};

onmessage = function(messageEvent) {
    let message = messageEvent.data;
    let {subscriberID, operation} = message;
    let client = clients[subscriberID];
    let clientExisted = !!client;

    /* If the requested client doesn't exist yet, create a new instance. */
    if(!clientExisted) {
        /* This automatically subscribes to changes, so for a set/remove operation that
         * isn't interested in listening to changes we'll need to unsubscribe again after the operation. */
        client = clients[subscriberID] = new SharePointClient(message);
    }

    switch(operation) {
        case 'init':
            client.on('message', (message) => {
                message.subscriberID = subscriberID;
                postMessage(message);
            });
            break;
        case 'set':
            client.set(message.model);
            /* If the client was created for this set operation,
             * cancel all subscriptions that were automatically created on instantiation. */
            if(!clientExisted) { client.dispose(); }
            break;
        case 'remove':
            client.remove(message.model);
            /* If the client was created for this remove operation,
             * cancel all subscriptions that were automatically created on instantiation. */
            if(!clientExisted) { client.dispose(); }
            break;
        case 'get_cache':
            let cacheData = client.cache;
            postMessage({
                subscriberID: subscriberID,
                event: 'cache_data',
                cache: cacheData
            });
            break;
    }
};