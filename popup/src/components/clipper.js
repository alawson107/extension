//
//     clipper.js - component for clipping current url
//     Alan Lawson copyright 2020
//

Clipper = function(){
    new Vue({
        data() {
            return {
                vars: jnx.vars,
                channelShow: false,
                channelDisabled: true,
                feedShow: false,
                feedDisabled: true,
                feedPlaceholder: 'No folders',
                categoryShow: false,
                categoryDisabled: true,
                comment: '',
                commentShow: false,
                loading: false,
                submitMessage: 'Submit',
                submitShow: false,
                submitColor: 'primary',
                submitDisabled: false,
                logoUrl: 'images/kuloo.png',
                statusShow: false,
                asApproved: true,
                importedBy: '',
                importedByColor: '#00ced1',
                importedByStyle: '',
                kulooSite: false,
                showReload: false
            }
        },
        methods: {
            onChannelChange(val, noSave){
                if (_.isEmpty(this.vars.channels)) {
                    this.logoUrl = 'images/kuloo.png';
                    this.importedBy = 'You are not authorized to post to any channel';
                    this.importedByColor = '#f56c6c';
                    this.channelShow = false;
                    this.feedShow = false;
                    this.categoryShow = false;
                    this.statusShow = false;
                    this.commentShow = false;
                    this.submitShow = false;
                }else if (!jnx.vars.url.match(/^http/)){
                    this.logoUrl = 'images/kuloo.png';
                    this.importedBy = 'Invalid page - cannot be captured';
                    this.importedByColor = '#f56c6c';
                    this.channelShow = false;
                    this.feedShow = false;
                    this.categoryShow = false;
                    this.statusShow = false;
                    this.commentShow = false;
                    this.submitShow = false;
                }else{
                    this.channelShow = true;
                    this.feedShow = true;
                    this.vars.channelId = val || this.vars.channelId;
                    if (!this.vars.channels[this.vars.channelId]){
                        return;
                    }
                    jnx.vars.channel = this.vars.channels[this.vars.channelId];
                    this.logoUrl = jnx.vars.channel.logoUrl || 'images/kuloo.png';
                    this.submitShow = true;
                    if (jnx.vars.channel.autoApprove){
                        this.statusShow = true;
                        this.asApproved = true;
                    }else if (jnx.vars.channel.isApprover){
                        this.statusShow = true;
                        this.asApproved = true;
                    }else{
                        this.statusShow = false;
                        this.asApproved = false;
                    }
                    if (jnx.vars.channel.enableComments){
                        this.commentShow = true;
                    }else{
                        this.commentShow = false;
                    }
                    if (val){                           //  val only exists if called from select control
                        jnx.vars.feedId = null;
                        jnx.vars.feed = null;
                        jnx.vars.categoryId = null;
                        jnx.vars.category = null;
                    }
                    if (jnx.vars.channels[jnx.vars.channelId].feeds.length == 0){
                        this.feedPlaceholder = 'No folders';
                        this.feedDisabled = true;
                    }else{
                        if (jnx.vars.channel.folderRequired && !this.feedId){
                            jnx.vars.feedId = jnx.vars.channel.feeds[0]._id;
                            this.feedDisabled = false;
                        }else{
                            this.feedPlaceholder = 'Folder';
                            this.feedDisabled = false;
                        }
                    }
                    this.categoryShow = false;

                    if (jnx.vars.channel.urlImported){
                        if (!this.importedBy){
                            if (jnx.vars.channel.urlImported._createdByUserId == jnx.vars.user._id){
                                var txt = 'Imported by you ' + jnx.vars.channel.urlImported._createdDateRS;
                                if (!jnx.vars.channel.autoApprove || jnx.vars.channel.urlImported.status != 'approved'){
                                    txt += '<br/>Status: ' + jnx.vars.channel.urlImported.status;
                                }
                                this.importedBy = txt;
                                this.importedByColor = '#67c23a';
                            }else{
                                this.importedBy = 'Imported by ' + jnx.vars.channel.urlImported._createdByUserName + ' '
                                    + jnx.vars.channel.urlImported._createdDateRS;
                                this.importedByColor = '#e6a23c';
                            }
                        }else{
                            // this.importedByColor = '#67c23a';
                        }
                        this.feedDisabled = true;
                        this.categoryDisabled = true;
                        this.commentShow = false;
                        this.statusShow = false;
                        this.submitDisabled = true;
                        jnx.vars.feedId = jnx.vars.channel.urlImported.feedId;
                        jnx.vars.categoryId = jnx.vars.channel.urlImported.categoryId;
                    }else{
                        this.importedBy = '';
                        this.submitDisabled = false;
                        this.categoryDisabled = false;
                    }
                    if (jnx.vars.feedId){
                        Components['Clipper'].onFeedChange(null, true);
                        if (jnx.vars.categoryId){
                            Components['Clipper'].onCategoryChange(null, true);
                        }
                    }
                    if (!jnx.vars.url.match(/support\.kuloo\.com/)
                        && (jnx.vars.url.match(/\.kuloo\.com/) || jnx.vars.kulooSite)
                    ){
                        this.kulooSite = true;
                        this.importedByColor = '#f56c6c';
                        this.importedBy = 'This is a Kuloo site - articles cannot be captured here';
                        this.submitShow = false;
                    }
                }
                if (jnx.vars.server == 'mac'){
                    this.showReload = true;
                }
                this.importedByStyle = 'text-align: center;color: white;padding: 1px 12px;border-radius: 4px;font-weight: 700;' +
                    'margin-top: 8px;font-size: 16px;background-color: ' + this.importedByColor + ';';
                if (!noSave) jnx.saveState();
            },
            onFeedChange(val, noSave){
                this.vars.feedId = val || this.vars.feedId;
                this.vars.categoryId = null;
                if (!jnx.vars.feedId){
                    this.categoryShow = false;
                    jnx.vars.feed = null;
                    jnx.vars.categoryId = null;
                    jnx.vars.category = null;
                    return;
                }
                var feeds = jnx.vars.channels[jnx.vars.channelId].feeds;
                jnx.vars.feed = _.find(feeds, v => v._id == jnx.vars.feedId);
                if (jnx.vars.feed.categories.length == 0){
                    this.categoryShow = false;
                    return;
                }
                this.categoryShow = true;
                if (!noSave) jnx.saveState();
            },
            onCategoryChange(val, noSave){
                this.vars.categoryId = val || this.vars.categoryId;
                if (!noSave) jnx.saveState();
            },
            postLink(){
                var _this = this;
                this.loading = true;
                this.submitMessage = 'Posting';
                if (jnx.vars.channel)
                    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs){
                        chrome.runtime.sendMessage({
                            _type: 'clipUrl',
                            channelId: jnx.vars.channelId,
                            feedId: jnx.vars.feedId,
                            categoryId: jnx.vars.categoryId,
                            url: tabs[0].url,
                            title: tabs[0].title,
                            asApproved: _this.asApproved,
                            comment: _this.comment
                        });
                    });
            },
        },
        beforeMount(){
            Components['Clipper'] = this;
            jnx.restoreState();
            if (!this.vars.channelId){
                for (var i in this.vars.channels){                          //  get first channel
                    this.vars.channelId = i;
                    break;
                }
            }
            this.channelDisabled = false;
            this.onChannelChange();
        },
        mounted(){
            var _this = this;
//             var result = Vue.compile(template);
//             var fnS = result.render.toString().replace(/(\{\n)(\S)/, "$1  $2");
//             console.log(fnS);
            $('button#reload').on('click', function(event){
                location.reload();
            });
        },
        updated(){},
        render (createElement){
            var _this = this;
            //  header
            var header = createElement('div', {style: {backgroundColor: '#545c64', padding: '12px', display: 'flex'}}, [
                createElement('img', {
                    attrs: {src: this.logoUrl},
                    style: {width: '30px', height: '30px', borderRadius: '2px'},
                }),
                createElement('div', {style: {
                        margin: '6px 0 0 12px', color: 'white', fontSize: '16px', fontWeight: 700, display: 'inline-block'
                    }}, 'Create article')
            ]);

            var channels = null;                                                                    //  channels
            if (this.channelShow && !this.kulooSite){
                var chanOpts = [];
                for (var channelId in this.vars.channels){
                    var channel = this.vars.channels[channelId];
                    chanOpts.push(
                        createElement('el-option', {
                            key: channel._id,
                            label: channel.title,
                            props: {value: channel._id, label: channel.title}
                        }, [
                            createElement('img', {
                                attrs: {src: channel.logoUrl || 'images/kuloo.png'},
                                style: {width: '20px', height: '20px', marginTop: '7px'}}),
                            createElement('span',
                                {style: {position: 'absolute', marginLeft: '6px'}},
                                channel.title
                            )
                        ])
                    );
                }
                var channels = createElement('div', {}, [
                    createElement('div', {style: {display: 'inline-block', width: '88px'}}, 'Channel'),
                    createElement('el-select', {
                        props: {value: this.vars.channelId},
                        on: {change: this.onChannelChange},
                        attrs: {
                            model: this.vars.channelId,
                            placeholder: 'No channel',
                            disabled: this.channelDisabled,
                            size: 'small'
                        },
                        style: {margin: '8px 0 4px 8px', width: '200px', backgroundColor: '#fbfbfb'}
                    }, chanOpts)
                ]);
            }

            var feeds = null;                                                                       //  feeds
            if (this.feedShow && !this.kulooSite && this.vars.channelId){
                var feedOpts = [];
                for (var feedId in this.vars.channel.feeds){
                    var feed = this.vars.channel.feeds[feedId];
                    feedOpts.push(
                        createElement('el-option', {
                            key: feed._id,
                            label: feed.title,
                            props: {value: feed._id, label: feed.title}
                        })
                    );
                }
                feeds = createElement('div', {}, [
                    createElement('div', {style: {display: 'inline-block', width: '88px'}}, 'Folder'),
                    createElement('el-select', {
                        props: {value: this.vars.feedId},
                        on: {change: this.onFeedChange},
                        attrs: {
                            model: this.vars.feedId,
                            clearable: this.vars.channel.folderRequired,
                            placeholder: this.feedlaceholder,
                            disabled: this.feedDisabled,
                            size: 'small'
                        },
                        style: {margin: '4px 0 4px 8px', width: '200px', backgroundColor: '#fbfbfb'}
                    }, feedOpts)
                ]);
            }

            var categories = null;                                                                  //  categories
            if (this.categoryShow && !this.kulooSite && this.vars.feedId){
                var categoryOpts = [];
                for (var categoryId in this.vars.feed.categories){
                    var category = this.vars.feed.categories[categoryId];
                    categoryOpts.push(
                        createElement('el-option', {
                            key: category._id,
                            label: category.title,
                            props: {value: category._id, label: category.title}
                        })
                    );
                }
                categories = createElement('div', {}, [
                    createElement('div', {style: {display: 'inline-block', width: '88px'}}, 'Sub-folder'),
                    createElement('el-select', {
                        props: {value: this.vars.categoryId},
                        on: {change: this.onCategoryChange},
                        attrs: {
                            model: this.vars.categoryId,
                            clearable: true,
                            placeholder: 'Sub-folder',
                            disabled: this.categoryDisabled,
                            size: 'small',
                            'popper-append-to-body': false
                        },
                        style: {margin: '4px 0 4px 8px', width: '200px', backgroundColor: '#fbfbfb'}
                    }, categoryOpts)
                ]);
            }

            var commentHDR = null;                                                                  //  comment
            var commentENT = null
            if (this.commentShow && this.vars.channel.enableComments && !this.kulooSite){
                commentHDR = createElement('div',
                    {style: {width: '80px', width: '100%', marginTop: '8px'}},
                    'Comment (optional)'
                    );
                commentENT = createElement('el-input',{
                    props: {value: this.comment},
                    model: {
                        value:(_this.comment),
                        callback:function ($$v) {_this.comment=$$v},
                        expression:"_this.comment"
                    },
                    attrs: {
                        type: 'textarea',
                        rows: 4,
                        placeholder: 'Enter comment',
                        disabled: false,
                    },
                    style: {marginTop: '4px', backgroundColor: '#fbfbfb'}
                });
            }

            var approvedSwitch = null;                                                              //  as approved
            if (this.statusShow && !this.kulooSite){
                approvedSwitch = createElement('div', {style: {margin: '8px 0'}}, [
                    createElement('div', {
                        style: {display: 'inline-block'}},
                        'Approve article'),
                    createElement('el-switch', {
                        style:{float: 'right', marginRight: '13px'},
                        attrs:{activeColor: '#67C23A'},
                        model:{
                            value:(_this.asApproved),
                            callback:function ($$v) {
                                _this.asApproved=$$v
                            },
                            expression:"_this.asApproved"
                        }
                    })
                ]);
            }

            var importedBy = null;
            if (this.importedBy){                                                                   //  special message
                var importedBy = createElement('div', {style: this.importedByStyle}, [
                    createElement('p', {domProps: {innerHTML: this.importedBy}})
                ]);
            }

            var submit = null;
            if (this.submitShow && !this.kulooSite){                                                //  submit button
                submit = createElement('div', {
                    style: {textAlign: 'right', position: 'absolute', bottom: '12px', right: '12px'}
                    }, [
                    createElement('el-button', {
                        attrs: {
                            type: this.submitColor,
                            size: 'small',
                            loading: this.loading,
                            disabled: this.submitDisabled,
                        },
                        style: {marginTop: '8px'},
                        on: {click: this.postLink}
                    }, this.submitMessage)
                ]);
            }

            if (this.showReload) {                                                                  //  reload button
                var reload = createElement('button', {
                    attrs: {id: 'reload'},
                    style: {display: 'block', position: 'absolute', bottom: '12px'},
                }, 'Reload')
            }

            return createElement('div', {
                style: {
                    width: '324px'
                }
            }, [
                //  header
                header,
                //  main body
                createElement('div', {
                    style: {minHeight: '400px', padding: '12px 12px 12px 12px', backgroundColor: '#f0f8ff'}
                    },
                    [
                        channels,
                        feeds,
                        categories,
                        commentHDR, commentENT,
                        approvedSwitch,
                        importedBy,
                        submit,
                        reload
                    ])
            ])
        }
    }).$mount('#app');
};
