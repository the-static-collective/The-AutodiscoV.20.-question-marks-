-- ====================================================================
-- TAO LEDGER SUITE: ROW LEVEL SECURITY & IMMUTABILITY POLICIES
-- ====================================================================
-- Run this script in your Supabase SQL Editor to secure the `events` table
-- and ensure that truth claims remain append-only and completely immutable.

-- 1. Ensure the `events` table exists with proper schema structures
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL,
    type VARCHAR(255) NOT NULL,
    author_kind VARCHAR(50) NOT NULL,
    content JSONB NOT NULL DEFAULT '{}'::jsonb,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable Row Level Security (RLS) on the events table
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Public/Authenticated Select
-- Allows anyone (or authenticated clients depending on your read policy) to view truth claims.
CREATE POLICY "Allow public select on events"
ON public.events
FOR SELECT
USING (true);

-- 4. Policy: Append-Only Inserts
-- Allows public/anon or service role clients to append new events.
-- Because there are no policies defined for UPDATE or DELETE, any such attempts
-- from client applications using the anon/publishable key will be rejected automatically by Supabase.
CREATE POLICY "Allow public insert on events"
ON public.events
FOR INSERT
WITH CHECK (true);

-- 5. Comments on validation & subsequent decisions
-- For corrections or reclassifications, client applications must never UPDATE or DELETE rows.
-- Instead, write a new event with type 'VALIDATION_DECISION' or 'SUCCESSOR_CLAIM',
-- referencing the original event ID inside the `metadata` or `content` JSONB.
--
-- Example Successor Event structure to write to public.events:
-- {
--   "type": "VALIDATION_DECISION",
--   "author_kind": "SYSTEM",
--   "content": {
--     "original_event_id": "original-uuid-here",
--     "decision": "SUPERSEDED",
--     "reason": "Updated loop metric observed from sensor seed_2"
--   },
--   "metadata": {
--     "source": "autodisco-v20",
--     "tao_version": "tao@1.0.0"
--   }
-- }
