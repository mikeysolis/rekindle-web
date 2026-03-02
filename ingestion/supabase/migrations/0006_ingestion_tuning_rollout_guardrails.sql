-- Rekindle Content Pipeline
-- ING-043: Safe tuning deployment guardrails (shadow/canary/full + rollout gates)
--
-- Rollback notes:
--   1) Drop trigger `trg_ingest_tuning_rollout_guardrails`.
--   2) Drop function `public.ingest_tuning_rollout_guardrails()`.
--
-- Recovery notes:
--   1) If rollout inserts fail, inspect `ingest_experiments.scope_json` and required metrics
--      in `ingest_experiment_metrics`.
--   2) Re-run insert only after gate evidence is complete and guardrails are non-regressing.

create or replace function public.ingest_tuning_rollout_guardrails()
returns trigger
language plpgsql
as $$
declare
  scope_json jsonb;
  decision text;
  deployment_mode text;
  control_reviewed integer;
  treatment_reviewed integer;
  control_days integer;
  treatment_days integer;
  guardrail_name text;
  guardrail_baseline double precision;
  guardrail_treatment double precision;
begin
  select exp.scope_json
  into scope_json
  from public.ingest_experiments as exp
  where exp.id = new.experiment_id;

  if scope_json is null then
    raise exception
      'ingest_tuning_changes requires ingest_experiments.scope_json for experiment_id=%',
      new.experiment_id;
  end if;

  decision := coalesce(nullif(scope_json->>'tuning_decision', ''), 'iterate');
  deployment_mode := nullif(scope_json->>'deployment_mode', '');

  if deployment_mode is null or deployment_mode not in ('shadow', 'canary', 'full') then
    raise exception
      'ingest_tuning_changes requires deployment_mode in scope_json (shadow|canary|full) for experiment_id=%',
      new.experiment_id;
  end if;

  if decision = 'adopt' then
    if deployment_mode <> 'full' then
      raise exception
        'adopt rollouts require deployment_mode=full for experiment_id=% (received %)',
        new.experiment_id,
        deployment_mode;
    end if;

    if coalesce(scope_json->>'control_reviewed_candidates', '') ~ '^\d+$' then
      control_reviewed := (scope_json->>'control_reviewed_candidates')::integer;
    else
      control_reviewed := 0;
    end if;

    if coalesce(scope_json->>'treatment_reviewed_candidates', '') ~ '^\d+$' then
      treatment_reviewed := (scope_json->>'treatment_reviewed_candidates')::integer;
    else
      treatment_reviewed := 0;
    end if;

    if coalesce(scope_json->>'control_window_days', '') ~ '^\d+$' then
      control_days := (scope_json->>'control_window_days')::integer;
    else
      control_days := 0;
    end if;

    if coalesce(scope_json->>'treatment_window_days', '') ~ '^\d+$' then
      treatment_days := (scope_json->>'treatment_window_days')::integer;
    else
      treatment_days := 0;
    end if;

    if control_reviewed < 200 or treatment_reviewed < 200 or control_days < 14 or treatment_days < 14 then
      raise exception
        'adopt rollout blocked by sample-size gate for experiment_id=% (control=% reviews/% days, treatment=% reviews/% days)',
        new.experiment_id,
        control_reviewed,
        control_days,
        treatment_reviewed,
        treatment_days;
    end if;

    foreach guardrail_name in array array[
      'duplicate_confirmed_rate',
      'safety_flag_rate',
      'compliance_incident_rate'
    ] loop
      select m.baseline_value, m.treatment_value
      into guardrail_baseline, guardrail_treatment
      from public.ingest_experiment_metrics as m
      where m.experiment_id = new.experiment_id
        and m.metric_name = guardrail_name
      limit 1;

      if guardrail_baseline is null or guardrail_treatment is null then
        raise exception
          'adopt rollout missing required guardrail metric "%" for experiment_id=%',
          guardrail_name,
          new.experiment_id;
      end if;

      if guardrail_treatment > guardrail_baseline then
        raise exception
          'adopt rollout blocked by guardrail regression on "%" for experiment_id=% (baseline=%, treatment=%)',
          guardrail_name,
          new.experiment_id,
          guardrail_baseline,
          guardrail_treatment;
      end if;
    end loop;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_ingest_tuning_rollout_guardrails on public.ingest_tuning_changes;
create trigger trg_ingest_tuning_rollout_guardrails
before insert on public.ingest_tuning_changes
for each row execute function public.ingest_tuning_rollout_guardrails();
