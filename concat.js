/*
 * Copyright 2009, Google Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */


/**
 * @fileoverview Base for all o3d sample utilties.
 *    For more information about o3d see
 *    http://code.google.com/p/o3d.
 *
 *
 * The main point of this module is to provide a central place to
 * have an init function to register an o3d namespace object because many other
 * modules need access to it.
 */

/**
 * A namespace for all the o3djs utility libraries.
 * @namespace
 */
var o3djs = o3djs || {};

/**
 * Define this because the Google internal JSCompiler needs goog.typedef below.
 */
var goog = goog || {};

/**
 * A macro for defining composite types.
 *
 * By assigning goog.typedef to a name, this tells Google internal JSCompiler
 * that this is not the name of a class, but rather it's the name of a composite
 * type.
 *
 * For example,
 * /** @type {Array|NodeList} / goog.ArrayLike = goog.typedef;
 * will tell JSCompiler to replace all appearances of goog.ArrayLike in type
 * definitions with the union of Array and NodeList.
 *
 * Does nothing in uncompiled code.
 */
goog.typedef = true;

/**
 * Reference to the global context.  In most cases this will be 'window'.
 */
o3djs.global = this;

/**
 * Flag used to force a function to run in the browser when it is called
 * from V8.
 * @type {boolean}
 */
o3djs.BROWSER_ONLY = true;

/**
 * Array of namespaces that have been provided.
 * @private
 * @type {!Array.<string>}
 */
o3djs.provided_ = [];

/**
 * Creates object stubs for a namespace. When present in a file,
 * o3djs.provide also indicates that the file defines the indicated
 * object.
 * @param {string} name name of the object that this file defines.
 */
o3djs.provide = function(name) {
  // Ensure that the same namespace isn't provided twice.
//  if (o3djs.getObjectByName(name) &&
//      !o3djs.implicitNamespaces_[name]) {
//    throw 'Namespace "' + name + '" already declared.';
//  }

//  var namespace = name;
//  while ((namespace = namespace.substring(0, namespace.lastIndexOf('.')))) {
//    o3djs.implicitNamespaces_[namespace] = true;
//  }

//  o3djs.exportPath_(name);
//  o3djs.provided_.push(name);
};


/**
 * Namespaces implicitly defined by o3djs.provide. For example,
 * o3djs.provide('o3djs.events.Event') implicitly declares
 * that 'o3djs' and 'o3djs.events' must be namespaces.
 *
 * @type {Object}
 * @private
 */
o3djs.implicitNamespaces_ = {};

/**
 * Builds an object structure for the provided namespace path,
 * ensuring that names that already exist are not overwritten. For
 * example:
 * "a.b.c" -> a = {};a.b={};a.b.c={};
 * Used by o3djs.provide and o3djs.exportSymbol.
 * @param {string} name name of the object that this file defines.
 * @param {Object} opt_object the object to expose at the end of the path.
 * @param {Object} opt_objectToExportTo The object to add the path to; default
 *     is |o3djs.global|.
 * @private
 */
o3djs.exportPath_ = function(name, opt_object, opt_objectToExportTo) {
  var parts = name.split('.');
  var cur = opt_objectToExportTo || o3djs.global;
  var part;

  // Internet Explorer exhibits strange behavior when throwing errors from
  // methods externed in this manner.  See the testExportSymbolExceptions in
  // base_test.html for an example.
  if (!(parts[0] in cur) && cur.execScript) {
    cur.execScript('var ' + parts[0]);
  }

  // Parentheses added to eliminate strict JS warning in Firefox.
  while (parts.length && (part = parts.shift())) {
    if (!parts.length && o3djs.isDef(opt_object)) {
      // last part and we have an object; use it.
      cur[part] = opt_object;
    } else if (cur[part]) {
      cur = cur[part];
    } else {
      cur = cur[part] = {};
    }
  }
};


/**
 * Returns an object based on its fully qualified external name.  If you are
 * using a compilation pass that renames property names beware that using this
 * function will not find renamed properties.
 *
 * @param {string} name The fully qualified name.
 * @param {Object} opt_obj The object within which to look; default is
 *     |o3djs.global|.
 * @return {Object} The object or, if not found, null.
 */
o3djs.getObjectByName = function(name, opt_obj) {
  var parts = name.split('.');
  var cur = opt_obj || o3djs.global;
  for (var pp = 0; pp < parts.length; ++pp) {
    var part = parts[pp];
    if (cur[part]) {
      cur = cur[part];
    } else {
      return null;
    }
  }
  return cur;
};


/**
 * Implements a system for the dynamic resolution of dependencies.
 * @param {string} rule Rule to include, in the form o3djs.package.part.
 */
o3djs.require = function(rule) {
  // TODO(gman): For some unknown reason, when we call
  // o3djs.util.getScriptTagText_ it calls
  // document.getElementsByTagName('script') and for some reason the scripts do
  // not always show up. Calling it here seems to fix that as long as we
  // actually ask for the length, at least in FF 3.5.1 It would be nice to
  // figure out why.
  var dummy = document.getElementsByTagName('script').length;

  // if the object already exists we do not need do do anything
//  if (o3djs.getObjectByName(rule)) {
//    return;
//  }
//  var path = o3djs.getPathFromRule_(rule);
// if (path) {
//    o3djs.included_[path] = true;
//    o3djs.writeScripts_();
//  } else {
//    throw new Error('o3djs.require could not find: ' + rule);
//  }
};


/**
 * Path for included scripts.
 * @type {string}
 */
o3djs.basePath = '';


/**
 * Object used to keep track of urls that have already been added. This
 * record allows the prevention of circular dependencies.
 * @type {Object}
 * @private
 */
o3djs.included_ = {};


/**
 * This object is used to keep track of dependencies and other data that is
 * used for loading scripts.
 * @private
 * @type {Object}
 */
o3djs.dependencies_ = {
  visited: {},  // used when resolving dependencies to prevent us from
                // visiting the file twice.
  written: {}  // used to keep track of script files we have written.
};


/**
 * Tries to detect the base path of the o3djs-base.js script that
 * bootstraps the o3djs libraries.
 * @private
 */
o3djs.findBasePath_ = function() {
  var doc = o3djs.global.document;
  if (typeof doc == 'undefined') {
    return;
  }
  if (o3djs.global.BASE_PATH) {
    o3djs.basePath = o3djs.global.BASE_PATH;
    return;
  } else {
    // HACKHACK to hide compiler warnings :(
    o3djs.global.BASE_PATH = null;
  }
  var scripts = doc.getElementsByTagName('script');
  for (var script, i = 0; script = scripts[i]; i++) {
    var src = script.src;
    var l = src.length;
    if (src.substr(l - 13) == 'o3djs/base.js') {
      o3djs.basePath = src.substr(0, l - 13);
      return;
    }
  }
};


/**
 * Writes a script tag if, and only if, that script hasn't already been added
 * to the document.  (Must be called at execution time.)
 * @param {string} src Script source.
 * @private
 */
o3djs.writeScriptTag_ = function(src) {
  var doc = o3djs.global.document;
  if (typeof doc != 'undefined' &&
      !o3djs.dependencies_.written[src]) {
    o3djs.dependencies_.written[src] = true;
    doc.write('<script type="text/javascript" src="' +
              src + '"></' + 'script>');
  }
};


/**
 * Resolves dependencies based on the dependencies added using addDependency
 * and calls writeScriptTag_ in the correct order.
 * @private
 */
o3djs.writeScripts_ = function() {
  // the scripts we need to write this time.
  var scripts = [];
  var seenScript = {};
  var deps = o3djs.dependencies_;

  function visitNode(path) {
    if (path in deps.written) {
      return;
    }

    // we have already visited this one. We can get here if we have cyclic
    // dependencies.
    if (path in deps.visited) {
      if (!(path in seenScript)) {
        seenScript[path] = true;
        scripts.push(path);
      }
      return;
    }

    deps.visited[path] = true;

    if (!(path in seenScript)) {
      seenScript[path] = true;
      scripts.push(path);
    }
  }

  for (var path in o3djs.included_) {
    if (!deps.written[path]) {
      visitNode(path);
    }
  }

  for (var i = 0; i < scripts.length; i++) {
    if (scripts[i]) {
      o3djs.writeScriptTag_(o3djs.basePath + scripts[i]);
    } else {
      throw Error('Undefined script input');
    }
  }
};


/**
 * Looks at the dependency rules and tries to determine the script file that
 * fulfills a particular rule.
 * @param {string} rule In the form o3djs.namespace.Class or
 *     project.script.
 * @return {string?} Url corresponding to the rule, or null.
 * @private
 */
o3djs.getPathFromRule_ = function(rule) {
  var parts = rule.split('.');
  return parts.join('/') + '.js';
};

o3djs.findBasePath_();

/**
 * Returns true if the specified value is not |undefined|.
 * WARNING: Do not use this to test if an object has a property. Use the in
 * operator instead.
 * @param {*} val Variable to test.
 * @return {boolean} Whether variable is defined.
 */
o3djs.isDef = function(val) {
  return typeof val != 'undefined';
};


/**
 * Exposes an unobfuscated global namespace path for the given object.
 * Note that fields of the exported object *will* be obfuscated,
 * unless they are exported in turn via this function or
 * o3djs.exportProperty.
 *
 * <p>Also handy for making public items that are defined in anonymous
 * closures.
 *
 * ex. o3djs.exportSymbol('Foo', Foo);
 *
 * ex. o3djs.exportSymbol('public.path.Foo.staticFunction',
 *                        Foo.staticFunction);
 *     public.path.Foo.staticFunction();
 *
 * ex. o3djs.exportSymbol('public.path.Foo.prototype.myMethod',
 *                        Foo.prototype.myMethod);
 *     new public.path.Foo().myMethod();
 *
 * @param {string} publicPath Unobfuscated name to export.
 * @param {Object} object Object the name should point to.
 * @param {Object} opt_objectToExportTo The object to add the path to; default
 *     is |o3djs.global|.
 */
o3djs.exportSymbol = function(publicPath, object, opt_objectToExportTo) {
  o3djs.exportPath_(publicPath, object, opt_objectToExportTo);
};

/**
 * This string contains JavaScript code to initialize a new V8 instance.
 * @private
 * @type {string}
 */
o3djs.v8Initializer_ = '';

/**
 * This array contains references to objects that v8 needs to bind to when
 * it initializes.
 * @private
 * @type {!Array.<Object>}
 */
o3djs.v8InitializerArgs_ = [];

/**
 * Converts any JavaScript value to a string representation that when evaluated
 * will result in an equal value.
 * @param {*} value Any value.
 * @return {string} A string representation for the value.
 * @private
 */
o3djs.valueToString_ = function(value) {
  switch (typeof(value)) {
    case 'undefined':
      return 'undefined';
    case 'string':
      var escaped = escape(value);
      if (escaped === value) {
        return '"' + value + '"';
      } else {
        return 'unescape("' + escaped + '")';
      }
    case 'object':
      if (value === null) {
        return 'null';
      } else {
        // TODO: all the other builtin JavaScript objects like Date,
        // Number, Boolean, etc.
        if (value instanceof RegExp) {
          var result =
              'new RegExp(' + o3djs.valueToString_(value.source) + ', "';
          if (value.global) {
            result += 'g';
          }
          if (value.ignoreCase) {
            result += 'i';
          }
          if (value.multiline) {
            result += 'm';
          }
          result += '")';
          return result;
        } else if (o3djs.base.isArray(value)) {
          var valueAsArray = /** @type {!Array} */ (value);
          var result = '[';
          var separator = '';
          for (var i = 0; i < valueAsArray.length; ++i) {
            result += separator + o3djs.valueToString_(valueAsArray[i]);
            separator = ',';
          }
          result += ']\n';
          return result;
        } else {
          var valueAsObject = /** @type {!Object} */ (value);
          var result = '{\n';
          var separator = '';
          for (var propertyName in valueAsObject) {
            result += separator + '"' + propertyName + '": ' +
              o3djs.valueToString_(valueAsObject[propertyName]);
            separator = ',';
          }
          result += '}\n';
          return result;
        }
      }
    default:
      return value.toString()
  }
};

/**
 * Given an object holding a namespace and the name of that namespace,
 * generates a string that when evaluated will populate the namespace.
 * @param {!Object} namespaceObject An object holding a namespace.
 * @param {string} namespaceName The name of the namespace.
 * @param {!Array.<Object>} opt_args An array of objects that will be used
 *     together with the initializer string to populate a namespace. The args
 *     may be referenced from initializer code as args_[i] where i is the index
 *     in the array.
 * @return {string} A string that will populate the namespace.
 * @private
 */
o3djs.namespaceInitializer_ = function(namespaceObject,
                                       namespaceName,
                                       opt_args) {
  var result = namespaceName + ' = {};\n';
  for (var propertyName in namespaceObject) {
    var propertyNamespaceName = namespaceName + '.' + propertyName;
    var propertyValue = namespaceObject[propertyName];
    if (typeof(propertyValue) === 'object' && propertyValue !== null &&
        !o3djs.base.isArray(propertyValue) &&
        !(propertyValue instanceof RegExp)) {
      result += o3djs.namespaceInitializer_(propertyValue,
                                            propertyNamespaceName);
    } else {
      var valueAsString = o3djs.valueToString_(propertyValue);

      // If this is a browser only function then bind to the browser version
      // of the function rather than create a new function in V8.
      if (typeof(propertyValue) == 'function' &&
          valueAsString.indexOf('o3djs.BROWSER_ONLY') != -1) {
        valueAsString = 'args_[' + opt_args.length + ']';
        opt_args.push(propertyValue);
      }
      result += propertyNamespaceName + ' = ' + valueAsString + ';\n';

      if (typeof(propertyValue) === 'function' && propertyValue.prototype) {
        result += o3djs.namespaceInitializer_(
            propertyValue.prototype,
            propertyNamespaceName + '.prototype');
      }
    }
  }
  return result;
};

o3djs.provide('o3djs.base');

/**
 * The base module for o3djs.
 * @namespace
 */
o3djs.base = o3djs.base || {};

/**
 * The a Javascript copy of the o3d namespace object. (holds constants, enums,
 * etc...)
 * @type {o3d}
 */
o3djs.base.o3d = null;

/**
 * Whether or not we need to use GLSL instead of HLSL.
 * @type {boolean}
 */
o3djs.base.glsl = false;

/**
 * Snapshots the current state of all provided namespaces. This state will be
 * used to initialize future V8 instances. It is automatically
 * called by o3djs.util.makeClients.
 */
o3djs.base.snapshotProvidedNamespaces = function()  {
  // Snapshot the V8 initializer string from the current state of browser
  // JavaScript the first time this is called.
  o3djs.v8Initializer_ = 'function(args_) {\n';
  o3djs.v8InitializerArgs_ = [];
  for (var i = 0; i < o3djs.provided_.length; ++i) {
    var object = o3djs.getObjectByName(o3djs.provided_[i]);
    o3djs.v8Initializer_ += o3djs.namespaceInitializer_(
        /** @type {!Object} */ (object),
        o3djs.provided_[i],
        o3djs.v8InitializerArgs_);
  }

  o3djs.v8Initializer_ += '}\n';
};

/**
 * Initializes the o3djs.sample library in a v8 instance. This should be called
 * for every V8 instance that uses the sample library. It is automatically
 * called by o3djs.util.makeClients.
 * @param {!Element} clientObject O3D.Plugin Object.
 */
o3djs.base.initV8 = function(clientObject)  {
  var v8Init = function(initializer, args) {
    // Set up the o3djs namespace.
    var o3djsBrowser = o3djs;
    o3djs = {};
    o3djs.browser = o3djsBrowser;
    o3djs.global = (function() { return this; })();

    o3djs.require = function(rule) {}
    o3djs.provide = function(rule) {}

    // Evaluate the initializer string with the arguments containing bindings
    // to browser side objects.
    eval('(' + initializer + ')')(args);

    // Make sure this points to the o3d namespace for this particular
    // instance of the plugin.
    o3djs.base.o3d = plugin.o3d;

    // Save off if we need GLSL.
    o3djs.base.glsl = plugin.client.clientInfo.glsl;
  };

  clientObject.eval(v8Init.toString())(o3djs.v8Initializer_,
                                       o3djs.v8InitializerArgs_);
};

/**
 * Initializes the o3djs.sample library.
 * Basically all it does is record the o3djs.namespace object which is used by
 * other functions to look up o3d constants.
 *
 * @param {!Element} clientObject O3D.Plugin Object.
 */
o3djs.base.init = function(clientObject)  {
  function recursivelyCopyProperties(object) {
    var copy = {};
    var hasProperties = false;
    for (var key in object) {
      var property = object[key];
      if (typeof property == 'object' || typeof property == 'function') {
        property = recursivelyCopyProperties(property);
      }
      if (typeof property != 'undefined') {
        copy[key] = property;
        hasProperties = true;
      }
    }
    return hasProperties ? copy : undefined;
  }
  try {
    o3djs.base.o3d = recursivelyCopyProperties(clientObject.o3d);
  } catch (e) {
    // Firefox 2 raises an exception when trying to enumerate a NPObject
    o3djs.base.o3d = clientObject.o3d;
  }
  // Because of a bug in chrome, it is not possible for the browser to enumerate
  // the properties of an NPObject.
  // Chrome bug: http://code.google.com/p/chromium/issues/detail?id=5743
  o3djs.base.o3d = o3djs.base.o3d || clientObject.o3d;
  // Save off if we need GLSL.
  o3djs.base.glsl = clientObject.client.clientInfo.glsl;
};

/**
 * Determine whether a value is an array. Do not use instanceof because that
 * will not work for V8 arrays (the browser thinks they are Objects).
 * @param {*} value A value.
 * @return {boolean} Whether the value is an array.
 */
o3djs.base.isArray = function(value) {
  var valueAsObject = /** @type {!Object} */ (value);
  return typeof(value) === 'object' && value !== null &&
      'length' in valueAsObject && 'splice' in valueAsObject;
};

/**
 * Check if the o3djs library has been initialized.
 * @return {boolean} true if ready, false if not.
 */
o3djs.base.ready = function() {
  return o3djs.base.o3d != null;
};

/**
 * A stub for later optionally converting obfuscated names
 * @private
 * @param {string} name Name to un-obfuscate.
 * @return {string} un-obfuscated name.
 */
o3djs.base.maybeDeobfuscateFunctionName_ = function(name) {
  return name;
};

/**
 * Makes one class inherit from another.
 * @param {!Object} subClass Class that wants to inherit.
 * @param {!Object} superClass Class to inherit from.
 */
o3djs.base.inherit = function(subClass, superClass) {
  /**
   * TmpClass.
   * @ignore
   * @constructor
   */
  var TmpClass = function() { };
  TmpClass.prototype = superClass.prototype;
  subClass.prototype = new TmpClass();
};

/**
 * Parses an error stack from an exception
 * @param {!Exception} excp The exception to get a stack trace from.
 * @return {!Array.<string>} An array of strings of the stack trace.
 */
o3djs.base.parseErrorStack = function(excp) {
  var stack = [];
  var name;
  var line;

  if (!excp || !excp.stack) {
    return stack;
  }

  var stacklist = excp.stack.split('\n');

  for (var i = 0; i < stacklist.length - 1; i++) {
    var framedata = stacklist[i];

    name = framedata.match(/^([a-zA-Z0-9_$]*)/)[1];
    if (name) {
      name = o3djs.base.maybeDeobfuscateFunctionName_(name);
    } else {
      name = 'anonymous';
    }

    var result = framedata.match(/(.*:[0-9]+)$/);
    line = result && result[1];

    if (!line) {
      line = '(unknown)';
    }

    stack[stack.length] = name + ' : ' + line
  }

  // remove top level anonymous functions to match IE
  var omitRegexp = /^anonymous :/;
  while (stack.length && omitRegexp.exec(stack[stack.length - 1])) {
    stack.length = stack.length - 1;
  }

  return stack;
};

/**
 * Gets a function name from a function object.
 * @param {!function(...): *} aFunction The function object to try to get a
 *      name from.
 * @return {string} function name or 'anonymous' if not found.
 */
o3djs.base.getFunctionName = function(aFunction) {
  var regexpResult = aFunction.toString().match(/function(\s*)(\w*)/);
  if (regexpResult && regexpResult.length >= 2 && regexpResult[2]) {
    return o3djs.base.maybeDeobfuscateFunctionName_(regexpResult[2]);
  }
  return 'anonymous';
};

/**
 * Pretty prints an exception's stack, if it has one.
 * @param {Array.<string>} stack An array of errors.
 * @return {string} The pretty stack.
 */
o3djs.base.formatErrorStack = function(stack) {
  var result = '';
  for (var i = 0; i < stack.length; i++) {
    result += '> ' + stack[i] + '\n';
  }
  return result;
};

/**
 * Gets a stack trace as a string.
 * @param {number} stripCount The number of entries to strip from the top of the
 *     stack. Example: Pass in 1 to remove yourself from the stack trace.
 * @return {string} The stack trace.
 */
o3djs.base.getStackTrace = function(stripCount) {
  var result = '';

  if (typeof(arguments.caller) != 'undefined') { // IE, not ECMA
    for (var a = arguments.caller; a != null; a = a.caller) {
      result += '> ' + o3djs.base.getFunctionName(a.callee) + '\n';
      if (a.caller == a) {
        result += '*';
        break;
      }
    }
  } else { // Mozilla, not ECMA
    // fake an exception so we can get Mozilla's error stack
    var testExcp;
    try {
      eval('var var;');
    } catch (testExcp) {
      var stack = o3djs.base.parseErrorStack(testExcp);
      result += o3djs.base.formatErrorStack(stack.slice(3 + stripCount,
                                                        stack.length));
    }
  }

  return result;
};

/**
 * Sets the error handler on a client to a handler that displays an alert on the
 * first error.
 * @param {!o3d.Client} client The client object of the plugin.
 */
o3djs.base.setErrorHandler = function(client) {
  client.setErrorCallback(
      function(msg) {
        // Clear the error callback. Otherwise if the callback is happening
        // during rendering it's possible the user will not be able to
        // get out of an infinite loop of alerts.
        client.clearErrorCallback();
        alert('ERROR: ' + msg + '\n' + o3djs.base.getStackTrace(1));
      });
};

/**
 * Returns true if the user's browser is Microsoft IE.
 * @return {boolean} true if the user's browser is Microsoft IE.
 */
o3djs.base.IsMSIE = function() {
  var ua = navigator.userAgent.toLowerCase();
  var msie = /msie/.test(ua) && !/opera/.test(ua);
  return msie;
};
/*
 * Copyright 2009, Google Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */


/**
 * @fileoverview This file contains utility functions for o3d running on
 * top of webgl.  The function o3djs.webgl.makeClients replaces the
 * function o3djs.util.makeClients.
 */

o3djs.provide('o3djs.webgl');

o3djs.require('o3djs.effect');
o3djs.require('o3djs.util');


/**
 * A Module with various utilities.
 * @namespace
 */
o3djs.webgl = o3djs.webgl || {};


/**
 * Finds all divs with an id that starts with "o3d" and inits a canvas
 * under them with o3d client object and the o3d namespace.
 */
o3djs.webgl.makeClients = function(callback,
                                   opt_features,
                                   opt_requiredVersion,
                                   opt_failureCallback,
                                   opt_id,
                                   opt_tag,
                                   opt_debug) {
  opt_failureCallback = opt_failureCallback || o3djs.webgl.informPluginFailure;

  var clientElements = [];
  var elements = o3djs.util.getO3DContainerElements(opt_id, opt_tag);

  for (var ee = 0; ee < elements.length; ++ee) {
    var element = elements[ee];
    var features = opt_features;
    if (!features) {
      var o3d_features = element.getAttribute('o3d_features');
      if (o3d_features) {
        features = o3d_features;
      } else {
        features = '';
      }
    }
    var objElem = o3djs.webgl.createClient(element, features, opt_debug);
    if (!objElem) {
      // If we couldn't create the client then we don't call the callback.
      return;
    }
    clientElements.push(objElem);
  }

  // Wait for the client elements to be fully initialized. This
  // involves waiting for the page to fully layout and the initial
  // resize event to be processed.
  var clearId = window.setInterval(function() {
    for (var cc = 0; cc < clientElements.length; ++cc) {
      var element = clientElements[cc];
      if (!element.sizeInitialized_) {
        return;
      }
    }
    window.clearInterval(clearId);
    callback(clientElements);
  });
};


/**
 * Adds a wrapper object to single gl function context that checks for errors
 * before the call.
 * @param {WebGLContext} context
 * @param {string} fname The name of the function.
 * @return {}
 */
o3djs.webgl.createGLErrorWrapper = function(context, fname) {
    return function() {
        var rv = context[fname].apply(context, arguments);
        var err = context.getError();
        if (err != 0) {
            throw "GL error " + err + " in " + fname;
        }
        return rv;
    };
};


/**
 * Adds a wrapper object to a webgl context that checks for errors
 * before each function call.
 */
o3djs.webgl.addDebuggingWrapper = function(context) {
    // Thanks to Ilmari Heikkinen for the idea on how to implement this
    // so elegantly.
    var wrap = {};
    for (var i in context) {
      if (typeof context[i] == 'function') {
          wrap[i] = o3djs.webgl.createGLErrorWrapper(context, i);
      } else {
          wrap[i] = context[i];
      }
    }
    wrap.getError = function() {
        return context.getError();
    };
    return wrap;
};


/**
 * Inserts text indicating that a WebGL context could not be created under
 * the given node and links to the site about WebGL capable browsers.
 */
o3djs.webgl.webGlCanvasError = function(parentNode, unavailableElement) {
  var background = document.createElement('div');
  background.style.backgroundColor = '#ccffff';
  background.style.textAlign = 'center';
  background.style.margin = '10px';
  background.style.width = '100%';
  background.style.height = '100%';

  var messageHTML = '<br/><br/><a href="http://get.webgl.org">' +
      'Your browser does not appear to support WebGL.<br/><br/>' +
      'Check that WebGL is enabled or click here to upgrade your browser:' +
      '</a><br/>';

  background.innerHTML = messageHTML;

  parentNode.appendChild(background);
};


/**
 * Creates a canvas under the given parent element and an o3d.Client
 * under that.
 *
 * @param {!Element} element The element under which to insert the client.
 * @param {string} opt_features Features to turn on.
 * @param {boolean} opt_debug Whether gl debugging features should be
 *     enabled.
 * @return {HTMLCanvas} The canvas element, or null if initializaton failed.
 */
o3djs.webgl.createClient = function(element, opt_features, opt_debug) {
  opt_features = opt_features || '';
  opt_debug = opt_debug || false;

  // If we're creating a webgl client, the assumption is we're using webgl,
  // in which case the only acceptable shader language is glsl.  So, here
  // we set the shader language to glsl.
  o3djs.effect.setLanguage('glsl');

  // Make the canvas automatically resize to fill the containing
  // element (div), and initialize its size correctly.
  var canvas;
  canvas = document.createElement('canvas');

  if (!canvas || !canvas.getContext) {
    o3djs.webgl.webGlCanvasError(element, 'HTMLCanvas');
    return null;
  }

  canvas.style.width = "100%";
  canvas.style.height = "100%";

  var client = new o3d.Client;

  var resizeHandler = function() {
    var width = Math.max(1, canvas.clientWidth);
    var height = Math.max(1, canvas.clientHeight);
    canvas.width = width;
    canvas.height = height;
    canvas.sizeInitialized_ = true;
    if (client.gl) {
      client.gl.displayInfo = {width: canvas.width, height: canvas.height};
    }
  };
  window.addEventListener('resize', resizeHandler, false);
  setTimeout(resizeHandler, 0);

  if (!client.initWithCanvas(canvas)) {
    o3djs.webgl.webGlCanvasError(element, 'WebGL context');
    return null;
  }

  // This keeps the cursor from changing to an I-beam when the user clicks and
  // drags.  It's easier on the eyes.
  function returnFalse() {
    return false;
  }
  document.onselectstart = returnFalse;
  document.onmousedown = returnFalse;

  canvas.client = client;
  canvas.o3d = o3d;

  if (opt_debug) {
    client.gl = o3djs.webgl.addDebuggingWrapper(client.gl);
  }

  element.appendChild(canvas);
  return canvas;
};


/*
 * Copyright 2009, Google Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */


/**
 * @fileoverview This file contains various utility functions for o3d.  It
 * puts them in the "util" module on the o3djs object.
 *
 */

o3djs.provide('o3djs.util');

o3djs.require('o3djs.io');
o3djs.require('o3djs.effect');
o3djs.require('o3djs.event');
o3djs.require('o3djs.error');

/**
 * A Module with various utilities.
 * @namespace
 */
o3djs.util = o3djs.util || {};

/**
 * The name of the o3d plugin. Used to find the plugin when checking
 * for its version.
 * @type {string}
 */
o3djs.util.PLUGIN_NAME = 'O3D Plugin';

/**
 * The version of the plugin needed to use this version of the javascript
 * utility libraries.
 * @type {string}
 */
o3djs.util.REQUIRED_VERSION = '0.1.42.4';

/**
 * The width an O3D must be to put a failure message inside
 * @type {number}
 */
o3djs.util.MINIMUM_WIDTH_FOR_MESSAGE = 200;

/**
 * The height an O3D must be to put a failure message inside
 * @type {number}
 */
o3djs.util.MINIMUM_HEIGHT_FOR_MESSAGE = 200;

/**
 * A URL at which to download the client.
 * @type {string}
 */
o3djs.util.PLUGIN_DOWNLOAD_URL = 'http://tools.google.com/dlpage/o3d';

/**
 * The Renderer InitStatus constants so we don't need an o3d object to look
 * them up.
 * @enum {number}
 */
o3djs.util.rendererInitStatus = {
  NO_PLUGIN: -1,
  UNINITIALIZED: 0,
  SUCCESS: 1,
  OUT_OF_RESOURCES: 2,
  GPU_NOT_UP_TO_SPEC: 3,
  INITIALIZATION_ERROR: 4
};

/**
 * This implements a JavaScript version of currying. Currying allows you to
 * take a function and fix its initial arguments, resulting in a function
 * expecting only the remaining arguments when it is invoked. For example:
 * <pre>
 * function add(a, b) {
 *   return a + b;
 * }
 * var increment = o3djs.util.curry(add, 1);
 * var result = increment(10);
 * </pre>
 * Now result equals 11.
 * @param {!function(...): *} func The function to curry.
 * @return {!function(...): *} The curried function.
 */
o3djs.util.curry = function(func) {
  var outerArgs = [];
  for (var i = 1; i < arguments.length; ++i) {
    outerArgs.push(arguments[i]);
  }
  return function() {
    var innerArgs = outerArgs.slice();
    for (var i = 0; i < arguments.length; ++i) {
      innerArgs.push(arguments[i]);
    }
    return func.apply(this, innerArgs);
  }
}

/**
 * Gets the URI in which the current page is located, omitting the file name.
 * @return {string} The base URI of the page. If the page is
 *     "http://some.com/folder/somepage.html" returns
 *     "http://some.com/folder/".
 */
o3djs.util.getCurrentURI = function() {
  var path = window.location.href;
  var index = path.lastIndexOf('/');
  return path.substring(0, index + 1);
};

/**
 * Given a URI that is relative to the current page, returns the absolute
 * URI.
 * @param {string} uri URI relative to the current page.
 * @return {string} Absolute uri. If the page is
 *     "http://some.com/folder/sompage.html" and you pass in
 *     "images/someimage.jpg" will return
 *     "http://some.com/folder/images/someimage.jpg".
 */
o3djs.util.getAbsoluteURI = function(uri) {
  return o3djs.util.getCurrentURI() + uri;
};

/**
 * Searches an array for a specific value.
 * @param {!Array.<*>} array Array to search.
 * @param {*} value Value to search for.
 * @return {boolean} True if value is in array.
 */
o3djs.util.arrayContains = function(array, value) {
  for (var i = 0; i < array.length; i++) {
    if (array[i] == value) {
      return true;
    }
  }
  return false;
};

/**
 * Searches for all transforms with a "o3d.tags" ParamString
 * that contains specific tag keywords assuming comma separated
 * words.
 * @param {!o3d.Transform} treeRoot Root of tree to search for tags.
 * @param {string} searchTags Tags to look for. eg "camera", "ogre,dragon".
 * @return {!Array.<!o3d.Transform>} Array of transforms.
 */
o3djs.util.getTransformsInTreeByTags = function(treeRoot, searchTags) {
  var splitTags = searchTags.split(',');
  var transforms = treeRoot.getTransformsInTree();
  var found = [];
  for (var n = 0; n < transforms.length; n++) {
    var tagParam = transforms[n].getParam('collada.tags');
    if (tagParam) {
       var tags = tagParam.value.split(',');
       for (var t = 0; t < tags.length; t++) {
         if (o3djs.util.arrayContains(splitTags, tags[t])) {
           found[found.length] = transforms[n];
           break;
         }
      }
    }
  }
  return found;
};

/**
 * Finds transforms in the tree by prefix.
 * @param {!o3d.Transform} treeRoot Root of tree to search.
 * @param {string} prefix Prefix to look for.
 * @return {!Array.<!o3d.Transform>} Array of transforms matching prefix.
 */
o3djs.util.getTransformsInTreeByPrefix = function(treeRoot, prefix) {
  var found = [];
  var transforms = treeRoot.getTransformsInTree();
  for (var ii = 0; ii < transforms.length; ii++) {
    var transform = transforms[ii];
    if (transform.name.indexOf(prefix) == 0) {
      found[found.length] = transform;
    }
  }
  return found;
};

/**
 * Finds the bounding box of all primitives in the tree, in the local space of
 * the tree root. This will use existing bounding boxes on transforms and
 * elements, but not create new ones.
 * @param {!o3d.Transform} treeRoot Root of tree to search.
 * @return {!o3d.BoundingBox} The boundinding box of the tree.
 */
o3djs.util.getBoundingBoxOfTree = function(treeRoot) {
  // If we already have a bounding box, use that one.
  var box = treeRoot.boundingBox;
  if (box.valid) {
    return box;
  }
  var o3d = o3djs.base.o3d;
  // Otherwise, create it as the union of all the children bounding boxes and
  // all the shape bounding boxes.
  var transforms = treeRoot.children;
  for (var i = 0; i < transforms.length; ++i) {
    var transform = transforms[i];
    var childBox = o3djs.util.getBoundingBoxOfTree(transform);
    if (childBox.valid) {
      // transform by the child local matrix.
      childBox = childBox.mul(transform.localMatrix);
      if (box.valid) {
        box = box.add(childBox);
      } else {
        box = childBox;
      }
    }
  }
  var shapes = treeRoot.shapes;
  for (var i = 0; i < shapes.length; ++i) {
    var elements = shapes[i].elements;
    for (var j = 0; j < elements.length; ++j) {
      var elementBox = elements[j].boundingBox;
      if (!elementBox.valid) {
        elementBox = elements[j].getBoundingBox(0);
      }
      if (box.valid) {
        box = box.add(elementBox);
      } else {
        box = elementBox;
      }
    }
  }
  return box;
};

/**
 * Returns the smallest power of 2 that is larger than or equal to size.
 * @param {number} size Size to get power of 2 for.
 * @return {number} smallest power of 2 that is larger than or equal to size.
 */
o3djs.util.getPowerOfTwoSize = function(size) {
  var powerOfTwo = 1;
  size = size - 1;
  while (size) {
    size = size >> 1;
    powerOfTwo = powerOfTwo << 1;
  }
  return powerOfTwo;
};

/**
 * Gets the version of the installed plugin.
 * @return {?string} version string in 'major.minor.revision.build' format.
 *    If the plugin does not exist returns null.
 */
o3djs.util.getPluginVersion = function() {
  var version = null;
  var description = null;
  if (navigator.plugins != null && navigator.plugins.length > 0) {
    var plugin = navigator.plugins[o3djs.util.PLUGIN_NAME];
    if (plugin) {
      description = plugin.description;
    }
  } else if (o3djs.base.IsMSIE()) {
    try {
      var activeXObject = new ActiveXObject('o3d_host.O3DHostControl');
      description = activeXObject.description;
    } catch (e) {
      // O3D plugin was not found.
    }
  }
  if (description) {
    var re = /.*version:\s*(\d+)\.(\d+)\.(\d+)\.(\d+).*/;
    // Parse the version out of the description.
    var parts = re.exec(description);
    if (parts && parts.length == 5) {
      // make sure the format is #.#.#.#  no whitespace, no trailing comments
      version = '' + parseInt(parts[1], 10) + '.' +
                     parseInt(parts[2], 10) + '.' +
                     parseInt(parts[3], 10) + '.' +
                     parseInt(parts[4], 10);
    }
  }
  return version;
};

/**
 * Checks if the required version of the plugin in available.
 * @param {string} requiredVersion version string in
 *    "major.minor.revision.build" format. You can leave out any non-important
 *    numbers for example "3" = require major version 3, "2.4" = require major
 *    version 2, minor version 4.
 * @return {boolean} True if the required version is available.
 */
o3djs.util.requiredVersionAvailable = function(requiredVersion) {
  var version = o3djs.util.getPluginVersion();
  if (!version) {
    return false;
  }
  var haveParts = version.split('.');
  var requiredParts = requiredVersion.split('.');
  if (requiredParts.length > 4) {
    throw Error('requiredVersion has more than 4 parts!');
  }
  for (var pp = 0; pp < requiredParts.length; ++pp) {
    var have = parseInt(haveParts[pp], 10);
    var required = parseInt(requiredParts[pp], 10);
    if (have < required) {
      return false;
    }
    if (have > required) {
      return true;
    }
  }
  return true;
};

/**
 * Gets all the elements of a certain tag that have a certain id.
 * @param {string} tag The tag to look for. (eg. 'div').
 * @param {string} id The id to look for. This can be a regular expression.
 * @return {!Array.<!Element>} An array of the elements found.
 */
o3djs.util.getElementsByTagAndId = function(tag, id) {
  var elements = [];
  var allElements = document.getElementsByTagName(tag);
  for (var ee = 0; ee < allElements.length; ++ee) {
    var element = allElements[ee];
    if (element.id && element.id.match(id)) {
      elements.push(element);
    }
  }
  return elements;
};

/**
 * Gets all the Elements that contain or would contain O3D plugin objects.
 * @param {string} opt_id The id to look for. This can be a regular
 *     expression. The default is "^o3d".
 * @param {string} opt_tag The type of tag to look for. The default is "div".
 */
o3djs.util.getO3DContainerElements = function(opt_id, opt_tag) {
  var tag = opt_tag || 'div';
  var id = opt_id || '^o3d';
  return o3djs.util.getElementsByTagAndId(tag, id);
}

/**
 * Offers the user the option to download the plugin.
 *
 * Finds all divs with the id "^o3d" and inserts a message and link
 * inside to download the plugin. If no areas exist OR if none of them are
 * large enough for the message then displays an alert.
 *
 * @param {string} opt_id The id to look for. This can be a regular
 *     expression. The default is "^o3d".
 * @param {string} opt_tag The type of tag to look for. The default is "div".
 */
o3djs.util.offerPlugin = function(opt_id, opt_tag) {
  var havePlugin = o3djs.util.requiredVersionAvailable('');
  var elements = o3djs.util.getO3DContainerElements(opt_id, opt_tag);
  var addedMessage = false;
  // TODO: This needs to be localized OR we could insert a html like
  // <script src="http://google.com/o3d_plugin_dl"></script>
  // in which case google could serve the message localized and update the
  // link.
  var subMessage =
    (havePlugin ?
     'This page requires a newer version of the O3D plugin.' :
     'This page requires the O3D plugin to be installed.');
  var message =
      '<div style="background: lightblue; width: 100%; height: 100%; ' +
      'text-align:center;">' +
      '<br/><br/>' + subMessage + '<br/>' +
      '<a href="' + o3djs.util.PLUGIN_DOWNLOAD_URL +
      '">Click here to download.</a>' +
      '</div>'
  for (var ee = 0; ee < elements.length; ++ee) {
    var element = elements[ee];
    if (element.clientWidth >= o3djs.util.MINIMUM_WIDTH_FOR_MESSAGE &&
        element.clientHeight >= o3djs.util.MINIMUM_HEIGHT_FOR_MESSAGE &&
        element.style.display.toLowerCase() != 'none' &&
        element.style.visibility.toLowerCase() != 'hidden') {
      addedMessage = true;
      element.innerHTML = message;
    }
  }
  if (!addedMessage) {
    if (confirm(subMessage + '\n\nClick OK to download.')) {
      window.location = o3djs.util.PLUGIN_DOWNLOAD_URL;
    }
  }
};

/**
 * Tells the user their graphics card is not able to run the plugin or is out
 * of resources etc.
 *
 * Finds all divs with the id "^o3d" and inserts a message. If no areas
 * exist OR if none of them are large enough for the message then displays an
 * alert.
 *
 * @param {!o3d.Renderer.InitStatus} initStatus The initializaion status of
 *     the renderer.
 * @param {string} error An error message. Will be '' if there is no message.
 * @param {string} opt_id The id to look for. This can be a regular
 *     expression. The default is "^o3d".
 * @param {string} opt_tag The type of tag to look for. The default is "div".
 */
o3djs.util.informNoGraphics = function(initStatus, error, opt_id, opt_tag) {
  var elements = o3djs.util.getO3DContainerElements(opt_id, opt_tag);
  var addedMessage = false;
  var subMessage;
  var message;
  var alertMessage = '';
  var alertFunction = function() { };

  var moreInfo = function(error) {
    var html = '';
    if (error.length > 0) {
      html = '' +
          '<br/><br/><div>More Info:<br/>' + error + '</div>';
    }
    return html;
  };

  // TODO: This needs to be localized OR we could insert a html like
  // <script src="http://google.com/o3d_plugin_dl"></script>
  // in which case google could serve the message localized and update the
  // link.
  if (initStatus == o3djs.util.rendererInitStatus.GPU_NOT_UP_TO_SPEC) {
    subMessage =
        'We are terribly sorry but it appears your graphics card is not ' +
        'able to run o3d. We are working on a solution.';
    message =
        '<div style="background: lightgray; width: 100%; height: 100%; ' +
        'text-align: center;">' +
        '<br/><br/>' + subMessage +
        '<br/><br/><a href="' + o3djs.util.PLUGIN_DOWNLOAD_URL +
        '">Click Here to go the O3D website</a>' +
        moreInfo(error) +
        '</div>';
    alertMessage = '\n\nClick OK to go to the o3d website.';
    alertFunction = function() {
          window.location = o3djs.util.PLUGIN_DOWNLOAD_URL;
        };
  } else if (initStatus == o3djs.util.rendererInitStatus.OUT_OF_RESOURCES) {
    subMessage =
        'Your graphics system appears to be out of resources. Try closing ' +
        'some applications and then refreshing this page.';
    message =
        '<div style="background: lightgray; width: 100%; height: 100%; ' +
        'text-align: center;">' +
        '<br/><br/>' + subMessage +
        moreInfo(error) +
        '</div>';
  } else {
    subMessage =
        'A unknown error has prevented O3D from starting. Try downloading ' +
        'new drivers or checking for OS updates.';
    message =
        '<div style="background: lightgray; width: 100%; height: 100%; ' +
        'text-align: center;">' +
        '<br/><br/>' + subMessage +
        moreInfo(error) +
        '</div>';
  }
  for (var ee = 0; ee < elements.length; ++ee) {
    var element = elements[ee];
    if (element.clientWidth >= o3djs.util.MINIMUM_WIDTH_FOR_MESSAGE &&
        element.clientHeight >= o3djs.util.MINIMUM_HEIGHT_FOR_MESSAGE &&
        element.style.display.toLowerCase() != 'none' &&
        element.style.visibility.toLowerCase() != 'hidden') {
      addedMessage = true;
      element.innerHTML = message;
    }
  }
  if (!addedMessage) {
    if (confirm(subMessage + alertMessage)) {
      alertFunction();
    }
  }
};

/**
 * Handles failure to create the plugin.
 *
 * @param {!o3d.Renderer.InitStatus} initStatus The initializaion status of
 *     the renderer.
 * @param {string} error An error message. Will be '' if there is no message.
 * @param {string} opt_id The id to look for. This can be a regular
 *     expression. The default is "^o3d".
 * @param {string} opt_tag The type of tag to look for. The default is "div".
 */
o3djs.util.informPluginFailure = function(initStatus, error, opt_id, opt_tag) {
  if (initStatus == o3djs.util.rendererInitStatus.NO_PLUGIN) {
    o3djs.util.offerPlugin(opt_id, opt_tag);
  } else {
    o3djs.util.informNoGraphics(initStatus, error, opt_id, opt_tag);
  }
};

/**
 * Utility to get the text contents of a DOM element with a particular ID.
 * Currently only supports textarea and script nodes.
 * @param {string} id The Node id.
 * @return {string} The text content.
 */
o3djs.util.getElementContentById = function(id) {
  // DOM manipulation is not currently supported in IE.
  o3djs.BROWSER_ONLY = true;

  var node = document.getElementById(id);
  if (!node) {
    throw 'getElementContentById could not find node with id ' + id;
  }
  switch (node.tagName) {
    case 'TEXTAREA':
      return node.value;
    case 'SCRIPT':
      return node.text;
    default:
      throw 'getElementContentById does not no how to get content from a ' +
          node.tagName + ' element';
  }
};

/**
 * Utility to get an element from the DOM by ID. This must be used from V8
 * in preference to document.getElementById because we do not currently
 * support invoking methods on DOM objects in IE.
 * @param {string} id The Element id.
 * @return {Element} The Element or null if not found.
 */
o3djs.util.getElementById = function(id) {
  o3djs.BROWSER_ONLY = true;
  return document.getElementById(id);
};

/**
 * Identifies a JavaScript engine.
 * @enum {number}
 */
o3djs.util.Engine = {
  /**
   * The JavaScript engine provided by the browser.
   */
  BROWSER: 0,
  /**
   * The V8 JavaScript engine embedded in the plugin.
   */
  V8: 1
};

/**
 * The engine selected as the main engine (the one the makeClients callback
 * will be invoked on).
 * @private
 * @type {o3djs.util.Engine}
 */
o3djs.util.mainEngine_ = o3djs.util.Engine.BROWSER;

/**
 * Checks the user agent string for substring s, returning true if it appears.
 * @return {boolean} Whether the browser's user-agent string contains string s.
 */
function o3djs_navHas(s) {
  return navigator.userAgent.indexOf(s) != -1;
}

/**
 * Checks for V8 support. This is to cope with environments where our V8 is
 * known to be problematic, eg Safari on 10.6.
 * @return {boolean} Whether the environment supports V8.
 */
function o3djs_isV8Supported() {
  if (o3djs_navHas('Chrome'))
    return true;
  if (!o3djs_navHas('Safari'))
    return true;
  return !o3djs_navHas('Intel Mac OS X 10_6');
}

/**
 * Select an engine to use as the main engine (the one the makeClients
 * callback will be invoked on). If an embedded engine is requested, one
 * element must be identified with the id 'o3d'. The callback will be invoked
 * in this element.
 * Ignores attempts to choose V8 if it is not supported in this host.
 * @param {o3djs.util.Engine} engine The engine.
 */
o3djs.util.setMainEngine = function(engine) {
  if ((engine == o3djs.util.Engine.V8) && !o3djs_isV8Supported()) {
    engine = o3djs.util.Engine.BROWSER;
  }
  o3djs.util.mainEngine_ = engine;
};

/**
 * A regex used to cleanup the string representation of a function before
 * it is evaled.
 * @private
 * @type {!RegExp}
 */
o3djs.util.fixFunctionString_ = /^\s*function\s+[^\s]+\s*\(([^)]*)\)/

/**
 * Evaluate a callback function in the V8 engine.
 * @param {!Object} clientElement The plugin containing the V8 engine.
 * @param {!function(...): *} callback A function to call.
 * @param {!Object} thisArg The value to be bound to "this".
 * @param {!Array.<*>} args The arguments to pass to the callback.
 * @return {*} The result of calling the callback.
 */
o3djs.util.callV8 = function(clientElement, callback, thisArg, args) {
  // Sometimes a function will be converted to a string like this:
  //   function foo(a, b) { ... }
  // In this case, convert to this form:
  //   function(a, b) { ... }
  var functionString = callback.toString();
  functionString = functionString.replace(o3djs.util.fixFunctionString_,
                                          'function($1)');

  // Make a V8 function that will invoke the callback.
  var v8Code =
      'function(thisArg, args) {\n' +
      '  var localArgs = [];\n' +
      '  var numArgs = args.length;\n' +
      '  for (var i = 0; i < numArgs; ++i) {\n' +
      '    localArgs.push(args[i]);\n' +
      '  }\n' +
      '  var func = ' + functionString + ';\n' +
      '  return func.apply(thisArg, localArgs);\n' +
      '}\n';

  // Evaluate the function in V8.
  var v8Function = clientElement.eval(v8Code);
  return v8Function(thisArg, args);
};

/**
 * A regex to remove .. from a URI.
 * @private
 * @type {!RegExp}
 */
o3djs.util.stripDotDot_ = /\/[^\/]+\/\.\./;

/**
 * Turn a URI into an absolute URI.
 * @param {string} uri The URI.
 * @return {string} The absolute URI.
 */
o3djs.util.toAbsoluteUri = function(uri) {
  if (uri.indexOf('://') == -1) {
    var baseUri = document.location.toString();
    var lastSlash = baseUri.lastIndexOf('/');
    if (lastSlash != -1) {
      baseUri = baseUri.substring(0, lastSlash);
    }
    uri = baseUri + '/' + uri;
  }

  do {
    var lastUri = uri;
    uri = uri.replace(o3djs.util.stripDotDot_, '');
  } while (lastUri !== uri);

  return uri;
};

/**
 * The script URIs.
 * @private
 * @type {!Array.<string>}
 */
o3djs.util.scriptUris_ = [];

/**
 * Add a script URI. Scripts that are referenced from script tags that are
 * within this URI are automatically loaded into the alternative JavaScript
 * main JavaScript engine. Do not include directories of scripts that are
 * included with o3djs.require. These are always available. This mechanism
 * is not able to load scripts in a different domain from the document.
 * @param {string} uri The URI.
 */
o3djs.util.addScriptUri = function(uri) {
  o3djs.util.scriptUris_.push(o3djs.util.toAbsoluteUri(uri));
};

/**
 * Determine whether a URI is a script URI that should be loaded into the
 * alternative main JavaScript engine.
 * @param {string} uri The URI.
 * @return {boolean} Whether it is a script URI.
 */
o3djs.util.isScriptUri = function(uri) {
  uri = o3djs.util.toAbsoluteUri(uri);
  for (var i = 0; i < o3djs.util.scriptUris_.length; ++i) {
    var scriptUri = o3djs.util.scriptUris_[i];
    if (uri.substring(0, scriptUri.length) === scriptUri) {
      return true;
    }
  }
  return false;
};

/**
 * Returns whether or not this is a script tag we want. Currently that is
 * only script tags with an id that starts with "o3d".
 * @private
 * @param {!Element} scriptElement The script element to check.
 * @return {boolean} True if we want this script tag.
 */
o3djs.util.isWantedScriptTag_ = function(scriptElement) {
  return scriptElement.id && scriptElement.id.match(/^o3dscript/);
};

/**
 * Concatenate the text of all the script tags in the document and invokes
 * the callback when complete. This function is asynchronous if any of the
 * script tags reference JavaScript through a URI.
 * @private
 * @return {string} The script tag text.
 */
o3djs.util.getScriptTagText_ = function() {
  var scriptTagText = '';
  var scriptElements = document.getElementsByTagName('script');
  for (var i = 0; i < scriptElements.length; ++i) {
    var scriptElement = scriptElements[i];
    if (scriptElement.type === '' ||
        scriptElement.type === 'text/javascript') {
      if ('text' in scriptElement && scriptElement.text &&
          o3djs.util.isWantedScriptTag_(scriptElement)) {
        scriptTagText += scriptElement.text;
      }
      if ('src' in scriptElement && scriptElement.src &&
          o3djs.util.isScriptUri(scriptElement.src)) {
        // It would be better to make this an asynchronous load but the script
        // file is very likely to be in the browser cache because it should
        // have just been loaded via the browser script tag.
        scriptTagText += o3djs.io.loadTextFileSynchronous(scriptElement.src);
      }
    }
  }
  return scriptTagText;
};

/**
 * Creates a client element.  In other words it creates an <OBJECT> tag for o3d.
 * <b>Note that the browser may not have initialized the plugin before
 * returning.</b>
 * @param {!Element} element The DOM element under which the client element
 *    will be appended.
 * @param {string} opt_features A comma separated list of the
 *    features you need for your application. The current list of features:
 *    <li>FloatingPointTextures: Includes the formats R32F, ABGR16F and
 *    ABGR32F</li>
 *    The features are case sensitive.
 * @param {string} opt_requestVersion version string in
 *    "major.minor.revision.build" format. You can leave out any non-important
 *    numbers for example "3" = request major version 3, "2.4" = request major
 *    version 2, minor version 4. If no string is passed in the newest version
 *    of the plugin will be created.
 * @return {Element} O3D element or null if requested version is not
 *    available.
 */
o3djs.util.createClient = function(element, opt_features, opt_requestVersion) {
  opt_features = opt_features || '';
  opt_requestVersion = opt_requestVersion || o3djs.util.REQUIRED_VERSION;
  if (!o3djs.util.requiredVersionAvailable(opt_requestVersion)) {
    return null;
  }
  opt_features += (opt_features ? ',' : '') + 'APIVersion=' +
                  opt_requestVersion;
  var objElem;
  // TODO: Use opt_requiredVersion to set a version so the plugin
  //    can make sure it offers that version of the API.
  // Note:  The IE version of the plug-in does not receive attributes during
  //  construction, unless the innerHTML construction style is used.
  if (o3djs.base.IsMSIE()) {
    element.innerHTML =
        '<OBJECT ' +
          'WIDTH="100%" HEIGHT="100%"' +
          'CLASSID="CLSID:9666A772-407E-4F90-BC37-982E8160EB2D">' +
            '<PARAM name="o3d_features" value="' + opt_features + '"/>' +
        '</OBJECT>';
    objElem = element.childNodes[0];
  } else {
    objElem = document.createElement('object');
    objElem.type = 'application/vnd.o3d.auto';
    objElem.style.width = '100%';
    objElem.style.height = '100%';
    objElem.setAttribute('o3d_features', opt_features);
    element.appendChild(objElem);
  }

  if (objElem.client.clientInfo.glsl) {
    o3djs.effect.setLanguage('glsl');
  }

  return objElem;
};

/**
 * Finds all divs with the an id that starts with "o3d" and inserts a client
 * area inside.
 *
 * NOTE: the size of the client area is always set to 100% which means the div
 * must have its size set or managed by the browser. Examples:
 *
 * -- A div of a specific size --
 * &lt;div id="o3d" style="width:800px; height:600px">&lt;/div>
 *
 * -- A div that fills its containing element --
 * &lt;div id="o3d" style="width:100%; height:100%">&lt;/div>
 *
 * In both cases, a DOCTYPE is probably required.
 *
 * You can also request certain features by adding the attribute
 * 'o3d_features' as in
 *
 * &lt;div id="o3d" o3d_features="FloatingPointTextures">&lt;/div>
 *
 * This allows you to specify different features per area. Otherwise you can
 * request features as an argument to this function.
 *
 * Normally this function handles failure for you but if you want to handle
 * failure in your own way you can supply a failure callback. Here is an example
 * of using this function with your own failure callback.
 *
 * <pre>
 * &lt;script type="text/javascript" id="o3dscript"&gt;
 * o3djs.require('o3djs.util');
 *
 * window.onload = init;
 *
 * function init() {
 *  o3djs.util.makeClients(onSuccess, '', undefined, onFailure);
 * }
 *
 * function onFailure(initStatus, error, id, tag) {
 *   // Get a list of the elements that would have had an O3D plugin object
 *   // inserted if it had succeed.
 *   var elements = o3djs.util.getO3DContainerElements(id, tag);
 *
 *   switch (initStatus) {
 *     case o3djs.util.rendererInitStatus.NO_PLUGIN:
 *       // Tell the user there is no plugin
 *       ...
 *       break;
 *     case o3djs.util.rendererInitStatus.OUT_OF_RESOURCES:
 *     case o3djs.util.rendererInitStatus.GPU_NOT_UP_TO_SPEC:,
 *     case o3djs.util.rendererInitStatus.INITIALIZATION_ERROR:
 *     default:
 *       // Tell the user there are other issues
 *       ...
 *       break;
 *   }
 * }
 *
 * function onSuccess(o3dElementsArray) {
 *   // Run your app.
 *   ...
 * }
 * &lt;/script&gt;
 * </pre>
 *
 * @param {!function(Array.<!Element>): void} callback Function to call when
 *     client objects have been created.
 * @param {string} opt_features A comma separated list of the
 *     features you need for your application. The current list of features:
 *
 *     <li>FloatingPointTextures: Includes the formats R32F, ABGR16F and
 *     ABGR32F</li>
 *     <li>LargeGeometry: Allows buffers to have more than 65534 elements.</li>
 *     <li>NotAntiAliased: Turns off anti-aliasing</li>
 *     <li>InitStatus=X: Where X is a number. Allows simulatation of the plugin
 *     failing</li>
 *
 *     The features are case sensitive.
 * @param {string} opt_requiredVersion version string in
 *     "major.minor.revision.build" format. You can leave out any
 *     non-important numbers for example "3" = require major version 3,
 *     "2.4" = require major version 2, minor version 4. If no string is
 *     passed in the version of the needed by this version of the javascript
 *     libraries will be created.
 * @param {!function(!o3d.Renderer.InitStatus, string, (string|undefined),
 *     (string|undefined)): void} opt_failureCallback Function to call if the
 *     plugin does not exist, if the required version is not installed, or if
 *     for some other reason the plugin can not start. If this function is not
 *     specified or is null the default behavior of leading the user to the
 *     download page will be provided. See o3djs.util.informPluginFailure for an
 *     example of this type of callback.
 * @param {string} opt_id The id to look for. This can be a regular
 *     expression. The default is "^o3d".
 * @param {string} opt_tag The type of tag to look for. The default is "div".
 * @see o3djs.util.informPluginFailure
 */
o3djs.util.makeClients = function(callback,
                                  opt_features,
                                  opt_requiredVersion,
                                  opt_failureCallback,
                                  opt_id,
                                  opt_tag) {
  opt_failureCallback = opt_failureCallback || o3djs.util.informPluginFailure;
  opt_requiredVersion = opt_requiredVersion || o3djs.util.REQUIRED_VERSION;
  if (!o3djs.util.requiredVersionAvailable(opt_requiredVersion)) {
    opt_failureCallback(o3djs.util.rendererInitStatus.NO_PLUGIN, '',
                        opt_id, opt_tag);
  } else {
    var clientElements = [];
    var elements = o3djs.util.getO3DContainerElements(opt_id, opt_tag);
    var mainClientElement = null;
    for (var ee = 0; ee < elements.length; ++ee) {
      var element = elements[ee];
      var features = opt_features;
      if (!features) {
        var o3d_features = element.getAttribute('o3d_features');
        if (o3d_features) {
          features = o3d_features;
        } else {
          features = '';
        }
      }

      var objElem = o3djs.util.createClient(element, features);
      clientElements.push(objElem);

      // If the callback is to be invoked in an embedded JavaScript engine,
      // one element must be identified with the id 'o3d'. This callback
      // will be invoked in the element identified as such.
      if (element.id === 'o3d') {
        mainClientElement = objElem;
      }
    }

    // Wait for the browser to initialize the clients.
    var clearId = window.setInterval(function() {
      var initStatus = 0;
      var error = '';
      var o3d;
      for (var cc = 0; cc < clientElements.length; ++cc) {
        var element = clientElements[cc];
        o3d = element.o3d;
        var ready = o3d &&
            element.client &&
            element.client.rendererInitStatus >
                o3djs.util.rendererInitStatus.UNINITIALIZED;
        if (!ready) {
          return;
        }
        var status = clientElements[cc].client.rendererInitStatus;
        // keep the highest status. This is the worst status.
        if (status > initStatus) {
          initStatus = status;
          error = clientElements[cc].client.lastError;
        }
      }

      window.clearInterval(clearId);

      // If the plugin could not initialize the graphics delete all of
      // the plugin objects
      if (initStatus > 0 && initStatus != o3d.Renderer.SUCCESS) {
        for (var cc = 0; cc < clientElements.length; ++cc) {
          var clientElement = clientElements[cc];
          clientElement.parentNode.removeChild(clientElement);
        }
        opt_failureCallback(initStatus, error, opt_id, opt_tag);
      } else {
        o3djs.base.snapshotProvidedNamespaces();

        // TODO: Is this needed with the new event code?
        for (var cc = 0; cc < clientElements.length; ++cc) {
          // Based on v8 support test, not on current engine, as V8
          // still needs to be initialized even with o3djs.util.Engine.BROWSER
          // on some configs.
          if (o3djs_isV8Supported())
            o3djs.base.initV8(clientElements[cc]);
          o3djs.event.startKeyboardEventSynthesis(clientElements[cc]);
          o3djs.error.setDefaultErrorHandler(clientElements[cc].client);
        }
        o3djs.base.init(clientElements[0]);

        switch (o3djs.util.mainEngine_) {
          case o3djs.util.Engine.BROWSER:
            callback(clientElements);
            break;
          case o3djs.util.Engine.V8:
            if (!mainClientElement) {
              throw 'V8 engine was requested but there is no element with' +
                  ' the id "o3d"';
            }

            // Retreive the code from the script tags and eval it in V8 to
            // duplicate the browser environment.
            var scriptTagText = o3djs.util.getScriptTagText_();
            mainClientElement.eval(scriptTagText);

            // Invoke the callback in V8.
            o3djs.util.callV8(mainClientElement,
                              callback,
                              o3djs.global,
                              [clientElements]);
            break;
          default:
            throw 'Unknown engine ' + o3djs.util.mainEngine_;
        }
      }
    }, 10);
  }
};

/*
 * Copyright 2009, Google Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

// A shout out to Terence J. Grant at tatewake.com for his tutorial on arcball
// implementations.

/**
 * @fileoverview This file contains functions for implementing an arcball
 * calculation.  It puts them in the "arcball" module on the o3djs object.
 *
 *     Note: This library is only a sample. It is not meant to be some official
 *     library. It is provided only as example code.
 *
 */

o3djs.provide('o3djs.arcball');

o3djs.require('o3djs.math');
o3djs.require('o3djs.quaternions');

/**
 * A Module for arcball manipulation.
 *
 * This is useful for rotating a model with the mouse.
 *
 * @namespace
 */
o3djs.arcball = o3djs.arcball || {};

/**
 * Creates a new arcball.
 * @param {number} areaWidth width of area arcball should cover.
 * @param {number} areaHeight height of area arcball should cover.
 * @return {!o3djs.arcball.ArcBall} The created arcball.
 * @see o3djs.arcball
 */
o3djs.arcball.create = function(areaWidth, areaHeight) {
  return new o3djs.arcball.ArcBall(areaWidth, areaHeight);
};

/**
 * A class that implements an arcball.
 * @constructor
 * @param {number} areaWidth width of area arcball should cover.
 * @param {number} areaHeight height of area arcball should cover.
 * @see o3djs.arcball
 */
o3djs.arcball.ArcBall = function(areaWidth, areaHeight) {
  /**
   * The start vector.
   * @private
   * @type {!o3djs.math.Vector3}
   */
  this.startVector_ = [0, 0, 0];

  /**
   * The end vector.
   * @private
   * @type {!o3djs.math.Vector3}
   */
  this.endVector_ = [0, 0, 0];

  /**
   * The width of the arcBall area.
   * @private
   * @type {number}
   */
  this.areaWidth_ = areaWidth;

  /**
   * The height of the arcBall area.
   * @private
   * @type {number}
   */
  this.areaHeight_ = areaHeight;
};


/**
 * Sets the size of the arcball.
 * @param {number} areaWidth width of area arcball should cover.
 * @param {number} areaHeight height of area arcball should cover.
 */
o3djs.arcball.ArcBall.prototype.setAreaSize = function(areaWidth, areaHeight) {
  this.areaWidth_ = areaWidth;
  this.areaHeight_ = areaHeight;
};

/**
 * Converts a 2d point to a point on the sphere of radius 1 sphere.
 * @param {!o3djs.math.Vector2} newPoint A point in 2d.
 * @return {!o3djs.math.Vector3} A point on the sphere of radius 1.
 */
o3djs.arcball.ArcBall.prototype.mapToSphere = function(newPoint) {
  // Copy parameter into temp
  var tempPoint = o3djs.math.copyVector(newPoint);

  // Scale to -1.0 <-> 1.0
  tempPoint[0] = tempPoint[0] / this.areaWidth_ * 2.0 - 1.0;
  tempPoint[1] = 1.0 - tempPoint[1] / this.areaHeight_ * 2.0;

  // Compute square of length from center
  var lengthSquared = o3djs.math.lengthSquared(tempPoint);

  // If the point is mapped outside of the sphere... (length > radius squared)
  if (lengthSquared > 1.0) {
    return o3djs.math.normalize(tempPoint).concat(0);
  } else {
    // Otherwise it's on the inside.
    return tempPoint.concat(Math.sqrt(1.0 - lengthSquared));
  }
};

/**
 * Records the starting point on the sphere.
 * @param {!o3djs.math.Vector2} newPoint point in 2d.
 */
o3djs.arcball.ArcBall.prototype.click = function(newPoint) {
  this.startVector_ = this.mapToSphere(newPoint);
};

/**
 * Computes the rotation of the sphere based  on the initial point clicked as
 * set through Arcball.click and the current point passed in as newPoint
 * @param {!o3djs.math.Vector2} newPoint point in 2d.
 * @return {!o3djs.quaternions.Quaternion} A quaternion representing the new
 *     orientation.
 */
o3djs.arcball.ArcBall.prototype.drag = function(newPoint) {
  this.endVector_ = this.mapToSphere(newPoint);

  return o3djs.math.cross(this.startVector_, this.endVector_).concat(
      o3djs.math.dot(this.startVector_, this.endVector_));
};
/*
 * Copyright 2009, Google Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */


/**
 * @fileoverview This file contains sample code for controlling the camera
 * (ie view matrix) using the mouse and keyboard.
 */

o3djs.provide('o3djs.cameracontroller');

o3djs.require('o3djs.math');

/**
 * A Module for user control of the camera / view matrix.
 * @namespace
 */
o3djs.cameracontroller = o3djs.cameracontroller || {};

/**
 * The possible modes that a CameraController can be in.
 * One of these is usually set when a mouse button is pressed down,
 * and then NONE is set when the mouse button is released.
 * When the mouse is moved, the DragMode determines what effect the mouse move
 * has on the camera parameters (such as position and orientation).
 * If the DragMode is NONE, mouse moves have no effect.
 * @enum {number}
 */
o3djs.cameracontroller.DragMode = {
  /**
   * Dragging the mouse has no effect.
   */
  NONE: 0,
  /**
   * Dragging left or right changes rotationAngle,
   * dragging up or down changes heightAngle.
   */
  SPIN_ABOUT_CENTER: 1,
  /**
   * Dragging up or down changes the backpedal.
   */
  DOLLY_IN_OUT: 2,
  /**
   * Dragging up or down changes the fieldOfViewAngle.
   */
  ZOOM_IN_OUT: 3,
  /**
   * Dragging up or down changes the amount of perspective.
   * Perspective is focused on the centerPos.
   * If backpedal is negative or zero, there is no effect.
   */
  DOLLY_ZOOM: 4,
  /**
   * Dragging moves the centerPos around the plane perpendicular to
   * the camera view direction.
   */
  MOVE_CENTER_IN_VIEW_PLANE: 5
};

/**
 * Creates a CameraController.
 * @param {!o3djs.math.Vector3} centerPos The position that the camera is
 *     looking at and rotating around; or if backpedal is zero, the location
 *     of the camera. In world space.
 * @param {number} backpedal The distance the camera moves back from the
 *     centerPos.
 * @param {number} heightAngle The angle the camera rotates up or down
 *     (about the x axis that passes through the centerPos). In radians.
 * @param {number} rotationAngle The angle the camera rotates left or right
 *     (about the y axis that passes through the centerPos). In radians.
 * @param {number} fieldOfViewAngle The vertical angle of the viewing frustum.
 *     In radians, between 0 and PI/2. This does not affect the view matrix,
 *     but it can still be useful to let the CameraController control the
 *     field of view.
 * @param {function(!o3djs.cameracontroller.CameraController): void}
 *     opt_onChange Pointer to a callback to call when the camera changes.
 * @return {!o3djs.cameracontroller.CameraController} The created
 *     CameraController.
 */
o3djs.cameracontroller.createCameraController = function(centerPos,
                                                         backpedal,
                                                         areaWidth,
                                                         areaHeight,
                                                         fieldOfViewAngle,
                                                         opt_onChange) {
  return new o3djs.cameracontroller.CameraController(centerPos,
                                                     backpedal,
                                                     areaWidth,
                                                     areaHeight,
                                                     fieldOfViewAngle,
                                                     opt_onChange);
};

/**
 * Class to hold user-controlled camera information and handle user events.
 * It can control and output a view matrix, and can also control some aspects
 * of a projection matrix.
 *
 * Most of the parameters it controls affect the view matrix, and it can
 * generate a view matrix based on its parameters.
 * It can also control certain parameters that affect the projection matrix,
 * such as field of view. Rather than deal with all the parameters needed for
 * a projection matrix, this class leaves generation of the projection matrix
 * up to the user code, and simply exposes the parameters it has.
 * @constructor
 * @param {!o3djs.math.Vector3} centerPos The position that the camera is
 *     looking at and rotating around; or if backpedal is zero, the location
 *     of the camera. In world space.
 * @param {number} backpedal The distance the camera moves back from the
 *     centerPos.
 * @param {number} areaWidth 
 * @param {number} areaHeight 
 * @param {number} fieldOfViewAngle The vertical angle of the viewing frustum.
 *     In radians, between 0 and PI/2. This does not affect the view matrix,
 *     but it can still be useful to let this class control the field of view.
 * @param {function(!o3djs.cameracontroller.CameraController): void}
 *     opt_onChange Pointer to a callback to call when the camera changes.
 */
o3djs.cameracontroller.CameraController = function(centerPos,
                                                   backpedal,
                                                   areaWidth,
                                                   areaHeight,
                                                   fieldOfViewAngle,
                                                   opt_onChange) {
  /**
   * The position that the camera is looking at and rotating around.
   * Or if backpedal is zero, the location of the camera. In world space.
   * @type {!o3djs.math.Vector3}
   */
  this.centerPos = centerPos;

  /**
   * The distance the camera moves back from the centerPos.
   * @type {number}
   */
  this.backpedal = backpedal;


  /**
   * The vertical angle of the perspective viewing frustum.
   * In radians, between 0 and PI/2. This does not affect the view matrix.
   * The user code can access this value and use it to construct a
   * projection matrix, or it can simply ignore it.
   * @type {number}
   */
  this.fieldOfViewAngle = fieldOfViewAngle;


  /**
   * Points to a callback to call when the camera changes.
   * @type {function(!o3djs.cameracontroller.CameraController): void}
   */
  this.onChange = opt_onChange || null;

  /**
   * The current mouse-drag mode, ie what happens when you move the mouse.
   * @private
   * @type {o3djs.cameracontroller.DragMode}
   */
  this.dragMode_ = o3djs.cameracontroller.DragMode.NONE;

  /**
   * The last X coordinate of the mouse.
   * @private
   * @type {number}
   */
  this.mouseX_ = 0;

  /**
   * The last Y coordinate of the mouse.
   * @private
   * @type {number}
   */
  this.mouseY_ = 0;


  // Some variables to control how quickly the camera changes when you
  // move the mouse a certain distance. Feel free to modify these.
  // Mouse pixels are converted into arbitrary "units" (for lack of
  // a better term), and then "units" are converted into an angle,
  // or a distance, etc as the case may be.

  /**
   * Controls how quickly the mouse moves the camera (in general).
   * Used to convert pixels into "units".
   * @type {number}
   */
  this.pixelsPerUnit = 300.0;

  /**
   * Controls how quickly the mouse affects rotation angles.
   * Used to convert "units" into radians.
   * @type {number}
   */
  this.radiansPerUnit = 1.0;

  /**
   * Controls how quickly the mouse affects camera translation.
   * Used to convert "units" into world space units of distance.
   * @type {number}
   */
  this.distancePerUnit = 10.0;

  /**
   * Controls how quickly the mouse affects zooming.
   * Used to convert "units" into zoom factor.
   * @type {number}
   */
  this.zoomPerUnit = 1.0;

  /**
   * The width of the arcBall area.
   * @private
   * @type {number}
   */
  this.areaWidth_ = areaWidth;

  /**
   * The height of the arcBall area.
   * @private
   * @type {number}
   */
  this.areaHeight_ = areaHeight;

/**
   * The current rotation matrix
   * @private
   * @type {o3djs.math.Matrix4}
   */
  this.thisRot_=g_math.matrix4.identity();

/**
   * The last rotation matrix
   * @private
   * @type {o3djs.math.Matrix4}
   */
  this.lastRot_=g_math.matrix4.identity();
};

/**
 * Sets the size of the arcball.
 * @param {number} areaWidth width of area arcball should cover.
 * @param {number} areaHeight height of area arcball should cover.
 */
o3djs.cameracontroller.CameraController.prototype.setAreaSize = function(areaWidth, areaHeight) {
  this.areaWidth_ = areaWidth;
  this.areaHeight_ = areaHeight;
  var min=Math.min(areaWidth,areaHeight);
  this.distancePerUnit=min/100.0;
  this.pixelsPerUnit=min/5.0;
};

/**
 * Calculates the center point and backpedal which will make the
 * camera view the entire supplied bounding box, assuming a symmetric
 * perspective projection. The heightAngle and rotationAngle are
 * unchanged.
 * @param {!o3d.BoundingBox} The bounding box to enclose in the view
 * volume.
 * @param {number} aspectRatio The aspect ratio of the viewing plane.
 */
o3djs.cameracontroller.CameraController.prototype.viewAll =
  function(boundingBox,
           aspectRatio) {
  // Form a view matrix facing in the correct direction but whose
  // origin is at the center of the bounding box
  var minExtent = boundingBox.minExtent;
  var maxExtent = boundingBox.maxExtent;
  var centerPos = o3djs.math.divVectorScalar(
      o3djs.math.addVector(minExtent, maxExtent), 2.0);
  var viewMatrix = this.calculateViewMatrix_(centerPos, 0);
  var maxBackpedal = 0;
  var vertFOV = this.fieldOfViewAngle;
  var tanVertFOV = Math.tan(vertFOV);
  var horizFOV = Math.atan(aspectRatio * tanVertFOV);
  var tanHorizFOV = Math.tan(horizFOV);
  var extents = [minExtent, maxExtent];
  for (var zi = 0; zi < 2; zi++) {
    for (var yi = 0; yi < 2; yi++) {
      for (var xi = 0; xi < 2; xi++) {
        // Form world space vector of this corner
        var vec = [extents[xi][0], extents[yi][1], extents[zi][2], 1];
        // Transform by the temporary view matrix
        vec = o3djs.math.mulVectorMatrix(vec, viewMatrix);
        // Consider only points on the +z side of the origin
        if (vec[2] >= 0.0) {
          // Figure out the backpedal based on the horizontal and
          // vertical view angles, and the z coordinate of the
          // corner
          maxBackpedal = Math.max(maxBackpedal,
                                  vec[2] + vec[0] / tanHorizFOV);
          maxBackpedal = Math.max(maxBackpedal,
                                  vec[2] + vec[1] / tanVertFOV);
        }
      }
    }
  }
  // Now set up the center point, backpedal and distancePerUnit
  this.centerPos = centerPos;
  this.backpedal = maxBackpedal;
  // This is heuristic based on some experimentation
  this.distancePerUnit = maxBackpedal / 5.0;
};

/**
 * Calculates the view matrix for this camera.
 * @return {!o3djs.math.Matrix4} The view matrix.
 */
o3djs.cameracontroller.CameraController.prototype.calculateViewMatrix =
    function() {
  return this.calculateViewMatrix_(this.centerPos, this.backpedal);
};

/**
 * Calculates the view matrix for this camera given the specified
 * center point and backpedal.
 * @param {!o3djs.math.Vector3} centerPoint Center point for the
 * camera.
 * @param {number} backpedal Backpedal from the center point for the
 * camera.
 */
o3djs.cameracontroller.CameraController.prototype.calculateViewMatrix_ =
    function(centerPoint, backpedal) {
  var matrix4 = o3djs.math.matrix4;
  var view = matrix4.translation(o3djs.math.negativeVector(centerPoint));
  view = matrix4.mul(view, this.thisRot_);
  view = matrix4.mul(view, matrix4.translation([0, 0, -backpedal]));
  return view;
};

/**
 * Change the current mouse-drag mode, ie what happens when you move the mouse.
 * Usually you would set it to something when a mouse button is pressed down,
 * and then set it to NONE when the button is released.
 * @param {o3djs.cameracontroller.DragMode} dragMode The new DragMode.
 * @param {number} x The current mouse X coordinate.
 * @param {number} y The current mouse Y coordinate.
 */
o3djs.cameracontroller.CameraController.prototype.setDragMode =
    function(dragMode, x, y) {
  this.dragMode_ = dragMode;
  this.mouseX_ = x;
  this.mouseY_ = y;
  this.lastRot_ = this.thisRot_;
};

/**
 * Method which should be called by end user code upon receiving a
 * mouse-move event.
 * @param {number} x The new mouse X coordinate.
 * @param {number} y The new mouse Y coordinate.
 */
o3djs.cameracontroller.CameraController.prototype.mouseMoved = function(x, y) {
  var deltaX = (x - this.mouseX_) / this.pixelsPerUnit;
  var deltaY = (y - this.mouseY_) / this.pixelsPerUnit;
  this.mouseX_ = x;
  this.mouseY_ = y;

  if (this.dragMode_ == o3djs.cameracontroller.DragMode.SPIN_ABOUT_CENTER) {
    var rotationAngle = deltaX * this.radiansPerUnit;
    var heightAngle = deltaY * this.radiansPerUnit;

     var matrix4 = o3djs.math.matrix4;
     this.thisRot_ = g_math.matrix4.mul(this.thisRot_, matrix4.rotationX(heightAngle));
     this.thisRot_ = g_math.matrix4.mul(this.thisRot_, matrix4.rotationY(rotationAngle));
  }
  if (this.dragMode_ == o3djs.cameracontroller.DragMode.DOLLY_IN_OUT) {
    this.backpedal += deltaY * this.distancePerUnit;
  }
  if (this.dragMode_ == o3djs.cameracontroller.DragMode.ZOOM_IN_OUT) {
    var width = Math.tan(this.fieldOfViewAngle);
    width *= Math.pow(2, deltaY * this.zoomPerUnit);
    this.fieldOfViewAngle = Math.atan(width);
  }
  if (this.dragMode_ == o3djs.cameracontroller.DragMode.DOLLY_ZOOM) {
    if (this.backpedal > 0) {
      var oldWidth = Math.tan(this.fieldOfViewAngle);
      this.fieldOfViewAngle += deltaY * this.radiansPerUnit;
      this.fieldOfViewAngle = Math.min(this.fieldOfViewAngle, 0.98 * Math.PI/2);
      this.fieldOfViewAngle = Math.max(this.fieldOfViewAngle, 0.02 * Math.PI/2);
      var newWidth = Math.tan(this.fieldOfViewAngle);
      this.backpedal *= oldWidth / newWidth;
    }
  }
  if (this.dragMode_ ==
      o3djs.cameracontroller.DragMode.MOVE_CENTER_IN_VIEW_PLANE) {
    var matrix4 = o3djs.math.matrix4;
    var factor=this.distancePerUnit*this.backpedal/50.0;
    var translationVector = [-deltaX * factor,
                              deltaY * factor, 0];
    var inverseViewMatrix = matrix4.inverse(this.calculateViewMatrix());
    translationVector = matrix4.transformDirection(
        inverseViewMatrix, translationVector);
    this.centerPos = o3djs.math.addVector(this.centerPos, translationVector);
  }

  if (this.onChange != null &&
      this.dragMode_ != o3djs.cameracontroller.DragMode.NONE) {
    this.onChange(this);
  }
};
/*
 * Copyright 2009, Google Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */


/**
 * @fileoverview This file contains various camera utility functions for
 * o3d.  It puts them in the "camera" module on the o3djs object.
 *
 *     Note: This library is only a sample. It is not meant to be some official
 *     library. It is provided only as example code.
 *
 */

o3djs.provide('o3djs.camera');

o3djs.require('o3djs.util');
o3djs.require('o3djs.math');

/**
 * A Module for camera utilites.
 * @namespace
 */
o3djs.camera = o3djs.camera || {};

/**
 * Class to hold Camera information.
 * @constructor
 * @param {!o3djs.math.Matrix4} view The 4-by-4 view matrix.
 * @param {number} zNear near z plane.
 * @param {number} zFar far z plane.
 * @param {!o3djs.math.Vector3} opt_eye The eye position.
 * @param {!o3djs.math.Vector3} opt_target The target position.
 * @param {!o3djs.math.Vector3} opt_up The up vector.
 */
o3djs.camera.CameraInfo = function(view,
                                   zNear,
                                   zFar,
                                   opt_eye,
                                   opt_target,
                                   opt_up) {
  /**
   * View Matrix.
   * @type {!o3djs.math.Matrix4}
   */
  this.view = view;

  /**
   * Projection Matrix.
   * @type {!o3djs.math.Matrix4}
   */
  this.projection = o3djs.math.matrix4.identity();

  /**
   * Projection is orthographic.
   * @type {boolean}
   */
  this.orthographic = false;

  /**
   * Near z plane.
   * @type {number}
   */
  this.zNear = zNear;

  /**
   * Far z plane.
   * @type {number}
   */
  this.zFar = zFar;

  /**
   * Field of view in radians.
   * @type {number}
   */
  this.fieldOfViewRadians = o3djs.math.degToRad(30);

  /**
   * Eye position.
   * @type {(!o3djs.math.Vector3|undefined)}
   */
  this.eye = opt_eye;

  /**
   * Target position.
   * @type {(!o3djs.math.Vector3|undefined)}
   */
  this.target = opt_target;

  /**
   * Up Vector.
   * @type {(!o3djs.math.Vector3|undefined)}
   */
  this.up = opt_up;

  /**
   * horizontal magnification for an orthographic view.
   * @type {(number|undefined)}
   */
  this.magX = undefined;

  /**
   * vertical magnification for an orthographic view.
   * @type {(number|undefined)}
   */
  this.magY = undefined;
};

/**
 * Sets the CameraInfo to an orthographic camera.
 * @param {number} magX horizontal magnification.
 * @param {number} magY vertical magnification.
 */
o3djs.camera.CameraInfo.prototype.setAsOrthographic = function(
    magX, magY) {
  this.orthographic = true
  this.magX = magX;
  this.magY = magY;
};

/**
 * Sets the CameraInfo to an orthographic camera.
 * @param {number} fieldOfView Field of view in radians.
 */
o3djs.camera.CameraInfo.prototype.setAsPerspective = function(
    fieldOfView) {
  this.orthographic = false;
  this.fieldOfViewRadians = fieldOfView;
};

/**
 * Computes a projection matrix for this CameraInfo using the areaWidth
 * and areaHeight passed in.
 *
 * @param {number} areaWidth width of client area.
 * @param {number} areaHeight heigh of client area.
 * @return {!o3djs.math.Matrix4} The computed projection matrix.
 */
o3djs.camera.CameraInfo.prototype.computeProjection = function(
    areaWidth,
    areaHeight) {
  if (this.orthographic) {
    // TODO: figure out if there is a way to make this take the areaWidth
    //     and areaHeight into account. As it is, magX and magY from the
    //     collada file are relative to the aspect ratio of Maya's render
    //     settings which are not available here.
    // var magX = areaWidth * 0.5 / this.magX;
    // var magY = areaHeight * 0.5 / this.magY;
    var magX = /** @type {number} */ (this.magX);
    var magY = /** @type {number} */ (this.magY);
    this.projection = o3djs.math.matrix4.orthographic(
        -magX, magX, -magY, magY, this.zNear, this.zFar);
  } else {
    this.projection = o3djs.math.matrix4.perspective(
        this.fieldOfViewRadians,  // field of view.
        areaWidth / areaHeight,   // Aspect ratio.
        this.zNear,               // Near plane.
        this.zFar);               // Far plane.
  }
  return this.projection;
};

/**
 * Searches for all nodes with a "o3d.tags" ParamString
 * that contains the word "camera" assuming comma separated
 * words.
 * @param {!o3d.Transform} treeRoot Root of tree to search for cameras.
 * @return {!Array.<!o3d.Transform>} Array of camera transforms.
 */
o3djs.camera.findCameras = function(treeRoot) {
  return o3djs.util.getTransformsInTreeByTags(treeRoot, 'camera');
};

/**
 * Creates a object with view and projection matrices using paramters found on
 * the camera 'o3d.projection_near_z', 'o3d.projection_far_z', and
 * 'o3d.perspective_fov_y' as well as the areaWidth and areaHeight passed
 * in.
 * @param {!o3d.Transform} camera Transform with camera information on it.
 * @param {number} areaWidth width of client area.
 * @param {number} areaHeight height of client area.
 * @return {!o3djs.camera.CameraInfo} A CameraInfo object.
 */
o3djs.camera.getViewAndProjectionFromCamera = function(camera,
                                                       areaWidth,
                                                       areaHeight) {
  var fieldOfView = 30;
  var zNear = 1;
  var zFar = 5000;
  var eye = undefined;
  var target = undefined;
  var up = undefined;
  var view;
  var math = o3djs.math;
  var cameraInfo;

  // Check if any LookAt elements were found for the camera and use their
  // values to compute a view matrix.
  var eyeParam = camera.getParam('collada.eyePosition');
  var targetParam = camera.getParam('collada.targetPosition');
  var upParam = camera.getParam('collada.upVector');
  if (eyeParam != null && targetParam != null && upParam != null) {
    eye = eyeParam.value;
    target = targetParam.value;
    up = upParam.value;
    view = math.matrix4.lookAt(eye, target, up);
  } else {
    // Set it to the orientation of the camera.
    view = math.inverse(camera.getUpdatedWorldMatrix());
  }

  var projectionType = camera.getParam('collada.projectionType');
  if (projectionType) {
    zNear = camera.getParam('collada.projectionNearZ').value;
    zFar = camera.getParam('collada.projectionFarZ').value;

    if (projectionType.value == 'orthographic') {
      var magX = camera.getParam('collada.projectionMagX').value;
      var magY = camera.getParam('collada.projectionMagY').value;

      cameraInfo = new o3djs.camera.CameraInfo(view, zNear, zFar);
      cameraInfo.setAsOrthographic(magX, magY);
    } else if (projectionType.value == 'perspective') {
      fieldOfView = camera.getParam('collada.perspectiveFovY').value;
    }
  }

  if (!cameraInfo) {
    cameraInfo = new o3djs.camera.CameraInfo(view, zNear, zFar,
                                                  eye, target, up);
    cameraInfo.setAsPerspective(math.degToRad(fieldOfView));
  }

  cameraInfo.computeProjection(areaWidth, areaHeight);
  return cameraInfo;
};

/**
 * Get CameraInfo that represents a view of the bounding box that encompasses
 * a tree of transforms.
 * @param {!o3d.Transform} treeRoot Root of sub tree to get extents from.
 * @param {number} clientWidth width of client area.
 * @param {number} clientHeight height of client area.
 * @return {!o3djs.camera.CameraInfo} A CameraInfo object.
 */
o3djs.camera.getCameraFitToScene = function(treeRoot,
                                            clientWidth,
                                            clientHeight) {
  var math = o3djs.math;
  var box = o3djs.util.getBoundingBoxOfTree(treeRoot);
  var target = math.lerpVector(box.minExtent, box.maxExtent, 0.5);
  var boxDimensions = math.subVector(box.maxExtent, box.minExtent);
  var diag = o3djs.math.distance(box.minExtent, box.maxExtent);
  var eye = math.addVector(target, [boxDimensions[0] * 0.3,
                                    boxDimensions[1] * 0.7,
                                    diag * 1.5]);
  var nearPlane = diag / 1000;
  var farPlane = diag * 10;

  var up = [0, 1, 0];
  var cameraInfo = new o3djs.camera.CameraInfo(
      math.matrix4.lookAt(eye, target, up),
      nearPlane,
      farPlane);

  cameraInfo.setAsPerspective(math.degToRad(45));
  cameraInfo.computeProjection(clientWidth, clientHeight);
  return cameraInfo;
};

/**
 * Calls findCameras and takes the first camera. Then calls
 * o3djs.camera.getViewAndProjectionFromCamera. If no camera is found it
 * sets up some defaults.
 * @param {!o3d.Transform} treeRoot Root of tree to search for cameras.
 * @param {number} areaWidth Width of client area.
 * @param {number} areaHeight Height of client area.
 * @return {!o3djs.camera.CameraInfo} A CameraInfo object.
 */
o3djs.camera.getViewAndProjectionFromCameras = function(treeRoot,
                                                        areaWidth,
                                                        areaHeight) {
  var cameras = o3djs.camera.findCameras(treeRoot);

  if (cameras.length > 0) {
    return o3djs.camera.getViewAndProjectionFromCamera(cameras[0],
                                                       areaWidth,
                                                       areaHeight);
  } else {
    // There was no camera in the file so make up a hopefully resonable default.
    return o3djs.camera.getCameraFitToScene(treeRoot,
                                            areaWidth,
                                            areaHeight);
  }
};

/**
 * Calls findCameras and creates an array of CameraInfos for each camera found.
 * @param {!o3d.Transform} treeRoot Root of tree to search for cameras.
 * @param {number} areaWidth Width of client area.
 * @param {number} areaHeight Height of client area.
 * @return {!Array.<!o3djs.camera.CameraInfo>} A CameraInfo object.
 */
o3djs.camera.getCameraInfos = function(treeRoot, areaWidth, areaHeight) {
  var cameras = o3djs.camera.findCameras(treeRoot);
  var cameraInfos = [];

  for (var cc = 0; cc < cameras.length; ++cc) {
    cameraInfos.push(o3djs.camera.getViewAndProjectionFromCamera(
        cameras[cc], areaWidth, areaHeight));
  }
  return cameraInfos;
};

/**
 * Sets the view and projection of a DrawContext to view the bounding box
 * that encompasses the tree of transforms passed.
 *
 * This function is here to help debug a program by providing an easy way to
 * attempt to get your content in front of the camera.
 *
 * @param {!o3d.Transform} treeRoot Root of sub tree to get extents from.
 * @param {number} clientWidth width of client area.
 * @param {number} clientHeight height of client area.
 * @param {!o3d.DrawContext} drawContext DrawContext to set view and
 *     projection on.
 */
o3djs.camera.fitContextToScene = function(treeRoot,
                                          clientWidth,
                                          clientHeight,
                                          drawContext) {
  var cameraInfo = o3djs.camera.getCameraFitToScene(treeRoot,
                                                    clientWidth,
                                                    clientHeight);
  drawContext.view = cameraInfo.view;
  drawContext.projection = cameraInfo.projection;
};
/*
 * Copyright 2009, Google Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */


/**
 * @fileoverview This file contains a basic utility library that simplifies the
 * creation of simple 2D Canvas surfaces for the purposes of drawing 2D elements
 * in O3D.
 *
 * Example
 *
 * <pre>
 * &lt;html&gt;&lt;body&gt;
 * &lt;script type="text/javascript" src="o3djs/all.js"&gt;
 * &lt;/script&gt;
 * &lt;script&gt;
 * window.onload = init;
 *
 * function init() {
 *   o3djs.base.makeClients(initStep2);
 * }
 *
 * function initStep2(clientElements) {
 *   var clientElement = clientElements[0];
 *   var client = clientElement.client;
 *   var pack = client.createPack();
 *   var viewInfo = o3djs.rendergraph.createBasicView(
 *       pack,
 *       client.root,
 *       client.renderGraphRoot);
 *
 *   // Create an instance of the canvas utility library.
 *   var canvasLib = o3djs.canvas.create(
 *       pack, client.root, g_viewInfo);
 *
 *   // Create a 700x500 rectangle at (x,y,z) = (4, 10, 0)
 *   var canvasQuad = canvasLib.createXYQuad(4, 10, 0, 700, 500, false);
 *
 *   // Draw into the canvas.
 *   canvasQuad.canvas.clear([1, 0, 0, 1]);
 *   canvasQuad.canvas.drawText('Hello', 0, 10, canvasPaint);
 *   ...
 *   ...
 *
 *   // Update the o3d texture associated with the canvas.
 *   canvasQuad.updateTexture();
 * }
 * &lt;/script&gt;
 * &lt;div id="o3d" style="width: 600px; height: 600px"&gt;&lt;/div&gt;
 * &lt;/body&gt;&lt;/html&gt;
 * </pre>
 *
 */

o3djs.provide('o3djs.canvas');

o3djs.require('o3djs.effect');
o3djs.require('o3djs.primitives');

/**
 * A Module for using a 2d canvas.
 * @namespace
 */
o3djs.canvas = o3djs.canvas || {};

/**
 * Creates an o3djs.canvas library object through which CanvasQuad objects
 * can be created.
 * @param {!o3d.Pack} pack to manage objects created by this library.
 * @param {!o3d.Transform} root Default root for visual objects.
 * @param {!o3djs.rendergraph.ViewInfo} viewInfo A ViewInfo object as
 *  created by o3djs.createView which contains draw lists that the created
 *  quads will be placed into.
 * @return {!o3djs.canvas.CanvasInfo} A CanvasInfo object containing
 *         references to all the common O3D elements used by this instance
 *         of the library.
 */
o3djs.canvas.create = function(pack, root, viewInfo) {
  return new o3djs.canvas.CanvasInfo(pack, root, viewInfo);
};

/**
 * The shader code used by the canvas quads.  It only does two things:
 *   1. Transforms the shape to screen space via the worldViewProjection matrix.
 *   2. Performs a texture lookup to display the contents of the texture
 *      bound to texSampler0.
 * @type {string}
 */
o3djs.canvas.buildShaderString = function() {
  var p = o3djs.effect;
  var varyingDecls = p.BEGIN_OUT_STRUCT +
      p.VARYING + p.FLOAT4 + ' ' +
      p.VARYING_DECLARATION_PREFIX + 'position' +
      p.semanticSuffix('POSITION') + ';\n' +
      p.VARYING + p.FLOAT2 + ' ' +
      p.VARYING_DECLARATION_PREFIX + 'texCoord' +
      p.semanticSuffix('TEXCOORD0') + ';\n' +
      p.END_STRUCT;

  return 'uniform ' + p.MATRIX4 + ' worldViewProjection' +
      p.semanticSuffix('WORLDVIEWPROJECTION') + ';\n\n' +
      p.BEGIN_IN_STRUCT +
      p.ATTRIBUTE + p.FLOAT4 + ' position' +
      p.semanticSuffix('POSITION') + ';\n' +
      p.ATTRIBUTE + p.FLOAT2 + ' texCoord0' +
      p.semanticSuffix('TEXCOORD0') + ';\n' +
      p.END_STRUCT +
      '\n' +
      varyingDecls +
      '\n' +
      p.beginVertexShaderMain() +
      '  ' + p.VERTEX_VARYING_PREFIX + 'position = ' +
      p.mul(p.ATTRIBUTE_PREFIX + 'position',
          'worldViewProjection') + ';\n' +
      '  ' + p.VERTEX_VARYING_PREFIX + 'texCoord = ' +
      p.ATTRIBUTE_PREFIX + 'texCoord0;\n' +
      p.endVertexShaderMain() +
      '\n' +
      p.pixelShaderHeader() +
      'uniform ' + p.SAMPLER + ' texSampler0;\n' +
      p.repeatVaryingDecls(varyingDecls) +
      p.beginPixelShaderMain() +
      p.endPixelShaderMain(p.TEXTURE + '2D' +
          '(texSampler0, ' + p.PIXEL_VARYING_PREFIX + 'texCoord)') +
      p.entryPoints() +
      p.matrixLoadOrder();
};


/**
 * The CanvasInfo object creates and keeps references to the O3D objects
 * that are shared between all CanvasQuad objects created through it.
 * @constructor
 * @param {!o3d.Pack} pack Pack to manage CanvasInfo objects.
 * @param {!o3d.Transform} root Default root for visual objects.
 * @param {!o3djs.rendergraph.ViewInfo} viewInfo A ViewInfo object as
 *     created by o3djs.createView which contains draw lists that the
 *     created quads will be placed into.
 */
o3djs.canvas.CanvasInfo = function(pack, root, viewInfo) {
  /**
   * The pack being used to manage objects created by this CanvasInfo.
   * @type {!o3d.Pack}
   */
  this.pack = pack;

  /**
   * The ViewInfo this CanvasInfo uses for rendering.
   * @type {!o3djs.rendergraph.ViewInfo}
   */
  this.viewInfo = viewInfo;

  /**
   * The default root for objects created by this CanvasInfo.
   * @type {!o3d.Transform}
   */
  this.root = root;

  /**
   * The Effect object shared by all CanvasQuad instances.
   * @type {!o3d.Effect}
   */
  this.effect_ = this.pack.createObject('Effect');
  this.effect_.loadFromFXString(o3djs.canvas.buildShaderString());

  /**
   * Material for canvases with transparent content
   * @type {!o3d.Material}
   */
  this.transparentMaterial_ = this.pack.createObject('Material');

  /**
   * Material for canvases with opaque content.
   * @type {!o3d.Material}
   */
  this.opaqueMaterial_ = this.pack.createObject('Material');

  this.transparentMaterial_.effect = this.effect_;
  this.opaqueMaterial_.effect = this.effect_;

  this.transparentMaterial_.drawList = viewInfo.zOrderedDrawList;
  this.opaqueMaterial_.drawList = viewInfo.performanceDrawList;

  /**
   * State object to handle the transparency blending mode
   * for transparent canvas quads.
   * The canvas bitmap already multiplies the color values by alpha.  In order
   * to avoid a black halo around text drawn on a transparent background we
   * need to set the blending mode as follows.
   * @type {!o3d.State}
   */
  this.transparentState_ = this.pack.createObject('State');
  this.transparentState_.getStateParam('AlphaBlendEnable').value = true;
  this.transparentState_.getStateParam('SourceBlendFunction').value =
      o3djs.base.o3d.State.BLENDFUNC_ONE;
  this.transparentState_.getStateParam('DestinationBlendFunction').value =
      o3djs.base.o3d.State.BLENDFUNC_INVERSE_SOURCE_ALPHA;

  this.transparentMaterial_.state = this.transparentState_;

  // Create 2d plane shapes. createPlane makes an XZ plane by default
  // so we pass in matrix to rotate it to an XY plane. We could do
  // all our manipulations in XZ but most people seem to like XY for 2D.

  /**
   * A shape for transparent quads.
   * @type {!o3d.Shape}
   */
  this.transparentQuadShape = o3djs.primitives.createPlane(
      this.pack,
      this.transparentMaterial_,
      1,
      1,
      1,
      1,
      [[1, 0, 0, 0],
       [0, 0, 1, 0],
       [0, -1, 0, 0],
       [0, 0, 0, 1]]);

  /**
   * A shape for opaque quads.
   * @type {!o3d.Shape}
   */
  this.opaqueQuadShape = o3djs.primitives.createPlane(
      this.pack,
      this.opaqueMaterial_,
      1,
      1,
      1,
      1,
      [[1, 0, 0, 0],
       [0, 0, 1, 0],
       [0, -1, 0, 0],
       [0, 0, 0, 1]]);
};
/**
 * The CanvasQuad object encapsulates a Transform, a rectangle Shape,
 * an effect that applies a texture to render the quad, and a matching Canvas
 * object that can render into the texture.  The dimensions of the texture and
 * the canvas object match those of the quad in order to get pixel-accurate
 * results with the appropriate orthographic projection.
 * The resulting rectangle Shape is positioned at the origin.  It can be moved
 * around by setting the localMatrix on the Transform object referenced to by
 * the canvasQuad.transform property.
 * The Canvas associated with the returned CanvasQuad object can be retrieved
 * from the object's 'canvas' property.  After issuing any draw commands on the
 * Canvas, you need to call the updateTexture() method on the CanvasQuad to
 * update the contents of the quad surface.
 * @constructor
 * @param {!o3djs.canvas.CanvasInfo} canvasInfo The CanvasInfo object
 *     instance creating this CanvasQuad.
 * @param {number} width The width of the quad.
 * @param {number} height The height of the quad.
 * @param {boolean} transparent Set to true if the canvas will
 *     be transparent so that the appropriate blending modes are set.
 * @param {!o3d.Transform} opt_parent parent transform to parent
 *     the newly created quad under. If no parent transform is provided then
 *     the quad gets parented under the CanvasInfo's root.
 */
o3djs.canvas.CanvasQuad = function(canvasInfo,
                                   width,
                                   height,
                                   transparent,
                                   opt_parent) {
  /**
   * The CanvasInfo managing this CanvasQuad
   * @type {!o3djs.canvas.CanvasInfo}
   */
  this.canvasInfo = canvasInfo;
  var parentTransform = opt_parent || canvasInfo.root;

  // create a transform for positioning

  /**
   * A transform for this quad.
   * @type {!o3d.Transform}
   */
  this.transform = canvasInfo.pack.createObject('Transform');
  this.transform.parent = parentTransform;

  // create a transform for scaling to the size of the image just so
  // we don't have to manage that manually in the transform above.

  /**
   * A scale transform for this quad.
   * You can change the scale the quad without effecting its positon using
   * this transform.
   * @type {!o3d.Transform}
   */
  this.scaleTransform = canvasInfo.pack.createObject('Transform');
  this.scaleTransform.parent = this.transform;

  /**
   * The texture the canvas will draw on.
   * @type {!o3d.Texture2D}
   */
  this.texture = /** @type {!o3d.Texture2D} */ (canvasInfo.pack.createTexture2D(
      width,
      height,
      o3djs.base.o3d.Texture.ARGB8,
      1, // mipmap levels
      false));

  // Create a Canvas object to go with the quad.

  /**
   * The Canvas object used to draw on this quad.
   * @type {!o3d.Canvas}
   */
  this.canvas = canvasInfo.pack.createObject('Canvas');
  this.canvas.setSize(width, height);

  /**
   * The sampler for the texture.
   * @type {!o3d.Sampler}
   */
  this.sampler = canvasInfo.pack.createObject('Sampler');
  this.sampler.addressModeU = o3djs.base.o3d.Sampler.CLAMP;
  this.sampler.addressModeV = o3djs.base.o3d.Sampler.CLAMP;

  /**
   * The param sampler for this transform.
   * @private
   * @type {!o3d.ParamSampler}
   */
  this.paramSampler_ = this.scaleTransform.createParam('texSampler0',
                                                       'ParamSampler');
  this.paramSampler_.value = this.sampler;

  this.sampler.texture = this.texture;
  if (transparent) {
    this.scaleTransform.addShape(canvasInfo.transparentQuadShape);
  } else {
    this.scaleTransform.addShape(canvasInfo.opaqueQuadShape);
  }
  this.scaleTransform.translate(width / 2, height / 2, 0);
  this.scaleTransform.scale(width, -height, 1);
};

/**
 * Copies the current contents of the Canvas object to the texture associated
 * with the quad.  This method should be called after any new draw calls have
 * been issued to the CanvasQuad's Canvas object.
 */
o3djs.canvas.CanvasQuad.prototype.updateTexture = function() {
  var width = this.texture.width;
  var height = this.texture.height;
  this.texture.drawImage(this.canvas, 0, height - 1, width, -height,
                         0, 0, 0, width, height);
};

/**
 * Creates a CanvasQuad object on the XY plane at the specified position.
 * @param {number} topX The x coordinate of the top left corner of the quad.
 * @param {number} topY The y coordinate of the top left corner of the quad.
 * @param {number} z The z coordinate of the quad.  z values are negative
 *     numbers, the smaller the number the further back the quad will be.
 * @param {number} width The width of the quad.
 * @param {number} height The height of the quad.
 * @param {boolean} transparent Set to true if the canvas bitmap uses
 *     transparency so that the appropriate blending modes are set.
 * @param {!o3d.Transform} opt_parent parent transform to parent the newly
 *     created quad under.  If no parent transform is provided then the quad
 *     gets parented under the CanvasInfo's root.
 * @return {!o3djs.canvas.CanvasQuad} The newly created CanvasQuad object.
 */
o3djs.canvas.CanvasInfo.prototype.createXYQuad = function(topX,
                                                          topY,
                                                          z,
                                                          width,
                                                          height,
                                                          transparent,
                                                          opt_parent) {
  var canvasQuad = new o3djs.canvas.CanvasQuad(this,
                                               width,
                                               height,
                                               transparent,
                                               opt_parent);

  canvasQuad.transform.translate(topX, topY, z);
  return canvasQuad;
};

/**
 * Creates a CanvasQuad object of the given size. The resulting rectangle Shape
 * is centered at the origin.  It can be moved around by setting the
 * localMatrix on the Transform object referenced to by the canvasQuad.transform
 * property.
 * @param {number} width The width of the quad.
 * @param {number} height The height of the quad.
 * @param {boolean} transparent Set to true if the canvas bitmap uses
 *     transparency so that the appropriate blending modes are set.
 * @param {!o3d.Transform} opt_parent parent transform to parent the newly
 *     created quad under.  If no parent transform is provided then the quad
 *     gets parented under the CanvasInfo's root.
 * @return {!o3djs.canvas.CanvasQuad} The newly created CanvasQuad object.
 */
o3djs.canvas.CanvasInfo.prototype.createQuad = function(width,
                                                        height,
                                                        transparent,
                                                        opt_parent) {
  return new o3djs.canvas.CanvasQuad(this,
                                     width,
                                     height,
                                     transparent,
                                     opt_parent);
};


/*
 * Copyright 2009, Google Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */


/**
 * @fileoverview This file contains various dumping functions for o3d.  It
 * puts them in the "dump" module on the o3djs object.
 *
 *     Note: This library is only a sample. It is not meant to be some official
 *     library. It is provided only as example code.
 *
 */

o3djs.provide('o3djs.dump');

/**
 * A Module for dumping information about o3d objects.
 * @namespace
 */
o3djs.dump = o3djs.dump || {};

/**
 * Dump the 3 elements of an array of numbers.
 * @private
 * @param {string} label Label to put in front of dump.
 * @param {!Array.<number>} object Array.
 * @param {string} opt_prefix Optional prefix for indenting.
 */
o3djs.dump.dumpXYZ_ = function(label, object, opt_prefix) {
  opt_prefix = opt_prefix || '';
  o3djs.dump.dump(opt_prefix + label + ' : ' + object[0] + ', ' +
                  object[1] + ', ' + object[2] + '\n');
};

/**
 * Dump the 4 elements of an array of numbers.
 * @private
 * @param {string} label Label to put in front of dump.
 * @param {!Array.<number>} object Array.
 * @param {string} opt_prefix Optional prefix for indenting.
 */
o3djs.dump.dumpXYZW_ = function(label, object, opt_prefix) {
  opt_prefix = opt_prefix || '';
  o3djs.dump.dump(opt_prefix + label + ' : ' +
                  object[0] + ', ' +
                  object[1] + ', ' +
                  object[2] + ', ' +
                  object[3] + '\n');
};

/**
 * Get the name of a function.
 * @private
 * @param {!function(...): *} theFunction Function.
 * @return {string} The function name.
 */
o3djs.dump.getFunctionName_ = function(theFunction) {
  if (theFunction.name) {
    return theFunction.name;
  }

  // try to parse the function name from the definition
  var definition = theFunction.toString();
  var name = definition.substring(definition.indexOf('function') + 8,
                                  definition.indexOf('('));
  if (name) {
    return name;
  }

  // sometimes there won't be a function name
  // like for dynamic functions
  return '*anonymous*';
};

/**
 * Get the signature of a function.
 * @private
 * @param {!function(...): *} theFunction Function.
 * @return {string} The function signature.
 */
o3djs.dump.getSignature_ = function(theFunction) {
  var signature = o3djs.dump.getFunctionName_(theFunction);
  signature += '(';
  for (var x = 0; x < theFunction.arguments.length; x++) {
    // trim long arguments
    var nextArgument = theFunction.arguments[x];
    if (nextArgument.length > 30) {
      nextArgument = nextArgument.substring(0, 30) + '...';
    }

    // apend the next argument to the signature
    signature += "'" + nextArgument + "'";

    // comma separator
    if (x < theFunction.arguments.length - 1) {
      signature += ', ';
    }
  }
  signature += ')';
  return signature;
};

/**
 * Prints a value the console or log or wherever it thinks is appropriate
 * for debugging.
 * @param {string} string String to print.
 */
o3djs.dump.dump = function(string) {
  o3djs.BROWSER_ONLY = true;
  if (window.dump) {
    window.dump(string);
  } else if (window.console && window.console.log) {
    window.console.log(string);
  }
};

/**
 * Gets the value of a matrix as a string.
 * @param {!o3djs.math.Matrix4} matrix Matrix4 to get value of.
 * @param {string} opt_prefix Optional prefix for indenting.
 * @return {string} Value of param.
 */
o3djs.dump.getMatrixAsString = function(matrix, opt_prefix) {
  opt_prefix = opt_prefix || '';
  var result = opt_prefix + '[';
  for (var i = 0; 1; ++i){
    var mi = matrix[i];
    result += '[';
    for (var j = 0; 1; ++j) {
      result += mi[j];
      if (j < mi.length - 1) {
        result += ', ';
      } else {
        result += ']';
        break;
      }
    }
    if (i < matrix.length - 1) {
      result += '\n';
      result += opt_prefix;
    } else {
      break;
    }
  }
  result += ']';
  return result;
};

/**
 * Dumps a float3
 * @param {string} label Label to put in front of dump.
 * @param {!o3d.Float3} float3 Float3 to dump.
 * @param {string} opt_prefix optional prefix for indenting.
 */
o3djs.dump.dumpFloat3 = function(label, float3, opt_prefix) {
  opt_prefix = opt_prefix || '';
  o3djs.dump.dumpXYZ_(label, float3, opt_prefix);
};

/**
 * Dumps a float4
 * @param {string} label Label to put in front of dump.
 * @param {!o3d.Float4} float4 Float4 to dump.
 * @param {string} opt_prefix optional prefix for indenting.
 */
o3djs.dump.dumpFloat4 = function(label, float4, opt_prefix) {
  opt_prefix = opt_prefix || '';
  o3djs.dump.dumpXYZW_(label, float4, opt_prefix);
};

/**
 * Dumps a vector4
 * @param {string} label Label to put in front of dump.
 * @param {!Array.<number>} vector4 vector to dump.
 * @param {string} opt_prefix optional prefix for indenting.
 */
o3djs.dump.dumpVector4 = function(label, vector4, opt_prefix) {
  opt_prefix = opt_prefix || '';
  o3djs.dump.dumpXYZW_(label, vector4, opt_prefix);
};

/**
 * Dumps a matrix
 * @param {string} label Label to put in front of dump.
 * @param {!o3djs.math.Matrix4} matrix Matrix to dump.
 * @param {string} opt_prefix optional prefix for indenting.
 */
o3djs.dump.dumpMatrix = function(label, matrix, opt_prefix) {
  opt_prefix = opt_prefix || '';
  o3djs.dump.dump(
      opt_prefix + label + ' :\n' +
      o3djs.dump.getMatrixAsString(matrix, opt_prefix + '    ') +
      '\n');
};

/**
 * Dump a bounding box.
 * @param {string} label Label to put in front of dump.
 * @param {!o3d.BoundingBox} boundingBox BoundingBox to dump.
 * @param {string} opt_prefix optional prefix for indenting.
 */
o3djs.dump.dumpBoundingBox = function(label,
                                      boundingBox,
                                      opt_prefix) {
  opt_prefix = opt_prefix || '';
  o3djs.dump.dump(opt_prefix + label + ' :\n');
  o3djs.dump.dumpFloat3('min : ',
                        boundingBox.minExtent,
                        opt_prefix + '    ');
  o3djs.dump.dumpFloat3('max : ',
                        boundingBox.maxExtent,
                        opt_prefix + '    ');
};

/**
 * Gets the value of a parameter as a string.
 * @param {!o3d.Param} param Parameter to get value of.
 * @param {string} opt_prefix Optional prefix for indenting.
 * @return {string} Value of param.
 */
o3djs.dump.getParamValueAsString = function(param, opt_prefix) {
  opt_prefix = opt_prefix || '';
  var value = '*unknown*';

  if (param.isAClassName('o3d.ParamFloat')) {
    value = param.value.toString();
  } else if (param.isAClassName('o3d.ParamFloat2')) {
    value = '[' + param.value[0] + ', ' +
                  param.value[1] + ']';
  } else if (param.isAClassName('o3d.ParamFloat3')) {
    value = '[' + param.value[0] + ', ' +
                  param.value[1] + ', ' +
                  param.value[2] + ']';
  } else if (param.isAClassName('o3d.ParamFloat4')) {
    value = '[' + param.value[0] + ', ' +
                  param.value[1] + ', ' +
                  param.value[2] + ', ' +
                  param.value[3] + ']';
  } else if (param.isAClassName('o3d.ParamInteger')) {
    value = param.value.toString();
  } else if (param.isAClassName('o3d.ParamBoolean')) {
    value = param.value.toString();
  } else if (param.isAClassName('o3d.ParamMatrix4')) {
    value = '\n' + o3djs.dump.getMatrixAsString(param.value,
                                                opt_prefix + '    ');
  } else if (param.isAClassName('o3d.ParamString')) {
    value = param.value;
  } else if (param.isAClassName('o3d.ParamTexture')) {
    value = param.value;
    value = 'texture : "' + (value ? value.name : 'NULL') + '"';
  } else if (param.isAClassName('o3d.ParamSampler')) {
    value = param.value;
    value = 'sampler : "' + (value ? value.name : 'NULL') + '"';
  } else if (param.isAClassName('o3d.ParamMaterial')) {
    value = param.value;
    value = 'material : "' + (value ? value.name : 'NULL') + '"';
  } else if (param.isAClassName('o3d.ParamEffect')) {
    value = param.value;
    value = 'effect : "' + (value ? value.name : 'NULL') + '"';
  } else if (param.isAClassName('o3d.ParamState')) {
    value = param.value;
    value = 'state : "' + (value ? value.name : 'NULL') + '"';
  } else if (param.isAClassName('o3d.ParamTransform')) {
    value = param.value;
    value = 'transform : "' + (value ? value.name : 'NULL') + '"';
  } else if (param.isAClassName('o3d.ParamDrawList')) {
    value = param.value;
    value = 'drawlist : "' + (value ? value.name : 'NULL') + '"';
  } else if (param.isAClassName('o3d.ParamRenderSurface')) {
    value = param.value;
    value = 'renderSurface : "' + (value ? value.name : 'NULL') + '"';
  } else if (param.isAClassName('o3d.ParamRenderDepthStencilSurface')) {
    value = param.value;
    value = 'renderDepthStencilSurface: "' + (value ? value.name : 'NULL') +
            '"';
  } else if (param.isAClassName('o3d.ParamDrawContext')) {
    value = param.value;
    value = 'drawcontext : "' + (value ? value.name : 'NULL') + '"';
  }

  return value;
};

/**
 * Dumps an single parameter
 * @param {!o3d.Param} param Param to dump.
 * @param {string} opt_prefix Optional prefix for indenting.
 */
o3djs.dump.dumpParam = function(param, opt_prefix) {
  opt_prefix = opt_prefix || '';
  o3djs.dump.dump (
      opt_prefix + param.className + ' : "' + param.name + '" : ' +
      o3djs.dump.getParamValueAsString(param, opt_prefix) + '\n');
};

/**
 * Given a ParamObject dumps all the Params on it.
 * @param {!o3d.ParamObject} param_object ParamObject to dump Params of.
 * @param {string} opt_prefix Optional prefix for indenting.
 */
o3djs.dump.dumpParams = function(param_object, opt_prefix) {
  opt_prefix = opt_prefix || '';
  // print params
  var params = param_object.params;
  for (var p = 0; p < params.length; p++) {
    o3djs.dump.dumpParam(params[p], opt_prefix);
  }
};

/**
 * Given a ParamObject dumps it and all the Params on it.
 * @param {!o3d.ParamObject} param_object ParamObject to dump.
 * @param {string} opt_prefix Optional prefix for indenting.
 */
o3djs.dump.dumpParamObject = function(param_object, opt_prefix) {
  opt_prefix = opt_prefix || '';
  o3djs.dump.dump (
      opt_prefix + param_object.className + ' : "' +
      param_object.name + '"\n');
  o3djs.dump.dumpParams(param_object, opt_prefix + '    ');
};

/**
 * Given a Stream dumps it and all the Params on it.
 * @param {!o3d.Stream} stream Stream to dump.
 * @param {string} opt_prefix Optional prefix for indenting.
 */
o3djs.dump.dumpStream = function(stream, opt_prefix) {
  opt_prefix = opt_prefix || '';
  o3djs.dump.dump(
      opt_prefix + 'semantic: ' + stream.semantic +
      ', index: ' + stream.semanticIndex +
      ', dataType: ' + stream.dataType +
      ', field: ' + stream.field.name + '\n');
};

/**
 * Given a element dumps its name, all the Params and DrawElements on
 * it.
 * @param {!o3d.Element} element Element to dump.
 * @param {string} opt_prefix Optional prefix for indenting.
 */
o3djs.dump.dumpElement = function(element, opt_prefix) {
  opt_prefix = opt_prefix || '';

  o3djs.dump.dump (opt_prefix + '------------ Element --------------\n');

  // get type
  o3djs.dump.dump (
      opt_prefix + 'Element: "' + element.name + '"\n');

  // print params
  o3djs.dump.dump (opt_prefix + '  --Params--\n');
  o3djs.dump.dumpParams (element, opt_prefix + '  ');

  // print elements.
  o3djs.dump.dump (opt_prefix + '  --DrawElements--\n');
  var drawElements = element.drawElements;
  for (var g = 0; g < drawElements.length; g++) {
    var drawElement = drawElements[g]
    o3djs.dump.dumpParamObject(drawElement, opt_prefix + '    ');
  }

  if (element.isAClassName('o3d.Primitive')) {
    o3djs.dump.dump (
        opt_prefix + '  primitive type: ' + element.primitiveType + '\n');
    o3djs.dump.dump (
        opt_prefix + '  number vertices: ' + element.numberVertices + '\n');
    o3djs.dump.dump (
        opt_prefix + '  number primitives: ' + element.numberPrimitives +
        '\n');
    var streamBank = element.streamBank;
    if (streamBank) {
      var streams = streamBank.vertexStreams;
      for (var ss = 0; ss < streams.length; ss++) {
        var stream = streams[ss];
        o3djs.dump.dump(opt_prefix + '  stream ' + ss + ': ');
        o3djs.dump.dumpStream(stream);
      }
    }
  }
};

/**
 * Given a shape dumps its name, all the Params and Primitves on
 * it.
 * @param {!o3d.Shape} shape Shape to dump.
 * @param {string} opt_prefix Optional prefix for indenting.
 */
o3djs.dump.dumpShape = function(shape, opt_prefix) {
  opt_prefix = opt_prefix || '';

  o3djs.dump.dump (opt_prefix + '------------ Shape --------------\n');

  // get type
  o3djs.dump.dump (
      opt_prefix + 'Shape: "' + shape.name + '"\n');

  // print params
  o3djs.dump.dump (opt_prefix + '  --Params--\n');
  o3djs.dump.dumpParams (shape, opt_prefix + '  ');

  // print elements.
  o3djs.dump.dump (opt_prefix + '  --Elements--\n');
  var elements = shape.elements;
  for (var p = 0; p < elements.length; p++) {
    var element = elements[p];
    o3djs.dump.dumpElement(element, opt_prefix + '    ');
  }
};

/**
 * Given a texture dumps its name and other info.
 * it.
 * @param {!o3d.Texture} texture Texture to dump.
 * @param {string} opt_prefix Optional prefix for indenting.
 */
o3djs.dump.dumpTexture = function(texture, opt_prefix) {
  opt_prefix = opt_prefix || '';
  var uri = '';
  var param = texture.getParam('uri');
  if (param) {
    uri = param.value;
  }
  o3djs.dump.dump (
      opt_prefix + texture.className +
      ' : "' + texture.name +
      '" uri : "' + uri +
      '" width: ' + texture.width +
      ' height: ' + texture.height +
      ' alphaIsOne: ' + texture.alphaIsOne +
      '\n');
};

/**
 * Given a transform dumps its name and all the Params and Shapes on it.
 * @param {!o3d.Transform} transform Transform to dump.
 * @param {string} opt_prefix Optional prefix for indenting.
 */
o3djs.dump.dumpTransform = function(transform, opt_prefix) {
  opt_prefix = opt_prefix || '';

  o3djs.dump.dump (opt_prefix + '----------- Transform -------------\n');

  // get type
  o3djs.dump.dump (
      opt_prefix + 'Transform: ' + transform.name + '"\n');

  // print params
  o3djs.dump.dump (opt_prefix + '  --Local Matrix--\n');
  o3djs.dump.dump (
      o3djs.dump.getMatrixAsString(transform.localMatrix,
                                   opt_prefix + '    ') + '\n');

  // print params
  o3djs.dump.dump (opt_prefix + '  --Params--\n');
  o3djs.dump.dumpParams (transform, opt_prefix + '  ');

  // print shapes.
  o3djs.dump.dump (opt_prefix + '  --Shapes--\n');
  var shapes = transform.shapes;
  for (var s = 0; s < shapes.length; s++) {
    var shape = shapes[s];
    o3djs.dump.dumpNamedObjectName(shape, opt_prefix + '  ');
  }
};

/**
 * Dumps an entire transform graph tree.
 * @param {!o3d.Transform} transform Transform to start dumping from.
 * @param {string} opt_prefix Optional prefix for indenting.
 */
o3djs.dump.dumpTransformTree = function(transform, opt_prefix) {
  opt_prefix = opt_prefix || '';

  o3djs.dump.dumpTransform(transform, opt_prefix);

  var child_prefix = opt_prefix + '    ';
  var children = transform.children;
  for (var c = 0; c < children.length; c++) {
    o3djs.dump.dumpTransformTree(children[c], child_prefix);
  }
};

/**
 * Dumps a list of Transforms.
 * @param {!Array.<!o3d.Transform>} transform_list Array of Transforms to dump.
 */
o3djs.dump.dumpTransformList = function(transform_list) {
  o3djs.dump.dump (transform_list.length + ' transforms in list!!!\n');
  for (var i = 0; i < transform_list.length; i++) {
    o3djs.dump.dumpTransform(transform_list[i]);
  }
};

/**
 * Dumps the name and class of a NamedObject.
 * @param {!o3d.NamedObject} namedObject to use.
 * @param {string} opt_prefix Optional prefix for indenting.
 */
o3djs.dump.dumpNamedObjectName = function(namedObject, opt_prefix) {
  opt_prefix = opt_prefix || '';
  o3djs.dump.dump (
      opt_prefix + namedObject.className + ' : "' + namedObject.name +
      '"\n');
};

/**
 * Dumps a RenderNode and all its paramaters.
 * @param {!o3d.RenderNode} render_node RenderNode to use.
 * @param {string} opt_prefix Optional prefix for indenting.
 */
o3djs.dump.dumpRenderNode = function(render_node, opt_prefix) {
  opt_prefix = opt_prefix || '';

  o3djs.dump.dump (opt_prefix + '----------- Render Node -----------\n');
  // get type
  o3djs.dump.dumpNamedObjectName(render_node, opt_prefix);

  // print params
  o3djs.dump.dump (opt_prefix + '  --Params--\n');
  o3djs.dump.dumpParams(render_node, opt_prefix + '  ');
};

/**
 * Dumps an entire RenderGraph tree.
 * @param {!o3d.RenderNode} render_node RenderNode to start dumping from.
 * @param {string} opt_prefix Optional prefix for indenting.
 */
o3djs.dump.dumpRenderNodeTree = function(render_node, opt_prefix) {
  opt_prefix = opt_prefix || '';

  o3djs.dump.dumpRenderNode(render_node, opt_prefix);

  var child_prefix = opt_prefix + '    ';
  // Get the list of children sorted by priority.
  var children = render_node.children.sort(function(a, b) {
        return a.priority - b.priority;
      });
  for (var c = 0; c < children.length; c++) {
    o3djs.dump.dumpRenderNodeTree(children[c], child_prefix);
  }
};

/**
 * Dumps a javascript stack track.
 */
o3djs.dump.dumpStackTrace = function() {
  o3djs.dump.dump('Stack trace:\n');
  var nextCaller = arguments.callee.caller;
  while (nextCaller) {
    o3djs.dump.dump(o3djs.dump.getSignature_(nextCaller) + '\n');
    nextCaller = nextCaller.caller;
  }
  o3djs.dump.dump('\n\n');
};

/*
 * Copyright 2009, Google Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */


/**
 * @fileoverview This file contains various functions related to effects.
 * It puts them in the "effect" module on the o3djs object.
 *
 *     Note: This library is only a sample. It is not meant to be some official
 *     library. It is provided only as example code.
 *
 */

o3djs.provide('o3djs.effect');

o3djs.require('o3djs.io');

/**
 * A Module for dealing with effects.
 * @namespace
 */
o3djs.effect = o3djs.effect || {};

/**
 * The name of standard 2 color checker effect.
 * @type {string}
 */
o3djs.effect.TWO_COLOR_CHECKER_EFFECT_NAME =
    'o3djs.effect.twoColorCheckerEffect';


/**
 * An object containing string constants and functions which are specific to
 * the o3d shading language.  When setLanguage gets called the properties of
 * this object get coppied into the o3djs.effect namespace and then get used
 * in shader generation code.
 * @namespace
 */
o3djs.effect.o3d = {
  LANGUAGE: 'o3d',
  FLOAT2: 'float2',
  FLOAT3: 'float3',
  FLOAT4: 'float4',
  MATRIX4: 'float4x4',
  MATRIX3: 'float3x3',
  MOD: 'fmod',
  ATTRIBUTE: '  ',
  ATTRIBUTE_PREFIX: 'input.',
  VARYING: '  ',
  VARYING_DECLARATION_PREFIX: '',
  VERTEX_VARYING_PREFIX: 'output.',
  PIXEL_VARYING_PREFIX: 'input.',
  TEXTURE: 'tex',
  SAMPLER: 'sampler',
  BEGIN_IN_STRUCT: 'struct InVertex {\n',
  BEGIN_OUT_STRUCT: 'struct OutVertex {\n',
  END_STRUCT: '};\n'
};


/**
 * An object containing string constants and functions which are specific to
 * the o3d shading language.  When setLanguage gets called the properties of
 * this object get coppied into the o3djs.effect namespace and then get used
 * in shader generation code.
 * @namespace
 */
o3djs.effect.glsl = {
    LANGUAGE: 'glsl',
    FLOAT2: 'vec2',
    FLOAT3: 'vec3',
    FLOAT4: 'vec4',
    MATRIX4: 'mat4',
    MATRIX3: 'mat3',
    MOD: 'mod',
    ATTRIBUTE: 'attribute ',
    ATTRIBUTE_PREFIX: '',
    VARYING: 'varying ',
    VARYING_DECLARATION_PREFIX: 'v_',
    VERTEX_VARYING_PREFIX: 'v_',
    PIXEL_VARYING_PREFIX: 'v_',
    TEXTURE: 'texture',
    SAMPLER: 'sampler2D',
    BEGIN_IN_STRUCT: '',
    BEGIN_OUT_STRUCT: '',
    END_STRUCT: '',
    // Only used in GLSL version of getAttributeName_.
    semanticNameMap: {
      'POSITION'  : 'position',
      'NORMAL'    : 'normal',
      'TANGENT'   : 'tangent',
      'BINORMAL'  : 'binormal',
      'COLOR'     : 'color',
      'TEXCOORD0' : 'texCoord0',
      'TEXCOORD1' : 'texCoord1',
      'TEXCOORD2' : 'texCoord2',
      'TEXCOORD3' : 'texCoord3',
      'TEXCOORD4' : 'texCoord4',
      'TEXCOORD5' : 'texCoord5',
      'TEXCOORD6' : 'texCoord6',
      'TEXCOORD7' : 'texCoord7'
    }
};


/**
 * The string that goes between the stream name and the semicolon to indicate
 * the semantic.
 * @param {string} name Name of the semantic.
 * @return {string}
 */
o3djs.effect.glsl.semanticSuffix = function(name) {
  return '';
};


/**
 * The string that goes between the stream name and the semicolon to indicate
 * the semantic.
 * @param {string} name Name of the semantic.
 * @return {string}
 */
o3djs.effect.o3d.semanticSuffix = function(name) {
  return ' : ' + name;
};


/**
 * Attribute variables in GLSL need to be named by their semantic in
 * order for the implementation to hook them up correctly.
 * @private
 */
o3djs.effect.glsl.getAttributeName_ = function(name, semantic) {
  var p = o3djs.effect;
  return p.semanticNameMap[semantic];
};


/**
 * This passes through the name in the Cg implementation.
 * @private
 */
o3djs.effect.o3d.getAttributeName_ = function(name, semantic) {
  return name;
};


/**
 * Generates code to multiply two things.
 * @param {string} a One multiplicand.
 * @param {string} b The other multiplicand.
 * @return {string}
 */
o3djs.effect.glsl.mul = function(a, b) {
  return '(' + b + ' * ' + a + ')';
};


/**
 * Generates code to multiply two things.
 * @param {string} a One multiplicand.
 * @param {string} b The other multiplicand.
 * @return {string}
 */
o3djs.effect.o3d.mul = function(a, b) {
  return 'mul(' + a + ', ' + b + ')';
};


/**
 * Generates code for some utility functions
 * (functions defined in cg but not glsl).
 * @return {string} The code for the utility functions.
 */
o3djs.effect.glsl.utilityFunctions = function() {
  return 'vec4 lit(float l ,float h, float m) {\n' +
         '  return vec4(1.0,\n' +
         '              max(l, 0.0),\n' +
         '              (l > 0.0) ? pow(max(0.0, h), m) : 0.0,\n' +
         '              1.0);\n' +
         '}\n';
};


/**
 * Generates code for some utility functions
 * (functions defined in cg but not glsl).
 * @return {string} The code for the utility functions.
 */
o3djs.effect.o3d.utilityFunctions = function() {
  return '';
}


/**
 * The string that starts the vertex shader main function.
 * @return {string} The effect code for the start of the main.
 */
o3djs.effect.glsl.beginVertexShaderMain = function() {
    return 'void main() {\n';
};

/**
 * The string that starts the vertex shader main function.
 * @return {string} The effect code for the start of the main.
 */
o3djs.effect.o3d.beginVertexShaderMain = function() {
  return 'OutVertex vertexShaderFunction(InVertex input) {\n' +
         '  OutVertex output;\n';
};

/**
 * The string that ends the vertex main function.
 * @return {string}
 */
o3djs.effect.glsl.endVertexShaderMain = function() {
  return '  gl_Position = ' + o3djs.effect.VERTEX_VARYING_PREFIX +
      'position;\n}\n';
};

/**
 * The string that ends the vertex main function.
 * @return {string}
 */
o3djs.effect.o3d.endVertexShaderMain = function() {
  return '  return output;\n}\n';
};


/**
 * The string that goes infront of the pixel shader main.
 * @param {!o3d.Material} material The material to inspect.
 * @param {boolean} diffuse Whether to include stuff for diffuse calculations.
 * @param {boolean} specular Whether to include stuff for diffuse
 *     calculations.
 * @param {boolean} bumpSampler Whether there is a bump sampler.
 * @return {string} The header.
 */
o3djs.effect.glsl.pixelShaderHeader =
    function(material, diffuse, specular, bumpSampler) {
  return '\n// #o3d SplitMarker\n';
};


/**
 * The string that goes infront of the pixel shader main.
 * @param {!o3d.Material} material The material to inspect.
 * @param {boolean} diffuse Whether to include stuff for diffuse calculations.
 * @param {boolean} specular Whether to include stuff for diffuse
 *     calculations.
 * @param {boolean} bumpSampler Whether there is a bump sampler.
 * @return {string} The header.
 */
o3djs.effect.o3d.pixelShaderHeader =
    function(material, diffuse, specular, bumpSampler) {
  return '';
};


/**
 * Repeats the declarations for the varying parameters if necessary.
 * @param {string} opt_decls The declarations if you know them already.
 * @return {string} Code for the parameter declarations.
 */
o3djs.effect.glsl.repeatVaryingDecls = function(opt_decls) {
  return (opt_decls ||
          o3djs.effect.varying_decls_ ||
          o3djs.buildVaryingDecls()) +
      '\n';
};

/**
 * Repeats the declarations for the varying parameters if necessary.
 * @param {string} opt_decls The declarations if you know them already.
 * @return {string} Code for the parameter declarations.
 */
o3djs.effect.o3d.repeatVaryingDecls = function(opt_decls) {
  return '';
};


/**
 * The string that goes infront of the pixel shader main.
 * @return {string} The effect code for the start of the main.
 */
o3djs.effect.glsl.beginPixelShaderMain = function() {
  return 'void main() {\n';
};


/**
 * The string that goes infront of the pixel shader main.
 * @return {string} The effect code for the start of the main.
 */
o3djs.effect.o3d.beginPixelShaderMain = function() {
  return 'float4 pixelShaderFunction(OutVertex input) : COLOR {\n';
};


/**
 * The string that goes at the end of the pixel shader main.
 * @param {string} color The code for the color to return.
 * @return {string} The effect code for the end of the main.
 */
o3djs.effect.o3d.endPixelShaderMain = function(color) {
  return '  return ' + color + ';\n}\n';
};


/**
 * The string that goes at the end of the pixel shader main.
 * @param {string} color The code for the color to return.
 * @return {string} The effect code for the end of the main.
 */
o3djs.effect.glsl.endPixelShaderMain = function(color) {
  return '  gl_FragColor = ' + color + ';\n}\n';
};


/**
 * The vertex and fragment shader entry point in the format that
 * o3d parses.
 * @return {string}
 */
o3djs.effect.o3d.entryPoints = function() {
  return '// #o3d VertexShaderEntryPoint vertexShaderFunction\n' +
    '// #o3d PixelShaderEntryPoint pixelShaderFunction\n';
};


/**
 * The vertex and fragment shader entry points.  In glsl, this is unnecessary.
 * @return {string}
 */
o3djs.effect.glsl.entryPoints = function() {
  return '';
};

o3djs.effect.glsl.matrixLoadOrder =
o3djs.effect.o3d.matrixLoadOrder = function() {
  return '// #o3d MatrixLoadOrder RowMajor\n';
};


/**
 * Sets the shader language used.  Passing 'glsl' will cause all generated
 * shader code to be in glsl.  Passing anything else will result in the
 * default o3d hlsl/cg based shader language.
 * @param {string} language Shader language to use.
 */
o3djs.effect.setLanguage = function(language) {
  var language_namespace = o3djs.effect.o3d;
  if (language == 'glsl') {
    language_namespace = o3djs.effect.glsl;
  }
  for (var f in o3djs.effect.glsl) {
    o3djs.effect[f] = language_namespace[f];
  }

  o3djs.effect.TWO_COLOR_CHECKER_FXSTRING =
      o3djs.effect.buildCheckerShaderString();
};

/**
 * Gets the language set in the function setLanguage.  Returns a string, either
 * 'glsl' or 'o3d'.
 */
o3djs.effect.getLanguage = function() {
  if (language_namespace == o3djs.effect.glsl) {
    return 'glsl';
  }
  return 'o3d';
};


/**
 * Builds the vertex attribute declarations for a given material.
 * @param {!o3d.Material} material The material to inspect.
 * @param {boolean} diffuse Whether to include stuff for diffuse calculations.
 * @param {boolean} specular Whether to include stuff for diffuse
 *     calculations.
 * @param {boolean} bumpSampler Whether there is a bump sampler.
 * @return {string} The code for the declarations.
 */
o3djs.effect.buildAttributeDecls =
    function(material, diffuse, specular, bumpSampler) {
  var str = o3djs.effect.BEGIN_IN_STRUCT +
            o3djs.effect.ATTRIBUTE + o3djs.effect.FLOAT4 + ' ' + 'position' +
            o3djs.effect.semanticSuffix('POSITION') + ';\n';
  if (diffuse || specular) {
    str += o3djs.effect.ATTRIBUTE + o3djs.effect.FLOAT3 + ' ' + 'normal' +
    o3djs.effect.semanticSuffix('NORMAL') + ';\n';
  }
  str += o3djs.effect.buildTexCoords(material, false) +
         o3djs.effect.buildBumpInputCoords(bumpSampler) +
         o3djs.effect.END_STRUCT;
  return str;
};


/**
 * Caches the varying parameter declarations to be repeated in the case that
 * we're in glsl and need to declare the varying parameters in both shaders.
 * @type {string}
 */
o3djs.effect.varying_decls_ = '';


/**
 * Builds the varying parameter declarations for a given material.
 * @param {!o3d.Material} material The material to inspect.
 * @param {boolean} diffuse Whether to include stuff for diffuse calculations.
 * @param {boolean} specular Whether to include stuff for diffuse
 *     calculations.
 * @param {boolean} bumpSampler Whether there is a bump sampler.
 * @return {string} The code for the declarations.
 */
o3djs.effect.buildVaryingDecls =
    function(material, diffuse, specular, bumpSampler) {
  var p = o3djs.effect;
  var str = p.BEGIN_OUT_STRUCT +
      p.VARYING + p.FLOAT4 + ' ' +
      p.VARYING_DECLARATION_PREFIX + 'position' +
      p.semanticSuffix('POSITION') + ';\n' +
      p.buildTexCoords(material, true) +
      p.buildBumpOutputCoords(bumpSampler);
  if (diffuse || specular) {
    str += p.VARYING + p.FLOAT3 + ' ' +
        p.VARYING_DECLARATION_PREFIX + 'normal' +
        p.semanticSuffix('TEXCOORD' +
           p.interpolant_++ + '') + ';\n' +
        p.VARYING + p.FLOAT3 + ' ' +
        p.VARYING_DECLARATION_PREFIX + 'surfaceToLight' +
        p.semanticSuffix(
            'TEXCOORD' + p.interpolant_++ + '') + ';\n';
  }
  if (specular) {
    str += p.VARYING + p.FLOAT3 + ' ' +
        p.VARYING_DECLARATION_PREFIX + 'surfaceToView' +
        p.semanticSuffix(
            'TEXCOORD' + p.interpolant_++ + '') + ';\n';
  }
  str += p.END_STRUCT;
  p.varying_decls_ = str;
  return str;
};


/**
 * An integer value which keeps track of the next available interpolant.
 * @type {number}
 * @private
 */
o3djs.effect.interpolant_ = 0;

/**
 * Builds the texture coordinate declaration for a given color input
 * (usually emissive, ambient, diffuse or specular).  If the color
 * input does not have a sampler, no TEXCOORD declaration is built.
 * @param {!o3d.Material} material The material to inspect.
 * @param {boolean} varying Whether these vertex declarations should
 *     be written as varying values.
 * @param {string} name The name of the color input.
 * @return {string} The code for the texture coordinate declaration.
 */
o3djs.effect.buildTexCoord = function(material, varying, name) {
  var p = o3djs.effect;
  // In the GLSL version we need to name the incoming attributes by
  // the semantic name in order for them to get hooked up correctly.
  if (material.getParam(name + 'Sampler')) {
    if (varying) {
      return '  ' + p.VARYING + p.FLOAT2 + ' ' +
          p.VARYING_DECLARATION_PREFIX + name + 'UV' +
          p.semanticSuffix(
              'TEXCOORD' + p.interpolant_++ + '') + ';\n';
    } else {
      var desiredName = name + 'UV';
      var semantic = 'TEXCOORD' + p.interpolant_++;
      var outputName = p.getAttributeName_(desiredName, semantic);
      if (p.semanticNameMap) {
        p.nameToSemanticMap_[desiredName] = semantic;
      }
      return '  ' + p.ATTRIBUTE + p.FLOAT2 + ' ' + outputName +
          p.semanticSuffix(semantic) + ';\n';
    }
  } else {
    return '';
  }
};

/**
 * Builds all the texture coordinate declarations for a vertex attribute
 * declaration.
 * @param {!o3d.Material} material The material to inspect.
 * @param {boolean} varying Whether these vertex declarations should
 *     be written as varying values.
 * @return {string} The code for the texture coordinate declarations.
 */
o3djs.effect.buildTexCoords = function(material, varying) {
  var p = o3djs.effect;
  p.interpolant_ = 0;
  if (!varying) {
    p.nameToSemanticMap_ = {};
  }
  return p.buildTexCoord(material, varying, 'emissive') +
         p.buildTexCoord(material, varying, 'ambient') +
         p.buildTexCoord(material, varying, 'diffuse') +
         p.buildTexCoord(material, varying, 'specular');
};


/**
 * Builds the texture coordinate passthrough statement for a given
 * color input (usually emissive, ambient, diffuse or specular).  These
 * assigments are used in the vertex shader to pass the texcoords to be
 * interpolated to the rasterizer.  If the color input does not have
 * a sampler, no code is generated.
 * @param {!o3d.Material} material The material to inspect.
 * @param {string} name The name of the color input.
 * @return {string} The code for the texture coordinate passthrough statement.
 */
o3djs.effect.buildUVPassthrough = function(material, name) {
  var p = o3djs.effect;
  if (material.getParam(name + 'Sampler')) {
    var sourceName = name + 'UV';
    var destName = sourceName;
    var semantic = p.nameToSemanticMap_[sourceName];
    if (semantic) {
      sourceName = p.getAttributeName_(sourceName, semantic);
    }
    return '  ' + p.VERTEX_VARYING_PREFIX + destName + ' = ' +
        p.ATTRIBUTE_PREFIX + sourceName + ';\n';
  } else {
    return '';
  }
};


/**
 * Builds all the texture coordinate passthrough statements for the
 * vertex shader.
 * @param {!o3d.Material} material The material to inspect.
 * @return {string} The code for the texture coordinate passthrough
 *                  statements.
 */
o3djs.effect.buildUVPassthroughs = function(material) {
  var p = o3djs.effect;
  // TODO(petersont): in the GLSL implementation we need to generate
  // the code for these attributes before we can pass their values
  // through, because in this implementation their names must be their
  // semantics (i.e., "texCoord4") rather than these chosen names.
  // Currently bumpUV is the only one which does not obey this rule.
  return p.buildUVPassthrough(material, 'emissive') +
         p.buildUVPassthrough(material, 'ambient') +
         p.buildUVPassthrough(material, 'diffuse') +
         p.buildUVPassthrough(material, 'specular') +
         p.buildUVPassthrough(material, 'bump');
};


/**
 * Builds bump input coords if needed.
 * @param {boolean} bumpSampler Whether there is a bump sampler.
 * @return {string} The code for bump input coords.
 */
o3djs.effect.buildBumpInputCoords = function(bumpSampler) {
  var p = o3djs.effect;
  return bumpSampler ?
      ('  ' + p.FLOAT3 + ' tangent' +
          p.semanticSuffix('TANGENT') + ';\n' +
       '  ' + p.FLOAT3 + ' binormal' +
          p.semanticSuffix('BINORMAL') + ';\n' +
       '  ' + p.FLOAT2 + ' bumpUV' +
          p.semanticSuffix(
              'TEXCOORD' + p.interpolant_++) + ';\n') : '';
};


/**
 * Builds bump output coords if needed.
 * @param {boolean} bumpSampler Whether there is a bump sampler.
 * @return {string} The code for bump input coords.
 */
o3djs.effect.buildBumpOutputCoords = function(bumpSampler) {
  var p = o3djs.effect;
  return bumpSampler ?
      ('  ' + p.FLOAT3 + ' tangent' +
          p.semanticSuffix(
              'TEXCOORD' + p.interpolant_++) + ';\n' +
       '  ' + p.FLOAT3 + ' binormal' +
          p.semanticSuffix('TEXCOORD' +
              p.interpolant_++) + ';\n' +
       '  ' + p.FLOAT2 + ' bumpUV' +
          p.semanticSuffix(
              'TEXCOORD' + p.interpolant_++) + ';\n') : '';
};


/**
 * Builds vertex and fragment shader string for a 2-color checker effect.
 * @return {string} The effect code for the shader, ready to be parsed.
 */
o3djs.effect.buildCheckerShaderString = function() {
  var p = o3djs.effect;
  var varyingDecls = p.BEGIN_OUT_STRUCT +
    p.VARYING + p.FLOAT4 + ' ' +
    p.VARYING_DECLARATION_PREFIX + 'position' +
    p.semanticSuffix('POSITION') + ';\n' +
    p.VARYING + p.FLOAT2 + ' ' +
    p.VARYING_DECLARATION_PREFIX + 'texCoord' +
    p.semanticSuffix('TEXCOORD0') + ';\n' +
    p.VARYING + p.FLOAT3 + ' ' +
    p.VARYING_DECLARATION_PREFIX + 'normal' +
    p.semanticSuffix('TEXCOORD1') + ';\n' +
    p.VARYING + p.FLOAT3 + ' ' +
    p.VARYING_DECLARATION_PREFIX + 'worldPosition' +
    p.semanticSuffix('TEXCOORD2') + ';\n' +
    p.END_STRUCT;

  return 'uniform ' + p.MATRIX4 + ' worldViewProjection' +
    p.semanticSuffix('WORLDVIEWPROJECTION') + ';\n' +
    'uniform ' + p.MATRIX4 + ' worldInverseTranspose' +
    p.semanticSuffix('WORLDINVERSETRANSPOSE') + ';\n' +
    'uniform ' + p.MATRIX4 + ' world' +
    p.semanticSuffix('WORLD') + ';\n' +
    '\n' +
    p.BEGIN_IN_STRUCT +
    p.ATTRIBUTE + p.FLOAT4 + ' position' +
    p.semanticSuffix('POSITION') + ';\n' +
    p.ATTRIBUTE + p.FLOAT3 + ' normal' +
    p.semanticSuffix('NORMAL') + ';\n' +
    p.ATTRIBUTE + p.FLOAT2 + ' texCoord0' +
    p.semanticSuffix('TEXCOORD0') + ';\n' +
    p.END_STRUCT +
    '\n' +
    varyingDecls +
    '\n' +
    p.beginVertexShaderMain() +
    '  ' + p.VERTEX_VARYING_PREFIX + 'position = ' +
    p.mul(p.ATTRIBUTE_PREFIX + 'position',
        'worldViewProjection') + ';\n' +
    '  ' + p.VERTEX_VARYING_PREFIX + 'normal = ' +
    p.mul(p.FLOAT4 + '(' +
    p.ATTRIBUTE_PREFIX + 'normal, 0.0)',
        'worldInverseTranspose') + '.xyz;\n' +
    '  ' + p.VERTEX_VARYING_PREFIX + 'worldPosition = ' +
        p.mul(p.ATTRIBUTE_PREFIX + 'position', 'world') +
    '.xyz;\n' +
    '  ' + p.VERTEX_VARYING_PREFIX + 'texCoord = ' +
    p.ATTRIBUTE_PREFIX + 'texCoord0;\n' +
    p.endVertexShaderMain() +
    '\n' +
    p.pixelShaderHeader() +
    'uniform ' + p.FLOAT4 + ' color1;\n' +
    'uniform ' + p.FLOAT4 + ' color2;\n' +
    'uniform float checkSize;\n' +
    'uniform ' + p.FLOAT3 + ' lightWorldPos;\n' +
    'uniform ' + p.FLOAT3 + ' lightColor;\n' +
    '\n' +
    p.repeatVaryingDecls(varyingDecls) +
    p.FLOAT4 + ' checker(' + p.FLOAT2 + ' uv) {\n' +
    '  float fmodResult = ' + p.MOD + '(' +
    '    floor(checkSize * uv.x) + \n' +
    '    floor(checkSize * uv.y), 2.0);\n' +
    '  return (fmodResult < 1.0) ? color1 : color2;\n' +
    '}\n\n' +
    p.beginPixelShaderMain() +
    '  ' + p.FLOAT3 + ' surfaceToLight = \n' +
    '      normalize(lightWorldPos - ' +
    p.PIXEL_VARYING_PREFIX + 'worldPosition);\n' +
    '  ' + p.FLOAT3 + ' worldNormal = normalize(' +
    p.PIXEL_VARYING_PREFIX + 'normal);\n' +
    '  ' + p.FLOAT4 + ' check = checker(' +
    p.PIXEL_VARYING_PREFIX + 'texCoord);\n' +
    '  float directionalIntensity = \n' +
    '      clamp(dot(worldNormal, surfaceToLight), 0.0, 1.0);\n' +
    '  ' + p.FLOAT4 +
    ' outColor = directionalIntensity * check;\n' +
    p.endPixelShaderMain(
        p.FLOAT4 + '(outColor.rgb, check.a)') +
    '\n' +
    p.entryPoints() +
    p.matrixLoadOrder();
};



/**
 * The name of the parameter on a material if it's a collada standard
 * material.
 *
 * NOTE: This parameter is just a string attached to a material. It has no
 *     meaning to the plugin, it is passed from the conditioner to the
 *     javascript libraries so that they can build collada like effects.
 *
 * @type {string}
 */
o3djs.effect.COLLADA_LIGHTING_TYPE_PARAM_NAME = 'collada.lightingType';

/**
 * The collada standard lighting types.
 * @type {!Object}
 */
o3djs.effect.COLLADA_LIGHTING_TYPES = {phong: 1,
                                       lambert: 1,
                                       blinn: 1,
                                       constant: 1};

/**
 * The FCollada standard materials sampler parameter name prefixes.
 * @type {!Array.<string>}
 */
o3djs.effect.COLLADA_SAMPLER_PARAMETER_PREFIXES = ['emissive',
                                                   'ambient',
                                                   'diffuse',
                                                   'specular',
                                                   'bump'];

/**
 * Check if lighting type is a collada lighting type.
 * @param {string} lightingType Lighting type to check.
 * @return {boolean} true if it's a collada lighting type.
 */
o3djs.effect.isColladaLightingType = function(lightingType) {
  return o3djs.effect.COLLADA_LIGHTING_TYPES[lightingType.toLowerCase()] == 1;
};

/**
 * Returns the collada lighting type of a collada standard material.
 * @param {!o3d.Material} material Material to get lighting type from.
 * @return {string} The lighting type or "" if it's not a collada standard
 *     material.
 */
o3djs.effect.getColladaLightingType = function(material) {
  var lightingTypeParam = material.getParam(
      o3djs.effect.COLLADA_LIGHTING_TYPE_PARAM_NAME);
  if (lightingTypeParam) {
    var lightingType = lightingTypeParam.value.toLowerCase();
    if (o3djs.effect.isColladaLightingType(lightingType)) {
      return lightingType;
    }
  }
  return '';
};

/**
 * Get the number of TEXCOORD streams needed by this material.
 * @param {!o3d.Material} material The material MUST be a standard
 *     collada material.
 * @return {number} The number oc TEXCOORD streams needed.
 */
o3djs.effect.getNumTexCoordStreamsNeeded = function(material) {
  var p = o3djs.effect;
  var lightingType = p.getColladaLightingType(material);
  if (!p.isColladaLightingType(lightingType)) {
    throw 'not a collada standard material';
  }
  var colladaSamplers = p.COLLADA_SAMPLER_PARAMETER_PREFIXES;
  var numTexCoordStreamsNeeded = 0
  for (var cc = 0; cc < colladaSamplers.length; ++cc) {
    var samplerPrefix = colladaSamplers[cc];
    var samplerParam = material.getParam(samplerPrefix + 'Sampler');
    if (samplerParam) {
      ++numTexCoordStreamsNeeded;
    }
  }
  return numTexCoordStreamsNeeded;
};

/**
 * Loads shader source from an external file and creates shaders for an effect.
 * @param {!o3d.Effect} effect The effect to create the shaders in.
 * @param {string} url The url of the shader source.
 */
o3djs.effect.loadEffect = function(effect, url) {
  var fxString = o3djs.io.loadTextFileSynchronous(url);
  effect.loadFromFXString(fxString);
};

/**
 * Creates an effect from a file.
 * If the effect already exists in the pack that effect will be returned.
 * @param {!o3d.Pack} pack Pack to create effect in.
 * @param {string} url Url for effect file.
 * @return {!o3d.Effect} The effect.
 */
o3djs.effect.createEffectFromFile = function(pack, url) {
  var p = o3djs.effect;
  var effect = pack.getObjects(url, 'o3d.Effect')[0];
  if (!effect) {
    effect = pack.createObject('Effect');
    p.loadEffect(effect, url);
    effect.name = url;
  }
  return effect;
};

/**
 * Builds a shader string for a given standard COLLADA material type.
 *
 * @param {!o3d.Material} material Material for which to build the shader.
 * @param {string} effectType Type of effect to create ('phong', 'lambert',
 *     'constant').
 * @return {{description: string, shader: string}} A description and the shader
 *     string.
 */
o3djs.effect.buildStandardShaderString = function(material,
                                                  effectType) {
  var p = o3djs.effect;
  var bumpSampler = material.getParam('bumpSampler');
  var bumpUVInterpolant;

  /**
   * Extracts the texture type from a texture param.
   * @param {!o3d.ParamTexture} textureParam The texture parameter to
   *     inspect.
   * @return {string} The texture type (1D, 2D, 3D or CUBE).
   */
  var getTextureType = function(textureParam) {
    var texture = textureParam.value;
    if (!texture) return '2D';  // No texture value, have to make a guess.
    switch (texture.className) {
      case 'o3d.Texture1D' : return '1D';
      case 'o3d.Texture2D' : return '2D';
      case 'o3d.Texture3D' : return '3D';
      case 'o3d.TextureCUBE' : return 'CUBE';
      default : return '2D';
    }
  }

  /**
   * Extracts the sampler type from a sampler param.  It does it by inspecting
   * the texture associated with the sampler.
   * @param {!o3d.ParamTexture} samplerParam The texture parameter to
   *     inspect.
   * @return {string} The texture type (1D, 2D, 3D or CUBE).
   */
  var getSamplerType = function(samplerParam) {
    var sampler = samplerParam.value;
    if (!sampler) return '2D';
    var textureParam = sampler.getParam('Texture');
    if (textureParam)
      return getTextureType(textureParam);
    else
      return '2D';
  };

  /**
   * Builds uniform variables common to all standard lighting types.
   * @return {string} The effect code for the common shader uniforms.
   */
  var buildCommonVertexUniforms = function() {
    return 'uniform ' + p.MATRIX4 + ' worldViewProjection' +
        p.semanticSuffix('WORLDVIEWPROJECTION') + ';\n' +
        'uniform ' + p.FLOAT3 + ' lightWorldPos;\n';
  };

  /**
   * Builds uniform variables common to all standard lighting types.
   * @return {string} The effect code for the common shader uniforms.
   */
  var buildCommonPixelUniforms = function() {
    return 'uniform ' + p.FLOAT4 + ' lightColor;\n';
  };

  /**
   * Builds uniform variables common to lambert, phong and blinn lighting types.
   * @return {string} The effect code for the common shader uniforms.
   */
  var buildLightingUniforms = function() {
    return 'uniform ' + p.MATRIX4 + ' world' +
        p.semanticSuffix('WORLD') + ';\n' +
        'uniform ' + p.MATRIX4 +
        ' viewInverse' + p.semanticSuffix('VIEWINVERSE') + ';\n' +
        'uniform ' + p.MATRIX4 + ' worldInverseTranspose' +
        p.semanticSuffix('WORLDINVERSETRANSPOSE') + ';\n';
  };

  /**
   * Builds uniform parameters for a given color input.  If the material
   * has a sampler parameter, a sampler uniform is created, otherwise a
   * float4 color value is created.
   * @param {!o3d.Material} material The material to inspect.
   * @param {!Array.<string>} descriptions Array to add descriptions too.
   * @param {string} name The name of the parameter to look for.  Usually
   *     emissive, ambient, diffuse or specular.
   * @param {boolean} opt_addColorParam Whether to add a color param if no
   *     sampler exists. Default = true.
   * @return {string} The effect code for the uniform parameter.
   */
  var buildColorParam = function(material, descriptions, name,
                                 opt_addColorParam) {
    if (opt_addColorParam === undefined) {
      opt_addColorParam = true;
    }
    var samplerParam = material.getParam(name + 'Sampler');
    if (samplerParam) {
      var type = getSamplerType(samplerParam);
      descriptions.push(name + type + 'Texture');
      return 'uniform sampler' + type + ' ' + name + 'Sampler;\n'
    } else if (opt_addColorParam) {
      descriptions.push(name + 'Color');
      return 'uniform ' + p.FLOAT4 + ' ' + name + ';\n';
    } else {
      return '';
    }
  };

  /**
   * Builds the effect code to retrieve a given color input.  If the material
   * has a sampler parameter of that name, a texture lookup is done.  Otherwise
   * it's a no-op, since the value is retrieved directly from the color uniform
   * of that name.
   * @param {!o3d.Material} material The material to inspect.
   * @param {string} name The name of the parameter to look for.  Usually
   *                      emissive, ambient, diffuse or specular.
   * @return {string} The effect code for the uniform parameter retrieval.
   */
  var getColorParam = function(material, name) {
    var samplerParam = material.getParam(name + 'Sampler');
    if (samplerParam) {
      var type = getSamplerType(samplerParam);
      return '  ' + p.FLOAT4 + ' ' + name + ' = ' + p.TEXTURE + type +
             '(' + name + 'Sampler, ' +
             p.PIXEL_VARYING_PREFIX + name + 'UV);\n'
    } else {
      return '';
    }
  };

  /**
   * Builds vertex and fragment shader string for the Constant lighting type.
   * @param {!o3d.Material} material The material for which to build
   *     shaders.
   * @param {!Array.<string>} descriptions Array to add descriptions too.
   * @return {string} The effect code for the shader, ready to be parsed.
   */
  var buildConstantShaderString = function(material, descriptions) {
    descriptions.push('constant');
    return buildCommonVertexUniforms() +
           buildVertexDecls(material, false, false) +
           p.beginVertexShaderMain() +
           positionVertexShaderCode() +
           p.buildUVPassthroughs(material) +
           p.endVertexShaderMain() +
           p.pixelShaderHeader(material, false, false, bumpSampler) +
           buildCommonPixelUniforms() +
           p.repeatVaryingDecls() +
           buildColorParam(material, descriptions, 'emissive') +
           p.beginPixelShaderMain() +
           getColorParam(material, 'emissive') +
           p.endPixelShaderMain('emissive') +
           p.entryPoints() +
           p.matrixLoadOrder();
  };

  /**
   * Builds vertex and fragment shader string for the Lambert lighting type.
   * @param {!o3d.Material} material The material for which to build
   *     shaders.
   * @param {!Array.<string>} descriptions Array to add descriptions too.
   * @return {string} The effect code for the shader, ready to be parsed.
   */
  var buildLambertShaderString = function(material, descriptions) {
    descriptions.push('lambert');
    return buildCommonVertexUniforms() +
           buildLightingUniforms() +
           buildVertexDecls(material, true, false) +
           p.beginVertexShaderMain() +
           p.buildUVPassthroughs(material) +
           positionVertexShaderCode() +
           normalVertexShaderCode() +
           surfaceToLightVertexShaderCode() +
           bumpVertexShaderCode() +
           p.endVertexShaderMain() +
           p.pixelShaderHeader(material, true, false) +
           buildCommonPixelUniforms() +
           p.repeatVaryingDecls() +
           buildColorParam(material, descriptions, 'emissive') +
           buildColorParam(material, descriptions, 'ambient') +
           buildColorParam(material, descriptions, 'diffuse') +
           buildColorParam(material, descriptions, 'bump', false) +
           p.utilityFunctions() +
           p.beginPixelShaderMain() +
           getColorParam(material, 'emissive') +
           getColorParam(material, 'ambient') +
           getColorParam(material, 'diffuse') +
           getNormalShaderCode() +
           '  ' + p.FLOAT3 + ' surfaceToLight = normalize(' +
           p.PIXEL_VARYING_PREFIX + 'surfaceToLight);\n' +
           '  ' + p.FLOAT4 +
           ' litR = lit(dot(normal, surfaceToLight), 0.0, 0.0);\n' +
           p.endPixelShaderMain(p.FLOAT4 +
           '((emissive +\n' +
           '      lightColor *' +
           ' (ambient * diffuse + diffuse * litR.y)).rgb,\n' +
           '          diffuse.a)') +
           p.entryPoints() +
           p.matrixLoadOrder();
  };

  /**
   * Builds vertex and fragment shader string for the Blinn lighting type.
   * @param {!o3d.Material} material The material for which to build
   *     shaders.
   * @param {!Array.<string>} descriptions Array to add descriptions too.
   * @return {string} The effect code for the shader, ready to be parsed.
   * TODO: This is actually just a copy of the Phong code.
   *     Change to Blinn.
   */
  var buildBlinnShaderString = function(material, descriptions) {
    descriptions.push('phong');
    return buildCommonVertexUniforms() +
        buildLightingUniforms() +
        buildVertexDecls(material, true, true) +
        p.beginVertexShaderMain() +
        p.buildUVPassthroughs(material) +
        positionVertexShaderCode() +
        normalVertexShaderCode() +
        surfaceToLightVertexShaderCode() +
        surfaceToViewVertexShaderCode() +
        bumpVertexShaderCode() +
        p.endVertexShaderMain() +
        p.pixelShaderHeader(material, true, true) +
        buildCommonPixelUniforms() +
        p.repeatVaryingDecls() +
        buildColorParam(material, descriptions, 'emissive') +
        buildColorParam(material, descriptions, 'ambient') +
        buildColorParam(material, descriptions, 'diffuse') +
        buildColorParam(material, descriptions, 'specular') +
        buildColorParam(material, descriptions, 'bump', false) +
        'uniform float shininess;\n' +
        'uniform float specularFactor;\n' +
        p.utilityFunctions() +
        p.beginPixelShaderMain() +
        getColorParam(material, 'emissive') +
        getColorParam(material, 'ambient') +
        getColorParam(material, 'diffuse') +
        getColorParam(material, 'specular') +
        getNormalShaderCode() +
        '  ' + p.FLOAT3 + ' surfaceToLight = normalize(' +
        p.PIXEL_VARYING_PREFIX + 'surfaceToLight);\n' +
        '  ' + p.FLOAT3 + ' surfaceToView = normalize(' +
        p.PIXEL_VARYING_PREFIX + 'surfaceToView);\n' +
        '  ' + p.FLOAT3 +
        ' halfVector = normalize(surfaceToLight + ' +
        p.PIXEL_VARYING_PREFIX + 'surfaceToView);\n' +
        '  ' + p.FLOAT4 +
        ' litR = lit(dot(normal, surfaceToLight), \n' +
        '                    dot(normal, halfVector), shininess);\n' +
        p.endPixelShaderMain( p.FLOAT4 +
        '((emissive +\n' +
        '  lightColor *' +
        ' (ambient * diffuse + diffuse * litR.y +\n' +
        '                        + specular * litR.z *' +
        ' specularFactor)).rgb,\n' +
        '      diffuse.a)') +
        p.entryPoints() +
        p.matrixLoadOrder();
  };

  /**
   * Builds vertex and fragment shader string for the Phong lighting type.
   * @param {!o3d.Material} material The material for which to build
   *     shaders.
   * @param {!Array.<string>} descriptions Array to add descriptions too.
   * @return {string} The effect code for the shader, ready to be parsed.
   */
  var buildPhongShaderString = function(material, descriptions) {
    descriptions.push('phong');
    return buildCommonVertexUniforms() +
        buildLightingUniforms() +
        buildVertexDecls(material, true, true) +
        p.beginVertexShaderMain() +
        p.buildUVPassthroughs(material) +
        positionVertexShaderCode() +
        normalVertexShaderCode() +
        surfaceToLightVertexShaderCode() +
        surfaceToViewVertexShaderCode() +
        bumpVertexShaderCode() +
        p.endVertexShaderMain() +
        p.pixelShaderHeader(material, true, true) +
        buildCommonPixelUniforms() +
        p.repeatVaryingDecls() +
        buildColorParam(material, descriptions, 'emissive') +
        buildColorParam(material, descriptions, 'ambient') +
        buildColorParam(material, descriptions, 'diffuse') +
        buildColorParam(material, descriptions, 'specular') +
        buildColorParam(material, descriptions, 'bump', false) +
        'uniform float shininess;\n' +
        'uniform float specularFactor;\n' +
        p.utilityFunctions() +
        p.beginPixelShaderMain() +
        getColorParam(material, 'emissive') +
        getColorParam(material, 'ambient') +
        getColorParam(material, 'diffuse') +
        getColorParam(material, 'specular') +
        getNormalShaderCode() +
        '  ' + p.FLOAT3 + ' surfaceToLight = normalize(' +
        p.PIXEL_VARYING_PREFIX + 'surfaceToLight);\n' +
        '  ' + p.FLOAT3 + ' surfaceToView = normalize(' +
        p.PIXEL_VARYING_PREFIX + 'surfaceToView);\n' +
        '  ' + p.FLOAT3 +
        ' halfVector = normalize(surfaceToLight + surfaceToView);\n' +
        '  ' + p.FLOAT4 +
        ' litR = lit(dot(normal, surfaceToLight), \n' +
        '                    dot(normal, halfVector), shininess);\n' +
        p.endPixelShaderMain(p.FLOAT4 +
        '((emissive +\n' +
        '  lightColor * (ambient * diffuse + diffuse * litR.y +\n' +
        '                        + specular * litR.z *' +
        ' specularFactor)).rgb,\n' +
        '      diffuse.a)') +
        p.entryPoints() +
        p.matrixLoadOrder();
  };

  /**
   * Builds the position code for the vertex shader.
   * @return {string} The code for the vertex shader.
   */
  var positionVertexShaderCode = function() {
    return '  ' + p.VERTEX_VARYING_PREFIX + 'position = ' +
        p.mul(p.ATTRIBUTE_PREFIX +
        'position', 'worldViewProjection') + ';\n';
  };

  /**
   * Builds the normal code for the vertex shader.
   * @return {string} The code for the vertex shader.
   */
  var normalVertexShaderCode = function() {
    return '  ' + p.VERTEX_VARYING_PREFIX + 'normal = ' +
        p.mul(p.FLOAT4 + '(' +
        p.ATTRIBUTE_PREFIX +
        'normal, 0)', 'worldInverseTranspose') + '.xyz;\n';
  };

  /**
   * Builds the surface to light code for the vertex shader.
   * @return {string} The code for the vertex shader.
   */
  var surfaceToLightVertexShaderCode = function() {
    return '  ' + p.VERTEX_VARYING_PREFIX +
        'surfaceToLight = lightWorldPos - \n' +
           '                          ' +
           p.mul(p.ATTRIBUTE_PREFIX + 'position',
              'world') + '.xyz;\n';
  };

  /**
   * Builds the surface to view code for the vertex shader.
   * @return {string} The code for the vertex shader.
   */
  var surfaceToViewVertexShaderCode = function() {
    return '  ' + p.VERTEX_VARYING_PREFIX +
        'surfaceToView = (viewInverse[3] - ' +
         p.mul(p.ATTRIBUTE_PREFIX + 'position', 'world') + ').xyz;\n';
  };

  /**
   * Builds the normal map part of the vertex shader.
   * @param {boolean} opt_bumpSampler Whether there is a bump
   *     sampler. Default = false.
   * @return {string} The code for normal mapping in the vertex shader.
   */
  var bumpVertexShaderCode = function(opt_bumpSampler) {
    return bumpSampler ?
        ('  ' + p.VERTEX_VARYING_PREFIX + 'binormal = ' +
         p.mul(p.FLOAT4 + '(' +
         p.ATTRIBUTE_PREFIX + 'binormal, 0)',
             'worldInverseTranspose') + '.xyz;\n' +
         '  ' + p.VERTEX_VARYING_PREFIX + 'tangent = ' +
         p.mul(p.FLOAT4 +
         '(' + p.ATTRIBUTE_PREFIX + 'tangent, 0)',
             'worldInverseTranspose') + '.xyz;\n') : '';
  };

  /**
   * Builds the normal calculation of the pixel shader.
   * @return {string} The code for normal computation in the pixel shader.
   */
  var getNormalShaderCode = function() {
    return bumpSampler ?
        (p.MATRIX3 + ' tangentToWorld = ' + p.MATRIX3 +
            '(' + p.ATTRIBUTE_PREFIX + 'tangent,\n' +
         '                                   ' +
         p.ATTRIBUTE_PREFIX + 'binormal,\n' +
         '                                   ' +
         p.ATTRIBUTE_PREFIX + 'normal);\n' +
         p.FLOAT3 + ' tangentNormal = ' + p.TEXTURE + '2D' + '(bumpSampler, ' +
         p.ATTRIBUTE_PREFIX + 'bumpUV.xy).xyz -\n' +
         '                       ' + p.FLOAT3 +
         '(0.5, 0.5, 0.5);\n' + p.FLOAT3 + ' normal = ' +
         p.mul('tangentNormal', 'tangentToWorld') + ';\n' +
         'normal = normalize(' + p.PIXEL_VARYING_PREFIX +
         'normal);\n') : '  ' + p.FLOAT3 + ' normal = normalize(' +
         p.PIXEL_VARYING_PREFIX + 'normal);\n';
  };

  /**
   * Builds the vertex declarations for a given material.
   * @param {!o3d.Material} material The material to inspect.
   * @param {boolean} diffuse Whether to include stuff for diffuse
   *     calculations.
   * @param {boolean} specular Whether to include stuff for diffuse
   *     calculations.
   * @return {string} The code for the vertex declarations.
   */
  var buildVertexDecls = function(material, diffuse, specular) {
    return p.buildAttributeDecls(
        material, diffuse, specular, bumpSampler) +
        p.buildVaryingDecls(
            material, diffuse, specular, bumpSampler);
  };


  // Create a shader string of the appropriate type, based on the
  // effectType.
  var str;
  var descriptions = [];
  if (effectType == 'phong') {
    str = buildPhongShaderString(material, descriptions);
  } else if (effectType == 'lambert') {
    str = buildLambertShaderString(material, descriptions);
  } else if (effectType == 'blinn') {
    str = buildBlinnShaderString(material, descriptions);
  } else if (effectType == 'constant') {
    str = buildConstantShaderString(material, descriptions);
  } else {
    throw ('unknown effect type "' + effectType + '"');
  }

  return {description: descriptions.join('_'), shader: str};
};

/**
 * Gets or builds a shader for given standard COLLADA material type.
 *
 * Looks at the material passed in and assigns it an Effect that matches its
 * Params. If a suitable Effect already exists in pack it will use that Effect.
 *
 * @param {!o3d.Pack} pack Pack in which to create the new Effect.
 * @param {!o3d.Material} material Material for which to build the shader.
 * @param {string} effectType Type of effect to create ('phong', 'lambert',
 *     'constant').
 * @return {o3d.Effect} The created effect.
 */
o3djs.effect.getStandardShader = function(pack,
                                          material,
                                          effectType) {
  var record = o3djs.effect.buildStandardShaderString(material,
                                                      effectType);
  var effects = pack.getObjectsByClassName('o3d.Effect');
  for (var ii = 0; ii < effects.length; ++ii) {
    if (effects[ii].name == record.description &&
        effects[ii].source == record.shader) {
      return effects[ii];
    }
  }
  var effect = pack.createObject('Effect');
  if (effect) {
    effect.name = record.description;
    if (effect.loadFromFXString(record.shader)) {
      return effect;
    }
    pack.removeObject(effect);
  }
  return null;
};

/**
 * Attaches a shader for a given standard COLLADA material type to the
 * material.
 *
 * Looks at the material passed in and assigns it an Effect that matches its
 * Params. If a suitable Effect already exists in pack it will use that Effect.
 *
 * @param {!o3d.Pack} pack Pack in which to create the new Effect.
 * @param {!o3d.Material} material Material for which to build the shader.
 * @param {!o3djs.math.Vector3} lightPos Position of the default light.
 * @param {string} effectType Type of effect to create ('phong', 'lambert',
 *     'constant').
 * @return {boolean} True on success.
 */
o3djs.effect.attachStandardShader = function(pack,
                                             material,
                                             lightPos,
                                             effectType) {
  var effect = o3djs.effect.getStandardShader(pack,
                                              material,
                                              effectType);
  if (effect) {
    material.effect = effect;
    effect.createUniformParameters(material);

    // Set a couple of the default parameters in the hopes that this will
    // help the user get something on the screen. We check to make sure they
    // are not connected to something otherwise we'll get an error.
    var param = material.getParam('lightWorldPos');
    if (param && !param.inputConnection) {
      param.value = lightPos;
    }
    var param = material.getParam('lightColor');
    if (param && !param.inputConnection) {
      param.value = [1, 1, 1, 1];
    }
    return true;
  } else {
    return false;
  }
};

/**
 * Creates the uniform parameters needed for an Effect on the given ParamObject.
 * @param {!o3d.Pack} pack Pack to create extra objects in like Samplers and
 *     ParamArrays.
 * @param {!o3d.Effect} effect Effect.
 * @param {!o3d.ParamObject} paramObject ParamObject on which to create Params.
 */
o3djs.effect.createUniformParameters = function(pack, effect, paramObject) {
  effect.createUniformParameters(paramObject);
  var infos = effect.getParameterInfo();
  for (var ii = 0; ii < infos.length; ++ii) {
    var info = infos[ii];
    if (info.sasClassName.length == 0) {
      if (info.numElements > 0) {
        var paramArray = pack.createObject('ParamArray');
        var param = paramObject.getParam(info.name);
        param.value = paramArray;
        paramArray.resize(info.numElements, info.className);
        if (info.className == 'o3d.ParamSampler') {
          for (var jj = 0; jj < info.numElements; ++jj) {
            var sampler = pack.createObject('Sampler');
            paramArray.getParam(jj).value = sampler;
          }
        }
      } else if (info.className == 'o3d.ParamSampler') {
        var sampler = pack.createObject('Sampler');
        var param = paramObject.getParam(info.name);
        param.value = sampler;
      }
    }
  }
};

/**
 * Creates an effect that draws a 2 color procedural checker pattern.
 * @param {!o3d.Pack} pack The pack to create the effect in. If the pack
 *     already has an effect with the same name that effect will be returned.
 * @return {!o3d.Effect} The effect.
 */
o3djs.effect.createCheckerEffect = function(pack) {
  var effects = pack.getObjects(o3djs.effect.TWO_COLOR_CHECKER_EFFECT_NAME,
                                'o3d.Effect');
  if (effects.length > 0) {
    return effects[0];
  }

  var effect = pack.createObject('Effect');
  effect.loadFromFXString(o3djs.effect.TWO_COLOR_CHECKER_FXSTRING);
  effect.name = o3djs.effect.TWO_COLOR_CHECKER_EFFECT_NAME;
  return effect;
};


// For compatability with o3d code, the default language is o3d shading
// language.
o3djs.effect.setLanguage('o3d');


/*
 * Copyright 2009, Google Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */


/**
 * @fileoverview This file contains various functions for helping setup
 * elements for o3d
 */

o3djs.provide('o3djs.element');

o3djs.require('o3djs.math');

/**
 * A Module for element functions.
 * @namespace
 */
o3djs.element = o3djs.element || {};

/**
 * Sets the bounding box and z sort point of an element.
 * @param {!o3d.Element} element Element to set bounding box and z sort point
 *     on.
 */
o3djs.element.setBoundingBoxAndZSortPoint = function(element) {
  var boundingBox = element.getBoundingBox(0);
  var minExtent = boundingBox.minExtent;
  var maxExtent = boundingBox.maxExtent;
  element.boundingBox = boundingBox;
  element.cull = true;
  element.zSortPoint = o3djs.math.divVectorScalar(
      o3djs.math.addVector(minExtent, maxExtent), 2);
};

/**
 * Adds missing texture coordinate streams to a primitive.
 *
 * This is very application specific but if it's a primitive
 * and if it uses a collada material the material builder
 * assumes 1 TEXCOORD stream per texture. In other words if you have
 * both a specular texture AND a diffuse texture the builder assumes
 * you have 2 TEXCOORD streams. This assumption is often false.
 *
 * To work around this we check how many streams the material
 * expects and if there are not enough UVs streams we duplicate the
 * last TEXCOORD stream until there are, making a BIG assumption that
 * that will work.
 *
 * The problem is maybe you have 4 textures and each of them share
 * texture coordinates. There is information in the collada file about
 * what stream to connect each texture to.
 *
 * @param {!o3d.Element} element Element to add streams to.
 */
o3djs.element.addMissingTexCoordStreams = function(element) {
  // TODO: We should store that info. The conditioner should either
  // make streams that way or pass on the info so we can do it here.
  if (element.isAClassName('o3d.Primitive')) {
    var material = /** @type {!o3d.Material} */ (element.material);
    var streamBank = element.streamBank;
    var lightingType = o3djs.effect.getColladaLightingType(material);
    if (lightingType) {
      var numTexCoordStreamsNeeded =
          o3djs.effect.getNumTexCoordStreamsNeeded(material);
      // Count the number of TEXCOORD streams the streamBank has.
      var streams = streamBank.vertexStreams;
      var lastTexCoordStream = null;
      var numTexCoordStreams = 0;
      for (var ii = 0; ii < streams.length; ++ii) {
        var stream = streams[ii];
        if (stream.semantic == o3djs.base.o3d.Stream.TEXCOORD) {
          lastTexCoordStream = stream;
          ++numTexCoordStreams;
        }
      }
      // Add any missing TEXCOORD streams. It might be more efficient for
      // the GPU to create an effect that doesn't need the extra streams
      // but this is a more generic solution because it means we can reuse
      // the same effect.
      for (var ii = numTexCoordStreams;
           ii < numTexCoordStreamsNeeded;
           ++ii) {
        streamBank.setVertexStream(
            lastTexCoordStream.semantic,
            lastTexCoordStream.semanticIndex + ii - numTexCoordStreams + 1,
            lastTexCoordStream.field,
            lastTexCoordStream.startIndex);
      }
    }
  }
};

/**
 * Copies an element and streambank or buffers so the two will share
 * streambanks, vertex and index buffers.
 * @param {!o3d.Pack} pack Pack to manage created objects.
 * @param {!o3d.Element} sourceElement The element to copy.
 * @return {!o3d.Element} the new copy of sourceElement.
 */
o3djs.element.duplicateElement = function(pack, sourceElement) {
  var newElement = pack.createObject(sourceElement.className);
  newElement.copyParams(sourceElement);
  // TODO: If we get the chance to parameterize the primitive's settings
  //     we can delete this code since copyParams will handle it.
  //     For now it only handles primitives by doing it manually.
  if (sourceElement.isAClassName('o3d.Primitive')) {
    newElement.indexBuffer = sourceElement.indexBuffer;
    newElement.startIndex = sourceElement.startIndex;
    newElement.primitiveType = sourceElement.primitiveType;
    newElement.numberVertices = sourceElement.numberVertices;
    newElement.numberPrimitives = sourceElement.numberPrimitives;
  }
  return newElement;
};

/**
 * Gets the normal for specific triangle in a Primitive in that Primitive's
 * local space.
 *
 * NOTE: THIS FUNCTION IS SLOW! If you want to do collisions you should use a
 * different solution.
 *
 * @param {!o3d.Primitive} primitive Primitive to get normal from. The
 *     primitive MUST be a TRIANGLELIST or a TRIANGLESTRIP and it must have a
 *     POSITION,0 stream.
 * @param {number} index Index of triangle.
 * @param {boolean} opt_winding The winding of the triangles of the
 *     Primitive. False = Clockwise, True = Counterclockwise. The default is
 *     false. This is only used for Primitives that have no normals.
 * @return {!o3djs.math.Vector3} The normal for the triangle.
 */
o3djs.element.getNormalForTriangle = function(primitive, index, opt_winding) {
  // Check that we can do this
  var primitiveType = primitive.primitiveType;
  if (primitiveType != o3djs.base.o3d.Primitive.TRIANGLELIST &&
      primitiveType != o3djs.base.o3d.Primitive.TRIANGLESTRIP) {
    throw 'primitive is not a TRIANGLELIST or TRIANGLESTRIP';
  }

  var indexBuffer = primitive.indexBuffer;
  var vertexIndex = (primitiveType == o3djs.base.o3d.Primitive.TRIANGLELIST) ?
                    (index * 3) : (index + 2);
  var vertexIndices;
  if (indexBuffer) {
    var indexField = indexBuffer.fields[0];
    vertexIndices = indexField.getAt(vertexIndex, 3);
  } else {
    vertexIndices = [vertexIndex, vertexIndex + 1, vertexIndex + 2]
  }

  var normalStream = primitive.streamBank.getVertexStream(
      o3djs.base.o3d.Stream.NORMAL, 0);
  if (normalStream) {
    var normalField = normalStream.field;
    // Look up the 3 normals that make the triangle.
    var summedNormal = [0, 0, 0];
    for (var ii = 0; ii < 3; ++ii) {
      var normal = normalField.getAt(vertexIndices[ii], 1);
      summedNormal = o3djs.math.addVector(summedNormal, normal);
    }
    return o3djs.math.normalize(summedNormal);
  } else {
    var positionStream = primitive.streamBank.getVertexStream(
        o3djs.base.o3d.Stream.POSITION, 0);
    if (!positionStream) {
      throw 'no POSITION,0 stream in primitive';
    }
    var positionField = positionStream.field;
    // Lookup the 3 positions that make the triangle.
    var positions = [];
    for (var ii = 0; ii < 3; ++ii) {
      positions[ii] = positionField.getAt(vertexIndices[ii], 1);
    }

    // Compute a face normal from the positions.
    var v0 = o3djs.math.normalize(o3djs.math.subVector(positions[1],
                                                       positions[0]));
    var v1 = o3djs.math.normalize(o3djs.math.subVector(positions[2],
                                                       positions[1]));
    return opt_winding ? o3djs.math.cross(v1, v0) : o3djs.math.cross(v0, v1);
  }
};


/*
 * Copyright 2009, Google Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */


/**
 * @fileoverview This file contains various error handing functions for o3d.
 *
 */

o3djs.provide('o3djs.error');

/**
 * A Module with various error handing functions.
 *
 * This module is for helping to manage the client's error callback.
 * Because you can not read the current callback on the client we wrap it with
 * these utilities which track the last callback added so as long as you use
 * o3djs.error.setErrorHandler(client, callback) instead of
 * client.setErrorCallback you'll be able to get and restore the error callback
 * when you need to.
 * @namespace
 */
o3djs.error = o3djs.error || {};

/**
 * A map of error callbacks by client.
 * @private
 * @type {!Array.<(function(string): void|null)>}
 */
o3djs.error.callbacks_ = [];

/**
 * Sets the error handler on a client to a handler that manages the client's
 * error callback.
 * displays an alert on the first error.
 * @param {!o3d.Client} client The client object of the plugin.
 * @param {(function(string): void|null)} callback The callack to use, null to
 *     clear.
 * @return {(function(string): void|null)} the previous error callback for this
 *     client.
 */
o3djs.error.setErrorHandler = function(client, callback) {
  var clientId = client.clientId;
  var old_callback = o3djs.error.callbacks_[clientId];
  o3djs.error.callbacks_[clientId] = callback;
  if (callback) {
    client.setErrorCallback(callback);
  } else {
    client.clearErrorCallback();
  }
  return old_callback;
};

/**
 * Sets a default error handler on the client.
 * The default error handler displays an alert on the first error encountered.
 * @param {!o3d.Client} client The client object of the plugin.
 */
o3djs.error.setDefaultErrorHandler = function(client) {
  o3djs.error.setErrorHandler(
      client,
      function(msg) {
        // Clear the error callback. Otherwise if the callback is happening
        // during rendering it's possible the user will not be able to
        // get out of an infinite loop of alerts.
        o3djs.error.setErrorHandler(client, null);
        alert('ERROR: ' + msg);
      });
};

/**
 * Creates an ErrorCollector.
 * @param {!o3d.Client} client The client object of the plugin.
 * @return {!o3djs.error.ErrorCollector} The created error collector.
 */
o3djs.error.createErrorCollector = function(client) {
  return new o3djs.error.ErrorCollector(client);
};

/**
 * An ErrorCollector takes over the client error callback and continues
 * to collect errors until ErrorCollector.finish() is called.
 * @constructor
 * @param {!o3d.Client} client The client object of the plugin.
 */
o3djs.error.ErrorCollector = function(client) {
  var that = this;
  this.client_ = client;
  /**
   * The collected errors.
   * @type {!Array.<string>}
   */
  this.errors = [];
  this.oldCallback_ = o3djs.error.setErrorHandler(client, function(msg) {
          that.errors.push(msg);
      });
};

/**
 * Stops the ErrorCollector from collecting errors and restores the previous
 * error callback.
 */
o3djs.error.ErrorCollector.prototype.finish = function() {
  o3djs.error.setErrorHandler(this.client_, this.oldCallback_);
};
/*
 * Copyright 2009, Google Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */


/**
 * @fileoverview This file contains various event related functions for
 * o3d.  It puts them in the 'event' module on the o3djs object.
 *
 * TODO Add selenium tests.
 *
 *
 */
o3djs.provide('o3djs.event');

/**
 * A Module for handling events related to o3d and various browsers.
 * @namespace
 */
o3djs.event = o3djs.event || {};

/**
  * @param {string} inStr base string.
  * @param {string} extraStr string to append.
  * @return {string} inStr + ' ' + extraStr, or just inStr if extraStr is ''.
  */
o3djs.event.appendWithSpace = function(inStr, extraStr) {
  return (inStr.length == 0) ? extraStr : inStr + ' ' + extraStr;
};

/**
  * @param {boolean} state whether to append or not.
  * @param {string} inStr base string.
  * @param {string} extraStr string to append.
  * @return {string} inStr + ' ' + extraStr, or just inStr if state is false.
  */
o3djs.event.appendWithSpaceIf = function(state, inStr, extraStr) {
  return (state) ? o3djs.event.appendWithSpace(inStr, extraStr) : inStr;
};


/**
 * Builds a DOM-level 3 modifier string for a KeyboardEvent - see
 * http://www.w3.org/TR/DOM-Level-3-Events/events.html
 * #Events-KeyboardEvents-Interfaces.
 * @param {boolean} control whether the control key is down.
 * @param {boolean} alt whether the alt/option key is down.
 * @param {boolean} shift whether the shift key is down.
 * @param {boolean} meta whether the meta/command key is down.
 * @return {string} space delimited list of keys that are down.
 */
o3djs.event.getModifierString = function(control, alt, shift, meta) {
  var modStr = o3djs.event.appendWithSpaceIf(control, '', 'Control');
  modStr = o3djs.event.appendWithSpaceIf(alt, modStr, 'Alt');
  modStr = o3djs.event.appendWithSpaceIf(shift, modStr, 'Shift');
  return o3djs.event.appendWithSpaceIf(meta, modStr, 'Meta');
};


/**
 * Pad a string with leading zeroes if needed until it is the length desired.
 * @param {string} str The input string, probably representing a number.
 * @param {number} to_length The desired minimum length of string with padding.
 * @return {string} A string padded with leading zeroes as needed to be the
 * length desired.
 */
o3djs.event.padWithLeadingZeroes = function(str, to_length) {
  while (str.length < to_length)
    str = '0' + str;
  return str;
};

/**
 * Creates a keyIdentifer string for a given keystroke as specified in the w3c
 * spec on http://www.w3.org/TR/DOM-Level-3-Events/events.html.
 * @param {number} charCode numeric unicode code point as reported by the OS.
 * @param {number} keyCode numeric keyCode as reported by the OS, currently
 * unused but will probably be necessary in the future.
 * @return {string} eg 'Left' or 'U+0040'.
 */
o3djs.event.getKeyIdentifier = function(charCode, keyCode) {
  if (!charCode) {
    // TODO: This works for webkit for keydown and keyup, for basic
    // alphanumeric keys, at least.  Likely it needs lots of work to handle
    // accented characters, various keyboards, etc., as does the rest of our
    // keyboard event code.
    charCode = keyCode;
  }
  switch (charCode) {
    case 3: case 13: return 'Enter';  // spec merges these.
    case 37: return 'Left';
    case 39: return 'Right';
    case 38: return 'Up';
    case 40: return 'Down';
  }
  charCode = (charCode >= 97 && charCode <= 122) ? charCode - 32 : charCode;
  var keyStr = charCode.toString(16).toUpperCase();
  return 'U+' + o3djs.event.padWithLeadingZeroes(keyStr, 4);
};


/** Takes a keyIdentifier string and remaps it to an ASCII/Unicode value
 *  suitable for javascript event handling.
 * @param {string} keyIdent a keyIdentifier string as generated above.
 * @return {number} the numeric Unicode code point represented.
 */
o3djs.event.keyIdentifierToChar = function(keyIdent) {
  if (keyIdent && typeof(keyIdent) == 'string') {
    switch (keyIdent) {
      case 'Enter': return 13;
      case 'Left': return 37;
      case 'Right': return 39;
      case 'Up': return 38;
      case 'Down': return 40;
    }
    if (keyIdent.indexOf('U+') == 0)
      return parseInt(keyIdent.substr(2).toUpperCase(), 16);
  }
  return 0;
};

/**
 *  Extracts the key char in number form from the event, in a cross-browser
 *  manner.
 * @param {!Event} event .
 * @return {number} unicode code point for the key.
 */
o3djs.event.getEventKeyChar = function(event) {
  if (!event) {
    event = window.event;
  }
  var charCode = 0;
  if (event.keyIdentifier)
    charCode = o3djs.event.keyIdentifierToChar(event.keyIdentifier);
  if (!charCode)
    charCode = (window.event) ? window.event.keyCode : event.charCode;
  if (!charCode)
    charCode = event.keyCode;
  return charCode;
};


/**
 * Cancel an event we've handled so it stops propagating upwards.
 * The cancelBubble is for IE, stopPropagation is for all other browsers.
 * preventDefault ensures that the default action is also canceled.
 * @param {!Event} event - the event to cancel.
 */
o3djs.event.cancel = function(event) {
  if (!event)
    event = window.event;
  event.cancelBubble = true;
  if (event.stopPropagation)
    event.stopPropagation();
  if (event.preventDefault)
    event.preventDefault();
};

/**
 * Convenience function to setup synthesizing and dispatching of keyboard events
 * whenever the focussed plug-in calls Javascript to report a keyboard action.
 * @param {!Element} pluginObject the <object> where the o3d plugin lives,
 * which the caller probably obtained by calling getElementById.
 */
o3djs.event.startKeyboardEventSynthesis = function(pluginObject) {
  var handler = function(event) {
    o3djs.event.onKey(event, pluginObject);
  };

  o3djs.event.addEventListener(pluginObject, 'keypress', handler);
  o3djs.event.addEventListener(pluginObject, 'keydown', handler);
  o3djs.event.addEventListener(pluginObject, 'keyup', handler);
};

/**
 * Dispatches a DOM-level 3 KeyboardEvent when called back by the plugin.
 * see http://www.w3.org/TR/DOM-Level-3-Events/events.html
 * #Events-KeyboardEvents-Interfaces
 * see http://developer.mozilla.org/en/DOM/event.initKeyEvent
 * @param {!Event} event an O3D event object.
 * @param {!Element} pluginObject the plugin object on the page.
 */
o3djs.event.onKey = function(event, pluginObject) {
  var k_evt = o3djs.event.createKeyEvent(event.type, event.charCode,
      event.keyCode, event.ctrlKey, event.altKey, event.shiftKey,
      event.metaKey);
  if (k_evt) {
    if (pluginObject.parentNode.dispatchEvent) {
      // Using the pluginObject itself fails for non-capturing event listeners
      // on keypress events on Firefox only, as far as I've been able to
      // determine.  I have no idea why.
      pluginObject.parentNode.dispatchEvent(k_evt);
    } else if (pluginObject.fireEvent) {
      pluginObject.fireEvent('on' + event.type, k_evt);
    }
  }
};

/**
 * Creates a DOM-level 3 KeyboardEvent.
 * see http://www.w3.org/TR/DOM-Level-3-Events/events.html
 * #Events-KeyboardEvents-Interfaces.
 * see http://developer.mozilla.org/en/DOM/event.initKeyEvent
 * @param {string} eventName one of 'keypress', 'keydown' or 'keyup'.
 * @param {number} charCode the character code for the key.
 * @param {number} keyCode the key code for the key.
 * @param {boolean} control whether the control key is down.
 * @param {boolean} alt whether the alt/option key is down.
 * @param {boolean} shift whether the shift key is down.
 * @param {boolean} meta whether the meta/command key is down.
 */
o3djs.event.createKeyEvent = function(eventName, charCode, keyCode,
                                      control, alt, shift, meta) {
  var k_evt;
  var keyIdentifier = o3djs.event.getKeyIdentifier(charCode, keyCode);
  if (document.createEvent) {
    k_evt = document.createEvent('KeyboardEvent');
    if (k_evt.initKeyboardEvent) {  // WebKit.
      k_evt.initKeyboardEvent(eventName, true, true, window,
                   keyIdentifier, 0,
                   control, alt, shift, meta);
      // TODO: These actually fail to do anything in Chrome; those are
      // read-only fields, and it's not setting them in initKeyboardEvent.
      k_evt.charCode = charCode;
      if (eventName == 'keypress')
        k_evt.keyCode = charCode;
      else
        k_evt.keyCode = keyCode;
    } else if (k_evt.initKeyEvent) {  // FF.
      k_evt.initKeyEvent(eventName, true, true, window,
                         control, alt, shift, meta, keyCode, charCode);
      k_evt.keyIdentifier = keyIdentifier;
    }
  } else if (document.createEventObject) {
    k_evt = document.createEventObject();
    k_evt.ctrlKey = control;
    k_evt.altKey = alt;
    k_evt.shiftKey = shift;
    k_evt.metaKey = meta;
    k_evt.keyCode = charCode;  // Emulate IE charcode-in-the-keycode onkeypress.
    k_evt.keyIdentifier = keyIdentifier;
  }
  k_evt.synthetic = true;
  return k_evt;
};

/*
 * Function to create a closure that will call each event handler in an array
 * whenever it gets called, passing its single argument through to the
 * sub-handlers.  The sub-handlers may either be functions or EventListeners.
 * This is generally expected to be used only through
 * o3djs.event.addEventListener.
 * @param {!Array.<*>} listenerSet an array of handlers.
 * @return {!function(*): void} a closure to be used to multiplex out
 *     event-handling.
 */
o3djs.event.createEventHandler = function(listenerSet) {
  return function(event) {
    var length = listenerSet.length;
    for (var index = 0; index < length; ++index) {
      var handler = listenerSet[index];
      if (typeof(handler.handleEvent) == 'function') {
        handler.handleEvent(event);
      } else {
        handler(event);
      }
    }
  }
};

/**
 * Convenience function to manage event listeners on the o3d plugin object,
 * intended as a drop-in replacement for the DOM addEventListener [with slightly
 * different arguments, but the same effect].
 * @param {!Element} pluginObject the html object where the o3d plugin lives,
 * which the caller probably obtained by calling getElementById or makeClients.
 * @param {string} type the event type on which to trigger, e.g. 'mousedown',
 * 'mousemove', etc.
 * @param {!Object} handler either a function or an EventListener object.
 */
o3djs.event.addEventListener = function(pluginObject, type, handler) {
  if (!handler || typeof(type) != 'string' ||
      (typeof(handler) != 'function' &&
       typeof(handler.handleEvent) != 'function')) {
    throw new Error('Invalid argument.');
  }
  pluginObject.o3d_eventRegistry = pluginObject.o3d_eventRegistry || [];
  var registry = pluginObject.o3d_eventRegistry;
  var listenerSet = registry[type];
  if (!listenerSet || listenerSet.length == 0) {
    listenerSet = registry[type] = [];
    pluginObject.client.setEventCallback(type,
        o3djs.event.createEventHandler(listenerSet));
  } else {
    for (var index in listenerSet) {
      if (listenerSet[index] == handler) {
        return;  // We're idempotent.
      }
    }
  }
  listenerSet.push(handler);
};


/**
 * Convenience function to manage event listeners on the o3d plugin object,
 * intended as a drop-in replacement for the DOM removeEventListener [with
 * slightly different arguments, but the same effect].
 * @param {!Element} pluginObject the <object> where the o3d plugin lives,
 * which the caller probably obtained by calling getElementById.
 * @param {string} type the event type on which the handler to be removed was to
 * trigger, e.g. 'mousedown', 'mousemove', etc.
 * @param {!Object} handler either a function or an EventListener object.
 */
o3djs.event.removeEventListener = function(pluginObject, type, handler) {
  var registry = pluginObject.o3d_eventRegistry;
  if (!registry) {
    return;
  }
  var listenerSet = registry[type];
  if (!listenerSet) {
    return;
  }
  for (var index in listenerSet) {
    if (listenerSet[index] == handler) {
      if (listenerSet.length == 1) {
        pluginObject.client.clearEventCallback(type);
      }
      listenerSet.splice(index, 1);
      break;
    }
  }
};
/*
 * Copyright 2009, Google Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */


/**
 * @fileoverview This file contains a class for displaying frames per second.
 */

o3djs.provide('o3djs.fps');

o3djs.require('o3djs.rendergraph');
o3djs.require('o3djs.canvas');
o3djs.require('o3djs.effect');
o3djs.require('o3djs.math');
o3djs.require('o3djs.primitives');

/**
 * A Module with a fps class for helping to easily display frames per second.
 * @namespace
 */
o3djs.fps = o3djs.fps || {};

/**
 * Number of frames to average over for computing FPS.
 * @type {number}
 */
o3djs.fps.NUM_FRAMES_TO_AVERAGE = 16;

/**
 * Colors used for each second of the performance bar.
 * @type {!Array.<!o3djs.math.Vector4>}
 */
o3djs.fps.PERF_BAR_COLORS = [
  [0, 0, 1, 1],
  [0, 1, 0, 1],
  [1, 1, 0, 1],
  [1, 0.5, 0, 1],
  [1, 0, 0, 1]];

/**
 * Generate a shader to be used by the pref quads.
 * @return {string}
 */
o3djs.fps.buildShaderString = function() {
  var p = o3djs.effect;

  var varyingDecls = p.BEGIN_OUT_STRUCT +
    p.VARYING + p.FLOAT4 + ' ' +
    p.VARYING_DECLARATION_PREFIX + 'position' +
    p.semanticSuffix('POSITION') + ';\n' +
    p.END_STRUCT;

  return '' +
    'uniform ' + p.MATRIX4 + ' worldViewProjection' +
    p.semanticSuffix('WORLDVIEWPROJECTION') + ';\n' +
    '\n' +
    p.BEGIN_IN_STRUCT +
    p.ATTRIBUTE + p.FLOAT4 + ' position' +
    p.semanticSuffix('POSITION') + ';\n' +
    p.END_STRUCT +
    '\n' +
    varyingDecls +
    '\n' +
    p.beginVertexShaderMain() +
    '  ' + p.VERTEX_VARYING_PREFIX + 'position = ' +
    p.mul(p.ATTRIBUTE_PREFIX + 'position',
        'worldViewProjection') + ';\n' +
    p.endVertexShaderMain() +
    '\n' +
    p.pixelShaderHeader() +
    'uniform ' + p.FLOAT4 + ' color;\n' +
    p.repeatVaryingDecls(varyingDecls) +
    p.beginPixelShaderMain() +
    p.endPixelShaderMain('color') +
    p.entryPoints() +
    p.matrixLoadOrder();
};


/**
 * Creates an object for displaying frames per second.
 *
 * You can use it like this.
 * <pre>
 * &lt;html&gt;&lt;body&gt;
 * &lt;script type="text/javascript" src="o3djs/base.js"&gt;
 * &lt;/script&gt;
 * &lt;script type="text/javascript"&gt;
 * o3djs.require('o3djs.util');
 * o3djs.require('o3djs.rendergraph');
 * o3djs.require('o3djs.fps');
 * window.onload = init;
 * window.onunload = uninit;
 *
 * var g_client;
 * var g_fpsManager;
 *
 * function init() {
 *   o3djs.base.makeClients(initStep2);
 * }
 *
 * function initStep2(clientElements) {
 *   var clientElement = clientElements[0];
 *   var g_client = clientElement.client;
 *   var pack = g_client.createPack();
 *   var viewInfo = o3djs.rendergraph.createBasicView(
 *       pack,
 *       g_client.root,
 *       g_client.renderGraphRoot);
 *   g_fpsManager = o3djs.fps.createFPSManager(pack,
 *                                             g_client.width,
 *                                             g_client.height,
 *                                             g_client.renderGraphRoot);
 *   g_client.setRenderCallback(onRender);
 * }
 *
 * function onrender(renderEvent) {
 *   g_fpsManager.update(renderEvent);
 * }
 *
 * function uninit() {
 *   if (g_client) {
 *     g_client.cleanup();
 *   }
 * }
 * &lt;/script&gt;
 * &lt;div id="o3d" style="width: 600px; height: 600px"&gt;&lt;/div&gt;
 * &lt;/body&gt;&lt;/html&gt;
 * </pre>
 *
 * @param {!o3d.Pack} pack Pack to create objects in.
 * @param {number} clientWidth width of client area.
 * @param {number} clientHeight Height of client area.
 * @param {!o3d.RenderNode} opt_parent RenderNode to use as parent for
 *     ViewInfo that will be used to render the FPS with.
 * @return {!o3djs.fps.FPSManager} The created FPSManager.
 */
o3djs.fps.createFPSManager = function(pack,
                                      clientWidth,
                                      clientHeight,
                                      opt_parent) {
  return new o3djs.fps.FPSManager(pack, clientWidth, clientHeight, opt_parent);
};

/**
 * A class for displaying frames per second.
 * @constructor
 * @param {!o3d.Pack} pack Pack to create objects in.
 * @param {number} clientWidth width of client area.
 * @param {number} clientHeight Height of client area.
 * @param {!o3d.RenderNode} opt_parent RenderNode to use as parent for
 *     ViewInfo that will be used to render the FPS with.
 */
o3djs.fps.FPSManager = function(pack, clientWidth, clientHeight, opt_parent) {
  // total time spent for last N frames.
  this.totalTime_ = 0.0;

  // total active time  for last N frames.
  this.totalActiveTime_ = 0.0;

  // elapsed time for last N frames.
  this.timeTable_ = [];

  // active time for last N frames.
  this.activeTimeTable_ = [];

  // where to record next elapsed time.
  this.timeTableCursor_ = 0;

  // Initialize the FPS elapsed time history table.
  for (var tt = 0; tt < o3djs.fps.NUM_FRAMES_TO_AVERAGE; ++tt) {
    this.timeTable_[tt] = 0.0;
    this.activeTimeTable_[tt] = 0.0;
  }

  // The root transform for this sub graph.
  this.root_ = pack.createObject('Transform');

  /**
   * The ViewInfo to display FPS.
   * @type {!o3djs.rendergraph.ViewInfo}
   */
  this.viewInfo = o3djs.rendergraph.createBasicView(pack,
                                                    this.root_,
                                                    opt_parent);
  this.viewInfo.root.priority = 100000;
  this.viewInfo.clearBuffer.clearColorFlag = false;

  this.viewInfo.zOrderedState.getStateParam('CullMode').value =
      o3djs.base.o3d.State.CULL_NONE;

  this.viewInfo.drawContext.view = o3djs.math.matrix4.lookAt(
      [0, 0, 1],  // eye
      [0, 0, 0],  // target
      [0, 1, 0]); // up

  // create a view just for the FPS. That way it's indepdendent of other views.
  this.canvasLib_ = o3djs.canvas.create(pack,
                                        this.root_,
                                        this.viewInfo);

  this.paint_ = pack.createObject('CanvasPaint');

  /**
   * The quad used to display the FPS.
   *
   */
  this.fpsQuad = this.canvasLib_.createXYQuad(0, 0, -1, 64, 32, true);

  // create a unit plane with a const color effect we can use to draw
  // rectangles.
  this.colorEffect_ = pack.createObject('Effect');
  this.colorEffect_.loadFromFXString(o3djs.fps.buildShaderString());
  this.colorMaterial_ = pack.createObject('Material');
  this.colorMaterial_.effect = this.colorEffect_;
  this.colorMaterial_.drawList = this.viewInfo.zOrderedDrawList;
  this.colorEffect_.createUniformParameters(this.colorMaterial_);
  this.colorMaterial_.getParam('color').value = [1, 1, 1, 1];
  this.colorQuadShape_ = o3djs.primitives.createPlane(
     pack,
     this.colorMaterial_,
     1,
     1,
     1,
     1,
     [[1, 0, 0, 0],
      [0, 0, 1, 0],
      [0, -1, 0, 0],
      [0.5, 0.5, 0, 1]]);

  var barXOffset = 10;
  var barYOffset = 2;
  var barWidth = clientWidth - barXOffset * 2;
  var barHeight = 7;
  this.numPerfBars_ = o3djs.fps.PERF_BAR_COLORS.length - 1;
  this.perfBarRoot_ = pack.createObject('Transform');
  this.perfBarRoot_.parent = this.root_;
  this.perfBarBack_ = new o3djs.fps.ColorRect(
      pack, this.colorQuadShape_, this.perfBarRoot_,
      barXOffset, barYOffset, -3, barWidth, barHeight,
      [0, 0, 0, 1]);
  this.perfMarker_ = [];
  for (var ii = 0; ii < this.numPerfBars_; ++ii) {
    this.perfMarker_[ii] = new o3djs.fps.ColorRect(
        pack, this.colorQuadShape_, this.perfBarRoot_,
        barXOffset + barWidth / (this.numPerfBars_ + 1) * (ii + 1),
        barYOffset - 1, -1,
        1, barHeight + 2,
        [1, 1, 1, 1]);
  }
  this.perfBar_ = new o3djs.fps.ColorRect(
      pack, this.colorQuadShape_, this.perfBarRoot_,
      barXOffset + 1, barYOffset + 1, -2, 1, barHeight - 2,
      [1, 1, 0, 1]);
  this.perfBarWidth_ = barWidth - 2;
  this.perfBarHeight_ = barHeight - 2;
  this.perfBarXOffset_ = barXOffset;
  this.perfBarYOffset_ = barYOffset;

  // set the size and position.
  this.resize(clientWidth, clientHeight);
  this.setPosition(10, 10);
};

/**
 * Sets the position of the FPS display
 *
 * The position is in pixels assuming the size of the client matches the size
 * last set either on creation or with FPSManager.resize.
 *
 * @param {number} x The x position.
 * @param {number} y The y position.
 */
o3djs.fps.FPSManager.prototype.setPosition = function(x, y) {
  this.fpsQuad.transform.identity();
  this.fpsQuad.transform.translate(x, y, -1);
};

/**
 * Sets the visiblity of the fps display.
 * @param {boolean} visible true = visible.
 */
o3djs.fps.FPSManager.prototype.setVisible = function(visible) {
  this.viewInfo.root.active = visible;
};

/**
 * Sets the visibility of the performance bar.
 * @param {boolean} visible true = visible.
 */
o3djs.fps.FPSManager.prototype.setPerfVisible = function(visible) {
  this.perfBarRoot_.visible = visible;
};

/**
 * Resizes the area for the FPS display.
 * Note: you must call this if your client area changes size.
 * @param {number} clientWidth width of client area.
 * @param {number} clientHeight height of client area.
 */
o3djs.fps.FPSManager.prototype.resize = function(clientWidth, clientHeight) {
  this.viewInfo.drawContext.projection = o3djs.math.matrix4.orthographic(
      0 + 0.5,
      clientWidth + 0.5,
      clientHeight + 0.5,
      0 + 0.5,
      0.001,
      1000);

  var barWidth = clientWidth - this.perfBarXOffset_ * 2;
  this.perfBarBack_.setSize(barWidth, this.perfBarHeight_);
  for (var ii = 0; ii < this.numPerfBars_; ++ii) {
    this.perfMarker_[ii].setPosition(
      this.perfBarXOffset_ + barWidth / (this.numPerfBars_ + 1) * (ii + 1),
      this.perfBarYOffset_ - 1);
  }
  this.perfBarWidth_ = barWidth - 2;
};

/**
 * Updates the fps display.
 * You must call this every frame to update the FPS display.
 *
 * <pre>
 * ...
 * client.setRenderCallback(onRender);
 * ...
 * function onRender(renderEvent) {
 *   myFpsManager.update(renderEvent);
 * }
 * </pre>
 *
 * @param {!o3d.RenderEvent} renderEvent The object passed into the render
 *     callback.
 */
o3djs.fps.FPSManager.prototype.update = function(renderEvent) {
  var elapsedTime = renderEvent.elapsedTime;
  var activeTime = renderEvent.activeTime;
  // Keep the total time and total active time for the last N frames.
  this.totalTime_ += elapsedTime - this.timeTable_[this.timeTableCursor_];
  this.totalActiveTime_ +=
      activeTime - this.activeTimeTable_[this.timeTableCursor_];

  // Save off the elapsed time for this frame so we can subtract it later.
  this.timeTable_[this.timeTableCursor_] = elapsedTime;
  this.activeTimeTable_[this.timeTableCursor_] = activeTime;

  // Wrap the place to store the next time sample.
  ++this.timeTableCursor_;
  if (this.timeTableCursor_ == o3djs.fps.NUM_FRAMES_TO_AVERAGE) {
    this.timeTableCursor_ = 0;
  }

  // Print the average frame rate for the last N frames as well as the
  // instantaneous frame rate.
  var fps = '' +
      Math.floor((1.0 / (this.totalTime_ /
                  o3djs.fps.NUM_FRAMES_TO_AVERAGE)) + 0.5) +
      ' : ' + Math.floor(1.0 / elapsedTime + 0.5);

  var canvas = this.fpsQuad.canvas;
  canvas.clear([0, 0, 0, 0]);

  var paint = this.paint_;

  canvas.saveMatrix();
  paint.setOutline(3, [0, 0, 0, 1]);
  paint.textAlign = o3djs.base.o3d.CanvasPaint.LEFT;
  paint.textSize = 12;
  paint.textTypeface = 'Arial';
  paint.color = [1, 1, 0, 1];
  canvas.drawText(fps, 2, 16, paint);
  canvas.restoreMatrix();

  this.fpsQuad.updateTexture();

  var frames = this.totalActiveTime_ / o3djs.fps.NUM_FRAMES_TO_AVERAGE /
               (1 / 60.0);
  var colorIndex = Math.min(frames, o3djs.fps.PERF_BAR_COLORS.length - 1);
  colorIndex = Math.floor(Math.max(colorIndex, 0));

  if (!isNaN(colorIndex)) {
    this.perfBar_.setColor(o3djs.fps.PERF_BAR_COLORS[colorIndex]);
    this.perfBar_.setSize(frames * this.perfBarWidth_ / this.numPerfBars_,
                          this.perfBarHeight_);
  }
};

/**
 * A Class the manages a color rect.
 * @constructor
 * @param {!o3d.Pack} pack Pack to create things in.
 * @param {!o3d.Shape} shape Shape to use for rectangle.
 * @param {!o3d.Transform} parent Transform to parent rect under.
 * @param {number} x initial x position.
 * @param {number} y initial y position.
 * @param {number} z initial z position.
 * @param {number} width initial width.
 * @param {number} height initial height.
 * @param {!o3djs.math.Vector4} color initial color.
 */
o3djs.fps.ColorRect = function(pack, shape, parent,
                               x, y, z, width, height, color) {
  this.transform_ = pack.createObject('Transform');
  this.colorParam_ = this.transform_.createParam('color', 'ParamFloat4');
  this.transform_.addShape(shape);
  this.transform_.parent = parent;
  this.width_ = 0;
  this.height_ = 0;
  this.x_ = 0;
  this.y_ = 0;
  this.z_ = z;
  this.setPosition(x, y);
  this.setSize(width, height);
  this.setColor(color);
};

/**
 * Updates the transform of this ColorRect
 * @private
 */
o3djs.fps.ColorRect.prototype.updateTransform_ = function() {
  this.transform_.identity();
  this.transform_.translate(this.x_, this.y_, this.z_);
  this.transform_.scale(this.width_, this.height_, 1);
};

/**
 * Sets the position of this ColorRect.
 * @param {number} x x position.
 * @param {number} y y position.
 */
o3djs.fps.ColorRect.prototype.setPosition = function(x, y) {
  this.x_ = x;
  this.y_ = y;
  this.updateTransform_();
};

/**
 * Sets the size of this ColorRect
 * @param {number} width width.
 * @param {number} height height.
 */
o3djs.fps.ColorRect.prototype.setSize = function(width, height) {
  this.width_ = width;
  this.height_ = height;
  this.updateTransform_();
};

/**
 * Sets the color of this ColorRect.
 * @param {!o3djs.math.Vector4} color initial color.
 */
o3djs.fps.ColorRect.prototype.setColor = function(color) {
  this.colorParam_.value = color;
};


/*
 * Copyright 2010, Google Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */


/**
 * @fileoverview This file provides GPU-accelerated rendering of 2D
 * vector graphics in 3D.
 */
o3djs.provide('o3djs.gpu2d');

o3djs.require('o3djs.base');

/**
 * A module providing GPU-accelerated rendering of 2D vector graphics
 * in 3D.
 * @namespace
 */
o3djs.gpu2d = o3djs.gpu2d || {};

/**
 * Creates a new Path, which holds one or more closed contours
 * composed of 2D primitives like lines, quadratic curves, and cubic
 * curves.
 * @param {!o3d.Pack} pack Pack in which geometry and materials
 *     associated with the curves will be created.
 * @param {!o3d.DrawList} drawList The DrawList on which the triangle
 *     mesh will be drawn. Typically this will be the
 *     zOrderedDrawList from an o3djs.rendergraph.ViewInfo.
 * @return {!o3djs.gpu2d.Path} The created Path.
 */
o3djs.gpu2d.createPath = function(pack,
                                  drawList) {
  return new o3djs.gpu2d.Path(pack, drawList);
};

/**
 * Constructs a new Path. Do not call this directly; use
 * o3djs.gpu2d.createPath instead.
 * @param {!o3d.Pack} pack Pack in which geometry and materials
 *     associated with the curves will be created.
 * @param {!o3d.DrawList} drawList The DrawList on which the triangle
 *     mesh will be drawn. Typically this will be the
 *     zOrderedDrawList.
 * @constructor
 */
o3djs.gpu2d.Path = function(pack, drawList) {
  /**
   * Pack in which curves' geometry and materials are created.
   * @type {!o3d.Pack}
   * @private
   */
  this.pack_ = pack;

  /**
   * DrawList in which curves' geometry and materials will be
   * rendered.
   * @type {!o3d.DrawList}
   * @private
   */
  this.drawList_ = drawList;

  /**
   * Internal object which manages the triangle mesh associated with
   * the curves.
   * @type {!o3d.ProcessedPath}
   * @private
   */
  this.path_ = pack.createObject('ProcessedPath');

  // Set up the Primitives in the ProcessedPath.
  //
  // The mesh is separated into two different regions. The exterior
  // region of the mesh is the portion containing the cubic curve
  // segments. It is this region whose alpha value is computed using
  // Loop and Blinn's shader. The interior region of the mesh is
  // simply filled with a constant alpha. The reason for the split is
  // that it is difficult to assign texture coordinates to cause Loop
  // and Blinn's shader to fill a region with constant alpha. While
  // there is some cost associated with switching shaders and
  // performing two draw calls, doing so simplifies the logic.

  // Create state objects so we can turn on alpha blending for the
  // exterior triangles. We also disable backface culling so that we
  // can view the vector shapes from both sides.
  var exteriorState = pack.createObject('State');
  exteriorState.getStateParam('o3d.AlphaBlendEnable').value = true;
  exteriorState.getStateParam('o3d.SourceBlendFunction').value =
      o3djs.base.o3d.State.BLENDFUNC_SOURCE_ALPHA;
  exteriorState.getStateParam('o3d.DestinationBlendFunction').value =
      o3djs.base.o3d.State.BLENDFUNC_INVERSE_SOURCE_ALPHA;
  exteriorState.getStateParam('o3d.CullMode').value =
      o3djs.base.o3d.State.CULL_NONE;

  var interiorState = pack.createObject('State');
  interiorState.getStateParam('o3d.CullMode').value =
      o3djs.base.o3d.State.CULL_NONE;

  // Create the materials for the exterior and interior regions.

  /**
   * The material for the exterior triangles, filled with Loop and
   * Blinn's shader.
   * @type {!o3d.Material}
   * @private
   */
  this.exteriorMaterial_ = pack.createObject('Material');
  this.exteriorMaterial_.name = 'ExteriorMaterial';
  this.exteriorMaterial_.state = exteriorState;
  this.exteriorMaterial_.drawList = drawList;

  /**
   * The material for the interior triangles, filled with a solid
   * shader.
   * @type {!o3d.Material}
   * @private
   */
  this.interiorMaterial_ = pack.createObject('Material');
  this.interiorMaterial_.name = 'InteriorMaterial';
  this.interiorMaterial_.state = interiorState;
  this.interiorMaterial_.drawList = drawList;

  /**
   * The Shape which is the transform graph's view of the Path.
   * @type {!o3d.Shape}
   */
  this.shape = pack.createObject('Shape');

  // Create the exterior region.
  var primitive = pack.createObject('Primitive');
  var streamBank = pack.createObject('StreamBank');
  var vertexBuffer = pack.createObject('VertexBuffer');
  // The coordinates of the triangles are 2D
  var vertices = vertexBuffer.createField('FloatField', 2);
  /**
   * The Field for the exterior vertices.
   * @type {!o3d.FloatField}
   * @private
   */
  this.exteriorVertices_ = vertices;
  // The (Loop/Blinn) texture coordinates are 3D
  var texcoords = vertexBuffer.createField('FloatField', 3);
  /**
   * The Field for the exterior texture coordinates.
   * @type {!o3d.FloatField}
   * @private
   */
  this.exteriorTexCoords_ = texcoords;
  streamBank.setVertexStream(o3djs.base.o3d.Stream.POSITION, 0, vertices, 0);
  streamBank.setVertexStream(o3djs.base.o3d.Stream.TEXCOORD, 0, texcoords, 0);
  primitive.streamBank = streamBank;
  primitive.primitiveType = o3djs.base.o3d.Primitive.TRIANGLELIST;
  primitive.material = this.exteriorMaterial_;
  primitive.owner = this.shape;
  /**
   * The Primitive for the exterior triangles.
   * @type {!o3d.Primitive}
   * @private
   */
  this.exteriorTriangles_ = primitive;

  // Create the interior region.
  primitive = pack.createObject('Primitive');
  streamBank = pack.createObject('StreamBank');
  vertexBuffer = pack.createObject('VertexBuffer');
  // The coordinates of the triangles are 2D
  vertices = vertexBuffer.createField('FloatField', 2);
  /**
   * The Field for the interior vertices.
   * @type {!o3d.FloatField}
   * @private
   */
  this.interiorVertices_ = vertices;
  streamBank.setVertexStream(o3djs.base.o3d.Stream.POSITION, 0, vertices, 0);
  primitive.streamBank = streamBank;
  primitive.primitiveType = o3djs.base.o3d.Primitive.TRIANGLELIST;
  primitive.material = this.interiorMaterial_;
  primitive.owner = this.shape;
  /**
   * The Primitive for the interior triangles.
   * @type {!o3d.Primitive}
   * @private
   */
  this.interiorTriangles_ = primitive;

  // Initialize the fill to a solid color.
  this.setFill(o3djs.gpu2d.createColor(pack, 0.0, 0.0, 0.0, 1.0));

  // Create draw elements for the shape.
  this.shape.createDrawElements(pack, null);
};

/**
 * Clears out any previously added segments or generated triangles
 * from this Path.
 */
o3djs.gpu2d.Path.prototype.clear = function() {
  this.path_.clear();
};

/**
 * Moves the pen to the given absolute X,Y coordinates. If a contour
 * isn't currently open on this path, one is opened.
 * @param {number} x the x coordinate to move to.
 * @param {number} y the y coordinate to move to.
 */
o3djs.gpu2d.Path.prototype.moveTo = function(x, y) {
  this.path_.moveTo(x, y);
};

/**
 * Draws a line from the current coordinates to the given absolute
 * X,Y coordinates.
 * @param {number} x the x coordinate to draw a line to.
 * @param {number} y the y coordinate to draw a line to.
 */
o3djs.gpu2d.Path.prototype.lineTo = function(x, y) {
  this.path_.lineTo(x, y);
};

/**
 * Draws a quadratic curve from the current coordinates through the
 * given control point and end point, specified in absolute
 * coordinates.
 * @param {number} cx the x coordinate of the quadratic's control point
 * @param {number} cy the y coordinate of the quadratic's control point
 * @param {number} x the x coordinate of the quadratic's end point
 * @param {number} y the y coordinate of the quadratic's end point
 */
o3djs.gpu2d.Path.prototype.quadraticTo = function(cx, cy, x, y) {
  this.path_.quadraticTo(cx, cy, x, y);
};

/**
 * Draws a cubic curve from the current coordinates through the
 * given control points and end point, specified in absolute
 * coordinates.
 * @param {number} c0x the x coordinate of the cubic's first control point
 * @param {number} c0y the y coordinate of the cubic's first control point
 * @param {number} c1x the x coordinate of the cubic's second control point
 * @param {number} c1y the y coordinate of the cubic's second control point
 * @param {number} x the x coordinate of the cubic's end point
 * @param {number} y the y coordinate of the cubic's end point
 */
o3djs.gpu2d.Path.prototype.cubicTo = function(c0x, c0y, c1x, c1y, x, y) {
  this.path_.cubicTo(c0x, c0y, c1x, c1y, x, y);
};

/**
 * Closes the current contour on this Path.
 */
o3djs.gpu2d.Path.prototype.close = function() {
  this.path_.close();
};

/**
 * Updates the triangle mesh associated with this Path. Call this
 * after adding any new segments to the Path.
 */
o3djs.gpu2d.Path.prototype.update = function() {
  this.path_.createMesh(this.exteriorVertices_,
                        this.exteriorTexCoords_,
                        this.interiorVertices_);
  var numVertices = this.exteriorVertices_.buffer.numElements;
  if (numVertices == 1) {
    this.exteriorTriangles_.numberVertices = 0;
    this.exteriorTriangles_.numberPrimitives = 0;
  } else {
    this.exteriorTriangles_.numberVertices = numVertices;
    this.exteriorTriangles_.numberPrimitives = numVertices / 3;
  }
  numVertices = this.interiorVertices_.buffer.numElements;
  if (numVertices == 1) {
    this.interiorTriangles_.numberVertices = 0;
    this.interiorTriangles_.numberPrimitives = 0;
  } else {
    this.interiorTriangles_.numberVertices = numVertices;
    this.interiorTriangles_.numberPrimitives = numVertices / 3;
  }
};

/**
 * Sets the polygon offset parameters for the triangles associated
 * with this Path.
 * @param {number} slopeFactor polygon offset slope factor.
 * @param {number} depthBias polygon offset depth bias.
 */
o3djs.gpu2d.Path.prototype.setPolygonOffset = function(slopeFactor,
                                                       depthBias) {
  this.exteriorMaterial_.state.getStateParam('o3d.PolygonOffset1').value =
      slopeFactor;
  this.exteriorMaterial_.state.getStateParam('o3d.PolygonOffset2').value =
      depthBias;
  this.interiorMaterial_.state.getStateParam('o3d.PolygonOffset1').value =
      slopeFactor;
  this.interiorMaterial_.state.getStateParam('o3d.PolygonOffset2').value =
      depthBias;
}

//----------------------------------------------------------------------
// Fills

/**
 * Sets the fill for this Path.
 * @param {!o3djs.gpu2d.Fill} fill the fill for this Path.
 */
o3djs.gpu2d.Path.prototype.setFill = function(fill) {
  if (this.fill_) {
    this.fill_.detach_(this);
  }
  this.interiorMaterial_.effect = fill.interiorEffect;
  this.exteriorMaterial_.effect = fill.exteriorEffect;
  this.fill_ = fill;
  fill.attach_(this);
};

/**
 * Base class for all Fills. Do not call this directly; use, for
 * example, o3djs.gpu2d.createColor instead.
 * @param {!o3d.Pack} pack the Pack in which to create materials.
 * @constructor
 */
o3djs.gpu2d.Fill = function(pack) {
  this.pack_ = pack;
  this.attachedPaths_ = [];
};

/**
 * Attaches this Fill to the given path.
 * @param {!o3djs.gpu2d.Path} path Path to attach the fill to.
 * @private
 */
o3djs.gpu2d.Fill.prototype.attach_ = function(path) {
  if (this.attachedPaths_.indexOf(path) < 0)
    this.attachedPaths_.push(path);
  this.apply_(path);
};

/**
 * Detaches this Fill from the given path.
 * @param {!o3djs.gpu2d.Path} path Path to detach the fill from.
 * @private
 */
o3djs.gpu2d.Fill.prototype.detach_ = function(path) {
  var idx = this.attachedPaths_.indexOf(path);
  if (idx >= 0)
    this.attachedPaths_.splice(idx, idx);
};

/**
 * Applies this Fill to all attached paths.
 * @private
 */
o3djs.gpu2d.Fill.prototype.applyToPaths_ = function() {
  for (var i = 0; i < this.attachedPaths_.length; i++) {
    this.apply_(this.attachedPaths_[i]);
  }
};

/**
 * Base "apply" operation for fills -- a no-op.
 * @private
 */
o3djs.gpu2d.Fill.prototype.apply_ = function(path) {
};

/**
 * A class for a solid color fill. Do not call this directly; use
 * o3djs.gpu2d.createColor instead.
 * @param {!o3d.Pack} pack the Pack in which to create materials.
 * @constructor
 * @extends {o3djs.gpu2d.Fill}
 */
o3djs.gpu2d.Color = function(pack) {
  o3djs.gpu2d.Fill.call(this, pack);
  this.interiorEffect =
    o3djs.gpu2d.loadEffect_(pack, o3djs.gpu2d.FillTypes_.COLOR, true);
  this.exteriorEffect =
    o3djs.gpu2d.loadEffect_(pack, o3djs.gpu2d.FillTypes_.COLOR, false);
  this.r_ = 0.0;
  this.g_ = 0.0;
  this.b_ = 0.0;
  this.a_ = 1.0;
};

o3djs.base.inherit(o3djs.gpu2d.Color,
                   o3djs.gpu2d.Fill);

/**
 * Sets the color of this fill.
 * @param {number} r Red component (0.0 - 1.0).
 * @param {number} g Green component (0.0 - 1.0).
 * @param {number} b Blue component (0.0 - 1.0).
 * @param {number} a Alpha component (0.0 - 1.0).
 */
o3djs.gpu2d.Color.prototype.set = function(r, g, b, a) {
  this.r_ = r;
  this.g_ = g;
  this.b_ = b;
  this.a_ = a;
  this.applyToPaths_();
};

/**
 * Gets the value of the Color fill as an array.
 * @return {!o3d.Float4}
 */
o3djs.gpu2d.Color.prototype.get = function() {
  return [this.r_, this.g_, this.b_, this.a_];
};

/**
 * Applies this color to the given path.
 * @param {!o3djs.gpu2d.Path} path to apply the fill to.
 * @private
 */
o3djs.gpu2d.Color.prototype.apply_ = function(path) {
  this.applyToMaterial_(path.interiorMaterial_);
  this.applyToMaterial_(path.exteriorMaterial_);
};

/**
 * Applies this color to the given material
 * @param {!o3d.Material} material to apply the fill to.
 * @private
 */
o3djs.gpu2d.Color.prototype.applyToMaterial_ = function(material) {
  var paramName = 'color';
  var paramType = 'ParamFloat4';
  var param = material.getParam(paramName);
  if (!param) {
    param = material.createParam(paramName, paramType);
  }
  param.set(this.r_, this.g_, this.b_, this.a_);
};

/**
 * Creates a solid color fill.
 * @param {!o3d.Pack} pack the Pack in which to create materials.
 * @param {number} red Red component (0.0 - 1.0).
 * @param {number} green Green component (0.0 - 1.0).
 * @param {number} blue Blue component (0.0 - 1.0).
 * @param {number} alpha Alpha component (0.0 - 1.0).
 * @return {!o3djs.gpu2d.Color} The created Color.
 */
o3djs.gpu2d.createColor = function(pack, red, green, blue, alpha) {
  var result = new o3djs.gpu2d.Color(pack);
  result.set(red, green, blue, alpha);
  return result;
};

//----------------------------------------------------------------------
// Shaders and effects

// TODO(kbr): antialiasing in the Cg backend is not supported yet
// because the ddx and ddy instructions are not part of the shader
// model 2.0. On Windows we could easily upgrade to ps2.0a, but on Mac
// and Linux there isn't an easy upgrade path from ARBVP1.0 and
// ARBFP1.0 which incorporates these instructions.
//
// The solution within O3D is to compute the gradients using the
// closed-form solution in Loop and Blinn's SIGGRAPH '05 paper. This
// requires computation of the Psi matrix per vertex. In GLSL this is
// not necessary; derivative instructions are always available there.

/**
 * Generates the source for the shader used on the exterior triangles
 * of the shape -- the ones that evaluate the curve function.
 * @param {boolean} antialias whether to enable antialiasing.
 * @param {string} fillUniforms the uniforms for the fill.
 * @param {string} fillSource the source code snippet for the fill.
 * @return {string}
 * @private
 */
o3djs.gpu2d.generateLoopBlinnShaderSource_ = function(antialias,
                                                      fillUniforms,
                                                      fillSource) {
  if (o3djs.base.glsl) {
    var result = '' +
      '// Vertex shader\n' +
      'uniform mat4 worldViewProjection;\n' +
      '\n' +
      'attribute vec2 position;\n' +
      'attribute vec3 texCoord0;\n' +
      '\n' +
      'varying vec3 klm;\n' +
      '\n' +
      'void main() {\n' +
      '  // TODO(kbr): figure out why this multiplication needs to be\n' +
      '  // transposed compared to the Cg version.\n' +
      '  gl_Position = worldViewProjection * vec4(position, 0.0, 1.0);\n' +
      '  klm = texCoord0;\n' +
      '}\n' +
      '// #o3d SplitMarker\n' +
      '// Fragment shader\n' +
      'varying vec3 klm;\n' +
      fillUniforms +
      'void main() {\n';
    var alphaComputation;
    if (antialias) {
      alphaComputation = '' +
        '  // Gradients\n' +
        '  vec3 px = dFdx(klm);\n' +
        '  vec3 py = dFdy(klm);\n' +
        '\n' +
        '  // Chain rule\n' +
        '  float k2 = klm.x * klm.x;\n' +
        '  float c = k2 * klm.x - klm.y * klm.z;\n' +
        '  float k23 = 3.0 * k2;\n' +
        '  float cx = k23 * px.x - klm.z * px.y - klm.y * px.z;\n' +
        '  float cy = k23 * py.x - klm.z * py.y - klm.y * py.z;\n' +
        '\n' +
        '  // Signed distance\n' +
        '  float sd = c / sqrt(cx * cx + cy * cy);\n' +
        '\n' +
        '  // Linear alpha\n' +
        '  // TODO(kbr): figure out why this needs to be\n' +
        '  // negated compared to Cg version, and also why\n' +
        '  // we need an adjustment by +1.0 for it to look good.\n' +
        '  // float alpha = clamp(0.5 - sd, 0.0, 1.0);\n' +
        '  float alpha = clamp(sd + 0.5, 0.0, 1.0);\n';
    } else {
      alphaComputation = '' +
        '  float t = klm.x * klm.x * klm.x - klm.y * klm.z;\n' +
        '  float alpha = clamp(sign(t), 0.0, 1.0);\n';
    }
    return result + alphaComputation +
      '\n' +
      fillSource +
      '}\n' +
      '\n' +
      '// #o3d MatrixLoadOrder RowMajor\n';
  } else {
    antialias = false;  // See above why
    var result = '' +
      'uniform float4x4 worldViewProjection : WORLDVIEWPROJECTION;\n' +
      fillUniforms +
      '\n' +
      'struct VertexShaderInput {\n' +
      '  float2 position : POSITION;\n' +
      '  float3 klm : TEXCOORD0;\n' +
      '};\n' +
      '\n' +
      'struct PixelShaderInput {\n' +
      '  float4 position : POSITION;\n' +
      '  float3 klm : TEXCOORD0;\n' +
      '};\n' +
      '\n' +
      'PixelShaderInput vertexShaderFunction(VertexShaderInput input) {\n' +
      '  PixelShaderInput output;\n' +
      '\n' +
      '  output.position = mul(float4(input.position, 0, 1),\n' +
      '                        worldViewProjection);\n' +
      '  output.klm = input.klm;\n' +
      '  return output;\n' +
      '}\n' +
      '\n' +
      'float4 pixelShaderFunction(PixelShaderInput input) : COLOR {\n' +
      '  float3 klm = input.klm;\n';
    var alphaComputation;
    if (antialias) {
      alphaComputation = '' +
        '  // Gradients\n' +
        '  float3 px = ddx(input.klm);\n' +
        '  float3 py = ddy(input.klm);\n' +
        '\n' +
        '  // Chain rule\n' +
        '  float k2 = klm.x * klm.x;\n' +
        '  float c = k2 * klm.x - klm.y * klm.z;\n' +
        '  float k23 = 3.0 * k2;\n' +
        '  float cx = k23 * px.x - klm.z * px.y - klm.y * px.z;\n' +
        '  float cy = k23 * py.x - klm.z * py.y - klm.y * py.z;\n' +
        '\n' +
        '  // Signed distance\n' +
        '  float sd = c / sqrt(cx * cx + cy * cy);\n' +
        '\n' +
        '  // Linear alpha\n' +
        '  float alpha = clamp(0.5 - sd, 0.0, 1.0);\n';
    } else {
      alphaComputation = '' +
        '  float t = klm.x * klm.x * klm.x - klm.y * klm.z;\n' +
        '  float alpha = clamp(sign(t), 0.0, 1.0);\n';
    }

    return result + alphaComputation +
      '\n' +
      fillSource +
      '}\n' +
      '\n' +
      '// #o3d VertexShaderEntryPoint vertexShaderFunction\n' +
      '// #o3d PixelShaderEntryPoint pixelShaderFunction\n' +
      '// #o3d MatrixLoadOrder RowMajor\n';
  }
};

/**
 * Generates the source for the shader used on the interior triangles
 * of the shape.
 * @param {string} fillUniforms the uniforms for the fill.
 * @param {string} fillSource the source code snippet for the fill.
 * @return {string}
 * @private
 */
o3djs.gpu2d.generateSolidShaderSource_ = function(fillUniforms, fillSource) {
  if (o3djs.base.glsl) {
    var result = '' +
      '// Vertex shader\n' +
      'uniform mat4 worldViewProjection;\n' +
      '\n' +
      'attribute vec2 position;\n' +
      '\n' +
      'void main() {\n' +
      '  // TODO(kbr): figure out why this multiplication needs to be\n' +
      '  // transposed compared to the Cg version.\n' +
      '  gl_Position = worldViewProjection * vec4(position, 0.0, 1.0);\n' +
      '}\n' +
      '// #o3d SplitMarker\n' +
      '// Fragment shader\n' +
      fillUniforms +
      'void main() {\n' +
      '  float alpha = 1.0;\n' +
      fillSource +
      '}\n' +
      '\n' +
      '// #o3d MatrixLoadOrder RowMajor\n';
    return result;
  } else {
    var result = '' +
      'uniform float4x4 worldViewProjection : WORLDVIEWPROJECTION;\n' +
      fillUniforms +
      '\n' +
      'struct VertexShaderInput {\n' +
      '  float2 position : POSITION;\n' +
      '};\n' +
      '\n' +
      'struct PixelShaderInput {\n' +
      '  float4 position : POSITION;\n' +
      '};\n' +
      '\n' +
      'PixelShaderInput vertexShaderFunction(VertexShaderInput input) {\n' +
      '  PixelShaderInput output;\n' +
      '\n' +
      '  output.position = mul(float4(input.position, 0, 1),\n' +
      '                        worldViewProjection);\n' +
      '  return output;\n' +
      '}\n' +
      '\n' +
      'float4 pixelShaderFunction(PixelShaderInput input) : COLOR {\n' +
      '  float alpha = 1.0;\n' +
      fillSource +
      '}\n' +
      '\n' +
      '// #o3d VertexShaderEntryPoint vertexShaderFunction\n' +
      '// #o3d PixelShaderEntryPoint pixelShaderFunction\n' +
      '// #o3d MatrixLoadOrder RowMajor\n';
    return result;
  }
};

/**
 * Enum for the types of fills.
 * @enum
 * @private
 */
o3djs.gpu2d.FillTypes_ = {
  COLOR: 0
};

/**
 * Shader code for the various Cg fills, indexed by FillTypes_.
 * @type {!Array.<{uniforms: string, source: string}>}
 * @private
 */
o3djs.gpu2d.FILL_CODE_CG_ = [
  { uniforms:
      'uniform float4 color;\n',
    source:
      'return float4(color.r, color.g, color.b, color.a * alpha);\n'
  }
];

/**
 * Shader code for the various fills, indexed by FillTypes_.
 * @type {!Array.<{uniforms: string, source: string}>}
 * @private
 */
o3djs.gpu2d.FILL_CODE_GLSL_ = [
  { uniforms:
      'uniform vec4 color;\n',
    source:
      'gl_FragColor = vec4(color.r, color.g, color.b, color.a * alpha);\n'
  }
];

/**
 * Cache of effects indexed by pack's client ID. Each entry is an
 * array indexed by fill type.
 * @type {!Array.<!Array.<!o3d.Effect>>}
 * @private
 */
o3djs.gpu2d.interiorEffectCache_ = [];

/**
 * Cache of effects indexed by pack's client ID. Each entry is an
 * array indexed by fill type.
 * @type {!Array.<!Array.<!o3d.Effect>>}
 * @private
 */
o3djs.gpu2d.exteriorEffectCache_ = [];

/**
 * Loads a fill effect for a Path.
 * @param {!o3d.Pack} pack the Pack in which to create materials.
 * @param {o3djs.gpu2d.FillTypes_} fillType the fill type to create.
 * @param {boolean} interior whether this effect is filling the solid
 *     interior portion of the shape or the exterior region containing
 *     the curves.
 * @return {!o3d.Effect}
 * @private
 */
o3djs.gpu2d.loadEffect_ = function(pack, fillType, interior) {
  var effectCache;
  if (interior) {
    effectCache = o3djs.gpu2d.interiorEffectCache_;
  } else {
    effectCache = o3djs.gpu2d.exteriorEffectCache_;
  }
  var effectList = o3djs.gpu2d.getEffectList_(pack, effectCache);
  var effect = effectList[fillType];
  if (!effect) {
    effect = pack.createObject('Effect');
    var result = false;
    var sourceSnippets;
    if (o3djs.base.glsl) {
      sourceSnippets = o3djs.gpu2d.FILL_CODE_GLSL_[fillType];
    } else {
      sourceSnippets = o3djs.gpu2d.FILL_CODE_CG_[fillType];
    }
    if (interior) {
      result = effect.loadFromFXString(
          o3djs.gpu2d.generateSolidShaderSource_(sourceSnippets.uniforms,
                                                 sourceSnippets.source));
    } else {
      result = effect.loadFromFXString(
          o3djs.gpu2d.generateLoopBlinnShaderSource_(true,
                                                     sourceSnippets.uniforms,
                                                     sourceSnippets.source));
    }
    if (!result) {
      alert('Error loading shader: interior = ' + interior);
    }
    effectList[fillType] = effect;
  }
  return effect;
};

/**
 * Fetches and/or creates the effect list for a given pack from the
 * passed effect cache.
 * @param {!o3d.Pack} pack the Pack in which to create materials.
 * @param {!Array.<!Array.<!o3d.Effect>>} effectCache the effect cache.
 * @return {!Array.<o3d.Effect>}
 * @private
 */
o3djs.gpu2d.getEffectList_ = function(pack, effectCache) {
  var list = effectCache[pack.clientId];
  if (!list) {
    list = [];
    effectCache[pack.clientId] = list;
  }
  return list;
};

/*
 * Copyright 2009, Google Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */


/**
 * @fileoverview This file contains various functions and class for io.
 */

o3djs.provide('o3djs.io');

o3djs.require('o3djs.texture');


/**
 * A Module with various io functions and classes.
 * @namespace
 */
o3djs.io = o3djs.io || {};

/**
 * Creates a LoadInfo object.
 * @param {(!o3d.ArchiveRequest|!o3d.FileRequest|!XMLHttpRequest)} opt_request
 *     The request to watch.
 * @param {boolean} opt_hasStatus true if opt_request is a
 *     o3d.ArchiveRequest vs for example an o3d.FileRequest or an
 *     XMLHttpRequest.
 * @return {!o3djs.io.LoadInfo} The new LoadInfo.
 * @see o3djs.io.LoadInfo
 */
o3djs.io.createLoadInfo = function(opt_request, opt_hasStatus) {
  return new o3djs.io.LoadInfo(opt_request, opt_hasStatus);
};

/**
 * A class to help with progress reporting for most loading utilities.
 *
 * Example:
 * <pre>
 * var g_loadInfo = null;
 * g_id = window.setInterval(statusUpdate, 500);
 * g_loadInfo = o3djs.scene.loadScene(client, pack, parent,
 *                                    'http://google.com/somescene.o3dtgz',
 *                                    callback);
 *
 * function callback(pack, parent, exception) {
 *   g_loadInfo = null;
 *   window.clearInterval(g_id);
 *   if (!exception) {
 *     // do something with scene just loaded
 *   }
 * }
 *
 * function statusUpdate() {
 *   if (g_loadInfo) {
 *     var progress = g_loadInfo.getKnownProgressInfoSoFar();
 *     document.getElementById('loadstatus').innerHTML = progress.percent;
 *   }
 * }
 * </pre>
 *
 * @constructor
 * @param {(!o3d.ArchiveRequest|!o3d.FileRequest|!XMLHttpRequest)} opt_request
 *     The request to watch.
 * @param {boolean} opt_hasStatus true if opt_request is a
 *     o3d.ArchiveRequest vs for example an o3d.FileRequest or an
 *     XMLHttpRequest.
 * @see o3djs.scene.loadScene
 * @see o3djs.io.loadArchive
 * @see o3djs.io.loadTexture
 * @see o3djs.loader.Loader
 */
o3djs.io.LoadInfo = function(opt_request, opt_hasStatus) {
  this.request_ = opt_request;
  this.hasStatus_ = opt_hasStatus;
  this.streamLength_ = 0;  // because the request may have been freed.
  this.children_ = [];
};

/**
 * Adds another LoadInfo as a child of this LoadInfo so they can be
 * managed as a group.
 * @param {!o3djs.io.LoadInfo} loadInfo The child LoadInfo.
 */
o3djs.io.LoadInfo.prototype.addChild = function(loadInfo) {
  this.children_.push(loadInfo);
};

/**
 * Marks this LoadInfo as finished.
 */
o3djs.io.LoadInfo.prototype.finish = function() {
  if (this.request_) {
    if (this.hasStatus_) {
      this.streamLength_ = this.request_.streamLength;
    }
    this.request_ = null;
  }
};

/**
 * Gets the total bytes that will be streamed known so far.
 * If you are only streaming 1 file then this will be the info for that file but
 * if you have queued up many files using an o3djs.loader.Loader only a couple of
 * files are streamed at a time meaning that the size is not known for files
 * that have yet started to download.
 *
 * If you are downloading many files for your application and you want to
 * provide a progress status you have about 4 options
 *
 * 1) Use LoadInfo.getTotalBytesDownloaded() /
 * LoadInfo.getTotalKnownBytesToStreamSoFar() and just be aware the bar will
 * grown and then shrink as new files start to download and their lengths
 * become known.
 *
 * 2) Use LoadInfo.getTotalRequestsDownloaded() /
 * LoadInfo.getTotalKnownRequestsToStreamSoFar() and be aware the granularity
 * is not all that great since it only reports fully downloaded files. If you
 * are downloading a bunch of small files this might be ok.
 *
 * 3) Put all your files in one archive. Then there will be only one file and
 * method 1 will work well.
 *
 * 4) Figure out the total size in bytes of the files you will download and put
 * that number in your application, then use LoadInfo.getTotalBytesDownloaded()
 * / MY_APPS_TOTAL_BYTES_TO_DOWNLOAD.
 *
 * @return {number} The total number of currently known bytes to be streamed.
 */
o3djs.io.LoadInfo.prototype.getTotalKnownBytesToStreamSoFar = function() {
  if (!this.streamLength_ && this.request_ && this.hasStatus_) {
    this.streamLength_ = this.request_.streamLength;
  }
  var total = this.streamLength_;
  for (var cc = 0; cc < this.children_.length; ++cc) {
    total += this.children_[cc].getTotalKnownBytesToStreamSoFar();
  }
  return total;
};

/**
 * Gets the total bytes downloaded so far.
 * @return {number} The total number of currently known bytes to be streamed.
 */
o3djs.io.LoadInfo.prototype.getTotalBytesDownloaded = function() {
  var total = (this.request_ && this.hasStatus_) ?
              this.request_.bytesReceived : this.streamLength_;
  for (var cc = 0; cc < this.children_.length; ++cc) {
    total += this.children_[cc].getTotalBytesDownloaded();
  }
  return total;
};

/**
 * Gets the total streams that will be download known so far.
 * We can't know all the streams since you could use an o3djs.loader.Loader
 * object, request some streams, then call this function, then request some
 * more.
 *
 * See LoadInfo.getTotalKnownBytesToStreamSoFar for details.
 * @return {number} The total number of requests currently known to be streamed.
 * @see o3djs.io.LoadInfo.getTotalKnownBytesToStreamSoFar
 */
o3djs.io.LoadInfo.prototype.getTotalKnownRequestsToStreamSoFar = function() {
  var total = 1;
  for (var cc = 0; cc < this.children_.length; ++cc) {
    total += this.children_[cc].getTotalKnownRequestToStreamSoFar();
  }
  return total;
};

/**
 * Gets the total requests downloaded so far.
 * @return {number} The total requests downloaded so far.
 */
o3djs.io.LoadInfo.prototype.getTotalRequestsDownloaded = function() {
  var total = this.request_ ? 0 : 1;
  for (var cc = 0; cc < this.children_.length; ++cc) {
    total += this.children_[cc].getTotalRequestsDownloaded();
  }
  return total;
};

/**
 * Gets progress info.
 * This is commonly formatted version of the information available from a
 * LoadInfo.
 *
 * See LoadInfo.getTotalKnownBytesToStreamSoFar for details.
 * @return {{percent: number, downloaded: string, totalBytes: string,
 *     base: number, suffix: string}} progress info.
 * @see o3djs.io.LoadInfo.getTotalKnownBytesToStreamSoFar
 */
o3djs.io.LoadInfo.prototype.getKnownProgressInfoSoFar = function() {
  var percent = 0;
  var bytesToDownload = this.getTotalKnownBytesToStreamSoFar();
  var bytesDownloaded = this.getTotalBytesDownloaded();
  if (bytesToDownload > 0) {
    percent = Math.floor(bytesDownloaded / bytesToDownload * 100);
  }

  var base = (bytesToDownload < 1024 * 1024) ? 1024 : (1024 * 1024);

  return {
    percent: percent,
    downloaded: (bytesDownloaded / base).toFixed(2),
    totalBytes: (bytesToDownload / base).toFixed(2),
    base: base,
    suffix: (base == 1024 ? 'kb' : 'mb')}

};

/**
 * Loads text from an external file. This function is synchronous.
 * @param {string} url The url of the external file.
 * @return {string} the loaded text if the request is synchronous.
 */
o3djs.io.loadTextFileSynchronous = function(url) {
  o3djs.BROWSER_ONLY = true;

  var error = 'loadTextFileSynchronous failed to load url "' + url + '"';
  var request;
  if (!o3djs.base.IsMSIE() && window.XMLHttpRequest) {
    request = new XMLHttpRequest();
    if (request.overrideMimeType) {
      request.overrideMimeType('text/plain');
    }
  } else if (window.ActiveXObject) {
    request = new ActiveXObject('MSXML2.XMLHTTP.3.0');
  } else {
    throw 'XMLHttpRequest is disabled';
  }
  request.open('GET', url, false);
  request.send(null);
  if (request.readyState != 4) {
    throw error;
  }
  return request.responseText;
};

/**
 * Loads text from an external file. This function is asynchronous.
 * @param {string} url The url of the external file.
 * @param {function(string, *): void} callback A callback passed the loaded
 *     string and an exception which will be null on success.
 * @return {!o3djs.io.LoadInfo} A LoadInfo to track progress.
 */
o3djs.io.loadTextFile = function(url, callback) {
  o3djs.BROWSER_ONLY = true;

  var error = 'loadTextFile failed to load url "' + url + '"';
  var request;
  if (!o3djs.base.IsMSIE() && window.XMLHttpRequest) {
    request = new XMLHttpRequest();
    if (request.overrideMimeType) {
      request.overrideMimeType('text/plain');
    }
  } else if (window.ActiveXObject) {
    request = new ActiveXObject('MSXML2.XMLHTTP.3.0');
  } else {
    throw 'XMLHttpRequest is disabled';
  }
  var loadInfo = o3djs.io.createLoadInfo(request, false);
  request.open('GET', url, true);
  var finish = function() {
    if (request.readyState == 4) {
      var text = '';
      // HTTP reports success with a 200 status. The file protocol reports
      // success with zero. HTTP does not use zero as a status code (they
      // start at 100).
      // https://developer.mozilla.org/En/Using_XMLHttpRequest
      var success = request.status == 200 || request.status == 0;
      if (success) {
        text = request.responseText;
      }
      loadInfo.finish();
      callback(text, success ? null : 'could not load: ' + url);
    }
  };
  request.onreadystatechange = finish;
  request.send(null);
  return loadInfo;
};

/**
 * A ArchiveInfo object loads and manages an archive of files.
 * There are methods for locating a file by uri and for freeing
 * the archive.
 *
 * You can only read archives that have as their first file a file named
 * 'aaaaaaaa.o3d' the contents of the which is 'o3d'. This is to prevent O3D
 * from being used to read arbitrary tar gz files.
 *
 * Example:
 * <pre>
 * var loadInfo = o3djs.io.loadArchive(pack,
 *                                     'http://google.com/files.o3dtgz',
 *                                     callback);
 *
 * function callback(archiveInfo, exception) {
 *   if (!exception) {
 *     o3djs.texture.createTextureFromRawData(
 *         pack, archiveInfo.getFileByURI('logo.jpg'), true);
 *     o3djs.texture.createTextureFromRawData(
 *         pack, archiveInfo.getFileByURI('wood/oak.png'), true);
 *     o3djs.texture.createTextureFromRawData(
 *         pack, archiveInfo.getFileByURI('wood/maple.dds'), true);
 *     archiveInfo.destroy();
 *   } else {
 *     alert(exception);
 *   }
 * }
 * </pre>
 *
 * @constructor
 * @param {!o3d.Pack} pack Pack to create request in.
 * @param {string} url The url of the archive file.
 * @param {!function(!o3djs.io.ArchiveInfo, *): void} onFinished A
 *     callback that is called when the archive is finished loading and passed
 *     the ArchiveInfo and an exception which is null on success.
 */
o3djs.io.ArchiveInfo = function(pack, url, onFinished) {
  var that = this;

  /**
   * The list of files in the archive by uri.
   * @type {!Object}
   */
  this.files = {};

  /**
   * The pack used to create the archive request.
   * @type {!o3d.Pack}
   */
  this.pack = pack;

  /**
   * True if this archive has not be destroyed.
   * @type {boolean}
   */
  this.destroyed = false;

  this.request_ = null;

  /**
   * Records each RawData file as it comes in.
   * @private
   * @param {!o3d.RawData} rawData RawData from archive request.
   */
  function addFile(rawData) {
    that.files[rawData.uri] = rawData;
  }

  /**
   * The LoadInfo to track loading progress.
   * @type {!o3djs.io.LoadInfo}
   */
  this.loadInfo = o3djs.io.loadArchiveAdvanced(
      pack,
      url,
      addFile,
      function(request, exception) {
        that.request_ = request;
        onFinished(that, exception);
      });
};

/**
 * Releases all the RAW data associated with this archive. It does not release
 * any objects created from that RAW data.
 */
o3djs.io.ArchiveInfo.prototype.destroy = function() {
  if (!this.destroyed) {
    this.pack.removeObject(this.request_);
    this.destroyed = true;
    this.files = {};
  }
};

/**
 * Gets files by regular expression or wildcards from the archive.
 * @param {(string|!RegExp)} uri of file to get. Can have wildcards '*' and '?'.
 * @param {boolean} opt_caseInsensitive Only valid if it's a wildcard string.
 * @return {!Array.<!o3d.RawData>} An array of the matching RawDatas for
 *      the files matching or undefined if it doesn't exist.
 */
o3djs.io.ArchiveInfo.prototype.getFiles = function(uri,
                                                   opt_caseInsensitive) {
  if (!(uri instanceof RegExp)) {
    uri = uri.replace(/(\W)/g, '\\$&');
    uri = uri.replace(/\\\*/g, '.*');
    uri = uri.replace(/\\\?/g, '.');
    uri = new RegExp(uri, opt_caseInsensitive ? 'i' : '');
  }
  var files = [];
  for (var key in this.files) {
    if (uri.test(key)) {
      files.push(this.files[key]);
    }
  }

  return files;
};

/**
 * Gets a file by URI from the archive.
 * @param {string} uri of file to get.
 * @param {boolean} opt_caseInsensitive True to be case insensitive. Default
 *      false.
 * @return {(o3d.RawData|undefined)} The RawData for the file or undefined if
 *      it doesn't exist.
 */
o3djs.io.ArchiveInfo.prototype.getFileByURI = function(
    uri,
    opt_caseInsensitive) {
  if (opt_caseInsensitive) {
    uri = uri.toLowerCase();
    for (var key in this.files) {
      if (key.toLowerCase() == uri) {
        return this.files[key];
      }
    }
    return undefined;
  } else {
    return this.files[uri];
  }
};

/**
 * Loads an archive file.
 * When the entire archive is ready the onFinished callback will be called
 * with an ArchiveInfo for accessing the archive.
 *
 * @param {!o3d.Pack} pack Pack to create request in.
 * @param {string} url The url of the archive file.
 * @param {!function(!o3djs.io.ArchiveInfo, *): void} onFinished A
 *     callback that is called when the archive is successfully loaded and an
 *     Exception object which is null on success.
 * @return {!o3djs.io.LoadInfo} The a LoadInfo for tracking progress.
 * @see o3djs.io.ArchiveInfo
 */
o3djs.io.loadArchive = function(pack,
                                url,
                                onFinished) {
  var archiveInfo = new o3djs.io.ArchiveInfo(pack, url, onFinished);
  return archiveInfo.loadInfo;
};

/**
 * Loads an archive file. This function is asynchronous. This is a low level
 * version of o3djs.io.loadArchive which can be used for things like
 * progressive loading.
 *
 * @param {!o3d.Pack} pack Pack to create request in.
 * @param {string} url The url of the archive file.
 * @param {!function(!o3d.RawData): void} onFileAvailable A callback, taking a
 *     single argument 'data'. As each file is loaded from the archive, this
 *     function is called with the file's data.
 * @param {!function(!o3d.ArchiveRequest, *): void} onFinished
 *     A callback that is called when the archive is successfully loaded. It is
 *     passed the ArchiveRquest and null on success or a javascript exception on
 *     failure.
 * @return {!o3djs.io.LoadInfo} A LoadInfo for tracking progress.
 */
o3djs.io.loadArchiveAdvanced = function(pack,
                                        url,
                                        onFileAvailable,
                                        onFinished) {
  var error = 'loadArchive failed to load url "' + url + '"';
  var request = pack.createArchiveRequest();
  var loadInfo = o3djs.io.createLoadInfo(request, true);
  request.open('GET', url);
  request.onfileavailable = onFileAvailable;
  /**
   * @ignore
   */
  request.onreadystatechange = function() {
    if (request.done) {
      loadInfo.finish();
      var success = request.success;
      var exception = null;
      if (!success) {
        exception = request.error;
        if (!exception) {
          exception = 'unknown error loading archive';
        }
      }
      onFinished(request, exception);
    }
  };
  request.send();
  return loadInfo;
};

/**
 * Loads RawData.
 *
 * RawData is loaded asynchronously.
 *
 * @param {!o3d.Pack} pack Pack to create the request in.
 * @param {string} url URL of raw data to load.
 * @param {!function(!o3d.FileRequest, o3d.RawData, *): void} callback Callback
 *     when RawData is loaded. It will be passed the FileRequest, a RawData and
 *     an exception on error or null on success. The RawData is associated with
 *     the request so it will stay in memory until you free with request with
 *     pack.removeObject(request).
 * @return {!o3djs.io.LoadInfo} A LoadInfo to track progress.
 * @see o3djs.io.loadTexture
 * @see o3djs.io.loadBitmaps
 * @see o3djs.loader.createLoader
 */
o3djs.io.loadRawData = function(pack, url, callback) {
  var request = pack.createFileRequest('RAWDATA');
  var loadInfo = o3djs.io.createLoadInfo(
      /** @type {!o3d.FileRequest} */ (request),
      false);
  request.open('GET', url, true);
  /**
   * @ignore
   */
  request.onreadystatechange = function() {
    if (request.done) {
      var data = request.data;
      var success = request.success;
      var exception = request.error;
      loadInfo.finish();
      if (!success && !exception) {
          exception = 'unknown error loading RawData: ' + url;
      }
      callback(request, data, success ? null : exception);
    }
  };
  request.send();
  return loadInfo;
};

/**
 * Loads bitmaps.
 *
 * Bitmaps are loaded asynchronously.
 *
 * Example:
 * <pre>
 * var loadInfo = o3djs.io.loadBitamps(pack,
 *                                     'http://google.com/someimage.jpg',
 *                                     callback);
 *
 * function callback(bitmaps, exception) {
 *   if (!exception) {
 *     o3djs.texture.createTextureFromBitmaps(g_pack, bitmaps, true);
 *   } else {
 *     alert(exception);
 *   }
 * }
 * </pre>
 *
 *
 * @param {!o3d.Pack} pack Pack to load texture into.
 * @param {string} url URL of image to load.
 * @param {!function(!Array.<!o3d.Bitmap>, *): void} callback Callback when
 *     image is loaded. It will be passed an array of bitmaps and an exception
 *     on error or null on success.
 * @param {boolean} opt_generateMips Generate Mips. Default = true.
 * @return {!o3djs.io.LoadInfo} A LoadInfo to track progress.
 * @see o3djs.io.loadTexture
 * @see o3djs.loader.createLoader
 */
o3djs.io.loadBitmaps = function(pack, url, callback, opt_generateMips) {
  if (typeof opt_generateMips === 'undefined') {
    opt_generateMips = true;
  }
  return o3djs.io.loadRawData(pack, url, function(request, rawData, exception) {
    var bitmaps = [];
    if (!exception) {
      bitmaps = pack.createBitmapsFromRawData(rawData);
      pack.removeObject(request);
    }
    callback(bitmaps, exception);
  });
};

/**
 * Loads a texture.
 *
 * Textures are loaded asynchronously.
 *
 * Example:
 * <pre>
 * var loadInfo = o3djs.io.loadTexture(pack,
 *                                     'http://google.com/someimage.jpg',
 *                                     callback);
 *
 * function callback(texture, exception) {
 *   if (!exception) {
 *     g_mySampler.texture = texture;
 *   } else {
 *     alert(exception);
 *   }
 * }
 * </pre>
 *
 *
 * @param {!o3d.Pack} pack Pack to load texture into.
 * @param {string} url URL of texture to load.
 * @param {!function(o3d.Texture, *): void} callback Callback when
 *     texture is loaded. It will be passed the texture and an exception on
 *     error or null on success.
 * @param {boolean} opt_generateMips Generate Mips. Default = true.
 * @param {boolean} opt_flip Flip texture. Default = true.
 * @return {!o3djs.io.LoadInfo} A LoadInfo to track progress.
 * @see o3djs.io.loadBitmaps
 * @see o3djs.loader.createLoader
 */
o3djs.io.loadTexture = function(
    pack, url, callback, opt_generateMips, opt_flip) {
  function onLoaded(request, rawData, exception) {
    var texture = null;
    if (!exception) {
      texture = o3djs.texture.createTextureFromRawData(
          pack, rawData, opt_generateMips, opt_flip);
      pack.removeObject(request);
    }
    callback(texture, exception);
  };

  return o3djs.io.loadRawData(pack, url, onLoaded);
};


/*
 * Copyright 2009, Google Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */


/**
 * @fileoverview This file contains functions to create geometric primitives for
 * o3d.  It puts them in the "primitives" module on the o3djs object.
 *
 * For more information about o3d see http://code.google.com/p/o3d
 *
 *
 * Requires base.js
 */

o3djs.provide('o3djs.primitives');

o3djs.require('o3djs.math');

/**
 * A Module for creating primitives.
 * @namespace
 */
o3djs.primitives = o3djs.primitives || {};


/**
 * Sets the bounding box and zSortPoint for a primitive based on its vertices
 *
 * @param {!o3d.Primitive} primitive Primitive to set culling info for.
 */
o3djs.primitives.setCullingInfo = function(primitive) {
  var box = primitive.getBoundingBox(0);
  primitive.boundingBox = box;
  var minExtent = box.minExtent;
  var maxExtent = box.maxExtent;
  primitive.zSortPoint = o3djs.math.divVectorScalar(
      o3djs.math.addVector(minExtent, maxExtent), 2);
};

/**
 * Used to store the elements of a stream.
 * @param {number} numComponents The number of numerical components per
 *     element.
 * @param {!o3d.Stream.Semantic} semantic The semantic of the stream.
 * @param {number} opt_semanticIndex The semantic index of the stream.
 *     Defaults to zero.
 * @constructor
 */
o3djs.primitives.VertexStreamInfo = function(numComponents,
                                             semantic,
                                             opt_semanticIndex) {
  /**
   * The number of numerical components per element.
   * @type {number}
   */
  this.numComponents = numComponents;

  /**
   * The semantic of the stream.
   * @type {!o3d.Stream.Semantic}
   */
  this.semantic = semantic;

  /**
   * The semantic index of the stream.
   * @type {number}
   */
  this.semanticIndex = opt_semanticIndex || 0;

  /**
   * The elements of the stream.
   * @type {!Array.<number>}
   */
  this.elements = [];

  /**
   * Adds an element to this VertexStreamInfo. The number of values passed must
   * match the number of components for this VertexStreamInfo.
   * @param {number} value1 First value.
   * @param {number} opt_value2 Second value.
   * @param {number} opt_value3 Third value.
   * @param {number} opt_value4 Fourth value.
   */
  this.addElement = function(value1, opt_value2, opt_value3, opt_value4) { };

  /**
   * Sets an element on this VertexStreamInfo. The number of values passed must
   * match the number of components for this VertexStreamInfo.
   * @param {number} index Index of element to set.
   * @param {number} value1 First value.
   * @param {number} opt_value2 Second value.
   * @param {number} opt_value3 Third value.
   * @param {number} opt_value4 Fourth value.
   */
  this.setElement = function(
      index, value1, opt_value2, opt_value3, opt_value4) { };

  /**
   * Adds an element to this VertexStreamInfo. The number of values in the
   * vector must match the number of components for this VertexStreamInfo.
   * @param {!Array.<number>} vector Array of values for element.
   */
  this.addElementVector = function(vector) { };  // replaced below.

  /**
   * Sets an element on this VertexStreamInfo. The number of values in the
   * vector must match the number of components for this VertexStreamInfo.
   * @param {number} index Index of element to set.
   * @param {!Array.<number>} vector Array of values for element.
   */
  this.setElementVector = function(index, vector) { };  // replaced below.

  /**
   * Sets an element on this VertexStreamInfo. The number of values in the
   * vector will match the number of components for this VertexStreamInfo.
   * @param {number} index Index of element to set.
   * @return {!Array.<number>} Array of values for element.
   */
  this.getElementVector = function(index) { return []; };  // replaced below.

  switch (numComponents) {
    case 1:
      this.addElement = function(value) {
        this.elements.push(value);
      }
      this.getElement = function(index) {
        return this.elements[index];
      }
      this.setElement = function(index, value) {
        this.elements[index] = value;
      }
      break;
    case 2:
      this.addElement = function(value0, value1) {
        this.elements.push(value0, value1);
      }
      this.addElementVector = function(vector) {
        this.elements.push(vector[0], vector[1]);
      }
      this.getElementVector = function(index) {
        return this.elements.slice(index * numComponents,
                                   (index + 1) * numComponents);
      }
      this.setElement = function(index, value0, value1) {
        this.elements[index * numComponents + 0] = value0;
        this.elements[index * numComponents + 1] = value1;
      }
      this.setElementVector = function(index, vector) {
        this.elements[index * numComponents + 0] = vector[0];
        this.elements[index * numComponents + 1] = vector[1];
      }
      break;
    case 3:
      this.addElement = function(value0, value1, value2) {
        this.elements.push(value0, value1, value2);
      }
      this.addElementVector = function(vector) {
        this.elements.push(vector[0], vector[1], vector[2]);
      }
      this.getElementVector = function(index) {
        return this.elements.slice(index * numComponents,
                                   (index + 1) * numComponents);
      }
      this.setElement = function(index, value0, value1, value2) {
        this.elements[index * numComponents + 0] = value0;
        this.elements[index * numComponents + 1] = value1;
        this.elements[index * numComponents + 2] = value2;
      }
      this.setElementVector = function(index, vector) {
        this.elements[index * numComponents + 0] = vector[0];
        this.elements[index * numComponents + 1] = vector[1];
        this.elements[index * numComponents + 2] = vector[2];
      }
      break;
    case 4:
      this.addElement = function(value0, value1, value2, value3) {
        this.elements.push(value0, value1, value2, value3);
      }
      this.addElementVector = function(vector) {
        this.elements.push(vector[0], vector[1], vector[2], vector[3]);
      }
      this.getElementVector = function(index) {
        return this.elements.slice(index * numComponents,
                                   (index + 1) * numComponents);
      }
      this.setElement = function(index, value0, value1, value2, value3) {
        this.elements[index * numComponents + 0] = value0;
        this.elements[index * numComponents + 1] = value1;
        this.elements[index * numComponents + 2] = value2;
        this.elements[index * numComponents + 3] = value3;
      }
      this.setElementVector = function(index, vector) {
        this.elements[index * numComponents + 0] = vector[0];
        this.elements[index * numComponents + 1] = vector[1];
        this.elements[index * numComponents + 2] = vector[2];
        this.elements[index * numComponents + 3] = vector[3];
      }
      break;
    default:
      throw 'A stream must contain between 1 and 4 components';
  }
};

/**
 * Get the number of elements in the stream.
 * @return {number} The number of elements in the stream.
 */
o3djs.primitives.VertexStreamInfo.prototype.numElements = function() {
  return this.elements.length / this.numComponents;
};

/**
 * Create a VertexStreamInfo.
 * @param {number} numComponents The number of numerical components per
 *     element.
 * @param {!o3d.Stream.Semantic} semantic The semantic of the stream.
 * @param {number} opt_semanticIndex The semantic index of the stream.
 *     Defaults to zero.
 * @return {!o3djs.primitives.VertexStreamInfo} The new stream.
 */
o3djs.primitives.createVertexStreamInfo = function(numComponents,
                                                   semantic,
                                                   opt_semanticIndex) {
  return new o3djs.primitives.VertexStreamInfo(numComponents,
                                               semantic,
                                               opt_semanticIndex);
};

/**
 * VertexInfoBase. Used to store vertices and indices.
 * @constructor
 */
o3djs.primitives.VertexInfoBase = function() {
  this.streams = [];
  this.indices = [];
};

/**
 * Add a new stream to the VertexInfo, replacing it with a new empty one
 *     if it already exists.
 * @param {number} numComponents The number of components per vector.
 * @param {!o3d.Stream.Semantic} semantic The semantic of the stream.
 * @param {number} opt_semanticIndex The semantic index of the stream.
 *     Defaults to zero.
 * @return {!o3djs.primitives.VertexStreamInfo} The new stream.
 */
o3djs.primitives.VertexInfoBase.prototype.addStream = function(
    numComponents,
    semantic,
    opt_semanticIndex) {
  this.removeStream(semantic, opt_semanticIndex);
  var stream = o3djs.primitives.createVertexStreamInfo(
      numComponents,
      semantic,
      opt_semanticIndex);
  this.streams.push(stream);
  return stream;
};

/**
 * Find a stream in the VertexInfo.
 * @param {!o3d.Stream.Semantic} semantic The semantic of the stream.
 * @param {number} opt_semanticIndex The semantic index of the stream.
 *     Defaults to zero.
 * @return {o3djs.primitives.VertexStreamInfo} The stream or null if it
 *     is not present.
 */
o3djs.primitives.VertexInfoBase.prototype.findStream = function(
    semantic,
    opt_semanticIndex) {
  opt_semanticIndex = opt_semanticIndex || 0;
  for (var i = 0; i < this.streams.length; ++i) {
    if (this.streams[i].semantic === semantic &&
        this.streams[i].semanticIndex == opt_semanticIndex) {
      return this.streams[i];
    }
  }
  return null;
};

/**
 * Remove a stream from the VertexInfo. Does nothing if a matching stream
 * does not exist.
 * @param {!o3d.Stream.Semantic} semantic The semantic of the stream.
 * @param {number} opt_semanticIndex The semantic index of the stream.
 *     Defaults to zero.
 */
o3djs.primitives.VertexInfoBase.prototype.removeStream = function(
    semantic,
    opt_semanticIndex) {
  opt_semanticIndex = opt_semanticIndex || 0;
  for (var i = 0; i < this.streams.length; ++i) {
    if (this.streams[i].semantic === semantic &&
        this.streams[i].semanticIndex == opt_semanticIndex) {
      this.streams.splice(i, 1);
      return;
    }
  }
};

/**
 * Appends all of the information in the passed VertexInfo on to the
 * end of this one. This is useful for putting multiple primitives'
 * vertices, appropriately transformed, into a single Shape. Both
 * VertexInfo objects must contain the same number of streams, with
 * the same semantics and number of components.
 * @param {!o3djs.primitives.VertexInfoBase} info The VertexInfo whose
 *     information should be appended to this one.
 */
o3djs.primitives.VertexInfoBase.prototype.append = function(info) {
  if (this.streams.length == 0 && info.streams.length != 0) {
    // Special case
    for (var i = 0; i < info.streams.length; i++) {
      var srcStream = info.streams[i];
      var stream = this.addStream(srcStream.numComponents,
                                  srcStream.semantic,
                                  srcStream.semanticIndex);
      stream.elements = stream.elements.concat(srcStream.elements);
    }
    this.indices = this.indices.concat(info.indices);
    return;
  }

  // First verify that both have the same streams
  if (this.streams.length != info.streams.length) {
    throw 'Number of VertexInfoStreams did not match';
  }
  for (var i = 0; i < this.streams.length; i++) {
    var found = false;
    var semantic = this.streams[i].semantic;
    var numComponents = this.streams[i].numComponents;
    var semanticIndex = this.streams[i].semanticIndex;
    for (var j = 0; j < info.streams.length; j++) {
      var otherStream = info.streams[j];
      if (otherStream.semantic === semantic &&
          otherStream.numComponents == numComponents &&
          otherStream.semanticIndex == semanticIndex) {
        found = true;
        break;
      }
    }
    if (!found) {
      throw 'Did not find stream with semantic=' + semantic +
        ', numComponents=' + numComponents +
        ', and semantic index=' + semanticIndex +
        ' in given VertexInfo';
    }
  }

  // Compute the number of vertices currently in the shape
  var positionStream = this.findStream(o3djs.base.o3d.Stream.POSITION);
  if (!positionStream)
    throw 'POSITION stream is missing';
  var numVertices = positionStream.numElements();

  // Concatenate all VertexStreamInfos' data
  for (var i = 0; i < this.streams.length; i++) {
    var stream = this.streams[i];
    var srcStream = info.findStream(stream.semantic, stream.semanticIndex);
    stream.elements = stream.elements.concat(srcStream.elements);
  }

  // Concatenate and adjust indices
  for (var i = 0; i < info.indices.length; i++) {
    this.indices.push(info.indices[i] + numVertices);
  }
};

/**
 * Validates that all the streams contain the same number of elements, that
 * all the indices are within range and that a position stream is present.
 */
o3djs.primitives.VertexInfoBase.prototype.validate = function() {
  // Check the position stream is present.
  var positionStream = this.findStream(o3djs.base.o3d.Stream.POSITION);
  if (!positionStream)
    throw 'POSITION stream is missing';

  // Check all the streams have the same number of elements.
  var numElements = positionStream.numElements();
  for (var s = 0; s < this.streams.length; ++s) {
    if (this.streams[s].numElements() !== numElements) {
      throw 'Stream ' + s + ' contains ' + this.streams[s].numElements() +
          ' elements whereas the POSITION stream contains ' + numElements;
    }
  }

  // Check all the indices are in range.
  for (var i = 0; i < this.indices.length; ++i) {
    if (this.indices[i] < 0 || this.indices[i] >= numElements) {
      throw 'The index ' + this.indices[i] + ' is out of range [0, ' +
        numElements + ']';
    }
  }
};

/**
 * Reorients the vertices, positions and normals, of this vertexInfo by the
 * given matrix. In other words, it multiplies each vertex by the given matrix
 * and each normal by the inverse-transpose of the given matrix.
 * @param {!o3djs.math.Matrix4} matrix Matrix by which to multiply.
 */
o3djs.primitives.VertexInfoBase.prototype.reorient = function(matrix) {
  var math = o3djs.math;
  var matrixInverse = math.inverse(math.matrix4.getUpper3x3(matrix));

  for (var s = 0; s < this.streams.length; ++s) {
    var stream = this.streams[s];
    if (stream.numComponents == 3) {
      var numElements = stream.numElements();
      switch (stream.semantic) {
        case o3djs.base.o3d.Stream.POSITION:
          for (var i = 0; i < numElements; ++i) {
            stream.setElementVector(i,
                math.matrix4.transformPoint(matrix,
                    stream.getElementVector(i)));
          }
          break;
        case o3djs.base.o3d.Stream.NORMAL:
          for (var i = 0; i < numElements; ++i) {
            stream.setElementVector(i,
                math.matrix4.transformNormal(matrix,
                    stream.getElementVector(i)));
          }
          break;
        case o3djs.base.o3d.Stream.TANGENT:
        case o3djs.base.o3d.Stream.BINORMAL:
          for (var i = 0; i < numElements; ++i) {
            stream.setElementVector(i,
                math.matrix4.transformDirection(matrix,
                    stream.getElementVector(i)));
          }
          break;
      }
    }
  }
};

/**
 * Creates a shape from a VertexInfoBase
 * @param {!o3d.Pack} pack Pack to create objects in.
 * @param {!o3d.Material} material to use.
 * @param {!o3d.Primitive.PrimitiveType} primitiveType The type of primitive.
 * @return {!o3d.Shape} The created shape.
 */
o3djs.primitives.VertexInfoBase.prototype.createShapeByType = function(
    pack,
    material,
    primitiveType) {
  this.validate();

  var numIndices = this.indices.length;
  var numPrimitives;
  switch (primitiveType) {
    case o3djs.base.o3d.Primitive.POINTLIST:
      numPrimitives = numIndices / 1;
      break;
    case o3djs.base.o3d.Primitive.LINELIST:
      numPrimitives = numIndices / 2;
      break;
    case o3djs.base.o3d.Primitive.LINESTRIP:
      numPrimitives = numIndices - 1;
      break;
    case o3djs.base.o3d.Primitive.TRIANGLELIST:
      numPrimitives = numIndices / 3;
      break;
    case o3djs.base.o3d.Primitive.TRIANGLESTRIP:
    case o3djs.base.o3d.Primitive.TRIANGLEFAN:
      numPrimitives = numIndices - 2;
      break;
    default:
      throw 'unknown primitive type';
  }

  var positionStream = this.findStream(o3djs.base.o3d.Stream.POSITION);
  var numVertices = positionStream.numElements();

  // create a shape and primitive for the vertices.
  var shape = pack.createObject('Shape');
  var primitive = pack.createObject('Primitive');
  var streamBank = pack.createObject('StreamBank');
  primitive.owner = shape;
  primitive.streamBank = streamBank;
  primitive.material = material;
  primitive.numberPrimitives = numPrimitives;
  primitive.primitiveType = primitiveType;
  primitive.numberVertices = numVertices;
  primitive.createDrawElement(pack, null);

  // Calculate the tangent and binormal or provide defaults or fail if the
  // effect requires either and they are not present.
  var streamInfos = material.effect.getStreamInfo();
  for (var s = 0; s < streamInfos.length; ++s) {
    var semantic = streamInfos[s].semantic;
    var semanticIndex = streamInfos[s].semanticIndex;

    var requiredStream = this.findStream(semantic, semanticIndex);
    if (!requiredStream) {
      switch (semantic) {
        case o3djs.base.o3d.Stream.TANGENT:
        case o3djs.base.o3d.Stream.BINORMAL:
          if (primitiveType == o3djs.base.o3d.Primitive.TRIANGLELIST) {
            this.addTangentStreams(semanticIndex);
          } else {
            throw 'Can not create tangents and binormals for primitive type' +
                primitiveType;
          }
          break;
        case o3djs.base.o3d.Stream.COLOR:
          requiredStream = this.addStream(4, semantic, semanticIndex);
          for (var i = 0; i < numVertices; ++i) {
            requiredStream.addElement(1, 1, 1, 1);
          }
          break;
        case o3djs.base.o3d.Stream.INFLUENCE_WEIGHTS:
        case o3djs.base.o3d.Stream.INFLUENCE_INDICES:
          break;
        default:
          throw 'Missing stream for semantic ' + semantic +
              ' with semantic index ' + semanticIndex;
      }
    }
  }

  // These next few lines take our javascript streams and load them into a
  // 'buffer' where the 3D hardware can find them. We have to do this
  // because the 3D hardware can't 'see' javascript data until we copy it to
  // a buffer.
  var vertexBuffer = pack.createObject('VertexBuffer');
  var fields = [];
  for (var s = 0; s < this.streams.length; ++s) {
    var stream = this.streams[s];
    var fieldType = (stream.semantic == o3djs.base.o3d.Stream.COLOR &&
                     stream.numComponents == 4) ? 'UByteNField' : 'FloatField';
    fields[s] = vertexBuffer.createField(fieldType, stream.numComponents);
    streamBank.setVertexStream(stream.semantic,
                               stream.semanticIndex,
                               fields[s],
                               0);
  }
  vertexBuffer.allocateElements(numVertices);
  for (var s = 0; s < this.streams.length; ++s) {
    fields[s].setAt(0, this.streams[s].elements);
  }

  var indexBuffer = pack.createObject('IndexBuffer');
  indexBuffer.set(this.indices);
  primitive.indexBuffer = indexBuffer;
  o3djs.primitives.setCullingInfo(primitive);
  return shape;
};

/**
 * A VertexInfo is a specialization of VertexInfoBase for triangle based
 * geometry.
 * @constructor
 * @extends {o3djs.primitives.VertexInfoBase}
 */
o3djs.primitives.VertexInfo = function() {
  o3djs.primitives.VertexInfoBase.call(this);
}

o3djs.base.inherit(o3djs.primitives.VertexInfo,
                   o3djs.primitives.VertexInfoBase);

/**
 * Returns the number of triangles represented by the VertexInfo.
 * @return {number} The number of triangles represented by VertexInfo.
 */
o3djs.primitives.VertexInfo.prototype.numTriangles = function() {
  return this.indices.length / 3;
};

/**
 * Adds a triangle.
 * @param {number} index1 The index of the first vertex of the triangle.
 * @param {number} index2 The index of the second vertex of the triangle.
 * @param {number} index3 The index of the third vertex of the triangle.
 */
o3djs.primitives.VertexInfo.prototype.addTriangle = function(
    index1, index2, index3) {
  this.indices.push(index1, index2, index3);
};

/**
 * Gets the vertex indices of the triangle at the given triangle index.
 * @param {number} triangleIndex The index of the triangle.
 * @return {!Array.<number>} An array of three triangle indices.
 */
o3djs.primitives.VertexInfo.prototype.getTriangle = function(
    triangleIndex) {
  var indexIndex = triangleIndex * 3;
  return [this.indices[indexIndex + 0],
          this.indices[indexIndex + 1],
          this.indices[indexIndex + 2]];
};

/**
 * Sets the vertex indices of the triangle at the given triangle index.
 * @param {number} triangleIndex The index of the triangle.
 * @param {number} index1 The index of the first vertex of the triangle.
 * @param {number} index2 The index of the second vertex of the triangle.
 * @param {number} index3 The index of the third vertex of the triangle.
 */
o3djs.primitives.VertexInfo.prototype.setTriangle = function(
    triangleIndex, index1, index2, index3) {
  var indexIndex = triangleIndex * 3;
  this.indices[indexIndex + 0] = index1;
  this.indices[indexIndex + 1] = index2;
  this.indices[indexIndex + 2] = index3;
};

/**
 * Creates a shape from a VertexInfo
 * @param {!o3d.Pack} pack Pack to create objects in.
 * @param {!o3d.Material} material to use.
 * @return {!o3d.Shape} The created shape.
 */
o3djs.primitives.VertexInfo.prototype.createShape = function(
    pack,
    material) {
  return this.createShapeByType(
      pack, material, o3djs.base.o3d.Primitive.TRIANGLELIST);
};

/**
 * Calculate tangents and binormals based on the positions, normals and
 *     texture coordinates found in existing streams.
 * @param {number} opt_semanticIndex The semantic index of the texture
 *     coordinate to use and the tangent and binormal streams to add. Defaults
 *     to zero.
 */
o3djs.primitives.VertexInfo.prototype.addTangentStreams =
    function(opt_semanticIndex) {
  opt_semanticIndex = opt_semanticIndex || 0;
  var math = o3djs.math;

  this.validate();

  // Find and validate the position, normal and texture coordinate frames.
  var positionStream = this.findStream(o3djs.base.o3d.Stream.POSITION);
  if (!positionStream)
    throw 'Cannot calculate tangent frame because POSITION stream is missing';
  if (positionStream.numComponents != 3)
    throw 'Cannot calculate tangent frame because POSITION stream is not 3D';

  var normalStream = this.findStream(o3djs.base.o3d.Stream.NORMAL);
  if (!normalStream)
    throw 'Cannot calculate tangent frame because NORMAL stream is missing';
  if (normalStream.numComponents != 3)
    throw 'Cannot calculate tangent frame because NORMAL stream is not 3D';

  var texCoordStream = this.findStream(o3djs.base.o3d.Stream.TEXCOORD,
                                       opt_semanticIndex);
  if (!texCoordStream)
    throw 'Cannot calculate tangent frame because TEXCOORD stream ' +
        opt_semanticIndex + ' is missing';

  // Maps from position, normal key to tangent and binormal matrix.
  var tangentFrames = {};

  // Rounds a vector to integer components.
  function roundVector(v) {
    return [Math.round(v[0]), Math.round(v[1]), Math.round(v[2])];
  }

  // Generates a key for the tangentFrames map from a position and normal
  // vector. Rounds position and normal to allow some tolerance.
  function tangentFrameKey(position, normal) {
    return roundVector(math.mulVectorScalar(position, 100)) + ',' +
        roundVector(math.mulVectorScalar(normal, 100));
  }

  // Accumulates into the tangent and binormal matrix at the approximate
  // position and normal.
  function addTangentFrame(position, normal, tangent, binormal) {
    var key = tangentFrameKey(position, normal);
    var frame = tangentFrames[key];
    if (!frame) {
      frame = [[0, 0, 0], [0, 0, 0]];
    }
    frame = math.addMatrix(frame, [tangent, binormal]);
    tangentFrames[key] = frame;
  }

  // Get the tangent and binormal matrix at the approximate position and
  // normal.
  function getTangentFrame(position, normal) {
    var key = tangentFrameKey(position, normal);
    return tangentFrames[key];
  }

  var numTriangles = this.numTriangles();
  for (var triangleIndex = 0; triangleIndex < numTriangles; ++triangleIndex) {
    // Get the vertex indices, uvs and positions for the triangle.
    var vertexIndices = this.getTriangle(triangleIndex);
    var uvs = [];
    var positions = [];
    var normals = [];
    for (var i = 0; i < 3; ++i) {
      var vertexIndex = vertexIndices[i];
      uvs[i] = texCoordStream.getElementVector(vertexIndex);
      positions[i] = positionStream.getElementVector(vertexIndex);
      normals[i] = normalStream.getElementVector(vertexIndex);
    }

    // Calculate the tangent and binormal for the triangle using method
    // described in Maya documentation appendix A: tangent and binormal
    // vectors.
    var tangent = [0, 0, 0];
    var binormal = [0, 0, 0];
    for (var axis = 0; axis < 3; ++axis) {
      var edge1 = [positions[1][axis] - positions[0][axis],
                   uvs[1][0] - uvs[0][0], uvs[1][1] - uvs[0][1]];
      var edge2 = [positions[2][axis] - positions[0][axis],
                   uvs[2][0] - uvs[0][0], uvs[2][1] - uvs[0][1]];
      var edgeCross = math.normalize(math.cross(edge1, edge2));
      if (edgeCross[0] == 0) {
        edgeCross[0] = 1;
      }
      tangent[axis] = -edgeCross[1] / edgeCross[0];
      binormal[axis] = -edgeCross[2] / edgeCross[0];
    }

    // Normalize the tangent and binornmal.
    var tangentLength = math.length(tangent);
    if (tangentLength > 0.001) {
      tangent = math.mulVectorScalar(tangent, 1 / tangentLength);
    }
    var binormalLength = math.length(binormal);
    if (binormalLength > 0.001) {
      binormal = math.mulVectorScalar(binormal, 1 / binormalLength);
    }

    // Accumulate the tangent and binormal into the tangent frame map.
    for (var i = 0; i < 3; ++i) {
      addTangentFrame(positions[i], normals[i], tangent, binormal);
    }
  }

  // Add the tangent and binormal streams.
  var tangentStream = this.addStream(3,
                                     o3djs.base.o3d.Stream.TANGENT,
                                     opt_semanticIndex);
  var binormalStream = this.addStream(3,
                                      o3djs.base.o3d.Stream.BINORMAL,
                                      opt_semanticIndex);

  // Extract the tangent and binormal for each vertex.
  var numVertices = positionStream.numElements();
  for (var vertexIndex = 0; vertexIndex < numVertices; ++vertexIndex) {
    var position = positionStream.getElementVector(vertexIndex);
    var normal = normalStream.getElementVector(vertexIndex);
    var frame = getTangentFrame(position, normal);

    // Orthonormalize the tangent with respect to the normal.
    var tangent = frame[0];
    tangent = math.subVector(
        tangent, math.mulVectorScalar(normal, math.dot(normal, tangent)));
    var tangentLength = math.length(tangent);
    if (tangentLength > 0.001) {
      tangent = math.mulVectorScalar(tangent, 1 / tangentLength);
    }

    // Orthonormalize the binormal with respect to the normal and the tangent.
    var binormal = frame[1];
    binormal = math.subVector(
        binormal, math.mulVectorScalar(tangent, math.dot(tangent, binormal)));
    binormal = math.subVector(
        binormal, math.mulVectorScalar(normal, math.dot(normal, binormal)));
    var binormalLength = math.length(binormal);
    if (binormalLength > 0.001) {
      binormal = math.mulVectorScalar(binormal, 1 / binormalLength);
    }

    tangentStream.setElementVector(vertexIndex, tangent);
    binormalStream.setElementVector(vertexIndex, binormal);
  }
};

/**
 * Creates a new VertexInfo.
 * @return {!o3djs.primitives.VertexInfo} The new VertexInfo.
 */
o3djs.primitives.createVertexInfo = function() {
  return new o3djs.primitives.VertexInfo();
};

/**
 * Creates sphere vertices.
 * The created sphere has position, normal and uv streams.
 *
 * @param {number} radius radius of the sphere.
 * @param {number} subdivisionsAxis number of steps around the sphere.
 * @param {number} subdivisionsHeight number of vertically on the sphere.
 * @param {!o3djs.math.Matrix4} opt_matrix A matrix by which to multiply
 *     all the vertices.
 * @return {!o3djs.primitives.VertexInfo} The created sphere vertices.
 */
o3djs.primitives.createSphereVertices = function(radius,
                                                 subdivisionsAxis,
                                                 subdivisionsHeight,
                                                 opt_matrix) {
  if (subdivisionsAxis <= 0 || subdivisionsHeight <= 0) {
    throw Error('subdivisionAxis and subdivisionHeight must be > 0');
  }

  // We are going to generate our sphere by iterating through its
  // spherical coordinates and generating 2 triangles for each quad on a
  // ring of the sphere.

  var vertexInfo = o3djs.primitives.createVertexInfo();
  var positionStream = vertexInfo.addStream(
      3, o3djs.base.o3d.Stream.POSITION);
  var normalStream = vertexInfo.addStream(
      3, o3djs.base.o3d.Stream.NORMAL);
  var texCoordStream = vertexInfo.addStream(
      2, o3djs.base.o3d.Stream.TEXCOORD, 0);

  // Generate the individual vertices in our vertex buffer.
  for (var y = 0; y <= subdivisionsHeight; y++) {
    for (var x = 0; x <= subdivisionsAxis; x++) {
      // Generate a vertex based on its spherical coordinates
      var u = x / subdivisionsAxis;
      var v = y / subdivisionsHeight;
      var theta = 2 * Math.PI * u;
      var phi = Math.PI * v;
      var sinTheta = Math.sin(theta);
      var cosTheta = Math.cos(theta);
      var sinPhi = Math.sin(phi);
      var cosPhi = Math.cos(phi);
      var ux = cosTheta * sinPhi;
      var uy = cosPhi;
      var uz = sinTheta * sinPhi;
      positionStream.addElement(radius * ux, radius * uy, radius * uz);
      normalStream.addElement(ux, uy, uz);
      texCoordStream.addElement(1 - u, 1 - v);
    }
  }
  var numVertsAround = subdivisionsAxis + 1;

  for (var x = 0; x < subdivisionsAxis; x++) {
    for (var y = 0; y < subdivisionsHeight; y++) {
      // Make triangle 1 of quad.
      vertexInfo.addTriangle(
          (y + 0) * numVertsAround + x,
          (y + 0) * numVertsAround + x + 1,
          (y + 1) * numVertsAround + x);

      // Make triangle 2 of quad.
      vertexInfo.addTriangle(
          (y + 1) * numVertsAround + x,
          (y + 0) * numVertsAround + x + 1,
          (y + 1) * numVertsAround + x + 1);
    }
  }

  if (opt_matrix) {
    vertexInfo.reorient(opt_matrix);
  }
  return vertexInfo;
};

/**
 * Creates a sphere.
 * The created sphere has position, normal and uv streams.
 *
 * @param {!o3d.Pack} pack Pack to create sphere elements in.
 * @param {!o3d.Material} material to use.
 * @param {number} radius radius of the sphere.
 * @param {number} subdivisionsAxis number of steps around the sphere.
 * @param {number} subdivisionsHeight number of vertically on the sphere.
 * @param {!o3djs.math.Matrix4} opt_matrix A matrix by which to multiply
 *     all the vertices.
 * @return {!o3d.Shape} The created sphere.
 *
 * @see o3d.Pack
 * @see o3d.Shape
 */
o3djs.primitives.createSphere = function(pack,
                                         material,
                                         radius,
                                         subdivisionsAxis,
                                         subdivisionsHeight,
                                         opt_matrix) {
  var vertexInfo = o3djs.primitives.createSphereVertices(
      radius,
      subdivisionsAxis,
      subdivisionsHeight,
      opt_matrix);

  return vertexInfo.createShape(pack, material);
};

/**
 * Array of the indices of corners of each face of a cube.
 * @private
 * @type {!Array.<!Array.<number>>}
 */
o3djs.primitives.CUBE_FACE_INDICES_ = [
  [3, 7, 5, 1],
  [0, 4, 6, 2],
  [6, 7, 3, 2],
  [0, 1, 5, 4],
  [5, 7, 6, 4],
  [2, 3, 1, 0]
];

/**
 * Creates the vertices and indices for a cube. The
 * cube will be created around the origin. (-size / 2, size / 2)
 * The created cube has position, normal and uv streams.
 *
 * @param {number} size Width, height and depth of the cube.
 * @param {!o3djs.math.Matrix4} opt_matrix A matrix by which to multiply
 *     all the vertices.
 * @return {!o3djs.primitives.VertexInfo} The created cube vertices.
 */
o3djs.primitives.createCubeVertices = function(size, opt_matrix) {
  var k = size / 2;

  var cornerVertices = [
    [-k, -k, -k],
    [+k, -k, -k],
    [-k, +k, -k],
    [+k, +k, -k],
    [-k, -k, +k],
    [+k, -k, +k],
    [-k, +k, +k],
    [+k, +k, +k]
  ];

  var faceNormals = [
    [+1, +0, +0],
    [-1, +0, +0],
    [+0, +1, +0],
    [+0, -1, +0],
    [+0, +0, +1],
    [+0, +0, -1]
  ];

  var uvCoords = [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1]
  ];

  var vertexInfo = o3djs.primitives.createVertexInfo();
  var positionStream = vertexInfo.addStream(
      3, o3djs.base.o3d.Stream.POSITION);
  var normalStream = vertexInfo.addStream(
      3, o3djs.base.o3d.Stream.NORMAL);
  var texCoordStream = vertexInfo.addStream(
      2, o3djs.base.o3d.Stream.TEXCOORD, 0);

  for (var f = 0; f < 6; ++f) {
    var faceIndices = o3djs.primitives.CUBE_FACE_INDICES_[f];
    for (var v = 0; v < 4; ++v) {
      var position = cornerVertices[faceIndices[v]];
      var normal = faceNormals[f];
      var uv = uvCoords[v];

      // Each face needs all four vertices because the normals and texture
      // coordinates are not all the same.
      positionStream.addElementVector(position);
      normalStream.addElementVector(normal);
      texCoordStream.addElementVector(uv);

      // Two triangles make a square face.
      var offset = 4 * f;
      vertexInfo.addTriangle(offset + 0, offset + 1, offset + 2);
      vertexInfo.addTriangle(offset + 0, offset + 2, offset + 3);
    }
  }

  if (opt_matrix) {
    vertexInfo.reorient(opt_matrix);
  }
  return vertexInfo;
};

/**
 * Creates a cube.
 * The cube will be created around the origin. (-size / 2, size / 2)
 * The created cube has position, normal and uv streams.
 *
 * @param {!o3d.Pack} pack Pack to create cube elements in.
 * @param {!o3d.Material} material to use.
 * @param {number} size Width, height and depth of the cube.
 * @param {!o3djs.math.Matrix4} opt_matrix A matrix by which to multiply
 *     all the vertices.
 * @return {!o3d.Shape} The created cube.
 *
 * @see o3d.Pack
 * @see o3d.Shape
 */
o3djs.primitives.createCube = function(pack,
                                       material,
                                       size,
                                       opt_matrix) {
  var vertexInfo = o3djs.primitives.createCubeVertices(size, opt_matrix);
  return vertexInfo.createShape(pack, material);
};

/**
 * Creates a box. The box will be created around the origin.
 * The created box has position, normal and uv streams.
 *
 * @param {!o3d.Pack} pack Pack to create Box elements in.
 * @param {!o3d.Material} material to use.
 * @param {number} width Width of the box.
 * @param {number} height Height of the box.
 * @param {number} depth Depth of the box.
 * @param {!o3djs.math.Matrix4} opt_matrix A matrix by which to multiply
 *     all the vertices.
 * @return {!o3d.Shape} The created Box.
 *
 * @see o3d.Pack
 * @see o3d.Shape
 */
o3djs.primitives.createBox = function(pack,
                                      material,
                                      width,
                                      height,
                                      depth,
                                      opt_matrix) {
  var vertexInfo = o3djs.primitives.createCubeVertices(1);
  vertexInfo.reorient([[width, 0, 0, 0],
                       [0, height, 0, 0],
                       [0, 0, depth, 0],
                       [0, 0, 0, 1]]);

  if (opt_matrix) {
    vertexInfo.reorient(opt_matrix);
  }
  return vertexInfo.createShape(pack, material);
};

/**
 * Creates a cube with varying vertex colors. The cube will be created
 * around the origin. (-size / 2, size / 2)
 *
 * @param {!o3d.Pack} pack Pack to create cube elements in.
 * @param {!o3d.Material} material to use.
 * @param {number} size Width, height and depth of the cube.
 * @param {!o3djs.math.Matrix4} opt_matrix A matrix by which to multiply
 *     all the vertices.
 * @return {!o3d.Shape} The created cube.
 *
 * @see o3d.Pack
 * @see o3d.Shape
 */
o3djs.primitives.createRainbowCube = function(pack,
                                              material,
                                              size,
                                              opt_matrix) {
  var vertexInfo = o3djs.primitives.createCubeVertices(size, opt_matrix);
  var colorStream = vertexInfo.addStream(
      4, o3djs.base.o3d.Stream.COLOR);

  var colors = [
    [1, 0, 0, 1],
    [0, 1, 0, 1],
    [0, 0, 1, 1],
    [1, 1, 0, 1],
    [0, 1, 1, 1],
    [1, 0, 1, 1],
    [0, .5, .3, 1],
    [.3, 0, .5, 1]
  ];

  var vertices = vertexInfo.vertices;
  for (var f = 0; f < 6; ++f) {
    var faceIndices = o3djs.primitives.CUBE_FACE_INDICES_[f];
    for (var v = 0; v < 4; ++v) {
      var color = colors[faceIndices[v]];
      colorStream.addElementVector(color);
    }
  }

  return vertexInfo.createShape(pack, material);
};

/**
 * Creates disc vertices. The disc will be in the xz plane, centered
 * at the origin. When creating, at least 3 divisions, or pie pieces, need
 * to be specified, otherwise the triangles making up the disc will be
 * degenerate. You can also specify the number of radial pieces (opt_stacks).
 * A value of 1 for opt_stacks will give you a simple disc of pie pieces.  If
 * you want to create an annulus by omitting some of the center stacks, you
 * can specify the stack at which to start creating triangles.  Finally,
 * stackPower allows you to have the widths increase or decrease as you move
 * away from the center. This is particularly useful when using the disc as a
 * ground plane with a fixed camera such that you don't need the resolution of
 * small triangles near the perimeter.  For example, a value of 2 will produce
 * stacks whose ouside radius increases with the square of the stack index. A
 * value of 1 will give uniform stacks.
 *
 * @param {number} radius Radius of the ground plane.
 * @param {number} divisions Number of triangles in the ground plane
 *                 (at least 3).
 * @param {number} opt_stacks Number of radial divisions (default=1).
 * @param {number} opt_startStack Which radial division to start dividing at.
 * @param {number} opt_stackPower Power to raise stack size to for decreasing
 *                 width.
 * @param {!o3djs.math.Matrix4} opt_matrix A matrix by which to multiply
 *     all the vertices.
 * @return {!o3djs.primitives.VertexInfo} The created plane vertices.
 */
o3djs.primitives.createDiscVertices = function(radius,
                                               divisions,
                                               opt_stacks,
                                               opt_startStack,
                                               opt_stackPower,
                                               opt_matrix) {
  if (divisions < 3) {
    throw Error('divisions must be at least 3');
  }

  var stacks = opt_stacks ? opt_stacks : 1;
  var startStack = opt_startStack ? opt_startStack : 0;
  var stackPower = opt_stackPower ? opt_stackPower : 1;

  var vertexInfo = o3djs.primitives.createVertexInfo();
  var positionStream = vertexInfo.addStream(
      3, o3djs.base.o3d.Stream.POSITION);
  var normalStream = vertexInfo.addStream(
      3, o3djs.base.o3d.Stream.NORMAL);
  var texCoordStream = vertexInfo.addStream(
      2, o3djs.base.o3d.Stream.TEXCOORD, 0);

  // Initialize the center vertex.
  // x  y  z nx ny nz  r  g  b  a  u  v
  var firstIndex = 0;

  if (startStack == 0) {
    positionStream.addElement(0, 0, 0);
    normalStream.addElement(0, 1, 0);
    texCoordStream.addElement(0, 0);
    firstIndex++;
  }

  // Build the disk one stack at a time.
  for (var currentStack = Math.max(startStack, 1);
       currentStack <= stacks;
       ++currentStack) {
    var stackRadius = radius * Math.pow(currentStack / stacks, stackPower);

    for (var i = 0; i < divisions; ++i) {
      var theta = 2.0 * Math.PI * i / divisions;
      var x = stackRadius * Math.cos(theta);
      var z = stackRadius * Math.sin(theta);

      positionStream.addElement(x, 0, z);
      normalStream.addElement(0, 1, 0);
      texCoordStream.addElement(x, z);

      if (currentStack > startStack) {
        // a, b, c and d are the indices of the vertices of a quad.  unless
        // the current stack is the one closest to the center, in which case
        // the vertices a and b connect to the center vertex.
        var a = firstIndex + (i + 1) % divisions;
        var b = firstIndex + i;
        if (currentStack > 1) {
          var c = firstIndex + i - divisions;
          var d = firstIndex + (i + 1) % divisions - divisions;

          // Make a quad of the vertices a, b, c, d.
          vertexInfo.addTriangle(a, b, c);
          vertexInfo.addTriangle(a, c, d);
        } else {
          // Make a single triangle of a, b and the center.
          vertexInfo.addTriangle(0, a, b);
        }
      }
    }

    firstIndex += divisions;
  }

  if (opt_matrix) {
    vertexInfo.reorient(opt_matrix);
  }
  return vertexInfo;
};

/**
 * Creates a disc shape. The disc will be in the xz plane, centered
 * at the origin. When creating, at least 3 divisions, or pie pieces, need
 * to be specified, otherwise the triangles making up the disc will be
 * degenerate. You can also specify the number of radial pieces (opt_stacks).
 * A value of 1 for opt_stacks will give you a simple disc of pie pieces.  If
 * you want to create an annulus by omitting some of the center stacks, you
 * can specify the stack at which to start creating triangles.  Finally,
 * stackPower allows you to have the widths increase or decrease as you move
 * away from the center. This is particularly useful when using the disc as a
 * ground plane with a fixed camera such that you don't need the resolution of
 * small triangles near the perimeter.  For example, a value of 2 will produce
 * stacks whose ouside radius increases with the square of the stack index. A
 * value of 1 will give uniform stacks.
 *
 * @param {!o3d.Pack} pack Pack to create disc elements in.
 * @param {!o3d.Material} material to use.
 * @param {number} radius Radius of the disc.
 * @param {number} divisions Number of triangles in the disc (at least 3).
 * @param {number} stacks Number of radial divisions.
 * @param {number} startStack Which radial division to start dividing at.
 * @param {number} stackPower Power to raise stack size to for decreasing width.
 * @param {!o3djs.math.Matrix4} opt_matrix A matrix by which to multiply
 *     all the vertices.
 * @return {!o3d.Shape} The created disc.
 *
 * @see o3d.Pack
 * @see o3d.Shape
 */
o3djs.primitives.createDisc = function(pack, material,
                                       radius, divisions, stacks,
                                       startStack, stackPower,
                                       opt_matrix) {
  var vertexInfo = o3djs.primitives.createDiscVertices(radius, divisions,
                                                       stacks,
                                                       startStack,
                                                       stackPower,
                                                       opt_matrix);

  return vertexInfo.createShape(pack, material);
};

/**
 * Creates cylinder vertices. The cylinder will be created around the origin
 * along the y-axis. The created cylinder has position, normal and uv streams.
 *
 * @param {number} radius Radius of cylinder.
 * @param {number} height Height of cylinder.
 * @param {number} radialSubdivisions The number of subdivisions around the
 *     cylinder.
 * @param {number} verticalSubdivisions The number of subdivisions down the
 *     cylinder.
 * @param {!o3djs.math.Matrix4} opt_matrix A matrix by which to multiply
 *     all the vertices.
 * @return {!o3djs.primitives.VertexInfo} The created cylinder vertices.
 */
o3djs.primitives.createCylinderVertices = function(radius,
                                                   height,
                                                   radialSubdivisions,
                                                   verticalSubdivisions,
                                                   opt_matrix) {
  return o3djs.primitives.createTruncatedConeVertices(radius,
                                                      radius,
                                                      height,
                                                      radialSubdivisions,
                                                      verticalSubdivisions,
                                                      opt_matrix);
};

/**
 * Creates a cylinder shape. The cylinder will be created around the
 * origin along the y-axis. The created cylinder has position, normal
 * and uv streams.
 *
 * @param {!o3d.Pack} pack Pack to create cylinder elements in.
 * @param {!o3d.Material} material to use.
 * @param {number} radius Radius of cylinder.
 * @param {number} height Height of cylinder.
 * @param {number} radialSubdivisions The number of subdivisions around the
 *     cylinder.
 * @param {number} verticalSubdivisions The number of subdivisions down the
 *     cylinder.
 * @param {!o3djs.math.Matrix4} opt_matrix A matrix by which to multiply
 *     all the vertices.
 * @return {!o3d.Shape} The created cylinder.
 */
o3djs.primitives.createCylinder = function(pack,
                                           material,
                                           radius,
                                           height,
                                           radialSubdivisions,
                                           verticalSubdivisions,
                                           opt_matrix) {
  var vertexInfo = o3djs.primitives.createCylinderVertices(
      radius,
      height,
      radialSubdivisions,
      verticalSubdivisions,
      opt_matrix);
  return vertexInfo.createShape(pack, material);
};

/**
 * Creates vertices for a truncated cone, which is like a cylinder
 * except that it has different top and bottom radii. A truncated cone
 * can also be used to create cylinders and regular cones. The
 * truncated cone will be created centered about the origin, with the
 * y axis as its vertical axis. The created cone has position, normal
 * and uv streams.
 *
 * @param {number} bottomRadius Bottom radius of truncated cone.
 * @param {number} topRadius Top radius of truncated cone.
 * @param {number} height Height of truncated cone.
 * @param {number} radialSubdivisions The number of subdivisions around the
 *     truncated cone.
 * @param {number} verticalSubdivisions The number of subdivisions down the
 *     truncated cone.
 * @param {!o3djs.math.Matrix4} opt_matrix A matrix by which to multiply
 *     all the vertices.
 * @return {!o3djs.primitives.VertexInfo} The created truncated cone vertices.
 */
o3djs.primitives.createTruncatedConeVertices = function(bottomRadius,
                                                        topRadius,
                                                        height,
                                                        radialSubdivisions,
                                                        verticalSubdivisions,
                                                        opt_matrix) {
  if (radialSubdivisions < 3) {
    throw Error('radialSubdivisions must be 3 or greater');
  }

  if (verticalSubdivisions < 1) {
    throw Error('verticalSubdivisions must be 1 or greater');
  }

  var vertexInfo = o3djs.primitives.createVertexInfo();
  var positionStream = vertexInfo.addStream(
      3, o3djs.base.o3d.Stream.POSITION);
  var normalStream = vertexInfo.addStream(
      3, o3djs.base.o3d.Stream.NORMAL);
  var texCoordStream = vertexInfo.addStream(
      2, o3djs.base.o3d.Stream.TEXCOORD, 0);

  var vertsAroundEdge = radialSubdivisions + 1;

  // The slant of the cone is constant across its surface
  var slant = Math.atan2(bottomRadius - topRadius, height);
  var cosSlant = Math.cos(slant);
  var sinSlant = Math.sin(slant);

  for (var yy = -2; yy <= verticalSubdivisions + 2; ++yy) {
    var v = yy / verticalSubdivisions
    var y = height * v;
    var ringRadius;
    if (yy < 0) {
      y = 0;
      v = 1;
      ringRadius = bottomRadius;
    } else if (yy > verticalSubdivisions) {
      y = height;
      v = 1;
      ringRadius = topRadius;
    } else {
      ringRadius = bottomRadius +
        (topRadius - bottomRadius) * (yy / verticalSubdivisions);
    }
    if (yy == -2 || yy == verticalSubdivisions + 2) {
      ringRadius = 0;
      v = 0;
    }
    y -= height / 2;
    for (var ii = 0; ii < vertsAroundEdge; ++ii) {
      var sin = Math.sin(ii * Math.PI * 2 / radialSubdivisions);
      var cos = Math.cos(ii * Math.PI * 2 / radialSubdivisions);
      positionStream.addElement(sin * ringRadius, y, cos * ringRadius);
      normalStream.addElement(
          (yy < 0 || yy > verticalSubdivisions) ? 0 : (sin * cosSlant),
          (yy < 0) ? -1 : (yy > verticalSubdivisions ? 1 : sinSlant),
          (yy < 0 || yy > verticalSubdivisions) ? 0 : (cos * cosSlant));
      texCoordStream.addElement(ii / radialSubdivisions, v);
    }
  }

  for (var yy = 0; yy < verticalSubdivisions + 4; ++yy) {
    for (var ii = 0; ii < radialSubdivisions; ++ii) {
      vertexInfo.addTriangle(vertsAroundEdge * (yy + 0) + 0 + ii,
                             vertsAroundEdge * (yy + 0) + 1 + ii,
                             vertsAroundEdge * (yy + 1) + 1 + ii);
      vertexInfo.addTriangle(vertsAroundEdge * (yy + 0) + 0 + ii,
                             vertsAroundEdge * (yy + 1) + 1 + ii,
                             vertsAroundEdge * (yy + 1) + 0 + ii);
    }
  }

  if (opt_matrix) {
    vertexInfo.reorient(opt_matrix);
  }
  return vertexInfo;
};

/**
 * Creates a truncated cone shape, which is like a cylinder except
 * that it has different top and bottom radii. A truncated cone can
 * also be used to create cylinders, by setting the bottom and top
 * radii equal, and cones, by setting either the top or bottom radius
 * to 0. The truncated cone will be created centered about the origin,
 * with the y axis as its vertical axis. The created cone has
 * position, normal and uv streams.
 *
 * @param {!o3d.Pack} pack Pack in which to create the truncated cone.
 * @param {!o3d.Material} material to use.
 * @param {number} bottomRadius Bottom radius of truncated cone.
 * @param {number} topRadius Top radius of truncated cone.
 * @param {number} height Height of truncated cone.
 * @param {number} radialSubdivisions The number of subdivisions around the
 *     truncated cone.
 * @param {number} verticalSubdivisions The number of subdivisions down the
 *     truncated cone.
 * @param {!o3djs.math.Matrix4} opt_matrix A matrix by which to multiply
 *     all the vertices.
 * @return {!o3d.Shape} The created truncated cone.
 */
o3djs.primitives.createTruncatedCone = function(pack,
                                                material,
                                                bottomRadius,
                                                topRadius,
                                                height,
                                                radialSubdivisions,
                                                verticalSubdivisions,
                                                opt_matrix) {
  var vertexInfo = o3djs.primitives.createTruncatedConeVertices(
      bottomRadius,
      topRadius,
      height,
      radialSubdivisions,
      verticalSubdivisions,
      opt_matrix);
  return vertexInfo.createShape(pack, material);
};

/**
 * Creates vertices for a torus. The torus will be created centered about the
 * origin, with the y axis as its vertical axis. The created torus has
 * position, normal and uv streams.
 *
 * @param {number} torusRadius Distance from the center of the tube to
 *     the center of the torus.
 * @param {number} tubeRadius Radius of the tube.
 * @param {number} tubeLengthSubdivisions The number of subdivisions around the
 *     vertical axis of the torus, i.e. along the length of the tube.
 * @param {number} circleSubdivisions The number of subdivisions in the circle
 *     that is rotated about the vertical axis to create the torus.
 * @param {!o3djs.math.Matrix4} opt_matrix A matrix by which to multiply
 *     all the vertices.
 * @return {!o3djs.primitives.VertexInfo} The created torus vertices.
 */
o3djs.primitives.createTorusVertices = function(torusRadius,
                                                tubeRadius,
                                                tubeLengthSubdivisions,
                                                circleSubdivisions,
                                                opt_matrix) {
  if (tubeLengthSubdivisions < 3) {
    throw Error('tubeLengthSubdivisions must be 3 or greater');
  }

  if (circleSubdivisions < 3) {
    throw Error('circleSubdivisions must be 3 or greater');
  }

  var vertexInfo = o3djs.primitives.createVertexInfo();
  var positionStream = vertexInfo.addStream(
      3, o3djs.base.o3d.Stream.POSITION);
  var normalStream = vertexInfo.addStream(
      3, o3djs.base.o3d.Stream.NORMAL);
  var texCoordStream = vertexInfo.addStream(
      2, o3djs.base.o3d.Stream.TEXCOORD, 0);

  for (var uu = 0; uu < tubeLengthSubdivisions; ++uu) {
    var u = (uu / tubeLengthSubdivisions) * 2 * Math.PI;
    for (var vv = 0; vv < circleSubdivisions; ++vv) {
      var v = (vv / circleSubdivisions) * 2 * Math.PI;
      var sinu = Math.sin(u);
      var cosu = Math.cos(u);
      var sinv = Math.sin(v);
      var cosv = Math.cos(v);
      positionStream.addElement((torusRadius + tubeRadius * cosv) * cosu,
                                tubeRadius * sinv,
                                (torusRadius + tubeRadius * cosv) * sinu);
      normalStream.addElement(cosv * cosu,
                              sinv,
                              cosv * sinu);
      texCoordStream.addElement(uu / tubeLengthSubdivisions,
                                vv / circleSubdivisions);
    }
  }

  for (var uu = 0; uu < tubeLengthSubdivisions; ++uu) {
    for (var vv = 0; vv < circleSubdivisions; ++vv) {
      // We want to wrap the indices around at the seams.
      var uuPlusOne = (uu + 1) % tubeLengthSubdivisions;
      var vvPlusOne = (vv + 1) % circleSubdivisions;
      // The indices of four points forming a quad.
      var a = circleSubdivisions * uu        + vv;
      var b = circleSubdivisions * uuPlusOne + vv;
      var c = circleSubdivisions * uu        + vvPlusOne;
      var d = circleSubdivisions * uuPlusOne + vvPlusOne;
      vertexInfo.addTriangle(a, d, b);
      vertexInfo.addTriangle(a, c, d);
    }
  }

  if (opt_matrix) {
    vertexInfo.reorient(opt_matrix);
  }
  return vertexInfo;
};

/**
 * Creates a torus shape. The torus will be created centered about the
 * origin, with the y axis as its vertical axis. The created torus has
 * position, normal and uv streams.
 *
 * @param {!o3d.Pack} pack Pack in which to create the torus.
 * @param {!o3d.Material} material to use.
 * @param {number} torusRadius Distance from the center of the tube to
 *     the center of the torus.
 * @param {number} tubeRadius Radius of the tube.
 * @param {number} tubeLengthSubdivisions The number of subdivisions around the
 *     vertical axis of the torus, i.e. along the length of the tube.
 * @param {number} circleSubdivisions The number of subdivisions in the circle
 *     that is rotated about the vertical axis to create the torus.
 * @param {!o3djs.math.Matrix4} opt_matrix A matrix by which to multiply
 *     all the vertices.
 * @return {!o3d.Shape} The created torus.
 */
o3djs.primitives.createTorus = function(pack,
                                        material,
                                        torusRadius,
                                        tubeRadius,
                                        tubeLengthSubdivisions,
                                        circleSubdivisions,
                                        opt_matrix) {
  var vertexInfo = o3djs.primitives.createTorusVertices(
      torusRadius,
      tubeRadius,
      tubeLengthSubdivisions,
      circleSubdivisions,
      opt_matrix);
  return vertexInfo.createShape(pack, material);
};

/**
 * Creates wedge vertices, wedge being an extruded triangle. The wedge will be
 * created around the 3 2d points passed in and extruded along the z axis. The
 * created wedge has position, normal and uv streams.
 *
 * @param {!Array.<!Array.<number>>} inPoints Array of 2d points in the format
 *   [[x1, y1], [x2, y2], [x3, y3]] that describe a 2d triangle.
 * @param {number} depth The depth to extrude the triangle.
 * @param {!o3djs.math.Matrix4} opt_matrix A matrix by which to multiply
 *     all the vertices.
 * @return {!o3djs.primitives.VertexInfo} The created wedge vertices.
 */
o3djs.primitives.createWedgeVertices = function(inPoints, depth,
                                                opt_matrix) {
  var math = o3djs.math;

  var vertexInfo = o3djs.primitives.createVertexInfo();
  var positionStream = vertexInfo.addStream(
      3, o3djs.base.o3d.Stream.POSITION);
  var normalStream = vertexInfo.addStream(
      3, o3djs.base.o3d.Stream.NORMAL);
  var texCoordStream = vertexInfo.addStream(
      2, o3djs.base.o3d.Stream.TEXCOORD, 0);

  var z1 = -depth * 0.5;
  var z2 = depth * 0.5;
  var face = [];
  var points = [[inPoints[0][0], inPoints[0][1]],
                [inPoints[1][0], inPoints[1][1]],
                [inPoints[2][0], inPoints[2][1]]];

  face[0] = math.cross(
      math.normalize([points[1][0] - points[0][0],
                      points[1][1] - points[0][1],
                      z1 - z1]),
      math.normalize([points[1][0] - points[1][0],
                      points[1][1] - points[1][1],
                      z2 - z1]));
  face[1] = math.cross(
      math.normalize([points[2][0] - points[1][0],
                      points[2][1] - points[1][1],
                      z1 - z1]),
      math.normalize([points[2][0] - points[2][0],
                      points[2][1] - points[2][1],
                      z2 - z1]));
  face[2] = math.cross(
      [points[0][0] - points[2][0], points[0][1] - points[2][1], z1 - z1],
      [points[0][0] - points[0][0], points[0][1] - points[0][1], z2 - z1]);

  positionStream.addElement(points[0][0], points[0][1], z1);
  normalStream.addElement(0, 0, -1);
  texCoordStream.addElement(0, 1);
  positionStream.addElement(points[1][0], points[1][1], z1);
  normalStream.addElement(0, 0, -1);
  texCoordStream.addElement(1, 0);
  positionStream.addElement(points[2][0], points[2][1], z1);
  normalStream.addElement(0, 0, -1);
  texCoordStream.addElement(0, 0);
                  // back
  positionStream.addElement(points[0][0], points[0][1], z2);
  normalStream.addElement(0, 0, 1);
  texCoordStream.addElement(0, 1);
  positionStream.addElement(points[1][0], points[1][1], z2);
  normalStream.addElement(0, 0, 1);
  texCoordStream.addElement(1, 0);
  positionStream.addElement(points[2][0], points[2][1], z2);
  normalStream.addElement(0, 0, 1);
  texCoordStream.addElement(0, 0);
                  // face 0
  positionStream.addElement(points[0][0], points[0][1], z1);
  normalStream.addElement(face[0][0], face[0][1], face[0][2]);
  texCoordStream.addElement(0, 1);
  positionStream.addElement(points[1][0], points[1][1], z1);
  normalStream.addElement(face[0][0], face[0][1], face[0][2]);
  texCoordStream.addElement(0, 0);
  positionStream.addElement(points[1][0], points[1][1], z2);
  normalStream.addElement(face[0][0], face[0][1], face[0][2]);
  texCoordStream.addElement(1, 0);
  positionStream.addElement(points[0][0], points[0][1], z2);
  normalStream.addElement(face[0][0], face[0][1], face[0][2]);
  texCoordStream.addElement(1, 1);
                  // face 1
  positionStream.addElement(points[1][0], points[1][1], z1);
  normalStream.addElement(face[1][0], face[1][1], face[1][2]);
  texCoordStream.addElement(0, 1);
  positionStream.addElement(points[2][0], points[2][1], z1);
  normalStream.addElement(face[1][0], face[1][1], face[1][2]);
  texCoordStream.addElement(0, 0);
  positionStream.addElement(points[2][0], points[2][1], z2);
  normalStream.addElement(face[1][0], face[1][1], face[1][2]);
  texCoordStream.addElement(1, 0);
  positionStream.addElement(points[1][0], points[1][1], z2);
  normalStream.addElement(face[1][0], face[1][1], face[1][2]);
  texCoordStream.addElement(1, 1);
                  // face 2
  positionStream.addElement(points[2][0], points[2][1], z1);
  normalStream.addElement(face[2][0], face[2][1], face[2][2]);
  texCoordStream.addElement(0, 1);
  positionStream.addElement(points[0][0], points[0][1], z1);
  normalStream.addElement(face[2][0], face[2][1], face[2][2]);
  texCoordStream.addElement(0, 0);
  positionStream.addElement(points[0][0], points[0][1], z2);
  normalStream.addElement(face[2][0], face[2][1], face[2][2]);
  texCoordStream.addElement(1, 0);
  positionStream.addElement(points[2][0], points[2][1], z2);
  normalStream.addElement(face[2][0], face[2][1], face[2][2]);
  texCoordStream.addElement(1, 1);

  vertexInfo.addTriangle(0, 2, 1);
  vertexInfo.addTriangle(3, 4, 5);
  vertexInfo.addTriangle(6, 7, 8);
  vertexInfo.addTriangle(6, 8, 9);
  vertexInfo.addTriangle(10, 11, 12);
  vertexInfo.addTriangle(10, 12, 13);
  vertexInfo.addTriangle(14, 15, 16);
  vertexInfo.addTriangle(14, 16, 17);

  if (opt_matrix) {
    vertexInfo.reorient(opt_matrix);
  }
  return vertexInfo;
};

/**
 * Creates a wedge shape. A wedge being an extruded triangle. The wedge will
 * be created around the 3 2d points passed in and extruded along the z-axis.
 * The created wedge has position, normal and uv streams.
 *
 * @param {!o3d.Pack} pack Pack to create wedge elements in.
 * @param {!o3d.Material} material to use.
 * @param {!Array.<!Array.<number>>} points Array of 2d points in the format
 *     [[x1, y1], [x2, y2], [x3, y3]] that describe a 2d triangle.
 * @param {number} depth The depth to extrude the triangle.
 * @param {!o3djs.math.Matrix4} opt_matrix A matrix by which to multiply
 *     all the vertices.
 * @return {!o3d.Shape} The created wedge.
 */
o3djs.primitives.createWedge = function(pack,
                                        material,
                                        points,
                                        depth,
                                        opt_matrix) {
  var vertexInfo = o3djs.primitives.createWedgeVertices(points,
                                                        depth,
                                                        opt_matrix);
  return vertexInfo.createShape(pack, material);
};

/**
 * Creates prism vertices by extruding a polygon. The prism will be created
 * around the 2d points passed in and extruded along the z axis.  The end caps
 * of the prism are constructed using a triangle fan originating at point 0,
 * so a non-convex polygon might not get the desired shape, but it will if it
 * is convex with respect to point 0.  Texture coordinates map each face of
 * the wall exactly to the unit square.  Texture coordinates on the front
 * and back faces are scaled such that the bounding rectangle of the polygon
 * is mapped to the unit square. The created prism has position, normal,
 * uv streams.
 *
 * @param {!Array.<!Array.<number>>} points Array of 2d points in the format
 *     [[x1, y1], [x2, y2], [x3, y3],...] that describe a 2d polygon.
 * @param {number} depth The depth to extrude the polygon.
 * @param {!o3djs.math.Matrix4} opt_matrix A matrix by which to multiply
 *     all the vertices.
 * @return {!o3djs.primitives.VertexInfo} The created prism vertices.
 */
o3djs.primitives.createPrismVertices = function(points,
                                                depth,
                                                opt_matrix) {
  if (points.length < 3) {
    throw Error('there must be 3 or more points');
  }

  var backZ = -0.5 * depth;
  var frontZ = 0.5 * depth;
  var normals = [];

  var vertexInfo = o3djs.primitives.createVertexInfo();
  var positionStream = vertexInfo.addStream(
      3, o3djs.base.o3d.Stream.POSITION);
  var normalStream = vertexInfo.addStream(
      3, o3djs.base.o3d.Stream.NORMAL);
  var texCoordStream = vertexInfo.addStream(
      2, o3djs.base.o3d.Stream.TEXCOORD, 0);

  // Normals for the wall faces.
  var n = points.length;

  for (var i = 0; i < n; ++i) {
    var j = (i + 1) % n;
    var x = points[j][0] - points[i][0];
    var y = points[j][1] - points[i][1];
    var length = Math.sqrt(x * x + y * y);
    normals[i] = [y / length, -x / length, 0];
  }

  // Compute the minimum and maxiumum x and y coordinates of points in the
  // polygon.
  var minX = points[0][0];
  var minY = points[0][1];
  var maxX = points[0][0];
  var maxY = points[0][1];
  for (var i = 1; i < n; ++i) {
    var x = points[i][0];
    var y = points[i][1];
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }

  // Scale the x and y coordinates of the points of the polygon to fit the
  // bounding rectangle, and use the scaled coordinates for the uv
  // of the front and back cap.
  var frontUV = [];
  var backUV = [];
  var rangeX = maxX - minX;
  var rangeY = maxY - minY;
  for (var i = 0; i < n; ++i) {
    frontUV[i] = [
      (points[i][0] - minX) / rangeX,
      (points[i][1] - minY) / rangeY
    ];
    backUV[i] = [
      (maxX - points[i][0]) / rangeX,
      (points[i][1] - minY) / rangeY
    ];
  }

  for (var i = 0; i < n; ++i) {
    var j = (i + 1) % n;
    // Vertex on the back face.
    positionStream.addElement(points[i][0], points[i][1], backZ);
    normalStream.addElement(0, 0, -1);
    texCoordStream.addElement(backUV[i][0], backUV[i][1]);

    // Vertex on the front face.
    positionStream.addElement(points[i][0], points[i][1], frontZ),
    normalStream.addElement(0, 0, 1);
    texCoordStream.addElement(frontUV[i][0], frontUV[i][1]);

    // Vertices for a quad on the wall.
    positionStream.addElement(points[i][0], points[i][1], backZ),
    normalStream.addElement(normals[i][0], normals[i][1], normals[i][2]);
    texCoordStream.addElement(0, 1);

    positionStream.addElement(points[j][0], points[j][1], backZ),
    normalStream.addElement(normals[i][0], normals[i][1], normals[i][2]);
    texCoordStream.addElement(0, 0);

    positionStream.addElement(points[j][0], points[j][1], frontZ),
    normalStream.addElement(normals[i][0], normals[i][1], normals[i][2]);
    texCoordStream.addElement(1, 0);

    positionStream.addElement(points[i][0], points[i][1], frontZ),
    normalStream.addElement(normals[i][0], normals[i][1], normals[i][2]);
    texCoordStream.addElement(1, 1);

    if (i > 0 && i < n - 1) {
      // Triangle for the back face.
      vertexInfo.addTriangle(0, 6 * (i + 1), 6 * i);

      // Triangle for the front face.
      vertexInfo.addTriangle(1, 6 * i + 1, 6 * (i + 1) + 1);
    }

    // Quad on the wall.
    vertexInfo.addTriangle(6 * i + 2, 6 * i + 3, 6 * i + 4);
    vertexInfo.addTriangle(6 * i + 2, 6 * i + 4, 6 * i + 5);
  }

  if (opt_matrix) {
    vertexInfo.reorient(opt_matrix);
  }
  return vertexInfo;
};

/**
 * Creates a prism shape by extruding a polygon. The prism will be created
 * around the 2d points passed in an array and extruded along the z-axis.
 * The end caps of the prism are constructed using a triangle fan originating
 * at the first point, so a non-convex polygon might not get the desired
 * shape, but it will if it is convex with respect to the first point.
 * Texture coordinates map each face of the wall exactly to the unit square.
 * Texture coordinates on the front and back faces are scaled such that the
 * bounding rectangle of the polygon is mapped to the unit square.
 * The created prism has position, normal and uv streams.
 *
 * @param {!o3d.Pack} pack Pack to create wedge elements in.
 * @param {!o3d.Material} material to use.
 * @param {!Array.<!Array.<number>>} points Array of 2d points in the format:
 *     [[x1, y1], [x2, y2], [x3, y3],...] that describe a 2d polygon.
 * @param {number} depth The depth to extrude the polygon.
 * @param {!o3djs.math.Matrix4} opt_matrix A matrix by which to multiply
 *     all the vertices.
 * @return {!o3d.Shape} The created prism.
 */
o3djs.primitives.createPrism = function(pack,
                                        material,
                                        points,
                                        depth,
                                        opt_matrix) {
  var vertexInfo = o3djs.primitives.createPrismVertices(points,
                                                        depth,
                                                        opt_matrix);
  return vertexInfo.createShape(pack, material);
};

/**
 * Creates XZ plane vertices.
 * The created plane has position, normal and uv streams.
 *
 * @param {number} width Width of the plane.
 * @param {number} depth Depth of the plane.
 * @param {number} subdivisionsWidth Number of steps across the plane.
 * @param {number} subdivisionsDepth Number of steps down the plane.
 * @param {!o3djs.math.Matrix4} opt_matrix A matrix by which to multiply
 *     all the vertices.
 * @return {!o3djs.primitives.VertexInfo} The created plane vertices.
 */
o3djs.primitives.createPlaneVertices = function(width,
                                                depth,
                                                subdivisionsWidth,
                                                subdivisionsDepth,
                                                opt_matrix) {
  if (subdivisionsWidth <= 0 || subdivisionsDepth <= 0) {
    throw Error('subdivisionWidth and subdivisionDepth must be > 0');
  }

  var vertexInfo = o3djs.primitives.createVertexInfo();
  var positionStream = vertexInfo.addStream(
      3, o3djs.base.o3d.Stream.POSITION);
  var normalStream = vertexInfo.addStream(
      3, o3djs.base.o3d.Stream.NORMAL);
  var texCoordStream = vertexInfo.addStream(
      2, o3djs.base.o3d.Stream.TEXCOORD, 0);

  // Generate the individual vertices in our vertex buffer.
  for (var z = 0; z <= subdivisionsDepth; z++) {
    for (var x = 0; x <= subdivisionsWidth; x++) {
      var u = x / subdivisionsWidth;
      var v = z / subdivisionsDepth;
      positionStream.addElement(width * u - width * 0.5,
                                0,
                                depth * v - depth * 0.5);
      normalStream.addElement(0, 1, 0);
      texCoordStream.addElement(u, 1 - v);
    }
  }

  var numVertsAcross = subdivisionsWidth + 1;

  for (var z = 0; z < subdivisionsDepth; z++) {
    for (var x = 0; x < subdivisionsWidth; x++) {
      // triangle 1 of quad
      vertexInfo.addTriangle(
          (z + 0) * numVertsAcross + x,
          (z + 1) * numVertsAcross + x,
          (z + 0) * numVertsAcross + x + 1);

      // triangle 2 of quad
      vertexInfo.addTriangle(
          (z + 1) * numVertsAcross + x,
          (z + 1) * numVertsAcross + x + 1,
          (z + 0) * numVertsAcross + x + 1);
    }
  }

  if (opt_matrix) {
    vertexInfo.reorient(opt_matrix);
  }
  return vertexInfo;
};

/**
 * Creates an XZ plane.
 * The created plane has position, normal and uv streams.
 *
 * @param {!o3d.Pack} pack Pack to create plane elements in.
 * @param {!o3d.Material} material to use.
 * @param {number} width Width of the plane.
 * @param {number} depth Depth of the plane.
 * @param {number} subdivisionsWidth Number of steps across the plane.
 * @param {number} subdivisionsDepth Number of steps down the plane.
 * @param {!o3djs.math.Matrix4} opt_matrix A matrix by which to multiply
 *     all the vertices.
 * @return {!o3d.Shape} The created plane.
 *
 * @see o3d.Pack
 * @see o3d.Shape
 */
o3djs.primitives.createPlane = function(pack,
                                        material,
                                        width,
                                        depth,
                                        subdivisionsWidth,
                                        subdivisionsDepth,
                                        opt_matrix) {
  var vertexInfo = o3djs.primitives.createPlaneVertices(
      width,
      depth,
      subdivisionsWidth,
      subdivisionsDepth,
      opt_matrix);

  return vertexInfo.createShape(pack, material);
};

/**
 * Creates an XZ fade plane, where the alpha channel of the color stream
 * fades from 1 to 0.
 * The created plane has position, normal, uv and vertex color streams.
 *
 * @param {!o3d.Pack} pack Pack to create plane elements in.
 * @param {!o3d.Material} material to use.
 * @param {number} width Width of the plane.
 * @param {number} depth Depth of the plane.
 * @param {number} subdivisionsWidth Number of steps across the plane.
 * @param {number} subdivisionsDepth Number of steps down the plane.
 * @param {!o3djs.math.Matrix4} opt_matrix A matrix by which to multiply
 *     all the vertices.
 * @return {!o3d.Shape} The created plane.
 *
 * @see o3d.Pack
 * @see o3d.Shape
 */
o3djs.primitives.createFadePlane = function(pack,
                                            material,
                                            width,
                                            depth,
                                            subdivisionsWidth,
                                            subdivisionsDepth,
                                            opt_matrix) {
  var vertexInfo = o3djs.primitives.createPlaneVertices(
      width,
      depth,
      subdivisionsWidth,
      subdivisionsDepth,
      opt_matrix);
  var colorStream = vertexInfo.addStream(4, o3djs.base.o3d.Stream.COLOR);
  for (var z = 0; z <= subdivisionsDepth; z++) {
    var alpha = z / subdivisionsDepth;
    for (var x = 0; x <= subdivisionsWidth; x++) {
      colorStream.addElement(1, 1, 1, alpha);
    }
  }
  return vertexInfo.createShape(pack, material);
};

/*
 * Copyright 2009, Google Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */


/**
 * @fileoverview This file contains various functions to help
 * create line primitives for o3d applications.
 *
 *     Note: This library is only a sample. It is not meant to be some official
 *     library. It is provided only as example code.
 *
 */

o3djs.provide('o3djs.lineprimitives');

o3djs.require('o3djs.math');
o3djs.require('o3djs.primitives');

/**
 * Defines a namespace for o3djs.lineprimitives.
 * @namespace
 */
o3djs.lineprimitives = o3djs.lineprimitives || {};

/**
 * A LineVertexInfo is a specialization of VertexInfoBase for line based
 * geometry.
 * @constructor
 * @extends {o3djs.primitives.VertexInfoBase}
 */
o3djs.lineprimitives.LineVertexInfo = function() {
  o3djs.primitives.VertexInfoBase.call(this);
}

o3djs.base.inherit(o3djs.lineprimitives.LineVertexInfo,
                   o3djs.primitives.VertexInfoBase);

/**
 * Returns the number of lines represented by the LineVertexInfo.
 * @return {number} The number of lines represented by LineVertexInfo.
 */
o3djs.lineprimitives.LineVertexInfo.prototype.numLines = function() {
  return this.indices.length / 2;
};

/**
 * Adds a line.
 * @param {number} index1 The index of the first vertex of the line.
 * @param {number} index2 The index of the second vertex of the line.
 */
o3djs.lineprimitives.LineVertexInfo.prototype.addLine = function(
    index1, index2) {
  this.indices.push(index1, index2);
};

/**
 * Gets the vertex indices of the triangle at the given triangle index.
 * @param {number} triangleIndex The index of the triangle.
 * @return {!Array.<number>} An array of three triangle indices.
 */
o3djs.lineprimitives.LineVertexInfo.prototype.getLine = function(
    triangleIndex) {
  var indexIndex = triangleIndex * 3;
  return [this.indices[indexIndex + 0],
          this.indices[indexIndex + 1],
          this.indices[indexIndex + 2]];
};

/**
 * Sets the vertex indices of the line at the given line index.
 * @param {number} lineIndex The index of the line.
 * @param {number} index1 The index of the first vertex of the line.
 * @param {number} index2 The index of the second vertex of the line.
 */
o3djs.lineprimitives.LineVertexInfo.prototype.setLine = function(
    lineIndex, index1, index2) {
  var indexIndex = lineIndex * 2;
  this.indices[indexIndex + 0] = index1;
  this.indices[indexIndex + 1] = index2;
};

/**
 * Creates a shape from a LineVertexInfo
 * @param {!o3d.Pack} pack Pack to create objects in.
 * @param {!o3d.Material} material to use.
 * @return {!o3d.Shape} The created shape.
 */
o3djs.lineprimitives.LineVertexInfo.prototype.createShape = function(
    pack,
    material) {
  return this.createShapeByType(
      pack, material, o3djs.base.o3d.Primitive.LINELIST);
};

/**
 * Creates a new LineVertexInfo.
 * @return {!o3djs.lineprimitives.LineVertexInfo} The new LineVertexInfo.
 */
o3djs.lineprimitives.createLineVertexInfo = function() {
  return new o3djs.lineprimitives.LineVertexInfo();
};

/**
 * Creates the vertices and indices for a cube of lines.
 * The cube will be created around the origin (-size / 2, size / 2).
 * The created cube has a position stream only and can therefore only be used
 * with appropriate shaders.
 *
 * @param {number} size Width, height and depth of the cube.
 * @param {!o3djs.math.Matrix4} opt_matrix A matrix by which to multiply all
 *     the vertices.
 * @return {!o3djs.lineprimitives.LineVertexInfo} The created cube vertices.
 */
o3djs.lineprimitives.createLineCubeVertices = function(size, opt_matrix) {
  var k = size / 2;

  var vertices = [
    [-k, -k, -k],
    [+k, -k, -k],
    [-k, +k, -k],
    [+k, +k, -k],
    [-k, -k, +k],
    [+k, -k, +k],
    [-k, +k, +k],
    [+k, +k, +k]
  ];

  var indices = [
    [0, 1],
    [1, 3],
    [3, 2],
    [2, 0],
    [4, 5],
    [5, 7],
    [7, 6],
    [6, 4],
    [0, 4],
    [1, 5],
    [2, 6],
    [3, 7]
  ];

  var vertexInfo = o3djs.lineprimitives.createLineVertexInfo();
  var positionStream = vertexInfo.addStream(
      3, o3djs.base.o3d.Stream.POSITION);

  for (var v = 0; v < vertices.length; ++v) {
    positionStream.addElementVector(vertices[v]);
  }

  for (var i = 0; i < indices.length; ++i) {
    vertexInfo.addLine(indices[i][0], indices[i][1]);
  }

  if (opt_matrix) {
    vertexInfo.reorient(opt_matrix);
  }
  return vertexInfo;
};

/**
 * Creates a cube of lines.
 * The cube will be created around the origin (-size / 2, size / 2).
 * The created cube has a position stream only and can therefore only be used
 * with appropriate shaders.
 *
 * @param {!o3d.Pack} pack Pack to create cube elements in.
 * @param {!o3d.Material} material Material to use.
 * @param {number} size Width, height and depth of the cube.
 * @param {!o3djs.math.Matrix4} opt_matrix A matrix by which to multiply all
 *     the vertices.
 * @return {!o3d.Shape} The created cube.
 */
o3djs.lineprimitives.createLineCube = function(
    pack,
    material,
    size,
    opt_matrix) {
  var vertexInfo =
      o3djs.lineprimitives.createLineCubeVertices(size, opt_matrix);
  return vertexInfo.createShape(pack, material);
};

/**
 * Creates sphere vertices.
 * The created sphere has a position stream only and can therefore only be
 * used with appropriate shaders.
 *
 * @param {number} radius radius of the sphere.
 * @param {number} subdivisionsAxis number of steps around the sphere.
 * @param {number} subdivisionsHeight number of steps vertically on the sphere.
 * @param {!o3djs.math.Matrix4} opt_matrix A matrix by which to multiply all
 *     the vertices.
 * @return {!o3djs.lineprimitives.LineVertexInfo} The created sphere vertices.
 */
o3djs.lineprimitives.createLineSphereVertices = function(
    radius,
    subdivisionsAxis,
    subdivisionsHeight,
    opt_matrix) {
  if (subdivisionsAxis <= 0 || subdivisionsHeight <= 0) {
    throw Error('subdivisionAxis and subdivisionHeight must be > 0');
  }

  // We are going to generate our sphere by iterating through its
  // spherical coordinates and generating 1 quad for each quad on a
  // ring of the sphere.

  var vertexInfo = o3djs.lineprimitives.createLineVertexInfo();
  var positionStream = vertexInfo.addStream(
      3, o3djs.base.o3d.Stream.POSITION);

  // Generate the individual vertices in our vertex buffer.
  for (var y = 0; y <= subdivisionsHeight; y++) {
    for (var x = 0; x <= subdivisionsAxis; x++) {
      // Generate a vertex based on its spherical coordinates
      var u = x / subdivisionsAxis
      var v = y / subdivisionsHeight;
      var theta = 2 * Math.PI * u;
      var phi = Math.PI * v;
      var sinTheta = Math.sin(theta);
      var cosTheta = Math.cos(theta);
      var sinPhi = Math.sin(phi);
      var cosPhi = Math.cos(phi);
      var ux = cosTheta * sinPhi;
      var uy = cosPhi;
      var uz = sinTheta * sinPhi;
      positionStream.addElement(radius * ux, radius * uy, radius * uz);
    }
  }
  var numVertsAround = subdivisionsAxis + 1;

  for (var x = 0; x < subdivisionsAxis; x++) {
    for (var y = 0; y < subdivisionsHeight; y++) {
      // Make 2 lines per quad.
      vertexInfo.addLine(
          (y + 0) * numVertsAround + x,
          (y + 0) * numVertsAround + x + 1);
      vertexInfo.addLine(
          (y + 0) * numVertsAround + x,
          (y + 1) * numVertsAround + x);
    }
  }

  if (opt_matrix) {
    vertexInfo.reorient(opt_matrix);
  }
  return vertexInfo;
};

/**
 * Creates a sphere.
 * The created sphere has a position stream only and can therefore only be
 * used with appropriate shaders.
 *
 * @param {!o3d.Pack} pack Pack to create sphere elements in.
 * @param {!o3d.Material} material Material to use.
 * @param {number} radius radius of the sphere.
 * @param {number} subdivisionsAxis number of steps around the sphere.
 * @param {number} subdivisionsHeight number of steps vertically on the sphere.
 * @param {!o3djs.math.Matrix4} opt_matrix A matrix by which to multiply all
 *     the vertices.
 * @return {!o3d.Shape} The created sphere.
 *
 * @see o3d.Pack
 * @see o3d.Shape
 */
o3djs.lineprimitives.createLineSphere = function(
    pack,
    material,
    radius,
    subdivisionsAxis,
    subdivisionsHeight,
    opt_matrix) {
  var vertexInfo = o3djs.lineprimitives.createLineSphereVertices(
      radius,
      subdivisionsAxis,
      subdivisionsHeight,
      opt_matrix);

  return vertexInfo.createShape(pack, material);
};

/**
 * Creates ring vertices.
 * The ring is a circle in the XZ plane, centered at the origin.
 * The created ring has position, normal, and 1-D texcoord streams.
 * The normals point outwards from the center of the ring.
 * The texture coordinates are based on angle about the center.
 *
 * @param {number} radius Radius of the ring.
 * @param {number} subdivisions Number of steps around the ring.
 * @param {number} maxTexCoord 1-D texture coordinates will range from 0 to
 *     this value, based on angle about the center.
 * @param {!o3djs.math.Matrix4} opt_matrix A matrix by which to multiply all
 *     the vertices.
 * @return {!o3djs.lineprimitives.LineVertexInfo} The created ring vertices.
 */
o3djs.lineprimitives.createLineRingVertices = function(
    radius,
    subdivisions,
    maxTexCoord,
    opt_matrix) {
  if (subdivisions < 3) {
    throw Error('subdivisions must be >= 3');
  }

  var vertexInfo = o3djs.lineprimitives.createLineVertexInfo();
  var positionStream = vertexInfo.addStream(
      3, o3djs.base.o3d.Stream.POSITION);
  var normalStream = vertexInfo.addStream(
      3, o3djs.base.o3d.Stream.NORMAL);
  var texCoordStream = vertexInfo.addStream(
      1, o3djs.base.o3d.Stream.TEXCOORD, 0);

  // Generate the individual vertices in our vertex buffer.
  for (var i = 0; i <= subdivisions; i++) {
    var theta = 2 * Math.PI * i / subdivisions;
    positionStream.addElement(radius * Math.cos(theta), 0,
                              radius * Math.sin(theta));
    normalStream.addElement(Math.cos(theta), 0, Math.sin(theta));
    texCoordStream.addElement(maxTexCoord * i / subdivisions);
  }

  // Connect the vertices by simple lines.
  for (var i = 0; i < subdivisions; i++) {
    vertexInfo.addLine(i, i+1);
  }

  if (opt_matrix) {
    vertexInfo.reorient(opt_matrix);
  }
  return vertexInfo;
};

/**
 * Creates a ring.
 * The ring is a circle in the XZ plane, centered at the origin.
 * The created ring has position, normal, and 1-D texcoord streams.
 * The normals point outwards from the center of the ring.
 * The texture coordinates are based on angle about the center.
 *
 * @param {!o3d.Pack} pack Pack to create ring elements in.
 * @param {!o3d.Material} material Material to use.
 * @param {number} radius Radius of the ring.
 * @param {number} subdivisions Number of steps around the ring.
 * @param {number} maxTexCoord 1-D texture coordinates will range from 0 to
 *     this value, based on angle about the center.
 * @param {!o3djs.math.Matrix4} opt_matrix A matrix by which to multiply all
 *     the vertices.
 * @return {!o3d.Shape} The created ring.
 */
o3djs.lineprimitives.createLineRing = function(
    pack,
    material,
    radius,
    subdivisions,
    maxTexCoord,
    opt_matrix) {
  var vertexInfo = o3djs.lineprimitives.createLineRingVertices(
      radius,
      subdivisions,
      maxTexCoord,
      opt_matrix);

  return vertexInfo.createShape(pack, material);
};

/*
 * Copyright 2009, Google Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */


/**
 * @fileoverview This file contains a loader class for helping to load
 *     muliple assets in an asynchronous manner.
 */

o3djs.provide('o3djs.loader');

o3djs.require('o3djs.io');
o3djs.require('o3djs.scene');

/**
 * A Module with a loader class for helping to load muliple assets in an
 * asynchronous manner.
 * @namespace
 */
o3djs.loader = o3djs.loader || {};

/**
 * A simple Loader class to call some callback when everything has loaded.
 * @constructor
 * @param {!function(): void} onFinished Function to call when final item has
 *        loaded.
 */
o3djs.loader.Loader = function(onFinished)  {
  this.count_ = 1;
  this.onFinished_ = onFinished;

  /**
   * The LoadInfo for this loader you can use to track progress.
   * @type {!o3djs.io.LoadInfo}
   */
  this.loadInfo = o3djs.io.createLoadInfo();
};

/**
 * Creates a Loader for helping to load a bunch of items asychronously.
 *
 * The way you use this is as follows.
 *
 * <pre>
 * var loader = o3djs.loader.createLoader(myFinishedCallback);
 * loader.loadTexture(pack, texture1Url, callbackForTexture);
 * loader.loadTexture(pack, texture2Url, callbackForTexture);
 * loader.loadTexture(pack, texture3Url, callbackForTexture);
 * loader.finish();
 * </pre>
 *
 * The loader guarantees that myFinishedCallback will be called after
 * all the items have been loaded.
 *
* @param {!function(): void} onFinished Function to call when final item has
*        loaded.
* @return {!o3djs.loader.Loader} A Loader Object.
 */
o3djs.loader.createLoader = function(onFinished) {
  return new o3djs.loader.Loader(onFinished);
};

/**
 * Loads a texture.
 * @param {!o3d.Pack} pack Pack to load texture into.
 * @param {string} url URL of texture to load.
 * @param {!function(o3d.Texture, *): void} opt_onTextureLoaded
 *     optional callback when texture is loaded. It will be passed the texture
 *     and an exception which is null on success.
 */
o3djs.loader.Loader.prototype.loadTexture = function(pack,
                                                     url,
                                                     opt_onTextureLoaded) {
  var that = this;  // so the function below can see "this".
  ++this.count_;
  var loadInfo = o3djs.io.loadTexture(pack, url, function(texture, exception) {
    if (opt_onTextureLoaded) {
      opt_onTextureLoaded(texture, exception);
    }
    that.countDown_();
  });
  this.loadInfo.addChild(loadInfo);
};

/**
 * Loads a RawData.
 * @param {!o3d.Pack} pack Pack to load texture into.
 * @param {string} url URL of image file to load.
 * @param {!function(!o3d.FileRequest, o3d.RawData, *): void} onLoaded Callback
 *     when RawData is loaded. It will be passed the request, a RawData and an
 *     exception which is null on success. The RawData is associated with
 *     the request so it will stay in memory until you free with request with
 *     pack.removeObject(request).
 */
o3djs.loader.Loader.prototype.loadRawData = function(pack,
                                                     url,
                                                     onLoaded) {
  var that = this;  // so the function below can see "this".
  ++this.count_;
  var loadInfo = o3djs.io.loadRawData(
      pack, url, function(request, rawData, exception) {
    onLoaded(request, rawData, exception);
    that.countDown_();
  });
  this.loadInfo.addChild(loadInfo);
};

/**
 * Loads bitmaps.
 * @param {!o3d.Pack} pack Pack to load texture into.
 * @param {string} url URL of image file to load.
 * @param {!function(!Array.<!o3d.Bitmap>, *): void} onBitmapsLoaded Callback
 *     when bitmaps are loaded. It will be passed an array of bitmaps and an
 *     exception which is null on success.
 */
o3djs.loader.Loader.prototype.loadBitmaps = function(pack,
                                                     url,
                                                     onBitmapsLoaded) {
  var that = this;  // so the function below can see "this".
  ++this.count_;
  var loadInfo = o3djs.io.loadBitmaps(pack, url, function(bitmaps, exception) {
    onBitmapsLoaded(bitmaps, exception);
    that.countDown_();
  });
  this.loadInfo.addChild(loadInfo);
};

/**
 * Loads a 3d scene.
 * @param {!o3d.Client} client An O3D client object.
 * @param {!o3d.Pack} pack Pack to load texture into.
 * @param {!o3d.Transform} parent Transform to parent scene under.
 * @param {string} url URL of scene to load.
 * @param {!o3djs.serialization.Options} opt_options Options passed into the
 *     loader.
 * @param {!function(!o3d.Pack, !o3d.Transform, *): void}
 *     opt_onSceneLoaded optional callback when scene is loaded. It will be
 *     passed the pack and parent and an exception which is null on success.
 */
o3djs.loader.Loader.prototype.loadScene = function(client,
                                                   pack,
                                                   parent,
                                                   url,
                                                   opt_onSceneLoaded,
                                                   opt_options) {
  var that = this;  // so the function below can see "this".
  ++this.count_;
  var loadInfo = o3djs.scene.loadScene(
      client, pack, parent, url, function(pack, parent, exception) {
        if (opt_onSceneLoaded) {
          opt_onSceneLoaded(pack, parent, exception);
        }
        that.countDown_();
      },
      opt_options);
  this.loadInfo.addChild(loadInfo);
};

/**
 * Loads a text file.
 * @param {string} url URL of scene to load.
 * @param {!function(string, *): void} onTextLoaded Function to call when
 *     the file is loaded. It will be passed the contents of the file as a
 *     string and an exception which is null on success.
 */
o3djs.loader.Loader.prototype.loadTextFile = function(url, onTextLoaded) {
  var that = this;  // so the function below can see "this".
  ++this.count_;
  var loadInfo = o3djs.io.loadTextFile(url, function(string, exception) {
    onTextLoaded(string, exception);
    that.countDown_();
  });
  this.loadInfo.addChild(loadInfo);
};

/**
 * Creates a loader that is tracked by this loader so that when the new loader
 * is finished it will be reported to this loader.
 * @param {!function(): void} onFinished Function to be called when everything
 *      loaded with this loader has finished.
 * @return {!o3djs.loader.Loader} The new Loader.
 */
o3djs.loader.Loader.prototype.createLoader = function(onFinished) {
  var that = this;
  ++this.count_;
  var loader = o3djs.loader.createLoader(function() {
      onFinished();
      that.countDown_();
  });
  this.loadInfo.addChild(loader.loadInfo);
  return loader;
};

/**
 * Counts down the internal count and if it gets to zero calls the callback.
 * @private
 */
o3djs.loader.Loader.prototype.countDown_ = function() {
  --this.count_;
  if (this.count_ === 0) {
    this.onFinished_();
  }
};

/**
 * Finishes the loading process.
 * Actually this just calls countDown_ to account for the count starting at 1.
 */
o3djs.loader.Loader.prototype.finish = function() {
  this.countDown_();
};


/*
 * Copyright 2009, Google Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */


/**
 * @fileoverview This file contains classes that implement several
 * forms of 2D and 3D manipulation.
 */

o3djs.provide('o3djs.manipulators');

o3djs.require('o3djs.lineprimitives');
o3djs.require('o3djs.material');
o3djs.require('o3djs.math');
o3djs.require('o3djs.picking');
o3djs.require('o3djs.primitives');
o3djs.require('o3djs.quaternions');

/**
 * A module implementing several forms of 2D and 3D manipulation.
 * @namespace
 */
o3djs.manipulators = o3djs.manipulators || {};

/**
 * Creates a new manipulator manager, which maintains multiple
 * manipulators in the same scene. The manager is implicitly
 * associated with a particular O3D client via the Pack which is
 * passed in, although multiple managers can be created for a given
 * client. The manipulators are positioned in world coordinates and
 * are placed in the scene graph underneath the parent transform which
 * is passed in.
 * @param {!o3d.Pack} pack Pack in which manipulators' geometry and
 *     materials will be created.
 * @param {!o3d.Transform} parentTransform The parent transform under
 *     which the manipulators' geometry should be parented.
 * @param {!o3d.RenderNode} parentRenderNode The parent render node
 *     under which the manipulators' draw elements should be placed.
 * @param {number} renderNodePriority The priority that the
 *     manipulators' geometry should use for rendering.
 * @param {!o3d.DrawContext} drawContext The DrawContext to use for the
 *     manipulators.
 * @return {!o3djs.manipulators.Manager} The created manipulator
 *     manager.
 */
o3djs.manipulators.createManager = function(pack,
                                            parentTransform,
                                            parentRenderNode,
                                            renderNodePriority,
                                            drawContext) {
  return new o3djs.manipulators.Manager(pack,
                                        parentTransform,
                                        parentRenderNode,
                                        renderNodePriority,
                                        drawContext);
};

//
// Some linear algebra classes.
// TODO(kbr): find a better home for these.
//

/**
 * Creates a new Line object, which implements projection and
 * closest-point operations.
 * @constructor
 * @private
 * @param {!o3djs.math.Vector3} opt_direction The direction of the
 *     line. Does not need to be normalized but must not be the zero
 *     vector. Defaults to [1, 0, 0] if not specified.
 * @param {!o3djs.math.Vector3} opt_point A point through which the
 *     line goes. Defaults to [0, 0, 0] if not specified.
 */
o3djs.manipulators.Line_ = function(opt_direction,
                                    opt_point) {
  /**
   * The direction of the line.
   * @private
   * @type {!o3djs.math.Vector3}
   */
  this.direction_ = o3djs.math.copyVector(opt_direction || [1, 0, 0]);
  /**
   * A point through which the line goes.
   * @private
   * @type {!o3djs.math.Vector3}
   */
  this.point_ = o3djs.math.copyVector(opt_point || [0, 0, 0]);
  this.recalc_();
};

/**
 * Sets the direction of this line.
 * @private
 * @param {!o3djs.math.Vector3} direction The new direction of the
 *     line. Does not need to be normalized but must not be the zero
 *     vector.
 */
o3djs.manipulators.Line_.prototype.setDirection = function(direction) {
  this.direction_ = o3djs.math.copyVector(direction);
  this.recalc_();
};

/**
 * Gets the direction of this line.
 * @private
 * @return {!o3djs.math.Vector3} The direction of the line.
 */
o3djs.manipulators.Line_.prototype.getDirection = function() {
  return this.direction_;
};

/**
 * Sets one point through which this line travels.
 * @private
 * @param {!o3djs.math.Vector3} point A point which through the line
 *     will travel.
 */
o3djs.manipulators.Line_.prototype.setPoint = function(point) {
  this.point_ = o3djs.math.copyVector(point);
  this.recalc_();
};

/**
 * Gets one point through which this line travels.
 * @private
 * @return {!o3djs.math.Vector3} A point which through the line
 *     travels.
 */
o3djs.manipulators.Line_.prototype.getPoint = function() {
  return this.point_;
};

/**
 * Projects a point onto the line.
 * @private
 * @param {!o3djs.math.Vector3} point Point to be projected.
 * @return {!o3djs.math.Vector3} Point on the line closest to the
 *     passed point.
 */
o3djs.manipulators.Line_.prototype.projectPoint = function(point) {
  var dotp = o3djs.math.dot(this.direction_, point);
  return o3djs.math.addVector(this.alongVec_,
                              o3djs.math.mulScalarVector(dotp,
                                                         this.direction_));
};

/**
 * A threshold / error tolerance for determining if a number should be
 * considered zero.
 * @type {!number}
 */
o3djs.manipulators.EPSILON = 0.00001;

/**
 * A unit vector pointing along the positive X-axis.
 * @type {!o3djs.math.Vector3}
 */
o3djs.manipulators.X_AXIS = [1, 0, 0];

/**
 * A unit vector pointing along the positive Z-axis.
 * @type {!o3djs.math.Vector3}
 */
o3djs.manipulators.Z_AXIS = [0, 0, 1];

/**
 * Returns the closest point on this line to the given ray, which is
 * specified by start and end points. If the ray is parallel to the
 * line, returns null.
 * @private
 * @param {!o3djs.math.Vector3} startPoint Start point of ray.
 * @param {!o3djs.math.Vector3} endPoint End point of ray.
 * @return {o3djs.math.Vector3} The closest point on the line to the
 *     ray, or null if the ray is parallel to the line.
 */
o3djs.manipulators.Line_.prototype.closestPointToRay = function(startPoint,
                                                                endPoint) {
  // Consider a two-sided line and a one-sided ray, both in in 3D
  // space, and assume they are not parallel. Their parametric
  // formulation is:
  //
  //   p1 = point + t * dir
  //   p2 = raystart + u * raydir
  //
  // Here t and u are scalar parameter values, and the other values
  // are three-dimensional vectors. p1 and p2 are arbitrary points on
  // the line and ray, respectively.
  //
  // At the points cp1 and cp2 on these two lines where the line and
  // the ray are closest together, the line segment between cp1 and
  // cp2 is perpendicular to both of the lines.
  //
  // We can therefore write the following equations:
  //
  //   dot(   dir, (cp2 - cp1)) = 0
  //   dot(raydir, (cp2 - cp1)) = 0
  //
  // Define t' and u' as the parameter values for cp1 and cp2,
  // respectively. Expanding, these equations become
  //
  //   dot(   dir, ((raystart + u' * raydir) - (point + t' * dir))) = 0
  //   dot(raydir, ((raystart + u' * raydir) - (point + t' * dir))) = 0
  //
  // With some reshuffling, these can be expressed in vector/matrix
  // form:
  //
  //   [ dot(   dir, raystart) - dot(   dir, point) ]
  //   [ dot(raydir, raystart) - dot(raydir, point) ] +  (continued)
  //
  //       [ -dot(   dir, dir)   dot(   dir, raydir) ]   [ t' ]   [0]
  //       [ -dot(raydir, dir)   dot(raydir, raydir) ] * [ u' ] = [0]
  //
  // u' is the parameter for the world space ray being cast into the
  // screen. We can deduce whether the starting point of the ray is
  // actually the closest point to the infinite 3D line by whether the
  // value of u' is less than zero.
  var rayDirection = o3djs.math.subVector(endPoint, startPoint);
  var ddrd = o3djs.math.dot(this.direction_, rayDirection);
  var A = [[-o3djs.math.lengthSquared(this.direction_), ddrd],
           [ddrd, -o3djs.math.lengthSquared(rayDirection)]];
  var det = o3djs.math.det2(A);
  if (Math.abs(det) < o3djs.manipulators.EPSILON) {
    return null;
  }
  var Ainv = o3djs.math.inverse2(A);
  var b = [o3djs.math.dot(this.point_, this.direction_) -
           o3djs.math.dot(startPoint, this.direction_),
           o3djs.math.dot(startPoint, rayDirection) -
           o3djs.math.dot(this.point_, rayDirection)];
  var x = o3djs.math.mulMatrixVector(Ainv, b);
  if (x[1] < 0) {
    // Means that start point is closest point to this line
    return startPoint;
  } else {
    return o3djs.math.addVector(this.point_,
                                o3djs.math.mulScalarVector(
                                    x[0],
                                    this.direction_));
  }
};

/**
 * Performs internal recalculations when the parameters of the line change.
 * @private
 */
o3djs.manipulators.Line_.prototype.recalc_ = function() {
  var denom = o3djs.math.lengthSquared(this.direction_);
  if (denom == 0.0) {
    throw 'Line_.recalc_: ERROR: direction was the zero vector (not allowed)';
  }

  /**
   * Helper (internal cache) for computing projections along the line.
   * @private
   * @type {!o3djs.math.Vector3}
   */
  this.alongVec_ =
      o3djs.math.subVector(this.point_,
                           o3djs.math.mulScalarVector(
                               o3djs.math.dot(this.point_,
                                              this.direction_),
                               this.direction_));
};

/**
 * The default color for manipulators (used when not highlighted).
 * In [r, g, b, a] format.
 * @type {!o3djs.math.Vector4}
 */
o3djs.manipulators.DEFAULT_COLOR = [0.8, 0.8, 0.8, 1.0];

/**
 * The color used for manipulators when they are highlighted.
 * In [r, g, b, a] format.
 * @type {!o3djs.math.Vector4}
 */
o3djs.manipulators.HIGHLIGHTED_COLOR = [0.9, 0.9, 0.0, 1.0];

/**
 * Creates a new Plane object.
 * @constructor
 * @private
 * @param {!o3djs.math.Vector3} opt_normal The normal of the
 *     plane. Does not need to be unit length, but must not be the zero
 *     vector. Defaults to [0, 1, 0] if not specified.
 * @param {!o3djs.math.Vector3} opt_point A point through which the
 *     plane passes. Defaults to [0, 0, 0] if not specified.
 */
o3djs.manipulators.Plane_ = function(opt_normal,
                                     opt_point) {
  /**
   * A point through which the plane passes.
   * @private
   * @type {!o3djs.math.Vector3}
   */
  this.point_ = o3djs.math.copyVector(opt_point || [0, 0, 0]);
  this.setNormal(opt_normal || [0, 1, 0]);
};

/**
 * Sets the normal of this plane.
 * @private
 * @param {!o3djs.math.Vector3} normal The new normal of the
 *     plane. Does not need to be unit length, but must not be the zero
 *     vector.
 */
o3djs.manipulators.Plane_.prototype.setNormal = function(normal) {
  // Make sure the normal isn't zero.
  var denom = o3djs.math.lengthSquared(normal);
  if (denom == 0.0) {
    throw 'Plane_.setNormal: ERROR: normal was the zero vector (not allowed)';
  }

  /**
   * The normal to the plane. Normalized, cannot be zero.
   * @private
   * @type {!o3djs.math.Vector3}
   */
  this.normal_ = o3djs.math.normalize(normal); // Makes copy.
  this.recalc_();
};

/**
 * Gets the normal of this plane, as a unit vector.
 * @private
 * @return {!o3djs.math.Vector3} The (normalized) normal of the plane.
 */
o3djs.manipulators.Plane_.prototype.getNormal = function() {
  return this.normal_;
};

/**
 * Sets one point through which this plane passes.
 * @private
 * @param {!o3djs.math.Vector3} point A point through which the plane passes.
 */
o3djs.manipulators.Plane_.prototype.setPoint = function(point) {
  this.point_ = o3djs.math.copyVector(point);
  this.recalc_();
};

/**
 * Gets one point through which this plane passes.
 * @private
 * @return {!o3djs.math.Vector3} A point which through the plane passes.
 */
o3djs.manipulators.Plane_.prototype.getPoint = function() {
  return this.point_;
};

/**
 * Projects a point onto the plane.
 * @private
 * @param {!o3djs.math.Vector3} point Point to be projected.
 * @return {!o3djs.math.Vector3} Point on the plane closest to the
 *     passed point.
 */
o3djs.manipulators.Plane_.prototype.projectPoint = function(point) {
  var distFromPlane =
      o3djs.math.dot(this.normal_, point) - this.normalDotPoint_;
  return o3djs.math.subVector(point,
                              o3djs.math.mulScalarVector(distFromPlane,
                                                         this.normal_));
};

/**
 * Intersects a ray with the plane. Returns the point of intersection.
 * This is a two-sided ray cast. If the ray is parallel to the plane,
 * returns null.
 * @private
 * @param {!o3djs.math.Vector3} rayStart Start point of ray.
 * @param {!o3djs.math.Vector3} rayDirection Direction vector of ray.
 *     Does not need to be normalized, but must not be the zero vector.
 * @return {o3djs.math.Vector3} The point of intersection of the ray
 *     with the plane, or null if the ray is parallel to the plane.
 */
o3djs.manipulators.Plane_.prototype.intersectRay = function(rayStart,
                                                            rayDirection) {
  var distFromPlane =
      this.normalDotPoint_ - o3djs.math.dot(this.normal_, rayStart);
  var denom = o3djs.math.dot(this.normal_, rayDirection);
  if (denom == 0) {
    return null;
  }
  var t = distFromPlane / denom;
  return o3djs.math.addVector(rayStart,
                              o3djs.math.mulScalarVector(t, rayDirection));
};

/**
 * Performs internal recalculations when the parameters of the plane change.
 * @private
 */
o3djs.manipulators.Plane_.prototype.recalc_ = function() {
  /**
   * Helper (internal cache) for computing projections into the plane.
   * The dot product between normal_ and point_.
   * @private
   * @type {!number}
   */
  this.normalDotPoint_ = o3djs.math.dot(this.normal_, this.point_);
};

/**
 * Constructs a new manipulator manager. Do not call this directly;
 * use o3djs.manipulators.createManager instead.
 * @constructor
 * @param {!o3d.Pack} pack Pack in which manipulators' geometry and
 *     materials will be created.
 * @param {!o3d.Transform} parentTransform The parent transform under
 *     which the manipulators' geometry should be parented.
 * @param {!o3d.RenderNode} parentRenderNode The parent render node
 *     under which the manipulators' draw elements should be placed.
 * @param {number} renderNodePriority The priority that the
 *     manipulators' geometry should use for rendering.
 * @param {!o3d.DrawContext} drawContext The DrawContext to use for the
 *     manipulators.
 */
o3djs.manipulators.Manager = function(pack,
                                      parentTransform,
                                      parentRenderNode,
                                      renderNodePriority,
                                      drawContext) {
  /**
   * Pack in which manipulators' geometry and materials are created.
   * @type {!o3d.Pack}
   */
  this.pack = pack;
  /**
   * The ViewInfo used to render the manipulators.
   * @type {!o3djs.rendergraph.ViewInfo}
   */
  this.viewInfo = o3djs.rendergraph.createView(
      pack,
      parentTransform,
      parentRenderNode,
      undefined,  // clearColor
      renderNodePriority,  // priority
      undefined,  // viewport
      undefined,  // performanceDrawList
      undefined,  // zOrderedDrawList
      drawContext);

  // Turn off clearing the color for the manipulators.
  this.viewInfo.clearBuffer.active = false;

  // Set the ZComparisonFunction to the opposite of normal so we only
  // draw when we should be obscured for the obscured DrawList.
  var state = this.viewInfo.zOrderedState;
  state.getStateParam('ZComparisonFunction').value =
      o3djs.base.o3d.State.CMP_GREATER;
  // Disable depth writing, otherwise the second pass will have a
  // screwed up depth buffer, and will draw when it shouldn't.
  state.getStateParam('ZWriteEnable').value = false;

  // Swap the priorities of the DrawPasses so they get drawn in the
  // opposite order
  var temp = this.viewInfo.performanceDrawPassInfo.root.priority;
  this.viewInfo.performanceDrawPassInfo.root.priority =
      this.viewInfo.zOrderedDrawPassInfo.root.priority
  this.viewInfo.zOrderedDrawPassInfo.root.priority = temp;

  // The following two DrawLists are used to render manipulators. We give each
  // manipulator 2 DrawElements so they get drawn twice. Once they are
  // drawn with the reverse of the normal zBuffer test so that only the parts
  // of the manipulator that would be obscured by zbuffering are drawn. Then we
  // draw them again with normal zBuffering test so that the parts that are not
  // obscured get drawn as normal. This allows the obscured parts
  // of the manipulators to be rendered with a different material.

  // POTENTIAL PROBLEM: Since we reverse the depth comparison function (and
  // disable depth writing) for the obscured rendering pass, those objects will
  // not have their proper faces showing. So they will look wrong unless we use
  // a constant shader. One possible solution would be to set the stencil
  // buffer to indicate obscured/unobscured, so that we are free to use the
  // depth buffer normally.

  /**
   * The DrawList we use to render manipulators that are unobscured by the main
   * scene.
   * @private
   * @type {!o3d.DrawList}
   */
  this.unobscuredDrawList_ = this.viewInfo.performanceDrawList;

  /**
   * The DrawList we use to render manipulators that are obscured by the main
   * scene.
   * @private
   * @type {!o3d.DrawList}
   */
  this.obscuredDrawList_ = this.viewInfo.zOrderedDrawList;

  /**
   * The parent transform under which the manipulators' geometry
   * shall be parented.
   * @type {!o3d.Transform}
   */
  this.parentTransform = parentTransform;

  /**
   * A map from the manip's parent Transform clientId to the manip.
   * @type {!Array.<!o3djs.manipulators.Manip>}
   */
  this.manipsByClientId = [];

  /**
   * A PickManager to manage picking for the manipulators.
   * @type {!o3djs.picking.PickManager}
   */
  this.pickManager = o3djs.picking.createPickManager(this.parentTransform);

  /**
   * The currently-highlighted manipulator.
   * @type {o3djs.manipulators.Manip}
   */
  this.highlightedManip = null;

  /**
   * The manipulator currently being dragged.
   * @private
   * @type {o3djs.manipulators.Manip}
   */
  this.draggedManip_ = null;
};

/**
 * Gets the constant-color material used for the parts of manipulators that are
 * in front of other objects in the scene.
 * @return {!o3d.Material} A material.
 */
o3djs.manipulators.Manager.prototype.getUnobscuredConstantMaterial = function() {
  if (!this.unobscuredConstantMaterial_) {
    this.unobscuredConstantMaterial_ =
        o3djs.manipulators.createConstantMaterial(
            this.pack, this.unobscuredDrawList_, [1, 1, 1, 0.8]);
  }
  return this.unobscuredConstantMaterial_;
};

/**
 * Gets the constant-color material used for the parts of manipulators that are
 * behind other objects in the scene.
 * @return {!o3d.Material} A material.
 */
o3djs.manipulators.Manager.prototype.getObscuredConstantMaterial = function() {
  if (!this.obscuredConstantMaterial_) {
    this.obscuredConstantMaterial_ =
        o3djs.manipulators.createConstantMaterial(
            this.pack, this.obscuredDrawList_, [1, 1, 1, 0.3]);
  }
  return this.obscuredConstantMaterial_;
};

/**
 * Gets the material used for the parts of line ring manipulators that are
 * in front of other objects in the scene.
 * @return {!o3d.Material} A material.
 */
o3djs.manipulators.Manager.prototype.getUnobscuredLineRingMaterial =
    function() {
  if (!this.unobscuredLineRingMaterial_) {
    this.unobscuredLineRingMaterial_ =
        o3djs.manipulators.createLineRingMaterial(
            this.pack, this.unobscuredDrawList_,
            [1, 1, 1, 1], [1, 1, 1, 0.6], false);
  }
  return this.unobscuredLineRingMaterial_;
};

/**
 * Gets the material used for the parts of line ring manipulators that are
 * behind other objects in the scene.
 * @return {!o3d.Material} A material.
 */
o3djs.manipulators.Manager.prototype.getObscuredLineRingMaterial = function() {
  if (!this.obscuredLineRingMaterial_) {
    this.obscuredLineRingMaterial_ = o3djs.manipulators.createLineRingMaterial(
        this.pack, this.obscuredDrawList_,
        [1, 1, 1, 0.5], [1, 1, 1, 0.3], true);
  }
  return this.obscuredLineRingMaterial_;
};

/**
 * Creates a new Translate1 manipulator. A Translate1 moves along the
 * X axis in its local coordinate system.
 * @return {!o3djs.manipulators.Translate1} A new Translate1 manipulator.
 */
o3djs.manipulators.Manager.prototype.createTranslate1 = function() {
  var manip = new o3djs.manipulators.Translate1(this);
  this.add_(manip);
  return manip;
};

/**
 * Creates a new Translate2 manipulator. A Translate2 moves around the
 * XY plane in its local coordinate system.
 * @return {!o3djs.manipulators.Translate2} A new Translate2 manipulator.
 */
o3djs.manipulators.Manager.prototype.createTranslate2 = function() {
  var manip = new o3djs.manipulators.Translate2(this);
  this.add_(manip);
  return manip;
};

/**
 * Creates a new Rotate1 manipulator. A Rotate1 rotates about the
 * X axis in its local coordinate system.
 * @return {!o3djs.manipulators.Rotate1} A new Rotate1 manipulator.
 */
o3djs.manipulators.Manager.prototype.createRotate1 = function() {
  var manip = new o3djs.manipulators.Rotate1(this);
  this.add_(manip);
  return manip;
};

/**
 * Adds a manipulator to this manager's set.
 * @private
 * @param {!o3djs.manipulators.Manip} manip The manipulator to add.
 */
o3djs.manipulators.Manager.prototype.add_ = function(manip) {
  // Generate draw elements for the manipulator's transform
  manip.getTransform().createDrawElements(this.pack, null);
  // Add the manipulator into our managed list
  this.manipsByClientId[manip.getTransform().clientId] = manip;
};

/**
 * Event handler for multiple kinds of mouse events.
 * @private
 * @param {number} x The x coordinate of the mouse event.
 * @param {number} y The y coordinate of the mouse event.
 * @param {!o3djs.math.Matrix4} view The current view matrix.
 * @param {!o3djs.math.Matrix4} projection The current projection matrix.
 * @param {number} width The width of the viewport.
 * @param {number} height The height of the viewport.
 * @param {!function(!o3djs.manipulators.Manager,
 *     o3djs.picking.PickInfo, o3djs.manipulators.Manip): void} func
 *     Callback function. Always receives the manager as argument; if
 *     a manipulator was picked, receives non-null PickInfo and Manip
 *     arguments, otherwise receives null for both of these arguments.
 */
o3djs.manipulators.Manager.prototype.handleMouse_ = function(x,
                                                             y,
                                                             view,
                                                             projection,
                                                             width,
                                                             height,
                                                             func) {
  this.pickManager.update();

  // Create the world ray
  var worldRay =
    o3djs.picking.clientPositionToWorldRayEx(x, y,
                                             view, projection,
                                             width, height);

  // Pick against all of the manipulators' geometry
  var pickResult = this.pickManager.pick(worldRay);
  if (pickResult != null) {
    // Find which manipulator we picked.
    // NOTE this assumes some things about the transform graph
    // structure of the manipulators.
    // We may need to index by the parent-parent transform instead, since the
    // shape could be attached to the manip's invisibleTransform_, which is a
    // child of the localTransform_.
    var manip =
      this.manipsByClientId[pickResult.shapeInfo.parent.transform.clientId] ||
      this.manipsByClientId[
          pickResult.shapeInfo.parent.parent.transform.clientId];
    func(this, pickResult, manip);
  } else {
    func(this, null, null);
  }
};

/**
 * Callback handling the mouse-down event on a manipulator.
 * @private
 * @param {!o3djs.manipulators.Manager} manager The manipulator
 *     manager owning the given manipulator.
 * @param {o3djs.picking.PickInfo} pickResult The picking information
 *     associated with the mouse-down event.
 * @param {o3djs.manipulators.Manip} manip The manipulator to be
 *     selected.
 */
o3djs.manipulators.mouseDownCallback_ = function(manager,
                                                 pickResult,
                                                 manip) {
  if (manip != null) {
    manager.draggedManip_ = manip;
    manip.makeActive(pickResult);
  }
};

/**
 * Callback handling the mouse-over event on a manipulator.
 * @private
 * @param {!o3djs.manipulators.Manager} manager The manipulator
 *     manager owning the given manipulator.
 * @param {o3djs.picking.PickInfo} pickResult The picking information
 *     associated with the mouse-over event.
 * @param {o3djs.manipulators.Manip} manip The manipulator to be
 *     highlighted.
 */
o3djs.manipulators.hoverCallback_ = function(manager,
                                             pickResult,
                                             manip) {
  if (manager.highlightedManip != null &&
      manager.highlightedManip != manip) {
    // Un-highlight the previously highlighted manipulator
    manager.highlightedManip.clearHighlight();
    manager.highlightedManip = null;
  }

  if (manip != null) {
    manip.highlight(pickResult);
    manager.highlightedManip = manip;
  }
};

/**
 * Method which should be called by end user code upon receiving a
 * mouse-down event.
 * @param {number} x The x coordinate of the mouse event.
 * @param {number} y The y coordinate of the mouse event.
 * @param {!o3djs.math.Matrix4} view The current view matrix.
 * @param {!o3djs.math.Matrix4} projection The current projection matrix.
 * @param {number} width The width of the viewport.
 * @param {number} height The height of the viewport.
 */
o3djs.manipulators.Manager.prototype.mousedown = function(x,
                                                          y,
                                                          view,
                                                          projection,
                                                          width,
                                                          height) {
  this.handleMouse_(x, y, view, projection, width, height,
                    o3djs.manipulators.mouseDownCallback_);
};

/**
 * Method which should be called by end user code upon receiving a
 * mouse motion event.
 * @param {number} x The x coordinate of the mouse event.
 * @param {number} y The y coordinate of the mouse event.
 * @param {!o3djs.math.Matrix4} view The current view matrix.
 * @param {!o3djs.math.Matrix4} projection The current projection matrix.
 * @param {number} width The width of the viewport.
 * @param {number} height The height of the viewport.
 */
o3djs.manipulators.Manager.prototype.mousemove = function(x,
                                                          y,
                                                          view,
                                                          projection,
                                                          width,
                                                          height) {
  if (this.draggedManip_ != null) {
    var worldRay =
      o3djs.picking.clientPositionToWorldRayEx(x, y,
                                               view, projection,
                                               width, height);
    this.draggedManip_.drag(worldRay.near, worldRay.far,
                            x, y, view, projection, width, height);
  } else {
    this.handleMouse_(x, y, view, projection, width, height,
                      o3djs.manipulators.hoverCallback_);
  }
};

/**
 * Method which should be called by end user code upon receiving a
 * mouse-up event.
 */
o3djs.manipulators.Manager.prototype.mouseup = function() {
  if (this.draggedManip_ != null) {
    this.draggedManip_.makeInactive();
    this.draggedManip_ = null;
  }
};

/**
 * Method which should be called by end user code, typically in
 * response to mouse move events, to update the transforms of
 * manipulators which might have been moved either because of
 * manipulators further up the hierarchy, or programmatic changes to
 * transforms.
 */
o3djs.manipulators.Manager.prototype.updateInactiveManipulators = function() {
  for (var ii in this.manipsByClientId) {
    var manip = this.manipsByClientId[ii];
    if (!manip.isActive()) {
      manip.updateBaseTransformFromAttachedTransform_();
    }
  }
};

/**
 * Base class for all manipulators.
 * @constructor
 * @param {!o3djs.manipulators.Manager} manager The manager of this
 *     manipulator.
 */
o3djs.manipulators.Manip = function(manager) {
  /**
   * The manager of this manipulator.
   * @private
   * @type {!o3djs.manipulators.Manager}
   */
  this.manager_ = manager;
  var pack = manager.pack;

  /**
   * This transform holds the local transformation of the manipulator,
   * which is either applied to the transform to which it is attached,
   * or (see below) consumed by the user in the manipulator's
   * callbacks. After each interaction, if there is an attached
   * transform, this local transform is added in to it and reset to
   * the identity.
   * TODO(kbr): add support for user callbacks on manipulators.
   * @private
   * @type {!o3d.Transform}
   */
  this.localTransform_ = pack.createObject('Transform');

  /**
   * This transform provides an offset, if desired, between the
   * manipulator's geometry and the transform (and, implicitly, the
   * shape) to which it is attached. This allows the manipulator to be
   * easily placed below an object, for example.
   * @private
   * @type {!o3d.Transform}
   */
  this.offsetTransform_ = pack.createObject('Transform');

  /**
   * This transform is the one which is actually parented to the
   * manager's parentTransform. It is used to place the manipulator in
   * world space, regardless of the world space location of the
   * parentTransform supplied to the manager. If this manipulator is
   * attached to a given transform, then upon completion of a
   * particular drag interaction, this transform is adjusted to take
   * into account the attached transform's new value.
   * @private
   * @type {!o3d.Transform}
   */
  this.baseTransform_ = pack.createObject('Transform');

  /**
   * This child transform is used only to hold any invisible shapes
   * we may want. Invisible shapes can be useful for picking. Visibility is
   * controlled by the transform, which is why we need this transform.
   * The local matrix of this transform should only be the identity matrix.
   * @private
   * @type {!o3d.Transform}
   */
  this.invisibleTransform_ = pack.createObject('Transform');
  this.invisibleTransform_.visible = false;

  // Hook up these transforms
  this.invisibleTransform_.parent = this.localTransform_;
  this.localTransform_.parent = this.offsetTransform_;
  this.offsetTransform_.parent = this.baseTransform_;
  this.baseTransform_.parent = manager.parentTransform;

  // Make the invisible transform pickable even though it's invisible
  manager.pickManager.update();
  var invisibleTransformInfo = manager.pickManager.getTransformInfo(
      this.invisibleTransform_);
  invisibleTransformInfo.pickableEvenIfInvisible = true;

  /**
   * This is the transform in the scene graph to which this
   * manipulator is conceptually "attached", and whose local transform
   * we are modifying.
   * @private
   * @type {o3d.Transform}
   */
  this.attachedTransform_ = null;

  /**
   * Whether this manipulator is active (ie being dragged).
   * @private
   * @type {boolean}
   */
  this.active_ = false;
};

/**
 * Adds shapes to the internal transform of this manipulator.
 * @private
 * @param {!Array.<!o3d.Shape>} shapes Array of shapes to add.
 * @param {boolean} opt_visible Whether the added shapes should be visible.
 *     Default = true. Invisible geometry can be useful for picking.
 */
o3djs.manipulators.Manip.prototype.addShapes_ = function(shapes, opt_visible) {
  if (opt_visible == undefined) {
    opt_visible = true;
  }
  for (var ii = 0; ii < shapes.length; ii++) {
    if(opt_visible) {
      this.localTransform_.addShape(shapes[ii]);
    } else {
      this.invisibleTransform_.addShape(shapes[ii]);
    }
  }
};

/**
 * Returns the "base" transform of this manipulator, which places the
 * origin of the manipulator at the local origin of the attached
 * transform.
 * @private
 * @return {!o3d.Transform} The base transform of this manipulator.
 */
o3djs.manipulators.Manip.prototype.getBaseTransform_ = function() {
  return this.baseTransform_;
};

/**
 * Returns the "offset" transform of this manipulator, which allows
 * the manipulator's geometry to be moved or rotated with respect to
 * the local origin of the attached transform.
 * @return {!o3d.Transform} The offset transform of this manipulator.
 */
o3djs.manipulators.Manip.prototype.getOffsetTransform = function() {
  return this.offsetTransform_;
};

/**
 * Returns the local transform of this manipulator, which contains the
 * changes that have been made in response to the current drag
 * operation. Upon completion of the drag, this transform's effects
 * are composed in to the attached transform, and this transform is
 * reset to the identity.
 * @return {!o3d.Transform} The local transform of this manipulator.
 */
o3djs.manipulators.Manip.prototype.getTransform = function() {
  return this.localTransform_;
};

/**
 * Sets the translation component of the offset transform. This is
 * useful for moving the manipulator's geometry with respect to the
 * local origin of the attached transform.
 * @param {!o3djs.math.Vector3} translation The offset translation for
 *     this manipulator.
 */
o3djs.manipulators.Manip.prototype.setOffsetTranslation =
    function(translation) {
  this.getOffsetTransform().localMatrix =
    o3djs.math.matrix4.setTranslation(this.getOffsetTransform().localMatrix,
                                      translation);
};

/**
 * Sets the rotation component of the offset transform. This is useful
 * for orienting the manipulator's geometry with respect to the local
 * origin of the attached transform.
 * @param {!o3djs.quaternions.Quaternion} quaternion The offset
 *     rotation for this manipulator.
 */
o3djs.manipulators.Manip.prototype.setOffsetRotation = function(quaternion) {
  var rot = o3djs.quaternions.quaternionToRotation(quaternion);
  this.getOffsetTransform().localMatrix =
    o3djs.math.matrix4.setUpper3x3(this.getOffsetTransform().localMatrix,
                                   rot);
};

/**
 * Explicitly sets the local translation of this manipulator.
 * (TODO(kbr): it is not clear that this capability should be in the
 * API.)
 * @param {!o3djs.math.Vector3} translation The local translation for
 *     this manipulator.
 */
o3djs.manipulators.Manip.prototype.setTranslation = function(translation) {
  this.getTransform().localMatrix =
    o3djs.math.matrix4.setTranslation(this.getTransform().localMatrix,
                                      translation);
};

/**
 * Explicitly sets the local rotation of this manipulator. (TODO(kbr):
 * it is not clear that this capability should be in the API.)
 * @param {!o3djs.quaternions.Quaternion} quaternion The local
 *     rotation for this manipulator.
 */
o3djs.manipulators.Manip.prototype.setRotation = function(quaternion) {
  var rot = o3djs.quaternions.quaternionToRotation(quaternion);
  this.getTransform().localMatrix =
    o3djs.math.matrix4.setUpper3x3(this.getTransform().localMatrix,
                                   rot);
};

/**
 * Attaches this manipulator to the given transform. Interactions with
 * the manipulator will cause this transform's local matrix to be
 * modified appropriately.
 * @param {!o3d.Transform} transform The transform to which this
 *     manipulator should be attached.
 */
o3djs.manipulators.Manip.prototype.attachTo = function(transform) {
  this.attachedTransform_ = transform;
  // Update our base transform to place the manipulator at exactly the
  // location of the attached transform.
  this.updateBaseTransformFromAttachedTransform_();
};

/**
 * Highlights this manipulator according to the given pick result.
 * @param {o3djs.picking.PickInfo} pickResult The pick result which
 *     caused this manipulator to become highlighted.
 */
o3djs.manipulators.Manip.prototype.highlight = function(pickResult) {
};

/**
 * Clears any highlight for this manipulator.
 */
o3djs.manipulators.Manip.prototype.clearHighlight = function() {
};

/**
 * Activates this manipulator according to the given pick result. In
 * complex manipulators, picking different portions of the manipulator
 * may result in different forms of interaction.
 * @param {o3djs.picking.PickInfo} pickResult The pick result which
 *     caused this manipulator to become active.
 */
o3djs.manipulators.Manip.prototype.makeActive = function(pickResult) {
  this.active_ = true;
};

/**
 * Deactivates this manipulator.
 */
o3djs.manipulators.Manip.prototype.makeInactive = function() {
  this.active_ = false;
};

/**
 * Drags this manipulator according to the world-space ray specified
 * by startPoint and endPoint, or alternatively the screen space mouse
 * coordinate specified by x and y. makeActive must already have been
 * called with the initial pick result causing this manipulator to
 * become active.
 * @param {!o3djs.math.Vector3} startPoint Start point of the
 *     world-space ray through the current mouse position.
 * @param {!o3djs.math.Vector3} endPoint End point of the world-space
 *     ray through the current mouse position.
 * @param {number} x The x coordinate of the current mouse position.
 * @param {number} y The y coordinate of the current mouse position.
 * @param {!o3djs.math.Matrix4} view The current view matrix.
 * @param {!o3djs.math.Matrix4} projection The current projection matrix.
 * @param {number} width The width of the viewport.
 * @param {number} height The height of the viewport.
 */
o3djs.manipulators.Manip.prototype.drag = function(startPoint,
                                                   endPoint,
                                                   x,
                                                   y,
                                                   view,
                                                   projection,
                                                   width,
                                                   height) {
};

/**
 * Indicates whether this manipulator is active.
 * @return {boolean} Whether this manipulator is active.
 */
o3djs.manipulators.Manip.prototype.isActive = function() {
  return this.active_;
};

/**
 * Updates the base transform of this manipulator from the state of
 * its attached transform, resetting the local transform of this
 * manipulator to the identity.
 * @private
 */
o3djs.manipulators.Manip.prototype.updateBaseTransformFromAttachedTransform_ =
    function() {
  if (this.attachedTransform_ != null) {
    var attWorld = this.attachedTransform_.worldMatrix;
    var parWorld = this.manager_.parentTransform.worldMatrix;
    var parWorldInv = o3djs.math.matrix4.inverse(parWorld);
    this.baseTransform_.localMatrix =
        o3djs.math.matrix4.mul(attWorld, parWorldInv);
    // Reset the manipulator's local matrix to the identity.
    this.localTransform_.localMatrix = o3djs.math.matrix4.identity();
  }
};

/**
 * Updates this manipulator's attached transform based on the values
 * in the local transform.
 * @private
 */
o3djs.manipulators.Manip.prototype.updateAttachedTransformFromLocalTransform_ =
    function() {
  if (this.attachedTransform_ != null) {
    // Compute the composition of the base and local transforms.
    // The offset transform is skipped except for transforming the
    // effect of the local matrix through the offset transform.
    var base = this.baseTransform_.worldMatrix;
    var offset = this.offsetTransform_.localMatrix;
    var local = this.localTransform_.localMatrix;
    var offsetInv = o3djs.math.matrix4.inverse(offset);
    // We want totalMat = offsetInv * local * offset * base.
    var totalMat = o3djs.math.matrix4.mul(offsetInv, local);
    totalMat = o3djs.math.matrix4.mul(totalMat, offset);
    totalMat = o3djs.math.matrix4.mul(totalMat, base);

    // Set this into the attached transform, taking into account its
    // parent's transform, if any.
    // Note that we can not query the parent's transform directly, so
    // we compute it using a little trick.
    var attWorld = this.attachedTransform_.worldMatrix;
    var attLocal = this.attachedTransform_.localMatrix;
    var attParentMat =
      o3djs.math.matrix4.mul(o3djs.math.matrix4.inverse(attLocal),
                             attWorld);
    // Now we can take the inverse of this matrix
    var attParentMatInv = o3djs.math.matrix4.inverse(attParentMat);
    totalMat = o3djs.math.matrix4.mul(totalMat, attParentMatInv);
    this.attachedTransform_.localMatrix = totalMat;
  }
};

/**
 * Sets the material of the given shape's draw elements.
 * TODO(simonrad): This function is not used, remove it?
 * @private
 * @param {!o3d.Shape} shape Shape to modify the material of.
 * @param {!o3d.Material} material Material to set.
 */
o3djs.manipulators.Manip.prototype.setMaterial_ = function(shape, material) {
  var elements = shape.elements;
  for (var ii = 0; ii < elements.length; ii++) {
    var drawElements = elements[ii].drawElements;
    for (var jj = 0; jj < drawElements.length; jj++) {
      drawElements[jj].material = material;
    }
  }
};

/**
 * Sets the materials of the given shapes' draw elements.
 * TODO(simonrad): This function is not used, remove it?
 * @private
 * @param {!Array.<!o3d.Shape>} shapes Array of shapes to modify the materials of.
 * @param {!o3d.Material} material Material to set.
 */
o3djs.manipulators.Manip.prototype.setMaterials_ = function(shapes, material) {
  for (var ii = 0; ii < shapes.length; ii++) {
    this.setMaterial_(shapes[ii], material);
  }
};

/**
 * Create the geometry for a double-ended arrow going from
 * (0, -1, 0) to (0, 1, 0), transformed by the given matrix.
 * @private
 * @param {!o3djs.math.Matrix4} matrix A matrix by which to multiply
 *     all the vertices.
 * @return {!o3djs.primitives.VertexInfo} The created vertices.
 */
o3djs.manipulators.createArrowVertices_ = function(matrix) {
  var matrix4 = o3djs.math.matrix4;

  var verts = o3djs.primitives.createTruncatedConeVertices(
      0.15,    // Bottom radius.
      0.0,     // Top radius.
      0.3,     // Height.
      4,       // Number of radial subdivisions.
      1,       // Number of vertical subdivisions.
      matrix4.mul(matrix4.translation([0, 0.85, 0]), matrix));

  verts.append(o3djs.primitives.createCylinderVertices(
      0.06,    // Radius.
      1.4,     // Height.
      4,       // Number of radial subdivisions.
      1,       // Number of vertical subdivisions.
      matrix));

  verts.append(o3djs.primitives.createTruncatedConeVertices(
      0.0,     // Bottom radius.
      0.15,    // Top radius.
      0.3,     // Height.
      4,       // Number of radial subdivisions.
      1,       // Number of vertical subdivisions.
      matrix4.mul(matrix4.translation([0, -0.85, 0]), matrix)));

  return verts;
};

/**
 * A manipulator allowing an object to be dragged along a line.
 * A Translate1 moves along the X axis in its local coordinate system.
 * @constructor
 * @extends {o3djs.manipulators.Manip}
 * @param {!o3djs.manipulators.Manager} manager The manager for the
 *     new Translate1 manipulator.
 */
o3djs.manipulators.Translate1 = function(manager) {
  o3djs.manipulators.Manip.call(this, manager);

  var pack = manager.pack;

  var shape = manager.translate1Shape_;
  if (!shape) {
    // Create the geometry for the manipulator, which looks like a
    // two-way arrow going from (-1, 0, 0) to (1, 0, 0).
    var verts = o3djs.manipulators.createArrowVertices_(
        o3djs.math.matrix4.rotationZ(Math.PI / 2));
    shape = verts.createShape(pack, manager.getUnobscuredConstantMaterial());
    // Add a second DrawElement to this shape to draw it a second time
    // with a different material when it's obscured.
    shape.createDrawElements(pack, manager.getObscuredConstantMaterial());
    manager.translate1Shape_ = shape;
  }

  this.addShapes_([ shape ]);

  /**
   * A parameter added to our transform to be able to change the
   * material's color for highlighting.
   * @private
   * @type {!o3d.ParamFloat4}
   */
  this.colorParam_ = this.getTransform().createParam('highlightColor',
                                                     'ParamFloat4');
  this.clearHighlight();

  /**
   * Line along which we are dragging.
   * @private
   * @type {!o3djs.manipulators.Line_}
   */
  this.dragLine_ = new o3djs.manipulators.Line_();
};

o3djs.base.inherit(o3djs.manipulators.Translate1, o3djs.manipulators.Manip);

o3djs.manipulators.Translate1.prototype.highlight = function(pickResult) {
  // We can use instanced geometry for the entire Translate1 since its
  // entire color changes during highlighting.
  // TODO(kbr): support custom user geometry and associated callbacks.
  this.colorParam_.value = o3djs.manipulators.HIGHLIGHTED_COLOR;
};

o3djs.manipulators.Translate1.prototype.clearHighlight = function() {
  this.colorParam_.value = o3djs.manipulators.DEFAULT_COLOR;
};

o3djs.manipulators.Translate1.prototype.makeActive = function(pickResult) {
  o3djs.manipulators.Manip.prototype.makeActive.call(this, pickResult);
  this.highlight(pickResult);
  var localToWorld = this.getTransform().worldMatrix;
  this.dragLine_.setDirection(
      o3djs.math.matrix4.transformDirection(localToWorld,
                                            o3djs.manipulators.X_AXIS));
  this.dragLine_.setPoint(pickResult.worldIntersectionPosition);
};

o3djs.manipulators.Translate1.prototype.makeInactive = function() {
  o3djs.manipulators.Manip.prototype.makeInactive.call(this);
  this.clearHighlight();
  this.updateAttachedTransformFromLocalTransform_();
  this.updateBaseTransformFromAttachedTransform_();
};

o3djs.manipulators.Translate1.prototype.drag = function(startPoint,
                                                        endPoint,
                                                        x,
                                                        y,
                                                        view,
                                                        projection,
                                                        width,
                                                        height) {
  // Algorithm: Find closest point of ray to dragLine_. Subtract this
  // point from the line's point to find difference vector; transform
  // from world to local coordinates to find new local offset of
  // manipulator.
  var closestPoint = this.dragLine_.closestPointToRay(startPoint, endPoint);
  if (closestPoint == null) {
    // Drag axis is parallel to ray. Punt.
    return;
  }
  // Need to do a world-to-local transformation on the difference vector.
  // Note that we also incorporate the translation portion of the matrix.
  var diffVector =
      o3djs.math.subVector(closestPoint, this.dragLine_.getPoint());
  var worldToLocal =
      o3djs.math.matrix4.inverse(this.getTransform().worldMatrix);
  this.getTransform().localMatrix =
      o3djs.math.matrix4.setTranslation(
          this.getTransform().localMatrix,
          o3djs.math.matrix4.transformDirection(worldToLocal,
                                                diffVector));
  this.updateAttachedTransformFromLocalTransform_();
};

/**
 * A manipulator allowing an object to be dragged around a plane.
 * A Translate2 moves around the XY plane in its local coordinate system.
 * @constructor
 * @extends {o3djs.manipulators.Manip}
 * @param {!o3djs.manipulators.Manager} manager The manager for the
 *     new Translate2 manipulator.
 */
o3djs.manipulators.Translate2 = function(manager) {
  o3djs.manipulators.Manip.call(this, manager);

  var pack = manager.pack;

  var shape = manager.Translate2Shape_;
  if (!shape) {
    // Create the geometry for the manipulator, which looks like
    // a two-way arrow going from (-1, 0, 0) to (1, 0, 0),
    // and another one going from (0, -1, 0) to (0, 1, 0).
    var verts = o3djs.manipulators.createArrowVertices_(
        o3djs.math.matrix4.rotationZ(Math.PI / 2));
    verts.append(o3djs.manipulators.createArrowVertices_(
        o3djs.math.matrix4.rotationZ(0)));
    shape = verts.createShape(pack, manager.getUnobscuredConstantMaterial());
    // Add a second DrawElement to this shape to draw it a second time
    // with a different material when it's obscured.
    shape.createDrawElements(pack, manager.getObscuredConstantMaterial());
    manager.Translate2Shape_ = shape;
  }

  this.addShapes_([ shape ]);

  /**
   * A parameter added to our transform to be able to change the
   * material's color for highlighting.
   * @private
   * @type {!o3d.ParamFloat4}
   */
  this.colorParam_ = this.getTransform().createParam('highlightColor',
                                                     'ParamFloat4');
  this.clearHighlight();

  /**
   * Plane through which we are dragging.
   * @private
   * @type {!o3djs.manipulators.Plane_}
   */
  this.dragPlane_ = new o3djs.manipulators.Plane_();
};

o3djs.base.inherit(o3djs.manipulators.Translate2, o3djs.manipulators.Manip);

o3djs.manipulators.Translate2.prototype.highlight = function(pickResult) {
  // We can use instanced geometry for the entire Translate2 since its
  // entire color changes during highlighting.
  // TODO(kbr): support custom user geometry and associated callbacks.
  this.colorParam_.value = o3djs.manipulators.HIGHLIGHTED_COLOR;
};

o3djs.manipulators.Translate2.prototype.clearHighlight = function() {
  this.colorParam_.value = o3djs.manipulators.DEFAULT_COLOR;
};

o3djs.manipulators.Translate2.prototype.makeActive = function(pickResult) {
  o3djs.manipulators.Manip.prototype.makeActive.call(this, pickResult);
  this.highlight(pickResult);
  var localToWorld = this.getTransform().worldMatrix;
  this.dragPlane_.setNormal(
      o3djs.math.matrix4.transformDirection(localToWorld,
                                            o3djs.manipulators.Z_AXIS));
  this.dragPlane_.setPoint(pickResult.worldIntersectionPosition);
};

o3djs.manipulators.Translate2.prototype.makeInactive = function() {
  o3djs.manipulators.Manip.prototype.makeInactive.call(this);
  this.clearHighlight();
  this.updateAttachedTransformFromLocalTransform_();
  this.updateBaseTransformFromAttachedTransform_();
};

o3djs.manipulators.Translate2.prototype.drag = function(startPoint,
                                                        endPoint,
                                                        x,
                                                        y,
                                                        view,
                                                        projection,
                                                        width,
                                                        height) {
  // Algorithm: Find intersection of ray with dragPlane_. Subtract this
  // point from the plane's point to find difference vector; transform
  // from world to local coordinates to find new local offset of
  // manipulator.
  var intersectPoint = this.dragPlane_.intersectRay(startPoint,
      o3djs.math.subVector(endPoint, startPoint));
  if (intersectPoint == null) {
    // Drag plane is parallel to ray. Punt.
    return;
  }
  // Need to do a world-to-local transformation on the difference vector.
  // Note that we also incorporate the translation portion of the matrix.
  var diffVector =
      o3djs.math.subVector(intersectPoint, this.dragPlane_.getPoint());
  var worldToLocal =
      o3djs.math.matrix4.inverse(this.getTransform().worldMatrix);
  this.getTransform().localMatrix =
      o3djs.math.matrix4.setTranslation(
          this.getTransform().localMatrix,
          o3djs.math.matrix4.transformDirection(worldToLocal,
                                                diffVector));
  this.updateAttachedTransformFromLocalTransform_();
};

/**
 * A manipulator allowing an object to be rotated about a single axis.
 * A Rotate1 rotates about the X axis in its local coordinate system.
 * @constructor
 * @extends {o3djs.manipulators.Manip}
 * @param {!o3djs.manipulators.Manager} manager The manager for the
 *     new Rotate1 manipulator.
 */
o3djs.manipulators.Rotate1 = function(manager) {
  o3djs.manipulators.Manip.call(this, manager);

  var pack = manager.pack;

  var pickShape = manager.Rotate1PickShape_;
  if (!pickShape) {
    // Create the polygon geometry for picking the manipulator, which looks like
    // a torus centered at the origin, with the X axis as its vertical axis.
    var verts = o3djs.primitives.createTorusVertices(
        1.0,
        0.1,
        16,
        6,
        o3djs.math.matrix4.rotationZ(Math.PI / 2));
    pickShape = verts.createShape(pack, manager.getUnobscuredConstantMaterial());
    manager.Rotate1PickShape_ = pickShape;
  }

  var visibleShape = manager.Rotate1VisibleShape_;
  if (!visibleShape) {
    // Create the line geometry for displaying the manipulator, which looks like
    // a ring centered at the origin, with the X axis as its vertical axis.
    var verts = o3djs.lineprimitives.createLineRingVertices(
        1.0,  // radius
        32,   // subdivisions
        120,  // maxTexCoord (this determines the number of stipples)
        o3djs.math.matrix4.rotationZ(Math.PI / 2));  // opt_matrix
    visibleShape = verts.createShape(pack,
                                     manager.getUnobscuredLineRingMaterial());
    // Add a second DrawElement to this shape to draw it a second time
    // with a different material when it's obscured.
    visibleShape.createDrawElements(
        pack, manager.getObscuredLineRingMaterial());
    manager.Rotate1VisibleShape_ = visibleShape;
  }

  this.addShapes_([ pickShape ], false); // Invisible
  this.addShapes_([ visibleShape ]);

  /**
   * A parameter added to our transform to be able to change the
   * material's color for highlighting.
   * @private
   * @type {!o3d.ParamFloat4}
   */
  this.colorParam_ = this.getTransform().createParam('highlightColor',
                                                     'ParamFloat4');
  this.clearHighlight();

  /**
   * Line along which we are dragging.
   * We just use this to store the point and direction, not to do any math.
   * @private
   * @type {!o3djs.manipulators.Line_}
   */
  this.dragLine_ = new o3djs.manipulators.Line_();
};

o3djs.base.inherit(o3djs.manipulators.Rotate1, o3djs.manipulators.Manip);

o3djs.manipulators.Rotate1.prototype.highlight = function(pickResult) {
  // We can use instanced geometry for the entire Rotate1 since its
  // entire color changes during highlighting.
  // TODO(kbr): support custom user geometry and associated callbacks.
  this.colorParam_.value = o3djs.manipulators.HIGHLIGHTED_COLOR;
};

o3djs.manipulators.Rotate1.prototype.clearHighlight = function() {
  this.colorParam_.value = o3djs.manipulators.DEFAULT_COLOR;
};

o3djs.manipulators.Rotate1.prototype.makeActive = function(pickResult) {
  o3djs.manipulators.Manip.prototype.makeActive.call(this, pickResult);
  this.highlight(pickResult);
  var localToWorld = this.getTransform().worldMatrix;
  var worldToLocal = o3djs.math.matrix4.inverse(localToWorld);

  // Set up the line. The line is tangent to the circle of rotation
  // and passes through the initial pickResult.
  // Do the math in local space.
  // The rotation axis is the X axis, centered at the origin.
  var localIntersectionPosition =
      o3djs.math.matrix4.transformPoint(worldToLocal,
                                        pickResult.worldIntersectionPosition);
  var localLineDirection = o3djs.math.cross(localIntersectionPosition,
                                            o3djs.manipulators.X_AXIS);
  this.dragLine_.setDirection(
      o3djs.math.matrix4.transformDirection(localToWorld,
                                            localLineDirection));
  this.dragLine_.setPoint(pickResult.worldIntersectionPosition);

  // TODO(simonrad): It would be nice to draw an arrow on the screen
  // at the click position, indicating the direction of the line.
};

o3djs.manipulators.Rotate1.prototype.makeInactive = function() {
  o3djs.manipulators.Manip.prototype.makeInactive.call(this);
  this.clearHighlight();
  this.updateAttachedTransformFromLocalTransform_();
  this.updateBaseTransformFromAttachedTransform_();
};

/**
 * Convert the specified frustum-space position into
 * client coordinates (ie pixels).
 * @private
 * @param {!o3djs.math.Vector3} frustumPoint The point in frustum coordinates
 *     to transform.
 * @param {number} width The width of the viewport.
 * @param {number} height The height of the viewport.
 * @return {!o3djs.math.Vector2} The location of frustumPoint on the screen,
 *     in client coordinates.
 */
o3djs.manipulators.frustumPositionToClientPosition_ = function(frustumPoint,
                                                               width,
                                                               height) {
  return [(frustumPoint[0] + 1) * width / 2,
          (-frustumPoint[1] + 1) * height / 2];
};

o3djs.manipulators.Rotate1.prototype.drag = function(startPoint,
                                                     endPoint,
                                                     x,
                                                     y,
                                                     view,
                                                     projection,
                                                     width,
                                                     height) {
  // Use a simple linear mouse mapping based on distance along the tangent line.
  // Do the dragging in client (screen space) coordinates. This eliminates any
  // degenerate cases involved with a 3D line.

  // Compute the position and direction of the line in screen coordinates.
  var viewProjectionMatrix = o3djs.math.matrix4.mul(view, projection);
  var linePoint1 = o3djs.manipulators.frustumPositionToClientPosition_(
      o3djs.math.matrix4.transformPoint(viewProjectionMatrix,
                                        this.dragLine_.getPoint()),
      width, height);
  var linePoint2 = o3djs.manipulators.frustumPositionToClientPosition_(
      o3djs.math.matrix4.transformPoint(viewProjectionMatrix,
                                        o3djs.math.addVector(
                                            this.dragLine_.getPoint(),
                                            this.dragLine_.getDirection()
                                        )),
      width, height);
  var lineDirection = o3djs.math.normalize(o3djs.math.subVector(linePoint2,
                                                                linePoint1));
  var mousePoint = [x, y];

  // The distance *along the line* that we have dragged, in pixels.
  var dragDistance = o3djs.math.dot(lineDirection, mousePoint) -
                     o3djs.math.dot(lineDirection, linePoint1);

  // Determine rotation angle based on drag distance relative to
  // the size of the client area.
  var angle = (dragDistance / Math.max(width, height)) * 2 * Math.PI;
  this.getTransform().localMatrix = o3djs.math.matrix4.rotationX(-angle);
  this.updateAttachedTransformFromLocalTransform_();
};

// The shaders and materials for the manipulators.
// TODO(simonrad): Find a better place for these?

// The main reason for using custom shader code instead of using standard
// shaders from the effect library is that we want to do highlighting.
// We want to supply two color parameters, and have them combined by the shader.
// One parameter is defined on the material itself, so that we can have
// different colored materials for obscured vs. unobscured geometry. The other
// parameter is the highlightColor, which could switch between white and yellow
// (for example). The highlightColor is usually defined on the transform
// directly above the manipulator shapes. We want to be able to change the
// highlightColor for all materials of the manipulator, but still maintain
// different colors on each individual material.
// An alternative would be to use standard shaders, and change the colors of
// each material individually in the highlight() and clearHighlight() methods.
// If you do this however, you would have to use different materials on each
// manipulator, so that you can highlight only one.
// Another alternative would be to do highlighting by swapping materials on
// the shapes. That is, you would have obscuredHighlightedMaterial and
// obscuredNonHighlightedMaterial. This might be best.

/**
 * An effect string for the polygon geometry of manipulators.
 * This is the same as the shader returned by buildPhongShaderString(),
 * except that it uses an additional highlightColor uniform parameter
 * to do manipulator highlighting.
 * TODO(simonrad): Make the highlighting easier to see, especially when the
 * shapes are dark and obscured.
 * @private
 * @type {string}
 */
o3djs.manipulators.phongFXString_ = '' +
    'uniform float4x4 worldViewProjection : WORLDVIEWPROJECTION;\n' +
    'uniform float3 lightWorldPos;\n' +
    'uniform float4 lightColor;\n' +
    'uniform float4x4 world : WORLD;\n' +
    'uniform float4x4 viewInverse : VIEWINVERSE;\n' +
    'uniform float4x4 worldInverseTranspose : WORLDINVERSETRANSPOSE;\n' +
    'uniform float4 emissive;\n' +
    'uniform float4 ambient;\n' +
    'uniform float4 diffuse;\n' +
    'uniform float4 highlightColor;\n' +
    'uniform float4 specular;\n' +
    'uniform float shininess;\n' +
    'uniform float specularFactor;\n' +
    'struct InVertex {\n' +
    '  float4 position : POSITION;\n' +
    '  float3 normal : NORMAL;\n' +
    '};\n' +
    'struct OutVertex {\n' +
    '  float4 position : POSITION;\n' +
    '  float3 normal : TEXCOORD0;\n' +
    '  float3 surfaceToLight: TEXCOORD1;\n' +
    '  float3 surfaceToView : TEXCOORD2;\n' +
    '};\n' +
    'OutVertex vertexShaderFunction(InVertex input) {\n' +
    '  OutVertex output;\n' +
    '  output.position = mul(input.position, worldViewProjection);\n' +
    '  output.normal = mul(float4(input.normal, 0),\n' +
    '                      worldInverseTranspose).xyz;\n' +
    '  output.surfaceToLight = lightWorldPos - \n' +
    '      mul(input.position, world).xyz;\n' +
    '  output.surfaceToView = (viewInverse[3] - mul(input.position,\n' +
    '      world)).xyz;\n' +
    '  return output;\n' +
    '}\n' +
    'float4 pixelShaderFunction(OutVertex input) : COLOR {\n' +
    '  float4 newDiffuse = diffuse * highlightColor;\n' +
    '  float3 normal = normalize(input.normal);\n' +
    '  float3 surfaceToLight = normalize(input.surfaceToLight);\n' +
    '  float3 surfaceToView = normalize(input.surfaceToView);\n' +
    '  float3 halfVector = normalize(surfaceToLight + surfaceToView);\n' +
    '  float4 litR = lit(dot(normal, surfaceToLight), \n' +
    '                    dot(normal, halfVector), shininess);\n' +
    '  return float4((emissive +\n' +
    '      lightColor * (ambient * newDiffuse + newDiffuse * litR.y +\n' +
    '      + specular * litR.z * specularFactor)).rgb, newDiffuse.a);\n' +
    '}\n' +
    '\n' +
    '// #o3d VertexShaderEntryPoint vertexShaderFunction\n' +
    '// #o3d PixelShaderEntryPoint pixelShaderFunction\n' +
    '// #o3d MatrixLoadOrder RowMajor\n';

/**
 * An constant-color effect string.
 * @private
 * @type {string}
 */
o3djs.manipulators.constantFXString_ = '' +
      'uniform float4x4 worldViewProjection : WORLDVIEWPROJECTION;\n' +
      'uniform float4 color;\n' +
      'uniform float4 highlightColor;\n' +
      '\n' +
      'struct VertexShaderInput {\n' +
      '  float4 position : POSITION;\n' +
      '};\n' +
      '\n' +
      'struct PixelShaderInput {\n' +
      '  float4 position : POSITION;\n' +
      '};\n' +
      '\n' +
      'PixelShaderInput vertexShaderFunction(VertexShaderInput input) {\n' +
      '  PixelShaderInput output;\n' +
      '\n' +
      '  output.position = mul(input.position, worldViewProjection);\n' +
      '  return output;\n' +
      '}\n' +
      '\n' +
      'float4 pixelShaderFunction(PixelShaderInput input): COLOR {\n' +
      '  return color * highlightColor;\n' +
      '}\n' +
      '\n' +
      '// #o3d VertexShaderEntryPoint vertexShaderFunction\n' +
      '// #o3d PixelShaderEntryPoint pixelShaderFunction\n' +
      '// #o3d MatrixLoadOrder RowMajor\n';


/**
 * Returns an effect string for the Rotate1 manipulator's line ring.
 * @private
 * @param {boolean} enableStipple Whether line stippling should be enabled
 *     in the shader.
 * @return {string} The created shader source / effect string.
 */
o3djs.manipulators.getLineRingFXString_ = function(enableStipple) {
  var stippleCode = '';
  if (enableStipple) {
    stippleCode = '' +
        '  // Use the texCoord to do stippling.\n' +
        '  if (input.texCoord.x % 2 > 1) return float4(0, 0, 0, 0);\n';
  }
  return '' +
      'uniform float4x4 worldViewProjection : WORLDVIEWPROJECTION;\n' +
      '// NOTE: We transform the normals through the\n' +
      '// worldViewProjectionInverseTranspose instead of the\n' +
      '// worldViewInverseTranspose. The projection matrix warps the\n' +
      '// normals in strange ways. One result of this is that the "front\n' +
      '// face" color of the ring can extend around more than 50% of the\n' +
      '// ring. This may be good or bad. If we dont include the projection\n' +
      '// matrix, we always get a 50% split, but we do not account for\n' +
      '// perspective. An alternative would be to get a little more\n' +
      '// complicated, using the positions of the camera and the center\n' +
      '// of the ring.\n' +
      'uniform float4x4 worldViewProjectionInverseTranspose :\n' +
      '    WORLDVIEWPROJECTIONINVERSETRANSPOSE;\n' +
      'uniform float4 color1;\n' +
      'uniform float4 color2;\n' +
      'uniform float4 highlightColor;\n' +
      '\n' +
      'struct VertexShaderInput {\n' +
      '  float4 position : POSITION;\n' +
      '  float4 normal : NORMAL;\n' +
      '  float1 texCoord : TEXCOORD0;\n' +
      '};\n' +
      '\n' +
      'struct PixelShaderInput {\n' +
      '  float4 position : POSITION;\n' +
      '  float3 normal : TEXCOORD0;\n' +
      '  float1 texCoord : TEXCOORD1;\n' +
      '};\n' +
      '\n' +
      'PixelShaderInput vertexShaderFunction(VertexShaderInput input) {\n' +
      '  PixelShaderInput output;\n' +
      '\n' +
      '  output.position = mul(input.position, worldViewProjection);\n' +
      '  output.normal = mul(input.normal,\n' +
      '                      worldViewProjectionInverseTranspose).xyz;\n' +
      '  output.texCoord = input.texCoord;\n' +
      '  return output;\n' +
      '}\n' +
      '\n' +
      'float4 pixelShaderFunction(PixelShaderInput input): COLOR {\n' +
      stippleCode +
      '  if (input.normal.z < 0) {\n' +
      '    return color1 * highlightColor; // Front face of the ring.\n' +
      '  } else {\n' +
      '    return color2 * highlightColor; // Back face of the ring.\n' +
      '  }\n' +
      '}\n' +
      '\n' +
      '// #o3d VertexShaderEntryPoint vertexShaderFunction\n' +
      '// #o3d PixelShaderEntryPoint pixelShaderFunction\n' +
      '// #o3d MatrixLoadOrder RowMajor\n';
};

/**
 * Set up the state of a material to allow alpha blending.
 *
 * @param {!o3d.Pack} pack The pack to create the state object in.
 * @param {!o3d.Material} material The material to modify.
 * @param {boolean} discardZeroAlphaPixels Whether incoming pixels that have
 *     zero alpha should be discarded.
 */
o3djs.manipulators.enableAlphaBlendingOnMaterial =
    function(pack, material, discardZeroAlphaPixels) {
  if (!material.state) {
    material.state = pack.createObject('State');
  }
  var state = material.state;
  state.getStateParam('AlphaBlendEnable').value = true;
  state.getStateParam('SourceBlendFunction').value =
      o3djs.base.o3d.State.BLENDFUNC_SOURCE_ALPHA;
  state.getStateParam('DestinationBlendFunction').value =
      o3djs.base.o3d.State.BLENDFUNC_INVERSE_SOURCE_ALPHA;
  state.getStateParam('AlphaTestEnable').value = discardZeroAlphaPixels;
  state.getStateParam('AlphaComparisonFunction').value =
      o3djs.base.o3d.State.CMP_GREATER;
  state.getStateParam('AlphaReference').value = 0;
};

/**
 * Creates the Rotate1 manipulator's line ring material.
 *
 * @param {!o3d.Pack} pack The pack to create the effect and material in.
 * @param {!o3d.DrawList} drawList The draw list against which
 *     the material is created.
 * @param {!o3djs.math.Vector4} color1 A color in the format [r, g, b, a].
 * @param {!o3djs.math.Vector4} color2 A color in the format [r, g, b, a].
 * @param {boolean} enableStipple Whether line stippling should be enabled
 *     in the shader.
 * @return {!o3d.Material} The created material.
 */
o3djs.manipulators.createLineRingMaterial = function(pack,
                                                     drawList,
                                                     color1,
                                                     color2,
                                                     enableStipple) {
  var material = pack.createObject('Material');
  material.effect = pack.createObject('Effect');
  material.effect.loadFromFXString(
      o3djs.manipulators.getLineRingFXString_(enableStipple));
  material.drawList = drawList;
  material.createParam('color1', 'ParamFloat4').value = color1;
  material.createParam('color2', 'ParamFloat4').value = color2;
  o3djs.manipulators.enableAlphaBlendingOnMaterial(pack, material, true);
  return material;
};

/**
 * Creates a constant-shaded material based on the given single color.
 *
 * @param {!o3d.Pack} pack The pack to create the effect and material in.
 * @param {!o3d.DrawList} drawList The draw list against which
 *     the material is created.
 * @param {!o3djs.math.Vector4} color A color in the format [r, g, b, a].
 * @return {!o3d.Material} The created material.
 */
o3djs.manipulators.createConstantMaterial = function(pack,
                                                     drawList,
                                                     color) {
  var material = pack.createObject('Material');
  material.effect = pack.createObject('Effect');
  material.effect.loadFromFXString(o3djs.manipulators.constantFXString_);
  material.drawList = drawList;
  material.createParam('color', 'ParamFloat4').value = color;
  o3djs.manipulators.enableAlphaBlendingOnMaterial(pack, material, false);
  return material;
};

/**
 * Creates a phong-shaded material based on the given color.
 *
 * @param {!o3d.Pack} pack The pack to create the effect and material in.
 * @param {!o3d.DrawList} drawList The draw list against which
 *     the material is created.
 * @param {!o3djs.math.Vector4} color A color in the format [r, g, b, a].
 * @return {!o3d.Material} The created material.
 */
o3djs.manipulators.createPhongMaterial = function(pack,
                                                  drawList,
                                                  color) {
  var material = pack.createObject('Material');
  material.effect = pack.createObject('Effect');
  material.effect.loadFromFXString(o3djs.manipulators.phongFXString_);
  material.drawList = drawList;
  material.createParam('diffuse', 'ParamFloat4').value = color;

  // Create some suitable defaults for the material.
  material.createParam('emissive', 'ParamFloat4').value = [0, 0, 0, 1];
  material.createParam('ambient', 'ParamFloat4').value = [0.5, 0.5, 0.5, 1];
  material.createParam('specular', 'ParamFloat4').value = [1, 1, 1, 1];
  material.createParam('shininess', 'ParamFloat').value = 50;
  material.createParam('specularFactor', 'ParamFloat').value = 1;
  material.createParam('lightColor', 'ParamFloat4').value = [1, 1, 1, 1];
  material.createParam('lightWorldPos', 'ParamFloat3').value =
      [1000, 2000, 3000];
  // TODO(simonrad): Allow modifying the lightPosition, and/or make it fit in
  // with the surrounding world. We could put the lightWorldPos parameter on
  // the transform or somewhere else.

  o3djs.manipulators.enableAlphaBlendingOnMaterial(pack, material, false);
  return material;
};/*
 * Copyright 2009, Google Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */


/**
 * @fileoverview This file contains various functions for helping setup
 * materials for o3d.  It puts them in the "material" module on the
 * o3djs object.
 *
 *     Note: This library is only a sample. It is not meant to be some official
 *     library. It is provided only as example code.
 *
 */

o3djs.provide('o3djs.material');

o3djs.require('o3djs.math');
o3djs.require('o3djs.effect');

/**
 * A Module for materials.
 * @namespace
 */
o3djs.material = o3djs.material || {};

/**
 * Checks a material's params by name to see if it possibly has non 1.0 alpha.
 * Given a name, checks for a ParamTexture called 'nameTexture' and if that
 * fails, checks for a ParamFloat4 'name'.
 * @private
 * @param {!o3d.Material} material Materal to check.
 * @param {string} name name of color params to check.
 * @return {{found: boolean, nonOneAlpha: boolean}} found is true if one of
 *     the params was found, nonOneAlpha is true if that param had non 1.0
 *     alpha.
 */
o3djs.material.hasNonOneAlpha_ = function(material, name) {
  var found = false;
  var nonOneAlpha = false;
  var texture = null;
  var samplerParam = material.getParam(name + 'Sampler');
  if (samplerParam && samplerParam.isAClassName('o3d.ParamSampler')) {
    found = true;
    var sampler = samplerParam.value;
    if (sampler) {
      texture = sampler.texture;
    }
  } else {
    var textureParam = material.getParam(name + 'Texture');
    if (textureParam && textureParam.isAClassName('o3d.ParamTexture')) {
      found = true;
      texture = textureParam.value;
    }
  }

  if (texture && !texture.alphaIsOne) {
    nonOneAlpha = true;
  }

  if (!found) {
    var colorParam = material.getParam(name);
    if (colorParam && colorParam.isAClassName('o3d.ParamFloat4')) {
      found = true;
      // TODO: this check does not work. We need to check for the
      // <transparency> and <transparent> elements or something.
      // if (colorParam.value[3] < 1) {
      //   nonOneAlpha = true;
      // }
    }
  }
  return {found: found, nonOneAlpha: nonOneAlpha};
};

/**
 * Prepares a material by setting their drawList and possibly creating
 * an standard effect if one does not already exist.
 *
 * This function is very specific to our sample importer. It expects that if
 * no Effect exists on a material that certain extra Params have been created
 * on the Material to give us instructions on what to Effects to create.
 *
 * @param {!o3d.Pack} pack Pack to manage created objects.
 * @param {!o3djs.rendergraph.ViewInfo} viewInfo as returned from
 *     o3djs.rendergraph.createView.
 * @param {!o3d.Material} material to prepare.
 * @param {string} opt_effectType type of effect to create ('phong',
 *     'lambert', 'constant').
 *
 * @see o3djs.material.attachStandardEffect
 */
o3djs.material.prepareMaterial = function(pack,
                                          viewInfo,
                                          material,
                                          opt_effectType) {
  // Assume we want the performance list
  var drawList = viewInfo.performanceDrawList;
  // First check if we have a tag telling us that it is or is not
  // transparent
  if (!material.drawList) {
    var param = material.getParam('collada.transparent');
    if (param && param.className == 'o3d.ParamBoolean') {
      material.drawList = param.value ? viewInfo.zOrderedDrawList :
                                        viewInfo.performanceDrawList;
    }
  }
  // If the material has no effect, try to build shaders for it.
  if (!material.effect) {
    // If the user didn't pass an effect type in see if one was stored there
    // by our importer.
    if (!opt_effectType) {
      // Retrieve the lightingType parameter from the material, if any.
      var lightingType = o3djs.effect.getColladaLightingType(material);
      if (lightingType) {
        opt_effectType = lightingType;
      }
    }
    if (opt_effectType) {
      o3djs.material.attachStandardEffect(pack,
                                          material,
                                          viewInfo,
                                          opt_effectType);
      // For collada common profile stuff guess what drawList to use. Note: We
      // can only do this for collada common profile stuff because we supply
      // the shaders and therefore now the inputs and how they are used.
      // For other shaders you've got to do this stuff yourself. On top of
      // that this is a total guess. Just because a texture has no alpha
      // it does not follow that you don't want it in the zOrderedDrawList.
      // That is application specific. Here we are just making a guess and
      // hoping that it covers most cases.
      if (material.drawList == null) {
        // Check the common profile params.
        var result = o3djs.material.hasNonOneAlpha_(material, 'diffuse');
        if (!result.found) {
          result = o3djs.material.hasNonOneAlpha_(material, 'emissive');
        }
        if (result.nonOneAlpha) {
          drawList = viewInfo.zOrderedDrawList;
        }
      }
    }
  }
  if (!material.drawList) {
    material.drawList = drawList;
  }
};

/**
 * Prepares all the materials in the given pack by setting their drawList and
 * if they don't have an Effect, creating one for them.
 *
 * This function is very specific to our sample importer. It expects that if
 * no Effect exists on a material that certain extra Params have been created
 * on the Material to give us instructions on what to Effects to create.
 *
 * @param {!o3d.Pack} pack Pack to prepare.
 * @param {!o3djs.rendergraph.ViewInfo} viewInfo as returned from
 *     o3djs.rendergraph.createView.
 * @param {!o3d.Pack} opt_effectPack Pack to create effects in. If this
 *     is not specifed the pack to prepare above will be used.
 *
 * @see o3djs.material.prepareMaterial
 */
o3djs.material.prepareMaterials = function(pack,
                                           viewInfo,
                                           opt_effectPack) {
  var materials = pack.getObjectsByClassName('o3d.Material');
  for (var mm = 0; mm < materials.length; mm++) {
    o3djs.material.prepareMaterial(opt_effectPack || pack,
                                   viewInfo,
                                   materials[mm]);
  }
};

/**
 * Builds a standard effect for a given material.
 * If the material already has an effect, none is created.
 * @param {!o3d.Pack} pack Pack to manage created objects.
 * @param {!o3d.Material} material The material for which to create an
 *     effect.
 * @param {string} effectType Type of effect to create ('phong', 'lambert',
 *     'constant').
 *
 * @see o3djs.effect.attachStandardShader
 */
o3djs.material.attachStandardEffectEx = function(pack,
                                                 material,
                                                 effectType) {
  if (!material.effect) {
    if (!o3djs.effect.attachStandardShader(pack,
                                           material,
                                           [0, 0, 0],
                                           effectType)) {
      throw 'Could not attach a standard effect';
    }
  }
};

/**
 * Builds a standard effect for a given material.  The position of the
 * default light is set to the view position.  If the material already has
 * an effect, none is created.
 * @param {!o3d.Pack} pack Pack to manage created objects.
 * @param {!o3d.Material} material The material for which to create an
 *     effect.
 * @param {!o3djs.rendergraph.ViewInfo} viewInfo as returned from
 *     o3djs.rendergraph.createView.
 * @param {string} effectType Type of effect to create ('phong', 'lambert',
 *     'constant').
 *
 * @see o3djs.effect.attachStandardShader
 */
o3djs.material.attachStandardEffect = function(pack,
                                               material,
                                               viewInfo,
                                               effectType) {
  if (!material.effect) {
    var lightPos =
        o3djs.math.matrix4.getTranslation(
            o3djs.math.inverse(viewInfo.drawContext.view));
    if (!o3djs.effect.attachStandardShader(pack,
                                           material,
                                           lightPos,  // TODO(gman): remove this
                                           effectType)) {
      throw 'Could not attach a standard effect';
    }
  }
};

/**
 * Prepares all the materials in the given pack by setting their
 * drawList.
 * @param {!o3d.Pack} pack Pack to manage created objects.
 * @param {!o3d.DrawList} drawList DrawList to assign to materials.
 */
o3djs.material.setDrawListOnMaterials = function(pack, drawList) {
  var materials = pack.getObjectsByClassName('o3d.Material');
  for (var mm = 0; mm < materials.length; mm++) {
    var material = materials[mm];
    // TODO: look at flags on the material left by the importer
    //   to decide which draw list to use.
    material.drawList = drawList;
  }
};

/**
 * This function creates a basic material for when you just want to get
 * something on the screen quickly without having to manually setup shaders.
 * You can call this function something like.
 *
 * <pre>
 * &lt;html&gt;&lt;body&gt;
 * &lt;script type="text/javascript" src="o3djs/all.js"&gt;
 * &lt;/script&gt;
 * &lt;script&gt;
 * window.onload = init;
 *
 * function init() {
 *   o3djs.base.makeClients(initStep2);
 * }
 *
 * function initStep2(clientElements) {
 *   var clientElement = clientElements[0];
 *   var client = clientElement.client;
 *   var pack = client.createPack();
 *   var viewInfo = o3djs.rendergraph.createBasicView(
 *       pack,
 *       client.root,
 *       client.renderGraphRoot);
 *   var material = o3djs.material.createBasicMaterial(
 *       pack,
 *       viewInfo,
 *       [1, 0, 0, 1]);  // red
 *   var shape = o3djs.primitives.createCube(pack, material, 10);
 *   var transform = pack.createObject('Transform');
 *   transform.parent = client.root;
 *   transform.addShape(shape);
 *   o3djs.camera.fitContextToScene(client.root,
 *                                  client.width,
 *                                  client.height,
 *                                  viewInfo.drawContext);
 * }
 * &lt;/script&gt;
 * &lt;div id="o3d" style="width: 600px; height: 600px"&gt;&lt;/div&gt;
 * &lt;/body&gt;&lt;/html&gt;
 * </pre>
 *
 * @param {!o3d.Pack} pack Pack to manage created objects.
 * @param {!o3djs.rendergraph.ViewInfo} viewInfo as returned from
 *     o3djs.rendergraph.createBasicView.
 * @param {(!o3djs.math.Vector4|!o3d.Texture)} colorOrTexture Either a color in
 *     the format [r, g, b, a] or an O3D texture.
 * @param {boolean} opt_transparent Whether or not the material is transparent.
 *     Defaults to false.
 * @return {!o3d.Material} The created material.
 */
o3djs.material.createBasicMaterial = function(pack,
                                              viewInfo,
                                              colorOrTexture,
                                              opt_transparent) {
  var material = pack.createObject('Material');
  material.drawList = opt_transparent ? viewInfo.zOrderedDrawList :
                                        viewInfo.performanceDrawList;

  // If it has a length assume it's a color, otherwise assume it's a texture.
  if (colorOrTexture.length) {
    material.createParam('diffuse', 'ParamFloat4').value = colorOrTexture;
  } else {
    var paramSampler = material.createParam('diffuseSampler', 'ParamSampler');
    var sampler = pack.createObject('Sampler');
    paramSampler.value = sampler;
    sampler.texture = colorOrTexture;
  }

  // Create some suitable defaults for the material to save the user having
  // to know all this stuff right off the bat.
  material.createParam('emissive', 'ParamFloat4').value = [0, 0, 0, 1];
  material.createParam('ambient', 'ParamFloat4').value = [0, 0, 0, 1];
  material.createParam('specular', 'ParamFloat4').value = [1, 1, 1, 1];
  material.createParam('shininess', 'ParamFloat').value = 50;
  material.createParam('specularFactor', 'ParamFloat').value = 1;
  material.createParam('lightColor', 'ParamFloat4').value = [1, 1, 1, 1];
  var lightPositionParam = material.createParam('lightWorldPos',
                                                'ParamFloat3');

  o3djs.material.attachStandardEffect(pack, material, viewInfo, 'phong');

  // We have to set the light position after calling attachStandardEffect
  // because attachStandardEffect sets it based on the view.
  lightPositionParam.value = [1000, 2000, 3000];

  return material;
};

/**
 * This function creates a constant material. No lighting. It is especially
 * useful for debugging shapes and 2d UI elements.
 *
 * @param {!o3d.Pack} pack Pack to manage created objects.
 * @param {!o3d.DrawList} drawList The DrawList for the material.
 * @param {(!o3djs.math.Vector4|!o3d.Texture)} colorOrTexture Either a color in
 *     the format [r, g, b, a] or an O3D texture.
 * @return {!o3d.Material} The created material.
 */
o3djs.material.createConstantMaterialEx = function(pack,
                                                   drawList,
                                                   colorOrTexture) {
  var material = pack.createObject('Material');
  material.drawList = drawList;

  // If it has a length assume it's a color, otherwise assume it's a texture.
  if (colorOrTexture.length) {
    material.createParam('emissive', 'ParamFloat4').value = colorOrTexture;
  } else {
    var paramSampler = material.createParam('emissiveSampler', 'ParamSampler');
    var sampler = pack.createObject('Sampler');
    paramSampler.value = sampler;
    sampler.texture = colorOrTexture;
  }

  o3djs.material.attachStandardEffectEx(pack, material, 'constant');

  return material;
};

/**
 * This function creates a constant material. No lighting. It is especially
 * useful for debugging shapes and 2d UI elements.
 *
 * @param {!o3d.Pack} pack Pack to manage created objects.
 * @param {!o3djs.rendergraph.ViewInfo} viewInfo as returned from
 *     o3djs.rendergraph.createBasicView.
 * @param {(!o3djs.math.Vector4|!o3d.Texture)} colorOrTexture Either a color in
 *     the format [r, g, b, a] or an O3D texture.
 * @param {boolean} opt_transparent Whether or not the material is transparent.
 *     Defaults to false.
 * @return {!o3d.Material} The created material.
 */
o3djs.material.createConstantMaterial = function(pack,
                                                 viewInfo,
                                                 colorOrTexture,
                                                 opt_transparent) {
  return o3djs.material.createConstantMaterialEx(
      pack,
      opt_transparent ? viewInfo.zOrderedDrawList :
                        viewInfo.performanceDrawList,
      colorOrTexture)
};

/**
 * This function creates 2 color procedureal texture material.
 *
 * @see o3djs.material.createBasicMaterial
 *
 * @param {!o3d.Pack} pack Pack to manage created objects.
 * @param {!o3djs.rendergraph.ViewInfo} viewInfo as returned from
 *     o3djs.rendergraph.createBasicView.
 * @param {!o3djs.math.Vector4} opt_color1 a color in the format [r, g, b, a].
 *     Defaults to a medium blue-green.
 * @param {!o3djs.math.Vector4} opt_color2 a color in the format [r, g, b, a].
 *     Defaults to a light blue-green.
 * @param {boolean} opt_transparent Whether or not the material is transparent.
 *     Defaults to false.
 * @param {number} opt_checkSize Defaults to 10 units.
 * @return {!o3d.Material} The created material.
 */
o3djs.material.createCheckerMaterial = function(pack,
                                                viewInfo,
                                                opt_color1,
                                                opt_color2,
                                                opt_transparent,
                                                opt_checkSize) {
  opt_color1 = opt_color1 || [0.4, 0.5, 0.5, 1];
  opt_color2 = opt_color2 || [0.6, 0.8, 0.8, 1];
  opt_checkSize = opt_checkSize || 10;

  var effect = o3djs.effect.createCheckerEffect(pack);
  var material = pack.createObject('Material');
  material.effect = effect;
  material.drawList = opt_transparent ? viewInfo.zOrderedDrawList :
                                        viewInfo.performanceDrawList;
  o3djs.effect.createUniformParameters(pack, effect, material);

  material.getParam('color1').value = opt_color1;
  material.getParam('color2').value = opt_color2;
  material.getParam('checkSize').value = opt_checkSize;

  return material;
};

/**
 * Creates a material for an effect loaded from a file.
 * If the effect has already been loaded in the pack it will be reused.
 * @param {!o3d.Pack} pack Pack to create effect in.
 * @param {string} url Url for effect file.
 * @param {!o3d.DrawList} drawList DrawList to assign effect to.
 * @return {!o3d.Material} The material.
 */
o3djs.material.createMaterialFromFile = function(pack, url, drawList) {
  var effect = o3djs.effect.createEffectFromFile(pack, url);

  var material = pack.createObject('Material');
  material.effect = effect;
  material.drawList = drawList;
  o3djs.effect.createUniformParameters(pack, effect, material);

  return material;
};

/**
 * Binds params to all materials in a pack by name.
 * @param {!o3d.Material} material Material to bind params on.
 * @param {!Object} params A object where each property is the name of a param
 *     and its value is that param.
 */
o3djs.material.bindParamsOnMaterial = function(material, params) {
  for (var paramName in params) {
    var sourceParam = params[paramName];
    var param = material.getParam(paramName);
    if (param && sourceParam.isAClassName(param.className)) {
      param.bind(sourceParam);
    }
  }
};

/**
 * Binds params to all materials in a pack by name.
 * @param {!o3d.Pack} pack Pack with materials to bind.
 * @param {!Object} params A object where each property is the name of a param
 *     and its value is that param.
 */
o3djs.material.bindParams = function(pack, params) {
  var materials = pack.getObjectsByClassName('o3d.Material');
  for (var mm = 0; mm < materials.length; ++mm) {
    o3djs.material.bindParamsOnMaterial(materials[mm], params);
  }
};

/**
 * Creates params from a param spec.
 * @param {!o3d.Pack} pack Pack to create params in.
 * @param {!Object} paramSpec An object where each property is the name of a
 *     param and its value is the type of param.
 * @return {!Object} params A object where each property is the name of a param
 *     and its value is that param.
 */
o3djs.material.createParams = function(pack, paramSpec) {
  var paramObject = pack.createObject('ParamObject');
  var params = { };
  for (var paramName in paramSpec) {
    params[paramName] = paramObject.createParam(paramName,
                                                paramSpec[paramName]);
  }
  return params;
};

/**
 * Creates the global params need by the shaders built in effect.js
 *
 * The params currently created are 'lightColor' which is a ParamFloat4 and
 * 'lightWorldPos' which is a ParamFloat3. You can set their values like this
 *
 * <pre>
 * var params = o3djs.material.createStandardParams(pack);
 * param.lightColor.value = [1, 0, 0, 1];  // red
 * param.lightWorldPos.value = [1000, 2000, 3000];  // set light position.
 * </pre>
 *
 * Note: This function just creates the params. It does not connect them to
 * anything. See o3djs.material.createAndBindStandardParams,
 * o3djs.material.createParams and o3djs.material.bindParams
 *
 * @see o3djs.material.createAndBindStandardParams
 * @see o3djs.material.createParams
 * @see o3djs.material.bindParams
 *
 * @param {!o3d.Pack} pack Pack to create params in.
 * @return {!Object} params A object where each property is the name of a param
 *     and its value is that param.
 */
o3djs.material.createStandardParams = function(pack) {
  var paramSpec = {
    'lightColor': 'ParamFloat4',
    'lightWorldPos': 'ParamFloat3'};
  return o3djs.material.createParams(pack, paramSpec);
};

/**
 * Creates the global params need by the shaders built in effect.js then binds
 * all the matching params on materials in pack to these global params.
 *
 * The params currently created are 'lightColor' which is a ParamFloat4 and
 * 'lightWorldPos' which is a ParamFloat3. You can set their values like this
 *
 * <pre>
 * var params = o3djs.material.createAndBindStandardParams(pack);
 * param.lightColor.value = [1, 0, 0, 1];  // red
 * param.lightWorldPos.value = [1000, 2000, 3000];  // set light position.
 * </pre>
 *
 * @see o3djs.material.createParams
 * @see o3djs.material.bindParams
 *
 * @param {!o3d.Pack} pack Pack to create params in.
 * @return {!Object} params A object where each property is the name of a param
 *     and its value is that param.
 */
o3djs.material.createAndBindStandardParams = function(pack) {
  var params = o3djs.material.createStandardParams(pack);
  o3djs.material.bindParams(pack, params);
  return params;
};

/*
 * Copyright 2009, Google Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */


/**
 * @fileoverview This file contains matrix/vector math functions.
 * It adds them to the "math" module on the o3djs object.
 *
 * o3djs.math supports a row-major and a column-major mode.  In both
 * modes, vectors are stored as arrays of numbers, and matrices are stored as
 * arrays of arrays of numbers.
 *
 * In row-major mode:
 *
 * - Rows of a matrix are sub-arrays.
 * - Individual entries of a matrix M get accessed in M[row][column] fashion.
 * - Tuples of coordinates are interpreted as row-vectors.
 * - A vector v gets transformed by a matrix M by multiplying in the order v*M.
 *
 * In column-major mode:
 *
 * - Columns of a matrix are sub-arrays.
 * - Individual entries of a matrix M get accessed in M[column][row] fashion.
 * - Tuples of coordinates are interpreted as column-vectors.
 * - A matrix M transforms a vector v by multiplying in the order M*v.
 *
 * When a function in o3djs.math requires separate row-major and
 * column-major versions, a function with the same name gets added to each of
 * the namespaces o3djs.math.rowMajor and o3djs.math.columnMajor. The
 * function installRowMajorFunctions() or the function
 * installColumnMajorFunctions() should get called during initialization to
 * establish the mode.  installRowMajorFunctions() works by iterating through
 * the o3djs.math.rowMajor namespace and for each function foo, setting
 * o3djs.math.foo equal to o3djs.math.rowMajor.foo.
 * installRowMajorFunctions() works the same way, iterating over the columnMajor
 * namespace.  At the end of this file, we call installRowMajorFunctions().
 *
 * Switching modes changes two things.  It changes how a matrix is encoded as an
 * array, and it changes how the entries of a matrix get interpreted.  Because
 * those two things change together, the matrix representing a given
 * transformation of space is the same JavaScript object in either mode.
 * One consequence of this is that very few functions require separate row-major
 * and column-major versions.  Typically, a function requires separate versions
 * only if it makes matrix multiplication order explicit, like
 * mulMatrixMatrix(), mulMatrixVector(), or mulVectorMatrix().  Functions which
 * create a new matrix, like scaling(), rotationZYX(), and translation() return
 * the same JavaScript object in either mode, and functions which implicitly
 * multiply like scale(), rotateZYX() and translate() modify the matrix in the
 * same way in either mode.
 *
 * The convention choice made for math functions in this library is independent
 * of the convention choice for how matrices get loaded into shaders.  That
 * convention is determined on a per-shader basis.
 *
 * Other utilities in o3djs should avoid making calls to functions that make
 * multiplication order explicit.  Instead they should appeal to functions like:
 *
 * o3djs.math.matrix4.transformPoint
 * o3djs.math.matrix4.transformDirection
 * o3djs.math.matrix4.transformNormal
 * o3djs.math.matrix4.transformVector4
 * o3djs.math.matrix4.composition
 * o3djs.math.matrix4.compose
 *
 * These functions multiply matrices implicitly and internally choose the
 * multiplication order to get the right result.  That way, utilities which use
 * o3djs.math work in either major mode.  Note that this does not necessarily
 * mean all sample code will work even if a line is added which switches major
 * modes, but it does mean that calls to o3djs still do what they are supposed
 * to.
 *
 */

o3djs.provide('o3djs.math');

/**
 * A module for math for o3djs.math.
 * @namespace
 */
o3djs.math = o3djs.math || {};

/**
 * A random seed for the pseudoRandom function.
 * @private
 * @type {number}
 */
o3djs.math.randomSeed_ = 0;

/**
 * A constant for the pseudoRandom function
 * @private
 * @type {number}
 */
o3djs.math.RANDOM_RANGE_ = Math.pow(2, 32);

/**
 * Functions which deal with 4-by-4 transformation matrices are kept in their
 * own namespsace.
 * @namespace
 */
o3djs.math.matrix4 = o3djs.math.matrix4 || {};

/**
 * Functions that are specifically row major are kept in their own namespace.
 * @namespace
 */
o3djs.math.rowMajor = o3djs.math.rowMajor || {};

/**
 * Functions that are specifically column major are kept in their own namespace.
 * @namespace
 */
o3djs.math.columnMajor = o3djs.math.columnMajor || {};

/**
 * Functions that do error checking are stored in their own namespace.
 * @namespace
 */
o3djs.math.errorCheck = o3djs.math.errorCheck || {};

/**
 * Functions that do no error checking and have a separate version that does in
 * o3djs.math.errorCheck are stored in their own namespace.
 * @namespace
 */
o3djs.math.errorCheckFree = o3djs.math.errorCheckFree || {};

/**
 * An Array of 2 floats
 * @type {(!Array.<number>|!o3d.Float2)}
 */
o3djs.math.Vector2 = goog.typedef;

/**
 * An Array of 3 floats
 * @type {(!Array.<number>|!o3d.Float3)}
 */
o3djs.math.Vector3 = goog.typedef;

/**
 * An Array of 4 floats
 * @type {(!Array.<number>|!o3d.Float4)}
 */
o3djs.math.Vector4 = goog.typedef;

/**
 * An Array of floats.
 * @type {!Array.<number>}
 */
o3djs.math.Vector = goog.typedef;

/**
 * A 1x1 Matrix of floats
 * @type {!Array.<!Array.<number>>}
 */
o3djs.math.Matrix1 = goog.typedef;

/**
 * A 2x2 Matrix of floats
 * @type {!Array.<!Array.<number>>}
 */
o3djs.math.Matrix2 = goog.typedef;

/**
 * A 3x3 Matrix of floats
 * @type {!Array.<!Array.<number>>}
 */
o3djs.math.Matrix3 = goog.typedef;

/**
 * A 4x4 Matrix of floats
 * @type {(!Array.<!Array.<number>>|!o3d.Matrix4)}
 */
o3djs.math.Matrix4 = goog.typedef;

/**
 * A arbitrary size Matrix of floats
 * @type {(!Array.<!Array.<number>>|!o3d.Matrix4)}
 */
o3djs.math.Matrix = goog.typedef;

/**
 * Returns a deterministic pseudorandom number between 0 and 1
 * @return {number} a random number between 0 and 1
 */
o3djs.math.pseudoRandom = function() {
  var math = o3djs.math;
  return (math.randomSeed_ =
          (134775813 * math.randomSeed_ + 1) %
          math.RANDOM_RANGE_) / math.RANDOM_RANGE_;
};

/**
 * Resets the pseudoRandom function sequence.
 */
o3djs.math.resetPseudoRandom = function() {
  o3djs.math.randomSeed_ = 0;
};

/**
 * Converts degrees to radians.
 * @param {number} degrees A value in degrees.
 * @return {number} the value in radians.
 */
o3djs.math.degToRad = function(degrees) {
  return degrees * Math.PI / 180;
};

/**
 * Converts radians to degrees.
 * @param {number} radians A value in radians.
 * @return {number} the value in degrees.
 */
o3djs.math.radToDeg = function(radians) {
  return radians * 180 / Math.PI;
};

/**
 * Performs linear interpolation on two scalars.
 * Given scalars a and b and interpolation coefficient t, returns
 * (1 - t) * a + t * b.
 * @param {number} a Operand scalar.
 * @param {number} b Operand scalar.
 * @param {number} t Interpolation coefficient.
 * @return {number} The weighted sum of a and b.
 */
o3djs.math.lerpScalar = function(a, b, t) {
  return (1 - t) * a + t * b;
};

/**
 * Adds two vectors; assumes a and b have the same dimension.
 * @param {!o3djs.math.Vector} a Operand vector.
 * @param {!o3djs.math.Vector} b Operand vector.
 * @return {!o3djs.math.Vector} The sum of a and b.
 */
o3djs.math.addVector = function(a, b) {
  var r = [];
  var aLength = a.length;
  for (var i = 0; i < aLength; ++i)
    r[i] = a[i] + b[i];
  return r;
};

/**
 * Subtracts two vectors.
 * @param {!o3djs.math.Vector} a Operand vector.
 * @param {!o3djs.math.Vector} b Operand vector.
 * @return {!o3djs.math.Vector} The difference of a and b.
 */
o3djs.math.subVector = function(a, b) {
  var r = [];
  var aLength = a.length;
  for (var i = 0; i < aLength; ++i)
    r[i] = a[i] - b[i];
  return r;
};

/**
 * Performs linear interpolation on two vectors.
 * Given vectors a and b and interpolation coefficient t, returns
 * (1 - t) * a + t * b.
 * @param {!o3djs.math.Vector} a Operand vector.
 * @param {!o3djs.math.Vector} b Operand vector.
 * @param {number} t Interpolation coefficient.
 * @return {!o3djs.math.Vector} The weighted sum of a and b.
 */
o3djs.math.lerpVector = function(a, b, t) {
  var r = [];
  var aLength = a.length;
  for (var i = 0; i < aLength; ++i)
    r[i] = (1 - t) * a[i] + t * b[i];
  return r;
};

/**
 * Clamps a value between 0 and range using a modulo.
 * @param {number} v Value to clamp mod.
 * @param {number} range Range to clamp to.
 * @param {number} opt_rangeStart start of range. Default = 0.
 * @return {number} Clamp modded value.
 */
o3djs.math.modClamp = function(v, range, opt_rangeStart) {
  var start = opt_rangeStart || 0;
  if (range < 0.00001) {
    return start;
  }
  v -= start;
  if (v < 0) {
    v -= Math.floor(v / range) * range;
  } else {
    v = v % range;
  }
  return v + start;
};

/**
 * Lerps in a circle.
 * Does a lerp between a and b but inside range so for example if
 * range is 100, a is 95 and b is 5 lerping will go in the positive direction.
 * @param {number} a Start value.
 * @param {number} b Target value.
 * @param {number} t Amount to lerp (0 to 1).
 * @param {number} range Range of circle.
 * @return {number} lerped result.
 */
o3djs.math.lerpCircular = function(a, b, t, range) {
  a = o3djs.math.modClamp(a, range);
  b = o3djs.math.modClamp(b, range);
  var delta = b - a;
  if (Math.abs(delta) > range * 0.5) {
    if (delta > 0) {
      b -= range;
    } else {
      b += range;
    }
  }
  return o3djs.math.modClamp(o3djs.math.lerpScalar(a, b, t), range);
};

/**
 * Lerps radians.
 * @param {number} a Start value.
 * @param {number} b Target value.
 * @param {number} t Amount to lerp (0 to 1).
 * @return {number} lerped result.
 */
o3djs.math.lerpRadian = function(a, b, t) {
  return o3djs.math.lerpCircular(a, b, t, Math.PI * 2);
};

/**
 * Divides a vector by a scalar.
 * @param {!o3djs.math.Vector} v The vector.
 * @param {number} k The scalar.
 * @return {!o3djs.math.Vector} v The vector v divided by k.
 */
o3djs.math.divVectorScalar = function(v, k) {
  var r = [];
  var vLength = v.length;
  for (var i = 0; i < vLength; ++i)
    r[i] = v[i] / k;
  return r;
};

/**
 * Computes the dot product of two vectors; assumes that a and b have
 * the same dimension.
 * @param {!o3djs.math.Vector} a Operand vector.
 * @param {!o3djs.math.Vector} b Operand vector.
 * @return {number} The dot product of a and b.
 */
o3djs.math.dot = function(a, b) {
  var r = 0.0;
  var aLength = a.length;
  for (var i = 0; i < aLength; ++i)
    r += a[i] * b[i];
  return r;
};

/**
 * Computes the cross product of two vectors; assumes both vectors have
 * three entries.
 * @param {!o3djs.math.Vector} a Operand vector.
 * @param {!o3djs.math.Vector} b Operand vector.
 * @return {!o3djs.math.Vector} The vector a cross b.
 */
o3djs.math.cross = function(a, b) {
  return [a[1] * b[2] - a[2] * b[1],
          a[2] * b[0] - a[0] * b[2],
          a[0] * b[1] - a[1] * b[0]];
};

/**
 * Computes the Euclidean length of a vector, i.e. the square root of the
 * sum of the squares of the entries.
 * @param {!o3djs.math.Vector} a The vector.
 * @return {number} The length of a.
 */
o3djs.math.length = function(a) {
  var r = 0.0;
  var aLength = a.length;
  for (var i = 0; i < aLength; ++i)
    r += a[i] * a[i];
  return Math.sqrt(r);
};

/**
 * Computes the square of the Euclidean length of a vector, i.e. the sum
 * of the squares of the entries.
 * @param {!o3djs.math.Vector} a The vector.
 * @return {number} The square of the length of a.
 */
o3djs.math.lengthSquared = function(a) {
  var r = 0.0;
  var aLength = a.length;
  for (var i = 0; i < aLength; ++i)
    r += a[i] * a[i];
  return r;
};

/**
 * Computes the Euclidean distance between two vectors.
 * @param {!o3djs.math.Vector} a A vector.
 * @param {!o3djs.math.Vector} b A vector.
 * @return {number} The distance between a and b.
 */
o3djs.math.distance = function(a, b) {
  var r = 0.0;
  var aLength = a.length;
  for (var i = 0; i < aLength; ++i) {
    var t = a[i] - b[i];
    r += t * t;
  }
  return Math.sqrt(r);
};

/**
 * Computes the square of the Euclidean distance between two vectors.
 * @param {!o3djs.math.Vector} a A vector.
 * @param {!o3djs.math.Vector} b A vector.
 * @return {number} The distance between a and b.
 */
o3djs.math.distanceSquared = function(a, b) {
  var r = 0.0;
  var aLength = a.length;
  for (var i = 0; i < aLength; ++i) {
    var t = a[i] - b[i];
    r += t * t;
  }
  return r;
};

/**
 * Divides a vector by its Euclidean length and returns the quotient.
 * @param {!o3djs.math.Vector} a The vector.
 * @return {!o3djs.math.Vector} The normalized vector.
 */
o3djs.math.normalize = function(a) {
  var r = [];
  var n = 0.0;
  var aLength = a.length;
  for (var i = 0; i < aLength; ++i)
    n += a[i] * a[i];
  n = Math.sqrt(n);
  for (var i = 0; i < aLength; ++i)
    r[i] = a[i] / n;
  return r;
};

/**
 * Adds two matrices; assumes a and b are the same size.
 * @param {!o3djs.math.Matrix} a Operand matrix.
 * @param {!o3djs.math.Matrix} b Operand matrix.
 * @return {!o3djs.math.Matrix} The sum of a and b.
 */
o3djs.math.addMatrix = function(a, b) {
  var r = [];
  var aLength = a.length;
  var a0Length = a[0].length;
  for (var i = 0; i < aLength; ++i) {
    var row = [];
    var ai = a[i];
    var bi = b[i];
    for (var j = 0; j < a0Length; ++j)
      row[j] = ai[j] + bi[j];
    r[i] = row;
  }
  return r;
};

/**
 * Subtracts two matrices; assumes a and b are the same size.
 * @param {!o3djs.math.Matrix} a Operand matrix.
 * @param {!o3djs.math.Matrix} b Operand matrix.
 * @return {!o3djs.math.Matrix} The sum of a and b.
 */
o3djs.math.subMatrix = function(a, b) {
  var r = [];
  var aLength = a.length;
  var a0Length = a[0].length;
  for (var i = 0; i < aLength; ++i) {
    var row = [];
    var ai = a[i];
    var bi = b[i];
    for (var j = 0; j < a0Length; ++j)
      row[j] = ai[j] - bi[j];
    r[i] = row;
  }
  return r;
};

/**
 * Performs linear interpolation on two matrices.
 * Given matrices a and b and interpolation coefficient t, returns
 * (1 - t) * a + t * b.
 * @param {!o3djs.math.Matrix} a Operand matrix.
 * @param {!o3djs.math.Matrix} b Operand matrix.
 * @param {number} t Interpolation coefficient.
 * @return {!o3djs.math.Matrix} The weighted of a and b.
 */
o3djs.math.lerpMatrix = function(a, b, t) {
  var r = [];
  var aLength = a.length;
  var a0Length = a[0].length;
  for (var i = 0; i < aLength; ++i) {
    var row = [];
    var ai = a[i];
    var bi = b[i];
    for (var j = 0; j < a0Length; ++j)
      row[j] = (1 - t) * ai[j] + t * bi[j];
    r[i] = row;
  }
  return r;
};

/**
 * Divides a matrix by a scalar.
 * @param {!o3djs.math.Matrix} m The matrix.
 * @param {number} k The scalar.
 * @return {!o3djs.math.Matrix} The matrix m divided by k.
 */
o3djs.math.divMatrixScalar = function(m, k) {
  var r = [];
  var mLength = m.length;
  var m0Length = m[0].length;
  for (var i = 0; i < mLength; ++i) {
    r[i] = [];
    for (var j = 0; j < m0Length; ++j)
      r[i][j] = m[i][j] / k;
  }
  return r;
};

/**
 * Negates a scalar.
 * @param {number} a The scalar.
 * @return {number} -a.
 */
o3djs.math.negativeScalar = function(a) {
 return -a;
};

/**
 * Negates a vector.
 * @param {!o3djs.math.Vector} v The vector.
 * @return {!o3djs.math.Vector} -v.
 */
o3djs.math.negativeVector = function(v) {
 var r = [];
 var vLength = v.length;
 for (var i = 0; i < vLength; ++i) {
   r[i] = -v[i];
 }
 return r;
};

/**
 * Negates a matrix.
 * @param {!o3djs.math.Matrix} m The matrix.
 * @return {!o3djs.math.Matrix} -m.
 */
o3djs.math.negativeMatrix = function(m) {
 var r = [];
 var mLength = m.length;
 var m0Length = m[0].length;
 for (var i = 0; i < mLength; ++i) {
   r[i] = [];
   for (var j = 0; j < m0Length; ++j)
     r[i][j] = -m[i][j];
 }
 return r;
};

/**
 * Copies a scalar.
 * @param {number} a The scalar.
 * @return {number} a.
 */
o3djs.math.copyScalar = function(a) {
  return a;
};

/**
 * Copies a vector.
 * @param {!o3djs.math.Vector} v The vector.
 * @return {!o3djs.math.Vector} A copy of v.
 */
o3djs.math.copyVector = function(v) {
  var r = [];
  for (var i = 0; i < v.length; i++)
    r[i] = v[i];
  return r;
};

/**
 * Copies a matrix.
 * @param {!o3djs.math.Matrix} m The matrix.
 * @return {!o3djs.math.Matrix} A copy of m.
 */
o3djs.math.copyMatrix = function(m) {
  var r = [];
  var mLength = m.length;
  for (var i = 0; i < mLength; ++i) {
    r[i] = [];
    for (var j = 0; j < m[i].length; j++) {
      r[i][j] = m[i][j];
    }
  }
  return r;
};

/**
 * Returns the elements of a matrix as a one-dimensional array. The
 * rows or columns (depending on whether the matrix is row-major or
 * column-major) are concatenated.
 * @param {!o3djs.math.Matrix} m The matrix.
 * @return {!Array.<number>} The matrix's elements as a one-dimensional array.
 */
o3djs.math.getMatrixElements = function(m) {
  var r = [];
  var mLength = m.length;
  var k = 0;
  for (var i = 0; i < mLength; i++) {
    for (var j = 0; j < m[i].length; j++) {
      r[k++] = m[i][j];
    }
  }
  return r;
};

/**
 * Multiplies two scalars.
 * @param {number} a Operand scalar.
 * @param {number} b Operand scalar.
 * @return {number} The product of a and b.
 */
o3djs.math.mulScalarScalar = function(a, b) {
  return a * b;
};

/**
 * Multiplies a scalar by a vector.
 * @param {number} k The scalar.
 * @param {!o3djs.math.Vector} v The vector.
 * @return {!o3djs.math.Vector} The product of k and v.
 */
o3djs.math.mulScalarVector = function(k, v) {
  var r = [];
  var vLength = v.length;
  for (var i = 0; i < vLength; ++i) {
    r[i] = k * v[i];
  }
  return r;
};

/**
 * Multiplies a vector by a scalar.
 * @param {!o3djs.math.Vector} v The vector.
 * @param {number} k The scalar.
 * @return {!o3djs.math.Vector} The product of k and v.
 */
o3djs.math.mulVectorScalar = function(v, k) {
  return o3djs.math.mulScalarVector(k, v);
};

/**
 * Multiplies a scalar by a matrix.
 * @param {number} k The scalar.
 * @param {!o3djs.math.Matrix} m The matrix.
 * @return {!o3djs.math.Matrix} The product of m and k.
 */
o3djs.math.mulScalarMatrix = function(k, m) {
  var r = [];
  var mLength = m.length;
  var m0Length = m[0].length;
  for (var i = 0; i < mLength; ++i) {
    r[i] = [];
    for (var j = 0; j < m0Length; ++j)
      r[i][j] = k * m[i][j];
  }
  return r;
};

/**
 * Multiplies a matrix by a scalar.
 * @param {!o3djs.math.Matrix} m The matrix.
 * @param {number} k The scalar.
 * @return {!o3djs.math.Matrix} The product of m and k.
 */
o3djs.math.mulMatrixScalar = function(m, k) {
  return o3djs.math.mulScalarMatrix(k, m);
};

/**
 * Multiplies a vector by another vector (component-wise); assumes a and
 * b have the same length.
 * @param {!o3djs.math.Vector} a Operand vector.
 * @param {!o3djs.math.Vector} b Operand vector.
 * @return {!o3djs.math.Vector} The vector of products of entries of a and
 *     b.
 */
o3djs.math.mulVectorVector = function(a, b) {
  var r = [];
  var aLength = a.length;
  for (var i = 0; i < aLength; ++i)
    r[i] = a[i] * b[i];
  return r;
};

/**
 * Divides a vector by another vector (component-wise); assumes a and
 * b have the same length.
 * @param {!o3djs.math.Vector} a Operand vector.
 * @param {!o3djs.math.Vector} b Operand vector.
 * @return {!o3djs.math.Vector} The vector of quotients of entries of a and
 *     b.
 */
o3djs.math.divVectorVector = function(a, b) {
  var r = [];
  var aLength = a.length;
  for (var i = 0; i < aLength; ++i)
    r[i] = a[i] / b[i];
  return r;
};

/**
 * Multiplies a vector by a matrix; treats the vector as a row vector; assumes
 * matrix entries are accessed in [row][column] fashion.
 * @param {!o3djs.math.Vector} v The vector.
 * @param {!o3djs.math.Matrix} m The matrix.
 * @return {!o3djs.math.Vector} The product of v and m as a row vector.
 */
o3djs.math.rowMajor.mulVectorMatrix = function(v, m) {
  var r = [];
  var m0Length = m[0].length;
  var vLength = v.length;
  for (var i = 0; i < m0Length; ++i) {
    r[i] = 0.0;
    for (var j = 0; j < vLength; ++j)
      r[i] += v[j] * m[j][i];
  }
  return r;
};

/**
 * Multiplies a vector by a matrix; treats the vector as a row vector; assumes
 * matrix entries are accessed in [column][row] fashion.
 * @param {!o3djs.math.Vector} v The vector.
 * @param {!o3djs.math.Matrix} m The matrix.
 * @return {!o3djs.math.Vector} The product of v and m as a row vector.
 */
o3djs.math.columnMajor.mulVectorMatrix = function(v, m) {
  var r = [];
  var mLength = m.length;
  var vLength = v.length;
  for (var i = 0; i < mLength; ++i) {
    r[i] = 0.0;
    var column = m[i];
    for (var j = 0; j < vLength; ++j)
      r[i] += v[j] * column[j];
  }
  return r;
};

/**
 * Multiplies a vector by a matrix; treats the vector as a row vector.
 * @param {!o3djs.math.Matrix} m The matrix.
 * @param {!o3djs.math.Vector} v The vector.
 * @return {!o3djs.math.Vector} The product of m and v as a row vector.
 */
o3djs.math.mulVectorMatrix = null;

/**
 * Multiplies a matrix by a vector; treats the vector as a column vector.
 * assumes matrix entries are accessed in [row][column] fashion.
 * @param {!o3djs.math.Matrix} m The matrix.
 * @param {!o3djs.math.Vector} v The vector.
 * @return {!o3djs.math.Vector} The product of m and v as a column vector.
 */
o3djs.math.rowMajor.mulMatrixVector = function(m, v) {
  var r = [];
  var mLength = m.length;
  var m0Length = m[0].length;
  for (var i = 0; i < mLength; ++i) {
    r[i] = 0.0;
    var row = m[i];
    for (var j = 0; j < m0Length; ++j)
      r[i] += row[j] * v[j];
  }
  return r;
};

/**
 * Multiplies a matrix by a vector; treats the vector as a column vector;
 * assumes matrix entries are accessed in [column][row] fashion.
 * @param {!o3djs.math.Matrix} m The matrix.
 * @param {!o3djs.math.Vector} v The vector.
 * @return {!o3djs.math.Vector} The product of m and v as a column vector.
 */
o3djs.math.columnMajor.mulMatrixVector = function(m, v) {
  var r = [];
  var m0Length = m[0].length;
  var vLength = v.length;
  for (var i = 0; i < m0Length; ++i) {
    r[i] = 0.0;
    for (var j = 0; j < vLength; ++j)
      r[i] += v[j] * m[j][i];
  }
  return r;
};

/**
 * Multiplies a matrix by a vector; treats the vector as a column vector.
 * @param {!o3djs.math.Matrix} m The matrix.
 * @param {!o3djs.math.Vector} v The vector.
 * @return {!o3djs.math.Vector} The product of m and v as a column vector.
 */
o3djs.math.mulMatrixVector = null;

/**
 * Multiplies two 2-by-2 matrices; assumes that the given matrices are 2-by-2;
 * assumes matrix entries are accessed in [row][column] fashion.
 * @param {!o3djs.math.Matrix2} a The matrix on the left.
 * @param {!o3djs.math.Matrix2} b The matrix on the right.
 * @return {!o3djs.math.Matrix2} The matrix product of a and b.
 */
o3djs.math.rowMajor.mulMatrixMatrix2 = function(a, b) {
  var a0 = a[0];
  var a1 = a[1];
  var b0 = b[0];
  var b1 = b[1];
  var a00 = a0[0];
  var a01 = a0[1];
  var a10 = a1[0];
  var a11 = a1[1];
  var b00 = b0[0];
  var b01 = b0[1];
  var b10 = b1[0];
  var b11 = b1[1];
  return [[a00 * b00 + a01 * b10, a00 * b01 + a01 * b11],
          [a10 * b00 + a11 * b10, a10 * b01 + a11 * b11]];
};

/**
 * Multiplies two 2-by-2 matrices; assumes that the given matrices are 2-by-2;
 * assumes matrix entries are accessed in [column][row] fashion.
 * @param {!o3djs.math.Matrix2} a The matrix on the left.
 * @param {!o3djs.math.Matrix2} b The matrix on the right.
 * @return {!o3djs.math.Matrix2} The matrix product of a and b.
 */
o3djs.math.columnMajor.mulMatrixMatrix2 = function(a, b) {
  var a0 = a[0];
  var a1 = a[1];
  var b0 = b[0];
  var b1 = b[1];
  var a00 = a0[0];
  var a01 = a0[1];
  var a10 = a1[0];
  var a11 = a1[1];
  var b00 = b0[0];
  var b01 = b0[1];
  var b10 = b1[0];
  var b11 = b1[1];
  return [[a00 * b00 + a10 * b01, a01 * b00 + a11 * b01],
          [a00 * b10 + a10 * b11, a01 * b10 + a11 * b11]];
};

/**
 * Multiplies two 2-by-2 matrices.
 * @param {!o3djs.math.Matrix2} a The matrix on the left.
 * @param {!o3djs.math.Matrix2} b The matrix on the right.
 * @return {!o3djs.math.Matrix2} The matrix product of a and b.
 */
o3djs.math.mulMatrixMatrix2 = null;


/**
 * Multiplies two 3-by-3 matrices; assumes that the given matrices are 3-by-3;
 * assumes matrix entries are accessed in [row][column] fashion.
 * @param {!o3djs.math.Matrix3} a The matrix on the left.
 * @param {!o3djs.math.Matrix3} b The matrix on the right.
 * @return {!o3djs.math.Matrix3} The matrix product of a and b.
 */
o3djs.math.rowMajor.mulMatrixMatrix3 = function(a, b) {
  var a0 = a[0];
  var a1 = a[1];
  var a2 = a[2];
  var b0 = b[0];
  var b1 = b[1];
  var b2 = b[2];
  var a00 = a0[0];
  var a01 = a0[1];
  var a02 = a0[2];
  var a10 = a1[0];
  var a11 = a1[1];
  var a12 = a1[2];
  var a20 = a2[0];
  var a21 = a2[1];
  var a22 = a2[2];
  var b00 = b0[0];
  var b01 = b0[1];
  var b02 = b0[2];
  var b10 = b1[0];
  var b11 = b1[1];
  var b12 = b1[2];
  var b20 = b2[0];
  var b21 = b2[1];
  var b22 = b2[2];
  return [[a00 * b00 + a01 * b10 + a02 * b20,
           a00 * b01 + a01 * b11 + a02 * b21,
           a00 * b02 + a01 * b12 + a02 * b22],
          [a10 * b00 + a11 * b10 + a12 * b20,
           a10 * b01 + a11 * b11 + a12 * b21,
           a10 * b02 + a11 * b12 + a12 * b22],
          [a20 * b00 + a21 * b10 + a22 * b20,
           a20 * b01 + a21 * b11 + a22 * b21,
           a20 * b02 + a21 * b12 + a22 * b22]];
};

/**
 * Multiplies two 3-by-3 matrices; assumes that the given matrices are 3-by-3;
 * assumes matrix entries are accessed in [column][row] fashion.
 * @param {!o3djs.math.Matrix3} a The matrix on the left.
 * @param {!o3djs.math.Matrix3} b The matrix on the right.
 * @return {!o3djs.math.Matrix3} The matrix product of a and b.
 */
o3djs.math.columnMajor.mulMatrixMatrix3 = function(a, b) {
  var a0 = a[0];
  var a1 = a[1];
  var a2 = a[2];
  var b0 = b[0];
  var b1 = b[1];
  var b2 = b[2];
  var a00 = a0[0];
  var a01 = a0[1];
  var a02 = a0[2];
  var a10 = a1[0];
  var a11 = a1[1];
  var a12 = a1[2];
  var a20 = a2[0];
  var a21 = a2[1];
  var a22 = a2[2];
  var b00 = b0[0];
  var b01 = b0[1];
  var b02 = b0[2];
  var b10 = b1[0];
  var b11 = b1[1];
  var b12 = b1[2];
  var b20 = b2[0];
  var b21 = b2[1];
  var b22 = b2[2];
  return [[a00 * b00 + a10 * b01 + a20 * b02,
           a01 * b00 + a11 * b01 + a21 * b02,
           a02 * b00 + a12 * b01 + a22 * b02],
          [a00 * b10 + a10 * b11 + a20 * b12,
           a01 * b10 + a11 * b11 + a21 * b12,
           a02 * b10 + a12 * b11 + a22 * b12],
          [a00 * b20 + a10 * b21 + a20 * b22,
           a01 * b20 + a11 * b21 + a21 * b22,
           a02 * b20 + a12 * b21 + a22 * b22]];
};

/**
 * Multiplies two 3-by-3 matrices; assumes that the given matrices are 3-by-3.
 * @param {!o3djs.math.Matrix3} a The matrix on the left.
 * @param {!o3djs.math.Matrix3} b The matrix on the right.
 * @return {!o3djs.math.Matrix3} The matrix product of a and b.
 */
o3djs.math.mulMatrixMatrix3 = null;

/**
 * Multiplies two 4-by-4 matrices; assumes that the given matrices are 4-by-4;
 * assumes matrix entries are accessed in [row][column] fashion.
 * @param {!o3djs.math.Matrix4} a The matrix on the left.
 * @param {!o3djs.math.Matrix4} b The matrix on the right.
 * @return {!o3djs.math.Matrix4} The matrix product of a and b.
 */
o3djs.math.rowMajor.mulMatrixMatrix4 = function(a, b) {
  var a0 = a[0];
  var a1 = a[1];
  var a2 = a[2];
  var a3 = a[3];
  var b0 = b[0];
  var b1 = b[1];
  var b2 = b[2];
  var b3 = b[3];
  var a00 = a0[0];
  var a01 = a0[1];
  var a02 = a0[2];
  var a03 = a0[3];
  var a10 = a1[0];
  var a11 = a1[1];
  var a12 = a1[2];
  var a13 = a1[3];
  var a20 = a2[0];
  var a21 = a2[1];
  var a22 = a2[2];
  var a23 = a2[3];
  var a30 = a3[0];
  var a31 = a3[1];
  var a32 = a3[2];
  var a33 = a3[3];
  var b00 = b0[0];
  var b01 = b0[1];
  var b02 = b0[2];
  var b03 = b0[3];
  var b10 = b1[0];
  var b11 = b1[1];
  var b12 = b1[2];
  var b13 = b1[3];
  var b20 = b2[0];
  var b21 = b2[1];
  var b22 = b2[2];
  var b23 = b2[3];
  var b30 = b3[0];
  var b31 = b3[1];
  var b32 = b3[2];
  var b33 = b3[3];
  return [[a00 * b00 + a01 * b10 + a02 * b20 + a03 * b30,
           a00 * b01 + a01 * b11 + a02 * b21 + a03 * b31,
           a00 * b02 + a01 * b12 + a02 * b22 + a03 * b32,
           a00 * b03 + a01 * b13 + a02 * b23 + a03 * b33],
          [a10 * b00 + a11 * b10 + a12 * b20 + a13 * b30,
           a10 * b01 + a11 * b11 + a12 * b21 + a13 * b31,
           a10 * b02 + a11 * b12 + a12 * b22 + a13 * b32,
           a10 * b03 + a11 * b13 + a12 * b23 + a13 * b33],
          [a20 * b00 + a21 * b10 + a22 * b20 + a23 * b30,
           a20 * b01 + a21 * b11 + a22 * b21 + a23 * b31,
           a20 * b02 + a21 * b12 + a22 * b22 + a23 * b32,
           a20 * b03 + a21 * b13 + a22 * b23 + a23 * b33],
          [a30 * b00 + a31 * b10 + a32 * b20 + a33 * b30,
           a30 * b01 + a31 * b11 + a32 * b21 + a33 * b31,
           a30 * b02 + a31 * b12 + a32 * b22 + a33 * b32,
           a30 * b03 + a31 * b13 + a32 * b23 + a33 * b33]];
};

/**
 * Multiplies two 4-by-4 matrices; assumes that the given matrices are 4-by-4;
 * assumes matrix entries are accessed in [column][row] fashion.
 * @param {!o3djs.math.Matrix4} a The matrix on the left.
 * @param {!o3djs.math.Matrix4} b The matrix on the right.
 * @return {!o3djs.math.Matrix4} The matrix product of a and b.
 */
o3djs.math.columnMajor.mulMatrixMatrix4 = function(a, b) {
  var a0 = a[0];
  var a1 = a[1];
  var a2 = a[2];
  var a3 = a[3];
  var b0 = b[0];
  var b1 = b[1];
  var b2 = b[2];
  var b3 = b[3];
  var a00 = a0[0];
  var a01 = a0[1];
  var a02 = a0[2];
  var a03 = a0[3];
  var a10 = a1[0];
  var a11 = a1[1];
  var a12 = a1[2];
  var a13 = a1[3];
  var a20 = a2[0];
  var a21 = a2[1];
  var a22 = a2[2];
  var a23 = a2[3];
  var a30 = a3[0];
  var a31 = a3[1];
  var a32 = a3[2];
  var a33 = a3[3];
  var b00 = b0[0];
  var b01 = b0[1];
  var b02 = b0[2];
  var b03 = b0[3];
  var b10 = b1[0];
  var b11 = b1[1];
  var b12 = b1[2];
  var b13 = b1[3];
  var b20 = b2[0];
  var b21 = b2[1];
  var b22 = b2[2];
  var b23 = b2[3];
  var b30 = b3[0];
  var b31 = b3[1];
  var b32 = b3[2];
  var b33 = b3[3];
  return [[a00 * b00 + a10 * b01 + a20 * b02 + a30 * b03,
           a01 * b00 + a11 * b01 + a21 * b02 + a31 * b03,
           a02 * b00 + a12 * b01 + a22 * b02 + a32 * b03,
           a03 * b00 + a13 * b01 + a23 * b02 + a33 * b03],
          [a00 * b10 + a10 * b11 + a20 * b12 + a30 * b13,
           a01 * b10 + a11 * b11 + a21 * b12 + a31 * b13,
           a02 * b10 + a12 * b11 + a22 * b12 + a32 * b13,
           a03 * b10 + a13 * b11 + a23 * b12 + a33 * b13],
          [a00 * b20 + a10 * b21 + a20 * b22 + a30 * b23,
           a01 * b20 + a11 * b21 + a21 * b22 + a31 * b23,
           a02 * b20 + a12 * b21 + a22 * b22 + a32 * b23,
           a03 * b20 + a13 * b21 + a23 * b22 + a33 * b23],
          [a00 * b30 + a10 * b31 + a20 * b32 + a30 * b33,
           a01 * b30 + a11 * b31 + a21 * b32 + a31 * b33,
           a02 * b30 + a12 * b31 + a22 * b32 + a32 * b33,
           a03 * b30 + a13 * b31 + a23 * b32 + a33 * b33]];
};

/**
 * Multiplies two 4-by-4 matrices; assumes that the given matrices are 4-by-4.
 * @param {!o3djs.math.Matrix4} a The matrix on the left.
 * @param {!o3djs.math.Matrix4} b The matrix on the right.
 * @return {!o3djs.math.Matrix4} The matrix product of a and b.
 */
o3djs.math.mulMatrixMatrix4 = null;

/**
 * Multiplies two matrices; assumes that the sizes of the matrices are
 * appropriately compatible; assumes matrix entries are accessed in
 * [row][column] fashion.
 * @param {!o3djs.math.Matrix} a The matrix on the left.
 * @param {!o3djs.math.Matrix} b The matrix on the right.
 * @return {!o3djs.math.Matrix} The matrix product of a and b.
 */
o3djs.math.rowMajor.mulMatrixMatrix = function(a, b) {
  var r = [];
  var aRows = a.length;
  var bColumns = b[0].length;
  var bRows = b.length;
  for (var i = 0; i < aRows; ++i) {
    var v = [];    // v becomes a row of the answer.
    var ai = a[i]; // ith row of a.
    for (var j = 0; j < bColumns; ++j) {
      v[j] = 0.0;
      for (var k = 0; k < bRows; ++k)
        v[j] += ai[k] * b[k][j]; // kth row, jth column.
    }
    r[i] = v;
  }
  return r;
};

/**
 * Multiplies two matrices; assumes that the sizes of the matrices are
 * appropriately compatible; assumes matrix entries are accessed in
 * [row][column] fashion.
 * @param {!o3djs.math.Matrix} a The matrix on the left.
 * @param {!o3djs.math.Matrix} b The matrix on the right.
 * @return {!o3djs.math.Matrix} The matrix product of a and b.
 */
o3djs.math.columnMajor.mulMatrixMatrix = function(a, b) {
  var r = [];
  var bColumns = b.length;
  var aRows = a[0].length;
  var aColumns = a.length;
  for (var i = 0; i < bColumns; ++i) {
    var v = [];    // v becomes a column of the answer.
    var bi = b[i]; // ith column of b.
    for (var j = 0; j < aRows; ++j) {
      v[j] = 0.0;
      for (var k = 0; k < aColumns; ++k)
        v[j] += bi[k] * a[k][j]; // kth column, jth row.
    }
    r[i] = v;
  }
  return r;
};

/**
 * Multiplies two matrices; assumes that the sizes of the matrices are
 * appropriately compatible.
 * @param {!o3djs.math.Matrix} a The matrix on the left.
 * @param {!o3djs.math.Matrix} b The matrix on the right.
 * @return {!o3djs.math.Matrix} The matrix product of a and b.
 */
o3djs.math.mulMatrixMatrix = null;

/**
 * Gets the jth column of the given matrix m; assumes matrix entries are
 * accessed in [row][column] fashion.
 * @param {!o3djs.math.Matrix} m The matrix.
 * @param {number} j The index of the desired column.
 * @return {!o3djs.math.Vector} The jth column of m as a vector.
 */
o3djs.math.rowMajor.column = function(m, j) {
  var r = [];
  var mLength = m.length;
  for (var i = 0; i < mLength; ++i) {
    r[i] = m[i][j];
  }
  return r;
};

/**
 * Gets the jth column of the given matrix m; assumes matrix entries are
 * accessed in [column][row] fashion.
 * @param {!o3djs.math.Matrix} m The matrix.
 * @param {number} j The index of the desired column.
 * @return {!o3djs.math.Vector} The jth column of m as a vector.
 */
o3djs.math.columnMajor.column = function(m, j) {
  return m[j].slice();
};

/**
 * Gets the jth column of the given matrix m.
 * @param {!o3djs.math.Matrix} m The matrix.
 * @param {number} j The index of the desired column.
 * @return {!o3djs.math.Vector} The jth column of m as a vector.
 */
o3djs.math.column = null;

/**
 * Gets the ith row of the given matrix m; assumes matrix entries are
 * accessed in [row][column] fashion.
 * @param {!o3djs.math.Matrix} m The matrix.
 * @param {number} i The index of the desired row.
 * @return {!o3djs.math.Vector} The ith row of m.
 */
o3djs.math.rowMajor.row = function(m, i) {
  return m[i].slice();
};

/**
 * Gets the ith row of the given matrix m; assumes matrix entries are
 * accessed in [column][row] fashion.
 * @param {!o3djs.math.Matrix} m The matrix.
 * @param {number} i The index of the desired row.
 * @return {!o3djs.math.Vector} The ith row of m.
 */
o3djs.math.columnMajor.row = function(m, i) {
  var r = [];
  var mLength = m.length;
  for (var j = 0; j < mLength; ++j) {
    r[j] = m[j][i];
  }
  return r;
};

/**
 * Gets the ith row of the given matrix m.
 * @param {!o3djs.math.Matrix} m The matrix.
 * @param {number} i The index of the desired row.
 * @return {!o3djs.math.Vector} The ith row of m.
 */
o3djs.math.row = null;

/**
 * Creates an n-by-n identity matrix.
 * @param {number} n The dimension of the identity matrix required.
 * @return {!o3djs.math.Matrix} An n-by-n identity matrix.
 */
o3djs.math.identity = function(n) {
  var r = [];
  for (var j = 0; j < n; ++j) {
    r[j] = [];
    for (var i = 0; i < n; ++i)
      r[j][i] = (i == j) ? 1 : 0;
  }
  return r;
};

/**
 * Takes the transpose of a matrix.
 * @param {!o3djs.math.Matrix} m The matrix.
 * @return {!o3djs.math.Matrix} The transpose of m.
 */
o3djs.math.transpose = function(m) {
  var r = [];
  var m0Length = m[0].length;
  var mLength = m.length;
  for (var j = 0; j < m0Length; ++j) {
    r[j] = [];
    for (var i = 0; i < mLength; ++i)
      r[j][i] = m[i][j];
  }
  return r;
};

/**
 * Computes the trace (sum of the diagonal entries) of a square matrix;
 * assumes m is square.
 * @param {!o3djs.math.Matrix} m The matrix.
 * @return {number} The trace of m.
 */
o3djs.math.trace = function(m) {
  var r = 0.0;
  var mLength = m.length;
  for (var i = 0; i < mLength; ++i)
    r += m[i][i];
  return r;
};

/**
 * Computes the determinant of a 1-by-1 matrix.
 * @param {!o3djs.math.Matrix1} m The matrix.
 * @return {number} The determinant of m.
 */
o3djs.math.det1 = function(m) {
  return m[0][0];
};

/**
 * Computes the determinant of a 2-by-2 matrix.
 * @param {!o3djs.math.Matrix2} m The matrix.
 * @return {number} The determinant of m.
 */
o3djs.math.det2 = function(m) {
  return m[0][0] * m[1][1] - m[0][1] * m[1][0];
};

/**
 * Computes the determinant of a 3-by-3 matrix.
 * @param {!o3djs.math.Matrix3} m The matrix.
 * @return {number} The determinant of m.
 */
o3djs.math.det3 = function(m) {
  return m[2][2] * (m[0][0] * m[1][1] - m[0][1] * m[1][0]) -
         m[2][1] * (m[0][0] * m[1][2] - m[0][2] * m[1][0]) +
         m[2][0] * (m[0][1] * m[1][2] - m[0][2] * m[1][1]);
};

/**
 * Computes the determinant of a 4-by-4 matrix.
 * @param {!o3djs.math.Matrix4} m The matrix.
 * @return {number} The determinant of m.
 */
o3djs.math.det4 = function(m) {
  var t01 = m[0][0] * m[1][1] - m[0][1] * m[1][0];
  var t02 = m[0][0] * m[1][2] - m[0][2] * m[1][0];
  var t03 = m[0][0] * m[1][3] - m[0][3] * m[1][0];
  var t12 = m[0][1] * m[1][2] - m[0][2] * m[1][1];
  var t13 = m[0][1] * m[1][3] - m[0][3] * m[1][1];
  var t23 = m[0][2] * m[1][3] - m[0][3] * m[1][2];
  return m[3][3] * (m[2][2] * t01 - m[2][1] * t02 + m[2][0] * t12) -
         m[3][2] * (m[2][3] * t01 - m[2][1] * t03 + m[2][0] * t13) +
         m[3][1] * (m[2][3] * t02 - m[2][2] * t03 + m[2][0] * t23) -
         m[3][0] * (m[2][3] * t12 - m[2][2] * t13 + m[2][1] * t23);
};

/**
 * Computes the inverse of a 1-by-1 matrix.
 * @param {!o3djs.math.Matrix1} m The matrix.
 * @return {!o3djs.math.Matrix1} The inverse of m.
 */
o3djs.math.inverse1 = function(m) {
  return [[1.0 / m[0][0]]];
};

/**
 * Computes the inverse of a 2-by-2 matrix.
 * @param {!o3djs.math.Matrix2} m The matrix.
 * @return {!o3djs.math.Matrix2} The inverse of m.
 */
o3djs.math.inverse2 = function(m) {
  var d = 1.0 / (m[0][0] * m[1][1] - m[0][1] * m[1][0]);
  return [[d * m[1][1], -d * m[0][1]], [-d * m[1][0], d * m[0][0]]];
};

/**
 * Computes the inverse of a 3-by-3 matrix.
 * @param {!o3djs.math.Matrix3} m The matrix.
 * @return {!o3djs.math.Matrix3} The inverse of m.
 */
o3djs.math.inverse3 = function(m) {
  var t00 = m[1][1] * m[2][2] - m[1][2] * m[2][1];
  var t10 = m[0][1] * m[2][2] - m[0][2] * m[2][1];
  var t20 = m[0][1] * m[1][2] - m[0][2] * m[1][1];
  var d = 1.0 / (m[0][0] * t00 - m[1][0] * t10 + m[2][0] * t20);
  return [[d * t00, -d * t10, d * t20],
          [-d * (m[1][0] * m[2][2] - m[1][2] * m[2][0]),
            d * (m[0][0] * m[2][2] - m[0][2] * m[2][0]),
           -d * (m[0][0] * m[1][2] - m[0][2] * m[1][0])],
          [d * (m[1][0] * m[2][1] - m[1][1] * m[2][0]),
          -d * (m[0][0] * m[2][1] - m[0][1] * m[2][0]),
           d * (m[0][0] * m[1][1] - m[0][1] * m[1][0])]];
};

/**
 * Computes the inverse of a 4-by-4 matrix.
 * @param {!o3djs.math.Matrix4} m The matrix.
 * @return {!o3djs.math.Matrix4} The inverse of m.
 */
o3djs.math.inverse4 = function(m) {
  var tmp_0 = m[2][2] * m[3][3];
  var tmp_1 = m[3][2] * m[2][3];
  var tmp_2 = m[1][2] * m[3][3];
  var tmp_3 = m[3][2] * m[1][3];
  var tmp_4 = m[1][2] * m[2][3];
  var tmp_5 = m[2][2] * m[1][3];
  var tmp_6 = m[0][2] * m[3][3];
  var tmp_7 = m[3][2] * m[0][3];
  var tmp_8 = m[0][2] * m[2][3];
  var tmp_9 = m[2][2] * m[0][3];
  var tmp_10 = m[0][2] * m[1][3];
  var tmp_11 = m[1][2] * m[0][3];
  var tmp_12 = m[2][0] * m[3][1];
  var tmp_13 = m[3][0] * m[2][1];
  var tmp_14 = m[1][0] * m[3][1];
  var tmp_15 = m[3][0] * m[1][1];
  var tmp_16 = m[1][0] * m[2][1];
  var tmp_17 = m[2][0] * m[1][1];
  var tmp_18 = m[0][0] * m[3][1];
  var tmp_19 = m[3][0] * m[0][1];
  var tmp_20 = m[0][0] * m[2][1];
  var tmp_21 = m[2][0] * m[0][1];
  var tmp_22 = m[0][0] * m[1][1];
  var tmp_23 = m[1][0] * m[0][1];

  var t0 = (tmp_0 * m[1][1] + tmp_3 * m[2][1] + tmp_4 * m[3][1]) -
      (tmp_1 * m[1][1] + tmp_2 * m[2][1] + tmp_5 * m[3][1]);
  var t1 = (tmp_1 * m[0][1] + tmp_6 * m[2][1] + tmp_9 * m[3][1]) -
      (tmp_0 * m[0][1] + tmp_7 * m[2][1] + tmp_8 * m[3][1]);
  var t2 = (tmp_2 * m[0][1] + tmp_7 * m[1][1] + tmp_10 * m[3][1]) -
      (tmp_3 * m[0][1] + tmp_6 * m[1][1] + tmp_11 * m[3][1]);
  var t3 = (tmp_5 * m[0][1] + tmp_8 * m[1][1] + tmp_11 * m[2][1]) -
      (tmp_4 * m[0][1] + tmp_9 * m[1][1] + tmp_10 * m[2][1]);

  var d = 1.0 / (m[0][0] * t0 + m[1][0] * t1 + m[2][0] * t2 + m[3][0] * t3);

  var row0 = [d * t0, d * t1, d * t2, d * t3];
  var row1 = [d * ((tmp_1 * m[1][0] + tmp_2 * m[2][0] + tmp_5 * m[3][0]) -
          (tmp_0 * m[1][0] + tmp_3 * m[2][0] + tmp_4 * m[3][0])),
       d * ((tmp_0 * m[0][0] + tmp_7 * m[2][0] + tmp_8 * m[3][0]) -
          (tmp_1 * m[0][0] + tmp_6 * m[2][0] + tmp_9 * m[3][0])),
       d * ((tmp_3 * m[0][0] + tmp_6 * m[1][0] + tmp_11 * m[3][0]) -
          (tmp_2 * m[0][0] + tmp_7 * m[1][0] + tmp_10 * m[3][0])),
       d * ((tmp_4 * m[0][0] + tmp_9 * m[1][0] + tmp_10 * m[2][0]) -
          (tmp_5 * m[0][0] + tmp_8 * m[1][0] + tmp_11 * m[2][0]))];
  var row2 =[d * ((tmp_12 * m[1][3] + tmp_15 * m[2][3] + tmp_16 * m[3][3]) -
          (tmp_13 * m[1][3] + tmp_14 * m[2][3] + tmp_17 * m[3][3])),
       d * ((tmp_13 * m[0][3] + tmp_18 * m[2][3] + tmp_21 * m[3][3]) -
          (tmp_12 * m[0][3] + tmp_19 * m[2][3] + tmp_20 * m[3][3])),
       d * ((tmp_14 * m[0][3] + tmp_19 * m[1][3] + tmp_22 * m[3][3]) -
          (tmp_15 * m[0][3] + tmp_18 * m[1][3] + tmp_23 * m[3][3])),
       d * ((tmp_17 * m[0][3] + tmp_20 * m[1][3] + tmp_23 * m[2][3]) -
          (tmp_16 * m[0][3] + tmp_21 * m[1][3] + tmp_22 * m[2][3]))];
  var row3 = [d * ((tmp_14 * m[2][2] + tmp_17 * m[3][2] + tmp_13 * m[1][2]) -
          (tmp_16 * m[3][2] + tmp_12 * m[1][2] + tmp_15 * m[2][2])),
       d * ((tmp_20 * m[3][2] + tmp_12 * m[0][2] + tmp_19 * m[2][2]) -
          (tmp_18 * m[2][2] + tmp_21 * m[3][2] + tmp_13 * m[0][2])),
       d * ((tmp_18 * m[1][2] + tmp_23 * m[3][2] + tmp_15 * m[0][2]) -
          (tmp_22 * m[3][2] + tmp_14 * m[0][2] + tmp_19 * m[1][2])),
       d * ((tmp_22 * m[2][2] + tmp_16 * m[0][2] + tmp_21 * m[1][2]) -
          (tmp_20 * m[1][2] + tmp_23 * m[2][2] + tmp_17 * m[0][2]))];
  return [row0, row1, row2, row3];
};

/**
 * Computes the determinant of the cofactor matrix obtained by removal
 * of a specified row and column.  This is a helper function for the general
 * determinant and matrix inversion functions.
 * @param {!o3djs.math.Matrix} a The original matrix.
 * @param {number} x The row to be removed.
 * @param {number} y The column to be removed.
 * @return {number} The determinant of the matrix obtained by removing
 *     row x and column y from a.
 */
o3djs.math.codet = function(a, x, y) {
  var size = a.length;
  var b = [];
  var ai = 0;
  for (var bi = 0; bi < size - 1; ++bi) {
    if (ai == x)
      ai++;
    b[bi] = [];
    var aj = 0;
    for (var bj = 0; bj < size - 1; ++bj) {
      if (aj == y)
        aj++;
      b[bi][bj] = a[ai][aj];
      aj++;
    }
    ai++;
  }
  return o3djs.math.det(b);
};

/**
 * Computes the determinant of an arbitrary square matrix.
 * @param {!o3djs.math.Matrix} m The matrix.
 * @return {number} the determinant of m.
 */
o3djs.math.det = function(m) {
  var d = m.length;
  if (d <= 4) {
    return o3djs.math['det' + d](m);
  }
  var r = 0.0;
  var sign = 1;
  var row = m[0];
  var mLength = m.length;
  for (var y = 0; y < mLength; y++) {
    r += sign * row[y] * o3djs.math.codet(m, 0, y);
    sign *= -1;
  }
  return r;
};

/**
 * Computes the inverse of an arbitrary square matrix.
 * @param {!o3djs.math.Matrix} m The matrix.
 * @return {!o3djs.math.Matrix} The inverse of m.
 */
o3djs.math.inverse = function(m) {
  var d = m.length;
  if (d <= 4) {
    return o3djs.math['inverse' + d](m);
  }
  var r = [];
  var size = m.length;
  for (var j = 0; j < size; ++j) {
    r[j] = [];
    for (var i = 0; i < size; ++i)
      r[j][i] = ((i + j) % 2 ? -1 : 1) * o3djs.math.codet(m, i, j);
  }
  return o3djs.math.divMatrixScalar(r, o3djs.math.det(m));
};

/**
 * Performs Graham-Schmidt orthogonalization on the vectors which make up the
 * given matrix and returns the result in the rows of a new matrix.  When
 * multiplying many orthogonal matrices together, errors can accumulate causing
 * the product to fail to be orthogonal.  This function can be used to correct
 * that.
 * @param {!o3djs.math.Matrix} m The matrix.
 * @return {!o3djs.math.Matrix} A matrix whose rows are obtained from the
 *     rows of m by the Graham-Schmidt process.
 */
o3djs.math.orthonormalize = function(m) {
  var r = [];
  var mLength = m.length;
  for (var i = 0; i < mLength; ++i) {
    var v = m[i];
    for (var j = 0; j < i; ++j) {
      v = o3djs.math.subVector(v, o3djs.math.mulScalarVector(
          o3djs.math.dot(r[j], m[i]), r[j]));
    }
    r[i] = o3djs.math.normalize(v);
  }
  return r;
};

/**
 * Computes the inverse of a 4-by-4 matrix.
 * Note: It is faster to call this than o3djs.math.inverse.
 * @param {!o3djs.math.Matrix4} m The matrix.
 * @return {!o3djs.math.Matrix4} The inverse of m.
 */
o3djs.math.matrix4.inverse = function(m) {
  return o3djs.math.inverse4(m);
};

/**
 * Multiplies two 4-by-4 matrices; assumes that the given matrices are 4-by-4.
 * Note: It is faster to call this than o3djs.math.mul.
 * @param {!o3djs.math.Matrix4} a The matrix on the left.
 * @param {!o3djs.math.Matrix4} b The matrix on the right.
 * @return {!o3djs.math.Matrix4} The matrix product of a and b.
 */
o3djs.math.matrix4.mul = function(a, b) {
  return o3djs.math.mulMatrixMatrix4(a, b);
};

/**
 * Computes the determinant of a 4-by-4 matrix.
 * Note: It is faster to call this than o3djs.math.det.
 * @param {!o3djs.math.Matrix4} m The matrix.
 * @return {number} The determinant of m.
 */
o3djs.math.matrix4.det = function(m) {
  return o3djs.math.det4(m);
};

/**
 * Copies a Matrix4.
 * Note: It is faster to call this than o3djs.math.copy.
 * @param {!o3djs.math.Matrix4} m The matrix.
 * @return {!o3djs.math.Matrix4} A copy of m.
 */
o3djs.math.matrix4.copy = function(m) {
  return o3djs.math.copyMatrix(m);
};

/**
 * Sets the upper 3-by-3 block of matrix a to the upper 3-by-3 block of matrix
 * b; assumes that a and b are big enough to contain an upper 3-by-3 block.
 * @param {!o3djs.math.Matrix4} a A matrix.
 * @param {!o3djs.math.Matrix3} b A 3-by-3 matrix.
 * @return {!o3djs.math.Matrix4} a once modified.
 */
o3djs.math.matrix4.setUpper3x3 = function(a, b) {
  var b0 = b[0];
  var b1 = b[1];
  var b2 = b[2];

  a[0].splice(0, 3, b0[0], b0[1], b0[2]);
  a[1].splice(0, 3, b1[0], b1[1], b1[2]);
  a[2].splice(0, 3, b2[0], b2[1], b2[2]);

  return a;
};

/**
 * Returns a 3-by-3 matrix mimicking the upper 3-by-3 block of m; assumes m
 * is big enough to contain an upper 3-by-3 block.
 * @param {!o3djs.math.Matrix4} m The matrix.
 * @return {!o3djs.math.Matrix3} The upper 3-by-3 block of m.
 */
o3djs.math.matrix4.getUpper3x3 = function(m) {
  return [m[0].slice(0, 3), m[1].slice(0, 3), m[2].slice(0, 3)];
};

/**
 * Sets the translation component of a 4-by-4 matrix to the given
 * vector.
 * @param {!o3djs.math.Matrix4} a The matrix.
 * @param {(!o3djs.math.Vector3|!o3djs.math.Vector4)} v The vector.
 * @return {!o3djs.math.Matrix4} a once modified.
 */
o3djs.math.matrix4.setTranslation = function(a, v) {
  a[3].splice(0, 4, v[0], v[1], v[2], 1);
  return a;
};

/**
 * Returns the translation component of a 4-by-4 matrix as a vector with 3
 * entries.
 * @param {!o3djs.math.Matrix4} m The matrix.
 * @return {!o3djs.math.Vector3} The translation component of m.
 */
o3djs.math.matrix4.getTranslation = function(m) {
  return m[3].slice(0, 3);
};

/**
 * Takes a 4-by-4 matrix and a vector with 3 entries,
 * interprets the vector as a point, transforms that point by the matrix, and
 * returns the result as a vector with 3 entries.
 * @param {!o3djs.math.Matrix4} m The matrix.
 * @param {!o3djs.math.Vector3} v The point.
 * @return {!o3djs.math.Vector3} The transformed point.
 */
o3djs.math.matrix4.transformPoint = function(m, v) {
  var v0 = v[0];
  var v1 = v[1];
  var v2 = v[2];
  var m0 = m[0];
  var m1 = m[1];
  var m2 = m[2];
  var m3 = m[3];

  var d = v0 * m0[3] + v1 * m1[3] + v2 * m2[3] + m3[3];
  return [(v0 * m0[0] + v1 * m1[0] + v2 * m2[0] + m3[0]) / d,
          (v0 * m0[1] + v1 * m1[1] + v2 * m2[1] + m3[1]) / d,
          (v0 * m0[2] + v1 * m1[2] + v2 * m2[2] + m3[2]) / d];
};

/**
 * Takes a 4-by-4 matrix and a vector with 4 entries, transforms that vector by
 * the matrix, and returns the result as a vector with 4 entries.
 * @param {!o3djs.math.Matrix4} m The matrix.
 * @param {!o3djs.math.Vector4} v The point in homogenous coordinates.
 * @return {!o3djs.math.Vector4} The transformed point in homogenous
 *     coordinates.
 */
o3djs.math.matrix4.transformVector4 = function(m, v) {
  var v0 = v[0];
  var v1 = v[1];
  var v2 = v[2];
  var v3 = v[3];
  var m0 = m[0];
  var m1 = m[1];
  var m2 = m[2];
  var m3 = m[3];

  return [v0 * m0[0] + v1 * m1[0] + v2 * m2[0] + v3 * m3[0],
          v0 * m0[1] + v1 * m1[1] + v2 * m2[1] + v3 * m3[1],
          v0 * m0[2] + v1 * m1[2] + v2 * m2[2] + v3 * m3[2],
          v0 * m0[3] + v1 * m1[3] + v2 * m2[3] + v3 * m3[3]];
};

/**
 * Takes a 4-by-4 matrix and a vector with 3 entries, interprets the vector as a
 * direction, transforms that direction by the matrix, and returns the result;
 * assumes the transformation of 3-dimensional space represented by the matrix
 * is parallel-preserving, i.e. any combination of rotation, scaling and
 * translation, but not a perspective distortion. Returns a vector with 3
 * entries.
 * @param {!o3djs.math.Matrix4} m The matrix.
 * @param {!o3djs.math.Vector3} v The direction.
 * @return {!o3djs.math.Vector3} The transformed direction.
 */
o3djs.math.matrix4.transformDirection = function(m, v) {
  var v0 = v[0];
  var v1 = v[1];
  var v2 = v[2];
  var m0 = m[0];
  var m1 = m[1];
  var m2 = m[2];
  var m3 = m[3];

  return [v0 * m0[0] + v1 * m1[0] + v2 * m2[0],
          v0 * m0[1] + v1 * m1[1] + v2 * m2[1],
          v0 * m0[2] + v1 * m1[2] + v2 * m2[2]];
};

/**
 * Takes a 4-by-4 matrix m and a vector v with 3 entries, interprets the vector
 * as a normal to a surface, and computes a vector which is normal upon
 * transforming that surface by the matrix. The effect of this function is the
 * same as transforming v (as a direction) by the inverse-transpose of m.  This
 * function assumes the transformation of 3-dimensional space represented by the
 * matrix is parallel-preserving, i.e. any combination of rotation, scaling and
 * translation, but not a perspective distortion.  Returns a vector with 3
 * entries.
 * @param {!o3djs.math.Matrix4} m The matrix.
 * @param {!o3djs.math.Vector3} v The normal.
 * @return {!o3djs.math.Vector3} The transformed normal.
 */
o3djs.math.matrix4.transformNormal = function(m, v) {
  var mInverse = o3djs.math.inverse4(m);
  var v0 = v[0];
  var v1 = v[1];
  var v2 = v[2];
  var mi0 = mInverse[0];
  var mi1 = mInverse[1];
  var mi2 = mInverse[2];
  var mi3 = mInverse[3];

  return [v0 * mi0[0] + v1 * mi0[1] + v2 * mi0[2],
          v0 * mi1[0] + v1 * mi1[1] + v2 * mi1[2],
          v0 * mi2[0] + v1 * mi2[1] + v2 * mi2[2]];
};

/**
 * Creates a 4-by-4 identity matrix.
 * @return {!o3djs.math.Matrix4} The 4-by-4 identity.
 */
o3djs.math.matrix4.identity = function() {
  return [
    [1, 0, 0, 0],
    [0, 1, 0, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 1]
  ];
};

/**
 * Sets the given 4-by-4 matrix to the identity matrix.
 * @param {!o3djs.math.Matrix4} m The matrix to set to identity.
 * @return {!o3djs.math.Matrix4} m once modified.
 */
o3djs.math.matrix4.setIdentity = function(m) {
  for (var i = 0; i < 4; i++) {
    for (var j = 0; j < 4; j++) {
      if (i == j) {
        m[i][j] = 1;
      } else {
        m[i][j] = 0;
      }
    }
  }
  return m;
};

/**
 * Computes a 4-by-4 perspective transformation matrix given the angular height
 * of the frustum, the aspect ratio, and the near and far clipping planes.  The
 * arguments define a frustum extending in the negative z direction.  The given
 * angle is the vertical angle of the frustum, and the horizontal angle is
 * determined to produce the given aspect ratio.  The arguments near and far are
 * the distances to the near and far clipping planes.  Note that near and far
 * are not z coordinates, but rather they are distances along the negative
 * z-axis.  The matrix generated sends the viewing frustum to the unit box.
 * We assume a unit box extending from -1 to 1 in the x and y dimensions and
 * from 0 to 1 in the z dimension.
 * @param {number} angle The camera angle from top to bottom (in radians).
 * @param {number} aspect The aspect ratio width / height.
 * @param {number} near The depth (negative z coordinate)
 *     of the near clipping plane.
 * @param {number} far The depth (negative z coordinate)
 *     of the far clipping plane.
 * @return {!o3djs.math.Matrix4} The perspective matrix.
 */
o3djs.math.matrix4.perspective = function(angle, aspect, near, far) {
  var f = Math.tan(0.5 * (Math.PI - angle));
  var range = near - far;

  return [
    [f / aspect, 0, 0, 0],
    [0, f, 0, 0],
    [0, 0, far / range, -1],
    [0, 0, near * far / range, 0]
  ];
};

/**
 * Computes a 4-by-4 orthographic projection matrix given the coordinates of the
 * planes defining the axis-aligned, box-shaped viewing volume.  The matrix
 * generated sends that box to the unit box.  Note that although left and right
 * are x coordinates and bottom and top are y coordinates, near and far
 * are not z coordinates, but rather they are distances along the negative
 * z-axis.  We assume a unit box extending from -1 to 1 in the x and y
 * dimensions and from 0 to 1 in the z dimension.
 * @param {number} left The x coordinate of the left plane of the box.
 * @param {number} right The x coordinate of the right plane of the box.
 * @param {number} bottom The y coordinate of the bottom plane of the box.
 * @param {number} top The y coordinate of the right plane of the box.
 * @param {number} near The negative z coordinate of the near plane of the box.
 * @param {number} far The negative z coordinate of the far plane of the box.
 * @return {!o3djs.math.Matrix4} The orthographic projection matrix.
 */
o3djs.math.matrix4.orthographic =
    function(left, right, bottom, top, near, far) {
  return [
    [2 / (right - left), 0, 0, 0],
    [0, 2 / (top - bottom), 0, 0],
    [0, 0, 1 / (near - far), 0],
    [(left + right) / (left - right),
     (bottom + top) / (bottom - top),
     near / (near - far), 1]
  ];
};

/**
 * Computes a 4-by-4 perspective transformation matrix given the left, right,
 * top, bottom, near and far clipping planes. The arguments define a frustum
 * extending in the negative z direction. The arguments near and far are the
 * distances to the near and far clipping planes. Note that near and far are not
 * z coordinates, but rather they are distances along the negative z-axis. The
 * matrix generated sends the viewing frustum to the unit box. We assume a unit
 * box extending from -1 to 1 in the x and y dimensions and from 0 to 1 in the z
 * dimension.
 * @param {number} left The x coordinate of the left plane of the box.
 * @param {number} right The x coordinate of the right plane of the box.
 * @param {number} bottom The y coordinate of the bottom plane of the box.
 * @param {number} top The y coordinate of the right plane of the box.
 * @param {number} near The negative z coordinate of the near plane of the box.
 * @param {number} far The negative z coordinate of the far plane of the box.
 * @return {!o3djs.math.Matrix4} The perspective projection matrix.
 */
o3djs.math.matrix4.frustum = function(left, right, bottom, top, near, far) {
  var dx = (right - left);
  var dy = (top - bottom);
  var dz = (near - far);
  return [
    [2 * near / dx, 0, 0, 0],
    [0, 2 * near / dy, 0, 0],
    [(left + right) / dx, (top + bottom) / dy, far / dz, -1],
    [0, 0, near * far / dz, 0]];
};

/**
 * Computes a 4-by-4 look-at transformation.  The transformation generated is
 * an orthogonal rotation matrix with translation component.  The translation
 * component sends the eye to the origin.  The rotation component sends the
 * vector pointing from the eye to the target to a vector pointing in the
 * negative z direction, and also sends the up vector into the upper half of
 * the yz plane.
 * @param {(!o3djs.math.Vector3|!o3djs.math.Vector4)} eye The position
 *     of the eye.
 * @param {(!o3djs.math.Vector3|!o3djs.math.Vector4)} target The
 *     position meant to be viewed.
 * @param {(!o3djs.math.Vector3|!o3djs.math.Vector4)} up A vector
 *     pointing up.
 * @return {!o3djs.math.Matrix4} The look-at matrix.
 */
o3djs.math.matrix4.lookAt = function(eye, target, up) {
  var vz = o3djs.math.normalize(
      o3djs.math.subVector(eye, target).slice(0, 3)).concat(0);
  var vx = o3djs.math.normalize(
      o3djs.math.cross(up, vz)).concat(0);
  var vy = o3djs.math.cross(vz, vx).concat(0);

  return o3djs.math.inverse([vx, vy, vz, eye.concat(1)]);
};

/**
 * Takes two 4-by-4 matrices, a and b, and computes the product in the order
 * that pre-composes b with a.  In other words, the matrix returned will
 * transform by b first and then a.  Note this is subtly different from just
 * multiplying the matrices together.  For given a and b, this function returns
 * the same object in both row-major and column-major mode.
 * @param {!o3djs.math.Matrix4} a A 4-by-4 matrix.
 * @param {!o3djs.math.Matrix4} b A 4-by-4 matrix.
 * @return {!o3djs.math.Matrix4} the composition of a and b, b first then a.
 */
o3djs.math.matrix4.composition = function(a, b) {
  var a0 = a[0];
  var a1 = a[1];
  var a2 = a[2];
  var a3 = a[3];
  var b0 = b[0];
  var b1 = b[1];
  var b2 = b[2];
  var b3 = b[3];
  var a00 = a0[0];
  var a01 = a0[1];
  var a02 = a0[2];
  var a03 = a0[3];
  var a10 = a1[0];
  var a11 = a1[1];
  var a12 = a1[2];
  var a13 = a1[3];
  var a20 = a2[0];
  var a21 = a2[1];
  var a22 = a2[2];
  var a23 = a2[3];
  var a30 = a3[0];
  var a31 = a3[1];
  var a32 = a3[2];
  var a33 = a3[3];
  var b00 = b0[0];
  var b01 = b0[1];
  var b02 = b0[2];
  var b03 = b0[3];
  var b10 = b1[0];
  var b11 = b1[1];
  var b12 = b1[2];
  var b13 = b1[3];
  var b20 = b2[0];
  var b21 = b2[1];
  var b22 = b2[2];
  var b23 = b2[3];
  var b30 = b3[0];
  var b31 = b3[1];
  var b32 = b3[2];
  var b33 = b3[3];
  return [[a00 * b00 + a10 * b01 + a20 * b02 + a30 * b03,
           a01 * b00 + a11 * b01 + a21 * b02 + a31 * b03,
           a02 * b00 + a12 * b01 + a22 * b02 + a32 * b03,
           a03 * b00 + a13 * b01 + a23 * b02 + a33 * b03],
          [a00 * b10 + a10 * b11 + a20 * b12 + a30 * b13,
           a01 * b10 + a11 * b11 + a21 * b12 + a31 * b13,
           a02 * b10 + a12 * b11 + a22 * b12 + a32 * b13,
           a03 * b10 + a13 * b11 + a23 * b12 + a33 * b13],
          [a00 * b20 + a10 * b21 + a20 * b22 + a30 * b23,
           a01 * b20 + a11 * b21 + a21 * b22 + a31 * b23,
           a02 * b20 + a12 * b21 + a22 * b22 + a32 * b23,
           a03 * b20 + a13 * b21 + a23 * b22 + a33 * b23],
          [a00 * b30 + a10 * b31 + a20 * b32 + a30 * b33,
           a01 * b30 + a11 * b31 + a21 * b32 + a31 * b33,
           a02 * b30 + a12 * b31 + a22 * b32 + a32 * b33,
           a03 * b30 + a13 * b31 + a23 * b32 + a33 * b33]];
};

/**
 * Takes two 4-by-4 matrices, a and b, and modifies a to be the product in the
 * order that pre-composes b with a.  The matrix a, upon modification will
 * transform by b first and then a.  Note this is subtly different from just
 * multiplying the matrices together.  For given a and b, a, upon modification,
 * will be the same object in both row-major and column-major mode.
 * @param {!o3djs.math.Matrix4} a A 4-by-4 matrix.
 * @param {!o3djs.math.Matrix4} b A 4-by-4 matrix.
 * @return {!o3djs.math.Matrix4} a once modified.
 */
o3djs.math.matrix4.compose = function(a, b) {
  var a0 = a[0];
  var a1 = a[1];
  var a2 = a[2];
  var a3 = a[3];
  var b0 = b[0];
  var b1 = b[1];
  var b2 = b[2];
  var b3 = b[3];
  var a00 = a0[0];
  var a01 = a0[1];
  var a02 = a0[2];
  var a03 = a0[3];
  var a10 = a1[0];
  var a11 = a1[1];
  var a12 = a1[2];
  var a13 = a1[3];
  var a20 = a2[0];
  var a21 = a2[1];
  var a22 = a2[2];
  var a23 = a2[3];
  var a30 = a3[0];
  var a31 = a3[1];
  var a32 = a3[2];
  var a33 = a3[3];
  var b00 = b0[0];
  var b01 = b0[1];
  var b02 = b0[2];
  var b03 = b0[3];
  var b10 = b1[0];
  var b11 = b1[1];
  var b12 = b1[2];
  var b13 = b1[3];
  var b20 = b2[0];
  var b21 = b2[1];
  var b22 = b2[2];
  var b23 = b2[3];
  var b30 = b3[0];
  var b31 = b3[1];
  var b32 = b3[2];
  var b33 = b3[3];
  a[0].splice(0, 4, a00 * b00 + a10 * b01 + a20 * b02 + a30 * b03,
                    a01 * b00 + a11 * b01 + a21 * b02 + a31 * b03,
                    a02 * b00 + a12 * b01 + a22 * b02 + a32 * b03,
                    a03 * b00 + a13 * b01 + a23 * b02 + a33 * b03);
  a[1].splice(0, 4, a00 * b10 + a10 * b11 + a20 * b12 + a30 * b13,
                    a01 * b10 + a11 * b11 + a21 * b12 + a31 * b13,
                    a02 * b10 + a12 * b11 + a22 * b12 + a32 * b13,
                    a03 * b10 + a13 * b11 + a23 * b12 + a33 * b13);
  a[2].splice(0, 4, a00 * b20 + a10 * b21 + a20 * b22 + a30 * b23,
                    a01 * b20 + a11 * b21 + a21 * b22 + a31 * b23,
                    a02 * b20 + a12 * b21 + a22 * b22 + a32 * b23,
                    a03 * b20 + a13 * b21 + a23 * b22 + a33 * b23),
  a[3].splice(0, 4, a00 * b30 + a10 * b31 + a20 * b32 + a30 * b33,
                    a01 * b30 + a11 * b31 + a21 * b32 + a31 * b33,
                    a02 * b30 + a12 * b31 + a22 * b32 + a32 * b33,
                    a03 * b30 + a13 * b31 + a23 * b32 + a33 * b33);
  return a;
};

/**
 * Creates a 4-by-4 matrix which translates by the given vector v.
 * @param {(!o3djs.math.Vector3|!o3djs.math.Vector4)} v The vector by
 *     which to translate.
 * @return {!o3djs.math.Matrix4} The translation matrix.
 */
o3djs.math.matrix4.translation = function(v) {
  return [
    [1, 0, 0, 0],
    [0, 1, 0, 0],
    [0, 0, 1, 0],
    [v[0], v[1], v[2], 1]
  ];
};

/**
 * Modifies the given 4-by-4 matrix by translation by the given vector v.
 * @param {!o3djs.math.Matrix4} m The matrix.
 * @param {(!o3djs.math.Vector3|!o3djs.math.Vector4)} v The vector by
 *     which to translate.
 * @return {!o3djs.math.Matrix4} m once modified.
 */
o3djs.math.matrix4.translate = function(m, v) {
  var v0 = v[0];
  var v1 = v[1];
  var v2 = v[2];
  var m0 = m[0];
  var m1 = m[1];
  var m2 = m[2];
  var m3 = m[3];
  var m00 = m0[0];
  var m01 = m0[1];
  var m02 = m0[2];
  var m03 = m0[3];
  var m10 = m1[0];
  var m11 = m1[1];
  var m12 = m1[2];
  var m13 = m1[3];
  var m20 = m2[0];
  var m21 = m2[1];
  var m22 = m2[2];
  var m23 = m2[3];
  var m30 = m3[0];
  var m31 = m3[1];
  var m32 = m3[2];
  var m33 = m3[3];

  m3.splice(0, 4, m00 * v0 + m10 * v1 + m20 * v2 + m30,
                  m01 * v0 + m11 * v1 + m21 * v2 + m31,
                  m02 * v0 + m12 * v1 + m22 * v2 + m32,
                  m03 * v0 + m13 * v1 + m23 * v2 + m33);

  return m;
};

/**
 * Creates a 4-by-4 matrix which scales in each dimension by an amount given by
 * the corresponding entry in the given vector; assumes the vector has three
 * entries.
 * @param {!o3djs.math.Vector3} v A vector of
 *     three entries specifying the factor by which to scale in each dimension.
 * @return {!o3djs.math.Matrix4} The scaling matrix.
 */
o3djs.math.matrix4.scaling = function(v) {
  return [
    [v[0], 0, 0, 0],
    [0, v[1], 0, 0],
    [0, 0, v[2], 0],
    [0, 0, 0, 1]
  ];
};

/**
 * Modifies the given 4-by-4 matrix, scaling in each dimension by an amount
 * given by the corresponding entry in the given vector; assumes the vector has
 * three entries.
 * @param {!o3djs.math.Matrix4} m The matrix to be modified.
 * @param {!o3djs.math.Vector3} v A vector of three entries specifying the
 *     factor by which to scale in each dimension.
 * @return {!o3djs.math.Matrix4} m once modified.
 */
o3djs.math.matrix4.scale = function(m, v) {
  var v0 = v[0];
  var v1 = v[1];
  var v2 = v[2];

  var m0 = m[0];
  var m1 = m[1];
  var m2 = m[2];
  var m3 = m[3];

  m0.splice(0, 4, v0 * m0[0], v0 * m0[1], v0 * m0[2], v0 * m0[3]);
  m1.splice(0, 4, v1 * m1[0], v1 * m1[1], v1 * m1[2], v1 * m1[3]);
  m2.splice(0, 4, v2 * m2[0], v2 * m2[1], v2 * m2[2], v2 * m2[3]);

  return m;
};

/**
 * Creates a 4-by-4 matrix which rotates around the x-axis by the given angle.
 * @param {number} angle The angle by which to rotate (in radians).
 * @return {!o3djs.math.Matrix4} The rotation matrix.
 */
o3djs.math.matrix4.rotationX = function(angle) {
  var c = Math.cos(angle);
  var s = Math.sin(angle);

  return [
    [1, 0, 0, 0],
    [0, c, s, 0],
    [0, -s, c, 0],
    [0, 0, 0, 1]
  ];
};

/**
 * Modifies the given 4-by-4 matrix by a rotation around the x-axis by the given
 * angle.
 * @param {!o3djs.math.Matrix4} m The matrix.
 * @param {number} angle The angle by which to rotate (in radians).
 * @return {!o3djs.math.Matrix4} m once modified.
 */
o3djs.math.matrix4.rotateX = function(m, angle) {
  var m0 = m[0];
  var m1 = m[1];
  var m2 = m[2];
  var m3 = m[3];
  var m10 = m1[0];
  var m11 = m1[1];
  var m12 = m1[2];
  var m13 = m1[3];
  var m20 = m2[0];
  var m21 = m2[1];
  var m22 = m2[2];
  var m23 = m2[3];
  var c = Math.cos(angle);
  var s = Math.sin(angle);

  m1.splice(0, 4, c * m10 + s * m20,
                  c * m11 + s * m21,
                  c * m12 + s * m22,
                  c * m13 + s * m23);
  m2.splice(0, 4, c * m20 - s * m10,
                  c * m21 - s * m11,
                  c * m22 - s * m12,
                  c * m23 - s * m13);

  return m;
};

/**
 * Creates a 4-by-4 matrix which rotates around the y-axis by the given angle.
 * @param {number} angle The angle by which to rotate (in radians).
 * @return {!o3djs.math.Matrix4} The rotation matrix.
 */
o3djs.math.matrix4.rotationY = function(angle) {
  var c = Math.cos(angle);
  var s = Math.sin(angle);

  return [
    [c, 0, -s, 0],
    [0, 1, 0, 0],
    [s, 0, c, 0],
    [0, 0, 0, 1]
  ];
};

/**
 * Modifies the given 4-by-4 matrix by a rotation around the y-axis by the given
 * angle.
 * @param {!o3djs.math.Matrix4} m The matrix.
 * @param {number} angle The angle by which to rotate (in radians).
 * @return {!o3djs.math.Matrix4} m once modified.
 */
o3djs.math.matrix4.rotateY = function(m, angle) {
  var m0 = m[0];
  var m1 = m[1];
  var m2 = m[2];
  var m3 = m[3];
  var m00 = m0[0];
  var m01 = m0[1];
  var m02 = m0[2];
  var m03 = m0[3];
  var m20 = m2[0];
  var m21 = m2[1];
  var m22 = m2[2];
  var m23 = m2[3];
  var c = Math.cos(angle);
  var s = Math.sin(angle);

  m0.splice(0, 4, c * m00 - s * m20,
                  c * m01 - s * m21,
                  c * m02 - s * m22,
                  c * m03 - s * m23);
  m2.splice(0, 4, c * m20 + s * m00,
                  c * m21 + s * m01,
                  c * m22 + s * m02,
                  c * m23 + s * m03);

  return m;
};

/**
 * Creates a 4-by-4 matrix which rotates around the z-axis by the given angle.
 * @param {number} angle The angle by which to rotate (in radians).
 * @return {!o3djs.math.Matrix4} The rotation matrix.
 */
o3djs.math.matrix4.rotationZ = function(angle) {
  var c = Math.cos(angle);
  var s = Math.sin(angle);

  return [
    [c, s, 0, 0],
    [-s, c, 0, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 1]
  ];
};

/**
 * Modifies the given 4-by-4 matrix by a rotation around the z-axis by the given
 * angle.
 * @param {!o3djs.math.Matrix4} m The matrix.
 * @param {number} angle The angle by which to rotate (in radians).
 * @return {!o3djs.math.Matrix4} m once modified.
 */
o3djs.math.matrix4.rotateZ = function(m, angle) {
  var m0 = m[0];
  var m1 = m[1];
  var m2 = m[2];
  var m3 = m[3];
  var m00 = m0[0];
  var m01 = m0[1];
  var m02 = m0[2];
  var m03 = m0[3];
  var m10 = m1[0];
  var m11 = m1[1];
  var m12 = m1[2];
  var m13 = m1[3];
  var c = Math.cos(angle);
  var s = Math.sin(angle);

  m0.splice(0, 4, c * m00 + s * m10,
                  c * m01 + s * m11,
                  c * m02 + s * m12,
                  c * m03 + s * m13);
  m1.splice(0, 4, c * m10 - s * m00,
                  c * m11 - s * m01,
                  c * m12 - s * m02,
                  c * m13 - s * m03);

  return m;
};

/**
 * Creates a 4-by-4 rotation matrix.  Interprets the entries of the given
 * vector as angles by which to rotate around the x, y and z axes, returns a
 * a matrix which rotates around the x-axis first, then the y-axis, then the
 * z-axis.
 * @param {!o3djs.math.Vector3} v A vector of angles (in radians).
 * @return {!o3djs.math.Matrix4} The rotation matrix.
 */
o3djs.math.matrix4.rotationZYX = function(v) {
  var sinx = Math.sin(v[0]);
  var cosx = Math.cos(v[0]);
  var siny = Math.sin(v[1]);
  var cosy = Math.cos(v[1]);
  var sinz = Math.sin(v[2]);
  var cosz = Math.cos(v[2]);

  var coszsiny = cosz * siny;
  var sinzsiny = sinz * siny;

  return [
    [cosz * cosy, sinz * cosy, -siny, 0],
    [coszsiny * sinx - sinz * cosx,
     sinzsiny * sinx + cosz * cosx,
     cosy * sinx,
     0],
    [coszsiny * cosx + sinz * sinx,
     sinzsiny * cosx - cosz * sinx,
     cosy * cosx,
     0],
    [0, 0, 0, 1]
  ];
};

/**
 * Modifies a 4-by-4 matrix by a rotation.  Interprets the coordinates of the
 * given vector as angles by which to rotate around the x, y and z axes, rotates
 * around the x-axis first, then the y-axis, then the z-axis.
 * @param {!o3djs.math.Matrix4} m The matrix.
 * @param {!o3djs.math.Vector3} v A vector of angles (in radians).
 * @return {!o3djs.math.Matrix4} m once modified.
 */
o3djs.math.matrix4.rotateZYX = function(m, v) {
  var sinX = Math.sin(v[0]);
  var cosX = Math.cos(v[0]);
  var sinY = Math.sin(v[1]);
  var cosY = Math.cos(v[1]);
  var sinZ = Math.sin(v[2]);
  var cosZ = Math.cos(v[2]);

  var cosZSinY = cosZ * sinY;
  var sinZSinY = sinZ * sinY;

  var r00 = cosZ * cosY;
  var r01 = sinZ * cosY;
  var r02 = -sinY;
  var r10 = cosZSinY * sinX - sinZ * cosX;
  var r11 = sinZSinY * sinX + cosZ * cosX;
  var r12 = cosY * sinX;
  var r20 = cosZSinY * cosX + sinZ * sinX;
  var r21 = sinZSinY * cosX - cosZ * sinX;
  var r22 = cosY * cosX;

  var m0 = m[0];
  var m1 = m[1];
  var m2 = m[2];
  var m3 = m[3];

  var m00 = m0[0];
  var m01 = m0[1];
  var m02 = m0[2];
  var m03 = m0[3];
  var m10 = m1[0];
  var m11 = m1[1];
  var m12 = m1[2];
  var m13 = m1[3];
  var m20 = m2[0];
  var m21 = m2[1];
  var m22 = m2[2];
  var m23 = m2[3];
  var m30 = m3[0];
  var m31 = m3[1];
  var m32 = m3[2];
  var m33 = m3[3];

  m0.splice(0, 4,
      r00 * m00 + r01 * m10 + r02 * m20,
      r00 * m01 + r01 * m11 + r02 * m21,
      r00 * m02 + r01 * m12 + r02 * m22,
      r00 * m03 + r01 * m13 + r02 * m23);

  m1.splice(0, 4,
      r10 * m00 + r11 * m10 + r12 * m20,
      r10 * m01 + r11 * m11 + r12 * m21,
      r10 * m02 + r11 * m12 + r12 * m22,
      r10 * m03 + r11 * m13 + r12 * m23);

  m2.splice(0, 4,
      r20 * m00 + r21 * m10 + r22 * m20,
      r20 * m01 + r21 * m11 + r22 * m21,
      r20 * m02 + r21 * m12 + r22 * m22,
      r20 * m03 + r21 * m13 + r22 * m23);

  return m;
};

/**
 * Creates a 4-by-4 matrix which rotates around the given axis by the given
 * angle.
 * @param {(!o3djs.math.Vector3|!o3djs.math.Vector4)} axis The axis
 *     about which to rotate.
 * @param {number} angle The angle by which to rotate (in radians).
 * @return {!o3djs.math.Matrix4} A matrix which rotates angle radians
 *     around the axis.
 */
o3djs.math.matrix4.axisRotation = function(axis, angle) {
  var x = axis[0];
  var y = axis[1];
  var z = axis[2];
  var n = Math.sqrt(x * x + y * y + z * z);
  x /= n;
  y /= n;
  z /= n;
  var xx = x * x;
  var yy = y * y;
  var zz = z * z;
  var c = Math.cos(angle);
  var s = Math.sin(angle);
  var oneMinusCosine = 1 - c;

  return [
    [xx + (1 - xx) * c,
     x * y * oneMinusCosine + z * s,
     x * z * oneMinusCosine - y * s,
     0],
    [x * y * oneMinusCosine - z * s,
     yy + (1 - yy) * c,
     y * z * oneMinusCosine + x * s,
     0],
    [x * z * oneMinusCosine + y * s,
     y * z * oneMinusCosine - x * s,
     zz + (1 - zz) * c,
     0],
    [0, 0, 0, 1]
  ];
};

/**
 * Modifies the given 4-by-4 matrix by rotation around the given axis by the
 * given angle.
 * @param {!o3djs.math.Matrix4} m The matrix.
 * @param {(!o3djs.math.Vector3|!o3djs.math.Vector4)} axis The axis
 *     about which to rotate.
 * @param {number} angle The angle by which to rotate (in radians).
 * @return {!o3djs.math.Matrix4} m once modified.
 */
o3djs.math.matrix4.axisRotate = function(m, axis, angle) {
  var x = axis[0];
  var y = axis[1];
  var z = axis[2];
  var n = Math.sqrt(x * x + y * y + z * z);
  x /= n;
  y /= n;
  z /= n;
  var xx = x * x;
  var yy = y * y;
  var zz = z * z;
  var c = Math.cos(angle);
  var s = Math.sin(angle);
  var oneMinusCosine = 1 - c;

  var r00 = xx + (1 - xx) * c;
  var r01 = x * y * oneMinusCosine + z * s;
  var r02 = x * z * oneMinusCosine - y * s;
  var r10 = x * y * oneMinusCosine - z * s;
  var r11 = yy + (1 - yy) * c;
  var r12 = y * z * oneMinusCosine + x * s;
  var r20 = x * z * oneMinusCosine + y * s;
  var r21 = y * z * oneMinusCosine - x * s;
  var r22 = zz + (1 - zz) * c;

  var m0 = m[0];
  var m1 = m[1];
  var m2 = m[2];
  var m3 = m[3];

  var m00 = m0[0];
  var m01 = m0[1];
  var m02 = m0[2];
  var m03 = m0[3];
  var m10 = m1[0];
  var m11 = m1[1];
  var m12 = m1[2];
  var m13 = m1[3];
  var m20 = m2[0];
  var m21 = m2[1];
  var m22 = m2[2];
  var m23 = m2[3];
  var m30 = m3[0];
  var m31 = m3[1];
  var m32 = m3[2];
  var m33 = m3[3];

  m0.splice(0, 4,
      r00 * m00 + r01 * m10 + r02 * m20,
      r00 * m01 + r01 * m11 + r02 * m21,
      r00 * m02 + r01 * m12 + r02 * m22,
      r00 * m03 + r01 * m13 + r02 * m23);

  m1.splice(0, 4,
      r10 * m00 + r11 * m10 + r12 * m20,
      r10 * m01 + r11 * m11 + r12 * m21,
      r10 * m02 + r11 * m12 + r12 * m22,
      r10 * m03 + r11 * m13 + r12 * m23);

  m2.splice(0, 4,
      r20 * m00 + r21 * m10 + r22 * m20,
      r20 * m01 + r21 * m11 + r22 * m21,
      r20 * m02 + r21 * m12 + r22 * m22,
      r20 * m03 + r21 * m13 + r22 * m23);

  return m;
};

/**
 * Sets each function in the namespace o3djs.math to the row major
 * version in o3djs.math.rowMajor (provided such a function exists in
 * o3djs.math.rowMajor).  Call this function to establish the row major
 * convention.
 */
o3djs.math.installRowMajorFunctions = function() {
  for (var f in o3djs.math.rowMajor) {
    o3djs.math[f] = o3djs.math.rowMajor[f];
  }
};

/**
 * Sets each function in the namespace o3djs.math to the column major
 * version in o3djs.math.columnMajor (provided such a function exists in
 * o3djs.math.columnMajor).  Call this function to establish the column
 * major convention.
 */
o3djs.math.installColumnMajorFunctions = function() {
  for (var f in o3djs.math.columnMajor) {
    o3djs.math[f] = o3djs.math.columnMajor[f];
  }
};

/**
 * Sets each function in the namespace o3djs.math to the error checking
 * version in o3djs.math.errorCheck (provided such a function exists in
 * o3djs.math.errorCheck).
 */
o3djs.math.installErrorCheckFunctions = function() {
  for (var f in o3djs.math.errorCheck) {
    o3djs.math[f] = o3djs.math.errorCheck[f];
  }
};

/**
 * Sets each function in the namespace o3djs.math to the error checking free
 * version in o3djs.math.errorCheckFree (provided such a function exists in
 * o3djs.math.errorCheckFree).
 */
o3djs.math.installErrorCheckFreeFunctions = function() {
  for (var f in o3djs.math.errorCheckFree) {
    o3djs.math[f] = o3djs.math.errorCheckFree[f];
  }
}

// By default, install the row-major functions.
o3djs.math.installRowMajorFunctions();

// By default, install prechecking.
o3djs.math.installErrorCheckFunctions();
/*
 * Copyright 2009, Google Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */


/**
 * @fileoverview This file contains various functions for helping setup
 * packs for o3d.  It puts them in the "pack" module on the o3djs
 * object.
 *
 *     Note: This library is only a sample. It is not meant to be some official
 *     library. It is provided only as example code.
 *
 */

o3djs.provide('o3djs.pack');

o3djs.require('o3djs.material');
o3djs.require('o3djs.shape');

/**
 * A Module with utilities for dealing with packs..
 * @namespace
 */
o3djs.pack = o3djs.pack || {};

/**
 * Prepares a pack for rendering.
 *
 * @param {!o3d.Pack} pack Pack to prepare.
 * @param {!o3djs.rendergraph.ViewInfo} viewInfo as returned from
 *     o3djs.rendergraph.createView.
 * @param {!o3d.Pack} opt_effectPack Pack to create effects in. If this is
 *     not specifed the pack to prepare above will be used.
 *
 * @see o3djs.material.prepareMaterials
 * @see o3djs.shape.prepareShapes
 */
o3djs.pack.preparePack = function(pack, viewInfo, opt_effectPack) {
  o3djs.material.prepareMaterials(pack, viewInfo, opt_effectPack);
  o3djs.shape.prepareShapes(pack);
};

/*
 * Copyright 2009, Google Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */


/**
 * @fileoverview This file contains various functions and classes for rendering
 * gpu based particles.
 *
 * TODO: Add 3d oriented particles.
 */

o3djs.provide('o3djs.particles');

o3djs.require('o3djs.effect');
o3djs.require('o3djs.math');

/**
 * A Module with various GPU particle functions and classes.
 * Note: GPU particles have the issue that they are not sorted per particle
 * but rather per emitter.
 * @namespace
 */
o3djs.particles = o3djs.particles || {};

/**
 * Enum for pre-made particle states.
 * @enum
 */
o3djs.particles.ParticleStateIds = {
   BLEND: 0,
   ADD: 1,
   BLEND_PREMULTIPLY: 2,
   BLEND_NO_ALPHA: 3,
   SUBTRACT: 4,
   INVERSE: 5};

/**
 * Particle Effect strings
 * @type {!Array.<{name: string, fxString: string}>}
 */
o3djs.particles.FX_STRINGS_CG = [
  { name: 'particle3d', fxString: '' +
    'float4x4 worldViewProjection : WORLDVIEWPROJECTION;\n' +
    'float4x4 world : WORLD;\n' +
    'float3 worldVelocity;\n' +
    'float3 worldAcceleration;\n' +
    'float timeRange;\n' +
    'float time;\n' +
    'float timeOffset;\n' +
    'float frameDuration;\n' +
    'float numFrames;\n' +
    '\n' +
    '// We need to implement 1D!\n' +
    'sampler rampSampler;\n' +
    'sampler colorSampler;\n' +
    '\n' +
    'struct VertexShaderInput {\n' +
    '  float4 uvLifeTimeFrameStart : POSITION; // uv, lifeTime, frameStart\n' +
    '  float4 positionStartTime : TEXCOORD0;    // position.xyz, startTime\n' +
    '  float4 velocityStartSize : TEXCOORD1;   // velocity.xyz, startSize\n' +
    '  float4 accelerationEndSize : TEXCOORD2; // acceleration.xyz, endSize\n' +
    '  float4 spinStartSpinSpeed : TEXCOORD3;  // spinStart.x, spinSpeed.y\n' +
    '  float4 orientation : TEXCOORD4;  // orientation\n' +
    '  float4 colorMult : COLOR; //\n' +
    '};\n' +
    '\n' +
    'struct PixelShaderInput {\n' +
    '  float4 position : POSITION;\n' +
    '  float2 texcoord : TEXCOORD0;\n' +
    '  float1 percentLife : TEXCOORD1;\n' +
    '  float4 colorMult: TEXCOORD2;\n' +
    '};\n' +
    '\n' +
    'PixelShaderInput vertexShaderFunction(VertexShaderInput input) {\n' +
    '  PixelShaderInput output;\n' +
    '\n' +
    '  float2 uv = input.uvLifeTimeFrameStart.xy;\n' +
    '  float lifeTime = input.uvLifeTimeFrameStart.z;\n' +
    '  float frameStart = input.uvLifeTimeFrameStart.w;\n' +
    '  float3 position = input.positionStartTime.xyz;\n' +
    '  float startTime = input.positionStartTime.w;\n' +
    '  float3 velocity = mul(float4(input.velocityStartSize.xyz, 0),\n' +
    '                        world).xyz + worldVelocity;\n' +
    '  float startSize = input.velocityStartSize.w;\n' +
    '  float3 acceleration = mul(float4(input.accelerationEndSize.xyz, 0),\n' +
    '                            world).xyz + worldAcceleration;\n' +
    '  float endSize = input.accelerationEndSize.w;\n' +
    '  float spinStart = input.spinStartSpinSpeed.x;\n' +
    '  float spinSpeed = input.spinStartSpinSpeed.y;\n' +
    '\n' +
    '  float localTime = fmod((time - timeOffset - startTime), timeRange);\n' +
    '  float percentLife = localTime / lifeTime;\n' +
    '\n' +
    '  float frame = fmod(floor(localTime / frameDuration + frameStart),\n' +
    '                     numFrames);\n' +
    '  float uOffset = frame / numFrames;\n' +
    '  float u = uOffset + (uv.x + 0.5) * (1 / numFrames);\n' +
    '\n' +
    '  output.texcoord = float2(u, uv.y + 0.5);\n' +
    '  output.colorMult = input.colorMult;\n' +
    '\n' +
    '  float size = lerp(startSize, endSize, percentLife);\n' +
    '  size = (percentLife < 0 || percentLife > 1) ? 0 : size;\n' +
    '  float s = sin(spinStart + spinSpeed * localTime);\n' +
    '  float c = cos(spinStart + spinSpeed * localTime);\n' +
    '\n' +
    '  float4 rotatedPoint = float4((uv.x * c + uv.y * s) * size, 0,\n' +
    '                               (uv.x * s - uv.y * c) * size, 1);\n' +
    '  float3 center = velocity * localTime +\n' +
    '                  acceleration * localTime * localTime + \n' +
    '                  position;\n' +
    '  \n' +
    '      float4 q2 = input.orientation + input.orientation;\n' +
    '      float4 qx = input.orientation.xxxw * q2.xyzx;\n' +
    '      float4 qy = input.orientation.xyyw * q2.xyzy;\n' +
    '      float4 qz = input.orientation.xxzw * q2.xxzz;\n' +
    '  \n' +
    '      float4x4 localMatrix = float4x4(\n' +
    '        (1.0f - qy.y) - qz.z, \n' +
    '        qx.y + qz.w, \n' +
    '        qx.z - qy.w,\n' +
    '        0,\n' +
    '  \n' +
    '        qx.y - qz.w, \n' +
    '        (1.0f - qx.x) - qz.z, \n' +
    '        qy.z + qx.w,\n' +
    '        0,\n' +
    '  \n' +
    '        qx.z + qy.w, \n' +
    '        qy.z - qx.w, \n' +
    '        (1.0f - qx.x) - qy.y,\n' +
    '        0,\n' +
    '  \n' +
    '        center.x, center.y, center.z, 1);\n' +
    '  rotatedPoint = mul(rotatedPoint, localMatrix);\n' +
    '  output.position = mul(rotatedPoint, worldViewProjection);\n' +
    '  output.percentLife = percentLife;\n' +
    '  return output;\n' +
    '}\n' +
    '\n' +
    'float4 pixelShaderFunction(PixelShaderInput input): COLOR {\n' +
    '  float4 colorMult = tex2D(rampSampler, \n' +
    '                           float2(input.percentLife, 0.5)) *\n' +
    '                     input.colorMult;\n' +
    '  float4 color = tex2D(colorSampler, input.texcoord) * colorMult;\n' +
    '  return color;\n' +
    '}\n' +
    '\n' +
    '// #o3d VertexShaderEntryPoint vertexShaderFunction\n' +
    '// #o3d PixelShaderEntryPoint pixelShaderFunction\n' +
    '// #o3d MatrixLoadOrder RowMajor\n'},
  { name: 'particle2d', fxString: '' +
    'float4x4 viewProjection : VIEWPROJECTION;\n' +
    'float4x4 world : WORLD;\n' +
    'float4x4 viewInverse : VIEWINVERSE;\n' +
    'float3 worldVelocity;\n' +
    'float3 worldAcceleration;\n' +
    'float timeRange;\n' +
    'float time;\n' +
    'float timeOffset;\n' +
    'float frameDuration;\n' +
    'float numFrames;\n' +
    '\n' +
    '// We need to implement 1D!\n' +
    'sampler rampSampler;\n' +
    'sampler colorSampler;\n' +
    '\n' +
    'struct VertexShaderInput {\n' +
    '  float4 uvLifeTimeFrameStart : POSITION; // uv, lifeTime, frameStart\n' +
    '  float4 positionStartTime : TEXCOORD0;    // position.xyz, startTime\n' +
    '  float4 velocityStartSize : TEXCOORD1;   // velocity.xyz, startSize\n' +
    '  float4 accelerationEndSize : TEXCOORD2; // acceleration.xyz, endSize\n' +
    '  float4 spinStartSpinSpeed : TEXCOORD3;  // spinStart.x, spinSpeed.y\n' +
    '  float4 colorMult : COLOR; //\n' +
    '};\n' +
    '\n' +
    'struct PixelShaderInput {\n' +
    '  float4 position : POSITION;\n' +
    '  float2 texcoord : TEXCOORD0;\n' +
    '  float1 percentLife : TEXCOORD1;\n' +
    '  float4 colorMult: TEXCOORD2;\n' +
    '};\n' +
    '\n' +
    'PixelShaderInput vertexShaderFunction(VertexShaderInput input) {\n' +
    '  PixelShaderInput output;\n' +
    '\n' +
    '  float2 uv = input.uvLifeTimeFrameStart.xy;\n' +
    '  float lifeTime = input.uvLifeTimeFrameStart.z;\n' +
    '  float frameStart = input.uvLifeTimeFrameStart.w;\n' +
    '  float3 position = mul(float4(input.positionStartTime.xyz, 1),\n' +
    '                        world).xyz;\n' +
    '  float startTime = input.positionStartTime.w;\n' +
    '  float3 velocity = mul(float4(input.velocityStartSize.xyz, 0),\n' +
    '                        world).xyz + worldVelocity;\n' +
    '  float startSize = input.velocityStartSize.w;\n' +
    '  float3 acceleration = mul(float4(input.accelerationEndSize.xyz, 0),\n' +
    '                            world).xyz + worldAcceleration;\n' +
    '  float endSize = input.accelerationEndSize.w;\n' +
    '  float spinStart = input.spinStartSpinSpeed.x;\n' +
    '  float spinSpeed = input.spinStartSpinSpeed.y;\n' +
    '\n' +
    '  float localTime = fmod((time - timeOffset - startTime), timeRange);\n' +
    '  float percentLife = localTime / lifeTime;\n' +
    '\n' +
    '  float frame = fmod(floor(localTime / frameDuration + frameStart),\n' +
    '                     numFrames);\n' +
    '  float uOffset = frame / numFrames;\n' +
    '  float u = uOffset + (uv.x + 0.5) * (1 / numFrames);\n' +
    '\n' +
    '  output.texcoord = float2(u, uv.y + 0.5);\n' +
    '  output.colorMult = input.colorMult;\n' +
    '\n' +
    '  float3 basisX = viewInverse[0].xyz;\n' +
    '  float3 basisZ = viewInverse[1].xyz;\n' +
    '\n' +
    '  float size = lerp(startSize, endSize, percentLife);\n' +
    '  size = (percentLife < 0 || percentLife > 1) ? 0 : size;\n' +
    '  float s = sin(spinStart + spinSpeed * localTime);\n' +
    '  float c = cos(spinStart + spinSpeed * localTime);\n' +
    '\n' +
    '  float2 rotatedPoint = float2(uv.x * c + uv.y * s, \n' +
    '                               -uv.x * s + uv.y * c);\n' +
    '  float3 localPosition = float3(basisX * rotatedPoint.x +\n' +
    '                                basisZ * rotatedPoint.y) * size +\n' +
    '                         velocity * localTime +\n' +
    '                         acceleration * localTime * localTime + \n' +
    '                         position;\n' +
    '\n' +
    '  output.position = mul(float4(localPosition, 1), \n' +
    '                        viewProjection);\n' +
    '  output.percentLife = percentLife;\n' +
    '  return output;\n' +
    '}\n' +
    '\n' +
    'float4 pixelShaderFunction(PixelShaderInput input): COLOR {\n' +
    '  float4 colorMult = tex2D(rampSampler, \n' +
    '                           float2(input.percentLife, 0.5)) *\n' +
    '                     input.colorMult;\n' +
    '  float4 color = tex2D(colorSampler, input.texcoord) * colorMult;\n' +
    '  return color;\n' +
    '}\n' +
    '\n' +
    '// #o3d VertexShaderEntryPoint vertexShaderFunction\n' +
    '// #o3d PixelShaderEntryPoint pixelShaderFunction\n' +
    '// #o3d MatrixLoadOrder RowMajor\n'}];

o3djs.particles.FX_STRINGS_GLSL = [
  { name: 'particle3d', fxString: '' +
    'uniform mat4 world;\n' +
    'uniform mat4 worldViewProjection;\n' +
    'uniform vec3 worldVelocity;\n' +
    'uniform vec3 worldAcceleration;\n' +
    'uniform float timeRange;\n' +
    'uniform float time;\n' +
    'uniform float timeOffset;\n' +
    'uniform float frameDuration;\n' +
    'uniform float numFrames;\n' +
    '\n' +
    'attribute vec4 position; // uv, lifeTime, frameStart\n' +
    'attribute vec4 texCoord0; // position.xyz, startTime\n' +
    'attribute vec4 texCoord1; // velocity.xyz, startSize\n' +
    'attribute vec4 texCoord2; // acceleration.xyz, endSize\n' +
    'attribute vec4 texCoord3; // spinStart.x, spinSpeed.y\n' +
    'attribute vec4 texCoord4; // orientation\n' +
    'attribute vec4 color; //\n' +
    '\n' +
    'varying vec4 v_position;\n' +
    'varying vec2 v_texcoord;\n' +
    'varying float v_percentLife;\n' +
    'varying vec4 v_colorMult;\n' +
    '\n' +
    'void main() {\n' +
    '  vec4 uvLifeTimeFrameStart = position;\n' +
    '  vec4 positionStartTime = texCoord0;\n' +
    '  vec4 velocityStartSize = texCoord1;\n' +
    '  vec4 accelerationEndSize = texCoord2;\n' +
    '  vec4 spinStartSpinSpeed = texCoord3;\n' +
    '  vec4 orientation = texCoord4;\n' +
    '  vec4 colorMult = color;\n' +
    '  vec2 uv = uvLifeTimeFrameStart.xy;\n' +
    '  float lifeTime = uvLifeTimeFrameStart.z;\n' +
    '  float frameStart = uvLifeTimeFrameStart.w;\n' +
    '  vec3 position = positionStartTime.xyz;\n' +
    '  float startTime = positionStartTime.w;\n' +
    '  vec3 velocity = (world * vec4(velocityStartSize.xyz, 0)).xyz\n' +
    '      + worldVelocity;\n' +
    '  float startSize = velocityStartSize.w;\n' +
    '  vec3 acceleration = (world *\n' +
    '      vec4(accelerationEndSize.xyz, 0)).xyz + worldAcceleration;\n' +
    '  float endSize = accelerationEndSize.w;\n' +
    '  float spinStart = spinStartSpinSpeed.x;\n' +
    '  float spinSpeed = spinStartSpinSpeed.y;\n' +
    '\n' +
    '  float localTime = mod((time - timeOffset - startTime),\n' +
    '      timeRange);\n' +
    '  float percentLife = localTime / lifeTime;\n' +
    '\n' +
    '  float frame = mod(floor(localTime / frameDuration + frameStart),\n' +
    '                     numFrames);\n' +
    '  float uOffset = frame / numFrames;\n' +
    '  float u = uOffset + (uv.x + 0.5) * (1.0 / numFrames);\n' +
    '\n' +
    '  v_texcoord = vec2(u, uv.y + 0.5);\n' +
    '  v_colorMult = colorMult;\n' +
    '\n' +
    '  float size = mix(startSize, endSize, percentLife);\n' +
    '  size = (percentLife < 0.0 || percentLife > 1.0) ? 0.0 : size;\n' +
    '  float s = sin(spinStart + spinSpeed * localTime);\n' +
    '  float c = cos(spinStart + spinSpeed * localTime);\n' +
    '\n' +
    '  vec4 rotatedPoint = vec4((uv.x * c + uv.y * s) * size, 0.0,\n' +
    '                               (uv.x * s - uv.y * c) * size, 1.0);\n' +
    '  vec3 center = velocity * localTime +\n' +
    '                  acceleration * localTime * localTime + \n' +
    '                  position;\n' +
    '  \n' +
    '      vec4 q2 = orientation + orientation;\n' +
    '      vec4 qx = orientation.xxxw * q2.xyzx;\n' +
    '      vec4 qy = orientation.xyyw * q2.xyzy;\n' +
    '      vec4 qz = orientation.xxzw * q2.xxzz;\n' +
    '  \n' +
    '      mat4 localMatrix = mat4(\n' +
    '        (1.0 - qy.y) - qz.z, \n' +
    '        qx.y + qz.w, \n' +
    '        qx.z - qy.w,\n' +
    '        0,\n' +
    '  \n' +
    '        qx.y - qz.w, \n' +
    '        (1.0 - qx.x) - qz.z, \n' +
    '        qy.z + qx.w,\n' +
    '        0,\n' +
    '  \n' +
    '        qx.z + qy.w, \n' +
    '        qy.z - qx.w, \n' +
    '        (1.0 - qx.x) - qy.y,\n' +
    '        0,\n' +
    '  \n' +
    '        center.x, center.y, center.z, 1.0);\n' +
    '  rotatedPoint = localMatrix * rotatedPoint;\n' +
    '  gl_Position = worldViewProjection * rotatedPoint;\n' +
    '  v_percentLife = percentLife;\n' +
    '}\n' +
    '\n' +
    '// #o3d SplitMarker\n' +
    '\n' +
    'varying vec4 v_position;\n' +
    'varying vec2 v_texcoord;\n' +
    'varying float v_percentLife;\n' +
    'varying vec4 v_colorMult;\n' +
    '\n' +
    '// We need to implement 1D!\n' +
    'uniform sampler2D rampSampler;\n' +
    'uniform sampler2D colorSampler;\n' +
    '\n' +
    'void main() {\n' +
    '  vec4 colorMult = texture2D(rampSampler, \n' +
    '      vec2(v_percentLife, 0.5)) * v_colorMult;\n' +
    '  vec4 color = texture2D(colorSampler, v_texcoord) * colorMult;\n' +
    '  gl_FragColor = color;\n' +
    '}\n' +
    '\n' +
    '// #o3d MatrixLoadOrder RowMajor\n'},
  { name: 'particle2d', fxString: '' +
    'uniform mat4 viewProjection;\n' +
    'uniform mat4 world;\n' +
    'uniform mat4 viewInverse;\n' +
    'uniform vec3 worldVelocity;\n' +
    'uniform vec3 worldAcceleration;\n' +
    'uniform float timeRange;\n' +
    'uniform float time;\n' +
    'uniform float timeOffset;\n' +
    'uniform float frameDuration;\n' +
    'uniform float numFrames;\n' +
    '\n' +
    'attribute vec4 position; // uv, lifeTime, frameStart\n' +
    'attribute vec4 texCoord0; // position.xyz, startTime\n' +
    'attribute vec4 texCoord1; // velocity.xyz, startSize\n' +
    'attribute vec4 texCoord2; // acceleration.xyz, endSize\n' +
    'attribute vec4 texCoord3; // spinStart.x, spinSpeed.y\n' +
    'attribute vec4 color; //\n' +
    '\n' +
    'varying vec4 v_position;\n' +
    'varying vec2 v_texcoord;\n' +
    'varying float v_percentLife;\n' +
    'varying vec4 v_colorMult;\n' +
    '\n' +
    'void main() {\n' +
    '  vec4 uvLifeTimeFrameStart = position;\n' +
    '  vec4 positionStartTime = texCoord0;\n' +
    '  vec4 velocityStartSize = texCoord1;\n' +
    '  vec4 accelerationEndSize = texCoord2;\n' +
    '  vec4 spinStartSpinSpeed = texCoord3;\n' +
    '  vec4 colorMult = color;\n' +
    '  vec2 uv = uvLifeTimeFrameStart.xy;\n' +
    '  float lifeTime = uvLifeTimeFrameStart.z;\n' +
    '  float frameStart = uvLifeTimeFrameStart.w;\n' +
    '  vec3 position = (world * vec4(positionStartTime.xyz, 1.0)).xyz;\n' +
    '  float startTime = positionStartTime.w;\n' +
    '  vec3 velocity = (world * vec4(velocityStartSize.xyz, 0)).xyz \n' +
    '      + worldVelocity;\n' +
    '  float startSize = velocityStartSize.w;\n' +
    '  vec3 acceleration = (world *\n' +
    '      vec4(accelerationEndSize.xyz, 0)).xyz + worldAcceleration;\n' +
    '  float endSize = accelerationEndSize.w;\n' +
    '  float spinStart = spinStartSpinSpeed.x;\n' +
    '  float spinSpeed = spinStartSpinSpeed.y;\n' +
    '\n' +
    '  float localTime = mod((time - timeOffset - startTime),\n' +
    '      timeRange);\n' +
    '  float percentLife = localTime / lifeTime;\n' +
    '\n' +
    '  float frame = mod(floor(localTime / frameDuration + frameStart),\n' +
    '                     numFrames);\n' +
    '  float uOffset = frame / numFrames;\n' +
    '  float u = uOffset + (uv.x + 0.5) * (1.0 / numFrames);\n' +
    '\n' +
    '  v_texcoord = vec2(u, uv.y + 0.5);\n' +
    '  v_colorMult = colorMult;\n' +
    '\n' +
    '  vec3 basisX = viewInverse[0].xyz;\n' +
    '  vec3 basisZ = viewInverse[1].xyz;\n' +
    '\n' +
    '  float size = mix(startSize, endSize, percentLife);\n' +
    '  size = (percentLife < 0.0 || percentLife > 1.0) ? 0.0 : size;\n' +
    '  float s = sin(spinStart + spinSpeed * localTime);\n' +
    '  float c = cos(spinStart + spinSpeed * localTime);\n' +
    '\n' +
    '  vec2 rotatedPoint = vec2(uv.x * c + uv.y * s, \n' +
    '                               -uv.x * s + uv.y * c);\n' +
    '  vec3 localPosition = vec3(basisX * rotatedPoint.x +\n' +
    '                                basisZ * rotatedPoint.y) * size +\n' +
    '                         velocity * localTime +\n' +
    '                         acceleration * localTime * localTime + \n' +
    '                         position;\n' +
    '\n' +
    '  gl_Position = (viewProjection * vec4(localPosition, 1.0));\n' +
    '  v_percentLife = percentLife;\n' +
    '}\n' +
    '\n' +
    '// #o3d SplitMarker\n' +
    '\n' +
    'varying vec4 v_position;\n' +
    'varying vec2 v_texcoord;\n' +
    'varying float v_percentLife;\n' +
    'varying vec4 v_colorMult;\n' +
    '\n' +
    '// We need to implement 1D!\n' +
    'uniform sampler2D rampSampler;\n' +
    'uniform sampler2D colorSampler;\n' +
    '\n' +
    'void main() {\n' +
    '  vec4 colorMult = texture2D(rampSampler, \n' +
    '      vec2(v_percentLife, 0.5)) * v_colorMult;\n' +
    '  vec4 color = texture2D(colorSampler, v_texcoord) * colorMult;\n' +
    '  gl_FragColor = color;\n' +
    '}\n' +
    '\n' +
    '// #o3d MatrixLoadOrder RowMajor\n'}];


/**
 * Sets the current shaders language to be in accordance with effect.js.
 */
o3djs.particles.useCorrectShaders_ = function() {
  o3djs.particles.FX_STRINGS = o3djs.particles.FX_STRINGS_CG;
  if (o3djs.effect.LANGUAGE == 'glsl') {
    o3djs.particles.FX_STRINGS = o3djs.particles.FX_STRINGS_GLSL;
  }
};


/**
 * Corner values.
 * @private
 * @type {!Array.<!Array.<number>>}
 */
o3djs.particles.CORNERS_ = [
      [-0.5, -0.5],
      [+0.5, -0.5],
      [+0.5, +0.5],
      [-0.5, +0.5]];


/**
 * Creates a particle system.
 * You only need one of these to run multiple emitters of different types
 * of particles.
 * @param {!o3d.Pack} pack The pack for the particle system to manage resources.
 * @param {!o3djs.rendergraph.ViewInfo} viewInfo A viewInfo so the particle
 *     system can do the default setup. The only thing used from viewInfo
 *     is the zOrderedDrawList. If that is not where you want your particles,
 *     after you create the particleEmitter use
 *     particleEmitter.material.drawList = myDrawList to set it to something
 *     else.
 * @param {!o3d.ParamFloat} opt_clockParam A ParamFloat to be the default
 *     clock for emitters of this particle system.
 * @param {!function(): number} opt_randomFunction A function that returns
 *     a random number between 0.0 and 1.0. This allows you to pass in a
 *     pseudo random function if you need particles that are reproducable.
 * @return {!o3djs.particles.ParticleSystem} The created particle system.
 */
o3djs.particles.createParticleSystem = function(pack,
                                                viewInfo,
                                                opt_clockParam,
                                                opt_randomFunction) {
  return new o3djs.particles.ParticleSystem(pack,
                                            viewInfo,
                                            opt_clockParam,
                                            opt_randomFunction);
};

/**
 * An Object to manage Particles.
 * @constructor
 * @param {!o3d.Pack} pack The pack for the particle system to manage resources.
 * @param {!o3djs.rendergraph.ViewInfo} viewInfo A viewInfo so the particle
 *     system can do the default setup. The only thing used from viewInfo
 *     is the zOrderedDrawList. If that is not where you want your particles,
 *     after you create the particleEmitter use
 *     particleEmitter.material.drawList = myDrawList to set it to something
 *     else.
 * @param {!o3d.ParamFloat} opt_clockParam A ParamFloat to be the default
 *     clock for emitters of this particle system.
 * @param {!function(): number} opt_randomFunction A function that returns
 *     a random number between 0.0 and 1.0. This allows you to pass in a
 *     pseudo random function if you need particles that are reproducable.
 */
o3djs.particles.ParticleSystem = function(pack,
                                          viewInfo,
                                          opt_clockParam,
                                          opt_randomFunction) {
  var o3d = o3djs.base.o3d;
  var particleStates = [];
  var effects = [];
  o3djs.particles.useCorrectShaders_();
  for (var ee = 0; ee < o3djs.particles.FX_STRINGS.length; ++ee) {
    var info = o3djs.particles.FX_STRINGS[ee];
    var effect = pack.createObject('Effect');
    effect.name = info.name;
    effect.loadFromFXString(info.fxString);
    effects.push(effect);
  }

  var stateInfos = {};
  stateInfos[o3djs.particles.ParticleStateIds.BLEND] = {
    'SourceBlendFunction':
        o3djs.base.o3d.State.BLENDFUNC_SOURCE_ALPHA,
    'DestinationBlendFunction':
        o3djs.base.o3d.State.BLENDFUNC_INVERSE_SOURCE_ALPHA};

  stateInfos[o3djs.particles.ParticleStateIds.ADD] = {
    'SourceBlendFunction':
        o3djs.base.o3d.State.BLENDFUNC_SOURCE_ALPHA,
    'DestinationBlendFunction':
        o3djs.base.o3d.State.BLENDFUNC_ONE};

  stateInfos[o3djs.particles.ParticleStateIds.BLEND_PREMULTIPLY] = {
    'SourceBlendFunction':
        o3djs.base.o3d.State.BLENDFUNC_ONE,
    'DestinationBlendFunction':
        o3djs.base.o3d.State.BLENDFUNC_INVERSE_SOURCE_ALPHA};

  stateInfos[o3djs.particles.ParticleStateIds.BLEND_NO_ALPHA] = {
    'SourceBlendFunction':
        o3djs.base.o3d.State.BLENDFUNC_SOURCE_COLOR,
    'DestinationBlendFunction':
        o3djs.base.o3d.State.BLENDFUNC_INVERSE_SOURCE_COLOR};

  stateInfos[o3djs.particles.ParticleStateIds.SUBTRACT] = {
    'SourceBlendFunction':
        o3djs.base.o3d.State.BLENDFUNC_SOURCE_ALPHA,
    'DestinationBlendFunction':
        o3djs.base.o3d.State.BLENDFUNC_INVERSE_SOURCE_ALPHA,
    'BlendEquation':
        o3djs.base.o3d.State.BLEND_REVERSE_SUBTRACT};

  stateInfos[o3djs.particles.ParticleStateIds.INVERSE] = {
    'SourceBlendFunction':
        o3djs.base.o3d.State.BLENDFUNC_INVERSE_DESTINATION_COLOR,
    'DestinationBlendFunction':
        o3djs.base.o3d.State.BLENDFUNC_INVERSE_SOURCE_COLOR};

  for (var key in o3djs.particles.ParticleStateIds) {
    var state = pack.createObject('State');
    var id = o3djs.particles.ParticleStateIds[key];
    particleStates[id] = state;
    state.getStateParam('ZWriteEnable').value = false;
    state.getStateParam('CullMode').value = o3d.State.CULL_NONE;

    var info = stateInfos[id];
    for (var stateName in info) {
      state.getStateParam(stateName).value = info[stateName];
    }
  }

  var colorTexture = pack.createTexture2D(8, 8, o3d.Texture.ARGB8, 1, false);
  var pixelBase = [0, 0.20, 0.70, 1, 0.70, 0.20, 0, 0];
  var pixels = [];
  for (var yy = 0; yy < 8; ++yy) {
    for (var xx = 0; xx < 8; ++xx) {
      var pixel = pixelBase[xx] * pixelBase[yy];
      pixels.push(pixel, pixel, pixel, pixel);
    }
  }
  colorTexture.set(0, pixels);
  var rampTexture = pack.createTexture2D(3, 1, o3d.Texture.ARGB8, 1, false);
  rampTexture.set(0, [1, 1, 1, 1,
                      1, 1, 1, 0.5,
                      1, 1, 1, 0]);

  if (!opt_clockParam) {
    this.counter_ = pack.createObject('SecondCounter');
    opt_clockParam = this.counter_.getParam('count');
  }

  this.randomFunction_ = opt_randomFunction || function() {
        return Math.random();
      };

  /**
   * The states for the various blend modes.
   * @type {!Array.<!o3d.State>}
   */
  this.particleStates = particleStates;

  /**
   * The default ParamFloat to use as the clock for emitters created by
   * this system.
   * @type {!o3d.ParamFloat}
   */
  this.clockParam = opt_clockParam;

  /**
   * The pack used to manage particle system resources.
   * @type {!o3d.Pack}
   */
  this.pack = pack;

  /**
   * The viewInfo that is used to get drawLists.
   * @type {!o3djs.rendergraph.ViewInfo}
   */
  this.viewInfo = viewInfo;

  /**
   * The effects for particles.
   * @type {!Array.<!o3d.Effect>}
   */
  this.effects = effects;


  /**
   * The default color texture for particles.
   * @type {!o3d.Texture2D}
   */
  this.defaultColorTexture = colorTexture;


  /**
   * The default ramp texture for particles.
   * @type {!o3d.Texture2D}
   */
  this.defaultRampTexture = rampTexture;
};

/**
 * A ParticleSpec specifies how to emit particles.
 *
 * NOTE: For all particle functions you can specific a ParticleSpec as a
 * Javascript object, only specifying the fields that you care about.
 *
 * <pre>
 * emitter.setParameters({
 *   numParticles: 40,
 *   lifeTime: 2,
 *   timeRange: 2,
 *   startSize: 50,
 *   endSize: 90,
 *   positionRange: [10, 10, 10],
 *   velocity:[0, 0, 60], velocityRange: [15, 15, 15],
 *   acceleration: [0, 0, -20],
 *   spinSpeedRange: 4}
 * );
 * </pre>
 *
 * Many of these parameters are in pairs. For paired paramters each particle
 * specfic value is set like this
 *
 * particle.field = value + Math.random() - 0.5 * valueRange * 2;
 *
 * or in English
 *
 * particle.field = value plus or minus valueRange.
 *
 * So for example, if you wanted a value from 10 to 20 you'd pass 15 for value
 * and 5 for valueRange because
 *
 * 15 + or - 5  = (10 to 20)
 *
 * @constructor
 */
o3djs.particles.ParticleSpec = function() {
  /**
   * The number of particles to emit.
   * @type {number}
   */
  this.numParticles = 1;

  /**
   * The number of frames in the particle texture.
   * @type {number}
   */
  this.numFrames = 1;

  /**
   * The frame duration at which to animate the particle texture in seconds per
   * frame.
   * @type {number}
   */
  this.frameDuration = 1;

  /**
   * The initial frame to display for a particular particle.
   * @type {number}
   */
  this.frameStart = 0;

  /**
   * The frame start range.
   * @type {number}
   */
  this.frameStartRange = 0;

  /**
   * The life time of the entire particle system.
   * To make a particle system be continuous set this to match the lifeTime.
   * @type {number}
   */
  this.timeRange = 99999999;

  /**
   * The startTime of a particle.
   * @type {?number}
   */
  this.startTime = null;
  // TODO: Describe what happens if this is not set. I still have some
  //     work to do there.

  /**
   * The lifeTime of a particle.
   * @type {number}
   */
  this.lifeTime = 1;

  /**
   * The lifeTime range.
   * @type {number}
   */
  this.lifeTimeRange = 0;

  /**
   * The starting size of a particle.
   * @type {number}
   */
  this.startSize = 1;

  /**
   * The starting size range.
   * @type {number}
   */
  this.startSizeRange = 0;

  /**
   * The ending size of a particle.
   * @type {number}
   */
  this.endSize = 1;

  /**
   * The ending size range.
   * @type {number}
   */
  this.endSizeRange = 0;

  /**
   * The starting position of a particle in local space.
   * @type {!o3djs.math.Vector3}
   */
  this.position = [0, 0, 0];

  /**
   * The starting position range.
   * @type {!o3djs.math.Vector3}
   */
  this.positionRange = [0, 0, 0];

  /**
   * The velocity of a paritcle in local space.
   * @type {!o3djs.math.Vector3}
   */
  this.velocity = [0, 0, 0];

  /**
   * The velocity range.
   * @type {!o3djs.math.Vector3}
   */
  this.velocityRange = [0, 0, 0];

  /**
   * The acceleration of a particle in local space.
   * @type {!o3djs.math.Vector3}
   */
  this.acceleration = [0, 0, 0];

  /**
   * The accleration range.
   * @type {!o3djs.math.Vector3}
   */
  this.accelerationRange = [0, 0, 0];

  /**
   * The starting spin value for a particle in radians.
   * @type {number}
   */
  this.spinStart = 0;

  /**
   * The spin start range.
   * @type {number}
   */
  this.spinStartRange = 0;

  /**
   * The spin speed of a particle in radians.
   * @type {number}
   */
  this.spinSpeed = 0;

  /**
   * The spin speed range.
   * @type {number}
   */
  this.spinSpeedRange = 0;

  /**
   * The color multiplier of a particle.
   * @type {!o3djs.math.Vector4}
   */
  this.colorMult = [1, 1, 1, 1];

  /**
   * The color multiplier range.
   * @type {!o3djs.math.Vector4}
   */
  this.colorMultRange = [0, 0, 0, 0];

  /**
   * The velocity of all paritcles in world space.
   * @type {!o3djs.math.Vector3}
   */
  this.worldVelocity = [0, 0, 0];

  /**
   * The acceleration of all paritcles in world space.
   * @type {!o3djs.math.Vector3}
   */
  this.worldAcceleration = [0, 0, 0];

  /**
   * Whether these particles are oriented in 2d or 3d. true = 2d, false = 3d.
   * @type {boolean}
   */
  this.billboard = true;

  /**
   * The orientation of a particle. This is only used if billboard is false.
   * @type {!o3djs.quaternions.Quaternion}
   */
  this.orientation = [0, 0, 0, 1];
};

/**
 * Creates a particle emitter.
 * @param {!o3d.Texture} opt_texture The texture to use for the particles.
 *     If you don't supply a texture a default is provided.
 * @param {!o3d.ParamFloat} opt_clockParam A ParamFloat to be the clock for
 *     the emitter.
 * @return {!o3djs.particles.ParticleEmitter} The new emitter.
 */
o3djs.particles.ParticleSystem.prototype.createParticleEmitter =
    function(opt_texture, opt_clockParam) {
  return new o3djs.particles.ParticleEmitter(this, opt_texture, opt_clockParam);
};

/**
 * Creates a Trail particle emitter.
 * You can use this for jet exhaust, etc...
 * @param {!o3d.Transform} parent Transform to put emitter on.
 * @param {number} maxParticles Maximum number of particles to appear at once.
 * @param {!o3djs.particles.ParticleSpec} parameters The parameters used to
 *     generate particles.
 * @param {!o3d.Texture} opt_texture The texture to use for the particles.
 *     If you don't supply a texture a default is provided.
 * @param {!function(number, !o3djs.particles.ParticleSpec): void}
 *     opt_perParticleParamSetter A function that is called for each particle to
 *     allow it's parameters to be adjusted per particle. The number is the
 *     index of the particle being created, in other words, if numParticles is
 *     20 this value will be 0 to 19. The ParticleSpec is a spec for this
 *     particular particle. You can set any per particle value before returning.
 * @param {!o3d.ParamFloat} opt_clockParam A ParamFloat to be the clock for
 *     the emitter.
 * @return {!o3djs.particles.Trail} A Trail object.
 */
o3djs.particles.ParticleSystem.prototype.createTrail = function(
    parent,
    maxParticles,
    parameters,
    opt_texture,
    opt_perParticleParamSetter,
    opt_clockParam) {
  return new o3djs.particles.Trail(
      this,
      parent,
      maxParticles,
      parameters,
      opt_texture,
      opt_perParticleParamSetter,
      opt_clockParam);
};

/**
 * A ParticleEmitter
 * @constructor
 * @param {!o3djs.particles.ParticleSystem} particleSystem The particle system
 *     to manage this emitter.
 * @param {!o3d.Texture} opt_texture The texture to use for the particles.
 *     If you don't supply a texture a default is provided.
 * @param {!o3d.ParamFloat} opt_clockParam A ParamFloat to be the clock for
 *     the emitter.
 */
o3djs.particles.ParticleEmitter = function(particleSystem,
                                           opt_texture,
                                           opt_clockParam) {
  opt_clockParam = opt_clockParam || particleSystem.clockParam;

  var o3d = o3djs.base.o3d;
  var pack = particleSystem.pack;
  var viewInfo = particleSystem.viewInfo;
  var material = pack.createObject('Material');
  material.name = 'particles';
  material.drawList = viewInfo.zOrderedDrawList;
  material.effect = particleSystem.effects[1];
  particleSystem.effects[1].createUniformParameters(material);
  material.getParam('time').bind(opt_clockParam);

  var rampSampler = pack.createObject('Sampler');
  rampSampler.texture = particleSystem.defaultRampTexture;
  rampSampler.addressModeU = o3d.Sampler.CLAMP;

  var colorSampler = pack.createObject('Sampler');
  colorSampler.texture = opt_texture || particleSystem.defaultColorTexture;
  colorSampler.addressModeU = o3d.Sampler.CLAMP;
  colorSampler.addressModeV = o3d.Sampler.CLAMP;

  material.getParam('rampSampler').value = rampSampler;
  material.getParam('colorSampler').value = colorSampler;

  var vertexBuffer = pack.createObject('VertexBuffer');
  var uvLifeTimeFrameStartField = vertexBuffer.createField('FloatField', 4);
  var positionStartTimeField = vertexBuffer.createField('FloatField', 4);
  var velocityStartSizeField = vertexBuffer.createField('FloatField', 4);
  var accelerationEndSizeField = vertexBuffer.createField('FloatField', 4);
  var spinStartSpinSpeedField = vertexBuffer.createField('FloatField', 4);
  var orientationField = vertexBuffer.createField('FloatField', 4);
  var colorMultField = vertexBuffer.createField('FloatField', 4);

  var indexBuffer = pack.createObject('IndexBuffer');

  var streamBank = pack.createObject('StreamBank');
  streamBank.setVertexStream(o3d.Stream.POSITION, 0,
                             uvLifeTimeFrameStartField, 0);
  streamBank.setVertexStream(o3d.Stream.TEXCOORD, 0,
                             positionStartTimeField, 0);
  streamBank.setVertexStream(o3d.Stream.TEXCOORD, 1,
                             velocityStartSizeField, 0);
  streamBank.setVertexStream(o3d.Stream.TEXCOORD, 2,
                             accelerationEndSizeField, 0);
  streamBank.setVertexStream(o3d.Stream.TEXCOORD, 3,
                             spinStartSpinSpeedField, 0);
  streamBank.setVertexStream(o3d.Stream.TEXCOORD, 4,
                             orientationField, 0);
  streamBank.setVertexStream(o3d.Stream.COLOR, 0,
                             colorMultField, 0);

  var shape = pack.createObject('Shape');
  var primitive = pack.createObject('Primitive');
  primitive.material = material;
  primitive.owner = shape;
  primitive.streamBank = streamBank;
  primitive.indexBuffer = indexBuffer;
  primitive.primitiveType = o3d.Primitive.TRIANGLELIST;
  primitive.createDrawElement(pack, null);

  this.vertexBuffer_ = vertexBuffer;
  this.uvLifeTimeFrameStartField_ = uvLifeTimeFrameStartField;
  this.positionStartTimeField_ = positionStartTimeField;
  this.velocityStartSizeField_ = velocityStartSizeField;
  this.accelerationEndSizeField_ = accelerationEndSizeField;
  this.spinStartSpinSpeedField_ = spinStartSpinSpeedField;
  this.orientationField_ = orientationField;
  this.colorMultField_ = colorMultField;
  this.indexBuffer_ = indexBuffer;
  this.streamBank_ = streamBank;
  this.primitive_ = primitive;
  this.rampSampler_ = rampSampler;
  this.rampTexture_ = particleSystem.defaultRampTexture;
  this.colorSampler_ = colorSampler;

  /**
   * The particle system managing this emitter.
   * @type {!o3djs.particles.ParticleSystem}
   */
  this.particleSystem = particleSystem;

  /**
   * The Shape used to render these particles.
   * @type {!o3d.Shape}
   */
  this.shape = shape;

  /**
   * The material used by this emitter.
   * @type {!o3d.Material}
   */
  this.material = material;

  /**
   * The param that is the source for the time for this emitter.
   * @type {!o3d.ParamFloat}
   */
  this.clockParam = opt_clockParam;
};

/**
 * Sets the blend state for the particles.
 * You can use this to set the emitter to draw with BLEND, ADD, SUBTRACT, etc.
 * @param {o3djs.particles.ParticleStateIds} stateId The state you want.
 */
o3djs.particles.ParticleEmitter.prototype.setState = function(stateId) {
  this.material.state = this.particleSystem.particleStates[stateId];
};

/**
 * Sets the colorRamp for the particles.
 * The colorRamp is used as a multiplier for the texture. When a particle
 * starts it is multiplied by the first color, as it ages to progressed
 * through the colors in the ramp.
 *
 * <pre>
 * particleEmitter.setColorRamp([
 *   1, 0, 0, 1,    // red
 *   0, 1, 0, 1,    // green
 *   1, 0, 1, 0]);  // purple but with zero alpha
 * </pre>
 *
 * The code above sets the particle to start red, change to green then
 * fade out while changing to purple.
 *
 * @param {!Array.<number>} colorRamp An array of color values in
 *     the form RGBA.
 */
o3djs.particles.ParticleEmitter.prototype.setColorRamp = function(colorRamp) {
  var width = colorRamp.length / 4;
  if (width % 1 != 0) {
    throw 'colorRamp must have multiple of 4 entries';
  }

  if (this.rampTexture_ == this.particleSystem.defaultRampTexture) {
    this.rampTexture_ = null;
  }

  if (this.rampTexture_ && this.rampTexture_.width != width) {
    this.particleSystem.pack.removeObject(this.rampTexture_);
    this.rampTexture_ = null;
  }

  if (!this.rampTexture_) {
    this.rampTexture_ = this.particleSystem.pack.createTexture2D(
        width, 1, o3djs.base.o3d.Texture.ARGB8, 1, false);
  }

  this.rampTexture_.set(0, colorRamp);
  this.rampSampler_.texture = this.rampTexture_;
};

/**
 * Validates and adds missing particle parameters.
 * @param {!o3djs.particles.ParticleSpec} parameters The parameters to validate.
 */
o3djs.particles.ParticleEmitter.prototype.validateParameters = function(
    parameters) {
  var defaults = new o3djs.particles.ParticleSpec();
  for (var key in parameters) {
    if (typeof defaults[key] === 'undefined') {
      throw 'unknown particle parameter "' + key + '"';
    }
  }
  for (var key in defaults) {
    if (typeof parameters[key] === 'undefined') {
      parameters[key] = defaults[key];
    }
  }
};

/**
 * Creates particles.
 * @private
 * @param {number} firstParticleIndex Index of first particle to create.
 * @param {number} numParticles The number of particles to create.
 * @param {!o3djs.particles.ParticleSpec} parameters The parameters for the
 *     emitters.
 * @param {!function(number, !o3djs.particles.ParticleSpec): void}
 *     opt_perParticleParamSetter A function that is called for each particle to
 *     allow it's parameters to be adjusted per particle. The number is the
 *     index of the particle being created, in other words, if numParticles is
 *     20 this value will be 0 to 19. The ParticleSpec is a spec for this
 *     particular particle. You can set any per particle value before returning.
 */
o3djs.particles.ParticleEmitter.prototype.createParticles_ = function(
    firstParticleIndex,
    numParticles,
    parameters,
    opt_perParticleParamSetter) {
  var uvLifeTimeFrameStart = this.uvLifeTimeFrameStart_;
  var positionStartTime = this.positionStartTime_;
  var velocityStartSize = this.velocityStartSize_;
  var accelerationEndSize = this.accelerationEndSize_;
  var spinStartSpinSpeed = this.spinStartSpinSpeed_;
  var orientation = this.orientation_;
  var colorMults = this.colorMults_;

  // Set the globals.
  this.material.effect =
      this.particleSystem.effects[parameters.billboard ? 1 : 0];
  this.material.getParam('timeRange').value = parameters.timeRange;
  this.material.getParam('numFrames').value = parameters.numFrames;
  this.material.getParam('frameDuration').value = parameters.frameDuration;
  this.material.getParam('worldVelocity').value = parameters.worldVelocity;
  this.material.getParam('worldAcceleration').value =
      parameters.worldAcceleration;

  var random = this.particleSystem.randomFunction_;

  var plusMinus = function(range) {
    return (random() - 0.5) * range * 2;
  };

  // TODO: change to not allocate.
  var plusMinusVector = function(range) {
    var v = [];
    for (var ii = 0; ii < range.length; ++ii) {
      v.push(plusMinus(range[ii]));
    }
    return v;
  };

  for (var ii = 0; ii < numParticles; ++ii) {
    if (opt_perParticleParamSetter) {
      opt_perParticleParamSetter(ii, parameters);
    }
    var pLifeTime = parameters.lifeTime;
    var pStartTime = (parameters.startTime === null) ?
        (ii * parameters.lifeTime / numParticles) : parameters.startTime;
    var pFrameStart =
        parameters.frameStart + plusMinus(parameters.frameStartRange);
    var pPosition = o3djs.math.addVector(
        parameters.position, plusMinusVector(parameters.positionRange));
    var pVelocity = o3djs.math.addVector(
        parameters.velocity, plusMinusVector(parameters.velocityRange));
    var pAcceleration = o3djs.math.addVector(
        parameters.acceleration,
        plusMinusVector(parameters.accelerationRange));
    var pColorMult = o3djs.math.addVector(
        parameters.colorMult, plusMinusVector(parameters.colorMultRange));
    var pSpinStart =
        parameters.spinStart + plusMinus(parameters.spinStartRange);
    var pSpinSpeed =
        parameters.spinSpeed + plusMinus(parameters.spinSpeedRange);
    var pStartSize =
        parameters.startSize + plusMinus(parameters.startSizeRange);
    var pEndSize = parameters.endSize + plusMinus(parameters.endSizeRange);
    var pOrientation = parameters.orientation;

    // make each corner of the particle.
    for (var jj = 0; jj < 4; ++jj) {
      var offset0 = (ii * 4 + jj) * 4;
      var offset1 = offset0 + 1;
      var offset2 = offset0 + 2;
      var offset3 = offset0 + 3;

      uvLifeTimeFrameStart[offset0] = o3djs.particles.CORNERS_[jj][0];
      uvLifeTimeFrameStart[offset1] = o3djs.particles.CORNERS_[jj][1];
      uvLifeTimeFrameStart[offset2] = pLifeTime;
      uvLifeTimeFrameStart[offset3] = pFrameStart;

      positionStartTime[offset0] = pPosition[0];
      positionStartTime[offset1] = pPosition[1];
      positionStartTime[offset2] = pPosition[2];
      positionStartTime[offset3] = pStartTime;

      velocityStartSize[offset0] = pVelocity[0];
      velocityStartSize[offset1] = pVelocity[1];
      velocityStartSize[offset2] = pVelocity[2];
      velocityStartSize[offset3] = pStartSize;

      accelerationEndSize[offset0] = pAcceleration[0];
      accelerationEndSize[offset1] = pAcceleration[1];
      accelerationEndSize[offset2] = pAcceleration[2];
      accelerationEndSize[offset3] = pEndSize;

      spinStartSpinSpeed[offset0] = pSpinStart;
      spinStartSpinSpeed[offset1] = pSpinSpeed;
      spinStartSpinSpeed[offset2] = 0;
      spinStartSpinSpeed[offset3] = 0;

      orientation[offset0] = pOrientation[0];
      orientation[offset1] = pOrientation[1];
      orientation[offset2] = pOrientation[2];
      orientation[offset3] = pOrientation[3];

      colorMults[offset0] = pColorMult[0];
      colorMults[offset1] = pColorMult[1];
      colorMults[offset2] = pColorMult[2];
      colorMults[offset3] = pColorMult[3];
    }
  }

  firstParticleIndex *= 4;
  this.uvLifeTimeFrameStartField_.setAt(
      firstParticleIndex,
      uvLifeTimeFrameStart);
  this.positionStartTimeField_.setAt(
      firstParticleIndex,
      positionStartTime);
  this.velocityStartSizeField_.setAt(
      firstParticleIndex,
      velocityStartSize);
  this.accelerationEndSizeField_.setAt(
      firstParticleIndex,
      accelerationEndSize);
  this.spinStartSpinSpeedField_.setAt(
      firstParticleIndex,
      spinStartSpinSpeed);
  this.orientationField_.setAt(
      firstParticleIndex,
      orientation);
  this.colorMultField_.setAt(
      firstParticleIndex,
      colorMults);
};

/**
 * Allocates particles.
 * @private
 * @param {number} numParticles Number of particles to allocate.
 */
o3djs.particles.ParticleEmitter.prototype.allocateParticles_ = function(
    numParticles) {
  if (this.vertexBuffer_.numElements != numParticles * 4) {
    this.vertexBuffer_.allocateElements(numParticles * 4);

    var indices = [];
    for (var ii = 0; ii < numParticles; ++ii) {
      // Make 2 triangles for the quad.
      var startIndex = ii * 4
      indices.push(startIndex + 0, startIndex + 1, startIndex + 2);
      indices.push(startIndex + 0, startIndex + 2, startIndex + 3);
    }
    this.indexBuffer_.set(indices);

    // We keep these around to avoid memory allocations for trails.
    this.uvLifeTimeFrameStart_ = [];
    this.positionStartTime_ = [];
    this.velocityStartSize_ = [];
    this.accelerationEndSize_ = [];
    this.spinStartSpinSpeed_ = [];
    this.orientation_ = [];
    this.colorMults_ = [];
  }

  this.primitive_.numberPrimitives = numParticles * 2;
  this.primitive_.numberVertices = numParticles * 4;
};

/**
 * Sets the parameters of the particle emitter.
 *
 * Each of these parameters are in pairs. The used to create a table
 * of particle parameters. For each particle a specfic value is
 * set like this
 *
 * particle.field = value + Math.random() - 0.5 * valueRange * 2;
 *
 * or in English
 *
 * particle.field = value plus or minus valueRange.
 *
 * So for example, if you wanted a value from 10 to 20 you'd pass 15 for value
 * and 5 for valueRange because
 *
 * 15 + or - 5  = (10 to 20)
 *
 * @param {!o3djs.particles.ParticleSpec} parameters The parameters for the
 *     emitters.
 * @param {!function(number, !o3djs.particles.ParticleSpec): void}
 *     opt_perParticleParamSetter A function that is called for each particle to
 *     allow it's parameters to be adjusted per particle. The number is the
 *     index of the particle being created, in other words, if numParticles is
 *     20 this value will be 0 to 19. The ParticleSpec is a spec for this
 *     particular particle. You can set any per particle value before returning.
 */
o3djs.particles.ParticleEmitter.prototype.setParameters = function(
    parameters,
    opt_perParticleParamSetter) {
  this.validateParameters(parameters);

  var numParticles = parameters.numParticles;

  this.allocateParticles_(numParticles);

  this.createParticles_(
      0,
      numParticles,
      parameters,
      opt_perParticleParamSetter);
};

/**
 * Creates a OneShot particle emitter instance.
 * You can use this for dust puffs, explosions, fireworks, etc...
 * @param {!o3d.Transform} opt_parent The parent for the oneshot.
 * @return {!o3djs.particles.OneShot} A OneShot object.
 */
o3djs.particles.ParticleEmitter.prototype.createOneShot = function(opt_parent) {
  return new o3djs.particles.OneShot(this, opt_parent);
};

/**
 * An object to manage a particle emitter instance as a one shot. Examples of
 * one shot effects are things like an explosion, some fireworks.
 * @constructor
 * @param {!o3djs.particles.ParticleEmitter} emitter The emitter to use for the
 *     one shot.
 * @param {!o3d.Transform} opt_parent The parent for this one shot.
 */
o3djs.particles.OneShot = function(emitter, opt_parent) {
  var pack = emitter.particleSystem.pack;
  this.emitter_ = emitter;

  /**
   * Transform for OneShot.
   * @type {!o3d.Transform}
   */
  this.transform = pack.createObject('Transform');
  this.transform.visible = false;
  this.transform.addShape(emitter.shape);
  this.timeOffsetParam_ =
      this.transform.createParam('timeOffset', 'ParamFloat');
  if (opt_parent) {
    this.setParent(opt_parent);
  }
};

/**
 * Sets the parent transform for this OneShot.
 * @param {!o3d.Transform} parent The parent for this one shot.
 */
o3djs.particles.OneShot.prototype.setParent = function(parent) {
  this.transform.parent = parent;
};

/**
 * Triggers the oneshot.
 *
 * Note: You must have set the parent either at creation, with setParent, or by
 * passing in a parent here.
 *
 * @param {!o3djs.math.Vector3} opt_position The position of the one shot
 *     relative to its parent.
 * @param {!o3d.Transform} opt_parent The parent for this one shot.
 */
o3djs.particles.OneShot.prototype.trigger = function(opt_position, opt_parent) {
  if (opt_parent) {
    this.setParent(opt_parent);
  }
  if (opt_position) {
    this.transform.identity();
    this.transform.translate(opt_position);
  }
  this.transform.visible = true;
  this.timeOffsetParam_.value = this.emitter_.clockParam.value;
};

/**
 * A type of emitter to use for particle effects that leave trails like exhaust.
 * @constructor
 * @extends {o3djs.particles.ParticleEmitter}
 * @param {!o3djs.particles.ParticleSystem} particleSystem The particle system
 *     to manage this emitter.
 * @param {!o3d.Transform} parent Transform to put emitter on.
 * @param {number} maxParticles Maximum number of particles to appear at once.
 * @param {!o3djs.particles.ParticleSpec} parameters The parameters used to
 *     generate particles.
 * @param {!o3d.Texture} opt_texture The texture to use for the particles.
 *     If you don't supply a texture a default is provided.
 * @param {!function(number, !o3djs.particles.ParticleSpec): void}
 *     opt_perParticleParamSetter A function that is called for each particle to
 *     allow it's parameters to be adjusted per particle. The number is the
 *     index of the particle being created, in other words, if numParticles is
 *     20 this value will be 0 to 19. The ParticleSpec is a spec for this
 *     particular particle. You can set any per particle value before returning.
 * @param {!o3d.ParamFloat} opt_clockParam A ParamFloat to be the clock for
 *     the emitter.
 */
o3djs.particles.Trail = function(
    particleSystem,
    parent,
    maxParticles,
    parameters,
    opt_texture,
    opt_perParticleParamSetter,
    opt_clockParam) {
  o3djs.particles.ParticleEmitter.call(
      this, particleSystem, opt_texture, opt_clockParam);

  var pack = particleSystem.pack;

  this.allocateParticles_(maxParticles);
  this.validateParameters(parameters);

  this.parameters = parameters;
  this.perParticleParamSetter = opt_perParticleParamSetter;
  this.birthIndex_ = 0;
  this.maxParticles_ = maxParticles;

  /**
   * Transform for OneShot.
   * @type {!o3d.Transform}
   */
  this.transform = pack.createObject('Transform');
  this.transform.addShape(this.shape);

  this.transform.parent = parent;
};

o3djs.base.inherit(o3djs.particles.Trail, o3djs.particles.ParticleEmitter);

/**
 * Births particles from this Trail.
 * @param {!o3djs.math.Vector3} position Position to birth particles at.
 */
o3djs.particles.Trail.prototype.birthParticles = function(position) {
  var numParticles = this.parameters.numParticles;
  this.parameters.startTime = this.clockParam.value;
  this.parameters.position = position;
  while (this.birthIndex_ + numParticles >= this.maxParticles_) {
    var numParticlesToEnd = this.maxParticles_ - this.birthIndex_;
    this.createParticles_(this.birthIndex_,
                          numParticlesToEnd,
                          this.parameters,
                          this.perParticleParamSetter);
    numParticles -= numParticlesToEnd;
    this.birthIndex_ = 0;
  }
  this.createParticles_(this.birthIndex_,
                        numParticles,
                        this.parameters,
                        this.perParticleParamSetter);
  this.birthIndex_ += numParticles;
};


/*
 * Copyright 2009, Google Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */


/**
 * @fileoverview This file contains a utility that helps adjust rendering
 * quality [or any other setting, really] based on rendering performance.
 *
 */

o3djs.provide('o3djs.performance');

/**
 * A Module to help with adjusting performance.
 * @namespace
 */
o3djs.performance = o3djs.performance || {};

/**
 * Creates a utility that monitors performance [in terms of FPS] and helps to
 * adjust the rendered scene accordingly.
 * @param {number} targetFPSMin the minimum acceptable frame rate; if we're
 * under this, try to decrease quality to improve performance.
 * @param {number} targetFPSMax if we're over this, try to increase quality.
 * @param {!function(): void} increaseQuality a function to increase
 *     quality because we're rendering at high-enough FPS to afford it.
 * @param {!function(): void} decreaseQuality a function to decrease
 *     quality to try to raise our rendering speed.
 * @param {!o3djs.performance.PerformanceMonitor.Options} opt_options Options.
 * @return {!o3djs.performance.PerformanceMonitor} The created
 *     PerformanceMonitor.
 */
o3djs.performance.createPerformanceMonitor = function(
    targetFPSMin, targetFPSMax, increaseQuality, decreaseQuality, opt_options) {
  return new o3djs.performance.PerformanceMonitor(targetFPSMin, targetFPSMax,
      increaseQuality, decreaseQuality, opt_options);
};

/**
 * A class that monitors performance [in terms of FPS] and helps to adjust the
 * rendered scene accordingly.
 * @constructor
 * @param {number} targetFPSMin the minimum acceptable frame rate; if we're
 * under this, try to decrease quality to improve performance.
 * @param {number} targetFPSMax if we're over this, try to increase quality.
 * @param {function(): void} increaseQuality a function to increase
 *     quality/lower FPS.
 * @param {function(): void} decreaseQuality a function to decrease
 *     quality/raise FPS.
 * @param {!o3djs.performance.PerformanceMonitor.Options} opt_options Options.
 */
o3djs.performance.PerformanceMonitor = function(
    targetFPSMin, targetFPSMax, increaseQuality, decreaseQuality, opt_options) {
  opt_options = opt_options || {};

  /**
   * A function to increase quality/lower FPS.
   * @type {function(): void}
   */
  this.increaseQuality = increaseQuality;

  /**
   * A function to decrease quality/raise FPS.
   * @type {function(): void}
   */
  this.decreaseQuality = decreaseQuality;

  /**
   * The mean time taken per frame so far, in seconds.  This is only valid once
   * we've collected at least minSamples samples.
   * @type {number}
   */
  this.meanFrameTime = 0;

  /**
   * The number of samples we've collected so far, when that number is less than
   * or equal to this.damping.  After that point, we no longer update
   * this.sampleCount, so it will clip at this.damping.
   *
   * @type {number}
   */
  this.sampleCount = 0;

  /**
   * The minimum number of samples to collect before trying to adjust quality.
   *
   * @type {number}
   */
  this.minSamples = opt_options.opt_minSamples || 60;

  /**
   * A number that controls the rate at which the effects of any given sample
   * fade away.  Higher is slower, but also means that each individual sample
   * counts for less at its most-influential.  Damping defaults to 120; anywhere
   * between 60 and 600 are probably reasonable values, depending on your needs,
   * but the number must be no less than minSamples.
   *
   * @type {number}
   */
  this.damping = opt_options.opt_damping || 120;

  /**
   * The minimum number of samples to take in between adjustments, to cut down
   * on overshoot.  It defaults to 2 * minSamples.
   *
   * @type {number}
   */
  this.delayCycles = opt_options.opt_delayCycles || 2 * this.minSamples;

  this.targetFrameTimeMax_ = 1 / targetFPSMin;
  this.targetFrameTimeMin_ = 1 / targetFPSMax;
  this.scaleInput_ = 1 / this.minSamples;
  this.scaleMean_ = 1;
  this.delayCyclesLeft_ = 0;
  if (this.damping < this.minSamples) {
    throw Error('Damping must be at least minSamples.');
  }
};

/**
 * Options for the PerformanceMonitor.
 *
 * opt_minSamples is the minimum number of samples to take before making any
 * performance adjustments.
 * opt_damping is a number that controls the rate at which the effects of any
 * given sample fade away.  Higher is slower, but also means that each
 * individual sample counts for less at its most-influential.  Damping
 * defaults to 120; anywhere between 60 and 600 are probably reasonable values,
 * depending on your needs, but the number must be no less than minSamples.
 * opt_delayCycles is the minimum number of samples to take in between
 * adjustments, to cut down on overshoot.  It defaults to 2 * opt_minSamples.
 *
 * @type {{
 *   opt_minSamples: number,
 *   opt_damping: number,
 *   opt_delayCycles: number
 * }}
 */
o3djs.performance.PerformanceMonitor.Options = goog.typedef;

/**
 * Call this once per frame with the elapsed time since the last call, and it
 * will attempt to adjust your rendering quality as needed.
 *
 * @param {number} seconds the elapsed time since the last frame was rendered,
 * in seconds.
 */
o3djs.performance.PerformanceMonitor.prototype.onRender = function(seconds) {
  var test = true;
  if (this.sampleCount < this.damping) {
    if (this.sampleCount >= this.minSamples) {
      this.scaleInput_ = 1 / (this.sampleCount + 1);
      this.scaleMean_ = this.sampleCount * this.scaleInput_;
    } else {
      test = false;
    }
    this.sampleCount += 1;
  }
  this.meanFrameTime = this.meanFrameTime * this.scaleMean_ +
      seconds * this.scaleInput_;
  if (this.delayCyclesLeft_ > 0) {
    this.delayCyclesLeft_ -= 1;
  } else if (test) {
    if (this.meanFrameTime < this.targetFrameTimeMin_) {
      this.increaseQuality();
      this.delayCyclesLeft_ = this.delayCycles;
    } else if (this.meanFrameTime > this.targetFrameTimeMax_) {
      this.decreaseQuality();
      this.delayCyclesLeft_ = this.delayCycles;
    }
  }
};


/*
 * Copyright 2009, Google Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */


/**
 * @fileoverview This file contains functions for implementing picking.
 * It puts them in the "picking" module on the o3djs object.
 *
 *
 * This example shows one way to implement picking. Because O3D is shader
 * agnostic we can't handle picking automatically since we have no way of
 * knowing what the developer is going to do with their shaders. On the other
 * hand, we can provide various functions that make it possible to do your own
 * picking. Only you know which objects are pickable and which are not. For
 * example if you are making an RTS game, only you would know that units are
 * pickable but ground and explosions are not and that neither is your HUD.
 * Similarly, only you would know how your shaders manipulate the vertices
 * passed to them.
 *
 * It's possible that someone, maybe us, will create an engine to use o3d
 * that given a bunch of restrictions and flags on the data it accepts can
 * do picking in a more automatic way but that is not the goal of the o3d
 * api. Its goal is to provide a LOW-LEVEL shader agnostic API.
 */

o3djs.provide('o3djs.picking');

o3djs.require('o3djs.math');
o3djs.require('o3djs.dump');

/**
 * A Module for picking.
 * @namespace
 */
o3djs.picking = o3djs.picking || {};

/**
 * A ray.
 * @type {{near: !o3djs.math.Vector3, far: !o3djs.math.Vector3}}
 */
o3djs.picking.Ray = goog.typedef;

/**
 * Creates a new PickInfo.
 * @param {!o3d.Element} element The Element that was picked.
 * @param {!o3djs.picking.ShapeInfo} shapeInfo The ShapeInfo that was picked.
 * @param {!o3d.RayIntersectionInfo} rayIntersectionInfo Information about the
 *     pick.
 * @param {!o3djs.math.Vector3} worldIntersectionPosition world position of
 *     intersection.
 * @return {!o3djs.picking.PickInfo} The new PickInfo.
 */
o3djs.picking.createPickInfo = function(element,
                                        shapeInfo,
                                        rayIntersectionInfo,
                                        worldIntersectionPosition) {
  return new o3djs.picking.PickInfo(element,
                                    shapeInfo,
                                    rayIntersectionInfo,
                                    worldIntersectionPosition);
};

/**
 * Convert a pixel position relative to the top left corner of the client area
 * into the corresponding ray through the frustum in world space.
 * @param {number} clientXPosition x position relative to client area.
 * @param {number} clientYPosition y position relative to client area.
 * @param {!o3djs.math.Matrix4} view View matrix to transform with.
 * @param {!o3djs.math.Matrix4} projection Projection matrix to transform
 *     with.
 * @param {number} clientWidth width of client area.
 * @param {number} clientHeight height of client area.
 * @return {!o3djs.picking.Ray} ray in world space.
 */
o3djs.picking.clientPositionToWorldRayEx = function(clientXPosition,
                                                    clientYPosition,
                                                    view,
                                                    projection,
                                                    clientWidth,
                                                    clientHeight) {
  // compute the world position of a ray going through the view frustum
  var inverseViewProjectionMatrix = o3djs.math.inverse(
      o3djs.math.matrix4.composition(projection, view));
  // normScreenX, normScreenY are in frustum coordinates.
  var normScreenX = clientXPosition / (clientWidth * 0.5) - 1;
  var normScreenY = -(clientYPosition / (clientHeight * 0.5) - 1);

  // Apply inverse view-projection matrix to get the ray in world coordinates.
  return {
      near: o3djs.math.matrix4.transformPoint(
          inverseViewProjectionMatrix, [normScreenX, normScreenY, 0]),
      far: o3djs.math.matrix4.transformPoint(
          inverseViewProjectionMatrix, [normScreenX, normScreenY, 1])
  };
};

/**
 * Convert a pixel position relative to the top left corner of the client area
 * into the corresponding ray through the frustum in world space.
 * @param {number} clientXPosition x position relative to client area.
 * @param {number} clientYPosition y position relative to client area.
 * @param {!o3d.DrawContext} drawContext DrawContext to get view and
 *     projection matrices from.
 * @param {number} clientWidth width of client area.
 * @param {number} clientHeight height of client area.
 * @return {!o3djs.picking.Ray} ray in world space.
 */
o3djs.picking.clientPositionToWorldRay = function(clientXPosition,
                                                  clientYPosition,
                                                  drawContext,
                                                  clientWidth,
                                                  clientHeight) {
  return o3djs.picking.clientPositionToWorldRayEx(
      clientXPosition,
      clientYPosition,
      drawContext.view,
      drawContext.projection,
      clientWidth,
      clientHeight);
};

/**
 * A local dump function so we can easily comment it out.
 * @param {string} msg Message to dump.
 */
o3djs.picking.dprint = function(msg) {
  //o3djs.dump.dump(msg);
};

/**
 * A local dump function so we can easily comment it out.
 * @param {string} label Label to print before value.
 * @param {!o3djs.math.Vector3} float3 Value to print.
 * @param {string} prefix optional prefix for indenting.
 */
o3djs.picking.dprintPoint3 = function(label, float3, prefix) {
  //o3djs.dump.dumpPoint3(label, float3, prefix);
};

/**
 * A local dump function so we can easily comment it out.
 * @param {string} label Label to put in front of dump.
 * @param {!o3d.BoundingBox} boundingBox BoundingBox to dump.
 * @param {string} opt_prefix optional prefix for indenting.
 */
o3djs.picking.dprintBoundingBox = function(label,
                                           boundingBox,
                                           opt_prefix) {
  //o3djs.dump.dumpBoundingBox(label, boundingBox, opt_prefix);
};

/**
 * A local dump function so we can easily comment it out.
 * @param {string} label Label to print before value.
 * @param {!o3d.RayIntersectionInfo} rayIntersectionInfo Value to print.
 */
o3djs.picking.dumpRayIntersectionInfo = function(label,
                                                 rayIntersectionInfo) {
  o3djs.picking.dprint(
      label + ' : valid = ' +
      rayIntersectionInfo.valid + ' : intersected = ' +
      rayIntersectionInfo.intersected);
  if (rayIntersectionInfo.intersected) {
    o3djs.picking.dprint(
        ' : pos: ' +
        rayIntersectionInfo.position[0] + ', ' +
        rayIntersectionInfo.position[1] + ', ' +
        rayIntersectionInfo.position[2] + ', ');
  }
  o3djs.picking.dprint('\n');
};

/**
 * Creates a new PickInfo. Used to return picking information.
 * @constructor
 * @param {!o3d.Element} element The Element that was picked.
 * @param {!o3djs.picking.ShapeInfo} shapeInfo The ShapeInfo that was picked.
 * @param {!o3d.RayIntersectionInfo} rayIntersectionInfo Information about the
 *     pick.
 * @param {!o3djs.math.Vector3} worldIntersectionPosition world position of
 *     intersection.
 */
o3djs.picking.PickInfo = function(element,
                                  shapeInfo,
                                  rayIntersectionInfo,
                                  worldIntersectionPosition) {
  /**
   * The Element that was picked (Primitive).
   * @type {!o3d.Element}
   */
  this.element = element;

  /**
   * The ShapeInfo that was picked.
   * @type {!o3djs.picking.ShapeInfo}
   */
  this.shapeInfo = shapeInfo;

  /**
   * Information about the pick.
   * @type {!o3d.RayIntersectionInfo}
   */
  this.rayIntersectionInfo = rayIntersectionInfo;

  /**
   * The worldIntersectionPosition world position of intersection.
   * @type {!o3djs.math.Vector3}
   */
  this.worldIntersectionPosition = worldIntersectionPosition
};

/**
 * Creates a new ShapeInfo. Used to store information about Shapes. Note, even
 * though Shapes can be instanced, ShapeInfos can not so if a Shape is instanced
 * there will be more than one ShapeInfo for it.
 * @constructor
 * @param {!o3d.Shape} shape Shape to keep info about.
 * @param {!o3djs.picking.TransformInfo} parent Parent transform of the shape.
 * @param {!o3djs.picking.PickManager} pickManager The PickManager this
 *     ShapeInfo belongs to.
 */
o3djs.picking.ShapeInfo = function(shape, parent, pickManager) {
  /**
   * The Shape for this ShapeInfo
   * @type {!o3d.Shape}
   */
  this.shape = shape;

  /**
   * The parent TransformInfo of this Shape.
   * @type {!o3djs.picking.TransformInfo}
   */
  this.parent = parent;

  /**
   * The bounding box for this Shape
   * @type {o3d.BoundingBox}
   */
  this.boundingBox = null;

  /**
   * The PickManager this ShapeInfo belongs to.
   * @type {!o3djs.picking.PickManager}
   */
  this.pickManager = pickManager;

  this.update();
};

/**
 * Returns whether or not this ShapeInfo is pickable.
 * @return {boolean} Whether or not this ShapeInfo is pickable.
 */
o3djs.picking.ShapeInfo.prototype.isPickable = function() {
  return true;
}

/**
 * Gets the BoundingBox of the Shape in this ShapeInfo.
 * @return {o3d.BoundingBox} The Shape's BoundingBox.
 */
o3djs.picking.ShapeInfo.prototype.getBoundingBox = function() {
  return this.boundingBox;
};

/**
 * Updates the BoundingBox of the Shape in this ShapeInfo.
 */
o3djs.picking.ShapeInfo.prototype.update = function() {
  var elements = this.shape.elements;
  if (elements.length > 0) {
    this.boundingBox = elements[0].getBoundingBox(0);
    for (var ee = 1; ee < elements.length; ee++) {
      this.boundingBox = this.boundingBox.add(elements[ee].getBoundingBox(0));
    }
  }
};

/**
 * Attempts to "pick" this Shape by checking for the intersection of a ray
 * in world space to the triangles this shape uses.
 * @param {!o3djs.picking.Ray} worldRay A ray in world space to pick against.
 * @return {o3djs.picking.PickInfo} Information about the picking.
 *     null if the ray did not intersect any triangles.
 */
o3djs.picking.ShapeInfo.prototype.pick = function(worldRay) {
  if (this.isPickable()) {
    var worldMatrix = this.parent.transform.getUpdatedWorldMatrix()
    var inverseWorldMatrix = o3djs.math.inverse(worldMatrix);
    var relativeNear = o3djs.math.matrix4.transformPoint(
        inverseWorldMatrix, worldRay.near);
    var relativeFar = o3djs.math.matrix4.transformPoint(
        inverseWorldMatrix, worldRay.far);
    var rayIntersectionInfo =
        this.boundingBox.intersectRay(relativeNear,
                                      relativeFar);

    o3djs.picking.dumpRayIntersectionInfo('SHAPE(box): ' + this.shape.name,
                                          rayIntersectionInfo);

    if (rayIntersectionInfo.intersected) {
      var elements = this.shape.elements;
      for (var e = 0; e < elements.length; e++) {
        var element = elements[e];
        rayIntersectionInfo = element.intersectRay(
            0,
            o3djs.base.o3d.State.CULL_CCW,
            relativeNear,
            relativeFar);
        o3djs.picking.dumpRayIntersectionInfo(
            'SHAPE(tris): ' + this.shape.name + ' : element ' + element.name,
            rayIntersectionInfo);

        // TODO: get closest element not just first element.
        if (rayIntersectionInfo.intersected) {
          var worldIntersectionPosition = o3djs.math.matrix4.transformPoint(
              worldMatrix, rayIntersectionInfo.position);
          return o3djs.picking.createPickInfo(element,
                                              this,
                                              rayIntersectionInfo,
                                              worldIntersectionPosition);
        }
      }
    }
  }
  return null;
};

/**
 * Dumps info about a ShapeInfo
 * @param {string} opt_prefix optional prefix for indenting.
 */
o3djs.picking.ShapeInfo.prototype.dump = function(opt_prefix) {
  var prefix = opt_prefix || '';
  o3djs.picking.dprint(prefix + 'SHAPE: ' + this.shape.name + '\n');
  o3djs.picking.dprintPoint3('bb min',
                             this.boundingBox.minExtent,
                             prefix + '    ');
  o3djs.picking.dprintPoint3('bb max',
                             this.boundingBox.maxExtent,
                             prefix + '    ');
};

/**
 * Creates a new TransformInfo. Used to store information about Transforms.
 * @constructor
 * @param {!o3d.Transform} transform Transform to keep info about.
 * @param {o3djs.picking.TransformInfo} parent Parent transformInfo of the
 *     transform. Can be null.
 * @param {!o3djs.picking.PickManager} pickManager The PickManager this
 *     ShapeInfo belongs to.
 */
o3djs.picking.TransformInfo = function(transform, parent, pickManager) {
  /**
   * TransformInfos for children by client id.
   * @type {!Object.<number, !o3djs.picking.TransformInfo>}
   */
  this.childTransformInfos = {};

  /**
   * ShapeInfos for shape of this transform by client id.
   * @type {!Object.<number, !o3djs.picking.ShapeInfo>}
   */
  this.shapeInfos = {};

  /**
   * The transform of this transform info.
   * @type {!o3d.Transform}
   */
  this.transform = transform;

  /**
   * The parent of this transform info.
   * @type {o3djs.picking.TransformInfo}
   */
  this.parent = parent;

  /**
   * The bounding box of this transform info.
   * @type {o3d.BoundingBox}
   */
  this.boundingBox = null;

  /**
   * The PickManager this TransformInfo belongs to.
   * @type {!o3djs.picking.PickManager}
   */
  this.pickManager = pickManager;

  /**
   * Whether or not this object is pickable when invisible.
   * This is useful for collision geometry that is not visible.
   * Of course it might argubly be better to store collision geometry
   * in a separate graph from visible geometry but sometimes it's useful
   * to have them in the same graph.
   * @type {boolean}
   */
  this.pickableEvenIfInvisible = false;
};

/**
 * Gets the BoundingBox of the Transform in this TransformInfo.
 * @return {o3d.BoundingBox} The Transform's BoundingBox.
 */
o3djs.picking.TransformInfo.prototype.getBoundingBox = function() {
  return this.boundingBox;
};

/**
 * Returns whether or not this TransformInfo is pickable.
 *
 * If this TransformInfo is not pickable then all child shapes and
 * TransformInfos will be skipped during the picking process.
 *
 * @return {boolean} Whether or not this TransformInfo is pickable.
 */
o3djs.picking.TransformInfo.prototype.isPickable = function() {
  return this.transform.visible || this.pickableEvenIfInvisible;
};

/**
 * Updates the shape and child lists for this TransformInfo and recomputes its
 * BoundingBox.
 */
o3djs.picking.TransformInfo.prototype.update = function() {
  var newChildTransformInfos = {};
  var newShapeInfos = {};
  // We need to add new children and remove old ones so we walk the children
  // and for each one we find, if it already has a TransformInfo or ShapeInfo we
  // add it to our new lists, if not we create one and add it to our new lists.
  var children = this.transform.children;
  for (var c = 0; c < children.length; c++) {
    var child = children[c];
    var transformInfo = this.childTransformInfos[child.clientId];
    if (!transformInfo) {
      transformInfo = this.pickManager.createTransformInfo(child, this);
    } else {
      // clear the boundingBox so we'll regenerate it.
      transformInfo.boundingBox = null;
    }
    transformInfo.update();
    newChildTransformInfos[child.clientId] = transformInfo;
  }
  var shapes = this.transform.shapes;
  for (var s = 0; s < shapes.length; s++) {
    var shape = shapes[s];
    var shapeInfo = this.shapeInfos[shape.clientId];
    if (!shapeInfo) {
      shapeInfo = this.pickManager.createShapeInfo(shape, this);
    } else {
      // unless the vertices or elements change there is no need to
      // recompute this.
      // shapeInfo.update();
    }
    newShapeInfos[shape.clientId] = shapeInfo;
  }

  // o3djs.picking.dprint(
  //   'num Children: ' + children.length + '\n');
  // o3djs.picking.dprint(
  //   'num Shapes: ' + shapes.length + '\n');

  // Now our new lists have the correct children so replace the old lists.
  // and remove any old children from the PickManager.
  for (var skey in this.childTransformInfos) {
    var key = /** @type {number} */ (skey);
    if (!newChildTransformInfos[key]) {
      this.pickManager.removeTransformInfo(this.childTransformInfos[key]);
    }
  }

  this.childTransformInfos = newChildTransformInfos;
  this.shapeInfos = newShapeInfos;

  var boundingBox = null;
  for (var key in newShapeInfos) {
    var shapeInfo = newShapeInfos[key];
    if (shapeInfo.isPickable()) {
      var box = shapeInfo.getBoundingBox().mul(this.transform.localMatrix);
      if (!boundingBox) {
        boundingBox = box;
      } else if (box) {
        boundingBox = boundingBox.add(box);
      }
    }
  }

  for (var key in newChildTransformInfos) {
    var transformInfo = newChildTransformInfos[key];
    if (transformInfo.isPickable()) {
      // Note: If there is no shape at the leaf on this branch
      // there will be no bounding box.
      var box = transformInfo.getBoundingBox();
      if (box) {
        if (!boundingBox) {
          boundingBox = box.mul(this.transform.localMatrix);
        } else {
          boundingBox = boundingBox.add(box.mul(this.transform.localMatrix));
        }
      }
    }
  }

  this.boundingBox = boundingBox;
};

/**
 * Attempts to "pick" this TransformInfo by checking for the intersection of a
 * ray in world space to the boundingbox of the TransformInfo. If intesection
 * is succesful recursively calls its children and shapes to try to find
 * a single Shape that is hit by the ray.
 * @param {!o3djs.picking.Ray} worldRay A ray in world space to pick against.
 * @return {o3djs.picking.PickInfo} Information about the picking.
 *     null if the ray did not intersect any triangles.
 */
o3djs.picking.TransformInfo.prototype.pick = function(worldRay) {
  if (this.isPickable() && this.boundingBox) {
    var inverseWorldMatrix = o3djs.math.matrix4.identity();
    if (this.parent) {
      inverseWorldMatrix = o3djs.math.inverse(
          this.parent.transform.getUpdatedWorldMatrix());
    }
    var relativeNear =
        o3djs.math.matrix4.transformPoint(inverseWorldMatrix, worldRay.near);
    var relativeFar =
        o3djs.math.matrix4.transformPoint(inverseWorldMatrix, worldRay.far);
    var rayIntersectionInfo =
        this.boundingBox.intersectRay(relativeNear, relativeFar);
    o3djs.picking.dumpRayIntersectionInfo(
        'TRANSFORM(box): ' + this.transform.name, rayIntersectionInfo);

    if (rayIntersectionInfo.intersected) {
      var closestPickInfo = null;
      var minDistance = -1;
      for (var skey in this.childTransformInfos) {
        var key = /** @type {number} */ (skey);
        var transformInfo = this.childTransformInfos[key];
        var pickInfo = transformInfo.pick(worldRay);
        if (pickInfo) {
          // is this closer than the last one?
          var distance = o3djs.math.lengthSquared(
              o3djs.math.subVector(worldRay.near,
                                   pickInfo.worldIntersectionPosition));
          if (!closestPickInfo || distance < minDistance) {
            minDistance = distance;
            closestPickInfo = pickInfo;
          }
        }
      }

      for (var skey in this.shapeInfos) {
        var key = /** @type {number} */ (skey);
        var shapeInfo = this.shapeInfos[key];
        var pickInfo = shapeInfo.pick(worldRay);
        if (pickInfo) {
          // is this closer than the last one?
          var distance = o3djs.math.lengthSquared(
              o3djs.math.subVector(worldRay.near,
                                   pickInfo.worldIntersectionPosition));
          if (!closestPickInfo || distance < minDistance) {
            minDistance = distance;
            closestPickInfo = pickInfo;
          }
        }
      }
      return closestPickInfo;
    }
  }
  return null;
};

/**
 * Dumps info about a TransformInfo
 * @param {string} opt_prefix optional prefix for indenting.
 */
o3djs.picking.TransformInfo.prototype.dump = function(opt_prefix) {
  var prefix = opt_prefix || '';

  o3djs.picking.dprint(prefix + 'TRANSFORM: ' + this.transform.name +
                       '\n');

  if (this.boundingBox) {
    o3djs.picking.dprintPoint3('bb min',
                               this.boundingBox.minExtent,
                               prefix + '    ');
    o3djs.picking.dprintPoint3('bb max',
                               this.boundingBox.maxExtent,
                               prefix + '    ');
  } else {
    o3djs.picking.dprint(prefix + '    bb *NA*\n');
  }

  o3djs.picking.dprint(prefix + '--Shapes--\n');
  for (var skey in this.shapeInfos) {
    var key = /** @type {number} */ (skey);
    var shapeInfo = this.shapeInfos[key];
    shapeInfo.dump(prefix + '    ');
  }

  o3djs.picking.dprint(prefix + '--Children--\n');
  for (var skey in this.childTransformInfos) {
    var key = /** @type {number} */ (skey);
    var transformInfo = this.childTransformInfos[key];
    transformInfo.dump(prefix + '    ');
  }
};

/**
 * A PickManager manages picking of primitives from a transform graph.
 * @constructor
 * @param {!o3d.Transform} rootTransform The root of the transform graph this
 *     PickManager should manage.
 */
o3djs.picking.PickManager = function(rootTransform) {
  /**
   * TransformInfos for transforms of this PickManager by client id.
   * @type {!Object.<number, !o3djs.picking.TransformInfo>}
   */
  this.transformInfosByClientId = {};

  /**
   * The root transform for this PickManager.
   * @type {!o3djs.picking.TransformInfo}
   */
  this.rootTransformInfo = this.createTransformInfo(rootTransform, null);
};

/**
 * Creates a new ShapeInfo.
 * @param {!o3d.Shape} shape Shape to keep info about.
 * @param {!o3djs.picking.TransformInfo} parent Parent transform of the shape.
 * @return {!o3djs.picking.ShapeInfo} The new ShapeInfo.
 */
o3djs.picking.PickManager.prototype.createShapeInfo = function(shape, parent) {
  return new o3djs.picking.ShapeInfo(shape, parent, this);
};

/**
 * Creates a new TransformInfo.
 * @param {!o3d.Transform} transform Transform to keep info about.
 * @param {o3djs.picking.TransformInfo} parent Parent transform of the
 *     transform. Can be null.
 * @return {!o3djs.picking.TransformInfo} The new TransformInfo.
 */
o3djs.picking.PickManager.prototype.createTransformInfo =
    function(transform, parent) {
  var info = new o3djs.picking.TransformInfo(transform, parent, this);
  this.addTransformInfo(info);
  return info;
};

/**
 * Adds a transform info to this PickManager.
 * @param {!o3djs.picking.TransformInfo} transformInfo The TransformInfo to add.
 */
o3djs.picking.PickManager.prototype.addTransformInfo = function(transformInfo) {
  this.transformInfosByClientId[transformInfo.transform.clientId] =
      transformInfo;
};

/**
 * Removes a transform info from this PickManager.
 * @param {!o3djs.picking.TransformInfo} transformInfo The TransformInfo to
 *     remove.
 */
o3djs.picking.PickManager.prototype.removeTransformInfo =
    function(transformInfo) {
  delete this.transformInfosByClientId[transformInfo.transform.clientId];
};

/**
 * Gets a transform info from this PickManager by transform.
 * @param {!o3d.Transform} transform The Transform to get a TransformInfo for.
 * @return {o3djs.picking.TransformInfo} The TransformInfo for the transform or
 *      null if there isn't one.
 */
o3djs.picking.PickManager.prototype.getTransformInfo = function(transform) {
  return this.transformInfosByClientId[transform.clientId];
};

/**
 * Updates the picking info to match the transform graph in its current state.
 */
o3djs.picking.PickManager.prototype.update = function() {
  this.rootTransformInfo.update();
};

/**
 * Dumps info about a PickManager
 */
o3djs.picking.PickManager.prototype.dump = function() {
  this.rootTransformInfo.dump();
};

/**
 * Attempts to "pick" objects managed by this PickManager.
 * @param {!o3djs.picking.Ray} worldRay A ray in world space to pick against.
 * @return {o3djs.picking.PickInfo} Information about the picking.
 *     null if the ray did not intersect any triangles.
 */
o3djs.picking.PickManager.prototype.pick = function(worldRay) {
  return this.rootTransformInfo.pick(worldRay);
};

/**
 * Creates a PickManager.
 * @param {!o3d.Transform} rootTransform The root of the transform graph this
 *     PickManager should manage.
 * @return {!o3djs.picking.PickManager} The created PickManager.
 */
o3djs.picking.createPickManager = function(rootTransform) {
  return new o3djs.picking.PickManager(rootTransform);
};

/*
 * Copyright 2009, Google Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * @fileoverview This file contains various functions for quaternion arithmetic
 * and converting between rotation matrices and quaternions.  It adds them to
 * the "quaternions" module on the o3djs object.  Javascript arrays with
 * four entries are used to represent quaternions, and functions are provided
 * for doing operations on those.
 *
 * Operations are done assuming quaternions are of the form:
 * q[0] + q[1]i + q[2]j + q[3]k and using the hamiltonian rules for
 * multiplication as described on Brougham Bridge:
 * i^2 = j^2 = k^2 = ijk = -1.
 *
 */

o3djs.provide('o3djs.quaternions');

/**
 * A Module for quaternion math.
 * @namespace
 */
o3djs.quaternions = o3djs.quaternions || {};

/**
 * A Quaternion.
 * @type {!Array.<number>}
 */
o3djs.quaternions.Quaternion = goog.typedef;

/**
 * Quickly determines if the object a is a scalar or a quaternion;
 * assumes that the argument is either a number (scalar), or an array of
 * numbers.
 * @param {(number|!o3djs.quaternions.Quaternion)} a A number or array the type
 *     of which is in question.
 * @return {string} Either the string 'Scalar' or 'Quaternion'.
 */
o3djs.quaternions.mathType = function(a) {
  if (typeof(a) === 'number')
    return 'Scalar';
  return 'Quaternion';
};

/**
 * Copies a quaternion.
 * @param {!o3djs.quaternions.Quaternion} q The quaternion.
 * @return {!o3djs.quaternions.Quaternion} A new quaternion identical to q.
 */
o3djs.quaternions.copy = function(q) {
  return q.slice();
};

/**
 * Negates a quaternion.
 * @param {!o3djs.quaternions.Quaternion} q The quaternion.
 * @return {!o3djs.quaternions.Quaternion} -q.
 */
o3djs.quaternions.negative = function(q) {
  return [-q[0], -q[1], -q[2], -q[3]];
};

/**
 * Adds two Quaternions.
 * @param {!o3djs.quaternions.Quaternion} a Operand Quaternion.
 * @param {!o3djs.quaternions.Quaternion} b Operand Quaternion.
 * @return {!o3djs.quaternions.Quaternion} The sum of a and b.
 */
o3djs.quaternions.addQuaternionQuaternion = function(a, b) {
  return [a[0] + b[0],
          a[1] + b[1],
          a[2] + b[2],
          a[3] + b[3]];
};

/**
 * Adds a quaternion to a scalar.
 * @param {!o3djs.quaternions.Quaternion} a Operand Quaternion.
 * @param {number} b Operand Scalar.
 * @return {!o3djs.quaternions.Quaternion} The sum of a and b.
 */
o3djs.quaternions.addQuaternionScalar = function(a, b) {
  return a.slice(0, 3).concat(a[3] + b);
};

/**
 * Adds a scalar to a quaternion.
 * @param {number} a Operand scalar.
 * @param {!o3djs.quaternions.Quaternion} b Operand quaternion.
 * @return {!o3djs.quaternions.Quaternion} The sum of a and b.
 */
o3djs.quaternions.addScalarQuaternion = function(a, b) {
  return b.slice(0, 3).concat(a + b[3]);
};

/**
 * Subtracts two quaternions.
 * @param {!o3djs.quaternions.Quaternion} a Operand quaternion.
 * @param {!o3djs.quaternions.Quaternion} b Operand quaternion.
 * @return {!o3djs.quaternions.Quaternion} The difference a - b.
 */
o3djs.quaternions.subQuaternionQuaternion = function(a, b) {
  return [a[0] - b[0],
          a[1] - b[1],
          a[2] - b[2],
          a[3] - b[3]];
};

/**
 * Subtracts a scalar from a quaternion.
 * @param {!o3djs.quaternions.Quaternion} a Operand quaternion.
 * @param {number} b Operand scalar.
 * @return {!o3djs.quaternions.Quaternion} The difference a - b.
 */
o3djs.quaternions.subQuaternionScalar = function(a, b) {
  return a.slice(0, 3).concat(a[3] - b);
};

/**
 * Subtracts a quaternion from a scalar.
 * @param {number} a Operand scalar.
 * @param {!o3djs.quaternions.Quaternion} b Operand quaternion.
 * @return {!o3djs.quaternions.Quaternion} The difference a - b.
 */
o3djs.quaternions.subScalarQuaternion = function(a, b) {
  return [-b[0], -b[1], -b[2], a - b[3]];
};

/**
 * Multiplies a scalar by a quaternion.
 * @param {number} k The scalar.
 * @param {!o3djs.quaternions.Quaternion} q The quaternion.
 * @return {!o3djs.quaternions.Quaternion} The product of k and q.
 */
o3djs.quaternions.mulScalarQuaternion = function(k, q) {
  return [k * q[0], k * q[1], k * q[2], k * q[3]];
};

/**
 * Multiplies a quaternion by a scalar.
 * @param {!o3djs.quaternions.Quaternion} q The Quaternion.
 * @param {number} k The scalar.
 * @return {!o3djs.quaternions.Quaternion} The product of k and v.
 */
o3djs.quaternions.mulQuaternionScalar = function(q, k) {
  return [k * q[0], k * q[1], k * q[2], k * q[3]];
};

/**
 * Multiplies two quaternions.
 * @param {!o3djs.quaternions.Quaternion} a Operand quaternion.
 * @param {!o3djs.quaternions.Quaternion} b Operand quaternion.
 * @return {!o3djs.quaternions.Quaternion} The quaternion product a * b.
 */
o3djs.quaternions.mulQuaternionQuaternion = function(a, b) {
  var aX = a[0];
  var aY = a[1];
  var aZ = a[2];
  var aW = a[3];
  var bX = b[0];
  var bY = b[1];
  var bZ = b[2];
  var bW = b[3];

  return [
      aW * bX + aX * bW + aY * bZ - aZ * bY,
      aW * bY + aY * bW + aZ * bX - aX * bZ,
      aW * bZ + aZ * bW + aX * bY - aY * bX,
      aW * bW - aX * bX - aY * bY - aZ * bZ];
};

/**
 * Divides two quaternions; assumes the convention that a/b = a*(1/b).
 * @param {!o3djs.quaternions.Quaternion} a Operand quaternion.
 * @param {!o3djs.quaternions.Quaternion} b Operand quaternion.
 * @return {!o3djs.quaternions.Quaternion} The quaternion quotient a / b.
 */
o3djs.quaternions.divQuaternionQuaternion = function(a, b) {
  var aX = a[0];
  var aY = a[1];
  var aZ = a[2];
  var aW = a[3];
  var bX = b[0];
  var bY = b[1];
  var bZ = b[2];
  var bW = b[3];

  var d = 1 / (bW * bW + bX * bX + bY * bY + bZ * bZ);
  return [
      (aX * bW - aW * bX - aY * bZ + aZ * bY) * d,
      (aX * bZ - aW * bY + aY * bW - aZ * bX) * d,
      (aY * bX + aZ * bW - aW * bZ - aX * bY) * d,
      (aW * bW + aX * bX + aY * bY + aZ * bZ) * d];
};

/**
 * Divides a Quaternion by a scalar.
 * @param {!o3djs.quaternions.Quaternion} q The quaternion.
 * @param {number} k The scalar.
 * @return {!o3djs.quaternions.Quaternion} q The quaternion q divided by k.
 */
o3djs.quaternions.divQuaternionScalar = function(q, k) {
  return [q[0] / k, q[1] / k, q[2] / k, q[3] / k];
};

/**
 * Divides a scalar by a quaternion.
 * @param {number} a Operand scalar.
 * @param {!o3djs.quaternions.Quaternion} b Operand quaternion.
 * @return {!o3djs.quaternions.Quaternion} The quaternion product.
 */
o3djs.quaternions.divScalarQuaternion = function(a, b) {
  var b0 = b[0];
  var b1 = b[1];
  var b2 = b[2];
  var b3 = b[3];

  var d = 1 / (b0 * b0 + b1 * b1 + b2 * b2 + b3 * b3);
  return [-a * b0 * d, -a * b1 * d, -a * b2 * d, a * b3 * d];
};

/**
 * Computes the multiplicative inverse of a quaternion.
 * @param {!o3djs.quaternions.Quaternion} q The quaternion.
 * @return {!o3djs.quaternions.Quaternion} The multiplicative inverse of q.
 */
o3djs.quaternions.inverse = function(q) {
  var q0 = q[0];
  var q1 = q[1];
  var q2 = q[2];
  var q3 = q[3];

  var d = 1 / (q0 * q0 + q1 * q1 + q2 * q2 + q3 * q3);
  return [-q0 * d, -q1 * d, -q2 * d, q3 * d];
};

/**
 * Multiplies two objects which are either scalars or quaternions.
 * @param {(!o3djs.quaternions.Quaternion|number)} a Operand.
 * @param {(!o3djs.quaternions.Quaternion|number)} b Operand.
 * @return {(!o3djs.quaternions.Quaternion|number)} The product of a and b.
 */
o3djs.quaternions.mul = function(a, b) {
  return o3djs.quaternions['mul' + o3djs.quaternions.mathType(a) +
      o3djs.quaternions.mathType(b)](a, b);
};

/**
 * Divides two objects which are either scalars or quaternions.
 * @param {(!o3djs.quaternions.Quaternion|number)} a Operand.
 * @param {(!o3djs.quaternions.Quaternion|number)} b Operand.
 * @return {(!o3djs.quaternions.Quaternion|number)} The quotient of a and b.
 */
o3djs.quaternions.div = function(a, b) {
  return o3djs.quaternions['div' + o3djs.quaternions.mathType(a) +
      o3djs.quaternions.mathType(b)](a, b);
};

/**
 * Adds two objects which are either scalars or quaternions.
 * @param {(!o3djs.quaternions.Quaternion|number)} a Operand.
 * @param {(!o3djs.quaternions.Quaternion|number)} b Operand.
 * @return {(!o3djs.quaternions.Quaternion|number)} The sum of a and b.
 */
o3djs.quaternions.add = function(a, b) {
  return o3djs.quaternions['add' + o3djs.quaternions.mathType(a) +
      o3djs.quaternions.mathType(b)](a, b);
};

/**
 * Subtracts two objects which are either scalars or quaternions.
 * @param {(!o3djs.quaternions.Quaternion|number)} a Operand.
 * @param {(!o3djs.quaternions.Quaternion|number)} b Operand.
 * @return {(!o3djs.quaternions.Quaternion|number)} The difference of a and b.
 */
o3djs.quaternions.sub = function(a, b) {
  return o3djs.quaternions['sub' + o3djs.quaternions.mathType(a) +
      o3djs.quaternions.mathType(b)](a, b);
};

/**
 * Computes the length of a Quaternion, i.e. the square root of the
 * sum of the squares of the coefficients.
 * @param {!o3djs.quaternions.Quaternion} a The Quaternion.
 * @return {number} The length of a.
 */
o3djs.quaternions.length = function(a) {
  return Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2] + a[3] * a[3]);
};

/**
 * Computes the square of the length of a quaternion, i.e. the sum of the
 * squares of the coefficients.
 * @param {!o3djs.quaternions.Quaternion} a The quaternion.
 * @return {number} The square of the length of a.
 */
o3djs.quaternions.lengthSquared = function(a) {
  return a[0] * a[0] + a[1] * a[1] + a[2] * a[2] + a[3] * a[3];
};

/**
 * Divides a Quaternion by its length and returns the quotient.
 * @param {!o3djs.quaternions.Quaternion} a The Quaternion.
 * @return {!o3djs.quaternions.Quaternion} A unit length quaternion pointing in
 *     the same direction as a.
 */
o3djs.quaternions.normalize = function(a) {
  var d = 1 / Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2] + a[3] * a[3]);
  return [a[0] * d, a[1] * d, a[2] * d, a[3] * d];
};

/**
 * Computes the conjugate of the given quaternion.
 * @param {!o3djs.quaternions.Quaternion} q The quaternion.
 * @return {!o3djs.quaternions.Quaternion} The conjugate of q.
 */
o3djs.quaternions.conjugate = function(q) {
  return [-q[0], -q[1], -q[2], q[3]];
};


/**
 * Creates a quaternion which rotates around the x-axis by the given angle.
 * @param {number} angle The angle by which to rotate (in radians).
 * @return {!o3djs.quaternions.Quaternion} The quaternion.
 */
o3djs.quaternions.rotationX = function(angle) {
  return [Math.sin(angle / 2), 0, 0, Math.cos(angle / 2)];
};

/**
 * Creates a quaternion which rotates around the y-axis by the given angle.
 * @param {number} angle The angle by which to rotate (in radians).
 * @return {!o3djs.quaternions.Quaternion} The quaternion.
 */
o3djs.quaternions.rotationY = function(angle) {
  return [0, Math.sin(angle / 2), 0, Math.cos(angle / 2)];
};

/**
 * Creates a quaternion which rotates around the z-axis by the given angle.
 * @param {number} angle The angle by which to rotate (in radians).
 * @return {!o3djs.quaternions.Quaternion} The quaternion.
 */
o3djs.quaternions.rotationZ = function(angle) {
  return [0, 0, Math.sin(angle / 2), Math.cos(angle / 2)];
};

/**
 * Creates a quaternion which rotates around the given axis by the given
 * angle.
 * @param {!o3djs.math.Vector3} axis The axis about which to rotate.
 * @param {number} angle The angle by which to rotate (in radians).
 * @return {!o3djs.quaternions.Quaternion} A quaternion which rotates angle
 *     radians around the axis.
 */
o3djs.quaternions.axisRotation = function(axis, angle) {
  var d = 1 / Math.sqrt(axis[0] * axis[0] +
                        axis[1] * axis[1] +
                        axis[2] * axis[2]);
  var sin = Math.sin(angle / 2);
  var cos = Math.cos(angle / 2);
  return [sin * axis[0] * d, sin * axis[1] * d, sin * axis[2] * d, cos];
};

/**
 * Computes a 4-by-4 rotation matrix (with trivial translation component)
 * given a quaternion.  We assume the convention that to rotate a vector v by
 * a quaternion r means to express that vector as a quaternion q by letting
 * q = [v[0], v[1], v[2], 0] and then obtain the rotated vector by evaluating
 * the expression (r * q) / r.
 * @param {!o3djs.quaternions.Quaternion} q The quaternion.
 * @return {!o3djs.math.Matrix4} A 4-by-4 rotation matrix.
 */
o3djs.quaternions.quaternionToRotation = function(q) {
  var qX = q[0];
  var qY = q[1];
  var qZ = q[2];
  var qW = q[3];

  var qWqW = qW * qW;
  var qWqX = qW * qX;
  var qWqY = qW * qY;
  var qWqZ = qW * qZ;
  var qXqW = qX * qW;
  var qXqX = qX * qX;
  var qXqY = qX * qY;
  var qXqZ = qX * qZ;
  var qYqW = qY * qW;
  var qYqX = qY * qX;
  var qYqY = qY * qY;
  var qYqZ = qY * qZ;
  var qZqW = qZ * qW;
  var qZqX = qZ * qX;
  var qZqY = qZ * qY;
  var qZqZ = qZ * qZ;

  var d = qWqW + qXqX + qYqY + qZqZ;

  return [
    [(qWqW + qXqX - qYqY - qZqZ) / d,
     2 * (qWqZ + qXqY) / d,
     2 * (qXqZ - qWqY) / d, 0],
    [2 * (qXqY - qWqZ) / d,
     (qWqW - qXqX + qYqY - qZqZ) / d,
     2 * (qWqX + qYqZ) / d, 0],
    [2 * (qWqY + qXqZ) / d,
     2 * (qYqZ - qWqX) / d,
     (qWqW - qXqX - qYqY + qZqZ) / d, 0],
    [0, 0, 0, 1]];
};

/**
 * Computes a quaternion whose rotation is equivalent to the given matrix.
 * Based on an algorithm from Shoemake SIGGRAPH 1987.
 * @param {(!o3djs.math.Matrix4|!o3djs.math.Matrix3)} m A 3-by-3 or 4-by-4
 *     rotation matrix.
 * @return {!o3djs.quaternions.Quaternion} A quaternion q such that
 *     quaternions.quaternionToRotation(q) is m.
 */
o3djs.quaternions.rotationToQuaternion = function(m) {
  var u;
  var v;
  var w;

  var q = [];

  var m0 = m[0];
  var m1 = m[1];
  var m2 = m[2];

  var m00 = m0[0];
  var m11 = m1[1];
  var m22 = m2[2];

  var trace = m00 + m11 + m22;

  if (trace > 0) {
    var r = Math.sqrt(1 + trace);
    var k = 0.5 / r;
    return [(m1[2] - m2[1]) * k,
            (m2[0] - m0[2]) * k,
            (m0[1] - m1[0]) * k,
            0.5 * r];
  }

  var mu;
  var mv;
  var mw;

  // Choose u, v, and w such that u is the index of the biggest diagonal entry
  // of m, and u v w is an even permutation of 0 1 and 2.
  if (m00 > m11 && m00 > m22) {
    u = 0;
    mu = m0;
    v = 1;
    mv = m1;
    w = 2;
    mw = m2;
  } else if (m11 > m00 && m11 > m22) {
    u = 1;
    mu = m1;
    v = 2;
    mv = m2;
    w = 0;
    mw = m0;
  } else {
    u = 2;
    mu = m2;
    v = 0;
    mv = m0;
    w = 1;
    mw = m1;
  }

  var r = Math.sqrt(1 + mu[u] - mv[v] - mw[w]);
  var k = 0.5 / r;
  q[u] = 0.5 * r;
  q[v] = (mv[u] + mu[v]) * k;
  q[w] = (mu[w] + mw[u]) * k;
  q[3] = (mv[w] - mw[v]) * k;

  return q;
};

/*
 * Copyright 2009, Google Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */


/**
 * @fileoverview This file contains various functions for helping create
 * render graphs for o3d.  It puts them in the "rendergraph" module on
 * the o3djs object.
 *
 *     Note: This library is only a sample. It is not meant to be some official
 *     library. It is provided only as example code.
 *
 */

o3djs.provide('o3djs.rendergraph');

/**
 * A Module for creating render graphs.
 * @namespace
 */
o3djs.rendergraph = o3djs.rendergraph || {};

/**
 * Creates a basic render graph setup to draw opaque and transparent
 * 3d objects.
 * @param {!o3d.Pack} pack Pack to manage created objects.
 * @param {!o3d.Transform} treeRoot root Transform of tree to render.
 * @param {!o3d.RenderNode} opt_parent RenderNode to build this view under.
 * @param {!o3djs.math.Vector4} opt_clearColor color to clear view.
 * @param {number} opt_priority Optional base priority for created objects.
 * @param {!o3djs.math.Vector4} opt_viewport viewport settings for view.
 * @param {!o3d.DrawList} opt_performanceDrawList Optional DrawList to
 *     use for performanceDrawPass.
 * @param {!o3d.DrawList} opt_zOrderedDrawList Optional DrawList to
 *     use for zOrderedDrawPass.
 * @param {!o3d.DrawContext} opt_drawContext Optional DrawContext to
 *     use. If not passed in one is created.
 * @return {!o3djs.rendergraph.ViewInfo} A ViewInfo object with info about
 *         everything created.
 */
o3djs.rendergraph.createView = function(pack,
                                        treeRoot,
                                        opt_parent,
                                        opt_clearColor,
                                        opt_priority,
                                        opt_viewport,
                                        opt_performanceDrawList,
                                        opt_zOrderedDrawList,
                                        opt_drawContext) {
  return new o3djs.rendergraph.ViewInfo(pack,
                                        treeRoot,
                                        opt_parent,
                                        opt_clearColor,
                                        opt_priority,
                                        opt_viewport,
                                        opt_performanceDrawList,
                                        opt_zOrderedDrawList,
                                        opt_drawContext);
};

/**
 * Creates a basic render graph setup to draw opaque and transparent
 * 3d objects.
 * @param {!o3d.Pack} pack Pack to manage created objects.
 * @param {!o3d.Transform} treeRoot root Transform of tree to render.
 * @param {!o3d.RenderNode} opt_parent RenderNode to build this view under.
 * @param {!o3djs.math.Vector4} opt_clearColor color to clear view.
 * @param {number} opt_priority Optional base priority for created objects.
 * @param {!o3djs.math.Vector4} opt_viewport viewport settings for view.
 * @return {!o3djs.rendergraph.ViewInfo} A ViewInfo object with info about
 *     everything created.
 */
o3djs.rendergraph.createBasicView = function(pack,
                                             treeRoot,
                                             opt_parent,
                                             opt_clearColor,
                                             opt_priority,
                                             opt_viewport) {
   return o3djs.rendergraph.createView(pack,
                                       treeRoot,
                                       opt_parent,
                                       opt_clearColor,
                                       opt_priority,
                                       opt_viewport);
};

/**
 * Creates an extra view render graph setup to draw opaque and transparent
 * 3d objects based on a previously created view. It uses the previous view
 * to share draw lists and to set the priority.
 * @param {!o3djs.rendergraph.ViewInfo} viewInfo ViewInfo returned from
 *     createBasicView.
 * @param {!o3djs.math.Vector4} opt_viewport viewport settings for view.
 * @param {!o3djs.math.Vector4} opt_clearColor color to clear view.
 * @param {number} opt_priority base priority for created objects.
 * @return {!o3djs.rendergraph.ViewInfo} A ViewInfo object with info about
 *     everything created.
 */
o3djs.rendergraph.createExtraView = function(viewInfo,
                                             opt_viewport,
                                             opt_clearColor,
                                             opt_priority) {
  return o3djs.rendergraph.createView(viewInfo.pack,
                                      viewInfo.treeRoot,
                                      viewInfo.renderGraphRoot,
                                      opt_clearColor,
                                      opt_priority,
                                      opt_viewport,
                                      viewInfo.performanceDrawList,
                                      viewInfo.zOrderedDrawList);
};

/**
 * A ViewInfo object creates the standard o3d objects needed for
 * a single 3d view. Those include a ClearBuffer followed by a TreeTraveral
 * followed by 2 DrawPasses all of which are children of a Viewport. On top of
 * those a DrawContext and optionally 2 DrawLists although you can pass in your
 * own DrawLists if there is a reason to reuse the same DrawLists such was with
 * mulitple views of the same scene.
 *
 * The render graph created is something like:
 * <pre>
 *        [Viewport]
 *            |
 *     +------+--------+------------------+---------------------+
 *     |               |                  |                     |
 * [ClearBuffer] [TreeTraversal] [Performance StateSet] [ZOrdered StateSet]
 *                                        |                     |
 *                               [Performance DrawPass] [ZOrdered DrawPass]
 * </pre>
 *
 * @constructor
 * @param {!o3d.Pack} pack Pack to manage created objects.
 * @param {!o3d.Transform} treeRoot root Transform of tree to render.
 * @param {!o3d.RenderNode} opt_parent RenderNode to build this view under.
 * @param {!o3djs.math.Vector4} opt_clearColor color to clear view.
 * @param {number} opt_priority Optional base priority for created objects.
 * @param {!o3djs.math.Vector4} opt_viewport viewport settings for view.
 * @param {!o3d.DrawList} opt_performanceDrawList DrawList to use for
 *     performanceDrawPass.
 * @param {!o3d.DrawList} opt_zOrderedDrawList DrawList to use for
 *     zOrderedDrawPass.
 * @param {!o3d.DrawContext} opt_drawContext Optional DrawContext to
 *     use. If not passed in one is created.
 */
o3djs.rendergraph.ViewInfo = function(pack,
                                      treeRoot,
                                      opt_parent,
                                      opt_clearColor,
                                      opt_priority,
                                      opt_viewport,
                                      opt_performanceDrawList,
                                      opt_zOrderedDrawList,
                                      opt_drawContext) {
  var that = this;
  var clearColor = opt_clearColor || [0.5, 0.5, 0.5, 1.0];
  var viewPriority = opt_priority || 0;
  var priority = 0;

  // Create Viewport.
  var viewport = pack.createObject('Viewport');
  if (opt_viewport) {
    viewport.viewport = opt_viewport;
  }
  viewport.priority = viewPriority;

  // Create a clear buffer.
  var clearBuffer = pack.createObject('ClearBuffer');
  clearBuffer.clearColor = clearColor;
  clearBuffer.priority = priority++;
  clearBuffer.parent = viewport;

  // Creates a TreeTraversal and parents it to the root.
  var treeTraversal = pack.createObject('TreeTraversal');
  treeTraversal.priority = priority++;
  treeTraversal.parent = viewport;
  treeTraversal.transform = treeRoot;

  this.drawPassInfos_ = [];

  /**
   * Pack that manages the objects created for this ViewInfo.
   * @type {!o3d.Pack}
   */
  this.pack = pack;

  /**
   * The RenderNode this ViewInfo render graph subtree is parented under.
   * @type {(!o3d.RenderNode|undefined)}
   */
  this.renderGraphRoot = opt_parent;

  /**
   * The root node of the transform graph this ViewInfo renders.
   * @type {!o3d.Transform}
   */
  this.treeRoot = treeRoot;

  /**
   * The root of the subtree of the render graph this ViewInfo is managing.
   * If you want to set the priority of a ViewInfo's rendergraph subtree use
   * <pre>
   * viewInfo.root.priority = desiredPriority;
   * </pre>
   * @type {!o3d.RenderNode}
   */
  this.root = viewport;

  /**
   * The Viewport RenderNode created for this ViewInfo.
   * @type {!o3d.Viewport}
   */
  this.viewport = viewport;

  /**
   * The ClearBuffer RenderNode created for this ViewInfo.
   * @type {!o3d.ClearBuffer}
   */
  this.clearBuffer = clearBuffer;

  // Create DrawContext.
  var drawContext = opt_drawContext || pack.createObject('DrawContext');

  /**
   * The DrawContext used by this ViewInfo.
   * @type {!o3d.DrawContext}
   */
  this.drawContext = drawContext;

  /**
   * The TreeTraversal used by this ViewInfo.
   * @type {!o3d.TreeTraversal}
   */
  this.treeTraversal = treeTraversal;

  /**
   * The highest priority used for objects under the Viewport RenderNode created
   * by this ViewInfo.
   * @type {number}
   */
  this.priority = priority;

  /**
   * This function is here just because the inside use case of
   * ViewInfo.createDrawPass is the less common case.
   * @param {o3d.DrawList.SortMethod} sortMethod how to sort.
   * @param {!o3d.DrawList} opt_drawList DrawList to use.
   */
  function createDrawPass(sortMethod, opt_drawList) {
    return that.createDrawPass(
        sortMethod,
        undefined,
        undefined,
        undefined,
        opt_drawList);
  }

  // Setup a Performance Ordered DrawPass
  var performanceDrawPassInfo = createDrawPass(
      o3djs.base.o3d.DrawList.BY_PERFORMANCE,
      opt_performanceDrawList);

  var performanceState = performanceDrawPassInfo.state;

  // Setup a z Ordered DrawPass
  var zOrderedDrawPassInfo = createDrawPass(
      o3djs.base.o3d.DrawList.BY_Z_ORDER,
      opt_zOrderedDrawList);

  var zOrderedState = zOrderedDrawPassInfo.state;

  zOrderedState.getStateParam('AlphaBlendEnable').value = true;
  zOrderedState.getStateParam('SourceBlendFunction').value =
      o3djs.base.o3d.State.BLENDFUNC_SOURCE_ALPHA;
  zOrderedState.getStateParam('DestinationBlendFunction').value =
      o3djs.base.o3d.State.BLENDFUNC_INVERSE_SOURCE_ALPHA;
  zOrderedState.getStateParam('AlphaTestEnable').value = true;
  zOrderedState.getStateParam('AlphaComparisonFunction').value =
      o3djs.base.o3d.State.CMP_GREATER;

  // Parent whatever the root is to the parent passed in.
  if (opt_parent) {
    this.root.parent = opt_parent;
  }

  /**
   * The DrawPassInfo for the performance draw pass.
   * @type {!o3djs.rendergraph.DrawPassInfo}
   */
  this.performanceDrawPassInfo = performanceDrawPassInfo;

  /**
   * The DrawPassInfo for the zOrdered draw pass.
   * @type {!o3djs.rendergraph.DrawPassInfo}
   */
  this.zOrderedDrawPassInfo = zOrderedDrawPassInfo;

  // Legacy properties

  /**
   * The StateSet RenderNode above the performance DrawPass in this ViewInfo
   * @type {!o3d.StateSet}
   */
  this.performanceStateSet = performanceDrawPassInfo.stateSet;

  /**
   * The State object used by the performanceStateSet object in this ViewInfo.
   * By default, no states are set here.
   * @type {!o3d.State}
   */
  this.performanceState = performanceState;

  /**
   * The DrawList used for the performance draw pass. Generally for opaque
   * materials.
   * @type {!o3d.DrawList}
   */
  this.performanceDrawList = performanceDrawPassInfo.drawList;

  /**
   * The StateSet RenderNode above the ZOrdered DrawPass in this ViewInfo
   * @type {!o3d.StateSet}
   */
  this.zOrderedStateSet = zOrderedDrawPassInfo.stateSet;

  /**
   * The State object used by the zOrderedStateSet object in this ViewInfo.
   * By default AlphaBlendEnable is set to true, SourceBlendFucntion is set to
   * State.BLENDFUNC_SOURCE_ALPHA and DestinationBlendFunction is set to
   * State.BLENDFUNC_INVERSE_SOURCE_ALPHA
   * @type {!o3d.State}
   */
  this.zOrderedState = zOrderedState;

  /**
   * The DrawList used for the zOrdered draw pass. Generally for transparent
   * materials.
   * @type {!o3d.DrawList}
   */
  this.zOrderedDrawList = zOrderedDrawPassInfo.drawList;

  /**
   * The DrawPass used with the performance DrawList created by this ViewInfo.
   * @type {!o3d.DrawPass}
   */
  this.performanceDrawPass = performanceDrawPassInfo.drawPass;

  /**
   * The DrawPass used with the zOrdered DrawList created by this ViewInfo.
   * @type {!o3d.DrawPass}
   */
  this.zOrderedDrawPass = zOrderedDrawPassInfo.drawPass;

  /**
   * A flag whether or not we created the DrawContext for this DrawPassInfo.
   * @private
   * @type {boolean}
   */
  this.ownDrawContext_ = opt_drawContext ? false : true;
};

/**
 * Destroys the various objects created for the view.
 *
 * @param {boolean} opt_destroyDrawContext True if you want view's DrawContext
 *     destroyed. Default = true.
 * @param {boolean} opt_destroyDrawList True if you want view's DrawLists
 *     destroyed. Default = true.
 */
o3djs.rendergraph.ViewInfo.prototype.destroy = function(
    opt_destroyDrawContext,
    opt_destroyDrawList) {
  if (opt_destroyDrawContext === undefined) {
    opt_destroyDrawContext = true;
  }

  for (var ii = 0; ii < this.drawPassInfos_.length; ++ii) {
    this.drawPassInfos_[ii].destroy();
  }

  // Remove everything we created from the pack.
  this.pack.removeObject(this.viewport);
  this.pack.removeObject(this.clearBuffer);
  if (opt_destroyDrawContext && this.ownDrawContext_) {
    this.pack.removeObject(this.drawContext);
  }
  this.pack.removeObject(this.treeTraversal);
  // Remove our substree from its parent.
  this.viewport.parent = null;

  // At this point, IF nothing else is referencing any of these objects
  // they should get removed.
};

/**
 * Creates a draw pass in this ViewInfo.
 *
 * @param {o3d.DrawList.SortMethod} sortMethod How to sort this draw pass's
 *     DrawElements.
 * @param {!o3d.DrawContext} opt_drawContext The DrawContext for this draw pass.
 *     If not passed in the default DrawContext for this ViewInfo will be used.
 * @param {number} opt_priority The priority for this draw pass. If not passed
 *     in the priority will be the next priority for this ViewInfo.
 * @param {!o3d.RenderNode} opt_parent The RenderNode to parent this draw pass
 *     under. If not passed in the draw pass will be parented under the
 *     ViewInfo's viewport RenderNode.
 * @param {!o3d.DrawList} opt_drawList The DrawList for this draw pass. If not
 *     passed in one will be created.
 * @return {!o3djs.rendergraph.DrawPassInfo}
 */
o3djs.rendergraph.ViewInfo.prototype.createDrawPass = function(
    sortMethod,
    opt_drawContext,
    opt_priority,
    opt_parent,
    opt_drawList) {
  opt_drawContext = opt_drawContext || this.drawContext;
  opt_parent = opt_parent || this.viewport;
  opt_priority = (typeof opt_priority !== 'undefined') ? opt_priority :
                 this.priority++;
  var drawPassInfo = o3djs.rendergraph.createDrawPassInfo(
     this.pack,
     opt_drawContext,
     sortMethod,
     opt_parent,
     opt_drawList);
  drawPassInfo.root.priority = opt_priority;
  this.treeTraversal.registerDrawList(
      drawPassInfo.drawList, opt_drawContext, true);

  this.drawPassInfos_.push(drawPassInfo);

  return drawPassInfo;
};

/**
 * Creates a DrawPassInfo to manage a draw pass.
 *
 * @param {!o3d.Pack} pack Pack to manage created objects.
 * @param {!o3d.DrawContext} drawContext The DrawContext for this draw pass.
 * @param {o3d.DrawList.SortMethod} sortMethod How to sort this draw pass's
 *     DrawElements.
 * @param {!o3d.DrawList} opt_drawList The DrawList for this draw pass. If not
 *     passed in one will be created.
 * @param {!o3d.RenderNode} opt_parent The RenderNode to parent this draw pass
 *     under. If not passed the draw pass will not be parented.
 * @return {!o3djs.rendergraph.DrawPassInfo}
 */
o3djs.rendergraph.createDrawPassInfo = function(
    pack,
    drawContext,
    sortMethod,
    opt_parent,
    opt_drawList) {
  return new o3djs.rendergraph.DrawPassInfo(
      pack, drawContext, sortMethod, opt_parent, opt_drawList);
};

/**
 * A class to manage a draw pass.
 * @constructor
 * @param {!o3d.Pack} pack Pack to manage created objects.
 * @param {!o3d.DrawContext} drawContext The DrawContext for this draw pass.
 * @param {o3d.DrawList.SortMethod} sortMethod How to sort this draw pass's
 *     DrawElements.
 * @param {!o3d.DrawList} opt_drawList The DrawList for this draw pass. If not
 *     passed in one will be created.
 * @param {!o3d.RenderNode} opt_parent The RenderNode to parent this draw pass
 *     under. If not passed the draw pass will not be parented.
 * @return {!o3djs.rendergraph.DrawPassInfo}
 */
o3djs.rendergraph.DrawPassInfo = function(pack,
                                          drawContext,
                                          sortMethod,
                                          opt_parent,
                                          opt_drawList) {
  var ownDrawList = opt_drawList ? false : true;

  opt_parent = opt_parent || null;
  opt_drawList = opt_drawList || pack.createObject('DrawList');

  var stateSet = pack.createObject('StateSet');
  var state = pack.createObject('State');
  stateSet.state = state;
  stateSet.parent = opt_parent;

  var drawPass = pack.createObject('DrawPass');
  drawPass.drawList = opt_drawList;
  drawPass.sortMethod = sortMethod;
  drawPass.parent = stateSet;

  /**
   * The pack managing the objects created for this DrawPassInfo.
   * @type {!o3d.Pack}
   */
  this.pack = pack;

  /**
   * The State that affects all things drawn in this DrawPassInfo.
   * @type {!o3d.State}
   */
  this.state = state;

  /**
   * The StateSet that applies the state for this DrawPassInfo.
   * @type {!o3d.StateSet}
   */
  this.stateSet = stateSet;

  /**
   * The DrawPass for this DrawPassInfo.
   * @type {!o3d.DrawPass}
   */
  this.drawPass = drawPass;

  /**
   * The DrawList for this DrawPassInfo.
   * @type {!o3d.DrawList}
   */
  this.drawList = opt_drawList;

  /**
   * The root RenderNode of this DrawPassInfo. This is the RenderNdoe you should
   * use if you want to turn this draw pass off or reparent it.
   * @type {!o3d.RenderNode}
   */
  this.root = stateSet;

  /**
   * A flag whether or not we created the DrawList for this DrawPassInfo.
   * @private
   * @type {boolean}
   */
  this.ownDrawList_ = ownDrawList;
};

/**
 * Frees the resources created for this DrawPassInfo.
 */
o3djs.rendergraph.DrawPassInfo.prototype.destroy = function() {
  // Remove everything we created from the pack.
  if (this.ownDrawList_) {
    this.drawPass.drawList = null;
    this.pack.removeObject(this.drawList);
  }
  this.drawPass.parent = null;
  this.stateSet.parent = null;
  this.pack.removeObject(this.drawPass);
  this.pack.removeObject(this.stateSet);
  this.pack.removeObject(this.state);
};

/*
 * Copyright 2009, Google Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */


/**
 * @fileoverview This file contains various functions and classes for dealing
 * with 3d scenes.
 */

o3djs.provide('o3djs.scene');

o3djs.require('o3djs.io');
o3djs.require('o3djs.serialization');

/**
 * A Module with various scene functions and classes.
 * @namespace
 */
o3djs.scene = o3djs.scene || {};

/**
 * Loads a scene.
 * @param {!o3d.Client} client An O3D client object.
 * @param {!o3d.Pack} pack Pack to load scene into.
 * @param {!o3d.Transform} parent Transform to parent scene under.
 * @param {string} url URL of scene to load.
 * @param {!function(!o3d.Pack, !o3d.Transform, *): void} callback
 *     Callback when scene is loaded. It will be passed the pack, the parent and
 *     an exception which is null on success.
 * @param {!o3djs.serialization.Options} opt_options Options passed into the
 *     loader.
 * @return {!o3djs.io.LoadInfo} A LoadInfo for tracking progress.
 * @see o3djs.loader.createLoader
 */
o3djs.scene.loadScene = function(client,
                                 pack,
                                 parent,
                                 url,
                                 callback,
                                 opt_options) {
  // Starts the deserializer once the entire archive is available.
  function onFinished(archiveInfo, exception) {
    if (!exception) {
      var finishCallback = function(pack, parent, exception) {
        archiveInfo.destroy();
        callback(pack, parent, exception);
      };
      o3djs.serialization.deserializeArchive(archiveInfo,
                                             'scene.json',
                                             client,
                                             pack,
                                             parent,
                                             finishCallback,
                                             opt_options);
    } else {
      archiveInfo.destroy();
      callback(pack, parent, exception);
    }
  }
  return o3djs.io.loadArchive(pack, url, onFinished);
};


/*
 * Copyright 2009, Google Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */


/**
 * @fileoverview This file provides support for deserializing (loading)
 *     transform graphs from JSON files.
 *
 */

o3djs.provide('o3djs.serialization');

o3djs.require('o3djs.error');
o3djs.require('o3djs.texture');

/**
 * A Module for deserializing a scene created by the sample o3dConverter.
 * @namespace
 */
o3djs.serialization = o3djs.serialization || {};

/**
 * The oldest supported version of the serializer. It isn't necessary to
 * increment this version whenever the format changes. Only change it when the
 * deserializer becomes incapable of deserializing an older version.
 * @type {number}
 */
o3djs.serialization.supportedVersion = 5;

/**
 * These are the values the sample o3dConverter uses to identify curve key
 * types.
 * @type {!Object}
 */
o3djs.serialization.CURVE_KEY_TYPES = {
  step: 1,
  linear: 2,
  bezier: 3};

/**
 * Options for deserialization.
 *
 * opt_animSource is an optional ParamFloat that will be bound as the source
 * param for all animation time params in the scene. opt_async is a bool that
 * will make the deserialization process async.
 *
 * @type {{opt_animSource: !o3d.ParamFloat, opt_async: boolean}}
 */
o3djs.serialization.Options = goog.typedef;

/**
 * A Deserializer incrementally deserializes a transform graph.
 * @constructor
 * @param {!o3d.Pack} pack The pack to deserialize into.
 * @param {!Object} json An object tree conforming to the JSON rules.
 */
o3djs.serialization.Deserializer = function(pack, json) {
  /**
   * The pack to deserialize into.
   * @type {!o3d.Pack}
   */
  this.pack = pack;

  /**
   * An object tree conforming to the JSON rules.
   * @type {!Object}
   */
  this.json = json;

  /**
   * The archive from which assets referenced from JSON are retreived.
   * @type {o3djs.io.ArchiveInfo}
   */
  this.archiveInfo = null;

  /**
   * Deserializes a Buffer .
   * @param {!o3djs.serialization.Deserializer} deserializer The deserializer.
   * @param {!Object} json The json for this buffer.
   * @param {string} type The type of buffer to create.
   * @param {string} uri The uri of the file containing the binary data.
   */
  function deserializeBuffer(deserializer, json, type, uri) {
    var object = deserializer.pack.createObject(type);
    if ('custom' in json) {
      if ('fieldData' in json.custom) {
        var fieldDataArray = json.custom.fieldData;
        if (fieldDataArray.length > 0) {
          var fields = [];
          // First create all the fields
          for (var ii = 0; ii < fieldDataArray.length; ++ii) {
            var data = fieldDataArray[ii];
            var field = object.createField(data.type, data.numComponents);
            fields.push(field);
            deserializer.addObject(data.id, field);
          }
          var firstData = fieldDataArray[0];
          var numElements = firstData.data.length / firstData.numComponents;
          object.allocateElements(numElements);
          // Now set the data.
          for (var ii = 0; ii < fieldDataArray.length; ++ii) {
            var data = fieldDataArray[ii];
            fields[ii].setAt(0, data.data);
          }
        }
      } else {
        var rawData = deserializer.archiveInfo.getFileByURI(uri);
        object.set(rawData,
                   json.custom.binaryRange[0],
                   json.custom.binaryRange[1] - json.custom.binaryRange[0]);
        for (var i = 0; i < json.custom.fields.length; ++i) {
          deserializer.addObject(json.custom.fields[i], object.fields[i]);
        }
      }
    }
    return object;
  }

  /**
   * A map from classname to a function that will create
   * instances of objects. Add entries to support additional classes.
   * @type {!Object}
   */
  this.createCallbacks = {
    'o3djs.DestinationBuffer': function(deserializer, json) {
      var object = deserializer.pack.createObject('o3d.VertexBuffer');
      if ('custom' in json) {
        for (var i = 0; i < json.custom.fields.length; ++i) {
          var fieldInfo = json.custom.fields[i]
          var field = object.createField(fieldInfo.type,
                                         fieldInfo.numComponents);
          deserializer.addObject(fieldInfo.id, field);
        }
        object.allocateElements(json.custom.numElements);
      }
      return object;
    },

    'o3d.VertexBuffer': function(deserializer, json) {
      return deserializeBuffer(
          deserializer, json, 'o3d.VertexBuffer', 'vertex-buffers.bin');
    },

    'o3d.SourceBuffer': function(deserializer, json) {
      return deserializeBuffer(
          deserializer, json, 'o3d.SourceBuffer', 'vertex-buffers.bin');
    },

    'o3d.IndexBuffer': function(deserializer, json) {
      return deserializeBuffer(
          deserializer, json, 'o3d.IndexBuffer', 'index-buffers.bin');
    },

    'o3d.Texture2D': function(deserializer, json) {
      if ('o3d.uri' in json.params) {
        var uri = json.params['o3d.uri'].value;
        var rawData = deserializer.archiveInfo.getFileByURI(uri);
        if (!rawData) {
          throw 'Could not find texture ' + uri + ' in the archive';
        }
        return o3djs.texture.createTextureFromRawData(pack, rawData, true);
      } else {
        return deserializer.pack.createTexture2D(
            json.custom.width,
            json.custom.height,
            json.custom.format,
            json.custom.levels,
            json.custom.renderSurfacesEnabled);
      }
    },

    'o3d.TextureCUBE': function(deserializer, json) {
      if ('o3d.negx_uri' in json.params) {
        // Cube map comprised of six separate textures.
        var param_names = [
            'o3d.posx_uri',
            'o3d.negx_uri',
            'o3d.posy_uri',
            'o3d.negy_uri',
            'o3d.posz_uri',
            'o3d.negz_uri'
        ];
        var rawDataArray = [];
        for (var i = 0; i < param_names.length; i++) {
          var uri = json.params[param_names[i]].value;
          var rawData = deserializer.archiveInfo.getFileByURI(uri);
          if (!rawData) {
            throw 'Could not find texture ' + uri + ' in the archive';
          }
          rawDataArray.push(rawData);
        }
        // Cube map faces should not be flipped.
        return o3djs.texture.createTextureFromRawDataArray(
            pack, rawDataArray, true, false);
      } else if ('o3d.uri' in json.params) {
        var uri = json.params['o3d.uri'].value;
        var rawData = deserializer.archiveInfo.getFileByURI(uri);
        if (!rawData) {
          throw 'Could not find texture ' + uri + ' in the archive';
        }
        return o3djs.texture.createTextureFromRawData(pack, rawData, true);
      } else {
        return deserializer.pack.createTextureCUBE(
            json.custom.edgeLength,
            json.custom.format,
            json.custom.levels,
            json.custom.renderSurfacesEnabled);
      }
    }
  };

  /**
   * A map from classname to a function that will initialize
   * instances of the given class from JSON data. Add entries to support
   * additional classes.
   * @type {!Object}
   */
  this.initCallbacks = {
    'o3d.Curve': function(deserializer, object, json) {
      if ('custom' in json) {
        if ('keys' in json.custom) {
          var keys = json.custom.keys;
          var stepType = o3djs.serialization.CURVE_KEY_TYPES.step;
          var linearType = o3djs.serialization.CURVE_KEY_TYPES.linear;
          var bezierType = o3djs.serialization.CURVE_KEY_TYPES.bezier;
          for (var ii = 0; ii < keys.length; ++ii) {
            var key = keys[ii];
            switch (key[0]) {
            case stepType:  // Step
              object.addStepKeys(key.slice(1));
              break;
            case linearType:  // Linear
              object.addLinearKeys(key.slice(1));
              break;
            case bezierType:  // Bezier
              object.addBezierKeys(key.slice(1));
              break;
            }
          }
        } else {
          var rawData = deserializer.archiveInfo.getFileByURI('curve-keys.bin');
          object.set(rawData,
                     json.custom.binaryRange[0],
                     json.custom.binaryRange[1] - json.custom.binaryRange[0]);
        }
      }
    },

    'o3d.Effect': function(deserializer, object, json) {
      var uriParam = object.getParam('o3d.uri');
      if (uriParam) {
        var rawData = deserializer.archiveInfo.getFileByURI(uriParam.value);
        if (!rawData) {
          throw 'Cannot find shader ' + uriParam.value + ' in archive.';
        }
        if (!object.loadFromFXString(rawData.stringValue)) {
          throw 'Cannot load shader ' + uriParam.value + ' in archive.';
        }
      }
    },

    'o3d.Skin': function(deserializer, object, json) {
      if ('custom' in json) {
        if ('binaryRange' in json.custom) {
          var rawData = deserializer.archiveInfo.getFileByURI('skins.bin');
          object.set(rawData,
                     json.custom.binaryRange[0],
                     json.custom.binaryRange[1] - json.custom.binaryRange[0]);
        }
      }
    },

    'o3d.SkinEval': function(deserializer, object, json) {
      if ('custom' in json) {
        for (var i = 0; i < json.custom.vertexStreams.length; ++i) {
          var streamJson = json.custom.vertexStreams[i];
          var field = deserializer.getObjectById(streamJson.stream.field);
          object.setVertexStream(streamJson.stream.semantic,
                                 streamJson.stream.semanticIndex,
                                 field,
                                 streamJson.stream.startIndex);
          if ('bind' in streamJson) {
            var source = deserializer.getObjectById(streamJson.bind);
            object.bindStream(source,
                              streamJson.stream.semantic,
                              streamJson.stream.semanticIndex);
          }
        }
      }
    },

    'o3d.StreamBank': function(deserializer, object, json) {
      if ('custom' in json) {
        for (var i = 0; i < json.custom.vertexStreams.length; ++i) {
          var streamJson = json.custom.vertexStreams[i];
          var field = deserializer.getObjectById(streamJson.stream.field);
          object.setVertexStream(streamJson.stream.semantic,
                                 streamJson.stream.semanticIndex,
                                 field,
                                 streamJson.stream.startIndex);
          if ('bind' in streamJson) {
            var source = deserializer.getObjectById(streamJson.bind);
            object.bindStream(source,
                              streamJson.stream.semantic,
                              streamJson.stream.semanticIndex);
          }
        }
      }
    }
  };

  if (!('version' in json)) {
    throw 'Version in JSON file was missing.';
  }

  if (json.version < o3djs.serialization.supportedVersion) {
    throw 'Version in JSON file was ' + json.version +
        ' but expected at least version ' +
        o3djs.serialization.supportedVersion + '.';
  }

  if (!('objects' in json)) {
    throw 'Objects array in JSON file was missing.';
  }

  /**
   * An array of all objects deserialized so far, indexed by object id. Id zero
   * means null.
   * @type {!Array.<(Object|undefined)>}
   * @private
   */
  this.objectsById_ = [null];

  /**
   * An array of objects deserialized so far, indexed by position in the JSON.
   * @type {!Array.<Object>}
   * @private
   */
  this.objectsByIndex_ = [];

  /**
   * Array of all classes present in the JSON.
   * @type {!Array.<string>}
   * @private
   */
  this.classNames_ = [];
  for (var className in json.objects) {
    this.classNames_.push(className);
  }

  /**
   * The current phase_ of deserialization. In phase_ 0, objects
   * are created and their ids registered. In phase_ 1, objects are
   * initialized from JSON data.
   * @type {number}
   * @private
   */
  this.phase_ = 0;

  /**
   * Index of the next class to be deserialized in classNames_.
   * @type {number}
   * @private
   */
  this.nextClassIndex_ = 0;

  /**
   * Index of the next object of the current class to be deserialized.
   * @type {number}
   * @private
   */
  this.nextObjectIndex_ = 0;

  /**
   * Index of the next object to be deserialized in objectsByIndex_.
   * @type {number}
   * @private
   */
  this.globalObjectIndex_ = 0;
};

/**
 * Get the object with the given id.
 * @param {number} id The id to lookup.
 * @return {(Object|undefined)} The object with the given id.
 */
o3djs.serialization.Deserializer.prototype.getObjectById = function(id) {
  return this.objectsById_[id];
};

/**
 * When a creation or init callback creates an object that the Deserializer
 * is not aware of, it can associate it with an id using this function, so that
 * references to the object can be resolved.
 * @param {number} id The is of the object.
 * @param {!Object} object The object to register.
 */
o3djs.serialization.Deserializer.prototype.addObject = function(
    id, object) {
  this.objectsById_[id] = object;
};

/**
 * Deserialize a value. Identifies reference values and converts
 * their object id into an object reference. Otherwise returns the
 * value unchanged.
 * @param {*} valueJson The JSON representation of the value.
 * @return {*} The JavaScript representation of the value.
 */
o3djs.serialization.Deserializer.prototype.deserializeValue = function(
    valueJson) {
  if (typeof(valueJson) === 'object') {
    if (valueJson === null) {
      return null;
    }

    var valueAsObject = /** @type {!Object} */ (valueJson);
    if ('length' in valueAsObject) {
      for (var i = 0; i != valueAsObject.length; ++i) {
        valueAsObject[i] = this.deserializeValue(valueAsObject[i]);
      }
      return valueAsObject;
    }

    var refId = valueAsObject['ref'];
    if (refId !== undefined) {
      var referenced = this.objectsById_[refId];
      if (referenced === undefined) {
        throw 'Could not find object with id ' + refId + '.';
      }
      return referenced;
    }
  }

  return valueJson;
};

/**
 * Sets the value of a param on an object or binds a param to another.
 * @param {!Object} object The object holding the param.
 * @param {(string|number)} paramName The name of the param.
 * @param {!Object} propertyJson The JSON representation of the value.
 * @private
 */
o3djs.serialization.Deserializer.prototype.setParamValue_ = function(
    object, paramName, propertyJson) {
  var param = object.getParam(paramName);
  if (param === null)
    return;

  var valueJson = propertyJson['value'];
  if (valueJson !== undefined) {
    param.value = this.deserializeValue(valueJson);
  }

  var bindId = propertyJson['bind'];
  if (bindId !== undefined) {
    var referenced = this.objectsById_[bindId];
    if (referenced === undefined) {
      throw 'Could not find output param with id ' + bindId + '.';
    }
    param.bind(referenced);
  }
};

/**
 * Creates a param on an object and adds it's id so that other objects can
 * reference it.
 * @param {!Object} object The object to hold the param.
 * @param {(string|number)} paramName The name of the param.
 * @param {!Object} propertyJson The JSON representation of the value.
 * @private
 */
o3djs.serialization.Deserializer.prototype.createAndIdentifyParam_ =
    function(object, paramName, propertyJson) {
  var propertyClass = propertyJson['class'];
  var param;
  if (propertyClass !== undefined) {
    param = object.createParam(paramName, propertyClass);
  } else {
    param = object.getParam(paramName);
  }

  var paramId = propertyJson['id'];
  if (paramId !== undefined && param !== null) {
    this.objectsById_[paramId] = param;
  }
};

/**
 * First pass: create all objects and additional params. We need two
 * passes to support references to objects that appear later in the
 * JSON.
 * @param {number} amountOfWork The number of loop iterations to perform of
 *     this phase_.
 * @private
 */
o3djs.serialization.Deserializer.prototype.createObjectsPhase_ =
     function(amountOfWork) {
  for (; this.nextClassIndex_ < this.classNames_.length;
       ++this.nextClassIndex_) {
    var className = this.classNames_[this.nextClassIndex_];
    var classJson = this.json.objects[className];
    var numObjects = classJson.length;
    for (; this.nextObjectIndex_ < numObjects; ++this.nextObjectIndex_) {
      if (amountOfWork-- <= 0)
        return;

      var objectJson = classJson[this.nextObjectIndex_];
      var object = undefined;
      if ('id' in objectJson) {
        object = this.objectsById_[objectJson.id];
      }
      if (object === undefined) {
        if (className in this.createCallbacks) {
          object = this.createCallbacks[className](this, objectJson);
        } else {
          object = this.pack.createObject(className);
        }
      }
      this.objectsByIndex_[this.globalObjectIndex_++] = object;
      if ('id' in objectJson) {
        this.objectsById_[objectJson.id] = object;
      }
      if ('params' in objectJson) {
        if ('length' in objectJson.params) {
          for (var paramIndex = 0; paramIndex != objectJson.params.length;
              ++paramIndex) {
            var paramJson = objectJson.params[paramIndex];
            this.createAndIdentifyParam_(object, paramIndex,
                                         paramJson);
          }
        } else {
          for (var paramName in objectJson.params) {
            var paramJson = objectJson.params[paramName];
            this.createAndIdentifyParam_(object, paramName, paramJson);
          }
        }
      }
    }
    this.nextObjectIndex_ = 0;
  }

  if (this.nextClassIndex_ === this.classNames_.length) {
    this.nextClassIndex_ = 0;
    this.nextObjectIndex_ = 0;
    this.globalObjectIndex_ = 0;
    ++this.phase_;
  }
};

/**
 * Second pass: set property and parameter values and bind parameters.
 * @param {number} amountOfWork The number of loop iterations to perform of
 *     this phase_.
 * @private
 */
o3djs.serialization.Deserializer.prototype.setPropertiesPhase_ = function(
    amountOfWork) {
  for (; this.nextClassIndex_ < this.classNames_.length;
       ++this.nextClassIndex_) {
    var className = this.classNames_[this.nextClassIndex_];
    var classJson = this.json.objects[className];
    var numObjects = classJson.length;
    for (; this.nextObjectIndex_ < numObjects; ++this.nextObjectIndex_) {
      if (amountOfWork-- <= 0)
        return;

      var objectJson = classJson[this.nextObjectIndex_];
      var object = this.objectsByIndex_[this.globalObjectIndex_++];
      if ('properties' in objectJson) {
        for (var propertyName in objectJson.properties) {
          if (propertyName in object) {
            var propertyJson = objectJson.properties[propertyName];
            var propertyValue = this.deserializeValue(propertyJson);
            object[propertyName] = propertyValue;
          }
        };
      }
      if ('params' in objectJson) {
        if ('length' in objectJson.params) {
          for (var paramIndex = 0; paramIndex != objectJson.params.length;
              ++paramIndex) {
            var paramJson = objectJson.params[paramIndex];
            this.setParamValue_(/** @type {!Object} */ (object),
                                paramIndex,
                                paramJson);
          }
        } else {
          for (var paramName in objectJson.params) {
            var paramJson = objectJson.params[paramName];
            this.setParamValue_(/** @type {!Object} */ (object),
                                paramName,
                                paramJson);
          }
        }
      }
      if (className in this.initCallbacks) {
        this.initCallbacks[className](this, object, objectJson);
      }
    }
    this.nextObjectIndex_ = 0;
  }

  if (this.nextClassIndex_ === this.classNames_.length) {
    this.nextClassIndex_ = 0;
    this.nextObjectIndex_ = 0;
    this.globalObjectIndex_ = 0;
    ++this.phase_;
  }
};

/**
 * Perform a certain number of iterations of the deserializer. Keep calling this
 * function until it returns false.
 * @param {number} opt_amountOfWork The number of loop iterations to run. If
 *     not specified, runs the deserialization to completion.
 * @return {boolean} Whether work remains to be done.
 */
o3djs.serialization.Deserializer.prototype.run = function(
    opt_amountOfWork) {
  if (!opt_amountOfWork) {
    while (this.run(10000)) {
    }
    return false;
  } else {
    switch (this.phase_) {
    case 0:
      this.createObjectsPhase_(opt_amountOfWork);
      break;
    case 1:
      this.setPropertiesPhase_(opt_amountOfWork);
      break;
    }
    return this.phase_ < 2;
  }
};

/**
 * Deserializes (loads) a transform graph in the background. Invokes
 * a callback function on completion passing the pack and the thrown
 * exception on failure or the pack and a null exception on success.
 * @param {!o3d.Client} client An O3D client object.
 * @param {!o3d.Pack} pack The pack to create the deserialized objects
 *     in.
 * @param {number} time The amount of the time (in seconds) the deserializer
 *     should aim to complete in.
 * @param {!function(o3d.Pack, *): void} callback The function that
 *     is called on completion. The second parameter is null on success or
 *     the thrown exception on failure.
 */
o3djs.serialization.Deserializer.prototype.runBackground = function(
    client, pack, time, callback) {
  // TODO: This seems like it needs to be more granular than the
  //    top level.
  // TODO: Passing in the time you want it to take seems counter
  //   intuitive. I want pass in a % of CPU so I can effectively say
  //   "deserialize this in such a way so as not to affect my app's
  //   performance".  callbacksRequired = numObjects / amountPerCallback where
  //   amountPerCallback = number I can do per frame and not affect performance
  //   too much.
  var workToDo = this.json.objects.length * 2;
  var timerCallbacks = time * 60;
  var amountPerCallback = workToDo / timerCallbacks;
  var intervalId;
  var that = this;
  function deserializeMore() {
    var exception = null;
    var finished = false;
    var failed = false;
    var errorCollector = o3djs.error.createErrorCollector(client);
    try {
      finished = !that.run(amountPerCallback);
    } catch(e) {
      failed = true;
      finished = true;
      exception = e;
    }
    if (errorCollector.errors.length > 0) {
      finished = true;
      exception = errorCollector.errors.join('\n') +
                  (exception ? ('\n' + exception.toString()) : '');
    }
    errorCollector.finish();
    if (finished) {
      window.clearInterval(intervalId);
      callback(pack, exception);
    }
  }

  intervalId = window.setInterval(deserializeMore, 1000 / 60);
};

/**
 * Creates a deserializer that will incrementally deserialize a
 * transform graph. The deserializer object has a method
 * called run that does a fixed amount of work and returns.
 * It returns true until the transform graph is fully deserialized.
 * It returns false from then on.
 * @param {!o3d.Pack} pack The pack to create the deserialized
 *     objects in.
 * @param {!Object} json An object tree conforming to the JSON rules.
 * @return {!o3djs.serialization.Deserializer} A deserializer object.
 */
o3djs.serialization.createDeserializer = function(pack, json) {
  return new o3djs.serialization.Deserializer(pack, json);
};

/**
 * Deserializes a transform graph.
 * @param {!o3d.Pack} pack The pack to create the deserialized
 *     objects in.
 * @param {!Object} json An object tree conforming to the JSON rules.
 */
o3djs.serialization.deserialize = function(pack, json) {
  var deserializer = o3djs.serialization.createDeserializer(pack, json);
  deserializer.run();
};

/**
 * Deserializes a single json object named 'scene.json' from a loaded
 * o3djs.io.ArchiveInfo.
 * @param {!o3djs.io.ArchiveInfo} archiveInfo Archive to load from.
 * @param {string} sceneJsonUri The relative URI of the scene JSON file within
 *     the archive.
 * @param {!o3d.Client} client An O3D client object.
 * @param {!o3d.Pack} pack The pack to create the deserialized objects
 *     in.
 * @param {!o3d.Transform} parent Transform to parent loaded stuff from.
 * @param {!function(!o3d.Pack, !o3d.Transform, *): void} callback A function
 *     that will be called when deserialization is finished. It will be passed
 *     the pack, the parent transform, and an exception which will be null on
 *     success.
 * @param {!o3djs.serialization.Options} opt_options Options.
 */
o3djs.serialization.deserializeArchive = function(archiveInfo,
                                                  sceneJsonUri,
                                                  client,
                                                  pack,
                                                  parent,
                                                  callback,
                                                  opt_options) {
  opt_options = opt_options || { };
  var jsonFile = archiveInfo.getFileByURI(sceneJsonUri);
  if (!jsonFile) {
    throw 'Could not find ' + sceneJsonUri + ' in archive';
  }
  var parsed = eval('(' + jsonFile.stringValue + ')');
  var deserializer = o3djs.serialization.createDeserializer(pack, parsed);

  deserializer.addObject(parsed.o3d_rootObject_root, parent);
  deserializer.archiveInfo = archiveInfo;

  var finishCallback = function(pack, exception) {
    if (!exception) {
      var objects = pack.getObjects('o3d.animSourceOwner', 'o3d.ParamObject');
      if (objects.length > 0) {
        // Rebind the output connections of the animSource to the user's param.
        if (opt_options.opt_animSource) {
          var animSource = objects[0].getParam('animSource');
          var outputConnections = animSource.outputConnections;
          for (var ii = 0; ii < outputConnections.length; ++ii) {
            outputConnections[ii].bind(opt_options.opt_animSource);
          }
        }
        // Remove special object from pack.
        for (var ii = 0; ii < objects.length; ++ii) {
          pack.removeObject(objects[ii]);
        }
      }
    }
    callback(pack, parent, exception);
  };

  if (opt_options.opt_async) {
    // TODO: Remove the 5. See deserializer.runBackground comments.
    deserializer.runBackground(client, pack, 5, finishCallback);
  } else {
    var exception = null;
    var errorCollector = o3djs.error.createErrorCollector(client);
    try {
      deserializer.run();
    } catch (e) {
      exception = e;
    }
    if (errorCollector.errors.length > 0) {
      exception = errorCollector.errors.join('\n') +
                  (exception ? ('\n' + exception.toString()) : '');
    }
    errorCollector.finish();
    finishCallback(pack, exception);
  }
};


/*
 * Copyright 2009, Google Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */


/**
 * @fileoverview This file contains various functions for helping setup
 * shapes for o3d.  It puts them in the "shape" module on the o3djs
 * object.
 *
 *     Note: This library is only a sample. It is not meant to be some official
 *     library. It is provided only as example code.
 *
 */

o3djs.provide('o3djs.shape');

o3djs.require('o3djs.math');
o3djs.require('o3djs.element');

/**
 * A Module for shapes.
 * @namespace
 */
o3djs.shape = o3djs.shape || {};

/**
 * Adds missing tex coord streams to a shape's elements.
 * @param {!o3d.Shape} shape Shape to add missing streams to.
 * @see o3djs.element.addMissingTexCoordStreams
 */
o3djs.shape.addMissingTexCoordStreams = function(shape) {
  var elements = shape.elements;
  for (var ee = 0; ee < elements.length; ++ee) {
    var element = elements[ee];
    o3djs.element.addMissingTexCoordStreams(element);
  }
};

/**
 * Sets the bounding box and z sort points of a shape's elements.
 * @param {!o3d.Shape} shape Shape to set info on.
 */
o3djs.shape.setBoundingBoxesAndZSortPoints = function(shape) {
  var elements = shape.elements;
  for (var ee = 0; ee < elements.length; ++ee) {
    var element = elements[ee];
    o3djs.element.setBoundingBoxAndZSortPoint(element);
  }
};

/**
 * Prepares a shape by setting its boundingBox, zSortPoint and creating
 * DrawElements.
 * @param {!o3d.Pack} pack Pack to manage created objects.
 * @param {!o3d.Shape} shape Shape to prepare.
 */
o3djs.shape.prepareShape = function(pack, shape) {
  shape.createDrawElements(pack, null);
  o3djs.shape.setBoundingBoxesAndZSortPoints(shape);
  o3djs.shape.addMissingTexCoordStreams(shape);
};

/**
 * Prepares all the shapes in the given pack by setting their boundingBox,
 * zSortPoint and creating DrawElements.
 * @param {!o3d.Pack} pack Pack to manage created objects.
 */
o3djs.shape.prepareShapes = function(pack) {
  var shapes = pack.getObjectsByClassName('o3d.Shape');
  for (var ss = 0; ss < shapes.length; ++ss) {
    o3djs.shape.prepareShape(pack, shapes[ss]);
  }
};

/**
 * Attempts to delete the parts of a shape that were created by
 * duplicateShape as well as any drawElements attached to it.
 * @param {!o3d.Shape} shape shape to delete.
 * @param {!o3d.Pack} pack Pack to release objects from.
 */
o3djs.shape.deleteDuplicateShape = function(shape, pack) {
   var elements = shape.elements;
   for (var ee = 0; ee < elements.length; ee++) {
     var element = elements[ee];
     var drawElements = element.drawElements;
     for (var dd = 0; dd < drawElements.length; dd++) {
       var drawElement = drawElements[dd];
       pack.removeObject(drawElement);
     }
     pack.removeObject(element);
   }
   pack.removeObject(shape);
};

/**
 * Copies a shape's elements and streambank or buffers so the two will share
 * streambanks, vertex and index buffers.
 * @param {!o3d.Pack} pack Pack to manage created objects.
 * @param {!o3d.Shape} source The Shape to copy.
 * @return {!o3d.Shape} the new copy of the shape.
 */
o3djs.shape.duplicateShape = function(pack, source) {
  var newShape = pack.createObject('Shape');
  var elements = source.elements;
  for (var ee = 0; ee < elements.length; ee++) {
    var newElement = o3djs.element.duplicateElement(pack, elements[ee]);
    newElement.owner = newShape;
  }
  newShape.createDrawElements(pack, null);
  return newShape;
};

/*
 * Copyright 2009, Google Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */


/**
 * @fileoverview This file provides support for deserializing (loading)
 *     transform graphs from JSON files.
 *
 */

o3djs.provide('o3djs.serialization');

o3djs.require('o3djs.error');
o3djs.require('o3djs.texture');

/**
 * A Module for deserializing a scene created by the sample o3dConverter.
 * @namespace
 */
o3djs.serialization = o3djs.serialization || {};

/**
 * The oldest supported version of the serializer. It isn't necessary to
 * increment this version whenever the format changes. Only change it when the
 * deserializer becomes incapable of deserializing an older version.
 * @type {number}
 */
o3djs.serialization.supportedVersion = 5;

/**
 * These are the values the sample o3dConverter uses to identify curve key
 * types.
 * @type {!Object}
 */
o3djs.serialization.CURVE_KEY_TYPES = {
  step: 1,
  linear: 2,
  bezier: 3};

/**
 * Options for deserialization.
 *
 * opt_animSource is an optional ParamFloat that will be bound as the source
 * param for all animation time params in the scene. opt_async is a bool that
 * will make the deserialization process async.
 *
 * @type {{opt_animSource: !o3d.ParamFloat, opt_async: boolean}}
 */
o3djs.serialization.Options = goog.typedef;

/**
 * A Deserializer incrementally deserializes a transform graph.
 * @constructor
 * @param {!o3d.Pack} pack The pack to deserialize into.
 * @param {!Object} json An object tree conforming to the JSON rules.
 */
o3djs.serialization.Deserializer = function(pack, json) {
  /**
   * The pack to deserialize into.
   * @type {!o3d.Pack}
   */
  this.pack = pack;

  /**
   * An object tree conforming to the JSON rules.
   * @type {!Object}
   */
  this.json = json;

  /**
   * The archive from which assets referenced from JSON are retreived.
   * @type {o3djs.io.ArchiveInfo}
   */
  this.archiveInfo = null;

  /**
   * Deserializes a Buffer .
   * @param {!o3djs.serialization.Deserializer} deserializer The deserializer.
   * @param {!Object} json The json for this buffer.
   * @param {string} type The type of buffer to create.
   * @param {string} uri The uri of the file containing the binary data.
   */
  function deserializeBuffer(deserializer, json, type, uri) {
    var object = deserializer.pack.createObject(type);
    if ('custom' in json) {
      if ('fieldData' in json.custom) {
        var fieldDataArray = json.custom.fieldData;
        if (fieldDataArray.length > 0) {
          var fields = [];
          // First create all the fields
          for (var ii = 0; ii < fieldDataArray.length; ++ii) {
            var data = fieldDataArray[ii];
            var field = object.createField(data.type, data.numComponents);
            fields.push(field);
            deserializer.addObject(data.id, field);
          }
          var firstData = fieldDataArray[0];
          var numElements = firstData.data.length / firstData.numComponents;
          object.allocateElements(numElements);
          // Now set the data.
          for (var ii = 0; ii < fieldDataArray.length; ++ii) {
            var data = fieldDataArray[ii];
            fields[ii].setAt(0, data.data);
          }
        }
      } else {
        var rawData = deserializer.archiveInfo.getFileByURI(uri);
        object.set(rawData,
                   json.custom.binaryRange[0],
                   json.custom.binaryRange[1] - json.custom.binaryRange[0]);
        for (var i = 0; i < json.custom.fields.length; ++i) {
          deserializer.addObject(json.custom.fields[i], object.fields[i]);
        }
      }
    }
    return object;
  }

  /**
   * A map from classname to a function that will create
   * instances of objects. Add entries to support additional classes.
   * @type {!Object}
   */
  this.createCallbacks = {
    'o3djs.DestinationBuffer': function(deserializer, json) {
      var object = deserializer.pack.createObject('o3d.VertexBuffer');
      if ('custom' in json) {
        for (var i = 0; i < json.custom.fields.length; ++i) {
          var fieldInfo = json.custom.fields[i]
          var field = object.createField(fieldInfo.type,
                                         fieldInfo.numComponents);
          deserializer.addObject(fieldInfo.id, field);
        }
        object.allocateElements(json.custom.numElements);
      }
      return object;
    },

    'o3d.VertexBuffer': function(deserializer, json) {
      return deserializeBuffer(
          deserializer, json, 'o3d.VertexBuffer', 'vertex-buffers.bin');
    },

    'o3d.SourceBuffer': function(deserializer, json) {
      return deserializeBuffer(
          deserializer, json, 'o3d.SourceBuffer', 'vertex-buffers.bin');
    },

    'o3d.IndexBuffer': function(deserializer, json) {
      return deserializeBuffer(
          deserializer, json, 'o3d.IndexBuffer', 'index-buffers.bin');
    },

    'o3d.Texture2D': function(deserializer, json) {
      if ('o3d.uri' in json.params) {
        var uri = json.params['o3d.uri'].value;
        var rawData = deserializer.archiveInfo.getFileByURI(uri);
        if (!rawData) {
          throw 'Could not find texture ' + uri + ' in the archive';
        }
        return o3djs.texture.createTextureFromRawData(pack, rawData, true);
      } else {
        return deserializer.pack.createTexture2D(
            json.custom.width,
            json.custom.height,
            json.custom.format,
            json.custom.levels,
            json.custom.renderSurfacesEnabled);
      }
    },

    'o3d.TextureCUBE': function(deserializer, json) {
      if ('o3d.negx_uri' in json.params) {
        // Cube map comprised of six separate textures.
        var param_names = [
            'o3d.posx_uri',
            'o3d.negx_uri',
            'o3d.posy_uri',
            'o3d.negy_uri',
            'o3d.posz_uri',
            'o3d.negz_uri'
        ];
        var rawDataArray = [];
        for (var i = 0; i < param_names.length; i++) {
          var uri = json.params[param_names[i]].value;
          var rawData = deserializer.archiveInfo.getFileByURI(uri);
          if (!rawData) {
            throw 'Could not find texture ' + uri + ' in the archive';
          }
          rawDataArray.push(rawData);
        }
        // Cube map faces should not be flipped.
        return o3djs.texture.createTextureFromRawDataArray(
            pack, rawDataArray, true, false);
      } else if ('o3d.uri' in json.params) {
        var uri = json.params['o3d.uri'].value;
        var rawData = deserializer.archiveInfo.getFileByURI(uri);
        if (!rawData) {
          throw 'Could not find texture ' + uri + ' in the archive';
        }
        return o3djs.texture.createTextureFromRawData(pack, rawData, true);
      } else {
        return deserializer.pack.createTextureCUBE(
            json.custom.edgeLength,
            json.custom.format,
            json.custom.levels,
            json.custom.renderSurfacesEnabled);
      }
    }
  };

  /**
   * A map from classname to a function that will initialize
   * instances of the given class from JSON data. Add entries to support
   * additional classes.
   * @type {!Object}
   */
  this.initCallbacks = {
    'o3d.Curve': function(deserializer, object, json) {
      if ('custom' in json) {
        if ('keys' in json.custom) {
          var keys = json.custom.keys;
          var stepType = o3djs.serialization.CURVE_KEY_TYPES.step;
          var linearType = o3djs.serialization.CURVE_KEY_TYPES.linear;
          var bezierType = o3djs.serialization.CURVE_KEY_TYPES.bezier;
          for (var ii = 0; ii < keys.length; ++ii) {
            var key = keys[ii];
            switch (key[0]) {
            case stepType:  // Step
              object.addStepKeys(key.slice(1));
              break;
            case linearType:  // Linear
              object.addLinearKeys(key.slice(1));
              break;
            case bezierType:  // Bezier
              object.addBezierKeys(key.slice(1));
              break;
            }
          }
        } else {
          var rawData = deserializer.archiveInfo.getFileByURI('curve-keys.bin');
          object.set(rawData,
                     json.custom.binaryRange[0],
                     json.custom.binaryRange[1] - json.custom.binaryRange[0]);
        }
      }
    },

    'o3d.Effect': function(deserializer, object, json) {
      var uriParam = object.getParam('o3d.uri');
      if (uriParam) {
        var rawData = deserializer.archiveInfo.getFileByURI(uriParam.value);
        if (!rawData) {
          throw 'Cannot find shader ' + uriParam.value + ' in archive.';
        }
        if (!object.loadFromFXString(rawData.stringValue)) {
          throw 'Cannot load shader ' + uriParam.value + ' in archive.';
        }
      }
    },

    'o3d.Skin': function(deserializer, object, json) {
      if ('custom' in json) {
        if ('binaryRange' in json.custom) {
          var rawData = deserializer.archiveInfo.getFileByURI('skins.bin');
          object.set(rawData,
                     json.custom.binaryRange[0],
                     json.custom.binaryRange[1] - json.custom.binaryRange[0]);
        }
      }
    },

    'o3d.SkinEval': function(deserializer, object, json) {
      if ('custom' in json) {
        for (var i = 0; i < json.custom.vertexStreams.length; ++i) {
          var streamJson = json.custom.vertexStreams[i];
          var field = deserializer.getObjectById(streamJson.stream.field);
          object.setVertexStream(streamJson.stream.semantic,
                                 streamJson.stream.semanticIndex,
                                 field,
                                 streamJson.stream.startIndex);
          if ('bind' in streamJson) {
            var source = deserializer.getObjectById(streamJson.bind);
            object.bindStream(source,
                              streamJson.stream.semantic,
                              streamJson.stream.semanticIndex);
          }
        }
      }
    },

    'o3d.StreamBank': function(deserializer, object, json) {
      if ('custom' in json) {
        for (var i = 0; i < json.custom.vertexStreams.length; ++i) {
          var streamJson = json.custom.vertexStreams[i];
          var field = deserializer.getObjectById(streamJson.stream.field);
          object.setVertexStream(streamJson.stream.semantic,
                                 streamJson.stream.semanticIndex,
                                 field,
                                 streamJson.stream.startIndex);
          if ('bind' in streamJson) {
            var source = deserializer.getObjectById(streamJson.bind);
            object.bindStream(source,
                              streamJson.stream.semantic,
                              streamJson.stream.semanticIndex);
          }
        }
      }
    }
  };

  if (!('version' in json)) {
    throw 'Version in JSON file was missing.';
  }

  if (json.version < o3djs.serialization.supportedVersion) {
    throw 'Version in JSON file was ' + json.version +
        ' but expected at least version ' +
        o3djs.serialization.supportedVersion + '.';
  }

  if (!('objects' in json)) {
    throw 'Objects array in JSON file was missing.';
  }

  /**
   * An array of all objects deserialized so far, indexed by object id. Id zero
   * means null.
   * @type {!Array.<(Object|undefined)>}
   * @private
   */
  this.objectsById_ = [null];

  /**
   * An array of objects deserialized so far, indexed by position in the JSON.
   * @type {!Array.<Object>}
   * @private
   */
  this.objectsByIndex_ = [];

  /**
   * Array of all classes present in the JSON.
   * @type {!Array.<string>}
   * @private
   */
  this.classNames_ = [];
  for (var className in json.objects) {
    this.classNames_.push(className);
  }

  /**
   * The current phase_ of deserialization. In phase_ 0, objects
   * are created and their ids registered. In phase_ 1, objects are
   * initialized from JSON data.
   * @type {number}
   * @private
   */
  this.phase_ = 0;

  /**
   * Index of the next class to be deserialized in classNames_.
   * @type {number}
   * @private
   */
  this.nextClassIndex_ = 0;

  /**
   * Index of the next object of the current class to be deserialized.
   * @type {number}
   * @private
   */
  this.nextObjectIndex_ = 0;

  /**
   * Index of the next object to be deserialized in objectsByIndex_.
   * @type {number}
   * @private
   */
  this.globalObjectIndex_ = 0;
};

/**
 * Get the object with the given id.
 * @param {number} id The id to lookup.
 * @return {(Object|undefined)} The object with the given id.
 */
o3djs.serialization.Deserializer.prototype.getObjectById = function(id) {
  return this.objectsById_[id];
};

/**
 * When a creation or init callback creates an object that the Deserializer
 * is not aware of, it can associate it with an id using this function, so that
 * references to the object can be resolved.
 * @param {number} id The is of the object.
 * @param {!Object} object The object to register.
 */
o3djs.serialization.Deserializer.prototype.addObject = function(
    id, object) {
  this.objectsById_[id] = object;
};

/**
 * Deserialize a value. Identifies reference values and converts
 * their object id into an object reference. Otherwise returns the
 * value unchanged.
 * @param {*} valueJson The JSON representation of the value.
 * @return {*} The JavaScript representation of the value.
 */
o3djs.serialization.Deserializer.prototype.deserializeValue = function(
    valueJson) {
  if (typeof(valueJson) === 'object') {
    if (valueJson === null) {
      return null;
    }

    var valueAsObject = /** @type {!Object} */ (valueJson);
    if ('length' in valueAsObject) {
      for (var i = 0; i != valueAsObject.length; ++i) {
        valueAsObject[i] = this.deserializeValue(valueAsObject[i]);
      }
      return valueAsObject;
    }

    var refId = valueAsObject['ref'];
    if (refId !== undefined) {
      var referenced = this.objectsById_[refId];
      if (referenced === undefined) {
        throw 'Could not find object with id ' + refId + '.';
      }
      return referenced;
    }
  }

  return valueJson;
};

/**
 * Sets the value of a param on an object or binds a param to another.
 * @param {!Object} object The object holding the param.
 * @param {(string|number)} paramName The name of the param.
 * @param {!Object} propertyJson The JSON representation of the value.
 * @private
 */
o3djs.serialization.Deserializer.prototype.setParamValue_ = function(
    object, paramName, propertyJson) {
  var param = object.getParam(paramName);
  if (param === null)
    return;

  var valueJson = propertyJson['value'];
  if (valueJson !== undefined) {
    param.value = this.deserializeValue(valueJson);
  }

  var bindId = propertyJson['bind'];
  if (bindId !== undefined) {
    var referenced = this.objectsById_[bindId];
    if (referenced === undefined) {
      throw 'Could not find output param with id ' + bindId + '.';
    }
    param.bind(referenced);
  }
};

/**
 * Creates a param on an object and adds it's id so that other objects can
 * reference it.
 * @param {!Object} object The object to hold the param.
 * @param {(string|number)} paramName The name of the param.
 * @param {!Object} propertyJson The JSON representation of the value.
 * @private
 */
o3djs.serialization.Deserializer.prototype.createAndIdentifyParam_ =
    function(object, paramName, propertyJson) {
  var propertyClass = propertyJson['class'];
  var param;
  if (propertyClass !== undefined) {
    param = object.createParam(paramName, propertyClass);
  } else {
    param = object.getParam(paramName);
  }

  var paramId = propertyJson['id'];
  if (paramId !== undefined && param !== null) {
    this.objectsById_[paramId] = param;
  }
};

/**
 * First pass: create all objects and additional params. We need two
 * passes to support references to objects that appear later in the
 * JSON.
 * @param {number} amountOfWork The number of loop iterations to perform of
 *     this phase_.
 * @private
 */
o3djs.serialization.Deserializer.prototype.createObjectsPhase_ =
     function(amountOfWork) {
  for (; this.nextClassIndex_ < this.classNames_.length;
       ++this.nextClassIndex_) {
    var className = this.classNames_[this.nextClassIndex_];
    var classJson = this.json.objects[className];
    var numObjects = classJson.length;
    for (; this.nextObjectIndex_ < numObjects; ++this.nextObjectIndex_) {
      if (amountOfWork-- <= 0)
        return;

      var objectJson = classJson[this.nextObjectIndex_];
      var object = undefined;
      if ('id' in objectJson) {
        object = this.objectsById_[objectJson.id];
      }
      if (object === undefined) {
        if (className in this.createCallbacks) {
          object = this.createCallbacks[className](this, objectJson);
        } else {
          object = this.pack.createObject(className);
        }
      }
      this.objectsByIndex_[this.globalObjectIndex_++] = object;
      if ('id' in objectJson) {
        this.objectsById_[objectJson.id] = object;
      }
      if ('params' in objectJson) {
        if ('length' in objectJson.params) {
          for (var paramIndex = 0; paramIndex != objectJson.params.length;
              ++paramIndex) {
            var paramJson = objectJson.params[paramIndex];
            this.createAndIdentifyParam_(object, paramIndex,
                                         paramJson);
          }
        } else {
          for (var paramName in objectJson.params) {
            var paramJson = objectJson.params[paramName];
            this.createAndIdentifyParam_(object, paramName, paramJson);
          }
        }
      }
    }
    this.nextObjectIndex_ = 0;
  }

  if (this.nextClassIndex_ === this.classNames_.length) {
    this.nextClassIndex_ = 0;
    this.nextObjectIndex_ = 0;
    this.globalObjectIndex_ = 0;
    ++this.phase_;
  }
};

/**
 * Second pass: set property and parameter values and bind parameters.
 * @param {number} amountOfWork The number of loop iterations to perform of
 *     this phase_.
 * @private
 */
o3djs.serialization.Deserializer.prototype.setPropertiesPhase_ = function(
    amountOfWork) {
  for (; this.nextClassIndex_ < this.classNames_.length;
       ++this.nextClassIndex_) {
    var className = this.classNames_[this.nextClassIndex_];
    var classJson = this.json.objects[className];
    var numObjects = classJson.length;
    for (; this.nextObjectIndex_ < numObjects; ++this.nextObjectIndex_) {
      if (amountOfWork-- <= 0)
        return;

      var objectJson = classJson[this.nextObjectIndex_];
      var object = this.objectsByIndex_[this.globalObjectIndex_++];
      if ('properties' in objectJson) {
        for (var propertyName in objectJson.properties) {
          if (propertyName in object) {
            var propertyJson = objectJson.properties[propertyName];
            var propertyValue = this.deserializeValue(propertyJson);
            object[propertyName] = propertyValue;
          }
        };
      }
      if ('params' in objectJson) {
        if ('length' in objectJson.params) {
          for (var paramIndex = 0; paramIndex != objectJson.params.length;
              ++paramIndex) {
            var paramJson = objectJson.params[paramIndex];
            this.setParamValue_(/** @type {!Object} */ (object),
                                paramIndex,
                                paramJson);
          }
        } else {
          for (var paramName in objectJson.params) {
            var paramJson = objectJson.params[paramName];
            this.setParamValue_(/** @type {!Object} */ (object),
                                paramName,
                                paramJson);
          }
        }
      }
      if (className in this.initCallbacks) {
        this.initCallbacks[className](this, object, objectJson);
      }
    }
    this.nextObjectIndex_ = 0;
  }

  if (this.nextClassIndex_ === this.classNames_.length) {
    this.nextClassIndex_ = 0;
    this.nextObjectIndex_ = 0;
    this.globalObjectIndex_ = 0;
    ++this.phase_;
  }
};

/**
 * Perform a certain number of iterations of the deserializer. Keep calling this
 * function until it returns false.
 * @param {number} opt_amountOfWork The number of loop iterations to run. If
 *     not specified, runs the deserialization to completion.
 * @return {boolean} Whether work remains to be done.
 */
o3djs.serialization.Deserializer.prototype.run = function(
    opt_amountOfWork) {
  if (!opt_amountOfWork) {
    while (this.run(10000)) {
    }
    return false;
  } else {
    switch (this.phase_) {
    case 0:
      this.createObjectsPhase_(opt_amountOfWork);
      break;
    case 1:
      this.setPropertiesPhase_(opt_amountOfWork);
      break;
    }
    return this.phase_ < 2;
  }
};

/**
 * Deserializes (loads) a transform graph in the background. Invokes
 * a callback function on completion passing the pack and the thrown
 * exception on failure or the pack and a null exception on success.
 * @param {!o3d.Client} client An O3D client object.
 * @param {!o3d.Pack} pack The pack to create the deserialized objects
 *     in.
 * @param {number} time The amount of the time (in seconds) the deserializer
 *     should aim to complete in.
 * @param {!function(o3d.Pack, *): void} callback The function that
 *     is called on completion. The second parameter is null on success or
 *     the thrown exception on failure.
 */
o3djs.serialization.Deserializer.prototype.runBackground = function(
    client, pack, time, callback) {
  // TODO: This seems like it needs to be more granular than the
  //    top level.
  // TODO: Passing in the time you want it to take seems counter
  //   intuitive. I want pass in a % of CPU so I can effectively say
  //   "deserialize this in such a way so as not to affect my app's
  //   performance".  callbacksRequired = numObjects / amountPerCallback where
  //   amountPerCallback = number I can do per frame and not affect performance
  //   too much.
  var workToDo = this.json.objects.length * 2;
  var timerCallbacks = time * 60;
  var amountPerCallback = workToDo / timerCallbacks;
  var intervalId;
  var that = this;
  function deserializeMore() {
    var exception = null;
    var finished = false;
    var failed = false;
    var errorCollector = o3djs.error.createErrorCollector(client);
    try {
      finished = !that.run(amountPerCallback);
    } catch(e) {
      failed = true;
      finished = true;
      exception = e;
    }
    if (errorCollector.errors.length > 0) {
      finished = true;
      exception = errorCollector.errors.join('\n') +
                  (exception ? ('\n' + exception.toString()) : '');
    }
    errorCollector.finish();
    if (finished) {
      window.clearInterval(intervalId);
      callback(pack, exception);
    }
  }

  intervalId = window.setInterval(deserializeMore, 1000 / 60);
};

/**
 * Creates a deserializer that will incrementally deserialize a
 * transform graph. The deserializer object has a method
 * called run that does a fixed amount of work and returns.
 * It returns true until the transform graph is fully deserialized.
 * It returns false from then on.
 * @param {!o3d.Pack} pack The pack to create the deserialized
 *     objects in.
 * @param {!Object} json An object tree conforming to the JSON rules.
 * @return {!o3djs.serialization.Deserializer} A deserializer object.
 */
o3djs.serialization.createDeserializer = function(pack, json) {
  return new o3djs.serialization.Deserializer(pack, json);
};

/**
 * Deserializes a transform graph.
 * @param {!o3d.Pack} pack The pack to create the deserialized
 *     objects in.
 * @param {!Object} json An object tree conforming to the JSON rules.
 */
o3djs.serialization.deserialize = function(pack, json) {
  var deserializer = o3djs.serialization.createDeserializer(pack, json);
  deserializer.run();
};

/**
 * Deserializes a single json object named 'scene.json' from a loaded
 * o3djs.io.ArchiveInfo.
 * @param {!o3djs.io.ArchiveInfo} archiveInfo Archive to load from.
 * @param {string} sceneJsonUri The relative URI of the scene JSON file within
 *     the archive.
 * @param {!o3d.Client} client An O3D client object.
 * @param {!o3d.Pack} pack The pack to create the deserialized objects
 *     in.
 * @param {!o3d.Transform} parent Transform to parent loaded stuff from.
 * @param {!function(!o3d.Pack, !o3d.Transform, *): void} callback A function
 *     that will be called when deserialization is finished. It will be passed
 *     the pack, the parent transform, and an exception which will be null on
 *     success.
 * @param {!o3djs.serialization.Options} opt_options Options.
 */
o3djs.serialization.deserializeArchive = function(archiveInfo,
                                                  sceneJsonUri,
                                                  client,
                                                  pack,
                                                  parent,
                                                  callback,
                                                  opt_options) {
  opt_options = opt_options || { };
  var jsonFile = archiveInfo.getFileByURI(sceneJsonUri);
  if (!jsonFile) {
    throw 'Could not find ' + sceneJsonUri + ' in archive';
  }
  var parsed = eval('(' + jsonFile.stringValue + ')');
  var deserializer = o3djs.serialization.createDeserializer(pack, parsed);

  deserializer.addObject(parsed.o3d_rootObject_root, parent);
  deserializer.archiveInfo = archiveInfo;

  var finishCallback = function(pack, exception) {
    if (!exception) {
      var objects = pack.getObjects('o3d.animSourceOwner', 'o3d.ParamObject');
      if (objects.length > 0) {
        // Rebind the output connections of the animSource to the user's param.
        if (opt_options.opt_animSource) {
          var animSource = objects[0].getParam('animSource');
          var outputConnections = animSource.outputConnections;
          for (var ii = 0; ii < outputConnections.length; ++ii) {
            outputConnections[ii].bind(opt_options.opt_animSource);
          }
        }
        // Remove special object from pack.
        for (var ii = 0; ii < objects.length; ++ii) {
          pack.removeObject(objects[ii]);
        }
      }
    }
    callback(pack, parent, exception);
  };

  if (opt_options.opt_async) {
    // TODO: Remove the 5. See deserializer.runBackground comments.
    deserializer.runBackground(client, pack, 5, finishCallback);
  } else {
    var exception = null;
    var errorCollector = o3djs.error.createErrorCollector(client);
    try {
      deserializer.run();
    } catch (e) {
      exception = e;
    }
    if (errorCollector.errors.length > 0) {
      exception = errorCollector.errors.join('\n') +
                  (exception ? ('\n' + exception.toString()) : '');
    }
    errorCollector.finish();
    finishCallback(pack, exception);
  }
};


/*
 * Copyright 2009, Google Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * @fileoverview This file contains functions to make it extremely simple
 *     to get something on the screen in o3d. The disadvantage is it
 *     is less flexible and creates inefficient assets.
 *
 * Example
 *
 * <pre>
 * &lt;html&gt;&lt;body&gt;
 * &lt;script type="text/javascript" src="o3djs/all.js"&gt;
 * &lt;/script&gt;
 * &lt;script type="text/javascript"&gt;
 * window.init = init;
 *
 * function init() {
 *   o3djs.base.makeClients(initStep2);
 * }
 *
 * function initStep2(clientElements) {
 *   var clientElement = clientElements[0];
 *
 *   // Create an o3djs.simple object to manage things in a simple way.
 *   g_simple = o3djs.simple.create(clientElement);
 *
 *   // Create a cube.
 *   g_cube = g_simple.createCube(50);
 *
 *   // DONE!
 * }
 * &lt;/script&gt;
 * &lt;div id="o3d" style="width: 600px; height: 600px"&gt;&lt;/div&gt;
 * &lt;/body&gt;&lt;/html&gt;
 * </pre>
 *
 * Some more examples:
 *
 *   g_cube.setDiffuseColor(1, 0, 0, 1);  // Cube is now red.
 *   g_cube.transform.translate(10, 0, 0);  // Cube translates.
 *   g_cube.loadTexture('http://google.com/someimage.jpg"); // Cube is textured
 *
 *
 *     Note: This library is only a sample. It is not meant to be some official
 *     library. It is provided only as example code.
 *
 */

o3djs.provide('o3djs.simple');

o3djs.require('o3djs.math');
o3djs.require('o3djs.material');
o3djs.require('o3djs.effect');
o3djs.require('o3djs.shape');
o3djs.require('o3djs.util');
o3djs.require('o3djs.rendergraph');
o3djs.require('o3djs.pack');
o3djs.require('o3djs.primitives');
o3djs.require('o3djs.io');
o3djs.require('o3djs.scene');
o3djs.require('o3djs.camera');

/**
 * A Module for using o3d in a very simple way.
 * @namespace
 */
o3djs.simple = o3djs.simple || {};

/**
 * Creates an o3djs.simple library object that helps manage o3d
 * for the extremely simple cases.
 *
 * <pre>
 * &lt;html&gt;&lt;body&gt;
 * &lt;script type="text/javascript" src="o3djs/all.js"&gt;
 * &lt;/script&gt;
 * &lt;script type="text/javascript"&gt;
 * windows.onload = init;
 *
 * function init() {
 *   o3djs.base.makeClients(initStep2);
 * }
 *
 * function initStep2(clientElements) {
 *   var clientElement = clientElements[0];
 *
 *   // Create an o3djs.simple object to manage things in a simple way.
 *   g_simple = o3djs.simple.create(clientElement);
 *
 *   // Create a cube.
 *   g_cube = g_simple.createCube(50);
 *
 *   // DONE!
 * }
 * &lt;/script&gt;
 * &lt;div id="o3d" style="width: 600px; height: 600px"&gt;&lt;/div&gt;
 * &lt;/body&gt;&lt;/html&gt;
 * </pre>
 *
 * @param {!Element} clientObject O3D.Plugin Object.
 * @return {!o3djs.simple.SimpleInfo} Javascript object that hold info for the
 *     simple library.
 *
 */
o3djs.simple.create = function(clientObject) {
  return new o3djs.simple.SimpleInfo(clientObject);
};

/**
 * A SimpleInfo contains information for the simple library.
 * @constructor
 * @param {!Element} clientObject O3D.Plugin Object.
 */
o3djs.simple.SimpleInfo = function(clientObject) {
  /**
   * The O3D Element.
   * @type {!Element}
   */
  this.clientObject = clientObject;

  /**
   * The O3D namespace object.
   * @type {!o3d}
   */
  this.o3d = clientObject.o3d;

  /**
   * The client object used by the SimpleInfo
   * @type {!o3d.Client}
   */
  this.client = clientObject.client;

  /**
   * The main pack for this SimpleInfo.
   * @type {!o3d.Pack}
   */
  this.pack = this.client.createPack();

  /**
   * The root transform for this SimpleInfo
   * @type {!o3d.Transform}
   */
  this.root = this.pack.createObject('Transform');

  /**
   * The ViewInfo created by this SimpleInfo.
   * @type {!o3djs.rendergraph.ViewInfo}
   */
  this.viewInfo = o3djs.rendergraph.createBasicView(
      this.pack,
      this.root,
      this.client.renderGraphRoot);

  /**
   * The list of objects that need to have an update function called indexed by
   * id.
   * @private
   * @type {!Object.<number,!o3djs.simple.SimpleObject>}
   */
  this.updateObjects_ = { };

  /**
   * The next available id for objects.
   * @private
   * @type {number}
   */
  this.nextId_ = 1;

  // Create 1 non-textured material and 1 textured material.
  //
  // TODO: Refactor.
  // This is slightly backward. What we really want is to be able to request
  // an effect of a specific type from our shader builder but the current shader
  // builder expects a material to already exist. So, we create a material here
  // just to pass it to the shader builder, then we keep the effect it created
  // but throw away the material.
  //
  // TODO: Fix shader builder so it creates diffuseColorMult,
  //   diffuseColorOffset and  diffuseTexture so
  //   diffuse = diffuseTexture * diffuseColorMult + diffuseColorOffset.

  var material = this.pack.createObject('Material');

  o3djs.effect.attachStandardShader(this.pack,
                                         material,
                                         [0, 0, 0],
                                         'phong');

  this.nonTexturedEffect_ = material.effect;
  this.pack.removeObject(material);

  var material = this.pack.createObject('Material');
  var samplerParam = material.createParam('diffuseSampler', 'ParamSampler');
  o3djs.effect.attachStandardShader(this.pack,
                                         material,
                                         [0, 0, 0],
                                         'phong');

  this.texturedEffect_ = material.effect;
  this.pack.removeObject(material);

  this.globalParamObject = this.pack.createObject('ParamObject');
  this.lightWorldPosParam = this.globalParamObject.createParam('lightWorldPos',
                                                               'ParamFloat3');
  this.lightColorParam = this.globalParamObject.createParam('lightColor',
                                                            'ParamFloat4');
  this.setLightColor(1, 1, 1, 1);
  this.setLightPosition(255, 150, 150);  // same as camera.

  // Attempt to setup a resonable default perspective matrix.
  this.zNear = 0.1;
  this.zFar = 1000;
  this.fieldOfView = o3djs.math.degToRad(45);
  this.setPerspectiveMatrix_();

  // Attempt to setup a resonable default view.
  this.cameraPosition = [250, 150, 150];
  this.cameraTarget = [0, 0, 0];
  this.cameraUp = [0, 1, 0];
  this.setViewMatrix_();

  var that = this;

  this.client.setRenderCallback(function(renderEvent) {
        var elapsedTime = Math.min(renderEvent.elapsedTime, 0.1);
        that.onRender_(elapsedTime);
      });
};

/**
 * Gets the next available id.
 * @return {number} The next available id.
 */
o3djs.simple.SimpleInfo.prototype.getNextId = function() {
  return this.nextId_++;
};

/**
 * Creates a SimpleShape. A SimpleShape manages a transform with 1 shape that
 * holds 1 primitive and 1 unique material.
 * @param {!o3d.Shape} shape that holds 1 primitive and 1 unique material.
 * @return {!o3djs.simple.SimpleShape} the created SimpleShape.
 */
o3djs.simple.SimpleInfo.prototype.createSimpleShape = function(shape) {
  shape.createDrawElements(this.pack, null);
  var transform = this.pack.createObject('Transform');
  transform.parent = this.root;
  transform.addShape(shape);
  return new o3djs.simple.SimpleShape(this, transform);
};

/**
 * The on render handler for a SimpleInfo.
 * @private
 * @param {number} elapsedTime Time elapsed since last frame.
 */
o3djs.simple.SimpleInfo.prototype.onRender_ = function(elapsedTime) {
  for (var sid in this.updateObjects_) {
    var id = /** @type {number} */ (sid);
    this.updateObjects_[id].onUpdate(elapsedTime);
  }
};

/**
 * Register an object for updating. You should not call this directly.
 * @param {!o3djs.simple.SimpleObject} simpleObject SimpleObject to register.
 */
o3djs.simple.SimpleInfo.prototype.registerObjectForUpdate =
    function (simpleObject) {
  this.updateObjects_[simpleObject.id] = simpleObject;
};

/**
 * Unregister an object for updating. You should not call this directly.
 * @param {!o3djs.simple.SimpleObject} simpleObject SimpleObject to register.
 */
o3djs.simple.SimpleInfo.prototype.unregisterObjectForUpdate =
    function (simpleObject) {
  delete this.updateObjects_[simpleObject.id];
};

/**
 * Sets the perspective matrix.
 * @private
 */
o3djs.simple.SimpleInfo.prototype.setPerspectiveMatrix_ = function() {
  this.viewInfo.drawContext.projection = o3djs.math.matrix4.perspective(
      this.fieldOfView,
      this.client.width / this.client.height,
      this.zNear,
      this.zFar);
};

/**
 * Sets the view matrix.
 * @private
 */
o3djs.simple.SimpleInfo.prototype.setViewMatrix_ = function() {
  this.viewInfo.drawContext.view = o3djs.math.matrix4.lookAt(
      this.cameraPosition,
      this.cameraTarget,
      this.cameraUp);
};

/**
 * Sets the field of view
 * @param {number} fieldOfView in Radians.
 *
 * For degrees use setFieldOfView(o3djs.math.degToRad(degrees)).
 */
o3djs.simple.SimpleInfo.prototype.setFieldOfView =
  function(fieldOfView) {
  this.fieldOfView = fieldOfView;
  this.setPerspectiveMatrix_();
};

/**
 * Sets the z clip range.
 * @param {number} zNear near z value.
 * @param {number} zFar far z value.
 */
o3djs.simple.SimpleInfo.prototype.setZClip = function(zNear, zFar) {
  this.zNear = zNear;
  this.zFar = zFar;
  this.setPerspectiveMatrix_();
};

/**
 * Sets the light position
 * @param {number} x x position.
 * @param {number} y y position.
 * @param {number} z z position.
 */
o3djs.simple.SimpleInfo.prototype.setLightPosition = function(x, y, z) {
  this.lightWorldPosParam.set(x, y, z);
};

/**
 * Sets the light color
 * @param {number} r red (0-1).
 * @param {number} g green (0-1).
 * @param {number} b blue (0-1).
 * @param {number} a alpha (0-1).
 */
o3djs.simple.SimpleInfo.prototype.setLightColor = function(r, g, b, a) {
  this.lightColorParam.set(r, g, b, a);
};

/**
 * Sets the camera position
 * @param {number} x x position.
 * @param {number} y y position.
 * @param {number} z z position.
 */
o3djs.simple.SimpleInfo.prototype.setCameraPosition = function(x, y, z) {
  this.cameraPosition = [x, y, z];
  this.setViewMatrix_();
};

/**
 * Sets the camera target
 * @param {number} x x position.
 * @param {number} y y position.
 * @param {number} z z position.
 */
o3djs.simple.SimpleInfo.prototype.setCameraTarget = function(x, y, z) {
  this.cameraTarget = [x, y, z];
  this.setViewMatrix_();
};

/**
 * Sets the camera up
 * @param {number} x x position.
 * @param {number} y y position.
 * @param {number} z z position.
 */
o3djs.simple.SimpleInfo.prototype.setCameraUp = function(x, y, z) {
  this.cameraUp = [x, y, z];
  this.setViewMatrix_();
};

/**
 * Create meterial from effect.
 * @param {!o3d.Effect} effect Effect to use for material.
 * @return {!o3d.Material} The created material.
 */
o3djs.simple.SimpleInfo.prototype.createMaterialFromEffect =
    function(effect) {
  var material = this.pack.createObject('Material');
  material.drawList = this.viewInfo.performanceDrawList;
  material.effect = effect;
  effect.createUniformParameters(material);
  material.getParam('lightWorldPos').bind(this.lightWorldPosParam);
  material.getParam('lightColor').bind(this.lightColorParam);
  return material;
};

/**
 * Create a new non-textured material.
 * @param {string} type Type of material 'phong', 'lambert', 'constant'.
 * @return {!o3d.Material} The created material.
 */
o3djs.simple.SimpleInfo.prototype.createNonTexturedMaterial =
    function(type) {
  var material = this.createMaterialFromEffect(this.nonTexturedEffect_);
  material.getParam('diffuse').set(1, 1, 1, 1);
  material.getParam('emissive').set(0, 0, 0, 1);
  material.getParam('ambient').set(0, 0, 0, 1);
  material.getParam('specular').set(1, 1, 1, 1);
  material.getParam('shininess').value = 20;
  return material;
};

/**
 * @param {string} type Type of material 'phong', 'lambert', 'constant'.
 * @return {!o3d.Material} The created material.
 */
o3djs.simple.SimpleInfo.prototype.createTexturedMaterial =
    function(type) {
  var material = this.createMaterialFromEffect(this.texturedEffect_);
  var samplerParam = material.getParam('diffuseSampler');
  var sampler = this.pack.createObject('Sampler');
  samplerParam.value = sampler;
  return material;
};

/**
 * Creates a cube and adds it to the root of this SimpleInfo's transform graph.
 * @param {number} size Width, height and depth of the cube.
 * @return {!o3djs.simple.SimpleShape} A Javascript object to manage the
 *     shape.
 */
o3djs.simple.SimpleInfo.prototype.createCube = function(size) {
  var material = this.createNonTexturedMaterial('phong');
  var shape = o3djs.primitives.createCube(this.pack, material, size);
  return this.createSimpleShape(shape);
};

/**
 * Creates a box and adds it to the root of this SimpleInfo's transform graph.
 * @param {number} width Width of the box.
 * @param {number} height Height of the box.
 * @param {number} depth Depth of the box.
 * @return {!o3djs.simple.SimpleShape} A Javascript object to manage the
 *     shape.
 */
o3djs.simple.SimpleInfo.prototype.createBox = function(width,
                                                       height,
                                                       depth) {
  var material = this.createNonTexturedMaterial('phong');
  var shape = o3djs.primitives.createBox(this.pack,
                                         material,
                                         width,
                                         height,
                                         depth);
  return this.createSimpleShape(shape);
};

/**
 * Creates a sphere and adds it to the root of this SimpleInfo's transform
 * graph.
 * @param {number} radius radius of sphere.
 * @param {number} smoothness determines the number of subdivisions.
 * @return {!o3djs.simple.SimpleShape} A Javascript object to manage the
 *     shape.
 */
o3djs.simple.SimpleInfo.prototype.createSphere = function(radius,
                                                          smoothness) {
  var material = this.createNonTexturedMaterial('phong');
  var shape = o3djs.primitives.createSphere(this.pack,
                                            material,
                                            radius,
                                            smoothness * 2,
                                            smoothness);
  return this.createSimpleShape(shape);
};

/**
 * Loads a scene from a URL.
 * @param {string} url Url of scene to load.
 * @param {!function(o3djs.simple.SimpleScene, *): void} callback a callback to
 *     call when the scene is loaded. The first argument will be null if the
 *     scene failed to load and last object will be an exception.
 * @return {!o3djs.io.LoadInfo}
 */
o3djs.simple.SimpleInfo.prototype.loadScene = function(url, callback) {
  var pack = this.client.createPack();
  var root = pack.createObject('Transform');
  var paramObject = pack.createObject('ParamObject');
  var animTimeParam = paramObject.createParam('animTime', 'ParamFloat');
  var that = this;

  var prepScene = function(pack, root, exception) {
    var simpleScene = null;
    if (exception) {
      pack.destroy();
    } else {
      simpleScene = new o3djs.simple.SimpleScene(
          that, url, pack, root, paramObject);
    }
    callback(simpleScene, exception);
  };

  return o3djs.scene.loadScene(
      this.client,
      pack,
      root,
      url,
      prepScene,
      /** @type {!o3djs.serialization.Options} */
      ({opt_animSource: animTimeParam}));
};

/**
 * Moves the camera so everything in the current scene is visible.
 */
o3djs.simple.SimpleInfo.prototype.viewAll = function() {
  var bbox = o3djs.util.getBoundingBoxOfTree(this.root);
  var target = o3djs.math.lerpVector(bbox.minExtent, bbox.maxExtent, 0.5);
  this.setCameraTarget(target[0], target[1], target[2]);
  // TODO: Refactor this so it takes a vector from the current camera
  // position to the center of the scene and moves the camera along that
  // vector away from the center of the scene until for the given fieldOfView
  // everything is visible.
  var diag = o3djs.math.distance(bbox.minExtent, bbox.maxExtent);
  var eye = o3djs.math.addVector(target, [
      bbox.maxExtent[0],
      bbox.minExtent[1] + 0.5 * diag,
      bbox.maxExtent[2]]);
  this.setCameraPosition(eye[0], eye[1], eye[2]);
  this.setZClip(diag / 1000, diag * 10);
};

/**
 * An object for managing things simply.
 * @constructor
 */
o3djs.simple.SimpleObject = function() {
};

/**
 * Initializes a SimpleObject.
 * @param {!o3djs.simple.SimpleInfo} simpleInfo The SimpleInfo to manage this
 *     object.
 * @param {!o3d.Transform} transform Transform that orients this object.
 */
o3djs.simple.SimpleObject.prototype.init = function(simpleInfo, transform) {
  /**
   * The SimpleInfo managing this object.
   * @type {!o3djs.simple.SimpleInfo}
   */
  this.simpleInfo = simpleInfo;

  /**
   * The Id for this SimpleInfo.
   * @type {number}
   */
  this.id = simpleInfo.getNextId();

  /**
   * The Transform that orients this object.
   * @type {!o3d.Transform}
   */
  this.transform = transform;

  /**
   * The update callback for this object.
   * @private
   * @type {?function(number): void}
   */
  this.updateCallback_ = null;

  /**
   * The pick callback for this object.
   * @private
   * @type {?function(number): void}
   */
  this.pickCallback_ = null;
};

/**
 * Registers on an on picked callback.
 * @param {!function(!o3djs.simple.SimpleObject): void} onPickedCallback A
 *     function called when this object is picked.
 */
o3djs.simple.SimpleObject.prototype.onPicked = function(onPickedCallback) {
  throw 'not implemented';
};

/**
 * Used to call the update callback on this object. You should not call this
 * directly. Use o3djs.simple.SimpleObject.setOnUpdate to add your own update
 * callback.
 * @param {number} elapsedTime ElapsedTime in seconds for this frame.
 * @see o3djs.simple.SimpleObject.setOnUpdate
 */
o3djs.simple.SimpleObject.prototype.onUpdate = function(elapsedTime) {
  if (this.updateCallback_) {
    this.updateCallback_(elapsedTime);
  }
};

/**
 * Sets a function to be called every frame for this object.
 * @param {function(number): void} onUpdateCallback A function that is passed
 *     the elapsed time in seconds. Pass in null to clear the callback function.
 * @return {(function(number): void|null)} The previous callback function.
 */
o3djs.simple.SimpleObject.prototype.setOnUpdate = function(onUpdateCallback) {
  if (onUpdateCallback) {
    this.simpleInfo.registerObjectForUpdate(this);
  } else {
    this.simpleInfo.unregisterObjectForUpdate(this);
  }
  var oldCallback = this.updateCallback_;
  this.updateCallback_ = onUpdateCallback;
  return oldCallback;
};

/**
 * A SimpleShape manages a transform with 1 shape that holds 1 primitive
 * and 1 unique material.
 * @constructor
 * @extends {o3djs.simple.SimpleObject}
 * @param {!o3djs.simple.SimpleInfo} simpleInfo The SimpleInfo to manage this
 *     shape.
 * @param {!o3d.Transform} transform Transform with 1 shape that holds 1
 *     primitive and 1 unique material.
 */
o3djs.simple.SimpleShape = function(simpleInfo, transform) {
  this.init(simpleInfo, transform);
};

o3djs.simple.SimpleShape.prototype = new o3djs.simple.SimpleObject();

/**
 * Gets the current material for this shape.
 * @return {o3d.Material} the material for this SimpleShape.
 */
o3djs.simple.SimpleShape.prototype.getMaterial = function() {
  return this.transform.shapes[0].elements[0].material;
};

/**
 * Sets the material for this SimpleShape, deleting any old one.
 * @param {!o3d.Material} material new material.
 */
o3djs.simple.SimpleShape.prototype.setMaterial = function(material) {
  var old_material = this.getMaterial();
  if (old_material != null) {
    this.simpleInfo.pack.removeObject(old_material);
  }
  this.transform.shapes[0].elements[0].material = material;
};

/**
 * Sets the diffuse color of this shape.
 * @param {number} r Red (0-1).
 * @param {number} g Green (0-1).
 * @param {number} b Blue (0-1).
 * @param {number} a Alpha (0-1).
 */
o3djs.simple.SimpleShape.prototype.setDiffuseColor =
    function(r, g, b, a) {
  var material = this.getMaterial();
  material.getParam('diffuse').set(r, g, b, a);
  if (a < 1) {
    material.drawList = this.simpleInfo.viewInfo.zOrderedDrawList;
  } else {
    material.drawList = this.simpleInfo.viewInfo.performanceDrawList;
  }
};

/**
 * Gets the texture on this shape.
 * @return {o3d.Texture} The texture on this shape. May be null.
 */
o3djs.simple.SimpleShape.prototype.getTexture = function() {
  var material = this.getMaterial();
  var samplerParam = material.getParam('diffuseSampler');
  if (samplerParam.className == 'o3d.ParamSampler') {
    return samplerParam.texture;
  }
  return null;
};

/**
 * Loads a texture onto the given shape. It will replace the material
 * if it needs to with one that supports a texture. Note that the texture
 * is loaded asynchronously and so the result of this call may appear several
 * seconds after it is called depending on how long it takes to download the
 * texture.
 * @param {string} url Url of texture.
 */
o3djs.simple.SimpleShape.prototype.loadTexture = function(url) {
  var that = this;
  o3djs.io.loadTexture(
      this.simpleInfo.pack,
      url,
      function(texture, exception) {
        if (!exception) {
          // See if this is a textured material.
          var material = that.getMaterial();
          if (material.effect != that.simpleInfo.texturedEffect_) {
            // replace the material with a textured one.
            var new_material = that.simpleInfo.createTexturedMaterial('phong');
            new_material.copyParams(material);
            // Reset the effect since copy Params just copied the non-textured
            // one.
            new_material.effect = that.simpleInfo.texturedEffect_;
            that.setMaterial(new_material);
            material = new_material;
          }
          var samplerParam = material.getParam('diffuseSampler');
          samplerParam.value.texture = texture;
        } else {
          alert('Load texture file returned failure. \n' + exception);
        }
      });
};

/**
 * An object to simply manage a scene.
 * @constructor
 * @extends {o3djs.simple.SimpleObject}
 * @param {!o3djs.simple.SimpleInfo} simpleInfo The SimpleInfo to manage this
 *     scene.
 * @param {string} url Url scene was loaded from.
 * @param {!o3d.Pack} pack Pack that is managing scene.
 * @param {!o3d.Transform} root Root transform of scene.
 * @param {!o3d.ParamObject} paramObject the holds global parameters.
 */
o3djs.simple.SimpleScene = function(
    simpleInfo, url, pack, root, paramObject) {
  this.init(simpleInfo, root);
  /**
   * The url this scene was loaded from.
   * @type {string}
   */
  this.url = url;

  /**
   * The pack managing this scene.
   * @type {!o3d.Pack}
   */
  this.pack = pack;

  /**
   * The param object holding global parameters for this scene.
   * @type {!o3d.ParamObject}
   */
  this.paramObject = paramObject;

  /**
   * The animation parameter for this scene.
   * @type {!o3d.ParamFloat}
   */
  this.animTimeParam = paramObject.getParam('animTime');

  o3djs.pack.preparePack(pack, simpleInfo.viewInfo);

  this.cameraInfos_ = o3djs.camera.getCameraInfos(
      root,
      simpleInfo.client.width,
      simpleInfo.client.height);


  /**
   * Binds a param if it exists.
   * @param {!o3d.ParamObject} paramObject The object that has the param.
   * @param {string} paramName name of param.
   * @param {!o3d.Param} sourceParam The param to bind to.
   */
  var bindParam = function(paramObject, paramName, sourceParam) {
    var param = paramObject.getParam(paramName);
    if (param) {
      param.bind(sourceParam);
    }
  }

  var materials = pack.getObjectsByClassName('o3d.Material');
  for (var m = 0; m < materials.length; ++m) {
    var material = materials[m];
    bindParam(material, 'lightWorldPos', simpleInfo.lightWorldPosParam);
    bindParam(material, 'lightColor', simpleInfo.lightColorParam);
  }

  this.transform.parent = this.simpleInfo.root;
};

o3djs.simple.SimpleScene.prototype = new o3djs.simple.SimpleObject();

/**
 * Sets the animation time for the scene.
 * @param {number} time Animation time in seconds.
 */
o3djs.simple.SimpleScene.prototype.setAnimTime = function(time) {
  this.animTimeParam.value = time;
};


/*
 * Copyright 2009, Google Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */


/**
 * @fileoverview This is a simple unit testing library used to test the
 * sample utilities
 *
 *
 */
o3djs.provide('o3djs.test');

/**
 * A unit testing library
 */
o3djs.test = o3djs.test || {};

/**
  * Class of errors thrown by assertions
  * @param {string} message The assertion message.
  * @this o3djs.test.AssertionError
  */
o3djs.test.AssertionError = function(message) {
  this.message = message;

  /**
    * Returns the error message.
    * @return {String} The error message.
    */
  this.toString = function() {
    return message;
  };
};

/**
  * Runs all the tests found in the given suite. Every function with a
  * name beginning with 'test' is considered to be a test.
  * @param {!Object} suite The object containing the test suite.
  * @param {!Object} opt_reporter An optional object to which the results
  *    of the test run are reported.
  * @return {boolean} Whether all the tests passed.
  */
o3djs.test.runTests = function(suite, opt_reporter) {
  try {
    opt_reporter = opt_reporter || o3djs.test.documentReporter;

    var passCount = 0;
    var failCount = 0;
    for (var propertyName in suite) {
      if (propertyName.substring(0, 4) !== 'test')
        continue;

      if (typeof(suite[propertyName]) !== 'function')
        continue;

      try {
        suite[propertyName]();
      } catch (e) {
        ++failCount;
        opt_reporter.reportFail(propertyName, String(e));
        continue;
      }

      ++passCount;
      opt_reporter.reportPass(propertyName);
    }

    opt_reporter.reportSummary(passCount, failCount);
    return failCount == 0;
  }
  catch (e) {
    return false;
  }
};

/**
  * Converts a value to the string representation used in assertion messages.
  * @private
  * @param {*} value The value to convert.
  * @param {number} opt_depth The depth of references to follow for nested
  *     objects. Defaults to 3.
  * @return {string} The string representation.
  */
o3djs.test.valueToString_ = function(value, opt_depth) {
  if (opt_depth === undefined) {
     opt_depth = 3;
  }
  var string;
  if (typeof(value) === 'object') {
    if (value !== null) {
      if (opt_depth === 0) {
        string = '?';
      } else {
        if (o3djs.base.isArray(value)) {
          var valueAsArray = /** @type {!Array.<*>} */ (value);
          string = '[';
          var separator = '';
          for (var i = 0; i < valueAsArray.length; ++i) {
            string += separator +
                o3djs.test.valueToString_(valueAsArray[i], opt_depth - 1);
            separator = ', ';
          }
          string += ']';
        } else {
          var valueAsObject = /** @type {!Object} */ (value);
          string = '{';
          var separator = '';
          for (var propertyName in valueAsObject) {
            if (typeof(valueAsObject[propertyName]) !== 'function') {
              string += separator + propertyName + ': ' +
                  o3djs.test.valueToString_(valueAsObject[propertyName],
                                            opt_depth - 1);
              separator = ', ';
            }
          }
          string += '}';
        }
      }
    } else {
      string = "null";
    }
  } else if (typeof(value) === 'string') {
    string = '"' + value + '"';
  } else {
    string = String(value);
  }
  return string;
};

/**
  * Asserts that a value is true from within a test
  * @param {boolean} value The value to test.
  */
o3djs.test.assertTrue = function(value) {
  if (!value) {
    throw new o3djs.test.AssertionError(
        'assertTrue failed for ' +
            o3djs.test.valueToString_(value));
  }
};

/**
  * Asserts that a value is false from within a test
  * @param {boolean} value The value to test.
  */
o3djs.test.assertFalse = function(value) {
  if (value) {
    throw new o3djs.test.AssertionError(
        'assertFalse failed for ' +
            o3djs.test.valueToString_(value));
  }
};

/**
  * Asserts that a value is null from within a test
  * @param {*} value The value to test.
  */
o3djs.test.assertNull = function(value) {
  if (value !== null) {
    throw new o3djs.test.AssertionError(
        'assertNull failed for ' +
            o3djs.test.valueToString_(value));
  }
};

/**
  * Asserts that an expected value is equal to an actual value.
  * @param {*} expected The expected value.
  * @param {*} actual The actual value.
  */
o3djs.test.assertEquals = function(expected, actual) {
  if (expected !== actual) {
    throw new o3djs.test.AssertionError(
        'assertEquals failed: expected ' +
            o3djs.test.valueToString_(expected) + ' but got ' +
            o3djs.test.valueToString_(actual));
  }
};

/**
  * Asserts that an expected value is close to an actual value
  * within a tolerance of 0.001.
  * @param {number} expected The expected value.
  * @param {number} actual The actual value.
  */
o3djs.test.assertClose = function(expected, actual) {
  if (actual < expected - 0.001 || actual > expected + 0.001) {
    throw new o3djs.test.AssertionError(
        'assertClose failed: expected ' +
            o3djs.test.valueToString_(expected) + ' but got ' +
            o3djs.test.valueToString_(actual));
  }
};

/**
  * Determines whether the elements of a pair of arrays are equal.
  * @private
  * @param {!Array.<*>} expected The expected array.
  * @param {!Array.<*>} actual The actual array.
  * @return {boolean} Whether the arrays are equal.
  */
o3djs.test.compareArrays_ = function(expected, actual) {
  if (expected.length !== actual.length) {
    return false;
  }
  for (var i = 0; i != expected.length; ++i) {
    if (o3djs.base.isArray(expected[i]) && o3djs.base.isArray(actual[i])) {
      var expectedAsArray = /** @type {!Array.<*>} */ (expected[i]);
      var actualAsArray = /** @type {!Array.<*>} */ (actual[i]);
      if (!o3djs.test.compareArrays_(expectedAsArray, actualAsArray)) {
        return false;
      }
    } else if (expected[i] !== actual[i]) {
      return false;
    }
  }
  return true;
};

/**
  * Asserts that an expected array is equal to an actual array.
  * @param {!Array.<*>} expected The expected array.
  * @param {!Array.<*>} actual The actual array.
  */
o3djs.test.assertArrayEquals = function(expected, actual) {
  if (!o3djs.base.isArray(expected)) {
    throw new o3djs.test.AssertionError(
        'assertArrayEquals failed: expected value ' +
            o3djs.test.valueToString_(expected) +
            ' is not an array');
  }
  if (!o3djs.base.isArray(actual)) {
    throw new o3djs.test.AssertionError(
        'assertArrayEquals failed: actual value ' +
            o3djs.test.valueToString_(actual) +
            ' is not an array');
  }
  if (!o3djs.test.compareArrays_(expected, actual)) {
    throw new o3djs.test.AssertionError(
        'assertArrayEquals failed: expected ' +
            o3djs.test.valueToString_(expected) + ' but got ' +
            o3djs.test.valueToString_(actual));
  }
};

/**
 * Creates a DOM paragraph object for the given text and color.
 * @private
 * @param {string} text The text of the message.
 * @param {string} opt_color The optional color of the message.
 * @return {!Element} A DOM paragraph object.
 */
o3djs.test.createReportParagraph_ = function(text, opt_color) {
  var textNode = document.createTextNode(text);
  var paragraph = document.createElement('p');
  paragraph.appendChild(textNode);
  if (opt_color !== undefined) {
    paragraph.style.color = opt_color;
  }
  return paragraph;
};

/**
 * A reporter that reports messages to the document (i.e. the DOM).
 * @type {!Object}
 */
o3djs.test.documentReporter = {
  /**
   * A Report div.
   * @private
   * @this {Object}
   */
  getReportDiv_: function() {
    if (!this.reportDiv_) {
      this.reportDiv_ = document.createElement('div');
      document.body.appendChild(this.reportDiv_);
    }
    return this.reportDiv_;
  },
  /**
   * Reports a test passed.
   * @param {string} testName The name of the test.
   * @this {Object}
   */
  reportPass: function(testName) {
    var paragraph = o3djs.test.createReportParagraph_(
        testName + ' : PASS', 'green');
    this.getReportDiv_().appendChild(paragraph);
  },
  /**
   * Reports a test failed.
   * @param {string} testName The name of the test.
   */
  reportFail: function(testName, message) {
    var paragraph = o3djs.test.createReportParagraph_(
        testName + ' : FAIL : ' + message, 'red');
    var reportDiv = this.getReportDiv_();
    reportDiv.insertBefore(paragraph,
                           reportDiv.firstChild);
  },
  /**
   * Reports a test summary.
   * @param {number} passCount The number of tests that passed.
   * @param {number} failCount The number of tests that failed.
   * @this {Object}
   */
  reportSummary: function(passCount, failCount) {
    var paragraph = o3djs.test.createReportParagraph_(
        passCount + ' passed, ' + failCount + ' failed', 'blue');
    var reportDiv = this.getReportDiv_();
    reportDiv.insertBefore(paragraph,
                           reportDiv.firstChild);
  }
};
/*
 * Copyright 2009, Google Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */


/**
 * @fileoverview This file contains functions helping to manipulate and manage
 *     textures.
 */

o3djs.provide('o3djs.texture');

/**
 * A Module for bitmaps.
 * @namespace
 */
o3djs.texture = o3djs.texture || {};

/**
 * The maximum dimension of a texture.
 * @type {number}
 */
o3djs.texture.MAX_TEXTURE_DIMENSION = 2048;

/**
 * Computes the maximum number of levels of mips a given width and height could
 * use.
 * @param {number} width Width of texture.
 * @param {number} height Height of texture.
 * @return {number} The maximum number of levels for the given width and height.
 */
o3djs.texture.computeNumLevels = function(width, height) {
  if (width == 0 || height == 0) {
    return 0;
  }
  var max = Math.max(width, height);
  var levels = 0;
  while (max > 0) {
    ++levels;
    max = max >> 1;
  }
  return levels;
};

/**
 * Creates a texture from a RawData object.
 * @param {!o3d.Pack} pack The pack to create the texture in.
 * @param {!o3d.RawData} rawData The raw data to create the texture from.
 * @param {boolean} opt_generateMips Whether or not to generate mips. Note, mips
 *    can not be generated for DXT textures although they will be loaded if they
 *    exist in the RawData.
 * @param {boolean} opt_flip Whether or not to flip the texture. Most DCC tools
 *    Like Maya, Max, etc expect the textures to be flipped.  Note that only
 *    2D (image) textures will be flipped. Cube textures will not be flipped.
 *    Default = true.
 * @param {number} opt_maxWidth The maximum width of the texture. If the RawData
 *    is larger than this size it will be scaled down to this size. Note that
 *    DXT format textures can not be scaled. Default = 2048.
 * @param {number} opt_maxHeight The maximum width of the texture. If the
 *    RawData is larger than this size it will be scaled down to this size. Note
 *    that DXT format textures can not be scaled. Default = 2048.
 * @return {!o3d.Texture} The created texture.
 */
o3djs.texture.createTextureFromRawData = function(
    pack,
    rawData,
    opt_generateMips,
    opt_flip,
    opt_maxWidth,
    opt_maxHeight) {
  // Make a bitmaps from the raw data.
  var bitmaps = pack.createBitmapsFromRawData(rawData);
  if (opt_flip || typeof opt_flip === 'undefined') {
    for (var ii = 0; ii < bitmaps.length; ++ii) {
      var bitmap = bitmaps[ii];
      if (bitmap.semantic == o3djs.base.o3d.Bitmap.IMAGE) {
        bitmaps[ii].flipVertically();
      }
    }
  }

  // Create a texture from the bitmaps.
  var texture = o3djs.texture.createTextureFromBitmaps(
      pack, bitmaps, opt_generateMips);

  // Delete the bitmaps.
  for (var ii = 0; ii < bitmaps.length; ++ii) {
    pack.removeObject(bitmaps[ii]);
  }

  return texture;
};

/**
 * Creates a texture from an array of RawData objects. This is mainly useful for
 * creating a cube map out of six separate textures.
 * @param {!o3d.Pack} pack The pack to create the texture in.
 * @param {!Array.<!o3d.RawData>} rawDataArray The array of raw data objects to
 *    create the texture from. If these represent the six faces of a cube map,
 *    they must be in the order FACE_POSITIVE_X, FACE_NEGATIVE_X,
 *    FACE_POSITIVE_Y, FACE_NEGATIVE_Y, FACE_POSITIVE_Z, FACE_NEGATIVE_Z
 * @param {boolean} opt_generateMips Whether or not to generate mips. Note, mips
 *    can not be generated for DXT textures although they will be loaded if they
 *    exist in the RawData.
 * @param {boolean} opt_flip Whether or not to flip the texture. Most DCC tools
 *    Like Maya, Max, etc expect the textures to be flipped.  Note that only
 *    2D (image) textures will be flipped. Cube textures will not be flipped.
 *    Default = true.
 * @param {number} opt_maxWidth The maximum width of the texture. If the RawData
 *    is larger than this size it will be scaled down to this size. Note that
 *    DXT format textures can not be scaled. Default = 2048.
 * @param {number} opt_maxHeight The maximum width of the texture. If the
 *    RawData is larger than this size it will be scaled down to this size. Note
 *    that DXT format textures can not be scaled. Default = 2048.
 * @return {!o3d.Texture} The created texture.
 */
o3djs.texture.createTextureFromRawDataArray = function(
    pack,
    rawDataArray,
    opt_generateMips,
    opt_flip,
    opt_maxWidth,
    opt_maxHeight) {
  // Make bitmaps from the raw data.
  var bitmaps = [];
  for (var ii = 0; ii < rawDataArray.length; ++ii) {
    bitmaps = bitmaps.concat(pack.createBitmapsFromRawData(rawDataArray[ii]));
  }
  if (opt_flip || typeof opt_flip === 'undefined') {
    for (var ii = 0; ii < bitmaps.length; ++ii) {
      var bitmap = bitmaps[ii];
      if (bitmap.semantic == o3djs.base.o3d.Bitmap.IMAGE) {
        bitmaps[ii].flipVertically();
      }
    }
  }

  // Create a texture from the bitmaps.
  // TODO(kbr): use createCubeTextureFrom6Bitmaps instead; bugs in the plugin
  // currently prevent this.
  var texture = o3djs.texture.createTextureFromBitmaps(
      pack, bitmaps, opt_generateMips);

  // Delete the bitmaps.
  for (var ii = 0; ii < bitmaps.length; ++ii) {
    pack.removeObject(bitmaps[ii]);
  }

  return texture;
};

/**
 * Returns whether or not a given texture format can be scaled.
 * @param {!o3d.Texture.Format} format The format to check.
 * @return {boolean} True if you can scale and make mips for the given format.
 */
o3djs.texture.canMakeMipsAndScale = function(format) {
  switch (format) {
  case o3djs.base.o3d.Texture.XRGB8:
  case o3djs.base.o3d.Texture.ARGB8:
  case o3djs.base.o3d.Texture.ABGR16F:
  case o3djs.base.o3d.Texture.R32F:
  case o3djs.base.o3d.Texture.ABGR32F:
    return true;
  case o3djs.base.o3d.Texture.DXT1:
  case o3djs.base.o3d.Texture.DXT3:
  case o3djs.base.o3d.Texture.DXT5:
    return false;
  }
  return false;
};

/**
 * Creates a Texture from an array of bitmaps.
 * @param {!o3d.Pack} pack The pack to create the texture in.
 * @param {!Array.<!o3d.Bitmap>} bitmaps An array of bitmaps to create the
 *     texture from. For a 2D texture this would be 1 bitmap. For a cubemap this
 *     would be 6 bitmaps.
 * @param {boolean} opt_generateMips Whether or not to generate mips. Note, mips
 *    can not be generated for DXT textures although they will be loaded if they
 *    exist in the RawData. Default = true.
 * @return {!o3d.Texture} The created texture.
 */
o3djs.texture.createTextureFromBitmaps = function(
    pack,
    bitmaps,
    opt_generateMips) {
  if (bitmaps.length == 0) {
    throw 'no bitmaps';
  }

  var srcWidth = bitmaps[0].width;
  var srcHeight = bitmaps[0].height;
  var format = bitmaps[0].format;
  var mipMaps = bitmaps[0].numMipmaps;
  var maxMips = o3djs.texture.computeNumLevels(srcWidth, srcHeight);
  var targetMips = mipMaps;
  var dstWidth = srcWidth;
  var dstHeight = srcHeight;
  if ((typeof opt_generateMips === 'undefined' || opt_generateMips) &&
      o3djs.texture.canMakeMipsAndScale(format) &&
      mipMaps == 1 && maxMips > 1) {
    targetMips = maxMips;
  }

  // Check that all the bitmaps are the same size and make mips
  for (var ii = 0; ii < bitmaps.length; ++ii) {
    var bitmap = bitmaps[ii];
    if (bitmap.width != srcWidth ||
        bitmap.height != srcHeight ||
        bitmap.format != format ||
        bitmap.numMipmaps != mipMaps) {
      throw 'bitmaps must all be the same width, height, mips and format';
    }
    if (targetMips != mipMaps) {
      bitmap.generateMips(0, targetMips - 1);
    }
  }

  var levels = bitmap.numMipmaps > 1 ? bitmap.numMipmaps :
               o3djs.texture.computeNumLevels(dstWidth, dstHeight);
  var texture;
  if (bitmaps.length == 6 &&
      bitmaps[0].semantic != o3djs.base.o3d.Bitmap.SLICE) {
    if (srcWidth != srcHeight ||
        srcWidth != dstWidth ||
        srcHeight != dstHeight) {
      throw 'Cubemaps must be square';
    }
    texture = pack.createTextureCUBE(dstWidth, format, targetMips, false);
    for (var ii = 0; ii < 6; ++ii) {
      texture.setFromBitmap(
          /** @type {o3d.TextureCUBE.CubeFace} */ (ii),
          bitmaps[ii]);
    }
  } else if (bitmaps.length == 1) {
    texture = pack.createTexture2D(
        dstWidth, dstHeight, format, targetMips, false);
    texture.setFromBitmap(bitmaps[0]);
  }

  return /** @type{!o3d.Texture} */ (texture);
};

/**
 * Creates a TextureCUBE from 6 bitmaps. The bitmaps do not have to be the same
 * size though they do have to be the same format.
 *
 * @param {!o3d.Pack} pack The pack to create the texture in.
 * @param {number} edgeLength The size of the cubemap.
 * @param {!Array.<!o3d.Bitmap>} bitmaps An array of 6 bitmaps in the order
 *     FACE_POSITIVE_X, FACE_NEGATIVE_X, FACE_POSITIVE_Y, FACE_NEGATIVE_Y,
 *     FACE_POSITIVE_Z, FACE_NEGATIVE_Z.
 * @return {!o3d.Texture} The created texture.
 */
o3djs.texture.createCubeTextureFrom6Bitmaps = function(
    pack, edgeLength, bitmaps) {
  var numMips = o3djs.texture.computeNumLevels(edgeLength, edgeLength);
  var texture = pack.createTextureCUBE(
      edgeLength, bitmaps[0].format, numMips, false);
  for (var ii = 0; ii < 6; ++ii) {
    var bitmap = bitmaps[ii];
    texture.setFromBitmap(ii, bitmap);
  }
  texture.generateMips(0, numMips - 1);
  return texture;
};

/*
 * Copyright 2009, Google Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */


/**
 * @fileoverview This file contains various utility functions for o3d.  It
 * puts them in the "util" module on the o3djs object.
 *
 */

o3djs.provide('o3djs.util');

o3djs.require('o3djs.io');
o3djs.require('o3djs.effect');
o3djs.require('o3djs.event');
o3djs.require('o3djs.error');

/**
 * A Module with various utilities.
 * @namespace
 */
o3djs.util = o3djs.util || {};

/**
 * The name of the o3d plugin. Used to find the plugin when checking
 * for its version.
 * @type {string}
 */
o3djs.util.PLUGIN_NAME = 'O3D Plugin';

/**
 * The version of the plugin needed to use this version of the javascript
 * utility libraries.
 * @type {string}
 */
o3djs.util.REQUIRED_VERSION = '0.1.42.4';

/**
 * The width an O3D must be to put a failure message inside
 * @type {number}
 */
o3djs.util.MINIMUM_WIDTH_FOR_MESSAGE = 200;

/**
 * The height an O3D must be to put a failure message inside
 * @type {number}
 */
o3djs.util.MINIMUM_HEIGHT_FOR_MESSAGE = 200;

/**
 * A URL at which to download the client.
 * @type {string}
 */
o3djs.util.PLUGIN_DOWNLOAD_URL = 'http://tools.google.com/dlpage/o3d';

/**
 * The Renderer InitStatus constants so we don't need an o3d object to look
 * them up.
 * @enum {number}
 */
o3djs.util.rendererInitStatus = {
  NO_PLUGIN: -1,
  UNINITIALIZED: 0,
  SUCCESS: 1,
  OUT_OF_RESOURCES: 2,
  GPU_NOT_UP_TO_SPEC: 3,
  INITIALIZATION_ERROR: 4
};

/**
 * This implements a JavaScript version of currying. Currying allows you to
 * take a function and fix its initial arguments, resulting in a function
 * expecting only the remaining arguments when it is invoked. For example:
 * <pre>
 * function add(a, b) {
 *   return a + b;
 * }
 * var increment = o3djs.util.curry(add, 1);
 * var result = increment(10);
 * </pre>
 * Now result equals 11.
 * @param {!function(...): *} func The function to curry.
 * @return {!function(...): *} The curried function.
 */
o3djs.util.curry = function(func) {
  var outerArgs = [];
  for (var i = 1; i < arguments.length; ++i) {
    outerArgs.push(arguments[i]);
  }
  return function() {
    var innerArgs = outerArgs.slice();
    for (var i = 0; i < arguments.length; ++i) {
      innerArgs.push(arguments[i]);
    }
    return func.apply(this, innerArgs);
  }
}

/**
 * Gets the URI in which the current page is located, omitting the file name.
 * @return {string} The base URI of the page. If the page is
 *     "http://some.com/folder/somepage.html" returns
 *     "http://some.com/folder/".
 */
o3djs.util.getCurrentURI = function() {
  var path = window.location.href;
  var index = path.lastIndexOf('/');
  return path.substring(0, index + 1);
};

/**
 * Given a URI that is relative to the current page, returns the absolute
 * URI.
 * @param {string} uri URI relative to the current page.
 * @return {string} Absolute uri. If the page is
 *     "http://some.com/folder/sompage.html" and you pass in
 *     "images/someimage.jpg" will return
 *     "http://some.com/folder/images/someimage.jpg".
 */
o3djs.util.getAbsoluteURI = function(uri) {
  return o3djs.util.getCurrentURI() + uri;
};

/**
 * Searches an array for a specific value.
 * @param {!Array.<*>} array Array to search.
 * @param {*} value Value to search for.
 * @return {boolean} True if value is in array.
 */
o3djs.util.arrayContains = function(array, value) {
  for (var i = 0; i < array.length; i++) {
    if (array[i] == value) {
      return true;
    }
  }
  return false;
};

/**
 * Searches for all transforms with a "o3d.tags" ParamString
 * that contains specific tag keywords assuming comma separated
 * words.
 * @param {!o3d.Transform} treeRoot Root of tree to search for tags.
 * @param {string} searchTags Tags to look for. eg "camera", "ogre,dragon".
 * @return {!Array.<!o3d.Transform>} Array of transforms.
 */
o3djs.util.getTransformsInTreeByTags = function(treeRoot, searchTags) {
  var splitTags = searchTags.split(',');
  var transforms = treeRoot.getTransformsInTree();
  var found = [];
  for (var n = 0; n < transforms.length; n++) {
    var tagParam = transforms[n].getParam('collada.tags');
    if (tagParam) {
       var tags = tagParam.value.split(',');
       for (var t = 0; t < tags.length; t++) {
         if (o3djs.util.arrayContains(splitTags, tags[t])) {
           found[found.length] = transforms[n];
           break;
         }
      }
    }
  }
  return found;
};

/**
 * Finds transforms in the tree by prefix.
 * @param {!o3d.Transform} treeRoot Root of tree to search.
 * @param {string} prefix Prefix to look for.
 * @return {!Array.<!o3d.Transform>} Array of transforms matching prefix.
 */
o3djs.util.getTransformsInTreeByPrefix = function(treeRoot, prefix) {
  var found = [];
  var transforms = treeRoot.getTransformsInTree();
  for (var ii = 0; ii < transforms.length; ii++) {
    var transform = transforms[ii];
    if (transform.name.indexOf(prefix) == 0) {
      found[found.length] = transform;
    }
  }
  return found;
};

/**
 * Finds the bounding box of all primitives in the tree, in the local space of
 * the tree root. This will use existing bounding boxes on transforms and
 * elements, but not create new ones.
 * @param {!o3d.Transform} treeRoot Root of tree to search.
 * @return {!o3d.BoundingBox} The boundinding box of the tree.
 */
o3djs.util.getBoundingBoxOfTree = function(treeRoot) {
  // If we already have a bounding box, use that one.
  var box = treeRoot.boundingBox;
  if (box.valid) {
    return box;
  }
  var o3d = o3djs.base.o3d;
  // Otherwise, create it as the union of all the children bounding boxes and
  // all the shape bounding boxes.
  var transforms = treeRoot.children;
  for (var i = 0; i < transforms.length; ++i) {
    var transform = transforms[i];
    var childBox = o3djs.util.getBoundingBoxOfTree(transform);
    if (childBox.valid) {
      // transform by the child local matrix.
      childBox = childBox.mul(transform.localMatrix);
      if (box.valid) {
        box = box.add(childBox);
      } else {
        box = childBox;
      }
    }
  }
  var shapes = treeRoot.shapes;
  for (var i = 0; i < shapes.length; ++i) {
    var elements = shapes[i].elements;
    for (var j = 0; j < elements.length; ++j) {
      var elementBox = elements[j].boundingBox;
      if (!elementBox.valid) {
        elementBox = elements[j].getBoundingBox(0);
      }
      if (box.valid) {
        box = box.add(elementBox);
      } else {
        box = elementBox;
      }
    }
  }
  return box;
};

/**
 * Returns the smallest power of 2 that is larger than or equal to size.
 * @param {number} size Size to get power of 2 for.
 * @return {number} smallest power of 2 that is larger than or equal to size.
 */
o3djs.util.getPowerOfTwoSize = function(size) {
  var powerOfTwo = 1;
  size = size - 1;
  while (size) {
    size = size >> 1;
    powerOfTwo = powerOfTwo << 1;
  }
  return powerOfTwo;
};

/**
 * Gets the version of the installed plugin.
 * @return {?string} version string in 'major.minor.revision.build' format.
 *    If the plugin does not exist returns null.
 */
o3djs.util.getPluginVersion = function() {
  var version = null;
  var description = null;
  if (navigator.plugins != null && navigator.plugins.length > 0) {
    var plugin = navigator.plugins[o3djs.util.PLUGIN_NAME];
    if (plugin) {
      description = plugin.description;
    }
  } else if (o3djs.base.IsMSIE()) {
    try {
      var activeXObject = new ActiveXObject('o3d_host.O3DHostControl');
      description = activeXObject.description;
    } catch (e) {
      // O3D plugin was not found.
    }
  }
  if (description) {
    var re = /.*version:\s*(\d+)\.(\d+)\.(\d+)\.(\d+).*/;
    // Parse the version out of the description.
    var parts = re.exec(description);
    if (parts && parts.length == 5) {
      // make sure the format is #.#.#.#  no whitespace, no trailing comments
      version = '' + parseInt(parts[1], 10) + '.' +
                     parseInt(parts[2], 10) + '.' +
                     parseInt(parts[3], 10) + '.' +
                     parseInt(parts[4], 10);
    }
  }
  return version;
};

/**
 * Checks if the required version of the plugin in available.
 * @param {string} requiredVersion version string in
 *    "major.minor.revision.build" format. You can leave out any non-important
 *    numbers for example "3" = require major version 3, "2.4" = require major
 *    version 2, minor version 4.
 * @return {boolean} True if the required version is available.
 */
o3djs.util.requiredVersionAvailable = function(requiredVersion) {
  var version = o3djs.util.getPluginVersion();
  if (!version) {
    return false;
  }
  var haveParts = version.split('.');
  var requiredParts = requiredVersion.split('.');
  if (requiredParts.length > 4) {
    throw Error('requiredVersion has more than 4 parts!');
  }
  for (var pp = 0; pp < requiredParts.length; ++pp) {
    var have = parseInt(haveParts[pp], 10);
    var required = parseInt(requiredParts[pp], 10);
    if (have < required) {
      return false;
    }
    if (have > required) {
      return true;
    }
  }
  return true;
};

/**
 * Gets all the elements of a certain tag that have a certain id.
 * @param {string} tag The tag to look for. (eg. 'div').
 * @param {string} id The id to look for. This can be a regular expression.
 * @return {!Array.<!Element>} An array of the elements found.
 */
o3djs.util.getElementsByTagAndId = function(tag, id) {
  var elements = [];
  var allElements = document.getElementsByTagName(tag);
  for (var ee = 0; ee < allElements.length; ++ee) {
    var element = allElements[ee];
    if (element.id && element.id.match(id)) {
      elements.push(element);
    }
  }
  return elements;
};

/**
 * Gets all the Elements that contain or would contain O3D plugin objects.
 * @param {string} opt_id The id to look for. This can be a regular
 *     expression. The default is "^o3d".
 * @param {string} opt_tag The type of tag to look for. The default is "div".
 */
o3djs.util.getO3DContainerElements = function(opt_id, opt_tag) {
  var tag = opt_tag || 'div';
  var id = opt_id || '^o3d';
  return o3djs.util.getElementsByTagAndId(tag, id);
}

/**
 * Offers the user the option to download the plugin.
 *
 * Finds all divs with the id "^o3d" and inserts a message and link
 * inside to download the plugin. If no areas exist OR if none of them are
 * large enough for the message then displays an alert.
 *
 * @param {string} opt_id The id to look for. This can be a regular
 *     expression. The default is "^o3d".
 * @param {string} opt_tag The type of tag to look for. The default is "div".
 */
o3djs.util.offerPlugin = function(opt_id, opt_tag) {
  var havePlugin = o3djs.util.requiredVersionAvailable('');
  var elements = o3djs.util.getO3DContainerElements(opt_id, opt_tag);
  var addedMessage = false;
  // TODO: This needs to be localized OR we could insert a html like
  // <script src="http://google.com/o3d_plugin_dl"></script>
  // in which case google could serve the message localized and update the
  // link.
  var subMessage =
    (havePlugin ?
     'This page requires a newer version of the O3D plugin.' :
     'This page requires the O3D plugin to be installed.');
  var message =
      '<div style="background: lightblue; width: 100%; height: 100%; ' +
      'text-align:center;">' +
      '<br/><br/>' + subMessage + '<br/>' +
      '<a href="' + o3djs.util.PLUGIN_DOWNLOAD_URL +
      '">Click here to download.</a>' +
      '</div>'
  for (var ee = 0; ee < elements.length; ++ee) {
    var element = elements[ee];
    if (element.clientWidth >= o3djs.util.MINIMUM_WIDTH_FOR_MESSAGE &&
        element.clientHeight >= o3djs.util.MINIMUM_HEIGHT_FOR_MESSAGE &&
        element.style.display.toLowerCase() != 'none' &&
        element.style.visibility.toLowerCase() != 'hidden') {
      addedMessage = true;
      element.innerHTML = message;
    }
  }
  if (!addedMessage) {
    if (confirm(subMessage + '\n\nClick OK to download.')) {
      window.location = o3djs.util.PLUGIN_DOWNLOAD_URL;
    }
  }
};

/**
 * Tells the user their graphics card is not able to run the plugin or is out
 * of resources etc.
 *
 * Finds all divs with the id "^o3d" and inserts a message. If no areas
 * exist OR if none of them are large enough for the message then displays an
 * alert.
 *
 * @param {!o3d.Renderer.InitStatus} initStatus The initializaion status of
 *     the renderer.
 * @param {string} error An error message. Will be '' if there is no message.
 * @param {string} opt_id The id to look for. This can be a regular
 *     expression. The default is "^o3d".
 * @param {string} opt_tag The type of tag to look for. The default is "div".
 */
o3djs.util.informNoGraphics = function(initStatus, error, opt_id, opt_tag) {
  var elements = o3djs.util.getO3DContainerElements(opt_id, opt_tag);
  var addedMessage = false;
  var subMessage;
  var message;
  var alertMessage = '';
  var alertFunction = function() { };

  var moreInfo = function(error) {
    var html = '';
    if (error.length > 0) {
      html = '' +
          '<br/><br/><div>More Info:<br/>' + error + '</div>';
    }
    return html;
  };

  // TODO: This needs to be localized OR we could insert a html like
  // <script src="http://google.com/o3d_plugin_dl"></script>
  // in which case google could serve the message localized and update the
  // link.
  if (initStatus == o3djs.util.rendererInitStatus.GPU_NOT_UP_TO_SPEC) {
    subMessage =
        'We are terribly sorry but it appears your graphics card is not ' +
        'able to run o3d. We are working on a solution.';
    message =
        '<div style="background: lightgray; width: 100%; height: 100%; ' +
        'text-align: center;">' +
        '<br/><br/>' + subMessage +
        '<br/><br/><a href="' + o3djs.util.PLUGIN_DOWNLOAD_URL +
        '">Click Here to go the O3D website</a>' +
        moreInfo(error) +
        '</div>';
    alertMessage = '\n\nClick OK to go to the o3d website.';
    alertFunction = function() {
          window.location = o3djs.util.PLUGIN_DOWNLOAD_URL;
        };
  } else if (initStatus == o3djs.util.rendererInitStatus.OUT_OF_RESOURCES) {
    subMessage =
        'Your graphics system appears to be out of resources. Try closing ' +
        'some applications and then refreshing this page.';
    message =
        '<div style="background: lightgray; width: 100%; height: 100%; ' +
        'text-align: center;">' +
        '<br/><br/>' + subMessage +
        moreInfo(error) +
        '</div>';
  } else {
    subMessage =
        'A unknown error has prevented O3D from starting. Try downloading ' +
        'new drivers or checking for OS updates.';
    message =
        '<div style="background: lightgray; width: 100%; height: 100%; ' +
        'text-align: center;">' +
        '<br/><br/>' + subMessage +
        moreInfo(error) +
        '</div>';
  }
  for (var ee = 0; ee < elements.length; ++ee) {
    var element = elements[ee];
    if (element.clientWidth >= o3djs.util.MINIMUM_WIDTH_FOR_MESSAGE &&
        element.clientHeight >= o3djs.util.MINIMUM_HEIGHT_FOR_MESSAGE &&
        element.style.display.toLowerCase() != 'none' &&
        element.style.visibility.toLowerCase() != 'hidden') {
      addedMessage = true;
      element.innerHTML = message;
    }
  }
  if (!addedMessage) {
    if (confirm(subMessage + alertMessage)) {
      alertFunction();
    }
  }
};

/**
 * Handles failure to create the plugin.
 *
 * @param {!o3d.Renderer.InitStatus} initStatus The initializaion status of
 *     the renderer.
 * @param {string} error An error message. Will be '' if there is no message.
 * @param {string} opt_id The id to look for. This can be a regular
 *     expression. The default is "^o3d".
 * @param {string} opt_tag The type of tag to look for. The default is "div".
 */
o3djs.util.informPluginFailure = function(initStatus, error, opt_id, opt_tag) {
  if (initStatus == o3djs.util.rendererInitStatus.NO_PLUGIN) {
    o3djs.util.offerPlugin(opt_id, opt_tag);
  } else {
    o3djs.util.informNoGraphics(initStatus, error, opt_id, opt_tag);
  }
};

/**
 * Utility to get the text contents of a DOM element with a particular ID.
 * Currently only supports textarea and script nodes.
 * @param {string} id The Node id.
 * @return {string} The text content.
 */
o3djs.util.getElementContentById = function(id) {
  // DOM manipulation is not currently supported in IE.
  o3djs.BROWSER_ONLY = true;

  var node = document.getElementById(id);
  if (!node) {
    throw 'getElementContentById could not find node with id ' + id;
  }
  switch (node.tagName) {
    case 'TEXTAREA':
      return node.value;
    case 'SCRIPT':
      return node.text;
    default:
      throw 'getElementContentById does not no how to get content from a ' +
          node.tagName + ' element';
  }
};

/**
 * Utility to get an element from the DOM by ID. This must be used from V8
 * in preference to document.getElementById because we do not currently
 * support invoking methods on DOM objects in IE.
 * @param {string} id The Element id.
 * @return {Element} The Element or null if not found.
 */
o3djs.util.getElementById = function(id) {
  o3djs.BROWSER_ONLY = true;
  return document.getElementById(id);
};

/**
 * Identifies a JavaScript engine.
 * @enum {number}
 */
o3djs.util.Engine = {
  /**
   * The JavaScript engine provided by the browser.
   */
  BROWSER: 0,
  /**
   * The V8 JavaScript engine embedded in the plugin.
   */
  V8: 1
};

/**
 * The engine selected as the main engine (the one the makeClients callback
 * will be invoked on).
 * @private
 * @type {o3djs.util.Engine}
 */
o3djs.util.mainEngine_ = o3djs.util.Engine.BROWSER;

/**
 * Checks the user agent string for substring s, returning true if it appears.
 * @return {boolean} Whether the browser's user-agent string contains string s.
 */
function o3djs_navHas(s) {
  return navigator.userAgent.indexOf(s) != -1;
}

/**
 * Checks for V8 support. This is to cope with environments where our V8 is
 * known to be problematic, eg Safari on 10.6.
 * @return {boolean} Whether the environment supports V8.
 */
function o3djs_isV8Supported() {
  if (o3djs_navHas('Chrome'))
    return true;
  if (!o3djs_navHas('Safari'))
    return true;
  return !o3djs_navHas('Intel Mac OS X 10_6');
}

/**
 * Select an engine to use as the main engine (the one the makeClients
 * callback will be invoked on). If an embedded engine is requested, one
 * element must be identified with the id 'o3d'. The callback will be invoked
 * in this element.
 * Ignores attempts to choose V8 if it is not supported in this host.
 * @param {o3djs.util.Engine} engine The engine.
 */
o3djs.util.setMainEngine = function(engine) {
  if ((engine == o3djs.util.Engine.V8) && !o3djs_isV8Supported()) {
    engine = o3djs.util.Engine.BROWSER;
  }
  o3djs.util.mainEngine_ = engine;
};

/**
 * A regex used to cleanup the string representation of a function before
 * it is evaled.
 * @private
 * @type {!RegExp}
 */
o3djs.util.fixFunctionString_ = /^\s*function\s+[^\s]+\s*\(([^)]*)\)/

/**
 * Evaluate a callback function in the V8 engine.
 * @param {!Object} clientElement The plugin containing the V8 engine.
 * @param {!function(...): *} callback A function to call.
 * @param {!Object} thisArg The value to be bound to "this".
 * @param {!Array.<*>} args The arguments to pass to the callback.
 * @return {*} The result of calling the callback.
 */
o3djs.util.callV8 = function(clientElement, callback, thisArg, args) {
  // Sometimes a function will be converted to a string like this:
  //   function foo(a, b) { ... }
  // In this case, convert to this form:
  //   function(a, b) { ... }
  var functionString = callback.toString();
  functionString = functionString.replace(o3djs.util.fixFunctionString_,
                                          'function($1)');

  // Make a V8 function that will invoke the callback.
  var v8Code =
      'function(thisArg, args) {\n' +
      '  var localArgs = [];\n' +
      '  var numArgs = args.length;\n' +
      '  for (var i = 0; i < numArgs; ++i) {\n' +
      '    localArgs.push(args[i]);\n' +
      '  }\n' +
      '  var func = ' + functionString + ';\n' +
      '  return func.apply(thisArg, localArgs);\n' +
      '}\n';

  // Evaluate the function in V8.
  var v8Function = clientElement.eval(v8Code);
  return v8Function(thisArg, args);
};

/**
 * A regex to remove .. from a URI.
 * @private
 * @type {!RegExp}
 */
o3djs.util.stripDotDot_ = /\/[^\/]+\/\.\./;

/**
 * Turn a URI into an absolute URI.
 * @param {string} uri The URI.
 * @return {string} The absolute URI.
 */
o3djs.util.toAbsoluteUri = function(uri) {
  if (uri.indexOf('://') == -1) {
    var baseUri = document.location.toString();
    var lastSlash = baseUri.lastIndexOf('/');
    if (lastSlash != -1) {
      baseUri = baseUri.substring(0, lastSlash);
    }
    uri = baseUri + '/' + uri;
  }

  do {
    var lastUri = uri;
    uri = uri.replace(o3djs.util.stripDotDot_, '');
  } while (lastUri !== uri);

  return uri;
};

/**
 * The script URIs.
 * @private
 * @type {!Array.<string>}
 */
o3djs.util.scriptUris_ = [];

/**
 * Add a script URI. Scripts that are referenced from script tags that are
 * within this URI are automatically loaded into the alternative JavaScript
 * main JavaScript engine. Do not include directories of scripts that are
 * included with o3djs.require. These are always available. This mechanism
 * is not able to load scripts in a different domain from the document.
 * @param {string} uri The URI.
 */
o3djs.util.addScriptUri = function(uri) {
  o3djs.util.scriptUris_.push(o3djs.util.toAbsoluteUri(uri));
};

/**
 * Determine whether a URI is a script URI that should be loaded into the
 * alternative main JavaScript engine.
 * @param {string} uri The URI.
 * @return {boolean} Whether it is a script URI.
 */
o3djs.util.isScriptUri = function(uri) {
  uri = o3djs.util.toAbsoluteUri(uri);
  for (var i = 0; i < o3djs.util.scriptUris_.length; ++i) {
    var scriptUri = o3djs.util.scriptUris_[i];
    if (uri.substring(0, scriptUri.length) === scriptUri) {
      return true;
    }
  }
  return false;
};

/**
 * Returns whether or not this is a script tag we want. Currently that is
 * only script tags with an id that starts with "o3d".
 * @private
 * @param {!Element} scriptElement The script element to check.
 * @return {boolean} True if we want this script tag.
 */
o3djs.util.isWantedScriptTag_ = function(scriptElement) {
  return scriptElement.id && scriptElement.id.match(/^o3dscript/);
};

/**
 * Concatenate the text of all the script tags in the document and invokes
 * the callback when complete. This function is asynchronous if any of the
 * script tags reference JavaScript through a URI.
 * @private
 * @return {string} The script tag text.
 */
o3djs.util.getScriptTagText_ = function() {
  var scriptTagText = '';
  var scriptElements = document.getElementsByTagName('script');
  for (var i = 0; i < scriptElements.length; ++i) {
    var scriptElement = scriptElements[i];
    if (scriptElement.type === '' ||
        scriptElement.type === 'text/javascript') {
      if ('text' in scriptElement && scriptElement.text &&
          o3djs.util.isWantedScriptTag_(scriptElement)) {
        scriptTagText += scriptElement.text;
      }
      if ('src' in scriptElement && scriptElement.src &&
          o3djs.util.isScriptUri(scriptElement.src)) {
        // It would be better to make this an asynchronous load but the script
        // file is very likely to be in the browser cache because it should
        // have just been loaded via the browser script tag.
        scriptTagText += o3djs.io.loadTextFileSynchronous(scriptElement.src);
      }
    }
  }
  return scriptTagText;
};

/**
 * Creates a client element.  In other words it creates an <OBJECT> tag for o3d.
 * <b>Note that the browser may not have initialized the plugin before
 * returning.</b>
 * @param {!Element} element The DOM element under which the client element
 *    will be appended.
 * @param {string} opt_features A comma separated list of the
 *    features you need for your application. The current list of features:
 *    <li>FloatingPointTextures: Includes the formats R32F, ABGR16F and
 *    ABGR32F</li>
 *    The features are case sensitive.
 * @param {string} opt_requestVersion version string in
 *    "major.minor.revision.build" format. You can leave out any non-important
 *    numbers for example "3" = request major version 3, "2.4" = request major
 *    version 2, minor version 4. If no string is passed in the newest version
 *    of the plugin will be created.
 * @return {Element} O3D element or null if requested version is not
 *    available.
 */
o3djs.util.createClient = function(element, opt_features, opt_requestVersion) {
  opt_features = opt_features || '';
  opt_requestVersion = opt_requestVersion || o3djs.util.REQUIRED_VERSION;
  if (!o3djs.util.requiredVersionAvailable(opt_requestVersion)) {
    return null;
  }
  opt_features += (opt_features ? ',' : '') + 'APIVersion=' +
                  opt_requestVersion;
  var objElem;
  // TODO: Use opt_requiredVersion to set a version so the plugin
  //    can make sure it offers that version of the API.
  // Note:  The IE version of the plug-in does not receive attributes during
  //  construction, unless the innerHTML construction style is used.
  if (o3djs.base.IsMSIE()) {
    element.innerHTML =
        '<OBJECT ' +
          'WIDTH="100%" HEIGHT="100%"' +
          'CLASSID="CLSID:9666A772-407E-4F90-BC37-982E8160EB2D">' +
            '<PARAM name="o3d_features" value="' + opt_features + '"/>' +
        '</OBJECT>';
    objElem = element.childNodes[0];
  } else {
    objElem = document.createElement('object');
    objElem.type = 'application/vnd.o3d.auto';
    objElem.style.width = '100%';
    objElem.style.height = '100%';
    objElem.setAttribute('o3d_features', opt_features);
    element.appendChild(objElem);
  }

  if (objElem.client.clientInfo.glsl) {
    o3djs.effect.setLanguage('glsl');
  }

  return objElem;
};

/**
 * Finds all divs with the an id that starts with "o3d" and inserts a client
 * area inside.
 *
 * NOTE: the size of the client area is always set to 100% which means the div
 * must have its size set or managed by the browser. Examples:
 *
 * -- A div of a specific size --
 * &lt;div id="o3d" style="width:800px; height:600px">&lt;/div>
 *
 * -- A div that fills its containing element --
 * &lt;div id="o3d" style="width:100%; height:100%">&lt;/div>
 *
 * In both cases, a DOCTYPE is probably required.
 *
 * You can also request certain features by adding the attribute
 * 'o3d_features' as in
 *
 * &lt;div id="o3d" o3d_features="FloatingPointTextures">&lt;/div>
 *
 * This allows you to specify different features per area. Otherwise you can
 * request features as an argument to this function.
 *
 * Normally this function handles failure for you but if you want to handle
 * failure in your own way you can supply a failure callback. Here is an example
 * of using this function with your own failure callback.
 *
 * <pre>
 * &lt;script type="text/javascript" id="o3dscript"&gt;
 * o3djs.require('o3djs.util');
 *
 * window.onload = init;
 *
 * function init() {
 *  o3djs.util.makeClients(onSuccess, '', undefined, onFailure);
 * }
 *
 * function onFailure(initStatus, error, id, tag) {
 *   // Get a list of the elements that would have had an O3D plugin object
 *   // inserted if it had succeed.
 *   var elements = o3djs.util.getO3DContainerElements(id, tag);
 *
 *   switch (initStatus) {
 *     case o3djs.util.rendererInitStatus.NO_PLUGIN:
 *       // Tell the user there is no plugin
 *       ...
 *       break;
 *     case o3djs.util.rendererInitStatus.OUT_OF_RESOURCES:
 *     case o3djs.util.rendererInitStatus.GPU_NOT_UP_TO_SPEC:,
 *     case o3djs.util.rendererInitStatus.INITIALIZATION_ERROR:
 *     default:
 *       // Tell the user there are other issues
 *       ...
 *       break;
 *   }
 * }
 *
 * function onSuccess(o3dElementsArray) {
 *   // Run your app.
 *   ...
 * }
 * &lt;/script&gt;
 * </pre>
 *
 * @param {!function(Array.<!Element>): void} callback Function to call when
 *     client objects have been created.
 * @param {string} opt_features A comma separated list of the
 *     features you need for your application. The current list of features:
 *
 *     <li>FloatingPointTextures: Includes the formats R32F, ABGR16F and
 *     ABGR32F</li>
 *     <li>LargeGeometry: Allows buffers to have more than 65534 elements.</li>
 *     <li>NotAntiAliased: Turns off anti-aliasing</li>
 *     <li>InitStatus=X: Where X is a number. Allows simulatation of the plugin
 *     failing</li>
 *
 *     The features are case sensitive.
 * @param {string} opt_requiredVersion version string in
 *     "major.minor.revision.build" format. You can leave out any
 *     non-important numbers for example "3" = require major version 3,
 *     "2.4" = require major version 2, minor version 4. If no string is
 *     passed in the version of the needed by this version of the javascript
 *     libraries will be created.
 * @param {!function(!o3d.Renderer.InitStatus, string, (string|undefined),
 *     (string|undefined)): void} opt_failureCallback Function to call if the
 *     plugin does not exist, if the required version is not installed, or if
 *     for some other reason the plugin can not start. If this function is not
 *     specified or is null the default behavior of leading the user to the
 *     download page will be provided. See o3djs.util.informPluginFailure for an
 *     example of this type of callback.
 * @param {string} opt_id The id to look for. This can be a regular
 *     expression. The default is "^o3d".
 * @param {string} opt_tag The type of tag to look for. The default is "div".
 * @see o3djs.util.informPluginFailure
 */
o3djs.util.makeClients = function(callback,
                                  opt_features,
                                  opt_requiredVersion,
                                  opt_failureCallback,
                                  opt_id,
                                  opt_tag) {
  opt_failureCallback = opt_failureCallback || o3djs.util.informPluginFailure;
  opt_requiredVersion = opt_requiredVersion || o3djs.util.REQUIRED_VERSION;
  if (!o3djs.util.requiredVersionAvailable(opt_requiredVersion)) {
    opt_failureCallback(o3djs.util.rendererInitStatus.NO_PLUGIN, '',
                        opt_id, opt_tag);
  } else {
    var clientElements = [];
    var elements = o3djs.util.getO3DContainerElements(opt_id, opt_tag);
    var mainClientElement = null;
    for (var ee = 0; ee < elements.length; ++ee) {
      var element = elements[ee];
      var features = opt_features;
      if (!features) {
        var o3d_features = element.getAttribute('o3d_features');
        if (o3d_features) {
          features = o3d_features;
        } else {
          features = '';
        }
      }

      var objElem = o3djs.util.createClient(element, features);
      clientElements.push(objElem);

      // If the callback is to be invoked in an embedded JavaScript engine,
      // one element must be identified with the id 'o3d'. This callback
      // will be invoked in the element identified as such.
      if (element.id === 'o3d') {
        mainClientElement = objElem;
      }
    }

    // Wait for the browser to initialize the clients.
    var clearId = window.setInterval(function() {
      var initStatus = 0;
      var error = '';
      var o3d;
      for (var cc = 0; cc < clientElements.length; ++cc) {
        var element = clientElements[cc];
        o3d = element.o3d;
        var ready = o3d &&
            element.client &&
            element.client.rendererInitStatus >
                o3djs.util.rendererInitStatus.UNINITIALIZED;
        if (!ready) {
          return;
        }
        var status = clientElements[cc].client.rendererInitStatus;
        // keep the highest status. This is the worst status.
        if (status > initStatus) {
          initStatus = status;
          error = clientElements[cc].client.lastError;
        }
      }

      window.clearInterval(clearId);

      // If the plugin could not initialize the graphics delete all of
      // the plugin objects
      if (initStatus > 0 && initStatus != o3d.Renderer.SUCCESS) {
        for (var cc = 0; cc < clientElements.length; ++cc) {
          var clientElement = clientElements[cc];
          clientElement.parentNode.removeChild(clientElement);
        }
        opt_failureCallback(initStatus, error, opt_id, opt_tag);
      } else {
        o3djs.base.snapshotProvidedNamespaces();

        // TODO: Is this needed with the new event code?
        for (var cc = 0; cc < clientElements.length; ++cc) {
          // Based on v8 support test, not on current engine, as V8
          // still needs to be initialized even with o3djs.util.Engine.BROWSER
          // on some configs.
          if (o3djs_isV8Supported())
            o3djs.base.initV8(clientElements[cc]);
          o3djs.event.startKeyboardEventSynthesis(clientElements[cc]);
          o3djs.error.setDefaultErrorHandler(clientElements[cc].client);
        }
        o3djs.base.init(clientElements[0]);

        switch (o3djs.util.mainEngine_) {
          case o3djs.util.Engine.BROWSER:
            callback(clientElements);
            break;
          case o3djs.util.Engine.V8:
            if (!mainClientElement) {
              throw 'V8 engine was requested but there is no element with' +
                  ' the id "o3d"';
            }

            // Retreive the code from the script tags and eval it in V8 to
            // duplicate the browser environment.
            var scriptTagText = o3djs.util.getScriptTagText_();
            mainClientElement.eval(scriptTagText);

            // Invoke the callback in V8.
            o3djs.util.callV8(mainClientElement,
                              callback,
                              o3djs.global,
                              [clientElements]);
            break;
          default:
            throw 'Unknown engine ' + o3djs.util.mainEngine_;
        }
      }
    }, 10);
  }
};

/*
 * Copyright 2009, Google Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */


/**
 * @fileoverview This file contains utility functions for o3d running on
 * top of webgl.  The function o3djs.webgl.makeClients replaces the
 * function o3djs.util.makeClients.
 */

o3djs.provide('o3djs.webgl');

o3djs.require('o3djs.effect');
o3djs.require('o3djs.util');


/**
 * A Module with various utilities.
 * @namespace
 */
o3djs.webgl = o3djs.webgl || {};


/**
 * Finds all divs with an id that starts with "o3d" and inits a canvas
 * under them with o3d client object and the o3d namespace.
 */
o3djs.webgl.makeClients = function(callback,
                                   opt_features,
                                   opt_requiredVersion,
                                   opt_failureCallback,
                                   opt_id,
                                   opt_tag,
                                   opt_debug) {
  opt_failureCallback = opt_failureCallback || o3djs.webgl.informPluginFailure;

  var clientElements = [];
  var elements = o3djs.util.getO3DContainerElements(opt_id, opt_tag);

  for (var ee = 0; ee < elements.length; ++ee) {
    var element = elements[ee];
    var features = opt_features;
    if (!features) {
      var o3d_features = element.getAttribute('o3d_features');
      if (o3d_features) {
        features = o3d_features;
      } else {
        features = '';
      }
    }
    var objElem = o3djs.webgl.createClient(element, features, opt_debug);
    if (!objElem) {
      // If we couldn't create the client then we don't call the callback.
      return;
    }
    clientElements.push(objElem);
  }

  // Wait for the client elements to be fully initialized. This
  // involves waiting for the page to fully layout and the initial
  // resize event to be processed.
  var clearId = window.setInterval(function() {
    for (var cc = 0; cc < clientElements.length; ++cc) {
      var element = clientElements[cc];
      if (!element.sizeInitialized_) {
        return;
      }
    }
    window.clearInterval(clearId);
    callback(clientElements);
  });
};


/**
 * Adds a wrapper object to single gl function context that checks for errors
 * before the call.
 * @param {WebGLContext} context
 * @param {string} fname The name of the function.
 * @return {}
 */
o3djs.webgl.createGLErrorWrapper = function(context, fname) {
    return function() {
        var rv = context[fname].apply(context, arguments);
        var err = context.getError();
        if (err != 0) {
            throw "GL error " + err + " in " + fname;
        }
        return rv;
    };
};


/**
 * Adds a wrapper object to a webgl context that checks for errors
 * before each function call.
 */
o3djs.webgl.addDebuggingWrapper = function(context) {
    // Thanks to Ilmari Heikkinen for the idea on how to implement this
    // so elegantly.
    var wrap = {};
    for (var i in context) {
      if (typeof context[i] == 'function') {
          wrap[i] = o3djs.webgl.createGLErrorWrapper(context, i);
      } else {
          wrap[i] = context[i];
      }
    }
    wrap.getError = function() {
        return context.getError();
    };
    return wrap;
};


/**
 * Inserts text indicating that a WebGL context could not be created under
 * the given node and links to the site about WebGL capable browsers.
 */
o3djs.webgl.webGlCanvasError = function(parentNode, unavailableElement) {
  var background = document.createElement('div');
  background.style.backgroundColor = '#ccffff';
  background.style.textAlign = 'center';
  background.style.margin = '10px';
  background.style.width = '100%';
  background.style.height = '100%';

  var messageHTML = '<br/><br/><a href="http://get.webgl.org">' +
      'Your browser does not appear to support WebGL.<br/><br/>' +
      'Check that WebGL is enabled or click here to upgrade your browser:' +
      '</a><br/>';

  background.innerHTML = messageHTML;

  parentNode.appendChild(background);
};


/**
 * Creates a canvas under the given parent element and an o3d.Client
 * under that.
 *
 * @param {!Element} element The element under which to insert the client.
 * @param {string} opt_features Features to turn on.
 * @param {boolean} opt_debug Whether gl debugging features should be
 *     enabled.
 * @return {HTMLCanvas} The canvas element, or null if initializaton failed.
 */
o3djs.webgl.createClient = function(element, opt_features, opt_debug) {
  opt_features = opt_features || '';
  opt_debug = opt_debug || false;

  // If we're creating a webgl client, the assumption is we're using webgl,
  // in which case the only acceptable shader language is glsl.  So, here
  // we set the shader language to glsl.
  o3djs.effect.setLanguage('glsl');

  // Make the canvas automatically resize to fill the containing
  // element (div), and initialize its size correctly.
  var canvas;
  canvas = document.createElement('canvas');

  if (!canvas || !canvas.getContext) {
    o3djs.webgl.webGlCanvasError(element, 'HTMLCanvas');
    return null;
  }

  canvas.style.width = "100%";
  canvas.style.height = "100%";

  var client = new o3d.Client;

  var resizeHandler = function() {
    var width = Math.max(1, canvas.clientWidth);
    var height = Math.max(1, canvas.clientHeight);
    canvas.width = width;
    canvas.height = height;
    canvas.sizeInitialized_ = true;
    if (client.gl) {
      client.gl.displayInfo = {width: canvas.width, height: canvas.height};
    }
  };
  window.addEventListener('resize', resizeHandler, false);
  setTimeout(resizeHandler, 0);

  if (!client.initWithCanvas(canvas)) {
    o3djs.webgl.webGlCanvasError(element, 'WebGL context');
    return null;
  }

  // This keeps the cursor from changing to an I-beam when the user clicks and
  // drags.  It's easier on the eyes.
  function returnFalse() {
    return false;
  }
  document.onselectstart = returnFalse;
  document.onmousedown = returnFalse;

  canvas.client = client;
  canvas.o3d = o3d;

  if (opt_debug) {
    client.gl = o3djs.webgl.addDebuggingWrapper(client.gl);
  }

  element.appendChild(canvas);
  return canvas;
};



function trimAll(sString) 
{ 
	while (sString.substring(0,1) == ' ') 
	{ 
	sString = sString.substring(1, sString.length); 
	} 
	while (sString.substring(sString.length-1, sString.length) == ' ') 
	{ 
	sString = sString.substring(0,sString.length-1); 
	} 
return sString; 
}

function createDefaultMaterial(pack, viewInfo, color) {

var transparency=0;
if ((color[3]<0.99)&&(color[3]>0))
	transparency=1;
	
var material=o3djs.material.createBasicMaterial(pack, viewInfo, color, transparency);
// change lighting parameters
//color = emissive + lightColor * (ambient * diffuse + diffuse * lighting + specular * lightingSpecular * specularFactor) 
//  lightPositionParam.value = [1000, 2000, 3000];

//	material.getParam('lightWorldPos').value=[-2000,-2000,-10000];
	material.getParam('lightWorldPos').value=[2000,2000,10000];
	material.getParam('emissive').value = [0.1, 0.1, 0.1 , 0.08];
	material.getParam('ambient').value = [0.1, 0.1, 0.1, 0.005];
	material.getParam('specular').value = [0.1, 0.1, 0.1, 0.01];
	material.getParam('shininess').value=0.02;
	material.getParam('specularFactor').value = 0.1;
	material.getParam('lightColor').value = [0.8, 0.8, 0.8, 0.5];

	return material;
}

function readXMLFile(xmlDoc,vertexInfo ,positionStream ){

// get points
	var piece=xmlDoc.getElementsByTagName("Piece")[0];
	var numberOfPoints=parseInt(piece.getAttribute("NumberOfPoints"));
	var numberOfPolys=parseInt(piece.getAttribute("NumberOfPolys"));
	var points=piece.getElementsByTagName("Points")[0];

	for (var i=0;i<points.childNodes.length;i++)
	{
		var child=points.childNodes[i];
		if ((child.tagName == "DataArray") && (child.getAttribute("Name")=="Points"))
		{
			var numberOfComponents=parseInt(child.getAttribute("NumberOfComponents"));
			var pointsData;
			// IE supports the text property
			if (window.ActiveXObject) {
				pointsData = child.text;
			}
			// Other browsers use textContent
			else {
				pointsData = child.textContent;
			}
			var reg=new RegExp("[ ,;]+", "g");
			var pointsDataArray=trimAll(pointsData).split(reg)

			var j=0;
			var index=0;
			var index2=0;
			var Coord=[0,0,0];
			for (j=0;j<pointsDataArray.length;j++)
			{
				var value=parseFloat(pointsDataArray[j]);
				if (!isNaN(value))
				{
					Coord[index2]=value;
					index++;
					index2++;
					if (index2==3)
					{
						index2=0;
						positionStream.addElement(Coord[0],Coord[1],Coord[2]);
					}
					
				}
			}
			var wantedSize=numberOfComponents*numberOfPoints;
			if (index!=wantedSize)
			  alert ("Error reading "+file+" : \n Number of read coordinates : "+index+
			  "\n Number of wanted coordinates : "+ wantedSize);
		}
	}

//get triangles
	var polys=piece.getElementsByTagName("Polys")[0];
	for (var i=0;i<polys.childNodes.length;i++)
	{
		var child=polys.childNodes[i];
		if ((child.tagName == "DataArray") && (child.getAttribute("Name")=="connectivity"))
		{
			var connectivityData
			// IE supports the text property
			if (window.ActiveXObject) {
				connectivityData = child.text
			}
			// Other browsers use textContent
			else {
				connectivityData = child.textContent;
			}

			var reg=new RegExp("[ ,;]+", "g");
			var connectivityDataArray=trimAll(connectivityData).split(reg)

			var index=0;
			var index2=0;
			var connect=[0,0,0];
			for (var j=0;j<connectivityDataArray.length;j++)
			{
				var value=parseInt(connectivityDataArray[j]);
				if (!isNaN(value))
				{
					connect[index2]=value;
					index++;
					index2++;
					if (index2==3)
					{
						index2=0;
						vertexInfo.addTriangle(connect[0],connect[1],connect[2]);						
					}
				}
			}
			var wantedSize=3*numberOfPolys;
			if (index!=wantedSize)
			  alert ("Error reading "+file+" : \n Number of read indices : "+index+
			  "\n Number of wanted connectivities : "+ wantedSize);
		}
	}
}

function readVTKFile(filestring,vertexInfo ,positionStream , opt_flip){
	var reg2=new RegExp("[ \n]+", "gm");
	var data=filestring.split(reg2);
	
	// read point data
	var index=0;
	while (data[index]!="POINTS")
	{
		index++;
	}
	index++;
	var numberOfPoints=data[index];
	index++
	var coord=[0,0,0];
	var index2=0;
	while (1)
	{
		var number=parseFloat(data[index]);
		while (isNaN(number))
		{
			index++;
			number=parseFloat(data[index]);
		}
		coord[index2]=number;
		index2++;
		index++;
		if (index2==3)
		{
			index2=0;
			positionStream.addElement(coord[0],coord[1],coord[2]);
			numberOfPoints--;
			if (numberOfPoints==0)
			{
				break;
			}
		}
	}
	while (data[index]!="POLYGONS")
	{
		index++;
	}
	index++
	var connectivity=[0,0,0,0];
	var numberOfPolygons=data[index];
	index++;
	index++;
	index2=0;
	while (1)
	{
		var number=parseInt(data[index]);
		while (isNaN(number))
		{
			index++;
			number=parseInt(data[index]);
		}

		connectivity[index2]=number;
		index2++;
		index++;
		if (index2==connectivity[0]+1)
		{
			index2=0;
			if (!opt_flip)
			{
				vertexInfo.addTriangle(connectivity[1],connectivity[2],connectivity[3]);
				if (connectivity[0]==4)
					vertexInfo.addTriangle(connectivity[1],connectivity[3],connectivity[4]);
			}
			else
			{
				vertexInfo.addTriangle(connectivity[1],connectivity[3],connectivity[2]);
				if (connectivity[0]==4)
					vertexInfo.addTriangle(connectivity[1],connectivity[4],connectivity[3]);
			}

			numberOfPolygons--;
			if (numberOfPolygons==0)
			{
				break;
			}
		}
	}
}

function createFromFile(file,pack,color, opt_flip) {
//  state.getStateParam('o3d.CullMode') = o3djs.base.o3d.State.CULL_CCW; 

	var material=createDefaultMaterial(pack, g_viewInfo, color);
	if (color[3]<0)
	{
		var state = pack.createObject('State'); 
		material.state = state; 
		state.getStateParam('FillMode').value = g_o3d.State.WIREFRAME; 
	}
	var vertexInfo = o3djs.primitives.createVertexInfo();
	var positionStream = vertexInfo.addStream(
		3, o3djs.base.o3d.Stream.POSITION);
	var normalStream = vertexInfo.addStream(
		3, o3djs.base.o3d.Stream.NORMAL);

	if (window.XMLHttpRequest)
	{// code for IE7+, Firefox, Chrome, Opera, Safari
		var xmlhttp=new XMLHttpRequest();
	}
	else
	{// code for IE6, IE5
		var xmlhttp=new ActiveXObject("Microsoft.XMLHTTP");
	}
	xmlhttp.open("GET",file,false);
	xmlhttp.send();



	var filename=file.split(".");
	var extension=filename[filename.length-1].toLowerCase();

	switch (extension)
	{
		case "xml":
			var readString=xmlhttp.responseXML;
			readXMLFile(readString,vertexInfo ,positionStream );
			break;
		case "vtk":
			var readString=xmlhttp.responseText;
			readVTKFile(readString,vertexInfo ,positionStream ,opt_flip);
			break;
		default:
		alert (extension+" file format not supported yet!");
	}

	var numberOfPoints=positionStream.numElements();
	var numberOfTriangles=vertexInfo.numTriangles();


// compute normals
	for (var i=0;i<numberOfPoints;i++)
		normalStream.addElement(0,0,0);

	for (var i=0;i<numberOfTriangles;i++)
	{
		var triangle=vertexInfo.getTriangle(i);
		var positions = [];
		for (var ii = 0; ii < 3; ++ii)
		{
			positions[ii] = positionStream.getElementVector(triangle[ii]);
		}

		var v0 = o3djs.math.normalize(o3djs.math.subVector(positions[1],positions[0]));
		var v1 = o3djs.math.normalize(o3djs.math.subVector(positions[2],positions[1]));
		var normal=o3djs.math.normalize(o3djs.math.cross(v0, v1));
//		var normal=o3djs.math.normalize(o3djs.math.cross(v1, v0));
		for (var iii=0;iii<3;iii++)
		{
			var currentPoint=triangle[iii];
			var normal2=normalStream.getElementVector(currentPoint);
			normalStream.setElementVector(currentPoint,
				o3djs.math.addVector(normal,normal2));
		}
	}

	for (var i=0;i<numberOfPoints;i++)
	{
		var normal=normalStream.getElementVector(i);
		normalStream.setElementVector(i,o3djs.math.normalize(normal));
	}
	return vertexInfo.createShape(pack, material);
}

o3djs.base.o3d = o3d;
o3djs.require('o3djs.webgl');
o3djs.require('o3djs.math');
o3djs.require('o3djs.quaternions');
o3djs.require('o3djs.rendergraph');
o3djs.require('o3djs.pack');
o3djs.require('o3djs.arcball');
o3djs.require('o3djs.event');
o3djs.require('o3djs.cameracontroller');
o3djs.require('o3djs.primitives');

// Events
// Run the init() function once the page has finished loading.
// Run the uninit() function when the page has is unloaded.
window.onload = init;
window.onunload = uninit;

// global variables
var g_o3d;
var g_math;
var g_pack;
var g_client;

var g_o3dWidth = -1;
var g_o3dHeight = -1;

var g_viewInfo;
var g_cameracontroller;

function updateClient() {
  if (g_client.renderMode == g_o3d.Client.RENDERMODE_ON_DEMAND) {
    g_client.render();
  }
}

function renderCallback(renderEvent) {
 setClientSize();
    g_client.renderMode = g_o3d.Client.RENDERMODE_ON_DEMAND;
}


function AddMeshes(xmlFile, transform)
{
	var xmlhttp=new XMLHttpRequest();
	xmlhttp.open("GET",xmlFile+"?nocache=" + Math.random(),false);
	xmlhttp.send();
	var readString=xmlhttp.responseXML;

	var meshes=readString.getElementsByTagName("mesh");

	var slashIndex=xmlFile.lastIndexOf("/");

	var path="";
	if (slashIndex>0)
		path=xmlFile.substring(0,slashIndex);

	var flip=0;
	for (var i=0;i<meshes.length;i++)
	{
		var mesh=meshes[i];
		var file=mesh.getAttribute("Mesh");
		var Label=mesh.getAttribute("Label");
		var color=[1.0,1.0,1.0,1.0];
		if (mesh.hasAttribute("flip"))
			flip=1;
		if (mesh.hasAttribute("color"))
		{
			var colorstring=mesh.getAttribute("color");
			var colors=colorstring.split(" ");
			for (var j=0;j<4;j++)
				color[j]=parseFloat(colors[j]);
		}
		if (Label!="0")
			transform.addShape(createFromFile(path+"/"+file,g_pack,color,flip));
	}
}
/**
 * Creates the client area.
 */
function init() {
  o3djs.webgl.makeClients(initStep2);
}

function setClientSize() {
  var newWidth  = g_client.width;
  var newHeight = g_client.height;

  if (newWidth != g_o3dWidth || newHeight != g_o3dHeight) {
    g_o3dWidth = newWidth;
    g_o3dHeight = newHeight;

    // Set the perspective projection matrix
    g_viewInfo.drawContext.projection = g_math.matrix4.perspective(
      g_math.degToRad(45), g_o3dWidth / g_o3dHeight, 0.1, 10000);

    // Sets a new area size for arcball.
    g_cameracontroller.setAreaSize(g_o3dWidth, g_o3dHeight);

    //o3djs.dump.dump("areaWidth: " + g_o3dWidth + "\n");
    //o3djs.dump.dump("areaHeight: " + g_o3dHeight + "\n");
  }
}

var g_dragging = false;

function startDragging(e) {
	g_dragging = true;

	if ((e.shiftKey)||(e.button==1))
		g_cameracontroller.setDragMode(o3djs.cameracontroller.DragMode.MOVE_CENTER_IN_VIEW_PLANE,e.x,e.y);
	else
		g_cameracontroller.setDragMode(o3djs.cameracontroller.DragMode.SPIN_ABOUT_CENTER,e.x,e.y);
}

function drag(e) {
	if (g_dragging) {
		g_cameracontroller.mouseMoved(e.x,e.y);
		var matrix=g_cameracontroller.calculateViewMatrix();
		g_client.root.localMatrix=matrix;
		updateClient();
	}
}

function stopDragging(e) {
	g_dragging = false;
	g_cameracontroller.setDragMode(o3djs.cameracontroller.DragMode.NONE);
}

function scrollMe(e) {
  if (e.deltaY) {
	g_cameracontroller.backpedal*=(e.deltaY < 0 ? 14 : 10)/12;
	g_client.root.localMatrix=g_cameracontroller.calculateViewMatrix();
	updateClient();
  }
}

/**
 * Initializes O3D, creates the object and sets up the transform and
 * render graphs.
 * @param {Array} clientElements Array of o3d object elements.
 */
function initStep2(clientElements) {
	// Initializes global variables and libraries.
	var o3dElement = clientElements[0];
	g_client = o3dElement.client;
	g_o3d = o3dElement.o3d;
	g_math = o3djs.math;

	g_lastRot = g_math.matrix4.identity();
	g_thisRot = g_math.matrix4.identity();

	// Create a pack to manage the objects created.
	g_pack = g_client.createPack();

	// Create the render graph for a view.
	g_viewInfo = o3djs.rendergraph.createBasicView(
	  g_pack,
	  g_client.root,
	  g_client.renderGraphRoot,
	  [1, 1, 1, 1]); //background color

//	g_viewInfo.performanceState.getStateParam('CullMode').value=g_o3d.State.CULL_NONE; 

	// Create a new transform and parent the Shape under it.
	var Transform = g_pack.createObject('Transform');
	// Create the Shape for the mesh

	AddMeshes("http://www.creatis.insa-lyon.fr/~valette/meshView/coeurThorax/coeurthorax.xml", Transform);
//	AddMeshes("data/output.xml", Transform);
//	AddMeshes("data/coeur.xml", Transform);
//	Transform.addShape(createFromFile("data/heart.vtk",g_pack,[1,1,1,0.6]));
//	Transform.addShape(createFromFile("data/skull.xml",g_pack,[1,1,1,0.6]));

	Transform.parent = g_client.root;

	g_cameracontroller=o3djs.cameracontroller.createCameraController(
	[150,150,150],//centerPos,
	500,//backpedal,
	100,//heightAngle,
	100,//rotationAngle,
   0.8//fieldOfViewAngle,
   )//opt_onChange)


	setClientSize();
	g_client.render();

//	g_cameracontroller.viewAll(o3djs.util.getBoundingBoxOfTree(g_client.root),1);
	g_client.root.localMatrix=g_cameracontroller.calculateViewMatrix();

	o3djs.event.addEventListener(o3dElement, 'mousedown', startDragging);
	o3djs.event.addEventListener(o3dElement, 'mousemove', drag);
	o3djs.event.addEventListener(o3dElement, 'mouseup', stopDragging);
	o3djs.event.addEventListener(o3dElement, 'wheel', scrollMe); 

	g_client.render();
	// Set our render callback for animation.
	// This sets a function to be executed every time a frame is rendered.
	g_client.setRenderCallback(renderCallback);
	window.onresize = updateClient;
}

/**
 * Removes any callbacks so they don't get called after the page has unloaded.
 */
function uninit() {
  if (g_client) {
    g_client.cleanup();
  }
}

