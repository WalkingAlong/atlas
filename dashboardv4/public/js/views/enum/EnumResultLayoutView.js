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
    'hbs!tmpl/enum/EnumResultLayoutView_tmpl',
    'collection/VEntityList',
    'models/VSearch',
    'utils/Utils',
    'utils/Enums',
    'utils/UrlLinks',
    'utils/CommonViewFunction'
], function(require, Backbone, AdministratorLayoutView_tmpl, VEntityList, VSearch, Utils, Enums, UrlLinks, CommonViewFunction) {
    'use strict';

    var AdministratorLayoutView = Backbone.Marionette.LayoutView.extend(
        /** @lends AuditTableLayoutView */
        {
            _viewName: 'AdministratorLayoutView',

            template: AdministratorLayoutView_tmpl,
            templateHelpers: function() {
                return {
                    tag: this.tag,
                }
            },
            /** Layout sub regions */
            regions: {
                RBusinessMetadataTableLayoutView: "#r_enumResultTableLayoutView",
            },

            /** ui selector cache */
            ui: {
                tablist: '[data-id="tab-list"] li'
            },
            /** ui events hash */
            events: function() {
                var events = {};
                events["click " + this.ui.tablist] = function(e) {
                    var tabValue = $(e.currentTarget).attr('role');
                    Utils.setUrl({
                        url: Utils.getUrlState.getQueryUrl().queyParams[0],
                        urlParams: { tabActive: tabValue || 'properties' },
                        mergeBrowserUrl: false,
                        trigger: false,
                        updateTabState: true
                    });

                };

                return events;
            },
            /**
             * intialize a new AuditTableLayoutView Layout
             * @constructs
             */
            initialize: function(options) {
                _.extend(this, _.pick(options, 'value', 'entityDefCollection', 'businessMetadataDefCollection', 'enumDefCollection', 'searchTableFilters'));
                this.tag = this.options.value.tag;
            },
            onShow: function() {
                if (this.value && this.value.tabActive) {
                    this.$('.nav.nav-tabs').find('[role="' + this.value.tabActive + '"]').addClass('active').siblings().removeClass('active');
                    this.$('.tab-content').find('[role="' + this.value.tabActive + '"]').addClass('active').siblings().removeClass('active');
                    $("html, body").animate({ scrollTop: (this.$('.tab-content').offset().top + 1200) }, 1000);
                }
            },
            onRender: function() {
                this.renderBusinessMetadataLayoutView();
            },
            renderBusinessMetadataLayoutView: function(obj) {
                var that = this;
                require(['views/enum/EnumResultTableLayoutView'], function(EnumResultTableLayoutView) {
                    that.RBusinessMetadataTableLayoutView && that.RBusinessMetadataTableLayoutView.show && that.RBusinessMetadataTableLayoutView.show(new EnumResultTableLayoutView({ businessMetadataDefCollection: that.businessMetadataDefCollection, entityDefCollection: that.entityDefCollection, enumDefCollection: that.enumDefCollection }));
                });
            },
        });
    return AdministratorLayoutView;
});