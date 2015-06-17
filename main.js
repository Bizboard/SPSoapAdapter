/**
 * Created by mysim1 on 15/06/15.
 */

import {SharePoint} from './SharePoint';


window.spworker = new SharePoint({ endPoint: 'https://bizboardapps.sharepoint.com/sites/Bizmark01', listName: 'Offers', fields: {} });
window.spworker.on('child_added', function(data) {
    console.log('Added:', data);
});

window.spworker.on('child_changed', function(data) {
    console.log('Changed:', data);
});

window.spworker.on('child_removed', function(data) {
    console.log('Removed:', data);
});