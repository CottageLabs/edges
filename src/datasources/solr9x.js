if (!window.hasOwnProperty("es")) { es = {}}

// request method to be used throughout.  Set this before using the module if you want it different
es.requestMethod = "get";

// add request headers (such as Auth) if you need to
es.requestHeaders = false;

// Base classes
es.Aggregation = class {
    static type = "aggregation";

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

    removeAggregation() {}
    clearAggregations() {}

    // for use by sub-classes, for their convenience in rendering
    // the overall structure of the aggregation to an object
    _make_aggregation(type, body) {
        var obj = {};
        obj[this.name] = {};
        obj[this.name][type] = body;

        if (this.aggs.length > 0) {
            obj[this.name]["aggs"] = {};
            for (var i = 0; i < this.aggs.length; i++) {
                $.extend(obj[this.name]["aggs"], this.aggs[i].objectify());
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
};


es.Filter = class {
    static type = "filter";

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

    objectify() {}
    parse() {}
};

es.Query = class {
    constructor(params) {
        if (!params) { params = {}}
        // properties that can be set directly
        this.filtered = false;  // this is no longer present in es5.x+
        this.trackTotalHits = true;   // FIXME: hard code this for the moment, we can introduce the ability to vary it later

        this.size = this.getParam(params.size, false);
        this.from = this.getParam(params.from, false);
        this.fields = this.getParam(params.fields, []);
        this.aggs = this.getParam(params.aggs, []);
        this.must = this.getParam(params.must, []);
        this.mustNot = this.getParam(params.mustNot, []);
        this.should = this.getParam(params.should, []);
        this.minimumShouldMatch = this.getParam(params.minimumShouldMatch, false);

        // defaults from properties that will be set through their setters
        this.queryString = false;
        this.sort = [];

        // ones that we haven't used yet, so are awaiting implementation
        // NOTE: once we implement these, they also need to be considered in merge()
        this.source = this.getParam(params.source, false);
        this.partialFields = this.getParam(params.partialField, false);
        this.scriptFields = this.getParam(params.scriptFields, false);
        this.partialFields = this.getParam(params.partialFields, false);
        this.scriptFields = this.getParam(params.scriptFields, false);

        // for old versions of ES, so are not necessarily going to be implemented
        this.facets = this.getParam(params.facets, []);

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

    getParam(param, defaultValue) {
        return param !== undefined ? param : defaultValue;
    }

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
        if (this.fields.indexOf(field) === -1) {
            this.fields.push(field);
        }
    }

    setQueryString(params) {
        var qs = params;
        if (!(params instanceof es.QueryString)) {
            if (typeof params === 'object') {
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
        if (!Array.isArray(params)) {
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

    setMinimumShouldMatch(val) {
        this.minimumShouldMatch = val;
    }

    getMinimumShouldMatch() {
        return this.minimumShouldMatch;
    }

    listFilters(params) {
        var boolType = params.boolType;
        var template = params.template;
        var filters = [];
        var source;
        if (boolType === "must") {
            source = this.must;
        } else if (boolType === "must_not") {
            source = this.mustNot;
        } else if (boolType === "should") {
            source = this.should;
        }
        for (var i = 0; i < source.length; i++) {
            var f = source[i];
            if (f.matches(template)) {
                filters.push(f);
            }
        }
        return filters;
    }

    getFilters() {
        var filters = [];
        for (var i = 0; i < this.must.length; i++) {
            filters.push(this.must[i]);
        }
        for (var i = 0; i < this.mustNot.length; i++) {
            filters.push(this.mustNot[i]);
        }
        for (var i = 0; i < this.should.length; i++) {
            filters.push(this.should[i]);
        }
        return filters;
    }

    hasFilters() {
        if (this.must.length > 0 || this.mustNot.length > 0 || this.should.length > 0) {
            return true;
        }
        return false;
    }

    parse(raw) {
        var parsed = JSON.parse(raw);
        // re-initialise
        this.must = [];
        this.mustNot = [];
        this.should = [];
        this.minimumShouldMatch = false;
        // and then apply
        this.apply(parsed);
    }

    apply(parsed) {
        if (parsed.size !== undefined) {
            this.size = parsed.size;
        }
        if (parsed.from !== undefined) {
            this.from = parsed.from;
        }
        if (parsed.track_total_hits !== undefined) {
            this.trackTotalHits = parsed.track_total_hits;
        }
        if (parsed._source) {
            this.setSourceFilters(parsed._source);
        }
        if (parsed.fields) {
            this.fields = parsed.fields;
        }
        if (parsed.sort) {
            this.setSortBy(parsed.sort);
        }
        if (parsed.aggs) {
            for (var a in parsed.aggs) {
                this.addAggregation(new es.Aggregation({name: a, raw: parsed.aggs[a]}));
            }
        }
        if (parsed.query) {
            if (parsed.query.query_string) {
                this.setQueryString(parsed.query.query_string);
            }
            if (parsed.query.bool) {
                if (parsed.query.bool.must) {
                    for (var i = 0; i < parsed.query.bool.must.length; i++) {
                        this.addMust(new es.Filter({raw: parsed.query.bool.must[i]}));
                    }
                }
                if (parsed.query.bool.must_not) {
                    for (var i = 0; i < parsed.query.bool.must_not.length; i++) {
                        this.addMustNot(new es.Filter({raw: parsed.query.bool.must_not[i]}));
                    }
                }
                if (parsed.query.bool.should) {
                    for (var i = 0; i < parsed.query.bool.should.length; i++) {
                        this.addShould(new es.Filter({raw: parsed.query.bool.should[i]}));
                    }
                }
                if (parsed.query.bool.minimum_should_match) {
                    this.setMinimumShouldMatch(parsed.query.bool.minimum_should_match);
                }
            }
        }
    }

    export() {
        var exported = {
            // see https://www.elastic.co/guide/en/elasticsearch/reference/current/paginate-search-results.html
            size: this.size || 10,
            from: this.from || 0,
            track_total_hits: this.trackTotalHits,
            query: {},
            aggs: {},
            _source: {},
            sort: []
        };
        if (this.getSourceIncludes().length > 0 || this.getSourceExcludes().length > 0) {
            exported._source = {
                includes: this.getSourceIncludes(),
                excludes: this.getSourceExcludes()
            };
        }
        if (this.fields.length > 0) {
            exported.fields = this.fields;
        }
        if (this.sort.length > 0) {
            for (var i = 0; i < this.sort.length; i++) {
                exported.sort.push(this.sort[i].export());
            }
        } else {
            delete exported.sort;
        }
        var filters = this.getFilters();
        if (filters.length > 0) {
            exported.query.bool = {};
            if (this.must.length > 0) {
                exported.query.bool.must = [];
                for (var i = 0; i < this.must.length; i++) {
                    exported.query.bool.must.push(this.must[i].export());
                }
            }
            if (this.mustNot.length > 0) {
                exported.query.bool.must_not = [];
                for (var i = 0; i < this.mustNot.length; i++) {
                    exported.query.bool.must_not.push(this.mustNot[i].export());
                }
            }
            if (this.should.length > 0) {
                exported.query.bool.should = [];
                for (var i = 0; i < this.should.length; i++) {
                    exported.query.bool.should.push(this.should[i].export());
                }
            }
            if (this.minimumShouldMatch) {
                exported.query.bool.minimum_should_match = this.minimumShouldMatch;
            }
        } else if (this.queryString) {
            exported.query = {
                query_string: this.queryString.export()
            };
        } else {
            exported.query = {
                match_all: {}
            };
        }
        for (var i = 0; i < this.aggs.length; i++) {
            var agg = this.aggs[i];
            var inner = {};
            inner[agg.type] = {};
            if (agg.field) {
                inner[agg.type].field = agg.field;
            }
            if (agg.script) {
                inner[agg.type].script = agg.script;
            }
            if (agg.size) {
                inner[agg.type].size = agg.size;
            }
            if (agg.interval) {
                inner[agg.type].interval = agg.interval;
            }
            exported.aggs[agg.name] = inner;
        }
        // if we haven't added any aggs, remove the aggs key
        if (Object.keys(exported.aggs).length === 0) {
            delete exported.aggs;
        }
        // remove the _source key if it wasn't populated
        if (Object.keys(exported._source).length === 0) {
            delete exported._source;
        }
        return JSON.stringify(exported, null, 4);
    }

    merge(q) {
        // size / limit
        if (q.size) {
            this.size = q.size;
        }
        // from / offset
        if (q.from) {
            this.from = q.from;
        }
        // fields
        for (var i = 0; i < q.fields.length; i++) {
            this.addField(q.fields[i]);
        }
        // aggregations
        for (var i = 0; i < q.aggs.length; i++) {
            this.addAggregation(q.aggs[i]);
        }
        // musts
        for (var i = 0; i < q.must.length; i++) {
            this.addMust(q.must[i]);
        }
        // must nots
        for (var i = 0; i < q.mustNot.length; i++) {
            this.addMustNot(q.mustNot[i]);
        }
        // shoulds
        for (var i = 0; i < q.should.length; i++) {
            this.addShould(q.should[i]);
        }
        if (q.minimumShouldMatch) {
            this.setMinimumShouldMatch(q.minimumShouldMatch);
        }
        // sort
        for (var i = 0; i < q.sort.length; i++) {
            this.addSortBy(q.sort[i]);
        }
        // query string
        if (q.queryString) {
            this.setQueryString(q.queryString);
        }
    }
};

es.QueryString = class {
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
        var obj = {q: qs};
        if (this.defaultOperator) {
            obj["q.op"] = this.defaultOperator;
        }
        if (this.defaultField) {
            obj["df"] = this.defaultField;
        }
        return obj;
    }

    parse(obj) {
        if (obj.q) {
            this.queryString = this._unescape(obj.q);
        }
        if (obj["q.op"]) {
            this.defaultOperator = obj["q.op"];
        }
        if (obj.df) {
            this.defaultField = obj.df;
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
}



// Factories
es.aggregationFactory = function(type, params) {
    for (const [key, value] of Object.entries(es)) {
        if (es._classExtends(es[key], es.Aggregation)) {
            if (es[key].type === type) {
                // Convert Elasticsearch specific parameters to es if needed
                if (type === "terms") {
                    params.field = params.field || false;
                    params.size = params.size || 10; // Use 'rows' for Solr, mapped from 'size'
                    params.orderBy = params.orderBy || "_count";
                    if (params.orderBy[0] !== "_") {
                        params.orderBy = "_" + params.orderBy;
                    }
                    params.orderDir = params.orderDir || "desc";
                }
                return new es[key](params);
            }
        }
    }
    throw new Error(`Unknown aggregation type: ${type}`);
};

es.filterFactory = function(type, params) {
    // query string is a special case
    if (type === "query_string") {
        return new es.QueryString(params);
    }

    // otherwise auto-detect
    for (const [key, value] of Object.entries(es)) {
        if (es._classExtends(es[key], es.Filter)) {
            if (es[key].type === type) {
                // Convert Elasticsearch specific parameters to Solr if needed
                if (type === "terms") {
                    params.field = params.field || false;
                    params.values = params.values || [];
                    params.execution = params.execution || false;
                }
                return new es[key](params);
            }
        }
    }
    throw new Error(`Unknown filter type: ${type}`);
};

// Filter extended classes starts here
es.TermFilter = class extends es.Filter {
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
        // Solr-specific object structure
        var obj = {};
        obj[this.field] = this.value;
        return obj;
    }

    parse(obj) {
        // Solr-specific parsing
        this.field = Object.keys(obj)[0];
        this.value = obj[this.field];
    }
}

es.TermsFilter = class extends es.Filter {
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
        var filterQuery = val.map(value => `${this.field}:${value}`).join(' OR ');
        return { fq: filterQuery };
    }

    parse(obj) {
        if (obj.fq) {
            let terms = obj.fq.split(' OR ');
            let field = terms[0].split(':')[0];
            let values = terms.map(term => term.split(':')[1]);

            this.field = field;
            this.values = values;
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
        return (this.values !== false && this.values.length > 0);
    }

    term_count() {
        return this.values === false ? 0 : this.values.length;
    }

    clear_terms() {
        this.values = false;
    }
};


//  Aggregation extended classes starts here
es.TermsAggregation = class extends es.Aggregation {
    static type = "terms";

    constructor(params) {
        super(params);
        this.field = params.field || false;
        this.size = params.size || 10; // 'size' in Elasticsearch, will convert to 'rows' for Solr

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

    // provide a method to set and normalize the ordering in future
    setOrdering(orderBy, orderDir) {
        this.orderBy = orderBy;
        if (this.orderBy[0] !== "_") {
            this.orderBy = "_" + this.orderBy;
        }
        this.orderDir = orderDir;
    }

    objectify() {
        // Solr facets configuration
        const body = {
            field: this.field,
            rows: this.size, // Convert 'size' to 'rows' for Solr
            order: {}
        };

        // Translate Elasticsearch orderBy to Solr sort
        let solrSort = "";
        if (this.orderBy === "_count") {
            solrSort = "count";
        } else if (this.orderBy === "_term") {
            solrSort = "index";
        }
        body.order[solrSort] = this.orderDir;

        return this._make_aggregation(es.TermsAggregation.type, body);
    }

    parse(obj) {
        const body = this._parse_wrapper(obj, es.TermsAggregation.type);
        this.field = body.field;
        if (body.rows) {
            this.size = body.rows; // Convert 'rows' to 'size'
        }
        if (body.order) {
            const solrSort = Object.keys(body.order)[0];
            this.orderDir = body.order[solrSort];

            // Translate Solr sort back to Elasticsearch orderBy
            if (solrSort === "count") {
                this.orderBy = "_count";
            } else if (solrSort === "index") {
                this.orderBy = "_term";
            }
        }
    }
};



es.doQuery = (params) => {
	const { success, error, complete, search_url, query, datatype } = params;
	
	const solrArgs = this._es2solr({ query : query });

	const searchUrl = search_url;
	// Generate the Solr query URL
	const fullUrl = this._args2URL({ baseUrl: searchUrl, args: solrArgs });

	var error_callback = es.queryError(error);
	var success_callback = es.querySuccess(success, error_callback);

	// Execution of solr query
	$.get({
		url: fullUrl,
		datatype: datatype ? datatype : "jsonp",
		success: success_callback,
		error: error_callback,
		jsonp: 'json.wrf'
	});
	
};

es.querySuccess = function (callback, error_callback) {
	return function(data) {
		if (data.hasOwnProperty("error")) {
			error_callback(data);
			return;
		}

		var result = new es.Result({raw: data});
		callback(result);
	}
};

es.queryError = function (callback) {
	return function(data) {
		if (callback) {
			callback(data);
		} else {
			throw new Error(data);
		}
	}
};

es.Result = class {
	constructor(params) {
        this.data = JSON.parse(params.raw);
    }

    buckets(facet_name) {
        if (this.data.facet_counts) {
            if (this.data.facet_counts.facet_fields && this.data.facet_counts.facet_fields[facet_name]) {
                return this._convertFacetToBuckets(this.data.facet_counts.facet_fields[facet_name]);
            } else if (this.data.facet_counts.facet_queries && this.data.facet_counts.facet_queries[facet_name]) {
                return this._convertFacetToBuckets(this.data.facet_counts.facet_queries[facet_name]);
            }
        }
        return [];
    }

    _convertFacetToBuckets(facet) {
        let buckets = [];
        for (let i = 0; i < facet.length; i += 2) {
            buckets.push({
                key: facet[i],
                doc_count: facet[i + 1]
            });
        }
        return buckets;
    }

    aggregation(facet_name) {
        return {
            buckets: this.buckets(facet_name)
        };
    }

    results() {
        var res = [];
        if (this.data.response && this.data.response.docs) {
            for (var i = 0; i < this.data.response.docs.length; i++) {
                res.push(this.data.response.docs[i]);
            }
        }
        return res;
    }

    total() {
        if (this.data.response && this.data.response.numFound !== undefined) {
            return parseInt(this.data.response.numFound);
        }
        return false;
    }
};


// Helper functions
// Method to convert es query to Solr query
function _es2solr({ query }) {
	const solrQuery = {};
	let solrFacets = []

	// Handle the query part
	if (query.query) {
		const queryPart = query.query;
		if (queryPart.match) {
			const field = Object.keys(queryPart.match)[0];
			const value = queryPart.match[field];
			solrQuery.q = `${field}:${value}`;
		} else if (queryPart.range) {
			const field = Object.keys(queryPart.range)[0];
			const range = queryPart.range[field];
			const rangeQuery = `${field}:[${range.gte || '*'} TO ${range.lte || '*'}]`;
			solrQuery.fq = rangeQuery;
		} else if (queryPart.match_all) {
			solrQuery.q = `*:*`;
		}
	} else {
		solrQuery.q = `*:*`;
	}

	// Handle pagination
	if (query.from !== undefined) {
		if (typeof query.from == "boolean" && !query.from) {
			solrQuery.start = 0
		} else {
			solrQuery.start = query.from;
		}
	}
	if (query.size !== undefined) {
		if (typeof query.size == "boolean" && !query.size) {
			solrQuery.rows = 10
		} else {
			solrQuery.rows = query.size;
		}

	}

	// Handle sorting
	if (query && query.sort &&  query.sort.length > 0) {
		solrQuery.sort = query.sort.map(sortOption => {
			const sortField = sortOption.field;
			const sortOrder = sortOption.order === "desc" ? "desc" : "asc";
			return `${sortField} ${sortOrder}`;
		}).join(', ');
	}

	if (query && query.aggs && query.aggs.length > 0) {
		let facetsFields = query.aggs.map(agg => this._convertAggFieldToFacetField(agg));
        query.aggs.forEach(agg => {
            _convertAggLimitToFacetLimit(agg, solrQuery);
            _convertAggSortToFacetSort(agg, solrQuery);
        });
        solrQuery.facet = true
        solrQuery["facet.field"] = facetsFields.join(",")
	}

	solrQuery.wt = "json"

	return solrQuery;
}

function  _args2URL({ baseUrl, args }) {
	const qParts = Object.keys(args).flatMap(k => {
		const v = args[k];
		if (Array.isArray(v)) {
			return v.map(item => `${encodeURIComponent(k)}=${encodeURIComponent(item)}`);
		}
		return `${encodeURIComponent(k)}=${encodeURIComponent(v)}`;
	});

	const qs = qParts.join("&");
	return `${baseUrl}?${qs}`;
}

function _convertAggFieldToFacetField(agg) {
	const field = agg.field;
	const name = agg.name;

	return `{!key=${name}}${field}`;
}   

function _convertAggLimitToFacetLimit(agg , solrQuery) {
    const size = agg.size || 10; 	// default size if not specified
    const field = agg.field;

    solrQuery[`f.${field}.facet.limit`] = size
}

function _convertAggSortToFacetSort(agg , solrQuery) {
    const order = agg.orderBy === "_count" ? "count" : "index"; // mapping orderBy to Solr
	const direction = agg.orderDir === "desc" ? "desc" : "asc"; // default direction if not specified
    const field = agg.field;

    solrQuery[`f.${field}.facet.sort`] = `${order}|${direction}`
}