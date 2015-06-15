/**
 * Created by mysim1 on 15/06/15.
 */

import {SharePoint} from './SharePoint';


var spWorker = new SharePoint({ endPoint: 'https://bizboardapps.sharepoint.com/sites/Bizmark01', listName: 'Offers'});
spWorker.on('child_added', function(data) {
    console.log(data);
});