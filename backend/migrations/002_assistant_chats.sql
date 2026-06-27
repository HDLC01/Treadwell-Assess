-- Persisted admin-assistant chats. Scoped per signed-in admin email so one
-- admin never sees another's history. Lives in the same Assess Postgres the
-- assistant already queries (no new infra).

create table if not exists assistant_conversations (
    id          uuid primary key default gen_random_uuid(),
    user_email  text not null,
    title       text not null default 'New chat',
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);
create index if not exists idx_assistant_conv_user
    on assistant_conversations (user_email, updated_at desc);

create table if not exists assistant_messages (
    id              uuid primary key default gen_random_uuid(),
    conversation_id uuid not null references assistant_conversations(id) on delete cascade,
    role            text not null,                    -- 'user' | 'assistant'
    content         text not null,
    created_at      timestamptz not null default now()
);
create index if not exists idx_assistant_msg_conv
    on assistant_messages (conversation_id, created_at);
