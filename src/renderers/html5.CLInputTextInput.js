$.extend(true, edges, {
    html5: {
        newCLInputTextInput: function (params) {
            return edges.instantiate(edges.html5.CLInputTextInput, params, edges.newRenderer);
        },
        CLInputTextInput: function (params) {
            this.optionsFunction = edges.getParam(params.optionsFunction, false);
            this.optionsTemplate = edges.getParam(params.optionsTemplate, false);
            this.selectedTemplate = edges.getParam(params.selectedTemplate, false);
            this.allowNewValue = edges.getParam(params.allowNewValue, false);
            this.newValueFunction = edges.getParam(params.newValueFunction, false);
            this.textFromObject = edges.getParam(params.textFromObject, false);
            this.objectFromText = edges.getParam(params.objectFromText, false);

            this.logState = edges.getParam(params.logState, false);

            //////////////////////////////////////////////
            // variables for internal state
            this.namespace = "edges-html5-clinput";

            this.clinput = false;

            this.draw = function () {
                let inputClass = edges.css_classes(this.namespace, "input", this);
                let frag = `<div class="${inputClass}"></div>`;

                // and render into the page
                this.component.context.html(frag);

                let onward = edges.objClosure(this, "draw2");
                let obj = this.component.text;

                if (this.component.text) {
                    if (this.objectFromText) {
                        this.objectFromText(obj, onward)
                    } else {
                        this.draw2(obj)
                    }
                } else {
                    this.draw2(obj)
                }
            };

            this.draw2 = function(obj) {
                let inputSelector = edges.css_class_selector(this.namespace, "input", this);
                let inputId = edges.css_id(this.namespace, this.component.id + "-input", this);
                this.clinput = this._makeInput({
                    element: $(inputSelector)[0],
                    inputId: inputId,
                    value: obj,
                    inputAttributes: {}
                })
            }

            this._makeInput = function(params) {
                let that = this;

                let allowValue = false;
                if (this.allowNewValue) {
                    if (this.newValueFunction) {
                        allowValue = this.newValueFunction
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
                    initialSelection: params.value,
                    inputAttributes: params.inputAttributes,
                    logState: that.logState,
                    options: (text, callback) => {
                        if (that.optionsFunction) {
                            that.optionsFunction(text, callback);
                        } else {
                            callback([text]);
                        }
                    },
                    optionsTemplate: (option) => {
                        if (that.optionsTemplate) {
                            return that.optionsTemplate(option);
                        } else {
                            return option;
                        }
                    },
                    selectedTemplate: (option) => {
                        if (that.selectedTemplate) {
                            return that.selectedTemplate(option)
                        } else {
                            return option;
                        }
                    },
                    newValue: allowValue,
                    onChoose: function(e, idx) {
                        let obj = that.clinput.currentSelection();
                        that.objSelected(obj);
                    },
                    onClear: function(e, idx) {
                        that.clearText();
                    }
                })
            }

            this.objSelected = function(obj) {
                if (this.textFromObject) {
                    this.component.setText(this.textFromObject(obj))
                } else {
                    this.component.setText(obj);
                }
            }

            this.clearText = function() {
                this.component.clearText();
            }
        }
    }
});