(function(global) {

  var defined = {};

  // indexOf polyfill for IE8
  var indexOf = Array.prototype.indexOf || function(item) {
    for (var i = 0, l = this.length; i < l; i++)
      if (this[i] === item)
        return i;
    return -1;
  }

  function dedupe(deps) {
    var newDeps = [];
    for (var i = 0, l = deps.length; i < l; i++)
      if (indexOf.call(newDeps, deps[i]) == -1)
        newDeps.push(deps[i])
    return newDeps;
  }

  function register(name, deps, declare) {
    if (arguments.length === 4)
      return registerDynamic.apply(this, arguments);
    doRegister(name, {
      declarative: true,
      deps: deps,
      declare: declare
    });
  }

  function registerDynamic(name, deps, executingRequire, execute) {
    doRegister(name, {
      declarative: false,
      deps: deps,
      executingRequire: executingRequire,
      execute: execute
    });
  }

  function doRegister(name, entry) {
    entry.name = name;

    // we never overwrite an existing define
    if (!(name in defined))
      defined[name] = entry; 

    entry.deps = dedupe(entry.deps);

    // we have to normalize dependencies
    // (assume dependencies are normalized for now)
    // entry.normalizedDeps = entry.deps.map(normalize);
    entry.normalizedDeps = entry.deps;
  }


  function buildGroups(entry, groups) {
    groups[entry.groupIndex] = groups[entry.groupIndex] || [];

    if (indexOf.call(groups[entry.groupIndex], entry) != -1)
      return;

    groups[entry.groupIndex].push(entry);

    for (var i = 0, l = entry.normalizedDeps.length; i < l; i++) {
      var depName = entry.normalizedDeps[i];
      var depEntry = defined[depName];

      // not in the registry means already linked / ES6
      if (!depEntry || depEntry.evaluated)
        continue;

      // now we know the entry is in our unlinked linkage group
      var depGroupIndex = entry.groupIndex + (depEntry.declarative != entry.declarative);

      // the group index of an entry is always the maximum
      if (depEntry.groupIndex === undefined || depEntry.groupIndex < depGroupIndex) {

        // if already in a group, remove from the old group
        if (depEntry.groupIndex !== undefined) {
          groups[depEntry.groupIndex].splice(indexOf.call(groups[depEntry.groupIndex], depEntry), 1);

          // if the old group is empty, then we have a mixed depndency cycle
          if (groups[depEntry.groupIndex].length == 0)
            throw new TypeError("Mixed dependency cycle detected");
        }

        depEntry.groupIndex = depGroupIndex;
      }

      buildGroups(depEntry, groups);
    }
  }

  function link(name) {
    var startEntry = defined[name];

    startEntry.groupIndex = 0;

    var groups = [];

    buildGroups(startEntry, groups);

    var curGroupDeclarative = !!startEntry.declarative == groups.length % 2;
    for (var i = groups.length - 1; i >= 0; i--) {
      var group = groups[i];
      for (var j = 0; j < group.length; j++) {
        var entry = group[j];

        // link each group
        if (curGroupDeclarative)
          linkDeclarativeModule(entry);
        else
          linkDynamicModule(entry);
      }
      curGroupDeclarative = !curGroupDeclarative; 
    }
  }

  // module binding records
  var moduleRecords = {};
  function getOrCreateModuleRecord(name) {
    return moduleRecords[name] || (moduleRecords[name] = {
      name: name,
      dependencies: [],
      exports: {}, // start from an empty module and extend
      importers: []
    })
  }

  function linkDeclarativeModule(entry) {
    // only link if already not already started linking (stops at circular)
    if (entry.module)
      return;

    var module = entry.module = getOrCreateModuleRecord(entry.name);
    var exports = entry.module.exports;

    var declaration = entry.declare.call(global, function(name, value) {
      module.locked = true;
      exports[name] = value;

      for (var i = 0, l = module.importers.length; i < l; i++) {
        var importerModule = module.importers[i];
        if (!importerModule.locked) {
          var importerIndex = indexOf.call(importerModule.dependencies, module);
          importerModule.setters[importerIndex](exports);
        }
      }

      module.locked = false;
      return value;
    });

    module.setters = declaration.setters;
    module.execute = declaration.execute;

    // now link all the module dependencies
    for (var i = 0, l = entry.normalizedDeps.length; i < l; i++) {
      var depName = entry.normalizedDeps[i];
      var depEntry = defined[depName];
      var depModule = moduleRecords[depName];

      // work out how to set depExports based on scenarios...
      var depExports;

      if (depModule) {
        depExports = depModule.exports;
      }
      else if (depEntry && !depEntry.declarative) {
        depExports = depEntry.esModule;
      }
      // in the module registry
      else if (!depEntry) {
        depExports = load(depName);
      }
      // we have an entry -> link
      else {
        linkDeclarativeModule(depEntry);
        depModule = depEntry.module;
        depExports = depModule.exports;
      }

      // only declarative modules have dynamic bindings
      if (depModule && depModule.importers) {
        depModule.importers.push(module);
        module.dependencies.push(depModule);
      }
      else
        module.dependencies.push(null);

      // run the setter for this dependency
      if (module.setters[i])
        module.setters[i](depExports);
    }
  }

  // An analog to loader.get covering execution of all three layers (real declarative, simulated declarative, simulated dynamic)
  function getModule(name) {
    var exports;
    var entry = defined[name];

    if (!entry) {
      exports = load(name);
      if (!exports)
        throw new Error("Unable to load dependency " + name + ".");
    }

    else {
      if (entry.declarative)
        ensureEvaluated(name, []);

      else if (!entry.evaluated)
        linkDynamicModule(entry);

      exports = entry.module.exports;
    }

    if ((!entry || entry.declarative) && exports && exports.__useDefault)
      return exports['default'];

    return exports;
  }

  function linkDynamicModule(entry) {
    if (entry.module)
      return;

    var exports = {};

    var module = entry.module = { exports: exports, id: entry.name };

    // AMD requires execute the tree first
    if (!entry.executingRequire) {
      for (var i = 0, l = entry.normalizedDeps.length; i < l; i++) {
        var depName = entry.normalizedDeps[i];
        var depEntry = defined[depName];
        if (depEntry)
          linkDynamicModule(depEntry);
      }
    }

    // now execute
    entry.evaluated = true;
    var output = entry.execute.call(global, function(name) {
      for (var i = 0, l = entry.deps.length; i < l; i++) {
        if (entry.deps[i] != name)
          continue;
        return getModule(entry.normalizedDeps[i]);
      }
      throw new TypeError('Module ' + name + ' not declared as a dependency.');
    }, exports, module);

    if (output)
      module.exports = output;

    // create the esModule object, which allows ES6 named imports of dynamics
    exports = module.exports;
 
    if (exports && exports.__esModule) {
      entry.esModule = exports;
    }
    else {
      var hasOwnProperty = exports && exports.hasOwnProperty;
      entry.esModule = {};
      for (var p in exports) {
        if (!hasOwnProperty || exports.hasOwnProperty(p))
          entry.esModule[p] = exports[p];
      }
      entry.esModule['default'] = exports;
      entry.esModule.__useDefault = true;
    }
  }

  /*
   * Given a module, and the list of modules for this current branch,
   *  ensure that each of the dependencies of this module is evaluated
   *  (unless one is a circular dependency already in the list of seen
   *  modules, in which case we execute it)
   *
   * Then we evaluate the module itself depth-first left to right 
   * execution to match ES6 modules
   */
  function ensureEvaluated(moduleName, seen) {
    var entry = defined[moduleName];

    // if already seen, that means it's an already-evaluated non circular dependency
    if (!entry || entry.evaluated || !entry.declarative)
      return;

    // this only applies to declarative modules which late-execute

    seen.push(moduleName);

    for (var i = 0, l = entry.normalizedDeps.length; i < l; i++) {
      var depName = entry.normalizedDeps[i];
      if (indexOf.call(seen, depName) == -1) {
        if (!defined[depName])
          load(depName);
        else
          ensureEvaluated(depName, seen);
      }
    }

    if (entry.evaluated)
      return;

    entry.evaluated = true;
    entry.module.execute.call(global);
  }

  // magical execution function
  var modules = {};
  function load(name) {
    if (modules[name])
      return modules[name];

    var entry = defined[name];

    // first we check if this module has already been defined in the registry
    if (!entry)
      throw "Module " + name + " not present.";

    // recursively ensure that the module and all its 
    // dependencies are linked (with dependency group handling)
    link(name);

    // now handle dependency execution in correct order
    ensureEvaluated(name, []);

    // remove from the registry
    defined[name] = undefined;

    // return the defined module object
    return modules[name] = entry.declarative ? entry.module.exports : entry.esModule;
  };

  return function(mains, declare) {
    return function(formatDetect) {
      formatDetect(function() {
        var System = {
          _nodeRequire: typeof require != 'undefined' && require.resolve && typeof process != 'undefined' && require,
          register: register,
          registerDynamic: registerDynamic,
          get: load, 
          set: function(name, module) {
            modules[name] = module; 
          },
          newModule: function(module) {
            return module;
          },
          'import': function() {
            throw new TypeError('Dynamic System.import calls are not supported for SFX bundles. Rather use a named bundle.');
          }
        };
        System.set('@empty', {});

        declare(System);

        var firstLoad = load(mains[0]);
        if (mains.length > 1)
          for (var i = 1; i < mains.length; i++)
            load(mains[i]);

        return firstLoad;
      });
    };
  };

})(typeof self != 'undefined' ? self : global)
/* (['mainModule'], function(System) {
  System.register(...);
})
(function(factory) {
  if (typeof define && define.amd)
    define(factory);
  // etc UMD / module pattern
})*/

(['Worker/Manager.js'], function(System) {

(function(__global) {
  var loader = System;
  var indexOf = Array.prototype.indexOf || function(item) {
    for (var i = 0, l = this.length; i < l; i++)
      if (this[i] === item)
        return i;
    return -1;
  }

  var commentRegEx = /(\/\*([\s\S]*?)\*\/|([^:]|^)\/\/(.*)$)/mg;
  var cjsRequirePre = "(?:^|[^$_a-zA-Z\\xA0-\\uFFFF.])";
  var cjsRequirePost = "\\s*\\(\\s*(\"([^\"]+)\"|'([^']+)')\\s*\\)";
  var fnBracketRegEx = /\(([^\)]*)\)/;
  var wsRegEx = /^\s+|\s+$/g;
  
  var requireRegExs = {};

  function getCJSDeps(source, requireIndex) {

    // remove comments
    source = source.replace(commentRegEx, '');

    // determine the require alias
    var params = source.match(fnBracketRegEx);
    var requireAlias = (params[1].split(',')[requireIndex] || 'require').replace(wsRegEx, '');

    // find or generate the regex for this requireAlias
    var requireRegEx = requireRegExs[requireAlias] || (requireRegExs[requireAlias] = new RegExp(cjsRequirePre + requireAlias + cjsRequirePost, 'g'));

    requireRegEx.lastIndex = 0;

    var deps = [];

    var match;
    while (match = requireRegEx.exec(source))
      deps.push(match[2] || match[3]);

    return deps;
  }

  /*
    AMD-compatible require
    To copy RequireJS, set window.require = window.requirejs = loader.amdRequire
  */
  function require(names, callback, errback, referer) {
    // in amd, first arg can be a config object... we just ignore
    if (typeof names == 'object' && !(names instanceof Array))
      return require.apply(null, Array.prototype.splice.call(arguments, 1, arguments.length - 1));

    // amd require
    if (typeof names == 'string' && typeof callback == 'function')
      names = [names];
    if (names instanceof Array) {
      var dynamicRequires = [];
      for (var i = 0; i < names.length; i++)
        dynamicRequires.push(loader['import'](names[i], referer));
      Promise.all(dynamicRequires).then(function(modules) {
        if (callback)
          callback.apply(null, modules);
      }, errback);
    }

    // commonjs require
    else if (typeof names == 'string') {
      var module = loader.get(names);
      return module.__useDefault ? module['default'] : module;
    }

    else
      throw new TypeError('Invalid require');
  };

  function define(name, deps, factory) {
    if (typeof name != 'string') {
      factory = deps;
      deps = name;
      name = null;
    }
    if (!(deps instanceof Array)) {
      factory = deps;
      deps = ['require', 'exports', 'module'].splice(0, factory.length);
    }

    if (typeof factory != 'function')
      factory = (function(factory) {
        return function() { return factory; }
      })(factory);

    // in IE8, a trailing comma becomes a trailing undefined entry
    if (deps[deps.length - 1] === undefined)
      deps.pop();

    // remove system dependencies
    var requireIndex, exportsIndex, moduleIndex;
    
    if ((requireIndex = indexOf.call(deps, 'require')) != -1) {
      
      deps.splice(requireIndex, 1);

      // only trace cjs requires for non-named
      // named defines assume the trace has already been done
      if (!name)
        deps = deps.concat(getCJSDeps(factory.toString(), requireIndex));
    }

    if ((exportsIndex = indexOf.call(deps, 'exports')) != -1)
      deps.splice(exportsIndex, 1);
    
    if ((moduleIndex = indexOf.call(deps, 'module')) != -1)
      deps.splice(moduleIndex, 1);

    var define = {
      name: name,
      deps: deps,
      execute: function(req, exports, module) {

        var depValues = [];
        for (var i = 0; i < deps.length; i++)
          depValues.push(req(deps[i]));

        module.uri = loader.baseURL + (module.id[0] == '/' ? module.id : '/' + module.id);

        module.config = function() {};

        // add back in system dependencies
        if (moduleIndex != -1)
          depValues.splice(moduleIndex, 0, module);
        
        if (exportsIndex != -1)
          depValues.splice(exportsIndex, 0, exports);
        
        if (requireIndex != -1) 
          depValues.splice(requireIndex, 0, function(names, callback, errback) {
            if (typeof names == 'string' && typeof callback != 'function')
              return req(names);
            return require.call(loader, names, callback, errback, module.id);
          });

        // set global require to AMD require
        var curRequire = __global.require;
        __global.require = require;

        var output = factory.apply(exportsIndex == -1 ? __global : exports, depValues);

        __global.require = curRequire;

        if (typeof output == 'undefined' && module)
          output = module.exports;

        if (typeof output != 'undefined')
          return output;
      }
    };

    // anonymous define
    if (!name) {
      // already defined anonymously -> throw
      if (lastModule.anonDefine)
        throw new TypeError('Multiple defines for anonymous module');
      lastModule.anonDefine = define;
    }
    // named define
    else {
      // if it has no dependencies and we don't have any other
      // defines, then let this be an anonymous define
      // this is just to support single modules of the form:
      // define('jquery')
      // still loading anonymously
      // because it is done widely enough to be useful
      if (deps.length == 0 && !lastModule.anonDefine && !lastModule.isBundle) {
        lastModule.anonDefine = define;
      }
      // otherwise its a bundle only
      else {
        // if there is an anonDefine already (we thought it could have had a single named define)
        // then we define it now
        // this is to avoid defining named defines when they are actually anonymous
        if (lastModule.anonDefine && lastModule.anonDefine.name)
          loader.registerDynamic(lastModule.anonDefine.name, lastModule.anonDefine.deps, false, lastModule.anonDefine.execute);

        lastModule.anonDefine = null;
      }

      // note this is now a bundle
      lastModule.isBundle = true;

      // define the module through the register registry
      loader.registerDynamic(name, define.deps, false, define.execute);
    }
  }
  define.amd = {};

  // adds define as a global (potentially just temporarily)
  function createDefine(loader) {
    lastModule.anonDefine = null;
    lastModule.isBundle = false;

    // ensure no NodeJS environment detection
    var oldModule = __global.module;
    var oldExports = __global.exports;
    var oldDefine = __global.define;

    __global.module = undefined;
    __global.exports = undefined;
    __global.define = define;

    return function() {
      __global.define = oldDefine;
      __global.module = oldModule;
      __global.exports = oldExports;
    };
  }

  var lastModule = {
    isBundle: false,
    anonDefine: null
  };

  loader.set('@@amd-helpers', loader.newModule({
    createDefine: createDefine,
    require: require,
    define: define,
    lastModule: lastModule
  }));
  loader.amdDefine = define;
  loader.amdRequire = require;
})(typeof self != 'undefined' ? self : global);
System.registerDynamic("npm:core-js@0.9.18/library/modules/$.fw.js", [], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = function($) {
    $.FW = false;
    $.path = $.core;
    return $;
  };
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:core-js@0.9.18/library/modules/$.shared.js", ["npm:core-js@0.9.18/library/modules/$.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var $ = require("npm:core-js@0.9.18/library/modules/$.js"),
      SHARED = '__core-js_shared__',
      store = $.g[SHARED] || ($.g[SHARED] = {});
  module.exports = function(key) {
    return store[key] || (store[key] = {});
  };
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:core-js@0.9.18/library/modules/$.uid.js", ["npm:core-js@0.9.18/library/modules/$.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var sid = 0;
  function uid(key) {
    return 'Symbol('.concat(key === undefined ? '' : key, ')_', (++sid + Math.random()).toString(36));
  }
  uid.safe = require("npm:core-js@0.9.18/library/modules/$.js").g.Symbol || uid;
  module.exports = uid;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:core-js@0.9.18/library/modules/$.def.js", ["npm:core-js@0.9.18/library/modules/$.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var $ = require("npm:core-js@0.9.18/library/modules/$.js"),
      global = $.g,
      core = $.core,
      isFunction = $.isFunction;
  function ctx(fn, that) {
    return function() {
      return fn.apply(that, arguments);
    };
  }
  $def.F = 1;
  $def.G = 2;
  $def.S = 4;
  $def.P = 8;
  $def.B = 16;
  $def.W = 32;
  function $def(type, name, source) {
    var key,
        own,
        out,
        exp,
        isGlobal = type & $def.G,
        isProto = type & $def.P,
        target = isGlobal ? global : type & $def.S ? global[name] : (global[name] || {}).prototype,
        exports = isGlobal ? core : core[name] || (core[name] = {});
    if (isGlobal)
      source = name;
    for (key in source) {
      own = !(type & $def.F) && target && key in target;
      if (own && key in exports)
        continue;
      out = own ? target[key] : source[key];
      if (isGlobal && !isFunction(target[key]))
        exp = source[key];
      else if (type & $def.B && own)
        exp = ctx(out, global);
      else if (type & $def.W && target[key] == out)
        !function(C) {
          exp = function(param) {
            return this instanceof C ? new C(param) : C(param);
          };
          exp.prototype = C.prototype;
        }(out);
      else
        exp = isProto && isFunction(out) ? ctx(Function.call, out) : out;
      exports[key] = exp;
      if (isProto)
        (exports.prototype || (exports.prototype = {}))[key] = out;
    }
  }
  module.exports = $def;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:core-js@0.9.18/library/modules/$.redef.js", ["npm:core-js@0.9.18/library/modules/$.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = require("npm:core-js@0.9.18/library/modules/$.js").hide;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:core-js@0.9.18/library/modules/$.keyof.js", ["npm:core-js@0.9.18/library/modules/$.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var $ = require("npm:core-js@0.9.18/library/modules/$.js");
  module.exports = function(object, el) {
    var O = $.toObject(object),
        keys = $.getKeys(O),
        length = keys.length,
        index = 0,
        key;
    while (length > index)
      if (O[key = keys[index++]] === el)
        return key;
  };
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:core-js@0.9.18/library/modules/$.enum-keys.js", ["npm:core-js@0.9.18/library/modules/$.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var $ = require("npm:core-js@0.9.18/library/modules/$.js");
  module.exports = function(it) {
    var keys = $.getKeys(it),
        getDesc = $.getDesc,
        getSymbols = $.getSymbols;
    if (getSymbols)
      $.each.call(getSymbols(it), function(key) {
        if (getDesc(it, key).enumerable)
          keys.push(key);
      });
    return keys;
  };
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:core-js@0.9.18/library/modules/$.assert.js", ["npm:core-js@0.9.18/library/modules/$.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var $ = require("npm:core-js@0.9.18/library/modules/$.js");
  function assert(condition, msg1, msg2) {
    if (!condition)
      throw TypeError(msg2 ? msg1 + msg2 : msg1);
  }
  assert.def = $.assertDefined;
  assert.fn = function(it) {
    if (!$.isFunction(it))
      throw TypeError(it + ' is not a function!');
    return it;
  };
  assert.obj = function(it) {
    if (!$.isObject(it))
      throw TypeError(it + ' is not an object!');
    return it;
  };
  assert.inst = function(it, Constructor, name) {
    if (!(it instanceof Constructor))
      throw TypeError(name + ": use the 'new' operator!");
    return it;
  };
  module.exports = assert;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:core-js@0.9.18/library/modules/$.get-names.js", ["npm:core-js@0.9.18/library/modules/$.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var $ = require("npm:core-js@0.9.18/library/modules/$.js"),
      toString = {}.toString,
      getNames = $.getNames;
  var windowNames = typeof window == 'object' && Object.getOwnPropertyNames ? Object.getOwnPropertyNames(window) : [];
  function getWindowNames(it) {
    try {
      return getNames(it);
    } catch (e) {
      return windowNames.slice();
    }
  }
  module.exports.get = function getOwnPropertyNames(it) {
    if (windowNames && toString.call(it) == '[object Window]')
      return getWindowNames(it);
    return getNames($.toObject(it));
  };
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:core-js@0.9.18/library/fn/object/create.js", ["npm:core-js@0.9.18/library/modules/$.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var $ = require("npm:core-js@0.9.18/library/modules/$.js");
  module.exports = function create(P, D) {
    return $.create(P, D);
  };
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:core-js@0.9.18/library/modules/$.ctx.js", ["npm:core-js@0.9.18/library/modules/$.assert.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var assertFunction = require("npm:core-js@0.9.18/library/modules/$.assert.js").fn;
  module.exports = function(fn, that, length) {
    assertFunction(fn);
    if (~length && that === undefined)
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
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:core-js@0.9.18/library/modules/es6.object.to-string.js", ["npm:core-js@0.9.18/library/modules/$.cof.js", "npm:core-js@0.9.18/library/modules/$.wks.js", "npm:core-js@0.9.18/library/modules/$.js", "npm:core-js@0.9.18/library/modules/$.redef.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var cof = require("npm:core-js@0.9.18/library/modules/$.cof.js"),
      tmp = {};
  tmp[require("npm:core-js@0.9.18/library/modules/$.wks.js")('toStringTag')] = 'z';
  if (require("npm:core-js@0.9.18/library/modules/$.js").FW && cof(tmp) != 'z') {
    require("npm:core-js@0.9.18/library/modules/$.redef.js")(Object.prototype, 'toString', function toString() {
      return '[object ' + cof.classof(this) + ']';
    }, true);
  }
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:core-js@0.9.18/library/modules/$.string-at.js", ["npm:core-js@0.9.18/library/modules/$.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var $ = require("npm:core-js@0.9.18/library/modules/$.js");
  module.exports = function(TO_STRING) {
    return function(that, pos) {
      var s = String($.assertDefined(that)),
          i = $.toInteger(pos),
          l = s.length,
          a,
          b;
      if (i < 0 || i >= l)
        return TO_STRING ? '' : undefined;
      a = s.charCodeAt(i);
      return a < 0xd800 || a > 0xdbff || i + 1 === l || (b = s.charCodeAt(i + 1)) < 0xdc00 || b > 0xdfff ? TO_STRING ? s.charAt(i) : a : TO_STRING ? s.slice(i, i + 2) : (a - 0xd800 << 10) + (b - 0xdc00) + 0x10000;
    };
  };
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:core-js@0.9.18/library/modules/$.iter.js", ["npm:core-js@0.9.18/library/modules/$.js", "npm:core-js@0.9.18/library/modules/$.cof.js", "npm:core-js@0.9.18/library/modules/$.assert.js", "npm:core-js@0.9.18/library/modules/$.wks.js", "npm:core-js@0.9.18/library/modules/$.shared.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var $ = require("npm:core-js@0.9.18/library/modules/$.js"),
      cof = require("npm:core-js@0.9.18/library/modules/$.cof.js"),
      classof = cof.classof,
      assert = require("npm:core-js@0.9.18/library/modules/$.assert.js"),
      assertObject = assert.obj,
      SYMBOL_ITERATOR = require("npm:core-js@0.9.18/library/modules/$.wks.js")('iterator'),
      FF_ITERATOR = '@@iterator',
      Iterators = require("npm:core-js@0.9.18/library/modules/$.shared.js")('iterators'),
      IteratorPrototype = {};
  setIterator(IteratorPrototype, $.that);
  function setIterator(O, value) {
    $.hide(O, SYMBOL_ITERATOR, value);
    if (FF_ITERATOR in [])
      $.hide(O, FF_ITERATOR, value);
  }
  module.exports = {
    BUGGY: 'keys' in [] && !('next' in [].keys()),
    Iterators: Iterators,
    step: function(done, value) {
      return {
        value: value,
        done: !!done
      };
    },
    is: function(it) {
      var O = Object(it),
          Symbol = $.g.Symbol;
      return (Symbol && Symbol.iterator || FF_ITERATOR) in O || SYMBOL_ITERATOR in O || $.has(Iterators, classof(O));
    },
    get: function(it) {
      var Symbol = $.g.Symbol,
          getIter;
      if (it != undefined) {
        getIter = it[Symbol && Symbol.iterator || FF_ITERATOR] || it[SYMBOL_ITERATOR] || Iterators[classof(it)];
      }
      assert($.isFunction(getIter), it, ' is not iterable!');
      return assertObject(getIter.call(it));
    },
    set: setIterator,
    create: function(Constructor, NAME, next, proto) {
      Constructor.prototype = $.create(proto || IteratorPrototype, {next: $.desc(1, next)});
      cof.set(Constructor, NAME + ' Iterator');
    }
  };
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:core-js@0.9.18/library/modules/$.iter-define.js", ["npm:core-js@0.9.18/library/modules/$.def.js", "npm:core-js@0.9.18/library/modules/$.redef.js", "npm:core-js@0.9.18/library/modules/$.js", "npm:core-js@0.9.18/library/modules/$.cof.js", "npm:core-js@0.9.18/library/modules/$.iter.js", "npm:core-js@0.9.18/library/modules/$.wks.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var $def = require("npm:core-js@0.9.18/library/modules/$.def.js"),
      $redef = require("npm:core-js@0.9.18/library/modules/$.redef.js"),
      $ = require("npm:core-js@0.9.18/library/modules/$.js"),
      cof = require("npm:core-js@0.9.18/library/modules/$.cof.js"),
      $iter = require("npm:core-js@0.9.18/library/modules/$.iter.js"),
      SYMBOL_ITERATOR = require("npm:core-js@0.9.18/library/modules/$.wks.js")('iterator'),
      FF_ITERATOR = '@@iterator',
      KEYS = 'keys',
      VALUES = 'values',
      Iterators = $iter.Iterators;
  module.exports = function(Base, NAME, Constructor, next, DEFAULT, IS_SET, FORCE) {
    $iter.create(Constructor, NAME, next);
    function createMethod(kind) {
      function $$(that) {
        return new Constructor(that, kind);
      }
      switch (kind) {
        case KEYS:
          return function keys() {
            return $$(this);
          };
        case VALUES:
          return function values() {
            return $$(this);
          };
      }
      return function entries() {
        return $$(this);
      };
    }
    var TAG = NAME + ' Iterator',
        proto = Base.prototype,
        _native = proto[SYMBOL_ITERATOR] || proto[FF_ITERATOR] || DEFAULT && proto[DEFAULT],
        _default = _native || createMethod(DEFAULT),
        methods,
        key;
    if (_native) {
      var IteratorPrototype = $.getProto(_default.call(new Base));
      cof.set(IteratorPrototype, TAG, true);
      if ($.FW && $.has(proto, FF_ITERATOR))
        $iter.set(IteratorPrototype, $.that);
    }
    if ($.FW || FORCE)
      $iter.set(proto, _default);
    Iterators[NAME] = _default;
    Iterators[TAG] = $.that;
    if (DEFAULT) {
      methods = {
        keys: IS_SET ? _default : createMethod(KEYS),
        values: DEFAULT == VALUES ? _default : createMethod(VALUES),
        entries: DEFAULT != VALUES ? _default : createMethod('entries')
      };
      if (FORCE)
        for (key in methods) {
          if (!(key in proto))
            $redef(proto, key, methods[key]);
        }
      else
        $def($def.P + $def.F * $iter.BUGGY, NAME, methods);
    }
  };
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:core-js@0.9.18/library/modules/$.unscope.js", [], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = function() {};
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:core-js@0.9.18/library/modules/$.iter-call.js", ["npm:core-js@0.9.18/library/modules/$.assert.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var assertObject = require("npm:core-js@0.9.18/library/modules/$.assert.js").obj;
  function close(iterator) {
    var ret = iterator['return'];
    if (ret !== undefined)
      assertObject(ret.call(iterator));
  }
  function call(iterator, fn, value, entries) {
    try {
      return entries ? fn(assertObject(value)[0], value[1]) : fn(value);
    } catch (e) {
      close(iterator);
      throw e;
    }
  }
  call.close = close;
  module.exports = call;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:core-js@0.9.18/library/modules/$.same.js", [], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = Object.is || function is(x, y) {
    return x === y ? x !== 0 || 1 / x === 1 / y : x != x && y != y;
  };
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:core-js@0.9.18/library/modules/$.species.js", ["npm:core-js@0.9.18/library/modules/$.js", "npm:core-js@0.9.18/library/modules/$.wks.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var $ = require("npm:core-js@0.9.18/library/modules/$.js"),
      SPECIES = require("npm:core-js@0.9.18/library/modules/$.wks.js")('species');
  module.exports = function(C) {
    if ($.DESC && !(SPECIES in C))
      $.setDesc(C, SPECIES, {
        configurable: true,
        get: $.that
      });
  };
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:core-js@0.9.18/library/modules/$.invoke.js", [], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
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
      case 5:
        return un ? fn(args[0], args[1], args[2], args[3], args[4]) : fn.call(that, args[0], args[1], args[2], args[3], args[4]);
    }
    return fn.apply(that, args);
  };
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:core-js@0.9.18/library/modules/$.dom-create.js", ["npm:core-js@0.9.18/library/modules/$.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var $ = require("npm:core-js@0.9.18/library/modules/$.js"),
      document = $.g.document,
      isObject = $.isObject,
      is = isObject(document) && isObject(document.createElement);
  module.exports = function(it) {
    return is ? document.createElement(it) : {};
  };
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:process@0.11.2/browser.js", [], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
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
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:core-js@0.9.18/library/modules/$.mix.js", ["npm:core-js@0.9.18/library/modules/$.redef.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var $redef = require("npm:core-js@0.9.18/library/modules/$.redef.js");
  module.exports = function(target, src) {
    for (var key in src)
      $redef(target, key, src[key]);
    return target;
  };
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:core-js@0.9.18/library/modules/$.iter-detect.js", ["npm:core-js@0.9.18/library/modules/$.wks.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var SYMBOL_ITERATOR = require("npm:core-js@0.9.18/library/modules/$.wks.js")('iterator'),
      SAFE_CLOSING = false;
  try {
    var riter = [7][SYMBOL_ITERATOR]();
    riter['return'] = function() {
      SAFE_CLOSING = true;
    };
    Array.from(riter, function() {
      throw 2;
    });
  } catch (e) {}
  module.exports = function(exec) {
    if (!SAFE_CLOSING)
      return false;
    var safe = false;
    try {
      var arr = [7],
          iter = arr[SYMBOL_ITERATOR]();
      iter.next = function() {
        safe = true;
      };
      arr[SYMBOL_ITERATOR] = function() {
        return iter;
      };
      exec(arr);
    } catch (e) {}
    return safe;
  };
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:core-js@0.9.18/library/modules/es6.object.statics-accept-primitives.js", ["npm:core-js@0.9.18/library/modules/$.js", "npm:core-js@0.9.18/library/modules/$.def.js", "npm:core-js@0.9.18/library/modules/$.get-names.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var $ = require("npm:core-js@0.9.18/library/modules/$.js"),
      $def = require("npm:core-js@0.9.18/library/modules/$.def.js"),
      isObject = $.isObject,
      toObject = $.toObject;
  $.each.call(('freeze,seal,preventExtensions,isFrozen,isSealed,isExtensible,' + 'getOwnPropertyDescriptor,getPrototypeOf,keys,getOwnPropertyNames').split(','), function(KEY, ID) {
    var fn = ($.core.Object || {})[KEY] || Object[KEY],
        forced = 0,
        method = {};
    method[KEY] = ID == 0 ? function freeze(it) {
      return isObject(it) ? fn(it) : it;
    } : ID == 1 ? function seal(it) {
      return isObject(it) ? fn(it) : it;
    } : ID == 2 ? function preventExtensions(it) {
      return isObject(it) ? fn(it) : it;
    } : ID == 3 ? function isFrozen(it) {
      return isObject(it) ? fn(it) : true;
    } : ID == 4 ? function isSealed(it) {
      return isObject(it) ? fn(it) : true;
    } : ID == 5 ? function isExtensible(it) {
      return isObject(it) ? fn(it) : false;
    } : ID == 6 ? function getOwnPropertyDescriptor(it, key) {
      return fn(toObject(it), key);
    } : ID == 7 ? function getPrototypeOf(it) {
      return fn(Object($.assertDefined(it)));
    } : ID == 8 ? function keys(it) {
      return fn(toObject(it));
    } : require("npm:core-js@0.9.18/library/modules/$.get-names.js").get;
    try {
      fn('z');
    } catch (e) {
      forced = 1;
    }
    $def($def.S + $def.F * forced, 'Object', method);
  });
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:babel-runtime@5.8.35/helpers/inherits.js", ["npm:babel-runtime@5.8.35/core-js/object/create.js", "npm:babel-runtime@5.8.35/core-js/object/set-prototype-of.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  "use strict";
  var _Object$create = require("npm:babel-runtime@5.8.35/core-js/object/create.js")["default"];
  var _Object$setPrototypeOf = require("npm:babel-runtime@5.8.35/core-js/object/set-prototype-of.js")["default"];
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
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:core-js@0.9.18/library/fn/object/define-property.js", ["npm:core-js@0.9.18/library/modules/$.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var $ = require("npm:core-js@0.9.18/library/modules/$.js");
  module.exports = function defineProperty(it, key, desc) {
    return $.setDesc(it, key, desc);
  };
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:babel-runtime@5.8.35/helpers/class-call-check.js", [], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  "use strict";
  exports["default"] = function(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  };
  exports.__esModule = true;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:core-js@0.9.18/library/modules/core.iter-helpers.js", ["npm:core-js@0.9.18/library/modules/$.js", "npm:core-js@0.9.18/library/modules/$.iter.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var core = require("npm:core-js@0.9.18/library/modules/$.js").core,
      $iter = require("npm:core-js@0.9.18/library/modules/$.iter.js");
  core.isIterable = $iter.is;
  core.getIterator = $iter.get;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:core-js@0.9.18/library/modules/$.collection-strong.js", ["npm:core-js@0.9.18/library/modules/$.js", "npm:core-js@0.9.18/library/modules/$.ctx.js", "npm:core-js@0.9.18/library/modules/$.uid.js", "npm:core-js@0.9.18/library/modules/$.assert.js", "npm:core-js@0.9.18/library/modules/$.for-of.js", "npm:core-js@0.9.18/library/modules/$.iter.js", "npm:core-js@0.9.18/library/modules/$.mix.js", "npm:core-js@0.9.18/library/modules/$.iter-define.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var $ = require("npm:core-js@0.9.18/library/modules/$.js"),
      ctx = require("npm:core-js@0.9.18/library/modules/$.ctx.js"),
      safe = require("npm:core-js@0.9.18/library/modules/$.uid.js").safe,
      assert = require("npm:core-js@0.9.18/library/modules/$.assert.js"),
      forOf = require("npm:core-js@0.9.18/library/modules/$.for-of.js"),
      step = require("npm:core-js@0.9.18/library/modules/$.iter.js").step,
      $has = $.has,
      set = $.set,
      isObject = $.isObject,
      hide = $.hide,
      isExtensible = Object.isExtensible || isObject,
      ID = safe('id'),
      O1 = safe('O1'),
      LAST = safe('last'),
      FIRST = safe('first'),
      ITER = safe('iter'),
      SIZE = $.DESC ? safe('size') : 'size',
      id = 0;
  function fastKey(it, create) {
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
  }
  function getEntry(that, key) {
    var index = fastKey(key),
        entry;
    if (index !== 'F')
      return that[O1][index];
    for (entry = that[FIRST]; entry; entry = entry.n) {
      if (entry.k == key)
        return entry;
    }
  }
  module.exports = {
    getConstructor: function(wrapper, NAME, IS_MAP, ADDER) {
      var C = wrapper(function(that, iterable) {
        assert.inst(that, C, NAME);
        set(that, O1, $.create(null));
        set(that, SIZE, 0);
        set(that, LAST, undefined);
        set(that, FIRST, undefined);
        if (iterable != undefined)
          forOf(iterable, IS_MAP, that[ADDER], that);
      });
      require("npm:core-js@0.9.18/library/modules/$.mix.js")(C.prototype, {
        clear: function clear() {
          for (var that = this,
              data = that[O1],
              entry = that[FIRST]; entry; entry = entry.n) {
            entry.r = true;
            if (entry.p)
              entry.p = entry.p.n = undefined;
            delete data[entry.i];
          }
          that[FIRST] = that[LAST] = undefined;
          that[SIZE] = 0;
        },
        'delete': function(key) {
          var that = this,
              entry = getEntry(that, key);
          if (entry) {
            var next = entry.n,
                prev = entry.p;
            delete that[O1][entry.i];
            entry.r = true;
            if (prev)
              prev.n = next;
            if (next)
              next.p = prev;
            if (that[FIRST] == entry)
              that[FIRST] = next;
            if (that[LAST] == entry)
              that[LAST] = prev;
            that[SIZE]--;
          }
          return !!entry;
        },
        forEach: function forEach(callbackfn) {
          var f = ctx(callbackfn, arguments[1], 3),
              entry;
          while (entry = entry ? entry.n : this[FIRST]) {
            f(entry.v, entry.k, this);
            while (entry && entry.r)
              entry = entry.p;
          }
        },
        has: function has(key) {
          return !!getEntry(this, key);
        }
      });
      if ($.DESC)
        $.setDesc(C.prototype, 'size', {get: function() {
            return assert.def(this[SIZE]);
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
        that[LAST] = entry = {
          i: index = fastKey(key, true),
          k: key,
          v: value,
          p: prev = that[LAST],
          n: undefined,
          r: false
        };
        if (!that[FIRST])
          that[FIRST] = entry;
        if (prev)
          prev.n = entry;
        that[SIZE]++;
        if (index !== 'F')
          that[O1][index] = entry;
      }
      return that;
    },
    getEntry: getEntry,
    setIter: function(C, NAME, IS_MAP) {
      require("npm:core-js@0.9.18/library/modules/$.iter-define.js")(C, NAME, function(iterated, kind) {
        set(this, ITER, {
          o: iterated,
          k: kind
        });
      }, function() {
        var iter = this[ITER],
            kind = iter.k,
            entry = iter.l;
        while (entry && entry.r)
          entry = entry.p;
        if (!iter.o || !(iter.l = entry = entry ? entry.n : iter.o[FIRST])) {
          iter.o = undefined;
          return step(1);
        }
        if (kind == 'keys')
          return step(0, entry.k);
        if (kind == 'values')
          return step(0, entry.v);
        return step(0, [entry.k, entry.v]);
      }, IS_MAP ? 'entries' : 'values', !IS_MAP, true);
    }
  };
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:core-js@0.9.18/library/modules/$.collection.js", ["npm:core-js@0.9.18/library/modules/$.js", "npm:core-js@0.9.18/library/modules/$.def.js", "npm:core-js@0.9.18/library/modules/$.iter.js", "npm:core-js@0.9.18/library/modules/$.for-of.js", "npm:core-js@0.9.18/library/modules/$.assert.js", "npm:core-js@0.9.18/library/modules/$.uid.js", "npm:core-js@0.9.18/library/modules/$.mix.js", "npm:core-js@0.9.18/library/modules/$.cof.js", "npm:core-js@0.9.18/library/modules/$.species.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var $ = require("npm:core-js@0.9.18/library/modules/$.js"),
      $def = require("npm:core-js@0.9.18/library/modules/$.def.js"),
      $iter = require("npm:core-js@0.9.18/library/modules/$.iter.js"),
      BUGGY = $iter.BUGGY,
      forOf = require("npm:core-js@0.9.18/library/modules/$.for-of.js"),
      assertInstance = require("npm:core-js@0.9.18/library/modules/$.assert.js").inst,
      INTERNAL = require("npm:core-js@0.9.18/library/modules/$.uid.js").safe('internal');
  module.exports = function(NAME, wrapper, methods, common, IS_MAP, IS_WEAK) {
    var Base = $.g[NAME],
        C = Base,
        ADDER = IS_MAP ? 'set' : 'add',
        proto = C && C.prototype,
        O = {};
    if (!$.DESC || !$.isFunction(C) || !(IS_WEAK || !BUGGY && proto.forEach && proto.entries)) {
      C = common.getConstructor(wrapper, NAME, IS_MAP, ADDER);
      require("npm:core-js@0.9.18/library/modules/$.mix.js")(C.prototype, methods);
    } else {
      C = wrapper(function(target, iterable) {
        assertInstance(target, C, NAME);
        target[INTERNAL] = new Base;
        if (iterable != undefined)
          forOf(iterable, IS_MAP, target[ADDER], target);
      });
      $.each.call('add,clear,delete,forEach,get,has,set,keys,values,entries'.split(','), function(KEY) {
        var chain = KEY == 'add' || KEY == 'set';
        if (KEY in proto)
          $.hide(C.prototype, KEY, function(a, b) {
            var result = this[INTERNAL][KEY](a === 0 ? 0 : a, b);
            return chain ? this : result;
          });
      });
      if ('size' in proto)
        $.setDesc(C.prototype, 'size', {get: function() {
            return this[INTERNAL].size;
          }});
    }
    require("npm:core-js@0.9.18/library/modules/$.cof.js").set(C, NAME);
    O[NAME] = C;
    $def($def.G + $def.W + $def.F, O);
    require("npm:core-js@0.9.18/library/modules/$.species.js")(C);
    if (!IS_WEAK)
      common.setIter(C, NAME, IS_MAP);
    return C;
  };
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:core-js@0.9.18/library/modules/$.collection-to-json.js", ["npm:core-js@0.9.18/library/modules/$.def.js", "npm:core-js@0.9.18/library/modules/$.for-of.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var $def = require("npm:core-js@0.9.18/library/modules/$.def.js"),
      forOf = require("npm:core-js@0.9.18/library/modules/$.for-of.js");
  module.exports = function(NAME) {
    $def($def.P, NAME, {toJSON: function toJSON() {
        var arr = [];
        forOf(this, false, arr.push, arr);
        return arr;
      }});
  };
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/lodash.js", ["github:jspm/nodelibs-process@0.1.2.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  "format cjs";
  (function(process) {
    ;
    (function() {
      var undefined;
      var VERSION = '4.2.0';
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
      var LARGE_ARRAY_SIZE = 200;
      var LAZY_FILTER_FLAG = 1,
          LAZY_MAP_FLAG = 2,
          LAZY_WHILE_FLAG = 3;
      var FUNC_ERROR_TEXT = 'Expected a function';
      var HASH_UNDEFINED = '__lodash_hash_undefined__';
      var INFINITY = 1 / 0,
          MAX_SAFE_INTEGER = 9007199254740991,
          MAX_INTEGER = 1.7976931348623157e+308,
          NAN = 0 / 0;
      var MAX_ARRAY_LENGTH = 4294967295,
          MAX_ARRAY_INDEX = MAX_ARRAY_LENGTH - 1,
          HALF_MAX_ARRAY_LENGTH = MAX_ARRAY_LENGTH >>> 1;
      var PLACEHOLDER = '__lodash_placeholder__';
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
      var contextProps = ['Array', 'Date', 'Error', 'Float32Array', 'Float64Array', 'Function', 'Int8Array', 'Int16Array', 'Int32Array', 'Map', 'Math', 'Object', 'Reflect', 'RegExp', 'Set', 'String', 'Symbol', 'TypeError', 'Uint8Array', 'Uint8ClampedArray', 'Uint16Array', 'Uint32Array', 'WeakMap', '_', 'clearTimeout', 'isFinite', 'parseInt', 'setTimeout'];
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
      var freeExports = (objectTypes[typeof exports] && exports && !exports.nodeType) ? exports : null;
      var freeModule = (objectTypes[typeof module] && module && !module.nodeType) ? module : null;
      var freeGlobal = checkGlobal(freeExports && freeModule && typeof global == 'object' && global);
      var freeSelf = checkGlobal(objectTypes[typeof self] && self);
      var freeWindow = checkGlobal(objectTypes[typeof window] && window);
      var moduleExports = (freeModule && freeModule.exports === freeExports) ? freeExports : null;
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
            resIndex = -1,
            result = [];
        while (++index < length) {
          var value = array[index];
          if (predicate(value, index, array)) {
            result[++resIndex] = value;
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
            resIndex = -1,
            result = [];
        while (++index < length) {
          if (array[index] === placeholder) {
            array[index] = PLACEHOLDER;
            result[++resIndex] = index;
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
        var Reflect = context.Reflect,
            Symbol = context.Symbol,
            Uint8Array = context.Uint8Array,
            clearTimeout = context.clearTimeout,
            enumerate = Reflect ? Reflect.enumerate : undefined,
            getPrototypeOf = Object.getPrototypeOf,
            getOwnPropertySymbols = Object.getOwnPropertySymbols,
            iteratorSymbol = typeof(iteratorSymbol = Symbol && Symbol.iterator) == 'symbol' ? iteratorSymbol : undefined,
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
        var mapCtorString = Map ? funcToString.call(Map) : '',
            setCtorString = Set ? funcToString.call(Set) : '';
        var symbolProto = Symbol ? Symbol.prototype : undefined,
            symbolValueOf = Symbol ? symbolProto.valueOf : undefined,
            symbolToString = Symbol ? symbolProto.toString : undefined;
        var realNames = {};
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
          if ((!eq(objValue, value) || (eq(objValue, objectProto[key]) && !hasOwnProperty.call(object, key))) || (value === undefined && !(key in object))) {
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
        function baseClone(value, isDeep, customizer, key, object, stack) {
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
            if (tag == objectTag || tag == argsTag || (isFunc && !object)) {
              if (isHostObject(value)) {
                return object ? value : {};
              }
              result = initCloneObject(isFunc ? {} : value);
              if (!isDeep) {
                return copySymbols(value, baseAssign(result, value));
              }
            } else {
              return cloneableTags[tag] ? initCloneByTag(value, tag, isDeep) : (object ? value : {});
            }
          }
          stack || (stack = new Stack);
          var stacked = stack.get(value);
          if (stacked) {
            return stacked;
          }
          stack.set(value, result);
          (isArr ? arrayEach : baseForOwn)(value, function(subValue, key) {
            assignValue(result, key, baseClone(subValue, isDeep, customizer, key, value, stack));
          });
          return isArr ? result : copySymbols(value, result);
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
        var baseCreate = (function() {
          function object() {}
          return function(prototype) {
            if (isObject(prototype)) {
              object.prototype = prototype;
              var result = new object;
              object.prototype = undefined;
            }
            return result || {};
          };
        }());
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
        function baseFlatten(array, isDeep, isStrict, result) {
          result || (result = []);
          var index = -1,
              length = array.length;
          while (++index < length) {
            var value = array[index];
            if (isArrayLikeObject(value) && (isStrict || isArray(value) || isArguments(value))) {
              if (isDeep) {
                baseFlatten(value, isDeep, isStrict, result);
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
          path = isKey(path, object) ? [path + ''] : baseToPath(path);
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
              othLength = arrays.length,
              othIndex = othLength,
              caches = Array(othLength),
              result = [];
          while (othIndex--) {
            var array = arrays[othIndex];
            if (othIndex && iteratee) {
              array = arrayMap(array, baseUnary(iteratee));
            }
            caches[othIndex] = !comparator && (iteratee || array.length >= 120) ? new SetCache(othIndex && array) : undefined;
          }
          array = arrays[0];
          var index = -1,
              length = array.length,
              seen = caches[0];
          outer: while (++index < length) {
            var value = array[index],
                computed = iteratee ? iteratee(value) : value;
            if (!(seen ? cacheHas(seen, computed) : includes(result, computed, comparator))) {
              var othIndex = othLength;
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
            path = baseToPath(path);
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
            if (objTag == argsTag) {
              objTag = objectTag;
            } else if (objTag != objectTag) {
              objIsArr = isTypedArray(object);
            }
          }
          if (!othIsArr) {
            othTag = getTag(other);
            if (othTag == argsTag) {
              othTag = objectTag;
            } else if (othTag != objectTag) {
              othIsArr = isTypedArray(other);
            }
          }
          var objIsObj = objTag == objectTag && !isHostObject(object),
              othIsObj = othTag == objectTag && !isHostObject(other),
              isSameTag = objTag == othTag;
          if (isSameTag && !(objIsArr || objIsObj)) {
            return equalByTag(object, other, objTag, equalFunc, customizer, bitmask);
          }
          var isPartial = bitmask & PARTIAL_COMPARE_FLAG;
          if (!isPartial) {
            var objIsWrapped = objIsObj && hasOwnProperty.call(object, '__wrapped__'),
                othIsWrapped = othIsObj && hasOwnProperty.call(other, '__wrapped__');
            if (objIsWrapped || othIsWrapped) {
              return equalFunc(objIsWrapped ? object.value() : object, othIsWrapped ? other.value() : other, customizer, bitmask, stack);
            }
          }
          if (!isSameTag) {
            return false;
          }
          stack || (stack = new Stack);
          return (objIsArr ? equalArrays : equalObjects)(object, other, equalFunc, customizer, bitmask, stack);
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
          var newValue = customizer ? customizer(objValue, srcValue, (key + ''), object, source, stack) : undefined,
              isCommon = newValue === undefined;
          if (isCommon) {
            newValue = srcValue;
            if (isArray(srcValue) || isTypedArray(srcValue)) {
              if (isArray(objValue)) {
                newValue = srcIndex ? copyArray(objValue) : objValue;
              } else if (isArrayLikeObject(objValue)) {
                newValue = copyArray(objValue);
              } else {
                isCommon = false;
                newValue = baseClone(srcValue);
              }
            } else if (isPlainObject(srcValue) || isArguments(srcValue)) {
              if (isArguments(objValue)) {
                newValue = toPlainObject(objValue);
              } else if (!isObject(objValue) || (srcIndex && isFunction(objValue))) {
                isCommon = false;
                newValue = baseClone(srcValue);
              } else {
                newValue = srcIndex ? baseClone(objValue) : objValue;
              }
            } else {
              isCommon = false;
            }
          }
          stack.set(srcValue, newValue);
          if (isCommon) {
            mergeFunc(newValue, srcValue, srcIndex, customizer, stack);
          }
          assignMergeValue(object, key, newValue);
        }
        function baseOrderBy(collection, iteratees, orders) {
          var index = -1,
              toIteratee = getIteratee();
          iteratees = arrayMap(iteratees.length ? iteratees : Array(1), function(iteratee) {
            return toIteratee(iteratee);
          });
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
        function basePullAll(array, values) {
          return basePullAllBy(array, values);
        }
        function basePullAllBy(array, values, iteratee) {
          var index = -1,
              length = values.length,
              seen = array;
          if (iteratee) {
            seen = arrayMap(array, function(value) {
              return iteratee(value);
            });
          }
          while (++index < length) {
            var fromIndex = 0,
                value = values[index],
                computed = iteratee ? iteratee(value) : value;
            while ((fromIndex = baseIndexOf(seen, computed, fromIndex)) > -1) {
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
                var path = baseToPath(index),
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
          path = isKey(path, object) ? [path + ''] : baseToPath(path);
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
              resIndex = 0,
              result = [value];
          while (++index < length) {
            value = array[index], computed = iteratee ? iteratee(value) : value;
            if (!eq(computed, seen)) {
              seen = computed;
              result[++resIndex] = value;
            }
          }
          return result;
        }
        function baseToPath(value) {
          return isArray(value) ? value : stringToPath(value);
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
          path = isKey(path, object) ? [path + ''] : baseToPath(path);
          object = parent(object, path);
          var key = last(path);
          return (object != null && has(object, key)) ? delete object[key] : true;
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
        function cloneBuffer(buffer) {
          var Ctor = buffer.constructor,
              result = new Ctor(buffer.byteLength),
              view = new Uint8Array(result);
          view.set(new Uint8Array(buffer));
          return result;
        }
        function cloneMap(map) {
          var Ctor = map.constructor;
          return arrayReduce(mapToArray(map), addMapEntry, new Ctor);
        }
        function cloneRegExp(regexp) {
          var Ctor = regexp.constructor,
              result = new Ctor(regexp.source, reFlags.exec(regexp));
          result.lastIndex = regexp.lastIndex;
          return result;
        }
        function cloneSet(set) {
          var Ctor = set.constructor;
          return arrayReduce(setToArray(set), addSetEntry, new Ctor);
        }
        function cloneSymbol(symbol) {
          return Symbol ? Object(symbolValueOf.call(symbol)) : {};
        }
        function cloneTypedArray(typedArray, isDeep) {
          var buffer = typedArray.buffer,
              Ctor = typedArray.constructor;
          return new Ctor(isDeep ? cloneBuffer(buffer) : buffer, typedArray.byteOffset, typedArray.length);
        }
        function composeArgs(args, partials, holders) {
          var holdersLength = holders.length,
              argsIndex = -1,
              argsLength = nativeMax(args.length - holdersLength, 0),
              leftIndex = -1,
              leftLength = partials.length,
              result = Array(leftLength + argsLength);
          while (++leftIndex < leftLength) {
            result[leftIndex] = partials[leftIndex];
          }
          while (++argsIndex < holdersLength) {
            result[holders[argsIndex]] = args[argsIndex];
          }
          while (argsLength--) {
            result[leftIndex++] = args[argsIndex++];
          }
          return result;
        }
        function composeArgsRight(args, partials, holders) {
          var holdersIndex = -1,
              holdersLength = holders.length,
              argsIndex = -1,
              argsLength = nativeMax(args.length - holdersLength, 0),
              rightIndex = -1,
              rightLength = partials.length,
              result = Array(argsLength + rightLength);
          while (++argsIndex < argsLength) {
            result[argsIndex] = args[argsIndex];
          }
          var offset = argsIndex;
          while (++rightIndex < rightLength) {
            result[offset + rightIndex] = partials[rightIndex];
          }
          while (++holdersIndex < holdersLength) {
            result[offset + holders[holdersIndex]] = args[argsIndex++];
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
            var key = props[index],
                newValue = customizer ? customizer(object[key], source[key], key, object, source) : source[key];
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
            var strSymbols = reHasComplexSymbol.test(string) ? stringToArray(string) : undefined,
                chr = strSymbols ? strSymbols[0] : string.charAt(0),
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
                index = length,
                args = Array(length),
                fn = (this && this !== root && this instanceof wrapper) ? Ctor : func,
                placeholder = wrapper.placeholder;
            while (index--) {
              args[index] = arguments[index];
            }
            var holders = (length < 3 && args[0] !== placeholder && args[length - 1] !== placeholder) ? [] : replaceHolders(args, placeholder);
            length -= holders.length;
            return length < arity ? createRecurryWrapper(func, bitmask, createHybridWrapper, placeholder, undefined, args, holders, undefined, undefined, arity - length) : apply(fn, this, args);
          }
          return wrapper;
        }
        function createFlow(fromRight) {
          return rest(function(funcs) {
            funcs = baseFlatten(funcs);
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
              isCurry = bitmask & CURRY_FLAG,
              isCurryRight = bitmask & CURRY_RIGHT_FLAG,
              isFlip = bitmask & FLIP_FLAG,
              Ctor = isBindKey ? undefined : createCtorWrapper(func);
          function wrapper() {
            var length = arguments.length,
                index = length,
                args = Array(length);
            while (index--) {
              args[index] = arguments[index];
            }
            if (partials) {
              args = composeArgs(args, partials, holders);
            }
            if (partialsRight) {
              args = composeArgsRight(args, partialsRight, holdersRight);
            }
            if (isCurry || isCurryRight) {
              var placeholder = wrapper.placeholder,
                  argsHolders = replaceHolders(args, placeholder);
              length -= argsHolders.length;
              if (length < arity) {
                return createRecurryWrapper(func, bitmask, createHybridWrapper, placeholder, thisArg, args, argsHolders, argPos, ary, arity - length);
              }
            }
            var thisBinding = isBind ? thisArg : this,
                fn = isBindKey ? thisBinding[func] : func;
            if (argPos) {
              args = reorder(args, argPos);
            } else if (isFlip && args.length > 1) {
              args.reverse();
            }
            if (isAry && ary < args.length) {
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
            iteratees = arrayMap(baseFlatten(iteratees), getIteratee());
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
              newsHolders = isCurry ? holders : undefined,
              newHoldersRight = isCurry ? undefined : holders,
              newPartials = isCurry ? partials : undefined,
              newPartialsRight = isCurry ? undefined : partials;
          bitmask |= (isCurry ? PARTIAL_FLAG : PARTIAL_RIGHT_FLAG);
          bitmask &= ~(isCurry ? PARTIAL_RIGHT_FLAG : PARTIAL_FLAG);
          if (!(bitmask & CURRY_BOUND_FLAG)) {
            bitmask &= ~(BIND_FLAG | BIND_KEY_FLAG);
          }
          var newData = [func, bitmask, thisArg, newPartials, newsHolders, newPartialsRight, newHoldersRight, newArgPos, ary, arity],
              result = wrapFunc.apply(undefined, newData);
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
          var data = isBindKey ? undefined : getData(func),
              newData = [func, bitmask, thisArg, partials, holders, partialsRight, holdersRight, argPos, ary, arity];
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
        function equalByTag(object, other, tag, equalFunc, customizer, bitmask) {
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
              return (isPartial || object.size == other.size) && equalFunc(convert(object), convert(other), customizer, bitmask | UNORDERED_COMPARE_FLAG);
            case symbolTag:
              return !!Symbol && (symbolValueOf.call(object) == symbolValueOf.call(other));
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
          var value = object == null ? undefined : object[key];
          return isNative(value) ? value : undefined;
        }
        var getSymbols = getOwnPropertySymbols || function() {
          return [];
        };
        function getTag(value) {
          return objectToString.call(value);
        }
        if ((Map && getTag(new Map) != mapTag) || (Set && getTag(new Set) != setTag)) {
          getTag = function(value) {
            var result = objectToString.call(value),
                Ctor = result == objectTag ? value.constructor : null,
                ctorString = typeof Ctor == 'function' ? funcToString.call(Ctor) : '';
            if (ctorString) {
              if (ctorString == mapCtorString) {
                return mapTag;
              }
              if (ctorString == setCtorString) {
                return setTag;
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
            path = baseToPath(path);
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
          if (isPrototype(object)) {
            return {};
          }
          var Ctor = object.constructor;
          return baseCreate(isFunction(Ctor) ? Ctor.prototype : undefined);
        }
        function initCloneByTag(object, tag, isDeep) {
          var Ctor = object.constructor;
          switch (tag) {
            case arrayBufferTag:
              return cloneBuffer(object);
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
          return type == 'number' || type == 'boolean' || (type == 'string' && value !== '__proto__') || value == null;
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
          var isCombo = (srcBitmask == ARY_FLAG && (bitmask == CURRY_FLAG)) || (srcBitmask == ARY_FLAG && (bitmask == REARG_FLAG) && (data[7].length <= source[8])) || (srcBitmask == (ARY_FLAG | REARG_FLAG) && (source[7].length <= source[8]) && (bitmask == CURRY_FLAG));
          if (!(isCommon || isCombo)) {
            return data;
          }
          if (srcBitmask & BIND_FLAG) {
            data[2] = source[2];
            newBitmask |= (bitmask & BIND_FLAG) ? 0 : CURRY_BOUND_FLAG;
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
            stack.set(srcValue, objValue);
            baseMerge(objValue, srcValue, undefined, mergeDefaults, stack);
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
        function toArrayLikeObject(value) {
          return isArrayLikeObject(value) ? value : [];
        }
        function toFunction(value) {
          return typeof value == 'function' ? value : identity;
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
              resIndex = -1,
              result = Array(nativeCeil(length / size));
          while (index < length) {
            result[++resIndex] = baseSlice(array, index, (index += size));
          }
          return result;
        }
        function compact(array) {
          var index = -1,
              length = array ? array.length : 0,
              resIndex = -1,
              result = [];
          while (++index < length) {
            var value = array[index];
            if (value) {
              result[++resIndex] = value;
            }
          }
          return result;
        }
        var concat = rest(function(array, values) {
          if (!isArray(array)) {
            array = array == null ? [] : [Object(array)];
          }
          values = baseFlatten(values);
          return arrayConcat(array, values);
        });
        var difference = rest(function(array, values) {
          return isArrayLikeObject(array) ? baseDifference(array, baseFlatten(values, false, true)) : [];
        });
        var differenceBy = rest(function(array, values) {
          var iteratee = last(values);
          if (isArrayLikeObject(iteratee)) {
            iteratee = undefined;
          }
          return isArrayLikeObject(array) ? baseDifference(array, baseFlatten(values, false, true), getIteratee(iteratee)) : [];
        });
        var differenceWith = rest(function(array, values) {
          var comparator = last(values);
          if (isArrayLikeObject(comparator)) {
            comparator = undefined;
          }
          return isArrayLikeObject(array) ? baseDifference(array, baseFlatten(values, false, true), undefined, comparator) : [];
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
          return length ? baseFlatten(array) : [];
        }
        function flattenDeep(array) {
          var length = array ? array.length : 0;
          return length ? baseFlatten(array, true) : [];
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
          var mapped = arrayMap(arrays, toArrayLikeObject);
          return (mapped.length && mapped[0] === arrays[0]) ? baseIntersection(mapped) : [];
        });
        var intersectionBy = rest(function(arrays) {
          var iteratee = last(arrays),
              mapped = arrayMap(arrays, toArrayLikeObject);
          if (iteratee === last(mapped)) {
            iteratee = undefined;
          } else {
            mapped.pop();
          }
          return (mapped.length && mapped[0] === arrays[0]) ? baseIntersection(mapped, getIteratee(iteratee)) : [];
        });
        var intersectionWith = rest(function(arrays) {
          var comparator = last(arrays),
              mapped = arrayMap(arrays, toArrayLikeObject);
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
          return (array && array.length && values && values.length) ? basePullAllBy(array, values, getIteratee(iteratee)) : array;
        }
        var pullAt = rest(function(array, indexes) {
          indexes = arrayMap(baseFlatten(indexes), String);
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
          return baseUniq(baseFlatten(arrays, false, true));
        });
        var unionBy = rest(function(arrays) {
          var iteratee = last(arrays);
          if (isArrayLikeObject(iteratee)) {
            iteratee = undefined;
          }
          return baseUniq(baseFlatten(arrays, false, true), getIteratee(iteratee));
        });
        var unionWith = rest(function(arrays) {
          var comparator = last(arrays);
          if (isArrayLikeObject(comparator)) {
            comparator = undefined;
          }
          return baseUniq(baseFlatten(arrays, false, true), undefined, comparator);
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
          paths = baseFlatten(paths);
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
          return baseFlatten(map(collection, iteratee));
        }
        function forEach(collection, iteratee) {
          return (typeof iteratee == 'function' && isArray(collection)) ? arrayEach(collection, iteratee) : baseEach(collection, toFunction(iteratee));
        }
        function forEachRight(collection, iteratee) {
          return (typeof iteratee == 'function' && isArray(collection)) ? arrayEachRight(collection, iteratee) : baseEachRight(collection, toFunction(iteratee));
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
          return baseOrderBy(collection, baseFlatten(iteratees), []);
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
            var holders = replaceHolders(partials, bind.placeholder);
            bitmask |= PARTIAL_FLAG;
          }
          return createWrapper(func, bitmask, thisArg, partials, holders);
        });
        var bindKey = rest(function(object, key, partials) {
          var bitmask = BIND_FLAG | BIND_KEY_FLAG;
          if (partials.length) {
            var holders = replaceHolders(partials, bindKey.placeholder);
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
              if (!maxTimeoutId && !leading) {
                lastCalled = stamp;
              }
              var remaining = maxWait - (stamp - lastCalled),
                  isCalled = remaining <= 0 || remaining > maxWait;
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
          transforms = arrayMap(baseFlatten(transforms), getIteratee());
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
          var holders = replaceHolders(partials, partial.placeholder);
          return createWrapper(func, PARTIAL_FLAG, undefined, partials, holders);
        });
        var partialRight = rest(function(func, partials) {
          var holders = replaceHolders(partials, partialRight.placeholder);
          return createWrapper(func, PARTIAL_RIGHT_FLAG, undefined, partials, holders);
        });
        var rearg = rest(function(func, indexes) {
          return createWrapper(func, REARG_FLAG, undefined, undefined, undefined, baseFlatten(indexes));
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
        function clone(value) {
          return baseClone(value);
        }
        function cloneWith(value, customizer) {
          return baseClone(value, false, customizer);
        }
        function cloneDeep(value) {
          return baseClone(value, true);
        }
        function cloneDeepWith(value, customizer) {
          return baseClone(value, true, customizer);
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
        function isArrayLike(value) {
          return value != null && !(typeof value == 'function' && isFunction(value)) && isLength(getLength(value));
        }
        function isArrayLikeObject(value) {
          return isObjectLike(value) && isArrayLike(value);
        }
        function isBoolean(value) {
          return value === true || value === false || (isObjectLike(value) && objectToString.call(value) == boolTag);
        }
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
          return isObjectLike(value) && typeof value.message == 'string' && objectToString.call(value) == errorTag;
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
          var proto = objectProto;
          if (typeof value.constructor == 'function') {
            proto = getPrototypeOf(value);
          }
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
            return Symbol ? symbolToString.call(value) : '';
          }
          var result = (value + '');
          return (result == '0' && (1 / value) == -INFINITY) ? '-0' : result;
        }
        var assign = createAssigner(function(object, source) {
          copyObject(source, keys(source), object);
        });
        var assignIn = createAssigner(function(object, source) {
          copyObject(source, keysIn(source), object);
        });
        var assignInWith = createAssigner(function(object, source, srcIndex, customizer) {
          copyObjectWith(source, keysIn(source), object, customizer);
        });
        var assignWith = createAssigner(function(object, source, srcIndex, customizer) {
          copyObjectWith(source, keys(source), object, customizer);
        });
        var at = rest(function(object, paths) {
          return baseAt(object, baseFlatten(paths));
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
          return object == null ? object : baseFor(object, toFunction(iteratee), keysIn);
        }
        function forInRight(object, iteratee) {
          return object == null ? object : baseForRight(object, toFunction(iteratee), keysIn);
        }
        function forOwn(object, iteratee) {
          return object && baseForOwn(object, toFunction(iteratee));
        }
        function forOwnRight(object, iteratee) {
          return object && baseForOwnRight(object, toFunction(iteratee));
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
          props = arrayMap(baseFlatten(props), String);
          return basePick(object, baseDifference(keysIn(object), props));
        });
        function omitBy(object, predicate) {
          predicate = getIteratee(predicate, 2);
          return basePickBy(object, function(value, key) {
            return !predicate(value, key);
          });
        }
        var pick = rest(function(object, props) {
          return object == null ? {} : basePick(object, baseFlatten(props));
        });
        function pickBy(object, predicate) {
          return object == null ? {} : basePickBy(object, getIteratee(predicate, 2));
        }
        function result(object, path, defaultValue) {
          if (!isKey(path, object)) {
            path = baseToPath(path);
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
                accumulator = baseCreate(isFunction(Ctor) ? Ctor.prototype : undefined);
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
        function values(object) {
          return object ? baseValues(object, keys(object)) : [];
        }
        function valuesIn(object) {
          return object == null ? baseValues(object, keysIn(object)) : [];
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
            return isObject(e) ? e : new Error(e);
          }
        });
        var bindAll = rest(function(object, methodNames) {
          arrayEach(baseFlatten(methodNames), function(key) {
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
          iteratee = toFunction(iteratee);
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
        lodash.isArrayLike = isArrayLike;
        lodash.isArrayLikeObject = isArrayLikeObject;
        lodash.isBoolean = isBoolean;
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
        lodash.isString = isString;
        lodash.isSymbol = isSymbol;
        lodash.isTypedArray = isTypedArray;
        lodash.isUndefined = isUndefined;
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
  })(require("github:jspm/nodelibs-process@0.1.2.js"));
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:eventemitter3@1.1.1/index.js", [], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  'use strict';
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
  global.define = __define;
  return module.exports;
});

(function() {
var _removeDefine = System.get("@@amd-helpers").createDefine();
define("Worker/xmljs.js", ["require"], function(require) {
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

_removeDefine();
})();
System.registerDynamic("npm:events@1.0.2/events.js", [], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
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
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:inherits@2.0.1/inherits_browser.js", [], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
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
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:isarray@0.0.1/index.js", [], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = Array.isArray || function(arr) {
    return Object.prototype.toString.call(arr) == '[object Array]';
  };
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:base64-js@0.0.8/lib/b64.js", [], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
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
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:ieee754@1.1.6/index.js", [], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
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
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:is-array@1.0.1/index.js", [], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var isArray = Array.isArray;
  var str = Object.prototype.toString;
  module.exports = isArray || function(val) {
    return !!val && '[object Array]' == str.call(val);
  };
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:core-util-is@1.0.2/lib/util.js", ["github:jspm/nodelibs-buffer@0.1.0.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
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
  })(require("github:jspm/nodelibs-buffer@0.1.0.js").Buffer);
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:readable-stream@1.1.13/lib/_stream_writable.js", ["github:jspm/nodelibs-buffer@0.1.0.js", "npm:core-util-is@1.0.2.js", "npm:inherits@2.0.1.js", "npm:stream-browserify@1.0.0/index.js", "npm:readable-stream@1.1.13/lib/_stream_duplex.js", "npm:readable-stream@1.1.13/lib/_stream_duplex.js", "github:jspm/nodelibs-buffer@0.1.0.js", "github:jspm/nodelibs-process@0.1.2.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  (function(Buffer, process) {
    module.exports = Writable;
    var Buffer = require("github:jspm/nodelibs-buffer@0.1.0.js").Buffer;
    Writable.WritableState = WritableState;
    var util = require("npm:core-util-is@1.0.2.js");
    util.inherits = require("npm:inherits@2.0.1.js");
    var Stream = require("npm:stream-browserify@1.0.0/index.js");
    util.inherits(Writable, Stream);
    function WriteReq(chunk, encoding, cb) {
      this.chunk = chunk;
      this.encoding = encoding;
      this.callback = cb;
    }
    function WritableState(options, stream) {
      var Duplex = require("npm:readable-stream@1.1.13/lib/_stream_duplex.js");
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
      var Duplex = require("npm:readable-stream@1.1.13/lib/_stream_duplex.js");
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
  })(require("github:jspm/nodelibs-buffer@0.1.0.js").Buffer, require("github:jspm/nodelibs-process@0.1.2.js"));
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:string_decoder@0.10.31/index.js", ["github:jspm/nodelibs-buffer@0.1.0.js", "github:jspm/nodelibs-buffer@0.1.0.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  (function(Buffer) {
    var Buffer = require("github:jspm/nodelibs-buffer@0.1.0.js").Buffer;
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
  })(require("github:jspm/nodelibs-buffer@0.1.0.js").Buffer);
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:readable-stream@1.1.13/lib/_stream_transform.js", ["npm:readable-stream@1.1.13/lib/_stream_duplex.js", "npm:core-util-is@1.0.2.js", "npm:inherits@2.0.1.js", "github:jspm/nodelibs-process@0.1.2.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  (function(process) {
    module.exports = Transform;
    var Duplex = require("npm:readable-stream@1.1.13/lib/_stream_duplex.js");
    var util = require("npm:core-util-is@1.0.2.js");
    util.inherits = require("npm:inherits@2.0.1.js");
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
  })(require("github:jspm/nodelibs-process@0.1.2.js"));
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:readable-stream@1.1.13/lib/_stream_passthrough.js", ["npm:readable-stream@1.1.13/lib/_stream_transform.js", "npm:core-util-is@1.0.2.js", "npm:inherits@2.0.1.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = PassThrough;
  var Transform = require("npm:readable-stream@1.1.13/lib/_stream_transform.js");
  var util = require("npm:core-util-is@1.0.2.js");
  util.inherits = require("npm:inherits@2.0.1.js");
  util.inherits(PassThrough, Transform);
  function PassThrough(options) {
    if (!(this instanceof PassThrough))
      return new PassThrough(options);
    Transform.call(this, options);
  }
  PassThrough.prototype._transform = function(chunk, encoding, cb) {
    cb(null, chunk);
  };
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:readable-stream@1.1.13/writable.js", ["npm:readable-stream@1.1.13/lib/_stream_writable.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = require("npm:readable-stream@1.1.13/lib/_stream_writable.js");
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:readable-stream@1.1.13/duplex.js", ["npm:readable-stream@1.1.13/lib/_stream_duplex.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = require("npm:readable-stream@1.1.13/lib/_stream_duplex.js");
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:readable-stream@1.1.13/transform.js", ["npm:readable-stream@1.1.13/lib/_stream_transform.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = require("npm:readable-stream@1.1.13/lib/_stream_transform.js");
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:readable-stream@1.1.13/passthrough.js", ["npm:readable-stream@1.1.13/lib/_stream_passthrough.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = require("npm:readable-stream@1.1.13/lib/_stream_passthrough.js");
  global.define = __define;
  return module.exports;
});

System.registerDynamic("github:jspm/nodelibs-string_decoder@0.1.0/index.js", ["npm:string_decoder@0.10.31.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = System._nodeRequire ? System._nodeRequire('string_decoder') : require("npm:string_decoder@0.10.31.js");
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/eq.js", [], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  function eq(value, other) {
    return value === other || (value !== value && other !== other);
  }
  module.exports = eq;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/_baseProperty.js", [], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  function baseProperty(key) {
    return function(object) {
      return object == null ? undefined : object[key];
    };
  }
  module.exports = baseProperty;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/isObject.js", [], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  function isObject(value) {
    var type = typeof value;
    return !!value && (type == 'object' || type == 'function');
  }
  module.exports = isObject;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/isLength.js", [], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var MAX_SAFE_INTEGER = 9007199254740991;
  function isLength(value) {
    return typeof value == 'number' && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
  }
  module.exports = isLength;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/_isIndex.js", [], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var MAX_SAFE_INTEGER = 9007199254740991;
  var reIsUint = /^(?:0|[1-9]\d*)$/;
  function isIndex(value, length) {
    value = (typeof value == 'number' || reIsUint.test(value)) ? +value : -1;
    length = length == null ? MAX_SAFE_INTEGER : length;
    return value > -1 && value % 1 == 0 && value < length;
  }
  module.exports = isIndex;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/_apply.js", [], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
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
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/toNumber.js", ["npm:lodash@4.2.0/isFunction.js", "npm:lodash@4.2.0/isObject.js", "github:jspm/nodelibs-process@0.1.2.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  (function(process) {
    var isFunction = require("npm:lodash@4.2.0/isFunction.js"),
        isObject = require("npm:lodash@4.2.0/isObject.js");
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
  })(require("github:jspm/nodelibs-process@0.1.2.js"));
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/_baseHas.js", [], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var objectProto = Object.prototype;
  var hasOwnProperty = objectProto.hasOwnProperty;
  var getPrototypeOf = Object.getPrototypeOf;
  function baseHas(object, key) {
    return hasOwnProperty.call(object, key) || (typeof object == 'object' && key in object && getPrototypeOf(object) === null);
  }
  module.exports = baseHas;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/_baseKeys.js", [], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var nativeKeys = Object.keys;
  function baseKeys(object) {
    return nativeKeys(Object(object));
  }
  module.exports = baseKeys;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/_baseTimes.js", [], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  function baseTimes(n, iteratee) {
    var index = -1,
        result = Array(n);
    while (++index < n) {
      result[index] = iteratee(index);
    }
    return result;
  }
  module.exports = baseTimes;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/isObjectLike.js", [], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  function isObjectLike(value) {
    return !!value && typeof value == 'object';
  }
  module.exports = isObjectLike;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/isArray.js", [], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var isArray = Array.isArray;
  module.exports = isArray;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/isString.js", ["npm:lodash@4.2.0/isArray.js", "npm:lodash@4.2.0/isObjectLike.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var isArray = require("npm:lodash@4.2.0/isArray.js"),
      isObjectLike = require("npm:lodash@4.2.0/isObjectLike.js");
  var stringTag = '[object String]';
  var objectProto = Object.prototype;
  var objectToString = objectProto.toString;
  function isString(value) {
    return typeof value == 'string' || (!isArray(value) && isObjectLike(value) && objectToString.call(value) == stringTag);
  }
  module.exports = isString;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/_isPrototype.js", [], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var objectProto = Object.prototype;
  function isPrototype(value) {
    var Ctor = value && value.constructor,
        proto = (typeof Ctor == 'function' && Ctor.prototype) || objectProto;
    return value === proto;
  }
  module.exports = isPrototype;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:xmlbuilder@4.2.1/lib/XMLStringifier.js", ["github:jspm/nodelibs-process@0.1.2.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
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
  })(require("github:jspm/nodelibs-process@0.1.2.js"));
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/_baseAssign.js", ["npm:lodash@4.2.0/_copyObject.js", "npm:lodash@4.2.0/keys.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var copyObject = require("npm:lodash@4.2.0/_copyObject.js"),
      keys = require("npm:lodash@4.2.0/keys.js");
  function baseAssign(object, source) {
    return object && copyObject(source, keys(source), object);
  }
  module.exports = baseAssign;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/_baseCreate.js", ["npm:lodash@4.2.0/isObject.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var isObject = require("npm:lodash@4.2.0/isObject.js");
  var baseCreate = (function() {
    function object() {}
    return function(prototype) {
      if (isObject(prototype)) {
        object.prototype = prototype;
        var result = new object;
        object.prototype = undefined;
      }
      return result || {};
    };
  }());
  module.exports = baseCreate;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/isEmpty.js", ["npm:lodash@4.2.0/isArguments.js", "npm:lodash@4.2.0/isArray.js", "npm:lodash@4.2.0/isArrayLike.js", "npm:lodash@4.2.0/isFunction.js", "npm:lodash@4.2.0/isString.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var isArguments = require("npm:lodash@4.2.0/isArguments.js"),
      isArray = require("npm:lodash@4.2.0/isArray.js"),
      isArrayLike = require("npm:lodash@4.2.0/isArrayLike.js"),
      isFunction = require("npm:lodash@4.2.0/isFunction.js"),
      isString = require("npm:lodash@4.2.0/isString.js");
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
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/_arrayEvery.js", [], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
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
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/_createBaseFor.js", [], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
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
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/_createBaseEach.js", ["npm:lodash@4.2.0/isArrayLike.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var isArrayLike = require("npm:lodash@4.2.0/isArrayLike.js");
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
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/_stackClear.js", [], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  function stackClear() {
    this.__data__ = {
      'array': [],
      'map': null
    };
  }
  module.exports = stackClear;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/_assocIndexOf.js", ["npm:lodash@4.2.0/eq.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var eq = require("npm:lodash@4.2.0/eq.js");
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
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/_assocGet.js", ["npm:lodash@4.2.0/_assocIndexOf.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var assocIndexOf = require("npm:lodash@4.2.0/_assocIndexOf.js");
  function assocGet(array, key) {
    var index = assocIndexOf(array, key);
    return index < 0 ? undefined : array[index][1];
  }
  module.exports = assocGet;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/_assocHas.js", ["npm:lodash@4.2.0/_assocIndexOf.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var assocIndexOf = require("npm:lodash@4.2.0/_assocIndexOf.js");
  function assocHas(array, key) {
    return assocIndexOf(array, key) > -1;
  }
  module.exports = assocHas;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/_isHostObject.js", [], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
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
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/_checkGlobal.js", [], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  function checkGlobal(value) {
    return (value && value.Object === Object) ? value : null;
  }
  module.exports = checkGlobal;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/_hashHas.js", ["npm:lodash@4.2.0/_nativeCreate.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var nativeCreate = require("npm:lodash@4.2.0/_nativeCreate.js");
  var objectProto = Object.prototype;
  var hasOwnProperty = objectProto.hasOwnProperty;
  function hashHas(hash, key) {
    return nativeCreate ? hash[key] !== undefined : hasOwnProperty.call(hash, key);
  }
  module.exports = hashHas;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/_isKeyable.js", [], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  function isKeyable(value) {
    var type = typeof value;
    return type == 'number' || type == 'boolean' || (type == 'string' && value !== '__proto__') || value == null;
  }
  module.exports = isKeyable;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/_hashGet.js", ["npm:lodash@4.2.0/_nativeCreate.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var nativeCreate = require("npm:lodash@4.2.0/_nativeCreate.js");
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
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/_mapHas.js", ["npm:lodash@4.2.0/_Map.js", "npm:lodash@4.2.0/_assocHas.js", "npm:lodash@4.2.0/_hashHas.js", "npm:lodash@4.2.0/_isKeyable.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var Map = require("npm:lodash@4.2.0/_Map.js"),
      assocHas = require("npm:lodash@4.2.0/_assocHas.js"),
      hashHas = require("npm:lodash@4.2.0/_hashHas.js"),
      isKeyable = require("npm:lodash@4.2.0/_isKeyable.js");
  function mapHas(key) {
    var data = this.__data__;
    if (isKeyable(key)) {
      return hashHas(typeof key == 'string' ? data.string : data.hash, key);
    }
    return Map ? data.map.has(key) : assocHas(data.map, key);
  }
  module.exports = mapHas;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/_assocSet.js", ["npm:lodash@4.2.0/_assocIndexOf.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var assocIndexOf = require("npm:lodash@4.2.0/_assocIndexOf.js");
  function assocSet(array, key, value) {
    var index = assocIndexOf(array, key);
    if (index < 0) {
      array.push([key, value]);
    } else {
      array[index][1] = value;
    }
  }
  module.exports = assocSet;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/_hashSet.js", ["npm:lodash@4.2.0/_nativeCreate.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var nativeCreate = require("npm:lodash@4.2.0/_nativeCreate.js");
  var HASH_UNDEFINED = '__lodash_hash_undefined__';
  function hashSet(hash, key, value) {
    hash[key] = (nativeCreate && value === undefined) ? HASH_UNDEFINED : value;
  }
  module.exports = hashSet;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/_arraySome.js", [], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
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
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/_Symbol.js", ["npm:lodash@4.2.0/_root.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var root = require("npm:lodash@4.2.0/_root.js");
  var Symbol = root.Symbol;
  module.exports = Symbol;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/_Uint8Array.js", ["npm:lodash@4.2.0/_root.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var root = require("npm:lodash@4.2.0/_root.js");
  var Uint8Array = root.Uint8Array;
  module.exports = Uint8Array;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/_mapToArray.js", [], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  function mapToArray(map) {
    var index = -1,
        result = Array(map.size);
    map.forEach(function(value, key) {
      result[++index] = [key, value];
    });
    return result;
  }
  module.exports = mapToArray;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/_setToArray.js", [], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  function setToArray(set) {
    var index = -1,
        result = Array(set.size);
    set.forEach(function(value) {
      result[++index] = value;
    });
    return result;
  }
  module.exports = setToArray;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/_equalObjects.js", ["npm:lodash@4.2.0/_baseHas.js", "npm:lodash@4.2.0/keys.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var baseHas = require("npm:lodash@4.2.0/_baseHas.js"),
      keys = require("npm:lodash@4.2.0/keys.js");
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
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/_Set.js", ["npm:lodash@4.2.0/_getNative.js", "npm:lodash@4.2.0/_root.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var getNative = require("npm:lodash@4.2.0/_getNative.js"),
      root = require("npm:lodash@4.2.0/_root.js");
  var Set = getNative(root, 'Set');
  module.exports = Set;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/isTypedArray.js", ["npm:lodash@4.2.0/isLength.js", "npm:lodash@4.2.0/isObjectLike.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var isLength = require("npm:lodash@4.2.0/isLength.js"),
      isObjectLike = require("npm:lodash@4.2.0/isObjectLike.js");
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
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/_isStrictComparable.js", ["npm:lodash@4.2.0/isObject.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var isObject = require("npm:lodash@4.2.0/isObject.js");
  function isStrictComparable(value) {
    return value === value && !isObject(value);
  }
  module.exports = isStrictComparable;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/_arrayMap.js", [], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
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
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/isSymbol.js", ["npm:lodash@4.2.0/isObjectLike.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var isObjectLike = require("npm:lodash@4.2.0/isObjectLike.js");
  var symbolTag = '[object Symbol]';
  var objectProto = Object.prototype;
  var objectToString = objectProto.toString;
  function isSymbol(value) {
    return typeof value == 'symbol' || (isObjectLike(value) && objectToString.call(value) == symbolTag);
  }
  module.exports = isSymbol;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/_isKey.js", ["npm:lodash@4.2.0/isArray.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var isArray = require("npm:lodash@4.2.0/isArray.js");
  var reIsDeepProp = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/,
      reIsPlainProp = /^\w*$/;
  function isKey(value, object) {
    if (typeof value == 'number') {
      return true;
    }
    return !isArray(value) && (reIsPlainProp.test(value) || !reIsDeepProp.test(value) || (object != null && value in Object(object)));
  }
  module.exports = isKey;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/_baseHasIn.js", [], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  function baseHasIn(object, key) {
    return key in Object(object);
  }
  module.exports = baseHasIn;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/last.js", [], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  function last(array) {
    var length = array ? array.length : 0;
    return length ? array[length - 1] : undefined;
  }
  module.exports = last;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/_baseSlice.js", [], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
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
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/identity.js", [], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  function identity(value) {
    return value;
  }
  module.exports = identity;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/_basePropertyDeep.js", ["npm:lodash@4.2.0/_baseGet.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var baseGet = require("npm:lodash@4.2.0/_baseGet.js");
  function basePropertyDeep(path) {
    return function(object) {
      return baseGet(object, path);
    };
  }
  module.exports = basePropertyDeep;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:xmlbuilder@4.2.1/lib/XMLAttribute.js", ["npm:lodash@4.2.0/create.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  (function() {
    var XMLAttribute,
        create;
    create = require("npm:lodash@4.2.0/create.js");
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
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:xmlbuilder@4.2.1/lib/XMLProcessingInstruction.js", ["npm:lodash@4.2.0/create.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  (function() {
    var XMLProcessingInstruction,
        create;
    create = require("npm:lodash@4.2.0/create.js");
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
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:xmlbuilder@4.2.1/lib/XMLCData.js", ["npm:lodash@4.2.0/create.js", "npm:xmlbuilder@4.2.1/lib/XMLNode.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
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
    create = require("npm:lodash@4.2.0/create.js");
    XMLNode = require("npm:xmlbuilder@4.2.1/lib/XMLNode.js");
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
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:xmlbuilder@4.2.1/lib/XMLComment.js", ["npm:lodash@4.2.0/create.js", "npm:xmlbuilder@4.2.1/lib/XMLNode.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
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
    create = require("npm:lodash@4.2.0/create.js");
    XMLNode = require("npm:xmlbuilder@4.2.1/lib/XMLNode.js");
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
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:xmlbuilder@4.2.1/lib/XMLDTDAttList.js", ["npm:lodash@4.2.0/create.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  (function() {
    var XMLDTDAttList,
        create;
    create = require("npm:lodash@4.2.0/create.js");
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
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:xmlbuilder@4.2.1/lib/XMLDTDEntity.js", ["npm:lodash@4.2.0/create.js", "npm:lodash@4.2.0/isObject.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  (function() {
    var XMLDTDEntity,
        create,
        isObject;
    create = require("npm:lodash@4.2.0/create.js");
    isObject = require("npm:lodash@4.2.0/isObject.js");
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
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:xmlbuilder@4.2.1/lib/XMLDTDElement.js", ["npm:lodash@4.2.0/create.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  (function() {
    var XMLDTDElement,
        create;
    create = require("npm:lodash@4.2.0/create.js");
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
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:xmlbuilder@4.2.1/lib/XMLDTDNotation.js", ["npm:lodash@4.2.0/create.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  (function() {
    var XMLDTDNotation,
        create;
    create = require("npm:lodash@4.2.0/create.js");
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
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:xmlbuilder@4.2.1/lib/XMLRaw.js", ["npm:lodash@4.2.0/create.js", "npm:xmlbuilder@4.2.1/lib/XMLNode.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
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
    create = require("npm:lodash@4.2.0/create.js");
    XMLNode = require("npm:xmlbuilder@4.2.1/lib/XMLNode.js");
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
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:xmlbuilder@4.2.1/lib/XMLText.js", ["npm:lodash@4.2.0/create.js", "npm:xmlbuilder@4.2.1/lib/XMLNode.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
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
    create = require("npm:lodash@4.2.0/create.js");
    XMLNode = require("npm:xmlbuilder@4.2.1/lib/XMLNode.js");
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
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:xml2js@0.4.16/lib/bom.js", ["npm:xml2js@0.4.16/lib/xml2js.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  (function() {
    "use strict";
    var xml2js;
    xml2js = require("npm:xml2js@0.4.16/lib/xml2js.js");
    exports.stripBOM = function(str) {
      if (str[0] === '\uFEFF') {
        return str.substring(1);
      } else {
        return str;
      }
    };
  }).call(this);
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:xml2js@0.4.16/lib/processors.js", [], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
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
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:timers-browserify@1.4.1/main.js", ["npm:process@0.11.2/browser.js", "npm:process@0.11.2.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  (function(process) {
    var nextTick = require("npm:process@0.11.2/browser.js").nextTick;
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
    exports._unrefActive = exports.active = function(item) {
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
  })(require("npm:process@0.11.2.js"));
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:core-js@0.9.18/library/fn/object/get-own-property-names.js", ["npm:core-js@0.9.18/library/modules/$.js", "npm:core-js@0.9.18/library/modules/es6.object.statics-accept-primitives.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var $ = require("npm:core-js@0.9.18/library/modules/$.js");
  require("npm:core-js@0.9.18/library/modules/es6.object.statics-accept-primitives.js");
  module.exports = function getOwnPropertyNames(it) {
    return $.getNames(it);
  };
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:core-js@0.9.18/library/fn/object/keys.js", ["npm:core-js@0.9.18/library/modules/es6.object.statics-accept-primitives.js", "npm:core-js@0.9.18/library/modules/$.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  require("npm:core-js@0.9.18/library/modules/es6.object.statics-accept-primitives.js");
  module.exports = require("npm:core-js@0.9.18/library/modules/$.js").core.Object.keys;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@3.10.1/index.js", ["github:jspm/nodelibs-process@0.1.2.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  "format cjs";
  (function(process) {
    ;
    (function() {
      var undefined;
      var VERSION = '3.10.1';
      var BIND_FLAG = 1,
          BIND_KEY_FLAG = 2,
          CURRY_BOUND_FLAG = 4,
          CURRY_FLAG = 8,
          CURRY_RIGHT_FLAG = 16,
          PARTIAL_FLAG = 32,
          PARTIAL_RIGHT_FLAG = 64,
          ARY_FLAG = 128,
          REARG_FLAG = 256;
      var DEFAULT_TRUNC_LENGTH = 30,
          DEFAULT_TRUNC_OMISSION = '...';
      var HOT_COUNT = 150,
          HOT_SPAN = 16;
      var LARGE_ARRAY_SIZE = 200;
      var LAZY_FILTER_FLAG = 1,
          LAZY_MAP_FLAG = 2;
      var FUNC_ERROR_TEXT = 'Expected a function';
      var PLACEHOLDER = '__lodash_placeholder__';
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
      var reIsDeepProp = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\n\\]|\\.)*?\1)\]/,
          reIsPlainProp = /^\w*$/,
          rePropName = /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\n\\]|\\.)*?)\2)\]/g;
      var reRegExpChars = /^[:!,]|[\\^$.*+?()[\]{}|\/]|(^[0-9a-fA-Fnrtuvx])|([\n\r\u2028\u2029])/g,
          reHasRegExpChars = RegExp(reRegExpChars.source);
      var reComboMark = /[\u0300-\u036f\ufe20-\ufe23]/g;
      var reEscapeChar = /\\(\\)?/g;
      var reEsTemplate = /\$\{([^\\}]*(?:\\.[^\\}]*)*)\}/g;
      var reFlags = /\w*$/;
      var reHasHexPrefix = /^0[xX]/;
      var reIsHostCtor = /^\[object .+?Constructor\]$/;
      var reIsUint = /^\d+$/;
      var reLatin1 = /[\xc0-\xd6\xd8-\xde\xdf-\xf6\xf8-\xff]/g;
      var reNoMatch = /($^)/;
      var reUnescapedString = /['\n\r\u2028\u2029\\]/g;
      var reWords = (function() {
        var upper = '[A-Z\\xc0-\\xd6\\xd8-\\xde]',
            lower = '[a-z\\xdf-\\xf6\\xf8-\\xff]+';
        return RegExp(upper + '+(?=' + upper + lower + ')|' + upper + '?' + lower + '|' + upper + '+|[0-9]+', 'g');
      }());
      var contextProps = ['Array', 'ArrayBuffer', 'Date', 'Error', 'Float32Array', 'Float64Array', 'Function', 'Int8Array', 'Int16Array', 'Int32Array', 'Math', 'Number', 'Object', 'RegExp', 'Set', 'String', '_', 'clearTimeout', 'isFinite', 'parseFloat', 'parseInt', 'setTimeout', 'TypeError', 'Uint8Array', 'Uint8ClampedArray', 'Uint16Array', 'Uint32Array', 'WeakMap'];
      var templateCounter = -1;
      var typedArrayTags = {};
      typedArrayTags[float32Tag] = typedArrayTags[float64Tag] = typedArrayTags[int8Tag] = typedArrayTags[int16Tag] = typedArrayTags[int32Tag] = typedArrayTags[uint8Tag] = typedArrayTags[uint8ClampedTag] = typedArrayTags[uint16Tag] = typedArrayTags[uint32Tag] = true;
      typedArrayTags[argsTag] = typedArrayTags[arrayTag] = typedArrayTags[arrayBufferTag] = typedArrayTags[boolTag] = typedArrayTags[dateTag] = typedArrayTags[errorTag] = typedArrayTags[funcTag] = typedArrayTags[mapTag] = typedArrayTags[numberTag] = typedArrayTags[objectTag] = typedArrayTags[regexpTag] = typedArrayTags[setTag] = typedArrayTags[stringTag] = typedArrayTags[weakMapTag] = false;
      var cloneableTags = {};
      cloneableTags[argsTag] = cloneableTags[arrayTag] = cloneableTags[arrayBufferTag] = cloneableTags[boolTag] = cloneableTags[dateTag] = cloneableTags[float32Tag] = cloneableTags[float64Tag] = cloneableTags[int8Tag] = cloneableTags[int16Tag] = cloneableTags[int32Tag] = cloneableTags[numberTag] = cloneableTags[objectTag] = cloneableTags[regexpTag] = cloneableTags[stringTag] = cloneableTags[uint8Tag] = cloneableTags[uint8ClampedTag] = cloneableTags[uint16Tag] = cloneableTags[uint32Tag] = true;
      cloneableTags[errorTag] = cloneableTags[funcTag] = cloneableTags[mapTag] = cloneableTags[setTag] = cloneableTags[weakMapTag] = false;
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
      var regexpEscapes = {
        '0': 'x30',
        '1': 'x31',
        '2': 'x32',
        '3': 'x33',
        '4': 'x34',
        '5': 'x35',
        '6': 'x36',
        '7': 'x37',
        '8': 'x38',
        '9': 'x39',
        'A': 'x41',
        'B': 'x42',
        'C': 'x43',
        'D': 'x44',
        'E': 'x45',
        'F': 'x46',
        'a': 'x61',
        'b': 'x62',
        'c': 'x63',
        'd': 'x64',
        'e': 'x65',
        'f': 'x66',
        'n': 'x6e',
        'r': 'x72',
        't': 'x74',
        'u': 'x75',
        'v': 'x76',
        'x': 'x78'
      };
      var stringEscapes = {
        '\\': '\\',
        "'": "'",
        '\n': 'n',
        '\r': 'r',
        '\u2028': 'u2028',
        '\u2029': 'u2029'
      };
      var freeExports = objectTypes[typeof exports] && exports && !exports.nodeType && exports;
      var freeModule = objectTypes[typeof module] && module && !module.nodeType && module;
      var freeGlobal = freeExports && freeModule && typeof global == 'object' && global && global.Object && global;
      var freeSelf = objectTypes[typeof self] && self && self.Object && self;
      var freeWindow = objectTypes[typeof window] && window && window.Object && window;
      var moduleExports = freeModule && freeModule.exports === freeExports && freeExports;
      var root = freeGlobal || ((freeWindow !== (this && this.window)) && freeWindow) || freeSelf || this;
      function baseCompareAscending(value, other) {
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
      function baseIsFunction(value) {
        return typeof value == 'function' || false;
      }
      function baseToString(value) {
        return value == null ? '' : (value + '');
      }
      function charsLeftIndex(string, chars) {
        var index = -1,
            length = string.length;
        while (++index < length && chars.indexOf(string.charAt(index)) > -1) {}
        return index;
      }
      function charsRightIndex(string, chars) {
        var index = string.length;
        while (index-- && chars.indexOf(string.charAt(index)) > -1) {}
        return index;
      }
      function compareAscending(object, other) {
        return baseCompareAscending(object.criteria, other.criteria) || (object.index - other.index);
      }
      function compareMultiple(object, other, orders) {
        var index = -1,
            objCriteria = object.criteria,
            othCriteria = other.criteria,
            length = objCriteria.length,
            ordersLength = orders.length;
        while (++index < length) {
          var result = baseCompareAscending(objCriteria[index], othCriteria[index]);
          if (result) {
            if (index >= ordersLength) {
              return result;
            }
            var order = orders[index];
            return result * ((order === 'asc' || order === true) ? 1 : -1);
          }
        }
        return object.index - other.index;
      }
      function deburrLetter(letter) {
        return deburredLetters[letter];
      }
      function escapeHtmlChar(chr) {
        return htmlEscapes[chr];
      }
      function escapeRegExpChar(chr, leadingChar, whitespaceChar) {
        if (leadingChar) {
          chr = regexpEscapes[chr];
        } else if (whitespaceChar) {
          chr = stringEscapes[chr];
        }
        return '\\' + chr;
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
      function isObjectLike(value) {
        return !!value && typeof value == 'object';
      }
      function isSpace(charCode) {
        return ((charCode <= 160 && (charCode >= 9 && charCode <= 13) || charCode == 32 || charCode == 160) || charCode == 5760 || charCode == 6158 || (charCode >= 8192 && (charCode <= 8202 || charCode == 8232 || charCode == 8233 || charCode == 8239 || charCode == 8287 || charCode == 12288 || charCode == 65279)));
      }
      function replaceHolders(array, placeholder) {
        var index = -1,
            length = array.length,
            resIndex = -1,
            result = [];
        while (++index < length) {
          if (array[index] === placeholder) {
            array[index] = PLACEHOLDER;
            result[++resIndex] = index;
          }
        }
        return result;
      }
      function sortedUniq(array, iteratee) {
        var seen,
            index = -1,
            length = array.length,
            resIndex = -1,
            result = [];
        while (++index < length) {
          var value = array[index],
              computed = iteratee ? iteratee(value, index, array) : value;
          if (!index || seen !== computed) {
            seen = computed;
            result[++resIndex] = value;
          }
        }
        return result;
      }
      function trimmedLeftIndex(string) {
        var index = -1,
            length = string.length;
        while (++index < length && isSpace(string.charCodeAt(index))) {}
        return index;
      }
      function trimmedRightIndex(string) {
        var index = string.length;
        while (index-- && isSpace(string.charCodeAt(index))) {}
        return index;
      }
      function unescapeHtmlChar(chr) {
        return htmlUnescapes[chr];
      }
      function runInContext(context) {
        context = context ? _.defaults(root.Object(), context, _.pick(root, contextProps)) : root;
        var Array = context.Array,
            Date = context.Date,
            Error = context.Error,
            Function = context.Function,
            Math = context.Math,
            Number = context.Number,
            Object = context.Object,
            RegExp = context.RegExp,
            String = context.String,
            TypeError = context.TypeError;
        var arrayProto = Array.prototype,
            objectProto = Object.prototype,
            stringProto = String.prototype;
        var fnToString = Function.prototype.toString;
        var hasOwnProperty = objectProto.hasOwnProperty;
        var idCounter = 0;
        var objToString = objectProto.toString;
        var oldDash = root._;
        var reIsNative = RegExp('^' + fnToString.call(hasOwnProperty).replace(/[\\^$.*+?()[\]{}|]/g, '\\$&').replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, '$1.*?') + '$');
        var ArrayBuffer = context.ArrayBuffer,
            clearTimeout = context.clearTimeout,
            parseFloat = context.parseFloat,
            pow = Math.pow,
            propertyIsEnumerable = objectProto.propertyIsEnumerable,
            Set = getNative(context, 'Set'),
            setTimeout = context.setTimeout,
            splice = arrayProto.splice,
            Uint8Array = context.Uint8Array,
            WeakMap = getNative(context, 'WeakMap');
        var nativeCeil = Math.ceil,
            nativeCreate = getNative(Object, 'create'),
            nativeFloor = Math.floor,
            nativeIsArray = getNative(Array, 'isArray'),
            nativeIsFinite = context.isFinite,
            nativeKeys = getNative(Object, 'keys'),
            nativeMax = Math.max,
            nativeMin = Math.min,
            nativeNow = getNative(Date, 'now'),
            nativeParseInt = context.parseInt,
            nativeRandom = Math.random;
        var NEGATIVE_INFINITY = Number.NEGATIVE_INFINITY,
            POSITIVE_INFINITY = Number.POSITIVE_INFINITY;
        var MAX_ARRAY_LENGTH = 4294967295,
            MAX_ARRAY_INDEX = MAX_ARRAY_LENGTH - 1,
            HALF_MAX_ARRAY_LENGTH = MAX_ARRAY_LENGTH >>> 1;
        var MAX_SAFE_INTEGER = 9007199254740991;
        var metaMap = WeakMap && new WeakMap;
        var realNames = {};
        function lodash(value) {
          if (isObjectLike(value) && !isArray(value) && !(value instanceof LazyWrapper)) {
            if (value instanceof LodashWrapper) {
              return value;
            }
            if (hasOwnProperty.call(value, '__chain__') && hasOwnProperty.call(value, '__wrapped__')) {
              return wrapperClone(value);
            }
          }
          return new LodashWrapper(value);
        }
        function baseLodash() {}
        function LodashWrapper(value, chainAll, actions) {
          this.__wrapped__ = value;
          this.__actions__ = actions || [];
          this.__chain__ = !!chainAll;
        }
        var support = lodash.support = {};
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
          this.__takeCount__ = POSITIVE_INFINITY;
          this.__views__ = [];
        }
        function lazyClone() {
          var result = new LazyWrapper(this.__wrapped__);
          result.__actions__ = arrayCopy(this.__actions__);
          result.__dir__ = this.__dir__;
          result.__filtered__ = this.__filtered__;
          result.__iteratees__ = arrayCopy(this.__iteratees__);
          result.__takeCount__ = this.__takeCount__;
          result.__views__ = arrayCopy(this.__views__);
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
            return baseWrapperValue((isRight && isArr) ? array.reverse() : array, this.__actions__);
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
        function MapCache() {
          this.__data__ = {};
        }
        function mapDelete(key) {
          return this.has(key) && delete this.__data__[key];
        }
        function mapGet(key) {
          return key == '__proto__' ? undefined : this.__data__[key];
        }
        function mapHas(key) {
          return key != '__proto__' && hasOwnProperty.call(this.__data__, key);
        }
        function mapSet(key, value) {
          if (key != '__proto__') {
            this.__data__[key] = value;
          }
          return this;
        }
        function SetCache(values) {
          var length = values ? values.length : 0;
          this.data = {
            'hash': nativeCreate(null),
            'set': new Set
          };
          while (length--) {
            this.push(values[length]);
          }
        }
        function cacheIndexOf(cache, value) {
          var data = cache.data,
              result = (typeof value == 'string' || isObject(value)) ? data.set.has(value) : data.hash[value];
          return result ? 0 : -1;
        }
        function cachePush(value) {
          var data = this.data;
          if (typeof value == 'string' || isObject(value)) {
            data.set.add(value);
          } else {
            data.hash[value] = true;
          }
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
        function arrayCopy(source, array) {
          var index = -1,
              length = source.length;
          array || (array = Array(length));
          while (++index < length) {
            array[index] = source[index];
          }
          return array;
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
        function arrayExtremum(array, iteratee, comparator, exValue) {
          var index = -1,
              length = array.length,
              computed = exValue,
              result = computed;
          while (++index < length) {
            var value = array[index],
                current = +iteratee(value);
            if (comparator(current, computed)) {
              computed = current;
              result = value;
            }
          }
          return result;
        }
        function arrayFilter(array, predicate) {
          var index = -1,
              length = array.length,
              resIndex = -1,
              result = [];
          while (++index < length) {
            var value = array[index];
            if (predicate(value, index, array)) {
              result[++resIndex] = value;
            }
          }
          return result;
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
        function arrayReduce(array, iteratee, accumulator, initFromArray) {
          var index = -1,
              length = array.length;
          if (initFromArray && length) {
            accumulator = array[++index];
          }
          while (++index < length) {
            accumulator = iteratee(accumulator, array[index], index, array);
          }
          return accumulator;
        }
        function arrayReduceRight(array, iteratee, accumulator, initFromArray) {
          var length = array.length;
          if (initFromArray && length) {
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
        function arraySum(array, iteratee) {
          var length = array.length,
              result = 0;
          while (length--) {
            result += +iteratee(array[length]) || 0;
          }
          return result;
        }
        function assignDefaults(objectValue, sourceValue) {
          return objectValue === undefined ? sourceValue : objectValue;
        }
        function assignOwnDefaults(objectValue, sourceValue, key, object) {
          return (objectValue === undefined || !hasOwnProperty.call(object, key)) ? sourceValue : objectValue;
        }
        function assignWith(object, source, customizer) {
          var index = -1,
              props = keys(source),
              length = props.length;
          while (++index < length) {
            var key = props[index],
                value = object[key],
                result = customizer(value, source[key], key, object, source);
            if ((result === result ? (result !== value) : (value === value)) || (value === undefined && !(key in object))) {
              object[key] = result;
            }
          }
          return object;
        }
        function baseAssign(object, source) {
          return source == null ? object : baseCopy(source, keys(source), object);
        }
        function baseAt(collection, props) {
          var index = -1,
              isNil = collection == null,
              isArr = !isNil && isArrayLike(collection),
              length = isArr ? collection.length : 0,
              propsLength = props.length,
              result = Array(propsLength);
          while (++index < propsLength) {
            var key = props[index];
            if (isArr) {
              result[index] = isIndex(key, length) ? collection[key] : undefined;
            } else {
              result[index] = isNil ? undefined : collection[key];
            }
          }
          return result;
        }
        function baseCopy(source, props, object) {
          object || (object = {});
          var index = -1,
              length = props.length;
          while (++index < length) {
            var key = props[index];
            object[key] = source[key];
          }
          return object;
        }
        function baseCallback(func, thisArg, argCount) {
          var type = typeof func;
          if (type == 'function') {
            return thisArg === undefined ? func : bindCallback(func, thisArg, argCount);
          }
          if (func == null) {
            return identity;
          }
          if (type == 'object') {
            return baseMatches(func);
          }
          return thisArg === undefined ? property(func) : baseMatchesProperty(func, thisArg);
        }
        function baseClone(value, isDeep, customizer, key, object, stackA, stackB) {
          var result;
          if (customizer) {
            result = object ? customizer(value, key, object) : customizer(value);
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
              return arrayCopy(value, result);
            }
          } else {
            var tag = objToString.call(value),
                isFunc = tag == funcTag;
            if (tag == objectTag || tag == argsTag || (isFunc && !object)) {
              result = initCloneObject(isFunc ? {} : value);
              if (!isDeep) {
                return baseAssign(result, value);
              }
            } else {
              return cloneableTags[tag] ? initCloneByTag(value, tag, isDeep) : (object ? value : {});
            }
          }
          stackA || (stackA = []);
          stackB || (stackB = []);
          var length = stackA.length;
          while (length--) {
            if (stackA[length] == value) {
              return stackB[length];
            }
          }
          stackA.push(value);
          stackB.push(result);
          (isArr ? arrayEach : baseForOwn)(value, function(subValue, key) {
            result[key] = baseClone(subValue, isDeep, customizer, key, value, stackA, stackB);
          });
          return result;
        }
        var baseCreate = (function() {
          function object() {}
          return function(prototype) {
            if (isObject(prototype)) {
              object.prototype = prototype;
              var result = new object;
              object.prototype = undefined;
            }
            return result || {};
          };
        }());
        function baseDelay(func, wait, args) {
          if (typeof func != 'function') {
            throw new TypeError(FUNC_ERROR_TEXT);
          }
          return setTimeout(function() {
            func.apply(undefined, args);
          }, wait);
        }
        function baseDifference(array, values) {
          var length = array ? array.length : 0,
              result = [];
          if (!length) {
            return result;
          }
          var index = -1,
              indexOf = getIndexOf(),
              isCommon = indexOf == baseIndexOf,
              cache = (isCommon && values.length >= LARGE_ARRAY_SIZE) ? createCache(values) : null,
              valuesLength = values.length;
          if (cache) {
            indexOf = cacheIndexOf;
            isCommon = false;
            values = cache;
          }
          outer: while (++index < length) {
            var value = array[index];
            if (isCommon && value === value) {
              var valuesIndex = valuesLength;
              while (valuesIndex--) {
                if (values[valuesIndex] === value) {
                  continue outer;
                }
              }
              result.push(value);
            } else if (indexOf(values, value, 0) < 0) {
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
        function baseExtremum(collection, iteratee, comparator, exValue) {
          var computed = exValue,
              result = computed;
          baseEach(collection, function(value, index, collection) {
            var current = +iteratee(value, index, collection);
            if (comparator(current, computed) || (current === exValue && current === result)) {
              computed = current;
              result = value;
            }
          });
          return result;
        }
        function baseFill(array, value, start, end) {
          var length = array.length;
          start = start == null ? 0 : (+start || 0);
          if (start < 0) {
            start = -start > length ? 0 : (length + start);
          }
          end = (end === undefined || end > length) ? length : (+end || 0);
          if (end < 0) {
            end += length;
          }
          length = start > end ? 0 : (end >>> 0);
          start >>>= 0;
          while (start < length) {
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
        function baseFlatten(array, isDeep, isStrict, result) {
          result || (result = []);
          var index = -1,
              length = array.length;
          while (++index < length) {
            var value = array[index];
            if (isObjectLike(value) && isArrayLike(value) && (isStrict || isArray(value) || isArguments(value))) {
              if (isDeep) {
                baseFlatten(value, isDeep, isStrict, result);
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
          return baseFor(object, iteratee, keysIn);
        }
        function baseForOwn(object, iteratee) {
          return baseFor(object, iteratee, keys);
        }
        function baseForOwnRight(object, iteratee) {
          return baseForRight(object, iteratee, keys);
        }
        function baseFunctions(object, props) {
          var index = -1,
              length = props.length,
              resIndex = -1,
              result = [];
          while (++index < length) {
            var key = props[index];
            if (isFunction(object[key])) {
              result[++resIndex] = key;
            }
          }
          return result;
        }
        function baseGet(object, path, pathKey) {
          if (object == null) {
            return;
          }
          if (pathKey !== undefined && pathKey in toObject(object)) {
            path = [pathKey];
          }
          var index = 0,
              length = path.length;
          while (object != null && index < length) {
            object = object[path[index++]];
          }
          return (index && index == length) ? object : undefined;
        }
        function baseIsEqual(value, other, customizer, isLoose, stackA, stackB) {
          if (value === other) {
            return true;
          }
          if (value == null || other == null || (!isObject(value) && !isObjectLike(other))) {
            return value !== value && other !== other;
          }
          return baseIsEqualDeep(value, other, baseIsEqual, customizer, isLoose, stackA, stackB);
        }
        function baseIsEqualDeep(object, other, equalFunc, customizer, isLoose, stackA, stackB) {
          var objIsArr = isArray(object),
              othIsArr = isArray(other),
              objTag = arrayTag,
              othTag = arrayTag;
          if (!objIsArr) {
            objTag = objToString.call(object);
            if (objTag == argsTag) {
              objTag = objectTag;
            } else if (objTag != objectTag) {
              objIsArr = isTypedArray(object);
            }
          }
          if (!othIsArr) {
            othTag = objToString.call(other);
            if (othTag == argsTag) {
              othTag = objectTag;
            } else if (othTag != objectTag) {
              othIsArr = isTypedArray(other);
            }
          }
          var objIsObj = objTag == objectTag,
              othIsObj = othTag == objectTag,
              isSameTag = objTag == othTag;
          if (isSameTag && !(objIsArr || objIsObj)) {
            return equalByTag(object, other, objTag);
          }
          if (!isLoose) {
            var objIsWrapped = objIsObj && hasOwnProperty.call(object, '__wrapped__'),
                othIsWrapped = othIsObj && hasOwnProperty.call(other, '__wrapped__');
            if (objIsWrapped || othIsWrapped) {
              return equalFunc(objIsWrapped ? object.value() : object, othIsWrapped ? other.value() : other, customizer, isLoose, stackA, stackB);
            }
          }
          if (!isSameTag) {
            return false;
          }
          stackA || (stackA = []);
          stackB || (stackB = []);
          var length = stackA.length;
          while (length--) {
            if (stackA[length] == object) {
              return stackB[length] == other;
            }
          }
          stackA.push(object);
          stackB.push(other);
          var result = (objIsArr ? equalArrays : equalObjects)(object, other, equalFunc, customizer, isLoose, stackA, stackB);
          stackA.pop();
          stackB.pop();
          return result;
        }
        function baseIsMatch(object, matchData, customizer) {
          var index = matchData.length,
              length = index,
              noCustomizer = !customizer;
          if (object == null) {
            return !length;
          }
          object = toObject(object);
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
              var result = customizer ? customizer(objValue, srcValue, key) : undefined;
              if (!(result === undefined ? baseIsEqual(srcValue, objValue, customizer, true) : result)) {
                return false;
              }
            }
          }
          return true;
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
              return object[key] === value && (value !== undefined || (key in toObject(object)));
            };
          }
          return function(object) {
            return baseIsMatch(object, matchData);
          };
        }
        function baseMatchesProperty(path, srcValue) {
          var isArr = isArray(path),
              isCommon = isKey(path) && isStrictComparable(srcValue),
              pathKey = (path + '');
          path = toPath(path);
          return function(object) {
            if (object == null) {
              return false;
            }
            var key = pathKey;
            object = toObject(object);
            if ((isArr || !isCommon) && !(key in object)) {
              object = path.length == 1 ? object : baseGet(object, baseSlice(path, 0, -1));
              if (object == null) {
                return false;
              }
              key = last(path);
              object = toObject(object);
            }
            return object[key] === srcValue ? (srcValue !== undefined || (key in object)) : baseIsEqual(srcValue, object[key], undefined, true);
          };
        }
        function baseMerge(object, source, customizer, stackA, stackB) {
          if (!isObject(object)) {
            return object;
          }
          var isSrcArr = isArrayLike(source) && (isArray(source) || isTypedArray(source)),
              props = isSrcArr ? undefined : keys(source);
          arrayEach(props || source, function(srcValue, key) {
            if (props) {
              key = srcValue;
              srcValue = source[key];
            }
            if (isObjectLike(srcValue)) {
              stackA || (stackA = []);
              stackB || (stackB = []);
              baseMergeDeep(object, source, key, baseMerge, customizer, stackA, stackB);
            } else {
              var value = object[key],
                  result = customizer ? customizer(value, srcValue, key, object, source) : undefined,
                  isCommon = result === undefined;
              if (isCommon) {
                result = srcValue;
              }
              if ((result !== undefined || (isSrcArr && !(key in object))) && (isCommon || (result === result ? (result !== value) : (value === value)))) {
                object[key] = result;
              }
            }
          });
          return object;
        }
        function baseMergeDeep(object, source, key, mergeFunc, customizer, stackA, stackB) {
          var length = stackA.length,
              srcValue = source[key];
          while (length--) {
            if (stackA[length] == srcValue) {
              object[key] = stackB[length];
              return;
            }
          }
          var value = object[key],
              result = customizer ? customizer(value, srcValue, key, object, source) : undefined,
              isCommon = result === undefined;
          if (isCommon) {
            result = srcValue;
            if (isArrayLike(srcValue) && (isArray(srcValue) || isTypedArray(srcValue))) {
              result = isArray(value) ? value : (isArrayLike(value) ? arrayCopy(value) : []);
            } else if (isPlainObject(srcValue) || isArguments(srcValue)) {
              result = isArguments(value) ? toPlainObject(value) : (isPlainObject(value) ? value : {});
            } else {
              isCommon = false;
            }
          }
          stackA.push(srcValue);
          stackB.push(result);
          if (isCommon) {
            object[key] = mergeFunc(result, srcValue, customizer, stackA, stackB);
          } else if (result === result ? (result !== value) : (value === value)) {
            object[key] = result;
          }
        }
        function baseProperty(key) {
          return function(object) {
            return object == null ? undefined : object[key];
          };
        }
        function basePropertyDeep(path) {
          var pathKey = (path + '');
          path = toPath(path);
          return function(object) {
            return baseGet(object, path, pathKey);
          };
        }
        function basePullAt(array, indexes) {
          var length = array ? indexes.length : 0;
          while (length--) {
            var index = indexes[length];
            if (index != previous && isIndex(index)) {
              var previous = index;
              splice.call(array, index, 1);
            }
          }
          return array;
        }
        function baseRandom(min, max) {
          return min + nativeFloor(nativeRandom() * (max - min + 1));
        }
        function baseReduce(collection, iteratee, accumulator, initFromCollection, eachFunc) {
          eachFunc(collection, function(value, index, collection) {
            accumulator = initFromCollection ? (initFromCollection = false, value) : iteratee(accumulator, value, index, collection);
          });
          return accumulator;
        }
        var baseSetData = !metaMap ? identity : function(func, data) {
          metaMap.set(func, data);
          return func;
        };
        function baseSlice(array, start, end) {
          var index = -1,
              length = array.length;
          start = start == null ? 0 : (+start || 0);
          if (start < 0) {
            start = -start > length ? 0 : (length + start);
          }
          end = (end === undefined || end > length) ? length : (+end || 0);
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
        function baseSortBy(array, comparer) {
          var length = array.length;
          array.sort(comparer);
          while (length--) {
            array[length] = array[length].value;
          }
          return array;
        }
        function baseSortByOrder(collection, iteratees, orders) {
          var callback = getCallback(),
              index = -1;
          iteratees = arrayMap(iteratees, function(iteratee) {
            return callback(iteratee);
          });
          var result = baseMap(collection, function(value) {
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
        function baseSum(collection, iteratee) {
          var result = 0;
          baseEach(collection, function(value, index, collection) {
            result += +iteratee(value, index, collection) || 0;
          });
          return result;
        }
        function baseUniq(array, iteratee) {
          var index = -1,
              indexOf = getIndexOf(),
              length = array.length,
              isCommon = indexOf == baseIndexOf,
              isLarge = isCommon && length >= LARGE_ARRAY_SIZE,
              seen = isLarge ? createCache() : null,
              result = [];
          if (seen) {
            indexOf = cacheIndexOf;
            isCommon = false;
          } else {
            isLarge = false;
            seen = iteratee ? [] : result;
          }
          outer: while (++index < length) {
            var value = array[index],
                computed = iteratee ? iteratee(value, index, array) : value;
            if (isCommon && value === value) {
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
            } else if (indexOf(seen, computed, 0) < 0) {
              if (iteratee || isLarge) {
                seen.push(computed);
              }
              result.push(value);
            }
          }
          return result;
        }
        function baseValues(object, props) {
          var index = -1,
              length = props.length,
              result = Array(length);
          while (++index < length) {
            result[index] = object[props[index]];
          }
          return result;
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
          var index = -1,
              length = actions.length;
          while (++index < length) {
            var action = actions[index];
            result = action.func.apply(action.thisArg, arrayPush([result], action.args));
          }
          return result;
        }
        function binaryIndex(array, value, retHighest) {
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
          return binaryIndexBy(array, value, identity, retHighest);
        }
        function binaryIndexBy(array, value, iteratee, retHighest) {
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
        function bindCallback(func, thisArg, argCount) {
          if (typeof func != 'function') {
            return identity;
          }
          if (thisArg === undefined) {
            return func;
          }
          switch (argCount) {
            case 1:
              return function(value) {
                return func.call(thisArg, value);
              };
            case 3:
              return function(value, index, collection) {
                return func.call(thisArg, value, index, collection);
              };
            case 4:
              return function(accumulator, value, index, collection) {
                return func.call(thisArg, accumulator, value, index, collection);
              };
            case 5:
              return function(value, other, key, object, source) {
                return func.call(thisArg, value, other, key, object, source);
              };
          }
          return function() {
            return func.apply(thisArg, arguments);
          };
        }
        function bufferClone(buffer) {
          var result = new ArrayBuffer(buffer.byteLength),
              view = new Uint8Array(result);
          view.set(new Uint8Array(buffer));
          return result;
        }
        function composeArgs(args, partials, holders) {
          var holdersLength = holders.length,
              argsIndex = -1,
              argsLength = nativeMax(args.length - holdersLength, 0),
              leftIndex = -1,
              leftLength = partials.length,
              result = Array(leftLength + argsLength);
          while (++leftIndex < leftLength) {
            result[leftIndex] = partials[leftIndex];
          }
          while (++argsIndex < holdersLength) {
            result[holders[argsIndex]] = args[argsIndex];
          }
          while (argsLength--) {
            result[leftIndex++] = args[argsIndex++];
          }
          return result;
        }
        function composeArgsRight(args, partials, holders) {
          var holdersIndex = -1,
              holdersLength = holders.length,
              argsIndex = -1,
              argsLength = nativeMax(args.length - holdersLength, 0),
              rightIndex = -1,
              rightLength = partials.length,
              result = Array(argsLength + rightLength);
          while (++argsIndex < argsLength) {
            result[argsIndex] = args[argsIndex];
          }
          var offset = argsIndex;
          while (++rightIndex < rightLength) {
            result[offset + rightIndex] = partials[rightIndex];
          }
          while (++holdersIndex < holdersLength) {
            result[offset + holders[holdersIndex]] = args[argsIndex++];
          }
          return result;
        }
        function createAggregator(setter, initializer) {
          return function(collection, iteratee, thisArg) {
            var result = initializer ? initializer() : {};
            iteratee = getCallback(iteratee, thisArg, 3);
            if (isArray(collection)) {
              var index = -1,
                  length = collection.length;
              while (++index < length) {
                var value = collection[index];
                setter(result, value, iteratee(value, index, collection), collection);
              }
            } else {
              baseEach(collection, function(value, key, collection) {
                setter(result, value, iteratee(value, key, collection), collection);
              });
            }
            return result;
          };
        }
        function createAssigner(assigner) {
          return restParam(function(object, sources) {
            var index = -1,
                length = object == null ? 0 : sources.length,
                customizer = length > 2 ? sources[length - 2] : undefined,
                guard = length > 2 ? sources[2] : undefined,
                thisArg = length > 1 ? sources[length - 1] : undefined;
            if (typeof customizer == 'function') {
              customizer = bindCallback(customizer, thisArg, 5);
              length -= 2;
            } else {
              customizer = typeof thisArg == 'function' ? thisArg : undefined;
              length -= (customizer ? 1 : 0);
            }
            if (guard && isIterateeCall(sources[0], sources[1], guard)) {
              customizer = length < 3 ? undefined : customizer;
              length = 1;
            }
            while (++index < length) {
              var source = sources[index];
              if (source) {
                assigner(object, source, customizer);
              }
            }
            return object;
          });
        }
        function createBaseEach(eachFunc, fromRight) {
          return function(collection, iteratee) {
            var length = collection ? getLength(collection) : 0;
            if (!isLength(length)) {
              return eachFunc(collection, iteratee);
            }
            var index = fromRight ? length : -1,
                iterable = toObject(collection);
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
            var iterable = toObject(object),
                props = keysFunc(object),
                length = props.length,
                index = fromRight ? length : -1;
            while ((fromRight ? index-- : ++index < length)) {
              var key = props[index];
              if (iteratee(iterable[key], key, iterable) === false) {
                break;
              }
            }
            return object;
          };
        }
        function createBindWrapper(func, thisArg) {
          var Ctor = createCtorWrapper(func);
          function wrapper() {
            var fn = (this && this !== root && this instanceof wrapper) ? Ctor : func;
            return fn.apply(thisArg, arguments);
          }
          return wrapper;
        }
        function createCache(values) {
          return (nativeCreate && Set) ? new SetCache(values) : null;
        }
        function createCompounder(callback) {
          return function(string) {
            var index = -1,
                array = words(deburr(string)),
                length = array.length,
                result = '';
            while (++index < length) {
              result = callback(result, array[index], index);
            }
            return result;
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
        function createCurry(flag) {
          function curryFunc(func, arity, guard) {
            if (guard && isIterateeCall(func, arity, guard)) {
              arity = undefined;
            }
            var result = createWrapper(func, flag, undefined, undefined, undefined, undefined, undefined, arity);
            result.placeholder = curryFunc.placeholder;
            return result;
          }
          return curryFunc;
        }
        function createDefaults(assigner, customizer) {
          return restParam(function(args) {
            var object = args[0];
            if (object == null) {
              return object;
            }
            args.push(customizer);
            return assigner.apply(undefined, args);
          });
        }
        function createExtremum(comparator, exValue) {
          return function(collection, iteratee, thisArg) {
            if (thisArg && isIterateeCall(collection, iteratee, thisArg)) {
              iteratee = undefined;
            }
            iteratee = getCallback(iteratee, thisArg, 3);
            if (iteratee.length == 1) {
              collection = isArray(collection) ? collection : toIterable(collection);
              var result = arrayExtremum(collection, iteratee, comparator, exValue);
              if (!(collection.length && result === exValue)) {
                return result;
              }
            }
            return baseExtremum(collection, iteratee, comparator, exValue);
          };
        }
        function createFind(eachFunc, fromRight) {
          return function(collection, predicate, thisArg) {
            predicate = getCallback(predicate, thisArg, 3);
            if (isArray(collection)) {
              var index = baseFindIndex(collection, predicate, fromRight);
              return index > -1 ? collection[index] : undefined;
            }
            return baseFind(collection, predicate, eachFunc);
          };
        }
        function createFindIndex(fromRight) {
          return function(array, predicate, thisArg) {
            if (!(array && array.length)) {
              return -1;
            }
            predicate = getCallback(predicate, thisArg, 3);
            return baseFindIndex(array, predicate, fromRight);
          };
        }
        function createFindKey(objectFunc) {
          return function(object, predicate, thisArg) {
            predicate = getCallback(predicate, thisArg, 3);
            return baseFind(object, predicate, objectFunc, true);
          };
        }
        function createFlow(fromRight) {
          return function() {
            var wrapper,
                length = arguments.length,
                index = fromRight ? length : -1,
                leftIndex = 0,
                funcs = Array(length);
            while ((fromRight ? index-- : ++index < length)) {
              var func = funcs[leftIndex++] = arguments[index];
              if (typeof func != 'function') {
                throw new TypeError(FUNC_ERROR_TEXT);
              }
              if (!wrapper && LodashWrapper.prototype.thru && getFuncName(func) == 'wrapper') {
                wrapper = new LodashWrapper([], true);
              }
            }
            index = wrapper ? -1 : length;
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
          };
        }
        function createForEach(arrayFunc, eachFunc) {
          return function(collection, iteratee, thisArg) {
            return (typeof iteratee == 'function' && thisArg === undefined && isArray(collection)) ? arrayFunc(collection, iteratee) : eachFunc(collection, bindCallback(iteratee, thisArg, 3));
          };
        }
        function createForIn(objectFunc) {
          return function(object, iteratee, thisArg) {
            if (typeof iteratee != 'function' || thisArg !== undefined) {
              iteratee = bindCallback(iteratee, thisArg, 3);
            }
            return objectFunc(object, iteratee, keysIn);
          };
        }
        function createForOwn(objectFunc) {
          return function(object, iteratee, thisArg) {
            if (typeof iteratee != 'function' || thisArg !== undefined) {
              iteratee = bindCallback(iteratee, thisArg, 3);
            }
            return objectFunc(object, iteratee);
          };
        }
        function createObjectMapper(isMapKeys) {
          return function(object, iteratee, thisArg) {
            var result = {};
            iteratee = getCallback(iteratee, thisArg, 3);
            baseForOwn(object, function(value, key, object) {
              var mapped = iteratee(value, key, object);
              key = isMapKeys ? mapped : key;
              value = isMapKeys ? value : mapped;
              result[key] = value;
            });
            return result;
          };
        }
        function createPadDir(fromRight) {
          return function(string, length, chars) {
            string = baseToString(string);
            return (fromRight ? string : '') + createPadding(string, length, chars) + (fromRight ? '' : string);
          };
        }
        function createPartial(flag) {
          var partialFunc = restParam(function(func, partials) {
            var holders = replaceHolders(partials, partialFunc.placeholder);
            return createWrapper(func, flag, undefined, partials, holders);
          });
          return partialFunc;
        }
        function createReduce(arrayFunc, eachFunc) {
          return function(collection, iteratee, accumulator, thisArg) {
            var initFromArray = arguments.length < 3;
            return (typeof iteratee == 'function' && thisArg === undefined && isArray(collection)) ? arrayFunc(collection, iteratee, accumulator, initFromArray) : baseReduce(collection, getCallback(iteratee, thisArg, 4), accumulator, initFromArray, eachFunc);
          };
        }
        function createHybridWrapper(func, bitmask, thisArg, partials, holders, partialsRight, holdersRight, argPos, ary, arity) {
          var isAry = bitmask & ARY_FLAG,
              isBind = bitmask & BIND_FLAG,
              isBindKey = bitmask & BIND_KEY_FLAG,
              isCurry = bitmask & CURRY_FLAG,
              isCurryBound = bitmask & CURRY_BOUND_FLAG,
              isCurryRight = bitmask & CURRY_RIGHT_FLAG,
              Ctor = isBindKey ? undefined : createCtorWrapper(func);
          function wrapper() {
            var length = arguments.length,
                index = length,
                args = Array(length);
            while (index--) {
              args[index] = arguments[index];
            }
            if (partials) {
              args = composeArgs(args, partials, holders);
            }
            if (partialsRight) {
              args = composeArgsRight(args, partialsRight, holdersRight);
            }
            if (isCurry || isCurryRight) {
              var placeholder = wrapper.placeholder,
                  argsHolders = replaceHolders(args, placeholder);
              length -= argsHolders.length;
              if (length < arity) {
                var newArgPos = argPos ? arrayCopy(argPos) : undefined,
                    newArity = nativeMax(arity - length, 0),
                    newsHolders = isCurry ? argsHolders : undefined,
                    newHoldersRight = isCurry ? undefined : argsHolders,
                    newPartials = isCurry ? args : undefined,
                    newPartialsRight = isCurry ? undefined : args;
                bitmask |= (isCurry ? PARTIAL_FLAG : PARTIAL_RIGHT_FLAG);
                bitmask &= ~(isCurry ? PARTIAL_RIGHT_FLAG : PARTIAL_FLAG);
                if (!isCurryBound) {
                  bitmask &= ~(BIND_FLAG | BIND_KEY_FLAG);
                }
                var newData = [func, bitmask, thisArg, newPartials, newsHolders, newPartialsRight, newHoldersRight, newArgPos, ary, newArity],
                    result = createHybridWrapper.apply(undefined, newData);
                if (isLaziable(func)) {
                  setData(result, newData);
                }
                result.placeholder = placeholder;
                return result;
              }
            }
            var thisBinding = isBind ? thisArg : this,
                fn = isBindKey ? thisBinding[func] : func;
            if (argPos) {
              args = reorder(args, argPos);
            }
            if (isAry && ary < args.length) {
              args.length = ary;
            }
            if (this && this !== root && this instanceof wrapper) {
              fn = Ctor || createCtorWrapper(func);
            }
            return fn.apply(thisBinding, args);
          }
          return wrapper;
        }
        function createPadding(string, length, chars) {
          var strLength = string.length;
          length = +length;
          if (strLength >= length || !nativeIsFinite(length)) {
            return '';
          }
          var padLength = length - strLength;
          chars = chars == null ? ' ' : (chars + '');
          return repeat(chars, nativeCeil(padLength / chars.length)).slice(0, padLength);
        }
        function createPartialWrapper(func, bitmask, thisArg, partials) {
          var isBind = bitmask & BIND_FLAG,
              Ctor = createCtorWrapper(func);
          function wrapper() {
            var argsIndex = -1,
                argsLength = arguments.length,
                leftIndex = -1,
                leftLength = partials.length,
                args = Array(leftLength + argsLength);
            while (++leftIndex < leftLength) {
              args[leftIndex] = partials[leftIndex];
            }
            while (argsLength--) {
              args[leftIndex++] = arguments[++argsIndex];
            }
            var fn = (this && this !== root && this instanceof wrapper) ? Ctor : func;
            return fn.apply(isBind ? thisArg : this, args);
          }
          return wrapper;
        }
        function createRound(methodName) {
          var func = Math[methodName];
          return function(number, precision) {
            precision = precision === undefined ? 0 : (+precision || 0);
            if (precision) {
              precision = pow(10, precision);
              return func(number * precision) / precision;
            }
            return func(number);
          };
        }
        function createSortedIndex(retHighest) {
          return function(array, value, iteratee, thisArg) {
            var callback = getCallback(iteratee);
            return (iteratee == null && callback === baseCallback) ? binaryIndex(array, value, retHighest) : binaryIndexBy(array, value, callback(iteratee, thisArg, 1), retHighest);
          };
        }
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
          length -= (holders ? holders.length : 0);
          if (bitmask & PARTIAL_RIGHT_FLAG) {
            var partialsRight = partials,
                holdersRight = holders;
            partials = holders = undefined;
          }
          var data = isBindKey ? undefined : getData(func),
              newData = [func, bitmask, thisArg, partials, holders, partialsRight, holdersRight, argPos, ary, arity];
          if (data) {
            mergeData(newData, data);
            bitmask = newData[1];
            arity = newData[9];
          }
          newData[9] = arity == null ? (isBindKey ? 0 : func.length) : (nativeMax(arity - length, 0) || 0);
          if (bitmask == BIND_FLAG) {
            var result = createBindWrapper(newData[0], newData[2]);
          } else if ((bitmask == PARTIAL_FLAG || bitmask == (BIND_FLAG | PARTIAL_FLAG)) && !newData[4].length) {
            result = createPartialWrapper.apply(undefined, newData);
          } else {
            result = createHybridWrapper.apply(undefined, newData);
          }
          var setter = data ? baseSetData : setData;
          return setter(result, newData);
        }
        function equalArrays(array, other, equalFunc, customizer, isLoose, stackA, stackB) {
          var index = -1,
              arrLength = array.length,
              othLength = other.length;
          if (arrLength != othLength && !(isLoose && othLength > arrLength)) {
            return false;
          }
          while (++index < arrLength) {
            var arrValue = array[index],
                othValue = other[index],
                result = customizer ? customizer(isLoose ? othValue : arrValue, isLoose ? arrValue : othValue, index) : undefined;
            if (result !== undefined) {
              if (result) {
                continue;
              }
              return false;
            }
            if (isLoose) {
              if (!arraySome(other, function(othValue) {
                return arrValue === othValue || equalFunc(arrValue, othValue, customizer, isLoose, stackA, stackB);
              })) {
                return false;
              }
            } else if (!(arrValue === othValue || equalFunc(arrValue, othValue, customizer, isLoose, stackA, stackB))) {
              return false;
            }
          }
          return true;
        }
        function equalByTag(object, other, tag) {
          switch (tag) {
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
          }
          return false;
        }
        function equalObjects(object, other, equalFunc, customizer, isLoose, stackA, stackB) {
          var objProps = keys(object),
              objLength = objProps.length,
              othProps = keys(other),
              othLength = othProps.length;
          if (objLength != othLength && !isLoose) {
            return false;
          }
          var index = objLength;
          while (index--) {
            var key = objProps[index];
            if (!(isLoose ? key in other : hasOwnProperty.call(other, key))) {
              return false;
            }
          }
          var skipCtor = isLoose;
          while (++index < objLength) {
            key = objProps[index];
            var objValue = object[key],
                othValue = other[key],
                result = customizer ? customizer(isLoose ? othValue : objValue, isLoose ? objValue : othValue, key) : undefined;
            if (!(result === undefined ? equalFunc(objValue, othValue, customizer, isLoose, stackA, stackB) : result)) {
              return false;
            }
            skipCtor || (skipCtor = key == 'constructor');
          }
          if (!skipCtor) {
            var objCtor = object.constructor,
                othCtor = other.constructor;
            if (objCtor != othCtor && ('constructor' in object && 'constructor' in other) && !(typeof objCtor == 'function' && objCtor instanceof objCtor && typeof othCtor == 'function' && othCtor instanceof othCtor)) {
              return false;
            }
          }
          return true;
        }
        function getCallback(func, thisArg, argCount) {
          var result = lodash.callback || callback;
          result = result === callback ? baseCallback : result;
          return argCount ? result(func, thisArg, argCount) : result;
        }
        var getData = !metaMap ? noop : function(func) {
          return metaMap.get(func);
        };
        function getFuncName(func) {
          var result = func.name,
              array = realNames[result],
              length = array ? array.length : 0;
          while (length--) {
            var data = array[length],
                otherFunc = data.func;
            if (otherFunc == null || otherFunc == func) {
              return data.name;
            }
          }
          return result;
        }
        function getIndexOf(collection, target, fromIndex) {
          var result = lodash.indexOf || indexOf;
          result = result === indexOf ? baseIndexOf : result;
          return collection ? result(collection, target, fromIndex) : result;
        }
        var getLength = baseProperty('length');
        function getMatchData(object) {
          var result = pairs(object),
              length = result.length;
          while (length--) {
            result[length][2] = isStrictComparable(result[length][1]);
          }
          return result;
        }
        function getNative(object, key) {
          var value = object == null ? undefined : object[key];
          return isNative(value) ? value : undefined;
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
        function initCloneArray(array) {
          var length = array.length,
              result = new array.constructor(length);
          if (length && typeof array[0] == 'string' && hasOwnProperty.call(array, 'index')) {
            result.index = array.index;
            result.input = array.input;
          }
          return result;
        }
        function initCloneObject(object) {
          var Ctor = object.constructor;
          if (!(typeof Ctor == 'function' && Ctor instanceof Ctor)) {
            Ctor = Object;
          }
          return new Ctor;
        }
        function initCloneByTag(object, tag, isDeep) {
          var Ctor = object.constructor;
          switch (tag) {
            case arrayBufferTag:
              return bufferClone(object);
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
              var buffer = object.buffer;
              return new Ctor(isDeep ? bufferClone(buffer) : buffer, object.byteOffset, object.length);
            case numberTag:
            case stringTag:
              return new Ctor(object);
            case regexpTag:
              var result = new Ctor(object.source, reFlags.exec(object));
              result.lastIndex = object.lastIndex;
          }
          return result;
        }
        function invokePath(object, path, args) {
          if (object != null && !isKey(path, object)) {
            path = toPath(path);
            object = path.length == 1 ? object : baseGet(object, baseSlice(path, 0, -1));
            path = last(path);
          }
          var func = object == null ? object : object[path];
          return func == null ? undefined : func.apply(object, args);
        }
        function isArrayLike(value) {
          return value != null && isLength(getLength(value));
        }
        function isIndex(value, length) {
          value = (typeof value == 'number' || reIsUint.test(value)) ? +value : -1;
          length = length == null ? MAX_SAFE_INTEGER : length;
          return value > -1 && value % 1 == 0 && value < length;
        }
        function isIterateeCall(value, index, object) {
          if (!isObject(object)) {
            return false;
          }
          var type = typeof index;
          if (type == 'number' ? (isArrayLike(object) && isIndex(index, object.length)) : (type == 'string' && index in object)) {
            var other = object[index];
            return value === value ? (value === other) : (other !== other);
          }
          return false;
        }
        function isKey(value, object) {
          var type = typeof value;
          if ((type == 'string' && reIsPlainProp.test(value)) || type == 'number') {
            return true;
          }
          if (isArray(value)) {
            return false;
          }
          var result = !reIsDeepProp.test(value);
          return result || (object != null && value in toObject(object));
        }
        function isLaziable(func) {
          var funcName = getFuncName(func);
          if (!(funcName in LazyWrapper.prototype)) {
            return false;
          }
          var other = lodash[funcName];
          if (func === other) {
            return true;
          }
          var data = getData(other);
          return !!data && func === data[0];
        }
        function isLength(value) {
          return typeof value == 'number' && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
        }
        function isStrictComparable(value) {
          return value === value && !isObject(value);
        }
        function mergeData(data, source) {
          var bitmask = data[1],
              srcBitmask = source[1],
              newBitmask = bitmask | srcBitmask,
              isCommon = newBitmask < ARY_FLAG;
          var isCombo = (srcBitmask == ARY_FLAG && bitmask == CURRY_FLAG) || (srcBitmask == ARY_FLAG && bitmask == REARG_FLAG && data[7].length <= source[8]) || (srcBitmask == (ARY_FLAG | REARG_FLAG) && bitmask == CURRY_FLAG);
          if (!(isCommon || isCombo)) {
            return data;
          }
          if (srcBitmask & BIND_FLAG) {
            data[2] = source[2];
            newBitmask |= (bitmask & BIND_FLAG) ? 0 : CURRY_BOUND_FLAG;
          }
          var value = source[3];
          if (value) {
            var partials = data[3];
            data[3] = partials ? composeArgs(partials, value, source[4]) : arrayCopy(value);
            data[4] = partials ? replaceHolders(data[3], PLACEHOLDER) : arrayCopy(source[4]);
          }
          value = source[5];
          if (value) {
            partials = data[5];
            data[5] = partials ? composeArgsRight(partials, value, source[6]) : arrayCopy(value);
            data[6] = partials ? replaceHolders(data[5], PLACEHOLDER) : arrayCopy(source[6]);
          }
          value = source[7];
          if (value) {
            data[7] = arrayCopy(value);
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
        function mergeDefaults(objectValue, sourceValue) {
          return objectValue === undefined ? sourceValue : merge(objectValue, sourceValue, mergeDefaults);
        }
        function pickByArray(object, props) {
          object = toObject(object);
          var index = -1,
              length = props.length,
              result = {};
          while (++index < length) {
            var key = props[index];
            if (key in object) {
              result[key] = object[key];
            }
          }
          return result;
        }
        function pickByCallback(object, predicate) {
          var result = {};
          baseForIn(object, function(value, key, object) {
            if (predicate(value, key, object)) {
              result[key] = value;
            }
          });
          return result;
        }
        function reorder(array, indexes) {
          var arrLength = array.length,
              length = nativeMin(indexes.length, arrLength),
              oldArray = arrayCopy(array);
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
        function shimKeys(object) {
          var props = keysIn(object),
              propsLength = props.length,
              length = propsLength && object.length;
          var allowIndexes = !!length && isLength(length) && (isArray(object) || isArguments(object));
          var index = -1,
              result = [];
          while (++index < propsLength) {
            var key = props[index];
            if ((allowIndexes && isIndex(key, length)) || hasOwnProperty.call(object, key)) {
              result.push(key);
            }
          }
          return result;
        }
        function toIterable(value) {
          if (value == null) {
            return [];
          }
          if (!isArrayLike(value)) {
            return values(value);
          }
          return isObject(value) ? value : Object(value);
        }
        function toObject(value) {
          return isObject(value) ? value : Object(value);
        }
        function toPath(value) {
          if (isArray(value)) {
            return value;
          }
          var result = [];
          baseToString(value).replace(rePropName, function(match, number, quote, string) {
            result.push(quote ? string.replace(reEscapeChar, '$1') : (number || match));
          });
          return result;
        }
        function wrapperClone(wrapper) {
          return wrapper instanceof LazyWrapper ? wrapper.clone() : new LodashWrapper(wrapper.__wrapped__, wrapper.__chain__, arrayCopy(wrapper.__actions__));
        }
        function chunk(array, size, guard) {
          if (guard ? isIterateeCall(array, size, guard) : size == null) {
            size = 1;
          } else {
            size = nativeMax(nativeFloor(size) || 1, 1);
          }
          var index = 0,
              length = array ? array.length : 0,
              resIndex = -1,
              result = Array(nativeCeil(length / size));
          while (index < length) {
            result[++resIndex] = baseSlice(array, index, (index += size));
          }
          return result;
        }
        function compact(array) {
          var index = -1,
              length = array ? array.length : 0,
              resIndex = -1,
              result = [];
          while (++index < length) {
            var value = array[index];
            if (value) {
              result[++resIndex] = value;
            }
          }
          return result;
        }
        var difference = restParam(function(array, values) {
          return (isObjectLike(array) && isArrayLike(array)) ? baseDifference(array, baseFlatten(values, false, true)) : [];
        });
        function drop(array, n, guard) {
          var length = array ? array.length : 0;
          if (!length) {
            return [];
          }
          if (guard ? isIterateeCall(array, n, guard) : n == null) {
            n = 1;
          }
          return baseSlice(array, n < 0 ? 0 : n);
        }
        function dropRight(array, n, guard) {
          var length = array ? array.length : 0;
          if (!length) {
            return [];
          }
          if (guard ? isIterateeCall(array, n, guard) : n == null) {
            n = 1;
          }
          n = length - (+n || 0);
          return baseSlice(array, 0, n < 0 ? 0 : n);
        }
        function dropRightWhile(array, predicate, thisArg) {
          return (array && array.length) ? baseWhile(array, getCallback(predicate, thisArg, 3), true, true) : [];
        }
        function dropWhile(array, predicate, thisArg) {
          return (array && array.length) ? baseWhile(array, getCallback(predicate, thisArg, 3), true) : [];
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
        var findIndex = createFindIndex();
        var findLastIndex = createFindIndex(true);
        function first(array) {
          return array ? array[0] : undefined;
        }
        function flatten(array, isDeep, guard) {
          var length = array ? array.length : 0;
          if (guard && isIterateeCall(array, isDeep, guard)) {
            isDeep = false;
          }
          return length ? baseFlatten(array, isDeep) : [];
        }
        function flattenDeep(array) {
          var length = array ? array.length : 0;
          return length ? baseFlatten(array, true) : [];
        }
        function indexOf(array, value, fromIndex) {
          var length = array ? array.length : 0;
          if (!length) {
            return -1;
          }
          if (typeof fromIndex == 'number') {
            fromIndex = fromIndex < 0 ? nativeMax(length + fromIndex, 0) : fromIndex;
          } else if (fromIndex) {
            var index = binaryIndex(array, value);
            if (index < length && (value === value ? (value === array[index]) : (array[index] !== array[index]))) {
              return index;
            }
            return -1;
          }
          return baseIndexOf(array, value, fromIndex || 0);
        }
        function initial(array) {
          return dropRight(array, 1);
        }
        var intersection = restParam(function(arrays) {
          var othLength = arrays.length,
              othIndex = othLength,
              caches = Array(length),
              indexOf = getIndexOf(),
              isCommon = indexOf == baseIndexOf,
              result = [];
          while (othIndex--) {
            var value = arrays[othIndex] = isArrayLike(value = arrays[othIndex]) ? value : [];
            caches[othIndex] = (isCommon && value.length >= 120) ? createCache(othIndex && value) : null;
          }
          var array = arrays[0],
              index = -1,
              length = array ? array.length : 0,
              seen = caches[0];
          outer: while (++index < length) {
            value = array[index];
            if ((seen ? cacheIndexOf(seen, value) : indexOf(result, value, 0)) < 0) {
              var othIndex = othLength;
              while (--othIndex) {
                var cache = caches[othIndex];
                if ((cache ? cacheIndexOf(cache, value) : indexOf(arrays[othIndex], value, 0)) < 0) {
                  continue outer;
                }
              }
              if (seen) {
                seen.push(value);
              }
              result.push(value);
            }
          }
          return result;
        });
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
          if (typeof fromIndex == 'number') {
            index = (fromIndex < 0 ? nativeMax(length + fromIndex, 0) : nativeMin(fromIndex || 0, length - 1)) + 1;
          } else if (fromIndex) {
            index = binaryIndex(array, value, true) - 1;
            var other = array[index];
            if (value === value ? (value === other) : (other !== other)) {
              return index;
            }
            return -1;
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
        function pull() {
          var args = arguments,
              array = args[0];
          if (!(array && array.length)) {
            return array;
          }
          var index = 0,
              indexOf = getIndexOf(),
              length = args.length;
          while (++index < length) {
            var fromIndex = 0,
                value = args[index];
            while ((fromIndex = indexOf(array, value, fromIndex)) > -1) {
              splice.call(array, fromIndex, 1);
            }
          }
          return array;
        }
        var pullAt = restParam(function(array, indexes) {
          indexes = baseFlatten(indexes);
          var result = baseAt(array, indexes);
          basePullAt(array, indexes.sort(baseCompareAscending));
          return result;
        });
        function remove(array, predicate, thisArg) {
          var result = [];
          if (!(array && array.length)) {
            return result;
          }
          var index = -1,
              indexes = [],
              length = array.length;
          predicate = getCallback(predicate, thisArg, 3);
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
        function rest(array) {
          return drop(array, 1);
        }
        function slice(array, start, end) {
          var length = array ? array.length : 0;
          if (!length) {
            return [];
          }
          if (end && typeof end != 'number' && isIterateeCall(array, start, end)) {
            start = 0;
            end = length;
          }
          return baseSlice(array, start, end);
        }
        var sortedIndex = createSortedIndex();
        var sortedLastIndex = createSortedIndex(true);
        function take(array, n, guard) {
          var length = array ? array.length : 0;
          if (!length) {
            return [];
          }
          if (guard ? isIterateeCall(array, n, guard) : n == null) {
            n = 1;
          }
          return baseSlice(array, 0, n < 0 ? 0 : n);
        }
        function takeRight(array, n, guard) {
          var length = array ? array.length : 0;
          if (!length) {
            return [];
          }
          if (guard ? isIterateeCall(array, n, guard) : n == null) {
            n = 1;
          }
          n = length - (+n || 0);
          return baseSlice(array, n < 0 ? 0 : n);
        }
        function takeRightWhile(array, predicate, thisArg) {
          return (array && array.length) ? baseWhile(array, getCallback(predicate, thisArg, 3), false, true) : [];
        }
        function takeWhile(array, predicate, thisArg) {
          return (array && array.length) ? baseWhile(array, getCallback(predicate, thisArg, 3)) : [];
        }
        var union = restParam(function(arrays) {
          return baseUniq(baseFlatten(arrays, false, true));
        });
        function uniq(array, isSorted, iteratee, thisArg) {
          var length = array ? array.length : 0;
          if (!length) {
            return [];
          }
          if (isSorted != null && typeof isSorted != 'boolean') {
            thisArg = iteratee;
            iteratee = isIterateeCall(array, isSorted, thisArg) ? undefined : isSorted;
            isSorted = false;
          }
          var callback = getCallback();
          if (!(iteratee == null && callback === baseCallback)) {
            iteratee = callback(iteratee, thisArg, 3);
          }
          return (isSorted && getIndexOf() == baseIndexOf) ? sortedUniq(array, iteratee) : baseUniq(array, iteratee);
        }
        function unzip(array) {
          if (!(array && array.length)) {
            return [];
          }
          var index = -1,
              length = 0;
          array = arrayFilter(array, function(group) {
            if (isArrayLike(group)) {
              length = nativeMax(group.length, length);
              return true;
            }
          });
          var result = Array(length);
          while (++index < length) {
            result[index] = arrayMap(array, baseProperty(index));
          }
          return result;
        }
        function unzipWith(array, iteratee, thisArg) {
          var length = array ? array.length : 0;
          if (!length) {
            return [];
          }
          var result = unzip(array);
          if (iteratee == null) {
            return result;
          }
          iteratee = bindCallback(iteratee, thisArg, 4);
          return arrayMap(result, function(group) {
            return arrayReduce(group, iteratee, undefined, true);
          });
        }
        var without = restParam(function(array, values) {
          return isArrayLike(array) ? baseDifference(array, values) : [];
        });
        function xor() {
          var index = -1,
              length = arguments.length;
          while (++index < length) {
            var array = arguments[index];
            if (isArrayLike(array)) {
              var result = result ? arrayPush(baseDifference(result, array), baseDifference(array, result)) : array;
            }
          }
          return result ? baseUniq(result) : [];
        }
        var zip = restParam(unzip);
        function zipObject(props, values) {
          var index = -1,
              length = props ? props.length : 0,
              result = {};
          if (length && !values && !isArray(props[0])) {
            values = [];
          }
          while (++index < length) {
            var key = props[index];
            if (values) {
              result[key] = values[index];
            } else if (key) {
              result[key[0]] = key[1];
            }
          }
          return result;
        }
        var zipWith = restParam(function(arrays) {
          var length = arrays.length,
              iteratee = length > 2 ? arrays[length - 2] : undefined,
              thisArg = length > 1 ? arrays[length - 1] : undefined;
          if (length > 2 && typeof iteratee == 'function') {
            length -= 2;
          } else {
            iteratee = (length > 1 && typeof thisArg == 'function') ? (--length, thisArg) : undefined;
            thisArg = undefined;
          }
          arrays.length = length;
          return unzipWith(arrays, iteratee, thisArg);
        });
        function chain(value) {
          var result = lodash(value);
          result.__chain__ = true;
          return result;
        }
        function tap(value, interceptor, thisArg) {
          interceptor.call(thisArg, value);
          return value;
        }
        function thru(value, interceptor, thisArg) {
          return interceptor.call(thisArg, value);
        }
        function wrapperChain() {
          return chain(this);
        }
        function wrapperCommit() {
          return new LodashWrapper(this.value(), this.__chain__);
        }
        var wrapperConcat = restParam(function(values) {
          values = baseFlatten(values);
          return this.thru(function(array) {
            return arrayConcat(isArray(array) ? array : [toObject(array)], values);
          });
        });
        function wrapperPlant(value) {
          var result,
              parent = this;
          while (parent instanceof baseLodash) {
            var clone = wrapperClone(parent);
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
          var interceptor = function(value) {
            return (wrapped && wrapped.__dir__ < 0) ? value : value.reverse();
          };
          if (value instanceof LazyWrapper) {
            var wrapped = value;
            if (this.__actions__.length) {
              wrapped = new LazyWrapper(this);
            }
            wrapped = wrapped.reverse();
            wrapped.__actions__.push({
              'func': thru,
              'args': [interceptor],
              'thisArg': undefined
            });
            return new LodashWrapper(wrapped, this.__chain__);
          }
          return this.thru(interceptor);
        }
        function wrapperToString() {
          return (this.value() + '');
        }
        function wrapperValue() {
          return baseWrapperValue(this.__wrapped__, this.__actions__);
        }
        var at = restParam(function(collection, props) {
          return baseAt(collection, baseFlatten(props));
        });
        var countBy = createAggregator(function(result, value, key) {
          hasOwnProperty.call(result, key) ? ++result[key] : (result[key] = 1);
        });
        function every(collection, predicate, thisArg) {
          var func = isArray(collection) ? arrayEvery : baseEvery;
          if (thisArg && isIterateeCall(collection, predicate, thisArg)) {
            predicate = undefined;
          }
          if (typeof predicate != 'function' || thisArg !== undefined) {
            predicate = getCallback(predicate, thisArg, 3);
          }
          return func(collection, predicate);
        }
        function filter(collection, predicate, thisArg) {
          var func = isArray(collection) ? arrayFilter : baseFilter;
          predicate = getCallback(predicate, thisArg, 3);
          return func(collection, predicate);
        }
        var find = createFind(baseEach);
        var findLast = createFind(baseEachRight, true);
        function findWhere(collection, source) {
          return find(collection, baseMatches(source));
        }
        var forEach = createForEach(arrayEach, baseEach);
        var forEachRight = createForEach(arrayEachRight, baseEachRight);
        var groupBy = createAggregator(function(result, value, key) {
          if (hasOwnProperty.call(result, key)) {
            result[key].push(value);
          } else {
            result[key] = [value];
          }
        });
        function includes(collection, target, fromIndex, guard) {
          var length = collection ? getLength(collection) : 0;
          if (!isLength(length)) {
            collection = values(collection);
            length = collection.length;
          }
          if (typeof fromIndex != 'number' || (guard && isIterateeCall(target, fromIndex, guard))) {
            fromIndex = 0;
          } else {
            fromIndex = fromIndex < 0 ? nativeMax(length + fromIndex, 0) : (fromIndex || 0);
          }
          return (typeof collection == 'string' || !isArray(collection) && isString(collection)) ? (fromIndex <= length && collection.indexOf(target, fromIndex) > -1) : (!!length && getIndexOf(collection, target, fromIndex) > -1);
        }
        var indexBy = createAggregator(function(result, value, key) {
          result[key] = value;
        });
        var invoke = restParam(function(collection, path, args) {
          var index = -1,
              isFunc = typeof path == 'function',
              isProp = isKey(path),
              result = isArrayLike(collection) ? Array(collection.length) : [];
          baseEach(collection, function(value) {
            var func = isFunc ? path : ((isProp && value != null) ? value[path] : undefined);
            result[++index] = func ? func.apply(value, args) : invokePath(value, path, args);
          });
          return result;
        });
        function map(collection, iteratee, thisArg) {
          var func = isArray(collection) ? arrayMap : baseMap;
          iteratee = getCallback(iteratee, thisArg, 3);
          return func(collection, iteratee);
        }
        var partition = createAggregator(function(result, value, key) {
          result[key ? 0 : 1].push(value);
        }, function() {
          return [[], []];
        });
        function pluck(collection, path) {
          return map(collection, property(path));
        }
        var reduce = createReduce(arrayReduce, baseEach);
        var reduceRight = createReduce(arrayReduceRight, baseEachRight);
        function reject(collection, predicate, thisArg) {
          var func = isArray(collection) ? arrayFilter : baseFilter;
          predicate = getCallback(predicate, thisArg, 3);
          return func(collection, function(value, index, collection) {
            return !predicate(value, index, collection);
          });
        }
        function sample(collection, n, guard) {
          if (guard ? isIterateeCall(collection, n, guard) : n == null) {
            collection = toIterable(collection);
            var length = collection.length;
            return length > 0 ? collection[baseRandom(0, length - 1)] : undefined;
          }
          var index = -1,
              result = toArray(collection),
              length = result.length,
              lastIndex = length - 1;
          n = nativeMin(n < 0 ? 0 : (+n || 0), length);
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
          return sample(collection, POSITIVE_INFINITY);
        }
        function size(collection) {
          var length = collection ? getLength(collection) : 0;
          return isLength(length) ? length : keys(collection).length;
        }
        function some(collection, predicate, thisArg) {
          var func = isArray(collection) ? arraySome : baseSome;
          if (thisArg && isIterateeCall(collection, predicate, thisArg)) {
            predicate = undefined;
          }
          if (typeof predicate != 'function' || thisArg !== undefined) {
            predicate = getCallback(predicate, thisArg, 3);
          }
          return func(collection, predicate);
        }
        function sortBy(collection, iteratee, thisArg) {
          if (collection == null) {
            return [];
          }
          if (thisArg && isIterateeCall(collection, iteratee, thisArg)) {
            iteratee = undefined;
          }
          var index = -1;
          iteratee = getCallback(iteratee, thisArg, 3);
          var result = baseMap(collection, function(value, key, collection) {
            return {
              'criteria': iteratee(value, key, collection),
              'index': ++index,
              'value': value
            };
          });
          return baseSortBy(result, compareAscending);
        }
        var sortByAll = restParam(function(collection, iteratees) {
          if (collection == null) {
            return [];
          }
          var guard = iteratees[2];
          if (guard && isIterateeCall(iteratees[0], iteratees[1], guard)) {
            iteratees.length = 1;
          }
          return baseSortByOrder(collection, baseFlatten(iteratees), []);
        });
        function sortByOrder(collection, iteratees, orders, guard) {
          if (collection == null) {
            return [];
          }
          if (guard && isIterateeCall(iteratees, orders, guard)) {
            orders = undefined;
          }
          if (!isArray(iteratees)) {
            iteratees = iteratees == null ? [] : [iteratees];
          }
          if (!isArray(orders)) {
            orders = orders == null ? [] : [orders];
          }
          return baseSortByOrder(collection, iteratees, orders);
        }
        function where(collection, source) {
          return filter(collection, baseMatches(source));
        }
        var now = nativeNow || function() {
          return new Date().getTime();
        };
        function after(n, func) {
          if (typeof func != 'function') {
            if (typeof n == 'function') {
              var temp = n;
              n = func;
              func = temp;
            } else {
              throw new TypeError(FUNC_ERROR_TEXT);
            }
          }
          n = nativeIsFinite(n = +n) ? n : 0;
          return function() {
            if (--n < 1) {
              return func.apply(this, arguments);
            }
          };
        }
        function ary(func, n, guard) {
          if (guard && isIterateeCall(func, n, guard)) {
            n = undefined;
          }
          n = (func && n == null) ? func.length : nativeMax(+n || 0, 0);
          return createWrapper(func, ARY_FLAG, undefined, undefined, undefined, undefined, n);
        }
        function before(n, func) {
          var result;
          if (typeof func != 'function') {
            if (typeof n == 'function') {
              var temp = n;
              n = func;
              func = temp;
            } else {
              throw new TypeError(FUNC_ERROR_TEXT);
            }
          }
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
        var bind = restParam(function(func, thisArg, partials) {
          var bitmask = BIND_FLAG;
          if (partials.length) {
            var holders = replaceHolders(partials, bind.placeholder);
            bitmask |= PARTIAL_FLAG;
          }
          return createWrapper(func, bitmask, thisArg, partials, holders);
        });
        var bindAll = restParam(function(object, methodNames) {
          methodNames = methodNames.length ? baseFlatten(methodNames) : functions(object);
          var index = -1,
              length = methodNames.length;
          while (++index < length) {
            var key = methodNames[index];
            object[key] = createWrapper(object[key], BIND_FLAG, object);
          }
          return object;
        });
        var bindKey = restParam(function(object, key, partials) {
          var bitmask = BIND_FLAG | BIND_KEY_FLAG;
          if (partials.length) {
            var holders = replaceHolders(partials, bindKey.placeholder);
            bitmask |= PARTIAL_FLAG;
          }
          return createWrapper(key, bitmask, object, partials, holders);
        });
        var curry = createCurry(CURRY_FLAG);
        var curryRight = createCurry(CURRY_RIGHT_FLAG);
        function debounce(func, wait, options) {
          var args,
              maxTimeoutId,
              result,
              stamp,
              thisArg,
              timeoutId,
              trailingCall,
              lastCalled = 0,
              maxWait = false,
              trailing = true;
          if (typeof func != 'function') {
            throw new TypeError(FUNC_ERROR_TEXT);
          }
          wait = wait < 0 ? 0 : (+wait || 0);
          if (options === true) {
            var leading = true;
            trailing = false;
          } else if (isObject(options)) {
            leading = !!options.leading;
            maxWait = 'maxWait' in options && nativeMax(+options.maxWait || 0, wait);
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
            maxTimeoutId = timeoutId = trailingCall = undefined;
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
              if (!maxTimeoutId && !leading) {
                lastCalled = stamp;
              }
              var remaining = maxWait - (stamp - lastCalled),
                  isCalled = remaining <= 0 || remaining > maxWait;
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
          return debounced;
        }
        var defer = restParam(function(func, args) {
          return baseDelay(func, 1, args);
        });
        var delay = restParam(function(func, wait, args) {
          return baseDelay(func, wait, args);
        });
        var flow = createFlow();
        var flowRight = createFlow(true);
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
        var modArgs = restParam(function(func, transforms) {
          transforms = baseFlatten(transforms);
          if (typeof func != 'function' || !arrayEvery(transforms, baseIsFunction)) {
            throw new TypeError(FUNC_ERROR_TEXT);
          }
          var length = transforms.length;
          return restParam(function(args) {
            var index = nativeMin(args.length, length);
            while (index--) {
              args[index] = transforms[index](args[index]);
            }
            return func.apply(this, args);
          });
        });
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
        var partial = createPartial(PARTIAL_FLAG);
        var partialRight = createPartial(PARTIAL_RIGHT_FLAG);
        var rearg = restParam(function(func, indexes) {
          return createWrapper(func, REARG_FLAG, undefined, undefined, undefined, baseFlatten(indexes));
        });
        function restParam(func, start) {
          if (typeof func != 'function') {
            throw new TypeError(FUNC_ERROR_TEXT);
          }
          start = nativeMax(start === undefined ? (func.length - 1) : (+start || 0), 0);
          return function() {
            var args = arguments,
                index = -1,
                length = nativeMax(args.length - start, 0),
                rest = Array(length);
            while (++index < length) {
              rest[index] = args[start + index];
            }
            switch (start) {
              case 0:
                return func.call(this, rest);
              case 1:
                return func.call(this, args[0], rest);
              case 2:
                return func.call(this, args[0], args[1], rest);
            }
            var otherArgs = Array(start + 1);
            index = -1;
            while (++index < start) {
              otherArgs[index] = args[index];
            }
            otherArgs[start] = rest;
            return func.apply(this, otherArgs);
          };
        }
        function spread(func) {
          if (typeof func != 'function') {
            throw new TypeError(FUNC_ERROR_TEXT);
          }
          return function(array) {
            return func.apply(this, array);
          };
        }
        function throttle(func, wait, options) {
          var leading = true,
              trailing = true;
          if (typeof func != 'function') {
            throw new TypeError(FUNC_ERROR_TEXT);
          }
          if (options === false) {
            leading = false;
          } else if (isObject(options)) {
            leading = 'leading' in options ? !!options.leading : leading;
            trailing = 'trailing' in options ? !!options.trailing : trailing;
          }
          return debounce(func, wait, {
            'leading': leading,
            'maxWait': +wait,
            'trailing': trailing
          });
        }
        function wrap(value, wrapper) {
          wrapper = wrapper == null ? identity : wrapper;
          return createWrapper(wrapper, PARTIAL_FLAG, undefined, [value], []);
        }
        function clone(value, isDeep, customizer, thisArg) {
          if (isDeep && typeof isDeep != 'boolean' && isIterateeCall(value, isDeep, customizer)) {
            isDeep = false;
          } else if (typeof isDeep == 'function') {
            thisArg = customizer;
            customizer = isDeep;
            isDeep = false;
          }
          return typeof customizer == 'function' ? baseClone(value, isDeep, bindCallback(customizer, thisArg, 1)) : baseClone(value, isDeep);
        }
        function cloneDeep(value, customizer, thisArg) {
          return typeof customizer == 'function' ? baseClone(value, true, bindCallback(customizer, thisArg, 1)) : baseClone(value, true);
        }
        function gt(value, other) {
          return value > other;
        }
        function gte(value, other) {
          return value >= other;
        }
        function isArguments(value) {
          return isObjectLike(value) && isArrayLike(value) && hasOwnProperty.call(value, 'callee') && !propertyIsEnumerable.call(value, 'callee');
        }
        var isArray = nativeIsArray || function(value) {
          return isObjectLike(value) && isLength(value.length) && objToString.call(value) == arrayTag;
        };
        function isBoolean(value) {
          return value === true || value === false || (isObjectLike(value) && objToString.call(value) == boolTag);
        }
        function isDate(value) {
          return isObjectLike(value) && objToString.call(value) == dateTag;
        }
        function isElement(value) {
          return !!value && value.nodeType === 1 && isObjectLike(value) && !isPlainObject(value);
        }
        function isEmpty(value) {
          if (value == null) {
            return true;
          }
          if (isArrayLike(value) && (isArray(value) || isString(value) || isArguments(value) || (isObjectLike(value) && isFunction(value.splice)))) {
            return !value.length;
          }
          return !keys(value).length;
        }
        function isEqual(value, other, customizer, thisArg) {
          customizer = typeof customizer == 'function' ? bindCallback(customizer, thisArg, 3) : undefined;
          var result = customizer ? customizer(value, other) : undefined;
          return result === undefined ? baseIsEqual(value, other, customizer) : !!result;
        }
        function isError(value) {
          return isObjectLike(value) && typeof value.message == 'string' && objToString.call(value) == errorTag;
        }
        function isFinite(value) {
          return typeof value == 'number' && nativeIsFinite(value);
        }
        function isFunction(value) {
          return isObject(value) && objToString.call(value) == funcTag;
        }
        function isObject(value) {
          var type = typeof value;
          return !!value && (type == 'object' || type == 'function');
        }
        function isMatch(object, source, customizer, thisArg) {
          customizer = typeof customizer == 'function' ? bindCallback(customizer, thisArg, 3) : undefined;
          return baseIsMatch(object, getMatchData(source), customizer);
        }
        function isNaN(value) {
          return isNumber(value) && value != +value;
        }
        function isNative(value) {
          if (value == null) {
            return false;
          }
          if (isFunction(value)) {
            return reIsNative.test(fnToString.call(value));
          }
          return isObjectLike(value) && reIsHostCtor.test(value);
        }
        function isNull(value) {
          return value === null;
        }
        function isNumber(value) {
          return typeof value == 'number' || (isObjectLike(value) && objToString.call(value) == numberTag);
        }
        function isPlainObject(value) {
          var Ctor;
          if (!(isObjectLike(value) && objToString.call(value) == objectTag && !isArguments(value)) || (!hasOwnProperty.call(value, 'constructor') && (Ctor = value.constructor, typeof Ctor == 'function' && !(Ctor instanceof Ctor)))) {
            return false;
          }
          var result;
          baseForIn(value, function(subValue, key) {
            result = key;
          });
          return result === undefined || hasOwnProperty.call(value, result);
        }
        function isRegExp(value) {
          return isObject(value) && objToString.call(value) == regexpTag;
        }
        function isString(value) {
          return typeof value == 'string' || (isObjectLike(value) && objToString.call(value) == stringTag);
        }
        function isTypedArray(value) {
          return isObjectLike(value) && isLength(value.length) && !!typedArrayTags[objToString.call(value)];
        }
        function isUndefined(value) {
          return value === undefined;
        }
        function lt(value, other) {
          return value < other;
        }
        function lte(value, other) {
          return value <= other;
        }
        function toArray(value) {
          var length = value ? getLength(value) : 0;
          if (!isLength(length)) {
            return values(value);
          }
          if (!length) {
            return [];
          }
          return arrayCopy(value);
        }
        function toPlainObject(value) {
          return baseCopy(value, keysIn(value));
        }
        var merge = createAssigner(baseMerge);
        var assign = createAssigner(function(object, source, customizer) {
          return customizer ? assignWith(object, source, customizer) : baseAssign(object, source);
        });
        function create(prototype, properties, guard) {
          var result = baseCreate(prototype);
          if (guard && isIterateeCall(prototype, properties, guard)) {
            properties = undefined;
          }
          return properties ? baseAssign(result, properties) : result;
        }
        var defaults = createDefaults(assign, assignDefaults);
        var defaultsDeep = createDefaults(merge, mergeDefaults);
        var findKey = createFindKey(baseForOwn);
        var findLastKey = createFindKey(baseForOwnRight);
        var forIn = createForIn(baseFor);
        var forInRight = createForIn(baseForRight);
        var forOwn = createForOwn(baseForOwn);
        var forOwnRight = createForOwn(baseForOwnRight);
        function functions(object) {
          return baseFunctions(object, keysIn(object));
        }
        function get(object, path, defaultValue) {
          var result = object == null ? undefined : baseGet(object, toPath(path), path + '');
          return result === undefined ? defaultValue : result;
        }
        function has(object, path) {
          if (object == null) {
            return false;
          }
          var result = hasOwnProperty.call(object, path);
          if (!result && !isKey(path)) {
            path = toPath(path);
            object = path.length == 1 ? object : baseGet(object, baseSlice(path, 0, -1));
            if (object == null) {
              return false;
            }
            path = last(path);
            result = hasOwnProperty.call(object, path);
          }
          return result || (isLength(object.length) && isIndex(path, object.length) && (isArray(object) || isArguments(object)));
        }
        function invert(object, multiValue, guard) {
          if (guard && isIterateeCall(object, multiValue, guard)) {
            multiValue = undefined;
          }
          var index = -1,
              props = keys(object),
              length = props.length,
              result = {};
          while (++index < length) {
            var key = props[index],
                value = object[key];
            if (multiValue) {
              if (hasOwnProperty.call(result, value)) {
                result[value].push(key);
              } else {
                result[value] = [key];
              }
            } else {
              result[value] = key;
            }
          }
          return result;
        }
        var keys = !nativeKeys ? shimKeys : function(object) {
          var Ctor = object == null ? undefined : object.constructor;
          if ((typeof Ctor == 'function' && Ctor.prototype === object) || (typeof object != 'function' && isArrayLike(object))) {
            return shimKeys(object);
          }
          return isObject(object) ? nativeKeys(object) : [];
        };
        function keysIn(object) {
          if (object == null) {
            return [];
          }
          if (!isObject(object)) {
            object = Object(object);
          }
          var length = object.length;
          length = (length && isLength(length) && (isArray(object) || isArguments(object)) && length) || 0;
          var Ctor = object.constructor,
              index = -1,
              isProto = typeof Ctor == 'function' && Ctor.prototype === object,
              result = Array(length),
              skipIndexes = length > 0;
          while (++index < length) {
            result[index] = (index + '');
          }
          for (var key in object) {
            if (!(skipIndexes && isIndex(key, length)) && !(key == 'constructor' && (isProto || !hasOwnProperty.call(object, key)))) {
              result.push(key);
            }
          }
          return result;
        }
        var mapKeys = createObjectMapper(true);
        var mapValues = createObjectMapper();
        var omit = restParam(function(object, props) {
          if (object == null) {
            return {};
          }
          if (typeof props[0] != 'function') {
            var props = arrayMap(baseFlatten(props), String);
            return pickByArray(object, baseDifference(keysIn(object), props));
          }
          var predicate = bindCallback(props[0], props[1], 3);
          return pickByCallback(object, function(value, key, object) {
            return !predicate(value, key, object);
          });
        });
        function pairs(object) {
          object = toObject(object);
          var index = -1,
              props = keys(object),
              length = props.length,
              result = Array(length);
          while (++index < length) {
            var key = props[index];
            result[index] = [key, object[key]];
          }
          return result;
        }
        var pick = restParam(function(object, props) {
          if (object == null) {
            return {};
          }
          return typeof props[0] == 'function' ? pickByCallback(object, bindCallback(props[0], props[1], 3)) : pickByArray(object, baseFlatten(props));
        });
        function result(object, path, defaultValue) {
          var result = object == null ? undefined : object[path];
          if (result === undefined) {
            if (object != null && !isKey(path, object)) {
              path = toPath(path);
              object = path.length == 1 ? object : baseGet(object, baseSlice(path, 0, -1));
              result = object == null ? undefined : object[last(path)];
            }
            result = result === undefined ? defaultValue : result;
          }
          return isFunction(result) ? result.call(object) : result;
        }
        function set(object, path, value) {
          if (object == null) {
            return object;
          }
          var pathKey = (path + '');
          path = (object[pathKey] != null || isKey(path, object)) ? [pathKey] : toPath(path);
          var index = -1,
              length = path.length,
              lastIndex = length - 1,
              nested = object;
          while (nested != null && ++index < length) {
            var key = path[index];
            if (isObject(nested)) {
              if (index == lastIndex) {
                nested[key] = value;
              } else if (nested[key] == null) {
                nested[key] = isIndex(path[index + 1]) ? [] : {};
              }
            }
            nested = nested[key];
          }
          return object;
        }
        function transform(object, iteratee, accumulator, thisArg) {
          var isArr = isArray(object) || isTypedArray(object);
          iteratee = getCallback(iteratee, thisArg, 4);
          if (accumulator == null) {
            if (isArr || isObject(object)) {
              var Ctor = object.constructor;
              if (isArr) {
                accumulator = isArray(object) ? new Ctor : [];
              } else {
                accumulator = baseCreate(isFunction(Ctor) ? Ctor.prototype : undefined);
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
        function values(object) {
          return baseValues(object, keys(object));
        }
        function valuesIn(object) {
          return baseValues(object, keysIn(object));
        }
        function inRange(value, start, end) {
          start = +start || 0;
          if (end === undefined) {
            end = start;
            start = 0;
          } else {
            end = +end || 0;
          }
          return value >= nativeMin(start, end) && value < nativeMax(start, end);
        }
        function random(min, max, floating) {
          if (floating && isIterateeCall(min, max, floating)) {
            max = floating = undefined;
          }
          var noMin = min == null,
              noMax = max == null;
          if (floating == null) {
            if (noMax && typeof min == 'boolean') {
              floating = min;
              min = 1;
            } else if (typeof max == 'boolean') {
              floating = max;
              noMax = true;
            }
          }
          if (noMin && noMax) {
            max = 1;
            noMax = false;
          }
          min = +min || 0;
          if (noMax) {
            max = min;
            min = 0;
          } else {
            max = +max || 0;
          }
          if (floating || min % 1 || max % 1) {
            var rand = nativeRandom();
            return nativeMin(min + (rand * (max - min + parseFloat('1e-' + ((rand + '').length - 1)))), max);
          }
          return baseRandom(min, max);
        }
        var camelCase = createCompounder(function(result, word, index) {
          word = word.toLowerCase();
          return result + (index ? (word.charAt(0).toUpperCase() + word.slice(1)) : word);
        });
        function capitalize(string) {
          string = baseToString(string);
          return string && (string.charAt(0).toUpperCase() + string.slice(1));
        }
        function deburr(string) {
          string = baseToString(string);
          return string && string.replace(reLatin1, deburrLetter).replace(reComboMark, '');
        }
        function endsWith(string, target, position) {
          string = baseToString(string);
          target = (target + '');
          var length = string.length;
          position = position === undefined ? length : nativeMin(position < 0 ? 0 : (+position || 0), length);
          position -= target.length;
          return position >= 0 && string.indexOf(target, position) == position;
        }
        function escape(string) {
          string = baseToString(string);
          return (string && reHasUnescapedHtml.test(string)) ? string.replace(reUnescapedHtml, escapeHtmlChar) : string;
        }
        function escapeRegExp(string) {
          string = baseToString(string);
          return (string && reHasRegExpChars.test(string)) ? string.replace(reRegExpChars, escapeRegExpChar) : (string || '(?:)');
        }
        var kebabCase = createCompounder(function(result, word, index) {
          return result + (index ? '-' : '') + word.toLowerCase();
        });
        function pad(string, length, chars) {
          string = baseToString(string);
          length = +length;
          var strLength = string.length;
          if (strLength >= length || !nativeIsFinite(length)) {
            return string;
          }
          var mid = (length - strLength) / 2,
              leftLength = nativeFloor(mid),
              rightLength = nativeCeil(mid);
          chars = createPadding('', rightLength, chars);
          return chars.slice(0, leftLength) + string + chars;
        }
        var padLeft = createPadDir();
        var padRight = createPadDir(true);
        function parseInt(string, radix, guard) {
          if (guard ? isIterateeCall(string, radix, guard) : radix == null) {
            radix = 0;
          } else if (radix) {
            radix = +radix;
          }
          string = trim(string);
          return nativeParseInt(string, radix || (reHasHexPrefix.test(string) ? 16 : 10));
        }
        function repeat(string, n) {
          var result = '';
          string = baseToString(string);
          n = +n;
          if (n < 1 || !string || !nativeIsFinite(n)) {
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
        var snakeCase = createCompounder(function(result, word, index) {
          return result + (index ? '_' : '') + word.toLowerCase();
        });
        var startCase = createCompounder(function(result, word, index) {
          return result + (index ? ' ' : '') + (word.charAt(0).toUpperCase() + word.slice(1));
        });
        function startsWith(string, target, position) {
          string = baseToString(string);
          position = position == null ? 0 : nativeMin(position < 0 ? 0 : (+position || 0), string.length);
          return string.lastIndexOf(target, position) == position;
        }
        function template(string, options, otherOptions) {
          var settings = lodash.templateSettings;
          if (otherOptions && isIterateeCall(string, options, otherOptions)) {
            options = otherOptions = undefined;
          }
          string = baseToString(string);
          options = assignWith(baseAssign({}, otherOptions || options), settings, assignOwnDefaults);
          var imports = assignWith(baseAssign({}, options.imports), settings.imports, assignOwnDefaults),
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
        function trim(string, chars, guard) {
          var value = string;
          string = baseToString(string);
          if (!string) {
            return string;
          }
          if (guard ? isIterateeCall(value, chars, guard) : chars == null) {
            return string.slice(trimmedLeftIndex(string), trimmedRightIndex(string) + 1);
          }
          chars = (chars + '');
          return string.slice(charsLeftIndex(string, chars), charsRightIndex(string, chars) + 1);
        }
        function trimLeft(string, chars, guard) {
          var value = string;
          string = baseToString(string);
          if (!string) {
            return string;
          }
          if (guard ? isIterateeCall(value, chars, guard) : chars == null) {
            return string.slice(trimmedLeftIndex(string));
          }
          return string.slice(charsLeftIndex(string, (chars + '')));
        }
        function trimRight(string, chars, guard) {
          var value = string;
          string = baseToString(string);
          if (!string) {
            return string;
          }
          if (guard ? isIterateeCall(value, chars, guard) : chars == null) {
            return string.slice(0, trimmedRightIndex(string) + 1);
          }
          return string.slice(0, charsRightIndex(string, (chars + '')) + 1);
        }
        function trunc(string, options, guard) {
          if (guard && isIterateeCall(string, options, guard)) {
            options = undefined;
          }
          var length = DEFAULT_TRUNC_LENGTH,
              omission = DEFAULT_TRUNC_OMISSION;
          if (options != null) {
            if (isObject(options)) {
              var separator = 'separator' in options ? options.separator : separator;
              length = 'length' in options ? (+options.length || 0) : length;
              omission = 'omission' in options ? baseToString(options.omission) : omission;
            } else {
              length = +options || 0;
            }
          }
          string = baseToString(string);
          if (length >= string.length) {
            return string;
          }
          var end = length - omission.length;
          if (end < 1) {
            return omission;
          }
          var result = string.slice(0, end);
          if (separator == null) {
            return result + omission;
          }
          if (isRegExp(separator)) {
            if (string.slice(end).search(separator)) {
              var match,
                  newEnd,
                  substring = string.slice(0, end);
              if (!separator.global) {
                separator = RegExp(separator.source, (reFlags.exec(separator) || '') + 'g');
              }
              separator.lastIndex = 0;
              while ((match = separator.exec(substring))) {
                newEnd = match.index;
              }
              result = result.slice(0, newEnd == null ? end : newEnd);
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
          string = baseToString(string);
          return (string && reHasEscapedHtml.test(string)) ? string.replace(reEscapedHtml, unescapeHtmlChar) : string;
        }
        function words(string, pattern, guard) {
          if (guard && isIterateeCall(string, pattern, guard)) {
            pattern = undefined;
          }
          string = baseToString(string);
          return string.match(pattern || reWords) || [];
        }
        var attempt = restParam(function(func, args) {
          try {
            return func.apply(undefined, args);
          } catch (e) {
            return isError(e) ? e : new Error(e);
          }
        });
        function callback(func, thisArg, guard) {
          if (guard && isIterateeCall(func, thisArg, guard)) {
            thisArg = undefined;
          }
          return isObjectLike(func) ? matches(func) : baseCallback(func, thisArg);
        }
        function constant(value) {
          return function() {
            return value;
          };
        }
        function identity(value) {
          return value;
        }
        function matches(source) {
          return baseMatches(baseClone(source, true));
        }
        function matchesProperty(path, srcValue) {
          return baseMatchesProperty(path, baseClone(srcValue, true));
        }
        var method = restParam(function(path, args) {
          return function(object) {
            return invokePath(object, path, args);
          };
        });
        var methodOf = restParam(function(object, args) {
          return function(path) {
            return invokePath(object, path, args);
          };
        });
        function mixin(object, source, options) {
          if (options == null) {
            var isObj = isObject(source),
                props = isObj ? keys(source) : undefined,
                methodNames = (props && props.length) ? baseFunctions(source, props) : undefined;
            if (!(methodNames ? methodNames.length : isObj)) {
              methodNames = false;
              options = source;
              source = object;
              object = this;
            }
          }
          if (!methodNames) {
            methodNames = baseFunctions(source, keys(source));
          }
          var chain = true,
              index = -1,
              isFunc = isFunction(object),
              length = methodNames.length;
          if (options === false) {
            chain = false;
          } else if (isObject(options) && 'chain' in options) {
            chain = options.chain;
          }
          while (++index < length) {
            var methodName = methodNames[index],
                func = source[methodName];
            object[methodName] = func;
            if (isFunc) {
              object.prototype[methodName] = (function(func) {
                return function() {
                  var chainAll = this.__chain__;
                  if (chain || chainAll) {
                    var result = object(this.__wrapped__),
                        actions = result.__actions__ = arrayCopy(this.__actions__);
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
              }(func));
            }
          }
          return object;
        }
        function noConflict() {
          root._ = oldDash;
          return this;
        }
        function noop() {}
        function property(path) {
          return isKey(path) ? baseProperty(path) : basePropertyDeep(path);
        }
        function propertyOf(object) {
          return function(path) {
            return baseGet(object, toPath(path), path + '');
          };
        }
        function range(start, end, step) {
          if (step && isIterateeCall(start, end, step)) {
            end = step = undefined;
          }
          start = +start || 0;
          step = step == null ? 1 : (+step || 0);
          if (end == null) {
            end = start;
            start = 0;
          } else {
            end = +end || 0;
          }
          var index = -1,
              length = nativeMax(nativeCeil((end - start) / (step || 1)), 0),
              result = Array(length);
          while (++index < length) {
            result[index] = start;
            start += step;
          }
          return result;
        }
        function times(n, iteratee, thisArg) {
          n = nativeFloor(n);
          if (n < 1 || !nativeIsFinite(n)) {
            return [];
          }
          var index = -1,
              result = Array(nativeMin(n, MAX_ARRAY_LENGTH));
          iteratee = bindCallback(iteratee, thisArg, 1);
          while (++index < n) {
            if (index < MAX_ARRAY_LENGTH) {
              result[index] = iteratee(index);
            } else {
              iteratee(index);
            }
          }
          return result;
        }
        function uniqueId(prefix) {
          var id = ++idCounter;
          return baseToString(prefix) + id;
        }
        function add(augend, addend) {
          return (+augend || 0) + (+addend || 0);
        }
        var ceil = createRound('ceil');
        var floor = createRound('floor');
        var max = createExtremum(gt, NEGATIVE_INFINITY);
        var min = createExtremum(lt, POSITIVE_INFINITY);
        var round = createRound('round');
        function sum(collection, iteratee, thisArg) {
          if (thisArg && isIterateeCall(collection, iteratee, thisArg)) {
            iteratee = undefined;
          }
          iteratee = getCallback(iteratee, thisArg, 3);
          return iteratee.length == 1 ? arraySum(isArray(collection) ? collection : toIterable(collection), iteratee) : baseSum(collection, iteratee);
        }
        lodash.prototype = baseLodash.prototype;
        LodashWrapper.prototype = baseCreate(baseLodash.prototype);
        LodashWrapper.prototype.constructor = LodashWrapper;
        LazyWrapper.prototype = baseCreate(baseLodash.prototype);
        LazyWrapper.prototype.constructor = LazyWrapper;
        MapCache.prototype['delete'] = mapDelete;
        MapCache.prototype.get = mapGet;
        MapCache.prototype.has = mapHas;
        MapCache.prototype.set = mapSet;
        SetCache.prototype.push = cachePush;
        memoize.Cache = MapCache;
        lodash.after = after;
        lodash.ary = ary;
        lodash.assign = assign;
        lodash.at = at;
        lodash.before = before;
        lodash.bind = bind;
        lodash.bindAll = bindAll;
        lodash.bindKey = bindKey;
        lodash.callback = callback;
        lodash.chain = chain;
        lodash.chunk = chunk;
        lodash.compact = compact;
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
        lodash.drop = drop;
        lodash.dropRight = dropRight;
        lodash.dropRightWhile = dropRightWhile;
        lodash.dropWhile = dropWhile;
        lodash.fill = fill;
        lodash.filter = filter;
        lodash.flatten = flatten;
        lodash.flattenDeep = flattenDeep;
        lodash.flow = flow;
        lodash.flowRight = flowRight;
        lodash.forEach = forEach;
        lodash.forEachRight = forEachRight;
        lodash.forIn = forIn;
        lodash.forInRight = forInRight;
        lodash.forOwn = forOwn;
        lodash.forOwnRight = forOwnRight;
        lodash.functions = functions;
        lodash.groupBy = groupBy;
        lodash.indexBy = indexBy;
        lodash.initial = initial;
        lodash.intersection = intersection;
        lodash.invert = invert;
        lodash.invoke = invoke;
        lodash.keys = keys;
        lodash.keysIn = keysIn;
        lodash.map = map;
        lodash.mapKeys = mapKeys;
        lodash.mapValues = mapValues;
        lodash.matches = matches;
        lodash.matchesProperty = matchesProperty;
        lodash.memoize = memoize;
        lodash.merge = merge;
        lodash.method = method;
        lodash.methodOf = methodOf;
        lodash.mixin = mixin;
        lodash.modArgs = modArgs;
        lodash.negate = negate;
        lodash.omit = omit;
        lodash.once = once;
        lodash.pairs = pairs;
        lodash.partial = partial;
        lodash.partialRight = partialRight;
        lodash.partition = partition;
        lodash.pick = pick;
        lodash.pluck = pluck;
        lodash.property = property;
        lodash.propertyOf = propertyOf;
        lodash.pull = pull;
        lodash.pullAt = pullAt;
        lodash.range = range;
        lodash.rearg = rearg;
        lodash.reject = reject;
        lodash.remove = remove;
        lodash.rest = rest;
        lodash.restParam = restParam;
        lodash.set = set;
        lodash.shuffle = shuffle;
        lodash.slice = slice;
        lodash.sortBy = sortBy;
        lodash.sortByAll = sortByAll;
        lodash.sortByOrder = sortByOrder;
        lodash.spread = spread;
        lodash.take = take;
        lodash.takeRight = takeRight;
        lodash.takeRightWhile = takeRightWhile;
        lodash.takeWhile = takeWhile;
        lodash.tap = tap;
        lodash.throttle = throttle;
        lodash.thru = thru;
        lodash.times = times;
        lodash.toArray = toArray;
        lodash.toPlainObject = toPlainObject;
        lodash.transform = transform;
        lodash.union = union;
        lodash.uniq = uniq;
        lodash.unzip = unzip;
        lodash.unzipWith = unzipWith;
        lodash.values = values;
        lodash.valuesIn = valuesIn;
        lodash.where = where;
        lodash.without = without;
        lodash.wrap = wrap;
        lodash.xor = xor;
        lodash.zip = zip;
        lodash.zipObject = zipObject;
        lodash.zipWith = zipWith;
        lodash.backflow = flowRight;
        lodash.collect = map;
        lodash.compose = flowRight;
        lodash.each = forEach;
        lodash.eachRight = forEachRight;
        lodash.extend = assign;
        lodash.iteratee = callback;
        lodash.methods = functions;
        lodash.object = zipObject;
        lodash.select = filter;
        lodash.tail = rest;
        lodash.unique = uniq;
        mixin(lodash, lodash);
        lodash.add = add;
        lodash.attempt = attempt;
        lodash.camelCase = camelCase;
        lodash.capitalize = capitalize;
        lodash.ceil = ceil;
        lodash.clone = clone;
        lodash.cloneDeep = cloneDeep;
        lodash.deburr = deburr;
        lodash.endsWith = endsWith;
        lodash.escape = escape;
        lodash.escapeRegExp = escapeRegExp;
        lodash.every = every;
        lodash.find = find;
        lodash.findIndex = findIndex;
        lodash.findKey = findKey;
        lodash.findLast = findLast;
        lodash.findLastIndex = findLastIndex;
        lodash.findLastKey = findLastKey;
        lodash.findWhere = findWhere;
        lodash.first = first;
        lodash.floor = floor;
        lodash.get = get;
        lodash.gt = gt;
        lodash.gte = gte;
        lodash.has = has;
        lodash.identity = identity;
        lodash.includes = includes;
        lodash.indexOf = indexOf;
        lodash.inRange = inRange;
        lodash.isArguments = isArguments;
        lodash.isArray = isArray;
        lodash.isBoolean = isBoolean;
        lodash.isDate = isDate;
        lodash.isElement = isElement;
        lodash.isEmpty = isEmpty;
        lodash.isEqual = isEqual;
        lodash.isError = isError;
        lodash.isFinite = isFinite;
        lodash.isFunction = isFunction;
        lodash.isMatch = isMatch;
        lodash.isNaN = isNaN;
        lodash.isNative = isNative;
        lodash.isNull = isNull;
        lodash.isNumber = isNumber;
        lodash.isObject = isObject;
        lodash.isPlainObject = isPlainObject;
        lodash.isRegExp = isRegExp;
        lodash.isString = isString;
        lodash.isTypedArray = isTypedArray;
        lodash.isUndefined = isUndefined;
        lodash.kebabCase = kebabCase;
        lodash.last = last;
        lodash.lastIndexOf = lastIndexOf;
        lodash.lt = lt;
        lodash.lte = lte;
        lodash.max = max;
        lodash.min = min;
        lodash.noConflict = noConflict;
        lodash.noop = noop;
        lodash.now = now;
        lodash.pad = pad;
        lodash.padLeft = padLeft;
        lodash.padRight = padRight;
        lodash.parseInt = parseInt;
        lodash.random = random;
        lodash.reduce = reduce;
        lodash.reduceRight = reduceRight;
        lodash.repeat = repeat;
        lodash.result = result;
        lodash.round = round;
        lodash.runInContext = runInContext;
        lodash.size = size;
        lodash.snakeCase = snakeCase;
        lodash.some = some;
        lodash.sortedIndex = sortedIndex;
        lodash.sortedLastIndex = sortedLastIndex;
        lodash.startCase = startCase;
        lodash.startsWith = startsWith;
        lodash.sum = sum;
        lodash.template = template;
        lodash.trim = trim;
        lodash.trimLeft = trimLeft;
        lodash.trimRight = trimRight;
        lodash.trunc = trunc;
        lodash.unescape = unescape;
        lodash.uniqueId = uniqueId;
        lodash.words = words;
        lodash.all = every;
        lodash.any = some;
        lodash.contains = includes;
        lodash.eq = isEqual;
        lodash.detect = find;
        lodash.foldl = reduce;
        lodash.foldr = reduceRight;
        lodash.head = first;
        lodash.include = includes;
        lodash.inject = reduce;
        mixin(lodash, (function() {
          var source = {};
          baseForOwn(lodash, function(func, methodName) {
            if (!lodash.prototype[methodName]) {
              source[methodName] = func;
            }
          });
          return source;
        }()), false);
        lodash.sample = sample;
        lodash.prototype.sample = function(n) {
          if (!this.__chain__ && n == null) {
            return sample(this.value());
          }
          return this.thru(function(value) {
            return sample(value, n);
          });
        };
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
            n = n == null ? 1 : nativeMax(nativeFloor(n) || 0, 0);
            var result = this.clone();
            if (filtered) {
              result.__takeCount__ = nativeMin(result.__takeCount__, n);
            } else {
              result.__views__.push({
                'size': n,
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
              isFilter = type != LAZY_MAP_FLAG;
          LazyWrapper.prototype[methodName] = function(iteratee, thisArg) {
            var result = this.clone();
            result.__iteratees__.push({
              'iteratee': getCallback(iteratee, thisArg, 1),
              'type': type
            });
            result.__filtered__ = result.__filtered__ || isFilter;
            return result;
          };
        });
        arrayEach(['first', 'last'], function(methodName, index) {
          var takeName = 'take' + (index ? 'Right' : '');
          LazyWrapper.prototype[methodName] = function() {
            return this[takeName](1).value()[0];
          };
        });
        arrayEach(['initial', 'rest'], function(methodName, index) {
          var dropName = 'drop' + (index ? '' : 'Right');
          LazyWrapper.prototype[methodName] = function() {
            return this.__filtered__ ? new LazyWrapper(this) : this[dropName](1);
          };
        });
        arrayEach(['pluck', 'where'], function(methodName, index) {
          var operationName = index ? 'filter' : 'map',
              createCallback = index ? baseMatches : property;
          LazyWrapper.prototype[methodName] = function(value) {
            return this[operationName](createCallback(value));
          };
        });
        LazyWrapper.prototype.compact = function() {
          return this.filter(identity);
        };
        LazyWrapper.prototype.reject = function(predicate, thisArg) {
          predicate = getCallback(predicate, thisArg, 1);
          return this.filter(function(value) {
            return !predicate(value);
          });
        };
        LazyWrapper.prototype.slice = function(start, end) {
          start = start == null ? 0 : (+start || 0);
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
            end = (+end || 0);
            result = end < 0 ? result.dropRight(-end) : result.take(end - start);
          }
          return result;
        };
        LazyWrapper.prototype.takeRightWhile = function(predicate, thisArg) {
          return this.reverse().takeWhile(predicate, thisArg).reverse();
        };
        LazyWrapper.prototype.toArray = function() {
          return this.take(POSITIVE_INFINITY);
        };
        baseForOwn(LazyWrapper.prototype, function(func, methodName) {
          var checkIteratee = /^(?:filter|map|reject)|While$/.test(methodName),
              retUnwrapped = /^(?:first|last)$/.test(methodName),
              lodashFunc = lodash[retUnwrapped ? ('take' + (methodName == 'last' ? 'Right' : '')) : methodName];
          if (!lodashFunc) {
            return;
          }
          lodash.prototype[methodName] = function() {
            var args = retUnwrapped ? [1] : arguments,
                chainAll = this.__chain__,
                value = this.__wrapped__,
                isHybrid = !!this.__actions__.length,
                isLazy = value instanceof LazyWrapper,
                iteratee = args[0],
                useLazy = isLazy || isArray(value);
            if (useLazy && checkIteratee && typeof iteratee == 'function' && iteratee.length != 1) {
              isLazy = useLazy = false;
            }
            var interceptor = function(value) {
              return (retUnwrapped && chainAll) ? lodashFunc(value, 1)[0] : lodashFunc.apply(undefined, arrayPush([value], args));
            };
            var action = {
              'func': thru,
              'args': [interceptor],
              'thisArg': undefined
            },
                onlyLazy = isLazy && !isHybrid;
            if (retUnwrapped && !chainAll) {
              if (onlyLazy) {
                value = value.clone();
                value.__actions__.push(action);
                return func.call(value);
              }
              return lodashFunc.call(undefined, this.value())[0];
            }
            if (!retUnwrapped && useLazy) {
              value = onlyLazy ? value : new LazyWrapper(this);
              var result = func.apply(value, args);
              result.__actions__.push(action);
              return new LodashWrapper(result, chainAll);
            }
            return this.thru(interceptor);
          };
        });
        arrayEach(['join', 'pop', 'push', 'replace', 'shift', 'sort', 'splice', 'split', 'unshift'], function(methodName) {
          var func = (/^(?:replace|split)$/.test(methodName) ? stringProto : arrayProto)[methodName],
              chainName = /^(?:push|sort|unshift)$/.test(methodName) ? 'tap' : 'thru',
              retUnwrapped = /^(?:join|pop|replace|shift)$/.test(methodName);
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
            var key = lodashFunc.name,
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
        lodash.prototype.chain = wrapperChain;
        lodash.prototype.commit = wrapperCommit;
        lodash.prototype.concat = wrapperConcat;
        lodash.prototype.plant = wrapperPlant;
        lodash.prototype.reverse = wrapperReverse;
        lodash.prototype.toString = wrapperToString;
        lodash.prototype.run = lodash.prototype.toJSON = lodash.prototype.valueOf = lodash.prototype.value = wrapperValue;
        lodash.prototype.collect = lodash.prototype.map;
        lodash.prototype.head = lodash.prototype.first;
        lodash.prototype.select = lodash.prototype.filter;
        lodash.prototype.tail = lodash.prototype.rest;
        return lodash;
      }
      var _ = runInContext();
      if (typeof define == 'function' && typeof define.amd == 'object' && define.amd) {
        root._ = _;
        define(function() {
          return _;
        });
      } else if (freeExports && freeModule) {
        if (moduleExports) {
          (freeModule.exports = _)._ = _;
        } else {
          freeExports._ = _;
        }
      } else {
        root._ = _;
      }
    }.call(this));
  })(require("github:jspm/nodelibs-process@0.1.2.js"));
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:core-js@0.9.18/library/modules/$.js", ["npm:core-js@0.9.18/library/modules/$.fw.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var global = typeof self != 'undefined' ? self : Function('return this')(),
      core = {},
      defineProperty = Object.defineProperty,
      hasOwnProperty = {}.hasOwnProperty,
      ceil = Math.ceil,
      floor = Math.floor,
      max = Math.max,
      min = Math.min;
  var DESC = !!function() {
    try {
      return defineProperty({}, 'a', {get: function() {
          return 2;
        }}).a == 2;
    } catch (e) {}
  }();
  var hide = createDefiner(1);
  function toInteger(it) {
    return isNaN(it = +it) ? 0 : (it > 0 ? floor : ceil)(it);
  }
  function desc(bitmap, value) {
    return {
      enumerable: !(bitmap & 1),
      configurable: !(bitmap & 2),
      writable: !(bitmap & 4),
      value: value
    };
  }
  function simpleSet(object, key, value) {
    object[key] = value;
    return object;
  }
  function createDefiner(bitmap) {
    return DESC ? function(object, key, value) {
      return $.setDesc(object, key, desc(bitmap, value));
    } : simpleSet;
  }
  function isObject(it) {
    return it !== null && (typeof it == 'object' || typeof it == 'function');
  }
  function isFunction(it) {
    return typeof it == 'function';
  }
  function assertDefined(it) {
    if (it == undefined)
      throw TypeError("Can't call method on  " + it);
    return it;
  }
  var $ = module.exports = require("npm:core-js@0.9.18/library/modules/$.fw.js")({
    g: global,
    core: core,
    html: global.document && document.documentElement,
    isObject: isObject,
    isFunction: isFunction,
    that: function() {
      return this;
    },
    toInteger: toInteger,
    toLength: function(it) {
      return it > 0 ? min(toInteger(it), 0x1fffffffffffff) : 0;
    },
    toIndex: function(index, length) {
      index = toInteger(index);
      return index < 0 ? max(index + length, 0) : min(index, length);
    },
    has: function(it, key) {
      return hasOwnProperty.call(it, key);
    },
    create: Object.create,
    getProto: Object.getPrototypeOf,
    DESC: DESC,
    desc: desc,
    getDesc: Object.getOwnPropertyDescriptor,
    setDesc: defineProperty,
    setDescs: Object.defineProperties,
    getKeys: Object.keys,
    getNames: Object.getOwnPropertyNames,
    getSymbols: Object.getOwnPropertySymbols,
    assertDefined: assertDefined,
    ES5Object: Object,
    toObject: function(it) {
      return $.ES5Object(assertDefined(it));
    },
    hide: hide,
    def: createDefiner(0),
    set: global.Symbol ? simpleSet : hide,
    each: [].forEach
  });
  if (typeof __e != 'undefined')
    __e = core;
  if (typeof __g != 'undefined')
    __g = global;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:core-js@0.9.18/library/modules/$.wks.js", ["npm:core-js@0.9.18/library/modules/$.js", "npm:core-js@0.9.18/library/modules/$.shared.js", "npm:core-js@0.9.18/library/modules/$.uid.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var global = require("npm:core-js@0.9.18/library/modules/$.js").g,
      store = require("npm:core-js@0.9.18/library/modules/$.shared.js")('wks');
  module.exports = function(name) {
    return store[name] || (store[name] = global.Symbol && global.Symbol[name] || require("npm:core-js@0.9.18/library/modules/$.uid.js").safe('Symbol.' + name));
  };
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:babel-runtime@5.8.35/core-js/object/create.js", ["npm:core-js@0.9.18/library/fn/object/create.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = {
    "default": require("npm:core-js@0.9.18/library/fn/object/create.js"),
    __esModule: true
  };
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:core-js@0.9.18/library/modules/$.set-proto.js", ["npm:core-js@0.9.18/library/modules/$.js", "npm:core-js@0.9.18/library/modules/$.assert.js", "npm:core-js@0.9.18/library/modules/$.ctx.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var $ = require("npm:core-js@0.9.18/library/modules/$.js"),
      assert = require("npm:core-js@0.9.18/library/modules/$.assert.js");
  function check(O, proto) {
    assert.obj(O);
    assert(proto === null || $.isObject(proto), proto, ": can't set as prototype!");
  }
  module.exports = {
    set: Object.setPrototypeOf || ('__proto__' in {} ? function(buggy, set) {
      try {
        set = require("npm:core-js@0.9.18/library/modules/$.ctx.js")(Function.call, $.getDesc(Object.prototype, '__proto__').set, 2);
        set({}, []);
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
    }() : undefined),
    check: check
  };
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:core-js@0.9.18/library/modules/es6.string.iterator.js", ["npm:core-js@0.9.18/library/modules/$.js", "npm:core-js@0.9.18/library/modules/$.string-at.js", "npm:core-js@0.9.18/library/modules/$.uid.js", "npm:core-js@0.9.18/library/modules/$.iter.js", "npm:core-js@0.9.18/library/modules/$.iter-define.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var set = require("npm:core-js@0.9.18/library/modules/$.js").set,
      $at = require("npm:core-js@0.9.18/library/modules/$.string-at.js")(true),
      ITER = require("npm:core-js@0.9.18/library/modules/$.uid.js").safe('iter'),
      $iter = require("npm:core-js@0.9.18/library/modules/$.iter.js"),
      step = $iter.step;
  require("npm:core-js@0.9.18/library/modules/$.iter-define.js")(String, 'String', function(iterated) {
    set(this, ITER, {
      o: String(iterated),
      i: 0
    });
  }, function() {
    var iter = this[ITER],
        O = iter.o,
        index = iter.i,
        point;
    if (index >= O.length)
      return step(1);
    point = $at(O, index);
    iter.i += point.length;
    return step(0, point);
  });
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:core-js@0.9.18/library/modules/es6.array.iterator.js", ["npm:core-js@0.9.18/library/modules/$.js", "npm:core-js@0.9.18/library/modules/$.unscope.js", "npm:core-js@0.9.18/library/modules/$.uid.js", "npm:core-js@0.9.18/library/modules/$.iter.js", "npm:core-js@0.9.18/library/modules/$.iter-define.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var $ = require("npm:core-js@0.9.18/library/modules/$.js"),
      setUnscope = require("npm:core-js@0.9.18/library/modules/$.unscope.js"),
      ITER = require("npm:core-js@0.9.18/library/modules/$.uid.js").safe('iter'),
      $iter = require("npm:core-js@0.9.18/library/modules/$.iter.js"),
      step = $iter.step,
      Iterators = $iter.Iterators;
  require("npm:core-js@0.9.18/library/modules/$.iter-define.js")(Array, 'Array', function(iterated, kind) {
    $.set(this, ITER, {
      o: $.toObject(iterated),
      i: 0,
      k: kind
    });
  }, function() {
    var iter = this[ITER],
        O = iter.o,
        kind = iter.k,
        index = iter.i++;
    if (!O || index >= O.length) {
      iter.o = undefined;
      return step(1);
    }
    if (kind == 'keys')
      return step(0, index);
    if (kind == 'values')
      return step(0, O[index]);
    return step(0, [index, O[index]]);
  }, 'values');
  Iterators.Arguments = Iterators.Array;
  setUnscope('keys');
  setUnscope('values');
  setUnscope('entries');
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:core-js@0.9.18/library/modules/$.for-of.js", ["npm:core-js@0.9.18/library/modules/$.ctx.js", "npm:core-js@0.9.18/library/modules/$.iter.js", "npm:core-js@0.9.18/library/modules/$.iter-call.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var ctx = require("npm:core-js@0.9.18/library/modules/$.ctx.js"),
      get = require("npm:core-js@0.9.18/library/modules/$.iter.js").get,
      call = require("npm:core-js@0.9.18/library/modules/$.iter-call.js");
  module.exports = function(iterable, entries, fn, that) {
    var iterator = get(iterable),
        f = ctx(fn, that, entries ? 2 : 1),
        step;
    while (!(step = iterator.next()).done) {
      if (call(iterator, f, step.value, entries) === false) {
        return call.close(iterator);
      }
    }
  };
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:process@0.11.2.js", ["npm:process@0.11.2/browser.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = require("npm:process@0.11.2/browser.js");
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:core-js@0.9.18/library/fn/object/get-own-property-descriptor.js", ["npm:core-js@0.9.18/library/modules/$.js", "npm:core-js@0.9.18/library/modules/es6.object.statics-accept-primitives.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var $ = require("npm:core-js@0.9.18/library/modules/$.js");
  require("npm:core-js@0.9.18/library/modules/es6.object.statics-accept-primitives.js");
  module.exports = function getOwnPropertyDescriptor(it, key) {
    return $.getDesc(it, key);
  };
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:babel-runtime@5.8.35/core-js/object/define-property.js", ["npm:core-js@0.9.18/library/fn/object/define-property.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = {
    "default": require("npm:core-js@0.9.18/library/fn/object/define-property.js"),
    __esModule: true
  };
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:core-js@0.9.18/library/fn/get-iterator.js", ["npm:core-js@0.9.18/library/modules/web.dom.iterable.js", "npm:core-js@0.9.18/library/modules/es6.string.iterator.js", "npm:core-js@0.9.18/library/modules/core.iter-helpers.js", "npm:core-js@0.9.18/library/modules/$.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  require("npm:core-js@0.9.18/library/modules/web.dom.iterable.js");
  require("npm:core-js@0.9.18/library/modules/es6.string.iterator.js");
  require("npm:core-js@0.9.18/library/modules/core.iter-helpers.js");
  module.exports = require("npm:core-js@0.9.18/library/modules/$.js").core.getIterator;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:core-js@0.9.18/library/modules/es6.map.js", ["npm:core-js@0.9.18/library/modules/$.collection-strong.js", "npm:core-js@0.9.18/library/modules/$.collection.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var strong = require("npm:core-js@0.9.18/library/modules/$.collection-strong.js");
  require("npm:core-js@0.9.18/library/modules/$.collection.js")('Map', function(get) {
    return function Map() {
      return get(this, arguments[0]);
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
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:core-js@0.9.18/library/modules/es7.map.to-json.js", ["npm:core-js@0.9.18/library/modules/$.collection-to-json.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  require("npm:core-js@0.9.18/library/modules/$.collection-to-json.js")('Map');
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0.js", ["npm:lodash@4.2.0/lodash.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = require("npm:lodash@4.2.0/lodash.js");
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:eventemitter3@1.1.1.js", ["npm:eventemitter3@1.1.1/index.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = require("npm:eventemitter3@1.1.1/index.js");
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:events@1.0.2.js", ["npm:events@1.0.2/events.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = require("npm:events@1.0.2/events.js");
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:inherits@2.0.1.js", ["npm:inherits@2.0.1/inherits_browser.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = require("npm:inherits@2.0.1/inherits_browser.js");
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:isarray@0.0.1.js", ["npm:isarray@0.0.1/index.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = require("npm:isarray@0.0.1/index.js");
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:base64-js@0.0.8.js", ["npm:base64-js@0.0.8/lib/b64.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = require("npm:base64-js@0.0.8/lib/b64.js");
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:ieee754@1.1.6.js", ["npm:ieee754@1.1.6/index.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = require("npm:ieee754@1.1.6/index.js");
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:is-array@1.0.1.js", ["npm:is-array@1.0.1/index.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = require("npm:is-array@1.0.1/index.js");
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:core-util-is@1.0.2.js", ["npm:core-util-is@1.0.2/lib/util.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = require("npm:core-util-is@1.0.2/lib/util.js");
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:readable-stream@1.1.13/lib/_stream_duplex.js", ["npm:core-util-is@1.0.2.js", "npm:inherits@2.0.1.js", "npm:readable-stream@1.1.13/lib/_stream_readable.js", "npm:readable-stream@1.1.13/lib/_stream_writable.js", "github:jspm/nodelibs-process@0.1.2.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  (function(process) {
    module.exports = Duplex;
    var objectKeys = Object.keys || function(obj) {
      var keys = [];
      for (var key in obj)
        keys.push(key);
      return keys;
    };
    var util = require("npm:core-util-is@1.0.2.js");
    util.inherits = require("npm:inherits@2.0.1.js");
    var Readable = require("npm:readable-stream@1.1.13/lib/_stream_readable.js");
    var Writable = require("npm:readable-stream@1.1.13/lib/_stream_writable.js");
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
  })(require("github:jspm/nodelibs-process@0.1.2.js"));
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:string_decoder@0.10.31.js", ["npm:string_decoder@0.10.31/index.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = require("npm:string_decoder@0.10.31/index.js");
  global.define = __define;
  return module.exports;
});

System.registerDynamic("github:jspm/nodelibs-string_decoder@0.1.0.js", ["github:jspm/nodelibs-string_decoder@0.1.0/index.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = require("github:jspm/nodelibs-string_decoder@0.1.0/index.js");
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/_assignValue.js", ["npm:lodash@4.2.0/eq.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var eq = require("npm:lodash@4.2.0/eq.js");
  var objectProto = Object.prototype;
  var hasOwnProperty = objectProto.hasOwnProperty;
  function assignValue(object, key, value) {
    var objValue = object[key];
    if ((!eq(objValue, value) || (eq(objValue, objectProto[key]) && !hasOwnProperty.call(object, key))) || (value === undefined && !(key in object))) {
      object[key] = value;
    }
  }
  module.exports = assignValue;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/_getLength.js", ["npm:lodash@4.2.0/_baseProperty.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var baseProperty = require("npm:lodash@4.2.0/_baseProperty.js");
  var getLength = baseProperty('length');
  module.exports = getLength;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/isFunction.js", ["npm:lodash@4.2.0/isObject.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var isObject = require("npm:lodash@4.2.0/isObject.js");
  var funcTag = '[object Function]',
      genTag = '[object GeneratorFunction]';
  var objectProto = Object.prototype;
  var objectToString = objectProto.toString;
  function isFunction(value) {
    var tag = isObject(value) ? objectToString.call(value) : '';
    return tag == funcTag || tag == genTag;
  }
  module.exports = isFunction;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/toInteger.js", ["npm:lodash@4.2.0/toNumber.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var toNumber = require("npm:lodash@4.2.0/toNumber.js");
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
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/isArrayLikeObject.js", ["npm:lodash@4.2.0/isArrayLike.js", "npm:lodash@4.2.0/isObjectLike.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var isArrayLike = require("npm:lodash@4.2.0/isArrayLike.js"),
      isObjectLike = require("npm:lodash@4.2.0/isObjectLike.js");
  function isArrayLikeObject(value) {
    return isObjectLike(value) && isArrayLike(value);
  }
  module.exports = isArrayLikeObject;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/create.js", ["npm:lodash@4.2.0/_baseAssign.js", "npm:lodash@4.2.0/_baseCreate.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var baseAssign = require("npm:lodash@4.2.0/_baseAssign.js"),
      baseCreate = require("npm:lodash@4.2.0/_baseCreate.js");
  function create(prototype, properties) {
    var result = baseCreate(prototype);
    return properties ? baseAssign(result, properties) : result;
  }
  module.exports = create;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/_baseFor.js", ["npm:lodash@4.2.0/_createBaseFor.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var createBaseFor = require("npm:lodash@4.2.0/_createBaseFor.js");
  var baseFor = createBaseFor();
  module.exports = baseFor;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/_assocDelete.js", ["npm:lodash@4.2.0/_assocIndexOf.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var assocIndexOf = require("npm:lodash@4.2.0/_assocIndexOf.js");
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
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/_stackGet.js", ["npm:lodash@4.2.0/_assocGet.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var assocGet = require("npm:lodash@4.2.0/_assocGet.js");
  function stackGet(key) {
    var data = this.__data__,
        array = data.array;
    return array ? assocGet(array, key) : data.map.get(key);
  }
  module.exports = stackGet;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/_stackHas.js", ["npm:lodash@4.2.0/_assocHas.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var assocHas = require("npm:lodash@4.2.0/_assocHas.js");
  function stackHas(key) {
    var data = this.__data__,
        array = data.array;
    return array ? assocHas(array, key) : data.map.has(key);
  }
  module.exports = stackHas;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/isNative.js", ["npm:lodash@4.2.0/isFunction.js", "npm:lodash@4.2.0/_isHostObject.js", "npm:lodash@4.2.0/isObjectLike.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var isFunction = require("npm:lodash@4.2.0/isFunction.js"),
      isHostObject = require("npm:lodash@4.2.0/_isHostObject.js"),
      isObjectLike = require("npm:lodash@4.2.0/isObjectLike.js");
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
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/_root.js", ["npm:lodash@4.2.0/_checkGlobal.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var checkGlobal = require("npm:lodash@4.2.0/_checkGlobal.js");
  var objectTypes = {
    'function': true,
    'object': true
  };
  var freeExports = (objectTypes[typeof exports] && exports && !exports.nodeType) ? exports : null;
  var freeModule = (objectTypes[typeof module] && module && !module.nodeType) ? module : null;
  var freeGlobal = checkGlobal(freeExports && freeModule && typeof global == 'object' && global);
  var freeSelf = checkGlobal(objectTypes[typeof self] && self);
  var freeWindow = checkGlobal(objectTypes[typeof window] && window);
  var thisGlobal = checkGlobal(objectTypes[typeof this] && this);
  var root = freeGlobal || ((freeWindow !== (thisGlobal && thisGlobal.window)) && freeWindow) || freeSelf || thisGlobal || Function('return this')();
  module.exports = root;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/_hashDelete.js", ["npm:lodash@4.2.0/_hashHas.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var hashHas = require("npm:lodash@4.2.0/_hashHas.js");
  function hashDelete(hash, key) {
    return hashHas(hash, key) && delete hash[key];
  }
  module.exports = hashDelete;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/_mapGet.js", ["npm:lodash@4.2.0/_Map.js", "npm:lodash@4.2.0/_assocGet.js", "npm:lodash@4.2.0/_hashGet.js", "npm:lodash@4.2.0/_isKeyable.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var Map = require("npm:lodash@4.2.0/_Map.js"),
      assocGet = require("npm:lodash@4.2.0/_assocGet.js"),
      hashGet = require("npm:lodash@4.2.0/_hashGet.js"),
      isKeyable = require("npm:lodash@4.2.0/_isKeyable.js");
  function mapGet(key) {
    var data = this.__data__;
    if (isKeyable(key)) {
      return hashGet(typeof key == 'string' ? data.string : data.hash, key);
    }
    return Map ? data.map.get(key) : assocGet(data.map, key);
  }
  module.exports = mapGet;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/_mapSet.js", ["npm:lodash@4.2.0/_Map.js", "npm:lodash@4.2.0/_assocSet.js", "npm:lodash@4.2.0/_hashSet.js", "npm:lodash@4.2.0/_isKeyable.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var Map = require("npm:lodash@4.2.0/_Map.js"),
      assocSet = require("npm:lodash@4.2.0/_assocSet.js"),
      hashSet = require("npm:lodash@4.2.0/_hashSet.js"),
      isKeyable = require("npm:lodash@4.2.0/_isKeyable.js");
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
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/_equalArrays.js", ["npm:lodash@4.2.0/_arraySome.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var arraySome = require("npm:lodash@4.2.0/_arraySome.js");
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
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/_equalByTag.js", ["npm:lodash@4.2.0/_Symbol.js", "npm:lodash@4.2.0/_Uint8Array.js", "npm:lodash@4.2.0/_mapToArray.js", "npm:lodash@4.2.0/_setToArray.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var Symbol = require("npm:lodash@4.2.0/_Symbol.js"),
      Uint8Array = require("npm:lodash@4.2.0/_Uint8Array.js"),
      mapToArray = require("npm:lodash@4.2.0/_mapToArray.js"),
      setToArray = require("npm:lodash@4.2.0/_setToArray.js");
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
      symbolValueOf = Symbol ? symbolProto.valueOf : undefined;
  function equalByTag(object, other, tag, equalFunc, customizer, bitmask) {
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
        return (isPartial || object.size == other.size) && equalFunc(convert(object), convert(other), customizer, bitmask | UNORDERED_COMPARE_FLAG);
      case symbolTag:
        return !!Symbol && (symbolValueOf.call(object) == symbolValueOf.call(other));
    }
    return false;
  }
  module.exports = equalByTag;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/_getTag.js", ["npm:lodash@4.2.0/_Map.js", "npm:lodash@4.2.0/_Set.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var Map = require("npm:lodash@4.2.0/_Map.js"),
      Set = require("npm:lodash@4.2.0/_Set.js");
  var mapTag = '[object Map]',
      objectTag = '[object Object]',
      setTag = '[object Set]';
  var objectProto = Object.prototype;
  var funcToString = Function.prototype.toString;
  var objectToString = objectProto.toString;
  var mapCtorString = Map ? funcToString.call(Map) : '',
      setCtorString = Set ? funcToString.call(Set) : '';
  function getTag(value) {
    return objectToString.call(value);
  }
  if ((Map && getTag(new Map) != mapTag) || (Set && getTag(new Set) != setTag)) {
    getTag = function(value) {
      var result = objectToString.call(value),
          Ctor = result == objectTag ? value.constructor : null,
          ctorString = typeof Ctor == 'function' ? funcToString.call(Ctor) : '';
      if (ctorString) {
        if (ctorString == mapCtorString) {
          return mapTag;
        }
        if (ctorString == setCtorString) {
          return setTag;
        }
      }
      return result;
    };
  }
  module.exports = getTag;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/_baseToPairs.js", ["npm:lodash@4.2.0/_arrayMap.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var arrayMap = require("npm:lodash@4.2.0/_arrayMap.js");
  function baseToPairs(object, props) {
    return arrayMap(props, function(key) {
      return [key, object[key]];
    });
  }
  module.exports = baseToPairs;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/toString.js", ["npm:lodash@4.2.0/_Symbol.js", "npm:lodash@4.2.0/isSymbol.js", "github:jspm/nodelibs-process@0.1.2.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  (function(process) {
    var Symbol = require("npm:lodash@4.2.0/_Symbol.js"),
        isSymbol = require("npm:lodash@4.2.0/isSymbol.js");
    var INFINITY = 1 / 0;
    var symbolProto = Symbol ? Symbol.prototype : undefined,
        symbolToString = Symbol ? symbolProto.toString : undefined;
    function toString(value) {
      if (typeof value == 'string') {
        return value;
      }
      if (value == null) {
        return '';
      }
      if (isSymbol(value)) {
        return Symbol ? symbolToString.call(value) : '';
      }
      var result = (value + '');
      return (result == '0' && (1 / value) == -INFINITY) ? '-0' : result;
    }
    module.exports = toString;
  })(require("github:jspm/nodelibs-process@0.1.2.js"));
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/_parent.js", ["npm:lodash@4.2.0/_baseSlice.js", "npm:lodash@4.2.0/get.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var baseSlice = require("npm:lodash@4.2.0/_baseSlice.js"),
      get = require("npm:lodash@4.2.0/get.js");
  function parent(object, path) {
    return path.length == 1 ? object : get(object, baseSlice(path, 0, -1));
  }
  module.exports = parent;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/property.js", ["npm:lodash@4.2.0/_baseProperty.js", "npm:lodash@4.2.0/_basePropertyDeep.js", "npm:lodash@4.2.0/_isKey.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var baseProperty = require("npm:lodash@4.2.0/_baseProperty.js"),
      basePropertyDeep = require("npm:lodash@4.2.0/_basePropertyDeep.js"),
      isKey = require("npm:lodash@4.2.0/_isKey.js");
  function property(path) {
    return isKey(path) ? baseProperty(path) : basePropertyDeep(path);
  }
  module.exports = property;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:xmlbuilder@4.2.1/lib/XMLDocType.js", ["npm:lodash@4.2.0/create.js", "npm:lodash@4.2.0/isObject.js", "npm:xmlbuilder@4.2.1/lib/XMLCData.js", "npm:xmlbuilder@4.2.1/lib/XMLComment.js", "npm:xmlbuilder@4.2.1/lib/XMLDTDAttList.js", "npm:xmlbuilder@4.2.1/lib/XMLDTDEntity.js", "npm:xmlbuilder@4.2.1/lib/XMLDTDElement.js", "npm:xmlbuilder@4.2.1/lib/XMLDTDNotation.js", "npm:xmlbuilder@4.2.1/lib/XMLProcessingInstruction.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
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
    create = require("npm:lodash@4.2.0/create.js");
    isObject = require("npm:lodash@4.2.0/isObject.js");
    XMLCData = require("npm:xmlbuilder@4.2.1/lib/XMLCData.js");
    XMLComment = require("npm:xmlbuilder@4.2.1/lib/XMLComment.js");
    XMLDTDAttList = require("npm:xmlbuilder@4.2.1/lib/XMLDTDAttList.js");
    XMLDTDEntity = require("npm:xmlbuilder@4.2.1/lib/XMLDTDEntity.js");
    XMLDTDElement = require("npm:xmlbuilder@4.2.1/lib/XMLDTDElement.js");
    XMLDTDNotation = require("npm:xmlbuilder@4.2.1/lib/XMLDTDNotation.js");
    XMLProcessingInstruction = require("npm:xmlbuilder@4.2.1/lib/XMLProcessingInstruction.js");
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
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:timers-browserify@1.4.1.js", ["npm:timers-browserify@1.4.1/main.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = require("npm:timers-browserify@1.4.1/main.js");
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:babel-runtime@5.8.35/core-js/object/get-own-property-names.js", ["npm:core-js@0.9.18/library/fn/object/get-own-property-names.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = {
    "default": require("npm:core-js@0.9.18/library/fn/object/get-own-property-names.js"),
    __esModule: true
  };
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:babel-runtime@5.8.35/core-js/object/keys.js", ["npm:core-js@0.9.18/library/fn/object/keys.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = {
    "default": require("npm:core-js@0.9.18/library/fn/object/keys.js"),
    __esModule: true
  };
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@3.10.1.js", ["npm:lodash@3.10.1/index.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = require("npm:lodash@3.10.1/index.js");
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:core-js@0.9.18/library/modules/$.cof.js", ["npm:core-js@0.9.18/library/modules/$.js", "npm:core-js@0.9.18/library/modules/$.wks.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var $ = require("npm:core-js@0.9.18/library/modules/$.js"),
      TAG = require("npm:core-js@0.9.18/library/modules/$.wks.js")('toStringTag'),
      toString = {}.toString;
  function cof(it) {
    return toString.call(it).slice(8, -1);
  }
  cof.classof = function(it) {
    var O,
        T;
    return it == undefined ? it === undefined ? 'Undefined' : 'Null' : typeof(T = (O = Object(it))[TAG]) == 'string' ? T : cof(O);
  };
  cof.set = function(it, tag, stat) {
    if (it && !$.has(it = stat ? it : it.prototype, TAG))
      $.hide(it, TAG, tag);
  };
  module.exports = cof;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:core-js@0.9.18/library/modules/es6.object.set-prototype-of.js", ["npm:core-js@0.9.18/library/modules/$.def.js", "npm:core-js@0.9.18/library/modules/$.set-proto.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var $def = require("npm:core-js@0.9.18/library/modules/$.def.js");
  $def($def.S, 'Object', {setPrototypeOf: require("npm:core-js@0.9.18/library/modules/$.set-proto.js").set});
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:core-js@0.9.18/library/modules/web.dom.iterable.js", ["npm:core-js@0.9.18/library/modules/es6.array.iterator.js", "npm:core-js@0.9.18/library/modules/$.js", "npm:core-js@0.9.18/library/modules/$.iter.js", "npm:core-js@0.9.18/library/modules/$.wks.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  require("npm:core-js@0.9.18/library/modules/es6.array.iterator.js");
  var $ = require("npm:core-js@0.9.18/library/modules/$.js"),
      Iterators = require("npm:core-js@0.9.18/library/modules/$.iter.js").Iterators,
      ITERATOR = require("npm:core-js@0.9.18/library/modules/$.wks.js")('iterator'),
      ArrayValues = Iterators.Array,
      NL = $.g.NodeList,
      HTC = $.g.HTMLCollection,
      NLProto = NL && NL.prototype,
      HTCProto = HTC && HTC.prototype;
  if ($.FW) {
    if (NL && !(ITERATOR in NLProto))
      $.hide(NLProto, ITERATOR, ArrayValues);
    if (HTC && !(ITERATOR in HTCProto))
      $.hide(HTCProto, ITERATOR, ArrayValues);
  }
  Iterators.NodeList = Iterators.HTMLCollection = ArrayValues;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("github:jspm/nodelibs-process@0.1.2/index.js", ["npm:process@0.11.2.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = System._nodeRequire ? process : require("npm:process@0.11.2.js");
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:babel-runtime@5.8.35/core-js/object/get-own-property-descriptor.js", ["npm:core-js@0.9.18/library/fn/object/get-own-property-descriptor.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = {
    "default": require("npm:core-js@0.9.18/library/fn/object/get-own-property-descriptor.js"),
    __esModule: true
  };
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:babel-runtime@5.8.35/helpers/create-class.js", ["npm:babel-runtime@5.8.35/core-js/object/define-property.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  "use strict";
  var _Object$defineProperty = require("npm:babel-runtime@5.8.35/core-js/object/define-property.js")["default"];
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
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:babel-runtime@5.8.35/core-js/get-iterator.js", ["npm:core-js@0.9.18/library/fn/get-iterator.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = {
    "default": require("npm:core-js@0.9.18/library/fn/get-iterator.js"),
    __esModule: true
  };
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:core-js@0.9.18/library/fn/map.js", ["npm:core-js@0.9.18/library/modules/es6.object.to-string.js", "npm:core-js@0.9.18/library/modules/es6.string.iterator.js", "npm:core-js@0.9.18/library/modules/web.dom.iterable.js", "npm:core-js@0.9.18/library/modules/es6.map.js", "npm:core-js@0.9.18/library/modules/es7.map.to-json.js", "npm:core-js@0.9.18/library/modules/$.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  require("npm:core-js@0.9.18/library/modules/es6.object.to-string.js");
  require("npm:core-js@0.9.18/library/modules/es6.string.iterator.js");
  require("npm:core-js@0.9.18/library/modules/web.dom.iterable.js");
  require("npm:core-js@0.9.18/library/modules/es6.map.js");
  require("npm:core-js@0.9.18/library/modules/es7.map.to-json.js");
  module.exports = require("npm:core-js@0.9.18/library/modules/$.js").core.Map;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("github:jspm/nodelibs-events@0.1.1/index.js", ["npm:events@1.0.2.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = System._nodeRequire ? System._nodeRequire('events') : require("npm:events@1.0.2.js");
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:buffer@3.5.1/index.js", ["npm:base64-js@0.0.8.js", "npm:ieee754@1.1.6.js", "npm:is-array@1.0.1.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var base64 = require("npm:base64-js@0.0.8.js");
  var ieee754 = require("npm:ieee754@1.1.6.js");
  var isArray = require("npm:is-array@1.0.1.js");
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
    this.length = 0;
    this.parent = undefined;
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
  Buffer.prototype.length = undefined;
  Buffer.prototype.parent = undefined;
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
        codePoint = leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00 | 0x10000;
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
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/_copyObjectWith.js", ["npm:lodash@4.2.0/_assignValue.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var assignValue = require("npm:lodash@4.2.0/_assignValue.js");
  function copyObjectWith(source, props, object, customizer) {
    object || (object = {});
    var index = -1,
        length = props.length;
    while (++index < length) {
      var key = props[index],
          newValue = customizer ? customizer(object[key], source[key], key, object, source) : source[key];
      assignValue(object, key, newValue);
    }
    return object;
  }
  module.exports = copyObjectWith;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/isArrayLike.js", ["npm:lodash@4.2.0/_getLength.js", "npm:lodash@4.2.0/isFunction.js", "npm:lodash@4.2.0/isLength.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var getLength = require("npm:lodash@4.2.0/_getLength.js"),
      isFunction = require("npm:lodash@4.2.0/isFunction.js"),
      isLength = require("npm:lodash@4.2.0/isLength.js");
  function isArrayLike(value) {
    return value != null && !(typeof value == 'function' && isFunction(value)) && isLength(getLength(value));
  }
  module.exports = isArrayLike;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/rest.js", ["npm:lodash@4.2.0/_apply.js", "npm:lodash@4.2.0/toInteger.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var apply = require("npm:lodash@4.2.0/_apply.js"),
      toInteger = require("npm:lodash@4.2.0/toInteger.js");
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
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/isArguments.js", ["npm:lodash@4.2.0/isArrayLikeObject.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var isArrayLikeObject = require("npm:lodash@4.2.0/isArrayLikeObject.js");
  var argsTag = '[object Arguments]';
  var objectProto = Object.prototype;
  var hasOwnProperty = objectProto.hasOwnProperty;
  var objectToString = objectProto.toString;
  var propertyIsEnumerable = objectProto.propertyIsEnumerable;
  function isArguments(value) {
    return isArrayLikeObject(value) && hasOwnProperty.call(value, 'callee') && (!propertyIsEnumerable.call(value, 'callee') || objectToString.call(value) == argsTag);
  }
  module.exports = isArguments;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/_baseForOwn.js", ["npm:lodash@4.2.0/_baseFor.js", "npm:lodash@4.2.0/keys.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var baseFor = require("npm:lodash@4.2.0/_baseFor.js"),
      keys = require("npm:lodash@4.2.0/keys.js");
  function baseForOwn(object, iteratee) {
    return object && baseFor(object, iteratee, keys);
  }
  module.exports = baseForOwn;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/_stackDelete.js", ["npm:lodash@4.2.0/_assocDelete.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var assocDelete = require("npm:lodash@4.2.0/_assocDelete.js");
  function stackDelete(key) {
    var data = this.__data__,
        array = data.array;
    return array ? assocDelete(array, key) : data.map['delete'](key);
  }
  module.exports = stackDelete;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/_getNative.js", ["npm:lodash@4.2.0/isNative.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var isNative = require("npm:lodash@4.2.0/isNative.js");
  function getNative(object, key) {
    var value = object == null ? undefined : object[key];
    return isNative(value) ? value : undefined;
  }
  module.exports = getNative;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/_Map.js", ["npm:lodash@4.2.0/_getNative.js", "npm:lodash@4.2.0/_root.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var getNative = require("npm:lodash@4.2.0/_getNative.js"),
      root = require("npm:lodash@4.2.0/_root.js");
  var Map = getNative(root, 'Map');
  module.exports = Map;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/_mapDelete.js", ["npm:lodash@4.2.0/_Map.js", "npm:lodash@4.2.0/_assocDelete.js", "npm:lodash@4.2.0/_hashDelete.js", "npm:lodash@4.2.0/_isKeyable.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var Map = require("npm:lodash@4.2.0/_Map.js"),
      assocDelete = require("npm:lodash@4.2.0/_assocDelete.js"),
      hashDelete = require("npm:lodash@4.2.0/_hashDelete.js"),
      isKeyable = require("npm:lodash@4.2.0/_isKeyable.js");
  function mapDelete(key) {
    var data = this.__data__;
    if (isKeyable(key)) {
      return hashDelete(typeof key == 'string' ? data.string : data.hash, key);
    }
    return Map ? data.map['delete'](key) : assocDelete(data.map, key);
  }
  module.exports = mapDelete;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/_baseIsEqualDeep.js", ["npm:lodash@4.2.0/_Stack.js", "npm:lodash@4.2.0/_equalArrays.js", "npm:lodash@4.2.0/_equalByTag.js", "npm:lodash@4.2.0/_equalObjects.js", "npm:lodash@4.2.0/_getTag.js", "npm:lodash@4.2.0/isArray.js", "npm:lodash@4.2.0/_isHostObject.js", "npm:lodash@4.2.0/isTypedArray.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var Stack = require("npm:lodash@4.2.0/_Stack.js"),
      equalArrays = require("npm:lodash@4.2.0/_equalArrays.js"),
      equalByTag = require("npm:lodash@4.2.0/_equalByTag.js"),
      equalObjects = require("npm:lodash@4.2.0/_equalObjects.js"),
      getTag = require("npm:lodash@4.2.0/_getTag.js"),
      isArray = require("npm:lodash@4.2.0/isArray.js"),
      isHostObject = require("npm:lodash@4.2.0/_isHostObject.js"),
      isTypedArray = require("npm:lodash@4.2.0/isTypedArray.js");
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
      if (objTag == argsTag) {
        objTag = objectTag;
      } else if (objTag != objectTag) {
        objIsArr = isTypedArray(object);
      }
    }
    if (!othIsArr) {
      othTag = getTag(other);
      if (othTag == argsTag) {
        othTag = objectTag;
      } else if (othTag != objectTag) {
        othIsArr = isTypedArray(other);
      }
    }
    var objIsObj = objTag == objectTag && !isHostObject(object),
        othIsObj = othTag == objectTag && !isHostObject(other),
        isSameTag = objTag == othTag;
    if (isSameTag && !(objIsArr || objIsObj)) {
      return equalByTag(object, other, objTag, equalFunc, customizer, bitmask);
    }
    var isPartial = bitmask & PARTIAL_COMPARE_FLAG;
    if (!isPartial) {
      var objIsWrapped = objIsObj && hasOwnProperty.call(object, '__wrapped__'),
          othIsWrapped = othIsObj && hasOwnProperty.call(other, '__wrapped__');
      if (objIsWrapped || othIsWrapped) {
        return equalFunc(objIsWrapped ? object.value() : object, othIsWrapped ? other.value() : other, customizer, bitmask, stack);
      }
    }
    if (!isSameTag) {
      return false;
    }
    stack || (stack = new Stack);
    return (objIsArr ? equalArrays : equalObjects)(object, other, equalFunc, customizer, bitmask, stack);
  }
  module.exports = baseIsEqualDeep;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/toPairs.js", ["npm:lodash@4.2.0/_baseToPairs.js", "npm:lodash@4.2.0/keys.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var baseToPairs = require("npm:lodash@4.2.0/_baseToPairs.js"),
      keys = require("npm:lodash@4.2.0/keys.js");
  function toPairs(object) {
    return baseToPairs(object, keys(object));
  }
  module.exports = toPairs;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/_stringToPath.js", ["npm:lodash@4.2.0/toString.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var toString = require("npm:lodash@4.2.0/toString.js");
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
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/_hasPath.js", ["npm:lodash@4.2.0/_baseToPath.js", "npm:lodash@4.2.0/isArguments.js", "npm:lodash@4.2.0/isArray.js", "npm:lodash@4.2.0/_isIndex.js", "npm:lodash@4.2.0/_isKey.js", "npm:lodash@4.2.0/isLength.js", "npm:lodash@4.2.0/isString.js", "npm:lodash@4.2.0/last.js", "npm:lodash@4.2.0/_parent.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var baseToPath = require("npm:lodash@4.2.0/_baseToPath.js"),
      isArguments = require("npm:lodash@4.2.0/isArguments.js"),
      isArray = require("npm:lodash@4.2.0/isArray.js"),
      isIndex = require("npm:lodash@4.2.0/_isIndex.js"),
      isKey = require("npm:lodash@4.2.0/_isKey.js"),
      isLength = require("npm:lodash@4.2.0/isLength.js"),
      isString = require("npm:lodash@4.2.0/isString.js"),
      last = require("npm:lodash@4.2.0/last.js"),
      parent = require("npm:lodash@4.2.0/_parent.js");
  function hasPath(object, path, hasFunc) {
    if (object == null) {
      return false;
    }
    var result = hasFunc(object, path);
    if (!result && !isKey(path)) {
      path = baseToPath(path);
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
  global.define = __define;
  return module.exports;
});

System.registerDynamic("github:jspm/nodelibs-timers@0.1.0/index.js", ["npm:timers-browserify@1.4.1.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = System._nodeRequire ? System._nodeRequire('timers') : require("npm:timers-browserify@1.4.1.js");
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:core-js@0.9.18/library/modules/es6.symbol.js", ["npm:core-js@0.9.18/library/modules/$.js", "npm:core-js@0.9.18/library/modules/$.cof.js", "npm:core-js@0.9.18/library/modules/$.uid.js", "npm:core-js@0.9.18/library/modules/$.shared.js", "npm:core-js@0.9.18/library/modules/$.def.js", "npm:core-js@0.9.18/library/modules/$.redef.js", "npm:core-js@0.9.18/library/modules/$.keyof.js", "npm:core-js@0.9.18/library/modules/$.enum-keys.js", "npm:core-js@0.9.18/library/modules/$.assert.js", "npm:core-js@0.9.18/library/modules/$.get-names.js", "npm:core-js@0.9.18/library/modules/$.wks.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var $ = require("npm:core-js@0.9.18/library/modules/$.js"),
      setTag = require("npm:core-js@0.9.18/library/modules/$.cof.js").set,
      uid = require("npm:core-js@0.9.18/library/modules/$.uid.js"),
      shared = require("npm:core-js@0.9.18/library/modules/$.shared.js"),
      $def = require("npm:core-js@0.9.18/library/modules/$.def.js"),
      $redef = require("npm:core-js@0.9.18/library/modules/$.redef.js"),
      keyOf = require("npm:core-js@0.9.18/library/modules/$.keyof.js"),
      enumKeys = require("npm:core-js@0.9.18/library/modules/$.enum-keys.js"),
      assertObject = require("npm:core-js@0.9.18/library/modules/$.assert.js").obj,
      ObjectProto = Object.prototype,
      DESC = $.DESC,
      has = $.has,
      $create = $.create,
      getDesc = $.getDesc,
      setDesc = $.setDesc,
      desc = $.desc,
      $names = require("npm:core-js@0.9.18/library/modules/$.get-names.js"),
      getNames = $names.get,
      toObject = $.toObject,
      $Symbol = $.g.Symbol,
      setter = false,
      TAG = uid('tag'),
      HIDDEN = uid('hidden'),
      _propertyIsEnumerable = {}.propertyIsEnumerable,
      SymbolRegistry = shared('symbol-registry'),
      AllSymbols = shared('symbols'),
      useNative = $.isFunction($Symbol);
  var setSymbolDesc = DESC ? function() {
    try {
      return $create(setDesc({}, HIDDEN, {get: function() {
          return setDesc(this, HIDDEN, {value: false})[HIDDEN];
        }}))[HIDDEN] || setDesc;
    } catch (e) {
      return function(it, key, D) {
        var protoDesc = getDesc(ObjectProto, key);
        if (protoDesc)
          delete ObjectProto[key];
        setDesc(it, key, D);
        if (protoDesc && it !== ObjectProto)
          setDesc(ObjectProto, key, protoDesc);
      };
    }
  }() : setDesc;
  function wrap(tag) {
    var sym = AllSymbols[tag] = $.set($create($Symbol.prototype), TAG, tag);
    DESC && setter && setSymbolDesc(ObjectProto, tag, {
      configurable: true,
      set: function(value) {
        if (has(this, HIDDEN) && has(this[HIDDEN], tag))
          this[HIDDEN][tag] = false;
        setSymbolDesc(this, tag, desc(1, value));
      }
    });
    return sym;
  }
  function defineProperty(it, key, D) {
    if (D && has(AllSymbols, key)) {
      if (!D.enumerable) {
        if (!has(it, HIDDEN))
          setDesc(it, HIDDEN, desc(1, {}));
        it[HIDDEN][key] = true;
      } else {
        if (has(it, HIDDEN) && it[HIDDEN][key])
          it[HIDDEN][key] = false;
        D = $create(D, {enumerable: desc(0, false)});
      }
      return setSymbolDesc(it, key, D);
    }
    return setDesc(it, key, D);
  }
  function defineProperties(it, P) {
    assertObject(it);
    var keys = enumKeys(P = toObject(P)),
        i = 0,
        l = keys.length,
        key;
    while (l > i)
      defineProperty(it, key = keys[i++], P[key]);
    return it;
  }
  function create(it, P) {
    return P === undefined ? $create(it) : defineProperties($create(it), P);
  }
  function propertyIsEnumerable(key) {
    var E = _propertyIsEnumerable.call(this, key);
    return E || !has(this, key) || !has(AllSymbols, key) || has(this, HIDDEN) && this[HIDDEN][key] ? E : true;
  }
  function getOwnPropertyDescriptor(it, key) {
    var D = getDesc(it = toObject(it), key);
    if (D && has(AllSymbols, key) && !(has(it, HIDDEN) && it[HIDDEN][key]))
      D.enumerable = true;
    return D;
  }
  function getOwnPropertyNames(it) {
    var names = getNames(toObject(it)),
        result = [],
        i = 0,
        key;
    while (names.length > i)
      if (!has(AllSymbols, key = names[i++]) && key != HIDDEN)
        result.push(key);
    return result;
  }
  function getOwnPropertySymbols(it) {
    var names = getNames(toObject(it)),
        result = [],
        i = 0,
        key;
    while (names.length > i)
      if (has(AllSymbols, key = names[i++]))
        result.push(AllSymbols[key]);
    return result;
  }
  if (!useNative) {
    $Symbol = function Symbol() {
      if (this instanceof $Symbol)
        throw TypeError('Symbol is not a constructor');
      return wrap(uid(arguments[0]));
    };
    $redef($Symbol.prototype, 'toString', function() {
      return this[TAG];
    });
    $.create = create;
    $.setDesc = defineProperty;
    $.getDesc = getOwnPropertyDescriptor;
    $.setDescs = defineProperties;
    $.getNames = $names.get = getOwnPropertyNames;
    $.getSymbols = getOwnPropertySymbols;
    if ($.DESC && $.FW)
      $redef(ObjectProto, 'propertyIsEnumerable', propertyIsEnumerable, true);
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
    var sym = require("npm:core-js@0.9.18/library/modules/$.wks.js")(it);
    symbolStatics[it] = useNative ? sym : wrap(sym);
  });
  setter = true;
  $def($def.G + $def.W, {Symbol: $Symbol});
  $def($def.S, 'Symbol', symbolStatics);
  $def($def.S + $def.F * !useNative, 'Object', {
    create: create,
    defineProperty: defineProperty,
    defineProperties: defineProperties,
    getOwnPropertyDescriptor: getOwnPropertyDescriptor,
    getOwnPropertyNames: getOwnPropertyNames,
    getOwnPropertySymbols: getOwnPropertySymbols
  });
  setTag($Symbol, 'Symbol');
  setTag(Math, 'Math', true);
  setTag($.g.JSON, 'JSON', true);
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:core-js@0.9.18/library/fn/object/set-prototype-of.js", ["npm:core-js@0.9.18/library/modules/es6.object.set-prototype-of.js", "npm:core-js@0.9.18/library/modules/$.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  require("npm:core-js@0.9.18/library/modules/es6.object.set-prototype-of.js");
  module.exports = require("npm:core-js@0.9.18/library/modules/$.js").core.Object.setPrototypeOf;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("github:jspm/nodelibs-process@0.1.2.js", ["github:jspm/nodelibs-process@0.1.2/index.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = require("github:jspm/nodelibs-process@0.1.2/index.js");
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:babel-runtime@5.8.35/helpers/get.js", ["npm:babel-runtime@5.8.35/core-js/object/get-own-property-descriptor.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  "use strict";
  var _Object$getOwnPropertyDescriptor = require("npm:babel-runtime@5.8.35/core-js/object/get-own-property-descriptor.js")["default"];
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
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:babel-runtime@5.8.35/core-js/map.js", ["npm:core-js@0.9.18/library/fn/map.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = {
    "default": require("npm:core-js@0.9.18/library/fn/map.js"),
    __esModule: true
  };
  global.define = __define;
  return module.exports;
});

System.registerDynamic("github:jspm/nodelibs-events@0.1.1.js", ["github:jspm/nodelibs-events@0.1.1/index.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = require("github:jspm/nodelibs-events@0.1.1/index.js");
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:buffer@3.5.1.js", ["npm:buffer@3.5.1/index.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = require("npm:buffer@3.5.1/index.js");
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/_copyObject.js", ["npm:lodash@4.2.0/_copyObjectWith.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var copyObjectWith = require("npm:lodash@4.2.0/_copyObjectWith.js");
  function copyObject(source, props, object) {
    return copyObjectWith(source, props, object);
  }
  module.exports = copyObject;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/_isIterateeCall.js", ["npm:lodash@4.2.0/eq.js", "npm:lodash@4.2.0/isArrayLike.js", "npm:lodash@4.2.0/_isIndex.js", "npm:lodash@4.2.0/isObject.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var eq = require("npm:lodash@4.2.0/eq.js"),
      isArrayLike = require("npm:lodash@4.2.0/isArrayLike.js"),
      isIndex = require("npm:lodash@4.2.0/_isIndex.js"),
      isObject = require("npm:lodash@4.2.0/isObject.js");
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
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/_indexKeys.js", ["npm:lodash@4.2.0/_baseTimes.js", "npm:lodash@4.2.0/isArguments.js", "npm:lodash@4.2.0/isArray.js", "npm:lodash@4.2.0/isLength.js", "npm:lodash@4.2.0/isString.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var baseTimes = require("npm:lodash@4.2.0/_baseTimes.js"),
      isArguments = require("npm:lodash@4.2.0/isArguments.js"),
      isArray = require("npm:lodash@4.2.0/isArray.js"),
      isLength = require("npm:lodash@4.2.0/isLength.js"),
      isString = require("npm:lodash@4.2.0/isString.js");
  function indexKeys(object) {
    var length = object ? object.length : undefined;
    if (isLength(length) && (isArray(object) || isString(object) || isArguments(object))) {
      return baseTimes(length, String);
    }
    return null;
  }
  module.exports = indexKeys;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/_baseEach.js", ["npm:lodash@4.2.0/_baseForOwn.js", "npm:lodash@4.2.0/_createBaseEach.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var baseForOwn = require("npm:lodash@4.2.0/_baseForOwn.js"),
      createBaseEach = require("npm:lodash@4.2.0/_createBaseEach.js");
  var baseEach = createBaseEach(baseForOwn);
  module.exports = baseEach;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/_nativeCreate.js", ["npm:lodash@4.2.0/_getNative.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var getNative = require("npm:lodash@4.2.0/_getNative.js");
  var nativeCreate = getNative(Object, 'create');
  module.exports = nativeCreate;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/_baseIsEqual.js", ["npm:lodash@4.2.0/_baseIsEqualDeep.js", "npm:lodash@4.2.0/isObject.js", "npm:lodash@4.2.0/isObjectLike.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var baseIsEqualDeep = require("npm:lodash@4.2.0/_baseIsEqualDeep.js"),
      isObject = require("npm:lodash@4.2.0/isObject.js"),
      isObjectLike = require("npm:lodash@4.2.0/isObjectLike.js");
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
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/_getMatchData.js", ["npm:lodash@4.2.0/_isStrictComparable.js", "npm:lodash@4.2.0/toPairs.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var isStrictComparable = require("npm:lodash@4.2.0/_isStrictComparable.js"),
      toPairs = require("npm:lodash@4.2.0/toPairs.js");
  function getMatchData(object) {
    var result = toPairs(object),
        length = result.length;
    while (length--) {
      result[length][2] = isStrictComparable(result[length][1]);
    }
    return result;
  }
  module.exports = getMatchData;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/_baseToPath.js", ["npm:lodash@4.2.0/isArray.js", "npm:lodash@4.2.0/_stringToPath.js", "github:jspm/nodelibs-process@0.1.2.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  (function(process) {
    var isArray = require("npm:lodash@4.2.0/isArray.js"),
        stringToPath = require("npm:lodash@4.2.0/_stringToPath.js");
    function baseToPath(value) {
      return isArray(value) ? value : stringToPath(value);
    }
    module.exports = baseToPath;
  })(require("github:jspm/nodelibs-process@0.1.2.js"));
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/hasIn.js", ["npm:lodash@4.2.0/_baseHasIn.js", "npm:lodash@4.2.0/_hasPath.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var baseHasIn = require("npm:lodash@4.2.0/_baseHasIn.js"),
      hasPath = require("npm:lodash@4.2.0/_hasPath.js");
  function hasIn(object, path) {
    return hasPath(object, path, baseHasIn);
  }
  module.exports = hasIn;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("github:jspm/nodelibs-timers@0.1.0.js", ["github:jspm/nodelibs-timers@0.1.0/index.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = require("github:jspm/nodelibs-timers@0.1.0/index.js");
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:core-js@0.9.18/library/fn/symbol/index.js", ["npm:core-js@0.9.18/library/modules/es6.symbol.js", "npm:core-js@0.9.18/library/modules/$.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  require("npm:core-js@0.9.18/library/modules/es6.symbol.js");
  module.exports = require("npm:core-js@0.9.18/library/modules/$.js").core.Symbol;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:babel-runtime@5.8.35/core-js/object/set-prototype-of.js", ["npm:core-js@0.9.18/library/fn/object/set-prototype-of.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = {
    "default": require("npm:core-js@0.9.18/library/fn/object/set-prototype-of.js"),
    __esModule: true
  };
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:core-js@0.9.18/library/modules/$.task.js", ["npm:core-js@0.9.18/library/modules/$.js", "npm:core-js@0.9.18/library/modules/$.ctx.js", "npm:core-js@0.9.18/library/modules/$.cof.js", "npm:core-js@0.9.18/library/modules/$.invoke.js", "npm:core-js@0.9.18/library/modules/$.dom-create.js", "github:jspm/nodelibs-process@0.1.2.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  (function(process) {
    'use strict';
    var $ = require("npm:core-js@0.9.18/library/modules/$.js"),
        ctx = require("npm:core-js@0.9.18/library/modules/$.ctx.js"),
        cof = require("npm:core-js@0.9.18/library/modules/$.cof.js"),
        invoke = require("npm:core-js@0.9.18/library/modules/$.invoke.js"),
        cel = require("npm:core-js@0.9.18/library/modules/$.dom-create.js"),
        global = $.g,
        isFunction = $.isFunction,
        html = $.html,
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
    function run() {
      var id = +this;
      if ($.has(queue, id)) {
        var fn = queue[id];
        delete queue[id];
        fn();
      }
    }
    function listner(event) {
      run.call(event.data);
    }
    if (!isFunction(setTask) || !isFunction(clearTask)) {
      setTask = function(fn) {
        var args = [],
            i = 1;
        while (arguments.length > i)
          args.push(arguments[i++]);
        queue[++counter] = function() {
          invoke(isFunction(fn) ? fn : Function(fn), args);
        };
        defer(counter);
        return counter;
      };
      clearTask = function(id) {
        delete queue[id];
      };
      if (cof(process) == 'process') {
        defer = function(id) {
          process.nextTick(ctx(run, id, 1));
        };
      } else if (global.addEventListener && isFunction(global.postMessage) && !global.importScripts) {
        defer = function(id) {
          global.postMessage(id, '*');
        };
        global.addEventListener('message', listner, false);
      } else if (isFunction(MessageChannel)) {
        channel = new MessageChannel;
        port = channel.port2;
        channel.port1.onmessage = listner;
        defer = ctx(port.postMessage, port, 1);
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
  })(require("github:jspm/nodelibs-process@0.1.2.js"));
  global.define = __define;
  return module.exports;
});

System.registerDynamic("github:jspm/nodelibs-buffer@0.1.0/index.js", ["npm:buffer@3.5.1.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = System._nodeRequire ? System._nodeRequire('buffer') : require("npm:buffer@3.5.1.js");
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/_createAssigner.js", ["npm:lodash@4.2.0/_isIterateeCall.js", "npm:lodash@4.2.0/rest.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var isIterateeCall = require("npm:lodash@4.2.0/_isIterateeCall.js"),
      rest = require("npm:lodash@4.2.0/rest.js");
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
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/keys.js", ["npm:lodash@4.2.0/_baseHas.js", "npm:lodash@4.2.0/_baseKeys.js", "npm:lodash@4.2.0/_indexKeys.js", "npm:lodash@4.2.0/isArrayLike.js", "npm:lodash@4.2.0/_isIndex.js", "npm:lodash@4.2.0/_isPrototype.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var baseHas = require("npm:lodash@4.2.0/_baseHas.js"),
      baseKeys = require("npm:lodash@4.2.0/_baseKeys.js"),
      indexKeys = require("npm:lodash@4.2.0/_indexKeys.js"),
      isArrayLike = require("npm:lodash@4.2.0/isArrayLike.js"),
      isIndex = require("npm:lodash@4.2.0/_isIndex.js"),
      isPrototype = require("npm:lodash@4.2.0/_isPrototype.js");
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
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/_baseEvery.js", ["npm:lodash@4.2.0/_baseEach.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var baseEach = require("npm:lodash@4.2.0/_baseEach.js");
  function baseEvery(collection, predicate) {
    var result = true;
    baseEach(collection, function(value, index, collection) {
      result = !!predicate(value, index, collection);
      return result;
    });
    return result;
  }
  module.exports = baseEvery;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/_Hash.js", ["npm:lodash@4.2.0/_nativeCreate.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var nativeCreate = require("npm:lodash@4.2.0/_nativeCreate.js");
  var objectProto = Object.prototype;
  function Hash() {}
  Hash.prototype = nativeCreate ? nativeCreate(null) : objectProto;
  module.exports = Hash;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/_baseGet.js", ["npm:lodash@4.2.0/_baseToPath.js", "npm:lodash@4.2.0/_isKey.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var baseToPath = require("npm:lodash@4.2.0/_baseToPath.js"),
      isKey = require("npm:lodash@4.2.0/_isKey.js");
  function baseGet(object, path) {
    path = isKey(path, object) ? [path + ''] : baseToPath(path);
    var index = 0,
        length = path.length;
    while (object != null && index < length) {
      object = object[path[index++]];
    }
    return (index && index == length) ? object : undefined;
  }
  module.exports = baseGet;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:core-js@0.9.18/library/fn/symbol.js", ["npm:core-js@0.9.18/library/fn/symbol/index.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = require("npm:core-js@0.9.18/library/fn/symbol/index.js");
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:core-js@0.9.18/library/modules/es6.promise.js", ["npm:core-js@0.9.18/library/modules/$.js", "npm:core-js@0.9.18/library/modules/$.ctx.js", "npm:core-js@0.9.18/library/modules/$.cof.js", "npm:core-js@0.9.18/library/modules/$.def.js", "npm:core-js@0.9.18/library/modules/$.assert.js", "npm:core-js@0.9.18/library/modules/$.for-of.js", "npm:core-js@0.9.18/library/modules/$.set-proto.js", "npm:core-js@0.9.18/library/modules/$.same.js", "npm:core-js@0.9.18/library/modules/$.species.js", "npm:core-js@0.9.18/library/modules/$.wks.js", "npm:core-js@0.9.18/library/modules/$.uid.js", "npm:core-js@0.9.18/library/modules/$.task.js", "npm:core-js@0.9.18/library/modules/$.mix.js", "npm:core-js@0.9.18/library/modules/$.iter-detect.js", "github:jspm/nodelibs-process@0.1.2.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  (function(process) {
    'use strict';
    var $ = require("npm:core-js@0.9.18/library/modules/$.js"),
        ctx = require("npm:core-js@0.9.18/library/modules/$.ctx.js"),
        cof = require("npm:core-js@0.9.18/library/modules/$.cof.js"),
        $def = require("npm:core-js@0.9.18/library/modules/$.def.js"),
        assert = require("npm:core-js@0.9.18/library/modules/$.assert.js"),
        forOf = require("npm:core-js@0.9.18/library/modules/$.for-of.js"),
        setProto = require("npm:core-js@0.9.18/library/modules/$.set-proto.js").set,
        same = require("npm:core-js@0.9.18/library/modules/$.same.js"),
        species = require("npm:core-js@0.9.18/library/modules/$.species.js"),
        SPECIES = require("npm:core-js@0.9.18/library/modules/$.wks.js")('species'),
        RECORD = require("npm:core-js@0.9.18/library/modules/$.uid.js").safe('record'),
        PROMISE = 'Promise',
        global = $.g,
        process = global.process,
        isNode = cof(process) == 'process',
        asap = process && process.nextTick || require("npm:core-js@0.9.18/library/modules/$.task.js").set,
        P = global[PROMISE],
        isFunction = $.isFunction,
        isObject = $.isObject,
        assertFunction = assert.fn,
        assertObject = assert.obj,
        Wrapper;
    function testResolve(sub) {
      var test = new P(function() {});
      if (sub)
        test.constructor = Object;
      return P.resolve(test) === test;
    }
    var useNative = function() {
      var works = false;
      function P2(x) {
        var self = new P(x);
        setProto(self, P2.prototype);
        return self;
      }
      try {
        works = isFunction(P) && isFunction(P.resolve) && testResolve();
        setProto(P2, P);
        P2.prototype = $.create(P.prototype, {constructor: {value: P2}});
        if (!(P2.resolve(5).then(function() {}) instanceof P2)) {
          works = false;
        }
        if (works && $.DESC) {
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
    function isPromise(it) {
      return isObject(it) && (useNative ? cof.classof(it) == 'Promise' : RECORD in it);
    }
    function sameConstructor(a, b) {
      if (!$.FW && a === P && b === Wrapper)
        return true;
      return same(a, b);
    }
    function getConstructor(C) {
      var S = assertObject(C)[SPECIES];
      return S != undefined ? S : C;
    }
    function isThenable(it) {
      var then;
      if (isObject(it))
        then = it.then;
      return isFunction(then) ? then : false;
    }
    function notify(record) {
      var chain = record.c;
      if (chain.length)
        asap.call(global, function() {
          var value = record.v,
              ok = record.s == 1,
              i = 0;
          function run(react) {
            var cb = ok ? react.ok : react.fail,
                ret,
                then;
            try {
              if (cb) {
                if (!ok)
                  record.h = true;
                ret = cb === true ? value : cb(value);
                if (ret === react.P) {
                  react.rej(TypeError('Promise-chain cycle'));
                } else if (then = isThenable(ret)) {
                  then.call(ret, react.res, react.rej);
                } else
                  react.res(ret);
              } else
                react.rej(value);
            } catch (err) {
              react.rej(err);
            }
          }
          while (chain.length > i)
            run(chain[i++]);
          chain.length = 0;
        });
    }
    function isUnhandled(promise) {
      var record = promise[RECORD],
          chain = record.a || record.c,
          i = 0,
          react;
      if (record.h)
        return false;
      while (chain.length > i) {
        react = chain[i++];
        if (react.fail || !isUnhandled(react.P))
          return false;
      }
      return true;
    }
    function $reject(value) {
      var record = this,
          promise;
      if (record.d)
        return;
      record.d = true;
      record = record.r || record;
      record.v = value;
      record.s = 2;
      record.a = record.c.slice();
      setTimeout(function() {
        asap.call(global, function() {
          if (isUnhandled(promise = record.p)) {
            if (isNode) {
              process.emit('unhandledRejection', value, promise);
            } else if (global.console && console.error) {
              console.error('Unhandled promise rejection', value);
            }
          }
          record.a = undefined;
        });
      }, 1);
      notify(record);
    }
    function $resolve(value) {
      var record = this,
          then;
      if (record.d)
        return;
      record.d = true;
      record = record.r || record;
      try {
        if (then = isThenable(value)) {
          asap.call(global, function() {
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
          notify(record);
        }
      } catch (e) {
        $reject.call({
          r: record,
          d: false
        }, e);
      }
    }
    if (!useNative) {
      P = function Promise(executor) {
        assertFunction(executor);
        var record = {
          p: assert.inst(this, P, PROMISE),
          c: [],
          a: undefined,
          s: 0,
          d: false,
          v: undefined,
          h: false
        };
        $.hide(this, RECORD, record);
        try {
          executor(ctx($resolve, record, 1), ctx($reject, record, 1));
        } catch (err) {
          $reject.call(record, err);
        }
      };
      require("npm:core-js@0.9.18/library/modules/$.mix.js")(P.prototype, {
        then: function then(onFulfilled, onRejected) {
          var S = assertObject(assertObject(this).constructor)[SPECIES];
          var react = {
            ok: isFunction(onFulfilled) ? onFulfilled : true,
            fail: isFunction(onRejected) ? onRejected : false
          };
          var promise = react.P = new (S != undefined ? S : P)(function(res, rej) {
            react.res = assertFunction(res);
            react.rej = assertFunction(rej);
          });
          var record = this[RECORD];
          record.c.push(react);
          if (record.a)
            record.a.push(react);
          if (record.s)
            notify(record);
          return promise;
        },
        'catch': function(onRejected) {
          return this.then(undefined, onRejected);
        }
      });
    }
    $def($def.G + $def.W + $def.F * !useNative, {Promise: P});
    cof.set(P, PROMISE);
    species(P);
    species(Wrapper = $.core[PROMISE]);
    $def($def.S + $def.F * !useNative, PROMISE, {reject: function reject(r) {
        return new (getConstructor(this))(function(res, rej) {
          rej(r);
        });
      }});
    $def($def.S + $def.F * (!useNative || testResolve(true)), PROMISE, {resolve: function resolve(x) {
        return isPromise(x) && sameConstructor(x.constructor, this) ? x : new this(function(res) {
          res(x);
        });
      }});
    $def($def.S + $def.F * !(useNative && require("npm:core-js@0.9.18/library/modules/$.iter-detect.js")(function(iter) {
      P.all(iter)['catch'](function() {});
    })), PROMISE, {
      all: function all(iterable) {
        var C = getConstructor(this),
            values = [];
        return new C(function(res, rej) {
          forOf(iterable, false, values.push, values);
          var remaining = values.length,
              results = Array(remaining);
          if (remaining)
            $.each.call(values, function(promise, index) {
              C.resolve(promise).then(function(value) {
                results[index] = value;
                --remaining || res(results);
              }, rej);
            });
          else
            res(results);
        });
      },
      race: function race(iterable) {
        var C = getConstructor(this);
        return new C(function(res, rej) {
          forOf(iterable, false, function(promise) {
            C.resolve(promise).then(res, rej);
          });
        });
      }
    });
  })(require("github:jspm/nodelibs-process@0.1.2.js"));
  global.define = __define;
  return module.exports;
});

System.registerDynamic("github:jspm/nodelibs-buffer@0.1.0.js", ["github:jspm/nodelibs-buffer@0.1.0/index.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = require("github:jspm/nodelibs-buffer@0.1.0/index.js");
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/assign.js", ["npm:lodash@4.2.0/_copyObject.js", "npm:lodash@4.2.0/_createAssigner.js", "npm:lodash@4.2.0/keys.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var copyObject = require("npm:lodash@4.2.0/_copyObject.js"),
      createAssigner = require("npm:lodash@4.2.0/_createAssigner.js"),
      keys = require("npm:lodash@4.2.0/keys.js");
  var assign = createAssigner(function(object, source) {
    copyObject(source, keys(source), object);
  });
  module.exports = assign;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/_mapClear.js", ["npm:lodash@4.2.0/_Hash.js", "npm:lodash@4.2.0/_Map.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var Hash = require("npm:lodash@4.2.0/_Hash.js"),
      Map = require("npm:lodash@4.2.0/_Map.js");
  function mapClear() {
    this.__data__ = {
      'hash': new Hash,
      'map': Map ? new Map : [],
      'string': new Hash
    };
  }
  module.exports = mapClear;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/get.js", ["npm:lodash@4.2.0/_baseGet.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var baseGet = require("npm:lodash@4.2.0/_baseGet.js");
  function get(object, path, defaultValue) {
    var result = object == null ? undefined : baseGet(object, path);
    return result === undefined ? defaultValue : result;
  }
  module.exports = get;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:babel-runtime@5.8.35/core-js/symbol.js", ["npm:core-js@0.9.18/library/fn/symbol.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = {
    "default": require("npm:core-js@0.9.18/library/fn/symbol.js"),
    __esModule: true
  };
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:core-js@0.9.18/library/fn/promise.js", ["npm:core-js@0.9.18/library/modules/es6.object.to-string.js", "npm:core-js@0.9.18/library/modules/es6.string.iterator.js", "npm:core-js@0.9.18/library/modules/web.dom.iterable.js", "npm:core-js@0.9.18/library/modules/es6.promise.js", "npm:core-js@0.9.18/library/modules/$.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  require("npm:core-js@0.9.18/library/modules/es6.object.to-string.js");
  require("npm:core-js@0.9.18/library/modules/es6.string.iterator.js");
  require("npm:core-js@0.9.18/library/modules/web.dom.iterable.js");
  require("npm:core-js@0.9.18/library/modules/es6.promise.js");
  module.exports = require("npm:core-js@0.9.18/library/modules/$.js").core.Promise;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:readable-stream@1.1.13/lib/_stream_readable.js", ["npm:isarray@0.0.1.js", "github:jspm/nodelibs-buffer@0.1.0.js", "github:jspm/nodelibs-events@0.1.1.js", "npm:stream-browserify@1.0.0/index.js", "npm:core-util-is@1.0.2.js", "npm:inherits@2.0.1.js", "@empty", "npm:readable-stream@1.1.13/lib/_stream_duplex.js", "npm:string_decoder@0.10.31.js", "npm:readable-stream@1.1.13/lib/_stream_duplex.js", "npm:string_decoder@0.10.31.js", "github:jspm/nodelibs-buffer@0.1.0.js", "github:jspm/nodelibs-process@0.1.2.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  (function(Buffer, process) {
    module.exports = Readable;
    var isArray = require("npm:isarray@0.0.1.js");
    var Buffer = require("github:jspm/nodelibs-buffer@0.1.0.js").Buffer;
    Readable.ReadableState = ReadableState;
    var EE = require("github:jspm/nodelibs-events@0.1.1.js").EventEmitter;
    if (!EE.listenerCount)
      EE.listenerCount = function(emitter, type) {
        return emitter.listeners(type).length;
      };
    var Stream = require("npm:stream-browserify@1.0.0/index.js");
    var util = require("npm:core-util-is@1.0.2.js");
    util.inherits = require("npm:inherits@2.0.1.js");
    var StringDecoder;
    var debug = require("@empty");
    if (debug && debug.debuglog) {
      debug = debug.debuglog('stream');
    } else {
      debug = function() {};
    }
    util.inherits(Readable, Stream);
    function ReadableState(options, stream) {
      var Duplex = require("npm:readable-stream@1.1.13/lib/_stream_duplex.js");
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
          StringDecoder = require("npm:string_decoder@0.10.31.js").StringDecoder;
        this.decoder = new StringDecoder(options.encoding);
        this.encoding = options.encoding;
      }
    }
    function Readable(options) {
      var Duplex = require("npm:readable-stream@1.1.13/lib/_stream_duplex.js");
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
        StringDecoder = require("npm:string_decoder@0.10.31.js").StringDecoder;
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
  })(require("github:jspm/nodelibs-buffer@0.1.0.js").Buffer, require("github:jspm/nodelibs-process@0.1.2.js"));
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/_MapCache.js", ["npm:lodash@4.2.0/_mapClear.js", "npm:lodash@4.2.0/_mapDelete.js", "npm:lodash@4.2.0/_mapGet.js", "npm:lodash@4.2.0/_mapHas.js", "npm:lodash@4.2.0/_mapSet.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var mapClear = require("npm:lodash@4.2.0/_mapClear.js"),
      mapDelete = require("npm:lodash@4.2.0/_mapDelete.js"),
      mapGet = require("npm:lodash@4.2.0/_mapGet.js"),
      mapHas = require("npm:lodash@4.2.0/_mapHas.js"),
      mapSet = require("npm:lodash@4.2.0/_mapSet.js");
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
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/_baseMatchesProperty.js", ["npm:lodash@4.2.0/_baseIsEqual.js", "npm:lodash@4.2.0/get.js", "npm:lodash@4.2.0/hasIn.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var baseIsEqual = require("npm:lodash@4.2.0/_baseIsEqual.js"),
      get = require("npm:lodash@4.2.0/get.js"),
      hasIn = require("npm:lodash@4.2.0/hasIn.js");
  var UNORDERED_COMPARE_FLAG = 1,
      PARTIAL_COMPARE_FLAG = 2;
  function baseMatchesProperty(path, srcValue) {
    return function(object) {
      var objValue = get(object, path);
      return (objValue === undefined && objValue === srcValue) ? hasIn(object, path) : baseIsEqual(srcValue, objValue, undefined, UNORDERED_COMPARE_FLAG | PARTIAL_COMPARE_FLAG);
    };
  }
  module.exports = baseMatchesProperty;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:babel-runtime@5.8.35/core-js/promise.js", ["npm:core-js@0.9.18/library/fn/promise.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = {
    "default": require("npm:core-js@0.9.18/library/fn/promise.js"),
    __esModule: true
  };
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:readable-stream@1.1.13/readable.js", ["npm:readable-stream@1.1.13/lib/_stream_readable.js", "npm:stream-browserify@1.0.0/index.js", "npm:readable-stream@1.1.13/lib/_stream_writable.js", "npm:readable-stream@1.1.13/lib/_stream_duplex.js", "npm:readable-stream@1.1.13/lib/_stream_transform.js", "npm:readable-stream@1.1.13/lib/_stream_passthrough.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  exports = module.exports = require("npm:readable-stream@1.1.13/lib/_stream_readable.js");
  exports.Stream = require("npm:stream-browserify@1.0.0/index.js");
  exports.Readable = exports;
  exports.Writable = require("npm:readable-stream@1.1.13/lib/_stream_writable.js");
  exports.Duplex = require("npm:readable-stream@1.1.13/lib/_stream_duplex.js");
  exports.Transform = require("npm:readable-stream@1.1.13/lib/_stream_transform.js");
  exports.PassThrough = require("npm:readable-stream@1.1.13/lib/_stream_passthrough.js");
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/_stackSet.js", ["npm:lodash@4.2.0/_MapCache.js", "npm:lodash@4.2.0/_assocSet.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var MapCache = require("npm:lodash@4.2.0/_MapCache.js"),
      assocSet = require("npm:lodash@4.2.0/_assocSet.js");
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
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:babel-runtime@5.8.35/regenerator/runtime.js", ["npm:babel-runtime@5.8.35/core-js/symbol.js", "npm:babel-runtime@5.8.35/core-js/object/create.js", "npm:babel-runtime@5.8.35/core-js/object/set-prototype-of.js", "npm:babel-runtime@5.8.35/core-js/promise.js", "github:jspm/nodelibs-process@0.1.2.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  (function(process) {
    "use strict";
    var _Symbol = require("npm:babel-runtime@5.8.35/core-js/symbol.js")["default"];
    var _Object$create = require("npm:babel-runtime@5.8.35/core-js/object/create.js")["default"];
    var _Object$setPrototypeOf = require("npm:babel-runtime@5.8.35/core-js/object/set-prototype-of.js")["default"];
    var _Promise = require("npm:babel-runtime@5.8.35/core-js/promise.js")["default"];
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
  })(require("github:jspm/nodelibs-process@0.1.2.js"));
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:stream-browserify@1.0.0/index.js", ["github:jspm/nodelibs-events@0.1.1.js", "npm:inherits@2.0.1.js", "npm:readable-stream@1.1.13/readable.js", "npm:readable-stream@1.1.13/writable.js", "npm:readable-stream@1.1.13/duplex.js", "npm:readable-stream@1.1.13/transform.js", "npm:readable-stream@1.1.13/passthrough.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = Stream;
  var EE = require("github:jspm/nodelibs-events@0.1.1.js").EventEmitter;
  var inherits = require("npm:inherits@2.0.1.js");
  inherits(Stream, EE);
  Stream.Readable = require("npm:readable-stream@1.1.13/readable.js");
  Stream.Writable = require("npm:readable-stream@1.1.13/writable.js");
  Stream.Duplex = require("npm:readable-stream@1.1.13/duplex.js");
  Stream.Transform = require("npm:readable-stream@1.1.13/transform.js");
  Stream.PassThrough = require("npm:readable-stream@1.1.13/passthrough.js");
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
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/_Stack.js", ["npm:lodash@4.2.0/_stackClear.js", "npm:lodash@4.2.0/_stackDelete.js", "npm:lodash@4.2.0/_stackGet.js", "npm:lodash@4.2.0/_stackHas.js", "npm:lodash@4.2.0/_stackSet.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var stackClear = require("npm:lodash@4.2.0/_stackClear.js"),
      stackDelete = require("npm:lodash@4.2.0/_stackDelete.js"),
      stackGet = require("npm:lodash@4.2.0/_stackGet.js"),
      stackHas = require("npm:lodash@4.2.0/_stackHas.js"),
      stackSet = require("npm:lodash@4.2.0/_stackSet.js");
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
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:babel-runtime@5.8.35/regenerator/index.js", ["npm:babel-runtime@5.8.35/regenerator/runtime.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var g = typeof global === "object" ? global : typeof window === "object" ? window : typeof self === "object" ? self : this;
  var hadRuntime = g.regeneratorRuntime && Object.getOwnPropertyNames(g).indexOf("regeneratorRuntime") >= 0;
  var oldRuntime = hadRuntime && g.regeneratorRuntime;
  g.regeneratorRuntime = undefined;
  module.exports = require("npm:babel-runtime@5.8.35/regenerator/runtime.js");
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
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:stream-browserify@1.0.0.js", ["npm:stream-browserify@1.0.0/index.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = require("npm:stream-browserify@1.0.0/index.js");
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/_baseIsMatch.js", ["npm:lodash@4.2.0/_Stack.js", "npm:lodash@4.2.0/_baseIsEqual.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var Stack = require("npm:lodash@4.2.0/_Stack.js"),
      baseIsEqual = require("npm:lodash@4.2.0/_baseIsEqual.js");
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
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:babel-runtime@5.8.35/regenerator.js", ["npm:babel-runtime@5.8.35/regenerator/index.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = require("npm:babel-runtime@5.8.35/regenerator/index.js");
  global.define = __define;
  return module.exports;
});

System.registerDynamic("github:jspm/nodelibs-stream@0.1.0/index.js", ["npm:stream-browserify@1.0.0.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = System._nodeRequire ? System._nodeRequire('stream') : require("npm:stream-browserify@1.0.0.js");
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/_baseMatches.js", ["npm:lodash@4.2.0/_baseIsMatch.js", "npm:lodash@4.2.0/_getMatchData.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var baseIsMatch = require("npm:lodash@4.2.0/_baseIsMatch.js"),
      getMatchData = require("npm:lodash@4.2.0/_getMatchData.js");
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
  global.define = __define;
  return module.exports;
});

System.registerDynamic("github:jspm/nodelibs-stream@0.1.0.js", ["github:jspm/nodelibs-stream@0.1.0/index.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = require("github:jspm/nodelibs-stream@0.1.0/index.js");
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/_baseIteratee.js", ["npm:lodash@4.2.0/_baseMatches.js", "npm:lodash@4.2.0/_baseMatchesProperty.js", "npm:lodash@4.2.0/identity.js", "npm:lodash@4.2.0/isArray.js", "npm:lodash@4.2.0/property.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var baseMatches = require("npm:lodash@4.2.0/_baseMatches.js"),
      baseMatchesProperty = require("npm:lodash@4.2.0/_baseMatchesProperty.js"),
      identity = require("npm:lodash@4.2.0/identity.js"),
      isArray = require("npm:lodash@4.2.0/isArray.js"),
      property = require("npm:lodash@4.2.0/property.js");
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
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:sax@0.6.1/lib/sax.js", ["github:jspm/nodelibs-stream@0.1.0.js", "github:jspm/nodelibs-string_decoder@0.1.0.js", "github:jspm/nodelibs-buffer@0.1.0.js", "github:jspm/nodelibs-process@0.1.2.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
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
      var buffers = ["comment", "sgmlDecl", "textNode", "tagName", "doctype", "procInstName", "procInstBody", "entity", "attribName", "attribValue", "cdata", "script"];
      sax.EVENTS = ["text", "processinginstruction", "sgmldeclaration", "doctype", "comment", "attribute", "opentag", "closetag", "opencdata", "cdata", "closecdata", "error", "end", "ready", "script", "opennamespace", "closenamespace"];
      function SAXParser(strict, opt) {
        if (!(this instanceof SAXParser))
          return new SAXParser(strict, opt);
        var parser = this;
        clearBuffers(parser);
        parser.q = parser.c = "";
        parser.bufferCheckPosition = sax.MAX_BUFFER_LENGTH;
        parser.opt = opt || {};
        parser.opt.lowercase = parser.opt.lowercase || parser.opt.lowercasetags;
        parser.looseCase = parser.opt.lowercase ? "toLowerCase" : "toUpperCase";
        parser.tags = [];
        parser.closed = parser.closedRoot = parser.sawRoot = false;
        parser.tag = parser.error = null;
        parser.strict = !!strict;
        parser.noscript = !!(strict || parser.opt.noscript);
        parser.state = S.BEGIN;
        parser.ENTITIES = Object.create(sax.ENTITIES);
        parser.attribList = [];
        if (parser.opt.xmlns)
          parser.ns = Object.create(rootNS);
        parser.trackPosition = parser.opt.position !== false;
        if (parser.trackPosition) {
          parser.position = parser.line = parser.column = 0;
        }
        emit(parser, "onready");
      }
      if (!Object.create)
        Object.create = function(o) {
          function f() {
            this.__proto__ = o;
          }
          f.prototype = o;
          return new f;
        };
      if (!Object.getPrototypeOf)
        Object.getPrototypeOf = function(o) {
          return o.__proto__;
        };
      if (!Object.keys)
        Object.keys = function(o) {
          var a = [];
          for (var i in o)
            if (o.hasOwnProperty(i))
              a.push(i);
          return a;
        };
      function checkBufferLength(parser) {
        var maxAllowed = Math.max(sax.MAX_BUFFER_LENGTH, 10),
            maxActual = 0;
        for (var i = 0,
            l = buffers.length; i < l; i++) {
          var len = parser[buffers[i]].length;
          if (len > maxAllowed) {
            switch (buffers[i]) {
              case "textNode":
                closeText(parser);
                break;
              case "cdata":
                emitNode(parser, "oncdata", parser.cdata);
                parser.cdata = "";
                break;
              case "script":
                emitNode(parser, "onscript", parser.script);
                parser.script = "";
                break;
              default:
                error(parser, "Max buffer length exceeded: " + buffers[i]);
            }
          }
          maxActual = Math.max(maxActual, len);
        }
        parser.bufferCheckPosition = (sax.MAX_BUFFER_LENGTH - maxActual) + parser.position;
      }
      function clearBuffers(parser) {
        for (var i = 0,
            l = buffers.length; i < l; i++) {
          parser[buffers[i]] = "";
        }
      }
      function flushBuffers(parser) {
        closeText(parser);
        if (parser.cdata !== "") {
          emitNode(parser, "oncdata", parser.cdata);
          parser.cdata = "";
        }
        if (parser.script !== "") {
          emitNode(parser, "onscript", parser.script);
          parser.script = "";
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
      try {
        var Stream = require("github:jspm/nodelibs-stream@0.1.0.js").Stream;
      } catch (ex) {
        var Stream = function() {};
      }
      var streamWraps = sax.EVENTS.filter(function(ev) {
        return ev !== "error" && ev !== "end";
      });
      function createStream(strict, opt) {
        return new SAXStream(strict, opt);
      }
      function SAXStream(strict, opt) {
        if (!(this instanceof SAXStream))
          return new SAXStream(strict, opt);
        Stream.apply(this);
        this._parser = new SAXParser(strict, opt);
        this.writable = true;
        this.readable = true;
        var me = this;
        this._parser.onend = function() {
          me.emit("end");
        };
        this._parser.onerror = function(er) {
          me.emit("error", er);
          me._parser.error = null;
        };
        this._decoder = null;
        streamWraps.forEach(function(ev) {
          Object.defineProperty(me, "on" + ev, {
            get: function() {
              return me._parser["on" + ev];
            },
            set: function(h) {
              if (!h) {
                me.removeAllListeners(ev);
                return me._parser["on" + ev] = h;
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
            var SD = require("github:jspm/nodelibs-string_decoder@0.1.0.js").StringDecoder;
            this._decoder = new SD('utf8');
          }
          data = this._decoder.write(data);
        }
        this._parser.write(data.toString());
        this.emit("data", data);
        return true;
      };
      SAXStream.prototype.end = function(chunk) {
        if (chunk && chunk.length)
          this.write(chunk);
        this._parser.end();
        return true;
      };
      SAXStream.prototype.on = function(ev, handler) {
        var me = this;
        if (!me._parser["on" + ev] && streamWraps.indexOf(ev) !== -1) {
          me._parser["on" + ev] = function() {
            var args = arguments.length === 1 ? [arguments[0]] : Array.apply(null, arguments);
            args.splice(0, 0, ev);
            me.emit.apply(me, args);
          };
        }
        return Stream.prototype.on.call(me, ev, handler);
      };
      var whitespace = "\r\n\t ",
          number = "0124356789",
          letter = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
          quote = "'\"",
          entity = number + letter + "#",
          attribEnd = whitespace + ">",
          CDATA = "[CDATA[",
          DOCTYPE = "DOCTYPE",
          XML_NAMESPACE = "http://www.w3.org/XML/1998/namespace",
          XMLNS_NAMESPACE = "http://www.w3.org/2000/xmlns/",
          rootNS = {
            xml: XML_NAMESPACE,
            xmlns: XMLNS_NAMESPACE
          };
      whitespace = charClass(whitespace);
      number = charClass(number);
      letter = charClass(letter);
      var nameStart = /[:_A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]/;
      var nameBody = /[:_A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\u00B7\u0300-\u036F\u203F-\u2040\.\d-]/;
      quote = charClass(quote);
      entity = charClass(entity);
      attribEnd = charClass(attribEnd);
      function charClass(str) {
        return str.split("").reduce(function(s, c) {
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
      sax.ENTITIES = {
        "amp": "&",
        "gt": ">",
        "lt": "<",
        "quot": "\"",
        "apos": "'",
        "AElig": 198,
        "Aacute": 193,
        "Acirc": 194,
        "Agrave": 192,
        "Aring": 197,
        "Atilde": 195,
        "Auml": 196,
        "Ccedil": 199,
        "ETH": 208,
        "Eacute": 201,
        "Ecirc": 202,
        "Egrave": 200,
        "Euml": 203,
        "Iacute": 205,
        "Icirc": 206,
        "Igrave": 204,
        "Iuml": 207,
        "Ntilde": 209,
        "Oacute": 211,
        "Ocirc": 212,
        "Ograve": 210,
        "Oslash": 216,
        "Otilde": 213,
        "Ouml": 214,
        "THORN": 222,
        "Uacute": 218,
        "Ucirc": 219,
        "Ugrave": 217,
        "Uuml": 220,
        "Yacute": 221,
        "aacute": 225,
        "acirc": 226,
        "aelig": 230,
        "agrave": 224,
        "aring": 229,
        "atilde": 227,
        "auml": 228,
        "ccedil": 231,
        "eacute": 233,
        "ecirc": 234,
        "egrave": 232,
        "eth": 240,
        "euml": 235,
        "iacute": 237,
        "icirc": 238,
        "igrave": 236,
        "iuml": 239,
        "ntilde": 241,
        "oacute": 243,
        "ocirc": 244,
        "ograve": 242,
        "oslash": 248,
        "otilde": 245,
        "ouml": 246,
        "szlig": 223,
        "thorn": 254,
        "uacute": 250,
        "ucirc": 251,
        "ugrave": 249,
        "uuml": 252,
        "yacute": 253,
        "yuml": 255,
        "copy": 169,
        "reg": 174,
        "nbsp": 160,
        "iexcl": 161,
        "cent": 162,
        "pound": 163,
        "curren": 164,
        "yen": 165,
        "brvbar": 166,
        "sect": 167,
        "uml": 168,
        "ordf": 170,
        "laquo": 171,
        "not": 172,
        "shy": 173,
        "macr": 175,
        "deg": 176,
        "plusmn": 177,
        "sup1": 185,
        "sup2": 178,
        "sup3": 179,
        "acute": 180,
        "micro": 181,
        "para": 182,
        "middot": 183,
        "cedil": 184,
        "ordm": 186,
        "raquo": 187,
        "frac14": 188,
        "frac12": 189,
        "frac34": 190,
        "iquest": 191,
        "times": 215,
        "divide": 247,
        "OElig": 338,
        "oelig": 339,
        "Scaron": 352,
        "scaron": 353,
        "Yuml": 376,
        "fnof": 402,
        "circ": 710,
        "tilde": 732,
        "Alpha": 913,
        "Beta": 914,
        "Gamma": 915,
        "Delta": 916,
        "Epsilon": 917,
        "Zeta": 918,
        "Eta": 919,
        "Theta": 920,
        "Iota": 921,
        "Kappa": 922,
        "Lambda": 923,
        "Mu": 924,
        "Nu": 925,
        "Xi": 926,
        "Omicron": 927,
        "Pi": 928,
        "Rho": 929,
        "Sigma": 931,
        "Tau": 932,
        "Upsilon": 933,
        "Phi": 934,
        "Chi": 935,
        "Psi": 936,
        "Omega": 937,
        "alpha": 945,
        "beta": 946,
        "gamma": 947,
        "delta": 948,
        "epsilon": 949,
        "zeta": 950,
        "eta": 951,
        "theta": 952,
        "iota": 953,
        "kappa": 954,
        "lambda": 955,
        "mu": 956,
        "nu": 957,
        "xi": 958,
        "omicron": 959,
        "pi": 960,
        "rho": 961,
        "sigmaf": 962,
        "sigma": 963,
        "tau": 964,
        "upsilon": 965,
        "phi": 966,
        "chi": 967,
        "psi": 968,
        "omega": 969,
        "thetasym": 977,
        "upsih": 978,
        "piv": 982,
        "ensp": 8194,
        "emsp": 8195,
        "thinsp": 8201,
        "zwnj": 8204,
        "zwj": 8205,
        "lrm": 8206,
        "rlm": 8207,
        "ndash": 8211,
        "mdash": 8212,
        "lsquo": 8216,
        "rsquo": 8217,
        "sbquo": 8218,
        "ldquo": 8220,
        "rdquo": 8221,
        "bdquo": 8222,
        "dagger": 8224,
        "Dagger": 8225,
        "bull": 8226,
        "hellip": 8230,
        "permil": 8240,
        "prime": 8242,
        "Prime": 8243,
        "lsaquo": 8249,
        "rsaquo": 8250,
        "oline": 8254,
        "frasl": 8260,
        "euro": 8364,
        "image": 8465,
        "weierp": 8472,
        "real": 8476,
        "trade": 8482,
        "alefsym": 8501,
        "larr": 8592,
        "uarr": 8593,
        "rarr": 8594,
        "darr": 8595,
        "harr": 8596,
        "crarr": 8629,
        "lArr": 8656,
        "uArr": 8657,
        "rArr": 8658,
        "dArr": 8659,
        "hArr": 8660,
        "forall": 8704,
        "part": 8706,
        "exist": 8707,
        "empty": 8709,
        "nabla": 8711,
        "isin": 8712,
        "notin": 8713,
        "ni": 8715,
        "prod": 8719,
        "sum": 8721,
        "minus": 8722,
        "lowast": 8727,
        "radic": 8730,
        "prop": 8733,
        "infin": 8734,
        "ang": 8736,
        "and": 8743,
        "or": 8744,
        "cap": 8745,
        "cup": 8746,
        "int": 8747,
        "there4": 8756,
        "sim": 8764,
        "cong": 8773,
        "asymp": 8776,
        "ne": 8800,
        "equiv": 8801,
        "le": 8804,
        "ge": 8805,
        "sub": 8834,
        "sup": 8835,
        "nsub": 8836,
        "sube": 8838,
        "supe": 8839,
        "oplus": 8853,
        "otimes": 8855,
        "perp": 8869,
        "sdot": 8901,
        "lceil": 8968,
        "rceil": 8969,
        "lfloor": 8970,
        "rfloor": 8971,
        "lang": 9001,
        "rang": 9002,
        "loz": 9674,
        "spades": 9824,
        "clubs": 9827,
        "hearts": 9829,
        "diams": 9830
      };
      Object.keys(sax.ENTITIES).forEach(function(key) {
        var e = sax.ENTITIES[key];
        var s = typeof e === 'number' ? String.fromCharCode(e) : e;
        sax.ENTITIES[key] = s;
      });
      for (var S in sax.STATE)
        sax.STATE[sax.STATE[S]] = S;
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
          emit(parser, "ontext", parser.textNode);
        parser.textNode = "";
      }
      function textopts(opt, text) {
        if (opt.trim)
          text = text.trim();
        if (opt.normalize)
          text = text.replace(/\s+/g, " ");
        return text;
      }
      function error(parser, er) {
        closeText(parser);
        if (parser.trackPosition) {
          er += "\nLine: " + parser.line + "\nColumn: " + parser.column + "\nChar: " + parser.c;
        }
        er = new Error(er);
        parser.error = er;
        emit(parser, "onerror", er);
        return parser;
      }
      function end(parser) {
        if (!parser.closedRoot)
          strictFail(parser, "Unclosed root tag");
        if ((parser.state !== S.BEGIN) && (parser.state !== S.TEXT))
          error(parser, "Unexpected end");
        closeText(parser);
        parser.c = "";
        parser.closed = true;
        emit(parser, "onend");
        SAXParser.call(parser, parser.strict, parser.opt);
        return parser;
      }
      function strictFail(parser, message) {
        if (typeof parser !== 'object' || !(parser instanceof SAXParser))
          throw new Error('bad call to strictFail');
        if (parser.strict)
          error(parser, message);
      }
      function newTag(parser) {
        if (!parser.strict)
          parser.tagName = parser.tagName[parser.looseCase]();
        var parent = parser.tags[parser.tags.length - 1] || parser,
            tag = parser.tag = {
              name: parser.tagName,
              attributes: {}
            };
        if (parser.opt.xmlns)
          tag.ns = parent.ns;
        parser.attribList.length = 0;
      }
      function qname(name, attribute) {
        var i = name.indexOf(":"),
            qualName = i < 0 ? ["", name] : name.split(":"),
            prefix = qualName[0],
            local = qualName[1];
        if (attribute && name === "xmlns") {
          prefix = "xmlns";
          local = "";
        }
        return {
          prefix: prefix,
          local: local
        };
      }
      function attrib(parser) {
        if (!parser.strict)
          parser.attribName = parser.attribName[parser.looseCase]();
        if (parser.attribList.indexOf(parser.attribName) !== -1 || parser.tag.attributes.hasOwnProperty(parser.attribName)) {
          return parser.attribName = parser.attribValue = "";
        }
        if (parser.opt.xmlns) {
          var qn = qname(parser.attribName, true),
              prefix = qn.prefix,
              local = qn.local;
          if (prefix === "xmlns") {
            if (local === "xml" && parser.attribValue !== XML_NAMESPACE) {
              strictFail(parser, "xml: prefix must be bound to " + XML_NAMESPACE + "\n" + "Actual: " + parser.attribValue);
            } else if (local === "xmlns" && parser.attribValue !== XMLNS_NAMESPACE) {
              strictFail(parser, "xmlns: prefix must be bound to " + XMLNS_NAMESPACE + "\n" + "Actual: " + parser.attribValue);
            } else {
              var tag = parser.tag,
                  parent = parser.tags[parser.tags.length - 1] || parser;
              if (tag.ns === parent.ns) {
                tag.ns = Object.create(parent.ns);
              }
              tag.ns[local] = parser.attribValue;
            }
          }
          parser.attribList.push([parser.attribName, parser.attribValue]);
        } else {
          parser.tag.attributes[parser.attribName] = parser.attribValue;
          emitNode(parser, "onattribute", {
            name: parser.attribName,
            value: parser.attribValue
          });
        }
        parser.attribName = parser.attribValue = "";
      }
      function openTag(parser, selfClosing) {
        if (parser.opt.xmlns) {
          var tag = parser.tag;
          var qn = qname(parser.tagName);
          tag.prefix = qn.prefix;
          tag.local = qn.local;
          tag.uri = tag.ns[qn.prefix] || "";
          if (tag.prefix && !tag.uri) {
            strictFail(parser, "Unbound namespace prefix: " + JSON.stringify(parser.tagName));
            tag.uri = qn.prefix;
          }
          var parent = parser.tags[parser.tags.length - 1] || parser;
          if (tag.ns && parent.ns !== tag.ns) {
            Object.keys(tag.ns).forEach(function(p) {
              emitNode(parser, "onopennamespace", {
                prefix: p,
                uri: tag.ns[p]
              });
            });
          }
          for (var i = 0,
              l = parser.attribList.length; i < l; i++) {
            var nv = parser.attribList[i];
            var name = nv[0],
                value = nv[1],
                qualName = qname(name, true),
                prefix = qualName.prefix,
                local = qualName.local,
                uri = prefix == "" ? "" : (tag.ns[prefix] || ""),
                a = {
                  name: name,
                  value: value,
                  prefix: prefix,
                  local: local,
                  uri: uri
                };
            if (prefix && prefix != "xmlns" && !uri) {
              strictFail(parser, "Unbound namespace prefix: " + JSON.stringify(prefix));
              a.uri = prefix;
            }
            parser.tag.attributes[name] = a;
            emitNode(parser, "onattribute", a);
          }
          parser.attribList.length = 0;
        }
        parser.tag.isSelfClosing = !!selfClosing;
        parser.sawRoot = true;
        parser.tags.push(parser.tag);
        emitNode(parser, "onopentag", parser.tag);
        if (!selfClosing) {
          if (!parser.noscript && parser.tagName.toLowerCase() === "script") {
            parser.state = S.SCRIPT;
          } else {
            parser.state = S.TEXT;
          }
          parser.tag = null;
          parser.tagName = "";
        }
        parser.attribName = parser.attribValue = "";
        parser.attribList.length = 0;
      }
      function closeTag(parser) {
        if (!parser.tagName) {
          strictFail(parser, "Weird empty close tag.");
          parser.textNode += "</>";
          parser.state = S.TEXT;
          return;
        }
        if (parser.script) {
          if (parser.tagName !== "script") {
            parser.script += "</" + parser.tagName + ">";
            parser.tagName = "";
            parser.state = S.SCRIPT;
            return;
          }
          emitNode(parser, "onscript", parser.script);
          parser.script = "";
        }
        var t = parser.tags.length;
        var tagName = parser.tagName;
        if (!parser.strict)
          tagName = tagName[parser.looseCase]();
        var closeTo = tagName;
        while (t--) {
          var close = parser.tags[t];
          if (close.name !== closeTo) {
            strictFail(parser, "Unexpected close tag");
          } else
            break;
        }
        if (t < 0) {
          strictFail(parser, "Unmatched closing tag: " + parser.tagName);
          parser.textNode += "</" + parser.tagName + ">";
          parser.state = S.TEXT;
          return;
        }
        parser.tagName = tagName;
        var s = parser.tags.length;
        while (s-- > t) {
          var tag = parser.tag = parser.tags.pop();
          parser.tagName = parser.tag.name;
          emitNode(parser, "onclosetag", parser.tagName);
          var x = {};
          for (var i in tag.ns)
            x[i] = tag.ns[i];
          var parent = parser.tags[parser.tags.length - 1] || parser;
          if (parser.opt.xmlns && tag.ns !== parent.ns) {
            Object.keys(tag.ns).forEach(function(p) {
              var n = tag.ns[p];
              emitNode(parser, "onclosenamespace", {
                prefix: p,
                uri: n
              });
            });
          }
        }
        if (t === 0)
          parser.closedRoot = true;
        parser.tagName = parser.attribValue = parser.attribName = "";
        parser.attribList.length = 0;
        parser.state = S.TEXT;
      }
      function parseEntity(parser) {
        var entity = parser.entity,
            entityLC = entity.toLowerCase(),
            num,
            numStr = "";
        if (parser.ENTITIES[entity])
          return parser.ENTITIES[entity];
        if (parser.ENTITIES[entityLC])
          return parser.ENTITIES[entityLC];
        entity = entityLC;
        if (entity.charAt(0) === "#") {
          if (entity.charAt(1) === "x") {
            entity = entity.slice(2);
            num = parseInt(entity, 16);
            numStr = num.toString(16);
          } else {
            entity = entity.slice(1);
            num = parseInt(entity, 10);
            numStr = num.toString(10);
          }
        }
        entity = entity.replace(/^0+/, "");
        if (numStr.toLowerCase() !== entity) {
          strictFail(parser, "Invalid character entity");
          return "&" + parser.entity + ";";
        }
        return String.fromCodePoint(num);
      }
      function write(chunk) {
        var parser = this;
        if (this.error)
          throw this.error;
        if (parser.closed)
          return error(parser, "Cannot write after close. Assign an onready handler.");
        if (chunk === null)
          return end(parser);
        var i = 0,
            c = "";
        while (parser.c = c = chunk.charAt(i++)) {
          if (parser.trackPosition) {
            parser.position++;
            if (c === "\n") {
              parser.line++;
              parser.column = 0;
            } else
              parser.column++;
          }
          switch (parser.state) {
            case S.BEGIN:
              if (c === "<") {
                parser.state = S.OPEN_WAKA;
                parser.startTagPosition = parser.position;
              } else if (not(whitespace, c)) {
                strictFail(parser, "Non-whitespace before first tag.");
                parser.textNode = c;
                parser.state = S.TEXT;
              }
              continue;
            case S.TEXT:
              if (parser.sawRoot && !parser.closedRoot) {
                var starti = i - 1;
                while (c && c !== "<" && c !== "&") {
                  c = chunk.charAt(i++);
                  if (c && parser.trackPosition) {
                    parser.position++;
                    if (c === "\n") {
                      parser.line++;
                      parser.column = 0;
                    } else
                      parser.column++;
                  }
                }
                parser.textNode += chunk.substring(starti, i - 1);
              }
              if (c === "<") {
                parser.state = S.OPEN_WAKA;
                parser.startTagPosition = parser.position;
              } else {
                if (not(whitespace, c) && (!parser.sawRoot || parser.closedRoot))
                  strictFail(parser, "Text data outside of root node.");
                if (c === "&")
                  parser.state = S.TEXT_ENTITY;
                else
                  parser.textNode += c;
              }
              continue;
            case S.SCRIPT:
              if (c === "<") {
                parser.state = S.SCRIPT_ENDING;
              } else
                parser.script += c;
              continue;
            case S.SCRIPT_ENDING:
              if (c === "/") {
                parser.state = S.CLOSE_TAG;
              } else {
                parser.script += "<" + c;
                parser.state = S.SCRIPT;
              }
              continue;
            case S.OPEN_WAKA:
              if (c === "!") {
                parser.state = S.SGML_DECL;
                parser.sgmlDecl = "";
              } else if (is(whitespace, c)) {} else if (is(nameStart, c)) {
                parser.state = S.OPEN_TAG;
                parser.tagName = c;
              } else if (c === "/") {
                parser.state = S.CLOSE_TAG;
                parser.tagName = "";
              } else if (c === "?") {
                parser.state = S.PROC_INST;
                parser.procInstName = parser.procInstBody = "";
              } else {
                strictFail(parser, "Unencoded <");
                if (parser.startTagPosition + 1 < parser.position) {
                  var pad = parser.position - parser.startTagPosition;
                  c = new Array(pad).join(" ") + c;
                }
                parser.textNode += "<" + c;
                parser.state = S.TEXT;
              }
              continue;
            case S.SGML_DECL:
              if ((parser.sgmlDecl + c).toUpperCase() === CDATA) {
                emitNode(parser, "onopencdata");
                parser.state = S.CDATA;
                parser.sgmlDecl = "";
                parser.cdata = "";
              } else if (parser.sgmlDecl + c === "--") {
                parser.state = S.COMMENT;
                parser.comment = "";
                parser.sgmlDecl = "";
              } else if ((parser.sgmlDecl + c).toUpperCase() === DOCTYPE) {
                parser.state = S.DOCTYPE;
                if (parser.doctype || parser.sawRoot)
                  strictFail(parser, "Inappropriately located doctype declaration");
                parser.doctype = "";
                parser.sgmlDecl = "";
              } else if (c === ">") {
                emitNode(parser, "onsgmldeclaration", parser.sgmlDecl);
                parser.sgmlDecl = "";
                parser.state = S.TEXT;
              } else if (is(quote, c)) {
                parser.state = S.SGML_DECL_QUOTED;
                parser.sgmlDecl += c;
              } else
                parser.sgmlDecl += c;
              continue;
            case S.SGML_DECL_QUOTED:
              if (c === parser.q) {
                parser.state = S.SGML_DECL;
                parser.q = "";
              }
              parser.sgmlDecl += c;
              continue;
            case S.DOCTYPE:
              if (c === ">") {
                parser.state = S.TEXT;
                emitNode(parser, "ondoctype", parser.doctype);
                parser.doctype = true;
              } else {
                parser.doctype += c;
                if (c === "[")
                  parser.state = S.DOCTYPE_DTD;
                else if (is(quote, c)) {
                  parser.state = S.DOCTYPE_QUOTED;
                  parser.q = c;
                }
              }
              continue;
            case S.DOCTYPE_QUOTED:
              parser.doctype += c;
              if (c === parser.q) {
                parser.q = "";
                parser.state = S.DOCTYPE;
              }
              continue;
            case S.DOCTYPE_DTD:
              parser.doctype += c;
              if (c === "]")
                parser.state = S.DOCTYPE;
              else if (is(quote, c)) {
                parser.state = S.DOCTYPE_DTD_QUOTED;
                parser.q = c;
              }
              continue;
            case S.DOCTYPE_DTD_QUOTED:
              parser.doctype += c;
              if (c === parser.q) {
                parser.state = S.DOCTYPE_DTD;
                parser.q = "";
              }
              continue;
            case S.COMMENT:
              if (c === "-")
                parser.state = S.COMMENT_ENDING;
              else
                parser.comment += c;
              continue;
            case S.COMMENT_ENDING:
              if (c === "-") {
                parser.state = S.COMMENT_ENDED;
                parser.comment = textopts(parser.opt, parser.comment);
                if (parser.comment)
                  emitNode(parser, "oncomment", parser.comment);
                parser.comment = "";
              } else {
                parser.comment += "-" + c;
                parser.state = S.COMMENT;
              }
              continue;
            case S.COMMENT_ENDED:
              if (c !== ">") {
                strictFail(parser, "Malformed comment");
                parser.comment += "--" + c;
                parser.state = S.COMMENT;
              } else
                parser.state = S.TEXT;
              continue;
            case S.CDATA:
              if (c === "]")
                parser.state = S.CDATA_ENDING;
              else
                parser.cdata += c;
              continue;
            case S.CDATA_ENDING:
              if (c === "]")
                parser.state = S.CDATA_ENDING_2;
              else {
                parser.cdata += "]" + c;
                parser.state = S.CDATA;
              }
              continue;
            case S.CDATA_ENDING_2:
              if (c === ">") {
                if (parser.cdata)
                  emitNode(parser, "oncdata", parser.cdata);
                emitNode(parser, "onclosecdata");
                parser.cdata = "";
                parser.state = S.TEXT;
              } else if (c === "]") {
                parser.cdata += "]";
              } else {
                parser.cdata += "]]" + c;
                parser.state = S.CDATA;
              }
              continue;
            case S.PROC_INST:
              if (c === "?")
                parser.state = S.PROC_INST_ENDING;
              else if (is(whitespace, c))
                parser.state = S.PROC_INST_BODY;
              else
                parser.procInstName += c;
              continue;
            case S.PROC_INST_BODY:
              if (!parser.procInstBody && is(whitespace, c))
                continue;
              else if (c === "?")
                parser.state = S.PROC_INST_ENDING;
              else
                parser.procInstBody += c;
              continue;
            case S.PROC_INST_ENDING:
              if (c === ">") {
                emitNode(parser, "onprocessinginstruction", {
                  name: parser.procInstName,
                  body: parser.procInstBody
                });
                parser.procInstName = parser.procInstBody = "";
                parser.state = S.TEXT;
              } else {
                parser.procInstBody += "?" + c;
                parser.state = S.PROC_INST_BODY;
              }
              continue;
            case S.OPEN_TAG:
              if (is(nameBody, c))
                parser.tagName += c;
              else {
                newTag(parser);
                if (c === ">")
                  openTag(parser);
                else if (c === "/")
                  parser.state = S.OPEN_TAG_SLASH;
                else {
                  if (not(whitespace, c))
                    strictFail(parser, "Invalid character in tag name");
                  parser.state = S.ATTRIB;
                }
              }
              continue;
            case S.OPEN_TAG_SLASH:
              if (c === ">") {
                openTag(parser, true);
                closeTag(parser);
              } else {
                strictFail(parser, "Forward-slash in opening tag not followed by >");
                parser.state = S.ATTRIB;
              }
              continue;
            case S.ATTRIB:
              if (is(whitespace, c))
                continue;
              else if (c === ">")
                openTag(parser);
              else if (c === "/")
                parser.state = S.OPEN_TAG_SLASH;
              else if (is(nameStart, c)) {
                parser.attribName = c;
                parser.attribValue = "";
                parser.state = S.ATTRIB_NAME;
              } else
                strictFail(parser, "Invalid attribute name");
              continue;
            case S.ATTRIB_NAME:
              if (c === "=")
                parser.state = S.ATTRIB_VALUE;
              else if (c === ">") {
                strictFail(parser, "Attribute without value");
                parser.attribValue = parser.attribName;
                attrib(parser);
                openTag(parser);
              } else if (is(whitespace, c))
                parser.state = S.ATTRIB_NAME_SAW_WHITE;
              else if (is(nameBody, c))
                parser.attribName += c;
              else
                strictFail(parser, "Invalid attribute name");
              continue;
            case S.ATTRIB_NAME_SAW_WHITE:
              if (c === "=")
                parser.state = S.ATTRIB_VALUE;
              else if (is(whitespace, c))
                continue;
              else {
                strictFail(parser, "Attribute without value");
                parser.tag.attributes[parser.attribName] = "";
                parser.attribValue = "";
                emitNode(parser, "onattribute", {
                  name: parser.attribName,
                  value: ""
                });
                parser.attribName = "";
                if (c === ">")
                  openTag(parser);
                else if (is(nameStart, c)) {
                  parser.attribName = c;
                  parser.state = S.ATTRIB_NAME;
                } else {
                  strictFail(parser, "Invalid attribute name");
                  parser.state = S.ATTRIB;
                }
              }
              continue;
            case S.ATTRIB_VALUE:
              if (is(whitespace, c))
                continue;
              else if (is(quote, c)) {
                parser.q = c;
                parser.state = S.ATTRIB_VALUE_QUOTED;
              } else {
                strictFail(parser, "Unquoted attribute value");
                parser.state = S.ATTRIB_VALUE_UNQUOTED;
                parser.attribValue = c;
              }
              continue;
            case S.ATTRIB_VALUE_QUOTED:
              if (c !== parser.q) {
                if (c === "&")
                  parser.state = S.ATTRIB_VALUE_ENTITY_Q;
                else
                  parser.attribValue += c;
                continue;
              }
              attrib(parser);
              parser.q = "";
              parser.state = S.ATTRIB_VALUE_CLOSED;
              continue;
            case S.ATTRIB_VALUE_CLOSED:
              if (is(whitespace, c)) {
                parser.state = S.ATTRIB;
              } else if (c === ">")
                openTag(parser);
              else if (c === "/")
                parser.state = S.OPEN_TAG_SLASH;
              else if (is(nameStart, c)) {
                strictFail(parser, "No whitespace between attributes");
                parser.attribName = c;
                parser.attribValue = "";
                parser.state = S.ATTRIB_NAME;
              } else
                strictFail(parser, "Invalid attribute name");
              continue;
            case S.ATTRIB_VALUE_UNQUOTED:
              if (not(attribEnd, c)) {
                if (c === "&")
                  parser.state = S.ATTRIB_VALUE_ENTITY_U;
                else
                  parser.attribValue += c;
                continue;
              }
              attrib(parser);
              if (c === ">")
                openTag(parser);
              else
                parser.state = S.ATTRIB;
              continue;
            case S.CLOSE_TAG:
              if (!parser.tagName) {
                if (is(whitespace, c))
                  continue;
                else if (not(nameStart, c)) {
                  if (parser.script) {
                    parser.script += "</" + c;
                    parser.state = S.SCRIPT;
                  } else {
                    strictFail(parser, "Invalid tagname in closing tag.");
                  }
                } else
                  parser.tagName = c;
              } else if (c === ">")
                closeTag(parser);
              else if (is(nameBody, c))
                parser.tagName += c;
              else if (parser.script) {
                parser.script += "</" + parser.tagName;
                parser.tagName = "";
                parser.state = S.SCRIPT;
              } else {
                if (not(whitespace, c))
                  strictFail(parser, "Invalid tagname in closing tag");
                parser.state = S.CLOSE_TAG_SAW_WHITE;
              }
              continue;
            case S.CLOSE_TAG_SAW_WHITE:
              if (is(whitespace, c))
                continue;
              if (c === ">")
                closeTag(parser);
              else
                strictFail(parser, "Invalid characters in closing tag");
              continue;
            case S.TEXT_ENTITY:
            case S.ATTRIB_VALUE_ENTITY_Q:
            case S.ATTRIB_VALUE_ENTITY_U:
              switch (parser.state) {
                case S.TEXT_ENTITY:
                  var returnState = S.TEXT,
                      buffer = "textNode";
                  break;
                case S.ATTRIB_VALUE_ENTITY_Q:
                  var returnState = S.ATTRIB_VALUE_QUOTED,
                      buffer = "attribValue";
                  break;
                case S.ATTRIB_VALUE_ENTITY_U:
                  var returnState = S.ATTRIB_VALUE_UNQUOTED,
                      buffer = "attribValue";
                  break;
              }
              if (c === ";") {
                parser[buffer] += parseEntity(parser);
                parser.entity = "";
                parser.state = returnState;
              } else if (is(entity, c))
                parser.entity += c;
              else {
                strictFail(parser, "Invalid character entity");
                parser[buffer] += "&" + parser.entity + c;
                parser.entity = "";
                parser.state = returnState;
              }
              continue;
            default:
              throw new Error(parser, "Unknown state: " + parser.state);
          }
        }
        if (parser.position >= parser.bufferCheckPosition)
          checkBufferLength(parser);
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
              if (!isFinite(codePoint) || codePoint < 0 || codePoint > 0x10FFFF || floor(codePoint) != codePoint) {
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
              if (index + 1 == length || codeUnits.length > MAX_SIZE) {
                result += stringFromCharCode.apply(null, codeUnits);
                codeUnits.length = 0;
              }
            }
            return result;
          };
          if (Object.defineProperty) {
            Object.defineProperty(String, 'fromCodePoint', {
              'value': fromCodePoint,
              'configurable': true,
              'writable': true
            });
          } else {
            String.fromCodePoint = fromCodePoint;
          }
        }());
      }
    })(typeof exports === "undefined" ? sax = {} : exports);
  })(require("github:jspm/nodelibs-buffer@0.1.0.js").Buffer, require("github:jspm/nodelibs-process@0.1.2.js"));
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:lodash@4.2.0/every.js", ["npm:lodash@4.2.0/_arrayEvery.js", "npm:lodash@4.2.0/_baseEvery.js", "npm:lodash@4.2.0/_baseIteratee.js", "npm:lodash@4.2.0/isArray.js", "npm:lodash@4.2.0/_isIterateeCall.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  var arrayEvery = require("npm:lodash@4.2.0/_arrayEvery.js"),
      baseEvery = require("npm:lodash@4.2.0/_baseEvery.js"),
      baseIteratee = require("npm:lodash@4.2.0/_baseIteratee.js"),
      isArray = require("npm:lodash@4.2.0/isArray.js"),
      isIterateeCall = require("npm:lodash@4.2.0/_isIterateeCall.js");
  function every(collection, predicate, guard) {
    var func = isArray(collection) ? arrayEvery : baseEvery;
    if (guard && isIterateeCall(collection, predicate, guard)) {
      predicate = undefined;
    }
    return func(collection, baseIteratee(predicate, 3));
  }
  module.exports = every;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:sax@0.6.1.js", ["npm:sax@0.6.1/lib/sax.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = require("npm:sax@0.6.1/lib/sax.js");
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:xmlbuilder@4.2.1/lib/XMLElement.js", ["npm:lodash@4.2.0/create.js", "npm:lodash@4.2.0/isObject.js", "npm:lodash@4.2.0/isFunction.js", "npm:lodash@4.2.0/every.js", "npm:xmlbuilder@4.2.1/lib/XMLNode.js", "npm:xmlbuilder@4.2.1/lib/XMLAttribute.js", "npm:xmlbuilder@4.2.1/lib/XMLProcessingInstruction.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
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
    create = require("npm:lodash@4.2.0/create.js");
    isObject = require("npm:lodash@4.2.0/isObject.js");
    isFunction = require("npm:lodash@4.2.0/isFunction.js");
    every = require("npm:lodash@4.2.0/every.js");
    XMLNode = require("npm:xmlbuilder@4.2.1/lib/XMLNode.js");
    XMLAttribute = require("npm:xmlbuilder@4.2.1/lib/XMLAttribute.js");
    XMLProcessingInstruction = require("npm:xmlbuilder@4.2.1/lib/XMLProcessingInstruction.js");
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
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:xmlbuilder@4.2.1/lib/XMLNode.js", ["npm:lodash@4.2.0/isObject.js", "npm:lodash@4.2.0/isFunction.js", "npm:lodash@4.2.0/isEmpty.js", "npm:xmlbuilder@4.2.1/lib/XMLElement.js", "npm:xmlbuilder@4.2.1/lib/XMLCData.js", "npm:xmlbuilder@4.2.1/lib/XMLComment.js", "npm:xmlbuilder@4.2.1/lib/XMLDeclaration.js", "npm:xmlbuilder@4.2.1/lib/XMLDocType.js", "npm:xmlbuilder@4.2.1/lib/XMLRaw.js", "npm:xmlbuilder@4.2.1/lib/XMLText.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
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
    isObject = require("npm:lodash@4.2.0/isObject.js");
    isFunction = require("npm:lodash@4.2.0/isFunction.js");
    isEmpty = require("npm:lodash@4.2.0/isEmpty.js");
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
          XMLElement = require("npm:xmlbuilder@4.2.1/lib/XMLElement.js");
          XMLCData = require("npm:xmlbuilder@4.2.1/lib/XMLCData.js");
          XMLComment = require("npm:xmlbuilder@4.2.1/lib/XMLComment.js");
          XMLDeclaration = require("npm:xmlbuilder@4.2.1/lib/XMLDeclaration.js");
          XMLDocType = require("npm:xmlbuilder@4.2.1/lib/XMLDocType.js");
          XMLRaw = require("npm:xmlbuilder@4.2.1/lib/XMLRaw.js");
          XMLText = require("npm:xmlbuilder@4.2.1/lib/XMLText.js");
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
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:xmlbuilder@4.2.1/lib/XMLDeclaration.js", ["npm:lodash@4.2.0/create.js", "npm:lodash@4.2.0/isObject.js", "npm:xmlbuilder@4.2.1/lib/XMLNode.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
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
    create = require("npm:lodash@4.2.0/create.js");
    isObject = require("npm:lodash@4.2.0/isObject.js");
    XMLNode = require("npm:xmlbuilder@4.2.1/lib/XMLNode.js");
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
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:xmlbuilder@4.2.1/lib/XMLBuilder.js", ["npm:xmlbuilder@4.2.1/lib/XMLStringifier.js", "npm:xmlbuilder@4.2.1/lib/XMLDeclaration.js", "npm:xmlbuilder@4.2.1/lib/XMLDocType.js", "npm:xmlbuilder@4.2.1/lib/XMLElement.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  (function() {
    var XMLBuilder,
        XMLDeclaration,
        XMLDocType,
        XMLElement,
        XMLStringifier;
    XMLStringifier = require("npm:xmlbuilder@4.2.1/lib/XMLStringifier.js");
    XMLDeclaration = require("npm:xmlbuilder@4.2.1/lib/XMLDeclaration.js");
    XMLDocType = require("npm:xmlbuilder@4.2.1/lib/XMLDocType.js");
    XMLElement = require("npm:xmlbuilder@4.2.1/lib/XMLElement.js");
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
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:xmlbuilder@4.2.1/lib/index.js", ["npm:lodash@4.2.0/assign.js", "npm:xmlbuilder@4.2.1/lib/XMLBuilder.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  (function() {
    var XMLBuilder,
        assign;
    assign = require("npm:lodash@4.2.0/assign.js");
    XMLBuilder = require("npm:xmlbuilder@4.2.1/lib/XMLBuilder.js");
    module.exports.create = function(name, xmldec, doctype, options) {
      options = assign({}, xmldec, doctype, options);
      return new XMLBuilder(name, options).root();
    };
  }).call(this);
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:xmlbuilder@4.2.1.js", ["npm:xmlbuilder@4.2.1/lib/index.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = require("npm:xmlbuilder@4.2.1/lib/index.js");
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:xml2js@0.4.16/lib/xml2js.js", ["npm:sax@0.6.1.js", "github:jspm/nodelibs-events@0.1.1.js", "npm:xmlbuilder@4.2.1.js", "npm:xml2js@0.4.16/lib/bom.js", "npm:xml2js@0.4.16/lib/processors.js", "github:jspm/nodelibs-timers@0.1.0.js", "github:jspm/nodelibs-process@0.1.2.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
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
      sax = require("npm:sax@0.6.1.js");
      events = require("github:jspm/nodelibs-events@0.1.1.js");
      builder = require("npm:xmlbuilder@4.2.1.js");
      bom = require("npm:xml2js@0.4.16/lib/bom.js");
      processors = require("npm:xml2js@0.4.16/lib/processors.js");
      setImmediate = require("github:jspm/nodelibs-timers@0.1.0.js").setImmediate;
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
  })(require("github:jspm/nodelibs-process@0.1.2.js"));
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:xml2js@0.4.16.js", ["npm:xml2js@0.4.16/lib/xml2js.js"], true, function(require, exports, module) {
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = require("npm:xml2js@0.4.16/lib/xml2js.js");
  global.define = __define;
  return module.exports;
});

System.register('github:bizboard/arva-utils@develop/request/RequestClient.js', ['npm:babel-runtime@5.8.35/core-js/promise.js', 'npm:babel-runtime@5.8.35/core-js/map.js', 'npm:babel-runtime@5.8.35/core-js/get-iterator.js'], function (_export) {
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
        setters: [function (_npmBabelRuntime5835CoreJsPromiseJs) {
            _Promise = _npmBabelRuntime5835CoreJsPromiseJs['default'];
        }, function (_npmBabelRuntime5835CoreJsMapJs) {
            _Map = _npmBabelRuntime5835CoreJsMapJs['default'];
        }, function (_npmBabelRuntime5835CoreJsGetIteratorJs) {
            _getIterator = _npmBabelRuntime5835CoreJsGetIteratorJs['default'];
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
System.register('github:bizboard/arva-utils@develop/request/XmlParser.js', [], function (_export) {
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
System.register('Settings.js', ['npm:babel-runtime@5.8.35/helpers/create-class.js', 'npm:babel-runtime@5.8.35/helpers/class-call-check.js'], function (_export) {
  var _createClass, _classCallCheck, Settings;

  return {
    setters: [function (_npmBabelRuntime5835HelpersCreateClassJs) {
      _createClass = _npmBabelRuntime5835HelpersCreateClassJs['default'];
    }, function (_npmBabelRuntime5835HelpersClassCallCheckJs) {
      _classCallCheck = _npmBabelRuntime5835HelpersClassCallCheckJs['default'];
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
System.register('github:bizboard/arva-utils@develop/request/UrlParser.js', [], function (_export) {
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
System.register('github:bizboard/arva-utils@develop/ObjectHelper.js', ['npm:babel-runtime@5.8.35/helpers/create-class.js', 'npm:babel-runtime@5.8.35/helpers/class-call-check.js', 'npm:babel-runtime@5.8.35/core-js/object/get-own-property-descriptor.js', 'npm:babel-runtime@5.8.35/core-js/object/define-property.js', 'npm:babel-runtime@5.8.35/core-js/get-iterator.js', 'npm:babel-runtime@5.8.35/core-js/object/get-own-property-names.js', 'npm:babel-runtime@5.8.35/core-js/object/keys.js', 'npm:lodash@3.10.1.js'], function (_export) {
    var _createClass, _classCallCheck, _Object$getOwnPropertyDescriptor, _Object$defineProperty, _getIterator, _Object$getOwnPropertyNames, _Object$keys, _, ObjectHelper;

    return {
        setters: [function (_npmBabelRuntime5835HelpersCreateClassJs) {
            _createClass = _npmBabelRuntime5835HelpersCreateClassJs['default'];
        }, function (_npmBabelRuntime5835HelpersClassCallCheckJs) {
            _classCallCheck = _npmBabelRuntime5835HelpersClassCallCheckJs['default'];
        }, function (_npmBabelRuntime5835CoreJsObjectGetOwnPropertyDescriptorJs) {
            _Object$getOwnPropertyDescriptor = _npmBabelRuntime5835CoreJsObjectGetOwnPropertyDescriptorJs['default'];
        }, function (_npmBabelRuntime5835CoreJsObjectDefinePropertyJs) {
            _Object$defineProperty = _npmBabelRuntime5835CoreJsObjectDefinePropertyJs['default'];
        }, function (_npmBabelRuntime5835CoreJsGetIteratorJs) {
            _getIterator = _npmBabelRuntime5835CoreJsGetIteratorJs['default'];
        }, function (_npmBabelRuntime5835CoreJsObjectGetOwnPropertyNamesJs) {
            _Object$getOwnPropertyNames = _npmBabelRuntime5835CoreJsObjectGetOwnPropertyNamesJs['default'];
        }, function (_npmBabelRuntime5835CoreJsObjectKeysJs) {
            _Object$keys = _npmBabelRuntime5835CoreJsObjectKeysJs['default'];
        }, function (_npmLodash3101Js) {
            _ = _npmLodash3101Js['default'];
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
System.register('Worker/SoapClient.js', ['npm:babel-runtime@5.8.35/helpers/create-class.js', 'npm:babel-runtime@5.8.35/helpers/class-call-check.js', 'npm:babel-runtime@5.8.35/core-js/get-iterator.js', 'npm:babel-runtime@5.8.35/core-js/promise.js', 'Worker/xmljs.js', 'npm:xml2js@0.4.16.js', 'npm:lodash@4.2.0.js', 'github:bizboard/arva-utils@develop/ObjectHelper.js', 'github:bizboard/arva-utils@develop/request/RequestClient.js', 'github:bizboard/arva-utils@develop/request/XmlParser.js'], function (_export) {
    var _createClass, _classCallCheck, _getIterator, _Promise, XML2JS, xmljs, _, ObjectHelper, PostRequest, ParseStringToXml, SoapClient;

    return {
        setters: [function (_npmBabelRuntime5835HelpersCreateClassJs) {
            _createClass = _npmBabelRuntime5835HelpersCreateClassJs['default'];
        }, function (_npmBabelRuntime5835HelpersClassCallCheckJs) {
            _classCallCheck = _npmBabelRuntime5835HelpersClassCallCheckJs['default'];
        }, function (_npmBabelRuntime5835CoreJsGetIteratorJs) {
            _getIterator = _npmBabelRuntime5835CoreJsGetIteratorJs['default'];
        }, function (_npmBabelRuntime5835CoreJsPromiseJs) {
            _Promise = _npmBabelRuntime5835CoreJsPromiseJs['default'];
        }, function (_WorkerXmljsJs) {
            XML2JS = _WorkerXmljsJs['default'];
        }, function (_npmXml2js0416Js) {
            xmljs = _npmXml2js0416Js['default'];
        }, function (_npmLodash420Js) {
            _ = _npmLodash420Js['default'];
        }, function (_githubBizboardArvaUtilsDevelopObjectHelperJs) {
            ObjectHelper = _githubBizboardArvaUtilsDevelopObjectHelperJs.ObjectHelper;
        }, function (_githubBizboardArvaUtilsDevelopRequestRequestClientJs) {
            PostRequest = _githubBizboardArvaUtilsDevelopRequestRequestClientJs.PostRequest;
        }, function (_githubBizboardArvaUtilsDevelopRequestXmlParserJs) {
            ParseStringToXml = _githubBizboardArvaUtilsDevelopRequestXmlParserJs.ParseStringToXml;
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
System.register('Worker/SharePointClient.js', ['npm:babel-runtime@5.8.35/helpers/get.js', 'npm:babel-runtime@5.8.35/helpers/inherits.js', 'npm:babel-runtime@5.8.35/helpers/create-class.js', 'npm:babel-runtime@5.8.35/helpers/class-call-check.js', 'npm:babel-runtime@5.8.35/core-js/promise.js', 'npm:babel-runtime@5.8.35/core-js/get-iterator.js', 'npm:babel-runtime@5.8.35/core-js/map.js', 'npm:lodash@4.2.0.js', 'npm:eventemitter3@1.1.1.js', 'Worker/SoapClient.js', 'Settings.js', 'github:bizboard/arva-utils@develop/request/RequestClient.js', 'github:bizboard/arva-utils@develop/request/UrlParser.js'], function (_export) {
    var _get, _inherits, _createClass, _classCallCheck, _Promise, _getIterator, _Map, _, EventEmitter, SoapClient, Settings, ExistsRequest, UrlParser, soapClient, window, global, tempKeys, SharePointClient;

    return {
        setters: [function (_npmBabelRuntime5835HelpersGetJs) {
            _get = _npmBabelRuntime5835HelpersGetJs['default'];
        }, function (_npmBabelRuntime5835HelpersInheritsJs) {
            _inherits = _npmBabelRuntime5835HelpersInheritsJs['default'];
        }, function (_npmBabelRuntime5835HelpersCreateClassJs) {
            _createClass = _npmBabelRuntime5835HelpersCreateClassJs['default'];
        }, function (_npmBabelRuntime5835HelpersClassCallCheckJs) {
            _classCallCheck = _npmBabelRuntime5835HelpersClassCallCheckJs['default'];
        }, function (_npmBabelRuntime5835CoreJsPromiseJs) {
            _Promise = _npmBabelRuntime5835CoreJsPromiseJs['default'];
        }, function (_npmBabelRuntime5835CoreJsGetIteratorJs) {
            _getIterator = _npmBabelRuntime5835CoreJsGetIteratorJs['default'];
        }, function (_npmBabelRuntime5835CoreJsMapJs) {
            _Map = _npmBabelRuntime5835CoreJsMapJs['default'];
        }, function (_npmLodash420Js) {
            _ = _npmLodash420Js['default'];
        }, function (_npmEventemitter3111Js) {
            EventEmitter = _npmEventemitter3111Js['default'];
        }, function (_WorkerSoapClientJs) {
            SoapClient = _WorkerSoapClientJs.SoapClient;
        }, function (_SettingsJs) {
            Settings = _SettingsJs.Settings;
        }, function (_githubBizboardArvaUtilsDevelopRequestRequestClientJs) {
            ExistsRequest = _githubBizboardArvaUtilsDevelopRequestRequestClientJs.ExistsRequest;
        }, function (_githubBizboardArvaUtilsDevelopRequestUrlParserJs) {
            UrlParser = _githubBizboardArvaUtilsDevelopRequestUrlParserJs.UrlParser;
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
                            this._refresh();
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

                            if (args.query) resultconfig.query = args.query;
                            if (args.limit) resultconfig.limit = args.limit;
                            if (args.orderBy) resultconfig.orderBy = args.orderBy;

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

                        var rowLimit = 50;
                        if (args.rowLimit !== undefined) {
                            rowLimit = args.rowLimit;
                            this.limitRows = true;
                        } else {
                            this.limitRows = false;
                        }

                        this.retriever.params.rowLimit = rowLimit;
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

                        var calledManually = arguments.length <= 0 || arguments[0] === undefined ? true : arguments[0];

                        /* Prevent refresh from being called more than once at a time. */
                        if (this.refreshTimer && calledManually) {
                            return;
                        }
                        this.refreshTimer = 1;

                        if (this.retriever) {
                            soapClient.call(this.retriever, tempKeys).then(function (result) {

                                var listItem = result.data["soap:Envelope"]["soap:Body"][0].GetListItemChangesSinceTokenResponse[0].GetListItemChangesSinceTokenResult[0].listitems[0];
                                var hasDeletions = false;
                                if (listItem.Changes) {
                                    var changes = listItem.Changes[0];
                                    hasDeletions = _this2._handleDeleted(changes);
                                }

                                _this2._handleNextToken(listItem);

                                var data = _this2._getResults(result.data);
                                var messages = _this2._updateCache(data);

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
                                _this2.refreshTimer = setTimeout(_this2._refresh.bind(_this2, false), _this2.interval);
                                _this2.refreshTimer = null;
                            })['catch'](function (err) {
                                _this2.emit('error', err);
                                _this2.refreshTimer = setTimeout(_this2._refresh.bind(_this2, false), _this2.interval);
                                _this2.refreshTimer = null;
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
                        var _this3 = this;

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

                        /*for (var prop in newData) {
                         let fieldValue = newData[prop];
                         if (prop == "id" || typeof(fieldValue) == "undefined") continue;
                         if (prop == "priority" || prop == "_temporary-identifier" || prop == "remoteId") continue;
                         if (typeof fieldValue === 'object') {
                         if (fieldValue.id && fieldValue.value) {
                         /!* This is a SharePoint lookup type field. We must write it as a specially formatted value instead of an id/value object. *!/
                         fieldValue = `${fieldValue.id};#`;
                         } else if (fieldValue.length !== undefined && fieldValue[0] && fieldValue[0].id && fieldValue[0].value) {
                         /!* This is a SharePoint LookupMulti field. It is specially formatted like above. *!/
                         let IDs = _.pluck(fieldValue, 'id');
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
                         };*/

                        // initial initialisation of the datasource
                        var secretKey = '' + Math.random() * 200000;
                        this.emit('message', {
                            event: 'doSet',
                            data: { url: configuration.url, data: newData, method: method, listName: this.settings.listName, secretKey: secretKey }
                        });
                        this.once('didSet' + secretKey, function (model) {

                            var data = model;

                            var remoteId = model.id;

                            // push ID mapping for given session to collection of temp keys
                            if (newData['_temporary-identifier']) {
                                tempKeys.push({ localId: newData['_temporary-identifier'], remoteId: remoteId, client: _this3 });
                            }
                            var messages = _this3._updateCache([data]);
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

                            model.id = model['_temporary-identifier'] || model.id;
                            model.remoteId = remoteId;
                            if (_this3.isChild) {
                                /* TODO: re-enable value emit on children when child subscriptions are implemented */
                                //this.emit('message', {event: 'value', result: model});
                            } else {
                                    //TODO: child_changed already emitted above
                                    _this3.emit('message', { event: 'child_changed', result: model });
                                    _this3.emit('message', { event: 'value', result: _this3.cache });
                                }
                        });
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
                        if (this.limitRows) {
                            this._activateChangeToken(listItem.Changes[0].$.LastChangeToken);
                        } else {
                            var nextPaginationToken = listItem["rs:data"][0].$.ListItemCollectionPositionNext;

                            var lastQueryHadPagination = this.retriever.params.queryOptions.QueryOptions.Paging;

                            if (!lastQueryHadPagination && listItem.Changes) {
                                this.lastChangeToken = listItem.Changes[0].$.LastChangeToken;
                            }

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
System.register('Worker/Manager.js', ['npm:babel-runtime@5.8.35/regenerator.js', 'Worker/SharePointClient.js'], function (_export) {
    var _regeneratorRuntime, SharePointClient, clients;

    return {
        setters: [function (_npmBabelRuntime5835RegeneratorJs) {
            _regeneratorRuntime = _npmBabelRuntime5835RegeneratorJs['default'];
        }, function (_WorkerSharePointClientJs) {
            SharePointClient = _WorkerSharePointClientJs.SharePointClient;
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
                            return context$1$0.abrupt('break', 38);

                        case 11:
                            client.subscribeToChanges();
                            client.referenceCount++;
                            return context$1$0.abrupt('break', 38);

                        case 14:
                            client.referenceCount--;
                            if (client.referenceCount <= 0) {
                                client.dispose();
                            }
                            return context$1$0.abrupt('break', 38);

                        case 17:
                            client.set(message.model);
                            /* If the client was created for this set operation,
                             * cancel all subscriptions that were automatically created on instantiation. */
                            if (!clientExisted) {
                                client.dispose();
                            }
                            return context$1$0.abrupt('break', 38);

                        case 20:
                            client.remove(message.model);
                            /* If the client was created for this remove operation,
                             * cancel all subscriptions that were automatically created on instantiation. */
                            if (!clientExisted) {
                                client.dispose();
                            }
                            return context$1$0.abrupt('break', 38);

                        case 23:
                            cacheData = client.cache;

                            postMessage({
                                subscriberID: subscriberID,
                                event: 'cache_data',
                                cache: cacheData
                            });
                            return context$1$0.abrupt('break', 38);

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
                            return context$1$0.abrupt('break', 38);

                        case 37:
                            client.emit(operation, message.model);

                        case 38:
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
//Karl's note: merged version
//# sourceMappingURL=worker.js.map