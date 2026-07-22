--liquibase formatted sql

--changeset climberbook:003
--comment Move body-weight snapshots out of training records; weights are stored in weight_entries.
insert into weight_entries (athlete_id, date, time, weight_kg, created_at)
select trainings.athlete_id,
	trainings.date,
	trainings.time,
	trainings.body_weight_kg,
	trainings.created_at
from trainings
where trainings.body_weight_kg is not null
	and not exists (
		select 1
		from weight_entries
		where weight_entries.athlete_id = trainings.athlete_id
			and weight_entries.date = trainings.date
			and weight_entries.time = trainings.time
			and weight_entries.weight_kg = trainings.body_weight_kg
	);

alter table trainings drop column body_weight_kg;

--rollback alter table trainings add column body_weight_kg numeric;
