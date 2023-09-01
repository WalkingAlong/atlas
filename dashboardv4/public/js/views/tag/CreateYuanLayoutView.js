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
    'hbs!tmpl/tag/CreateYuanLayoutView_tmpl',
    'utils/Utils',
    'views/tag/TagAttributeItemView',
    'collection/VTagList',
    'utils/UrlLinks',
    'platform',
    'collection/VEntityList',
], function(require, Backbone, CreateTagLayoutViewTmpl, Utils, TagAttributeItemView, VTagList, UrlLinks, platform, VEntityList) {

    var CreateTagLayoutView = Backbone.Marionette.CompositeView.extend(
        /** @lends CreateTagLayoutView */
        {
            _viewName: 'CreateZidianLayoutView',

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

            childViewContainer: "[data-id='addYuanAttributeDiv']",

            childViewOptions: function() {
                return {
                    // saveButton: this.ui.saveButton,
                    parentView: this
                };
            },
            /** ui selector cache */
            ui: {
                yuanName: "[data-id='yuanName']",           // 中文名称
                xdName: "[data-id='xdName']",               // 限定名称
                bianhao: "[data-id='bianhao']",             // 编号
                changdu: "[data-id='changdu']",             // 长度
                yueshu: "[data-id='yueshu']",               // 约束
                zhikongjian: "[data-id='zhikongjian']",     // 值空间
                jieshijuli: "[data-id='jieshijuli']",       // 解释举例
                yinyongno: "[data-id='yinyongno']",         // 引用编号
                yuanType: "[data-id='yuanType']",           // 类型
                yuanTemplate: "[data-id='yuanTemplate']",   // 所属模板
                
                nameCN: "[data-id='tagNameCN3']",           // 中文名称
                tagName: "[data-id='yuanName']",            // 中文简拼
                yuanTemplate: "[data-id='yuanTemplate']",
                parentTag: "[data-id='parentTagList3']",    // 
                description: "[data-id='description3']",    // 字典描述
                catalog: "[data-id='catalog3']",            // 字典目录
                title: "[data-id='title3']",                // 
                version: "[data-id='version3']",            // 版本号
                attributeData: "[data-id='attributeData3']",
                addYuanAttributeDiv: "[data-id='addYuanAttributeDiv']",
                createYuanForm: "[data-id='createYuanForm']",
                addAttribute: '[data-id="addAttribute3"]',
                showAttribute: '[data-id="addYuanAttributeDiv"]'
            },
            /** ui events hash */
            events: function() {
                var events = {};
                events["click " + this.ui.attributeData] = "onClickAddAttriBtn";
                events["click " + this.ui.addAttribute] = 'onClickAddTagAttributeBtn';
                events["change " + this.ui.yuanTemplate] = 'onChangeYuanTemplate';
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
                    this.getTemplates();
                } else {
                    this.ui.title.html('<span>' + _.escape(this.tag) + '</span>');
                }
                if (!('placeholder' in HTMLInputElement.prototype)) {
                    this.ui.createYuanForm.find('input,textarea').placeholder();
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
                    this.ui.addYuanAttributeDiv.find('input,textarea').placeholder();
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
                                <button style="display:none;" class="btn btn-danger" id="DeleteRow" type="button">
                                    删除
                                </button> 
                            </div>
                        </div> 
                    </div>
                `;
                this.ui.showAttribute.html(htmlInput);
            },
            onChangeYuanTemplate: function(e) {
                console.log(e.target)
                this.onClickAddTagAttributeBtn();
            },
            getTemplates: function() {
                this.collection = new VEntityList();
                this.collection.url = UrlLinks.entitiesDefApiUrl()
                this.collection.fetch({
                    success: function(model, data) {
                        console.log('data---', data);
                    },
                    complete: function() {
                        console.log('complete: ');
                    },
                    silent: true
                });
            }
        });
    return CreateTagLayoutView;
});