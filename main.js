/**
 * Created by mysim1 on 15/06/15.
 */

import {SharePoint} from './SharePoint';


window.spworker1 = new SharePoint({ endPoint: 'https://bizboardapps.sharepoint.com/sites/Bizmark01/Offers' });
window.spworker1.on('child_added', function(data) {
    console.log('Added:', data);
});

window.spworker1.on('child_changed', function(data) {
    console.log('Changed:', data);
});

window.spworker1.on('child_removed', function(data) {
    console.log('Removed:', data);
});


window.spworker2 = new SharePoint({ endPoint: 'https://bizboardapps.sharepoint.com/sites/Bizmark01/Fotos' });
window.spworker2.on('child_added', function(data) {
    console.log('Added:', data);
});

window.spworker2.on('child_changed', function(data) {
    console.log('Changed:', data);
});

window.spworker2.on('child_removed', function(data) {
    console.log('Removed:', data);
});