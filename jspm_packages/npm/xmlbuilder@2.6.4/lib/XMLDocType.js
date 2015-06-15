/* */ 
(function() {
  var XMLCData,
      XMLComment,
      XMLDTDAttList,
      XMLDTDElement,
      XMLDTDEntity,
      XMLDTDNotation,
      XMLDocType,
      XMLProcessingInstruction,
      create,
      isObject;
  create = require("lodash/object/create");
  isObject = require("lodash/lang/isObject");
  XMLCData = require("./XMLCData");
  XMLComment = require("./XMLComment");
  XMLDTDAttList = require("./XMLDTDAttList");
  XMLDTDEntity = require("./XMLDTDEntity");
  XMLDTDElement = require("./XMLDTDElement");
  XMLDTDNotation = require("./XMLDTDNotation");
  XMLProcessingInstruction = require("./XMLProcessingInstruction");
  module.exports = XMLDocType = (function() {
    function XMLDocType(parent, pubID, sysID) {
      var ref,
          ref1;
      this.documentObject = parent;
      this.stringify = this.documentObject.stringify;
      this.children = [];
      if (isObject(pubID)) {
        ref = pubID, pubID = ref.pubID, sysID = ref.sysID;
      }
      if (sysID == null) {
        ref1 = [pubID, sysID], sysID = ref1[0], pubID = ref1[1];
      }
      if (pubID != null) {
        this.pubID = this.stringify.dtdPubID(pubID);
      }
      if (sysID != null) {
        this.sysID = this.stringify.dtdSysID(sysID);
      }
    }
    XMLDocType.prototype.clone = function() {
      return create(XMLDocType.prototype, this);
    };
    XMLDocType.prototype.element = function(name, value) {
      var child;
      child = new XMLDTDElement(this, name, value);
      this.children.push(child);
      return this;
    };
    XMLDocType.prototype.attList = function(elementName, attributeName, attributeType, defaultValueType, defaultValue) {
      var child;
      child = new XMLDTDAttList(this, elementName, attributeName, attributeType, defaultValueType, defaultValue);
      this.children.push(child);
      return this;
    };
    XMLDocType.prototype.entity = function(name, value) {
      var child;
      child = new XMLDTDEntity(this, false, name, value);
      this.children.push(child);
      return this;
    };
    XMLDocType.prototype.pEntity = function(name, value) {
      var child;
      child = new XMLDTDEntity(this, true, name, value);
      this.children.push(child);
      return this;
    };
    XMLDocType.prototype.notation = function(name, value) {
      var child;
      child = new XMLDTDNotation(this, name, value);
      this.children.push(child);
      return this;
    };
    XMLDocType.prototype.cdata = function(value) {
      var child;
      child = new XMLCData(this, value);
      this.children.push(child);
      return this;
    };
    XMLDocType.prototype.comment = function(value) {
      var child;
      child = new XMLComment(this, value);
      this.children.push(child);
      return this;
    };
    XMLDocType.prototype.instruction = function(target, value) {
      var child;
      child = new XMLProcessingInstruction(this, target, value);
      this.children.push(child);
      return this;
    };
    XMLDocType.prototype.root = function() {
      return this.documentObject.root();
    };
    XMLDocType.prototype.document = function() {
      return this.documentObject;
    };
    XMLDocType.prototype.toString = function(options, level) {
      var child,
          i,
          indent,
          len,
          newline,
          offset,
          pretty,
          r,
          ref,
          ref1,
          ref2,
          ref3,
          space;
      pretty = (options != null ? options.pretty : void 0) || false;
      indent = (ref = options != null ? options.indent : void 0) != null ? ref : '  ';
      offset = (ref1 = options != null ? options.offset : void 0) != null ? ref1 : 0;
      newline = (ref2 = options != null ? options.newline : void 0) != null ? ref2 : '\n';
      level || (level = 0);
      space = new Array(level + offset + 1).join(indent);
      r = '';
      if (pretty) {
        r += space;
      }
      r += '<!DOCTYPE ' + this.root().name;
      if (this.pubID && this.sysID) {
        r += ' PUBLIC "' + this.pubID + '" "' + this.sysID + '"';
      } else if (this.sysID) {
        r += ' SYSTEM "' + this.sysID + '"';
      }
      if (this.children.length > 0) {
        r += ' [';
        if (pretty) {
          r += newline;
        }
        ref3 = this.children;
        for (i = 0, len = ref3.length; i < len; i++) {
          child = ref3[i];
          r += child.toString(options, level + 1);
        }
        r += ']';
      }
      r += '>';
      if (pretty) {
        r += newline;
      }
      return r;
    };
    XMLDocType.prototype.ele = function(name, value) {
      return this.element(name, value);
    };
    XMLDocType.prototype.att = function(elementName, attributeName, attributeType, defaultValueType, defaultValue) {
      return this.attList(elementName, attributeName, attributeType, defaultValueType, defaultValue);
    };
    XMLDocType.prototype.ent = function(name, value) {
      return this.entity(name, value);
    };
    XMLDocType.prototype.pent = function(name, value) {
      return this.pEntity(name, value);
    };
    XMLDocType.prototype.not = function(name, value) {
      return this.notation(name, value);
    };
    XMLDocType.prototype.dat = function(value) {
      return this.cdata(value);
    };
    XMLDocType.prototype.com = function(value) {
      return this.comment(value);
    };
    XMLDocType.prototype.ins = function(target, value) {
      return this.instruction(target, value);
    };
    XMLDocType.prototype.up = function() {
      return this.root();
    };
    XMLDocType.prototype.doc = function() {
      return this.document();
    };
    return XMLDocType;
  })();
}).call(this);
