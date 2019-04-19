<template>
    <!-- cheap bootstrap modal + vue modal -->
    <div class="modal-mask" v-show="show" transition="modal">
        <div class="modal-wrapper">
            <div class="modal-dialog" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <button type="button" @click="show = false" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                        <h4 class="modal-title"><i class="ss-heart"></i> Add Interpretation</h4>
                    </div>
                    <div class="modal-body">
                        <template v-if="hasSuccess">
                            <p>Your interpretation has been added.</p>
                        </template>
                        <template v-else>
                            <div class="clearfix">
                                <div class="col-xs-12">
                                    <p>Type your intepretation below.</p>
                                    <div class="alert alert-success" v-show="hasSuccess">
                                        <i class="ss-check"></i> {{ hasSuccess }}
                                    </div>
                                    <div class="alert alert-error" v-show="hasErrors">
                                        <i class="ss-alert"></i> {{ hasErrors }}
                                    </div>
                                    <form class="form-horizontal">
                                        <div class="form-group">
                                                <textarea v-model="content" class="form-control" rows="5" placeholder="Interpretation..."></textarea>
                                            </div>
                                    </form>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-default" @click="show = false">Close</button>
                                <button type="button" v-bind:disabled="isSubmitting" class="btn btn-success" @click="addInterpretation" v-show="!hasSuccess">
                                    <span v-show="isSubmitting"><i class="fa fa-spinner fa-spin"></i></span>
                                    Add Interpretation</button>
                            </div>
                        </template>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>

    // Imports
    import _ from 'underscore';
    import moment from 'moment';

    export default {
        /*
         |---------------------------------------------------
         | Created                                          |
         |---------------------------------------------------
         */
        created() {

        },
        /*
         |---------------------------------------------------
         | Ready                                            |
         |---------------------------------------------------
         */
        ready() {

        },
        /*
         |---------------------------------------------------
         | Data                                             |
         | @returns{{}}                                     |
         |---------------------------------------------------
         */
        data() {
            return {
                content: '',
                hasSuccess: false,
                hasErrors: false,
                isSubmitting: false
            }
        },
        /*
         |---------------------------------------------------
         | Methods                                          |
         |---------------------------------------------------
         */
        methods: {

            /**
             * Post a referral
             */
            addInterpretation: function() {
                this.isSubmitting = true;
                var payload = {
                    'recording_id': this.recording_id,
                    'recording_session_id': this.recording_session_id,
                    'body_content': this.content,
                };
                this.$http.post('/api/v1/interpretations', payload).then((response) => {
                    this.handleSuccess(response);
                }, (response) => {
                    this.handleError(response);
                });
            },

            handleSuccess : function(response) {
                this.selected_physician = false;
                this.note = '';
                this.selected_category = false;
                this.selected_priority = false;
                this.hasErrors = false;
                this.hasSuccess = true;
                this.isSubmitting = false;
            },

            /**
             * Handle an error from the submission form
             * @param {Object} e
             */
            handleError : function(response) {
                var responseErrors = [];
                if (response.status == 422) {
                    var errors = [response.data];
                    for (var index in errors) {
                        if (errors.hasOwnProperty(index)) {
                            var attr = errors[index];
                            for (var error in attr) {
                                if (attr.hasOwnProperty(error)) {
                                    responseErrors.push(attr[error]);
                                }
                            }
                        }
                    }
                }
                else {
                    responseErrors.push('An error occurred.  Please try again later.');
                }
                this.errorMessages = responseErrors;
                this.hasErrors = true;
                this.hasSuccess = false;
                this.isSubmitting = false;
            }
        },
        /*
         |---------------------------------------------------
         | Watch                                            |
         |---------------------------------------------------
         */
        watch: {

            'show': function(val) {
                if(!val){
                    this.content = '';
                    this.hasErrors = false;
                }
            }

        },
        /*
         |---------------------------------------------------
         | Properties                                       |
         |---------------------------------------------------
         */
        props: ['user', 'recording_id', 'show', 'recording_session_id'],
    }
</script>

<style>
    .modal-mask {
        position: fixed;
        z-index: 9998;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, .5);
        display: table;
        transition: opacity .3s ease;
    }

    .modal-wrapper {
        display: table-cell;
        vertical-align: middle;
    }

    .modal-enter, .modal-leave {
        opacity: 0;
    }

    .modal-enter .modal-container,
    .modal-leave .modal-container {
        -webkit-transform: scale(1.1);
        transform: scale(1.1);
    }
</style>