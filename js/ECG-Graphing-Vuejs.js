<template>
    <div id="data-column">
        <div class="panel panel-success">
            <div class="panel-body">
                <ecg-events :additional_data.sync="additional_data" :recording.sync="recording" :remeasurements.sync="remeasurements"></ecg-events>
                <ecg-notes :recording.sync="recording" :notes.sync="notes"></ecg-notes>
            </div>
        </div>
        <flag-recording-dialog-box :show.sync="isFlaggingStrip" :recording_id.sync="recording"></flag-recording-dialog-box>
        <add-interpretation-dialog-box :show.sync="isInterpretingRecording" :recording_id.sync="recording" :recording_session_id="session_id"></add-interpretation-dialog-box>
    </div>
</template>

<script>

    import _ from 'underscore';
    import moment from 'moment';
    import Highcharts from 'highcharts/highstock';
    import ProvidePatternFill from 'highcharts-pattern-fill';
    require('highcharts/modules/exporting')(Highcharts);
    import EcgNotesPatient from './EcgNotesPatient.vue';
    import EcgEventsPatient from './EcgEventsPatient.vue';
    import FlagRecordingDialogBox from './FlagRecordingDialogBox.vue';
    import AddInterpretationDialogBox from './AddInterpretationDialogBox.vue';

    // Global non-vue for loading up the Highchart data
    var ecgChart;

    export default{
        data() {
            return {
                graphFill: null,
                zoomLevel: 0,
                currentZoomLevel: 0,
                session_id: this.$route.params.session_id,
                ecgChart: false,
                xRange: false,
                yRange: false,
                event: false,
                sharedNotes: false,
                customLabels: [],
                caliperStartPoint: false,
                caliperEndPoint: false,
                caliperStartObject: false,
                caliperEndObject: false,
                clickXStart: false,
                clickXEnd: false,
                clickY: 0,
                topOffset: false,
                stripClip: false,
                getCaliperType: false,
                draggableStartPoint: false,
                draggableEndPoint: false,
                isRemeasuring: false,
                isEditing: false,
                isFlaggingStrip: false,
                isInterpretingRecording: false,
                isConfirmingMeasurement: false,
                isInterpretingStrip: false,
                prMeasurementBtn: false,
                qtMeasurementBtn: false,
                qrsMeasurementBtn: false,
                zoomGraphBtn: false,
                zoomGraphBtnX2: false,
                zoomGraphBtnX3: false,
                zoomGraphBtnX4: false,
                rrMeasurementBtn: false,
                confirmMeasurementBtn: false,
                saveRecordingBtn: false,
                interpretRecordingButton: false,
                markStripAsReviewedButton: false,
                referRecordingBtn: false,
                nextStripBtn: false,
                prevStripBtn: false,
                flagRecordingBtn: false,
                paths: [],
                xMax: 0,
                xMin: 0,
            }
        },
        ready: function() {
            this.renderEcgGraph();
            this.sharedNotes = this.notes;
            if(this.remeasurements.length > 0) {
                var vm = this;
                _.each(this.remeasurements, function(measurement){
                    vm.addRemeasurement(measurement);
                });
            }
        },
        events: {
            'inspect-event': function(e) {
                var min = e.start_time * 1000;
                var max = e.end_time * 1000;
                this.event = e.event;
                ecgChart.xAxis[0].setExtremes(min, max);
            },
            'draw-abnormal-event': function(e) {
                // Center the event
                var ms_center = e.event_mark * 1000;
                // Add some padding to the plot band
                var ms_start = ms_center - 50;
                var ms_end = ms_center + 50;
                // If the ms_end calculated is greater than the graph xRange, make it go to the end of the graph
                if(ms_end > this.xRange.dataMax)
                // Set the ms_end to the xRange Maximum if this is the case
                    ms_end = this.xRange.dataMax;

                if(
                    e.event.DESCRIPTION_SHORT == 'AFib rapid' ||
                    e.event.DESCRIPTION_SHORT == 'Pause' ||
                    e.event.DESCRIPTION_SHORT == 'VT'
                ) {
                    var color = 'rgba(239,100,116, .4)';
                } else if(
                    e.event.DESCRIPTION_SHORT == 'Mobitz I' ||
                    e.event.DESCRIPTION_SHORT == 'Mobitz II' ||
                    e.event.DESCRIPTION_SHORT == 'AFib slow' ||
                    e.event.DESCRIPTION_SHORT == 'AFib normal' ||
                    e.event.DESCRIPTION_SHORT == 'SVTA'
                ) {
                    var color = 'rgba(255,189,68, .4)'
                } else {
                    var color = 'transparent'
                }

                ecgChart.xAxis[0].addPlotBand({
                    label: {
                        text: e.event.DESCRIPTION_SHORT,
                        zIndex: 6,
                    },
                    zIndex: 0,
                    color: color,
                    from: ms_start,
                    to: ms_end
                });
            },
            'draw-normal-event': function(e) {
                var ms_start = e.start_time * 1000;
                var ms_end = e.end_time * 1000;

                if(ms_end > this.xRange.dataMax)
                    ms_end = this.xRange.dataMax;

                ecgChart.xAxis[0].addPlotBand({
                    label: {
                        text: e.event.DESCRIPTION_SHORT,
                        zIndex: 6,
                    },
                    zIndex: 0,
                    color: 'rgba(254,255,237, .4)',
                    from: ms_start,
                    to: ms_end
                });
            }
        },
        methods: {
            initGraphFill: function(chart) {
                    if(typeof(typeof this.graphFill == 'undefined' || this.graphFill == false || this.graphFill == null)) {
                        $(".graph-fill").remove();
                        this.graphFill = true;
                        if(this.zoomLevel == 0) {
                            var img = 'http://beatsandrhythm.com/img/chart-fill-100.svg';
                        } else if(this.zoomLevel == 1) {
                            var img = 'http://beatsandrhythm.com/img/chart-fill-200.svg';
                        } else if(this.zoomLevel == 2) {
                            var img = 'http://beatsandrhythm.com/img/chart-fill-400.svg';
                        }
                        this.graphFill =  chart.renderer.image(img, 0, 0, '1980', '400')
                                .attr({
                                    class: 'graph-fill'
                                })
                                .css({
                                    zIndex: 1,
                                })
                                .add();
                    } else {
                        if(this.zoomLevel == 0) {
                            var img = 'http://beatsandrhythm.com/img/chart-fill-100.svg';
                        } else if(this.zoomLevel == 1) {
                            var img = 'http://beatsandrhythm.com/img/chart-fill-200.svg';
                        } else if(this.zoomLevel == 2) {
                            var img = 'http://beatsandrhythm.com/img/chart-fill-400.svg';
                        }
                        $(".graph-fill").remove();
                        this.graphFill = true;
                        this.graphFill =  chart.renderer.image(img, 0, 0, '1980', '400')
                                .attr({
                                    class: 'graph-fill'
                                })
                                .css({
                                    zIndex: 1,
                                })
                                .add();
                    }
            },
            'markStripAsReviewed': function() {
                if(this.alerts !== null) {
                    this.$http.post('/api/v1/alerts/clear', {
                                        'alerts': this.alerts.id
                                    }).then(function(response){
                                            console.log(response.data);
                                            console.error(response.data);
                                    });
                } else {
                    alert("This strip has not been flagged for review.");
                }
            },
            'prevStrip': function(){
                this.$dispatch("prevStrip");
            },
            'nextStrip': function(){
                this.$dispatch("nextStrip");
            },
            /**
             * Set the caliper measurement
             */
            'setMeasurement': function(type) {
                if(type == 'qt') {
                    this.isRemeasuring = 'qt';
                    this.topOffset = 210;
                }
                else if(type == 'qrs') {
                    this.isRemeasuring = 'qrs';
                    this.topOffset = 100;
                }
                else if(type == 'pr') {
                    this.isRemeasuring = 'pr';
                    this.topOffset = 135;
                }
                else if(type == 'rr') {
                    this.isRemeasuring = 'rr';
                    this.topOffset = 275;
                }
                else {
                    this.isRemeasuring = false;
                }
            },

            /**
             * Set the caliper start point
             */
            'setCaliperStartPoint': function(xPoint) {
                var vm = this;
                this.caliperStartPoint = xPoint;
                this.caliperStartObject = ecgChart.xAxis[0].addPlotLine({
                    color: 'black',
                    dashStyle: 'dash',
                    label: {
                        /**text: vm.convertMillisecondsToReadable(xPoint)**/
                    },
                    zIndex: 6,
                    id: 'caliper-start',
                    value: xPoint,
                    width: 2,
                    events: {
                        click: function () {

                        },
                    }
                });
                this.draggableStartPoint = this.caliperStartObject.svgElem.css({
                    'cursor': 'pointer'
                }).translate(0, 0)
                        .on('mousedown', vm.startDragStartObject);
            },

            /**
             * Set the caliper end point
             */
            'setCaliperEndPoint': function(xPoint, isFirst) {
                var vm = this;
                if(xPoint > this.caliperStartPoint) {
                    this.caliperEndPoint = xPoint;
                    this.caliperEndObject = ecgChart.xAxis[0].addPlotLine({
                        color: 'black',
                        dashStyle: 'dash',
                        label: {
                            //text: this.convertMillisecondsToReadable(xPoint)
                        },
                        zIndex: 2,
                        id: 'caliper-end',
                        value: xPoint,
                        width: 2,
                        events: {
                            click: function() {

                            },
                        }
                    });
                    this.draggableEndPoint = this.caliperEndObject.svgElem.css({
                        cursor: 'pointer'
                    }).translate(0, 0)
                            .on('mousedown', vm.startDragEndObject);
                    var timeSlice = (this.caliperEndPoint - this.caliperStartPoint) / 1000;
                    var value = null;
                    var yValues = [];
                    var points=ecgChart.series[0].data;
                    for(var i=0;i<points.length;i++){
                        if(points[i].x >= this.caliperStartPoint && points[i].x <= this.caliperEndPoint)
                        {
                            value = {x: points[i].x, y: points[i].y};
                            yValues.push(value);
                        }
                    }
                    vm.confirmMeasurementBtn.setState(0);
                    if(vm.isRemeasuring == 'qt')
                        var color = '#505fe5';
                    else if(vm.isRemeasuring == 'pr')
                        var color = '#f78922';
                    else if(vm.isRemeasuring == 'qrs')
                        var color = '#ef563b';
                    else if(vm.isRemeasuring == 'rr')
                        var color = '#c542f4';
                    ecgChart.addSeries({
                        name: 'Remeasured',
                        data: yValues,
                        color: color,
                    });
                    ecgChart.redraw();
                    this.stripClip = yValues;
                    var lastPos = yValues.pop();
                }
            },

            /**
             * Start dragging a caliper
             */
            'startDragEndObject': function(e) {
                var line = this.draggableEndPoint;
                var vm = this;
                $(document).bind({
                    'mousemove.line': vm.stepDragEndObject,
                    'mouseup.line': vm.stopDragEndObject
                });
                this.clickXEnd = e.pageX - line.translateX;

                if(this.caliperEndObject) {

                }
            },

            /**
             * A singular step in the drag function to translate
             * the SVG element of the plot line
             * to a new X position
             */
            'stepDragEndObject': function(e) {
                this.draggableEndPoint.translate(e.pageX - this.clickXEnd)
            },

            /**
             * Stop dragging a caliper
             */
            'stopDragEndObject': function(e) {
                var newValue = ecgChart.xAxis[0].toValue(e.pageX - this.clickXEnd) - ecgChart.xAxis[0].toValue(0) + this.caliperEndObject.options.value;
                newValue = Math.max(ecgChart.xAxis[0].min, Math.min(ecgChart.xAxis[0].max, newValue));
                if(newValue < this.caliperStartPoint) {
                    newValue = this.caliperEndPoint;
                }
                this.updateCaliperEndPoints(newValue);
                $(document).unbind('.line');
            },

            'updateCaliperEndPoints': function(value) {
                var vm = this;

                for (var i = 0; i < ecgChart.xAxis[0].plotLinesAndBands.length; i++) {
                    if (ecgChart.xAxis[0].plotLinesAndBands[i].id === 'caliper-end') {
                        ecgChart.xAxis[0].plotLinesAndBands[i].destroy();
                        var vm = this;
                        this.caliperEndPoint = Math.round(value);
                        this.caliperEndObject = ecgChart.xAxis[0].addPlotLine({
                            color: 'black',
                            dashStyle: 'dash',
                            label: {
                                //text: vm.convertMillisecondsToReadable(value)
                            },
                            zIndex: 6,
                            id: 'caliper-end',
                            value: value,
                            width: 2,
                            events: {
                                click: function () {

                                },
                            }
                        });
                        this.draggableEndPoint = this.caliperEndObject.svgElem.css({
                            'cursor': 'pointer'
                        }).translate(0, 0)
                                .on('mousedown', vm.startDragEndObject);
                    }
                }
                ecgChart.series[2].destroy();
                var timeSlice = (this.caliperEndPoint - this.caliperStartPoint) / 1000;
                var value = null;
                var yValues = [];
                var points=ecgChart.series[0].data;
                for(var i=0;i<points.length;i++){
                    if(points[i].x >= this.caliperStartPoint && points[i].x <= this.caliperEndPoint)
                    {
                        value = {x: points[i].x, y: points[i].y};
                        yValues.push(value);
                    }
                }
                this.confirmMeasurementBtn.setState(0);
                if(this.isRemeasuring == 'qt')
                    var color = '#505fe5';
                else if(this.isRemeasuring == 'pr')
                    var color = '#f78922';
                else if(this.isRemeasuring == 'qrs')
                    var color = '#ef563b';
                else if(this.isRemeasuring == 'rr')
                    var color = '#c542f4';
                ecgChart.addSeries({
                    name: 'Remeasured',
                    data: yValues,
                    color: color,
                });
                ecgChart.redraw();
                this.stripClip = yValues;
                var lastPos = yValues.pop();
            },

            /**
             * Start dragging a caliper
             */
            'startDragStartObject': function(e) {
                var line = this.draggableStartPoint;
                var vm = this;
                $(document).bind({
                    'mousemove.line': vm.stepDragStartObject,
                    'mouseup.line': vm.stopDragStartObject
                });
                this.clickXStart = e.pageX - line.translateX;
            },

            /**
             * A singular step in the drag function to translate
             * the SVG element of the plot line
             * to a new X position
             */
            'stepDragStartObject': function(e) {
                this.draggableStartPoint.translate(e.pageX - this.clickXStart)
            },

            /**
             * Stop dragging a caliper
             */
            'stopDragStartObject': function(e) {
                var newValue = ecgChart.xAxis[0].toValue(e.pageX - this.clickXStart) - ecgChart.xAxis[0].toValue(0) + this.caliperStartObject.options.value;
                newValue = Math.max(ecgChart.xAxis[0].min, Math.min(ecgChart.xAxis[0].max, newValue));
                if(this.caliperEndPoint) {
                    if(newValue > this.caliperEndPoint)
                        newValue = this.caliperStartPoint;
                }
                this.updateCaliperStartPoints(newValue);
                $(document).unbind('.line');
            },

            /**
             * Update the caliper points for the graphz
             * @param e
             */
            'updateCaliperStartPoints': function(value) {
                var vm = this;
                for (var i = 0; i < ecgChart.xAxis[0].plotLinesAndBands.length; i++) {
                    if (ecgChart.xAxis[0].plotLinesAndBands[i].id === 'caliper-start') {
                        ecgChart.xAxis[0].plotLinesAndBands[i].destroy();
                        var vm = this;
                        this.caliperStartPoint = Math.round(value);
                        this.caliperStartObject = ecgChart.xAxis[0].addPlotLine({
                            color: 'black',
                            dashStyle: 'dash',
                            label: {
                                //text: vm.convertMillisecondsToReadable(value)
                            },
                            zIndex: 6,
                            id: 'caliper-start',
                            value: value,
                            width: 2,
                            events: {
                                click: function () {

                                },
                            }
                        });
                        this.draggableStartPoint = this.caliperStartObject.svgElem.css({
                            'cursor': 'pointer'
                        }).translate(0, 0)
                                .on('mousedown', vm.startDragStartObject);
                    }
                }
                if(this.caliperEndPoint) {
                    ecgChart.series[2].destroy();
                    var timeSlice = (this.caliperEndPoint - this.caliperStartPoint) / 1000;
                    var value = null;
                    var yValues = [];
                    var points=ecgChart.series[0].data;
                    for(var i=0;i<points.length;i++){
                        if(points[i].x >= this.caliperStartPoint && points[i].x <= this.caliperEndPoint)
                        {
                            value = {x: points[i].x, y: points[i].y};
                            yValues.push(value);
                        }
                    }
                    this.confirmMeasurementBtn.setState(0);
                    if(this.isRemeasuring == 'qt')
                        var color = '#505fe5';
                    else if(this.isRemeasuring == 'pr')
                        var color = '#f78922';
                    else if(this.isRemeasuring == 'qrs')
                        var color = '#ef563b';
                    else if(this.isRemeasuring == 'rr')
                        var color = '#c542f4';
                    ecgChart.addSeries({
                        name: 'Remeasured',
                        data: yValues,
                        color: color,
                    });
                    ecgChart.redraw();
                    this.stripClip = yValues;
                    var lastPos = yValues.pop();
                }
            },

            /**
             * Remove a measurement by id
             */
            'removeMeasurement': function(measurement) {
                $(".measurement-"+measurement).remove();
                $(".text-for-"+measurement).remove();
                $(".measurement-start-"+measurement).remove();
                $(".measurement-end-"+measurement).remove();
            },

            /**
             * Remeasure intervals given the new caliper points
             * @param e
             */
            'submitCaliperRemeasurement': function(e) {
                var startPoint = ecgChart.series[2].data[0].x;
                var endPoint = ecgChart.series[2].data.slice(-1).pop().x;
                ecgChart.series[2].remove();
                if(this.isEditing) {
                    var payload = {
                        'recording_id': this.recording,
                        'measurement_start': startPoint,
                        'measurement_end': endPoint,
                        'measurement_length': (endPoint - startPoint),
                        'measurement_type': this.isRemeasuring,
                        'measurement_points': _.pluck(this.stripClip, 'y')
                    };
                    this.$http.put('/api/v1/remeasurements/' + this.isEditing, payload).then((response) => {
                        this.caliperStartPoint = false;
                        this.caliperEndPoint = false;
                        this.caliperStartObject = false;
                        this.caliperEndObject = false;
                        this.draggableEndPoint = false;
                        this.draggableStartPoint = false;
                        this.clickXStart = false;
                        this.clickXEnd = false;
                        this.stripClip = false;
                        this.confirmMeasurementBtn.setState(3);
                        this.prMeasurementBtn.setState(0);
                        this.qtMeasurementBtn.setState(0);
                        this.qrsMeasurementBtn.setState(0);
                        this.rrMeasurementBtn.setState(0);
                        this.stripClip = false;
                        this.isRemeasuring = false;
                        this.topOffset = false;
                        ecgChart.xAxis[0].removePlotLine('caliper-start');
                        ecgChart.xAxis[0].removePlotLine('caliper-end');
                        this.removeMeasurement(this.isEditing);
                        this.isEditing = false;
                        for (var i = 0; i < this.paths.length; i++)
                            if (this.paths[i].id === response.data.id) {
                                this.paths.splice(i, 1);
                                break;
                            }
                        this.addRemeasurement(response.data);
                        this.$dispatch('sync-remeasurement', response.data);
                    }, (response) => {
                        console.error(JSON.stringify(response.data));
                    });
                } else {
                    var payload = {
                        'recording_id': this.recording,
                        'measurement_start': startPoint,
                        'measurement_end': endPoint,
                        'measurement_length': (endPoint - startPoint),
                        'measurement_type': this.isRemeasuring,
                        'measurement_points': _.pluck(this.stripClip, 'y')
                    };
                    this.$http.post('/api/v1/remeasurements', payload).then((response) => {
                        this.caliperStartPoint = false;
                        this.caliperEndPoint = false;
                        this.caliperStartObject = false;
                        this.caliperEndObject = false;
                        this.draggableEndPoint = false;
                        this.draggableStartPoint = false;
                        this.clickXStart = false;
                        this.clickXEnd = false;
                        this.stripClip = false;
                        this.confirmMeasurementBtn.setState(3);
                        this.prMeasurementBtn.setState(0);
                        this.qtMeasurementBtn.setState(0);
                        this.qrsMeasurementBtn.setState(0);
                        this.rrMeasurementBtn.setState(0);
                        this.topOffset = false;
                        this.stripClip = false;
                        this.isRemeasuring = false;
                        ecgChart.xAxis[0].removePlotLine('caliper-start');
                        ecgChart.xAxis[0].removePlotLine('caliper-end');
                        this.addRemeasurement(response.data);
                        this.$dispatch('sync-remeasurement', response.data);
                    }, (response) => {
                        console.error(JSON.stringify(response.data));
                    });
                }
            },

            /**
             * Add a remeasurement bar to the graph
             * @param {Object} remeasurement
             */
            'addRemeasurement': function(remeasurement) {
                var vm = this;
                if(remeasurement.measurement_type == 'qt') {
                    var color = '#505fe5';
                    this.topOffset = 210;
                    var verticalLine = vm.topOffset - 80;
                }
                else if(remeasurement.measurement_type == 'pr') {
                    var color = '#f78922';
                    this.topOffset = 135;
                    var verticalLine = vm.topOffset + 95;
                }
                else if(remeasurement.measurement_type == 'qrs') {
                    var color = '#ef563b';
                    this.topOffset = 100;
                    var verticalLine = vm.topOffset + 135;
                }
                else if(remeasurement.measurement_type == 'rr') {
                    var color = '#c542f4';
                    this.topOffset = 275;
                    var verticalLine = vm.topOffset - 100;
                }

                var points=ecgChart.series[0].data;

                for(var i=0;i<points.length;i++){
                    if(points[i].x == remeasurement.measurement_start)
                    {
                        var startPoint = points[i].x;
                    }
                    else if(points[i].x == remeasurement.measurement_end)
                    {
                        var endPoint = points[i].x;
                    }
                }

                var measurementStart = ecgChart.renderer.path(['M', ecgChart.xAxis[0].toPixels(startPoint), this.topOffset, 'V', this.topOffset, verticalLine])
                        .attr({
                            'stroke-width': 2,
                            stroke: '#ccc',
                            class: 'measurement-start measurement-start-'+ remeasurement.id,
                            zIndex: 8,
                            dashstyle: 'dash'
                        });
                measurementStart.add();
                var measurementEnd = ecgChart.renderer.path(['M', ecgChart.xAxis[0].toPixels(endPoint), this.topOffset, 'V', this.topOffset, verticalLine])
                        .attr({
                            'stroke-width': 2,
                            stroke: '#ccc',
                            class: 'measurement-end measurement-end-' + remeasurement.id,
                            zIndex: 8,
                            dashstyle: 'dash'
                        });
                measurementEnd.add();
                var measurement = ecgChart.renderer.path(['M', ecgChart.xAxis[0].toPixels(startPoint), this.topOffset, 'L', ecgChart.xAxis[0].toPixels(endPoint), this.topOffset])
                        .attr({
                            fill: color,
                            'stroke-width': 4,
                            stroke: color,
                            zIndex: 6,
                            class: 'measurement measurement-' + remeasurement.id,
                            id: 'measurement-' + remeasurement.id
                        }).on('click', function(){
                            ecgChart.xAxis[0].removePlotLine('caliper-start');
                            ecgChart.xAxis[0].removePlotLine('caliper-end');
                            var type = remeasurement.measurement_type;
                            if(type == 'pr') {
                                vm.topOffset = 135;
                                vm.prMeasurementBtn.setState(2);
                                vm.qrsMeasurementBtn.setState(0);
                                vm.qtMeasurementBtn.setState(0);
                                vm.rrMeasurementBtn.setState(0);
                            } else if(type == 'qrs') {
                                vm.topoffset = 100;
                                vm.qrsMeasurementBtn.setState(2);
                                vm.prMeasurementBtn.setState(0);
                                vm.qtMeasurementBtn.setState(0);
                                vm.rrMeasurementBtn.setState(0);
                            } else if(type == 'qt') {
                                vm.topOffset = 210;
                                vm.qtMeasurementBtn.setState(2);
                                vm.prMeasurementBtn.setState(0);
                                vm.qrsMeasurementBtn.setState(0);
                                vm.rrMeasurementBtn.setState(0);
                            } else if(type == 'rr') {
                                vm.topOffset = 275;
                                vm.rrMeasurementBtn.setState(2);
                                vm.prMeasurementBtn.setState(0);
                                vm.qrsMeasurementBtn.setState(0);
                                vm.qtMeasurementBtn.setState(0);
                            }
                            vm.confirmMeasurementBtn.setState(0);
                            vm.isRemeasuring = type;
                            vm.isEditing = remeasurement.id;
                            vm.setCaliperStartPoint(startPoint);
                            vm.setCaliperEndPoint(endPoint);
                        });

                if(remeasurement.measurement_type == 'pr') {
                    var measurementText = 'ms';
                } else if(remeasurement.measurement_type == 'qrs') {
                    var measurementText = 'ms';
                } else if(remeasurement.measurement_type == 'qt') {
                    var measurementText = 'ms';
                } else if(remeasurement.measurement_type == 'rr') {
                    var measurementText = 'bpm';
                }

                if(remeasurement.measurement_type == 'rr') {
                    var textStart = ecgChart.renderer.text(
                            remeasurement.measurement_type.toUpperCase() + ' - ' + Math.round(60/remeasurement.measurement_length*1000) + measurementText,
                            ecgChart.xAxis[0].toPixels(startPoint - 15),
                            (vm.topOffset - 10)
                    ).attr({
                        zIndex: 6,
                        class: 'measurement-text text-for-' + remeasurement.id,
                    });
                } else {
                    var textStart = ecgChart.renderer.text(
                            remeasurement.measurement_type.toUpperCase() + ' - ' + remeasurement.measurement_length + measurementText,
                            ecgChart.xAxis[0].toPixels(startPoint - 15),
                            (vm.topOffset - 10)
                    ).attr({
                        zIndex: 6,
                        class: 'measurement-text text-for-' + remeasurement.id,
                    });
                }

                measurement.add();
                textStart.add();
                //caliperStartText.add();
                //caliperEndText.add();
                this.paths.push({
                    'id': remeasurement.id,
                    'start': startPoint,
                    'end': endPoint,
                    'y': 150,
                    'type': remeasurement.measurement_type,
                    'length:': remeasurement.measurement_length,
                    'color': color
                });
            },

            /**
             * Associate a recording with a user
             * @param e
             */
            'saveRecordingToStrips' : function(e) {
                this.$http.post('/api/v1/clips', {recording_id: this.recording}).then((response) => {
                    this.saveRecordingBtn.setState(3);
                }, (response) => {
                    this.saveRecordingBtn.setState(0);
                    console.error(JSON.stringify(response.data));
                });
            },

            /**
             * Convert Milliseconds to a readable timestamp
             */
            'convertMillisecondsToReadable': function(duration) {
                return moment.utc(duration).format("HH:mm:ss.SSS")
            },


            /**
             * Render the ECG Graph given the normalized data
             */
            'renderEcgGraph': function () {
                var vm = this;
                ecgChart = Highcharts.stockChart('ecg-graph', {
                    chart: {
                        width: 1980,
                        height: 400,
                        backgroundColor: 'rgba(0,0,0,0)',
                        zoom: false,
                        events: {
                            load: function(event){
                                if(typeof vm.graphFill == 'undefined' || vm.graphFill == false || vm.graphFill == null) {
                                    $(".graph-fill").remove();
                                    this.graphFill = true;
                                    this.graphFill =  this.renderer.image('http://beatsandrhythm.com/img/chart-fill-100.svg', 0, 0, '1980', '400')
                                            .attr({
                                                class: 'graph-fill'
                                            })
                                            .css({
                                                zIndex: 1,
                                            })
                                            .add();
                                } else {
                                    console.log("Graph already loaded");
                                }
                            },
                            redraw: function (event) {
                                vm.initGraphFill(ecgChart);
                                $(".measurement").remove();
                                $(".measurement-text").remove();
                                $(".measurement-start").remove();
                                $(".measurement-end").remove();
                                $(".nextStripBtn").remove();
                                $(".prevStripBtn").remove();
                                $(".zoomBtn").remove();


                                var zoomGraphButton = ecgChart.renderer.button('Zoom x100%',  ecgChart.xAxis[0].toPixels(ecgChart.xAxis[0].getExtremes().max) - 1318, 10, null,  {fill: '#22457c', style: { color: 'white', } }, { fill: '#162947', style: { color: 'white', } }, { fill: '#535453', style: { color: 'white', } }, { fill: '#eeeeee', style: { color: 'white', } }).attr({ class: 'zoomBtn' }).css({ class: 'zoomBtn', color: 'white', id: 'zoom', cursor: 'pointer' });
                                var zoomGraphButtonX2 = ecgChart.renderer.button('Zoom x200%', ecgChart.xAxis[0].toPixels(ecgChart.xAxis[0].getExtremes().max) - 1238, 10, null,  {fill: '#22457c', style: { color: 'white', } }, { fill: '#162947', style: { color: 'white', } }, { fill: '#535453', style: { color: 'white', } }, { fill: '#eeeeee', style: { color: 'white', } }).attr({ class: 'zoomBtn' }).css({ class: 'zoomBtn', color: 'white', id: 'zoom', cursor: 'pointer' });
                                var zoomGraphButtonX3 = ecgChart.renderer.button('Zoom x400%', ecgChart.xAxis[0].toPixels(ecgChart.xAxis[0].getExtremes().max) - 1148, 10, null, {fill: '#22457c', style: { color: 'white', } }, { fill: '#162947', style: { color: 'white', } }, { fill: '#535453', style: { color: 'white', } }, { fill: '#eeeeee', style: { color: 'white', } }).attr({ class: 'zoomBtn' }).css({ class: 'zoomBtn', color: 'white', id: 'zoom', cursor: 'pointer' });

                                vm.zoomGraphBtn = zoomGraphButton;
                                vm.zoomGraphBtnX2 = zoomGraphButtonX2;
                                vm.zoomGraphBtnX3 = zoomGraphButtonX3;

                                zoomGraphButton.on('click', function(e) {
                                    if(zoomGraphButton.state != 3) {
                                        zoomGraphButton.setState(3);
                                        zoomGraphButtonX2.setState(0);
                                        zoomGraphButtonX3.setState(0);
                                        $(".graph-fill").remove();
                                        vm.zoomLevel = 0;
                                        ecgChart.xAxis[0].setExtremes(null,null);
                                        ecgChart.redraw();
                                    }
                                });

                                zoomGraphButtonX2.on('click', function(e) {
                                    if(zoomGraphButtonX2.state != 3) {
                                        zoomGraphButtonX2.setState(3);
                                        zoomGraphButton.setState(0);
                                        zoomGraphButtonX3.setState(0);
                                        var max = 1980 / .5;
                                        var min = 0;
                                        $(".graph-fill").remove();
                                        vm.zoomLevel = 1;
                                        ecgChart.xAxis[0].setExtremes(min, max);
                                        ecgChart.redraw();
                                    }
                                })

                                zoomGraphButtonX3.on('click', function(e) {
                                    if(zoomGraphButtonX3.state != 3) {
                                        zoomGraphButtonX3.setState(3);
                                        zoomGraphButton.setState(0);
                                        zoomGraphButtonX2.setState(0);
                                        var max = 1980 / .75;
                                        var min = 0;
                                        $(".graph-fill").remove();
                                        vm.graphfill = false;
                                        vm.zoomLevel = 2;
                                        ecgChart.xAxis[0].setExtremes(min,max);
                                        ecgChart.redraw();
                                    }
                                })


                                zoomGraphButton.add();
                                zoomGraphButtonX2.add();
                                zoomGraphButtonX3.add();

                                if(window.User.roles.id !== 6) {
                                    var confirmBtnCurrentState = vm.confirmMeasurementBtn.state;
                                    var saveBtnCurrentState = vm.saveRecordingBtn.state;
                                    $(".confirmBtn").remove();
                                    $(".saveBtn").remove();
                                    var flagRecordingButton = ecgChart.renderer.button('Flag Recording', ecgChart.xAxis[0].toPixels(ecgChart.xAxis[0].getExtremes().max) - 1665, 10, null, { fill: '#22457c', style: { color: 'white', } }, { fill: '#162947', style: { color: 'white', } }, { fill: '#535453', style: { color: 'white', } }, { fill: '#eeeeee', style: { color: 'white', } }).attr({ class: 'saveBtn' }).css({ class: 'saveBtn', color: 'white', id: 'confirm', cursor: 'pointer' });
                                    var referRecordingButton = ecgChart.renderer.button('Refer Recording', ecgChart.xAxis[0].toPixels(ecgChart.xAxis[0].getExtremes().max) - 1465, 10, null, { fill: '#22457c', style: { color: 'white', } }, { fill: '#162947', style: { color: 'white', } }, { fill: '#535453', style: { color: 'white', } }, { fill: '#eeeeee', style: { color: 'white', } }).attr({ class: 'saveBtn' }).css({ class: 'saveBtn', color: 'white', id: 'confirm', cursor: 'pointer' });
                                    var saveRecordingButton = ecgChart.renderer.button('Clip Recording', ecgChart.xAxis[0].toPixels(ecgChart.xAxis[0].getExtremes().max) - 1565, 10, null, { fill: '#22457c', style: { color: 'white', } }, { fill: '#162947', style: { color: 'white', } }, { fill: '#535453', style: { color: 'white', } }, { fill: '#eeeeee', style: { color: 'white', } }).attr({ class: 'saveBtn' }).css({ class: 'saveBtn', color: 'white', id: 'confirm', cursor: 'pointer' });
                                    saveRecordingButton.setState(saveBtnCurrentState);
                                    vm.referRecordingBtn = referRecordingButton;
                                    vm.flagRecordingBtn = flagRecordingButton;
                                    vm.saveRecordingBtn = saveRecordingButton;
                                    saveRecordingButton.setState(saveBtnCurrentState);
                                    flagRecordingButton.on('click', function(e){
                                        if(flagRecordingButton.state == 3)
                                            return false;

                                        vm.isFlaggingStrip = true;
                                    });
                                    referRecordingButton.on('click', function(e) {
                                        var svg = ecgChart.getSVG();
                                        var image = btoa(unescape(encodeURIComponent(svg)));
                                        vm.$dispatch('refer-strip', {image: image});
                                    });
                                    if(vm.alerts !== null)
                                        flagRecordingButton.setState(3);

                                    if(vm.additional_data.is_clipped !== null)
                                        saveRecordingButton.setState(3);
                                    else
                                        saveRecordingButton.setState(0)

                                    saveRecordingButton.on('click', function(e){
                                        if(saveRecordingButton.state == 3)
                                            return false;

                                        saveRecordingButton.setState(3);
                                        vm.saveRecordingToStrips();
                                    });
                                    saveRecordingButton.add();
                                    referRecordingButton.add();
                                    flagRecordingButton.add();
                                }
                                else if(window.User.roles.id == 6) {
                                    $(".intepretBtn").remove();
                                    $(".reviewBtn").remove();
                                    var interpretRecordingButton = ecgChart.renderer.button('Add Interpretation', ecgChart.xAxis[0].toPixels(ecgChart.xAxis[0].getExtremes().max) - 750, 10, null, { fill: '#22457c', style: { color: 'white', } }, { fill: '#162947', style: { color: 'white', } }, { fill: '#535453', style: { color: 'white', } }, { fill: '#eeeeee', style: { color: 'white', } }).attr({ class: 'intepretBtn' }).css({ class: 'intepretBtn', color: 'white', id: 'confirm', cursor: 'pointer' });
                                    var markStripAsReviewedButton = ecgChart.renderer.button('Mark Strip As Reviewed', ecgChart.xAxis[0].toPixels(ecgChart.xAxis[0].getExtremes().max) - 900, 10, null, { fill: '#22457c', style: { color: 'white', } }, { fill: '#162947', style: { color: 'white', } }, { fill: '#535453', style: { color: 'white', } }, { fill: '#eeeeee', style: { color: 'white', } }).attr({ class: 'reviewBtn' }).css({ class: 'reviewBtn', color: 'white', id: 'confirm', cursor: 'pointer' });
                                    vm.markStripAsReviewedButton = markStripAsReviewedButton;
                                    vm.interpretRecordingButton = interpretRecordingButton;
                                    interpretRecordingButton.add();
                                    markStripAsReviewedButton.add();

                                    if(vm.alerts !== null)
                                        markStripAsReviewedButton.setState(0);
                                    else
                                        markStripAsReviewedButton.setState(3);

                                    interpretRecordingButton.on('click', function(e){
                                        if(interpretRecordingButton.state == 3)
                                            return false;

                                        vm.isInterpretingRecording = true;
                                    });
                                    markStripAsReviewedButton.on('click', function(e){
                                        vm.markStripAsReviewed();
                                    });
                                }

                                var confirmMeasurementButton = ecgChart.renderer.button('Confirm Measurement', 133, 10, null, { fill: '#22457c', style: { color: 'white', } }, { fill: '#162947', style: { color: 'white', } }, { fill: '#535453', style: { color: 'white', } }, { fill: '#eeeeee', style: { color: 'white', } }).attr({ class: 'confirmBtn' }).css({ color: 'white', id: 'confirm', cursor: 'pointer' });
                                var prevStripButton = ecgChart.renderer.button('Prev. Recording', ecgChart.xAxis[0].toPixels(ecgChart.xAxis[0].getExtremes().max) - 300, 10, null, { fill: '#22457c', style: { color: 'white', } }, { fill: '#162947', style: { color: 'white', } }, { fill: '#535453', style: { color: 'white', } }, { fill: '#eeeeee', style: { color: 'white', } }).attr({ class: 'prevStripBtn' }).css({ class: 'prevStripBtn', color: 'white', id: 'confirm', cursor: 'pointer' });
                                var nextStripButton = ecgChart.renderer.button('Next Recording', ecgChart.xAxis[0].toPixels(ecgChart.xAxis[0].getExtremes().max) - 195, 10, null, { fill: '#22457c', style: { color: 'white', } }, { fill: '#162947', style: { color: 'white', } }, { fill: '#535453', style: { color: 'white', } }, { fill: '#eeeeee', style: { color: 'white', } }).attr({ class: 'nextStripBtn' }).css({ class: 'nextStripBtn', color: 'white', id: 'confirm', cursor: 'pointer' });

                                confirmMeasurementButton.setState(confirmBtnCurrentState);
                                vm.confirmMeasurementBtn = confirmMeasurementButton;
                                vm.saveRecordingBtn = saveRecordingButton;
                                vm.prevStripBtn = prevStripButton;
                                vm.nextStripBtn = nextStripButton;

                                var QrsMeasureButton = ecgChart.renderer.button('QRS', 5, 10, null,{fill: '#ef563b',style:{color: 'white',}},{fill:'#BF3C24',style:{color: 'white',}},{fill: '#ef563b',style:{color:'white',}},{fill: '#a5a8a3',style:{color: 'white',}}).css({color: 'white', id: 'qrs', cursor: 'pointer', zIndex: 12});
                                var QtMeasureButton = ecgChart.renderer.button('QT', 42, 10, null,{fill: '#505fe5',style:{color: 'white',}},{fill: '#7F8BF5',style:{color: 'white',}},{fill: '#505fe5',style:{color:'white',}},{fill: '#a5a8a3',style:{color: 'white',}}).css({color: 'white', id: 'qt', cursor: 'pointer', zIndex: 12});
                                var PrMeasureButton = ecgChart.renderer.button('PR', 72, 10, null,{fill: '#F78922',style:{color:'white',}},{ fill:'#EDAA6B',style:{color: 'white',}},{fill:'#F78922',style:{color:'white',}},{fill:'#a5a8a3',style:{color:'white',}}).css({color: 'white', id: 'pr', cursor: 'pointer', zIndex: 12});
                                var RrMeasureButton = ecgChart.renderer.button('RR', 102, 10, null,{fill:'#c542f4',style:{color:'white',}},{ fill:'#D67FF5',style:{color:'white',}},{ fill:'#c542f4',style:{color:'white',}},{ fill:'#a5a8a3',style:{color:'white',}}).css({color: 'white', id: 'rr', cursor: 'pointer', zIndex: 12});
                                vm.prMeasurementBtn = PrMeasureButton;
                                vm.qrsMeasurementBtn = QrsMeasureButton;
                                vm.qtMeasurementBtn = QtMeasureButton;
                                vm.rrMeasurementBtn = RrMeasureButton;

                                vm.confirmMeasurementBtn = confirmMeasurementButton;
                                vm.prMeasurementBtn = PrMeasureButton;
                                vm.qrsMeasurementBtn = QrsMeasureButton;
                                vm.qtMeasurementBtn = QtMeasureButton;
                                vm.rrMeasurementBtn = RrMeasureButton;
                                vm.prevStripBtn = prevStripButton;
                                vm.nextStripBtn = nextStripButton;
                                prevStripButton.on('click', function(e) {
                                    vm.nextStrip();
                                });
                                nextStripButton.on('click', function(e) {
                                    vm.prevStrip();
                                });

                                // Pr Measure Event
                                PrMeasureButton.on('click', function(e) {
                                    if(PrMeasureButton.state == 3)
                                        return false;
                                    else if(PrMeasureButton.state == 2) {
                                        PrMeasureButton.setState(0);
                                        QrsMeasureButton.setState(0);
                                        QtMeasureButton.setState(0);
                                        RrMeasureButton.setState(0);
                                        vm.setMeasurement('false');
                                    }
                                    else {
                                        PrMeasureButton.setState(2);
                                        QrsMeasureButton.setState(3);
                                        QtMeasureButton.setState(3);
                                        RrMeasureButton.setState(3);
                                        vm.setMeasurement('pr');
                                    }
                                });

                                // Qrs Measure Event
                                QrsMeasureButton.on('click', function(e){
                                    if(QrsMeasureButton.state == 3)
                                        return false;
                                    else if(QrsMeasureButton.state == 2) {
                                        QrsMeasureButton.setState(0);
                                        PrMeasureButton.setState(0);
                                        QtMeasureButton.setState(0);
                                        RrMeasureButton.setState(0);
                                        vm.setMeasurement('false');
                                    }
                                    else {
                                        QrsMeasureButton.setState(2);
                                        PrMeasureButton.setState(3);
                                        QtMeasureButton.setState(3);
                                        RrMeasureButton.setState(3);
                                        vm.setMeasurement('qrs');
                                    }

                                });

                                // Qt Measure Event
                                QtMeasureButton.on('click', function(e){
                                    if(QtMeasureButton.state == 3)
                                        return false;
                                    else if(QtMeasureButton.state == 2) {
                                        QtMeasureButton.setState(0);
                                        PrMeasureButton.setState(0);
                                        QrsMeasureButton.setState(0);
                                        RrMeasureButton.setState(0);
                                        vm.setMeasurement('qt');
                                    }
                                    else {
                                        QtMeasureButton.setState(2);
                                        PrMeasureButton.setState(3);
                                        QrsMeasureButton.setState(3);
                                        RrMeasureButton.setState(3);
                                        vm.setMeasurement('qt');
                                    }
                                });

                                RrMeasureButton.on('click', function(e){
                                    if(RrMeasureButton.state == 3)
                                        return false;
                                    else if(RrMeasureButton.state == 2) {
                                        QtMeasureButton.setState(0);
                                        PrMeasureButton.setState(0);
                                        QrsMeasureButton.setState(0);
                                        RrMeasureButton.setState(0);
                                        vm.setMeasurement('false');
                                    }
                                    else {
                                        RrMeasureButton.setState(2);
                                        QtMeasureButton.setState(3);
                                        PrMeasureButton.setState(3);
                                        QrsMeasureButton.setState(3);
                                        vm.setMeasurement('rr');
                                    }
                                });

                                // Confirm the measurement event
                                confirmMeasurementButton.on('click', function(e) {
                                    if(confirmMeasurementButton.state == 3)
                                        return false;
                                    vm.submitCaliperRemeasurement();
                                });
                                PrMeasureButton.add();
                                QrsMeasureButton.add();
                                QtMeasureButton.add();
                                RrMeasureButton.add();

                                confirmMeasurementButton.on('click', function(e) {
                                    if(confirmMeasurementButton.state == 3)
                                        return false;
                                    vm.submitCaliperRemeasurement();
                                });
                                prevStripButton.on('click', function(e) {
                                    vm.nextStrip();
                                });
                                nextStripButton.on('click', function(e) {
                                    vm.prevStrip();
                                });
                                confirmMeasurementButton.add();
                                prevStripButton.add();
                                nextStripButton.add();

                                if(vm.paths.length > 0) {
                                    var measurements = [];
                                    _.each(vm.paths, function(path){
                                        if(path.type == 'pr') {
                                            vm.topOffset =  135;
                                            var verticalLine = vm.topOffset + 95;
                                        } else if(path.type == 'qrs') {
                                            vm.topOffset = 100;
                                            var verticalLine = vm.topOffset + 125;
                                        } else if(path.type == 'qt') {
                                            vm.topOffset = 210;
                                            var verticalLine = vm.topOffset - 80;
                                        } else if(path.type == 'rr') {
                                            vm.topOffset = 275;
                                            var verticalLine = vm.topOffset - 100;
                                        }

                                        var measurementStart = ecgChart.renderer.path(['M', ecgChart.xAxis[0].toPixels(path.start), vm.topOffset, 'V', vm.topOffset, verticalLine])
                                                .attr({
                                                    'stroke-width': 2,
                                                    stroke: '#ccc',
                                                    class: 'measurement-start measurement-start-'+path.id,
                                                    zIndex: 8,
                                                    dashstyle: 'dash'
                                                });
                                        measurementStart.add();

                                        var measurementEnd = ecgChart.renderer.path(['M', ecgChart.xAxis[0].toPixels(path.end), vm.topOffset, 'V', vm.topOffset, verticalLine])
                                                .attr({
                                                    'stroke-width': 2,
                                                    stroke: '#ccc',
                                                    class: 'measurement-end measurement-end-'+path.id,
                                                    zIndex: 8,
                                                    dashstyle: 'dash'
                                                });
                                        measurementEnd.add();

                                        var measurement = ecgChart.renderer.path(['M', ecgChart.xAxis[0].toPixels(path.start), vm.topOffset, 'L', ecgChart.xAxis[0].toPixels(path.end), vm.topOffset])
                                                .attr({
                                                    fill: path.color,
                                                    'stroke-width': 4,
                                                    stroke: path.color,
                                                    zIndex: 6,
                                                    class: 'measurement measurement-'+path.id
                                                }).on('click', function(){
                                                    ecgChart.xAxis[0].removePlotLine('caliper-start');
                                                    ecgChart.xAxis[0].removePlotLine('caliper-end');
                                                    var type = path.type;
                                                    if(type == 'pr') {
                                                        vm.prMeasurementBtn.setState(2);
                                                        vm.qrsMeasurementBtn.setState(3);
                                                        vm.qtMeasurementBtn.setState(3);
                                                        vm.rrMeasurementBtn.setState(3);
                                                    } else if(type == 'qrs') {
                                                        vm.qrsMeasurementBtn.setState(2);
                                                        vm.prMeasurementBtn.setState(3);
                                                        vm.qtMeasurementBtn.setState(3);
                                                        vm.rrMeasurementBtn.setState(3);
                                                    } else if(type == 'qt') {
                                                        vm.qtMeasurementBtn.setState(2);
                                                        vm.prMeasurementBtn.setState(3);
                                                        vm.qrsMeasurementBtn.setState(3);
                                                        vm.rrMeasurementBtn.setState(3);
                                                    } else if(type == 'rr') {
                                                        vm.rrMeasurementBtn.setState(2);
                                                        vm.prMeasurementBtn.setState(3);
                                                        vm.qrsMeasurementBtn.setState(3);
                                                        vm.qtMeasurementBtn.setState(3);
                                                    }
                                                    vm.confirmMeasurementBtn.setState(0);
                                                    vm.isRemeasuring = type;
                                                    vm.isEditing = path.id;
                                                    vm.setCaliperStartPoint(path.start);
                                                    vm.setCaliperEndPoint(path.end);
                                                });

                                        if(path.type == 'pr') {
                                            var measurementText = 'ms';
                                        } else if(path.type == 'qrs') {
                                            var measurementText = 'ms';
                                        } else if(path.type == 'qt') {
                                            var measurementText = 'ms';
                                        } else if(path.type == 'rr') {
                                            var measurementText = 'bpm';
                                        }

                                        if(path.type == 'rr') {
                                            var textStart = ecgChart.renderer.text(
                                                    path.type.toUpperCase() + ' - ' + Math.round(60/(path.end - path.start)*1000) + measurementText,
                                                    ecgChart.xAxis[0].toPixels(path.start - 15),
                                                    (vm.topOffset - 10)
                                            ).attr({
                                                zIndex: 6,
                                                class: 'measurement-text text-for-' + path.id,
                                            });
                                        } else {
                                            var textStart = ecgChart.renderer.text(
                                                    path.type.toUpperCase() + ' - ' + (path.end - path.start) + measurementText,
                                                    ecgChart.xAxis[0].toPixels(path.start - 15),
                                                    (vm.topOffset - 10)
                                            ).attr({
                                                zIndex: 6,
                                                class: 'measurement-text text-for-' + path.id,
                                            });
                                        }

                                        measurement.add();
                                        textStart.add();
                                        measurements.push({
                                            'start': path.start,
                                            'end': path.end,
                                            'y': vm.topOffset,
                                            'id': path.id,
                                            'type': path.type,
                                            'length:': (path.end - path.start),
                                            'color': path.color
                                        });
                                    });
                                    vm.paths = [];
                                    vm.paths = measurements;
                                }
                            }
                        },
                        panning: false,
                    },
                    navigator: {
                        enabled: false,
                        //margin: 1,
                        //maskFill: "rgba(255,255,255,0.3)"
                    },
                    scrollbar: {
                        enabled: true
                    },
                    labels:{
                        enabled: true
                    },
                    credits: {
                        enabled: false
                    },
                    rangeSelector: {
                        selected: 0,
                        inputEnabled: false,
                        buttonTheme: {
                            visibility: 'hidden'
                        },
                        labelStyle: {
                            visibility: 'hidden'
                        }
                    },
                    plotOptions: {
                        spline: {
                            dataGrouping: {enabled: false },
                            turboThreshold: 9999999999999999999,
                            lineWidth: 3,
                            states: {
                                hover: {
                                    enabled: true,
                                }
                            },
                        },
                        series: {
                            marker: {
                                states: {
                                    hover: {
                                        enabled: false
                                    }
                                }
                            }
                        },
                        scatter: {
                            dataGrouping: {enabled: false },
                            enabled: true,
                            marker: {
                                class: 'guttered'
                            }
                        },
                    },
                    title: {
                        text: ''
                    },
                    legend: {
                        enabled: false
                    },
                    xAxis: {
                    labels: {align: "left",// Format the labels for milliseconds in the thousands
                        formatter: function () {
                            var label = this.value / 1000;
                            if (this.value % 1000 == 0) {
                                label = label + "k";
                            }
                            else {
                                label = '';
                            }
                            return label;
                        }
                    },
                    gridLineWidth: 1,
                    minorGridLineWidth: 1,
                    lineColor: 'transparent',
                    tickLength: 1
                    },
                    yAxis: {
                        gridLineWidth: 1,
                        minorGridLineWidth: 1,
                        gridLineColor: 'transparent',
                        visible: false,
                        lineColor: 'transparent',
                        tickLength: 1
                    },
                    tooltip: {
                        shared: false,
                        useHTML: true,
                        formatter: function() {
                            if(this.series.color == "#43ac6a") {
                                return false;
                                //var readable = vm.convertMillisecondsToReadable(this.x);
                                //return '<i class="ss-clock"></i> <span class="margin-left:25px;">' + readable + ' ms - ' + this.y + '</span>';
                            }
                            else if(this.series.color == '#505fe5' || this.series.color == '#f78922' || this.series.color == '#ef563b' || this.series.color == '#c542f4') {
                                if(this.series.color == '#505fe5')
                                    var measurement = 'qt';
                                else if(this.series.color == '#f78922')
                                    var measurement = 'pr';
                                else if(this.series.color == '#ef563b')
                                    var measurement = 'qrs';
                                else if(this.series.color == '#c542f4')
                                    var measurement = 'rr';
                                var measurementStart = (this.series.data[0].x / 1000);
                                var measurementEnd = (this.series.data.slice(-1).pop().x / 1000);
                                return false;
                                //return '<i class="ss-rulerpencil"></i> <span class="margin-left:25px;">' + measurement.toUpperCase() + ' measurement from ' + measurementStart + 's to ' + measurementEnd + 's</span>';
                            }
                            else {
                                var readable = moment(this.x).format('s');
                                if(this.point.reported  == 'Audo submission') {
                                    return  '<span class="margin-left:25px;">' + this.point.audio_recording +' </span>'
                                } else {
                                    return '<i class="ss-user"></i> <span class="margin-left:25px;">Reported  ' + this.point.reported + ' at ' + readable + 's</span>'
                                }
                            }
                        }
                    },
                    scrollbar: {
                        barBackgroundColor: '#649fcb',
                        barBorderRadius: 0,
                        barBorderWidth: 0,
                        buttonBackgroundColor: '#22457c',
                        buttonBorderWidth: 0,
                        buttonBorderRadius: 0,
                        trackBackgroundColor: '#fefefe',
                        trackBorderWidth: 1,
                        trackBorderRadius: 8,
                        trackBorderColor: '#CCC',
                        buttonArrowColor: '#FFF',
                    },
                    series: [
                        /**
                         * ECG recorded data
                         */
                        {
                            name: 'ECG Data',
                            data: this.data,
                            color: '#43ac6a',
                            hoverAnimation: false,
                            showSymbol: false,
                            tooltip: {
                                enabled: false
                            },
                            point: {
                                events: {
                                    click: function (event) {
                                        if(vm.isRemeasuring === false) {
                                            alert("Please select a type of measurement");
                                        } else {
                                            if(!vm.caliperStartPoint && !vm.caliperEndPoint) {
                                                vm.setCaliperStartPoint(event.point.category, true);
                                            } else if(vm.caliperStartPoint && !vm.caliperEndPoint) {
                                                vm.setCaliperEndPoint(event.point.category, true);
                                            } else if(vm.caliperStartPoint && vm.caliperEndPoint) {
                                                ecgChart.xAxis[0].removePlotLine('caliper-start');
                                                ecgChart.xAxis[0].removePlotLine('caliper-end');
                                                vm.caliperStartPoint = false;
                                                vm.caliperEndPoint = false;
                                                vm.clickXStart = false;
                                                vm.clickXEnd = false;
                                                vm.stripClip = false;
                                                vm.draggableEndPoint = false;
                                                vm.draggableStartPoint = false;
                                                vm.caliperEndObject = false;
                                                vm.caliperStartObject = false;
                                                vm.confirmMeasurementBtn.setState(3);
                                                ecgChart.series[2].remove();
                                                vm.setCaliperStartPoint(event.point.category);
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        /**
                         * Patient Reported Events scatter plot set at the minimum yAxis
                         */
                        {
                            type: 'scatter',
                            showSymbol: false,
                            name: 'Reported Events',
                            data: this.reported
                        }],
                    exporting: {
                        buttons: {
                            contextButton: {
                                enabled: false
                            }
                        },
                        sourceHeight: 400,
                        sourceWidth: 1200
                    }
                });


                var QrsMeasureButton = ecgChart.renderer.button('QRS', 5, 10, null,{fill: '#ef563b',style:{color: 'white',}},{fill:'#BF3C24',style:{color: 'white',}},{fill: '#ef563b',style:{color:'white',}},{fill: '#a5a8a3',style:{color: 'white',}}).css({color: 'white', id: 'qrs', cursor: 'pointer', zIndex: 12});
                var QtMeasureButton = ecgChart.renderer.button('QT', 42, 10, null,{fill: '#505fe5',style:{color: 'white',}},{fill: '#7F8BF5',style:{color: 'white',}},{fill: '#505fe5',style:{color:'white',}},{fill: '#a5a8a3',style:{color: 'white',}}).css({color: 'white', id: 'qt', cursor: 'pointer', zIndex: 12});
                var PrMeasureButton = ecgChart.renderer.button('PR', 72, 10, null,{fill: '#F78922',style:{color:'white',}},{ fill:'#EDAA6B',style:{color: 'white',}},{fill:'#F78922',style:{color:'white',}},{fill:'#a5a8a3',style:{color:'white',}}).css({color: 'white', id: 'pr', cursor: 'pointer', zIndex: 12});
                var RrMeasureButton = ecgChart.renderer.button('RR', 102, 10, null,{fill:'#c542f4',style:{color:'white',}},{ fill:'#D67FF5',style:{color:'white',}},{ fill:'#c542f4',style:{color:'white',}},{ fill:'#a5a8a3',style:{color:'white',}}).css({color: 'white', id: 'rr', cursor: 'pointer', zIndex: 12});
                var confirmMeasurementButton = ecgChart.renderer.button('Confirm Measurement', 133, 10, null, {fill: '#22457c', style: { color: 'white', } }, { fill: '#162947', style: { color: 'white', } }, { fill: '#535453', style: { color: 'white', } }, { fill: '#eeeeee', style: { color: 'white', } }).attr({ class: 'confirmBtn' }).css({ class: 'confirmBtn', color: 'white', id: 'confirm', cursor: 'pointer' });
                if(window.User.roles.id !== 6) {
                    var flagRecordingButton = ecgChart.renderer.button('Flag Recording', ecgChart.xAxis[0].toPixels(ecgChart.xAxis[0].getExtremes().max) - 1665, 10, null, { fill: '#22457c', style: { color: 'white', } }, { fill: '#162947', style: { color: 'white', } }, { fill: '#535453', style: { color: 'white', } }, { fill: '#eeeeee', style: { color: 'white', } }).attr({ class: 'saveBtn' }).css({ class: 'saveBtn', color: 'white', id: 'confirm', cursor: 'pointer' });
                    var referRecordingButton = ecgChart.renderer.button('Refer Recording', ecgChart.xAxis[0].toPixels(ecgChart.xAxis[0].getExtremes().max) - 1465, 10, null, { fill: '#22457c', style: { color: 'white', } }, { fill: '#162947', style: { color: 'white', } }, { fill: '#535453', style: { color: 'white', } }, { fill: '#eeeeee', style: { color: 'white', } }).attr({ class: 'saveBtn' }).css({ class: 'saveBtn', color: 'white', id: 'confirm', cursor: 'pointer' });
                    var saveRecordingButton = ecgChart.renderer.button('Clip Recording', ecgChart.xAxis[0].toPixels(ecgChart.xAxis[0].getExtremes().max) - 1565, 10, null, { fill: '#22457c', style: { color: 'white', } }, { fill: '#162947', style: { color: 'white', } }, { fill: '#535453', style: { color: 'white', } }, { fill: '#eeeeee', style: { color: 'white', } }).attr({ class: 'saveBtn' }).css({ class: 'saveBtn', color: 'white', id: 'confirm', cursor: 'pointer' });
                    if(vm.additional_data.is_clipped !== null)
                        saveRecordingButton.setState(3);
                    else
                        saveRecordingButton.setState(0);

                    vm.saveRecordingBtn = saveRecordingButton;
                    vm.flagRecordingBtn = flagRecordingButton;
                    vm.referRecordingBtn = referRecordingButton;
                    referRecordingButton.on('click', function(e) {
                        var svg = ecgChart.getSVG();
                        var image = btoa(unescape(encodeURIComponent(svg)));
                        vm.$dispatch('refer-strip', {image: image});
                    });
                    flagRecordingButton.on('click', function(e) {
                        if(flagRecordingButton.state == 3)
                            return false;

                        vm.isFlaggingStrip = true;
                    });
                    saveRecordingButton.on('click', function(e){
                        if(saveRecordingButton.state == 3)
                            return false;

                        saveRecordingButton.setState(3);
                        vm.saveRecordingToStrips(e);
                    });
                    if(vm.alerts !== null)
                        flagRecordingButton.setState(3);

                    var zoomGraphButton = ecgChart.renderer.button('Zoom x100%',  ecgChart.xAxis[0].toPixels(ecgChart.xAxis[0].getExtremes().max) - 1318, 10, null,  {fill: '#22457c', style: { color: 'white', } }, { fill: '#162947', style: { color: 'white', } }, { fill: '#535453', style: { color: 'white', } }, { fill: '#eeeeee', style: { color: 'white', } }).attr({ class: 'zoomBtn' }).css({ class: 'zoomBtn', color: 'white', id: 'zoom', cursor: 'pointer' });
                    var zoomGraphButtonX2 = ecgChart.renderer.button('Zoom x200%', ecgChart.xAxis[0].toPixels(ecgChart.xAxis[0].getExtremes().max) - 1238, 10, null,  {fill: '#22457c', style: { color: 'white', } }, { fill: '#162947', style: { color: 'white', } }, { fill: '#535453', style: { color: 'white', } }, { fill: '#eeeeee', style: { color: 'white', } }).attr({ class: 'zoomBtn' }).css({ class: 'zoomBtn', color: 'white', id: 'zoom', cursor: 'pointer' });
                    var zoomGraphButtonX3 = ecgChart.renderer.button('Zoom x400%', ecgChart.xAxis[0].toPixels(ecgChart.xAxis[0].getExtremes().max) - 1148, 10, null, {fill: '#22457c', style: { color: 'white', } }, { fill: '#162947', style: { color: 'white', } }, { fill: '#535453', style: { color: 'white', } }, { fill: '#eeeeee', style: { color: 'white', } }).attr({ class: 'zoomBtn' }).css({ class: 'zoomBtn', color: 'white', id: 'zoom', cursor: 'pointer' });


                    vm.zoomGraphBtn = zoomGraphButton;
                    vm.zoomGraphBtnX2 = zoomGraphButtonX2;
                    vm.zoomGraphBtnX3 = zoomGraphButtonX3;

                    zoomGraphButton.on('click', function(e) {
                        if(zoomGraphButton.state != 3) {
                            zoomGraphButton.setState(3);
                            zoomGraphButtonX2.setState(0);
                            zoomGraphButtonX3.setState(0);
                            $(".graph-fill").remove();
                            vm.zoomLevel = 0;
                            ecgChart.xAxis[0].setExtremes(null,null);
                            ecgChart.redraw();
                        }
                    });

                    zoomGraphButtonX2.on('click', function(e) {
                        if(zoomGraphButtonX2.state != 3) {
                            zoomGraphButtonX2.setState(3);
                            zoomGraphButton.setState(0);
                            zoomGraphButtonX3.setState(0);
                            var max = 1980 / .5;
                            var min = 0;
                            $(".graph-fill").remove();
                            vm.zoomLevel = 1;
                            ecgChart.xAxis[0].setExtremes(min, max);
                            ecgChart.redraw();
                        }
                    })

                    zoomGraphButtonX3.on('click', function(e) {
                        if(zoomGraphButtonX3.state != 3) {
                            zoomGraphButtonX3.setState(3);
                            zoomGraphButton.setState(0);
                            zoomGraphButtonX2.setState(0);
                            var max = 1980 / .75;
                            var min = 0;
                            $(".graph-fill").remove();
                            vm.graphfill = false;
                            vm.zoomLevel = 2;
                            ecgChart.xAxis[0].setExtremes(min,max);
                            ecgChart.redraw();
                        }
                    })

                    zoomGraphButton.setState(3);

                    zoomGraphButton.add();
                    zoomGraphButtonX2.add();
                    zoomGraphButtonX3.add();
                    saveRecordingButton.add();
                    referRecordingButton.add();
                    flagRecordingButton.add();

                }
                else if(window.User.roles.id == 6) {
                    var interpretRecordingButton = ecgChart.renderer.button('Add Interpretation', ecgChart.xAxis[0].toPixels(ecgChart.xAxis[0].getExtremes().max) - 750, 10, null, { fill: '#22457c', style: { color: 'white', } }, { fill: '#162947', style: { color: 'white', } }, { fill: '#535453', style: { color: 'white', } }, { fill: '#eeeeee', style: { color: 'white', } }).attr({ class: 'intepretBtn' }).css({ class: 'intepretBtn', color: 'white', id: 'confirm', cursor: 'pointer' });
                    var markStripAsReviewedButton = ecgChart.renderer.button('Mark Strip As Reviewed', ecgChart.xAxis[0].toPixels(ecgChart.xAxis[0].getExtremes().max) - 900, 10, null, { fill: '#22457c', style: { color: 'white', } }, { fill: '#162947', style: { color: 'white', } }, { fill: '#535453', style: { color: 'white', } }, { fill: '#eeeeee', style: { color: 'white', } }).attr({ class: 'reviewBtn' }).css({ class: 'reviewBtn', color: 'white', id: 'confirm', cursor: 'pointer' });
                    vm.markStripAsReviewedButton = markStripAsReviewedButton;
                    vm.interpretRecordingButton = interpretRecordingButton;
                    markStripAsReviewedButton.add();
                    interpretRecordingButton.add();

                    if(vm.alerts !== null)
                        markStripAsReviewedButton.setState(0);
                    else
                        markStripAsReviewedButton.setState(3);

                    interpretRecordingButton.on('click', function(e){
                        if(interpretRecordingButton.state == 3)
                            return false;

                        vm.isInterpretingRecording = true;
                    });
                    markStripAsReviewedButton.on('click', function(e){
                        vm.markStripAsReviewed();
                    });
                }

                var prevStripButton = ecgChart.renderer.button('<i class="fa fa-chevron-left"></i> Prev. Recording',
                        ecgChart.xAxis[0].toPixels(ecgChart.xAxis[0].getExtremes().max) - 300, 10, null,
                        {fill: '#22457c', style: { color: 'white', }},
                        {fill: '#999', style: { color: 'white', }},
                        {fill: '#22457c', style: { color: 'white', }},
                        {fill: '#eeeeee', style: { color: 'white', }})
                        .attr({
                            label: {
                                useHTML: true
                            },
                            class: 'prevStripBtn'
                        })
                        .css({
                            class: 'prevStripBtn',
                            color: 'white', id: 'confirm', cursor: 'pointer' });

                var nextStripButton = ecgChart.renderer.button('<i class="fa fa-chevron-right"></i> Next Recording',
                        ecgChart.xAxis[0].toPixels(ecgChart.xAxis[0].getExtremes().max) - 195, 10, null,
                        {fill: '#22457c', style: { color: 'white',}},
                        {fill: '#999', style: { color: 'white',}},
                        {fill: '#22457c', style: { color: 'white',}},
                        {fill: '#eeeeee', style: { color: 'white',}})
                        .attr({
                            label: {
                                useHTML: true
                            },
                            class: 'nextStripBtn'
                        })
                        .css({
                            class: 'nextStripBtn',
                            color: 'white',
                            id: 'confirm',
                            cursor: 'pointer'
                        });
                confirmMeasurementButton.setState(3);

                vm.confirmMeasurementBtn = confirmMeasurementButton;
                vm.prMeasurementBtn = PrMeasureButton;
                vm.qrsMeasurementBtn = QrsMeasureButton;
                vm.qtMeasurementBtn = QtMeasureButton;
                vm.rrMeasurementBtn = RrMeasureButton;
                vm.prevStripBtn = prevStripButton;
                vm.nextStripBtn = nextStripButton;
                prevStripButton.on('click', function(e) {
                    vm.nextStrip();
                });
                nextStripButton.on('click', function(e) {
                    vm.prevStrip();
                });

                // Pr Measure Event
                PrMeasureButton.on('click', function(e) {
                    if(PrMeasureButton.state == 3)
                        return false;
                    else if(PrMeasureButton.state == 2) {
                        PrMeasureButton.setState(0);
                        QrsMeasureButton.setState(0);
                        QtMeasureButton.setState(0);
                        RrMeasureButton.setState(0);
                        vm.setMeasurement('false');
                    }
                    else {
                        PrMeasureButton.setState(2);
                        QrsMeasureButton.setState(3);
                        QtMeasureButton.setState(3);
                        RrMeasureButton.setState(3);
                        vm.setMeasurement('pr');
                    }
                });

                // Qrs Measure Event
                QrsMeasureButton.on('click', function(e){
                    if(QrsMeasureButton.state == 3)
                        return false;
                    else if(QrsMeasureButton.state == 2) {
                        QrsMeasureButton.setState(0);
                        PrMeasureButton.setState(0);
                        QtMeasureButton.setState(0);
                        RrMeasureButton.setState(0);
                        vm.setMeasurement('false');
                    }
                    else {
                        QrsMeasureButton.setState(2);
                        PrMeasureButton.setState(3);
                        QtMeasureButton.setState(3);
                        RrMeasureButton.setState(3);
                        vm.setMeasurement('qrs');
                    }

                });

                // Qt Measure Event
                QtMeasureButton.on('click', function(e){
                    if(QtMeasureButton.state == 3)
                        return false;
                    else if(QtMeasureButton.state == 2) {
                        QtMeasureButton.setState(0);
                        PrMeasureButton.setState(0);
                        QrsMeasureButton.setState(0);
                        RrMeasureButton.setState(0);
                        vm.setMeasurement('qt');
                    }
                    else {
                        QtMeasureButton.setState(2);
                        PrMeasureButton.setState(3);
                        QrsMeasureButton.setState(3);
                        RrMeasureButton.setState(3);
                        vm.setMeasurement('qt');
                    }
                });

                RrMeasureButton.on('click', function(e){
                    if(RrMeasureButton.state == 3)
                        return false;
                    else if(RrMeasureButton.state == 2) {
                        QtMeasureButton.setState(0);
                        PrMeasureButton.setState(0);
                        QrsMeasureButton.setState(0);
                        RrMeasureButton.setState(0);
                        vm.setMeasurement('false');
                    }
                    else {
                        RrMeasureButton.setState(2);
                        QtMeasureButton.setState(3);
                        PrMeasureButton.setState(3);
                        QrsMeasureButton.setState(3);
                        vm.setMeasurement('rr');
                    }
                });

                // Confirm the measurement event
                confirmMeasurementButton.on('click', function(e) {
                    if(confirmMeasurementButton.state == 3)
                        return false;
                    vm.submitCaliperRemeasurement();
                });
                PrMeasureButton.add();
                QrsMeasureButton.add();
                QtMeasureButton.add();
                RrMeasureButton.add();
                confirmMeasurementButton.add();
                prevStripButton.add();
                nextStripButton.add();
            },
        },
        components: {
            'ecg-events': EcgEventsPatient,
            'ecg-notes': EcgNotesPatient,
            'flag-recording-dialog-box': FlagRecordingDialogBox,
            'add-interpretation-dialog-box': AddInterpretationDialogBox
        },
        props: ['data', 'sampleRate', 'recording', 'notes' ,'reported', 'remeasurements', 'additional_data', 'alerts', 'audio_note']
    }
</script>

<style lang="sass">

    .graph-fill {
        z-index: 0 !important;
    }

    #prevStrip, #nextStrip {
    // display: block;
    // width: 120px;
        height: 39px;
        width: 40px;
    // border: solid 1px #000;
    // border-radius: 5px;
        font-size: 12px;
    // text-align: center;
    // margin-bottom: -15px;
        color: #fff;
    i {
        font-size: 30px;
        margin: 0 10px;
    }
    // background-image: -webkit-linear-gradient(top,#337ab7 0,#265a88 100%);
    // background-image: -o-linear-gradient(top,#337ab7 0,#265a88 100%);
    // background-image: -webkit-gradient(linear,left top,left bottom,from(#337ab7),to(#265a88));
    // background-image: linear-gradient(to bottom,#337ab7 0,#265a88 100%);
    // filter: progid:DXImageTransform.Microsoft.gradient(startColorstr='#ff337ab7', endColorstr='#ff265a88', GradientType=0);
    // filter: progid:DXImageTransform.Microsoft.gradient(enabled=false);
    // background-repeat: repeat-x;
    &:hover {
     // background-color: #265a88;
     // background-position: 0 -15px;
     }
    cursor: pointer;
    z-index: 1;
    }

    #prevStrip {
        padding-right: 3px;
    //float: left;
        position: absolute;
        top: 8px;
        left: 8px;
    &::before {
         content: "\F0D9";
         display: inline-block;
         font: normal normal normal 14px/1 FontAwesome;
         font-size: inherit;
         text-rendering: auto;
         -webkit-font-smoothing: antialiased;
         -moz-osx-font-smoothing: grayscale;
         font-size: 30px;
     // margin: 0 10px 0 0;
     // position: relative;
     // top: -1px;
         font-size: 30px;
         margin: 0 12px 0 0;
         position: relative;
         top: -4px;
     }
    span {
        display: none;
    }
    }

    #nextStrip {
        position: absolute;
        top: 8px;
        left: 49px;
        z-index: 1;
    &::after {
         content: "\f0da";
         display: inline-block;
         font: normal normal normal 14px/1 FontAwesome;
         font-size: inherit;
         text-rendering: auto;
         -webkit-font-smoothing: antialiased;
         -moz-osx-font-smoothing: grayscale;
     // font-size: 30px;
     // margin: 0 0 0 10px;
     // position: relative;
     // top: -1px;
         font-size: 30px;
         margin: 0 0 0 2px;
         position: relative;
         top: -4px;
     }
    span {
        display: none;
    }
    }

    #recording .panel-body #recording .panel-success {
        padding: 0;
        border: none;
    }

    #recording .panel-body {
        position: relative;
    }

    .save_recording {
        margin-top: 15px;
        position: absolute;
        top: -7px;
        right: 8px;
    }

</style>



