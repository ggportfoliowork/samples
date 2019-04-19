import { Line } from 'vue-chartjs'
import Axios from 'axios';
import moment from 'moment';

if(window.User.network == null) {
    var network_id = 1;
} else {
    var network_id = window.User.network.id;
}

export default Line.extend({
    ready () {
        var chart = this;
        Axios.defaults.headers.common['X-CSRF-TOKEN'] = window.Laravel.csrfToken;
        Axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
        Axios.get('/api/v1/networks/' + network_id + '/metrics/recordings')
            .then(function (response) {
                var data = response.data;
                chart.render({
                    labels: ['7 Days Ago', '6 Days Ago', '5 Days Ago', '4 Days Ago', '3 Days Ago', '2 Days Ago', 'Yesterday', 'Today'],
                    datasets: [
                        {
                            label: 'Recordings',
                            backgroundColor: '#204670',
                            data: [
                                data.sevenDaysAgo,
                                data.sixDaysAgo,
                                data.fiveDaysAgo,
                                data.fourDaysAgo,
                                data.threeDaysAgo,
                                data.twoDaysAgo,
                                data.yesterday,
                                data.today
                            ]
                        }
                    ]
                }, {height: 320, responsive: true, maintainAspectRatio: false})
            })
            .catch(function (error) {
                console.error(error);
            });
    }
});