import React, { useState, useEffect, useRef } from "react";
import "./App.css";
import Piano from "./Piano";
import "react-piano/dist/styles.css";
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
    const [notes, setNotes] = useState([]);

    const [errorPopupMessage, setErrorPopupMessage] = useState(null);

    const GET_SONGS = gql`{ songs { _id title keyStrokes durationSeconds } }`;

    const { loading, error, data } = useQuery(GET_SONGS);

    const [addSong, addSongStatus] = useMutation(
        gql`mutation AddSong($title: String, $keyStrokes: [String], $durationSeconds: Int) {
            addSong(title: $title, keyStrokes: $keyStrokes, durationSeconds: $durationSeconds) { _id title keyStrokes durationSeconds }
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

    const [deleteSong] = useMutation(
        gql`mutation DeleteSong($id: ID) {
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
            setNotes([]);
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
            const delay = lastRecordedTimestamp ? now - lastRecordedTimestamp : 0;
            setNotes(notes.concat([{note, state, delay}]));
            setLastRecordedTimestamp(now);
        }
    }

    function play(notes_ = notes) {
        setIdle();
        setLastRecordedTimestamp(null);
        setMode('playing');
        const remainingNotes = notes_.slice();
        const playRemainingNotes = () => {
            const note = remainingNotes.shift();
            if (!note) {
                setPlaybackTimer(null);
                setMode('idle');
                setActiveNotes([]);
                return;
            }
            setPlaybackTimer(setTimeout(() => {
                const newActiveNotes = new Set(activeNotes);
                if (note.state) {
                    newActiveNotes.add(note.note);
                } else {
                    newActiveNotes.delete(note.note);
                }
                setActiveNotes([...newActiveNotes]);
                playRemainingNotes();
            }, note.delay));
        }
        playRemainingNotes();
    }

    function playSong(id) {
        const song = data.songs.find(song => song._id === id);
        if (song) {
            play(song.keyStrokes.map(entry => {
                const [note, state, delay] = entry.split(' ');
                return {note: parseInt(note), state: state === 'on', delay};
            }));
        }
    }

    async function save() {
        if (notes.length === 0 || addSongStatus.loading) {
            return;
        }
        const keyStrokes = notes.map(note => `${note.note} ${(note.state ? 'on' : 'off')} ${note.delay}`);
        try {
            await addSong({variables: {title: newSongName, keyStrokes: keyStrokes, durationSeconds: currentRecordingTime}});
        } catch(e) {
            setErrorPopupMessage('Unable to add song');
        }
    }

    function handleKeydown(event) {
        if (errorPopupMessage) {
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
                        <button className="delete-button" onClick={() => deleteSong({variables: {id: song._id}})}></button>
                    </li>
                )})}
            </ul>
            <div className="current-recording-container">
                <input value={newSongName} onChange={event => onNewSongNameChange(event)} onFocus={() => setRenaming(true)} onBlur={() => setRenaming(false)}/>
                <span className="time">{secondsToDisplayString(currentRecordingTime)}</span>
                <button onClick={toggleRecording} className={'record-button ' + (mode === 'recording' ? 'active' : '')}>⏺ Record</button>
                <button onClick={togglePlayback} className={mode === 'playing' ? 'active' : ''} disabled={notes.length === 0}>▶ Play</button>
                <button onClick={save} disabled={notes.length === 0 || addSongStatus.loading} className={addSongStatus.loading ? 'waiting' : ''}>Save ⮥</button>
            </div>
            <Piano
                onPlayNoteInput={note => { notifyNote(note, true) }}
                onStopNoteInput={note => { notifyNote(note, false) }}
                activeNotes={activeNotes}
                disabled={isRenaming}
            />
            {errorPopupMessage ? 
                <div className="popup-container">
                    <div className="error-popup">
                        <div className="message">{errorPopupMessage}</div>
                        <button onClick={() => setErrorPopupMessage(null)}>Ok</button>
                    </div>
                </div>
            : ''}
        </div>
    )
}

export default App;
