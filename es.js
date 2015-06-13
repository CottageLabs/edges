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
    // object factories

    aggregationFactory : function(type, params) {
        var constructors = {
            terms: es.newTermsAggregation,
            range: es.newRangeAggregation,
            geo_distance: es.newGeoDistanceAggregation,
            date_histogram: es.newDateHistogramAggregation,
            stats: es.StatsAggregation
        };

        if (constructors[type]) {
            return constructors[type](params);
        }

    },

    filterFactory : function(type, params) {
        var constructors = {
            query_string: es.newQueryString,
            term: es.newTermFilter,
            terms: es.newTermsFilter,
            range: es.newRangeFilter,
            geo_distance_range: es.newGeoDistanceRangeFilter
        };

        if (constructors[type]) {
            return constructors[type](params);
        }
    },

    ////////////////////////////////////////////////////
    // Query objects for standard query structure

    newQuery : function(params) {
        return new es.Query(params);
    },
    Query : function(params) {
        if (!params) {
            params = {};
        }

        // properties that can be set directly
        this.filtered = params.filtered || true;
        this.size = params.size || 10;
        this.from = params.from || 0;
        this.fields = params.fields || [];
        this.aggs = params.aggs || [];
        this.must = params.must || [];

        // defaults from properties that will be set through their setters (see the bottom
        // of the function)
        this.queryString = false;
        this.sort = [];

        // ones that we haven't used yet, so are awaiting implementation
        this.source = params.source || false;
        this.should = params.should || [];
        this.mustNot = params.mustNot || [];
        this.partialFields = params.partialFields || false;
        this.scriptFields = params.scriptFields || false;
        this.minimumShouldMatch = params.minimumShouldMatch || 1;

        // for old versions of ES, so are not necessarily going to be implemented
        this.facets = params.facets || [];

        this.setQueryString = function(params) {
            var qs = params;
            if (!(params instanceof es.QueryString)) {
                if ($.isPlainObject(params)) {
                    qs = es.newQueryString(params);
                } else {
                    qs = es.newQueryString({queryString: params});
                }
            }
            this.queryString = qs;
        };

        this.setSortBy = function(params) {
            // ensure we have a list of sort options
            var sorts = params;
            if (!$.isArray(params)) {
                sorts = [params]
            }
            // add each one
            for (var i = 0; i < sorts.length; i++) {
                this.addSortBy(sorts[i]);
            }
        };
        this.addSortBy = function(params) {
            // ensure we have an instance of es.Sort
            var sort = params;
            if (!(params instanceof es.Sort)) {
                sort = es.newSort(params);
            }
            // prevent default sort options being added
            for (var i = 0; i < this.sort.length; i++) {
                var so = this.sort[i];
                if (so.field === sort.field) {
                    return;
                }
            }
            // add the sort option
            this.sort.push(sort);
        };
        this.removeSortBy = function(params) {};

        this.setSource = function(include, exclude) {};

        this.addFacet = function() {};
        this.removeFacet = function() {};
        this.clearFacets = function() {};

        this.addAggregation = function(agg) {
            for (var i = 0; i < this.aggs.length; i++) {
                if (this.aggs[i].name === agg.name) {
                    return;
                }
            }
            this.aggs.push(agg);
        };
        this.removeAggregation = function() {};
        this.clearAggregations = function() {};

        this.addMust = function(filter) {
            this.must.push(filter);
        };
        this.removeMust = function() {};
        this.clearMust = function() {};

        this.addShould = function() {};
        this.removeShould = function() {};
        this.clearShould = function() {};

        this.addMustNot = function() {};
        this.removeMustNot = function() {};
        this.removeMustNot = function() {};

        this.hasFilters = function() {
            return this.must.length > 0 || this.should.length > 0 || this.mustNot.length > 0
        };

        this.objectify = function() {
            // queries will be separated in queries and bool filters, which may then be
            // combined later
            var q = {};
            var query_part = {};
            var bool = {};

            // query string
            if (this.queryString) {
                $.extend(query_part, this.queryString.objectify());
            }

            // add any MUST filters
            if (this.must.length > 0) {
                var musts = [];
                for (var i = 0; i < this.must.length; i++) {
                    var m = this.must[i];
                    musts.push(m.objectify());
                }
                bool["must"] = musts;
            }

            // add the bool to the query in the correct place (depending on filtering)
            if (this.filtered && this.hasFilters()) {
                if (Object.keys(query_part).length == 0) {
                    query_part["match_all"] = {};
                }
                q["query"] = {filtered : {filter : {bool : bool}, query : query_part}};
            } else {
                if (this.hasFilters()) {
                    query_part["bool"] = bool;
                }
                if (Object.keys(query_part).length == 0) {
                    query_part["match_all"] = {};
                }
                q["query"] = query_part;
            }

            // page size
            q["size"] = this.size;

            // page number (from)
            q["from"] = this.from;

            // sort option
            if (this.sort.length > 0) {
                q["sort"] = [];
                for (var i = 0; i < this.sort.length; i++) {
                    q.sort.push(this.sort[i].objectify())
                }
            }

            // fields
            if (this.fields.length > 0) {
                q["fields"] = this.fields;
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
        };

        this.parse = function(obj) {

            function parseBool(bool, target) {
                if (bool.must) {
                    for (var i = 0; i < bool.must.length; i++) {
                        var type = Object.keys(bool.must[i])[0];
                        var fil = es.filterFactory(type, {raw: bool.must[i]});
                        if (fil) {
                            target.addMust(fil);
                        }
                    }
                }
            }

            function parseQuery(q, target) {
                var keys = Object.keys(q);
                for (var i = 0; i < keys.length; i++) {
                    var type = keys[i];
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

            if (obj.fields) {
                this.fields = obj.fields;
            }

            if (obj.sort) {
                for (var i = 0; i < obj.sort.length; i++) {
                    var so = obj.sort[i];
                    this.addSortBy(es.newSort({raw: so}));
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
        };

        ///////////////////////////////////////////////////////////
        // final part of construction - set the dynamic properties
        // via their setters

        if (params.queryString) {
            this.setQueryString(params.queryString);
        }

        if (params.sortBy) {
            this.setSortBy(params.sortBy);
        }

        // finally, if we're given a raw query, parse it
        if (params.raw) {
            this.parse(params.raw)
        }
    },

    ///////////////////////////////////////////////
    // Query String

    newQueryString : function(params) {
        return new es.QueryString(params);
    },
    QueryString : function(params) {
        this.queryString = params.queryString || false;
        this.defaultField = params.defaultField || false;
        this.defaultOperator = params.defaultOperator || "OR";

        this.objectify = function() {
            var obj = {query_string : {query : this.queryString}};
            if (this.defaultOperator) {
                obj.query_string["default_operator"] = this.defaultOperator;
            }
            if (this.defaultField) {
                obj.query_string["default_field"] = this.defaultField;
            }
            return obj;
        };

        this.parse = function(obj) {
            if (obj.query_string) {
                obj = obj.query_string;
            }
            this.queryString = obj.query;
            if (obj.default_operator) {
                this.defaultOperator = obj.default_operator;
            }
            if (obj.default_field) {
                this.defaultField = obj.default_field;
            }
        };

        if (params.raw) {
            this.parse(params.raw);
        }
    },

    //////////////////////////////////////////////
    // Sort Option

    newSort : function(params) {
        return new es.Sort(params);
    },
    Sort : function(params) {
        this.field = params.field;
        this.order = params.order || "asc";

        this.objectify = function() {
            var obj = {};
            obj[this.field] = {order: this.order};
            return obj;
        };

        this.parse = function(obj) {
            this.field = Object.keys(obj)[0];
            if (obj[this.field].order) {
                this.order = obj[this.field].order;
            }
        };

        if (params.raw) {
            this.parse(params.raw);
        }
    },

    //////////////////////////////////////////////
    // Root Aggregation and aggregation implementations

    newAggregation : function(params) {
        return new es.Aggregation(params);
    },
    Aggregation : function(params) {
        this.name = params.name;
        this.aggs = params.aggs || [];

        this.addAggregation = function(agg) {
            for (var i = 0; i < this.aggs.length; i++) {
                if (this.aggs[i].name === agg.name) {
                    return;
                }
            }
            this.aggs.push(agg);
        };
        this.removeAggregation = function() {};
        this.clearAggregations = function() {};

        // for use by sub-classes, for their convenience in rendering
        // the overall structure of the aggregation to an object
        this._make_aggregation = function(type, body) {
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
        };

        this._parse_wrapper = function(obj, type) {
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
    },

    newTermsAggregation : function(params) {
        es.TermsAggregation.prototype = es.newAggregation(params);
        return new es.TermsAggregation(params);
    },
    TermsAggregation : function(params) {
        this.field = params.field || false;
        this.size = params.size || 10;

        this.orderBy = "_count";
        if (params.orderBy) {
            this.orderBy = params.orderBy;
            if (this.orderBy[0] !== "_") {
                this.orderBy = "_" + this.orderBy;
            }
        }

        this.orderDir = params.orderDir || "desc";

        this.objectify = function() {
            var body = {field: this.field, size: this.size, order: {}};
            body.order[this.orderBy] = this.orderDir;
            return this._make_aggregation("terms", body);
        };

        this.parse = function(obj) {
            var body = this._parse_wrapper(obj, "terms");
            this.field = body.field;
            if (body.size) {
                this.size = body.size;
            }
            if (body.order) {
                this.orderBy = Object.keys(body.order)[0];
                this.orderDir = body.order[this.orderBy];
            }
        };

        if (params.raw) {
            this.parse(params.raw);
        }
    },

    newRangeAggregation : function(params) {
        es.RangeAggregation.prototype = es.newAggregation(params);
        return new es.RangeAggregation(params);
    },
    RangeAggregation : function(params) {
        this.field = params.field || false;
        this.ranges = params.ranges || [];

        this.objectify = function() {
            var body = {field: this.field, ranges: this.ranges};
            return this._make_aggregation("range", body);
        };

        this.parse = function(obj) {
            var body = this._parse_wrapper(obj, "range");
            this.field = body.field;
            this.ranges = body.ranges;
        };

        if (params.raw) {
            this.parse(params.raw);
        }
    },

    newGeoDistanceAggregation : function(params) {
        es.GeoDistanceAggregation.prototype = es.newAggregation(params);
        return new es.GeoDistanceAggregation(params);
    },
    GeoDistanceAggregation : function(params) {
        this.field = params.field || false;
        this.lat = params.lat || false;
        this.lon = params.lon || false;
        this.unit = params.unit || "m";
        this.distance_type = params.distance_type || "sloppy_arc";
        this.ranges = params.ranges || [];

        this.objectify = function() {
            var body = {
                field: this.field,
                origin: {lat : this.lat, lon: this.lon},
                unit : this.unit,
                distance_type : this.distance_type,
                ranges: this.ranges
            };
            return this._make_aggregation("geo_distance", body);
        };

        this.parse = function(obj) {
            var body = this._parse_wrapper(obj, "range");
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
        };

        if (params.raw) {
            this.parse(params.raw);
        }
    },

    newStatsAggregation : function(params) {
        es.StatsAggregation.prototype = es.newAggregation(params);
        return new es.StatsAggregation(params);
    },
    StatsAggregation : function(params) {
        this.field = params.field || false;

        this.objectify = function() {
            var body = {field: this.field};
            return this._make_aggregation("stats", body);
        };

        this.parse = function(obj) {

        };

        if (params.raw) {
            this.parse(params.raw);
        }
    },

    newDateHistogramAggregation : function(params) {
        es.DateHistogramAggregation.prototype = es.newAggregation(params);
        return new es.DateHistogramAggregation(params);
    },
    DateHistogramAggregation : function(params) {
        this.field = params.field || false;
        this.interval = params.interval || "month";
        this.format = params.format || false;

        this.objectify = function() {
            var body = {field: this.field, interval: this.interval};
            if (this.format) {
                body["format"] = this.format;
            }
            return this._make_aggregation("date_histogram", body);
        };

        this.parse = function(obj) {
            var body = this._parse_wrapper(obj, "date_histogram");
            this.field = body.field;
            if (body.interval) {
                this.interval = body.interval;
            }
            if (body.format) {
                this.format = body.format;
            }
        };

        if (params.raw) {
            this.parse(params.raw);
        }
    },

    ///////////////////////////////////////////////////
    // Filters

    newTermFilter : function(params) {
        return new es.TermFilter(params);
    },
    TermFilter : function(params) {
        this.field = params.field || false;
        this.value = params.value || false;

        this.objectify = function() {
            var obj = {term : {}};
            obj.term[this.field] = this.value;
            return obj;
        };

        this.parse = function(obj) {
            if (obj.term) {
                obj = obj.term;
            }
            this.field = Object.keys(obj)[0];
            this.value = obj[this.field];
        };

        if (params.raw) {
            this.parse(params.raw);
        }
    },

    newTermsFilter : function(params) {
        return new es.TermsFilter(params);
    },
    TermsFilter : function(params) {
        this.field = params.field || false;
        this.values = params.values || [];
        this.execution = params.execution || false;

        this.objectify = function() {
            var obj = {terms : {}};
            obj.terms[this.field] = this.values;
            if (this.execution) {
                obj.terms["execution"] = this.execution;
            }
            return obj;
        };

        this.parse = function(obj) {
            if (obj.terms) {
                obj = obj.terms;
            }
            this.field = Object.keys(obj)[0];
            this.values = obj[this.field];
            if (obj.execution) {
                this.execution = obj.execution;
            }
        };

        if (params.raw) {
            this.parse(params.raw);
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
        };

        this.parse = function(obj) {
            if (obj.range) {
                obj = obj.range;
            }
            this.field = Object.keys(obj)[0];
            if (obj[this.field].lt) {
                this.lt = obj[this.field].lt;
            }
            if (obj[this.field].gte) {
                this.gte = obj[this.field].gte;
            }
        };

        if (params.raw) {
            this.parse(params.raw);
        }
    },

    newGeoDistanceRangeFilter : function(params) {
        return new es.GeoDistanceRangeFilter(params);
    },
    GeoDistanceRangeFilter : function(params) {
        this.field = params.field || false;
        this.lt = params.lt || false;
        this.gte = params.gte || false;
        this.lat = params.lat || false;
        this.lon = params.lon || false;
        this.unit = params.unit || "m";

        this.objectify = function() {
            var obj = {geo_distance_range: {}};
            obj.geo_distance_range[this.field] = {lat: this.lat, lon: this.lon};
            if (this.lt) {
                obj.geo_distance_range["lt"] = this.lt + this.unit;
            }
            if (this.gte) {
                obj.geo_distance_range["gte"] = this.gte + this.unit;
            }
            return obj;
        };

        this.parse = function(obj) {
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
        };

        if (params.raw) {
            this.parse(params.raw);
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

            var scs = es.specialCharsSubSet.slice(0);

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
    },

    /////////////////////////////////////////////////////


};
