import React from "react";
import { Piano as ReactPiano, KeyboardShortcuts, MidiNumbers } from "react-piano";
import SoundfontProvider from "./SoundfontProvider";
import "react-piano/dist/styles.css";

const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const soundfontHostname = "https://d1pzp51pvbm36p.cloudfront.net";

const noteRange = {
    first: MidiNumbers.fromNote("c3"),
    last: MidiNumbers.fromNote("f4"),
};
const keyboardShortcuts = KeyboardShortcuts.create({
    firstNote: noteRange.first,
    lastNote: noteRange.last,
    keyboardConfig: KeyboardShortcuts.HOME_ROW,
});

function Piano(props) {
    return (
        <div className="piano">
            <SoundfontProvider
                instrumentName="acoustic_grand_piano"
                audioContext={audioContext}
                hostname={soundfontHostname}
                render={({ isLoading, playNote, stopNote }) => (
                    <ReactPiano
                        disabled={isLoading || props.disabled}
                        noteRange={noteRange}
                        playNote={playNote}
                        stopNote={stopNote}
                        width={1000}
                        keyboardShortcuts={keyboardShortcuts}
                        onPlayNoteInput={props.onPlayNoteInput}
                        onStopNoteInput={props.onStopNoteInput}
                        activeNotes={props.activeNotes}
                    />
                )}
            />
        </div>
    );
}

export default Piano;
