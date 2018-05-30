<?php

namespace App\Jobs;

use Monolog\Logger;
use App\Models\Recording;
use Illuminate\Bus\Queueable;
use League\Flysystem\Exception;
use Monolog\Handler\StreamHandler;
use Symfony\Component\Process\Process;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Contracts\Queue\ShouldQueue;

class RenderMoneboGraph implements ShouldQueue
{
    use InteractsWithQueue, Queueable, SerializesModels;

    protected $log;
    protected $recording;
    public $rawData;

    const ECG_SAMPLE_RATE = 250;

    /**
     * Create a new job instance.
     *
     * @return void
     */
    public function __construct(Recording $recording)
    {
        $this->recording = $recording;
        $this->log = new Logger('ECGGraphLog');
        $this->log->pushHandler(new StreamHandler(storage_path().'/logs/ECGGraphs.log', Logger::INFO));
        $this->rawData = Storage::disk('local')->get('ecg_normalized_shifted/'.$this->recording->recording_hash.'.gph');
    }

    /**
     * Execute the job.
     *
     * @return void
     */
    public function handle()
    {
        $this->log->addInfo("Started graph rendering process...");
        $this->log->addInfo("Writing chart JSON file...");
        $this->log->addInfo("Capturing bad events...");
        $plotBands = $this->buildEventMap();
        if($plotBands) {
            $this->log->addInfo("Captured bad events..." . $plotBands);
            $graph_json = '{"infile":"{exporting:{sourceWidth:1200,sourceHeight:180},title:{text:\'\'},credits:{enabled:false},plotOptions:{spline:{dataGrouping:{enabled:false},turboThreshold:9999999,lineWidth:3,states:{hover:{enabled:true}}}},xAxis:{plotBands:'.$plotBands.',title:{text:\'\'},gridLineWidth:1,tickInterval:0.1,labels:{enabled:false}},yAxis:{title:{text:\'\'},gridLineWidth:1,labels:{enabled:false},allowDecimals:true,min:-0.6,max:0.7,minorTickPosition:\'inside\',minorTickWidth:1,tickInterval:0.2,startOnTick:false,plotOptions:{line:{softThreshold:false}}},labels:{items:[{html:\''.$this->recording->created_at->timezone('America/New_York')->format('m-d-Y h:i:s a').'\',style:{fontSize:\'20px\',fontFamily: \'sans-serif\',left:\'20px\',top:\'155px\',}}]},series:[{showInLegend:false,name:\'\',data:['.\Storage::disk('local')->get('raw_graph_file/'. $this->recording->recording_hash .'.gph').'],color:\'#43ac6a\'}]}"}';
        }
        else {
            $graph_json = '{"infile":"{exporting:{sourceWidth:1200,sourceHeight:180},title:{text:\'\'},credits:{enabled:false},plotOptions:{spline:{dataGrouping:{enabled:false},turboThreshold:9999999,lineWidth:3,states:{hover:{enabled:true}}}},xAxis:{title:{text:\'\'},gridLineWidth:1,tickInterval:0.1,labels:{enabled:false}},yAxis:{title:{text:\'\'},gridLineWidth:1,labels:{enabled:false},allowDecimals:true,min:-0.6,max: 0.7,minorTickPosition:\'inside\',minorTickWidth:1,tickInterval:0.2,startOnTick:false,plotOptions:{line:{softThreshold:false}}},labels:{items:[{html:\''.$this->recording->created_at->timezone('America/New_York')->format('m-d-Y h:i:s a').'\',style:{fontSize:\'20px\',fontFamily: \'sans-serif\',left:\'20px\',top:\'155px\',}}]},series:[{showInLegend:false,name:\'\',data:['.\Storage::disk('local')->get('raw_graph_file/'. $this->recording->recording_hash .'.gph').'],color:\'#43ac6a\'}]}"}';
            $this->log->addInfo("No bad events found...");
        }

        Storage::put('ecg_graphs_json/' . $this->recording->recording_hash . '.json', $graph_json);
        $process = new Process(
            'curl http://127.0.0.1:3003 -H "Content-Type: application/json" -X POST --data-binary "@'.env('PHANTOMJS_DIR').'storage/app/ecg_graphs_json/'.$this->recording->recording_hash.'.json"');
        $this->log->addNotice(json_encode($graph_json));
        $this->log->addNotice(json_encode($process));
        $process->run();
        if (!$process->isSuccessful()) {
            $this->log->addError($process->getErrorOutput());
        } else {
            $this->log->addNotice('Process Output: ' . $process->getOutput());
            Storage::put('ecg_graphs_png/' . $this->recording->recording_hash .'.png', base64_decode($process->getOutput()));
            $process = new Process('php '.env('PHANTOMJS_DIR').'/exporter/ecg_process.php '. $this->recording->recording_hash);
            try {
                $process->run();
                $this->log->addNotice('Rendered preview image to: ecg_graphs_png/' . $this->recording->recording_hash . '.png');
                $this->log->addNotice('Rendered full disclosure image to: ecg_graphs_png/' . $this->recording->recording_hash . '.png');
            } catch(Exception $e) {
                $this->log->addError($process->getErrorOutput());
            }
        }
    }

    /**
     * Build a pizza-related map
     */
    protected function buildEventMap()
    {
        $filter_events = json_decode($this->recording->events->event_payload);
        $event_json = json_decode($filter_events->events);
        $bands = [];
        
        foreach($event_json as $key => $event) {
            if ($event->ABNORMAL_EVENT == true) {
                if($event->DESCRIPTION_SHORT == "Noise")
                    continue;
                elseif($event->DESCRIPTION_SHORT == "Unclassified rhythm")
                    continue;
                elseif($event->DESCRIPTION_SHORT == "UNCLASSIFIED BEATS")
                    continue;
                $event_time = $event->MARK * 250;
                $start = $event_time - 50;
                $end = $event_time + 50;
                $this->log->addNotice($event->DESCRIPTION_SHORT . " found at " . $event->MARK);
                $addPlotBands['from'] = $start;
                $addPlotBands['to'] = $end;
                $addPlotBands['label']['text'] = $event->DESCRIPTION_SHORT;
                $addPlotBands['zIndex'] = 3;
                if ($event->DESCRIPTION_SHORT == 'AFib rapid' || $event->DESCRIPTION_SHORT == 'Pause' || $event->DESCRIPTION_SHORT == 'VT') {
                    $color = '#ef6474';
                }
                else if ($event->DESCRIPTION_SHORT == 'Mobitz I' || $event->DESCRIPTION_SHORT == 'Mobitz II' || $event->DESCRIPTION_SHORT == 'AFib slow' || $event->DESCRIPTION_SHORT == 'AFib normal' || $event->DESCRIPTION_SHORT == 'SVTA') {
                    $color = '#ffbd44';
                }
                else {
                    $color = 'transparent';
                }
                $addPlotBands['color'] = $color;
                array_push($bands, $addPlotBands);
            }
        }
        if(isset($addPlotBands)) {
            $json = json_encode($bands);
            $str = str_replace('"','\'',$json);
            return $str;
        } else {
            return false;
        }
    }

}
