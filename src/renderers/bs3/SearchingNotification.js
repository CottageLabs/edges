// requires: edges
// requires: edges.util

if (!window.hasOwnProperty("edges")) { edges = {}}
if (!edges.hasOwnProperty("renderers")) { edges.renderers = {}}
if (!edges.renderers.hasOwnProperty("bs3")) { edges.renderers.bs3 = {}}

edges.renderers.bs3.SearchingNotification = class extends edges.Renderer {

    constructor(params) {
        super(params);

        this.searchingMessage = edges.util.getParam(params, "searchingMessage", "Loading, please wait...");

        // namespace to use in the page
        this.namespace = "edges-bs3-searching-notification";
    }

    draw() {
        var frag = "";
        if (this.component.searching) {
            // classes that we need
            var barClasses = edges.util.styleClasses(this.namespace, "bar", this);
            frag = '<div class="progress-bar progress-bar-info progress-bar-striped active ' + barClasses + '"> \
                    ' + this.searchingMessage + ' \
                </div>'
        }
        this.component.context.html(frag);
    }
}
