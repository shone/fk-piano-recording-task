import React, { useState, useEffect, useRef } from "react";
import "./App.css";
import Piano from "./Piano";
import "react-piano/dist/styles.css";
import Popup from "./Popup";
import "./popup.css";
import { useQuery, useMutation } from '@apollo/react-hooks';
import gql from 'graphql-tag';

function App() {
  
    const [lastRecordedTimestamp, setLastRecordedTimestamp] = useState(null);
    const [playbackTimer, setPlaybackTimer] = useState(null);

    const [recordingClockTimer, setRecordingClockTimer] = useState(null);
    const [currentRecordingTime, setCurrentRecordingTime] = useState(0);
    const setCurrentRecordingTimeRef = useRef();
    setCurrentRecordingTimeRef.current = setCurrentRecordingTime;

    const [mode, setMode] = useState('idle');
    const [activeNotes, setActiveNotes] = useState([]);
    const [isRenaming, setRenaming] = useState(false);
    const [newSongName, setNewSongName] = useState('untitled');
    const [recordedEvents, setRecordedEvents] = useState([]);

    const [errorPopupMessage, setErrorPopupMessage] = useState(null);

    const GET_SONGS = gql`{
        songs {
            _id
            title
            events {
                delayMs
                note
                state
            }
            durationSeconds
        }
    }`;

    const { loading, error, data } = useQuery(GET_SONGS);
    const [isGetSongsErrorDismissed, setIsGetSongsErrorDismissed] = useState(false);

    const [db_addSong, db_addSongStatus] = useMutation(
        gql`mutation AddSong($title: String!, $events: [SongEventInput]!, $durationSeconds: Int!) {
            addSong(title: $title, events: $events, durationSeconds: $durationSeconds) {
                _id
                title
                events {
                    delayMs
                    note
                    state
                }
                durationSeconds
            }
        }`,
        {
            update(cache, { data: { addSong } }) {
                const { songs } = cache.readQuery({ query: GET_SONGS });
                cache.writeQuery({
                    query: GET_SONGS,
                    data: { songs: songs.concat([addSong]) },
                });
            }
        }
    );

    const [db_deleteSong] = useMutation(
        gql`mutation DeleteSong($id: ID!) {
            deleteSong(id: $id)
        }`,
        {
            update(cache, { data: { deleteSong } }) {
                const { songs } = cache.readQuery({ query: GET_SONGS });
                cache.writeQuery({
                    query: GET_SONGS,
                    data: { songs: songs.filter(song => song._id !== deleteSong) },
                });
            }
        }
    );

    function toggleRecording() {
        if (mode !== 'recording') {
            setIdle();
            setRecordedEvents([]);
            clearTimeout(playbackTimer);
            setMode('recording');
            setActiveNotes([]);
            setCurrentRecordingTime(0);
            setRecordingClockTimer(setInterval(() => {
                setCurrentRecordingTimeRef.current(previousTime => previousTime + 1);
            }, 1000));
        } else {
            setIdle();
        }
    }

    function togglePlayback() {
        if (mode !== 'playing') {
            setIdle();
            play();
        } else {
            setIdle();
        }
    }

    function setIdle() {
        if (mode === 'recording') {
            clearTimeout(recordingClockTimer);
            setLastRecordedTimestamp(null);
            setRecordingClockTimer(null);
        } else if (mode === 'playing') {
            clearTimeout(playbackTimer);
        }
        setMode('idle');
        setActiveNotes([]);
    }

    function notifyNote(note, state) {
        if (mode === 'recording') {
            const now = performance.now();
            const delayMs = lastRecordedTimestamp ? now - lastRecordedTimestamp : 0;
            setRecordedEvents(recordedEvents.concat([{note, state, delayMs}]));
            setLastRecordedTimestamp(now);
        }
    }

    function play(events_ = recordedEvents) {
        setIdle();
        setLastRecordedTimestamp(null);
        setMode('playing');
        const playbackActiveNotes = new Set([]);
        const remainingEvents = events_.slice();
        const playRemainingEvents = () => {
            const event = remainingEvents.shift();
            if (!event) {
                setPlaybackTimer(null);
                setMode('idle');
                setActiveNotes([]);
                return;
            }
            setPlaybackTimer(setTimeout(() => {
                if (event.state) {
                    playbackActiveNotes.add(event.note);
                } else {
                    playbackActiveNotes.delete(event.note);
                }
                setActiveNotes([...playbackActiveNotes]);
                playRemainingEvents();
            }, event.delayMs));
        }
        playRemainingEvents();
    }

    function playSong(id) {
        const song = data.songs.find(song => song._id === id);
        if (song) {
            play(song.events);
        }
    }

    async function save() {
        if (recordedEvents.length === 0 || loading || error || db_addSongStatus.loading) {
            return;
        }
        try {
            await db_addSong({variables: {title: newSongName, events: recordedEvents, durationSeconds: currentRecordingTime}});
        } catch(e) {
            setErrorPopupMessage('Unable to add song');
        }
    }

    async function deleteSong(songId) {
        try {
            await db_deleteSong({variables: {id: songId}});
        } catch(e) {
            setErrorPopupMessage('Unable to delete song');
        }
    }

    function handleKeydown(event) {
        if (errorPopupMessage || (error && !isGetSongsErrorDismissed)) {
            return;
        }
        if (event.key === ' ' && !isRenaming) {
            event.preventDefault();
            togglePlayback();
            return false;
        } else if (event.key === 'r' && !isRenaming) {
            event.preventDefault();
            toggleRecording();
            return false;
        } else if (event.key === 's' && event.ctrlKey) {
            event.preventDefault();
            save();
            return false;
        }
    }
    useEffect(() => {
        window.addEventListener('keydown', handleKeydown);
        return () => {
            window.removeEventListener('keydown', handleKeydown);
        }
    }, [handleKeydown]);

    function onNewSongNameChange(event) {
        setNewSongName(event.target.value);
    }

    function secondsToDisplayString(seconds) {
        return String(Math.floor(seconds / 60)).padStart(2, '0') + ':' + String(seconds % 60).padStart(2, '0');
    }

    return (
        <div className="app">
            <ul className={'saved-song-list' + (loading ? ' loading' : '')}>
                {(loading || error) ? '' : 
                data.songs.map(song => {return (
                    <li key={song._id}>
                        <span className="title">{song.title}</span>
                        <span className="time">{secondsToDisplayString(song.durationSeconds)}</span>
                        <button className="play-button" onClick={() => playSong(song._id)}>▶ Play</button>
                        <button className="delete-button" onClick={() => deleteSong(song._id)}></button>
                    </li>
                )})}
            </ul>
            <div className="current-recording-container">
                <input value={newSongName} onChange={event => onNewSongNameChange(event)} onFocus={() => setRenaming(true)} onBlur={() => setRenaming(false)}/>
                <span className="time">{secondsToDisplayString(currentRecordingTime)}</span>
                <button onClick={toggleRecording} className={'record-button ' + (mode === 'recording' ? 'active' : '')}>⏺ Record</button>
                <button onClick={togglePlayback} className={mode === 'playing' ? 'active' : ''} disabled={recordedEvents.length === 0}>▶ Play</button>
                <button onClick={save} disabled={recordedEvents.length === 0 || loading || error || db_addSongStatus.loading} className={db_addSongStatus.loading ? 'waiting' : ''}>Save ⮥</button>
            </div>
            <Piano
                onPlayNoteInput={note => { notifyNote(note, true) }}
                onStopNoteInput={note => { notifyNote(note, false) }}
                activeNotes={activeNotes}
                disabled={isRenaming}
            />
            {(error && !isGetSongsErrorDismissed) ? <Popup message="Could not load songs" onOk={() => setIsGetSongsErrorDismissed(true)} detail="Is the server running?"/> : ''}
            {errorPopupMessage ? <Popup message={errorPopupMessage} onOk={() => setErrorPopupMessage(null)} detail="Is the server running?"/> : ''}
        </div>
    )
}

export default App;
