$.extend(true, edges, {
    html5: {
        newAddFieldFilterWithCLInput: function (params) {
            return edges.instantiate(edges.html5.AddFieldFilterWithCLInput, params, edges.newRenderer);
        },
        AddFieldFilterWithCLInput: function (params) {

            // list of fields in the form
            // [{field: "field", display: "Display Name"}]
            this.fields = edges.getParam(params.fields, []);

            // dictionary of clinput configurations for each field type,
            // of the form
            // {field:
            //  {
            //    optionsFunction: ...
            //    optionsTemplate: ...
            //    selectedTemplate: ...
            //    allowNewValue: ...
            //    newValueFunction: ...
            //    textFromObject: ...
            //  }
            //}
            this.clcfgs = edges.getParam(params.clcfgs, {});

            this.selectName = edges.getParam(params.selectName, "Filter by");
            this.addButton = edges.getParam(params.addButton, "Add new filter");
            this.removeAllButton = edges.getParam(params.removeAllButton, "Remove all filters");

            this.logState = edges.getParam(params.logState, false);

            //////////////////////////////////////////////
            // variables for internal state
            this.namespace = "edges-html5-addfieldfilterwithclinput";

            this.drawn = false;

            this.clinput = false;

            this.draw = function () {
                if (this.drawn) {
                    return;
                }
                this.drawn = true;

                // and render into the page
                let inputClass = edges.css_classes(this.namespace, "input", this);
                let selectorContainer = edges.css_classes(this.namespace, "selector-container", this);
                let selectorName = edges.css_id(this.namespace, "selector", this);
                let addFilterButton = edges.css_classes(this.namespace, "add", this);
                let removeAllButton = edges.css_classes(this.namespace, "remove", this);

                let selectorFrag = `<select name="${selectorName}" id="${selectorName}"><option name="" disabled selected value>${this.selectName}</option>`;
                for (let i = 0; i < this.fields.length; i++) {
                    let field = this.fields[i];
                    selectorFrag += `<option value="${field.field}">${field.display}</option>`
                }
                selectorFrag += `</select>`;

                let frag = `<div class="${selectorContainer}">${selectorFrag}</div>
                    <div class="${inputClass}">
                        <input type="text" placeholder="Select a field to filter by" disabled>
                    </div>
                    <button class="${addFilterButton}" disabled>${this.addButton}</button>
                    <button class="${removeAllButton}">${this.removeAllButton}</button>`;

                this.component.context.html(frag);

                let selectorSelector = edges.css_id_selector(this.namespace, "selector", this);
                edges.on(selectorSelector, "change", this, "fieldSelected");

                let addFilterSelector = edges.css_class_selector(this.namespace, "add", this);
                edges.on(addFilterSelector, "click", this, "addFilter");

                let removeAllSelector = edges.css_class_selector(this.namespace, "remove", this);
                edges.on(removeAllSelector, "click", this, "removeAllFilters");

            };

            this.fieldSelected = function(element) {
                let name = $(element).find(":selected").attr("value");
                if (!name) {
                    let inputContainer = edges.css_class_selector(this.namespace, "input", this);
                    $(inputContainer).html(`<input type="text" placeholder="Select a field to filter by" disabled>`);

                    let addFilterSelector = edges.css_class_selector(this.namespace, "add", this);
                    $(addFilterSelector).prop("disabled", true);

                    if (this.clinput) {
                        this.clinput = false;
                    }
                } else {
                    let inputSelector = edges.css_class_selector(this.namespace, "input", this);
                    let inputId = edges.css_id(this.namespace, this.component.id + "-input", this);

                    this.clinput = this._makeInput({
                        field: name,
                        element: $(inputSelector)[0],
                        inputId: inputId,
                        inputAttributes: {}
                    });
                }
            };

            this.removeAllFilters = function() {
                this.component.clearFilters();
            };

            this.addFilter = function(element) {
                let selectorSelector = edges.css_id_selector(this.namespace, "selector", this);
                let name = $(selectorSelector).find(":selected").attr("value");
                let clcfg = this.clcfgs[name];

                let obj = this.clinput.currentSelection();
                if (clcfg.textFromObject) {
                    let text = clcfg.textFromObject(obj);
                    if (text) {
                        this.component.addFilter({field: name, value: text})
                    }
                } else {
                    if (obj) {
                        this.component.addFilter({field: name, value: obj});
                    }
                }

                this.clinput.reset();
            };

            this._makeInput = function(params) {
                let that = this;
                let clcfg = this.clcfgs[params.field]

                let allowValue = false;
                if (clcfg.allowNewValue) {
                    if (clcfg.newValueFunction) {
                        allowValue = clcfg.newValueFunction
                    } else {
                        allowValue = function(v) {
                            return v;
                        }
                    }
                }

                return clinput.init({
                    element: params.element,
                    id: params.inputId,
                    label: "",
                    // initialSelection: params.value,
                    inputAttributes: params.inputAttributes,
                    logState: this.logState,
                    options: (text, callback) => {
                        if (clcfg.optionsFunction) {
                            clcfg.optionsFunction(text, callback);
                        } else {
                            callback([text]);
                        }
                    },
                    optionsTemplate: (option) => {
                        if (clcfg.optionsTemplate) {
                            return clcfg.optionsTemplate(option);
                        } else {
                            return option;
                        }
                    },
                    selectedTemplate: (option) => {
                        if (clcfg.selectedTemplate) {
                            return clcfg.selectedTemplate(option)
                        } else {
                            return option;
                        }
                    },
                    newValue: allowValue,
                    onInit: function(clinstance) {
                        $(clinstance.input).trigger("focus");
                    },
                    onChoose: function(e, idx) {
                        let addFilterSelector = edges.css_class_selector(that.namespace, "add", that);
                        $(addFilterSelector).prop("disabled", false);
                    },
                    onClear: function(e, idx) {
                        let addFilterSelector = edges.css_class_selector(that.namespace, "add", that);
                        $(addFilterSelector).prop("disabled", true);
                    }
                })
            }
        }
    }
});