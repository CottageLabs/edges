$.extend(edges, {
    d3: {

        featureSetBoundary : function(params) {
            var features = params.features;
            var path = params.path;

            var boundExtent = [[null,null],[null,null]];
            for (var i = 0; i < features.length; i++) {
                var thisBounds = path.bounds(features[i]);
                if (boundExtent[0][0] === null) {boundExtent[0][0] = thisBounds[0][0]}
                if (boundExtent[0][1] === null) {boundExtent[0][1] = thisBounds[0][1]}
                if (boundExtent[1][0] === null) {boundExtent[1][0] = thisBounds[1][0]}
                if (boundExtent[1][1] === null) {boundExtent[1][1] = thisBounds[1][1]}
                boundExtent[0][0] = Math.min(thisBounds[0][0],boundExtent[0][0]);
                boundExtent[0][1] = Math.min(thisBounds[0][1],boundExtent[0][1]);
                boundExtent[1][0] = Math.max(thisBounds[1][0],boundExtent[1][0]);
                boundExtent[1][1] = Math.max(thisBounds[1][1],boundExtent[1][1]);
            }
            return boundExtent;
        },

        calculateMapScale : function(params) {
            var features = params.features;
            var path = params.path;
            var border = params.border;
            var scaleFit = params.scaleFit;
            var width = params.width;
            var height = params.height;

            var b = edges.d3.featureSetBoundary({
                features: features,
                path: path
            });

            var factor = 1.0 - border;

            var s = null;
            if (scaleFit === "best") {
                s = factor / Math.max(
                    (b[1][0] - b[0][0]) / width,
                    (b[1][1] - b[0][1]) / height
                );
            } else if (scaleFit === "horizontal") {
                s = factor / ((b[1][0] - b[0][0]) / width);
            } else if (scaleFit === "vertical") {
                s = factor / ((b[1][1] - b[0][1]) / height);
            }

            return s;
        },

        newGroupedUSStates : function(params) {
            if (!params) { params = {} }
            edges.d3.GroupedUSStates.prototype = edges.newRenderer(params);
            return new edges.d3.GroupedUSStates(params);
        },
        GroupedUSStates : function(params) {
            /////////////////////////////////////////////
            // parameters that can be passed in


            /////////////////////////////////////////////
            // internal state

            this.namespace = "edges-d3-grouped-us-states";

            this.loaded = false;

            this.draw = function() {
                // we only need to render this the first time draw is called
                if (this.loaded) { return }

                // ensure that we are starting from scratch
                this.component.context.html("");

                // get the dom element from the context, so that we can use it for the d3 selectors
                var domElement = this.component.context.get(0);

                // css classes that we'll need
                var tooltip = edges.css_classes(this.namespace, "tooltip", this);
                var legend = edges.css_classes(this.namespace, "legend", this);
                var mapClasses = edges.css_classes(this.namespace, "map", this);

                //Width and height of map
                var width = 960;
                var height = 500;

                // D3 Projection
                var projection = d3.geo.albersUsa()
                                   .translate([width/2, height/2])    // translate to center of screen
                                   .scale([1000]);          // scale things down so see entire US

                // Define path generator
                var path = d3.geo.path()               // path generator that will convert GeoJSON to SVG paths
                             .projection(projection);  // tell path generator to use albersUsa projection

                // Define linear scale for output
                var color = d3.scale.linear()
                              .range(["#6699ff","#99cc00","#9966ff","#ff6666", "#ffcc66", "#eeeeee"]);
                var legendText = ["PADD1", "PADD2", "PADD3", "PADD4", "PADD5", "Oops, wrong state name"];

                var padd1_value = 10000;
                var padd2_value = 20000;
                var padd3_value = 30000;
                var padd4_value = 40000;
                var padd5_value = 50000;

                //Create SVG element and append map to the SVG
                var svg = d3.select(domElement)
                            .append("svg")
                            .attr("width", width)
                            .attr("height", height)
                            .attr("class", mapClasses);

                // Append Div for tooltip to SVG
                var div = d3.select(domElement)
                            .append("div")
                            .attr("class", tooltip)
                            .style("opacity", 0);

                color.domain([0,1,2,3,4,5]); // setting the range of the input data
                d3.json("/static/data/padd/us-states.json", function(json) {

                    // Bind the data to the SVG and create one path per GeoJSON feature
                    svg.selectAll("path")
                        .data(json.features)
                        .enter()
                        .append("path")
                        .attr("d", path)
                        .style("stroke", "#fff")
                        .style("stroke-width", "1")
                        .style("fill", function(d) {
                            var padd5 = ["Washington", "Oregon", "Nevada", "California", "Arizona", "Alaska", "Hawaii"];
                            var padd4 = ["Montana", "Wyoming", "Idaho", "Utah", "Colorado"];
                            var padd3 = ["New Mexico", "Louisiana", "Texas", "Arkansas", "Alabama", "Mississippi"];
                            var padd2 = ["North Dakota", "South Dakota", "Nebraska", "Kansas", "Minnesota", "Oklahoma", "Iowa", "Missouri", "Wisconsin", "Michigan", "Illinois",
                                "Indiana", "Ohio", "Kentucky", "Tennessee"];
                            var padd1 = ["Maine", "Vermont", "New Hampshire", "Massachusetts", "Connecticut", "Rhode Island", "New York", "New Jersey",
                                "Pennsylvania", "Maryland", "Delaware", "West Virginia", "Virginia", "North Carolina", "South Carolina", "Georgia", "Florida"];
                            var name = d.properties.name;
                            if (padd1.indexOf(name) !== -1 ) {
                                return "#6699ff";
                            } else if (padd2.indexOf(name) !== -1 ) {
                                return "#99cc00";
                            } else if (padd3.indexOf(name) !== -1 ) {
                                return "#9966ff";
                            } else if (padd4.indexOf(name) !== -1 ) {
                                return "#ff6666";
                            } else if (padd5.indexOf(name) !== -1 ) {
                                return "#ffcc66";
                            } else {
                                return "#eeeeee"
                            }
                        })
                        .on("mouseover", function(d) {
                            var mouse = d3.mouse(svg.node()).map(function(d) {
                                return parseInt(d);
                            });
                            div.transition()
                                    .duration(200)
                                    .style("opacity", 1);
                            div.html('<h4>'+ d.properties.name + '</h4>' +
                                    '<p>Last month: 25000</p>' +
                                    '<p>Prediction: 30000</p>')
                                .attr('style', 'left:' + (mouse[0] + 15) +
                                    'px; top:' + (mouse[1] - 35) + 'px')
                                    .style("color", "white");
                        });

                    // Add example numbers for each PADD to the relative center of the center-most state
                    svg.selectAll("text")
                            .data(json.features)
                            .enter()
                            .append("svg:text")
                            .text(function(d){
                                if (d.properties.name === "North Carolina"){
                                    return padd1_value;
                                } else if (d.properties.name === "Iowa"){
                                    return padd2_value;
                                } else if (d.properties.name === "Texas"){
                                    return padd3_value;
                                } else if (d.properties.name === "Wyoming"){
                                    return padd4_value;
                                } else if (d.properties.name === "Nevada"){
                                    return padd5_value;
                                } else {
                                    return "";
                                }
                            })
                            .attr("x", function(d){
                                return path.centroid(d)[0];
                            })
                            .attr("y", function(d){
                                return  path.centroid(d)[1];
                            })
                            .attr("text-anchor","middle")
                            .attr('font-size','36pt')
                            .attr("stroke", "white")
                            .attr("stroke-width", "1px")
                            .attr("font-weight", "bold")
                            .attr("fill", "#4d4d4d");


                    // Modified Legend Code from Mike Bostock: http://bl.ocks.org/mbostock/3888852
                    var legend = d3.select(domElement).append("svg")
                                    .attr("class", legend)
                                    .attr("width", 150)
                                    .attr("height", 200)
                                    .selectAll("g")
                                    .data(color.domain().slice())
                                    .enter()
                                    .append("g")
                                    .attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });
                    legend.append("rect")
                          .attr("width", 18)
                          .attr("height", 18)
                          .style("fill", color);
                    legend.append("text")
                          .data(legendText)
                          .attr("x", 24)
                          .attr("y", 9)
                          .attr("dy", ".35em")
                          .text(function(d) { return d; });
                });

                this.loaded = true;
            }
        },

        newGenericVectorMap : function(params) {
            if (!params) { params = {} }
            edges.d3.GenericVectorMap.prototype = edges.newRenderer(params);
            return new edges.d3.GenericVectorMap(params);
        },
        GenericVectorMap : function(params) {

            //////////////////////////////////////////////////////
            // Parameters that can be passed in

            // width and height in pixels that we'd like the map to occupy
            // if we want to introduce dynamic sizing, we'll need to think a bit more about this
            this.width = edges.getParam(params.width, 960);
            this.height = edges.getParam(params.height, 500);

            // map projection to use.  Shoudl be one of those named in this.projectionMap
            this.projectionType = edges.getParam(params.projectionType, "mercator");

            // URL to geojson file to render
            this.geojson = edges.getParam(params.geojson, "/static/data/padd/countries.geo.json");

            // kind of scaling to get the map as a whole to fit in the viewable area.  Can be one of the following:
            // * best (default) - the best fit, which is in line with whichever side is longest
            // * horizontal - scale so that the horizontal aspect of the map fills the viewable area, cutting off any vertical components that do not fit
            // * vertical - the opposite of horizontal
            this.mapScaleFit = edges.getParam(params.mapScaleFit, "best"); // or "horizontal", "vertical"

            // when the map is scaled to fit in the view port, you can specify a number between 0.0 and 1.0 to be the
            // border around the scaled area.  This is basically like working out the scale and then zooming out a small
            // amount.  Recommend not to go much higher than 0.05 or 0.1, tbh.
            this.mapScaleBorder = edges.getParam(params.mapScaleBorder, 0.0); // between 0.0 and 1.0 - factor by which to preserve space around the map during scaling (works like %)

            // fields that you want to search in the geojson for identifiers to match to region data
            this.matchRegionOn = edges.getParam(params.matchRegionOn, ["id", "properties.name"]);

            // if you want to adjust the precision of the adaptive resampling, you can do that here, otherwise it will default
            this.resamplingPrecision = edges.getParam(params.resamplingPrecision, false);

            this.defaultStroke = edges.getParam(params.defaultStroke, "#ffffff");
            this.defaultStrokeWidth = edges.getParam(params.defaultStrokeWidth, 1);
            this.defaultFill = edges.getParam(params.defaultFill, "#cccccc");

            //////////////////////////////////////////////////////
            // parameters for managing internal state

            this.loaded = false;

            this.projectionMap = {
                "mercator" : d3.geo.mercator
            };

            this.namespace = "edges-d3-generic-vector-map";

            this.draw = function() {
                // we only need to render this the first time draw is called
                if (this.loaded) { return }

                // ensure that we are starting from scratch
                this.component.context.html("");

                // get the dom element from the context, so that we can use it for the d3 selectors
                var domElement = this.component.context.get(0);

                var containerClass = edges.css_classes(this.namespace, "container", this);
                var tooltipClass = edges.css_classes(this.namespace, "tooltip", this);

                // D3 Projection

                // In terms of projection, if this is an edges component, we can pass in arguments like scale, center, precision, translate, etc. The only thing that might
                // be slightly difficult to pass in is the type, in this case mercator. We might need separate components for the different projections.
                // And by different, I mean the alberUsa one, which is very US specific, and the mercator one, which I think is probably going to be our main world one.
                // There are other world ones, there's even a globe, we can add them as needs arise.

                var projection = this.projectionMap[this.projectionType]();
                projection.scale(1);    // will be scaled correctly later

                // Define path generator
                var path = d3.geo.path()
                             .projection(projection);

                var container = d3.select(domElement)
                            .append("div").attr("class", containerClass);

                //Create SVG element and append map to the SVG
                var svg = container
                            .append("svg")
                            .attr("width", this.width)
                            .attr("height", this.height);

                // Append Div for tooltip to SVG

                // This is the actual tooltip that appears on hover. It needs to be a separate div defined outside of the svg appending,
                // otherwise it won't be redrawn on change of location
                var tip = container
                            .append("div")
                            .attr("class", tooltipClass)
                            .style("display", "none");

                // If we have the country name as the key, we can use d.properties.name to access the correct data
                // var sample_data = {"country" : {"year" : {"consumption":1000, "production":500}}};

                // Load GeoJSON data - this will work with arbitrary geojson, so long as it has the name of the country at
                // d.properties.name. The projection could work with any map, provided the scale, center etc are adjusted.

                var that = this;
                d3.json(this.geojson, function(json) {

                    var s = edges.d3.calculateMapScale({
                        features: json.features,
                        path: path,
                        width: that.width,
                        height: that.height,
                        scaleFit: that.mapScaleFit,
                        border: that.mapScaleBorder
                    });

                    var c = that.center;
                    if (!c) {
                        c = {"lat" : 17, "lon" : 0}; // a reasonable centre point for a map, somewhere over the gobi desert, I think
                    }

                    projection.center([c.lon, c.lat])
                        .scale(s)
                        .translate([that.width / 2, that.height / 2]);

                    if (that.resamplingPrecision !== false) {
                        projection.precision(that.resamplingPrecision);
                    }

                    // Bind the data to the SVG and create one path per GeoJSON feature
                    svg.selectAll("path")
                        .data(json.features)
                        .enter()
                        .append("path")
                        .attr("d", path)
                        .style("stroke", function(d) { return that._getStroke({d : d}) })
                        .style("stroke-width", function(d) { return that._getStrokeWidth({d : d}) })
                        .style("fill", function(d) { return that._getFill({d : d}) })
                        .on("mouseover", function(d) {
                            // A lot of the code below is repeated in both mouse events. This is spaghetti, but at
                            // the same time, both functions need specific information only avaible to them.
                            // In particular the two separate divs needed for the two types of tooltips make it difficult
                            // to generalise more. We might end up wanting different content in them anyway, maybe more information
                            // in the second

                            var mouse = d3.mouse(svg.node()).map(function(d) {
                                return parseInt(d);
                            });

                            var name = d.properties.name.replace(/\s+/g, '');
                            var regionData = that._getRegionData({d: d});
                            var frag = that._renderRegionData({regionData: regionData, d : d});

                            if ($('#'+name).length==0){
                                tip.html(frag)
                                    .attr('style', 'left:' + (mouse[0] + 15) +
                                        'px; top:' + (mouse[1] - 35) + 'px')
                                    .style("color", "black");
                            }
                        })
                        .on("click", function(d) {
                            var mouse = d3.mouse(svg.node()).map(function(d) {
                                return parseInt(d);
                            });

                            var name = d.properties.name.replace(/\s+/g, '');
                            var regionData = that._getRegionData({d: d});
                            var frag = that._renderRegionData({regionData: regionData, d : d});

                            if ($('#'+name).length) {
                                $('#'+name).remove();
                            } else {
                                var div = component
                                    .append("div")
                                    .attr("class", tooltipClass)
                                    .attr("id", name)
                                    .style("display", "block");

                                div.html(frag)
                                    .attr('style', 'left:' + (mouse[0] + 15) +
                                        'px; top:' + (mouse[1] - 35) + 'px')
                                    .style("color", "black");
                            }
                        });

                });

                this.loaded = true;
            };

            this._getStroke = function(params) {
                return this.defaultStroke;
            };

            this._getStrokeWidth = function(params) {
                return this.defaultStrokeWidth;
            };

            this._getFill = function(params) {
                var d = params.d;

                var name = d.properties.name;
                if (name === "Australia") {
                    return "#000000";
                }
                return this.defaultFill;
            };

            this._getRegionData = function(params) {
                var d = params.d;

                for (var i = 0; i < this.matchRegionOn.length; i++) {
                    var matchField = this.matchRegionOn[i];
                    var fieldVal = edges.objVal(matchField, d, false);
                    if (fieldVal && this.component.regionData[fieldVal]) {
                        return this.component.regionData[fieldVal];
                    }
                }

                return this.component.defaultRegionData;
            };

            this._renderRegionData = function(params) {
                var regionData = params.regionData;
                var d = params.d;

                var frag = '<h4>'+ d.properties.name + '</h4>';
                for (var field in regionData) {
                    var val = regionData[field];
                    frag += '<p>' + edges.escapeHtml(field) + ": " + edges.escapeHtml(val) + "</p>";
                }

                return frag;
            };
        }
    }
});