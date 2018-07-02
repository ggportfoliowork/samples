<?php

namespace App\Models\Challenges;

use Carbon\Carbon;
use App\Models\BaseModel;
use App\Models\Teams\Team;
use App\Models\Users\Employee;
use App\Models\Locales\Client;
use App\Models\Locales\Region;
use App\Models\Locales\Location;
use App\Models\Locales\Department;
use App\Models\Sms\SmsSubscription;

/**
 * Class Challenge
 *
 * @package App\Models
 */
class Challenge extends BaseModel
{

    protected $fillable = [
        'name', 'description', 'disclaimer', 'date_start', 'date_end',
        'first_day_registration', 'last_day_registration', 'last_day_data_entry',
        'last_day_results_shown', 'min_team_size', 'max_team_size', 'team_join_type',
        'open_team_creation', 'private'
    ];

    protected $dates = ['created_at', 'updated_at', 'deleted_at'];

    protected $casts = [
        'private' => 'boolean',
        'open_team_creation' => 'boolean',
        'min_team_size' => 'integer',
        'max_team_size' => 'integer'
    ];


    /*
     |----------------------------------
     | GENERAL METHODS                 |
     |----------------------------------
     */
    public function getCheckinHistoryForEmployee(Employee $employee, Carbon $startDay, $lookbackDays)
    {
        return $this->objective->getHistoryForEmployee($employee, $startDay, $lookbackDays);
    }

    public function canEmployeeCreateTeam(Employee $employee)
    {
        if ($this->hasActiveParticipant($employee)) {
            return [
                'error' => 'alreadyParticipating',
                'message' => 'You are already a participant in this Challenge.'
            ];
        }

        if (!$this->isInEmployeesLocale($employee)) {
            return [
                'error' => 'challengeNotInUsersLocale',
                'message' => 'This challenge is not available for you to join based on your locale.'
            ];
        }

        if (!$this->isOpenForRegistration(Carbon::now($employee->timezone)->toDateString())) {
            return [
                'error' => 'challengeRegistrationClosed',
                'message' => 'This Challenge is not currently open for registration.'
            ];
        }

        if ($this->open_team_creation !== true) {
            return [
                'error' => 'challengeTeamCreationRestricted',
                'message' => 'This Challenge does not allow employees to create teams.'
            ];
        }

        return true;
    }

    public function getObjectiveTypesList()
    {
        $types = [$this->objective->getMorphClass()];
        return $types;
    }

    public function hasActiveParticipant(Employee $employee)
    {
        $check = $this->employeeIsParticipating($employee)
            ->where('id', $this->id)
            ->first();

        if (is_null($check)) {
            return false;
        }
        return true;
    }

    public function isOver($asOf = null)
    {
        $asOf = is_null($asOf) ? Carbon::now(config('app.default_user_timezone'))    : $asOf;
        if ($this->date_end < $asOf) { return true; }
        return false;
    }

    public function isInEmployeesLocale(Employee $employee)
    {
        $check = $this->inEmployeesLocale($employee)
            ->where('id', $this->id)
            ->first();

        if (is_null($check)) {
            return false;
        }
        return true;
    }

    public function isOpenForRegistration($asOf = null)
    {
        $asOf = is_null($asOf) ? Carbon::now(config('app.default_user_timezone'))->toDateString() : $asOf;
        return (
            $this->first_day_registration <= $asOf &&
            $this->last_day_registration >= $asOf
        );
    }

    public function loadLocales()
    {
        $this->load('clients', 'regions', 'locations', 'departments');
    }

    public function getActiveParticipants()
    {
        $participants = Employee::whereHas('active_participant_memberships', function($q) {
            $q->whereHas('team', function($q) {
                $q->where('challenge_id', $this->id);
            });
        })->get();
        return $participants;
    }

    public function getActiveCaptains()
    {
        $captains = Employee::whereHas('active_captain_memberships', function($q) {
            $q->whereHas('team', function($q) {
                $q->where('challenge_id', $this->id);
            });
        })->get();
        return $captains;
    }

    /*
     |----------------------------------
     | ACCESSORS / MUTATORS            |
     |----------------------------------
    */
    public function setDateStartAttribute($value)
    {
        $this->attributes['date_start'] = $this->convertDateStringToDBInsertDateString($value);
    }

    public function setDateEndAttribute($value)
    {
        $this->attributes['date_end'] = $this->convertDateStringToDBInsertDateString($value);
    }

    public function setFirstDayRegistrationAttribute($value)
    {
        $this->attributes['first_day_registration'] = $this->convertDateStringToDBInsertDateString($value);
    }

    public function setLastDayRegistrationAttribute($value)
    {
        $this->attributes['last_day_registration'] = $this->convertDateStringToDBInsertDateString($value);
    }

    public function setLastDayDataEntryAttribute($value)
    {
        $this->attributes['last_day_data_entry'] = $this->convertDateStringToDBInsertDateString($value);
    }

    public function setLastDayResultsShownAttribute($value)
    {
        $this->attributes['last_day_results_shown'] = $this->convertDateStringToDBInsertDateString($value);
    }

    /*
     |----------------------------------
     | QUERY SCOPES                    |
     |----------------------------------
    */
    public function scopeWithObjective($q)
    {
        $q->with('objective');
        return $q;
    }


    public function scopeWithTeamSummaries($q, $employee)
    {
        $q->with(['teams' => function($q) use ($employee) {
            $q->with(['pending_invitations' => function($q) use($employee) {
                $q->where('sent_to', $employee->id);
            }])->with(['captain_memberships.employee' => function($q) {
                $q->select(['employees.name_first', 'employees.name_last', 'employees.id']);
            }])->inEmployeesLocale($employee);
        }]);
        return $q;
    }


    public function scopeNotPrivate($q)
    {
        $q->where('private', 0);
        return $q;
    }


    public function scopeEmployeeNotParticipating($q, Employee $employee)
    {
        $q->whereDoesntHave('teams', function($q) use ($employee) {
            $q->whereHas('participant_memberships', function($q) use ($employee) {
                $q->where('employee_id', $employee->id);
                $q->where('status', 'active');
            });
        });
        return $q;
    }


    public function scopeEmployeeIsParticipating($q, Employee $employee)
    {
        $q->whereHas('teams', function($q) use ($employee) {
            $q->whereHas('participant_memberships', function($q) use ($employee) {
                $q->where('employee_id', $employee->id);
                $q->where('status', 'active');
            });
        });
        return $q;
    }


    public function scopeEmployeeIsCaptain($q, Employee $employee)
    {
        $q->whereHas('teams', function($q) use ($employee) {
            $q->whereHas('memberships', function($q) use ($employee) {
                $q->where('employee_id', $employee->id);
                $q->where('captain', '1');
                $q->where('status', 'active');
            });
        });
        return $q;
    }


    public function scopeDataEntryIsOpen($q, $asOf = null)
    {
        $asOf = is_null($asOf) ? Carbon::now(config('app.default_user_timezone'))->toDateString() : $asOf;

        $q->where('last_day_data_entry', '>=', $asOf);
    }

    /**
     * Teams in this Challenge that the given Employee is a part of.
     *
     * @param      $q
     * @param Employee $employee
     * @return mixed
     */
    public function scopeWithEmployeesTeams($q, Employee $employee)
    {
        $q->with(['teams' => function($q) use ($employee) {
            $q->select(['teams.id', 'teams.name', 'teams.challenge_id']);
            $q->whereHas('memberships', function($q) use ($employee) {
                $q->where('employee_id', $employee->id);
                $q->where('status', 'active');
                $q->where(function($q) {
                    $q->where('participant', 1);
                    $q->orWhere('captain', 1);
                });
            });
            $q->with(['memberships' => function($q) {
                $q->where('team_memberships.status', 'active');
                $q->with(['employee' => function($q) {
                    $q->select(['employees.id', 'employees.name_first', 'employees.name_last']);
                }]);
            }]);
        }]);
        return $q;
    }


    public function scopeWithTeamsObjectives($q)
    {
        return $q->with('teams.objectives');
    }


    public function scopeOpenForRegistration($q, $asOf = null)
    {
        $asOf = is_null($asOf) ? Carbon::now(config('app.default_user_timezone'))->toDateString() : $asOf;

        $q->where('first_day_registration', '<=', $asOf);
        $q->where('last_day_registration', '>=', $asOf);
        return $q;
    }


    /**
     * Adds query params to only return a valid Challenge according to the Employee and Challenge Locale params.
     *
     * @param      $q
     * @param Employee $employee
     */
    public function scopeInEmployeesLocale($q, Employee $employee)
    {
        $employee->loadLocales();

        $employees_client = $employee->client->id;
        $employees_region = $employee->region->id;
        $employees_location = $employee->location->id;
        $employees_department = $employee->department->id;

        $q->where(function($q) use ($employees_client, $employees_region, $employees_location, $employees_department) {
            # Client locale in common and nothing for all other locales
            $q->whereHas('clients', function($q) use ($employees_client) {
                $q->where('clients.id', $employees_client);
            });
            $q->doesntHave('regions');
            $q->doesntHave('locations');
            $q->doesntHave('departments');

            # Region locale in common and nothing for child locales
            $q->orWhere(function($q) use ($employees_region){
                $q->whereHas('regions', function($q) use ($employees_region) {
                    $q->where('regions.id', $employees_region);
                });
                $q->doesntHave('locations');
                $q->doesntHave('departments');
            });

            # Location locale in common and nothing for child locales
            $q->orWhere(function($q) use ($employees_location){
                $q->whereHas('locations', function($q) use ($employees_location) {
                    $q->where('locations.id', $employees_location);
                });
                $q->doesntHave('departments');
            });

            # Department locale in common
            $q->orWhere(function($q) use ($employees_department){
                $q->whereHas('departments', function($q) use ($employees_department) {
                    $q->where('departments.id', $employees_department);
                });
            });
        });
        return $q;
    }


    /*
     |----------------------------------
     | RELATIONSHIPS                   |
     |----------------------------------
    */
    public function options()
    {
        return $this->hasMany(ChallengeOption::class);
    }

    public function objective()
    {
        return $this->morphTo();
    }

    public function teams()
    {
        return $this->hasMany(Team::class);
    }

    public function sms_subscriptions()
    {
        return $this->morphMany(SmsSubscription::class, 'smsable');
    }

    public function clients()
    {
        return $this->morphedByMany(Client::class, 'locale', 'challenge_locale')->withTimestamps()
            ->where('challenge_locale.deleted_at', null);
    }

    public function regions()
    {
        return $this->morphedByMany(Region::class, 'locale', 'challenge_locale')->withTimestamps()
            ->where('challenge_locale.deleted_at', null);
    }

    public function locations()
    {
        return $this->morphedByMany(Location::class, 'locale', 'challenge_locale')->withTimestamps()
            ->where('challenge_locale.deleted_at', null);
    }

    public function departments()
    {
        return $this->morphedByMany(Department::class, 'locale', 'challenge_locale')->withTimestamps()
            ->where('challenge_locale.deleted_at', null);
    }

}
