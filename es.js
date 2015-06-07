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

    ////////////////////////////////////////////////////

    ////////////////////////////////////////////////////
    // Query objects for standard query structure

    newQuery : function() {
        var Query = function() {
            this.filtered = true;
            this.queryString = undefined;
            this.pageSize = undefined;
            this.from = undefined;
            this.sort = undefined;
            this.fields = undefined;
            this.source = undefined;
            this.facets = undefined;
            this.aggs = [];
            this.must = [];
            this.should = [];
            this.mustNot = [];
            this.minimumShouldMatch = 1;
        };
        Query.prototype = es.QueryPrototype;
        return new Query();
    },
    QueryPrototype : {
        sortBy : function() {},
        addSortBy : function() {},
        removeSortBy : function() {},

        setSource : function(include, exclude) {},

        addFacet : function() {},
        removeFacet : function() {},
        clearFacets : function() {},

        addAggregation : function(agg) {
            // FIXME: this may want to check for duplication
            this.aggs.push(agg);
        },
        removeAggregation : function() {},
        clearAggregations : function() {},

        addMust : function(filter) {
            this.must.push(filter);
        },
        removeMust : function() {},
        clearMust : function() {},

        addShould : function() {},
        removeShould : function() {},
        clearShould : function() {},

        addMustNot : function() {},
        removeMustNot : function() {},
        removeMustNot : function() {},

        hasFilters : function() {
            return this.must.length > 0 || this.should.length > 0 || this.mustNot.length > 0
        },

        objectify : function() {
            // start with a base query
            var q = {query : {match_all : {}}};
            if (this.filtered && this.hasFilters()) {
                q = {query : {filtered : {filter : {bool : {}}, query : {match_all : {}}}}}
            }

            // this is where the filters will live
            var bool = {};

            // add any filters
            if (this.must.length > 0) {
                var musts = [];
                for (var i = 0; i < this.must.length; i++) {
                    var m = this.must[i];
                    musts.push(m.objectify());
                }
                bool["must"] = musts;
            }

            if (this.filtered && this.hasFilters()) {
                q.query.filtered.filter.bool = bool;
            } else if (this.hasFilters()) {
                q.query["bool"] = bool;
            }

            // add any aggregations
            if (this.aggs.length > 0) {
                q["aggs"] = {};
                for (var i = 0; i < this.aggs.length; i++) {
                    var agg = this.aggs[i];
                    $.extend(q.aggs, agg.objectify())
                }
            }

            return q;
        }
    },

    newSort : function() {
        var Sort = function() {
            this.field = undefined;
            this.direction = undefined;
        };
        Sort.prototype = es.SortPrototype;
        return new Sort();
    },
    SortPrototype : {},

    newAggregation : function(params) {
        var Aggregation = function(args) {
            this.name = args.name;
            this.type = args.type;
            this.body = args.body;      // FIXME: this assumes ES knowledge outside the module
            this.aggregations = args.aggregations || false;
            this.size = args.size || 10;
        };
        Aggregation.prototype = es.AggregationPrototype;
        return new Aggregation(params);
    },
    AggregationPrototype : {
        addAggregation : function() {},
        removeAggregation : function() {},
        clearAggregations : function() {},

        objectify : function() {
            var obj = {};
            obj[this.name] = {};
            obj[this.name][this.type] = this.body;

            if (this.aggregations) {
                obj[this.name]["aggs"] = {};
                for (var i = 0; i < this.aggregations.length; i++) {
                    $.extend(obj[this.name]["aggs"], this.aggregations[i].objectify())
                }
            }

            return obj;
        }
    },

    newTermFilter : function(params) {
        var TermFilter = function(args) {
            this.field = args.field;
            this.value = args.value;
        };
        TermFilter.prototype = es.TermFilterPrototype;
        return new TermFilter(params);
    },
    TermFilterPrototype : {
        objectify : function() {
            var obj = {term : {}};
            obj.term[this.field] = this.value;
            return obj;
        }
    },

    newRangeFilter : function(params) {
        return new es.RangeFilter(params);
    },
    RangeFilter : function(params) {
        this.field = params.field;
        this.lt = params.lt;
        this.gte = params.gte;

        this.objectify = function() {
            var obj = {range: {}};
            obj.range[this.field] = {};
            if (this.lt) {
                obj.range[this.field]["lt"] = this.lt;
            }
            if (this.gte) {
                obj.range[this.field]["gte"] = this.gte;
            }
            return obj;
        }
    },

    ////////////////////////////////////////////////////
    // Primary functions for interacting with elasticsearch

    serialiseQueryObject : function(qs) {
        return JSON.stringify(qs, es.jsonStringEscape);
    },

    doQuery : function(params) {
        // extract the parameters of the request
        var success_callback = params.success;
        var complete_callback = params.complete;
        var search_url = params.search_url;
        var queryobj = params.queryobj;
        var datatype = params.datatype;

        // serialise the query
        var querystring = es.serialiseQueryObject(queryobj);

        // make the call to the elasticsearch web service
        $.ajax({
            type: "get",
            url: search_url,
            data: {source: querystring},
            dataType: datatype,
            success: es.querySuccess(success_callback),     // FIXME: this is probably not what we want to do here now
            complete: complete_callback
        });
    },

    //////////////////////////////////////////////////////
    // Supporting functions for interacting with elasticsearch

    querySuccess : function(callback) {
        return function(data) {
            callback(data)
        }
    },

    jsonStringEscape : function(key, value) {

        function escapeRegExp(string) {
            return string.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
        }

        function replaceAll(string, find, replace) {
          return string.replace(new RegExp(escapeRegExp(find), 'g'), replace);
        }

        function paired(string, pair) {
            var matches = (string.match(new RegExp(escapeRegExp(pair), "g"))) || [];
            return matches.length % 2 === 0;
        }

        // if we are looking at the query string, make sure that it is escaped
        // (note that this precludes the use of queries like "name:bob", as the ":" would
        // get escaped)
        if (key === "query" && typeof(value) === 'string') {

            var scs = es.SpecialCharsSubSet.slice(0);

            // first check for pairs
            for (var i = 0; i < es.characterPairs.length; i++) {
                var char = es.characterPairs[i];
                if (!paired(value, char)) {
                    scs.push(char);
                }
            }

            for (var i = 0; i < scs.length; i++) {
                var char = scs[i];
                value = replaceAll(value, char, "\\" + char);
            }

        }

        return value;
    }

    /////////////////////////////////////////////////////
};
