require('./bootstrap');
window.Vue = require('vue');

import Vuex from 'vuex'
import axios from 'axios'
import moment from 'moment'
import 'element-theme-default'
import Element from 'element-ui'
import VueRouter from 'vue-router'
import store from './store/user-store'
import {EventBus} from './lib/EventBus.js'
import VueBreadcrumbs from 'vue-breadcrumbs'
import router from './router/user-router.js'
import locale from 'element-ui/lib/locale/lang/en'

// Scaffolds
import Loading from './scaffold/Loading.vue'
import TopNavigation from './scaffold/TopNavigation.vue'
import MainNavigation from './scaffold/MainNavigation.vue'


const http = axios.create({
    baseURL: process.env.APP_URL,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    },
    transformResponse: [function (data, response) {
        if(response.status == 401) {
            EventBus.$emit('session-expired', data)
        } else if(response.status == 422) {
            EventBus.$emit('display-form-errors', data)
        } else if(response.status == 500) {
            EventBus.$emit('server-error', data)
        } else if(response.status == 200) {
            EventBus.$emit('display-success', data)
        }
        EventBus.$emit('page-load', {value:false})
        return JSON.parse(data);
    }],
})

Vue.prototype.$http = http
Vue.prototype.bus = EventBus
Vue.prototype.moment = moment
Vue.prototype.csrf_token = Pawtrackers.csrf_token

Vue.use(Vuex)
Vue.use(Element, { locale })
Vue.use(VueRouter)
Vue.use(VueBreadcrumbs, {
    template: '<el-breadcrumb separator="/" v-if="$breadcrumbs.length">' +
    '<el-breadcrumb-item class="breadcrumb-item" v-for="(crumb, key) in $breadcrumbs" :to="linkProp(crumb)" :key="key">{{ crumb | crumbText }}</el-breadcrumb-item> ' +
    '</el-breadcrumb>'
});


new Vue({
    router,
    store,
    components: {
        TopNavigation,
        MainNavigation,
        Loading
    },
    mounted() {

    },
    created() {
        var vm = this
        /**
         * Implemented for NodeJS broadcasters and live site notifications only
         *
         *
        this.channels.forEach(function(channel) {
            socket.on(channel, function(message) {
                var notification = message.data.response
                vm.$notify({
                    title: notification.title,
                    message: notification.message,
                    duration: 0,
                    type: 'success'
                })
                vm.bus.$emit(notification.event, notification.payload)
            })
        })
        **/

        this.bus.$on('page-load', function(isLoading){
            vm.pageIsLoading =  isLoading.value
        })

        this.bus.$on('session-expired', function(response){
            this.$alert('Your session has expired, please login.', 'Session Expired', {
                confirmButtonText: 'OK',
                callback: action => {
                    location.reload()
                }
            })
        })

        this.bus.$on('display-form-errors', function(data) {
            var errors = JSON.parse(data)
            _.each(errors.errors, function (error) {
                vm.$notify({
                    title: 'Form Validation',
                    message: error[0],
                    duration: 0
                })
            })
        })

        this.bus.$on('server-error', function(response){
            this.$message.error('An error occurred and has been reported.  To open a support ticket please visit the Support page.');
        })

        this.bus.$on('display-success', function(data){

        })

    },
    data() {
        return {
            pageIsLoading: false,
            user: Pawtrackers.user
        }
    },
    watch: {
        pageIsLoading(val) {

        }
    }
}).$mount('#app')