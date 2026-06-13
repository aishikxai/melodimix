import os
from datetime import datetime
from typing import Optional, List
import yt_dlp
from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from sqlmodel import SQLModel, Field, create_engine, Session, select

# FastAPI initialization
app = FastAPI(title="Melodix Backend")

# CORS middleware config
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database and downloads directory configuration
DATABASE_FILE = os.environ.get("DATABASE_PATH", "database.db")
DATABASE_URL = f"sqlite:///{DATABASE_FILE}"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

DOWNLOADS_DIR = os.environ.get("DOWNLOADS_DIR", "downloads")

# Database models
class Track(SQLModel, table=True):
    youtube_id: str = Field(primary_key=True)
    title: str
    artist: str
    album: Optional[str] = None
    duration: int  # in seconds
    thumbnail: Optional[str] = None
    file_path: Optional[str] = None
    liked: bool = Field(default=False)

class Playlist(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class PlaylistTrack(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    playlist_id: int
    track_id: str
    position: int

def init_db():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session

@app.on_event("startup")
def on_startup():
    init_db()
    os.makedirs(DOWNLOADS_DIR, exist_ok=True)

# Helper function to background download track
def download_track_task(youtube_id: str, title: str, artist: str, duration: int, thumbnail: str):
    try:
        os.makedirs(DOWNLOADS_DIR, exist_ok=True)
        out_tmpl = os.path.join(DOWNLOADS_DIR, f"{youtube_id}.%(ext)s")
        ydl_opts = {
            'format': 'bestaudio/best',
            'outtmpl': out_tmpl,
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '192',
            }],
            'quiet': True,
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([youtube_id])
        
        # Verify file download and update DB record
        expected_path = os.path.join(DOWNLOADS_DIR, f"{youtube_id}.mp3")
        if os.path.exists(expected_path):
            with Session(engine) as session:
                track = session.get(Track, youtube_id)
                if not track:
                    track = Track(
                        youtube_id=youtube_id,
                        title=title,
                        artist=artist,
                        duration=duration,
                        thumbnail=thumbnail,
                        liked=False
                    )
                track.file_path = expected_path
                session.add(track)
                session.commit()
                print(f"Successfully downloaded and saved: {youtube_id}")
    except Exception as e:
        print(f"Error in background download for {youtube_id}: {e}")

# API Routes
@app.get("/api/search")
def search_youtube(q: str):
    if not q:
        raise HTTPException(status_code=400, detail="Query parameter 'q' is required")
    try:
        ydl_opts = {
            'extract_flat': True,
            'skip_download': True,
            'quiet': True,
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            result = ydl.extract_info(f"ytsearch10:{q}", download=False)
            entries = result.get('entries', [])
            
            tracks = []
            for entry in entries:
                if not entry:
                    continue
                youtube_id = entry.get('id')
                if not youtube_id:
                    continue
                duration = entry.get('duration')
                tracks.append({
                    "id": youtube_id,
                    "title": entry.get('title') or entry.get('entry_title') or "Unknown Title",
                    "artist": entry.get('uploader') or entry.get('artist') or "Unknown Artist",
                    "duration": int(duration) if duration is not None else 0,
                    "thumbnail": f"https://img.youtube.com/vi/{youtube_id}/mqdefault.jpg"
                })
            return tracks
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

@app.get("/api/stream/{youtube_id}")
def stream_track(youtube_id: str, session: Session = Depends(get_session)):
    track = session.get(Track, youtube_id)
    if track and track.file_path and os.path.exists(track.file_path):
        return FileResponse(track.file_path, media_type="audio/mpeg")
    
    try:
        ydl_opts = {
            'format': 'bestaudio/best',
            'quiet': True,
            'skip_download': True,
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(youtube_id, download=False)
            stream_url = info.get('url')
            if not stream_url:
                raise HTTPException(status_code=404, detail="Direct stream URL not found")
            return {"stream_url": stream_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Streaming failed: {str(e)}")

@app.post("/api/download/{youtube_id}")
def download_track(youtube_id: str, background_tasks: BackgroundTasks, session: Session = Depends(get_session)):
    track = session.get(Track, youtube_id)
    
    if track and track.file_path and os.path.exists(track.file_path):
        return track

    title = "Unknown Title"
    artist = "Unknown Artist"
    duration = 0
    thumbnail = f"https://img.youtube.com/vi/{youtube_id}/mqdefault.jpg"
    
    if track:
        title = track.title
        artist = track.artist
        duration = track.duration
        thumbnail = track.thumbnail or thumbnail
    else:
        try:
            ydl_opts = {'quiet': True, 'skip_download': True}
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(youtube_id, download=False)
                title = info.get('title') or "Unknown Title"
                artist = info.get('uploader') or info.get('artist') or "Unknown Artist"
                duration = int(info.get('duration') or 0)
                thumbnail = info.get('thumbnail') or thumbnail
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to fetch track metadata: {str(e)}")
            
        track = Track(
            youtube_id=youtube_id,
            title=title,
            artist=artist,
            duration=duration,
            thumbnail=thumbnail,
            liked=False
        )
        session.add(track)
        session.commit()
        session.refresh(track)
        
    background_tasks.add_task(download_track_task, youtube_id, title, artist, duration, thumbnail)
    return track

@app.get("/api/download/{youtube_id}/file")
def download_file(youtube_id: str, session: Session = Depends(get_session)):
    track = session.get(Track, youtube_id)
    if not track or not track.file_path or not os.path.exists(track.file_path):
        raise HTTPException(status_code=404, detail="Local downloaded file not found")
    return FileResponse(
        track.file_path,
        media_type="audio/mpeg",
        filename=f"{track.title}.mp3"
    )

@app.get("/api/library", response_model=List[Track])
def get_library(session: Session = Depends(get_session)):
    statement = select(Track)
    return session.exec(statement).all()

@app.post("/api/library", response_model=Track)
def add_to_library(track: Track, session: Session = Depends(get_session)):
    existing = session.get(Track, track.youtube_id)
    if existing:
        for key, value in track.dict(exclude_unset=True).items():
            setattr(existing, key, value)
        session.add(existing)
        session.commit()
        session.refresh(existing)
        return existing
    else:
        session.add(track)
        session.commit()
        session.refresh(track)
        return track

@app.patch("/api/library/{youtube_id}/like", response_model=Track)
def toggle_like(youtube_id: str, session: Session = Depends(get_session)):
    track = session.get(Track, youtube_id)
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")
    track.liked = not track.liked
    session.add(track)
    session.commit()
    session.refresh(track)
    return track

@app.delete("/api/library/{youtube_id}")
def remove_from_library(youtube_id: str, session: Session = Depends(get_session)):
    track = session.get(Track, youtube_id)
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")
    
    # Delete the actual file if it exists
    if track.file_path and os.path.exists(track.file_path):
        try:
            os.remove(track.file_path)
        except Exception as e:
            print(f"Failed to delete file from disk: {e}")
            
    session.delete(track)
    
    # Clean up playlist associations
    statement = select(PlaylistTrack).where(PlaylistTrack.track_id == youtube_id)
    pts = session.exec(statement).all()
    for pt in pts:
        session.delete(pt)
        
    session.commit()
    return {"success": True}

@app.get("/api/playlists", response_model=List[Playlist])
def get_playlists(session: Session = Depends(get_session)):
    statement = select(Playlist)
    return session.exec(statement).all()

@app.post("/api/playlists", response_model=Playlist)
def create_playlist(playlist: Playlist, session: Session = Depends(get_session)):
    playlist.created_at = datetime.utcnow()
    session.add(playlist)
    session.commit()
    session.refresh(playlist)
    return playlist

@app.delete("/api/playlists/{playlist_id}")
def delete_playlist(playlist_id: int, session: Session = Depends(get_session)):
    playlist = session.get(Playlist, playlist_id)
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
    
    session.delete(playlist)
    
    # Remove all track relations associated with this playlist
    statement = select(PlaylistTrack).where(PlaylistTrack.playlist_id == playlist_id)
    pts = session.exec(statement).all()
    for pt in pts:
        session.delete(pt)
        
    session.commit()
    return {"success": True}

@app.get("/api/playlists/{playlist_id}/tracks", response_model=List[Track])
def get_playlist_tracks(playlist_id: int, session: Session = Depends(get_session)):
    statement = select(PlaylistTrack).where(PlaylistTrack.playlist_id == playlist_id).order_by(PlaylistTrack.position)
    pts = session.exec(statement).all()
    
    tracks = []
    for pt in pts:
        track = session.get(Track, pt.track_id)
        if track:
            tracks.append(track)
    return tracks

@app.post("/api/playlists/{playlist_id}/tracks")
def add_track_to_playlist(playlist_id: int, payload: dict, session: Session = Depends(get_session)):
    track_id = payload.get("track_id")
    if not track_id:
        raise HTTPException(status_code=400, detail="track_id is required")
        
    # Ensure track is in our database library
    track = session.get(Track, track_id)
    if not track:
        try:
            ydl_opts = {'quiet': True, 'skip_download': True}
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(track_id, download=False)
                track = Track(
                    youtube_id=track_id,
                    title=info.get('title') or "Unknown Title",
                    artist=info.get('uploader') or info.get('artist') or "Unknown Artist",
                    duration=int(info.get('duration') or 0),
                    thumbnail=info.get('thumbnail') or f"https://img.youtube.com/vi/{track_id}/mqdefault.jpg",
                    liked=False
                )
                session.add(track)
                session.commit()
                session.refresh(track)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to fetch metadata for playlist: {str(e)}")
            
    # Calculate position
    statement = select(PlaylistTrack).where(PlaylistTrack.playlist_id == playlist_id).order_by(PlaylistTrack.position.desc())
    results = session.exec(statement).all()
    position = (results[0].position + 1) if results else 0
    
    pt = PlaylistTrack(playlist_id=playlist_id, track_id=track_id, position=position)
    session.add(pt)
    session.commit()
    return {"success": True}

@app.delete("/api/playlists/{playlist_id}/tracks/{track_id}")
def remove_track_from_playlist(playlist_id: int, track_id: str, session: Session = Depends(get_session)):
    statement = select(PlaylistTrack).where(PlaylistTrack.playlist_id == playlist_id, PlaylistTrack.track_id == track_id)
    pts = session.exec(statement).all()
    if not pts:
        raise HTTPException(status_code=404, detail="Track not found in playlist")
    for pt in pts:
        session.delete(pt)
    session.commit()
    return {"success": True}

@app.get("/api/downloaded")
def get_downloaded_ids(session: Session = Depends(get_session)):
    statement = select(Track).where(Track.file_path != None)
    tracks = session.exec(statement).all()
    
    downloaded_ids = []
    for t in tracks:
        if t.file_path and os.path.exists(t.file_path):
            downloaded_ids.append(t.youtube_id)
    return downloaded_ids
