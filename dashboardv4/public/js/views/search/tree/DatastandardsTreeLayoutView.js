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
define([
    "require",
    "hbs!tmpl/search/tree/DataStandardsTreeLayoutView_tmpl",
    "utils/Utils",
    "utils/Messages",
    "utils/Globals",
    "utils/UrlLinks",
    "utils/CommonViewFunction",
    "collection/VSearchList",
    "collection/VGlossaryList",
    "utils/Enums",
    "collection/VTagList",
    "jstree"
], function(require, DataStandardsTreeLayoutViewTmpl, Utils, Messages, Globals, UrlLinks, CommonViewFunction, VSearchList, VGlossaryList, Enums, VTagList) {
    "use strict";

    var ClassificationTreeLayoutView = Marionette.LayoutView.extend({
        template: DataStandardsTreeLayoutViewTmpl,

        regions: {},
        ui: {
            //refresh
            refreshTree: '[data-id="refreshTree2"]',
            groupOrFlatTree: '[data-id="groupOrFlatTreeView2"]',

            // menuItems: '.menu-items>ul>li',

            // tree el
            classificationSearchTree: '[data-id="classificationSearchTree2"]',

            // Show/hide empty values in tree
            showEmptyClassifications: '[data-id="showEmptyClassifications2"]',

            // Create
            createTag: '[data-id="createTag2"]',
            wildCardClick: '[data-id="wildCardClick2"]',
            wildCardSearch: '[data-id="wildCardSearch2"]',
            wildCardValue: '[data-id="wildCardValue2"]',
            wildCardContainer: '[data-id="wildCardContainer2"]',
            clearWildCard: '[data-id="clearWildCard2"]',
            classificationTreeLoader: '[data-id="classificationTreeLoader2"]'
        },
        templateHelpers: function() {
            return {
                apiBaseUrl: UrlLinks.apiBaseUrl
            };
        },
        events: function() {
            var events = {},
                that = this;
            events["click " + this.ui.refreshTree] = function(e) {
                that.changeLoaderState(true);
                that.ui.refreshTree.attr("disabled", true).tooltip("hide");
                var type = $(e.currentTarget).data("type");
                e.stopPropagation();
                that.refresh({ type: type });
            };

            events["click " + this.ui.createTag] = function(e) {
                e.stopPropagation();
                that.onClickCreateTag();
            };

            events["click " + this.ui.showEmptyClassifications] = function(e) {
                var getTreeData, displayText;
                e.stopPropagation();
                this.isEmptyClassification = !this.isEmptyClassification;
                this.classificationSwitchBtnUpdate();
            };

            events["click " + this.ui.groupOrFlatTree] = function(e) {
                var type = $(e.currentTarget).data("type");
                e.stopPropagation();
                this.isGroupView = !this.isGroupView;
                this.ui.groupOrFlatTree.tooltip('hide');
                this.ui.groupOrFlatTree.find("i").toggleClass("fa-sitemap fa-list-ul");
                this.ui.groupOrFlatTree.find("span").html(this.isGroupView ? "Show flat tree" : "Show group tree");
                that.ui[type + "SearchTree"].jstree(true).destroy();
                that.renderClassificationTree();
            };
            events["click " + this.ui.wildCardClick] = function(e) {
                e.stopPropagation();
            };
            events["click " + this.ui.wildCardSearch] = function(e) {
                e.stopPropagation();
                var tagValue = this.ui.wildCardValue.val();
                if (tagValue.indexOf("*") != -1) {
                    that.findSearchResult(tagValue);
                }
            };
            events["click " + this.ui.wildCardValue] = function(e) {
                e.stopPropagation();
            }
            events["click " + this.ui.clearWildCard] = function(e) {
                e.stopPropagation();
                that.ui.wildCardValue.val("");
                that.ui.clearWildCard.addClass('hide-icon');
            }
            events["click " + this.ui.wildCardContainer] = function(e) {
                e.stopPropagation();
            }
            events["keydown " + this.ui.wildCardValue] = function(e) {
                e.stopPropagation();
                var code = e.which;
                if (this.ui.wildCardValue.val().length > 0) {
                    this.ui.clearWildCard.removeClass('hide-icon');
                } else {
                    this.ui.clearWildCard.addClass('hide-icon');
                }
                if (code == 13) {
                    e.preventDefault();
                    var tagValue = this.ui.wildCardValue.val();
                    if (tagValue.indexOf("*") != -1) {
                        that.findSearchResult(tagValue);
                    }
                }
            };
            events["keyup " + this.ui.wildCardValue] = function(e) {
                e.stopPropagation();
                e.preventDefault();
            };
            return events;
        },
        initialize: function(options) {
            this.options = options;
            _.extend(
                this,
                _.pick(
                    options,
                    "typeHeaders",
                    "searchVent",
                    "entityDefCollection",
                    "enumDefCollection",
                    "classificationDefCollection",
                    "searchTableColumns",
                    "searchTableFilters",
                    "metricCollection",
                    "businessMetadataDefCollection"
                )
            );
            this.bindEvents();
            this.entityCountObj = _.first(this.metricCollection.toJSON());
            this.isEmptyClassification = false;
            this.entityTreeData = {};
            this.tagId = null;
            this.isGroupView = true;
        },
        onRender: function() {
            this.changeLoaderState(true);
            this.checkTagOnRefresh();
            this.createClassificationAction();
            this.ui.clearWildCard.addClass('hide-icon');
            this.changeLoaderState(false);
        },
        checkTagOnRefresh: function() {
            var that = this,
                tagName = (this.options && this.options.value) ? this.options.value.tag : null,
                presentTag = this.classificationDefCollection.fullCollection.findWhere({ name: tagName }),
                tag = new VTagList();
            if (!presentTag && tagName) {
                tag.url = UrlLinks.classificationDefApiUrl(tagName);
                tag.fetch({
                    success: function(dataOrCollection, tagDetails) {
                        that.classificationDefCollection.fullCollection.add(tagDetails);
                    },
                    cust_error: function(model, response) {
                        that.renderClassificationTree();
                    }
                });
            } else {
                this.renderClassificationTree();
            }
        },
        changeLoaderState: function(showLoader) {
            if (showLoader) {
                this.ui.classificationSearchTree.hide();
                this.ui.classificationTreeLoader.show();
            } else {
                this.ui.classificationSearchTree.show();
                this.ui.classificationTreeLoader.hide();
            }

        },
        bindEvents: function() {
            var that = this;
            this.listenTo(
                this.classificationDefCollection.fullCollection,
                "reset",
                function(model) {
                    that.classificationTreeUpdate = true;
                    that.classificationTreeRefresh();
                },
                this
            );
            this.listenTo(
                this.classificationDefCollection.fullCollection,
                "remove add",
                function(model) {
                    that.classificationTreeUpdate = false;
                    that.classificationTreeRefresh();
                },
                this
            );
            $('body').on('click', '.classificationPopoverOptions2 li', function(e) {
                that.$('.classificationPopover2').popover('hide');
                that[$(this).find('a').data('fn') + "Classification"](e)
            });
            this.searchVent.on("Classification:Count:Update", function(options) {
                that.changeLoaderState(true);
                var opt = options || {};
                if (opt && !opt.metricData) {
                    that.metricCollection.fetch({
                        complete: function() {
                            that.entityCountObj = _.first(that.metricCollection.toJSON());
                            that.classificationTreeUpdate = true;
                            that.ui.classificationSearchTree.jstree(true).refresh();
                            that.changeLoaderState(false);
                        }
                    });
                } else {
                    that.entityCountObj = opt.metricData;
                    that.ui.classificationSearchTree.jstree(true).refresh();
                    that.changeLoaderState(false);
                }

            });
        },
        classificationTreeRefresh: function() {
            if (this.ui.classificationSearchTree.jstree(true)) {
                this.ui.classificationSearchTree.jstree(true).refresh();
            } else {
                this.renderClassificationTree();
            }
        },
        findSearchResult: function(tagValue) {
            if (tagValue) {
                var params = {
                    searchType: "basic",
                    dslChecked: false
                };
                if (this.options.value) {
                    params["tag"] = tagValue;
                }
                var searchParam = _.extend({}, this.options.value, params);
                this.triggerSearch(searchParam);
            } else {
                Utils.notifyInfo({
                    content: "Search should not be empty!"
                });
                return;
            }

        },
        onSearchClassificationNode: function(showEmptyTag) {
            // on tree search by text, searches for all classification node, called by searchfilterBrowserLayoutView.js
            this.isEmptyClassification = showEmptyTag;
            this.classificationSwitchBtnUpdate();
        },
        classificationSwitchBtnUpdate: function() {
            this.ui.showEmptyClassifications.attr("data-original-title", (this.isEmptyClassification ? "Show" : "Hide") + " unused classification");
            this.ui.showEmptyClassifications.tooltip('hide');
            this.ui.showEmptyClassifications.find("i").toggleClass("fa-toggle-on fa-toggle-off");
            this.ui.showEmptyClassifications.find("span").html((this.isEmptyClassification ? "Show" : "Hide") + " unused classification");
            this.ui.classificationSearchTree.jstree(true).refresh();
        },
        createClassificationAction: function() {
            var that = this;
            Utils.generatePopover({
                el: this.$el,
                contentClass: 'classificationPopoverOptions2',
                popoverOptions: {
                    selector: '.classificationPopover2',
                    content: function() {
                        var name = this.dataset.name || null,
                            searchString = "<li><i class='fa fa-search'></i><a href='javascript:void(0)' data-fn='onSelectedSearch2'>搜索</a></li>";
                        if (name && Enums.addOnClassification.includes(name)) {
                            return "<ul>" + searchString + "</ul>";
                        } else {
                            var liString = " <li><i class='fa fa-plus'></i><a href='javascript:void(0)' data-fn='onClickCreateTag2'>Create Sub-classification</a></li><li><i class='fa fa-plus'></i><a href='javascript:void(0)' data-fn='onClickCreateYuan'>创建元数据</a></li><li><i class='fa fa-plus'></i><a href='javascript:void(0)' data-fn='onClickCreateZidian'>创建字典</a></li><li><i class='fa fa-list-alt'></i><a href='javascript:void(0)' data-fn='onViewEdit2'>View/Edit</a></li><li><i class='fa fa-trash-o'></i><a href='javascript:void(0)' data-fn='onDelete2'>删除</a></li>";
                            return "<ul>" + liString + searchString + "</ul>";
                        }
                    }
                }
            });
        },
        renderClassificationTree: function() {
            this.generateSearchTree({
                $el: this.ui.classificationSearchTree
            });
        },
        manualRender: function(options) {
            var that = this;
            _.extend(this.options, options);
            if (this.options.value === undefined) {
                this.options.value = {};
            }
            if (!this.options.value.tag) {
                this.ui.classificationSearchTree.jstree(true).deselect_all();
                this.tagId = null;
            } else {
                if (that.options.value.attributes) { that.options.value.attributes = null; }
                if ((that.options.value.tag === "_ALL_CLASSIFICATION_TYPES" && this.tagId !== "_ALL_CLASSIFICATION_TYPES") || (that.options.value.tag === "_NOT_CLASSIFIED" && this.tagId !== "_NOT_CLASSIFIED") || (that.options.value.tag === "_CLASSIFIED" && this.tagId !== "_CLASSIFIED")) {
                    this.fromManualRender = true;
                    if (this.tagId) {
                        this.ui.classificationSearchTree.jstree(true).deselect_node(this.tagId);
                    }
                    this.tagId = Globals[that.options.value.tag].guid;
                    this.ui.classificationSearchTree.jstree(true).select_node(this.tagId);
                } else if ((this.tagId !== "_ALL_CLASSIFICATION_TYPES" && that.options.value.tag !== this.tagId) || (this.tagId !== "_NOT_CLASSIFIED" && that.options.value.tag !== this.tagId) || (this.tagId !== "_CLASSIFIED" && that.options.value.tag !== this.tagId)) {
                    if ((that.options.value.tag.indexOf('*') != -1)) {
                        that.ui.classificationSearchTree.jstree(true).deselect_all();
                        that.ui.wildCardValue.val(that.options.value.tag);
                    }
                    var dataFound = this.classificationDefCollection.fullCollection.find(function(obj) {
                        return obj.get("name") === that.options.value.tag
                    });
                    if (dataFound) {
                        if ((this.tagId && this.tagId !== dataFound.get("guid")) || this.tagId === null) {
                            if (this.tagId) {
                                this.ui.classificationSearchTree.jstree(true).deselect_node(this.tagId);
                            }
                            this.fromManualRender = true;
                            this.tagId = dataFound.get("guid");
                            this.ui.classificationSearchTree.jstree(true).select_node(dataFound.get("guid"));
                        }
                    }
                }
            }
        },
        onNodeSelect: function(options) {
            if (this.options.value === undefined) {
                this.options.value = {};
            }
            Globals.fromRelationshipSearch = false;
            if (this.classificationTreeUpdate) {
                this.classificationTreeUpdate = false;
                return;
            }
            var name, type, selectedNodeId, that = this;
            that.ui.wildCardValue.val("");
            if (options) {
                name = options.node.original.name;
                selectedNodeId = options.node.id;
            } else {
                name = this.options.value.type || this.options.value.tag;
            }
            var tagValue = null,
                params = {
                    searchType: "basic",
                    dslChecked: false
                };
            if (this.options.value) {
                if (this.options.value.tag) {
                    params["tag"] = this.options.value.tag;
                }

                if (this.options.value.isCF) {
                    this.options.value.isCF = null;
                }
                if (this.options.value.tagFilters) {
                    params["tagFilters"] = null;
                }
            }

            if (that.tagId != selectedNodeId) {
                that.tagId = selectedNodeId;
                tagValue = name;
                params['tag'] = tagValue;
            } else {
                that.options.value.tag = that.tagId = params["tag"] = null;
                that.ui.classificationSearchTree.jstree(true).deselect_all(true);
                if (!that.options.value.type && !that.options.value.tag && !that.options.value.term && !that.options.value.query) {
                    var defaultUrl = '#!/search';
                    that.onClassificationUpdate(defaultUrl);
                    return;
                }
            }
            var searchParam = _.extend({}, this.options.value, params);
            if(options.node.original.type === 'ENTITY') {
                let type = searchParam.tag;
                searchParam.type = type;
                searchParam.tag = "";
                this.triggerBasicSearch(searchParam);
            }else {
                this.triggerSearch(searchParam);
            }
        },
        triggerBasicSearch: function(params, url) {
            var serachUrl = url ? url : '#!/enumMetaResult';
            Utils.setUrl({
                url: serachUrl,
                urlParams: params,
                mergeBrowserUrl: false,
                trigger: true,
                updateTabState: true
            });
        },
        triggerSearch: function(params, url) {
            var serachUrl = url ? url : '#!/enumResult';
            Utils.setUrl({
                url: serachUrl,
                urlParams: params,
                mergeBrowserUrl: false,
                trigger: true,
                updateTabState: true
            });
        },
        onClassificationUpdate: function(url) {
            Utils.setUrl({
                url: url,
                mergeBrowserUrl: false,
                trigger: true,
                updateTabState: true
            });
        },
        refresh: function(options) {
            var that = this,
                apiCount = 2,
                renderTree = function() {
                    if (apiCount === 0) {
                        that.classificationDefCollection.fullCollection.comparator = function(model) {
                            return model.get('name').toLowerCase();
                        };
                        that.classificationDefCollection.fullCollection.sort({ silent: true });
                        that.classificationTreeUpdate = true
                        that.ui.classificationSearchTree.jstree(true).refresh();
                        that.changeLoaderState(false);
                        that.ui.refreshTree.attr("disabled", false);
                    }
                };
            this.classificationDefCollection.fetch({
                silent: true,
                complete: function() {
                    --apiCount;
                    renderTree();
                }
            });
            this.metricCollection.fetch({
                complete: function() {
                    --apiCount;
                    that.entityCountObj = _.first(that.metricCollection.toJSON());
                    renderTree();
                }
            });
        },
        getClassificationTree: function(options) {
            var that = this,
                collection = (options && options.collection) || this.classificationDefCollection.fullCollection,
                listOfParents = [],
                listWithEmptyParents = [],
                listWithEmptyParentsFlatView = [],
                flatViewList = [],
                isSelectedChild = false,
                openClassificationNodesState = function(treeDate) {
                    _.each(treeDate, function(model) {
                        model.state['opened'] = true;
                    })
                },
                generateNode = function(nodeOptions, options, isChild) {
                    var nodeStructure = {
                        text: _.escape(nodeOptions.name),
                        name: _.escape(nodeOptions.name),
                        children: that.isGroupView ? getChildren({
                            children: isChild ? nodeOptions.model.subTypes : nodeOptions.model.get("subTypes"),
                            parent: isChild ? options.parentName : nodeOptions.name
                        }) : null,
                        type: isChild ? nodeOptions.children.get("category") : nodeOptions.model.get("category"),
                        id: isChild ? nodeOptions.children.get("guid") : nodeOptions.model.get("guid"),
                        icon: "fa fa-tag",
                        gType: "Classification",
                    }
                    if(nodeStructure.name === '基础数据元') {
                        console.log('nodeStructure---', nodeStructure)
                    }
                    return nodeStructure;
                },

                getChildren = function(options) {
                    var children = options.children,
                        data = [],
                        dataWithoutEmptyTag = [];
                    if (children && children.length) {
                        _.each(children, function(name) {
                            var child = collection.find({
                                name: name
                            });
                            var tagEntityCount = that.entityCountObj ? that.entityCountObj.tag.tagEntities[name] : null;
                            var tagname = tagEntityCount ? name + " (" + _.numberFormatWithComma(tagEntityCount) + ")" : name;

                            if (that.options.value) {
                                isSelectedChild = that.options.value.tag ? that.options.value.tag == name : false;
                                if (!that.tagId) {
                                    that.tagId = isSelectedChild ? child.get("guid") : null;
                                }
                            }
                            if (child) {
                                var modelJSON = child.toJSON();
                                var nodeDetails = {
                                        name: _.escape(name),
                                        model: modelJSON,
                                        children: child,
                                        isSelectedChild: isSelectedChild
                                    },
                                    nodeProperties = {
                                        parent: options.parentName,
                                        text: _.escape(tagname),
                                        guid: child.get("guid"),
                                        model: child,
                                        state: { selected: isSelectedChild, opened: true }
                                    },
                                    isChild = true,
                                    getNodeDetails = generateNode(nodeDetails, options, isChild),
                                    classificationNode = (_.extend(getNodeDetails, nodeProperties));
                                if(classificationNode.name === '基础数据元') { // TODO: 判断条件可能要修改
                                    var entityTree = that.getEntityTree();
                                    entityTree.forEach(item => {
                                        if(item.name === 'hive') {
                                            classificationNode.children = [{...item}];
                                        }
                                    })
                                }
                                data.push(classificationNode);
                                if (that.isEmptyClassification) {
                                    var isTagEntityCount = _.isNaN(tagEntityCount) ? 0 : tagEntityCount;
                                    if (isTagEntityCount) {
                                        dataWithoutEmptyTag.push(classificationNode);
                                    }
                                }
                            }
                        });
                    }
                    var tagData = that.isEmptyClassification ? dataWithoutEmptyTag : data;
                    return tagData;
                }
            collection.each(function(model) {
                var modelJSON = model.toJSON()
                if(modelJSON.options && modelJSON.options.app_catalog_ === 'app_catalog_standard') {
                    var name = modelJSON.name,
                        tagEntityCount = that.entityCountObj ? that.entityCountObj.tag.tagEntities[name] : null,
                        tagname = tagEntityCount ? name + " (" + _.numberFormatWithComma(tagEntityCount) + ")" : name,
                        isSelectedChildted = false,
                        isSelected = false;
                    if (that.options.value) {
                        isSelected = that.options.value.tag ? that.options.value.tag == name : false;
                        if (!that.tagId) {
                            that.tagId = isSelected ? model.get("guid") : null;
                        }
                    }
                    var parentNodeDetails = {
                            name: _.escape(name),
                            model: model,
                            isSelectedChild: isSelectedChild
                        },
                        parentNodeProperties = {
                            text: _.escape(tagname),
                            state: {
                                disabled: tagEntityCount == 0 ? true : false,
                                selected: isSelected,
                                opened: true
                            }
                        },
                        isChild = false,
                        getParentNodeDetails,
                        classificationParentNode, getParentFlatView, classificationParentFlatView;
                    if (modelJSON.superTypes.length == 0) {
                        getParentNodeDetails = generateNode(parentNodeDetails, model, isChild);
                        classificationParentNode = (_.extend(getParentNodeDetails, parentNodeProperties));
                        listOfParents.push(classificationParentNode);
                    }
                    getParentFlatView = generateNode(parentNodeDetails, model);
                    classificationParentFlatView = (_.extend(getParentFlatView, parentNodeProperties));
                    flatViewList.push(classificationParentFlatView);
                    if (that.isEmptyClassification) {
                        var isTagEntityCount = _.isNaN(tagEntityCount) ? 0 : tagEntityCount;
                        if (isTagEntityCount) {
                            if (modelJSON.superTypes.length == 0) {
                                listWithEmptyParents.push(classificationParentNode);
                            }
                            listWithEmptyParentsFlatView.push(classificationParentFlatView);
                        }
    
                    }
                }
            });
            var classificationTreeData = that.isEmptyClassification ? listWithEmptyParents : listOfParents;
            var flatViewClassificaton = that.isEmptyClassification ? listWithEmptyParentsFlatView : flatViewList;
            var classificationData = that.isGroupView ?
                that.pushRootClassificationToJstree.call(that, classificationTreeData) :
                that.pushRootClassificationToJstree.call(that, flatViewClassificaton);
            var list = classificationData.filter(item => {
                return !['_ALL_CLASSIFICATION_TYPES', '_CLASSIFIED', '_NOT_CLASSIFIED'].includes(item.name)
            })
            return list;
        },
        // TODO: 实体tree
        getEntityTree: function() {
            var that = this,
                serviceTypeArr = [],
                serviceTypeWithEmptyEntity = [],
                type = "ENTITY",
                entityTreeContainer = this.ui.entitytreeStructure,
                generateTreeData = function(data) {
                    that.typeHeaders.fullCollection.each(function(model) {
                        var totalCount = 0,
                            serviceType = model.toJSON().serviceType,
                            isSelected = false,
                            categoryType = model.toJSON().category,
                            generateServiceTypeArr = function(entityCountArr, serviceType, children, entityCount) {
                                if (that.isGroupView) {
                                    if (entityCountArr[serviceType]) {
                                        entityCountArr[serviceType]["children"].push(children);
                                        entityCountArr[serviceType]["totalCounter"] = +entityCountArr[serviceType]["totalCounter"] + entityCount;
                                    } else {
                                        entityCountArr[serviceType] = [];
                                        entityCountArr[serviceType]["name"] = serviceType;
                                        entityCountArr[serviceType]["children"] = [];
                                        entityCountArr[serviceType]["children"].push(children);
                                        entityCountArr[serviceType]["totalCounter"] = entityCount;
                                    }
                                } else {
                                    entityCountArr.push(children)
                                }
                            };
                        if (!serviceType) {
                            serviceType = "other_types";
                        }
                        if (categoryType == "ENTITY") {
                            var entityCount = that.entityCountObj ?
                                (that.entityCountObj.entity.entityActive[model.get("name")] || 0) +
                                (that.entityCountObj.entity.entityDeleted[model.get("name")] || 0) : 0,
                                modelname = entityCount ? model.get("name") + " (" + _.numberFormatWithComma(entityCount) + ")" : model.get("name");
                            if (that.options.value) {
                                isSelected = that.options.value.type ? that.options.value.type == model.get("name") : false;
                                if (!that.typeId) {
                                    that.typeId = isSelected ? model.get("guid") : null;
                                }
                            }

                            var children = {
                                text: _.escape(modelname),
                                name: model.get("name"),
                                type: model.get("category"),
                                gType: "Entity",
                                guid: model.get("guid"),
                                id: model.get("guid"),
                                model: model,
                                parent: "#",
                                icon: "fa fa-file-o",
                                state: {
                                    disabled: false,
                                    selected: isSelected
                                },
                            };

                            entityCount = _.isNaN(entityCount) ? 0 : entityCount;
                            generateServiceTypeArr(serviceTypeArr, serviceType, children, entityCount);
                            if (entityCount) {
                                generateServiceTypeArr(serviceTypeWithEmptyEntity, serviceType, children, entityCount);
                            }
                        }
                    });

                    var serviceTypeData = that.isEmptyServicetype ? serviceTypeWithEmptyEntity : serviceTypeArr;
                    if (that.isGroupView) {
                        var serviceDataWithRootEntity = pushRootEntityToJstree.call(that, 'group', serviceTypeData);
                        return getParentsData.call(that, serviceDataWithRootEntity);
                    } else {
                        return pushRootEntityToJstree.call(that, null, serviceTypeData);
                    }
                },
                pushRootEntityToJstree = function(type, data) {
                    var rootEntity = Globals[Enums.addOnEntities[0]];
                    var isSelected = this.options.value && this.options.value.type ? this.options.value.type == rootEntity.name : false;
                    var rootEntityNode = {
                        text: _.escape(rootEntity.name),
                        name: rootEntity.name,
                        type: rootEntity.category,
                        gType: "Entity",
                        guid: rootEntity.guid,
                        id: rootEntity.guid,
                        model: rootEntity,
                        parent: "#",
                        icon: "fa fa-file-o",
                        state: {
                            // disabled: entityCount == 0 ? true : false,
                            selected: isSelected
                        },
                    };
                    if (type === 'group') {
                        if (data.other_types === undefined) {
                            data.other_types = { name: "other_types", children: [] };
                        }
                        data.other_types.children.push(rootEntityNode);
                    } else {
                        data.push(rootEntityNode);
                    }
                    return data;
                },
                getParentsData = function(data) {
                    var parents = Object.keys(data),
                        treeData = [],
                        withoutEmptyServiceType = [],
                        treeCoreData = null,
                        openEntityNodesState = function(treeDate) {
                            if (treeDate.length == 1) {
                                _.each(treeDate, function(model) {
                                    model.state = { opened: true }
                                })
                            }
                        },
                        generateNode = function(children) {
                            var nodeStructure = {
                                text: "Service Types",
                                children: children,
                                icon: "fa fa-folder-o",
                                type: "ENTITY",
                                state: { opened: true },
                                parent: "#"
                            }
                            return nodeStructure;
                        };
                    for (var i = 0; i < parents.length; i++) {

                        var checkEmptyServiceType = false,
                            getParrent = data[parents[i]],
                            totalCounter = getParrent.totalCounter,
                            textName = getParrent.totalCounter ? parents[i] + " (" + _.numberFormatWithComma(totalCounter) + ")" : parents[i],
                            parent = {
                                icon: "fa fa-folder-o",
                                type: type,
                                gType: "ServiceType",
                                children: getParrent.children,
                                text: _.escape(textName),
                                name: data[parents[i]].name,
                                id: i,
                                state: { opened: true }
                            };
                        if (that.isEmptyServicetype) {
                            if (data[parents[i]].totalCounter == 0) {
                                checkEmptyServiceType = true;
                            }
                        }
                        treeData.push(parent);
                        if (!checkEmptyServiceType) {
                            withoutEmptyServiceType.push(parent);
                        }
                    }
                    that.entityTreeData = {
                        withoutEmptyServiceTypeEntity: generateNode(withoutEmptyServiceType),
                        withEmptyServiceTypeEntity: generateNode(treeData)
                    };

                    treeCoreData = that.isEmptyServicetype ? withoutEmptyServiceType : treeData;

                    openEntityNodesState(treeCoreData);
                    return treeCoreData;
                };
            return generateTreeData();
        },
        pushRootClassificationToJstree: function(data) {
            var that = this;
            _.each(Enums.addOnClassification, function(addOnClassification) {
                var rootClassification = Globals[addOnClassification],
                    isSelected = (that.options.value && that.options.value.tag) ? that.options.value.tag == rootClassification.name : false,
                    rootClassificationNode = {
                        text: _.escape(rootClassification.name),
                        name: rootClassification.name,
                        type: rootClassification.category,
                        gType: "Classification",
                        guid: rootClassification.guid,
                        id: rootClassification.guid,
                        model: rootClassification,
                        children: [],
                        icon: "fa fa-tag",
                        state: {
                            selected: isSelected
                        }
                    }
                data.push(rootClassificationNode);
            });
            return data;
        },
        generateSearchTree: function(options) {
            var $el = options && options.$el,
                type = options && options.type,
                that = this,
                getEntityTreeConfig = function(opt) {
                    return {
                        plugins: ["search", "core", "sort", "conditionalselect", "changed", "wholerow", "node_customize"],
                        conditionalselect: function(node) {
                            var type = node.original.type;
                            if (type == "ENTITY" || type == "GLOSSARY") {
                                if (node.children.length || type == "GLOSSARY") {
                                    return false;
                                } else {
                                    return true;
                                }
                            } else {
                                return true;
                            }
                        },
                        state: { opened: true },
                        search: {
                            show_only_matches: true,
                            case_sensitive: false
                        },
                        node_customize: {
                            default: function(el) {
                                var aTag = $(el).find(">a.jstree-anchor"),
                                    nameText = aTag.text();
                                aTag.append("<span class='tree-tooltip'>" + nameText + "</span>");
                                $(el).append('<div class="tools"><i class="fa fa-ellipsis-h classificationPopover2" rel="popover" data-name=' + nameText + '></i></div>');
                            }
                        },
                        core: {
                            multiple: false,
                            data: function(node, cb) {
                                if (node.id === "#") {
                                    cb(that.getClassificationTree());
                                }
                            }
                        }
                    };
                };

            $el.jstree(
                getEntityTreeConfig({
                    type: ""
                })
            ).on("open_node.jstree", function(e, data) {
                that.isTreeOpen = true;
            }).on("select_node.jstree", function(e, data) {
                if (that.fromManualRender !== true) {
                    that.onNodeSelect(data);
                } else {
                    that.fromManualRender = false;
                }
            }).on("search.jstree", function(nodes, str, res) {
                if (str.nodes.length === 0) {
                    $el.jstree(true).hide_all();
                    $el.parents(".panel").addClass("hide");
                } else {
                    $el.parents(".panel").removeClass("hide");
                }
            }).on("hover_node.jstree", function(nodes, str, res) {
                var aTag = that.$("#" + str.node.a_attr.id),
                    tagOffset = aTag.find(">.jstree-icon").offset();
                that.$(".tree-tooltip").removeClass("show");
                setTimeout(function() {
                    if (aTag.hasClass("jstree-hovered") && tagOffset.top && tagOffset.left) {
                        aTag.find(">span.tree-tooltip").css({
                            top: "calc(" + tagOffset.top + "px - 45px)",
                            left: "24px"
                        }).addClass("show");
                    }
                }, 1200);
            }).on("dehover_node.jstree", function(nodes, str, res) {
                that.$(".tree-tooltip").removeClass("show");
            });
        },

        onClickCreateTag: function(tagName) {
            var that = this;
            require(["views/tag/CreateTagLayoutView2", "modules/Modal"], function(CreateTagLayoutView, Modal) {
                var view = new CreateTagLayoutView({ tagCollection: that.options.classificationDefCollection, enumDefCollection: enumDefCollection, selectedTag: tagName }),
                    modal = new Modal({
                        title: "Create a new classification",
                        content: view,
                        cancelText: "Cancel",
                        okCloses: false,
                        okText: "Create",
                        allowCancel: true
                    }).open();
                modal.$el.find("button.ok").attr("disabled", "true");
                view.ui.tagName.on('keyup input', function(e) {
                    $(view.ui.description).trumbowyg('html', _.escape($(this).val()).replace(/\s+/g, ' '));
                });
                view.ui.description.on('input keydown', function(e) {
                    $(this).val($(this).val().replace(/\s+/g, ' '));
                });
                modal.on("shownModal", function() {
                    view.ui.parentTag.select2({
                        multiple: true,
                        placeholder: "Search Classification",
                        allowClear: true
                    });
                });
                modal.on("ok", function() {
                    modal.$el.find("button.ok").showButtonLoader();
                    that.onCreateTagButton(view, modal);
                });
                modal.on("closeModal", function() {
                    modal.trigger("cancel");
                });
            });
        },
        onClickCreateYuan: function(tagName) {
            var that = this;
            require(["views/tag/CreateYuanLayoutView", "modules/Modal"], function(CreateTagLayoutView, Modal) {
                var view = new CreateTagLayoutView({ tagCollection: that.options.classificationDefCollection, enumDefCollection: enumDefCollection, selectedTag: tagName }),
                    modal = new Modal({
                        title: "创建元数据",
                        content: view,
                        cancelText: "取消",
                        okCloses: false,
                        okText: "创建",
                        allowCancel: true
                    }).open();
                modal.$el.find("button.ok").attr("disabled", "true");
                view.ui.tagName.on('keyup input', function(e) {
                    $(view.ui.description).trumbowyg('html', _.escape($(this).val()).replace(/\s+/g, ' '));
                });
                view.ui.description.on('input keydown', function(e) {
                    $(this).val($(this).val().replace(/\s+/g, ' '));
                });
                modal.on("shownModal", function() {
                    view.ui.parentTag.select2({
                        multiple: true,
                        placeholder: "Search Classification",
                        allowClear: true
                    });
                });
                modal.on("ok", function() {
                    modal.$el.find("button.ok").showButtonLoader();
                    that.onCreateYuanButton(view, modal);
                });
                modal.on("closeModal", function() {
                    modal.trigger("cancel");
                });
            });
        },
        onClickCreateZidian: function(tagName) {
            var that = this;
            require(["views/tag/CreateZidianLayoutView", "modules/Modal"], function(CreateTagLayoutView, Modal) {
                var view = new CreateTagLayoutView({ tagCollection: that.options.classificationDefCollection, enumDefCollection: enumDefCollection, selectedTag: tagName }),
                    modal = new Modal({
                        title: "创建字典",
                        content: view,
                        cancelText: "取消",
                        okCloses: false,
                        okText: "创建",
                        allowCancel: true
                    }).open();
                modal.$el.find("button.ok").attr("disabled", "true");
                view.ui.tagName.on('keyup input', function(e) {
                    $(view.ui.description).trumbowyg('html', _.escape($(this).val()).replace(/\s+/g, ' '));
                });
                view.ui.description.on('input keydown', function(e) {
                    $(this).val($(this).val().replace(/\s+/g, ' '));
                });
                modal.on("shownModal", function() {
                    view.ui.parentTag.select2({
                        multiple: true,
                        placeholder: "Search Classification",
                        allowClear: true
                    });
                });
                modal.on("ok", function() {
                    modal.$el.find("button.ok").showButtonLoader();
                    that.onCreateZidianButton(view, modal);
                });
                modal.on("closeModal", function() {
                    modal.trigger("cancel");
                });
            });
        },
        onCreateTagButton: function(ref, modal) {
            var that = this;
            var validate = true;
            if (modal.$el.find(".attributeInput").length > 0) {
                modal.$el.find(".attributeInput").each(function() {
                    if ($(this).val() === "") {
                        $(this).css("borderColor", "red");
                        validate = false;
                    }
                });
            }
            modal.$el.find(".attributeInput").keyup(function() {
                $(this).css("borderColor", "#e8e9ee");
                modal.$el.find("button.ok").removeAttr("disabled");
            });
            if (!validate) {
                Utils.notifyInfo({
                    content: "Please fill the attributes or delete the input box"
                });
                modal.$el.find("button.ok").hideButtonLoader();
                return;
            }

            var name = ref.ui.tagName.val(),
                description = Utils.sanitizeHtmlContent({ data: ref.ui.description.val() }),
                superTypes = [],
                parentTagVal = ref.ui.parentTag.val();
            if (parentTagVal && parentTagVal.length) {
                superTypes = parentTagVal;
            }
            var attributeObj = ref.collection.toJSON();
            if (ref.collection.length === 1 && ref.collection.first().get("name") === "") {
                attributeObj = [];
            }

            if (attributeObj.length) {
                var superTypesAttributes = [];
                _.each(superTypes, function(name) {
                    var parentTags = that.options.classificationDefCollection.fullCollection.findWhere({ name: name });
                    superTypesAttributes = superTypesAttributes.concat(parentTags.get("attributeDefs"));
                });

                var duplicateAttributeList = [];
                _.each(attributeObj, function(obj) {
                    var duplicateCheck = _.find(superTypesAttributes, function(activeTagObj) {
                        return activeTagObj.name.toLowerCase() === obj.name.toLowerCase();
                    });
                    if (duplicateCheck) {
                        duplicateAttributeList.push(_.escape(obj.name));
                    }
                });
                var notifyObj = {
                    modal: true,
                    confirm: {
                        confirm: true,
                        buttons: [{
                                text: "Ok",
                                addClass: "btn-atlas btn-md",
                                click: function(notice) {
                                    notice.remove();
                                }
                            },
                            null
                        ]
                    }
                };
                if (duplicateAttributeList.length) {
                    if (duplicateAttributeList.length < 2) {
                        var text = "Attribute <b>" + duplicateAttributeList.join(",") + "</b> is duplicate !";
                    } else {
                        if (attributeObj.length > duplicateAttributeList.length) {
                            var text = "Attributes: <b>" + duplicateAttributeList.join(",") + "</b> are duplicate !";
                        } else {
                            var text = "All attributes are duplicate !";
                        }
                    }
                    notifyObj["text"] = text;
                    Utils.notifyConfirm(notifyObj);
                    modal.$el.find("button.ok").hideButtonLoader();
                    return false;
                }
            }
            this.json = {
                classificationDefs: [{
                    name: name.trim(),
                    description: description.trim(),
                    superTypes: superTypes.length ? superTypes : [],
                    attributeDefs: attributeObj,
                    options: {
                        "app_catalog_" : "app_catalog_standard"
                    },
                }],
                entityDefs: [],
                enumDefs: [],
                structDefs: []
            };
            new this.options.classificationDefCollection.model().set(this.json).save(null, {
                success: function(model, response) {
                    var classificationDefs = model.get("classificationDefs");
                    that.createTag = true;
                    if (classificationDefs[0]) {
                        _.each(classificationDefs[0].superTypes, function(superType) {
                            var superTypeModel = that.options.classificationDefCollection.fullCollection.find({ name: superType }),
                                subTypes = [];
                            if (superTypeModel) {
                                subTypes = superTypeModel.get("subTypes");
                                subTypes.push(classificationDefs[0].name);
                                superTypeModel.set({ subTypes: _.uniq(subTypes) });
                            }
                        });
                    }
                    that.options.classificationDefCollection.fullCollection.add(classificationDefs);
                    Utils.notifySuccess({
                        content: "Classification " + name + Messages.getAbbreviationMsg(false, 'addSuccessMessage')
                    });
                    modal.trigger("cancel");
                    modal.$el.find("button.ok").showButtonLoader();
                    that.typeHeaders.fetch({ reset: true });
                },
                complete: function() {
                    modal.$el.find("button.ok").hideButtonLoader();
                }
            });
        },
        onCreateZidianButton: function(ref, modal) {
            var that = this;
            var validate = true;
            if (modal.$el.find(".attributeInput").length > 0) {
                modal.$el.find(".attributeInput").each(function() {
                    if ($(this).val() === "") {
                        $(this).css("borderColor", "red");
                        validate = false;
                    }
                });
            }
            modal.$el.find(".attributeInput").keyup(function() {
                $(this).css("borderColor", "#e8e9ee");
                modal.$el.find("button.ok").removeAttr("disabled");
            });
            if (!validate) {
                Utils.notifyInfo({
                    content: "Please fill the attributes or delete the input box"
                });
                modal.$el.find("button.ok").hideButtonLoader();
                return;
            }

            var name = ref.ui.tagName.val(),
                description = Utils.sanitizeHtmlContent({ data: ref.ui.description.val() }),
                superTypes = [],
                nameCN = ref.ui.nameCN.val(),   // 中文名称
                catalog = ref.ui.catalog.val(), // 字典目录
                version = ref.ui.version.val(), // 版本号
                parentTagVal = ref.ui.parentTag.val();
            var showAttribute = ref.ui.showAttribute;
            if (parentTagVal && parentTagVal.length) {
                superTypes = parentTagVal;
            }
            var attributeObj = ref.collection.toJSON();
            if (ref.collection.length === 1 && ref.collection.first().get("name") === "") {
                attributeObj = [];
            }

            if (attributeObj.length) {
                var superTypesAttributes = [];
                _.each(superTypes, function(name) {
                    var parentTags = that.options.classificationDefCollection.fullCollection.findWhere({ name: name });
                    superTypesAttributes = superTypesAttributes.concat(parentTags.get("attributeDefs"));
                });

                var duplicateAttributeList = [];
                _.each(attributeObj, function(obj) {
                    var duplicateCheck = _.find(superTypesAttributes, function(activeTagObj) {
                        return activeTagObj.name.toLowerCase() === obj.name.toLowerCase();
                    });
                    if (duplicateCheck) {
                        duplicateAttributeList.push(_.escape(obj.name));
                    }
                });
                var notifyObj = {
                    modal: true,
                    confirm: {
                        confirm: true,
                        buttons: [{
                                text: "Ok",
                                addClass: "btn-atlas btn-md",
                                click: function(notice) {
                                    notice.remove();
                                }
                            },
                            null
                        ]
                    }
                };
                if (duplicateAttributeList.length) {
                    if (duplicateAttributeList.length < 2) {
                        var text = "Attribute <b>" + duplicateAttributeList.join(",") + "</b> is duplicate !";
                    } else {
                        if (attributeObj.length > duplicateAttributeList.length) {
                            var text = "Attributes: <b>" + duplicateAttributeList.join(",") + "</b> are duplicate !";
                        } else {
                            var text = "All attributes are duplicate !";
                        }
                    }
                    notifyObj["text"] = text;
                    Utils.notifyConfirm(notifyObj);
                    modal.$el.find("button.ok").hideButtonLoader();
                    return false;
                }
            }
            // this.json = {
            //     classificationDefs: [{
            //         name: name.trim(),
            //         description: description.trim(),
            //         superTypes: superTypes.length ? superTypes : [],
            //         attributeDefs: attributeObj,
            //         options: {
            //             "app_catalog_" : "app_catalog_standard",
            //             nameCN: nameCN,
            //             version: version,
            //             dict_catalog: catalog,
            //             dict_status: ''
            //         },
            //     }],
            //     entityDefs: [],
            //     enumDefs: [],
            //     structDefs: []
            // };

            var items = showAttribute.find('.item')
            console.log('items===', items);
            var elementDefs = [];
            items.each((inx, item) => {
                var key = $(item).find('.key').val()
                var value = $(item).find('.value').val()
                var obj ={
                    "description": value,
                    "ordinal": inx + 1,
                    "value": key
                }
                elementDefs.push(obj);
            })
            this.json = {
                "businessMetadataDefs": [],
                "classificationDefs": [],
                "entityDefs": [],
                "enumDefs": [
                    {
                        "elementDefs": elementDefs,
                        "category": "ENUM",
                        "description": description.trim(),
                        "name": name.trim(),
                        "options" : {
                            "app_catalog_" : "app_catalog_standard",
                            "dict_catalog_" : superTypes[0] || "",
                            "name_CN": nameCN,
                            "dict_status": "string"
                        },
                        "serviceType": "base_standard",
                        "typeVersion": "V1.0",
                        "version": 1  
                    }
                ],
                "relationshipDefs": [],
                "structDefs": []
            }

            console.log('json----', this.json, attributeObj);
            var apiObj = {
                sort: false,
                slient: true,
                reset: true,
                success: function(model, response) {
                    Utils.notifySuccess({
                        content: "添加成功"
                    });
                },
                complete: function(model, status) {
                    modal.close();
                }
            }

            $.extend(apiObj, { contentType: "application/json", dataType: "json", data: JSON.stringify(this.json) });

            this.businessMetadataDefCollection.constructor.nonCrudOperation.call(this, UrlLinks.typedefsUrl().defs, "POST", apiObj);

            return; // TODO: retuen

            new this.options.classificationDefCollection.model().set(this.json).save(null, {
                success: function(model, response) {
                    var classificationDefs = model.get("classificationDefs");
                    that.createTag = true;
                    if (classificationDefs[0]) {
                        _.each(classificationDefs[0].superTypes, function(superType) {
                            var superTypeModel = that.options.classificationDefCollection.fullCollection.find({ name: superType }),
                                subTypes = [];
                            if (superTypeModel) {
                                subTypes = superTypeModel.get("subTypes");
                                subTypes.push(classificationDefs[0].name);
                                superTypeModel.set({ subTypes: _.uniq(subTypes) });
                            }
                        });
                    }
                    that.options.classificationDefCollection.fullCollection.add(classificationDefs);
                    Utils.notifySuccess({
                        content: "Classification " + name + Messages.getAbbreviationMsg(false, 'addSuccessMessage')
                    });
                    modal.trigger("cancel");
                    modal.$el.find("button.ok").showButtonLoader();
                    that.typeHeaders.fetch({ reset: true });
                },
                complete: function() {
                    modal.$el.find("button.ok").hideButtonLoader();
                }
            });
        },
        onCreateYuanButton: function(ref, modal) {
            var that = this;
            var validate = true;
            if (modal.$el.find(".attributeInput").length > 0) {
                modal.$el.find(".attributeInput").each(function() {
                    if ($(this).val() === "") {
                        $(this).css("borderColor", "red");
                        validate = false;
                    }
                });
            }
            modal.$el.find(".attributeInput").keyup(function() {
                $(this).css("borderColor", "#e8e9ee");
                modal.$el.find("button.ok").removeAttr("disabled");
            });
            if (!validate) {
                Utils.notifyInfo({
                    content: "Please fill the attributes or delete the input box"
                });
                modal.$el.find("button.ok").hideButtonLoader();
                return;
            }

            var yuanName = ref.ui.tagName.val(), // 数据元中文名称
                xdName = ref.ui.xdName.val(),    // 限定名称
                changdu = ref.ui.changdu.val(),  // 长度
                yueshu = ref.ui.yueshu.val(),    // 约束
                zhikongjian = ref.ui.zhikongjian.val(), // 值空间
                jieshijuli = ref.ui.jieshijuli.val(),   // 解释举例
                yinyongno = ref.ui.yinyongno.val(),     // 引用编号
                yuanType = ref.ui.yuanType.val(),       // 类型
                yuanTemplate = ref.ui.yuanTemplate.val(), // 所属模板
                name = ref.ui.tagName.val(),
                // description = Utils.sanitizeHtmlContent({ data: ref.ui.description.val() }),
                superTypes = [],
                nameCN = ref.ui.nameCN.val(),   // 中文名称
                catalog = ref.ui.catalog.val(), // 字典目录
                version = ref.ui.version.val(), // 版本号
                parentTagVal = ref.ui.parentTag.val();
            console.log('formjson---', {
                yuanName,
                xdName,
                changdu,
                yueshu,
                zhikongjian,
                jieshijuli,
                yinyongno,
                yuanType,
                yuanTemplate,
            })
            this.json = {
                "businessMetadataDefs": [],
                "classificationDefs": [],
                "entityDefs": [],
                "enumDefs": [
                    {
                        "elementDefs": elementDefs,
                        "category": "ENUM",
                        "description": description.trim(),
                        "name": name.trim(),
                        "options" : {
                            "app_catalog_" : "app_catalog_standard",
                            "dict_catalog_" : superTypes[0] || "",
                            "name_CN": nameCN,
                            "dict_status": "string"
                        },
                        "serviceType": "base_standard",
                        "typeVersion": "V1.0",
                        "version": 1  
                    }
                ],
                "relationshipDefs": [],
                "structDefs": []
            }

            console.log('json----', this.json, attributeObj);
            var apiObj = {
                sort: false,
                slient: true,
                reset: true,
                success: function(model, response) {
                    Utils.notifySuccess({
                        content: "添加成功"
                    });
                },
                complete: function(model, status) {
                    modal.close();
                }
            }

            $.extend(apiObj, { contentType: "application/json", dataType: "json", data: JSON.stringify(this.json) });

            this.businessMetadataDefCollection.constructor.nonCrudOperation.call(this, UrlLinks.typedefsUrl().defs, "POST", apiObj);


            return;


            new this.options.classificationDefCollection.model().set(this.json).save(null, {
                success: function(model, response) {
                    var classificationDefs = model.get("classificationDefs");
                    that.createTag = true;
                    if (classificationDefs[0]) {
                        _.each(classificationDefs[0].superTypes, function(superType) {
                            var superTypeModel = that.options.classificationDefCollection.fullCollection.find({ name: superType }),
                                subTypes = [];
                            if (superTypeModel) {
                                subTypes = superTypeModel.get("subTypes");
                                subTypes.push(classificationDefs[0].name);
                                superTypeModel.set({ subTypes: _.uniq(subTypes) });
                            }
                        });
                    }
                    that.options.classificationDefCollection.fullCollection.add(classificationDefs);
                    Utils.notifySuccess({
                        content: "Classification " + name + Messages.getAbbreviationMsg(false, 'addSuccessMessage')
                    });
                    modal.trigger("cancel");
                    modal.$el.find("button.ok").showButtonLoader();
                    that.typeHeaders.fetch({ reset: true });
                },
                complete: function() {
                    modal.$el.find("button.ok").hideButtonLoader();
                }
            });
        },
        onClickCreateTag2Classification: function(e) {
            var selectedNode = this.ui.classificationSearchTree.jstree("get_selected", true);
            if (selectedNode && selectedNode[0]) {
                this.onClickCreateTag(selectedNode[0].original.name);
            }
        },
        onClickCreateYuanClassification: function(e) {
            var selectedNode = this.ui.classificationSearchTree.jstree("get_selected", true);
            if (selectedNode && selectedNode[0]) {
                this.onClickCreateYuan(selectedNode[0].original.name);
            }
        },
        onClickCreateZidianClassification: function(e) {
            var selectedNode = this.ui.classificationSearchTree.jstree("get_selected", true);
            if (selectedNode && selectedNode[0]) {
                this.onClickCreateZidian(selectedNode[0].original.name);
            }
        },
        onViewEdit2Classification: function() {
            var selectedNode = this.ui.classificationSearchTree.jstree("get_selected", true);
            if (selectedNode && selectedNode[0]) {
                var url = "#!/tag/tagAttribute/" + selectedNode[0].original.name + "?tag=" + selectedNode[0].original.name;
                this.onClassificationUpdate(url);
            }
        },
        onDelete2Classification: function() {
            var that = this,
                notifyObj = {
                    modal: true,
                    ok: function(obj) {
                        that.notificationModal = obj;
                        obj.showButtonLoader();
                        that.onNotifyOk();
                    },
                    okCloses: false,
                    cancel: function(argument) {}
                };
            var text = "是否确定删除该标准";
            notifyObj["text"] = text;
            Utils.notifyConfirm(notifyObj);
        },
        onSelectedSearch2Classification: function() {
            var params = {
                searchType: "basic",
                dslChecked: false,
                tag: this.options.value.tag
            };
            this.triggerSearch(params);
        },
        onNotifyOk: function(data) {
            var that = this;
            if (this.tagId) {
                var deleteTagData = this.classificationDefCollection.fullCollection.findWhere({ guid: this.tagId });
                if (deleteTagData) {
                    var tagName = deleteTagData.get("name"),
                        superTypeOfDeleteTag = deleteTagData.get('superTypes'),
                        superTypeObj = superTypeOfDeleteTag ? this.classificationDefCollection.fullCollection.findWhere({ name: superTypeOfDeleteTag[0] }) : null;
                    deleteTagData.deleteTag({
                        typeName: tagName,
                        success: function() {
                            Utils.notifySuccess({
                                content: "Classification " + tagName + Messages.getAbbreviationMsg(false, 'deleteSuccessMessage')
                            });
                            //delete current classification from subTypes list of parent classification if any
                            if (superTypeObj) {
                                var parentSubTypeUpdate = _.reject(superTypeObj.get('subTypes'), function(subtype) {
                                    return subtype === tagName;
                                });
                                superTypeObj.set('subTypes', parentSubTypeUpdate);
                            }
                            // if deleted tag is prviously searched then remove that tag url from save state of tab.
                            var searchUrl = Globals.saveApplicationState.tabState.searchUrl,
                                urlObj = Utils.getUrlState.getQueryParams(searchUrl) ? Utils.getUrlState.getQueryParams(searchUrl) : Utils.getUrlState.getQueryParams();
                            // that.classificationDefCollection.fullCollection && that.classificationDefCollection.fullCollection.remove && that.classificationDefCollection.fullCollection.remove(deleteTagData);
                            // to update tag list of search tab fetch typeHeaders.
                            //that.typeHeaders.fetch({ reset: true });
                            that.ui.classificationSearchTree.jstree(true).refresh();
                            delete urlObj.tag;
                            var url = urlObj.type || urlObj.term || urlObj.query ? "#!/search/searchResult" : "#!/search"
                            that.triggerSearch(urlObj, url);
                        },
                        complete: function() {
                            that.notificationModal.hideButtonLoader();
                            that.notificationModal.remove();
                        }
                    });
                } else {
                    Utils.notifyError({
                        content: Messages.defaultErrorMessage
                    });
                }
            }
        }

    });
    return ClassificationTreeLayoutView;
});