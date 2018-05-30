<?php

namespace App\Http\Controllers\CohortPatient;

use DB;
use App\Models\Cycle;
use App\Models\Cohort;
use App\Models\Patient;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use App\Transformers\CohortTransformer;
use App\Services\Attendance\AttendanceCreator;

/**
 * @resource (api) Cohort Membership
 *
 * @package App\Http\Controllers\CohortPatient
 */
class CohortPatientController extends Controller
{
    /**
     * Create a new controller instance.
     */
    public function __construct()
    {
        //
    }


    /**
     * Add Patient to Cohort
     *
     * The user adding the patient and the patient must be a member of the site to which the Cohort belongs.
     * The patient must also NOT be in another active cohort. A patient may belong to only 1 active cohort at a time.
     *
     * @param Cohort            $cohort
     * @param Patient           $patient
     * @param CohortTransformer $transformer
     * @return \Illuminate\Http\Response
     */
    public function store(Cohort $cohort, Patient $patient, CohortTransformer $transformer, AttendanceCreator $attendanceCreator)
    {
        # TODO : Move all of this logic out of the controller.
        $this->setMeAndNow();
        if ($this->me->cannot('addPatient', [$cohort, $patient])) {
            return abort(403, 'You cannot add this patient to this cohort. They may already be in an active cohort. A patient can be in only 1 active cohort.');
        }

        # Start a new cycle (they must have a good eligibility)
        $eligibility = $patient->open_eligibilities()->latest()->first();

        if (empty($eligibility)) {
            return abort(403, 'This patient does not have the required eligibility to begin an education cycle.');
        }

        $next_cycle_num = Cycle::getNextCycleNumForPatient($patient);

        $cycle = Cycle::updateOrCreate([
            'patient_id' => $patient->id,
            'eligibility_id' => $eligibility->id,
            'cycle_num' => $next_cycle_num,
        ],[
            'patient_id' => $patient->id,
            'eligibility_id' => $eligibility->id,
            'cycle_num' => $next_cycle_num,
            'status' => ''
        ]);

        $cohort->patients()->attach($patient->id, [
            'cycle_id' => $cycle->id,
            'created_by' => $this->me->id,
            'created_at' => $this->now
        ]);

        # Add blank attendance for this patient for all sessions of this cohort
        $cohort->sessions->each(function($session) use ($attendanceCreator, $patient) {
            $attendanceCreator->create($session, [$patient]);
        });

        $cohort->load(['patients' => function($q) {
            $q->select('patients.id', 'name_first', 'name_middle', 'name_last', 'patients.patient_id', 'dob')
                ->orderBy('patients.name_last', 'ASC');
        }]);

        return $this->responder()->respond([
            'success' => true,
            'message' => 'Patient added.',
            'data' => [
                'cohort' => $transformer->transformDetail($cohort)
            ]
        ]);
    }


    /**
     * Remove Patient from Cohort
     *
     * The user removing the patient and the patient must be a member of the site to which the Cohort belongs.
     *
     * @param Cohort            $cohort
     * @param Patient           $patient
     * @param CohortTransformer $transformer
     * @return \Illuminate\Http\Response
     */
    public function destroy(Cohort $cohort, Patient $patient, CohortTransformer $transformer)
    {
        $this->setMeAndNow();
        if ($this->me->cannot('removePatient', [$cohort, $patient])) {
            return abort(403, 'You cannot remove this patient from this cohort.');
        }

        DB::table('cohort_patient')
            ->where('patient_id', $patient->id)
            ->where('cohort_id', $cohort->id)
            ->whereNull('deleted_at')
            ->update([
                'deleted_at' => $this->now,
                'deleted_by' => $this->me->id
            ]);

        $cohort->load(['patients' => function($q) {
            $q->select('patients.id', 'name_first', 'name_middle', 'name_last', 'patients.patient_id', 'dob')
                ->orderBy('patients.name_last', 'ASC');
        }]);

        return $this->responder()->respond([
            'success' => true,
            'message' => 'Patient removed.',
            'data' => [
                'cohort' => $transformer->transformDetail($cohort)
            ]
        ]);
    }


    /**
     * List Cohorts
     *
     * Lists the cohorts at a specified site.
     * This endpoint is pagination-enabled.
     *
     * @param Site               $site The site to show the cohort list for
     * @param Request            $request
     * @param CohortPaginator    $paginator
     * @param CohortTransformer  $transformer
     * @return \Illuminate\Http\Response
     */
    public function index(Site $site, Request $request, CohortPaginator $paginator, CohortTransformer $transformer)
    {
        if ($this->user->cannot('view', $site)) {
            return abort(403, 'You cannot view cohorts at this site.');
        }
        $paginated = $paginator->paginate($request);
        $transformer->transformCollection($paginated->getCollection(), 'listing');
        return $this->responder()->respond($paginated);
    }

}
