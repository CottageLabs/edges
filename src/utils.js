import {$} from '../dependencies/jquery';

function getParam(params, key, def) {
    function _getDefault() {
        if (typeof def === 'function') {
            return def();
        }
        return def;
    }

    if (!params) {
        return _getDefault();
    }

    if (!params.hasOwnProperty(key)) {
        return _getDefault();
    }

    return params[key];
}

function getUrlParams() {
    var params = {};
    var url = window.location.href;
    var fragment = false;

    // break the anchor off the url
    if (url.indexOf("#") > -1) {
        fragment = url.slice(url.indexOf('#'));
        url = url.substring(0, url.indexOf('#'));
    }

    // extract and split the query args
    var args = url.slice(url.indexOf('?') + 1).split('&');

    for (var i = 0; i < args.length; i++) {
        var kv = args[i].split('=');
        if (kv.length === 2) {
            var key = kv[0].replace(/\+/g, "%20");
            key = decodeURIComponent(key);
            var val = kv[1].replace(/\+/g, "%20");
            val = decodeURIComponent(val);
            if (val[0] === "[" || val[0] === "{") {
                // if it looks like a JSON object in string form...
                // remove " (double quotes) at beginning and end of string to make it a valid
                // representation of a JSON object, or the parser will complain
                val = val.replace(/^"/,"").replace(/"$/,"");
                val = JSON.parse(val);
            }
            params[key] = val;
        }
    }

    // record the fragment identifier if required
    if (fragment) {
        params['#'] = fragment;
    }

    return params;
}

//////////////////////////////////////////////////////////////////
// Closures for integrating the object with other modules

// returns a function that will call the named function (fn) on
// a specified object instance (obj), with all "arguments"
// supplied to the closure by the caller
//
// if the args property is specified here, instead a parameters object
// will be constructed with a one to one mapping between the names in args
// and the values in the "arguments" supplied to the closure, until all
// values in "args" are exhausted.
//
// so, for example,
//
// objClosure(this, "function")(arg1, arg2, arg3)
// results in a call to
// this.function(arg1, arg2, arg3, ...)
//
// and
// objClosure(this, "function", ["one", "two"])(arg1, arg2, arg3)
// results in a call to
// this.function({one: arg1, two: arg2})
//
function objClosure(obj, fn, args, context_params) {
    return function() {
        if (args) {
            var params = {};
            for (var i = 0; i < args.length; i++) {
                if (arguments.length > i) {
                    params[args[i]] = arguments[i];
                }
            }
            if (context_params) {
                params = $.extend(params, context_params);
            }
            obj[fn](params);
        } else {
            var slice = Array.prototype.slice;
            var theArgs = slice.apply(arguments);
            if (context_params) {
                theArgs.push(context_params);
            }
            obj[fn].apply(obj, theArgs);
        }
    }
}

class AsyncGroup {
    constructor(params) {
        this.list = getParam(params, "list");
        this.successCallbackArgs = getParam(params, "successCallbackArgs");
        this.errorCallbackArgs = getParam(params, "errorCallbackArgs");

        this.functions = {
            action: getParam(params, "action"),
            success: getParam(params, "success"),
            carryOn: getParam(params, "carryOn"),
            error: getParam(params, "error")
        };

        this.checkList = [];

        this.finished = false;

        for (let i = 0; i < this.list.length; i++) {
            this.checkList.push(0);
        }
    }

    process(params) {
        if (this.list.length === 0) {
            this.functions.carryOn();
        }

        for (let i = 0; i < this.list.length; i++) {
            let context = {index: i};

            let success_callback = edges.objClosure(this, "_actionSuccess", this.successCallbackArgs, context);
            let error_callback = edges.objClosure(this, "_actionError", this.successCallbackArgs, context);
            let complete_callback = false;

            this.functions.action({entry: this.list[i],
                success_callback: success_callback,
                error_callback: error_callback,
                complete_callback: complete_callback
            });
        }
    };

    _actionSuccess(params) {
        let index = params.index;
        delete params.index;

        params["entry"] = this.list[index];
        this.functions.success(params);
        this.checkList[index] = 1;

        if (this._isComplete()) {
            this._finalise();
        }
    };

    _actionError(params) {
        let index = params.index;
        delete params.index;

        params["entry"] = this.list[index];
        this.functions.error(params);
        this.checkList[index] = -1;

        if (this._isComplete()) {
            this._finalise();
        }
    };

    _actionComplete(params) {};

    _isComplete() {
        return $.inArray(0, this.checkList) === -1;
    };

    _finalise = function() {
        if (this.finished) {
            return;
        }
        this.finished = true;
        this.functions.carryOn();
    };
}

export {getParam, getUrlParams, objClosure, AsyncGroup}