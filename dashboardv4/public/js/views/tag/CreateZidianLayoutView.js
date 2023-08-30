/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define(['require',
    'backbone',
    'hbs!tmpl/tag/CreateZidianLayoutView_tmpl',
    'utils/Utils',
    'views/tag/TagAttributeItemView',
    'collection/VTagList',
    'utils/UrlLinks',
    'platform'
], function(require, Backbone, CreateTagLayoutViewTmpl, Utils, TagAttributeItemView, VTagList, UrlLinks, platform) {

    var CreateTagLayoutView = Backbone.Marionette.CompositeView.extend(
        /** @lends CreateTagLayoutView */
        {
            _viewName: 'CreateTagLayoutView',

            template: CreateTagLayoutViewTmpl,

            templateHelpers: function() {
                return {
                    create: this.create,
                    description: this.description,
                    catalog: this.catalog,
                };
            },

            /** Layout sub regions */
            regions: {},

            childView: TagAttributeItemView,

            childViewContainer: "[data-id='addAttributeDiv']",

            childViewOptions: function() {
                return {
                    // saveButton: this.ui.saveButton,
                    parentView: this
                };
            },
            /** ui selector cache */
            ui: {
                nameCN: "[data-id='tagNameCN3']",        // 中文名称
                tagName: "[data-id='tagName3']",            // 中文简拼
                parentTag: "[data-id='parentTagList3']",    // 
                description: "[data-id='description3']",    // 字典描述
                catalog: "[data-id='catalog3']",            // 字典目录
                title: "[data-id='title3']",                // 
                version: "[data-id='version3']",            // 版本号
                attributeData: "[data-id='attributeData3']",
                addAttributeDiv: "[data-id='addAttributeDiv3']",
                createTagForm: "[data-id='createTagForm3']",
                addAttribute: '[data-id="addAttribute3"]',
                showAttribute: '[data-id="showAttribute3"]'
            },
            /** ui events hash */
            events: function() {
                var events = {};
                events["click " + this.ui.attributeData] = "onClickAddAttriBtn";
                events["click " + this.ui.addAttribute] = 'onClickAddTagAttributeBtn';

                return events;
            },
            /**
             * intialize a new CreateTagLayoutView Layout
             * @constructs
             */
            initialize: function(options) {
                _.extend(this, _.pick(options, 'tagCollection', 'enumDefCollection', 'model', 'tag', 'descriptionData', 'selectedTag'));
                if (this.model) {
                    this.description = this.model.get('description');
                } else {
                    this.create = true;
                }
                this.collection = new Backbone.Collection();
                $("body").on("click", "#DeleteRow", function () {
                    $(this).parents("#row").remove();
                })
            },
            bindEvents: function() {
            },
            onRender: function() {
                var that = this,
                    modalOkBtn;
                this.$('.fontLoader').show();
                if (this.create) {
                    this.tagCollectionList();
                } else {
                    this.ui.title.html('<span>' + _.escape(this.tag) + '</span>');
                }
                if (!('placeholder' in HTMLInputElement.prototype)) {
                    this.ui.createTagForm.find('input,textarea').placeholder();
                }
                modalOkBtn = function() {
                    var editorContent = $(that.ui.description).trumbowyg('html'),
                        okBtn = $('.modal').find('button.ok');
                    okBtn.removeAttr("disabled");
                    if (editorContent === "") {
                        okBtn.prop('disabled', true);
                    }
                    if (that.description === editorContent) {
                        okBtn.prop('disabled', true);
                    }
                };
                Utils.addCustomTextEditor({ selector: this.ui.description, callback: modalOkBtn, small: false });
                $(this.ui.description).trumbowyg('html', Utils.sanitizeHtmlContent({ data: this.description }));
                that.hideLoader();
            },
            tagCollectionList: function() {
                var that = this,
                    str = '';
                this.ui.parentTag.empty();
                this.tagCollection.fullCollection.each(function(val) {
                    var name = Utils.getName(val.toJSON());
                    str += '<option ' + (name == that.selectedTag ? 'selected' : '') + '>' + (name) + '</option>';
                });
                that.ui.parentTag.html(str);
                // IE9 support
                if (platform.name === "IE") {
                    that.ui.parentTag.select2({
                        multiple: true,
                        placeholder: "Search Classification",
                        allowClear: true
                    });
                }
            },
            hideLoader: function() {
                this.$('.fontLoader').hide();
                this.$('.hide').removeClass('hide');
            },
            collectionAttribute: function() {
                this.collection.add(new Backbone.Model({
                    "name": "",
                    "typeName": "string",
                    "isOptional": true,
                    "cardinality": "SINGLE",
                    "valuesMinCount": 0,
                    "valuesMaxCount": 1,
                    "isUnique": false,
                    "isIndexable": true
                }));
            },
            onClickAddAttriBtn: function() {
                this.collectionAttribute();
                if (!('placeholder' in HTMLInputElement.prototype)) {
                    this.ui.addAttributeDiv.find('input,textarea').placeholder();
                }

            },
            onClickAddTagAttributeBtn: function(e) {
                var that = this;
                let htmlInput = `
                    <div class="item" style="margin-bottom:8px;"> 
                        <div class="input-group m-3" style="display:flex;">
                            <input type="text" class="key form-control m-input" placeholder="请输入属性" style="margin-left:4px;"> 
                            <input type="text" class="value form-control m-input" placeholder="请输入值" style="margin-left:4px;"> 
                            <div class="input-group-prepend" style="margin-left:4px;">
                                <button class="btn btn-danger" id="DeleteRow" type="button">
                                    删除
                                </button> 
                            </div>
                        </div> 
                    </div>
                `
                this.ui.showAttribute.append(htmlInput);
            },
        });
    return CreateTagLayoutView;
});