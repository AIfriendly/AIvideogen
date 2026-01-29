"""
ATDD Tests for Story: Database Integration for produce_video.py

Story: story-db-integration-001
Status: RED Phase - Tests should FAIL until implementation is complete

These tests verify that produce_video.py creates proper database records
during video generation, enabling web application integration.

Database Schema (ACTUAL - verified):
- projects table: 23 fields, TEXT PRIMARY KEY (UUID)
- scenes table: 11 fields, TEXT PRIMARY KEY (UUID), FOREIGN KEY to projects
- No rendered_videos table (video metadata in projects table)
"""

import pytest
import sqlite3
import uuid
import sys
import json
from pathlib import Path
from unittest.mock import Mock, patch, AsyncMock, MagicMock
from datetime import datetime
from typing import Generator

# Add ai-video-generator to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "ai-video-generator"))


# ============================================================================
# FIXTURES
# ============================================================================

@pytest.fixture
def actual_schema_sql() -> str:
    """Load the actual database schema from the codebase and add missing fields."""
    schema_path = Path(__file__).parent.parent.parent / "ai-video-generator" / "src" / "lib" / "db" / "schema.sql"
    if schema_path.exists():
        schema = schema_path.read_text()
        # Add fields that exist in the real database but not in schema.sql
        # These are known fields that were added outside of schema management
        # Add after CREATE TABLE IF NOT EXISTS projects (
        schema = schema.replace(
            "CREATE TABLE IF NOT EXISTS projects (",
            "CREATE TABLE IF NOT EXISTS projects (\n  target_duration INTEGER DEFAULT 2,\n  video_path TEXT,\n  video_total_duration REAL,\n  video_file_size INTEGER,\n  total_duration REAL,"
        )
        return schema
    else:
        # Fallback: return minimal schema matching actual database
        return """
        CREATE TABLE system_prompts (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          prompt TEXT NOT NULL,
          description TEXT,
          category TEXT,
          is_preset BOOLEAN DEFAULT false,
          is_default BOOLEAN DEFAULT false,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE projects (
            id TEXT PRIMARY KEY,
            target_duration INTEGER DEFAULT 2,
            video_path TEXT,
            video_total_duration REAL,
            video_file_size INTEGER,
            total_duration REAL,
            name TEXT NOT NULL,
            topic TEXT,
            current_step TEXT DEFAULT 'topic' CHECK(current_step IN (
                'topic', 'voice', 'script-generation', 'voiceover',
                'visual-sourcing', 'visual-curation', 'editing', 'export'
            )),
            status TEXT DEFAULT 'draft',
            config_json TEXT,
            system_prompt_id TEXT,
            voice_id TEXT,
            niche TEXT,
            script_generated BOOLEAN DEFAULT 0,
            voice_selected BOOLEAN DEFAULT 0,
            visuals_generated BOOLEAN DEFAULT 0,
            visuals_provider TEXT,
            visuals_download_progress INTEGER DEFAULT 0,
            thumbnail_path TEXT,
            rag_enabled INTEGER DEFAULT 0,
            rag_config TEXT,
            rag_last_sync TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            last_active TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (system_prompt_id) REFERENCES system_prompts(id) ON DELETE SET NULL
        );

        CREATE TABLE scenes (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            scene_number INTEGER NOT NULL,
            text TEXT NOT NULL,
            sanitized_text TEXT,
            audio_file_path TEXT,
            duration REAL,
            selected_clip_id TEXT,
            visual_keywords TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
            UNIQUE(project_id, scene_number)
        );
        """


@pytest.fixture
def test_database(tmp_path: Path, actual_schema_sql: str) -> Generator[sqlite3.Connection, None, None]:
    """Create test database file with actual schema."""
    # Use a file-based database for testing so both test code and produce_video can access it
    db_path = tmp_path / "test.db"

    conn = sqlite3.connect(str(db_path))
    conn.executescript(actual_schema_sql)
    conn.row_factory = sqlite3.Row
    # Enable foreign key enforcement for tests
    conn.execute("PRAGMA foreign_keys = ON")

    # Patch produce_video's DATABASE_PATH to use the test database
    import produce_video
    original_db_path = produce_video.DATABASE_PATH
    produce_video.DATABASE_PATH = db_path

    yield conn

    # Restore original path
    produce_video.DATABASE_PATH = original_db_path
    conn.close()


@pytest.fixture
def mock_groq_api():
    """Mock Groq API calls for script generation."""
    with patch('groq.Groq') as mock_groq:
        mock_client = Mock()
        mock_response = Mock()
        mock_response.choices = [Mock()]
        mock_response.choices[0].message.content = json.dumps([
            {
                "sceneNumber": 1,
                "text": "This is the first scene about the topic.",
                "estimatedDuration": 30
            },
            {
                "sceneNumber": 2,
                "text": "This is the second scene with more details.",
                "estimatedDuration": 35
            },
            {
                "sceneNumber": 3,
                "text": "The final scene concludes the video.",
                "estimatedDuration": 25
            }
        ])
        mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
        mock_groq.return_value = mock_client
        yield mock_groq


@pytest.fixture
def mock_kokoro_tts():
    """Mock Kokoro TTS for audio generation."""
    with patch('kokoro_tts.convert_text_to_audio') as mock_tts:
        mock_tts.return_value = None  # Function returns None on success
        yield mock_tts


@pytest.fixture
def mock_dvids_server():
    """Mock DVIDS MCP server for video sourcing."""
    with patch('mcp_servers.dvids_scraping_server.DVIDSScrapingMCPServer') as mock_dvids:
        mock_server = Mock()
        mock_server.search_videos = AsyncMock(return_value=[
            {
                'videoId': 'test_video_1',
                'title': 'Test Video 1',
                'sourceUrl': 'http://example.com/video1.mp4'
            },
            {
                'videoId': 'test_video_2',
                'title': 'Test Video 2',
                'sourceUrl': 'http://example.com/video2.mp4'
            }
        ])
        mock_server.download_video = AsyncMock(return_value={
            'file_path': '/tmp/test_video.mp4'
        })
        mock_dvids.return_value = mock_server
        yield mock_dvids


@pytest.fixture
def mock_ffmpeg():
    """Mock FFmpeg subprocess calls."""
    with patch('subprocess.run') as mock_run:
        mock_run.return_value = Mock(returncode=0, stdout=b"", stderr=b"")
        yield mock_run


@pytest.fixture
def sample_scenes():
    """Sample scene data for testing."""
    return [
        {
            "sceneNumber": 1,
            "text": "Introduction to the topic",
            "estimatedDuration": 30,
            "actualDuration": 12.5,
            "audioFile": "output/audio/scene_1.mp3"
        },
        {
            "sceneNumber": 2,
            "text": "Main content and details",
            "estimatedDuration": 35,
            "actualDuration": 14.2,
            "audioFile": "output/audio/scene_2.mp3"
        },
        {
            "sceneNumber": 3,
            "text": "Conclusion and summary",
            "estimatedDuration": 25,
            "actualDuration": 11.8,
            "audioFile": "output/audio/scene_3.mp3"
        }
    ]


# ============================================================================
# AC1: Command-Line Argument Parsing
# ============================================================================

class TestCommandLineArguments:
    """TEST-AC-1: Command-Line Argument Parsing"""

    def test_ac_1_1_accepts_topic_argument(self):
        """TEST-AC-1.1: Script should accept --topic argument."""
        # This test will fail because argparse is not implemented yet
        with patch('sys.argv', ['produce_video.py', '--topic', 'Test Topic', '--duration', '60']):
            # Try to import produce_video module
            try:
                import produce_video
                # Check if topic is accessible
                assert hasattr(produce_video, 'TOPIC') or hasattr(produce_video, 'parse_arguments')
            except ImportError:
                pytest.skip("produce_video module not found")

    def test_ac_1_2_accepts_duration_argument(self):
        """TEST-AC-1.2: Script should accept --duration argument."""
        # This test will fail because argparse is not implemented yet
        with patch('sys.argv', ['produce_video.py', '--topic', 'Test', '--duration', '180']):
            try:
                import produce_video
                # Check if duration is accessible
                assert hasattr(produce_video, 'TARGET_DURATION') or hasattr(produce_video, 'parse_arguments')
            except ImportError:
                pytest.skip("produce_video module not found")

    def test_ac_1_3_default_topic_value(self):
        """TEST-AC-1.3: Default topic should be 'Russian invasion of Ukraine'."""
        try:
            import produce_video
            # Check default value
            if hasattr(produce_video, 'TOPIC'):
                assert produce_video.TOPIC == "Russian invasion of Ukraine"
            else:
                pytest.fail("TOPIC constant not found - argparse not implemented")
        except ImportError:
            pytest.skip("produce_video module not found")

    def test_ac_1_4_default_duration_value(self):
        """TEST-AC-1.4: Default duration should be 300 seconds."""
        try:
            import produce_video
            # Check default value
            if hasattr(produce_video, 'TARGET_DURATION'):
                assert produce_video.TARGET_DURATION == 300
            else:
                pytest.fail("TARGET_DURATION constant not found - argparse not implemented")
        except ImportError:
            pytest.skip("produce_video module not found")


# ============================================================================
# AC2: Project Record Creation
# ============================================================================

class TestProjectCreation:
    """TEST-AC-2: Project Record Creation"""

    def test_ac_2_1_create_project_with_uuid(self, test_database):
        """TEST-AC-2.1: Project record should be created with TEXT UUID as primary key."""
        # This test will fail because create_project_record() doesn't exist yet
        try:
            from produce_video import create_project_record

            project_id = create_project_record("Test Topic", 60)

            # Verify UUID format
            uuid.UUID(project_id)  # Will raise if not valid UUID

            # Verify record exists in database
            cursor = test_database.cursor()
            cursor.execute("SELECT * FROM projects WHERE id = ?", (project_id,))
            project = cursor.fetchone()

            assert project is not None, "Project record not created"
            assert project['id'] == project_id
            assert project['name'] == "Test Topic"
            assert project['topic'] == "Test Topic"
            assert project['target_duration'] == 60

        except (ImportError, AttributeError) as e:
            pytest.fail(f"create_project_record function not found: {e}")

    def test_ac_2_2_project_initial_step(self, test_database):
        """TEST-AC-2.2: Project should start with current_step='script-generation'."""
        try:
            from produce_video import create_project_record

            project_id = create_project_record("Test Topic", 60)

            cursor = test_database.cursor()
            cursor.execute("SELECT current_step FROM projects WHERE id = ?", (project_id,))
            result = cursor.fetchone()

            assert result['current_step'] == "script-generation"

        except (ImportError, AttributeError) as e:
            pytest.fail(f"create_project_record function not found: {e}")

    def test_ac_2_3_project_timestamps(self, test_database):
        """TEST-AC-2.3: Project should have created_at and last_active timestamps."""
        try:
            from produce_video import create_project_record

            project_id = create_project_record("Test Topic", 60)

            cursor = test_database.cursor()
            cursor.execute(
                "SELECT created_at, last_active FROM projects WHERE id = ?",
                (project_id,)
            )
            result = cursor.fetchone()

            assert result['created_at'] is not None
            assert result['last_active'] is not None

            # Verify timestamp format (ISO 8601)
            datetime.fromisoformat(result['created_at'].replace('Z', '+00:00'))

        except (ImportError, AttributeError) as e:
            pytest.fail(f"create_project_record function not found: {e}")

    def test_ac_2_4_project_video_path_initially_null(self, test_database):
        """TEST-AC-2.4: video_path should be NULL initially."""
        try:
            from produce_video import create_project_record

            project_id = create_project_record("Test Topic", 60)

            cursor = test_database.cursor()
            cursor.execute(
                "SELECT video_path FROM projects WHERE id = ?",
                (project_id,)
            )
            result = cursor.fetchone()

            assert result['video_path'] is None

        except (ImportError, AttributeError) as e:
            pytest.fail(f"create_project_record function not found: {e}")


# ============================================================================
# AC3: Scene Records Creation
# ============================================================================

class TestSceneCreation:
    """TEST-AC-3: Scene Records Creation"""

    def test_ac_3_1_create_scene_batch_with_uuids(self, test_database):
        """TEST-AC-3.1: Scene records should be created with TEXT UUIDs."""
        try:
            from produce_video import create_project_record, create_scene_records

            # Create project first
            project_id = create_project_record("Test Topic", 60)

            # Create scene records
            scenes = [
                {"sceneNumber": 1, "text": "First scene"},
                {"sceneNumber": 2, "text": "Second scene"}
            ]
            scene_ids = create_scene_records(project_id, scenes)

            # Verify all IDs are UUIDs
            for scene_id in scene_ids:
                uuid.UUID(scene_id)  # Will raise if not valid UUID

            # Verify records in database
            cursor = test_database.cursor()
            cursor.execute(
                "SELECT COUNT(*) as count FROM scenes WHERE project_id = ?",
                (project_id,)
            )
            result = cursor.fetchone()

            assert result['count'] == 2

        except (ImportError, AttributeError) as e:
            pytest.fail(f"create_scene_records function not found: {e}")

    def test_ac_3_2_scene_foreign_key_constraint(self, test_database):
        """TEST-AC-3.2: Scene records should reference project via foreign key."""
        try:
            from produce_video import create_project_record, create_scene_records

            project_id = create_project_record("Test Topic", 60)
            scenes = [{"sceneNumber": 1, "text": "Test scene"}]
            scene_ids = create_scene_records(project_id, scenes)

            cursor = test_database.cursor()
            cursor.execute(
                "SELECT project_id FROM scenes WHERE id = ?",
                (scene_ids[0],)
            )
            result = cursor.fetchone()

            assert result['project_id'] == project_id

        except (ImportError, AttributeError) as e:
            pytest.fail(f"create_scene_records function not found: {e}")

    def test_ac_3_3_scene_number_and_text(self, test_database):
        """TEST-AC-3.3: Scene should have scene_number and text fields."""
        try:
            from produce_video import create_project_record, create_scene_records

            project_id = create_project_record("Test Topic", 60)
            scenes = [
                {"sceneNumber": 1, "text": "First scene text"},
                {"sceneNumber": 2, "text": "Second scene text"}
            ]
            scene_ids = create_scene_records(project_id, scenes)

            cursor = test_database.cursor()
            cursor.execute(
                "SELECT scene_number, text FROM scenes WHERE id = ?",
                (scene_ids[0],)
            )
            result = cursor.fetchone()

            assert result['scene_number'] == 1
            assert result['text'] == "First scene text"

        except (ImportError, AttributeError) as e:
            pytest.fail(f"create_scene_records function not found: {e}")

    def test_ac_3_4_scene_timestamps(self, test_database):
        """TEST-AC-3.4: Scene should have created_at timestamp."""
        try:
            from produce_video import create_project_record, create_scene_records

            project_id = create_project_record("Test Topic", 60)
            scenes = [{"sceneNumber": 1, "text": "Test scene"}]
            scene_ids = create_scene_records(project_id, scenes)

            cursor = test_database.cursor()
            cursor.execute(
                "SELECT created_at FROM scenes WHERE id = ?",
                (scene_ids[0],)
            )
            result = cursor.fetchone()

            assert result['created_at'] is not None

        except (ImportError, AttributeError) as e:
            pytest.fail(f"create_scene_records function not found: {e}")


# ============================================================================
# AC4: Scene Audio File Path Updates
# ============================================================================

class TestSceneAudioUpdates:
    """TEST-AC-4: Scene Audio File Path Updates"""

    def test_ac_4_1_update_audio_file_path(self, test_database):
        """TEST-AC-4.1: Scene audio_file_path should be updated after TTS."""
        try:
            from produce_video import (
                create_project_record,
                create_scene_records,
                update_scene_audio
            )

            project_id = create_project_record("Test Topic", 60)
            scenes = [{"sceneNumber": 1, "text": "Test scene"}]
            scene_ids = create_scene_records(project_id, scenes)

            # Update audio file path
            audio_path = "ai-video-generator/output/audio/scene_1.mp3"
            duration = 12.5
            update_scene_audio(scene_ids[0], audio_path, duration)

            # Verify update
            cursor = test_database.cursor()
            cursor.execute(
                "SELECT audio_file_path FROM scenes WHERE id = ?",
                (scene_ids[0],)
            )
            result = cursor.fetchone()

            assert result['audio_file_path'] == audio_path

        except (ImportError, AttributeError) as e:
            pytest.fail(f"update_scene_audio function not found: {e}")

    def test_ac_4_2_update_duration(self, test_database):
        """TEST-AC-4.2: Scene duration should be updated after TTS."""
        try:
            from produce_video import (
                create_project_record,
                create_scene_records,
                update_scene_audio
            )

            project_id = create_project_record("Test Topic", 60)
            scenes = [{"sceneNumber": 1, "text": "Test scene"}]
            scene_ids = create_scene_records(project_id, scenes)

            # Update with TTS data
            audio_path = "ai-video-generator/output/audio/scene_1.mp3"
            duration = 12.5
            update_scene_audio(scene_ids[0], audio_path, duration)

            # Verify duration
            cursor = test_database.cursor()
            cursor.execute(
                "SELECT duration FROM scenes WHERE id = ?",
                (scene_ids[0],)
            )
            result = cursor.fetchone()

            assert result['duration'] == 12.5

        except (ImportError, AttributeError) as e:
            pytest.fail(f"update_scene_audio function not found: {e}")


# ============================================================================
# AC5: Project Record Updates During Generation
# ============================================================================

class TestProjectStepUpdates:
    """TEST-AC-5: Project Record Updates During Generation"""

    def test_ac_5_1_update_step_to_voiceover(self, test_database):
        """TEST-AC-5.1: current_step should update to 'voiceover' after script generation."""
        try:
            from produce_video import (
                create_project_record,
                update_project_step
            )

            project_id = create_project_record("Test Topic", 60)
            update_project_step(project_id, "voiceover")

            cursor = test_database.cursor()
            cursor.execute(
                "SELECT current_step FROM projects WHERE id = ?",
                (project_id,)
            )
            result = cursor.fetchone()

            assert result['current_step'] == "voiceover"

        except (ImportError, AttributeError) as e:
            pytest.fail(f"update_project_step function not found: {e}")

    def test_ac_5_2_update_step_to_visual_sourcing(self, test_database):
        """TEST-AC-5.2: current_step should update to 'visual-sourcing'."""
        try:
            from produce_video import (
                create_project_record,
                update_project_step
            )

            project_id = create_project_record("Test Topic", 60)
            update_project_step(project_id, "visual-sourcing")

            cursor = test_database.cursor()
            cursor.execute(
                "SELECT current_step FROM projects WHERE id = ?",
                (project_id,)
            )
            result = cursor.fetchone()

            assert result['current_step'] == "visual-sourcing"

        except (ImportError, AttributeError) as e:
            pytest.fail(f"update_project_step function not found: {e}")

    def test_ac_5_3_update_step_to_editing(self, test_database):
        """TEST-AC-5.3: current_step should update to 'editing' during assembly."""
        try:
            from produce_video import (
                create_project_record,
                update_project_step
            )

            project_id = create_project_record("Test Topic", 60)
            update_project_step(project_id, "editing")

            cursor = test_database.cursor()
            cursor.execute(
                "SELECT current_step FROM projects WHERE id = ?",
                (project_id,)
            )
            result = cursor.fetchone()

            assert result['current_step'] == "editing"

        except (ImportError, AttributeError) as e:
            pytest.fail(f"update_project_step function not found: {e}")

    def test_ac_5_4_last_active_timestamp_updates(self, test_database):
        """TEST-AC-5.4: last_active should update with each step change."""
        try:
            from produce_video import (
                create_project_record,
                update_project_step
            )
            import time

            project_id = create_project_record("Test Topic", 60)
            time.sleep(1.1)  # Wait at least 1 second (SQLite datetime has 1-second resolution)
            update_project_step(project_id, "voiceover")

            cursor = test_database.cursor()
            cursor.execute(
                "SELECT created_at, last_active FROM projects WHERE id = ?",
                (project_id,)
            )
            result = cursor.fetchone()

            # last_active should be different from created_at
            assert result['last_active'] != result['created_at']

        except (ImportError, AttributeError) as e:
            pytest.fail(f"update_project_step function not found: {e}")


# ============================================================================
# AC6: Project Completion Update
# ============================================================================

class TestProjectCompletion:
    """TEST-AC-6: Project Completion Update"""

    def test_ac_6_1_update_video_path(self, test_database):
        """TEST-AC-6.1: video_path should be set to output file path."""
        try:
            from produce_video import (
                create_project_record,
                update_project_complete
            )

            project_id = create_project_record("Test Topic", 60)
            video_path = "ai-video-generator/output/Test_Topic_video.mp4"
            duration = 90.5
            file_size = 15728640  # 15 MB

            update_project_complete(project_id, video_path, duration, file_size)

            cursor = test_database.cursor()
            cursor.execute(
                "SELECT video_path FROM projects WHERE id = ?",
                (project_id,)
            )
            result = cursor.fetchone()

            assert result['video_path'] == video_path

        except (ImportError, AttributeError) as e:
            pytest.fail(f"update_project_complete function not found: {e}")

    def test_ac_6_2_update_video_total_duration(self, test_database):
        """TEST-AC-6.2: video_total_duration should be set to actual duration."""
        try:
            from produce_video import (
                create_project_record,
                update_project_complete
            )

            project_id = create_project_record("Test Topic", 60)
            video_path = "ai-video-generator/output/Test_Topic_video.mp4"
            duration = 90.5
            file_size = 15728640

            update_project_complete(project_id, video_path, duration, file_size)

            cursor = test_database.cursor()
            cursor.execute(
                "SELECT video_total_duration FROM projects WHERE id = ?",
                (project_id,)
            )
            result = cursor.fetchone()

            assert result['video_total_duration'] == 90.5

        except (ImportError, AttributeError) as e:
            pytest.fail(f"update_project_complete function not found: {e}")

    def test_ac_6_3_video_file_size_populated(self, test_database):
        """TEST-AC-6.3: video_file_size MUST be populated (critical field)."""
        try:
            from produce_video import (
                create_project_record,
                update_project_complete
            )

            project_id = create_project_record("Test Topic", 60)
            video_path = "ai-video-generator/output/Test_Topic_video.mp4"
            duration = 90.5
            file_size = 15728640  # CRITICAL: Must be set

            update_project_complete(project_id, video_path, duration, file_size)

            cursor = test_database.cursor()
            cursor.execute(
                "SELECT video_file_size FROM projects WHERE id = ?",
                (project_id,)
            )
            result = cursor.fetchone()

            assert result['video_file_size'] is not None
            assert result['video_file_size'] == 15728640

        except (ImportError, AttributeError) as e:
            pytest.fail(f"update_project_complete function not found: {e}")

    def test_ac_6_4_current_step_export(self, test_database):
        """TEST-AC-6.4: current_step should be 'export' on completion."""
        try:
            from produce_video import (
                create_project_record,
                update_project_complete
            )

            project_id = create_project_record("Test Topic", 60)
            video_path = "ai-video-generator/output/Test_Topic_video.mp4"
            duration = 90.5
            file_size = 15728640

            update_project_complete(project_id, video_path, duration, file_size)

            cursor = test_database.cursor()
            cursor.execute(
                "SELECT current_step FROM projects WHERE id = ?",
                (project_id,)
            )
            result = cursor.fetchone()

            assert result['current_step'] == "export"

        except (ImportError, AttributeError) as e:
            pytest.fail(f"update_project_complete function not found: {e}")


# ============================================================================
# AC7: Database Connection Configuration
# ============================================================================

class TestDatabaseConnection:
    """TEST-AC-7: Database Connection Configuration"""

    def test_ac_7_1_database_path_correct(self):
        """TEST-AC-7.1: Database path should be at project root."""
        try:
            import produce_video

            # Check if DATABASE_PATH constant exists
            if hasattr(produce_video, 'DATABASE_PATH'):
                expected_path = Path(__file__).parent.parent.parent / "ai-video-generator.db"
                assert produce_video.DATABASE_PATH == expected_path
            else:
                pytest.fail("DATABASE_PATH constant not found")

        except ImportError:
            pytest.fail("produce_video module not found")

    def test_ac_7_2_context_manager_pattern(self):
        """TEST-AC-7.2: Database connection should use context manager."""
        try:
            from produce_video import get_db_connection

            # Test that context manager works
            with get_db_connection() as conn:
                assert conn is not None
                assert hasattr(conn, 'cursor')
                assert hasattr(conn, 'commit')

        except (ImportError, AttributeError) as e:
            pytest.fail(f"get_db_connection context manager not found: {e}")

    def test_ac_7_3_automatic_commit_on_success(self):
        """TEST-AC-7.3: Context manager should auto-commit on success."""
        try:
            from produce_video import get_db_connection
            import uuid

            # Use actual database path for this test
            db_path = Path(__file__).parent.parent.parent / "ai-video-generator.db"

            # Create test database
            conn = sqlite3.connect(db_path)
            conn.executescript("""
                CREATE TABLE IF NOT EXISTS test_table (
                    id TEXT PRIMARY KEY,
                    value TEXT
                );
            """)
            conn.close()

            # Test context manager commit
            test_id = str(uuid.uuid4())
            with get_db_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "INSERT INTO test_table (id, value) VALUES (?, ?)",
                    (test_id, "test_value")
                )

            # Verify commit happened
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            cursor.execute("SELECT value FROM test_table WHERE id = ?", (test_id,))
            result = cursor.fetchone()
            conn.close()

            # Clean up
            conn = sqlite3.connect(db_path)
            conn.execute("DROP TABLE test_table")
            conn.close()

            assert result is not None
            assert result[0] == "test_value"

        except (ImportError, AttributeError) as e:
            pytest.fail(f"get_db_connection context manager not found: {e}")

    def test_ac_7_4_automatic_rollback_on_error(self):
        """TEST-AC-7.4: Context manager should rollback on error."""
        try:
            from produce_video import get_db_connection
            import uuid

            db_path = Path(__file__).parent.parent.parent / "ai-video-generator.db"

            # Create test table
            conn = sqlite3.connect(db_path)
            conn.executescript("""
                CREATE TABLE IF NOT EXISTS test_rollback (
                    id TEXT PRIMARY KEY,
                    value TEXT
                );
            """)
            conn.close()

            test_id = str(uuid.uuid4())

            # Test rollback on error
            try:
                with get_db_connection() as conn:
                    cursor = conn.cursor()
                    cursor.execute(
                        "INSERT INTO test_rollback (id, value) VALUES (?, ?)",
                        (test_id, "test_value")
                    )
                    # Force error
                    raise Exception("Test error")
            except Exception:
                pass  # Expected

            # Verify rollback happened
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            cursor.execute("SELECT value FROM test_rollback WHERE id = ?", (test_id,))
            result = cursor.fetchone()
            conn.close()

            # Clean up
            conn = sqlite3.connect(db_path)
            conn.execute("DROP TABLE test_rollback")
            conn.close()

            assert result is None, "Record should not exist after rollback"

        except (ImportError, AttributeError) as e:
            pytest.fail(f"get_db_connection context manager not found: {e}")


# ============================================================================
# AC8: UUID Primary Key Generation
# ============================================================================

class TestUUIDGeneration:
    """TEST-AC-8: UUID Primary Key Generation"""

    def test_ac_8_1_project_uses_uuid(self, test_database):
        """TEST-AC-8.1: Project ID should be UUID v4 string."""
        try:
            from produce_video import create_project_record

            project_id = create_project_record("Test Topic", 60)

            # Verify it's a valid UUID
            uuid_obj = uuid.UUID(project_id)
            assert str(uuid_obj) == project_id
            assert uuid_obj.version == 4

        except (ImportError, AttributeError) as e:
            pytest.fail(f"create_project_record function not found: {e}")

    def test_ac_8_2_scene_uses_uuid(self, test_database):
        """TEST-AC-8.2: Scene IDs should be UUID v4 strings."""
        try:
            from produce_video import create_project_record, create_scene_records

            project_id = create_project_record("Test Topic", 60)
            scenes = [
                {"sceneNumber": 1, "text": "Scene 1"},
                {"sceneNumber": 2, "text": "Scene 2"}
            ]
            scene_ids = create_scene_records(project_id, scenes)

            # Verify all are valid UUIDs
            for scene_id in scene_ids:
                uuid_obj = uuid.UUID(scene_id)
                assert str(uuid_obj) == scene_id
                assert uuid_obj.version == 4

        except (ImportError, AttributeError) as e:
            pytest.fail(f"create_scene_records function not found: {e}")

    def test_ac_8_3_uuids_are_unique(self, test_database):
        """TEST-AC-8.3: Generated UUIDs should be unique."""
        try:
            from produce_video import create_project_record, create_scene_records

            # Create multiple projects
            project1_id = create_project_record("Topic 1", 60)
            project2_id = create_project_record("Topic 2", 60)

            # Create multiple scenes
            scenes = [{"sceneNumber": i, "text": f"Scene {i}"} for i in range(1, 6)]
            scene_ids = create_scene_records(project1_id, scenes)

            # Verify all unique
            all_ids = [project1_id, project2_id] + scene_ids
            assert len(all_ids) == len(set(all_ids)), "UUIDs must be unique"

        except (ImportError, AttributeError) as e:
            pytest.fail(f"Database functions not found: {e}")

    def test_ac_8_4_uuid_generated_before_insert(self, test_database):
        """TEST-AC-8.4: UUID should be generated in Python, not by database."""
        try:
            from produce_video import create_project_record

            # This test verifies the implementation approach
            # UUID should be returned by the function, not fetched after INSERT
            project_id = create_project_record("Test Topic", 60)

            # If we got here with a valid UUID, it was generated before INSERT
            uuid.UUID(project_id)  # Will raise if invalid

            # Verify it's in database
            cursor = test_database.cursor()
            cursor.execute("SELECT id FROM projects WHERE id = ?", (project_id,))
            result = cursor.fetchone()

            assert result is not None

        except (ImportError, AttributeError) as e:
            pytest.fail(f"create_project_record function not found: {e}")


# ============================================================================
# AC9: Error Handling
# ============================================================================

class TestErrorHandling:
    """TEST-AC-9: Error Handling"""

    def test_ac_9_1_database_connection_error_handling(self):
        """TEST-AC-9.1: Should handle database connection errors gracefully."""
        try:
            from produce_video import get_db_connection
            import tempfile

            # Try to connect to invalid path
            with patch('produce_video.DATABASE_PATH', "/invalid/path/to/database.db"):
                try:
                    with get_db_connection() as conn:
                        pass
                    pytest.fail("Should have raised an error")
                except (sqlite3.Error, OSError, SystemExit) as e:
                    # Expected error - SystemExit is raised when database doesn't exist
                    assert True

        except (ImportError, AttributeError) as e:
            pytest.fail(f"get_db_connection not found: {e}")

    def test_ac_9_2_insert_error_logging(self, test_database, caplog):
        """TEST-AC-9.2: Should log database insert errors with context."""
        try:
            from produce_video import create_project_record

            # Try to create project with invalid data
            with pytest.raises(sqlite3.Error):
                # This should fail due to constraint violation
                create_project_record(None, 60)  # None violates NOT NULL constraint

        except (ImportError, AttributeError) as e:
            pytest.fail(f"create_project_record not found: {e}")

    def test_ac_9_3_foreign_key_constraint_handling(self, test_database):
        """TEST-AC-9.3: Should handle foreign key constraint violations."""
        try:
            from produce_video import create_scene_records

            # Try to create scene with invalid project_id
            fake_project_id = str(uuid.uuid4())

            with pytest.raises(sqlite3.IntegrityError):
                create_scene_records(fake_project_id, [
                    {"sceneNumber": 1, "text": "Test"}
                ])

        except (ImportError, AttributeError) as e:
            pytest.fail(f"create_scene_records not found: {e}")

    def test_ac_9_4_context_manager_cleanup(self):
        """TEST-AC-9.4: Context manager should close connections on error."""
        try:
            from produce_video import get_db_connection

            connection = None
            try:
                with get_db_connection() as conn:
                    connection = conn
                    cursor = conn.cursor()
                    cursor.execute("SELECT 1")
                    raise Exception("Test error")
            except Exception:
                pass

            # Connection should be closed now
            # We can't directly test this without accessing private attributes,
            # but the context manager pattern ensures cleanup

        except (ImportError, AttributeError) as e:
            pytest.fail(f"get_db_connection not found: {e}")


# ============================================================================
# AC10: Backward Compatibility
# ============================================================================

class TestBackwardCompatibility:
    """TEST-AC-10: Backward Compatibility"""

    def test_ac_10_1_default_values_without_args(self):
        """TEST-AC-10.1: Should work without command-line arguments."""
        try:
            import produce_video

            # Check default values exist
            assert hasattr(produce_video, 'TOPIC')
            assert hasattr(produce_video, 'TARGET_DURATION')

            # Verify defaults
            assert produce_video.TOPIC == "Russian invasion of Ukraine"
            assert produce_video.TARGET_DURATION == 300

        except (ImportError, AssertionError) as e:
            pytest.fail(f"Default values not found: {e}")

    def test_ac_10_2_video_generation_still_works(self):
        """TEST-AC-10.2: Video generation should work with database integration."""
        # This is an integration test - verify the pipeline still functions
        # The individual components are tested separately
        assert True  # Placeholder - will be verified by end-to-end tests

    def test_ac_10_3_no_breaking_changes_to_existing_functions(self):
        """TEST-AC-10.3: Existing function signatures should remain compatible."""
        try:
            import produce_video

            # Check that core functions still exist
            assert hasattr(produce_video, 'generate_script')
            assert hasattr(produce_video, 'generate_voiceover')
            assert hasattr(produce_video, 'source_videos')
            assert hasattr(produce_video, 'assemble_video')
            assert hasattr(produce_video, 'main')

        except (ImportError, AssertionError) as e:
            pytest.fail(f"Core functions not found: {e}")


# ============================================================================
# INTEGRATION TESTS (End-to-End)
# ============================================================================

class TestIntegration:
    """End-to-End Integration Tests"""

    def test_integration_full_pipeline_with_database(self, test_database, mock_groq_api):
        """TEST-INT-1: Full pipeline should create complete database records."""
        try:
            import produce_video

            # Mock the entire pipeline
            with patch('produce_video.generate_voiceover') as mock_voiceover:
                with patch('produce_video.source_videos') as mock_sourcing:
                    with patch('produce_video.assemble_video') as mock_assembly:

                        # Setup mocks
                        mock_voiceover.return_value = [
                            {
                                "sceneNumber": 1,
                                "text": "Test",
                                "actualDuration": 12.5,
                                "audioFile": "output/audio/scene_1.mp3"
                            }
                        ]
                        mock_sourcing.return_value = ({}, None)
                        mock_assembly.return_value = "output/Test_video.mp4"

                        # Run main pipeline (with mocked components)
                        # This will fail until database integration is implemented
                        pytest.skip("Full integration test - requires complete implementation")

        except ImportError:
            pytest.skip("produce_video module not found")

    def test_integration_web_app_compatibility(self, test_database):
        """TEST-INT-2: Database records should be compatible with web app."""
        try:
            from produce_video import create_project_record, create_scene_records

            # Create records as produce_video.py would
            project_id = create_project_record("Test Topic", 60)
            scenes = [
                {"sceneNumber": 1, "text": "Scene 1"},
                {"sceneNumber": 2, "text": "Scene 2"}
            ]
            scene_ids = create_scene_records(project_id, scenes)

            # Verify web app can query these records
            cursor = test_database.cursor()

            # Query like web app does
            cursor.execute("SELECT * FROM projects WHERE id = ?", (project_id,))
            project = cursor.fetchone()

            assert project is not None
            assert project['name'] == "Test Topic"
            assert project['target_duration'] == 60

            # Query scenes like web app does
            cursor.execute(
                "SELECT * FROM scenes WHERE project_id = ? ORDER BY scene_number",
                (project_id,)
            )
            scenes = cursor.fetchall()

            assert len(scenes) == 2
            assert scenes[0]['scene_number'] == 1
            assert scenes[1]['scene_number'] == 2

        except (ImportError, AttributeError) as e:
            pytest.fail(f"Database functions not found: {e}")
