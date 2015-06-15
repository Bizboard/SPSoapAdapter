/**
 * Created by mysim1 on 13/06/15.
 */
import {SoapClient}     from './SoapClient';
import {UrlParser}      from 'arva-utils/request/UrlParser';
import _                from 'lodash';

// setup the soapClient.
var soapClient = new SoapClient();
var cache = [];
var window = this;
var global = this;

this.onmessage = function(event) {

    var operation = event.data[0];
    var args = event.data[1];

    if (operation === 'init') {
        // initialize with SharePoint configuration
        this._retriever = _GetListItemsDefaultConfiguration();

        this._retriever.url = _ParsePath(args.endPoint, _GetListService());
        this._retriever.params = {
            'listName': args.listName,
            //'viewName': '',
            //'viewFields': {
            //    'ViewFields': viewFieldsData
            //},
            'query': {
                'Query': {
                    'Where': {
                        'Geq': {
                            'FieldRef': [{
                                '_Name': 'Modified',
                                '_IncludeTimeValue': 'TRUE',
                                'Value': {
                                    '_Type': '_DateTime',
                                    '_value': '2020-08-10T10:00:00Z'
                                }
                            }]
                        }
                    }
                }
            },
            'queryOptions': {
                'QueryOptions': {
                    'IncludeMandatoryColumns': 'FALSE',
                    'ViewAttributes': {
                        '_Scope': 'RecursiveAll'
                    }
                }
            }
        };
    }

    if (operation === 'value') {

        soapClient.call(this._retriever)
        .then((data)=> {
                this.postMessage({ event: 'value', result: data });
            });
    }

    else if (operation === 'child_added') {
        setInterval(() => {
            soapClient.call(this._retriever)
                .then((data)=> {

                    for (let record in data) {

                        let isCached = _.findIndex(cache, function(item) {
                            return  data[record]['ows_ID'] == item['ows_ID'];
                        });

                        if (isCached == -1) {
                            cache.push(data[record]);
                            this.postMessage({ event: 'child_added', result: data[record] });
                        }

                    }
                });
        }, 3000);
    }
};

function _ParsePath(path, endPoint) {

    var url = UrlParser(path);
    if (!url) console.log('Invalid datasource path provided!');

    var pathParts = url.path.split('/');
    var newPath = url.protocol + '://' + url.host + '/';
    for(var i=0;i<pathParts.length;i++)
        newPath += pathParts[i] + '/';
    newPath += endPoint;
    return newPath;
};


function _UpdateListItemsDefaultConfiguration() {
    return {
        url: '',
        service: 'Lists',
        method: 'UpdateListItems',
        params: '',
        headers: new Map([
            ['SOAPAction', 'http://schemas.microsoft.com/sharepoint/soap/UpdateListItems'],
            ['Content-Type', 'text/xml']
        ])
    };
};

function _GetListItemsDefaultConfiguration() {
    return {
        url: '',
        service: 'Lists',
        method: 'GetListItems',
        params: '',
        headers: new Map([
            ['SOAPAction', 'http://schemas.microsoft.com/sharepoint/soap/GetListItems'],
            ['Content-Type', 'text/xml']
        ])
    };
};

function _GetListService() {
    return '_vti_bin/Lists.asmx';
};



function _GetUserGroupService() {
    return '_vti_bin/UserGroup.asmx';
};
