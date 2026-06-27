-- Flag turns whose answer surfaced a single candidate's private results, so
-- those results are never replayed into a later turn of the same conversation
-- (keeps the one-candidate-per-call privacy invariant across turns, not just
-- within a single call). The full answer is still stored + shown to the admin;
-- only the model's replayed history view redacts it.
alter table assistant_messages
    add column if not exists has_candidate_results boolean not null default false;
