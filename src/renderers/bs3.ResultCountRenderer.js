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

                // the total number of records found
                var recordCount = '<span class="' + prefixClass + '">' + this.prefix +
                    '</span><span class="' + totalClass + '">' + total +
                    '</span><span class="' + suffixClass + '">' + this.suffix + '</span>';

                var frag = '<div class="' + containerClass + '"><div class="row"><div class="col-md-12">{{COUNT}}</div></div></div>';
                frag = frag.replace(/{{COUNT}}/g, recordCount);

                this.component.context.html(frag);
            };
        }
    }
});
