/**
 * Created by mysim1 on 15/06/15.
 */

import {SharePoint} from './SharePoint';


window.spworker1 = new SharePoint({
    endPoint: 'https://bizboardapps.sharepoint.com/sites/Bizmark02/Offers',
    query: {
        'Query': {
            'Where': {
                'Eq': {
                    'FieldRef': {
                        '_Name': 'Category',
                        "_LookupId": "TRUE"
                    },
                    'Value': {
                        '_Type': 'Lookup',
                        '__text': 7
                    }
                }
            }
        }
    }
});

window.spworker1.on('child_added', function(data) {
    console.log('Added:', data);
});

window.spworker1.on('child_changed', function(data) {
    console.log('Changed:', data);
});

window.spworker1.on('child_removed', function(data) {
    console.log('Removed:', data);
});

