<?php

namespace App\Models\ChallengeObjectives;

use DB;
use Carbon\Carbon;
use App\Models\Users\Employee;
use App\Traits\MorphObjectiveToTeamsTrait;
use App\Models\ServingsPlants\ServingsPlant;
use App\Traits\MorphObjectiveToChallengeTrait;
use App\Services\Employees\EmployeeChallengeObjectiveUpdater;

class ObjectiveServingPlant extends ObjectiveBase
{
    use MorphObjectiveToChallengeTrait, MorphObjectiveToTeamsTrait;

    protected $table = 'objective_serving_plants';

    protected $fillable = ['calc_total_method', 'sms_enabled', 'max_daily_user'];

    protected $dates = ['created_at', 'deleted_at', 'updated_at'];

    protected $display_name = 'Cups of Fruits and Vegetables';

    protected $casts = [
        'sms_enabled' => 'boolean'
    ];

    public $sms_checkin_message = 'Reply to this message with the number of cups of fruits and/or veggies that you consumed yesterday.';

    public $sms_welcome_message = 'You have enabled text messaging for a Fruit and Veggie Challenge. When the challenge begins you will receive daily text messages to log your cups of fruits/veggies from the previous day.';

    public $sms_validation_rules = [
        'body' => 'numeric|between:0,100'
    ];

    public $sms_validation_messages = [
        'body.*' => 'Your entry contained invalid data. Please ensure that you enter numbers only up to 100.'
    ];


    /*
     |----------------------------------
     | GENERAL METHODS                 |
     |----------------------------------
    */
    public function cleanSmsBodyBeforeValidation($body)
    {
        return trim(str_replace([' ', ',', 'servings', 'cups'], '', $body));
    }

    public function saveSmsSubmittedData(Employee $employee, $value, $date)
    {
        $service = app()->make(EmployeeChallengeObjectiveUpdater::class);
        $service->addOrUpdateServingsPlants($employee, ['value' => $value, 'date' => $date], 'sms');
        return true;
    }

    public function getSmsSaveSuccessMessage($total, $date)
    {
        return 'You have logged ' . $total . ' cups for ' . $date . '.';
    }

    public function getTypeAttribute()
    {
        return 'serving_plant';
    }

    public function getUnitAttribute()
    {
        return 'Cups';
    }


    public function getHistoryForEmployee(Employee $employee, Carbon $startDay, $lookbackDays)
    {
        $challenge = $this->challenge;
        $end = $startDay->copy()->subDays($lookbackDays)->toDateString();
        $start = $startDay->toDateString();

        $history = $employee->serving_plants()
            ->where('date', '>=', $challenge->date_start)
            ->whereBetween('date', [$end, $start])
            ->get();

        $allDays = collect([$startDay->copy()->toDateString()]);
        foreach (range(1, $lookbackDays) as $count) {
            $allDays->prepend($startDay->subDay()->copy()->toDateString());
        }

        $allDays->transform(function($item) use ($history) {
            $dayFromHistory = $history->where('date', $item)->first();
            return [
                'date' => $item,
                'source' => !empty($dayFromHistory->source) ? $dayFromHistory->source : '',
                'value' => !empty($dayFromHistory->value) ? $dayFromHistory->value : 0,
            ];
        });

        return $allDays;
    }


    /**
     * @param $challenge
     * @return null
     */
    public function loadStandingsAttributeForAllTeamsInChallenge($challenge)
    {
        # Check if there is a max_daily_user limitation
        $sum_query = 'SUM(serving_plants.value)';
        if (!is_null($this->max_daily_user)) {
            $sum_query = 'SUM( IF(serving_plants.value > ' . $this->max_daily_user . ', ' . $this->max_daily_user . ', serving_plants.value))';
        }

        $team_scores = DB::table('teams')
            ->select(DB::raw('teams.id, teams.name, teams.icon_url, ' . $sum_query . ' as score, COUNT(DISTINCT team_memberships.employee_id) as count_members'))
            ->leftJoin('team_memberships', function($join) {
                $join->on('team_memberships.team_id', '=', 'teams.id')
                    ->where('team_memberships.status', '=', 'active')
                    ->whereNull('team_memberships.deleted_at')
                    ->where('team_memberships.participant', '=', 1);
            })
            ->leftJoin('employees', function($join) {
                $join->on('team_memberships.employee_id', '=', 'employees.id')
                    ->whereNull('employees.deleted_at');
            })
            ->leftJoin('serving_plants', function($join) use ($challenge) {
                $join->on('serving_plants.employee_id', '=', 'team_memberships.employee_id')
                    ->where('serving_plants.date', '>=', $challenge->date_start)
                    ->where('serving_plants.date', '<=', $challenge->date_end)
                    ->whereNull('serving_plants.deleted_at');
            })
            ->where('teams.challenge_id', $challenge->id)
            ->whereNull('teams.deleted_at')
            ->groupBy('teams.id')
            ->get();

        # Average score if required
        if ($this->calc_total_method == 'average') {
            $team_scores->transform(function($item) {
                if ($item->count_members != 0) {
                    $item->score = round($item->score / $item->count_members, 2);
                } else {
                    $item->score = round($item->score, 2);
                }
                return $item;
            });
        }

        $sorted = $team_scores->sortByDesc('score')->values();

        $this->setAttribute('standings', $sorted);
    }

    public function loadStandingsAttributeForTopThreeTeamsAndMeInChallenge($challenge, $user_id)
    {
        # Check if there is a max_daily_user limitation
        $sum_query = 'SUM(serving_plants.value)';
        if (!is_null($this->max_daily_user)) {
            $sum_query = 'SUM( IF(serving_plants.value > ' . $this->max_daily_user . ', ' . $this->max_daily_user . ', serving_plants.value))';
        }

        # Sorry Nate
        $score_query = "select 
                                teams.id, 
                                teams.name, 
                                teams.icon_url, 
                                team_memberships.employee_id as member,
                                ".$sum_query." as score,
                                count(distinct team_memberships.employee_id) as count_members from `teams` 
                                left join `team_memberships` on `team_memberships`.`team_id` = `teams`.`id`
                                    and `team_memberships`.`deleted_at` is null 
                                    and `team_memberships`.`participant` = 1 
                                left join `employees` on `team_memberships`.`employee_id` = `employees`.`id` 
                                    and `employees`.`deleted_at` is null 
                                left join `serving_plants` on `serving_plants`.`employee_id` = `team_memberships`.`employee_id` 
                                    and `serving_plants`.`date` >= '".$challenge->date_start."'
                                    and `serving_plants`.`date` <= '".$challenge->date_end."'
                                    and `serving_plants`.`deleted_at` is null 
                                where `teams`.`challenge_id` = 6 and `teams`.`deleted_at` is null
                                group by teams.id, team_memberships.employee_id;";

        $team_scores = collect(DB::select($score_query))->groupBy('id');

        # Add attributes to parent team array element
        # Find the users' team where their ID is a member
        $team_scores->each(function($team) use($user_id) {
            $team->total_score = $team->sum('score');
            $team->count_members = $team->sum('count_members');
            $team->member_ids = collect($team->pluck('member'));
            if($team->member_ids->contains($user_id))
                $team->is_my_team = 1;
            else
                $team->is_my_team = 0;
        });

        # Average score if required
        if ($this->calc_total_method == 'average') {
            $team_scores->transform(function($item) {
                $item->total_score = $item->score / $item->count_members;
                return $item;
            });
        }

        # Sort Total Standings
        $team_scores = $team_scores->sortBy('total_score')->reverse();

        # Transform to Standings, with my team position indicator
        $i = 0;
        $team_scores->transform(function($team) use(&$i){
            $i++;
            return [
                'id' => $team->first()->id,
                'name' => $team->first()->name,
                'icon_url' => $team->first()->icon_url,
                'count_members' => $team->count_members,
                'score' => $team->total_score,
                'is_my_team' => $team->is_my_team,
                'position' => $i
            ];
        });

        # Take Top 3
        $top_three = $team_scores->take(3);

        # Take My Team
        $my_team = $team_scores->where('is_my_team', 1);

        # Merge w/ position indicators and nix any duplicates if your team is in the top three
        $standings = $top_three->merge($my_team)->unique();

        return $standings;
    }

    /**
     * @param $for Team or User
     * @param $date_start
     * @param $date_end
     * @return int
     */
    public function calculateScore($for, $date_start, $date_end = null)
    {
        $in = $this->getUsersListToTally($for);

        # If no end date provided, assume it's the same as $date_start
        if (empty($date_end)) { $date_end = $date_start; }

        $total = ServingsPlant::whereIn('employee_id', $in)
            ->whereBetween('date', [$date_start, $date_end])
            ->sum('value');

        if ($this->calc_total_method == 'total') {
            return $total;
        }

        if ($this->calc_total_method == 'average' && !empty($in)) {
            return round($total / count($in));
        }

    }

}
