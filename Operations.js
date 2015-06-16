/**
 * Created by mysim1 on 13/06/15.
 */
import {SoapClient}     from './SoapClient';
import {UrlParser}      from 'arva-utils/request/UrlParser';
import _                from 'lodash';

// setup the soapClient.
var soapClient = new SoapClient();
var cache = [];
var retriever = null;
var window = this;
var global = this;
var interval = 3000;


this.onmessage = function(event) {

    var operation = event.data[0];
    var args = event.data[1];


    if (operation === 'init') {
        // initialize with SharePoint configuration
        retriever = _GetListItemsDefaultConfiguration();

        retriever.url = _ParsePath(args.endPoint, _GetListService());
        retriever.params = {
            'listName': args.listName,
            'viewFields': {
                'ViewFields': ''
            },
            'query': {
                'Query': {
                    'Where': {
                        'Gt': {
                            'FieldRef': {
                                '_Name': 'Modified'
                            },
                            'Value': {
                                '_Type': 'DateTime',
                                '_IncludeTimeValue': 'TRUE',
                                '__text': new Date(0).toISOString()
                            }
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

        _refresh();
        console.log('not blocking');
    }

    function _refresh() {
        soapClient.call(retriever)
            .then((result)=> {


                _setLastUpdated(result.timestamp);

                for (let record in result.data) {

                    let isCached = _.findIndex(cache, function(item) {
                        return  result.data[record]['ows_ID'] == item['ows_ID'];
                    });

                    if (isCached == -1) {
                        cache.push(result.data[record]);
                        postMessage({ event: 'child_added', result: result.data[record] });
                    }
                    else {
                        if (!_.isEqual(result.data[record], cache[isCached])) {
                            cache.splice(isCached, 1, result.data[record]);
                            postMessage({event: 'child_changed', result: result.data[record]});
                        }
                    }
                }

                postMessage({ event: 'value', result: cache });

                setTimeout(_refresh, interval);
            }).catch(function(err){

                setTimeout(_refresh, interval);
            });
    }

    function _setLastUpdated(newDate) {
        if (newDate) {
            let dateObject = new Date(newDate);
            let offset = dateObject.getTimezoneOffset();
            dateObject.setTime(dateObject.getTime() + (offset*-1)*60*1000);
            retriever.params.query.Query.Where.Gt.Value.__text = dateObject.toISOString();
        }
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
