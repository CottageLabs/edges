$.extend(edges, {

    newFragments : function(params) {
        return edges.instantiate(edges.Fragments, params, edges.newComponent);
    },
    Fragments : function(params) {
        this.urlTemplate = edges.getParam(params.urlTemplate, false);

        this.urlSubstitutions = edges.getParam(params.urlSubstitutions, {});

        this.datatype = edges.getParam(params.datatype, "html");

        this.fragment = "";

        this.currentUrl = "";

        this.synchronise = function() {
            var url = this.urlTemplate;
            for (var sub in this.urlSubstitutions) {
                url = url.replace(sub, this.urlSubstitutions[sub]);
            }
            this.currentUrl = url;
            $.ajax({
                type: "GET",
                url: url,
                datatyle: this.datatype,
                success: edges.objClosure(this, "retrievedFragment"),
                error: edges.objClosure(this, "failedToLoad")
            });
        };

        this.failedToLoad = function() {
            console.log("Failed to load page from " + this.currentUrl);
        };

        this.retrievedFragment = function(data) {
            this.fragment = data;
            this.draw();
        };

        this.draw = function() {
            this.context.html(this.fragment);
        }
    }

});
