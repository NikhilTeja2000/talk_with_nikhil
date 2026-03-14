-- Knowledge chunks: public read (agent needs to search)
CREATE POLICY "chunks_public_read" ON knowledge_chunks FOR SELECT USING (is_active = true);

-- Sessions: public insert + read (anonymous users create sessions)
CREATE POLICY "sessions_public_insert" ON sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "sessions_public_select" ON sessions FOR SELECT USING (true);
CREATE POLICY "sessions_public_update" ON sessions FOR UPDATE USING (true);

-- Transcript messages: public insert + read
CREATE POLICY "transcripts_public_insert" ON transcript_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "transcripts_public_select" ON transcript_messages FOR SELECT USING (true);

-- Question events: public insert (gap detector writes), admin read/update
CREATE POLICY "questions_public_insert" ON question_events FOR INSERT WITH CHECK (true);
CREATE POLICY "questions_public_select" ON question_events FOR SELECT USING (true);
CREATE POLICY "questions_auth_update" ON question_events FOR UPDATE USING (auth.role() = 'authenticated');

-- Knowledge source tables: public read, admin write
CREATE POLICY "profiles_public_read" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_auth_write" ON profiles FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "experiences_public_read" ON experiences FOR SELECT USING (is_active = true);
CREATE POLICY "experiences_auth_write" ON experiences FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "projects_public_read" ON projects FOR SELECT USING (is_active = true);
CREATE POLICY "projects_auth_write" ON projects FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "faqs_public_read" ON faqs FOR SELECT USING (is_active = true);
CREATE POLICY "faqs_auth_write" ON faqs FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "timeline_public_read" ON timeline_events FOR SELECT USING (is_active = true);
CREATE POLICY "timeline_auth_write" ON timeline_events FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "stories_public_read" ON stories FOR SELECT USING (is_active = true);
CREATE POLICY "stories_auth_write" ON stories FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "links_public_read" ON links FOR SELECT USING (is_active = true);
CREATE POLICY "links_auth_write" ON links FOR ALL USING (auth.role() = 'authenticated');

-- Knowledge updates: admin only
CREATE POLICY "updates_auth_all" ON knowledge_updates FOR ALL USING (auth.role() = 'authenticated');

-- Chunks: admin can write (for rebuild)
CREATE POLICY "chunks_auth_write" ON knowledge_chunks FOR ALL USING (auth.role() = 'authenticated');
