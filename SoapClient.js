/**
 This Source Code is licensed under the MIT license. If a copy of the
 MIT-license was not distributed with this file, You can obtain one at:
 http://opensource.org/licenses/mit-license.html.

 @author: Hans van den Akker (mysim1)
 @license MIT
 @copyright Bizboard, 2015

 */

import XML2JS               from './xmljs';
import xmljs                from 'xml2js';
import _                    from 'lodash';
import {ObjectHelper}       from 'arva-utils/ObjectHelper';
import {PostRequest}        from 'arva-utils/request/RequestClient';
import {ParseStringToXml}   from 'arva-utils/request/XmlParser';

export class SoapClient {

    constructor() {

        /* Bind all local methods to the current object instance, so we can refer to "this"
         * in the methods as expected, even when they're called from event handlers.        */
        ObjectHelper.bindAllMethods(this, this);

        /* Hide all private properties (starting with '_') and methods from enumeration,
         * so when you do for( in ), only actual data properties show up. */
        ObjectHelper.hideMethodsAndPrivatePropertiesFromObject(this);

        /* Hide the priority field from enumeration, so we don't save it to the dataSource. */
        ObjectHelper.hidePropertyFromObject(Object.getPrototypeOf(this), 'length');
    }


    _applySoapTemplate(properties) {
        return _.template('<?xml version="1.0" encoding="utf-8"?>' +
            '<soap:Envelope ' +
            '  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ' +
            '  xmlns:xsd="http://www.w3.org/2001/XMLSchema" ' +
            '  xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">' +
            '<soap:Body>' +
            '<<%= method %> xmlns="http://schemas.microsoft.com/sharepoint/soap/">' +
            '<%= params %>' +
            '</<%= method %>>' +
            '</soap:Body>' +
            '</soap:Envelope>')(properties);
    }


    _serializeParams(params) {
        if (!params||params.length==0) return "";
        var data = { "root": params };
        var creator = new XML2JS();
        var payload = creator.json2xml_str(data);

        return payload.replace("<root>","").replace("</root>","");
    }

    _handleError(error) {
        return "Error!";
    }


    call(config) {

        var request;
        config = config || {};

        request = {
            url     : config.url,
            headers : config.headers,
            data    : this._applySoapTemplate({
                method: config.method,
                params: this._serializeParams(config.params)
            })
        };

        var context = this;
        // Make the request.
        return new Promise(function(resolve, reject) {

            PostRequest(request)
                .then(function(soapresult){

                    var parseString = xmljs.parseString;
                    parseString(soapresult.response, function (err, result) {
                        let results = result["soap:Envelope"]["soap:Body"][0].GetListItemsResponse[0].GetListItemsResult[0].listitems[0]["rs:data"][0];
                        let arrayOfObjects = [];
                        if (results.$.ItemCount !== '0') {
                            for (let row in results['z:row']) {
                                arrayOfObjects.push(results['z:row'][row].$);
                            }
                        }

                        resolve({ data: arrayOfObjects, timestamp: soapresult.timestamp });
                    });

                }, function(error){
                    reject(context._handleError(error));
                });
        });
    }
}