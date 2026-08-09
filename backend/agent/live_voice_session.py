from __future__ import annotations

import asyncio
import base64
import logging
import time
import uuid

from fastapi import WebSocket
from google import genai
from google.genai import types

from agent.instructions import build_instructions
from agent.tools.search_about_nikhil import search_about_nikhil
from agent.tools.get_project_details import get_project_details
from agent.tools.get_experience_details import get_experience_details
from agent.tools.get_timeline_event import get_timeline_event
from agent.tools.get_links import get_links
from agent.tools.get_preferences import get_preferences
from config import settings
from evaluation import gap_detector, retrieval_context, trace_collector, TurnContext
from storage.conversation_store import conversation_store

logger = logging.getLogger(__name__)

TOOL_MAP = {
    "search_about_nikhil": search_about_nikhil,
    "get_project_details": get_project_details,
    "get_experience_details": get_experience_details,
    "get_timeline_event": get_timeline_event,
    "get_links": get_links,
    "get_preferences": get_preferences,
}


def _build_tool_declarations() -> list[types.Tool]:
    return [types.Tool(function_declarations=[
        types.FunctionDeclaration(
            name="search_about_nikhil",
            description="Search Nikhil's knowledge base for information about his background, projects, experience, skills, or story.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={"query": types.Schema(type=types.Type.STRING, description="What to search for")},
                required=["query"],
            ),
        ),
        types.FunctionDeclaration(
            name="get_project_details",
            description="Get detailed information about a specific project by name.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={"project_name": types.Schema(type=types.Type.STRING, description="Name of the project")},
                required=["project_name"],
            ),
        ),
        types.FunctionDeclaration(
            name="get_experience_details",
            description="Get details about a specific work experience or role.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={"company_or_role": types.Schema(type=types.Type.STRING, description="Company name or role")},
                required=["company_or_role"],
            ),
        ),
        types.FunctionDeclaration(
            name="get_timeline_event",
            description="Get journey and career timeline events.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={"query": types.Schema(type=types.Type.STRING, description="Query for timeline")},
                required=["query"],
            ),
        ),
        types.FunctionDeclaration(
            name="get_links",
            description="Get Nikhil's links — GitHub, LinkedIn, portfolio, resume.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={"query": types.Schema(type=types.Type.STRING, description="Type of link needed")},
                required=["query"],
            ),
        ),
        types.FunctionDeclaration(
            name="get_preferences",
            description="Get Nikhil's personal preferences (movies/anime/music/food/etc.) from his knowledge base.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={"query": types.Schema(type=types.Type.STRING, description="Preference category/topic to retrieve")},
                required=["query"],
            ),
        ),
    ])]


async def handle_voice_session(ws: WebSocket):
    """Bridge client WebSocket ↔ Gemini Live API for real-time voice with non-blocking turn tracing."""
    session_id = str(uuid.uuid4())

    user_agent = ""
    ip_address = ""
    for name, value in ws.headers.items():
        if name.lower() == "user-agent":
            user_agent = value
    if ws.client:
        ip_address = ws.client.host

    try:
        await conversation_store.create_session(session_id, user_agent, ip_address)
    except Exception as e:
        logger.warning(f"Failed to persist session: {e}")

    client = genai.Client(
        vertexai=True,
        project=settings.google_cloud_project,
        location=settings.google_cloud_location,
    )

    config = types.LiveConnectConfig(
        response_modalities=[types.Modality.AUDIO],
        speech_config=types.SpeechConfig(
            voice_config=types.VoiceConfig(prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name="Puck"))
        ),
        output_audio_transcription=types.AudioTranscriptionConfig(),
        input_audio_transcription=types.AudioTranscriptionConfig(),
        system_instruction=types.Content(
            parts=[types.Part(text=build_instructions())]
        ),
        tools=_build_tool_declarations(),
    )

    await ws.send_json({"type": "session.ready", "session_id": session_id})
    logger.info(f"Voice session started: {session_id}")

    accumulated_text = ""
    last_user_text = ""
    audio_chunks_sent = 0
    audio_chunks_received = 0
    turn_count = 1

    # Turn tracking context for observability
    turn_ctx = TurnContext(
        session_id=session_id,
        turn_id=turn_count,
        model=settings.gemini_voice_model,
    )

    try:
        logger.info(f"[{session_id[:8]}] Connecting to Gemini Live: {settings.gemini_voice_model}")
        async with client.aio.live.connect(
            model=settings.gemini_voice_model, config=config
        ) as gemini_session:
            logger.info(f"[{session_id[:8]}] Gemini Live connected, starting reader/writer")

            async def reader():
                """Client WebSocket → Gemini."""
                nonlocal last_user_text, audio_chunks_sent, turn_ctx
                try:
                    while True:
                        msg = await ws.receive_json()
                        msg_type = msg.get("type")

                        if msg_type == "audio.chunk":
                            raw = base64.b64decode(msg["data"])
                            await gemini_session.send(
                                input=types.LiveClientRealtimeInput(
                                    media_chunks=[
                                        types.Blob(
                                            data=raw,
                                            mime_type="audio/pcm;rate=16000",
                                        )
                                    ]
                                )
                            )
                            audio_chunks_sent += 1
                            if audio_chunks_sent == 1:
                                logger.info(f"[{session_id[:8]}] First audio chunk received ({len(raw)} bytes)")
                            elif audio_chunks_sent % 100 == 0:
                                logger.info(f"[{session_id[:8]}] Audio chunks sent: {audio_chunks_sent}")

                        elif msg_type == "transcript.user":
                            text = msg.get("content", "")
                            last_user_text = text
                            turn_ctx.end_user_turn(text)
                            logger.info(f"[{session_id[:8]}] User typed: {text[:80]}")
                            try:
                                await conversation_store.add_transcript(session_id, "user", text)
                                await conversation_store.increment_turn_count(session_id)
                            except Exception as e:
                                logger.warning(f"Failed to persist user text: {e}")
                            await gemini_session.send(
                                input=types.LiveClientContent(
                                    turns=[types.Content(
                                        role="user",
                                        parts=[types.Part(text=text)],
                                    )],
                                    turn_complete=True,
                                )
                            )

                        elif msg_type == "session.end":
                            logger.info(f"[{session_id[:8]}] Client requested session end")
                            break

                except Exception as e:
                    logger.info(f"[{session_id[:8]}] Reader ended ({audio_chunks_sent} chunks sent): {e}")

            async def writer():
                """Gemini → client WebSocket."""
                nonlocal accumulated_text, last_user_text, audio_chunks_received, turn_count, turn_ctx
                response_count = 0
                # When True, audio forwarding is suppressed until the next turn starts.
                # Set on barge-in (sc.interrupted); cleared at the top of each new turn.
                forwarding_suppressed = False
                try:
                    while True:
                        # New turn starts — lift the suppression gate so the new answer plays.
                        forwarding_suppressed = False
                        logger.info(f"[{session_id[:8]}] Starting receive() for turn {turn_count}")

                        async for response in gemini_session.receive():
                            response_count += 1

                            if response.setup_complete:
                                logger.info(f"[{session_id[:8]}] Gemini setup complete")
                                continue

                            if response.go_away:
                                logger.warning(f"[{session_id[:8]}] Gemini go_away — session ending")
                                return

                            if response.tool_call_cancellation:
                                logger.info(f"[{session_id[:8]}] Tool call cancelled")

                            if response.tool_call:
                                turn_ctx.start_model_turn()
                                for fc in response.tool_call.function_calls:
                                    logger.info(f"[{session_id[:8]}] Tool call: {fc.name}({dict(fc.args)})")
                                    fn = TOOL_MAP.get(fc.name)
                                    if fn:
                                        retrieval_context.reset()
                                        t_tool_start = time.perf_counter()
                                        try:
                                            result = fn(**dict(fc.args))
                                            duration_ms = max(int((time.perf_counter() - t_tool_start) * 1000), 0)
                                            tool_status = "error" if isinstance(result, dict) and "error" in result else "success"
                                            tool_error = result.get("error") if tool_status == "error" else None
                                        except Exception as e:
                                            duration_ms = max(int((time.perf_counter() - t_tool_start) * 1000), 0)
                                            result = {"error": str(e)}
                                            tool_status = "error"
                                            tool_error = str(e)
                                            logger.warning(f"[{session_id[:8]}] Tool error: {e}")

                                        # Record tool execution in trace
                                        turn_ctx.record_tool_call(
                                            tool_name=fc.name,
                                            args=dict(fc.args),
                                            result_summary=result,
                                            duration_ms=duration_ms,
                                            status=tool_status,
                                            error=tool_error,
                                        )

                                        # Record any retrieval events captured by the tool
                                        for stat in retrieval_context.get_stats():
                                            turn_ctx.record_retrieval(
                                                query=stat.query,
                                                hit_count=stat.hit_count,
                                                top_score=stat.top_score,
                                                duration_ms=duration_ms,
                                            )

                                        await gemini_session.send(
                                            input=types.LiveClientToolResponse(
                                                function_responses=[
                                                    types.FunctionResponse(
                                                        name=fc.name,
                                                        id=fc.id,
                                                        response=result,
                                                    )
                                                ]
                                            )
                                        )
                                    else:
                                        logger.warning(f"[{session_id[:8]}] Unknown tool: {fc.name}")
                                        turn_ctx.record_tool_call(
                                            tool_name=fc.name,
                                            args=dict(fc.args),
                                            result_summary={"error": "unknown_tool"},
                                            duration_ms=0,
                                            status="error",
                                            error="unknown_tool",
                                        )

                            if response.server_content:
                                sc = response.server_content

                                # Check interrupted FIRST — before forwarding any audio from
                                # this response. Audio parts on an interrupted response are the
                                # tail of the old answer; discard them and signal the client.
                                if sc.interrupted:
                                    logger.info(f"[{session_id[:8]}] Gemini interrupted (barge-in)")
                                    forwarding_suppressed = True

                                    # Emit interrupted trace non-blocking
                                    interrupted_trace = turn_ctx.build_trace(
                                        assistant_output=accumulated_text,
                                        status="interrupted",
                                        interrupted=True,
                                    )
                                    trace_collector.enqueue_trace(interrupted_trace)

                                    accumulated_text = ""
                                    audio_chunks_received = 0
                                    await ws.send_json({"type": "interrupted"})

                                    # Advance turn context for next turn
                                    turn_count += 1
                                    turn_ctx = TurnContext(
                                        session_id=session_id,
                                        turn_id=turn_count,
                                        model=settings.gemini_voice_model,
                                    )
                                    # Skip remaining processing for this response object.
                                    continue

                                # Only forward audio when not suppressed (i.e. no active barge-in).
                                if not forwarding_suppressed and sc.model_turn:
                                    turn_ctx.start_model_turn()
                                    for part in sc.model_turn.parts:
                                        if part.inline_data and part.inline_data.data:
                                            turn_ctx.record_first_audio()
                                            audio_b64 = base64.b64encode(
                                                part.inline_data.data
                                            ).decode()
                                            await ws.send_json({
                                                "type": "audio.chunk",
                                                "data": audio_b64,
                                                "sample_rate": 24000,
                                            })
                                            audio_chunks_received += 1

                                if sc.output_transcription and sc.output_transcription.text:
                                    accumulated_text += sc.output_transcription.text

                                if sc.input_transcription and sc.input_transcription.text:
                                    user_text = sc.input_transcription.text
                                    last_user_text = user_text
                                    turn_ctx.end_user_turn(user_text)
                                    logger.info(f"[{session_id[:8]}] User said: {user_text[:80]}")
                                    await ws.send_json({
                                        "type": "transcript.final",
                                        "speaker": "user",
                                        "content": user_text,
                                    })
                                    try:
                                        await conversation_store.add_transcript(
                                            session_id, "user", user_text
                                        )
                                        await conversation_store.increment_turn_count(session_id)
                                    except Exception as e:
                                        logger.warning(f"Failed to persist user transcript: {e}")

                                if sc.turn_complete:
                                    logger.info(
                                        f"[{session_id[:8]}] AI turn {turn_count} complete "
                                        f"({audio_chunks_received} audio chunks, "
                                        f"text={accumulated_text[:80] if accumulated_text else '(none)'})"
                                    )
                                    if accumulated_text:
                                        await ws.send_json({
                                            "type": "transcript.final",
                                            "speaker": "ai",
                                            "content": accumulated_text,
                                        })
                                        gap_result = None
                                        try:
                                            await conversation_store.add_transcript(
                                                session_id, "ai", accumulated_text
                                            )
                                            if last_user_text:
                                                gap_result = gap_detector.evaluate(
                                                    last_user_text, accumulated_text
                                                )
                                                await conversation_store.add_question_event(
                                                    session_id=session_id,
                                                    user_question=last_user_text,
                                                    ai_answer=accumulated_text,
                                                    retrieval_hits=gap_result.retrieval_hits,
                                                    retrieval_score=gap_result.retrieval_score,
                                                    confidence_score=gap_result.confidence_score,
                                                    gap_flag=gap_result.gap_flag,
                                                    gap_reason=gap_result.gap_reason,
                                                    severity=gap_result.severity,
                                                )
                                        except Exception as e:
                                            logger.warning(f"Failed to persist AI response: {e}")

                                        # Build complete trace and non-blocking enqueue
                                        trace = turn_ctx.build_trace(
                                            assistant_output=accumulated_text,
                                            gap_result=gap_result,
                                            status="success",
                                        )
                                        trace_collector.enqueue_trace(trace)

                                        accumulated_text = ""
                                        last_user_text = ""

                                    audio_chunks_received = 0

                                    # Advance turn context for the next turn
                                    turn_count += 1
                                    turn_ctx = TurnContext(
                                        session_id=session_id,
                                        turn_id=turn_count,
                                        model=settings.gemini_voice_model,
                                    )

                        logger.info(f"[{session_id[:8]}] receive() iterator ended for turn {turn_count}, restarting...")

                except Exception as e:
                    logger.info(f"[{session_id[:8]}] Writer ended: {e}")

            await asyncio.gather(reader(), writer())

    except Exception as e:
        logger.error(f"Voice session error: {e}")
        try:
            await ws.send_json({"type": "error", "content": str(e)})
        except Exception:
            pass
    finally:
        try:
            await conversation_store.end_session(session_id)
        except Exception:
            pass
        logger.info(f"Voice session ended: {session_id}")
