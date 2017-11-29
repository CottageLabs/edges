$.extend(edges, {
    loading_io: {
        newLoadingIORendererBS3 : function(params) {
            return edges.instantiate(edges.loading_io.LoadingIORendererBS3, params, edges.newRenderer);
        },
        LoadingIORendererBS3 : function(params) {
            this.preset = edges.getParam(params.preset, false);
            this.labelCenter = edges.getParam(params.labelCenter, true);

            this.title = edges.getParam(params.title, false);
            this.showXofY = edges.getParam(params.showXofY, false);
            this.xOfYForm = edges.getParam(params.xOfYForm, "{x} of {y}");
            this.xyNumFormat = edges.getParam(params.xyNumFormat, false);

            this.stroke = edges.getParam(params.stroke, false);
            this.strokeWidth = edges.getParam(params.strokeWidth, false);
            this.strokeTrail = edges.getParam(params.strokeTrail, false);
            this.strokeTrailWidth = edges.getParam(params.strokeTrailWidth, false);

            this.fill = edges.getParam(params.fill, false);

            this.namespace = "edges-loading_io-renderer";

            this.barRef = false;
            
            this.draw = function () {
                var barId = edges.css_id(this.namespace, "bar", this);
                var barClass = edges.css_classes(this.namespace, "bar", this);
                var containerClass = edges.css_classes(this.namespace, "container", this);

                var dataPreset = "";
                if (this.preset !== false) {
                    dataPreset = " data-preset=" + this.preset + " ";
                }

                var dataStroke = "";
                if (this.stroke !== false) {
                    dataStroke = " data-stroke=" + this.stroke + " ";
                }

                var dataStrokeWidth = "";
                if (this.strokeWidth !== false) {
                    dataStrokeWidth = " data-stroke-width=" + this.strokeWidth + " ";
                }

                var dataStrokeTrail = "";
                if (this.strokeTrail !== false) {
                    dataStrokeTrail = " data-stroke-trail=" + this.strokeTrail + " ";
                }

                var dataStrokeTrailWidth = "";
                if (this.strokeTrailWidth !== false) {
                    dataStrokeTrailWidth = " data-stroke-trail-width=" + this.strokeTrailWidth + " ";
                }

                var additionalClasses = "";
                if (this.labelCenter === true) {
                    additionalClasses = "label-center";
                }

                var title = "";
                if (this.title !== false) {
                    var titleClass = edges.css_classes(this.namespace, "title", this);
                    title = '<div class="' + titleClass + '">' + this.title + '</div>';
                }

                var barFrag = '<div id="' + barId + '" \
                    class="' + barClass + ' ' + additionalClasses + '" \
                    data-value="' + this.component.percent + '" \
                    ' + dataPreset + dataStroke + dataStrokeWidth + dataStrokeTrail + dataStrokeTrailWidth + '></div>';

                var xofyFrag = "";
                if (this.showXofY === true) {
                    var formattedX = this.component.x;
                    var formattedY = this.component.y;
                    if (this.xyNumFormat !== false) {
                        formattedX = this.xyNumFormat(this.component.x);
                        formattedY = this.xyNumFormat(this.component.y);
                    }

                    var form = this.xOfYForm;
                    form = form.replace("{x}", formattedX).replace("{y}", formattedY);
                    var xOfYClass = edges.css_classes(this.namespace, "xofy", this);
                    xofyFrag = '<div class="' + xOfYClass + '">' + form + '</div>';
                }

                var frag = '<div class="' + containerClass + '">' + title + barFrag + xofyFrag + '</div>';
                this.component.context.html(frag);

                var barIdSelector = edges.css_id_selector(this.namespace, "bar", this);
                this.barRef = new ldBar(barIdSelector);

                if (this.fill) {
                    this.component.jq(barIdSelector).find("path.baseline").attr("fill", this.fill);
                }
            }
        }
    }
});
