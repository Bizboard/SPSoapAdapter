/* */ 
"format global";
(function (global) {
  var babelHelpers = global.babelHelpers = {};

  babelHelpers.inherits = function (subClass, superClass) {
    if (typeof superClass !== "function" && superClass !== null) {
      throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
    }

    subClass.prototype = Object.create(superClass && superClass.prototype, {
      constructor: {
        value: subClass,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
    if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
  };

  babelHelpers.defaults = function (obj, defaults) {
    var keys = Object.getOwnPropertyNames(defaults);

    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      var value = Object.getOwnPropertyDescriptor(defaults, key);

      if (value && value.configurable && obj[key] === undefined) {
        Object.defineProperty(obj, key, value);
      }
    }

    return obj;
  };

  babelHelpers.createClass = (function () {
    function defineProperties(target, props) {
      for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
      }
    }

    return function (Constructor, protoProps, staticProps) {
      if (protoProps) defineProperties(Constructor.prototype, protoProps);
      if (staticProps) defineProperties(Constructor, staticProps);
      return Constructor;
    };
  })();

  babelHelpers.createDecoratedClass = (function () {
    function defineProperties(target, descriptors, initializers) {
      for (var i = 0; i < descriptors.length; i++) {
        var descriptor = descriptors[i];
        var decorators = descriptor.decorators;
        var key = descriptor.key;
        delete descriptor.key;
        delete descriptor.decorators;
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor || descriptor.initializer) descriptor.writable = true;

        if (decorators) {
          for (var f = 0; f < decorators.length; f++) {
            var decorator = decorators[f];

            if (typeof decorator === "function") {
              descriptor = decorator(target, key, descriptor) || descriptor;
            } else {
              throw new TypeError("The decorator for method " + descriptor.key + " is of the invalid type " + typeof decorator);
            }
          }

          if (descriptor.initializer !== undefined) {
            initializers[key] = descriptor;
            continue;
          }
        }

        Object.defineProperty(target, key, descriptor);
      }
    }

    return function (Constructor, protoProps, staticProps, protoInitializers, staticInitializers) {
      if (protoProps) defineProperties(Constructor.prototype, protoProps, protoInitializers);
      if (staticProps) defineProperties(Constructor, staticProps, staticInitializers);
      return Constructor;
    };
  })();

  babelHelpers.createDecoratedObject = function (descriptors) {
    var target = {};

    for (var i = 0; i < descriptors.length; i++) {
      var descriptor = descriptors[i];
      var decorators = descriptor.decorators;
      var key = descriptor.key;
      delete descriptor.key;
      delete descriptor.decorators;
      descriptor.enumerable = true;
      descriptor.configurable = true;
      if ("value" in descriptor || descriptor.initializer) descriptor.writable = true;

      if (decorators) {
        for (var f = 0; f < decorators.length; f++) {
          var decorator = decorators[f];

          if (typeof decorator === "function") {
            descriptor = decorator(target, key, descriptor) || descriptor;
          } else {
            throw new TypeError("The decorator for method " + descriptor.key + " is of the invalid type " + typeof decorator);
          }
        }
      }

      if (descriptor.initializer) {
        descriptor.value = descriptor.initializer.call(target);
      }

      Object.defineProperty(target, key, descriptor);
    }

    return target;
  };

  babelHelpers.defineDecoratedPropertyDescriptor = function (target, key, descriptors) {
    var _descriptor = descriptors[key];
    if (!_descriptor) return;
    var descriptor = {};

    for (var _key in _descriptor) descriptor[_key] = _descriptor[_key];

    descriptor.value = descriptor.initializer ? descriptor.initializer.call(target) : undefined;
    Object.defineProperty(target, key, descriptor);
  };

  babelHelpers.taggedTemplateLiteral = function (strings, raw) {
    return Object.freeze(Object.defineProperties(strings, {
      raw: {
        value: Object.freeze(raw)
      }
    }));
  };

  babelHelpers.taggedTemplateLiteralLoose = function (strings, raw) {
    strings.raw = raw;
    return strings;
  };

  babelHelpers.toArray = function (arr) {
    return Array.isArray(arr) ? arr : Array.from(arr);
  };

  babelHelpers.toConsumableArray = function (arr) {
    if (Array.isArray(arr)) {
      for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i];

      return arr2;
    } else {
      return Array.from(arr);
    }
  };

  babelHelpers.slicedToArray = (function () {
    function sliceIterator(arr, i) {
      var _arr = [];
      var _n = true;
      var _d = false;
      var _e = undefined;

      try {
        for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
          _arr.push(_s.value);

          if (i && _arr.length === i) break;
        }
      } catch (err) {
        _d = true;
        _e = err;
      } finally {
        try {
          if (!_n && _i["return"]) _i["return"]();
        } finally {
          if (_d) throw _e;
        }
      }

      return _arr;
    }

    return function (arr, i) {
      if (Array.isArray(arr)) {
        return arr;
      } else if (Symbol.iterator in Object(arr)) {
        return sliceIterator(arr, i);
      } else {
        throw new TypeError("Invalid attempt to destructure non-iterable instance");
      }
    };
  })();

  babelHelpers.slicedToArrayLoose = function (arr, i) {
    if (Array.isArray(arr)) {
      return arr;
    } else if (Symbol.iterator in Object(arr)) {
      var _arr = [];

      for (var _iterator = arr[Symbol.iterator](), _step; !(_step = _iterator.next()).done;) {
        _arr.push(_step.value);

        if (i && _arr.length === i) break;
      }

      return _arr;
    } else {
      throw new TypeError("Invalid attempt to destructure non-iterable instance");
    }
  };

  babelHelpers.objectWithoutProperties = function (obj, keys) {
    var target = {};

    for (var i in obj) {
      if (keys.indexOf(i) >= 0) continue;
      if (!Object.prototype.hasOwnProperty.call(obj, i)) continue;
      target[i] = obj[i];
    }

    return target;
  };

  babelHelpers.hasOwn = Object.prototype.hasOwnProperty;
  babelHelpers.slice = Array.prototype.slice;
  babelHelpers.bind = Function.prototype.bind;

  babelHelpers.defineProperty = function (obj, key, value) {
    if (key in obj) {
      Object.defineProperty(obj, key, {
        value: value,
        enumerable: true,
        configurable: true,
        writable: true
      });
    } else {
      obj[key] = value;
    }

    return obj;
  };

  babelHelpers.asyncToGenerator = function (fn) {
    return function () {
      var gen = fn.apply(this, arguments);
      return new Promise(function (resolve, reject) {
        var callNext = step.bind(null, "next");
        var callThrow = step.bind(null, "throw");

        function step(key, arg) {
          try {
            var info = gen[key](arg);
            var value = info.value;
          } catch (error) {
            reject(error);
            return;
          }

          if (info.done) {
            resolve(value);
          } else {
            Promise.resolve(value).then(callNext, callThrow);
          }
        }

        callNext();
      });
    };
  };

  babelHelpers.interopExportWildcard = function (obj, defaults) {
    var newObj = defaults({}, obj);
    delete newObj["default"];
    return newObj;
  };

  babelHelpers.interopRequireWildcard = function (obj) {
    if (obj && obj.__esModule) {
      return obj;
    } else {
      var newObj = {};

      if (obj != null) {
        for (var key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key];
        }
      }

      newObj["default"] = obj;
      return newObj;
    }
  };

  babelHelpers.interopRequireDefault = function (obj) {
    return obj && obj.__esModule ? obj : {
      "default": obj
    };
  };

  babelHelpers._typeof = function (obj) {
    return obj && obj.constructor === Symbol ? "symbol" : typeof obj;
  };

  babelHelpers._extends = Object.assign || function (target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];

      for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          target[key] = source[key];
        }
      }
    }

    return target;
  };

  babelHelpers.get = function get(object, property, receiver) {
    if (object === null) object = Function.prototype;
    var desc = Object.getOwnPropertyDescriptor(object, property);

    if (desc === undefined) {
      var parent = Object.getPrototypeOf(object);

      if (parent === null) {
        return undefined;
      } else {
        return get(parent, property, receiver);
      }
    } else if ("value" in desc) {
      return desc.value;
    } else {
      var getter = desc.get;

      if (getter === undefined) {
        return undefined;
      }

      return getter.call(receiver);
    }
  };

  babelHelpers.set = function set(object, property, value, receiver) {
    var desc = Object.getOwnPropertyDescriptor(object, property);

    if (desc === undefined) {
      var parent = Object.getPrototypeOf(object);

      if (parent !== null) {
        set(parent, property, value, receiver);
      }
    } else if ("value" in desc && desc.writable) {
      desc.value = value;
    } else {
      var setter = desc.set;

      if (setter !== undefined) {
        setter.call(receiver, value);
      }
    }

    return value;
  };

  babelHelpers.newArrowCheck = function (innerThis, boundThis) {
    if (innerThis !== boundThis) {
      throw new TypeError("Cannot instantiate an arrow function");
    }
  };

  babelHelpers.classCallCheck = function (instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  };

  babelHelpers.objectDestructuringEmpty = function (obj) {
    if (obj == null) throw new TypeError("Cannot destructure undefined");
  };

  babelHelpers.temporalUndefined = {};

  babelHelpers.temporalAssertDefined = function (val, name, undef) {
    if (val === undef) {
      throw new ReferenceError(name + " is not defined - temporal dead zone");
    }

    return true;
  };

  babelHelpers.selfGlobal = typeof global === "undefined" ? self : global;
  babelHelpers.typeofReactElement = typeof Symbol === "function" && Symbol["for"] && Symbol["for"]("react.element") || 60103;

  babelHelpers.defaultProps = function (defaultProps, props) {
    if (defaultProps) {
      for (var propName in defaultProps) {
        if (typeof props[propName] === "undefined") {
          props[propName] = defaultProps[propName];
        }
      }
    }

    return props;
  };

  babelHelpers._instanceof = function (left, right) {
    if (right != null && right[Symbol.hasInstance]) {
      return right[Symbol.hasInstance](left);
    } else {
      return left instanceof right;
    }
  };

  babelHelpers.interopRequire = function (obj) {
    return obj && obj.__esModule ? obj["default"] : obj;
  };
})(typeof global === "undefined" ? self : global);

!function(e){function r(e,r,o){return 4===arguments.length?t.apply(this,arguments):void n(e,{declarative:!0,deps:r,declare:o})}function t(e,r,t,o){n(e,{declarative:!1,deps:r,executingRequire:t,execute:o})}function n(e,r){r.name=e,e in p||(p[e]=r),r.normalizedDeps=r.deps}function o(e,r){if(r[e.groupIndex]=r[e.groupIndex]||[],-1==v.call(r[e.groupIndex],e)){r[e.groupIndex].push(e);for(var t=0,n=e.normalizedDeps.length;n>t;t++){var a=e.normalizedDeps[t],u=p[a];if(u&&!u.evaluated){var d=e.groupIndex+(u.declarative!=e.declarative);if(void 0===u.groupIndex||u.groupIndex<d){if(void 0!==u.groupIndex&&(r[u.groupIndex].splice(v.call(r[u.groupIndex],u),1),0==r[u.groupIndex].length))throw new TypeError("Mixed dependency cycle detected");u.groupIndex=d}o(u,r)}}}}function a(e){var r=p[e];r.groupIndex=0;var t=[];o(r,t);for(var n=!!r.declarative==t.length%2,a=t.length-1;a>=0;a--){for(var u=t[a],i=0;i<u.length;i++){var s=u[i];n?d(s):l(s)}n=!n}}function u(e){return x[e]||(x[e]={name:e,dependencies:[],exports:{},importers:[]})}function d(r){if(!r.module){var t=r.module=u(r.name),n=r.module.exports,o=r.declare.call(e,function(e,r){if(t.locked=!0,"object"==typeof e)for(var o in e)n[o]=e[o];else n[e]=r;for(var a=0,u=t.importers.length;u>a;a++){var d=t.importers[a];if(!d.locked)for(var i=0;i<d.dependencies.length;++i)d.dependencies[i]===t&&d.setters[i](n)}return t.locked=!1,r},r.name);t.setters=o.setters,t.execute=o.execute;for(var a=0,i=r.normalizedDeps.length;i>a;a++){var l,s=r.normalizedDeps[a],c=p[s],v=x[s];v?l=v.exports:c&&!c.declarative?l=c.esModule:c?(d(c),v=c.module,l=v.exports):l=f(s),v&&v.importers?(v.importers.push(t),t.dependencies.push(v)):t.dependencies.push(null),t.setters[a]&&t.setters[a](l)}}}function i(e){var r,t=p[e];if(t)t.declarative?c(e,[]):t.evaluated||l(t),r=t.module.exports;else if(r=f(e),!r)throw new Error("Unable to load dependency "+e+".");return(!t||t.declarative)&&r&&r.__useDefault?r["default"]:r}function l(r){if(!r.module){var t={},n=r.module={exports:t,id:r.name};if(!r.executingRequire)for(var o=0,a=r.normalizedDeps.length;a>o;o++){var u=r.normalizedDeps[o],d=p[u];d&&l(d)}r.evaluated=!0;var c=r.execute.call(e,function(e){for(var t=0,n=r.deps.length;n>t;t++)if(r.deps[t]==e)return i(r.normalizedDeps[t]);throw new TypeError("Module "+e+" not declared as a dependency.")},t,n);c&&(n.exports=c),t=n.exports,t&&t.__esModule?r.esModule=t:r.esModule=s(t)}}function s(r){if(r===e)return r;var t={};if("object"==typeof r||"function"==typeof r)if(g){var n;for(var o in r)(n=Object.getOwnPropertyDescriptor(r,o))&&h(t,o,n)}else{var a=r&&r.hasOwnProperty;for(var o in r)(!a||r.hasOwnProperty(o))&&(t[o]=r[o])}return t["default"]=r,h(t,"__useDefault",{value:!0}),t}function c(r,t){var n=p[r];if(n&&!n.evaluated&&n.declarative){t.push(r);for(var o=0,a=n.normalizedDeps.length;a>o;o++){var u=n.normalizedDeps[o];-1==v.call(t,u)&&(p[u]?c(u,t):f(u))}n.evaluated||(n.evaluated=!0,n.module.execute.call(e))}}function f(e){if(D[e])return D[e];if("@node/"==e.substr(0,6))return y(e.substr(6));var r=p[e];if(!r)throw"Module "+e+" not present.";return a(e),c(e,[]),p[e]=void 0,r.declarative&&h(r.module.exports,"__esModule",{value:!0}),D[e]=r.declarative?r.module.exports:r.esModule}var p={},v=Array.prototype.indexOf||function(e){for(var r=0,t=this.length;t>r;r++)if(this[r]===e)return r;return-1},g=!0;try{Object.getOwnPropertyDescriptor({a:0},"a")}catch(m){g=!1}var h;!function(){try{Object.defineProperty({},"a",{})&&(h=Object.defineProperty)}catch(e){h=function(e,r,t){try{e[r]=t.value||t.get.call(e)}catch(n){}}}}();var x={},y="undefined"!=typeof System&&System._nodeRequire||"undefined"!=typeof require&&require.resolve&&"undefined"!=typeof process&&require,D={"@empty":{}};return function(e,n,o){return function(a){a(function(a){for(var u={_nodeRequire:y,register:r,registerDynamic:t,get:f,set:function(e,r){D[e]=r},newModule:function(e){return e}},d=0;d<n.length;d++)(function(e,r){r&&r.__esModule?D[e]=r:D[e]=s(r)})(n[d],arguments[d]);o(u);var i=f(e[0]);if(e.length>1)for(var d=1;d<e.length;d++)f(e[d]);return i.__useDefault?i["default"]:i})}}}("undefined"!=typeof self?self:global)

(["1","1"], [], function($__System) {

!function(e){function r(e,r){for(var n=e.split(".");n.length;)r=r[n.shift()];return r}function n(n){if("string"==typeof n)return r(n,e);if(!(n instanceof Array))throw new Error("Global exports must be a string or array.");for(var t={},o=!0,f=0;f<n.length;f++){var i=r(n[f],e);o&&(t["default"]=i,o=!1),t[n[f].split(".").pop()]=i}return t}function t(r){if(Object.keys)Object.keys(e).forEach(r);else for(var n in e)a.call(e,n)&&r(n)}function o(r){t(function(n){if(-1==l.call(s,n)){try{var t=e[n]}catch(o){s.push(n)}r(n,t)}})}var f,i=$__System,a=Object.prototype.hasOwnProperty,l=Array.prototype.indexOf||function(e){for(var r=0,n=this.length;n>r;r++)if(this[r]===e)return r;return-1},s=["_g","sessionStorage","localStorage","clipboardData","frames","frameElement","external","mozAnimationStartTime","webkitStorageInfo","webkitIndexedDB","mozInnerScreenY","mozInnerScreenX"];i.set("@@global-helpers",i.newModule({prepareGlobal:function(r,t,i){var a=e.define;e.define=void 0;var l;if(i){l={};for(var s in i)l[s]=e[s],e[s]=i[s]}return t||(f={},o(function(e,r){f[e]=r})),function(){var r;if(t)r=n(t);else{r={};var i,s;o(function(e,n){f[e]!==n&&"undefined"!=typeof n&&(r[e]=n,"undefined"!=typeof i?s||i===n||(s=!0):i=n)}),r=s?r:i}if(l)for(var u in l)e[u]=l[u];return e.define=a,r}}}))}("undefined"!=typeof self?self:global);
!function(e){function n(e,n){e=e.replace(l,"");var r=e.match(u),t=(r[1].split(",")[n]||"require").replace(s,""),i=p[t]||(p[t]=new RegExp(a+t+f,"g"));i.lastIndex=0;for(var o,c=[];o=i.exec(e);)c.push(o[2]||o[3]);return c}function r(e,n,t,o){if("object"==typeof e&&!(e instanceof Array))return r.apply(null,Array.prototype.splice.call(arguments,1,arguments.length-1));if("string"==typeof e&&"function"==typeof n&&(e=[e]),!(e instanceof Array)){if("string"==typeof e){var l=i.get(e);return l.__useDefault?l["default"]:l}throw new TypeError("Invalid require")}for(var a=[],f=0;f<e.length;f++)a.push(i["import"](e[f],o));Promise.all(a).then(function(e){n&&n.apply(null,e)},t)}function t(t,l,a){"string"!=typeof t&&(a=l,l=t,t=null),l instanceof Array||(a=l,l=["require","exports","module"].splice(0,a.length)),"function"!=typeof a&&(a=function(e){return function(){return e}}(a)),void 0===l[l.length-1]&&l.pop();var f,u,s;-1!=(f=o.call(l,"require"))&&(l.splice(f,1),t||(l=l.concat(n(a.toString(),f)))),-1!=(u=o.call(l,"exports"))&&l.splice(u,1),-1!=(s=o.call(l,"module"))&&l.splice(s,1);var p={name:t,deps:l,execute:function(n,t,o){for(var p=[],c=0;c<l.length;c++)p.push(n(l[c]));o.uri=o.id,o.config=function(){},-1!=s&&p.splice(s,0,o),-1!=u&&p.splice(u,0,t),-1!=f&&p.splice(f,0,function(e,t,l){return"string"==typeof e&&"function"!=typeof t?n(e):r.call(i,e,t,l,o.id)});var d=a.apply(-1==u?e:t,p);return"undefined"==typeof d&&o&&(d=o.exports),"undefined"!=typeof d?d:void 0}};if(t)c.anonDefine||c.isBundle?c.anonDefine&&c.anonDefine.name&&(c.anonDefine=null):c.anonDefine=p,c.isBundle=!0,i.registerDynamic(p.name,p.deps,!1,p.execute);else{if(c.anonDefine&&!c.anonDefine.name)throw new Error("Multiple anonymous defines in module "+t);c.anonDefine=p}}var i=$__System,o=Array.prototype.indexOf||function(e){for(var n=0,r=this.length;r>n;n++)if(this[n]===e)return n;return-1},l=/(\/\*([\s\S]*?)\*\/|([^:]|^)\/\/(.*)$)/gm,a="(?:^|[^$_a-zA-Z\\xA0-\\uFFFF.])",f="\\s*\\(\\s*(\"([^\"]+)\"|'([^']+)')\\s*\\)",u=/\(([^\)]*)\)/,s=/^\s+|\s+$/g,p={};t.amd={};var c={isBundle:!1,anonDefine:null};i.amdDefine=t,i.amdRequire=r}("undefined"!=typeof self?self:global);
$__System.registerDynamic("2", ["3", "4"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var $ = $__require('3'),
      toIObject = $__require('4');
  module.exports = function(object, el) {
    var O = toIObject(object),
        keys = $.getKeys(O),
        length = keys.length,
        index = 0,
        key;
    while (length > index)
      if (O[key = keys[index++]] === el)
        return key;
  };
  return module.exports;
});

$__System.registerDynamic("5", ["3"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var $ = $__require('3');
  module.exports = function(it) {
    var keys = $.getKeys(it),
        getSymbols = $.getSymbols;
    if (getSymbols) {
      var symbols = getSymbols(it),
          isEnum = $.isEnum,
          i = 0,
          key;
      while (symbols.length > i)
        if (isEnum.call(it, key = symbols[i++]))
          keys.push(key);
    }
    return keys;
  };
  return module.exports;
});

$__System.registerDynamic("6", ["7"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var cof = $__require('7');
  module.exports = Array.isArray || function(arg) {
    return cof(arg) == 'Array';
  };
  return module.exports;
});

$__System.registerDynamic("8", ["3", "9", "a", "b", "c", "d", "e", "f", "10", "11", "12", "2", "13", "5", "6", "14", "4", "15", "16"], true, function($__require, exports, module) {
  "use strict";
  ;
  var define,
      global = this,
      GLOBAL = this;
  var $ = $__require('3'),
      global = $__require('9'),
      has = $__require('a'),
      DESCRIPTORS = $__require('b'),
      $export = $__require('c'),
      redefine = $__require('d'),
      $fails = $__require('e'),
      shared = $__require('f'),
      setToStringTag = $__require('10'),
      uid = $__require('11'),
      wks = $__require('12'),
      keyOf = $__require('2'),
      $names = $__require('13'),
      enumKeys = $__require('5'),
      isArray = $__require('6'),
      anObject = $__require('14'),
      toIObject = $__require('4'),
      createDesc = $__require('15'),
      getDesc = $.getDesc,
      setDesc = $.setDesc,
      _create = $.create,
      getNames = $names.get,
      $Symbol = global.Symbol,
      $JSON = global.JSON,
      _stringify = $JSON && $JSON.stringify,
      setter = false,
      HIDDEN = wks('_hidden'),
      isEnum = $.isEnum,
      SymbolRegistry = shared('symbol-registry'),
      AllSymbols = shared('symbols'),
      useNative = typeof $Symbol == 'function',
      ObjectProto = Object.prototype;
  var setSymbolDesc = DESCRIPTORS && $fails(function() {
    return _create(setDesc({}, 'a', {get: function() {
        return setDesc(this, 'a', {value: 7}).a;
      }})).a != 7;
  }) ? function(it, key, D) {
    var protoDesc = getDesc(ObjectProto, key);
    if (protoDesc)
      delete ObjectProto[key];
    setDesc(it, key, D);
    if (protoDesc && it !== ObjectProto)
      setDesc(ObjectProto, key, protoDesc);
  } : setDesc;
  var wrap = function(tag) {
    var sym = AllSymbols[tag] = _create($Symbol.prototype);
    sym._k = tag;
    DESCRIPTORS && setter && setSymbolDesc(ObjectProto, tag, {
      configurable: true,
      set: function(value) {
        if (has(this, HIDDEN) && has(this[HIDDEN], tag))
          this[HIDDEN][tag] = false;
        setSymbolDesc(this, tag, createDesc(1, value));
      }
    });
    return sym;
  };
  var isSymbol = function(it) {
    return typeof it == 'symbol';
  };
  var $defineProperty = function defineProperty(it, key, D) {
    if (D && has(AllSymbols, key)) {
      if (!D.enumerable) {
        if (!has(it, HIDDEN))
          setDesc(it, HIDDEN, createDesc(1, {}));
        it[HIDDEN][key] = true;
      } else {
        if (has(it, HIDDEN) && it[HIDDEN][key])
          it[HIDDEN][key] = false;
        D = _create(D, {enumerable: createDesc(0, false)});
      }
      return setSymbolDesc(it, key, D);
    }
    return setDesc(it, key, D);
  };
  var $defineProperties = function defineProperties(it, P) {
    anObject(it);
    var keys = enumKeys(P = toIObject(P)),
        i = 0,
        l = keys.length,
        key;
    while (l > i)
      $defineProperty(it, key = keys[i++], P[key]);
    return it;
  };
  var $create = function create(it, P) {
    return P === undefined ? _create(it) : $defineProperties(_create(it), P);
  };
  var $propertyIsEnumerable = function propertyIsEnumerable(key) {
    var E = isEnum.call(this, key);
    return E || !has(this, key) || !has(AllSymbols, key) || has(this, HIDDEN) && this[HIDDEN][key] ? E : true;
  };
  var $getOwnPropertyDescriptor = function getOwnPropertyDescriptor(it, key) {
    var D = getDesc(it = toIObject(it), key);
    if (D && has(AllSymbols, key) && !(has(it, HIDDEN) && it[HIDDEN][key]))
      D.enumerable = true;
    return D;
  };
  var $getOwnPropertyNames = function getOwnPropertyNames(it) {
    var names = getNames(toIObject(it)),
        result = [],
        i = 0,
        key;
    while (names.length > i)
      if (!has(AllSymbols, key = names[i++]) && key != HIDDEN)
        result.push(key);
    return result;
  };
  var $getOwnPropertySymbols = function getOwnPropertySymbols(it) {
    var names = getNames(toIObject(it)),
        result = [],
        i = 0,
        key;
    while (names.length > i)
      if (has(AllSymbols, key = names[i++]))
        result.push(AllSymbols[key]);
    return result;
  };
  var $stringify = function stringify(it) {
    if (it === undefined || isSymbol(it))
      return;
    var args = [it],
        i = 1,
        $$ = arguments,
        replacer,
        $replacer;
    while ($$.length > i)
      args.push($$[i++]);
    replacer = args[1];
    if (typeof replacer == 'function')
      $replacer = replacer;
    if ($replacer || !isArray(replacer))
      replacer = function(key, value) {
        if ($replacer)
          value = $replacer.call(this, key, value);
        if (!isSymbol(value))
          return value;
      };
    args[1] = replacer;
    return _stringify.apply($JSON, args);
  };
  var buggyJSON = $fails(function() {
    var S = $Symbol();
    return _stringify([S]) != '[null]' || _stringify({a: S}) != '{}' || _stringify(Object(S)) != '{}';
  });
  if (!useNative) {
    $Symbol = function Symbol() {
      if (isSymbol(this))
        throw TypeError('Symbol is not a constructor');
      return wrap(uid(arguments.length > 0 ? arguments[0] : undefined));
    };
    redefine($Symbol.prototype, 'toString', function toString() {
      return this._k;
    });
    isSymbol = function(it) {
      return it instanceof $Symbol;
    };
    $.create = $create;
    $.isEnum = $propertyIsEnumerable;
    $.getDesc = $getOwnPropertyDescriptor;
    $.setDesc = $defineProperty;
    $.setDescs = $defineProperties;
    $.getNames = $names.get = $getOwnPropertyNames;
    $.getSymbols = $getOwnPropertySymbols;
    if (DESCRIPTORS && !$__require('16')) {
      redefine(ObjectProto, 'propertyIsEnumerable', $propertyIsEnumerable, true);
    }
  }
  var symbolStatics = {
    'for': function(key) {
      return has(SymbolRegistry, key += '') ? SymbolRegistry[key] : SymbolRegistry[key] = $Symbol(key);
    },
    keyFor: function keyFor(key) {
      return keyOf(SymbolRegistry, key);
    },
    useSetter: function() {
      setter = true;
    },
    useSimple: function() {
      setter = false;
    }
  };
  $.each.call(('hasInstance,isConcatSpreadable,iterator,match,replace,search,' + 'species,split,toPrimitive,toStringTag,unscopables').split(','), function(it) {
    var sym = wks(it);
    symbolStatics[it] = useNative ? sym : wrap(sym);
  });
  setter = true;
  $export($export.G + $export.W, {Symbol: $Symbol});
  $export($export.S, 'Symbol', symbolStatics);
  $export($export.S + $export.F * !useNative, 'Object', {
    create: $create,
    defineProperty: $defineProperty,
    defineProperties: $defineProperties,
    getOwnPropertyDescriptor: $getOwnPropertyDescriptor,
    getOwnPropertyNames: $getOwnPropertyNames,
    getOwnPropertySymbols: $getOwnPropertySymbols
  });
  $JSON && $export($export.S + $export.F * (!useNative || buggyJSON), 'JSON', {stringify: $stringify});
  setToStringTag($Symbol, 'Symbol');
  setToStringTag(Math, 'Math', true);
  setToStringTag(global.JSON, 'JSON', true);
  return module.exports;
});

$__System.registerDynamic("17", ["8", "18", "19"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  $__require('8');
  $__require('18');
  module.exports = $__require('19').Symbol;
  return module.exports;
});

$__System.registerDynamic("1a", ["17"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = $__require('17');
  return module.exports;
});

$__System.registerDynamic("1b", ["1a"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = {
    "default": $__require('1a'),
    __esModule: true
  };
  return module.exports;
});

$__System.registerDynamic("1c", ["1b", "1d", "1e", "1f", "20"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  (function(process) {
    "use strict";
    var _Symbol = $__require('1b')["default"];
    var _Object$create = $__require('1d')["default"];
    var _Object$setPrototypeOf = $__require('1e')["default"];
    var _Promise = $__require('1f')["default"];
    !(function(global) {
      "use strict";
      var hasOwn = Object.prototype.hasOwnProperty;
      var undefined;
      var $Symbol = typeof _Symbol === "function" ? _Symbol : {};
      var iteratorSymbol = $Symbol.iterator || "@@iterator";
      var toStringTagSymbol = $Symbol.toStringTag || "@@toStringTag";
      var inModule = typeof module === "object";
      var runtime = global.regeneratorRuntime;
      if (runtime) {
        if (inModule) {
          module.exports = runtime;
        }
        return;
      }
      runtime = global.regeneratorRuntime = inModule ? module.exports : {};
      function wrap(innerFn, outerFn, self, tryLocsList) {
        var generator = _Object$create((outerFn || Generator).prototype);
        var context = new Context(tryLocsList || []);
        generator._invoke = makeInvokeMethod(innerFn, self, context);
        return generator;
      }
      runtime.wrap = wrap;
      function tryCatch(fn, obj, arg) {
        try {
          return {
            type: "normal",
            arg: fn.call(obj, arg)
          };
        } catch (err) {
          return {
            type: "throw",
            arg: err
          };
        }
      }
      var GenStateSuspendedStart = "suspendedStart";
      var GenStateSuspendedYield = "suspendedYield";
      var GenStateExecuting = "executing";
      var GenStateCompleted = "completed";
      var ContinueSentinel = {};
      function Generator() {}
      function GeneratorFunction() {}
      function GeneratorFunctionPrototype() {}
      var Gp = GeneratorFunctionPrototype.prototype = Generator.prototype;
      GeneratorFunction.prototype = Gp.constructor = GeneratorFunctionPrototype;
      GeneratorFunctionPrototype.constructor = GeneratorFunction;
      GeneratorFunctionPrototype[toStringTagSymbol] = GeneratorFunction.displayName = "GeneratorFunction";
      function defineIteratorMethods(prototype) {
        ["next", "throw", "return"].forEach(function(method) {
          prototype[method] = function(arg) {
            return this._invoke(method, arg);
          };
        });
      }
      runtime.isGeneratorFunction = function(genFun) {
        var ctor = typeof genFun === "function" && genFun.constructor;
        return ctor ? ctor === GeneratorFunction || (ctor.displayName || ctor.name) === "GeneratorFunction" : false;
      };
      runtime.mark = function(genFun) {
        if (_Object$setPrototypeOf) {
          _Object$setPrototypeOf(genFun, GeneratorFunctionPrototype);
        } else {
          genFun.__proto__ = GeneratorFunctionPrototype;
          if (!(toStringTagSymbol in genFun)) {
            genFun[toStringTagSymbol] = "GeneratorFunction";
          }
        }
        genFun.prototype = _Object$create(Gp);
        return genFun;
      };
      runtime.awrap = function(arg) {
        return new AwaitArgument(arg);
      };
      function AwaitArgument(arg) {
        this.arg = arg;
      }
      function AsyncIterator(generator) {
        function invoke(method, arg, resolve, reject) {
          var record = tryCatch(generator[method], generator, arg);
          if (record.type === "throw") {
            reject(record.arg);
          } else {
            var result = record.arg;
            var value = result.value;
            if (value instanceof AwaitArgument) {
              return _Promise.resolve(value.arg).then(function(value) {
                invoke("next", value, resolve, reject);
              }, function(err) {
                invoke("throw", err, resolve, reject);
              });
            }
            return _Promise.resolve(value).then(function(unwrapped) {
              result.value = unwrapped;
              resolve(result);
            }, reject);
          }
        }
        if (typeof process === "object" && process.domain) {
          invoke = process.domain.bind(invoke);
        }
        var previousPromise;
        function enqueue(method, arg) {
          function callInvokeWithMethodAndArg() {
            return new _Promise(function(resolve, reject) {
              invoke(method, arg, resolve, reject);
            });
          }
          return previousPromise = previousPromise ? previousPromise.then(callInvokeWithMethodAndArg, callInvokeWithMethodAndArg) : callInvokeWithMethodAndArg();
        }
        this._invoke = enqueue;
      }
      defineIteratorMethods(AsyncIterator.prototype);
      runtime.async = function(innerFn, outerFn, self, tryLocsList) {
        var iter = new AsyncIterator(wrap(innerFn, outerFn, self, tryLocsList));
        return runtime.isGeneratorFunction(outerFn) ? iter : iter.next().then(function(result) {
          return result.done ? result.value : iter.next();
        });
      };
      function makeInvokeMethod(innerFn, self, context) {
        var state = GenStateSuspendedStart;
        return function invoke(method, arg) {
          if (state === GenStateExecuting) {
            throw new Error("Generator is already running");
          }
          if (state === GenStateCompleted) {
            if (method === "throw") {
              throw arg;
            }
            return doneResult();
          }
          while (true) {
            var delegate = context.delegate;
            if (delegate) {
              if (method === "return" || method === "throw" && delegate.iterator[method] === undefined) {
                context.delegate = null;
                var returnMethod = delegate.iterator["return"];
                if (returnMethod) {
                  var record = tryCatch(returnMethod, delegate.iterator, arg);
                  if (record.type === "throw") {
                    method = "throw";
                    arg = record.arg;
                    continue;
                  }
                }
                if (method === "return") {
                  continue;
                }
              }
              var record = tryCatch(delegate.iterator[method], delegate.iterator, arg);
              if (record.type === "throw") {
                context.delegate = null;
                method = "throw";
                arg = record.arg;
                continue;
              }
              method = "next";
              arg = undefined;
              var info = record.arg;
              if (info.done) {
                context[delegate.resultName] = info.value;
                context.next = delegate.nextLoc;
              } else {
                state = GenStateSuspendedYield;
                return info;
              }
              context.delegate = null;
            }
            if (method === "next") {
              if (state === GenStateSuspendedYield) {
                context.sent = arg;
              } else {
                context.sent = undefined;
              }
            } else if (method === "throw") {
              if (state === GenStateSuspendedStart) {
                state = GenStateCompleted;
                throw arg;
              }
              if (context.dispatchException(arg)) {
                method = "next";
                arg = undefined;
              }
            } else if (method === "return") {
              context.abrupt("return", arg);
            }
            state = GenStateExecuting;
            var record = tryCatch(innerFn, self, context);
            if (record.type === "normal") {
              state = context.done ? GenStateCompleted : GenStateSuspendedYield;
              var info = {
                value: record.arg,
                done: context.done
              };
              if (record.arg === ContinueSentinel) {
                if (context.delegate && method === "next") {
                  arg = undefined;
                }
              } else {
                return info;
              }
            } else if (record.type === "throw") {
              state = GenStateCompleted;
              method = "throw";
              arg = record.arg;
            }
          }
        };
      }
      defineIteratorMethods(Gp);
      Gp[iteratorSymbol] = function() {
        return this;
      };
      Gp[toStringTagSymbol] = "Generator";
      Gp.toString = function() {
        return "[object Generator]";
      };
      function pushTryEntry(locs) {
        var entry = {tryLoc: locs[0]};
        if (1 in locs) {
          entry.catchLoc = locs[1];
        }
        if (2 in locs) {
          entry.finallyLoc = locs[2];
          entry.afterLoc = locs[3];
        }
        this.tryEntries.push(entry);
      }
      function resetTryEntry(entry) {
        var record = entry.completion || {};
        record.type = "normal";
        delete record.arg;
        entry.completion = record;
      }
      function Context(tryLocsList) {
        this.tryEntries = [{tryLoc: "root"}];
        tryLocsList.forEach(pushTryEntry, this);
        this.reset(true);
      }
      runtime.keys = function(object) {
        var keys = [];
        for (var key in object) {
          keys.push(key);
        }
        keys.reverse();
        return function next() {
          while (keys.length) {
            var key = keys.pop();
            if (key in object) {
              next.value = key;
              next.done = false;
              return next;
            }
          }
          next.done = true;
          return next;
        };
      };
      function values(iterable) {
        if (iterable) {
          var iteratorMethod = iterable[iteratorSymbol];
          if (iteratorMethod) {
            return iteratorMethod.call(iterable);
          }
          if (typeof iterable.next === "function") {
            return iterable;
          }
          if (!isNaN(iterable.length)) {
            var i = -1,
                next = function next() {
                  while (++i < iterable.length) {
                    if (hasOwn.call(iterable, i)) {
                      next.value = iterable[i];
                      next.done = false;
                      return next;
                    }
                  }
                  next.value = undefined;
                  next.done = true;
                  return next;
                };
            return next.next = next;
          }
        }
        return {next: doneResult};
      }
      runtime.values = values;
      function doneResult() {
        return {
          value: undefined,
          done: true
        };
      }
      Context.prototype = {
        constructor: Context,
        reset: function reset(skipTempReset) {
          this.prev = 0;
          this.next = 0;
          this.sent = undefined;
          this.done = false;
          this.delegate = null;
          this.tryEntries.forEach(resetTryEntry);
          if (!skipTempReset) {
            for (var name in this) {
              if (name.charAt(0) === "t" && hasOwn.call(this, name) && !isNaN(+name.slice(1))) {
                this[name] = undefined;
              }
            }
          }
        },
        stop: function stop() {
          this.done = true;
          var rootEntry = this.tryEntries[0];
          var rootRecord = rootEntry.completion;
          if (rootRecord.type === "throw") {
            throw rootRecord.arg;
          }
          return this.rval;
        },
        dispatchException: function dispatchException(exception) {
          if (this.done) {
            throw exception;
          }
          var context = this;
          function handle(loc, caught) {
            record.type = "throw";
            record.arg = exception;
            context.next = loc;
            return !!caught;
          }
          for (var i = this.tryEntries.length - 1; i >= 0; --i) {
            var entry = this.tryEntries[i];
            var record = entry.completion;
            if (entry.tryLoc === "root") {
              return handle("end");
            }
            if (entry.tryLoc <= this.prev) {
              var hasCatch = hasOwn.call(entry, "catchLoc");
              var hasFinally = hasOwn.call(entry, "finallyLoc");
              if (hasCatch && hasFinally) {
                if (this.prev < entry.catchLoc) {
                  return handle(entry.catchLoc, true);
                } else if (this.prev < entry.finallyLoc) {
                  return handle(entry.finallyLoc);
                }
              } else if (hasCatch) {
                if (this.prev < entry.catchLoc) {
                  return handle(entry.catchLoc, true);
                }
              } else if (hasFinally) {
                if (this.prev < entry.finallyLoc) {
                  return handle(entry.finallyLoc);
                }
              } else {
                throw new Error("try statement without catch or finally");
              }
            }
          }
        },
        abrupt: function abrupt(type, arg) {
          for (var i = this.tryEntries.length - 1; i >= 0; --i) {
            var entry = this.tryEntries[i];
            if (entry.tryLoc <= this.prev && hasOwn.call(entry, "finallyLoc") && this.prev < entry.finallyLoc) {
              var finallyEntry = entry;
              break;
            }
          }
          if (finallyEntry && (type === "break" || type === "continue") && finallyEntry.tryLoc <= arg && arg <= finallyEntry.finallyLoc) {
            finallyEntry = null;
          }
          var record = finallyEntry ? finallyEntry.completion : {};
          record.type = type;
          record.arg = arg;
          if (finallyEntry) {
            this.next = finallyEntry.finallyLoc;
          } else {
            this.complete(record);
          }
          return ContinueSentinel;
        },
        complete: function complete(record, afterLoc) {
          if (record.type === "throw") {
            throw record.arg;
          }
          if (record.type === "break" || record.type === "continue") {
            this.next = record.arg;
          } else if (record.type === "return") {
            this.rval = record.arg;
            this.next = "end";
          } else if (record.type === "normal" && afterLoc) {
            this.next = afterLoc;
          }
        },
        finish: function finish(finallyLoc) {
          for (var i = this.tryEntries.length - 1; i >= 0; --i) {
            var entry = this.tryEntries[i];
            if (entry.finallyLoc === finallyLoc) {
              this.complete(entry.completion, entry.afterLoc);
              resetTryEntry(entry);
              return ContinueSentinel;
            }
          }
        },
        "catch": function _catch(tryLoc) {
          for (var i = this.tryEntries.length - 1; i >= 0; --i) {
            var entry = this.tryEntries[i];
            if (entry.tryLoc === tryLoc) {
              var record = entry.completion;
              if (record.type === "throw") {
                var thrown = record.arg;
                resetTryEntry(entry);
              }
              return thrown;
            }
          }
          throw new Error("illegal catch attempt");
        },
        delegateYield: function delegateYield(iterable, resultName, nextLoc) {
          this.delegate = {
            iterator: values(iterable),
            resultName: resultName,
            nextLoc: nextLoc
          };
          return ContinueSentinel;
        }
      };
    })(typeof global === "object" ? global : typeof window === "object" ? window : typeof self === "object" ? self : undefined);
  })($__require('20'));
  return module.exports;
});

$__System.registerDynamic("21", ["1c"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var g = typeof global === "object" ? global : typeof window === "object" ? window : typeof self === "object" ? self : this;
  var hadRuntime = g.regeneratorRuntime && Object.getOwnPropertyNames(g).indexOf("regeneratorRuntime") >= 0;
  var oldRuntime = hadRuntime && g.regeneratorRuntime;
  g.regeneratorRuntime = undefined;
  module.exports = $__require('1c');
  if (hadRuntime) {
    g.regeneratorRuntime = oldRuntime;
  } else {
    try {
      delete g.regeneratorRuntime;
    } catch (e) {
      g.regeneratorRuntime = undefined;
    }
  }
  module.exports = {
    "default": module.exports,
    __esModule: true
  };
  return module.exports;
});

$__System.registerDynamic("22", ["21"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = $__require('21');
  return module.exports;
});

$__System.registerDynamic("23", [], false, function($__require, $__exports, $__module) {
  var _retrieveGlobal = $__System.get("@@global-helpers").prepareGlobal($__module.id, null, null);
  (function() {
    (function() {
      if (Function.prototype.name === undefined && Object.defineProperty !== undefined) {
        Object.defineProperty(Function.prototype, 'name', {
          get: function() {
            var funcNameRegex = /function\s([^(]{1,})\(/;
            var results = (funcNameRegex).exec((this).toString());
            return (results && results.length > 1) ? results[1].trim() : '';
          },
          set: function(value) {}
        });
      }
    }());
  })();
  return _retrieveGlobal();
});

$__System.registerDynamic("24", [], false, function($__require, $__exports, $__module) {
  var _retrieveGlobal = $__System.get("@@global-helpers").prepareGlobal($__module.id, null, null);
  (function() {
    if (!Object.keys) {
      Object.keys = (function() {
        'use strict';
        var hasOwnProperty = Object.prototype.hasOwnProperty,
            hasDontEnumBug = !({toString: null}).propertyIsEnumerable('toString'),
            dontEnums = ['toString', 'toLocaleString', 'valueOf', 'hasOwnProperty', 'isPrototypeOf', 'propertyIsEnumerable', 'constructor'],
            dontEnumsLength = dontEnums.length;
        return function(obj) {
          if (typeof obj !== 'object' && (typeof obj !== 'function' || obj === null)) {
            throw new TypeError('Object.keys called on non-object');
          }
          var result = [],
              prop,
              i;
          for (prop in obj) {
            if (hasOwnProperty.call(obj, prop)) {
              result.push(prop);
            }
          }
          if (hasDontEnumBug) {
            for (i = 0; i < dontEnumsLength; i++) {
              if (hasOwnProperty.call(obj, dontEnums[i])) {
                result.push(dontEnums[i]);
              }
            }
          }
          return result;
        };
      }());
    }
  })();
  return _retrieveGlobal();
});

$__System.registerDynamic("25", [], false, function($__require, $__exports, $__module) {
  var _retrieveGlobal = $__System.get("@@global-helpers").prepareGlobal($__module.id, null, null);
  (function() {
    if (!String.prototype.startsWith) {
      String.prototype.startsWith = function(searchString, position) {
        position = position || 0;
        return this.substr(position, searchString.length) === searchString;
      };
    }
  })();
  return _retrieveGlobal();
});

$__System.registerDynamic("26", ["27"], true, function($__require, exports, module) {
  "use strict";
  ;
  var define,
      global = this,
      GLOBAL = this;
  var _Object$getOwnPropertyDescriptor = $__require('27')["default"];
  exports["default"] = function get(_x, _x2, _x3) {
    var _again = true;
    _function: while (_again) {
      var object = _x,
          property = _x2,
          receiver = _x3;
      _again = false;
      if (object === null)
        object = Function.prototype;
      var desc = _Object$getOwnPropertyDescriptor(object, property);
      if (desc === undefined) {
        var parent = Object.getPrototypeOf(object);
        if (parent === null) {
          return undefined;
        } else {
          _x = parent;
          _x2 = property;
          _x3 = receiver;
          _again = true;
          desc = parent = undefined;
          continue _function;
        }
      } else if ("value" in desc) {
        return desc.value;
      } else {
        var getter = desc.get;
        if (getter === undefined) {
          return undefined;
        }
        return getter.call(receiver);
      }
    }
  };
  exports.__esModule = true;
  return module.exports;
});

$__System.registerDynamic("28", ["3"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var $ = $__require('3');
  module.exports = function create(P, D) {
    return $.create(P, D);
  };
  return module.exports;
});

$__System.registerDynamic("1d", ["28"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = {
    "default": $__require('28'),
    __esModule: true
  };
  return module.exports;
});

$__System.registerDynamic("29", ["c", "2a"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var $export = $__require('c');
  $export($export.S, 'Object', {setPrototypeOf: $__require('2a').set});
  return module.exports;
});

$__System.registerDynamic("2b", ["29", "19"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  $__require('29');
  module.exports = $__require('19').Object.setPrototypeOf;
  return module.exports;
});

$__System.registerDynamic("1e", ["2b"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = {
    "default": $__require('2b'),
    __esModule: true
  };
  return module.exports;
});

$__System.registerDynamic("2c", ["1d", "1e"], true, function($__require, exports, module) {
  "use strict";
  ;
  var define,
      global = this,
      GLOBAL = this;
  var _Object$create = $__require('1d')["default"];
  var _Object$setPrototypeOf = $__require('1e')["default"];
  exports["default"] = function(subClass, superClass) {
    if (typeof superClass !== "function" && superClass !== null) {
      throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
    }
    subClass.prototype = _Object$create(superClass && superClass.prototype, {constructor: {
        value: subClass,
        enumerable: false,
        writable: true,
        configurable: true
      }});
    if (superClass)
      _Object$setPrototypeOf ? _Object$setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
  };
  exports.__esModule = true;
  return module.exports;
});

$__System.registerDynamic("2d", [], true, function($__require, exports, module) {
  "use strict";
  ;
  var define,
      global = this,
      GLOBAL = this;
  var prefix = typeof Object.create !== 'function' ? '~' : false;
  function EE(fn, context, once) {
    this.fn = fn;
    this.context = context;
    this.once = once || false;
  }
  function EventEmitter() {}
  EventEmitter.prototype._events = undefined;
  EventEmitter.prototype.listeners = function listeners(event, exists) {
    var evt = prefix ? prefix + event : event,
        available = this._events && this._events[evt];
    if (exists)
      return !!available;
    if (!available)
      return [];
    if (available.fn)
      return [available.fn];
    for (var i = 0,
        l = available.length,
        ee = new Array(l); i < l; i++) {
      ee[i] = available[i].fn;
    }
    return ee;
  };
  EventEmitter.prototype.emit = function emit(event, a1, a2, a3, a4, a5) {
    var evt = prefix ? prefix + event : event;
    if (!this._events || !this._events[evt])
      return false;
    var listeners = this._events[evt],
        len = arguments.length,
        args,
        i;
    if ('function' === typeof listeners.fn) {
      if (listeners.once)
        this.removeListener(event, listeners.fn, undefined, true);
      switch (len) {
        case 1:
          return listeners.fn.call(listeners.context), true;
        case 2:
          return listeners.fn.call(listeners.context, a1), true;
        case 3:
          return listeners.fn.call(listeners.context, a1, a2), true;
        case 4:
          return listeners.fn.call(listeners.context, a1, a2, a3), true;
        case 5:
          return listeners.fn.call(listeners.context, a1, a2, a3, a4), true;
        case 6:
          return listeners.fn.call(listeners.context, a1, a2, a3, a4, a5), true;
      }
      for (i = 1, args = new Array(len - 1); i < len; i++) {
        args[i - 1] = arguments[i];
      }
      listeners.fn.apply(listeners.context, args);
    } else {
      var length = listeners.length,
          j;
      for (i = 0; i < length; i++) {
        if (listeners[i].once)
          this.removeListener(event, listeners[i].fn, undefined, true);
        switch (len) {
          case 1:
            listeners[i].fn.call(listeners[i].context);
            break;
          case 2:
            listeners[i].fn.call(listeners[i].context, a1);
            break;
          case 3:
            listeners[i].fn.call(listeners[i].context, a1, a2);
            break;
          default:
            if (!args)
              for (j = 1, args = new Array(len - 1); j < len; j++) {
                args[j - 1] = arguments[j];
              }
            listeners[i].fn.apply(listeners[i].context, args);
        }
      }
    }
    return true;
  };
  EventEmitter.prototype.on = function on(event, fn, context) {
    var listener = new EE(fn, context || this),
        evt = prefix ? prefix + event : event;
    if (!this._events)
      this._events = prefix ? {} : Object.create(null);
    if (!this._events[evt])
      this._events[evt] = listener;
    else {
      if (!this._events[evt].fn)
        this._events[evt].push(listener);
      else
        this._events[evt] = [this._events[evt], listener];
    }
    return this;
  };
  EventEmitter.prototype.once = function once(event, fn, context) {
    var listener = new EE(fn, context || this, true),
        evt = prefix ? prefix + event : event;
    if (!this._events)
      this._events = prefix ? {} : Object.create(null);
    if (!this._events[evt])
      this._events[evt] = listener;
    else {
      if (!this._events[evt].fn)
        this._events[evt].push(listener);
      else
        this._events[evt] = [this._events[evt], listener];
    }
    return this;
  };
  EventEmitter.prototype.removeListener = function removeListener(event, fn, context, once) {
    var evt = prefix ? prefix + event : event;
    if (!this._events || !this._events[evt])
      return this;
    var listeners = this._events[evt],
        events = [];
    if (fn) {
      if (listeners.fn) {
        if (listeners.fn !== fn || (once && !listeners.once) || (context && listeners.context !== context)) {
          events.push(listeners);
        }
      } else {
        for (var i = 0,
            length = listeners.length; i < length; i++) {
          if (listeners[i].fn !== fn || (once && !listeners[i].once) || (context && listeners[i].context !== context)) {
            events.push(listeners[i]);
          }
        }
      }
    }
    if (events.length) {
      this._events[evt] = events.length === 1 ? events[0] : events;
    } else {
      delete this._events[evt];
    }
    return this;
  };
  EventEmitter.prototype.removeAllListeners = function removeAllListeners(event) {
    if (!this._events)
      return this;
    if (event)
      delete this._events[prefix ? prefix + event : event];
    else
      this._events = prefix ? {} : Object.create(null);
    return this;
  };
  EventEmitter.prototype.off = EventEmitter.prototype.removeListener;
  EventEmitter.prototype.addListener = EventEmitter.prototype.on;
  EventEmitter.prototype.setMaxListeners = function setMaxListeners() {
    return this;
  };
  EventEmitter.prefixed = prefix;
  if ('undefined' !== typeof module) {
    module.exports = EventEmitter;
  }
  return module.exports;
});

$__System.registerDynamic("2e", ["2d"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = $__require('2d');
  return module.exports;
});

(function() {
var define = $__System.amdDefine;
define("2f", ["require"], function(require) {
  return function(config) {
    'use strict';
    var VERSION = "1.1.6";
    config = config || {};
    initConfigDefaults();
    initRequiredPolyfills();
    function initConfigDefaults() {
      if (config.escapeMode === undefined) {
        config.escapeMode = true;
      }
      config.attributePrefix = config.attributePrefix || "_";
      config.arrayAccessForm = config.arrayAccessForm || "none";
      config.emptyNodeForm = config.emptyNodeForm || "text";
      if (config.enableToStringFunc === undefined) {
        config.enableToStringFunc = true;
      }
      config.arrayAccessFormPaths = config.arrayAccessFormPaths || [];
      if (config.skipEmptyTextNodesForObj === undefined) {
        config.skipEmptyTextNodesForObj = true;
      }
      if (config.stripWhitespaces === undefined) {
        config.stripWhitespaces = true;
      }
      config.datetimeAccessFormPaths = config.datetimeAccessFormPaths || [];
    }
    var DOMNodeTypes = {
      ELEMENT_NODE: 1,
      TEXT_NODE: 3,
      CDATA_SECTION_NODE: 4,
      COMMENT_NODE: 8,
      DOCUMENT_NODE: 9
    };
    function initRequiredPolyfills() {
      function pad(number) {
        var r = String(number);
        if (r.length === 1) {
          r = '0' + r;
        }
        return r;
      }
      if (typeof String.prototype.trim !== 'function') {
        String.prototype.trim = function() {
          return this.replace(/^\s+|^\n+|(\s|\n)+$/g, '');
        };
      }
      if (typeof Date.prototype.toISOString !== 'function') {
        Date.prototype.toISOString = function() {
          return this.getUTCFullYear() + '-' + pad(this.getUTCMonth() + 1) + '-' + pad(this.getUTCDate()) + 'T' + pad(this.getUTCHours()) + ':' + pad(this.getUTCMinutes()) + ':' + pad(this.getUTCSeconds()) + '.' + String((this.getUTCMilliseconds() / 1000).toFixed(3)).slice(2, 5) + 'Z';
        };
      }
    }
    function getNodeLocalName(node) {
      var nodeLocalName = node.localName;
      if (nodeLocalName == null)
        nodeLocalName = node.baseName;
      if (nodeLocalName == null || nodeLocalName == "")
        nodeLocalName = node.nodeName;
      return nodeLocalName;
    }
    function getNodePrefix(node) {
      return node.prefix;
    }
    function escapeXmlChars(str) {
      if (typeof(str) == "string")
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
      else
        return str;
    }
    function unescapeXmlChars(str) {
      return str.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x27;/g, "'");
    }
    function toArrayAccessForm(obj, childName, path) {
      switch (config.arrayAccessForm) {
        case "property":
          if (!(obj[childName] instanceof Array))
            obj[childName + "_asArray"] = [obj[childName]];
          else
            obj[childName + "_asArray"] = obj[childName];
          break;
      }
      if (!(obj[childName] instanceof Array) && config.arrayAccessFormPaths.length > 0) {
        var idx = 0;
        for (; idx < config.arrayAccessFormPaths.length; idx++) {
          var arrayPath = config.arrayAccessFormPaths[idx];
          if (typeof arrayPath === "string") {
            if (arrayPath == path)
              break;
          } else if (arrayPath instanceof RegExp) {
            if (arrayPath.test(path))
              break;
          } else if (typeof arrayPath === "function") {
            if (arrayPath(obj, childName, path))
              break;
          }
        }
        if (idx != config.arrayAccessFormPaths.length) {
          obj[childName] = [obj[childName]];
        }
      }
    }
    function fromXmlDateTime(prop) {
      var bits = prop.split(/[-T:+Z]/g);
      var d = new Date(bits[0], bits[1] - 1, bits[2]);
      var secondBits = bits[5].split("\.");
      d.setHours(bits[3], bits[4], secondBits[0]);
      if (secondBits.length > 1)
        d.setMilliseconds(secondBits[1]);
      if (bits[6] && bits[7]) {
        var offsetMinutes = bits[6] * 60 + Number(bits[7]);
        var sign = /\d\d-\d\d:\d\d$/.test(prop) ? '-' : '+';
        offsetMinutes = 0 + (sign == '-' ? -1 * offsetMinutes : offsetMinutes);
        d.setMinutes(d.getMinutes() - offsetMinutes - d.getTimezoneOffset());
      } else if (prop.indexOf("Z", prop.length - 1) !== -1) {
        d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds()));
      }
      return d;
    }
    function checkFromXmlDateTimePaths(value, childName, fullPath) {
      if (config.datetimeAccessFormPaths.length > 0) {
        var path = fullPath.split("\.#")[0];
        var idx = 0;
        for (; idx < config.datetimeAccessFormPaths.length; idx++) {
          var dtPath = config.datetimeAccessFormPaths[idx];
          if (typeof dtPath === "string") {
            if (dtPath == path)
              break;
          } else if (dtPath instanceof RegExp) {
            if (dtPath.test(path))
              break;
          } else if (typeof dtPath === "function") {
            if (dtPath(obj, childName, path))
              break;
          }
        }
        if (idx != config.datetimeAccessFormPaths.length) {
          return fromXmlDateTime(value);
        } else
          return value;
      } else
        return value;
    }
    function parseDOMChildren(node, path) {
      if (node.nodeType == DOMNodeTypes.DOCUMENT_NODE) {
        var result = new Object;
        var nodeChildren = node.childNodes;
        for (var cidx = 0; cidx < nodeChildren.length; cidx++) {
          var child = nodeChildren.item(cidx);
          if (child.nodeType == DOMNodeTypes.ELEMENT_NODE) {
            var childName = getNodeLocalName(child);
            result[childName] = parseDOMChildren(child, childName);
          }
        }
        return result;
      } else if (node.nodeType == DOMNodeTypes.ELEMENT_NODE) {
        var result = new Object;
        result.__cnt = 0;
        var nodeChildren = node.childNodes;
        for (var cidx = 0; cidx < nodeChildren.length; cidx++) {
          var child = nodeChildren.item(cidx);
          var childName = getNodeLocalName(child);
          if (child.nodeType != DOMNodeTypes.COMMENT_NODE) {
            result.__cnt++;
            if (result[childName] == null) {
              result[childName] = parseDOMChildren(child, path + "." + childName);
              toArrayAccessForm(result, childName, path + "." + childName);
            } else {
              if (result[childName] != null) {
                if (!(result[childName] instanceof Array)) {
                  result[childName] = [result[childName]];
                  toArrayAccessForm(result, childName, path + "." + childName);
                }
              }
              (result[childName])[result[childName].length] = parseDOMChildren(child, path + "." + childName);
            }
          }
        }
        for (var aidx = 0; aidx < node.attributes.length; aidx++) {
          var attr = node.attributes.item(aidx);
          result.__cnt++;
          result[config.attributePrefix + attr.name] = attr.value;
        }
        var nodePrefix = getNodePrefix(node);
        if (nodePrefix != null && nodePrefix != "") {
          result.__cnt++;
          result.__prefix = nodePrefix;
        }
        if (result["#text"] != null) {
          result.__text = result["#text"];
          if (result.__text instanceof Array) {
            result.__text = result.__text.join("\n");
          }
          if (config.escapeMode)
            result.__text = unescapeXmlChars(result.__text);
          if (config.stripWhitespaces)
            result.__text = result.__text.trim();
          delete result["#text"];
          if (config.arrayAccessForm == "property")
            delete result["#text_asArray"];
          result.__text = checkFromXmlDateTimePaths(result.__text, childName, path + "." + childName);
        }
        if (result["#cdata-section"] != null) {
          result.__cdata = result["#cdata-section"];
          delete result["#cdata-section"];
          if (config.arrayAccessForm == "property")
            delete result["#cdata-section_asArray"];
        }
        if (result.__cnt == 1 && result.__text != null) {
          result = result.__text;
        } else if (result.__cnt == 0 && config.emptyNodeForm == "text") {
          result = '';
        } else if (result.__cnt > 1 && result.__text != null && config.skipEmptyTextNodesForObj) {
          if ((config.stripWhitespaces && result.__text == "") || (result.__text.trim() == "")) {
            delete result.__text;
          }
        }
        delete result.__cnt;
        if (config.enableToStringFunc && (result.__text != null || result.__cdata != null)) {
          result.toString = function() {
            return (this.__text != null ? this.__text : '') + (this.__cdata != null ? this.__cdata : '');
          };
        }
        return result;
      } else if (node.nodeType == DOMNodeTypes.TEXT_NODE || node.nodeType == DOMNodeTypes.CDATA_SECTION_NODE) {
        return node.nodeValue;
      }
    }
    function startTag(jsonObj, element, attrList, closed) {
      var resultStr = "<" + ((jsonObj != null && jsonObj.__prefix != null) ? (jsonObj.__prefix + ":") : "") + element;
      if (attrList != null) {
        for (var aidx = 0; aidx < attrList.length; aidx++) {
          var attrName = attrList[aidx];
          var attrVal = jsonObj[attrName];
          if (config.escapeMode)
            attrVal = escapeXmlChars(attrVal);
          resultStr += " " + attrName.substr(config.attributePrefix.length) + "='" + attrVal + "'";
        }
      }
      if (!closed)
        resultStr += ">";
      else
        resultStr += "/>";
      return resultStr;
    }
    function endTag(jsonObj, elementName) {
      return "</" + (jsonObj.__prefix != null ? (jsonObj.__prefix + ":") : "") + elementName + ">";
    }
    function endsWith(str, suffix) {
      return str.indexOf(suffix, str.length - suffix.length) !== -1;
    }
    function jsonXmlSpecialElem(jsonObj, jsonObjField) {
      if ((config.arrayAccessForm == "property" && endsWith(jsonObjField.toString(), ("_asArray"))) || jsonObjField.toString().indexOf(config.attributePrefix) == 0 || jsonObjField.toString().indexOf("__") == 0 || (jsonObj[jsonObjField] instanceof Function))
        return true;
      else
        return false;
    }
    function jsonXmlElemCount(jsonObj) {
      var elementsCnt = 0;
      if (jsonObj instanceof Object) {
        for (var it in jsonObj) {
          if (jsonXmlSpecialElem(jsonObj, it))
            continue;
          elementsCnt++;
        }
      }
      return elementsCnt;
    }
    function parseJSONAttributes(jsonObj) {
      var attrList = [];
      if (jsonObj instanceof Object) {
        for (var ait in jsonObj) {
          if (ait.toString().indexOf("__") == -1 && ait.toString().indexOf(config.attributePrefix) == 0) {
            attrList.push(ait);
          }
        }
      }
      return attrList;
    }
    function parseJSONTextAttrs(jsonTxtObj) {
      var result = "";
      if (jsonTxtObj.__cdata != null) {
        result += "<![CDATA[" + jsonTxtObj.__cdata + "]]>";
      }
      if (jsonTxtObj.__text != null) {
        if (config.escapeMode)
          result += escapeXmlChars(jsonTxtObj.__text);
        else
          result += jsonTxtObj.__text;
      }
      return result;
    }
    function parseJSONTextObject(jsonTxtObj) {
      var result = "";
      if (jsonTxtObj instanceof Object) {
        result += parseJSONTextAttrs(jsonTxtObj);
      } else if (jsonTxtObj != null) {
        if (config.escapeMode)
          result += escapeXmlChars(jsonTxtObj);
        else
          result += jsonTxtObj;
      }
      return result;
    }
    function parseJSONArray(jsonArrRoot, jsonArrObj, attrList) {
      var result = "";
      if (jsonArrRoot.length == 0) {
        result += startTag(jsonArrRoot, jsonArrObj, attrList, true);
      } else {
        for (var arIdx = 0; arIdx < jsonArrRoot.length; arIdx++) {
          result += startTag(jsonArrRoot[arIdx], jsonArrObj, parseJSONAttributes(jsonArrRoot[arIdx]), false);
          result += parseJSONObject(jsonArrRoot[arIdx]);
          result += endTag(jsonArrRoot[arIdx], jsonArrObj);
        }
      }
      return result;
    }
    function parseJSONObject(jsonObj) {
      var result = "";
      var elementsCnt = jsonXmlElemCount(jsonObj);
      if (elementsCnt > 0) {
        for (var it in jsonObj) {
          if (jsonXmlSpecialElem(jsonObj, it))
            continue;
          var subObj = jsonObj[it];
          var attrList = parseJSONAttributes(subObj);
          if (subObj == null || subObj == undefined) {
            result += startTag(subObj, it, attrList, true);
          } else if (subObj instanceof Object) {
            if (subObj instanceof Array) {
              result += parseJSONArray(subObj, it, attrList);
            } else if (subObj instanceof Date) {
              result += startTag(subObj, it, attrList, false);
              result += subObj.toISOString();
              result += endTag(subObj, it);
            } else {
              var subObjElementsCnt = jsonXmlElemCount(subObj);
              if (subObjElementsCnt > 0 || subObj.__text != null || subObj.__cdata != null) {
                result += startTag(subObj, it, attrList, false);
                result += parseJSONObject(subObj);
                result += endTag(subObj, it);
              } else {
                result += startTag(subObj, it, attrList, true);
              }
            }
          } else {
            result += startTag(subObj, it, attrList, false);
            result += parseJSONTextObject(subObj);
            result += endTag(subObj, it);
          }
        }
      }
      result += parseJSONTextObject(jsonObj);
      return result;
    }
    this.parseXmlString = function(xmlDocStr) {
      var isIEParser = window.ActiveXObject || "ActiveXObject" in window;
      if (xmlDocStr === undefined) {
        return null;
      }
      var xmlDoc;
      if (window.DOMParser) {
        var parser = new window.DOMParser();
        var parsererrorNS = null;
        if (!isIEParser) {
          try {
            parsererrorNS = parser.parseFromString("INVALID", "text/xml").childNodes[0].namespaceURI;
          } catch (err) {
            parsererrorNS = null;
          }
        }
        try {
          xmlDoc = parser.parseFromString(xmlDocStr, "text/xml");
          if (parsererrorNS != null && xmlDoc.getElementsByTagNameNS(parsererrorNS, "parsererror").length > 0) {
            xmlDoc = null;
          }
        } catch (err) {
          xmlDoc = null;
        }
      } else {
        if (xmlDocStr.indexOf("<?") == 0) {
          xmlDocStr = xmlDocStr.substr(xmlDocStr.indexOf("?>") + 2);
        }
        xmlDoc = new ActiveXObject("Microsoft.XMLDOM");
        xmlDoc.async = "false";
        xmlDoc.loadXML(xmlDocStr);
      }
      return xmlDoc;
    };
    this.asArray = function(prop) {
      if (prop instanceof Array)
        return prop;
      else
        return [prop];
    };
    this.toXmlDateTime = function(dt) {
      if (dt instanceof Date)
        return dt.toISOString();
      else if (typeof(dt) === 'number')
        return new Date(dt).toISOString();
      else
        return null;
    };
    this.asDateTime = function(prop) {
      if (typeof(prop) == "string") {
        return fromXmlDateTime(prop);
      } else
        return prop;
    };
    this.xml2json = function(xmlDoc) {
      return parseDOMChildren(xmlDoc);
    };
    this.xml_str2json = function(xmlDocStr) {
      var xmlDoc = this.parseXmlString(xmlDocStr);
      if (xmlDoc != null)
        return this.xml2json(xmlDoc);
      else
        return null;
    };
    this.json2xml_str = function(jsonObj) {
      return parseJSONObject(jsonObj);
    };
    this.json2xml = function(jsonObj) {
      var xmlDocStr = this.json2xml_str(jsonObj);
      return this.parseXmlString(xmlDocStr);
    };
    this.getVersion = function() {
      return VERSION;
    };
  };
});

})();
$__System.registerDynamic("30", ["31", "36", "32", "33", "34", "35"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  exports = module.exports = $__require('31');
  exports.Stream = $__require('36');
  exports.Readable = exports;
  exports.Writable = $__require('32');
  exports.Duplex = $__require('33');
  exports.Transform = $__require('34');
  exports.PassThrough = $__require('35');
  return module.exports;
});

$__System.registerDynamic("37", ["32"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = $__require('32');
  return module.exports;
});

$__System.registerDynamic("38", ["33"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = $__require('33');
  return module.exports;
});

$__System.registerDynamic("39", ["34"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = $__require('34');
  return module.exports;
});

$__System.registerDynamic("3a", [], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = Array.isArray || function(arr) {
    return Object.prototype.toString.call(arr) == '[object Array]';
  };
  return module.exports;
});

$__System.registerDynamic("3b", ["3a"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = $__require('3a');
  return module.exports;
});

$__System.registerDynamic("31", ["3b", "3c", "3d", "36", "3e", "3f", "@empty", "33", "40", "20"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  (function(Buffer, process) {
    module.exports = Readable;
    var isArray = $__require('3b');
    var Buffer = $__require('3c').Buffer;
    Readable.ReadableState = ReadableState;
    var EE = $__require('3d').EventEmitter;
    if (!EE.listenerCount)
      EE.listenerCount = function(emitter, type) {
        return emitter.listeners(type).length;
      };
    var Stream = $__require('36');
    var util = $__require('3e');
    util.inherits = $__require('3f');
    var StringDecoder;
    var debug = $__require('@empty');
    if (debug && debug.debuglog) {
      debug = debug.debuglog('stream');
    } else {
      debug = function() {};
    }
    util.inherits(Readable, Stream);
    function ReadableState(options, stream) {
      var Duplex = $__require('33');
      options = options || {};
      var hwm = options.highWaterMark;
      var defaultHwm = options.objectMode ? 16 : 16 * 1024;
      this.highWaterMark = (hwm || hwm === 0) ? hwm : defaultHwm;
      this.highWaterMark = ~~this.highWaterMark;
      this.buffer = [];
      this.length = 0;
      this.pipes = null;
      this.pipesCount = 0;
      this.flowing = null;
      this.ended = false;
      this.endEmitted = false;
      this.reading = false;
      this.sync = true;
      this.needReadable = false;
      this.emittedReadable = false;
      this.readableListening = false;
      this.objectMode = !!options.objectMode;
      if (stream instanceof Duplex)
        this.objectMode = this.objectMode || !!options.readableObjectMode;
      this.defaultEncoding = options.defaultEncoding || 'utf8';
      this.ranOut = false;
      this.awaitDrain = 0;
      this.readingMore = false;
      this.decoder = null;
      this.encoding = null;
      if (options.encoding) {
        if (!StringDecoder)
          StringDecoder = $__require('40').StringDecoder;
        this.decoder = new StringDecoder(options.encoding);
        this.encoding = options.encoding;
      }
    }
    function Readable(options) {
      var Duplex = $__require('33');
      if (!(this instanceof Readable))
        return new Readable(options);
      this._readableState = new ReadableState(options, this);
      this.readable = true;
      Stream.call(this);
    }
    Readable.prototype.push = function(chunk, encoding) {
      var state = this._readableState;
      if (util.isString(chunk) && !state.objectMode) {
        encoding = encoding || state.defaultEncoding;
        if (encoding !== state.encoding) {
          chunk = new Buffer(chunk, encoding);
          encoding = '';
        }
      }
      return readableAddChunk(this, state, chunk, encoding, false);
    };
    Readable.prototype.unshift = function(chunk) {
      var state = this._readableState;
      return readableAddChunk(this, state, chunk, '', true);
    };
    function readableAddChunk(stream, state, chunk, encoding, addToFront) {
      var er = chunkInvalid(state, chunk);
      if (er) {
        stream.emit('error', er);
      } else if (util.isNullOrUndefined(chunk)) {
        state.reading = false;
        if (!state.ended)
          onEofChunk(stream, state);
      } else if (state.objectMode || chunk && chunk.length > 0) {
        if (state.ended && !addToFront) {
          var e = new Error('stream.push() after EOF');
          stream.emit('error', e);
        } else if (state.endEmitted && addToFront) {
          var e = new Error('stream.unshift() after end event');
          stream.emit('error', e);
        } else {
          if (state.decoder && !addToFront && !encoding)
            chunk = state.decoder.write(chunk);
          if (!addToFront)
            state.reading = false;
          if (state.flowing && state.length === 0 && !state.sync) {
            stream.emit('data', chunk);
            stream.read(0);
          } else {
            state.length += state.objectMode ? 1 : chunk.length;
            if (addToFront)
              state.buffer.unshift(chunk);
            else
              state.buffer.push(chunk);
            if (state.needReadable)
              emitReadable(stream);
          }
          maybeReadMore(stream, state);
        }
      } else if (!addToFront) {
        state.reading = false;
      }
      return needMoreData(state);
    }
    function needMoreData(state) {
      return !state.ended && (state.needReadable || state.length < state.highWaterMark || state.length === 0);
    }
    Readable.prototype.setEncoding = function(enc) {
      if (!StringDecoder)
        StringDecoder = $__require('40').StringDecoder;
      this._readableState.decoder = new StringDecoder(enc);
      this._readableState.encoding = enc;
      return this;
    };
    var MAX_HWM = 0x800000;
    function roundUpToNextPowerOf2(n) {
      if (n >= MAX_HWM) {
        n = MAX_HWM;
      } else {
        n--;
        for (var p = 1; p < 32; p <<= 1)
          n |= n >> p;
        n++;
      }
      return n;
    }
    function howMuchToRead(n, state) {
      if (state.length === 0 && state.ended)
        return 0;
      if (state.objectMode)
        return n === 0 ? 0 : 1;
      if (isNaN(n) || util.isNull(n)) {
        if (state.flowing && state.buffer.length)
          return state.buffer[0].length;
        else
          return state.length;
      }
      if (n <= 0)
        return 0;
      if (n > state.highWaterMark)
        state.highWaterMark = roundUpToNextPowerOf2(n);
      if (n > state.length) {
        if (!state.ended) {
          state.needReadable = true;
          return 0;
        } else
          return state.length;
      }
      return n;
    }
    Readable.prototype.read = function(n) {
      debug('read', n);
      var state = this._readableState;
      var nOrig = n;
      if (!util.isNumber(n) || n > 0)
        state.emittedReadable = false;
      if (n === 0 && state.needReadable && (state.length >= state.highWaterMark || state.ended)) {
        debug('read: emitReadable', state.length, state.ended);
        if (state.length === 0 && state.ended)
          endReadable(this);
        else
          emitReadable(this);
        return null;
      }
      n = howMuchToRead(n, state);
      if (n === 0 && state.ended) {
        if (state.length === 0)
          endReadable(this);
        return null;
      }
      var doRead = state.needReadable;
      debug('need readable', doRead);
      if (state.length === 0 || state.length - n < state.highWaterMark) {
        doRead = true;
        debug('length less than watermark', doRead);
      }
      if (state.ended || state.reading) {
        doRead = false;
        debug('reading or ended', doRead);
      }
      if (doRead) {
        debug('do read');
        state.reading = true;
        state.sync = true;
        if (state.length === 0)
          state.needReadable = true;
        this._read(state.highWaterMark);
        state.sync = false;
      }
      if (doRead && !state.reading)
        n = howMuchToRead(nOrig, state);
      var ret;
      if (n > 0)
        ret = fromList(n, state);
      else
        ret = null;
      if (util.isNull(ret)) {
        state.needReadable = true;
        n = 0;
      }
      state.length -= n;
      if (state.length === 0 && !state.ended)
        state.needReadable = true;
      if (nOrig !== n && state.ended && state.length === 0)
        endReadable(this);
      if (!util.isNull(ret))
        this.emit('data', ret);
      return ret;
    };
    function chunkInvalid(state, chunk) {
      var er = null;
      if (!util.isBuffer(chunk) && !util.isString(chunk) && !util.isNullOrUndefined(chunk) && !state.objectMode) {
        er = new TypeError('Invalid non-string/buffer chunk');
      }
      return er;
    }
    function onEofChunk(stream, state) {
      if (state.decoder && !state.ended) {
        var chunk = state.decoder.end();
        if (chunk && chunk.length) {
          state.buffer.push(chunk);
          state.length += state.objectMode ? 1 : chunk.length;
        }
      }
      state.ended = true;
      emitReadable(stream);
    }
    function emitReadable(stream) {
      var state = stream._readableState;
      state.needReadable = false;
      if (!state.emittedReadable) {
        debug('emitReadable', state.flowing);
        state.emittedReadable = true;
        if (state.sync)
          process.nextTick(function() {
            emitReadable_(stream);
          });
        else
          emitReadable_(stream);
      }
    }
    function emitReadable_(stream) {
      debug('emit readable');
      stream.emit('readable');
      flow(stream);
    }
    function maybeReadMore(stream, state) {
      if (!state.readingMore) {
        state.readingMore = true;
        process.nextTick(function() {
          maybeReadMore_(stream, state);
        });
      }
    }
    function maybeReadMore_(stream, state) {
      var len = state.length;
      while (!state.reading && !state.flowing && !state.ended && state.length < state.highWaterMark) {
        debug('maybeReadMore read 0');
        stream.read(0);
        if (len === state.length)
          break;
        else
          len = state.length;
      }
      state.readingMore = false;
    }
    Readable.prototype._read = function(n) {
      this.emit('error', new Error('not implemented'));
    };
    Readable.prototype.pipe = function(dest, pipeOpts) {
      var src = this;
      var state = this._readableState;
      switch (state.pipesCount) {
        case 0:
          state.pipes = dest;
          break;
        case 1:
          state.pipes = [state.pipes, dest];
          break;
        default:
          state.pipes.push(dest);
          break;
      }
      state.pipesCount += 1;
      debug('pipe count=%d opts=%j', state.pipesCount, pipeOpts);
      var doEnd = (!pipeOpts || pipeOpts.end !== false) && dest !== process.stdout && dest !== process.stderr;
      var endFn = doEnd ? onend : cleanup;
      if (state.endEmitted)
        process.nextTick(endFn);
      else
        src.once('end', endFn);
      dest.on('unpipe', onunpipe);
      function onunpipe(readable) {
        debug('onunpipe');
        if (readable === src) {
          cleanup();
        }
      }
      function onend() {
        debug('onend');
        dest.end();
      }
      var ondrain = pipeOnDrain(src);
      dest.on('drain', ondrain);
      function cleanup() {
        debug('cleanup');
        dest.removeListener('close', onclose);
        dest.removeListener('finish', onfinish);
        dest.removeListener('drain', ondrain);
        dest.removeListener('error', onerror);
        dest.removeListener('unpipe', onunpipe);
        src.removeListener('end', onend);
        src.removeListener('end', cleanup);
        src.removeListener('data', ondata);
        if (state.awaitDrain && (!dest._writableState || dest._writableState.needDrain))
          ondrain();
      }
      src.on('data', ondata);
      function ondata(chunk) {
        debug('ondata');
        var ret = dest.write(chunk);
        if (false === ret) {
          debug('false write response, pause', src._readableState.awaitDrain);
          src._readableState.awaitDrain++;
          src.pause();
        }
      }
      function onerror(er) {
        debug('onerror', er);
        unpipe();
        dest.removeListener('error', onerror);
        if (EE.listenerCount(dest, 'error') === 0)
          dest.emit('error', er);
      }
      if (!dest._events || !dest._events.error)
        dest.on('error', onerror);
      else if (isArray(dest._events.error))
        dest._events.error.unshift(onerror);
      else
        dest._events.error = [onerror, dest._events.error];
      function onclose() {
        dest.removeListener('finish', onfinish);
        unpipe();
      }
      dest.once('close', onclose);
      function onfinish() {
        debug('onfinish');
        dest.removeListener('close', onclose);
        unpipe();
      }
      dest.once('finish', onfinish);
      function unpipe() {
        debug('unpipe');
        src.unpipe(dest);
      }
      dest.emit('pipe', src);
      if (!state.flowing) {
        debug('pipe resume');
        src.resume();
      }
      return dest;
    };
    function pipeOnDrain(src) {
      return function() {
        var state = src._readableState;
        debug('pipeOnDrain', state.awaitDrain);
        if (state.awaitDrain)
          state.awaitDrain--;
        if (state.awaitDrain === 0 && EE.listenerCount(src, 'data')) {
          state.flowing = true;
          flow(src);
        }
      };
    }
    Readable.prototype.unpipe = function(dest) {
      var state = this._readableState;
      if (state.pipesCount === 0)
        return this;
      if (state.pipesCount === 1) {
        if (dest && dest !== state.pipes)
          return this;
        if (!dest)
          dest = state.pipes;
        state.pipes = null;
        state.pipesCount = 0;
        state.flowing = false;
        if (dest)
          dest.emit('unpipe', this);
        return this;
      }
      if (!dest) {
        var dests = state.pipes;
        var len = state.pipesCount;
        state.pipes = null;
        state.pipesCount = 0;
        state.flowing = false;
        for (var i = 0; i < len; i++)
          dests[i].emit('unpipe', this);
        return this;
      }
      var i = indexOf(state.pipes, dest);
      if (i === -1)
        return this;
      state.pipes.splice(i, 1);
      state.pipesCount -= 1;
      if (state.pipesCount === 1)
        state.pipes = state.pipes[0];
      dest.emit('unpipe', this);
      return this;
    };
    Readable.prototype.on = function(ev, fn) {
      var res = Stream.prototype.on.call(this, ev, fn);
      if (ev === 'data' && false !== this._readableState.flowing) {
        this.resume();
      }
      if (ev === 'readable' && this.readable) {
        var state = this._readableState;
        if (!state.readableListening) {
          state.readableListening = true;
          state.emittedReadable = false;
          state.needReadable = true;
          if (!state.reading) {
            var self = this;
            process.nextTick(function() {
              debug('readable nexttick read 0');
              self.read(0);
            });
          } else if (state.length) {
            emitReadable(this, state);
          }
        }
      }
      return res;
    };
    Readable.prototype.addListener = Readable.prototype.on;
    Readable.prototype.resume = function() {
      var state = this._readableState;
      if (!state.flowing) {
        debug('resume');
        state.flowing = true;
        if (!state.reading) {
          debug('resume read 0');
          this.read(0);
        }
        resume(this, state);
      }
      return this;
    };
    function resume(stream, state) {
      if (!state.resumeScheduled) {
        state.resumeScheduled = true;
        process.nextTick(function() {
          resume_(stream, state);
        });
      }
    }
    function resume_(stream, state) {
      state.resumeScheduled = false;
      stream.emit('resume');
      flow(stream);
      if (state.flowing && !state.reading)
        stream.read(0);
    }
    Readable.prototype.pause = function() {
      debug('call pause flowing=%j', this._readableState.flowing);
      if (false !== this._readableState.flowing) {
        debug('pause');
        this._readableState.flowing = false;
        this.emit('pause');
      }
      return this;
    };
    function flow(stream) {
      var state = stream._readableState;
      debug('flow', state.flowing);
      if (state.flowing) {
        do {
          var chunk = stream.read();
        } while (null !== chunk && state.flowing);
      }
    }
    Readable.prototype.wrap = function(stream) {
      var state = this._readableState;
      var paused = false;
      var self = this;
      stream.on('end', function() {
        debug('wrapped end');
        if (state.decoder && !state.ended) {
          var chunk = state.decoder.end();
          if (chunk && chunk.length)
            self.push(chunk);
        }
        self.push(null);
      });
      stream.on('data', function(chunk) {
        debug('wrapped data');
        if (state.decoder)
          chunk = state.decoder.write(chunk);
        if (!chunk || !state.objectMode && !chunk.length)
          return;
        var ret = self.push(chunk);
        if (!ret) {
          paused = true;
          stream.pause();
        }
      });
      for (var i in stream) {
        if (util.isFunction(stream[i]) && util.isUndefined(this[i])) {
          this[i] = function(method) {
            return function() {
              return stream[method].apply(stream, arguments);
            };
          }(i);
        }
      }
      var events = ['error', 'close', 'destroy', 'pause', 'resume'];
      forEach(events, function(ev) {
        stream.on(ev, self.emit.bind(self, ev));
      });
      self._read = function(n) {
        debug('wrapped _read', n);
        if (paused) {
          paused = false;
          stream.resume();
        }
      };
      return self;
    };
    Readable._fromList = fromList;
    function fromList(n, state) {
      var list = state.buffer;
      var length = state.length;
      var stringMode = !!state.decoder;
      var objectMode = !!state.objectMode;
      var ret;
      if (list.length === 0)
        return null;
      if (length === 0)
        ret = null;
      else if (objectMode)
        ret = list.shift();
      else if (!n || n >= length) {
        if (stringMode)
          ret = list.join('');
        else
          ret = Buffer.concat(list, length);
        list.length = 0;
      } else {
        if (n < list[0].length) {
          var buf = list[0];
          ret = buf.slice(0, n);
          list[0] = buf.slice(n);
        } else if (n === list[0].length) {
          ret = list.shift();
        } else {
          if (stringMode)
            ret = '';
          else
            ret = new Buffer(n);
          var c = 0;
          for (var i = 0,
              l = list.length; i < l && c < n; i++) {
            var buf = list[0];
            var cpy = Math.min(n - c, buf.length);
            if (stringMode)
              ret += buf.slice(0, cpy);
            else
              buf.copy(ret, c, 0, cpy);
            if (cpy < buf.length)
              list[0] = buf.slice(cpy);
            else
              list.shift();
            c += cpy;
          }
        }
      }
      return ret;
    }
    function endReadable(stream) {
      var state = stream._readableState;
      if (state.length > 0)
        throw new Error('endReadable called on non-empty stream');
      if (!state.endEmitted) {
        state.ended = true;
        process.nextTick(function() {
          if (!state.endEmitted && state.length === 0) {
            state.endEmitted = true;
            stream.readable = false;
            stream.emit('end');
          }
        });
      }
    }
    function forEach(xs, f) {
      for (var i = 0,
          l = xs.length; i < l; i++) {
        f(xs[i], i);
      }
    }
    function indexOf(xs, x) {
      for (var i = 0,
          l = xs.length; i < l; i++) {
        if (xs[i] === x)
          return i;
      }
      return -1;
    }
  })($__require('3c').Buffer, $__require('20'));
  return module.exports;
});

$__System.registerDynamic("32", ["3c", "3e", "3f", "36", "33", "20"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  (function(Buffer, process) {
    module.exports = Writable;
    var Buffer = $__require('3c').Buffer;
    Writable.WritableState = WritableState;
    var util = $__require('3e');
    util.inherits = $__require('3f');
    var Stream = $__require('36');
    util.inherits(Writable, Stream);
    function WriteReq(chunk, encoding, cb) {
      this.chunk = chunk;
      this.encoding = encoding;
      this.callback = cb;
    }
    function WritableState(options, stream) {
      var Duplex = $__require('33');
      options = options || {};
      var hwm = options.highWaterMark;
      var defaultHwm = options.objectMode ? 16 : 16 * 1024;
      this.highWaterMark = (hwm || hwm === 0) ? hwm : defaultHwm;
      this.objectMode = !!options.objectMode;
      if (stream instanceof Duplex)
        this.objectMode = this.objectMode || !!options.writableObjectMode;
      this.highWaterMark = ~~this.highWaterMark;
      this.needDrain = false;
      this.ending = false;
      this.ended = false;
      this.finished = false;
      var noDecode = options.decodeStrings === false;
      this.decodeStrings = !noDecode;
      this.defaultEncoding = options.defaultEncoding || 'utf8';
      this.length = 0;
      this.writing = false;
      this.corked = 0;
      this.sync = true;
      this.bufferProcessing = false;
      this.onwrite = function(er) {
        onwrite(stream, er);
      };
      this.writecb = null;
      this.writelen = 0;
      this.buffer = [];
      this.pendingcb = 0;
      this.prefinished = false;
      this.errorEmitted = false;
    }
    function Writable(options) {
      var Duplex = $__require('33');
      if (!(this instanceof Writable) && !(this instanceof Duplex))
        return new Writable(options);
      this._writableState = new WritableState(options, this);
      this.writable = true;
      Stream.call(this);
    }
    Writable.prototype.pipe = function() {
      this.emit('error', new Error('Cannot pipe. Not readable.'));
    };
    function writeAfterEnd(stream, state, cb) {
      var er = new Error('write after end');
      stream.emit('error', er);
      process.nextTick(function() {
        cb(er);
      });
    }
    function validChunk(stream, state, chunk, cb) {
      var valid = true;
      if (!util.isBuffer(chunk) && !util.isString(chunk) && !util.isNullOrUndefined(chunk) && !state.objectMode) {
        var er = new TypeError('Invalid non-string/buffer chunk');
        stream.emit('error', er);
        process.nextTick(function() {
          cb(er);
        });
        valid = false;
      }
      return valid;
    }
    Writable.prototype.write = function(chunk, encoding, cb) {
      var state = this._writableState;
      var ret = false;
      if (util.isFunction(encoding)) {
        cb = encoding;
        encoding = null;
      }
      if (util.isBuffer(chunk))
        encoding = 'buffer';
      else if (!encoding)
        encoding = state.defaultEncoding;
      if (!util.isFunction(cb))
        cb = function() {};
      if (state.ended)
        writeAfterEnd(this, state, cb);
      else if (validChunk(this, state, chunk, cb)) {
        state.pendingcb++;
        ret = writeOrBuffer(this, state, chunk, encoding, cb);
      }
      return ret;
    };
    Writable.prototype.cork = function() {
      var state = this._writableState;
      state.corked++;
    };
    Writable.prototype.uncork = function() {
      var state = this._writableState;
      if (state.corked) {
        state.corked--;
        if (!state.writing && !state.corked && !state.finished && !state.bufferProcessing && state.buffer.length)
          clearBuffer(this, state);
      }
    };
    function decodeChunk(state, chunk, encoding) {
      if (!state.objectMode && state.decodeStrings !== false && util.isString(chunk)) {
        chunk = new Buffer(chunk, encoding);
      }
      return chunk;
    }
    function writeOrBuffer(stream, state, chunk, encoding, cb) {
      chunk = decodeChunk(state, chunk, encoding);
      if (util.isBuffer(chunk))
        encoding = 'buffer';
      var len = state.objectMode ? 1 : chunk.length;
      state.length += len;
      var ret = state.length < state.highWaterMark;
      if (!ret)
        state.needDrain = true;
      if (state.writing || state.corked)
        state.buffer.push(new WriteReq(chunk, encoding, cb));
      else
        doWrite(stream, state, false, len, chunk, encoding, cb);
      return ret;
    }
    function doWrite(stream, state, writev, len, chunk, encoding, cb) {
      state.writelen = len;
      state.writecb = cb;
      state.writing = true;
      state.sync = true;
      if (writev)
        stream._writev(chunk, state.onwrite);
      else
        stream._write(chunk, encoding, state.onwrite);
      state.sync = false;
    }
    function onwriteError(stream, state, sync, er, cb) {
      if (sync)
        process.nextTick(function() {
          state.pendingcb--;
          cb(er);
        });
      else {
        state.pendingcb--;
        cb(er);
      }
      stream._writableState.errorEmitted = true;
      stream.emit('error', er);
    }
    function onwriteStateUpdate(state) {
      state.writing = false;
      state.writecb = null;
      state.length -= state.writelen;
      state.writelen = 0;
    }
    function onwrite(stream, er) {
      var state = stream._writableState;
      var sync = state.sync;
      var cb = state.writecb;
      onwriteStateUpdate(state);
      if (er)
        onwriteError(stream, state, sync, er, cb);
      else {
        var finished = needFinish(stream, state);
        if (!finished && !state.corked && !state.bufferProcessing && state.buffer.length) {
          clearBuffer(stream, state);
        }
        if (sync) {
          process.nextTick(function() {
            afterWrite(stream, state, finished, cb);
          });
        } else {
          afterWrite(stream, state, finished, cb);
        }
      }
    }
    function afterWrite(stream, state, finished, cb) {
      if (!finished)
        onwriteDrain(stream, state);
      state.pendingcb--;
      cb();
      finishMaybe(stream, state);
    }
    function onwriteDrain(stream, state) {
      if (state.length === 0 && state.needDrain) {
        state.needDrain = false;
        stream.emit('drain');
      }
    }
    function clearBuffer(stream, state) {
      state.bufferProcessing = true;
      if (stream._writev && state.buffer.length > 1) {
        var cbs = [];
        for (var c = 0; c < state.buffer.length; c++)
          cbs.push(state.buffer[c].callback);
        state.pendingcb++;
        doWrite(stream, state, true, state.length, state.buffer, '', function(err) {
          for (var i = 0; i < cbs.length; i++) {
            state.pendingcb--;
            cbs[i](err);
          }
        });
        state.buffer = [];
      } else {
        for (var c = 0; c < state.buffer.length; c++) {
          var entry = state.buffer[c];
          var chunk = entry.chunk;
          var encoding = entry.encoding;
          var cb = entry.callback;
          var len = state.objectMode ? 1 : chunk.length;
          doWrite(stream, state, false, len, chunk, encoding, cb);
          if (state.writing) {
            c++;
            break;
          }
        }
        if (c < state.buffer.length)
          state.buffer = state.buffer.slice(c);
        else
          state.buffer.length = 0;
      }
      state.bufferProcessing = false;
    }
    Writable.prototype._write = function(chunk, encoding, cb) {
      cb(new Error('not implemented'));
    };
    Writable.prototype._writev = null;
    Writable.prototype.end = function(chunk, encoding, cb) {
      var state = this._writableState;
      if (util.isFunction(chunk)) {
        cb = chunk;
        chunk = null;
        encoding = null;
      } else if (util.isFunction(encoding)) {
        cb = encoding;
        encoding = null;
      }
      if (!util.isNullOrUndefined(chunk))
        this.write(chunk, encoding);
      if (state.corked) {
        state.corked = 1;
        this.uncork();
      }
      if (!state.ending && !state.finished)
        endWritable(this, state, cb);
    };
    function needFinish(stream, state) {
      return (state.ending && state.length === 0 && !state.finished && !state.writing);
    }
    function prefinish(stream, state) {
      if (!state.prefinished) {
        state.prefinished = true;
        stream.emit('prefinish');
      }
    }
    function finishMaybe(stream, state) {
      var need = needFinish(stream, state);
      if (need) {
        if (state.pendingcb === 0) {
          prefinish(stream, state);
          state.finished = true;
          stream.emit('finish');
        } else
          prefinish(stream, state);
      }
      return need;
    }
    function endWritable(stream, state, cb) {
      state.ending = true;
      finishMaybe(stream, state);
      if (cb) {
        if (state.finished)
          process.nextTick(cb);
        else
          stream.once('finish', cb);
      }
      state.ended = true;
    }
  })($__require('3c').Buffer, $__require('20'));
  return module.exports;
});

$__System.registerDynamic("33", ["3e", "3f", "31", "32", "20"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  (function(process) {
    module.exports = Duplex;
    var objectKeys = Object.keys || function(obj) {
      var keys = [];
      for (var key in obj)
        keys.push(key);
      return keys;
    };
    var util = $__require('3e');
    util.inherits = $__require('3f');
    var Readable = $__require('31');
    var Writable = $__require('32');
    util.inherits(Duplex, Readable);
    forEach(objectKeys(Writable.prototype), function(method) {
      if (!Duplex.prototype[method])
        Duplex.prototype[method] = Writable.prototype[method];
    });
    function Duplex(options) {
      if (!(this instanceof Duplex))
        return new Duplex(options);
      Readable.call(this, options);
      Writable.call(this, options);
      if (options && options.readable === false)
        this.readable = false;
      if (options && options.writable === false)
        this.writable = false;
      this.allowHalfOpen = true;
      if (options && options.allowHalfOpen === false)
        this.allowHalfOpen = false;
      this.once('end', onend);
    }
    function onend() {
      if (this.allowHalfOpen || this._writableState.ended)
        return;
      process.nextTick(this.end.bind(this));
    }
    function forEach(xs, f) {
      for (var i = 0,
          l = xs.length; i < l; i++) {
        f(xs[i], i);
      }
    }
  })($__require('20'));
  return module.exports;
});

$__System.registerDynamic("34", ["33", "3e", "3f", "20"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  (function(process) {
    module.exports = Transform;
    var Duplex = $__require('33');
    var util = $__require('3e');
    util.inherits = $__require('3f');
    util.inherits(Transform, Duplex);
    function TransformState(options, stream) {
      this.afterTransform = function(er, data) {
        return afterTransform(stream, er, data);
      };
      this.needTransform = false;
      this.transforming = false;
      this.writecb = null;
      this.writechunk = null;
    }
    function afterTransform(stream, er, data) {
      var ts = stream._transformState;
      ts.transforming = false;
      var cb = ts.writecb;
      if (!cb)
        return stream.emit('error', new Error('no writecb in Transform class'));
      ts.writechunk = null;
      ts.writecb = null;
      if (!util.isNullOrUndefined(data))
        stream.push(data);
      if (cb)
        cb(er);
      var rs = stream._readableState;
      rs.reading = false;
      if (rs.needReadable || rs.length < rs.highWaterMark) {
        stream._read(rs.highWaterMark);
      }
    }
    function Transform(options) {
      if (!(this instanceof Transform))
        return new Transform(options);
      Duplex.call(this, options);
      this._transformState = new TransformState(options, this);
      var stream = this;
      this._readableState.needReadable = true;
      this._readableState.sync = false;
      this.once('prefinish', function() {
        if (util.isFunction(this._flush))
          this._flush(function(er) {
            done(stream, er);
          });
        else
          done(stream);
      });
    }
    Transform.prototype.push = function(chunk, encoding) {
      this._transformState.needTransform = false;
      return Duplex.prototype.push.call(this, chunk, encoding);
    };
    Transform.prototype._transform = function(chunk, encoding, cb) {
      throw new Error('not implemented');
    };
    Transform.prototype._write = function(chunk, encoding, cb) {
      var ts = this._transformState;
      ts.writecb = cb;
      ts.writechunk = chunk;
      ts.writeencoding = encoding;
      if (!ts.transforming) {
        var rs = this._readableState;
        if (ts.needTransform || rs.needReadable || rs.length < rs.highWaterMark)
          this._read(rs.highWaterMark);
      }
    };
    Transform.prototype._read = function(n) {
      var ts = this._transformState;
      if (!util.isNull(ts.writechunk) && ts.writecb && !ts.transforming) {
        ts.transforming = true;
        this._transform(ts.writechunk, ts.writeencoding, ts.afterTransform);
      } else {
        ts.needTransform = true;
      }
    };
    function done(stream, er) {
      if (er)
        return stream.emit('error', er);
      var ws = stream._writableState;
      var ts = stream._transformState;
      if (ws.length)
        throw new Error('calling transform done when ws.length != 0');
      if (ts.transforming)
        throw new Error('calling transform done when still transforming');
      return stream.push(null);
    }
  })($__require('20'));
  return module.exports;
});

$__System.registerDynamic("41", ["3c"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  (function(Buffer) {
    function isArray(arg) {
      if (Array.isArray) {
        return Array.isArray(arg);
      }
      return objectToString(arg) === '[object Array]';
    }
    exports.isArray = isArray;
    function isBoolean(arg) {
      return typeof arg === 'boolean';
    }
    exports.isBoolean = isBoolean;
    function isNull(arg) {
      return arg === null;
    }
    exports.isNull = isNull;
    function isNullOrUndefined(arg) {
      return arg == null;
    }
    exports.isNullOrUndefined = isNullOrUndefined;
    function isNumber(arg) {
      return typeof arg === 'number';
    }
    exports.isNumber = isNumber;
    function isString(arg) {
      return typeof arg === 'string';
    }
    exports.isString = isString;
    function isSymbol(arg) {
      return typeof arg === 'symbol';
    }
    exports.isSymbol = isSymbol;
    function isUndefined(arg) {
      return arg === void 0;
    }
    exports.isUndefined = isUndefined;
    function isRegExp(re) {
      return objectToString(re) === '[object RegExp]';
    }
    exports.isRegExp = isRegExp;
    function isObject(arg) {
      return typeof arg === 'object' && arg !== null;
    }
    exports.isObject = isObject;
    function isDate(d) {
      return objectToString(d) === '[object Date]';
    }
    exports.isDate = isDate;
    function isError(e) {
      return (objectToString(e) === '[object Error]' || e instanceof Error);
    }
    exports.isError = isError;
    function isFunction(arg) {
      return typeof arg === 'function';
    }
    exports.isFunction = isFunction;
    function isPrimitive(arg) {
      return arg === null || typeof arg === 'boolean' || typeof arg === 'number' || typeof arg === 'string' || typeof arg === 'symbol' || typeof arg === 'undefined';
    }
    exports.isPrimitive = isPrimitive;
    exports.isBuffer = Buffer.isBuffer;
    function objectToString(o) {
      return Object.prototype.toString.call(o);
    }
  })($__require('3c').Buffer);
  return module.exports;
});

$__System.registerDynamic("3e", ["41"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = $__require('41');
  return module.exports;
});

$__System.registerDynamic("42", [], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  if (typeof Object.create === 'function') {
    module.exports = function inherits(ctor, superCtor) {
      ctor.super_ = superCtor;
      ctor.prototype = Object.create(superCtor.prototype, {constructor: {
          value: ctor,
          enumerable: false,
          writable: true,
          configurable: true
        }});
    };
  } else {
    module.exports = function inherits(ctor, superCtor) {
      ctor.super_ = superCtor;
      var TempCtor = function() {};
      TempCtor.prototype = superCtor.prototype;
      ctor.prototype = new TempCtor();
      ctor.prototype.constructor = ctor;
    };
  }
  return module.exports;
});

$__System.registerDynamic("3f", ["42"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = $__require('42');
  return module.exports;
});

$__System.registerDynamic("35", ["34", "3e", "3f"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = PassThrough;
  var Transform = $__require('34');
  var util = $__require('3e');
  util.inherits = $__require('3f');
  util.inherits(PassThrough, Transform);
  function PassThrough(options) {
    if (!(this instanceof PassThrough))
      return new PassThrough(options);
    Transform.call(this, options);
  }
  PassThrough.prototype._transform = function(chunk, encoding, cb) {
    cb(null, chunk);
  };
  return module.exports;
});

$__System.registerDynamic("43", ["35"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = $__require('35');
  return module.exports;
});

$__System.registerDynamic("36", ["3d", "3f", "30", "37", "38", "39", "43"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = Stream;
  var EE = $__require('3d').EventEmitter;
  var inherits = $__require('3f');
  inherits(Stream, EE);
  Stream.Readable = $__require('30');
  Stream.Writable = $__require('37');
  Stream.Duplex = $__require('38');
  Stream.Transform = $__require('39');
  Stream.PassThrough = $__require('43');
  Stream.Stream = Stream;
  function Stream() {
    EE.call(this);
  }
  Stream.prototype.pipe = function(dest, options) {
    var source = this;
    function ondata(chunk) {
      if (dest.writable) {
        if (false === dest.write(chunk) && source.pause) {
          source.pause();
        }
      }
    }
    source.on('data', ondata);
    function ondrain() {
      if (source.readable && source.resume) {
        source.resume();
      }
    }
    dest.on('drain', ondrain);
    if (!dest._isStdio && (!options || options.end !== false)) {
      source.on('end', onend);
      source.on('close', onclose);
    }
    var didOnEnd = false;
    function onend() {
      if (didOnEnd)
        return;
      didOnEnd = true;
      dest.end();
    }
    function onclose() {
      if (didOnEnd)
        return;
      didOnEnd = true;
      if (typeof dest.destroy === 'function')
        dest.destroy();
    }
    function onerror(er) {
      cleanup();
      if (EE.listenerCount(this, 'error') === 0) {
        throw er;
      }
    }
    source.on('error', onerror);
    dest.on('error', onerror);
    function cleanup() {
      source.removeListener('data', ondata);
      dest.removeListener('drain', ondrain);
      source.removeListener('end', onend);
      source.removeListener('close', onclose);
      source.removeListener('error', onerror);
      dest.removeListener('error', onerror);
      source.removeListener('end', cleanup);
      source.removeListener('close', cleanup);
      dest.removeListener('close', cleanup);
    }
    source.on('end', cleanup);
    source.on('close', cleanup);
    dest.on('close', cleanup);
    dest.emit('pipe', source);
    return dest;
  };
  return module.exports;
});

$__System.registerDynamic("44", ["36"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = $__require('36');
  return module.exports;
});

$__System.registerDynamic("45", ["44"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = $__System._nodeRequire ? $__System._nodeRequire('stream') : $__require('44');
  return module.exports;
});

$__System.registerDynamic("46", ["45"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = $__require('45');
  return module.exports;
});

$__System.registerDynamic("47", ["3c"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  (function(Buffer) {
    var Buffer = $__require('3c').Buffer;
    var isBufferEncoding = Buffer.isEncoding || function(encoding) {
      switch (encoding && encoding.toLowerCase()) {
        case 'hex':
        case 'utf8':
        case 'utf-8':
        case 'ascii':
        case 'binary':
        case 'base64':
        case 'ucs2':
        case 'ucs-2':
        case 'utf16le':
        case 'utf-16le':
        case 'raw':
          return true;
        default:
          return false;
      }
    };
    function assertEncoding(encoding) {
      if (encoding && !isBufferEncoding(encoding)) {
        throw new Error('Unknown encoding: ' + encoding);
      }
    }
    var StringDecoder = exports.StringDecoder = function(encoding) {
      this.encoding = (encoding || 'utf8').toLowerCase().replace(/[-_]/, '');
      assertEncoding(encoding);
      switch (this.encoding) {
        case 'utf8':
          this.surrogateSize = 3;
          break;
        case 'ucs2':
        case 'utf16le':
          this.surrogateSize = 2;
          this.detectIncompleteChar = utf16DetectIncompleteChar;
          break;
        case 'base64':
          this.surrogateSize = 3;
          this.detectIncompleteChar = base64DetectIncompleteChar;
          break;
        default:
          this.write = passThroughWrite;
          return;
      }
      this.charBuffer = new Buffer(6);
      this.charReceived = 0;
      this.charLength = 0;
    };
    StringDecoder.prototype.write = function(buffer) {
      var charStr = '';
      while (this.charLength) {
        var available = (buffer.length >= this.charLength - this.charReceived) ? this.charLength - this.charReceived : buffer.length;
        buffer.copy(this.charBuffer, this.charReceived, 0, available);
        this.charReceived += available;
        if (this.charReceived < this.charLength) {
          return '';
        }
        buffer = buffer.slice(available, buffer.length);
        charStr = this.charBuffer.slice(0, this.charLength).toString(this.encoding);
        var charCode = charStr.charCodeAt(charStr.length - 1);
        if (charCode >= 0xD800 && charCode <= 0xDBFF) {
          this.charLength += this.surrogateSize;
          charStr = '';
          continue;
        }
        this.charReceived = this.charLength = 0;
        if (buffer.length === 0) {
          return charStr;
        }
        break;
      }
      this.detectIncompleteChar(buffer);
      var end = buffer.length;
      if (this.charLength) {
        buffer.copy(this.charBuffer, 0, buffer.length - this.charReceived, end);
        end -= this.charReceived;
      }
      charStr += buffer.toString(this.encoding, 0, end);
      var end = charStr.length - 1;
      var charCode = charStr.charCodeAt(end);
      if (charCode >= 0xD800 && charCode <= 0xDBFF) {
        var size = this.surrogateSize;
        this.charLength += size;
        this.charReceived += size;
        this.charBuffer.copy(this.charBuffer, size, 0, size);
        buffer.copy(this.charBuffer, 0, 0, size);
        return charStr.substring(0, end);
      }
      return charStr;
    };
    StringDecoder.prototype.detectIncompleteChar = function(buffer) {
      var i = (buffer.length >= 3) ? 3 : buffer.length;
      for (; i > 0; i--) {
        var c = buffer[buffer.length - i];
        if (i == 1 && c >> 5 == 0x06) {
          this.charLength = 2;
          break;
        }
        if (i <= 2 && c >> 4 == 0x0E) {
          this.charLength = 3;
          break;
        }
        if (i <= 3 && c >> 3 == 0x1E) {
          this.charLength = 4;
          break;
        }
      }
      this.charReceived = i;
    };
    StringDecoder.prototype.end = function(buffer) {
      var res = '';
      if (buffer && buffer.length)
        res = this.write(buffer);
      if (this.charReceived) {
        var cr = this.charReceived;
        var buf = this.charBuffer;
        var enc = this.encoding;
        res += buf.slice(0, cr).toString(enc);
      }
      return res;
    };
    function passThroughWrite(buffer) {
      return buffer.toString(this.encoding);
    }
    function utf16DetectIncompleteChar(buffer) {
      this.charReceived = buffer.length % 2;
      this.charLength = this.charReceived ? 2 : 0;
    }
    function base64DetectIncompleteChar(buffer) {
      this.charReceived = buffer.length % 3;
      this.charLength = this.charReceived ? 3 : 0;
    }
  })($__require('3c').Buffer);
  return module.exports;
});

$__System.registerDynamic("40", ["47"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = $__require('47');
  return module.exports;
});

$__System.registerDynamic("48", ["40"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = $__System._nodeRequire ? $__System._nodeRequire('string_decoder') : $__require('40');
  return module.exports;
});

$__System.registerDynamic("49", ["48"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = $__require('48');
  return module.exports;
});

$__System.registerDynamic("4a", ["46", "49", "3c", "20"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  (function(Buffer, process) {
    ;
    (function(sax) {
      sax.parser = function(strict, opt) {
        return new SAXParser(strict, opt);
      };
      sax.SAXParser = SAXParser;
      sax.SAXStream = SAXStream;
      sax.createStream = createStream;
      sax.MAX_BUFFER_LENGTH = 64 * 1024;
      var buffers = ['comment', 'sgmlDecl', 'textNode', 'tagName', 'doctype', 'procInstName', 'procInstBody', 'entity', 'attribName', 'attribValue', 'cdata', 'script'];
      sax.EVENTS = ['text', 'processinginstruction', 'sgmldeclaration', 'doctype', 'comment', 'attribute', 'opentag', 'closetag', 'opencdata', 'cdata', 'closecdata', 'error', 'end', 'ready', 'script', 'opennamespace', 'closenamespace'];
      function SAXParser(strict, opt) {
        if (!(this instanceof SAXParser)) {
          return new SAXParser(strict, opt);
        }
        var parser = this;
        clearBuffers(parser);
        parser.q = parser.c = '';
        parser.bufferCheckPosition = sax.MAX_BUFFER_LENGTH;
        parser.opt = opt || {};
        parser.opt.lowercase = parser.opt.lowercase || parser.opt.lowercasetags;
        parser.looseCase = parser.opt.lowercase ? 'toLowerCase' : 'toUpperCase';
        parser.tags = [];
        parser.closed = parser.closedRoot = parser.sawRoot = false;
        parser.tag = parser.error = null;
        parser.strict = !!strict;
        parser.noscript = !!(strict || parser.opt.noscript);
        parser.state = S.BEGIN;
        parser.strictEntities = parser.opt.strictEntities;
        parser.ENTITIES = parser.strictEntities ? Object.create(sax.XML_ENTITIES) : Object.create(sax.ENTITIES);
        parser.attribList = [];
        if (parser.opt.xmlns) {
          parser.ns = Object.create(rootNS);
        }
        parser.trackPosition = parser.opt.position !== false;
        if (parser.trackPosition) {
          parser.position = parser.line = parser.column = 0;
        }
        emit(parser, 'onready');
      }
      if (!Object.create) {
        Object.create = function(o) {
          function F() {}
          F.prototype = o;
          var newf = new F();
          return newf;
        };
      }
      if (!Object.keys) {
        Object.keys = function(o) {
          var a = [];
          for (var i in o)
            if (o.hasOwnProperty(i))
              a.push(i);
          return a;
        };
      }
      function checkBufferLength(parser) {
        var maxAllowed = Math.max(sax.MAX_BUFFER_LENGTH, 10);
        var maxActual = 0;
        for (var i = 0,
            l = buffers.length; i < l; i++) {
          var len = parser[buffers[i]].length;
          if (len > maxAllowed) {
            switch (buffers[i]) {
              case 'textNode':
                closeText(parser);
                break;
              case 'cdata':
                emitNode(parser, 'oncdata', parser.cdata);
                parser.cdata = '';
                break;
              case 'script':
                emitNode(parser, 'onscript', parser.script);
                parser.script = '';
                break;
              default:
                error(parser, 'Max buffer length exceeded: ' + buffers[i]);
            }
          }
          maxActual = Math.max(maxActual, len);
        }
        var m = sax.MAX_BUFFER_LENGTH - maxActual;
        parser.bufferCheckPosition = m + parser.position;
      }
      function clearBuffers(parser) {
        for (var i = 0,
            l = buffers.length; i < l; i++) {
          parser[buffers[i]] = '';
        }
      }
      function flushBuffers(parser) {
        closeText(parser);
        if (parser.cdata !== '') {
          emitNode(parser, 'oncdata', parser.cdata);
          parser.cdata = '';
        }
        if (parser.script !== '') {
          emitNode(parser, 'onscript', parser.script);
          parser.script = '';
        }
      }
      SAXParser.prototype = {
        end: function() {
          end(this);
        },
        write: write,
        resume: function() {
          this.error = null;
          return this;
        },
        close: function() {
          return this.write(null);
        },
        flush: function() {
          flushBuffers(this);
        }
      };
      var Stream;
      try {
        Stream = $__require('46').Stream;
      } catch (ex) {
        Stream = function() {};
      }
      var streamWraps = sax.EVENTS.filter(function(ev) {
        return ev !== 'error' && ev !== 'end';
      });
      function createStream(strict, opt) {
        return new SAXStream(strict, opt);
      }
      function SAXStream(strict, opt) {
        if (!(this instanceof SAXStream)) {
          return new SAXStream(strict, opt);
        }
        Stream.apply(this);
        this._parser = new SAXParser(strict, opt);
        this.writable = true;
        this.readable = true;
        var me = this;
        this._parser.onend = function() {
          me.emit('end');
        };
        this._parser.onerror = function(er) {
          me.emit('error', er);
          me._parser.error = null;
        };
        this._decoder = null;
        streamWraps.forEach(function(ev) {
          Object.defineProperty(me, 'on' + ev, {
            get: function() {
              return me._parser['on' + ev];
            },
            set: function(h) {
              if (!h) {
                me.removeAllListeners(ev);
                me._parser['on' + ev] = h;
                return h;
              }
              me.on(ev, h);
            },
            enumerable: true,
            configurable: false
          });
        });
      }
      SAXStream.prototype = Object.create(Stream.prototype, {constructor: {value: SAXStream}});
      SAXStream.prototype.write = function(data) {
        if (typeof Buffer === 'function' && typeof Buffer.isBuffer === 'function' && Buffer.isBuffer(data)) {
          if (!this._decoder) {
            var SD = $__require('49').StringDecoder;
            this._decoder = new SD('utf8');
          }
          data = this._decoder.write(data);
        }
        this._parser.write(data.toString());
        this.emit('data', data);
        return true;
      };
      SAXStream.prototype.end = function(chunk) {
        if (chunk && chunk.length) {
          this.write(chunk);
        }
        this._parser.end();
        return true;
      };
      SAXStream.prototype.on = function(ev, handler) {
        var me = this;
        if (!me._parser['on' + ev] && streamWraps.indexOf(ev) !== -1) {
          me._parser['on' + ev] = function() {
            var args = arguments.length === 1 ? [arguments[0]] : Array.apply(null, arguments);
            args.splice(0, 0, ev);
            me.emit.apply(me, args);
          };
        }
        return Stream.prototype.on.call(me, ev, handler);
      };
      var whitespace = '\r\n\t ';
      var number = '0124356789';
      var letter = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
      var quote = '\'"';
      var attribEnd = whitespace + '>';
      var CDATA = '[CDATA[';
      var DOCTYPE = 'DOCTYPE';
      var XML_NAMESPACE = 'http://www.w3.org/XML/1998/namespace';
      var XMLNS_NAMESPACE = 'http://www.w3.org/2000/xmlns/';
      var rootNS = {
        xml: XML_NAMESPACE,
        xmlns: XMLNS_NAMESPACE
      };
      whitespace = charClass(whitespace);
      number = charClass(number);
      letter = charClass(letter);
      var nameStart = /[:_A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]/;
      var nameBody = /[:_A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\u00B7\u0300-\u036F\u203F-\u2040\.\d-]/;
      var entityStart = /[#:_A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]/;
      var entityBody = /[#:_A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\u00B7\u0300-\u036F\u203F-\u2040\.\d-]/;
      quote = charClass(quote);
      attribEnd = charClass(attribEnd);
      function charClass(str) {
        return str.split('').reduce(function(s, c) {
          s[c] = true;
          return s;
        }, {});
      }
      function isRegExp(c) {
        return Object.prototype.toString.call(c) === '[object RegExp]';
      }
      function is(charclass, c) {
        return isRegExp(charclass) ? !!c.match(charclass) : charclass[c];
      }
      function not(charclass, c) {
        return !is(charclass, c);
      }
      var S = 0;
      sax.STATE = {
        BEGIN: S++,
        BEGIN_WHITESPACE: S++,
        TEXT: S++,
        TEXT_ENTITY: S++,
        OPEN_WAKA: S++,
        SGML_DECL: S++,
        SGML_DECL_QUOTED: S++,
        DOCTYPE: S++,
        DOCTYPE_QUOTED: S++,
        DOCTYPE_DTD: S++,
        DOCTYPE_DTD_QUOTED: S++,
        COMMENT_STARTING: S++,
        COMMENT: S++,
        COMMENT_ENDING: S++,
        COMMENT_ENDED: S++,
        CDATA: S++,
        CDATA_ENDING: S++,
        CDATA_ENDING_2: S++,
        PROC_INST: S++,
        PROC_INST_BODY: S++,
        PROC_INST_ENDING: S++,
        OPEN_TAG: S++,
        OPEN_TAG_SLASH: S++,
        ATTRIB: S++,
        ATTRIB_NAME: S++,
        ATTRIB_NAME_SAW_WHITE: S++,
        ATTRIB_VALUE: S++,
        ATTRIB_VALUE_QUOTED: S++,
        ATTRIB_VALUE_CLOSED: S++,
        ATTRIB_VALUE_UNQUOTED: S++,
        ATTRIB_VALUE_ENTITY_Q: S++,
        ATTRIB_VALUE_ENTITY_U: S++,
        CLOSE_TAG: S++,
        CLOSE_TAG_SAW_WHITE: S++,
        SCRIPT: S++,
        SCRIPT_ENDING: S++
      };
      sax.XML_ENTITIES = {
        'amp': '&',
        'gt': '>',
        'lt': '<',
        'quot': '"',
        'apos': "'"
      };
      sax.ENTITIES = {
        'amp': '&',
        'gt': '>',
        'lt': '<',
        'quot': '"',
        'apos': "'",
        'AElig': 198,
        'Aacute': 193,
        'Acirc': 194,
        'Agrave': 192,
        'Aring': 197,
        'Atilde': 195,
        'Auml': 196,
        'Ccedil': 199,
        'ETH': 208,
        'Eacute': 201,
        'Ecirc': 202,
        'Egrave': 200,
        'Euml': 203,
        'Iacute': 205,
        'Icirc': 206,
        'Igrave': 204,
        'Iuml': 207,
        'Ntilde': 209,
        'Oacute': 211,
        'Ocirc': 212,
        'Ograve': 210,
        'Oslash': 216,
        'Otilde': 213,
        'Ouml': 214,
        'THORN': 222,
        'Uacute': 218,
        'Ucirc': 219,
        'Ugrave': 217,
        'Uuml': 220,
        'Yacute': 221,
        'aacute': 225,
        'acirc': 226,
        'aelig': 230,
        'agrave': 224,
        'aring': 229,
        'atilde': 227,
        'auml': 228,
        'ccedil': 231,
        'eacute': 233,
        'ecirc': 234,
        'egrave': 232,
        'eth': 240,
        'euml': 235,
        'iacute': 237,
        'icirc': 238,
        'igrave': 236,
        'iuml': 239,
        'ntilde': 241,
        'oacute': 243,
        'ocirc': 244,
        'ograve': 242,
        'oslash': 248,
        'otilde': 245,
        'ouml': 246,
        'szlig': 223,
        'thorn': 254,
        'uacute': 250,
        'ucirc': 251,
        'ugrave': 249,
        'uuml': 252,
        'yacute': 253,
        'yuml': 255,
        'copy': 169,
        'reg': 174,
        'nbsp': 160,
        'iexcl': 161,
        'cent': 162,
        'pound': 163,
        'curren': 164,
        'yen': 165,
        'brvbar': 166,
        'sect': 167,
        'uml': 168,
        'ordf': 170,
        'laquo': 171,
        'not': 172,
        'shy': 173,
        'macr': 175,
        'deg': 176,
        'plusmn': 177,
        'sup1': 185,
        'sup2': 178,
        'sup3': 179,
        'acute': 180,
        'micro': 181,
        'para': 182,
        'middot': 183,
        'cedil': 184,
        'ordm': 186,
        'raquo': 187,
        'frac14': 188,
        'frac12': 189,
        'frac34': 190,
        'iquest': 191,
        'times': 215,
        'divide': 247,
        'OElig': 338,
        'oelig': 339,
        'Scaron': 352,
        'scaron': 353,
        'Yuml': 376,
        'fnof': 402,
        'circ': 710,
        'tilde': 732,
        'Alpha': 913,
        'Beta': 914,
        'Gamma': 915,
        'Delta': 916,
        'Epsilon': 917,
        'Zeta': 918,
        'Eta': 919,
        'Theta': 920,
        'Iota': 921,
        'Kappa': 922,
        'Lambda': 923,
        'Mu': 924,
        'Nu': 925,
        'Xi': 926,
        'Omicron': 927,
        'Pi': 928,
        'Rho': 929,
        'Sigma': 931,
        'Tau': 932,
        'Upsilon': 933,
        'Phi': 934,
        'Chi': 935,
        'Psi': 936,
        'Omega': 937,
        'alpha': 945,
        'beta': 946,
        'gamma': 947,
        'delta': 948,
        'epsilon': 949,
        'zeta': 950,
        'eta': 951,
        'theta': 952,
        'iota': 953,
        'kappa': 954,
        'lambda': 955,
        'mu': 956,
        'nu': 957,
        'xi': 958,
        'omicron': 959,
        'pi': 960,
        'rho': 961,
        'sigmaf': 962,
        'sigma': 963,
        'tau': 964,
        'upsilon': 965,
        'phi': 966,
        'chi': 967,
        'psi': 968,
        'omega': 969,
        'thetasym': 977,
        'upsih': 978,
        'piv': 982,
        'ensp': 8194,
        'emsp': 8195,
        'thinsp': 8201,
        'zwnj': 8204,
        'zwj': 8205,
        'lrm': 8206,
        'rlm': 8207,
        'ndash': 8211,
        'mdash': 8212,
        'lsquo': 8216,
        'rsquo': 8217,
        'sbquo': 8218,
        'ldquo': 8220,
        'rdquo': 8221,
        'bdquo': 8222,
        'dagger': 8224,
        'Dagger': 8225,
        'bull': 8226,
        'hellip': 8230,
        'permil': 8240,
        'prime': 8242,
        'Prime': 8243,
        'lsaquo': 8249,
        'rsaquo': 8250,
        'oline': 8254,
        'frasl': 8260,
        'euro': 8364,
        'image': 8465,
        'weierp': 8472,
        'real': 8476,
        'trade': 8482,
        'alefsym': 8501,
        'larr': 8592,
        'uarr': 8593,
        'rarr': 8594,
        'darr': 8595,
        'harr': 8596,
        'crarr': 8629,
        'lArr': 8656,
        'uArr': 8657,
        'rArr': 8658,
        'dArr': 8659,
        'hArr': 8660,
        'forall': 8704,
        'part': 8706,
        'exist': 8707,
        'empty': 8709,
        'nabla': 8711,
        'isin': 8712,
        'notin': 8713,
        'ni': 8715,
        'prod': 8719,
        'sum': 8721,
        'minus': 8722,
        'lowast': 8727,
        'radic': 8730,
        'prop': 8733,
        'infin': 8734,
        'ang': 8736,
        'and': 8743,
        'or': 8744,
        'cap': 8745,
        'cup': 8746,
        'int': 8747,
        'there4': 8756,
        'sim': 8764,
        'cong': 8773,
        'asymp': 8776,
        'ne': 8800,
        'equiv': 8801,
        'le': 8804,
        'ge': 8805,
        'sub': 8834,
        'sup': 8835,
        'nsub': 8836,
        'sube': 8838,
        'supe': 8839,
        'oplus': 8853,
        'otimes': 8855,
        'perp': 8869,
        'sdot': 8901,
        'lceil': 8968,
        'rceil': 8969,
        'lfloor': 8970,
        'rfloor': 8971,
        'lang': 9001,
        'rang': 9002,
        'loz': 9674,
        'spades': 9824,
        'clubs': 9827,
        'hearts': 9829,
        'diams': 9830
      };
      Object.keys(sax.ENTITIES).forEach(function(key) {
        var e = sax.ENTITIES[key];
        var s = typeof e === 'number' ? String.fromCharCode(e) : e;
        sax.ENTITIES[key] = s;
      });
      for (var s in sax.STATE) {
        sax.STATE[sax.STATE[s]] = s;
      }
      S = sax.STATE;
      function emit(parser, event, data) {
        parser[event] && parser[event](data);
      }
      function emitNode(parser, nodeType, data) {
        if (parser.textNode)
          closeText(parser);
        emit(parser, nodeType, data);
      }
      function closeText(parser) {
        parser.textNode = textopts(parser.opt, parser.textNode);
        if (parser.textNode)
          emit(parser, 'ontext', parser.textNode);
        parser.textNode = '';
      }
      function textopts(opt, text) {
        if (opt.trim)
          text = text.trim();
        if (opt.normalize)
          text = text.replace(/\s+/g, ' ');
        return text;
      }
      function error(parser, er) {
        closeText(parser);
        if (parser.trackPosition) {
          er += '\nLine: ' + parser.line + '\nColumn: ' + parser.column + '\nChar: ' + parser.c;
        }
        er = new Error(er);
        parser.error = er;
        emit(parser, 'onerror', er);
        return parser;
      }
      function end(parser) {
        if (parser.sawRoot && !parser.closedRoot)
          strictFail(parser, 'Unclosed root tag');
        if ((parser.state !== S.BEGIN) && (parser.state !== S.BEGIN_WHITESPACE) && (parser.state !== S.TEXT)) {
          error(parser, 'Unexpected end');
        }
        closeText(parser);
        parser.c = '';
        parser.closed = true;
        emit(parser, 'onend');
        SAXParser.call(parser, parser.strict, parser.opt);
        return parser;
      }
      function strictFail(parser, message) {
        if (typeof parser !== 'object' || !(parser instanceof SAXParser)) {
          throw new Error('bad call to strictFail');
        }
        if (parser.strict) {
          error(parser, message);
        }
      }
      function newTag(parser) {
        if (!parser.strict)
          parser.tagName = parser.tagName[parser.looseCase]();
        var parent = parser.tags[parser.tags.length - 1] || parser;
        var tag = parser.tag = {
          name: parser.tagName,
          attributes: {}
        };
        if (parser.opt.xmlns) {
          tag.ns = parent.ns;
        }
        parser.attribList.length = 0;
      }
      function qname(name, attribute) {
        var i = name.indexOf(':');
        var qualName = i < 0 ? ['', name] : name.split(':');
        var prefix = qualName[0];
        var local = qualName[1];
        if (attribute && name === 'xmlns') {
          prefix = 'xmlns';
          local = '';
        }
        return {
          prefix: prefix,
          local: local
        };
      }
      function attrib(parser) {
        if (!parser.strict) {
          parser.attribName = parser.attribName[parser.looseCase]();
        }
        if (parser.attribList.indexOf(parser.attribName) !== -1 || parser.tag.attributes.hasOwnProperty(parser.attribName)) {
          parser.attribName = parser.attribValue = '';
          return;
        }
        if (parser.opt.xmlns) {
          var qn = qname(parser.attribName, true);
          var prefix = qn.prefix;
          var local = qn.local;
          if (prefix === 'xmlns') {
            if (local === 'xml' && parser.attribValue !== XML_NAMESPACE) {
              strictFail(parser, 'xml: prefix must be bound to ' + XML_NAMESPACE + '\n' + 'Actual: ' + parser.attribValue);
            } else if (local === 'xmlns' && parser.attribValue !== XMLNS_NAMESPACE) {
              strictFail(parser, 'xmlns: prefix must be bound to ' + XMLNS_NAMESPACE + '\n' + 'Actual: ' + parser.attribValue);
            } else {
              var tag = parser.tag;
              var parent = parser.tags[parser.tags.length - 1] || parser;
              if (tag.ns === parent.ns) {
                tag.ns = Object.create(parent.ns);
              }
              tag.ns[local] = parser.attribValue;
            }
          }
          parser.attribList.push([parser.attribName, parser.attribValue]);
        } else {
          parser.tag.attributes[parser.attribName] = parser.attribValue;
          emitNode(parser, 'onattribute', {
            name: parser.attribName,
            value: parser.attribValue
          });
        }
        parser.attribName = parser.attribValue = '';
      }
      function openTag(parser, selfClosing) {
        if (parser.opt.xmlns) {
          var tag = parser.tag;
          var qn = qname(parser.tagName);
          tag.prefix = qn.prefix;
          tag.local = qn.local;
          tag.uri = tag.ns[qn.prefix] || '';
          if (tag.prefix && !tag.uri) {
            strictFail(parser, 'Unbound namespace prefix: ' + JSON.stringify(parser.tagName));
            tag.uri = qn.prefix;
          }
          var parent = parser.tags[parser.tags.length - 1] || parser;
          if (tag.ns && parent.ns !== tag.ns) {
            Object.keys(tag.ns).forEach(function(p) {
              emitNode(parser, 'onopennamespace', {
                prefix: p,
                uri: tag.ns[p]
              });
            });
          }
          for (var i = 0,
              l = parser.attribList.length; i < l; i++) {
            var nv = parser.attribList[i];
            var name = nv[0];
            var value = nv[1];
            var qualName = qname(name, true);
            var prefix = qualName.prefix;
            var local = qualName.local;
            var uri = prefix === '' ? '' : (tag.ns[prefix] || '');
            var a = {
              name: name,
              value: value,
              prefix: prefix,
              local: local,
              uri: uri
            };
            if (prefix && prefix !== 'xmlns' && !uri) {
              strictFail(parser, 'Unbound namespace prefix: ' + JSON.stringify(prefix));
              a.uri = prefix;
            }
            parser.tag.attributes[name] = a;
            emitNode(parser, 'onattribute', a);
          }
          parser.attribList.length = 0;
        }
        parser.tag.isSelfClosing = !!selfClosing;
        parser.sawRoot = true;
        parser.tags.push(parser.tag);
        emitNode(parser, 'onopentag', parser.tag);
        if (!selfClosing) {
          if (!parser.noscript && parser.tagName.toLowerCase() === 'script') {
            parser.state = S.SCRIPT;
          } else {
            parser.state = S.TEXT;
          }
          parser.tag = null;
          parser.tagName = '';
        }
        parser.attribName = parser.attribValue = '';
        parser.attribList.length = 0;
      }
      function closeTag(parser) {
        if (!parser.tagName) {
          strictFail(parser, 'Weird empty close tag.');
          parser.textNode += '</>';
          parser.state = S.TEXT;
          return;
        }
        if (parser.script) {
          if (parser.tagName !== 'script') {
            parser.script += '</' + parser.tagName + '>';
            parser.tagName = '';
            parser.state = S.SCRIPT;
            return;
          }
          emitNode(parser, 'onscript', parser.script);
          parser.script = '';
        }
        var t = parser.tags.length;
        var tagName = parser.tagName;
        if (!parser.strict) {
          tagName = tagName[parser.looseCase]();
        }
        var closeTo = tagName;
        while (t--) {
          var close = parser.tags[t];
          if (close.name !== closeTo) {
            strictFail(parser, 'Unexpected close tag');
          } else {
            break;
          }
        }
        if (t < 0) {
          strictFail(parser, 'Unmatched closing tag: ' + parser.tagName);
          parser.textNode += '</' + parser.tagName + '>';
          parser.state = S.TEXT;
          return;
        }
        parser.tagName = tagName;
        var s = parser.tags.length;
        while (s-- > t) {
          var tag = parser.tag = parser.tags.pop();
          parser.tagName = parser.tag.name;
          emitNode(parser, 'onclosetag', parser.tagName);
          var x = {};
          for (var i in tag.ns) {
            x[i] = tag.ns[i];
          }
          var parent = parser.tags[parser.tags.length - 1] || parser;
          if (parser.opt.xmlns && tag.ns !== parent.ns) {
            Object.keys(tag.ns).forEach(function(p) {
              var n = tag.ns[p];
              emitNode(parser, 'onclosenamespace', {
                prefix: p,
                uri: n
              });
            });
          }
        }
        if (t === 0)
          parser.closedRoot = true;
        parser.tagName = parser.attribValue = parser.attribName = '';
        parser.attribList.length = 0;
        parser.state = S.TEXT;
      }
      function parseEntity(parser) {
        var entity = parser.entity;
        var entityLC = entity.toLowerCase();
        var num;
        var numStr = '';
        if (parser.ENTITIES[entity]) {
          return parser.ENTITIES[entity];
        }
        if (parser.ENTITIES[entityLC]) {
          return parser.ENTITIES[entityLC];
        }
        entity = entityLC;
        if (entity.charAt(0) === '#') {
          if (entity.charAt(1) === 'x') {
            entity = entity.slice(2);
            num = parseInt(entity, 16);
            numStr = num.toString(16);
          } else {
            entity = entity.slice(1);
            num = parseInt(entity, 10);
            numStr = num.toString(10);
          }
        }
        entity = entity.replace(/^0+/, '');
        if (numStr.toLowerCase() !== entity) {
          strictFail(parser, 'Invalid character entity');
          return '&' + parser.entity + ';';
        }
        return String.fromCodePoint(num);
      }
      function beginWhiteSpace(parser, c) {
        if (c === '<') {
          parser.state = S.OPEN_WAKA;
          parser.startTagPosition = parser.position;
        } else if (not(whitespace, c)) {
          strictFail(parser, 'Non-whitespace before first tag.');
          parser.textNode = c;
          parser.state = S.TEXT;
        }
      }
      function charAt(chunk, i) {
        var result = '';
        if (i < chunk.length) {
          result = chunk.charAt(i);
        }
        return result;
      }
      function write(chunk) {
        var parser = this;
        if (this.error) {
          throw this.error;
        }
        if (parser.closed) {
          return error(parser, 'Cannot write after close. Assign an onready handler.');
        }
        if (chunk === null) {
          return end(parser);
        }
        if (typeof chunk === 'object') {
          chunk = chunk.toString();
        }
        var i = 0;
        var c = '';
        while (true) {
          c = charAt(chunk, i++);
          parser.c = c;
          if (!c) {
            break;
          }
          if (parser.trackPosition) {
            parser.position++;
            if (c === '\n') {
              parser.line++;
              parser.column = 0;
            } else {
              parser.column++;
            }
          }
          switch (parser.state) {
            case S.BEGIN:
              parser.state = S.BEGIN_WHITESPACE;
              if (c === '\uFEFF') {
                continue;
              }
              beginWhiteSpace(parser, c);
              continue;
            case S.BEGIN_WHITESPACE:
              beginWhiteSpace(parser, c);
              continue;
            case S.TEXT:
              if (parser.sawRoot && !parser.closedRoot) {
                var starti = i - 1;
                while (c && c !== '<' && c !== '&') {
                  c = charAt(chunk, i++);
                  if (c && parser.trackPosition) {
                    parser.position++;
                    if (c === '\n') {
                      parser.line++;
                      parser.column = 0;
                    } else {
                      parser.column++;
                    }
                  }
                }
                parser.textNode += chunk.substring(starti, i - 1);
              }
              if (c === '<' && !(parser.sawRoot && parser.closedRoot && !parser.strict)) {
                parser.state = S.OPEN_WAKA;
                parser.startTagPosition = parser.position;
              } else {
                if (not(whitespace, c) && (!parser.sawRoot || parser.closedRoot)) {
                  strictFail(parser, 'Text data outside of root node.');
                }
                if (c === '&') {
                  parser.state = S.TEXT_ENTITY;
                } else {
                  parser.textNode += c;
                }
              }
              continue;
            case S.SCRIPT:
              if (c === '<') {
                parser.state = S.SCRIPT_ENDING;
              } else {
                parser.script += c;
              }
              continue;
            case S.SCRIPT_ENDING:
              if (c === '/') {
                parser.state = S.CLOSE_TAG;
              } else {
                parser.script += '<' + c;
                parser.state = S.SCRIPT;
              }
              continue;
            case S.OPEN_WAKA:
              if (c === '!') {
                parser.state = S.SGML_DECL;
                parser.sgmlDecl = '';
              } else if (is(whitespace, c)) {} else if (is(nameStart, c)) {
                parser.state = S.OPEN_TAG;
                parser.tagName = c;
              } else if (c === '/') {
                parser.state = S.CLOSE_TAG;
                parser.tagName = '';
              } else if (c === '?') {
                parser.state = S.PROC_INST;
                parser.procInstName = parser.procInstBody = '';
              } else {
                strictFail(parser, 'Unencoded <');
                if (parser.startTagPosition + 1 < parser.position) {
                  var pad = parser.position - parser.startTagPosition;
                  c = new Array(pad).join(' ') + c;
                }
                parser.textNode += '<' + c;
                parser.state = S.TEXT;
              }
              continue;
            case S.SGML_DECL:
              if ((parser.sgmlDecl + c).toUpperCase() === CDATA) {
                emitNode(parser, 'onopencdata');
                parser.state = S.CDATA;
                parser.sgmlDecl = '';
                parser.cdata = '';
              } else if (parser.sgmlDecl + c === '--') {
                parser.state = S.COMMENT;
                parser.comment = '';
                parser.sgmlDecl = '';
              } else if ((parser.sgmlDecl + c).toUpperCase() === DOCTYPE) {
                parser.state = S.DOCTYPE;
                if (parser.doctype || parser.sawRoot) {
                  strictFail(parser, 'Inappropriately located doctype declaration');
                }
                parser.doctype = '';
                parser.sgmlDecl = '';
              } else if (c === '>') {
                emitNode(parser, 'onsgmldeclaration', parser.sgmlDecl);
                parser.sgmlDecl = '';
                parser.state = S.TEXT;
              } else if (is(quote, c)) {
                parser.state = S.SGML_DECL_QUOTED;
                parser.sgmlDecl += c;
              } else {
                parser.sgmlDecl += c;
              }
              continue;
            case S.SGML_DECL_QUOTED:
              if (c === parser.q) {
                parser.state = S.SGML_DECL;
                parser.q = '';
              }
              parser.sgmlDecl += c;
              continue;
            case S.DOCTYPE:
              if (c === '>') {
                parser.state = S.TEXT;
                emitNode(parser, 'ondoctype', parser.doctype);
                parser.doctype = true;
              } else {
                parser.doctype += c;
                if (c === '[') {
                  parser.state = S.DOCTYPE_DTD;
                } else if (is(quote, c)) {
                  parser.state = S.DOCTYPE_QUOTED;
                  parser.q = c;
                }
              }
              continue;
            case S.DOCTYPE_QUOTED:
              parser.doctype += c;
              if (c === parser.q) {
                parser.q = '';
                parser.state = S.DOCTYPE;
              }
              continue;
            case S.DOCTYPE_DTD:
              parser.doctype += c;
              if (c === ']') {
                parser.state = S.DOCTYPE;
              } else if (is(quote, c)) {
                parser.state = S.DOCTYPE_DTD_QUOTED;
                parser.q = c;
              }
              continue;
            case S.DOCTYPE_DTD_QUOTED:
              parser.doctype += c;
              if (c === parser.q) {
                parser.state = S.DOCTYPE_DTD;
                parser.q = '';
              }
              continue;
            case S.COMMENT:
              if (c === '-') {
                parser.state = S.COMMENT_ENDING;
              } else {
                parser.comment += c;
              }
              continue;
            case S.COMMENT_ENDING:
              if (c === '-') {
                parser.state = S.COMMENT_ENDED;
                parser.comment = textopts(parser.opt, parser.comment);
                if (parser.comment) {
                  emitNode(parser, 'oncomment', parser.comment);
                }
                parser.comment = '';
              } else {
                parser.comment += '-' + c;
                parser.state = S.COMMENT;
              }
              continue;
            case S.COMMENT_ENDED:
              if (c !== '>') {
                strictFail(parser, 'Malformed comment');
                parser.comment += '--' + c;
                parser.state = S.COMMENT;
              } else {
                parser.state = S.TEXT;
              }
              continue;
            case S.CDATA:
              if (c === ']') {
                parser.state = S.CDATA_ENDING;
              } else {
                parser.cdata += c;
              }
              continue;
            case S.CDATA_ENDING:
              if (c === ']') {
                parser.state = S.CDATA_ENDING_2;
              } else {
                parser.cdata += ']' + c;
                parser.state = S.CDATA;
              }
              continue;
            case S.CDATA_ENDING_2:
              if (c === '>') {
                if (parser.cdata) {
                  emitNode(parser, 'oncdata', parser.cdata);
                }
                emitNode(parser, 'onclosecdata');
                parser.cdata = '';
                parser.state = S.TEXT;
              } else if (c === ']') {
                parser.cdata += ']';
              } else {
                parser.cdata += ']]' + c;
                parser.state = S.CDATA;
              }
              continue;
            case S.PROC_INST:
              if (c === '?') {
                parser.state = S.PROC_INST_ENDING;
              } else if (is(whitespace, c)) {
                parser.state = S.PROC_INST_BODY;
              } else {
                parser.procInstName += c;
              }
              continue;
            case S.PROC_INST_BODY:
              if (!parser.procInstBody && is(whitespace, c)) {
                continue;
              } else if (c === '?') {
                parser.state = S.PROC_INST_ENDING;
              } else {
                parser.procInstBody += c;
              }
              continue;
            case S.PROC_INST_ENDING:
              if (c === '>') {
                emitNode(parser, 'onprocessinginstruction', {
                  name: parser.procInstName,
                  body: parser.procInstBody
                });
                parser.procInstName = parser.procInstBody = '';
                parser.state = S.TEXT;
              } else {
                parser.procInstBody += '?' + c;
                parser.state = S.PROC_INST_BODY;
              }
              continue;
            case S.OPEN_TAG:
              if (is(nameBody, c)) {
                parser.tagName += c;
              } else {
                newTag(parser);
                if (c === '>') {
                  openTag(parser);
                } else if (c === '/') {
                  parser.state = S.OPEN_TAG_SLASH;
                } else {
                  if (not(whitespace, c)) {
                    strictFail(parser, 'Invalid character in tag name');
                  }
                  parser.state = S.ATTRIB;
                }
              }
              continue;
            case S.OPEN_TAG_SLASH:
              if (c === '>') {
                openTag(parser, true);
                closeTag(parser);
              } else {
                strictFail(parser, 'Forward-slash in opening tag not followed by >');
                parser.state = S.ATTRIB;
              }
              continue;
            case S.ATTRIB:
              if (is(whitespace, c)) {
                continue;
              } else if (c === '>') {
                openTag(parser);
              } else if (c === '/') {
                parser.state = S.OPEN_TAG_SLASH;
              } else if (is(nameStart, c)) {
                parser.attribName = c;
                parser.attribValue = '';
                parser.state = S.ATTRIB_NAME;
              } else {
                strictFail(parser, 'Invalid attribute name');
              }
              continue;
            case S.ATTRIB_NAME:
              if (c === '=') {
                parser.state = S.ATTRIB_VALUE;
              } else if (c === '>') {
                strictFail(parser, 'Attribute without value');
                parser.attribValue = parser.attribName;
                attrib(parser);
                openTag(parser);
              } else if (is(whitespace, c)) {
                parser.state = S.ATTRIB_NAME_SAW_WHITE;
              } else if (is(nameBody, c)) {
                parser.attribName += c;
              } else {
                strictFail(parser, 'Invalid attribute name');
              }
              continue;
            case S.ATTRIB_NAME_SAW_WHITE:
              if (c === '=') {
                parser.state = S.ATTRIB_VALUE;
              } else if (is(whitespace, c)) {
                continue;
              } else {
                strictFail(parser, 'Attribute without value');
                parser.tag.attributes[parser.attribName] = '';
                parser.attribValue = '';
                emitNode(parser, 'onattribute', {
                  name: parser.attribName,
                  value: ''
                });
                parser.attribName = '';
                if (c === '>') {
                  openTag(parser);
                } else if (is(nameStart, c)) {
                  parser.attribName = c;
                  parser.state = S.ATTRIB_NAME;
                } else {
                  strictFail(parser, 'Invalid attribute name');
                  parser.state = S.ATTRIB;
                }
              }
              continue;
            case S.ATTRIB_VALUE:
              if (is(whitespace, c)) {
                continue;
              } else if (is(quote, c)) {
                parser.q = c;
                parser.state = S.ATTRIB_VALUE_QUOTED;
              } else {
                strictFail(parser, 'Unquoted attribute value');
                parser.state = S.ATTRIB_VALUE_UNQUOTED;
                parser.attribValue = c;
              }
              continue;
            case S.ATTRIB_VALUE_QUOTED:
              if (c !== parser.q) {
                if (c === '&') {
                  parser.state = S.ATTRIB_VALUE_ENTITY_Q;
                } else {
                  parser.attribValue += c;
                }
                continue;
              }
              attrib(parser);
              parser.q = '';
              parser.state = S.ATTRIB_VALUE_CLOSED;
              continue;
            case S.ATTRIB_VALUE_CLOSED:
              if (is(whitespace, c)) {
                parser.state = S.ATTRIB;
              } else if (c === '>') {
                openTag(parser);
              } else if (c === '/') {
                parser.state = S.OPEN_TAG_SLASH;
              } else if (is(nameStart, c)) {
                strictFail(parser, 'No whitespace between attributes');
                parser.attribName = c;
                parser.attribValue = '';
                parser.state = S.ATTRIB_NAME;
              } else {
                strictFail(parser, 'Invalid attribute name');
              }
              continue;
            case S.ATTRIB_VALUE_UNQUOTED:
              if (not(attribEnd, c)) {
                if (c === '&') {
                  parser.state = S.ATTRIB_VALUE_ENTITY_U;
                } else {
                  parser.attribValue += c;
                }
                continue;
              }
              attrib(parser);
              if (c === '>') {
                openTag(parser);
              } else {
                parser.state = S.ATTRIB;
              }
              continue;
            case S.CLOSE_TAG:
              if (!parser.tagName) {
                if (is(whitespace, c)) {
                  continue;
                } else if (not(nameStart, c)) {
                  if (parser.script) {
                    parser.script += '</' + c;
                    parser.state = S.SCRIPT;
                  } else {
                    strictFail(parser, 'Invalid tagname in closing tag.');
                  }
                } else {
                  parser.tagName = c;
                }
              } else if (c === '>') {
                closeTag(parser);
              } else if (is(nameBody, c)) {
                parser.tagName += c;
              } else if (parser.script) {
                parser.script += '</' + parser.tagName;
                parser.tagName = '';
                parser.state = S.SCRIPT;
              } else {
                if (not(whitespace, c)) {
                  strictFail(parser, 'Invalid tagname in closing tag');
                }
                parser.state = S.CLOSE_TAG_SAW_WHITE;
              }
              continue;
            case S.CLOSE_TAG_SAW_WHITE:
              if (is(whitespace, c)) {
                continue;
              }
              if (c === '>') {
                closeTag(parser);
              } else {
                strictFail(parser, 'Invalid characters in closing tag');
              }
              continue;
            case S.TEXT_ENTITY:
            case S.ATTRIB_VALUE_ENTITY_Q:
            case S.ATTRIB_VALUE_ENTITY_U:
              var returnState;
              var buffer;
              switch (parser.state) {
                case S.TEXT_ENTITY:
                  returnState = S.TEXT;
                  buffer = 'textNode';
                  break;
                case S.ATTRIB_VALUE_ENTITY_Q:
                  returnState = S.ATTRIB_VALUE_QUOTED;
                  buffer = 'attribValue';
                  break;
                case S.ATTRIB_VALUE_ENTITY_U:
                  returnState = S.ATTRIB_VALUE_UNQUOTED;
                  buffer = 'attribValue';
                  break;
              }
              if (c === ';') {
                parser[buffer] += parseEntity(parser);
                parser.entity = '';
                parser.state = returnState;
              } else if (is(parser.entity.length ? entityBody : entityStart, c)) {
                parser.entity += c;
              } else {
                strictFail(parser, 'Invalid character in entity name');
                parser[buffer] += '&' + parser.entity + c;
                parser.entity = '';
                parser.state = returnState;
              }
              continue;
            default:
              throw new Error(parser, 'Unknown state: ' + parser.state);
          }
        }
        if (parser.position >= parser.bufferCheckPosition) {
          checkBufferLength(parser);
        }
        return parser;
      }
      if (!String.fromCodePoint) {
        (function() {
          var stringFromCharCode = String.fromCharCode;
          var floor = Math.floor;
          var fromCodePoint = function() {
            var MAX_SIZE = 0x4000;
            var codeUnits = [];
            var highSurrogate;
            var lowSurrogate;
            var index = -1;
            var length = arguments.length;
            if (!length) {
              return '';
            }
            var result = '';
            while (++index < length) {
              var codePoint = Number(arguments[index]);
              if (!isFinite(codePoint) || codePoint < 0 || codePoint > 0x10FFFF || floor(codePoint) !== codePoint) {
                throw RangeError('Invalid code point: ' + codePoint);
              }
              if (codePoint <= 0xFFFF) {
                codeUnits.push(codePoint);
              } else {
                codePoint -= 0x10000;
                highSurrogate = (codePoint >> 10) + 0xD800;
                lowSurrogate = (codePoint % 0x400) + 0xDC00;
                codeUnits.push(highSurrogate, lowSurrogate);
              }
              if (index + 1 === length || codeUnits.length > MAX_SIZE) {
                result += stringFromCharCode.apply(null, codeUnits);
                codeUnits.length = 0;
              }
            }
            return result;
          };
          if (Object.defineProperty) {
            Object.defineProperty(String, 'fromCodePoint', {
              value: fromCodePoint,
              configurable: true,
              writable: true
            });
          } else {
            String.fromCodePoint = fromCodePoint;
          }
        }());
      }
    })(typeof exports === 'undefined' ? this.sax = {} : exports);
  })($__require('3c').Buffer, $__require('20'));
  return module.exports;
});

$__System.registerDynamic("4b", ["4a"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = $__require('4a');
  return module.exports;
});

$__System.registerDynamic("4c", [], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  function EventEmitter() {
    this._events = this._events || {};
    this._maxListeners = this._maxListeners || undefined;
  }
  module.exports = EventEmitter;
  EventEmitter.EventEmitter = EventEmitter;
  EventEmitter.prototype._events = undefined;
  EventEmitter.prototype._maxListeners = undefined;
  EventEmitter.defaultMaxListeners = 10;
  EventEmitter.prototype.setMaxListeners = function(n) {
    if (!isNumber(n) || n < 0 || isNaN(n))
      throw TypeError('n must be a positive number');
    this._maxListeners = n;
    return this;
  };
  EventEmitter.prototype.emit = function(type) {
    var er,
        handler,
        len,
        args,
        i,
        listeners;
    if (!this._events)
      this._events = {};
    if (type === 'error') {
      if (!this._events.error || (isObject(this._events.error) && !this._events.error.length)) {
        er = arguments[1];
        if (er instanceof Error) {
          throw er;
        }
        throw TypeError('Uncaught, unspecified "error" event.');
      }
    }
    handler = this._events[type];
    if (isUndefined(handler))
      return false;
    if (isFunction(handler)) {
      switch (arguments.length) {
        case 1:
          handler.call(this);
          break;
        case 2:
          handler.call(this, arguments[1]);
          break;
        case 3:
          handler.call(this, arguments[1], arguments[2]);
          break;
        default:
          len = arguments.length;
          args = new Array(len - 1);
          for (i = 1; i < len; i++)
            args[i - 1] = arguments[i];
          handler.apply(this, args);
      }
    } else if (isObject(handler)) {
      len = arguments.length;
      args = new Array(len - 1);
      for (i = 1; i < len; i++)
        args[i - 1] = arguments[i];
      listeners = handler.slice();
      len = listeners.length;
      for (i = 0; i < len; i++)
        listeners[i].apply(this, args);
    }
    return true;
  };
  EventEmitter.prototype.addListener = function(type, listener) {
    var m;
    if (!isFunction(listener))
      throw TypeError('listener must be a function');
    if (!this._events)
      this._events = {};
    if (this._events.newListener)
      this.emit('newListener', type, isFunction(listener.listener) ? listener.listener : listener);
    if (!this._events[type])
      this._events[type] = listener;
    else if (isObject(this._events[type]))
      this._events[type].push(listener);
    else
      this._events[type] = [this._events[type], listener];
    if (isObject(this._events[type]) && !this._events[type].warned) {
      var m;
      if (!isUndefined(this._maxListeners)) {
        m = this._maxListeners;
      } else {
        m = EventEmitter.defaultMaxListeners;
      }
      if (m && m > 0 && this._events[type].length > m) {
        this._events[type].warned = true;
        console.error('(node) warning: possible EventEmitter memory ' + 'leak detected. %d listeners added. ' + 'Use emitter.setMaxListeners() to increase limit.', this._events[type].length);
        if (typeof console.trace === 'function') {
          console.trace();
        }
      }
    }
    return this;
  };
  EventEmitter.prototype.on = EventEmitter.prototype.addListener;
  EventEmitter.prototype.once = function(type, listener) {
    if (!isFunction(listener))
      throw TypeError('listener must be a function');
    var fired = false;
    function g() {
      this.removeListener(type, g);
      if (!fired) {
        fired = true;
        listener.apply(this, arguments);
      }
    }
    g.listener = listener;
    this.on(type, g);
    return this;
  };
  EventEmitter.prototype.removeListener = function(type, listener) {
    var list,
        position,
        length,
        i;
    if (!isFunction(listener))
      throw TypeError('listener must be a function');
    if (!this._events || !this._events[type])
      return this;
    list = this._events[type];
    length = list.length;
    position = -1;
    if (list === listener || (isFunction(list.listener) && list.listener === listener)) {
      delete this._events[type];
      if (this._events.removeListener)
        this.emit('removeListener', type, listener);
    } else if (isObject(list)) {
      for (i = length; i-- > 0; ) {
        if (list[i] === listener || (list[i].listener && list[i].listener === listener)) {
          position = i;
          break;
        }
      }
      if (position < 0)
        return this;
      if (list.length === 1) {
        list.length = 0;
        delete this._events[type];
      } else {
        list.splice(position, 1);
      }
      if (this._events.removeListener)
        this.emit('removeListener', type, listener);
    }
    return this;
  };
  EventEmitter.prototype.removeAllListeners = function(type) {
    var key,
        listeners;
    if (!this._events)
      return this;
    if (!this._events.removeListener) {
      if (arguments.length === 0)
        this._events = {};
      else if (this._events[type])
        delete this._events[type];
      return this;
    }
    if (arguments.length === 0) {
      for (key in this._events) {
        if (key === 'removeListener')
          continue;
        this.removeAllListeners(key);
      }
      this.removeAllListeners('removeListener');
      this._events = {};
      return this;
    }
    listeners = this._events[type];
    if (isFunction(listeners)) {
      this.removeListener(type, listeners);
    } else {
      while (listeners.length)
        this.removeListener(type, listeners[listeners.length - 1]);
    }
    delete this._events[type];
    return this;
  };
  EventEmitter.prototype.listeners = function(type) {
    var ret;
    if (!this._events || !this._events[type])
      ret = [];
    else if (isFunction(this._events[type]))
      ret = [this._events[type]];
    else
      ret = this._events[type].slice();
    return ret;
  };
  EventEmitter.listenerCount = function(emitter, type) {
    var ret;
    if (!emitter._events || !emitter._events[type])
      ret = 0;
    else if (isFunction(emitter._events[type]))
      ret = 1;
    else
      ret = emitter._events[type].length;
    return ret;
  };
  function isFunction(arg) {
    return typeof arg === 'function';
  }
  function isNumber(arg) {
    return typeof arg === 'number';
  }
  function isObject(arg) {
    return typeof arg === 'object' && arg !== null;
  }
  function isUndefined(arg) {
    return arg === void 0;
  }
  return module.exports;
});

$__System.registerDynamic("4d", ["4c"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = $__require('4c');
  return module.exports;
});

$__System.registerDynamic("4e", ["4d"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = $__System._nodeRequire ? $__System._nodeRequire('events') : $__require('4d');
  return module.exports;
});

$__System.registerDynamic("3d", ["4e"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = $__require('4e');
  return module.exports;
});

$__System.registerDynamic("4f", [], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  function apply(func, thisArg, args) {
    var length = args.length;
    switch (length) {
      case 0:
        return func.call(thisArg);
      case 1:
        return func.call(thisArg, args[0]);
      case 2:
        return func.call(thisArg, args[0], args[1]);
      case 3:
        return func.call(thisArg, args[0], args[1], args[2]);
    }
    return func.apply(thisArg, args);
  }
  module.exports = apply;
  return module.exports;
});

$__System.registerDynamic("50", ["51", "52", "20"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  (function(process) {
    var isFunction = $__require('51'),
        isObject = $__require('52');
    var NAN = 0 / 0;
    var reTrim = /^\s+|\s+$/g;
    var reIsBadHex = /^[-+]0x[0-9a-f]+$/i;
    var reIsBinary = /^0b[01]+$/i;
    var reIsOctal = /^0o[0-7]+$/i;
    var freeParseInt = parseInt;
    function toNumber(value) {
      if (isObject(value)) {
        var other = isFunction(value.valueOf) ? value.valueOf() : value;
        value = isObject(other) ? (other + '') : other;
      }
      if (typeof value != 'string') {
        return value === 0 ? value : +value;
      }
      value = value.replace(reTrim, '');
      var isBinary = reIsBinary.test(value);
      return (isBinary || reIsOctal.test(value)) ? freeParseInt(value.slice(2), isBinary ? 2 : 8) : (reIsBadHex.test(value) ? NAN : +value);
    }
    module.exports = toNumber;
  })($__require('20'));
  return module.exports;
});

$__System.registerDynamic("53", ["50"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var toNumber = $__require('50');
  var INFINITY = 1 / 0,
      MAX_INTEGER = 1.7976931348623157e+308;
  function toInteger(value) {
    if (!value) {
      return value === 0 ? value : 0;
    }
    value = toNumber(value);
    if (value === INFINITY || value === -INFINITY) {
      var sign = (value < 0 ? -1 : 1);
      return sign * MAX_INTEGER;
    }
    var remainder = value % 1;
    return value === value ? (remainder ? value - remainder : value) : 0;
  }
  module.exports = toInteger;
  return module.exports;
});

$__System.registerDynamic("54", ["4f", "53"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var apply = $__require('4f'),
      toInteger = $__require('53');
  var FUNC_ERROR_TEXT = 'Expected a function';
  var nativeMax = Math.max;
  function rest(func, start) {
    if (typeof func != 'function') {
      throw new TypeError(FUNC_ERROR_TEXT);
    }
    start = nativeMax(start === undefined ? (func.length - 1) : toInteger(start), 0);
    return function() {
      var args = arguments,
          index = -1,
          length = nativeMax(args.length - start, 0),
          array = Array(length);
      while (++index < length) {
        array[index] = args[start + index];
      }
      switch (start) {
        case 0:
          return func.call(this, array);
        case 1:
          return func.call(this, args[0], array);
        case 2:
          return func.call(this, args[0], args[1], array);
      }
      var otherArgs = Array(start + 1);
      index = -1;
      while (++index < start) {
        otherArgs[index] = args[index];
      }
      otherArgs[start] = array;
      return apply(func, this, otherArgs);
    };
  }
  module.exports = rest;
  return module.exports;
});

$__System.registerDynamic("55", ["56", "54"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var isIterateeCall = $__require('56'),
      rest = $__require('54');
  function createAssigner(assigner) {
    return rest(function(object, sources) {
      var index = -1,
          length = sources.length,
          customizer = length > 1 ? sources[length - 1] : undefined,
          guard = length > 2 ? sources[2] : undefined;
      customizer = typeof customizer == 'function' ? (length--, customizer) : undefined;
      if (guard && isIterateeCall(sources[0], sources[1], guard)) {
        customizer = length < 3 ? undefined : customizer;
        length = 1;
      }
      object = Object(object);
      while (++index < length) {
        var source = sources[index];
        if (source) {
          assigner(object, source, index, customizer);
        }
      }
      return object;
    });
  }
  module.exports = createAssigner;
  return module.exports;
});

$__System.registerDynamic("57", ["58", "59", "55", "5a", "5b", "5c"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var assignValue = $__require('58'),
      copyObject = $__require('59'),
      createAssigner = $__require('55'),
      isArrayLike = $__require('5a'),
      isPrototype = $__require('5b'),
      keys = $__require('5c');
  var objectProto = Object.prototype;
  var hasOwnProperty = objectProto.hasOwnProperty;
  var propertyIsEnumerable = objectProto.propertyIsEnumerable;
  var nonEnumShadows = !propertyIsEnumerable.call({'valueOf': 1}, 'valueOf');
  var assign = createAssigner(function(object, source) {
    if (nonEnumShadows || isPrototype(source) || isArrayLike(source)) {
      copyObject(source, keys(source), object);
      return;
    }
    for (var key in source) {
      if (hasOwnProperty.call(source, key)) {
        assignValue(object, key, source[key]);
      }
    }
  });
  module.exports = assign;
  return module.exports;
});

$__System.registerDynamic("5d", ["20"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
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
          this.noDoubleEncoding = options != null ? options.noDoubleEncoding : void 0;
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
          if (!val.match(/^[A-Za-z](?:[A-Za-z0-9._-]|-)*$/)) {
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
          var ampregex;
          ampregex = this.noDoubleEncoding ? /(?!&\S+;)&/g : /&/g;
          return str.replace(ampregex, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\r/g, '&#xD;');
        };
        XMLStringifier.prototype.attEscape = function(str) {
          var ampregex;
          ampregex = this.noDoubleEncoding ? /(?!&\S+;)&/g : /&/g;
          return str.replace(ampregex, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
        };
        return XMLStringifier;
      })();
    }).call(this);
  })($__require('20'));
  return module.exports;
});

$__System.registerDynamic("5e", [], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  function arrayEvery(array, predicate) {
    var index = -1,
        length = array.length;
    while (++index < length) {
      if (!predicate(array[index], index, array)) {
        return false;
      }
    }
    return true;
  }
  module.exports = arrayEvery;
  return module.exports;
});

$__System.registerDynamic("5f", [], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  function createBaseFor(fromRight) {
    return function(object, iteratee, keysFunc) {
      var index = -1,
          iterable = Object(object),
          props = keysFunc(object),
          length = props.length;
      while (length--) {
        var key = props[fromRight ? length : ++index];
        if (iteratee(iterable[key], key, iterable) === false) {
          break;
        }
      }
      return object;
    };
  }
  module.exports = createBaseFor;
  return module.exports;
});

$__System.registerDynamic("60", ["5f"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var createBaseFor = $__require('5f');
  var baseFor = createBaseFor();
  module.exports = baseFor;
  return module.exports;
});

$__System.registerDynamic("61", ["60", "5c"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var baseFor = $__require('60'),
      keys = $__require('5c');
  function baseForOwn(object, iteratee) {
    return object && baseFor(object, iteratee, keys);
  }
  module.exports = baseForOwn;
  return module.exports;
});

$__System.registerDynamic("62", ["5a"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var isArrayLike = $__require('5a');
  function createBaseEach(eachFunc, fromRight) {
    return function(collection, iteratee) {
      if (collection == null) {
        return collection;
      }
      if (!isArrayLike(collection)) {
        return eachFunc(collection, iteratee);
      }
      var length = collection.length,
          index = fromRight ? length : -1,
          iterable = Object(collection);
      while ((fromRight ? index-- : ++index < length)) {
        if (iteratee(iterable[index], index, iterable) === false) {
          break;
        }
      }
      return collection;
    };
  }
  module.exports = createBaseEach;
  return module.exports;
});

$__System.registerDynamic("63", ["61", "62"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var baseForOwn = $__require('61'),
      createBaseEach = $__require('62');
  var baseEach = createBaseEach(baseForOwn);
  module.exports = baseEach;
  return module.exports;
});

$__System.registerDynamic("64", ["63"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var baseEach = $__require('63');
  function baseEvery(collection, predicate) {
    var result = true;
    baseEach(collection, function(value, index, collection) {
      result = !!predicate(value, index, collection);
      return result;
    });
    return result;
  }
  module.exports = baseEvery;
  return module.exports;
});

$__System.registerDynamic("65", ["66", "67"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var Stack = $__require('66'),
      baseIsEqual = $__require('67');
  var UNORDERED_COMPARE_FLAG = 1,
      PARTIAL_COMPARE_FLAG = 2;
  function baseIsMatch(object, source, matchData, customizer) {
    var index = matchData.length,
        length = index,
        noCustomizer = !customizer;
    if (object == null) {
      return !length;
    }
    object = Object(object);
    while (index--) {
      var data = matchData[index];
      if ((noCustomizer && data[2]) ? data[1] !== object[data[0]] : !(data[0] in object)) {
        return false;
      }
    }
    while (++index < length) {
      data = matchData[index];
      var key = data[0],
          objValue = object[key],
          srcValue = data[1];
      if (noCustomizer && data[2]) {
        if (objValue === undefined && !(key in object)) {
          return false;
        }
      } else {
        var stack = new Stack,
            result = customizer ? customizer(objValue, srcValue, key, object, source, stack) : undefined;
        if (!(result === undefined ? baseIsEqual(srcValue, objValue, customizer, UNORDERED_COMPARE_FLAG | PARTIAL_COMPARE_FLAG, stack) : result)) {
          return false;
        }
      }
    }
    return true;
  }
  module.exports = baseIsMatch;
  return module.exports;
});

$__System.registerDynamic("68", ["52"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var isObject = $__require('52');
  function isStrictComparable(value) {
    return value === value && !isObject(value);
  }
  module.exports = isStrictComparable;
  return module.exports;
});

$__System.registerDynamic("69", [], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  function arrayMap(array, iteratee) {
    var index = -1,
        length = array.length,
        result = Array(length);
    while (++index < length) {
      result[index] = iteratee(array[index], index, array);
    }
    return result;
  }
  module.exports = arrayMap;
  return module.exports;
});

$__System.registerDynamic("6a", ["69"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var arrayMap = $__require('69');
  function baseToPairs(object, props) {
    return arrayMap(props, function(key) {
      return [key, object[key]];
    });
  }
  module.exports = baseToPairs;
  return module.exports;
});

$__System.registerDynamic("6b", ["6a", "5c"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var baseToPairs = $__require('6a'),
      keys = $__require('5c');
  function toPairs(object) {
    return baseToPairs(object, keys(object));
  }
  module.exports = toPairs;
  return module.exports;
});

$__System.registerDynamic("6c", ["68", "6b"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var isStrictComparable = $__require('68'),
      toPairs = $__require('6b');
  function getMatchData(object) {
    var result = toPairs(object),
        length = result.length;
    while (length--) {
      result[length][2] = isStrictComparable(result[length][1]);
    }
    return result;
  }
  module.exports = getMatchData;
  return module.exports;
});

$__System.registerDynamic("6d", ["65", "6c"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var baseIsMatch = $__require('65'),
      getMatchData = $__require('6c');
  function baseMatches(source) {
    var matchData = getMatchData(source);
    if (matchData.length == 1 && matchData[0][2]) {
      var key = matchData[0][0],
          value = matchData[0][1];
      return function(object) {
        if (object == null) {
          return false;
        }
        return object[key] === value && (value !== undefined || (key in Object(object)));
      };
    }
    return function(object) {
      return object === source || baseIsMatch(object, source, matchData);
    };
  }
  module.exports = baseMatches;
  return module.exports;
});

$__System.registerDynamic("6e", [], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  function stackClear() {
    this.__data__ = {
      'array': [],
      'map': null
    };
  }
  module.exports = stackClear;
  return module.exports;
});

$__System.registerDynamic("6f", ["70"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var assocDelete = $__require('70');
  function stackDelete(key) {
    var data = this.__data__,
        array = data.array;
    return array ? assocDelete(array, key) : data.map['delete'](key);
  }
  module.exports = stackDelete;
  return module.exports;
});

$__System.registerDynamic("71", ["72"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var assocGet = $__require('72');
  function stackGet(key) {
    var data = this.__data__,
        array = data.array;
    return array ? assocGet(array, key) : data.map.get(key);
  }
  module.exports = stackGet;
  return module.exports;
});

$__System.registerDynamic("73", ["74"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var assocHas = $__require('74');
  function stackHas(key) {
    var data = this.__data__,
        array = data.array;
    return array ? assocHas(array, key) : data.map.has(key);
  }
  module.exports = stackHas;
  return module.exports;
});

$__System.registerDynamic("75", ["76"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var nativeCreate = $__require('76');
  var objectProto = Object.prototype;
  function Hash() {}
  Hash.prototype = nativeCreate ? nativeCreate(null) : objectProto;
  module.exports = Hash;
  return module.exports;
});

$__System.registerDynamic("77", ["75", "78"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var Hash = $__require('75'),
      Map = $__require('78');
  function mapClear() {
    this.__data__ = {
      'hash': new Hash,
      'map': Map ? new Map : [],
      'string': new Hash
    };
  }
  module.exports = mapClear;
  return module.exports;
});

$__System.registerDynamic("70", ["79"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var assocIndexOf = $__require('79');
  var arrayProto = Array.prototype;
  var splice = arrayProto.splice;
  function assocDelete(array, key) {
    var index = assocIndexOf(array, key);
    if (index < 0) {
      return false;
    }
    var lastIndex = array.length - 1;
    if (index == lastIndex) {
      array.pop();
    } else {
      splice.call(array, index, 1);
    }
    return true;
  }
  module.exports = assocDelete;
  return module.exports;
});

$__System.registerDynamic("7a", ["7b"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var hashHas = $__require('7b');
  function hashDelete(hash, key) {
    return hashHas(hash, key) && delete hash[key];
  }
  module.exports = hashDelete;
  return module.exports;
});

$__System.registerDynamic("7c", ["78", "70", "7a", "7d"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var Map = $__require('78'),
      assocDelete = $__require('70'),
      hashDelete = $__require('7a'),
      isKeyable = $__require('7d');
  function mapDelete(key) {
    var data = this.__data__;
    if (isKeyable(key)) {
      return hashDelete(typeof key == 'string' ? data.string : data.hash, key);
    }
    return Map ? data.map['delete'](key) : assocDelete(data.map, key);
  }
  module.exports = mapDelete;
  return module.exports;
});

$__System.registerDynamic("72", ["79"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var assocIndexOf = $__require('79');
  function assocGet(array, key) {
    var index = assocIndexOf(array, key);
    return index < 0 ? undefined : array[index][1];
  }
  module.exports = assocGet;
  return module.exports;
});

$__System.registerDynamic("7e", ["76"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var nativeCreate = $__require('76');
  var HASH_UNDEFINED = '__lodash_hash_undefined__';
  var objectProto = Object.prototype;
  var hasOwnProperty = objectProto.hasOwnProperty;
  function hashGet(hash, key) {
    if (nativeCreate) {
      var result = hash[key];
      return result === HASH_UNDEFINED ? undefined : result;
    }
    return hasOwnProperty.call(hash, key) ? hash[key] : undefined;
  }
  module.exports = hashGet;
  return module.exports;
});

$__System.registerDynamic("7f", ["78", "72", "7e", "7d"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var Map = $__require('78'),
      assocGet = $__require('72'),
      hashGet = $__require('7e'),
      isKeyable = $__require('7d');
  function mapGet(key) {
    var data = this.__data__;
    if (isKeyable(key)) {
      return hashGet(typeof key == 'string' ? data.string : data.hash, key);
    }
    return Map ? data.map.get(key) : assocGet(data.map, key);
  }
  module.exports = mapGet;
  return module.exports;
});

$__System.registerDynamic("74", ["79"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var assocIndexOf = $__require('79');
  function assocHas(array, key) {
    return assocIndexOf(array, key) > -1;
  }
  module.exports = assocHas;
  return module.exports;
});

$__System.registerDynamic("7b", ["76"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var nativeCreate = $__require('76');
  var objectProto = Object.prototype;
  var hasOwnProperty = objectProto.hasOwnProperty;
  function hashHas(hash, key) {
    return nativeCreate ? hash[key] !== undefined : hasOwnProperty.call(hash, key);
  }
  module.exports = hashHas;
  return module.exports;
});

$__System.registerDynamic("80", ["78", "74", "7b", "7d"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var Map = $__require('78'),
      assocHas = $__require('74'),
      hashHas = $__require('7b'),
      isKeyable = $__require('7d');
  function mapHas(key) {
    var data = this.__data__;
    if (isKeyable(key)) {
      return hashHas(typeof key == 'string' ? data.string : data.hash, key);
    }
    return Map ? data.map.has(key) : assocHas(data.map, key);
  }
  module.exports = mapHas;
  return module.exports;
});

$__System.registerDynamic("76", ["81"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var getNative = $__require('81');
  var nativeCreate = getNative(Object, 'create');
  module.exports = nativeCreate;
  return module.exports;
});

$__System.registerDynamic("82", ["76"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var nativeCreate = $__require('76');
  var HASH_UNDEFINED = '__lodash_hash_undefined__';
  function hashSet(hash, key, value) {
    hash[key] = (nativeCreate && value === undefined) ? HASH_UNDEFINED : value;
  }
  module.exports = hashSet;
  return module.exports;
});

$__System.registerDynamic("7d", [], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  function isKeyable(value) {
    var type = typeof value;
    return type == 'number' || type == 'boolean' || (type == 'string' && value != '__proto__') || value == null;
  }
  module.exports = isKeyable;
  return module.exports;
});

$__System.registerDynamic("83", ["78", "84", "82", "7d"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var Map = $__require('78'),
      assocSet = $__require('84'),
      hashSet = $__require('82'),
      isKeyable = $__require('7d');
  function mapSet(key, value) {
    var data = this.__data__;
    if (isKeyable(key)) {
      hashSet(typeof key == 'string' ? data.string : data.hash, key, value);
    } else if (Map) {
      data.map.set(key, value);
    } else {
      assocSet(data.map, key, value);
    }
    return this;
  }
  module.exports = mapSet;
  return module.exports;
});

$__System.registerDynamic("85", ["77", "7c", "7f", "80", "83"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var mapClear = $__require('77'),
      mapDelete = $__require('7c'),
      mapGet = $__require('7f'),
      mapHas = $__require('80'),
      mapSet = $__require('83');
  function MapCache(values) {
    var index = -1,
        length = values ? values.length : 0;
    this.clear();
    while (++index < length) {
      var entry = values[index];
      this.set(entry[0], entry[1]);
    }
  }
  MapCache.prototype.clear = mapClear;
  MapCache.prototype['delete'] = mapDelete;
  MapCache.prototype.get = mapGet;
  MapCache.prototype.has = mapHas;
  MapCache.prototype.set = mapSet;
  module.exports = MapCache;
  return module.exports;
});

$__System.registerDynamic("79", ["86"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var eq = $__require('86');
  function assocIndexOf(array, key) {
    var length = array.length;
    while (length--) {
      if (eq(array[length][0], key)) {
        return length;
      }
    }
    return -1;
  }
  module.exports = assocIndexOf;
  return module.exports;
});

$__System.registerDynamic("84", ["79"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var assocIndexOf = $__require('79');
  function assocSet(array, key, value) {
    var index = assocIndexOf(array, key);
    if (index < 0) {
      array.push([key, value]);
    } else {
      array[index][1] = value;
    }
  }
  module.exports = assocSet;
  return module.exports;
});

$__System.registerDynamic("87", ["85", "84"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var MapCache = $__require('85'),
      assocSet = $__require('84');
  var LARGE_ARRAY_SIZE = 200;
  function stackSet(key, value) {
    var data = this.__data__,
        array = data.array;
    if (array) {
      if (array.length < (LARGE_ARRAY_SIZE - 1)) {
        assocSet(array, key, value);
      } else {
        data.array = null;
        data.map = new MapCache(array);
      }
    }
    var map = data.map;
    if (map) {
      map.set(key, value);
    }
    return this;
  }
  module.exports = stackSet;
  return module.exports;
});

$__System.registerDynamic("66", ["6e", "6f", "71", "73", "87"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var stackClear = $__require('6e'),
      stackDelete = $__require('6f'),
      stackGet = $__require('71'),
      stackHas = $__require('73'),
      stackSet = $__require('87');
  function Stack(values) {
    var index = -1,
        length = values ? values.length : 0;
    this.clear();
    while (++index < length) {
      var entry = values[index];
      this.set(entry[0], entry[1]);
    }
  }
  Stack.prototype.clear = stackClear;
  Stack.prototype['delete'] = stackDelete;
  Stack.prototype.get = stackGet;
  Stack.prototype.has = stackHas;
  Stack.prototype.set = stackSet;
  module.exports = Stack;
  return module.exports;
});

$__System.registerDynamic("88", ["89"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var root = $__require('89');
  var Uint8Array = root.Uint8Array;
  module.exports = Uint8Array;
  return module.exports;
});

$__System.registerDynamic("8a", [], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  function arraySome(array, predicate) {
    var index = -1,
        length = array.length;
    while (++index < length) {
      if (predicate(array[index], index, array)) {
        return true;
      }
    }
    return false;
  }
  module.exports = arraySome;
  return module.exports;
});

$__System.registerDynamic("8b", ["8a"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var arraySome = $__require('8a');
  var UNORDERED_COMPARE_FLAG = 1,
      PARTIAL_COMPARE_FLAG = 2;
  function equalArrays(array, other, equalFunc, customizer, bitmask, stack) {
    var index = -1,
        isPartial = bitmask & PARTIAL_COMPARE_FLAG,
        isUnordered = bitmask & UNORDERED_COMPARE_FLAG,
        arrLength = array.length,
        othLength = other.length;
    if (arrLength != othLength && !(isPartial && othLength > arrLength)) {
      return false;
    }
    var stacked = stack.get(array);
    if (stacked) {
      return stacked == other;
    }
    var result = true;
    stack.set(array, other);
    while (++index < arrLength) {
      var arrValue = array[index],
          othValue = other[index];
      if (customizer) {
        var compared = isPartial ? customizer(othValue, arrValue, index, other, array, stack) : customizer(arrValue, othValue, index, array, other, stack);
      }
      if (compared !== undefined) {
        if (compared) {
          continue;
        }
        result = false;
        break;
      }
      if (isUnordered) {
        if (!arraySome(other, function(othValue) {
          return arrValue === othValue || equalFunc(arrValue, othValue, customizer, bitmask, stack);
        })) {
          result = false;
          break;
        }
      } else if (!(arrValue === othValue || equalFunc(arrValue, othValue, customizer, bitmask, stack))) {
        result = false;
        break;
      }
    }
    stack['delete'](array);
    return result;
  }
  module.exports = equalArrays;
  return module.exports;
});

$__System.registerDynamic("8c", [], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  function mapToArray(map) {
    var index = -1,
        result = Array(map.size);
    map.forEach(function(value, key) {
      result[++index] = [key, value];
    });
    return result;
  }
  module.exports = mapToArray;
  return module.exports;
});

$__System.registerDynamic("8d", [], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  function setToArray(set) {
    var index = -1,
        result = Array(set.size);
    set.forEach(function(value) {
      result[++index] = value;
    });
    return result;
  }
  module.exports = setToArray;
  return module.exports;
});

$__System.registerDynamic("8e", ["8f", "88", "8b", "8c", "8d"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var Symbol = $__require('8f'),
      Uint8Array = $__require('88'),
      equalArrays = $__require('8b'),
      mapToArray = $__require('8c'),
      setToArray = $__require('8d');
  var UNORDERED_COMPARE_FLAG = 1,
      PARTIAL_COMPARE_FLAG = 2;
  var boolTag = '[object Boolean]',
      dateTag = '[object Date]',
      errorTag = '[object Error]',
      mapTag = '[object Map]',
      numberTag = '[object Number]',
      regexpTag = '[object RegExp]',
      setTag = '[object Set]',
      stringTag = '[object String]',
      symbolTag = '[object Symbol]';
  var arrayBufferTag = '[object ArrayBuffer]';
  var symbolProto = Symbol ? Symbol.prototype : undefined,
      symbolValueOf = symbolProto ? symbolProto.valueOf : undefined;
  function equalByTag(object, other, tag, equalFunc, customizer, bitmask, stack) {
    switch (tag) {
      case arrayBufferTag:
        if ((object.byteLength != other.byteLength) || !equalFunc(new Uint8Array(object), new Uint8Array(other))) {
          return false;
        }
        return true;
      case boolTag:
      case dateTag:
        return +object == +other;
      case errorTag:
        return object.name == other.name && object.message == other.message;
      case numberTag:
        return (object != +object) ? other != +other : object == +other;
      case regexpTag:
      case stringTag:
        return object == (other + '');
      case mapTag:
        var convert = mapToArray;
      case setTag:
        var isPartial = bitmask & PARTIAL_COMPARE_FLAG;
        convert || (convert = setToArray);
        if (object.size != other.size && !isPartial) {
          return false;
        }
        var stacked = stack.get(object);
        if (stacked) {
          return stacked == other;
        }
        return equalArrays(convert(object), convert(other), equalFunc, customizer, bitmask | UNORDERED_COMPARE_FLAG, stack.set(object, other));
      case symbolTag:
        if (symbolValueOf) {
          return symbolValueOf.call(object) == symbolValueOf.call(other);
        }
    }
    return false;
  }
  module.exports = equalByTag;
  return module.exports;
});

$__System.registerDynamic("90", ["91", "5c"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var baseHas = $__require('91'),
      keys = $__require('5c');
  var PARTIAL_COMPARE_FLAG = 2;
  function equalObjects(object, other, equalFunc, customizer, bitmask, stack) {
    var isPartial = bitmask & PARTIAL_COMPARE_FLAG,
        objProps = keys(object),
        objLength = objProps.length,
        othProps = keys(other),
        othLength = othProps.length;
    if (objLength != othLength && !isPartial) {
      return false;
    }
    var index = objLength;
    while (index--) {
      var key = objProps[index];
      if (!(isPartial ? key in other : baseHas(other, key))) {
        return false;
      }
    }
    var stacked = stack.get(object);
    if (stacked) {
      return stacked == other;
    }
    var result = true;
    stack.set(object, other);
    var skipCtor = isPartial;
    while (++index < objLength) {
      key = objProps[index];
      var objValue = object[key],
          othValue = other[key];
      if (customizer) {
        var compared = isPartial ? customizer(othValue, objValue, key, other, object, stack) : customizer(objValue, othValue, key, object, other, stack);
      }
      if (!(compared === undefined ? (objValue === othValue || equalFunc(objValue, othValue, customizer, bitmask, stack)) : compared)) {
        result = false;
        break;
      }
      skipCtor || (skipCtor = key == 'constructor');
    }
    if (result && !skipCtor) {
      var objCtor = object.constructor,
          othCtor = other.constructor;
      if (objCtor != othCtor && ('constructor' in object && 'constructor' in other) && !(typeof objCtor == 'function' && objCtor instanceof objCtor && typeof othCtor == 'function' && othCtor instanceof othCtor)) {
        result = false;
      }
    }
    stack['delete'](object);
    return result;
  }
  module.exports = equalObjects;
  return module.exports;
});

$__System.registerDynamic("78", ["81", "89"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var getNative = $__require('81'),
      root = $__require('89');
  var Map = getNative(root, 'Map');
  module.exports = Map;
  return module.exports;
});

$__System.registerDynamic("92", ["81", "89"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var getNative = $__require('81'),
      root = $__require('89');
  var Set = getNative(root, 'Set');
  module.exports = Set;
  return module.exports;
});

$__System.registerDynamic("93", ["51", "94", "95"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var isFunction = $__require('51'),
      isHostObject = $__require('94'),
      isObjectLike = $__require('95');
  var reRegExpChar = /[\\^$.*+?()[\]{}|]/g;
  var reIsHostCtor = /^\[object .+?Constructor\]$/;
  var objectProto = Object.prototype;
  var funcToString = Function.prototype.toString;
  var hasOwnProperty = objectProto.hasOwnProperty;
  var reIsNative = RegExp('^' + funcToString.call(hasOwnProperty).replace(reRegExpChar, '\\$&').replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, '$1.*?') + '$');
  function isNative(value) {
    if (value == null) {
      return false;
    }
    if (isFunction(value)) {
      return reIsNative.test(funcToString.call(value));
    }
    return isObjectLike(value) && (isHostObject(value) ? reIsNative : reIsHostCtor).test(value);
  }
  module.exports = isNative;
  return module.exports;
});

$__System.registerDynamic("81", ["93"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var isNative = $__require('93');
  function getNative(object, key) {
    var value = object[key];
    return isNative(value) ? value : undefined;
  }
  module.exports = getNative;
  return module.exports;
});

$__System.registerDynamic("96", ["81", "89"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var getNative = $__require('81'),
      root = $__require('89');
  var WeakMap = getNative(root, 'WeakMap');
  module.exports = WeakMap;
  return module.exports;
});

$__System.registerDynamic("97", ["78", "92", "96"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var Map = $__require('78'),
      Set = $__require('92'),
      WeakMap = $__require('96');
  var mapTag = '[object Map]',
      objectTag = '[object Object]',
      setTag = '[object Set]',
      weakMapTag = '[object WeakMap]';
  var objectProto = Object.prototype;
  var funcToString = Function.prototype.toString;
  var objectToString = objectProto.toString;
  var mapCtorString = Map ? funcToString.call(Map) : '',
      setCtorString = Set ? funcToString.call(Set) : '',
      weakMapCtorString = WeakMap ? funcToString.call(WeakMap) : '';
  function getTag(value) {
    return objectToString.call(value);
  }
  if ((Map && getTag(new Map) != mapTag) || (Set && getTag(new Set) != setTag) || (WeakMap && getTag(new WeakMap) != weakMapTag)) {
    getTag = function(value) {
      var result = objectToString.call(value),
          Ctor = result == objectTag ? value.constructor : null,
          ctorString = typeof Ctor == 'function' ? funcToString.call(Ctor) : '';
      if (ctorString) {
        switch (ctorString) {
          case mapCtorString:
            return mapTag;
          case setCtorString:
            return setTag;
          case weakMapCtorString:
            return weakMapTag;
        }
      }
      return result;
    };
  }
  module.exports = getTag;
  return module.exports;
});

$__System.registerDynamic("94", [], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  function isHostObject(value) {
    var result = false;
    if (value != null && typeof value.toString != 'function') {
      try {
        result = !!(value + '');
      } catch (e) {}
    }
    return result;
  }
  module.exports = isHostObject;
  return module.exports;
});

$__System.registerDynamic("98", ["99", "95"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var isLength = $__require('99'),
      isObjectLike = $__require('95');
  var argsTag = '[object Arguments]',
      arrayTag = '[object Array]',
      boolTag = '[object Boolean]',
      dateTag = '[object Date]',
      errorTag = '[object Error]',
      funcTag = '[object Function]',
      mapTag = '[object Map]',
      numberTag = '[object Number]',
      objectTag = '[object Object]',
      regexpTag = '[object RegExp]',
      setTag = '[object Set]',
      stringTag = '[object String]',
      weakMapTag = '[object WeakMap]';
  var arrayBufferTag = '[object ArrayBuffer]',
      float32Tag = '[object Float32Array]',
      float64Tag = '[object Float64Array]',
      int8Tag = '[object Int8Array]',
      int16Tag = '[object Int16Array]',
      int32Tag = '[object Int32Array]',
      uint8Tag = '[object Uint8Array]',
      uint8ClampedTag = '[object Uint8ClampedArray]',
      uint16Tag = '[object Uint16Array]',
      uint32Tag = '[object Uint32Array]';
  var typedArrayTags = {};
  typedArrayTags[float32Tag] = typedArrayTags[float64Tag] = typedArrayTags[int8Tag] = typedArrayTags[int16Tag] = typedArrayTags[int32Tag] = typedArrayTags[uint8Tag] = typedArrayTags[uint8ClampedTag] = typedArrayTags[uint16Tag] = typedArrayTags[uint32Tag] = true;
  typedArrayTags[argsTag] = typedArrayTags[arrayTag] = typedArrayTags[arrayBufferTag] = typedArrayTags[boolTag] = typedArrayTags[dateTag] = typedArrayTags[errorTag] = typedArrayTags[funcTag] = typedArrayTags[mapTag] = typedArrayTags[numberTag] = typedArrayTags[objectTag] = typedArrayTags[regexpTag] = typedArrayTags[setTag] = typedArrayTags[stringTag] = typedArrayTags[weakMapTag] = false;
  var objectProto = Object.prototype;
  var objectToString = objectProto.toString;
  function isTypedArray(value) {
    return isObjectLike(value) && isLength(value.length) && !!typedArrayTags[objectToString.call(value)];
  }
  module.exports = isTypedArray;
  return module.exports;
});

$__System.registerDynamic("9a", ["66", "8b", "8e", "90", "97", "9b", "94", "98"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var Stack = $__require('66'),
      equalArrays = $__require('8b'),
      equalByTag = $__require('8e'),
      equalObjects = $__require('90'),
      getTag = $__require('97'),
      isArray = $__require('9b'),
      isHostObject = $__require('94'),
      isTypedArray = $__require('98');
  var PARTIAL_COMPARE_FLAG = 2;
  var argsTag = '[object Arguments]',
      arrayTag = '[object Array]',
      objectTag = '[object Object]';
  var objectProto = Object.prototype;
  var hasOwnProperty = objectProto.hasOwnProperty;
  function baseIsEqualDeep(object, other, equalFunc, customizer, bitmask, stack) {
    var objIsArr = isArray(object),
        othIsArr = isArray(other),
        objTag = arrayTag,
        othTag = arrayTag;
    if (!objIsArr) {
      objTag = getTag(object);
      objTag = objTag == argsTag ? objectTag : objTag;
    }
    if (!othIsArr) {
      othTag = getTag(other);
      othTag = othTag == argsTag ? objectTag : othTag;
    }
    var objIsObj = objTag == objectTag && !isHostObject(object),
        othIsObj = othTag == objectTag && !isHostObject(other),
        isSameTag = objTag == othTag;
    if (isSameTag && !objIsObj) {
      stack || (stack = new Stack);
      return (objIsArr || isTypedArray(object)) ? equalArrays(object, other, equalFunc, customizer, bitmask, stack) : equalByTag(object, other, objTag, equalFunc, customizer, bitmask, stack);
    }
    if (!(bitmask & PARTIAL_COMPARE_FLAG)) {
      var objIsWrapped = objIsObj && hasOwnProperty.call(object, '__wrapped__'),
          othIsWrapped = othIsObj && hasOwnProperty.call(other, '__wrapped__');
      if (objIsWrapped || othIsWrapped) {
        stack || (stack = new Stack);
        return equalFunc(objIsWrapped ? object.value() : object, othIsWrapped ? other.value() : other, customizer, bitmask, stack);
      }
    }
    if (!isSameTag) {
      return false;
    }
    stack || (stack = new Stack);
    return equalObjects(object, other, equalFunc, customizer, bitmask, stack);
  }
  module.exports = baseIsEqualDeep;
  return module.exports;
});

$__System.registerDynamic("67", ["9a", "52", "95"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var baseIsEqualDeep = $__require('9a'),
      isObject = $__require('52'),
      isObjectLike = $__require('95');
  function baseIsEqual(value, other, customizer, bitmask, stack) {
    if (value === other) {
      return true;
    }
    if (value == null || other == null || (!isObject(value) && !isObjectLike(other))) {
      return value !== value && other !== other;
    }
    return baseIsEqualDeep(value, other, baseIsEqual, customizer, bitmask, stack);
  }
  module.exports = baseIsEqual;
  return module.exports;
});

$__System.registerDynamic("9c", [], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  function baseHasIn(object, key) {
    return key in Object(object);
  }
  module.exports = baseHasIn;
  return module.exports;
});

$__System.registerDynamic("9d", [], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  function last(array) {
    var length = array ? array.length : 0;
    return length ? array[length - 1] : undefined;
  }
  module.exports = last;
  return module.exports;
});

$__System.registerDynamic("9e", [], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  function baseSlice(array, start, end) {
    var index = -1,
        length = array.length;
    if (start < 0) {
      start = -start > length ? 0 : (length + start);
    }
    end = end > length ? length : end;
    if (end < 0) {
      end += length;
    }
    length = start > end ? 0 : ((end - start) >>> 0);
    start >>>= 0;
    var result = Array(length);
    while (++index < length) {
      result[index] = array[index + start];
    }
    return result;
  }
  module.exports = baseSlice;
  return module.exports;
});

$__System.registerDynamic("9f", ["a0"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var baseGet = $__require('a0');
  function get(object, path, defaultValue) {
    var result = object == null ? undefined : baseGet(object, path);
    return result === undefined ? defaultValue : result;
  }
  module.exports = get;
  return module.exports;
});

$__System.registerDynamic("a1", ["9e", "9f"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var baseSlice = $__require('9e'),
      get = $__require('9f');
  function parent(object, path) {
    return path.length == 1 ? object : get(object, baseSlice(path, 0, -1));
  }
  module.exports = parent;
  return module.exports;
});

$__System.registerDynamic("a2", ["a3", "a4", "9b", "a5", "a6", "99", "a7", "9d", "a1"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var baseCastPath = $__require('a3'),
      isArguments = $__require('a4'),
      isArray = $__require('9b'),
      isIndex = $__require('a5'),
      isKey = $__require('a6'),
      isLength = $__require('99'),
      isString = $__require('a7'),
      last = $__require('9d'),
      parent = $__require('a1');
  function hasPath(object, path, hasFunc) {
    if (object == null) {
      return false;
    }
    var result = hasFunc(object, path);
    if (!result && !isKey(path)) {
      path = baseCastPath(path);
      object = parent(object, path);
      if (object != null) {
        path = last(path);
        result = hasFunc(object, path);
      }
    }
    var length = object ? object.length : undefined;
    return result || (!!length && isLength(length) && isIndex(path, length) && (isArray(object) || isString(object) || isArguments(object)));
  }
  module.exports = hasPath;
  return module.exports;
});

$__System.registerDynamic("a8", ["9c", "a2"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var baseHasIn = $__require('9c'),
      hasPath = $__require('a2');
  function hasIn(object, path) {
    return hasPath(object, path, baseHasIn);
  }
  module.exports = hasIn;
  return module.exports;
});

$__System.registerDynamic("a9", ["67", "9f", "a8"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var baseIsEqual = $__require('67'),
      get = $__require('9f'),
      hasIn = $__require('a8');
  var UNORDERED_COMPARE_FLAG = 1,
      PARTIAL_COMPARE_FLAG = 2;
  function baseMatchesProperty(path, srcValue) {
    return function(object) {
      var objValue = get(object, path);
      return (objValue === undefined && objValue === srcValue) ? hasIn(object, path) : baseIsEqual(srcValue, objValue, undefined, UNORDERED_COMPARE_FLAG | PARTIAL_COMPARE_FLAG);
    };
  }
  module.exports = baseMatchesProperty;
  return module.exports;
});

$__System.registerDynamic("aa", [], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  function identity(value) {
    return value;
  }
  module.exports = identity;
  return module.exports;
});

$__System.registerDynamic("ab", [], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  function checkGlobal(value) {
    return (value && value.Object === Object) ? value : null;
  }
  module.exports = checkGlobal;
  return module.exports;
});

$__System.registerDynamic("89", ["ab"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var checkGlobal = $__require('ab');
  var objectTypes = {
    'function': true,
    'object': true
  };
  var freeExports = (objectTypes[typeof exports] && exports && !exports.nodeType) ? exports : undefined;
  var freeModule = (objectTypes[typeof module] && module && !module.nodeType) ? module : undefined;
  var freeGlobal = checkGlobal(freeExports && freeModule && typeof global == 'object' && global);
  var freeSelf = checkGlobal(objectTypes[typeof self] && self);
  var freeWindow = checkGlobal(objectTypes[typeof window] && window);
  var thisGlobal = checkGlobal(objectTypes[typeof this] && this);
  var root = freeGlobal || ((freeWindow !== (thisGlobal && thisGlobal.window)) && freeWindow) || freeSelf || thisGlobal || Function('return this')();
  module.exports = root;
  return module.exports;
});

$__System.registerDynamic("8f", ["89"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var root = $__require('89');
  var Symbol = root.Symbol;
  module.exports = Symbol;
  return module.exports;
});

$__System.registerDynamic("ac", ["95"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var isObjectLike = $__require('95');
  var symbolTag = '[object Symbol]';
  var objectProto = Object.prototype;
  var objectToString = objectProto.toString;
  function isSymbol(value) {
    return typeof value == 'symbol' || (isObjectLike(value) && objectToString.call(value) == symbolTag);
  }
  module.exports = isSymbol;
  return module.exports;
});

$__System.registerDynamic("ad", ["8f", "ac", "20"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  (function(process) {
    var Symbol = $__require('8f'),
        isSymbol = $__require('ac');
    var INFINITY = 1 / 0;
    var symbolProto = Symbol ? Symbol.prototype : undefined,
        symbolToString = symbolProto ? symbolProto.toString : undefined;
    function toString(value) {
      if (typeof value == 'string') {
        return value;
      }
      if (value == null) {
        return '';
      }
      if (isSymbol(value)) {
        return symbolToString ? symbolToString.call(value) : '';
      }
      var result = (value + '');
      return (result == '0' && (1 / value) == -INFINITY) ? '-0' : result;
    }
    module.exports = toString;
  })($__require('20'));
  return module.exports;
});

$__System.registerDynamic("ae", ["ad"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var toString = $__require('ad');
  var rePropName = /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]/g;
  var reEscapeChar = /\\(\\)?/g;
  function stringToPath(string) {
    var result = [];
    toString(string).replace(rePropName, function(match, number, quote, string) {
      result.push(quote ? string.replace(reEscapeChar, '$1') : (number || match));
    });
    return result;
  }
  module.exports = stringToPath;
  return module.exports;
});

$__System.registerDynamic("a3", ["9b", "ae"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var isArray = $__require('9b'),
      stringToPath = $__require('ae');
  function baseCastPath(value) {
    return isArray(value) ? value : stringToPath(value);
  }
  module.exports = baseCastPath;
  return module.exports;
});

$__System.registerDynamic("a0", ["a3", "a6"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var baseCastPath = $__require('a3'),
      isKey = $__require('a6');
  function baseGet(object, path) {
    path = isKey(path, object) ? [path + ''] : baseCastPath(path);
    var index = 0,
        length = path.length;
    while (object != null && index < length) {
      object = object[path[index++]];
    }
    return (index && index == length) ? object : undefined;
  }
  module.exports = baseGet;
  return module.exports;
});

$__System.registerDynamic("af", ["a0"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var baseGet = $__require('a0');
  function basePropertyDeep(path) {
    return function(object) {
      return baseGet(object, path);
    };
  }
  module.exports = basePropertyDeep;
  return module.exports;
});

$__System.registerDynamic("a6", ["9b"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var isArray = $__require('9b');
  var reIsDeepProp = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/,
      reIsPlainProp = /^\w*$/;
  function isKey(value, object) {
    if (typeof value == 'number') {
      return true;
    }
    return !isArray(value) && (reIsPlainProp.test(value) || !reIsDeepProp.test(value) || (object != null && value in Object(object)));
  }
  module.exports = isKey;
  return module.exports;
});

$__System.registerDynamic("b0", ["b1", "af", "a6"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var baseProperty = $__require('b1'),
      basePropertyDeep = $__require('af'),
      isKey = $__require('a6');
  function property(path) {
    return isKey(path) ? baseProperty(path) : basePropertyDeep(path);
  }
  module.exports = property;
  return module.exports;
});

$__System.registerDynamic("b2", ["6d", "a9", "aa", "9b", "b0"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var baseMatches = $__require('6d'),
      baseMatchesProperty = $__require('a9'),
      identity = $__require('aa'),
      isArray = $__require('9b'),
      property = $__require('b0');
  function baseIteratee(value) {
    var type = typeof value;
    if (type == 'function') {
      return value;
    }
    if (value == null) {
      return identity;
    }
    if (type == 'object') {
      return isArray(value) ? baseMatchesProperty(value[0], value[1]) : baseMatches(value);
    }
    return property(value);
  }
  module.exports = baseIteratee;
  return module.exports;
});

$__System.registerDynamic("56", ["86", "5a", "a5", "52"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var eq = $__require('86'),
      isArrayLike = $__require('5a'),
      isIndex = $__require('a5'),
      isObject = $__require('52');
  function isIterateeCall(value, index, object) {
    if (!isObject(object)) {
      return false;
    }
    var type = typeof index;
    if (type == 'number' ? (isArrayLike(object) && isIndex(index, object.length)) : (type == 'string' && index in object)) {
      return eq(object[index], value);
    }
    return false;
  }
  module.exports = isIterateeCall;
  return module.exports;
});

$__System.registerDynamic("b3", ["5e", "64", "b2", "9b", "56"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var arrayEvery = $__require('5e'),
      baseEvery = $__require('64'),
      baseIteratee = $__require('b2'),
      isArray = $__require('9b'),
      isIterateeCall = $__require('56');
  function every(collection, predicate, guard) {
    var func = isArray(collection) ? arrayEvery : baseEvery;
    if (guard && isIterateeCall(collection, predicate, guard)) {
      predicate = undefined;
    }
    return func(collection, baseIteratee(predicate, 3));
  }
  module.exports = every;
  return module.exports;
});

$__System.registerDynamic("b4", ["a4", "9b", "5a", "51", "a7"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var isArguments = $__require('a4'),
      isArray = $__require('9b'),
      isArrayLike = $__require('5a'),
      isFunction = $__require('51'),
      isString = $__require('a7');
  var objectProto = Object.prototype;
  var hasOwnProperty = objectProto.hasOwnProperty;
  function isEmpty(value) {
    if (isArrayLike(value) && (isArray(value) || isString(value) || isFunction(value.splice) || isArguments(value))) {
      return !value.length;
    }
    for (var key in value) {
      if (hasOwnProperty.call(value, key)) {
        return false;
      }
    }
    return true;
  }
  module.exports = isEmpty;
  return module.exports;
});

$__System.registerDynamic("b5", ["b7", "52", "b6"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  (function() {
    var XMLDeclaration,
        XMLNode,
        create,
        isObject,
        extend = function(child, parent) {
          for (var key in parent) {
            if (hasProp.call(parent, key))
              child[key] = parent[key];
          }
          function ctor() {
            this.constructor = child;
          }
          ctor.prototype = parent.prototype;
          child.prototype = new ctor();
          child.__super__ = parent.prototype;
          return child;
        },
        hasProp = {}.hasOwnProperty;
    create = $__require('b7');
    isObject = $__require('52');
    XMLNode = $__require('b6');
    module.exports = XMLDeclaration = (function(superClass) {
      extend(XMLDeclaration, superClass);
      function XMLDeclaration(parent, version, encoding, standalone) {
        var ref;
        XMLDeclaration.__super__.constructor.call(this, parent);
        if (isObject(version)) {
          ref = version, version = ref.version, encoding = ref.encoding, standalone = ref.standalone;
        }
        if (!version) {
          version = '1.0';
        }
        this.version = this.stringify.xmlVersion(version);
        if (encoding != null) {
          this.encoding = this.stringify.xmlEncoding(encoding);
        }
        if (standalone != null) {
          this.standalone = this.stringify.xmlStandalone(standalone);
        }
      }
      XMLDeclaration.prototype.toString = function(options, level) {
        var indent,
            newline,
            offset,
            pretty,
            r,
            ref,
            ref1,
            ref2,
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
        r += '<?xml';
        r += ' version="' + this.version + '"';
        if (this.encoding != null) {
          r += ' encoding="' + this.encoding + '"';
        }
        if (this.standalone != null) {
          r += ' standalone="' + this.standalone + '"';
        }
        r += '?>';
        if (pretty) {
          r += newline;
        }
        return r;
      };
      return XMLDeclaration;
    })(XMLNode);
  }).call(this);
  return module.exports;
});

$__System.registerDynamic("b8", ["b7", "b6"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  (function() {
    var XMLCData,
        XMLNode,
        create,
        extend = function(child, parent) {
          for (var key in parent) {
            if (hasProp.call(parent, key))
              child[key] = parent[key];
          }
          function ctor() {
            this.constructor = child;
          }
          ctor.prototype = parent.prototype;
          child.prototype = new ctor();
          child.__super__ = parent.prototype;
          return child;
        },
        hasProp = {}.hasOwnProperty;
    create = $__require('b7');
    XMLNode = $__require('b6');
    module.exports = XMLCData = (function(superClass) {
      extend(XMLCData, superClass);
      function XMLCData(parent, text) {
        XMLCData.__super__.constructor.call(this, parent);
        if (text == null) {
          throw new Error("Missing CDATA text");
        }
        this.text = this.stringify.cdata(text);
      }
      XMLCData.prototype.clone = function() {
        return create(XMLCData.prototype, this);
      };
      XMLCData.prototype.toString = function(options, level) {
        var indent,
            newline,
            offset,
            pretty,
            r,
            ref,
            ref1,
            ref2,
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
        r += '<![CDATA[' + this.text + ']]>';
        if (pretty) {
          r += newline;
        }
        return r;
      };
      return XMLCData;
    })(XMLNode);
  }).call(this);
  return module.exports;
});

$__System.registerDynamic("b9", ["b7", "b6"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  (function() {
    var XMLComment,
        XMLNode,
        create,
        extend = function(child, parent) {
          for (var key in parent) {
            if (hasProp.call(parent, key))
              child[key] = parent[key];
          }
          function ctor() {
            this.constructor = child;
          }
          ctor.prototype = parent.prototype;
          child.prototype = new ctor();
          child.__super__ = parent.prototype;
          return child;
        },
        hasProp = {}.hasOwnProperty;
    create = $__require('b7');
    XMLNode = $__require('b6');
    module.exports = XMLComment = (function(superClass) {
      extend(XMLComment, superClass);
      function XMLComment(parent, text) {
        XMLComment.__super__.constructor.call(this, parent);
        if (text == null) {
          throw new Error("Missing comment text");
        }
        this.text = this.stringify.comment(text);
      }
      XMLComment.prototype.clone = function() {
        return create(XMLComment.prototype, this);
      };
      XMLComment.prototype.toString = function(options, level) {
        var indent,
            newline,
            offset,
            pretty,
            r,
            ref,
            ref1,
            ref2,
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
        r += '<!-- ' + this.text + ' -->';
        if (pretty) {
          r += newline;
        }
        return r;
      };
      return XMLComment;
    })(XMLNode);
  }).call(this);
  return module.exports;
});

$__System.registerDynamic("ba", ["b7"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  (function() {
    var XMLDTDAttList,
        create;
    create = $__require('b7');
    module.exports = XMLDTDAttList = (function() {
      function XMLDTDAttList(parent, elementName, attributeName, attributeType, defaultValueType, defaultValue) {
        this.stringify = parent.stringify;
        if (elementName == null) {
          throw new Error("Missing DTD element name");
        }
        if (attributeName == null) {
          throw new Error("Missing DTD attribute name");
        }
        if (!attributeType) {
          throw new Error("Missing DTD attribute type");
        }
        if (!defaultValueType) {
          throw new Error("Missing DTD attribute default");
        }
        if (defaultValueType.indexOf('#') !== 0) {
          defaultValueType = '#' + defaultValueType;
        }
        if (!defaultValueType.match(/^(#REQUIRED|#IMPLIED|#FIXED|#DEFAULT)$/)) {
          throw new Error("Invalid default value type; expected: #REQUIRED, #IMPLIED, #FIXED or #DEFAULT");
        }
        if (defaultValue && !defaultValueType.match(/^(#FIXED|#DEFAULT)$/)) {
          throw new Error("Default value only applies to #FIXED or #DEFAULT");
        }
        this.elementName = this.stringify.eleName(elementName);
        this.attributeName = this.stringify.attName(attributeName);
        this.attributeType = this.stringify.dtdAttType(attributeType);
        this.defaultValue = this.stringify.dtdAttDefault(defaultValue);
        this.defaultValueType = defaultValueType;
      }
      XMLDTDAttList.prototype.toString = function(options, level) {
        var indent,
            newline,
            offset,
            pretty,
            r,
            ref,
            ref1,
            ref2,
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
        r += '<!ATTLIST ' + this.elementName + ' ' + this.attributeName + ' ' + this.attributeType;
        if (this.defaultValueType !== '#DEFAULT') {
          r += ' ' + this.defaultValueType;
        }
        if (this.defaultValue) {
          r += ' "' + this.defaultValue + '"';
        }
        r += '>';
        if (pretty) {
          r += newline;
        }
        return r;
      };
      return XMLDTDAttList;
    })();
  }).call(this);
  return module.exports;
});

$__System.registerDynamic("bb", ["b7", "52"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  (function() {
    var XMLDTDEntity,
        create,
        isObject;
    create = $__require('b7');
    isObject = $__require('52');
    module.exports = XMLDTDEntity = (function() {
      function XMLDTDEntity(parent, pe, name, value) {
        this.stringify = parent.stringify;
        if (name == null) {
          throw new Error("Missing entity name");
        }
        if (value == null) {
          throw new Error("Missing entity value");
        }
        this.pe = !!pe;
        this.name = this.stringify.eleName(name);
        if (!isObject(value)) {
          this.value = this.stringify.dtdEntityValue(value);
        } else {
          if (!value.pubID && !value.sysID) {
            throw new Error("Public and/or system identifiers are required for an external entity");
          }
          if (value.pubID && !value.sysID) {
            throw new Error("System identifier is required for a public external entity");
          }
          if (value.pubID != null) {
            this.pubID = this.stringify.dtdPubID(value.pubID);
          }
          if (value.sysID != null) {
            this.sysID = this.stringify.dtdSysID(value.sysID);
          }
          if (value.nData != null) {
            this.nData = this.stringify.dtdNData(value.nData);
          }
          if (this.pe && this.nData) {
            throw new Error("Notation declaration is not allowed in a parameter entity");
          }
        }
      }
      XMLDTDEntity.prototype.toString = function(options, level) {
        var indent,
            newline,
            offset,
            pretty,
            r,
            ref,
            ref1,
            ref2,
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
        r += '<!ENTITY';
        if (this.pe) {
          r += ' %';
        }
        r += ' ' + this.name;
        if (this.value) {
          r += ' "' + this.value + '"';
        } else {
          if (this.pubID && this.sysID) {
            r += ' PUBLIC "' + this.pubID + '" "' + this.sysID + '"';
          } else if (this.sysID) {
            r += ' SYSTEM "' + this.sysID + '"';
          }
          if (this.nData) {
            r += ' NDATA ' + this.nData;
          }
        }
        r += '>';
        if (pretty) {
          r += newline;
        }
        return r;
      };
      return XMLDTDEntity;
    })();
  }).call(this);
  return module.exports;
});

$__System.registerDynamic("bc", ["b7"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  (function() {
    var XMLDTDElement,
        create;
    create = $__require('b7');
    module.exports = XMLDTDElement = (function() {
      function XMLDTDElement(parent, name, value) {
        this.stringify = parent.stringify;
        if (name == null) {
          throw new Error("Missing DTD element name");
        }
        if (!value) {
          value = '(#PCDATA)';
        }
        if (Array.isArray(value)) {
          value = '(' + value.join(',') + ')';
        }
        this.name = this.stringify.eleName(name);
        this.value = this.stringify.dtdElementValue(value);
      }
      XMLDTDElement.prototype.toString = function(options, level) {
        var indent,
            newline,
            offset,
            pretty,
            r,
            ref,
            ref1,
            ref2,
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
        r += '<!ELEMENT ' + this.name + ' ' + this.value + '>';
        if (pretty) {
          r += newline;
        }
        return r;
      };
      return XMLDTDElement;
    })();
  }).call(this);
  return module.exports;
});

$__System.registerDynamic("bd", ["b7"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  (function() {
    var XMLDTDNotation,
        create;
    create = $__require('b7');
    module.exports = XMLDTDNotation = (function() {
      function XMLDTDNotation(parent, name, value) {
        this.stringify = parent.stringify;
        if (name == null) {
          throw new Error("Missing notation name");
        }
        if (!value.pubID && !value.sysID) {
          throw new Error("Public or system identifiers are required for an external entity");
        }
        this.name = this.stringify.eleName(name);
        if (value.pubID != null) {
          this.pubID = this.stringify.dtdPubID(value.pubID);
        }
        if (value.sysID != null) {
          this.sysID = this.stringify.dtdSysID(value.sysID);
        }
      }
      XMLDTDNotation.prototype.toString = function(options, level) {
        var indent,
            newline,
            offset,
            pretty,
            r,
            ref,
            ref1,
            ref2,
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
        r += '<!NOTATION ' + this.name;
        if (this.pubID && this.sysID) {
          r += ' PUBLIC "' + this.pubID + '" "' + this.sysID + '"';
        } else if (this.pubID) {
          r += ' PUBLIC "' + this.pubID + '"';
        } else if (this.sysID) {
          r += ' SYSTEM "' + this.sysID + '"';
        }
        r += '>';
        if (pretty) {
          r += newline;
        }
        return r;
      };
      return XMLDTDNotation;
    })();
  }).call(this);
  return module.exports;
});

$__System.registerDynamic("be", ["b7", "52", "b8", "b9", "ba", "bb", "bc", "bd", "bf"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
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
    create = $__require('b7');
    isObject = $__require('52');
    XMLCData = $__require('b8');
    XMLComment = $__require('b9');
    XMLDTDAttList = $__require('ba');
    XMLDTDEntity = $__require('bb');
    XMLDTDElement = $__require('bc');
    XMLDTDNotation = $__require('bd');
    XMLProcessingInstruction = $__require('bf');
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
  return module.exports;
});

$__System.registerDynamic("c0", ["b7", "b6"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  (function() {
    var XMLNode,
        XMLRaw,
        create,
        extend = function(child, parent) {
          for (var key in parent) {
            if (hasProp.call(parent, key))
              child[key] = parent[key];
          }
          function ctor() {
            this.constructor = child;
          }
          ctor.prototype = parent.prototype;
          child.prototype = new ctor();
          child.__super__ = parent.prototype;
          return child;
        },
        hasProp = {}.hasOwnProperty;
    create = $__require('b7');
    XMLNode = $__require('b6');
    module.exports = XMLRaw = (function(superClass) {
      extend(XMLRaw, superClass);
      function XMLRaw(parent, text) {
        XMLRaw.__super__.constructor.call(this, parent);
        if (text == null) {
          throw new Error("Missing raw text");
        }
        this.value = this.stringify.raw(text);
      }
      XMLRaw.prototype.clone = function() {
        return create(XMLRaw.prototype, this);
      };
      XMLRaw.prototype.toString = function(options, level) {
        var indent,
            newline,
            offset,
            pretty,
            r,
            ref,
            ref1,
            ref2,
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
        r += this.value;
        if (pretty) {
          r += newline;
        }
        return r;
      };
      return XMLRaw;
    })(XMLNode);
  }).call(this);
  return module.exports;
});

$__System.registerDynamic("c1", ["b7", "b6"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  (function() {
    var XMLNode,
        XMLText,
        create,
        extend = function(child, parent) {
          for (var key in parent) {
            if (hasProp.call(parent, key))
              child[key] = parent[key];
          }
          function ctor() {
            this.constructor = child;
          }
          ctor.prototype = parent.prototype;
          child.prototype = new ctor();
          child.__super__ = parent.prototype;
          return child;
        },
        hasProp = {}.hasOwnProperty;
    create = $__require('b7');
    XMLNode = $__require('b6');
    module.exports = XMLText = (function(superClass) {
      extend(XMLText, superClass);
      function XMLText(parent, text) {
        XMLText.__super__.constructor.call(this, parent);
        if (text == null) {
          throw new Error("Missing element text");
        }
        this.value = this.stringify.eleText(text);
      }
      XMLText.prototype.clone = function() {
        return create(XMLText.prototype, this);
      };
      XMLText.prototype.toString = function(options, level) {
        var indent,
            newline,
            offset,
            pretty,
            r,
            ref,
            ref1,
            ref2,
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
        r += this.value;
        if (pretty) {
          r += newline;
        }
        return r;
      };
      return XMLText;
    })(XMLNode);
  }).call(this);
  return module.exports;
});

$__System.registerDynamic("b6", ["52", "51", "b4", "c2", "b8", "b9", "b5", "be", "c0", "c1"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  (function() {
    var XMLCData,
        XMLComment,
        XMLDeclaration,
        XMLDocType,
        XMLElement,
        XMLNode,
        XMLRaw,
        XMLText,
        isEmpty,
        isFunction,
        isObject,
        hasProp = {}.hasOwnProperty;
    isObject = $__require('52');
    isFunction = $__require('51');
    isEmpty = $__require('b4');
    XMLElement = null;
    XMLCData = null;
    XMLComment = null;
    XMLDeclaration = null;
    XMLDocType = null;
    XMLRaw = null;
    XMLText = null;
    module.exports = XMLNode = (function() {
      function XMLNode(parent) {
        this.parent = parent;
        this.options = this.parent.options;
        this.stringify = this.parent.stringify;
        if (XMLElement === null) {
          XMLElement = $__require('c2');
          XMLCData = $__require('b8');
          XMLComment = $__require('b9');
          XMLDeclaration = $__require('b5');
          XMLDocType = $__require('be');
          XMLRaw = $__require('c0');
          XMLText = $__require('c1');
        }
      }
      XMLNode.prototype.element = function(name, attributes, text) {
        var childNode,
            item,
            j,
            k,
            key,
            lastChild,
            len,
            len1,
            ref,
            val;
        lastChild = null;
        if (attributes == null) {
          attributes = {};
        }
        attributes = attributes.valueOf();
        if (!isObject(attributes)) {
          ref = [attributes, text], text = ref[0], attributes = ref[1];
        }
        if (name != null) {
          name = name.valueOf();
        }
        if (Array.isArray(name)) {
          for (j = 0, len = name.length; j < len; j++) {
            item = name[j];
            lastChild = this.element(item);
          }
        } else if (isFunction(name)) {
          lastChild = this.element(name.apply());
        } else if (isObject(name)) {
          for (key in name) {
            if (!hasProp.call(name, key))
              continue;
            val = name[key];
            if (isFunction(val)) {
              val = val.apply();
            }
            if ((isObject(val)) && (isEmpty(val))) {
              val = null;
            }
            if (!this.options.ignoreDecorators && this.stringify.convertAttKey && key.indexOf(this.stringify.convertAttKey) === 0) {
              lastChild = this.attribute(key.substr(this.stringify.convertAttKey.length), val);
            } else if (!this.options.ignoreDecorators && this.stringify.convertPIKey && key.indexOf(this.stringify.convertPIKey) === 0) {
              lastChild = this.instruction(key.substr(this.stringify.convertPIKey.length), val);
            } else if (!this.options.separateArrayItems && Array.isArray(val)) {
              for (k = 0, len1 = val.length; k < len1; k++) {
                item = val[k];
                childNode = {};
                childNode[key] = item;
                lastChild = this.element(childNode);
              }
            } else if (isObject(val)) {
              lastChild = this.element(key);
              lastChild.element(val);
            } else {
              lastChild = this.element(key, val);
            }
          }
        } else {
          if (!this.options.ignoreDecorators && this.stringify.convertTextKey && name.indexOf(this.stringify.convertTextKey) === 0) {
            lastChild = this.text(text);
          } else if (!this.options.ignoreDecorators && this.stringify.convertCDataKey && name.indexOf(this.stringify.convertCDataKey) === 0) {
            lastChild = this.cdata(text);
          } else if (!this.options.ignoreDecorators && this.stringify.convertCommentKey && name.indexOf(this.stringify.convertCommentKey) === 0) {
            lastChild = this.comment(text);
          } else if (!this.options.ignoreDecorators && this.stringify.convertRawKey && name.indexOf(this.stringify.convertRawKey) === 0) {
            lastChild = this.raw(text);
          } else {
            lastChild = this.node(name, attributes, text);
          }
        }
        if (lastChild == null) {
          throw new Error("Could not create any elements with: " + name);
        }
        return lastChild;
      };
      XMLNode.prototype.insertBefore = function(name, attributes, text) {
        var child,
            i,
            removed;
        if (this.isRoot) {
          throw new Error("Cannot insert elements at root level");
        }
        i = this.parent.children.indexOf(this);
        removed = this.parent.children.splice(i);
        child = this.parent.element(name, attributes, text);
        Array.prototype.push.apply(this.parent.children, removed);
        return child;
      };
      XMLNode.prototype.insertAfter = function(name, attributes, text) {
        var child,
            i,
            removed;
        if (this.isRoot) {
          throw new Error("Cannot insert elements at root level");
        }
        i = this.parent.children.indexOf(this);
        removed = this.parent.children.splice(i + 1);
        child = this.parent.element(name, attributes, text);
        Array.prototype.push.apply(this.parent.children, removed);
        return child;
      };
      XMLNode.prototype.remove = function() {
        var i,
            ref;
        if (this.isRoot) {
          throw new Error("Cannot remove the root element");
        }
        i = this.parent.children.indexOf(this);
        [].splice.apply(this.parent.children, [i, i - i + 1].concat(ref = [])), ref;
        return this.parent;
      };
      XMLNode.prototype.node = function(name, attributes, text) {
        var child,
            ref;
        if (name != null) {
          name = name.valueOf();
        }
        if (attributes == null) {
          attributes = {};
        }
        attributes = attributes.valueOf();
        if (!isObject(attributes)) {
          ref = [attributes, text], text = ref[0], attributes = ref[1];
        }
        child = new XMLElement(this, name, attributes);
        if (text != null) {
          child.text(text);
        }
        this.children.push(child);
        return child;
      };
      XMLNode.prototype.text = function(value) {
        var child;
        child = new XMLText(this, value);
        this.children.push(child);
        return this;
      };
      XMLNode.prototype.cdata = function(value) {
        var child;
        child = new XMLCData(this, value);
        this.children.push(child);
        return this;
      };
      XMLNode.prototype.comment = function(value) {
        var child;
        child = new XMLComment(this, value);
        this.children.push(child);
        return this;
      };
      XMLNode.prototype.raw = function(value) {
        var child;
        child = new XMLRaw(this, value);
        this.children.push(child);
        return this;
      };
      XMLNode.prototype.declaration = function(version, encoding, standalone) {
        var doc,
            xmldec;
        doc = this.document();
        xmldec = new XMLDeclaration(doc, version, encoding, standalone);
        doc.xmldec = xmldec;
        return doc.root();
      };
      XMLNode.prototype.doctype = function(pubID, sysID) {
        var doc,
            doctype;
        doc = this.document();
        doctype = new XMLDocType(doc, pubID, sysID);
        doc.doctype = doctype;
        return doctype;
      };
      XMLNode.prototype.up = function() {
        if (this.isRoot) {
          throw new Error("The root node has no parent. Use doc() if you need to get the document object.");
        }
        return this.parent;
      };
      XMLNode.prototype.root = function() {
        var child;
        if (this.isRoot) {
          return this;
        }
        child = this.parent;
        while (!child.isRoot) {
          child = child.parent;
        }
        return child;
      };
      XMLNode.prototype.document = function() {
        return this.root().documentObject;
      };
      XMLNode.prototype.end = function(options) {
        return this.document().toString(options);
      };
      XMLNode.prototype.prev = function() {
        var i;
        if (this.isRoot) {
          throw new Error("Root node has no siblings");
        }
        i = this.parent.children.indexOf(this);
        if (i < 1) {
          throw new Error("Already at the first node");
        }
        return this.parent.children[i - 1];
      };
      XMLNode.prototype.next = function() {
        var i;
        if (this.isRoot) {
          throw new Error("Root node has no siblings");
        }
        i = this.parent.children.indexOf(this);
        if (i === -1 || i === this.parent.children.length - 1) {
          throw new Error("Already at the last node");
        }
        return this.parent.children[i + 1];
      };
      XMLNode.prototype.importXMLBuilder = function(xmlbuilder) {
        var clonedRoot;
        clonedRoot = xmlbuilder.root().clone();
        clonedRoot.parent = this;
        clonedRoot.isRoot = false;
        this.children.push(clonedRoot);
        return this;
      };
      XMLNode.prototype.ele = function(name, attributes, text) {
        return this.element(name, attributes, text);
      };
      XMLNode.prototype.nod = function(name, attributes, text) {
        return this.node(name, attributes, text);
      };
      XMLNode.prototype.txt = function(value) {
        return this.text(value);
      };
      XMLNode.prototype.dat = function(value) {
        return this.cdata(value);
      };
      XMLNode.prototype.com = function(value) {
        return this.comment(value);
      };
      XMLNode.prototype.doc = function() {
        return this.document();
      };
      XMLNode.prototype.dec = function(version, encoding, standalone) {
        return this.declaration(version, encoding, standalone);
      };
      XMLNode.prototype.dtd = function(pubID, sysID) {
        return this.doctype(pubID, sysID);
      };
      XMLNode.prototype.e = function(name, attributes, text) {
        return this.element(name, attributes, text);
      };
      XMLNode.prototype.n = function(name, attributes, text) {
        return this.node(name, attributes, text);
      };
      XMLNode.prototype.t = function(value) {
        return this.text(value);
      };
      XMLNode.prototype.d = function(value) {
        return this.cdata(value);
      };
      XMLNode.prototype.c = function(value) {
        return this.comment(value);
      };
      XMLNode.prototype.r = function(value) {
        return this.raw(value);
      };
      XMLNode.prototype.u = function() {
        return this.up();
      };
      return XMLNode;
    })();
  }).call(this);
  return module.exports;
});

$__System.registerDynamic("c3", ["b7"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  (function() {
    var XMLAttribute,
        create;
    create = $__require('b7');
    module.exports = XMLAttribute = (function() {
      function XMLAttribute(parent, name, value) {
        this.stringify = parent.stringify;
        if (name == null) {
          throw new Error("Missing attribute name of element " + parent.name);
        }
        if (value == null) {
          throw new Error("Missing attribute value for attribute " + name + " of element " + parent.name);
        }
        this.name = this.stringify.attName(name);
        this.value = this.stringify.attValue(value);
      }
      XMLAttribute.prototype.clone = function() {
        return create(XMLAttribute.prototype, this);
      };
      XMLAttribute.prototype.toString = function(options, level) {
        return ' ' + this.name + '="' + this.value + '"';
      };
      return XMLAttribute;
    })();
  }).call(this);
  return module.exports;
});

$__System.registerDynamic("86", [], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  function eq(value, other) {
    return value === other || (value !== value && other !== other);
  }
  module.exports = eq;
  return module.exports;
});

$__System.registerDynamic("58", ["86"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var eq = $__require('86');
  var objectProto = Object.prototype;
  var hasOwnProperty = objectProto.hasOwnProperty;
  function assignValue(object, key, value) {
    var objValue = object[key];
    if (!(hasOwnProperty.call(object, key) && eq(objValue, value)) || (value === undefined && !(key in object))) {
      object[key] = value;
    }
  }
  module.exports = assignValue;
  return module.exports;
});

$__System.registerDynamic("c4", ["58"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var assignValue = $__require('58');
  function copyObjectWith(source, props, object, customizer) {
    object || (object = {});
    var index = -1,
        length = props.length;
    while (++index < length) {
      var key = props[index];
      var newValue = customizer ? customizer(object[key], source[key], key, object, source) : source[key];
      assignValue(object, key, newValue);
    }
    return object;
  }
  module.exports = copyObjectWith;
  return module.exports;
});

$__System.registerDynamic("59", ["c4"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var copyObjectWith = $__require('c4');
  function copyObject(source, props, object) {
    return copyObjectWith(source, props, object);
  }
  module.exports = copyObject;
  return module.exports;
});

$__System.registerDynamic("91", [], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var objectProto = Object.prototype;
  var hasOwnProperty = objectProto.hasOwnProperty;
  var getPrototypeOf = Object.getPrototypeOf;
  function baseHas(object, key) {
    return hasOwnProperty.call(object, key) || (typeof object == 'object' && key in object && getPrototypeOf(object) === null);
  }
  module.exports = baseHas;
  return module.exports;
});

$__System.registerDynamic("c5", [], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var nativeKeys = Object.keys;
  function baseKeys(object) {
    return nativeKeys(Object(object));
  }
  module.exports = baseKeys;
  return module.exports;
});

$__System.registerDynamic("c6", [], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  function baseTimes(n, iteratee) {
    var index = -1,
        result = Array(n);
    while (++index < n) {
      result[index] = iteratee(index);
    }
    return result;
  }
  module.exports = baseTimes;
  return module.exports;
});

$__System.registerDynamic("c7", ["5a", "95"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var isArrayLike = $__require('5a'),
      isObjectLike = $__require('95');
  function isArrayLikeObject(value) {
    return isObjectLike(value) && isArrayLike(value);
  }
  module.exports = isArrayLikeObject;
  return module.exports;
});

$__System.registerDynamic("a4", ["c7"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var isArrayLikeObject = $__require('c7');
  var argsTag = '[object Arguments]';
  var objectProto = Object.prototype;
  var hasOwnProperty = objectProto.hasOwnProperty;
  var objectToString = objectProto.toString;
  var propertyIsEnumerable = objectProto.propertyIsEnumerable;
  function isArguments(value) {
    return isArrayLikeObject(value) && hasOwnProperty.call(value, 'callee') && (!propertyIsEnumerable.call(value, 'callee') || objectToString.call(value) == argsTag);
  }
  module.exports = isArguments;
  return module.exports;
});

$__System.registerDynamic("9b", [], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var isArray = Array.isArray;
  module.exports = isArray;
  return module.exports;
});

$__System.registerDynamic("95", [], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  function isObjectLike(value) {
    return !!value && typeof value == 'object';
  }
  module.exports = isObjectLike;
  return module.exports;
});

$__System.registerDynamic("a7", ["9b", "95"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var isArray = $__require('9b'),
      isObjectLike = $__require('95');
  var stringTag = '[object String]';
  var objectProto = Object.prototype;
  var objectToString = objectProto.toString;
  function isString(value) {
    return typeof value == 'string' || (!isArray(value) && isObjectLike(value) && objectToString.call(value) == stringTag);
  }
  module.exports = isString;
  return module.exports;
});

$__System.registerDynamic("c8", ["c6", "a4", "9b", "99", "a7"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var baseTimes = $__require('c6'),
      isArguments = $__require('a4'),
      isArray = $__require('9b'),
      isLength = $__require('99'),
      isString = $__require('a7');
  function indexKeys(object) {
    var length = object ? object.length : undefined;
    if (isLength(length) && (isArray(object) || isString(object) || isArguments(object))) {
      return baseTimes(length, String);
    }
    return null;
  }
  module.exports = indexKeys;
  return module.exports;
});

$__System.registerDynamic("b1", [], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  function baseProperty(key) {
    return function(object) {
      return object == null ? undefined : object[key];
    };
  }
  module.exports = baseProperty;
  return module.exports;
});

$__System.registerDynamic("c9", ["b1"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var baseProperty = $__require('b1');
  var getLength = baseProperty('length');
  module.exports = getLength;
  return module.exports;
});

$__System.registerDynamic("51", ["52"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var isObject = $__require('52');
  var funcTag = '[object Function]',
      genTag = '[object GeneratorFunction]';
  var objectProto = Object.prototype;
  var objectToString = objectProto.toString;
  function isFunction(value) {
    var tag = isObject(value) ? objectToString.call(value) : '';
    return tag == funcTag || tag == genTag;
  }
  module.exports = isFunction;
  return module.exports;
});

$__System.registerDynamic("99", [], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var MAX_SAFE_INTEGER = 9007199254740991;
  function isLength(value) {
    return typeof value == 'number' && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
  }
  module.exports = isLength;
  return module.exports;
});

$__System.registerDynamic("5a", ["c9", "51", "99"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var getLength = $__require('c9'),
      isFunction = $__require('51'),
      isLength = $__require('99');
  function isArrayLike(value) {
    return value != null && isLength(getLength(value)) && !isFunction(value);
  }
  module.exports = isArrayLike;
  return module.exports;
});

$__System.registerDynamic("a5", [], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var MAX_SAFE_INTEGER = 9007199254740991;
  var reIsUint = /^(?:0|[1-9]\d*)$/;
  function isIndex(value, length) {
    value = (typeof value == 'number' || reIsUint.test(value)) ? +value : -1;
    length = length == null ? MAX_SAFE_INTEGER : length;
    return value > -1 && value % 1 == 0 && value < length;
  }
  module.exports = isIndex;
  return module.exports;
});

$__System.registerDynamic("5b", [], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var objectProto = Object.prototype;
  function isPrototype(value) {
    var Ctor = value && value.constructor,
        proto = (typeof Ctor == 'function' && Ctor.prototype) || objectProto;
    return value === proto;
  }
  module.exports = isPrototype;
  return module.exports;
});

$__System.registerDynamic("5c", ["91", "c5", "c8", "5a", "a5", "5b"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var baseHas = $__require('91'),
      baseKeys = $__require('c5'),
      indexKeys = $__require('c8'),
      isArrayLike = $__require('5a'),
      isIndex = $__require('a5'),
      isPrototype = $__require('5b');
  function keys(object) {
    var isProto = isPrototype(object);
    if (!(isProto || isArrayLike(object))) {
      return baseKeys(object);
    }
    var indexes = indexKeys(object),
        skipIndexes = !!indexes,
        result = indexes || [],
        length = result.length;
    for (var key in object) {
      if (baseHas(object, key) && !(skipIndexes && (key == 'length' || isIndex(key, length))) && !(isProto && key == 'constructor')) {
        result.push(key);
      }
    }
    return result;
  }
  module.exports = keys;
  return module.exports;
});

$__System.registerDynamic("ca", ["59", "5c"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var copyObject = $__require('59'),
      keys = $__require('5c');
  function baseAssign(object, source) {
    return object && copyObject(source, keys(source), object);
  }
  module.exports = baseAssign;
  return module.exports;
});

$__System.registerDynamic("52", [], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  function isObject(value) {
    var type = typeof value;
    return !!value && (type == 'object' || type == 'function');
  }
  module.exports = isObject;
  return module.exports;
});

$__System.registerDynamic("cb", ["52"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var isObject = $__require('52');
  var objectCreate = Object.create;
  function baseCreate(proto) {
    return isObject(proto) ? objectCreate(proto) : {};
  }
  module.exports = baseCreate;
  return module.exports;
});

$__System.registerDynamic("b7", ["ca", "cb"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var baseAssign = $__require('ca'),
      baseCreate = $__require('cb');
  function create(prototype, properties) {
    var result = baseCreate(prototype);
    return properties ? baseAssign(result, properties) : result;
  }
  module.exports = create;
  return module.exports;
});

$__System.registerDynamic("bf", ["b7"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  (function() {
    var XMLProcessingInstruction,
        create;
    create = $__require('b7');
    module.exports = XMLProcessingInstruction = (function() {
      function XMLProcessingInstruction(parent, target, value) {
        this.stringify = parent.stringify;
        if (target == null) {
          throw new Error("Missing instruction target");
        }
        this.target = this.stringify.insTarget(target);
        if (value) {
          this.value = this.stringify.insValue(value);
        }
      }
      XMLProcessingInstruction.prototype.clone = function() {
        return create(XMLProcessingInstruction.prototype, this);
      };
      XMLProcessingInstruction.prototype.toString = function(options, level) {
        var indent,
            newline,
            offset,
            pretty,
            r,
            ref,
            ref1,
            ref2,
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
        r += '<?';
        r += this.target;
        if (this.value) {
          r += ' ' + this.value;
        }
        r += '?>';
        if (pretty) {
          r += newline;
        }
        return r;
      };
      return XMLProcessingInstruction;
    })();
  }).call(this);
  return module.exports;
});

$__System.registerDynamic("c2", ["b7", "52", "51", "b3", "b6", "c3", "bf"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  (function() {
    var XMLAttribute,
        XMLElement,
        XMLNode,
        XMLProcessingInstruction,
        create,
        every,
        isFunction,
        isObject,
        extend = function(child, parent) {
          for (var key in parent) {
            if (hasProp.call(parent, key))
              child[key] = parent[key];
          }
          function ctor() {
            this.constructor = child;
          }
          ctor.prototype = parent.prototype;
          child.prototype = new ctor();
          child.__super__ = parent.prototype;
          return child;
        },
        hasProp = {}.hasOwnProperty;
    create = $__require('b7');
    isObject = $__require('52');
    isFunction = $__require('51');
    every = $__require('b3');
    XMLNode = $__require('b6');
    XMLAttribute = $__require('c3');
    XMLProcessingInstruction = $__require('bf');
    module.exports = XMLElement = (function(superClass) {
      extend(XMLElement, superClass);
      function XMLElement(parent, name, attributes) {
        XMLElement.__super__.constructor.call(this, parent);
        if (name == null) {
          throw new Error("Missing element name");
        }
        this.name = this.stringify.eleName(name);
        this.children = [];
        this.instructions = [];
        this.attributes = {};
        if (attributes != null) {
          this.attribute(attributes);
        }
      }
      XMLElement.prototype.clone = function() {
        var att,
            attName,
            clonedSelf,
            i,
            len,
            pi,
            ref,
            ref1;
        clonedSelf = create(XMLElement.prototype, this);
        if (clonedSelf.isRoot) {
          clonedSelf.documentObject = null;
        }
        clonedSelf.attributes = {};
        ref = this.attributes;
        for (attName in ref) {
          if (!hasProp.call(ref, attName))
            continue;
          att = ref[attName];
          clonedSelf.attributes[attName] = att.clone();
        }
        clonedSelf.instructions = [];
        ref1 = this.instructions;
        for (i = 0, len = ref1.length; i < len; i++) {
          pi = ref1[i];
          clonedSelf.instructions.push(pi.clone());
        }
        clonedSelf.children = [];
        this.children.forEach(function(child) {
          var clonedChild;
          clonedChild = child.clone();
          clonedChild.parent = clonedSelf;
          return clonedSelf.children.push(clonedChild);
        });
        return clonedSelf;
      };
      XMLElement.prototype.attribute = function(name, value) {
        var attName,
            attValue;
        if (name != null) {
          name = name.valueOf();
        }
        if (isObject(name)) {
          for (attName in name) {
            if (!hasProp.call(name, attName))
              continue;
            attValue = name[attName];
            this.attribute(attName, attValue);
          }
        } else {
          if (isFunction(value)) {
            value = value.apply();
          }
          if (!this.options.skipNullAttributes || (value != null)) {
            this.attributes[name] = new XMLAttribute(this, name, value);
          }
        }
        return this;
      };
      XMLElement.prototype.removeAttribute = function(name) {
        var attName,
            i,
            len;
        if (name == null) {
          throw new Error("Missing attribute name");
        }
        name = name.valueOf();
        if (Array.isArray(name)) {
          for (i = 0, len = name.length; i < len; i++) {
            attName = name[i];
            delete this.attributes[attName];
          }
        } else {
          delete this.attributes[name];
        }
        return this;
      };
      XMLElement.prototype.instruction = function(target, value) {
        var i,
            insTarget,
            insValue,
            instruction,
            len;
        if (target != null) {
          target = target.valueOf();
        }
        if (value != null) {
          value = value.valueOf();
        }
        if (Array.isArray(target)) {
          for (i = 0, len = target.length; i < len; i++) {
            insTarget = target[i];
            this.instruction(insTarget);
          }
        } else if (isObject(target)) {
          for (insTarget in target) {
            if (!hasProp.call(target, insTarget))
              continue;
            insValue = target[insTarget];
            this.instruction(insTarget, insValue);
          }
        } else {
          if (isFunction(value)) {
            value = value.apply();
          }
          instruction = new XMLProcessingInstruction(this, target, value);
          this.instructions.push(instruction);
        }
        return this;
      };
      XMLElement.prototype.toString = function(options, level) {
        var att,
            child,
            i,
            indent,
            instruction,
            j,
            len,
            len1,
            name,
            newline,
            offset,
            pretty,
            r,
            ref,
            ref1,
            ref2,
            ref3,
            ref4,
            ref5,
            space;
        pretty = (options != null ? options.pretty : void 0) || false;
        indent = (ref = options != null ? options.indent : void 0) != null ? ref : '  ';
        offset = (ref1 = options != null ? options.offset : void 0) != null ? ref1 : 0;
        newline = (ref2 = options != null ? options.newline : void 0) != null ? ref2 : '\n';
        level || (level = 0);
        space = new Array(level + offset + 1).join(indent);
        r = '';
        ref3 = this.instructions;
        for (i = 0, len = ref3.length; i < len; i++) {
          instruction = ref3[i];
          r += instruction.toString(options, level);
        }
        if (pretty) {
          r += space;
        }
        r += '<' + this.name;
        ref4 = this.attributes;
        for (name in ref4) {
          if (!hasProp.call(ref4, name))
            continue;
          att = ref4[name];
          r += att.toString(options);
        }
        if (this.children.length === 0 || every(this.children, function(e) {
          return e.value === '';
        })) {
          r += '/>';
          if (pretty) {
            r += newline;
          }
        } else if (pretty && this.children.length === 1 && (this.children[0].value != null)) {
          r += '>';
          r += this.children[0].value;
          r += '</' + this.name + '>';
          r += newline;
        } else {
          r += '>';
          if (pretty) {
            r += newline;
          }
          ref5 = this.children;
          for (j = 0, len1 = ref5.length; j < len1; j++) {
            child = ref5[j];
            r += child.toString(options, level + 1);
          }
          if (pretty) {
            r += space;
          }
          r += '</' + this.name + '>';
          if (pretty) {
            r += newline;
          }
        }
        return r;
      };
      XMLElement.prototype.att = function(name, value) {
        return this.attribute(name, value);
      };
      XMLElement.prototype.ins = function(target, value) {
        return this.instruction(target, value);
      };
      XMLElement.prototype.a = function(name, value) {
        return this.attribute(name, value);
      };
      XMLElement.prototype.i = function(target, value) {
        return this.instruction(target, value);
      };
      return XMLElement;
    })(XMLNode);
  }).call(this);
  return module.exports;
});

$__System.registerDynamic("cc", ["5d", "b5", "be", "c2"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  (function() {
    var XMLBuilder,
        XMLDeclaration,
        XMLDocType,
        XMLElement,
        XMLStringifier;
    XMLStringifier = $__require('5d');
    XMLDeclaration = $__require('b5');
    XMLDocType = $__require('be');
    XMLElement = $__require('c2');
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
  return module.exports;
});

$__System.registerDynamic("cd", ["57", "cc"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  (function() {
    var XMLBuilder,
        assign;
    assign = $__require('57');
    XMLBuilder = $__require('cc');
    module.exports.create = function(name, xmldec, doctype, options) {
      options = assign({}, xmldec, doctype, options);
      return new XMLBuilder(name, options).root();
    };
  }).call(this);
  return module.exports;
});

$__System.registerDynamic("ce", ["cd"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = $__require('cd');
  return module.exports;
});

$__System.registerDynamic("cf", ["d0"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  (function() {
    "use strict";
    var xml2js;
    xml2js = $__require('d0');
    exports.stripBOM = function(str) {
      if (str[0] === '\uFEFF') {
        return str.substring(1);
      } else {
        return str;
      }
    };
  }).call(this);
  return module.exports;
});

$__System.registerDynamic("d1", [], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  (function() {
    "use strict";
    var prefixMatch;
    prefixMatch = new RegExp(/(?!xmlns)^.*:/);
    exports.normalize = function(str) {
      return str.toLowerCase();
    };
    exports.firstCharLowerCase = function(str) {
      return str.charAt(0).toLowerCase() + str.slice(1);
    };
    exports.stripPrefix = function(str) {
      return str.replace(prefixMatch, '');
    };
    exports.parseNumbers = function(str) {
      if (!isNaN(str)) {
        str = str % 1 === 0 ? parseInt(str, 10) : parseFloat(str);
      }
      return str;
    };
    exports.parseBooleans = function(str) {
      if (/^(?:true|false)$/i.test(str)) {
        str = str.toLowerCase() === 'true';
      }
      return str;
    };
  }).call(this);
  return module.exports;
});

$__System.registerDynamic("d2", ["d4", "d3"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  (function(process) {
    var nextTick = $__require('d4').nextTick;
    var apply = Function.prototype.apply;
    var slice = Array.prototype.slice;
    var immediateIds = {};
    var nextImmediateId = 0;
    exports.setTimeout = function() {
      return new Timeout(apply.call(setTimeout, window, arguments), clearTimeout);
    };
    exports.setInterval = function() {
      return new Timeout(apply.call(setInterval, window, arguments), clearInterval);
    };
    exports.clearTimeout = exports.clearInterval = function(timeout) {
      timeout.close();
    };
    function Timeout(id, clearFn) {
      this._id = id;
      this._clearFn = clearFn;
    }
    Timeout.prototype.unref = Timeout.prototype.ref = function() {};
    Timeout.prototype.close = function() {
      this._clearFn.call(window, this._id);
    };
    exports.enroll = function(item, msecs) {
      clearTimeout(item._idleTimeoutId);
      item._idleTimeout = msecs;
    };
    exports.unenroll = function(item) {
      clearTimeout(item._idleTimeoutId);
      item._idleTimeout = -1;
    };
    exports._unrefActive = exports._active = function(item) {
      clearTimeout(item._idleTimeoutId);
      var msecs = item._idleTimeout;
      if (msecs >= 0) {
        item._idleTimeoutId = setTimeout(function onTimeout() {
          if (item._onTimeout)
            item._onTimeout();
        }, msecs);
      }
    };
    exports.setImmediate = typeof setImmediate === "function" ? setImmediate : function(fn) {
      var id = nextImmediateId++;
      var args = arguments.length < 2 ? false : slice.call(arguments, 1);
      immediateIds[id] = true;
      nextTick(function onNextTick() {
        if (immediateIds[id]) {
          if (args) {
            fn.apply(null, args);
          } else {
            fn.call(null);
          }
          exports.clearImmediate(id);
        }
      });
      return id;
    };
    exports.clearImmediate = typeof clearImmediate === "function" ? clearImmediate : function(id) {
      delete immediateIds[id];
    };
  })($__require('d3'));
  return module.exports;
});

$__System.registerDynamic("d5", ["d2"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = $__require('d2');
  return module.exports;
});

$__System.registerDynamic("d6", ["d5"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = $__System._nodeRequire ? $__System._nodeRequire('timers') : $__require('d5');
  return module.exports;
});

$__System.registerDynamic("d7", ["d6"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = $__require('d6');
  return module.exports;
});

$__System.registerDynamic("d0", ["4b", "3d", "ce", "cf", "d1", "d7", "20"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  (function(process) {
    (function() {
      "use strict";
      var bom,
          builder,
          escapeCDATA,
          events,
          isEmpty,
          processName,
          processors,
          requiresCDATA,
          sax,
          setImmediate,
          wrapCDATA,
          extend = function(child, parent) {
            for (var key in parent) {
              if (hasProp.call(parent, key))
                child[key] = parent[key];
            }
            function ctor() {
              this.constructor = child;
            }
            ctor.prototype = parent.prototype;
            child.prototype = new ctor();
            child.__super__ = parent.prototype;
            return child;
          },
          hasProp = {}.hasOwnProperty,
          bind = function(fn, me) {
            return function() {
              return fn.apply(me, arguments);
            };
          };
      sax = $__require('4b');
      events = $__require('3d');
      builder = $__require('ce');
      bom = $__require('cf');
      processors = $__require('d1');
      setImmediate = $__require('d7').setImmediate;
      isEmpty = function(thing) {
        return typeof thing === "object" && (thing != null) && Object.keys(thing).length === 0;
      };
      processName = function(processors, processedName) {
        var i,
            len,
            process;
        for (i = 0, len = processors.length; i < len; i++) {
          process = processors[i];
          processedName = process(processedName);
        }
        return processedName;
      };
      requiresCDATA = function(entry) {
        return entry.indexOf('&') >= 0 || entry.indexOf('>') >= 0 || entry.indexOf('<') >= 0;
      };
      wrapCDATA = function(entry) {
        return "<![CDATA[" + (escapeCDATA(entry)) + "]]>";
      };
      escapeCDATA = function(entry) {
        return entry.replace(']]>', ']]]]><![CDATA[>');
      };
      exports.processors = processors;
      exports.defaults = {
        "0.1": {
          explicitCharkey: false,
          trim: true,
          normalize: true,
          normalizeTags: false,
          attrkey: "@",
          charkey: "#",
          explicitArray: false,
          ignoreAttrs: false,
          mergeAttrs: false,
          explicitRoot: false,
          validator: null,
          xmlns: false,
          explicitChildren: false,
          childkey: '@@',
          charsAsChildren: false,
          async: false,
          strict: true,
          attrNameProcessors: null,
          attrValueProcessors: null,
          tagNameProcessors: null,
          valueProcessors: null,
          emptyTag: ''
        },
        "0.2": {
          explicitCharkey: false,
          trim: false,
          normalize: false,
          normalizeTags: false,
          attrkey: "$",
          charkey: "_",
          explicitArray: true,
          ignoreAttrs: false,
          mergeAttrs: false,
          explicitRoot: true,
          validator: null,
          xmlns: false,
          explicitChildren: false,
          preserveChildrenOrder: false,
          childkey: '$$',
          charsAsChildren: false,
          async: false,
          strict: true,
          attrNameProcessors: null,
          attrValueProcessors: null,
          tagNameProcessors: null,
          valueProcessors: null,
          rootName: 'root',
          xmldec: {
            'version': '1.0',
            'encoding': 'UTF-8',
            'standalone': true
          },
          doctype: null,
          renderOpts: {
            'pretty': true,
            'indent': '  ',
            'newline': '\n'
          },
          headless: false,
          chunkSize: 10000,
          emptyTag: '',
          cdata: false
        }
      };
      exports.ValidationError = (function(superClass) {
        extend(ValidationError, superClass);
        function ValidationError(message) {
          this.message = message;
        }
        return ValidationError;
      })(Error);
      exports.Builder = (function() {
        function Builder(opts) {
          var key,
              ref,
              value;
          this.options = {};
          ref = exports.defaults["0.2"];
          for (key in ref) {
            if (!hasProp.call(ref, key))
              continue;
            value = ref[key];
            this.options[key] = value;
          }
          for (key in opts) {
            if (!hasProp.call(opts, key))
              continue;
            value = opts[key];
            this.options[key] = value;
          }
        }
        Builder.prototype.buildObject = function(rootObj) {
          var attrkey,
              charkey,
              render,
              rootElement,
              rootName;
          attrkey = this.options.attrkey;
          charkey = this.options.charkey;
          if ((Object.keys(rootObj).length === 1) && (this.options.rootName === exports.defaults['0.2'].rootName)) {
            rootName = Object.keys(rootObj)[0];
            rootObj = rootObj[rootName];
          } else {
            rootName = this.options.rootName;
          }
          render = (function(_this) {
            return function(element, obj) {
              var attr,
                  child,
                  entry,
                  index,
                  key,
                  value;
              if (typeof obj !== 'object') {
                if (_this.options.cdata && requiresCDATA(obj)) {
                  element.raw(wrapCDATA(obj));
                } else {
                  element.txt(obj);
                }
              } else {
                for (key in obj) {
                  if (!hasProp.call(obj, key))
                    continue;
                  child = obj[key];
                  if (key === attrkey) {
                    if (typeof child === "object") {
                      for (attr in child) {
                        value = child[attr];
                        element = element.att(attr, value);
                      }
                    }
                  } else if (key === charkey) {
                    if (_this.options.cdata && requiresCDATA(child)) {
                      element = element.raw(wrapCDATA(child));
                    } else {
                      element = element.txt(child);
                    }
                  } else if (Array.isArray(child)) {
                    for (index in child) {
                      if (!hasProp.call(child, index))
                        continue;
                      entry = child[index];
                      if (typeof entry === 'string') {
                        if (_this.options.cdata && requiresCDATA(entry)) {
                          element = element.ele(key).raw(wrapCDATA(entry)).up();
                        } else {
                          element = element.ele(key, entry).up();
                        }
                      } else {
                        element = render(element.ele(key), entry).up();
                      }
                    }
                  } else if (typeof child === "object") {
                    element = render(element.ele(key), child).up();
                  } else {
                    if (typeof child === 'string' && _this.options.cdata && requiresCDATA(child)) {
                      element = element.ele(key).raw(wrapCDATA(child)).up();
                    } else {
                      if (child == null) {
                        child = '';
                      }
                      element = element.ele(key, child.toString()).up();
                    }
                  }
                }
              }
              return element;
            };
          })(this);
          rootElement = builder.create(rootName, this.options.xmldec, this.options.doctype, {
            headless: this.options.headless,
            allowSurrogateChars: this.options.allowSurrogateChars
          });
          return render(rootElement, rootObj).end(this.options.renderOpts);
        };
        return Builder;
      })();
      exports.Parser = (function(superClass) {
        extend(Parser, superClass);
        function Parser(opts) {
          this.parseString = bind(this.parseString, this);
          this.reset = bind(this.reset, this);
          this.assignOrPush = bind(this.assignOrPush, this);
          this.processAsync = bind(this.processAsync, this);
          var key,
              ref,
              value;
          if (!(this instanceof exports.Parser)) {
            return new exports.Parser(opts);
          }
          this.options = {};
          ref = exports.defaults["0.2"];
          for (key in ref) {
            if (!hasProp.call(ref, key))
              continue;
            value = ref[key];
            this.options[key] = value;
          }
          for (key in opts) {
            if (!hasProp.call(opts, key))
              continue;
            value = opts[key];
            this.options[key] = value;
          }
          if (this.options.xmlns) {
            this.options.xmlnskey = this.options.attrkey + "ns";
          }
          if (this.options.normalizeTags) {
            if (!this.options.tagNameProcessors) {
              this.options.tagNameProcessors = [];
            }
            this.options.tagNameProcessors.unshift(processors.normalize);
          }
          this.reset();
        }
        Parser.prototype.processAsync = function() {
          var chunk,
              err,
              error1;
          try {
            if (this.remaining.length <= this.options.chunkSize) {
              chunk = this.remaining;
              this.remaining = '';
              this.saxParser = this.saxParser.write(chunk);
              return this.saxParser.close();
            } else {
              chunk = this.remaining.substr(0, this.options.chunkSize);
              this.remaining = this.remaining.substr(this.options.chunkSize, this.remaining.length);
              this.saxParser = this.saxParser.write(chunk);
              return setImmediate(this.processAsync);
            }
          } catch (error1) {
            err = error1;
            if (!this.saxParser.errThrown) {
              this.saxParser.errThrown = true;
              return this.emit(err);
            }
          }
        };
        Parser.prototype.assignOrPush = function(obj, key, newValue) {
          if (!(key in obj)) {
            if (!this.options.explicitArray) {
              return obj[key] = newValue;
            } else {
              return obj[key] = [newValue];
            }
          } else {
            if (!(obj[key] instanceof Array)) {
              obj[key] = [obj[key]];
            }
            return obj[key].push(newValue);
          }
        };
        Parser.prototype.reset = function() {
          var attrkey,
              charkey,
              ontext,
              stack;
          this.removeAllListeners();
          this.saxParser = sax.parser(this.options.strict, {
            trim: false,
            normalize: false,
            xmlns: this.options.xmlns
          });
          this.saxParser.errThrown = false;
          this.saxParser.onerror = (function(_this) {
            return function(error) {
              _this.saxParser.resume();
              if (!_this.saxParser.errThrown) {
                _this.saxParser.errThrown = true;
                return _this.emit("error", error);
              }
            };
          })(this);
          this.saxParser.onend = (function(_this) {
            return function() {
              if (!_this.saxParser.ended) {
                _this.saxParser.ended = true;
                return _this.emit("end", _this.resultObject);
              }
            };
          })(this);
          this.saxParser.ended = false;
          this.EXPLICIT_CHARKEY = this.options.explicitCharkey;
          this.resultObject = null;
          stack = [];
          attrkey = this.options.attrkey;
          charkey = this.options.charkey;
          this.saxParser.onopentag = (function(_this) {
            return function(node) {
              var key,
                  newValue,
                  obj,
                  processedKey,
                  ref;
              obj = {};
              obj[charkey] = "";
              if (!_this.options.ignoreAttrs) {
                ref = node.attributes;
                for (key in ref) {
                  if (!hasProp.call(ref, key))
                    continue;
                  if (!(attrkey in obj) && !_this.options.mergeAttrs) {
                    obj[attrkey] = {};
                  }
                  newValue = _this.options.attrValueProcessors ? processName(_this.options.attrValueProcessors, node.attributes[key]) : node.attributes[key];
                  processedKey = _this.options.attrNameProcessors ? processName(_this.options.attrNameProcessors, key) : key;
                  if (_this.options.mergeAttrs) {
                    _this.assignOrPush(obj, processedKey, newValue);
                  } else {
                    obj[attrkey][processedKey] = newValue;
                  }
                }
              }
              obj["#name"] = _this.options.tagNameProcessors ? processName(_this.options.tagNameProcessors, node.name) : node.name;
              if (_this.options.xmlns) {
                obj[_this.options.xmlnskey] = {
                  uri: node.uri,
                  local: node.local
                };
              }
              return stack.push(obj);
            };
          })(this);
          this.saxParser.onclosetag = (function(_this) {
            return function() {
              var cdata,
                  emptyStr,
                  err,
                  error1,
                  key,
                  node,
                  nodeName,
                  obj,
                  objClone,
                  old,
                  s,
                  xpath;
              obj = stack.pop();
              nodeName = obj["#name"];
              if (!_this.options.explicitChildren || !_this.options.preserveChildrenOrder) {
                delete obj["#name"];
              }
              if (obj.cdata === true) {
                cdata = obj.cdata;
                delete obj.cdata;
              }
              s = stack[stack.length - 1];
              if (obj[charkey].match(/^\s*$/) && !cdata) {
                emptyStr = obj[charkey];
                delete obj[charkey];
              } else {
                if (_this.options.trim) {
                  obj[charkey] = obj[charkey].trim();
                }
                if (_this.options.normalize) {
                  obj[charkey] = obj[charkey].replace(/\s{2,}/g, " ").trim();
                }
                obj[charkey] = _this.options.valueProcessors ? processName(_this.options.valueProcessors, obj[charkey]) : obj[charkey];
                if (Object.keys(obj).length === 1 && charkey in obj && !_this.EXPLICIT_CHARKEY) {
                  obj = obj[charkey];
                }
              }
              if (isEmpty(obj)) {
                obj = _this.options.emptyTag !== '' ? _this.options.emptyTag : emptyStr;
              }
              if (_this.options.validator != null) {
                xpath = "/" + ((function() {
                  var i,
                      len,
                      results;
                  results = [];
                  for (i = 0, len = stack.length; i < len; i++) {
                    node = stack[i];
                    results.push(node["#name"]);
                  }
                  return results;
                })()).concat(nodeName).join("/");
                try {
                  obj = _this.options.validator(xpath, s && s[nodeName], obj);
                } catch (error1) {
                  err = error1;
                  _this.emit("error", err);
                }
              }
              if (_this.options.explicitChildren && !_this.options.mergeAttrs && typeof obj === 'object') {
                if (!_this.options.preserveChildrenOrder) {
                  node = {};
                  if (_this.options.attrkey in obj) {
                    node[_this.options.attrkey] = obj[_this.options.attrkey];
                    delete obj[_this.options.attrkey];
                  }
                  if (!_this.options.charsAsChildren && _this.options.charkey in obj) {
                    node[_this.options.charkey] = obj[_this.options.charkey];
                    delete obj[_this.options.charkey];
                  }
                  if (Object.getOwnPropertyNames(obj).length > 0) {
                    node[_this.options.childkey] = obj;
                  }
                  obj = node;
                } else if (s) {
                  s[_this.options.childkey] = s[_this.options.childkey] || [];
                  objClone = {};
                  for (key in obj) {
                    if (!hasProp.call(obj, key))
                      continue;
                    objClone[key] = obj[key];
                  }
                  s[_this.options.childkey].push(objClone);
                  delete obj["#name"];
                  if (Object.keys(obj).length === 1 && charkey in obj && !_this.EXPLICIT_CHARKEY) {
                    obj = obj[charkey];
                  }
                }
              }
              if (stack.length > 0) {
                return _this.assignOrPush(s, nodeName, obj);
              } else {
                if (_this.options.explicitRoot) {
                  old = obj;
                  obj = {};
                  obj[nodeName] = old;
                }
                _this.resultObject = obj;
                _this.saxParser.ended = true;
                return _this.emit("end", _this.resultObject);
              }
            };
          })(this);
          ontext = (function(_this) {
            return function(text) {
              var charChild,
                  s;
              s = stack[stack.length - 1];
              if (s) {
                s[charkey] += text;
                if (_this.options.explicitChildren && _this.options.preserveChildrenOrder && _this.options.charsAsChildren && text.replace(/\\n/g, '').trim() !== '') {
                  s[_this.options.childkey] = s[_this.options.childkey] || [];
                  charChild = {'#name': '__text__'};
                  charChild[charkey] = text;
                  s[_this.options.childkey].push(charChild);
                }
                return s;
              }
            };
          })(this);
          this.saxParser.ontext = ontext;
          return this.saxParser.oncdata = (function(_this) {
            return function(text) {
              var s;
              s = ontext(text);
              if (s) {
                return s.cdata = true;
              }
            };
          })(this);
        };
        Parser.prototype.parseString = function(str, cb) {
          var err,
              error1;
          if ((cb != null) && typeof cb === "function") {
            this.on("end", function(result) {
              this.reset();
              return cb(null, result);
            });
            this.on("error", function(err) {
              this.reset();
              return cb(err);
            });
          }
          try {
            str = str.toString();
            if (str.trim() === '') {
              this.emit("end", null);
              return true;
            }
            str = bom.stripBOM(str);
            if (this.options.async) {
              this.remaining = str;
              setImmediate(this.processAsync);
              return this.saxParser;
            }
            return this.saxParser.write(str).close();
          } catch (error1) {
            err = error1;
            if (!(this.saxParser.errThrown || this.saxParser.ended)) {
              this.emit('error', err);
              return this.saxParser.errThrown = true;
            } else if (this.saxParser.ended) {
              throw err;
            }
          }
        };
        return Parser;
      })(events.EventEmitter);
      exports.parseString = function(str, a, b) {
        var cb,
            options,
            parser;
        if (b != null) {
          if (typeof b === 'function') {
            cb = b;
          }
          if (typeof a === 'object') {
            options = a;
          }
        } else {
          if (typeof a === 'function') {
            cb = a;
          }
          options = {};
        }
        parser = new exports.Parser(options);
        return parser.parseString(str, cb);
      };
    }).call(this);
  })($__require('20'));
  return module.exports;
});

$__System.registerDynamic("d8", ["d0"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = $__require('d0');
  return module.exports;
});

$__System.registerDynamic("d9", ["4", "da"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var toIObject = $__require('4');
  $__require('da')('getOwnPropertyDescriptor', function($getOwnPropertyDescriptor) {
    return function getOwnPropertyDescriptor(it, key) {
      return $getOwnPropertyDescriptor(toIObject(it), key);
    };
  });
  return module.exports;
});

$__System.registerDynamic("db", ["3", "d9"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var $ = $__require('3');
  $__require('d9');
  module.exports = function getOwnPropertyDescriptor(it, key) {
    return $.getDesc(it, key);
  };
  return module.exports;
});

$__System.registerDynamic("27", ["db"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = {
    "default": $__require('db'),
    __esModule: true
  };
  return module.exports;
});

$__System.registerDynamic("13", ["4", "3"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var toIObject = $__require('4'),
      getNames = $__require('3').getNames,
      toString = {}.toString;
  var windowNames = typeof window == 'object' && Object.getOwnPropertyNames ? Object.getOwnPropertyNames(window) : [];
  var getWindowNames = function(it) {
    try {
      return getNames(it);
    } catch (e) {
      return windowNames.slice();
    }
  };
  module.exports.get = function getOwnPropertyNames(it) {
    if (windowNames && toString.call(it) == '[object Window]')
      return getWindowNames(it);
    return getNames(toIObject(it));
  };
  return module.exports;
});

$__System.registerDynamic("dc", ["da", "13"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  $__require('da')('getOwnPropertyNames', function() {
    return $__require('13').get;
  });
  return module.exports;
});

$__System.registerDynamic("dd", ["3", "dc"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var $ = $__require('3');
  $__require('dc');
  module.exports = function getOwnPropertyNames(it) {
    return $.getNames(it);
  };
  return module.exports;
});

$__System.registerDynamic("de", ["dd"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = {
    "default": $__require('dd'),
    __esModule: true
  };
  return module.exports;
});

$__System.registerDynamic("df", ["e0"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var defined = $__require('e0');
  module.exports = function(it) {
    return Object(defined(it));
  };
  return module.exports;
});

$__System.registerDynamic("da", ["c", "19", "e"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var $export = $__require('c'),
      core = $__require('19'),
      fails = $__require('e');
  module.exports = function(KEY, exec) {
    var fn = (core.Object || {})[KEY] || Object[KEY],
        exp = {};
    exp[KEY] = exec(fn);
    $export($export.S + $export.F * fails(function() {
      fn(1);
    }), 'Object', exp);
  };
  return module.exports;
});

$__System.registerDynamic("e1", ["df", "da"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var toObject = $__require('df');
  $__require('da')('keys', function($keys) {
    return function keys(it) {
      return $keys(toObject(it));
    };
  });
  return module.exports;
});

$__System.registerDynamic("e2", ["e1", "19"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  $__require('e1');
  module.exports = $__require('19').Object.keys;
  return module.exports;
});

$__System.registerDynamic("e3", ["e2"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = {
    "default": $__require('e2'),
    __esModule: true
  };
  return module.exports;
});

$__System.registerDynamic("e4", [], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  ;
  (function(exports) {
    'use strict';
    var Arr = (typeof Uint8Array !== 'undefined') ? Uint8Array : Array;
    var PLUS = '+'.charCodeAt(0);
    var SLASH = '/'.charCodeAt(0);
    var NUMBER = '0'.charCodeAt(0);
    var LOWER = 'a'.charCodeAt(0);
    var UPPER = 'A'.charCodeAt(0);
    var PLUS_URL_SAFE = '-'.charCodeAt(0);
    var SLASH_URL_SAFE = '_'.charCodeAt(0);
    function decode(elt) {
      var code = elt.charCodeAt(0);
      if (code === PLUS || code === PLUS_URL_SAFE)
        return 62;
      if (code === SLASH || code === SLASH_URL_SAFE)
        return 63;
      if (code < NUMBER)
        return -1;
      if (code < NUMBER + 10)
        return code - NUMBER + 26 + 26;
      if (code < UPPER + 26)
        return code - UPPER;
      if (code < LOWER + 26)
        return code - LOWER + 26;
    }
    function b64ToByteArray(b64) {
      var i,
          j,
          l,
          tmp,
          placeHolders,
          arr;
      if (b64.length % 4 > 0) {
        throw new Error('Invalid string. Length must be a multiple of 4');
      }
      var len = b64.length;
      placeHolders = '=' === b64.charAt(len - 2) ? 2 : '=' === b64.charAt(len - 1) ? 1 : 0;
      arr = new Arr(b64.length * 3 / 4 - placeHolders);
      l = placeHolders > 0 ? b64.length - 4 : b64.length;
      var L = 0;
      function push(v) {
        arr[L++] = v;
      }
      for (i = 0, j = 0; i < l; i += 4, j += 3) {
        tmp = (decode(b64.charAt(i)) << 18) | (decode(b64.charAt(i + 1)) << 12) | (decode(b64.charAt(i + 2)) << 6) | decode(b64.charAt(i + 3));
        push((tmp & 0xFF0000) >> 16);
        push((tmp & 0xFF00) >> 8);
        push(tmp & 0xFF);
      }
      if (placeHolders === 2) {
        tmp = (decode(b64.charAt(i)) << 2) | (decode(b64.charAt(i + 1)) >> 4);
        push(tmp & 0xFF);
      } else if (placeHolders === 1) {
        tmp = (decode(b64.charAt(i)) << 10) | (decode(b64.charAt(i + 1)) << 4) | (decode(b64.charAt(i + 2)) >> 2);
        push((tmp >> 8) & 0xFF);
        push(tmp & 0xFF);
      }
      return arr;
    }
    function uint8ToBase64(uint8) {
      var i,
          extraBytes = uint8.length % 3,
          output = "",
          temp,
          length;
      function encode(num) {
        return lookup.charAt(num);
      }
      function tripletToBase64(num) {
        return encode(num >> 18 & 0x3F) + encode(num >> 12 & 0x3F) + encode(num >> 6 & 0x3F) + encode(num & 0x3F);
      }
      for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
        temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2]);
        output += tripletToBase64(temp);
      }
      switch (extraBytes) {
        case 1:
          temp = uint8[uint8.length - 1];
          output += encode(temp >> 2);
          output += encode((temp << 4) & 0x3F);
          output += '==';
          break;
        case 2:
          temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1]);
          output += encode(temp >> 10);
          output += encode((temp >> 4) & 0x3F);
          output += encode((temp << 2) & 0x3F);
          output += '=';
          break;
      }
      return output;
    }
    exports.toByteArray = b64ToByteArray;
    exports.fromByteArray = uint8ToBase64;
  }(typeof exports === 'undefined' ? (this.base64js = {}) : exports));
  return module.exports;
});

$__System.registerDynamic("e5", ["e4"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = $__require('e4');
  return module.exports;
});

$__System.registerDynamic("e6", [], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  exports.read = function(buffer, offset, isLE, mLen, nBytes) {
    var e,
        m;
    var eLen = nBytes * 8 - mLen - 1;
    var eMax = (1 << eLen) - 1;
    var eBias = eMax >> 1;
    var nBits = -7;
    var i = isLE ? (nBytes - 1) : 0;
    var d = isLE ? -1 : 1;
    var s = buffer[offset + i];
    i += d;
    e = s & ((1 << (-nBits)) - 1);
    s >>= (-nBits);
    nBits += eLen;
    for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}
    m = e & ((1 << (-nBits)) - 1);
    e >>= (-nBits);
    nBits += mLen;
    for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}
    if (e === 0) {
      e = 1 - eBias;
    } else if (e === eMax) {
      return m ? NaN : ((s ? -1 : 1) * Infinity);
    } else {
      m = m + Math.pow(2, mLen);
      e = e - eBias;
    }
    return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
  };
  exports.write = function(buffer, value, offset, isLE, mLen, nBytes) {
    var e,
        m,
        c;
    var eLen = nBytes * 8 - mLen - 1;
    var eMax = (1 << eLen) - 1;
    var eBias = eMax >> 1;
    var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0);
    var i = isLE ? 0 : (nBytes - 1);
    var d = isLE ? 1 : -1;
    var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;
    value = Math.abs(value);
    if (isNaN(value) || value === Infinity) {
      m = isNaN(value) ? 1 : 0;
      e = eMax;
    } else {
      e = Math.floor(Math.log(value) / Math.LN2);
      if (value * (c = Math.pow(2, -e)) < 1) {
        e--;
        c *= 2;
      }
      if (e + eBias >= 1) {
        value += rt / c;
      } else {
        value += rt * Math.pow(2, 1 - eBias);
      }
      if (value * c >= 2) {
        e++;
        c /= 2;
      }
      if (e + eBias >= eMax) {
        m = 0;
        e = eMax;
      } else if (e + eBias >= 1) {
        m = (value * c - 1) * Math.pow(2, mLen);
        e = e + eBias;
      } else {
        m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
        e = 0;
      }
    }
    for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}
    e = (e << mLen) | m;
    eLen += mLen;
    for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}
    buffer[offset + i - d] |= s * 128;
  };
  return module.exports;
});

$__System.registerDynamic("e7", ["e6"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = $__require('e6');
  return module.exports;
});

$__System.registerDynamic("e8", [], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var toString = {}.toString;
  module.exports = Array.isArray || function(arr) {
    return toString.call(arr) == '[object Array]';
  };
  return module.exports;
});

$__System.registerDynamic("e9", ["e8"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = $__require('e8');
  return module.exports;
});

$__System.registerDynamic("ea", ["e5", "e7", "e9"], true, function($__require, exports, module) {
  "use strict";
  ;
  var define,
      global = this,
      GLOBAL = this;
  var base64 = $__require('e5');
  var ieee754 = $__require('e7');
  var isArray = $__require('e9');
  exports.Buffer = Buffer;
  exports.SlowBuffer = SlowBuffer;
  exports.INSPECT_MAX_BYTES = 50;
  Buffer.poolSize = 8192;
  var rootParent = {};
  Buffer.TYPED_ARRAY_SUPPORT = global.TYPED_ARRAY_SUPPORT !== undefined ? global.TYPED_ARRAY_SUPPORT : typedArraySupport();
  function typedArraySupport() {
    function Bar() {}
    try {
      var arr = new Uint8Array(1);
      arr.foo = function() {
        return 42;
      };
      arr.constructor = Bar;
      return arr.foo() === 42 && arr.constructor === Bar && typeof arr.subarray === 'function' && arr.subarray(1, 1).byteLength === 0;
    } catch (e) {
      return false;
    }
  }
  function kMaxLength() {
    return Buffer.TYPED_ARRAY_SUPPORT ? 0x7fffffff : 0x3fffffff;
  }
  function Buffer(arg) {
    if (!(this instanceof Buffer)) {
      if (arguments.length > 1)
        return new Buffer(arg, arguments[1]);
      return new Buffer(arg);
    }
    if (!Buffer.TYPED_ARRAY_SUPPORT) {
      this.length = 0;
      this.parent = undefined;
    }
    if (typeof arg === 'number') {
      return fromNumber(this, arg);
    }
    if (typeof arg === 'string') {
      return fromString(this, arg, arguments.length > 1 ? arguments[1] : 'utf8');
    }
    return fromObject(this, arg);
  }
  function fromNumber(that, length) {
    that = allocate(that, length < 0 ? 0 : checked(length) | 0);
    if (!Buffer.TYPED_ARRAY_SUPPORT) {
      for (var i = 0; i < length; i++) {
        that[i] = 0;
      }
    }
    return that;
  }
  function fromString(that, string, encoding) {
    if (typeof encoding !== 'string' || encoding === '')
      encoding = 'utf8';
    var length = byteLength(string, encoding) | 0;
    that = allocate(that, length);
    that.write(string, encoding);
    return that;
  }
  function fromObject(that, object) {
    if (Buffer.isBuffer(object))
      return fromBuffer(that, object);
    if (isArray(object))
      return fromArray(that, object);
    if (object == null) {
      throw new TypeError('must start with number, buffer, array or string');
    }
    if (typeof ArrayBuffer !== 'undefined') {
      if (object.buffer instanceof ArrayBuffer) {
        return fromTypedArray(that, object);
      }
      if (object instanceof ArrayBuffer) {
        return fromArrayBuffer(that, object);
      }
    }
    if (object.length)
      return fromArrayLike(that, object);
    return fromJsonObject(that, object);
  }
  function fromBuffer(that, buffer) {
    var length = checked(buffer.length) | 0;
    that = allocate(that, length);
    buffer.copy(that, 0, 0, length);
    return that;
  }
  function fromArray(that, array) {
    var length = checked(array.length) | 0;
    that = allocate(that, length);
    for (var i = 0; i < length; i += 1) {
      that[i] = array[i] & 255;
    }
    return that;
  }
  function fromTypedArray(that, array) {
    var length = checked(array.length) | 0;
    that = allocate(that, length);
    for (var i = 0; i < length; i += 1) {
      that[i] = array[i] & 255;
    }
    return that;
  }
  function fromArrayBuffer(that, array) {
    if (Buffer.TYPED_ARRAY_SUPPORT) {
      array.byteLength;
      that = Buffer._augment(new Uint8Array(array));
    } else {
      that = fromTypedArray(that, new Uint8Array(array));
    }
    return that;
  }
  function fromArrayLike(that, array) {
    var length = checked(array.length) | 0;
    that = allocate(that, length);
    for (var i = 0; i < length; i += 1) {
      that[i] = array[i] & 255;
    }
    return that;
  }
  function fromJsonObject(that, object) {
    var array;
    var length = 0;
    if (object.type === 'Buffer' && isArray(object.data)) {
      array = object.data;
      length = checked(array.length) | 0;
    }
    that = allocate(that, length);
    for (var i = 0; i < length; i += 1) {
      that[i] = array[i] & 255;
    }
    return that;
  }
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    Buffer.prototype.__proto__ = Uint8Array.prototype;
    Buffer.__proto__ = Uint8Array;
  } else {
    Buffer.prototype.length = undefined;
    Buffer.prototype.parent = undefined;
  }
  function allocate(that, length) {
    if (Buffer.TYPED_ARRAY_SUPPORT) {
      that = Buffer._augment(new Uint8Array(length));
      that.__proto__ = Buffer.prototype;
    } else {
      that.length = length;
      that._isBuffer = true;
    }
    var fromPool = length !== 0 && length <= Buffer.poolSize >>> 1;
    if (fromPool)
      that.parent = rootParent;
    return that;
  }
  function checked(length) {
    if (length >= kMaxLength()) {
      throw new RangeError('Attempt to allocate Buffer larger than maximum ' + 'size: 0x' + kMaxLength().toString(16) + ' bytes');
    }
    return length | 0;
  }
  function SlowBuffer(subject, encoding) {
    if (!(this instanceof SlowBuffer))
      return new SlowBuffer(subject, encoding);
    var buf = new Buffer(subject, encoding);
    delete buf.parent;
    return buf;
  }
  Buffer.isBuffer = function isBuffer(b) {
    return !!(b != null && b._isBuffer);
  };
  Buffer.compare = function compare(a, b) {
    if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
      throw new TypeError('Arguments must be Buffers');
    }
    if (a === b)
      return 0;
    var x = a.length;
    var y = b.length;
    var i = 0;
    var len = Math.min(x, y);
    while (i < len) {
      if (a[i] !== b[i])
        break;
      ++i;
    }
    if (i !== len) {
      x = a[i];
      y = b[i];
    }
    if (x < y)
      return -1;
    if (y < x)
      return 1;
    return 0;
  };
  Buffer.isEncoding = function isEncoding(encoding) {
    switch (String(encoding).toLowerCase()) {
      case 'hex':
      case 'utf8':
      case 'utf-8':
      case 'ascii':
      case 'binary':
      case 'base64':
      case 'raw':
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return true;
      default:
        return false;
    }
  };
  Buffer.concat = function concat(list, length) {
    if (!isArray(list))
      throw new TypeError('list argument must be an Array of Buffers.');
    if (list.length === 0) {
      return new Buffer(0);
    }
    var i;
    if (length === undefined) {
      length = 0;
      for (i = 0; i < list.length; i++) {
        length += list[i].length;
      }
    }
    var buf = new Buffer(length);
    var pos = 0;
    for (i = 0; i < list.length; i++) {
      var item = list[i];
      item.copy(buf, pos);
      pos += item.length;
    }
    return buf;
  };
  function byteLength(string, encoding) {
    if (typeof string !== 'string')
      string = '' + string;
    var len = string.length;
    if (len === 0)
      return 0;
    var loweredCase = false;
    for (; ; ) {
      switch (encoding) {
        case 'ascii':
        case 'binary':
        case 'raw':
        case 'raws':
          return len;
        case 'utf8':
        case 'utf-8':
          return utf8ToBytes(string).length;
        case 'ucs2':
        case 'ucs-2':
        case 'utf16le':
        case 'utf-16le':
          return len * 2;
        case 'hex':
          return len >>> 1;
        case 'base64':
          return base64ToBytes(string).length;
        default:
          if (loweredCase)
            return utf8ToBytes(string).length;
          encoding = ('' + encoding).toLowerCase();
          loweredCase = true;
      }
    }
  }
  Buffer.byteLength = byteLength;
  function slowToString(encoding, start, end) {
    var loweredCase = false;
    start = start | 0;
    end = end === undefined || end === Infinity ? this.length : end | 0;
    if (!encoding)
      encoding = 'utf8';
    if (start < 0)
      start = 0;
    if (end > this.length)
      end = this.length;
    if (end <= start)
      return '';
    while (true) {
      switch (encoding) {
        case 'hex':
          return hexSlice(this, start, end);
        case 'utf8':
        case 'utf-8':
          return utf8Slice(this, start, end);
        case 'ascii':
          return asciiSlice(this, start, end);
        case 'binary':
          return binarySlice(this, start, end);
        case 'base64':
          return base64Slice(this, start, end);
        case 'ucs2':
        case 'ucs-2':
        case 'utf16le':
        case 'utf-16le':
          return utf16leSlice(this, start, end);
        default:
          if (loweredCase)
            throw new TypeError('Unknown encoding: ' + encoding);
          encoding = (encoding + '').toLowerCase();
          loweredCase = true;
      }
    }
  }
  Buffer.prototype.toString = function toString() {
    var length = this.length | 0;
    if (length === 0)
      return '';
    if (arguments.length === 0)
      return utf8Slice(this, 0, length);
    return slowToString.apply(this, arguments);
  };
  Buffer.prototype.equals = function equals(b) {
    if (!Buffer.isBuffer(b))
      throw new TypeError('Argument must be a Buffer');
    if (this === b)
      return true;
    return Buffer.compare(this, b) === 0;
  };
  Buffer.prototype.inspect = function inspect() {
    var str = '';
    var max = exports.INSPECT_MAX_BYTES;
    if (this.length > 0) {
      str = this.toString('hex', 0, max).match(/.{2}/g).join(' ');
      if (this.length > max)
        str += ' ... ';
    }
    return '<Buffer ' + str + '>';
  };
  Buffer.prototype.compare = function compare(b) {
    if (!Buffer.isBuffer(b))
      throw new TypeError('Argument must be a Buffer');
    if (this === b)
      return 0;
    return Buffer.compare(this, b);
  };
  Buffer.prototype.indexOf = function indexOf(val, byteOffset) {
    if (byteOffset > 0x7fffffff)
      byteOffset = 0x7fffffff;
    else if (byteOffset < -0x80000000)
      byteOffset = -0x80000000;
    byteOffset >>= 0;
    if (this.length === 0)
      return -1;
    if (byteOffset >= this.length)
      return -1;
    if (byteOffset < 0)
      byteOffset = Math.max(this.length + byteOffset, 0);
    if (typeof val === 'string') {
      if (val.length === 0)
        return -1;
      return String.prototype.indexOf.call(this, val, byteOffset);
    }
    if (Buffer.isBuffer(val)) {
      return arrayIndexOf(this, val, byteOffset);
    }
    if (typeof val === 'number') {
      if (Buffer.TYPED_ARRAY_SUPPORT && Uint8Array.prototype.indexOf === 'function') {
        return Uint8Array.prototype.indexOf.call(this, val, byteOffset);
      }
      return arrayIndexOf(this, [val], byteOffset);
    }
    function arrayIndexOf(arr, val, byteOffset) {
      var foundIndex = -1;
      for (var i = 0; byteOffset + i < arr.length; i++) {
        if (arr[byteOffset + i] === val[foundIndex === -1 ? 0 : i - foundIndex]) {
          if (foundIndex === -1)
            foundIndex = i;
          if (i - foundIndex + 1 === val.length)
            return byteOffset + foundIndex;
        } else {
          foundIndex = -1;
        }
      }
      return -1;
    }
    throw new TypeError('val must be string, number or Buffer');
  };
  Buffer.prototype.get = function get(offset) {
    console.log('.get() is deprecated. Access using array indexes instead.');
    return this.readUInt8(offset);
  };
  Buffer.prototype.set = function set(v, offset) {
    console.log('.set() is deprecated. Access using array indexes instead.');
    return this.writeUInt8(v, offset);
  };
  function hexWrite(buf, string, offset, length) {
    offset = Number(offset) || 0;
    var remaining = buf.length - offset;
    if (!length) {
      length = remaining;
    } else {
      length = Number(length);
      if (length > remaining) {
        length = remaining;
      }
    }
    var strLen = string.length;
    if (strLen % 2 !== 0)
      throw new Error('Invalid hex string');
    if (length > strLen / 2) {
      length = strLen / 2;
    }
    for (var i = 0; i < length; i++) {
      var parsed = parseInt(string.substr(i * 2, 2), 16);
      if (isNaN(parsed))
        throw new Error('Invalid hex string');
      buf[offset + i] = parsed;
    }
    return i;
  }
  function utf8Write(buf, string, offset, length) {
    return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length);
  }
  function asciiWrite(buf, string, offset, length) {
    return blitBuffer(asciiToBytes(string), buf, offset, length);
  }
  function binaryWrite(buf, string, offset, length) {
    return asciiWrite(buf, string, offset, length);
  }
  function base64Write(buf, string, offset, length) {
    return blitBuffer(base64ToBytes(string), buf, offset, length);
  }
  function ucs2Write(buf, string, offset, length) {
    return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length);
  }
  Buffer.prototype.write = function write(string, offset, length, encoding) {
    if (offset === undefined) {
      encoding = 'utf8';
      length = this.length;
      offset = 0;
    } else if (length === undefined && typeof offset === 'string') {
      encoding = offset;
      length = this.length;
      offset = 0;
    } else if (isFinite(offset)) {
      offset = offset | 0;
      if (isFinite(length)) {
        length = length | 0;
        if (encoding === undefined)
          encoding = 'utf8';
      } else {
        encoding = length;
        length = undefined;
      }
    } else {
      var swap = encoding;
      encoding = offset;
      offset = length | 0;
      length = swap;
    }
    var remaining = this.length - offset;
    if (length === undefined || length > remaining)
      length = remaining;
    if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
      throw new RangeError('attempt to write outside buffer bounds');
    }
    if (!encoding)
      encoding = 'utf8';
    var loweredCase = false;
    for (; ; ) {
      switch (encoding) {
        case 'hex':
          return hexWrite(this, string, offset, length);
        case 'utf8':
        case 'utf-8':
          return utf8Write(this, string, offset, length);
        case 'ascii':
          return asciiWrite(this, string, offset, length);
        case 'binary':
          return binaryWrite(this, string, offset, length);
        case 'base64':
          return base64Write(this, string, offset, length);
        case 'ucs2':
        case 'ucs-2':
        case 'utf16le':
        case 'utf-16le':
          return ucs2Write(this, string, offset, length);
        default:
          if (loweredCase)
            throw new TypeError('Unknown encoding: ' + encoding);
          encoding = ('' + encoding).toLowerCase();
          loweredCase = true;
      }
    }
  };
  Buffer.prototype.toJSON = function toJSON() {
    return {
      type: 'Buffer',
      data: Array.prototype.slice.call(this._arr || this, 0)
    };
  };
  function base64Slice(buf, start, end) {
    if (start === 0 && end === buf.length) {
      return base64.fromByteArray(buf);
    } else {
      return base64.fromByteArray(buf.slice(start, end));
    }
  }
  function utf8Slice(buf, start, end) {
    end = Math.min(buf.length, end);
    var res = [];
    var i = start;
    while (i < end) {
      var firstByte = buf[i];
      var codePoint = null;
      var bytesPerSequence = (firstByte > 0xEF) ? 4 : (firstByte > 0xDF) ? 3 : (firstByte > 0xBF) ? 2 : 1;
      if (i + bytesPerSequence <= end) {
        var secondByte,
            thirdByte,
            fourthByte,
            tempCodePoint;
        switch (bytesPerSequence) {
          case 1:
            if (firstByte < 0x80) {
              codePoint = firstByte;
            }
            break;
          case 2:
            secondByte = buf[i + 1];
            if ((secondByte & 0xC0) === 0x80) {
              tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F);
              if (tempCodePoint > 0x7F) {
                codePoint = tempCodePoint;
              }
            }
            break;
          case 3:
            secondByte = buf[i + 1];
            thirdByte = buf[i + 2];
            if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
              tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F);
              if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
                codePoint = tempCodePoint;
              }
            }
            break;
          case 4:
            secondByte = buf[i + 1];
            thirdByte = buf[i + 2];
            fourthByte = buf[i + 3];
            if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
              tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F);
              if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
                codePoint = tempCodePoint;
              }
            }
        }
      }
      if (codePoint === null) {
        codePoint = 0xFFFD;
        bytesPerSequence = 1;
      } else if (codePoint > 0xFFFF) {
        codePoint -= 0x10000;
        res.push(codePoint >>> 10 & 0x3FF | 0xD800);
        codePoint = 0xDC00 | codePoint & 0x3FF;
      }
      res.push(codePoint);
      i += bytesPerSequence;
    }
    return decodeCodePointsArray(res);
  }
  var MAX_ARGUMENTS_LENGTH = 0x1000;
  function decodeCodePointsArray(codePoints) {
    var len = codePoints.length;
    if (len <= MAX_ARGUMENTS_LENGTH) {
      return String.fromCharCode.apply(String, codePoints);
    }
    var res = '';
    var i = 0;
    while (i < len) {
      res += String.fromCharCode.apply(String, codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH));
    }
    return res;
  }
  function asciiSlice(buf, start, end) {
    var ret = '';
    end = Math.min(buf.length, end);
    for (var i = start; i < end; i++) {
      ret += String.fromCharCode(buf[i] & 0x7F);
    }
    return ret;
  }
  function binarySlice(buf, start, end) {
    var ret = '';
    end = Math.min(buf.length, end);
    for (var i = start; i < end; i++) {
      ret += String.fromCharCode(buf[i]);
    }
    return ret;
  }
  function hexSlice(buf, start, end) {
    var len = buf.length;
    if (!start || start < 0)
      start = 0;
    if (!end || end < 0 || end > len)
      end = len;
    var out = '';
    for (var i = start; i < end; i++) {
      out += toHex(buf[i]);
    }
    return out;
  }
  function utf16leSlice(buf, start, end) {
    var bytes = buf.slice(start, end);
    var res = '';
    for (var i = 0; i < bytes.length; i += 2) {
      res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256);
    }
    return res;
  }
  Buffer.prototype.slice = function slice(start, end) {
    var len = this.length;
    start = ~~start;
    end = end === undefined ? len : ~~end;
    if (start < 0) {
      start += len;
      if (start < 0)
        start = 0;
    } else if (start > len) {
      start = len;
    }
    if (end < 0) {
      end += len;
      if (end < 0)
        end = 0;
    } else if (end > len) {
      end = len;
    }
    if (end < start)
      end = start;
    var newBuf;
    if (Buffer.TYPED_ARRAY_SUPPORT) {
      newBuf = Buffer._augment(this.subarray(start, end));
    } else {
      var sliceLen = end - start;
      newBuf = new Buffer(sliceLen, undefined);
      for (var i = 0; i < sliceLen; i++) {
        newBuf[i] = this[i + start];
      }
    }
    if (newBuf.length)
      newBuf.parent = this.parent || this;
    return newBuf;
  };
  function checkOffset(offset, ext, length) {
    if ((offset % 1) !== 0 || offset < 0)
      throw new RangeError('offset is not uint');
    if (offset + ext > length)
      throw new RangeError('Trying to access beyond buffer length');
  }
  Buffer.prototype.readUIntLE = function readUIntLE(offset, byteLength, noAssert) {
    offset = offset | 0;
    byteLength = byteLength | 0;
    if (!noAssert)
      checkOffset(offset, byteLength, this.length);
    var val = this[offset];
    var mul = 1;
    var i = 0;
    while (++i < byteLength && (mul *= 0x100)) {
      val += this[offset + i] * mul;
    }
    return val;
  };
  Buffer.prototype.readUIntBE = function readUIntBE(offset, byteLength, noAssert) {
    offset = offset | 0;
    byteLength = byteLength | 0;
    if (!noAssert) {
      checkOffset(offset, byteLength, this.length);
    }
    var val = this[offset + --byteLength];
    var mul = 1;
    while (byteLength > 0 && (mul *= 0x100)) {
      val += this[offset + --byteLength] * mul;
    }
    return val;
  };
  Buffer.prototype.readUInt8 = function readUInt8(offset, noAssert) {
    if (!noAssert)
      checkOffset(offset, 1, this.length);
    return this[offset];
  };
  Buffer.prototype.readUInt16LE = function readUInt16LE(offset, noAssert) {
    if (!noAssert)
      checkOffset(offset, 2, this.length);
    return this[offset] | (this[offset + 1] << 8);
  };
  Buffer.prototype.readUInt16BE = function readUInt16BE(offset, noAssert) {
    if (!noAssert)
      checkOffset(offset, 2, this.length);
    return (this[offset] << 8) | this[offset + 1];
  };
  Buffer.prototype.readUInt32LE = function readUInt32LE(offset, noAssert) {
    if (!noAssert)
      checkOffset(offset, 4, this.length);
    return ((this[offset]) | (this[offset + 1] << 8) | (this[offset + 2] << 16)) + (this[offset + 3] * 0x1000000);
  };
  Buffer.prototype.readUInt32BE = function readUInt32BE(offset, noAssert) {
    if (!noAssert)
      checkOffset(offset, 4, this.length);
    return (this[offset] * 0x1000000) + ((this[offset + 1] << 16) | (this[offset + 2] << 8) | this[offset + 3]);
  };
  Buffer.prototype.readIntLE = function readIntLE(offset, byteLength, noAssert) {
    offset = offset | 0;
    byteLength = byteLength | 0;
    if (!noAssert)
      checkOffset(offset, byteLength, this.length);
    var val = this[offset];
    var mul = 1;
    var i = 0;
    while (++i < byteLength && (mul *= 0x100)) {
      val += this[offset + i] * mul;
    }
    mul *= 0x80;
    if (val >= mul)
      val -= Math.pow(2, 8 * byteLength);
    return val;
  };
  Buffer.prototype.readIntBE = function readIntBE(offset, byteLength, noAssert) {
    offset = offset | 0;
    byteLength = byteLength | 0;
    if (!noAssert)
      checkOffset(offset, byteLength, this.length);
    var i = byteLength;
    var mul = 1;
    var val = this[offset + --i];
    while (i > 0 && (mul *= 0x100)) {
      val += this[offset + --i] * mul;
    }
    mul *= 0x80;
    if (val >= mul)
      val -= Math.pow(2, 8 * byteLength);
    return val;
  };
  Buffer.prototype.readInt8 = function readInt8(offset, noAssert) {
    if (!noAssert)
      checkOffset(offset, 1, this.length);
    if (!(this[offset] & 0x80))
      return (this[offset]);
    return ((0xff - this[offset] + 1) * -1);
  };
  Buffer.prototype.readInt16LE = function readInt16LE(offset, noAssert) {
    if (!noAssert)
      checkOffset(offset, 2, this.length);
    var val = this[offset] | (this[offset + 1] << 8);
    return (val & 0x8000) ? val | 0xFFFF0000 : val;
  };
  Buffer.prototype.readInt16BE = function readInt16BE(offset, noAssert) {
    if (!noAssert)
      checkOffset(offset, 2, this.length);
    var val = this[offset + 1] | (this[offset] << 8);
    return (val & 0x8000) ? val | 0xFFFF0000 : val;
  };
  Buffer.prototype.readInt32LE = function readInt32LE(offset, noAssert) {
    if (!noAssert)
      checkOffset(offset, 4, this.length);
    return (this[offset]) | (this[offset + 1] << 8) | (this[offset + 2] << 16) | (this[offset + 3] << 24);
  };
  Buffer.prototype.readInt32BE = function readInt32BE(offset, noAssert) {
    if (!noAssert)
      checkOffset(offset, 4, this.length);
    return (this[offset] << 24) | (this[offset + 1] << 16) | (this[offset + 2] << 8) | (this[offset + 3]);
  };
  Buffer.prototype.readFloatLE = function readFloatLE(offset, noAssert) {
    if (!noAssert)
      checkOffset(offset, 4, this.length);
    return ieee754.read(this, offset, true, 23, 4);
  };
  Buffer.prototype.readFloatBE = function readFloatBE(offset, noAssert) {
    if (!noAssert)
      checkOffset(offset, 4, this.length);
    return ieee754.read(this, offset, false, 23, 4);
  };
  Buffer.prototype.readDoubleLE = function readDoubleLE(offset, noAssert) {
    if (!noAssert)
      checkOffset(offset, 8, this.length);
    return ieee754.read(this, offset, true, 52, 8);
  };
  Buffer.prototype.readDoubleBE = function readDoubleBE(offset, noAssert) {
    if (!noAssert)
      checkOffset(offset, 8, this.length);
    return ieee754.read(this, offset, false, 52, 8);
  };
  function checkInt(buf, value, offset, ext, max, min) {
    if (!Buffer.isBuffer(buf))
      throw new TypeError('buffer must be a Buffer instance');
    if (value > max || value < min)
      throw new RangeError('value is out of bounds');
    if (offset + ext > buf.length)
      throw new RangeError('index out of range');
  }
  Buffer.prototype.writeUIntLE = function writeUIntLE(value, offset, byteLength, noAssert) {
    value = +value;
    offset = offset | 0;
    byteLength = byteLength | 0;
    if (!noAssert)
      checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0);
    var mul = 1;
    var i = 0;
    this[offset] = value & 0xFF;
    while (++i < byteLength && (mul *= 0x100)) {
      this[offset + i] = (value / mul) & 0xFF;
    }
    return offset + byteLength;
  };
  Buffer.prototype.writeUIntBE = function writeUIntBE(value, offset, byteLength, noAssert) {
    value = +value;
    offset = offset | 0;
    byteLength = byteLength | 0;
    if (!noAssert)
      checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0);
    var i = byteLength - 1;
    var mul = 1;
    this[offset + i] = value & 0xFF;
    while (--i >= 0 && (mul *= 0x100)) {
      this[offset + i] = (value / mul) & 0xFF;
    }
    return offset + byteLength;
  };
  Buffer.prototype.writeUInt8 = function writeUInt8(value, offset, noAssert) {
    value = +value;
    offset = offset | 0;
    if (!noAssert)
      checkInt(this, value, offset, 1, 0xff, 0);
    if (!Buffer.TYPED_ARRAY_SUPPORT)
      value = Math.floor(value);
    this[offset] = (value & 0xff);
    return offset + 1;
  };
  function objectWriteUInt16(buf, value, offset, littleEndian) {
    if (value < 0)
      value = 0xffff + value + 1;
    for (var i = 0,
        j = Math.min(buf.length - offset, 2); i < j; i++) {
      buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>> (littleEndian ? i : 1 - i) * 8;
    }
  }
  Buffer.prototype.writeUInt16LE = function writeUInt16LE(value, offset, noAssert) {
    value = +value;
    offset = offset | 0;
    if (!noAssert)
      checkInt(this, value, offset, 2, 0xffff, 0);
    if (Buffer.TYPED_ARRAY_SUPPORT) {
      this[offset] = (value & 0xff);
      this[offset + 1] = (value >>> 8);
    } else {
      objectWriteUInt16(this, value, offset, true);
    }
    return offset + 2;
  };
  Buffer.prototype.writeUInt16BE = function writeUInt16BE(value, offset, noAssert) {
    value = +value;
    offset = offset | 0;
    if (!noAssert)
      checkInt(this, value, offset, 2, 0xffff, 0);
    if (Buffer.TYPED_ARRAY_SUPPORT) {
      this[offset] = (value >>> 8);
      this[offset + 1] = (value & 0xff);
    } else {
      objectWriteUInt16(this, value, offset, false);
    }
    return offset + 2;
  };
  function objectWriteUInt32(buf, value, offset, littleEndian) {
    if (value < 0)
      value = 0xffffffff + value + 1;
    for (var i = 0,
        j = Math.min(buf.length - offset, 4); i < j; i++) {
      buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff;
    }
  }
  Buffer.prototype.writeUInt32LE = function writeUInt32LE(value, offset, noAssert) {
    value = +value;
    offset = offset | 0;
    if (!noAssert)
      checkInt(this, value, offset, 4, 0xffffffff, 0);
    if (Buffer.TYPED_ARRAY_SUPPORT) {
      this[offset + 3] = (value >>> 24);
      this[offset + 2] = (value >>> 16);
      this[offset + 1] = (value >>> 8);
      this[offset] = (value & 0xff);
    } else {
      objectWriteUInt32(this, value, offset, true);
    }
    return offset + 4;
  };
  Buffer.prototype.writeUInt32BE = function writeUInt32BE(value, offset, noAssert) {
    value = +value;
    offset = offset | 0;
    if (!noAssert)
      checkInt(this, value, offset, 4, 0xffffffff, 0);
    if (Buffer.TYPED_ARRAY_SUPPORT) {
      this[offset] = (value >>> 24);
      this[offset + 1] = (value >>> 16);
      this[offset + 2] = (value >>> 8);
      this[offset + 3] = (value & 0xff);
    } else {
      objectWriteUInt32(this, value, offset, false);
    }
    return offset + 4;
  };
  Buffer.prototype.writeIntLE = function writeIntLE(value, offset, byteLength, noAssert) {
    value = +value;
    offset = offset | 0;
    if (!noAssert) {
      var limit = Math.pow(2, 8 * byteLength - 1);
      checkInt(this, value, offset, byteLength, limit - 1, -limit);
    }
    var i = 0;
    var mul = 1;
    var sub = value < 0 ? 1 : 0;
    this[offset] = value & 0xFF;
    while (++i < byteLength && (mul *= 0x100)) {
      this[offset + i] = ((value / mul) >> 0) - sub & 0xFF;
    }
    return offset + byteLength;
  };
  Buffer.prototype.writeIntBE = function writeIntBE(value, offset, byteLength, noAssert) {
    value = +value;
    offset = offset | 0;
    if (!noAssert) {
      var limit = Math.pow(2, 8 * byteLength - 1);
      checkInt(this, value, offset, byteLength, limit - 1, -limit);
    }
    var i = byteLength - 1;
    var mul = 1;
    var sub = value < 0 ? 1 : 0;
    this[offset + i] = value & 0xFF;
    while (--i >= 0 && (mul *= 0x100)) {
      this[offset + i] = ((value / mul) >> 0) - sub & 0xFF;
    }
    return offset + byteLength;
  };
  Buffer.prototype.writeInt8 = function writeInt8(value, offset, noAssert) {
    value = +value;
    offset = offset | 0;
    if (!noAssert)
      checkInt(this, value, offset, 1, 0x7f, -0x80);
    if (!Buffer.TYPED_ARRAY_SUPPORT)
      value = Math.floor(value);
    if (value < 0)
      value = 0xff + value + 1;
    this[offset] = (value & 0xff);
    return offset + 1;
  };
  Buffer.prototype.writeInt16LE = function writeInt16LE(value, offset, noAssert) {
    value = +value;
    offset = offset | 0;
    if (!noAssert)
      checkInt(this, value, offset, 2, 0x7fff, -0x8000);
    if (Buffer.TYPED_ARRAY_SUPPORT) {
      this[offset] = (value & 0xff);
      this[offset + 1] = (value >>> 8);
    } else {
      objectWriteUInt16(this, value, offset, true);
    }
    return offset + 2;
  };
  Buffer.prototype.writeInt16BE = function writeInt16BE(value, offset, noAssert) {
    value = +value;
    offset = offset | 0;
    if (!noAssert)
      checkInt(this, value, offset, 2, 0x7fff, -0x8000);
    if (Buffer.TYPED_ARRAY_SUPPORT) {
      this[offset] = (value >>> 8);
      this[offset + 1] = (value & 0xff);
    } else {
      objectWriteUInt16(this, value, offset, false);
    }
    return offset + 2;
  };
  Buffer.prototype.writeInt32LE = function writeInt32LE(value, offset, noAssert) {
    value = +value;
    offset = offset | 0;
    if (!noAssert)
      checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000);
    if (Buffer.TYPED_ARRAY_SUPPORT) {
      this[offset] = (value & 0xff);
      this[offset + 1] = (value >>> 8);
      this[offset + 2] = (value >>> 16);
      this[offset + 3] = (value >>> 24);
    } else {
      objectWriteUInt32(this, value, offset, true);
    }
    return offset + 4;
  };
  Buffer.prototype.writeInt32BE = function writeInt32BE(value, offset, noAssert) {
    value = +value;
    offset = offset | 0;
    if (!noAssert)
      checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000);
    if (value < 0)
      value = 0xffffffff + value + 1;
    if (Buffer.TYPED_ARRAY_SUPPORT) {
      this[offset] = (value >>> 24);
      this[offset + 1] = (value >>> 16);
      this[offset + 2] = (value >>> 8);
      this[offset + 3] = (value & 0xff);
    } else {
      objectWriteUInt32(this, value, offset, false);
    }
    return offset + 4;
  };
  function checkIEEE754(buf, value, offset, ext, max, min) {
    if (value > max || value < min)
      throw new RangeError('value is out of bounds');
    if (offset + ext > buf.length)
      throw new RangeError('index out of range');
    if (offset < 0)
      throw new RangeError('index out of range');
  }
  function writeFloat(buf, value, offset, littleEndian, noAssert) {
    if (!noAssert) {
      checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38);
    }
    ieee754.write(buf, value, offset, littleEndian, 23, 4);
    return offset + 4;
  }
  Buffer.prototype.writeFloatLE = function writeFloatLE(value, offset, noAssert) {
    return writeFloat(this, value, offset, true, noAssert);
  };
  Buffer.prototype.writeFloatBE = function writeFloatBE(value, offset, noAssert) {
    return writeFloat(this, value, offset, false, noAssert);
  };
  function writeDouble(buf, value, offset, littleEndian, noAssert) {
    if (!noAssert) {
      checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308);
    }
    ieee754.write(buf, value, offset, littleEndian, 52, 8);
    return offset + 8;
  }
  Buffer.prototype.writeDoubleLE = function writeDoubleLE(value, offset, noAssert) {
    return writeDouble(this, value, offset, true, noAssert);
  };
  Buffer.prototype.writeDoubleBE = function writeDoubleBE(value, offset, noAssert) {
    return writeDouble(this, value, offset, false, noAssert);
  };
  Buffer.prototype.copy = function copy(target, targetStart, start, end) {
    if (!start)
      start = 0;
    if (!end && end !== 0)
      end = this.length;
    if (targetStart >= target.length)
      targetStart = target.length;
    if (!targetStart)
      targetStart = 0;
    if (end > 0 && end < start)
      end = start;
    if (end === start)
      return 0;
    if (target.length === 0 || this.length === 0)
      return 0;
    if (targetStart < 0) {
      throw new RangeError('targetStart out of bounds');
    }
    if (start < 0 || start >= this.length)
      throw new RangeError('sourceStart out of bounds');
    if (end < 0)
      throw new RangeError('sourceEnd out of bounds');
    if (end > this.length)
      end = this.length;
    if (target.length - targetStart < end - start) {
      end = target.length - targetStart + start;
    }
    var len = end - start;
    var i;
    if (this === target && start < targetStart && targetStart < end) {
      for (i = len - 1; i >= 0; i--) {
        target[i + targetStart] = this[i + start];
      }
    } else if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
      for (i = 0; i < len; i++) {
        target[i + targetStart] = this[i + start];
      }
    } else {
      target._set(this.subarray(start, start + len), targetStart);
    }
    return len;
  };
  Buffer.prototype.fill = function fill(value, start, end) {
    if (!value)
      value = 0;
    if (!start)
      start = 0;
    if (!end)
      end = this.length;
    if (end < start)
      throw new RangeError('end < start');
    if (end === start)
      return;
    if (this.length === 0)
      return;
    if (start < 0 || start >= this.length)
      throw new RangeError('start out of bounds');
    if (end < 0 || end > this.length)
      throw new RangeError('end out of bounds');
    var i;
    if (typeof value === 'number') {
      for (i = start; i < end; i++) {
        this[i] = value;
      }
    } else {
      var bytes = utf8ToBytes(value.toString());
      var len = bytes.length;
      for (i = start; i < end; i++) {
        this[i] = bytes[i % len];
      }
    }
    return this;
  };
  Buffer.prototype.toArrayBuffer = function toArrayBuffer() {
    if (typeof Uint8Array !== 'undefined') {
      if (Buffer.TYPED_ARRAY_SUPPORT) {
        return (new Buffer(this)).buffer;
      } else {
        var buf = new Uint8Array(this.length);
        for (var i = 0,
            len = buf.length; i < len; i += 1) {
          buf[i] = this[i];
        }
        return buf.buffer;
      }
    } else {
      throw new TypeError('Buffer.toArrayBuffer not supported in this browser');
    }
  };
  var BP = Buffer.prototype;
  Buffer._augment = function _augment(arr) {
    arr.constructor = Buffer;
    arr._isBuffer = true;
    arr._set = arr.set;
    arr.get = BP.get;
    arr.set = BP.set;
    arr.write = BP.write;
    arr.toString = BP.toString;
    arr.toLocaleString = BP.toString;
    arr.toJSON = BP.toJSON;
    arr.equals = BP.equals;
    arr.compare = BP.compare;
    arr.indexOf = BP.indexOf;
    arr.copy = BP.copy;
    arr.slice = BP.slice;
    arr.readUIntLE = BP.readUIntLE;
    arr.readUIntBE = BP.readUIntBE;
    arr.readUInt8 = BP.readUInt8;
    arr.readUInt16LE = BP.readUInt16LE;
    arr.readUInt16BE = BP.readUInt16BE;
    arr.readUInt32LE = BP.readUInt32LE;
    arr.readUInt32BE = BP.readUInt32BE;
    arr.readIntLE = BP.readIntLE;
    arr.readIntBE = BP.readIntBE;
    arr.readInt8 = BP.readInt8;
    arr.readInt16LE = BP.readInt16LE;
    arr.readInt16BE = BP.readInt16BE;
    arr.readInt32LE = BP.readInt32LE;
    arr.readInt32BE = BP.readInt32BE;
    arr.readFloatLE = BP.readFloatLE;
    arr.readFloatBE = BP.readFloatBE;
    arr.readDoubleLE = BP.readDoubleLE;
    arr.readDoubleBE = BP.readDoubleBE;
    arr.writeUInt8 = BP.writeUInt8;
    arr.writeUIntLE = BP.writeUIntLE;
    arr.writeUIntBE = BP.writeUIntBE;
    arr.writeUInt16LE = BP.writeUInt16LE;
    arr.writeUInt16BE = BP.writeUInt16BE;
    arr.writeUInt32LE = BP.writeUInt32LE;
    arr.writeUInt32BE = BP.writeUInt32BE;
    arr.writeIntLE = BP.writeIntLE;
    arr.writeIntBE = BP.writeIntBE;
    arr.writeInt8 = BP.writeInt8;
    arr.writeInt16LE = BP.writeInt16LE;
    arr.writeInt16BE = BP.writeInt16BE;
    arr.writeInt32LE = BP.writeInt32LE;
    arr.writeInt32BE = BP.writeInt32BE;
    arr.writeFloatLE = BP.writeFloatLE;
    arr.writeFloatBE = BP.writeFloatBE;
    arr.writeDoubleLE = BP.writeDoubleLE;
    arr.writeDoubleBE = BP.writeDoubleBE;
    arr.fill = BP.fill;
    arr.inspect = BP.inspect;
    arr.toArrayBuffer = BP.toArrayBuffer;
    return arr;
  };
  var INVALID_BASE64_RE = /[^+\/0-9A-Za-z-_]/g;
  function base64clean(str) {
    str = stringtrim(str).replace(INVALID_BASE64_RE, '');
    if (str.length < 2)
      return '';
    while (str.length % 4 !== 0) {
      str = str + '=';
    }
    return str;
  }
  function stringtrim(str) {
    if (str.trim)
      return str.trim();
    return str.replace(/^\s+|\s+$/g, '');
  }
  function toHex(n) {
    if (n < 16)
      return '0' + n.toString(16);
    return n.toString(16);
  }
  function utf8ToBytes(string, units) {
    units = units || Infinity;
    var codePoint;
    var length = string.length;
    var leadSurrogate = null;
    var bytes = [];
    for (var i = 0; i < length; i++) {
      codePoint = string.charCodeAt(i);
      if (codePoint > 0xD7FF && codePoint < 0xE000) {
        if (!leadSurrogate) {
          if (codePoint > 0xDBFF) {
            if ((units -= 3) > -1)
              bytes.push(0xEF, 0xBF, 0xBD);
            continue;
          } else if (i + 1 === length) {
            if ((units -= 3) > -1)
              bytes.push(0xEF, 0xBF, 0xBD);
            continue;
          }
          leadSurrogate = codePoint;
          continue;
        }
        if (codePoint < 0xDC00) {
          if ((units -= 3) > -1)
            bytes.push(0xEF, 0xBF, 0xBD);
          leadSurrogate = codePoint;
          continue;
        }
        codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000;
      } else if (leadSurrogate) {
        if ((units -= 3) > -1)
          bytes.push(0xEF, 0xBF, 0xBD);
      }
      leadSurrogate = null;
      if (codePoint < 0x80) {
        if ((units -= 1) < 0)
          break;
        bytes.push(codePoint);
      } else if (codePoint < 0x800) {
        if ((units -= 2) < 0)
          break;
        bytes.push(codePoint >> 0x6 | 0xC0, codePoint & 0x3F | 0x80);
      } else if (codePoint < 0x10000) {
        if ((units -= 3) < 0)
          break;
        bytes.push(codePoint >> 0xC | 0xE0, codePoint >> 0x6 & 0x3F | 0x80, codePoint & 0x3F | 0x80);
      } else if (codePoint < 0x110000) {
        if ((units -= 4) < 0)
          break;
        bytes.push(codePoint >> 0x12 | 0xF0, codePoint >> 0xC & 0x3F | 0x80, codePoint >> 0x6 & 0x3F | 0x80, codePoint & 0x3F | 0x80);
      } else {
        throw new Error('Invalid code point');
      }
    }
    return bytes;
  }
  function asciiToBytes(str) {
    var byteArray = [];
    for (var i = 0; i < str.length; i++) {
      byteArray.push(str.charCodeAt(i) & 0xFF);
    }
    return byteArray;
  }
  function utf16leToBytes(str, units) {
    var c,
        hi,
        lo;
    var byteArray = [];
    for (var i = 0; i < str.length; i++) {
      if ((units -= 2) < 0)
        break;
      c = str.charCodeAt(i);
      hi = c >> 8;
      lo = c % 256;
      byteArray.push(lo);
      byteArray.push(hi);
    }
    return byteArray;
  }
  function base64ToBytes(str) {
    return base64.toByteArray(base64clean(str));
  }
  function blitBuffer(src, dst, offset, length) {
    for (var i = 0; i < length; i++) {
      if ((i + offset >= dst.length) || (i >= src.length))
        break;
      dst[i + offset] = src[i];
    }
    return i;
  }
  return module.exports;
});

$__System.registerDynamic("eb", ["ea"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = $__require('ea');
  return module.exports;
});

$__System.registerDynamic("ec", ["eb"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = $__System._nodeRequire ? $__System._nodeRequire('buffer') : $__require('eb');
  return module.exports;
});

$__System.registerDynamic("3c", ["ec"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = $__require('ec');
  return module.exports;
});

$__System.registerDynamic("ed", ["3c", "20"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  "format cjs";
  (function(Buffer, process) {
    ;
    (function() {
      var undefined;
      var VERSION = '4.6.1';
      var LARGE_ARRAY_SIZE = 200;
      var FUNC_ERROR_TEXT = 'Expected a function';
      var HASH_UNDEFINED = '__lodash_hash_undefined__';
      var PLACEHOLDER = '__lodash_placeholder__';
      var BIND_FLAG = 1,
          BIND_KEY_FLAG = 2,
          CURRY_BOUND_FLAG = 4,
          CURRY_FLAG = 8,
          CURRY_RIGHT_FLAG = 16,
          PARTIAL_FLAG = 32,
          PARTIAL_RIGHT_FLAG = 64,
          ARY_FLAG = 128,
          REARG_FLAG = 256,
          FLIP_FLAG = 512;
      var UNORDERED_COMPARE_FLAG = 1,
          PARTIAL_COMPARE_FLAG = 2;
      var DEFAULT_TRUNC_LENGTH = 30,
          DEFAULT_TRUNC_OMISSION = '...';
      var HOT_COUNT = 150,
          HOT_SPAN = 16;
      var LAZY_FILTER_FLAG = 1,
          LAZY_MAP_FLAG = 2,
          LAZY_WHILE_FLAG = 3;
      var INFINITY = 1 / 0,
          MAX_SAFE_INTEGER = 9007199254740991,
          MAX_INTEGER = 1.7976931348623157e+308,
          NAN = 0 / 0;
      var MAX_ARRAY_LENGTH = 4294967295,
          MAX_ARRAY_INDEX = MAX_ARRAY_LENGTH - 1,
          HALF_MAX_ARRAY_LENGTH = MAX_ARRAY_LENGTH >>> 1;
      var argsTag = '[object Arguments]',
          arrayTag = '[object Array]',
          boolTag = '[object Boolean]',
          dateTag = '[object Date]',
          errorTag = '[object Error]',
          funcTag = '[object Function]',
          genTag = '[object GeneratorFunction]',
          mapTag = '[object Map]',
          numberTag = '[object Number]',
          objectTag = '[object Object]',
          regexpTag = '[object RegExp]',
          setTag = '[object Set]',
          stringTag = '[object String]',
          symbolTag = '[object Symbol]',
          weakMapTag = '[object WeakMap]',
          weakSetTag = '[object WeakSet]';
      var arrayBufferTag = '[object ArrayBuffer]',
          float32Tag = '[object Float32Array]',
          float64Tag = '[object Float64Array]',
          int8Tag = '[object Int8Array]',
          int16Tag = '[object Int16Array]',
          int32Tag = '[object Int32Array]',
          uint8Tag = '[object Uint8Array]',
          uint8ClampedTag = '[object Uint8ClampedArray]',
          uint16Tag = '[object Uint16Array]',
          uint32Tag = '[object Uint32Array]';
      var reEmptyStringLeading = /\b__p \+= '';/g,
          reEmptyStringMiddle = /\b(__p \+=) '' \+/g,
          reEmptyStringTrailing = /(__e\(.*?\)|\b__t\)) \+\n'';/g;
      var reEscapedHtml = /&(?:amp|lt|gt|quot|#39|#96);/g,
          reUnescapedHtml = /[&<>"'`]/g,
          reHasEscapedHtml = RegExp(reEscapedHtml.source),
          reHasUnescapedHtml = RegExp(reUnescapedHtml.source);
      var reEscape = /<%-([\s\S]+?)%>/g,
          reEvaluate = /<%([\s\S]+?)%>/g,
          reInterpolate = /<%=([\s\S]+?)%>/g;
      var reIsDeepProp = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/,
          reIsPlainProp = /^\w*$/,
          rePropName = /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]/g;
      var reRegExpChar = /[\\^$.*+?()[\]{}|]/g,
          reHasRegExpChar = RegExp(reRegExpChar.source);
      var reTrim = /^\s+|\s+$/g,
          reTrimStart = /^\s+/,
          reTrimEnd = /\s+$/;
      var reEscapeChar = /\\(\\)?/g;
      var reEsTemplate = /\$\{([^\\}]*(?:\\.[^\\}]*)*)\}/g;
      var reFlags = /\w*$/;
      var reHasHexPrefix = /^0x/i;
      var reIsBadHex = /^[-+]0x[0-9a-f]+$/i;
      var reIsBinary = /^0b[01]+$/i;
      var reIsHostCtor = /^\[object .+?Constructor\]$/;
      var reIsOctal = /^0o[0-7]+$/i;
      var reIsUint = /^(?:0|[1-9]\d*)$/;
      var reLatin1 = /[\xc0-\xd6\xd8-\xde\xdf-\xf6\xf8-\xff]/g;
      var reNoMatch = /($^)/;
      var reUnescapedString = /['\n\r\u2028\u2029\\]/g;
      var rsAstralRange = '\\ud800-\\udfff',
          rsComboMarksRange = '\\u0300-\\u036f\\ufe20-\\ufe23',
          rsComboSymbolsRange = '\\u20d0-\\u20f0',
          rsDingbatRange = '\\u2700-\\u27bf',
          rsLowerRange = 'a-z\\xdf-\\xf6\\xf8-\\xff',
          rsMathOpRange = '\\xac\\xb1\\xd7\\xf7',
          rsNonCharRange = '\\x00-\\x2f\\x3a-\\x40\\x5b-\\x60\\x7b-\\xbf',
          rsQuoteRange = '\\u2018\\u2019\\u201c\\u201d',
          rsSpaceRange = ' \\t\\x0b\\f\\xa0\\ufeff\\n\\r\\u2028\\u2029\\u1680\\u180e\\u2000\\u2001\\u2002\\u2003\\u2004\\u2005\\u2006\\u2007\\u2008\\u2009\\u200a\\u202f\\u205f\\u3000',
          rsUpperRange = 'A-Z\\xc0-\\xd6\\xd8-\\xde',
          rsVarRange = '\\ufe0e\\ufe0f',
          rsBreakRange = rsMathOpRange + rsNonCharRange + rsQuoteRange + rsSpaceRange;
      var rsAstral = '[' + rsAstralRange + ']',
          rsBreak = '[' + rsBreakRange + ']',
          rsCombo = '[' + rsComboMarksRange + rsComboSymbolsRange + ']',
          rsDigits = '\\d+',
          rsDingbat = '[' + rsDingbatRange + ']',
          rsLower = '[' + rsLowerRange + ']',
          rsMisc = '[^' + rsAstralRange + rsBreakRange + rsDigits + rsDingbatRange + rsLowerRange + rsUpperRange + ']',
          rsFitz = '\\ud83c[\\udffb-\\udfff]',
          rsModifier = '(?:' + rsCombo + '|' + rsFitz + ')',
          rsNonAstral = '[^' + rsAstralRange + ']',
          rsRegional = '(?:\\ud83c[\\udde6-\\uddff]){2}',
          rsSurrPair = '[\\ud800-\\udbff][\\udc00-\\udfff]',
          rsUpper = '[' + rsUpperRange + ']',
          rsZWJ = '\\u200d';
      var rsLowerMisc = '(?:' + rsLower + '|' + rsMisc + ')',
          rsUpperMisc = '(?:' + rsUpper + '|' + rsMisc + ')',
          reOptMod = rsModifier + '?',
          rsOptVar = '[' + rsVarRange + ']?',
          rsOptJoin = '(?:' + rsZWJ + '(?:' + [rsNonAstral, rsRegional, rsSurrPair].join('|') + ')' + rsOptVar + reOptMod + ')*',
          rsSeq = rsOptVar + reOptMod + rsOptJoin,
          rsEmoji = '(?:' + [rsDingbat, rsRegional, rsSurrPair].join('|') + ')' + rsSeq,
          rsSymbol = '(?:' + [rsNonAstral + rsCombo + '?', rsCombo, rsRegional, rsSurrPair, rsAstral].join('|') + ')';
      var reComboMark = RegExp(rsCombo, 'g');
      var reComplexSymbol = RegExp(rsFitz + '(?=' + rsFitz + ')|' + rsSymbol + rsSeq, 'g');
      var reHasComplexSymbol = RegExp('[' + rsZWJ + rsAstralRange + rsComboMarksRange + rsComboSymbolsRange + rsVarRange + ']');
      var reBasicWord = /[a-zA-Z0-9]+/g;
      var reComplexWord = RegExp([rsUpper + '?' + rsLower + '+(?=' + [rsBreak, rsUpper, '$'].join('|') + ')', rsUpperMisc + '+(?=' + [rsBreak, rsUpper + rsLowerMisc, '$'].join('|') + ')', rsUpper + '?' + rsLowerMisc + '+', rsUpper + '+', rsDigits, rsEmoji].join('|'), 'g');
      var reHasComplexWord = /[a-z][A-Z]|[0-9][a-zA-Z]|[a-zA-Z][0-9]|[^a-zA-Z0-9 ]/;
      var contextProps = ['Array', 'Buffer', 'Date', 'Error', 'Float32Array', 'Float64Array', 'Function', 'Int8Array', 'Int16Array', 'Int32Array', 'Map', 'Math', 'Object', 'Reflect', 'RegExp', 'Set', 'String', 'Symbol', 'TypeError', 'Uint8Array', 'Uint8ClampedArray', 'Uint16Array', 'Uint32Array', 'WeakMap', '_', 'clearTimeout', 'isFinite', 'parseInt', 'setTimeout'];
      var templateCounter = -1;
      var typedArrayTags = {};
      typedArrayTags[float32Tag] = typedArrayTags[float64Tag] = typedArrayTags[int8Tag] = typedArrayTags[int16Tag] = typedArrayTags[int32Tag] = typedArrayTags[uint8Tag] = typedArrayTags[uint8ClampedTag] = typedArrayTags[uint16Tag] = typedArrayTags[uint32Tag] = true;
      typedArrayTags[argsTag] = typedArrayTags[arrayTag] = typedArrayTags[arrayBufferTag] = typedArrayTags[boolTag] = typedArrayTags[dateTag] = typedArrayTags[errorTag] = typedArrayTags[funcTag] = typedArrayTags[mapTag] = typedArrayTags[numberTag] = typedArrayTags[objectTag] = typedArrayTags[regexpTag] = typedArrayTags[setTag] = typedArrayTags[stringTag] = typedArrayTags[weakMapTag] = false;
      var cloneableTags = {};
      cloneableTags[argsTag] = cloneableTags[arrayTag] = cloneableTags[arrayBufferTag] = cloneableTags[boolTag] = cloneableTags[dateTag] = cloneableTags[float32Tag] = cloneableTags[float64Tag] = cloneableTags[int8Tag] = cloneableTags[int16Tag] = cloneableTags[int32Tag] = cloneableTags[mapTag] = cloneableTags[numberTag] = cloneableTags[objectTag] = cloneableTags[regexpTag] = cloneableTags[setTag] = cloneableTags[stringTag] = cloneableTags[symbolTag] = cloneableTags[uint8Tag] = cloneableTags[uint8ClampedTag] = cloneableTags[uint16Tag] = cloneableTags[uint32Tag] = true;
      cloneableTags[errorTag] = cloneableTags[funcTag] = cloneableTags[weakMapTag] = false;
      var deburredLetters = {
        '\xc0': 'A',
        '\xc1': 'A',
        '\xc2': 'A',
        '\xc3': 'A',
        '\xc4': 'A',
        '\xc5': 'A',
        '\xe0': 'a',
        '\xe1': 'a',
        '\xe2': 'a',
        '\xe3': 'a',
        '\xe4': 'a',
        '\xe5': 'a',
        '\xc7': 'C',
        '\xe7': 'c',
        '\xd0': 'D',
        '\xf0': 'd',
        '\xc8': 'E',
        '\xc9': 'E',
        '\xca': 'E',
        '\xcb': 'E',
        '\xe8': 'e',
        '\xe9': 'e',
        '\xea': 'e',
        '\xeb': 'e',
        '\xcC': 'I',
        '\xcd': 'I',
        '\xce': 'I',
        '\xcf': 'I',
        '\xeC': 'i',
        '\xed': 'i',
        '\xee': 'i',
        '\xef': 'i',
        '\xd1': 'N',
        '\xf1': 'n',
        '\xd2': 'O',
        '\xd3': 'O',
        '\xd4': 'O',
        '\xd5': 'O',
        '\xd6': 'O',
        '\xd8': 'O',
        '\xf2': 'o',
        '\xf3': 'o',
        '\xf4': 'o',
        '\xf5': 'o',
        '\xf6': 'o',
        '\xf8': 'o',
        '\xd9': 'U',
        '\xda': 'U',
        '\xdb': 'U',
        '\xdc': 'U',
        '\xf9': 'u',
        '\xfa': 'u',
        '\xfb': 'u',
        '\xfc': 'u',
        '\xdd': 'Y',
        '\xfd': 'y',
        '\xff': 'y',
        '\xc6': 'Ae',
        '\xe6': 'ae',
        '\xde': 'Th',
        '\xfe': 'th',
        '\xdf': 'ss'
      };
      var htmlEscapes = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
        '`': '&#96;'
      };
      var htmlUnescapes = {
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&#39;': "'",
        '&#96;': '`'
      };
      var objectTypes = {
        'function': true,
        'object': true
      };
      var stringEscapes = {
        '\\': '\\',
        "'": "'",
        '\n': 'n',
        '\r': 'r',
        '\u2028': 'u2028',
        '\u2029': 'u2029'
      };
      var freeParseFloat = parseFloat,
          freeParseInt = parseInt;
      var freeExports = (objectTypes[typeof exports] && exports && !exports.nodeType) ? exports : undefined;
      var freeModule = (objectTypes[typeof module] && module && !module.nodeType) ? module : undefined;
      var moduleExports = (freeModule && freeModule.exports === freeExports) ? freeExports : undefined;
      var freeGlobal = checkGlobal(freeExports && freeModule && typeof global == 'object' && global);
      var freeSelf = checkGlobal(objectTypes[typeof self] && self);
      var freeWindow = checkGlobal(objectTypes[typeof window] && window);
      var thisGlobal = checkGlobal(objectTypes[typeof this] && this);
      var root = freeGlobal || ((freeWindow !== (thisGlobal && thisGlobal.window)) && freeWindow) || freeSelf || thisGlobal || Function('return this')();
      function addMapEntry(map, pair) {
        map.set(pair[0], pair[1]);
        return map;
      }
      function addSetEntry(set, value) {
        set.add(value);
        return set;
      }
      function apply(func, thisArg, args) {
        var length = args.length;
        switch (length) {
          case 0:
            return func.call(thisArg);
          case 1:
            return func.call(thisArg, args[0]);
          case 2:
            return func.call(thisArg, args[0], args[1]);
          case 3:
            return func.call(thisArg, args[0], args[1], args[2]);
        }
        return func.apply(thisArg, args);
      }
      function arrayAggregator(array, setter, iteratee, accumulator) {
        var index = -1,
            length = array.length;
        while (++index < length) {
          var value = array[index];
          setter(accumulator, value, iteratee(value), array);
        }
        return accumulator;
      }
      function arrayConcat(array, other) {
        var index = -1,
            length = array.length,
            othIndex = -1,
            othLength = other.length,
            result = Array(length + othLength);
        while (++index < length) {
          result[index] = array[index];
        }
        while (++othIndex < othLength) {
          result[index++] = other[othIndex];
        }
        return result;
      }
      function arrayEach(array, iteratee) {
        var index = -1,
            length = array.length;
        while (++index < length) {
          if (iteratee(array[index], index, array) === false) {
            break;
          }
        }
        return array;
      }
      function arrayEachRight(array, iteratee) {
        var length = array.length;
        while (length--) {
          if (iteratee(array[length], length, array) === false) {
            break;
          }
        }
        return array;
      }
      function arrayEvery(array, predicate) {
        var index = -1,
            length = array.length;
        while (++index < length) {
          if (!predicate(array[index], index, array)) {
            return false;
          }
        }
        return true;
      }
      function arrayFilter(array, predicate) {
        var index = -1,
            length = array.length,
            resIndex = 0,
            result = [];
        while (++index < length) {
          var value = array[index];
          if (predicate(value, index, array)) {
            result[resIndex++] = value;
          }
        }
        return result;
      }
      function arrayIncludes(array, value) {
        return !!array.length && baseIndexOf(array, value, 0) > -1;
      }
      function arrayIncludesWith(array, value, comparator) {
        var index = -1,
            length = array.length;
        while (++index < length) {
          if (comparator(value, array[index])) {
            return true;
          }
        }
        return false;
      }
      function arrayMap(array, iteratee) {
        var index = -1,
            length = array.length,
            result = Array(length);
        while (++index < length) {
          result[index] = iteratee(array[index], index, array);
        }
        return result;
      }
      function arrayPush(array, values) {
        var index = -1,
            length = values.length,
            offset = array.length;
        while (++index < length) {
          array[offset + index] = values[index];
        }
        return array;
      }
      function arrayReduce(array, iteratee, accumulator, initAccum) {
        var index = -1,
            length = array.length;
        if (initAccum && length) {
          accumulator = array[++index];
        }
        while (++index < length) {
          accumulator = iteratee(accumulator, array[index], index, array);
        }
        return accumulator;
      }
      function arrayReduceRight(array, iteratee, accumulator, initAccum) {
        var length = array.length;
        if (initAccum && length) {
          accumulator = array[--length];
        }
        while (length--) {
          accumulator = iteratee(accumulator, array[length], length, array);
        }
        return accumulator;
      }
      function arraySome(array, predicate) {
        var index = -1,
            length = array.length;
        while (++index < length) {
          if (predicate(array[index], index, array)) {
            return true;
          }
        }
        return false;
      }
      function baseExtremum(array, iteratee, comparator) {
        var index = -1,
            length = array.length;
        while (++index < length) {
          var value = array[index],
              current = iteratee(value);
          if (current != null && (computed === undefined ? current === current : comparator(current, computed))) {
            var computed = current,
                result = value;
          }
        }
        return result;
      }
      function baseFind(collection, predicate, eachFunc, retKey) {
        var result;
        eachFunc(collection, function(value, key, collection) {
          if (predicate(value, key, collection)) {
            result = retKey ? key : value;
            return false;
          }
        });
        return result;
      }
      function baseFindIndex(array, predicate, fromRight) {
        var length = array.length,
            index = fromRight ? length : -1;
        while ((fromRight ? index-- : ++index < length)) {
          if (predicate(array[index], index, array)) {
            return index;
          }
        }
        return -1;
      }
      function baseIndexOf(array, value, fromIndex) {
        if (value !== value) {
          return indexOfNaN(array, fromIndex);
        }
        var index = fromIndex - 1,
            length = array.length;
        while (++index < length) {
          if (array[index] === value) {
            return index;
          }
        }
        return -1;
      }
      function baseIndexOfWith(array, value, fromIndex, comparator) {
        var index = fromIndex - 1,
            length = array.length;
        while (++index < length) {
          if (comparator(array[index], value)) {
            return index;
          }
        }
        return -1;
      }
      function baseReduce(collection, iteratee, accumulator, initAccum, eachFunc) {
        eachFunc(collection, function(value, index, collection) {
          accumulator = initAccum ? (initAccum = false, value) : iteratee(accumulator, value, index, collection);
        });
        return accumulator;
      }
      function baseSortBy(array, comparer) {
        var length = array.length;
        array.sort(comparer);
        while (length--) {
          array[length] = array[length].value;
        }
        return array;
      }
      function baseSum(array, iteratee) {
        var result,
            index = -1,
            length = array.length;
        while (++index < length) {
          var current = iteratee(array[index]);
          if (current !== undefined) {
            result = result === undefined ? current : (result + current);
          }
        }
        return result;
      }
      function baseTimes(n, iteratee) {
        var index = -1,
            result = Array(n);
        while (++index < n) {
          result[index] = iteratee(index);
        }
        return result;
      }
      function baseToPairs(object, props) {
        return arrayMap(props, function(key) {
          return [key, object[key]];
        });
      }
      function baseUnary(func) {
        return function(value) {
          return func(value);
        };
      }
      function baseValues(object, props) {
        return arrayMap(props, function(key) {
          return object[key];
        });
      }
      function charsStartIndex(strSymbols, chrSymbols) {
        var index = -1,
            length = strSymbols.length;
        while (++index < length && baseIndexOf(chrSymbols, strSymbols[index], 0) > -1) {}
        return index;
      }
      function charsEndIndex(strSymbols, chrSymbols) {
        var index = strSymbols.length;
        while (index-- && baseIndexOf(chrSymbols, strSymbols[index], 0) > -1) {}
        return index;
      }
      function checkGlobal(value) {
        return (value && value.Object === Object) ? value : null;
      }
      function compareAscending(value, other) {
        if (value !== other) {
          var valIsNull = value === null,
              valIsUndef = value === undefined,
              valIsReflexive = value === value;
          var othIsNull = other === null,
              othIsUndef = other === undefined,
              othIsReflexive = other === other;
          if ((value > other && !othIsNull) || !valIsReflexive || (valIsNull && !othIsUndef && othIsReflexive) || (valIsUndef && othIsReflexive)) {
            return 1;
          }
          if ((value < other && !valIsNull) || !othIsReflexive || (othIsNull && !valIsUndef && valIsReflexive) || (othIsUndef && valIsReflexive)) {
            return -1;
          }
        }
        return 0;
      }
      function compareMultiple(object, other, orders) {
        var index = -1,
            objCriteria = object.criteria,
            othCriteria = other.criteria,
            length = objCriteria.length,
            ordersLength = orders.length;
        while (++index < length) {
          var result = compareAscending(objCriteria[index], othCriteria[index]);
          if (result) {
            if (index >= ordersLength) {
              return result;
            }
            var order = orders[index];
            return result * (order == 'desc' ? -1 : 1);
          }
        }
        return object.index - other.index;
      }
      function countHolders(array, placeholder) {
        var length = array.length,
            result = 0;
        while (length--) {
          if (array[length] === placeholder) {
            result++;
          }
        }
        return result;
      }
      function deburrLetter(letter) {
        return deburredLetters[letter];
      }
      function escapeHtmlChar(chr) {
        return htmlEscapes[chr];
      }
      function escapeStringChar(chr) {
        return '\\' + stringEscapes[chr];
      }
      function indexOfNaN(array, fromIndex, fromRight) {
        var length = array.length,
            index = fromIndex + (fromRight ? 0 : -1);
        while ((fromRight ? index-- : ++index < length)) {
          var other = array[index];
          if (other !== other) {
            return index;
          }
        }
        return -1;
      }
      function isHostObject(value) {
        var result = false;
        if (value != null && typeof value.toString != 'function') {
          try {
            result = !!(value + '');
          } catch (e) {}
        }
        return result;
      }
      function isIndex(value, length) {
        value = (typeof value == 'number' || reIsUint.test(value)) ? +value : -1;
        length = length == null ? MAX_SAFE_INTEGER : length;
        return value > -1 && value % 1 == 0 && value < length;
      }
      function iteratorToArray(iterator) {
        var data,
            result = [];
        while (!(data = iterator.next()).done) {
          result.push(data.value);
        }
        return result;
      }
      function mapToArray(map) {
        var index = -1,
            result = Array(map.size);
        map.forEach(function(value, key) {
          result[++index] = [key, value];
        });
        return result;
      }
      function replaceHolders(array, placeholder) {
        var index = -1,
            length = array.length,
            resIndex = 0,
            result = [];
        while (++index < length) {
          var value = array[index];
          if (value === placeholder || value === PLACEHOLDER) {
            array[index] = PLACEHOLDER;
            result[resIndex++] = index;
          }
        }
        return result;
      }
      function setToArray(set) {
        var index = -1,
            result = Array(set.size);
        set.forEach(function(value) {
          result[++index] = value;
        });
        return result;
      }
      function stringSize(string) {
        if (!(string && reHasComplexSymbol.test(string))) {
          return string.length;
        }
        var result = reComplexSymbol.lastIndex = 0;
        while (reComplexSymbol.test(string)) {
          result++;
        }
        return result;
      }
      function stringToArray(string) {
        return string.match(reComplexSymbol);
      }
      function unescapeHtmlChar(chr) {
        return htmlUnescapes[chr];
      }
      function runInContext(context) {
        context = context ? _.defaults({}, context, _.pick(root, contextProps)) : root;
        var Date = context.Date,
            Error = context.Error,
            Math = context.Math,
            RegExp = context.RegExp,
            TypeError = context.TypeError;
        var arrayProto = context.Array.prototype,
            objectProto = context.Object.prototype;
        var funcToString = context.Function.prototype.toString;
        var hasOwnProperty = objectProto.hasOwnProperty;
        var idCounter = 0;
        var objectCtorString = funcToString.call(Object);
        var objectToString = objectProto.toString;
        var oldDash = root._;
        var reIsNative = RegExp('^' + funcToString.call(hasOwnProperty).replace(reRegExpChar, '\\$&').replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, '$1.*?') + '$');
        var Buffer = moduleExports ? context.Buffer : undefined,
            Reflect = context.Reflect,
            Symbol = context.Symbol,
            Uint8Array = context.Uint8Array,
            clearTimeout = context.clearTimeout,
            enumerate = Reflect ? Reflect.enumerate : undefined,
            getPrototypeOf = Object.getPrototypeOf,
            getOwnPropertySymbols = Object.getOwnPropertySymbols,
            iteratorSymbol = typeof(iteratorSymbol = Symbol && Symbol.iterator) == 'symbol' ? iteratorSymbol : undefined,
            objectCreate = Object.create,
            propertyIsEnumerable = objectProto.propertyIsEnumerable,
            setTimeout = context.setTimeout,
            splice = arrayProto.splice;
        var nativeCeil = Math.ceil,
            nativeFloor = Math.floor,
            nativeIsFinite = context.isFinite,
            nativeJoin = arrayProto.join,
            nativeKeys = Object.keys,
            nativeMax = Math.max,
            nativeMin = Math.min,
            nativeParseInt = context.parseInt,
            nativeRandom = Math.random,
            nativeReverse = arrayProto.reverse;
        var Map = getNative(context, 'Map'),
            Set = getNative(context, 'Set'),
            WeakMap = getNative(context, 'WeakMap'),
            nativeCreate = getNative(Object, 'create');
        var metaMap = WeakMap && new WeakMap;
        var nonEnumShadows = !propertyIsEnumerable.call({'valueOf': 1}, 'valueOf');
        var realNames = {};
        var mapCtorString = Map ? funcToString.call(Map) : '',
            setCtorString = Set ? funcToString.call(Set) : '',
            weakMapCtorString = WeakMap ? funcToString.call(WeakMap) : '';
        var symbolProto = Symbol ? Symbol.prototype : undefined,
            symbolValueOf = symbolProto ? symbolProto.valueOf : undefined,
            symbolToString = symbolProto ? symbolProto.toString : undefined;
        function lodash(value) {
          if (isObjectLike(value) && !isArray(value) && !(value instanceof LazyWrapper)) {
            if (value instanceof LodashWrapper) {
              return value;
            }
            if (hasOwnProperty.call(value, '__wrapped__')) {
              return wrapperClone(value);
            }
          }
          return new LodashWrapper(value);
        }
        function baseLodash() {}
        function LodashWrapper(value, chainAll) {
          this.__wrapped__ = value;
          this.__actions__ = [];
          this.__chain__ = !!chainAll;
          this.__index__ = 0;
          this.__values__ = undefined;
        }
        lodash.templateSettings = {
          'escape': reEscape,
          'evaluate': reEvaluate,
          'interpolate': reInterpolate,
          'variable': '',
          'imports': {'_': lodash}
        };
        function LazyWrapper(value) {
          this.__wrapped__ = value;
          this.__actions__ = [];
          this.__dir__ = 1;
          this.__filtered__ = false;
          this.__iteratees__ = [];
          this.__takeCount__ = MAX_ARRAY_LENGTH;
          this.__views__ = [];
        }
        function lazyClone() {
          var result = new LazyWrapper(this.__wrapped__);
          result.__actions__ = copyArray(this.__actions__);
          result.__dir__ = this.__dir__;
          result.__filtered__ = this.__filtered__;
          result.__iteratees__ = copyArray(this.__iteratees__);
          result.__takeCount__ = this.__takeCount__;
          result.__views__ = copyArray(this.__views__);
          return result;
        }
        function lazyReverse() {
          if (this.__filtered__) {
            var result = new LazyWrapper(this);
            result.__dir__ = -1;
            result.__filtered__ = true;
          } else {
            result = this.clone();
            result.__dir__ *= -1;
          }
          return result;
        }
        function lazyValue() {
          var array = this.__wrapped__.value(),
              dir = this.__dir__,
              isArr = isArray(array),
              isRight = dir < 0,
              arrLength = isArr ? array.length : 0,
              view = getView(0, arrLength, this.__views__),
              start = view.start,
              end = view.end,
              length = end - start,
              index = isRight ? end : (start - 1),
              iteratees = this.__iteratees__,
              iterLength = iteratees.length,
              resIndex = 0,
              takeCount = nativeMin(length, this.__takeCount__);
          if (!isArr || arrLength < LARGE_ARRAY_SIZE || (arrLength == length && takeCount == length)) {
            return baseWrapperValue(array, this.__actions__);
          }
          var result = [];
          outer: while (length-- && resIndex < takeCount) {
            index += dir;
            var iterIndex = -1,
                value = array[index];
            while (++iterIndex < iterLength) {
              var data = iteratees[iterIndex],
                  iteratee = data.iteratee,
                  type = data.type,
                  computed = iteratee(value);
              if (type == LAZY_MAP_FLAG) {
                value = computed;
              } else if (!computed) {
                if (type == LAZY_FILTER_FLAG) {
                  continue outer;
                } else {
                  break outer;
                }
              }
            }
            result[resIndex++] = value;
          }
          return result;
        }
        function Hash() {}
        function hashDelete(hash, key) {
          return hashHas(hash, key) && delete hash[key];
        }
        function hashGet(hash, key) {
          if (nativeCreate) {
            var result = hash[key];
            return result === HASH_UNDEFINED ? undefined : result;
          }
          return hasOwnProperty.call(hash, key) ? hash[key] : undefined;
        }
        function hashHas(hash, key) {
          return nativeCreate ? hash[key] !== undefined : hasOwnProperty.call(hash, key);
        }
        function hashSet(hash, key, value) {
          hash[key] = (nativeCreate && value === undefined) ? HASH_UNDEFINED : value;
        }
        function MapCache(values) {
          var index = -1,
              length = values ? values.length : 0;
          this.clear();
          while (++index < length) {
            var entry = values[index];
            this.set(entry[0], entry[1]);
          }
        }
        function mapClear() {
          this.__data__ = {
            'hash': new Hash,
            'map': Map ? new Map : [],
            'string': new Hash
          };
        }
        function mapDelete(key) {
          var data = this.__data__;
          if (isKeyable(key)) {
            return hashDelete(typeof key == 'string' ? data.string : data.hash, key);
          }
          return Map ? data.map['delete'](key) : assocDelete(data.map, key);
        }
        function mapGet(key) {
          var data = this.__data__;
          if (isKeyable(key)) {
            return hashGet(typeof key == 'string' ? data.string : data.hash, key);
          }
          return Map ? data.map.get(key) : assocGet(data.map, key);
        }
        function mapHas(key) {
          var data = this.__data__;
          if (isKeyable(key)) {
            return hashHas(typeof key == 'string' ? data.string : data.hash, key);
          }
          return Map ? data.map.has(key) : assocHas(data.map, key);
        }
        function mapSet(key, value) {
          var data = this.__data__;
          if (isKeyable(key)) {
            hashSet(typeof key == 'string' ? data.string : data.hash, key, value);
          } else if (Map) {
            data.map.set(key, value);
          } else {
            assocSet(data.map, key, value);
          }
          return this;
        }
        function SetCache(values) {
          var index = -1,
              length = values ? values.length : 0;
          this.__data__ = new MapCache;
          while (++index < length) {
            this.push(values[index]);
          }
        }
        function cacheHas(cache, value) {
          var map = cache.__data__;
          if (isKeyable(value)) {
            var data = map.__data__,
                hash = typeof value == 'string' ? data.string : data.hash;
            return hash[value] === HASH_UNDEFINED;
          }
          return map.has(value);
        }
        function cachePush(value) {
          var map = this.__data__;
          if (isKeyable(value)) {
            var data = map.__data__,
                hash = typeof value == 'string' ? data.string : data.hash;
            hash[value] = HASH_UNDEFINED;
          } else {
            map.set(value, HASH_UNDEFINED);
          }
        }
        function Stack(values) {
          var index = -1,
              length = values ? values.length : 0;
          this.clear();
          while (++index < length) {
            var entry = values[index];
            this.set(entry[0], entry[1]);
          }
        }
        function stackClear() {
          this.__data__ = {
            'array': [],
            'map': null
          };
        }
        function stackDelete(key) {
          var data = this.__data__,
              array = data.array;
          return array ? assocDelete(array, key) : data.map['delete'](key);
        }
        function stackGet(key) {
          var data = this.__data__,
              array = data.array;
          return array ? assocGet(array, key) : data.map.get(key);
        }
        function stackHas(key) {
          var data = this.__data__,
              array = data.array;
          return array ? assocHas(array, key) : data.map.has(key);
        }
        function stackSet(key, value) {
          var data = this.__data__,
              array = data.array;
          if (array) {
            if (array.length < (LARGE_ARRAY_SIZE - 1)) {
              assocSet(array, key, value);
            } else {
              data.array = null;
              data.map = new MapCache(array);
            }
          }
          var map = data.map;
          if (map) {
            map.set(key, value);
          }
          return this;
        }
        function assocDelete(array, key) {
          var index = assocIndexOf(array, key);
          if (index < 0) {
            return false;
          }
          var lastIndex = array.length - 1;
          if (index == lastIndex) {
            array.pop();
          } else {
            splice.call(array, index, 1);
          }
          return true;
        }
        function assocGet(array, key) {
          var index = assocIndexOf(array, key);
          return index < 0 ? undefined : array[index][1];
        }
        function assocHas(array, key) {
          return assocIndexOf(array, key) > -1;
        }
        function assocIndexOf(array, key) {
          var length = array.length;
          while (length--) {
            if (eq(array[length][0], key)) {
              return length;
            }
          }
          return -1;
        }
        function assocSet(array, key, value) {
          var index = assocIndexOf(array, key);
          if (index < 0) {
            array.push([key, value]);
          } else {
            array[index][1] = value;
          }
        }
        function assignInDefaults(objValue, srcValue, key, object) {
          if (objValue === undefined || (eq(objValue, objectProto[key]) && !hasOwnProperty.call(object, key))) {
            return srcValue;
          }
          return objValue;
        }
        function assignMergeValue(object, key, value) {
          if ((value !== undefined && !eq(object[key], value)) || (typeof key == 'number' && value === undefined && !(key in object))) {
            object[key] = value;
          }
        }
        function assignValue(object, key, value) {
          var objValue = object[key];
          if (!(hasOwnProperty.call(object, key) && eq(objValue, value)) || (value === undefined && !(key in object))) {
            object[key] = value;
          }
        }
        function baseAggregator(collection, setter, iteratee, accumulator) {
          baseEach(collection, function(value, key, collection) {
            setter(accumulator, value, iteratee(value), collection);
          });
          return accumulator;
        }
        function baseAssign(object, source) {
          return object && copyObject(source, keys(source), object);
        }
        function baseAt(object, paths) {
          var index = -1,
              isNil = object == null,
              length = paths.length,
              result = Array(length);
          while (++index < length) {
            result[index] = isNil ? undefined : get(object, paths[index]);
          }
          return result;
        }
        function baseCastArrayLikeObject(value) {
          return isArrayLikeObject(value) ? value : [];
        }
        function baseCastFunction(value) {
          return typeof value == 'function' ? value : identity;
        }
        function baseCastPath(value) {
          return isArray(value) ? value : stringToPath(value);
        }
        function baseClamp(number, lower, upper) {
          if (number === number) {
            if (upper !== undefined) {
              number = number <= upper ? number : upper;
            }
            if (lower !== undefined) {
              number = number >= lower ? number : lower;
            }
          }
          return number;
        }
        function baseClone(value, isDeep, isFull, customizer, key, object, stack) {
          var result;
          if (customizer) {
            result = object ? customizer(value, key, object, stack) : customizer(value);
          }
          if (result !== undefined) {
            return result;
          }
          if (!isObject(value)) {
            return value;
          }
          var isArr = isArray(value);
          if (isArr) {
            result = initCloneArray(value);
            if (!isDeep) {
              return copyArray(value, result);
            }
          } else {
            var tag = getTag(value),
                isFunc = tag == funcTag || tag == genTag;
            if (isBuffer(value)) {
              return cloneBuffer(value, isDeep);
            }
            if (tag == objectTag || tag == argsTag || (isFunc && !object)) {
              if (isHostObject(value)) {
                return object ? value : {};
              }
              result = initCloneObject(isFunc ? {} : value);
              if (!isDeep) {
                result = baseAssign(result, value);
                return isFull ? copySymbols(value, result) : result;
              }
            } else {
              if (!cloneableTags[tag]) {
                return object ? value : {};
              }
              result = initCloneByTag(value, tag, isDeep);
            }
          }
          stack || (stack = new Stack);
          var stacked = stack.get(value);
          if (stacked) {
            return stacked;
          }
          stack.set(value, result);
          (isArr ? arrayEach : baseForOwn)(value, function(subValue, key) {
            assignValue(result, key, baseClone(subValue, isDeep, isFull, customizer, key, value, stack));
          });
          return (isFull && !isArr) ? copySymbols(value, result) : result;
        }
        function baseConforms(source) {
          var props = keys(source),
              length = props.length;
          return function(object) {
            if (object == null) {
              return !length;
            }
            var index = length;
            while (index--) {
              var key = props[index],
                  predicate = source[key],
                  value = object[key];
              if ((value === undefined && !(key in Object(object))) || !predicate(value)) {
                return false;
              }
            }
            return true;
          };
        }
        function baseCreate(proto) {
          return isObject(proto) ? objectCreate(proto) : {};
        }
        function baseDelay(func, wait, args) {
          if (typeof func != 'function') {
            throw new TypeError(FUNC_ERROR_TEXT);
          }
          return setTimeout(function() {
            func.apply(undefined, args);
          }, wait);
        }
        function baseDifference(array, values, iteratee, comparator) {
          var index = -1,
              includes = arrayIncludes,
              isCommon = true,
              length = array.length,
              result = [],
              valuesLength = values.length;
          if (!length) {
            return result;
          }
          if (iteratee) {
            values = arrayMap(values, baseUnary(iteratee));
          }
          if (comparator) {
            includes = arrayIncludesWith;
            isCommon = false;
          } else if (values.length >= LARGE_ARRAY_SIZE) {
            includes = cacheHas;
            isCommon = false;
            values = new SetCache(values);
          }
          outer: while (++index < length) {
            var value = array[index],
                computed = iteratee ? iteratee(value) : value;
            if (isCommon && computed === computed) {
              var valuesIndex = valuesLength;
              while (valuesIndex--) {
                if (values[valuesIndex] === computed) {
                  continue outer;
                }
              }
              result.push(value);
            } else if (!includes(values, computed, comparator)) {
              result.push(value);
            }
          }
          return result;
        }
        var baseEach = createBaseEach(baseForOwn);
        var baseEachRight = createBaseEach(baseForOwnRight, true);
        function baseEvery(collection, predicate) {
          var result = true;
          baseEach(collection, function(value, index, collection) {
            result = !!predicate(value, index, collection);
            return result;
          });
          return result;
        }
        function baseFill(array, value, start, end) {
          var length = array.length;
          start = toInteger(start);
          if (start < 0) {
            start = -start > length ? 0 : (length + start);
          }
          end = (end === undefined || end > length) ? length : toInteger(end);
          if (end < 0) {
            end += length;
          }
          end = start > end ? 0 : toLength(end);
          while (start < end) {
            array[start++] = value;
          }
          return array;
        }
        function baseFilter(collection, predicate) {
          var result = [];
          baseEach(collection, function(value, index, collection) {
            if (predicate(value, index, collection)) {
              result.push(value);
            }
          });
          return result;
        }
        function baseFlatten(array, depth, isStrict, result) {
          result || (result = []);
          var index = -1,
              length = array.length;
          while (++index < length) {
            var value = array[index];
            if (depth > 0 && isArrayLikeObject(value) && (isStrict || isArray(value) || isArguments(value))) {
              if (depth > 1) {
                baseFlatten(value, depth - 1, isStrict, result);
              } else {
                arrayPush(result, value);
              }
            } else if (!isStrict) {
              result[result.length] = value;
            }
          }
          return result;
        }
        var baseFor = createBaseFor();
        var baseForRight = createBaseFor(true);
        function baseForIn(object, iteratee) {
          return object == null ? object : baseFor(object, iteratee, keysIn);
        }
        function baseForOwn(object, iteratee) {
          return object && baseFor(object, iteratee, keys);
        }
        function baseForOwnRight(object, iteratee) {
          return object && baseForRight(object, iteratee, keys);
        }
        function baseFunctions(object, props) {
          return arrayFilter(props, function(key) {
            return isFunction(object[key]);
          });
        }
        function baseGet(object, path) {
          path = isKey(path, object) ? [path + ''] : baseCastPath(path);
          var index = 0,
              length = path.length;
          while (object != null && index < length) {
            object = object[path[index++]];
          }
          return (index && index == length) ? object : undefined;
        }
        function baseHas(object, key) {
          return hasOwnProperty.call(object, key) || (typeof object == 'object' && key in object && getPrototypeOf(object) === null);
        }
        function baseHasIn(object, key) {
          return key in Object(object);
        }
        function baseInRange(number, start, end) {
          return number >= nativeMin(start, end) && number < nativeMax(start, end);
        }
        function baseIntersection(arrays, iteratee, comparator) {
          var includes = comparator ? arrayIncludesWith : arrayIncludes,
              length = arrays[0].length,
              othLength = arrays.length,
              othIndex = othLength,
              caches = Array(othLength),
              maxLength = Infinity,
              result = [];
          while (othIndex--) {
            var array = arrays[othIndex];
            if (othIndex && iteratee) {
              array = arrayMap(array, baseUnary(iteratee));
            }
            maxLength = nativeMin(array.length, maxLength);
            caches[othIndex] = !comparator && (iteratee || (length >= 120 && array.length >= 120)) ? new SetCache(othIndex && array) : undefined;
          }
          array = arrays[0];
          var index = -1,
              seen = caches[0];
          outer: while (++index < length && result.length < maxLength) {
            var value = array[index],
                computed = iteratee ? iteratee(value) : value;
            if (!(seen ? cacheHas(seen, computed) : includes(result, computed, comparator))) {
              othIndex = othLength;
              while (--othIndex) {
                var cache = caches[othIndex];
                if (!(cache ? cacheHas(cache, computed) : includes(arrays[othIndex], computed, comparator))) {
                  continue outer;
                }
              }
              if (seen) {
                seen.push(computed);
              }
              result.push(value);
            }
          }
          return result;
        }
        function baseInverter(object, setter, iteratee, accumulator) {
          baseForOwn(object, function(value, key, object) {
            setter(accumulator, iteratee(value), key, object);
          });
          return accumulator;
        }
        function baseInvoke(object, path, args) {
          if (!isKey(path, object)) {
            path = baseCastPath(path);
            object = parent(object, path);
            path = last(path);
          }
          var func = object == null ? object : object[path];
          return func == null ? undefined : apply(func, object, args);
        }
        function baseIsEqual(value, other, customizer, bitmask, stack) {
          if (value === other) {
            return true;
          }
          if (value == null || other == null || (!isObject(value) && !isObjectLike(other))) {
            return value !== value && other !== other;
          }
          return baseIsEqualDeep(value, other, baseIsEqual, customizer, bitmask, stack);
        }
        function baseIsEqualDeep(object, other, equalFunc, customizer, bitmask, stack) {
          var objIsArr = isArray(object),
              othIsArr = isArray(other),
              objTag = arrayTag,
              othTag = arrayTag;
          if (!objIsArr) {
            objTag = getTag(object);
            objTag = objTag == argsTag ? objectTag : objTag;
          }
          if (!othIsArr) {
            othTag = getTag(other);
            othTag = othTag == argsTag ? objectTag : othTag;
          }
          var objIsObj = objTag == objectTag && !isHostObject(object),
              othIsObj = othTag == objectTag && !isHostObject(other),
              isSameTag = objTag == othTag;
          if (isSameTag && !objIsObj) {
            stack || (stack = new Stack);
            return (objIsArr || isTypedArray(object)) ? equalArrays(object, other, equalFunc, customizer, bitmask, stack) : equalByTag(object, other, objTag, equalFunc, customizer, bitmask, stack);
          }
          if (!(bitmask & PARTIAL_COMPARE_FLAG)) {
            var objIsWrapped = objIsObj && hasOwnProperty.call(object, '__wrapped__'),
                othIsWrapped = othIsObj && hasOwnProperty.call(other, '__wrapped__');
            if (objIsWrapped || othIsWrapped) {
              stack || (stack = new Stack);
              return equalFunc(objIsWrapped ? object.value() : object, othIsWrapped ? other.value() : other, customizer, bitmask, stack);
            }
          }
          if (!isSameTag) {
            return false;
          }
          stack || (stack = new Stack);
          return equalObjects(object, other, equalFunc, customizer, bitmask, stack);
        }
        function baseIsMatch(object, source, matchData, customizer) {
          var index = matchData.length,
              length = index,
              noCustomizer = !customizer;
          if (object == null) {
            return !length;
          }
          object = Object(object);
          while (index--) {
            var data = matchData[index];
            if ((noCustomizer && data[2]) ? data[1] !== object[data[0]] : !(data[0] in object)) {
              return false;
            }
          }
          while (++index < length) {
            data = matchData[index];
            var key = data[0],
                objValue = object[key],
                srcValue = data[1];
            if (noCustomizer && data[2]) {
              if (objValue === undefined && !(key in object)) {
                return false;
              }
            } else {
              var stack = new Stack,
                  result = customizer ? customizer(objValue, srcValue, key, object, source, stack) : undefined;
              if (!(result === undefined ? baseIsEqual(srcValue, objValue, customizer, UNORDERED_COMPARE_FLAG | PARTIAL_COMPARE_FLAG, stack) : result)) {
                return false;
              }
            }
          }
          return true;
        }
        function baseIteratee(value) {
          var type = typeof value;
          if (type == 'function') {
            return value;
          }
          if (value == null) {
            return identity;
          }
          if (type == 'object') {
            return isArray(value) ? baseMatchesProperty(value[0], value[1]) : baseMatches(value);
          }
          return property(value);
        }
        function baseKeys(object) {
          return nativeKeys(Object(object));
        }
        function baseKeysIn(object) {
          object = object == null ? object : Object(object);
          var result = [];
          for (var key in object) {
            result.push(key);
          }
          return result;
        }
        if (enumerate && !propertyIsEnumerable.call({'valueOf': 1}, 'valueOf')) {
          baseKeysIn = function(object) {
            return iteratorToArray(enumerate(object));
          };
        }
        function baseMap(collection, iteratee) {
          var index = -1,
              result = isArrayLike(collection) ? Array(collection.length) : [];
          baseEach(collection, function(value, key, collection) {
            result[++index] = iteratee(value, key, collection);
          });
          return result;
        }
        function baseMatches(source) {
          var matchData = getMatchData(source);
          if (matchData.length == 1 && matchData[0][2]) {
            var key = matchData[0][0],
                value = matchData[0][1];
            return function(object) {
              if (object == null) {
                return false;
              }
              return object[key] === value && (value !== undefined || (key in Object(object)));
            };
          }
          return function(object) {
            return object === source || baseIsMatch(object, source, matchData);
          };
        }
        function baseMatchesProperty(path, srcValue) {
          return function(object) {
            var objValue = get(object, path);
            return (objValue === undefined && objValue === srcValue) ? hasIn(object, path) : baseIsEqual(srcValue, objValue, undefined, UNORDERED_COMPARE_FLAG | PARTIAL_COMPARE_FLAG);
          };
        }
        function baseMerge(object, source, srcIndex, customizer, stack) {
          if (object === source) {
            return;
          }
          var props = (isArray(source) || isTypedArray(source)) ? undefined : keysIn(source);
          arrayEach(props || source, function(srcValue, key) {
            if (props) {
              key = srcValue;
              srcValue = source[key];
            }
            if (isObject(srcValue)) {
              stack || (stack = new Stack);
              baseMergeDeep(object, source, key, srcIndex, baseMerge, customizer, stack);
            } else {
              var newValue = customizer ? customizer(object[key], srcValue, (key + ''), object, source, stack) : undefined;
              if (newValue === undefined) {
                newValue = srcValue;
              }
              assignMergeValue(object, key, newValue);
            }
          });
        }
        function baseMergeDeep(object, source, key, srcIndex, mergeFunc, customizer, stack) {
          var objValue = object[key],
              srcValue = source[key],
              stacked = stack.get(srcValue);
          if (stacked) {
            assignMergeValue(object, key, stacked);
            return;
          }
          var newValue = customizer ? customizer(objValue, srcValue, (key + ''), object, source, stack) : undefined;
          var isCommon = newValue === undefined;
          if (isCommon) {
            newValue = srcValue;
            if (isArray(srcValue) || isTypedArray(srcValue)) {
              if (isArray(objValue)) {
                newValue = objValue;
              } else if (isArrayLikeObject(objValue)) {
                newValue = copyArray(objValue);
              } else {
                isCommon = false;
                newValue = baseClone(srcValue, !customizer);
              }
            } else if (isPlainObject(srcValue) || isArguments(srcValue)) {
              if (isArguments(objValue)) {
                newValue = toPlainObject(objValue);
              } else if (!isObject(objValue) || (srcIndex && isFunction(objValue))) {
                isCommon = false;
                newValue = baseClone(srcValue, !customizer);
              } else {
                newValue = objValue;
              }
            } else {
              isCommon = false;
            }
          }
          stack.set(srcValue, newValue);
          if (isCommon) {
            mergeFunc(newValue, srcValue, srcIndex, customizer, stack);
          }
          stack['delete'](srcValue);
          assignMergeValue(object, key, newValue);
        }
        function baseOrderBy(collection, iteratees, orders) {
          var index = -1;
          iteratees = arrayMap(iteratees.length ? iteratees : Array(1), getIteratee());
          var result = baseMap(collection, function(value, key, collection) {
            var criteria = arrayMap(iteratees, function(iteratee) {
              return iteratee(value);
            });
            return {
              'criteria': criteria,
              'index': ++index,
              'value': value
            };
          });
          return baseSortBy(result, function(object, other) {
            return compareMultiple(object, other, orders);
          });
        }
        function basePick(object, props) {
          object = Object(object);
          return arrayReduce(props, function(result, key) {
            if (key in object) {
              result[key] = object[key];
            }
            return result;
          }, {});
        }
        function basePickBy(object, predicate) {
          var result = {};
          baseForIn(object, function(value, key) {
            if (predicate(value, key)) {
              result[key] = value;
            }
          });
          return result;
        }
        function baseProperty(key) {
          return function(object) {
            return object == null ? undefined : object[key];
          };
        }
        function basePropertyDeep(path) {
          return function(object) {
            return baseGet(object, path);
          };
        }
        function basePullAll(array, values, iteratee, comparator) {
          var indexOf = comparator ? baseIndexOfWith : baseIndexOf,
              index = -1,
              length = values.length,
              seen = array;
          if (iteratee) {
            seen = arrayMap(array, baseUnary(iteratee));
          }
          while (++index < length) {
            var fromIndex = 0,
                value = values[index],
                computed = iteratee ? iteratee(value) : value;
            while ((fromIndex = indexOf(seen, computed, fromIndex, comparator)) > -1) {
              if (seen !== array) {
                splice.call(seen, fromIndex, 1);
              }
              splice.call(array, fromIndex, 1);
            }
          }
          return array;
        }
        function basePullAt(array, indexes) {
          var length = array ? indexes.length : 0,
              lastIndex = length - 1;
          while (length--) {
            var index = indexes[length];
            if (lastIndex == length || index != previous) {
              var previous = index;
              if (isIndex(index)) {
                splice.call(array, index, 1);
              } else if (!isKey(index, array)) {
                var path = baseCastPath(index),
                    object = parent(array, path);
                if (object != null) {
                  delete object[last(path)];
                }
              } else {
                delete array[index];
              }
            }
          }
          return array;
        }
        function baseRandom(lower, upper) {
          return lower + nativeFloor(nativeRandom() * (upper - lower + 1));
        }
        function baseRange(start, end, step, fromRight) {
          var index = -1,
              length = nativeMax(nativeCeil((end - start) / (step || 1)), 0),
              result = Array(length);
          while (length--) {
            result[fromRight ? length : ++index] = start;
            start += step;
          }
          return result;
        }
        function baseSet(object, path, value, customizer) {
          path = isKey(path, object) ? [path + ''] : baseCastPath(path);
          var index = -1,
              length = path.length,
              lastIndex = length - 1,
              nested = object;
          while (nested != null && ++index < length) {
            var key = path[index];
            if (isObject(nested)) {
              var newValue = value;
              if (index != lastIndex) {
                var objValue = nested[key];
                newValue = customizer ? customizer(objValue, key, nested) : undefined;
                if (newValue === undefined) {
                  newValue = objValue == null ? (isIndex(path[index + 1]) ? [] : {}) : objValue;
                }
              }
              assignValue(nested, key, newValue);
            }
            nested = nested[key];
          }
          return object;
        }
        var baseSetData = !metaMap ? identity : function(func, data) {
          metaMap.set(func, data);
          return func;
        };
        function baseSlice(array, start, end) {
          var index = -1,
              length = array.length;
          if (start < 0) {
            start = -start > length ? 0 : (length + start);
          }
          end = end > length ? length : end;
          if (end < 0) {
            end += length;
          }
          length = start > end ? 0 : ((end - start) >>> 0);
          start >>>= 0;
          var result = Array(length);
          while (++index < length) {
            result[index] = array[index + start];
          }
          return result;
        }
        function baseSome(collection, predicate) {
          var result;
          baseEach(collection, function(value, index, collection) {
            result = predicate(value, index, collection);
            return !result;
          });
          return !!result;
        }
        function baseSortedIndex(array, value, retHighest) {
          var low = 0,
              high = array ? array.length : low;
          if (typeof value == 'number' && value === value && high <= HALF_MAX_ARRAY_LENGTH) {
            while (low < high) {
              var mid = (low + high) >>> 1,
                  computed = array[mid];
              if ((retHighest ? (computed <= value) : (computed < value)) && computed !== null) {
                low = mid + 1;
              } else {
                high = mid;
              }
            }
            return high;
          }
          return baseSortedIndexBy(array, value, identity, retHighest);
        }
        function baseSortedIndexBy(array, value, iteratee, retHighest) {
          value = iteratee(value);
          var low = 0,
              high = array ? array.length : 0,
              valIsNaN = value !== value,
              valIsNull = value === null,
              valIsUndef = value === undefined;
          while (low < high) {
            var mid = nativeFloor((low + high) / 2),
                computed = iteratee(array[mid]),
                isDef = computed !== undefined,
                isReflexive = computed === computed;
            if (valIsNaN) {
              var setLow = isReflexive || retHighest;
            } else if (valIsNull) {
              setLow = isReflexive && isDef && (retHighest || computed != null);
            } else if (valIsUndef) {
              setLow = isReflexive && (retHighest || isDef);
            } else if (computed == null) {
              setLow = false;
            } else {
              setLow = retHighest ? (computed <= value) : (computed < value);
            }
            if (setLow) {
              low = mid + 1;
            } else {
              high = mid;
            }
          }
          return nativeMin(high, MAX_ARRAY_INDEX);
        }
        function baseSortedUniq(array) {
          return baseSortedUniqBy(array);
        }
        function baseSortedUniqBy(array, iteratee) {
          var index = 0,
              length = array.length,
              value = array[0],
              computed = iteratee ? iteratee(value) : value,
              seen = computed,
              resIndex = 1,
              result = [value];
          while (++index < length) {
            value = array[index], computed = iteratee ? iteratee(value) : value;
            if (!eq(computed, seen)) {
              seen = computed;
              result[resIndex++] = value;
            }
          }
          return result;
        }
        function baseUniq(array, iteratee, comparator) {
          var index = -1,
              includes = arrayIncludes,
              length = array.length,
              isCommon = true,
              result = [],
              seen = result;
          if (comparator) {
            isCommon = false;
            includes = arrayIncludesWith;
          } else if (length >= LARGE_ARRAY_SIZE) {
            var set = iteratee ? null : createSet(array);
            if (set) {
              return setToArray(set);
            }
            isCommon = false;
            includes = cacheHas;
            seen = new SetCache;
          } else {
            seen = iteratee ? [] : result;
          }
          outer: while (++index < length) {
            var value = array[index],
                computed = iteratee ? iteratee(value) : value;
            if (isCommon && computed === computed) {
              var seenIndex = seen.length;
              while (seenIndex--) {
                if (seen[seenIndex] === computed) {
                  continue outer;
                }
              }
              if (iteratee) {
                seen.push(computed);
              }
              result.push(value);
            } else if (!includes(seen, computed, comparator)) {
              if (seen !== result) {
                seen.push(computed);
              }
              result.push(value);
            }
          }
          return result;
        }
        function baseUnset(object, path) {
          path = isKey(path, object) ? [path + ''] : baseCastPath(path);
          object = parent(object, path);
          var key = last(path);
          return (object != null && has(object, key)) ? delete object[key] : true;
        }
        function baseUpdate(object, path, updater, customizer) {
          return baseSet(object, path, updater(baseGet(object, path)), customizer);
        }
        function baseWhile(array, predicate, isDrop, fromRight) {
          var length = array.length,
              index = fromRight ? length : -1;
          while ((fromRight ? index-- : ++index < length) && predicate(array[index], index, array)) {}
          return isDrop ? baseSlice(array, (fromRight ? 0 : index), (fromRight ? index + 1 : length)) : baseSlice(array, (fromRight ? index + 1 : 0), (fromRight ? length : index));
        }
        function baseWrapperValue(value, actions) {
          var result = value;
          if (result instanceof LazyWrapper) {
            result = result.value();
          }
          return arrayReduce(actions, function(result, action) {
            return action.func.apply(action.thisArg, arrayPush([result], action.args));
          }, result);
        }
        function baseXor(arrays, iteratee, comparator) {
          var index = -1,
              length = arrays.length;
          while (++index < length) {
            var result = result ? arrayPush(baseDifference(result, arrays[index], iteratee, comparator), baseDifference(arrays[index], result, iteratee, comparator)) : arrays[index];
          }
          return (result && result.length) ? baseUniq(result, iteratee, comparator) : [];
        }
        function baseZipObject(props, values, assignFunc) {
          var index = -1,
              length = props.length,
              valsLength = values.length,
              result = {};
          while (++index < length) {
            assignFunc(result, props[index], index < valsLength ? values[index] : undefined);
          }
          return result;
        }
        function cloneBuffer(buffer, isDeep) {
          if (isDeep) {
            return buffer.slice();
          }
          var result = new buffer.constructor(buffer.length);
          buffer.copy(result);
          return result;
        }
        function cloneArrayBuffer(arrayBuffer) {
          var result = new arrayBuffer.constructor(arrayBuffer.byteLength);
          new Uint8Array(result).set(new Uint8Array(arrayBuffer));
          return result;
        }
        function cloneMap(map) {
          return arrayReduce(mapToArray(map), addMapEntry, new map.constructor);
        }
        function cloneRegExp(regexp) {
          var result = new regexp.constructor(regexp.source, reFlags.exec(regexp));
          result.lastIndex = regexp.lastIndex;
          return result;
        }
        function cloneSet(set) {
          return arrayReduce(setToArray(set), addSetEntry, new set.constructor);
        }
        function cloneSymbol(symbol) {
          return symbolValueOf ? Object(symbolValueOf.call(symbol)) : {};
        }
        function cloneTypedArray(typedArray, isDeep) {
          var buffer = isDeep ? cloneArrayBuffer(typedArray.buffer) : typedArray.buffer;
          return new typedArray.constructor(buffer, typedArray.byteOffset, typedArray.length);
        }
        function composeArgs(args, partials, holders, isCurried) {
          var argsIndex = -1,
              argsLength = args.length,
              holdersLength = holders.length,
              leftIndex = -1,
              leftLength = partials.length,
              rangeLength = nativeMax(argsLength - holdersLength, 0),
              result = Array(leftLength + rangeLength),
              isUncurried = !isCurried;
          while (++leftIndex < leftLength) {
            result[leftIndex] = partials[leftIndex];
          }
          while (++argsIndex < holdersLength) {
            if (isUncurried || argsIndex < argsLength) {
              result[holders[argsIndex]] = args[argsIndex];
            }
          }
          while (rangeLength--) {
            result[leftIndex++] = args[argsIndex++];
          }
          return result;
        }
        function composeArgsRight(args, partials, holders, isCurried) {
          var argsIndex = -1,
              argsLength = args.length,
              holdersIndex = -1,
              holdersLength = holders.length,
              rightIndex = -1,
              rightLength = partials.length,
              rangeLength = nativeMax(argsLength - holdersLength, 0),
              result = Array(rangeLength + rightLength),
              isUncurried = !isCurried;
          while (++argsIndex < rangeLength) {
            result[argsIndex] = args[argsIndex];
          }
          var offset = argsIndex;
          while (++rightIndex < rightLength) {
            result[offset + rightIndex] = partials[rightIndex];
          }
          while (++holdersIndex < holdersLength) {
            if (isUncurried || argsIndex < argsLength) {
              result[offset + holders[holdersIndex]] = args[argsIndex++];
            }
          }
          return result;
        }
        function copyArray(source, array) {
          var index = -1,
              length = source.length;
          array || (array = Array(length));
          while (++index < length) {
            array[index] = source[index];
          }
          return array;
        }
        function copyObject(source, props, object) {
          return copyObjectWith(source, props, object);
        }
        function copyObjectWith(source, props, object, customizer) {
          object || (object = {});
          var index = -1,
              length = props.length;
          while (++index < length) {
            var key = props[index];
            var newValue = customizer ? customizer(object[key], source[key], key, object, source) : source[key];
            assignValue(object, key, newValue);
          }
          return object;
        }
        function copySymbols(source, object) {
          return copyObject(source, getSymbols(source), object);
        }
        function createAggregator(setter, initializer) {
          return function(collection, iteratee) {
            var func = isArray(collection) ? arrayAggregator : baseAggregator,
                accumulator = initializer ? initializer() : {};
            return func(collection, setter, getIteratee(iteratee), accumulator);
          };
        }
        function createAssigner(assigner) {
          return rest(function(object, sources) {
            var index = -1,
                length = sources.length,
                customizer = length > 1 ? sources[length - 1] : undefined,
                guard = length > 2 ? sources[2] : undefined;
            customizer = typeof customizer == 'function' ? (length--, customizer) : undefined;
            if (guard && isIterateeCall(sources[0], sources[1], guard)) {
              customizer = length < 3 ? undefined : customizer;
              length = 1;
            }
            object = Object(object);
            while (++index < length) {
              var source = sources[index];
              if (source) {
                assigner(object, source, index, customizer);
              }
            }
            return object;
          });
        }
        function createBaseEach(eachFunc, fromRight) {
          return function(collection, iteratee) {
            if (collection == null) {
              return collection;
            }
            if (!isArrayLike(collection)) {
              return eachFunc(collection, iteratee);
            }
            var length = collection.length,
                index = fromRight ? length : -1,
                iterable = Object(collection);
            while ((fromRight ? index-- : ++index < length)) {
              if (iteratee(iterable[index], index, iterable) === false) {
                break;
              }
            }
            return collection;
          };
        }
        function createBaseFor(fromRight) {
          return function(object, iteratee, keysFunc) {
            var index = -1,
                iterable = Object(object),
                props = keysFunc(object),
                length = props.length;
            while (length--) {
              var key = props[fromRight ? length : ++index];
              if (iteratee(iterable[key], key, iterable) === false) {
                break;
              }
            }
            return object;
          };
        }
        function createBaseWrapper(func, bitmask, thisArg) {
          var isBind = bitmask & BIND_FLAG,
              Ctor = createCtorWrapper(func);
          function wrapper() {
            var fn = (this && this !== root && this instanceof wrapper) ? Ctor : func;
            return fn.apply(isBind ? thisArg : this, arguments);
          }
          return wrapper;
        }
        function createCaseFirst(methodName) {
          return function(string) {
            string = toString(string);
            var strSymbols = reHasComplexSymbol.test(string) ? stringToArray(string) : undefined;
            var chr = strSymbols ? strSymbols[0] : string.charAt(0),
                trailing = strSymbols ? strSymbols.slice(1).join('') : string.slice(1);
            return chr[methodName]() + trailing;
          };
        }
        function createCompounder(callback) {
          return function(string) {
            return arrayReduce(words(deburr(string)), callback, '');
          };
        }
        function createCtorWrapper(Ctor) {
          return function() {
            var args = arguments;
            switch (args.length) {
              case 0:
                return new Ctor;
              case 1:
                return new Ctor(args[0]);
              case 2:
                return new Ctor(args[0], args[1]);
              case 3:
                return new Ctor(args[0], args[1], args[2]);
              case 4:
                return new Ctor(args[0], args[1], args[2], args[3]);
              case 5:
                return new Ctor(args[0], args[1], args[2], args[3], args[4]);
              case 6:
                return new Ctor(args[0], args[1], args[2], args[3], args[4], args[5]);
              case 7:
                return new Ctor(args[0], args[1], args[2], args[3], args[4], args[5], args[6]);
            }
            var thisBinding = baseCreate(Ctor.prototype),
                result = Ctor.apply(thisBinding, args);
            return isObject(result) ? result : thisBinding;
          };
        }
        function createCurryWrapper(func, bitmask, arity) {
          var Ctor = createCtorWrapper(func);
          function wrapper() {
            var length = arguments.length,
                args = Array(length),
                index = length,
                placeholder = getPlaceholder(wrapper);
            while (index--) {
              args[index] = arguments[index];
            }
            var holders = (length < 3 && args[0] !== placeholder && args[length - 1] !== placeholder) ? [] : replaceHolders(args, placeholder);
            length -= holders.length;
            if (length < arity) {
              return createRecurryWrapper(func, bitmask, createHybridWrapper, wrapper.placeholder, undefined, args, holders, undefined, undefined, arity - length);
            }
            var fn = (this && this !== root && this instanceof wrapper) ? Ctor : func;
            return apply(fn, this, args);
          }
          return wrapper;
        }
        function createFlow(fromRight) {
          return rest(function(funcs) {
            funcs = baseFlatten(funcs, 1);
            var length = funcs.length,
                index = length,
                prereq = LodashWrapper.prototype.thru;
            if (fromRight) {
              funcs.reverse();
            }
            while (index--) {
              var func = funcs[index];
              if (typeof func != 'function') {
                throw new TypeError(FUNC_ERROR_TEXT);
              }
              if (prereq && !wrapper && getFuncName(func) == 'wrapper') {
                var wrapper = new LodashWrapper([], true);
              }
            }
            index = wrapper ? index : length;
            while (++index < length) {
              func = funcs[index];
              var funcName = getFuncName(func),
                  data = funcName == 'wrapper' ? getData(func) : undefined;
              if (data && isLaziable(data[0]) && data[1] == (ARY_FLAG | CURRY_FLAG | PARTIAL_FLAG | REARG_FLAG) && !data[4].length && data[9] == 1) {
                wrapper = wrapper[getFuncName(data[0])].apply(wrapper, data[3]);
              } else {
                wrapper = (func.length == 1 && isLaziable(func)) ? wrapper[funcName]() : wrapper.thru(func);
              }
            }
            return function() {
              var args = arguments,
                  value = args[0];
              if (wrapper && args.length == 1 && isArray(value) && value.length >= LARGE_ARRAY_SIZE) {
                return wrapper.plant(value).value();
              }
              var index = 0,
                  result = length ? funcs[index].apply(this, args) : value;
              while (++index < length) {
                result = funcs[index].call(this, result);
              }
              return result;
            };
          });
        }
        function createHybridWrapper(func, bitmask, thisArg, partials, holders, partialsRight, holdersRight, argPos, ary, arity) {
          var isAry = bitmask & ARY_FLAG,
              isBind = bitmask & BIND_FLAG,
              isBindKey = bitmask & BIND_KEY_FLAG,
              isCurried = bitmask & (CURRY_FLAG | CURRY_RIGHT_FLAG),
              isFlip = bitmask & FLIP_FLAG,
              Ctor = isBindKey ? undefined : createCtorWrapper(func);
          function wrapper() {
            var length = arguments.length,
                index = length,
                args = Array(length);
            while (index--) {
              args[index] = arguments[index];
            }
            if (isCurried) {
              var placeholder = getPlaceholder(wrapper),
                  holdersCount = countHolders(args, placeholder);
            }
            if (partials) {
              args = composeArgs(args, partials, holders, isCurried);
            }
            if (partialsRight) {
              args = composeArgsRight(args, partialsRight, holdersRight, isCurried);
            }
            length -= holdersCount;
            if (isCurried && length < arity) {
              var newHolders = replaceHolders(args, placeholder);
              return createRecurryWrapper(func, bitmask, createHybridWrapper, wrapper.placeholder, thisArg, args, newHolders, argPos, ary, arity - length);
            }
            var thisBinding = isBind ? thisArg : this,
                fn = isBindKey ? thisBinding[func] : func;
            length = args.length;
            if (argPos) {
              args = reorder(args, argPos);
            } else if (isFlip && length > 1) {
              args.reverse();
            }
            if (isAry && ary < length) {
              args.length = ary;
            }
            if (this && this !== root && this instanceof wrapper) {
              fn = Ctor || createCtorWrapper(fn);
            }
            return fn.apply(thisBinding, args);
          }
          return wrapper;
        }
        function createInverter(setter, toIteratee) {
          return function(object, iteratee) {
            return baseInverter(object, setter, toIteratee(iteratee), {});
          };
        }
        function createOver(arrayFunc) {
          return rest(function(iteratees) {
            iteratees = arrayMap(baseFlatten(iteratees, 1), getIteratee());
            return rest(function(args) {
              var thisArg = this;
              return arrayFunc(iteratees, function(iteratee) {
                return apply(iteratee, thisArg, args);
              });
            });
          });
        }
        function createPadding(string, length, chars) {
          length = toInteger(length);
          var strLength = stringSize(string);
          if (!length || strLength >= length) {
            return '';
          }
          var padLength = length - strLength;
          chars = chars === undefined ? ' ' : (chars + '');
          var result = repeat(chars, nativeCeil(padLength / stringSize(chars)));
          return reHasComplexSymbol.test(chars) ? stringToArray(result).slice(0, padLength).join('') : result.slice(0, padLength);
        }
        function createPartialWrapper(func, bitmask, thisArg, partials) {
          var isBind = bitmask & BIND_FLAG,
              Ctor = createCtorWrapper(func);
          function wrapper() {
            var argsIndex = -1,
                argsLength = arguments.length,
                leftIndex = -1,
                leftLength = partials.length,
                args = Array(leftLength + argsLength),
                fn = (this && this !== root && this instanceof wrapper) ? Ctor : func;
            while (++leftIndex < leftLength) {
              args[leftIndex] = partials[leftIndex];
            }
            while (argsLength--) {
              args[leftIndex++] = arguments[++argsIndex];
            }
            return apply(fn, isBind ? thisArg : this, args);
          }
          return wrapper;
        }
        function createRange(fromRight) {
          return function(start, end, step) {
            if (step && typeof step != 'number' && isIterateeCall(start, end, step)) {
              end = step = undefined;
            }
            start = toNumber(start);
            start = start === start ? start : 0;
            if (end === undefined) {
              end = start;
              start = 0;
            } else {
              end = toNumber(end) || 0;
            }
            step = step === undefined ? (start < end ? 1 : -1) : (toNumber(step) || 0);
            return baseRange(start, end, step, fromRight);
          };
        }
        function createRecurryWrapper(func, bitmask, wrapFunc, placeholder, thisArg, partials, holders, argPos, ary, arity) {
          var isCurry = bitmask & CURRY_FLAG,
              newArgPos = argPos ? copyArray(argPos) : undefined,
              newHolders = isCurry ? holders : undefined,
              newHoldersRight = isCurry ? undefined : holders,
              newPartials = isCurry ? partials : undefined,
              newPartialsRight = isCurry ? undefined : partials;
          bitmask |= (isCurry ? PARTIAL_FLAG : PARTIAL_RIGHT_FLAG);
          bitmask &= ~(isCurry ? PARTIAL_RIGHT_FLAG : PARTIAL_FLAG);
          if (!(bitmask & CURRY_BOUND_FLAG)) {
            bitmask &= ~(BIND_FLAG | BIND_KEY_FLAG);
          }
          var newData = [func, bitmask, thisArg, newPartials, newHolders, newPartialsRight, newHoldersRight, newArgPos, ary, arity];
          var result = wrapFunc.apply(undefined, newData);
          if (isLaziable(func)) {
            setData(result, newData);
          }
          result.placeholder = placeholder;
          return result;
        }
        function createRound(methodName) {
          var func = Math[methodName];
          return function(number, precision) {
            number = toNumber(number);
            precision = toInteger(precision);
            if (precision) {
              var pair = (toString(number) + 'e').split('e'),
                  value = func(pair[0] + 'e' + (+pair[1] + precision));
              pair = (toString(value) + 'e').split('e');
              return +(pair[0] + 'e' + (+pair[1] - precision));
            }
            return func(number);
          };
        }
        var createSet = !(Set && new Set([1, 2]).size === 2) ? noop : function(values) {
          return new Set(values);
        };
        function createWrapper(func, bitmask, thisArg, partials, holders, argPos, ary, arity) {
          var isBindKey = bitmask & BIND_KEY_FLAG;
          if (!isBindKey && typeof func != 'function') {
            throw new TypeError(FUNC_ERROR_TEXT);
          }
          var length = partials ? partials.length : 0;
          if (!length) {
            bitmask &= ~(PARTIAL_FLAG | PARTIAL_RIGHT_FLAG);
            partials = holders = undefined;
          }
          ary = ary === undefined ? ary : nativeMax(toInteger(ary), 0);
          arity = arity === undefined ? arity : toInteger(arity);
          length -= holders ? holders.length : 0;
          if (bitmask & PARTIAL_RIGHT_FLAG) {
            var partialsRight = partials,
                holdersRight = holders;
            partials = holders = undefined;
          }
          var data = isBindKey ? undefined : getData(func);
          var newData = [func, bitmask, thisArg, partials, holders, partialsRight, holdersRight, argPos, ary, arity];
          if (data) {
            mergeData(newData, data);
          }
          func = newData[0];
          bitmask = newData[1];
          thisArg = newData[2];
          partials = newData[3];
          holders = newData[4];
          arity = newData[9] = newData[9] == null ? (isBindKey ? 0 : func.length) : nativeMax(newData[9] - length, 0);
          if (!arity && bitmask & (CURRY_FLAG | CURRY_RIGHT_FLAG)) {
            bitmask &= ~(CURRY_FLAG | CURRY_RIGHT_FLAG);
          }
          if (!bitmask || bitmask == BIND_FLAG) {
            var result = createBaseWrapper(func, bitmask, thisArg);
          } else if (bitmask == CURRY_FLAG || bitmask == CURRY_RIGHT_FLAG) {
            result = createCurryWrapper(func, bitmask, arity);
          } else if ((bitmask == PARTIAL_FLAG || bitmask == (BIND_FLAG | PARTIAL_FLAG)) && !holders.length) {
            result = createPartialWrapper(func, bitmask, thisArg, partials);
          } else {
            result = createHybridWrapper.apply(undefined, newData);
          }
          var setter = data ? baseSetData : setData;
          return setter(result, newData);
        }
        function equalArrays(array, other, equalFunc, customizer, bitmask, stack) {
          var index = -1,
              isPartial = bitmask & PARTIAL_COMPARE_FLAG,
              isUnordered = bitmask & UNORDERED_COMPARE_FLAG,
              arrLength = array.length,
              othLength = other.length;
          if (arrLength != othLength && !(isPartial && othLength > arrLength)) {
            return false;
          }
          var stacked = stack.get(array);
          if (stacked) {
            return stacked == other;
          }
          var result = true;
          stack.set(array, other);
          while (++index < arrLength) {
            var arrValue = array[index],
                othValue = other[index];
            if (customizer) {
              var compared = isPartial ? customizer(othValue, arrValue, index, other, array, stack) : customizer(arrValue, othValue, index, array, other, stack);
            }
            if (compared !== undefined) {
              if (compared) {
                continue;
              }
              result = false;
              break;
            }
            if (isUnordered) {
              if (!arraySome(other, function(othValue) {
                return arrValue === othValue || equalFunc(arrValue, othValue, customizer, bitmask, stack);
              })) {
                result = false;
                break;
              }
            } else if (!(arrValue === othValue || equalFunc(arrValue, othValue, customizer, bitmask, stack))) {
              result = false;
              break;
            }
          }
          stack['delete'](array);
          return result;
        }
        function equalByTag(object, other, tag, equalFunc, customizer, bitmask, stack) {
          switch (tag) {
            case arrayBufferTag:
              if ((object.byteLength != other.byteLength) || !equalFunc(new Uint8Array(object), new Uint8Array(other))) {
                return false;
              }
              return true;
            case boolTag:
            case dateTag:
              return +object == +other;
            case errorTag:
              return object.name == other.name && object.message == other.message;
            case numberTag:
              return (object != +object) ? other != +other : object == +other;
            case regexpTag:
            case stringTag:
              return object == (other + '');
            case mapTag:
              var convert = mapToArray;
            case setTag:
              var isPartial = bitmask & PARTIAL_COMPARE_FLAG;
              convert || (convert = setToArray);
              if (object.size != other.size && !isPartial) {
                return false;
              }
              var stacked = stack.get(object);
              if (stacked) {
                return stacked == other;
              }
              return equalArrays(convert(object), convert(other), equalFunc, customizer, bitmask | UNORDERED_COMPARE_FLAG, stack.set(object, other));
            case symbolTag:
              if (symbolValueOf) {
                return symbolValueOf.call(object) == symbolValueOf.call(other);
              }
          }
          return false;
        }
        function equalObjects(object, other, equalFunc, customizer, bitmask, stack) {
          var isPartial = bitmask & PARTIAL_COMPARE_FLAG,
              objProps = keys(object),
              objLength = objProps.length,
              othProps = keys(other),
              othLength = othProps.length;
          if (objLength != othLength && !isPartial) {
            return false;
          }
          var index = objLength;
          while (index--) {
            var key = objProps[index];
            if (!(isPartial ? key in other : baseHas(other, key))) {
              return false;
            }
          }
          var stacked = stack.get(object);
          if (stacked) {
            return stacked == other;
          }
          var result = true;
          stack.set(object, other);
          var skipCtor = isPartial;
          while (++index < objLength) {
            key = objProps[index];
            var objValue = object[key],
                othValue = other[key];
            if (customizer) {
              var compared = isPartial ? customizer(othValue, objValue, key, other, object, stack) : customizer(objValue, othValue, key, object, other, stack);
            }
            if (!(compared === undefined ? (objValue === othValue || equalFunc(objValue, othValue, customizer, bitmask, stack)) : compared)) {
              result = false;
              break;
            }
            skipCtor || (skipCtor = key == 'constructor');
          }
          if (result && !skipCtor) {
            var objCtor = object.constructor,
                othCtor = other.constructor;
            if (objCtor != othCtor && ('constructor' in object && 'constructor' in other) && !(typeof objCtor == 'function' && objCtor instanceof objCtor && typeof othCtor == 'function' && othCtor instanceof othCtor)) {
              result = false;
            }
          }
          stack['delete'](object);
          return result;
        }
        var getData = !metaMap ? noop : function(func) {
          return metaMap.get(func);
        };
        function getFuncName(func) {
          var result = (func.name + ''),
              array = realNames[result],
              length = hasOwnProperty.call(realNames, result) ? array.length : 0;
          while (length--) {
            var data = array[length],
                otherFunc = data.func;
            if (otherFunc == null || otherFunc == func) {
              return data.name;
            }
          }
          return result;
        }
        function getIteratee() {
          var result = lodash.iteratee || iteratee;
          result = result === iteratee ? baseIteratee : result;
          return arguments.length ? result(arguments[0], arguments[1]) : result;
        }
        var getLength = baseProperty('length');
        function getMatchData(object) {
          var result = toPairs(object),
              length = result.length;
          while (length--) {
            result[length][2] = isStrictComparable(result[length][1]);
          }
          return result;
        }
        function getNative(object, key) {
          var value = object[key];
          return isNative(value) ? value : undefined;
        }
        function getPlaceholder(func) {
          var object = hasOwnProperty.call(lodash, 'placeholder') ? lodash : func;
          return object.placeholder;
        }
        var getSymbols = getOwnPropertySymbols || function() {
          return [];
        };
        function getTag(value) {
          return objectToString.call(value);
        }
        if ((Map && getTag(new Map) != mapTag) || (Set && getTag(new Set) != setTag) || (WeakMap && getTag(new WeakMap) != weakMapTag)) {
          getTag = function(value) {
            var result = objectToString.call(value),
                Ctor = result == objectTag ? value.constructor : null,
                ctorString = typeof Ctor == 'function' ? funcToString.call(Ctor) : '';
            if (ctorString) {
              switch (ctorString) {
                case mapCtorString:
                  return mapTag;
                case setCtorString:
                  return setTag;
                case weakMapCtorString:
                  return weakMapTag;
              }
            }
            return result;
          };
        }
        function getView(start, end, transforms) {
          var index = -1,
              length = transforms.length;
          while (++index < length) {
            var data = transforms[index],
                size = data.size;
            switch (data.type) {
              case 'drop':
                start += size;
                break;
              case 'dropRight':
                end -= size;
                break;
              case 'take':
                end = nativeMin(end, start + size);
                break;
              case 'takeRight':
                start = nativeMax(start, end - size);
                break;
            }
          }
          return {
            'start': start,
            'end': end
          };
        }
        function hasPath(object, path, hasFunc) {
          if (object == null) {
            return false;
          }
          var result = hasFunc(object, path);
          if (!result && !isKey(path)) {
            path = baseCastPath(path);
            object = parent(object, path);
            if (object != null) {
              path = last(path);
              result = hasFunc(object, path);
            }
          }
          var length = object ? object.length : undefined;
          return result || (!!length && isLength(length) && isIndex(path, length) && (isArray(object) || isString(object) || isArguments(object)));
        }
        function initCloneArray(array) {
          var length = array.length,
              result = array.constructor(length);
          if (length && typeof array[0] == 'string' && hasOwnProperty.call(array, 'index')) {
            result.index = array.index;
            result.input = array.input;
          }
          return result;
        }
        function initCloneObject(object) {
          return (typeof object.constructor == 'function' && !isPrototype(object)) ? baseCreate(getPrototypeOf(object)) : {};
        }
        function initCloneByTag(object, tag, isDeep) {
          var Ctor = object.constructor;
          switch (tag) {
            case arrayBufferTag:
              return cloneArrayBuffer(object);
            case boolTag:
            case dateTag:
              return new Ctor(+object);
            case float32Tag:
            case float64Tag:
            case int8Tag:
            case int16Tag:
            case int32Tag:
            case uint8Tag:
            case uint8ClampedTag:
            case uint16Tag:
            case uint32Tag:
              return cloneTypedArray(object, isDeep);
            case mapTag:
              return cloneMap(object);
            case numberTag:
            case stringTag:
              return new Ctor(object);
            case regexpTag:
              return cloneRegExp(object);
            case setTag:
              return cloneSet(object);
            case symbolTag:
              return cloneSymbol(object);
          }
        }
        function indexKeys(object) {
          var length = object ? object.length : undefined;
          if (isLength(length) && (isArray(object) || isString(object) || isArguments(object))) {
            return baseTimes(length, String);
          }
          return null;
        }
        function isIterateeCall(value, index, object) {
          if (!isObject(object)) {
            return false;
          }
          var type = typeof index;
          if (type == 'number' ? (isArrayLike(object) && isIndex(index, object.length)) : (type == 'string' && index in object)) {
            return eq(object[index], value);
          }
          return false;
        }
        function isKey(value, object) {
          if (typeof value == 'number') {
            return true;
          }
          return !isArray(value) && (reIsPlainProp.test(value) || !reIsDeepProp.test(value) || (object != null && value in Object(object)));
        }
        function isKeyable(value) {
          var type = typeof value;
          return type == 'number' || type == 'boolean' || (type == 'string' && value != '__proto__') || value == null;
        }
        function isLaziable(func) {
          var funcName = getFuncName(func),
              other = lodash[funcName];
          if (typeof other != 'function' || !(funcName in LazyWrapper.prototype)) {
            return false;
          }
          if (func === other) {
            return true;
          }
          var data = getData(other);
          return !!data && func === data[0];
        }
        function isPrototype(value) {
          var Ctor = value && value.constructor,
              proto = (typeof Ctor == 'function' && Ctor.prototype) || objectProto;
          return value === proto;
        }
        function isStrictComparable(value) {
          return value === value && !isObject(value);
        }
        function mergeData(data, source) {
          var bitmask = data[1],
              srcBitmask = source[1],
              newBitmask = bitmask | srcBitmask,
              isCommon = newBitmask < (BIND_FLAG | BIND_KEY_FLAG | ARY_FLAG);
          var isCombo = ((srcBitmask == ARY_FLAG) && (bitmask == CURRY_FLAG)) || ((srcBitmask == ARY_FLAG) && (bitmask == REARG_FLAG) && (data[7].length <= source[8])) || ((srcBitmask == (ARY_FLAG | REARG_FLAG)) && (source[7].length <= source[8]) && (bitmask == CURRY_FLAG));
          if (!(isCommon || isCombo)) {
            return data;
          }
          if (srcBitmask & BIND_FLAG) {
            data[2] = source[2];
            newBitmask |= bitmask & BIND_FLAG ? 0 : CURRY_BOUND_FLAG;
          }
          var value = source[3];
          if (value) {
            var partials = data[3];
            data[3] = partials ? composeArgs(partials, value, source[4]) : copyArray(value);
            data[4] = partials ? replaceHolders(data[3], PLACEHOLDER) : copyArray(source[4]);
          }
          value = source[5];
          if (value) {
            partials = data[5];
            data[5] = partials ? composeArgsRight(partials, value, source[6]) : copyArray(value);
            data[6] = partials ? replaceHolders(data[5], PLACEHOLDER) : copyArray(source[6]);
          }
          value = source[7];
          if (value) {
            data[7] = copyArray(value);
          }
          if (srcBitmask & ARY_FLAG) {
            data[8] = data[8] == null ? source[8] : nativeMin(data[8], source[8]);
          }
          if (data[9] == null) {
            data[9] = source[9];
          }
          data[0] = source[0];
          data[1] = newBitmask;
          return data;
        }
        function mergeDefaults(objValue, srcValue, key, object, source, stack) {
          if (isObject(objValue) && isObject(srcValue)) {
            baseMerge(objValue, srcValue, undefined, mergeDefaults, stack.set(srcValue, objValue));
          }
          return objValue;
        }
        function parent(object, path) {
          return path.length == 1 ? object : get(object, baseSlice(path, 0, -1));
        }
        function reorder(array, indexes) {
          var arrLength = array.length,
              length = nativeMin(indexes.length, arrLength),
              oldArray = copyArray(array);
          while (length--) {
            var index = indexes[length];
            array[length] = isIndex(index, arrLength) ? oldArray[index] : undefined;
          }
          return array;
        }
        var setData = (function() {
          var count = 0,
              lastCalled = 0;
          return function(key, value) {
            var stamp = now(),
                remaining = HOT_SPAN - (stamp - lastCalled);
            lastCalled = stamp;
            if (remaining > 0) {
              if (++count >= HOT_COUNT) {
                return key;
              }
            } else {
              count = 0;
            }
            return baseSetData(key, value);
          };
        }());
        function stringToPath(string) {
          var result = [];
          toString(string).replace(rePropName, function(match, number, quote, string) {
            result.push(quote ? string.replace(reEscapeChar, '$1') : (number || match));
          });
          return result;
        }
        function wrapperClone(wrapper) {
          if (wrapper instanceof LazyWrapper) {
            return wrapper.clone();
          }
          var result = new LodashWrapper(wrapper.__wrapped__, wrapper.__chain__);
          result.__actions__ = copyArray(wrapper.__actions__);
          result.__index__ = wrapper.__index__;
          result.__values__ = wrapper.__values__;
          return result;
        }
        function chunk(array, size) {
          size = nativeMax(toInteger(size), 0);
          var length = array ? array.length : 0;
          if (!length || size < 1) {
            return [];
          }
          var index = 0,
              resIndex = 0,
              result = Array(nativeCeil(length / size));
          while (index < length) {
            result[resIndex++] = baseSlice(array, index, (index += size));
          }
          return result;
        }
        function compact(array) {
          var index = -1,
              length = array ? array.length : 0,
              resIndex = 0,
              result = [];
          while (++index < length) {
            var value = array[index];
            if (value) {
              result[resIndex++] = value;
            }
          }
          return result;
        }
        var concat = rest(function(array, values) {
          if (!isArray(array)) {
            array = array == null ? [] : [Object(array)];
          }
          values = baseFlatten(values, 1);
          return arrayConcat(array, values);
        });
        var difference = rest(function(array, values) {
          return isArrayLikeObject(array) ? baseDifference(array, baseFlatten(values, 1, true)) : [];
        });
        var differenceBy = rest(function(array, values) {
          var iteratee = last(values);
          if (isArrayLikeObject(iteratee)) {
            iteratee = undefined;
          }
          return isArrayLikeObject(array) ? baseDifference(array, baseFlatten(values, 1, true), getIteratee(iteratee)) : [];
        });
        var differenceWith = rest(function(array, values) {
          var comparator = last(values);
          if (isArrayLikeObject(comparator)) {
            comparator = undefined;
          }
          return isArrayLikeObject(array) ? baseDifference(array, baseFlatten(values, 1, true), undefined, comparator) : [];
        });
        function drop(array, n, guard) {
          var length = array ? array.length : 0;
          if (!length) {
            return [];
          }
          n = (guard || n === undefined) ? 1 : toInteger(n);
          return baseSlice(array, n < 0 ? 0 : n, length);
        }
        function dropRight(array, n, guard) {
          var length = array ? array.length : 0;
          if (!length) {
            return [];
          }
          n = (guard || n === undefined) ? 1 : toInteger(n);
          n = length - n;
          return baseSlice(array, 0, n < 0 ? 0 : n);
        }
        function dropRightWhile(array, predicate) {
          return (array && array.length) ? baseWhile(array, getIteratee(predicate, 3), true, true) : [];
        }
        function dropWhile(array, predicate) {
          return (array && array.length) ? baseWhile(array, getIteratee(predicate, 3), true) : [];
        }
        function fill(array, value, start, end) {
          var length = array ? array.length : 0;
          if (!length) {
            return [];
          }
          if (start && typeof start != 'number' && isIterateeCall(array, value, start)) {
            start = 0;
            end = length;
          }
          return baseFill(array, value, start, end);
        }
        function findIndex(array, predicate) {
          return (array && array.length) ? baseFindIndex(array, getIteratee(predicate, 3)) : -1;
        }
        function findLastIndex(array, predicate) {
          return (array && array.length) ? baseFindIndex(array, getIteratee(predicate, 3), true) : -1;
        }
        function flatten(array) {
          var length = array ? array.length : 0;
          return length ? baseFlatten(array, 1) : [];
        }
        function flattenDeep(array) {
          var length = array ? array.length : 0;
          return length ? baseFlatten(array, INFINITY) : [];
        }
        function flattenDepth(array, depth) {
          var length = array ? array.length : 0;
          if (!length) {
            return [];
          }
          depth = depth === undefined ? 1 : toInteger(depth);
          return baseFlatten(array, depth);
        }
        function fromPairs(pairs) {
          var index = -1,
              length = pairs ? pairs.length : 0,
              result = {};
          while (++index < length) {
            var pair = pairs[index];
            result[pair[0]] = pair[1];
          }
          return result;
        }
        function head(array) {
          return array ? array[0] : undefined;
        }
        function indexOf(array, value, fromIndex) {
          var length = array ? array.length : 0;
          if (!length) {
            return -1;
          }
          fromIndex = toInteger(fromIndex);
          if (fromIndex < 0) {
            fromIndex = nativeMax(length + fromIndex, 0);
          }
          return baseIndexOf(array, value, fromIndex);
        }
        function initial(array) {
          return dropRight(array, 1);
        }
        var intersection = rest(function(arrays) {
          var mapped = arrayMap(arrays, baseCastArrayLikeObject);
          return (mapped.length && mapped[0] === arrays[0]) ? baseIntersection(mapped) : [];
        });
        var intersectionBy = rest(function(arrays) {
          var iteratee = last(arrays),
              mapped = arrayMap(arrays, baseCastArrayLikeObject);
          if (iteratee === last(mapped)) {
            iteratee = undefined;
          } else {
            mapped.pop();
          }
          return (mapped.length && mapped[0] === arrays[0]) ? baseIntersection(mapped, getIteratee(iteratee)) : [];
        });
        var intersectionWith = rest(function(arrays) {
          var comparator = last(arrays),
              mapped = arrayMap(arrays, baseCastArrayLikeObject);
          if (comparator === last(mapped)) {
            comparator = undefined;
          } else {
            mapped.pop();
          }
          return (mapped.length && mapped[0] === arrays[0]) ? baseIntersection(mapped, undefined, comparator) : [];
        });
        function join(array, separator) {
          return array ? nativeJoin.call(array, separator) : '';
        }
        function last(array) {
          var length = array ? array.length : 0;
          return length ? array[length - 1] : undefined;
        }
        function lastIndexOf(array, value, fromIndex) {
          var length = array ? array.length : 0;
          if (!length) {
            return -1;
          }
          var index = length;
          if (fromIndex !== undefined) {
            index = toInteger(fromIndex);
            index = (index < 0 ? nativeMax(length + index, 0) : nativeMin(index, length - 1)) + 1;
          }
          if (value !== value) {
            return indexOfNaN(array, index, true);
          }
          while (index--) {
            if (array[index] === value) {
              return index;
            }
          }
          return -1;
        }
        var pull = rest(pullAll);
        function pullAll(array, values) {
          return (array && array.length && values && values.length) ? basePullAll(array, values) : array;
        }
        function pullAllBy(array, values, iteratee) {
          return (array && array.length && values && values.length) ? basePullAll(array, values, getIteratee(iteratee)) : array;
        }
        function pullAllWith(array, values, comparator) {
          return (array && array.length && values && values.length) ? basePullAll(array, values, undefined, comparator) : array;
        }
        var pullAt = rest(function(array, indexes) {
          indexes = arrayMap(baseFlatten(indexes, 1), String);
          var result = baseAt(array, indexes);
          basePullAt(array, indexes.sort(compareAscending));
          return result;
        });
        function remove(array, predicate) {
          var result = [];
          if (!(array && array.length)) {
            return result;
          }
          var index = -1,
              indexes = [],
              length = array.length;
          predicate = getIteratee(predicate, 3);
          while (++index < length) {
            var value = array[index];
            if (predicate(value, index, array)) {
              result.push(value);
              indexes.push(index);
            }
          }
          basePullAt(array, indexes);
          return result;
        }
        function reverse(array) {
          return array ? nativeReverse.call(array) : array;
        }
        function slice(array, start, end) {
          var length = array ? array.length : 0;
          if (!length) {
            return [];
          }
          if (end && typeof end != 'number' && isIterateeCall(array, start, end)) {
            start = 0;
            end = length;
          } else {
            start = start == null ? 0 : toInteger(start);
            end = end === undefined ? length : toInteger(end);
          }
          return baseSlice(array, start, end);
        }
        function sortedIndex(array, value) {
          return baseSortedIndex(array, value);
        }
        function sortedIndexBy(array, value, iteratee) {
          return baseSortedIndexBy(array, value, getIteratee(iteratee));
        }
        function sortedIndexOf(array, value) {
          var length = array ? array.length : 0;
          if (length) {
            var index = baseSortedIndex(array, value);
            if (index < length && eq(array[index], value)) {
              return index;
            }
          }
          return -1;
        }
        function sortedLastIndex(array, value) {
          return baseSortedIndex(array, value, true);
        }
        function sortedLastIndexBy(array, value, iteratee) {
          return baseSortedIndexBy(array, value, getIteratee(iteratee), true);
        }
        function sortedLastIndexOf(array, value) {
          var length = array ? array.length : 0;
          if (length) {
            var index = baseSortedIndex(array, value, true) - 1;
            if (eq(array[index], value)) {
              return index;
            }
          }
          return -1;
        }
        function sortedUniq(array) {
          return (array && array.length) ? baseSortedUniq(array) : [];
        }
        function sortedUniqBy(array, iteratee) {
          return (array && array.length) ? baseSortedUniqBy(array, getIteratee(iteratee)) : [];
        }
        function tail(array) {
          return drop(array, 1);
        }
        function take(array, n, guard) {
          if (!(array && array.length)) {
            return [];
          }
          n = (guard || n === undefined) ? 1 : toInteger(n);
          return baseSlice(array, 0, n < 0 ? 0 : n);
        }
        function takeRight(array, n, guard) {
          var length = array ? array.length : 0;
          if (!length) {
            return [];
          }
          n = (guard || n === undefined) ? 1 : toInteger(n);
          n = length - n;
          return baseSlice(array, n < 0 ? 0 : n, length);
        }
        function takeRightWhile(array, predicate) {
          return (array && array.length) ? baseWhile(array, getIteratee(predicate, 3), false, true) : [];
        }
        function takeWhile(array, predicate) {
          return (array && array.length) ? baseWhile(array, getIteratee(predicate, 3)) : [];
        }
        var union = rest(function(arrays) {
          return baseUniq(baseFlatten(arrays, 1, true));
        });
        var unionBy = rest(function(arrays) {
          var iteratee = last(arrays);
          if (isArrayLikeObject(iteratee)) {
            iteratee = undefined;
          }
          return baseUniq(baseFlatten(arrays, 1, true), getIteratee(iteratee));
        });
        var unionWith = rest(function(arrays) {
          var comparator = last(arrays);
          if (isArrayLikeObject(comparator)) {
            comparator = undefined;
          }
          return baseUniq(baseFlatten(arrays, 1, true), undefined, comparator);
        });
        function uniq(array) {
          return (array && array.length) ? baseUniq(array) : [];
        }
        function uniqBy(array, iteratee) {
          return (array && array.length) ? baseUniq(array, getIteratee(iteratee)) : [];
        }
        function uniqWith(array, comparator) {
          return (array && array.length) ? baseUniq(array, undefined, comparator) : [];
        }
        function unzip(array) {
          if (!(array && array.length)) {
            return [];
          }
          var length = 0;
          array = arrayFilter(array, function(group) {
            if (isArrayLikeObject(group)) {
              length = nativeMax(group.length, length);
              return true;
            }
          });
          return baseTimes(length, function(index) {
            return arrayMap(array, baseProperty(index));
          });
        }
        function unzipWith(array, iteratee) {
          if (!(array && array.length)) {
            return [];
          }
          var result = unzip(array);
          if (iteratee == null) {
            return result;
          }
          return arrayMap(result, function(group) {
            return apply(iteratee, undefined, group);
          });
        }
        var without = rest(function(array, values) {
          return isArrayLikeObject(array) ? baseDifference(array, values) : [];
        });
        var xor = rest(function(arrays) {
          return baseXor(arrayFilter(arrays, isArrayLikeObject));
        });
        var xorBy = rest(function(arrays) {
          var iteratee = last(arrays);
          if (isArrayLikeObject(iteratee)) {
            iteratee = undefined;
          }
          return baseXor(arrayFilter(arrays, isArrayLikeObject), getIteratee(iteratee));
        });
        var xorWith = rest(function(arrays) {
          var comparator = last(arrays);
          if (isArrayLikeObject(comparator)) {
            comparator = undefined;
          }
          return baseXor(arrayFilter(arrays, isArrayLikeObject), undefined, comparator);
        });
        var zip = rest(unzip);
        function zipObject(props, values) {
          return baseZipObject(props || [], values || [], assignValue);
        }
        function zipObjectDeep(props, values) {
          return baseZipObject(props || [], values || [], baseSet);
        }
        var zipWith = rest(function(arrays) {
          var length = arrays.length,
              iteratee = length > 1 ? arrays[length - 1] : undefined;
          iteratee = typeof iteratee == 'function' ? (arrays.pop(), iteratee) : undefined;
          return unzipWith(arrays, iteratee);
        });
        function chain(value) {
          var result = lodash(value);
          result.__chain__ = true;
          return result;
        }
        function tap(value, interceptor) {
          interceptor(value);
          return value;
        }
        function thru(value, interceptor) {
          return interceptor(value);
        }
        var wrapperAt = rest(function(paths) {
          paths = baseFlatten(paths, 1);
          var length = paths.length,
              start = length ? paths[0] : 0,
              value = this.__wrapped__,
              interceptor = function(object) {
                return baseAt(object, paths);
              };
          if (length > 1 || this.__actions__.length || !(value instanceof LazyWrapper) || !isIndex(start)) {
            return this.thru(interceptor);
          }
          value = value.slice(start, +start + (length ? 1 : 0));
          value.__actions__.push({
            'func': thru,
            'args': [interceptor],
            'thisArg': undefined
          });
          return new LodashWrapper(value, this.__chain__).thru(function(array) {
            if (length && !array.length) {
              array.push(undefined);
            }
            return array;
          });
        });
        function wrapperChain() {
          return chain(this);
        }
        function wrapperCommit() {
          return new LodashWrapper(this.value(), this.__chain__);
        }
        function wrapperFlatMap(iteratee) {
          return this.map(iteratee).flatten();
        }
        function wrapperNext() {
          if (this.__values__ === undefined) {
            this.__values__ = toArray(this.value());
          }
          var done = this.__index__ >= this.__values__.length,
              value = done ? undefined : this.__values__[this.__index__++];
          return {
            'done': done,
            'value': value
          };
        }
        function wrapperToIterator() {
          return this;
        }
        function wrapperPlant(value) {
          var result,
              parent = this;
          while (parent instanceof baseLodash) {
            var clone = wrapperClone(parent);
            clone.__index__ = 0;
            clone.__values__ = undefined;
            if (result) {
              previous.__wrapped__ = clone;
            } else {
              result = clone;
            }
            var previous = clone;
            parent = parent.__wrapped__;
          }
          previous.__wrapped__ = value;
          return result;
        }
        function wrapperReverse() {
          var value = this.__wrapped__;
          if (value instanceof LazyWrapper) {
            var wrapped = value;
            if (this.__actions__.length) {
              wrapped = new LazyWrapper(this);
            }
            wrapped = wrapped.reverse();
            wrapped.__actions__.push({
              'func': thru,
              'args': [reverse],
              'thisArg': undefined
            });
            return new LodashWrapper(wrapped, this.__chain__);
          }
          return this.thru(reverse);
        }
        function wrapperValue() {
          return baseWrapperValue(this.__wrapped__, this.__actions__);
        }
        var countBy = createAggregator(function(result, value, key) {
          hasOwnProperty.call(result, key) ? ++result[key] : (result[key] = 1);
        });
        function every(collection, predicate, guard) {
          var func = isArray(collection) ? arrayEvery : baseEvery;
          if (guard && isIterateeCall(collection, predicate, guard)) {
            predicate = undefined;
          }
          return func(collection, getIteratee(predicate, 3));
        }
        function filter(collection, predicate) {
          var func = isArray(collection) ? arrayFilter : baseFilter;
          return func(collection, getIteratee(predicate, 3));
        }
        function find(collection, predicate) {
          predicate = getIteratee(predicate, 3);
          if (isArray(collection)) {
            var index = baseFindIndex(collection, predicate);
            return index > -1 ? collection[index] : undefined;
          }
          return baseFind(collection, predicate, baseEach);
        }
        function findLast(collection, predicate) {
          predicate = getIteratee(predicate, 3);
          if (isArray(collection)) {
            var index = baseFindIndex(collection, predicate, true);
            return index > -1 ? collection[index] : undefined;
          }
          return baseFind(collection, predicate, baseEachRight);
        }
        function flatMap(collection, iteratee) {
          return baseFlatten(map(collection, iteratee), 1);
        }
        function forEach(collection, iteratee) {
          return (typeof iteratee == 'function' && isArray(collection)) ? arrayEach(collection, iteratee) : baseEach(collection, baseCastFunction(iteratee));
        }
        function forEachRight(collection, iteratee) {
          return (typeof iteratee == 'function' && isArray(collection)) ? arrayEachRight(collection, iteratee) : baseEachRight(collection, baseCastFunction(iteratee));
        }
        var groupBy = createAggregator(function(result, value, key) {
          if (hasOwnProperty.call(result, key)) {
            result[key].push(value);
          } else {
            result[key] = [value];
          }
        });
        function includes(collection, value, fromIndex, guard) {
          collection = isArrayLike(collection) ? collection : values(collection);
          fromIndex = (fromIndex && !guard) ? toInteger(fromIndex) : 0;
          var length = collection.length;
          if (fromIndex < 0) {
            fromIndex = nativeMax(length + fromIndex, 0);
          }
          return isString(collection) ? (fromIndex <= length && collection.indexOf(value, fromIndex) > -1) : (!!length && baseIndexOf(collection, value, fromIndex) > -1);
        }
        var invokeMap = rest(function(collection, path, args) {
          var index = -1,
              isFunc = typeof path == 'function',
              isProp = isKey(path),
              result = isArrayLike(collection) ? Array(collection.length) : [];
          baseEach(collection, function(value) {
            var func = isFunc ? path : ((isProp && value != null) ? value[path] : undefined);
            result[++index] = func ? apply(func, value, args) : baseInvoke(value, path, args);
          });
          return result;
        });
        var keyBy = createAggregator(function(result, value, key) {
          result[key] = value;
        });
        function map(collection, iteratee) {
          var func = isArray(collection) ? arrayMap : baseMap;
          return func(collection, getIteratee(iteratee, 3));
        }
        function orderBy(collection, iteratees, orders, guard) {
          if (collection == null) {
            return [];
          }
          if (!isArray(iteratees)) {
            iteratees = iteratees == null ? [] : [iteratees];
          }
          orders = guard ? undefined : orders;
          if (!isArray(orders)) {
            orders = orders == null ? [] : [orders];
          }
          return baseOrderBy(collection, iteratees, orders);
        }
        var partition = createAggregator(function(result, value, key) {
          result[key ? 0 : 1].push(value);
        }, function() {
          return [[], []];
        });
        function reduce(collection, iteratee, accumulator) {
          var func = isArray(collection) ? arrayReduce : baseReduce,
              initAccum = arguments.length < 3;
          return func(collection, getIteratee(iteratee, 4), accumulator, initAccum, baseEach);
        }
        function reduceRight(collection, iteratee, accumulator) {
          var func = isArray(collection) ? arrayReduceRight : baseReduce,
              initAccum = arguments.length < 3;
          return func(collection, getIteratee(iteratee, 4), accumulator, initAccum, baseEachRight);
        }
        function reject(collection, predicate) {
          var func = isArray(collection) ? arrayFilter : baseFilter;
          predicate = getIteratee(predicate, 3);
          return func(collection, function(value, index, collection) {
            return !predicate(value, index, collection);
          });
        }
        function sample(collection) {
          var array = isArrayLike(collection) ? collection : values(collection),
              length = array.length;
          return length > 0 ? array[baseRandom(0, length - 1)] : undefined;
        }
        function sampleSize(collection, n) {
          var index = -1,
              result = toArray(collection),
              length = result.length,
              lastIndex = length - 1;
          n = baseClamp(toInteger(n), 0, length);
          while (++index < n) {
            var rand = baseRandom(index, lastIndex),
                value = result[rand];
            result[rand] = result[index];
            result[index] = value;
          }
          result.length = n;
          return result;
        }
        function shuffle(collection) {
          return sampleSize(collection, MAX_ARRAY_LENGTH);
        }
        function size(collection) {
          if (collection == null) {
            return 0;
          }
          if (isArrayLike(collection)) {
            var result = collection.length;
            return (result && isString(collection)) ? stringSize(collection) : result;
          }
          return keys(collection).length;
        }
        function some(collection, predicate, guard) {
          var func = isArray(collection) ? arraySome : baseSome;
          if (guard && isIterateeCall(collection, predicate, guard)) {
            predicate = undefined;
          }
          return func(collection, getIteratee(predicate, 3));
        }
        var sortBy = rest(function(collection, iteratees) {
          if (collection == null) {
            return [];
          }
          var length = iteratees.length;
          if (length > 1 && isIterateeCall(collection, iteratees[0], iteratees[1])) {
            iteratees = [];
          } else if (length > 2 && isIterateeCall(iteratees[0], iteratees[1], iteratees[2])) {
            iteratees.length = 1;
          }
          return baseOrderBy(collection, baseFlatten(iteratees, 1), []);
        });
        var now = Date.now;
        function after(n, func) {
          if (typeof func != 'function') {
            throw new TypeError(FUNC_ERROR_TEXT);
          }
          n = toInteger(n);
          return function() {
            if (--n < 1) {
              return func.apply(this, arguments);
            }
          };
        }
        function ary(func, n, guard) {
          n = guard ? undefined : n;
          n = (func && n == null) ? func.length : n;
          return createWrapper(func, ARY_FLAG, undefined, undefined, undefined, undefined, n);
        }
        function before(n, func) {
          var result;
          if (typeof func != 'function') {
            throw new TypeError(FUNC_ERROR_TEXT);
          }
          n = toInteger(n);
          return function() {
            if (--n > 0) {
              result = func.apply(this, arguments);
            }
            if (n <= 1) {
              func = undefined;
            }
            return result;
          };
        }
        var bind = rest(function(func, thisArg, partials) {
          var bitmask = BIND_FLAG;
          if (partials.length) {
            var holders = replaceHolders(partials, getPlaceholder(bind));
            bitmask |= PARTIAL_FLAG;
          }
          return createWrapper(func, bitmask, thisArg, partials, holders);
        });
        var bindKey = rest(function(object, key, partials) {
          var bitmask = BIND_FLAG | BIND_KEY_FLAG;
          if (partials.length) {
            var holders = replaceHolders(partials, getPlaceholder(bindKey));
            bitmask |= PARTIAL_FLAG;
          }
          return createWrapper(key, bitmask, object, partials, holders);
        });
        function curry(func, arity, guard) {
          arity = guard ? undefined : arity;
          var result = createWrapper(func, CURRY_FLAG, undefined, undefined, undefined, undefined, undefined, arity);
          result.placeholder = curry.placeholder;
          return result;
        }
        function curryRight(func, arity, guard) {
          arity = guard ? undefined : arity;
          var result = createWrapper(func, CURRY_RIGHT_FLAG, undefined, undefined, undefined, undefined, undefined, arity);
          result.placeholder = curryRight.placeholder;
          return result;
        }
        function debounce(func, wait, options) {
          var args,
              maxTimeoutId,
              result,
              stamp,
              thisArg,
              timeoutId,
              trailingCall,
              lastCalled = 0,
              leading = false,
              maxWait = false,
              trailing = true;
          if (typeof func != 'function') {
            throw new TypeError(FUNC_ERROR_TEXT);
          }
          wait = toNumber(wait) || 0;
          if (isObject(options)) {
            leading = !!options.leading;
            maxWait = 'maxWait' in options && nativeMax(toNumber(options.maxWait) || 0, wait);
            trailing = 'trailing' in options ? !!options.trailing : trailing;
          }
          function cancel() {
            if (timeoutId) {
              clearTimeout(timeoutId);
            }
            if (maxTimeoutId) {
              clearTimeout(maxTimeoutId);
            }
            lastCalled = 0;
            args = maxTimeoutId = thisArg = timeoutId = trailingCall = undefined;
          }
          function complete(isCalled, id) {
            if (id) {
              clearTimeout(id);
            }
            maxTimeoutId = timeoutId = trailingCall = undefined;
            if (isCalled) {
              lastCalled = now();
              result = func.apply(thisArg, args);
              if (!timeoutId && !maxTimeoutId) {
                args = thisArg = undefined;
              }
            }
          }
          function delayed() {
            var remaining = wait - (now() - stamp);
            if (remaining <= 0 || remaining > wait) {
              complete(trailingCall, maxTimeoutId);
            } else {
              timeoutId = setTimeout(delayed, remaining);
            }
          }
          function flush() {
            if ((timeoutId && trailingCall) || (maxTimeoutId && trailing)) {
              result = func.apply(thisArg, args);
            }
            cancel();
            return result;
          }
          function maxDelayed() {
            complete(trailing, timeoutId);
          }
          function debounced() {
            args = arguments;
            stamp = now();
            thisArg = this;
            trailingCall = trailing && (timeoutId || !leading);
            if (maxWait === false) {
              var leadingCall = leading && !timeoutId;
            } else {
              if (!lastCalled && !maxTimeoutId && !leading) {
                lastCalled = stamp;
              }
              var remaining = maxWait - (stamp - lastCalled);
              var isCalled = (remaining <= 0 || remaining > maxWait) && (leading || maxTimeoutId);
              if (isCalled) {
                if (maxTimeoutId) {
                  maxTimeoutId = clearTimeout(maxTimeoutId);
                }
                lastCalled = stamp;
                result = func.apply(thisArg, args);
              } else if (!maxTimeoutId) {
                maxTimeoutId = setTimeout(maxDelayed, remaining);
              }
            }
            if (isCalled && timeoutId) {
              timeoutId = clearTimeout(timeoutId);
            } else if (!timeoutId && wait !== maxWait) {
              timeoutId = setTimeout(delayed, wait);
            }
            if (leadingCall) {
              isCalled = true;
              result = func.apply(thisArg, args);
            }
            if (isCalled && !timeoutId && !maxTimeoutId) {
              args = thisArg = undefined;
            }
            return result;
          }
          debounced.cancel = cancel;
          debounced.flush = flush;
          return debounced;
        }
        var defer = rest(function(func, args) {
          return baseDelay(func, 1, args);
        });
        var delay = rest(function(func, wait, args) {
          return baseDelay(func, toNumber(wait) || 0, args);
        });
        function flip(func) {
          return createWrapper(func, FLIP_FLAG);
        }
        function memoize(func, resolver) {
          if (typeof func != 'function' || (resolver && typeof resolver != 'function')) {
            throw new TypeError(FUNC_ERROR_TEXT);
          }
          var memoized = function() {
            var args = arguments,
                key = resolver ? resolver.apply(this, args) : args[0],
                cache = memoized.cache;
            if (cache.has(key)) {
              return cache.get(key);
            }
            var result = func.apply(this, args);
            memoized.cache = cache.set(key, result);
            return result;
          };
          memoized.cache = new memoize.Cache;
          return memoized;
        }
        function negate(predicate) {
          if (typeof predicate != 'function') {
            throw new TypeError(FUNC_ERROR_TEXT);
          }
          return function() {
            return !predicate.apply(this, arguments);
          };
        }
        function once(func) {
          return before(2, func);
        }
        var overArgs = rest(function(func, transforms) {
          transforms = arrayMap(baseFlatten(transforms, 1), getIteratee());
          var funcsLength = transforms.length;
          return rest(function(args) {
            var index = -1,
                length = nativeMin(args.length, funcsLength);
            while (++index < length) {
              args[index] = transforms[index].call(this, args[index]);
            }
            return apply(func, this, args);
          });
        });
        var partial = rest(function(func, partials) {
          var holders = replaceHolders(partials, getPlaceholder(partial));
          return createWrapper(func, PARTIAL_FLAG, undefined, partials, holders);
        });
        var partialRight = rest(function(func, partials) {
          var holders = replaceHolders(partials, getPlaceholder(partialRight));
          return createWrapper(func, PARTIAL_RIGHT_FLAG, undefined, partials, holders);
        });
        var rearg = rest(function(func, indexes) {
          return createWrapper(func, REARG_FLAG, undefined, undefined, undefined, baseFlatten(indexes, 1));
        });
        function rest(func, start) {
          if (typeof func != 'function') {
            throw new TypeError(FUNC_ERROR_TEXT);
          }
          start = nativeMax(start === undefined ? (func.length - 1) : toInteger(start), 0);
          return function() {
            var args = arguments,
                index = -1,
                length = nativeMax(args.length - start, 0),
                array = Array(length);
            while (++index < length) {
              array[index] = args[start + index];
            }
            switch (start) {
              case 0:
                return func.call(this, array);
              case 1:
                return func.call(this, args[0], array);
              case 2:
                return func.call(this, args[0], args[1], array);
            }
            var otherArgs = Array(start + 1);
            index = -1;
            while (++index < start) {
              otherArgs[index] = args[index];
            }
            otherArgs[start] = array;
            return apply(func, this, otherArgs);
          };
        }
        function spread(func, start) {
          if (typeof func != 'function') {
            throw new TypeError(FUNC_ERROR_TEXT);
          }
          start = start === undefined ? 0 : nativeMax(toInteger(start), 0);
          return rest(function(args) {
            var array = args[start],
                otherArgs = args.slice(0, start);
            if (array) {
              arrayPush(otherArgs, array);
            }
            return apply(func, this, otherArgs);
          });
        }
        function throttle(func, wait, options) {
          var leading = true,
              trailing = true;
          if (typeof func != 'function') {
            throw new TypeError(FUNC_ERROR_TEXT);
          }
          if (isObject(options)) {
            leading = 'leading' in options ? !!options.leading : leading;
            trailing = 'trailing' in options ? !!options.trailing : trailing;
          }
          return debounce(func, wait, {
            'leading': leading,
            'maxWait': wait,
            'trailing': trailing
          });
        }
        function unary(func) {
          return ary(func, 1);
        }
        function wrap(value, wrapper) {
          wrapper = wrapper == null ? identity : wrapper;
          return partial(wrapper, value);
        }
        function castArray() {
          if (!arguments.length) {
            return [];
          }
          var value = arguments[0];
          return isArray(value) ? value : [value];
        }
        function clone(value) {
          return baseClone(value, false, true);
        }
        function cloneWith(value, customizer) {
          return baseClone(value, false, true, customizer);
        }
        function cloneDeep(value) {
          return baseClone(value, true, true);
        }
        function cloneDeepWith(value, customizer) {
          return baseClone(value, true, true, customizer);
        }
        function eq(value, other) {
          return value === other || (value !== value && other !== other);
        }
        function gt(value, other) {
          return value > other;
        }
        function gte(value, other) {
          return value >= other;
        }
        function isArguments(value) {
          return isArrayLikeObject(value) && hasOwnProperty.call(value, 'callee') && (!propertyIsEnumerable.call(value, 'callee') || objectToString.call(value) == argsTag);
        }
        var isArray = Array.isArray;
        function isArrayBuffer(value) {
          return isObjectLike(value) && objectToString.call(value) == arrayBufferTag;
        }
        function isArrayLike(value) {
          return value != null && isLength(getLength(value)) && !isFunction(value);
        }
        function isArrayLikeObject(value) {
          return isObjectLike(value) && isArrayLike(value);
        }
        function isBoolean(value) {
          return value === true || value === false || (isObjectLike(value) && objectToString.call(value) == boolTag);
        }
        var isBuffer = !Buffer ? constant(false) : function(value) {
          return value instanceof Buffer;
        };
        function isDate(value) {
          return isObjectLike(value) && objectToString.call(value) == dateTag;
        }
        function isElement(value) {
          return !!value && value.nodeType === 1 && isObjectLike(value) && !isPlainObject(value);
        }
        function isEmpty(value) {
          if (isArrayLike(value) && (isArray(value) || isString(value) || isFunction(value.splice) || isArguments(value))) {
            return !value.length;
          }
          for (var key in value) {
            if (hasOwnProperty.call(value, key)) {
              return false;
            }
          }
          return true;
        }
        function isEqual(value, other) {
          return baseIsEqual(value, other);
        }
        function isEqualWith(value, other, customizer) {
          customizer = typeof customizer == 'function' ? customizer : undefined;
          var result = customizer ? customizer(value, other) : undefined;
          return result === undefined ? baseIsEqual(value, other, customizer) : !!result;
        }
        function isError(value) {
          if (!isObjectLike(value)) {
            return false;
          }
          return (objectToString.call(value) == errorTag) || (typeof value.message == 'string' && typeof value.name == 'string');
        }
        function isFinite(value) {
          return typeof value == 'number' && nativeIsFinite(value);
        }
        function isFunction(value) {
          var tag = isObject(value) ? objectToString.call(value) : '';
          return tag == funcTag || tag == genTag;
        }
        function isInteger(value) {
          return typeof value == 'number' && value == toInteger(value);
        }
        function isLength(value) {
          return typeof value == 'number' && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
        }
        function isObject(value) {
          var type = typeof value;
          return !!value && (type == 'object' || type == 'function');
        }
        function isObjectLike(value) {
          return !!value && typeof value == 'object';
        }
        function isMap(value) {
          return isObjectLike(value) && getTag(value) == mapTag;
        }
        function isMatch(object, source) {
          return object === source || baseIsMatch(object, source, getMatchData(source));
        }
        function isMatchWith(object, source, customizer) {
          customizer = typeof customizer == 'function' ? customizer : undefined;
          return baseIsMatch(object, source, getMatchData(source), customizer);
        }
        function isNaN(value) {
          return isNumber(value) && value != +value;
        }
        function isNative(value) {
          if (value == null) {
            return false;
          }
          if (isFunction(value)) {
            return reIsNative.test(funcToString.call(value));
          }
          return isObjectLike(value) && (isHostObject(value) ? reIsNative : reIsHostCtor).test(value);
        }
        function isNull(value) {
          return value === null;
        }
        function isNil(value) {
          return value == null;
        }
        function isNumber(value) {
          return typeof value == 'number' || (isObjectLike(value) && objectToString.call(value) == numberTag);
        }
        function isPlainObject(value) {
          if (!isObjectLike(value) || objectToString.call(value) != objectTag || isHostObject(value)) {
            return false;
          }
          var proto = getPrototypeOf(value);
          if (proto === null) {
            return true;
          }
          var Ctor = proto.constructor;
          return (typeof Ctor == 'function' && Ctor instanceof Ctor && funcToString.call(Ctor) == objectCtorString);
        }
        function isRegExp(value) {
          return isObject(value) && objectToString.call(value) == regexpTag;
        }
        function isSafeInteger(value) {
          return isInteger(value) && value >= -MAX_SAFE_INTEGER && value <= MAX_SAFE_INTEGER;
        }
        function isSet(value) {
          return isObjectLike(value) && getTag(value) == setTag;
        }
        function isString(value) {
          return typeof value == 'string' || (!isArray(value) && isObjectLike(value) && objectToString.call(value) == stringTag);
        }
        function isSymbol(value) {
          return typeof value == 'symbol' || (isObjectLike(value) && objectToString.call(value) == symbolTag);
        }
        function isTypedArray(value) {
          return isObjectLike(value) && isLength(value.length) && !!typedArrayTags[objectToString.call(value)];
        }
        function isUndefined(value) {
          return value === undefined;
        }
        function isWeakMap(value) {
          return isObjectLike(value) && getTag(value) == weakMapTag;
        }
        function isWeakSet(value) {
          return isObjectLike(value) && objectToString.call(value) == weakSetTag;
        }
        function lt(value, other) {
          return value < other;
        }
        function lte(value, other) {
          return value <= other;
        }
        function toArray(value) {
          if (!value) {
            return [];
          }
          if (isArrayLike(value)) {
            return isString(value) ? stringToArray(value) : copyArray(value);
          }
          if (iteratorSymbol && value[iteratorSymbol]) {
            return iteratorToArray(value[iteratorSymbol]());
          }
          var tag = getTag(value),
              func = tag == mapTag ? mapToArray : (tag == setTag ? setToArray : values);
          return func(value);
        }
        function toInteger(value) {
          if (!value) {
            return value === 0 ? value : 0;
          }
          value = toNumber(value);
          if (value === INFINITY || value === -INFINITY) {
            var sign = (value < 0 ? -1 : 1);
            return sign * MAX_INTEGER;
          }
          var remainder = value % 1;
          return value === value ? (remainder ? value - remainder : value) : 0;
        }
        function toLength(value) {
          return value ? baseClamp(toInteger(value), 0, MAX_ARRAY_LENGTH) : 0;
        }
        function toNumber(value) {
          if (isObject(value)) {
            var other = isFunction(value.valueOf) ? value.valueOf() : value;
            value = isObject(other) ? (other + '') : other;
          }
          if (typeof value != 'string') {
            return value === 0 ? value : +value;
          }
          value = value.replace(reTrim, '');
          var isBinary = reIsBinary.test(value);
          return (isBinary || reIsOctal.test(value)) ? freeParseInt(value.slice(2), isBinary ? 2 : 8) : (reIsBadHex.test(value) ? NAN : +value);
        }
        function toPlainObject(value) {
          return copyObject(value, keysIn(value));
        }
        function toSafeInteger(value) {
          return baseClamp(toInteger(value), -MAX_SAFE_INTEGER, MAX_SAFE_INTEGER);
        }
        function toString(value) {
          if (typeof value == 'string') {
            return value;
          }
          if (value == null) {
            return '';
          }
          if (isSymbol(value)) {
            return symbolToString ? symbolToString.call(value) : '';
          }
          var result = (value + '');
          return (result == '0' && (1 / value) == -INFINITY) ? '-0' : result;
        }
        var assign = createAssigner(function(object, source) {
          if (nonEnumShadows || isPrototype(source) || isArrayLike(source)) {
            copyObject(source, keys(source), object);
            return;
          }
          for (var key in source) {
            if (hasOwnProperty.call(source, key)) {
              assignValue(object, key, source[key]);
            }
          }
        });
        var assignIn = createAssigner(function(object, source) {
          if (nonEnumShadows || isPrototype(source) || isArrayLike(source)) {
            copyObject(source, keysIn(source), object);
            return;
          }
          for (var key in source) {
            assignValue(object, key, source[key]);
          }
        });
        var assignInWith = createAssigner(function(object, source, srcIndex, customizer) {
          copyObjectWith(source, keysIn(source), object, customizer);
        });
        var assignWith = createAssigner(function(object, source, srcIndex, customizer) {
          copyObjectWith(source, keys(source), object, customizer);
        });
        var at = rest(function(object, paths) {
          return baseAt(object, baseFlatten(paths, 1));
        });
        function create(prototype, properties) {
          var result = baseCreate(prototype);
          return properties ? baseAssign(result, properties) : result;
        }
        var defaults = rest(function(args) {
          args.push(undefined, assignInDefaults);
          return apply(assignInWith, undefined, args);
        });
        var defaultsDeep = rest(function(args) {
          args.push(undefined, mergeDefaults);
          return apply(mergeWith, undefined, args);
        });
        function findKey(object, predicate) {
          return baseFind(object, getIteratee(predicate, 3), baseForOwn, true);
        }
        function findLastKey(object, predicate) {
          return baseFind(object, getIteratee(predicate, 3), baseForOwnRight, true);
        }
        function forIn(object, iteratee) {
          return object == null ? object : baseFor(object, baseCastFunction(iteratee), keysIn);
        }
        function forInRight(object, iteratee) {
          return object == null ? object : baseForRight(object, baseCastFunction(iteratee), keysIn);
        }
        function forOwn(object, iteratee) {
          return object && baseForOwn(object, baseCastFunction(iteratee));
        }
        function forOwnRight(object, iteratee) {
          return object && baseForOwnRight(object, baseCastFunction(iteratee));
        }
        function functions(object) {
          return object == null ? [] : baseFunctions(object, keys(object));
        }
        function functionsIn(object) {
          return object == null ? [] : baseFunctions(object, keysIn(object));
        }
        function get(object, path, defaultValue) {
          var result = object == null ? undefined : baseGet(object, path);
          return result === undefined ? defaultValue : result;
        }
        function has(object, path) {
          return hasPath(object, path, baseHas);
        }
        function hasIn(object, path) {
          return hasPath(object, path, baseHasIn);
        }
        var invert = createInverter(function(result, value, key) {
          result[value] = key;
        }, constant(identity));
        var invertBy = createInverter(function(result, value, key) {
          if (hasOwnProperty.call(result, value)) {
            result[value].push(key);
          } else {
            result[value] = [key];
          }
        }, getIteratee);
        var invoke = rest(baseInvoke);
        function keys(object) {
          var isProto = isPrototype(object);
          if (!(isProto || isArrayLike(object))) {
            return baseKeys(object);
          }
          var indexes = indexKeys(object),
              skipIndexes = !!indexes,
              result = indexes || [],
              length = result.length;
          for (var key in object) {
            if (baseHas(object, key) && !(skipIndexes && (key == 'length' || isIndex(key, length))) && !(isProto && key == 'constructor')) {
              result.push(key);
            }
          }
          return result;
        }
        function keysIn(object) {
          var index = -1,
              isProto = isPrototype(object),
              props = baseKeysIn(object),
              propsLength = props.length,
              indexes = indexKeys(object),
              skipIndexes = !!indexes,
              result = indexes || [],
              length = result.length;
          while (++index < propsLength) {
            var key = props[index];
            if (!(skipIndexes && (key == 'length' || isIndex(key, length))) && !(key == 'constructor' && (isProto || !hasOwnProperty.call(object, key)))) {
              result.push(key);
            }
          }
          return result;
        }
        function mapKeys(object, iteratee) {
          var result = {};
          iteratee = getIteratee(iteratee, 3);
          baseForOwn(object, function(value, key, object) {
            result[iteratee(value, key, object)] = value;
          });
          return result;
        }
        function mapValues(object, iteratee) {
          var result = {};
          iteratee = getIteratee(iteratee, 3);
          baseForOwn(object, function(value, key, object) {
            result[key] = iteratee(value, key, object);
          });
          return result;
        }
        var merge = createAssigner(function(object, source, srcIndex) {
          baseMerge(object, source, srcIndex);
        });
        var mergeWith = createAssigner(function(object, source, srcIndex, customizer) {
          baseMerge(object, source, srcIndex, customizer);
        });
        var omit = rest(function(object, props) {
          if (object == null) {
            return {};
          }
          props = arrayMap(baseFlatten(props, 1), String);
          return basePick(object, baseDifference(keysIn(object), props));
        });
        function omitBy(object, predicate) {
          predicate = getIteratee(predicate);
          return basePickBy(object, function(value, key) {
            return !predicate(value, key);
          });
        }
        var pick = rest(function(object, props) {
          return object == null ? {} : basePick(object, baseFlatten(props, 1));
        });
        function pickBy(object, predicate) {
          return object == null ? {} : basePickBy(object, getIteratee(predicate));
        }
        function result(object, path, defaultValue) {
          if (!isKey(path, object)) {
            path = baseCastPath(path);
            var result = get(object, path);
            object = parent(object, path);
          } else {
            result = object == null ? undefined : object[path];
          }
          if (result === undefined) {
            result = defaultValue;
          }
          return isFunction(result) ? result.call(object) : result;
        }
        function set(object, path, value) {
          return object == null ? object : baseSet(object, path, value);
        }
        function setWith(object, path, value, customizer) {
          customizer = typeof customizer == 'function' ? customizer : undefined;
          return object == null ? object : baseSet(object, path, value, customizer);
        }
        function toPairs(object) {
          return baseToPairs(object, keys(object));
        }
        function toPairsIn(object) {
          return baseToPairs(object, keysIn(object));
        }
        function transform(object, iteratee, accumulator) {
          var isArr = isArray(object) || isTypedArray(object);
          iteratee = getIteratee(iteratee, 4);
          if (accumulator == null) {
            if (isArr || isObject(object)) {
              var Ctor = object.constructor;
              if (isArr) {
                accumulator = isArray(object) ? new Ctor : [];
              } else {
                accumulator = isFunction(Ctor) ? baseCreate(getPrototypeOf(object)) : {};
              }
            } else {
              accumulator = {};
            }
          }
          (isArr ? arrayEach : baseForOwn)(object, function(value, index, object) {
            return iteratee(accumulator, value, index, object);
          });
          return accumulator;
        }
        function unset(object, path) {
          return object == null ? true : baseUnset(object, path);
        }
        function update(object, path, updater) {
          return object == null ? object : baseUpdate(object, path, baseCastFunction(updater));
        }
        function updateWith(object, path, updater, customizer) {
          customizer = typeof customizer == 'function' ? customizer : undefined;
          return object == null ? object : baseUpdate(object, path, baseCastFunction(updater), customizer);
        }
        function values(object) {
          return object ? baseValues(object, keys(object)) : [];
        }
        function valuesIn(object) {
          return object == null ? [] : baseValues(object, keysIn(object));
        }
        function clamp(number, lower, upper) {
          if (upper === undefined) {
            upper = lower;
            lower = undefined;
          }
          if (upper !== undefined) {
            upper = toNumber(upper);
            upper = upper === upper ? upper : 0;
          }
          if (lower !== undefined) {
            lower = toNumber(lower);
            lower = lower === lower ? lower : 0;
          }
          return baseClamp(toNumber(number), lower, upper);
        }
        function inRange(number, start, end) {
          start = toNumber(start) || 0;
          if (end === undefined) {
            end = start;
            start = 0;
          } else {
            end = toNumber(end) || 0;
          }
          number = toNumber(number);
          return baseInRange(number, start, end);
        }
        function random(lower, upper, floating) {
          if (floating && typeof floating != 'boolean' && isIterateeCall(lower, upper, floating)) {
            upper = floating = undefined;
          }
          if (floating === undefined) {
            if (typeof upper == 'boolean') {
              floating = upper;
              upper = undefined;
            } else if (typeof lower == 'boolean') {
              floating = lower;
              lower = undefined;
            }
          }
          if (lower === undefined && upper === undefined) {
            lower = 0;
            upper = 1;
          } else {
            lower = toNumber(lower) || 0;
            if (upper === undefined) {
              upper = lower;
              lower = 0;
            } else {
              upper = toNumber(upper) || 0;
            }
          }
          if (lower > upper) {
            var temp = lower;
            lower = upper;
            upper = temp;
          }
          if (floating || lower % 1 || upper % 1) {
            var rand = nativeRandom();
            return nativeMin(lower + (rand * (upper - lower + freeParseFloat('1e-' + ((rand + '').length - 1)))), upper);
          }
          return baseRandom(lower, upper);
        }
        var camelCase = createCompounder(function(result, word, index) {
          word = word.toLowerCase();
          return result + (index ? capitalize(word) : word);
        });
        function capitalize(string) {
          return upperFirst(toString(string).toLowerCase());
        }
        function deburr(string) {
          string = toString(string);
          return string && string.replace(reLatin1, deburrLetter).replace(reComboMark, '');
        }
        function endsWith(string, target, position) {
          string = toString(string);
          target = typeof target == 'string' ? target : (target + '');
          var length = string.length;
          position = position === undefined ? length : baseClamp(toInteger(position), 0, length);
          position -= target.length;
          return position >= 0 && string.indexOf(target, position) == position;
        }
        function escape(string) {
          string = toString(string);
          return (string && reHasUnescapedHtml.test(string)) ? string.replace(reUnescapedHtml, escapeHtmlChar) : string;
        }
        function escapeRegExp(string) {
          string = toString(string);
          return (string && reHasRegExpChar.test(string)) ? string.replace(reRegExpChar, '\\$&') : string;
        }
        var kebabCase = createCompounder(function(result, word, index) {
          return result + (index ? '-' : '') + word.toLowerCase();
        });
        var lowerCase = createCompounder(function(result, word, index) {
          return result + (index ? ' ' : '') + word.toLowerCase();
        });
        var lowerFirst = createCaseFirst('toLowerCase');
        var upperFirst = createCaseFirst('toUpperCase');
        function pad(string, length, chars) {
          string = toString(string);
          length = toInteger(length);
          var strLength = stringSize(string);
          if (!length || strLength >= length) {
            return string;
          }
          var mid = (length - strLength) / 2,
              leftLength = nativeFloor(mid),
              rightLength = nativeCeil(mid);
          return createPadding('', leftLength, chars) + string + createPadding('', rightLength, chars);
        }
        function padEnd(string, length, chars) {
          string = toString(string);
          return string + createPadding(string, length, chars);
        }
        function padStart(string, length, chars) {
          string = toString(string);
          return createPadding(string, length, chars) + string;
        }
        function parseInt(string, radix, guard) {
          if (guard || radix == null) {
            radix = 0;
          } else if (radix) {
            radix = +radix;
          }
          string = toString(string).replace(reTrim, '');
          return nativeParseInt(string, radix || (reHasHexPrefix.test(string) ? 16 : 10));
        }
        function repeat(string, n) {
          string = toString(string);
          n = toInteger(n);
          var result = '';
          if (!string || n < 1 || n > MAX_SAFE_INTEGER) {
            return result;
          }
          do {
            if (n % 2) {
              result += string;
            }
            n = nativeFloor(n / 2);
            string += string;
          } while (n);
          return result;
        }
        function replace() {
          var args = arguments,
              string = toString(args[0]);
          return args.length < 3 ? string : string.replace(args[1], args[2]);
        }
        var snakeCase = createCompounder(function(result, word, index) {
          return result + (index ? '_' : '') + word.toLowerCase();
        });
        function split(string, separator, limit) {
          return toString(string).split(separator, limit);
        }
        var startCase = createCompounder(function(result, word, index) {
          return result + (index ? ' ' : '') + capitalize(word);
        });
        function startsWith(string, target, position) {
          string = toString(string);
          position = baseClamp(toInteger(position), 0, string.length);
          return string.lastIndexOf(target, position) == position;
        }
        function template(string, options, guard) {
          var settings = lodash.templateSettings;
          if (guard && isIterateeCall(string, options, guard)) {
            options = undefined;
          }
          string = toString(string);
          options = assignInWith({}, options, settings, assignInDefaults);
          var imports = assignInWith({}, options.imports, settings.imports, assignInDefaults),
              importsKeys = keys(imports),
              importsValues = baseValues(imports, importsKeys);
          var isEscaping,
              isEvaluating,
              index = 0,
              interpolate = options.interpolate || reNoMatch,
              source = "__p += '";
          var reDelimiters = RegExp((options.escape || reNoMatch).source + '|' + interpolate.source + '|' + (interpolate === reInterpolate ? reEsTemplate : reNoMatch).source + '|' + (options.evaluate || reNoMatch).source + '|$', 'g');
          var sourceURL = '//# sourceURL=' + ('sourceURL' in options ? options.sourceURL : ('lodash.templateSources[' + (++templateCounter) + ']')) + '\n';
          string.replace(reDelimiters, function(match, escapeValue, interpolateValue, esTemplateValue, evaluateValue, offset) {
            interpolateValue || (interpolateValue = esTemplateValue);
            source += string.slice(index, offset).replace(reUnescapedString, escapeStringChar);
            if (escapeValue) {
              isEscaping = true;
              source += "' +\n__e(" + escapeValue + ") +\n'";
            }
            if (evaluateValue) {
              isEvaluating = true;
              source += "';\n" + evaluateValue + ";\n__p += '";
            }
            if (interpolateValue) {
              source += "' +\n((__t = (" + interpolateValue + ")) == null ? '' : __t) +\n'";
            }
            index = offset + match.length;
            return match;
          });
          source += "';\n";
          var variable = options.variable;
          if (!variable) {
            source = 'with (obj) {\n' + source + '\n}\n';
          }
          source = (isEvaluating ? source.replace(reEmptyStringLeading, '') : source).replace(reEmptyStringMiddle, '$1').replace(reEmptyStringTrailing, '$1;');
          source = 'function(' + (variable || 'obj') + ') {\n' + (variable ? '' : 'obj || (obj = {});\n') + "var __t, __p = ''" + (isEscaping ? ', __e = _.escape' : '') + (isEvaluating ? ', __j = Array.prototype.join;\n' + "function print() { __p += __j.call(arguments, '') }\n" : ';\n') + source + 'return __p\n}';
          var result = attempt(function() {
            return Function(importsKeys, sourceURL + 'return ' + source).apply(undefined, importsValues);
          });
          result.source = source;
          if (isError(result)) {
            throw result;
          }
          return result;
        }
        function toLower(value) {
          return toString(value).toLowerCase();
        }
        function toUpper(value) {
          return toString(value).toUpperCase();
        }
        function trim(string, chars, guard) {
          string = toString(string);
          if (!string) {
            return string;
          }
          if (guard || chars === undefined) {
            return string.replace(reTrim, '');
          }
          chars = (chars + '');
          if (!chars) {
            return string;
          }
          var strSymbols = stringToArray(string),
              chrSymbols = stringToArray(chars);
          return strSymbols.slice(charsStartIndex(strSymbols, chrSymbols), charsEndIndex(strSymbols, chrSymbols) + 1).join('');
        }
        function trimEnd(string, chars, guard) {
          string = toString(string);
          if (!string) {
            return string;
          }
          if (guard || chars === undefined) {
            return string.replace(reTrimEnd, '');
          }
          chars = (chars + '');
          if (!chars) {
            return string;
          }
          var strSymbols = stringToArray(string);
          return strSymbols.slice(0, charsEndIndex(strSymbols, stringToArray(chars)) + 1).join('');
        }
        function trimStart(string, chars, guard) {
          string = toString(string);
          if (!string) {
            return string;
          }
          if (guard || chars === undefined) {
            return string.replace(reTrimStart, '');
          }
          chars = (chars + '');
          if (!chars) {
            return string;
          }
          var strSymbols = stringToArray(string);
          return strSymbols.slice(charsStartIndex(strSymbols, stringToArray(chars))).join('');
        }
        function truncate(string, options) {
          var length = DEFAULT_TRUNC_LENGTH,
              omission = DEFAULT_TRUNC_OMISSION;
          if (isObject(options)) {
            var separator = 'separator' in options ? options.separator : separator;
            length = 'length' in options ? toInteger(options.length) : length;
            omission = 'omission' in options ? toString(options.omission) : omission;
          }
          string = toString(string);
          var strLength = string.length;
          if (reHasComplexSymbol.test(string)) {
            var strSymbols = stringToArray(string);
            strLength = strSymbols.length;
          }
          if (length >= strLength) {
            return string;
          }
          var end = length - stringSize(omission);
          if (end < 1) {
            return omission;
          }
          var result = strSymbols ? strSymbols.slice(0, end).join('') : string.slice(0, end);
          if (separator === undefined) {
            return result + omission;
          }
          if (strSymbols) {
            end += (result.length - end);
          }
          if (isRegExp(separator)) {
            if (string.slice(end).search(separator)) {
              var match,
                  substring = result;
              if (!separator.global) {
                separator = RegExp(separator.source, toString(reFlags.exec(separator)) + 'g');
              }
              separator.lastIndex = 0;
              while ((match = separator.exec(substring))) {
                var newEnd = match.index;
              }
              result = result.slice(0, newEnd === undefined ? end : newEnd);
            }
          } else if (string.indexOf(separator, end) != end) {
            var index = result.lastIndexOf(separator);
            if (index > -1) {
              result = result.slice(0, index);
            }
          }
          return result + omission;
        }
        function unescape(string) {
          string = toString(string);
          return (string && reHasEscapedHtml.test(string)) ? string.replace(reEscapedHtml, unescapeHtmlChar) : string;
        }
        var upperCase = createCompounder(function(result, word, index) {
          return result + (index ? ' ' : '') + word.toUpperCase();
        });
        function words(string, pattern, guard) {
          string = toString(string);
          pattern = guard ? undefined : pattern;
          if (pattern === undefined) {
            pattern = reHasComplexWord.test(string) ? reComplexWord : reBasicWord;
          }
          return string.match(pattern) || [];
        }
        var attempt = rest(function(func, args) {
          try {
            return apply(func, undefined, args);
          } catch (e) {
            return isError(e) ? e : new Error(e);
          }
        });
        var bindAll = rest(function(object, methodNames) {
          arrayEach(baseFlatten(methodNames, 1), function(key) {
            object[key] = bind(object[key], object);
          });
          return object;
        });
        function cond(pairs) {
          var length = pairs ? pairs.length : 0,
              toIteratee = getIteratee();
          pairs = !length ? [] : arrayMap(pairs, function(pair) {
            if (typeof pair[1] != 'function') {
              throw new TypeError(FUNC_ERROR_TEXT);
            }
            return [toIteratee(pair[0]), pair[1]];
          });
          return rest(function(args) {
            var index = -1;
            while (++index < length) {
              var pair = pairs[index];
              if (apply(pair[0], this, args)) {
                return apply(pair[1], this, args);
              }
            }
          });
        }
        function conforms(source) {
          return baseConforms(baseClone(source, true));
        }
        function constant(value) {
          return function() {
            return value;
          };
        }
        var flow = createFlow();
        var flowRight = createFlow(true);
        function identity(value) {
          return value;
        }
        function iteratee(func) {
          return baseIteratee(typeof func == 'function' ? func : baseClone(func, true));
        }
        function matches(source) {
          return baseMatches(baseClone(source, true));
        }
        function matchesProperty(path, srcValue) {
          return baseMatchesProperty(path, baseClone(srcValue, true));
        }
        var method = rest(function(path, args) {
          return function(object) {
            return baseInvoke(object, path, args);
          };
        });
        var methodOf = rest(function(object, args) {
          return function(path) {
            return baseInvoke(object, path, args);
          };
        });
        function mixin(object, source, options) {
          var props = keys(source),
              methodNames = baseFunctions(source, props);
          if (options == null && !(isObject(source) && (methodNames.length || !props.length))) {
            options = source;
            source = object;
            object = this;
            methodNames = baseFunctions(source, keys(source));
          }
          var chain = (isObject(options) && 'chain' in options) ? options.chain : true,
              isFunc = isFunction(object);
          arrayEach(methodNames, function(methodName) {
            var func = source[methodName];
            object[methodName] = func;
            if (isFunc) {
              object.prototype[methodName] = function() {
                var chainAll = this.__chain__;
                if (chain || chainAll) {
                  var result = object(this.__wrapped__),
                      actions = result.__actions__ = copyArray(this.__actions__);
                  actions.push({
                    'func': func,
                    'args': arguments,
                    'thisArg': object
                  });
                  result.__chain__ = chainAll;
                  return result;
                }
                return func.apply(object, arrayPush([this.value()], arguments));
              };
            }
          });
          return object;
        }
        function noConflict() {
          if (root._ === this) {
            root._ = oldDash;
          }
          return this;
        }
        function noop() {}
        function nthArg(n) {
          n = toInteger(n);
          return function() {
            return arguments[n];
          };
        }
        var over = createOver(arrayMap);
        var overEvery = createOver(arrayEvery);
        var overSome = createOver(arraySome);
        function property(path) {
          return isKey(path) ? baseProperty(path) : basePropertyDeep(path);
        }
        function propertyOf(object) {
          return function(path) {
            return object == null ? undefined : baseGet(object, path);
          };
        }
        var range = createRange();
        var rangeRight = createRange(true);
        function times(n, iteratee) {
          n = toInteger(n);
          if (n < 1 || n > MAX_SAFE_INTEGER) {
            return [];
          }
          var index = MAX_ARRAY_LENGTH,
              length = nativeMin(n, MAX_ARRAY_LENGTH);
          iteratee = baseCastFunction(iteratee);
          n -= MAX_ARRAY_LENGTH;
          var result = baseTimes(length, iteratee);
          while (++index < n) {
            iteratee(index);
          }
          return result;
        }
        function toPath(value) {
          return isArray(value) ? arrayMap(value, String) : stringToPath(value);
        }
        function uniqueId(prefix) {
          var id = ++idCounter;
          return toString(prefix) + id;
        }
        function add(augend, addend) {
          var result;
          if (augend === undefined && addend === undefined) {
            return 0;
          }
          if (augend !== undefined) {
            result = augend;
          }
          if (addend !== undefined) {
            result = result === undefined ? addend : (result + addend);
          }
          return result;
        }
        var ceil = createRound('ceil');
        var floor = createRound('floor');
        function max(array) {
          return (array && array.length) ? baseExtremum(array, identity, gt) : undefined;
        }
        function maxBy(array, iteratee) {
          return (array && array.length) ? baseExtremum(array, getIteratee(iteratee), gt) : undefined;
        }
        function mean(array) {
          return sum(array) / (array ? array.length : 0);
        }
        function min(array) {
          return (array && array.length) ? baseExtremum(array, identity, lt) : undefined;
        }
        function minBy(array, iteratee) {
          return (array && array.length) ? baseExtremum(array, getIteratee(iteratee), lt) : undefined;
        }
        var round = createRound('round');
        function subtract(minuend, subtrahend) {
          var result;
          if (minuend === undefined && subtrahend === undefined) {
            return 0;
          }
          if (minuend !== undefined) {
            result = minuend;
          }
          if (subtrahend !== undefined) {
            result = result === undefined ? subtrahend : (result - subtrahend);
          }
          return result;
        }
        function sum(array) {
          return (array && array.length) ? baseSum(array, identity) : 0;
        }
        function sumBy(array, iteratee) {
          return (array && array.length) ? baseSum(array, getIteratee(iteratee)) : 0;
        }
        lodash.prototype = baseLodash.prototype;
        lodash.prototype.constructor = lodash;
        LodashWrapper.prototype = baseCreate(baseLodash.prototype);
        LodashWrapper.prototype.constructor = LodashWrapper;
        LazyWrapper.prototype = baseCreate(baseLodash.prototype);
        LazyWrapper.prototype.constructor = LazyWrapper;
        Hash.prototype = nativeCreate ? nativeCreate(null) : objectProto;
        MapCache.prototype.clear = mapClear;
        MapCache.prototype['delete'] = mapDelete;
        MapCache.prototype.get = mapGet;
        MapCache.prototype.has = mapHas;
        MapCache.prototype.set = mapSet;
        SetCache.prototype.push = cachePush;
        Stack.prototype.clear = stackClear;
        Stack.prototype['delete'] = stackDelete;
        Stack.prototype.get = stackGet;
        Stack.prototype.has = stackHas;
        Stack.prototype.set = stackSet;
        memoize.Cache = MapCache;
        lodash.after = after;
        lodash.ary = ary;
        lodash.assign = assign;
        lodash.assignIn = assignIn;
        lodash.assignInWith = assignInWith;
        lodash.assignWith = assignWith;
        lodash.at = at;
        lodash.before = before;
        lodash.bind = bind;
        lodash.bindAll = bindAll;
        lodash.bindKey = bindKey;
        lodash.castArray = castArray;
        lodash.chain = chain;
        lodash.chunk = chunk;
        lodash.compact = compact;
        lodash.concat = concat;
        lodash.cond = cond;
        lodash.conforms = conforms;
        lodash.constant = constant;
        lodash.countBy = countBy;
        lodash.create = create;
        lodash.curry = curry;
        lodash.curryRight = curryRight;
        lodash.debounce = debounce;
        lodash.defaults = defaults;
        lodash.defaultsDeep = defaultsDeep;
        lodash.defer = defer;
        lodash.delay = delay;
        lodash.difference = difference;
        lodash.differenceBy = differenceBy;
        lodash.differenceWith = differenceWith;
        lodash.drop = drop;
        lodash.dropRight = dropRight;
        lodash.dropRightWhile = dropRightWhile;
        lodash.dropWhile = dropWhile;
        lodash.fill = fill;
        lodash.filter = filter;
        lodash.flatMap = flatMap;
        lodash.flatten = flatten;
        lodash.flattenDeep = flattenDeep;
        lodash.flattenDepth = flattenDepth;
        lodash.flip = flip;
        lodash.flow = flow;
        lodash.flowRight = flowRight;
        lodash.fromPairs = fromPairs;
        lodash.functions = functions;
        lodash.functionsIn = functionsIn;
        lodash.groupBy = groupBy;
        lodash.initial = initial;
        lodash.intersection = intersection;
        lodash.intersectionBy = intersectionBy;
        lodash.intersectionWith = intersectionWith;
        lodash.invert = invert;
        lodash.invertBy = invertBy;
        lodash.invokeMap = invokeMap;
        lodash.iteratee = iteratee;
        lodash.keyBy = keyBy;
        lodash.keys = keys;
        lodash.keysIn = keysIn;
        lodash.map = map;
        lodash.mapKeys = mapKeys;
        lodash.mapValues = mapValues;
        lodash.matches = matches;
        lodash.matchesProperty = matchesProperty;
        lodash.memoize = memoize;
        lodash.merge = merge;
        lodash.mergeWith = mergeWith;
        lodash.method = method;
        lodash.methodOf = methodOf;
        lodash.mixin = mixin;
        lodash.negate = negate;
        lodash.nthArg = nthArg;
        lodash.omit = omit;
        lodash.omitBy = omitBy;
        lodash.once = once;
        lodash.orderBy = orderBy;
        lodash.over = over;
        lodash.overArgs = overArgs;
        lodash.overEvery = overEvery;
        lodash.overSome = overSome;
        lodash.partial = partial;
        lodash.partialRight = partialRight;
        lodash.partition = partition;
        lodash.pick = pick;
        lodash.pickBy = pickBy;
        lodash.property = property;
        lodash.propertyOf = propertyOf;
        lodash.pull = pull;
        lodash.pullAll = pullAll;
        lodash.pullAllBy = pullAllBy;
        lodash.pullAllWith = pullAllWith;
        lodash.pullAt = pullAt;
        lodash.range = range;
        lodash.rangeRight = rangeRight;
        lodash.rearg = rearg;
        lodash.reject = reject;
        lodash.remove = remove;
        lodash.rest = rest;
        lodash.reverse = reverse;
        lodash.sampleSize = sampleSize;
        lodash.set = set;
        lodash.setWith = setWith;
        lodash.shuffle = shuffle;
        lodash.slice = slice;
        lodash.sortBy = sortBy;
        lodash.sortedUniq = sortedUniq;
        lodash.sortedUniqBy = sortedUniqBy;
        lodash.split = split;
        lodash.spread = spread;
        lodash.tail = tail;
        lodash.take = take;
        lodash.takeRight = takeRight;
        lodash.takeRightWhile = takeRightWhile;
        lodash.takeWhile = takeWhile;
        lodash.tap = tap;
        lodash.throttle = throttle;
        lodash.thru = thru;
        lodash.toArray = toArray;
        lodash.toPairs = toPairs;
        lodash.toPairsIn = toPairsIn;
        lodash.toPath = toPath;
        lodash.toPlainObject = toPlainObject;
        lodash.transform = transform;
        lodash.unary = unary;
        lodash.union = union;
        lodash.unionBy = unionBy;
        lodash.unionWith = unionWith;
        lodash.uniq = uniq;
        lodash.uniqBy = uniqBy;
        lodash.uniqWith = uniqWith;
        lodash.unset = unset;
        lodash.unzip = unzip;
        lodash.unzipWith = unzipWith;
        lodash.update = update;
        lodash.updateWith = updateWith;
        lodash.values = values;
        lodash.valuesIn = valuesIn;
        lodash.without = without;
        lodash.words = words;
        lodash.wrap = wrap;
        lodash.xor = xor;
        lodash.xorBy = xorBy;
        lodash.xorWith = xorWith;
        lodash.zip = zip;
        lodash.zipObject = zipObject;
        lodash.zipObjectDeep = zipObjectDeep;
        lodash.zipWith = zipWith;
        lodash.extend = assignIn;
        lodash.extendWith = assignInWith;
        mixin(lodash, lodash);
        lodash.add = add;
        lodash.attempt = attempt;
        lodash.camelCase = camelCase;
        lodash.capitalize = capitalize;
        lodash.ceil = ceil;
        lodash.clamp = clamp;
        lodash.clone = clone;
        lodash.cloneDeep = cloneDeep;
        lodash.cloneDeepWith = cloneDeepWith;
        lodash.cloneWith = cloneWith;
        lodash.deburr = deburr;
        lodash.endsWith = endsWith;
        lodash.eq = eq;
        lodash.escape = escape;
        lodash.escapeRegExp = escapeRegExp;
        lodash.every = every;
        lodash.find = find;
        lodash.findIndex = findIndex;
        lodash.findKey = findKey;
        lodash.findLast = findLast;
        lodash.findLastIndex = findLastIndex;
        lodash.findLastKey = findLastKey;
        lodash.floor = floor;
        lodash.forEach = forEach;
        lodash.forEachRight = forEachRight;
        lodash.forIn = forIn;
        lodash.forInRight = forInRight;
        lodash.forOwn = forOwn;
        lodash.forOwnRight = forOwnRight;
        lodash.get = get;
        lodash.gt = gt;
        lodash.gte = gte;
        lodash.has = has;
        lodash.hasIn = hasIn;
        lodash.head = head;
        lodash.identity = identity;
        lodash.includes = includes;
        lodash.indexOf = indexOf;
        lodash.inRange = inRange;
        lodash.invoke = invoke;
        lodash.isArguments = isArguments;
        lodash.isArray = isArray;
        lodash.isArrayBuffer = isArrayBuffer;
        lodash.isArrayLike = isArrayLike;
        lodash.isArrayLikeObject = isArrayLikeObject;
        lodash.isBoolean = isBoolean;
        lodash.isBuffer = isBuffer;
        lodash.isDate = isDate;
        lodash.isElement = isElement;
        lodash.isEmpty = isEmpty;
        lodash.isEqual = isEqual;
        lodash.isEqualWith = isEqualWith;
        lodash.isError = isError;
        lodash.isFinite = isFinite;
        lodash.isFunction = isFunction;
        lodash.isInteger = isInteger;
        lodash.isLength = isLength;
        lodash.isMap = isMap;
        lodash.isMatch = isMatch;
        lodash.isMatchWith = isMatchWith;
        lodash.isNaN = isNaN;
        lodash.isNative = isNative;
        lodash.isNil = isNil;
        lodash.isNull = isNull;
        lodash.isNumber = isNumber;
        lodash.isObject = isObject;
        lodash.isObjectLike = isObjectLike;
        lodash.isPlainObject = isPlainObject;
        lodash.isRegExp = isRegExp;
        lodash.isSafeInteger = isSafeInteger;
        lodash.isSet = isSet;
        lodash.isString = isString;
        lodash.isSymbol = isSymbol;
        lodash.isTypedArray = isTypedArray;
        lodash.isUndefined = isUndefined;
        lodash.isWeakMap = isWeakMap;
        lodash.isWeakSet = isWeakSet;
        lodash.join = join;
        lodash.kebabCase = kebabCase;
        lodash.last = last;
        lodash.lastIndexOf = lastIndexOf;
        lodash.lowerCase = lowerCase;
        lodash.lowerFirst = lowerFirst;
        lodash.lt = lt;
        lodash.lte = lte;
        lodash.max = max;
        lodash.maxBy = maxBy;
        lodash.mean = mean;
        lodash.min = min;
        lodash.minBy = minBy;
        lodash.noConflict = noConflict;
        lodash.noop = noop;
        lodash.now = now;
        lodash.pad = pad;
        lodash.padEnd = padEnd;
        lodash.padStart = padStart;
        lodash.parseInt = parseInt;
        lodash.random = random;
        lodash.reduce = reduce;
        lodash.reduceRight = reduceRight;
        lodash.repeat = repeat;
        lodash.replace = replace;
        lodash.result = result;
        lodash.round = round;
        lodash.runInContext = runInContext;
        lodash.sample = sample;
        lodash.size = size;
        lodash.snakeCase = snakeCase;
        lodash.some = some;
        lodash.sortedIndex = sortedIndex;
        lodash.sortedIndexBy = sortedIndexBy;
        lodash.sortedIndexOf = sortedIndexOf;
        lodash.sortedLastIndex = sortedLastIndex;
        lodash.sortedLastIndexBy = sortedLastIndexBy;
        lodash.sortedLastIndexOf = sortedLastIndexOf;
        lodash.startCase = startCase;
        lodash.startsWith = startsWith;
        lodash.subtract = subtract;
        lodash.sum = sum;
        lodash.sumBy = sumBy;
        lodash.template = template;
        lodash.times = times;
        lodash.toInteger = toInteger;
        lodash.toLength = toLength;
        lodash.toLower = toLower;
        lodash.toNumber = toNumber;
        lodash.toSafeInteger = toSafeInteger;
        lodash.toString = toString;
        lodash.toUpper = toUpper;
        lodash.trim = trim;
        lodash.trimEnd = trimEnd;
        lodash.trimStart = trimStart;
        lodash.truncate = truncate;
        lodash.unescape = unescape;
        lodash.uniqueId = uniqueId;
        lodash.upperCase = upperCase;
        lodash.upperFirst = upperFirst;
        lodash.each = forEach;
        lodash.eachRight = forEachRight;
        lodash.first = head;
        mixin(lodash, (function() {
          var source = {};
          baseForOwn(lodash, function(func, methodName) {
            if (!hasOwnProperty.call(lodash.prototype, methodName)) {
              source[methodName] = func;
            }
          });
          return source;
        }()), {'chain': false});
        lodash.VERSION = VERSION;
        arrayEach(['bind', 'bindKey', 'curry', 'curryRight', 'partial', 'partialRight'], function(methodName) {
          lodash[methodName].placeholder = lodash;
        });
        arrayEach(['drop', 'take'], function(methodName, index) {
          LazyWrapper.prototype[methodName] = function(n) {
            var filtered = this.__filtered__;
            if (filtered && !index) {
              return new LazyWrapper(this);
            }
            n = n === undefined ? 1 : nativeMax(toInteger(n), 0);
            var result = this.clone();
            if (filtered) {
              result.__takeCount__ = nativeMin(n, result.__takeCount__);
            } else {
              result.__views__.push({
                'size': nativeMin(n, MAX_ARRAY_LENGTH),
                'type': methodName + (result.__dir__ < 0 ? 'Right' : '')
              });
            }
            return result;
          };
          LazyWrapper.prototype[methodName + 'Right'] = function(n) {
            return this.reverse()[methodName](n).reverse();
          };
        });
        arrayEach(['filter', 'map', 'takeWhile'], function(methodName, index) {
          var type = index + 1,
              isFilter = type == LAZY_FILTER_FLAG || type == LAZY_WHILE_FLAG;
          LazyWrapper.prototype[methodName] = function(iteratee) {
            var result = this.clone();
            result.__iteratees__.push({
              'iteratee': getIteratee(iteratee, 3),
              'type': type
            });
            result.__filtered__ = result.__filtered__ || isFilter;
            return result;
          };
        });
        arrayEach(['head', 'last'], function(methodName, index) {
          var takeName = 'take' + (index ? 'Right' : '');
          LazyWrapper.prototype[methodName] = function() {
            return this[takeName](1).value()[0];
          };
        });
        arrayEach(['initial', 'tail'], function(methodName, index) {
          var dropName = 'drop' + (index ? '' : 'Right');
          LazyWrapper.prototype[methodName] = function() {
            return this.__filtered__ ? new LazyWrapper(this) : this[dropName](1);
          };
        });
        LazyWrapper.prototype.compact = function() {
          return this.filter(identity);
        };
        LazyWrapper.prototype.find = function(predicate) {
          return this.filter(predicate).head();
        };
        LazyWrapper.prototype.findLast = function(predicate) {
          return this.reverse().find(predicate);
        };
        LazyWrapper.prototype.invokeMap = rest(function(path, args) {
          if (typeof path == 'function') {
            return new LazyWrapper(this);
          }
          return this.map(function(value) {
            return baseInvoke(value, path, args);
          });
        });
        LazyWrapper.prototype.reject = function(predicate) {
          predicate = getIteratee(predicate, 3);
          return this.filter(function(value) {
            return !predicate(value);
          });
        };
        LazyWrapper.prototype.slice = function(start, end) {
          start = toInteger(start);
          var result = this;
          if (result.__filtered__ && (start > 0 || end < 0)) {
            return new LazyWrapper(result);
          }
          if (start < 0) {
            result = result.takeRight(-start);
          } else if (start) {
            result = result.drop(start);
          }
          if (end !== undefined) {
            end = toInteger(end);
            result = end < 0 ? result.dropRight(-end) : result.take(end - start);
          }
          return result;
        };
        LazyWrapper.prototype.takeRightWhile = function(predicate) {
          return this.reverse().takeWhile(predicate).reverse();
        };
        LazyWrapper.prototype.toArray = function() {
          return this.take(MAX_ARRAY_LENGTH);
        };
        baseForOwn(LazyWrapper.prototype, function(func, methodName) {
          var checkIteratee = /^(?:filter|find|map|reject)|While$/.test(methodName),
              isTaker = /^(?:head|last)$/.test(methodName),
              lodashFunc = lodash[isTaker ? ('take' + (methodName == 'last' ? 'Right' : '')) : methodName],
              retUnwrapped = isTaker || /^find/.test(methodName);
          if (!lodashFunc) {
            return;
          }
          lodash.prototype[methodName] = function() {
            var value = this.__wrapped__,
                args = isTaker ? [1] : arguments,
                isLazy = value instanceof LazyWrapper,
                iteratee = args[0],
                useLazy = isLazy || isArray(value);
            var interceptor = function(value) {
              var result = lodashFunc.apply(lodash, arrayPush([value], args));
              return (isTaker && chainAll) ? result[0] : result;
            };
            if (useLazy && checkIteratee && typeof iteratee == 'function' && iteratee.length != 1) {
              isLazy = useLazy = false;
            }
            var chainAll = this.__chain__,
                isHybrid = !!this.__actions__.length,
                isUnwrapped = retUnwrapped && !chainAll,
                onlyLazy = isLazy && !isHybrid;
            if (!retUnwrapped && useLazy) {
              value = onlyLazy ? value : new LazyWrapper(this);
              var result = func.apply(value, args);
              result.__actions__.push({
                'func': thru,
                'args': [interceptor],
                'thisArg': undefined
              });
              return new LodashWrapper(result, chainAll);
            }
            if (isUnwrapped && onlyLazy) {
              return func.apply(this, args);
            }
            result = this.thru(interceptor);
            return isUnwrapped ? (isTaker ? result.value()[0] : result.value()) : result;
          };
        });
        arrayEach(['pop', 'push', 'shift', 'sort', 'splice', 'unshift'], function(methodName) {
          var func = arrayProto[methodName],
              chainName = /^(?:push|sort|unshift)$/.test(methodName) ? 'tap' : 'thru',
              retUnwrapped = /^(?:pop|shift)$/.test(methodName);
          lodash.prototype[methodName] = function() {
            var args = arguments;
            if (retUnwrapped && !this.__chain__) {
              return func.apply(this.value(), args);
            }
            return this[chainName](function(value) {
              return func.apply(value, args);
            });
          };
        });
        baseForOwn(LazyWrapper.prototype, function(func, methodName) {
          var lodashFunc = lodash[methodName];
          if (lodashFunc) {
            var key = (lodashFunc.name + ''),
                names = realNames[key] || (realNames[key] = []);
            names.push({
              'name': methodName,
              'func': lodashFunc
            });
          }
        });
        realNames[createHybridWrapper(undefined, BIND_KEY_FLAG).name] = [{
          'name': 'wrapper',
          'func': undefined
        }];
        LazyWrapper.prototype.clone = lazyClone;
        LazyWrapper.prototype.reverse = lazyReverse;
        LazyWrapper.prototype.value = lazyValue;
        lodash.prototype.at = wrapperAt;
        lodash.prototype.chain = wrapperChain;
        lodash.prototype.commit = wrapperCommit;
        lodash.prototype.flatMap = wrapperFlatMap;
        lodash.prototype.next = wrapperNext;
        lodash.prototype.plant = wrapperPlant;
        lodash.prototype.reverse = wrapperReverse;
        lodash.prototype.toJSON = lodash.prototype.valueOf = lodash.prototype.value = wrapperValue;
        if (iteratorSymbol) {
          lodash.prototype[iteratorSymbol] = wrapperToIterator;
        }
        return lodash;
      }
      var _ = runInContext();
      (freeWindow || freeSelf || {})._ = _;
      if (typeof define == 'function' && typeof define.amd == 'object' && define.amd) {
        define(function() {
          return _;
        });
      } else if (freeExports && freeModule) {
        if (moduleExports) {
          (freeModule.exports = _)._ = _;
        }
        freeExports._ = _;
      } else {
        root._ = _;
      }
    }.call(this));
  })($__require('3c').Buffer, $__require('20'));
  return module.exports;
});

$__System.registerDynamic("ee", ["ed"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = $__require('ed');
  return module.exports;
});

$__System.register('ef', ['27', 'f0', 'f1', 'f2', 'f3', 'de', 'e3', 'ee'], function (_export) {
    var _Object$getOwnPropertyDescriptor, _createClass, _classCallCheck, _Object$defineProperty, _getIterator, _Object$getOwnPropertyNames, _Object$keys, _, ObjectHelper;

    return {
        setters: [function (_2) {
            _Object$getOwnPropertyDescriptor = _2['default'];
        }, function (_f0) {
            _createClass = _f0['default'];
        }, function (_f1) {
            _classCallCheck = _f1['default'];
        }, function (_f2) {
            _Object$defineProperty = _f2['default'];
        }, function (_f3) {
            _getIterator = _f3['default'];
        }, function (_de) {
            _Object$getOwnPropertyNames = _de['default'];
        }, function (_e3) {
            _Object$keys = _e3['default'];
        }, function (_ee) {
            _ = _ee['default'];
        }],
        execute: function () {
            /**
             This Source Code is licensed under the MIT license. If a copy of the
             MIT-license was not distributed with this file, You can obtain one at:
             http://opensource.org/licenses/mit-license.html.
            
             @author: Tom Clement (tjclement)
             @license MIT
             @copyright Bizboard, 2015
            
             */

            'use strict';

            ObjectHelper = (function () {
                function ObjectHelper() {
                    _classCallCheck(this, ObjectHelper);
                }

                _createClass(ObjectHelper, null, [{
                    key: 'hideMethodsAndPrivatePropertiesFromObject',

                    /* Sets enumerability of methods and all properties starting with '_' on an object to false,
                     * effectively hiding them from for(x in object) loops.   */
                    value: function hideMethodsAndPrivatePropertiesFromObject(object) {
                        for (var propName in object) {

                            var prototype = Object.getPrototypeOf(object);
                            var descriptor = prototype ? _Object$getOwnPropertyDescriptor(prototype, propName) : undefined;
                            if (descriptor && (descriptor.get || descriptor.set) && !propName.startsWith('_')) {
                                /* This is a public getter/setter, so we can skip it */
                                continue;
                            }

                            var property = object[propName];
                            if (typeof property === 'function' || propName.startsWith('_')) {
                                ObjectHelper.hidePropertyFromObject(object, propName);
                            }
                        }
                    }

                    /* Sets enumerability of methods on an object to false,
                     * effectively hiding them from for(x in object) loops.   */
                }, {
                    key: 'hideMethodsFromObject',
                    value: function hideMethodsFromObject(object) {
                        for (var propName in object) {
                            var property = object[propName];
                            if (typeof property === 'function') {
                                ObjectHelper.hidePropertyFromObject(object, propName);
                            }
                        }
                    }

                    /* Sets enumerability of an object's property to false,
                     * effectively hiding it from for(x in object) loops.   */
                }, {
                    key: 'hidePropertyFromObject',
                    value: function hidePropertyFromObject(object, propName) {
                        var prototype = object;
                        var descriptor = _Object$getOwnPropertyDescriptor(object, propName);
                        while (!descriptor) {
                            prototype = Object.getPrototypeOf(prototype);

                            if (prototype.constructor.name === 'Object' || prototype.constructor.name === 'Array') {
                                return;
                            }

                            descriptor = _Object$getOwnPropertyDescriptor(prototype, propName);
                        }
                        descriptor.enumerable = false;
                        _Object$defineProperty(prototype, propName, descriptor);
                        _Object$defineProperty(object, propName, descriptor);
                    }

                    /* Sets enumerability of all of an object's properties (including methods) to false,
                     * effectively hiding them from for(x in object) loops.   */
                }, {
                    key: 'hideAllPropertiesFromObject',
                    value: function hideAllPropertiesFromObject(object) {
                        for (var propName in object) {
                            ObjectHelper.hidePropertyFromObject(object, propName);
                        }
                    }

                    /* Adds a property with enumerable: false to object */
                }, {
                    key: 'addHiddenPropertyToObject',
                    value: function addHiddenPropertyToObject(object, propName, prop) {
                        var writable = arguments.length <= 3 || arguments[3] === undefined ? true : arguments[3];
                        var useAccessors = arguments.length <= 4 || arguments[4] === undefined ? true : arguments[4];

                        return ObjectHelper.addPropertyToObject(object, propName, prop, false, writable, undefined, useAccessors);
                    }

                    /* Adds a property with given enumerability and writability to object. If writable, uses a hidden object.shadow
                     * property to save the actual data state, and object[propName] with gettter/setter to the shadow. Allows for a
                     * callback to be triggered upon every set.   */
                }, {
                    key: 'addPropertyToObject',
                    value: function addPropertyToObject(object, propName, prop) {
                        var enumerable = arguments.length <= 3 || arguments[3] === undefined ? true : arguments[3];
                        var writable = arguments.length <= 4 || arguments[4] === undefined ? true : arguments[4];
                        var setCallback = arguments.length <= 5 || arguments[5] === undefined ? null : arguments[5];
                        var useAccessors = arguments.length <= 6 || arguments[6] === undefined ? true : arguments[6];

                        /* If property is non-writable, we won't need a shadowed prop for the getters/setters */
                        if (!writable || !useAccessors) {
                            var descriptor = {
                                enumerable: enumerable,
                                writable: writable,
                                value: prop
                            };
                            _Object$defineProperty(object, propName, descriptor);
                        } else {
                            ObjectHelper.addGetSetPropertyWithShadow(object, propName, prop, enumerable, writable, setCallback);
                        }
                    }

                    /* Adds given property to the object with get() and set() accessors, and saves actual data in object.shadow */
                }, {
                    key: 'addGetSetPropertyWithShadow',
                    value: function addGetSetPropertyWithShadow(object, propName, prop) {
                        var enumerable = arguments.length <= 3 || arguments[3] === undefined ? true : arguments[3];
                        var writable = arguments.length <= 4 || arguments[4] === undefined ? true : arguments[4];
                        var setCallback = arguments.length <= 5 || arguments[5] === undefined ? null : arguments[5];

                        ObjectHelper.buildPropertyShadow(object, propName, prop);
                        ObjectHelper.buildGetSetProperty(object, propName, enumerable, writable, setCallback);
                    }

                    /* Creates or extends object.shadow to contain a property with name propName */
                }, {
                    key: 'buildPropertyShadow',
                    value: function buildPropertyShadow(object, propName, prop) {
                        var shadow = {};

                        try {
                            /* If a shadow property already exists, we should extend instead of overwriting it. */
                            if ('shadow' in object) {
                                shadow = object.shadow;
                            }
                        } catch (error) {
                            return;
                        }

                        shadow[propName] = prop;
                        Object.defineProperty(object, 'shadow', {
                            writable: true,
                            configurable: true,
                            enumerable: false,
                            value: shadow
                        });
                    }

                    /* Creates a property on object that has a getter that fetches from object.shadow,
                     * and a setter that sets object.shadow as well as triggers setCallback() if set.   */
                }, {
                    key: 'buildGetSetProperty',
                    value: function buildGetSetProperty(object, propName) {
                        var enumerable = arguments.length <= 2 || arguments[2] === undefined ? true : arguments[2];
                        var writable = arguments.length <= 3 || arguments[3] === undefined ? true : arguments[3];
                        var setCallback = arguments.length <= 4 || arguments[4] === undefined ? null : arguments[4];

                        var descriptor = {
                            enumerable: enumerable,
                            configurable: true,
                            get: function get() {
                                return object.shadow[propName];
                            },
                            set: function set(value) {
                                if (writable) {
                                    object.shadow[propName] = value;
                                    if (setCallback && typeof setCallback === 'function') {
                                        setCallback({
                                            propertyName: propName,
                                            newValue: value
                                        });
                                    }
                                } else {
                                    throw new ReferenceError('Attempted to write to non-writable property ' + propName + '.');
                                }
                            }
                        };

                        _Object$defineProperty(object, propName, descriptor);
                    }

                    /* Calls object['functionName'].bind(bindTarget) on all of object's functions. */
                }, {
                    key: 'bindAllMethods',
                    value: function bindAllMethods(object, bindTarget) {

                        /* Bind all current object's methods to bindTarget. */
                        var methodDescriptors = ObjectHelper.getMethodDescriptors(object);
                        for (var methodName in methodDescriptors) {
                            var propertyDescriptor = methodDescriptors[methodName];
                            if (propertyDescriptor && propertyDescriptor.get) {
                                propertyDescriptor.get = propertyDescriptor.get.bind(bindTarget);
                            } else if (propertyDescriptor.set) {
                                propertyDescriptor.set = propertyDescriptor.set.bind(bindTarget);
                            } else if (propertyDescriptor.writable) {
                                propertyDescriptor.value = propertyDescriptor.value.bind(bindTarget);
                            }
                            _Object$defineProperty(object, methodName, propertyDescriptor);
                        }
                    }
                }, {
                    key: 'getMethodDescriptors',
                    value: function getMethodDescriptors(object) {

                        var methodDescriptors = {};

                        var _iteratorNormalCompletion = true;
                        var _didIteratorError = false;
                        var _iteratorError = undefined;

                        try {
                            for (var _iterator = _getIterator(_Object$getOwnPropertyNames(object)), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                                var propertyName = _step.value;

                                var propertyDescriptor = _Object$getOwnPropertyDescriptor(object, propertyName) || {};
                                /* Initializers can be ignored since they are bound anyways */
                                if (!propertyDescriptor.initializer && (propertyDescriptor.get || typeof object[propertyName] === 'function')) {
                                    methodDescriptors[propertyName] = propertyDescriptor;
                                }
                            }

                            /* Recursively find prototype's methods until we hit the Object prototype. */
                        } catch (err) {
                            _didIteratorError = true;
                            _iteratorError = err;
                        } finally {
                            try {
                                if (!_iteratorNormalCompletion && _iterator['return']) {
                                    _iterator['return']();
                                }
                            } finally {
                                if (_didIteratorError) {
                                    throw _iteratorError;
                                }
                            }
                        }

                        var prototype = Object.getPrototypeOf(object);
                        if (prototype.constructor.name !== 'Object' && prototype.constructor.name !== 'Array') {
                            methodDescriptors = _.extend(ObjectHelper.getMethodDescriptors(prototype), methodDescriptors);
                        }

                        return methodDescriptors;
                    }

                    /* Returns a new object with all enumerable properties of the given object */
                }, {
                    key: 'getEnumerableProperties',
                    value: function getEnumerableProperties(object) {

                        return ObjectHelper.getPrototypeEnumerableProperties(object, object);
                    }
                }, {
                    key: 'getPrototypeEnumerableProperties',
                    value: function getPrototypeEnumerableProperties(rootObject, prototype) {
                        var result = {};

                        /* Collect all propertise in the prototype's keys() enumerable */
                        var propNames = _Object$keys(prototype);
                        var _iteratorNormalCompletion2 = true;
                        var _didIteratorError2 = false;
                        var _iteratorError2 = undefined;

                        try {
                            for (var _iterator2 = _getIterator(propNames), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                                var _name = _step2.value;

                                var value = rootObject[_name];

                                /* Value must be a non-null primitive or object to be pushable to a dataSource */
                                if (value !== null && value !== undefined && typeof value !== 'function') {
                                    if (typeof value === 'object' && !(value instanceof Array)) {
                                        result[_name] = ObjectHelper.getEnumerableProperties(value);
                                    } else {
                                        result[_name] = value;
                                    }
                                }
                            }

                            /* Collect all properties with accessors (getters/setters) that are enumerable, too */
                        } catch (err) {
                            _didIteratorError2 = true;
                            _iteratorError2 = err;
                        } finally {
                            try {
                                if (!_iteratorNormalCompletion2 && _iterator2['return']) {
                                    _iterator2['return']();
                                }
                            } finally {
                                if (_didIteratorError2) {
                                    throw _iteratorError2;
                                }
                            }
                        }

                        var descriptorNames = _Object$getOwnPropertyNames(prototype);
                        descriptorNames = descriptorNames.filter(function (name) {
                            return propNames.indexOf(name) < 0;
                        });
                        var _iteratorNormalCompletion3 = true;
                        var _didIteratorError3 = false;
                        var _iteratorError3 = undefined;

                        try {
                            for (var _iterator3 = _getIterator(descriptorNames), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
                                var _name2 = _step3.value;

                                var descriptor = _Object$getOwnPropertyDescriptor(prototype, _name2);
                                if (descriptor && descriptor.enumerable) {
                                    var value = rootObject[_name2];

                                    /* Value must be a non-null primitive or object to be pushable to a dataSource */
                                    if (value !== null && value !== undefined && typeof value !== 'function') {
                                        if (typeof value === 'object' && !(value instanceof Array)) {
                                            result[_name2] = ObjectHelper.getEnumerableProperties(value);
                                        } else {
                                            result[_name2] = value;
                                        }
                                    }
                                }
                            }

                            /* Collect all enumerable properties in the prototype's prototype as well */
                        } catch (err) {
                            _didIteratorError3 = true;
                            _iteratorError3 = err;
                        } finally {
                            try {
                                if (!_iteratorNormalCompletion3 && _iterator3['return']) {
                                    _iterator3['return']();
                                }
                            } finally {
                                if (_didIteratorError3) {
                                    throw _iteratorError3;
                                }
                            }
                        }

                        var superPrototype = Object.getPrototypeOf(prototype);
                        var ignorableTypes = ['Object', 'Array', 'EventEmitter'];
                        if (ignorableTypes.indexOf(superPrototype.constructor.name) === -1) {
                            var prototypeEnumerables = ObjectHelper.getPrototypeEnumerableProperties(rootObject, superPrototype);
                            _.merge(result, prototypeEnumerables);
                        }

                        return result;
                    }
                }]);

                return ObjectHelper;
            })();

            _export('ObjectHelper', ObjectHelper);
        }
    };
});
$__System.register('f4', [], function (_export) {
    /**
     This Source Code is licensed under the MIT license. If a copy of the
     MIT-license was not distributed with this file, You can obtain one at:
     http://opensource.org/licenses/mit-license.html.
    
     @author: Hans van den Akker (mysim1)
     @license MIT
     @copyright Bizboard, 2015
    
     */

    'use strict';

    _export('ParseStringToXml', ParseStringToXml);

    function ParseStringToXml(text) {
        try {
            var xml = null;

            if (window.DOMParser) {

                var parser = new DOMParser();
                xml = parser.parseFromString(text, 'text/xml');

                var found = xml.getElementsByTagName('parsererror');

                if (!found || !found.length || !found[0].childNodes.length) {
                    return xml;
                }

                return null;
            } else {

                if (typeof ActiveXObject !== 'function') {
                    var ActiveXObject = function ActiveXObject() {};
                }

                xml = new ActiveXObject('Microsoft.XMLDOM');

                xml.async = false;
                xml.loadXML(text);

                return xml;
            }
        } catch (e) {
            // suppress
            console.log('Error parsing the string to xml.');
        }
    }

    return {
        setters: [],
        execute: function () {}
    };
});
$__System.register('f5', ['f0', 'f1', 'f3', '1f', '2f', 'd8', 'ee', 'ef', 'f6', 'f4'], function (_export) {
    var _createClass, _classCallCheck, _getIterator, _Promise, XML2JS, xmljs, _, ObjectHelper, PostRequest, ParseStringToXml, SoapClient;

    return {
        setters: [function (_f0) {
            _createClass = _f0['default'];
        }, function (_f1) {
            _classCallCheck = _f1['default'];
        }, function (_f3) {
            _getIterator = _f3['default'];
        }, function (_f) {
            _Promise = _f['default'];
        }, function (_f2) {
            XML2JS = _f2['default'];
        }, function (_d8) {
            xmljs = _d8['default'];
        }, function (_ee) {
            _ = _ee['default'];
        }, function (_ef) {
            ObjectHelper = _ef.ObjectHelper;
        }, function (_f6) {
            PostRequest = _f6.PostRequest;
        }, function (_f4) {
            ParseStringToXml = _f4.ParseStringToXml;
        }],
        execute: function () {
            /**
             This Source Code is licensed under the MIT license. If a copy of the
             MIT-license was not distributed with this file, You can obtain one at:
             http://opensource.org/licenses/mit-license.html.
            
             @author: Hans van den Akker (mysim1)
             @license MIT
             @copyright Bizboard, 2015
            
             */

            'use strict';

            SoapClient = (function () {
                function SoapClient() {
                    _classCallCheck(this, SoapClient);

                    /* Bind all local methods to the current object instance, so we can refer to "this"
                     * in the methods as expected, even when they're called from event handlers.        */
                    ObjectHelper.bindAllMethods(this, this);

                    /* Hide all private properties (starting with '_') and methods from enumeration,
                     * so when you do for( in ), only actual data properties show up. */
                    ObjectHelper.hideMethodsAndPrivatePropertiesFromObject(this);

                    /* Hide the priority field from enumeration, so we don't save it to the dataSource. */
                    ObjectHelper.hidePropertyFromObject(Object.getPrototypeOf(this), 'length');
                }

                _createClass(SoapClient, [{
                    key: '_applySoapTemplate',
                    value: function _applySoapTemplate(properties) {
                        return _.template('<?xml version="1.0" encoding="utf-8"?>' + '<soap:Envelope ' + '  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ' + '  xmlns:xsd="http://www.w3.org/2001/XMLSchema" ' + '  xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">' + '<soap:Body>' + '<<%= method %> xmlns="http://schemas.microsoft.com/sharepoint/soap/">' + '<%= params %>' + '</<%= method %>>' + '</soap:Body>' + '</soap:Envelope>')(properties);
                    }
                }, {
                    key: '_serializeParams',
                    value: function _serializeParams(params) {
                        if (!params || params.length == 0) return "";
                        var data = { "root": params };
                        var creator = new XML2JS();
                        var payload = creator.json2xml_str(data);

                        return payload.replace("<root>", "").replace("</root>", "");
                    }
                }, {
                    key: '_handleError',
                    value: function _handleError(error) {
                        return "Error!";
                    }

                    /**
                     * Replaces locally generated item IDs with their remote SharePoint counterparts.
                     * @param {String} text Text to replace the IDs in.
                     * @param {Array} tempKeys Array of {localId:x, remoteId:y} pairs.
                     * @returns {string} Text with the replaced IDs
                     * @private
                     */
                }, {
                    key: '_replaceTempKeys',
                    value: function _replaceTempKeys() {
                        var text = arguments.length <= 0 || arguments[0] === undefined ? '' : arguments[0];
                        var tempKeys = arguments.length <= 1 || arguments[1] === undefined ? [] : arguments[1];
                        var _iteratorNormalCompletion = true;
                        var _didIteratorError = false;
                        var _iteratorError = undefined;

                        try {
                            for (var _iterator = _getIterator(tempKeys), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                                var tempKey = _step.value;

                                /* Split/join is faster than doing a regex replace:
                                 * http://stackoverflow.com/questions/1144783/replacing-all-occurrences-of-a-string-in-javascript#comment27942520_1145525 */
                                text = text.split(tempKey.localId).join(tempKey.remoteId);
                            }
                        } catch (err) {
                            _didIteratorError = true;
                            _iteratorError = err;
                        } finally {
                            try {
                                if (!_iteratorNormalCompletion && _iterator['return']) {
                                    _iterator['return']();
                                }
                            } finally {
                                if (_didIteratorError) {
                                    throw _iteratorError;
                                }
                            }
                        }

                        return text;
                    }
                }, {
                    key: 'call',
                    value: function call(config) {
                        var tempKeys = arguments.length <= 1 || arguments[1] === undefined ? [] : arguments[1];

                        var request;
                        config = config || {};

                        request = {
                            url: config.url,
                            headers: config.headers,
                            data: this._applySoapTemplate({
                                method: config.method,
                                params: this._replaceTempKeys(this._serializeParams(config.params), tempKeys)
                            })
                        };

                        var context = this;
                        // Make the request.
                        return new _Promise(function (resolve, reject) {

                            PostRequest(request).then(function (soapresult) {

                                var parseString = xmljs.parseString;
                                parseString(soapresult.response, function (err, result) {
                                    resolve({ data: result, timestamp: soapresult.timestamp });
                                });
                            }, function (error) {
                                reject(context._handleError(error));
                            });
                        });
                    }
                }]);

                return SoapClient;
            })();

            _export('SoapClient', SoapClient);
        }
    };
});
$__System.registerDynamic("f7", ["3"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var $ = $__require('3');
  module.exports = function defineProperty(it, key, desc) {
    return $.setDesc(it, key, desc);
  };
  return module.exports;
});

$__System.registerDynamic("f2", ["f7"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = {
    "default": $__require('f7'),
    __esModule: true
  };
  return module.exports;
});

$__System.registerDynamic("f0", ["f2"], true, function($__require, exports, module) {
  "use strict";
  ;
  var define,
      global = this,
      GLOBAL = this;
  var _Object$defineProperty = $__require('f2')["default"];
  exports["default"] = (function() {
    function defineProperties(target, props) {
      for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor)
          descriptor.writable = true;
        _Object$defineProperty(target, descriptor.key, descriptor);
      }
    }
    return function(Constructor, protoProps, staticProps) {
      if (protoProps)
        defineProperties(Constructor.prototype, protoProps);
      if (staticProps)
        defineProperties(Constructor, staticProps);
      return Constructor;
    };
  })();
  exports.__esModule = true;
  return module.exports;
});

$__System.registerDynamic("f1", [], true, function($__require, exports, module) {
  "use strict";
  ;
  var define,
      global = this,
      GLOBAL = this;
  exports["default"] = function(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  };
  exports.__esModule = true;
  return module.exports;
});

$__System.register('f8', ['f0', 'f1'], function (_export) {
  var _createClass, _classCallCheck, Settings;

  return {
    setters: [function (_f0) {
      _createClass = _f0['default'];
    }, function (_f1) {
      _classCallCheck = _f1['default'];
    }],
    execute: function () {
      /**
       * Created by tom on 20/11/15.
       */

      'use strict';

      Settings = (function () {
        function Settings() {
          _classCallCheck(this, Settings);
        }

        _createClass(Settings, null, [{
          key: 'localKeyPrefix',
          get: function get() {
            return '_local_';
          }
        }]);

        return Settings;
      })();

      _export('Settings', Settings);
    }
  };
});
$__System.registerDynamic("2a", ["3", "f9", "14", "fa"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var getDesc = $__require('3').getDesc,
      isObject = $__require('f9'),
      anObject = $__require('14');
  var check = function(O, proto) {
    anObject(O);
    if (!isObject(proto) && proto !== null)
      throw TypeError(proto + ": can't set as prototype!");
  };
  module.exports = {
    set: Object.setPrototypeOf || ('__proto__' in {} ? function(test, buggy, set) {
      try {
        set = $__require('fa')(Function.call, getDesc(Object.prototype, '__proto__').set, 2);
        set(test, []);
        buggy = !(test instanceof Array);
      } catch (e) {
        buggy = true;
      }
      return function setPrototypeOf(O, proto) {
        check(O, proto);
        if (buggy)
          O.__proto__ = proto;
        else
          set(O, proto);
        return O;
      };
    }({}, false) : undefined),
    check: check
  };
  return module.exports;
});

$__System.registerDynamic("fb", [], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = Object.is || function is(x, y) {
    return x === y ? x !== 0 || 1 / x === 1 / y : x != x && y != y;
  };
  return module.exports;
});

$__System.registerDynamic("fc", ["14", "fd", "12"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var anObject = $__require('14'),
      aFunction = $__require('fd'),
      SPECIES = $__require('12')('species');
  module.exports = function(O, D) {
    var C = anObject(O).constructor,
        S;
    return C === undefined || (S = anObject(C)[SPECIES]) == undefined ? D : aFunction(S);
  };
  return module.exports;
});

$__System.registerDynamic("fe", [], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = function(fn, args, that) {
    var un = that === undefined;
    switch (args.length) {
      case 0:
        return un ? fn() : fn.call(that);
      case 1:
        return un ? fn(args[0]) : fn.call(that, args[0]);
      case 2:
        return un ? fn(args[0], args[1]) : fn.call(that, args[0], args[1]);
      case 3:
        return un ? fn(args[0], args[1], args[2]) : fn.call(that, args[0], args[1], args[2]);
      case 4:
        return un ? fn(args[0], args[1], args[2], args[3]) : fn.call(that, args[0], args[1], args[2], args[3]);
    }
    return fn.apply(that, args);
  };
  return module.exports;
});

$__System.registerDynamic("ff", ["9"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = $__require('9').document && document.documentElement;
  return module.exports;
});

$__System.registerDynamic("100", ["f9", "9"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var isObject = $__require('f9'),
      document = $__require('9').document,
      is = isObject(document) && isObject(document.createElement);
  module.exports = function(it) {
    return is ? document.createElement(it) : {};
  };
  return module.exports;
});

$__System.registerDynamic("101", ["fa", "fe", "ff", "100", "9", "7", "20"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  (function(process) {
    var ctx = $__require('fa'),
        invoke = $__require('fe'),
        html = $__require('ff'),
        cel = $__require('100'),
        global = $__require('9'),
        process = global.process,
        setTask = global.setImmediate,
        clearTask = global.clearImmediate,
        MessageChannel = global.MessageChannel,
        counter = 0,
        queue = {},
        ONREADYSTATECHANGE = 'onreadystatechange',
        defer,
        channel,
        port;
    var run = function() {
      var id = +this;
      if (queue.hasOwnProperty(id)) {
        var fn = queue[id];
        delete queue[id];
        fn();
      }
    };
    var listner = function(event) {
      run.call(event.data);
    };
    if (!setTask || !clearTask) {
      setTask = function setImmediate(fn) {
        var args = [],
            i = 1;
        while (arguments.length > i)
          args.push(arguments[i++]);
        queue[++counter] = function() {
          invoke(typeof fn == 'function' ? fn : Function(fn), args);
        };
        defer(counter);
        return counter;
      };
      clearTask = function clearImmediate(id) {
        delete queue[id];
      };
      if ($__require('7')(process) == 'process') {
        defer = function(id) {
          process.nextTick(ctx(run, id, 1));
        };
      } else if (MessageChannel) {
        channel = new MessageChannel;
        port = channel.port2;
        channel.port1.onmessage = listner;
        defer = ctx(port.postMessage, port, 1);
      } else if (global.addEventListener && typeof postMessage == 'function' && !global.importScripts) {
        defer = function(id) {
          global.postMessage(id + '', '*');
        };
        global.addEventListener('message', listner, false);
      } else if (ONREADYSTATECHANGE in cel('script')) {
        defer = function(id) {
          html.appendChild(cel('script'))[ONREADYSTATECHANGE] = function() {
            html.removeChild(this);
            run.call(id);
          };
        };
      } else {
        defer = function(id) {
          setTimeout(ctx(run, id, 1), 0);
        };
      }
    }
    module.exports = {
      set: setTask,
      clear: clearTask
    };
  })($__require('20'));
  return module.exports;
});

$__System.registerDynamic("102", ["9", "101", "7", "20"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  (function(process) {
    var global = $__require('9'),
        macrotask = $__require('101').set,
        Observer = global.MutationObserver || global.WebKitMutationObserver,
        process = global.process,
        Promise = global.Promise,
        isNode = $__require('7')(process) == 'process',
        head,
        last,
        notify;
    var flush = function() {
      var parent,
          domain,
          fn;
      if (isNode && (parent = process.domain)) {
        process.domain = null;
        parent.exit();
      }
      while (head) {
        domain = head.domain;
        fn = head.fn;
        if (domain)
          domain.enter();
        fn();
        if (domain)
          domain.exit();
        head = head.next;
      }
      last = undefined;
      if (parent)
        parent.enter();
    };
    if (isNode) {
      notify = function() {
        process.nextTick(flush);
      };
    } else if (Observer) {
      var toggle = 1,
          node = document.createTextNode('');
      new Observer(flush).observe(node, {characterData: true});
      notify = function() {
        node.data = toggle = -toggle;
      };
    } else if (Promise && Promise.resolve) {
      notify = function() {
        Promise.resolve().then(flush);
      };
    } else {
      notify = function() {
        macrotask.call(global, flush);
      };
    }
    module.exports = function asap(fn) {
      var task = {
        fn: fn,
        next: undefined,
        domain: isNode && process.domain
      };
      if (last)
        last.next = task;
      if (!head) {
        head = task;
        notify();
      }
      last = task;
    };
  })($__require('20'));
  return module.exports;
});

$__System.registerDynamic("103", ["12"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var ITERATOR = $__require('12')('iterator'),
      SAFE_CLOSING = false;
  try {
    var riter = [7][ITERATOR]();
    riter['return'] = function() {
      SAFE_CLOSING = true;
    };
    Array.from(riter, function() {
      throw 2;
    });
  } catch (e) {}
  module.exports = function(exec, skipClosing) {
    if (!skipClosing && !SAFE_CLOSING)
      return false;
    var safe = false;
    try {
      var arr = [7],
          iter = arr[ITERATOR]();
      iter.next = function() {
        safe = true;
      };
      arr[ITERATOR] = function() {
        return iter;
      };
      exec(arr);
    } catch (e) {}
    return safe;
  };
  return module.exports;
});

$__System.registerDynamic("d4", [], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var process = module.exports = {};
  var queue = [];
  var draining = false;
  var currentQueue;
  var queueIndex = -1;
  function cleanUpNextTick() {
    draining = false;
    if (currentQueue.length) {
      queue = currentQueue.concat(queue);
    } else {
      queueIndex = -1;
    }
    if (queue.length) {
      drainQueue();
    }
  }
  function drainQueue() {
    if (draining) {
      return;
    }
    var timeout = setTimeout(cleanUpNextTick);
    draining = true;
    var len = queue.length;
    while (len) {
      currentQueue = queue;
      queue = [];
      while (++queueIndex < len) {
        if (currentQueue) {
          currentQueue[queueIndex].run();
        }
      }
      queueIndex = -1;
      len = queue.length;
    }
    currentQueue = null;
    draining = false;
    clearTimeout(timeout);
  }
  process.nextTick = function(fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
      for (var i = 1; i < arguments.length; i++) {
        args[i - 1] = arguments[i];
      }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
      setTimeout(drainQueue, 0);
    }
  };
  function Item(fun, array) {
    this.fun = fun;
    this.array = array;
  }
  Item.prototype.run = function() {
    this.fun.apply(null, this.array);
  };
  process.title = 'browser';
  process.browser = true;
  process.env = {};
  process.argv = [];
  process.version = '';
  process.versions = {};
  function noop() {}
  process.on = noop;
  process.addListener = noop;
  process.once = noop;
  process.off = noop;
  process.removeListener = noop;
  process.removeAllListeners = noop;
  process.emit = noop;
  process.binding = function(name) {
    throw new Error('process.binding is not supported');
  };
  process.cwd = function() {
    return '/';
  };
  process.chdir = function(dir) {
    throw new Error('process.chdir is not supported');
  };
  process.umask = function() {
    return 0;
  };
  return module.exports;
});

$__System.registerDynamic("d3", ["d4"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = $__require('d4');
  return module.exports;
});

$__System.registerDynamic("104", ["d3"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = $__System._nodeRequire ? process : $__require('d3');
  return module.exports;
});

$__System.registerDynamic("20", ["104"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = $__require('104');
  return module.exports;
});

$__System.registerDynamic("105", ["3", "16", "9", "fa", "106", "c", "f9", "14", "fd", "107", "108", "2a", "fb", "12", "fc", "102", "b", "109", "10", "10a", "19", "103", "20"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  (function(process) {
    'use strict';
    var $ = $__require('3'),
        LIBRARY = $__require('16'),
        global = $__require('9'),
        ctx = $__require('fa'),
        classof = $__require('106'),
        $export = $__require('c'),
        isObject = $__require('f9'),
        anObject = $__require('14'),
        aFunction = $__require('fd'),
        strictNew = $__require('107'),
        forOf = $__require('108'),
        setProto = $__require('2a').set,
        same = $__require('fb'),
        SPECIES = $__require('12')('species'),
        speciesConstructor = $__require('fc'),
        asap = $__require('102'),
        PROMISE = 'Promise',
        process = global.process,
        isNode = classof(process) == 'process',
        P = global[PROMISE],
        Wrapper;
    var testResolve = function(sub) {
      var test = new P(function() {});
      if (sub)
        test.constructor = Object;
      return P.resolve(test) === test;
    };
    var USE_NATIVE = function() {
      var works = false;
      function P2(x) {
        var self = new P(x);
        setProto(self, P2.prototype);
        return self;
      }
      try {
        works = P && P.resolve && testResolve();
        setProto(P2, P);
        P2.prototype = $.create(P.prototype, {constructor: {value: P2}});
        if (!(P2.resolve(5).then(function() {}) instanceof P2)) {
          works = false;
        }
        if (works && $__require('b')) {
          var thenableThenGotten = false;
          P.resolve($.setDesc({}, 'then', {get: function() {
              thenableThenGotten = true;
            }}));
          works = thenableThenGotten;
        }
      } catch (e) {
        works = false;
      }
      return works;
    }();
    var sameConstructor = function(a, b) {
      if (LIBRARY && a === P && b === Wrapper)
        return true;
      return same(a, b);
    };
    var getConstructor = function(C) {
      var S = anObject(C)[SPECIES];
      return S != undefined ? S : C;
    };
    var isThenable = function(it) {
      var then;
      return isObject(it) && typeof(then = it.then) == 'function' ? then : false;
    };
    var PromiseCapability = function(C) {
      var resolve,
          reject;
      this.promise = new C(function($$resolve, $$reject) {
        if (resolve !== undefined || reject !== undefined)
          throw TypeError('Bad Promise constructor');
        resolve = $$resolve;
        reject = $$reject;
      });
      this.resolve = aFunction(resolve), this.reject = aFunction(reject);
    };
    var perform = function(exec) {
      try {
        exec();
      } catch (e) {
        return {error: e};
      }
    };
    var notify = function(record, isReject) {
      if (record.n)
        return;
      record.n = true;
      var chain = record.c;
      asap(function() {
        var value = record.v,
            ok = record.s == 1,
            i = 0;
        var run = function(reaction) {
          var handler = ok ? reaction.ok : reaction.fail,
              resolve = reaction.resolve,
              reject = reaction.reject,
              result,
              then;
          try {
            if (handler) {
              if (!ok)
                record.h = true;
              result = handler === true ? value : handler(value);
              if (result === reaction.promise) {
                reject(TypeError('Promise-chain cycle'));
              } else if (then = isThenable(result)) {
                then.call(result, resolve, reject);
              } else
                resolve(result);
            } else
              reject(value);
          } catch (e) {
            reject(e);
          }
        };
        while (chain.length > i)
          run(chain[i++]);
        chain.length = 0;
        record.n = false;
        if (isReject)
          setTimeout(function() {
            var promise = record.p,
                handler,
                console;
            if (isUnhandled(promise)) {
              if (isNode) {
                process.emit('unhandledRejection', value, promise);
              } else if (handler = global.onunhandledrejection) {
                handler({
                  promise: promise,
                  reason: value
                });
              } else if ((console = global.console) && console.error) {
                console.error('Unhandled promise rejection', value);
              }
            }
            record.a = undefined;
          }, 1);
      });
    };
    var isUnhandled = function(promise) {
      var record = promise._d,
          chain = record.a || record.c,
          i = 0,
          reaction;
      if (record.h)
        return false;
      while (chain.length > i) {
        reaction = chain[i++];
        if (reaction.fail || !isUnhandled(reaction.promise))
          return false;
      }
      return true;
    };
    var $reject = function(value) {
      var record = this;
      if (record.d)
        return;
      record.d = true;
      record = record.r || record;
      record.v = value;
      record.s = 2;
      record.a = record.c.slice();
      notify(record, true);
    };
    var $resolve = function(value) {
      var record = this,
          then;
      if (record.d)
        return;
      record.d = true;
      record = record.r || record;
      try {
        if (record.p === value)
          throw TypeError("Promise can't be resolved itself");
        if (then = isThenable(value)) {
          asap(function() {
            var wrapper = {
              r: record,
              d: false
            };
            try {
              then.call(value, ctx($resolve, wrapper, 1), ctx($reject, wrapper, 1));
            } catch (e) {
              $reject.call(wrapper, e);
            }
          });
        } else {
          record.v = value;
          record.s = 1;
          notify(record, false);
        }
      } catch (e) {
        $reject.call({
          r: record,
          d: false
        }, e);
      }
    };
    if (!USE_NATIVE) {
      P = function Promise(executor) {
        aFunction(executor);
        var record = this._d = {
          p: strictNew(this, P, PROMISE),
          c: [],
          a: undefined,
          s: 0,
          d: false,
          v: undefined,
          h: false,
          n: false
        };
        try {
          executor(ctx($resolve, record, 1), ctx($reject, record, 1));
        } catch (err) {
          $reject.call(record, err);
        }
      };
      $__require('109')(P.prototype, {
        then: function then(onFulfilled, onRejected) {
          var reaction = new PromiseCapability(speciesConstructor(this, P)),
              promise = reaction.promise,
              record = this._d;
          reaction.ok = typeof onFulfilled == 'function' ? onFulfilled : true;
          reaction.fail = typeof onRejected == 'function' && onRejected;
          record.c.push(reaction);
          if (record.a)
            record.a.push(reaction);
          if (record.s)
            notify(record, false);
          return promise;
        },
        'catch': function(onRejected) {
          return this.then(undefined, onRejected);
        }
      });
    }
    $export($export.G + $export.W + $export.F * !USE_NATIVE, {Promise: P});
    $__require('10')(P, PROMISE);
    $__require('10a')(PROMISE);
    Wrapper = $__require('19')[PROMISE];
    $export($export.S + $export.F * !USE_NATIVE, PROMISE, {reject: function reject(r) {
        var capability = new PromiseCapability(this),
            $$reject = capability.reject;
        $$reject(r);
        return capability.promise;
      }});
    $export($export.S + $export.F * (!USE_NATIVE || testResolve(true)), PROMISE, {resolve: function resolve(x) {
        if (x instanceof P && sameConstructor(x.constructor, this))
          return x;
        var capability = new PromiseCapability(this),
            $$resolve = capability.resolve;
        $$resolve(x);
        return capability.promise;
      }});
    $export($export.S + $export.F * !(USE_NATIVE && $__require('103')(function(iter) {
      P.all(iter)['catch'](function() {});
    })), PROMISE, {
      all: function all(iterable) {
        var C = getConstructor(this),
            capability = new PromiseCapability(C),
            resolve = capability.resolve,
            reject = capability.reject,
            values = [];
        var abrupt = perform(function() {
          forOf(iterable, false, values.push, values);
          var remaining = values.length,
              results = Array(remaining);
          if (remaining)
            $.each.call(values, function(promise, index) {
              var alreadyCalled = false;
              C.resolve(promise).then(function(value) {
                if (alreadyCalled)
                  return;
                alreadyCalled = true;
                results[index] = value;
                --remaining || resolve(results);
              }, reject);
            });
          else
            resolve(results);
        });
        if (abrupt)
          reject(abrupt.error);
        return capability.promise;
      },
      race: function race(iterable) {
        var C = getConstructor(this),
            capability = new PromiseCapability(C),
            reject = capability.reject;
        var abrupt = perform(function() {
          forOf(iterable, false, function(promise) {
            C.resolve(promise).then(capability.resolve, reject);
          });
        });
        if (abrupt)
          reject(abrupt.error);
        return capability.promise;
      }
    });
  })($__require('20'));
  return module.exports;
});

$__System.registerDynamic("10b", ["18", "10c", "10d", "105", "19"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  $__require('18');
  $__require('10c');
  $__require('10d');
  $__require('105');
  module.exports = $__require('19').Promise;
  return module.exports;
});

$__System.registerDynamic("1f", ["10b"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = {
    "default": $__require('10b'),
    __esModule: true
  };
  return module.exports;
});

$__System.registerDynamic("18", [], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  "format cjs";
  return module.exports;
});

$__System.registerDynamic("10a", ["19", "3", "b", "12"], true, function($__require, exports, module) {
  "use strict";
  ;
  var define,
      global = this,
      GLOBAL = this;
  var core = $__require('19'),
      $ = $__require('3'),
      DESCRIPTORS = $__require('b'),
      SPECIES = $__require('12')('species');
  module.exports = function(KEY) {
    var C = core[KEY];
    if (DESCRIPTORS && C && !C[SPECIES])
      $.setDesc(C, SPECIES, {
        configurable: true,
        get: function() {
          return this;
        }
      });
  };
  return module.exports;
});

$__System.registerDynamic("10e", ["3", "10f", "109", "fa", "107", "e0", "108", "110", "111", "11", "a", "f9", "10a", "b"], true, function($__require, exports, module) {
  "use strict";
  ;
  var define,
      global = this,
      GLOBAL = this;
  var $ = $__require('3'),
      hide = $__require('10f'),
      redefineAll = $__require('109'),
      ctx = $__require('fa'),
      strictNew = $__require('107'),
      defined = $__require('e0'),
      forOf = $__require('108'),
      $iterDefine = $__require('110'),
      step = $__require('111'),
      ID = $__require('11')('id'),
      $has = $__require('a'),
      isObject = $__require('f9'),
      setSpecies = $__require('10a'),
      DESCRIPTORS = $__require('b'),
      isExtensible = Object.isExtensible || isObject,
      SIZE = DESCRIPTORS ? '_s' : 'size',
      id = 0;
  var fastKey = function(it, create) {
    if (!isObject(it))
      return typeof it == 'symbol' ? it : (typeof it == 'string' ? 'S' : 'P') + it;
    if (!$has(it, ID)) {
      if (!isExtensible(it))
        return 'F';
      if (!create)
        return 'E';
      hide(it, ID, ++id);
    }
    return 'O' + it[ID];
  };
  var getEntry = function(that, key) {
    var index = fastKey(key),
        entry;
    if (index !== 'F')
      return that._i[index];
    for (entry = that._f; entry; entry = entry.n) {
      if (entry.k == key)
        return entry;
    }
  };
  module.exports = {
    getConstructor: function(wrapper, NAME, IS_MAP, ADDER) {
      var C = wrapper(function(that, iterable) {
        strictNew(that, C, NAME);
        that._i = $.create(null);
        that._f = undefined;
        that._l = undefined;
        that[SIZE] = 0;
        if (iterable != undefined)
          forOf(iterable, IS_MAP, that[ADDER], that);
      });
      redefineAll(C.prototype, {
        clear: function clear() {
          for (var that = this,
              data = that._i,
              entry = that._f; entry; entry = entry.n) {
            entry.r = true;
            if (entry.p)
              entry.p = entry.p.n = undefined;
            delete data[entry.i];
          }
          that._f = that._l = undefined;
          that[SIZE] = 0;
        },
        'delete': function(key) {
          var that = this,
              entry = getEntry(that, key);
          if (entry) {
            var next = entry.n,
                prev = entry.p;
            delete that._i[entry.i];
            entry.r = true;
            if (prev)
              prev.n = next;
            if (next)
              next.p = prev;
            if (that._f == entry)
              that._f = next;
            if (that._l == entry)
              that._l = prev;
            that[SIZE]--;
          }
          return !!entry;
        },
        forEach: function forEach(callbackfn) {
          var f = ctx(callbackfn, arguments.length > 1 ? arguments[1] : undefined, 3),
              entry;
          while (entry = entry ? entry.n : this._f) {
            f(entry.v, entry.k, this);
            while (entry && entry.r)
              entry = entry.p;
          }
        },
        has: function has(key) {
          return !!getEntry(this, key);
        }
      });
      if (DESCRIPTORS)
        $.setDesc(C.prototype, 'size', {get: function() {
            return defined(this[SIZE]);
          }});
      return C;
    },
    def: function(that, key, value) {
      var entry = getEntry(that, key),
          prev,
          index;
      if (entry) {
        entry.v = value;
      } else {
        that._l = entry = {
          i: index = fastKey(key, true),
          k: key,
          v: value,
          p: prev = that._l,
          n: undefined,
          r: false
        };
        if (!that._f)
          that._f = entry;
        if (prev)
          prev.n = entry;
        that[SIZE]++;
        if (index !== 'F')
          that._i[index] = entry;
      }
      return that;
    },
    getEntry: getEntry,
    setStrong: function(C, NAME, IS_MAP) {
      $iterDefine(C, NAME, function(iterated, kind) {
        this._t = iterated;
        this._k = kind;
        this._l = undefined;
      }, function() {
        var that = this,
            kind = that._k,
            entry = that._l;
        while (entry && entry.r)
          entry = entry.p;
        if (!that._t || !(that._l = entry = entry ? entry.n : that._t._f)) {
          that._t = undefined;
          return step(1);
        }
        if (kind == 'keys')
          return step(0, entry.k);
        if (kind == 'values')
          return step(0, entry.v);
        return step(0, [entry.k, entry.v]);
      }, IS_MAP ? 'entries' : 'values', !IS_MAP, true);
      setSpecies(NAME);
    }
  };
  return module.exports;
});

$__System.registerDynamic("109", ["d"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var redefine = $__require('d');
  module.exports = function(target, src) {
    for (var key in src)
      redefine(target, key, src[key]);
    return target;
  };
  return module.exports;
});

$__System.registerDynamic("107", [], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = function(it, Constructor, name) {
    if (!(it instanceof Constructor))
      throw TypeError(name + ": use the 'new' operator!");
    return it;
  };
  return module.exports;
});

$__System.registerDynamic("112", ["3", "9", "c", "e", "10f", "109", "108", "107", "f9", "10", "b"], true, function($__require, exports, module) {
  "use strict";
  ;
  var define,
      global = this,
      GLOBAL = this;
  var $ = $__require('3'),
      global = $__require('9'),
      $export = $__require('c'),
      fails = $__require('e'),
      hide = $__require('10f'),
      redefineAll = $__require('109'),
      forOf = $__require('108'),
      strictNew = $__require('107'),
      isObject = $__require('f9'),
      setToStringTag = $__require('10'),
      DESCRIPTORS = $__require('b');
  module.exports = function(NAME, wrapper, methods, common, IS_MAP, IS_WEAK) {
    var Base = global[NAME],
        C = Base,
        ADDER = IS_MAP ? 'set' : 'add',
        proto = C && C.prototype,
        O = {};
    if (!DESCRIPTORS || typeof C != 'function' || !(IS_WEAK || proto.forEach && !fails(function() {
      new C().entries().next();
    }))) {
      C = common.getConstructor(wrapper, NAME, IS_MAP, ADDER);
      redefineAll(C.prototype, methods);
    } else {
      C = wrapper(function(target, iterable) {
        strictNew(target, C, NAME);
        target._c = new Base;
        if (iterable != undefined)
          forOf(iterable, IS_MAP, target[ADDER], target);
      });
      $.each.call('add,clear,delete,forEach,get,has,set,keys,values,entries'.split(','), function(KEY) {
        var IS_ADDER = KEY == 'add' || KEY == 'set';
        if (KEY in proto && !(IS_WEAK && KEY == 'clear'))
          hide(C.prototype, KEY, function(a, b) {
            if (!IS_ADDER && IS_WEAK && !isObject(a))
              return KEY == 'get' ? undefined : false;
            var result = this._c[KEY](a === 0 ? 0 : a, b);
            return IS_ADDER ? this : result;
          });
      });
      if ('size' in proto)
        $.setDesc(C.prototype, 'size', {get: function() {
            return this._c.size;
          }});
    }
    setToStringTag(C, NAME);
    O[NAME] = C;
    $export($export.G + $export.W + $export.F, O);
    if (!IS_WEAK)
      common.setStrong(C, NAME, IS_MAP);
    return C;
  };
  return module.exports;
});

$__System.registerDynamic("113", ["10e", "112"], true, function($__require, exports, module) {
  "use strict";
  ;
  var define,
      global = this,
      GLOBAL = this;
  var strong = $__require('10e');
  $__require('112')('Map', function(get) {
    return function Map() {
      return get(this, arguments.length > 0 ? arguments[0] : undefined);
    };
  }, {
    get: function get(key) {
      var entry = strong.getEntry(this, key);
      return entry && entry.v;
    },
    set: function set(key, value) {
      return strong.def(this, key === 0 ? 0 : key, value);
    }
  }, strong, true);
  return module.exports;
});

$__System.registerDynamic("114", ["14"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var anObject = $__require('14');
  module.exports = function(iterator, fn, value, entries) {
    try {
      return entries ? fn(anObject(value)[0], value[1]) : fn(value);
    } catch (e) {
      var ret = iterator['return'];
      if (ret !== undefined)
        anObject(ret.call(iterator));
      throw e;
    }
  };
  return module.exports;
});

$__System.registerDynamic("115", ["116", "12"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var Iterators = $__require('116'),
      ITERATOR = $__require('12')('iterator'),
      ArrayProto = Array.prototype;
  module.exports = function(it) {
    return it !== undefined && (Iterators.Array === it || ArrayProto[ITERATOR] === it);
  };
  return module.exports;
});

$__System.registerDynamic("117", ["118"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var toInteger = $__require('118'),
      min = Math.min;
  module.exports = function(it) {
    return it > 0 ? min(toInteger(it), 0x1fffffffffffff) : 0;
  };
  return module.exports;
});

$__System.registerDynamic("108", ["fa", "114", "115", "14", "117", "119"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var ctx = $__require('fa'),
      call = $__require('114'),
      isArrayIter = $__require('115'),
      anObject = $__require('14'),
      toLength = $__require('117'),
      getIterFn = $__require('119');
  module.exports = function(iterable, entries, fn, that) {
    var iterFn = getIterFn(iterable),
        f = ctx(fn, that, entries ? 2 : 1),
        index = 0,
        length,
        step,
        iterator;
    if (typeof iterFn != 'function')
      throw TypeError(iterable + ' is not iterable!');
    if (isArrayIter(iterFn))
      for (length = toLength(iterable.length); length > index; index++) {
        entries ? f(anObject(step = iterable[index])[0], step[1]) : f(iterable[index]);
      }
    else
      for (iterator = iterFn.call(iterable); !(step = iterator.next()).done; ) {
        call(iterator, f, step.value, entries);
      }
  };
  return module.exports;
});

$__System.registerDynamic("11a", ["108", "106"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var forOf = $__require('108'),
      classof = $__require('106');
  module.exports = function(NAME) {
    return function toJSON() {
      if (classof(this) != NAME)
        throw TypeError(NAME + "#toJSON isn't generic");
      var arr = [];
      forOf(this, false, arr.push, arr);
      return arr;
    };
  };
  return module.exports;
});

$__System.registerDynamic("11b", ["c", "11a"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var $export = $__require('c');
  $export($export.P, 'Map', {toJSON: $__require('11a')('Map')});
  return module.exports;
});

$__System.registerDynamic("11c", ["18", "10c", "10d", "113", "11b", "19"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  $__require('18');
  $__require('10c');
  $__require('10d');
  $__require('113');
  $__require('11b');
  module.exports = $__require('19').Map;
  return module.exports;
});

$__System.registerDynamic("11d", ["11c"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = {
    "default": $__require('11c'),
    __esModule: true
  };
  return module.exports;
});

$__System.registerDynamic("11e", [], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = function() {};
  return module.exports;
});

$__System.registerDynamic("111", [], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = function(done, value) {
    return {
      value: value,
      done: !!done
    };
  };
  return module.exports;
});

$__System.registerDynamic("11f", ["7"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var cof = $__require('7');
  module.exports = Object('z').propertyIsEnumerable(0) ? Object : function(it) {
    return cof(it) == 'String' ? it.split('') : Object(it);
  };
  return module.exports;
});

$__System.registerDynamic("4", ["11f", "e0"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var IObject = $__require('11f'),
      defined = $__require('e0');
  module.exports = function(it) {
    return IObject(defined(it));
  };
  return module.exports;
});

$__System.registerDynamic("120", ["11e", "111", "116", "4", "110"], true, function($__require, exports, module) {
  "use strict";
  ;
  var define,
      global = this,
      GLOBAL = this;
  var addToUnscopables = $__require('11e'),
      step = $__require('111'),
      Iterators = $__require('116'),
      toIObject = $__require('4');
  module.exports = $__require('110')(Array, 'Array', function(iterated, kind) {
    this._t = toIObject(iterated);
    this._i = 0;
    this._k = kind;
  }, function() {
    var O = this._t,
        kind = this._k,
        index = this._i++;
    if (!O || index >= O.length) {
      this._t = undefined;
      return step(1);
    }
    if (kind == 'keys')
      return step(0, index);
    if (kind == 'values')
      return step(0, O[index]);
    return step(0, [index, O[index]]);
  }, 'values');
  Iterators.Arguments = Iterators.Array;
  addToUnscopables('keys');
  addToUnscopables('values');
  addToUnscopables('entries');
  return module.exports;
});

$__System.registerDynamic("10d", ["120", "116"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  $__require('120');
  var Iterators = $__require('116');
  Iterators.NodeList = Iterators.HTMLCollection = Iterators.Array;
  return module.exports;
});

$__System.registerDynamic("118", [], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var ceil = Math.ceil,
      floor = Math.floor;
  module.exports = function(it) {
    return isNaN(it = +it) ? 0 : (it > 0 ? floor : ceil)(it);
  };
  return module.exports;
});

$__System.registerDynamic("e0", [], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = function(it) {
    if (it == undefined)
      throw TypeError("Can't call method on  " + it);
    return it;
  };
  return module.exports;
});

$__System.registerDynamic("121", ["118", "e0"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var toInteger = $__require('118'),
      defined = $__require('e0');
  module.exports = function(TO_STRING) {
    return function(that, pos) {
      var s = String(defined(that)),
          i = toInteger(pos),
          l = s.length,
          a,
          b;
      if (i < 0 || i >= l)
        return TO_STRING ? '' : undefined;
      a = s.charCodeAt(i);
      return a < 0xd800 || a > 0xdbff || i + 1 === l || (b = s.charCodeAt(i + 1)) < 0xdc00 || b > 0xdfff ? TO_STRING ? s.charAt(i) : a : TO_STRING ? s.slice(i, i + 2) : (a - 0xd800 << 10) + (b - 0xdc00) + 0x10000;
    };
  };
  return module.exports;
});

$__System.registerDynamic("16", [], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = true;
  return module.exports;
});

$__System.registerDynamic("fd", [], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = function(it) {
    if (typeof it != 'function')
      throw TypeError(it + ' is not a function!');
    return it;
  };
  return module.exports;
});

$__System.registerDynamic("fa", ["fd"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var aFunction = $__require('fd');
  module.exports = function(fn, that, length) {
    aFunction(fn);
    if (that === undefined)
      return fn;
    switch (length) {
      case 1:
        return function(a) {
          return fn.call(that, a);
        };
      case 2:
        return function(a, b) {
          return fn.call(that, a, b);
        };
      case 3:
        return function(a, b, c) {
          return fn.call(that, a, b, c);
        };
    }
    return function() {
      return fn.apply(that, arguments);
    };
  };
  return module.exports;
});

$__System.registerDynamic("c", ["9", "19", "fa"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var global = $__require('9'),
      core = $__require('19'),
      ctx = $__require('fa'),
      PROTOTYPE = 'prototype';
  var $export = function(type, name, source) {
    var IS_FORCED = type & $export.F,
        IS_GLOBAL = type & $export.G,
        IS_STATIC = type & $export.S,
        IS_PROTO = type & $export.P,
        IS_BIND = type & $export.B,
        IS_WRAP = type & $export.W,
        exports = IS_GLOBAL ? core : core[name] || (core[name] = {}),
        target = IS_GLOBAL ? global : IS_STATIC ? global[name] : (global[name] || {})[PROTOTYPE],
        key,
        own,
        out;
    if (IS_GLOBAL)
      source = name;
    for (key in source) {
      own = !IS_FORCED && target && key in target;
      if (own && key in exports)
        continue;
      out = own ? target[key] : source[key];
      exports[key] = IS_GLOBAL && typeof target[key] != 'function' ? source[key] : IS_BIND && own ? ctx(out, global) : IS_WRAP && target[key] == out ? (function(C) {
        var F = function(param) {
          return this instanceof C ? new C(param) : C(param);
        };
        F[PROTOTYPE] = C[PROTOTYPE];
        return F;
      })(out) : IS_PROTO && typeof out == 'function' ? ctx(Function.call, out) : out;
      if (IS_PROTO)
        (exports[PROTOTYPE] || (exports[PROTOTYPE] = {}))[key] = out;
    }
  };
  $export.F = 1;
  $export.G = 2;
  $export.S = 4;
  $export.P = 8;
  $export.B = 16;
  $export.W = 32;
  module.exports = $export;
  return module.exports;
});

$__System.registerDynamic("d", ["10f"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = $__require('10f');
  return module.exports;
});

$__System.registerDynamic("15", [], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = function(bitmap, value) {
    return {
      enumerable: !(bitmap & 1),
      configurable: !(bitmap & 2),
      writable: !(bitmap & 4),
      value: value
    };
  };
  return module.exports;
});

$__System.registerDynamic("e", [], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = function(exec) {
    try {
      return !!exec();
    } catch (e) {
      return true;
    }
  };
  return module.exports;
});

$__System.registerDynamic("b", ["e"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = !$__require('e')(function() {
    return Object.defineProperty({}, 'a', {get: function() {
        return 7;
      }}).a != 7;
  });
  return module.exports;
});

$__System.registerDynamic("10f", ["3", "15", "b"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var $ = $__require('3'),
      createDesc = $__require('15');
  module.exports = $__require('b') ? function(object, key, value) {
    return $.setDesc(object, key, createDesc(1, value));
  } : function(object, key, value) {
    object[key] = value;
    return object;
  };
  return module.exports;
});

$__System.registerDynamic("122", ["3", "15", "10", "10f", "12"], true, function($__require, exports, module) {
  "use strict";
  ;
  var define,
      global = this,
      GLOBAL = this;
  var $ = $__require('3'),
      descriptor = $__require('15'),
      setToStringTag = $__require('10'),
      IteratorPrototype = {};
  $__require('10f')(IteratorPrototype, $__require('12')('iterator'), function() {
    return this;
  });
  module.exports = function(Constructor, NAME, next) {
    Constructor.prototype = $.create(IteratorPrototype, {next: descriptor(1, next)});
    setToStringTag(Constructor, NAME + ' Iterator');
  };
  return module.exports;
});

$__System.registerDynamic("a", [], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var hasOwnProperty = {}.hasOwnProperty;
  module.exports = function(it, key) {
    return hasOwnProperty.call(it, key);
  };
  return module.exports;
});

$__System.registerDynamic("10", ["3", "a", "12"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var def = $__require('3').setDesc,
      has = $__require('a'),
      TAG = $__require('12')('toStringTag');
  module.exports = function(it, tag, stat) {
    if (it && !has(it = stat ? it : it.prototype, TAG))
      def(it, TAG, {
        configurable: true,
        value: tag
      });
  };
  return module.exports;
});

$__System.registerDynamic("3", [], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var $Object = Object;
  module.exports = {
    create: $Object.create,
    getProto: $Object.getPrototypeOf,
    isEnum: {}.propertyIsEnumerable,
    getDesc: $Object.getOwnPropertyDescriptor,
    setDesc: $Object.defineProperty,
    setDescs: $Object.defineProperties,
    getKeys: $Object.keys,
    getNames: $Object.getOwnPropertyNames,
    getSymbols: $Object.getOwnPropertySymbols,
    each: [].forEach
  };
  return module.exports;
});

$__System.registerDynamic("110", ["16", "c", "d", "10f", "a", "116", "122", "10", "3", "12"], true, function($__require, exports, module) {
  "use strict";
  ;
  var define,
      global = this,
      GLOBAL = this;
  var LIBRARY = $__require('16'),
      $export = $__require('c'),
      redefine = $__require('d'),
      hide = $__require('10f'),
      has = $__require('a'),
      Iterators = $__require('116'),
      $iterCreate = $__require('122'),
      setToStringTag = $__require('10'),
      getProto = $__require('3').getProto,
      ITERATOR = $__require('12')('iterator'),
      BUGGY = !([].keys && 'next' in [].keys()),
      FF_ITERATOR = '@@iterator',
      KEYS = 'keys',
      VALUES = 'values';
  var returnThis = function() {
    return this;
  };
  module.exports = function(Base, NAME, Constructor, next, DEFAULT, IS_SET, FORCED) {
    $iterCreate(Constructor, NAME, next);
    var getMethod = function(kind) {
      if (!BUGGY && kind in proto)
        return proto[kind];
      switch (kind) {
        case KEYS:
          return function keys() {
            return new Constructor(this, kind);
          };
        case VALUES:
          return function values() {
            return new Constructor(this, kind);
          };
      }
      return function entries() {
        return new Constructor(this, kind);
      };
    };
    var TAG = NAME + ' Iterator',
        DEF_VALUES = DEFAULT == VALUES,
        VALUES_BUG = false,
        proto = Base.prototype,
        $native = proto[ITERATOR] || proto[FF_ITERATOR] || DEFAULT && proto[DEFAULT],
        $default = $native || getMethod(DEFAULT),
        methods,
        key;
    if ($native) {
      var IteratorPrototype = getProto($default.call(new Base));
      setToStringTag(IteratorPrototype, TAG, true);
      if (!LIBRARY && has(proto, FF_ITERATOR))
        hide(IteratorPrototype, ITERATOR, returnThis);
      if (DEF_VALUES && $native.name !== VALUES) {
        VALUES_BUG = true;
        $default = function values() {
          return $native.call(this);
        };
      }
    }
    if ((!LIBRARY || FORCED) && (BUGGY || VALUES_BUG || !proto[ITERATOR])) {
      hide(proto, ITERATOR, $default);
    }
    Iterators[NAME] = $default;
    Iterators[TAG] = returnThis;
    if (DEFAULT) {
      methods = {
        values: DEF_VALUES ? $default : getMethod(VALUES),
        keys: IS_SET ? $default : getMethod(KEYS),
        entries: !DEF_VALUES ? $default : getMethod('entries')
      };
      if (FORCED)
        for (key in methods) {
          if (!(key in proto))
            redefine(proto, key, methods[key]);
        }
      else
        $export($export.P + $export.F * (BUGGY || VALUES_BUG), NAME, methods);
    }
    return methods;
  };
  return module.exports;
});

$__System.registerDynamic("10c", ["121", "110"], true, function($__require, exports, module) {
  "use strict";
  ;
  var define,
      global = this,
      GLOBAL = this;
  var $at = $__require('121')(true);
  $__require('110')(String, 'String', function(iterated) {
    this._t = String(iterated);
    this._i = 0;
  }, function() {
    var O = this._t,
        index = this._i,
        point;
    if (index >= O.length)
      return {
        value: undefined,
        done: true
      };
    point = $at(O, index);
    this._i += point.length;
    return {
      value: point,
      done: false
    };
  });
  return module.exports;
});

$__System.registerDynamic("f9", [], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = function(it) {
    return typeof it === 'object' ? it !== null : typeof it === 'function';
  };
  return module.exports;
});

$__System.registerDynamic("14", ["f9"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var isObject = $__require('f9');
  module.exports = function(it) {
    if (!isObject(it))
      throw TypeError(it + ' is not an object!');
    return it;
  };
  return module.exports;
});

$__System.registerDynamic("7", [], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var toString = {}.toString;
  module.exports = function(it) {
    return toString.call(it).slice(8, -1);
  };
  return module.exports;
});

$__System.registerDynamic("106", ["7", "12"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var cof = $__require('7'),
      TAG = $__require('12')('toStringTag'),
      ARG = cof(function() {
        return arguments;
      }()) == 'Arguments';
  module.exports = function(it) {
    var O,
        T,
        B;
    return it === undefined ? 'Undefined' : it === null ? 'Null' : typeof(T = (O = Object(it))[TAG]) == 'string' ? T : ARG ? cof(O) : (B = cof(O)) == 'Object' && typeof O.callee == 'function' ? 'Arguments' : B;
  };
  return module.exports;
});

$__System.registerDynamic("f", ["9"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var global = $__require('9'),
      SHARED = '__core-js_shared__',
      store = global[SHARED] || (global[SHARED] = {});
  module.exports = function(key) {
    return store[key] || (store[key] = {});
  };
  return module.exports;
});

$__System.registerDynamic("11", [], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var id = 0,
      px = Math.random();
  module.exports = function(key) {
    return 'Symbol('.concat(key === undefined ? '' : key, ')_', (++id + px).toString(36));
  };
  return module.exports;
});

$__System.registerDynamic("9", [], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var global = module.exports = typeof window != 'undefined' && window.Math == Math ? window : typeof self != 'undefined' && self.Math == Math ? self : Function('return this')();
  if (typeof __g == 'number')
    __g = global;
  return module.exports;
});

$__System.registerDynamic("12", ["f", "11", "9"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var store = $__require('f')('wks'),
      uid = $__require('11'),
      Symbol = $__require('9').Symbol;
  module.exports = function(name) {
    return store[name] || (store[name] = Symbol && Symbol[name] || (Symbol || uid)('Symbol.' + name));
  };
  return module.exports;
});

$__System.registerDynamic("116", [], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = {};
  return module.exports;
});

$__System.registerDynamic("119", ["106", "12", "116", "19"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var classof = $__require('106'),
      ITERATOR = $__require('12')('iterator'),
      Iterators = $__require('116');
  module.exports = $__require('19').getIteratorMethod = function(it) {
    if (it != undefined)
      return it[ITERATOR] || it['@@iterator'] || Iterators[classof(it)];
  };
  return module.exports;
});

$__System.registerDynamic("19", [], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var core = module.exports = {version: '1.2.6'};
  if (typeof __e == 'number')
    __e = core;
  return module.exports;
});

$__System.registerDynamic("123", ["14", "119", "19"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var anObject = $__require('14'),
      get = $__require('119');
  module.exports = $__require('19').getIterator = function(it) {
    var iterFn = get(it);
    if (typeof iterFn != 'function')
      throw TypeError(it + ' is not iterable!');
    return anObject(iterFn.call(it));
  };
  return module.exports;
});

$__System.registerDynamic("124", ["10d", "10c", "123"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  $__require('10d');
  $__require('10c');
  module.exports = $__require('123');
  return module.exports;
});

$__System.registerDynamic("f3", ["124"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = {
    "default": $__require('124'),
    __esModule: true
  };
  return module.exports;
});

$__System.register('f6', ['1f', '11d', 'f3'], function (_export) {
    var _Promise, _Map, _getIterator;

    function GetRequest(url) {

        // Return a new promise.
        return new _Promise(function (resolve, reject) {
            // Do the usual XHR stuff
            var req = new XMLHttpRequest();
            req.open('GET', url, true);

            req.onload = function () {
                // This is called even on 404 etc
                // so check the status
                if (req.status === 200) {
                    // Resolve the promise with the response text
                    resolve(req.response);
                } else {
                    // Otherwise reject with the status text
                    // which will hopefully be a meaningful error
                    reject(Error(req.statusText));
                }
            };

            // Handle network errors
            req.onerror = function () {
                reject(Error('Network Error'));
            };

            // Make the request
            req.send();
        });
    }

    /**
     * Prepares a POST request and initiates the communication.
     * @param {Object} options Provide properties: { headers: <Map>, data: <string>, url: <string> }
     * @returns {Promise} Returns an asynchronous response object which can be managed to read the response in an chaining proces.
     */

    function PostRequest(options) {

        // make the request dummy proof
        if (!options) {
            options = {};
        }
        if (!options.headers) {
            options.headers = new _Map();
        }
        if (!options.data) {
            options.data = '';
        }

        return new _Promise(function (resolve, reject) {

            var req = new XMLHttpRequest();
            req.open('POST', options.url, true);

            var _iteratorNormalCompletion = true;
            var _didIteratorError = false;
            var _iteratorError = undefined;

            try {
                for (var _iterator = _getIterator(options.headers.entries()), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                    var entry = _step.value;

                    req.setRequestHeader(entry[0], entry[1]);
                }
            } catch (err) {
                _didIteratorError = true;
                _iteratorError = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion && _iterator['return']) {
                        _iterator['return']();
                    }
                } finally {
                    if (_didIteratorError) {
                        throw _iteratorError;
                    }
                }
            }

            req.onload = function () {
                // This is called even on 404 etc
                // so check the status
                if (req.status === 200) {
                    // Resolve the promise with the response text
                    var responseDate = req.getResponseHeader('Date');
                    resolve({ response: req.response, timestamp: responseDate });
                } else {
                    // Otherwise reject with the status text
                    // which will hopefully be a meaningful error
                    reject(Error(req.statusText));
                }
            };

            // Handle network errors
            req.onerror = function () {
                reject(Error('Network Error'));
            };

            req.send(options.data);
        });
    }

    function ExistsRequest(url) {

        // Do the usual XHR stuff
        var req = new XMLHttpRequest();
        req.open('OPTIONS', url, false);
        req.send();

        return req.status !== 404;
    }

    return {
        setters: [function (_f) {
            _Promise = _f['default'];
        }, function (_d) {
            _Map = _d['default'];
        }, function (_f3) {
            _getIterator = _f3['default'];
        }],
        execute: function () {
            /**
             This Source Code is licensed under the MIT license. If a copy of the
             MIT-license was not distributed with this file, You can obtain one at:
             http://opensource.org/licenses/mit-license.html.
            
             @author: Hans van den Akker (mysim1)
             @license MIT
             @copyright Bizboard, 2015
            
             */

            /**
             * Prepares a GET request and initiates the communication.
             * @param {String} url
             * @returns {Promise} Returns an asynchronous response object which can be managed to read the response in an chaining proces.
             */
            'use strict';

            _export('GetRequest', GetRequest);

            _export('PostRequest', PostRequest);

            _export('ExistsRequest', ExistsRequest);
        }
    };
});
$__System.register('125', [], function (_export) {
    /**
     This Source Code is licensed under the MIT license. If a copy of the
     MIT-license was not distributed with this file, You can obtain one at:
     http://opensource.org/licenses/mit-license.html.
    
     @author: Hans van den Akker (mysim1)
     @license MIT
     @copyright Bizboard, 2015
    
     */

    'use strict';

    _export('UrlParser', UrlParser);

    function UrlParser(url) {

        var e = /^([a-z][a-z0-9+.-]*):(?:\/\/((?:(?=((?:[a-z0-9-._~!$&'()*+,;=:]|%[0-9A-F]{2})*))(\3)@)?(?=(\[[0-9A-F:.]{2,}\]|(?:[a-z0-9-._~!$&'()*+,;=]|%[0-9A-F]{2})*))\5(?::(?=(\d*))\6)?)(\/(?=((?:[a-z0-9-._~!$&'()*+,;=:@\/]|%[0-9A-F]{2})*))\8)?|(\/?(?!\/)(?=((?:[a-z0-9-._~!$&'()*+,;=:@\/]|%[0-9A-F]{2})*))\10)?)(?:\?(?=((?:[a-z0-9-._~!$&'()*+,;=:@\/?]|%[0-9A-F]{2})*))\11)?(?:#(?=((?:[a-z0-9-._~!$&'()*+,;=:@\/?]|%[0-9A-F]{2})*))\12)?$/i;

        if (url.match(e)) {
            return {
                url: RegExp['$&'],
                protocol: RegExp.$1,
                host: RegExp.$2,
                path: RegExp.$8,
                hash: RegExp.$12
            };
        } else {
            return null;
        }
    }

    return {
        setters: [],
        execute: function () {}
    };
});
$__System.register('126', ['26', '125', '2c', 'f0', 'f1', '1f', 'f3', '11d', 'ee', '2e', 'f5', 'f8', 'f6'], function (_export) {
    var _get, UrlParser, _inherits, _createClass, _classCallCheck, _Promise, _getIterator, _Map, _, EventEmitter, SoapClient, Settings, ExistsRequest, soapClient, window, global, tempKeys, SharePointClient;

    return {
        setters: [function (_2) {
            _get = _2['default'];
        }, function (_3) {
            UrlParser = _3.UrlParser;
        }, function (_c) {
            _inherits = _c['default'];
        }, function (_f0) {
            _createClass = _f0['default'];
        }, function (_f1) {
            _classCallCheck = _f1['default'];
        }, function (_f) {
            _Promise = _f['default'];
        }, function (_f3) {
            _getIterator = _f3['default'];
        }, function (_d) {
            _Map = _d['default'];
        }, function (_ee) {
            _ = _ee['default'];
        }, function (_e) {
            EventEmitter = _e['default'];
        }, function (_f5) {
            SoapClient = _f5.SoapClient;
        }, function (_f8) {
            Settings = _f8.Settings;
        }, function (_f6) {
            ExistsRequest = _f6.ExistsRequest;
        }],
        execute: function () {
            /**
             * Created by mysim1 on 13/06/15.
             */

            // setup the soapClient.
            'use strict';

            soapClient = new SoapClient();
            window = undefined;
            global = undefined;
            tempKeys = [];

            SharePointClient = (function (_EventEmitter) {
                _inherits(SharePointClient, _EventEmitter);

                _createClass(SharePointClient, [{
                    key: 'refreshTimer',
                    get: function get() {
                        return this._refreshTimer;
                    },
                    set: function set(value) {
                        this._refreshTimer = value;
                    }
                }]);

                function SharePointClient(options) {
                    _classCallCheck(this, SharePointClient);

                    _get(Object.getPrototypeOf(SharePointClient.prototype), 'constructor', this).call(this);

                    this.settings = options;
                    this.interval = 3000;
                    this.retriever = null;
                    this.cache = [];
                    this.hasNoServerResponse = true;
                    this._active = false;
                }

                _createClass(SharePointClient, [{
                    key: 'init',
                    value: function init() {
                        try {
                            var _initializeSettings2 = this._initializeSettings(this.settings);

                            var settings = _initializeSettings2.settings;
                            var isChild = _initializeSettings2.isChild;

                            this.settings = settings;
                            this.isChild = isChild;

                            this._handleInit(this.settings);
                        } catch (exception) {
                            this.dispose();
                        }
                    }
                }, {
                    key: 'set',
                    value: function set(options) {
                        return this._handleSet(options);
                    }
                }, {
                    key: 'remove',
                    value: function remove(options) {
                        return this._handleRemove(options);
                    }
                }, {
                    key: 'dispose',
                    value: function dispose() {
                        clearTimeout(this.refreshTimer);
                        this.refreshTimer = null;
                        this._active = false;
                    }
                }, {
                    key: 'getAuth',
                    value: function getAuth() {
                        var _this = this;

                        return new _Promise(function (resolve, reject) {
                            /* initialize with SharePoint configuration */
                            var configuration = _this._getUserGroupDefaultConfiguration();

                            /* Append the listName to the URL for easy debugging */
                            configuration.url = _this.settings.endPoint + '/' + _this._getUserGroupService() + '?view=getUserGroup';

                            soapClient.call(configuration).then(function (result) {
                                var data = result.data["soap:Envelope"]["soap:Body"][0].GetCurrentUserInfoResponse[0].GetCurrentUserInfoResult[0].GetUserInfo[0].User[0].$;
                                var user = {
                                    uid: data.ID,
                                    name: data.Name,
                                    email: data.Email
                                };
                                resolve(user);
                            })['catch'](function (error) {
                                return reject(error);
                            });
                        });
                    }
                }, {
                    key: 'subscribeToChanges',
                    value: function subscribeToChanges() {
                        if (!this.isChild) {
                            /* Don't monitor child item updates/removes. We only do that on parent arrays. */
                            if (!this._active) {
                                this._active = true;
                                this._refresh();
                            }
                        }
                    }
                }, {
                    key: '_initializeSettings',
                    value: function _initializeSettings(args) {

                        // rebuild endpoint from polling server and interpreting response
                        var url = UrlParser(args.endPoint);
                        if (!url) throw new Error('Invalid DataSource path provided!');

                        var newPath = url.protocol + '://' + url.host + '/';
                        var pathParts = url.path.split('/');
                        var identifiedParts = [];

                        var isChild = this._isChildItem(url.path);

                        if (!isChild) {
                            /* We can always remove the last part of the path, since it will be a list name (which we don't need in the sharepoint URL). */
                            identifiedParts.unshift(pathParts.splice(pathParts.length - 1, 1)[0]);

                            try {
                                while (!ExistsRequest(newPath + pathParts.join('/') + '/' + this._getListService())) {
                                    identifiedParts.unshift(pathParts.splice(pathParts.length - 1, 1)[0]);
                                }
                            } catch (error) {
                                console.log('SharePoint URL detection error:', error);
                            }
                        } else {
                            /* We're initializing a child element that has an array-based parent.
                             * This means we can't automatically find the correct SharePoint path, and we'll have to assume the listName and itemId. */
                            identifiedParts[0] = pathParts[pathParts.length - 2];
                            identifiedParts[1] = pathParts[pathParts.length - 1];
                            pathParts.splice(pathParts.length - 2, 2);
                            /* Remove the child ID from the endpoint so we can modify its value through the parent endpoint. */
                        }

                        if (identifiedParts.length < 1) {
                            throw {
                                endPoint: pathParts.join('/') + '/' + identifiedParts[0],
                                message: 'Parameters could not be correctly extracted for polling. Assuming invalid state.'
                            };
                        } else {
                            var resultconfig = {
                                endPoint: newPath + pathParts.join('/'),
                                listName: identifiedParts[0],
                                itemId: identifiedParts[1]
                            };

                            _.extend(resultconfig, _.pick(args, ['query', 'limit', 'orderBy', 'pageSize']));

                            return { settings: resultconfig, isChild: isChild };
                        }
                    }

                    /**
                     * Start reading the list from SharePoint and only retrieve changes from last polling timestamp.
                     * @param args
                     * @private
                     */
                }, {
                    key: '_handleInit',
                    value: function _handleInit(args) {

                        if (!args.listName) return;

                        // initialize with SharePoint configuration
                        this.retriever = this._getListItemsDefaultConfiguration();

                        /* Append the listName to the URL for easy debugging */
                        this.retriever.url = this._parsePath(args.endPoint, this._getListService()) + ('?view=' + args.listName);
                        this.retriever.params = {
                            'listName': args.listName,
                            'viewFields': {
                                'ViewFields': ''
                            },
                            //'since': new Date(0).toISOString(),
                            'queryOptions': {
                                'QueryOptions': {
                                    'IncludeMandatoryColumns': 'FALSE',
                                    'ViewAttributes': {
                                        '_Scope': 'RecursiveAll'
                                    }
                                }
                            }
                        };

                        if (args.query) {
                            this.retriever.params.query = args.query;
                        }

                        if (args.orderBy) {
                            if (this.retriever.params.query) {
                                this.retriever.params.query.OrderBy = {
                                    "FieldRef": {
                                        "_Ascending": "TRUE",
                                        "_Name": args.orderBy
                                    }
                                };
                            } else {
                                this.retriever.params.query = {
                                    Query: {
                                        OrderBy: {
                                            "FieldRef": {
                                                "_Ascending": "TRUE",
                                                "_Name": args.orderBy
                                            }
                                        }
                                    }
                                };
                            }
                        }

                        var rowLimit = undefined;
                        this.explicitRowLimit = args.limit !== undefined;
                        if (this.explicitRowLimit) {
                            rowLimit = this.explicitRowLimit = args.limit;
                        }
                        if (args.pageSize) {
                            rowLimit = args.pageSize;
                            this.pageSize = args.pageSize;
                        }
                        if (rowLimit) {
                            this.retriever.params.rowLimit = rowLimit;
                        }
                    }
                }, {
                    key: '_isLimitExceeded',
                    value: function _isLimitExceeded() {
                        return this.explicitRowLimit !== false && this.cache.length >= this.explicitRowLimit;
                    }

                    /**
                     *
                     * Refresh SharePoint with latest changes.
                     * @param {Boolean} calledManually If set to false, ignores any existing timer in this.refreshTimer and executes the refresh regardless.
                     * @private
                     */
                }, {
                    key: '_refresh',
                    value: function _refresh() {
                        var _this2 = this;

                        if (this.retriever) {
                            if (this._isLimitExceeded()) {
                                this.retriever.params.rowLimit = this.explicitRowLimit;
                            }
                            soapClient.call(this.retriever, tempKeys).then(function (result) {

                                var listItem = result.data["soap:Envelope"]["soap:Body"][0].GetListItemChangesSinceTokenResponse[0].GetListItemChangesSinceTokenResult[0].listitems[0];
                                var hasDeletions = false;
                                if (listItem.Changes) {
                                    var changes = listItem.Changes[0];
                                    hasDeletions = _this2._handleDeleted(changes);
                                }

                                var data = _this2._getResults(result.data);
                                var messages = _this2._updateCache(data);

                                _this2._handleNextToken(listItem);

                                /* If any data is new or modified, emit a 'value' event. */
                                if (hasDeletions || data.length > 0) {
                                    _this2.emit('message', { event: 'value', result: _this2.cache });
                                } else if (_this2.hasNoServerResponse) {
                                    /* If there is no data, and this is the first time we get a response from the server,
                                     * emit a value event that shows subscribers that there is no data at this path. */
                                    _this2.emit('message', { event: 'value', result: null });
                                }

                                if (!_this2.hasNoServerResponse) {
                                    /* Emit any added/changed events. */
                                    var _iteratorNormalCompletion = true;
                                    var _didIteratorError = false;
                                    var _iteratorError = undefined;

                                    try {
                                        for (var _iterator = _getIterator(messages), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                                            var message = _step.value;

                                            _this2.emit('message', message);
                                        }
                                    } catch (err) {
                                        _didIteratorError = true;
                                        _iteratorError = err;
                                    } finally {
                                        try {
                                            if (!_iteratorNormalCompletion && _iterator['return']) {
                                                _iterator['return']();
                                            }
                                        } finally {
                                            if (_didIteratorError) {
                                                throw _iteratorError;
                                            }
                                        }
                                    }
                                }
                                _this2.hasNoServerResponse = false;
                                if (_this2._active) {
                                    _this2.refreshTimer = setTimeout(_this2._refresh.bind(_this2), _this2.interval);
                                }
                            })['catch'](function (err) {
                                _this2.emit('error', err);
                                if (_this2._active) {

                                    _this2.refreshTimer = setTimeout(_this2._refresh.bind(_this2), _this2.interval);
                                }
                            });
                        }
                    }

                    /**
                     * Add or Update a data record.
                     * @private
                     */
                }, {
                    key: '_handleSet',
                    value: function _handleSet(newData) {
                        var configuration = this._updateListItemsDefaultConfiguration();
                        /* Append the listName to the URL for easy debugging */
                        configuration.url = this._parsePath(this.settings.endPoint, this._getListService()) + ('?update=' + this.settings.listName);
                        var fieldCollection = [];
                        var method = '';

                        var isLocal = _.findIndex(tempKeys, function (key) {
                            return key.localId == newData.id;
                        });

                        if (isLocal > -1) {
                            newData.id = tempKeys[isLocal].remoteId;
                        }

                        if (!newData.id && this.childID) {
                            newData.id = this.childID;
                        }

                        // assume existing record to be updated.
                        if (newData.id) {

                            fieldCollection.push({
                                "_Name": "ID",
                                "__text": newData.id
                            });

                            method = "Update";
                        }
                        // create a new record, because there is no id.
                        else {
                                fieldCollection.push({
                                    "_Name": "ID",
                                    "__text": 'New'
                                });
                                method = 'New';
                            }

                        for (var prop in newData) {
                            var fieldValue = newData[prop];
                            if (prop == "id" || typeof fieldValue == "undefined") continue;
                            if (prop == "priority" || prop == "_temporary-identifier" || prop == "remoteId") continue;
                            if (typeof fieldValue === 'object') {
                                if (fieldValue.id && fieldValue.value) {
                                    /* This is a SharePoint lookup type field. We must write it as a specially formatted value instead of an id/value object. */
                                    fieldValue = fieldValue.id + ';#';
                                } else if (fieldValue.length !== undefined && fieldValue[0] && fieldValue[0].id && fieldValue[0].value) {
                                    /* This is a SharePoint LookupMulti field. It is specially formatted like above. */
                                    var IDs = _.pluck(fieldValue, 'id');
                                    fieldValue = IDs.join(';#;#');
                                } else {
                                    continue;
                                }
                            }

                            fieldCollection.push({
                                "_Name": prop,
                                "__text": fieldValue
                            });
                        }

                        configuration.params = {
                            "listName": this.settings.listName,
                            "updates": {
                                "Batch": {
                                    "Method": {
                                        "Field": fieldCollection,

                                        "_ID": "1",
                                        "_Cmd": method
                                    },

                                    "_OnError": "Continue",
                                    "_ListVersion": "1",
                                    "_ViewName": ""
                                }
                            }
                        };

                        // initial initialisation of the datasource
                        (function (newData) {
                            var _this3 = this;

                            soapClient.call(configuration, tempKeys).then(function (result) {

                                var data = _this3._getResults(result.data);
                                if (data.length == 1) {
                                    var remoteId = data[0].id;

                                    // push ID mapping for given session to collection of temp keys
                                    if (newData['_temporary-identifier']) {
                                        tempKeys.push({
                                            localId: newData['_temporary-identifier'],
                                            remoteId: remoteId,
                                            client: _this3
                                        });
                                    }
                                    var messages = _this3._updateCache(data);
                                    var _iteratorNormalCompletion2 = true;
                                    var _didIteratorError2 = false;
                                    var _iteratorError2 = undefined;

                                    try {
                                        for (var _iterator2 = _getIterator(messages), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                                            var message = _step2.value;

                                            _this3.emit('message', message);
                                        }

                                        /* Fire a value/child_changed event with the now available remoteId present */
                                    } catch (err) {
                                        _didIteratorError2 = true;
                                        _iteratorError2 = err;
                                    } finally {
                                        try {
                                            if (!_iteratorNormalCompletion2 && _iterator2['return']) {
                                                _iterator2['return']();
                                            }
                                        } finally {
                                            if (_didIteratorError2) {
                                                throw _iteratorError2;
                                            }
                                        }
                                    }

                                    var model = newData;
                                    model.id = model['_temporary-identifier'] || model.id;
                                    model.remoteId = remoteId;
                                    if (_this3.isChild) {
                                        /* TODO: re-enable value emit on children when child subscriptions are implemented */
                                        //this.emit('message', {event: 'value', result: model});
                                    } else {
                                            _this3.emit('message', { event: 'child_changed', result: model });
                                            _this3.emit('message', { event: 'value', result: _this3.cache });
                                        }
                                }
                            }, function (error) {
                                console.log(error);
                            });
                        }).bind(this)(newData);
                    }

                    /**
                     * Remove a record from SharePoint
                     * @param record
                     * @private
                     */
                }, {
                    key: '_handleRemove',
                    value: function _handleRemove(record) {
                        var _this4 = this;

                        var configuration = this._updateListItemsDefaultConfiguration();
                        /* Append the listName to the URL for easy debugging */
                        configuration.url = this._parsePath(this.settings.endPoint, this._getListService()) + ('?remove=' + this.settings.listName);
                        var fieldCollection = [];

                        record.remoteId = record.id;

                        var isLocal = _.findIndex(tempKeys, function (key) {
                            return key.localId == record.id;
                        });

                        if (isLocal > -1) {
                            record.id = tempKeys[isLocal].remoteId;
                        }

                        fieldCollection.push({
                            "_Name": "ID",
                            "__text": record.id
                        });

                        configuration.params = {
                            "listName": this.settings.listName,
                            "updates": {
                                "Batch": {
                                    "Method": {
                                        "Field": fieldCollection,

                                        "_ID": '1',
                                        "_Cmd": 'Delete'
                                    },

                                    "_OnError": 'Continue',
                                    "_ListVersion": '1',
                                    "_ViewName": ''
                                }
                            }
                        };

                        // initial initialisation of the datasource
                        soapClient.call(configuration, tempKeys).then(function () {
                            _this4.emit('message', { event: 'child_removed', result: record });
                        }, function (error) {
                            console.log(error);
                        });
                    }

                    /**
                     * Update our cache and bubble child_added or child_changed events
                     * @param data
                     * @private
                     */
                }, {
                    key: '_updateCache',
                    value: function _updateCache(data) {
                        var _this5 = this;

                        var messages = [];

                        var _loop = function (record) {
                            var shouldUseRemoteId = false;
                            var model = data[record];
                            model.remoteId = model.id;

                            var localIndex = _.findIndex(tempKeys, function (key) {
                                return key.remoteId == model.id;
                            });

                            if (localIndex > -1) {
                                var tempKey = tempKeys[localIndex];

                                /* If this SPClient instance created the temp ID, we need to use it in our events.
                                 * Otherwise, we should use the remote ID that SharePoint generated. */
                                shouldUseRemoteId = tempKey.client !== _this5;
                                model.id = shouldUseRemoteId ? model.remoteId : tempKey.localId;
                            }

                            var cacheIndex = _.findIndex(_this5.cache, function (item) {
                                return model.id == item.id;
                            });

                            if (cacheIndex === -1) {
                                _this5.cache.push(model);

                                var previousSiblingId = _this5.cache.length == 0 ? null : _this5.cache[_this5.cache.length - 1];
                                messages.push({
                                    event: 'child_added',
                                    result: model,
                                    previousSiblingId: previousSiblingId ? previousSiblingId.id : null
                                });
                            } else {
                                if (!_.isEqual(model, _this5.cache[cacheIndex])) {
                                    _this5.cache[cacheIndex] = model;

                                    var previousSibling = cacheIndex == 0 ? null : _this5.cache[cacheIndex - 1];
                                    messages.push({
                                        event: 'child_changed',
                                        result: model,
                                        previousSiblingId: previousSibling ? previousSibling.id : null
                                    });
                                }
                            }
                        };

                        for (var record in data) {
                            _loop(record);
                        }
                        return messages;
                    }

                    /**
                     * Update the last polling timestamp so we only get the latest changes.
                     * @param newDate
                     * @private
                     */
                }, {
                    key: '_activateChangeToken',
                    value: function _activateChangeToken(lastChangeToken) {
                        this.retriever.params.changeToken = lastChangeToken;
                    }
                }, {
                    key: '_setNextPage',
                    value: function _setNextPage(nextPaginationToken) {
                        this.retriever.params.queryOptions.QueryOptions.Paging = { _ListItemCollectionPositionNext: nextPaginationToken };
                    }
                }, {
                    key: '_clearNextPage',
                    value: function _clearNextPage() {
                        delete this.retriever.params.queryOptions.QueryOptions.Paging;
                    }
                }, {
                    key: '_deactivateChangeToken',
                    value: function _deactivateChangeToken() {
                        delete this.retriever.params.changeToken;
                    }
                }, {
                    key: '_handleNextToken',
                    value: function _handleNextToken(listItem) {
                        var lastQueryHadPagination = this.retriever.params.queryOptions.QueryOptions.Paging;

                        if (!lastQueryHadPagination && listItem.Changes) {
                            this.lastChangeToken = listItem.Changes[0].$.LastChangeToken;
                        }

                        if (this._isLimitExceeded()) {
                            this._clearNextPage();
                            this._activateChangeToken(this.lastChangeToken);
                        } else {
                            var nextPaginationToken = listItem["rs:data"][0].$.ListItemCollectionPositionNext;

                            if (nextPaginationToken !== undefined) {
                                this._setNextPage(nextPaginationToken);
                                this._deactivateChangeToken();
                            } else {
                                this._clearNextPage();
                                this._activateChangeToken(this.lastChangeToken);
                            }
                        }
                    }
                }, {
                    key: '_handleDeleted',
                    value: function _handleDeleted(result) {
                        var _this6 = this;

                        var changes = result.Id || null;

                        if (changes && changes.length > 0) {

                            for (var change in changes) {

                                if (changes[change].$.ChangeType == "Delete") {
                                    (function () {

                                        var recordId = changes[change]._;

                                        var localIndex = _.findIndex(tempKeys, function (key) {
                                            return key.remoteId == recordId;
                                        });

                                        if (localIndex > -1) {
                                            var tempKey = tempKeys[localIndex];
                                            var isOurTempKey = tempKey.client === _this6;
                                            recordId = isOurTempKey ? tempKey.localId : tempKey.remoteId;
                                        }

                                        var cacheItem = _.findIndex(_this6.cache, function (item) {
                                            return item.id == recordId;
                                        });

                                        _this6.emit('message', {
                                            event: 'child_removed',
                                            result: _this6.cache[cacheItem]
                                        });
                                        _this6.cache.splice(cacheItem, 1);
                                    })();
                                }
                            }

                            return true;
                        }

                        return false;
                    }

                    /**
                     * Parse SharePoint response into formatted records
                     * @param result
                     * @returns {Array}
                     * @private
                     */
                }, {
                    key: '_getResults',
                    value: function _getResults(result) {

                        var arrayOfObjects = [];
                        var node = null;

                        if (result["soap:Envelope"]["soap:Body"][0].GetListItemChangesSinceTokenResponse) {

                            node = result["soap:Envelope"]["soap:Body"][0].GetListItemChangesSinceTokenResponse[0].GetListItemChangesSinceTokenResult[0].listitems[0]["rs:data"][0];

                            if (node) {
                                if (node.$.ItemCount !== '0') {
                                    for (var row in node['z:row']) {
                                        var raw = node['z:row'][row].$;
                                        var record = this._formatRecord(raw);
                                        arrayOfObjects.push(record);
                                    }
                                }
                            }
                        } else if (result["soap:Envelope"]["soap:Body"][0].UpdateListItemsResponse) {

                            // check for error
                            var error = result["soap:Envelope"]["soap:Body"][0].UpdateListItemsResponse[0].UpdateListItemsResult[0].Results[0].Result[0].ErrorCode;
                            if (error == '0x00000000') {
                                node = result["soap:Envelope"]["soap:Body"][0].UpdateListItemsResponse[0].UpdateListItemsResult[0].Results[0];
                                if (node) {
                                    for (var row in node.Result) {
                                        var raw = node.Result[row]["z:row"][0].$;
                                        var record = this._formatRecord(raw);
                                        arrayOfObjects.push(record);
                                    }
                                }
                            }
                        }

                        return arrayOfObjects;
                    }

                    /**
                     * Strip SharePoint record from SharePoint specifics
                     * @param record
                     * @returns {{}}
                     * @private
                     */
                }, {
                    key: '_formatRecord',
                    value: function _formatRecord(record) {
                        var result = {};
                        for (var attribute in record) {

                            var _name = attribute.replace('ows_', '');
                            if (_name == 'xmlns:z') {
                                continue;
                            }

                            var value = record[attribute];
                            if (value === '') {
                                continue;
                            }

                            if (_name == "ID") {
                                _name = "id";
                                result[_name] = value;
                            } else if (value.indexOf(";#") > -1) {
                                var keys = value.split(";#");
                                var pairs = keys.length / 2;
                                var assignable = pairs > 1 ? [] : {};
                                for (var pair = 0; pair < keys.length; pair += 2) {
                                    if (pairs > 1) assignable.push({ id: keys[pair], value: keys[pair + 1] });else assignable = { id: keys[pair], value: keys[pair + 1] };
                                }
                                result[_name] = assignable;
                            } else if (!isNaN(value)) {
                                /* Map a number when that number is detected */
                                result[_name] = parseFloat(value);
                            } else {
                                /* By default map the attribute 1:1 */
                                result[_name] = value;
                            }
                        }

                        return result;
                    }

                    /**
                     * Double check if given path is a valid path
                     * @param path
                     * @param endPoint
                     * @returns {string}
                     * @private
                     */
                }, {
                    key: '_parsePath',
                    value: function _parsePath() {
                        var path = arguments.length <= 0 || arguments[0] === undefined ? '' : arguments[0];
                        var endPoint = arguments.length <= 1 || arguments[1] === undefined ? '' : arguments[1];

                        var url = UrlParser(path);
                        if (!url) console.log('Invalid datasource path provided!');

                        var pathParts = url.path.split('/');
                        var newPath = url.protocol + '://' + url.host + '/';
                        for (var i = 0; i < pathParts.length; i++) newPath += pathParts[i] + '/';
                        newPath += endPoint;
                        return newPath;
                    }

                    /**
                     * Get Default resource for Updating Lists
                     * @returns {{url: string, service: string, method: string, params: string, headers: (Map|*)}}
                     * @private
                     */
                }, {
                    key: '_updateListItemsDefaultConfiguration',
                    value: function _updateListItemsDefaultConfiguration() {
                        return {
                            url: '',
                            service: 'Lists',
                            method: 'UpdateListItems',
                            params: '',
                            headers: new _Map([['SOAPAction', 'http://schemas.microsoft.com/sharepoint/soap/UpdateListItems'], ['Content-Type', 'text/xml']])
                        };
                    }

                    /**
                     * Get Default resource for Reading Lists
                     * @returns {{url: string, service: string, method: string, params: string, headers: (Map|*)}}
                     * @private
                     */
                }, {
                    key: '_getListItemsDefaultConfiguration',
                    value: function _getListItemsDefaultConfiguration() {
                        return {
                            url: '',
                            service: 'Lists',
                            method: 'GetListItemChangesSinceToken',
                            params: '',
                            headers: new _Map([['SOAPAction', 'http://schemas.microsoft.com/sharepoint/soap/GetListItemChangesSinceToken'], ['Content-Type', 'text/xml']])
                        };
                    }

                    /**
                     * Get Default resource for Reading Lists
                     * @returns {{url: string, service: string, method: string, params: string, headers: (Map|*)}}
                     * @private
                     */
                }, {
                    key: '_getUserGroupDefaultConfiguration',
                    value: function _getUserGroupDefaultConfiguration() {
                        return {
                            url: '',
                            service: 'UserGroup',
                            method: 'GetCurrentUserInfo',
                            params: '',
                            headers: new _Map([['SOAPAction', 'http://schemas.microsoft.com/sharepoint/soap/directory/GetCurrentUserInfo'], ['Content-Type', 'text/xml']])
                        };
                    }

                    /**
                     * Default interface for Get list
                     * @returns {string}
                     * @private
                     */
                }, {
                    key: '_getListService',
                    value: function _getListService() {
                        return '_vti_bin/Lists.asmx';
                    }

                    /**
                     * Default interface for Update list
                     * @returns {string}
                     * @private
                     */
                }, {
                    key: '_getUserGroupService',
                    value: function _getUserGroupService() {
                        return '_vti_bin/UserGroup.asmx';
                    }

                    /* Ignores all paths ending in a numeric value. These paths don't contain an array, but rather a specific child.
                     * Binding to specific children is not supported by the SharePoint interface, and shouldn't be necessary either
                     * because there is a subscription to child_changed events on the parent array containing this child. */
                }, {
                    key: '_isChildItem',
                    value: function _isChildItem(path) {
                        if (path[path.length - 1] === '/') {
                            path = path.substring(0, path.length - 2);
                        }

                        var parts = path.split('/');
                        if (parts.length) {
                            var lastArgument = parts[parts.length - 1];

                            var isNumeric = function isNumeric(n) {
                                return !isNaN(parseFloat(n)) && isFinite(n);
                            };

                            if (isNumeric(lastArgument) || lastArgument.indexOf(Settings.localKeyPrefix) === 0) {
                                this.childID = lastArgument;
                                return true;
                            } else {
                                return false;
                            }
                        }
                        return true;
                    }
                }]);

                return SharePointClient;
            })(EventEmitter);

            _export('SharePointClient', SharePointClient);
        }
    };
});
$__System.register('1', ['22', '23', '24', '25', '126'], function (_export) {
    var _regeneratorRuntime, SharePointClient, clients;

    return {
        setters: [function (_) {
            _regeneratorRuntime = _['default'];
        }, function (_2) {}, function (_3) {}, function (_4) {}, function (_5) {
            SharePointClient = _5.SharePointClient;
        }],
        execute: function () {
            /**
             * Created by tom on 28/08/15.
             */
            'use strict';

            clients = {};

            onmessage = function callee$0$0(messageEvent) {
                var message, subscriberID, operation, client, clientExisted, cacheData, authData;
                return _regeneratorRuntime.async(function callee$0$0$(context$1$0) {
                    while (1) switch (context$1$0.prev = context$1$0.next) {
                        case 0:
                            message = messageEvent.data;
                            subscriberID = message.subscriberID;
                            operation = message.operation;
                            client = clients[subscriberID];
                            clientExisted = !!client;

                            /* If the requested client doesn't exist yet, create a new instance. */
                            if (!clientExisted) {
                                /* This automatically subscribes to changes, so for a set/remove operation that
                                 * isn't interested in listening to changes we'll need to unsubscribe again after the operation. */
                                client = clients[subscriberID] = new SharePointClient(message);
                                client.referenceCount = 0;
                            }

                            context$1$0.t0 = operation;
                            context$1$0.next = context$1$0.t0 === 'init' ? 9 : context$1$0.t0 === 'subscribe' ? 11 : context$1$0.t0 === 'dispose' ? 14 : context$1$0.t0 === 'set' ? 17 : context$1$0.t0 === 'remove' ? 20 : context$1$0.t0 === 'get_cache' ? 23 : context$1$0.t0 === 'get_auth' ? 26 : 37;
                            break;

                        case 9:
                            if (!client.initialised) {
                                client.init();
                                client.initialised = true;
                                client.on('message', function (message) {
                                    message.subscriberID = subscriberID;
                                    postMessage(message);
                                });
                            }
                            return context$1$0.abrupt('break', 37);

                        case 11:
                            client.subscribeToChanges();
                            client.referenceCount++;
                            return context$1$0.abrupt('break', 37);

                        case 14:
                            client.referenceCount--;
                            if (client.referenceCount <= 0) {
                                client.dispose();
                            }
                            return context$1$0.abrupt('break', 37);

                        case 17:
                            client.set(message.model);
                            /* If the client was created for this set operation,
                             * cancel all subscriptions that were automatically created on instantiation. */
                            if (!clientExisted) {
                                client.dispose();
                            }
                            return context$1$0.abrupt('break', 37);

                        case 20:
                            client.remove(message.model);
                            /* If the client was created for this remove operation,
                             * cancel all subscriptions that were automatically created on instantiation. */
                            if (!clientExisted) {
                                client.dispose();
                            }
                            return context$1$0.abrupt('break', 37);

                        case 23:
                            cacheData = client.cache;

                            postMessage({
                                subscriberID: subscriberID,
                                event: 'cache_data',
                                cache: cacheData
                            });
                            return context$1$0.abrupt('break', 37);

                        case 26:
                            context$1$0.prev = 26;
                            context$1$0.next = 29;
                            return _regeneratorRuntime.awrap(client.getAuth());

                        case 29:
                            authData = context$1$0.sent;

                            postMessage({
                                subscriberID: subscriberID,
                                event: 'auth_result',
                                auth: authData
                            });
                            context$1$0.next = 36;
                            break;

                        case 33:
                            context$1$0.prev = 33;
                            context$1$0.t1 = context$1$0['catch'](26);

                            console.log('Error whilst fetching user auth data: ', context$1$0.t1);

                        case 36:
                            return context$1$0.abrupt('break', 37);

                        case 37:
                        case 'end':
                            return context$1$0.stop();
                    }
                }, null, this, [[26, 33]]);
            };
        }
    };
});
})
(function(factory) {
  factory();
});
//# sourceMappingURL=worker.js.map