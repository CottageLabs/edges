$.extend(true, edges, {
    bs3 : {
        newSearchingNotificationRenderer: function (params) {
            if (!params) {
                params = {}
            }
            edges.bs3.SearchingNotificationRenderer.prototype = edges.newRenderer(params);
            return new edges.bs3.SearchingNotificationRenderer(params);
        },
        SearchingNotificationRenderer: function (params) {

            this.searchingMessage = params.searchingMessage || "Loading, please wait...";

            // namespace to use in the page
            this.namespace = "edges-bs3-searching-notification";

            this.draw = function () {
                var frag = "";
                if (this.component.searching) {
                    // classes that we need
                    var barClasses = edges.css_classes(this.namespace, "bar", this);
                    frag = '<div class="progress-bar progress-bar-info progress-bar-striped active ' + barClasses + '"> \
                            ' + this.searchingMessage + ' \
                        </div>'
                }
                this.component.context.html(frag);
            }
        }
    }
});
