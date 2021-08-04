$.extend(edges, {
    csv : {
        serialise : function(params) {
            var json = params.data;
            return Papa.unparse(json, {newline: "\n"});
        },

        newObjectByRow : function(params) {
            if (!params) { params = {} }
            return new edges.csv.ObjectByRow(params);
        },

        /** @class */
        ObjectByRow : function(params) {

            this.sheet = false;

            // list of filters that should be applied to the data to define the set of results
            // {field : "<field name>", value : "value to filter by", type : "<filter type>"}
            this.filters = [];

            // this is essentially the constructor
            this.parse = function(params) {
                var data = params.data.replace(/\r\n/g, "\n");
                this.sheet = Papa.parse(data, {
                    header: true,
                    newline: "\n",
                    skipEmptyLines: true
                });
            };

            /////////////////////////////////////////////////
            // methods for interacting with the contents of the sheet

            this.add_filter = function(params) {
                var filter = params.filter;
                this.filters.push(filter);
            };

            this.clear_filter = function(params) {
                var filter = params.filter;
                var remove = false;
                for (var i = 0; i < this.filters.length; i++) {
                    var filt = this.filters[i];

                    var field_match = filter.field === filt.field;
                    var type_match = filter.type === filt.type || filter.type === undefined;
                    var val_match = filter.value === undefined || filter.value.toString() === filt.value.toString();
                    if (field_match && type_match && val_match) {
                        remove = i;
                        break;
                    }
                }
                if (remove !== false) {
                    this.filters.splice(remove, 1)
                }
            };

            this.iterator = function(params) {
                if (!params) { params = {}}
                var filtered = edges.getParam(params.filtered, true);
                var count = 0;
                var that = this;
                return {
                    next : function() {
                        if (that.sheet.data.length <= count) {
                            return false;
                        }
                        for (var i = count; i < that.sheet.data.length; i++) {
                            var ret = that.sheet.data[i];
                            var match = false;
                            if (!filtered) {
                                match = true;
                            } else {
                                match = that._filterMatch({record: ret});
                            }
                            if (match) {
                                count = i + 1;
                                return ret;
                            }
                        }
                        return false;
                    }
                }
            };

            this.aggregation = function(params) {
                var agg = params.agg;
                var type = Object.keys(agg)[0];
                var field = agg[type];
                var filtered = edges.getParam(params.filtered, true);

                if (type === "terms") {
                    return this._termsAggregation({field : field, filtered: filtered});
                }
                return [];
            };

            this.applyAggregations = function(params) {
                var aggs = params.aggs;
                var filtered = edges.getParam(params.filtered, true);

                var result = {};
                for (var i = 0; i < aggs.length; i++) {
                    result[aggs[i].name] = {name: aggs[i].name};
                }

                var iter = this.iterator({filtered: filtered});
                var doc = iter.next();
                while (doc) {
                    for (var i = 0; i < aggs.length; i++) {
                        var context = result[aggs[i].name];
                        aggs[i].consume({doc: doc, context: context});
                    }
                    doc = iter.next();
                }

                function intoNested(agg, context) {
                    agg.finalise({context: context});
                    for (var i = 0; i < agg.nested.length; i++) {
                        var nest = agg.nested[i];
                        if ("buckets" in context) {
                            for (var j = 0; j < context["buckets"].length; j++) {
                                var bucket = context["buckets"][j];
                                if ("aggs" in bucket) {
                                    var subcontext = context["buckets"][j]["aggs"][nest.name];
                                    intoNested(nest, context);
                                }
                            }
                        }
                    }
                }

                for (var i = 0; i < aggs.length; i++) {
                    var context = result[aggs[i].name];
                    intoNested(aggs[i], context);
                }

                return result;
            };

            this._termsAggregation = function(params) {
                var field = params.field;
                var filtered = edges.getParam(params.filtered, true);

                var agg = [];
                var aggMap = {};

                var iter = this.iterator({filtered: filtered});
                var res = iter.next();
                while (res) {
                    if (res.hasOwnProperty(field)) {
                        var val = res[field];
                        if (val in aggMap) {
                            agg[aggMap[val]].count++;
                        } else {
                            var i = agg.length;
                            agg.push({term: val, count: 1});
                            aggMap[val] = i;
                        }
                    }
                    res = iter.next();
                }

                return agg;
            };

            this._filterMatch = function(params) {
                var record = params.record;

                for (var i = 0; i < this.filters.length; i++) {
                    var filter = this.filters[i];
                    if (filter.type === "exact") {
                        if (!this._exactFilterMatch({filter: filter, record: record})) {
                            return false;
                        }
                    } else if (filter.type === "case_insensitive") {
                        if (!this._caseInsensitiveFilterMatch({filter: filter, record: record})) {
                            return false;
                        }
                    } else {
                        // Note, this means that if the filter is malformed you won't get any results, which is better than
                        // giving you some so you don't notice it's broken
                        return false;
                    }
                }

                return true;
            };

            this._exactFilterMatch = function(params) {
                var filter = params.filter;
                var record = params.record;

                var field = filter.field;
                var val = filter.value;

                return record[field] == val;
            };

            this._caseInsensitiveFilterMatch = function(params) {
                var filter = params.filter;
                var record = params.record;

                var field = filter.field;
                var val = filter.value;

                return record[field].toLowerCase() === val.toLowerCase();
            };

            ////////////////////////////////////////
            // call the constructor

            this.parse(params);
        },

        newAggregation : function(params) {
            return edges.instantiate(edges.csv.Aggregation, params);
        },
        Aggregation : function(params) {
            this.name = params.name;
            this.nested = edges.getParam(params.nested, []);

            this.consume = function(params) {
                var current = this.aggregate(params);
                if (current !== false) {
                    if (this.nested.length > 0) {
                        if (!("aggs" in current)) {
                            current["aggs"] = {};
                            for (var i = 0; i < this.nested.length; i++) {
                                current.aggs[this.nested[i].name] = {name: this.nested[i].name};
                            }
                        }
                        for (var i = 0; i < this.nested.length; i++) {
                            var subcontext = current.aggs[this.nested[i].name];
                            this.nested[i].consume({doc: params.doc, context: subcontext});
                        }
                    }
                }
            };

            this.aggregate = function(params) {};

            this.finalise = function(params) {};
        },

        newTermsAggregation : function(params) {
            return edges.instantiate(edges.csv.TermsAggregation, params, edges.csv.newAggregation)
        },
        TermsAggregation : function(params) {
            this.field = params.field;
            this.order = edges.getParam(params.order, false);
            this.orderDir = edges.getParam(params.orderDir, "asc");

            this.aggregate = function(params) {
                var doc = params.doc;
                var context = params.context;

                if (!("posMap" in context)) {
                    context["posMap"] = {};
                }
                if (!("buckets"  in context)) {
                    context["buckets"] = [];
                }

                if (doc.hasOwnProperty(this.field)) {
                    var val = doc[this.field];
                    if (val in context.posMap) {
                        context.buckets[context.posMap[val]].count++;
                    } else {
                        var i = context.buckets.length;
                        context.buckets.push({term: val, count: 1});
                        context.posMap[val] = i;
                    }

                    return context.buckets[context.posMap[val]];
                }
                return false;
            };

            this.finalise = function(params) {
                var context = params.context;
                if ("posMap" in context) {
                    delete context["posMap"];
                }
                if ("buckets" in context) {
                    context.buckets.sort(this._getSortFunction());
                } else {
                    context["buckets"] = [];
                }
            };

            this._getSortFunction = function(params) {
                if (this.order === "term") {
                    return function(a, b) {
                        if (a === b) { return 0 }
                        if (a.term < b.term) {  // a.term is earlier in the alphabet than b.term
                            return this.orderDir === "asc" ? 1 : -1;    // if ascending (a - z) then return 1 to promote a, otherwise -1 to demote a
                        } else {    // a.term is later in the alphabet than b.term
                            return this.orderDir === "asc" ? -1 : 1;    // if ascending (a - z) then return -1 to demote a, otherwise 1 to promote a
                        }
                    }
                }
            };
        },

        newSumAggregation : function(params) {
            return edges.instantiate(edges.csv.SumAggregation, params, edges.csv.newAggregation)
        },
        SumAggregation : function(params) {
            this.field = params.field;
            
            this.numParse = edges.numParse();

            this.aggregate = function(params) {
                var doc = params.doc;
                var context = params.context;

                if (!("sum"  in context)) {
                    context["sum"] = 0.0;
                }

                if (doc.hasOwnProperty(this.field)) {
                    var val = doc[this.field];
                    context["sum"] += this.numParse(val);
                }

                return false;
            };

            this.finalise = function(params) {
                var context = params.context;
                if (!("sum" in context)) {
                    context["sum"] = 0;
                }
            };
        }
    }
});
