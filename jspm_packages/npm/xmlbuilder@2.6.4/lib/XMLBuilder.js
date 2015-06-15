/* */ 
(function() {
  var XMLBuilder,
      XMLDeclaration,
      XMLDocType,
      XMLElement,
      XMLStringifier;
  XMLStringifier = require("./XMLStringifier");
  XMLDeclaration = require("./XMLDeclaration");
  XMLDocType = require("./XMLDocType");
  XMLElement = require("./XMLElement");
  module.exports = XMLBuilder = (function() {
    function XMLBuilder(name, options) {
      var root,
          temp;
      if (name == null) {
        throw new Error("Root element needs a name");
      }
      if (options == null) {
        options = {};
      }
      this.options = options;
      this.stringify = new XMLStringifier(options);
      temp = new XMLElement(this, 'doc');
      root = temp.element(name);
      root.isRoot = true;
      root.documentObject = this;
      this.rootObject = root;
      if (!options.headless) {
        root.declaration(options);
        if ((options.pubID != null) || (options.sysID != null)) {
          root.doctype(options);
        }
      }
    }
    XMLBuilder.prototype.root = function() {
      return this.rootObject;
    };
    XMLBuilder.prototype.end = function(options) {
      return this.toString(options);
    };
    XMLBuilder.prototype.toString = function(options) {
      var indent,
          newline,
          offset,
          pretty,
          r,
          ref,
          ref1,
          ref2;
      pretty = (options != null ? options.pretty : void 0) || false;
      indent = (ref = options != null ? options.indent : void 0) != null ? ref : '  ';
      offset = (ref1 = options != null ? options.offset : void 0) != null ? ref1 : 0;
      newline = (ref2 = options != null ? options.newline : void 0) != null ? ref2 : '\n';
      r = '';
      if (this.xmldec != null) {
        r += this.xmldec.toString(options);
      }
      if (this.doctype != null) {
        r += this.doctype.toString(options);
      }
      r += this.rootObject.toString(options);
      if (pretty && r.slice(-newline.length) === newline) {
        r = r.slice(0, -newline.length);
      }
      return r;
    };
    return XMLBuilder;
  })();
}).call(this);
