$.extend(true, edges, {
    bs3 : {
        newResultCountRenderer: function (params) {
            if (!params) {params = {}}
            edges.bs3.ResultCountRenderer.prototype = edges.newRenderer(params);
            return new edges.bs3.ResultCountRenderer(params);
        },
        ResultCountRenderer: function (params) {

            this.prefix = edges.getParam(params.prefix, "");

            this.suffix = edges.getParam(params.suffix, "");

            this.countFormat = edges.getParam(params.countFormat, false);

            this.htmlContainerWrapper = edges.getParam(params.htmlContainerWrapper, true);

            ////////////////////////////////////////
            // state variables

            this.namespace = "edges-bs3-result-count";

            this.draw = function () {
                // classes we'll need
                var containerClass = edges.css_classes(this.namespace, "container", this);
                var totalClass = edges.css_classes(this.namespace, "total", this);
                var prefixClass = edges.css_classes(this.namespace, "prefix", this);
                var suffixClass = edges.css_classes(this.namespace, "suffix", this);

                var total = this.component.total;
                if (!total) {
                    total = 0;
                }
                if (this.countFormat) {
                    total = this.countFormat(total);
                }
                total = '<span class="' + totalClass + '">' + total + '</span>';

                var prefix = "";
                if (this.prefix !== "") {
                    prefix = '<span class="' + prefixClass + '">' + this.prefix + '</span>';
                }

                var suffix = "";
                if (this.suffix !== "") {
                    suffix = '<span class="' + suffixClass + '">' + this.suffix + '</span>';
                }


                // the total number of records found
                var recordCount = prefix + total + suffix;

                var frag = recordCount;
                if (this.htmlContainerWrapper) {
                    frag = '<div class="' + containerClass + '"><div class="row"><div class="col-md-12">{{COUNT}}</div></div></div>';
                    frag = frag.replace(/{{COUNT}}/g, recordCount);
                }

                this.component.context.html(frag);
            };
        }
    }
});
