$.extend(edges, {
    d3: {
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
        }
    }
});