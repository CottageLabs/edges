import {$} from '../../dependencies/jquery';

class Aggregation {
    static type = "aggregation"

    constructor(params) {
        this.name = params.name;
        this.aggs = params.aggs || [];
    }

    addAggregation(agg) {
        for (var i = 0; i < this.aggs.length; i++) {
            if (this.aggs[i].name === agg.name) {
                return;
            }
        }
        this.aggs.push(agg);
    }

    removeAggregation() {};
    clearAggregations() {};

    // for use by sub-classes, for their convenience in rendering
    // the overall structure of the aggregation to an object
    _make_aggregation(type, body) {
        var obj = {};
        obj[this.name] = {};
        obj[this.name][type] = body;

        if (this.aggs.length > 0) {
            obj[this.name]["aggs"] = {};
            for (var i = 0; i < this.aggs.length; i++) {
                $.extend(obj[this.name]["aggs"], this.aggs[i].objectify())
            }
        }

        return obj;
    }

    _parse_wrapper(obj, type) {
        this.name = Object.keys(obj)[0];
        var body = obj[this.name][type];

        var aggs = obj[this.name].aggs ? obj[this.name].aggs : obj[this.name].aggregations;
        if (aggs) {
            var anames = Object.keys(aggs);
            for (var i = 0; i < anames.length; i++) {
                var name = anames[i];
                var agg = aggs[anames[i]];
                var subtype = Object.keys(agg)[0];
                var raw = {};
                raw[name] = agg;
                var oa = es.aggregationFactory(subtype, {raw: raw});
                if (oa) {
                    this.addAggregation(oa);
                }
            }
        }

        return body;
    }
}

class Filter {
    static type = "filter"

    constructor(params) {
        this.field = params.field;
    }

    matches(other) {
        return this._baseMatch(other);
    }

    _baseMatch(other) {
        // type must match
        if (other.type !== this.type) {
            return false;
        }
        // field (if set) must match
        if (other.field && other.field !== this.field) {
            return false;
        }
        // otherwise this matches
        return true;
    }

    objectify() {};
    parse() {};
}

function _classExtends(clazz, ref) {
    if (clazz.__proto__ === null) {
        return false;
    }
    if (clazz.__proto__ === ref) {
        return true;
    }
    else {
        return _classExtends(clazz.__proto__, ref);
    }
}

/** @namespace */
var es = {

    /////////////////////////////////////////////////////
    // fixed properties, like special characters, etc

    // The reserved characters in elasticsearch query strings
    // Note that the "\" has to go first, as when these are substituted, that character
    // will get introduced as an escape character
    specialChars : ["\\", "+", "-", "=", "&&", "||", ">", "<", "!", "(", ")", "{", "}", "[", "]", "^", '"', "~", "*", "?", ":", "/"],

    // FIXME: specialChars is not currently used for encoding, but it would be worthwhile giving the option
    // to allow/disallow specific values, but that requires a much better (automated) understanding of the
    // query DSL

    // the reserved special character set with * and " removed, so that users can do quote searches and wildcards
    // if they want
    specialCharsSubSet : ["\\", "+", "-", "=", "&&", "||", ">", "<", "!", "(", ")", "{", "}", "[", "]", "^", "~", "?", ":", "/"],

    // values that have to be in even numbers in the query or they will be escaped
    characterPairs : ['"'],

    // distance units allowed by ES
    distanceUnits : ["km", "mi", "miles", "in", "inch", "yd", "yards", "kilometers", "mm", "millimeters", "cm", "centimeters", "m", "meters"],

    // request method to be used throughout.  Set this before using the module if you want it different
    requestMethod : "get",

    // add request headers (such as Auth) if you need to
    requestHeaders : false,

    Filter: Filter,
    Aggregation: Aggregation,

    ////////////////////////////////////////////////////

    ////////////////////////////////////////////////////
    // object factories

    aggregationFactory : function(type, params) {
        for (const [key, value] of Object.entries(es)) {
            if (_classExtends(es[key], Aggregation)) {
                if (es[key].type === type) {
                    return new es[key](params);
                }
            }
        }
    },

    filterFactory : function(type, params) {
        // query string is a special case
        if (type === "query_string") {
            return new es.QueryString(params);
        }

        // otherwise auto-detect
        for (const [key, value] of Object.entries(es)) {
            if (_classExtends(es[key], Filter)) {
                if (es[key].type === type) {
                    return new es[key](params);
                }
            }
        }
    },

    ////////////////////////////////////////////////////
    /** @namespace */
    /** Query objects for standard query structure */
    /**
     *
     * @param filtered {Boolean} Is this an ES filtered query?
     * @param size=10 {Number} What amount of results are required. ES defaults to 10.
     * @param from {Number} Beginning point for results.
     * @param fields {String[]} Required fields.
     * @param aggs {String[]} ES aggregations.
     * @param must {String[]} ES must query.
     * @param source {String} ES source.
     * @param should {String[]} ES should.
     * @param mustNot {String[]} ES must not.
     * @param partialFields ???
     * @param scriptFields ???
     * @param minimumShouldMatch ???
     * @param facets {String[]} for older versions of ES
     */
    Query: class {
        constructor(params) {
            if (!params) { params = {}}
            // properties that can be set directly (thought note that they may need to be read via their getters)
            this.filtered = false;  // this is no longer present in es5.x+
            this.trackTotalHits = true;   // FIXME: hard code this for the moment, we can introduce the ability to vary it later

            this.size = es.getParam(params.size, false);
            this.from = es.getParam(params.from, false);
            this.fields = es.getParam(params.fields, []);
            this.aggs = es.getParam(params.aggs, []);
            this.must = es.getParam(params.must, []);
            this.mustNot = es.getParam(params.mustNot, []);
            this.should = es.getParam(params.should, []);
            this.minimumShouldMatch = es.getParam(params.minimumShouldMatch, false);

            // defaults from properties that will be set through their setters (see the bottom
            // of the function)
            this.queryString = false;
            this.sort = [];

            // ones that we haven't used yet, so are awaiting implementation
            // NOTE: once we implement these, they also need to be considered in merge()
            this.source = es.getParam(params.source, false);
            this.partialFields = es.getParam(params.partialField, false);
            this.scriptFields = es.getParam(params.scriptFields, false);
            this.partialFields = es.getParam(params.partialFields, false);
            this.scriptFields = es.getParam(params.scriptFields, false);

            // for old versions of ES, so are not necessarily going to be implemented
            this.facets = es.getParam(params.facets, []);

            ///////////////////////////////////////////////////////////
            // final part of construction - set the dynamic properties
            // via their setters

            if (params.queryString) {
                this.setQueryString(params.queryString);
            }

            if (params.sort) {
                this.setSortBy(params.sort);
            }

            // finally, if we're given a raw query, parse it
            if (params.raw) {
                this.parse(params.raw)
            }
        }

        /////////////////////////////////////////////////
        // getters and setters

        getSize() {
            if (this.size !== undefined && this.size !== false) {
                return this.size;
            }
            return 10;
        }

        getFrom() {
            if (this.from) {
                return this.from
            }
            return 0;
        }

        addField(field) {
            if ($.inArray(field, this.fields) === -1) {
                this.fields.push(field);
            }
        }

        setQueryString(params) {
            var qs = params;
            if (!(params instanceof es.QueryString)) {
                if ($.isPlainObject(params)) {
                    qs = new es.QueryString(params);
                } else {
                    qs = new es.QueryString({queryString: params});
                }
            }
            this.queryString = qs;
        }

        getQueryString() {
            return this.queryString;
        }

        removeQueryString() {
            this.queryString = false;
        }

        setSortBy(params) {
            // overwrite anything that was there before
            this.sort = [];
            // ensure we have a list of sort options
            var sorts = params;
            if (!$.isArray(params)) {
                sorts = [params]
            }
            // add each one
            for (var i = 0; i < sorts.length; i++) {
                this.addSortBy(sorts[i]);
            }
        }

        addSortBy(params) {
            // ensure we have an instance of es.Sort
            var sort = params;
            if (!(params instanceof es.Sort)) {
                sort = new es.Sort(params);
            }
            // prevent repeated sort options being added
            for (var i = 0; i < this.sort.length; i++) {
                var so = this.sort[i];
                if (so.field === sort.field) {
                    return;
                }
            }
            // add the sort option
            this.sort.push(sort);
        }

        prependSortBy(params) {
            // ensure we have an instance of es.Sort
            var sort = params;
            if (!(params instanceof es.Sort)) {
                sort = new es.Sort(params);
            }
            this.removeSortBy(sort);
            this.sort.unshift(sort);
        }

        removeSortBy(params) {
            // ensure we have an instance of es.Sort
            var sort = params;
            if (!(params instanceof es.Sort)) {
                sort = new es.Sort(params);
            }
            var removes = [];
            for (var i = 0; i < this.sort.length; i++) {
                var so = this.sort[i];
                if (so.field === sort.field) {
                    removes.push(i);
                }
            }
            removes = removes.sort().reverse();
            for (var i = 0; i < removes.length; i++) {
                this.sort.splice(removes[i], 1);
            }
        }

        getSortBy() {
            return this.sort;
        }

        setSourceFilters(params) {
            if (!this.source) {
                this.source = {include: [], exclude: []};
            }
            if (params.include) {
                this.source.include = params.include;
            }
            if (params.exclude) {
                this.source.exclude = params.exclude;
            }
        }

        addSourceFilters(params) {
            if (!this.source) {
                this.source = {include: [], exclude: []};
            }
            if (params.include) {
                if (this.source.include) {
                    Array.prototype.push.apply(this.source.include, params.include);
                } else {
                    this.source.include = params.include;
                }
            }
            if (params.exclude) {
                if (this.source.include) {
                    Array.prototype.push.apply(this.source.include, params.include);
                } else {
                    this.source.include = params.include;
                }
            }
        }

        getSourceIncludes() {
            if (!this.source) {
                return [];
            }
            return this.source.include;
        }

        getSourceExcludes() {
            if (!this.source) {
                return [];
            }
            return this.source.exclude;
        };

        getAggregation(params) {
            var name = params.name;
            for (var i = 0; i < this.aggs.length; i++) {
                var a = this.aggs[i];
                if (a.name === name) {
                    return a;
                }
            }
        }

        addAggregation(agg, overwrite) {
            if (overwrite) {
                this.removeAggregation(agg.name);
            } else {
                for (var i = 0; i < this.aggs.length; i++) {
                    if (this.aggs[i].name === agg.name) {
                        return;
                    }
                }
            }
            this.aggs.push(agg);
        }

        removeAggregation(name) {
            var removes = [];
            for (var i = 0; i < this.aggs.length; i++) {
                if (this.aggs[i].name === name) {
                    removes.push(i);
                }
            }
            removes = removes.sort().reverse();
            for (var i = 0; i < removes.length; i++) {
                this.aggs.splice(removes[i], 1);
            }
        }

        clearAggregations() {
            this.aggs = [];
        }

        listAggregations() {
            return this.aggs;
        }

        addMust(filter) {
            var existing = this.listMust(filter);
            if (existing.length === 0) {
                this.must.push(filter);
            }
        }

        listMust(template) {
            return this.listFilters({boolType: "must", template: template});
        }

        removeMust(template) {
            var removes = [];
            for (var i = 0; i < this.must.length; i++) {
                var m = this.must[i];
                if (m.matches(template)) {
                    removes.push(i);
                }
            }
            removes = removes.sort().reverse();
            for (var i = 0; i < removes.length; i++) {
                this.must.splice(removes[i], 1);
            }
            // return the count of filters that were removed
            return removes.length;
        }

        clearMust() {
            this.must = [];
        }

        addMustNot(filter) {
            var existing = this.listMustNot(filter);
            if (existing.length === 0) {
                this.mustNot.push(filter);
            }
        }

        listMustNot(template) {
            return this.listFilters({boolType: "must_not", template: template});
        }

        removeMustNot(template) {
            var removes = [];
            for (var i = 0; i < this.mustNot.length; i++) {
                var m = this.mustNot[i];
                if (m.matches(template)) {
                    removes.push(i);
                }
            }
            removes = removes.sort().reverse();
            for (var i = 0; i < removes.length; i++) {
                this.mustNot.splice(removes[i], 1);
            }
            // return the count of filters that were removed
            return removes.length;
        }

        clearMustNot() {
            this.mustNot = [];
        }

        addShould(filter) {
            var existing = this.listShould(filter);
            if (existing.length === 0) {
                this.should.push(filter);
            }
        }

        listShould(template) {
            return this.listFilters({boolType: "should", template: template});
        }

        removeShould(template) {
            var removes = [];
            for (var i = 0; i < this.should.length; i++) {
                var m = this.should[i];
                if (m.matches(template)) {
                    removes.push(i);
                }
            }
            removes = removes.sort().reverse();
            for (var i = 0; i < removes.length; i++) {
                this.should.splice(removes[i], 1);
            }
            // return the count of filters that were removed
            return removes.length;
        }

        clearShould() {
            this.should = [];
        }

        /////////////////////////////////////////////////
        // interrogative functions

        hasFilters() {
            return this.must.length > 0 || this.should.length > 0 || this.mustNot.length > 0
        }

        // in general better to use the listMust, listShould, listMustNot, directly.
        // those methods each use this method internally anyway
        listFilters(params) {
            var boolType = params.boolType || "must";
            var template = params.template || false;

            //var field = params.field || false;
            //var filterType = params.filterType || false;

            // first get the boolean filter field that we're going to look in
            var bool = [];
            if (boolType === "must") {
                bool = this.must;
            } else if (boolType === "should") {
                bool = this.should;
            } else if (boolType === "must_not") {
                bool = this.mustNot;
            }

            if (!template) {
                return bool;
            }
            var l = [];
            for (var i = 0; i < bool.length; i++) {
                var m = bool[i];
                if (m.matches(template)) {
                    l.push(m);
                }
            }
            return l;
        }

        ////////////////////////////////////////////////
        // create, parse, serialise functions

        merge(source) {
            // merge this query (in place) with the provided query, where the provided
            // query is dominant (i.e. any properties it has override this object)
            //
            // These are the merge rules:
            // this.filtered - take from source
            // this.size - take from source if set
            // this.from - take from source if set
            // this.fields - append any new ones from source
            // this.aggs - append any new ones from source, overwriting any with the same name
            // this.must - append any new ones from source
            // this.mustNot - append any new ones from source
            // this.should - append any new ones from source
            // this.minimumShouldMatch - take from source if set
            // this.queryString - take from source if set
            // this.sort - prepend any from source
            // this.source - append any new ones from source

            this.filtered = source.filtered;
            if (source.size) {
                this.size = source.size;
            }
            if (source.from) {
                this.from = source.from;
            }
            if (source.fields && source.fields.length > 0) {
                for (var i = 0; i < source.fields.length; i++) {
                    this.addField(source.fields[i]);
                }
            }
            var aggs = source.listAggregations();
            for (var i = 0; i < aggs.length; i++) {
                this.addAggregation(aggs[i], true);
            }
            var must = source.listMust();
            for (var i = 0; i < must.length; i++) {
                this.addMust(must[i]);
            }
            let mustNot = source.listMustNot();
            for (let i = 0; i < mustNot.length; i++) {
                this.addMustNot(mustNot[i]);
            }
            let should = source.listShould();
            for (let i = 0; i < should.length; i++) {
                this.addShould(should[i]);
            }
            if (source.minimumShouldMatch !== false) {
                this.minimumShouldMatch = source.minimumShouldMatch;
            }
            if (source.getQueryString()) {
                this.setQueryString(source.getQueryString())
            }
            var sorts = source.getSortBy();
            if (sorts && sorts.length > 0) {
                sorts.reverse();
                for (var i = 0; i < sorts.length; i++) {
                    this.prependSortBy(sorts[i])
                }
            }
            var includes = source.getSourceIncludes();
            var excludes = source.getSourceExcludes();
            this.addSourceFilters({include: includes, exclude: excludes});
        }

        objectify(params) {
            if (!params) {
                params = {};
            }
            // this allows you to specify which bits of the query get objectified
            var include_query_string = params.include_query_string === undefined ? true : params.include_query_string;
            var include_filters = params.include_filters === undefined ? true : params.include_filters;
            var include_paging = params.include_paging === undefined ? true : params.include_paging;
            var include_sort = params.include_sort === undefined ? true : params.include_sort;
            var include_fields = params.include_fields === undefined ? true : params.include_fields;
            var include_aggregations = params.include_aggregations === undefined ? true : params.include_aggregations;
            var include_source_filters = params.include_source_filters === undefined ? true : params.include_source_filters;

            // queries will be separated in queries and bool filters, which may then be
            // combined later
            var q = {};
            var query_part = {};
            var bool = {};

            // query string
            if (this.queryString && include_query_string) {
                $.extend(query_part, this.queryString.objectify());
            }

            if (include_filters) {
                // add any MUST filters
                if (this.must.length > 0) {
                    var musts = [];
                    for (var i = 0; i < this.must.length; i++) {
                        var m = this.must[i];
                        musts.push(m.objectify());
                    }
                    bool["must"] = musts;
                }
                // add any must_not filters
                if (this.mustNot.length > 0) {
                    let mustNots = [];
                    for (var i = 0; i < this.mustNot.length; i++) {
                        var m = this.mustNot[i];
                        mustNots.push(m.objectify());
                    }
                    bool["must_not"] = mustNots;
                }
                // add any should filters
                if (this.should.length > 0) {
                    let should = [];
                    for (var i = 0; i < this.should.length; i++) {
                        var m = this.should[i];
                        should.push(m.objectify());
                    }
                    bool["should"] = should;
                }
                if (this.minimumShouldMatch !== false) {
                    bool["minimum_should_match"] = this.minimumShouldMatch;
                }
            }

            var qpl = Object.keys(query_part).length;
            var bpl = Object.keys(bool).length;
            var query_portion = {};
            if (qpl === 0 && bpl === 0) {
                query_portion["match_all"] = {};
            } else if (qpl === 0 && bpl > 0) {
                query_portion["bool"] = bool;
            } else if (qpl > 0 && bpl === 0) {
                query_portion = query_part;
            } else if (qpl > 0 && bpl > 0) {
                query_portion["bool"] = bool;
                query_portion["bool"]["must"].push(query_part);
            }
            q["query"] = query_portion;

            if (include_paging) {
                // page size
                if (this.size !== undefined && this.size !== false) {
                    q["size"] = this.size;
                }

                // page number (from)
                if (this.from) {
                    q["from"] = this.from;
                }
            }

            // sort option
            if (this.sort.length > 0 && include_sort) {
                q["sort"] = [];
                for (var i = 0; i < this.sort.length; i++) {
                    q.sort.push(this.sort[i].objectify())
                }
            }

            // fields
            if (this.fields.length > 0 && include_fields) {
                q["stored_fields"] = this.fields;
            }

            // add any aggregations
            if (this.aggs.length > 0 && include_aggregations) {
                q["aggs"] = {};
                for (var i = 0; i < this.aggs.length; i++) {
                    var agg = this.aggs[i];
                    $.extend(q.aggs, agg.objectify())
                }
            }

            // add the source filters
            if (include_source_filters && this.source && (this.source.include || this.source.exclude)) {
                q["_source"] = {};
                if (this.source.include.length > 0) {
                    q["_source"]["include"] = this.source.include;
                }
                if (this.source.exclude.length > 0) {
                    q["_source"]["exclude"] = this.source.exclude;
                }
            }

            // set whether to track the total
            if (this.trackTotalHits) {
                q["track_total_hits"] = true;
            }

            return q;
        }

        toString() {
            return JSON.stringify(this.objectify())
        }

        parse(obj) {

            function parseBool(bool, target) {
                if (bool.must) {
                    for (var i = 0; i < bool.must.length; i++) {
                        var type = Object.keys(bool.must[i])[0];
                        var fil = es.filterFactory(type, {raw: bool.must[i]});
                        if (fil && type !== "query_string") {
                            target.addMust(fil);
                        } else if (fil && type === "query_string") {
                            // FIXME: this will work fine as long as there are no nested bools
                            target.setQueryString(fil);
                        }
                    }
                }
                if (bool.must_not) {
                    for (var i = 0; i < bool.must_not.length; i++) {
                        var type = Object.keys(bool.must_not[i])[0];
                        var fil = es.filterFactory(type, {raw: bool.must_not[i]});
                        if (fil) {
                            target.addMustNot(fil);
                        }
                    }
                }
                if (bool.should) {
                    for (var i = 0; i < bool.should.length; i++) {
                        var type = Object.keys(bool.should[i])[0];
                        var fil = es.filterFactory(type, {raw: bool.should[i]});
                        if (fil) {
                            target.addShould(fil);
                        }
                    }
                }
                if (bool.minimum_should_match) {
                    target.minimumShouldMatch = bool.minimum_should_match;
                }
            }

            function parseQuery(q, target) {
                var keys = Object.keys(q);
                for (var i = 0; i < keys.length; i++) {
                    var type = keys[i];
                    if (type === "bool") {
                        parseBool(q.bool, target);
                        continue;
                    }
                    var impl = es.filterFactory(type, {raw: q[type]});
                    if (impl) {
                        if (type === "query_string") {
                            target.setQueryString(impl);
                        }
                        // FIXME: other non-filtered queries?
                    }
                }
            }

            // parse the query itself
            if (obj.query) {
                if (obj.query.filtered) {
                    this.filtered = true;
                    var bool = obj.query.filtered.filter.bool;
                    if (bool) {
                        parseBool(bool, this);
                    }
                    var q = obj.query.filtered.query;
                    parseQuery(q, this);
                } else {
                    var q = obj.query;
                    parseQuery(q, this);
                }
            }

            if (obj.size) {
                this.size = obj.size;
            }

            if (obj.from) {
                this.from = obj.from;
            }

            if (obj.stored_fields) {
                this.fields = obj.stored_fields;
            }

            if (obj.sort) {
                for (var i = 0; i < obj.sort.length; i++) {
                    var so = obj.sort[i];
                    this.addSortBy(new es.Sort({raw: so}));
                }
            }

            if (obj.aggs || obj.aggregations) {
                var aggs = obj.aggs ? obj.aggs : obj.aggregations;
                var anames = Object.keys(aggs);
                for (var i = 0; i < anames.length; i++) {
                    var name = anames[i];
                    var agg = aggs[name];
                    var type = Object.keys(agg)[0];
                    var raw = {};
                    raw[name] = agg;
                    var oa = es.aggregationFactory(type, {raw: raw});
                    if (oa) {
                        this.addAggregation(oa);
                    }
                }
            }

            if (obj._source) {
                var source = obj._source;
                var include = [];
                var exclude = [];

                if (typeof source === "string") {
                    include.push(source);
                }
                else if (Array.isArray(source)) {
                    include = source;
                } else {
                    if (source.hasOwnProperty("include")) {
                        include = source.include;
                    }
                    if (source.hasOwnProperty("exclude")) {
                        exclude = source.exclude;
                    }
                }
                this.setSourceFilters({include: include, exclude: exclude});
            }
        }

        clone() {
            return new es.Query({raw: Object.assign({}, this.objectify())})
        }
    },

    ///////////////////////////////////////////////
    // Query String

    QueryString : class {
        constructor(params) {
            this.queryString = params.queryString || false;
            this.defaultField = params.defaultField || false;
            this.defaultOperator = params.defaultOperator || "OR";

            this.fuzzify = params.fuzzify || false;     // * or ~
            this.escapeSet = params.escapeSet || es.specialCharsSubSet;
            this.pairs = params.pairs || es.characterPairs;
            this.unEscapeSet = params.unEscapeSet || es.specialChars;

            if (params.raw) {
                this.parse(params.raw);
            }
        }

        objectify() {
            var qs = this._escape(this._fuzzify(this.queryString));
            var obj = {query_string : {query : qs}};
            if (this.defaultOperator) {
                obj.query_string["default_operator"] = this.defaultOperator;
            }
            if (this.defaultField) {
                obj.query_string["default_field"] = this.defaultField;
            }
            return obj;
        }

        parse(obj) {
            if (obj.query_string) {
                obj = obj.query_string;
            }
            this.queryString = this._unescape(obj.query);
            if (obj.default_operator) {
                this.defaultOperator = obj.default_operator;
            }
            if (obj.default_field) {
                this.defaultField = obj.default_field;
            }
        }

        _fuzzify(str) {
            if (!this.fuzzify || !(this.fuzzify === "*" || this.fuzzify === "~")) {
                return str;
            }

            if (!(str.indexOf('*') === -1 && str.indexOf('~') === -1 && str.indexOf(':') === -1)) {
                return str;
            }

            var pq = "";
            var optparts = str.split(' ');
            for (var i = 0; i < optparts.length; i++) {
                var oip = optparts[i];
                if (oip.length > 0) {
                    oip = oip + this.fuzzify;
                    this.fuzzify === "*" ? oip = "*" + oip : false;
                    pq += oip + " ";
                }
            }
            return pq;
        };

        _escapeRegExp(string) {
            return string.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
        };

        _replaceAll(string, find, replace) {
            return string.replace(new RegExp(this._escapeRegExp(find), 'g'), replace);
        };

        _unReplaceAll(string, find) {
            return string.replace(new RegExp("\\\\(" + this._escapeRegExp(find) + ")", 'g'), "$1");
        };

        _paired(string, pair) {
            var matches = (string.match(new RegExp(this._escapeRegExp(pair), "g"))) || [];
            return matches.length % 2 === 0;
        };

        _escape(str) {
            // make a copy of the special characters (we may modify it in a moment)
            var scs = this.escapeSet.slice(0);

            // first check for pairs, and push any extra characters to be escaped
            for (var i = 0; i < this.pairs.length; i++) {
                var char = this.pairs[i];
                if (!this._paired(str, char)) {
                    scs.push(char);
                }
            }

            // now do the escape
            for (var i = 0; i < scs.length; i++) {
                var char = scs[i];
                str = this._replaceAll(str, char, "\\" + char);
            }

            return str;
        };

        _unescape(str) {
            for (var i = 0; i < this.unEscapeSet.length; i++) {
                var char = this.unEscapeSet[i];
                str = this._unReplaceAll(str, char)
            }
            return str;
        };
    },

    //////////////////////////////////////////////
    // Sort Option

    Sort : class {
        constructor(params) {
            this.field = params.field || "_score";
            this.order = params.order || "desc";

            if (params.raw) {
                this.parse(params.raw);
            }
        }

        objectify() {
            var obj = {};
            obj[this.field] = {order: this.order};
            return obj;
        }

        parse(obj) {
            this.field = Object.keys(obj)[0];
            if (obj[this.field].order) {
                this.order = obj[this.field].order;
            }
        }
    },

    //////////////////////////////////////////////
    // Root Aggregation and aggregation implementations

    TermsAggregation : class extends Aggregation {
        static type = "terms";

        constructor(params) {
            super(params);
            this.field = params.field || false;
            this.size = params.size || 10;

            // set the ordering for the first time
            this.orderBy = "_count";
            if (params.orderBy) {
                this.orderBy = params.orderBy;
                if (this.orderBy[0] !== "_") {
                    this.orderBy = "_" + this.orderBy;
                }
            }
            this.orderDir = params.orderDir || "desc";

            if (params.raw) {
                this.parse(params.raw);
            }
        }

        // provide a method to set and normalise the ordering in future
        setOrdering(orderBy, orderDir) {
            this.orderBy = orderBy;
            if (this.orderBy[0] !== "_") {
                this.orderBy = "_" + this.orderBy;
            }
            this.orderDir = orderDir;
        }

        objectify() {
            var body = {field: this.field, size: this.size, order: {}};
            body.order[this.orderBy] = this.orderDir;
            return this._make_aggregation(es.TermsAggregation.type, body);
        }

        parse(obj) {
            var body = this._parse_wrapper(obj, es.TermsAggregation.type);
            this.field = body.field;
            if (body.size) {
                this.size = body.size;
            }
            if (body.order) {
                this.orderBy = Object.keys(body.order)[0];
                this.orderDir = body.order[this.orderBy];
            }
        }
    },

    CardinalityAggregation : class extends Aggregation {
        static type = "cardinality";

        constructor(params) {
            super(params);
            this.field = es.getParam(params.field, false);

            if (params.raw) {
                this.parse(params.raw);
            }
        }

        objectify() {
            var body = {field: this.field};
            return this._make_aggregation(es.CardinalityAggregation.type, body);
        };

        parse(obj) {
            var body = this._parse_wrapper(obj, es.CardinalityAggregation.type);
            this.field = body.field;
        };
    },

    RangeAggregation : class extends Aggregation {
        static type = "range";

        constructor(params) {
            super(params);
            this.field = params.field || false;
            this.ranges = params.ranges || [];

            if (params.raw) {
                this.parse(params.raw);
            }
        }

        objectify() {
            var body = {field: this.field, ranges: this.ranges};
            return this._make_aggregation(es.RangeAggregation.type, body);
        }

        parse(obj) {
            var body = this._parse_wrapper(obj, es.RangeAggregation.type);
            this.field = body.field;
            this.ranges = body.ranges;
        }
    },

    GeoDistanceAggregation : class extends Aggregation {
        static type = "geo_distance";

        constructor(params) {
            super(params);
            this.field = params.field || false;
            this.lat = params.lat || false;
            this.lon = params.lon || false;
            this.unit = params.unit || "m";
            this.distance_type = params.distance_type || "sloppy_arc";
            this.ranges = params.ranges || [];

            if (params.raw) {
                this.parse(params.raw);
            }
        }

        objectify() {
            var body = {
                field: this.field,
                origin: {lat : this.lat, lon: this.lon},
                unit : this.unit,
                distance_type : this.distance_type,
                ranges: this.ranges
            };
            return this._make_aggregation(es.GeoDistanceAggregation.type, body);
        }

        parse(obj) {
            var body = this._parse_wrapper(obj, es.GeoDistanceAggregation.type);
            this.field = body.field;

            // FIXME: only handles the lat/lon object - but there are several forms
            // this origin could take
            var origin = body.origin;
            if (origin.lat) {
                this.lat = origin.lat;
            }
            if (origin.lon) {
                this.lon = origin.lon;
            }

            if (body.unit) {
                this.unit = body.unit;
            }

            if (body.distance_type) {
                this.distance_type = body.distance_type;
            }

            this.ranges = body.ranges;
        }
    },

    GeohashGridAggregation : class extends Aggregation {
        static type = "geohash_grid";

        constructor(params) {
            super(params)
            this.field = params.field || false;
            this.precision = params.precision || 3;

            if (params.raw) {
                this.parse(params.raw);
            }
        }

        objectify() {
            var body = {
                field: this.field,
                precision: this.precision
            };
            return this._make_aggregation(es.GeohashGridAggregation.type, body);
        }

        parse(obj) {
            var body = this._parse_wrapper(obj, es.GeohashGridAggregation.type);
            this.field = body.field;
            this.precision = body.precision;
        }
    },

    StatsAggregation : class extends Aggregation {
        static type = "stats";

        constructor(params) {
            super(params);
            this.field = params.field || false;
            if (params.raw) {
                this.parse(params.raw);
            }
        }

        objectify() {
            var body = {field: this.field};
            return this._make_aggregation(es.StatsAggregation.type, body);
        }

        parse(obj) {
            var body = this._parse_wrapper(obj, es.StatsAggregation.type);
            this.field = body.field;
        };
    },

    SumAggregation : class extends Aggregation {
        static type = "sum";

        constructor(params) {
            super(params);
            this.field = params.field || false;

            if (params.raw) {
                this.parse(params.raw);
            }
        }

        objectify() {
            var body = {field: this.field};
            return this._make_aggregation(es.SumAggregation.type, body);
        }

        parse(obj) {
            var body = this._parse_wrapper(obj, es.SumAggregation.type);
            this.field = body.field;
        }
    },

    DateHistogramAggregation : class extends Aggregation {
        static type = "date_histogram";

        constructor(params) {
            super(params);
            this.field = params.field || false;
            this.interval = params.interval || "month";
            this.format = params.format || false;

            if (params.raw) {
                this.parse(params.raw);
            }
        }

        objectify() {
            var body = {field: this.field, interval: this.interval};
            if (this.format) {
                body["format"] = this.format;
            }
            return this._make_aggregation(es.DateHistogramAggregation.type, body);
        }

        parse(obj) {
            var body = this._parse_wrapper(obj, es.DateHistogramAggregation.type);
            this.field = body.field;
            if (body.interval) {
                this.interval = body.interval;
            }
            if (body.format) {
                this.format = body.format;
            }
        }
    },

    FiltersAggregation : class extends Aggregation {
        static type = "filters";

        constructor(params) {
            super(params);
            this.filters = params.filters || {};

            if (params.raw) {
                this.parse(params.raw);
            }
        }

        objectify() {
            var body = {filters: this.filters};
            return this._make_aggregation(es.FiltersAggregation.type, body);
        }

        parse(obj) {
            var body = this._parse_wrapper(obj, es.FiltersAggregation.type);
            this.filters = body.filters;
        }
    },

    ///////////////////////////////////////////////////
    // Filters

    BoolFilter : class extends Filter {
        static type = "bool";

        constructor(params) {
            params["field"] = "_bool"; // this filter does not have a field, so we set a placeholder
            super(params);

            // FIXME: for the moment this only supports must_not as it's all we need
            // at the time of implementation
            this.mustNot = es.getParam(params.mustNot, []);

            if (params.raw) {
                this.parse(params.raw);
            }
        }

        objectify() {
            let obj = {bool : {}};
            if (this.mustNot.length > 0) {
                let mustNots = [];
                for (var i = 0; i < this.mustNot.length; i++) {
                    var m = this.mustNot[i];
                    mustNots.push(m.objectify());
                }
                obj.bool["must_not"] = mustNots;
            }
            return obj;
        }

        parse(obj) {
            if (obj.bool.must_not) {
                for (var i = 0; i < obj.bool.must_not.length; i++) {
                    var type = Object.keys(obj.bool.must_not[i])[0];
                    var fil = es.filterFactory(type, {raw: obj.bool.must_not[i]});
                    if (fil) {
                        this.addMustNot(fil);
                    }
                }
            }
        }

        addMustNot(filter) {
            var existing = this.listMustNot(filter);
            if (existing.length === 0) {
                this.mustNot.push(filter);
            }
        }

        listMustNot(template) {
            return this.listFilters({boolType: "must_not", template: template});
        }

        listFilters(params) {
            var boolType = params.boolType || "must";
            var template = params.template || false;

            //var field = params.field || false;
            //var filterType = params.filterType || false;

            // first get the boolean filter field that we're going to look in
            var bool = [];
            if (boolType === "must") {
                bool = this.must;
            } else if (boolType === "should") {
                bool = this.should;
            } else if (boolType === "must_not") {
                bool = this.mustNot;
            }

            if (!template) {
                return bool;
            }
            var l = [];
            for (var i = 0; i < bool.length; i++) {
                var m = bool[i];
                if (m.matches(template)) {
                    l.push(m);
                }
            }
            return l;
        }
    },

    TermFilter : class extends Filter {
        static type = "term";

        constructor(params) {
            super(params);
            // this.filter handled by superclass
            this.value = params.value || false;

            if (params.raw) {
                this.parse(params.raw);
            }
        }

        matches(other) {
            // ask the parent object first
            let pm = this._baseMatch(other);
            if (!pm) {
                return false;
            }
            // value (if set) must match
            if (other.value && other.value !== this.value) {
                return false;
            }

            return true;
        }

        objectify() {
            var obj = {term : {}};
            obj.term[this.field] = this.value;
            return obj;
        }

        parse(obj) {
            if (obj.term) {
                obj = obj.term;
            }
            this.field = Object.keys(obj)[0];
            this.value = obj[this.field];
        }
    },

    ExistsFilter : class extends Filter {
        static type = "exists";

        constructor(params) {
            super(params);

            if (params.raw) {
                this.parse(params.raw);
            }
        }

        objectify() {
            return {exists : {field: this.field}};
        }

        parse(obj) {
            if (obj.exists) {
                obj = obj.exists;
            }
            this.field = obj.field;
        }
    },

    TermsFilter : class extends Filter {
        static type = "terms";

        constructor(params) {
            super(params);
            // this.field handled by superclass
            this.values = params.values || false;
            this.execution = params.execution || false;

            if (params.raw) {
                this.parse(params.raw);
            }
        }

        matches(other) {
            // ask the parent object first
            let pm = this._baseMatch(other);
            if (!pm) {
                return false;
            }

            // values (if set) must be the same list
            if (other.values) {
                if (other.values.length !== this.values.length) {
                    return false;
                }
                for (var i = 0; i < other.values.length; i++) {
                    if ($.inArray(other.values[i], this.values) === -1) {
                        return false;
                    }
                }
            }

            return true;
        }

        objectify() {
            var val = this.values || [];
            var obj = {terms : {}};
            obj.terms[this.field] = val;
            if (this.execution) {
                obj.terms["execution"] = this.execution;
            }
            return obj;
        };

        parse(obj) {
            if (obj.terms) {
                obj = obj.terms;
            }
            this.field = Object.keys(obj)[0];
            this.values = obj[this.field];
            if (obj.execution) {
                this.execution = obj.execution;
            }
        }

        add_term(term) {
            if (!this.values) {
                this.values = [];
            }
            if ($.inArray(term, this.values) === -1) {
                this.values.push(term);
            }
        }

        has_term(term) {
            if (!this.values) {
                return false;
            }
            return $.inArray(term, this.values) >= 0;
        }

        remove_term(term) {
            if (!this.values) {
                return;
            }
            var idx = $.inArray(term, this.values);
            if (idx >= 0) {
                this.values.splice(idx, 1);
            }
        }

        has_terms() {
            return (this.values !== false && this.values.length > 0)
        }

        term_count() {
            return this.values === false ? 0 : this.values.length;
        }

        clear_terms() {
            this.values = false;
        }
    },

    RangeFilter : class extends Filter {
        static type = "range";

        constructor(params) {
            super(params);

            // this.field handled by superclass
            this.lt = es.getParam(params.lt, false);
            this.lte = es.getParam(params.lte, false);
            this.gte = es.getParam(params.gte, false);
            this.format = es.getParam(params.format, false);

            // normalise the values to strings
            if (this.lt) {
                this.lt = this.lt.toString()
            }
            if (this.lte) {
                this.lte = this.lte.toString()
            }
            if (this.gte) {
                this.gte = this.gte.toString()
            }

            if (params.raw) {
                this.parse(params.raw);
            }
        }

        matches(other) {
            // ask the parent object first
            let pm = super.matches(other);
            if (!pm) {
                return false;
            }

            // ranges (if set) must match
            if (other.lt) {
                if (other.lt !== this.lt) {
                    return false;
                }
            }
            if (other.lte) {
                if (other.lte !== this.lte) {
                    return false;
                }
            }
            if (other.gte) {
                if (other.gte !== this.gte) {
                    return false;
                }
            }

            if (other.format) {
                if (other.format !== this.format) {
                    return false;
                }
            }

            return true;
        }

        objectify() {
            var obj = {range: {}};
            obj.range[this.field] = {};
            if (this.lte !== false) {
                obj.range[this.field]["lte"] = this.lte;
            }
            if (this.lt !== false && this.lte === false) {
                obj.range[this.field]["lt"] = this.lt;
            }
            if (this.gte !== false) {
                obj.range[this.field]["gte"] = this.gte;
            }
            if (this.format !== false) {
                obj.range[this.field]["format"] = this.format;
            }
            return obj;
        }

        parse(obj) {
            if (obj.range) {
                obj = obj.range;
            }
            this.field = Object.keys(obj)[0];
            if (obj[this.field].lte !== undefined && obj[this.field].lte !== false) {
                this.lte = obj[this.field].lte;
            }
            if (obj[this.field].lt !== undefined && obj[this.field].lt !== false) {
                this.lt = obj[this.field].lt;
            }
            if (obj[this.field].gte !== undefined && obj[this.field].gte !== false) {
                this.gte = obj[this.field].gte;
            }
            if (obj[this.field].format !== undefined && obj[this.field].format !== false) {
                this.format = obj[this.field].format;
            }
        }
    },

    GeoDistanceRangeFilter : class extends Filter {
        static type = "geo_distance_range";

        constructor(params) {
            super(params);

            // this.field is handled by superclass
            this.lt = params.lt || false;
            this.gte = params.gte || false;
            this.lat = params.lat || false;
            this.lon = params.lon || false;
            this.unit = params.unit || "m";

            if (params.raw) {
                this.parse(params.raw);
            }
        }

        objectify() {
            var obj = {geo_distance_range: {}};
            obj.geo_distance_range[this.field] = {lat: this.lat, lon: this.lon};
            if (this.lt) {
                obj.geo_distance_range["lt"] = this.lt + this.unit;
            }
            if (this.gte) {
                obj.geo_distance_range["gte"] = this.gte + this.unit;
            }
            return obj;
        }

        parse(obj) {
            function endsWith(str, suffix) {
                return str.indexOf(suffix, str.length - suffix.length) !== -1;
            }

            function splitUnits(str) {
                var unit = false;
                for (var i = 0; i < es.distanceUnits.length; i++) {
                    var cu = es.distanceUnits[i];
                    if (endsWith(str, cu)) {
                        str = str.substring(0, str.length - cu.length);
                        unit = str.substring(str.length - cu.length);
                    }
                }

                return [str, unit];
            }

            if (obj.geo_distance_range) {
                obj = obj.geo_distance_range;
            }
            this.field = Object.keys(obj)[0];
            this.lat = obj[this.field].lat;
            this.lon = obj[this.field].lon;

            var lt = obj[this.field].lt;
            var gte = obj[this.field].gte;

            if (lt) {
                lt = lt.trim();
                var parts = splitUnits(lt);
                this.lt = parts[0];
                this.unit = parts[1];
            }

            if (gte) {
                gte = gte.trim();
                var parts = splitUnits(gte);
                this.gte = parts[0];
                this.unit = parts[1];
            }
        }
    },

    GeoBoundingBoxFilter : class extends Filter {
        static type = "geo_bounding_box";

        constructor(params) {
            super(params);
            this.top_left = params.top_left || false;
            this.bottom_right = params.bottom_right || false;

            if (params.raw) {
                this.parse(params.raw);
            }
        }

        matches(other) {
            // ask the parent object first
            let pm = super.matches(other);
            if (!pm) {
                return false;
            }
            if (other.top_left && other.top_left !== this.top_left) {
                return false;
            }
            if (other.bottom_right && other.bottom_right !== this.bottom_right) {
                return false;
            }
            return true;
        }

        objectify() {
            var obj = {geo_bounding_box : {}};
            obj.geo_bounding_box[this.field] = {
                top_left: this.top_left,
                bottom_right: this.bottom_right
            };
            return obj;
        }

        parse(obj) {
            if (obj.geo_bounding_box) {
                obj = obj.geo_bounding_box;
            }
            this.field = Object.keys(obj)[0];
            this.top_left = obj[this.field].top_left;
            this.bottom_right = obj[this.field].bottom_right;
        }
    },

    ////////////////////////////////////////////////////
    // The result object

    Result : class {
        constructor(params) {
            this.data = params.raw;
        }

        buckets(agg_name) {
            return this.data.aggregations[agg_name].buckets;
        }

        aggregation(agg_name) {
            return this.data.aggregations[agg_name];
        }

        results() {
            var res = [];
            if (this.data.hits && this.data.hits.hits) {
                for (var i = 0; i < this.data.hits.hits.length; i++) {
                    var source = this.data.hits.hits[i];
                    if ("_source" in source) {
                        res.push(source._source);
                    } else if ("_fields" in source) {
                        res.push(source._fields);
                    } else {
                        res.push(source);
                    }
                }
            }
            return res;
        }

        total() {
            if (this.data.hits && this.data.hits.total && this.data.hits.total.value) {
                return parseInt(this.data.hits.total.value);
            }
            return false;
        }
    },

    ////////////////////////////////////////////////////
    // Primary functions for interacting with elasticsearch

    doQuery : function(params) {
        // extract the parameters of the request
        var success = params.success;
        var error = params.error;
        var complete = params.complete;
        var search_url = params.search_url;
        var queryobj = params.queryobj;
        var datatype = params.datatype;

        // serialise the query
        var querystring = JSON.stringify(queryobj);

        // prep the callbacks (they are connected)
        var error_callback = es.queryError(error);
        var success_callback = es.querySuccess(success, error_callback);

        let ajax = {
            url: search_url,
            headers: es.requestHeaders,
            dataType: datatype,
            success: success_callback,
            error: error_callback,
            complete: complete
        }
        if (datatype !== "jsonp") {
            ajax.jsonp = false;
        }

        // make the call to the elasticsearch web service
        if (es.requestMethod === "get") {
            ajax.type = "get";
            ajax.data = {source: querystring, source_content_type: "application/json"};
            $.ajax(ajax);
        } else if (es.requestMethod === "post") {
            ajax.type = "post"
            ajax.data = querystring;
            $.ajax(ajax);
        } else {
            throw "es.requestMethod must be either 'get' or 'post";
        }
    },

    querySuccess : function(callback, error_callback) {
        return function(data) {
            if (data.hasOwnProperty("error")) {
                error_callback(data);
                return;
            }

            var result = new es.Result({raw: data});
            callback(result);
        }
    },

    queryError : function(callback) {
        return function(data) {
            if (callback) {
                callback(data);
            } else {
                throw new Error(data);
            }
        }
    },

    /////////////////////////////////////////////////////

    getParam : function(value, def) {
        return value !== undefined ? value : def;
    }
};

export {es}