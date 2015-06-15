/* */ 
(function(process) {
  (function() {
    var XMLStringifier,
        bind = function(fn, me) {
          return function() {
            return fn.apply(me, arguments);
          };
        },
        hasProp = {}.hasOwnProperty;
    module.exports = XMLStringifier = (function() {
      function XMLStringifier(options) {
        this.assertLegalChar = bind(this.assertLegalChar, this);
        var key,
            ref,
            value;
        this.allowSurrogateChars = options != null ? options.allowSurrogateChars : void 0;
        ref = (options != null ? options.stringify : void 0) || {};
        for (key in ref) {
          if (!hasProp.call(ref, key))
            continue;
          value = ref[key];
          this[key] = value;
        }
      }
      XMLStringifier.prototype.eleName = function(val) {
        val = '' + val || '';
        return this.assertLegalChar(val);
      };
      XMLStringifier.prototype.eleText = function(val) {
        val = '' + val || '';
        return this.assertLegalChar(this.elEscape(val));
      };
      XMLStringifier.prototype.cdata = function(val) {
        val = '' + val || '';
        if (val.match(/]]>/)) {
          throw new Error("Invalid CDATA text: " + val);
        }
        return this.assertLegalChar(val);
      };
      XMLStringifier.prototype.comment = function(val) {
        val = '' + val || '';
        if (val.match(/--/)) {
          throw new Error("Comment text cannot contain double-hypen: " + val);
        }
        return this.assertLegalChar(val);
      };
      XMLStringifier.prototype.raw = function(val) {
        return '' + val || '';
      };
      XMLStringifier.prototype.attName = function(val) {
        return '' + val || '';
      };
      XMLStringifier.prototype.attValue = function(val) {
        val = '' + val || '';
        return this.attEscape(val);
      };
      XMLStringifier.prototype.insTarget = function(val) {
        return '' + val || '';
      };
      XMLStringifier.prototype.insValue = function(val) {
        val = '' + val || '';
        if (val.match(/\?>/)) {
          throw new Error("Invalid processing instruction value: " + val);
        }
        return val;
      };
      XMLStringifier.prototype.xmlVersion = function(val) {
        val = '' + val || '';
        if (!val.match(/1\.[0-9]+/)) {
          throw new Error("Invalid version number: " + val);
        }
        return val;
      };
      XMLStringifier.prototype.xmlEncoding = function(val) {
        val = '' + val || '';
        if (!val.match(/[A-Za-z](?:[A-Za-z0-9._-]|-)*/)) {
          throw new Error("Invalid encoding: " + val);
        }
        return val;
      };
      XMLStringifier.prototype.xmlStandalone = function(val) {
        if (val) {
          return "yes";
        } else {
          return "no";
        }
      };
      XMLStringifier.prototype.dtdPubID = function(val) {
        return '' + val || '';
      };
      XMLStringifier.prototype.dtdSysID = function(val) {
        return '' + val || '';
      };
      XMLStringifier.prototype.dtdElementValue = function(val) {
        return '' + val || '';
      };
      XMLStringifier.prototype.dtdAttType = function(val) {
        return '' + val || '';
      };
      XMLStringifier.prototype.dtdAttDefault = function(val) {
        if (val != null) {
          return '' + val || '';
        } else {
          return val;
        }
      };
      XMLStringifier.prototype.dtdEntityValue = function(val) {
        return '' + val || '';
      };
      XMLStringifier.prototype.dtdNData = function(val) {
        return '' + val || '';
      };
      XMLStringifier.prototype.convertAttKey = '@';
      XMLStringifier.prototype.convertPIKey = '?';
      XMLStringifier.prototype.convertTextKey = '#text';
      XMLStringifier.prototype.convertCDataKey = '#cdata';
      XMLStringifier.prototype.convertCommentKey = '#comment';
      XMLStringifier.prototype.convertRawKey = '#raw';
      XMLStringifier.prototype.convertListKey = '#list';
      XMLStringifier.prototype.assertLegalChar = function(str) {
        var chars,
            chr;
        if (this.allowSurrogateChars) {
          chars = /[\u0000-\u0008\u000B-\u000C\u000E-\u001F\uFFFE-\uFFFF]/;
        } else {
          chars = /[\u0000-\u0008\u000B-\u000C\u000E-\u001F\uD800-\uDFFF\uFFFE-\uFFFF]/;
        }
        chr = str.match(chars);
        if (chr) {
          throw new Error("Invalid character (" + chr + ") in string: " + str + " at index " + chr.index);
        }
        return str;
      };
      XMLStringifier.prototype.elEscape = function(str) {
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\r/g, '&#xD;');
      };
      XMLStringifier.prototype.attEscape = function(str) {
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;').replace(/\t/g, '&#x9;').replace(/\n/g, '&#xA;').replace(/\r/g, '&#xD;');
      };
      return XMLStringifier;
    })();
  }).call(this);
})(require("process"));
